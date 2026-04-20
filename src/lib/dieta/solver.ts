/**
 * Greedy nutritional solver — v3
 * - Selezione food con scoring contestuale (colazione preferisce yogurt, non grana padano)
 * - Calibration pass: scala le porzioni per avvicinarsi al target kcal
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

type FoodCategory = 'protein' | 'carb' | 'fat' | 'veggie' | 'fruit' | 'dairy' | 'mixed'
type MealType = 'colazione' | 'spuntino' | 'pranzo' | 'cena'

// ── Classificazione ──────────────────────────────────────────────────────────

export function classifyFood(f: FoodItem): FoodCategory {
  const prot  = f.proteins_100g    ?? 0
  const carbs = f.carbs_100g       ?? 0
  const fat   = f.fat_100g         ?? 0
  const kcal  = f.energy_kcal_100g ?? 1
  const fiber = f.fiber_100g       ?? 0
  const pnns  = (f.pnns_groups_1   ?? '').toLowerCase()
  const name  = f.product_name.toLowerCase()

  // Latticini liquidi/freschi
  if (pnns.includes('milk') || pnns.includes('dairy') ||
      name.includes('yogurt') || name.includes('latte') || name.includes('ricotta') ||
      name.includes('kefir')  || name.includes('skyr')  || name.includes('fiocchi di latte') ||
      name.includes('quark')) {
    return 'dairy'
  }
  // Oli e grassi
  if (pnns.includes('fat') || name.includes('olio') || name.includes(' oil') ||
      name.includes('burro') || name.includes('butter') || name.includes('ghee') ||
      name.includes('margarina')) {
    return 'fat'
  }
  // Verdure fresche (bassa kcal)
  if (kcal < 55 && fiber >= 0.8 && carbs < 12 && prot < 6) return 'veggie'
  // Frutta fresca
  if (kcal < 80 && carbs >= 5 && fat < 2 && prot < 4 &&
      (pnns.includes('fruit') || pnns.includes('vegetable'))) return 'fruit'
  // Proteine (soglia abbassata a 10g per catturare uova, pesce, legumi)
  if (prot >= 10 && prot / kcal >= 0.05) return 'protein'
  // Carboidrati complessi
  if (carbs >= 30 && prot < 15 && fat < 10) return 'carb'
  // Grassi alti
  if (fat >= 20 && prot < 10) return 'fat'
  return 'mixed'
}

// ── Limiti porzione per categoria ────────────────────────────────────────────

const PORTIONS: Record<FoodCategory, [number, number]> = {
  protein: [80,  180],
  dairy:   [80,  250],
  carb:    [50,  120],
  fat:     [5,   20],
  veggie:  [100, 200],
  fruit:   [100, 180],
  mixed:   [60,  150],
}

// ── Grams base (prima del calibration pass) ───────────────────────────────────

function calcBaseGrams(food: FoodItem, cat: FoodCategory, target: MacroTarget): number {
  const [minG, maxG] = PORTIONS[cat]
  let grams = 100

  if ((cat === 'protein') && food.proteins_100g > 0) {
    // copre il 60% del target proteico del pasto
    grams = Math.round((target.protein_g * 0.60 / food.proteins_100g) * 100)
  } else if (cat === 'dairy' && food.proteins_100g > 2) {
    // copre il 30% del target proteico
    grams = Math.round((target.protein_g * 0.30 / food.proteins_100g) * 100)
  } else if (cat === 'carb' && food.carbs_100g > 0) {
    // copre il 65% dei carb target
    grams = Math.round((target.carbs_g * 0.65 / food.carbs_100g) * 100)
  } else if (cat === 'fat' && food.energy_kcal_100g > 0) {
    // copre il 10% delle kcal del pasto
    grams = Math.round((target.kcal * 0.10 / food.energy_kcal_100g) * 100)
  } else if (cat === 'veggie') {
    grams = 150
  } else if (cat === 'fruit') {
    grams = 130
  } else if (food.energy_kcal_100g > 0) {
    grams = Math.round((target.kcal * 0.20 / food.energy_kcal_100g) * 100)
  }

  return Math.max(minG, Math.min(maxG, grams))
}

function makePortion(food: FoodItem, grams: number): Portion {
  const f = grams / 100
  return {
    food, grams,
    kcal:      Math.round(food.energy_kcal_100g * f),
    protein_g: Math.round(food.proteins_100g    * f * 10) / 10,
    carbs_g:   Math.round(food.carbs_100g       * f * 10) / 10,
    fat_g:     Math.round(food.fat_100g         * f * 10) / 10,
  }
}

function sumMacros(portions: Portion[]): MacroTarget {
  return portions.reduce(
    (acc, p) => ({ kcal: acc.kcal + p.kcal, protein_g: acc.protein_g + p.protein_g, carbs_g: acc.carbs_g + p.carbs_g, fat_g: acc.fat_g + p.fat_g }),
    { kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0 }
  )
}

// ── Scoring per selezione contestuale ────────────────────────────────────────

function scoreFood(f: FoodItem, cat: FoodCategory, mealType: MealType): number {
  const name = f.product_name.toLowerCase()
  let score = 0

  if (cat === 'dairy') {
    if (mealType === 'colazione' || mealType === 'spuntino') {
      // Preferisci yogurt/kefir/ricotta
      if (name.includes('yogurt') || name.includes('skyr') || name.includes('kefir') ||
          name.includes('ricotta') || name.includes('fiocchi') || name.includes('quark')) score += 20
      // Penalizza formaggi stagionati a colazione
      if (name.includes('grana') || name.includes('parmigian') || name.includes('pecorino') ||
          name.includes('gorgonzola') || name.includes('asiago') || name.includes('emmental') ||
          name.includes('gouda') || name.includes('cheddar') || name.includes('brie') ||
          name.includes('formaggio') || f.fat_100g > 20) score -= 25
    }
  }

  if (cat === 'fruit') {
    // Penalizza frutta secca/disidratata
    if (name.includes('secca') || name.includes('secco') || name.includes('dried') ||
        name.includes('disidrat') || name.includes('candita') || (f.carbs_100g ?? 0) > 50) score -= 20
    // Preferisci frutta fresca
    if ((f.carbs_100g ?? 0) < 20 && (f.energy_kcal_100g ?? 0) < 70) score += 10
  }

  if (cat === 'protein') {
    if (mealType === 'pranzo' || mealType === 'cena') {
      // Preferisci proteine lean (pollo, pesce, uova)
      if (name.includes('petto') || name.includes('filetto') || name.includes('breast') ||
          name.includes('tonno') || name.includes('salmone') || name.includes('merluzzo') ||
          name.includes('albume') || name.includes('uova') || name.includes('egg')) score += 10
      // Penalizza processed meat
      if (name.includes('wurstel') || name.includes('impanato') || name.includes('nugget') ||
          name.includes('salami') || name.includes('mortadella')) score -= 15
    }
  }

  if (cat === 'carb') {
    // Preferisci carb con buon profilo nutrizionale
    if (name.includes('integrale') || name.includes('whole') || name.includes('avena') ||
        name.includes('quinoa') || name.includes('farro')) score += 5
    // Penalizza carb industriali per colazione
    if (mealType === 'colazione' && (name.includes('corn flake') || name.includes('cereali') ||
        name.includes('muesli'))) score += 8
  }

  return score
}

// ── Selezione migliore per categoria ─────────────────────────────────────────

function pickBest(
  foods: FoodItem[],
  cat: FoodCategory,
  mealType: MealType,
  usedIds: Set<string>,
): FoodItem | null {
  const candidates = foods.filter(f =>
    classifyFood(f) === cat &&
    !usedIds.has(f.id) &&
    (f.energy_kcal_100g ?? 0) > 5  // esclude dati sporchi
  )
  if (!candidates.length) return null

  // Score base per categoria + score contestuale
  return candidates
    .map(f => ({ f, s: scoreFood(f, cat, mealType) + baseScore(f, cat) }))
    .sort((a, b) => b.s - a.s)
    // Aggiunge un po' di varietà: scegli randomicamente tra i top-5
    .slice(0, 5)
    [Math.floor(Math.random() * Math.min(candidates.length, 5))]
    .f
}

function baseScore(f: FoodItem, cat: FoodCategory): number {
  switch (cat) {
    case 'protein': return f.proteins_100g / (f.energy_kcal_100g || 1) * 100
    case 'dairy':   return f.proteins_100g
    case 'carb':    return f.carbs_100g / (f.energy_kcal_100g || 1) * 100
    case 'fat':     return -(f.energy_kcal_100g || 0) // preferisci grassi meno calorici
    default:        return 0
  }
}

// ── Ordine categorie per pasto ────────────────────────────────────────────────

const MEAL_ORDER: Record<MealType, FoodCategory[]> = {
  colazione: ['dairy', 'carb', 'fruit', 'protein'],
  spuntino:  ['fruit', 'dairy', 'mixed'],
  pranzo:    ['protein', 'carb', 'veggie', 'fat'],
  cena:      ['protein', 'carb', 'veggie', 'fat'],
}

// ── Solver principale ────────────────────────────────────────────────────────

export function solveMeal(
  foods: FoodItem[],
  target: MacroTarget,
  mealName: string,
  usedIds: Set<string> = new Set(),
): MealResult {
  const mealType: MealType = mealName.toLowerCase().includes('colazione') ? 'colazione'
    : mealName.toLowerCase().includes('spuntino') || mealName.toLowerCase().includes('merenda') ? 'spuntino'
    : mealName.toLowerCase().includes('pranzo') ? 'pranzo' : 'cena'

  const order = MEAL_ORDER[mealType]
  const localUsed = new Set(usedIds)
  let portions: Portion[] = []

  // 1. Selezione greedy
  for (const cat of order) {
    if (portions.length >= 4) break
    const food = pickBest(foods, cat, mealType, localUsed)
    if (!food) continue
    const grams = calcBaseGrams(food, cat, target)
    portions.push(makePortion(food, grams))
    localUsed.add(food.id)
  }

  // Fallback se pasto vuoto
  if (portions.length === 0) {
    const fallback = foods.find(f => !localUsed.has(f.id) && (f.energy_kcal_100g ?? 0) > 20)
    if (fallback) portions.push(makePortion(fallback, 100))
  }

  // 2. Calibration pass: scala le porzioni per avvicinarsi al target kcal
  if (portions.length > 0) {
    const totalKcal = sumMacros(portions).kcal
    if (totalKcal > 0 && target.kcal > 0) {
      const scale = target.kcal / totalKcal
      // Applica solo se lo scarto è > 15%
      if (Math.abs(scale - 1) > 0.15) {
        const clampedScale = Math.max(0.4, Math.min(2.0, scale))
        portions = portions.map(p => {
          const [minG, maxG] = PORTIONS[classifyFood(p.food)]
          const newGrams = Math.max(minG, Math.min(maxG, Math.round(p.grams * clampedScale)))
          return makePortion(p.food, newGrams)
        })
      }
    }
  }

  const achieved = sumMacros(portions)
  const kcalErrorPct = target.kcal > 0
    ? Math.round(Math.abs(achieved.kcal - target.kcal) / target.kcal * 100)
    : 0

  return { meal_name: mealName, target, portions, achieved, kcal_error_pct: kcalErrorPct, alerts: [] }
}

// ── Dal frigo ─────────────────────────────────────────────────────────────────

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

  let portions: Portion[] = foods.map(f => {
    const cat = classifyFood(f)
    const grams = calcBaseGrams(f, cat, target)
    return makePortion(f, grams)
  })

  // Calibration
  const total = sumMacros(portions).kcal
  if (total > 0 && target.kcal > 0 && Math.abs(total - target.kcal) / target.kcal > 0.15) {
    const scale = Math.max(0.4, Math.min(2.0, target.kcal / total))
    portions = portions.map(p => {
      const [minG, maxG] = PORTIONS[classifyFood(p.food)]
      return makePortion(p.food, Math.max(minG, Math.min(maxG, Math.round(p.grams * scale))))
    })
  }

  return { portions, achieved: sumMacros(portions), alerts }
}

export function checkFridgeAlerts(foods: FoodItem[], target: MacroTarget): MacroAlert[] {
  return solveFridge(foods, target).alerts
}
