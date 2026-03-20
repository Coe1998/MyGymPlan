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

export default function AllenamentoPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const giornoId = searchParams.get('giorno')
  const assegnazioneId = searchParams.get('assegnazione')
  const supabase = createClient()

  const [giornoNome, setGiornoNome] = useState('')
  const [esercizi, setEsercizi] = useState<SchedaEsercizio[]>([])
  const [logs, setLogs] = useState<Record<string, EsercizioLog>>({})
  const [sessioneId, setSessioneId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [completata, setCompletata] = useState(false)

  // Timer recupero
  const [timerAttivo, setTimerAttivo] = useState(false)
  const [timerSecondi, setTimerSecondi] = useState(0)
  const [timerMax, setTimerMax] = useState(90)

  const fetchGiorno = useCallback(async () => {
    if (!giornoId || !assegnazioneId) return
    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Fetch giorno e esercizi
    const { data: giorno } = await supabase
      .from('scheda_giorni')
      .select(`
        id, nome,
        scheda_esercizi (
          id, serie, ripetizioni, recupero_secondi, note, ordine,
          esercizi ( id, nome, muscoli, video_url )
        )
      `)
      .eq('id', giornoId)
      .single()

    if (!giorno) { setLoading(false); return }

    setGiornoNome((giorno as any).nome)
    const eserciziOrdinati = ((giorno as any).scheda_esercizi ?? [])
      .sort((a: any, b: any) => a.ordine - b.ordine)
    setEsercizi(eserciziOrdinati)

    // Crea o recupera la sessione di oggi
    const oggi = new Date()
    oggi.setHours(0, 0, 0, 0)

    const { data: sessioneEsistente } = await supabase
      .from('sessioni')
      .select('id, completata')
      .eq('cliente_id', user.id)
      .eq('giorno_id', giornoId)
      .eq('assegnazione_id', assegnazioneId)
      .gte('data', oggi.toISOString())
      .single()

    let sessId: string

    if (sessioneEsistente) {
      sessId = sessioneEsistente.id
      setCompletata(sessioneEsistente.completata)
    } else {
      const { data: nuovaSessione } = await supabase
        .from('sessioni')
        .insert({
          cliente_id: user.id,
          assegnazione_id: assegnazioneId,
          giorno_id: giornoId,
          completata: false,
        })
        .select()
        .single()
      sessId = nuovaSessione!.id
    }

    setSessioneId(sessId)

    // Carica log esistenti
    const { data: logEsistenti } = await supabase
      .from('log_serie')
      .select('*')
      .eq('sessione_id', sessId)

    // Inizializza i log
    const logsInit: Record<string, EsercizioLog> = {}
    for (const ese of eserciziOrdinati) {
      const serieLog: LogSerie[] = []
      for (let i = 1; i <= ese.serie; i++) {
        const esistente = logEsistenti?.find(l => l.scheda_esercizio_id === ese.id && l.numero_serie === i)
        serieLog.push({
          numero_serie: i,
          peso_kg: esistente?.peso_kg?.toString() ?? '',
          ripetizioni: esistente?.ripetizioni?.toString() ?? '',
          completata: esistente?.completata ?? false,
        })
      }
      logsInit[ese.id] = { scheda_esercizio_id: ese.id, serie: serieLog }
    }
    setLogs(logsInit)
    setLoading(false)
  }, [giornoId, assegnazioneId])

  useEffect(() => { fetchGiorno() }, [fetchGiorno])

  // Timer countdown
  useEffect(() => {
    if (!timerAttivo) return
    if (timerSecondi <= 0) { setTimerAttivo(false); return }
    const interval = setInterval(() => setTimerSecondi(s => s - 1), 1000)
    return () => clearInterval(interval)
  }, [timerAttivo, timerSecondi])

  const startTimer = (secondi: number) => {
    setTimerMax(secondi)
    setTimerSecondi(secondi)
    setTimerAttivo(true)
  }

  const updateLog = (eseId: string, serieIndex: number, field: 'peso_kg' | 'ripetizioni', value: string) => {
    setLogs(prev => ({
      ...prev,
      [eseId]: {
        ...prev[eseId],
        serie: prev[eseId].serie.map((s, i) => i === serieIndex ? { ...s, [field]: value } : s)
      }
    }))
  }

  const toggleSerie = async (ese: SchedaEsercizio, serieIndex: number) => {
    if (!sessioneId) return
    const log = logs[ese.id]?.serie[serieIndex]
    if (!log) return

    const nuovoStato = !log.completata
    updateLog(ese.id, serieIndex, 'peso_kg', log.peso_kg)

    setLogs(prev => ({
      ...prev,
      [ese.id]: {
        ...prev[ese.id],
        serie: prev[ese.id].serie.map((s, i) => i === serieIndex ? { ...s, completata: nuovoStato } : s)
      }
    }))

    // Salva su DB
    const { data: existing } = await supabase
      .from('log_serie')
      .select('id')
      .eq('sessione_id', sessioneId)
      .eq('scheda_esercizio_id', ese.id)
      .eq('numero_serie', serieIndex + 1)
      .single()

    const payload = {
      sessione_id: sessioneId,
      scheda_esercizio_id: ese.id,
      numero_serie: serieIndex + 1,
      peso_kg: parseFloat(log.peso_kg) || null,
      ripetizioni: parseInt(log.ripetizioni) || null,
      completata: nuovoStato,
    }

    if (existing) {
      await supabase.from('log_serie').update(payload).eq('id', existing.id)
    } else {
      await supabase.from('log_serie').insert(payload)
    }

    // Avvia timer se completata
    if (nuovoStato) startTimer(ese.recupero_secondi)
  }

  const handleCompleta = async () => {
    if (!sessioneId) return
    setSaving(true)
    await supabase.from('sessioni').update({ completata: true }).eq('id', sessioneId)
    setCompletata(true)
    setSaving(false)
  }

  const serieCompletate = Object.values(logs).reduce((acc, log) =>
    acc + log.serie.filter(s => s.completata).length, 0)
  const serieTotali = esercizi.reduce((acc, e) => acc + e.serie, 0)
  const progressoPerc = serieTotali > 0 ? Math.round((serieCompletate / serieTotali) * 100) : 0

  if (!giornoId || !assegnazioneId) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-center space-y-3">
          <p className="text-4xl">💪</p>
          <p className="font-semibold" style={{ color: 'oklch(0.97 0 0)' }}>Seleziona un giorno</p>
          <p className="text-sm" style={{ color: 'oklch(0.45 0 0)' }}>
            Vai alla dashboard e scegli il giorno da allenare
          </p>
          <button onClick={() => router.push('/cliente/dashboard')}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold"
            style={{ background: 'oklch(0.60 0.15 200)', color: 'oklch(0.13 0 0)' }}>
            ← Torna alla dashboard
          </button>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <p className="text-sm" style={{ color: 'oklch(0.45 0 0)' }}>Caricamento allenamento...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => router.push('/cliente/dashboard')}
            className="text-sm hover:opacity-70 transition-opacity"
            style={{ color: 'oklch(0.50 0 0)' }}>
            ← Dashboard
          </button>
          <div>
            <h1 className="text-4xl font-black tracking-tight" style={{ color: 'oklch(0.97 0 0)' }}>
              {giornoNome}
            </h1>
            <p className="text-sm mt-1" style={{ color: 'oklch(0.50 0 0)' }}>
              {new Date().toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
          </div>
        </div>
        {completata && (
          <span className="px-4 py-2 rounded-xl text-sm font-semibold"
            style={{ background: 'oklch(0.65 0.18 150 / 20%)', color: 'oklch(0.65 0.18 150)' }}>
            ✅ Completato
          </span>
        )}
      </div>

      {/* Progress bar */}
      <div className="rounded-2xl p-5 space-y-3"
        style={{ background: 'oklch(0.18 0 0)', border: '1px solid oklch(1 0 0 / 6%)' }}>
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium" style={{ color: 'oklch(0.70 0 0)' }}>
            Progresso allenamento
          </p>
          <p className="text-sm font-bold" style={{ color: 'oklch(0.97 0 0)' }}>
            {serieCompletate}/{serieTotali} serie
          </p>
        </div>
        <div className="w-full h-2 rounded-full overflow-hidden"
          style={{ background: 'oklch(0.25 0 0)' }}>
          <div className="h-full rounded-full transition-all duration-500"
            style={{ width: `${progressoPerc}%`, background: 'oklch(0.60 0.15 200)' }} />
        </div>
        <p className="text-xs text-right font-semibold" style={{ color: 'oklch(0.60 0.15 200)' }}>
          {progressoPerc}%
        </p>
      </div>

      {/* Timer recupero */}
      {timerAttivo && (
        <div className="rounded-2xl p-5 flex items-center justify-between"
          style={{ background: 'oklch(0.70 0.19 46 / 10%)', border: '1px solid oklch(0.70 0.19 46 / 30%)' }}>
          <div>
            <p className="text-sm font-semibold" style={{ color: 'oklch(0.70 0.19 46)' }}>⏱️ Recupero in corso</p>
            <p className="text-xs mt-0.5" style={{ color: 'oklch(0.55 0 0)' }}>Riposati prima della prossima serie</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-4xl font-black tabular-nums" style={{ color: 'oklch(0.70 0.19 46)' }}>
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
      <div className="space-y-5">
        {esercizi.map((ese, eseIndex) => {
          const eseLog = logs[ese.id]
          const tutteCompletate = eseLog?.serie.every(s => s.completata)

          return (
            <div key={ese.id} className="rounded-2xl overflow-hidden"
              style={{
                background: 'oklch(0.18 0 0)',
                border: `1px solid ${tutteCompletate ? 'oklch(0.65 0.18 150 / 30%)' : 'oklch(1 0 0 / 6%)'}`,
              }}>
              {/* Esercizio header */}
              <div className="px-5 py-4 flex items-center justify-between"
                style={{ borderBottom: '1px solid oklch(1 0 0 / 6%)' }}>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0"
                    style={{
                      background: tutteCompletate ? 'oklch(0.65 0.18 150 / 20%)' : 'oklch(0.60 0.15 200 / 15%)',
                      color: tutteCompletate ? 'oklch(0.65 0.18 150)' : 'oklch(0.60 0.15 200)',
                    }}>
                    {tutteCompletate ? '✓' : eseIndex + 1}
                  </div>
                  <div>
                    <p className="font-bold" style={{ color: 'oklch(0.97 0 0)' }}>{ese.esercizi.nome}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs" style={{ color: 'oklch(0.50 0 0)' }}>
                        {ese.serie} serie × {ese.ripetizioni} reps · {ese.recupero_secondi}s recupero
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {ese.esercizi.video_url && (
                    <a href={ese.esercizi.video_url} target="_blank" rel="noopener noreferrer"
                      className="text-xs px-2.5 py-1.5 rounded-lg transition-opacity hover:opacity-70"
                      style={{ background: 'oklch(0.65 0.22 27 / 15%)', color: 'oklch(0.75 0.15 27)' }}>
                      ▶ Video
                    </a>
                  )}
                  {ese.esercizi.muscoli?.slice(0, 2).map(m => (
                    <span key={m} className="text-xs px-2 py-1 rounded-full"
                      style={{ background: 'oklch(0.60 0.15 200 / 15%)', color: 'oklch(0.60 0.15 200)' }}>
                      {m}
                    </span>
                  ))}
                </div>
              </div>

              {/* Note coach */}
              {ese.note && (
                <div className="px-5 py-2.5"
                  style={{ background: 'oklch(0.15 0 0)', borderBottom: '1px solid oklch(1 0 0 / 4%)' }}>
                  <p className="text-xs italic" style={{ color: 'oklch(0.55 0 0)' }}>
                    📝 {ese.note}
                  </p>
                </div>
              )}

              {/* Header colonne */}
              <div className="px-5 py-2 grid grid-cols-12 gap-2"
                style={{ background: 'oklch(0.15 0 0)', borderBottom: '1px solid oklch(1 0 0 / 4%)' }}>
                <p className="col-span-1 text-xs font-semibold" style={{ color: 'oklch(0.40 0 0)' }}>Serie</p>
                <p className="col-span-3 text-xs font-semibold" style={{ color: 'oklch(0.40 0 0)' }}>Obiettivo</p>
                <p className="col-span-3 text-xs font-semibold" style={{ color: 'oklch(0.40 0 0)' }}>Peso (kg)</p>
                <p className="col-span-3 text-xs font-semibold" style={{ color: 'oklch(0.40 0 0)' }}>Reps</p>
                <p className="col-span-2 text-xs font-semibold text-center" style={{ color: 'oklch(0.40 0 0)' }}>✓</p>
              </div>

              {/* Serie */}
              {eseLog?.serie.map((serie, serieIndex) => (
                <div key={serieIndex}
                  className="px-5 py-3 grid grid-cols-12 gap-2 items-center"
                  style={{
                    borderBottom: serieIndex < ese.serie - 1 ? '1px solid oklch(1 0 0 / 4%)' : 'none',
                    background: serie.completata ? 'oklch(0.65 0.18 150 / 5%)' : 'transparent',
                  }}>
                  {/* Numero serie */}
                  <div className="col-span-1">
                    <span className="text-sm font-bold" style={{ color: 'oklch(0.60 0 0)' }}>
                      {serieIndex + 1}
                    </span>
                  </div>

                  {/* Obiettivo */}
                  <div className="col-span-3">
                    <span className="text-sm" style={{ color: 'oklch(0.55 0 0)' }}>
                      {ese.ripetizioni} reps
                    </span>
                  </div>

                  {/* Peso input */}
                  <div className="col-span-3">
                    <input
                      type="number"
                      value={serie.peso_kg}
                      onChange={(e) => updateLog(ese.id, serieIndex, 'peso_kg', e.target.value)}
                      placeholder="0"
                      disabled={completata}
                      className="w-full px-3 py-2 rounded-lg text-sm text-center outline-none transition-all"
                      style={{
                        background: serie.completata ? 'oklch(0.65 0.18 150 / 10%)' : 'oklch(0.22 0 0)',
                        border: `1px solid ${serie.completata ? 'oklch(0.65 0.18 150 / 30%)' : 'oklch(1 0 0 / 8%)'}`,
                        color: 'oklch(0.97 0 0)',
                      }}
                      onFocus={(e) => !completata && (e.target.style.borderColor = 'oklch(0.60 0.15 200)')}
                      onBlur={(e) => (e.target.style.borderColor = serie.completata ? 'oklch(0.65 0.18 150 / 30%)' : 'oklch(1 0 0 / 8%)')}
                    />
                  </div>

                  {/* Reps input */}
                  <div className="col-span-3">
                    <input
                      type="number"
                      value={serie.ripetizioni}
                      onChange={(e) => updateLog(ese.id, serieIndex, 'ripetizioni', e.target.value)}
                      placeholder="0"
                      disabled={completata}
                      className="w-full px-3 py-2 rounded-lg text-sm text-center outline-none transition-all"
                      style={{
                        background: serie.completata ? 'oklch(0.65 0.18 150 / 10%)' : 'oklch(0.22 0 0)',
                        border: `1px solid ${serie.completata ? 'oklch(0.65 0.18 150 / 30%)' : 'oklch(1 0 0 / 8%)'}`,
                        color: 'oklch(0.97 0 0)',
                      }}
                      onFocus={(e) => !completata && (e.target.style.borderColor = 'oklch(0.60 0.15 200)')}
                      onBlur={(e) => (e.target.style.borderColor = serie.completata ? 'oklch(0.65 0.18 150 / 30%)' : 'oklch(1 0 0 / 8%)')}
                    />
                  </div>

                  {/* Checkmark */}
                  <div className="col-span-2 flex justify-center">
                    <button
                      onClick={() => toggleSerie(ese, serieIndex)}
                      disabled={completata}
                      className="w-9 h-9 rounded-xl flex items-center justify-center transition-all active:scale-95"
                      style={{
                        background: serie.completata ? 'oklch(0.65 0.18 150)' : 'oklch(0.25 0 0)',
                        border: `2px solid ${serie.completata ? 'oklch(0.65 0.18 150)' : 'oklch(1 0 0 / 15%)'}`,
                        cursor: completata ? 'not-allowed' : 'pointer',
                      }}>
                      {serie.completata && (
                        <span className="text-sm font-bold" style={{ color: 'oklch(0.13 0 0)' }}>✓</span>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )
        })}
      </div>

      {/* Bottone completa */}
      {!completata && (
        <div className="pb-8">
          <button
            onClick={handleCompleta}
            disabled={saving || progressoPerc < 100}
            className="w-full py-4 rounded-2xl font-bold text-base transition-all active:scale-95"
            style={{
              background: progressoPerc === 100 ? 'oklch(0.65 0.18 150)' : 'oklch(0.22 0 0)',
              color: progressoPerc === 100 ? 'oklch(0.13 0 0)' : 'oklch(0.40 0 0)',
              cursor: progressoPerc < 100 ? 'not-allowed' : 'pointer',
            }}>
            {saving ? 'Salvataggio...' : progressoPerc === 100 ? '🎉 Completa allenamento' : `Completa tutte le serie per finire (${progressoPerc}%)`}
          </button>
        </div>
      )}

      {completata && (
        <div className="pb-8 text-center space-y-4">
          <div className="rounded-2xl p-8"
            style={{ background: 'oklch(0.65 0.18 150 / 10%)', border: '1px solid oklch(0.65 0.18 150 / 30%)' }}>
            <p className="text-4xl mb-3">🎉</p>
            <p className="text-xl font-black" style={{ color: 'oklch(0.65 0.18 150)' }}>Allenamento completato!</p>
            <p className="text-sm mt-2" style={{ color: 'oklch(0.55 0 0)' }}>
              Ottimo lavoro! Torna alla dashboard per vedere i tuoi progressi.
            </p>
            <button onClick={() => router.push('/cliente/dashboard')}
              className="mt-4 px-6 py-2.5 rounded-xl text-sm font-semibold transition-all"
              style={{ background: 'oklch(0.65 0.18 150)', color: 'oklch(0.13 0 0)' }}>
              Torna alla dashboard
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
