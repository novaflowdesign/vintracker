import { useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import {
  CalendarDays,
  TrendingUp,
  Percent,
  Package,
  Warehouse,
  Clock,
  Settings,
  X,
} from 'lucide-react'
import SettingsPage from './Settings'
import { useItems, useAllSoldBundleChildren, usePhotoUrl } from '../features/items/queries'
import StatCard from '../components/charts/StatCard'
import ProgressBar from '../components/charts/ProgressBar'
import QuarterBarChartCard from '../components/charts/QuarterBarChartCard'
import BarChartCard from '../components/charts/BarChartCard'
import DonutChartCard from '../components/charts/DonutChartCard'
import {
  mtdRevenue,
  mtdProfit,
  averageMargin,
  inventoryCount,
  inventoryValue,
  averageDaysOnShelf,
  currentQuarterRevenue,
  profitByCategory,
  inventoryByCategory,
  cumulativeQuarterSeries,
  topProfitableSales,
  itemProfit,
} from '../features/stats/selectors'
import {
  QUARTERLY_LIMIT_PLN,
  getCurrentQuarter,
  getQuarterLabel,
  daysLeftInQuarter,
} from '../lib/legal'
import { formatCurrency, formatDate } from '../utils/format'
import type { Item } from '../types/item'

// ── mini thumbnail ────────────────────────────────────────────────────────────

function MiniPhoto({ path }: { path: string | null }) {
  const { data: url } = usePhotoUrl(path)
  return url ? (
    <img src={url} alt="" loading="lazy" className="w-10 h-10 rounded-lg object-cover shrink-0" />
  ) : (
    <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-slate-700 shrink-0 flex items-center justify-center">
      <Package size={14} className="text-gray-300 dark:text-slate-600" />
    </div>
  )
}

// ── top-lists rows ────────────────────────────────────────────────────────────

function SaleRow({ item }: { item: Item }) {
  const profit = itemProfit(item)
  return (
    <div className="flex items-center gap-3 py-2">
      <MiniPhoto path={item.photo_path} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{item.title}</p>
        <p className="text-xs text-slate-400 dark:text-slate-500">{item.sale_date ? formatDate(item.sale_date) : ''}</p>
      </div>
      <p className={`text-sm font-semibold shrink-0 ${profit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
        {formatCurrency(profit)}
      </p>
    </div>
  )
}


// ── skeletons ─────────────────────────────────────────────────────────────────

function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm p-6 h-36" />
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm p-5 h-24" />
        ))}
      </div>
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm p-6 h-72" />
    </div>
  )
}

// ── main ──────────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const [settingsOpen, setSettingsOpen] = useState(false)
  const { data: items = [], isLoading: loadingItems } = useItems({})
  const { data: allSoldChildren = [], isLoading: loadingChildren } = useAllSoldBundleChildren()
  const isLoading = loadingItems || loadingChildren

  // For sales metrics: regular items (non-bundle-parents) + sold bundle children.
  // Bundle parents are excluded to avoid double-counting when a whole bundle is sold.
  const salesItems = useMemo(
    () => [...items.filter(i => i.bundle_size == null), ...allSoldChildren],
    [items, allSoldChildren],
  )

  if (isLoading) {
    return (
      <div className="mx-auto max-w-5xl px-4 pt-6">
        <DashboardSkeleton />
      </div>
    )
  }

  if (!items.length) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <Package size={64} className="text-gray-200 dark:text-slate-700 mb-4" />
        <p className="text-lg font-semibold text-gray-400 dark:text-slate-500">Brak danych</p>
        <p className="text-sm text-gray-400 dark:text-slate-500 mb-6">Dodaj pierwszą rzecz, żeby zobaczyć statystyki.</p>
        <Link
          to="/add"
          className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-6 py-2.5 text-sm transition-colors"
        >
          Dodaj pierwszą rzecz
        </Link>
      </div>
    )
  }

  const { year, quarter, to: qEnd } = getCurrentQuarter()
  const qRevenue   = currentQuarterRevenue(salesItems)
  const qPercent   = (qRevenue / QUARTERLY_LIMIT_PLN) * 100
  const daysLeft   = daysLeftInQuarter()
  const remaining  = QUARTERLY_LIMIT_PLN - qRevenue

  const kpis = [
    { label: 'Sprzedaż',          value: formatCurrency(mtdRevenue(salesItems)),      icon: <CalendarDays size={18} /> },
    { label: 'Zysk',              value: formatCurrency(mtdProfit(salesItems)),        icon: <TrendingUp size={18} /> },
    { label: 'Średnia marża',     value: `${averageMargin(items).toFixed(1)} %`,       icon: <Percent size={18} /> },
    { label: 'Sztuk w magazynie', value: String(inventoryCount(items)),                icon: <Package size={18} /> },
    { label: 'Wartość magazynu',  value: formatCurrency(inventoryValue(items)),        icon: <Warehouse size={18} /> },
    { label: 'Śr. czas w magazynie', value: `${averageDaysOnShelf(items)} dni`,        icon: <Clock size={18} /> },
  ]

  const quartSeries = cumulativeQuarterSeries(salesItems)
  const profitByCat = profitByCategory(salesItems)
  const invByCat    = inventoryByCategory(items)
  const topSales    = topProfitableSales(salesItems)

  return (
    <>
    <div className="mx-auto max-w-5xl px-4 pt-6 pb-10 space-y-6">

      {/* 1 — quarterly limit bar */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm p-6">
        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Limit działalności nierejestrowanej</p>
        <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
          {formatCurrency(qRevenue)}{' '}
          <span className="text-lg font-normal text-slate-400 dark:text-slate-500">
            / {formatCurrency(QUARTERLY_LIMIT_PLN)}
          </span>
        </p>
        <div className="mt-3">
          <ProgressBar percent={qPercent} />
        </div>
        <div className="flex justify-between mt-3 text-sm text-slate-500 dark:text-slate-400">
          <span>Pozostało: <span className="font-medium text-gray-700 dark:text-slate-200">{formatCurrency(Math.max(0, remaining))}</span></span>
          <span>Dni do końca kwartału: <span className="font-medium text-gray-700 dark:text-slate-200">{daysLeft}</span></span>
        </div>
        {qPercent >= 90 && (
          <div className="mt-3 rounded-xl bg-rose-50 border border-rose-200 px-4 py-2.5 text-sm text-rose-700 font-medium">
            Uważaj! Zbliżasz się do limitu.
          </div>
        )}
        <div className="flex items-baseline gap-2 mt-3 pt-3 border-t border-gray-100 dark:border-slate-700">
          <p className="text-sm font-semibold text-gray-700 dark:text-slate-300">{getQuarterLabel(year, quarter)}</p>
          <p className="text-xs text-slate-400 dark:text-slate-500">do {formatDate(qEnd)}</p>
        </div>
      </div>

      {/* 2 — KPI grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {kpis.map(k => (
          <StatCard key={k.label} label={k.label} value={k.value} icon={k.icon} />
        ))}
      </div>

      {/* 3 — top sales */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm p-6">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Top 5 sprzedaży</h3>
        {topSales.length ? (
          <div className="divide-y divide-gray-100 dark:divide-slate-700">
            {topSales.map(item => <SaleRow key={item.id} item={item} />)}
          </div>
        ) : (
          <p className="text-sm text-slate-400 dark:text-slate-500 py-6 text-center">Brak sprzedaży</p>
        )}
      </div>

      {/* 4 — quarter bar chart */}
      <QuarterBarChartCard
        title="Sprzedaż w bieżącym kwartale"
        data={quartSeries}
      />

      {/* 5 — bar + donut */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <BarChartCard
          title="Zysk per kategoria (ostatnie 90 dni)"
          data={profitByCat}
          emptyText="Brak sprzedaży w ostatnich 90 dniach"
        />
        <DonutChartCard
          title="Magazyn po kategoriach"
          data={invByCat}
          emptyText="Magazyn jest pusty"
        />
      </div>

      {/* Settings button */}
      <div className="flex justify-center pt-2 pb-4">
        <button
          onClick={() => setSettingsOpen(true)}
          className="flex items-center gap-2 text-sm text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors px-4 py-2 rounded-xl hover:bg-white dark:hover:bg-slate-800"
        >
          <Settings size={15} />
          Ustawienia
        </button>
      </div>

    </div>

    {/* Settings sheet */}
    {settingsOpen && createPortal(
      <>
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
          onClick={() => setSettingsOpen(false)}
        />
        <div className="fixed inset-x-0 bottom-0 z-50 bg-gray-50 dark:bg-slate-950 rounded-t-3xl max-h-[88vh] flex flex-col settings-sheet">
          <div className="flex justify-center pt-3 pb-1 shrink-0">
            <div className="w-10 h-1 rounded-full bg-gray-300 dark:bg-slate-600" />
          </div>
          <button
            onClick={() => setSettingsOpen(false)}
            className="absolute top-3 right-4 p-2 rounded-full text-gray-400 hover:text-gray-600 dark:text-slate-500 dark:hover:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
            aria-label="Zamknij"
          >
            <X size={20} />
          </button>
          <div className="overflow-y-auto flex-1" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
            <SettingsPage />
          </div>
        </div>
      </>,
      document.body,
    )}
    </>
  )
}
