'use client'

import { useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faXmark, faDumbbell, faWeightScale, faHeart,
  faClipboardList, faChartBar, faCircleCheck, faPause,
  faArrowTrendUp, faArrowTrendDown, faMinus,
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
      {/* Lista clienti */}
      <div>
        {clienti.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <div className="text-5xl"><FontAwesomeIcon icon={faDumbbell} /></div>
            <p className="font-semibold" style={{ color: 'oklch(0.97 0 0)' }}>Nessun cliente ancora</p>
          </div>
        ) : (
          clienti.map((c, i) => (
            <div key={c.cliente_id} onClick={() => apriCliente(c)}
              className="flex items-center gap-4 px-6 py-4 cursor-pointer hover:bg-white/5"
              style={{ borderBottom: i < clienti.length - 1 ? '1px solid oklch(1 0 0 / 4%)' : 'none' }}>
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold bg-zinc-800 text-orange-500">
                {c.profiles?.full_name?.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1">
                <p className="font-medium text-sm text-zinc-100">{c.profiles?.full_name}</p>
              </div>
              <span className="text-zinc-600">→</span>
            </div>
          ))
        )}
      </div>

      {/* Drawer */}
      {clienteAperto && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm" onClick={() => setClienteAperto(null)}>
          <div className="w-full max-w-xl h-full bg-zinc-950 flex flex-col" onClick={e => e.stopPropagation()} style={{ borderLeft: '1px solid oklch(1 0 0 / 8%)' }}>
            
            {/* Header */}
            <div className="p-5 flex items-center gap-4 border-b border-white/10">
              <button onClick={() => setClienteAperto(null)} className="w-9 h-9 rounded-xl bg-zinc-900 flex items-center justify-center text-zinc-400">
                <FontAwesomeIcon icon={faXmark} />
              </button>
              <h2 className="font-black text-zinc-100 uppercase tracking-tight">{clienteAperto.profiles?.full_name}</h2>
            </div>

            {/* Tabs */}
            <div className="flex p-3 gap-2 border-b border-white/5">
              <button onClick={() => setDrawerTab('overview')} 
                className={`flex-1 py-2 rounded-xl text-xs font-black transition-all ${drawerTab === 'overview' ? 'bg-orange-500 text-black' : 'bg-zinc-900 text-zinc-500'}`}>
                📊 OVERVIEW
              </button>
              <button onClick={() => setDrawerTab('nutrizione')} 
                className={`flex-1 py-2 rounded-xl text-xs font-black transition-all ${drawerTab === 'nutrizione' ? 'bg-orange-500 text-black' : 'bg-zinc-900 text-zinc-500'}`}>
                🥗 NUTRIZIONE
              </button>
            </div>

            {/* Area Contenuto Scrollabile */}
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="p-10 text-center text-zinc-500 text-xs font-bold uppercase tracking-widest">Caricamento...</div>
              ) : drawerTab === 'nutrizione' ? (
                <div className="p-5">
                   <div className="px-5 py-3 mb-6 flex items-center justify-between rounded-2xl bg-zinc-900 border border-white/5">
                    <p className="text-sm font-bold text-zinc-100">Piano Dieta</p>
                    <button onClick={handleToggleDieta} disabled={togglingDieta} className={`w-12 h-6 rounded-full relative transition-all ${dietaAbilitata ? 'bg-emerald-500' : 'bg-zinc-700'}`}>
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${dietaAbilitata ? 'left-7' : 'left-1'}`} />
                    </button>
                  </div>
                  {dietaAbilitata && <MacroTargetForm clienteId={clienteAperto.cliente_id} />}
                </div>
              ) : (
                /* TAB OVERVIEW */
                <div className="p-5 space-y-5">
                  {dettaglio && (
                    <>
                      {/* Stats */}
                      <div className="grid grid-cols-3 gap-3">
                        <div className="bg-zinc-900/50 p-4 rounded-2xl border border-white/5 text-center">
                          <p className="text-2xl font-black text-orange-500">{dettaglio.sessioni.length}</p>
                          <p className="text-[10px] text-zinc-500 font-bold uppercase">Sessioni</p>
                        </div>
                        <div className="bg-zinc-900/50 p-4 rounded-2xl border border-white/5 text-center">
                          <p className="text-2xl font-black text-emerald-500">{sessCompletate}</p>
                          <p className="text-[10px] text-zinc-500 font-bold uppercase">Fatte</p>
                        </div>
                        <div className="bg-zinc-900/50 p-4 rounded-2xl border border-white/5 text-center">
                          <p className="text-2xl font-black text-blue-400">{benessereScore ?? '—'}</p>
                          <p className="text-[10px] text-zinc-500 font-bold uppercase">Mood</p>
                        </div>
                      </div>

                      {/* Peso */}
                      {dettaglio.misurazioni.length > 0 && (
                        <div className="bg-zinc-900/50 p-5 rounded-2xl border border-white/5">
                          <div className="flex justify-between items-center mb-4">
                            <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Peso Corporeo</p>
                            <p className="text-lg font-black text-zinc-100">{ultimoPeso} kg</p>
                          </div>
                          <div className="h-28">
                            <WeightChart data={dettaglio.misurazioni} />
                          </div>
                        </div>
                      )}

                      {/* Attività Recenti */}
                      <div className="bg-zinc-900/50 rounded-2xl border border-white/5 overflow-hidden">
                        <div className="px-4 py-3 border-b border-white/5 bg-white/5">
                          <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Ultime 5 Sessioni</p>
                        </div>
                        <div className="divide-y divide-white/5">
                          {dettaglio.sessioni.slice(0, 5).map(s => (
                            <div key={s.id} className="p-4 flex justify-between items-center">
                              <p className="text-sm font-medium text-zinc-200">{(s as any).scheda_giorni?.nome || 'Workout'}</p>
                              <p className="text-xs text-zinc-500">{new Date(s.data).toLocaleDateString('it-IT')}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}

                  {/* IL BOTTONE: Ora è dentro lo scroll e fuori da ogni blocco opzionale */}
                  <div className="pt-4 pb-10">
                    <Link
                      href={`/coach/clienti/${clienteAperto.cliente_id}/analytics`}
                      className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl font-black text-sm bg-orange-500 text-black transition-all active:scale-95 shadow-xl shadow-orange-500/10"
                    >
                      <FontAwesomeIcon icon={faArrowTrendUp} />
                      ANALYTICS AVANZATE →
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}