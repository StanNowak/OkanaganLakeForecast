import { useCallback, useEffect, useMemo, useState } from 'react'
import { defaultZoneId, zones } from './config'
import { ActualsView } from './components/ActualsView'
import { DayStrip } from './components/DayStrip'
import { HeroDecision } from './components/HeroDecision'
import { HourStrip } from './components/HourStrip'
import { MapView } from './components/MapView'
import { PeriodTiles } from './components/PeriodTiles'
import { WebcamGallery } from './components/WebcamGallery'
import { ZoneSelector } from './components/ZoneSelector'
import { buildForecast, type ForecastBundle } from './lib/forecast'
import { loadFetchTable, type FetchTable } from './lib/fetchTable'
import { fetchCurrentWindGrid, type WindGrid } from './lib/windField'

type View = 'forecast' | 'recent'

export default function App() {
  const [zoneId, setZoneId] = useState(defaultZoneId)
  const [fetchTable, setFetchTable] = useState<FetchTable | null>(null)
  const [bundle, setBundle] = useState<ForecastBundle | null>(null)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [view, setView] = useState<View>('forecast')
  const [showMap, setShowMap] = useState(false)
  const [showTech, setShowTech] = useState(false)
  const [windGrid, setWindGrid] = useState<WindGrid | null>(null)

  const zone = useMemo(
    () => zones.find((z) => z.id === zoneId) ?? zones[0]!,
    [zoneId],
  )

  useEffect(() => {
    let cancelled = false
    loadFetchTable()
      .then((t) => {
        if (!cancelled) setFetchTable(t)
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e))
      })
    return () => {
      cancelled = true
    }
  }, [])

  const refresh = useCallback(async () => {
    if (!fetchTable) return
    setLoading(true)
    setError(null)
    try {
      const [result, grid] = await Promise.all([
        buildForecast(zone, fetchTable),
        fetchCurrentWindGrid().catch((e: unknown) => {
          console.warn(e)
          return null
        }),
      ])
      setBundle(result)
      setWindGrid(grid)
      setSelectedDate((prev) => {
        if (prev && result.days.some((d) => d.date === prev)) return prev
        return result.days[0]?.date ?? null
      })
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }, [fetchTable, zone])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const selectedDay = bundle?.days.find((d) => d.date === selectedDate) ?? bundle?.days[0]

  const nowHour = useMemo(() => {
    if (!bundle || !selectedDay) return null
    const today = bundle.days[0]
    if (!today || selectedDay.date !== today.date) return null
    return today.hours[0] ?? null
  }, [bundle, selectedDay])

  return (
    <div className="mx-auto min-h-dvh max-w-lg px-4 pb-12 pt-[max(0.75rem,env(safe-area-inset-top))] sm:max-w-xl">
      {/* Compact brand header */}
      <header className="panel-hull rise-in mb-3 flex items-center justify-between gap-3 px-4 py-3">
        <div>
          <p className="font-script text-xl leading-none text-[var(--brass-bright)]">
            Kelowwwwna
          </p>
          <h1 className="font-display text-4xl leading-none tracking-[0.06em] text-[var(--deck)]">
            GLASS
          </h1>
          <p className="mt-0.5 text-sm font-medium text-[rgba(243,235,216,0.7)]">
            Okanagan ski conditions
          </p>
        </div>
        <button
          type="button"
          onClick={() => void refresh()}
          disabled={loading || !fetchTable}
          className="min-h-11 shrink-0 rounded-full border-2 border-[var(--brass)] bg-[rgba(243,235,216,0.08)] px-3.5 text-sm font-bold text-[var(--deck)] disabled:opacity-50"
        >
          {loading ? '…' : 'Refresh'}
        </button>
      </header>

      {/* Spot + compact controls — then GO/SKIP front and center */}
      <div className="mb-3 flex flex-wrap items-end gap-3">
        <div className="min-w-0 flex-1">
          <ZoneSelector zones={zones} selectedId={zoneId} onChange={setZoneId} />
        </div>
        <button
          type="button"
          onClick={() => setShowMap((v) => !v)}
          className="mb-0.5 min-h-11 shrink-0 rounded-xl border-2 border-[var(--line)] bg-[var(--card)] px-3 text-sm font-bold text-[var(--lake)]"
        >
          {showMap ? 'Hide map' : 'Map'}
        </button>
      </div>

      {showMap && (
        <div className="mb-3 overflow-hidden rounded-2xl border-2 border-[var(--line)]">
          <MapView
            zones={zones}
            selectedId={zoneId}
            onSelect={setZoneId}
            windGrid={windGrid}
          />
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="mb-3 rounded-2xl border-2 border-[var(--signal)] bg-[#fde8eb] px-4 py-3 text-lg font-bold text-[#8e0c20]"
        >
          {error}
        </div>
      )}

      {loading && !bundle && (
        <div className="panel p-8 text-center text-xl font-bold text-[var(--muted)]">
          Loading forecast…
        </div>
      )}

      {bundle && view === 'forecast' && selectedDay && (
        <div className="space-y-4">
          <HeroDecision day={selectedDay} nowHour={nowHour} />

          <div>
            <h2 className="font-display mb-2 text-3xl text-[var(--hull)]">Pick a day</h2>
            <DayStrip
              days={bundle.days}
              selectedDate={selectedDay.date}
              onSelect={setSelectedDate}
            />
          </div>

          <PeriodTiles day={selectedDay} />
          <HourStrip hours={selectedDay.hours} />

          <details
            className="panel p-4"
            open={showTech}
            onToggle={(e) => setShowTech((e.target as HTMLDetailsElement).open)}
          >
            <summary className="cursor-pointer text-lg font-bold text-[var(--hull)]">
              More details
            </summary>
            <p className="mt-3 text-base leading-relaxed text-[var(--muted)]">
              Score combines wind speed, wind direction (how far waves can build across the lake),
              gusts, and whitecaps. Higher is glassier.
            </p>
            <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
              Models: {bundle.modelsUsed.join(', ')}
              {bundle.ensembleModelsUsed.length > 0 &&
                ` · Ensembles: ${bundle.ensembleModelsUsed.join(', ')}`}
              <br />
              Updated {new Date(bundle.generatedAt).toLocaleString()}
            </p>
          </details>

          <WebcamGallery />

          {/* Recent = modeled “what just happened” for threshold tuning — tucked away */}
          <button
            type="button"
            onClick={() => setView('recent')}
            className="w-full text-center text-sm font-bold text-[var(--muted)] underline-offset-2 hover:underline"
          >
            Recent modeled mornings →
          </button>
        </div>
      )}

      {bundle && view === 'recent' && (
        <div className="space-y-4">
          <button
            type="button"
            onClick={() => setView('forecast')}
            className="text-base font-bold text-[var(--lake)] underline-offset-2 hover:underline"
          >
            ← Back to forecast
          </button>
          <p className="text-base text-[var(--muted)]">
            How the model scored the last couple of days — compare with mornings you actually skied.
          </p>
          <ActualsView pastHours={bundle.pastHours} />
          <WebcamGallery />
        </div>
      )}

      <footer className="mt-10 text-center">
        <hr className="brand-rule mb-4" />
        <p className="font-script text-2xl text-[var(--hull)]">See you on the glass</p>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Wind © Open-Meteo · Cams via COSA / Global / Castanet
        </p>
      </footer>
    </div>
  )
}
