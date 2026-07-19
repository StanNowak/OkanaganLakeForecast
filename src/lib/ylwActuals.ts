import { ylwStation } from '../config'

export type AirportObs = {
  /** Local wall time as YYYY-MM-DDTHH:mm (America/Vancouver). */
  time: string
  date: string
  localHour: number
  windKn: number
  windDirDeg: number | null
  gustKn: number | null
  tempC: number | null
}

export type AirportActuals = {
  stationId: string
  name: string
  observations: AirportObs[]
  fetchedAt: string
}

function parseNum(raw: string): number | null {
  const t = raw.trim()
  if (!t || t === 'M' || t === 'null') return null
  const n = Number(t)
  return Number.isFinite(n) ? n : null
}

/** IEM returns `valid` in the requested tz as `YYYY-MM-DD HH:mm`. */
function toLocalParts(valid: string): { time: string; date: string; localHour: number } | null {
  const m = valid.trim().match(/^(\d{4}-\d{2}-\d{2})[ T](\d{2}):(\d{2})/)
  if (!m) return null
  const date = m[1]!
  const hh = m[2]!
  const mm = m[3]!
  return {
    date,
    time: `${date}T${hh}:${mm}`,
    localHour: Number(hh),
  }
}

function buildAsosUrl(hours: number): string {
  const params = new URLSearchParams({
    station: ylwStation.icao,
    network: ylwStation.network,
    tz: 'America/Vancouver',
    format: 'onlycomma',
    latlon: 'no',
    elev: 'no',
    hours: String(hours),
    report_type: '3',
  })
  for (const field of ['tmpc', 'sknt', 'drct', 'gust']) {
    params.append('data', field)
  }
  return `${ylwStation.asosUrl}?${params}`
}

function parseAsosCsv(text: string): AirportObs[] {
  const lines = text
    .trim()
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith('Too many requests'))
  if (lines.length < 2) return []

  const header = lines[0]!.split(',').map((h) => h.trim())
  const idx = {
    valid: header.indexOf('valid'),
    tmpc: header.indexOf('tmpc'),
    sknt: header.indexOf('sknt'),
    drct: header.indexOf('drct'),
    gust: header.indexOf('gust'),
  }
  if (idx.valid < 0 || idx.sknt < 0) return []

  const byHour = new Map<string, AirportObs>()
  for (const line of lines.slice(1)) {
    const cols = line.split(',')
    const parts = toLocalParts(cols[idx.valid] ?? '')
    const windKn = parseNum(cols[idx.sknt] ?? '')
    if (!parts || windKn === null) continue

    const obs: AirportObs = {
      time: parts.time,
      date: parts.date,
      localHour: parts.localHour,
      windKn,
      windDirDeg: idx.drct >= 0 ? parseNum(cols[idx.drct] ?? '') : null,
      gustKn: idx.gust >= 0 ? parseNum(cols[idx.gust] ?? '') : null,
      tempC: idx.tmpc >= 0 ? parseNum(cols[idx.tmpc] ?? '') : null,
    }
    // Prefer later duplicate for the same hour key if any.
    byHour.set(parts.time, obs)
  }

  return [...byHour.values()].sort((a, b) => a.time.localeCompare(b.time))
}

export async function fetchYlwActuals(
  hours: number = ylwStation.lookbackHours,
): Promise<AirportActuals> {
  const res = await fetch(buildAsosUrl(hours))
  if (!res.ok) {
    throw new Error(`YLW airport observations failed: ${res.status}`)
  }
  const text = await res.text()
  if (text.includes('Too many requests')) {
    throw new Error('YLW airport observations rate-limited — try again shortly')
  }
  const observations = parseAsosCsv(text)
  if (observations.length === 0) {
    throw new Error('YLW airport returned no usable wind observations')
  }
  return {
    stationId: ylwStation.icao,
    name: ylwStation.name,
    observations,
    fetchedAt: new Date().toISOString(),
  }
}
