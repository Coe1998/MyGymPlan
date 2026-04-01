'use client'

import { useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faXmark, faDumbbell, faWeightScale, faHeart,
  faClipboardList, faChartBar, faCircleCheck, faPause,
  faArrowTrendUp, faArrowTrendDown, faMinus, faUtensils,
} from '@fortawesome/free-solid-svg-icons'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import MacroTargetForm from '@/components/coach/MacroTargetForm'

const WeightChart = dynamic(() => import('@/components/coach/WeightChart'), {
  ssr: false,
  loading: () => <div style={{ height: '100%' }} />,
})

interface Cliente {
  cliente_id: string
  created_at: string
  profiles: { id: string; full_name: string | null }
}

interface ClienteDettaglio {
  sessioni: { id: string; data: string; completata: boolean; scheda_giorni: { nome: string } | null; durata_secondi: number | null }[]
  misurazioni: { data: string; peso_kg: number }[]
  ultimoCheckin: { energia: number; sonno: number; stress: number; motivazione: number; data: string } | null
  assegnazioni: { id: string; schede: { nome: string } | null; data_inizio: string; attiva: boolean }[]
}

export default function CoachClientiList({ clienti }: { clienti: Cliente[] }) {
  const [clienteAperto, setClienteAperto] = useState<Cliente | null>(null)
  const [dettaglio, setDettaglio] = useState<ClienteDettaglio | null>(null)
  const [loading, setLoading] = useState(false)
  const [drawerTab, setDrawerTab] = useState<'overview' | 'nutrizione'>('overview')
  const [dietaAbilitata, setDietaAbilitata] = useState<boolean>(false)
  const [togglingDieta, setTogglingDieta] = useState(false)
  const supabase = useMemo(() => createClient(), [])

  const apriCliente = async (c: Cliente) => {
    setClienteAperto(c)
    setDettaglio(null)
    setDrawerTab('overview')
    setDietaAbilitata(false)
    setLoading(true)
    try {
      const [sessRes, misRes, checkinRes, assRes, dietaRes] = await Promise.all([
        supabase.from('sessioni').select('id, data, completata, durata_secondi, scheda_giorni(nome)').eq('cliente_id', c.cliente_id).order('data', { ascending: false }).limit(20),
        supabase.from('misurazioni').select('data, peso_kg').eq('cliente_id', c.cliente_id).not('peso_kg', 'is', null).order('data', { ascending: true }).limit(20),
        supabase.from('checkin').select('energia, sonno, stress, motivazione, data').eq('cliente_id', c.cliente_id).order('data', { ascending: false }).limit(1).maybeSingle(),
        supabase.from('assegnazioni').select('id, data_inizio, attiva, schede(nome)').eq('cliente_id', c.cliente_id).order('created_at', { ascending: false }),
        supabase.from('coach_clienti').select('dieta_abilitata').eq('cliente_id', c.cliente_id).maybeSingle(),
      ])
      setDettaglio({
        sessioni: (sessRes.data as any) ?? [],
        misurazioni: (misRes.data ?? []).map((m: any) => ({ data: new Date(m.data).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' }), peso_kg: parseFloat(m.peso_kg) })),
        ultimoCheckin: checkinRes.data as any ?? null,
        assegnazioni: (assRes.data as any) ?? [],
      })
      setDietaAbilitata(dietaRes.data?.dieta_abilitata ?? false)
    } finally {
      setLoading(false)
    }
  }

  const handleToggleDieta = async () => {
    if (togglingDieta || !clienteAperto) return
    setTogglingDieta(true)
    const newVal = !dietaAbilitata
    await supabase.from('coach_clienti').update({ dieta_abilitata: newVal }).eq('cliente_id', clienteAperto.cliente_id)
    setDietaAbilitata(newVal)
    setTogglingDieta(false)
  }

  const formatDurata = (sec: number | null) => {
    if (!sec) return null
    const h = Math.floor(sec / 3600)
    const m = Math.floor((sec % 3600) / 60)
    return h > 0 ? `${h}h ${m}min` : `${m}min`
  }

  const sessCompletate = dettaglio?.sessioni.filter(s => s.completata).length ?? 0
  const ultimoPeso = dettaglio?.misurazioni.at(-1)?.peso_kg ?? null
  const penultimoPeso = dettaglio?.misurazioni.at(-2)?.peso_kg ?? null
  const deltaPeso = ultimoPeso !== null && penultimoPeso !== null
    ? Math.round((ultimoPeso - penultimoPeso) * 10) / 10 : null

  const benessereScore = dettaglio?.ultimoCheckin
    ? Math.round(((dettaglio.ultimoCheckin.energia + dettaglio.ultimoCheckin.sonno +
        (6 - dettaglio.ultimoCheckin.stress) + dettaglio.ultimoCheckin.motivazione) / 4) * 10) / 10
    : null

  return (
    <>
      {/* Lista clienti - Invariata */}
      {clienti.length === 0 ? (
        <div className="py-16 text-center space-y-3">
          <div className="text-5xl"><FontAwesomeIcon icon={faDumbbell} /></div>
          <p className="font-semibold" style={{ color: 'oklch(0.97 0 0)' }}>Nessun cliente ancora</p>
        </div>
      ) : (
        <div>
          {clienti.map((c, i) => (
            <div key={c.cliente_id} onClick={() => apriCliente(c)}
              className="flex items-center gap-4 px-6 py-4 cursor-pointer transition-all hover:opacity-80 active:opacity-60"
              style={{ borderBottom: i < clienti.length - 1 ? '1px solid oklch(1 0 0 / 4%)' : 'none' }}>
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                style={{ background: 'oklch(0.70 0.19 46 / 15%)', color: 'oklch(0.70 0.19 46)' }}>
                {c.profiles?.full_name?.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1">
                <p className="font-medium text-sm" style={{ color: 'oklch(0.97 0 0)' }}>{c.profiles?.full_name}</p>
                <p className="text-xs" style={{ color: 'oklch(0.45 0 0)' }}>Aggiunto il {new Date(c.created_at).toLocaleDateString('it-IT')}</p>
              </div>
              <span className="text-sm" style={{ color: 'oklch(0.40 0 0)' }}>→</span>
            </div>
          ))}
        </div>
      )}

      {/* Drawer */}
      {clienteAperto && (
        <div className="fixed inset-0 z-50 flex justify-end" style={{ background: 'oklch(0 0 0 / 60%)' }} onClick={() => setClienteAperto(null)}>
          <div className="w-full max-w-xl h-full flex flex-col" style={{ background: 'oklch(0.13 0 0)', borderLeft: '1px solid oklch(1 0 0 / 8%)' }} onClick={e => e.stopPropagation()}>
            
            {/* Header */}
            <div className="sticky top-0 z-10 flex items-center gap-4 px-5 flex-shrink-0"
              style={{ background: 'oklch(0.13 0 0)', borderBottom: '1px solid oklch(1 0 0 / 8%)', paddingTop: 'calc(env(safe-area-inset-top) + 1rem)', paddingBottom: '1rem' }}>
              <button onClick={() => setClienteAperto(null)} className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'oklch(0.22 0 0)', color: 'oklch(0.60 0 0)' }}>
                <FontAwesomeIcon icon={faXmark} />
              </button>
              <h3 className="font-black text-lg truncate" style={{ color: 'oklch(0.97 0 0)' }}>{clienteAperto.profiles?.full_name}</h3>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 p-3 flex-shrink-0" style={{ borderBottom: '1px solid oklch(1 0 0 / 8%)' }}>
              <button onClick={() => setDrawerTab('overview')} className="flex-1 py-2 rounded-xl text-sm font-semibold"
                style={{ background: drawerTab === 'overview' ? 'oklch(0.70 0.19 46)' : 'oklch(0.22 0 0)', color: drawerTab === 'overview' ? 'oklch(0.11 0 0)' : 'oklch(0.50 0 0)' }}>
                📊 Overview
              </button>
              <button onClick={() => setDrawerTab('nutrizione')} className="flex-1 py-2 rounded-xl text-sm font-semibold"
                style={{ background: drawerTab === 'nutrizione' ? 'oklch(0.70 0.19 46)' : 'oklch(0.22 0 0)', color: drawerTab === 'nutrizione' ? 'oklch(0.11 0 0)' : 'oklch(0.50 0 0)' }}>
                🥗 Nutrizione
              </button>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center h-full">
                  <p style={{ color: 'oklch(0.45 0 0)' }}>Caricamento...</p>
                </div>
              ) : drawerTab === 'nutrizione' ? (
                <div className="p-5">
                   {/* Toggle Dieta */}
                   <div className="px-5 py-3 mb-5 flex items-center justify-between rounded-2xl" style={{ background: 'oklch(0.16 0 0)', border: '1px solid oklch(1 0 0 / 8%)' }}>
                    <p className="text-sm font-bold" style={{ color: 'oklch(0.97 0 0)' }}>Abilita Nutrizione</p>
                    <button onClick={handleToggleDieta} disabled={togglingDieta} className="relative">
                      <div className="w-12 h-7 rounded-full transition-colors" style={{ background: dietaAbilitata ? 'oklch(0.65 0.18 150)' : 'oklch(0.30 0 0)' }}>
                        <div className="absolute top-0.5 w-6 h-6 rounded-full bg-white transition-transform" style={{ transform: dietaAbilitata ? 'translateX(1.25rem)' : 'translateX(0.125rem)' }} />
                      </div>
                    </button>
                  </div>
                  {dietaAbilitata ? <MacroTargetForm clienteId={clienteAperto.cliente_id} /> : <p className="text-center py-10 text-sm" style={{ color: 'oklch(0.45 0 0)' }}>Abilita la nutrizione per questo cliente.</p>}
                </div>
              ) : (
                /* TAB OVERVIEW */
                <div className="p-5 space-y-5">
                  {dettaglio && (
                    <>
                      {/* Grid Stats */}
                      <div className="grid grid-cols-3 gap-3">
                        <div className="rounded-2xl p-4 text-center" style={{ background: 'oklch(0.18 0 0)', border: '1px solid oklch(1 0 0 / 6%)' }}>
                          <p className="text-2xl font-black" style={{ color: 'oklch(0.60 0.15 200)' }}>{dettaglio.sessioni.length}</p>
                          <p className="text-xs uppercase text-zinc-500">Sessioni</p>
                        </div>
                        <div className="rounded-2xl p-4 text-center" style={{ background: 'oklch(0.18 0 0)', border: '1px solid oklch(1 0 0 / 6%)' }}>
                          <p className="text-2xl font-black" style={{ color: 'oklch(0.65 0.18 150)' }}>{sessCompletate}</p>
                          <p className="text-xs uppercase text-zinc-500">Fatte</p>
                        </div>
                        <div className="rounded-2xl p-4 text-center" style={{ background: 'oklch(0.18 0 0)', border: '1px solid oklch(1 0 0 / 6%)' }}>
                          <p className="text-2xl font-black" style={{ color: 'oklch(0.70 0.19 46)' }}>{benessereScore ?? '—'}</p>
                          <p className="text-xs uppercase text-zinc-500">Mood</p>
                        </div>
                      </div>

                      {/* Peso */}
                      {dettaglio.misurazioni.length > 0 && (
                        <div className="rounded-2xl p-5" style={{ background: 'oklch(0.18 0 0)', border: '1px solid oklch(1 0 0 / 6%)' }}>
                          <div className="flex justify-between items-center mb-4">
                            <p className="text-xs font-bold uppercase tracking-widest text-zinc-500">Andamento Peso</p>
                            <p className="text-lg font-black">{ultimoPeso} kg</p>
                          </div>
                          <div className="h-32">
                            <WeightChart data={dettaglio.misurazioni} />
                          </div>
                        </div>
                      )}

                      {/* Ultime Sessioni */}
                      <div className="rounded-2xl overflow-hidden" style={{ background: 'oklch(0.18 0 0)', border: '1px solid oklch(1 0 0 / 6%)' }}>
                        <div className="px-4 py-3 border-b border-white/5 bg-white/5">
                          <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Attività Recenti</p>
                        </div>
                        <div className="divide-y divide-white/5">
                          {dettaglio.sessioni.slice(0, 5).map(s => (
                            <div key={s.id} className="p-4 flex justify-between items-center text-sm">
                              <p className="font-medium">{(s as any).scheda_giorni?.nome || 'Allenamento'}</p>
                              <p className="text-zinc-500">{new Date(s.data).toLocaleDateString('it-IT')}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Footer fisso - pulsante analytics sempre visibile */}
            {!loading && drawerTab === 'overview' && (
              <div className="flex-shrink-0 p-4" style={{ borderTop: '1px solid oklch(1 0 0 / 8%)', paddingBottom: 'calc(env(safe-area-inset-bottom) + 1rem)', background: 'oklch(0.13 0 0)' }}>
                <Link
                  href={`/coach/clienti/${clienteAperto.cliente_id}/analytics`}
                  className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-black text-sm transition-all active:scale-95"
                  style={{ background: 'oklch(0.70 0.19 46)', color: 'oklch(0.13 0 0)', boxShadow: '0 10px 30px -10px oklch(0.70 0.19 46 / 0.3)' }}
                >
                  <FontAwesomeIcon icon={faArrowTrendUp} />
                  ANALYTICS AVANZATE →
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}