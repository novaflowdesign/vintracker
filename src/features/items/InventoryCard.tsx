import { useState } from 'react'
import { createPortal } from 'react-dom'
import { Package, Pencil, Trash2, X, Search, Check, Truck, Warehouse } from 'lucide-react'
import clsx from 'clsx'
import Button from '../../components/Button'
import SellModal from './SellModal'
import GroupSellModal from './GroupSellModal'
import { usePhotoUrl, useBundleChildren } from './queries'
import { formatCurrency, formatDate, daysSince } from '../../utils/format'
import type { Item } from '../../types/item'

// ── delivery status helpers ───────────────────────────────────────────────────

function inDelivery(item: Item): boolean {
  if (!item.received_date) return false
  return new Date(item.received_date) > new Date()
}

function effectiveDays(item: Item): number {
  const start = item.received_date && !inDelivery(item)
    ? item.received_date
    : item.purchase_date
  return daysSince(start)
}

function StatusBadge({ item }: { item: Item }) {
  if (inDelivery(item)) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400 rounded-lg px-2 py-0.5 shrink-0">
        <Truck size={10} />W dostawie
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400 rounded-lg px-2 py-0.5 shrink-0">
      <Warehouse size={10} />W magazynie
    </span>
  )
}

// ── shared thumbnail ──────────────────────────────────────────────────────────

function PhotoThumbnail({ path, className = '' }: { path: string | null; className?: string }) {
  const { data: url } = usePhotoUrl(path)
  const [lightbox, setLightbox] = useState(false)

  if (!path || !url) {
    return (
      <div className={`bg-gray-100 dark:bg-slate-700 flex items-center justify-center ${className}`}>
        <Package size={24} className="text-gray-300 dark:text-slate-600" />
      </div>
    )
  }

  return (
    <>
      <div
        className={`relative cursor-pointer group ${className}`}
        onClick={() => setLightbox(true)}
      >
        <img src={url} alt="" loading="lazy" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/25 transition-colors flex items-center justify-center">
          <Search size={16} className="text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow" />
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

// ── skeleton ──────────────────────────────────────────────────────────────────

export function CardSkeleton() {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm overflow-hidden animate-pulse flex sm:flex-col">
      <div className="w-2/5 shrink-0 min-h-[180px] sm:w-full sm:min-h-0 sm:aspect-[4/3] bg-gray-200 dark:bg-slate-700" />
      <div className="flex-1 p-4 flex flex-col gap-2">
        <div className="flex gap-1">
          <div className="h-5 bg-gray-200 dark:bg-slate-700 rounded-lg w-20" />
        </div>
        <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-3/4" />
        <div className="h-3 bg-gray-200 dark:bg-slate-700 rounded w-1/2" />
        <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-1/3 mt-2" />
        <div className="h-3 bg-gray-200 dark:bg-slate-700 rounded w-2/3" />
        <div className="flex-1" />
        <div className="h-11 bg-gray-200 dark:bg-slate-700 rounded-xl" />
        <div className="flex gap-2">
          <div className="flex-1 h-11 bg-gray-200 dark:bg-slate-700 rounded-xl" />
          <div className="flex-1 h-11 bg-gray-200 dark:bg-slate-700 rounded-xl" />
        </div>
      </div>
    </div>
  )
}

// ── selectable checkbox overlay ───────────────────────────────────────────────

function SelectOverlay({ selected }: { selected: boolean }) {
  return (
    <div
      className={clsx(
        'absolute top-2 left-2 z-20 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all',
        selected
          ? 'bg-emerald-500 border-emerald-500'
          : 'bg-white/80 dark:bg-slate-800/80 border-gray-300 dark:border-slate-500',
      )}
    >
      {selected && <Check size={13} className="text-white" strokeWidth={3} />}
    </div>
  )
}

// ── action buttons ────────────────────────────────────────────────────────────

function ActionButtons({
  onPrimary,
  primaryLabel,
  onEdit,
  onDelete,
}: {
  onPrimary: (e: React.MouseEvent) => void
  primaryLabel: string
  onEdit: (e: React.MouseEvent) => void
  onDelete: (e: React.MouseEvent) => void
}) {
  return (
    <div className="flex flex-col gap-2 mt-3">
      <button
        onClick={onPrimary}
        className="w-full flex items-center justify-center rounded-xl font-medium transition-colors py-3 text-sm bg-emerald-600 hover:bg-emerald-700 text-white"
      >
        {primaryLabel}
      </button>
      <div className="flex gap-2">
        <button
          onClick={onEdit}
          aria-label="Edytuj"
          className="flex-1 flex items-center justify-center rounded-xl transition-colors py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600"
        >
          <Pencil size={18} className="text-slate-500 dark:text-slate-300" />
        </button>
        <button
          onClick={onDelete}
          aria-label="Usuń"
          className="flex-1 flex items-center justify-center rounded-xl transition-colors py-3 bg-rose-100 hover:bg-rose-200 dark:bg-rose-900/30 dark:hover:bg-rose-900/50"
        >
          <Trash2 size={18} className="text-rose-600 dark:text-rose-500" />
        </button>
      </div>
    </div>
  )
}

// ── bundle child row ──────────────────────────────────────────────────────────

function BundleChildRow({
  child,
  onSell,
  selectable,
  selected,
  onToggleSelect,
}: {
  child: Item
  onSell: () => void
  selectable?: boolean
  selected?: boolean
  onToggleSelect?: () => void
}) {
  const profit =
    Number(child.sale_price ?? 0) -
    Number(child.shipping_cost_paid_by_seller) -
    Number(child.purchase_price)

  const canSelect = selectable && child.status === 'IN_STOCK'

  return (
    <div
      className={clsx(
        'py-3 border-b border-gray-100 dark:border-slate-700 last:border-0',
        canSelect && 'cursor-pointer',
      )}
      onClick={canSelect ? onToggleSelect : undefined}
    >
      <div className="flex gap-3 items-center">
        {canSelect && (
          <div className={clsx(
            'w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all',
            selected
              ? 'bg-emerald-500 border-emerald-500'
              : 'border-gray-300 dark:border-slate-500 bg-white dark:bg-slate-800',
          )}>
            {selected && <Check size={11} className="text-white" strokeWidth={3} />}
          </div>
        )}
        <PhotoThumbnail path={child.photo_path} className="w-12 h-12 rounded-xl shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{child.title}</p>
          <p className="text-xs text-slate-400 dark:text-slate-500">
            Zakup: {formatCurrency(Number(child.purchase_price))}
          </p>
          {child.status === 'SOLD' && child.sale_date && (
            <p className="text-xs text-slate-400">
              Sprzedano {formatDate(child.sale_date)} ·{' '}
              <span className={profit >= 0 ? 'text-emerald-600 font-medium' : 'text-rose-600 font-medium'}>
                {profit >= 0 ? '+' : ''}{formatCurrency(profit)}
              </span>
            </p>
          )}
          {child.status === 'IN_STOCK' && selectable && (
            <p className="text-xs text-slate-400 dark:text-slate-500">
              {formatCurrency(Number(child.purchase_price))} cena zakupu
            </p>
          )}
        </div>
      </div>
      {!selectable && (
        <div className="mt-2">
          {child.status === 'IN_STOCK' ? (
            <Button variant="primary" size="sm" className="w-full justify-center" onClick={onSell}>
              Sprzedaj
            </Button>
          ) : (
            <Button variant="secondary" size="sm" className="w-full justify-center" onClick={onSell}>
              Edytuj sprzedaż
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

// ── bundle card ───────────────────────────────────────────────────────────────

function BundleCard({
  item,
  onEdit,
  onDelete,
  selectable,
  selected,
  onToggleSelect,
}: {
  item: Item
  onEdit: () => void
  onDelete: () => void
  selectable?: boolean
  selected?: boolean
  onToggleSelect?: () => void
}) {
  const [showOverlay, setShowOverlay] = useState(false)
  const [sellChild, setSellChild] = useState<Item | null>(null)
  const [multiSell, setMultiSell] = useState(false)
  const [selectedChildIds, setSelectedChildIds] = useState<Set<string>>(new Set())
  const [groupSellItems, setGroupSellItems] = useState<Item[]>([])
  const { data: children = [] } = useBundleChildren(item.id)

  function toggleChildSelect(id: string) {
    setSelectedChildIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function exitMultiSell() {
    setMultiSell(false)
    setSelectedChildIds(new Set())
  }

  const total      = item.bundle_size ?? children.length
  const soldCount  = children.filter(c => c.status === 'SOLD').length
  const progress   = total > 0 ? (soldCount / total) * 100 : 0
  const unitPrice  = total > 0 ? Number(item.purchase_price) / total : Number(item.purchase_price)
  const days       = effectiveDays(item)
  const delivering = inDelivery(item)

  return (
    <>
      <div
        className={clsx(
          'bg-white dark:bg-slate-800 rounded-2xl shadow-sm overflow-hidden relative transition-all',
          'flex sm:flex-col',
          selectable && 'cursor-pointer',
          selectable && selected && 'ring-2 ring-emerald-500',
        )}
        onClick={selectable ? onToggleSelect : undefined}
      >
        {/* Children overlay */}
        {showOverlay && (
          <div className="absolute inset-0 bg-white dark:bg-slate-800 rounded-2xl z-10 flex flex-col">
            <div className="flex items-center justify-between px-4 pt-4 pb-2 border-b border-gray-100 dark:border-slate-700">
              <p className="text-sm font-semibold text-gray-900 dark:text-white truncate flex-1 min-w-0 mr-2">{item.title}</p>
              <div className="flex items-center gap-1 shrink-0">
                {children.some(c => c.status === 'IN_STOCK') && (
                  multiSell ? (
                    <button
                      onClick={exitMultiSell}
                      className="text-xs font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 px-2 py-1 rounded-lg transition-colors"
                    >
                      Anuluj
                    </button>
                  ) : (
                    <button
                      onClick={() => setMultiSell(true)}
                      className="text-xs font-medium text-emerald-600 hover:text-emerald-700 px-2 py-1 rounded-lg transition-colors"
                    >
                      Zaznacz kilka
                    </button>
                  )
                )}
                <button
                  onClick={() => { setShowOverlay(false); exitMultiSell() }}
                  className="text-gray-400 hover:text-gray-600 dark:text-slate-500 dark:hover:text-slate-300 p-1"
                  aria-label="Zamknij"
                >
                  <X size={18} />
                </button>
              </div>
            </div>
            <div className="overflow-y-auto flex-1 px-4">
              {children.map(child => (
                <BundleChildRow
                  key={child.id}
                  child={child}
                  onSell={() => { setSellChild(child); setShowOverlay(false) }}
                  selectable={multiSell}
                  selected={selectedChildIds.has(child.id)}
                  onToggleSelect={() => toggleChildSelect(child.id)}
                />
              ))}
            </div>
            {multiSell && selectedChildIds.size > 0 && (
              <div className="px-4 py-3 border-t border-gray-100 dark:border-slate-700">
                <button
                  onClick={() => {
                    const items = children.filter(c => selectedChildIds.has(c.id) && c.status === 'IN_STOCK')
                    setGroupSellItems(items)
                  }}
                  className="w-full flex items-center justify-center rounded-xl font-medium transition-colors py-3 text-sm bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  Sprzedaj {selectedChildIds.size} szt. razem
                </button>
              </div>
            )}
          </div>
        )}

        {/* Photo */}
        <div className="relative w-2/5 shrink-0 sm:w-full">
          <PhotoThumbnail path={item.photo_path} className="w-full h-full min-h-[180px] sm:min-h-0 sm:aspect-[4/3]" />
          {selectable && <SelectOverlay selected={!!selected} />}
        </div>

        {/* Info + buttons */}
        <div className="flex-1 flex flex-col p-4 min-w-0">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap gap-1 mb-1.5">
              <span className="text-xs font-medium bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-400 rounded-lg px-2 py-0.5">
                Zestaw
              </span>
              <StatusBadge item={item} />
            </div>
            <p className="font-semibold text-gray-900 dark:text-white leading-tight">{item.title}</p>

            {item.category && (
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{item.category}</p>
            )}

            <p className="text-base font-semibold text-gray-800 dark:text-slate-100 mt-2">
              {formatCurrency(Number(item.purchase_price))}
              <span className="text-xs font-normal text-slate-400 dark:text-slate-500 ml-1">
                ({formatCurrency(unitPrice)}/szt.)
              </span>
            </p>

            <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">
              {delivering
                ? <>Zakup: {formatDate(item.purchase_date)} · dostawa: {formatDate(item.received_date!)}</>
                : <>{formatDate(item.received_date ?? item.purchase_date)} · {days} {days === 1 ? 'dzień' : 'dni'} w mag.</>
              }
            </p>

            <div className="mt-2">
              <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
                <span>{soldCount}/{total} sprzed.</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-gray-100 dark:bg-slate-700 overflow-hidden">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          </div>

          {!selectable && (
            <ActionButtons
              primaryLabel="Sprzedaj"
              onPrimary={e => { e.stopPropagation(); setShowOverlay(true) }}
              onEdit={e => { e.stopPropagation(); onEdit() }}
              onDelete={e => { e.stopPropagation(); onDelete() }}
            />
          )}
        </div>
      </div>

      <SellModal
        item={sellChild}
        open={!!sellChild}
        onClose={() => setSellChild(null)}
      />
      <GroupSellModal
        items={groupSellItems}
        open={groupSellItems.length > 0}
        onClose={() => setGroupSellItems([])}
        onSuccess={() => { setGroupSellItems([]); exitMultiSell(); setShowOverlay(false) }}
      />
    </>
  )
}

// ── regular card ──────────────────────────────────────────────────────────────

function RegularCard({
  item,
  onSell,
  onEdit,
  onDelete,
  selectable,
  selected,
  onToggleSelect,
}: {
  item: Item
  onSell: () => void
  onEdit: () => void
  onDelete: () => void
  selectable?: boolean
  selected?: boolean
  onToggleSelect?: () => void
}) {
  const days = effectiveDays(item)
  const delivering = inDelivery(item)

  return (
    <div
      className={clsx(
        'bg-white dark:bg-slate-800 rounded-2xl shadow-sm overflow-hidden transition-all',
        'flex sm:flex-col',
        selectable && 'cursor-pointer',
        selectable && selected && 'ring-2 ring-emerald-500',
      )}
      onClick={selectable ? onToggleSelect : undefined}
    >
      {/* Photo */}
      <div className="relative w-2/5 shrink-0 sm:w-full">
        <PhotoThumbnail path={item.photo_path} className="w-full h-full min-h-[180px] sm:min-h-0 sm:aspect-[4/3]" />
        {selectable && <SelectOverlay selected={!!selected} />}
      </div>

      {/* Info + buttons */}
      <div className="flex-1 flex flex-col p-4 min-w-0">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap gap-1 mb-1.5">
            <StatusBadge item={item} />
          </div>

          <p className="font-semibold text-gray-900 dark:text-white leading-tight">{item.title}</p>

          {(item.brand || item.size) && (
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              {[item.brand, item.size].filter(Boolean).join(' · ')}
            </p>
          )}

          <p className="text-base font-semibold text-gray-800 dark:text-slate-100 mt-2">
            {formatCurrency(Number(item.purchase_price))}
          </p>

          <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">
            {delivering
              ? <>Zakup: {formatDate(item.purchase_date)} · dostawa: {formatDate(item.received_date!)}</>
              : <>{formatDate(item.received_date ?? item.purchase_date)} · {days} {days === 1 ? 'dzień' : 'dni'} w mag.</>
            }
          </p>
        </div>

        {!selectable && (
          <ActionButtons
            primaryLabel="Sprzedaj"
            onPrimary={onSell}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        )}
      </div>
    </div>
  )
}

// ── exported card ─────────────────────────────────────────────────────────────

interface Props {
  item: Item
  onSell: () => void
  onEdit: () => void
  onDelete: () => void
  selectable?: boolean
  selected?: boolean
  onToggleSelect?: () => void
}

export default function InventoryCard({ item, onSell, onEdit, onDelete, selectable, selected, onToggleSelect }: Props) {
  const isBundle = item.bundle_size != null && item.bundle_id == null
  return isBundle
    ? <BundleCard item={item} onEdit={onEdit} onDelete={onDelete} selectable={selectable} selected={selected} onToggleSelect={onToggleSelect} />
    : <RegularCard item={item} onSell={onSell} onEdit={onEdit} onDelete={onDelete} selectable={selectable} selected={selected} onToggleSelect={onToggleSelect} />
}
