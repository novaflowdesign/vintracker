export interface Category {
  id: string
  user_id: string
  name: string
  position: number
  created_at: string
}

export type CategoryFieldType = 'text' | 'select' | 'number'

export interface CategoryFieldOption {
  value: string
  label: string
}

export interface CategoryField {
  id: string
  category_id: string
  key: string
  label: string
  type: CategoryFieldType
  options: CategoryFieldOption[] | null
  step: number | null
  min: number | null
  max: number | null
  position: number
  created_at: string
}

export type NewCategoryFieldInput = Omit<CategoryField, 'id' | 'category_id' | 'created_at'>
