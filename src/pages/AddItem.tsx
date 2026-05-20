import { useState, useEffect, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ImagePlus, X, Package, Sparkles, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import Button from '../components/Button'
import Input from '../components/Input'
import { itemSchema, type ItemFormData } from '../features/items/itemSchema'
import ItemFormFields from '../features/items/ItemFormFields'
import { useCreateItem, useCreateBundle, useUpdateItem } from '../features/items/queries'
import { uploadPhoto } from '../features/items/api'
import type { BundleChildInput } from '../features/items/api'
import { CATEGORIES } from '../lib/constants'
import { analyzeCardPhoto, getGeminiKey } from '../lib/gemini'

// ── constants ─────────────────────────────────────────────────────────────────

const SHOE_LEVEL_OPTIONS = [
  { value: '',               label: '— poziom —' },
  { value: 'amatorski',        label: 'Amatorski' },
  { value: 'półprofesjonalny', label: 'Półprofesjonalny' },
  { value: 'profesjonalny',    label: 'Profesjonalny' },
]
const SHOE_TYPE_OPTIONS = [
  { value: '',        label: '— typ —' },
  { value: 'lanki',   label: 'Lanki (FG)' },
  { value: 'turfy',   label: 'Turfy (TF)' },
  { value: 'mixy',    label: 'Mixy (SG)' },
  { value: 'halówki', label: 'Halówki (IC)' },
]
const BOX_TYPE_OPTIONS = [
  { value: '',                label: '— rodzaj —' },
  { value: 'etb',             label: 'Elite Trainer Box (ETB)' },
  { value: 'blister',         label: 'Blister' },
  { value: 'puszka_tin',      label: 'Puszka Tin' },
  { value: 'puszka_mini_tin', label: 'Puszka Mini Tin' },
  { value: 'pokeball_tin',    label: 'Pokeball Tin' },
]
const SLAB_COMPANY_OPTIONS = [
  { value: '',    label: '— firma —' },
  { value: 'PSA', label: 'PSA' },
  { value: 'CGC', label: 'CGC' },
  { value: 'ACE', label: 'ACE' },
  { value: 'TAG', label: 'TAG' },
]
const categoryOptions = [{ value: '', label: '— kategoria —' }, ...CATEGORIES.map(c => ({ value: c, label: c }))]

// ── per-item draft type ────────────────────────────────────────────────────────

type BundleItemDraft = {
  id: string
  title: string
  category: string
  price: string
  size: string
  meta_shoe_level: string
  meta_shoe_type: string
  meta_box_type: string
  meta_slab_company: string
  meta_slab_grade: string
  photoFile: File | null
  photoPreview: string | null
  analyzing: boolean
}

function makeDraft(idx: number): BundleItemDraft {
  return {
    id: `draft-${Date.now()}-${idx}`,
    title: '',
    category: '',
    price: '',
    size: '',
    meta_shoe_level: '',
    meta_shoe_type: '',
    meta_box_type: '',
    meta_slab_company: '',
    meta_slab_grade: '10',
    photoFile: null,
    photoPreview: null,
    analyzing: false,
  }
}

// ── shared class helpers ──────────────────────────────────────────────────────

const selectCls = 'w-full rounded-xl border border-gray-300 dark:border-slate-600 px-3 py-2 text-sm bg-white dark:bg-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition'
const inputCls  = 'w-full rounded-xl border border-gray-300 dark:border-slate-600 px-3 py-2 text-sm bg-white dark:bg-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition'

// ── component ─────────────────────────────────────────────────────────────────

export default function AddItem() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const createItem = useCreateItem()
  const createBundle = useCreateBundle()
  const updateItem = useUpdateItem()

  // ── single-item photo ──────────────────────────────────────────────────────
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  // ── bundle mode ────────────────────────────────────────────────────────────
  const [isBundle, setIsBundle] = useState(() => searchParams.get('bundle') === '1')
  const [bundleSizeInput, setBundleSizeInput] = useState('2')
  const bundleSize = Math.max(2, parseInt(bundleSizeInput) || 2)
  const [totalBundlePrice, setTotalBundlePrice] = useState('')
  const [bundleItems, setBundleItems] = useState<BundleItemDraft[]>(() => [makeDraft(0), makeDraft(1)])
  const [targetItemId, setTargetItemId] = useState<string | null>(null)
  const bundleFileRef = useRef<HTMLInputElement>(null)

  // sync bundleItems length to bundleSize
  useEffect(() => {
    setBundleItems(prev => {
      if (bundleSize <= prev.length) return prev.slice(0, bundleSize)
      const extra = Array.from({ length: bundleSize - prev.length }, (_, i) => makeDraft(prev.length + i))
      return [...prev, ...extra]
    })
  }, [bundleSize])

  // auto-sum total from individual item prices
  useEffect(() => {
    const sum = bundleItems.reduce((acc, item) => {
      const p = parseFloat(item.price.replace(',', '.'))
      return acc + (isNaN(p) ? 0 : p)
    }, 0)
    setTotalBundlePrice(sum > 0 ? sum.toFixed(2) : '')
  }, [bundleItems]) // eslint-disable-line react-hooks/exhaustive-deps

  // cleanup previews on unmount
  useEffect(() => {
    return () => {
      if (photoPreview) URL.revokeObjectURL(photoPreview)
      bundleItems.forEach(item => { if (item.photoPreview) URL.revokeObjectURL(item.photoPreview) })
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── form ───────────────────────────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const form = useForm<ItemFormData, unknown, ItemFormData>({ resolver: zodResolver(itemSchema) as any })
  const watchedCategory = form.watch('category')
  const canAnalyze = !!photoFile && !!getGeminiKey() && ['Karty Pokemon', 'Slab Pokemon'].includes(watchedCategory ?? '')

  useEffect(() => {
    if (isBundle) form.setValue('purchase_price', 0)
  }, [isBundle]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── single-item handlers ───────────────────────────────────────────────────
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

  async function analyzePhoto() {
    if (!photoFile) return
    setAnalyzing(true)
    try {
      const { title } = await analyzeCardPhoto(photoFile)
      form.setValue('title', title, { shouldValidate: true })
      toast.success('Tytuł uzupełniony')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Błąd analizy')
    } finally {
      setAnalyzing(false)
    }
  }

  // ── bundle helpers ─────────────────────────────────────────────────────────
  function dividePriceEqually() {
    const total = parseFloat(totalBundlePrice.replace(',', '.'))
    if (!total || bundleSize < 1) return
    const unit = (total / bundleSize).toFixed(2)
    setBundleItems(prev => prev.map(item => ({ ...item, price: unit })))
  }

  function updateItem_(id: string, patch: Partial<BundleItemDraft>) {
    setBundleItems(prev => prev.map(item => item.id === id ? { ...item, ...patch } : item))
  }

  function stepGrade(id: string, delta: number) {
    setBundleItems(prev => prev.map(item => {
      if (item.id !== id) return item
      const current = item.meta_slab_grade ? parseFloat(item.meta_slab_grade) : 10
      const next = Math.round((current + delta) * 2) / 2
      if (next < 1 || next > 10) return item
      return { ...item, meta_slab_grade: next.toString() }
    }))
  }

  function handleBundleItemPhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !targetItemId) return
    const preview = URL.createObjectURL(file)
    updateItem_(targetItemId, { photoFile: file, photoPreview: preview })
    if (bundleFileRef.current) bundleFileRef.current.value = ''
  }

  async function analyzeItemPhoto(id: string) {
    const item = bundleItems.find(i => i.id === id)
    if (!item?.photoFile) { toast.error('Brak zdjęcia do analizy'); return }
    updateItem_(id, { analyzing: true })
    try {
      const { title } = await analyzeCardPhoto(item.photoFile)
      updateItem_(id, { title, analyzing: false })
      toast.success('Tytuł uzupełniony')
    } catch (err) {
      updateItem_(id, { analyzing: false })
      toast.error(err instanceof Error ? err.message : 'Błąd analizy')
    }
  }

  // ── submit ─────────────────────────────────────────────────────────────────
  async function onSubmit(data: ItemFormData) {
    setSubmitting(true)
    try {
      const meta: Record<string, string> = {}
      if (data.meta_shoe_level)   meta.shoe_level   = data.meta_shoe_level
      if (data.meta_shoe_type)    meta.shoe_type     = data.meta_shoe_type
      if (data.meta_box_type)     meta.box_type      = data.meta_box_type
      if (data.meta_slab_company) meta.slab_company  = data.meta_slab_company
      if (data.meta_slab_grade)   meta.slab_grade    = data.meta_slab_grade

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { meta_shoe_level, meta_shoe_type, meta_box_type, meta_slab_company, meta_slab_grade, ...formData } = data

      if (isBundle) {
        const childInputs: BundleChildInput[] = bundleItems.map((item, i) => {
          const childMeta: Record<string, string> = {}
          if (item.meta_shoe_level)   childMeta.shoe_level   = item.meta_shoe_level
          if (item.meta_shoe_type)    childMeta.shoe_type    = item.meta_shoe_type
          if (item.meta_box_type)     childMeta.box_type     = item.meta_box_type
          if (item.meta_slab_company) childMeta.slab_company = item.meta_slab_company
          if (item.meta_slab_grade)   childMeta.slab_grade   = item.meta_slab_grade
          return {
            title:          item.title.trim() || `Przedmiot ${i + 1}`,
            category:       item.category || null,
            purchase_price: parseFloat(item.price.replace(',', '.')) || 0,
            size:           item.size || null,
            metadata:       Object.keys(childMeta).length ? childMeta : null,
          }
        })
        const totalPrice = childInputs.reduce((s, c) => s + c.purchase_price, 0)

        const { parent, children } = await createBundle.mutateAsync({
          input: {
            ...formData,
            purchase_price:  totalPrice,
            description:     formData.description     || null,
            category:        formData.category        || null,
            brand:           formData.brand           || null,
            size:            formData.size            || null,
            condition:       formData.condition       || null,
            received_date:   formData.received_date   || null,
            purchase_source: formData.purchase_source || null,
            notes:           formData.notes           || null,
            metadata:        null,
          },
          childInputs,
        })

        // upload per-item photos; first child's path becomes the bundle cover
        let parentPhotoPatch: string | null = null
        await Promise.all(children.map(async (child, i) => {
          const draft = bundleItems[i]
          if (!draft?.photoFile) return
          try {
            const path = await uploadPhoto(child.id, draft.photoFile)
            await updateItem.mutateAsync({ id: child.id, patch: { photo_path: path } })
            if (i === 0) parentPhotoPatch = path
          } catch { /* non-fatal */ }
        }))
        if (parentPhotoPatch) {
          await updateItem.mutateAsync({ id: parent.id, patch: { photo_path: parentPhotoPatch } })
        }

        toast.success(`Zestaw (${bundleSize} szt.) dodany do magazynu!`)
      } else {
        const input = {
          ...formData,
          purchase_price:  Number(data.purchase_price),
          description:     formData.description     || null,
          category:        formData.category        || null,
          brand:           formData.brand           || null,
          size:            formData.size            || null,
          condition:       formData.condition       || null,
          received_date:   formData.received_date   || null,
          purchase_source: formData.purchase_source || null,
          notes:           formData.notes           || null,
          metadata:        Object.keys(meta).length ? meta : null,
        }
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
              <p className="text-xs text-slate-400 dark:text-slate-500">Każdy przedmiot ma własne zdjęcie, tytuł i cenę</p>
            </div>
          </label>

          {isBundle ? (
            /* ── BUNDLE MODE ──────────────────────────────────────────────── */
            <div className="space-y-4">

              {/* Bundle label */}
              <Input
                label="Tytuł zestawu *"
                placeholder="np. Scarlet & Violet booster pack"
                error={form.formState.errors.title?.message}
                {...form.register('title')}
              />

              {/* Total price display + divide */}
              <div className="flex gap-2 items-end">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Łączna cena zamówienia</p>
                  <div className="relative flex items-center">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={totalBundlePrice}
                      onChange={e => setTotalBundlePrice(e.target.value)}
                      placeholder="0.00"
                      className="w-full rounded-xl border border-gray-300 dark:border-slate-600 px-4 py-2.5 pr-10 text-sm bg-white dark:bg-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
                    />
                    <span className="pointer-events-none absolute right-3 text-sm text-gray-400 dark:text-slate-500">zł</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={dividePriceEqually}
                  className="shrink-0 px-4 py-2.5 rounded-xl bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 text-sm font-medium hover:bg-violet-200 dark:hover:bg-violet-900/50 transition-colors"
                >
                  Podziel równo
                </button>
              </div>

              {/* Bundle size */}
              <Input
                label="Liczba przedmiotów"
                type="number"
                min={2}
                max={200}
                value={bundleSizeInput}
                onChange={e => setBundleSizeInput(e.target.value)}
                onBlur={() => setBundleSizeInput(String(Math.max(2, parseInt(bundleSizeInput) || 2)))}
              />

              {/* Per-item rows */}
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-700 dark:text-slate-300">Przedmioty</p>
                <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
                  {bundleItems.map((item, i) => {
                    const isShoes      = item.category === 'Buty piłkarskie'
                    const isPokebox    = item.category === 'Boxy Pokemon'
                    const isSlab       = item.category === 'Slab Pokemon'
                    const canAnalyze   = (item.category === 'Karty Pokemon' || isSlab) && !!getGeminiKey()
                    const grade        = item.meta_slab_grade ? parseFloat(item.meta_slab_grade) : 10
                    return (
                      <div key={item.id} className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-3 space-y-3">

                        {/* row 1: number · photo · analyze · title */}
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-400 dark:text-slate-500 w-5 shrink-0 text-right">{i + 1}.</span>
                          <button
                            type="button"
                            onClick={() => { setTargetItemId(item.id); bundleFileRef.current?.click() }}
                            className="relative w-10 h-10 rounded-xl overflow-hidden shrink-0 border-2 border-dashed border-gray-300 dark:border-slate-600 hover:border-emerald-500 transition-colors flex items-center justify-center bg-gray-50 dark:bg-slate-700"
                          >
                            {item.photoPreview
                              ? <img src={item.photoPreview} alt="" className="w-full h-full object-cover" />
                              : <ImagePlus size={14} className="text-gray-400 dark:text-slate-500" />
                            }
                          </button>
                          {canAnalyze && (
                            <button
                              type="button"
                              disabled={item.analyzing || !item.photoFile}
                              onClick={() => analyzeItemPhoto(item.id)}
                              className="shrink-0 p-2 rounded-xl bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 hover:bg-violet-200 dark:hover:bg-violet-900/50 disabled:opacity-40 transition-colors"
                              title="Analizuj zdjęcie"
                            >
                              {item.analyzing
                                ? <Loader2 size={14} className="animate-spin" />
                                : <Sparkles size={14} />
                              }
                            </button>
                          )}
                          <input
                            type="text"
                            value={item.title}
                            onChange={e => updateItem_(item.id, { title: e.target.value })}
                            placeholder={`Przedmiot ${i + 1}`}
                            className={`flex-1 min-w-0 ${inputCls}`}
                          />
                        </div>

                        {/* row 2: category (full width) */}
                        <div className="pl-7">
                          <label className="text-xs text-gray-500 dark:text-slate-400 mb-1 block">Kategoria</label>
                          <select
                            value={item.category}
                            onChange={e => updateItem_(item.id, { category: e.target.value })}
                            className={selectCls}
                          >
                            {categoryOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                          </select>
                        </div>

                        {/* row 3: price */}
                        <div className="pl-7">
                          <label className="text-xs text-gray-500 dark:text-slate-400 mb-1 block">Cena</label>
                          <div className="relative">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.price}
                              onChange={e => updateItem_(item.id, { price: e.target.value })}
                              placeholder="0.00"
                              className={`${inputCls} pr-10`}
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400 dark:text-slate-500 pointer-events-none">zł</span>
                          </div>
                        </div>

                        {/* Buty piłkarskie — rozmiar + poziom + typ */}
                        {isShoes && (
                          <div className="pl-7 space-y-2">
                            <div className="flex gap-2">
                              <div className="w-24 shrink-0">
                                <label className="text-xs text-gray-500 dark:text-slate-400 mb-1 block">Rozmiar</label>
                                <input
                                  type="text"
                                  value={item.size}
                                  onChange={e => updateItem_(item.id, { size: e.target.value })}
                                  placeholder="42"
                                  className={inputCls}
                                />
                              </div>
                              <div className="flex-1 min-w-0">
                                <label className="text-xs text-gray-500 dark:text-slate-400 mb-1 block">Poziom</label>
                                <select value={item.meta_shoe_level} onChange={e => updateItem_(item.id, { meta_shoe_level: e.target.value })} className={selectCls}>
                                  {SHOE_LEVEL_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                </select>
                              </div>
                              <div className="flex-1 min-w-0">
                                <label className="text-xs text-gray-500 dark:text-slate-400 mb-1 block">Typ</label>
                                <select value={item.meta_shoe_type} onChange={e => updateItem_(item.id, { meta_shoe_type: e.target.value })} className={selectCls}>
                                  {SHOE_TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                </select>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Boxy Pokemon — rodzaj boxa */}
                        {isPokebox && (
                          <div className="pl-7">
                            <label className="text-xs text-gray-500 dark:text-slate-400 mb-1 block">Rodzaj boxa</label>
                            <select value={item.meta_box_type} onChange={e => updateItem_(item.id, { meta_box_type: e.target.value })} className={selectCls}>
                              {BOX_TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                            </select>
                          </div>
                        )}

                        {/* Slab Pokemon — firma + ocena */}
                        {isSlab && (
                          <div className="pl-7 space-y-2">
                            <div>
                              <label className="text-xs text-gray-500 dark:text-slate-400 mb-1 block">Firma gradingowa</label>
                              <select value={item.meta_slab_company} onChange={e => updateItem_(item.id, { meta_slab_company: e.target.value })} className={selectCls}>
                                {SLAB_COMPANY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                              </select>
                            </div>
                            <div>
                              <label className="text-xs text-gray-500 dark:text-slate-400 mb-1 block">Ocena</label>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => stepGrade(item.id, -0.5)}
                                  disabled={grade <= 1}
                                  className="w-9 h-9 rounded-xl bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 text-lg font-bold text-gray-700 dark:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                >−</button>
                                <span className="w-12 text-center text-lg font-bold text-gray-900 dark:text-white tabular-nums">
                                  {grade % 1 === 0 ? grade.toFixed(0) : grade.toFixed(1)}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => stepGrade(item.id, +0.5)}
                                  disabled={grade >= 10}
                                  className="w-9 h-9 rounded-xl bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 text-lg font-bold text-gray-700 dark:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                >+</button>
                              </div>
                            </div>
                          </div>
                        )}

                      </div>
                    )
                  })}
                </div>
              </div>

              {/* hidden file input for bundle item photos */}
              <input ref={bundleFileRef} type="file" accept="image/*" className="hidden" onChange={handleBundleItemPhotoChange} />

              {/* shared fields */}
              <div className="border-t border-gray-100 dark:border-slate-700 pt-4 space-y-4">
                <p className="text-sm font-medium text-gray-700 dark:text-slate-300">Wspólne dane</p>
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Data zakupu *"
                    type="date"
                    defaultValue={new Date().toISOString().split('T')[0]}
                    error={form.formState.errors.purchase_date?.message}
                    {...form.register('purchase_date')}
                  />
                  <Input
                    label="Data przyjęcia na magazyn"
                    type="date"
                    hint="Zostaw puste jeśli już masz."
                    {...form.register('received_date')}
                  />
                </div>
                <Input
                  label="Notatki"
                  placeholder=""
                  {...form.register('notes')}
                />
              </div>

            </div>
          ) : (
            /* ── SINGLE ITEM MODE ─────────────────────────────────────────── */
            <>
              {/* Photo picker */}
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">Zdjęcie</p>
                {photoPreview ? (
                  <div className="flex items-end gap-3">
                    <div className="relative w-40 h-40 rounded-xl overflow-hidden shrink-0">
                      <img src={photoPreview} alt="" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={removePhoto}
                        className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-1 hover:bg-black/80"
                      >
                        <X size={14} />
                      </button>
                    </div>
                    {canAnalyze && (
                      <button
                        type="button"
                        onClick={analyzePhoto}
                        disabled={analyzing}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white text-sm font-medium transition-colors"
                      >
                        {analyzing
                          ? <><Loader2 size={14} className="animate-spin" /> Analizuję…</>
                          : <><Sparkles size={14} /> Analizuj</>
                        }
                      </button>
                    )}
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

              <ItemFormFields form={form} />
            </>
          )}

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
