import { Package, Pencil, Trash2 } from 'lucide-react'
import Button from '../../components/Button'
import { usePhotoUrl } from './queries'
import { formatCurrency, daysSince, formatDate } from '../../utils/format'
import type { Item } from '../../types/item'

function PhotoThumbnail({ path }: { path: string | null }) {
  const { data: url } = usePhotoUrl(path)

  if (!path || !url) {
    return (
      <div className="aspect-square w-full bg-gray-100 flex items-center justify-center">
        <Package size={40} className="text-gray-300" />
      </div>
    )
  }

  return (
    <img
      src={url}
      alt=""
      loading="lazy"
      className="aspect-square w-full object-cover"
    />
  )
}

export function CardSkeleton() {
  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden animate-pulse">
      <div className="aspect-square bg-gray-200" />
      <div className="p-4 space-y-2">
        <div className="h-4 bg-gray-200 rounded w-3/4" />
        <div className="h-3 bg-gray-200 rounded w-1/2" />
        <div className="h-3 bg-gray-200 rounded w-1/3" />
        <div className="mt-4 h-8 bg-gray-200 rounded-xl" />
      </div>
    </div>
  )
}

interface Props {
  item: Item
  onSell: () => void
  onEdit: () => void
  onDelete: () => void
}

export default function InventoryCard({ item, onSell, onEdit, onDelete }: Props) {
  const days = daysSince(item.purchase_date)

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden flex flex-col">
      <div className="overflow-hidden">
        <PhotoThumbnail path={item.photo_path} />
      </div>

      <div className="p-4 flex flex-col flex-1">
        <p className="font-semibold text-gray-900 truncate">{item.title}</p>

        {(item.brand || item.size) && (
          <p className="text-sm text-slate-500 mt-0.5">
            {[item.brand, item.size].filter(Boolean).join(' · ')}
          </p>
        )}

        <p className="text-sm text-gray-600 mt-2">
          Kupione za{' '}
          <span className="font-medium">{formatCurrency(Number(item.purchase_price))}</span>
        </p>
        <p className="text-xs text-gray-400">
          {formatDate(item.purchase_date)} · {days} {days === 1 ? 'dzień' : 'dni'} w magazynie
        </p>

        <div className="mt-auto pt-4 flex gap-2">
          <Button variant="primary" size="sm" className="flex-1" onClick={onSell}>
            Sprzedane
          </Button>
          <Button variant="ghost" size="sm" onClick={onEdit} aria-label="Edytuj">
            <Pencil size={16} />
          </Button>
          <Button variant="ghost" size="sm" onClick={onDelete} aria-label="Usuń"
            className="text-rose-500 hover:bg-rose-50">
            <Trash2 size={16} />
          </Button>
        </div>
      </div>
    </div>
  )
}
