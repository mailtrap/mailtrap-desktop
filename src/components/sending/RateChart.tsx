import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine
} from 'recharts'

interface DataPoint {
  dateLabel: string
  value: number
}

interface RateChartProps {
  title: string
  data: DataPoint[]
  color: string
  /** Optional threshold line (e.g. 5% for bounce rate) */
  threshold?: number
  thresholdLabel?: string
  /** Link label and URL shown bottom-right */
  linkLabel: string
  linkUrl: string
  /** Whether the metric is in a critical state */
  isCritical?: boolean
}

const NAVY_300 = '#2A394B'
const NAVY_100 = '#687A91'
const NAVY_800 = '#101A26'
const RED_300 = '#FB5151'

export default function RateChart({
  title,
  data,
  color,
  threshold,
  thresholdLabel,
  linkLabel,
  linkUrl,
  isCritical = false
}: RateChartProps) {
  const maxValue = Math.max(...data.map((d) => d.value), threshold ?? 0)
  const yMax = Math.ceil(maxValue / 10) * 10 || 10

  return (
    <div
      className={`rounded-mtui border p-4 ${
        isCritical ? 'border-red-300/50 bg-red-300/5' : 'border-navy-300 bg-navy-600'
      }`}
    >
      {/* Header */}
      <div className="mb-3 flex items-center gap-2">
        <h3 className="text-item-label text-[#FBFCFC]">{title}</h3>
        {isCritical && (
          <span className="inline-flex items-center gap-1 rounded-full bg-red-300/15 px-2 py-0.5 text-[11px] font-medium text-red-300">
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
            </svg>
            critical
          </span>
        )}
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={160}>
        <LineChart data={data} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={NAVY_300} vertical={false} />
          <XAxis
            dataKey="dateLabel"
            tick={{ fontSize: 11, fill: NAVY_100 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: NAVY_100 }}
            axisLine={false}
            tickLine={false}
            width={40}
            domain={[0, yMax]}
            tickFormatter={(v: number) => `${v}%`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: NAVY_800,
              border: `1px solid ${NAVY_300}`,
              borderRadius: '7px',
              fontSize: '12px',
              color: '#FBFCFC',
              boxShadow: '0 4px 8px rgba(0, 0, 0, 0.30)'
            }}
            formatter={(value: number) => [`${value.toFixed(2)}%`, '']}
            labelStyle={{ color: NAVY_100 }}
          />
          {threshold !== undefined && (
            <ReferenceLine
              y={threshold}
              stroke={RED_300}
              strokeDasharray="6 4"
              strokeWidth={1}
              label={{
                value: thresholdLabel || `threshold ${threshold}%`,
                position: 'right',
                fill: RED_300,
                fontSize: 10
              }}
            />
          )}
          <Line
            type="monotone"
            dataKey="value"
            stroke={isCritical ? RED_300 : color}
            strokeWidth={2}
            dot={{ r: 3, fill: isCritical ? RED_300 : color, strokeWidth: 0 }}
            activeDot={{ r: 5, fill: isCritical ? RED_300 : color, strokeWidth: 0 }}
          />
        </LineChart>
      </ResponsiveContainer>

      {/* Footer link */}
      <div className="mt-2 flex justify-end">
        <a
          href={linkUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-body-s text-blue-400 hover:text-blue-300"
        >
          {linkLabel}
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
          </svg>
        </a>
      </div>
    </div>
  )
}
