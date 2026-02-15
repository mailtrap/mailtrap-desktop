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

// MTUI dark mode color tokens
const BLUE_400 = '#4C83EE'
const GREEN_300 = '#22D172'
const NAVY_300 = '#2A394B'
const NAVY_100 = '#687A91'
const NAVY_800 = '#101A26'

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
            <stop offset="0%" stopColor={BLUE_400} stopOpacity={0.25} />
            <stop offset="100%" stopColor={BLUE_400} stopOpacity={0} />
          </linearGradient>
          <linearGradient id="deliveredGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={GREEN_300} stopOpacity={0.25} />
            <stop offset="100%" stopColor={GREEN_300} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={NAVY_300} vertical={false} />
        <XAxis
          dataKey="dateLabel"
          tick={{ fontSize: 12, fill: NAVY_100 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 12, fill: NAVY_100 }}
          axisLine={false}
          tickLine={false}
          width={40}
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
        />
        <Area
          type="monotone"
          dataKey="total"
          stroke={BLUE_400}
          strokeWidth={2}
          fill="url(#totalGrad)"
          name="Total Sent"
        />
        <Area
          type="monotone"
          dataKey="delivered"
          stroke={GREEN_300}
          strokeWidth={2}
          fill="url(#deliveredGrad)"
          name="Delivered"
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
