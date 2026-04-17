export function getCurrentCycleDay(startDate: string): number {
  const start = new Date(startDate)
  start.setHours(0, 0, 0, 0)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const daysPassed = Math.floor((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
  return (daysPassed % 7) + 1 // returns 1-7
}

export function shiftCycleStart(currentStart: string, shiftDays: number): string {
  const start = new Date(currentStart)
  start.setDate(start.getDate() - shiftDays)
  return start.toISOString().split('T')[0]
}
