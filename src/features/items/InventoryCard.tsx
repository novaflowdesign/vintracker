import { useState } from 'react'
import { createPortal } from 'react-dom'
import { Package, Pencil, Trash2, X, Search, Check } from 'lucide-react'
import clsx from 'clsx'
import Button from '../../components/Button'
import SellModal from './SellModal'
import EditItemModal from './EditItemModal'
import { usePhotoUrl, useBundleChildren } from './queries'
import { formatCurrency, formatDate, daysSince } from '../../utils/format'
import type { Item } from '../../types/item'

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
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm p-4 flex flex-col gap-3 animate-pulse">
      <div className="flex gap-3">
        <div className="w-24 h-24 rounded-xl bg-gray-200 dark:bg-slate-700 shrink-0" />
        <div className="flex-1 space-y-2 pt-1">
          <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-3/4" />
          <div className="h-3 bg-gray-200 dark:bg-slate-700 rounded w-1/2" />
          <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-1/3 mt-3" />
          <div className="h-3 bg-gray-200 dark:bg-slate-700 rounded w-2/3" />
        </div>
      </div>
      <div className="h-9 bg-gray-200 dark:bg-slate-700 rounded-xl" />
    </div>
  )
}

// ── selectable checkbox overlay ───────────────────────────────────────────────

function SelectOverlay({ selected }: { selected: boolean }) {
  return (
    <div
      className={clsx(
        'absolute top-1.5 left-1.5 z-20 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all',
        selected
          ? 'bg-emerald-500 border-emerald-500'
          : 'bg-white/80 dark:bg-slate-800/80 border-gray-300 dark:border-slate-500',
      )}
    >
      {selected && <Check size={13} className="text-white" strokeWidth={3} />}
    </div>
  )
}

// ── bundle child row ──────────────────────────────────────────────────────────

function BundleChildRow({
  child,
  onSell,
  onEdit,
}: {
  child: Item
  onSell: () => void
  onEdit: () => void
}) {
  const profit =
    Number(child.sale_price ?? 0) -
    Number(child.shipping_cost_paid_by_seller) -
    Number(child.purchase_price)

  return (
    <div className="py-3 border-b border-gray-100 dark:border-slate-700 last:border-0">
      <div className="flex gap-3">
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
        </div>
      </div>

      <div className="flex gap-1.5 mt-2">
        <Button variant="secondary" size="sm" className="flex-1 justify-center" onClick={onEdit} aria-label="Edytuj">
          <Pencil size={14} />
        </Button>
        {child.status === 'IN_STOCK' ? (
          <Button variant="primary" size="sm" className="flex-1 justify-center" onClick={onSell}>
            Sprzedaj
          </Button>
        ) : (
          <Button variant="secondary" size="sm" className="flex-1 justify-center" onClick={onSell}>
            Edytuj sprzedaż
          </Button>
        )}
      </div>
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
  const [editChild, setEditChild] = useState<Item | null>(null)
  const { data: children = [] } = useBundleChildren(item.id)

  const total     = item.bundle_size ?? children.length
  const soldCount = children.filter(c => c.status === 'SOLD').length
  const progress  = total > 0 ? (soldCount / total) * 100 : 0
  const unitPrice = total > 0 ? Number(item.purchase_price) / total : Number(item.purchase_price)
  const days      = daysSince(item.purchase_date)

  return (
    <>
      <div
        className={clsx(
          'bg-white dark:bg-slate-800 rounded-2xl shadow-sm p-4 flex flex-col gap-3 relative transition-all',
          selectable && 'cursor-pointer',
          selectable && selected && 'ring-2 ring-emerald-500',
        )}
        onClick={selectable ? onToggleSelect : undefined}
      >
        {/* Children overlay */}
        {showOverlay && (
          <div className="absolute inset-0 bg-white dark:bg-slate-800 rounded-2xl z-10 flex flex-col">
            <div className="flex items-center justify-between px-4 pt-4 pb-2 border-b border-gray-100 dark:border-slate-700">
              <p className="text-sm font-semibold text-gray-900 dark:text-white">{item.title}</p>
              <button
                onClick={() => setShowOverlay(false)}
                className="text-gray-400 hover:text-gray-600 dark:text-slate-500 dark:hover:text-slate-300 p-1"
                aria-label="Zamknij"
              >
                <X size={18} />
              </button>
            </div>
            <div className="overflow-y-auto flex-1 px-4">
              {children.map(child => (
                <BundleChildRow
                  key={child.id}
                  child={child}
                  onSell={() => { setSellChild(child); setShowOverlay(false) }}
                  onEdit={() => { setEditChild(child); setShowOverlay(false) }}
                />
              ))}
            </div>
          </div>
        )}

        {/* Photo + info row */}
        <div className="flex gap-3">
          <div className="relative shrink-0 w-24">
            <PhotoThumbnail path={item.photo_path} className="w-full h-full min-h-20 rounded-xl overflow-hidden" />
            {selectable && <SelectOverlay selected={!!selected} />}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start gap-2">
              <p className="font-semibold text-gray-900 dark:text-white leading-tight flex-1 min-w-0">{item.title}</p>
              <span className="text-xs font-medium bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-400 rounded-lg px-2 py-0.5 shrink-0">
                Zestaw
              </span>
            </div>

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
              {formatDate(item.purchase_date)} · {days} {days === 1 ? 'dzień' : 'dni'} w mag.
            </p>

            <div className="mt-2">
              <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
                <span>{soldCount}/{total} sprzedanych</span>
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
        </div>

        {/* Buttons */}
        {!selectable && (
          <div className="flex gap-2">
            <Button
              variant="primary"
              size="md"
              className="flex-1"
              onClick={e => { e.stopPropagation(); setShowOverlay(true) }}
            >
              Sprzedaj
            </Button>
            <Button variant="ghost" size="md" onClick={e => { e.stopPropagation(); onEdit() }} aria-label="Edytuj">
              <Pencil size={18} />
            </Button>
            <Button
              variant="ghost"
              size="md"
              onClick={e => { e.stopPropagation(); onDelete() }}
              aria-label="Usuń"
              className="text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20"
            >
              <Trash2 size={18} />
            </Button>
          </div>
        )}
      </div>

      <SellModal
        item={sellChild}
        open={!!sellChild}
        onClose={() => setSellChild(null)}
      />
      <EditItemModal
        item={editChild}
        open={!!editChild}
        onClose={() => setEditChild(null)}
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
  const days = daysSince(item.purchase_date)

  return (
    <div
      className={clsx(
        'bg-white dark:bg-slate-800 rounded-2xl shadow-sm p-4 flex flex-col gap-3 transition-all',
        selectable && 'cursor-pointer',
        selectable && selected && 'ring-2 ring-emerald-500',
      )}
      onClick={selectable ? onToggleSelect : undefined}
    >
      {/* Photo + info row */}
      <div className="flex gap-3">
        <div className="relative shrink-0">
          <PhotoThumbnail path={item.photo_path} className="w-24 h-24 rounded-xl overflow-hidden" />
          {selectable && <SelectOverlay selected={!!selected} />}
        </div>

        <div className="flex-1 min-w-0">
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
            {formatDate(item.purchase_date)} · {days} {days === 1 ? 'dzień' : 'dni'} w magazynie
          </p>
        </div>
      </div>

      {/* Buttons */}
      {!selectable && (
        <div className="flex gap-2">
          <Button variant="primary" size="md" className="flex-1" onClick={onSell}>
            Sprzedane
          </Button>
          <Button variant="ghost" size="md" onClick={onEdit} aria-label="Edytuj">
            <Pencil size={18} />
          </Button>
          <Button
            variant="ghost"
            size="md"
            onClick={onDelete}
            aria-label="Usuń"
            className="text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20"
          >
            <Trash2 size={18} />
          </Button>
        </div>
      )}
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
