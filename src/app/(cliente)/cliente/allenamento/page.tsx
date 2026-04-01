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
  tipo: string
  gruppo_id: string | null
  drop_count: number | null
  drop_percentage: number | null
  rest_pause_secondi: number | null
  piramidale_direzione: string | null
  alternativa_esercizio_id: string | null
  prepara_secondi: number | null
  progressione_tipo: string
  esercizi: { id: string; nome: string; muscoli: string[] | null; video_url: string | null; descrizione: string | null; tipo_input: 'reps' | 'reps_unilaterale' | 'timer' }
}

interface LogSerie {
  numero_serie: number
  peso_kg: string
  ripetizioni: string
  reps_sx: string
  reps_dx: string
  durata_secondi: string
  rpe: string
  rir: string
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
  const [richiede_rpe, setRichiede_rpe] = useState(false)
  const [richiede_rir, setRichiede_rir] = useState(false)
  const [rpeRirPicker, setRpeRirPicker] = useState<{ eseId: string; serieIndex: number } | null>(null)
  const [eseTimerState, setEseTimerState] = useState<{ eseId: string; serieIndex: number; fase: 'pre' | 'run'; secondi: number } | null>(null)
  const eseTimerRef = useRef<NodeJS.Timeout | null>(null)
  const durataRef = useRef<NodeJS.Timeout | null>(null)
  const hasAutoCompleted = useRef(false)
  const durataSecondiRef = useRef(0)
  const sessioneStartRef = useRef<number | null>(null)
  const timerEndRef = useRef<number | null>(null)
  const [suggerimento, setSuggerimento] = useState<{ messaggio: string; eseNome: string } | null>(null)
  const isViewMode = !!sessioneIdParam

  const TIPO_COLORS: Record<string, { color: string; bg: string; label: string }> = {
    superset:   { color: 'oklch(0.60 0.15 200)', bg: 'oklch(0.60 0.15 200 / 15%)', label: 'Superset' },
    giant_set:  { color: 'oklch(0.65 0.18 150)', bg: 'oklch(0.65 0.18 150 / 15%)', label: 'Giant Set' },
    dropset:    { color: 'oklch(0.70 0.19 46)',  bg: 'oklch(0.70 0.19 46 / 15%)',  label: 'Dropset' },
    rest_pause: { color: 'oklch(0.65 0.15 300)', bg: 'oklch(0.65 0.15 300 / 15%)', label: 'Rest-Pause' },
    piramidale: { color: 'oklch(0.85 0.12 80)',  bg: 'oklch(0.85 0.12 80 / 15%)',  label: 'Piramidale' },
  }

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
          tipo, gruppo_id, drop_count, drop_percentage, rest_pause_secondi, piramidale_direzione, alternativa_esercizio_id,
          prepara_secondi, progressione_tipo,
          esercizi!scheda_esercizi_esercizio_id_fkey ( id, nome, muscoli, video_url, descrizione, tipo_input )
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
          serieLog.push({ numero_serie: i, peso_kg: es?.peso_kg?.toString() ?? '', ripetizioni: es?.ripetizioni?.toString() ?? '', reps_sx: es?.reps_sx?.toString() ?? '', reps_dx: es?.reps_dx?.toString() ?? '', durata_secondi: es?.durata_secondi?.toString() ?? '', rpe: es?.rpe?.toString() ?? '', rir: es?.rir?.toString() ?? '', completata: es?.completata ?? false })
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
        tipo, gruppo_id, drop_count, drop_percentage, rest_pause_secondi, piramidale_direzione, alternativa_esercizio_id,
        prepara_secondi, progressione_tipo,
        esercizi!scheda_esercizi_esercizio_id_fkey ( id, nome, muscoli, video_url, descrizione, tipo_input )
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
        sessioneStartRef.current = new Date(sessioneEsistente.data).getTime()
        const elapsed = Math.floor((Date.now() - sessioneStartRef.current) / 1000)
        setDurataSecondi(elapsed)
      }
    } else {
      const { data: nuova } = await supabase.from('sessioni')
        .insert({ cliente_id: user.id, assegnazione_id: assegnazioneId, giorno_id: giornoId, completata: false })
        .select().single()
      sessId = nuova!.id
      setSessioneData(nuova!.data)
      sessioneStartRef.current = new Date(nuova!.data).getTime()
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

    // Fetch RPE/RIR flags from scheda
    if (eserciziOrdinati.length > 0) {
      const firstEse = eserciziOrdinati[0]
      const { data: giornoScheda } = await supabase
        .from('scheda_giorni').select('scheda_id').eq('id', giornoId).single()
      if (giornoScheda?.scheda_id) {
        const { data: scheda } = await supabase
          .from('schede').select('richiede_rpe, richiede_rir').eq('id', giornoScheda.scheda_id).single()
        if (scheda) { setRichiede_rpe(scheda.richiede_rpe); setRichiede_rir(scheda.richiede_rir) }
      }
    }

    const logsInit: Record<string, EsercizioLog> = {}
    for (const ese of eserciziOrdinati) {
      const serieLog: LogSerie[] = []
      for (let i = 1; i <= ese.serie; i++) {
        const es = logEsistenti?.find(l => l.scheda_esercizio_id === ese.id && l.numero_serie === i)
        serieLog.push({ numero_serie: i, peso_kg: es?.peso_kg?.toString() ?? '', ripetizioni: es?.ripetizioni?.toString() ?? '', reps_sx: es?.reps_sx?.toString() ?? '', reps_dx: es?.reps_dx?.toString() ?? '', durata_secondi: es?.durata_secondi?.toString() ?? '', rpe: es?.rpe?.toString() ?? '', rir: es?.rir?.toString() ?? '', completata: es?.completata ?? false })
      }
      logsInit[ese.id] = { scheda_esercizio_id: ese.id, serie: serieLog }
    }
    setLogs(logsInit)
    setLoading(false)
  }, [giornoId, assegnazioneId, sessioneIdParam])

  useEffect(() => { fetchGiorno() }, [fetchGiorno])

  // Mostra suggerimento per il primo esercizio all'apertura della sessione
  useEffect(() => {
    if (loading || isViewMode || esercizi.length === 0) return
    const sug = calcolaSuggerimento(esercizi[0])
    if (sug) setSuggerimento(sug)
  }, [loading, esercizi, ultimaSessione])

  useEffect(() => { durataSecondiRef.current = durataSecondi }, [durataSecondi])

  useEffect(() => {
    if (!timerAttivo) return
    const interval = setInterval(() => {
      if (timerEndRef.current === null) return
      const remaining = Math.ceil((timerEndRef.current - Date.now()) / 1000)
      if (remaining <= 0) {
        setTimerSecondi(0)
        setTimerAttivo(false)
        timerEndRef.current = null
      } else {
        setTimerSecondi(remaining)
      }
    }, 500)
    return () => clearInterval(interval)
  }, [timerAttivo])

  useEffect(() => {
    if (completata || loading || isViewMode) return
    durataRef.current = setInterval(() => {
      if (sessioneStartRef.current) {
        const elapsed = Math.floor((Date.now() - sessioneStartRef.current) / 1000)
        setDurataSecondi(elapsed)
      }
    }, 1000)
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

  // ── Progressive overload suggestion ─────────────────────────────
  const calcolaSuggerimento = (ese: SchedaEsercizio): { messaggio: string; eseNome: string } | null => {
    const ultimeSerie = ultimaSessione[ese.id]
    if (!ultimeSerie || ultimeSerie.length === 0) return null
    const ripRange = ese.ripetizioni.trim()
    let repMin: number, repMax: number
    if (ripRange.includes('-')) {
      const parts = ripRange.split('-')
      repMin = parseInt(parts[0]); repMax = parseInt(parts[1])
    } else {
      repMin = repMax = parseInt(ripRange)
    }
    if (isNaN(repMin) || isNaN(repMax)) return null
    const pesoRif = ultimeSerie[0]?.peso_kg
    if (!pesoRif || pesoRif <= 0) return null
    const tutteAlMax = ultimeSerie.every(s => (s.ripetizioni ?? 0) >= repMax)
    const alcuneSottoMin = ultimeSerie.some(s => (s.ripetizioni ?? 0) < repMin)
    if (tutteAlMax) {
      const nuovoPeso = Math.round((pesoRif * 1.05) / 0.5) * 0.5
      return { messaggio: `💪 Forza! Sali a ${nuovoPeso}kg oggi`, eseNome: ese.esercizi.nome }
    } else if (alcuneSottoMin) {
      const nuovoPeso = Math.round((pesoRif * 0.95) / 0.5) * 0.5
      return { messaggio: `📉 Prova con ${nuovoPeso}kg, consolida prima di salire`, eseNome: ese.esercizi.nome }
    } else {
      return { messaggio: `🎯 Mantieni ${pesoRif}kg — chiudi il buco!`, eseNome: ese.esercizi.nome }
    }
  }

  const formatDurata = (sec: number) => {
    const h = Math.floor(sec / 3600)
    const m = Math.floor((sec % 3600) / 60)
    const s = sec % 60
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  const updateLog = (eseId: string, serieIndex: number, field: keyof LogSerie, value: string) => {
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
    const tipoInput = ese.esercizi.tipo_input ?? 'reps'
    const payload = {
      sessione_id: sessioneId, scheda_esercizio_id: ese.id, numero_serie: serieIndex + 1,
      peso_kg: parseFloat(log.peso_kg) || null,
      ripetizioni: tipoInput === 'reps' ? (parseInt(log.ripetizioni) || null) : null,
      reps_sx: tipoInput === 'reps_unilaterale' ? (parseInt(log.reps_sx) || null) : null,
      reps_dx: tipoInput === 'reps_unilaterale' ? (parseInt(log.reps_dx) || null) : null,
      durata_secondi: tipoInput === 'timer' ? (parseInt(log.durata_secondi) || null) : null,
      rpe: log.rpe ? parseFloat(log.rpe) : null,
      rir: log.rir ? parseInt(log.rir) : null,
      completata: nuovoStato,
    }
    if (existing) { await supabase.from('log_serie').update(payload).eq('id', existing.id) }
    else { await supabase.from('log_serie').insert(payload) }
    if (nuovoStato) {
      timerEndRef.current = Date.now() + ese.recupero_secondi * 1000
      setTimerSecondi(ese.recupero_secondi)
      setTimerAttivo(true)
      if (richiede_rpe || richiede_rir) setRpeRirPicker({ eseId: ese.id, serieIndex })
    }

    // Suggerimento progressive overload per l'esercizio successivo
    if (nuovoStato) {
      const logsAggiornatiSug = {
        ...logs,
        [ese.id]: { ...logs[ese.id], serie: logs[ese.id].serie.map((s, i) => i === serieIndex ? { ...s, completata: true } : s) }
      }
      const tutteCompletateEse = logsAggiornatiSug[ese.id].serie.every(s => s.completata)
      if (tutteCompletateEse) {
        const eseIndex = esercizi.findIndex(e => e.id === ese.id)
        const prossimoEse = esercizi[eseIndex + 1]
        if (prossimoEse) {
          const sug = calcolaSuggerimento(prossimoEse)
          if (sug) setSuggerimento(sug)
        }
      }
    }

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

  const gruppoLabelMap = new Map<string, string>()
  const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  for (const e of esercizi) {
    if (e.gruppo_id && !gruppoLabelMap.has(e.gruppo_id)) {
      gruppoLabelMap.set(e.gruppo_id, LETTERS[gruppoLabelMap.size % 26])
    }
  }

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

      {/* Notifica suggerimento progressive overload */}
      {suggerimento && !isViewMode && (
        <div className="fixed bottom-6 left-4 right-4 z-50 max-w-2xl mx-auto"
          style={{ filter: 'drop-shadow(0 8px 24px oklch(0 0 0 / 50%))' }}>
          <div className="rounded-2xl px-5 py-4 flex items-center gap-4"
            style={{ background: 'oklch(0.22 0 0)', border: '1px solid oklch(0.70 0.19 46 / 40%)' }}>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold uppercase tracking-widest mb-0.5" style={{ color: 'oklch(0.70 0.19 46)' }}>
                {suggerimento.eseNome}
              </p>
              <p className="text-sm font-bold" style={{ color: 'oklch(0.97 0 0)' }}>
                {suggerimento.messaggio}
              </p>
            </div>
            <button onClick={() => setSuggerimento(null)}
              className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-opacity hover:opacity-70"
              style={{ background: 'oklch(0.30 0 0)', color: 'oklch(0.60 0 0)' }}>
              <FontAwesomeIcon icon={faXmark} className="text-xs" />
            </button>
          </div>
        </div>
      )}

      {/* Timer recupero — fisso in basso, solo in modalità live */}
      {timerAttivo && !isViewMode && (
        <div className="fixed left-0 right-0 z-40 px-4"
          style={{ bottom: 'calc(env(safe-area-inset-bottom) + 4.5rem)' }}>
          <div className="max-w-2xl mx-auto rounded-2xl px-5 py-3 flex items-center justify-between"
            style={{
              background: 'oklch(0.18 0 0)',
              border: '1px solid oklch(0.70 0.19 46 / 50%)',
              boxShadow: '0 8px 32px oklch(0 0 0 / 60%)',
            }}>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: 'oklch(0.70 0.19 46 / 15%)', color: 'oklch(0.70 0.19 46)' }}>
                <FontAwesomeIcon icon={faStopwatch} />
              </div>
              <div>
                <p className="text-xs font-semibold" style={{ color: 'oklch(0.70 0.19 46)' }}>Recupero</p>
                <p className="text-xs" style={{ color: 'oklch(0.50 0 0)' }}>Prossima serie tra...</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-2xl font-black tabular-nums" style={{ color: 'oklch(0.70 0.19 46)' }}>
                {Math.floor(timerSecondi / 60).toString().padStart(2, '0')}:{(timerSecondi % 60).toString().padStart(2, '0')}
              </div>
              <button onClick={() => setTimerAttivo(false)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium"
                style={{ background: 'oklch(0.25 0 0)', color: 'oklch(0.60 0 0)' }}>
                Salta
              </button>
            </div>
          </div>
        </div>
      )}


      {/* Esercizi */}
      <div className="space-y-4">
        {esercizi.map((ese, eseIndex) => {
          const eseLog = logs[ese.id]
          const tutteCompletate = eseLog?.serie.every(s => s.completata)
          const isGrouped = !!ese.gruppo_id
          const tipoInfo = TIPO_COLORS[ese.tipo] ?? null
          const gruppoLabel = gruppoLabelMap.get(ese.gruppo_id ?? '') ?? null
          const prevEse = esercizi[eseIndex - 1]
          const nextEse = esercizi[eseIndex + 1]
          const isFirstInGroup = isGrouped && (!prevEse || prevEse.gruppo_id !== ese.gruppo_id)
          const isLastInGroup = isGrouped && (!nextEse || nextEse.gruppo_id !== ese.gruppo_id)

          return (
            <div key={ese.id} style={{ marginLeft: isGrouped ? '0.75rem' : '0' }}>
              {/* Group header */}
              {isFirstInGroup && tipoInfo && (
                <div className="flex items-center gap-2 mb-1.5 -ml-3">
                  <div className="w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black flex-shrink-0"
                    style={{ background: tipoInfo.bg, color: tipoInfo.color }}>
                    {gruppoLabel}
                  </div>
                  <span className="text-xs font-bold" style={{ color: tipoInfo.color }}>{tipoInfo.label}</span>
                  <div className="flex-1 h-px" style={{ background: `${tipoInfo.color}30` }} />
                </div>
              )}
            <div className="rounded-2xl overflow-hidden"
              style={{
                background: 'oklch(0.18 0 0)',
                border: `1px solid ${tutteCompletate ? 'oklch(0.65 0.18 150 / 30%)' : isGrouped && tipoInfo ? `${tipoInfo.color}30` : 'oklch(1 0 0 / 6%)'}`,
                borderLeft: isGrouped && tipoInfo ? `3px solid ${tipoInfo.color}` : undefined,
                marginBottom: isGrouped && !isLastInGroup ? '2px' : undefined,
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
                    <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                      <span className="text-xs" style={{ color: 'oklch(0.50 0 0)' }}>{ese.serie} × {ese.ripetizioni}{ese.esercizi.tipo_input === 'timer' ? 's' : ' reps'} · {ese.recupero_secondi}s rec.</span>
                      {ese.tipo === 'dropset' && ese.drop_count && (
                        <span className="text-xs px-1.5 py-0.5 rounded-full font-semibold"
                          style={{ background: 'oklch(0.70 0.19 46 / 15%)', color: 'oklch(0.70 0.19 46)' }}>
                          {ese.drop_count} drop -{ese.drop_percentage}%
                        </span>
                      )}
                      {ese.tipo === 'rest_pause' && ese.rest_pause_secondi && (
                        <span className="text-xs px-1.5 py-0.5 rounded-full font-semibold"
                          style={{ background: 'oklch(0.65 0.15 300 / 15%)', color: 'oklch(0.65 0.15 300)' }}>
                          pause {ese.rest_pause_secondi}s
                        </span>
                      )}
                      {ese.tipo === 'piramidale' && (
                        <span className="text-xs px-1.5 py-0.5 rounded-full font-semibold"
                          style={{ background: 'oklch(0.85 0.12 80 / 15%)', color: 'oklch(0.85 0.12 80)' }}>
                          {ese.piramidale_direzione === 'ascendente' ? '↑' : '↓'} Piramidale
                        </span>
                      )}
                    </div>
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
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold" style={{ color: 'oklch(0.50 0 0)' }}>Serie {serieIndex + 1}</span>
                          {/* Dropset: peso scalato */}
                          {ese.tipo === 'dropset' && ese.drop_percentage && serieIndex > 0 && !serie.completata && (() => {
                            const primaSerieLog = eseLog?.serie[0]
                            const pesoPrima = parseFloat(primaSerieLog?.peso_kg || '0')
                            if (!pesoPrima) return null
                            const factor = Math.pow(1 - ese.drop_percentage / 100, serieIndex)
                            const pesoSuggerito = Math.round((pesoPrima * factor) / 0.5) * 0.5
                            return (
                              <span className="text-xs px-2 py-0.5 rounded-full"
                                style={{ background: 'oklch(0.70 0.19 46 / 15%)', color: 'oklch(0.70 0.19 46)' }}>
                                ~{pesoSuggerito}kg
                              </span>
                            )
                          })()}
                          {/* Piramidale: indicatore direzione */}
                          {ese.tipo === 'piramidale' && !serie.completata && (
                            <span className="text-xs" style={{ color: 'oklch(0.85 0.12 80)' }}>
                              {ese.piramidale_direzione === 'ascendente' ? '↑ sali' : '↓ scendi'}
                            </span>
                          )}
                        </div>
                        {confronto && !isViewMode && (
                          <span className="text-xs" style={{ color: 'oklch(0.40 0 0)' }}>
                            Ultima: {confronto.peso_kg ?? '—'}kg × {confronto.ripetizioni ?? '—'}
                          </span>
                        )}
                      </div>

                      {/* ── Input adattivo al tipo_input ── */}
                      {(() => {
                        const tipoInput = ese.esercizi.tipo_input ?? 'reps'
                        const inputBg = serie.completata ? 'oklch(0.65 0.18 150 / 10%)' : 'oklch(0.22 0 0)'
                        const inputBorder = `1px solid ${serie.completata ? 'oklch(0.65 0.18 150 / 30%)' : 'oklch(1 0 0 / 8%)'}`
                        const inputStyle = { background: inputBg, border: inputBorder, color: 'oklch(0.97 0 0)' }
                        const checkBtn = (
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
                        )

                        if (tipoInput === 'timer') {
                          const isActive = eseTimerState?.eseId === ese.id && eseTimerState?.serieIndex === serieIndex
                          const isPre = isActive && eseTimerState?.fase === 'pre'
                          const isRun = isActive && eseTimerState?.fase === 'run'
                          const durataTarget = parseInt(ese.ripetizioni) || 30
                          const handleTimerStart = () => {
                            if (serie.completata || isViewMode) return
                            if (eseTimerRef.current) clearInterval(eseTimerRef.current)
                            const hasPre = (ese.prepara_secondi ?? 0) > 0
                            if (hasPre) {
                              setEseTimerState({ eseId: ese.id, serieIndex, fase: 'pre', secondi: ese.prepara_secondi! })
                              eseTimerRef.current = setInterval(() => {
                                setEseTimerState(prev => {
                                  if (!prev || prev.fase !== 'pre') return prev
                                  if (prev.secondi <= 1) {
                                    clearInterval(eseTimerRef.current!)
                                    eseTimerRef.current = setInterval(() => {
                                      setEseTimerState(p => p ? { ...p, fase: 'run', secondi: (p.secondi || 0) + 1 } : p)
                                    }, 1000)
                                    return { ...prev, fase: 'run', secondi: 0 }
                                  }
                                  return { ...prev, secondi: prev.secondi - 1 }
                                })
                              }, 1000)
                            } else {
                              setEseTimerState({ eseId: ese.id, serieIndex, fase: 'run', secondi: 0 })
                              eseTimerRef.current = setInterval(() => {
                                setEseTimerState(p => p ? { ...p, secondi: p.secondi + 1 } : p)
                              }, 1000)
                            }
                          }
                          const handleTimerStop = () => {
                            if (eseTimerRef.current) { clearInterval(eseTimerRef.current); eseTimerRef.current = null }
                            const durataEffettiva = eseTimerState?.fase === 'run' ? eseTimerState.secondi : 0
                            updateLog(ese.id, serieIndex, 'durata_secondi', String(durataEffettiva))
                            setEseTimerState(null)
                            toggleSerie(ese, serieIndex)
                          }
                          return (
                            <div className="flex items-center gap-3">
                              <div className="flex-1">
                                <label className="text-xs mb-1 block" style={{ color: 'oklch(0.50 0 0)' }}>Peso (kg)</label>
                                <input type="number" inputMode="decimal" value={serie.peso_kg}
                                  onChange={e => updateLog(ese.id, serieIndex, 'peso_kg', e.target.value)}
                                  placeholder="0" readOnly={isViewMode}
                                  className="w-full px-3 py-3 rounded-xl text-base text-center outline-none font-bold"
                                  style={inputStyle} />
                              </div>
                              <div className="flex-1 flex flex-col items-center gap-1">
                                <label className="text-xs mb-1 block self-start" style={{ color: 'oklch(0.50 0 0)' }}>
                                  {serie.completata ? `${serie.durata_secondi || '—'}s` : isPre ? `VIA tra ${eseTimerState?.secondi}s` : isRun ? `${eseTimerState?.secondi}s` : `Obiettivo: ${durataTarget}s`}
                                </label>
                                {serie.completata ? (
                                  <div className="w-full px-3 py-3 rounded-xl text-base text-center font-bold"
                                    style={inputStyle}>{serie.durata_secondi || '—'}s</div>
                                ) : isRun ? (
                                  <button onClick={handleTimerStop}
                                    className="w-full px-3 py-3 rounded-xl text-base text-center font-bold transition-all active:scale-95"
                                    style={{ background: 'oklch(0.65 0.22 27 / 20%)', border: '2px solid oklch(0.65 0.22 27 / 50%)', color: 'oklch(0.75 0.15 27)' }}>
                                    stop {eseTimerState?.secondi}s
                                  </button>
                                ) : isPre ? (
                                  <div className="w-full px-3 py-3 rounded-xl text-base text-center font-bold"
                                    style={{ background: 'oklch(0.70 0.19 46 / 15%)', border: '1px solid oklch(0.70 0.19 46 / 40%)', color: 'oklch(0.70 0.19 46)' }}>
                                    {eseTimerState?.secondi}s
                                  </div>
                                ) : (
                                  <button onClick={handleTimerStart}
                                    className="w-full px-3 py-3 rounded-xl text-base text-center font-bold transition-all active:scale-95"
                                    style={{ background: 'oklch(0.60 0.15 200 / 15%)', border: '1px solid oklch(0.60 0.15 200 / 40%)', color: 'oklch(0.60 0.15 200)' }}>
                                    start
                                  </button>
                                )}
                              </div>
                              {checkBtn}
                            </div>
                          )
                        }

                        if (tipoInput === 'reps_unilaterale') {
                          return (
                            <div className="flex items-center gap-2">
                              <div className="flex-1">
                                <label className="text-xs mb-1 block" style={{ color: 'oklch(0.50 0 0)' }}>Peso (kg)</label>
                                <input type="number" inputMode="decimal" value={serie.peso_kg}
                                  onChange={e => updateLog(ese.id, serieIndex, 'peso_kg', e.target.value)}
                                  placeholder="0" readOnly={isViewMode}
                                  className="w-full px-3 py-3 rounded-xl text-base text-center outline-none font-bold"
                                  style={inputStyle} />
                              </div>
                              <span className="text-sm" style={{ color: 'oklch(0.35 0 0)' }}>×</span>
                              <div className="flex-1">
                                <label className="text-xs mb-1 block" style={{ color: 'oklch(0.50 0 0)' }}>SX</label>
                                <input type="number" inputMode="numeric" value={serie.reps_sx}
                                  onChange={e => updateLog(ese.id, serieIndex, 'reps_sx', e.target.value)}
                                  placeholder="0" readOnly={isViewMode}
                                  className="w-full px-3 py-3 rounded-xl text-base text-center outline-none font-bold"
                                  style={inputStyle} />
                              </div>
                              <div className="flex-1">
                                <label className="text-xs mb-1 block" style={{ color: 'oklch(0.50 0 0)' }}>DX</label>
                                <input type="number" inputMode="numeric" value={serie.reps_dx}
                                  onChange={e => updateLog(ese.id, serieIndex, 'reps_dx', e.target.value)}
                                  placeholder="0" readOnly={isViewMode}
                                  className="w-full px-3 py-3 rounded-xl text-base text-center outline-none font-bold"
                                  style={inputStyle} />
                              </div>
                              {checkBtn}
                            </div>
                          )
                        }

                        // Default: reps classiche
                        return (
                          <div className="flex items-center gap-3">
                            <div className="flex-1">
                              <label className="text-xs mb-1 block" style={{ color: 'oklch(0.50 0 0)' }}>Peso (kg)</label>
                              <input type="number" inputMode="decimal" value={serie.peso_kg}
                                onChange={(e) => updateLog(ese.id, serieIndex, 'peso_kg', e.target.value)}
                                placeholder="0" readOnly={isViewMode}
                                className="w-full px-3 py-3 rounded-xl text-base text-center outline-none font-bold"
                                style={inputStyle} />
                            </div>
                            <span className="text-lg" style={{ color: 'oklch(0.35 0 0)' }}>×</span>
                            <div className="flex-1">
                              <label className="text-xs mb-1 block" style={{ color: 'oklch(0.50 0 0)' }}>Reps</label>
                              <input type="number" inputMode="numeric" value={serie.ripetizioni}
                                onChange={(e) => updateLog(ese.id, serieIndex, 'ripetizioni', e.target.value)}
                                placeholder="0" readOnly={isViewMode}
                                className="w-full px-3 py-3 rounded-xl text-base text-center outline-none font-bold"
                                style={inputStyle} />
                            </div>
                            {checkBtn}
                          </div>
                        )
                      })()}
                    </div>
                  )
                })}
              </div>
            </div>
            </div>
          )
        })}
      </div>

      {/* RPE/RIR picker — bottom sheet dopo completamento serie */}
      {rpeRirPicker && !isViewMode && (
        <div className="fixed inset-0 z-50 flex items-end justify-center"
          style={{ background: 'oklch(0 0 0 / 50%)' }}
          onClick={() => setRpeRirPicker(null)}>
          <div className="w-full max-w-2xl rounded-t-3xl p-6 space-y-5"
            style={{ background: 'oklch(0.18 0 0)', border: '1px solid oklch(1 0 0 / 8%)' }}
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold" style={{ color: 'oklch(0.97 0 0)' }}>Intensità serie {rpeRirPicker.serieIndex + 1}</p>
              <button onClick={() => setRpeRirPicker(null)}
                className="text-xs px-3 py-1.5 rounded-lg"
                style={{ background: 'oklch(0.25 0 0)', color: 'oklch(0.55 0 0)' }}>Salta</button>
            </div>
            {richiede_rpe && (
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'oklch(0.50 0 0)' }}>
                  RPE — quanto è stato difficile?
                </p>
                <div className="grid grid-cols-5 gap-2">
                  {[6, 7, 8, 9, 10].map(v => {
                    const sel = logs[rpeRirPicker.eseId]?.serie[rpeRirPicker.serieIndex]?.rpe === String(v)
                    return (
                      <button key={v} onClick={() => updateLog(rpeRirPicker.eseId, rpeRirPicker.serieIndex, 'rpe', String(v))}
                        className="py-3 rounded-xl font-bold text-sm transition-all"
                        style={{
                          background: sel ? 'oklch(0.70 0.19 46)' : 'oklch(0.22 0 0)',
                          color: sel ? 'oklch(0.13 0 0)' : 'oklch(0.60 0 0)',
                          border: sel ? 'none' : '1px solid oklch(1 0 0 / 8%)',
                        }}>
                        {v}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
            {richiede_rir && (
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'oklch(0.50 0 0)' }}>
                  RIR — reps rimaste nel serbatoio?
                </p>
                <div className="grid grid-cols-4 gap-2">
                  {['0', '1', '2', '3+'].map(v => {
                    const sel = logs[rpeRirPicker.eseId]?.serie[rpeRirPicker.serieIndex]?.rir === v
                    return (
                      <button key={v} onClick={() => updateLog(rpeRirPicker.eseId, rpeRirPicker.serieIndex, 'rir', v)}
                        className="py-3 rounded-xl font-bold text-sm transition-all"
                        style={{
                          background: sel ? 'oklch(0.60 0.15 200)' : 'oklch(0.22 0 0)',
                          color: sel ? 'oklch(0.13 0 0)' : 'oklch(0.60 0 0)',
                          border: sel ? 'none' : '1px solid oklch(1 0 0 / 8%)',
                        }}>
                        {v}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
            <button onClick={() => setRpeRirPicker(null)}
              className="w-full py-3 rounded-xl font-bold text-sm"
              style={{ background: 'oklch(0.65 0.18 150)', color: 'oklch(0.13 0 0)' }}>
              Conferma
            </button>
          </div>
        </div>
      )}

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
