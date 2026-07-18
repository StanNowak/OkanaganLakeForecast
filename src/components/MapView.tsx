import { useEffect, useRef, useState } from 'react'
import maplibregl, { type StyleSpecification } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import * as turf from '@turf/turf'
import type { Feature, MultiPolygon, Polygon } from 'geojson'
import type { Zone } from '../config'
import { loadNautiqueMapStyle, nautiqueFallbackStyle } from '../lib/nautiqueMapStyle'
import { windGridToArrows, type WindGrid } from '../lib/windField'

type Props = {
  zones: Zone[]
  selectedId: string
  onSelect: (id: string) => void
  windGrid?: WindGrid | null
}

function arrowColor(kn: number): string {
  // Blue scale: pale calm → deep breezy
  if (kn < 3) return '#7eb8d4'
  if (kn < 7) return '#2f7ea8'
  if (kn < 12) return '#1a5f8a'
  return '#0b3d5c'
}

function ensureLakeLayers(map: maplibregl.Map, geo: GeoJSON.GeoJSON) {
  if (map.getSource('lake')) return
  map.addSource('lake', { type: 'geojson', data: geo })
  map.addLayer({
    id: 'lake-fill',
    type: 'fill',
    source: 'lake',
    paint: { 'fill-color': '#3d6b7a', 'fill-opacity': 0.22 },
  })
  map.addLayer({
    id: 'lake-outline',
    type: 'line',
    source: 'lake',
    paint: { 'line-color': '#b8956c', 'line-width': 2.5 },
  })
}

export function MapView({ zones, selectedId, onSelect, windGrid = null }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const [mapInstance, setMapInstance] = useState<maplibregl.Map | null>(null)
  const zoneMarkersRef = useRef<maplibregl.Marker[]>([])
  const windMarkersRef = useRef<maplibregl.Marker[]>([])
  const lakeRef = useRef<Feature<Polygon | MultiPolygon> | null>(null)
  const onSelectRef = useRef(onSelect)
  onSelectRef.current = onSelect

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return
    let cancelled = false

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: nautiqueFallbackStyle() as StyleSpecification,
      center: [-119.55, 49.82],
      zoom: 9.6,
      attributionControl: { compact: true },
    })
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right')

    const onStyleReady = async () => {
      if (cancelled) return
      try {
        const base = import.meta.env.BASE_URL
        const res = await fetch(`${base}data/okanagan-lake.geojson`)
        const geo = (await res.json()) as GeoJSON.FeatureCollection
        lakeRef.current = (geo.features?.[0] as Feature<Polygon | MultiPolygon>) ?? null
        ensureLakeLayers(map, geo)
      } catch (e) {
        console.warn('Could not load lake layers', e)
      }
    }

    map.on('style.load', () => {
      void onStyleReady()
    })

    map.on('load', async () => {
      const ready = () => {
        if (!cancelled) setMapInstance(map)
      }
      try {
        const style = await loadNautiqueMapStyle()
        if (cancelled) return
        map.once('style.load', ready)
        map.setStyle(style as StyleSpecification)
      } catch (e) {
        console.warn('Nautique basemap unavailable, using chart fallback', e)
        void onStyleReady()
        ready()
      }
    })

    mapRef.current = map
    return () => {
      cancelled = true
      zoneMarkersRef.current.forEach((m) => m.remove())
      windMarkersRef.current.forEach((m) => m.remove())
      zoneMarkersRef.current = []
      windMarkersRef.current = []
      map.remove()
      mapRef.current = null
      setMapInstance(null)
    }
  }, [])

  // Static wind arrows
  useEffect(() => {
    const map = mapInstance
    if (!map || !windGrid) return

    windMarkersRef.current.forEach((m) => m.remove())
    windMarkersRef.current = []

    const lake = lakeRef.current
    const onWater = (lon: number, lat: number) =>
      !lake || turf.booleanPointInPolygon(turf.point([lon, lat]), lake)

    const arrows = windGridToArrows(windGrid, onWater)

    for (const a of arrows) {
      const el = document.createElement('div')
      el.setAttribute('aria-hidden', 'true')
      const size = a.speedKn < 3 ? 20 : a.speedKn < 8 ? 26 : 32
      el.style.cssText = `width:${size}px;height:${size}px;pointer-events:none;`
      el.innerHTML = `
        <svg viewBox="0 0 24 24" width="${size}" height="${size}"
             style="transform:rotate(${a.toDeg}deg);display:block">
          <path d="M12 2 L18 20 L12 15 L6 20 Z"
                fill="${arrowColor(a.speedKn)}"
                stroke="#f3ebd8" stroke-width="1.2" stroke-linejoin="round"/>
        </svg>`
      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([a.lon, a.lat])
        .addTo(map)
      windMarkersRef.current.push(marker)
    }
  }, [mapInstance, windGrid])

  // Zone pins
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    zoneMarkersRef.current.forEach((m) => m.remove())
    zoneMarkersRef.current = []

    for (const z of zones) {
      const el = document.createElement('button')
      el.type = 'button'
      el.setAttribute('aria-label', z.name)
      const active = z.id === selectedId
      el.style.cssText = `
        width: ${active ? 24 : 16}px;
        height: ${active ? 24 : 16}px;
        border-radius: 9999px;
        border: 3px solid ${active ? '#f3ebd8' : '#0b1d33'};
        background: ${active ? '#c8102e' : '#f3ebd8'};
        box-shadow: 0 2px 8px rgba(11,29,51,0.5);
        cursor: pointer;
        padding: 0;
        z-index: 3;
      `
      el.addEventListener('click', () => onSelectRef.current(z.id))
      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([z.lon, z.lat])
        .setPopup(
          new maplibregl.Popup({ offset: 14, closeButton: false }).setHTML(
            `<strong style="font-size:15px;font-family:Libre Franklin,sans-serif">${z.name}</strong>`,
          ),
        )
        .addTo(map)
      zoneMarkersRef.current.push(marker)
    }

    const selected = zones.find((z) => z.id === selectedId)
    if (selected) map.easeTo({ center: [selected.lon, selected.lat], duration: 400 })
  }, [zones, selectedId])

  const stamp = windGrid?.time

  return (
    <div className="relative overflow-hidden">
      <div ref={containerRef} className="h-72 w-full sm:h-80" />
      <div className="pointer-events-none absolute bottom-2 left-2 z-10 max-w-[90%] rounded-lg border border-[var(--brass)] bg-[rgba(11,29,51,0.9)] px-2.5 py-1.5 text-xs font-bold text-[var(--deck)]">
        Wind now
        {stamp ? ` · ${stamp.replace('T', ' ').slice(0, 16)}` : ' · loading…'}
        <span className="mt-0.5 block font-semibold text-[#7eb8d4]">
          Arrows point where wind blows · light blue calm → deep blue breezy
        </span>
      </div>
    </div>
  )
}
