import { useState, useEffect, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from 'react-router-dom'
import { ImagePlus, X } from 'lucide-react'
import { toast } from 'sonner'
import Button from '../components/Button'
import { itemSchema, type ItemFormData } from '../features/items/itemSchema'
import ItemFormFields from '../features/items/ItemFormFields'
import { useCreateItem, useUpdateItem } from '../features/items/queries'
import { uploadPhoto } from '../features/items/api'

export default function AddItem() {
  const navigate = useNavigate()
  const createItem = useCreateItem()
  const updateItem = useUpdateItem()

  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(
    () => () => { if (photoPreview) URL.revokeObjectURL(photoPreview) },
    [photoPreview],
  )

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

  const form = useForm<ItemFormData>({ resolver: zodResolver(itemSchema) })

  async function onSubmit(data: ItemFormData) {
    setSubmitting(true)
    try {
      const item = await createItem.mutateAsync({
        ...data,
        purchase_price:  Number(data.purchase_price),
        description:     data.description     || null,
        category:        data.category        || null,
        brand:           data.brand           || null,
        size:            data.size            || null,
        condition:       data.condition       || null,
        purchase_source: data.purchase_source || null,
        notes:           data.notes           || null,
      })

      if (photoFile) {
        try {
          const path = await uploadPhoto(item.id, photoFile)
          await updateItem.mutateAsync({ id: item.id, patch: { photo_path: path } })
        } catch {
          toast.warning('Rzecz dodana, ale zdjęcie nie zostało przesłane.')
          navigate('/inventory')
          return
        }
      }

      toast.success('Rzecz dodana do magazynu!')
      navigate('/inventory')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Wystąpił błąd')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      <div className="mx-auto max-w-2xl px-4 pt-6">
        <h1 className="text-xl font-bold text-gray-900 mb-6">Dodaj rzecz</h1>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {/* Photo picker */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Zdjęcie</p>
            {photoPreview ? (
              <div className="relative w-40 h-40 rounded-xl overflow-hidden">
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
              <label className="flex flex-col items-center justify-center w-40 h-40 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-emerald-500 hover:bg-emerald-50 transition-colors">
                <ImagePlus size={28} className="text-gray-400" />
                <span className="text-xs text-gray-400 mt-2">Dodaj zdjęcie</span>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={handlePhotoChange}
                />
              </label>
            )}
          </div>

          <ItemFormFields form={form} />

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="secondary"
              className="flex-1"
              onClick={() => navigate('/')}
            >
              Anuluj
            </Button>
            <Button type="submit" className="flex-1" loading={submitting}>
              Dodaj do magazynu
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
