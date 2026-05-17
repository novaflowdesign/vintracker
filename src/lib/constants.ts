export const CATEGORIES = [
  'Buty piłkarskie',
  'Karty Pokemon',
  'Boxy Pokemon',
] as const

export const CONDITIONS: { value: string; label: string }[] = [
  { value: 'new_with_tags', label: 'Nowe z metką' },
  { value: 'new',           label: 'Nowe bez metki' },
  { value: 'very_good',     label: 'Bardzo dobry' },
  { value: 'good',          label: 'Dobry' },
  { value: 'satisfactory',  label: 'Zadowalający' },
]

export const PURCHASE_SOURCES: { value: string; label: string }[] = [
  { value: 'vinted', label: 'Vinted' },
  { value: 'szafa',  label: 'Szafa' },
  { value: 'lumpex', label: 'Lumpex' },
  { value: 'sklep',  label: 'Sklep' },
  { value: 'inne',   label: 'Inne' },
]
