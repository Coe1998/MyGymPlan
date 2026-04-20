export const fmtVolume = (kg: number) =>
  new Intl.NumberFormat('it-IT').format(Math.round(kg)) + ' kg'

export const fmtVolumeNum = (kg: number) =>
  new Intl.NumberFormat('it-IT').format(Math.round(kg))

export const fmtDurationShort = (sec: number) => {
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}` : `${m}'${String(sec % 60).padStart(2, '0')}"`
}

export const fmtDate = (d: Date) =>
  d.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' }).toUpperCase()

export const fmtDateExtended = (d: Date) =>
  d.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
