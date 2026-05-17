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
  sale_price:                    z.coerce.number().min(0, 'Cena nie może być ujemna'),
  sale_date:                     z.string().min(1, 'Data jest wymagana'),
  shipping_cost_paid_by_seller:  z.coerce.number().min(0).default(0),
  buyer_country:                 z.string().optional(),
})

type FormData = z.infer<typeof schema>

interface Props {
  item: Item | null
  open: boolean
  onClose: () => void
}

export default function SellModal({ item, open, onClose }: Props) {
  const markAsSold = useMarkAsSold()

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { sale_date: today, shipping_cost_paid_by_seller: 0 },
  })

  const salePrice   = Number(watch('sale_price') ?? 0)
  const shipping    = Number(watch('shipping_cost_paid_by_seller') ?? 0)
  const purchase    = Number(item?.purchase_price ?? 0)
  const profit      = salePrice - shipping - purchase
  const marginPct   = salePrice > 0 ? (profit / salePrice) * 100 : 0

  async function onSubmit(data: FormData) {
    if (!item) return
    try {
      await markAsSold.mutateAsync({ id: item.id, sale: data })
      toast.success(
        `Sprzedano za ${formatCurrency(data.sale_price)}, zysk ${formatCurrency(profit)}`,
      )
      reset()
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Wystąpił błąd')
    }
  }

  function handleClose() {
    reset()
    onClose()
  }

  return (
    <Modal open={open} onClose={handleClose} title="Oznacz jako sprzedane">
      <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
        {item && (
          <p className="font-medium text-gray-900 truncate">{item.title}</p>
        )}

        <Input
          label="Cena sprzedaży *"
          type="number"
          min="0"
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

        <Input
          label="Koszt wysyłki (Twój)"
          type="number"
          min="0"
          step="0.01"
          suffix="zł"
          error={errors.shipping_cost_paid_by_seller?.message}
          {...register('shipping_cost_paid_by_seller')}
        />

        <Input
          label="Kraj kupującego"
          placeholder="np. PL"
          error={errors.buyer_country?.message}
          {...register('buyer_country')}
        />

        {/* Live preview */}
        <div className="rounded-xl bg-gray-50 p-4 space-y-1 text-sm">
          <div className="flex justify-between text-gray-600">
            <span>Przychód</span>
            <span>{formatCurrency(salePrice)}</span>
          </div>
          <div className="flex justify-between font-semibold">
            <span>Twój zysk</span>
            <span className={profit >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
              {formatCurrency(profit)}
            </span>
          </div>
          <div className="flex justify-between text-gray-500">
            <span>Marża</span>
            <span>{marginPct.toFixed(1)} %</span>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <Button type="button" variant="secondary" className="flex-1" onClick={handleClose}>
            Anuluj
          </Button>
          <Button type="submit" className="flex-1" loading={markAsSold.isPending}>
            Zapisz sprzedaż
          </Button>
        </div>
      </form>
    </Modal>
  )
}
