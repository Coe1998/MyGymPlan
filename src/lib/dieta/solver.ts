/**
 * Greedy nutritional solver.
 * Dato un target macro e una lista di alimenti disponibili,
 * calcola le porzioni ottimali per avvicinarsi al target.
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

// ── Classificazione macro-categoria di un alimento ──────────────────────────

type FoodCategory = 'protein' | 'carb' | 'fat' | 'veggie' | 'fruit' | 'dairy' | 'mixed'

function classifyFood(f: FoodItem): FoodCategory {
  const prot  = f.proteins_100g  ?? 0
  const carbs = f.carbs_100g     ?? 0
  const fat   = f.fat_100g       ?? 0
  const kcal  = f.energy_kcal_100g ?? 1
  const fiber = f.fiber_100g     ?? 0
  const pnns  = (f.pnns_groups_1 ?? '').toLowerCase()
  const name  = f.product_name.toLowerCase()

  if (pnns.includes('milk') || pnns.includes('dairy') ||
      name.includes('yogurt') || name.includes('latte') || name.includes('ricotta')) {
    return 'dairy'
  }
  if (pnns.includes('fruit') || pnns.includes('vegetable')) {
    if (kcal < 70 && fiber > 0.5) return (carbs > 10 ? 'fruit' : 'veggie')
  }
  if (fat > 25 && prot < 10) return 'fat'
  if (prot > 15 && prot / kcal > 0.08) return 'protein'
  if (carbs > 35 && prot < 12) return 'carb'
  if (kcal < 55 && fiber > 0.5) return 'veggie'
  return 'mixed'
}

// ── Porzione ottimale per un singolo alimento dato il residuo ────────────────

const PORTIONS: Record<FoodCategory, [number, number]> = {
  protein: [80, 250],
  carb:    [50, 150],
  fat:     [5,  30],
  veggie:  [100, 300],
  fruit:   [100, 200],
  dairy:   [100, 300],
  mixed:   [60,  200],
}

function calcGrams(
  food: FoodItem,
  cat: FoodCategory,
  remaining: MacroTarget,
): number {
  const [minG, maxG] = PORTIONS[cat]
  let grams = 100

  if (cat === 'protein' && food.proteins_100g > 0) {
    grams = Math.round((remaining.protein_g / food.proteins_100g) * 100)
  } else if (cat === 'carb' && food.carbs_100g > 0) {
    grams = Math.round((remaining.carbs_g / food.carbs_100g) * 100)
  } else if (cat === 'fat' && food.fat_100g > 0) {
    grams = Math.round((remaining.fat_g / food.fat_100g) * 100)
  } else if (cat === 'dairy') {
    // Prova prima sul target proteico, poi su kcal
    if (food.proteins_100g > 5) {
      grams = Math.round((remaining.protein_g * 0.4 / food.proteins_100g) * 100)
    } else {
      grams = Math.round((remaining.kcal * 0.25 / food.energy_kcal_100g) * 100)
    }
  } else if (cat === 'veggie') {
    grams = 150
  } else if (cat === 'fruit') {
    grams = 150
  } else {
    // mixed: prova su kcal residue
    if (food.energy_kcal_100g > 0) {
      grams = Math.round((remaining.kcal * 0.35 / food.energy_kcal_100g) * 100)
    }
  }

  return Math.max(minG, Math.min(maxG, grams))
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

// ── Algoritmo principale ─────────────────────────────────────────────────────

/**
 * Genera porzioni ottimali da un set di alimenti disponibili
 * per coprire un target macro.
 * Usato sia da "genera-piano" (foods dal DB) sia da "dal-frigo" (foods scelti).
 */
export function solveMeal(
  foods: FoodItem[],
  target: MacroTarget,
  mealName: string,
): MealResult {
  const alerts: string[] = []

  // Categorizza e raggruppa
  const byCategory = new Map<FoodCategory, FoodItem[]>()
  for (const f of foods) {
    const cat = classifyFood(f)
    if (!byCategory.has(cat)) byCategory.set(cat, [])
    byCategory.get(cat)!.push(f)
  }

  // Score foods within category (best first)
  const best = (cat: FoodCategory): FoodItem | null => {
    const list = byCategory.get(cat)
    if (!list?.length) return null
    if (cat === 'protein') {
      return list.sort((a, b) =>
        b.proteins_100g / (b.energy_kcal_100g || 1) - a.proteins_100g / (a.energy_kcal_100g || 1)
      )[0]
    }
    if (cat === 'carb') {
      return list.sort((a, b) =>
        b.carbs_100g / (b.energy_kcal_100g || 1) - a.carbs_100g / (a.energy_kcal_100g || 1)
      )[0]
    }
    if (cat === 'fat') {
      return list.sort((a, b) => b.fat_100g - a.fat_100g)[0]
    }
    return list[0]
  }

  // Ordine di selezione: proteina → carboidrato → verdura → grasso → latticino
  const ORDER: FoodCategory[] = ['protein', 'carb', 'veggie', 'fat', 'dairy', 'fruit', 'mixed']
  const selected: { food: FoodItem; cat: FoodCategory }[] = []
  const usedIds = new Set<string>()

  for (const cat of ORDER) {
    const f = best(cat)
    if (f && !usedIds.has(f.id)) {
      selected.push({ food: f, cat })
      usedIds.add(f.id)
      if (selected.length >= 4) break // max 4 alimenti per pasto
    }
  }

  // Se foods passati sono già specificati (dal frigo), usali tutti
  if (foods.length > 0 && foods.length <= 6) {
    selected.length = 0
    for (const f of foods) {
      selected.push({ food: f, cat: classifyFood(f) })
    }
  }

  // Calcola porzioni sequenzialmente
  const portions: Portion[] = []
  const remaining: MacroTarget = { ...target }

  for (const { food, cat } of selected) {
    if (remaining.kcal <= 20) break // target già raggiunto
    const grams = calcGrams(food, cat, remaining)
    const p = portion(food, grams)
    portions.push(p)
    remaining.kcal      = Math.max(0, remaining.kcal      - p.kcal)
    remaining.protein_g = Math.max(0, remaining.protein_g - p.protein_g)
    remaining.carbs_g   = Math.max(0, remaining.carbs_g   - p.carbs_g)
    remaining.fat_g     = Math.max(0, remaining.fat_g     - p.fat_g)
  }

  // Achieved
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

  return { meal_name: mealName, target, portions, achieved, kcal_error_pct: kcalErrorPct, alerts }
}

// ── Alert per il frigo ────────────────────────────────────────────────────────

export function checkFridgeAlerts(foods: FoodItem[], target: MacroTarget): MacroAlert[] {
  const alerts: MacroAlert[] = []
  const cats = foods.map(classifyFood)

  const hasProtein = cats.some(c => c === 'protein' || c === 'dairy')
  const hasCarb    = cats.some(c => c === 'carb')
  const hasFat     = cats.some(c => c === 'fat' || c === 'mixed')

  if (!hasProtein && target.protein_g > 20) {
    alerts.push({ type: 'missing_protein', message: 'Nessuna fonte proteica — aggiungi carne, pesce, uova o latticini.' })
  }
  if (!hasCarb && target.carbs_g > 30) {
    alerts.push({ type: 'missing_carb', message: 'Nessuna fonte di carboidrati — aggiungi pasta, riso, pane o patate.' })
  }
  if (!hasFat && target.fat_g > 10) {
    alerts.push({ type: 'missing_fat', message: 'Nessuna fonte di grassi — aggiungi olio, frutta secca o avocado.' })
  }
  return alerts
}
