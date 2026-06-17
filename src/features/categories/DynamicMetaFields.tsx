import { useState } from 'react'
import type { CategoryField } from '../../types/category'

interface Props {
  fields: CategoryField[]
  values: Record<string, string>
  onChange: (key: string, value: string) => void
}

const selectCls =
  'w-full rounded-xl border border-gray-300 dark:border-slate-600 px-3 py-2 text-sm bg-white dark:bg-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition'
const inputCls =
  'w-full rounded-xl border border-gray-300 dark:border-slate-600 px-3 py-2 text-sm bg-white dark:bg-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition'

function NumberStepper({
  field,
  value,
  onChange,
}: {
  field: CategoryField
  value: string
  onChange: (v: string) => void
}) {
  const step = field.step ?? 1
  const min  = field.min  ?? -Infinity
  const max  = field.max  ??  Infinity
  const num  = value !== '' ? parseFloat(value) : (field.max ?? 10)

  function step_(delta: number) {
    const next = Math.round((num + delta) / step) * step
    if (next < min || next > max) return
    onChange(String(next))
  }

  return (
    <div>
      <p className="text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">{field.label}</p>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => step_(-step)}
          disabled={num <= min}
          className="w-10 h-10 rounded-xl bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 text-lg font-bold text-gray-700 dark:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          −
        </button>
        <span className="w-12 text-center text-xl font-bold text-gray-900 dark:text-white tabular-nums">
          {num % 1 === 0 ? num.toFixed(0) : num.toFixed(1)}
        </span>
        <button
          type="button"
          onClick={() => step_(+step)}
          disabled={num >= max}
          className="w-10 h-10 rounded-xl bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 text-lg font-bold text-gray-700 dark:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          +
        </button>
      </div>
    </div>
  )
}

export default function DynamicMetaFields({ fields, values, onChange }: Props) {
  if (!fields.length) return null

  return (
    <div className="space-y-3 p-3 bg-blue-50 dark:bg-blue-900/10 rounded-xl border border-blue-200 dark:border-blue-800">
      <p className="text-xs font-semibold text-blue-700 dark:text-blue-400 uppercase tracking-wide">
        Dodatkowe pola
      </p>
      <div className={fields.length > 1 ? 'grid grid-cols-2 gap-3' : ''}>
        {fields.map(field => {
          const value = values[field.key] ?? ''

          if (field.type === 'select' && field.options) {
            return (
              <div key={field.id}>
                <label className="text-sm font-medium text-gray-700 dark:text-slate-300 block mb-1.5">
                  {field.label}
                </label>
                <select
                  className={selectCls}
                  value={value}
                  onChange={e => onChange(field.key, e.target.value)}
                >
                  <option value="">— wybierz —</option>
                  {field.options.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            )
          }

          if (field.type === 'number') {
            const hasStep = field.step != null
            if (hasStep) {
              return (
                <NumberStepper
                  key={field.id}
                  field={field}
                  value={value}
                  onChange={v => onChange(field.key, v)}
                />
              )
            }
            return (
              <div key={field.id}>
                <label className="text-sm font-medium text-gray-700 dark:text-slate-300 block mb-1.5">
                  {field.label}
                </label>
                <input
                  type="number"
                  className={inputCls}
                  value={value}
                  min={field.min ?? undefined}
                  max={field.max ?? undefined}
                  onChange={e => onChange(field.key, e.target.value)}
                />
              </div>
            )
          }

          return (
            <div key={field.id}>
              <label className="text-sm font-medium text-gray-700 dark:text-slate-300 block mb-1.5">
                {field.label}
              </label>
              <input
                type="text"
                className={inputCls}
                value={value}
                onChange={e => onChange(field.key, e.target.value)}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── hook: initialise metadata from item.metadata for the form ─────────────────

export function useMetadataState(initial: Record<string, string> = {}) {
  const [metadata, setMetadata] = useState<Record<string, string>>(initial)
  function setField(key: string, value: string) {
    setMetadata(prev => ({ ...prev, [key]: value }))
  }
  function reset(next: Record<string, string>) {
    setMetadata(next)
  }
  function collect(): Record<string, string> | null {
    const out: Record<string, string> = {}
    for (const [k, v] of Object.entries(metadata)) {
      if (v) out[k] = v
    }
    return Object.keys(out).length ? out : null
  }
  return { metadata, setField, reset, collect }
}
