const plCurrency = new Intl.NumberFormat('pl-PL', {
  style: 'currency',
  currency: 'PLN',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const plDate = new Intl.DateTimeFormat('pl-PL', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})

export function formatCurrency(amount: number): string {
  return plCurrency.format(amount)
}

export function formatDate(date: string | Date): string {
  return plDate.format(new Date(date))
}

export function daysSince(date: string | Date): number {
  const ms = Date.now() - new Date(date).getTime()
  return Math.floor(ms / 86_400_000) + 1
}

export function formatPercent(value: number): string {
  return `${value.toFixed(1).replace('.', ',')}%`
}
