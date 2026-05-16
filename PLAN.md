# Vinted Tracker — PLAN

Aplikacja webowa (PWA) do śledzenia zakupów i sprzedaży na Vinted, z monitorowaniem limitu działalności nierejestrowanej w Polsce. Dane w Supabase, hosting na GitHub Pages.

## Stack

- **Frontend:** Vite + React 18 + TypeScript + Tailwind CSS
- **Routing:** react-router-dom v6
- **Forms:** react-hook-form + zod (walidacja)
- **Wykresy:** Recharts
- **Ikony:** lucide-react
- **Daty:** date-fns
- **Backend:** Supabase (Postgres + Auth + Storage)
- **PWA:** vite-plugin-pwa
- **Hosting:** GitHub Pages przez GitHub Actions

## Setup

Komendy do wykonania w folderze repo:

```bash
npm create vite@latest . -- --template react-ts
npm install
npm install -D tailwindcss@3 postcss autoprefixer vite-plugin-pwa
npx tailwindcss init -p
npm install @supabase/supabase-js react-router-dom react-hook-form @hookform/resolvers zod recharts lucide-react date-fns clsx
```

Struktura folderów:

```
src/
  components/      # UI building blocks (Button, Card, Modal, KPITile...)
  pages/           # Dashboard, Inventory, Sales, AddItem, Login
  features/        # items/ (hooks, queries), auth/, stats/
  lib/             # supabase.ts, storage.ts, fees.ts
  types/           # item.ts
  hooks/           # useItems, useAuth, useStats
  utils/           # date, currency, csv
```

Plik `.env.local` (NIE commituj):

```
VITE_SUPABASE_URL=https://<projekt>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-public-key>
```

W `vite.config.ts` ustaw `base: '/vinted-tracker/'` (zmień nazwę jeśli repo nazywa się inaczej).

## Model danych

Tabela `items` w Supabase (jedna tabela, status decyduje czy w magazynie czy sprzedane):

```sql
create table public.items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  
  -- meta zakupu
  title text not null,
  description text,
  category text,
  brand text,
  size text,
  condition text,                  -- 'new_with_tags' | 'new' | 'very_good' | 'good' | 'satisfactory'
  photo_path text,                 -- klucz w buckecie 'item-photos', np. user_id/uuid.jpg
  purchase_price numeric(10,2) not null check (purchase_price >= 0),
  purchase_date date not null,
  purchase_source text,            -- 'vinted' | 'szafa' | 'lumpex' | 'inne'
  
  -- status
  status text not null default 'IN_STOCK' check (status in ('IN_STOCK','SOLD')),
  
  -- meta sprzedaży (NULL gdy IN_STOCK)
  sale_price numeric(10,2) check (sale_price >= 0),
  sale_date date,
  shipping_cost_paid_by_seller numeric(10,2) default 0,
  buyer_country text,
  
  -- notatki i czas
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- indeksy dla typowych zapytań
create index items_user_status_idx on public.items(user_id, status);
create index items_user_sale_date_idx on public.items(user_id, sale_date) where sale_date is not null;

-- automatyczne updated_at
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

create trigger items_set_updated_at
before update on public.items
for each row execute function public.set_updated_at();

-- RLS
alter table public.items enable row level security;

create policy "owner can read"   on public.items for select using (auth.uid() = user_id);
create policy "owner can insert" on public.items for insert with check (auth.uid() = user_id);
create policy "owner can update" on public.items for update using (auth.uid() = user_id);
create policy "owner can delete" on public.items for delete using (auth.uid() = user_id);
```

Bucket na zdjęcia (uruchom w SQL Editor):

```sql
insert into storage.buckets (id, name, public) values ('item-photos', 'item-photos', false);

create policy "owner can upload photos"
on storage.objects for insert
with check (
  bucket_id = 'item-photos'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "owner can read photos"
on storage.objects for select
using (
  bucket_id = 'item-photos'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "owner can delete photos"
on storage.objects for delete
using (
  bucket_id = 'item-photos'
  and auth.uid()::text = (storage.foldername(name))[1]
);
```

Konwencja: ścieżka pliku to `{user_id}/{item_id}.jpg`. Foldername wymusza, że tylko właściciel widzi swoje.

Pola wyliczane po stronie klienta (nie trzymamy w bazie):

- `profit = sale_price - shipping_cost_paid_by_seller - purchase_price`
- `margin_pct = profit / sale_price * 100`
- `days_on_shelf = (sale_date ?? today) - purchase_date`

## Limit działalności nierejestrowanej

**Stan na 2026:** limit liczony kwartalnie = 225% minimalnego wynagrodzenia.
Minimalna 2026 = 4806 zł → **limit kwartalny = 10 813,50 zł** (przychód należny, czyli suma `sale_price`).

Trzymaj jako stałą w `src/lib/legal.ts`:

```ts
export const QUARTERLY_LIMIT_PLN = 10_813.50;
export const LIMIT_YEAR = 2026;
```

Funkcja `getQuarter(date)` → 1..4, `getQuarterRange(year, q)` → { from, to }.

## Widoki

### `/login` — Auth
Logowanie email/hasło (Supabase Auth). Po sukcesie redirect do `/`.

### `/` — Dashboard
Sekcje od góry:

1. **Pasek limitu kwartalnego** — duży, prominentny.
   - Etykieta: "Kwartał Q{n} {year}"
   - Pasek progresu: suma sprzedaży tego kwartału / 10 813,50 zł
   - Kolor: zielony <70%, żółty 70-90%, czerwony >90%
   - Tekst: "8 240 zł / 10 813,50 zł (76%)"
   - Mini tekst: "pozostało {x} zł i {y} dni do końca kwartału"

2. **KPI tile'e (grid 2x3 lub 3x2):**
   - Sprzedaż MTD (suma sale_price w bieżącym miesiącu)
   - Zysk MTD
   - Średnia marża %
   - Sztuk w magazynie
   - Wartość magazynu (suma purchase_price gdzie status=IN_STOCK)
   - Średni czas na półce (dla sprzedanych w ostatnich 90 dniach)

3. **Wykres liniowy:** sprzedaż kumulatywna w bieżącym kwartale, dzień po dniu, z poziomą linią limitu 10 813,50 zł.

4. **Wykres słupkowy:** zysk per kategoria (ostatnie 90 dni).

5. **Donut:** podział magazynu po kategoriach (liczba sztuk).

6. **Dwie listy obok siebie:**
   - Top 5 najbardziej zyskownych sprzedaży (ever)
   - Top 5 leżaków (najdłużej w magazynie, status=IN_STOCK)

### `/inventory` — Magazyn
Lista kart rzeczy ze statusem IN_STOCK. Każda karta:
- miniatura zdjęcia (lazy load, signed URL z Supabase)
- tytuł, marka, rozmiar
- cena zakupu, data zakupu, "X dni na półce"
- przycisk **"Sprzedane"** → modal
- przycisk "Edytuj" → formularz
- przycisk "Usuń" (z confirm)

Filtry u góry: kategoria, marka, sortowanie (najstarsze/najnowsze/najdroższe).
Wyszukiwarka po tytule.

**Modal "Sprzedane":**
- cena sprzedaży (required)
- data sprzedaży (default: dziś)
- koszt wysyłki opłacony przez Ciebie (default: 0)
- kraj kupującego (opcjonalne)
- preview zysku: "Zysk: +X zł (marża Y%)"
- przycisk "Zapisz" → update statusu na SOLD

### `/sales` — Historia sprzedaży
Lista sprzedanych rzeczy. Każdy wiersz: zdjęcie, tytuł, data, cena sprzedaży, zysk, marża.
Filtry: zakres dat, kategoria, kwartał.
U góry: suma w aktualnie wyfiltrowanym zakresie + suma zysku.

Przycisk "Eksportuj CSV" → wszystkie wyfiltrowane wiersze.

### `/add` — Nowa rzecz
Formularz:
- zdjęcie (input file z `capture="environment"` dla telefonu, kompresja przed uploadem do max 1600px szer., jakość 0.85, do WebP jeśli się da)
- tytuł (required)
- opis (textarea)
- kategoria (select z edytowalną listą trzymaną w localStorage albo osobnej tabelce — na razie hardcoded enum)
- marka, rozmiar, stan
- cena zakupu (required), data zakupu (required, default: dziś), źródło zakupu
- notatki
- przycisk "Dodaj do magazynu" → insert + redirect do /inventory

### `/settings` — Ustawienia
- Eksport całej bazy do JSON (pobranie pliku)
- Import z JSON (merge / replace)
- Lista kategorii (edytowalna)
- Wyloguj

## Kolejność implementacji (każdy punkt = jedna sesja z Claude Code)

1. **Setup** — Vite, Tailwind, struktura folderów, routing, `.env.local`, podstawowy layout z bottom nav (na telefonie) / sidebar (na desktopie).
2. **Auth** — strona logowania, `useAuth` hook, ProtectedRoute, redirect.
3. **Typy + warstwa danych** — `types/item.ts`, `lib/supabase.ts` (klient), `features/items/api.ts` (getItems, getItem, createItem, updateItem, markAsSold, deleteItem, uploadPhoto, getPhotoUrl).
4. **Add item** — formularz, walidacja zod, upload zdjęcia z kompresją (canvas).
5. **Inventory** — lista, filtry, modal sprzedaży, edycja, usuwanie.
6. **Sales** — historia, filtry, eksport CSV.
7. **Dashboard** — pasek kwartału, KPI, wykresy.
8. **Settings** — eksport/import JSON, wylogowanie.
9. **PWA** — vite-plugin-pwa, manifest, ikony 192/512, "Add to Home Screen".
10. **CI/CD** — GitHub Actions workflow deploy na Pages.
11. **Polish** — dark mode (Tailwind `dark:`), animacje (framer-motion opcjonalnie), skeleton loadery.

## Design system (lekki)

- Kolory główne: użyj palety Tailwind. Primary: `emerald-600`, akcent ostrzeżeń: `amber-500`, alarm: `rose-600`.
- Border radius: `rounded-2xl` na kartach, `rounded-xl` na inputach.
- Shadow: `shadow-sm` na kartach, `shadow-lg` na modalach.
- Typografia: domyślny sans (system), nagłówki `font-semibold` lub `font-bold`.
- Spacing: szczodry, `p-6` na kartach, `gap-4` w gridach.
- **Mobile first.** Wszystkie widoki najpierw projektuj dla 375px szerokości.

## GitHub Actions deploy

`.github/workflows/deploy.yml`:

```yaml
name: Deploy to GitHub Pages
on:
  push:
    branches: [main]
permissions:
  contents: read
  pages: write
  id-token: write
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npm ci
      - run: npm run build
        env:
          VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
          VITE_SUPABASE_ANON_KEY: ${{ secrets.VITE_SUPABASE_ANON_KEY }}
      - uses: actions/upload-pages-artifact@v3
        with: { path: dist }
  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

Sekrety dodaj w **Settings → Secrets and variables → Actions** w repo.

W Supabase **Authentication → URL Configuration** dodaj URL GitHub Pages do "Site URL" i "Redirect URLs", inaczej OAuth nie zadziała.

## Rzeczy do zapamiętania

- Limit działalności nierejestrowanej liczy **przychód należny** (sumę `sale_price`), nie zysk.
- Od 2024 sprzedający na Vinted nie płaci prowizji — opłatę "Ochrona Kupującego" płaci kupujący. Twój przychód = cena ogłoszenia.
- `anon key` Supabase jest publiczny — bezpieczeństwo zapewnia RLS. Nigdy nie wrzucaj `service_role key`.
- Backup do JSON od pierwszej wersji.
- Wszystkie kwoty w bazie jako `numeric(10,2)`, nie `float` (precyzja).