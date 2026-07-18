import { useState } from 'react'
import { goDecision, plainScoreLabel } from '../lib/decision'
import type { HourlyRating } from '../lib/forecast'
import {
  formatDir,
  formatFetch,
  formatHour,
  formatHs,
  formatKn,
  formatPct,
  formatScore,
} from '../lib/format'
import { scoreColor } from '../lib/rating'

type Props = {
  hours: HourlyRating[]
}

function barColor(score: number): string {
  if (score >= 80) return '#1f6b4a'
  if (score >= 70) return '#3d6b7a'
  if (score >= 50) return '#c4892a'
  if (score >= 30) return '#b45309'
  return '#c8102e'
}

export function HourStrip({ hours }: Props) {
  const daytime = hours.filter((h) => h.localHour >= 5 && h.localHour <= 20)
  const list = daytime.length > 0 ? daytime : hours
  const [selected, setSelected] = useState<string | null>(null)
  const active = list.find((h) => h.time === selected) ?? list[0] ?? null

  if (list.length === 0) {
    return (
      <div className="panel p-5 text-lg text-[var(--muted)]">No hourly times for this day.</div>
    )
  }

  return (
    <section className="panel p-4">
      <h3 className="font-display text-4xl text-[var(--hull)]">Hour by hour</h3>
      <p className="mt-1 text-lg text-[var(--muted)]">Tap a time for details</p>

      <div className="scrollbar-none mt-4 flex gap-2 overflow-x-auto pb-1">
        {list.map((h) => {
          const on = h.time === active?.time
          return (
            <button
              key={h.time}
              type="button"
              onClick={() => setSelected(h.time)}
              className={`flex w-[4.4rem] shrink-0 flex-col items-center rounded-xl border-2 px-1 py-2 ${
                on
                  ? 'border-[var(--hull)] bg-[var(--deck-deep)]'
                  : 'border-transparent bg-[var(--deck)]'
              }`}
            >
              <span className="text-sm font-bold text-[var(--muted)]">{formatHour(h.time)}</span>
              <span
                className="mt-1 h-16 w-9 rounded-full border border-[var(--line)]"
                style={{
                  background: `linear-gradient(to top, ${barColor(h.meanScore)} ${h.meanScore}%, #e8dcc4 ${h.meanScore}%)`,
                }}
                aria-hidden
              />
              <span
                className="font-display mt-1 text-3xl leading-none"
                style={{ color: scoreColor(h.meanScore) }}
              >
                {formatScore(h.meanScore)}
              </span>
            </button>
          )
        })}
      </div>

      {active && (
        <div className="mt-4 rounded-2xl border border-[var(--line)] bg-[var(--deck)] p-4 text-[var(--ink)]">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <span className="font-display text-4xl text-[var(--hull)]">
              {formatHour(active.time)}
            </span>
            <span
              className="text-2xl font-extrabold"
              style={{ color: scoreColor(active.meanScore) }}
            >
              {formatScore(active.meanScore)} · {plainScoreLabel(active.meanScore)}
            </span>
          </div>
          <dl className="mt-3 grid grid-cols-2 gap-3 text-lg sm:grid-cols-4">
            <div>
              <dt className="text-sm font-bold uppercase tracking-wide text-[var(--muted)]">
                Wind
              </dt>
              <dd className="font-bold">
                {formatKn(active.windKn)}
                <span className="block text-base font-semibold">{formatDir(active.windDir)}</span>
              </dd>
            </div>
            <div>
              <dt className="text-sm font-bold uppercase tracking-wide text-[var(--muted)]">
                Waves
              </dt>
              <dd className="font-bold">{formatHs(active.hsM)}</dd>
            </div>
            <div>
              <dt className="text-sm font-bold uppercase tracking-wide text-[var(--muted)]">
                Fetch
              </dt>
              <dd className="font-bold">{formatFetch(active.fetchM)}</dd>
            </div>
            <div>
              <dt className="text-sm font-bold uppercase tracking-wide text-[var(--muted)]">
                Glassy odds
              </dt>
              <dd className="font-bold">{formatPct(active.pGlassy)}</dd>
            </div>
          </dl>
          <p className="mt-2 text-base font-bold text-[var(--hull)]">
            {goDecision(active.meanScore, active.confidence, active.pGlassy).toUpperCase()}
          </p>
        </div>
      )}
    </section>
  )
}
