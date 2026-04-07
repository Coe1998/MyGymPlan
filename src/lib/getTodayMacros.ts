import { createClient } from '@/lib/supabase/server'

export interface TodayMacros {
  // Macro base coach
  calorie: number
  proteine_g: number
  carboidrati_g_base: number // carboidrati standard (invariati)
  grassi_g: number
  // Carb cycling
  carb_cycling_enabled: boolean
  carbs_training: number | null
  carbs_rest: number | null
  // Carbo effettivi oggi (già ciclizzati se abilitato)
  carboidrati_g: number
  // Check-in
  checkin_done: boolean
  will_train: boolean | null
  day_type: 'training' | 'rest' | null
}

export async function getTodayMacros(clienteId: string): Promise<TodayMacros | null> {
  const supabase = await createClient()

  const oggi = new Date()
  oggi.setHours(0, 0, 0, 0)

  const [targetRes, checkinRes] = await Promise.all([
    supabase
      .from('macro_target')
      .select('calorie, proteine_g, carboidrati_g, grassi_g, carb_cycling_enabled, carbs_training, carbs_rest')
      .eq('cliente_id', clienteId)
      .maybeSingle(),
    supabase
      .from('checkin')
      .select('will_train')
      .eq('cliente_id', clienteId)
      .gte('data', oggi.toISOString())
      .maybeSingle(),
  ])

  const target = targetRes.data
  if (!target) return null

  const checkin = checkinRes.data
  const checkin_done = !!checkin
  const will_train = checkin?.will_train ?? null
  const day_type: 'training' | 'rest' | null = checkin_done
    ? (will_train ? 'training' : 'rest')
    : null

  const carbCyclingOn = target.carb_cycling_enabled ?? false
  let carboidrati_g = target.carboidrati_g

  if (carbCyclingOn && day_type !== null) {
    if (day_type === 'training' && target.carbs_training != null) {
      carboidrati_g = target.carbs_training
    } else if (day_type === 'rest' && target.carbs_rest != null) {
      carboidrati_g = target.carbs_rest
    }
    // Se i campi carb cycling non sono compilati → fallback ai carbo base
  }

  return {
    calorie: target.calorie,
    proteine_g: target.proteine_g,
    carboidrati_g_base: target.carboidrati_g,
    grassi_g: target.grassi_g,
    carb_cycling_enabled: carbCyclingOn,
    carbs_training: target.carbs_training ?? null,
    carbs_rest: target.carbs_rest ?? null,
    carboidrati_g,
    checkin_done,
    will_train,
    day_type,
  }
}
