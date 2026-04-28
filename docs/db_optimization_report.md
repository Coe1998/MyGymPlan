# DB Optimization Report — Bynari / Supabase `dcwchgzxuzfywkxsadjp`

> Generato il 2026-04-28. Stack: Next.js 15, React 19, TypeScript strict, Supabase.

---

## 1. Indici aggiunti

### Migration 008 — `20260428_add_missing_indexes.sql` (applicata)

| Indice | Tabella | Colonne | Motivazione |
|--------|---------|---------|-------------|
| `sessioni_cliente_id_idx` | sessioni | `(cliente_id)` | Usato in quasi ogni pagina |
| `sessioni_cliente_data_idx` | sessioni | `(cliente_id, data DESC)` | Analytics con range date + order |
| `log_serie_sessione_id_idx` | log_serie | `(sessione_id)` | Ogni apertura workout carica tutti i log |
| `log_serie_scheda_esercizio_id_idx` | log_serie | `(scheda_esercizio_id)` | FK join per nome/muscoli in analytics |
| `misurazioni_cliente_id_idx` | misurazioni | `(cliente_id)` | Grafici peso |
| `misurazioni_cliente_data_idx` | misurazioni | `(cliente_id, data DESC)` | Range temporali |
| `checkin_cliente_id_idx` | checkin | `(cliente_id)` | `.in()` multi-client analytics |
| `messaggi_coach_id_idx` | messaggi | `(coach_id)` | Unread count sidebar |
| `messaggi_cliente_id_idx` | messaggi | `(cliente_id)` | Unread count sidebar |
| `messaggi_coach_cliente_idx` | messaggi | `(coach_id, cliente_id, created_at)` | Chat fetch + Realtime WAL filter |
| `assegnazioni_cliente_id_idx` | assegnazioni | `(cliente_id)` | Dashboard + analytics |
| `assegnazioni_coach_id_idx` | assegnazioni | `(coach_id)` | Lista assegnazioni |
| `assegnazioni_cliente_attiva_idx` | assegnazioni | `(cliente_id, attiva)` | Assegnazione attiva corrente |
| `scheda_giorni_scheda_id_idx` | scheda_giorni | `(scheda_id)` | Editor scheda |
| `scheda_esercizi_giorno_id_idx` | scheda_esercizi | `(giorno_id)` | Join per caricare esercizi |
| `scheda_esercizi_esercizio_id_idx` | scheda_esercizi | `(esercizio_id)` | FK join nome/muscoli |
| `esercizi_coach_id_idx` | esercizi | `(coach_id)` | Lista esercizi |
| `schede_coach_id_idx` | schede | `(coach_id)` | Lista schede |
| `coach_clienti_cliente_id_idx` | coach_clienti | `(cliente_id)` | Reverse lookup RLS policy |
| `diete_coach_id_idx` | diete | `(coach_id)` | Coach legge diete clienti |
| `pasto_log_cliente_id_idx` | pasto_log | `(cliente_id)` | Diario alimentare |
| `pasto_log_cliente_data_idx` | pasto_log | `(cliente_id, data)` | Filtra per giorno |
| `appuntamenti_coach_id_idx` | appuntamenti | `(coach_id)` | Calendario |
| `appuntamenti_coach_data_ora_idx` | appuntamenti | `(coach_id, data_ora)` | Order by data |
| `appuntamenti_cliente_id_idx` | appuntamenti | `(cliente_id)` | Widget cliente |
| `anamnesi_cliente_id_idx` | anamnesi | `(cliente_id)` | Lookup one-to-one |
| `progress_check_set_coach_id_idx` | progress_check_set | `(coach_id)` | Lista set coach |
| `progress_check_schedulazioni_coach_id_idx` | progress_check_schedulazioni | `(coach_id)` | Pagina checkin |
| `progress_check_schedulazioni_coach_data_idx` | progress_check_schedulazioni | `(coach_id, data)` | Filtro futuro |
| `progress_check_risposte_schedulazione_id_idx` | progress_check_risposte | `(schedulazione_id)` | FK join |
| `macro_target_cliente_id_idx` | macro_target | `(cliente_id)` | Lookup legacy |

### Migration 009 — `20260428120000_db_optimizations.sql` (da applicare)

| Indice | Tabella | Colonne | Motivazione |
|--------|---------|---------|-------------|
| `idx_pcs_cliente_id` | progress_check_schedulazioni | `(cliente_id)` | Cliente legge le sue schedulazioni |
| `idx_pcs_data` | progress_check_schedulazioni | `(data)` | Query per data futura |
| `idx_pcs_set_id` | progress_check_schedulazioni | `(set_id)` | FK join verso progress_check_set |
| `idx_pcr_schedulazione_id` | progress_check_risposte | `(schedulazione_id)` | FK join (ridondante con migration 008 ma nome diverso) |
| `idx_pcr_cliente_id` | progress_check_risposte | `(cliente_id)` | RLS policy + fetch per cliente |
| **`idx_pcr_risposte_gin`** | progress_check_risposte | `USING gin(risposte)` | **GIN su JSONB** — ricerca su campo `risposte` |
| `idx_note_esercizio_cliente_id` | note_esercizio | `(cliente_id)` | RLS policy + fetch per cliente |
| `idx_note_esercizio_sessione_id` | note_esercizio | `(sessione_id)` | Fetch note per sessione |
| `idx_cc_override_cliente_data` | carb_cycling_override | `(cliente_id, data)` | `.eq(cliente_id).eq(data, oggi)` |
| `idx_cc_giorni_piano_id` | carb_cycling_giorni | `(piano_id)` | FK join |
| `idx_piano_int_cliente_attivo` | piano_integratori | `(cliente_id, attivo)` | Query frequente `.eq(attivo, true)` |
| `idx_integratori_checkin_cliente_data` | integratori_checkin | `(cliente_id, data)` | Check giornaliero integratori |
| `idx_integrazione_log_cliente_data` | integrazione_log | `(cliente_id, data)` | Log giornaliero |

#### Indici dal task 3 saltati (colonne inesistenti)

| Indice richiesto | Motivo skip |
|-----------------|-------------|
| `idx_sessioni_scheda_id` | `sessioni` non ha colonna `scheda_id` (ha `assegnazione_id`) |
| `idx_sessioni_created_at` | `sessioni` non ha `created_at` (usa `data`) — già coperto da `sessioni_cliente_data_idx` |
| `idx_scheda_esercizi_scheda_id` | `scheda_esercizi` non ha `scheda_id` (ha `giorno_id`) — già coperto da `scheda_esercizi_giorno_id_idx` |

---

## 2. RLS — Tabelle fixate

### Tabelle con RLS abilitato in migration 009

| Tabella | Policy create | Pattern |
|---------|--------------|---------|
| `progress_check_domande` | Coach ALL + Cliente SELECT | via `progress_check_set.coach_id` / `schedulazioni.cliente_id` |
| `progress_check_set` | Coach ALL + Cliente SELECT | `coach_id = auth.uid()` / via schedulazioni |
| `progress_check_schedulazioni` | Coach ALL + Cliente SELECT | `coach_id` / `cliente_id = auth.uid()` |
| `progress_check_risposte` | Cliente ALL + Coach SELECT | `cliente_id = auth.uid()` / via schedulazioni |
| `note_esercizio` | Cliente ALL + Coach SELECT | `cliente_id = auth.uid()` / via `coach_clienti` |
| `pasto_log` | Cliente ALL + Coach SELECT | `cliente_id = auth.uid()` / via `coach_clienti` |
| `piano_integratori` | Coach ALL + Cliente SELECT | `coach_id = auth.uid()` / `cliente_id = auth.uid()` |
| `integratori_checkin` | Cliente ALL | `cliente_id = auth.uid()` |
| `integrazione_log` | Cliente ALL + Coach SELECT | `cliente_id = auth.uid()` / via `coach_clienti` |

### Tabelle con RLS già abilitato (migration 001–006)
`profiles`, `coach_clienti`, `esercizi`, `schede`, `scheda_giorni`, `scheda_esercizi`, `assegnazioni`, `sessioni`, `log_serie`, `misurazioni`, `checkin`, `messaggi`, `user_preferences`, `alimenti`, `macro_target`, `anamnesi`, `carb_cycling_profili/giorni/override`, `push_subscriptions/scheduled`, `appuntamenti`, `coach_inviti`, `diete`, `dieta_profili_macro`, `dieta_ciclo`

---

## 3. Query nel codebase modificate

| File:riga | Prima | Dopo | Impatto |
|-----------|-------|------|---------|
| `src/app/(coach)/coach/analytics/page.tsx:210-213` | `.in('cliente_id', ids)` senza date filter | `.gte('data', ultimi180gg)` aggiunto | Elimina full scan su tutta la storia sessioni |
| `src/app/(coach)/coach/analytics/page.tsx:217-221` | `checkin.select('*').in(ids)` senza date filter | `.select('cliente_id,data,energia,sonno,stress,motivazione').gte(ultimi180gg)` | -~80% dati trasferiti, elimina full scan |
| `src/app/(coach)/coach/analytics/page.tsx:476-480` | `piano_integratori.select('*')` | `.select('id,nome,quantita,unita,momento,note,attivo,created_at')` | Colonne esatte, evita JSONB/TEXT grandi |
| `src/app/(cliente)/cliente/dieta/page.tsx:153` | `pasto_log.select('*')` (pasti di oggi) | Select 11 colonne esatte | Evita colonne non usate |
| `src/app/(cliente)/cliente/dieta/page.tsx:304-307` | `pasto_log.select('*').limit(150)` | Select 11 colonne esatte | -~30% dati per riga |
| `src/app/(cliente)/cliente/dieta/page.tsx:317-320` | `pasto_log.select('*').limit(300)` | Select 11 colonne esatte | -~30% dati per riga |
| `src/components/coach/analytics/ClienteInsights.tsx` | Doppia query `sessioni` (una ridondante) | `sessIds` riusati dalla prima query | -1 query per caricamento insights |
| `src/components/coach/analytics/ClienteInsights.tsx` | `checkin_giornalieri` (tabella inesistente) | `checkin` (tabella corretta) | Fix errore runtime |
| `src/components/cliente/ClienteSidebar.tsx:56` | `event: '*'` su messaggi | `event: 'INSERT'` | Elimina refetch su mark-as-read |
| `src/components/coach/CoachSidebar.tsx:59` | `event: '*'` su messaggi | `event: 'INSERT'` | Elimina refetch su mark-as-read |
| `src/app/(coach)/coach/chat/page.tsx:68-72` | `.select('*').order('created_at')` senza limit | `.limit(100).order DESC + .reverse()` | Scalabile su conversazioni lunghe |
| `src/app/(cliente)/cliente/chat/page.tsx:61-65` | Idem | Idem | Idem |
| `src/app/(cliente)/cliente/progressi/page.tsx:171` | `misurazioni.select('*')` unbounded | `.limit(365)` | Cap a 1 anno |
| `src/app/(cliente)/cliente/progressi/page.tsx:188` | `checkin.select('*')` unbounded | `.limit(365)` | Cap a 1 anno |

### Query non modificate — motivazione

| Caso | Motivazione |
|------|-------------|
| `log_serie.select('*').eq('sessione_id', ...)` (4 occorrenze) | Filtrato per sessione → max ~50 righe; il rischio di rompere campi come `rpe`, `rir`, `reps_sx/dx` supera il beneficio |
| Subscription realtime | Già tutte con `filter:` corretto (audit confermato) |
| `setInterval` | Nessuno chiama Supabase (audit confermato) |

---

## 4. Problemi trovati non coperti dal prompt

### Tabelle scoperte non nei migration file
`integratori_checkin` e `integrazione_log` non erano nei migration tracciati — aggiunte a migration 009 con RLS e indici.

### `checkin_giornalieri` — tabella fantasma
La tabella `checkin_giornalieri` non esiste nel DB ma veniva referenziata in `ClienteInsights.tsx`. Corretta con la tabella `checkin` che ha gli stessi campi wellness.

### Colonne legacy in `sessioni` e `scheda_esercizi`
Il task 3 richiedeva indici su colonne inesistenti (`scheda_id`, `created_at` su `sessioni`; `scheda_id` su `scheda_esercizi`). Questi indici sono stati saltati con documentazione esplicita.

### `messaggi` — schema diverge dalla migration 001
La migration 001 definisce `messaggi` con `mittente_id`/`destinatario_id`, ma il codice (e il DB reale) usa `coach_id`/`cliente_id`/`da_coach`/`letto`. La migration 008 ha aggiunto gli indici sullo schema reale.

### `dieta_ciclo` — PRIMARY KEY composita
`PRIMARY KEY (dieta_id, giorno)` già copre le query per `dieta_id` — nessun indice aggiuntivo necessario.
