import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import Modal from '../../components/Modal'
import Input from '../../components/Input'
import Button from '../../components/Button'
import { useMarkAsSold } from './queries'
import { formatCurrency } from '../../utils/format'
import type { Item } from '../../types/item'

const today = new Date().toISOString().split('T')[0]

const schema = z.object({
  sale_price: z.coerce.number().min(0.01, 'Cena musi być większa od 0'),
  sale_date:  z.string().min(1, 'Data jest wymagana'),
})
type FormData = z.infer<typeof schema>

interface Props {
  items: Item[]
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

function split(items: Item[], totalPrice: number) {
  const totalPurchase = items.reduce((s, i) => s + Number(i.purchase_price), 0)
  return items.map(item => {
    const share     = totalPurchase > 0 ? Number(item.purchase_price) / totalPurchase : 1 / items.length
    const salePrice = totalPrice * share
    const profit    = salePrice - Number(item.purchase_price)
    return { item, salePrice, profit }
  })
}

export default function GroupSellModal({ items, open, onClose, onSuccess }: Props) {
  const markAsSold = useMarkAsSold()
  const [submitting, setSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } = useForm<FormData, unknown, FormData>({
    resolver: zodResolver(schema) as any,
    defaultValues: { sale_date: today },
  })

  useEffect(() => {
    if (open) reset({ sale_price: '' as unknown as number, sale_date: today })
  }, [open, reset])

  const totalSalePrice = Number(watch('sale_price') ?? 0)
  const rows           = split(items, totalSalePrice)
  const totalProfit    = rows.reduce((s, r) => s + r.profit, 0)

  async function onSubmit(data: FormData) {
    setSubmitting(true)
    try {
      await Promise.all(
        split(items, data.sale_price).map(({ item, salePrice }) =>
          markAsSold.mutateAsync({ id: item.id, sale: { sale_price: salePrice, sale_date: data.sale_date } })
        )
      )
      toast.success(`Sprzedano ${items.length} rzeczy za ${formatCurrency(data.sale_price)}`)
      reset()
      onClose()
      onSuccess()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Wystąpił błąd')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={`Sprzedaj ${items.length} rzeczy razem`}>
      <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">

        {/* Per-item breakdown */}
        <div className="space-y-2">
          {rows.map(({ item, salePrice, profit }) => (
            <div key={item.id} className="flex items-center gap-2 text-sm">
              <span className="flex-1 min-w-0 truncate text-gray-800 dark:text-slate-200">{item.title}</span>
              <span className="shrink-0 text-slate-400 dark:text-slate-500">
                {formatCurrency(Number(item.purchase_price))}
              </span>
              {totalSalePrice > 0 && (
                <>
                  <span className="shrink-0 text-slate-400 dark:text-slate-500">→</span>
                  <span className="shrink-0 text-gray-700 dark:text-slate-300">{formatCurrency(salePrice)}</span>
                  <span className={`shrink-0 font-medium ${profit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    ({profit >= 0 ? '+' : ''}{formatCurrency(profit)})
                  </span>
                </>
              )}
            </div>
          ))}
        </div>

        <p className="text-xs text-slate-400 dark:text-slate-500">
          Cena podzielona proporcjonalnie do ceny zakupu każdej rzeczy.
        </p>

        <div className="border-t border-gray-100 dark:border-slate-700" />

        <Input
          label="Łączna cena sprzedaży *"
          type="number"
          min="0.01"
          step="0.01"
          suffix="zł"
          error={errors.sale_price?.message}
          {...register('sale_price')}
        />

        <Input
          label="Data sprzedaży *"
          type="date"
          error={errors.sale_date?.message}
          {...register('sale_date')}
        />

        {totalSalePrice > 0 && (
          <div className="rounded-xl bg-gray-50 dark:bg-slate-700 p-4 space-y-1 text-sm">
            <div className="flex justify-between text-gray-600 dark:text-slate-300">
              <span>Łączny przychód</span>
              <span>{formatCurrency(totalSalePrice)}</span>
            </div>
            <div className="flex justify-between font-semibold dark:text-white">
              <span>Łączny zysk</span>
              <span className={totalProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
                {totalProfit >= 0 ? '+' : ''}{formatCurrency(totalProfit)}
              </span>
            </div>
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>Anuluj</Button>
          <Button type="submit" className="flex-1" loading={submitting}>
            Sprzedaj ({items.length} szt.)
          </Button>
        </div>
      </form>
    </Modal>
  )
}
