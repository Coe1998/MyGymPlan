import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { solveMeal, classifyFood, FoodItem, MacroTarget, MealResult } from '@/lib/dieta/solver'


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
      .not('energy_kcal_100g', 'is', null)
      .not('proteins_100g', 'is', null)
      .not('carbs_100g', 'is', null)
      .not('fat_100g', 'is', null)

    if (usedArr.length > 0) {
      query = query.not('id', 'in', `(${usedArr.map(id => `"${id}"`).join(',')})`)
    }

    let { data: foods } = await query.limit(400)

    let filtered = (foods ?? []) as FoodItem[]

    // Esclude allergie
    if (allergens.length > 0) {
      filtered = filtered.filter(f => {
        const txt = `${f.product_name} ${f.pnns_groups_1 ?? ''}`.toLowerCase()
        return !allergens.some(a => txt.includes(a))
      })
    }

    // Esclude carni processate/fritti per colazione
    if (slot === 'colazione') {
      filtered = filtered.filter(f => {
        const name = f.product_name.toLowerCase()
        return !name.includes('wurstel') && !name.includes('salami') &&
               !name.includes('nugget') && !name.includes('impanato')
      })
    }

    const result = solveMeal(filtered, mealTarget, pasto.nome, usedIds)

    // Aggiunge gli ID usati in questo pasto al set globale
    for (const p of result.portions) usedIds.add(p.food.id)

    results.push(result)
  }

  return NextResponse.json({ piano: results, target: daily })
}
