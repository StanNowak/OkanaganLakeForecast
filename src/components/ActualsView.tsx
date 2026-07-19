import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { formatDir, formatHour, formatKn, formatScore } from '../lib/format'
import { plainScoreLabel } from '../lib/decision'
import type { HourlyRating } from '../lib/forecast'
import type { AirportActuals } from '../lib/ylwActuals'
import { scoreColor } from '../lib/rating'

type Props = {
  pastHours: HourlyRating[]
  airport: AirportActuals | null
  airportError: string | null
}

function hourKey(isoLocal: string): string {
  // Open-Meteo: 2026-07-19T15:00  |  IEM: 2026-07-19T15:00
  return isoLocal.slice(0, 16)
}

export function ActualsView({ pastHours, airport, airportError }: Props) {
  const chartSource = pastHours.slice(-36)
  const airportByTime = new Map(
    (airport?.observations ?? []).map((o) => [hourKey(o.time), o]),
  )

  const data = chartSource.map((h) => {
    const key = hourKey(h.time)
    const a = airportByTime.get(key)
    return {
      label: `${h.date.slice(5)} ${formatHour(h.time)}`,
      score: h.meanScore,
      modelKn: h.windKn,
      ylwKn: a?.windKn ?? null,
    }
  })

  const mornings = chartSource
    .filter((h) => h.localHour >= 6 && h.localHour <= 10)
    .slice(-6)

  const latest = airport?.observations[airport.observations.length - 1] ?? null

  return (
    <div className="space-y-4">
      <section className="panel p-4">
        <h2 className="font-display text-4xl text-[var(--hull)]">Airport actuals</h2>
        <p className="mt-1 text-lg text-[var(--muted)]">
          Real METAR winds from Kelowna Airport (CYLW) — inland / runway, not mid-lake.
        </p>

        {airportError && (
          <p className="mt-3 text-base font-semibold text-[var(--signal)]">{airportError}</p>
        )}

        {latest && (
          <div className="mt-4 rounded-xl border-2 border-[var(--line)] bg-[var(--deck)] px-4 py-3">
            <p className="text-sm font-bold uppercase tracking-wide text-[var(--muted)]">
              Latest observation · {latest.date.slice(5)} {formatHour(latest.time)}
            </p>
            <p className="font-display mt-1 text-5xl leading-none text-[var(--hull)]">
              {formatKn(latest.windKn)}
            </p>
            <p className="mt-1 text-lg font-semibold text-[var(--ink)]">
              {latest.windDirDeg != null ? formatDir(latest.windDirDeg) : 'direction variable'}
              {latest.gustKn != null ? ` · gusts ${formatKn(latest.gustKn)}` : ''}
              {latest.tempC != null ? ` · ${Math.round(latest.tempC)}°C` : ''}
            </p>
          </div>
        )}
      </section>

      <section className="panel p-4">
        <h2 className="font-display text-4xl text-[var(--hull)]">Recent mornings</h2>
        <p className="mt-1 text-lg text-[var(--muted)]">
          Model ski score at your spot, with airport wind for the same hour.
        </p>

        {mornings.length === 0 ? (
          <p className="mt-4 text-lg text-[var(--muted)]">No recent morning data yet.</p>
        ) : (
          <ul className="mt-4 space-y-2">
            {mornings.map((h) => {
              const a = airportByTime.get(hourKey(h.time))
              return (
                <li
                  key={h.time}
                  className="flex items-center justify-between gap-3 rounded-xl border border-[var(--line)] bg-[var(--deck)] px-4 py-3"
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
                      {plainScoreLabel(h.meanScore)} · model {formatKn(h.windKn)}
                      {a != null ? ` · YLW ${formatKn(a.windKn)}` : ''}
                    </span>
                  </span>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      {data.length > 0 && (
        <section className="panel p-4">
          <h3 className="font-display text-3xl text-[var(--hull)]">Last 36 hours — wind</h3>
          <p className="mt-1 text-base text-[var(--muted)]">
            Model wind at ski spot vs observed airport wind (knots).
          </p>
          <div className="mt-3 h-56 w-full">
            <ResponsiveContainer>
              <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="#d4c7ad" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: '#5c6b7a', fontSize: 12 }} minTickGap={40} />
                <YAxis
                  domain={[0, 'auto']}
                  tick={{ fill: '#5c6b7a', fontSize: 13 }}
                  width={36}
                  unit=" kn"
                />
                <Tooltip
                  contentStyle={{
                    background: '#fffaf0',
                    border: '2px solid #d4c7ad',
                    borderRadius: 12,
                    fontSize: 15,
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="modelKn"
                  name="Model (spot)"
                  stroke="#0b1d33"
                  strokeWidth={3}
                  dot={false}
                  connectNulls
                />
                <Line
                  type="monotone"
                  dataKey="ylwKn"
                  name="YLW airport"
                  stroke="#b08d57"
                  strokeWidth={3}
                  dot={false}
                  connectNulls
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}
    </div>
  )
}
