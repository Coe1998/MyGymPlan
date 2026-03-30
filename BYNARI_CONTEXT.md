# Bynari — Project Context (aggiornato 30/03/2026)

## Stack tecnico
- Next.js 15 (App Router) + TypeScript, Tailwind CSS v4, Supabase, Vercel
- URL live: `my-gym-plan-delta.vercel.app`
- Repo: `github.com/Coe1998/mygymplan`
- Colori brand: arancione `oklch(0.70 0.19 46)`, bg `oklch(0.13 0 0)`, card `oklch(0.18 0 0)`

---

## Struttura ruoli
- `admin` — monitora la piattaforma, approva coach
- `coach` — crea schede, gestisce clienti, analytics
- `cliente` — segue schede assegnate dal coach, fa check-in
- `atleta` — usa la piattaforma autonomamente senza coach

---

## DB — tabelle principali
- `profiles` — id, full_name, role, coach_code, coach_status (pending/approved/suspended)
- `coach_clienti` — coach_id, cliente_id
- `coach_inviti` — coach_id, cliente_id, stato (pending/accepted)
- `schede` — id, coach_id, nome, descrizione, is_template
- `scheda_giorni` — id, scheda_id, nome, ordine
- `scheda_esercizi` — id, giorno_id, esercizio_id, serie, ripetizioni, recupero_secondi, note, ordine,
  tipo (normale/superset/dropset/giant_set/rest_pause/piramidale), gruppo_id,
  drop_count, drop_percentage, rest_pause_secondi, piramidale_direzione, alternativa_esercizio_id
- `esercizi` — id, coach_id (nullable), nome, muscoli[], descrizione, video_url, is_global
- `assegnazioni` — id, scheda_id, cliente_id, coach_id, data_inizio, data_fine, attiva, pdf_alimentare_url
- `sessioni` — id, cliente_id, giorno_id, assegnazione_id, data, completata, durata_secondi
- `log_serie` — sessione_id, scheda_esercizio_id, numero_serie, peso_kg, ripetizioni, completata
- `checkin` — cliente_id, data, energia, sonno, stress, motivazione, note
- `misurazioni` — cliente_id, data, peso_kg, + altri campi corporei

---

## Struttura file (src/)

### App routes
```
app/
  page.tsx                          ← Landing page (CRO focus)
  app/page.tsx                      ← Router post-login (redirect per ruolo)
  (auth)/
    login/page.tsx                  ← Login con routing ruolo (coach/cliente/atleta/admin)
    register/page.tsx               ← Registrazione + notifica Telegram admin per nuovo coach
  (admin)/
    layout.tsx                      ← Protezione ruolo admin
    admin/dashboard/page.tsx        ← Dashboard admin (stats, approvazione coach)
  (coach)/
    layout.tsx                      ← CoachSidebar
    coach/
      dashboard/page.tsx            ← redirect a /coach/analytics
      analytics/page.tsx            ← Dashboard principale coach (lista clienti, stats, drawer overview)
      clienti/page.tsx              ← Gestione clienti
      schede/
        page.tsx                    ← Lista schede
        [id]/page.tsx               ← Dettaglio scheda + assegnazione massiva + bottone Editor
      esercizi/page.tsx             ← Libreria esercizi (globali + propri, filtri, paginazione)
      impostazioni/page.tsx         ← Impostazioni coach
      pending/page.tsx              ← Pagina attesa approvazione
  (cliente)/
    layout.tsx
    cliente/
      dashboard/page.tsx            ← Dashboard cliente
      allenamento/page.tsx          ← Sessione allenamento (progressive overload, timer recupero fisso)
      progressi/page.tsx            ← Progressi e storico sessioni
      check-in/page.tsx             ← Check-in benessere
      impostazioni/page.tsx
  (atleta)/
    atleta/
      dashboard/page.tsx
      esercizi/page.tsx             ← Libreria esercizi (globali + propri)
      allenamento/page.tsx
      impostazioni/page.tsx
  api/
    admin/
      stats/route.ts                ← Stats admin con service role (bypassa RLS)
      utenti/route.ts
    auth/signout/route.ts           ← Logout GET
    coach/crea-invito/route.ts      ← Crea invito bypassando RLS
    notify/nuovo-coach/route.ts     ← Notifica Telegram nuovo coach pending
    cron/coach-inattivi/route.ts    ← Cron giornaliero 9:00 coach inattivi
  join/[code]/page.tsx              ← Pagina join via codice invito
```

### Components
```
components/
  coach/
    CoachSidebar.tsx                ← Sidebar desktop + bottom nav mobile
    CoachClientiList.tsx            ← Lista clienti con drawer overview completo
    SchedaEditorModal.tsx           ← Modal editor schede con tecniche avanzate
  shared/
    CoachOnboarding.tsx             ← Tutorial 11 step coach
    ClienteOnboarding.tsx           ← Tutorial 7 step cliente
    AtletaOnboarding.tsx            ← Tutorial 8 step atleta
    IosBanner.tsx                   ← Banner installazione PWA (riappare dopo 7gg)
    ShareOverlay.tsx                ← Overlay condivisione allenamento
    ShareOverlayWeek.tsx
    LogoutButton.tsx
    PaywallModal.tsx
```

### Lib
```
lib/
  supabase/
    client.ts                       ← createClient per browser
    server.ts                       ← createClient per server
    middleware.ts                   ← updateSession + routing ruoli (coach/cliente/atleta/admin)
  telegram.ts                       ← sendTelegram(message) utility
```

---

## Features implementate

### Admin
- Dashboard con stats (coach totali/pending/approvati, clienti, atleti, sessioni, schede)
- Tab Overview / Coach / Attività recente
- Approvazione/sospensione/riattivazione coach
- Alert coach inattivi post-approvazione
- Notifiche Telegram: nuovo coach pending + cron coach inattivi (9:00)

### Coach
- Dashboard unificata (ex Analytics): lista clienti cliccabile, drawer overview completo
  (stats, schede assegnate, ultimo check-in, grafico peso, ultime sessioni)
- Sidebar desktop + bottom nav mobile (5 voci: Dashboard, Clienti, Schede, Esercizi, + Altro)
- Gestione schede: lista, creazione, editor modal con tecniche avanzate
- Editor schede modal: giorni tab orizzontali, esercizi con tipo avanzato
  (Normale, Superset, Giant Set, Dropset, Rest-Pause, Piramidale)
  con indentazione visiva per gruppi, alternativa esercizio, note coach
- Assegnazione massiva schede: checkbox multi-selezione clienti
- Libreria esercizi: globali (65 esercizi) + propri, filtri tipo/muscolo, paginazione 10

### Cliente
- Dashboard con schede del giorno
- Sessione allenamento:
  - Timer sessione resistente a standby (basato su timestamp)
  - Timer recupero fisso in basso (resistente a standby)
  - Confronto con sessione precedente (kg × reps)
  - Progressive overload (Double Progression Model): suggerimento peso come toast fixed in basso
    - Apertura sessione → suggerimento primo esercizio
    - Dopo ultima serie di ogni esercizio → suggerimento esercizio successivo
    - Tono diretto: "💪 Forza! Sali a Xkg" / "🎯 Mantieni Xkg" / "📉 Prova con Xkg"
  - Auto-completamento sessione quando tutte le serie sono spuntate
- Check-in benessere (energia, sonno, stress, motivazione)
- Progressi e storico sessioni

### Esercizi globali
- 65 esercizi globali (coach_id = null, is_global = true)
- Coach e atleti vedono globali + propri
- Solo i propri sono modificabili/eliminabili
- Badge "🌐 Globale" per quelli di sistema

### Onboarding
- Tutorial per coach (11 step), cliente (7 step), atleta (8 step)
- Bottone "Rivedi tutorial" nelle impostazioni
- Stato in localStorage

### Auth flow
- Registrazione → trigger profilo → routing per ruolo
- Coach si registra → status pending → notifica Telegram admin
- Invito coach via codice → join/[code] → login/register

---

## RLS policies chiave
- `esercizi`: coach vede propri + globali; cliente vede globali + quelli del suo coach
- `coach_clienti`: coach vede i suoi clienti
- `assegnazioni`: cliente vede le sue; coach vede quelle dei suoi clienti
- `sessioni`: cliente vede le sue; coach vede quelle dei suoi clienti
- `profiles`: coach readable da anon per join via codice

---

## Env vars (Vercel)
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` — bypassa RLS, usato solo nelle API routes
- `TELEGRAM_BOT_TOKEN` — `8751498493:AAG...` (⚠ da revocare e rigenerare)
- `TELEGRAM_CHAT_ID` — `1286428094`
- `CRON_SECRET` — protezione route cron

## vercel.json
```json
{ "crons": [{ "path": "/api/cron/coach-inattivi", "schedule": "0 9 * * *" }] }
```

---

## Account di test
- Admin: `bogdancosminbejinari+admin@gmail.com`
- Coach: `bogdancosminbejinari@gmail.com`
- Cliente: `bogdancosminbejinari+cliente@gmail.com`

---

## PENDING / TODO

### Critico prima del lancio beta
- [ ] Revocare e rigenerare token Telegram da @BotFather
- [ ] Privacy Policy + Terms (GDPR)
- [ ] Stripe per pagamenti

### Sprint 2 in corso
- [x] Editor schede con tecniche avanzate (modal, superset/dropset/giant set/rest-pause/piramidale)
- [ ] Fix click tipo buttons (stale closure) + filtro muscolare nel picker esercizio
- [ ] Visualizzazione tecniche avanzate durante la sessione cliente
  (superset raggruppati, dropset con peso suggerito, rest-pause con mini-timer)

### Sprint 3
- [ ] Gestione macro/dieta con Open Food Facts API
  (coach imposta macro target, cliente traccia pasti, app calcola rimanente)
- [ ] Assegnazione schede direttamente dalla dashboard coach (dal drawer cliente)

### Sprint 4
- [ ] Chat coach-cliente (semplice, senza contestualità per ora)
- [ ] Video upload personali esercizi (Supabase storage, limite 1GB free tier)

### Future
- [ ] Notifiche email per i coach (clienti a rischio, digest settimanale) via Resend
- [ ] Push notification PWA quando timer recupero finisce
- [ ] Algoritmi rischio cliente (inattività, calo volume, check-in warning)
- [ ] Redesign mobile scheda allenamento (righe espandibili invece di tutti i campi visibili)
- [ ] Stripe + pricing: Coach Free (3 clienti) / Starter €9-15/mo / Pro €19-29/mo / Studio €49-99/mo

---

## Note architetturali
- Server components nel layout per protezione ruoli; client components per interattività
- Service role key usata SOLO nelle API routes (`/api/admin/`) mai nel browser
- Supabase free plan: 500MB DB, 1GB storage — sufficiente per beta
- Vercel free plan: cron job funziona, cold start ~200ms
- PWA installabile su iOS 16.4+ da Safari → Add to Home Screen
- Safe area inset top gestita con `env(safe-area-inset-top)` per Dynamic Island iPhone
