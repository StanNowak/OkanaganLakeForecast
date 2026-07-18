export function formatScore(score: number): string {
  if (!Number.isFinite(score)) return '—'
  return Math.round(score).toString()
}

export function formatPct(p: number): string {
  if (!Number.isFinite(p)) return '—'
  return `${Math.round(p * 100)}%`
}

export function formatKn(kn: number): string {
  if (!Number.isFinite(kn)) return '—'
  return `${kn.toFixed(0)} kn`
}

export function formatHs(m: number): string {
  if (!Number.isFinite(m)) return '—'
  if (m < 0.01) return '<1 cm'
  return `${(m * 100).toFixed(0)} cm`
}

export function formatFetch(m: number): string {
  if (!Number.isFinite(m)) return '—'
  if (m >= 1000) return `${(m / 1000).toFixed(1)} km`
  return `${Math.round(m)} m`
}

export function formatDir(deg: number): string {
  if (!Number.isFinite(deg)) return '—'
  const dirs = [
    'North',
    'NE',
    'East',
    'SE',
    'South',
    'SW',
    'West',
    'NW',
  ]
  const i = Math.round((((deg % 360) + 360) % 360) / 45) % 8
  return `from the ${dirs[i]}`
}

export function formatHour(isoLocal: string): string {
  const time = isoLocal.split('T')[1] ?? ''
  return time.slice(0, 5)
}

export function formatDayLabel(date: string): string {
  const d = new Date(`${date}T12:00:00`)
  return d.toLocaleDateString('en-CA', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}

export function windArrowRotation(fromDeg: number): number {
  // CSS rotate: 0 points up; meteorological FROM → point arrow in TO direction
  return (fromDeg + 180) % 360
}
