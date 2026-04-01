'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Props { clienteId: string }

interface Sessione {
  id: string
  data: string
  completata: boolean
  durata_secondi: number | null
  giornoNome: string
}

interface LogSerie {
  numero_serie: number
  peso_kg: number | null
  ripetizioni: number | null
  completata: boolean
  nomeEsercizio: string
  ordine: number
}

const PAGE_SIZE = 10

export default function StoricoSessioni({ clienteId }: Props) {
  const supabase = useMemo(() => createClient(), [])
  const [sessioni, setSessioni] = useState<Sessione[]>([])
  const [loading, setLoading] = useState(true)
  const [pagina, setPagina] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [aperta, setAperta] = useState<string | null>(null)
  const [logMap, setLogMap] = useState<Record<string, LogSerie[]>>({})
  const [loadingLog, setLoadingLog] = useState<string | null>(null)

  useEffect(() => {
    const fetch = async () => {
      setLoading(true)
      const from = pagina * PAGE_SIZE
      const to = from + PAGE_SIZE - 1
      const dataInizio = new Date(Date.now() - 90 * 86400000).toISOString()

      const { data, count } = await supabase
        .from('sessioni')
        .select('id, data, completata, durata_secondi, scheda_giorni ( nome )', { count: 'estimated' })
        .eq('cliente_id', clienteId)
        .gte('data', pagina === 0 ? dataInizio : '2000-01-01')
        .order('data', { ascending: false })
        .range(from, to)

      const mapped = (data ?? []).map((s: any) => ({
        id: s.id,
        data: s.data,
        completata: s.completata,
        durata_secondi: s.durata_secondi,
        giornoNome: s.scheda_giorni?.nome ?? 'Allenamento',
      }))

      setSessioni(prev => pagina === 0 ? mapped : [...prev, ...mapped])
      setHasMore((count ?? 0) > (pagina + 1) * PAGE_SIZE)
      setLoading(false)
    }
    fetch()
  }, [clienteId, pagina])

  const toggleSessione = async (id: string) => {
    if (aperta === id) { setAperta(null); return }
    setAperta(id)
    if (logMap[id]) return
    setLoadingLog(id)
    const { data } = await supabase
      .from('log_serie')
      .select('numero_serie, peso_kg, ripetizioni, completata, scheda_esercizi(ordine, esercizi!scheda_esercizi_esercizio_id_fkey(nome))')
      .eq('sessione_id', id)
      .order('numero_serie')
    const mapped: LogSerie[] = (data ?? []).map((r: any) => ({
      numero_serie: r.numero_serie,
      peso_kg: r.peso_kg,
      ripetizioni: r.ripetizioni,
      completata: r.completata,
      nomeEsercizio: r.scheda_esercizi?.esercizi?.nome ?? 'Esercizio',
      ordine: r.scheda_esercizi?.ordine ?? 999,
    }))
    setLogMap(prev => ({ ...prev, [id]: mapped }))
    setLoadingLog(null)
  }

  const formatDurata = (sec: number | null) => {
    if (!sec) return null
    const h = Math.floor(sec / 3600)
    const m = Math.floor((sec % 3600) / 60)
    return h > 0 ? `${h}h ${m}min` : `${m}min`
  }

  const raggruppaPerEsercizio = (logs: LogSerie[]) => {
    const map = new Map<string, LogSerie[]>()
    for (const l of logs) {
      if (!map.has(l.nomeEsercizio)) map.set(l.nomeEsercizio, [])
      map.get(l.nomeEsercizio)!.push(l)
    }
    return Array.from(map.entries()).sort((a, b) => {
      const ordineA = Math.min(...a[1].map(s => s.ordine))
      const ordineB = Math.min(...b[1].map(s => s.ordine))
      return ordineA - ordineB
    })
  }

  return (
    <div className="rounded-2xl overflow-hidden"
      style={{ background: 'oklch(0.18 0 0)', border: '1px solid oklch(1 0 0 / 6%)' }}>
      <div className="px-5 py-4" style={{ borderBottom: '1px solid oklch(1 0 0 / 6%)' }}>
        <h2 className="font-bold" style={{ color: 'oklch(0.97 0 0)' }}>Storico sessioni</h2>
        <p className="text-xs mt-0.5" style={{ color: 'oklch(0.45 0 0)' }}>Ultimi 90 giorni</p>
      </div>

      {loading && pagina === 0 ? (
        <div className="py-8 text-center">
          <p className="text-sm" style={{ color: 'oklch(0.45 0 0)' }}>Caricamento...</p>
        </div>
      ) : sessioni.length === 0 ? (
        <div className="py-8 text-center">
          <p className="text-sm" style={{ color: 'oklch(0.45 0 0)' }}>Nessuna sessione nel periodo</p>
        </div>
      ) : (
        <>
          <div>
            {sessioni.map((s, i) => {
              const isAperta = aperta === s.id
              const logs = logMap[s.id] ?? []
              const esercizi = isAperta ? raggruppaPerEsercizio(logs) : []
              return (
                <div key={s.id} style={{ borderBottom: i < sessioni.length - 1 ? '1px solid oklch(1 0 0 / 4%)' : 'none' }}>
                  {/* Header sessione */}
                  <div
                    onClick={() => toggleSessione(s.id)}
                    className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-white/[0.02] transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{
                          background: s.completata ? 'oklch(0.65 0.18 150 / 15%)' : 'oklch(0.22 0 0)',
                          color: s.completata ? 'oklch(0.65 0.18 150)' : 'oklch(0.45 0 0)',
                        }}>
                        <span className="text-xs font-bold">{s.completata ? '✓' : '○'}</span>
                      </div>
                      <div>
                        <p className="text-sm font-semibold" style={{ color: 'oklch(0.90 0 0)' }}>
                          {s.giornoNome}
                        </p>
                        <p className="text-xs" style={{ color: 'oklch(0.50 0 0)' }}>
                          {new Date(s.data).toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' })}
                          {formatDurata(s.durata_secondi) ? ` · ${formatDurata(s.durata_secondi)}` : ''}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs transition-transform" style={{ color: 'oklch(0.45 0 0)', display: 'inline-block', transform: isAperta ? 'rotate(90deg)' : 'rotate(0deg)' }}>
                      ›
                    </span>
                  </div>

                  {/* Dettaglio esercizi */}
                  {isAperta && (
                    <div style={{ borderTop: '1px solid oklch(1 0 0 / 6%)', background: 'oklch(0.15 0 0)' }}>
                      {loadingLog === s.id ? (
                        <p className="px-5 py-4 text-sm" style={{ color: 'oklch(0.45 0 0)' }}>Caricamento...</p>
                      ) : logs.length === 0 ? (
                        <p className="px-5 py-4 text-sm" style={{ color: 'oklch(0.45 0 0)' }}>Nessun dato registrato</p>
                      ) : (
                        <div className="divide-y" style={{ borderColor: 'oklch(1 0 0 / 4%)' }}>
                          {esercizi.map(([nome, serie]) => (
                            <div key={nome} className="px-5 py-3 space-y-2">
                              <p className="text-xs font-bold" style={{ color: 'oklch(0.70 0.19 46)' }}>{nome}</p>
                              <div className="space-y-1">
                                {serie.map((r, idx) => (
                                  <div key={idx} className="flex items-center gap-3 px-3 py-1.5 rounded-lg"
                                    style={{
                                      background: r.completata ? 'oklch(0.65 0.18 150 / 8%)' : 'oklch(0.22 0 0)',
                                      border: `1px solid ${r.completata ? 'oklch(0.65 0.18 150 / 20%)' : 'oklch(1 0 0 / 5%)'}`,
                                    }}>
                                    <span className="text-xs w-12 flex-shrink-0" style={{ color: 'oklch(0.50 0 0)' }}>
                                      Serie {r.numero_serie}
                                    </span>
                                    {r.completata ? (
                                      <>
                                        <span className="text-sm font-black flex-1" style={{ color: 'oklch(0.97 0 0)' }}>
                                          {r.peso_kg ?? '—'} kg
                                        </span>
                                        <span className="text-sm font-black" style={{ color: 'oklch(0.97 0 0)' }}>
                                          × {r.ripetizioni ?? '—'} reps
                                        </span>
                                        <span className="text-xs" style={{ color: 'oklch(0.65 0.18 150)' }}>✓</span>
                                      </>
                                    ) : (
                                      <span className="text-xs flex-1" style={{ color: 'oklch(0.40 0 0)' }}>Non completata</span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {hasMore && (
            <div className="px-5 py-4">
              <button
                onClick={() => setPagina(p => p + 1)}
                disabled={loading}
                className="w-full py-2.5 rounded-xl text-xs font-semibold transition-all"
                style={{ background: 'oklch(0.22 0 0)', color: 'oklch(0.55 0 0)', border: '1px solid oklch(1 0 0 / 8%)' }}>
                {loading ? 'Caricamento...' : 'Mostra sessioni precedenti'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
