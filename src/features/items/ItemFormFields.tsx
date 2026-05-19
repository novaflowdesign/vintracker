import { useEffect } from 'react'
import type { UseFormReturn } from 'react-hook-form'
import Input from '../../components/Input'
import Select from '../../components/Select'
import Textarea from '../../components/Textarea'
import { CATEGORIES } from '../../lib/constants'
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
const BOX_TYPE_OPTIONS = [
  { value: 'etb',             label: 'Elite Trainer Box (ETB)' },
  { value: 'blister',         label: 'Blister' },
  { value: 'puszka_tin',      label: 'Puszka Tin' },
  { value: 'puszka_mini_tin', label: 'Puszka Mini Tin' },
  { value: 'pokeball_tin',    label: 'Pokeball Tin' },
]
const SLAB_COMPANY_OPTIONS = [
  { value: 'PSA', label: 'PSA' },
  { value: 'CGC', label: 'CGC' },
  { value: 'ACE', label: 'ACE' },
  { value: 'TAG', label: 'TAG' },
]

interface Props {
  form: UseFormReturn<ItemFormData>
  priceLabelOverride?: string
}

export default function ItemFormFields({ form, priceLabelOverride }: Props) {
  const {
    register,
    watch,
    setValue,
    formState: { errors },
  } = form

  const category  = watch('category')
  const showSize  = category === 'Buty piłkarskie'
  const isShoes   = category === 'Buty piłkarskie'
  const isPokebox = category === 'Boxy Pokemon'
  const isSlab    = category === 'Slab Pokemon'

  const gradeRaw = watch('meta_slab_grade')
  const grade    = gradeRaw !== undefined && gradeRaw !== '' ? parseFloat(gradeRaw) : 10

  useEffect(() => {
    if (isSlab && (gradeRaw === undefined || gradeRaw === '')) {
      setValue('meta_slab_grade', '10')
    }
  }, [isSlab]) // eslint-disable-line react-hooks/exhaustive-deps

  function stepGrade(delta: number) {
    const next = Math.round((grade + delta) * 2) / 2
    if (next < 1 || next > 10) return
    setValue('meta_slab_grade', next.toString(), { shouldValidate: true })
  }

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

      {/* Boxy Pokemon — rodzaj boxa */}
      {isPokebox && (
        <div className="space-y-3 p-3 bg-yellow-50 dark:bg-yellow-900/10 rounded-xl border border-yellow-200 dark:border-yellow-800">
          <p className="text-xs font-semibold text-yellow-700 dark:text-yellow-400 uppercase tracking-wide">Boxy Pokemon</p>
          <Select
            label="Rodzaj boxa"
            placeholder="— wybierz —"
            options={BOX_TYPE_OPTIONS}
            error={errors.meta_box_type?.message}
            {...register('meta_box_type')}
          />
        </div>
      )}

      {/* Slab Pokemon — firma + ocena */}
      {isSlab && (
        <div className="space-y-3 p-3 bg-purple-50 dark:bg-purple-900/10 rounded-xl border border-purple-200 dark:border-purple-800">
          <p className="text-xs font-semibold text-purple-700 dark:text-purple-400 uppercase tracking-wide">Slab Pokemon</p>
          <Select
            label="Firma gradingowa"
            placeholder="— wybierz —"
            options={SLAB_COMPANY_OPTIONS}
            error={errors.meta_slab_company?.message}
            {...register('meta_slab_company')}
          />
          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">Ocena</p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => stepGrade(-0.5)}
                disabled={grade <= 1}
                className="w-10 h-10 rounded-xl bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 text-lg font-bold text-gray-700 dark:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                −
              </button>
              <span className="w-12 text-center text-xl font-bold text-gray-900 dark:text-white tabular-nums">
                {grade % 1 === 0 ? grade.toFixed(0) : grade.toFixed(1)}
              </span>
              <button
                type="button"
                onClick={() => stepGrade(+0.5)}
                disabled={grade >= 10}
                className="w-10 h-10 rounded-xl bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 text-lg font-bold text-gray-700 dark:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                +
              </button>
            </div>
            <input type="hidden" {...register('meta_slab_grade')} />
          </div>
        </div>
      )}
    </div>
  )
}
