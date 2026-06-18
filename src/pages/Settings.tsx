import { useState, useRef } from 'react'
import { LogOut, Download, Upload, Trash2, Sun, Moon, Eye, EyeOff, Tag } from 'lucide-react'
import * as XLSX from 'xlsx'
import CategoryManager from '../features/categories/CategoryManager'
import { getGeminiKey, setGeminiKey } from '../lib/gemini'
import clsx from 'clsx'
import { useTheme } from '../context/ThemeContext'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../hooks/useAuth'
import { useItems, ITEMS_KEY } from '../features/items/queries'
import { supabase } from '../lib/supabase'
import Button from '../components/Button'
import { formatCurrency } from '../utils/format'
import { QUARTERLY_LIMIT_PLN } from '../lib/legal'
import type { Item } from '../types/item'

// ── types ─────────────────────────────────────────────────────────────────────

interface XlsRow {
  title: string
  category: string | null
  purchase_price: number
  purchase_date: string
  received_date: string | null
  sale_price: number | null
  sale_date: string | null
  status: 'IN_STOCK' | 'SOLD'
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

// ── generator settings card ───────────────────────────────────────────────────

function GeneratorCard() {
  const [keyInput, setKeyInput] = useState(getGeminiKey)
  const [showKey, setShowKey]   = useState(false)

  function saveKey() {
    setGeminiKey(keyInput)
    toast.success('Klucz zapisany')
  }

  return (
    <Card title="Generator opisów">
      <p className="text-xs text-slate-500 dark:text-slate-400 mb-1.5">Klucz Groq API</p>
      <div className="flex gap-2">
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
    </Card>
  )
}

// ── main settings page ────────────────────────────────────────────────────────

export default function Settings() {
  const { theme, toggle } = useTheme()
  const { user, signOut } = useAuth()
  const qc = useQueryClient()
  const { data: allItems = [] } = useItems({})

  const [importFile,    setImportFile]    = useState<File | null>(null)
  const [importPreview, setImportPreview] = useState<{ total: number; inStock: number; sold: number } | null>(null)
  const [importData,    setImportData]    = useState<XlsRow[]>([])
  const [importing,     setImporting]     = useState(false)
  const [deleting,      setDeleting]      = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  // ── backup export (XLS) ────────────────────────────────────────────────────

  function itemStatus(item: Item): string {
    if (item.status === 'SOLD') return 'Sprzedane'
    if (!item.received_date || new Date(item.received_date) > new Date()) return 'W dostawie'
    return 'W magazynie'
  }

  function handleExport() {
    const rows = allItems.map((item: Item) => ({
      'Nazwa':                 item.title,
      'Kategoria':             item.category ?? '',
      'Cena zakupu (PLN)':    item.purchase_price,
      'Data zakupu':           item.purchase_date,
      'Cena sprzedaży (PLN)': item.sale_price ?? '',
      'Data sprzedaży':        item.sale_date ?? '',
      'Status':                itemStatus(item),
    }))

    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Vintracker')
    XLSX.writeFile(wb, `vintracker-backup-${new Date().toISOString().slice(0, 10)}.xlsx`)
  }

  // ── import (XLS) ───────────────────────────────────────────────────────────

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImportFile(file)

    const reader = new FileReader()
    reader.onload = ev => {
      try {
        const data = new Uint8Array(ev.target?.result as ArrayBuffer)
        const wb   = XLSX.read(data, { type: 'array' })
        const ws   = wb.Sheets[wb.SheetNames[0]]
        const raw  = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws)

        const parsed: XlsRow[] = raw
          .map(r => ({
            title:          String(r['Nazwa'] ?? '').trim(),
            category:       r['Kategoria'] ? String(r['Kategoria']).trim() : null,
            purchase_price: Number(r['Cena zakupu (PLN)'] ?? 0),
            purchase_date:  String(r['Data zakupu'] ?? new Date().toISOString().slice(0, 10)).trim(),
            sale_price:     r['Cena sprzedaży (PLN)'] !== '' && r['Cena sprzedaży (PLN)'] != null
                              ? Number(r['Cena sprzedaży (PLN)'])
                              : null,
            sale_date:      r['Data sprzedaży'] ? String(r['Data sprzedaży']).trim() : null,
            status:         (String(r['Status']) === 'Sprzedane' ? 'SOLD' : 'IN_STOCK') as 'IN_STOCK' | 'SOLD',
            received_date:  String(r['Status']) === 'W dostawie' ? null : (r['Data zakupu'] ? String(r['Data zakupu']).trim() : null),
          }))
          .filter(r => r.title.length > 0)

        setImportData(parsed)
        setImportPreview({
          total:   parsed.length,
          inStock: parsed.filter(i => i.status === 'IN_STOCK').length,
          sold:    parsed.filter(i => i.status === 'SOLD').length,
        })
      } catch {
        toast.error('Nieprawidłowy plik XLS')
        setImportFile(null)
        setImportPreview(null)
      }
    }
    reader.readAsArrayBuffer(file)
  }

  async function handleImport() {
    if (!importData.length) return
    if (!window.confirm(`Zaimportować ${importData.length} rzeczy?`)) return
    setImporting(true)
    try {
      const { data: { user: u } } = await supabase.auth.getUser()
      if (!u) throw new Error('Brak autoryzacji')

      const now = new Date().toISOString()
      const rows = importData.map(row => ({
        id:                           crypto.randomUUID(),
        user_id:                      u.id,
        title:                        row.title,
        description:                  null,
        category:                     row.category,
        brand:                        null,
        size:                         null,
        condition:                    null,
        photo_path:                   null,
        purchase_price:               row.purchase_price,
        purchase_date:                row.purchase_date,
        received_date:                row.received_date,
        purchase_source:              null,
        status:                       row.status,
        sale_price:                   row.sale_price,
        sale_date:                    row.sale_date,
        shipping_cost_paid_by_seller: 0,
        buyer_country:                null,
        notes:                        null,
        bundle_id:                    null,
        bundle_size:                  null,
        metadata:                     null,
        created_at:                   now,
        updated_at:                   now,
      }))

      const { data, error } = await supabase.from('items').insert(rows).select()
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

  // ── delete all ─────────────────────────────────────────────────────────────

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

  // ── render ─────────────────────────────────────────────────────────────────

  return (
    <div className="mx-auto max-w-2xl px-4 pt-6 pb-10 space-y-4">
      <h1 className="text-xl font-bold text-gray-900 dark:text-white">Ustawienia</h1>

      {/* 1. Kategorie */}
      <Card title="Kategorie">
        <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 mb-4">
          <Tag size={15} />
          <span>Zarządzaj kategoriami i ich polami. Zmiany działają na żywo w formularzach.</span>
        </div>
        <CategoryManager />
      </Card>

      {/* 2. Backup */}
      <Card title="Backup danych">
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
          Eksportuje wszystkie Twoje rzeczy do arkusza XLS z nazwą, ceną zakupu/sprzedaży i datami.
        </p>
        <Button variant="secondary" onClick={handleExport} disabled={!allItems.length}>
          <Download size={16} />
          Eksportuj do XLS ({allItems.length})
        </Button>
      </Card>

      {/* 3. Import */}
      <Card title="Import">
        <p className="text-sm text-amber-700 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-300 rounded-xl px-4 py-3 mb-4 border border-amber-200 dark:border-amber-800">
          Wczytaj plik .xlsx w formacie eksportu Vintrackera. Każdy wiersz zostanie dodany jako nowa rzecz.
          Zdjęcia nie są przywracane.
        </p>
        <div className="space-y-3">
          <label className="flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-dashed border-gray-300 dark:border-slate-600 hover:border-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/10 transition-colors cursor-pointer text-sm text-gray-600 dark:text-slate-300">
            <Upload size={16} className="shrink-0" />
            {importFile ? importFile.name : 'Wybierz plik .xlsx'}
            <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFileSelect} />
          </label>
          {importPreview && (
            <div className="bg-gray-50 dark:bg-slate-700 rounded-xl px-4 py-3 text-sm text-gray-700 dark:text-slate-200">
              Plik zawiera <span className="font-semibold">{importPreview.total}</span> rzeczy
              {' '}(<span className="text-emerald-600 font-medium">{importPreview.inStock} w magazynie</span>,{' '}
              <span className="text-slate-500 dark:text-slate-400">{importPreview.sold} sprzedanych</span>)
            </div>
          )}
          {importPreview && (
            <Button onClick={handleImport} loading={importing}>
              Importuj
            </Button>
          )}
        </div>
      </Card>

      {/* 4. Generator opisów */}
      <GeneratorCard />

      {/* 5. Wygląd */}
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

      {/* 6. O aplikacji */}
      <Card title="O aplikacji">
        <div className="text-sm text-slate-500 dark:text-slate-400 space-y-1.5">
          <p className="font-medium text-gray-900 dark:text-white">Vintracker v0.1.0</p>
          <p>Limit działalności nierejestrowanej: {formatCurrency(QUARTERLY_LIMIT_PLN)} / kwartał (2026)</p>
          {user?.email && (
            <p className="text-xs pt-1">Zalogowany jako: <span className="font-medium text-gray-700 dark:text-slate-300">{user.email}</span></p>
          )}
        </div>
      </Card>

      {/* 7. Strefa niebezpieczna */}
      <Card title="Strefa niebezpieczna">
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
          Usuwa wszystkie Twoje przedmioty i zdjęcia z serwera. Tej operacji nie można cofnąć.
        </p>
        <Button variant="danger" onClick={handleDeleteAll} loading={deleting}>
          <Trash2 size={16} />
          Usuń wszystkie moje dane
        </Button>
      </Card>

      {/* 8. Wyloguj */}
      <button
        onClick={signOut}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border-2 border-gray-200 dark:border-slate-700 text-sm font-medium text-gray-600 dark:text-slate-300 hover:border-rose-400 hover:text-rose-600 dark:hover:border-rose-500 dark:hover:text-rose-400 transition-colors"
      >
        <LogOut size={16} />
        Wyloguj
      </button>
    </div>
  )
}
