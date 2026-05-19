import { z } from 'zod'

export const itemSchema = z.object({
  title:           z.string().min(2, 'Tytuł musi mieć co najmniej 2 znaki'),
  description:     z.string().optional(),
  category:        z.string().optional(),
  brand:           z.string().optional(),
  size:            z.string().optional(),
  condition:       z.string().optional(),
  purchase_price:  z.coerce.number().min(0, 'Cena nie może być ujemna'),
  purchase_date:   z.string().min(1, 'Data zakupu jest wymagana'),
  received_date:   z.string().optional(),
  purchase_source: z.string().optional(),
  notes:           z.string().optional(),
  // category-specific metadata (shoes only — card data parsed from title)
  meta_shoe_level:  z.string().optional(),
  meta_shoe_type:   z.string().optional(),
  meta_box_type:    z.string().optional(),
})

export type ItemFormData = z.infer<typeof itemSchema>
