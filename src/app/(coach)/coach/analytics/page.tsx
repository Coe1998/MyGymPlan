'use client'

import { useEffect, useState, useMemo } from 'react'
import BynariLoader from '@/components/shared/BynariLoader'
import { createClient } from '@/lib/supabase/client'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faUsers, faClipboardList, faCircleCheck, faDumbbell,
  faTriangleExclamation, faChartBar, faComment,
  faFaceTired, faFaceFrown, faFaceMeh, faFaceSmile, faFaceGrinStars,
  faArrowTrendUp, faArrowTrendDown, faMinus, faCalendarDays,
  faXmark, faChevronDown, faChevronUp, faArrowLeft, faHand, faEye,
} from '@fortawesome/free-solid-svg-icons'
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import Link from 'next/link'
import MacroTargetForm from '@/components/coach/MacroTargetForm'
import CarbCyclingForm from '@/components/coach/CarbCyclingForm'
import SchedaEditorModal from '@/components/coach/SchedaEditorModal'
import AnamnesIDrawer from '@/components/coach/AnamnesIDrawer'
import { generateNoteAnamnesi, stimaTDEE } from '@/lib/anamnesi-notes'

interface Misurazione {
  data: string
  peso_kg: number
}

interface ClienteStats {
  id: string
  full_name: string | null
  created_at: string
  schede_attive: number
  totale_sessioni: number
  ultima_sessione: string | null
  giorni_inattivo: number | null
  ultimo_checkin: {
    data: string
    energia: number
    sonno: number
    stress: number
    motivazione: number
    note: string | null
  } | null
  misurazioni: Misurazione[]
  alert: { label: string; dettaglio: string }[]
}

interface LogSerie {
  numero_serie: number
  peso_kg: number | null
  ripetizioni: number | null
  completata: boolean
  scheda_esercizi: {
    serie: number
    ripetizioni: string
    recupero_secondi: number
    esercizi: { nome: string; muscoli: string[] | null }
  } | null
}

interface SessioneDettaglio {
  id: string
  data: string
  completata: boolean
  durata_secondi: number | null
  scheda_giorni: { nome: string } | null
  log_serie: LogSerie[]
}

type VistaTab = 'overview' | 'attivita'

function SchedaPreviewContent({ schedaId }: { schedaId: string }) {
  const supabase = useMemo(() => createClient(), [])
  const [giorni, setGiorni] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase.from('scheda_giorni')
        .select('id, nome, ordine, scheda_esercizi(id, ordine, serie, ripetizioni, tipo, esercizi!scheda_esercizi_esercizio_id_fkey(nome, muscoli))')
        .eq('scheda_id', schedaId)
        .order('ordine')
      setGiorni((data as any) ?? [])
      setLoading(false)
    }
    fetch()
  }, [schedaId])

  if (loading) return <BynariLoader file="blue" size={80} />
  if (giorni.length === 0) return <div className="flex-1 flex items-center justify-center"><p className="text-sm" style={{ color: 'oklch(0.45 0 0)' }}>Nessun giorno nella scheda</p></div>

  return (
    <div className="flex-1 p-5 space-y-4">
      {giorni.map(g => (
        <div key={g.id} className="rounded-2xl overflow-hidden"
          style={{ background: 'oklch(0.18 0 0)', border: '1px solid oklch(1 0 0 / 6%)' }}>
          <div className="px-4 py-3" style={{ borderBottom: '1px solid oklch(1 0 0 / 6%)' }}>
            <p className="font-bold text-sm" style={{ color: 'oklch(0.97 0 0)' }}>{g.nome}</p>
            <p className="text-xs mt-0.5" style={{ color: 'oklch(0.45 0 0)' }}>{g.scheda_esercizi?.length ?? 0} esercizi</p>
          </div>
          {(g.scheda_esercizi ?? []).sort((a: any, b: any) => a.ordine - b.ordine).map((e: any, i: number) => (
            <div key={e.id} className="flex items-center gap-3 px-4 py-3"
              style={{ borderBottom: i < g.scheda_esercizi.length - 1 ? '1px solid oklch(1 0 0 / 4%)' : 'none' }}>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: 'oklch(0.85 0 0)' }}>
                  {e.esercizi?.nome ?? '—'}
                </p>
                <p className="text-xs mt-0.5" style={{ color: 'oklch(0.45 0 0)' }}>
                  {e.serie} × {e.ripetizioni}
                  {e.tipo !== 'normale' && <span className="ml-1.5 px-1.5 py-0.5 rounded text-xs" style={{ background: 'oklch(0.70 0.19 46 / 15%)', color: 'oklch(0.70 0.19 46)' }}>{e.tipo}</span>}
                </p>
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

export default function AnalyticsPage() {
  const [clientiStats, setClientiStats] = useState<ClienteStats[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<VistaTab>('overview')
  const [ordinamento, setOrdinamento] = useState<'alert' | 'ultima_attivita' | 'piu_recenti' | 'piu_vecchi' | 'nome'>('alert')
  const [totaleClienti, setTotaleClienti] = useState(0)
  const [clientiNuovi, setClientiNuovi] = useState(0)
  const [totaleSchede, setTotaleSchede] = useState(0)
  const [totaleAssegnazioni, setTotaleAssegnazioni] = useState(0)
  const [totaleSessioni, setTotaleSessioni] = useState(0)
  const [clienteSelezionato, setClienteSelezionato] = useState<ClienteStats | null>(null)
  const [noteEsercizioCliente, setNoteEsercizioCliente] = useState<any[]>([])
  const [alertAperto, setAlertAperto] = useState<{ clienteId: string; idx: number } | null>(null)
  const [sessioniDettaglio, setSessioniDettaglio] = useState<SessioneDettaglio[]>([])
  const [loadingSessioni, setLoadingSessioni] = useState(false)
  const [sessioneAperta, setSessioneAperta] = useState<string | null>(null)
  const [assegnazioniCliente, setAssegnazioniCliente] = useState<any[]>([])
  const [drawerTab, setDrawerTab] = useState<'overview' | 'nutrizione' | 'integratori'>('overview')
  const [pianoIntegratori, setPianoIntegratori] = useState<any[]>([])
  const [showFormInt, setShowFormInt] = useState(false)
  const [intNome, setIntNome] = useState('')
  const [intQuantita, setIntQuantita] = useState('')
  const [intUnita, setIntUnita] = useState('g')
  const [intMomento, setIntMomento] = useState('')
  const [intNote, setIntNote] = useState('')
  const [savingInt, setSavingInt] = useState(false)
  const [dietaAbilitata, setDietaAbilitata] = useState(false)
  const [togglingDieta, setTogglingDieta] = useState(false)
  const [storicoNutrizioneCliente, setStoricoNutrizioneCliente] = useState<{ data: string; calorie: number; proteine_g: number; carboidrati_g: number; grassi_g: number }[]>([])
  const [macroTargetCliente, setMacroTargetCliente] = useState<{ calorie: number; proteine_g: number; carboidrati_g: number; grassi_g: number } | null>(null)

  // Assegna scheda flow
  const [assegnaFlow, setAssegnaFlow] = useState<null | 'pick' | 'confirm' | 'editor'>(null)
  const [schedeCoach, setSchedeCoach] = useState<{ id: string; nome: string }[]>([])
  const [schedaPickata, setSchedaPickata] = useState<{ id: string; nome: string } | null>(null)
  const [schedaClonata, setSchedaClonata] = useState<{ id: string; nome: string } | null>(null)
  const [cloningScheda, setCloningScheda] = useState(false)
  const [assegnando, setAssegnando] = useState(false)
  const [schedaPreview, setSchedaPreview] = useState<{ id: string; nome: string } | null>(null)
  const [anamnesICliente, setAnamnesICliente] = useState<any>(null)
  const [showAnamnesIDrawer, setShowAnamnesIDrawer] = useState(false)
  const [prossimiCheckin, setProssimiCheckin] = useState<any[]>([])

  const supabase = useMemo(() => createClient(), [])

  const fetchAnalytics = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // ── 1. Fetch base in parallelo ────────────────────────────────
    const settePiorniFuturi = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    const [clientiRes, schedeRes, assegnazioniRes, checkinImminentiRes] = await Promise.all([
      supabase.from('coach_clienti')
        .select('cliente_id, created_at, profiles!coach_clienti_cliente_id_fkey (id, full_name)')
        .eq('coach_id', user.id),
      supabase.from('schede').select('id').eq('coach_id', user.id),
      supabase.from('assegnazioni').select('id').eq('coach_id', user.id).eq('attiva', true),
      supabase.from('appuntamenti')
        .select('id, cliente_id, data_ora, durata_minuti, tipo, profiles!appuntamenti_cliente_id_fkey(full_name)')
        .eq('coach_id', user.id)
        .eq('stato', 'programmato')
        .gte('data_ora', new Date().toISOString())
        .lte('data_ora', settePiorniFuturi)
        .order('data_ora')
        .limit(5),
    ])
    setProssimiCheckin((checkinImminentiRes.data as any) ?? [])

    const clientiData = clientiRes.data ?? []
    setTotaleClienti(clientiData.length)
    const setteGiorniFa = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    setClientiNuovi(clientiData.filter((c: any) => c.created_at >= setteGiorniFa).length)
    setTotaleSchede(schedeRes.data?.length ?? 0)
    setTotaleAssegnazioni(assegnazioniRes.data?.length ?? 0)

    if (clientiData.length === 0) { setLoading(false); return }

    const clienteIds = clientiData.map(c => c.cliente_id)

    // ── 2. Fetch aggregate per TUTTI i clienti in parallelo ───────
    const [sessRes, checkinRes, misRes, assegAttiveRes] = await Promise.all([
      // Tutte le sessioni di tutti i clienti
      supabase.from('sessioni')
        .select('id, data, cliente_id')
        .in('cliente_id', clienteIds)
        .order('data', { ascending: false }),
      // Ultimi check-in per tutti i clienti (1 per cliente)
      supabase.from('checkin')
        .select('*')
        .in('cliente_id', clienteIds)
        .order('data', { ascending: false }),
      // Misurazioni peso per tutti i clienti
      supabase.from('misurazioni')
        .select('cliente_id, data, peso_kg')
        .in('cliente_id', clienteIds)
        .not('peso_kg', 'is', null)
        .order('data', { ascending: true }),
      // Assegnazioni attive per tutti i clienti
      supabase.from('assegnazioni')
        .select('cliente_id')
        .in('cliente_id', clienteIds)
        .eq('coach_id', user.id)
        .eq('attiva', true),
    ])

    const tutteSessioni = sessRes.data ?? []
    const tuttiCheckin = checkinRes.data ?? []
    const tutteMisurazioni = misRes.data ?? []
    const tutteAssegAttive = assegAttiveRes.data ?? []

    // Fetch log_serie per sessioni ultimi 30gg — per alert volume/completamento/esercizi saltati
    const trenta_giorni_fa = new Date(Date.now() - 30 * 86400000).toISOString()
    const sessRecenti = tutteSessioni.filter(s => s.data >= trenta_giorni_fa).map(s => s.id)
    const logSerieMap = new Map<string, { completata: boolean; peso_kg: number | null; ripetizioni: number | null; esercizio_id: string | null }[]>()
    if (sessRecenti.length > 0) {
      const { data: logSerieData } = await supabase
        .from('log_serie')
        .select('sessione_id, completata, peso_kg, ripetizioni, scheda_esercizi!inner(esercizio_id)')
        .in('sessione_id', sessRecenti)
      for (const l of (logSerieData ?? []) as any[]) {
        const sid = l.sessione_id
        if (!logSerieMap.has(sid)) logSerieMap.set(sid, [])
        logSerieMap.get(sid)!.push({
          completata: l.completata,
          peso_kg: l.peso_kg,
          ripetizioni: l.ripetizioni,
          esercizio_id: l.scheda_esercizi?.esercizio_id ?? null,
        })
      }
    }

    // Conta sessioni totali per il badge
    const sessioniPerCliente = new Map<string, typeof tutteSessioni>()
    for (const s of tutteSessioni) {
      if (!sessioniPerCliente.has(s.cliente_id)) sessioniPerCliente.set(s.cliente_id, [])
      sessioniPerCliente.get(s.cliente_id)!.push(s)
    }
    setTotaleSessioni(tutteSessioni.length)

    // Checkin per cliente (tutti, già ordinati desc — uso ultimi 3 per alert consecutivi)
    const ultimoCheckinPerCliente = new Map<string, any>()
    const ultimi3CheckinPerCliente = new Map<string, any[]>()
    for (const c of tuttiCheckin) {
      if (!ultimoCheckinPerCliente.has(c.cliente_id)) ultimoCheckinPerCliente.set(c.cliente_id, c)
      const lista = ultimi3CheckinPerCliente.get(c.cliente_id) ?? []
      if (lista.length < 3) lista.push(c)
      ultimi3CheckinPerCliente.set(c.cliente_id, lista)
    }

    // Misurazioni per cliente
    const misurazioniPerCliente = new Map<string, Misurazione[]>()
    for (const m of tutteMisurazioni) {
      if (!misurazioniPerCliente.has(m.cliente_id)) misurazioniPerCliente.set(m.cliente_id, [])
      misurazioniPerCliente.get(m.cliente_id)!.push({
        data: new Date(m.data).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' }),
        peso_kg: parseFloat(m.peso_kg),
      })
    }

    // Assegnazioni attive per cliente
    const assegAttivePerCliente = new Map<string, number>()
    for (const a of tutteAssegAttive) {
      assegAttivePerCliente.set(a.cliente_id, (assegAttivePerCliente.get(a.cliente_id) ?? 0) + 1)
    }

    // ── 3. Costruisci stats per ogni cliente (tutto in memoria) ───
    const stats: ClienteStats[] = []
    for (const c of clientiData) {
      const clienteId = c.cliente_id
      const profile = (c as any).profiles
      const sessioni = sessioniPerCliente.get(clienteId) ?? []
      const ultimaSessione = sessioni.length > 0 ? sessioni[0].data : null
      const giorniInattivo = ultimaSessione
        ? Math.floor((Date.now() - new Date(ultimaSessione).getTime()) / (1000 * 60 * 60 * 24))
        : null
      const ultimoCheckin = ultimoCheckinPerCliente.get(clienteId) ?? null

      const alert: { label: string; dettaglio: string }[] = []

      // ── 1. Inattività ─────────────────────────────────────────────
      if (sessioni.length === 0) {
        alert.push({ label: 'Non si è mai allenato', dettaglio: 'Questo cliente non ha ancora completato nessuna sessione di allenamento.' })
      } else if (giorniInattivo !== null && giorniInattivo >= 4) {
        alert.push({ label: `Inattivo da ${giorniInattivo} giorni`, dettaglio: `Ultima sessione registrata ${giorniInattivo} giorni fa (${ultimaSessione ? new Date(ultimaSessione).toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' }) : '—'}). Soglia: 4 giorni.` })
      }

      // ── 2. Check-in mancante ──────────────────────────────────────
      if (!ultimoCheckin) {
        alert.push({ label: 'Nessun check-in ancora', dettaglio: 'Il cliente non ha mai compilato un check-in giornaliero.' })
      } else {
        const giorniSenzaCheckin = Math.floor((Date.now() - new Date(ultimoCheckin.data).getTime()) / (1000 * 60 * 60 * 24))
        if (giorniSenzaCheckin >= 4) alert.push({ label: `Check-in mancante da ${giorniSenzaCheckin} giorni`, dettaglio: `Ultimo check-in: ${new Date(ultimoCheckin!.data).toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' })}. Soglia: 4 giorni senza compilare.` })

        // ── 3. Check-in negativi consecutivi ─────────────────────────
        const ultimi3 = ultimi3CheckinPerCliente.get(clienteId) ?? []
        if (ultimi3.length >= 3) {
          const isCritico = (c: any) =>
            c.energia <= 2 || c.sonno <= 2 || c.stress >= 4 || c.motivazione <= 2
          if (ultimi3.every(isCritico)) {
            alert.push({ label: '3+ check-in negativi consecutivi', dettaglio: `Ultimi 3 check-in tutti critici (energia ≤2, stress ≥4 o motivazione ≤2). Ultimo: E${ultimi3[0]?.energia} S${ultimi3[0]?.sonno} St${ultimi3[0]?.stress} M${ultimi3[0]?.motivazione}.` })
          }
        }

        // Check-in singolo critico
        if (ultimoCheckin.stress >= 4) alert.push({ label: 'Stress elevato', dettaglio: `Ultimo check-in: stress ${ultimoCheckin.stress}/5 (${new Date(ultimoCheckin.data).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })}). Scala: 1=basso, 5=alto.` })
        if (ultimoCheckin.energia <= 2) alert.push({ label: 'Energia bassa', dettaglio: `Ultimo check-in: energia ${ultimoCheckin.energia}/5 (${new Date(ultimoCheckin.data).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })}).` })
        if (ultimoCheckin.motivazione <= 2) alert.push({ label: 'Motivazione bassa', dettaglio: `Ultimo check-in: motivazione ${ultimoCheckin.motivazione}/5 (${new Date(ultimoCheckin.data).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })}).` })
        if (ultimoCheckin.sonno <= 2) alert.push({ label: 'Sonno scarso', dettaglio: `Ultimo check-in: sonno ${ultimoCheckin.sonno}/5 (${new Date(ultimoCheckin.data).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })}).` })
      }

      // ── 4. Peso anomalo ────────────────────────────────────────────
      const misCliente = misurazioniPerCliente.get(clienteId) ?? []
      if (misCliente.length >= 2) {
        const ultima = misCliente[misCliente.length - 1]?.peso_kg
        const penultima = misCliente[misCliente.length - 2]?.peso_kg
        if (ultima && penultima) {
          const deltaPeso = Math.abs(ultima - penultima)
          if (deltaPeso >= 3) {
            alert.push({ label: `Variazione peso anomala: ${ultima > penultima ? '+' : ''}${(ultima - penultima).toFixed(1)} kg`, dettaglio: `Da ${penultima} kg → ${ultima} kg. Variazione di ${deltaPeso.toFixed(1)} kg tra le ultime 2 misurazioni.` })
          }
        }
      }

      // ── 5, 6, 7: Alert basati su log_serie ────────────────────────
      const sessRecentiCliente = sessioni
        .filter(s => s.data >= trenta_giorni_fa)
        .slice(0, 6)

      if (sessRecentiCliente.length > 0) {
        // 5. Sessione incompleta — ultima sessione < 80% serie completate
        const ultimaSessId = sessRecentiCliente[0]?.id
        if (ultimaSessId) {
          const logUltima = logSerieMap.get(ultimaSessId) ?? []
          if (logUltima.length > 0) {
            const completate = logUltima.filter(l => l.completata).length
            const perc = completate / logUltima.length
            if (perc < 0.8) {
              alert.push({ label: `Ultima sessione incompleta (${Math.round(perc * 100)}%)`, dettaglio: `${completate} serie completate su ${logUltima.length} totali (${Math.round(perc * 100)}%). Soglia: 80%.` })
            }
          }
        }

        // 6. Esercizi sistematicamente saltati — stesso esercizio a 0 nelle ultime 2 sessioni
        if (sessRecentiCliente.length >= 2) {
          const eseCount = new Map<string, number>()
          const eseSkipped = new Map<string, number>()
          for (const sess of sessRecentiCliente.slice(0, 2)) {
            const log = logSerieMap.get(sess.id) ?? []
            const eseInSess = new Set(log.map(l => l.esercizio_id).filter(Boolean))
            for (const eseId of eseInSess) {
              if (!eseId) continue
              eseCount.set(eseId, (eseCount.get(eseId) ?? 0) + 1)
              const tutteCompletate = log.filter(l => l.esercizio_id === eseId).every(l => !l.completata)
              if (tutteCompletate) eseSkipped.set(eseId, (eseSkipped.get(eseId) ?? 0) + 1)
            }
          }
          for (const [eseId, skippedCount] of eseSkipped) {
            if (skippedCount >= 2 && (eseCount.get(eseId) ?? 0) >= 2) {
              alert.push({ label: 'Esercizio sistematicamente saltato', dettaglio: 'Un esercizio è stato saltato (0 serie completate) nelle ultime 2 sessioni consecutive.' })
              break
            }
          }
        }

        // 7. Calo volume — avg ultime 3 sessioni vs 3 precedenti
        if (sessRecentiCliente.length >= 4) {
          const calcVolume = (ids: string[]) => {
            let tot = 0, count = 0
            for (const id of ids) {
              const log = logSerieMap.get(id) ?? []
              const vol = log.filter(l => l.completata).reduce((a, l) => a + ((l.peso_kg ?? 0) * (l.ripetizioni ?? 0)), 0)
              if (vol > 0) { tot += vol; count++ }
            }
            return count > 0 ? tot / count : 0
          }
          const volRecente = calcVolume(sessRecentiCliente.slice(0, 3).map(s => s.id))
          const volPrecedente = calcVolume(sessRecentiCliente.slice(3, 6).map(s => s.id))
          if (volPrecedente > 0 && volRecente < volPrecedente * 0.7) {
            alert.push({ label: 'Calo volume allenamento −30%+', dettaglio: `Media ultime 3 sessioni: ${Math.round(volRecente).toLocaleString('it-IT')} kg×reps vs ${Math.round(volPrecedente).toLocaleString('it-IT')} kg×reps nelle 3 precedenti (−${Math.round((1 - volRecente/volPrecedente)*100)}%).` })
          }
        }
      }

      stats.push({
        id: clienteId,
        full_name: profile?.full_name,
        created_at: (clientiData.find((c: any) => c.cliente_id === clienteId) as any)?.created_at ?? '',
        schede_attive: assegAttivePerCliente.get(clienteId) ?? 0,
        totale_sessioni: sessioni.length,
        ultima_sessione: ultimaSessione,
        giorni_inattivo: giorniInattivo,
        ultimo_checkin: ultimoCheckin,
        misurazioni: misurazioniPerCliente.get(clienteId) ?? [],
        alert,
      })
    }

    setTotaleSessioni(tutteSessioni.length)
    stats.sort((a, b) => {
      if (a.alert.length !== b.alert.length) return b.alert.length - a.alert.length
      if (a.giorni_inattivo === null) return 1
      if (b.giorni_inattivo === null) return -1
      return b.giorni_inattivo - a.giorni_inattivo
    })
    setClientiStats(stats)
    setLoading(false)
  }

  useEffect(() => { fetchAnalytics() }, [])

  const apriCliente = async (cliente: ClienteStats) => {
    setClienteSelezionato(cliente)
    setSessioneAperta(null)
    setLoadingSessioni(true)
    setAssegnazioniCliente([])
    setDrawerTab('overview')
    setDietaAbilitata(false)
    setStoricoNutrizioneCliente([])
    setMacroTargetCliente(null)
    setAnamnesICliente(null)
    const data7ago = new Date()
    data7ago.setDate(data7ago.getDate() - 7)
    const data7agoStr = data7ago.toISOString().split('T')[0]
    const oggi = new Date().toISOString().split('T')[0]
    const [sessData, assData, dietaRes, pastiRes, targetRes, pianoIntRes] = await Promise.all([
      supabase.from('sessioni').select(`
        id, data, completata, durata_secondi,
        scheda_giorni ( nome ),
        log_serie (
          numero_serie, peso_kg, ripetizioni, completata,
          scheda_esercizi ( serie, ripetizioni, recupero_secondi, esercizi!scheda_esercizi_esercizio_id_fkey ( nome, muscoli ) )
        )
      `).eq('cliente_id', cliente.id).order('data', { ascending: false }),
      supabase.from('assegnazioni').select('id, data_inizio, attiva, schede(nome)')
        .eq('cliente_id', cliente.id).order('created_at', { ascending: false }),
      supabase.from('coach_clienti').select('dieta_abilitata').eq('cliente_id', cliente.id).maybeSingle(),
      supabase.from('pasto_log').select('data, calorie, proteine_g, carboidrati_g, grassi_g')
        .eq('cliente_id', cliente.id).gte('data', data7agoStr).lte('data', oggi).order('data', { ascending: false }),
      supabase.from('macro_target').select('calorie, proteine_g, carboidrati_g, grassi_g')
        .eq('cliente_id', cliente.id).maybeSingle(),
      supabase.from('piano_integratori')
        .select('*')
        .eq('cliente_id', cliente.id)
        .eq('attivo', true)
        .order('created_at'),
    ])
    setSessioniDettaglio((sessData.data as any) ?? [])
    setAssegnazioniCliente((assData.data as any) ?? [])
    setDietaAbilitata(dietaRes.data?.dieta_abilitata ?? false)
    setMacroTargetCliente((targetRes.data as any) ?? null)
    setPianoIntegratori((pianoIntRes as any)?.data ?? [])
    // Carica note esercizi del cliente
    const { data: noteData } = await supabase
      .from('note_esercizio')
      .select(`id, testo, created_at, sessione_id,
        scheda_esercizi!note_esercizio_scheda_esercizio_id_fkey ( esercizi!scheda_esercizi_esercizio_id_fkey ( nome ) ),
        sessioni!note_esercizio_sessione_id_fkey ( id, data )`)
      .eq('cliente_id', cliente.id)
      .order('created_at', { ascending: false })
      .limit(10)
    setNoteEsercizioCliente((noteData as any) ?? [])
    // Aggrega pasti per giorno
    const map = new Map<string, any>()
    for (const r of (pastiRes.data ?? []) as any[]) {
      if (!map.has(r.data)) map.set(r.data, { data: r.data, calorie: 0, proteine_g: 0, carboidrati_g: 0, grassi_g: 0 })
      const g = map.get(r.data)!
      g.calorie += r.calorie || 0; g.proteine_g += r.proteine_g || 0
      g.carboidrati_g += r.carboidrati_g || 0; g.grassi_g += r.grassi_g || 0
    }
    setStoricoNutrizioneCliente(Array.from(map.values()))
    // Fetch anamnesi per note di programmazione
    const { data: anamnesIData } = await supabase.from('anamnesi').select('*').eq('cliente_id', cliente.id).maybeSingle()
    setAnamnesICliente(anamnesIData ?? null)
    setLoadingSessioni(false)
  }

  const handleToggleDieta = async () => {
    if (togglingDieta || !clienteSelezionato) return
    setTogglingDieta(true)
    const newVal = !dietaAbilitata
    await supabase.from('coach_clienti').update({ dieta_abilitata: newVal }).eq('cliente_id', clienteSelezionato.id)
    setDietaAbilitata(newVal)
    setTogglingDieta(false)
  }

  const apriAssegnaFlow = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('schede').select('id, nome').eq('coach_id', user.id).order('created_at', { ascending: false })
    setSchedeCoach((data as any) ?? [])
    setSchedaPickata(null)
    setAssegnaFlow('pick')
  }

  const resetAssegnaFlow = () => {
    setAssegnaFlow(null)
    setSchedaPickata(null)
    setSchedaClonata(null)
  }

  const handleAssegnaDirectly = async () => {
    if (!schedaPickata || !clienteSelezionato) return
    setAssegnando(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('assegnazioni').insert({
      scheda_id: schedaPickata.id,
      cliente_id: clienteSelezionato.id,
      coach_id: user.id,
      data_inizio: new Date().toISOString().split('T')[0],
      attiva: true,
    })
    // Refresh assegnazioni
    const { data } = await supabase.from('assegnazioni').select('id, data_inizio, attiva, schede(nome)')
      .eq('cliente_id', clienteSelezionato.id).order('created_at', { ascending: false })
    setAssegnazioniCliente((data as any) ?? [])
    setAssegnando(false)
    resetAssegnaFlow()
  }

  const handleCloneScheda = async () => {
    if (!schedaPickata || !clienteSelezionato) return
    setCloningScheda(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // 1. Fetch scheda originale + giorni + esercizi
    const { data: giorni } = await supabase.from('scheda_giorni')
      .select('id, nome, ordine, scheda_esercizi(*)')
      .eq('scheda_id', schedaPickata.id)
      .order('ordine')

    // 2. Crea nuova scheda
    const nomeClone = `${schedaPickata.nome} — ${clienteSelezionato.full_name ?? 'cliente'}`
    const { data: nuovaScheda } = await supabase.from('schede')
      .insert({ coach_id: user.id, nome: nomeClone, is_template: false })
      .select('id, nome').single()
    if (!nuovaScheda) { setCloningScheda(false); return }

    // 3. Clona giorni e esercizi
    for (const giorno of (giorni ?? []) as any[]) {
      const { data: nuovoGiorno } = await supabase.from('scheda_giorni')
        .insert({ scheda_id: nuovaScheda.id, nome: giorno.nome, ordine: giorno.ordine })
        .select('id').single()
      if (!nuovoGiorno) continue
      const esercizi = (giorno.scheda_esercizi ?? []).map((e: any) => ({
        giorno_id: nuovoGiorno.id,
        esercizio_id: e.esercizio_id,
        serie: e.serie, ripetizioni: e.ripetizioni,
        recupero_secondi: e.recupero_secondi, note: e.note,
        ordine: e.ordine, tipo: e.tipo, gruppo_id: e.gruppo_id,
        drop_count: e.drop_count, drop_percentage: e.drop_percentage,
        rest_pause_secondi: e.rest_pause_secondi,
        piramidale_direzione: e.piramidale_direzione,
        alternativa_esercizio_id: e.alternativa_esercizio_id,
      }))
      if (esercizi.length > 0) await supabase.from('scheda_esercizi').insert(esercizi)
    }

    setSchedaClonata({ id: nuovaScheda.id, nome: nuovaScheda.nome })
    setCloningScheda(false)
    setAssegnaFlow('editor')
  }

  const handleAssegnaDopoEditor = async () => {
    if (!schedaClonata || !clienteSelezionato) return
    setAssegnando(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('assegnazioni').insert({
      scheda_id: schedaClonata.id,
      cliente_id: clienteSelezionato.id,
      coach_id: user.id,
      data_inizio: new Date().toISOString().split('T')[0],
      attiva: true,
    })
    const { data } = await supabase.from('assegnazioni').select('id, data_inizio, attiva, schede(nome)')
      .eq('cliente_id', clienteSelezionato.id).order('created_at', { ascending: false })
    setAssegnazioniCliente((data as any) ?? [])
    setAssegnando(false)
    resetAssegnaFlow()
  }

  const chiudiCliente = () => {
    setClienteSelezionato(null)
    setSessioniDettaglio([])
    setSessioneAperta(null)
    setAssegnazioniCliente([])
    setPianoIntegratori([])
    setNoteEsercizioCliente([])
    setShowFormInt(false)
  }

  const formatDurata = (sec: number | null) => {
    if (!sec) return null
    const h = Math.floor(sec / 3600)
    const m = Math.floor((sec % 3600) / 60)
    if (h > 0) return `${h}h ${m}min`
    return `${m}min`
  }

  const getStatoCliente = (giorni: number | null, sessioni: number) => {
    if (sessioni === 0) return { label: 'Mai allenato', color: 'oklch(0.55 0 0)', bg: 'oklch(0.25 0 0)' }
    if (giorni === null) return { label: 'Nessuna sessione', color: 'oklch(0.55 0 0)', bg: 'oklch(0.25 0 0)' }
    if (giorni <= 3) return { label: 'Attivo', color: 'oklch(0.65 0.18 150)', bg: 'oklch(0.65 0.18 150 / 15%)' }
    if (giorni <= 7) return { label: 'Regolare', color: 'oklch(0.70 0.19 46)', bg: 'oklch(0.70 0.19 46 / 15%)' }
    if (giorni <= 14) return { label: 'In calo', color: 'oklch(0.75 0.18 80)', bg: 'oklch(0.75 0.18 80 / 15%)' }
    return { label: 'A rischio', color: 'oklch(0.75 0.15 27)', bg: 'oklch(0.65 0.22 27 / 15%)' }
  }


  const EMOJI: (IconDefinition | null)[] = [null, faFaceTired, faFaceFrown, faFaceMeh, faFaceSmile, faFaceGrinStars]

  const clientiConAlert = clientiStats.filter(c => c.alert.length > 0)
  const clientiAttivi = clientiStats.filter(c => c.giorni_inattivo !== null && c.giorni_inattivo <= 7).length

  const setteGiorniFaMs = Date.now() - 7 * 24 * 60 * 60 * 1000
  const isNuovo = (c: ClienteStats) => new Date(c.created_at).getTime() >= setteGiorniFaMs

  const clientiOrdinati = [...clientiStats].sort((a, b) => {
    switch (ordinamento) {
      case 'alert':
        if (a.alert.length !== b.alert.length) return b.alert.length - a.alert.length
        if (a.giorni_inattivo === null) return 1
        if (b.giorni_inattivo === null) return -1
        return b.giorni_inattivo - a.giorni_inattivo
      case 'ultima_attivita':
        if (!a.ultima_sessione && !b.ultima_sessione) return 0
        if (!a.ultima_sessione) return 1
        if (!b.ultima_sessione) return -1
        return new Date(b.ultima_sessione).getTime() - new Date(a.ultima_sessione).getTime()
      case 'piu_recenti':
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      case 'piu_vecchi':
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      case 'nome':
        return (a.full_name ?? '').localeCompare(b.full_name ?? '', 'it')
      default:
        return 0
    }
  })

  const overviewStats = [
    { label: 'Clienti totali', value: totaleClienti, icon: faUsers, color: 'oklch(0.60 0.15 200)' },
    { label: 'Schede create', value: totaleSchede, icon: faClipboardList, color: 'oklch(0.70 0.19 46)' },
    { label: 'Assegnazioni attive', value: totaleAssegnazioni, icon: faCircleCheck, color: 'oklch(0.65 0.18 150)' },
    { label: 'Sessioni totali', value: totaleSessioni, icon: faDumbbell, color: 'oklch(0.65 0.15 300)' },
  ]

  return (
    <>
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium mb-1" style={{ color: 'oklch(0.70 0.19 46)' }}>
            Dashboard <FontAwesomeIcon icon={faHand} />
          </p>
          <h1 className="text-3xl lg:text-4xl font-black tracking-tight" style={{ color: 'oklch(0.97 0 0)' }}>
            I tuoi clienti
          </h1>
          <div className="flex items-center gap-4 mt-1">
            {[
              { label: 'Totali', value: totaleClienti, color: 'oklch(0.50 0 0)' },
              { label: 'Nuovi', value: clientiNuovi, color: 'oklch(0.70 0.19 46)' },
              { label: 'Attivi', value: clientiAttivi, color: 'oklch(0.65 0.18 150)' },
            ].map((s, i) => (
              <div key={s.label} className="flex items-center gap-2">
                {i > 0 && <span style={{ color: 'oklch(0.30 0 0)' }}>·</span>}
                <span className="text-sm font-bold" style={{ color: s.color }}>{s.value}</span>
                <span className="text-sm" style={{ color: 'oklch(0.45 0 0)' }}>{s.label}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <a href="/coach/schede"
            className="px-4 py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-95"
            style={{ background: 'oklch(0.22 0 0)', color: 'oklch(0.70 0 0)', border: '1px solid oklch(1 0 0 / 8%)' }}>
            + Scheda
          </a>
          <a href="/coach/clienti"
            className="px-4 py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-95"
            style={{ background: 'oklch(0.70 0.19 46)', color: 'oklch(0.13 0 0)' }}>
            + Cliente
          </a>
        </div>
      </div>

      {/* Alert banner — solo se ci sono alert */}
      {!loading && clientiConAlert.length > 0 && (
        <div className="rounded-2xl p-4 flex items-start gap-3"
          style={{ background: 'oklch(0.65 0.22 27 / 10%)', border: '1px solid oklch(0.65 0.22 27 / 30%)' }}>
          <FontAwesomeIcon icon={faTriangleExclamation} className="text-xl flex-shrink-0" />
          <div>
            <p className="font-semibold text-sm" style={{ color: 'oklch(0.85 0.10 46)' }}>
              {clientiConAlert.length} {clientiConAlert.length === 1 ? 'cliente richiede' : 'clienti richiedono'} attenzione
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'oklch(0.60 0 0)' }}>
              {clientiConAlert.map(c => c.full_name).join(', ')}
            </p>
          </div>
        </div>
      )}

      {/* Stats overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {overviewStats.map((stat) => (
          <div key={stat.label} className="rounded-2xl p-4 space-y-2"
            style={{ background: 'oklch(0.18 0 0)', border: '1px solid oklch(1 0 0 / 6%)' }}>
            <div className="flex items-center justify-between">
              <p className="text-xs" style={{ color: 'oklch(0.50 0 0)' }}>{stat.label}</p>
              <FontAwesomeIcon icon={stat.icon} />
            </div>
            <p className="text-3xl lg:text-4xl font-black" style={{ color: stat.color }}>{stat.value}</p>
          </div>
        ))}
      </div>
      {/* Prossimi appuntamenti */}
      {prossimiCheckin.length > 0 && (
        <div className="rounded-2xl overflow-hidden"
          style={{ background: 'oklch(0.18 0 0)', border: '1px solid oklch(0.60 0.15 200 / 20%)' }}>
          <div className="px-5 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid oklch(1 0 0 / 6%)' }}>
            <p className="font-bold text-sm" style={{ color: 'oklch(0.97 0 0)' }}>
              <FontAwesomeIcon icon={faCalendarDays} className="mr-2" style={{ color: 'oklch(0.60 0.15 200)' }} />
              Prossimi appuntamenti
            </p>
            <Link href="/coach/appuntamenti" className="text-xs font-medium" style={{ color: 'oklch(0.60 0.15 200)' }}>
              Tutti →
            </Link>
          </div>
          {prossimiCheckin.map((a: any, i: number) => {
            const dataOra = new Date(a.data_ora)
            const oggi = new Date(); oggi.setHours(0,0,0,0)
            const domani = new Date(oggi); domani.setDate(domani.getDate() + 1)
            const gg = dataOra < domani
              ? `Oggi ${dataOra.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}`
              : dataOra < new Date(domani.getTime() + 86400000)
              ? `Domani ${dataOra.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}`
              : dataOra.toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' }) + ' ' + dataOra.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
            return (
              <Link key={a.id} href={`/coach/appuntamenti`}
                className="flex items-center gap-3 px-5 py-3 transition-all hover:bg-white/3"
                style={{ borderBottom: i < prossimiCheckin.length - 1 ? '1px solid oklch(1 0 0 / 4%)' : 'none' }}>
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: 'oklch(0.60 0.15 200)' }} />
                <p className="flex-1 text-sm font-semibold truncate" style={{ color: 'oklch(0.85 0 0)' }}>
                  {(a as any).profiles?.full_name ?? 'Cliente'}
                </p>
                <p className="text-xs flex-shrink-0" style={{ color: 'oklch(0.50 0 0)' }}>{gg} · {a.durata_minuti}min</p>
              </Link>
            )
          })}
        </div>
      )}

      {/* Prossimi check-in mensili */}
      <div className="rounded-2xl overflow-hidden"
        style={{ background: 'oklch(0.18 0 0)', border: '1px solid oklch(0.70 0.19 46 / 20%)' }}>
        <div className="px-5 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid oklch(1 0 0 / 6%)' }}>
          <p className="font-bold text-sm" style={{ color: 'oklch(0.97 0 0)' }}>
            <FontAwesomeIcon icon={faClipboardList} className="mr-2" style={{ color: 'oklch(0.70 0.19 46)' }} />
            Prossimi check-in
          </p>
          <Link href="/coach/checkin" className="text-xs font-medium" style={{ color: 'oklch(0.70 0.19 46)' }}>
            Tutti →
          </Link>
        </div>
        <div className="px-5 py-4 text-center">
          <p className="text-sm" style={{ color: 'oklch(0.45 0 0)' }}>Nessun check-in programmato</p>
          <Link href="/coach/checkin"
            className="inline-block mt-2 text-xs font-semibold"
            style={{ color: 'oklch(0.70 0.19 46)' }}>
            + Programma il primo →
          </Link>
        </div>
      </div>
      
      {/* Tabs */}
      <div className="flex gap-2 p-1 rounded-2xl" style={{ background: 'oklch(0.18 0 0)' }}>
        {[
          { id: 'overview' as VistaTab, label: 'Attività', icon: faChartBar },
          { id: 'attivita' as VistaTab, label: 'Alert', icon: faTriangleExclamation, badge: clientiConAlert.length },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-semibold transition-all relative"
            style={{
              background: tab === t.id ? 'oklch(0.70 0.19 46)' : 'transparent',
              color: tab === t.id ? 'oklch(0.13 0 0)' : 'oklch(0.50 0 0)',
            }}>
            <FontAwesomeIcon icon={t.icon} />
            <span className="hidden sm:inline">{t.label}</span>
            {t.badge && t.badge > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full text-xs font-bold flex items-center justify-center"
                style={{ background: 'oklch(0.65 0.22 27)', color: 'white' }}>
                {t.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-16 text-center">
          <p className="text-sm" style={{ color: 'oklch(0.45 0 0)' }}>Caricamento analytics...</p>
        </div>
      ) : clientiStats.length === 0 ? (
        <div className="rounded-2xl py-16 text-center space-y-3"
          style={{ background: 'oklch(0.18 0 0)', border: '1px solid oklch(1 0 0 / 6%)' }}>
          <p className="text-5xl"><FontAwesomeIcon icon={faChartBar} /></p>
          <p className="font-semibold" style={{ color: 'oklch(0.97 0 0)' }}>Nessun cliente ancora</p>
          <p className="text-sm" style={{ color: 'oklch(0.45 0 0)' }}>Aggiungi clienti per vedere le analytics</p>
        </div>
      ) : (
        <>
          {/* TAB: ATTIVITÀ */}
          {tab === 'overview' && (
            <>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold" style={{ color: 'oklch(0.45 0 0)' }}>Ordina:</span>
              {([
                { id: 'alert', label: '⚠ Alert' },
                { id: 'ultima_attivita', label: '🕐 Ultima attività' },
                { id: 'piu_recenti', label: '🆕 Più recenti' },
                { id: 'piu_vecchi', label: '📅 Più vecchi' },
                { id: 'nome', label: 'A→Z Nome' },
              ] as const).map(o => (
                <button key={o.id} onClick={() => setOrdinamento(o.id)}
                  className="px-3 py-1 rounded-full text-xs font-semibold transition-all"
                  style={{
                    background: ordinamento === o.id ? 'oklch(0.70 0.19 46)' : 'oklch(0.22 0 0)',
                    color: ordinamento === o.id ? 'oklch(0.13 0 0)' : 'oklch(0.50 0 0)',
                    border: `1px solid ${ordinamento === o.id ? 'oklch(0.70 0.19 46)' : 'oklch(1 0 0 / 8%)'}`,
                  }}>
                  {o.label}
                </button>
              ))}
            </div>
            <div className="rounded-2xl overflow-hidden"
              style={{ background: 'oklch(0.18 0 0)', border: '1px solid oklch(1 0 0 / 6%)' }}>
              {/* Header colonne */}
              <div className="px-5 py-3 grid grid-cols-12 gap-2 hidden lg:grid"
                style={{ background: 'oklch(0.15 0 0)', borderBottom: '1px solid oklch(1 0 0 / 6%)' }}>
                {['Cliente', 'Schede', 'Sessioni', 'Ultima sessione', 'Stato'].map((h, i) => (
                  <p key={h} className={`text-xs font-semibold uppercase tracking-wider ${i === 0 ? 'col-span-4' : i === 3 ? 'col-span-2 text-center' : 'col-span-2 text-center'}`}
                    style={{ color: 'oklch(0.40 0 0)' }}>{h}</p>
                ))}
              </div>

              {clientiOrdinati.map((c, i) => {
                const stato = getStatoCliente(c.giorni_inattivo, c.totale_sessioni)
                return (
                  <div key={c.id}
                    onClick={() => apriCliente(c)}
                    className="px-5 py-4 lg:grid lg:grid-cols-12 lg:gap-2 lg:items-center flex flex-col gap-2 cursor-pointer transition-colors hover:opacity-80"
                    style={{ borderBottom: i < clientiOrdinati.length - 1 ? '1px solid oklch(1 0 0 / 4%)' : 'none' }}>
                    {/* Cliente */}
                    <div className="lg:col-span-4 flex items-center gap-3">
                      <div className="relative flex-shrink-0">
                        <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold"
                          style={{ background: 'oklch(0.70 0.19 46 / 15%)', color: 'oklch(0.70 0.19 46)' }}>
                          {c.full_name?.charAt(0).toUpperCase()}
                        </div>
                        {isNuovo(c) && (
                          <span className="absolute -top-1 -right-1 text-xs font-black px-1 rounded-full leading-tight"
                            style={{ background: 'oklch(0.70 0.19 46)', color: 'oklch(0.13 0 0)', fontSize: '0.6rem' }}>
                            NEW
                          </span>
                        )}
                      </div>
                      <div>
                        <p className="font-semibold text-sm" style={{ color: 'oklch(0.97 0 0)' }}>{c.full_name}</p>
                        {c.alert.length > 0 && (
                          <p className="text-xs" style={{ color: 'oklch(0.75 0.15 27)' }}>
                            <FontAwesomeIcon icon={faTriangleExclamation} /> {c.alert.length} alert
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Mobile: stats inline */}
                    <div className="lg:hidden flex items-center gap-4 flex-wrap">
                      <span className="text-xs px-2.5 py-1 rounded-full" style={{ background: stato.bg, color: stato.color }}>
                        {stato.label}
                      </span>
                      <span className="text-xs" style={{ color: 'oklch(0.50 0 0)' }}>
                        {c.totale_sessioni} sessioni
                      </span>
                      {c.ultima_sessione && (
                        <span className="text-xs" style={{ color: 'oklch(0.50 0 0)' }}>
                          {c.giorni_inattivo === 0 ? 'Oggi' : c.giorni_inattivo === 1 ? 'Ieri' : `${c.giorni_inattivo}gg fa`}
                        </span>
                      )}
                    </div>

                    {/* Desktop: colonne */}
                    <div className="lg:col-span-2 text-center hidden lg:block">
                      <p className="text-sm font-semibold" style={{ color: c.schede_attive > 0 ? 'oklch(0.65 0.18 150)' : 'oklch(0.45 0 0)' }}>
                        {c.schede_attive}
                      </p>
                    </div>
                    <div className="lg:col-span-2 text-center hidden lg:block">
                      <p className="text-sm font-semibold" style={{ color: 'oklch(0.97 0 0)' }}>{c.totale_sessioni}</p>
                    </div>
                    <div className="lg:col-span-2 text-center hidden lg:block">
                      {c.ultima_sessione ? (
                        <p className="text-sm" style={{ color: 'oklch(0.97 0 0)' }}>
                          {c.giorni_inattivo === 0 ? 'Oggi' : c.giorni_inattivo === 1 ? 'Ieri' : `${c.giorni_inattivo}gg fa`}
                        </p>
                      ) : (
                        <p className="text-sm" style={{ color: 'oklch(0.40 0 0)' }}>—</p>
                      )}
                    </div>
                    <div className="lg:col-span-2 lg:flex lg:justify-center hidden lg:block">
                      <span className="text-xs font-medium px-3 py-1.5 rounded-full"
                        style={{ background: stato.bg, color: stato.color }}>
                        {stato.label}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
            </>
          )}

          {/* TAB: ALERT */}
          {tab === 'attivita' && (
            <div className="space-y-4">
              {clientiConAlert.length === 0 ? (
                <div className="rounded-2xl py-16 text-center space-y-3"
                  style={{ background: 'oklch(0.18 0 0)', border: '1px solid oklch(1 0 0 / 6%)' }}>
                  <p className="text-5xl"><FontAwesomeIcon icon={faCircleCheck} /></p>
                  <p className="font-semibold" style={{ color: 'oklch(0.97 0 0)' }}>Tutto ok!</p>
                  <p className="text-sm" style={{ color: 'oklch(0.45 0 0)' }}>Nessun cliente richiede attenzione</p>
                </div>
              ) : (
                <>
                  <p className="text-sm" style={{ color: 'oklch(0.50 0 0)' }}>
                    Clienti che potrebbero aver bisogno di supporto o contatto
                  </p>
                  {clientiConAlert.map((c) => (
                    <div key={c.id} className="rounded-2xl p-5 space-y-3"
                      style={{ background: 'oklch(0.18 0 0)', border: '1px solid oklch(0.65 0.22 27 / 25%)' }}>
                      <div className="flex items-center gap-3">
                        <div className="relative flex-shrink-0">
                          <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold"
                            style={{ background: 'oklch(0.65 0.22 27 / 20%)', color: 'oklch(0.75 0.15 27)' }}>
                            {c.full_name?.charAt(0).toUpperCase()}
                          </div>
                          {isNuovo(c) && (
                            <span className="absolute -top-1 -right-1 text-xs font-black px-1 rounded-full leading-tight"
                              style={{ background: 'oklch(0.70 0.19 46)', color: 'oklch(0.13 0 0)', fontSize: '0.6rem' }}>
                              NEW
                            </span>
                          )}
                        </div>
                        <div>
                          <p className="font-semibold" style={{ color: 'oklch(0.97 0 0)' }}>{c.full_name}</p>
                          <p className="text-xs" style={{ color: 'oklch(0.45 0 0)' }}>
                            {c.totale_sessioni} sessioni totali
                            {c.ultima_sessione && ` · ultima ${c.giorni_inattivo === 0 ? 'oggi' : c.giorni_inattivo === 1 ? 'ieri' : `${c.giorni_inattivo}gg fa`}`}
                          </p>
                        </div>
                      </div>

                      {/* Alert list con popover dettaglio */}
                      <div className="flex flex-wrap gap-2">
                        {c.alert.map((a, i) => {
                          const isRed = a.label.includes('Inattivo') || a.label.includes('mai allenato') || a.label.includes('incompleta') || a.label.includes('saltato') || a.label.includes('Calo volume')
                          const isOrange = a.label.includes('Stress') || a.label.includes('negativi') || a.label.includes('anomala')
                          const bg = isRed ? 'oklch(0.65 0.22 27 / 18%)' : isOrange ? 'oklch(0.70 0.19 46 / 18%)' : 'oklch(0.75 0.15 80 / 18%)'
                          const color = isRed ? 'oklch(0.75 0.15 27)' : isOrange ? 'oklch(0.75 0.14 46)' : 'oklch(0.80 0.12 80)'
                          const isOpen = alertAperto?.clienteId === c.id && alertAperto?.idx === i
                          return (
                            <div key={i} className="relative">
                              <button
                                onClick={() => setAlertAperto(isOpen ? null : { clienteId: c.id, idx: i })}
                                className="text-xs px-3 py-1.5 rounded-full font-medium transition-all"
                                style={{ background: bg, color, outline: isOpen ? `2px solid ${color}` : 'none', outlineOffset: 1 }}>
                                <FontAwesomeIcon icon={faTriangleExclamation} /> {a.label}
                              </button>
                              {isOpen && (
                                <div className="absolute bottom-full left-0 mb-2 z-50 w-64 rounded-2xl px-4 py-3 text-xs"
                                  style={{ background: 'oklch(0.20 0 0)', border: `1px solid ${color}`, color: 'oklch(0.80 0 0)', lineHeight: 1.6, boxShadow: '0 8px 24px oklch(0 0 0 / 40%)' }}>
                                  <p style={{ color, fontWeight: 600, marginBottom: 4 }}>{a.label}</p>
                                  <p>{a.dettaglio}</p>
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}
        </>
      )}

      {/* ── DRAWER DETTAGLIO CLIENTE ── */}
      {clienteSelezionato && (
        <div className="fixed inset-0 z-50 flex justify-end" style={{ background: 'oklch(0 0 0 / 60%)' }}
          onClick={chiudiCliente}>
          <div className="w-full max-w-xl h-full overflow-y-auto flex flex-col"
            style={{ background: 'oklch(0.13 0 0)', borderLeft: '1px solid oklch(1 0 0 / 8%)' }}
            onClick={e => e.stopPropagation()}>

            {/* Header drawer */}
            <div className="sticky top-0 z-10 flex items-center gap-4 px-5"
              style={{ background: 'oklch(0.13 0 0)', borderBottom: '1px solid oklch(1 0 0 / 8%)', paddingTop: 'calc(env(safe-area-inset-top) + 1rem)', paddingBottom: '1rem' }}>
              <button onClick={chiudiCliente}
                className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-opacity hover:opacity-70"
                style={{ background: 'oklch(0.22 0 0)', color: 'oklch(0.60 0 0)' }}>
                <FontAwesomeIcon icon={faXmark} />
              </button>
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                  style={{ background: 'oklch(0.70 0.19 46 / 15%)', color: 'oklch(0.70 0.19 46)' }}>
                  {clienteSelezionato.full_name?.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="font-black text-base truncate" style={{ color: 'oklch(0.97 0 0)' }}>
                    {clienteSelezionato.full_name}
                  </p>
                  <p className="text-xs" style={{ color: 'oklch(0.50 0 0)' }}>
                    {clienteSelezionato.totale_sessioni} sessioni totali
                  </p>
                </div>
              </div>
              {/* Anamnesi eye button */}
              <button onClick={() => setShowAnamnesIDrawer(true)}
                className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-opacity hover:opacity-70"
                style={{ background: 'oklch(0.60 0.15 200 / 12%)', color: 'oklch(0.60 0.15 200)' }}
                title="Vedi anamnesi">
                <FontAwesomeIcon icon={faEye} className="text-sm" />
              </button>
            </div>

            {/* Drawer tabs */}
            <div className="flex gap-2 p-3 flex-shrink-0" style={{ borderBottom: '1px solid oklch(1 0 0 / 8%)' }}>
              {[
                { id: 'overview', label: '📊 Overview' },
                { id: 'nutrizione', label: '🥗 Nutrizione' },
                { id: 'integratori', label: '💊 Integratori' },
              ].map(t => (
                <button key={t.id} onClick={() => setDrawerTab(t.id as any)}
                  className="flex-1 py-2 rounded-xl text-sm font-semibold transition-all"
                  style={{
                    background: drawerTab === t.id ? 'oklch(0.70 0.19 46)' : 'oklch(0.22 0 0)',
                    color: drawerTab === t.id ? 'oklch(0.11 0 0)' : 'oklch(0.50 0 0)',
                  }}>
                  {t.label}
                </button>
              ))}
            </div>

            {/* Toggle dieta — sempre visibile */}
            <div className="px-5 py-3 flex items-center justify-between flex-shrink-0"
              style={{ borderBottom: '1px solid oklch(1 0 0 / 8%)', background: 'oklch(0.16 0 0)' }}>
              <div>
                <p className="text-sm font-bold" style={{ color: 'oklch(0.97 0 0)' }}>Piano dieta</p>
                <p className="text-xs" style={{ color: 'oklch(0.45 0 0)' }}>
                  {dietaAbilitata ? 'Abilitato ✓' : 'Non abilitato'}
                </p>
              </div>
              <button onClick={handleToggleDieta} disabled={togglingDieta}
                className="relative flex-shrink-0"
                style={{ opacity: togglingDieta ? 0.5 : 1 }}>
                <div className="w-12 h-7 rounded-full transition-colors duration-200"
                  style={{ background: dietaAbilitata ? 'oklch(0.65 0.18 150)' : 'oklch(0.30 0 0)' }}>
                  <div className="absolute top-0.5 w-6 h-6 rounded-full shadow-md transition-transform duration-200"
                    style={{
                      background: 'oklch(0.97 0 0)',
                      transform: dietaAbilitata ? 'translateX(1.25rem)' : 'translateX(0.125rem)',
                    }} />
                </div>
              </button>
            </div>

            {drawerTab === 'integratori' ? (
              <div className="flex-1 p-5 space-y-4 overflow-y-auto">
                {showFormInt ? (
                  <div className="rounded-2xl p-4 space-y-3"
                    style={{ background: 'oklch(0.18 0 0)', border: '1px solid oklch(0.65 0.15 300 / 30%)' }}>
                    <p className="text-sm font-bold" style={{ color: 'oklch(0.97 0 0)' }}>Prescrivi integratore</p>
                    <input type="text" value={intNome} onChange={e => setIntNome(e.target.value)}
                      placeholder="es. Creatina, Vitamina D, Omega 3..."
                      className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                      style={{ background: 'oklch(0.22 0 0)', border: '1px solid oklch(1 0 0 / 8%)', color: 'oklch(0.97 0 0)' }} />
                    <div className="grid grid-cols-2 gap-2">
                      <input type="number" value={intQuantita} onChange={e => setIntQuantita(e.target.value)}
                        placeholder="Dose (es. 5)"
                        className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                        style={{ background: 'oklch(0.22 0 0)', border: '1px solid oklch(1 0 0 / 8%)', color: 'oklch(0.97 0 0)' }} />
                      <select value={intUnita} onChange={e => setIntUnita(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                        style={{ background: 'oklch(0.22 0 0)', border: '1px solid oklch(1 0 0 / 8%)', color: 'oklch(0.97 0 0)', colorScheme: 'dark' }}>
                        {['g', 'mg', 'ml', 'capsule', 'compresse', 'IU'].map(u => <option key={u} value={u}>{u}</option>)}
                      </select>
                    </div>
                    <select value={intMomento} onChange={e => setIntMomento(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                      style={{ background: 'oklch(0.22 0 0)', border: '1px solid oklch(1 0 0 / 8%)', color: intMomento ? 'oklch(0.97 0 0)' : 'oklch(0.45 0 0)', colorScheme: 'dark' }}>
                      <option value="">Momento assunzione...</option>
                      {['Mattina', 'Pre-workout', 'Post-workout', 'Con i pasti', 'Prima di dormire', 'A digiuno', 'Sera'].map(m => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                    <input type="text" value={intNote} onChange={e => setIntNote(e.target.value)}
                      placeholder="Note opzionali (es. con acqua abbondante)"
                      className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                      style={{ background: 'oklch(0.22 0 0)', border: '1px solid oklch(1 0 0 / 8%)', color: 'oklch(0.97 0 0)' }} />
                    <div className="flex gap-2">
                      <button onClick={async () => {
                        if (!intNome.trim() || !clienteSelezionato) return
                        setSavingInt(true)
                        const { data: { user } } = await supabase.auth.getUser()
                        if (!user) { setSavingInt(false); return }
                        const { data: newInt } = await supabase.from('piano_integratori').upsert({
                          coach_id: user.id,
                          cliente_id: clienteSelezionato.id,
                          nome: intNome.trim(),
                          quantita: parseFloat(intQuantita) || null,
                          unita: intUnita,
                          momento: intMomento || null,
                          note: intNote.trim() || null,
                          attivo: true,
                        }, { onConflict: 'cliente_id,nome' }).select().single()
                        if (newInt) setPianoIntegratori(prev => [...prev.filter(p => p.nome !== newInt.nome), newInt])
                        setIntNome(''); setIntQuantita(''); setIntMomento(''); setIntNote('')
                        setShowFormInt(false); setSavingInt(false)
                      }} disabled={savingInt || !intNome.trim()}
                        className="flex-1 py-2.5 rounded-xl text-sm font-bold"
                        style={{ background: 'oklch(0.65 0.15 300)', color: 'oklch(0.97 0 0)', opacity: savingInt ? 0.6 : 1 }}>
                        {savingInt ? 'Salvataggio...' : '+ Prescrivi'}
                      </button>
                      <button onClick={() => setShowFormInt(false)}
                        className="px-4 py-2.5 rounded-xl text-sm font-medium"
                        style={{ background: 'oklch(0.22 0 0)', color: 'oklch(0.55 0 0)' }}>
                        Annulla
                      </button>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => setShowFormInt(true)}
                    className="w-full py-3 rounded-2xl text-sm font-bold flex items-center justify-center gap-2"
                    style={{ background: 'transparent', color: 'oklch(0.65 0.15 300)', border: '2px dashed oklch(0.65 0.15 300 / 30%)' }}>
                    + Prescrivi integratore
                  </button>
                )}

                {pianoIntegratori.length === 0 && !showFormInt ? (
                  <div className="rounded-2xl py-10 text-center"
                    style={{ background: 'oklch(0.18 0 0)', border: '1px solid oklch(1 0 0 / 6%)' }}>
                    <p className="text-2xl mb-2">💊</p>
                    <p className="text-sm font-semibold" style={{ color: 'oklch(0.60 0 0)' }}>Nessun integratore prescritto</p>
                  </div>
                ) : (
                  <div className="rounded-2xl overflow-hidden"
                    style={{ background: 'oklch(0.18 0 0)', border: '1px solid oklch(1 0 0 / 6%)' }}>
                    {pianoIntegratori.map((int: any, i: number) => (
                      <div key={int.id} className="flex items-center gap-3 px-4 py-3"
                        style={{ borderBottom: i < pianoIntegratori.length - 1 ? '1px solid oklch(1 0 0 / 4%)' : 'none' }}>
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-sm"
                          style={{ background: 'oklch(0.65 0.15 300 / 15%)', color: 'oklch(0.65 0.15 300)' }}>
                          💊
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold" style={{ color: 'oklch(0.97 0 0)' }}>{int.nome}</p>
                          <p className="text-xs mt-0.5" style={{ color: 'oklch(0.45 0 0)' }}>
                            {int.quantita && `${int.quantita} ${int.unita}`}
                            {int.momento && ` · ${int.momento}`}
                            {int.note && ` · ${int.note}`}
                          </p>
                        </div>
                        <button onClick={async () => {
                          await supabase.from('piano_integratori').update({ attivo: false }).eq('id', int.id)
                          setPianoIntegratori(prev => prev.filter(p => p.id !== int.id))
                        }}
                          className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{ background: 'oklch(0.65 0.22 27 / 10%)', color: 'oklch(0.70 0.20 27)' }}>
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : drawerTab === 'nutrizione' ? (
              <div className="flex-1 flex flex-col overflow-y-auto">
                {dietaAbilitata ? (
                  <>
                    {/* Stima TDEE da anamnesi + peso */}
                    {(() => {
                      const ultimoPeso = clienteSelezionato.misurazioni.at(-1)?.peso_kg ?? null
                      const tdee = anamnesICliente && ultimoPeso
                        ? stimaTDEE(anamnesICliente, ultimoPeso)
                        : null
                      if (!tdee) return null
                      return (
                        <div className="mx-5 mt-4 rounded-2xl p-4 space-y-3"
                          style={{ background: 'oklch(0.60 0.15 200 / 8%)', border: '1px solid oklch(0.60 0.15 200 / 25%)' }}>
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="text-xs font-bold uppercase tracking-wide" style={{ color: 'oklch(0.60 0.15 200)' }}>
                                📊 Stima TDEE da anamnesi
                              </p>
                              <p className="text-xs mt-0.5" style={{ color: 'oklch(0.50 0 0)' }}>
                                Basata su età, altezza, peso ({ultimoPeso} kg) e stile di vita dichiarato
                              </p>
                            </div>
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            {[
                              { label: 'Deficit', kcal: tdee - 300, desc: '−300 kcal', color: 'oklch(0.65 0.18 150)' },
                              { label: 'Mantenimento', kcal: tdee, desc: 'TDEE stimato', color: 'oklch(0.60 0.15 200)' },
                              { label: 'Surplus', kcal: tdee + 300, desc: '+300 kcal', color: 'oklch(0.70 0.19 46)' },
                            ].map(s => (
                              <div key={s.label} className="rounded-xl p-2.5 text-center"
                                style={{ background: 'oklch(0.18 0 0)' }}>
                                <p className="text-base font-black tabular-nums" style={{ color: s.color }}>{s.kcal}</p>
                                <p className="text-xs font-semibold mt-0.5" style={{ color: 'oklch(0.70 0 0)' }}>{s.label}</p>
                                <p className="text-xs" style={{ color: 'oklch(0.40 0 0)' }}>{s.desc}</p>
                              </div>
                            ))}
                          </div>
                          {/* Fattori anamnesi che influenzano la stima */}
                          {(() => {
                            const fattori: { label: string; tipo: 'warning' | 'info' | 'boost' }[] = []
                            const a = anamnesICliente
                            if (!a) return null

                            // Fattori che abbassano l'affidabilità o richiedono attenzione
                            if (a.ore_sonno && a.ore_sonno <= 5)
                              fattori.push({ label: `Sonno ridotto (${a.ore_sonno}h) — fame percepita più alta, il deficit sarà più difficile da mantenere`, tipo: 'warning' })

                            if (a.patologie && /tiroid/.test(a.patologie.toLowerCase()))
                              fattori.push({ label: 'Problemi tiroidei — il TDEE reale potrebbe essere inferiore alla stima', tipo: 'warning' })

                            if (a.patologie && /diabete/.test(a.patologie.toLowerCase()))
                              fattori.push({ label: 'Diabete — timing dei pasti più importante del semplice conteggio calorico', tipo: 'warning' })

                            if (a.farmaci_dettaglio && /cortisonico|cortisone|prednison/.test(a.farmaci_dettaglio.toLowerCase()))
                              fattori.push({ label: 'Corticosteroidi — tendenza alla ritenzione idrica e aumento appetito', tipo: 'warning' })

                            const car = (a.descrizione_caratteriale ?? '').toLowerCase()
                            if (/stress|ansios/.test(car))
                              fattori.push({ label: 'Profilo stressato — cortisolo cronico può ridurre efficacia del deficit, evitare tagli calorici aggressivi', tipo: 'warning' })

                            // Fattori positivi o neutrali
                            if (a.ore_piedi_giorno && a.ore_piedi_giorno >= 6)
                              fattori.push({ label: `Lavoro attivo (${a.ore_piedi_giorno}h in piedi) — TDEE aggiustato al rialzo`, tipo: 'boost' })

                            if (a.ore_seduto_giorno && a.ore_seduto_giorno >= 8)
                              fattori.push({ label: `Lavoro sedentario (${a.ore_seduto_giorno}h seduto) — TDEE aggiustato al ribasso`, tipo: 'info' })

                            if (a.intolleranze && !/^nessun/i.test(a.intolleranze))
                              fattori.push({ label: `Intolleranze: ${a.intolleranze} — da considerare nelle fonti di macro`, tipo: 'info' })

                            if (fattori.length === 0) return null

                            return (
                              <div className="space-y-1.5 pt-1">
                                <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'oklch(0.40 0 0)' }}>
                                  Fattori dall&apos;anamnesi
                                </p>
                                {fattori.map((f, i) => (
                                  <div key={i} className="flex items-start gap-2 px-2.5 py-2 rounded-lg text-xs"
                                    style={{
                                      background: f.tipo === 'warning' ? 'oklch(0.65 0.22 27 / 10%)' : f.tipo === 'boost' ? 'oklch(0.65 0.18 150 / 10%)' : 'oklch(0.22 0 0)',
                                      border: `1px solid ${f.tipo === 'warning' ? 'oklch(0.65 0.22 27 / 25%)' : f.tipo === 'boost' ? 'oklch(0.65 0.18 150 / 25%)' : 'oklch(1 0 0 / 6%)'}`,
                                      color: f.tipo === 'warning' ? 'oklch(0.80 0.12 46)' : f.tipo === 'boost' ? 'oklch(0.65 0.18 150)' : 'oklch(0.60 0 0)',
                                    }}>
                                    <span className="flex-shrink-0">{f.tipo === 'warning' ? '⚠️' : f.tipo === 'boost' ? '↑' : 'ℹ️'}</span>
                                    {f.label}
                                  </div>
                                ))}
                              </div>
                            )
                          })()}
                          <p className="text-xs" style={{ color: 'oklch(0.38 0 0)' }}>
                            ⚠️ Stima indicativa (formula Mifflin-St Jeor{anamnesICliente?.sesso ? `, ${anamnesICliente.sesso === 'M' ? 'uomo' : 'donna'}` : ', sesso non specificato'}). Usa come punto di partenza, aggiusta in base ai check-in.
                          </p>
                        </div>
                      )
                    })()}
                    <MacroTargetForm clienteId={clienteSelezionato!.id} />
                    <CarbCyclingForm clienteId={clienteSelezionato!.id} />
                    {storicoNutrizioneCliente.length > 0 && (
                      <div className="px-5 pb-5 space-y-3">
                        <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'oklch(0.40 0 0)' }}>
                          Ultimi 7 giorni
                        </p>
                        {storicoNutrizioneCliente.map(g => {
                          const label = new Date(g.data + 'T00:00:00').toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' })
                          const ok = macroTargetCliente ? g.calorie >= macroTargetCliente.calorie * 0.85 && g.calorie <= macroTargetCliente.calorie * 1.15 : null
                          return (
                            <div key={g.data} className="rounded-2xl p-4 space-y-2"
                              style={{ background: 'oklch(0.18 0 0)', border: '1px solid oklch(1 0 0 / 6%)' }}>
                              <div className="flex items-center justify-between">
                                <p className="text-sm font-bold capitalize" style={{ color: 'oklch(0.85 0 0)' }}>{label}</p>
                                <div className="flex items-center gap-2">
                                  {ok !== null && (
                                    <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
                                      style={{
                                        background: ok ? 'oklch(0.65 0.18 150 / 15%)' : 'oklch(0.75 0.15 27 / 15%)',
                                        color: ok ? 'oklch(0.65 0.18 150)' : 'oklch(0.75 0.15 27)',
                                      }}>
                                      {ok ? 'In target' : 'Fuori target'}
                                    </span>
                                  )}
                                  <p className="text-sm font-black tabular-nums" style={{ color: 'oklch(0.70 0.19 46)' }}>
                                    {Math.round(g.calorie)} kcal
                                  </p>
                                </div>
                              </div>
                              {macroTargetCliente && (
                                <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'oklch(0.25 0 0)' }}>
                                  <div className="h-full rounded-full"
                                    style={{ width: `${Math.min(100, macroTargetCliente.calorie > 0 ? Math.round((g.calorie / macroTargetCliente.calorie) * 100) : 0)}%`, background: 'oklch(0.70 0.19 46)' }} />
                                </div>
                              )}
                              <div className="grid grid-cols-3 gap-2">
                                {[
                                  { label: 'Prot', val: g.proteine_g, tgt: macroTargetCliente?.proteine_g, color: 'oklch(0.60 0.15 200)' },
                                  { label: 'Carb', val: g.carboidrati_g, tgt: macroTargetCliente?.carboidrati_g, color: 'oklch(0.70 0.19 46)' },
                                  { label: 'Grassi', val: g.grassi_g, tgt: macroTargetCliente?.grassi_g, color: 'oklch(0.65 0.18 150)' },
                                ].map(m => (
                                  <div key={m.label} className="rounded-xl p-2" style={{ background: 'oklch(0.22 0 0)' }}>
                                    <p className="text-xs font-bold tabular-nums" style={{ color: m.color }}>{Math.round(m.val)}g</p>
                                    <p className="text-xs" style={{ color: 'oklch(0.40 0 0)' }}>{m.label}{m.tgt ? ` / ${m.tgt}g` : ''}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                    {storicoNutrizioneCliente.length === 0 && (
                      <div className="px-5 pb-5 rounded-2xl py-8 text-center">
                        <p className="text-sm" style={{ color: 'oklch(0.45 0 0)' }}>Nessun dato nutrizionale negli ultimi 7 giorni</p>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center gap-3 px-8 text-center">
                    <p className="text-3xl">🥗</p>
                    <p className="text-sm font-semibold" style={{ color: 'oklch(0.60 0 0)' }}>
                      Abilita il piano dieta per impostare i macro di questo cliente
                    </p>
                  </div>
                )}
              </div>
            ) : (
            <div className="flex-1 p-5 space-y-4">
              {loadingSessioni ? (
                <BynariLoader file="blue" size={80} />
              ) : (
                <>
                {/* Stats rapide */}
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: 'Sessioni', value: clienteSelezionato?.totale_sessioni ?? 0, color: 'oklch(0.60 0.15 200)' },
                    { label: 'Completate', value: loadingSessioni ? '...' : sessioniDettaglio.filter(s => s.completata).length, color: 'oklch(0.65 0.18 150)' },
                    { label: 'Schede attive', value: clienteSelezionato?.schede_attive ?? 0, color: 'oklch(0.70 0.19 46)' },
                  ].map(s => (
                    <div key={s.label} className="rounded-2xl p-3 text-center"
                      style={{ background: 'oklch(0.18 0 0)', border: '1px solid oklch(1 0 0 / 6%)' }}>
                      <p className="text-2xl font-black" style={{ color: s.color }}>{s.value}</p>
                      <p className="text-xs mt-0.5" style={{ color: 'oklch(0.45 0 0)' }}>{s.label}</p>
                    </div>
                  ))}
                </div>

                {/* Schede assegnate */}
                <div className="rounded-2xl overflow-hidden"
                  style={{ background: 'oklch(0.18 0 0)', border: '1px solid oklch(1 0 0 / 6%)' }}>
                  <div className="px-4 py-3 flex items-center justify-between"
                    style={{ borderBottom: '1px solid oklch(1 0 0 / 6%)' }}>
                    <p className="font-bold text-sm" style={{ color: 'oklch(0.97 0 0)' }}>📋 Schede assegnate</p>
                    <button onClick={apriAssegnaFlow}
                      className="text-xs font-bold px-3 py-1.5 rounded-lg"
                      style={{ background: 'oklch(0.70 0.19 46 / 15%)', color: 'oklch(0.70 0.19 46)' }}>
                      + Assegna
                    </button>
                  </div>
                  {assegnazioniCliente.length === 0 ? (
                    <p className="px-4 py-3 text-sm" style={{ color: 'oklch(0.45 0 0)' }}>Nessuna scheda assegnata</p>
                  ) : assegnazioniCliente.map((a: any, i: number) => (
                    <div key={a.id} className="flex items-center gap-3 px-4 py-3"
                      style={{ borderBottom: i < assegnazioniCliente.length - 1 ? '1px solid oklch(1 0 0 / 4%)' : 'none' }}>
                      <span className="text-xs px-2 py-0.5 rounded-full"
                        style={{
                          background: a.attiva ? 'oklch(0.65 0.18 150 / 15%)' : 'oklch(0.22 0 0)',
                          color: a.attiva ? 'oklch(0.65 0.18 150)' : 'oklch(0.45 0 0)',
                        }}>
                        {a.attiva ? 'Attiva' : 'Inattiva'}
                      </span>
                      <p className="text-sm flex-1" style={{ color: 'oklch(0.85 0 0)' }}>{a.schede?.nome ?? '—'}</p>
                      <p className="text-xs" style={{ color: 'oklch(0.40 0 0)' }}>
                        dal {new Date(a.data_inizio).toLocaleDateString('it-IT')}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Ultimo check-in */}
                {clienteSelezionato?.ultimo_checkin && (
                  <div className="rounded-2xl overflow-hidden"
                    style={{ background: 'oklch(0.18 0 0)', border: '1px solid oklch(1 0 0 / 6%)' }}>
                    <div className="px-4 py-3 flex items-center justify-between"
                      style={{ borderBottom: '1px solid oklch(1 0 0 / 6%)' }}>
                      <p className="font-bold text-sm" style={{ color: 'oklch(0.97 0 0)' }}>❤️ Ultimo check-in</p>
                      <p className="text-xs" style={{ color: 'oklch(0.45 0 0)' }}>
                        {new Date(clienteSelezionato.ultimo_checkin.data).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })}
                      </p>
                    </div>
                    <div className="grid grid-cols-4">
                      {[
                        { label: 'Energia', value: clienteSelezionato.ultimo_checkin.energia, warn: clienteSelezionato.ultimo_checkin.energia <= 2 },
                        { label: 'Sonno', value: clienteSelezionato.ultimo_checkin.sonno, warn: clienteSelezionato.ultimo_checkin.sonno <= 2 },
                        { label: 'Stress', value: clienteSelezionato.ultimo_checkin.stress, warn: clienteSelezionato.ultimo_checkin.stress >= 4 },
                        { label: 'Motiv.', value: clienteSelezionato.ultimo_checkin.motivazione, warn: clienteSelezionato.ultimo_checkin.motivazione <= 2 },
                      ].map((item, i) => (
                        <div key={item.label} className="p-3 text-center"
                          style={{ borderRight: i < 3 ? '1px solid oklch(1 0 0 / 6%)' : 'none' }}>
                          <p className="text-xl font-black"
                            style={{ color: item.warn ? 'oklch(0.75 0.15 27)' : 'oklch(0.97 0 0)' }}>
                            {item.value}/5
                          </p>
                          <p className="text-xs mt-0.5" style={{ color: 'oklch(0.45 0 0)' }}>{item.label}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Peso */}
                {clienteSelezionato && clienteSelezionato.misurazioni.length > 0 && (() => {
                  const ultimo = clienteSelezionato.misurazioni.at(-1)
                  const penultimo = clienteSelezionato.misurazioni.at(-2)
                  const delta = ultimo && penultimo
                    ? Math.round((ultimo.peso_kg - penultimo.peso_kg) * 10) / 10
                    : null
                  return (
                    <div className="rounded-2xl px-4 py-3 flex items-center justify-between"
                      style={{ background: 'oklch(0.18 0 0)', border: '1px solid oklch(1 0 0 / 6%)' }}>
                      <div className="flex items-center gap-2">
                        <span>⚖️</span>
                        <div>
                          <p className="text-xs font-semibold" style={{ color: 'oklch(0.50 0 0)' }}>Peso corporeo</p>
                          <p className="text-xs" style={{ color: 'oklch(0.40 0 0)' }}>{ultimo?.data}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-black" style={{ color: 'oklch(0.97 0 0)' }}>
                          {ultimo?.peso_kg} kg
                        </p>
                        {delta !== null && (
                          <p className="text-xs" style={{ color: delta > 0 ? 'oklch(0.60 0.15 200)' : delta < 0 ? 'oklch(0.65 0.18 150)' : 'oklch(0.50 0 0)' }}>
                            {delta > 0 ? '+' : ''}{delta} kg
                          </p>
                        )}
                      </div>
                    </div>
                  )
                })()}

                {/* Sessioni — ultime 4, non espandibili */}
                <div className="rounded-2xl overflow-hidden"
                  style={{ background: 'oklch(0.18 0 0)', border: '1px solid oklch(1 0 0 / 6%)' }}>
                  <div className="px-4 py-3" style={{ borderBottom: '1px solid oklch(1 0 0 / 6%)' }}>
                    <p className="font-bold text-sm" style={{ color: 'oklch(0.97 0 0)' }}>🏋️ Ultime sessioni</p>
                  </div>
                  {sessioniDettaglio.length === 0 ? (
                    <p className="px-4 py-6 text-sm text-center" style={{ color: 'oklch(0.45 0 0)' }}>Nessuna sessione ancora</p>
                  ) : sessioniDettaglio.slice(0, 4).map((sessione, i) => {
                    const serieCompletate = sessione.log_serie.filter(s => s.completata).length
                    const serieTotali = sessione.log_serie.length
                    const volumeTotale = sessione.log_serie
                      .filter(s => s.completata)
                      .reduce((acc, s) => acc + ((s.peso_kg ?? 0) * (s.ripetizioni ?? 0)), 0)
                    return (
                      <div key={sessione.id} className="flex items-center gap-3 px-4 py-3"
                        style={{ borderBottom: i < Math.min(sessioniDettaglio.length, 4) - 1 ? '1px solid oklch(1 0 0 / 4%)' : 'none' }}>
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{
                            background: sessione.completata ? 'oklch(0.65 0.18 150 / 15%)' : 'oklch(0.75 0.15 27 / 15%)',
                            color: sessione.completata ? 'oklch(0.65 0.18 150)' : 'oklch(0.75 0.15 27)',
                          }}>
                          <FontAwesomeIcon icon={sessione.completata ? faCircleCheck : faDumbbell} className="text-xs" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-sm truncate" style={{ color: 'oklch(0.97 0 0)' }}>
                            {(sessione as any).scheda_giorni?.nome ?? 'Allenamento'}
                          </p>
                          <p className="text-xs" style={{ color: 'oklch(0.50 0 0)' }}>
                            {new Date(sessione.data).toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' })}
                            {formatDurata(sessione.durata_secondi) && ` · ${formatDurata(sessione.durata_secondi)}`}
                          </p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-xs font-bold" style={{ color: 'oklch(0.97 0 0)' }}>
                            {serieCompletate}/{serieTotali} serie
                          </p>
                          {volumeTotale > 0 && (
                            <p className="text-xs" style={{ color: 'oklch(0.50 0 0)' }}>
                              {Math.round(volumeTotale).toLocaleString('it-IT')} kg
                            </p>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Note esercizi */}
                {noteEsercizioCliente.length > 0 && (
                  <div className="rounded-2xl overflow-hidden"
                    style={{ background: 'oklch(0.18 0 0)', border: '1px solid oklch(0.70 0.19 46 / 20%)' }}>
                    <div className="px-4 py-3" style={{ borderBottom: '1px solid oklch(1 0 0 / 6%)' }}>
                      <p className="font-bold text-sm" style={{ color: 'oklch(0.97 0 0)' }}>📝 Note esercizi</p>
                    </div>
                    {noteEsercizioCliente.map((n: any, i: number) => {
                      const nomeEse = (n.scheda_esercizi as any)?.esercizi?.nome ?? '—'
                      const dataSessione = (n.sessioni as any)?.data
                      return (
                        <Link key={n.id}
                          href={`/cliente/allenamento?sessione=${n.sessioni?.id ?? ''}`}
                          className="flex items-start gap-3 px-4 py-3 transition-all hover:bg-white/3"
                          style={{ borderBottom: i < noteEsercizioCliente.length - 1 ? '1px solid oklch(1 0 0 / 4%)' : 'none', textDecoration: 'none' }}>
                          <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                            style={{ background: 'oklch(0.70 0.19 46 / 12%)', color: 'oklch(0.70 0.19 46)', fontSize: 11 }}>
                            📝
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold truncate" style={{ color: 'oklch(0.90 0 0)' }}>{nomeEse}</p>
                            <p className="text-xs mt-0.5 leading-snug" style={{ color: 'oklch(0.62 0 0)', whiteSpace: 'pre-line' }}>
                              {n.testo.length > 80 ? n.testo.slice(0, 80) + '…' : n.testo}
                            </p>
                            {dataSessione && (
                              <p className="text-xs mt-1" style={{ color: 'oklch(0.40 0 0)' }}>
                                {new Date(dataSessione).toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' })}
                              </p>
                            )}
                          </div>
                          <span style={{ color: 'oklch(0.70 0.19 46)', fontSize: 11, flexShrink: 0, marginTop: 4 }}>→</span>
                        </Link>
                      )
                    })}
                  </div>
                )}

                {/* Pulsante analytics avanzate */}
                <Link
                  href={`/coach/clienti/${clienteSelezionato.id}/analytics`}
                  className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-black text-sm transition-all active:scale-95"
                  style={{ background: 'oklch(0.70 0.19 46)', color: 'oklch(0.13 0 0)', boxShadow: '0 10px 30px -10px oklch(0.70 0.19 46 / 0.3)' }}
                >
                  <FontAwesomeIcon icon={faArrowTrendUp} />
                  ANALYTICS AVANZATE →
                </Link>
                <Link
                  href={`/coach/clienti/${clienteSelezionato.id}/checkin`}
                  className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-bold text-sm transition-all active:scale-95"
                  style={{ background: 'oklch(0.60 0.15 200 / 15%)', color: 'oklch(0.60 0.15 200)', border: '1px solid oklch(0.60 0.15 200 / 25%)' }}
                >
                  <FontAwesomeIcon icon={faCalendarDays} />
                  GESTIONE CHECK-IN →
                </Link>
                </>
              )}
            </div>
            )}
          </div>
        </div>
      )}
    </div>

    {/* MODALE ASSEGNA — step pick */}
    {assegnaFlow === 'pick' && (
      <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-4"
        style={{ background: 'oklch(0 0 0 / 70%)' }}
        onClick={resetAssegnaFlow}>
        <div className="w-full max-w-md rounded-3xl overflow-hidden"
          style={{ background: 'oklch(0.16 0 0)', border: '1px solid oklch(1 0 0 / 10%)' }}
          onClick={e => e.stopPropagation()}>
          <div className="px-5 py-4 flex items-center justify-between"
            style={{ borderBottom: '1px solid oklch(1 0 0 / 8%)' }}>
            <p className="font-black text-base" style={{ color: 'oklch(0.97 0 0)' }}>Scegli una scheda</p>
            <button onClick={resetAssegnaFlow}
              className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{ background: 'oklch(0.25 0 0)', color: 'oklch(0.55 0 0)' }}>
              <FontAwesomeIcon icon={faXmark} className="text-xs" />
            </button>
          </div>
          <div className="max-h-80 overflow-y-auto">
            {schedeCoach.length === 0 ? (
              <p className="px-5 py-8 text-sm text-center" style={{ color: 'oklch(0.45 0 0)' }}>Nessuna scheda disponibile</p>
            ) : schedeCoach.map((s, i) => (
              <div key={s.id} className="flex items-center"
                style={{ borderBottom: i < schedeCoach.length - 1 ? '1px solid oklch(1 0 0 / 6%)' : 'none' }}>
                <button onClick={() => { setSchedaPickata(s); setAssegnaFlow('confirm') }}
                  className="flex-1 text-left px-5 py-3.5 transition-all hover:opacity-80">
                  <p className="text-sm font-semibold" style={{ color: 'oklch(0.90 0 0)' }}>{s.nome}</p>
                </button>
                <button onClick={e => { e.stopPropagation(); setSchedaPreview(s) }}
                  className="w-10 h-10 flex items-center justify-center mr-3 rounded-xl flex-shrink-0"
                  style={{ background: 'oklch(0.60 0.15 200 / 12%)', color: 'oklch(0.60 0.15 200)' }}
                  title="Anteprima scheda">
                  <FontAwesomeIcon icon={faEye} className="text-sm" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    )}

    {/* MODALE ASSEGNA — step confirm */}
    {assegnaFlow === 'confirm' && schedaPickata && (
      <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-4"
        style={{ background: 'oklch(0 0 0 / 70%)' }}
        onClick={resetAssegnaFlow}>
        <div className="w-full max-w-md rounded-3xl overflow-hidden"
          style={{ background: 'oklch(0.16 0 0)', border: '1px solid oklch(1 0 0 / 10%)' }}
          onClick={e => e.stopPropagation()}>
          <div className="px-5 py-4 flex items-center justify-between"
            style={{ borderBottom: '1px solid oklch(1 0 0 / 8%)' }}>
            <p className="font-black text-base" style={{ color: 'oklch(0.97 0 0)' }}>Assegna scheda</p>
            <button onClick={() => setAssegnaFlow('pick')}
              className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{ background: 'oklch(0.25 0 0)', color: 'oklch(0.55 0 0)' }}>
              <FontAwesomeIcon icon={faXmark} className="text-xs" />
            </button>
          </div>
          <div className="p-5 space-y-4">
            <div className="rounded-2xl px-4 py-3"
              style={{ background: 'oklch(0.22 0 0)' }}>
              <p className="text-xs" style={{ color: 'oklch(0.50 0 0)' }}>Scheda selezionata</p>
              <p className="text-sm font-bold mt-0.5" style={{ color: 'oklch(0.97 0 0)' }}>{schedaPickata.nome}</p>
            </div>

            {/* Note anamnesi */}
            {anamnesICliente && (() => {
              const note = generateNoteAnamnesi(anamnesICliente)
              if (note.length === 0) return null
              return (
                <div className="rounded-2xl p-4 space-y-2"
                  style={{ background: 'oklch(0.75 0.18 80 / 8%)', border: '1px solid oklch(0.75 0.18 80 / 25%)' }}>
                  <p className="text-xs font-bold uppercase tracking-wide" style={{ color: 'oklch(0.75 0.18 80)' }}>
                    📋 Note dal profilo cliente
                  </p>
                  {note.map((n, i) => (
                    <p key={i} className="text-xs leading-relaxed" style={{ color: 'oklch(0.75 0 0)' }}>
                      {n.testo}
                    </p>
                  ))}
                </div>
              )
            })()}

            {/* Assegna direttamente */}
            <div className="rounded-2xl p-4 space-y-3"
              style={{ background: 'oklch(0.18 0 0)', border: '1px solid oklch(1 0 0 / 6%)' }}>
              <div>
                <p className="text-sm font-bold" style={{ color: 'oklch(0.97 0 0)' }}>Assegna direttamente</p>
                <p className="text-xs mt-1" style={{ color: 'oklch(0.45 0 0)' }}>
                  La scheda sarà assegnata così com'è. Per personalizzarla usa "Clona e personalizza".
                </p>
              </div>
              <button onClick={handleAssegnaDirectly} disabled={assegnando}
                className="w-full py-2.5 rounded-xl text-sm font-bold"
                style={{ background: 'oklch(0.70 0.19 46)', color: 'oklch(0.11 0 0)', opacity: assegnando ? 0.6 : 1 }}>
                {assegnando ? 'Assegnazione...' : '✓ Assegna'}
              </button>
            </div>

            {/* Clona e personalizza */}
            <div className="rounded-2xl p-4 space-y-3"
              style={{ background: 'oklch(0.18 0 0)', border: '1px solid oklch(0.60 0.15 200 / 30%)' }}>
              <div>
                <p className="text-sm font-bold" style={{ color: 'oklch(0.97 0 0)' }}>Clona e personalizza</p>
                <p className="text-xs mt-1" style={{ color: 'oklch(0.45 0 0)' }}>
                  Crea una copia della scheda e modificala prima di assegnarla. L'originale resterà intatta.
                </p>
              </div>
              <button onClick={handleCloneScheda} disabled={cloningScheda}
                className="w-full py-2.5 rounded-xl text-sm font-bold"
                style={{ background: 'oklch(0.60 0.15 200 / 15%)', color: 'oklch(0.60 0.15 200)', border: '1px solid oklch(0.60 0.15 200 / 30%)', opacity: cloningScheda ? 0.6 : 1 }}>
                {cloningScheda ? 'Clonazione...' : '✎ Clona e personalizza'}
              </button>
            </div>
          </div>
        </div>
      </div>
    )}

    {/* EDITOR scheda clonata */}
    {assegnaFlow === 'editor' && schedaClonata && (
      <div className="fixed inset-0 z-[60]">
        <SchedaEditorModal
          schedaId={schedaClonata.id}
          schedaNome={schedaClonata.nome}
          onClose={() => {
            // Mostra bottone assegna dopo editor
            setAssegnaFlow('post-editor' as any)
          }}
        />
        {/* Barra fissa in basso per assegnare */}
        <div className="fixed bottom-0 left-0 right-0 z-[70] p-4"
          style={{ background: 'oklch(0.13 0 0)', borderTop: '1px solid oklch(1 0 0 / 10%)', paddingBottom: 'calc(env(safe-area-inset-bottom) + 1rem)' }}>
          <div className="max-w-2xl mx-auto flex gap-3">
            <button onClick={resetAssegnaFlow}
              className="px-4 py-3 rounded-xl text-sm font-semibold"
              style={{ background: 'oklch(0.22 0 0)', color: 'oklch(0.55 0 0)' }}>
              Annulla
            </button>
            <button onClick={handleAssegnaDopoEditor} disabled={assegnando}
              className="flex-1 py-3 rounded-xl text-sm font-bold"
              style={{ background: 'oklch(0.70 0.19 46)', color: 'oklch(0.11 0 0)', opacity: assegnando ? 0.6 : 1 }}>
              {assegnando ? 'Assegnazione...' : `✓ Assegna "${schedaClonata.nome}"`}
            </button>
          </div>
        </div>
      </div>
    )}
    {/* PREVIEW scheda — read only */}
    {schedaPreview && (
      <div className="fixed inset-0 z-[70] flex justify-end"
        style={{ background: 'oklch(0 0 0 / 70%)' }}
        onClick={() => setSchedaPreview(null)}>
        <div className="w-full max-w-md h-full overflow-y-auto flex flex-col"
          style={{ background: 'oklch(0.13 0 0)', borderLeft: '1px solid oklch(1 0 0 / 8%)' }}
          onClick={e => e.stopPropagation()}>
          <div className="sticky top-0 z-10 flex items-center gap-3 px-5 py-4"
            style={{ background: 'oklch(0.13 0 0)', borderBottom: '1px solid oklch(1 0 0 / 8%)', paddingTop: 'calc(env(safe-area-inset-top) + 1rem)' }}>
            <button onClick={() => setSchedaPreview(null)}
              className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'oklch(0.22 0 0)', color: 'oklch(0.60 0 0)' }}>
              <FontAwesomeIcon icon={faXmark} />
            </button>
            <div>
              <p className="font-black text-base" style={{ color: 'oklch(0.97 0 0)' }}>{schedaPreview.nome}</p>
              <p className="text-xs" style={{ color: 'oklch(0.50 0 0)' }}>👁 Anteprima — sola lettura</p>
            </div>
          </div>
          <SchedaPreviewContent schedaId={schedaPreview.id} />
          <div className="p-4 flex-shrink-0" style={{ borderTop: '1px solid oklch(1 0 0 / 8%)' }}>
            <button onClick={() => { setSchedaPickata(schedaPreview); setSchedaPreview(null); setAssegnaFlow('confirm') }}
              className="w-full py-3 rounded-xl text-sm font-bold"
              style={{ background: 'oklch(0.70 0.19 46)', color: 'oklch(0.11 0 0)' }}>
              Seleziona questa scheda →
            </button>
          </div>
        </div>
      </div>
    )}

    {/* ANAMNESI DRAWER */}
    {showAnamnesIDrawer && clienteSelezionato && (
      <AnamnesIDrawer
        clienteId={clienteSelezionato.id}
        clienteNome={clienteSelezionato.full_name ?? 'Cliente'}
        onClose={() => setShowAnamnesIDrawer(false)}
      />
    )}

  </>
  )
}

