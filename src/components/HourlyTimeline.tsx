import {
  Area,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { HourlyRating } from '../lib/forecast'
import {
  formatDir,
  formatFetch,
  formatHour,
  formatHs,
  formatKn,
  formatPct,
  formatScore,
  windArrowRotation,
} from '../lib/format'
import { scoreColor, scoreLabel } from '../lib/rating'
import { ConfidenceBadge } from './ConfidenceBadge'

type Props = {
  hours: HourlyRating[]
}

type Row = {
  time: string
  label: string
  score: number
  windKn: number
  hsCm: number
  confidence: number
  pGlassy: number
  windDir: number
  fetchM: number
  gustKn: number
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: { payload: Row }[] }) {
  if (!active || !payload?.[0]) return null
  const d = payload[0].payload
  return (
    <div className="rounded-xl border border-white/15 bg-slate-950/95 px-3 py-2 text-xs shadow-xl">
      <div className="font-semibold text-slate-100">{d.label}</div>
      <div className="mt-1 space-y-0.5 text-slate-300">
        <div>
          Score <span style={{ color: scoreColor(d.score) }}>{formatScore(d.score)}</span>{' '}
          ({scoreLabel(d.score)})
        </div>
        <div>
          Wind {formatKn(d.windKn)} gust {formatKn(d.gustKn)} · {formatDir(d.windDir)}
        </div>
        <div>
          Hs {formatHs(d.hsCm / 100)} · fetch {formatFetch(d.fetchM)}
        </div>
        <div>
          Conf {formatPct(d.confidence)} · P(glass) {formatPct(d.pGlassy)}
        </div>
      </div>
    </div>
  )
}

export function HourlyTimeline({ hours }: Props) {
  const data: Row[] = hours.map((h) => ({
    time: h.time,
    label: formatHour(h.time),
    score: h.meanScore,
    windKn: h.windKn,
    hsCm: h.hsM * 100,
    confidence: h.confidence,
    pGlassy: h.pGlassy,
    windDir: h.windDir,
    fetchM: h.fetchM,
    gustKn: h.gustKn,
  }))

  if (data.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-sm text-slate-400">
        No hourly data for this day.
      </div>
    )
  }

  const best = hours.reduce((a, b) => (a.meanScore >= b.meanScore ? a : b))

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-slate-100">Hourly ski rating</h3>
          <p className="text-xs text-slate-400">
            Score from fetch-limited waves · wind · gusts · whitecaps
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-300">
          <span
            className="inline-block rotate-0"
            style={{ transform: `rotate(${windArrowRotation(best.windDir)}deg)` }}
            title={formatDir(best.windDir)}
          >
            ↑
          </span>
          Best hour {formatHour(best.time)} · {formatScore(best.meanScore)}
          <ConfidenceBadge confidence={best.confidence} pGlassy={best.pGlassy} compact />
        </div>
      </div>

      <div className="h-72 w-full">
        <ResponsiveContainer>
          <ComposedChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fill: '#94a3b8', fontSize: 11 }}
              interval="preserveStartEnd"
              minTickGap={24}
            />
            <YAxis
              yAxisId="score"
              domain={[0, 100]}
              tick={{ fill: '#94a3b8', fontSize: 11 }}
              width={32}
            />
            <YAxis
              yAxisId="wind"
              orientation="right"
              domain={[0, 'auto']}
              tick={{ fill: '#64748b', fontSize: 11 }}
              width={36}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: 12, color: '#94a3b8' }} />
            <Area
              yAxisId="score"
              type="monotone"
              dataKey="score"
              name="Ski score"
              fill="rgba(52,211,153,0.18)"
              stroke="#34d399"
              strokeWidth={2}
            />
            <Line
              yAxisId="wind"
              type="monotone"
              dataKey="windKn"
              name="Wind (kn)"
              stroke="#38bdf8"
              strokeWidth={1.5}
              dot={false}
            />
            <Line
              yAxisId="wind"
              type="monotone"
              dataKey="hsCm"
              name="Hs (cm)"
              stroke="#fbbf24"
              strokeWidth={1.5}
              dot={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-3 overflow-x-auto">
        <table className="min-w-full text-left text-xs">
          <thead className="text-slate-400">
            <tr>
              <th className="px-2 py-1 font-medium">Hour</th>
              <th className="px-2 py-1 font-medium">Score</th>
              <th className="px-2 py-1 font-medium">Wind</th>
              <th className="px-2 py-1 font-medium">Hs</th>
              <th className="px-2 py-1 font-medium">Fetch</th>
              <th className="px-2 py-1 font-medium">Conf / P(glass)</th>
            </tr>
          </thead>
          <tbody>
            {hours.map((h) => (
              <tr key={h.time} className="border-t border-white/5 text-slate-200">
                <td className="px-2 py-1.5">{formatHour(h.time)}</td>
                <td className="px-2 py-1.5 font-semibold" style={{ color: scoreColor(h.meanScore) }}>
                  {formatScore(h.meanScore)}
                </td>
                <td className="px-2 py-1.5">
                  {formatKn(h.windKn)} {formatDir(h.windDir)}
                </td>
                <td className="px-2 py-1.5">{formatHs(h.hsM)}</td>
                <td className="px-2 py-1.5">{formatFetch(h.fetchM)}</td>
                <td className="px-2 py-1.5">
                  <ConfidenceBadge confidence={h.confidence} pGlassy={h.pGlassy} compact />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
