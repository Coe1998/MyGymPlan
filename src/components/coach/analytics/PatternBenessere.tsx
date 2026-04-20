'use client'

import { useState, useEffect, useMemo } from 'react'
import BynariLoader from '@/components/shared/BynariLoader'
import { createClient } from '@/lib/supabase/client'

interface Props { clienteId: string }

const GIORNI_SETTIMANA = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom']

export default function PatternBenessere({ clienteId }: Props) {
  const supabase = useMemo(() => createClient(), [])
  const [loading, setLoading] = useState(true)
  const [showAll, setShowAll] = useState(false)
  const [dati, setDati] = useState<{
    energiaPerGiorno: number[]
    stressPerGiorno: number[]
    mediaEnergia: number
    mediaStress: number
    giornoMaxEnergia: number
    giornoMaxStress: number
    correlStressVolume: number | null
    percCheckin: number
    checkins: { data: string; energia: number; sonno: number; stress: number; motivazione: number; note: string | null }[]
  } | null>(null)

  useEffect(() => {
    const fetch = async () => {
      setLoading(true)
      const dataInizio = new Date(Date.now() - 90 * 86400000).toISOString()

      const [checkinRes, sessiRes] = await Promise.all([
        supabase.from('checkin')
          .select('data, energia, sonno, stress, motivazione, note')
          .eq('cliente_id', clienteId)
          .gte('data', dataInizio)
          .order('data', { ascending: false }),
        supabase.from('sessioni')
          .select('id, data')
          .eq('cliente_id', clienteId)
          .eq('completata', true)
          .gte('data', dataInizio),
      ])

      const checkins = checkinRes.data ?? []
      const sessioni = sessiRes.data ?? []

      if (checkins.length === 0) { setLoading(false); return }

      const energiaPerGiorno = Array(7).fill(0)
      const stressPerGiorno = Array(7).fill(0)
      const countPerGiorno = Array(7).fill(0)

      for (const c of checkins) {
        const giorno = (new Date(c.data).getDay() + 6) % 7
        energiaPerGiorno[giorno] += c.energia
        stressPerGiorno[giorno] += c.stress
        countPerGiorno[giorno]++
      }

      const energiaMedia = energiaPerGiorno.map((v, i) =>
        countPerGiorno[i] > 0 ? Math.round((v / countPerGiorno[i]) * 10) / 10 : 0)
      const stressMedia = stressPerGiorno.map((v, i) =>
        countPerGiorno[i] > 0 ? Math.round((v / countPerGiorno[i]) * 10) / 10 : 0)

      const giornoMaxEnergia = energiaMedia.indexOf(Math.max(...energiaMedia))
      const giornoMaxStress = stressMedia.indexOf(Math.max(...stressMedia.filter(v => v > 0)))

      const mediaEnergia = Math.round((checkins.reduce((a, c) => a + c.energia, 0) / checkins.length) * 10) / 10
      const mediaStress = Math.round((checkins.reduce((a, c) => a + c.stress, 0) / checkins.length) * 10) / 10

      // Correlazione stress → volume
      let correlStressVolume: number | null = null
      if (sessioni.length > 0) {
        const sessDateSet = new Set(sessioni.map(s => s.data.split('T')[0]))
        const checkinConSessione = checkins.filter(c => sessDateSet.has(c.data.split('T')[0]))
        const highStress = checkinConSessione.filter(c => c.stress >= 4)
        const normalStress = checkinConSessione.filter(c => c.stress < 4)
        if (highStress.length > 0 && normalStress.length > 0) {
          const avgHigh = highStress.reduce((a, c) => a + c.energia, 0) / highStress.length
          const avgNormal = normalStress.reduce((a, c) => a + c.energia, 0) / normalStress.length
          correlStressVolume = Math.round(((avgHigh - avgNormal) / avgNormal) * 100)
        }
      }

      const percCheckin = sessioni.length > 0
        ? Math.round((checkins.length / sessioni.length) * 100)
        : 0

      setDati({
        energiaPerGiorno: energiaMedia,
        stressPerGiorno: stressMedia,
        mediaEnergia,
        mediaStress,
        giornoMaxEnergia,
        giornoMaxStress,
        correlStressVolume,
        percCheckin,
        checkins,
      })
      setLoading(false)
    }
    fetch()
  }, [clienteId])

  const checkinVisibili = showAll ? (dati?.checkins ?? []) : (dati?.checkins ?? []).slice(0, 7)
  const maxEnergia = dati ? Math.max(...dati.energiaPerGiorno) : 5

  return (
    <div className="rounded-2xl overflow-hidden"
      style={{ background: 'var(--c-18)', border: '1px solid var(--c-w6)' }}>
      <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--c-w6)' }}>
        <h2 className="font-bold" style={{ color: 'var(--c-97)' }}>Pattern benessere</h2>
        <p className="text-xs mt-0.5" style={{ color: 'var(--c-45)' }}>Ultimi 90 giorni</p>
      </div>

      <div className="p-5">
        {loading ? (
          <BynariLoader file="blue" size={80} />
        ) : !dati ? (
          <p className="text-sm text-center py-8" style={{ color: 'var(--c-45)' }}>
            Nessun check-in disponibile
          </p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 mb-5 sm:grid-cols-4">
              {[
                {
                  label: 'Giorno con più energia',
                  val: GIORNI_SETTIMANA[dati.giornoMaxEnergia],
                  sub: `media ${dati.energiaPerGiorno[dati.giornoMaxEnergia]}/5`,
                  color: 'oklch(0.65 0.18 150)',
                },
                {
                  label: 'Giorno più stressante',
                  val: dati.giornoMaxStress >= 0 ? GIORNI_SETTIMANA[dati.giornoMaxStress] : '—',
                  sub: `media stress ${dati.stressPerGiorno[dati.giornoMaxStress]}/5`,
                  color: 'oklch(0.75 0.15 27)',
                },
                {
                  label: 'Correlazione stress',
                  val: dati.correlStressVolume !== null
                    ? `${dati.correlStressVolume > 0 ? '+' : ''}${dati.correlStressVolume}%`
                    : '—',
                  sub: 'energia con stress alto',
                  color: dati.correlStressVolume !== null && dati.correlStressVolume < -15
                    ? 'oklch(0.75 0.15 27)' : 'var(--c-60)',
                },
                {
                  label: 'Check-in compilati',
                  val: `${dati.percCheckin}%`,
                  sub: `${dati.checkins.length} totali`,
                  color: 'oklch(0.60 0.15 200)',
                },
              ].map(k => (
                <div key={k.label} className="rounded-xl p-3"
                  style={{ background: 'var(--c-22)' }}>
                  <p className="text-xs mb-1" style={{ color: 'var(--c-50)' }}>{k.label}</p>
                  <p className="text-xl font-black" style={{ color: k.color }}>{k.val}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--c-45)' }}>{k.sub}</p>
                </div>
              ))}
            </div>

            <p className="text-xs font-semibold uppercase tracking-widest mb-3"
              style={{ color: 'var(--c-45)' }}>
              Energia media per giorno della settimana
            </p>
            <div className="flex gap-2 items-end mb-5" style={{ height: 60 }}>
              {dati.energiaPerGiorno.map((val, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full rounded-sm transition-all"
                    style={{
                      height: val > 0 ? `${Math.round((val / maxEnergia) * 48)}px` : '4px',
                      background: i === dati.giornoMaxEnergia
                        ? 'oklch(0.65 0.18 150)'
                        : i === dati.giornoMaxStress
                          ? 'oklch(0.75 0.15 27 / 60%)'
                          : 'oklch(0.70 0.19 46 / 50%)',
                    }} />
                  <span className="text-xs" style={{ color: 'var(--c-45)', fontSize: 10 }}>
                    {GIORNI_SETTIMANA[i]}
                  </span>
                </div>
              ))}
            </div>

            <p className="text-xs font-semibold uppercase tracking-widest mb-3"
              style={{ color: 'var(--c-45)' }}>
              Storico check-in
            </p>
            <div className="space-y-2">
              {checkinVisibili.map((c, i) => (
                <div key={i} className="rounded-xl px-4 py-3"
                  style={{ background: 'var(--c-22)' }}>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-semibold" style={{ color: 'var(--c-75)' }}>
                      {new Date(c.data).toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' })}
                    </p>
                    <div className="flex gap-3">
                      {[
                        { label: 'E', val: c.energia, warn: c.energia <= 2 },
                        { label: 'S', val: c.sonno, warn: c.sonno <= 2 },
                        { label: 'St', val: c.stress, warn: c.stress >= 4 },
                        { label: 'M', val: c.motivazione, warn: c.motivazione <= 2 },
                      ].map(item => (
                        <span key={item.label} className="text-xs font-bold"
                          style={{ color: item.warn ? 'oklch(0.75 0.15 27)' : 'var(--c-60)' }}>
                          {item.label} {item.val}
                        </span>
                      ))}
                    </div>
                  </div>
                  {c.note && (
                    <p className="text-xs italic" style={{ color: 'var(--c-50)' }}>
                      "{c.note}"
                    </p>
                  )}
                </div>
              ))}
            </div>

            {!showAll && (dati.checkins.length > 7) && (
              <button onClick={() => setShowAll(true)}
                className="mt-3 w-full py-2.5 rounded-xl text-xs font-semibold"
                style={{ background: 'var(--c-22)', color: 'var(--c-55)', border: '1px solid var(--c-w8)' }}>
                Mostra tutti i check-in ({dati.checkins.length - 7} altri)
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}
