export type Template = {
  id: string
  name: string
  titleTemplate: string
  descTemplate: string
}

const KEY = 'vt_templates'

export function getTemplates(): Template[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '[]')
  } catch {
    return []
  }
}

function save(templates: Template[]) {
  localStorage.setItem(KEY, JSON.stringify(templates))
}

export function addTemplate(t: Omit<Template, 'id'>): Template {
  const newT = { ...t, id: crypto.randomUUID() }
  save([...getTemplates(), newT])
  return newT
}

export function updateTemplate(id: string, patch: Partial<Omit<Template, 'id'>>) {
  save(getTemplates().map(t => (t.id === id ? { ...t, ...patch } : t)))
}

export function deleteTemplate(id: string) {
  save(getTemplates().filter(t => t.id !== id))
}
