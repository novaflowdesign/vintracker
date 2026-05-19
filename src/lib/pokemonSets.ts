export const POKEMON_SETS: Record<string, string> = {
  SVI: 'Scarlet & Violet',
  PAL: 'Paldea Evolved',
  OBF: 'Obsidian Flames',
  MEW: '151',
  PAR: 'Paradox Rift',
  PAF: 'Paldean Fates',
  TEF: 'Temporal Forces',
  TWM: 'Twilight Masquerade',
  SFA: 'Shrouded Fable',
  SCR: 'Stellar Crown',
  SSP: 'Surging Sparks',
  PRE: 'Prismatic Evolutions',
  JTG: 'Journey Together',
  DRI: 'Destined Rivals',
  BLK: 'Black Bolt',
  WHT: 'White Flare',
  MEG: 'Mega Evolution',
  PFL: 'Phantasmal Flames',
  ASC: 'Ascended Heroes',
  POR: 'Perfect Order',
  CRI: 'Chaos Rising',
}

export function setNameFromCode(code: string): string {
  return POKEMON_SETS[code.toUpperCase().trim()] ?? ''
}

export function parsePokemonTitle(title: string): {
  pokemonName: string
  cardNumber: string | null
  setCode: string | null
  setName: string | null
} {
  const numberMatch = title.match(/(\d{2,3}\/\d{2,3})/)
  const cardNumber = numberMatch?.[1] ?? null

  const words = title.split(/\s+/)
  let setCode: string | null = null
  let setName: string | null = null
  for (const word of [...words].reverse()) {
    const clean = word.replace(/[^A-Za-z]/g, '').toUpperCase()
    if (clean.length >= 2 && clean.length <= 4) {
      const name = setNameFromCode(clean)
      if (name) { setCode = clean; setName = name; break }
    }
  }

  let pokemonName = title
  if (cardNumber) {
    pokemonName = title.substring(0, title.indexOf(cardNumber)).trim()
  } else if (setCode) {
    const idx = title.lastIndexOf(setCode)
    if (idx > 0) pokemonName = title.substring(0, idx).trim()
  }

  return { pokemonName, cardNumber, setCode, setName }
}
