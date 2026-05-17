import type { UseFormReturn } from 'react-hook-form'
import Input from '../../components/Input'
import Select from '../../components/Select'
import Textarea from '../../components/Textarea'
import { CATEGORIES } from '../../lib/constants'
import type { ItemFormData } from './itemSchema'

const categoryOptions = CATEGORIES.map(c => ({ value: c, label: c }))
const today = new Date().toISOString().split('T')[0]

interface Props {
  form: UseFormReturn<ItemFormData>
}

export default function ItemFormFields({ form }: Props) {
  const {
    register,
    watch,
    formState: { errors },
  } = form

  const category = watch('category')
  const showSize = category === 'Buty piłkarskie'

  return (
    <div className="space-y-4">
      <Input
        label="Tytuł *"
        placeholder="np. Buty Nike Mercurial"
        error={errors.title?.message}
        {...register('title')}
      />

      <Textarea
        label="Opis"
        placeholder="Dodatkowe informacje..."
        error={errors.description?.message}
        {...register('description')}
      />

      <div className="grid grid-cols-2 gap-4">
        <Select
          label="Kategoria"
          placeholder="— wybierz —"
          options={categoryOptions}
          error={errors.category?.message}
          {...register('category')}
        />
        {showSize && (
          <Input
            label="Rozmiar"
            placeholder="np. 42, 43.5"
            error={errors.size?.message}
            {...register('size')}
          />
        )}
      </div>

      <Input
        label="Marka"
        placeholder="np. Nike"
        error={errors.brand?.message}
        {...register('brand')}
      />

      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Cena zakupu *"
          type="number"
          min="0"
          step="0.01"
          suffix="zł"
          error={errors.purchase_price?.message}
          {...register('purchase_price')}
        />
        <Input
          label="Data zakupu *"
          type="date"
          defaultValue={today}
          error={errors.purchase_date?.message}
          {...register('purchase_date')}
        />
      </div>
    </div>
  )
}
