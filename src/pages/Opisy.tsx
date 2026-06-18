import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { FileText, Package, Copy, Check, RefreshCw, X, AlertCircle, Loader2, Layers, ChevronDown, RotateCcw, ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'
import { useItems, usePhotoUrl, useBundleChildren } from '../features/items/queries'
import { getGeminiKey, generateDescription, getGeneratedDesc, saveGeneratedDesc, getAllGeneratedDescs, type GeneratedDesc } from '../lib/gemini'
import { useTemplates, useUpdateTemplate } from '../lib/templates'
import {
  getDirectTemplate, saveDirectTemplate, resetDirectTemplate,
  DEFAULT_DIRECT_TEMPLATES, DIRECT_TEMPLATE_VARS,
  type DirectCategory,
} from '../lib/directTemplates'
import type { Item } from '../types/item'

// ── item thumbnail ────────────────────────────────────────────────────────────

function ItemThumb({ path, className = '' }: { path: string | null; className?: string }) {
  const { data: url } = usePhotoUrl(path)
  if (!url) return (
    <div className={`bg-gray-100 dark:bg-slate-700 flex items-center justify-center ${className}`}>
      <Package size={20} className="text-gray-300 dark:text-slate-600" />
    </div>
  )
  return <img src={url} alt="" loading="lazy" className={`object-cover ${className}`} />
}

// ── generation modal ──────────────────────────────────────────────────────────

function GenerationModal({
  item,
  onClose,
  onSaved,
  onBack,
}: {
  item: Item
  onClose: () => void
  onSaved: (itemId: string, desc: GeneratedDesc) => void
  onBack?: () => void
}) {
  const { data: photoUrl } = usePhotoUrl(item.photo_path)
  const { data: templates = [] } = useTemplates()
  const updateTemplate = useUpdateTemplate()
  const [selectedId, setSelectedId] = useState('')
  const [generating, setGenerating] = useState(false)
  const [result, setResult] = useState<{ title: string; description: string } | null>(null)
  const [copiedTitle, setCopiedTitle] = useState(false)
  const [copiedDesc,  setCopiedDesc]  = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const [editDesc,  setEditDesc]  = useState('')
  const [showTplEditor, setShowTplEditor] = useState(false)
  const [localTitleTpl, setLocalTitleTpl] = useState('')
  const [localDescTpl,  setLocalDescTpl]  = useState('')
  const [savingTpl, setSavingTpl] = useState(false)

  useEffect(() => {
    const saved = getGeneratedDesc(item.id)
    if (saved) {
      setResult(saved)
      setEditTitle(saved.title)
      setEditDesc(saved.description)
    }
  }, [item.id])

  const { data: parentItems = [] } = useItems({})

  const hasKey = !!getGeminiKey()

  // children have no category — fall back to parent bundle's category via bundle_id
  const effectiveCategory = item.category
    ?? (item.bundle_id ? parentItems.find(p => p.id === item.bundle_id)?.category : null)

  const DIRECT_CATEGORIES = ['Buty piłkarskie', 'Buty', 'Karty Pokemon', 'Boxy Pokemon', 'Slab Pokemon']
  const isDirectGen = DIRECT_CATEGORIES.includes(effectiveCategory ?? '')

  const defaultTemplateId = templates.find(t => t.name === effectiveCategory)?.id ?? templates[0]?.id ?? ''
  const activeTemplateId  = selectedId || defaultTemplateId
  const selectedTemplate  = templates.find(t => t.id === activeTemplateId)

  // sync local template state when category or selected template changes
  useEffect(() => {
    if (isDirectGen && effectiveCategory) {
      const t = getDirectTemplate(effectiveCategory as DirectCategory)
      setLocalTitleTpl(t.titleTemplate)
      setLocalDescTpl(t.descTemplate)
    }
  }, [isDirectGen, effectiveCategory])

  useEffect(() => {
    if (!isDirectGen && selectedTemplate) {
      setLocalTitleTpl(selectedTemplate.titleTemplate)
      setLocalDescTpl(selectedTemplate.descTemplate)
    }
  }, [isDirectGen, selectedTemplate?.id])

  async function saveTemplate() {
    setSavingTpl(true)
    try {
      if (isDirectGen && effectiveCategory) {
        saveDirectTemplate(effectiveCategory as DirectCategory, {
          titleTemplate: localTitleTpl,
          descTemplate:  localDescTpl,
        })
        toast.success('Szablon zapisany')
      } else if (selectedTemplate) {
        await updateTemplate.mutateAsync({
          id:   selectedTemplate.id,
          patch: { titleTemplate: localTitleTpl, descTemplate: localDescTpl },
        })
        toast.success('Szablon zapisany')
      }
      setShowTplEditor(false)
    } catch {
      toast.error('Błąd zapisywania szablonu')
    } finally {
      setSavingTpl(false)
    }
  }

  function resetToDefault() {
    if (!isDirectGen || !effectiveCategory) return
    const def = DEFAULT_DIRECT_TEMPLATES[effectiveCategory as DirectCategory]
    setLocalTitleTpl(def.titleTemplate)
    setLocalDescTpl(def.descTemplate)
    resetDirectTemplate(effectiveCategory as DirectCategory)
    toast.success('Szablon przywrócony do domyślnego')
  }

  async function generate() {
    if (!isDirectGen && (!photoUrl || !selectedTemplate)) return
    setGenerating(true)
    setResult(null)
    try {
      const res = await generateDescription(
        photoUrl ?? '',
        localTitleTpl || selectedTemplate?.titleTemplate || '',
        localDescTpl  || selectedTemplate?.descTemplate  || '',
        {
          title:    item.title,
          category: effectiveCategory,
          metadata: item.metadata,
          size:     item.size,
          brand:    item.brand,
        },
      )
      setResult(res)
      setEditTitle(res.title)
      setEditDesc(res.description)
      const desc: GeneratedDesc = { ...res, templateId: activeTemplateId, at: new Date().toISOString() }
      saveGeneratedDesc(item.id, desc)
      onSaved(item.id, desc)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Błąd generowania')
    } finally {
      setGenerating(false)
    }
  }

  async function copy(text: string, which: 'title' | 'desc') {
    await navigator.clipboard.writeText(text)
    if (which === 'title') {
      setCopiedTitle(true)
      setTimeout(() => setCopiedTitle(false), 2000)
    } else {
      setCopiedDesc(true)
      setTimeout(() => setCopiedDesc(false), 2000)
    }
  }

  return createPortal(
    <>
      <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className={[
        'fixed z-50 bg-white dark:bg-slate-900 flex flex-col settings-sheet',
        'inset-x-0 bottom-0 rounded-t-3xl max-h-[92vh]',
        'sm:inset-0 sm:m-auto sm:w-[500px] sm:h-fit sm:max-h-[88vh]',
        'sm:rounded-2xl sm:shadow-2xl',
      ].join(' ')}>

        {/* Handle (mobile only) + nav */}
        <div className="flex justify-center pt-3 pb-1 shrink-0 sm:hidden">
          <div className="w-10 h-1 rounded-full bg-gray-300 dark:bg-slate-600" />
        </div>
        {onBack && (
          <button
            onClick={onBack}
            className="absolute top-3 left-4 flex items-center gap-1.5 p-2 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors text-xs font-medium"
          >
            <ArrowLeft size={16} />
            <span className="hidden sm:inline">Zestaw</span>
          </button>
        )}
        <button
          onClick={onClose}
          className="absolute top-3 right-4 p-2 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
        >
          <X size={20} />
        </button>

        <div className="overflow-y-auto flex-1 px-4 pb-8 pt-2 sm:pt-4" style={{ paddingBottom: 'calc(2rem + env(safe-area-inset-bottom))' }}>
          {/* Photo */}
          {photoUrl && (
            <div className="w-full aspect-square max-h-48 rounded-2xl overflow-hidden mb-4">
              <img src={photoUrl} alt="" className="w-full h-full object-contain bg-gray-50 dark:bg-slate-800" />
            </div>
          )}

          <p className="font-semibold text-gray-900 dark:text-white mb-4 truncate">{item.title}</p>

          {/* Warnings — not shown for shoes (no API needed) */}
          {!isDirectGen && !hasKey && (
            <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-3 mb-4">
              <AlertCircle size={15} className="text-amber-600 shrink-0" />
              <p className="text-sm text-amber-700 dark:text-amber-400">Brak klucza Groq API — skonfiguruj go w Ustawieniach.</p>
            </div>
          )}
          {!isDirectGen && hasKey && templates.length === 0 && (
            <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-3 mb-4">
              <AlertCircle size={15} className="text-amber-600 shrink-0" />
              <p className="text-sm text-amber-700 dark:text-amber-400">Brak szablonów — dodaj szablon w Ustawieniach.</p>
            </div>
          )}

          {/* Template selector — not needed for shoes */}
          {!isDirectGen && templates.length > 1 && (
            <select
              value={activeTemplateId}
              onChange={e => setSelectedId(e.target.value)}
              className="w-full rounded-xl border border-gray-300 dark:border-slate-600 px-3 py-2.5 text-sm bg-white dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 mb-4"
            >
              {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          )}
          {!isDirectGen && templates.length === 1 && (
            <p className="text-xs text-slate-400 dark:text-slate-500 mb-3">Szablon: {templates[0].name}</p>
          )}

          {/* Template editor */}
          {(isDirectGen || selectedTemplate) && (
            <div className="mb-4">
              <button
                onClick={() => setShowTplEditor(v => !v)}
                className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
              >
                <ChevronDown size={14} className={`transition-transform ${showTplEditor ? 'rotate-180' : ''}`} />
                Edytuj szablon
              </button>

              {showTplEditor && (
                <div className="mt-3 space-y-3">
                  {isDirectGen && effectiveCategory && (
                    <div className="flex flex-wrap gap-1">
                      {(DIRECT_TEMPLATE_VARS[effectiveCategory as DirectCategory] ?? []).map(v => (
                        <span key={v} className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-1.5 py-0.5 rounded font-mono">{v}</span>
                      ))}
                    </div>
                  )}

                  <div>
                    <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 block">Szablon tytułu</label>
                    <textarea
                      value={localTitleTpl}
                      onChange={e => setLocalTitleTpl(e.target.value)}
                      rows={2}
                      className="w-full rounded-xl border border-gray-200 dark:border-slate-700 px-3 py-2.5 text-sm bg-gray-50 dark:bg-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 block">Szablon opisu</label>
                    <textarea
                      value={localDescTpl}
                      onChange={e => setLocalDescTpl(e.target.value)}
                      rows={10}
                      className="w-full rounded-xl border border-gray-200 dark:border-slate-700 px-3 py-2.5 text-sm bg-gray-50 dark:bg-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none font-mono"
                    />
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={saveTemplate}
                      disabled={savingTpl}
                      className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-slate-700 hover:bg-slate-800 dark:bg-slate-600 dark:hover:bg-slate-500 disabled:opacity-40 text-white font-medium py-2.5 text-sm transition-colors"
                    >
                      {savingTpl ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                      Zapisz szablon
                    </button>
                    {isDirectGen && (
                      <button
                        onClick={resetToDefault}
                        title="Przywróć domyślny szablon"
                        className="flex items-center gap-1.5 rounded-xl border border-gray-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800 px-3 py-2.5 text-sm transition-colors"
                      >
                        <RotateCcw size={14} />
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Generate button */}
          <button
            onClick={generate}
            disabled={generating || (!isDirectGen && (!hasKey || !selectedTemplate || !photoUrl))}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium py-3 text-sm transition-colors mb-5"
          >
            {generating
              ? <><Loader2 size={16} className="animate-spin" /> Analizuję zdjęcie…</>
              : result
                ? <><RefreshCw size={16} /> Regeneruj</>
                : <><FileText size={16} /> Generuj opis</>
            }
          </button>

          {/* Result */}
          {result && (
            <div className="space-y-3">
              {/* Title */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Tytuł</p>
                  <button
                    onClick={() => copy(editTitle, 'title')}
                    className="flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-700 font-medium transition-colors"
                  >
                    {copiedTitle ? <><Check size={13} /> Skopiowano</> : <><Copy size={13} /> Kopiuj</>}
                  </button>
                </div>
                <textarea
                  value={editTitle}
                  onChange={e => setEditTitle(e.target.value)}
                  rows={2}
                  className="w-full rounded-xl border border-gray-200 dark:border-slate-700 px-3 py-2.5 text-sm bg-gray-50 dark:bg-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                />
              </div>

              {/* Description */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Opis</p>
                  <button
                    onClick={() => copy(editDesc, 'desc')}
                    className="flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-700 font-medium transition-colors"
                  >
                    {copiedDesc ? <><Check size={13} /> Skopiowano</> : <><Copy size={13} /> Kopiuj</>}
                  </button>
                </div>
                <textarea
                  value={editDesc}
                  onChange={e => setEditDesc(e.target.value)}
                  rows={10}
                  className="w-full rounded-xl border border-gray-200 dark:border-slate-700 px-3 py-2.5 text-sm bg-gray-50 dark:bg-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none font-mono"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </>,
    document.body,
  )
}

// ── bundle children sheet ─────────────────────────────────────────────────────

function BundleChildrenSheet({
  bundle,
  generated,
  onClose,
  onSelectChild,
}: {
  bundle: Item
  generated: Record<string, GeneratedDesc>
  onClose: () => void
  onSelectChild: (child: Item) => void
}) {
  const { data: children = [], isLoading } = useBundleChildren(bundle.id)
  const inStock = children.filter(c => c.status === 'IN_STOCK')

  return createPortal(
    <>
      <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className={[
        'fixed z-50 bg-white dark:bg-slate-900 flex flex-col settings-sheet',
        'inset-x-0 bottom-0 rounded-t-3xl max-h-[85vh]',
        'sm:inset-0 sm:m-auto sm:w-[560px] sm:h-fit sm:max-h-[85vh]',
        'sm:rounded-2xl sm:shadow-2xl',
      ].join(' ')}>
        <div className="flex justify-center pt-3 pb-1 shrink-0 sm:hidden">
          <div className="w-10 h-1 rounded-full bg-gray-300 dark:bg-slate-600" />
        </div>
        <button onClick={onClose} className="absolute top-3 right-4 p-2 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors">
          <X size={20} />
        </button>

        <div className="overflow-y-auto flex-1 px-4 pb-8 pt-2 sm:pt-4" style={{ paddingBottom: 'calc(2rem + env(safe-area-inset-bottom))' }}>
          <p className="font-semibold text-gray-900 dark:text-white mb-1 pr-8">{bundle.title}</p>
          <p className="text-sm text-slate-400 dark:text-slate-500 mb-4">
            {inStock.length} {inStock.length === 1 ? 'karta w magazynie' : 'kart w magazynie'} — wybierz kartę żeby wygenerować opis
          </p>

          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 size={24} className="animate-spin text-emerald-500" />
            </div>
          ) : inStock.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">Brak kart w magazynie</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {inStock.map(child => {
                const hasDesc = !!generated[child.id]
                const photoPath = child.photo_path ?? bundle.photo_path
                return (
                  <button
                    key={child.id}
                    onClick={() => onSelectChild({ ...child, photo_path: photoPath, category: child.category ?? bundle.category })}
                    className="relative rounded-2xl overflow-hidden bg-white dark:bg-slate-800 shadow-sm text-left group transition-all active:scale-95"
                  >
                    <ItemThumb path={photoPath} className="w-full aspect-square" />
                    {hasDesc && (
                      <div className="absolute top-2 right-2 bg-emerald-500 rounded-full p-1 shadow">
                        <Check size={11} className="text-white" strokeWidth={3} />
                      </div>
                    )}
                    <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent px-2.5 pb-2 pt-6">
                      <p className="text-xs font-medium text-white leading-tight line-clamp-2">{child.title}</p>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </>,
    document.body,
  )
}

// ── main page ─────────────────────────────────────────────────────────────────

export default function Opisy() {
  const { data: items = [], isLoading } = useItems({})
  const [selectedItem,   setSelectedItem]   = useState<Item | null>(null)
  const [selectedBundle, setSelectedBundle] = useState<Item | null>(null)
  const [fromBundle,     setFromBundle]     = useState<Item | null>(null)
  const [generated, setGenerated] = useState<Record<string, GeneratedDesc>>(() => getAllGeneratedDescs())

  const itemsWithPhoto = items.filter(i => i.photo_path && i.status !== 'SOLD')

  function handleSaved(itemId: string, desc: GeneratedDesc) {
    setGenerated(prev => ({ ...prev, [itemId]: desc }))
  }

  function handleItemClick(item: Item) {
    if (item.bundle_size != null) {
      setSelectedBundle(item)
    } else {
      setSelectedItem(item)
    }
  }

  function handleSelectChild(child: Item) {
    setFromBundle(selectedBundle)
    setSelectedBundle(null)
    setSelectedItem(child)
  }

  function handleCloseModal() {
    setSelectedItem(null)
    if (fromBundle) {
      setSelectedBundle(fromBundle)
      setFromBundle(null)
    }
  }

  function handleBackToBundle() {
    setSelectedItem(null)
    setSelectedBundle(fromBundle)
    setFromBundle(null)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 size={28} className="animate-spin text-emerald-500" />
      </div>
    )
  }

  if (!itemsWithPhoto.length) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <FileText size={64} className="text-gray-200 dark:text-slate-700 mb-4" />
        <p className="text-lg font-semibold text-gray-400 dark:text-slate-500">Brak przedmiotów ze zdjęciem</p>
        <p className="text-sm text-gray-400 dark:text-slate-500 mt-1 max-w-xs">
          Dodaj zdjęcia do przedmiotów w magazynie, żeby generować opisy.
        </p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl px-4 pt-6 pb-10">
      <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-1">Opisy ogłoszeń</h1>
      <p className="text-sm text-slate-400 dark:text-slate-500 mb-6">
        {itemsWithPhoto.length} {itemsWithPhoto.length === 1 ? 'przedmiot' : 'przedmioty/przedmiotów'} ze zdjęciem
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {itemsWithPhoto.map(item => {
          const isBundle = item.bundle_size != null
          const hasDesc  = !!generated[item.id]
          return (
            <button
              key={item.id}
              onClick={() => handleItemClick(item)}
              className="relative rounded-2xl overflow-hidden bg-white dark:bg-slate-800 shadow-sm text-left group transition-all active:scale-95"
            >
              <ItemThumb path={item.photo_path} className="w-full aspect-square" />

              {/* Bundle indicator */}
              {isBundle && (
                <div className="absolute top-2 left-2 bg-violet-500/90 rounded-full p-1 shadow">
                  <Layers size={11} className="text-white" />
                </div>
              )}

              {/* Generated badge */}
              {hasDesc && (
                <div className="absolute top-2 right-2 bg-emerald-500 rounded-full p-1 shadow">
                  <Check size={11} className="text-white" strokeWidth={3} />
                </div>
              )}

              {/* Title overlay */}
              <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent px-2.5 pb-2 pt-6">
                <p className="text-xs font-medium text-white leading-tight line-clamp-2">{item.title}</p>
              </div>
            </button>
          )
        })}
      </div>

      {selectedItem && (
        <GenerationModal
          item={selectedItem}
          onClose={handleCloseModal}
          onSaved={handleSaved}
          onBack={fromBundle ? handleBackToBundle : undefined}
        />
      )}

      {selectedBundle && (
        <BundleChildrenSheet
          bundle={selectedBundle}
          generated={generated}
          onClose={() => setSelectedBundle(null)}
          onSelectChild={handleSelectChild}
        />
      )}
    </div>
  )
}
