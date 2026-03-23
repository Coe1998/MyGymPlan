'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface SchedaEsercizio {
  id: string
  serie: number
  ripetizioni: string
  recupero_secondi: number
  note: string | null
  ordine: number
  esercizi: { id: string; nome: string; muscoli: string[] | null; video_url: string | null }
}

interface LogSerie {
  numero_serie: number
  peso_kg: string
  ripetizioni: string
  completata: boolean
}

interface EsercizioLog {
  scheda_esercizio_id: string
  serie: LogSerie[]
}

interface UltimaSessioneSerie {
  numero_serie: number
  peso_kg: number | null
  ripetizioni: number | null
}

export default function AllenamentoPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const giornoId = searchParams.get('giorno')
  const assegnazioneId = searchParams.get('assegnazione')
  const supabase = createClient()

  const [giornoNome, setGiornoNome] = useState('')
  const [esercizi, setEsercizi] = useState<SchedaEsercizio[]>([])
  const [logs, setLogs] = useState<Record<string, EsercizioLog>>({})
  const [ultimaSessione, setUltimaSessione] = useState<Record<string, UltimaSessioneSerie[]>>({})
  const [sessioneId, setSessioneId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [completata, setCompletata] = useState(false)
  const [timerAttivo, setTimerAttivo] = useState(false)
  const [timerSecondi, setTimerSecondi] = useState(0)

  const fetchGiorno = useCallback(async () => {
    if (!giornoId || !assegnazioneId) return
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: giorno } = await supabase
      .from('scheda_giorni')
      .select(`id, nome, scheda_esercizi (
        id, serie, ripetizioni, recupero_secondi, note, ordine,
        esercizi ( id, nome, muscoli, video_url )
      )`)
      .eq('id', giornoId).single()

    if (!giorno) { setLoading(false); return }
    setGiornoNome((giorno as any).nome)
    const eserciziOrdinati = ((giorno as any).scheda_esercizi ?? []).sort((a: any, b: any) => a.ordine - b.ordine)
    setEsercizi(eserciziOrdinati)

    const oggi = new Date(); oggi.setHours(0, 0, 0, 0)
    const { data: sessioneEsistente } = await supabase
      .from('sessioni').select('id, completata')
      .eq('cliente_id', user.id).eq('giorno_id', giornoId)
      .eq('assegnazione_id', assegnazioneId).gte('data', oggi.toISOString()).single()

    let sessId: string
    if (sessioneEsistente) {
      sessId = sessioneEsistente.id
      setCompletata(sessioneEsistente.completata)
    } else {
      const { data: nuova } = await supabase.from('sessioni')
        .insert({ cliente_id: user.id, assegnazione_id: assegnazioneId, giorno_id: giornoId, completata: false })
        .select().single()
      sessId = nuova!.id
    }
    setSessioneId(sessId)

    const { data: logEsistenti } = await supabase.from('log_serie').select('*').eq('sessione_id', sessId)

    const { data: sessioniPrecedenti } = await supabase.from('sessioni')
      .select('id').eq('cliente_id', user.id).eq('giorno_id', giornoId)
      .eq('completata', true).neq('id', sessId).order('data', { ascending: false }).limit(1)

    const ultimaMap: Record<string, UltimaSessioneSerie[]> = {}
    if (sessioniPrecedenti && sessioniPrecedenti.length > 0) {
      const { data: logsUltima } = await supabase.from('log_serie')
        .select('scheda_esercizio_id, numero_serie, peso_kg, ripetizioni')
        .eq('sessione_id', sessioniPrecedenti[0].id)
      for (const log of (logsUltima ?? [])) {
        if (!ultimaMap[log.scheda_esercizio_id]) ultimaMap[log.scheda_esercizio_id] = []
        ultimaMap[log.scheda_esercizio_id].push({ numero_serie: log.numero_serie, peso_kg: log.peso_kg, ripetizioni: log.ripetizioni })
      }
    }
    setUltimaSessione(ultimaMap)

    const logsInit: Record<string, EsercizioLog> = {}
    for (const ese of eserciziOrdinati) {
      const serieLog: LogSerie[] = []
      for (let i = 1; i <= ese.serie; i++) {
        const es = logEsistenti?.find(l => l.scheda_esercizio_id === ese.id && l.numero_serie === i)
        serieLog.push({ numero_serie: i, peso_kg: es?.peso_kg?.toString() ?? '', ripetizioni: es?.ripetizioni?.toString() ?? '', completata: es?.completata ?? false })
      }
      logsInit[ese.id] = { scheda_esercizio_id: ese.id, serie: serieLog }
    }
    setLogs(logsInit)
    setLoading(false)
  }, [giornoId, assegnazioneId])

  useEffect(() => { fetchGiorno() }, [fetchGiorno])

  useEffect(() => {
    if (!timerAttivo) return
    if (timerSecondi <= 0) { setTimerAttivo(false); return }
    const interval = setInterval(() => setTimerSecondi(s => s - 1), 1000)
    return () => clearInterval(interval)
  }, [timerAttivo, timerSecondi])

  const updateLog = (eseId: string, serieIndex: number, field: 'peso_kg' | 'ripetizioni', value: string) => {
    setLogs(prev => ({
      ...prev,
      [eseId]: { ...prev[eseId], serie: prev[eseId].serie.map((s, i) => i === serieIndex ? { ...s, [field]: value } : s) }
    }))
  }

  const toggleSerie = async (ese: SchedaEsercizio, serieIndex: number) => {
    if (!sessioneId) return
    const log = logs[ese.id]?.serie[serieIndex]
    if (!log) return
    const nuovoStato = !log.completata
    setLogs(prev => ({
      ...prev,
      [ese.id]: { ...prev[ese.id], serie: prev[ese.id].serie.map((s, i) => i === serieIndex ? { ...s, completata: nuovoStato } : s) }
    }))
    const { data: existing } = await supabase.from('log_serie').select('id')
      .eq('sessione_id', sessioneId).eq('scheda_esercizio_id', ese.id).eq('numero_serie', serieIndex + 1).single()
    const payload = {
      sessione_id: sessioneId, scheda_esercizio_id: ese.id, numero_serie: serieIndex + 1,
      peso_kg: parseFloat(log.peso_kg) || null, ripetizioni: parseInt(log.ripetizioni) || null, completata: nuovoStato,
    }
    if (existing) { await supabase.from('log_serie').update(payload).eq('id', existing.id) }
    else { await supabase.from('log_serie').insert(payload) }
    if (nuovoStato) { setTimerSecondi(ese.recupero_secondi); setTimerAttivo(true) }
  }

  const handleCompleta = async () => {
    if (!sessioneId) return
    setSaving(true)
    await supabase.from('sessioni').update({ completata: true }).eq('id', sessioneId)
    setCompletata(true); setSaving(false)
  }

  const serieCompletate = Object.values(logs).reduce((acc, log) => acc + log.serie.filter(s => s.completata).length, 0)
  const serieTotali = esercizi.reduce((acc, e) => acc + e.serie, 0)
  const progressoPerc = serieTotali > 0 ? Math.round((serieCompletate / serieTotali) * 100) : 0

  const getConfronto = (eseId: string, serieIndex: number) =>
    ultimaSessione[eseId]?.find(s => s.numero_serie === serieIndex + 1) ?? null

  const getMiglioramento = (eseId: string, serieIndex: number) => {
    const c = getConfronto(eseId, serieIndex)
    const log = logs[eseId]?.serie[serieIndex]
    if (!c || !log?.completata) return null
    const pa = parseFloat(log.peso_kg), pu = c.peso_kg ?? 0
    if (!pa || !pu) return null
    return pa > pu ? 'up' : pa < pu ? 'down' : 'equal'
  }

  if (!giornoId || !assegnazioneId) {
    return (
      <div className="flex items-center justify-center min-h-64 p-4">
        <div className="text-center space-y-3">
          <p className="text-4xl">💪</p>
          <p className="font-semibold" style={{ color: 'oklch(0.97 0 0)' }}>Seleziona un giorno</p>
          <p className="text-sm" style={{ color: 'oklch(0.45 0 0)' }}>Vai alla dashboard e scegli il giorno</p>
          <button onClick={() => router.push('/cliente/dashboard')}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold"
            style={{ background: 'oklch(0.60 0.15 200)', color: 'oklch(0.13 0 0)' }}>
            ← Dashboard
          </button>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <p className="text-sm" style={{ color: 'oklch(0.45 0 0)' }}>Caricamento...</p>
      </div>
    )
  }

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/cliente/dashboard')}
            className="text-sm hover:opacity-70" style={{ color: 'oklch(0.50 0 0)' }}>←</button>
          <div>
            <h1 className="text-2xl lg:text-4xl font-black tracking-tight" style={{ color: 'oklch(0.97 0 0)' }}>
              {giornoNome}
            </h1>
            <p className="text-xs mt-0.5" style={{ color: 'oklch(0.50 0 0)' }}>
              {new Date().toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
          </div>
        </div>
        {completata && (
          <span className="px-3 py-1.5 rounded-xl text-xs font-semibold"
            style={{ background: 'oklch(0.65 0.18 150 / 20%)', color: 'oklch(0.65 0.18 150)' }}>
            ✅ Fatto
          </span>
        )}
      </div>

      {/* Progress bar */}
      <div className="rounded-2xl p-4 space-y-2"
        style={{ background: 'oklch(0.18 0 0)', border: '1px solid oklch(1 0 0 / 6%)' }}>
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium" style={{ color: 'oklch(0.60 0 0)' }}>Progresso</p>
          <p className="text-xs font-bold" style={{ color: 'oklch(0.97 0 0)' }}>{serieCompletate}/{serieTotali} · {progressoPerc}%</p>
        </div>
        <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: 'oklch(0.25 0 0)' }}>
          <div className="h-full rounded-full transition-all duration-500"
            style={{ width: `${progressoPerc}%`, background: 'oklch(0.60 0.15 200)' }} />
        </div>
      </div>

      {/* Timer recupero */}
      {timerAttivo && (
        <div className="rounded-2xl p-4 flex items-center justify-between"
          style={{ background: 'oklch(0.70 0.19 46 / 10%)', border: '1px solid oklch(0.70 0.19 46 / 30%)' }}>
          <div>
            <p className="text-sm font-semibold" style={{ color: 'oklch(0.70 0.19 46)' }}>⏱️ Recupero</p>
            <p className="text-xs mt-0.5" style={{ color: 'oklch(0.55 0 0)' }}>Prossima serie tra...</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-3xl font-black tabular-nums" style={{ color: 'oklch(0.70 0.19 46)' }}>
              {Math.floor(timerSecondi / 60).toString().padStart(2, '0')}:{(timerSecondi % 60).toString().padStart(2, '0')}
            </div>
            <button onClick={() => setTimerAttivo(false)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium"
              style={{ background: 'oklch(0.22 0 0)', color: 'oklch(0.60 0 0)' }}>
              Salta
            </button>
          </div>
        </div>
      )}

      {/* Esercizi */}
      <div className="space-y-4">
        {esercizi.map((ese, eseIndex) => {
          const eseLog = logs[ese.id]
          const tutteCompletate = eseLog?.serie.every(s => s.completata)

          return (
            <div key={ese.id} className="rounded-2xl overflow-hidden"
              style={{
                background: 'oklch(0.18 0 0)',
                border: `1px solid ${tutteCompletate ? 'oklch(0.65 0.18 150 / 30%)' : 'oklch(1 0 0 / 6%)'}`,
              }}>
              {/* Header esercizio */}
              <div className="px-4 py-3 flex items-center justify-between"
                style={{ borderBottom: '1px solid oklch(1 0 0 / 6%)' }}>
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0"
                    style={{
                      background: tutteCompletate ? 'oklch(0.65 0.18 150 / 20%)' : 'oklch(0.60 0.15 200 / 15%)',
                      color: tutteCompletate ? 'oklch(0.65 0.18 150)' : 'oklch(0.60 0.15 200)',
                    }}>
                    {tutteCompletate ? '✓' : eseIndex + 1}
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-sm truncate" style={{ color: 'oklch(0.97 0 0)' }}>
                      {ese.esercizi.nome}
                    </p>
                    <p className="text-xs" style={{ color: 'oklch(0.50 0 0)' }}>
                      {ese.serie} × {ese.ripetizioni} · {ese.recupero_secondi}s
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {ese.esercizi.video_url && (
                    <a href={ese.esercizi.video_url} target="_blank" rel="noopener noreferrer"
                      className="text-xs px-2 py-1 rounded-lg"
                      style={{ background: 'oklch(0.22 0 0)', color: 'oklch(0.60 0 0)' }}>
                      ▶
                    </a>
                  )}
                </div>
              </div>

              {/* Note coach */}
              {ese.note && (
                <div className="px-4 py-2" style={{ background: 'oklch(0.15 0 0)', borderBottom: '1px solid oklch(1 0 0 / 4%)' }}>
                  <p className="text-xs italic" style={{ color: 'oklch(0.55 0 0)' }}>📝 {ese.note}</p>
                </div>
              )}

              {/* Serie — layout mobile ottimizzato */}
              <div className="divide-y" style={{ borderColor: 'oklch(1 0 0 / 4%)' }}>
                {eseLog?.serie.map((serie, serieIndex) => {
                  const confronto = getConfronto(ese.id, serieIndex)
                  const miglioramento = getMiglioramento(ese.id, serieIndex)

                  return (
                    <div key={serieIndex}
                      className="px-4 py-3"
                      style={{ background: serie.completata ? 'oklch(0.65 0.18 150 / 5%)' : 'transparent' }}>

                      {/* Riga info */}
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold" style={{ color: 'oklch(0.50 0 0)' }}>
                          Serie {serieIndex + 1}
                        </span>
                        {confronto ? (
                          <span className="text-xs" style={{ color: 'oklch(0.40 0 0)' }}>
                            Ultima: {confronto.peso_kg ?? '—'}kg × {confronto.ripetizioni ?? '—'}
                          </span>
                        ) : (
                          <span className="text-xs" style={{ color: 'oklch(0.35 0 0)' }}>Prima volta</span>
                        )}
                      </div>

                      {/* Input + check — layout ottimizzato per mobile */}
                      <div className="flex items-center gap-3">
                        {/* Peso */}
                        <div className="flex-1">
                          <label className="text-xs mb-1 block" style={{ color: 'oklch(0.50 0 0)' }}>Peso (kg)</label>
                          <input
                            type="number"
                            inputMode="decimal"
                            value={serie.peso_kg}
                            onChange={(e) => updateLog(ese.id, serieIndex, 'peso_kg', e.target.value)}
                            placeholder={confronto?.peso_kg?.toString() ?? '0'}
                            disabled={completata}
                            className="w-full px-3 py-3 rounded-xl text-base text-center outline-none font-bold"
                            style={{
                              background: serie.completata ? 'oklch(0.65 0.18 150 / 10%)' : 'oklch(0.22 0 0)',
                              border: `1px solid ${serie.completata ? 'oklch(0.65 0.18 150 / 30%)' : 'oklch(1 0 0 / 8%)'}`,
                              color: 'oklch(0.97 0 0)',
                            }}
                          />
                        </div>

                        <span className="text-lg" style={{ color: 'oklch(0.35 0 0)' }}>×</span>

                        {/* Reps */}
                        <div className="flex-1">
                          <label className="text-xs mb-1 block" style={{ color: 'oklch(0.50 0 0)' }}>Reps</label>
                          <input
                            type="number"
                            inputMode="numeric"
                            value={serie.ripetizioni}
                            onChange={(e) => updateLog(ese.id, serieIndex, 'ripetizioni', e.target.value)}
                            placeholder={confronto?.ripetizioni?.toString() ?? '0'}
                            disabled={completata}
                            className="w-full px-3 py-3 rounded-xl text-base text-center outline-none font-bold"
                            style={{
                              background: serie.completata ? 'oklch(0.65 0.18 150 / 10%)' : 'oklch(0.22 0 0)',
                              border: `1px solid ${serie.completata ? 'oklch(0.65 0.18 150 / 30%)' : 'oklch(1 0 0 / 8%)'}`,
                              color: 'oklch(0.97 0 0)',
                            }}
                          />
                        </div>

                        {/* Check button — grande per il touch */}
                        <div className="flex flex-col items-center gap-1">
                          <label className="text-xs mb-1 block opacity-0">✓</label>
                          <button
                            onClick={() => toggleSerie(ese, serieIndex)}
                            disabled={completata}
                            className="w-12 h-12 rounded-xl flex items-center justify-center transition-all active:scale-95"
                            style={{
                              background: serie.completata ? 'oklch(0.65 0.18 150)' : 'oklch(0.25 0 0)',
                              border: `2px solid ${serie.completata ? 'oklch(0.65 0.18 150)' : 'oklch(1 0 0 / 15%)'}`,
                              cursor: completata ? 'not-allowed' : 'pointer',
                            }}>
                            {serie.completata
                              ? <span className="text-lg font-bold" style={{ color: 'oklch(0.13 0 0)' }}>✓</span>
                              : <span className="text-lg" style={{ color: 'oklch(0.35 0 0)' }}>○</span>
                            }
                          </button>
                          {miglioramento === 'up' && <span className="text-xs font-bold" style={{ color: 'oklch(0.65 0.18 150)' }}>▲</span>}
                          {miglioramento === 'down' && <span className="text-xs font-bold" style={{ color: 'oklch(0.75 0.15 27)' }}>▼</span>}
                          {miglioramento === 'equal' && <span className="text-xs" style={{ color: 'oklch(0.45 0 0)' }}>＝</span>}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {/* Bottone completa */}
      {!completata && (
        <div className="pb-4">
          <button
            onClick={handleCompleta}
            disabled={saving || progressoPerc < 100}
            className="w-full py-4 rounded-2xl font-bold text-base transition-all active:scale-95"
            style={{
              background: progressoPerc === 100 ? 'oklch(0.65 0.18 150)' : 'oklch(0.22 0 0)',
              color: progressoPerc === 100 ? 'oklch(0.13 0 0)' : 'oklch(0.40 0 0)',
              cursor: progressoPerc < 100 ? 'not-allowed' : 'pointer',
            }}>
            {saving ? 'Salvataggio...' : progressoPerc === 100
              ? '🎉 Completa allenamento'
              : `${progressoPerc}% — continua!`}
          </button>
        </div>
      )}

      {completata && (
        <div className="pb-4 text-center">
          <div className="rounded-2xl p-6"
            style={{ background: 'oklch(0.65 0.18 150 / 10%)', border: '1px solid oklch(0.65 0.18 150 / 30%)' }}>
            <p className="text-4xl mb-2">🎉</p>
            <p className="text-xl font-black" style={{ color: 'oklch(0.65 0.18 150)' }}>Completato!</p>
            <p className="text-sm mt-1" style={{ color: 'oklch(0.55 0 0)' }}>Ottimo lavoro oggi!</p>
            <button onClick={() => router.push('/cliente/dashboard')}
              className="mt-4 px-6 py-2.5 rounded-xl text-sm font-semibold"
              style={{ background: 'oklch(0.65 0.18 150)', color: 'oklch(0.13 0 0)' }}>
              Torna alla home
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
