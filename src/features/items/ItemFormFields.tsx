import { useEffect } from 'react'
import type { UseFormReturn } from 'react-hook-form'
import Input from '../../components/Input'
import Select from '../../components/Select'
import Textarea from '../../components/Textarea'
import { CATEGORIES } from '../../lib/constants'
import { setNameFromCode } from '../../lib/pokemonSets'
import type { ItemFormData } from './itemSchema'

const categoryOptions = CATEGORIES.map(c => ({ value: c, label: c }))
const today = new Date().toISOString().split('T')[0]

const SHOE_LEVEL_OPTIONS = [
  { value: 'amatorski',        label: 'Amatorski' },
  { value: 'półprofesjonalny', label: 'Półprofesjonalny' },
  { value: 'profesjonalny',    label: 'Profesjonalny' },
]
const SHOE_TYPE_OPTIONS = [
  { value: 'lanki',    label: 'Lanki (FG)' },
  { value: 'turfy',   label: 'Turfy (TF)' },
  { value: 'mixy',    label: 'Mixy (SG)' },
  { value: 'halówki', label: 'Halówki (IC)' },
]

interface Props {
  form: UseFormReturn<ItemFormData>
  priceLabelOverride?: string
  isBundle?: boolean
}

export default function ItemFormFields({ form, priceLabelOverride, isBundle = false }: Props) {
  const {
    register,
    watch,
    setValue,
    formState: { errors },
  } = form

  const category  = watch('category')
  const setCode   = watch('meta_set_code')
  const setName   = setCode ? setNameFromCode(setCode) : ''
  const showSize  = category === 'Buty piłkarskie'
  const isPokemon = category === 'Karty Pokemon'
  const isShoes   = category === 'Buty piłkarskie'

  useEffect(() => {
    if (isPokemon && setCode) {
      const name = setNameFromCode(setCode)
      if (name) setValue('meta_set_code', setCode.toUpperCase().trim())
    }
  }, [isPokemon, setCode, setValue])

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
          label={priceLabelOverride ?? 'Cena zakupu *'}
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

      <Input
        label="Data przyjęcia na magazyn"
        type="date"
        hint="Zostaw puste jeśli już masz. Ustaw przyszłą datę → 'W dostawie'."
        error={errors.received_date?.message}
        {...register('received_date')}
      />

      {/* Karty Pokemon — dodatkowe pola (tylko dla pojedynczych kart) */}
      {isPokemon && !isBundle && (
        <div className="space-y-3 p-3 bg-yellow-50 dark:bg-yellow-900/10 rounded-xl border border-yellow-200 dark:border-yellow-800">
          <p className="text-xs font-semibold text-yellow-700 dark:text-yellow-400 uppercase tracking-wide">Karty Pokemon</p>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Numer karty"
              placeholder="np. 025/191"
              error={errors.meta_card_number?.message}
              {...register('meta_card_number')}
            />
            <div className="flex flex-col gap-1">
              <Input
                label="Skrót serii"
                placeholder="np. MEW"
                error={errors.meta_set_code?.message}
                {...register('meta_set_code')}
              />
              {setName && (
                <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">✓ {setName}</p>
              )}
              {setCode && !setName && setCode.length >= 2 && (
                <p className="text-xs text-slate-400">Nieznana seria — zostanie użyty skrót</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Buty piłkarskie — dodatkowe pola */}
      {isShoes && (
        <div className="space-y-3 p-3 bg-blue-50 dark:bg-blue-900/10 rounded-xl border border-blue-200 dark:border-blue-800">
          <p className="text-xs font-semibold text-blue-700 dark:text-blue-400 uppercase tracking-wide">Buty piłkarskie</p>
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Poziom"
              placeholder="— wybierz —"
              options={SHOE_LEVEL_OPTIONS}
              error={errors.meta_shoe_level?.message}
              {...register('meta_shoe_level')}
            />
            <Select
              label="Typ"
              placeholder="— wybierz —"
              options={SHOE_TYPE_OPTIONS}
              error={errors.meta_shoe_type?.message}
              {...register('meta_shoe_type')}
            />
          </div>
        </div>
      )}
    </div>
  )
}
