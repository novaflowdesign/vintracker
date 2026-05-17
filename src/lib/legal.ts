export const QUARTERLY_LIMIT_PLN = 10_813.50
export const LIMIT_YEAR = 2026

export function getQuarter(date: Date | string): 1 | 2 | 3 | 4 {
  return (Math.floor(new Date(date).getMonth() / 3) + 1) as 1 | 2 | 3 | 4
}

export function getQuarterRange(
  year: number,
  q: 1 | 2 | 3 | 4,
): { from: Date; to: Date } {
  const startMonth = (q - 1) * 3
  return {
    from: new Date(year, startMonth, 1),
    to:   new Date(year, startMonth + 3, 0, 23, 59, 59, 999),
  }
}

export function getCurrentQuarter(): {
  year: number
  quarter: 1 | 2 | 3 | 4
  from: Date
  to: Date
} {
  const now = new Date()
  const year = now.getFullYear()
  const quarter = getQuarter(now)
  return { year, quarter, ...getQuarterRange(year, quarter) }
}

export function daysLeftInQuarter(): number {
  const { to } = getCurrentQuarter()
  return Math.max(0, Math.ceil((to.getTime() - Date.now()) / 86_400_000))
}

export function getQuarterLabel(year: number, q: 1 | 2 | 3 | 4): string {
  return `Q${q} ${year}`
}
