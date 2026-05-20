export const POKEMON_SETS: Record<string, string> = {
  // ── English (SV era) ──────────────────────────────────────────────────────
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
  // ── Japanese (SV era) ─────────────────────────────────────────────────────
  sv1S: 'Scarlet ex',
  sv1V: 'Violet ex',
  sv1a: 'Triplet Beat',
  sv2P: 'Snow Hazard',
  sv2D: 'Clay Burst',
  sv2a: 'Pokémon Card 151',
  sv3:  'Ruler of the Black Flame',
  sv3a: 'Raging Surf',
  sv4K: 'Ancient Roar',
  sv4M: 'Future Flash',
  sv4a: 'Shiny Treasure ex',
  sv5K: 'Wild Force',
  sv5M: 'Cyber Judge',
  sv5a: 'Crimson Haze',
  sv6:  'Mask of Change',
  sv6a: 'Night Wanderer',
  sv7:  'Stellar Miracle',
  sv7a: 'Paradise Dragona',
  sv8:  'Super Electric Breaker',
  sv8a: 'Terastal Festival ex',
  sv9:  'Battle Partners',
  sv9a: 'Heat Wave Arena',
  sv10: 'Glory of Team Rocket',
  sv11B:'Black Bolt',
  sv11W:'White Flare',
  M1L:  'Mega Brave',
  M1S:  'Mega Symphonia',
  M2:   'Inferno X',
  M2a:  'Mega Dream ex',
  M3:   'Nihil Zero',
  M4:   'Ninja Spinner',
}

export function setNameFromCode(code: string): string {
  const t = code.trim()
  // exact match first (preserves case for JP codes like sv1S), then uppercase (EN codes)
  return POKEMON_SETS[t] ?? POKEMON_SETS[t.toUpperCase()] ?? ''
}

export function parsePokemonTitle(title: string): {
  pokemonName: string
  cardNumber: string | null
  setCode: string | null
  setName: string | null
} {
  const numberMatch = title.match(/(\d{2,3}\/\d{2,3})/)
  const cardNumber = numberMatch?.[1] ?? null

  // Language suffixes appended to EN codes (e.g. SVIEN → SVI). JP codes don't have these.
  const LANG_SUFFIXES = /(?:EN|DE|FR|ES|IT|KO|JP|TW)$/

  const words = title.split(/\s+/)
  let setCode: string | null = null
  let setName: string | null = null
  for (const word of [...words].reverse()) {
    // keep digits — needed for JP codes like sv1S, sv10
    const raw = word.replace(/[^A-Za-z0-9]/g, '')
    if (raw.length < 2 || raw.length > 6) continue
    // try raw as-is (JP codes), then stripped of lang suffix (EN codes with suffix)
    const stripped = raw.replace(LANG_SUFFIXES, '')
    const candidates = [...new Set([raw, stripped])].filter(c => c.length >= 2 && c.length <= 6)
    for (const candidate of candidates) {
      const name = setNameFromCode(candidate)
      if (name) { setCode = candidate; setName = name; break }
    }
    if (setCode) break
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
