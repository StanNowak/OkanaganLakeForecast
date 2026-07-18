/**
 * Offline: ray-cast fetch distances for each ski zone + direction bin,
 * cosine-average to effective fetch, emit public/data/fetch-table.json.
 *
 * Run: npx tsx scripts/build-fetch.ts
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import * as turf from '@turf/turf'
import type { Feature, FeatureCollection, Polygon, MultiPolygon } from 'geojson'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')

const BIN_COUNT = 36
const STEP = 360 / BIN_COUNT
const MAX_RAY_KM = 80

const zones = [
  // East-shore downtown Kelowna (on water, near waterfront parks)
  { id: 'kelowna-waterfront', name: 'Kelowna Waterfront', lat: 49.888, lon: -119.504 },
  { id: 'bennett-bridge', name: 'W.R. Bennett Bridge', lat: 49.875, lon: -119.52 },
  { id: 'south-arm-elbow', name: 'South Arm / Elbow', lat: 49.82, lon: -119.55 },
]

function loadLakePolygon(): Feature<Polygon | MultiPolygon> {
  const path = join(root, 'public/data/okanagan-lake.geojson')
  const fc = JSON.parse(readFileSync(path, 'utf8')) as FeatureCollection
  const feature = fc.features.find((f) => f.geometry?.type === 'Polygon' || f.geometry?.type === 'MultiPolygon')
  if (!feature) throw new Error('No polygon found in okanagan-lake.geojson')
  return feature as Feature<Polygon | MultiPolygon>
}

/**
 * Fetch = over-water distance upwind to shore.
 * Meteorological wind direction is the direction the wind blows FROM,
 * so we ray-cast in that same bearing (into the wind).
 */
function rayFetchM(
  lake: Feature<Polygon | MultiPolygon>,
  lon: number,
  lat: number,
  windFromDeg: number,
): number {
  const travelBearing = ((windFromDeg % 360) + 360) % 360
  const origin = turf.point([lon, lat])

  if (!turf.booleanPointInPolygon(origin, lake)) {
    // Nudge toward lake centroid if slightly off water
    const c = turf.centroid(lake)
    const mid = turf.midpoint(origin, c)
    if (!turf.booleanPointInPolygon(mid, lake)) {
      return 500 // fallback short fetch
    }
    return rayFetchM(lake, mid.geometry.coordinates[0]!, mid.geometry.coordinates[1]!, windFromDeg)
  }

  // Binary search along ray for exit from water
  let lo = 0
  let hi = MAX_RAY_KM
  for (let i = 0; i < 28; i++) {
    const mid = (lo + hi) / 2
    const pt = turf.destination(origin, mid, travelBearing, { units: 'kilometers' })
    if (turf.booleanPointInPolygon(pt, lake)) lo = mid
    else hi = mid
  }
  return lo * 1000
}

function effectiveFetch(rawByBin: number[], centerBin: number): number {
  let num = 0
  let den = 0
  for (let a = -45; a <= 45; a += 7.5) {
    const offsetBins = a / STEP
    const idx = Math.round(centerBin + offsetBins)
    const wrapped = ((idx % BIN_COUNT) + BIN_COUNT) % BIN_COUNT
    const w = Math.cos((a * Math.PI) / 180)
    if (w <= 0) continue
    num += (rawByBin[wrapped] ?? 0) * w
    den += w
  }
  return den > 0 ? num / den : (rawByBin[centerBin] ?? 0)
}

function main() {
  const lake = loadLakePolygon()
  const zonesOut: Record<
    string,
    { zoneId: string; name: string; lat: number; lon: number; fetch_m: number[]; raw_fetch_m: number[] }
  > = {}

  for (const z of zones) {
    const raw: number[] = []
    for (let i = 0; i < BIN_COUNT; i++) {
      const windFrom = i * STEP
      raw.push(rayFetchM(lake, z.lon, z.lat, windFrom))
    }
    const effective = raw.map((_, i) => Math.round(effectiveFetch(raw, i)))
    zonesOut[z.id] = {
      zoneId: z.id,
      name: z.name,
      lat: z.lat,
      lon: z.lon,
      fetch_m: effective,
      raw_fetch_m: raw.map((v) => Math.round(v)),
    }
    console.log(
      `${z.id}: N=${effective[0]}m E=${effective[9]}m S=${effective[18]}m W=${effective[27]}m`,
    )
  }

  const out = {
    binCount: BIN_COUNT,
    stepDeg: STEP,
    generatedAt: new Date().toISOString(),
    source: 'scripts/build-fetch.ts + public/data/okanagan-lake.geojson',
    zones: zonesOut,
  }

  const outPath = join(root, 'public/data/fetch-table.json')
  mkdirSync(dirname(outPath), { recursive: true })
  writeFileSync(outPath, JSON.stringify(out, null, 2))
  console.log(`Wrote ${outPath}`)
}

main()
