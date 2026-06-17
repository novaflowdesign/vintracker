import { useEffect, useState, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ImagePlus, X, Sparkles, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import Modal from '../../components/Modal'
import Button from '../../components/Button'
import ItemFormFields from './ItemFormFields'
import { itemSchema, type ItemFormData } from './itemSchema'
import { useUpdateItem, useBundleChildren, usePhotoUrl } from './queries'
import { uploadPhoto } from './api'
import { analyzeCardPhoto, getGeminiKey } from '../../lib/gemini'
import { supabase } from '../../lib/supabase'
import type { Item } from '../../types/item'
import { useCategories, useAllCategoryFields } from '../categories/queries'
import { useMetadataState } from '../categories/DynamicMetaFields'

// ── small component to display an existing child photo ────────────────────────

function ChildPhotoThumb({ path }: { path: string }) {
  const { data: url } = usePhotoUrl(path)
  return url ? <img src={url} alt="" className="w-full h-full object-cover" /> : null
}

// ── types ─────────────────────────────────────────────────────────────────────

type ChildEdit = {
  title: string
  photoFile: File | null
  photoPreview: string | null
}

interface Props {
  item: Item | null
  open: boolean
  onClose: () => void
}

export default function EditItemModal({ item, open, onClose }: Props) {
  const updateItem = useUpdateItem()

  // parent photo
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const { data: existingPhotoUrl } = usePhotoUrl(item?.photo_path ?? null)

  // bundle children editing
  const isBundle = item?.bundle_size != null && item?.bundle_id == null
  const { data: children = [] } = useBundleChildren(isBundle ? (item?.id ?? '') : '')
  const [childEdits, setChildEdits] = useState<Record<string, ChildEdit>>({})
  const childFileRef = useRef<HTMLInputElement>(null)
  const [targetChildId, setTargetChildId] = useState<string | null>(null)
  const [analyzingChildId, setAnalyzingChildId] = useState<string | null>(null)

  // categories + dynamic fields
  const { data: allCategories = [] } = useCategories()
  const allCategoryFields = useAllCategoryFields()
  const categoryOptions = allCategories.map(c => ({ value: c.name, label: c.name }))

  const { metadata, setField, reset: resetMeta, collect } = useMetadataState()

  const ANALYZABLE_CATEGORIES = ['Karty Pokemon', 'Slab Pokemon']
  const canAnalyzeChildren = isBundle && !!getGeminiKey() && ANALYZABLE_CATEGORIES.includes(item?.category ?? '')

  async function analyzeChild(childId: string, photoFile: File | null, photoPath: string | null) {
    const source = photoFile ?? photoPath
    if (!source) { toast.error('Brak zdjęcia do analizy'); return }
    setAnalyzingChildId(childId)
    try {
      let image: File | string = source instanceof File ? source : ''
      if (typeof source === 'string') {
        const { data } = await supabase.storage.from('item-photos').createSignedUrl(source, 60)
        if (!data?.signedUrl) throw new Error('Nie można pobrać zdjęcia')
        image = data.signedUrl
      }
      const { title } = await analyzeCardPhoto(image)
      setChildEdits(prev => ({ ...prev, [childId]: { ...prev[childId], title } }))
      toast.success('Tytuł uzupełniony')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Błąd analizy')
    } finally {
      setAnalyzingChildId(null)
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const form = useForm<ItemFormData, unknown, ItemFormData>({
    resolver: zodResolver(itemSchema) as any,
  })

  const selectedCategory = form.watch('category') ?? ''
  const categoryFields = allCategoryFields[selectedCategory] ?? []

  // reset form + metadata when modal opens
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
        received_date:   item.received_date ?? '',
        purchase_source: item.purchase_source ?? '',
        notes:           item.notes ?? '',
      })
      resetMeta(Object.fromEntries(
        Object.entries(item.metadata ?? {}).map(([k, v]) => [k, String(v)])
      ))
      setPhotoFile(null)
      setPhotoPreview(null)
    }
    if (!open) {
      setChildEdits(prev => {
        Object.values(prev).forEach(e => { if (e.photoPreview) URL.revokeObjectURL(e.photoPreview) })
        return {}
      })
    }
  }, [open, item]) // eslint-disable-line react-hooks/exhaustive-deps

  // initialise child edits when children load
  useEffect(() => {
    if (!open || !isBundle || children.length === 0) return
    setChildEdits(prev => {
      const next = { ...prev }
      for (const c of children) {
        if (!next[c.id]) next[c.id] = { title: c.title, photoFile: null, photoPreview: null }
      }
      return next
    })
  }, [open, isBundle, children])

  // ── parent photo handlers ─────────────────────────────────────────────────

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

  // ── child photo handler ───────────────────────────────────────────────────

  function handleChildPhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !targetChildId) return
    const preview = URL.createObjectURL(file)
    setChildEdits(prev => ({
      ...prev,
      [targetChildId]: { ...prev[targetChildId], photoFile: file, photoPreview: preview },
    }))
    if (childFileRef.current) childFileRef.current.value = ''
  }

  // ── submit ────────────────────────────────────────────────────────────────

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
          purchase_price:  Number(data.purchase_price),
          description:     data.description     || null,
          category:        data.category        || null,
          brand:           data.brand           || null,
          size:            data.size            || null,
          condition:       (data.condition      || null) as Item['condition'],
          purchase_source: (data.purchase_source || null) as Item['purchase_source'],
          received_date:   data.received_date   || null,
          notes:           data.notes           || null,
          metadata:        collect(),
        },
      })

      // save changed children
      if (isBundle && children.length > 0) {
        await Promise.all(
          children.map(async child => {
            const edit = childEdits[child.id]
            if (!edit) return
            const titleChanged = edit.title !== child.title
            const photoChanged = edit.photoFile !== null
            if (!titleChanged && !photoChanged) return

            let childPhotoPatch: { photo_path?: string } = {}
            if (edit.photoFile) {
              const path = await uploadPhoto(child.id, edit.photoFile)
              childPhotoPatch = { photo_path: path }
            }
            await updateItem.mutateAsync({
              id: child.id,
              patch: { title: edit.title, ...childPhotoPatch },
            })
          })
        )
      }

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

        {/* Parent photo */}
        <div>
          <p className="text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">Zdjęcie</p>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handlePhotoChange}
          />
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
          ) : existingPhotoUrl ? (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="relative w-32 h-32 rounded-xl overflow-hidden group cursor-pointer"
            >
              <img src={existingPhotoUrl} alt="" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                <span className="opacity-0 group-hover:opacity-100 text-white text-xs font-medium transition-opacity">Zmień</span>
              </div>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="flex flex-col items-center justify-center w-32 h-32 border-2 border-dashed border-gray-300 dark:border-slate-600 rounded-xl cursor-pointer hover:border-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 transition-colors"
            >
              <ImagePlus size={24} className="text-gray-400 dark:text-slate-500" />
              <span className="text-xs text-gray-400 dark:text-slate-500 mt-1">Dodaj zdjęcie</span>
            </button>
          )}
        </div>

        <ItemFormFields
          form={form}
          categoryOptions={categoryOptions}
          categoryFields={categoryFields}
          metadata={metadata}
          onMetaChange={setField}
        />

        {/* Bundle children section */}
        {isBundle && children.length > 0 && (
          <div className="border-t border-gray-100 dark:border-slate-700 pt-4 space-y-3">
            <p className="text-sm font-medium text-gray-700 dark:text-slate-300">
              Przedmioty w zestawie ({children.length} szt.)
            </p>
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {children.map((child, i) => {
                const edit = childEdits[child.id]
                if (!edit) return null
                return (
                  <div key={child.id} className="flex items-center gap-3">
                    <span className="text-xs text-slate-400 dark:text-slate-500 w-4 shrink-0 text-right">{i + 1}.</span>
                    {/* Child photo */}
                    <button
                      type="button"
                      onClick={() => { setTargetChildId(child.id); childFileRef.current?.click() }}
                      className="relative w-11 h-11 rounded-xl overflow-hidden shrink-0 border-2 border-dashed border-gray-300 dark:border-slate-600 hover:border-emerald-500 transition-colors flex items-center justify-center bg-gray-50 dark:bg-slate-700"
                    >
                      {edit.photoPreview ? (
                        <img src={edit.photoPreview} alt="" className="w-full h-full object-cover" />
                      ) : child.photo_path ? (
                        <ChildPhotoThumb path={child.photo_path} />
                      ) : (
                        <ImagePlus size={14} className="text-gray-400 dark:text-slate-500" />
                      )}
                    </button>
                    {/* Child title */}
                    <input
                      type="text"
                      value={edit.title}
                      onChange={e => setChildEdits(prev => ({
                        ...prev,
                        [child.id]: { ...prev[child.id], title: e.target.value },
                      }))}
                      placeholder={`Przedmiot ${i + 1}`}
                      className="flex-1 min-w-0 rounded-xl border border-gray-300 dark:border-slate-600 px-3 py-2 text-sm bg-white dark:bg-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
                    />
                    {canAnalyzeChildren && (
                      <button
                        type="button"
                        disabled={analyzingChildId === child.id}
                        onClick={() => analyzeChild(child.id, edit.photoFile, edit.photoFile ? null : (child.photo_path ?? item?.photo_path ?? null))}
                        className="shrink-0 p-2 rounded-xl bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 hover:bg-violet-200 dark:hover:bg-violet-900/50 disabled:opacity-40 transition-colors"
                        title="Analizuj zdjęcie"
                      >
                        {analyzingChildId === child.id
                          ? <Loader2 size={14} className="animate-spin" />
                          : <Sparkles size={14} />
                        }
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
            <input
              ref={childFileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleChildPhotoChange}
            />
          </div>
        )}

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
