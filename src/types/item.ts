export type ItemStatus = 'IN_STOCK' | 'SOLD'

export type ItemCondition =
  | 'new_with_tags'
  | 'new'
  | 'very_good'
  | 'good'
  | 'satisfactory'

export type PurchaseSource = 'vinted' | 'szafa' | 'lumpex' | 'inne'

export type ItemCategory =
  | 'Odzież damska'
  | 'Odzież męska'
  | 'Odzież dziecięca'
  | 'Buty'
  | 'Torebki'
  | 'Akcesoria'
  | 'Sport'
  | 'Dom i ogród'
  | 'Elektronika'
  | 'Książki'
  | 'Inne'

export interface Item {
  id: string
  user_id: string
  title: string
  description: string | null
  category: string | null
  brand: string | null
  size: string | null
  condition: ItemCondition | null
  photo_path: string | null
  purchase_price: number
  purchase_date: string
  received_date: string | null
  purchase_source: PurchaseSource | null
  status: ItemStatus
  sale_price: number | null
  sale_date: string | null
  shipping_cost_paid_by_seller: number
  buyer_country: string | null
  notes: string | null
  bundle_id: string | null
  bundle_size: number | null
  created_at: string
  updated_at: string
}

export interface Database {
  public: {
    Tables: {
      items: {
        Row: Item
        Insert: Omit<Item, 'id' | 'created_at' | 'updated_at'> & {
          id?: string
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Omit<Item, 'id'>>
      }
    }
  }
}
