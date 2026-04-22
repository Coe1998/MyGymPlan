export interface Esercizio {
  id: string
  nome: string
  muscoli: string[] | null
  gif_url?: string | null
  tipo_input?: 'reps' | 'reps_unilaterale' | 'timer' | 'timer_unilaterale'
}

export interface EsForm {
  esercizio_id: string
  alternativa_id: string
  serie: string
  ripetizioni: string
  recupero: string
  note: string
  tipo: string
  gruppo_id: string
  drop_count: string
  drop_pct: string
  rest_pause_sec: string
  piramide_dir: string
  prepara_secondi: string
  progressione_tipo: string
  warmup_serie: string // JSON string of {peso,reps}[]
  peso_consigliato_kg: string
  tut: string
  amrap_minuti: string
  emom_reps_per_minuto: string
  emom_durata_minuti: string
  emom_rounds: string
  max_reps_target: string
  tabata_work_secondi: string
  tabata_rest_secondi: string
  tabata_rounds: string
}

export const EMPTY_FORM: EsForm = {
  esercizio_id: '', alternativa_id: '',
  serie: '3', ripetizioni: '8-12', recupero: '90', note: '',
  tipo: 'normale', gruppo_id: '',
  drop_count: '2', drop_pct: '20',
  rest_pause_sec: '15', piramide_dir: 'ascendente',
  prepara_secondi: '', progressione_tipo: 'peso',
  warmup_serie: '[]',
  peso_consigliato_kg: '', tut: '',
  amrap_minuti: '10', emom_reps_per_minuto: '6',
  emom_durata_minuti: '6', emom_rounds: '4',
  max_reps_target: '30',
  tabata_work_secondi: '20', tabata_rest_secondi: '10', tabata_rounds: '8',
}

export interface PendingItem {
  tempId: string
  giornoId: string
  form: EsForm
  isPlaceholder: boolean // true = not yet configured
}

export interface SchedaEsercizio {
  id: string
  esercizio_id: string
  serie: number
  ripetizioni: string
  recupero_secondi: number
  note: string | null
  ordine: number
  tipo: string
  gruppo_id: string | null
  drop_count: number | null
  drop_percentage: number | null
  rest_pause_secondi: number | null
  piramidale_direzione: string | null
  alternativa_esercizio_id: string | null
  prepara_secondi: number | null
  progressione_tipo: string
  warmup_serie: { peso: string; reps: string }[]
  esercizi: Esercizio
  alternativa_esercizi?: Esercizio | null
  peso_consigliato_kg: number | null
  tut: string | null
  amrap_minuti: number | null
  emom_reps_per_minuto: number | null
  emom_durata_minuti: number | null
  emom_rounds: number | null
  max_reps_target: number | null
  tabata_work_secondi: number | null
  tabata_rest_secondi: number | null
  tabata_rounds: number | null
}

export interface Giorno {
  id: string
  nome: string
  ordine: number
  warmup_note: string | null
  scheda_esercizi: SchedaEsercizio[]
}
