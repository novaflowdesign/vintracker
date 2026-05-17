interface ProgressBarProps {
  percent: number
}

function barColor(pct: number): string {
  if (pct >= 90) return '#e11d48'  // rose-600
  if (pct >= 70) return '#f59e0b'  // amber-500
  return '#059669'                  // emerald-600
}

export default function ProgressBar({ percent }: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, percent))
  const color   = barColor(clamped)

  return (
    <div className="h-3 w-full rounded-full bg-gray-100 overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-700 ease-out"
        style={{ width: `${clamped}%`, backgroundColor: color }}
      />
    </div>
  )
}
