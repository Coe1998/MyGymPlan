export interface DietaDraft {
  data_inizio: string
  macro: { kcal: string; prot: string; carb: string; grassi: string; note: string }
  pasti: { count: number; split: { nome: string; pct: number }[] }
  carb_cycling_abilitato: boolean
  carb_cycling_start_date: string
}

export interface ProfiloMacro {
  id: string
  label: string
  kcal: number
  prot: number
  carb: number
  grassi: number
  color: string
}

export interface DietaVersione {
  id: string
  data_inizio: string
  data_fine: string | null
  calorie: number | null
  proteine_g: number | null
  carboidrati_g: number | null
  grassi_g: number | null
  note_coach: string | null
  delta_peso_kg: number | null
  outcome_note: string | null
  pasti_config: { nome: string; pct: number }[]
  carb_cycling_abilitato: boolean
}

export const DRAFT_VUOTO: DietaDraft = {
  data_inizio: '',
  macro: { kcal: '2000', prot: '150', carb: '200', grassi: '70', note: '' },
  pasti: {
    count: 4,
    split: [
      { nome: 'Colazione', pct: 25 },
      { nome: 'Pranzo',    pct: 35 },
      { nome: 'Merenda',   pct: 15 },
      { nome: 'Cena',      pct: 25 },
    ],
  },
  carb_cycling_abilitato: false,
  carb_cycling_start_date: '',
}
