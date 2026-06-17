import { supabase } from '../../lib/supabase'
import type { Category, CategoryField, NewCategoryFieldInput } from '../../types/category'

// ── categories ────────────────────────────────────────────────────────────────

export async function listCategories(): Promise<Category[]> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Musisz być zalogowany')
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('user_id', user.id)
    .order('position')
  if (error) throw new Error(error.message)
  return (data ?? []) as Category[]
}

export async function createCategory(name: string): Promise<Category> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Musisz być zalogowany')
  const { data: existing } = await supabase
    .from('categories')
    .select('position')
    .eq('user_id', user.id)
    .order('position', { ascending: false })
    .limit(1)
  const position = existing?.[0] ? (existing[0] as Category).position + 1 : 0
  const { data, error } = await supabase
    .from('categories')
    .insert({ name: name.trim(), user_id: user.id, position })
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data as Category
}

export async function updateCategory(id: string, name: string): Promise<void> {
  const { error } = await supabase
    .from('categories')
    .update({ name: name.trim() })
    .eq('id', id)
  if (error) throw new Error(error.message)
}

export async function deleteCategory(id: string): Promise<void> {
  const { error } = await supabase
    .from('categories')
    .delete()
    .eq('id', id)
  if (error) throw new Error(error.message)
}

// ── category fields ───────────────────────────────────────────────────────────

export async function listCategoryFields(categoryId: string): Promise<CategoryField[]> {
  const { data, error } = await supabase
    .from('category_fields')
    .select('*')
    .eq('category_id', categoryId)
    .order('position')
  if (error) throw new Error(error.message)
  return (data ?? []) as CategoryField[]
}

export async function listAllCategoryFields(): Promise<(CategoryField & { categoryName: string })[]> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []
  const { data, error } = await supabase
    .from('category_fields')
    .select('*, categories!inner(name, user_id)')
    .eq('categories.user_id', user.id)
    .order('position')
  if (error) throw new Error(error.message)
  return ((data ?? []) as unknown[]).map((row) => {
    const r = row as CategoryField & { categories: { name: string } }
    return { ...r, categoryName: r.categories.name, categories: undefined } as unknown as CategoryField & { categoryName: string }
  })
}

export async function createCategoryField(
  categoryId: string,
  input: NewCategoryFieldInput,
): Promise<CategoryField> {
  const { data: existing } = await supabase
    .from('category_fields')
    .select('position')
    .eq('category_id', categoryId)
    .order('position', { ascending: false })
    .limit(1)
  const position = existing?.[0] ? (existing[0] as CategoryField).position + 1 : 0
  const { data, error } = await supabase
    .from('category_fields')
    .insert({ ...input, category_id: categoryId, position })
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data as CategoryField
}

export async function updateCategoryField(
  id: string,
  patch: Partial<NewCategoryFieldInput>,
): Promise<void> {
  const { error } = await supabase
    .from('category_fields')
    .update(patch)
    .eq('id', id)
  if (error) throw new Error(error.message)
}

export async function deleteCategoryField(id: string): Promise<void> {
  const { error } = await supabase
    .from('category_fields')
    .delete()
    .eq('id', id)
  if (error) throw new Error(error.message)
}

// ── seeding ───────────────────────────────────────────────────────────────────

type SeedField = Omit<NewCategoryFieldInput, 'position'>

const DEFAULT_SEED: { name: string; fields: SeedField[] }[] = [
  {
    name: 'Buty piłkarskie',
    fields: [
      { key: 'shoe_level', label: 'Poziom', type: 'select', options: [
        { value: 'amatorski',        label: 'Amatorski' },
        { value: 'półprofesjonalny', label: 'Półprofesjonalny' },
        { value: 'profesjonalny',    label: 'Profesjonalny' },
      ], step: null, min: null, max: null },
      { key: 'shoe_type', label: 'Typ', type: 'select', options: [
        { value: 'lanki',    label: 'Lanki (FG)' },
        { value: 'turfy',   label: 'Turfy (TF)' },
        { value: 'mixy',    label: 'Mixy (SG)' },
        { value: 'halówki', label: 'Halówki (IC)' },
      ], step: null, min: null, max: null },
    ],
  },
  {
    name: 'Buty',
    fields: [
      { key: 'shoe_style', label: 'Rodzaj buta', type: 'select', options: [
        { value: 'mokasyny',  label: 'Mokasyny' },
        { value: 'sneakersy', label: 'Sneakersy' },
        { value: 'klapki',    label: 'Klapki' },
        { value: 'półbuty',   label: 'Półbuty' },
        { value: 'botki',     label: 'Botki' },
      ], step: null, min: null, max: null },
    ],
  },
  { name: 'Karty Pokemon', fields: [] },
  {
    name: 'Boxy Pokemon',
    fields: [
      { key: 'box_type', label: 'Rodzaj boxa', type: 'select', options: [
        { value: 'etb',             label: 'Elite Trainer Box (ETB)' },
        { value: 'blister',         label: 'Blister' },
        { value: 'puszka_tin',      label: 'Puszka Tin' },
        { value: 'puszka_mini_tin', label: 'Puszka Mini Tin' },
        { value: 'pokeball_tin',    label: 'Pokeball Tin' },
      ], step: null, min: null, max: null },
    ],
  },
  {
    name: 'Slab Pokemon',
    fields: [
      { key: 'slab_company', label: 'Firma gradingowa', type: 'select', options: [
        { value: 'PSA', label: 'PSA' },
        { value: 'CGC', label: 'CGC' },
        { value: 'ACE', label: 'ACE' },
        { value: 'TAG', label: 'TAG' },
      ], step: null, min: null, max: null },
      { key: 'slab_grade', label: 'Ocena', type: 'number', options: null, step: 0.5, min: 1, max: 10 },
    ],
  },
]

export async function seedDefaultCategories(): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  for (let i = 0; i < DEFAULT_SEED.length; i++) {
    const seed = DEFAULT_SEED[i]
    const { data: cat, error: catErr } = await supabase
      .from('categories')
      .insert({ name: seed.name, user_id: user.id, position: i })
      .select()
      .single()
    if (catErr) continue
    for (let j = 0; j < seed.fields.length; j++) {
      await supabase.from('category_fields').insert({
        ...seed.fields[j],
        category_id: (cat as Category).id,
        position: j,
      })
    }
  }
}
