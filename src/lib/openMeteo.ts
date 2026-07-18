import {
  deterministicModels,
  ensembleModels,
  openMeteo,
  type DeterministicModel,
  type EnsembleModel,
} from '../config'

export type HourlySeries = {
  time: string[]
  wind_speed_10m: (number | null)[]
  wind_direction_10m: (number | null)[]
  wind_gusts_10m: (number | null)[]
  temperature_2m?: (number | null)[]
}

export type ModelForecast = {
  model: DeterministicModel
  latitude: number
  longitude: number
  hourly: HourlySeries
}

export type EnsembleMemberHourly = {
  member: number
  model: EnsembleModel
  wind_speed_10m: (number | null)[]
  wind_direction_10m: (number | null)[]
  wind_gusts_10m: (number | null)[]
}

export type EnsembleForecast = {
  model: EnsembleModel
  latitude: number
  longitude: number
  time: string[]
  members: EnsembleMemberHourly[]
}

type ForecastApiResponse = {
  latitude: number
  longitude: number
  hourly: HourlySeries
}

function buildForecastUrl(
  lat: number,
  lon: number,
  model: DeterministicModel,
): string {
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    hourly: 'wind_speed_10m,wind_direction_10m,wind_gusts_10m,temperature_2m',
    models: model,
    wind_speed_unit: openMeteo.windSpeedUnit,
    timezone: openMeteo.timezone,
    forecast_days: String(openMeteo.forecastDays),
    past_days: String(openMeteo.pastDays),
  })
  return `${openMeteo.forecastUrl}?${params}`
}

function buildEnsembleUrl(lat: number, lon: number, model: EnsembleModel): string {
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    hourly: 'wind_speed_10m,wind_direction_10m,wind_gusts_10m',
    models: model,
    wind_speed_unit: openMeteo.windSpeedUnit,
    timezone: openMeteo.timezone,
    forecast_days: String(Math.min(openMeteo.forecastDays, 7)),
  })
  return `${openMeteo.ensembleUrl}?${params}`
}

export async function fetchDeterministicModel(
  lat: number,
  lon: number,
  model: DeterministicModel,
): Promise<ModelForecast> {
  const res = await fetch(buildForecastUrl(lat, lon, model))
  if (!res.ok) {
    throw new Error(`Open-Meteo forecast (${model}) failed: ${res.status}`)
  }
  const data = (await res.json()) as ForecastApiResponse
  return {
    model,
    latitude: data.latitude,
    longitude: data.longitude,
    hourly: data.hourly,
  }
}

export async function fetchAllDeterministic(
  lat: number,
  lon: number,
  models: readonly DeterministicModel[] = deterministicModels,
): Promise<ModelForecast[]> {
  const results = await Promise.allSettled(
    models.map((m) => fetchDeterministicModel(lat, lon, m)),
  )
  const ok: ModelForecast[] = []
  for (const r of results) {
    if (r.status === 'fulfilled') ok.push(r.value)
    else console.warn(r.reason)
  }
  if (ok.length === 0) throw new Error('All deterministic model requests failed')
  return ok
}

type EnsembleApiResponse = {
  latitude: number
  longitude: number
  hourly: Record<string, (number | null)[] | string[]>
}

function parseEnsembleMembers(
  model: EnsembleModel,
  hourly: EnsembleApiResponse['hourly'],
): EnsembleMemberHourly[] {
  const time = (hourly.time as string[]) ?? []
  const memberIds = new Set<number>()

  for (const key of Object.keys(hourly)) {
    const m = key.match(/^wind_speed_10m_member(\d+)$/)
    if (m) memberIds.add(Number(m[1]))
  }

  // Some models return mean-only without member suffix — treat as member 0
  if (memberIds.size === 0 && Array.isArray(hourly.wind_speed_10m)) {
    return [
      {
        member: 0,
        model,
        wind_speed_10m: hourly.wind_speed_10m as (number | null)[],
        wind_direction_10m: (hourly.wind_direction_10m as (number | null)[]) ??
          time.map(() => null),
        wind_gusts_10m: (hourly.wind_gusts_10m as (number | null)[]) ??
          time.map(() => null),
      },
    ]
  }

  return [...memberIds]
    .sort((a, b) => a - b)
    .map((member) => {
      const pad = String(member).padStart(2, '0')
      return {
        member,
        model,
        wind_speed_10m:
          (hourly[`wind_speed_10m_member${pad}`] as (number | null)[]) ??
          (hourly[`wind_speed_10m_member${member}`] as (number | null)[]) ??
          [],
        wind_direction_10m:
          (hourly[`wind_direction_10m_member${pad}`] as (number | null)[]) ??
          (hourly[`wind_direction_10m_member${member}`] as (number | null)[]) ??
          [],
        wind_gusts_10m:
          (hourly[`wind_gusts_10m_member${pad}`] as (number | null)[]) ??
          (hourly[`wind_gusts_10m_member${member}`] as (number | null)[]) ??
          [],
      }
    })
}

export async function fetchEnsembleModel(
  lat: number,
  lon: number,
  model: EnsembleModel,
): Promise<EnsembleForecast> {
  const res = await fetch(buildEnsembleUrl(lat, lon, model))
  if (!res.ok) {
    throw new Error(`Open-Meteo ensemble (${model}) failed: ${res.status}`)
  }
  const data = (await res.json()) as EnsembleApiResponse
  const members = parseEnsembleMembers(model, data.hourly)
  return {
    model,
    latitude: data.latitude,
    longitude: data.longitude,
    time: (data.hourly.time as string[]) ?? [],
    members,
  }
}

export async function fetchAllEnsembles(
  lat: number,
  lon: number,
  models: readonly EnsembleModel[] = ensembleModels,
): Promise<EnsembleForecast[]> {
  const results = await Promise.allSettled(
    models.map((m) => fetchEnsembleModel(lat, lon, m)),
  )
  const ok: EnsembleForecast[] = []
  for (const r of results) {
    if (r.status === 'fulfilled') ok.push(r.value)
    else console.warn(r.reason)
  }
  return ok
}
