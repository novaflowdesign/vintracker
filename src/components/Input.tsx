import { forwardRef } from 'react'
import clsx from 'clsx'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
  suffix?: string
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, suffix, className, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')
    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label htmlFor={inputId} className="text-sm font-medium text-gray-700 dark:text-slate-300">
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          <input
            ref={ref}
            id={inputId}
            className={clsx(
              'w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition',
              'focus:ring-2 focus:ring-emerald-500 focus:border-transparent',
              error ? 'border-rose-400 bg-rose-50' : 'border-gray-300 bg-white dark:border-slate-600 dark:bg-slate-700 dark:text-white',
              suffix && 'pr-10',
              className,
            )}
            {...props}
          />
          {suffix && (
            <span className="pointer-events-none absolute right-3 text-sm text-gray-400 dark:text-slate-500">
              {suffix}
            </span>
          )}
        </div>
        {hint && !error && <p className="text-xs text-slate-400 dark:text-slate-500">{hint}</p>}
        {error && <p className="text-xs text-rose-600">{error}</p>}
      </div>
    )
  },
)

Input.displayName = 'Input'
export default Input
