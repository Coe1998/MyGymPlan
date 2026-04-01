# Bynari — Context per AI

> File generato automaticamente il 2026-03-31. Aggiornarlo dopo ogni sessione di modifiche significative.

---

## Cos'è questo progetto

**Bynari** è una piattaforma fitness PWA (Progressive Web App) multi-ruolo che connette coach e atleti. Il coach gestisce schede, clienti, nutrizione e analytics; il cliente/atleta traccia allenamenti, progressi e benessere.

---

## Stack Tecnologico

| Tecnologia | Versione | Note |
|---|---|---|
| Next.js | 16.2.0 | App Router, React Compiler abilitato |
| React | 19.2.4 | con React Compiler (`babel-plugin-react-compiler`) |
| TypeScript | 5.x | strict mode |
| Supabase | `@supabase/supabase-js` ^2.99 | Auth + Database + Storage |
| Tailwind CSS | 4.x | CSS variables, tema dark con OKLch |
| Recharts | 3.8.x | Grafici peso/progressi |
| Stripe | 20.x | Pagamenti (integrazione presente ma non ancora completa) |
| Prisma | 7.x | ORM installato ma raramente usato (Supabase principale) |
| FontAwesome | 7.x | Icone |
| html2canvas | 1.4 | Screenshot per condivisione sessioni/settimane |
| Web Push | 3.6.x | Notifiche push PWA |

---

## Struttura Route (App Router)

```
src/app/
├── (admin)/admin/dashboard/         → Dashboard admin (approvazione coach)
├── (atleta)/atleta/
│   ├── dashboard/
│   ├── allenamento/
│   ├── schede/[id]/
│   ├── esercizi/
│   ├── progressi/
│   └── impostazioni/
├── (cliente)/cliente/
│   ├── dashboard/
│   ├── allenamento/              ← 872 righe, client component pesante
│   ├── chat/
│   ├── dieta/
│   ├── progressi/
│   └── impostazioni/
├── (coach)/coach/
│   ├── analytics/               ← Dashboard principale coach (~700 righe)
│   ├── clienti/
│   ├── schede/[id]/
│   ├── schede/nuova/
│   ├── esercizi/
│   ├── chat/
│   ├── pending/                 ← Coach in attesa approvazione
│   └── impostazioni/
├── (auth)/login/
├── (auth)/register/
├── join/[code]/                 ← Link invito cliente
└── api/
    ├── auth/signout/
    ├── admin/{coach-status,stats,utenti}/
    ├── coach/{crea-invito,accetta-invito,aggiungi-cliente}/
    ├── account/elimina/
    ├── notify/nuovo-coach/
    ├── push/{send,subscribe}/
    └── cron/coach-inattivi/
```

---

## Ruoli Utente

| Ruolo | Accesso | Note |
|---|---|---|
| `coach` | `/coach/*` | Richiede approvazione admin (`coach_status: 'approved'`) |
| `cliente` | `/cliente/*` | Assegnato da coach via invito |
| `atleta` | `/atleta/*` | Self-service, accesso limitato (some features dietro paywall) |
| `admin` | `/admin/*` | Gestione globale piattaforma |

---

## Componenti Chiave

### Sidebars (layout persistente)
- `src/components/coach/CoachSidebar.tsx` — Desktop sidebar + bottom nav mobile con popup "Allenamento" e "Altro"
- `src/components/cliente/ClienteSidebar.tsx` — Bottom nav mobile con menu "Altro"
- `src/components/atleta/AtletaSidebar.tsx` — Stessa struttura

### Coach
- `src/components/coach/CoachClientiList.tsx` — Lista clienti con drawer laterale (schede, peso, check-in, sessioni)
- `src/components/coach/WeightChart.tsx` ← **NUOVO** — Grafico peso corpo, importato dinamicamente
- `src/components/coach/MacroTargetForm.tsx` — Form target macronutrienti
- `src/components/coach/SchedaEditorModal.tsx` — Editor schede allenamento

### Shared
- `src/components/shared/PaywallModal.tsx` — Modal paywall piano Pro
- `src/components/shared/IosBanner.tsx` — Banner installazione PWA su Safari iOS
- `src/components/shared/ShareOverlay.tsx` — Screenshot condivisione sessione (usa html2canvas → DEVE usare `<img>` nativo)
- `src/components/shared/ShareOverlayWeek.tsx` — Screenshot condivisione settimana

---

## Patterns Supabase

### Client-side
```ts
import { createClient } from '@/lib/supabase/client'
// Usare sempre useMemo per evitare nuove istanze ad ogni render:
const supabase = useMemo(() => createClient(), [])
```

### Server-side
```ts
import { createClient } from '@/lib/supabase/server'
const supabase = await createClient()
```

### Middleware (auth + redirect)
- `src/middleware.ts` → chiama `updateSession()` da `src/lib/supabase/middleware.ts`
- Protezione route: `/coach/*`, `/cliente/*`, `/atleta/*`, `/admin/*`
- Redirect automatico al ruolo corretto se già autenticato

---

## Temi / Design System

- **Colore primario Coach:** `oklch(0.70 0.19 46)` (arancio)
- **Colore primario Cliente/Atleta:** `oklch(0.60 0.15 200)` (blu)
- **Background base:** `oklch(0.13 0 0)`
- **Card:** `oklch(0.18 0 0)`
- **Font heading:** Syne (variable `--font-syne`)
- **Font body:** Inter (variable `--font-inter`)
- **Bordi:** `oklch(1 0 0 / 6-8%)`

---

## Ottimizzazioni Applicate (2026-03-31)

### 1. `next/image` per loghi
**File modificati:**
- `src/components/coach/CoachSidebar.tsx`
- `src/components/cliente/ClienteSidebar.tsx`
- `src/components/atleta/AtletaSidebar.tsx`
- `src/app/(admin)/layout.tsx`
- `src/app/(auth)/login/page.tsx`
- `src/app/(auth)/register/page.tsx`

**Perché:** I tag `<img>` non passano per il pipeline di ottimizzazione di Next.js. `next/image` genera automaticamente formati moderni (WebP/AVIF), lazy loading nativo, e previene layout shift (CLS). Migliora il LCP della pagina.

**Pattern usato:**
```tsx
import Image from 'next/image'
<Image src="/logo/Bynari_WO1.png" alt="Bynari" width={120} height={28} style={{ height: '28px', width: 'auto' }} />
```

**Note:** `ShareOverlay.tsx` e `ShareOverlayWeek.tsx` usano intenzionalmente `<img>` nativo perché html2canvas non supporta Next.js Image.

### 2. `next/dynamic` per Recharts in CoachClientiList
**File modificati:**
- `src/components/coach/CoachClientiList.tsx` (rimosso import recharts, aggiunto dynamic)
- `src/components/coach/WeightChart.tsx` (nuovo file con chart)

**Perché:** Recharts pesa ~400KB. Veniva caricato all'avvio anche se il drawer cliente non era aperto. Con dynamic import + `ssr: false`, il bundle viene caricato solo quando l'utente apre un cliente.

**Pattern usato:**
```tsx
import dynamic from 'next/dynamic'
const WeightChart = dynamic(() => import('@/components/coach/WeightChart'), {
  ssr: false,
  loading: () => <div style={{ height: '100%' }} />,
})
```

### 3. `useMemo` per Supabase client
**File modificati:**
- `src/components/coach/CoachClientiList.tsx`
- `src/app/(coach)/coach/analytics/page.tsx`
- `src/app/(coach)/coach/clienti/page.tsx`

**Perché:** `createClient()` chiamato durante il render crea una nuova istanza ad ogni re-render. Con `useMemo(() => createClient(), [])` l'istanza viene creata una sola volta per ciclo di vita del componente.

### 4. Error Boundaries
**File creati:**
- `src/app/(coach)/coach/error.tsx`
- `src/app/(cliente)/cliente/error.tsx`
- `src/app/(atleta)/atleta/error.tsx`

**Perché:** In assenza di `error.tsx`, un errore in un client component crasha l'intera pagina senza possibilità di recovery. Con le error boundaries, Next.js mostra un fallback con pulsante "Riprova" invece di una schermata bianca.

### 5. Supabase storage domain in next.config.ts
**Perché:** Aggiunto `*.supabase.co` come `remotePattern` per permettere l'uso futuro di `next/image` per le foto progressi caricate su Supabase Storage.

---

## Problemi Ancora Presenti (TODO Performance)

### Alta priorità

1. **`analytics/page.tsx` (~700 righe, 'use client')** — Importa recharts staticamente. Il refactoring richiede l'estrazione delle sezioni grafico in componenti separati e l'uso di `dynamic` import per recharts. File troppo grande per toccare in sicurezza senza test.

2. **`cliente/allenamento/page.tsx` (872 righe, 'use client')** — Client component monolitico con 12+ useState, timer, fetch Supabase, tutto insieme. Candidato per split in server/client ibrido con Suspense.

3. **`progressi/page.tsx` — `<img>` per foto utente** — Usa `<img src={f.url}>` per le foto da Supabase Storage. Da convertire a `<Image>` ora che il dominio è in `next.config.ts`. Richiede gestione dimensioni dynamiche (usare `fill` con container sized).

4. **`SchedaEditorModal.tsx`** — Importato staticamente in analytics page. Candidato per `dynamic` import.

### Media priorità

5. **No SWR/React Query** — Ogni componente gestisce il proprio stato loading/error/data. Nessuna deduplicazione richieste, nessuna cache tra navigazioni.

6. **Re-fetch completo su ogni interazione** — Esempio: `fetchAll()` in `clienti/page.tsx` rifetch tutto dopo ogni azione (aggiungi/approva/rimuovi). Con SWR si potrebbe fare invalidazione selettiva.

7. **`page.tsx` (landing page)** — Ha 2 tag `<img>` logo non convertiti. File di marketing non prioritario ma andrebbe comunque convertito.

8. **Mancano `loading.tsx` per:** `/coach/chat`, `/coach/impostazioni`, `/cliente/chat`, `/cliente/dieta`, `/cliente/impostazioni`

### Bassa priorità

9. **FontAwesome bundle** — Tutti gli icon pack importati staticamente. Tree-shaking attivo ma potrebbe beneficiare di importazioni più granulari.

10. **Nessun error boundary per `/admin`** — La dashboard admin non ha `error.tsx`.

---

## Struttura File di Configurazione

```
next.config.ts          → reactCompiler: true, images.remotePatterns Supabase
tsconfig.json           → strict, paths @/* → ./src/*
postcss.config.mjs      → @tailwindcss/postcss
src/app/globals.css     → Tailwind 4 theme via @theme, OKLch colors
src/lib/supabase/
  client.ts             → createBrowserClient (browser)
  server.ts             → createServerClient (SSR + cookies)
  middleware.ts         → updateSession + role-based redirects
src/lib/piani.ts        → Definizione piani Free/Pro
src/lib/telegram.ts     → Notifiche Telegram admin
src/types/index.ts      → UserRole, Profile interface
```

---

## Env Variables Necessarie

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
NEXT_PUBLIC_SITE_URL
STRIPE_SECRET_KEY (se billing attivo)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY (se billing attivo)
TELEGRAM_BOT_TOKEN (notifiche admin)
TELEGRAM_CHAT_ID (notifiche admin)
VAPID_PUBLIC_KEY (push notifications)
VAPID_PRIVATE_KEY (push notifications)
```

---

## Roadmap Sprint

### ✅ COMPLETATO (Sprint 1-3 + parziale Sprint 4)

**Sprint 1-2:** Setup base, auth, ruoli, schede, esercizi, sessioni, check-in, misurazioni, analytics coach, admin dashboard, notifiche Telegram, PWA.

**Sprint 3 — Nutrizione:**
- Tabelle DB: `macro_target`, `pasto_log`, `integrazione_log`
- Pagina dieta cliente con Open Food Facts (subdomain `it.` per risultati in italiano)
- Tab Nutrizione nel drawer coach per impostare macro target
- Toggle dieta per cliente (coach abilita/disabilita da drawer — colonna `dieta_abilitata` su `coach_clienti`)
- Storico 7 giorni dettagliato + compatto per i giorni precedenti nella pagina dieta cliente
- Vista nutrizione coach nel drawer: storico 7 giorni del cliente con barre macro

**Sprint 4 — parziale:**
- Chat realtime coach-cliente (tabella `messaggi`, Supabase Realtime + `REPLICA IDENTITY FULL` + `supabase_realtime` publication)
- Push notifications PWA (VAPID keys, tabella `push_subscriptions`, service worker aggiornato)
- Assegna scheda dal drawer analytics — diretto o clona+editor
- Anteprima scheda read-only nel picker assegnazione
- Fix approvazione coach via API route con service role (`/api/admin/coach-status`)
- Navbar coach mobile: popup "Allenamento" (Schede+Esercizi) + "Altro" (Impostazioni+Esci) — 5 voci totali
- Navbar cliente mobile: voce Chat aggiunta, menu "Altro" con Impostazioni+Esci

---

### 🔄 SPRINT 4 — in corso

**Aggiunte:**
- [ ] Algoritmi rischio cliente + Alert avanzati coach

---

### 📋 SPRINT 5 — definito

**Aggiunte:**
- [ ] Home cliente: 2 card in cima (Check-in oggi + Peso oggi) con stato fatto/da fare + modal backdrop blur per compilare senza uscire dalla home
- [ ] Chat: messaggi con allegato — pulsante "allega" per selezionare scheda o sessione, appare come card cliccabile nel messaggio
- [ ] Triple Progression intra-serie: dopo conferma serie (solo se NON è l'ultima), suggerisce peso calcolato (+5% arrotondato allo 0.5 se reps > range, -7.5% se reps < range). Messaggio con peso esatto, non percentuale. Post-esercizio (ultima serie) suggerisce per sessione successiva.
- [ ] Atleta: implementare limiti free + PRO paywall

**Modifiche:**
- [ ] Progressi cliente: rimuovere misurazioni/foto/check-in, lasciare solo grafici
- [ ] Dashboard coach: rimuovere tab Benessere e Peso (ridondanti col drawer), potenziare tab Alert
- [ ] Alert coach avanzati: inattivo 4+ giorni, check-in mancante 4+ giorni, check-in negativi consecutivi (energia/sonno/motivazione bassa, stress alto), calo volume allenamento, peso anomalo
- [ ] Fix scala stress ovunque: stress alto = negativo (invertire — ad oggi è al contrario sia lato cliente che nel drawer coach)
- [ ] Atleta: audit completo area atleta + allineamento a tutte le modifiche fatte su coach/cliente

---

### 🎮 LIMITI PIANO ATLETA (da implementare)

**FREE:**
- 1 scheda, max 4 giorni per scheda
- Logger base: info ultima volta + PR badge
- Share card
- Timer recupero
- ❌ Double/Triple progression (suggerimento peso)
- ❌ Grafici progressi
- ❌ Check-in benessere
- ❌ Misurazioni/foto
- ❌ Storico sessioni completo (solo ultime 5)
- ❌ Tecniche avanzate (superset, dropset, rest-pause, piramidale, giant set)

**PRO:**
- Schede illimitate, giorni illimitati
- Triple Progression completa
- Grafici progressi completi
- Check-in benessere
- Misurazioni/foto
- Storico sessioni completo
- Tecniche avanzate

---

### 🚀 CRITICO PRE-LANCIO

**Aggiunte:**
- [ ] Privacy Policy + Terms (GDPR)
- [ ] Stripe pagamenti + pricing tiers coach (Free 3 clienti / Starter / Pro / Studio)

---

### 📌 FUTURE

**Aggiunte:**
- [ ] Video upload esercizi (Supabase Storage)
- [ ] Notifiche email coach via Resend (da fare insieme agli alert)
- [ ] Push PWA quando timer recupero finisce

**Modifiche:**
- [ ] Redesign mobile scheda allenamento (righe espandibili)

---

## Note DB Importanti

- **`coach_clienti`** ha colonna `dieta_abilitata boolean default false` — controlla se il cliente vede la sezione Dieta
- **`messaggi`** ha `REPLICA IDENTITY FULL` e `ALTER PUBLICATION supabase_realtime ADD TABLE messaggi` — necessario per il realtime
- **`push_subscriptions`** — una riga per utente (UNIQUE su `user_id`), subscription JSON per Web Push
- **FK ambigue su `scheda_esercizi`**: dopo aggiunta `alternativa_esercizio_id`, qualsiasi join verso `esercizi` da `scheda_esercizi` DEVE usare `esercizi!scheda_esercizi_esercizio_id_fkey`

## Note Architetturali

- Server components nei layout per protezione ruoli; client components per interattività
- Service role key usata SOLO nelle API routes (`/api/admin/`, `/api/push/send`)
- Supabase free: 500MB DB, 1GB storage
- Vercel free: cron funziona, cold start ~200ms
- PWA installabile su iOS 16.4+ da Safari
- Safe area inset top gestita con `env(safe-area-inset-top)` per Dynamic Island

## Working Style (importante per Claude)
- File completi pronti da incollare, non patch manuali
- Sempre fornire git add . && git commit -m "..." && git push alla fine
- Quando si fa una modifica a un file già uploadato, richiederlo aggiornato prima di modificarlo
- Errori di build JSX frequenti su file grandi — verificare sempre la struttura prima di fare output
- Usare `maybeSingle()` invece di `single()` per query che potrebbero non trovare risultati


1. **React Compiler è attivo** — Non aggiungere `useMemo`/`useCallback` manualmente a meno che non sia strettamente necessario (come `createClient()`). Il compiler ottimizza automaticamente la maggior parte dei casi.

2. **Tailwind 4** — Nessun `tailwind.config.js`. Le customizzazioni sono in `globals.css` con `@theme {}`. La sintassi è diversa da Tailwind 3.

3. **`<img>` intenzionali** — `ShareOverlay.tsx` e `ShareOverlayWeek.tsx` usano `<img>` nativo per compatibilità con html2canvas. Non convertire.

4. **Supabase SSR pattern** — Usare sempre `@supabase/ssr` con le funzioni di utility in `src/lib/supabase/`. Non usare mai `createClient()` direttamente da `@supabase/supabase-js`.

5. **Font loading** — I font Google (Syne, Inter) sono ottimizzati via `next/font/google` nel layout root. Non rimuovere o duplicare.
