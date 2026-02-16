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

/* MTUI coreColors — used for chart elements that need raw hex */
const COLORS = {
  borderSubtle: '#2a394b',   // grey.dark — border.subtle (dark)
  fgSecondary: '#687a91',    // grey.muted — foreground.secondary (dark)
  bgStrong: '#101a26',       // navy.void — background.strong (dark)
  fgPrimary: '#fbfcfc',      // navy.air — foreground.primary (dark)
  danger: '#fb5151',         // red.medium — foreground.danger (dark)
  fgAccent: '#4c83ee'        // blue.neutral — foreground.accent (dark)
} as const

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
    <div>
      <div
        className={`rounded-mtui border p-4 ${
          isCritical ? 'border-red-shade bg-red-solid' : 'border-grey-shade bg-grey-bold'
        }`}
      >
        {/* Header */}
        <div className="mb-3 flex items-center gap-2">
          <h3 className="text-item-label text-navy-air">{title}</h3>
          {isCritical && (
            <span className="inline-flex items-center gap-1 rounded-full bg-red-medium/15 px-2 py-0.5 text-[11px] font-medium text-red-medium">
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
            <CartesianGrid strokeDasharray="3 3" stroke={COLORS.borderSubtle} vertical={false} />
            <XAxis
              dataKey="dateLabel"
              tick={{ fontSize: 11, fill: COLORS.fgSecondary }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: COLORS.fgSecondary }}
              axisLine={false}
              tickLine={false}
              width={40}
              domain={[0, yMax]}
              tickFormatter={(v: number) => `${v}%`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: COLORS.bgStrong,
                border: `1px solid ${COLORS.borderSubtle}`,
                borderRadius: '7px',
                fontSize: '12px',
                color: COLORS.fgPrimary,
                boxShadow: '0 4px 8px rgba(0, 0, 0, 0.30)'
              }}
              formatter={(value: number) => [`${value.toFixed(2)}%`, '']}
              labelStyle={{ color: COLORS.fgSecondary }}
            />
            {threshold !== undefined && (
              <ReferenceLine
                y={threshold}
                stroke={COLORS.danger}
                strokeDasharray="6 4"
                strokeWidth={1}
                label={{
                  value: thresholdLabel || `threshold ${threshold}%`,
                  position: 'right',
                  fill: COLORS.danger,
                  fontSize: 10
                }}
              />
            )}
            <Line
              type="monotone"
              dataKey="value"
              stroke={isCritical ? COLORS.danger : color}
              strokeWidth={2}
              dot={{ r: 3, fill: isCritical ? COLORS.danger : color, strokeWidth: 0 }}
              activeDot={{ r: 5, fill: isCritical ? COLORS.danger : color, strokeWidth: 0 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Footer link — outside the bordered panel */}
      <div className="flex justify-end px-1 py-2">
        <a
          href={linkUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-body-s text-blue-neutral hover:text-blue-medium"
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
