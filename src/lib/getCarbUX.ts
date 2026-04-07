export type DayType = 'training' | 'rest' | null

export interface CarbUX {
  show: boolean
  emoji: string
  label: string | null      // 'HIGH CARB' | 'LOW CARB' | null (se cycling OFF)
  title: string
  message: string
  color: string
  bg: string
  border: string
}

/**
 * Restituisce UX card per il giorno corrente.
 *
 * - carbCyclingEnabled = false  → card neutra (training/riposo), NO badge HIGH/LOW
 * - carbCyclingEnabled = true   → card con badge HIGH CARB / LOW CARB
 * - dayType = null              → nessun check-in: show = false
 */
export function getCarbUX(dayType: DayType, carbCyclingEnabled: boolean): CarbUX {
  // Nessun check-in ancora
  if (dayType === null) {
    return {
      show: false,
      emoji: '',
      label: null,
      title: '',
      message: 'Completa il check-in per vedere i tuoi macro di oggi',
      color: 'oklch(0.55 0 0)',
      bg: 'oklch(0.18 0 0)',
      border: 'oklch(1 0 0 / 6%)',
    }
  }

  const isTraining = dayType === 'training'

  // Carb cycling DISABILITATO — card neutra, niente badge HIGH/LOW
  if (!carbCyclingEnabled) {
    return {
      show: true,
      emoji: isTraining ? '💪' : '😴',
      label: null,
      title: isTraining ? 'Giorno allenamento' : 'Giorno riposo',
      message: isTraining
        ? 'Buon allenamento! Dai il massimo oggi.'
        : 'Giornata di recupero. Resta attivo e recupera bene.',
      color: isTraining ? 'oklch(0.70 0.19 46)' : 'oklch(0.60 0.15 200)',
      bg: isTraining ? 'oklch(0.70 0.19 46 / 8%)' : 'oklch(0.60 0.15 200 / 8%)',
      border: isTraining ? 'oklch(0.70 0.19 46 / 20%)' : 'oklch(0.60 0.15 200 / 20%)',
    }
  }

  // Carb cycling ABILITATO
  if (isTraining) {
    return {
      show: true,
      emoji: '🔥',
      label: 'HIGH CARB',
      title: 'Giorno allenamento',
      message: 'Oggi hai più carbo: sfrutta l\'energia e spingi in allenamento',
      color: 'oklch(0.70 0.19 46)',
      bg: 'oklch(0.70 0.19 46 / 10%)',
      border: 'oklch(0.70 0.19 46 / 30%)',
    }
  }

  return {
    show: true,
    emoji: '💧',
    label: 'LOW CARB',
    title: 'Giorno recupero',
    message: 'Oggi scarico carbo: focus recupero e movimento leggero',
    color: 'oklch(0.60 0.15 200)',
    bg: 'oklch(0.60 0.15 200 / 10%)',
    border: 'oklch(0.60 0.15 200 / 25%)',
  }
}
