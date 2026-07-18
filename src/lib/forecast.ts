import { skiThresholds, type Zone } from '../config'
import type { FetchTable } from './fetchTable'
import { lookupFetch } from './fetchTable'
import {
  fetchAllDeterministic,
  fetchAllEnsembles,
  type EnsembleForecast,
  type ModelForecast,
} from './openMeteo'
import { skiScore } from './rating'
import { computeConfidence, type UncertaintyResult } from './uncertainty'
import { computeWavesFromKnots, type WaveState } from './waveModel'

export type MemberHourSample = {
  source: string
  windKn: number
  windDir: number
  gustKn: number
  fetchM: number
  waves: WaveState
  score: number
}

export type HourlyRating = {
  time: string
  localHour: number
  date: string
  windKn: number
  windDir: number
  gustKn: number
  fetchM: number
  hsM: number
  tpS: number
  whitecaps: boolean
  meanScore: number
  pGlassy: number
  confidence: number
  scoreStd: number
  members: MemberHourSample[]
  uncertainty: UncertaintyResult
}

export type PeriodRating = {
  label: 'morning' | 'afternoon'
  worstScore: number
  meanScore: number
  confidence: number
  pGlassy: number
  hours: HourlyRating[]
}

export type BestWindow = {
  start: string
  end: string
  hours: number
  meanScore: number
  minScore: number
  confidence: number
} | null

export type DayForecast = {
  date: string
  hours: HourlyRating[]
  morning: PeriodRating
  afternoon: PeriodRating
  bestWindow: BestWindow
  dayScore: number
  dayConfidence: number
  dayPGlassy: number
}

export type ForecastBundle = {
  zone: Zone
  generatedAt: string
  modelsUsed: string[]
  ensembleModelsUsed: string[]
  hours: HourlyRating[]
  days: DayForecast[]
  pastHours: HourlyRating[]
}

type WindAtIndex = {
  windKn: number
  windDir: number
  gustKn: number
  source: string
}

function localParts(isoLocal: string): { date: string; hour: number } {
  // Open-Meteo returns "YYYY-MM-DDTHH:MM" in requested timezone (no Z)
  const [date, time] = isoLocal.split('T')
  const hour = Number((time ?? '0').slice(0, 2))
  return { date: date ?? isoLocal.slice(0, 10), hour }
}

function leadHoursFromNow(isoLocal: string, now = new Date()): number {
  // Treat as Vancouver wall time by appending offset approximation via Date parse of local-like string
  const parsed = Date.parse(isoLocal)
  if (Number.isNaN(parsed)) return 0
  return (parsed - now.getTime()) / 3_600_000
}

function collectWindsAtTime(
  models: ModelForecast[],
  ensembles: EnsembleForecast[],
  time: string,
): WindAtIndex[] {
  const out: WindAtIndex[] = []

  for (const m of models) {
    const idx = m.hourly.time.indexOf(time)
    if (idx < 0) continue
    const windKn = m.hourly.wind_speed_10m[idx]
    const windDir = m.hourly.wind_direction_10m[idx]
    if (windKn == null || windDir == null) continue
    const gustKn = m.hourly.wind_gusts_10m[idx] ?? windKn
    out.push({
      windKn,
      windDir,
      gustKn,
      source: m.model,
    })
  }

  for (const ens of ensembles) {
    const idx = ens.time.indexOf(time)
    if (idx < 0) continue
    for (const mem of ens.members) {
      const windKn = mem.wind_speed_10m[idx]
      const windDir = mem.wind_direction_10m[idx]
      if (windKn == null || windDir == null) continue
      const gustKn = mem.wind_gusts_10m[idx] ?? windKn
      out.push({
        windKn,
        windDir,
        gustKn,
        source: `${ens.model}:m${mem.member}`,
      })
    }
  }

  return out
}

function rateHour(
  time: string,
  winds: WindAtIndex[],
  zoneId: string,
  fetchTable: FetchTable,
  now = new Date(),
): HourlyRating | null {
  if (winds.length === 0) return null

  const members: MemberHourSample[] = winds.map((w) => {
    const fetchM = lookupFetch(fetchTable, zoneId, w.windDir)
    const waves = computeWavesFromKnots(w.windKn, fetchM)
    const { score } = skiScore(w.windKn, w.gustKn, waves)
    return {
      source: w.source,
      windKn: w.windKn,
      windDir: w.windDir,
      gustKn: w.gustKn,
      fetchM,
      waves,
      score,
    }
  })

  const scores = members.map((m) => m.score)
  const uncertainty = computeConfidence(scores, leadHoursFromNow(time, now))

  // Ensemble-mean physical fields (for display)
  const windKn = members.reduce((s, m) => s + m.windKn, 0) / members.length
  const gustKn = members.reduce((s, m) => s + m.gustKn, 0) / members.length
  // Circular mean for direction
  let sx = 0
  let sy = 0
  for (const m of members) {
    const r = (m.windDir * Math.PI) / 180
    sx += Math.sin(r)
    sy += Math.cos(r)
  }
  const windDir =
    ((Math.atan2(sx / members.length, sy / members.length) * 180) / Math.PI + 360) %
    360
  const fetchM = lookupFetch(fetchTable, zoneId, windDir)
  const meanWaves = computeWavesFromKnots(windKn, fetchM)
  const { date, hour } = localParts(time)

  return {
    time,
    localHour: hour,
    date,
    windKn,
    windDir,
    gustKn,
    fetchM,
    hsM: meanWaves.hsM,
    tpS: meanWaves.tpS,
    whitecaps: meanWaves.whitecaps,
    meanScore: uncertainty.meanScore,
    pGlassy: uncertainty.pGlassy,
    confidence: uncertainty.confidence,
    scoreStd: uncertainty.scoreStd,
    members,
    uncertainty,
  }
}

function periodFromHours(
  hours: HourlyRating[],
  label: 'morning' | 'afternoon',
  range: { start: number; end: number },
): PeriodRating {
  const slice = hours.filter(
    (h) => h.localHour >= range.start && h.localHour <= range.end,
  )
  if (slice.length === 0) {
    return {
      label,
      worstScore: NaN,
      meanScore: NaN,
      confidence: 0,
      pGlassy: 0,
      hours: [],
    }
  }
  // Worst sustained hour — one bad hour ruins a ski set
  const worst = slice.reduce((a, b) => (a.meanScore <= b.meanScore ? a : b))
  const meanScore = slice.reduce((s, h) => s + h.meanScore, 0) / slice.length
  const confidence =
    slice.reduce((s, h) => s + h.confidence, 0) / slice.length
  const pGlassy = slice.reduce((s, h) => s + h.pGlassy, 0) / slice.length
  return {
    label,
    worstScore: worst.meanScore,
    meanScore,
    confidence,
    pGlassy,
    hours: slice,
  }
}

export function findBestWindow(hours: HourlyRating[]): BestWindow {
  const { windowScoreMin, windowConfidenceMin } = skiThresholds
  let best: BestWindow = null
  let runStart = -1

  const flush = (endExclusive: number) => {
    if (runStart < 0) return
    const run = hours.slice(runStart, endExclusive)
    if (run.length === 0) return
    const meanScore = run.reduce((s, h) => s + h.meanScore, 0) / run.length
    const minScore = Math.min(...run.map((h) => h.meanScore))
    const confidence = run.reduce((s, h) => s + h.confidence, 0) / run.length
    const candidate: NonNullable<BestWindow> = {
      start: run[0]!.time,
      end: run[run.length - 1]!.time,
      hours: run.length,
      meanScore,
      minScore,
      confidence,
    }
    if (
      !best ||
      candidate.hours > best.hours ||
      (candidate.hours === best.hours && candidate.meanScore > best.meanScore)
    ) {
      best = candidate
    }
  }

  for (let i = 0; i < hours.length; i++) {
    const h = hours[i]!
    const ok =
      h.meanScore >= windowScoreMin && h.confidence >= windowConfidenceMin
    if (ok) {
      if (runStart < 0) runStart = i
    } else {
      flush(i)
      runStart = -1
    }
  }
  flush(hours.length)
  return best
}

function buildDays(hours: HourlyRating[]): DayForecast[] {
  const byDate = new Map<string, HourlyRating[]>()
  for (const h of hours) {
    const list = byDate.get(h.date) ?? []
    list.push(h)
    byDate.set(h.date, list)
  }

  return [...byDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, dayHours]) => {
      const morning = periodFromHours(
        dayHours,
        'morning',
        skiThresholds.morningHours,
      )
      const afternoon = periodFromHours(
        dayHours,
        'afternoon',
        skiThresholds.afternoonHours,
      )
      const bestWindow = findBestWindow(dayHours)
      // Day score: prefer morning worst (ski mornings matter most), blend with afternoon
      const dayScore = Number.isFinite(morning.worstScore)
        ? 0.65 * morning.worstScore +
          0.35 * (Number.isFinite(afternoon.worstScore) ? afternoon.worstScore : morning.worstScore)
        : afternoon.worstScore
      const dayConfidence =
        (morning.confidence * morning.hours.length +
          afternoon.confidence * afternoon.hours.length) /
        Math.max(1, morning.hours.length + afternoon.hours.length)
      const dayPGlassy =
        dayHours.reduce((s, h) => s + h.pGlassy, 0) / Math.max(1, dayHours.length)

      return {
        date,
        hours: dayHours,
        morning,
        afternoon,
        bestWindow,
        dayScore,
        dayConfidence,
        dayPGlassy,
      }
    })
}

function allTimes(models: ModelForecast[], ensembles: EnsembleForecast[]): string[] {
  const set = new Set<string>()
  for (const m of models) for (const t of m.hourly.time) set.add(t)
  for (const e of ensembles) for (const t of e.time) set.add(t)
  return [...set].sort()
}

export async function buildForecast(
  zone: Zone,
  fetchTable: FetchTable,
): Promise<ForecastBundle> {
  const [models, ensembles] = await Promise.all([
    fetchAllDeterministic(zone.lat, zone.lon),
    fetchAllEnsembles(zone.lat, zone.lon),
  ])

  const now = new Date()
  const times = allTimes(models, ensembles)
  const hours: HourlyRating[] = []

  for (const time of times) {
    const winds = collectWindsAtTime(models, ensembles, time)
    const rated = rateHour(time, winds, zone.id, fetchTable, now)
    if (rated) hours.push(rated)
  }

  // Split past vs future using local wall-clock comparison against "today" in series
  const todayStr = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Vancouver',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now)

  const nowHour = Number(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Vancouver',
      hour: '2-digit',
      hour12: false,
    }).format(now),
  )

  const pastHours: HourlyRating[] = []
  const futureHours: HourlyRating[] = []

  for (const h of hours) {
    if (h.date < todayStr || (h.date === todayStr && h.localHour < nowHour)) {
      pastHours.push(h)
    } else {
      futureHours.push(h)
    }
  }

  return {
    zone,
    generatedAt: now.toISOString(),
    modelsUsed: models.map((m) => m.model),
    ensembleModelsUsed: ensembles.map((e) => e.model),
    hours: futureHours,
    days: buildDays(futureHours),
    pastHours,
  }
}
