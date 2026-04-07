import { createClient } from '@/lib/supabase/server'

export interface TodayCheckin {
  id: string
  energia: number
  sonno: number
  stress: number
  motivazione: number
  will_train: boolean | null
  note: string | null
}

export type DayType = 'training' | 'rest'

export async function getTodayCheckin(): Promise<TodayCheckin | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const oggi = new Date()
  oggi.setHours(0, 0, 0, 0)

  const { data } = await supabase
    .from('checkin')
    .select('id, energia, sonno, stress, motivazione, will_train, note')
    .eq('cliente_id', user.id)
    .gte('data', oggi.toISOString())
    .maybeSingle()

  return data ?? null
}

export function getTodayTrainingType(checkin: TodayCheckin | null): DayType {
  return checkin?.will_train ? 'training' : 'rest'
}

export function getTodayCarbMessage(type: DayType) {
  if (type === 'training') {
    return {
      emoji: '🔥',
      label: 'HIGH CARB',
      title: 'Giorno allenamento',
      message: 'Oggi hai più carburante, sfruttalo al massimo',
      color: 'oklch(0.70 0.19 46)',
      bg: 'oklch(0.70 0.19 46 / 10%)',
      border: 'oklch(0.70 0.19 46 / 30%)',
    }
  }
  return {
    emoji: '💧',
    label: 'LOW CARB',
    title: 'Giorno recupero',
    message: 'Oggi recupero: resta attivo ma non forzare',
    color: 'oklch(0.60 0.15 200)',
    bg: 'oklch(0.60 0.15 200 / 10%)',
    border: 'oklch(0.60 0.15 200 / 25%)',
  }
}
