'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Props { clienteId: string }

interface MuscoloStat {
  muscolo: string
  volume: number
  volumePrec: number
  delta: number
}

const GIORNI = 90

export default function MassimoMuscoli({ clienteId }: Props) {
  const supabase = useMemo(() => createClient(), [])
  const [dati, setDati] = useState<MuscoloStat[]>([])
  const [loading, setLoading] = useState(true)
  const [showAll, setShowAll] = useState(false)

  useEffect(() => {
    const fetch = async () => {
      setLoading(true)
      const now = Date.now()
      const dataInizio = new Date(now - GIORNI * 86400000).toISOString()
      const dataInizioPrec = new Date(now - GIORNI * 2 * 86400000).toISOString()
      const dataFinePrec = new Date(now - GIORNI * 86400000).toISOString()

      const fetchVolume = async (from: string, to?: string) => {
        let q = supabase
          .from('sessioni')
          .select('id')
          .eq('cliente_id', clienteId)
          .eq('completata', true)
          .gte('data', from)
        if (to) q = q.lt('data', to)
        const { data: sessioni } = await q
        if (!sessioni || sessioni.length === 0) return new Map<string, number>()

        const sessIds = sessioni.map(s => s.id)
        const { data: logs } = await supabase
          .from('log_serie')
          .select(`
            peso_kg, ripetizioni, reps_sx, reps_dx, completata,
            scheda_esercizi!inner (
              esercizi!scheda_esercizi_esercizio_id_fkey ( muscoli, tipo_input )
            )
          `)
          .in('sessione_id', sessIds)
          .eq('completata', true)

        const map = new Map<string, number>()
        for (const log of (logs ?? []) as any[]) {
          const ese = log.scheda_esercizi?.esercizi
          const muscoli: string[] = ese?.muscoli ?? []
          const tipoInput = ese?.tipo_input ?? 'reps'
          const peso = parseFloat(log.peso_kg) || 0
          const reps = parseInt(log.ripetizioni) || 0
          const repsSx = parseInt(log.reps_sx) || 0
          const repsDx = parseInt(log.reps_dx) || 0

          let vol = 0
          if (tipoInput === 'reps_unilaterale') {
            vol = peso * (Math.min(repsSx || reps, repsDx || reps) * 2)
          } else if (tipoInput !== 'timer') {
            vol = peso * reps
          }

          for (const m of muscoli) {
            map.set(m, (map.get(m) ?? 0) + vol)
          }
        }
        return map
      }

      const [curr, prec] = await Promise.all([
        fetchVolume(dataInizio),
        fetchVolume(dataInizioPrec, dataFinePrec),
      ])

      const allMuscoli = new Set([...curr.keys(), ...prec.keys()])
      const result: MuscoloStat[] = Array.from(allMuscoli).map(m => {
        const volume = curr.get(m) ?? 0
        const volumePrec = prec.get(m) ?? 0
        const delta = volumePrec > 0 ? Math.round(((volume - volumePrec) / volumePrec) * 100) : 0
        return { muscolo: m, volume: Math.round(volume), volumePrec: Math.round(volumePrec), delta }
      }).sort((a, b) => b.volume - a.volume)

      setDati(result)
      setLoading(false)
    }
    fetch()
  }, [clienteId])

  const maxVolume = dati[0]?.volume ?? 1
  const lista = showAll ? dati : dati.slice(0, 6)

  const insights = useMemo(() => {
    const msgs: string[] = []
    if (dati.length < 2) return msgs
    const muscoliCalo = dati.filter(m => m.delta <= -20 && m.volumePrec > 0)
    const muscoliTop = dati.filter(m => m.delta >= 15).slice(0, 2)

    if (muscoliTop.length > 0) {
      msgs.push(`${muscoliTop.map(m => m.muscolo).join(' e ')} in crescita — ottimo stimolo.`)
    }
    if (muscoliCalo.length > 0) {
      const nomi = muscoliCalo.slice(0, 2).map(m => m.muscolo).join(' e ')
      msgs.push(`${nomi} in calo significativo — valuta se riequilibrare la scheda.`)
    }
    const quad = dati.find(m => m.muscolo === 'Quadricipiti')
    const fem = dati.find(m => m.muscolo === 'Femorali')
    if (quad && fem && quad.volume > fem.volume * 2.5) {
      msgs.push('Squilibrio quad/femorali — considera di aggiungere esercizi posteriori.')
    }
    return msgs
  }, [dati])

  return (
    <div className="rounded-2xl overflow-hidden"
      style={{ background: 'oklch(0.18 0 0)', border: '1px solid oklch(1 0 0 / 6%)' }}>
      <div className="px-5 py-4" style={{ borderBottom: '1px solid oklch(1 0 0 / 6%)' }}>
        <h2 className="font-bold" style={{ color: 'oklch(0.97 0 0)' }}>Muscoli più lavorati</h2>
        <p className="text-xs mt-0.5" style={{ color: 'oklch(0.45 0 0)' }}>
          Volume ultimi 90gg vs 90gg precedenti
        </p>
      </div>

      <div className="p-5">
        {loading ? (
          <div className="py-8 text-center">
            <p className="text-sm" style={{ color: 'oklch(0.45 0 0)' }}>Caricamento...</p>
          </div>
        ) : dati.length === 0 ? (
          <p className="text-sm text-center py-8" style={{ color: 'oklch(0.45 0 0)' }}>
            Nessun dato disponibile
          </p>
        ) : (
          <>
            <div className="space-y-3">
              {lista.map(m => (
                <div key={m.muscolo} className="flex items-center gap-3">
                  <span className="text-sm w-28 flex-shrink-0" style={{ color: 'oklch(0.80 0 0)' }}>
                    {m.muscolo}
                  </span>
                  <div className="flex-1 h-2 rounded-full overflow-hidden"
                    style={{ background: 'oklch(0.25 0 0)' }}>
                    <div className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.round((m.volume / maxVolume) * 100)}%`,
                        background: m.delta >= 0 ? 'oklch(0.70 0.19 46)' : 'oklch(0.60 0.15 200)',
                      }} />
                  </div>
                  <span className="text-xs w-20 text-right flex-shrink-0"
                    style={{ color: m.delta > 0 ? 'oklch(0.65 0.18 150)' : m.delta < 0 ? 'oklch(0.75 0.15 27)' : 'oklch(0.50 0 0)' }}>
                    {m.volumePrec > 0
                      ? `${m.delta > 0 ? '+' : ''}${m.delta}%`
                      : 'nuovo'}
                  </span>
                </div>
              ))}
            </div>

            {!showAll && dati.length > 6 && (
              <button onClick={() => setShowAll(true)}
                className="mt-4 w-full py-2.5 rounded-xl text-xs font-semibold"
                style={{ background: 'oklch(0.22 0 0)', color: 'oklch(0.55 0 0)', border: '1px solid oklch(1 0 0 / 8%)' }}>
                Mostra tutti ({dati.length - 6} altri muscoli)
              </button>
            )}

            {insights.length > 0 && (
              <div className="mt-4 space-y-2">
                {insights.map((ins, i) => (
                  <div key={i} className="px-4 py-3 rounded-xl text-xs"
                    style={{
                      background: ins.includes('calo') || ins.includes('Squilibrio')
                        ? 'oklch(0.65 0.22 27 / 10%)'
                        : 'oklch(0.65 0.18 150 / 10%)',
                      color: ins.includes('calo') || ins.includes('Squilibrio')
                        ? 'oklch(0.75 0.15 27)'
                        : 'oklch(0.65 0.18 150)',
                      border: `1px solid ${ins.includes('calo') || ins.includes('Squilibrio') ? 'oklch(0.65 0.22 27 / 25%)' : 'oklch(0.65 0.18 150 / 25%)'}`,
                    }}>
                    {ins}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
