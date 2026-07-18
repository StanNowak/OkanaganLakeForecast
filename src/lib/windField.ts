import { openMeteo } from '../config'

export type WindSample = {
  id: string
  lat: number
  lon: number
  windKn: number
  windDir: number
  time: string
}

/** Regular grid covering Okanagan Lake for particle advection. */
export type WindGrid = {
  west: number
  south: number
  east: number
  north: number
  cols: number
  rows: number
  /** Eastward component (kn) */
  u: Float32Array
  /** Northward component (kn) */
  v: Float32Array
  speed: Float32Array
  time: string
}

/** Lake-focused bbox (slightly padded). */
export const lakeBBox = {
  west: -119.78,
  south: 49.49,
  east: -119.34,
  north: 50.36,
} as const

const GRID_COLS = 10
const GRID_ROWS = 18

type MultiCurrentResponse =
  | {
      latitude: number | number[]
      longitude: number | number[]
      current?: {
        time: string
        wind_speed_10m: number
        wind_direction_10m: number
      }
    }
  | Array<{
      latitude: number
      longitude: number
      current?: {
        time: string
        wind_speed_10m: number
        wind_direction_10m: number
      }
    }>

function buildGridPoints(): { lat: number; lon: number; id: string }[] {
  const { west, south, east, north } = lakeBBox
  const points: { lat: number; lon: number; id: string }[] = []
  for (let r = 0; r < GRID_ROWS; r++) {
    const lat = south + ((north - south) * r) / (GRID_ROWS - 1)
    for (let c = 0; c < GRID_COLS; c++) {
      const lon = west + ((east - west) * c) / (GRID_COLS - 1)
      points.push({ lat, lon, id: `${r}_${c}` })
    }
  }
  return points
}

async function fetchPoints(
  points: { lat: number; lon: number; id: string }[],
): Promise<WindSample[]> {
  const lats = points.map((p) => p.lat).join(',')
  const lons = points.map((p) => p.lon).join(',')
  const params = new URLSearchParams({
    latitude: lats,
    longitude: lons,
    current: 'wind_speed_10m,wind_direction_10m',
    wind_speed_unit: openMeteo.windSpeedUnit,
    timezone: openMeteo.timezone,
    models: 'gem_hrdps_continental',
  })

  let res = await fetch(`${openMeteo.forecastUrl}?${params}`)
  if (!res.ok) {
    params.delete('models')
    res = await fetch(`${openMeteo.forecastUrl}?${params}`)
  }
  if (!res.ok) throw new Error(`Wind field failed: ${res.status}`)

  const data = (await res.json()) as MultiCurrentResponse
  const rows = Array.isArray(data) ? data : [data]

  return rows.map((row, i) => {
    const point = points[i]!
    const cur = row.current
    return {
      ...point,
      windKn: cur?.wind_speed_10m ?? 0,
      windDir: cur?.wind_direction_10m ?? 0,
      time: cur?.time ?? '',
    }
  })
}

/** Meteorological FROM → eastward/northward components (kn). */
export function windToUV(speedKn: number, fromDeg: number): { u: number; v: number } {
  const rad = (fromDeg * Math.PI) / 180
  return {
    u: -speedKn * Math.sin(rad),
    v: -speedKn * Math.cos(rad),
  }
}

/**
 * Fetch a dense current wind grid over the lake (batched Open-Meteo calls).
 */
export async function fetchCurrentWindGrid(): Promise<WindGrid> {
  const points = buildGridPoints()
  const batchSize = 40
  const samples: WindSample[] = []

  for (let i = 0; i < points.length; i += batchSize) {
    const batch = points.slice(i, i + batchSize)
    const part = await fetchPoints(batch)
    samples.push(...part)
  }

  const n = GRID_COLS * GRID_ROWS
  const u = new Float32Array(n)
  const v = new Float32Array(n)
  const speed = new Float32Array(n)
  let time = ''

  for (let i = 0; i < n; i++) {
    const s = samples[i]
    if (!s) continue
    const uv = windToUV(s.windKn, s.windDir)
    u[i] = uv.u
    v[i] = uv.v
    speed[i] = s.windKn
    if (s.time) time = s.time
  }

  return {
    west: lakeBBox.west,
    south: lakeBBox.south,
    east: lakeBBox.east,
    north: lakeBBox.north,
    cols: GRID_COLS,
    rows: GRID_ROWS,
    u,
    v,
    speed,
    time,
  }
}

/** Backward-compatible helper used by App refresh. */
export async function fetchCurrentWindField(): Promise<WindSample[]> {
  const grid = await fetchCurrentWindGrid()
  // Return a few representative samples for legends / stamps
  const out: WindSample[] = []
  const midC = Math.floor(grid.cols / 2)
  for (let r = 0; r < grid.rows; r += 3) {
    const i = r * grid.cols + midC
    const lat = grid.south + ((grid.north - grid.south) * r) / (grid.rows - 1)
    const lon = grid.west + ((grid.east - grid.west) * midC) / (grid.cols - 1)
    const spd = grid.speed[i] ?? 0
    const uu = grid.u[i] ?? 0
    const vv = grid.v[i] ?? 0
    const from = ((Math.atan2(-uu, -vv) * 180) / Math.PI + 360) % 360
    out.push({
      id: `r${r}`,
      lat,
      lon,
      windKn: spd,
      windDir: from,
      time: grid.time,
    })
  }
  return out
}

export type WindArrow = {
  lon: number
  lat: number
  speedKn: number
  /** Meteorological FROM direction (deg) */
  fromDeg: number
  /** Direction the wind is going TO (deg) — for arrow rotation */
  toDeg: number
}

/**
 * Convert the grid into arrow points (one per grid cell). Optionally filter to
 * a lake polygon test callback so arrows only sit on water.
 */
export function windGridToArrows(
  grid: WindGrid,
  onWater?: (lon: number, lat: number) => boolean,
): WindArrow[] {
  const arrows: WindArrow[] = []
  const { west, south, east, north, cols, rows } = grid
  for (let r = 0; r < rows; r++) {
    const lat = south + ((north - south) * r) / (rows - 1)
    for (let c = 0; c < cols; c++) {
      const lon = west + ((east - west) * c) / (cols - 1)
      if (onWater && !onWater(lon, lat)) continue
      const i = r * cols + c
      const u = grid.u[i] ?? 0
      const v = grid.v[i] ?? 0
      const speedKn = grid.speed[i] ?? Math.hypot(u, v)
      if (!Number.isFinite(speedKn)) continue
      const fromDeg = ((Math.atan2(-u, -v) * 180) / Math.PI + 360) % 360
      const toDeg = (fromDeg + 180) % 360
      arrows.push({ lon, lat, speedKn, fromDeg, toDeg })
    }
  }
  return arrows
}

/** Bilinear sample of u,v at lon/lat. Returns null if outside grid. */
export function sampleGridUV(
  grid: WindGrid,
  lon: number,
  lat: number,
): { u: number; v: number; speed: number } | null {
  const { west, south, east, north, cols, rows } = grid
  if (lon < west || lon > east || lat < south || lat > north) return null

  const x = ((lon - west) / (east - west)) * (cols - 1)
  const y = ((lat - south) / (north - south)) * (rows - 1)
  const c0 = Math.floor(x)
  const r0 = Math.floor(y)
  const c1 = Math.min(c0 + 1, cols - 1)
  const r1 = Math.min(r0 + 1, rows - 1)
  const tx = x - c0
  const ty = y - r0

  const idx = (r: number, c: number) => r * cols + c
  const lerp = (a: number, b: number, t: number) => a + (b - a) * t

  const u00 = grid.u[idx(r0, c0)]!
  const u10 = grid.u[idx(r0, c1)]!
  const u01 = grid.u[idx(r1, c0)]!
  const u11 = grid.u[idx(r1, c1)]!
  const v00 = grid.v[idx(r0, c0)]!
  const v10 = grid.v[idx(r0, c1)]!
  const v01 = grid.v[idx(r1, c0)]!
  const v11 = grid.v[idx(r1, c1)]!

  const u = lerp(lerp(u00, u10, tx), lerp(u01, u11, tx), ty)
  const v = lerp(lerp(v00, v10, tx), lerp(v01, v11, tx), ty)
  return { u, v, speed: Math.hypot(u, v) }
}
