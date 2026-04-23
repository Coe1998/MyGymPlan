import type { SupabaseClient } from '@supabase/supabase-js'

export interface DietaAttiva {
  id: string
  calorie: number
  proteine_g: number
  carboidrati_g: number
  grassi_g: number
  note_coach: string | null
  pasti_config: { nome: string; percentuale?: number; pct?: number; macro_custom?: boolean; prot_pct?: number; carb_pct?: number; grassi_pct?: number }[]
  carb_cycling_abilitato: boolean
  carb_cycling_start_date: string | null
  data_inizio: string
  data_fine: string | null
}

// Restituisce la dieta attiva per oggi: data_inizio <= oggi <= data_fine (o data_fine IS NULL)
export async function getDietaAttiva(
  supabase: SupabaseClient,
  clienteId: string,
): Promise<DietaAttiva | null> {
  const today = new Date().toISOString().split('T')[0]

  const { data } = await supabase
    .from('diete')
    .select('id, calorie, proteine_g, carboidrati_g, grassi_g, note_coach, pasti_config, carb_cycling_abilitato, carb_cycling_start_date, data_inizio, data_fine')
    .eq('cliente_id', clienteId)
    .lte('data_inizio', today)
    .or(`data_fine.is.null,data_fine.gte.${today}`)
    .order('data_inizio', { ascending: false })
    .limit(1)
    .maybeSingle()

  return data as DietaAttiva | null
}

// Normalizza pasti_config: supporta sia {percentuale} (vecchio) che {pct} (nuovo)
export function normalizePastiConfig(raw: any[]): { nome: string; percentuale: number; macro_custom?: boolean; prot_pct?: number; carb_pct?: number; grassi_pct?: number }[] {
  return (raw ?? []).map(p => ({
    nome: p.nome ?? 'Pasto',
    percentuale: p.percentuale ?? p.pct ?? 0,
    macro_custom: p.macro_custom,
    prot_pct: p.prot_pct,
    carb_pct: p.carb_pct,
    grassi_pct: p.grassi_pct,
  }))
}
