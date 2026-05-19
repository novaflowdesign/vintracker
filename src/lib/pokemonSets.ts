export const POKEMON_SETS: Record<string, string> = {
  // Scarlet & Violet era
  PRE: 'Prismatic Evolutions',
  SSP: 'Surging Sparks',
  SCR: 'Stellar Crown',
  SFA: 'Shrouded Fable',
  TWM: 'Twilight Masquerade',
  TEF: 'Temporal Forces',
  PAF: 'Paldean Fates',
  PAR: 'Paradox Rift',
  OBF: 'Obsidian Flames',
  MEW: 'Pokémon 151',
  PAL: 'Paldea Evolved',
  SVI: 'Scarlet & Violet',
  JTG: 'Journey Together',

  // Sword & Shield era
  CRZ: 'Crown Zenith',
  SIT: 'Silver Tempest',
  LOR: 'Lost Origin',
  PGO: 'Pokémon GO',
  ASR: 'Astral Radiance',
  BRS: 'Brilliant Stars',
  FST: 'Fusion Strike',
  EVS: 'Evolving Skies',
  CRE: 'Chilling Reign',
  BST: 'Battle Styles',
  VIV: 'Vivid Voltage',
  CPA: "Champion's Path",
  SHF: 'Shining Fates',
  DAA: 'Darkness Ablaze',
  RCL: 'Rebel Clash',
  SSH: 'Sword & Shield',

  // Sun & Moon era
  HIF: 'Hidden Fates',
  UNM: 'Unified Minds',
  UNB: 'Unbroken Bonds',
  DET: 'Detective Pikachu',
  TEU: 'Team Up',
  DRM: 'Dragon Majesty',
  LOT: 'Lost Thunder',
  CES: 'Celestial Storm',
  FLI: 'Forbidden Light',
  UPR: 'Ultra Prism',
  CIN: 'Crimson Invasion',
  BUS: 'Burning Shadows',
  GUR: 'Guardians Rising',
  SUM: 'Sun & Moon',
  SLG: 'Shining Legends',

  // XY era
  EVO: 'Evolutions',
  STS: 'Steam Siege',
  FCO: 'Fates Collide',
  BKP: 'BREAKpoint',
  BKT: 'BREAKthrough',
  AOR: 'Ancient Origins',
  ROS: 'Roaring Skies',
  DCR: 'Double Crisis',
  PRC: 'Primal Clash',
  PHF: 'Phantom Forces',
  FUF: 'Furious Fists',
  FFI: 'Furious Fists',
  FLF: 'Flash Fire',
  XY: 'XY Base Set',
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
