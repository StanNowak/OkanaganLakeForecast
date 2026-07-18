import { goDecision, plainScoreLabel } from '../lib/decision'
import type { DayForecast } from '../lib/forecast'
import { formatDayLabel, formatScore } from '../lib/format'
import { scoreColor } from '../lib/rating'

type Props = {
  days: DayForecast[]
  selectedDate: string | null
  onSelect: (date: string) => void
}

export function DayStrip({ days, selectedDate, onSelect }: Props) {
  return (
    <div
      className="scrollbar-none -mx-4 flex gap-2.5 overflow-x-auto px-4 pb-1"
      role="tablist"
      aria-label="Choose a day"
    >
      {days.map((day) => {
        const selected = day.date === selectedDate
        const decision = goDecision(day.dayScore, day.dayConfidence, day.dayPGlassy)
        const short =
          decision === 'go' ? 'GO' : decision === 'maybe' ? 'MAYBE' : 'SKIP'
        const label = formatDayLabel(day.date).replace(',', '')

        return (
          <button
            key={day.date}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onSelect(day.date)}
            className={`min-h-[6.5rem] min-w-[8.25rem] shrink-0 rounded-2xl border-2 px-3.5 py-3 text-left transition ${
              selected
                ? 'border-[var(--hull)] bg-[var(--hull)] text-[var(--deck)] shadow-md'
                : 'border-[var(--line)] bg-[var(--card)] text-[var(--ink)]'
            }`}
          >
            <div
              className={`text-base font-bold ${selected ? 'text-[var(--brass-bright)]' : 'text-[var(--muted)]'}`}
            >
              {label}
            </div>
            <div
              className="font-display mt-1 text-5xl leading-none"
              style={{ color: selected ? '#f3ebd8' : scoreColor(day.dayScore) }}
            >
              {formatScore(day.dayScore)}
            </div>
            <div
              className={`mt-1 text-base font-bold ${selected ? 'text-[var(--deck)]' : 'text-[var(--ink)]'}`}
            >
              {short}
              <span className="font-semibold opacity-80"> · {plainScoreLabel(day.dayScore)}</span>
            </div>
          </button>
        )
      })}
    </div>
  )
}
