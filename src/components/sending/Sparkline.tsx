import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts'

interface DailyData {
  date: string
  delivered: number
  bounced: number
  opened: number
  clicked: number
}

interface SparklineProps {
  data: DailyData[]
}

/* MTUI coreColors — dark theme semantic mapping */
const BLUE_NEUTRAL = '#4c83ee'  // blue.neutral — foreground.accent (dark)
const GREEN_MEDIUM = '#22d172'  // green.medium — foreground.success (dark)
const GREY_DARK    = '#2a394b'  // grey.dark   — border.subtle (dark)
const GREY_MUTED   = '#687a91'  // grey.muted  — foreground.secondary (dark)
const NAVY_VOID    = '#101a26'  // navy.void   — background.strong (dark)

export default function Sparkline({ data }: SparklineProps) {
  const formatted = data.map((d) => ({
    ...d,
    dateLabel: new Date(d.date).toLocaleDateString([], {
      month: 'short',
      day: 'numeric'
    }),
    total: d.delivered + d.bounced
  }))

  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={formatted} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
        <defs>
          <linearGradient id="totalGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={BLUE_NEUTRAL} stopOpacity={0.25} />
            <stop offset="100%" stopColor={BLUE_NEUTRAL} stopOpacity={0} />
          </linearGradient>
          <linearGradient id="deliveredGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={GREEN_MEDIUM} stopOpacity={0.25} />
            <stop offset="100%" stopColor={GREEN_MEDIUM} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={GREY_DARK} vertical={false} />
        <XAxis
          dataKey="dateLabel"
          tick={{ fontSize: 12, fill: GREY_MUTED }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 12, fill: GREY_MUTED }}
          axisLine={false}
          tickLine={false}
          width={40}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: NAVY_VOID,
            border: `1px solid ${GREY_DARK}`,
            borderRadius: '7px',
            fontSize: '12px',
            color: '#fbfcfc', // navy.air — foreground.primary (dark)
            boxShadow: '0 4px 8px rgba(0, 0, 0, 0.30)'
          }}
        />
        <Area
          type="monotone"
          dataKey="total"
          stroke={BLUE_NEUTRAL}
          strokeWidth={2}
          fill="url(#totalGrad)"
          name="Total Sent"
        />
        <Area
          type="monotone"
          dataKey="delivered"
          stroke={GREEN_MEDIUM}
          strokeWidth={2}
          fill="url(#deliveredGrad)"
          name="Delivered"
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
