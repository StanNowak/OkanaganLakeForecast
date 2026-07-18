import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { ylwStation } from '../config'
import { plainScoreLabel } from '../lib/decision'
import type { HourlyRating } from '../lib/forecast'
import { formatHour, formatKn, formatScore } from '../lib/format'
import { scoreColor } from '../lib/rating'

type Props = {
  pastHours: HourlyRating[]
}

export function ActualsView({ pastHours }: Props) {
  const chartSource = pastHours.slice(-36)
  const data = chartSource.map((h) => ({
    label: `${h.date.slice(5)} ${formatHour(h.time)}`,
    score: h.meanScore,
    windKn: h.windKn,
  }))

  const mornings = chartSource
    .filter((h) => h.localHour >= 6 && h.localHour <= 10)
    .slice(-6)

  return (
    <div className="space-y-4">
      <section className="panel p-4">
        <h2 className="font-display text-4xl text-[var(--hull)]">Recent mornings</h2>
        <p className="mt-1 text-lg text-[var(--muted)]">
          How the model scored the last couple of days — compare with what you saw on the lake.
        </p>

        {mornings.length === 0 ? (
          <p className="mt-4 text-lg text-[var(--muted)]">No recent morning data yet.</p>
        ) : (
          <ul className="mt-4 space-y-2">
            {mornings.map((h) => (
              <li
                key={h.time}
                className="flex items-center justify-between rounded-xl border border-[var(--line)] bg-[var(--deck)] px-4 py-3"
              >
                <span className="text-lg font-bold text-[var(--ink)]">
                  {h.date.slice(5)} · {formatHour(h.time)}
                </span>
                <span className="text-right">
                  <span
                    className="font-display block text-4xl leading-none"
                    style={{ color: scoreColor(h.meanScore) }}
                  >
                    {formatScore(h.meanScore)}
                  </span>
                  <span className="text-base font-semibold text-[var(--muted)]">
                    {plainScoreLabel(h.meanScore)} · {formatKn(h.windKn)}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {data.length > 0 && (
        <section className="panel p-4">
          <h3 className="font-display text-3xl text-[var(--hull)]">Last 36 hours</h3>
          <div className="mt-3 h-52 w-full">
            <ResponsiveContainer>
              <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="#d4c7ad" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: '#5c6b7a', fontSize: 12 }} minTickGap={40} />
                <YAxis domain={[0, 100]} tick={{ fill: '#5c6b7a', fontSize: 13 }} width={36} />
                <Tooltip
                  contentStyle={{
                    background: '#fffaf0',
                    border: '2px solid #d4c7ad',
                    borderRadius: 12,
                    fontSize: 15,
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="score"
                  name="Ski score"
                  stroke="#0b1d33"
                  strokeWidth={3}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Nearby airport check: {ylwStation.name} (not mid-lake).
          </p>
        </section>
      )}
    </div>
  )
}
