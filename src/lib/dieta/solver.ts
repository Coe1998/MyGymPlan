/**
 * Greedy nutritional solver — v2
 * Ogni alimento copre una FRAZIONE fissa del target del pasto
 * (non il residuo cumulativo, che causava porzioni esplose).
 */

export interface FoodItem {
  id: string
  product_name: string
  brands?: string | null
  pnns_groups_1?: string | null
  energy_kcal_100g: number
  proteins_100g: number
  carbs_100g: number
  fat_100g: number
  fiber_100g?: number | null
  meal_slots: string
}

export interface MacroTarget {
  kcal: number
  protein_g: number
  carbs_g: number
  fat_g: number
}

export interface Portion {
  food: FoodItem
  grams: number
  kcal: number
  protein_g: number
  carbs_g: number
  fat_g: number
}

export interface MealResult {
  meal_name: string
  target: MacroTarget
  portions: Portion[]
  achieved: MacroTarget
  kcal_error_pct: number
  alerts: string[]
}

export interface MacroAlert {
  type: 'missing_protein' | 'missing_carb' | 'missing_fat' | 'missing_veggie' | 'excess_kcal' | 'deficit_kcal'
  message: string
}

// ── Classificazione ──────────────────────────────────────────────────────────

type FoodCategory = 'protein' | 'carb' | 'fat' | 'veggie' | 'fruit' | 'dairy' | 'mixed'

export function classifyFood(f: FoodItem): FoodCategory {
  const prot  = f.proteins_100g   ?? 0
  const carbs = f.carbs_100g      ?? 0
  const fat   = f.fat_100g        ?? 0
  const kcal  = f.energy_kcal_100g ?? 1
  const fiber = f.fiber_100g      ?? 0
  const pnns  = (f.pnns_groups_1  ?? '').toLowerCase()
  const name  = f.product_name.toLowerCase()

  // Latticini
  if (pnns.includes('milk') || pnns.includes('dairy') ||
      name.includes('yogurt') || name.includes('latte') || name.includes('ricotta') ||
      name.includes('kefir')  || name.includes('skyr')  || name.includes('fiocchi di latte')) {
    return 'dairy'
  }

  // Grassi da cucina
  if (pnns.includes('fat') || name.includes('olio') || name.includes('oil') ||
      name.includes('burro') || name.includes('butter') || name.includes('ghee')) {
    return 'fat'
  }

  // Verdure (fresca, bassa kcal)
  if (kcal < 55 && fiber >= 0.8 && carbs < 12 && prot < 6) return 'veggie'

  // Frutta fresca (bassa kcal, alta acqua)
  if (kcal < 80 && carbs >= 5 && fat < 1 && prot < 3 &&
      (pnns.includes('fruit') || pnns.includes('vegetable'))) return 'fruit'

  // Proteine animali/vegetali (soglia 10g per catturare pesce, uova, legumi)
  if (prot >= 10 && prot / kcal >= 0.06) return 'protein'

  // Carboidrati complessi
  if (carbs >= 30 && prot < 15 && fat < 10) return 'carb'

  // Grassi alti
  if (fat >= 20 && prot < 10) return 'fat'

  return 'mixed'
}

// ── Porzioni: ogni categoria copre una % fissa del target ────────────────────

const FRACTIONS: Record<FoodCategory, Partial<Record<keyof MacroTarget, number>>> = {
  protein: { protein_g: 0.65 },   // proteina copre 65% del target proteico
  dairy:   { protein_g: 0.35 },   // latticino copre 35%
  carb:    { carbs_g:   0.70 },   // carboidrato copre 70% dei carbs
  fat:     { fat_100g:  0.55 },   // grasso copre 55% dei grassi
  veggie:  {},                     // porzione fissa
  fruit:   {},                     // porzione fissa
  mixed:   { kcal:      0.20 },   // mixed: 20% delle kcal
}

const PORTIONS: Record<FoodCategory, [number, number]> = {
  protein: [80,  180],
  dairy:   [100, 250],
  carb:    [50,  130],
  fat:     [5,   25],
  veggie:  [100, 250],
  fruit:   [100, 180],
  mixed:   [60,  150],
}

function portion(food: FoodItem, grams: number): Portion {
  const f = grams / 100
  return {
    food,
    grams,
    kcal:      Math.round(food.energy_kcal_100g * f),
    protein_g: Math.round(food.proteins_100g    * f * 10) / 10,
    carbs_g:   Math.round(food.carbs_100g       * f * 10) / 10,
    fat_g:     Math.round(food.fat_100g         * f * 10) / 10,
  }
}

function calcGrams(food: FoodItem, cat: FoodCategory, target: MacroTarget): number {
  const [minG, maxG] = PORTIONS[cat]
  const frac = FRACTIONS[cat]
  let grams = 100

  if (cat === 'protein' && food.proteins_100g > 0 && frac.protein_g) {
    grams = Math.round((target.protein_g * frac.protein_g / food.proteins_100g) * 100)
  } else if (cat === 'dairy') {
    if (food.proteins_100g > 4 && frac.protein_g) {
      grams = Math.round((target.protein_g * frac.protein_g / food.proteins_100g) * 100)
    } else if (food.energy_kcal_100g > 0) {
      grams = Math.round((target.kcal * 0.15 / food.energy_kcal_100g) * 100)
    }
  } else if (cat === 'carb' && food.carbs_100g > 0 && frac.carbs_g) {
    grams = Math.round((target.carbs_g * frac.carbs_g / food.carbs_100g) * 100)
  } else if (cat === 'fat' && food.fat_100g > 0) {
    // per i grassi usiamo le kcal: fat copre il 15% delle kcal del pasto
    grams = Math.round((target.kcal * 0.12 / food.energy_kcal_100g) * 100)
  } else if (cat === 'veggie') {
    grams = 150
  } else if (cat === 'fruit') {
    grams = 130
  } else if (food.energy_kcal_100g > 0 && frac.kcal) {
    grams = Math.round((target.kcal * frac.kcal / food.energy_kcal_100g) * 100)
  }

  return Math.max(minG, Math.min(maxG, grams))
}

// ── Selezione migliori candidati per categoria ───────────────────────────────

function bestInCategory(
  foods: FoodItem[],
  cat: FoodCategory,
  usedIds: Set<string>,
): FoodItem | null {
  const candidates = foods.filter(f => classifyFood(f) === cat && !usedIds.has(f.id))
  if (!candidates.length) return null

  switch (cat) {
    case 'protein':
      return candidates.sort((a, b) =>
        (b.proteins_100g / (b.energy_kcal_100g || 1)) - (a.proteins_100g / (a.energy_kcal_100g || 1))
      )[0]
    case 'dairy':
      return candidates.sort((a, b) => b.proteins_100g - a.proteins_100g)[0]
    case 'carb':
      // preferisci carboidrati complessi (alto amido, basso zucchero)
      return candidates.sort((a, b) =>
        (b.carbs_100g / (b.energy_kcal_100g || 1)) - (a.carbs_100g / (a.energy_kcal_100g || 1))
      )[0]
    case 'fat':
      return candidates.sort((a, b) => b.fat_100g - a.fat_100g)[0]
    case 'veggie':
    case 'fruit':
      // aggiungi varietà: non sempre la stessa verdura/frutta
      return candidates[Math.floor(Math.random() * Math.min(candidates.length, 8))]
    default:
      return candidates[0]
  }
}

// ── Ordine di selezione per tipo pasto ────────────────────────────────────────

const MEAL_ORDER: Record<string, FoodCategory[]> = {
  colazione:  ['dairy', 'carb', 'fruit', 'protein'],
  spuntino:   ['fruit', 'dairy', 'mixed'],
  pranzo:     ['protein', 'carb', 'veggie', 'fat'],
  cena:       ['protein', 'carb', 'veggie', 'fat'],
}

// ── Solver principale ────────────────────────────────────────────────────────

export function solveMeal(
  foods: FoodItem[],
  target: MacroTarget,
  mealName: string,
  usedIds: Set<string> = new Set(),
): MealResult {
  const mealType = mealName.toLowerCase().includes('colazione') ? 'colazione'
    : mealName.toLowerCase().includes('spuntino') || mealName.toLowerCase().includes('merenda') ? 'spuntino'
    : mealName.toLowerCase().includes('pranzo') ? 'pranzo'
    : 'cena'

  const order = MEAL_ORDER[mealType] ?? MEAL_ORDER['pranzo']

  const portions: Portion[] = []
  const localUsed = new Set(usedIds)

  for (const cat of order) {
    if (portions.length >= 4) break
    const food = bestInCategory(foods, cat, localUsed)
    if (!food) continue
    const grams = calcGrams(food, cat, target)
    portions.push(portion(food, grams))
    localUsed.add(food.id)
  }

  // Se il pasto ha troppo poco (es. colazione senza carboidrati), aggiungi un mixed
  if (portions.length < 2) {
    const fallback = foods.find(f => !localUsed.has(f.id))
    if (fallback) {
      const grams = Math.max(80, Math.min(150, Math.round((target.kcal * 0.25 / (fallback.energy_kcal_100g || 100)) * 100)))
      portions.push(portion(fallback, grams))
    }
  }

  const achieved: MacroTarget = portions.reduce(
    (acc, p) => ({
      kcal:      acc.kcal      + p.kcal,
      protein_g: acc.protein_g + p.protein_g,
      carbs_g:   acc.carbs_g   + p.carbs_g,
      fat_g:     acc.fat_g     + p.fat_g,
    }),
    { kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0 }
  )

  const kcalErrorPct = target.kcal > 0
    ? Math.round(Math.abs(achieved.kcal - target.kcal) / target.kcal * 100)
    : 0

  return { meal_name: mealName, target, portions, achieved, kcal_error_pct: kcalErrorPct, alerts: [] }
}

// ── Alert per il frigo ────────────────────────────────────────────────────────

export function solveFridge(
  foods: FoodItem[],
  target: MacroTarget,
): { portions: Portion[]; achieved: MacroTarget; alerts: MacroAlert[] } {
  const alerts: MacroAlert[] = []
  const cats = new Set(foods.map(classifyFood))

  if (!cats.has('protein') && !cats.has('dairy') && target.protein_g > 20)
    alerts.push({ type: 'missing_protein', message: 'Nessuna fonte proteica — aggiungi carne, pesce, uova o latticini.' })
  if (!cats.has('carb') && target.carbs_g > 30)
    alerts.push({ type: 'missing_carb', message: 'Nessuna fonte di carboidrati — aggiungi pasta, riso, pane o patate.' })
  if (!cats.has('fat') && target.fat_g > 10)
    alerts.push({ type: 'missing_fat', message: 'Nessuna fonte di grassi — aggiungi olio, frutta secca o avocado.' })

  // Calcola porzioni per tutti gli alimenti disponibili
  const portions: Portion[] = foods.map(f => {
    const cat = classifyFood(f)
    const grams = calcGrams(f, cat, target)
    return portion(f, grams)
  })

  const achieved: MacroTarget = portions.reduce(
    (acc, p) => ({
      kcal:      acc.kcal      + p.kcal,
      protein_g: acc.protein_g + p.protein_g,
      carbs_g:   acc.carbs_g   + p.carbs_g,
      fat_g:     acc.fat_g     + p.fat_g,
    }),
    { kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0 }
  )

  return { portions, achieved, alerts }
}

// backward compat
export function checkFridgeAlerts(foods: FoodItem[], target: MacroTarget): MacroAlert[] {
  return solveFridge(foods, target).alerts
}
