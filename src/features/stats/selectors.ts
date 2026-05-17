import type { Item } from '../../types/item'
import { getCurrentQuarter } from '../../lib/legal'

type DateRange = { from: Date; to: Date }

function inRange(dateStr: string | null, r: DateRange): boolean {
  if (!dateStr) return false
  const d = new Date(dateStr)
  return d >= r.from && d <= r.to
}

function profit(item: Item): number {
  return (
    Number(item.sale_price) -
    Number(item.shipping_cost_paid_by_seller) -
    Number(item.purchase_price)
  )
}

function daysOnShelf(item: Item): number {
  const end = item.sale_date ? new Date(item.sale_date) : new Date()
  return Math.floor((end.getTime() - new Date(item.purchase_date).getTime()) / 86_400_000)
}

// ── revenue / profit / margin ────────────────────────────────────────────────

export function totalRevenue(items: Item[], dateRange?: DateRange): number {
  return items
    .filter(i => i.status === 'SOLD' && (!dateRange || inRange(i.sale_date, dateRange)))
    .reduce((s, i) => s + Number(i.sale_price), 0)
}

export function totalProfit(items: Item[], dateRange?: DateRange): number {
  return items
    .filter(i => i.status === 'SOLD' && (!dateRange || inRange(i.sale_date, dateRange)))
    .reduce((s, i) => s + profit(i), 0)
}

export function averageMargin(items: Item[], dateRange?: DateRange): number {
  const sold = items.filter(
    i => i.status === 'SOLD' && (!dateRange || inRange(i.sale_date, dateRange)),
  )
  const rev = sold.reduce((s, i) => s + Number(i.sale_price), 0)
  const pro = sold.reduce((s, i) => s + profit(i), 0)
  return rev > 0 ? (pro / rev) * 100 : 0
}

// ── MTD ──────────────────────────────────────────────────────────────────────

function mtdRange(): DateRange {
  const now = new Date()
  return { from: new Date(now.getFullYear(), now.getMonth(), 1), to: now }
}

export function mtdRevenue(items: Item[]): number {
  return totalRevenue(items, mtdRange())
}

export function mtdProfit(items: Item[]): number {
  return totalProfit(items, mtdRange())
}

// ── current quarter ──────────────────────────────────────────────────────────

export function currentQuarterRevenue(items: Item[]): number {
  const { from, to } = getCurrentQuarter()
  return totalRevenue(items, { from, to })
}

// ── inventory ────────────────────────────────────────────────────────────────

export function inventoryCount(items: Item[]): number {
  return items.filter(i => i.status === 'IN_STOCK').length
}

export function inventoryValue(items: Item[]): number {
  return items
    .filter(i => i.status === 'IN_STOCK')
    .reduce((s, i) => s + Number(i.purchase_price), 0)
}

export function averageDaysOnShelf(items: Item[], lastNDays = 90): number {
  const cutoff = new Date(Date.now() - lastNDays * 86_400_000)
  const sold = items.filter(
    i => i.status === 'SOLD' && i.sale_date && new Date(i.sale_date) >= cutoff,
  )
  if (!sold.length) return 0
  return Math.round(sold.reduce((s, i) => s + daysOnShelf(i), 0) / sold.length)
}

// ── aggregated series ────────────────────────────────────────────────────────

export function profitByCategory(
  items: Item[],
  dateRange?: DateRange,
): { category: string; value: number }[] {
  const sold = items.filter(
    i => i.status === 'SOLD' && (!dateRange || inRange(i.sale_date, dateRange)),
  )
  const map = new Map<string, number>()
  for (const i of sold) {
    const cat = i.category ?? 'Inne'
    map.set(cat, (map.get(cat) ?? 0) + profit(i))
  }
  return [...map.entries()]
    .map(([category, value]) => ({ category, value }))
    .sort((a, b) => b.value - a.value)
}

export function inventoryByCategory(
  items: Item[],
): { category: string; count: number }[] {
  const map = new Map<string, number>()
  for (const i of items.filter(i => i.status === 'IN_STOCK')) {
    const cat = i.category ?? 'Inne'
    map.set(cat, (map.get(cat) ?? 0) + 1)
  }
  return [...map.entries()]
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count)
}

export function cumulativeQuarterSeries(
  items: Item[],
): { date: string; cumulative: number; daily: number }[] {
  const { from, to } = getCurrentQuarter()
  const today = new Date()
  const end = today < to ? today : to

  const dailyMap = new Map<string, number>()
  for (const i of items) {
    if (i.status !== 'SOLD' || !i.sale_date) continue
    const d = new Date(i.sale_date)
    if (d < from || d > end) continue
    const key = i.sale_date.slice(0, 10)
    dailyMap.set(key, (dailyMap.get(key) ?? 0) + Number(i.sale_price))
  }

  const result: { date: string; cumulative: number; daily: number }[] = []
  let cumulative = 0
  const cur = new Date(from)
  while (cur <= end) {
    const key = cur.toISOString().slice(0, 10)
    const daily = dailyMap.get(key) ?? 0
    cumulative += daily
    result.push({ date: key, cumulative, daily })
    cur.setDate(cur.getDate() + 1)
  }
  return result
}

// ── top lists ────────────────────────────────────────────────────────────────

export function topProfitableSales(items: Item[], n = 5): Item[] {
  return items
    .filter(i => i.status === 'SOLD')
    .sort((a, b) => profit(b) - profit(a))
    .slice(0, n)
}

export function topShelfWarmers(items: Item[], n = 5): Item[] {
  return items
    .filter(i => i.status === 'IN_STOCK')
    .sort((a, b) => daysOnShelf(b) - daysOnShelf(a))
    .slice(0, n)
}

export { profit as itemProfit }
