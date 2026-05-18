import { useState, useEffect, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from 'react-router-dom'
import { ImagePlus, X, Package } from 'lucide-react'
import { toast } from 'sonner'
import Button from '../components/Button'
import Input from '../components/Input'
import { itemSchema, type ItemFormData } from '../features/items/itemSchema'
import ItemFormFields from '../features/items/ItemFormFields'
import { useCreateItem, useCreateBundle, useUpdateItem } from '../features/items/queries'
import { uploadPhoto } from '../features/items/api'
import { formatCurrency } from '../utils/format'

export default function AddItem() {
  const navigate = useNavigate()
  const createItem = useCreateItem()
  const createBundle = useCreateBundle()
  const updateItem = useUpdateItem()

  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [isBundle, setIsBundle] = useState(false)
  const [bundleSizeInput, setBundleSizeInput] = useState('2')
  const bundleSize = Math.max(2, parseInt(bundleSizeInput) || 2)
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const form = useForm<ItemFormData, unknown, ItemFormData>({ resolver: zodResolver(itemSchema) as any })
  const watchedPrice = form.watch('purchase_price')
  const totalPrice = Number(watchedPrice) || 0
  const unitPrice = isBundle && bundleSize >= 2 ? totalPrice / bundleSize : null

  async function onSubmit(data: ItemFormData) {
    setSubmitting(true)
    try {
      const input = {
        ...data,
        purchase_price:  Number(data.purchase_price),
        description:     data.description     || null,
        category:        data.category        || null,
        brand:           data.brand           || null,
        size:            data.size            || null,
        condition:       data.condition       || null,
        purchase_source: data.purchase_source || null,
        notes:           data.notes           || null,
      }

      if (isBundle) {
        const { parent } = await createBundle.mutateAsync({ input, bundleSize })
        if (photoFile) {
          try {
            const path = await uploadPhoto(parent.id, photoFile)
            await updateItem.mutateAsync({ id: parent.id, patch: { photo_path: path } })
          } catch {
            toast.warning('Zestaw dodany, ale zdjęcie nie zostało przesłane.')
            navigate('/inventory')
            return
          }
        }
        toast.success(`Zestaw (${bundleSize} szt.) dodany do magazynu!`)
      } else {
        const item = await createItem.mutateAsync(input)
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
      }

      navigate('/inventory')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Wystąpił błąd')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 pb-8">
      <div className="mx-auto max-w-2xl px-4 pt-6">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Dodaj rzecz</h1>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {/* Photo picker */}
          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">Zdjęcie</p>
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
              <label className="flex flex-col items-center justify-center w-40 h-40 border-2 border-dashed border-gray-300 dark:border-slate-600 rounded-xl cursor-pointer hover:border-emerald-500 hover:bg-emerald-50 transition-colors">
                <ImagePlus size={28} className="text-gray-400 dark:text-slate-500" />
                <span className="text-xs text-gray-400 dark:text-slate-500 mt-2">Dodaj zdjęcie</span>
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

          {/* Bundle toggle */}
          <label className="flex items-center gap-3 p-4 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 cursor-pointer hover:border-violet-400 transition-colors">
            <input
              type="checkbox"
              checked={isBundle}
              onChange={e => setIsBundle(e.target.checked)}
              className="w-4 h-4 accent-violet-600"
            />
            <Package size={18} className="text-violet-600 shrink-0" />
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">Dodaj jako zestaw</p>
              <p className="text-xs text-slate-400 dark:text-slate-500">Cena zostanie podzielona równo na każdy przedmiot</p>
            </div>
          </label>

          {/* Bundle size input */}
          {isBundle && (
            <div className="bg-violet-50 dark:bg-violet-900/20 rounded-xl p-4 space-y-3">
              <Input
                label="Liczba przedmiotów w zestawie"
                type="number"
                min={2}
                max={200}
                value={bundleSizeInput}
                onChange={e => setBundleSizeInput(e.target.value)}
                onBlur={() => setBundleSizeInput(String(Math.max(2, parseInt(bundleSizeInput) || 2)))}
              />
              {unitPrice !== null && totalPrice > 0 && (
                <p className="text-sm text-violet-700 dark:text-violet-400 font-medium">
                  Cena za sztukę: {formatCurrency(unitPrice)}
                </p>
              )}
            </div>
          )}

          <ItemFormFields form={form} priceLabelOverride={isBundle ? 'Całkowita cena zestawu' : undefined} />

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
              {isBundle ? `Dodaj zestaw (${bundleSize} szt.)` : 'Dodaj do magazynu'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
