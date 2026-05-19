import { parsePokemonTitle } from './pokemonSets'

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

// ── Shoe description (no AI) ─────────────────────────────────────────────────

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
  // Shoes: instant generation from stored data, no API call
  if (itemMeta?.category === 'Buty piłkarskie') {
    return generateShoeDescriptionDirect(itemMeta)
  }

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

  // Pokemon: parse title for card number and set
  if (itemMeta?.category === 'Karty Pokemon' && itemMeta.title) {
    const parsed = parsePokemonTitle(itemMeta.title)
    if (parsed.pokemonName)  knownFacts.push(`Nazwa Pokemona: ${parsed.pokemonName}`)
    if (parsed.cardNumber)   knownFacts.push(`Numer karty: ${parsed.cardNumber}`)
    if (parsed.setCode)      knownFacts.push(`Skrót serii: ${parsed.setCode}`)
    if (parsed.setName)      knownFacts.push(`Pełna nazwa serii: ${parsed.setName}`)
  }

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
