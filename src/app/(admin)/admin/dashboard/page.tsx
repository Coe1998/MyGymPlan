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

interface Evento {
  tipo: 'registrazione' | 'sessione' | 'scheda'
  descrizione: string
  data: string
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [coach, setCoach] = useState<CoachRow[]>([])
  const [eventi, setEventi] = useState<Evento[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'overview' | 'coach' | 'attivita'>('overview')
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [filtroCoach, setFiltroCoach] = useState<'tutti' | 'pending' | 'approvati'>('tutti')
  const supabase = createClient()

  const fetchAll = async () => {
    setLoading(true)
    const res = await fetch('/api/admin/stats')
    if (!res.ok) { setLoading(false); return }
    const data = await res.json()
    setStats(data.stats)
    setCoach(data.coach)
    setEventi(data.eventi)
    setLoading(false)
  }

  useEffect(() => { fetchAll() }, [])

  const handleAzione = async (coachId: string, azione: 'approva' | 'sospendi' | 'riattiva') => {
    setProcessingId(coachId)
    const status = azione === 'approva' || azione === 'riattiva' ? 'approved' : 'suspended'
    await fetch('/api/admin/coach-status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ coachId, status }),
    })
    setProcessingId(null)
    fetchAll()
  }

  const formatData = (d: string) => {
    const date = new Date(d)
    const diffMin = Math.floor((Date.now() - date.getTime()) / 60000)
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
    (Date.now() - new Date(c.created_at).getTime()) > 3 * 24 * 60 * 60 * 1000
  )

  const TIPO_COLORI = {
    registrazione: { bg: 'oklch(0.60 0.15 200 / 15%)', icon: '👤' },
    sessione: { bg: 'oklch(0.65 0.18 150 / 15%)', icon: '🏋️' },
    scheda: { bg: 'oklch(0.70 0.19 46 / 15%)', icon: '📋' },
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight" style={{ color: 'oklch(0.97 0 0)' }}>Admin Dashboard</h1>
          <p className="text-sm mt-1" style={{ color: 'oklch(0.50 0 0)' }}>Panoramica globale di Bynari</p>
        </div>
        <button onClick={fetchAll}
          className="px-4 py-2 rounded-xl text-sm font-semibold transition-all active:scale-95"
          style={{ background: 'oklch(0.22 0 0)', color: 'oklch(0.60 0 0)', border: '1px solid oklch(1 0 0 / 8%)' }}>
          ↻ Aggiorna
        </button>
      </div>

      {!loading && stats && stats.coach_pending > 0 && (
        <div className="rounded-2xl p-4 flex items-center gap-3"
          style={{ background: 'oklch(0.70 0.19 46 / 10%)', border: '1px solid oklch(0.70 0.19 46 / 30%)' }}>
          <span className="text-xl">⏳</span>
          <div className="flex-1">
            <p className="font-bold text-sm" style={{ color: 'oklch(0.70 0.19 46)' }}>
              {stats.coach_pending} coach {stats.coach_pending === 1 ? 'aspetta' : 'aspettano'} approvazione
            </p>
          </div>
          <button onClick={() => { setTab('coach'); setFiltroCoach('pending') }}
            className="px-4 py-2 rounded-xl text-xs font-bold"
            style={{ background: 'oklch(0.70 0.19 46)', color: 'oklch(0.11 0 0)' }}>
            Vai →
          </button>
        </div>
      )}

      {!loading && coachARischio.length > 0 && (
        <div className="rounded-2xl p-4 flex items-start gap-3"
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

      <div className="flex gap-2 p-1 rounded-2xl" style={{ background: 'oklch(0.18 0 0)' }}>
        {[
          { id: 'overview', label: '📊 Overview' },
          { id: 'coach', label: `👥 Coach${stats?.coach_pending ? ` (${stats.coach_pending})` : ''}` },
          { id: 'attivita', label: '🕐 Attività' },
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
          {tab === 'overview' && stats && (
            <div className="space-y-4">
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
              {coachARischio.length > 0 && (
                <div className="rounded-2xl overflow-hidden"
                  style={{ background: 'oklch(0.18 0 0)', border: '1px solid oklch(0.65 0.22 27 / 20%)' }}>
                  <div className="px-5 py-4" style={{ borderBottom: '1px solid oklch(1 0 0 / 6%)' }}>
                    <p className="font-bold text-sm" style={{ color: 'oklch(0.97 0 0)' }}>⚠️ Coach inattivi dopo approvazione</p>
                  </div>
                  {coachARischio.map((c, i) => (
                    <div key={c.id} className="flex items-center gap-4 px-5 py-3"
                      style={{ borderBottom: i < coachARischio.length - 1 ? '1px solid oklch(1 0 0 / 4%)' : 'none' }}>
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                        style={{ background: 'oklch(0.65 0.22 27 / 20%)', color: 'oklch(0.75 0.15 27)' }}>
                        {c.full_name?.charAt(0)}
                      </div>
                      <div>
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

          {tab === 'coach' && (
            <div className="space-y-4">
              <div className="flex gap-2">
                {[
                  { id: 'tutti', label: `Tutti (${coach.length})` },
                  { id: 'pending', label: `Pending (${stats?.coach_pending ?? 0})` },
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
                {coachFiltrati.length === 0 ? (
                  <div className="py-12 text-center">
                    <p className="text-sm" style={{ color: 'oklch(0.45 0 0)' }}>Nessun coach in questa categoria</p>
                  </div>
                ) : coachFiltrati.map((c, i) => (
                  <div key={c.id} className="px-5 py-4 flex flex-col md:flex-row md:items-center gap-3"
                    style={{ borderBottom: i < coachFiltrati.length - 1 ? '1px solid oklch(1 0 0 / 4%)' : 'none' }}>
                    <div className="flex items-center gap-3 flex-1 min-w-0">
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
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="text-xs font-bold px-2.5 py-1 rounded-full"
                        style={{
                          background: c.coach_status === 'pending' ? 'oklch(0.70 0.19 46 / 15%)' : c.coach_status === 'approved' ? 'oklch(0.65 0.18 150 / 15%)' : 'oklch(0.65 0.22 27 / 15%)',
                          color: c.coach_status === 'pending' ? 'oklch(0.70 0.19 46)' : c.coach_status === 'approved' ? 'oklch(0.65 0.18 150)' : 'oklch(0.75 0.15 27)',
                        }}>
                        {c.coach_status === 'pending' ? '⏳ Pending' : c.coach_status === 'approved' ? '✓ Approvato' : '✗ Sospeso'}
                      </span>
                      <span className="text-xs" style={{ color: 'oklch(0.45 0 0)' }}>
                        👥 {c.clienti_count} · 📋 {c.schede_count} · {new Date(c.created_at).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {c.coach_status === 'pending' && <>
                        <button onClick={() => handleAzione(c.id, 'approva')} disabled={processingId === c.id}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all active:scale-95"
                          style={{ background: 'oklch(0.65 0.18 150 / 15%)', color: 'oklch(0.65 0.18 150)' }}>
                          {processingId === c.id ? '...' : '✓ Approva'}
                        </button>
                        <button onClick={() => handleAzione(c.id, 'sospendi')} disabled={processingId === c.id}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all active:scale-95"
                          style={{ background: 'oklch(0.65 0.22 27 / 15%)', color: 'oklch(0.75 0.15 27)' }}>
                          ✗ Rifiuta
                        </button>
                      </>}
                      {c.coach_status === 'approved' && (
                        <button onClick={() => handleAzione(c.id, 'sospendi')} disabled={processingId === c.id}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all active:scale-95"
                          style={{ background: 'oklch(0.22 0 0)', color: 'oklch(0.50 0 0)', border: '1px solid oklch(1 0 0 / 8%)' }}>
                          Sospendi
                        </button>
                      )}
                      {c.coach_status === 'suspended' && (
                        <button onClick={() => handleAzione(c.id, 'riattiva')} disabled={processingId === c.id}
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

          {tab === 'attivita' && (
            <div className="rounded-2xl overflow-hidden"
              style={{ background: 'oklch(0.18 0 0)', border: '1px solid oklch(1 0 0 / 6%)' }}>
              <div className="px-5 py-4" style={{ borderBottom: '1px solid oklch(1 0 0 / 6%)' }}>
                <p className="font-bold" style={{ color: 'oklch(0.97 0 0)' }}>Ultimi eventi sulla piattaforma</p>
              </div>
              {eventi.length === 0 ? (
                <div className="py-12 text-center">
                  <p className="text-sm" style={{ color: 'oklch(0.45 0 0)' }}>Nessun evento recente</p>
                </div>
              ) : eventi.map((e, i) => {
                const colori = TIPO_COLORI[e.tipo] ?? TIPO_COLORI.registrazione
                return (
                  <div key={i} className="flex items-center gap-4 px-5 py-3"
                    style={{ borderBottom: i < eventi.length - 1 ? '1px solid oklch(1 0 0 / 4%)' : 'none' }}>
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
