'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faUsers, faClipboardList, faCircleCheck, faDumbbell,
  faTriangleExclamation, faChartBar, faHeart, faComment,
  faFaceTired, faFaceFrown, faFaceMeh, faFaceSmile, faFaceGrinStars,
  faWeightScale, faArrowTrendUp, faArrowTrendDown, faMinus,
} from '@fortawesome/free-solid-svg-icons'
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

interface Misurazione {
  data: string
  peso_kg: number
}

interface ClienteStats {
  id: string
  full_name: string | null
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
  alert: string[]
}

type VistaTab = 'overview' | 'benessere' | 'peso' | 'attivita'

export default function AnalyticsPage() {
  const [clientiStats, setClientiStats] = useState<ClienteStats[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<VistaTab>('overview')
  const [totaleClienti, setTotaleClienti] = useState(0)
  const [totaleSchede, setTotaleSchede] = useState(0)
  const [totaleAssegnazioni, setTotaleAssegnazioni] = useState(0)
  const [totaleSessioni, setTotaleSessioni] = useState(0)

  const supabase = createClient()

  const fetchAnalytics = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // ── 1. Fetch base in parallelo ────────────────────────────────
    const [clientiRes, schedeRes, assegnazioniRes] = await Promise.all([
      supabase.from('coach_clienti')
        .select('cliente_id, profiles!coach_clienti_cliente_id_fkey (id, full_name)')
        .eq('coach_id', user.id),
      supabase.from('schede').select('id').eq('coach_id', user.id),
      supabase.from('assegnazioni').select('id').eq('coach_id', user.id).eq('attiva', true),
    ])

    const clientiData = clientiRes.data ?? []
    setTotaleClienti(clientiData.length)
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

    // Conta sessioni totali per il badge
    const sessioniPerCliente = new Map<string, typeof tutteSessioni>()
    for (const s of tutteSessioni) {
      if (!sessioniPerCliente.has(s.cliente_id)) sessioniPerCliente.set(s.cliente_id, [])
      sessioniPerCliente.get(s.cliente_id)!.push(s)
    }
    setTotaleSessioni(tutteSessioni.length)

    // Ultimo checkin per cliente
    const ultimoCheckinPerCliente = new Map<string, any>()
    for (const c of tuttiCheckin) {
      if (!ultimoCheckinPerCliente.has(c.cliente_id)) ultimoCheckinPerCliente.set(c.cliente_id, c)
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

      const alert: string[] = []
      if (giorniInattivo !== null && giorniInattivo > 10 && sessioni.length > 0)
        alert.push(`Inattivo da ${giorniInattivo} giorni`)
      if (sessioni.length === 0) alert.push('Non si è mai allenato')
      if (ultimoCheckin) {
        if (ultimoCheckin.stress >= 4) alert.push('Stress elevato')
        if (ultimoCheckin.energia <= 2) alert.push('Energia bassa')
        if (ultimoCheckin.motivazione <= 2) alert.push('Motivazione bassa')
        if (ultimoCheckin.sonno <= 2) alert.push('Sonno scarso')
        const giorniSenzaCheckin = Math.floor((Date.now() - new Date(ultimoCheckin.data).getTime()) / (1000 * 60 * 60 * 24))
        if (giorniSenzaCheckin > 7) alert.push('Nessun check-in da 7+ giorni')
      } else {
        alert.push('Nessun check-in ancora')
      }

      stats.push({
        id: clienteId,
        full_name: profile?.full_name,
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

  const getStatoCliente = (giorni: number | null, sessioni: number) => {
    if (sessioni === 0) return { label: 'Mai allenato', color: 'oklch(0.55 0 0)', bg: 'oklch(0.25 0 0)' }
    if (giorni === null) return { label: 'Nessuna sessione', color: 'oklch(0.55 0 0)', bg: 'oklch(0.25 0 0)' }
    if (giorni <= 3) return { label: 'Attivo', color: 'oklch(0.65 0.18 150)', bg: 'oklch(0.65 0.18 150 / 15%)' }
    if (giorni <= 7) return { label: 'Regolare', color: 'oklch(0.70 0.19 46)', bg: 'oklch(0.70 0.19 46 / 15%)' }
    if (giorni <= 14) return { label: 'In calo', color: 'oklch(0.75 0.18 80)', bg: 'oklch(0.75 0.18 80 / 15%)' }
    return { label: 'A rischio', color: 'oklch(0.75 0.15 27)', bg: 'oklch(0.65 0.22 27 / 15%)' }
  }

  const getBenessereScore = (checkin: ClienteStats['ultimo_checkin']) => {
    if (!checkin) return null
    // Media pesata: stress è negativo
    const score = (checkin.energia + checkin.sonno + (6 - checkin.stress) + checkin.motivazione) / 4
    return Math.round(score * 10) / 10
  }

  const getBenessereColore = (score: number | null) => {
    if (score === null) return { color: 'oklch(0.45 0 0)', bg: 'oklch(0.22 0 0)', label: 'N/D' }
    if (score >= 3.5) return { color: 'oklch(0.65 0.18 150)', bg: 'oklch(0.65 0.18 150 / 15%)', label: 'Ottimo' }
    if (score >= 2.5) return { color: 'oklch(0.70 0.19 46)', bg: 'oklch(0.70 0.19 46 / 15%)', label: 'Discreto' }
    return { color: 'oklch(0.75 0.15 27)', bg: 'oklch(0.65 0.22 27 / 15%)', label: 'Attenzione' }
  }

  const EMOJI: (IconDefinition | null)[] = [null, faFaceTired, faFaceFrown, faFaceMeh, faFaceSmile, faFaceGrinStars]

  const clientiConAlert = clientiStats.filter(c => c.alert.length > 0)
  const clientiAttivi = clientiStats.filter(c => c.giorni_inattivo !== null && c.giorni_inattivo <= 7).length

  const overviewStats = [
    { label: 'Clienti totali', value: totaleClienti, icon: faUsers, color: 'oklch(0.60 0.15 200)' },
    { label: 'Schede create', value: totaleSchede, icon: faClipboardList, color: 'oklch(0.70 0.19 46)' },
    { label: 'Assegnazioni attive', value: totaleAssegnazioni, icon: faCircleCheck, color: 'oklch(0.65 0.18 150)' },
    { label: 'Sessioni totali', value: totaleSessioni, icon: faDumbbell, color: 'oklch(0.65 0.15 300)' },
  ]

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div>
        <h1 className="text-3xl lg:text-4xl font-black tracking-tight" style={{ color: 'oklch(0.97 0 0)' }}>
          Analytics
        </h1>
        <p className="mt-1 text-sm" style={{ color: 'oklch(0.50 0 0)' }}>
          Panoramica completa dei tuoi clienti
        </p>
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

      {/* Tabs */}
      <div className="flex gap-2 p-1 rounded-2xl" style={{ background: 'oklch(0.18 0 0)' }}>
        {[
          { id: 'overview' as VistaTab, label: 'Attività', icon: faChartBar },
          { id: 'benessere' as VistaTab, label: 'Benessere', icon: faHeart },
          { id: 'peso' as VistaTab, label: 'Peso', icon: faWeightScale },
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

              {clientiStats.map((c, i) => {
                const stato = getStatoCliente(c.giorni_inattivo, c.totale_sessioni)
                return (
                  <div key={c.id}
                    className="px-5 py-4 lg:grid lg:grid-cols-12 lg:gap-2 lg:items-center flex flex-col gap-2"
                    style={{ borderBottom: i < clientiStats.length - 1 ? '1px solid oklch(1 0 0 / 4%)' : 'none' }}>
                    {/* Cliente */}
                    <div className="lg:col-span-4 flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                        style={{ background: 'oklch(0.70 0.19 46 / 15%)', color: 'oklch(0.70 0.19 46)' }}>
                        {c.full_name?.charAt(0).toUpperCase()}
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
          )}

          {/* TAB: BENESSERE */}
          {tab === 'benessere' && (
            <div className="space-y-4">
              <p className="text-sm" style={{ color: 'oklch(0.50 0 0)' }}>
                Basato sull'ultimo check-in di ogni cliente
              </p>
              {clientiStats.map((c) => {
                const score = getBenessereScore(c.ultimo_checkin)
                const benessere = getBenessereColore(score)
                const gg = c.ultimo_checkin
                  ? Math.floor((Date.now() - new Date(c.ultimo_checkin.data).getTime()) / (1000 * 60 * 60 * 24))
                  : null

                return (
                  <div key={c.id} className="rounded-2xl p-5 space-y-4"
                    style={{ background: 'oklch(0.18 0 0)', border: `1px solid ${c.alert.length > 0 ? 'oklch(0.65 0.22 27 / 25%)' : 'oklch(1 0 0 / 6%)'}` }}>
                    {/* Header cliente */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold"
                          style={{ background: 'oklch(0.70 0.19 46 / 15%)', color: 'oklch(0.70 0.19 46)' }}>
                          {c.full_name?.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold" style={{ color: 'oklch(0.97 0 0)' }}>{c.full_name}</p>
                          <p className="text-xs" style={{ color: 'oklch(0.45 0 0)' }}>
                            {gg === null ? 'Nessun check-in' : gg === 0 ? 'Check-in oggi' : `Check-in ${gg}gg fa`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {score !== null && (
                          <span className="text-xs font-bold px-3 py-1.5 rounded-full"
                            style={{ background: benessere.bg, color: benessere.color }}>
                            {benessere.label} ({score}/5)
                          </span>
                        )}
                        {!c.ultimo_checkin && (
                          <span className="text-xs px-3 py-1.5 rounded-full"
                            style={{ background: 'oklch(0.22 0 0)', color: 'oklch(0.45 0 0)' }}>
                            Nessun dato
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Dettaglio check-in */}
                    {c.ultimo_checkin && (
                      <div className="grid grid-cols-4 gap-3">
                        {[
                          { label: 'Energia', value: c.ultimo_checkin.energia, warn: c.ultimo_checkin.energia <= 2 },
                          { label: 'Sonno', value: c.ultimo_checkin.sonno, warn: c.ultimo_checkin.sonno <= 2 },
                          { label: 'Stress', value: c.ultimo_checkin.stress, warn: c.ultimo_checkin.stress >= 4 },
                          { label: 'Motivazione', value: c.ultimo_checkin.motivazione, warn: c.ultimo_checkin.motivazione <= 2 },
                        ].map(item => (
                          <div key={item.label} className="rounded-xl p-3 text-center"
                            style={{
                              background: item.warn ? 'oklch(0.65 0.22 27 / 10%)' : 'oklch(0.22 0 0)',
                              border: item.warn ? '1px solid oklch(0.65 0.22 27 / 30%)' : '1px solid transparent',
                            }}>
                            <p className="text-xs mb-1" style={{ color: item.warn ? 'oklch(0.75 0.15 27)' : 'oklch(0.50 0 0)' }}>
                              {item.label}
                            </p>
                            <p className="text-2xl">{EMOJI[item.value] && <FontAwesomeIcon icon={EMOJI[item.value]!} />}</p>
                            <p className="text-xs font-bold mt-1" style={{ color: item.warn ? 'oklch(0.75 0.15 27)' : 'oklch(0.97 0 0)' }}>
                              {item.value}/5 {item.warn && <FontAwesomeIcon icon={faTriangleExclamation} />}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Note check-in */}
                    {c.ultimo_checkin?.note && (
                      <div className="px-4 py-3 rounded-xl"
                        style={{ background: 'oklch(0.22 0 0)' }}>
                        <p className="text-xs italic" style={{ color: 'oklch(0.60 0 0)' }}>
                          <FontAwesomeIcon icon={faComment} /> "{c.ultimo_checkin.note}"
                        </p>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* TAB: PESO */}
          {tab === 'peso' && (
            <div className="space-y-4">
              <p className="text-sm" style={{ color: 'oklch(0.50 0 0)' }}>
                Andamento del peso corporeo registrato dai clienti
              </p>
              {clientiStats.map((c) => {
                const ultime = c.misurazioni
                const ultimoPeso = ultime.length > 0 ? ultime[ultime.length - 1].peso_kg : null
                const penultimoPeso = ultime.length > 1 ? ultime[ultime.length - 2].peso_kg : null
                const delta = ultimoPeso !== null && penultimoPeso !== null
                  ? Math.round((ultimoPeso - penultimoPeso) * 10) / 10
                  : null

                return (
                  <div key={c.id} className="rounded-2xl p-5 space-y-4"
                    style={{ background: 'oklch(0.18 0 0)', border: '1px solid oklch(1 0 0 / 6%)' }}>
                    {/* Header cliente */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold"
                          style={{ background: 'oklch(0.70 0.19 46 / 15%)', color: 'oklch(0.70 0.19 46)' }}>
                          {c.full_name?.charAt(0).toUpperCase()}
                        </div>
                        <p className="font-semibold" style={{ color: 'oklch(0.97 0 0)' }}>{c.full_name}</p>
                      </div>
                      {ultimoPeso !== null ? (
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <p className="text-xl font-black" style={{ color: 'oklch(0.97 0 0)' }}>
                              {ultimoPeso} <span className="text-sm font-normal" style={{ color: 'oklch(0.50 0 0)' }}>kg</span>
                            </p>
                            <p className="text-xs" style={{ color: 'oklch(0.45 0 0)' }}>
                              {ultime[ultime.length - 1].data}
                            </p>
                          </div>
                          {delta !== null && (
                            <span className="flex items-center gap-1 text-sm font-bold px-3 py-1.5 rounded-full"
                              style={{
                                background: delta === 0
                                  ? 'oklch(0.22 0 0)'
                                  : delta > 0
                                    ? 'oklch(0.60 0.15 200 / 15%)'
                                    : 'oklch(0.65 0.18 150 / 15%)',
                                color: delta === 0
                                  ? 'oklch(0.50 0 0)'
                                  : delta > 0
                                    ? 'oklch(0.60 0.15 200)'
                                    : 'oklch(0.65 0.18 150)',
                              }}>
                              <FontAwesomeIcon icon={delta > 0 ? faArrowTrendUp : delta < 0 ? faArrowTrendDown : faMinus} />
                              {delta > 0 ? `+${delta}` : delta} kg
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs px-3 py-1.5 rounded-full"
                          style={{ background: 'oklch(0.22 0 0)', color: 'oklch(0.45 0 0)' }}>
                          Nessun dato
                        </span>
                      )}
                    </div>

                    {/* Grafico */}
                    {ultime.length >= 2 ? (
                      <div style={{ height: 120 }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={ultime} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
                            <XAxis dataKey="data" tick={{ fontSize: 10, fill: 'oklch(0.45 0 0)' }} tickLine={false} axisLine={false} />
                            <YAxis tick={{ fontSize: 10, fill: 'oklch(0.45 0 0)' }} tickLine={false} axisLine={false}
                              domain={['auto', 'auto']} />
                            <Tooltip
                              contentStyle={{ background: 'oklch(0.22 0 0)', border: '1px solid oklch(1 0 0 / 10%)', borderRadius: 8, fontSize: 12 }}
                              labelStyle={{ color: 'oklch(0.70 0 0)' }}
                              itemStyle={{ color: 'oklch(0.70 0.19 46)' }}
                              formatter={(v: any) => [`${v} kg`, 'Peso']}
                            />
                            <Line type="monotone" dataKey="peso_kg" stroke="oklch(0.70 0.19 46)"
                              strokeWidth={2} dot={{ r: 3, fill: 'oklch(0.70 0.19 46)', strokeWidth: 0 }}
                              activeDot={{ r: 5 }} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    ) : ultime.length === 1 ? (
                      <p className="text-xs" style={{ color: 'oklch(0.45 0 0)' }}>
                        Solo una misurazione — il grafico apparirà dalla seconda registrazione
                      </p>
                    ) : null}
                  </div>
                )
              })}
            </div>
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
                        <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                          style={{ background: 'oklch(0.65 0.22 27 / 20%)', color: 'oklch(0.75 0.15 27)' }}>
                          {c.full_name?.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold" style={{ color: 'oklch(0.97 0 0)' }}>{c.full_name}</p>
                          <p className="text-xs" style={{ color: 'oklch(0.45 0 0)' }}>
                            {c.totale_sessioni} sessioni totali
                            {c.ultima_sessione && ` · ultima ${c.giorni_inattivo === 0 ? 'oggi' : c.giorni_inattivo === 1 ? 'ieri' : `${c.giorni_inattivo}gg fa`}`}
                          </p>
                        </div>
                      </div>

                      {/* Alert list */}
                      <div className="flex flex-wrap gap-2">
                        {c.alert.map((alert, i) => (
                          <span key={i} className="text-xs px-3 py-1.5 rounded-full font-medium"
                            style={{ background: 'oklch(0.65 0.22 27 / 15%)', color: 'oklch(0.85 0.10 46)' }}>
                            <FontAwesomeIcon icon={faTriangleExclamation} /> {alert}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
