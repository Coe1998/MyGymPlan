import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { solveMeal, FoodItem, MacroTarget, MealResult } from '@/lib/dieta/solver'

// Condimenti, aromi, additivi e ingredienti tecnici da escludere come portata
const CONDIMENT_KEYWORDS = [
  // Aromatici e condimenti
  'aglio', 'cipolla', 'scalogno', 'porro', 'erba cipollina',
  'peperoncino', 'zenzero', 'curcuma', 'cannella', 'noce moscata',
  'origano', 'basilico', 'rosmarino', 'timo', 'salvia', 'menta',
  'prezzemolo', 'coriandolo', 'aneto', 'dragoncello', 'alloro',
  // Gelificanti e additivi tecnici
  'agar-agar', 'agar agar', 'gelatina', 'pectina', 'carragenina',
  'gomma xantana', 'gomma guar', 'amido di mais', 'amido modificato',
  // Lieviti e agenti lievitanti
  'lievito istantaneo', 'bicarbonato di sodio', 'cremor tartaro',
  // Salumi spalmabili e insaccati molto grassi/piccanti
  'nduja', 'lardo', 'strutto', 'guanciale', 'ciccioli',
  // Oli aromatizzati/infusi — condimenti, non fonte di grassi da piano
  'agrumolio', 'agrumato', 'olio al tartufo', 'olio al peperoncino',
  // Aceti e salse concentrate
  'aceto di', 'salsa di soia', 'worcestershire', 'tabasco',
  // Estratti e aromi
  'estratto di vaniglia', 'aroma naturale', 'aroma artificiale',
  // Sale e spezie pure
  'sale fino', 'sale grosso', 'pepe nero', 'pepe bianco', 'paprika',
]

function isCondimentOrAdditive(productName: string): boolean {
  const lower = productName.toLowerCase()
  return CONDIMENT_KEYWORDS.some(w => lower.includes(w))
}

// Baby food, omogeneizzati e prodotti per bambini — non adatti ad adulti
const BABY_FOOD_KEYWORDS = [
  'plasmon', 'omogeneizzat', 'omogeneizzato', 'homogenized',
  'pastina', 'per l\'infanzia', 'per bambini', 'baby food',
  'gerber', 'hipp', 'mellin', 'nipiol', 'blevit',
]

function isBabyFood(productName: string, brands?: string | null): boolean {
  const txt = `${productName} ${brands ?? ''}`.toLowerCase()
  return BABY_FOOD_KEYWORDS.some(w => txt.includes(w))
}

// Polpe di frutta, succhi, nettari — ok a colazione/spuntino, non a pranzo/cena
const FRUIT_PUREE_KEYWORDS = [
  'polpa di', 'polpa frutta', '100% frutta', '100% polpa',
  'nettare di', 'succo di frutta', 'succo e polpa',
  'frullato di', 'smoothie', 'purea di frutta', 'passata di frutta',
]

function isFruitPuree(productName: string): boolean {
  const lower = productName.toLowerCase()
  return FRUIT_PUREE_KEYWORDS.some(w => lower.includes(w))
}

// Parole distintamente inglesi che non compaiono nei nomi italiani
const ENGLISH_WORDS = [
  // Cotture/stili di ricetta anglosassoni
  'slow cooker', 'slow-cooker', 'air fryer', 'instant pot',
  'meal prep', 'meal plan', 'macro friendly',
  'paleo', 'keto friendly', 'whole30',
  // Piatti anglosassoni
  'butter chicken', 'chicken curry', 'beef stew', 'chicken stew',
  'shepherd\'s pie', 'fish and chips', 'mac and cheese',
  'pulled pork', 'bbq chicken', 'buffalo chicken',
  'overnight oats', 'protein pancake', 'protein bar recipe',
  // Aggettivi culinari inglesi non usati in italiano
  'creamy chicken', 'crispy chicken', 'juicy',
  // Pattern tipici di app MFP / database anglosassoni
  'homemade ', 'generic ', 'custom ',
  // Nomi di frutta/verdura in inglese puro
  'apricots', 'cherries', 'peaches', 'plums', 'blueberries',
  'strawberries', 'raspberries', 'blackberries', 'cranberries',
  'pitted', 'dried apricots', 'dried mango', 'dried cranberr',
  'green beans', 'brussels sprouts', 'bell pepper',
  // Salse e condimenti in inglese
  'sesame sauce', 'sesame oil', 'soy sauce', 'fish sauce',
  'hot sauce', 'bbq sauce', 'ranch dressing', 'caesar dressing',
  'add ', 'serving of',
]

function isEnglishProduct(productName: string, brands?: string | null): boolean {
  const lower = productName.toLowerCase()
  // Nomi che iniziano con # seguiti da numero (es. "#19 Paleo Slow Cooker...")
  if (/^#\d+\s/.test(productName.trim())) return true
  // Brand "unknown" = entry utente da app esterna (MFP, ecc.)
  if ((brands ?? '').toLowerCase().trim() === 'unknown') return true
  return ENGLISH_WORDS.some(w => lower.includes(w))
}

// Parole spagnole distinctive (OpenFoodFacts ha molti prodotti spagnoli)
const SPANISH_WORDS = [
  'alcachofas', 'alcachofa',
  'judías', 'judias verdes',
  'garbanzos', 'lentejas',
  'ternera', 'cerdo asado', 'jamón serrano', 'jamón ibérico',
  'pimientos', 'tomates cherry',
  'espinacas', 'zanahorias', 'guisantes',
  'pollo asado', 'pollo a la',
  'gambas', 'mejillones', 'almejas',
  ' con arroz', ' con patatas',
]

function isSpanishProduct(productName: string): boolean {
  const lower = productName.toLowerCase()
  return SPANISH_WORDS.some(w => lower.includes(w))
}

// Parole distintamente francesi che non compaiono nei nomi italiani/inglesi
const FRENCH_WORDS = [
  'grillées', 'grillée', 'grillés', 'grillé',
  'tranchées', 'tranchée', 'tranches',
  'légumes', 'légume',
  'pulpe', 'poire', 'pomme de terre', 'pommes de terre',
  'haricots', 'épinards', 'courgettes', 'aubergines',
  'lentilles', 'carottes', 'oignons', 'champignons',
  'poulet', 'bœuf', 'porc', 'veau', 'agneau',
  'saumon', 'thon', 'crevettes', 'moules',
  'fromage', 'crème', 'beurre', 'lait entier',
  'sans sucres ajoutés', 'sans gluten',
  ' pour ', ' avec ', ' aux ', ' sur ',
  'morceaux', 'émincé', 'émincée',
  'cuisiné', 'cuisinée', 'cuisinés',
  'nature', // solo se abbinato ad altri segnali, ma "au naturel" è già preso
  'au naturel', 'à l\'huile', 'à la',
]

function isFrenchProduct(productName: string): boolean {
  const lower = productName.toLowerCase()
  return FRENCH_WORDS.some(w => lower.includes(w))
}

const SLOT_MAP: Record<string, string> = {
  'colazione':             'colazione',
  'spuntino mattina':      'spuntino',
  'pranzo':                'pranzo',
  'spuntino pomeriggio':   'spuntino',
  'spuntino post-pranzo':  'spuntino',
  'merenda':               'spuntino',
  'cena':                  'cena',
  'spuntino':              'spuntino',
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const clienteId: string = body.clienteId ?? user.id

  // 1. Target macro
  const { data: targetRow } = await supabase
    .from('macro_target')
    .select('calorie, proteine_g, carboidrati_g, grassi_g, pasti_config, carb_cycling_enabled, carbs_training, carbs_rest')
    .eq('cliente_id', clienteId)
    .maybeSingle()

  if (!targetRow) return NextResponse.json({ error: 'Nessun piano nutrizionale impostato' }, { status: 400 })

  // 2. Allergie
  const { data: anam } = await supabase
    .from('anamnesi')
    .select('intolleranze')
    .eq('cliente_id', clienteId)
    .maybeSingle()

  const allergens: string[] = ((anam?.intolleranze ?? '') as string)
    .toLowerCase().split(/[,;\n]+/).map(s => s.trim()).filter(Boolean)

  // 3. Carb cycling
  const carbEff = targetRow.carb_cycling_enabled && body.dayType === 'training' && targetRow.carbs_training
    ? targetRow.carbs_training
    : targetRow.carb_cycling_enabled && body.dayType === 'rest' && targetRow.carbs_rest
    ? targetRow.carbs_rest
    : targetRow.carboidrati_g

  const daily: MacroTarget = {
    kcal:      targetRow.calorie,
    protein_g: targetRow.proteine_g,
    carbs_g:   carbEff,
    fat_g:     targetRow.grassi_g,
  }

  // 4. Pasti config
  type PastoConfig = { nome: string; percentuale: number; macro_custom?: boolean; prot_pct?: number; carb_pct?: number; grassi_pct?: number }
  const pastiConfig: PastoConfig[] = targetRow.pasti_config ?? [
    { nome: 'Colazione', percentuale: 25 },
    { nome: 'Pranzo',    percentuale: 35 },
    { nome: 'Cena',      percentuale: 30 },
    { nome: 'Spuntino',  percentuale: 10 },
  ]

  // 5. Risolvi ogni pasto — accumula usedIds per varietà
  const results: MealResult[] = []
  const usedIds = new Set<string>()

  for (const pasto of pastiConfig) {
    const slot = SLOT_MAP[pasto.nome.toLowerCase()] ?? 'pranzo'

    const mealTarget: MacroTarget = pasto.macro_custom
      ? {
          kcal:      daily.kcal      * pasto.percentuale / 100,
          protein_g: daily.protein_g * ((pasto.prot_pct   ?? 33) / 100),
          carbs_g:   daily.carbs_g   * ((pasto.carb_pct   ?? 34) / 100),
          fat_g:     daily.fat_g     * ((pasto.grassi_pct ?? 33) / 100),
        }
      : {
          kcal:      daily.kcal      * pasto.percentuale / 100,
          protein_g: daily.protein_g * pasto.percentuale / 100,
          carbs_g:   daily.carbs_g   * pasto.percentuale / 100,
          fat_g:     daily.fat_g     * pasto.percentuale / 100,
        }

    // Query alimenti per slot — senza filtro PNNS (case mismatch), filtriamo dopo
    const usedArr = [...usedIds]
    let query = supabase
      .from('alimenti')
      .select('id, product_name, brands, pnns_groups_1, energy_kcal_100g, proteins_100g, carbs_100g, fat_100g, fiber_100g, meal_slots')
      .ilike('meal_slots', `%${slot}%`)
      .gt('energy_kcal_100g', 5)
      .not('proteins_100g', 'is', null)
      .not('carbs_100g', 'is', null)
      .not('fat_100g', 'is', null)

    if (usedArr.length > 0) {
      query = query.not('id', 'in', `(${usedArr.map(id => `"${id}"`).join(',')})`)
    }

    // Fetch abbondante + shuffle per evitare bias alfabetico
    let { data: foods } = await query.limit(800)
    const shuffled = (foods ?? []).sort(() => Math.random() - 0.5)
    let filtered = shuffled as FoodItem[]

    // Esclude allergie
    if (allergens.length > 0) {
      filtered = filtered.filter(f => {
        const txt = `${f.product_name} ${f.pnns_groups_1 ?? ''}`.toLowerCase()
        return !allergens.some(a => txt.includes(a))
      })
    }

    // Esclude prodotti il cui nome inizia con un numero o con apostrofo dialettale ('a, 'e, 'o, 'u)
    filtered = filtered.filter(f => !/^\d/.test(f.product_name.trim()))
    filtered = filtered.filter(f => !/^[''][aeouAEOU]\s/.test(f.product_name.trim()))

    // Esclude prodotti con nome straniero (OpenFoodFacts è internazionale)
    filtered = filtered.filter(f => !isEnglishProduct(f.product_name, f.brands))
    filtered = filtered.filter(f => !isFrenchProduct(f.product_name))
    filtered = filtered.filter(f => !isSpanishProduct(f.product_name))

    // Esclude condimenti, aromi e additivi tecnici
    filtered = filtered.filter(f => !isCondimentOrAdditive(f.product_name))

    // Esclude baby food e omogeneizzati
    filtered = filtered.filter(f => !isBabyFood(f.product_name, f.brands))

    // Esclude polpe/succhi di frutta da pranzo e cena
    if (slot === 'pranzo' || slot === 'cena') {
      filtered = filtered.filter(f => !isFruitPuree(f.product_name))
    }

    // Esclude formati di pasta da minestrina da pranzo e cena
    if (slot === 'pranzo' || slot === 'cena') {
      filtered = filtered.filter(f => {
        const name = f.product_name.toLowerCase()
        return !name.includes('acini di pepe') && !name.includes('stelline') &&
               !name.includes('ditalini') && !name.includes('pastina') &&
               !name.includes('quadretti') && !name.includes('tempesta')
      })
    }

    // Esclude cereali da colazione (fiocchi, crispies, muesli, granola) da pranzo e cena
    if (slot === 'pranzo' || slot === 'cena') {
      filtered = filtered.filter(f => {
        const name = f.product_name.toLowerCase()
        return !name.includes('crispies') && !name.includes('crispi') &&
               !name.includes('corn flake') && !name.includes('cornflake') &&
               !name.includes('muesli') && !name.includes('müsli') &&
               !name.includes('granola') && !name.includes('frosties') &&
               !name.includes('fiocchi di riso') && !name.includes('fiocchi di mais') &&
               !name.includes('fiocchi di grano') && !name.includes('rice krispies') &&
               !(name.includes('cereali') && (name.includes('cacao') || name.includes('cioccolato') ||
                 name.includes('miele') || name.includes('caramello')))
      })
    }

    // Esclude carni processate, fritti e frutta secca/disidratata per colazione
    if (slot === 'colazione') {
      filtered = filtered.filter(f => {
        const name = f.product_name.toLowerCase()
        return !name.includes('wurstel') && !name.includes('salami') &&
               !name.includes('nugget') && !name.includes('impanato') &&
               !name.includes('secche') && !name.includes('secco') &&
               !name.includes('essiccate') && !name.includes('essicate') &&
               !name.includes('disidratate') && !name.includes('dried')
      })
    }

    const result = solveMeal(filtered, mealTarget, pasto.nome, usedIds)

    // Aggiunge gli ID usati in questo pasto al set globale
    for (const p of result.portions) usedIds.add(p.food.id)

    results.push(result)
  }

  return NextResponse.json({ piano: results, target: daily })
}
