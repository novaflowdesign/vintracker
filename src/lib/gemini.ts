

const KEY_STORAGE  = 'vt_groq_key'
const DESCS_STORAGE = 'vt_generated_descs'

// ── API key ───────────────────────────────────────────────────────────────────

export function getGeminiKey(): string {
  return localStorage.getItem(KEY_STORAGE) ?? ''
}

export function setGeminiKey(key: string) {
  localStorage.setItem(KEY_STORAGE, key.trim())
}

// ── Generated descriptions cache (localStorage) ───────────────────────────────

export type GeneratedDesc = {
  title: string
  description: string
  templateId: string
  at: string
}

function readAll(): Record<string, GeneratedDesc> {
  try {
    return JSON.parse(localStorage.getItem(DESCS_STORAGE) ?? '{}')
  } catch {
    return {}
  }
}

export function getGeneratedDesc(itemId: string): GeneratedDesc | null {
  return readAll()[itemId] ?? null
}

export function saveGeneratedDesc(itemId: string, desc: GeneratedDesc) {
  const all = readAll()
  all[itemId] = desc
  localStorage.setItem(DESCS_STORAGE, JSON.stringify(all))
}

export function getAllGeneratedDescs(): Record<string, GeneratedDesc> {
  return readAll()
}
import { parsePokemonTitle } from './pokemonSets'

// ── Direct description generators (no AI) ────────────────────────────────────

const BOX_TYPE_LABELS: Record<string, string> = {
  etb:             'Elite Trainer Box (ETB)',
  blister:         'Blister',
  puszka_tin:      'Puszka Tin',
  puszka_mini_tin: 'Puszka Mini Tin',
  pokeball_tin:    'Pokeball Tin',
}

const SHOE_LEVEL_LABELS: Record<string, string> = {
  amatorski:        'Amatorski',
  półprofesjonalny: 'Półprofesjonalny',
  profesjonalny:    'Profesjonalny',
}
const SHOE_TYPE_LABELS: Record<string, string> = {
  lanki:    'Korki (FG)',
  turfy:    'Turfy (TF)',
  mixy:     'Mixy (SG)',
  halówki:  'Halówki (IC)',
}

function generateShoeDescriptionDirect(meta: {
  title?: string
  size?: string | null
  brand?: string | null
  metadata?: Record<string, string> | null
}): { title: string; description: string } {
  const title  = meta.title  ?? '[Tytuł z magazynu]'
  const size   = meta.size   ?? '[Rozmiar]'
  const brand  = meta.brand  ?? '[Marka buta]'
  const level  = SHOE_LEVEL_LABELS[meta.metadata?.shoe_level ?? ''] ?? meta.metadata?.shoe_level ?? '[Poziom buta]'
  const type   = SHOE_TYPE_LABELS[meta.metadata?.shoe_type  ?? ''] ?? meta.metadata?.shoe_type  ?? '[Typ buta]'

  const description = `Buty piłkarskie ${title}

📏 Rozmiar buta: ${size}

👟 Rodzaj: ${level}

⚽️ Typ: ${type}

✅ Oryginalne buty ${brand}

🚚 Wysyłka: InPost – dobrze zabezpieczona

#butypiłkarskie #korki #korkipiłkarskie #nikeair #nikemercurial #nikesuperfly #niketiempo #nikephantom #nikevapor #nikemagista #adidasf50 #adidaspredator #adidascopa #footballshoes #kopacky #fodboldstovler #cipo`

  return { title: `Buty piłkarskie ${title} Rozmiar ${size}`, description }
}

const POKEMON_HASHTAGS = '#pokemon #pokemontcg #kartypokemon #zestawkartpokemon #pokemonpolska #pokemonpsa #pokemonpsa10 #pokemonbox #pokemonetb #pokemonbooster #pokemonboosterbox #pokemoncollection #pokemoncards #pokemonkort'

function generatePokemonCardDescriptionDirect(meta: {
  title?: string
}): { title: string; description: string } {
  const rawTitle  = meta.title ?? '[Tytuł z magazynu]'
  const parsed    = parsePokemonTitle(rawTitle)
  const setCode   = parsed.setCode ?? ''
  const setName   = parsed.setName ?? setCode
  const cardNum   = parsed.cardNumber ?? ''

  const title = `Pokémon TCG – ${rawTitle}${setName ? ` ${setName}` : ''}`

  const description = `✨ Pokémon TCG – ${rawTitle}

🆔 Numer karty: ${setCode ? `${setCode} ` : ''}${cardNum || '[Numer karty]'}

📅 Dodatek: ${setName || '[Nazwa dodatku]'}

📦 Booster → Sleeve -> Toploader

✅ Oryginalna karta Pokémon

🚚 Wysyłka: InPost – dobrze zabezpieczona

💰 Rabat przy zakupie kilku kart!

${POKEMON_HASHTAGS}`

  return { title, description }
}

function generatePokemonBoxDescriptionDirect(meta: {
  title?: string
  metadata?: Record<string, string> | null
}): { title: string; description: string } {
  const rawTitle = meta.title ?? '[Tytuł z magazynu]'
  const boxType  = BOX_TYPE_LABELS[meta.metadata?.box_type ?? ''] ?? meta.metadata?.box_type ?? '[Rodzaj boxa]'

  const title = `Pokémon TCG - ${rawTitle}`

  const description = `✨ Pokémon TCG – ${rawTitle}

📦 Rodzaj: ${boxType}

✅ Oryginalny produkt Pokemon TCG – fabrycznie zapakowany

🚚 Wysyłka: InPost – dobrze zabezpieczona

💰 Rabat przy zakupie kilku rzeczy!

${POKEMON_HASHTAGS}`

  return { title, description }
}

function generateSlabDescriptionDirect(meta: {
  title?: string
  metadata?: Record<string, string> | null
}): { title: string; description: string } {
  const rawTitle = meta.title ?? '[Tytuł z magazynu]'
  const company  = meta.metadata?.slab_company ?? 'PSA'
  const grade    = meta.metadata?.slab_grade   ?? '?'

  const parsed   = parsePokemonTitle(rawTitle)
  const setCode  = parsed.setCode   ?? ''
  const setName  = parsed.setName   ?? setCode
  const cardNum  = parsed.cardNumber ?? ''

  const title = `Pokémon TCG – ${rawTitle}`

  const description = `✨ Pokémon TCG – ${rawTitle}

🏆 Nota: ${company} ${grade}

🆔 Numer karty: ${setCode ? `${setCode} ` : ''}${cardNum || '[Numer karty]'}

📅 Dodatek: ${setName || '[Nazwa dodatku]'}

✅ Oryginalny slab ${company}

🚚 Wysyłka: InPost – dobrze zabezpieczona

💰 Rabat przy zakupie kilku rzeczy!

${POKEMON_HASHTAGS}`

  return { title, description }
}

// ── Card photo analysis ───────────────────────────────────────────────────────

async function compressImageBlob(source: Blob, maxDim = 1024): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(source)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const ratio = Math.min(1, maxDim / img.width, maxDim / img.height)
      const canvas = document.createElement('canvas')
      canvas.width  = Math.round(img.width  * ratio)
      canvas.height = Math.round(img.height * ratio)
      canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
      canvas.toBlob(
        blob => blob ? resolve(blob) : reject(new Error('Kompresja zdjęcia nie powiodła się')),
        'image/jpeg',
        0.85,
      )
    }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Nie można wczytać zdjęcia')) }
    img.src = url
  })
}

export async function analyzeCardPhoto(image: File | string): Promise<{ title: string }> {
  const apiKey = getGeminiKey()
  if (!apiKey) throw new Error('Brak klucza Groq API — skonfiguruj go w Ustawieniach.')

  let base64: string

  if (image instanceof File) {
    const compressed = await compressImageBlob(image)
    base64 = await blobToBase64(compressed)
  } else {
    const res = await fetch(image)
    if (!res.ok) throw new Error('Nie można pobrać zdjęcia')
    const compressed = await compressImageBlob(await res.blob())
    base64 = await blobToBase64(compressed)
  }

  const prompt = `Look at this Pokemon TCG card photo. Extract exactly three values:
1. Card name — printed in the top-left area (e.g. "Pikachu ex", "Charizard VMAX")
2. Set code — 2–4 uppercase letters in the bottom-left corner (e.g. "SVI", "MEG"). IMPORTANT: ignore any language suffix printed after the code such as EN, DE, FR, ES — return ONLY the set code letters without the language suffix.
3. Card number — bottom-left corner, format NNN/NNN (e.g. "025/198")

Reply with ONLY valid JSON, no extra text:
{"cardName":"...","setCode":"...","cardNumber":"..."}`

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: 'meta-llama/llama-4-scout-17b-16e-instruct',
      messages: [{ role: 'user', content: [
        { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64}` } },
        { type: 'text', text: prompt },
      ]}],
      temperature: 0,
      max_tokens: 128,
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    const msg = (err as { error?: { message?: string } })?.error?.message
    if (res.status === 401) throw new Error(`Nieprawidłowy klucz API (401): ${msg ?? ''}`)
    throw new Error(msg ?? `Błąd API (${res.status})`)
  }

  const data  = await res.json()
  const text  = (data.choices?.[0]?.message?.content ?? '') as string
  const clean = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
  const parsed = JSON.parse(clean) as { cardName?: string | null; setCode?: string | null; cardNumber?: string | null }

  const parts = [parsed.cardName, parsed.setCode, parsed.cardNumber].filter(Boolean)
  if (!parts.length) throw new Error('Nie udało się odczytać danych z karty')
  return { title: parts.join(' ') }
}

// ── Groq API call ─────────────────────────────────────────────────────────────

async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload  = () => resolve((reader.result as string).split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

export async function generateDescription(
  imageUrl: string,
  titleTemplate: string,
  descTemplate: string,
  itemMeta?: {
    title?: string
    category?: string | null
    metadata?: Record<string, string> | null
    size?: string | null
    brand?: string | null
  },
): Promise<{ title: string; description: string }> {
  if (itemMeta?.category === 'Buty piłkarskie')  return generateShoeDescriptionDirect(itemMeta)
  if (itemMeta?.category === 'Karty Pokemon')    return generatePokemonCardDescriptionDirect(itemMeta)
  if (itemMeta?.category === 'Boxy Pokemon')     return generatePokemonBoxDescriptionDirect(itemMeta)
  if (itemMeta?.category === 'Slab Pokemon')     return generateSlabDescriptionDirect(itemMeta)

  const apiKey = getGeminiKey()
  if (!apiKey) throw new Error('Brak klucza Groq API — skonfiguruj go w Ustawieniach.')

  const imgRes = await fetch(imageUrl)
  if (!imgRes.ok) throw new Error('Nie można pobrać zdjęcia')
  const blob    = await imgRes.blob()
  const base64  = await blobToBase64(blob)
  const mimeType = blob.type || 'image/jpeg'

  const knownFacts: string[] = []
  if (itemMeta?.title)  knownFacts.push(`Tytuł przedmiotu: ${itemMeta.title}`)
  if (itemMeta?.brand)  knownFacts.push(`Marka: ${itemMeta.brand}`)
  if (itemMeta?.size)   knownFacts.push(`Rozmiar: ${itemMeta.size}`)

  const factsSection = knownFacts.length
    ? `\nZNANE DANE O PRZEDMIOCIE (użyj ich priorytetowo, nie odczytuj ich ze zdjęcia):\n${knownFacts.map(f => `- ${f}`).join('\n')}\n`
    : ''

  const prompt = `Jesteś asystentem tworzącym opisy ogłoszeń sprzedażowych na podstawie zdjęć produktów.
${factsSection}
Przeanalizuj zdjęcie i wypełnij poniższy szablon. Dla każdej zmiennej w nawiasach kwadratowych [ZMIENNA] wstaw wartość — najpierw z powyższych znanych danych, a jeśli tam jej nie ma to odczytaj ze zdjęcia. Jeśli nie możesz odczytać wartości — zostaw oryginalny tekst zmiennej bez zmian.

SZABLON TYTUŁU:
${titleTemplate}

SZABLON OPISU:
${descTemplate}

Odpowiedz wyłącznie poprawnym JSON bez żadnego dodatkowego tekstu:
{"title":"...","description":"..."}`

  const res = await fetch(
    'https://api.groq.com/openai/v1/chat/completions',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'meta-llama/llama-4-scout-17b-16e-instruct',
        messages: [{
          role: 'user',
          content: [
            { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64}` } },
            { type: 'text', text: prompt },
          ],
        }],
        temperature: 0.1,
        max_tokens: 1024,
      }),
    },
  )

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    const msg  = (err as { error?: { message?: string } })?.error?.message
    if (res.status === 401) throw new Error(`Nieprawidłowy klucz API (401): ${msg ?? ''}`)
    if (res.status === 400) throw new Error(`Nieprawidłowe żądanie (400): ${msg ?? ''}`)
    if (res.status === 429) throw new Error('Przekroczono limit zapytań — spróbuj za chwilę')
    throw new Error(msg ?? `Błąd API (${res.status})`)
  }

  const data = await res.json()
  const text = (data.choices?.[0]?.message?.content ?? '') as string
  const clean = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()

  try {
    return JSON.parse(clean) as { title: string; description: string }
  } catch {
    throw new Error('Nieprawidłowy format odpowiedzi od Gemini')
  }
}
