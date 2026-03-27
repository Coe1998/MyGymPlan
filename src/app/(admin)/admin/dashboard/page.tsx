'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface CoachRow {
  id: string
  full_name: string | null
  email: string | null
  coach_status: string | null
  created_at: string
  clienti_count: number
  schede_count: number
  sessioni_count: number
  ultima_attivita: string | null
}

interface Stats {
  totale_coach: number
  coach_pending: number
  coach_approvati: number
  totale_clienti: number
  totale_atleti: number
  totale_sessioni: number
  totale_schede: number
  nuovi_oggi: number
}

interface EventoRecente {
  tipo: 'registrazione' | 'sessione' | 'scheda'
  descrizione: string
  data: string
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [coach, setCoach] = useState<CoachRow[]>([])
  const [eventiRecenti, setEventiRecenti] = useState<EventoRecente[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'overview' | 'coach' | 'attivita'>('overview')
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [filtroCoach, setFiltroCoach] = useState<'tutti' | 'pending' | 'approvati'>('tutti')

  const supabase = createClient()

  const fetchAll = async () => {
    setLoading(true)

    const [
      profilesRes,
      sessioniRes,
      schedeRes,
      eventiRegRes,
      eventiSessRes,
      eventiSchedeRes,
    ] = await Promise.all([
      supabase.from('profiles').select('id, full_name, role, coach_status, created_at'),
      supabase.from('sessioni').select('id', { count: 'exact' }),
      supabase.from('schede').select('id', { count: 'exact' }),
      // Ultimi registrati
      supabase.from('profiles').select('full_name, role, created_at').order('created_at', { ascending: false }).limit(10),
      // Ultime sessioni
      supabase.from('sessioni').select('id, data, profiles!sessioni_cliente_id_fkey(full_name)').order('data', { ascending: false }).limit(10),
      // Ultime schede
      supabase.from('schede').select('nome, created_at, profiles!schede_coach_id_fkey(full_name)').order('created_at', { ascending: false }).limit(10),
    ])

    const profiles = profilesRes.data ?? []
    const oggi = new Date(); oggi.setHours(0, 0, 0, 0)

    const coachProfiles = profiles.filter(p => p.role === 'coach')
    const s: Stats = {
      totale_coach: coachProfiles.length,
      coach_pending: coachProfiles.filter(p => p.coach_status === 'pending').length,
      coach_approvati: coachProfiles.filter(p => p.coach_status === 'approved').length,
      totale_clienti: profiles.filter(p => p.role === 'cliente').length,
      totale_atleti: profiles.filter(p => p.role === 'atleta').length,
      totale_sessioni: sessioniRes.count ?? 0,
      totale_schede: schedeRes.count ?? 0,
      nuovi_oggi: profiles.filter(p => new Date(p.created_at) >= oggi).length,
    }
    setStats(s)

    // Fetch dati per ogni coach (clienti, schede, sessioni)
    if (coachProfiles.length > 0) {
      const coachIds = coachProfiles.map(c => c.id)
      const [clientiRes, schedeCoachRes, sessioniCoachRes, authRes] = await Promise.all([
        supabase.from('coach_clienti').select('coach_id').in('coach_id', coachIds),
        supabase.from('schede').select('coach_id, created_at').in('coach_id', coachIds),
        supabase.from('sessioni')
          .select('coach_clienti!inner(coach_id), data')
          .in('coach_clienti.coach_id', coachIds)
          .order('data', { ascending: false }),
        // Email tramite API route
        fetch('/api/admin/utenti').then(r => r.json()).catch(() => ({ users: [] })),
      ])

      const clientiPerCoach = new Map<string, number>()
      for (const c of clientiRes.data ?? []) {
        clientiPerCoach.set(c.coach_id, (clientiPerCoach.get(c.coach_id) ?? 0) + 1)
      }
      const schedePerCoach = new Map<string, { count: number; ultima: string | null }>()
      for (const s of schedeCoachRes.data ?? []) {
        const curr = schedePerCoach.get(s.coach_id)
        schedePerCoach.set(s.coach_id, {
          count: (curr?.count ?? 0) + 1,
          ultima: curr?.ultima ?? s.created_at,
        })
      }

      const emailMap = new Map<string, string>()
      for (const u of authRes.users ?? []) {
        emailMap.set(u.id, u.email ?? '')
      }

      const rows: CoachRow[] = coachProfiles.map(c => ({
        id: c.id,
        full_name: c.full_name,
        email: emailMap.get(c.id) ?? null,
        coach_status: c.coach_status,
        created_at: c.created_at,
        clienti_count: clientiPerCoach.get(c.id) ?? 0,
        schede_count: schedePerCoach.get(c.id)?.count ?? 0,
        sessioni_count: 0,
        ultima_attivita: schedePerCoach.get(c.id)?.ultima ?? null,
      }))

      rows.sort((a, b) => {
        if (a.coach_status === 'pending' && b.coach_status !== 'pending') return -1
        if (b.coach_status === 'pending' && a.coach_status !== 'pending') return 1
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      })
      setCoach(rows)
    }

    // Feed attività recente
    const eventi: EventoRecente[] = []
    for (const p of eventiRegRes.data ?? []) {
      eventi.push({
        tipo: 'registrazione',
        descrizione: `${p.full_name ?? 'Utente'} si è registrato come ${p.role}`,
        data: p.created_at,
      })
    }
    for (const s of eventiSessRes.data ?? []) {
      eventi.push({
        tipo: 'sessione',
        descrizione: `Sessione di ${(s as any).profiles?.full_name ?? 'cliente'}`,
        data: s.data,
      })
    }
    for (const s of eventiSchedeRes.data ?? []) {
      eventi.push({
        tipo: 'scheda',
        descrizione: `Scheda "${s.nome}" creata da ${(s as any).profiles?.full_name ?? 'coach'}`,
        data: s.created_at,
      })
    }
    eventi.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime())
    setEventiRecenti(eventi.slice(0, 20))

    setLoading(false)
  }

  useEffect(() => { fetchAll() }, [])

  const handleAzione = async (coachId: string, azione: 'approva' | 'sospendi' | 'riattiva') => {
    setProcessingId(coachId)
    const nuovoStatus = azione === 'approva' || azione === 'riattiva' ? 'approved' : 'suspended'
    await supabase.from('profiles').update({ coach_status: nuovoStatus }).eq('id', coachId)
    setProcessingId(null)
    fetchAll()
  }

  const formatData = (d: string) => {
    const date = new Date(d)
    const now = new Date()
    const diffMin = Math.floor((now.getTime() - date.getTime()) / 60000)
    if (diffMin < 60) return `${diffMin}min fa`
    if (diffMin < 1440) return `${Math.floor(diffMin / 60)}h fa`
    return date.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })
  }

  const coachFiltrati = coach.filter(c => {
    if (filtroCoach === 'pending') return c.coach_status === 'pending'
    if (filtroCoach === 'approvati') return c.coach_status === 'approved'
    return true
  })

  const coachARischio = coach.filter(c =>
    c.coach_status === 'approved' && c.clienti_count === 0 && c.schede_count === 0 &&
    (new Date().getTime() - new Date(c.created_at).getTime()) > 3 * 24 * 60 * 60 * 1000
  )

  const TIPO_COLORI = {
    registrazione: { bg: 'oklch(0.60 0.15 200 / 15%)', color: 'oklch(0.60 0.15 200)', icon: '👤' },
    sessione: { bg: 'oklch(0.65 0.18 150 / 15%)', color: 'oklch(0.65 0.18 150)', icon: '🏋️' },
    scheda: { bg: 'oklch(0.70 0.19 46 / 15%)', color: 'oklch(0.70 0.19 46)', icon: '📋' },
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight" style={{ color: 'oklch(0.97 0 0)' }}>
            Admin Dashboard
          </h1>
          <p className="text-sm mt-1" style={{ color: 'oklch(0.50 0 0)' }}>
            Panoramica globale di Bynari
          </p>
        </div>
        <button onClick={fetchAll}
          className="px-4 py-2 rounded-xl text-sm font-semibold transition-all active:scale-95 hover:opacity-80"
          style={{ background: 'oklch(0.22 0 0)', color: 'oklch(0.60 0 0)', border: '1px solid oklch(1 0 0 / 8%)' }}>
          ↻ Aggiorna
        </button>
      </div>

      {/* Alert pending */}
      {!loading && stats && stats.coach_pending > 0 && (
        <div className="rounded-2xl p-4 flex items-center gap-3"
          style={{ background: 'oklch(0.70 0.19 46 / 10%)', border: '1px solid oklch(0.70 0.19 46 / 30%)' }}>
          <span className="text-xl">⏳</span>
          <div className="flex-1">
            <p className="font-bold text-sm" style={{ color: 'oklch(0.70 0.19 46)' }}>
              {stats.coach_pending} coach {stats.coach_pending === 1 ? 'aspetta' : 'aspettano'} approvazione
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'oklch(0.55 0 0)' }}>
              Vai al tab Coach per approvare o rifiutare
            </p>
          </div>
          <button onClick={() => setTab('coach')}
            className="px-4 py-2 rounded-xl text-xs font-bold transition-all active:scale-95"
            style={{ background: 'oklch(0.70 0.19 46)', color: 'oklch(0.11 0 0)' }}>
            Vai →
          </button>
        </div>
      )}

      {/* Alert coach a rischio */}
      {!loading && coachARischio.length > 0 && (
        <div className="rounded-2xl p-4 flex items-center gap-3"
          style={{ background: 'oklch(0.65 0.22 27 / 10%)', border: '1px solid oklch(0.65 0.22 27 / 30%)' }}>
          <span className="text-xl">⚠️</span>
          <div>
            <p className="font-bold text-sm" style={{ color: 'oklch(0.85 0.12 46)' }}>
              {coachARischio.length} coach approvati non hanno ancora usato la piattaforma
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'oklch(0.55 0 0)' }}>
              {coachARischio.map(c => c.full_name).join(', ')}
            </p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 p-1 rounded-2xl" style={{ background: 'oklch(0.18 0 0)' }}>
        {[
          { id: 'overview', label: '📊 Overview' },
          { id: 'coach', label: `👥 Coach${stats?.coach_pending ? ` (${stats.coach_pending} pending)` : ''}` },
          { id: 'attivita', label: '🕐 Attività recente' },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id as any)}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all"
            style={{
              background: tab === t.id ? 'oklch(0.70 0.19 46)' : 'transparent',
              color: tab === t.id ? 'oklch(0.13 0 0)' : 'oklch(0.50 0 0)',
            }}>
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-20 text-center">
          <p className="text-sm" style={{ color: 'oklch(0.45 0 0)' }}>Caricamento dati...</p>
        </div>
      ) : (
        <>
          {/* TAB: OVERVIEW */}
          {tab === 'overview' && stats && (
            <div className="space-y-4">
              {/* Stats grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: 'Coach totali', value: stats.totale_coach, sub: `${stats.coach_approvati} approvati · ${stats.coach_pending} pending`, color: 'oklch(0.70 0.19 46)' },
                  { label: 'Clienti', value: stats.totale_clienti, sub: 'utenti con coach', color: 'oklch(0.60 0.15 200)' },
                  { label: 'Atleti autonomi', value: stats.totale_atleti, sub: 'senza coach', color: 'oklch(0.65 0.15 300)' },
                  { label: 'Nuovi oggi', value: stats.nuovi_oggi, sub: 'registrazioni', color: 'oklch(0.65 0.18 150)' },
                ].map(s => (
                  <div key={s.label} className="rounded-2xl p-5 space-y-2"
                    style={{ background: 'oklch(0.18 0 0)', border: '1px solid oklch(1 0 0 / 6%)' }}>
                    <p className="text-xs" style={{ color: 'oklch(0.50 0 0)' }}>{s.label}</p>
                    <p className="text-4xl font-black" style={{ color: s.color }}>{s.value}</p>
                    <p className="text-xs" style={{ color: 'oklch(0.40 0 0)' }}>{s.sub}</p>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {[
                  { label: 'Sessioni totali', value: stats.totale_sessioni, icon: '🏋️', color: 'oklch(0.65 0.18 150)' },
                  { label: 'Schede create', value: stats.totale_schede, icon: '📋', color: 'oklch(0.70 0.19 46)' },
                ].map(s => (
                  <div key={s.label} className="rounded-2xl p-5 flex items-center gap-4"
                    style={{ background: 'oklch(0.18 0 0)', border: '1px solid oklch(1 0 0 / 6%)' }}>
                    <div className="text-4xl">{s.icon}</div>
                    <div>
                      <p className="text-xs" style={{ color: 'oklch(0.50 0 0)' }}>{s.label}</p>
                      <p className="text-4xl font-black" style={{ color: s.color }}>{s.value}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Coach a rischio abbandono */}
              {coachARischio.length > 0 && (
                <div className="rounded-2xl overflow-hidden"
                  style={{ background: 'oklch(0.18 0 0)', border: '1px solid oklch(0.65 0.22 27 / 20%)' }}>
                  <div className="px-5 py-4" style={{ borderBottom: '1px solid oklch(1 0 0 / 6%)' }}>
                    <p className="font-bold text-sm" style={{ color: 'oklch(0.97 0 0)' }}>⚠️ Coach inattivi (approvati ma non hanno usato la piattaforma)</p>
                  </div>
                  {coachARischio.map((c, i) => (
                    <div key={c.id} className="flex items-center gap-4 px-5 py-3"
                      style={{ borderBottom: i < coachARischio.length - 1 ? '1px solid oklch(1 0 0 / 4%)' : 'none' }}>
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                        style={{ background: 'oklch(0.65 0.22 27 / 20%)', color: 'oklch(0.75 0.15 27)' }}>
                        {c.full_name?.charAt(0)}
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-sm" style={{ color: 'oklch(0.97 0 0)' }}>{c.full_name}</p>
                        <p className="text-xs" style={{ color: 'oklch(0.45 0 0)' }}>
                          Iscritto il {new Date(c.created_at).toLocaleDateString('it-IT')} · 0 clienti · 0 schede
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB: COACH */}
          {tab === 'coach' && (
            <div className="space-y-4">
              {/* Filtri */}
              <div className="flex gap-2">
                {[
                  { id: 'tutti', label: `Tutti (${coach.length})` },
                  { id: 'pending', label: `In attesa (${stats?.coach_pending ?? 0})` },
                  { id: 'approvati', label: `Approvati (${stats?.coach_approvati ?? 0})` },
                ].map(f => (
                  <button key={f.id} onClick={() => setFiltroCoach(f.id as any)}
                    className="px-4 py-2 rounded-xl text-xs font-bold transition-all"
                    style={{
                      background: filtroCoach === f.id ? 'oklch(0.70 0.19 46)' : 'oklch(0.22 0 0)',
                      color: filtroCoach === f.id ? 'oklch(0.11 0 0)' : 'oklch(0.55 0 0)',
                    }}>
                    {f.label}
                  </button>
                ))}
              </div>

              <div className="rounded-2xl overflow-hidden"
                style={{ background: 'oklch(0.18 0 0)', border: '1px solid oklch(1 0 0 / 6%)' }}>
                {/* Header colonne — desktop */}
                <div className="hidden md:grid grid-cols-12 gap-2 px-5 py-3"
                  style={{ background: 'oklch(0.15 0 0)', borderBottom: '1px solid oklch(1 0 0 / 6%)' }}>
                  {['Coach', 'Stato', 'Clienti', 'Schede', 'Iscritto', 'Azioni'].map((h, i) => (
                    <p key={h} className={`text-xs font-semibold uppercase tracking-wider ${i === 0 ? 'col-span-4' : 'col-span-1 text-center'} ${i === 5 ? 'col-span-3 text-right' : ''}`}
                      style={{ color: 'oklch(0.40 0 0)' }}>{h}</p>
                  ))}
                </div>

                {coachFiltrati.length === 0 ? (
                  <div className="py-12 text-center">
                    <p className="text-sm" style={{ color: 'oklch(0.45 0 0)' }}>Nessun coach in questa categoria</p>
                  </div>
                ) : coachFiltrati.map((c, i) => (
                  <div key={c.id}
                    className="px-5 py-4 md:grid md:grid-cols-12 md:gap-2 md:items-center flex flex-col gap-3"
                    style={{ borderBottom: i < coachFiltrati.length - 1 ? '1px solid oklch(1 0 0 / 4%)' : 'none' }}>

                    {/* Nome + email */}
                    <div className="md:col-span-4 flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                        style={{
                          background: c.coach_status === 'pending' ? 'oklch(0.70 0.19 46 / 15%)' : 'oklch(0.65 0.18 150 / 15%)',
                          color: c.coach_status === 'pending' ? 'oklch(0.70 0.19 46)' : 'oklch(0.65 0.18 150)',
                        }}>
                        {c.full_name?.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-sm truncate" style={{ color: 'oklch(0.97 0 0)' }}>{c.full_name}</p>
                        {c.email && <p className="text-xs truncate" style={{ color: 'oklch(0.45 0 0)' }}>{c.email}</p>}
                      </div>
                    </div>

                    {/* Stato */}
                    <div className="md:col-span-1 md:text-center">
                      <span className="text-xs font-bold px-2.5 py-1 rounded-full"
                        style={{
                          background: c.coach_status === 'pending'
                            ? 'oklch(0.70 0.19 46 / 15%)'
                            : c.coach_status === 'approved'
                            ? 'oklch(0.65 0.18 150 / 15%)'
                            : 'oklch(0.65 0.22 27 / 15%)',
                          color: c.coach_status === 'pending'
                            ? 'oklch(0.70 0.19 46)'
                            : c.coach_status === 'approved'
                            ? 'oklch(0.65 0.18 150)'
                            : 'oklch(0.75 0.15 27)',
                        }}>
                        {c.coach_status === 'pending' ? '⏳ Pending' : c.coach_status === 'approved' ? '✓ Approvato' : '✗ Sospeso'}
                      </span>
                    </div>

                    {/* Clienti */}
                    <div className="md:col-span-1 md:text-center hidden md:block">
                      <p className="text-sm font-semibold" style={{ color: c.clienti_count > 0 ? 'oklch(0.65 0.18 150)' : 'oklch(0.40 0 0)' }}>
                        {c.clienti_count}
                      </p>
                    </div>

                    {/* Schede */}
                    <div className="md:col-span-1 md:text-center hidden md:block">
                      <p className="text-sm font-semibold" style={{ color: c.schede_count > 0 ? 'oklch(0.70 0.19 46)' : 'oklch(0.40 0 0)' }}>
                        {c.schede_count}
                      </p>
                    </div>

                    {/* Data iscrizione */}
                    <div className="md:col-span-1 md:text-center hidden md:block">
                      <p className="text-xs" style={{ color: 'oklch(0.45 0 0)' }}>
                        {new Date(c.created_at).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })}
                      </p>
                    </div>

                    {/* Azioni */}
                    <div className="md:col-span-3 flex items-center gap-2 md:justify-end">
                      {c.coach_status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleAzione(c.id, 'approva')}
                            disabled={processingId === c.id}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all active:scale-95"
                            style={{ background: 'oklch(0.65 0.18 150 / 15%)', color: 'oklch(0.65 0.18 150)' }}>
                            {processingId === c.id ? '...' : '✓ Approva'}
                          </button>
                          <button
                            onClick={() => handleAzione(c.id, 'sospendi')}
                            disabled={processingId === c.id}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all active:scale-95"
                            style={{ background: 'oklch(0.65 0.22 27 / 15%)', color: 'oklch(0.75 0.15 27)' }}>
                            ✗ Rifiuta
                          </button>
                        </>
                      )}
                      {c.coach_status === 'approved' && (
                        <button
                          onClick={() => handleAzione(c.id, 'sospendi')}
                          disabled={processingId === c.id}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all active:scale-95"
                          style={{ background: 'oklch(0.22 0 0)', color: 'oklch(0.50 0 0)', border: '1px solid oklch(1 0 0 / 8%)' }}>
                          Sospendi
                        </button>
                      )}
                      {c.coach_status === 'suspended' && (
                        <button
                          onClick={() => handleAzione(c.id, 'riattiva')}
                          disabled={processingId === c.id}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all active:scale-95"
                          style={{ background: 'oklch(0.65 0.18 150 / 15%)', color: 'oklch(0.65 0.18 150)' }}>
                          Riattiva
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB: ATTIVITÀ RECENTE */}
          {tab === 'attivita' && (
            <div className="rounded-2xl overflow-hidden"
              style={{ background: 'oklch(0.18 0 0)', border: '1px solid oklch(1 0 0 / 6%)' }}>
              <div className="px-5 py-4" style={{ borderBottom: '1px solid oklch(1 0 0 / 6%)' }}>
                <p className="font-bold" style={{ color: 'oklch(0.97 0 0)' }}>Ultimi eventi sulla piattaforma</p>
              </div>
              {eventiRecenti.length === 0 ? (
                <div className="py-12 text-center">
                  <p className="text-sm" style={{ color: 'oklch(0.45 0 0)' }}>Nessun evento recente</p>
                </div>
              ) : eventiRecenti.map((e, i) => {
                const colori = TIPO_COLORI[e.tipo]
                return (
                  <div key={i} className="flex items-center gap-4 px-5 py-3"
                    style={{ borderBottom: i < eventiRecenti.length - 1 ? '1px solid oklch(1 0 0 / 4%)' : 'none' }}>
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 text-sm"
                      style={{ background: colori.bg }}>
                      {colori.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate" style={{ color: 'oklch(0.80 0 0)' }}>{e.descrizione}</p>
                    </div>
                    <p className="text-xs flex-shrink-0" style={{ color: 'oklch(0.40 0 0)' }}>
                      {formatData(e.data)}
                    </p>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}
    </div>
  )
}
