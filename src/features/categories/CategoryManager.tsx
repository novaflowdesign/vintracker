import { useState } from 'react'
import { ChevronDown, ChevronRight, Plus, Pencil, Trash2, Check, X, GripVertical } from 'lucide-react'
import { toast } from 'sonner'
import {
  useCategories,
  useCreateCategory,
  useUpdateCategory,
  useDeleteCategory,
  useCategoryFields,
  useCreateCategoryField,
  useUpdateCategoryField,
  useDeleteCategoryField,
} from './queries'
import type { Category, CategoryField, CategoryFieldType, CategoryFieldOption, NewCategoryFieldInput } from '../../types/category'

// ── helpers ───────────────────────────────────────────────────────────────────

const inputCls = 'w-full rounded-xl border border-gray-300 dark:border-slate-600 px-3 py-2 text-sm bg-white dark:bg-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500 transition'
const selectCls = 'rounded-xl border border-gray-300 dark:border-slate-600 px-3 py-2 text-sm bg-white dark:bg-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500 transition'

const FIELD_TYPE_LABELS: Record<CategoryFieldType, string> = {
  text:   'Tekst',
  select: 'Lista wyboru',
  number: 'Liczba',
}

// ── field form ────────────────────────────────────────────────────────────────

interface FieldDraft {
  key: string
  label: string
  type: CategoryFieldType
  options: CategoryFieldOption[]
  step: string
  min: string
  max: string
}

function emptyDraft(): FieldDraft {
  return { key: '', label: '', type: 'select', options: [{ value: '', label: '' }], step: '', min: '', max: '' }
}

function fieldDraftFromField(f: CategoryField): FieldDraft {
  return {
    key:     f.key,
    label:   f.label,
    type:    f.type,
    options: f.options ?? [{ value: '', label: '' }],
    step:    f.step != null ? String(f.step) : '',
    min:     f.min  != null ? String(f.min)  : '',
    max:     f.max  != null ? String(f.max)  : '',
  }
}

function draftToInput(d: FieldDraft): NewCategoryFieldInput {
  const options = d.type === 'select'
    ? d.options.filter(o => o.value.trim() && o.label.trim())
    : null
  return {
    key:      d.key.trim().replace(/\s+/g, '_').toLowerCase(),
    label:    d.label.trim(),
    type:     d.type,
    options,
    step:     d.step ? parseFloat(d.step) : null,
    min:      d.min  ? parseFloat(d.min)  : null,
    max:      d.max  ? parseFloat(d.max)  : null,
    position: 0,
  }
}

function FieldForm({
  initial,
  onSave,
  onCancel,
  saving,
}: {
  initial: FieldDraft
  onSave: (d: FieldDraft) => void
  onCancel: () => void
  saving: boolean
}) {
  const [d, setD] = useState<FieldDraft>(initial)

  function set<K extends keyof FieldDraft>(k: K, v: FieldDraft[K]) {
    setD(prev => ({ ...prev, [k]: v }))
  }

  function setOption(i: number, field: 'value' | 'label', v: string) {
    setD(prev => {
      const opts = [...prev.options]
      opts[i] = { ...opts[i], [field]: v }
      return { ...prev, options: opts }
    })
  }

  function addOption() {
    setD(prev => ({ ...prev, options: [...prev.options, { value: '', label: '' }] }))
  }

  function removeOption(i: number) {
    setD(prev => ({ ...prev, options: prev.options.filter((_, j) => j !== i) }))
  }

  function submit() {
    if (!d.key.trim() || !d.label.trim()) {
      toast.error('Klucz i etykieta są wymagane')
      return
    }
    if (d.type === 'select' && !d.options.some(o => o.value.trim() && o.label.trim())) {
      toast.error('Dodaj co najmniej jedną opcję')
      return
    }
    onSave(d)
  }

  return (
    <div className="space-y-3 p-3 bg-gray-50 dark:bg-slate-700/50 rounded-xl border border-gray-200 dark:border-slate-600">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs text-slate-500 dark:text-slate-400 block mb-1">Etykieta</label>
          <input className={inputCls} placeholder="np. Rozmiar" value={d.label} onChange={e => set('label', e.target.value)} />
        </div>
        <div>
          <label className="text-xs text-slate-500 dark:text-slate-400 block mb-1">Klucz (w bazie)</label>
          <input className={inputCls} placeholder="np. shoe_size" value={d.key} onChange={e => set('key', e.target.value)} />
        </div>
      </div>

      <div>
        <label className="text-xs text-slate-500 dark:text-slate-400 block mb-1">Typ</label>
        <select className={selectCls + ' w-full'} value={d.type} onChange={e => set('type', e.target.value as CategoryFieldType)}>
          {(Object.keys(FIELD_TYPE_LABELS) as CategoryFieldType[]).map(t => (
            <option key={t} value={t}>{FIELD_TYPE_LABELS[t]}</option>
          ))}
        </select>
      </div>

      {d.type === 'select' && (
        <div>
          <label className="text-xs text-slate-500 dark:text-slate-400 block mb-1">Opcje (wartość : etykieta)</label>
          <div className="space-y-1.5">
            {d.options.map((opt, i) => (
              <div key={i} className="flex gap-1.5 items-center">
                <input
                  className={inputCls + ' flex-1'}
                  placeholder="wartość"
                  value={opt.value}
                  onChange={e => setOption(i, 'value', e.target.value)}
                />
                <input
                  className={inputCls + ' flex-1'}
                  placeholder="etykieta"
                  value={opt.label}
                  onChange={e => setOption(i, 'label', e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => removeOption(i)}
                  className="p-1.5 text-slate-400 hover:text-rose-500 shrink-0"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={addOption}
              className="text-xs text-emerald-600 hover:text-emerald-700 flex items-center gap-1 mt-1"
            >
              <Plus size={12} /> Dodaj opcję
            </button>
          </div>
        </div>
      )}

      {d.type === 'number' && (
        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="text-xs text-slate-500 dark:text-slate-400 block mb-1">Krok</label>
            <input type="number" className={inputCls} placeholder="np. 0.5" value={d.step} onChange={e => set('step', e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-slate-500 dark:text-slate-400 block mb-1">Min</label>
            <input type="number" className={inputCls} value={d.min} onChange={e => set('min', e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-slate-500 dark:text-slate-400 block mb-1">Max</label>
            <input type="number" className={inputCls} value={d.max} onChange={e => set('max', e.target.value)} />
          </div>
        </div>
      )}

      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={submit}
          disabled={saving}
          className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium py-2 disabled:opacity-50 transition-colors"
        >
          <Check size={14} /> Zapisz
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-sm font-medium py-2 text-gray-700 dark:text-slate-200 transition-colors"
        >
          Anuluj
        </button>
      </div>
    </div>
  )
}

// ── single field row ──────────────────────────────────────────────────────────

function FieldRow({ field, categoryId }: { field: CategoryField; categoryId: string }) {
  const [editing, setEditing] = useState(false)
  const update = useUpdateCategoryField()
  const remove = useDeleteCategoryField()

  async function handleSave(d: FieldDraft) {
    try {
      await update.mutateAsync({ id: field.id, patch: draftToInput(d) })
      setEditing(false)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Błąd zapisu')
    }
  }

  async function handleDelete() {
    if (!window.confirm(`Usunąć pole "${field.label}"?`)) return
    try {
      await remove.mutateAsync(field.id)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Błąd usuwania')
    }
  }

  if (editing) {
    return (
      <FieldForm
        initial={fieldDraftFromField(field)}
        onSave={handleSave}
        onCancel={() => setEditing(false)}
        saving={update.isPending}
      />
    )
  }

  const typeSummary = field.type === 'select'
    ? `${field.options?.length ?? 0} opcji`
    : field.type === 'number'
    ? [field.min != null && `min ${field.min}`, field.max != null && `max ${field.max}`, field.step != null && `krok ${field.step}`].filter(Boolean).join(', ') || 'liczba'
    : 'tekst'

  return (
    <div className="flex items-center gap-2 px-2 py-2 bg-white dark:bg-slate-800 rounded-lg border border-gray-100 dark:border-slate-700">
      <GripVertical size={14} className="text-slate-300 dark:text-slate-600 shrink-0" />
      <div className="flex-1 min-w-0">
        <span className="text-sm font-medium text-gray-800 dark:text-slate-200">{field.label}</span>
        <span className="ml-2 text-xs text-slate-400 dark:text-slate-500">
          <code className="bg-gray-100 dark:bg-slate-700 px-1 rounded">{field.key}</code>
          {' · '}{FIELD_TYPE_LABELS[field.type]}
          {' · '}{typeSummary}
        </span>
      </div>
      <button
        onClick={() => setEditing(true)}
        className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
      >
        <Pencil size={13} />
      </button>
      <button
        onClick={handleDelete}
        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-900/30 transition-colors"
      >
        <Trash2 size={13} />
      </button>
    </div>
  )
}

// ── category fields list ──────────────────────────────────────────────────────

function CategoryFields({ category }: { category: Category }) {
  const { data: fields = [], isLoading } = useCategoryFields(category.id)
  const createField = useCreateCategoryField()
  const [adding, setAdding] = useState(false)

  async function handleAdd(d: FieldDraft) {
    try {
      await createField.mutateAsync({ categoryId: category.id, input: draftToInput(d) })
      setAdding(false)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Błąd zapisu')
    }
  }

  if (isLoading) {
    return <div className="text-xs text-slate-400 py-2 pl-2">Ładowanie pól...</div>
  }

  return (
    <div className="pl-2 pt-2 space-y-1.5">
      {fields.map(f => (
        <FieldRow key={f.id} field={f} categoryId={category.id} />
      ))}

      {adding ? (
        <FieldForm
          initial={emptyDraft()}
          onSave={handleAdd}
          onCancel={() => setAdding(false)}
          saving={createField.isPending}
        />
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="w-full flex items-center justify-center gap-1.5 py-2 border-2 border-dashed border-gray-200 dark:border-slate-700 rounded-xl text-xs text-slate-400 hover:text-emerald-600 hover:border-emerald-400 transition-colors"
        >
          <Plus size={12} /> Dodaj pole
        </button>
      )}
    </div>
  )
}

// ── category row ──────────────────────────────────────────────────────────────

function CategoryRow({ category }: { category: Category }) {
  const [open,    setOpen]    = useState(false)
  const [editing, setEditing] = useState(false)
  const [name,    setName]    = useState(category.name)
  const update = useUpdateCategory()
  const remove = useDeleteCategory()

  async function handleSave() {
    if (!name.trim()) return
    try {
      await update.mutateAsync({ id: category.id, name })
      setEditing(false)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Błąd zapisu')
    }
  }

  async function handleDelete() {
    if (!window.confirm(`Usunąć kategorię "${category.name}" wraz z wszystkimi jej polami?`)) return
    try {
      await remove.mutateAsync(category.id)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Błąd usuwania')
    }
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-3">
        <button
          type="button"
          onClick={() => setOpen(v => !v)}
          className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 shrink-0"
        >
          {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </button>

        {editing ? (
          <>
            <input
              autoFocus
              className={inputCls + ' flex-1'}
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') { setName(category.name); setEditing(false) } }}
            />
            <button
              type="button"
              onClick={handleSave}
              disabled={update.isPending}
              className="p-1.5 text-emerald-600 hover:text-emerald-700 disabled:opacity-50"
            >
              <Check size={16} />
            </button>
            <button
              type="button"
              onClick={() => { setName(category.name); setEditing(false) }}
              className="p-1.5 text-slate-400 hover:text-slate-600"
            >
              <X size={16} />
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => setOpen(v => !v)}
              className="flex-1 text-left text-sm font-medium text-gray-900 dark:text-white"
            >
              {category.name}
            </button>
            <button
              onClick={() => { setEditing(true); setOpen(true) }}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
            >
              <Pencil size={14} />
            </button>
            <button
              onClick={handleDelete}
              className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-900/30 transition-colors"
            >
              <Trash2 size={14} />
            </button>
          </>
        )}
      </div>

      {open && (
        <div className="border-t border-gray-100 dark:border-slate-700 px-3 pb-3">
          <CategoryFields category={category} />
        </div>
      )}
    </div>
  )
}

// ── main component ────────────────────────────────────────────────────────────

export default function CategoryManager() {
  const { data: categories = [], isLoading } = useCategories()
  const createCategory = useCreateCategory()
  const [adding, setAdding] = useState(false)
  const [newName, setNewName] = useState('')

  async function handleCreate() {
    if (!newName.trim()) return
    try {
      await createCategory.mutateAsync(newName)
      setNewName('')
      setAdding(false)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Błąd tworzenia kategorii')
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-12 bg-gray-100 dark:bg-slate-700 rounded-xl animate-pulse" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {categories.map(cat => (
        <CategoryRow key={cat.id} category={cat} />
      ))}

      {adding ? (
        <div className="flex gap-2">
          <input
            autoFocus
            className={inputCls + ' flex-1'}
            placeholder="Nazwa kategorii"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') { setNewName(''); setAdding(false) } }}
          />
          <button
            type="button"
            onClick={handleCreate}
            disabled={createCategory.isPending}
            className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium disabled:opacity-50 transition-colors"
          >
            <Check size={16} />
          </button>
          <button
            type="button"
            onClick={() => { setNewName(''); setAdding(false) }}
            className="px-3 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-500 text-sm font-medium transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-gray-300 dark:border-slate-600 rounded-xl text-sm text-slate-400 hover:text-emerald-600 hover:border-emerald-500 transition-colors"
        >
          <Plus size={15} /> Dodaj kategorię
        </button>
      )}
    </div>
  )
}
