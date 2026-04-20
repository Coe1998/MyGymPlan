'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import dynamic from 'next/dynamic'

const LineChart = dynamic(() => import('recharts').then(m => m.LineChart), { ssr: false })
const ComposedChart = dynamic(() => import('recharts').then(m => m.ComposedChart), { ssr: false })
const Line = dynamic(() => import('recharts').then(m => m.Line), { ssr: false })
const Bar = dynamic(() => import('recharts').then(m => m.Bar), { ssr: false })
const XAxis = dynamic(() => import('recharts').then(m => m.XAxis), { ssr: false })
const YAxis = dynamic(() => import('recharts').then(m => m.YAxis), { ssr: false })
const Tooltip = dynamic(() => import('recharts').then(m => m.Tooltip), { ssr: false })
const ResponsiveContainer = dynamic(() => import('recharts').then(m => m.ResponsiveContainer), { ssr: false })

interface Props {
  clienteId: string
  assegnazioni: { id: string; schede: { id: string; nome: string } | null }[]
}

interface EsercizioData {
  eseId: string
  nome: string
  tipoInput: string
  muscoli: string[]
  punti: { data: string; e1rm: number; volume: number; pesoMax: number }[]
}

const GIORNI_DEFAULT = 90

const calcE1rm = (peso: number, reps: number) =>
  reps === 1 ? peso : Math.round((peso * (1 + reps / 30)) * 10) / 10

export default function ProgressioneEsercizi({ clienteId, assegnazioni }: Props) {
  const supabase = useMemo(() => createClient(), [])
  const [esercizi, setEsercizi] = useState<EsercizioData[]>([])
  const [eseSelezionato, setEseSelezionato] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [showAll, setShowAll] = useState(false)
  const [giorni, setGiorni] = useState(GIORNI_DEFAULT)
  const [muscoloFiltro, setMuscoloFiltro] = useState<string | null>(null)

  useEffect(() => {
    const fetch = async () => {
      setLoading(true)
      const dataInizio = giorni === 9999
        ? '2000-01-01'
        : new Date(Date.now() - giorni * 86400000).toISOString()

      const { data: sessioni } = await supabase
        .from('sessioni')
        .select('id, data')
        .eq('cliente_id', clienteId)
        .gte('data', dataInizio)
        .order('data', { ascending: true })

      if (!sessioni || sessioni.length === 0) { setLoading(false); return }

      const sessIds = sessioni.map(s => s.id)
      const sessDateMap = Object.fromEntries(sessioni.map(s => [s.id, s.data]))

      const { data: logs } = await supabase
        .from('log_serie')
        .select(`
          sessione_id, peso_kg, ripetizioni, reps_sx, reps_dx, durata_secondi, completata,
          scheda_esercizi!inner (
            esercizi!scheda_esercizi_esercizio_id_fkey ( id, nome, tipo_input, muscoli )
          )
        `)
        .in('sessione_id', sessIds)
        .eq('completata', true)

      if (!logs) { setLoading(false); return }

      // Chiave = nome normalizzato (lowercase + trim) → esercizi con stesso nome vengono uniti
      const map = new Map<string, EsercizioData>()
      const sessioneEseMap = new Map<string, Map<string, { e1rmMax: number; volume: number; pesoMax: number }>>()

      for (const log of logs as any[]) {
        const ese = log.scheda_esercizi?.esercizi
        if (!ese) continue
        const { id: eseId, nome, tipo_input: tipoInput, muscoli } = ese
        const nomeNorm = (nome as string).trim().toLowerCase()
        const data = sessDateMap[log.sessione_id]?.split('T')[0] ?? ''
        const peso = parseFloat(log.peso_kg) || 0
        const reps = parseInt(log.ripetizioni) || 0
        const repsSx = parseInt(log.reps_sx) || 0
        const repsDx = parseInt(log.reps_dx) || 0
        const durata = parseInt(log.durata_secondi) || 0

        let e1rm = 0, vol = 0
        if (tipoInput === 'timer') {
          e1rm = durata
          vol = durata
        } else if (tipoInput === 'reps_unilaterale') {
          const repsEff = Math.min(repsSx || reps, repsDx || reps)
          e1rm = peso > 0 && repsEff > 0 ? calcE1rm(peso, repsEff) : 0
          vol = peso * (repsEff * 2)
        } else {
          e1rm = peso > 0 && reps > 0 ? calcE1rm(peso, reps) : 0
          vol = peso * reps
        }

        // Usa nomeNorm come chiave — unisce duplicati con stesso nome
        if (!map.has(nomeNorm)) map.set(nomeNorm, { eseId, nome, tipoInput, muscoli: Array.isArray(muscoli) ? muscoli : [], punti: [] })
        if (!sessioneEseMap.has(log.sessione_id)) sessioneEseMap.set(log.sessione_id, new Map())
        const sessEse = sessioneEseMap.get(log.sessione_id)!
        const existing = sessEse.get(nomeNorm) ?? { e1rmMax: 0, volume: 0, pesoMax: 0 }
        sessEse.set(nomeNorm, {
          e1rmMax: Math.max(existing.e1rmMax, e1rm),
          volume: existing.volume + vol,
          pesoMax: Math.max(existing.pesoMax, peso),
        })
        const ese2 = map.get(nomeNorm)!
        if (!ese2.punti.some(p => p.data === data)) {
          ese2.punti.push({ data, e1rm: 0, volume: 0, pesoMax: 0 })
        }
      }

      for (const [sessId, eseMap] of sessioneEseMap) {
        const data = sessDateMap[sessId]?.split('T')[0] ?? ''
        for (const [nomeNorm, vals] of eseMap) {
          const ese = map.get(nomeNorm)
          if (!ese) continue
          const punto = ese.punti.find(p => p.data === data)
          if (punto) {
            punto.e1rm = Math.max(punto.e1rm, vals.e1rmMax)
            punto.volume += vals.volume
            punto.pesoMax = Math.max(punto.pesoMax, vals.pesoMax)
          }
        }
      }

      const result = Array.from(map.values())
        .filter(e => e.punti.length >= 1)
        .sort((a, b) => b.punti.length - a.punti.length)

      setEsercizi(result)
      if (result.length > 0) setEseSelezionato(result[0].eseId)
      setLoading(false)
    }
    fetch()
  }, [clienteId, giorni])

  const ese = esercizi.find(e => e.eseId === eseSelezionato)
  const isTimer = ese?.tipoInput === 'timer'

  const calcolaEfficienza = () => {
    if (!ese || ese.punti.length < 2) return null
    const prima = ese.punti[0]
    const ultima = ese.punti[ese.punti.length - 1]
    if (!prima.e1rm || !ultima.e1rm) return null
    const deltaE1rm = ((ultima.e1rm - prima.e1rm) / prima.e1rm) * 100
    const deltaVol = prima.volume > 0 ? ((ultima.volume - prima.volume) / prima.volume) * 100 : 0
    const score = deltaE1rm + deltaVol * 0.5
    return { deltaE1rm: Math.round(deltaE1rm * 10) / 10, deltaVol: Math.round(deltaVol * 10) / 10, score: Math.round(score * 10) / 10 }
  }

  const eff = calcolaEfficienza()

  const tuttiMuscoli = useMemo(() => {
    const set = new Set<string>()
    for (const e of esercizi) for (const m of e.muscoli) if (m) set.add(m)
    return Array.from(set).sort()
  }, [esercizi])

  const eserciziFiltrati = muscoloFiltro
    ? esercizi.filter(e => e.muscoli.includes(muscoloFiltro))
    : esercizi
  const listaEsercizi = showAll ? eserciziFiltrati : eserciziFiltrati.slice(0, 8)

  return (
    <div className="rounded-2xl overflow-hidden"
      style={{ background: 'var(--c-18)', border: '1px solid var(--c-w6)' }}>
      <div className="px-5 py-4 flex items-center justify-between"
        style={{ borderBottom: '1px solid var(--c-w6)' }}>
        <h2 className="font-bold" style={{ color: 'var(--c-97)' }}>Progressione esercizi</h2>
        <div className="flex items-center gap-3">
          <select
            value={giorni}
            onChange={e => setGiorni(Number(e.target.value))}
            className="text-xs px-3 py-1.5 rounded-xl outline-none"
            style={{ background: 'var(--c-22)', color: 'var(--c-65)', border: '1px solid var(--c-w8)' }}>
            <option value={90}>Ultimi 90gg</option>
            <option value={180}>Ultimi 6 mesi</option>
            <option value={9999}>Tutto</option>
          </select>
        </div>
      </div>

      <div style={{ padding: 14 }}>
        {loading ? (
          <div className="py-10 text-center">
            <p className="text-sm" style={{ color: 'var(--c-45)' }}>Caricamento dati...</p>
          </div>
        ) : esercizi.length === 0 ? (
          <div className="py-10 text-center">
            <p className="text-sm" style={{ color: 'var(--c-45)' }}>Nessun dato sufficiente nel periodo selezionato</p>
          </div>
        ) : (
          <>
            {tuttiMuscoli.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                <button
                  onClick={() => { setMuscoloFiltro(null); setShowAll(false) }}
                  className="text-xs px-3 py-1 rounded-full font-medium transition-all"
                  style={{
                    background: muscoloFiltro === null ? 'rgba(245,124,31,0.14)' : 'transparent',
                    color: muscoloFiltro === null ? '#f57c1f' : 'var(--c-70)',
                    border: muscoloFiltro === null ? '1px solid rgba(245,124,31,0.35)' : '1px solid var(--c-w6)',
                  }}>
                  Tutti
                </button>
                {tuttiMuscoli.map(m => (
                  <button key={m}
                    onClick={() => { setMuscoloFiltro(m === muscoloFiltro ? null : m); setShowAll(false) }}
                    className="text-xs px-3 py-1 rounded-full font-medium transition-all capitalize"
                    style={{
                      background: muscoloFiltro === m ? 'rgba(245,124,31,0.14)' : 'transparent',
                      color: muscoloFiltro === m ? '#f57c1f' : 'var(--c-70)',
                      border: muscoloFiltro === m ? '1px solid rgba(245,124,31,0.35)' : '1px solid var(--c-w6)',
                    }}>
                    {m}
                  </button>
                ))}
              </div>
            )}

            <div className="flex flex-wrap gap-2 mb-5">
              {listaEsercizi.map(e => (
                <button key={e.eseId}
                  onClick={() => setEseSelezionato(e.eseId)}
                  className="text-xs px-3 py-1.5 rounded-full font-medium transition-all"
                  style={{
                    background: eseSelezionato === e.eseId ? 'oklch(0.70 0.19 46 / 20%)' : 'var(--c-22)',
                    color: eseSelezionato === e.eseId ? 'oklch(0.70 0.19 46)' : 'var(--c-55)',
                    border: eseSelezionato === e.eseId ? '1px solid oklch(0.70 0.19 46 / 40%)' : '1px solid var(--c-w8)',
                  }}>
                  {e.nome}
                </button>
              ))}
              {!showAll && eserciziFiltrati.length > 8 && (
                <button onClick={() => setShowAll(true)}
                  className="text-xs px-3 py-1.5 rounded-full"
                  style={{ background: 'var(--c-22)', color: 'var(--c-50)', border: '1px solid var(--c-w8)' }}>
                  +{eserciziFiltrati.length - 8} altri
                </button>
              )}
            </div>

            {ese && (
              <>
                <div className="grid grid-cols-3 gap-3 mb-5">
                  {[
                    {
                      label: isTimer ? 'Durata max attuale' : 'e1RM attuale',
                      val: isTimer
                        ? `${ese.punti[ese.punti.length - 1]?.e1rm ?? '—'}s`
                        : `${ese.punti[ese.punti.length - 1]?.e1rm ?? '—'} kg`,
                      sub: isTimer ? 'secondi' : 'forza stimata',
                    },
                    {
                      label: isTimer ? 'Durata iniziale' : 'Peso max usato',
                      val: isTimer
                        ? `${ese.punti[0]?.e1rm ?? '—'}s`
                        : `${ese.punti[ese.punti.length - 1]?.pesoMax ?? '—'} kg`,
                      sub: isTimer ? 'inizio periodo' : 'in questo periodo',
                    },
                    {
                      label: 'Volume totale',
                      val: `${Math.round(ese.punti.reduce((a, p) => a + p.volume, 0)).toLocaleString('it-IT')} ${isTimer ? 's' : 'kg'}`,
                      sub: `${ese.punti.length} sessioni`,
                    },
                  ].map(k => (
                    <div key={k.label} className="rounded-xl p-3"
                      style={{ background: 'var(--c-22)' }}>
                      <p style={{ fontSize: 10, color: 'var(--c-50)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600, marginBottom: 4 }}>{k.label}</p>
                      <p style={{ fontSize: 16, fontWeight: 800, color: 'var(--c-97)', letterSpacing: -0.3, lineHeight: 1.1 }}>{k.val}</p>
                      <p style={{ fontSize: 10.5, color: 'var(--c-35)', marginTop: 2 }}>{k.sub}</p>
                    </div>
                  ))}
                </div>

                <div style={{ height: 200 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={ese.punti} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                      <XAxis dataKey="data"
                        tick={{ fontSize: 10, fill: 'var(--c-45)' }}
                        tickLine={false} axisLine={false}
                        tickFormatter={v => v.slice(5)} />
                      <YAxis yAxisId="e1rm"
                        tick={{ fontSize: 10, fill: 'var(--c-45)' }}
                        tickLine={false} axisLine={false}
                        domain={['auto', 'auto']} />
                      <YAxis yAxisId="vol" orientation="right"
                        tick={{ fontSize: 10, fill: 'var(--c-45)' }}
                        tickLine={false} axisLine={false}
                        domain={['auto', 'auto']} />
                      <Tooltip
                        contentStyle={{ background: 'var(--c-22)', border: '1px solid var(--c-w10)', borderRadius: 8, fontSize: 12 }}
                        labelStyle={{ color: 'var(--c-70)' }}
                        formatter={(val: any, name?: any) => {
                          if (name === 'e1rm') return [`${val} ${isTimer ? 's' : 'kg'}`, isTimer ? 'Durata' : 'e1RM']
                          return [`${Math.round(val).toLocaleString('it-IT')} ${isTimer ? 's' : 'kg'}`, 'Volume']
                        }}
                      />
                      <Bar yAxisId="vol" dataKey="volume" fill="rgba(255,255,255,0.08)"
                        fillOpacity={1} radius={[3, 3, 0, 0]} />
                      <Line yAxisId="e1rm" type="monotone" dataKey="e1rm"
                        stroke="oklch(0.70 0.19 46)" strokeWidth={2.5}
                        dot={{ r: 3, fill: 'oklch(0.70 0.19 46)', strokeWidth: 0 }}
                        activeDot={{ r: 5 }} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>

                {eff && (
                  <div className="mt-4 px-4 py-3 rounded-xl"
                    style={{
                      background: eff.score >= 0 ? 'rgba(48,164,108,0.08)' : 'rgba(229,72,77,0.09)',
                      border: `1px solid ${eff.score >= 0 ? 'rgba(48,164,108,0.22)' : 'rgba(229,72,77,0.22)'}`,
                    }}>
                    <p className="text-xs font-semibold mb-0.5"
                      style={{ color: eff.score >= 0 ? '#b4e5c9' : '#ffb4b4' }}>
                      {eff.score >= 0 ? 'Progressione efficiente' : 'Progressione in calo'}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--c-60)' }}>
                      {isTimer
                        ? `Durata ${eff.deltaE1rm > 0 ? '+' : ''}${eff.deltaE1rm}% · volume ${eff.deltaVol > 0 ? '+' : ''}${eff.deltaVol}%`
                        : `e1RM ${eff.deltaE1rm > 0 ? '+' : ''}${eff.deltaE1rm}% · volume ${eff.deltaVol > 0 ? '+' : ''}${eff.deltaVol}%`
                      }
                      {eff.score >= 5 && ' — sta guadagnando forza con meno fatica.'}
                      {eff.score >= 0 && eff.score < 5 && ' — progressione stabile.'}
                      {eff.score < 0 && ' — potrebbe aver bisogno di un deload.'}
                    </p>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}
