const STORAGE_KEY = 'vt_direct_templates'

export type DirectTemplate = {
  titleTemplate: string
  descTemplate: string
}

export const DIRECT_CATEGORIES = ['Buty piłkarskie', 'Buty', 'Karty Pokemon', 'Boxy Pokemon', 'Slab Pokemon'] as const
export type DirectCategory = typeof DIRECT_CATEGORIES[number]

const POKEMON_HASHTAGS = '#pokemon #pokemontcg #kartypokemon #zestawkartpokemon #pokemonpolska #pokemonpsa #pokemonpsa10 #pokemonbox #pokemonetb #pokemonbooster #pokemonboosterbox #pokemoncollection #pokemoncards #pokemonkort'

export const DEFAULT_DIRECT_TEMPLATES: Record<DirectCategory, DirectTemplate> = {
  'Buty piłkarskie': {
    titleTemplate: 'Buty piłkarskie {{title}} Rozmiar {{size}}',
    descTemplate: `Buty piłkarskie {{title}}

📏 Rozmiar buta: {{size}}

👟 Rodzaj: {{level}}

⚽️ Typ: {{type}}

✅ Oryginalne buty {{brand}}

🚚 Wysyłka: InPost – dobrze zabezpieczona

#butypiłkarskie #korki #korkipiłkarskie #nikeair #nikemercurial #nikesuperfly #niketiempo #nikephantom #nikevapor #nikemagista #adidasf50 #adidaspredator #adidascopa #footballshoes #kopacky #fodboldstovler #cipo`,
  },
  'Buty': {
    titleTemplate: 'Buty {{title}} Rozmiar {{size}}',
    descTemplate: `Buty {{title}}

📏 Rozmiar: {{size}}

👟 Rodzaj: {{style}}

✅ Oryginalne buty {{brand}}

🚚 Wysyłka: InPost – dobrze zabezpieczona

#buty #shoes #sneakers #mokasyny #botki #półbuty #klapki #secondhand #vintage`,
  },
  'Karty Pokemon': {
    titleTemplate: 'Pokémon TCG – {{title}} {{setName}}',
    descTemplate: `✨ Pokémon TCG – {{title}}

🆔 Numer karty: {{setCode}} {{cardNumber}}

📅 Dodatek: {{setName}}

📦 Booster → Sleeve -> Toploader

✅ Oryginalna karta Pokémon

🚚 Wysyłka: InPost – dobrze zabezpieczona

💰 Rabat przy zakupie kilku kart!

${POKEMON_HASHTAGS}`,
  },
  'Boxy Pokemon': {
    titleTemplate: 'Pokémon TCG - {{title}}',
    descTemplate: `✨ Pokémon TCG – {{title}}

📦 Rodzaj: {{boxType}}

✅ Oryginalny produkt Pokemon TCG – fabrycznie zapakowany

🚚 Wysyłka: InPost – dobrze zabezpieczona

💰 Rabat przy zakupie kilku rzeczy!

${POKEMON_HASHTAGS}`,
  },
  'Slab Pokemon': {
    titleTemplate: 'Pokémon TCG – {{title}}',
    descTemplate: `✨ Pokémon TCG – {{title}}

🏆 Nota: {{slabCompany}} {{slabGrade}}

🆔 Numer karty: {{setCode}} {{cardNumber}}

📅 Dodatek: {{setName}}

✅ Oryginalny slab {{slabCompany}}

🚚 Wysyłka: InPost – dobrze zabezpieczona

💰 Rabat przy zakupie kilku rzeczy!

${POKEMON_HASHTAGS}`,
  },
}

export const DIRECT_TEMPLATE_VARS: Record<DirectCategory, string[]> = {
  'Buty piłkarskie': ['{{title}}', '{{size}}', '{{brand}}', '{{level}}', '{{type}}'],
  'Buty':            ['{{title}}', '{{size}}', '{{brand}}', '{{style}}'],
  'Karty Pokemon':   ['{{title}}', '{{setCode}}', '{{setName}}', '{{cardNumber}}'],
  'Boxy Pokemon':    ['{{title}}', '{{boxType}}'],
  'Slab Pokemon':    ['{{title}}', '{{setCode}}', '{{setName}}', '{{cardNumber}}', '{{slabCompany}}', '{{slabGrade}}'],
}

export function getDirectTemplate(category: DirectCategory): DirectTemplate {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}')
    if (stored[category]) return stored[category]
  } catch {}
  return DEFAULT_DIRECT_TEMPLATES[category]
}

export function saveDirectTemplate(category: DirectCategory, template: DirectTemplate): void {
  try {
    const all = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}')
    all[category] = template
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all))
  } catch {}
}

export function resetDirectTemplate(category: DirectCategory): void {
  try {
    const all = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}')
    delete all[category]
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all))
  } catch {}
}
