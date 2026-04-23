'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import BynariLoader from '@/components/shared/BynariLoader'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import ShareOverlay from '@/components/shared/ShareOverlay'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faDumbbell, faCircleCheck, faPause, faStopwatch, faNoteSticky, faTrophy, faCircleInfo, faXmark, faPencil } from '@fortawesome/free-solid-svg-icons'

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
  warmup_serie: { peso: string; reps: string }[]
  esercizi: { id: string; nome: string; muscoli: string[] | null; video_url: string | null; gif_url: string | null; descrizione: string | null; tipo_input: 'reps' | 'reps_unilaterale' | 'timer' | 'timer_unilaterale' }
  peso_consigliato_kg: number | null
  tut: string | null
  amrap_minuti: number | null
  emom_reps_per_minuto: number | null
  emom_durata_minuti: number | null
  emom_rounds: number | null
  max_reps_target: number | null
  tabata_work_secondi: number | null
  tabata_rest_secondi: number | null
  tabata_rounds: number | null
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
  reps_sx: number | null
  reps_dx: number | null
  durata_secondi: number | null
}

export default function AllenamentoPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const giornoId = searchParams.get('giorno')
  const assegnazioneId = searchParams.get('assegnazione')
  const sessioneIdParam = searchParams.get('sessione') // per visualizzare sessioni passate
  const supabase = createClient()

  const [giornoNome, setGiornoNome] = useState('')
  const [warmupNote, setWarmupNote] = useState<string | null>(null)
  const [esercizi, setEsercizi] = useState<SchedaEsercizio[]>([])
  const [logs, setLogs] = useState<Record<string, EsercizioLog>>({})
  const [ultimaSessione, setUltimaSessione] = useState<Record<string, UltimaSessioneSerie[]>>({})
  const [sessioneId, setSessioneId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [completata, setCompletata] = useState(false)
  const [timerAttivo, setTimerAttivo] = useState(false)
  const [timerSecondi, setTimerSecondi] = useState(0)
  const [timerDurataIniziale, setTimerDurataIniziale] = useState(0)
  const [durataSecondi, setDurataSecondi] = useState(0)
  const [durataSessioneDB, setDurataSessioneDB] = useState<number | null>(null)
  const [coachNome, setCoachNome] = useState<string | null>(null)
  const [sessioneData, setSessioneData] = useState<string | null>(null)
  const [noteAperta, setNoteAperta] = useState<string | null>(null)
  const [richiede_rpe, setRichiede_rpe] = useState(false)
  const [richiede_rir, setRichiede_rir] = useState(false)
  const [rpeRirPicker, setRpeRirPicker] = useState<{ eseId: string; serieIndex: number } | null>(null)
  const [eseTimerState, setEseTimerState] = useState<{ eseId: string; serieIndex: number; fase: 'pre' | 'run'; secondi: number } | null>(null)
  const [emomState, setEmomState] = useState<{
    eseId: string; serieIndex: number
    fase: 'running' | 'rest_between_rounds' | 'completed'
    secondi: number; currentRound: number; currentMinute: number
    emomDurata: number; emomRounds: number; recuperoSecondi: number
  } | null>(null)
  const emomAutoCompleteRef = useRef<{ eseId: string; serieIndex: number } | null>(null)
  const [tabataState, setTabataState] = useState<Record<string, { fase: 'idle' | 'work' | 'rest' | 'completed'; currentRound: number; secondi: number; partnerEseId: string | null; isPartnerTurn: boolean }>>({})
  const tabataRef = useRef<NodeJS.Timeout | null>(null)
  const tabataActiveRef = useRef<string | null>(null)
  const tabataInitiatorRef = useRef<string | null>(null)
  const [timerUniState, setTimerUniState] = useState<Record<string, { fase: 'idle' | 'sx_run' | 'sx_done' | 'dx_run' | 'done'; sx: number; dx: number }>>({})
  const timerUniRef = useRef<NodeJS.Timeout | null>(null)
  const eseTimerRef = useRef<NodeJS.Timeout | null>(null)
  const durataRef = useRef<NodeJS.Timeout | null>(null)
  const hasAutoCompleted = useRef(false)
  const durataSecondiRef = useRef(0)
  const sessioneStartRef = useRef<number | null>(null)
  const timerEndRef = useRef<number | null>(null)
  const userIdRef = useRef<string | null>(null)
  const scheduledPushIdRef = useRef<string | null>(null)
  const localNotifRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [suggerimento, setSuggerimento] = useState<{ messaggio: string; eseNome: string } | null>(null)
  const [supersetNext, setSupersetNext] = useState<string | null>(null) // nome prossimo esercizio nel gruppo
  const isViewMode = !!sessioneIdParam
  const [coachId, setCoachId] = useState<string | null>(null)
  const [noteCliente, setNoteCliente] = useState<Record<string, { id: string; testo: string }>>({})
  const [noteApertaEse, setNoteApertaEse] = useState<string | null>(null)
  const [noteBozza, setNoteBozza] = useState<Record<string, string>>({})
  const [noteSalvando, setNoteSalvando] = useState<string | null>(null)
  const [noteInviata, setNoteInviata] = useState<string | null>(null)

  // ── Notifica fine recupero ────────────────────────────────────────
  function playBeep() {
    try {
      const ctx = new AudioContext()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.type = 'sine'
      osc.frequency.value = 880
      gain.gain.setValueAtTime(0.4, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6)
      osc.start(ctx.currentTime)
      osc.stop(ctx.currentTime + 0.6)
    } catch {}
  }

  function playTick() {
    try {
      const c = new AudioContext()
      const osc = c.createOscillator(); const g = c.createGain()
      osc.type = 'square'; osc.frequency.value = 800
      osc.connect(g); g.connect(c.destination)
      g.gain.setValueAtTime(0.1, c.currentTime); g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.04)
      osc.start(c.currentTime); osc.stop(c.currentTime + 0.05)
    } catch {}
  }

  function playTickUrgent() {
    try {
      const c = new AudioContext()
      const osc = c.createOscillator(); const g = c.createGain()
      osc.type = 'square'; osc.frequency.value = 600
      osc.connect(g); g.connect(c.destination)
      g.gain.setValueAtTime(0.2, c.currentTime); g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.06)
      osc.start(c.currentTime); osc.stop(c.currentTime + 0.07)
    } catch {}
  }

  function feedbackLocale() {
    playBeep()
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate([200, 100, 200])
    }
  }

  async function scheduleTimerPush(fireAt: number) {
    if (!userIdRef.current) return
    try {
      const res = await fetch('/api/push/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fireAt: new Date(fireAt).toISOString(),
          title: 'Recupero terminato! 💪',
          body: 'Pronti per la prossima serie.',
          url: '/cliente/allenamento',
        }),
      })
      const data = await res.json()
      scheduledPushIdRef.current = data.id ?? null
    } catch {}
  }

  function cancelTimerPush() {
    scheduledPushIdRef.current = null
    fetch('/api/push/schedule', { method: 'DELETE' }).catch(() => {})
  }

  function scheduleLocalNotification(secondi: number) {
    if (localNotifRef.current) clearTimeout(localNotifRef.current)
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      Notification.requestPermission()
    }
    localNotifRef.current = setTimeout(() => {
      if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        new Notification('Recupero terminato! 💪', {
          body: 'Pronti per la prossima serie.',
          icon: '/logo/Bynari_WO1.png',
          tag: 'timer-recupero',
        })
      }
    }, secondi * 1000)
  }

  function cancelLocalNotification() {
    if (localNotifRef.current) {
      clearTimeout(localNotifRef.current)
      localNotifRef.current = null
    }
  }

  const TIPO_COLORS: Record<string, { color: string; bg: string; label: string }> = {
    superset:   { color: 'oklch(0.60 0.15 200)', bg: 'oklch(0.60 0.15 200 / 15%)', label: 'Superset' },
    giant_set:  { color: 'oklch(0.65 0.18 150)', bg: 'oklch(0.65 0.18 150 / 15%)', label: 'Giant Set' },
    dropset:    { color: 'oklch(0.70 0.19 46)',  bg: 'oklch(0.70 0.19 46 / 15%)',  label: 'Dropset' },
    rest_pause: { color: 'oklch(0.65 0.15 300)', bg: 'oklch(0.65 0.15 300 / 15%)', label: 'Rest-Pause' },
    piramidale: { color: 'oklch(0.85 0.12 80)',  bg: 'oklch(0.85 0.12 80 / 15%)',  label: 'Piramidale' },
    amrap:      { color: 'oklch(0.70 0.18 330)', bg: 'oklch(0.70 0.18 330 / 15%)', label: 'AMRAP' },
    emom:       { color: 'oklch(0.65 0.18 180)', bg: 'oklch(0.65 0.18 180 / 15%)', label: 'EMOM' },
    max_reps:   { color: 'oklch(0.75 0.15 60)',  bg: 'oklch(0.75 0.15 60 / 15%)',  label: 'Max+Total' },
    jump_set:   { color: 'oklch(0.65 0.20 280)', bg: 'oklch(0.65 0.20 280 / 15%)', label: 'Jump Set' },
    tabata:     { color: 'oklch(0.70 0.15 0)',   bg: 'oklch(0.70 0.15 0 / 15%)',   label: 'Tabata' },
  }

  const fetchGiorno = useCallback(async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    // Fetch nome e id coach se esiste
    if (user) supabase.from('coach_clienti').select('coach_id, profiles!coach_clienti_coach_id_fkey(full_name)').eq('cliente_id', user.id).maybeSingle().then(({ data: cc }) => {
      if (cc) {
        setCoachNome((cc as any).profiles?.full_name ?? null)
        setCoachId((cc as any).coach_id ?? null)
      }
    })
    if (!user) return
    userIdRef.current = user.id

    // Modalità visualizzazione sessione passata
    if (sessioneIdParam) {
      const { data: sessione } = await supabase
        .from('sessioni')
        .select(`id, data, completata, durata_secondi, giorno_id, assegnazione_id, scheda_giorni ( nome )`)
        .eq('id', sessioneIdParam)
        .single()

      if (!sessione) { setLoading(false); return }
      setSessioneId(sessione.id)
      setCompletata(sessione.completata)
      setSessioneData(sessione.data)
      setGiornoNome((sessione as any).scheda_giorni?.nome ?? '')

      // Usa durata salvata nel DB, non ricalcolare
      if ((sessione as any).durata_secondi) setDurataSessioneDB((sessione as any).durata_secondi)
      setDurataSecondi(0)

      const { data: giorno } = await supabase
        .from('scheda_giorni')
        .select(`id, nome, warmup_note, scheda_esercizi (
          id, serie, ripetizioni, recupero_secondi, note, ordine,
          tipo, gruppo_id, drop_count, drop_percentage, rest_pause_secondi, piramidale_direzione, alternativa_esercizio_id,
          prepara_secondi, progressione_tipo, warmup_serie,
          peso_consigliato_kg, tut, amrap_minuti, emom_reps_per_minuto, emom_durata_minuti, emom_rounds, max_reps_target,
          tabata_work_secondi, tabata_rest_secondi, tabata_rounds,
          esercizi!scheda_esercizi_esercizio_id_fkey ( id, nome, muscoli, video_url, gif_url, descrizione, tipo_input )
        )`)
        .eq('id', sessione.giorno_id)
        .single()

      if (!giorno) { setLoading(false); return }
      setWarmupNote((giorno as any).warmup_note ?? null)
      const eserciziOrdinati = ((giorno as any).scheda_esercizi ?? []).sort((a: any, b: any) => a.ordine - b.ordine)
      setEsercizi(eserciziOrdinati)

      const { data: logEsistenti } = await supabase.from('log_serie').select('*').eq('sessione_id', sessioneIdParam)

      const logsInit: Record<string, EsercizioLog> = {}
      for (const ese of eserciziOrdinati) {
        const serieLog: LogSerie[] = []
        for (let i = 1; i <= ese.serie; i++) {
          const es = logEsistenti?.find((l: any) => l.scheda_esercizio_id === ese.id && l.numero_serie === i)
          serieLog.push({ numero_serie: i, peso_kg: es?.peso_kg?.toString() ?? '', ripetizioni: es?.ripetizioni?.toString() ?? '', reps_sx: es?.reps_sx?.toString() ?? '', reps_dx: es?.reps_dx?.toString() ?? '', durata_secondi: es?.durata_secondi != null ? es.durata_secondi.toString() : '', rpe: es?.rpe?.toString() ?? '', rir: es?.rir?.toString() ?? '', completata: es?.completata ?? false })
        }
        logsInit[ese.id] = { scheda_esercizio_id: ese.id, serie: serieLog }
      }
      setLogs(logsInit)
      // Carica note cliente in view mode
      const { data: noteDataView } = await supabase
        .from('note_esercizio')
        .select('id, scheda_esercizio_id, testo')
        .eq('sessione_id', sessioneIdParam)
      if (noteDataView && noteDataView.length > 0) {
        const noteMap: Record<string, { id: string; testo: string }> = {}
        for (const n of noteDataView) {
          noteMap[n.scheda_esercizio_id] = { id: n.id, testo: n.testo }
        }
        setNoteCliente(noteMap)
      }
      setLoading(false)
      return
    }

    if (!giornoId || !assegnazioneId) { setLoading(false); return }

    const { data: giorno } = await supabase
      .from('scheda_giorni')
      .select(`id, nome, warmup_note, scheda_esercizi (
        id, serie, ripetizioni, recupero_secondi, note, ordine,
        tipo, gruppo_id, drop_count, drop_percentage, rest_pause_secondi, piramidale_direzione, alternativa_esercizio_id,
        prepara_secondi, progressione_tipo, warmup_serie,
        peso_consigliato_kg, tut, amrap_minuti, emom_reps_per_minuto, emom_durata_minuti, emom_rounds, max_reps_target,
        tabata_work_secondi, tabata_rest_secondi, tabata_rounds,
        esercizi!scheda_esercizi_esercizio_id_fkey ( id, nome, muscoli, video_url, gif_url, descrizione, tipo_input )
      )`)
      .eq('id', giornoId).single()

    if (!giorno) { setLoading(false); return }
    setGiornoNome((giorno as any).nome)
    setWarmupNote((giorno as any).warmup_note ?? null)
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
        // Salva URL solo se la sessione è ancora da completare
        if (typeof window !== 'undefined') {
          localStorage.setItem('bynari_allenamento_url', `/cliente/allenamento?giorno=${giornoId}&assegnazione=${assegnazioneId}`)
        }
      } else {
        // Sessione già completata — pulisci localStorage
        if (typeof window !== 'undefined') localStorage.removeItem('bynari_allenamento_url')
        localStorage.removeItem(`bynari_logs_draft_${sessId}`)
        localStorage.removeItem('bynari_timer_end')
      }
    } else {
      const { data: nuova } = await supabase.from('sessioni')
        .insert({ cliente_id: user.id, assegnazione_id: assegnazioneId, giorno_id: giornoId, completata: false })
        .select().single()
      sessId = nuova!.id
      setSessioneData(nuova!.data)
      sessioneStartRef.current = new Date(nuova!.data).getTime()
      // Nuova sessione — salva URL
      if (typeof window !== 'undefined') {
        localStorage.setItem('bynari_allenamento_url', `/cliente/allenamento?giorno=${giornoId}&assegnazione=${assegnazioneId}`)
      }
    }
    setSessioneId(sessId)

    // Carica note cliente esistenti per questa sessione
    const { data: noteData } = await supabase
      .from('note_esercizio')
      .select('id, scheda_esercizio_id, testo')
      .eq('sessione_id', sessId)
      .eq('cliente_id', user.id)
    if (noteData && noteData.length > 0) {
      const noteMap: Record<string, { id: string; testo: string }> = {}
      const bozza: Record<string, string> = {}
      for (const n of noteData) {
        noteMap[n.scheda_esercizio_id] = { id: n.id, testo: n.testo }
        bozza[n.scheda_esercizio_id] = n.testo
      }
      setNoteCliente(noteMap)
      setNoteBozza(bozza)
    }

    const { data: logEsistenti } = await supabase.from('log_serie').select('*').eq('sessione_id', sessId)

    const { data: sessioniPrecedenti } = await supabase.from('sessioni')
      .select('id').eq('cliente_id', user.id).eq('giorno_id', giornoId)
      .eq('completata', true).neq('id', sessId).order('data', { ascending: false }).limit(1)

    const ultimaMap: Record<string, UltimaSessioneSerie[]> = {}
    if (sessioniPrecedenti && sessioniPrecedenti.length > 0) {
      const { data: logsUltima } = await supabase.from('log_serie')
        .select('scheda_esercizio_id, numero_serie, peso_kg, ripetizioni, reps_sx, reps_dx, durata_secondi')
        .eq('sessione_id', sessioniPrecedenti[0].id)
      for (const log of (logsUltima ?? [])) {
        if (!ultimaMap[log.scheda_esercizio_id]) ultimaMap[log.scheda_esercizio_id] = []
        ultimaMap[log.scheda_esercizio_id].push({
          numero_serie: log.numero_serie,
          peso_kg: log.peso_kg,
          ripetizioni: log.ripetizioni,
          reps_sx: log.reps_sx,
          reps_dx: log.reps_dx,
          durata_secondi: log.durata_secondi,
        })
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
        serieLog.push({ numero_serie: i, peso_kg: es?.peso_kg?.toString() ?? '', ripetizioni: es?.ripetizioni?.toString() ?? '', reps_sx: es?.reps_sx?.toString() ?? '', reps_dx: es?.reps_dx?.toString() ?? '', durata_secondi: es?.durata_secondi != null ? es.durata_secondi.toString() : '', rpe: es?.rpe?.toString() ?? '', rir: es?.rir?.toString() ?? '', completata: es?.completata ?? false })
      }
      logsInit[ese.id] = { scheda_esercizio_id: ese.id, serie: serieLog }
    }
    setLogs(logsInit)
    // Restore draft dal localStorage se esiste
    const draftKey = `bynari_logs_draft_${sessId}`
    const draft = typeof window !== 'undefined' ? localStorage.getItem(draftKey) : null
    if (draft) {
      try {
        const parsed = JSON.parse(draft)
        setLogs(prev => {
          const merged: typeof prev = { ...prev }
          for (const eseId of Object.keys(parsed)) {
            if (merged[eseId]) {
              merged[eseId] = {
                ...merged[eseId],
                serie: merged[eseId].serie.map((s, i) => {
                  if (s.completata) return s
                  const d = parsed[eseId]?.serie?.[i]
                  if (!d) return s
                  return { ...s, ...d }
                })
              }
            }
          }
          return merged
        })
      } catch { /* ignore */ }
    }
    setLoading(false)
    // Restore timer recupero se attivo
    const savedTimerEnd = typeof window !== 'undefined' ? localStorage.getItem('bynari_timer_end') : null
    if (savedTimerEnd) {
      const endTs = parseInt(savedTimerEnd)
      const remaining = Math.ceil((endTs - Date.now()) / 1000)
      if (remaining > 0) {
        timerEndRef.current = endTs
        setTimerSecondi(remaining)
        setTimerDurataIniziale(remaining)
        setTimerAttivo(true)
      } else {
        localStorage.removeItem('bynari_timer_end')
      }
    }
  }, [giornoId, assegnazioneId, sessioneIdParam])

  useEffect(() => { fetchGiorno() }, [fetchGiorno])

  // Mostra suggerimento per il primo esercizio all'apertura della sessione
  useEffect(() => {
    if (loading || isViewMode || esercizi.length === 0) return
    const sug = calcolaSuggerimento(esercizi[0])
    if (sug) setSuggerimento(sug)
  }, [loading, esercizi, ultimaSessione])

  useEffect(() => { durataSecondiRef.current = durataSecondi }, [durataSecondi])

  // Persiste i valori non completati in localStorage come draft
  useEffect(() => {
    if (!sessioneId || completata || loading) return
    const draft: Record<string, { serie: { peso_kg: string; ripetizioni: string; reps_sx: string; reps_dx: string; durata_secondi: string }[] }> = {}
    for (const [eseId, logEse] of Object.entries(logs)) {
      draft[eseId] = {
        serie: logEse.serie.map(s => ({
          peso_kg: s.peso_kg,
          ripetizioni: s.ripetizioni,
          reps_sx: s.reps_sx,
          reps_dx: s.reps_dx,
          durata_secondi: s.durata_secondi,
        }))
      }
    }
    localStorage.setItem(`bynari_logs_draft_${sessioneId}`, JSON.stringify(draft))
  }, [logs, sessioneId, completata, loading])

  useEffect(() => {
    if (!timerAttivo) return
    const interval = setInterval(() => {
      if (timerEndRef.current === null) return
      const remaining = Math.ceil((timerEndRef.current - Date.now()) / 1000)
      if (remaining <= 0) {
        setTimerSecondi(0)
        setTimerAttivo(false)
        timerEndRef.current = null
        localStorage.removeItem('bynari_timer_end')
        cancelTimerPush()  // il server non deve mandare il doppio
        cancelLocalNotification()
        feedbackLocale()   // beep + vibrazione immediati
      } else {
        setTimerSecondi(prev => {
          if (remaining <= 4 && remaining > 0 && remaining !== prev) playTickUrgent()
          else if (remaining % 15 === 0 && remaining > 0 && remaining !== prev) playTick()
          return remaining
        })
      }
    }, 500)
    return () => clearInterval(interval)
  }, [timerAttivo])

  // Backup: se JS era in pausa (schermo spento) e il timer è scaduto nel frattempo
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return
      const saved = localStorage.getItem('bynari_timer_end')
      if (!saved) return
      const remaining = Math.ceil((parseInt(saved) - Date.now()) / 1000)
      if (remaining <= 0) {
        setTimerSecondi(0)
        setTimerAttivo(false)
        timerEndRef.current = null
        localStorage.removeItem('bynari_timer_end')
        // Il server push è già partito — solo feedback locale
        feedbackLocale()
      }
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [])

  // Auto-complete EMOM quando tutti i round sono finiti
  useEffect(() => {
    if (emomState?.fase !== 'completed') return
    const info = emomAutoCompleteRef.current
    emomAutoCompleteRef.current = null
    if (!info) return
    const ese = esercizi.find(e => e.id === info.eseId)
    if (!ese) return
    setEmomState(null)
    toggleSerie(ese, info.serieIndex)
  }, [emomState?.fase])

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
        .then(() => {
          if (typeof window !== 'undefined') localStorage.removeItem('bynari_allenamento_url')
          if (sessioneId) localStorage.removeItem(`bynari_logs_draft_${sessioneId}`)
          localStorage.removeItem('bynari_timer_end')
          setCompletata(true)
        })
    }
  }, [logs, esercizi, isViewMode, completata, loading, sessioneId])

  // ── Tabata completion handler ────────────────────────────────────
  useEffect(() => {
    if (isViewMode) return
    for (const ese of esercizi) {
      if (ese.tipo !== 'tabata') continue
      const ts = tabataState[ese.id]
      if (!ts || ts.fase !== 'completed') continue
      // Mark first incomplete serie as complete
      const eseLog = logs[ese.id]
      if (!eseLog) continue
      const firstIncomplete = eseLog.serie.findIndex(s => !s.completata)
      if (firstIncomplete === -1) continue
      toggleSerie(ese, firstIncomplete)
    }
  }, [tabataState]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Progressive overload suggestion ─────────────────────────────
  const calcolaSuggerimento = (ese: SchedaEsercizio): { messaggio: string; eseNome: string } | null => {
    const ultimeSerie = ultimaSessione[ese.id]
    if (!ultimeSerie || ultimeSerie.length === 0) return null
    const tipoInput = ese.esercizi.tipo_input ?? 'reps'
    const progTipo = ese.progressione_tipo ?? 'peso'
    const nome = ese.esercizi.nome

    // Manuale: nessun suggerimento automatico
    if (progTipo === 'manuale') return null

    // ── Parsing range reps ──────────────────────────────────────
    const parseRange = (s: string): { min: number; max: number } | null => {
      const t = s.trim()
      if (t.includes('-')) {
        const parts = t.split('-')
        const min = parseInt(parts[0]); const max = parseInt(parts[1])
        if (isNaN(min) || isNaN(max)) return null
        return { min, max }
      }
      const v = parseInt(t)
      if (isNaN(v)) return null
      return { min: v, max: v }
    }

    // ── TIMER UNILATERALE: progressione durata per lato ──────────
    if (tipoInput === 'timer_unilaterale') {
      const targetSec = parseInt(ese.ripetizioni) || 30
      const getLatoDebole = (s: UltimaSessioneSerie) => {
        const sx = s.reps_sx ?? 0; const dx = s.reps_dx ?? 0
        if (sx === 0 && dx === 0) return 0
        if (sx === 0) return dx
        if (dx === 0) return sx
        return Math.min(sx, dx)
      }
      const tutteAlTarget = ultimeSerie.every(s => getLatoDebole(s) >= targetSec)
      const alcuneSottoTarget = ultimeSerie.some(s => getLatoDebole(s) < targetSec * 0.8)
      if (tutteAlTarget) {
        const nuovaDurata = targetSec + (targetSec >= 60 ? 10 : 5)
        return { messaggio: `⏱ Obiettivo raggiunto! Punta a ${nuovaDurata}s per lato`, eseNome: nome }
      } else if (alcuneSottoTarget) {
        return { messaggio: `⏱ Consolida ${targetSec}s per lato prima di salire`, eseNome: nome }
      } else {
        const mediaEffettiva = Math.round(ultimeSerie.reduce((a, s) => a + getLatoDebole(s), 0) / ultimeSerie.length)
        return { messaggio: `⏱ Media ${mediaEffettiva}s per lato — mantieni e completa tutte le serie`, eseNome: nome }
      }
    }

    // ── TIMER: progressione durata ───────────────────────────────
    if (tipoInput === 'timer' || progTipo === 'durata') {
      const targetSec = parseInt(ese.ripetizioni) || 30
      const tutteAlTarget = ultimeSerie.every(s => (s.durata_secondi ?? 0) >= targetSec)
      const alcuneSottoTarget = ultimeSerie.some(s => (s.durata_secondi ?? 0) < targetSec * 0.8)
      if (tutteAlTarget) {
        const nuovaDurata = targetSec + (targetSec >= 60 ? 10 : 5)
        return { messaggio: `⏱ Obiettivo raggiunto! Punta a ${nuovaDurata}s`, eseNome: nome }
      } else if (alcuneSottoTarget) {
        return { messaggio: `⏱ Consolida ${targetSec}s prima di salire`, eseNome: nome }
      } else {
        const mediaEffettiva = Math.round(ultimeSerie.reduce((a, s) => a + (s.durata_secondi ?? 0), 0) / ultimeSerie.length)
        return { messaggio: `⏱ Media ${mediaEffettiva}s — mantieni e completa tutte le serie`, eseNome: nome }
      }
    }

    // ── REPS (classiche o unilaterali) ──────────────────────────
    const range = parseRange(ese.ripetizioni)
    if (!range) return null
    const { min: repMin, max: repMax } = range

    // Per unilaterale usa il lato debole (MIN sx/dx)
    const getRepsEffettive = (s: UltimaSessioneSerie): number => {
      if (tipoInput === 'reps_unilaterale') {
        const sx = s.reps_sx ?? 0; const dx = s.reps_dx ?? 0
        if (sx === 0 && dx === 0) return 0
        if (sx === 0) return dx
        if (dx === 0) return sx
        return Math.min(sx, dx)
      }
      return s.ripetizioni ?? 0
    }

    const tutteAlMax = ultimeSerie.every(s => getRepsEffettive(s) >= repMax)
    const alcuneSottoMin = ultimeSerie.some(s => getRepsEffettive(s) < repMin)
    const pesoRif = ultimeSerie[0]?.peso_kg

    if (progTipo === 'serie') {
      // Progressione: aggiungi una serie
      if (tutteAlMax) {
        const serieAttuali = ese.serie
        return { messaggio: `📈 Ottimo! Il coach valuterà di aggiungere una ${serieAttuali + 1}ª serie`, eseNome: nome }
      } else if (alcuneSottoMin) {
        return pesoRif && pesoRif > 0
          ? { messaggio: `🎯 Consolida ${pesoRif}kg su tutte le serie prima di aggiungerne una`, eseNome: nome }
          : { messaggio: `🎯 Completa tutte le serie nel range prima di aggiungerne una`, eseNome: nome }
      } else {
        return pesoRif && pesoRif > 0
          ? { messaggio: `🎯 Mantieni ${pesoRif}kg — quasi pronto per una serie in più`, eseNome: nome }
          : null
      }
    }

    if (progTipo === 'reps') {
      // Progressione: aumenta il range reps
      if (tutteAlMax) {
        return { messaggio: `📈 Range completato! Il coach valuterà di alzare le reps target`, eseNome: nome }
      } else if (alcuneSottoMin) {
        return { messaggio: `🎯 Completa tutte le serie nel range ${repMin}–${repMax} prima di salire`, eseNome: nome }
      } else {
        return null
      }
    }

    // progTipo === 'peso' (default)
    if (!pesoRif || pesoRif <= 0) return null
    if (tutteAlMax) {
      const nuovoPeso = Math.round((pesoRif * 1.05) / 0.5) * 0.5
      return { messaggio: `💪 Forza! Sali a ${nuovoPeso}kg oggi`, eseNome: nome }
    } else if (alcuneSottoMin) {
      const nuovoPeso = Math.round((pesoRif * 0.95) / 0.5) * 0.5
      return { messaggio: `📉 Prova con ${nuovoPeso}kg, consolida prima di salire`, eseNome: nome }
    } else {
      return { messaggio: `🎯 Mantieni ${pesoRif}kg — chiudi il buco!`, eseNome: nome }
    }
  }

  const formatDurata = (sec: number) => {
    const h = Math.floor(sec / 3600)
    const m = Math.floor((sec % 3600) / 60)
    const s = sec % 60
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  const addMaxRepsSerie = (eseId: string) => {
    setLogs(prev => {
      const current = prev[eseId]
      if (!current) return prev
      const newSerie: LogSerie = { numero_serie: current.serie.length + 1, peso_kg: '', ripetizioni: '', reps_sx: '', reps_dx: '', durata_secondi: '', rpe: '', rir: '', completata: false }
      return { ...prev, [eseId]: { ...current, serie: [...current.serie, newSerie] } }
    })
  }

  const salvaNota = async (ese: SchedaEsercizio) => {
    if (!sessioneId || isViewMode) return
    const testo = noteBozza[ese.id]?.trim()
    if (!testo) return
    setNoteSalvando(ese.id)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setNoteSalvando(null); return }
    const esistente = noteCliente[ese.id]
    let noteId: string
    if (esistente) {
      await supabase.from('note_esercizio').update({ testo }).eq('id', esistente.id)
      noteId = esistente.id
    } else {
      const { data } = await supabase.from('note_esercizio').insert({
        cliente_id: user.id,
        sessione_id: sessioneId,
        scheda_esercizio_id: ese.id,
        testo,
      }).select('id').single()
      noteId = data!.id
    }
    setNoteCliente(prev => ({ ...prev, [ese.id]: { id: noteId, testo } }))
    setNoteSalvando(null)
  }

  const inviaNoteAlCoach = async (ese: SchedaEsercizio) => {
    if (!coachId || !sessioneId) return
    const nota = noteCliente[ese.id]
    if (!nota) return
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('messaggi').insert({
      coach_id: coachId,
      cliente_id: user.id,
      testo: null,
      da_coach: false,
      metadata: {
        tipo: 'nota_esercizio',
        nota_id: nota.id,
        testo_nota: nota.testo,
        esercizio_nome: ese.esercizi.nome,
        sessione_id: sessioneId,
        scheda_esercizio_id: ese.id,
        assegnazione_id: assegnazioneId,
      },
    })
    setNoteInviata(ese.id)
    setTimeout(() => setNoteInviata(prev => prev === ese.id ? null : prev), 2000)
  }

  const updateLog = (eseId: string, serieIndex: number, field: keyof LogSerie, value: string) => {
    if (isViewMode) return
    setLogs(prev => ({
      ...prev,
      [eseId]: { ...prev[eseId], serie: prev[eseId].serie.map((s, i) => i === serieIndex ? { ...s, [field]: value } : s) }
    }))
  }

  const toggleSerie = async (ese: SchedaEsercizio, serieIndex: number, overrides?: Partial<LogSerie>) => {
    if (!sessioneId || isViewMode) return
    const log = { ...logs[ese.id]?.serie[serieIndex], ...overrides }
    if (!log) return
    const nuovoStato = !log.completata

    // Auto-fill empty fields with confronto values when completing a set
    if (nuovoStato) {
      const c = getConfronto(ese.id, serieIndex)
      const tipoInput = ese.esercizi.tipo_input ?? 'reps'
      if (!log.peso_kg && c?.peso_kg) log.peso_kg = String(c.peso_kg)
      if (tipoInput === 'reps' && !log.ripetizioni && c?.ripetizioni) log.ripetizioni = String(c.ripetizioni)
      if ((tipoInput === 'reps_unilaterale' || tipoInput === 'timer_unilaterale') && !log.reps_sx && c?.reps_sx) log.reps_sx = String(c.reps_sx)
      if ((tipoInput === 'reps_unilaterale' || tipoInput === 'timer_unilaterale') && !log.reps_dx && c?.reps_dx) log.reps_dx = String(c.reps_dx)
    }

    setLogs(prev => ({
      ...prev,
      [ese.id]: { ...prev[ese.id], serie: prev[ese.id].serie.map((s, i) => i === serieIndex ? { ...s, ...log, completata: nuovoStato } : s) }
    }))

    // ── Timer parte SUBITO, prima di qualsiasi chiamata di rete ──
    if (nuovoStato) {
      // Superset / Giant Set: no timer after intermediate exercises in a round
      const isSuperset = !!ese.gruppo_id && ['superset', 'giant_set'].includes(ese.tipo)
      let skipTimer = false
      if (isSuperset) {
        const gruppoEsercizi = esercizi
          .filter(e => e.gruppo_id === ese.gruppo_id)
          .sort((a, b) => a.ordine - b.ordine)
        const eseIdx = gruppoEsercizi.findIndex(e => e.id === ese.id)
        const nextInGroup = gruppoEsercizi.slice(eseIdx + 1)
        // Build tentative logs with current serie marked complete
        const tentativeLogs = {
          ...logs,
          [ese.id]: { ...logs[ese.id], serie: logs[ese.id].serie.map((s, i) => i === serieIndex ? { ...s, completata: true } : s) }
        }
        const hasNextToDo = nextInGroup.some(e => !tentativeLogs[e.id]?.serie[serieIndex]?.completata)
        if (hasNextToDo) {
          skipTimer = true
          setSupersetNext(nextInGroup.find(e => !tentativeLogs[e.id]?.serie[serieIndex]?.completata)?.esercizi?.nome ?? null)
          setTimeout(() => setSupersetNext(null), 3000)
        }
      }
      if (!skipTimer) {
        const endTs = Date.now() + ese.recupero_secondi * 1000
        timerEndRef.current = endTs
        localStorage.setItem('bynari_timer_end', endTs.toString())
        setTimerSecondi(ese.recupero_secondi)
        setTimerDurataIniziale(ese.recupero_secondi)
        setTimerAttivo(true)
        scheduleLocalNotification(ese.recupero_secondi)
        scheduleTimerPush(endTs)
      }
      if (richiede_rpe || richiede_rir) setRpeRirPicker({ eseId: ese.id, serieIndex })
    }

    const { data: existing } = await supabase.from('log_serie').select('id')
      .eq('sessione_id', sessioneId).eq('scheda_esercizio_id', ese.id).eq('numero_serie', serieIndex + 1).single()
    const tipoInput = ese.esercizi.tipo_input ?? 'reps'
    const payload = {
      sessione_id: sessioneId, scheda_esercizio_id: ese.id, numero_serie: serieIndex + 1,
      peso_kg: parseFloat(log.peso_kg) || null,
      ripetizioni: tipoInput === 'reps' ? (parseInt(log.ripetizioni) || null) : null,
      reps_sx: (tipoInput === 'reps_unilaterale' || tipoInput === 'timer_unilaterale') ? (parseInt(log.reps_sx) || null) : null,
      reps_dx: (tipoInput === 'reps_unilaterale' || tipoInput === 'timer_unilaterale') ? (parseInt(log.reps_dx) || null) : null,
      durata_secondi: tipoInput === 'timer' ? (parseInt(log.durata_secondi) || null) : null,
      rpe: log.rpe ? parseFloat(log.rpe) : null,
      rir: log.rir ? parseInt(log.rir) : null,
      completata: nuovoStato,
    }
    if (existing) { await supabase.from('log_serie').update(payload).eq('id', existing.id) }
    else { await supabase.from('log_serie').insert(payload) }

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
    if (typeof window !== 'undefined') localStorage.removeItem('bynari_allenamento_url')
    if (sessioneId) localStorage.removeItem(`bynari_logs_draft_${sessioneId}`)
    localStorage.removeItem('bynari_timer_end')
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

  const calcolaEserciziHighlight = (): { nome: string; pesoMax: number; tipoInput: string; durataMax: number }[] => {
    return esercizi
      .map(ese => {
        const eseLog = logs[ese.id]
        if (!eseLog) return null
        const tipoInput = ese.esercizi.tipo_input ?? 'reps'
        if (tipoInput === 'timer') {
          const durate = eseLog.serie
            .filter(s => s.completata && parseInt(s.durata_secondi) > 0)
            .map(s => parseInt(s.durata_secondi))
          if (durate.length === 0) return null
          return { nome: ese.esercizi.nome, pesoMax: 0, tipoInput, durataMax: Math.max(...durate) }
        }
        const pesi = eseLog.serie
          .filter(s => s.completata && parseFloat(s.peso_kg) > 0)
          .map(s => parseFloat(s.peso_kg))
        if (pesi.length === 0) return null
        return { nome: ese.esercizi.nome, pesoMax: Math.max(...pesi), tipoInput, durataMax: 0 }
      })
      .filter(Boolean) as { nome: string; pesoMax: number; tipoInput: string; durataMax: number }[]
  }

  const getConfronto = (eseId: string, serieIndex: number) =>
    ultimaSessione[eseId]?.find(s => s.numero_serie === serieIndex + 1) ?? null

  const getMiglioramento = (eseId: string, serieIndex: number): { up: number; down: boolean } | null => {
    const c = getConfronto(eseId, serieIndex)
    const log = logs[eseId]?.serie[serieIndex]
    if (!c || !log?.completata) return null

    const pa = parseFloat(log.peso_kg) || 0
    const pu = c.peso_kg ?? 0
    const ra = parseInt(log.ripetizioni) || 0
    const ru = c.ripetizioni ?? 0

    const hasPeso = pa > 0 && pu > 0
    const hasReps = ra > 0 && ru > 0
    if (!hasPeso && !hasReps) return null

    let up = 0
    let down = false
    if (hasPeso) { if (pa > pu) up++; else if (pa < pu) down = true }
    if (hasReps && ra > ru) up++

    if (up === 0 && !down) return null
    return { up, down }
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
          <p className="font-semibold" style={{ color: 'var(--c-97)' }}>Seleziona un giorno</p>
          <button onClick={() => router.push('/cliente/dashboard')}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold"
            style={{ background: 'oklch(0.60 0.15 200)', color: 'var(--c-13)' }}>
            ← Dashboard
          </button>
        </div>
      </div>
    )
  }

  if (loading) return <BynariLoader file="blue" size={80} />

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      {/* ── Workout header — reference WorkoutHeader design ── */}
      <div style={{
        padding: '10px 0 14px',
        borderBottom: '1px solid var(--c-w6)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <button onClick={() => router.push(backUrl)} style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'var(--c-18)', border: '1px solid var(--c-w6)',
            color: 'var(--c-80)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16, cursor: 'pointer',
          }}>←</button>

          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--c-50)', letterSpacing: '0.14em', textTransform: 'uppercase' }}>
              {isViewMode ? 'Archivio' : 'In corso'}
            </div>
            <div style={{
              fontFamily: 'var(--font-syne)', fontWeight: 800, fontSize: 18,
              color: 'var(--c-97)', lineHeight: 1.1, letterSpacing: '0.01em',
            }}>
              {giornoNome.toUpperCase()}
            </div>
          </div>

          {completata ? (
            <div style={{
              height: 36, padding: '0 12px', borderRadius: 10,
              background: 'oklch(0.65 0.18 150 / 15%)', color: 'oklch(0.65 0.18 150)',
              display: 'flex', alignItems: 'center', gap: 6,
              fontSize: 12, fontWeight: 700,
            }}>
              <FontAwesomeIcon icon={faCircleCheck} style={{ fontSize: 11 }} />
              Fatto
            </div>
          ) : (
            <div style={{
              height: 36, padding: '0 12px', borderRadius: 10,
              background: 'oklch(0.70 0.19 46 / 12%)', color: 'var(--accent)',
              display: 'flex', alignItems: 'center', gap: 6,
              fontFamily: 'var(--font-syne)', fontSize: 13, fontWeight: 700,
              fontVariantNumeric: 'tabular-nums',
              border: '1px solid oklch(0.70 0.19 46 / 25%)',
            }}>
              <FontAwesomeIcon icon={faStopwatch} style={{ fontSize: 11 }} />
              {formatDurata(durataSecondi)}
            </div>
          )}
        </div>

        {/* Progress bar */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 11.5, color: 'var(--c-60)', fontWeight: 600 }}>
              Progresso · {serieCompletate}/{serieTotali} serie
            </span>
            <span style={{
              fontSize: 11.5, fontWeight: 700, fontVariantNumeric: 'tabular-nums',
              color: progressoPerc === 100 ? 'oklch(0.65 0.18 150)' : 'var(--c-70)',
            }}>
              {progressoPerc}%
            </span>
          </div>
          <div style={{ height: 6, borderRadius: 3, background: 'var(--c-20)', overflow: 'hidden' }}>
            <div style={{
              height: '100%', width: `${progressoPerc}%`,
              background: progressoPerc === 100
                ? 'linear-gradient(90deg, oklch(0.65 0.18 150), oklch(0.75 0.18 150))'
                : 'linear-gradient(90deg, var(--accent), oklch(0.78 0.16 46))',
              borderRadius: 3,
              transition: 'width 0.5s cubic-bezier(0.2, 0.8, 0.2, 1)',
              boxShadow: progressoPerc > 0 ? '0 0 12px oklch(0.70 0.19 46 / 60%)' : 'none',
            }} />
          </div>
        </div>
      </div>

      {/* suggerimento: now rendered inline inside each exercise card — removed floating overlay */}

      {/* Superset → prossimo esercizio indicator */}
      {supersetNext && !isViewMode && (
        <div className="fixed left-0 right-0 z-40 px-4"
          style={{ bottom: 'calc(env(safe-area-inset-bottom) + 4.5rem)' }}>
          <div className="max-w-2xl mx-auto rounded-2xl px-5 py-3 flex items-center gap-3"
            style={{ background: 'var(--c-18)', border: '1px solid oklch(0.60 0.15 200 / 50%)', boxShadow: '0 8px 32px oklch(0 0 0 / 60%)' }}>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-base font-bold"
              style={{ background: 'oklch(0.60 0.15 200 / 15%)', color: 'oklch(0.60 0.15 200)' }}>→</div>
            <div>
              <p className="text-xs font-semibold" style={{ color: 'oklch(0.60 0.15 200)' }}>Prossimo nel gruppo</p>
              <p className="text-sm font-bold" style={{ color: 'var(--c-97)' }}>{supersetNext}</p>
            </div>
          </div>
        </div>
      )}

      {/* Timer recupero — overlay full-screen, solo in modalità live */}
      {timerAttivo && !isViewMode && (() => {
        const dur = timerDurataIniziale || timerSecondi
        const pct = dur > 0 ? (timerSecondi / dur) * 100 : 0
        const r = 100
        const circumference = 2 * Math.PI * r
        const offset = circumference * (1 - pct / 100)
        const urgent = timerSecondi <= 5 && timerSecondi > 0
        const mins = Math.floor(timerSecondi / 60)
        const secs = timerSecondi % 60
        const timeStr = mins > 0 ? `${mins}:${String(secs).padStart(2, '0')}` : String(secs)
        const skipTimer = () => { setTimerAttivo(false); cancelTimerPush(); cancelLocalNotification() }
        return (
          <div style={{
            position: 'fixed', inset: 0,
            background: 'oklch(0.11 0 0 / 92%)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            zIndex: 50, padding: 24,
            animation: 'fadeIn 0.25s',
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--c-55)', letterSpacing: '0.2em', marginBottom: 20 }}>
              RECUPERO
            </div>
            <div style={{ position: 'relative', width: 220, height: 220, animation: urgent ? 'shake 0.3s infinite' : 'none' }}>
              <svg width="220" height="220" viewBox="0 0 220 220" style={{ transform: 'rotate(-90deg)' }}>
                <circle cx="110" cy="110" r={r} stroke="var(--c-20)" strokeWidth="8" fill="none"/>
                <circle cx="110" cy="110" r={r}
                  stroke={urgent ? 'var(--danger, oklch(0.65 0.22 27))' : 'var(--accent)'}
                  strokeWidth="10" fill="none"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={offset}
                  style={{
                    transition: 'stroke-dashoffset 1s linear, stroke 0.3s',
                    filter: `drop-shadow(0 0 12px ${urgent ? 'var(--danger, oklch(0.65 0.22 27))' : 'var(--accent)'})`,
                  }}
                />
              </svg>
              <div style={{
                position: 'absolute', inset: 0,
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              }}>
                <div style={{
                  fontFamily: 'var(--font-syne)', fontWeight: 800, fontSize: 68,
                  color: urgent ? 'var(--danger, oklch(0.65 0.22 27))' : 'var(--c-97)',
                  lineHeight: 1, fontVariantNumeric: 'tabular-nums',
                  letterSpacing: '-0.02em',
                }}>
                  {timeStr}
                </div>
                <div style={{ fontSize: 12, color: 'var(--c-55)', marginTop: 6 }}>
                  {timerSecondi > 0 ? 'secondi' : 'Pronto!'}
                </div>
              </div>
            </div>
            <div style={{ marginTop: 36, textAlign: 'center', maxWidth: 280 }}>
              <div style={{ fontSize: 13, color: 'var(--c-80)', fontWeight: 500, lineHeight: 1.4 }}>
                {timerSecondi > 30 ? 'Respira. Visualizza la prossima serie.' :
                 timerSecondi > 10 ? 'Preparati. Ancora pochi secondi.' :
                 timerSecondi > 0 ? 'Posizione. Vai!' : 'Andiamo!'}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 32 }}>
              <button onClick={() => setTimerSecondi(s => Math.max(0, s - 15))} style={{
                padding: '10px 16px', borderRadius: 10,
                background: 'var(--c-20)', color: 'var(--c-80)',
                fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer',
                display: 'inline-flex', alignItems: 'center', gap: 6,
              }}>−15s</button>
              <button onClick={skipTimer} style={{
                padding: '10px 20px', borderRadius: 10,
                background: 'var(--accent)', color: 'var(--c-13)',
                fontSize: 12, fontWeight: 700, border: 'none', cursor: 'pointer',
                display: 'inline-flex', alignItems: 'center', gap: 6,
              }}>Salta recupero →</button>
            </div>
          </div>
        )
      })()}


      {/* Warmup generale */}
      {warmupNote && !isViewMode && (
        <div className="rounded-2xl px-4 py-3 flex items-start gap-3"
          style={{ background: 'oklch(0.65 0.18 150 / 8%)', border: '1px solid oklch(0.65 0.18 150 / 25%)' }}>
          <span className="text-lg flex-shrink-0">🔥</span>
          <div>
            <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: 'oklch(0.65 0.18 150)' }}>
              Warmup generale
            </p>
            <p className="text-sm whitespace-pre-line" style={{ color: 'var(--c-75)', lineHeight: 1.6 }}>
              {warmupNote}
            </p>
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
                background: 'var(--c-18)',
                border: `1px solid ${tutteCompletate ? 'oklch(0.65 0.18 150 / 30%)' : isGrouped && tipoInfo ? `${tipoInfo.color}30` : 'var(--c-w6)'}`,
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
                    style={{ background: 'var(--c-18)', border: '1px solid var(--c-w8)' }}
                    onClick={e => e.stopPropagation()}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FontAwesomeIcon icon={faNoteSticky} style={{ color: 'oklch(0.70 0.19 46)' }} />
                        <p className="text-sm font-bold" style={{ color: 'var(--c-97)' }}>Note — {ese.esercizi.nome}</p>
                      </div>
                      <button
                        onClick={() => setNoteAperta(null)}
                        className="w-8 h-8 rounded-full flex items-center justify-center"
                        style={{ background: 'var(--c-25)', color: 'var(--c-60)' }}
                      >
                        <FontAwesomeIcon icon={faXmark} />
                      </button>
                    </div>
                    {ese.esercizi.descrizione && (
                      <div className="space-y-1">
                        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--c-45)' }}>Descrizione esercizio</p>
                        <p className="text-sm leading-relaxed" style={{ color: 'var(--c-72)' }}>{ese.esercizi.descrizione}</p>
                      </div>
                    )}
                    {ese.note && (
                      <div className="space-y-1">
                        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--c-45)' }}>Note del coach</p>
                        <p className="text-sm leading-relaxed" style={{ color: 'var(--c-72)' }}>{ese.note}</p>
                      </div>
                    )}
                    <div className="flex justify-center pt-1">
                      <div className="w-10 h-1 rounded-full" style={{ background: 'var(--c-30)' }} />
                    </div>
                  </div>
                </div>
              )}

              <div className="px-4 py-3 flex items-center justify-between"
                style={{ borderBottom: '1px solid var(--c-w6)' }}>
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {/* Circle badge */}
                  <div className="flex-shrink-0 flex items-center justify-center text-xs font-black"
                    style={{
                      width: 32, height: 32, borderRadius: '50%',
                      background: tutteCompletate ? 'oklch(0.65 0.18 150 / 20%)' : 'oklch(0.70 0.19 46 / 20%)',
                      color: tutteCompletate ? 'oklch(0.65 0.18 150)' : 'var(--accent)',
                      border: `2px solid ${tutteCompletate ? 'oklch(0.65 0.18 150 / 40%)' : 'oklch(0.70 0.19 46 / 35%)'}`,
                    }}>
                    {tutteCompletate ? '✓' : eseIndex + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-sm" style={{ color: 'var(--c-97)' }}>{ese.esercizi.nome}</p>
                    <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                      <span className="text-xs" style={{ color: 'var(--c-50)' }}>{ese.serie} × {ese.ripetizioni}{ese.esercizi.tipo_input === 'timer' ? 's' : ese.esercizi.tipo_input === 'timer_unilaterale' ? 's/lato' : ' reps'} · {ese.recupero_secondi}s rec.</span>
                      {ese.peso_consigliato_kg != null && (
                        <span className="text-xs px-1.5 py-0.5 rounded-full font-semibold"
                          style={{ background: 'oklch(0.60 0.15 200 / 12%)', color: 'oklch(0.60 0.15 200)' }}>
                          ~{ese.peso_consigliato_kg}kg
                        </span>
                      )}
                      {ese.tut && (
                        <span className="text-xs px-1.5 py-0.5 rounded-full font-semibold"
                          style={{ background: 'oklch(0.65 0.15 300 / 15%)', color: 'oklch(0.65 0.15 300)' }}>
                          TUT {ese.tut}
                        </span>
                      )}
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
                      {ese.tipo === 'tabata' && ese.tabata_work_secondi && (
                        <span className="text-xs px-1.5 py-0.5 rounded-full font-semibold"
                          style={{ background: 'oklch(0.70 0.15 0 / 15%)', color: 'oklch(0.70 0.15 0)' }}>
                          {ese.tabata_work_secondi}s/{ese.tabata_rest_secondi}s × {ese.tabata_rounds}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                {/* Action buttons: ... style */}
                <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                  {ese.esercizi.descrizione && (
                    <button
                      onClick={() => setNoteAperta(noteAperta === ese.id ? null : ese.id)}
                      className="w-8 h-8 rounded-full flex items-center justify-center transition-all active:scale-90"
                      style={{
                        background: noteAperta === ese.id ? 'oklch(0.70 0.19 46 / 20%)' : 'var(--c-22)',
                        color: noteAperta === ese.id ? 'oklch(0.70 0.19 46)' : 'var(--c-50)',
                        border: `1px solid ${noteAperta === ese.id ? 'oklch(0.70 0.19 46 / 40%)' : 'var(--c-w8)'}`,
                      }}>
                      <FontAwesomeIcon icon={faCircleInfo} style={{ fontSize: 12 }} />
                    </button>
                  )}
                  {!isViewMode && (
                    <button
                      onClick={() => setNoteApertaEse(noteApertaEse === ese.id ? null : ese.id)}
                      className="relative w-8 h-8 rounded-full flex items-center justify-center transition-all active:scale-90"
                      style={{
                        background: noteApertaEse === ese.id ? 'oklch(0.70 0.19 46 / 20%)' : 'var(--c-22)',
                        color: noteApertaEse === ese.id ? 'oklch(0.70 0.19 46)' : 'var(--c-50)',
                        border: `1px solid ${noteApertaEse === ese.id ? 'oklch(0.70 0.19 46 / 40%)' : 'var(--c-w8)'}`,
                      }}>
                      <FontAwesomeIcon icon={faPencil} style={{ fontSize: 11 }} />
                      {noteCliente[ese.id] && (
                        <span className="absolute top-0 right-0 w-2 h-2 rounded-full"
                          style={{ background: 'var(--accent)', border: '1.5px solid var(--c-18)' }} />
                      )}
                    </button>
                  )}
                  {(ese.esercizi.gif_url || ese.esercizi.video_url) && (
                    <button
                      onClick={() => {
                        if (ese.esercizi.gif_url) { const el = document.getElementById(`gif-${ese.id}`); if (el) el.classList.toggle('hidden') }
                        else if (ese.esercizi.video_url) window.open(ese.esercizi.video_url, '_blank')
                      }}
                      className="w-8 h-8 rounded-full flex items-center justify-center"
                      style={{ background: 'var(--c-22)', color: 'var(--c-50)', border: '1px solid var(--c-w8)', fontSize: 12 }}>
                      {ese.esercizi.gif_url ? '🎞' : '▶'}
                    </button>
                  )}
                </div>
              </div>

              {/* Coach note — orange banner, always visible when present */}
              {ese.note && (
                <div className="flex items-center gap-2 px-4 py-2.5"
                  style={{ background: 'oklch(0.70 0.19 46 / 10%)', borderBottom: '1px solid oklch(0.70 0.19 46 / 20%)' }}>
                  <span style={{ fontSize: 14, flexShrink: 0 }}>💬</span>
                  <p className="text-xs font-semibold leading-snug" style={{ color: 'oklch(0.80 0.15 46)', whiteSpace: 'pre-line' }}>
                    <span style={{ fontWeight: 800, color: 'var(--accent)' }}>Coach:</span> {ese.note}
                  </p>
                </div>
              )}

              {/* Suggerimento progressione — inline banner per questo esercizio */}
              {suggerimento && suggerimento.eseNome === ese.esercizi.nome && !isViewMode && (
                <div className="flex items-center gap-2 px-4 py-2.5"
                  style={{ background: 'oklch(0.82 0.17 85 / 10%)', borderBottom: '1px solid oklch(0.82 0.17 85 / 25%)' }}>
                  <span style={{ fontSize: 14, flexShrink: 0 }}>🏆</span>
                  <p className="text-xs font-semibold leading-snug flex-1" style={{ color: 'oklch(0.88 0.14 85)' }}>
                    {suggerimento.messaggio}
                  </p>
                  <button
                    onClick={() => setSuggerimento(null)}
                    className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center"
                    style={{ background: 'oklch(0.82 0.17 85 / 20%)', color: 'oklch(0.82 0.17 85)' }}>
                    <FontAwesomeIcon icon={faXmark} style={{ fontSize: 9 }} />
                  </button>
                </div>
              )}

              {/* GIF panel — hidden by default, toggled by 🎞 button */}
              {ese.esercizi.gif_url && (
                <div id={`gif-${ese.id}`} className="hidden px-4 py-3"
                  style={{ borderBottom: '1px solid var(--c-w5)', background: 'var(--c-w3)' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={ese.esercizi.gif_url} alt={ese.esercizi.nome}
                    className="h-40 rounded-xl mx-auto object-contain"
                    onError={e => { (e.target as HTMLImageElement).parentElement!.style.display = 'none' }} />
                </div>
              )}

              {/* Nota cliente — anteprima collassata */}
              {noteCliente[ese.id] && noteApertaEse !== ese.id && (
                <div className="px-4 py-2 flex items-center gap-2"
                  style={{ borderBottom: '1px solid var(--c-w5)', background: 'oklch(0.70 0.19 46 / 5%)' }}>
                  <span style={{ fontSize: 10, color: 'oklch(0.70 0.19 46)' }}>📝</span>
                  <p className="text-xs truncate flex-1" style={{ color: 'var(--c-65)' }}>
                    {noteCliente[ese.id].testo.length > 50
                      ? noteCliente[ese.id].testo.slice(0, 50) + '…'
                      : noteCliente[ese.id].testo}
                  </p>
                </div>
              )}

              {/* Nota cliente — textarea inline */}
              {noteApertaEse === ese.id && !isViewMode && (
                <div className="px-4 py-3 space-y-2.5"
                  style={{ borderBottom: '1px solid var(--c-w6)', background: 'oklch(0.70 0.19 46 / 4%)' }}>
                  <textarea
                    value={noteBozza[ese.id] ?? ''}
                    onChange={e => setNoteBozza(prev => ({ ...prev, [ese.id]: e.target.value }))}
                    placeholder="Scrivi una nota su questo esercizio..."
                    rows={3}
                    className="w-full px-3 py-2.5 rounded-xl text-sm outline-none resize-none"
                    style={{ background: 'var(--c-22)', border: '1px solid var(--c-w8)', color: 'var(--c-97)' }}
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => salvaNota(ese)}
                      disabled={!noteBozza[ese.id]?.trim() || noteSalvando === ese.id}
                      className="flex-1 py-2 rounded-xl text-xs font-bold transition-all active:scale-95"
                      style={{
                        background: 'oklch(0.70 0.19 46 / 15%)',
                        border: '1px solid oklch(0.70 0.19 46 / 35%)',
                        color: 'oklch(0.70 0.19 46)',
                        opacity: !noteBozza[ese.id]?.trim() ? 0.4 : 1,
                      }}>
                      {noteSalvando === ese.id ? '...' : 'Salva nota'}
                    </button>
                    {noteCliente[ese.id] && coachId && (
                      <button
                        onClick={() => inviaNoteAlCoach(ese)}
                        className="flex-1 py-2 rounded-xl text-xs font-bold transition-all active:scale-95"
                        style={{
                          background: noteInviata === ese.id ? 'oklch(0.65 0.18 150 / 15%)' : 'oklch(0.60 0.15 200 / 15%)',
                          border: `1px solid ${noteInviata === ese.id ? 'oklch(0.65 0.18 150 / 35%)' : 'oklch(0.60 0.15 200 / 30%)'}`,
                          color: noteInviata === ese.id ? 'oklch(0.65 0.18 150)' : 'oklch(0.60 0.15 200)',
                        }}>
                        {noteInviata === ese.id ? 'Inviata al coach ✓' : 'Invia al coach'}
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Nota cliente — visibile in view mode */}
              {isViewMode && noteCliente[ese.id] && (
                <div className="px-4 py-2.5 flex items-start gap-2"
                  style={{ borderBottom: '1px solid var(--c-w5)', background: 'oklch(0.70 0.19 46 / 5%)' }}>
                  <span style={{ fontSize: 12, flexShrink: 0, marginTop: 1 }}>📝</span>
                  <p className="text-xs leading-snug" style={{ color: 'var(--c-72)', whiteSpace: 'pre-line' }}>
                    {noteCliente[ese.id].testo}
                  </p>
                </div>
              )}

              <div className="divide-y" style={{ borderColor: 'var(--c-w4)' }}>
                {/* Warmup specifico serie */}
                {!isViewMode && (ese.warmup_serie ?? []).length > 0 && (
                  <>
                    {(ese.warmup_serie ?? []).map((w, wi) => (
                      <div key={`w${wi}`} className="px-4 py-2.5 flex items-center gap-3"
                        style={{ background: 'oklch(0.65 0.18 150 / 4%)', borderBottom: '1px solid var(--c-w4)' }}>
                        <span className="text-xs font-bold w-16 flex-shrink-0"
                          style={{ color: 'oklch(0.65 0.18 150)' }}>
                          W{wi + 1}
                        </span>
                        <span className="text-sm font-black" style={{ color: 'var(--c-70)' }}>
                          {w.peso ? `${w.peso} kg` : 'Barra'} × {w.reps} reps
                        </span>
                        <span className="text-xs ml-auto" style={{ color: 'var(--c-40)' }}>warmup</span>
                      </div>
                    ))}
                    <div className="px-4 py-1.5 flex items-center gap-2"
                      style={{ background: 'oklch(0.65 0.18 150 / 3%)' }}>
                      <div className="flex-1 h-px" style={{ background: 'oklch(0.65 0.18 150 / 20%)' }} />
                      <span className="text-xs font-bold uppercase tracking-widest"
                        style={{ color: 'oklch(0.65 0.18 150 / 60%)' }}>serie lavoranti</span>
                      <div className="flex-1 h-px" style={{ background: 'oklch(0.65 0.18 150 / 20%)' }} />
                    </div>
                  </>
                )}
                {eseLog?.serie.map((serie, serieIndex) => {
                  const confronto = !isViewMode ? getConfronto(ese.id, serieIndex) : null
                  const miglioramento = !isViewMode ? getMiglioramento(ese.id, serieIndex) : null
                  // "Active" = first uncompleted serie in this exercise
                  const isActiveSet = !serie.completata && !isViewMode && eseLog.serie.slice(0, serieIndex).every(s => s.completata)

                  // ── NEW DESIGN: reps / reps_unilaterale / timer / timer_unilaterale in live mode ──
                  const tipoInputNew = ese.esercizi.tipo_input ?? 'reps'
                  const isNewDesign = !isViewMode && !['amrap', 'emom', 'tabata', 'max_reps'].includes(ese.tipo) &&
                    ['reps', 'reps_unilaterale', 'timer', 'timer_unilaterale'].includes(tipoInputNew)
                  if (isNewDesign) {
                    // Font size che si restringe al crescere delle cifre
                    const dynFs = (val: string) => {
                      const l = (val || '').length
                      if (l <= 3) return 24
                      if (l === 4) return 20
                      if (l === 5) return 16
                      return 13
                    }

                    const btnStyle: React.CSSProperties = {
                      width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                      background: 'var(--c-22)', color: 'var(--c-80)',
                      fontSize: 20, fontWeight: 700,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      border: 'none', cursor: 'pointer',
                    }
                    const ctaBaseStyle: React.CSSProperties = {
                      width: '100%', height: 52, borderRadius: 14, border: 'none', cursor: 'pointer',
                      color: 'var(--c-11)', fontFamily: 'var(--font-syne)', fontSize: 15, fontWeight: 800, letterSpacing: '0.06em',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                    }

                    // ── DONE — compact row ───────────────────────────────────
                    if (serie.completata) {
                      const isPRRow = tipoInputNew === 'reps' ? (() => { const c = confronto; if (!c) return false; const pa = parseFloat(serie.peso_kg) || 0; return pa > (c.peso_kg ?? 0) && pa > 0 })() : false
                      let summaryNode: React.ReactNode
                      if (tipoInputNew === 'reps') {
                        summaryNode = <span style={{ fontFamily: 'var(--font-syne)', fontSize: 16, fontWeight: 700, color: isPRRow ? 'var(--gold)' : 'var(--c-97)', fontVariantNumeric: 'tabular-nums' }}>{serie.peso_kg ? `${serie.peso_kg}kg` : '—'} × {serie.ripetizioni || '—'}</span>
                      } else if (tipoInputNew === 'reps_unilaterale') {
                        summaryNode = <span style={{ fontFamily: 'var(--font-syne)', fontSize: 15, fontWeight: 700, color: 'var(--c-97)', fontVariantNumeric: 'tabular-nums' }}>{serie.peso_kg ? `${serie.peso_kg}kg × ` : ''}{serie.reps_sx ?? '—'}sx / {serie.reps_dx ?? '—'}dx</span>
                      } else if (tipoInputNew === 'timer') {
                        summaryNode = <span style={{ fontFamily: 'var(--font-syne)', fontSize: 16, fontWeight: 700, color: 'var(--c-97)', fontVariantNumeric: 'tabular-nums' }}>{serie.durata_secondi && serie.durata_secondi !== '0' ? `${serie.durata_secondi}s` : '—'}{serie.peso_kg ? <span style={{ fontSize: 12, color: 'var(--c-55)', fontWeight: 600 }}> ({serie.peso_kg}kg)</span> : null}</span>
                      } else {
                        summaryNode = <span style={{ fontFamily: 'var(--font-syne)', fontSize: 15, fontWeight: 700, color: 'var(--c-97)', fontVariantNumeric: 'tabular-nums' }}>{serie.reps_sx ?? '—'}s sx / {serie.reps_dx ?? '—'}s dx</span>
                      }
                      return (
                        <div key={serieIndex} style={{
                          display: 'flex', alignItems: 'center', gap: 12,
                          padding: '11px 16px', margin: '0 8px 4px', borderRadius: 12,
                          background: isPRRow ? 'linear-gradient(90deg, oklch(0.82 0.17 85 / 18%) 0%, oklch(0.82 0.17 85 / 4%) 100%)' : 'oklch(0.65 0.18 150 / 8%)',
                          border: `1px solid ${isPRRow ? 'oklch(0.82 0.17 85 / 35%)' : 'oklch(0.65 0.18 150 / 25%)'}`,
                          animation: 'scaleIn 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)',
                        }}>
                          <div style={{
                            width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                            background: isPRRow ? 'var(--gold)' : 'var(--success)', color: 'var(--c-13)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800,
                            boxShadow: isPRRow ? '0 0 14px oklch(0.82 0.17 85 / 60%)' : '0 0 10px oklch(0.65 0.18 150 / 40%)',
                          }}>{isPRRow ? '🏆' : '✓'}</div>
                          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                            <span style={{ fontSize: 12, color: 'var(--c-55)', fontWeight: 600, flexShrink: 0 }}>Serie {serieIndex + 1}</span>
                            {summaryNode}
                            {isPRRow && <span style={{ fontSize: 9, fontWeight: 800, padding: '2px 6px', borderRadius: 4, background: 'var(--gold)', color: 'var(--c-13)', flexShrink: 0 }}>PR</span>}
                          </div>
                          {miglioramento && miglioramento.up > 0 && (
                            <span style={{ fontSize: 10, color: 'var(--success)', flexShrink: 0, letterSpacing: '-1px' }}>
                              {'▲'.repeat(miglioramento.up)}
                            </span>
                          )}
                          {miglioramento?.down && <span style={{ fontSize: 10, color: 'var(--danger-text)', flexShrink: 0 }}>▼</span>}
                          <button onClick={() => toggleSerie(ese, serieIndex)} style={{ flexShrink: 0, width: 28, height: 28, borderRadius: 8, background: 'oklch(0.65 0.18 150 / 15%)', border: '1px solid oklch(0.65 0.18 150 / 30%)', color: 'var(--c-55)', fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Modifica serie">✎</button>
                        </div>
                      )
                    }

                    // ── INACTIVE — collapsed row ─────────────────────────────
                    if (!isActiveSet) {
                      let ultimaNode: React.ReactNode
                      if (tipoInputNew === 'reps') ultimaNode = <span style={{ color: 'var(--c-65)', fontWeight: 700 }}>{confronto?.peso_kg ?? '—'}kg × {confronto?.ripetizioni ?? '—'}</span>
                      else if (tipoInputNew === 'reps_unilaterale') ultimaNode = <span style={{ color: 'var(--c-65)', fontWeight: 700 }}>{confronto?.peso_kg ? `${confronto.peso_kg}kg × ` : ''}{confronto?.reps_sx ?? '—'}sx / {confronto?.reps_dx ?? '—'}dx</span>
                      else if (tipoInputNew === 'timer') ultimaNode = <span style={{ color: 'var(--c-65)', fontWeight: 700 }}>{confronto?.durata_secondi ? `${confronto.durata_secondi}s` : '—'}</span>
                      else ultimaNode = <span style={{ color: 'var(--c-65)', fontWeight: 700 }}>{confronto?.reps_sx ?? '—'}s sx / {confronto?.reps_dx ?? '—'}s dx</span>
                      return (
                        <div key={serieIndex} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', opacity: 0.55 }}>
                          <div style={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0, background: 'var(--c-22)', color: 'var(--c-50)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700 }}>{serieIndex + 1}</div>
                          <span style={{ flex: 1, fontSize: 12.5, color: 'var(--c-45)' }}>Ultima: {ultimaNode}</span>
                        </div>
                      )
                    }

                    // ── ACTIVE card — common header ──────────────────────────
                    const ultimaLabel = confronto ? (
                      tipoInputNew === 'reps' ? `Ultima: ${confronto.peso_kg ?? '—'}kg × ${confronto.ripetizioni ?? '—'}`
                      : tipoInputNew === 'reps_unilaterale' ? `Ultima: ${confronto.reps_sx ?? '—'}sx / ${confronto.reps_dx ?? '—'}dx`
                      : tipoInputNew === 'timer' ? `Ultima: ${confronto.durata_secondi ?? '—'}s`
                      : `Ultima: ${confronto.reps_sx ?? '—'}s sx / ${confronto.reps_dx ?? '—'}s dx`
                    ) : null
                    const activeHeader = (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                        <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--accent)', color: 'var(--c-13)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, flexShrink: 0 }}>{serieIndex + 1}</div>
                        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--c-97)' }}>Serie {serieIndex + 1}</span>
                        {ese.tipo === 'dropset' && ese.drop_percentage && serieIndex > 0 && (() => { const p0 = parseFloat(eseLog?.serie[0]?.peso_kg || '0'); if (!p0) return null; const ps = Math.round((p0 * Math.pow(1 - ese.drop_percentage / 100, serieIndex)) / 0.5) * 0.5; return <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 12, background: 'oklch(0.70 0.19 46 / 15%)', color: 'oklch(0.70 0.19 46)' }}>~{ps}kg</span> })()}
                        {ese.tipo === 'piramidale' && <span style={{ fontSize: 11, color: 'oklch(0.85 0.12 80)' }}>{ese.piramidale_direzione === 'ascendente' ? '↑ sali' : '↓ scendi'}</span>}
                        {ultimaLabel && <span style={{ fontSize: 11, color: 'var(--c-50)', marginLeft: 'auto' }}>{ultimaLabel}</span>}
                      </div>
                    )
                    const activeCardWrap: React.CSSProperties = {
                      background: 'var(--c-18)', border: '2px solid var(--accent)',
                      borderRadius: 16, padding: 16, margin: '4px 0',
                      animation: 'scaleIn 0.25s',
                      boxShadow: '0 8px 24px -8px oklch(0.70 0.19 46 / 40%)',
                    }

                    // ── reps ────────────────────────────────────────────────
                    if (tipoInputNew === 'reps') {
                      const wVal = serie.peso_kg
                      const rVal = serie.ripetizioni
                      const wCur = parseFloat(wVal) || (confronto?.peso_kg ?? 0)
                      const rCur = parseInt(rVal) || (confronto?.ripetizioni ?? 0)
                      const wHighlight = parseFloat(wVal) > 0 && (confronto?.peso_kg ?? 0) > 0 && parseFloat(wVal) > (confronto?.peso_kg ?? 0)
                      const rHighlight = parseInt(rVal) > 0 && (confronto?.ripetizioni ?? 0) > 0 && parseInt(rVal) > (confronto?.ripetizioni ?? 0)
                      return (
                        <div key={serieIndex} style={activeCardWrap}>
                          {activeHeader}
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 10, alignItems: 'center', marginBottom: 14 }}>
                            <div>
                              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--c-50)', letterSpacing: '0.12em', marginBottom: 6, textAlign: 'center' }}>PESO</div>
                              <div style={{ background: 'var(--c-13)', borderRadius: 12, padding: '6px', display: 'flex', alignItems: 'center', gap: 4, border: wHighlight ? '1px solid var(--accent)' : '1px solid var(--c-w8)', boxShadow: wHighlight ? '0 0 0 3px oklch(0.70 0.19 46 / 12%)' : 'none' }}>
                                <button onClick={() => updateLog(ese.id, serieIndex, 'peso_kg', String(Math.max(0, Math.round((wCur - 2.5) * 10) / 10)))} style={btnStyle}>−</button>
                                <div style={{ flex: 1, display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 2 }}>
                                  <input type="text" inputMode="decimal" value={wVal} placeholder={String(confronto?.peso_kg ?? 0)} onChange={e => { const raw = e.target.value.replace(',', '.'); if (/^\d*\.?\d{0,2}$/.test(raw)) updateLog(ese.id, serieIndex, 'peso_kg', raw) }} style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', textAlign: 'center', fontFamily: 'var(--font-syne)', fontWeight: 800, fontSize: dynFs(wVal), color: wHighlight ? 'var(--accent)' : 'var(--c-97)', fontVariantNumeric: 'tabular-nums', padding: 0, caretColor: 'var(--accent)' }} />
                                  <span style={{ fontSize: 10, color: 'var(--c-50)', fontWeight: 600, flexShrink: 0 }}>kg</span>
                                </div>
                                <button onClick={() => updateLog(ese.id, serieIndex, 'peso_kg', String(Math.round((wCur + 2.5) * 10) / 10))} style={btnStyle}>+</button>
                              </div>
                            </div>
                            <div style={{ textAlign: 'center', color: 'var(--c-40)', fontWeight: 700, fontSize: 16 }}>×</div>
                            <div>
                              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--c-50)', letterSpacing: '0.12em', marginBottom: 6, textAlign: 'center' }}>REPS</div>
                              <div style={{ background: 'var(--c-13)', borderRadius: 12, padding: '6px', display: 'flex', alignItems: 'center', gap: 4, border: rHighlight ? '1px solid var(--accent)' : '1px solid var(--c-w8)' }}>
                                <button onClick={() => updateLog(ese.id, serieIndex, 'ripetizioni', String(Math.max(0, rCur - 1)))} style={btnStyle}>−</button>
                                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                  <input type="text" inputMode="numeric" value={rVal} placeholder={String(confronto?.ripetizioni ?? 0)} onChange={e => { if (/^\d*$/.test(e.target.value)) updateLog(ese.id, serieIndex, 'ripetizioni', e.target.value) }} style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', textAlign: 'center', fontFamily: 'var(--font-syne)', fontWeight: 800, fontSize: dynFs(rVal), color: rHighlight ? 'var(--accent)' : 'var(--c-97)', fontVariantNumeric: 'tabular-nums', padding: 0, caretColor: 'var(--accent)' }} />
                                </div>
                                <button onClick={() => updateLog(ese.id, serieIndex, 'ripetizioni', String(rCur + 1))} style={btnStyle}>+</button>
                              </div>
                            </div>
                          </div>
                          <button onClick={() => toggleSerie(ese, serieIndex)} style={{ ...ctaBaseStyle, background: 'linear-gradient(180deg, var(--success) 0%, oklch(0.58 0.17 150) 100%)', boxShadow: '0 6px 20px -4px oklch(0.65 0.18 150 / 50%)' }} onTouchStart={e => (e.currentTarget.style.transform = 'scale(0.97)')} onTouchEnd={e => (e.currentTarget.style.transform = 'scale(1)')} onMouseDown={e => (e.currentTarget.style.transform = 'scale(0.97)')} onMouseUp={e => (e.currentTarget.style.transform = 'scale(1)')}>✓ SERIE COMPLETATA</button>
                        </div>
                      )
                    }

                    // ── reps_unilaterale ────────────────────────────────────
                    if (tipoInputNew === 'reps_unilaterale') {
                      const wVal = serie.peso_kg
                      const sxVal = serie.reps_sx
                      const dxVal = serie.reps_dx
                      const wCur = parseFloat(wVal) || (confronto?.peso_kg ?? 0)
                      const sxCur = parseInt(sxVal) || (confronto?.reps_sx ?? 0)
                      const dxCur = parseInt(dxVal) || (confronto?.reps_dx ?? 0)
                      return (
                        <div key={serieIndex} style={activeCardWrap}>
                          {activeHeader}
                          <div style={{ marginBottom: 10 }}>
                            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--c-50)', letterSpacing: '0.12em', marginBottom: 6, textAlign: 'center' }}>PESO</div>
                            <div style={{ background: 'var(--c-13)', borderRadius: 12, padding: '6px', display: 'flex', alignItems: 'center', gap: 4, border: '1px solid var(--c-w8)' }}>
                              <button onClick={() => updateLog(ese.id, serieIndex, 'peso_kg', String(Math.max(0, Math.round((wCur - 2.5) * 10) / 10)))} style={btnStyle}>−</button>
                              <div style={{ flex: 1, display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 2 }}>
                                <input type="text" inputMode="decimal" value={wVal} placeholder={String(confronto?.peso_kg ?? 0)} onChange={e => { const raw = e.target.value.replace(',', '.'); if (/^\d*\.?\d{0,2}$/.test(raw)) updateLog(ese.id, serieIndex, 'peso_kg', raw) }} style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', textAlign: 'center', fontFamily: 'var(--font-syne)', fontWeight: 800, fontSize: dynFs(wVal), color: 'var(--c-97)', fontVariantNumeric: 'tabular-nums', padding: 0, caretColor: 'var(--accent)' }} />
                                <span style={{ fontSize: 10, color: 'var(--c-50)', fontWeight: 600, flexShrink: 0 }}>kg</span>
                              </div>
                              <button onClick={() => updateLog(ese.id, serieIndex, 'peso_kg', String(Math.round((wCur + 2.5) * 10) / 10))} style={btnStyle}>+</button>
                            </div>
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 10, alignItems: 'center', marginBottom: 14 }}>
                            <div>
                              <div style={{ fontSize: 10, fontWeight: 700, color: 'oklch(0.75 0.15 100)', letterSpacing: '0.12em', marginBottom: 6, textAlign: 'center' }}>SX</div>
                              <div style={{ background: 'var(--c-13)', borderRadius: 12, padding: '6px', display: 'flex', alignItems: 'center', gap: 4, border: '1px solid var(--c-w8)' }}>
                                <button onClick={() => updateLog(ese.id, serieIndex, 'reps_sx', String(Math.max(0, sxCur - 1)))} style={btnStyle}>−</button>
                                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                  <input type="text" inputMode="numeric" value={sxVal} placeholder={String(confronto?.reps_sx ?? 0)} onChange={e => { if (/^\d*$/.test(e.target.value)) updateLog(ese.id, serieIndex, 'reps_sx', e.target.value) }} style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', textAlign: 'center', fontFamily: 'var(--font-syne)', fontWeight: 800, fontSize: dynFs(sxVal), color: 'var(--c-97)', fontVariantNumeric: 'tabular-nums', padding: 0, caretColor: 'var(--accent)' }} />
                                </div>
                                <button onClick={() => updateLog(ese.id, serieIndex, 'reps_sx', String(sxCur + 1))} style={btnStyle}>+</button>
                              </div>
                            </div>
                            <div style={{ textAlign: 'center', color: 'var(--c-40)', fontWeight: 700, fontSize: 16 }}>/</div>
                            <div>
                              <div style={{ fontSize: 10, fontWeight: 700, color: 'oklch(0.75 0.15 100)', letterSpacing: '0.12em', marginBottom: 6, textAlign: 'center' }}>DX</div>
                              <div style={{ background: 'var(--c-13)', borderRadius: 12, padding: '6px', display: 'flex', alignItems: 'center', gap: 4, border: '1px solid var(--c-w8)' }}>
                                <button onClick={() => updateLog(ese.id, serieIndex, 'reps_dx', String(Math.max(0, dxCur - 1)))} style={btnStyle}>−</button>
                                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                  <input type="text" inputMode="numeric" value={dxVal} placeholder={String(confronto?.reps_dx ?? 0)} onChange={e => { if (/^\d*$/.test(e.target.value)) updateLog(ese.id, serieIndex, 'reps_dx', e.target.value) }} style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', textAlign: 'center', fontFamily: 'var(--font-syne)', fontWeight: 800, fontSize: dynFs(dxVal), color: 'var(--c-97)', fontVariantNumeric: 'tabular-nums', padding: 0, caretColor: 'var(--accent)' }} />
                                </div>
                                <button onClick={() => updateLog(ese.id, serieIndex, 'reps_dx', String(dxCur + 1))} style={btnStyle}>+</button>
                              </div>
                            </div>
                          </div>
                          <button onClick={() => toggleSerie(ese, serieIndex)} style={{ ...ctaBaseStyle, background: 'linear-gradient(180deg, var(--success) 0%, oklch(0.58 0.17 150) 100%)', boxShadow: '0 6px 20px -4px oklch(0.65 0.18 150 / 50%)' }} onTouchStart={e => (e.currentTarget.style.transform = 'scale(0.97)')} onTouchEnd={e => (e.currentTarget.style.transform = 'scale(1)')} onMouseDown={e => (e.currentTarget.style.transform = 'scale(0.97)')} onMouseUp={e => (e.currentTarget.style.transform = 'scale(1)')}>✓ SERIE COMPLETATA</button>
                        </div>
                      )
                    }

                    // ── timer ───────────────────────────────────────────────
                    if (tipoInputNew === 'timer') {
                      const isTimerActive = eseTimerState?.eseId === ese.id && eseTimerState?.serieIndex === serieIndex
                      const isPre = isTimerActive && eseTimerState?.fase === 'pre'
                      const isRun = isTimerActive && eseTimerState?.fase === 'run'
                      const durataTarget = parseInt(ese.ripetizioni) || 30
                      const wVal = serie.peso_kg
                      const wCur = parseFloat(wVal) || (confronto?.peso_kg ?? 0)
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
                                eseTimerRef.current = setInterval(() => { setEseTimerState(p => p ? { ...p, fase: 'run', secondi: (p.secondi || 0) + 1 } : p) }, 1000)
                                return { ...prev, fase: 'run', secondi: 0 }
                              }
                              return { ...prev, secondi: prev.secondi - 1 }
                            })
                          }, 1000)
                        } else {
                          setEseTimerState({ eseId: ese.id, serieIndex, fase: 'run', secondi: 0 })
                          eseTimerRef.current = setInterval(() => { setEseTimerState(p => p ? { ...p, secondi: p.secondi + 1 } : p) }, 1000)
                        }
                      }
                      const handleTimerStop = () => {
                        if (eseTimerRef.current) { clearInterval(eseTimerRef.current); eseTimerRef.current = null }
                        const durataEffettiva = eseTimerState?.fase === 'run' ? eseTimerState.secondi : 0
                        updateLog(ese.id, serieIndex, 'durata_secondi', String(durataEffettiva))
                        setEseTimerState(null)
                        toggleSerie(ese, serieIndex, { durata_secondi: String(durataEffettiva) })
                      }
                      let ctaBg = 'linear-gradient(180deg, oklch(0.60 0.15 200) 0%, oklch(0.52 0.13 200) 100%)'
                      let ctaShadow = '0 6px 20px -4px oklch(0.60 0.15 200 / 50%)'
                      let ctaLabel = `▶ AVVIA — ${durataTarget}s`
                      let ctaAction = handleTimerStart
                      if (isPre) { ctaBg = 'linear-gradient(180deg, var(--accent) 0%, oklch(0.62 0.17 46) 100%)'; ctaShadow = '0 6px 20px -4px oklch(0.70 0.19 46 / 50%)'; ctaLabel = `Preparati... ${eseTimerState?.secondi}s`; ctaAction = () => {} }
                      if (isRun) { ctaBg = 'linear-gradient(180deg, oklch(0.60 0.22 27) 0%, oklch(0.52 0.20 27) 100%)'; ctaShadow = '0 6px 20px -4px oklch(0.60 0.22 27 / 50%)'; ctaLabel = `■ STOP — ${eseTimerState?.secondi}s`; ctaAction = handleTimerStop }
                      return (
                        <div key={serieIndex} style={activeCardWrap}>
                          {activeHeader}
                          <div style={{ marginBottom: 14 }}>
                            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--c-50)', letterSpacing: '0.12em', marginBottom: 6, textAlign: 'center' }}>ZAVORRA</div>
                            <div style={{ background: 'var(--c-13)', borderRadius: 12, padding: '6px', display: 'flex', alignItems: 'center', gap: 4, border: '1px solid var(--c-w8)' }}>
                              <button onClick={() => updateLog(ese.id, serieIndex, 'peso_kg', String(Math.max(0, Math.round((wCur - 2.5) * 10) / 10)))} style={btnStyle}>−</button>
                              <div style={{ flex: 1, display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 2 }}>
                                <input type="text" inputMode="decimal" value={wVal} placeholder={String(confronto?.peso_kg ?? 0)} onChange={e => { const raw = e.target.value.replace(',', '.'); if (/^\d*\.?\d{0,2}$/.test(raw)) updateLog(ese.id, serieIndex, 'peso_kg', raw) }} style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', textAlign: 'center', fontFamily: 'var(--font-syne)', fontWeight: 800, fontSize: dynFs(wVal), color: 'var(--c-97)', fontVariantNumeric: 'tabular-nums', padding: 0, caretColor: 'var(--accent)' }} />
                                <span style={{ fontSize: 10, color: 'var(--c-50)', fontWeight: 600, flexShrink: 0 }}>kg</span>
                              </div>
                              <button onClick={() => updateLog(ese.id, serieIndex, 'peso_kg', String(Math.round((wCur + 2.5) * 10) / 10))} style={btnStyle}>+</button>
                            </div>
                          </div>
                          {isTimerActive && (
                            <div style={{ textAlign: 'center', marginBottom: 10 }}>
                              <span style={{ fontFamily: 'var(--font-syne)', fontSize: 36, fontWeight: 900, fontVariantNumeric: 'tabular-nums', color: isRun ? 'var(--c-97)' : 'var(--accent)' }}>{eseTimerState?.secondi ?? 0}s</span>
                            </div>
                          )}
                          <button onClick={ctaAction} style={{ ...ctaBaseStyle, background: ctaBg, boxShadow: ctaShadow }} onTouchStart={e => (e.currentTarget.style.transform = 'scale(0.97)')} onTouchEnd={e => (e.currentTarget.style.transform = 'scale(1)')} onMouseDown={e => (e.currentTarget.style.transform = 'scale(0.97)')} onMouseUp={e => (e.currentTarget.style.transform = 'scale(1)')}>{ctaLabel}</button>
                        </div>
                      )
                    }

                    // ── timer_unilaterale ───────────────────────────────────
                    {
                      const durataTargetUni = parseInt(ese.ripetizioni) || 30
                      const stateKey = `${ese.id}-${serieIndex}`
                      const ts = timerUniState[stateKey] ?? { fase: 'idle' as const, sx: 0, dx: 0 }
                      const hasPre = (ese.prepara_secondi ?? 0) > 0
                      const handleStartSx = () => {
                        if (serie.completata || isViewMode) return
                        if (timerUniRef.current) clearInterval(timerUniRef.current)
                        setTimerUniState(prev => ({ ...prev, [stateKey]: { fase: 'sx_run', sx: hasPre ? -(ese.prepara_secondi!) : 0, dx: 0 } }))
                        timerUniRef.current = setInterval(() => { setTimerUniState(prev => { const cur = prev[stateKey]; if (!cur || cur.fase !== 'sx_run') { clearInterval(timerUniRef.current!); return prev } return { ...prev, [stateKey]: { ...cur, sx: cur.sx + 1 } } }) }, 1000)
                      }
                      const handleStopSx = () => {
                        if (timerUniRef.current) { clearInterval(timerUniRef.current); timerUniRef.current = null }
                        const sxVal = Math.max(0, ts.sx)
                        updateLog(ese.id, serieIndex, 'reps_sx', String(sxVal))
                        setTimerUniState(prev => ({ ...prev, [stateKey]: { ...prev[stateKey], fase: 'sx_done', sx: sxVal } }))
                      }
                      const handleStartDx = () => {
                        if (timerUniRef.current) clearInterval(timerUniRef.current)
                        setTimerUniState(prev => ({ ...prev, [stateKey]: { ...prev[stateKey], fase: 'dx_run', dx: hasPre ? -(ese.prepara_secondi!) : 0 } }))
                        timerUniRef.current = setInterval(() => { setTimerUniState(prev => { const cur = prev[stateKey]; if (!cur || cur.fase !== 'dx_run') { clearInterval(timerUniRef.current!); return prev } return { ...prev, [stateKey]: { ...cur, dx: cur.dx + 1 } } }) }, 1000)
                      }
                      const handleStopDx = () => {
                        if (timerUniRef.current) { clearInterval(timerUniRef.current); timerUniRef.current = null }
                        const dxVal = Math.max(0, ts.dx)
                        updateLog(ese.id, serieIndex, 'reps_sx', String(ts.sx))
                        updateLog(ese.id, serieIndex, 'reps_dx', String(dxVal))
                        setTimerUniState(prev => ({ ...prev, [stateKey]: { ...prev[stateKey], fase: 'done', dx: dxVal } }))
                      }
                      const handleDoneUni = () => {
                        if (timerUniRef.current) { clearInterval(timerUniRef.current); timerUniRef.current = null }
                        toggleSerie(ese, serieIndex, { reps_sx: String(ts.sx), reps_dx: String(ts.dx) })
                      }
                      const isSxPre = ts.fase === 'sx_run' && ts.sx < 0
                      const isDxPre = ts.fase === 'dx_run' && ts.dx < 0
                      return (
                        <div key={serieIndex} style={activeCardWrap}>
                          {activeHeader}
                          <div style={{ fontSize: 11, textAlign: 'center', color: 'oklch(0.75 0.15 100)', marginBottom: 12, fontWeight: 600 }}>Obiettivo: {durataTargetUni}s per lato</div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 10, alignItems: 'stretch', marginBottom: 14 }}>
                            <div>
                              <div style={{ fontSize: 10, fontWeight: 700, color: 'oklch(0.75 0.15 100)', letterSpacing: '0.12em', marginBottom: 6, textAlign: 'center' }}>SX {ts.fase !== 'idle' && ts.sx > 0 ? `${ts.sx}s` : ''}</div>
                              {ts.fase === 'sx_run' ? (
                                <button onClick={handleStopSx} style={{ width: '100%', padding: '12px 8px', borderRadius: 12, border: '2px solid oklch(0.65 0.22 27 / 50%)', background: 'oklch(0.65 0.22 27 / 20%)', color: 'oklch(0.75 0.15 27)', fontWeight: 800, fontSize: 14, cursor: 'pointer' }}>{isSxPre ? `via tra ${-ts.sx}s` : `stop ${ts.sx}s`}</button>
                              ) : ts.fase === 'sx_done' || ts.fase === 'dx_run' || ts.fase === 'done' ? (
                                <div style={{ width: '100%', padding: '12px 8px', borderRadius: 12, background: 'oklch(0.65 0.18 150 / 10%)', border: '1px solid oklch(0.65 0.18 150 / 30%)', color: 'oklch(0.65 0.18 150)', fontWeight: 800, fontSize: 14, textAlign: 'center' }}>✓ {ts.sx}s</div>
                              ) : (
                                <button onClick={handleStartSx} style={{ width: '100%', padding: '12px 8px', borderRadius: 12, border: '1px solid oklch(0.75 0.15 100 / 40%)', background: 'oklch(0.75 0.15 100 / 15%)', color: 'oklch(0.75 0.15 100)', fontWeight: 800, fontSize: 14, cursor: 'pointer' }}>▶ SX</button>
                              )}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--c-40)', fontWeight: 700, fontSize: 16 }}>/</div>
                            <div>
                              <div style={{ fontSize: 10, fontWeight: 700, color: 'oklch(0.75 0.15 100)', letterSpacing: '0.12em', marginBottom: 6, textAlign: 'center' }}>DX {ts.fase === 'dx_run' || ts.fase === 'done' ? `${Math.max(0, ts.dx)}s` : ''}</div>
                              {ts.fase === 'sx_done' ? (
                                <button onClick={handleStartDx} style={{ width: '100%', padding: '12px 8px', borderRadius: 12, border: '1px solid oklch(0.75 0.15 100 / 40%)', background: 'oklch(0.75 0.15 100 / 15%)', color: 'oklch(0.75 0.15 100)', fontWeight: 800, fontSize: 14, cursor: 'pointer' }}>▶ DX</button>
                              ) : ts.fase === 'dx_run' ? (
                                <button onClick={handleStopDx} style={{ width: '100%', padding: '12px 8px', borderRadius: 12, border: '2px solid oklch(0.65 0.22 27 / 50%)', background: 'oklch(0.65 0.22 27 / 20%)', color: 'oklch(0.75 0.15 27)', fontWeight: 800, fontSize: 14, cursor: 'pointer' }}>{isDxPre ? `via tra ${-ts.dx}s` : `stop ${ts.dx}s`}</button>
                              ) : ts.fase === 'done' ? (
                                <div style={{ width: '100%', padding: '12px 8px', borderRadius: 12, background: 'oklch(0.65 0.18 150 / 10%)', border: '1px solid oklch(0.65 0.18 150 / 30%)', color: 'oklch(0.65 0.18 150)', fontWeight: 800, fontSize: 14, textAlign: 'center' }}>✓ {ts.dx}s</div>
                              ) : (
                                <div style={{ width: '100%', padding: '12px 8px', borderRadius: 12, background: 'var(--c-22)', border: '1px solid var(--c-w8)', color: 'var(--c-35)', fontSize: 14, textAlign: 'center' }}>—</div>
                              )}
                            </div>
                          </div>
                          <button onClick={handleDoneUni} disabled={ts.fase !== 'done'} style={{ ...ctaBaseStyle, background: 'linear-gradient(180deg, var(--success) 0%, oklch(0.58 0.17 150) 100%)', boxShadow: '0 6px 20px -4px oklch(0.65 0.18 150 / 50%)', opacity: ts.fase !== 'done' ? 0.4 : 1, cursor: ts.fase !== 'done' ? 'not-allowed' : 'pointer' }} onTouchStart={e => ts.fase === 'done' && (e.currentTarget.style.transform = 'scale(0.97)')} onTouchEnd={e => (e.currentTarget.style.transform = 'scale(1)')} onMouseDown={e => ts.fase === 'done' && (e.currentTarget.style.transform = 'scale(0.97)')} onMouseUp={e => (e.currentTarget.style.transform = 'scale(1)')}>✓ SERIE COMPLETATA</button>
                        </div>
                      )
                    }
                  }
                  // ── END NEW DESIGN ────────────────────────────────────────

                  return (
                    <div key={serieIndex} className="px-4 py-3"
                      style={{
                        background: serie.completata
                          ? 'oklch(0.65 0.18 150 / 5%)'
                          : isActiveSet ? 'oklch(0.70 0.19 46 / 4%)' : 'transparent',
                        borderLeft: isActiveSet ? '2px solid var(--accent)' : serie.completata ? '2px solid oklch(0.65 0.18 150 / 40%)' : '2px solid transparent',
                        animation: isActiveSet ? 'pulseRing 2.5s ease-out infinite' : undefined,
                      }}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold" style={{ color: 'var(--c-50)' }}>Serie {serieIndex + 1}</span>
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
                          <span className="text-xs" style={{ color: 'var(--c-40)' }}>
                            {ese.esercizi.tipo_input === 'reps_unilaterale'
                              ? `Ultima: ${confronto.peso_kg ?? '—'}kg × ${confronto.reps_sx ?? '—'}sx / ${confronto.reps_dx ?? '—'}dx`
                              : ese.esercizi.tipo_input === 'timer_unilaterale'
                              ? `Ultima: ${confronto.reps_sx ?? '—'}s sx / ${confronto.reps_dx ?? '—'}s dx`
                              : `Ultima: ${confronto.peso_kg ?? '—'}kg × ${confronto.ripetizioni ?? '—'}`}
                          </span>
                        )}
                      </div>

                      {/* ── Input adattivo al tipo_input ── */}
                      {(() => {
                        const tipoInput = ese.esercizi.tipo_input ?? 'reps'
                        const inputBg = serie.completata ? 'oklch(0.65 0.18 150 / 10%)' : 'var(--c-22)'
                        const inputBorder = `1px solid ${serie.completata ? 'oklch(0.65 0.18 150 / 30%)' : 'var(--c-w8)'}`
                        const inputStyle = { background: inputBg, border: inputBorder, color: 'var(--c-97)' }
                        const checkBtn = (
                          <div className="flex flex-col items-center gap-1">
                            <label className="text-xs mb-1 block opacity-0">✓</label>
                            <button onClick={() => !isViewMode && toggleSerie(ese, serieIndex)}
                              className="w-12 h-12 rounded-xl flex items-center justify-center transition-all active:scale-95"
                              style={{
                                background: serie.completata ? 'oklch(0.65 0.18 150)' : 'var(--c-25)',
                                border: `2px solid ${serie.completata ? 'oklch(0.65 0.18 150)' : 'var(--c-w15)'}`,
                                cursor: isViewMode ? 'default' : 'pointer',
                              }}>
                              {serie.completata
                                ? <span className="text-lg font-bold" style={{ color: 'var(--c-13)' }}>✓</span>
                                : <span className="text-lg" style={{ color: 'var(--c-35)' }}>○</span>}
                            </button>
                            {miglioramento && miglioramento.up > 0 && (
                              <span className="text-xs font-bold" style={{ color: 'oklch(0.65 0.18 150)', letterSpacing: '-1px' }}>
                                {'▲'.repeat(miglioramento.up)}
                              </span>
                            )}
                            {miglioramento?.down && <span className="text-xs font-bold" style={{ color: 'oklch(0.75 0.15 27)' }}>▼</span>}
                            {miglioramento && miglioramento.up === 0 && !miglioramento.down && <span className="text-xs" style={{ color: 'var(--c-45)' }}>＝</span>}
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
                            toggleSerie(ese, serieIndex, { durata_secondi: String(durataEffettiva) })
                          }
                          return (
                            <div className="flex items-center gap-3">
                              <div style={{ width: '30%' }}>
                                <label className="text-xs mb-1 block" style={{ color: 'var(--c-40)' }}>Zavorra (kg)</label>
                                <input type="number" inputMode="decimal" value={serie.peso_kg}
                                  onChange={e => updateLog(ese.id, serieIndex, 'peso_kg', e.target.value)}
                                  placeholder="—" readOnly={isViewMode}
                                  className="w-full px-3 py-3 rounded-xl text-base text-center outline-none font-bold"
                                  style={inputStyle} />
                              </div>
                              <div className="flex-1 flex flex-col items-center gap-1">
                                <label className="text-xs mb-1 block self-start" style={{ color: 'var(--c-50)' }}>
                                  {serie.completata ? (serie.durata_secondi && serie.durata_secondi !== '0' ? `${serie.durata_secondi}s` : '—') : isPre ? `VIA tra ${eseTimerState?.secondi}s` : isRun ? `${eseTimerState?.secondi}s` : `Obiettivo: ${durataTarget}s`}
                                </label>
                                {serie.completata ? (
                                  <div className="w-full px-3 py-3 rounded-xl text-base text-center font-bold"
                                    style={inputStyle}>{serie.durata_secondi !== '' && serie.durata_secondi !== '0' && serie.durata_secondi ? `${serie.durata_secondi}s` : '—'}</div>
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

                        if (tipoInput === 'timer_unilaterale') {
                          const durataTarget = parseInt(ese.ripetizioni) || 30
                          const stateKey = `${ese.id}-${serieIndex}`
                          const ts = timerUniState[stateKey] ?? { fase: 'idle' as const, sx: 0, dx: 0 }
                          const hasPre = (ese.prepara_secondi ?? 0) > 0

                          const handleStartSx = () => {
                            if (serie.completata || isViewMode) return
                            if (timerUniRef.current) clearInterval(timerUniRef.current)
                            if (hasPre) {
                              setTimerUniState(prev => ({ ...prev, [stateKey]: { fase: 'sx_run', sx: -(ese.prepara_secondi!), dx: 0 } }))
                            } else {
                              setTimerUniState(prev => ({ ...prev, [stateKey]: { fase: 'sx_run', sx: 0, dx: 0 } }))
                            }
                            timerUniRef.current = setInterval(() => {
                              setTimerUniState(prev => {
                                const cur = prev[stateKey]
                                if (!cur || cur.fase !== 'sx_run') { clearInterval(timerUniRef.current!); return prev }
                                return { ...prev, [stateKey]: { ...cur, sx: cur.sx + 1 } }
                              })
                            }, 1000)
                          }

                          const handleStopSx = () => {
                            if (timerUniRef.current) { clearInterval(timerUniRef.current); timerUniRef.current = null }
                            const sxVal = Math.max(0, ts.sx)
                            updateLog(ese.id, serieIndex, 'reps_sx', String(sxVal))
                            setTimerUniState(prev => ({ ...prev, [stateKey]: { ...prev[stateKey], fase: 'sx_done', sx: sxVal } }))
                          }

                          const handleStartDx = () => {
                            if (timerUniRef.current) clearInterval(timerUniRef.current)
                            if (hasPre) {
                              setTimerUniState(prev => ({ ...prev, [stateKey]: { ...prev[stateKey], fase: 'dx_run', dx: -(ese.prepara_secondi!) } }))
                            } else {
                              setTimerUniState(prev => ({ ...prev, [stateKey]: { ...prev[stateKey], fase: 'dx_run', dx: 0 } }))
                            }
                            timerUniRef.current = setInterval(() => {
                              setTimerUniState(prev => {
                                const cur = prev[stateKey]
                                if (!cur || cur.fase !== 'dx_run') { clearInterval(timerUniRef.current!); return prev }
                                return { ...prev, [stateKey]: { ...cur, dx: cur.dx + 1 } }
                              })
                            }, 1000)
                          }

                          const handleStopDx = () => {
                            if (timerUniRef.current) { clearInterval(timerUniRef.current); timerUniRef.current = null }
                            const dxVal = Math.max(0, ts.dx)
                            updateLog(ese.id, serieIndex, 'reps_sx', String(ts.sx))
                            updateLog(ese.id, serieIndex, 'reps_dx', String(dxVal))
                            setTimerUniState(prev => ({ ...prev, [stateKey]: { ...prev[stateKey], fase: 'done', dx: dxVal } }))
                          }

                          const handleDoneUni = () => {
                            if (timerUniRef.current) { clearInterval(timerUniRef.current); timerUniRef.current = null }
                            toggleSerie(ese, serieIndex, { reps_sx: String(ts.sx), reps_dx: String(ts.dx) })
                          }

                          const isSxRunning = ts.fase === 'sx_run'
                          const isSxPre = isSxRunning && ts.sx < 0
                          const isDxRunning = ts.fase === 'dx_run'
                          const isDxPre = isDxRunning && ts.dx < 0

                          if (serie.completata) {
                            return (
                              <div className="flex items-center gap-2">
                                <div className="flex-1">
                                  <label className="text-xs mb-1 block" style={{ color: 'var(--c-50)' }}>Zavorra (kg)</label>
                                  <div className="w-full px-3 py-3 rounded-xl text-base text-center font-bold" style={inputStyle}>
                                    {serie.peso_kg || '—'}
                                  </div>
                                </div>
                                <div className="flex-1">
                                  <label className="text-xs mb-1 block" style={{ color: 'oklch(0.75 0.15 100)' }}>SX</label>
                                  <div className="w-full px-3 py-3 rounded-xl text-base text-center font-bold" style={inputStyle}>
                                    {serie.reps_sx ? `${serie.reps_sx}s` : '—'}
                                  </div>
                                </div>
                                <div className="flex-1">
                                  <label className="text-xs mb-1 block" style={{ color: 'oklch(0.75 0.15 100)' }}>DX</label>
                                  <div className="w-full px-3 py-3 rounded-xl text-base text-center font-bold" style={inputStyle}>
                                    {serie.reps_dx ? `${serie.reps_dx}s` : '—'}
                                  </div>
                                </div>
                                {checkBtn}
                              </div>
                            )
                          }

                          return (
                            <div className="space-y-2">
                              <div className="text-xs text-center font-semibold" style={{ color: 'oklch(0.75 0.15 100)' }}>
                                Obiettivo: {durataTarget}s per lato
                              </div>
                              <div className="flex items-end gap-2">
                                {/* Zavorra */}
                                <div style={{ width: '22%' }}>
                                  <label className="text-xs mb-1 block" style={{ color: 'var(--c-40)' }}>kg</label>
                                  <input type="number" inputMode="decimal" value={serie.peso_kg}
                                    onChange={e => updateLog(ese.id, serieIndex, 'peso_kg', e.target.value)}
                                    placeholder="—" readOnly={isViewMode}
                                    className="w-full px-2 py-3 rounded-xl text-base text-center outline-none font-bold"
                                    style={inputStyle} />
                                </div>
                                {/* SX */}
                                <div className="flex-1">
                                  <label className="text-xs mb-1 block font-bold" style={{ color: 'oklch(0.75 0.15 100)' }}>
                                    SX {ts.fase !== 'idle' && ts.sx > 0 ? `${ts.sx}s` : ''}
                                  </label>
                                  {ts.fase === 'idle' || ts.fase === 'sx_run' || ts.fase === 'sx_done' ? (
                                    ts.fase === 'sx_run' ? (
                                      <button onClick={handleStopSx}
                                        className="w-full px-2 py-3 rounded-xl text-sm text-center font-bold transition-all active:scale-95"
                                        style={{ background: 'oklch(0.65 0.22 27 / 20%)', border: '2px solid oklch(0.65 0.22 27 / 50%)', color: 'oklch(0.75 0.15 27)' }}>
                                        {isSxPre ? `via tra ${-ts.sx}s` : `stop ${ts.sx}s`}
                                      </button>
                                    ) : ts.fase === 'sx_done' ? (
                                      <div className="w-full px-2 py-3 rounded-xl text-sm text-center font-bold"
                                        style={{ background: 'oklch(0.65 0.18 150 / 10%)', border: '1px solid oklch(0.65 0.18 150 / 30%)', color: 'oklch(0.65 0.18 150)' }}>
                                        ✓ {ts.sx}s
                                      </div>
                                    ) : (
                                      <button onClick={handleStartSx}
                                        className="w-full px-2 py-3 rounded-xl text-sm text-center font-bold transition-all active:scale-95"
                                        style={{ background: 'oklch(0.75 0.15 100 / 15%)', border: '1px solid oklch(0.75 0.15 100 / 40%)', color: 'oklch(0.75 0.15 100)' }}>
                                        ▶ SX
                                      </button>
                                    )
                                  ) : (
                                    <div className="w-full px-2 py-3 rounded-xl text-sm text-center font-bold"
                                      style={{ background: 'oklch(0.65 0.18 150 / 10%)', border: '1px solid oklch(0.65 0.18 150 / 30%)', color: 'oklch(0.65 0.18 150)' }}>
                                      ✓ {ts.sx}s
                                    </div>
                                  )}
                                </div>
                                {/* DX */}
                                <div className="flex-1">
                                  <label className="text-xs mb-1 block font-bold" style={{ color: 'oklch(0.75 0.15 100)' }}>
                                    DX {ts.fase === 'dx_run' || ts.fase === 'done' ? `${Math.max(0, ts.dx)}s` : ''}
                                  </label>
                                  {ts.fase === 'sx_done' ? (
                                    <button onClick={handleStartDx}
                                      className="w-full px-2 py-3 rounded-xl text-sm text-center font-bold transition-all active:scale-95"
                                      style={{ background: 'oklch(0.75 0.15 100 / 15%)', border: '1px solid oklch(0.75 0.15 100 / 40%)', color: 'oklch(0.75 0.15 100)' }}>
                                      ▶ DX
                                    </button>
                                  ) : ts.fase === 'dx_run' ? (
                                    <button onClick={handleStopDx}
                                      className="w-full px-2 py-3 rounded-xl text-sm text-center font-bold transition-all active:scale-95"
                                      style={{ background: 'oklch(0.65 0.22 27 / 20%)', border: '2px solid oklch(0.65 0.22 27 / 50%)', color: 'oklch(0.75 0.15 27)' }}>
                                      {isDxPre ? `via tra ${-ts.dx}s` : `stop ${ts.dx}s`}
                                    </button>
                                  ) : ts.fase === 'done' ? (
                                    <div className="w-full px-2 py-3 rounded-xl text-sm text-center font-bold"
                                      style={{ background: 'oklch(0.65 0.18 150 / 10%)', border: '1px solid oklch(0.65 0.18 150 / 30%)', color: 'oklch(0.65 0.18 150)' }}>
                                      ✓ {ts.dx}s
                                    </div>
                                  ) : (
                                    <div className="w-full px-2 py-3 rounded-xl text-sm text-center font-bold"
                                      style={{ background: 'var(--c-22)', border: '1px solid var(--c-w8)', color: 'var(--c-35)' }}>
                                      —
                                    </div>
                                  )}
                                </div>
                                {/* Check */}
                                <div className="flex flex-col items-center gap-1">
                                  <label className="text-xs mb-1 block opacity-0">✓</label>
                                  <button
                                    onClick={handleDoneUni}
                                    disabled={ts.fase !== 'done' || isViewMode}
                                    className="w-12 h-12 rounded-xl flex items-center justify-center transition-all active:scale-95"
                                    style={{
                                      background: ts.fase === 'done' ? 'oklch(0.65 0.18 150)' : 'var(--c-25)',
                                      border: `2px solid ${ts.fase === 'done' ? 'oklch(0.65 0.18 150)' : 'var(--c-w15)'}`,
                                      cursor: ts.fase === 'done' && !isViewMode ? 'pointer' : 'default',
                                    }}>
                                    {ts.fase === 'done'
                                      ? <span className="text-lg font-bold" style={{ color: 'var(--c-13)' }}>✓</span>
                                      : <span className="text-lg" style={{ color: 'var(--c-35)' }}>○</span>}
                                  </button>
                                </div>
                              </div>
                            </div>
                          )
                        }

                        if (tipoInput === 'reps_unilaterale') {
                          return (
                            <div className="flex items-center gap-2">
                              <div className="flex-1">
                                <label className="text-xs mb-1 block" style={{ color: 'var(--c-50)' }}>Peso (kg)</label>
                                <input type="number" inputMode="decimal" value={serie.peso_kg}
                                  onChange={e => updateLog(ese.id, serieIndex, 'peso_kg', e.target.value)}
                                  placeholder="0" readOnly={isViewMode}
                                  className="w-full px-3 py-3 rounded-xl text-base text-center outline-none font-bold"
                                  style={inputStyle} />
                              </div>
                              <span className="text-sm" style={{ color: 'var(--c-35)' }}>×</span>
                              <div className="flex-1">
                                <label className="text-xs mb-1 block" style={{ color: 'var(--c-50)' }}>SX</label>
                                <input type="number" inputMode="numeric" value={serie.reps_sx}
                                  onChange={e => updateLog(ese.id, serieIndex, 'reps_sx', e.target.value)}
                                  placeholder="0" readOnly={isViewMode}
                                  className="w-full px-3 py-3 rounded-xl text-base text-center outline-none font-bold"
                                  style={inputStyle} />
                              </div>
                              <div className="flex-1">
                                <label className="text-xs mb-1 block" style={{ color: 'var(--c-50)' }}>DX</label>
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

                        // AMRAP logger
                        if (ese.tipo === 'amrap') {
                          const amrapSec = (ese.amrap_minuti ?? 10) * 60
                          const isActive = eseTimerState?.eseId === ese.id && eseTimerState?.serieIndex === serieIndex
                          const handleAmrapStart = () => {
                            if (serie.completata || isViewMode) return
                            if (eseTimerRef.current) clearInterval(eseTimerRef.current)
                            setEseTimerState({ eseId: ese.id, serieIndex, fase: 'run', secondi: amrapSec })
                            eseTimerRef.current = setInterval(() => {
                              setEseTimerState(prev => {
                                if (!prev) return prev
                                if (prev.secondi <= 1) {
                                  clearInterval(eseTimerRef.current!)
                                  eseTimerRef.current = null
                                  feedbackLocale()
                                  // auto-start recupero
                                  const endTs = Date.now() + ese.recupero_secondi * 1000
                                  timerEndRef.current = endTs
                                  localStorage.setItem('bynari_timer_end', endTs.toString())
                                  setTimerSecondi(ese.recupero_secondi)
                                  setTimerDurataIniziale(ese.recupero_secondi)
                                  setTimerAttivo(true)
                                  scheduleLocalNotification(ese.recupero_secondi)
                                  scheduleTimerPush(endTs)
                                  return null
                                }
                                return { ...prev, secondi: prev.secondi - 1 }
                              })
                            }, 1000)
                          }
                          const handleAmrapDone = () => {
                            if (eseTimerRef.current) { clearInterval(eseTimerRef.current); eseTimerRef.current = null }
                            const repsVal = logs[ese.id]?.serie[serieIndex]?.ripetizioni ?? ''
                            setEseTimerState(null)
                            toggleSerie(ese, serieIndex, { ripetizioni: repsVal })
                          }
                          return (
                            <div className="space-y-2">
                              <div className="flex items-center gap-3">
                                <div className="flex-1 text-center">
                                  {isActive ? (
                                    <div className="px-4 py-3 rounded-xl text-2xl font-black tabular-nums"
                                      style={{ background: 'oklch(0.70 0.18 330 / 15%)', border: '1px solid oklch(0.70 0.18 330 / 40%)', color: 'oklch(0.70 0.18 330)' }}>
                                      {Math.floor((eseTimerState?.secondi ?? 0) / 60).toString().padStart(2, '0')}:{((eseTimerState?.secondi ?? 0) % 60).toString().padStart(2, '0')}
                                    </div>
                                  ) : serie.completata ? (
                                    <div className="px-4 py-3 rounded-xl text-sm font-bold"
                                      style={inputStyle}>Completata</div>
                                  ) : (
                                    <button onClick={handleAmrapStart}
                                      className="w-full px-4 py-3 rounded-xl text-sm font-bold transition-all active:scale-95"
                                      style={{ background: 'oklch(0.70 0.18 330 / 15%)', border: '1px solid oklch(0.70 0.18 330 / 40%)', color: 'oklch(0.70 0.18 330)' }}>
                                      ▶ Start {ese.amrap_minuti}min
                                    </button>
                                  )}
                                </div>
                                <div style={{ width: '30%' }}>
                                  <label className="text-xs mb-1 block" style={{ color: 'var(--c-50)' }}>Reps fatte</label>
                                  <input type="number" inputMode="numeric" value={serie.ripetizioni}
                                    onChange={e => updateLog(ese.id, serieIndex, 'ripetizioni', e.target.value)}
                                    placeholder="0" readOnly={isViewMode || !!serie.completata}
                                    className="w-full px-3 py-3 rounded-xl text-base text-center outline-none font-bold"
                                    style={inputStyle} />
                                </div>
                                <div className="flex flex-col items-center gap-1">
                                  <label className="text-xs mb-1 block opacity-0">✓</label>
                                  <button onClick={handleAmrapDone} disabled={!!serie.completata || isViewMode}
                                    className="w-12 h-12 rounded-xl flex items-center justify-center transition-all active:scale-95"
                                    style={{
                                      background: serie.completata ? 'oklch(0.65 0.18 150)' : 'var(--c-25)',
                                      border: `2px solid ${serie.completata ? 'oklch(0.65 0.18 150)' : 'var(--c-w15)'}`,
                                      cursor: isViewMode || serie.completata ? 'default' : 'pointer',
                                    }}>
                                    {serie.completata
                                      ? <span className="text-lg font-bold" style={{ color: 'var(--c-13)' }}>✓</span>
                                      : <span className="text-lg" style={{ color: 'var(--c-35)' }}>○</span>}
                                  </button>
                                </div>
                              </div>
                            </div>
                          )
                        }

                        // EMOM logger
                        if (ese.tipo === 'emom') {
                          const emomReps = ese.emom_reps_per_minuto ?? 6
                          const emomDurata = ese.emom_durata_minuti ?? 6
                          const emomRounds = ese.emom_rounds ?? 4
                          const isActive = emomState?.eseId === ese.id && emomState?.serieIndex === serieIndex
                          const handleEmomStart = () => {
                            if (serie.completata || isViewMode) return
                            if (eseTimerRef.current) clearInterval(eseTimerRef.current)
                            setEmomState({
                              eseId: ese.id, serieIndex, fase: 'running',
                              secondi: 60, currentRound: 1, currentMinute: 1,
                              emomDurata, emomRounds, recuperoSecondi: ese.recupero_secondi,
                            })
                            eseTimerRef.current = setInterval(() => {
                              setEmomState(prev => {
                                if (!prev || prev.fase === 'completed') return prev
                                if (prev.fase === 'rest_between_rounds') {
                                  if (prev.secondi <= 1) {
                                    feedbackLocale()
                                    return { ...prev, fase: 'running', secondi: 60, currentRound: prev.currentRound + 1, currentMinute: 1 }
                                  }
                                  return { ...prev, secondi: prev.secondi - 1 }
                                }
                                // fase === 'running'
                                if (prev.secondi <= 1) {
                                  if (prev.currentMinute < prev.emomDurata) {
                                    feedbackLocale()
                                    return { ...prev, secondi: 60, currentMinute: prev.currentMinute + 1 }
                                  } else if (prev.currentRound < prev.emomRounds) {
                                    feedbackLocale()
                                    return { ...prev, fase: 'rest_between_rounds', secondi: prev.recuperoSecondi }
                                  } else {
                                    clearInterval(eseTimerRef.current!)
                                    eseTimerRef.current = null
                                    feedbackLocale()
                                    emomAutoCompleteRef.current = { eseId: prev.eseId, serieIndex: prev.serieIndex }
                                    return { ...prev, fase: 'completed', secondi: 0 }
                                  }
                                }
                                return { ...prev, secondi: prev.secondi - 1 }
                              })
                            }, 1000)
                          }
                          const handleEmomDone = () => {
                            if (eseTimerRef.current) { clearInterval(eseTimerRef.current); eseTimerRef.current = null }
                            setEmomState(null)
                            toggleSerie(ese, serieIndex)
                          }
                          return (
                            <div className="space-y-2">
                              <div className="rounded-xl px-3 py-2 text-xs"
                                style={{ background: 'oklch(0.65 0.18 180 / 8%)', border: '1px solid oklch(0.65 0.18 180 / 20%)' }}>
                                <span style={{ color: 'oklch(0.65 0.18 180)' }}>{emomReps} reps/min · {emomDurata} min · {emomRounds} round</span>
                              </div>
                              <div className="flex items-center gap-3">
                                <div className="flex-1 text-center">
                                  {isActive ? (
                                    <div className="space-y-1">
                                      {emomState?.fase === 'completed' ? (
                                        <div className="px-4 py-3 rounded-xl text-sm font-bold"
                                          style={{ background: 'oklch(0.65 0.18 150 / 15%)', border: '1px solid oklch(0.65 0.18 150 / 40%)', color: 'oklch(0.65 0.18 150)' }}>
                                          ✓ EMOM completato!
                                        </div>
                                      ) : emomState?.fase === 'rest_between_rounds' ? (
                                        <>
                                          <div className="text-xs font-semibold" style={{ color: 'oklch(0.70 0.19 46)' }}>
                                            Recupero tra round
                                          </div>
                                          <div className="px-4 py-3 rounded-xl text-2xl font-black tabular-nums"
                                            style={{ background: 'oklch(0.70 0.19 46 / 15%)', border: '1px solid oklch(0.70 0.19 46 / 40%)', color: 'oklch(0.70 0.19 46)' }}>
                                            {(emomState.secondi ?? 0).toString().padStart(2, '0')}s
                                          </div>
                                        </>
                                      ) : (
                                        <>
                                          <div className="text-xs font-semibold" style={{ color: 'oklch(0.65 0.18 180)' }}>
                                            Round {emomState?.currentRound}/{emomRounds} — Minuto {emomState?.currentMinute}/{emomDurata}
                                          </div>
                                          <div className="px-4 py-3 rounded-xl text-2xl font-black tabular-nums"
                                            style={{ background: 'oklch(0.65 0.18 180 / 15%)', border: '1px solid oklch(0.65 0.18 180 / 40%)', color: 'oklch(0.65 0.18 180)' }}>
                                            {(emomState?.secondi ?? 0).toString().padStart(2, '0')}s
                                          </div>
                                        </>
                                      )}
                                    </div>
                                  ) : serie.completata ? (
                                    <div className="px-4 py-3 rounded-xl text-sm font-bold" style={inputStyle}>Completato</div>
                                  ) : (
                                    <button onClick={handleEmomStart}
                                      className="w-full px-4 py-3 rounded-xl text-sm font-bold transition-all active:scale-95"
                                      style={{ background: 'oklch(0.65 0.18 180 / 15%)', border: '1px solid oklch(0.65 0.18 180 / 40%)', color: 'oklch(0.65 0.18 180)' }}>
                                      ▶ Start EMOM
                                    </button>
                                  )}
                                </div>
                                <div className="flex flex-col items-center gap-1">
                                  <label className="text-xs mb-1 block opacity-0">✓</label>
                                  <button onClick={handleEmomDone} disabled={!!serie.completata || isViewMode}
                                    className="w-12 h-12 rounded-xl flex items-center justify-center transition-all active:scale-95"
                                    style={{
                                      background: serie.completata ? 'oklch(0.65 0.18 150)' : 'var(--c-25)',
                                      border: `2px solid ${serie.completata ? 'oklch(0.65 0.18 150)' : 'var(--c-w15)'}`,
                                      cursor: isViewMode || serie.completata ? 'default' : 'pointer',
                                    }}>
                                    {serie.completata
                                      ? <span className="text-lg font-bold" style={{ color: 'var(--c-13)' }}>✓</span>
                                      : <span className="text-lg" style={{ color: 'var(--c-35)' }}>○</span>}
                                  </button>
                                </div>
                              </div>
                            </div>
                          )
                        }

                        // Tabata logger
                        if (ese.tipo === 'tabata') {
                          const workSec = ese.tabata_work_secondi ?? 20
                          const restSec = ese.tabata_rest_secondi ?? 10
                          const totalRounds = ese.tabata_rounds ?? 8
                          const ts = tabataState[ese.id] ?? { fase: 'idle' as const, currentRound: 1, secondi: 0, partnerEseId: null, isPartnerTurn: false }
                          const partnerEse = ese.gruppo_id
                            ? esercizi.find(e => e.id !== ese.id && e.gruppo_id === ese.gruppo_id && e.tipo === 'tabata') ?? null
                            : null

                          const handleTabataStart = () => {
                            if (serie.completata || isViewMode) return
                            if (tabataRef.current) { clearInterval(tabataRef.current); tabataRef.current = null }
                            tabataActiveRef.current = ese.id
                            tabataInitiatorRef.current = ese.id
                            feedbackLocale()
                            const initState: typeof tabataState = {
                              ...tabataState,
                              [ese.id]: { fase: 'work', currentRound: 1, secondi: workSec, partnerEseId: partnerEse?.id ?? null, isPartnerTurn: false },
                            }
                            if (partnerEse) {
                              initState[partnerEse.id] = { fase: 'work', currentRound: 1, secondi: workSec, partnerEseId: ese.id, isPartnerTurn: true }
                            }
                            setTabataState(initState)
                            tabataRef.current = setInterval(() => {
                              setTabataState(prev => {
                                const activeId = tabataActiveRef.current
                                if (!activeId) return prev
                                const cur = prev[activeId]
                                if (!cur || cur.fase === 'idle' || cur.fase === 'completed') return prev
                                const partnerId = cur.partnerEseId
                                if (cur.secondi > 1) {
                                  const next = { ...prev, [activeId]: { ...cur, secondi: cur.secondi - 1 } }
                                  if (partnerId && prev[partnerId]) next[partnerId] = { ...prev[partnerId], secondi: cur.secondi - 1 }
                                  return next
                                }
                                // secondi hits 0
                                if (cur.fase === 'work') {
                                  feedbackLocale()
                                  const next = { ...prev, [activeId]: { ...cur, fase: 'rest' as const, secondi: restSec } }
                                  if (partnerId && prev[partnerId]) next[partnerId] = { ...prev[partnerId], fase: 'rest' as const, secondi: restSec }
                                  return next
                                }
                                if (cur.fase === 'rest') {
                                  if (partnerId && prev[partnerId]) {
                                    const partner = prev[partnerId]
                                    const initiatorId = tabataInitiatorRef.current
                                    const isInitiatorPhase = activeId === initiatorId
                                    if (isInitiatorPhase) {
                                      // Initiator just rested → partner works next
                                      feedbackLocale()
                                      tabataActiveRef.current = partnerId
                                      return {
                                        ...prev,
                                        [activeId]: { ...cur, fase: 'work' as const, isPartnerTurn: true, secondi: workSec },
                                        [partnerId]: { ...partner, fase: 'work' as const, isPartnerTurn: false, secondi: workSec },
                                      }
                                    } else {
                                      // Partner just rested → round complete, back to initiator
                                      feedbackLocale()
                                      const nextRound = cur.currentRound + 1
                                      if (nextRound > totalRounds) {
                                        clearInterval(tabataRef.current!)
                                        tabataRef.current = null
                                        tabataActiveRef.current = null
                                        return {
                                          ...prev,
                                          [activeId]: { ...cur, fase: 'completed' as const, secondi: 0 },
                                          [partnerId]: { ...partner, fase: 'completed' as const, secondi: 0 },
                                        }
                                      }
                                      tabataActiveRef.current = initiatorId!
                                      return {
                                        ...prev,
                                        [activeId]: { ...cur, fase: 'work' as const, isPartnerTurn: true, secondi: workSec, currentRound: nextRound },
                                        [partnerId]: { ...partner, fase: 'work' as const, isPartnerTurn: false, secondi: workSec, currentRound: nextRound },
                                      }
                                    }
                                  } else {
                                    // Single exercise rest complete
                                    feedbackLocale()
                                    const nextRound = cur.currentRound + 1
                                    if (nextRound > totalRounds) {
                                      clearInterval(tabataRef.current!)
                                      tabataRef.current = null
                                      tabataActiveRef.current = null
                                      return { ...prev, [activeId]: { ...cur, fase: 'completed' as const, secondi: 0 } }
                                    }
                                    return { ...prev, [activeId]: { ...cur, fase: 'work' as const, currentRound: nextRound, secondi: workSec } }
                                  }
                                }
                                return prev
                              })
                            }, 1000)
                          }

                          if (serie.completata) {
                            return (
                              <div className="px-4 py-3 rounded-xl text-sm font-bold text-center"
                                style={{ background: 'oklch(0.65 0.18 150 / 10%)', border: '1px solid oklch(0.65 0.18 150 / 30%)', color: 'oklch(0.65 0.18 150)' }}>
                                ✓ Tabata completato!
                              </div>
                            )
                          }

                          const isCompleted = ts.fase === 'completed'
                          const isWork = ts.fase === 'work' && !ts.isPartnerTurn
                          const isRest = ts.fase === 'rest'
                          const isPartnerWorking = ts.fase === 'work' && ts.isPartnerTurn
                          const isIdle = ts.fase === 'idle'

                          return (
                            <div className="space-y-2">
                              {/* Partner info */}
                              {partnerEse && (
                                <div className="text-xs px-2 py-1 rounded-lg"
                                  style={{ background: 'oklch(0.70 0.15 0 / 8%)', color: 'oklch(0.60 0.15 0)' }}>
                                  Con: {partnerEse.esercizi.nome}
                                </div>
                              )}
                              {/* Timer display */}
                              {!isIdle && !isCompleted && (
                                <div className="px-4 py-4 rounded-xl text-center space-y-1"
                                  style={{
                                    background: isWork ? 'oklch(0.70 0.15 0 / 15%)' : isRest ? 'oklch(0.65 0.18 150 / 10%)' : 'var(--c-22)',
                                    border: isWork ? '1px solid oklch(0.70 0.15 0 / 40%)' : isRest ? '1px solid oklch(0.65 0.18 150 / 30%)' : '1px solid var(--c-w10)',
                                  }}>
                                  <div className="text-xs font-bold uppercase tracking-widest"
                                    style={{ color: isWork ? 'oklch(0.70 0.15 0)' : isRest ? 'oklch(0.65 0.18 150)' : 'var(--c-50)' }}>
                                    {isWork ? 'LAVORA!' : isRest ? 'RIPOSA' : isPartnerWorking ? `${partnerEse?.esercizi.nome ?? 'Partner'} — LAVORA!` : ''}
                                  </div>
                                  <div className="text-4xl font-black tabular-nums"
                                    style={{ color: isWork ? 'oklch(0.70 0.15 0)' : isRest ? 'oklch(0.65 0.18 150)' : 'var(--c-55)' }}>
                                    {ts.secondi}
                                  </div>
                                  <div className="text-xs font-semibold"
                                    style={{ color: 'var(--c-50)' }}>
                                    Round {ts.currentRound}/{totalRounds}
                                  </div>
                                </div>
                              )}
                              {isCompleted && (
                                <div className="px-4 py-3 rounded-xl text-sm font-bold text-center"
                                  style={{ background: 'oklch(0.65 0.18 150 / 10%)', border: '1px solid oklch(0.65 0.18 150 / 30%)', color: 'oklch(0.65 0.18 150)' }}>
                                  ✓ Tabata completato!
                                </div>
                              )}
                              {/* Start button */}
                              {isIdle && (
                                <button onClick={handleTabataStart}
                                  className="w-full px-4 py-3 rounded-xl text-sm font-bold transition-all active:scale-95"
                                  style={{ background: 'oklch(0.70 0.15 0 / 15%)', border: '1px solid oklch(0.70 0.15 0 / 40%)', color: 'oklch(0.70 0.15 0)' }}>
                                  ▶ Start Tabata — {workSec}s/{restSec}s × {totalRounds}
                                </button>
                              )}
                            </div>
                          )
                        }

                        // Max+Total logger
                        if (ese.tipo === 'max_reps') {
                          const target = ese.max_reps_target ?? 30
                          const isMaxSerie = serieIndex === 0
                          // Only distribution sets (2+) count toward target
                          const prevDistReps = isMaxSerie ? 0 : (eseLog?.serie ?? []).slice(1, serieIndex).reduce((acc, s) => acc + (parseInt(s.ripetizioni) || 0), 0)
                          const rimanenti = Math.max(0, target - prevDistReps)

                          return (
                            <div className="flex items-center gap-3">
                              <div className="flex-1">
                                <label className="text-xs mb-1 block font-bold"
                                  style={{ color: isMaxSerie ? 'oklch(0.75 0.15 60)' : 'oklch(0.70 0.19 46)' }}>
                                  {isMaxSerie ? 'MAX reps' : `Rimanenti: ${rimanenti} reps`}
                                </label>
                                <input type="number" inputMode="numeric" value={serie.ripetizioni}
                                  onChange={e => updateLog(ese.id, serieIndex, 'ripetizioni', e.target.value)}
                                  placeholder={isMaxSerie ? 'MAX' : String(rimanenti)}
                                  readOnly={isViewMode || !!serie.completata}
                                  className="w-full px-3 py-3 rounded-xl text-base text-center outline-none font-bold"
                                  style={{
                                    ...inputStyle,
                                    ...(isMaxSerie
                                      ? { border: '1px solid oklch(0.75 0.15 60 / 50%)', background: 'oklch(0.75 0.15 60 / 10%)' }
                                      : { border: '1px solid oklch(0.70 0.19 46 / 35%)', background: 'oklch(0.70 0.19 46 / 8%)' }),
                                  }} />
                              </div>
                              {checkBtn}
                            </div>
                          )
                        }

                        // Default: reps classiche
                        return (
                          <div className="flex items-center gap-3">
                            <div className="flex-1">
                              <label className="text-xs mb-1 block" style={{ color: 'var(--c-50)' }}>Peso (kg)</label>
                              <input type="number" inputMode="decimal" value={serie.peso_kg}
                                onChange={(e) => updateLog(ese.id, serieIndex, 'peso_kg', e.target.value)}
                                placeholder="0" readOnly={isViewMode}
                                className="w-full px-3 py-3 rounded-xl text-base text-center outline-none font-bold"
                                style={inputStyle} />
                            </div>
                            <span className="text-lg" style={{ color: 'var(--c-35)' }}>×</span>
                            <div className="flex-1">
                              <label className="text-xs mb-1 block" style={{ color: 'var(--c-50)' }}>Reps</label>
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

                {/* Max+Total: CTA aggiungi serie / obiettivo raggiunto */}
                {ese.tipo === 'max_reps' && !isViewMode && (() => {
                  const target = ese.max_reps_target ?? 30
                  const maxSerieCompletata = eseLog?.serie[0]?.completata ?? false
                  if (!maxSerieCompletata) return null

                  // Only sets 2+ (distribution sets) count toward the target
                  const distSeries = (eseLog?.serie ?? []).slice(1)
                  const distReps = distSeries.reduce((acc, s) => acc + (parseInt(s.ripetizioni) || 0), 0)

                  if (distReps >= target) {
                    return (
                      <div className="px-4 py-3 flex items-center gap-2"
                        style={{ background: 'oklch(0.65 0.18 150 / 8%)', border: '1px solid oklch(0.65 0.18 150 / 25%)', margin: '0 16px 12px', borderRadius: 12 }}>
                        <span className="text-base">✓</span>
                        <p className="text-sm font-bold" style={{ color: 'oklch(0.65 0.18 150)' }}>
                          Obiettivo raggiunto! {distReps}/{target} reps
                        </p>
                      </div>
                    )
                  }

                  const rimanenti = target - distReps
                  // Show "+ Serie" when no dist series exist OR the last dist serie is completed
                  const lastDistDone = distSeries.length === 0 || distSeries[distSeries.length - 1].completata
                  if (!lastDistDone) return null

                  return (
                    <div className="px-4 pb-3 space-y-2">
                      <p className="text-sm font-bold" style={{ color: 'oklch(0.70 0.19 46)' }}>
                        {distSeries.length === 0 ? `Devi fare ancora: ${rimanenti} reps` : `Rimanenti: ${rimanenti} reps (${distReps}/${target})`}
                      </p>
                      <button onClick={() => addMaxRepsSerie(ese.id)}
                        className="w-full py-2.5 rounded-xl text-sm font-bold transition-all active:scale-95"
                        style={{ background: 'transparent', border: '1.5px dashed oklch(0.70 0.19 46 / 40%)', color: 'oklch(0.70 0.19 46)' }}>
                        + Serie
                      </button>
                    </div>
                  )
                })()}
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
            style={{ background: 'var(--c-18)', border: '1px solid var(--c-w8)' }}
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold" style={{ color: 'var(--c-97)' }}>Intensità serie {rpeRirPicker.serieIndex + 1}</p>
              <button onClick={() => setRpeRirPicker(null)}
                className="text-xs px-3 py-1.5 rounded-lg"
                style={{ background: 'var(--c-25)', color: 'var(--c-55)' }}>Salta</button>
            </div>
            {richiede_rpe && (
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--c-50)' }}>
                  RPE — quanto è stato difficile?
                </p>
                <div className="grid grid-cols-5 gap-2">
                  {[6, 7, 8, 9, 10].map(v => {
                    const sel = logs[rpeRirPicker.eseId]?.serie[rpeRirPicker.serieIndex]?.rpe === String(v)
                    return (
                      <button key={v} onClick={() => updateLog(rpeRirPicker.eseId, rpeRirPicker.serieIndex, 'rpe', String(v))}
                        className="py-3 rounded-xl font-bold text-sm transition-all"
                        style={{
                          background: sel ? 'oklch(0.70 0.19 46)' : 'var(--c-22)',
                          color: sel ? 'var(--c-13)' : 'var(--c-60)',
                          border: sel ? 'none' : '1px solid var(--c-w8)',
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
                <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--c-50)' }}>
                  RIR — reps rimaste nel serbatoio?
                </p>
                <div className="grid grid-cols-4 gap-2">
                  {['0', '1', '2', '3+'].map(v => {
                    const sel = logs[rpeRirPicker.eseId]?.serie[rpeRirPicker.serieIndex]?.rir === v
                    return (
                      <button key={v} onClick={() => updateLog(rpeRirPicker.eseId, rpeRirPicker.serieIndex, 'rir', v)}
                        className="py-3 rounded-xl font-bold text-sm transition-all"
                        style={{
                          background: sel ? 'oklch(0.60 0.15 200)' : 'var(--c-22)',
                          color: sel ? 'var(--c-13)' : 'var(--c-60)',
                          border: sel ? 'none' : '1px solid var(--c-w8)',
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
              style={{ background: 'oklch(0.65 0.18 150)', color: 'var(--c-13)' }}>
              Conferma
            </button>
          </div>
        </div>
      )}

      {/* Bottone completa — solo modalità live */}
      {!completata && !isViewMode && (
        <div className="pb-4">
          <button onClick={handleCompleta} disabled={saving || progressoPerc < 100}
            style={{
              width: '100%', height: 54, borderRadius: 16,
              background: progressoPerc === 100
                ? 'linear-gradient(180deg, var(--accent) 0%, oklch(0.62 0.19 40) 100%)'
                : 'var(--c-20)',
              color: progressoPerc === 100 ? 'var(--c-11)' : 'var(--c-40)',
              fontFamily: 'var(--font-syne)', fontSize: 14, fontWeight: 800, letterSpacing: '0.06em',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              boxShadow: progressoPerc === 100 ? '0 8px 24px -6px oklch(0.70 0.19 46 / 60%)' : 'none',
              cursor: progressoPerc < 100 ? 'not-allowed' : 'pointer',
              border: 'none',
              transition: 'transform 0.1s',
            }}>
            {saving ? 'Salvataggio...' : progressoPerc === 100
              ? <><FontAwesomeIcon icon={faTrophy} /> COMPLETA ALLENAMENTO</>
              : `${progressoPerc}% — continua!`}
          </button>
        </div>
      )}

      {/* Riepilogo + share overlay — quando completato */}
      {completata && (
        <div className="pb-4 space-y-5">
          {!isViewMode && (
            <div style={{
              borderRadius: 22, padding: '32px 20px 24px', textAlign: 'center',
              background: 'radial-gradient(ellipse at top, oklch(0.70 0.19 46 / 20%) 0%, var(--c-16) 60%)',
              border: '1px solid oklch(0.70 0.19 46 / 25%)',
              animation: 'fadeIn 0.4s',
            }}>
              <div style={{
                width: 72, height: 72, margin: '0 auto 16px',
                borderRadius: '50%', background: 'oklch(0.82 0.17 85)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 32, color: 'var(--c-11)',
                boxShadow: '0 0 40px oklch(0.82 0.17 85 / 60%), 0 0 0 12px oklch(0.82 0.17 85 / 12%)',
                animation: 'bounceIn 0.6s cubic-bezier(0.2, 0.8, 0.2, 1)',
              }}>
                <FontAwesomeIcon icon={faTrophy} />
              </div>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'oklch(0.82 0.17 85)', letterSpacing: '0.2em', marginBottom: 8 }}>
                WORKOUT COMPLETATO
              </div>
              <h2 style={{
                fontFamily: 'var(--font-syne)', fontWeight: 800, fontSize: 28,
                color: 'var(--c-97)', letterSpacing: '-0.02em', lineHeight: 1.1, marginBottom: 16,
              }}>
                Grande.<br />
                <span style={{ color: 'oklch(0.82 0.17 85)' }}>Sei stato un bestione.</span>
              </h2>
              {/* Stats grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 0 }}>
                {[
                  { label: 'Volume', value: `${Math.round(volumeTotale).toLocaleString('it-IT')}`, unit: 'kg', color: 'var(--accent)' },
                  { label: 'Durata', value: formatDurata(durataSecondi), unit: '', color: 'oklch(0.62 0.14 200)' },
                  { label: 'Serie', value: String(serieCompletate), unit: '', color: 'var(--c-97)' },
                  { label: 'PR', value: calcolaNuovoPR() ? '1' : '0', unit: 'nuovo', color: 'oklch(0.82 0.17 85)' },
                ].map(s => (
                  <div key={s.label} style={{
                    background: 'var(--c-18)', border: '1px solid var(--c-w6)',
                    borderRadius: 14, padding: '12px 10px', textAlign: 'left',
                  }}>
                    <p style={{ fontSize: 11, color: 'var(--c-55)', fontWeight: 600, marginBottom: 4 }}>{s.label}</p>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 3 }}>
                      <span style={{ fontFamily: 'var(--font-syne)', fontWeight: 800, fontSize: 22, color: s.color, fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>{s.value}</span>
                      {s.unit && <span style={{ fontSize: 10, color: 'var(--c-55)', fontWeight: 600 }}>{s.unit}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Riepilogo in modalità archivio */}
          {isViewMode && (
            <div className="rounded-2xl p-5"
              style={{ background: 'var(--c-18)', border: '1px solid var(--c-w6)' }}>
              <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--c-45)' }}>Riepilogo</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl p-3 text-center" style={{ background: 'var(--c-22)' }}>
                  <p className="text-2xl font-black" style={{ color: 'oklch(0.60 0.15 200)' }}>{Math.round(volumeTotale).toLocaleString('it-IT')}</p>
                  <p className="text-xs mt-1" style={{ color: 'var(--c-45)' }}>kg volume</p>
                </div>
                <div className="rounded-xl p-3 text-center" style={{ background: 'var(--c-22)' }}>
                  <p className="text-2xl font-black" style={{ color: 'oklch(0.70 0.19 46)' }}>{serieCompletate}</p>
                  <p className="text-xs mt-1" style={{ color: 'var(--c-45)' }}>serie</p>
                </div>
              </div>
            </div>
          )}

          {/* Share overlay — sempre disponibile quando completato */}
          <div className="rounded-2xl p-5 space-y-4"
            style={{ background: 'var(--c-18)', border: '1px solid var(--c-w6)' }}>
            <p className="text-sm font-bold text-center" style={{ color: 'var(--c-97)' }}>
              Condividi il tuo allenamento
            </p>
            <ShareOverlay
              giornoNome={giornoNome}
              volume={Math.round(volumeTotale)}
              serie={serieCompletate}
              durata={formatDurata(durataSessioneDB ?? durataSecondi)}
              esercizi={calcolaEserciziHighlight()}
              coachNome={coachNome}
            />
          </div>

          <button onClick={() => router.push(backUrl)}
            className="w-full py-3 rounded-2xl text-sm font-semibold transition-all"
            style={{ background: 'var(--c-22)', color: 'var(--c-60)', border: '1px solid var(--c-w8)' }}>
            ← {isViewMode ? 'Torna ai progressi' : 'Torna alla dashboard'}
          </button>
        </div>
      )}
    </div>
  )
}
