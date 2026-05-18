import { useState, useRef } from 'react'
import { LogOut, Download, Upload, Trash2, Sun, Moon } from 'lucide-react'
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
