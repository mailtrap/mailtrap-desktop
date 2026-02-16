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
      className={`rounded-mtui border p-4 transition-colors duration-mtui ease-mtui ${
        isAboveThreshold
          ? 'border-red-shade bg-red-solid'
          : 'border-grey-shade bg-grey-bold'
      }`}
    >
      <div className="mb-1 flex items-center gap-1.5">
        <span className="text-body-s text-grey-muted">{label}</span>
      </div>
      <div className="flex items-baseline gap-2">
        <span
          className={`text-card-number ${
            isAboveThreshold ? 'text-red-medium' : 'text-navy-air'
          }`}
        >
          {count.toLocaleString()}
        </span>
      </div>
      <div className="mt-0.5">
        <span
          className={`text-body-s ${
            isAboveThreshold ? 'text-red-medium' : 'text-grey-muted'
          }`}
        >
          {ratePercent}%
        </span>
      </div>
    </div>
  )
}
