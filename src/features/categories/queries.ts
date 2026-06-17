import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as api from './api'
import type { CategoryField, NewCategoryFieldInput } from '../../types/category'

export const CATEGORIES_KEY = 'categories'
export const CATEGORY_FIELDS_KEY = 'category_fields'

// ── categories ────────────────────────────────────────────────────────────────

export function useCategories() {
  return useQuery({
    queryKey: [CATEGORIES_KEY],
    queryFn: async () => {
      const cats = await api.listCategories()
      if (cats.length === 0) {
        await api.seedDefaultCategories()
        return api.listCategories()
      }
      return cats
    },
    staleTime: 60_000,
  })
}

export function useCreateCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (name: string) => api.createCategory(name),
    onSuccess: () => qc.invalidateQueries({ queryKey: [CATEGORIES_KEY] }),
  })
}

export function useUpdateCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => api.updateCategory(id, name),
    onSuccess: () => qc.invalidateQueries({ queryKey: [CATEGORIES_KEY] }),
  })
}

export function useDeleteCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.deleteCategory(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [CATEGORIES_KEY] })
      qc.invalidateQueries({ queryKey: [CATEGORY_FIELDS_KEY] })
    },
  })
}

// ── category fields ───────────────────────────────────────────────────────────

export function useCategoryFields(categoryId: string) {
  return useQuery({
    queryKey: [CATEGORY_FIELDS_KEY, categoryId],
    queryFn: () => api.listCategoryFields(categoryId),
    enabled: !!categoryId,
    staleTime: 60_000,
  })
}

export function useAllCategoryFields(): Record<string, CategoryField[]> {
  const { data = [] } = useQuery({
    queryKey: [CATEGORY_FIELDS_KEY, 'all'],
    queryFn: api.listAllCategoryFields,
    staleTime: 60_000,
  })
  const map: Record<string, CategoryField[]> = {}
  for (const row of data) {
    if (!map[row.categoryName]) map[row.categoryName] = []
    map[row.categoryName].push(row)
  }
  return map
}

export function useCreateCategoryField() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ categoryId, input }: { categoryId: string; input: NewCategoryFieldInput }) =>
      api.createCategoryField(categoryId, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [CATEGORY_FIELDS_KEY] })
    },
  })
}

export function useUpdateCategoryField() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<NewCategoryFieldInput> }) =>
      api.updateCategoryField(id, patch),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [CATEGORY_FIELDS_KEY] })
    },
  })
}

export function useDeleteCategoryField() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.deleteCategoryField(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [CATEGORY_FIELDS_KEY] })
    },
  })
}
