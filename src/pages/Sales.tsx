import { useState } from 'react'
import { createPortal } from 'react-dom'
import { Download, Package, X, Search } from 'lucide-react'
import { useItems } from '../features/items/queries'
import { usePhotoUrl } from '../features/items/queries'
import { totalRevenue, totalProfit, itemProfit } from '../features/stats/selectors'
import {
  getCurrentQuarter,
  getQuarterRange,
} from '../lib/legal'
import { formatCurrency, formatDate } from '../utils/format'
import { CATEGORIES } from '../lib/constants'
import type { Item } from '../types/item'

// ── CSV export ────────────────────────────────────────────────────────────────

function exportCsv(items: Item[], from: string, to: string) {
  const BOM = '﻿'
  const sep = ';'
  const headers = [
    'Data sprzedaży', 'Tytuł', 'Kategoria', 'Marka', 'Rozmiar',
    'Cena zakupu', 'Data zakupu', 'Cena sprzedaży', 'Koszt wysyłki',
    'Zysk', 'Marża %',
  ].join(sep)

  const rows = items.map(item => {
    const profit = itemProfit(item)
    const margin = Number(item.sale_price) > 0
      ? (profit / Number(item.sale_price)) * 100
      : 0
    const cell = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`
    return [
      cell(item.sale_date ?? ''),
      cell(item.title),
      cell(item.category ?? ''),
      cell(item.brand ?? ''),
      cell(item.size ?? ''),
      cell(Number(item.purchase_price).toFixed(2).replace('.', ',')),
      cell(item.purchase_date),
      cell(Number(item.sale_price).toFixed(2).replace('.', ',')),
      cell(Number(item.shipping_cost_paid_by_seller).toFixed(2).replace('.', ',')),
      cell(profit.toFixed(2).replace('.', ',')),
      cell(margin.toFixed(1).replace('.', ',')),
    ].join(sep)
  })

  const csv  = BOM + [headers, ...rows].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
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

const CATEGORY_OPTIONS = [
  { value: '', label: 'Wszystkie kategorie' },
  ...CATEGORIES.map(c => ({ value: c, label: c })),
]

// ── mini thumbnail ────────────────────────────────────────────────────────────

function MiniPhoto({ path }: { path: string | null }) {
  const { data: url } = usePhotoUrl(path)
  const [lightbox, setLightbox] = useState(false)

  if (!url) {
    return (
      <div className="w-10 h-10 rounded-lg bg-gray-100 shrink-0 flex items-center justify-center">
        <Package size={14} className="text-gray-300" />
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
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setLightbox(false)}
        >
          <button
            className="absolute top-4 right-4 text-white bg-black/40 rounded-full p-2 hover:bg-black/60"
            onClick={() => setLightbox(false)}
            aria-label="Zamknij"
          >
            <X size={22} />
          </button>
          <img
            src={url}
            alt=""
            className="max-w-xs max-h-[60vh] sm:max-w-sm rounded-2xl object-contain"
            onClick={e => e.stopPropagation()}
          />
        </div>,
        document.body,
      )}
    </>
  )
}

// ── sale row (mobile card / desktop table row) ────────────────────────────────

function SaleCard({ item }: { item: Item }) {
  const profit   = itemProfit(item)
  const isBundle = item.bundle_size != null
  return (
    <div className="bg-white rounded-2xl shadow-sm p-4">
      <div className="flex items-start gap-3">
        <MiniPhoto path={item.photo_path} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 min-w-0">
            <p className="font-medium text-gray-900 truncate">{item.title}</p>
            {isBundle && (
              <span className="shrink-0 text-xs font-medium bg-violet-100 text-violet-700 rounded-lg px-1.5 py-0.5">
                Zestaw
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400">
            {[item.category, isBundle ? `${item.bundle_size} szt.` : null].filter(Boolean).join(' · ')}
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-sm font-semibold text-gray-900">{formatCurrency(Number(item.sale_price))}</p>
          <p className={`text-xs font-medium ${profit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
            {profit >= 0 ? '+' : ''}{formatCurrency(profit)}
          </p>
        </div>
      </div>
      <div className="flex justify-between mt-2 text-xs text-slate-400">
        <span>{item.sale_date ? formatDate(item.sale_date) : '—'}</span>
        <span>Zakup: {formatCurrency(Number(item.purchase_price))}</span>
      </div>
    </div>
  )
}

function SaleTableRow({ item }: { item: Item }) {
  const profit   = itemProfit(item)
  const margin   = Number(item.sale_price) > 0 ? (profit / Number(item.sale_price)) * 100 : 0
  const isBundle = item.bundle_size != null
  return (
    <tr className="border-b border-gray-100 hover:bg-gray-50">
      <td className="py-3 pr-4">
        <div className="flex items-center gap-3">
          <MiniPhoto path={item.photo_path} />
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="text-sm font-medium text-gray-900 truncate">{item.title}</p>
              {isBundle && (
                <span className="shrink-0 text-xs font-medium bg-violet-100 text-violet-700 rounded-lg px-1.5 py-0.5">
                  Zestaw {item.bundle_size} szt.
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400">{[item.category, item.brand, item.size].filter(Boolean).join(' · ')}</p>
          </div>
        </div>
      </td>
      <td className="py-3 pr-4 text-sm text-slate-500 whitespace-nowrap">
        {item.sale_date ? formatDate(item.sale_date) : '—'}
      </td>
      <td className="py-3 pr-4 text-sm text-right whitespace-nowrap">
        <p className="font-medium">{formatCurrency(Number(item.sale_price))}</p>
        <p className="text-xs text-slate-400">{formatCurrency(Number(item.purchase_price))}</p>
      </td>
      <td className="py-3 text-sm text-right whitespace-nowrap">
        <p className={`font-semibold ${profit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
          {profit >= 0 ? '+' : ''}{formatCurrency(profit)}
        </p>
        <p className="text-xs text-slate-400">{margin.toFixed(1)} %</p>
      </td>
    </tr>
  )
}

// ── main ──────────────────────────────────────────────────────────────────────

export default function Sales() {
  const { data: allItems = [], isLoading } = useItems({})
  const soldItems = allItems.filter(i => i.status === 'SOLD')

  // default: current quarter
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
    if (!val) {
      setDateFrom('2020-01-01')
      setDateTo(new Date().toISOString().slice(0, 10))
      return
    }
    const [y, q] = val.split('-')
    const { from, to } = getQuarterRange(parseInt(y), parseInt(q) as 1 | 2 | 3 | 4)
    setDateFrom(from.toISOString().slice(0, 10))
    setDateTo(to.toISOString().slice(0, 10))
  }

  const filteredItems = soldItems.filter(item => {
    if (!item.sale_date) return false
    const d = item.sale_date.slice(0, 10)
    if (d < dateFrom || d > dateTo) return false
    if (category && item.category !== category) return false
    return true
  })

  const range     = { from: new Date(dateFrom), to: new Date(dateTo + 'T23:59:59') }
  const revenue   = totalRevenue(filteredItems, range)
  const profit    = totalProfit(filteredItems, range)

  return (
    <div className="mx-auto max-w-5xl px-4 pt-6 pb-10 space-y-6">

      {/* header */}
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-xl font-bold text-gray-900">Historia sprzedaży</h1>
        <button
          onClick={() => exportCsv(filteredItems, dateFrom, dateTo)}
          disabled={!filteredItems.length}
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium px-4 py-2 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Download size={16} />
          Eksportuj CSV
        </button>
      </div>

      {/* filters */}
      <div className="flex flex-wrap gap-3">
        <select
          value={quarter}
          onChange={e => handleQuarterChange(e.target.value)}
          className="rounded-xl border border-gray-300 px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          {QUARTER_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <input
          type="date"
          value={dateFrom}
          onChange={e => { setDateFrom(e.target.value); setQuarter('') }}
          className="rounded-xl border border-gray-300 px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
        <input
          type="date"
          value={dateTo}
          onChange={e => { setDateTo(e.target.value); setQuarter('') }}
          className="rounded-xl border border-gray-300 px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
        <select
          value={category}
          onChange={e => setCategory(e.target.value)}
          className="rounded-xl border border-gray-300 px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          {CATEGORY_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {/* summary */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Sprzedaż w okresie', value: formatCurrency(revenue) },
          { label: 'Zysk w okresie',     value: formatCurrency(profit),  colored: true },
          { label: 'Liczba sprzedanych', value: String(filteredItems.length) + ' szt.' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl shadow-sm p-4">
            <p className="text-xs text-slate-400">{s.label}</p>
            <p className={`text-lg font-bold mt-0.5 ${s.colored ? (profit >= 0 ? 'text-emerald-600' : 'text-rose-600') : 'text-gray-900'}`}>
              {s.value}
            </p>
          </div>
        ))}
      </div>

      {/* list */}
      {isLoading ? (
        <div className="text-center py-12 text-slate-400 text-sm">Ładowanie…</div>
      ) : !filteredItems.length ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Package size={48} className="text-gray-200 mb-3" />
          <p className="text-slate-400">Brak sprzedaży w tym okresie</p>
        </div>
      ) : (
        <>
          {/* mobile */}
          <div className="md:hidden space-y-3">
            {filteredItems.map(item => <SaleCard key={item.id} item={item} />)}
          </div>

          {/* desktop */}
          <div className="hidden md:block bg-white rounded-2xl shadow-sm overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wide py-3 px-4">Rzecz</th>
                  <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wide py-3 pr-4">Data</th>
                  <th className="text-right text-xs font-medium text-slate-500 uppercase tracking-wide py-3 pr-4">Cena</th>
                  <th className="text-right text-xs font-medium text-slate-500 uppercase tracking-wide py-3">Zysk / marża</th>
                </tr>
              </thead>
              <tbody className="px-4">
                {filteredItems.map(item => <SaleTableRow key={item.id} item={item} />)}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
