

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

  const description = `${title}

📏 Rozmiar buta: ${size}

👟 Rodzaj: ${level}

⚽️ Typ: ${type}

✅ Oryginalne buty ${brand}

🚚 Wysyłka: InPost – dobrze zabezpieczona

#butypiłkarskie #korki #korkipiłkarskie #nikeair #nikemercurial #nikesuperfly #niketiempo #nikephantom #nikevapor #nikemagista #adidasf50 #adidaspredator #adidascopa #footballshoes #kopacky #fodboldstovler #cipo`

  return { title, description }
}

function generatePokemonCardDescriptionDirect(meta: {
  title?: string
}): { title: string; description: string } {
  const title = meta.title ?? '[Tytuł z magazynu]'

  const description = `${title}

✅ Oryginalna karta Pokemon TCG
📦 Karta w bardzo dobrym stanie
🚚 Wysyłka: InPost – dobrze zabezpieczona

#pokemon #pokemontcg #kartypokemon #tcg #pokemontcgpolska #kartypokemont`

  return { title, description }
}

function generatePokemonBoxDescriptionDirect(meta: {
  title?: string
  metadata?: Record<string, string> | null
}): { title: string; description: string } {
  const title   = meta.title ?? '[Tytuł z magazynu]'
  const boxType = BOX_TYPE_LABELS[meta.metadata?.box_type ?? ''] ?? meta.metadata?.box_type ?? '[Rodzaj boxa]'

  const description = `${title}

📦 Rodzaj: ${boxType}
✅ Oryginalny produkt Pokemon TCG – fabrycznie zapakowany
🚚 Wysyłka: InPost – dobrze zabezpieczona

#pokemon #pokemontcg #pokemonbox #etb #tcg #pokemontcgpolska #boxy`

  return { title, description }
}

function generateSlabDescriptionDirect(meta: {
  title?: string
  metadata?: Record<string, string> | null
}): { title: string; description: string } {
  const rawTitle  = meta.title ?? '[Tytuł z magazynu]'
  const company   = meta.metadata?.slab_company ?? 'PSA'
  const grade     = meta.metadata?.slab_grade   ?? '?'

  const parsed      = parsePokemonTitle(rawTitle)
  const pokemonName = parsed.pokemonName || rawTitle
  const cardNumber  = parsed.cardNumber ?? ''
  const setCode     = parsed.setCode    ?? ''
  const setName     = parsed.setName    ?? setCode

  const gradeLabel  = `${company} ${grade}`
  const title       = `${gradeLabel} ${rawTitle}`

  const setLine     = setCode
    ? `📦 Seria: ${setName !== setCode ? `${setName} (${setCode})` : setCode}\n`
    : ''
  const numberLine  = cardNumber ? `📋 Numer: ${cardNumber}\n` : ''

  const description = `${gradeLabel} ${rawTitle}

🏆 Nota: ${gradeLabel}
🃏 Karta: ${pokemonName}
${numberLine}${setLine}
✅ Oryginalny slab ${company}
🚚 Wysyłka: InPost – dobrze zabezpieczona

#pokemon #pokemontcg #${company.toLowerCase()} #${company.toLowerCase()}graded #slab #gradedcard #pokemonslab #pokemontcgpolska`

  return { title, description }
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
