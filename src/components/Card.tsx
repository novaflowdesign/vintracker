import clsx from 'clsx'

interface CardProps {
  children: React.ReactNode
  className?: string
}

export default function Card({ children, className }: CardProps) {
  return (
    <div className={clsx('bg-white rounded-2xl shadow-sm p-6', className)}>
      {children}
    </div>
  )
}
