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

/** Icon + color for ski quality — not a fill bar (avoids “higher = more wind”). */
function QualityIcon({ score }: { score: number }) {
  const color = scoreColor(score)
  // Glassy: calm circle · Good: soft wave · Fair: chop · Rough: X
  if (score >= 80) {
    return (
      <svg width="36" height="36" viewBox="0 0 36 36" aria-hidden>
        <circle cx="18" cy="18" r="12" fill="none" stroke={color} strokeWidth="3" />
        <circle cx="18" cy="18" r="5" fill={color} />
      </svg>
    )
  }
  if (score >= 70) {
    return (
      <svg width="36" height="36" viewBox="0 0 36 36" aria-hidden>
        <path
          d="M4 20c4-6 8-6 12 0s8 6 12 0"
          fill="none"
          stroke={color}
          strokeWidth="3"
          strokeLinecap="round"
        />
        <path
          d="M4 26c4-5 8-5 12 0s8 5 12 0"
          fill="none"
          stroke={color}
          strokeWidth="2.5"
          strokeLinecap="round"
          opacity="0.55"
        />
      </svg>
    )
  }
  if (score >= 50) {
    return (
      <svg width="36" height="36" viewBox="0 0 36 36" aria-hidden>
        <path
          d="M4 16c3 5 6-5 9 0s6-5 9 0 6-5 9 0"
          fill="none"
          stroke={color}
          strokeWidth="3"
          strokeLinecap="round"
        />
        <path
          d="M4 24c3 5 6-5 9 0s6-5 9 0 6-5 9 0"
          fill="none"
          stroke={color}
          strokeWidth="2.5"
          strokeLinecap="round"
          opacity="0.6"
        />
      </svg>
    )
  }
  return (
    <svg width="36" height="36" viewBox="0 0 36 36" aria-hidden>
      <path
        d="M10 10 L26 26 M26 10 L10 26"
        fill="none"
        stroke={color}
        strokeWidth="3.5"
        strokeLinecap="round"
      />
    </svg>
  )
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
      <p className="mt-1 text-base text-[var(--muted)]">
        Tap a time · green glass · amber fair · red rough
      </p>

      <div className="scrollbar-none mt-4 flex gap-2 overflow-x-auto pb-1">
        {list.map((h) => {
          const on = h.time === active?.time
          return (
            <button
              key={h.time}
              type="button"
              onClick={() => setSelected(h.time)}
              className={`flex w-[4.6rem] shrink-0 flex-col items-center rounded-xl border-2 px-1 py-2.5 ${
                on
                  ? 'border-[var(--hull)] bg-[var(--deck-deep)]'
                  : 'border-transparent bg-[var(--deck)]'
              }`}
            >
              <span className="text-sm font-bold text-[var(--muted)]">{formatHour(h.time)}</span>
              <span className="mt-1.5 flex h-10 items-center justify-center">
                <QualityIcon score={h.meanScore} />
              </span>
              <span
                className="font-display mt-1 text-3xl leading-none"
                style={{ color: scoreColor(h.meanScore) }}
              >
                {formatScore(h.meanScore)}
              </span>
              <span
                className="mt-0.5 text-[11px] font-bold leading-tight"
                style={{ color: scoreColor(h.meanScore) }}
              >
                {plainScoreLabel(h.meanScore)}
              </span>
            </button>
          )
        })}
      </div>

      {active && (
        <div className="mt-4 rounded-2xl border border-[var(--line)] bg-[var(--deck)] p-4 text-[var(--ink)]">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <QualityIcon score={active.meanScore} />
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
