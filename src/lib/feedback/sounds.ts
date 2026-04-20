// Web Audio API sounds — SSR-safe singleton
// Zero external assets, all tones generated programmatically

let ctx: AudioContext | null = null

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!ctx) {
    ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
  }
  return ctx
}

interface ToneOptions {
  freq?: number
  dur?: number
  type?: OscillatorType
  vol?: number
  attack?: number
}

function tone({ freq = 440, dur = 0.15, type = 'sine' as OscillatorType, vol = 0.25, attack = 0.01 }: ToneOptions = {}) {
  try {
    const c = getCtx()
    if (!c) return
    if (c.state === 'suspended') c.resume()
    const osc = c.createOscillator()
    const g = c.createGain()
    osc.type = type
    osc.frequency.value = freq
    osc.connect(g)
    g.connect(c.destination)
    const now = c.currentTime
    g.gain.setValueAtTime(0, now)
    g.gain.linearRampToValueAtTime(vol, now + attack)
    g.gain.exponentialRampToValueAtTime(0.0001, now + dur)
    osc.start(now)
    osc.stop(now + dur + 0.05)
  } catch {}
}

export const Sounds = {
  /** 2-note chime on set complete */
  setComplete: () => {
    tone({ freq: 523, dur: 0.12, type: 'sine', vol: 0.2 })
    setTimeout(() => tone({ freq: 784, dur: 0.2, type: 'sine', vol: 0.25 }), 90)
  },
  /** 3-note ascending fanfare on PR */
  prHit: () => {
    tone({ freq: 659, dur: 0.15, type: 'triangle', vol: 0.25 })
    setTimeout(() => tone({ freq: 784, dur: 0.15, type: 'triangle', vol: 0.25 }), 120)
    setTimeout(() => tone({ freq: 1047, dur: 0.3, type: 'triangle', vol: 0.3 }), 240)
  },
  /** Subtle tick every 15s during rest */
  tick: () => tone({ freq: 800, dur: 0.04, type: 'square', vol: 0.1 }),
  /** Urgent tick for last 5s of rest */
  tickUrgent: () => tone({ freq: 600, dur: 0.06, type: 'square', vol: 0.2 }),
  /** Timer end chime */
  timerEnd: () => {
    tone({ freq: 1047, dur: 0.1, type: 'sine', vol: 0.3 })
    setTimeout(() => tone({ freq: 1319, dur: 0.25, type: 'sine', vol: 0.35 }), 80)
  },
  /** 4-note workout complete fanfare */
  workoutDone: () => {
    tone({ freq: 523, dur: 0.12 })
    setTimeout(() => tone({ freq: 659, dur: 0.12 }), 120)
    setTimeout(() => tone({ freq: 784, dur: 0.12 }), 240)
    setTimeout(() => tone({ freq: 1047, dur: 0.4, vol: 0.35 }), 360)
  },
  /** Subtle tap on +/- */
  tap: () => tone({ freq: 180, dur: 0.03, type: 'triangle', vol: 0.08 }),
  /** Error sound */
  error: () => tone({ freq: 180, dur: 0.15, type: 'sawtooth', vol: 0.15 }),
}

/** Returns Sounds or no-ops when sounds are disabled */
export function useSounds(enabled = true): typeof Sounds {
  if (!enabled) {
    const noop = () => {}
    return Object.fromEntries(Object.keys(Sounds).map(k => [k, noop])) as typeof Sounds
  }
  return Sounds
}
