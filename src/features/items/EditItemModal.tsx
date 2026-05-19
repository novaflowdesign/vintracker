import { useEffect, useState, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ImagePlus, X } from 'lucide-react'
import { toast } from 'sonner'
import Modal from '../../components/Modal'
import Button from '../../components/Button'
import ItemFormFields from './ItemFormFields'
import { itemSchema, type ItemFormData } from './itemSchema'
import { useUpdateItem, useBundleChildren, usePhotoUrl } from './queries'
import { uploadPhoto } from './api'
import type { Item } from '../../types/item'

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

  // bundle children editing
  const isBundle = item?.bundle_size != null && item?.bundle_id == null
  const { data: children = [] } = useBundleChildren(isBundle ? (item?.id ?? '') : '')
  const [childEdits, setChildEdits] = useState<Record<string, ChildEdit>>({})
  const childFileRef = useRef<HTMLInputElement>(null)
  const [targetChildId, setTargetChildId] = useState<string | null>(null)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const form = useForm<ItemFormData, unknown, ItemFormData>({
    resolver: zodResolver(itemSchema) as any,
  })

  // reset parent form when modal opens
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
        meta_shoe_level:   item.metadata?.shoe_level   ?? '',
        meta_shoe_type:    item.metadata?.shoe_type    ?? '',
        meta_box_type:     item.metadata?.box_type     ?? '',
        meta_slab_company: item.metadata?.slab_company ?? '',
        meta_slab_grade:   item.metadata?.slab_grade   ?? '',
        notes:           item.notes ?? '',
      })
      setPhotoFile(null)
      setPhotoPreview(null)
    }
    if (!open) {
      // revoke any child previews
      setChildEdits(prev => {
        Object.values(prev).forEach(e => { if (e.photoPreview) URL.revokeObjectURL(e.photoPreview) })
        return {}
      })
    }
  }, [open, item, form])

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

  function buildMetadata(data: ItemFormData): Record<string, string> | null {
    const meta: Record<string, string> = {}
    if (data.meta_shoe_level)   meta.shoe_level   = data.meta_shoe_level
    if (data.meta_shoe_type)    meta.shoe_type    = data.meta_shoe_type
    if (data.meta_box_type)     meta.box_type     = data.meta_box_type
    if (data.meta_slab_company) meta.slab_company = data.meta_slab_company
    if (data.meta_slab_grade)   meta.slab_grade   = data.meta_slab_grade
    return Object.keys(meta).length ? meta : null
  }

  async function onSubmit(data: ItemFormData) {
    if (!item) return
    setUploading(true)
    try {
      // save parent
      let photoPatch: { photo_path?: string } = {}
      if (photoFile) {
        const path = await uploadPhoto(item.id, photoFile)
        photoPatch = { photo_path: path }
      }
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { meta_shoe_level, meta_shoe_type, meta_box_type, meta_slab_company, meta_slab_grade, ...formData } = data
      await updateItem.mutateAsync({
        id: item.id,
        patch: {
          ...formData,
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
          metadata:        buildMetadata(data),
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
                  </div>
                )
              })}
            </div>
            {/* shared hidden file input for child photos */}
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
