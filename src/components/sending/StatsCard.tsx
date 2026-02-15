interface StatsCardProps {
  label: string
  count: number
  rate: number
  /** Whether the card represents a "bad" metric (bounce, spam) — shows red when elevated */
  isCritical?: boolean
  /** Threshold above which the metric is critical (e.g. 0.05 for 5% bounce rate) */
  criticalThreshold?: number
}

export default function StatsCard({
  label,
  count,
  rate,
  isCritical = false,
  criticalThreshold = 0
}: StatsCardProps) {
  const ratePercent = (rate * 100).toFixed(1)
  const isAboveThreshold = isCritical && criticalThreshold > 0 && rate > criticalThreshold

  return (
    <div
      className={`rounded-mtui border p-4 transition-colors ${
        isAboveThreshold
          ? 'border-red-300/50 bg-red-300/5'
          : 'border-navy-300 bg-navy-600'
      }`}
    >
      <div className="mb-1 flex items-center gap-1.5">
        <span className="text-body-s text-navy-100">{label}</span>
      </div>
      <div className="flex items-baseline gap-2">
        <span
          className={`text-2xl font-bold ${
            isAboveThreshold ? 'text-red-300' : 'text-[#FBFCFC]'
          }`}
        >
          {count.toLocaleString()}
        </span>
      </div>
      <div className="mt-0.5">
        <span
          className={`text-body-s ${
            isAboveThreshold ? 'text-red-300' : 'text-navy-100'
          }`}
        >
          {ratePercent}%
        </span>
      </div>
    </div>
  )
}
