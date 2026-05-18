import { useEffect, useState, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ImagePlus, X } from 'lucide-react'
import { toast } from 'sonner'
import Modal from '../../components/Modal'
import Button from '../../components/Button'
import ItemFormFields from './ItemFormFields'
import { itemSchema, type ItemFormData } from './itemSchema'
import { useUpdateItem } from './queries'
import { uploadPhoto } from './api'
import type { Item } from '../../types/item'

interface Props {
  item: Item | null
  open: boolean
  onClose: () => void
}

export default function EditItemModal({ item, open, onClose }: Props) {
  const updateItem = useUpdateItem()

  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const form = useForm<ItemFormData, unknown, ItemFormData>({
    resolver: zodResolver(itemSchema) as any,
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
      setPhotoFile(null)
      setPhotoPreview(null)
    }
  }, [open, item, form])

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (photoPreview) URL.revokeObjectURL(photoPreview)
    setPhotoFile(file)
    setPhotoPreview(URL.createObjectURL(file))
  }

  function removePhoto() {
    if (photoPreview) URL.revokeObjectURL(photoPreview)
    setPhotoFile(null)
    setPhotoPreview(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  async function onSubmit(data: ItemFormData) {
    if (!item) return
    setUploading(true)
    try {
      let photoPatch: { photo_path?: string } = {}
      if (photoFile) {
        const path = await uploadPhoto(item.id, photoFile)
        photoPatch = { photo_path: path }
      }
      await updateItem.mutateAsync({
        id: item.id,
        patch: {
          ...data,
          ...photoPatch,
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
    } finally {
      setUploading(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Edytuj rzecz" className="sm:max-w-lg">
      <form onSubmit={form.handleSubmit(onSubmit)} className="p-6 space-y-4">

        {/* Photo */}
        <div>
          <p className="text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">Zdjęcie</p>
          {photoPreview ? (
            <div className="relative w-32 h-32 rounded-xl overflow-hidden">
              <img src={photoPreview} alt="" className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={removePhoto}
                className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-1 hover:bg-black/80"
              >
                <X size={14} />
              </button>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center w-32 h-32 border-2 border-dashed border-gray-300 dark:border-slate-600 rounded-xl cursor-pointer hover:border-emerald-500 hover:bg-emerald-50 transition-colors">
              {item?.photo_path ? (
                <span className="text-xs text-gray-400 dark:text-slate-500 text-center px-2">Kliknij, aby zmienić zdjęcie</span>
              ) : (
                <>
                  <ImagePlus size={24} className="text-gray-400 dark:text-slate-500" />
                  <span className="text-xs text-gray-400 dark:text-slate-500 mt-1">Dodaj zdjęcie</span>
                </>
              )}
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePhotoChange}
              />
            </label>
          )}
        </div>

        <ItemFormFields form={form} />

        <div className="flex gap-3 pt-2">
          <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>
            Anuluj
          </Button>
          <Button type="submit" className="flex-1" loading={updateItem.isPending || uploading}>
            Zapisz
          </Button>
        </div>
      </form>
    </Modal>
  )
}
