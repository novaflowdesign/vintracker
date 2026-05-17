import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import Modal from '../../components/Modal'
import Button from '../../components/Button'
import ItemFormFields from './ItemFormFields'
import { itemSchema, type ItemFormData } from './itemSchema'
import { useUpdateItem } from './queries'
import type { Item } from '../../types/item'

interface Props {
  item: Item | null
  open: boolean
  onClose: () => void
}

export default function EditItemModal({ item, open, onClose }: Props) {
  const updateItem = useUpdateItem()

  const form = useForm<ItemFormData>({
    resolver: zodResolver(itemSchema),
  })

  useEffect(() => {
    if (open && item) {
      form.reset({
        title:           item.title,
        description:     item.description ?? '',
        category:        item.category ?? '',
        brand:           item.brand ?? '',
        size:            item.size ?? '',
        condition:       item.condition ?? '',
        purchase_price:  Number(item.purchase_price),
        purchase_date:   item.purchase_date,
        purchase_source: item.purchase_source ?? '',
        notes:           item.notes ?? '',
      })
    }
  }, [open, item, form])

  async function onSubmit(data: ItemFormData) {
    if (!item) return
    try {
      await updateItem.mutateAsync({
        id: item.id,
        patch: {
          ...data,
          purchase_price: Number(data.purchase_price),
          description:    data.description || null,
          category:       data.category    || null,
          brand:          data.brand       || null,
          size:           data.size        || null,
          condition:      (data.condition  || null) as Item['condition'],
          purchase_source:(data.purchase_source || null) as Item['purchase_source'],
          notes:          data.notes       || null,
        },
      })
      toast.success('Zmiany zapisane')
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Wystąpił błąd')
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Edytuj rzecz" className="sm:max-w-lg">
      <form onSubmit={form.handleSubmit(onSubmit)} className="p-6 space-y-4">
        <ItemFormFields form={form} />

        <div className="flex gap-3 pt-2">
          <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>
            Anuluj
          </Button>
          <Button type="submit" className="flex-1" loading={updateItem.isPending}>
            Zapisz
          </Button>
        </div>
      </form>
    </Modal>
  )
}
