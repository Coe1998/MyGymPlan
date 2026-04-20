# Dieta Intelligente — Contesto e stato avanzamento

## Dove siamo

Feature "Dieta Intelligente" integrata nella pagina `/cliente/dieta`.
Il grosso funziona, mancano ancora aggiustamenti al solver.

---

## Architettura implementata

### DB
- Tabella `alimenti` in Supabase (~44.448 record da OpenFoodFacts, già importati)
- Colonne chiave: `product_name, brands, pnns_groups_1, energy_kcal_100g, proteins_100g, carbs_100g, fat_100g, fiber_100g, meal_slots`
- `meal_slots`: stringa CSV (`"colazione,spuntino"`) calcolata durante import
- Migration: `supabase/migrations/003_alimenti.sql`
- Import script: `C:\Users\a\Desktop\csv\import_alimenti_supabase.py`

### File principali
| File | Ruolo |
|---|---|
| `src/lib/dieta/solver.ts` | Algoritmo greedy (v3) |
| `src/app/api/dieta/genera-piano/route.ts` | API: genera piano giornaliero |
| `src/app/api/dieta/dal-frigo/route.ts` | API: porzioni da lista ingredienti |
| `src/app/api/dieta/cerca-alimenti/route.ts` | API: autocomplete ricerca alimenti |
| `src/components/cliente/DietaIntelligente.tsx` | UI con i 2 bottoni |

La UI è inserita in `src/app/(cliente)/cliente/dieta/page.tsx` subito dopo le barre macro.

---

## Come funziona il solver (v3)

1. Per ogni pasto (da `pasti_config` del coach) calcola il target macro proporzionale
2. Interroga la tabella `alimenti` filtrando per `meal_slots ILIKE '%slot%'`
3. Classifica ogni alimento in categoria: `protein | carb | fat | veggie | fruit | dairy | mixed`
4. Ordine di selezione per pasto:
   - Colazione: `dairy → carb → fruit → protein`
   - Pranzo/Cena: `protein → carb → veggie → fat`
   - Spuntino: `fruit → dairy → mixed`
5. Per ogni categoria sceglie il miglior alimento con **scoring contestuale**
6. Calcola i grammi base per ogni alimento
7. **Calibration pass**: scala tutte le porzioni per avvicinarsi al target kcal
8. Accumula `usedIds` tra i pasti → pranzo e cena usano alimenti diversi

---

## Problemi risolti ✅

- [x] Grana Padano a colazione (penalizzato con score −25)
- [x] Formaggi stagionati a colazione (stesso fix)
- [x] Frutta secca (albicocche secche) — penalizzata se carbs > 50
- [x] Spaghetti con 0 kcal — filtro `energy_kcal_100g > 5` in query
- [x] Pranzo = Cena identici — `usedIds` accumulati tra pasti
- [x] Porzioni esplose (250g tonno) — frazione fissa del target, non residuo

---

## Problemi ancora aperti / da migliorare 🔧

### 1. Kcal scarto ancora alto (~30%)
Il calibration pass migliora ma non basta quando la selezione greedy parte male.
**Idea**: dopo il calibration pass, fare un secondo giro per rimuovere il food
che contribuisce meno e aggiungerne uno che copre il gap rimanente.

### 2. Qualità food per colazione
Anche con lo scoring, a volte escono alimenti non adatti.
**Idea**: aggiungere un filtro hard per colazione — ad esempio escludere
pnns_groups_1 IN ('Fish Meat Eggs', 'Fat and sauces') dalla query.
Attenzione: nel DB il case è Title Case (`'Fish Meat Eggs'`), non lowercase.

**Valori PNNS reali nel DB** (da verificare con: `SELECT DISTINCT pnns_groups_1 FROM alimenti`):
- `Cereals and potatoes`
- `Milk and dairy products`
- `Fish Meat Eggs`
- `Fruits and vegetables`
- `Fat and sauces`
- `Beverages`
- `unknown`

### 3. Macro scarto (proteine/carb/grassi)
Il calibration kcal scala tutto uniformemente ma i macro si sbilanciamo.
**Idea**: dopo il calibration, aggiustare le singole porzioni per macro:
es. se la proteina è al 40% del target, aumenta solo la porzione proteica.

### 4. Meal slot "spuntino" poco popolato
La query per spuntino restituisce pochi alimenti perché nel DB molti
alimenti adatti non hanno "spuntino" nel meal_slot.
**Idea**: se la query restituisce < 20 risultati, fare fallback a un secondo
slot (es. "colazione" per spuntino mattina).

### 5. Frutto in pranzo/cena
A volte escono frutta o yogurt nel pranzo.
**Fix rapido**: nella query pranzo/cena escludere pnns = 'Fruits and vegetables'
oppure escludere nel solver i `FoodCategory === 'fruit'` dall'ordine pranzo/cena.

---

## Prossimi step suggeriti

1. **Eseguire** `SELECT DISTINCT pnns_groups_1 FROM alimenti` su Supabase per vedere tutti i valori reali
2. **Aggiungere filtro PNNS** nella query API usando i valori corretti (Title Case)
3. **Migliorare calibration**: iterazione multi-step invece di un unico fattore di scala
4. **Testing**: provare con diversi piani macro (es. 1800 kcal, 2500 kcal, alto carb, alto proteico)

---

## Note tecniche

- Il solver è in **TypeScript puro**, nessuna dipendenza esterna
- L'algoritmo Python originale (PuLP) è in `C:\Users\a\Desktop\csv\reverse_nutrition_engine\` — non è integrato, ma può servire come riferimento per la logica
- La tabella `alimenti` ha RLS disabilitata (`DISABLE ROW LEVEL SECURITY`) per l'import; va riabilitata dopo con policy SELECT per authenticated
- CSV pulito originale: `C:\Users\a\Desktop\csv\alimenti_sani.csv` (44.448 righe, 10.7 MB)
