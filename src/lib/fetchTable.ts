import { fetchBins } from '../config'

export type ZoneFetch = {
  zoneId: string
  /** Effective fetch (m) for each 10° bin, index 0 = wind FROM 0° (north) */
  fetch_m: number[]
}

export type FetchTable = {
  binCount: number
  stepDeg: number
  zones: Record<string, ZoneFetch>
}

/**
 * Interpolate effective fetch for a continuous wind-from direction (0-360°).
 * Meteorological convention: direction wind blows FROM.
 */
export function lookupFetch(table: FetchTable, zoneId: string, windFromDeg: number): number {
  const zone = table.zones[zoneId]
  if (!zone || zone.fetch_m.length === 0) {
    throw new Error(`No fetch data for zone ${zoneId}`)
  }

  const values = zone.fetch_m
  const n = values.length
  const step = table.stepDeg || 360 / n

  // Normalize to [0, 360)
  let dir = ((windFromDeg % 360) + 360) % 360
  const idx = dir / step
  const i0 = Math.floor(idx) % n
  const i1 = (i0 + 1) % n
  const t = idx - Math.floor(idx)

  return values[i0]! * (1 - t) + values[i1]! * t
}

/** Cosine-weighted effective fetch over ±45° (used by build-fetch script too). */
export function effectiveFetch(
  rawByBin: number[],
  centerBin: number,
  stepDeg = fetchBins.stepDeg,
): number {
  const n = rawByBin.length
  let num = 0
  let den = 0
  for (let a = -45; a <= 45; a += 7.5) {
    const offsetBins = a / stepDeg
    const idx = Math.round(centerBin + offsetBins)
    const wrapped = ((idx % n) + n) % n
    const w = Math.cos((a * Math.PI) / 180)
    if (w <= 0) continue
    num += (rawByBin[wrapped] ?? 0) * w
    den += w
  }
  return den > 0 ? num / den : (rawByBin[centerBin] ?? 0)
}

export async function loadFetchTable(
  url = `${import.meta.env.BASE_URL}data/fetch-table.json`,
): Promise<FetchTable> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Failed to load fetch table: ${res.status}`)
  return (await res.json()) as FetchTable
}
