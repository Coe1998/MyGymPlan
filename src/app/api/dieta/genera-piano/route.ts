import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { solveMeal, FoodItem, MacroTarget, MealResult } from '@/lib/dieta/solver'

const MEAL_SLOT_MAP: Record<string, string> = {
  'colazione':            'colazione',
  'spuntino mattina':     'spuntino',
  'pranzo':               'pranzo',
  'spuntino pomeriggio':  'spuntino',
  'spuntino post-pranzo': 'spuntino',
  'merenda':              'spuntino',
  'cena':                 'cena',
  'spuntino':             'spuntino',
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const clienteId: string = body.clienteId ?? user.id

  // 1. Macro target + pasti_config
  const { data: targetRow } = await supabase
    .from('macro_target')
    .select('calorie, proteine_g, carboidrati_g, grassi_g, pasti_config, carb_cycling_enabled, carbs_training, carbs_rest')
    .eq('cliente_id', clienteId)
    .maybeSingle()

  if (!targetRow) return NextResponse.json({ error: 'Nessun piano nutrizionale impostato' }, { status: 400 })

  // 2. Allergie / intolleranze dall'anamnesi
  const { data: anam } = await supabase
    .from('anamnesi')
    .select('intolleranze')
    .eq('cliente_id', clienteId)
    .maybeSingle()

  const intolleranzeRaw = (anam?.intolleranze ?? '') as string
  const allergens: string[] = intolleranzeRaw
    .toLowerCase()
    .split(/[,;\n]+/)
    .map(s => s.trim())
    .filter(Boolean)

  // 3. Carb cycling: usa carboidrati effettivi se abilitato
  const carbEffettivi = targetRow.carb_cycling_enabled && body.dayType === 'training' && targetRow.carbs_training
    ? targetRow.carbs_training
    : targetRow.carb_cycling_enabled && body.dayType === 'rest' && targetRow.carbs_rest
    ? targetRow.carbs_rest
    : targetRow.carboidrati_g

  const dailyTarget: MacroTarget = {
    kcal:      targetRow.calorie,
    protein_g: targetRow.proteine_g,
    carbs_g:   carbEffettivi,
    fat_g:     targetRow.grassi_g,
  }

  // 4. Struttura pasti
  type PastoConfig = { nome: string; percentuale: number; macro_custom?: boolean; prot_pct?: number; carb_pct?: number; grassi_pct?: number }
  const pastiConfig: PastoConfig[] = targetRow.pasti_config ?? [
    { nome: 'Colazione', percentuale: 25 },
    { nome: 'Pranzo', percentuale: 35 },
    { nome: 'Cena', percentuale: 30 },
    { nome: 'Spuntino', percentuale: 10 },
  ]

  // 5. Per ogni pasto, interroga il DB e risolvi
  const results: MealResult[] = []

  for (const pasto of pastiConfig) {
    const slotKey = pasto.nome.toLowerCase()
    const slot = MEAL_SLOT_MAP[slotKey] ?? 'pranzo'

    const mealTarget: MacroTarget = pasto.macro_custom
      ? {
          kcal:      dailyTarget.kcal      * (pasto.percentuale / 100),
          protein_g: dailyTarget.protein_g * ((pasto.prot_pct    ?? 33) / 100),
          carbs_g:   dailyTarget.carbs_g   * ((pasto.carb_pct    ?? 34) / 100),
          fat_g:     dailyTarget.fat_g     * ((pasto.grassi_pct  ?? 33) / 100),
        }
      : {
          kcal:      dailyTarget.kcal      * pasto.percentuale / 100,
          protein_g: dailyTarget.protein_g * pasto.percentuale / 100,
          carbs_g:   dailyTarget.carbs_g   * pasto.percentuale / 100,
          fat_g:     dailyTarget.fat_g     * pasto.percentuale / 100,
        }

    // Carica alimenti per questo slot
    let q = supabase
      .from('alimenti')
      .select('id, product_name, brands, pnns_groups_1, energy_kcal_100g, proteins_100g, carbs_100g, fat_100g, fiber_100g, meal_slots')
      .ilike('meal_slots', `%${slot}%`)
      .not('energy_kcal_100g', 'is', null)
      .not('proteins_100g', 'is', null)
      .not('carbs_100g', 'is', null)
      .not('fat_100g', 'is', null)
      .limit(300)

    const { data: foods } = await q
    let filtered = (foods ?? []) as FoodItem[]

    // Escludi allergeni
    if (allergens.length > 0) {
      filtered = filtered.filter(f => {
        const text = `${f.product_name} ${f.pnns_groups_1 ?? ''}`.toLowerCase()
        return !allergens.some(a => text.includes(a))
      })
    }

    results.push(solveMeal(filtered, mealTarget, pasto.nome))
  }

  return NextResponse.json({ piano: results, target: dailyTarget })
}
