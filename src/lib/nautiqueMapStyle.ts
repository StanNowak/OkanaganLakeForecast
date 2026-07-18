type MapStyle = {
  version: 8
  layers?: Array<{
    id: string
    type: string
    paint?: Record<string, unknown>
    [key: string]: unknown
  }>
  [key: string]: unknown
}

/**
 * Fetch OpenFreeMap Liberty and retint to a Nautique / Kelowna chart look:
 * cream land, deep navy water, brass roads, muted labels.
 */
export async function loadNautiqueMapStyle(): Promise<MapStyle> {
  const res = await fetch('https://tiles.openfreemap.org/styles/liberty')
  if (!res.ok) throw new Error(`Map style failed: ${res.status}`)
  const style = (await res.json()) as MapStyle

  const land = '#e8dcc4'
  const deck = '#f3ebd8'
  const water = '#0b1d33'
  const waterSoft = '#16304f'
  const brass = '#b8956c'
  const ink = '#142033'
  const muted = '#7a6a55'
  const park = '#d9c9a8'

  for (const layer of style.layers ?? []) {
    const id = layer.id.toLowerCase()
    const paint = (layer.paint ??= {}) as Record<string, unknown>

    if (layer.type === 'background') {
      paint['background-color'] = deck
      continue
    }

    if (id.includes('water') && !id.includes('way') && !id.includes('name')) {
      if (layer.type === 'fill') {
        paint['fill-color'] = water
        paint['fill-opacity'] = 0.92
      } else if (layer.type === 'line') {
        paint['line-color'] = waterSoft
      }
      continue
    }

    if (id.includes('park') || id.includes('grass') || id.includes('wood') || id.includes('forest')) {
      if (layer.type === 'fill') paint['fill-color'] = park
      continue
    }

    if (id.includes('landcover') || id.includes('landuse') || id.includes('earth')) {
      if (layer.type === 'fill') paint['fill-color'] = land
      continue
    }

    if (id.includes('building')) {
      if (layer.type === 'fill') {
        paint['fill-color'] = '#d4c4a8'
        paint['fill-opacity'] = 0.55
      }
      continue
    }

    if (
      id.includes('road') ||
      id.includes('highway') ||
      id.includes('bridge') ||
      id.includes('tunnel') ||
      id.includes('path') ||
      id.includes('street')
    ) {
      if (layer.type === 'line') {
        if (id.includes('casing') || id.includes('case')) {
          paint['line-color'] = '#cbb896'
        } else {
          paint['line-color'] = brass
          if (typeof paint['line-opacity'] === 'number') paint['line-opacity'] = 0.55
        }
      }
      continue
    }

    if (layer.type === 'symbol') {
      if (paint['text-color'] != null) paint['text-color'] = ink
      if (paint['text-halo-color'] != null) paint['text-halo-color'] = deck
      if (paint['icon-color'] != null) paint['icon-color'] = muted
      // Soften label density visually
      if (paint['text-opacity'] == null) paint['text-opacity'] = 0.75
    }

    if (id.includes('boundary') || id.includes('admin')) {
      if (layer.type === 'line') {
        paint['line-color'] = muted
        paint['line-opacity'] = 0.35
      }
    }
  }

  return style
}

/** Offline fallback if OpenFreeMap is unreachable — cream chart + our lake only. */
export function nautiqueFallbackStyle(): MapStyle {
  return {
    version: 8,
    sources: {},
    layers: [
      {
        id: 'background',
        type: 'background',
        paint: { 'background-color': '#f3ebd8' },
      },
    ],
  }
}
