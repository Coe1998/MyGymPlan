export type DayType = 'training' | 'rest' | null

export interface CarbUX {
  show: boolean
  emoji: string
  label: string | null
  title: string
  message: string
  color: string
  bg: string
  border: string
}

const PROFILE_PALETTE: Record<string, { color: string; bg: string; border: string; emoji: string }> = {
  A: { color: 'oklch(0.65 0.18 150)', bg: 'oklch(0.65 0.18 150 / 10%)', border: 'oklch(0.65 0.18 150 / 30%)', emoji: '🟢' },
  B: { color: 'oklch(0.70 0.19 46)',  bg: 'oklch(0.70 0.19 46 / 10%)',  border: 'oklch(0.70 0.19 46 / 30%)',  emoji: '🟠' },
  C: { color: 'oklch(0.60 0.15 200)', bg: 'oklch(0.60 0.15 200 / 10%)', border: 'oklch(0.60 0.15 200 / 30%)', emoji: '🔵' },
  D: { color: 'oklch(0.65 0.15 300)', bg: 'oklch(0.65 0.15 300 / 10%)', border: 'oklch(0.65 0.15 300 / 30%)', emoji: '🟣' },
}

/**
 * Restituisce UX card per il giorno corrente.
 *
 * - profileName != null         → nuovo carb cycling multi-profilo (A/B/C…)
 * - carbCyclingEnabled = true   → vecchio sistema HIGH/LOW CARB (training/rest)
 * - carbCyclingEnabled = false  → card neutra (niente badge)
 * - dayType = null              → nessun check-in: show = false (solo se no profilo attivo)
 */
export function getCarbUX(
  dayType: DayType,
  carbCyclingEnabled: boolean,
  profileName?: string | null,
  isOverride?: boolean,
): CarbUX {
  // ── Nuovo carb cycling multi-profilo ──────────────────────────────────
  if (profileName) {
    const key = profileName.toUpperCase()
    const palette = PROFILE_PALETTE[key] ?? PROFILE_PALETTE.A
    return {
      show: true,
      emoji: palette.emoji,
      label: `PROFILO ${profileName.toUpperCase()}`,
      title: isOverride ? `Giorno ${profileName} (override)` : `Giorno ${profileName}`,
      message: isOverride
        ? 'Profilo impostato manualmente dal coach per oggi.'
        : 'Segui i macro del tuo profilo assegnato oggi.',
      color: palette.color,
      bg: palette.bg,
      border: palette.border,
    }
  }

  // ── Nessun check-in ancora (solo se il profilo non è già determinato) ──
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

  // ── Vecchio carb cycling DISABILITATO — card neutra ───────────────────
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

  // ── Vecchio carb cycling ABILITATO (HIGH/LOW) ─────────────────────────
  if (isTraining) {
    return {
      show: true,
      emoji: '🔥',
      label: 'HIGH CARB',
      title: 'Giorno allenamento',
      message: "Oggi hai più carbo: sfrutta l'energia e spingi in allenamento",
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
