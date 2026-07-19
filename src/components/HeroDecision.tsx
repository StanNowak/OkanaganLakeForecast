import {
  decisionCopy,
  goDecision,
  plainConfidence,
  type Decision,
} from '../lib/decision'
import type { BestWindow, DayForecast, HourlyRating } from '../lib/forecast'
import { formatDayLabel, formatDir, formatHour, formatKn } from '../lib/format'
import { skiThresholds } from '../config'

type Props = {
  day: DayForecast
  nowHour?: HourlyRating | null
  isToday?: boolean
}

function usableWindow(w: BestWindow): BestWindow {
  if (!w) return null
  const startHour = Number((w.start.split('T')[1] ?? '99').slice(0, 2))
  if (
    startHour < skiThresholds.skiWindowHours.start ||
    startHour > skiThresholds.skiWindowHours.end
  ) {
    return null
  }
  return w
}

function windowText(w: BestWindow): string {
  if (!w) return 'No clear calm window'
  return `${formatHour(w.start)} – ${formatHour(w.end)}`
}

export function HeroDecision({ day, nowHour, isToday = false }: Props) {
  const bestWindow = usableWindow(day.bestWindow)
  const periodScore = Number.isFinite(day.morning.bestScore)
    ? Math.max(
        day.morning.bestScore,
        Number.isFinite(day.afternoon.bestScore) ? day.afternoon.bestScore : 0,
      )
    : day.afternoon.bestScore

  // Right now → current hour. Otherwise prefer the daytime ski window, not overnight leftovers.
  const score =
    nowHour?.meanScore ?? bestWindow?.meanScore ?? periodScore ?? day.dayScore
  const confidence =
    nowHour?.confidence ?? bestWindow?.confidence ?? day.dayConfidence
  const pGlassy = nowHour?.pGlassy ?? day.dayPGlassy
  const decision: Decision = goDecision(score, confidence, pGlassy)
  const copy = decisionCopy(decision)
  const wind =
    nowHour ??
    day.hours.find(
      (h) => bestWindow && h.time >= bestWindow.start && h.time <= bestWindow.end,
    ) ??
    day.hours.find((h) => h.localHour >= skiThresholds.skiWindowHours.start) ??
    day.hours[0]

  const toneClass =
    copy.tone === 'go'
      ? 'decision-go text-white'
      : copy.tone === 'maybe'
        ? 'decision-maybe'
        : 'decision-skip text-white'

  const heading = nowHour ? 'Right now' : isToday ? 'Today' : formatDayLabel(day.date)

  return (
    <section
      className={`rise-in rounded-[1.4rem] p-5 shadow-lg ring-2 ring-[rgba(184,149,108,0.4)] sm:p-6 ${toneClass}`}
      aria-live="polite"
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-lg font-bold uppercase tracking-[0.18em] opacity-90">
          {heading}
        </p>
        <span className="font-script text-2xl opacity-90">glass check</span>
      </div>

      <h2 className="font-display mt-2 text-7xl leading-none sm:text-8xl">{copy.title}</h2>
      <p className="mt-2 text-2xl font-bold leading-snug sm:text-3xl">{copy.subtitle}</p>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl bg-black/15 px-4 py-3">
          <div className="text-sm font-bold uppercase tracking-[0.14em] opacity-80">
            Best time
          </div>
          <div className="font-display mt-1 text-4xl leading-none sm:text-5xl">
            {windowText(bestWindow)}
          </div>
        </div>
        <div className="rounded-2xl bg-black/15 px-4 py-3">
          <div className="text-sm font-bold uppercase tracking-[0.14em] opacity-80">Wind</div>
          <div className="mt-1 text-2xl font-extrabold leading-tight sm:text-3xl">
            {wind ? (
              <>
                {formatKn(wind.windKn)}
                <span className="mt-0.5 block text-xl font-bold opacity-90">
                  {formatDir(wind.windDir)}
                </span>
              </>
            ) : (
              '—'
            )}
          </div>
        </div>
      </div>

      <p className="mt-4 text-lg font-semibold opacity-95">
        {plainConfidence(confidence)}
        {Number.isFinite(pGlassy) ? ` · ${Math.round(pGlassy * 100)}% chance glassy` : ''}
      </p>
    </section>
  )
}
