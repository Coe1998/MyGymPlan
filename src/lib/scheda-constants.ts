export const SCHEDA_MUSCOLI = [
  'Petto', 'Dorsali', 'Spalle', 'Bicipiti', 'Tricipiti',
  'Quadricipiti', 'Femorali', 'Glutei', 'Addome', 'Polpacci', 'Trapezio', 'Avambracci',
]

export const SCHEDA_TIPI = [
  { id: 'normale',    label: 'Normale',    hint: 'Serie x reps classiche',       color: 'oklch(0.70 0 0)',        bg: 'oklch(1 0 0 / 6%)'              },
  { id: 'superset',   label: 'Superset',   hint: '2 esercizi senza recupero',    color: 'oklch(0.60 0.15 200)',   bg: 'oklch(0.60 0.15 200 / 14%)'     },
  { id: 'giant_set',  label: 'Giant Set',  hint: '3+ esercizi consecutivi',      color: 'oklch(0.65 0.18 150)',   bg: 'oklch(0.65 0.18 150 / 14%)'     },
  { id: 'dropset',    label: 'Dropset',    hint: 'Cali di peso a cedimento',     color: 'oklch(0.70 0.19 46)',    bg: 'oklch(0.70 0.19 46 / 14%)'      },
  { id: 'rest_pause', label: 'Rest-Pause', hint: 'Pausa breve, stesso peso',     color: 'oklch(0.62 0.15 300)',   bg: 'oklch(0.62 0.15 300 / 14%)'     },
  { id: 'piramidale', label: 'Piramidale', hint: 'Carico/reps crescenti',        color: 'oklch(0.82 0.13 85)',    bg: 'oklch(0.82 0.13 85 / 14%)'      },
  { id: 'amrap',      label: 'AMRAP',      hint: 'Max reps in N minuti',         color: 'oklch(0.68 0.18 330)',   bg: 'oklch(0.68 0.18 330 / 14%)'     },
  { id: 'emom',       label: 'EMOM',       hint: 'Ogni minuto, N reps',          color: 'oklch(0.65 0.16 180)',   bg: 'oklch(0.65 0.16 180 / 14%)'     },
  { id: 'max_reps',   label: 'Max+Total',  hint: 'Max set + reps totali',        color: 'oklch(0.75 0.15 60)',    bg: 'oklch(0.75 0.15 60 / 14%)'      },
  { id: 'jump_set',   label: 'Jump Set',   hint: '2 esercizi antagonisti',       color: 'oklch(0.62 0.18 280)',   bg: 'oklch(0.62 0.18 280 / 14%)'     },
  { id: 'tabata',     label: 'Tabata',     hint: '8×(20s work / 10s rest)',      color: 'oklch(0.68 0.18 20)',    bg: 'oklch(0.68 0.18 20 / 14%)'      },
]

export const SCHEDA_PROGRESS = [
  { id: 'peso',    label: '+ Peso',   hint: 'es. +5%',             color: 'oklch(0.65 0.18 150)' },
  { id: 'serie',   label: '+ Serie',  hint: 'aggiungi una serie',  color: 'oklch(0.70 0.19 46)'  },
  { id: 'reps',    label: '+ Reps',   hint: 'aumenta il range',    color: 'oklch(0.82 0.13 85)'  },
  { id: 'manuale', label: 'Manuale',  hint: 'coach decide',        color: 'oklch(0.65 0.14 200)' },
]

export type TipoId = typeof SCHEDA_TIPI[number]['id']
export type ProgressId = typeof SCHEDA_PROGRESS[number]['id']

export function getTipo(id: string) {
  return SCHEDA_TIPI.find(t => t.id === id) ?? SCHEDA_TIPI[0]
}
export function getProgress(id: string) {
  return SCHEDA_PROGRESS.find(p => p.id === id) ?? SCHEDA_PROGRESS[0]
}
