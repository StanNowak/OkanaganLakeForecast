import { useEffect, useRef } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import type { Zone } from '../config'

type Props = {
  zones: Zone[]
  selectedId: string
  onSelect: (id: string) => void
}

export function MapView({ zones, selectedId, onSelect }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const markersRef = useRef<maplibregl.Marker[]>([])
  const onSelectRef = useRef(onSelect)
  onSelectRef.current = onSelect

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: {
        version: 8,
        sources: {
          osm: {
            type: 'raster',
            tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
            tileSize: 256,
            attribution: '© OpenStreetMap',
          },
        },
        layers: [{ id: 'osm', type: 'raster', source: 'osm' }],
      },
      center: [-119.5, 49.87],
      zoom: 10,
      attributionControl: {},
    })

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right')

    map.on('load', async () => {
      try {
        const base = import.meta.env.BASE_URL
        const res = await fetch(`${base}data/okanagan-lake.geojson`)
        const geo = await res.json()
        if (!map.getSource('lake')) {
          map.addSource('lake', { type: 'geojson', data: geo })
          map.addLayer({
            id: 'lake-fill',
            type: 'fill',
            source: 'lake',
            paint: { 'fill-color': '#3d6b7a', 'fill-opacity': 0.4 },
          })
          map.addLayer({
            id: 'lake-outline',
            type: 'line',
            source: 'lake',
            paint: { 'line-color': '#0b1d33', 'line-width': 2 },
          })
        }
      } catch (e) {
        console.warn('Could not load lake polygon', e)
      }
    })

    mapRef.current = map
    return () => {
      markersRef.current.forEach((m) => m.remove())
      markersRef.current = []
      map.remove()
      mapRef.current = null
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    markersRef.current.forEach((m) => m.remove())
    markersRef.current = []

    for (const z of zones) {
      const el = document.createElement('button')
      el.type = 'button'
      el.setAttribute('aria-label', z.name)
      const active = z.id === selectedId
      el.style.cssText = `
        width: ${active ? 22 : 16}px;
        height: ${active ? 22 : 16}px;
        border-radius: 9999px;
        border: 3px solid ${active ? '#b8956c' : '#0b1d33'};
        background: ${active ? '#c8102e' : '#f3ebd8'};
        box-shadow: 0 2px 6px rgba(11,29,51,0.35);
        cursor: pointer;
        padding: 0;
      `
      el.addEventListener('click', () => onSelectRef.current(z.id))

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([z.lon, z.lat])
        .setPopup(
          new maplibregl.Popup({ offset: 14, closeButton: false }).setHTML(
            `<strong style="font-size:16px">${z.name}</strong>`,
          ),
        )
        .addTo(map)

      markersRef.current.push(marker)
    }

    const selected = zones.find((z) => z.id === selectedId)
    if (selected) {
      map.easeTo({ center: [selected.lon, selected.lat], duration: 400 })
    }
  }, [zones, selectedId])

  return <div ref={containerRef} className="h-56 w-full sm:h-64" />
}
