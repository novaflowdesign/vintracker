import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Package, Search, ShoppingBag, X, Clock, History, TrendingUp, TrendingDown, Warehouse, Truck } from 'lucide-react'
import { toast } from 'sonner'
import InventoryCard, { CardSkeleton } from '../features/items/InventoryCard'
import SellModal from '../features/items/SellModal'
import EditItemModal from '../features/items/EditItemModal'
import GroupSellModal from '../features/items/GroupSellModal'
import { useItems, useDeleteItem } from '../features/items/queries'
import { CATEGORIES } from '../lib/constants'
import type { Item } from '../types/item'
import type { SortOrder } from '../features/items/api'

type DeliveryFilter = 'all' | 'in_warehouse' | 'in_delivery'

const SORT_OPTIONS: { value: SortOrder; label: string; icon: React.ReactNode }[] = [
  { value: 'newest',     label: 'Najnowsze',  icon: <Clock size={12} /> },
  { value: 'oldest',     label: 'Najstarsze', icon: <History size={12} /> },
  { value: 'price_asc',  label: 'Najtańsze',  icon: <TrendingUp size={12} /> },
  { value: 'price_desc', label: 'Najdroższe', icon: <TrendingDown size={12} /> },
]

const STATUS_OPTIONS: { value: DeliveryFilter; label: string; icon: React.ReactNode }[] = [
  { value: 'all',          label: 'Wszystkie',   icon: null },
  { value: 'in_warehouse', label: 'W magazynie', icon: <Warehouse size={12} /> },
  { value: 'in_delivery',  label: 'W dostawie',  icon: <Truck size={12} /> },
]

export default function Inventory() {
  const [search,         setSearch]         = useState('')
  const [category,       setCategory]       = useState('')
  const [sort,           setSort]           = useState<SortOrder>('newest')
  const [deliveryFilter, setDeliveryFilter] = useState<DeliveryFilter>('all')

  const [sellItem,    setSellItem]    = useState<Item | null>(null)
  const [editItem,    setEditItem]    = useState<Item | null>(null)
  const [selectMode,  setSelectMode]  = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [groupSell,   setGroupSell]   = useState(false)

  const { data: rawItems, isLoading } = useItems({
    status:   'IN_STOCK',
    search:   search   || undefined,
    category: category || undefined,
    sort,
  })

  const now = new Date()
  const items = useMemo(() => {
    if (!rawItems) return rawItems
    if (deliveryFilter === 'in_warehouse') return rawItems.filter(i => !!i.received_date && new Date(i.received_date) <= now)
    if (deliveryFilter === 'in_delivery')  return rawItems.filter(i => !i.received_date  || new Date(i.received_date) > now)
    return rawItems
  }, [rawItems, deliveryFilter]) // eslint-disable-line react-hooks/exhaustive-deps

  const deleteItem = useDeleteItem()

  async function handleDelete(item: Item) {
    if (!window.confirm(`Usunąć "${item.title}"? Tej operacji nie można cofnąć.`)) return
    try {
      await deleteItem.mutateAsync(item.id)
      toast.success('Rzecz usunięta')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Wystąpił błąd')
    }
  }

  function toggleSelect(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function exitSelectMode() {
    setSelectMode(false)
    setSelectedIds(new Set())
  }

  const selectedItems = (items ?? []).filter(i => selectedIds.has(i.id))

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 pb-8">
      <div className="mx-auto max-w-5xl px-4 pt-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Magazyn</h1>
          {!isLoading && !!items?.length && (
            selectMode ? (
              <button
                onClick={exitSelectMode}
                className="text-sm text-slate-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 transition-colors"
              >
                Anuluj
              </button>
            ) : (
              <button
                onClick={() => setSelectMode(true)}
                className="flex items-center gap-1.5 text-sm font-medium text-emerald-600 hover:text-emerald-700 transition-colors"
              >
                <ShoppingBag size={16} />
                Sprzedaj kilka
              </button>
            )
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-2 mb-6">
          {/* Search */}
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              type="search"
              placeholder="Szukaj po tytule..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-300 dark:border-slate-600 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white dark:bg-slate-700 dark:text-white"
            />
          </div>

          {/* Sort */}
          <div className="flex gap-1.5 overflow-x-auto pb-0.5 no-scrollbar">
            {SORT_OPTIONS.map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setSort(opt.value)}
                className={`shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${
                  sort === opt.value
                    ? 'bg-emerald-600 text-white'
                    : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-slate-300 border border-gray-200 dark:border-slate-700 hover:border-emerald-400'
                }`}
              >
                {opt.icon}{opt.label}
              </button>
            ))}
          </div>

          {/* Status + Category */}
          <div className="flex gap-1.5 overflow-x-auto pb-0.5 no-scrollbar">
            {STATUS_OPTIONS.map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setDeliveryFilter(opt.value)}
                className={`shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${
                  deliveryFilter === opt.value
                    ? 'bg-violet-600 text-white'
                    : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-slate-300 border border-gray-200 dark:border-slate-700 hover:border-violet-400'
                }`}
              >
                {opt.icon}{opt.label}
              </button>
            ))}
            <div className="w-px bg-gray-200 dark:bg-slate-700 shrink-0 my-0.5" />
            <button
              type="button"
              onClick={() => setCategory('')}
              className={`shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${
                category === ''
                  ? 'bg-slate-700 text-white dark:bg-slate-200 dark:text-slate-900'
                  : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-slate-300 border border-gray-200 dark:border-slate-700 hover:border-gray-400'
              }`}
            >
              Wszystkie
            </button>
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategory(cat)}
                className={`shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${
                  category === cat
                    ? 'bg-slate-700 text-white dark:bg-slate-200 dark:text-slate-900'
                    : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-slate-300 border border-gray-200 dark:border-slate-700 hover:border-gray-400'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)}
          </div>
        ) : !items?.length ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <Package size={56} className="text-gray-200 dark:text-slate-700 mb-4" />
            <p className="text-lg font-semibold text-gray-400 dark:text-slate-500">Brak rzeczy w magazynie</p>
            <p className="text-sm text-gray-400 dark:text-slate-500 mb-6">Dodaj pierwszą rzecz, żeby zacząć śledzić swój magazyn.</p>
            <Link
              to="/add"
              className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-6 py-2.5 text-sm transition-colors"
            >
              Dodaj pierwszą rzecz
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map(item => (
              <InventoryCard
                key={item.id}
                item={item}
                onSell={() => setSellItem(item)}
                onEdit={() => setEditItem(item)}
                onDelete={() => handleDelete(item)}
                selectable={selectMode}
                selected={selectedIds.has(item.id)}
                onToggleSelect={() => toggleSelect(item.id)}
              />
            ))}
          </div>
        )}
      </div>

      <SellModal
        item={sellItem}
        open={!!sellItem}
        onClose={() => setSellItem(null)}
      />
      <EditItemModal
        item={editItem}
        open={!!editItem}
        onClose={() => setEditItem(null)}
      />
      <GroupSellModal
        items={selectedItems}
        open={groupSell}
        onClose={() => setGroupSell(false)}
        onSuccess={exitSelectMode}
      />

      {/* Floating action bar */}
      {selectMode && (
        <div
          className="fixed inset-x-4 md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-[480px] z-40 bg-slate-900 dark:bg-slate-700 text-white rounded-2xl shadow-xl px-4 py-3 flex items-center gap-3"
          style={{ bottom: 'calc(4rem + env(safe-area-inset-bottom) + 0.75rem)' }}
        >
          <div className="flex-1 min-w-0">
            {selectedIds.size === 0
              ? <p className="text-sm text-slate-400">Zaznacz rzeczy do sprzedaży</p>
              : <p className="text-sm font-medium">Zaznaczono: {selectedIds.size} {selectedIds.size === 1 ? 'rzecz' : selectedIds.size < 5 ? 'rzeczy' : 'rzeczy'}</p>
            }
          </div>
          {selectedIds.size >= 2 && (
            <button
              onClick={() => setGroupSell(true)}
              className="shrink-0 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
            >
              Sprzedaj razem
            </button>
          )}
          <button
            onClick={exitSelectMode}
            className="shrink-0 text-slate-400 hover:text-white p-1 transition-colors"
            aria-label="Anuluj"
          >
            <X size={18} />
          </button>
        </div>
      )}
    </div>
  )
}
