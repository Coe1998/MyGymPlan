import { createClient } from '@/lib/supabase/server'
import { getCurrentCycleDay } from '@/lib/carbCycling'
import { getDietaAttiva } from '@/lib/getDietaAttiva'

export interface TodayMacros {
  calorie: number
  proteine_g: number
  carboidrati_g_base: number
  grassi_g: number
  carb_cycling_enabled: boolean
  carbs_training: number | null
  carbs_rest: number | null
  carboidrati_g: number
  checkin_done: boolean
  will_train: boolean | null
  day_type: 'training' | 'rest' | null
  carb_cycling_profile_name: string | null
  carb_cycling_override_active: boolean
}

export async function getTodayMacros(clienteId: string): Promise<TodayMacros | null> {
  const supabase = await createClient()

  const oggi = new Date()
  oggi.setHours(0, 0, 0, 0)
  const todayStr = oggi.toISOString().split('T')[0]

  const [dieta, checkinRes] = await Promise.all([
    getDietaAttiva(supabase, clienteId),
    supabase
      .from('checkin')
      .select('will_train')
      .eq('cliente_id', clienteId)
      .gte('data', oggi.toISOString())
      .maybeSingle(),
  ])

  if (!dieta) return null

  const checkin = checkinRes.data
  const checkin_done = !!checkin
  const will_train = checkin?.will_train ?? null
  const day_type: 'training' | 'rest' | null = checkin_done
    ? (will_train ? 'training' : 'rest')
    : null

  let calorie: number = dieta.calorie ?? 0
  let proteine_g: number = dieta.proteine_g ?? 0
  let carboidrati_g: number = dieta.carboidrati_g ?? 0
  let grassi_g: number = dieta.grassi_g ?? 0
  let carb_cycling_profile_name: string | null = null
  let carb_cycling_override_active = false

  // Carb cycling multi-profilo (nuovo sistema via dieta_profili_macro / dieta_ciclo)
  if (dieta.carb_cycling_abilitato && dieta.carb_cycling_start_date) {
    // 1. Override manuale per oggi (ancora linked al vecchio profilo_id — usiamo come best-effort)
    const { data: override } = await supabase
      .from('carb_cycling_override')
      .select('profilo_id')
      .eq('cliente_id', clienteId)
      .eq('data', todayStr)
      .maybeSingle()

    let activeProfile: { label: string; kcal: number; prot: number; carb: number; grassi: number } | null = null

    if (override?.profilo_id) {
      // Prova prima in dieta_profili_macro
      const { data: pNew } = await supabase
        .from('dieta_profili_macro')
        .select('label, kcal, prot, carb, grassi')
        .eq('id', override.profilo_id)
        .maybeSingle()
      if (pNew) {
        activeProfile = pNew as any
        carb_cycling_override_active = true
      }
    }

    if (!activeProfile) {
      // 2. Giorno del ciclo → profilo assegnato
      const cycleDay = getCurrentCycleDay(dieta.carb_cycling_start_date)
      const { data: cicloRow } = await supabase
        .from('dieta_ciclo')
        .select('profilo_id')
        .eq('dieta_id', dieta.id)
        .eq('giorno', cycleDay)
        .maybeSingle()

      if (cicloRow?.profilo_id) {
        const { data: pRow } = await supabase
          .from('dieta_profili_macro')
          .select('label, kcal, prot, carb, grassi')
          .eq('id', cicloRow.profilo_id)
          .maybeSingle()
        if (pRow) activeProfile = pRow as any
      }
    }

    if (activeProfile) {
      calorie = activeProfile.kcal
      proteine_g = activeProfile.prot
      carboidrati_g = activeProfile.carb
      grassi_g = activeProfile.grassi
      carb_cycling_profile_name = activeProfile.label
    }
  }

  return {
    calorie,
    proteine_g,
    carboidrati_g_base: dieta.carboidrati_g ?? 0,
    grassi_g,
    carb_cycling_enabled: false,
    carbs_training: null,
    carbs_rest: null,
    carboidrati_g,
    checkin_done,
    will_train,
    day_type,
    carb_cycling_profile_name,
    carb_cycling_override_active,
  }
}
