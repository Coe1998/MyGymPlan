'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import ShareOverlay from '@/components/shared/ShareOverlay'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faDumbbell, faCircleCheck, faPause, faStopwatch, faNoteSticky, faTrophy, faCircleInfo, faXmark } from '@fortawesome/free-solid-svg-icons'

interface SchedaEsercizio {
  id: string
  serie: number
  ripetizioni: string
  recupero_secondi: number
  note: string | null
  ordine: number
  esercizi: { id: string; nome: string; muscoli: string[] | null; video_url: string | null; descrizione: string | null }
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
  const sessioneIdParam = searchParams.get('sessione') // per visualizzare sessioni passate
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
  const [durataSecondi, setDurataSecondi] = useState(0)
  const [sessioneData, setSessioneData] = useState<string | null>(null)
  const [noteAperta, setNoteAperta] = useState<string | null>(null)
  const durataRef = useRef<NodeJS.Timeout | null>(null)
  const hasAutoCompleted = useRef(false)
  const durataSecondiRef = useRef(0)
  const isViewMode = !!sessioneIdParam

  const fetchGiorno = useCallback(async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Modalità visualizzazione sessione passata
    if (sessioneIdParam) {
      const { data: sessione } = await supabase
        .from('sessioni')
        .select(`id, data, completata, giorno_id, assegnazione_id, scheda_giorni ( nome )`)
        .eq('id', sessioneIdParam)
        .single()

      if (!sessione) { setLoading(false); return }
      setSessioneId(sessione.id)
      setCompletata(sessione.completata)
      setSessioneData(sessione.data)
      setGiornoNome((sessione as any).scheda_giorni?.nome ?? '')

      // Calcola durata approssimativa (non disponibile, usiamo 0)
      setDurataSecondi(0)

      const { data: giorno } = await supabase
        .from('scheda_giorni')
        .select(`id, nome, scheda_esercizi (
          id, serie, ripetizioni, recupero_secondi, note, ordine,
          esercizi ( id, nome, muscoli, video_url, descrizione )
        )`)
        .eq('id', sessione.giorno_id)
        .single()

      if (!giorno) { setLoading(false); return }
      const eserciziOrdinati = ((giorno as any).scheda_esercizi ?? []).sort((a: any, b: any) => a.ordine - b.ordine)
      setEsercizi(eserciziOrdinati)

      const { data: logEsistenti } = await supabase.from('log_serie').select('*').eq('sessione_id', sessioneIdParam)

      const logsInit: Record<string, EsercizioLog> = {}
      for (const ese of eserciziOrdinati) {
        const serieLog: LogSerie[] = []
        for (let i = 1; i <= ese.serie; i++) {
          const es = logEsistenti?.find((l: any) => l.scheda_esercizio_id === ese.id && l.numero_serie === i)
          serieLog.push({ numero_serie: i, peso_kg: es?.peso_kg?.toString() ?? '', ripetizioni: es?.ripetizioni?.toString() ?? '', completata: es?.completata ?? false })
        }
        logsInit[ese.id] = { scheda_esercizio_id: ese.id, serie: serieLog }
      }
      setLogs(logsInit)
      setLoading(false)
      return
    }

    if (!giornoId || !assegnazioneId) { setLoading(false); return }

    const { data: giorno } = await supabase
      .from('scheda_giorni')
      .select(`id, nome, scheda_esercizi (
        id, serie, ripetizioni, recupero_secondi, note, ordine,
        esercizi ( id, nome, muscoli, video_url, descrizione )
      )`)
      .eq('id', giornoId).single()

    if (!giorno) { setLoading(false); return }
    setGiornoNome((giorno as any).nome)
    const eserciziOrdinati = ((giorno as any).scheda_esercizi ?? []).sort((a: any, b: any) => a.ordine - b.ordine)
    setEsercizi(eserciziOrdinati)

    const oggi = new Date(); oggi.setHours(0, 0, 0, 0)
    const { data: sessioneEsistente } = await supabase
      .from('sessioni').select('id, completata, data')
      .eq('cliente_id', user.id).eq('giorno_id', giornoId)
      .eq('assegnazione_id', assegnazioneId).gte('data', oggi.toISOString()).single()

    let sessId: string
    if (sessioneEsistente) {
      sessId = sessioneEsistente.id
      setCompletata(sessioneEsistente.completata)
      setSessioneData(sessioneEsistente.data)
      if (!sessioneEsistente.completata) {
        const elapsed = Math.floor((Date.now() - new Date(sessioneEsistente.data).getTime()) / 1000)
        setDurataSecondi(elapsed)
      }
    } else {
      const { data: nuova } = await supabase.from('sessioni')
        .insert({ cliente_id: user.id, assegnazione_id: assegnazioneId, giorno_id: giornoId, completata: false })
        .select().single()
      sessId = nuova!.id
      setSessioneData(nuova!.data)
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
  }, [giornoId, assegnazioneId, sessioneIdParam])

  useEffect(() => { fetchGiorno() }, [fetchGiorno])

  useEffect(() => { durataSecondiRef.current = durataSecondi }, [durataSecondi])

  useEffect(() => {
    if (timerSecondi <= 0) { setTimerAttivo(false); return }
    const interval = setInterval(() => setTimerSecondi(s => s - 1), 1000)
    return () => clearInterval(interval)
  }, [timerAttivo, timerSecondi])

  useEffect(() => {
    if (completata || loading || isViewMode) return
    durataRef.current = setInterval(() => setDurataSecondi(s => s + 1), 1000)
    return () => { if (durataRef.current) clearInterval(durataRef.current) }
  }, [completata, loading, isViewMode])

  // Auto-stop timer quando tutte le serie sono completate
  useEffect(() => {
    if (isViewMode || completata || loading) return
    const serieTot = esercizi.reduce((acc, e) => acc + e.serie, 0)
    if (serieTot === 0) return
    const serieComp = Object.values(logs).reduce((acc, log) => acc + log.serie.filter(s => s.completata).length, 0)
    if (serieComp === serieTot && durataRef.current) {
      clearInterval(durataRef.current)
      durataRef.current = null
    }
  }, [logs, esercizi, isViewMode, completata, loading])

  // Auto-completa sessione quando tutte le serie sono spuntate
  useEffect(() => {
    if (isViewMode || completata || loading || !sessioneId || hasAutoCompleted.current) return
    const serieTot = esercizi.reduce((acc, e) => acc + e.serie, 0)
    if (serieTot === 0) return
    const serieComp = Object.values(logs).reduce((acc, log) => acc + log.serie.filter(s => s.completata).length, 0)
    if (serieComp === serieTot) {
      hasAutoCompleted.current = true
      if (durataRef.current) { clearInterval(durataRef.current); durataRef.current = null }
      const durataCorrente = durataSecondiRef.current
      supabase.from('sessioni')
        .update({ completata: true, durata_secondi: durataCorrente })
        .eq('id', sessioneId)
        .then(() => setCompletata(true))
    }
  }, [logs, esercizi, isViewMode, completata, loading, sessioneId])

  const formatDurata = (sec: number) => {
    const h = Math.floor(sec / 3600)
    const m = Math.floor((sec % 3600) / 60)
    const s = sec % 60
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  const updateLog = (eseId: string, serieIndex: number, field: 'peso_kg' | 'ripetizioni', value: string) => {
    if (isViewMode) return
    setLogs(prev => ({
      ...prev,
      [eseId]: { ...prev[eseId], serie: prev[eseId].serie.map((s, i) => i === serieIndex ? { ...s, [field]: value } : s) }
    }))
  }

  const toggleSerie = async (ese: SchedaEsercizio, serieIndex: number) => {
    if (!sessioneId || isViewMode) return
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

    // Se era l'ultima serie, marca la sessione come completata su Supabase
    if (nuovoStato) {
      const logsAggiornati = {
        ...logs,
        [ese.id]: { ...logs[ese.id], serie: logs[ese.id].serie.map((s, i) => i === serieIndex ? { ...s, completata: true } : s) }
      }
      const serieTot = esercizi.reduce((acc, e) => acc + e.serie, 0)
      const serieComp = Object.values(logsAggiornati).reduce((acc, l) => acc + l.serie.filter(s => s.completata).length, 0)
      if (serieComp >= serieTot) {
        if (durataRef.current) { clearInterval(durataRef.current); durataRef.current = null }
        await supabase.from('sessioni').update({ completata: true, durata_secondi: durataSecondi }).eq('id', sessioneId)
        setCompletata(true)
      }
    }
  }

  const handleCompleta = async () => {
    if (!sessioneId) return
    setSaving(true)
    if (durataRef.current) clearInterval(durataRef.current)
    await supabase.from('sessioni')
      .update({ completata: true, durata_secondi: durataSecondi })
      .eq('id', sessioneId)
    setCompletata(true)
    setSaving(false)
  }

  const serieCompletate = Object.values(logs).reduce((acc, log) => acc + log.serie.filter(s => s.completata).length, 0)
  const serieTotali = esercizi.reduce((acc, e) => acc + e.serie, 0)
  const progressoPerc = serieTotali > 0 ? Math.round((serieCompletate / serieTotali) * 100) : 0

  const volumeTotale = Object.values(logs).reduce((acc, log) =>
    acc + log.serie.filter(s => s.completata).reduce((a, s) =>
      a + ((parseFloat(s.peso_kg) || 0) * (parseInt(s.ripetizioni) || 0)), 0), 0)

  const calcolaNuovoPR = (): { nome: string; peso: number } | null => {
    for (const ese of esercizi) {
      const eseLog = logs[ese.id]
      const ultimi = ultimaSessione[ese.id]
      if (!eseLog || !ultimi) continue
      for (const serie of eseLog.serie) {
        if (!serie.completata) continue
        const pesoAttuale = parseFloat(serie.peso_kg) || 0
        const ultimoPeso = ultimi.find(u => u.numero_serie === serie.numero_serie)?.peso_kg ?? 0
        if (pesoAttuale > (ultimoPeso ?? 0) && pesoAttuale > 0) return { nome: ese.esercizi.nome, peso: pesoAttuale }
      }
    }
    return null
  }

  const calcolaEserciziHighlight = (): { nome: string; pesoMax: number }[] => {
    return esercizi
      .map(ese => {
        const eseLog = logs[ese.id]
        if (!eseLog) return null
        const pesi = eseLog.serie
          .filter(s => s.completata && parseFloat(s.peso_kg) > 0)
          .map(s => parseFloat(s.peso_kg))
        if (pesi.length === 0) return null
        return { nome: ese.esercizi.nome, pesoMax: Math.max(...pesi) }
      })
      .filter(Boolean) as { nome: string; pesoMax: number }[]
  }

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

  const backUrl = isViewMode ? '/cliente/progressi' : '/cliente/dashboard'

  if (!giornoId && !sessioneIdParam) {
    return (
      <div className="flex items-center justify-center min-h-64 p-4">
        <div className="text-center space-y-3">
          <p className="text-4xl"><FontAwesomeIcon icon={faDumbbell} /></p>
          <p className="font-semibold" style={{ color: 'oklch(0.97 0 0)' }}>Seleziona un giorno</p>
          <button onClick={() => router.push('/cliente/dashboard')}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold"
            style={{ background: 'oklch(0.60 0.15 200)', color: 'oklch(0.13 0 0)' }}>
            ← Dashboard
          </button>
        </div>
      </div>
    )
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-64">
      <p className="text-sm" style={{ color: 'oklch(0.45 0 0)' }}>Caricamento...</p>
    </div>
  )

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push(backUrl)}
            className="text-sm hover:opacity-70" style={{ color: 'oklch(0.50 0 0)' }}>←</button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl lg:text-3xl font-black tracking-tight" style={{ color: 'oklch(0.97 0 0)' }}>
                {giornoNome}
              </h1>
              {isViewMode && (
                <span className="text-xs px-2 py-1 rounded-lg"
                  style={{ background: 'oklch(0.60 0.15 200 / 15%)', color: 'oklch(0.60 0.15 200)' }}>
                  Archivio
                </span>
              )}
            </div>
            <p className="text-xs mt-0.5" style={{ color: 'oklch(0.50 0 0)' }}>
              {sessioneData
                ? new Date(sessioneData).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })
                : new Date().toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          {completata ? (
            <span className="px-3 py-1.5 rounded-xl text-xs font-semibold"
              style={{ background: 'oklch(0.65 0.18 150 / 20%)', color: 'oklch(0.65 0.18 150)' }}>
              <FontAwesomeIcon icon={faCircleCheck} /> Fatto
            </span>
          ) : (
            <span className="px-3 py-1.5 rounded-xl text-sm font-black tabular-nums"
              style={{ background: 'oklch(0.70 0.19 46 / 15%)', color: 'oklch(0.70 0.19 46)', border: '1px solid oklch(0.70 0.19 46 / 30%)' }}>
              <FontAwesomeIcon icon={faStopwatch} className="mr-1.5" />{formatDurata(durataSecondi)}
            </span>
          )}
        </div>
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

      {/* Timer recupero — solo in modalità live */}
      {timerAttivo && !isViewMode && (
        <div className="rounded-2xl p-4 flex items-center justify-between"
          style={{ background: 'oklch(0.70 0.19 46 / 10%)', border: '1px solid oklch(0.70 0.19 46 / 30%)' }}>
          <div>
            <p className="text-sm font-semibold" style={{ color: 'oklch(0.70 0.19 46)' }}><FontAwesomeIcon icon={faStopwatch} /> Recupero</p>
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
              {/* Modal note esercizio */}
              {noteAperta === ese.id && (ese.note || ese.esercizi.descrizione) && (
                <div
                  className="fixed inset-0 z-50 flex items-end justify-center"
                  style={{ background: 'oklch(0 0 0 / 60%)' }}
                  onClick={() => setNoteAperta(null)}
                >
                  <div
                    className="w-full max-w-2xl rounded-t-3xl p-6 space-y-4"
                    style={{ background: 'oklch(0.18 0 0)', border: '1px solid oklch(1 0 0 / 8%)' }}
                    onClick={e => e.stopPropagation()}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FontAwesomeIcon icon={faNoteSticky} style={{ color: 'oklch(0.70 0.19 46)' }} />
                        <p className="text-sm font-bold" style={{ color: 'oklch(0.97 0 0)' }}>Note — {ese.esercizi.nome}</p>
                      </div>
                      <button
                        onClick={() => setNoteAperta(null)}
                        className="w-8 h-8 rounded-full flex items-center justify-center"
                        style={{ background: 'oklch(0.25 0 0)', color: 'oklch(0.60 0 0)' }}
                      >
                        <FontAwesomeIcon icon={faXmark} />
                      </button>
                    </div>
                    {ese.esercizi.descrizione && (
                      <div className="space-y-1">
                        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'oklch(0.45 0 0)' }}>Descrizione esercizio</p>
                        <p className="text-sm leading-relaxed" style={{ color: 'oklch(0.72 0 0)' }}>{ese.esercizi.descrizione}</p>
                      </div>
                    )}
                    {ese.note && (
                      <div className="space-y-1">
                        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'oklch(0.45 0 0)' }}>Note del coach</p>
                        <p className="text-sm leading-relaxed" style={{ color: 'oklch(0.72 0 0)' }}>{ese.note}</p>
                      </div>
                    )}
                    <div className="flex justify-center pt-1">
                      <div className="w-10 h-1 rounded-full" style={{ background: 'oklch(0.30 0 0)' }} />
                    </div>
                  </div>
                </div>
              )}

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
                    <p className="font-bold text-sm truncate" style={{ color: 'oklch(0.97 0 0)' }}>{ese.esercizi.nome}</p>
                    <p className="text-xs" style={{ color: 'oklch(0.50 0 0)' }}>{ese.serie} × {ese.ripetizioni} · {ese.recupero_secondi}s</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {(ese.note || ese.esercizi.descrizione) && (
                    <button
                      onClick={() => setNoteAperta(noteAperta === ese.id ? null : ese.id)}
                      className="w-8 h-8 rounded-full flex items-center justify-center transition-all active:scale-90"
                      style={{
                        background: noteAperta === ese.id ? 'oklch(0.70 0.19 46 / 20%)' : 'oklch(0.22 0 0)',
                        color: noteAperta === ese.id ? 'oklch(0.70 0.19 46)' : 'oklch(0.50 0 0)',
                        border: `1px solid ${noteAperta === ese.id ? 'oklch(0.70 0.19 46 / 40%)' : 'oklch(1 0 0 / 8%)'}`,
                      }}
                      title="Visualizza note del coach"
                    >
                      <FontAwesomeIcon icon={faCircleInfo} className="text-sm" />
                    </button>
                  )}
                  {ese.esercizi.video_url && (
                    <a href={ese.esercizi.video_url} target="_blank" rel="noopener noreferrer"
                      className="text-xs px-2 py-1 rounded-lg"
                      style={{ background: 'oklch(0.22 0 0)', color: 'oklch(0.60 0 0)' }}>▶</a>
                  )}
                </div>
              </div>

              <div className="divide-y" style={{ borderColor: 'oklch(1 0 0 / 4%)' }}>
                {eseLog?.serie.map((serie, serieIndex) => {
                  const confronto = !isViewMode ? getConfronto(ese.id, serieIndex) : null
                  const miglioramento = !isViewMode ? getMiglioramento(ese.id, serieIndex) : null

                  return (
                    <div key={serieIndex} className="px-4 py-3"
                      style={{ background: serie.completata ? 'oklch(0.65 0.18 150 / 5%)' : 'transparent' }}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold" style={{ color: 'oklch(0.50 0 0)' }}>Serie {serieIndex + 1}</span>
                        {confronto && !isViewMode && (
                          <span className="text-xs" style={{ color: 'oklch(0.40 0 0)' }}>
                            Ultima: {confronto.peso_kg ?? '—'}kg × {confronto.ripetizioni ?? '—'}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="flex-1">
                          <label className="text-xs mb-1 block" style={{ color: 'oklch(0.50 0 0)' }}>Peso (kg)</label>
                          <input type="number" inputMode="decimal" value={serie.peso_kg}
                            onChange={(e) => updateLog(ese.id, serieIndex, 'peso_kg', e.target.value)}
                            placeholder="0" readOnly={isViewMode}
                            className="w-full px-3 py-3 rounded-xl text-base text-center outline-none font-bold"
                            style={{
                              background: serie.completata ? 'oklch(0.65 0.18 150 / 10%)' : 'oklch(0.22 0 0)',
                              border: `1px solid ${serie.completata ? 'oklch(0.65 0.18 150 / 30%)' : 'oklch(1 0 0 / 8%)'}`,
                              color: 'oklch(0.97 0 0)',
                            }} />
                        </div>
                        <span className="text-lg" style={{ color: 'oklch(0.35 0 0)' }}>×</span>
                        <div className="flex-1">
                          <label className="text-xs mb-1 block" style={{ color: 'oklch(0.50 0 0)' }}>Reps</label>
                          <input type="number" inputMode="numeric" value={serie.ripetizioni}
                            onChange={(e) => updateLog(ese.id, serieIndex, 'ripetizioni', e.target.value)}
                            placeholder="0" readOnly={isViewMode}
                            className="w-full px-3 py-3 rounded-xl text-base text-center outline-none font-bold"
                            style={{
                              background: serie.completata ? 'oklch(0.65 0.18 150 / 10%)' : 'oklch(0.22 0 0)',
                              border: `1px solid ${serie.completata ? 'oklch(0.65 0.18 150 / 30%)' : 'oklch(1 0 0 / 8%)'}`,
                              color: 'oklch(0.97 0 0)',
                            }} />
                        </div>
                        <div className="flex flex-col items-center gap-1">
                          <label className="text-xs mb-1 block opacity-0">✓</label>
                          <button onClick={() => !isViewMode && toggleSerie(ese, serieIndex)}
                            className="w-12 h-12 rounded-xl flex items-center justify-center transition-all active:scale-95"
                            style={{
                              background: serie.completata ? 'oklch(0.65 0.18 150)' : 'oklch(0.25 0 0)',
                              border: `2px solid ${serie.completata ? 'oklch(0.65 0.18 150)' : 'oklch(1 0 0 / 15%)'}`,
                              cursor: isViewMode ? 'default' : 'pointer',
                            }}>
                            {serie.completata
                              ? <span className="text-lg font-bold" style={{ color: 'oklch(0.13 0 0)' }}>✓</span>
                              : <span className="text-lg" style={{ color: 'oklch(0.35 0 0)' }}>○</span>}
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

      {/* Bottone completa — solo modalità live */}
      {!completata && !isViewMode && (
        <div className="pb-4">
          <button onClick={handleCompleta} disabled={saving || progressoPerc < 100}
            className="w-full py-4 rounded-2xl font-bold text-base transition-all active:scale-95"
            style={{
              background: progressoPerc === 100 ? 'oklch(0.65 0.18 150)' : 'oklch(0.22 0 0)',
              color: progressoPerc === 100 ? 'oklch(0.13 0 0)' : 'oklch(0.40 0 0)',
              cursor: progressoPerc < 100 ? 'not-allowed' : 'pointer',
            }}>
            {saving ? 'Salvataggio...' : progressoPerc === 100 ? <><FontAwesomeIcon icon={faTrophy} /> Completa allenamento</> : `${progressoPerc}% — continua!`}
          </button>
        </div>
      )}

      {/* Riepilogo + share overlay — quando completato */}
      {completata && (
        <div className="pb-4 space-y-5">
          {!isViewMode && (
            <div className="rounded-2xl p-6 text-center"
              style={{ background: 'oklch(0.65 0.18 150 / 10%)', border: '1px solid oklch(0.65 0.18 150 / 30%)' }}>
              <p className="text-4xl mb-2"><FontAwesomeIcon icon={faTrophy} /></p>
              <p className="text-xl font-black" style={{ color: 'oklch(0.65 0.18 150)' }}>Completato!</p>
              <p className="text-sm mt-1" style={{ color: 'oklch(0.55 0 0)' }}>
                {formatDurata(durataSecondi)} · {Math.round(volumeTotale).toLocaleString('it-IT')} kg volume · {serieCompletate} serie
              </p>
            </div>
          )}

          {/* Riepilogo in modalità archivio */}
          {isViewMode && (
            <div className="rounded-2xl p-5"
              style={{ background: 'oklch(0.18 0 0)', border: '1px solid oklch(1 0 0 / 6%)' }}>
              <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'oklch(0.45 0 0)' }}>Riepilogo</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl p-3 text-center" style={{ background: 'oklch(0.22 0 0)' }}>
                  <p className="text-2xl font-black" style={{ color: 'oklch(0.60 0.15 200)' }}>{Math.round(volumeTotale).toLocaleString('it-IT')}</p>
                  <p className="text-xs mt-1" style={{ color: 'oklch(0.45 0 0)' }}>kg volume</p>
                </div>
                <div className="rounded-xl p-3 text-center" style={{ background: 'oklch(0.22 0 0)' }}>
                  <p className="text-2xl font-black" style={{ color: 'oklch(0.70 0.19 46)' }}>{serieCompletate}</p>
                  <p className="text-xs mt-1" style={{ color: 'oklch(0.45 0 0)' }}>serie</p>
                </div>
              </div>
            </div>
          )}

          {/* Share overlay — sempre disponibile quando completato */}
          <div className="rounded-2xl p-5 space-y-4"
            style={{ background: 'oklch(0.18 0 0)', border: '1px solid oklch(1 0 0 / 6%)' }}>
            <p className="text-sm font-bold text-center" style={{ color: 'oklch(0.97 0 0)' }}>
              Condividi il tuo allenamento
            </p>
            <ShareOverlay
              giornoNome={giornoNome}
              volume={Math.round(volumeTotale)}
              serie={serieCompletate}
              durata={formatDurata(durataSecondi)}
              esercizi={calcolaEserciziHighlight()}
            />
          </div>

          <button onClick={() => router.push(backUrl)}
            className="w-full py-3 rounded-2xl text-sm font-semibold transition-all"
            style={{ background: 'oklch(0.22 0 0)', color: 'oklch(0.60 0 0)', border: '1px solid oklch(1 0 0 / 8%)' }}>
            ← {isViewMode ? 'Torna ai progressi' : 'Torna alla dashboard'}
          </button>
        </div>
      )}
    </div>
  )
}
