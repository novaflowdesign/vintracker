import { useState } from 'react'
import { createPortal } from 'react-dom'
import { Download, Package, X, Search, ChevronDown, Trash2 } from 'lucide-react'
import clsx from 'clsx'
import { toast } from 'sonner'
import { useItems, useAllSoldBundleChildren, usePhotoUrl, useDeleteItem } from '../features/items/queries'
import { itemProfit } from '../features/stats/selectors'
import { getCurrentQuarter, getQuarterRange } from '../lib/legal'
import { formatCurrency, formatDate } from '../utils/format'
import { useCategories } from '../features/categories/queries'
import type { Item } from '../types/item'

// ── types ─────────────────────────────────────────────────────────────────────

type RegularEntry = {
  type: 'regular'
  item: Item
}

type BundleEntry = {
  type: 'bundle'
  parent: Item
  soldInRange: Item[]
  totalSold: number
  totalSize: number
  revenue: number
  cost: number
  profit: number
  lastSaleDate: string
}

type SaleEntry = RegularEntry | BundleEntry

// ── CSV export ────────────────────────────────────────────────────────────────

function exportCsv(entries: SaleEntry[], from: string, to: string) {
  const BOM = '﻿'
  const sep = ';'
  const headers = [
    'Data sprzedaży', 'Tytuł', 'Kategoria', 'Marka', 'Rozmiar',
    'Cena zakupu', 'Data zakupu', 'Cena sprzedaży', 'Koszt wysyłki',
    'Zysk', 'Marża %',
  ].join(sep)

  const cell = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`

  const rows: string[] = []
  for (const entry of entries) {
    if (entry.type === 'regular') {
      const item = entry.item
      const profit = itemProfit(item)
      const margin = Number(item.sale_price) > 0 ? (profit / Number(item.sale_price)) * 100 : 0
      rows.push([
        cell(item.sale_date ?? ''), cell(item.title), cell(item.category ?? ''),
        cell(item.brand ?? ''), cell(item.size ?? ''),
        cell(Number(item.purchase_price).toFixed(2).replace('.', ',')),
        cell(item.purchase_date),
        cell(Number(item.sale_price).toFixed(2).replace('.', ',')),
        cell(Number(item.shipping_cost_paid_by_seller).toFixed(2).replace('.', ',')),
        cell(profit.toFixed(2).replace('.', ',')),
        cell(margin.toFixed(1).replace('.', ',')),
      ].join(sep))
    } else {
      for (const child of entry.soldInRange) {
        const profit = itemProfit(child)
        const margin = Number(child.sale_price) > 0 ? (profit / Number(child.sale_price)) * 100 : 0
        rows.push([
          cell(child.sale_date ?? ''), cell(`${entry.parent.title} — ${child.title}`),
          cell(entry.parent.category ?? ''), cell(''), cell(''),
          cell(Number(child.purchase_price).toFixed(2).replace('.', ',')),
          cell(child.purchase_date),
          cell(Number(child.sale_price).toFixed(2).replace('.', ',')),
          cell(Number(child.shipping_cost_paid_by_seller ?? 0).toFixed(2).replace('.', ',')),
          cell(profit.toFixed(2).replace('.', ',')),
          cell(margin.toFixed(1).replace('.', ',')),
        ].join(sep))
      }
    }
  }

  const csv = BOM + [headers, ...rows].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `vinted-sales-${from}-${to}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// ── quarter options ───────────────────────────────────────────────────────────

const QUARTER_OPTIONS = [
  { value: '',       label: 'Cały okres' },
  { value: '2026-1', label: 'Q1 2026' },
  { value: '2026-2', label: 'Q2 2026' },
  { value: '2026-3', label: 'Q3 2026' },
  { value: '2026-4', label: 'Q4 2026' },
]


// ── mini thumbnail ────────────────────────────────────────────────────────────

function MiniPhoto({ path }: { path: string | null }) {
  const { data: url } = usePhotoUrl(path)
  const [lightbox, setLightbox] = useState(false)

  if (!url) {
    return (
      <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-slate-700 shrink-0 flex items-center justify-center">
        <Package size={14} className="text-gray-300 dark:text-slate-600" />
      </div>
    )
  }

  return (
    <>
      <div
        className="relative w-10 h-10 rounded-lg overflow-hidden shrink-0 cursor-pointer group"
        onClick={() => setLightbox(true)}
      >
        <img src={url} alt="" loading="lazy" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/25 transition-colors flex items-center justify-center">
          <Search size={14} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </div>
      {lightbox && createPortal(
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setLightbox(false)}>
          <button className="absolute top-4 right-4 text-white bg-black/40 rounded-full p-2 hover:bg-black/60" onClick={() => setLightbox(false)}>
            <X size={22} />
          </button>
          <img src={url} alt="" className="max-w-xs max-h-[60vh] sm:max-w-sm rounded-2xl object-contain" onClick={e => e.stopPropagation()} />
        </div>,
        document.body,
      )}
    </>
  )
}

// ── regular sale card (mobile) ────────────────────────────────────────────────

function SaleCard({ item, onDelete }: { item: Item; onDelete?: () => void }) {
  const profit = itemProfit(item)
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm p-4">
      <div className="flex items-start gap-3">
        <MiniPhoto path={item.photo_path} />
        <div className="flex-1 min-w-0">
          <p className="font-medium text-gray-900 dark:text-white truncate">{item.title}</p>
          <p className="text-xs text-slate-400 dark:text-slate-500">{item.category ?? ''}</p>
        </div>
        <div className="flex items-start gap-2 shrink-0">
          <div className="text-right">
            <p className="text-sm font-semibold text-gray-900 dark:text-white">{formatCurrency(Number(item.sale_price))}</p>
            <p className={`text-xs font-medium ${profit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {profit >= 0 ? '+' : ''}{formatCurrency(profit)}
            </p>
          </div>
          {onDelete && (
            <button onClick={onDelete} className="mt-0.5 text-slate-300 hover:text-rose-500 dark:text-slate-600 dark:hover:text-rose-400 transition-colors">
              <Trash2 size={15} />
            </button>
          )}
        </div>
      </div>
      <div className="flex justify-between mt-2 text-xs text-slate-400 dark:text-slate-500">
        <span>{item.sale_date ? formatDate(item.sale_date) : '—'}</span>
        <span>Zakup: {formatCurrency(Number(item.purchase_price))}</span>
      </div>
    </div>
  )
}

// ── bundle sale card (mobile) ─────────────────────────────────────────────────

function BundleSaleCard({ entry, onDeleteChild }: { entry: BundleEntry; onDeleteChild?: (item: Item) => void }) {
  const [expanded, setExpanded] = useState(false)
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm overflow-hidden">
      <div className="p-4">
        <div className="flex items-start gap-3">
          <MiniPhoto path={entry.parent.photo_path} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 min-w-0">
              <p className="font-medium text-gray-900 dark:text-white truncate">{entry.parent.title}</p>
              <span className="shrink-0 text-xs font-medium bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-400 rounded-lg px-1.5 py-0.5">Zestaw</span>
            </div>
            <p className="text-xs text-slate-400 dark:text-slate-500">
              {entry.totalSold}/{entry.totalSize} sprzedanych
              {entry.parent.category ? ` · ${entry.parent.category}` : ''}
            </p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-sm font-semibold text-gray-900 dark:text-white">{formatCurrency(entry.revenue)}</p>
            <p className={`text-xs font-medium ${entry.profit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {entry.profit >= 0 ? '+' : ''}{formatCurrency(entry.profit)}
            </p>
          </div>
        </div>
        <div className="flex justify-between items-center mt-2">
          <div className="text-xs text-slate-400 dark:text-slate-500 flex gap-2">
            <span>{formatDate(entry.lastSaleDate)}</span>
            <span>Zakup: {formatCurrency(entry.cost)}</span>
          </div>
          <button
            onClick={() => setExpanded(v => !v)}
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 transition-colors"
          >
            {expanded ? 'Zwiń' : `Pokaż ${entry.soldInRange.length} szt.`}
            <ChevronDown size={13} className={clsx('transition-transform duration-200', expanded && 'rotate-180')} />
          </button>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-gray-100 dark:border-slate-700 divide-y divide-gray-100 dark:divide-slate-700 bg-gray-50/50 dark:bg-slate-700/20">
          {entry.soldInRange.map(child => {
            const p = itemProfit(child)
            return (
              <div key={child.id} className="px-4 py-2.5 flex items-center gap-3">
                <MiniPhoto path={child.photo_path} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-800 dark:text-slate-200 truncate">{child.title}</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500">
                    {child.sale_date ? formatDate(child.sale_date) : '—'} · Zakup: {formatCurrency(Number(child.purchase_price))}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{formatCurrency(Number(child.sale_price))}</p>
                    <p className={`text-xs font-medium ${p >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {p >= 0 ? '+' : ''}{formatCurrency(p)}
                    </p>
                  </div>
                  {onDeleteChild && (
                    <button onClick={() => onDeleteChild(child)} className="text-slate-300 hover:text-rose-500 dark:text-slate-600 dark:hover:text-rose-400 transition-colors">
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── regular table row (desktop) ───────────────────────────────────────────────

function SaleTableRow({ item, onDelete }: { item: Item; onDelete?: () => void }) {
  const profit = itemProfit(item)
  const margin = Number(item.sale_price) > 0 ? (profit / Number(item.sale_price)) * 100 : 0
  return (
    <tr className="border-b border-gray-100 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700/50">
      <td className="py-3 pr-4">
        <div className="flex items-center gap-3">
          <MiniPhoto path={item.photo_path} />
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{item.title}</p>
            <p className="text-xs text-slate-400 dark:text-slate-500">{[item.category, item.brand, item.size].filter(Boolean).join(' · ')}</p>
          </div>
        </div>
      </td>
      <td className="py-3 pr-4 text-sm text-slate-500 dark:text-slate-400 whitespace-nowrap">
        {item.sale_date ? formatDate(item.sale_date) : '—'}
      </td>
      <td className="py-3 pr-4 text-sm text-right whitespace-nowrap">
        <p className="font-medium dark:text-white">{formatCurrency(Number(item.sale_price))}</p>
        <p className="text-xs text-slate-400 dark:text-slate-500">{formatCurrency(Number(item.purchase_price))}</p>
      </td>
      <td className="py-3 text-sm text-right whitespace-nowrap">
        <div className="flex items-center justify-end gap-2">
          <div>
            <p className={`font-semibold ${profit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {profit >= 0 ? '+' : ''}{formatCurrency(profit)}
            </p>
            <p className="text-xs text-slate-400 dark:text-slate-500">{margin.toFixed(1)} %</p>
          </div>
          {onDelete && (
            <button onClick={onDelete} className="text-slate-300 hover:text-rose-500 dark:text-slate-600 dark:hover:text-rose-400 transition-colors p-1">
              <Trash2 size={15} />
            </button>
          )}
        </div>
      </td>
    </tr>
  )
}

// ── bundle table rows (desktop) ───────────────────────────────────────────────

function BundleTableRows({ entry, onDeleteChild }: { entry: BundleEntry; onDeleteChild?: (item: Item) => void }) {
  const [expanded, setExpanded] = useState(false)
  const margin = entry.revenue > 0 ? (entry.profit / entry.revenue) * 100 : 0
  return (
    <>
      <tr className="border-b border-gray-100 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700/50">
        <td className="py-3 pr-4">
          <div className="flex items-center gap-3">
            <MiniPhoto path={entry.parent.photo_path} />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{entry.parent.title}</p>
                <span className="shrink-0 text-xs font-medium bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-400 rounded-lg px-1.5 py-0.5">
                  {entry.totalSold}/{entry.totalSize} szt.
                </span>
              </div>
              <p className="text-xs text-slate-400 dark:text-slate-500">{entry.parent.category ?? ''}</p>
            </div>
          </div>
        </td>
        <td className="py-3 pr-4 text-sm text-slate-500 dark:text-slate-400 whitespace-nowrap">
          {formatDate(entry.lastSaleDate)}
        </td>
        <td className="py-3 pr-4 text-sm text-right whitespace-nowrap">
          <p className="font-medium dark:text-white">{formatCurrency(entry.revenue)}</p>
          <p className="text-xs text-slate-400 dark:text-slate-500">{formatCurrency(entry.cost)}</p>
        </td>
        <td className="py-3 text-sm text-right whitespace-nowrap">
          <div className="flex items-center justify-end gap-2">
            <div>
              <p className={`font-semibold ${entry.profit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {entry.profit >= 0 ? '+' : ''}{formatCurrency(entry.profit)}
              </p>
              <p className="text-xs text-slate-400 dark:text-slate-500">{margin.toFixed(1)} %</p>
            </div>
            <button
              onClick={() => setExpanded(v => !v)}
              className="text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 transition-colors p-1"
              aria-label={expanded ? 'Zwiń' : 'Rozwiń'}
            >
              <ChevronDown size={16} className={clsx('transition-transform duration-200', expanded && 'rotate-180')} />
            </button>
          </div>
        </td>
      </tr>

      {expanded && entry.soldInRange.map(child => {
        const p = itemProfit(child)
        const m = Number(child.sale_price) > 0 ? (p / Number(child.sale_price)) * 100 : 0
        return (
          <tr key={child.id} className="border-b border-gray-100 dark:border-slate-700 bg-violet-50/30 dark:bg-violet-900/10">
            <td className="py-2 pr-4 pl-16">
              <div className="flex items-center gap-3">
                <MiniPhoto path={child.photo_path} />
                <div className="min-w-0">
                  <p className="text-sm text-gray-800 dark:text-slate-200 truncate">{child.title}</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500">Zakup: {formatCurrency(Number(child.purchase_price))}</p>
                </div>
              </div>
            </td>
            <td className="py-2 pr-4 text-sm text-slate-500 dark:text-slate-400 whitespace-nowrap">
              {child.sale_date ? formatDate(child.sale_date) : '—'}
            </td>
            <td className="py-2 pr-4 text-sm text-right whitespace-nowrap">
              <p className="font-medium dark:text-white">{formatCurrency(Number(child.sale_price))}</p>
            </td>
            <td className="py-2 text-sm text-right whitespace-nowrap">
              <div className="flex items-center justify-end gap-2">
                <div>
                  <p className={`font-semibold ${p >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {p >= 0 ? '+' : ''}{formatCurrency(p)}
                  </p>
                  <p className="text-xs text-slate-400 dark:text-slate-500">{m.toFixed(1)} %</p>
                </div>
                {onDeleteChild && (
                  <button onClick={() => onDeleteChild(child)} className="text-slate-300 hover:text-rose-500 dark:text-slate-600 dark:hover:text-rose-400 transition-colors p-1">
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
            </td>
          </tr>
        )
      })}
    </>
  )
}

// ── main ──────────────────────────────────────────────────────────────────────

export default function Sales() {
  const { data: allItems = [], isLoading: loadingItems } = useItems({})
  const { data: allSoldChildren = [], isLoading: loadingChildren } = useAllSoldBundleChildren()
  const { data: allCategories = [] } = useCategories()
  const isLoading = loadingItems || loadingChildren
  const deleteItem = useDeleteItem()
  const categoryOptions = [
    { value: '', label: 'Wszystkie kategorie' },
    ...allCategories.map(c => ({ value: c.name, label: c.name })),
  ]

  async function handleDeleteItem(item: Item) {
    if (!window.confirm(`Usunąć "${item.title}" z historii sprzedaży? Tej operacji nie można cofnąć.`)) return
    try {
      await deleteItem.mutateAsync(item.id)
      toast.success('Usunięto z historii sprzedaży')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Wystąpił błąd')
    }
  }

  const { from: qFrom } = getCurrentQuarter()
  const [dateFrom, setDateFrom] = useState(qFrom.toISOString().slice(0, 10))
  const [dateTo,   setDateTo]   = useState(new Date().toISOString().slice(0, 10))
  const [category, setCategory] = useState('')
  const [quarter,  setQuarter]  = useState(() => {
    const q = getCurrentQuarter()
    return `${q.year}-${q.quarter}`
  })

  function handleQuarterChange(val: string) {
    setQuarter(val)
    if (!val) { setDateFrom('2020-01-01'); setDateTo(new Date().toISOString().slice(0, 10)); return }
    const [y, q] = val.split('-')
    const { from, to } = getQuarterRange(parseInt(y), parseInt(q) as 1 | 2 | 3 | 4)
    setDateFrom(from.toISOString().slice(0, 10))
    setDateTo(to.toISOString().slice(0, 10))
  }

  // ── build entries ──────────────────────────────────────────────────────────

  // Regular sold items (not bundle parents)
  const soldRegular = allItems.filter(i => i.status === 'SOLD' && i.bundle_size == null)
  const bundleParents = allItems.filter(i => i.bundle_size != null && i.bundle_id == null)

  const filteredRegular = soldRegular.filter(item => {
    if (!item.sale_date) return false
    const d = item.sale_date.slice(0, 10)
    if (d < dateFrom || d > dateTo) return false
    if (category && item.category !== category) return false
    return true
  })

  // Group sold children in date range by bundle_id
  const childrenInRangeByParent = new Map<string, Item[]>()
  for (const child of allSoldChildren) {
    if (!child.sale_date) continue
    const d = child.sale_date.slice(0, 10)
    if (d < dateFrom || d > dateTo) continue
    const pid = child.bundle_id!
    if (!childrenInRangeByParent.has(pid)) childrenInRangeByParent.set(pid, [])
    childrenInRangeByParent.get(pid)!.push(child)
  }

  const bundleEntries: BundleEntry[] = []
  for (const [parentId, soldInRange] of childrenInRangeByParent) {
    const parent = bundleParents.find(p => p.id === parentId)
    if (!parent) continue
    if (category && parent.category !== category) continue

    const totalSold = allSoldChildren.filter(c => c.bundle_id === parentId).length
    const revenue = soldInRange.reduce((s, c) => s + Number(c.sale_price), 0)
    const cost    = soldInRange.reduce((s, c) => s + Number(c.purchase_price), 0)
    const profit  = soldInRange.reduce((s, c) => s + itemProfit(c), 0)
    const lastSaleDate = [...soldInRange].map(c => c.sale_date!).sort().at(-1)!

    bundleEntries.push({
      type: 'bundle',
      parent,
      soldInRange: [...soldInRange].sort((a, b) => (b.sale_date ?? '').localeCompare(a.sale_date ?? '')),
      totalSold,
      totalSize: parent.bundle_size!,
      revenue,
      cost,
      profit,
      lastSaleDate,
    })
  }

  // Combine and sort newest first
  const entries: SaleEntry[] = [
    ...filteredRegular.map(item => ({ type: 'regular' as const, item })),
    ...bundleEntries,
  ].sort((a, b) => {
    const dA = a.type === 'regular' ? (a.item.sale_date ?? '') : a.lastSaleDate
    const dB = b.type === 'regular' ? (b.item.sale_date ?? '') : b.lastSaleDate
    return dB.localeCompare(dA)
  })

  // ── summary stats ──────────────────────────────────────────────────────────

  const totalRevenue =
    filteredRegular.reduce((s, i) => s + Number(i.sale_price), 0) +
    bundleEntries.reduce((s, e) => s + e.revenue, 0)

  const totalProfit =
    filteredRegular.reduce((s, i) => s + itemProfit(i), 0) +
    bundleEntries.reduce((s, e) => s + e.profit, 0)

  const totalCount =
    filteredRegular.length +
    bundleEntries.reduce((s, e) => s + e.soldInRange.length, 0)

  return (
    <div className="mx-auto max-w-5xl px-4 pt-6 pb-10 space-y-6">

      {/* header */}
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">Historia sprzedaży</h1>
        <button
          onClick={() => exportCsv(entries, dateFrom, dateTo)}
          disabled={!entries.length}
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium px-4 py-2 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Download size={16} />
          Eksportuj CSV
        </button>
      </div>

      {/* filters */}
      <div className="flex flex-wrap gap-3">
        <select value={quarter} onChange={e => handleQuarterChange(e.target.value)}
          className="rounded-xl border border-gray-300 dark:border-slate-600 px-4 py-2.5 text-sm bg-white dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500">
          {QUARTER_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setQuarter('') }}
          className="rounded-xl border border-gray-300 dark:border-slate-600 px-4 py-2.5 text-sm bg-white dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500" />
        <input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setQuarter('') }}
          className="rounded-xl border border-gray-300 dark:border-slate-600 px-4 py-2.5 text-sm bg-white dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500" />
        <select value={category} onChange={e => setCategory(e.target.value)}
          className="rounded-xl border border-gray-300 dark:border-slate-600 px-4 py-2.5 text-sm bg-white dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500">
          {categoryOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      {/* summary */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Sprzedaż w okresie',  value: formatCurrency(totalRevenue) },
          { label: 'Zysk w danym okresie', value: formatCurrency(totalProfit), colored: true },
          { label: 'Liczba sprzedanych',  value: `${totalCount} szt.` },
        ].map(s => (
          <div key={s.label} className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm p-4">
            <p className="text-xs text-slate-400 dark:text-slate-500">{s.label}</p>
            <p className={`text-lg font-bold mt-0.5 ${s.colored ? (totalProfit >= 0 ? 'text-emerald-600' : 'text-rose-600') : 'text-gray-900 dark:text-white'}`}>
              {s.value}
            </p>
          </div>
        ))}
      </div>

      {/* list */}
      {isLoading ? (
        <div className="text-center py-12 text-slate-400 text-sm">Ładowanie…</div>
      ) : !entries.length ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Package size={48} className="text-gray-200 dark:text-slate-700 mb-3" />
          <p className="text-slate-400 dark:text-slate-500">Brak sprzedaży w tym okresie</p>
        </div>
      ) : (
        <>
          {/* mobile */}
          <div className="md:hidden space-y-3">
            {entries.map((entry, i) =>
              entry.type === 'regular'
                ? <SaleCard key={entry.item.id} item={entry.item} onDelete={() => handleDeleteItem(entry.item)} />
                : <BundleSaleCard key={`bundle-${entry.parent.id}-${i}`} entry={entry} onDeleteChild={handleDeleteItem} />
            )}
          </div>

          {/* desktop */}
          <div className="hidden md:block bg-white dark:bg-slate-800 rounded-2xl shadow-sm overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-slate-700/50 border-b border-gray-100 dark:border-slate-700">
                <tr>
                  <th className="text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide py-3 px-4">Rzecz</th>
                  <th className="text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide py-3 pr-4">Data</th>
                  <th className="text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide py-3 pr-4">Przychód / koszt</th>
                  <th className="text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide py-3">Zysk / marża</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry, i) =>
                  entry.type === 'regular'
                    ? <SaleTableRow key={entry.item.id} item={entry.item} onDelete={() => handleDeleteItem(entry.item)} />
                    : <BundleTableRows key={`bundle-${entry.parent.id}-${i}`} entry={entry} onDeleteChild={handleDeleteItem} />
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
