import { useCallback, useEffect, useMemo, useState } from 'react'
import { defaultZoneId, zones } from './config'
import { ActualsView } from './components/ActualsView'
import { DayStrip } from './components/DayStrip'
import { HeroDecision } from './components/HeroDecision'
import { HourStrip } from './components/HourStrip'
import { MapView } from './components/MapView'
import { PeriodTiles } from './components/PeriodTiles'
import { ZoneSelector } from './components/ZoneSelector'
import { buildForecast, type ForecastBundle } from './lib/forecast'
import { loadFetchTable, type FetchTable } from './lib/fetchTable'

type Tab = 'today' | 'recent'

export default function App() {
  const [zoneId, setZoneId] = useState(defaultZoneId)
  const [fetchTable, setFetchTable] = useState<FetchTable | null>(null)
  const [bundle, setBundle] = useState<ForecastBundle | null>(null)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('today')
  const [showMap, setShowMap] = useState(false)
  const [showTech, setShowTech] = useState(false)

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
      const result = await buildForecast(zone, fetchTable)
      setBundle(result)
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
      {/* Brand-first masthead — Nautique / Kelowna retro */}
      <header className="panel-hull rise-in mb-4 overflow-hidden px-5 py-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-script text-3xl leading-none text-[var(--brass-bright)]">
              Kelowwwwna
            </p>
            <h1 className="font-display mt-1 text-6xl leading-none tracking-[0.06em] text-[var(--deck)] sm:text-7xl">
              GLASS
            </h1>
            <p className="mt-2 text-lg font-semibold text-[rgba(243,235,216,0.85)]">
              Okanagan ski conditions
            </p>
          </div>
          <button
            type="button"
            onClick={() => void refresh()}
            disabled={loading || !fetchTable}
            className="min-h-12 shrink-0 rounded-full border-2 border-[var(--brass)] bg-[rgba(243,235,216,0.08)] px-4 text-base font-bold text-[var(--deck)] disabled:opacity-50"
          >
            {loading ? '…' : 'Refresh'}
          </button>
        </div>
        <hr className="brand-rule mt-4" />
        <p className="mt-3 text-base font-medium text-[rgba(243,235,216,0.75)]">
          Big answer first. Take the boat out when it says GO.
        </p>
      </header>

      <nav
        className="panel mb-4 grid grid-cols-2 gap-1 p-1.5"
        aria-label="Main"
      >
        <button
          type="button"
          onClick={() => setTab('today')}
          className={`font-display min-h-14 rounded-xl text-2xl tracking-wide ${
            tab === 'today'
              ? 'bg-[var(--hull)] text-[var(--deck)]'
              : 'text-[var(--muted)]'
          }`}
        >
          Forecast
        </button>
        <button
          type="button"
          onClick={() => setTab('recent')}
          className={`font-display min-h-14 rounded-xl text-2xl tracking-wide ${
            tab === 'recent'
              ? 'bg-[var(--hull)] text-[var(--deck)]'
              : 'text-[var(--muted)]'
          }`}
        >
          Recent
        </button>
      </nav>

      <section className="mb-4">
        <h2 className="font-display mb-2 text-3xl text-[var(--hull)]">Where are you skiing?</h2>
        <ZoneSelector zones={zones} selectedId={zoneId} onChange={setZoneId} />
        <button
          type="button"
          onClick={() => setShowMap((v) => !v)}
          className="mt-2 min-h-12 w-full text-lg font-bold text-[var(--lake)] underline-offset-4 hover:underline"
        >
          {showMap ? 'Hide map' : 'Show map'}
        </button>
        {showMap && (
          <div className="mt-2 overflow-hidden rounded-2xl border-2 border-[var(--line)]">
            <MapView zones={zones} selectedId={zoneId} onSelect={setZoneId} />
          </div>
        )}
      </section>

      {error && (
        <div
          role="alert"
          className="mb-4 rounded-2xl border-2 border-[var(--signal)] bg-[#fde8eb] px-4 py-3 text-lg font-bold text-[#8e0c20]"
        >
          {error}
        </div>
      )}

      {loading && !bundle && (
        <div className="panel p-10 text-center text-2xl font-bold text-[var(--muted)]">
          Loading forecast…
        </div>
      )}

      {bundle && tab === 'today' && selectedDay && (
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
            <summary className="cursor-pointer text-xl font-bold text-[var(--hull)]">
              More details
            </summary>
            <p className="mt-3 text-lg leading-relaxed text-[var(--muted)]">
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
        </div>
      )}

      {bundle && tab === 'recent' && <ActualsView pastHours={bundle.pastHours} />}

      <footer className="mt-10 text-center">
        <hr className="brand-rule mb-4" />
        <p className="font-script text-2xl text-[var(--hull)]">See you on the glass</p>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Wind © Open-Meteo · Add to Home Screen for the app
        </p>
      </footer>
    </div>
  )
}
