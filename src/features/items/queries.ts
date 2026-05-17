import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as api from './api'
import type { Item, ItemStatus } from '../../types/item'
import type { SortOrder } from './api'

export const ITEMS_KEY = 'items'

// ── queries ──────────────────────────────────────────────────────────────────

export function useItems(filters?: {
  status?: ItemStatus
  category?: string
  search?: string
  sort?: SortOrder
}) {
  return useQuery({
    queryKey: [ITEMS_KEY, filters ?? {}],
    queryFn: () => api.listItems(filters),
  })
}

export function useItem(id: string) {
  return useQuery({
    queryKey: [ITEMS_KEY, id],
    queryFn: () => api.getItem(id),
    enabled: !!id,
  })
}

export function usePhotoUrl(path: string | null) {
  return useQuery({
    queryKey: ['photo', path],
    queryFn: () => api.getPhotoUrl(path!),
    enabled: !!path,
    staleTime: 50 * 60 * 1000,
  })
}

export function useBundleChildren(bundleId: string) {
  return useQuery({
    queryKey: [ITEMS_KEY, 'children', bundleId],
    queryFn: () => api.listBundleChildren(bundleId),
    enabled: !!bundleId,
  })
}

// ── helpers ──────────────────────────────────────────────────────────────────

function invalidateItems(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: [ITEMS_KEY] })
}

function invalidateBundleChildren(qc: ReturnType<typeof useQueryClient>, bundleId: string | null) {
  if (bundleId) {
    qc.invalidateQueries({ queryKey: [ITEMS_KEY, 'children', bundleId] })
  }
}

// ── mutations ────────────────────────────────────────────────────────────────

export function useCreateItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: api.createItem,
    onSuccess: () => invalidateItems(qc),
  })
}

export function useCreateBundle() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ input, bundleSize }: { input: api.NewItemInput; bundleSize: number }) =>
      api.createBundle(input, bundleSize),
    onSuccess: () => invalidateItems(qc),
  })
}

export function useUpdateItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<Item> }) =>
      api.updateItem(id, patch),
    onSuccess: item => {
      invalidateItems(qc)
      invalidateBundleChildren(qc, item.bundle_id)
    },
  })
}

export function useMarkAsSold() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      sale,
    }: {
      id: string
      sale: Parameters<typeof api.markAsSold>[1]
    }) => api.markAsSold(id, sale),
    onSuccess: item => {
      invalidateItems(qc)
      invalidateBundleChildren(qc, item.bundle_id)
    },
  })
}

export function useDeleteItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: api.deleteItem,
    onSuccess: () => invalidateItems(qc),
  })
}
