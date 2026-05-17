import { Link } from 'react-router-dom'
import {
  CalendarDays,
  TrendingUp,
  Percent,
  Package,
  Warehouse,
  Clock,
} from 'lucide-react'
import { useItems } from '../features/items/queries'
import { usePhotoUrl } from '../features/items/queries'
import StatCard from '../components/charts/StatCard'
import ProgressBar from '../components/charts/ProgressBar'
import LineChartCard from '../components/charts/LineChartCard'
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
    <div className="w-10 h-10 rounded-lg bg-gray-100 shrink-0 flex items-center justify-center">
      <Package size={14} className="text-gray-300" />
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
        <p className="text-sm font-medium text-gray-900 truncate">{item.title}</p>
        <p className="text-xs text-slate-400">{item.sale_date ? formatDate(item.sale_date) : ''}</p>
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
      <div className="bg-white rounded-2xl shadow-sm p-6 h-36" />
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-white rounded-2xl shadow-sm p-5 h-24" />
        ))}
      </div>
      <div className="bg-white rounded-2xl shadow-sm p-6 h-72" />
    </div>
  )
}

// ── main ──────────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const { data: items = [], isLoading } = useItems({})

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
        <Package size={64} className="text-gray-200 mb-4" />
        <p className="text-lg font-semibold text-gray-400">Brak danych</p>
        <p className="text-sm text-gray-400 mb-6">Dodaj pierwszą rzecz, żeby zobaczyć statystyki.</p>
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
  const qRevenue   = currentQuarterRevenue(items)
  const qPercent   = (qRevenue / QUARTERLY_LIMIT_PLN) * 100
  const daysLeft   = daysLeftInQuarter()
  const remaining  = QUARTERLY_LIMIT_PLN - qRevenue

  const kpis = [
    { label: 'Sprzedaż',          value: formatCurrency(mtdRevenue(items)),         icon: <CalendarDays size={18} /> },
    { label: 'Zysk',              value: formatCurrency(mtdProfit(items)),           icon: <TrendingUp size={18} /> },
    { label: 'Średnia marża',     value: `${averageMargin(items).toFixed(1)} %`,    icon: <Percent size={18} /> },
    { label: 'Sztuk w magazynie', value: String(inventoryCount(items)),             icon: <Package size={18} /> },
    { label: 'Wartość magazynu',  value: formatCurrency(inventoryValue(items)),     icon: <Warehouse size={18} /> },
    { label: 'Śr. czas w magazynie', value: `${averageDaysOnShelf(items)} dni`,     icon: <Clock size={18} /> },
  ]

  const quartSeries = cumulativeQuarterSeries(items)
  const profitByCat = profitByCategory(items)
  const invByCat    = inventoryByCategory(items)
  const topSales    = topProfitableSales(items)

  return (
    <div className="mx-auto max-w-5xl px-4 pt-6 pb-10 space-y-6">

      {/* 1 — quarterly limit bar */}
      <div className="bg-white rounded-2xl shadow-sm p-6">
        <p className="text-sm text-slate-500 font-medium">Limit działalności nierejestrowanej</p>
        <div className="flex items-baseline gap-2 mt-1">
          <p className="text-lg font-bold text-gray-900">{getQuarterLabel(year, quarter)}</p>
          <p className="text-xs text-slate-400">do {formatDate(qEnd)}</p>
        </div>
        <p className="text-3xl font-bold text-gray-900 mt-2">
          {formatCurrency(qRevenue)}{' '}
          <span className="text-lg font-normal text-slate-400">
            / {formatCurrency(QUARTERLY_LIMIT_PLN)}
          </span>
        </p>
        <div className="mt-3">
          <ProgressBar percent={qPercent} />
        </div>
        <div className="flex justify-between mt-3 text-sm text-slate-500">
          <span>Pozostało: <span className="font-medium text-gray-700">{formatCurrency(Math.max(0, remaining))}</span></span>
          <span>Dni do końca kwartału: <span className="font-medium text-gray-700">{daysLeft}</span></span>
        </div>
        {qPercent >= 90 && (
          <div className="mt-3 rounded-xl bg-rose-50 border border-rose-200 px-4 py-2.5 text-sm text-rose-700 font-medium">
            Uważaj! Zbliżasz się do limitu.
          </div>
        )}
      </div>

      {/* 2 — KPI grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {kpis.map(k => (
          <StatCard key={k.label} label={k.label} value={k.value} icon={k.icon} />
        ))}
      </div>

      {/* 3 — line chart */}
      <LineChartCard
        title="Sprzedaż w bieżącym kwartale"
        data={quartSeries}
        referenceY={QUARTERLY_LIMIT_PLN}
        referenceLabel="Limit"
      />

      {/* 4 — bar + donut */}
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

      {/* 5 — top sales */}
      <div className="bg-white rounded-2xl shadow-sm p-6">
        <h3 className="font-semibold text-gray-900 mb-1">Top 5 sprzedaży</h3>
        {topSales.length ? (
          <div className="divide-y divide-gray-100">
            {topSales.map(item => <SaleRow key={item.id} item={item} />)}
          </div>
        ) : (
          <p className="text-sm text-slate-400 py-6 text-center">Brak sprzedaży</p>
        )}
      </div>

    </div>
  )
}
