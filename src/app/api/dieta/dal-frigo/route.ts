import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { solveMeal, checkFridgeAlerts, FoodItem, MacroTarget } from '@/lib/dieta/solver'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const clienteId: string = body.clienteId ?? user.id
  const foodIds: string[] = body.foodIds ?? []

  if (foodIds.length === 0) {
    return NextResponse.json({ error: 'Nessun alimento selezionato' }, { status: 400 })
  }

  // 1. Macro target giornaliero
  const { data: targetRow } = await supabase
    .from('macro_target')
    .select('calorie, proteine_g, carboidrati_g, grassi_g')
    .eq('cliente_id', clienteId)
    .maybeSingle()

  if (!targetRow) return NextResponse.json({ error: 'Nessun piano nutrizionale impostato' }, { status: 400 })

  const dailyTarget: MacroTarget = {
    kcal:      targetRow.calorie,
    protein_g: targetRow.proteine_g,
    carbs_g:   targetRow.carboidrati_g,
    fat_g:     targetRow.grassi_g,
  }

  // 2. Recupera i dati nutrizionali degli alimenti selezionati
  const { data: foods } = await supabase
    .from('alimenti')
    .select('id, product_name, brands, pnns_groups_1, energy_kcal_100g, proteins_100g, carbs_100g, fat_100g, fiber_100g, meal_slots')
    .in('id', foodIds)

  const selectedFoods = (foods ?? []) as FoodItem[]

  // 3. Alert macro mancanti
  const alerts = checkFridgeAlerts(selectedFoods, dailyTarget)

  // 4. Calcola porzioni per l'intera giornata (un unico "pasto" = giornata)
  const result = solveMeal(selectedFoods, dailyTarget, 'Giornata')

  return NextResponse.json({
    portions: result.portions,
    achieved: result.achieved,
    target:   dailyTarget,
    alerts,
    kcal_error_pct: result.kcal_error_pct,
  })
}
