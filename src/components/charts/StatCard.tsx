import type { ReactNode } from 'react'
import clsx from 'clsx'

interface StatCardProps {
  label: string
  value: string
  sublabel?: string
  icon?: ReactNode
  valueClassName?: string
}

export default function StatCard({
  label,
  value,
  sublabel,
  icon,
  valueClassName,
}: StatCardProps) {
  return (
    <div className="bg-white rounded-2xl shadow-sm p-5">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm text-slate-500">{label}</p>
        {icon && <span className="text-slate-400 shrink-0">{icon}</span>}
      </div>
      <p className={clsx('text-2xl font-bold text-gray-900 mt-1 leading-tight', valueClassName)}>
        {value}
      </p>
      {sublabel && <p className="text-xs text-slate-400 mt-1">{sublabel}</p>}
    </div>
  )
}
