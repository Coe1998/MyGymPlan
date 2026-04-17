import { createClient } from '@/lib/supabase/server'
import { getCurrentCycleDay } from '@/lib/carbCycling'

export interface TodayMacros {
  // Macro base coach
  calorie: number
  proteine_g: number
  carboidrati_g_base: number // carboidrati standard (invariati)
  grassi_g: number
  // Old carb cycling (training/rest)
  carb_cycling_enabled: boolean
  carbs_training: number | null
  carbs_rest: number | null
  // Carbo effettivi oggi (già ciclizzati se abilitato)
  carboidrati_g: number
  // Check-in
  checkin_done: boolean
  will_train: boolean | null
  day_type: 'training' | 'rest' | null
  // New multi-profile carb cycling
  carb_cycling_profile_name: string | null
  carb_cycling_override_active: boolean
}

export async function getTodayMacros(clienteId: string): Promise<TodayMacros | null> {
  const supabase = await createClient()

  const oggi = new Date()
  oggi.setHours(0, 0, 0, 0)
  const todayStr = oggi.toISOString().split('T')[0]

  const [targetRes, checkinRes] = await Promise.all([
    supabase
      .from('macro_target')
      .select('id, calorie, proteine_g, carboidrati_g, grassi_g, carb_cycling_enabled, carbs_training, carbs_rest, carb_cycling_abilitato, carb_cycling_start_date')
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

  let calorie: number = target.calorie
  let proteine_g: number = target.proteine_g
  let carboidrati_g: number = target.carboidrati_g
  let grassi_g: number = target.grassi_g
  let carb_cycling_profile_name: string | null = null
  let carb_cycling_override_active = false

  // ── New multi-profile carb cycling (takes priority over old system) ──
  const newCyclingOn = target.carb_cycling_abilitato ?? false
  if (newCyclingOn && target.carb_cycling_start_date) {
    // 1. Check manual override for today
    const { data: override } = await supabase
      .from('carb_cycling_override')
      .select('profilo_id, carb_cycling_profili(nome, calorie, proteine_g, carboidrati_g, grassi_g)')
      .eq('cliente_id', clienteId)
      .eq('data', todayStr)
      .maybeSingle()

    let activeProfile: { nome: string; calorie: number; proteine_g: number; carboidrati_g: number; grassi_g: number } | null = null

    if (override?.profilo_id) {
      carb_cycling_override_active = true
      activeProfile = (override as any).carb_cycling_profili ?? null
    } else {
      // 2. Calculate cycle day and fetch assigned profile
      const cycleDay = getCurrentCycleDay(target.carb_cycling_start_date)
      const { data: giorno } = await supabase
        .from('carb_cycling_giorni')
        .select('carb_cycling_profili(nome, calorie, proteine_g, carboidrati_g, grassi_g)')
        .eq('piano_id', target.id)
        .eq('giorno_ciclo', cycleDay)
        .maybeSingle()
      activeProfile = (giorno as any)?.carb_cycling_profili ?? null
    }

    if (activeProfile) {
      calorie = activeProfile.calorie
      proteine_g = activeProfile.proteine_g
      carboidrati_g = activeProfile.carboidrati_g
      grassi_g = activeProfile.grassi_g
      carb_cycling_profile_name = activeProfile.nome
    }
  } else {
    // ── Old carb cycling (training/rest days) ──
    const carbCyclingOn = target.carb_cycling_enabled ?? false
    if (carbCyclingOn && day_type !== null) {
      if (day_type === 'training' && target.carbs_training != null) {
        carboidrati_g = target.carbs_training
      } else if (day_type === 'rest' && target.carbs_rest != null) {
        carboidrati_g = target.carbs_rest
      }
    }
  }

  return {
    calorie,
    proteine_g,
    carboidrati_g_base: target.carboidrati_g,
    grassi_g,
    carb_cycling_enabled: target.carb_cycling_enabled ?? false,
    carbs_training: target.carbs_training ?? null,
    carbs_rest: target.carbs_rest ?? null,
    carboidrati_g,
    checkin_done,
    will_train,
    day_type,
    carb_cycling_profile_name,
    carb_cycling_override_active,
  }
}
