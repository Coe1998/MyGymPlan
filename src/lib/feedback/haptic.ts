/**
 * Trigger device vibration (noop on unsupported devices / SSR).
 *
 * Pattern examples:
 *   haptic(6)                     // single 6ms buzz (tap)
 *   haptic([30, 20, 30])          // buzz-pause-buzz (series complete)
 *   haptic([40, 30, 40, 30, 80]) // PR pattern
 */
export function haptic(pattern: number | number[] = 10): void {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    navigator.vibrate(pattern)
  }
}
