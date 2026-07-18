/**
 * Download / convert OSM Okanagan Lake shoreline into a simplified GeoJSON
 * used for fetch ray-casting.
 *
 * Usage:
 *   curl -sS "https://polygons.openstreetmap.fr/get_geojson.py?id=2903374&params=0" -o /tmp/okanagan-osm.json
 *   npx tsx scripts/import-lake-osm.ts [/tmp/okanagan-osm.json]
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import * as turf from '@turf/turf'
import type { Feature, MultiPolygon, Polygon } from 'geojson'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const inputPath = process.argv[2] ?? '/tmp/okanagan-osm.json'
const outPath = join(root, 'public/data/okanagan-lake.geojson')

const zones = [
  { id: 'kelowna-waterfront', lat: 49.888, lon: -119.504 },
  { id: 'bennett-bridge', lat: 49.875, lon: -119.52 },
  { id: 'south-arm-elbow', lat: 49.82, lon: -119.55 },
]

function main() {
  const raw = JSON.parse(readFileSync(inputPath, 'utf8')) as MultiPolygon
  if (raw.type !== 'MultiPolygon' && raw.type !== 'Polygon') {
    throw new Error(`Expected Polygon/MultiPolygon, got ${(raw as { type: string }).type}`)
  }

  const feature = turf.feature(raw, {
    name: 'Okanagan Lake',
    source: 'OSM relation 2903374',
  }) as Feature<Polygon | MultiPolygon>

  // ~25–40 m simplification — accurate enough for fetch, small enough for the repo
  const simplified = turf.simplify(feature, {
    tolerance: 0.00025,
    highQuality: true,
    mutate: false,
  }) as Feature<Polygon | MultiPolygon>

  let geom: Polygon | MultiPolygon = simplified.geometry
  if (geom.type === 'MultiPolygon') {
    const polys = geom.coordinates
      .map((coords) => turf.polygon(coords))
      .sort((a, b) => turf.area(b) - turf.area(a))
    const maxA = turf.area(polys[0]!)
    const kept = polys.filter((p) => turf.area(p) >= maxA * 0.01)
    geom =
      kept.length === 1
        ? kept[0]!.geometry
        : (turf.multiPolygon(kept.map((p) => p.geometry.coordinates)).geometry as MultiPolygon)
  }

  const outFeature: Feature<Polygon | MultiPolygon> = {
    type: 'Feature',
    properties: {
      name: 'Okanagan Lake',
      source: 'OpenStreetMap relation 2903374',
      simplified: true,
      tolerance_deg: 0.00025,
    },
    geometry: geom,
  }

  const fc = { type: 'FeatureCollection' as const, features: [outFeature] }
  writeFileSync(outPath, JSON.stringify(fc))
  console.log(`Wrote ${outPath} (${Buffer.byteLength(JSON.stringify(fc))} bytes)`)
  console.log('geometry:', geom.type)
  console.log('bbox:', turf.bbox(outFeature))

  for (const z of zones) {
    const inside = turf.booleanPointInPolygon(turf.point([z.lon, z.lat]), outFeature)
    console.log(`${z.id}: inside water? ${inside}`)
  }
}

main()
