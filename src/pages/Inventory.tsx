import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Package, Search } from 'lucide-react'
import { toast } from 'sonner'
import InventoryCard, { CardSkeleton } from '../features/items/InventoryCard'
import SellModal from '../features/items/SellModal'
import EditItemModal from '../features/items/EditItemModal'
import Select from '../components/Select'
import { useItems, useDeleteItem } from '../features/items/queries'
import { CATEGORIES } from '../lib/constants'
import type { Item } from '../types/item'
import type { SortOrder } from '../features/items/api'

const SORT_OPTIONS = [
  { value: 'newest',     label: 'Najnowsze' },
  { value: 'oldest',     label: 'Najstarsze' },
  { value: 'price_desc', label: 'Najdroższe' },
]

const CATEGORY_OPTIONS = [
  { value: '', label: 'Wszystkie kategorie' },
  ...CATEGORIES.map(c => ({ value: c, label: c })),
]

export default function Inventory() {
  const [search,   setSearch]   = useState('')
  const [category, setCategory] = useState('')
  const [sort,     setSort]     = useState<SortOrder>('newest')

  const [sellItem, setSellItem] = useState<Item | null>(null)
  const [editItem, setEditItem] = useState<Item | null>(null)

  const { data: items, isLoading } = useItems({
    status:   'IN_STOCK',
    search:   search   || undefined,
    category: category || undefined,
    sort,
  })

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

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      <div className="mx-auto max-w-5xl px-4 pt-6">
        <h1 className="text-xl font-bold text-gray-900 mb-4">Magazyn</h1>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              type="search"
              placeholder="Szukaj po tytule..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
            />
          </div>
          <Select
            options={CATEGORY_OPTIONS}
            value={category}
            onChange={e => setCategory(e.target.value)}
            className="sm:w-48"
          />
          <Select
            options={SORT_OPTIONS}
            value={sort}
            onChange={e => setSort(e.target.value as SortOrder)}
            className="sm:w-44"
          />
        </div>

        {/* Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)}
          </div>
        ) : !items?.length ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <Package size={56} className="text-gray-200 mb-4" />
            <p className="text-lg font-semibold text-gray-400">Brak rzeczy w magazynie</p>
            <p className="text-sm text-gray-400 mb-6">Dodaj pierwszą rzecz, żeby zacząć śledzić swój magazyn.</p>
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
    </div>
  )
}
