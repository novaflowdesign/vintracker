import { supabase } from '../../lib/supabase'
import type { Item, ItemStatus } from '../../types/item'
import { compressImage } from '../../utils/image'

export type NewItemInput = {
  title: string
  description?: string | null
  category?: string | null
  brand?: string | null
  size?: string | null
  condition?: string | null
  purchase_price: number
  purchase_date: string
  purchase_source?: string | null
  notes?: string | null
}

export type SortOrder = 'newest' | 'oldest' | 'price_desc'

export async function listItems(filters?: {
  status?: ItemStatus
  category?: string
  search?: string
  sort?: SortOrder
}): Promise<Item[]> {
  let q = supabase.from('items').select('*').is('bundle_id', null)

  if (filters?.status)         q = q.eq('status', filters.status)
  if (filters?.category)       q = q.eq('category', filters.category)
  if (filters?.search?.trim()) q = q.ilike('title', `%${filters.search.trim()}%`)

  const sort = filters?.sort ?? 'newest'
  if (sort === 'oldest')         q = q.order('created_at', { ascending: true })
  else if (sort === 'price_desc') q = q.order('purchase_price', { ascending: false })
  else                            q = q.order('created_at', { ascending: false })

  const { data, error } = await q
  if (error) throw new Error(`Błąd pobierania: ${error.message}`)
  return (data ?? []) as Item[]
}

export async function listAllSoldBundleChildren(): Promise<Item[]> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Musisz być zalogowany')
  const { data, error } = await supabase
    .from('items')
    .select('*')
    .eq('user_id', user.id)
    .eq('status', 'SOLD')
    .not('bundle_id', 'is', null)
    .order('sale_date', { ascending: false })
  if (error) throw new Error(`Błąd pobierania: ${error.message}`)
  return (data ?? []) as Item[]
}

export async function listBundleChildren(bundleId: string): Promise<Item[]> {
  const { data, error } = await supabase
    .from('items')
    .select('*')
    .eq('bundle_id', bundleId)
    .order('created_at', { ascending: true })
  if (error) throw new Error(`Błąd pobierania dzieci: ${error.message}`)
  return (data ?? []) as Item[]
}

export async function getItem(id: string): Promise<Item | null> {
  const { data, error } = await supabase
    .from('items')
    .select('*')
    .eq('id', id)
    .maybeSingle()
  if (error) throw new Error(`Błąd pobierania: ${error.message}`)
  return data as Item | null
}

export async function createItem(input: NewItemInput): Promise<Item> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Musisz być zalogowany')

  const { data, error } = await supabase
    .from('items')
    .insert({ ...input, user_id: user.id, status: 'IN_STOCK' })
    .select()
    .single()
  if (error) throw new Error(`Błąd tworzenia: ${error.message}`)
  return data as Item
}

export async function createBundle(
  input: NewItemInput,
  bundleSize: number,
): Promise<{ parent: Item; children: Item[] }> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Musisz być zalogowany')

  const unitPrice = Number(input.purchase_price) / bundleSize

  const { data: parentData, error: parentErr } = await supabase
    .from('items')
    .insert({ ...input, user_id: user.id, status: 'IN_STOCK', bundle_size: bundleSize })
    .select()
    .single()
  if (parentErr) throw new Error(`Błąd tworzenia zestawu: ${parentErr.message}`)
  const parent = parentData as Item

  const childRows = Array.from({ length: bundleSize }, (_, i) => ({
    user_id:      user.id,
    title:        `${input.title} #${i + 1}`,
    purchase_price: unitPrice,
    purchase_date:  input.purchase_date,
    category:       input.category ?? null,
    status:         'IN_STOCK',
    bundle_id:      parent.id,
    shipping_cost_paid_by_seller: 0,
  }))

  const { data: childrenData, error: childrenErr } = await supabase
    .from('items')
    .insert(childRows)
    .select()
  if (childrenErr) throw new Error(`Błąd tworzenia przedmiotów: ${childrenErr.message}`)

  return { parent, children: (childrenData ?? []) as Item[] }
}

export async function updateItem(id: string, patch: Partial<Item>): Promise<Item> {
  const { data, error } = await supabase
    .from('items')
    .update(patch)
    .eq('id', id)
    .select()
    .single()
  if (error) throw new Error(`Błąd aktualizacji: ${error.message}`)
  return data as Item
}

export async function markAsSold(
  id: string,
  sale: {
    sale_price: number
    sale_date: string
    shipping_cost_paid_by_seller?: number
    buyer_country?: string
  },
): Promise<Item> {
  const item = await updateItem(id, {
    status: 'SOLD',
    sale_price: sale.sale_price,
    sale_date: sale.sale_date,
    shipping_cost_paid_by_seller: sale.shipping_cost_paid_by_seller ?? 0,
    buyer_country: sale.buyer_country ?? null,
  })

  // If this is a bundle child — check if all siblings are now sold
  if (item.bundle_id) {
    const siblings = await listBundleChildren(item.bundle_id)
    if (siblings.every(s => s.status === 'SOLD')) {
      const totalSale = siblings.reduce((s, i) => s + Number(i.sale_price ?? 0), 0)
      const lastDate  = siblings
        .map(i => i.sale_date)
        .filter(Boolean)
        .sort()
        .pop() ?? sale.sale_date
      await updateItem(item.bundle_id, {
        status:     'SOLD',
        sale_price: totalSale,
        sale_date:  lastDate ?? sale.sale_date,
      })
    }
  }

  return item
}

export async function deleteItem(id: string): Promise<void> {
  const { error } = await supabase.from('items').delete().eq('id', id)
  if (error) throw new Error(`Błąd usuwania: ${error.message}`)
}

export async function uploadPhoto(itemId: string, file: File): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Musisz być zalogowany')

  const compressed = await compressImage(file)
  const path = `${user.id}/${itemId}.jpg`

  const { error } = await supabase.storage
    .from('item-photos')
    .upload(path, compressed, { contentType: 'image/jpeg', upsert: true })
  if (error) throw new Error(`Błąd uploadu zdjęcia: ${error.message}`)
  return path
}

export async function getPhotoUrl(path: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from('item-photos')
    .createSignedUrl(path, 3600)
  if (error) throw new Error(`Błąd URL zdjęcia: ${error.message}`)
  return data.signedUrl
}

export async function deletePhoto(path: string): Promise<void> {
  const { error } = await supabase.storage.from('item-photos').remove([path])
  if (error) throw new Error(`Błąd usuwania zdjęcia: ${error.message}`)
}
