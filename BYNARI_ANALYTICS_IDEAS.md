# Bynari — Idee Analytics Avanzate: Carb Cycling + Performance Atleta

Data: 2026-04-07

---

## CONTESTO ATTUALE

Al momento il sistema raccoglie già:
- Check-in giornaliero con `will_train` (giorno allenamento / riposo)
- Macro target del coach (con carb cycling: carbs_training / carbs_rest)
- Log pasti giornalieri (calorie, prot, carb, grassi per alimento)
- Log sessioni allenamento (data, completata, scheda, giorno)
- Misurazioni peso (`misurazioni` table)
- Anamnesi cliente

---

## AREA 1 — COMPLIANCE & ADERENZA

### 1.1 Compliance macro per tipo di giornata
**Idea**: Per ogni giorno con check-in, confrontare i macro loggati con il target previsto (HIGH o LOW carb).
Mostrare:
- % compliance calorie (es. 94% del target raggiunto)
- % compliance carbo specifici (spesso l'indicatore più critico nel carb cycling)
- Separare la media compliance nei giorni training vs riposo

**Valore per il coach**: capisce se il cliente segue il piano nei giorni giusti o se sbaglia tipo di giornata.

### 1.2 Streak aderenza
**Idea**: Contatore di giorni consecutivi in cui il cliente ha:
a) Fatto il check-in
b) Loggato almeno 80% delle kcal previste
c) Completato la sessione prevista (se giorno training)

**Valore**: gamification leggera, motivazione, e alert coach quando la streak si spezza.

### 1.3 Heatmap settimanale
**Idea**: Griglia 7 colonne (lun-dom) × N settimane dove ogni cella ha un colore:
- Verde: giorno training + compliance macro > 80%
- Azzurro: giorno riposo + compliance macro > 80%
- Arancio: compliance parziale (60-80%)
- Rosso: compliance bassa o nessun log
- Grigio: nessun check-in

**Valore**: pattern visivi immediati — il coach vede se il cliente "stacca" nel weekend.

---

## AREA 2 — CORRELAZIONI CARB CYCLING / PERFORMANCE

### 2.1 Carbo vs qualità allenamento (futuro: rating sessione)
**Idea**: Se si aggiunge un campo "rating" alla sessione (1-5 stelle, energia percepita), si può correlare:
- Carbo del giorno precedente (rest day LOW) → qualità sessione del giorno dopo
- Carbo del giorno stesso (HIGH) → completamento esercizi / serie extra

**Come raccoglierlo**: al termine di una sessione, mostrare un mini-survey a 1 domanda ("Come ti sei sentito? 1-5").

**Valore**: dimostra empiricamente al cliente che il carb cycling funziona per lui/lei.

### 2.2 Peso corporeo vs carbo ciclizzati
**Idea**: Grafico dual-axis:
- Linea peso (misurazioni)
- Area chart carbo giornalieri (HIGH in arancio, LOW in blu)
- Evidenziare trend discendente/ascendente del peso in relazione ai cicli

**Valore**: il coach può aggiustare HIGH/LOW target in base alla risposta del corpo (es. "il peso scende bene nei LOW, teniamo questo schema").

### 2.3 Bilancio calorico settimanale
**Idea**: Calcolo automatico deficit/surplus settimanale:
- Kcal assunte (somma log pasti 7gg) vs kcal target settimanali
- Mostrare la differenza in kcal e stimare l'impatto (3500 kcal ≈ 500g grasso)
- Trend storico deficit per settimana

**Valore**: il coach vede se il cliente è in deficit reale o solo "teorico".

---

## AREA 3 — DASHBOARD COACH POTENZIATA

### 3.1 Pannello alert intelligenti
**Idea**: Lista prioritizzata di situazioni che richiedono attenzione:
- Cliente X: 3 giorni senza check-in
- Cliente Y: compliance carbo < 50% negli ultimi 5 giorni training
- Cliente Z: peso fermo da 3 settimane (possibile plateau)
- Cliente W: ha saltato 2 sessioni consecutive

**Come**: query aggregata su tutti i clienti del coach, con badge rosso/giallo.

### 3.2 Confronto HIGH vs LOW carb day: media macro reali
**Idea**: Per ogni cliente, tabella con 2 colonne:
| | Giorni Training (HIGH) | Giorni Riposo (LOW) |
|---|---|---|
| Target carbo | 152g | 91g |
| Reale medio carbo | 138g | 105g |  ← problema: mangia troppo nei LOW
| Delta | -14g | +14g |
| Compliance | 91% | 84% |

**Valore**: identifica esattamente dove il piano non viene rispettato.

### 3.3 Proiezione mensile
**Idea**: Basandosi sulle ultime 2-3 settimane di dati, proiettare:
- Peso stimato a fine mese (se trend continua)
- Deficit calorico accumulato mensile
- Sessioni completate vs pianificate

**Valore**: il coach può fare proiezioni realistiche e ricalibrate il piano.

---

## AREA 4 — ANALYTICS LATO CLIENTE

### 4.1 Grafico macro giornalieri ultimi 30gg
**Idea**: Bar chart stacked (calorie da prot / carb / grassi) per ogni giorno, con linea target.
Colorazione diversa per giorni HIGH (sfondo arancio leggero) vs LOW (sfondo blu leggero).

**Valore**: il cliente vede visivamente dove ha rispettato e dove no.

### 4.2 Distribuzione macro per pasto
**Idea**: Grafico a ciambella (donut) per ogni pasto loggato oggi, che mostra la distribuzione reale prot/carb/grassi vs il target del coach per quel pasto.

**Valore**: il cliente capisce se sta distribuendo correttamente durante la giornata.

### 4.3 "La tua settimana tipo"
**Idea**: Analisi automatica delle ultime 4 settimane per identificare pattern:
- Giorni in cui il cliente si allena più spesso (es. lun/mer/ven)
- Orari medi di log pasto
- Pasto più saltato / meno loggato

**Valore**: personalizzazione UX — suggerire reminder al momento giusto.

---

## AREA 5 — FEATURES TECNICHE DA IMPLEMENTARE

Per supportare queste analytics servirebbero:

### 5.1 Campo `rating_sessione` in `sessioni`
```sql
ALTER TABLE sessioni ADD COLUMN rating_sessione smallint CHECK (rating_sessione BETWEEN 1 AND 5);
```
Da chiedere al termine di ogni sessione completata.

### 5.2 Vista materializzata o edge function per aggregati
Per non fare query pesanti ogni volta, una edge function Supabase che aggrega:
- compliance_media per cliente per settimana
- delta_peso settimanale
- streak check-in attuale

Cacheable in una tabella `analytics_snapshot` aggiornata ogni notte (cron job Supabase).

### 5.3 Notifiche push coach
Trigger su mancato check-in > 2 giorni → notifica push al coach.
(Richiede integrazione web push / expo notifications se app mobile)

### 5.4 Export dati
PDF o CSV del piano nutrizionale completo con storico compliance — utile per il cliente da mostrare al medico o nutrizionista.

---

## PRIORITÀ SUGGERITA PER IMPLEMENTAZIONE

1. **Alta priorità / basso sforzo**
   - Heatmap settimanale compliance (solo frontend, dati già disponibili)
   - Pannello alert intelligenti (query aggregata, molto valore per il coach)
   - Confronto HIGH vs LOW carb compliance per cliente

2. **Alta priorità / medio sforzo**
   - Grafico peso vs carbo ciclizzati (dual-axis)
   - Bilancio calorico settimanale con stima deficit

3. **Media priorità / medio sforzo**
   - Rating sessione + correlazione con carbo
   - Distribuzione macro per pasto (donut chart)
   - Proiezione mensile

4. **Lungo termine**
   - Vista materializzata / analytics_snapshot
   - Export PDF piano nutrizionale
   - Notifiche push coach

---

## NOTE ARCHITETTURALI

- Tutti i dati necessari esistono già nel DB (log pasti, checkin con will_train, macro_target con cycling, misurazioni, sessioni)
- Le analytics avanzate possono essere server components (nessun client-side fetch pesante)
- Per i grafici: valutare `recharts` (già comune in ecosistema Next.js) o `chart.js` — entrambi leggeri e server-friendly con RSC
- La heatmap può essere costruita con solo CSS/Tailwind senza librerie aggiuntive


cose ancora da fare:

🔴 CRITICO PRE-LANCIO

Stripe: pagamenti + pricing tiers coach + atleta PRO
Privacy Policy + Terms of Service (GDPR)
Fix layout desktop (grafica PC vs mobile) -> un semplice center su desktop + ridimensionamento per riempire la pagina

🟠 ALTA PRIORITÀ — FEEDBACK COACH

Redesign editor schede su desktop (layout orizzontale su una riga)

🟡 MEDIA PRIORITÀ

Calendario check-in: vista settimanale coach con check-in clienti
Esportazione scheda in PDF lato coach
Dieta replicabile: suggerisci pasti da giornate precedenti
Share card fine allenamento: highlights timer (es. "Planche 36s") + nome coach
Chat allegati: scheda o sessione come card interattiva
Progressione coach-driven: sceglie direzione post-sessione cliente
Highlights check-in imminente nella lista clienti


🔵 SPRINT 6 — TIPI SCHEDA AVANZATI

EMOM / AMRAP / FOR TIME / TABATA con timer globale dedicato
Logger modulare per tipo scheda (calisthenics, powerlifting, functional)


🗄️ BACKLOG

Tips allenamento/dieta per atleta PRO (AI)
Suggerimenti scheda AI da storico cliente (fixare problemi su grafico volume in quanto ad oggi non e' proporzionato)
White-label per palestre (piano Enterprise)
Video upload esercizi
Notifiche email via Resend
Push PWA timer recupero tra le serie


⚙️ TECH DEBT

analytics/page.tsx ~800 righe — candidato split prf
cliente/allenamento/page.tsx ~1100 righe — candidato split prf
BynariLoader: sostituire tutti i "Caricamento…" testuali nell'app
SWR / React Query — cache e deduplicazione richieste
loading.tsx mancanti in varie route