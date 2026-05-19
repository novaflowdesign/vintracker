import { useState, useRef } from 'react'
import { LogOut, Download, Upload, Trash2, Sun, Moon, Eye, EyeOff, Plus, Pencil } from 'lucide-react'
import { getGeminiKey, setGeminiKey } from '../lib/gemini'
import { useTemplates, useCreateTemplate, useUpdateTemplate, useDeleteTemplate, type Template } from '../lib/templates'
import clsx from 'clsx'
import { useTheme } from '../context/ThemeContext'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../hooks/useAuth'
import { useItems } from '../features/items/queries'
import { ITEMS_KEY } from '../features/items/queries'
import { supabase } from '../lib/supabase'
import Button from '../components/Button'
import { formatCurrency } from '../utils/format'
import { QUARTERLY_LIMIT_PLN } from '../lib/legal'
import type { Item } from '../types/item'

// ── template form ─────────────────────────────────────────────────────────────

type FormData = { name: string; titleTemplate: string; descTemplate: string }

function TemplateForm({
  data, onChange, onSave, onCancel,
}: {
  data: FormData
  onChange: (d: FormData) => void
  onSave: () => void
  onCancel: () => void
}) {
  return (
    <div className="space-y-2 p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-200 dark:border-emerald-800">
      <input
        placeholder="Nazwa szablonu (np. Karty Pokemon)"
        value={data.name}
        onChange={e => onChange({ ...data, name: e.target.value })}
        className="w-full rounded-xl border border-gray-300 dark:border-slate-600 px-3 py-2 text-sm bg-white dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
      />
      <textarea
        placeholder="Szablon tytułu (np. Pokemon TCG – [Nazwa Pokemona] [Skrót])"
        value={data.titleTemplate}
        onChange={e => onChange({ ...data, titleTemplate: e.target.value })}
        rows={2}
        className="w-full rounded-xl border border-gray-300 dark:border-slate-600 px-3 py-2 text-sm bg-white dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
      />
      <textarea
        placeholder="Szablon opisu..."
        value={data.descTemplate}
        onChange={e => onChange({ ...data, descTemplate: e.target.value })}
        rows={5}
        className="w-full rounded-xl border border-gray-300 dark:border-slate-600 px-3 py-2 text-sm bg-white dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none font-mono"
      />
      <div className="flex gap-2">
        <button
          onClick={onSave}
          className="flex-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium py-2 transition-colors"
        >
          Zapisz
        </button>
        <button
          onClick={onCancel}
          className="flex-1 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-sm font-medium py-2 text-gray-700 dark:text-slate-200 transition-colors"
        >
          Anuluj
        </button>
      </div>
    </div>
  )
}

// ── generator settings card ───────────────────────────────────────────────────

function GeneratorCard() {
  const [keyInput,  setKeyInput]  = useState(getGeminiKey)
  const [showKey,   setShowKey]   = useState(false)
  const { data: templates = [] }  = useTemplates()
  const createTemplate            = useCreateTemplate()
  const updateTemplateMut         = useUpdateTemplate()
  const deleteTemplateMut         = useDeleteTemplate()
  const [editId,    setEditId]    = useState<string | null>(null)
  const [formData,  setFormData]  = useState<FormData>({ name: '', titleTemplate: '', descTemplate: '' })

  function saveKey() {
    setGeminiKey(keyInput)
    toast.success('Klucz zapisany')
  }

  function startAdd() {
    setEditId('new')
    setFormData({ name: '', titleTemplate: '', descTemplate: '' })
  }

  function startEdit(t: Template) {
    setEditId(t.id)
    setFormData({ name: t.name, titleTemplate: t.titleTemplate, descTemplate: t.descTemplate })
  }

  async function saveForm() {
    if (!formData.name.trim() || !formData.titleTemplate.trim()) {
      toast.error('Nazwa i szablon tytułu są wymagane')
      return
    }
    try {
      if (editId === 'new') {
        await createTemplate.mutateAsync(formData)
      } else if (editId) {
        await updateTemplateMut.mutateAsync({ id: editId, patch: formData })
      }
      setEditId(null)
    } catch {
      toast.error('Błąd zapisu szablonu')
    }
  }

  async function removeTemplate(id: string) {
    try {
      await deleteTemplateMut.mutateAsync(id)
    } catch {
      toast.error('Błąd usuwania szablonu')
    }
  }

  return (
    <Card title="Generator opisów">
      {/* API key */}
      <p className="text-xs text-slate-500 dark:text-slate-400 mb-1.5">Klucz Groq API</p>
      <div className="flex gap-2 mb-5">
        <div className="flex-1 relative">
          <input
            type={showKey ? 'text' : 'password'}
            value={keyInput}
            onChange={e => setKeyInput(e.target.value)}
            placeholder="gsk_..."
            className="w-full rounded-xl border border-gray-300 dark:border-slate-600 px-3 py-2 text-sm bg-white dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 pr-9"
          />
          <button
            type="button"
            onClick={() => setShowKey(v => !v)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
          >
            {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        </div>
        <Button variant="secondary" onClick={saveKey} className="shrink-0">Zapisz</Button>
      </div>

      {/* Templates */}
      <p className="text-xs text-slate-500 dark:text-slate-400 mb-1.5">Szablony</p>
      <div className="space-y-2">
        {templates.map(t => (
          editId === t.id ? (
            <TemplateForm key={t.id} data={formData} onChange={setFormData} onSave={saveForm} onCancel={() => setEditId(null)} />
          ) : (
            <div key={t.id} className="flex items-center justify-between px-3 py-2.5 bg-gray-50 dark:bg-slate-700 rounded-xl">
              <span className="text-sm font-medium text-gray-800 dark:text-slate-200 truncate">{t.name}</span>
              <div className="flex gap-1 shrink-0 ml-2">
                <button onClick={() => startEdit(t)} className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors">
                  <Pencil size={14} />
                </button>
                <button onClick={() => removeTemplate(t.id)} className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-900/30 transition-colors">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          )
        ))}

        {editId === 'new' ? (
          <TemplateForm data={formData} onChange={setFormData} onSave={saveForm} onCancel={() => setEditId(null)} />
        ) : (
          <button
            onClick={startAdd}
            className="w-full flex items-center justify-center gap-2 py-2.5 border-2 border-dashed border-gray-300 dark:border-slate-600 rounded-xl text-sm text-slate-400 hover:text-emerald-600 hover:border-emerald-500 transition-colors"
          >
            <Plus size={15} />
            Dodaj szablon
          </button>
        )}
      </div>
    </Card>
  )
}

// ── card wrapper ──────────────────────────────────────────────────────────────

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm p-6">
      <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-4">{title}</h2>
      {children}
    </div>
  )
}

export default function Settings() {
  const { theme, toggle } = useTheme()
  const { user, signOut } = useAuth()
  const qc = useQueryClient()
  const { data: allItems = [] } = useItems({})

  const [importFile, setImportFile] = useState<File | null>(null)
  const [importPreview, setImportPreview] = useState<{ total: number; inStock: number; sold: number } | null>(null)
  const [importData, setImportData] = useState<Item[]>([])
  const [importing, setImporting] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  function handleExport() {
    const backup = {
      version: 1,
      exported_at: new Date().toISOString(),
      user_email: user?.email ?? '',
      items: allItems,
    }
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `vinted-tracker-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImportFile(file)
    const reader = new FileReader()
    reader.onload = ev => {
      try {
        const parsed = JSON.parse(ev.target?.result as string)
        const items: Item[] = parsed.items ?? []
        setImportData(items)
        setImportPreview({
          total: items.length,
          inStock: items.filter(i => i.status === 'IN_STOCK').length,
          sold: items.filter(i => i.status === 'SOLD').length,
        })
      } catch {
        toast.error('Nieprawidłowy plik JSON')
        setImportFile(null)
        setImportPreview(null)
      }
    }
    reader.readAsText(file)
  }

  async function handleImport() {
    if (!importData.length) return
    if (!window.confirm(`Zaimportować ${importData.length} rzeczy? Duplikaty (po id) zostaną pominięte.`)) return
    setImporting(true)
    try {
      const { data: { user: u } } = await supabase.auth.getUser()
      if (!u) throw new Error('Brak autoryzacji')
      const rows = importData.map(item => ({ ...item, user_id: u.id }))
      const { data, error } = await supabase
        .from('items')
        .upsert(rows, { onConflict: 'id', ignoreDuplicates: true })
        .select()
      if (error) throw new Error(error.message)
      qc.invalidateQueries({ queryKey: [ITEMS_KEY] })
      toast.success(`Zaimportowano ${data?.length ?? 0} rzeczy`)
      setImportFile(null)
      setImportPreview(null)
      setImportData([])
      if (fileRef.current) fileRef.current.value = ''
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Błąd importu')
    } finally {
      setImporting(false)
    }
  }

  async function handleDeleteAll() {
    if (!window.confirm('Czy na pewno chcesz usunąć WSZYSTKIE swoje dane? Tej operacji nie można cofnąć.')) return
    const confirm2 = window.prompt('Aby potwierdzić, wpisz: USUWAM')
    if (confirm2 !== 'USUWAM') {
      toast.error('Anulowano — nie wpisano słowa potwierdzenia')
      return
    }
    setDeleting(true)
    try {
      const { data: { user: u } } = await supabase.auth.getUser()
      if (!u) throw new Error('Brak autoryzacji')
      const { error: itemErr } = await supabase.from('items').delete().eq('user_id', u.id)
      if (itemErr) throw new Error(itemErr.message)
      const { data: files } = await supabase.storage.from('item-photos').list(u.id)
      if (files && files.length > 0) {
        await supabase.storage.from('item-photos').remove(files.map(f => `${u.id}/${f.name}`))
      }
      qc.invalidateQueries({ queryKey: [ITEMS_KEY] })
      toast.success('Wyczyszczono wszystkie dane')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Błąd usuwania')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 pt-6 pb-10 space-y-4">
      <h1 className="text-xl font-bold text-gray-900 dark:text-white">Ustawienia</h1>

      <Card title="Wygląd">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {theme === 'dark'
              ? <Moon size={18} className="text-slate-400" />
              : <Sun size={18} className="text-amber-500" />
            }
            <span className="text-sm text-slate-600 dark:text-slate-300">
              {theme === 'dark' ? 'Ciemny motyw' : 'Jasny motyw'}
            </span>
          </div>
          <button
            onClick={toggle}
            role="switch"
            aria-checked={theme === 'dark'}
            className={clsx(
              'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
              theme === 'dark' ? 'bg-emerald-600' : 'bg-gray-300',
            )}
          >
            <span
              className={clsx(
                'inline-block h-4 w-4 rounded-full bg-white shadow transition-transform',
                theme === 'dark' ? 'translate-x-6' : 'translate-x-1',
              )}
            />
          </button>
        </div>
      </Card>

      <Card title="Konto">
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">{user?.email}</p>
        <Button variant="danger" onClick={signOut}>
          <LogOut size={16} />
          Wyloguj
        </Button>
      </Card>

      <Card title="Backup danych">
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
          Eksportuj wszystkie swoje rzeczy do pliku JSON. Trzymaj go bezpiecznie — to Twój backup.
        </p>
        <Button variant="secondary" onClick={handleExport} disabled={!allItems.length}>
          <Download size={16} />
          Eksportuj wszystko (JSON)
        </Button>
      </Card>

      <Card title="Import">
        <p className="text-sm text-amber-700 bg-amber-50 rounded-xl px-4 py-3 mb-4 border border-amber-200">
          Import doda przedmioty z pliku JSON do Twojego konta. Duplikaty (po id) zostaną pominięte.
          Zdjęcia nie są przywracane — tylko metadane.
        </p>
        <div className="space-y-3">
          <label className="flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-dashed border-gray-300 dark:border-slate-600 hover:border-emerald-500 hover:bg-emerald-50 transition-colors cursor-pointer text-sm text-gray-600 dark:text-slate-300">
            <Upload size={16} className="shrink-0" />
            {importFile ? importFile.name : 'Wybierz plik .json'}
            <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={handleFileSelect} />
          </label>
          {importPreview && (
            <div className="bg-gray-50 dark:bg-slate-700 rounded-xl px-4 py-3 text-sm text-gray-700 dark:text-slate-200">
              Plik zawiera <span className="font-semibold">{importPreview.total}</span> rzeczy
              {' '}(<span className="text-emerald-600 font-medium">{importPreview.inStock} w magazynie</span>,{' '}
              <span className="text-slate-500">{importPreview.sold} sprzedanych</span>)
            </div>
          )}
          {importPreview && (
            <Button onClick={handleImport} loading={importing}>
              Importuj
            </Button>
          )}
        </div>
      </Card>

      <Card title="Strefa niebezpieczna">
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
          Usuwa wszystkie Twoje przedmioty i zdjęcia z serwera. Tej operacji nie można cofnąć.
        </p>
        <Button variant="danger" onClick={handleDeleteAll} loading={deleting}>
          <Trash2 size={16} />
          Usuń wszystkie moje dane
        </Button>
      </Card>

      <GeneratorCard />

      <Card title="O aplikacji">
        <div className="text-sm text-slate-500 dark:text-slate-400 space-y-1.5">
          <p className="font-medium text-gray-900 dark:text-white">Vinted Tracker v0.1.0</p>
          <p>Limit działalności nierejestrowanej: {formatCurrency(QUARTERLY_LIMIT_PLN)} / kwartał (2026)</p>
          <a href="#" className="text-emerald-600 hover:underline block">GitHub →</a>
        </div>
      </Card>
    </div>
  )
}
