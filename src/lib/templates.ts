import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from './supabase'

export const TEMPLATES_KEY = 'templates'

export type Template = {
  id: string
  name: string
  titleTemplate: string
  descTemplate: string
}

type DBRow = {
  id: string
  name: string
  title_template: string
  desc_template: string
  created_at: string
}

function fromDB(row: DBRow): Template {
  return { id: row.id, name: row.name, titleTemplate: row.title_template, descTemplate: row.desc_template }
}

// ── API ───────────────────────────────────────────────────────────────────────

async function fetchTemplates(): Promise<Template[]> {
  const { data, error } = await supabase
    .from('templates')
    .select('*')
    .order('created_at', { ascending: true })
  if (error) throw error
  return ((data ?? []) as DBRow[]).map(fromDB)
}

async function apiCreateTemplate(t: Omit<Template, 'id'>): Promise<Template> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const { data, error } = await supabase
    .from('templates')
    .insert({ user_id: user.id, name: t.name, title_template: t.titleTemplate, desc_template: t.descTemplate })
    .select()
    .single()
  if (error) throw error
  return fromDB(data as DBRow)
}

async function apiUpdateTemplate(id: string, patch: Partial<Omit<Template, 'id'>>): Promise<void> {
  const update: Record<string, string> = {}
  if (patch.name          !== undefined) update.name           = patch.name
  if (patch.titleTemplate !== undefined) update.title_template = patch.titleTemplate
  if (patch.descTemplate  !== undefined) update.desc_template  = patch.descTemplate
  const { error } = await supabase.from('templates').update(update).eq('id', id)
  if (error) throw error
}

async function apiDeleteTemplate(id: string): Promise<void> {
  const { error } = await supabase.from('templates').delete().eq('id', id)
  if (error) throw error
}

// ── Hooks ─────────────────────────────────────────────────────────────────────

export function useTemplates() {
  return useQuery({ queryKey: [TEMPLATES_KEY], queryFn: fetchTemplates })
}

export function useCreateTemplate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: apiCreateTemplate,
    onSuccess: () => qc.invalidateQueries({ queryKey: [TEMPLATES_KEY] }),
  })
}

export function useUpdateTemplate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<Omit<Template, 'id'>> }) =>
      apiUpdateTemplate(id, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: [TEMPLATES_KEY] }),
  })
}

export function useDeleteTemplate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: apiDeleteTemplate,
    onSuccess: () => qc.invalidateQueries({ queryKey: [TEMPLATES_KEY] }),
  })
}
