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
      {/* Lista clienti */}
      {clienti.length === 0 ? (
        <div className="py-16 text-center space-y-3">
          <div className="text-5xl"><FontAwesomeIcon icon={faDumbbell} /></div>
          <p className="font-semibold" style={{ color: 'oklch(0.97 0 0)' }}>Nessun cliente ancora</p>
          <p className="text-sm" style={{ color: 'oklch(0.45 0 0)' }}>Inizia aggiungendo il tuo primo cliente</p>
          <a href="/coach/clienti"
            className="inline-flex items-center gap-2 mt-2 px-5 py-2.5 rounded-xl text-sm font-semibold"
            style={{ background: 'oklch(0.70 0.19 46)', color: 'oklch(0.13 0 0)' }}>
            + Aggiungi cliente
          </a>
        </div>
      ) : (
        <div>
          {clienti.slice(0, 6).map((c, i) => (
            <div key={c.cliente_id}
              onClick={() => apriCliente(c)}
              className="flex items-center gap-4 px-6 py-4 cursor-pointer transition-all hover:opacity-80 active:opacity-60"
              style={{ borderBottom: i < Math.min(clienti.length, 6) - 1 ? '1px solid oklch(1 0 0 / 4%)' : 'none' }}>
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                style={{ background: 'oklch(0.70 0.19 46 / 15%)', color: 'oklch(0.70 0.19 46)' }}>
                {c.profiles?.full_name?.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1">
                <p className="font-medium text-sm" style={{ color: 'oklch(0.97 0 0)' }}>{c.profiles?.full_name}</p>
                <p className="text-xs" style={{ color: 'oklch(0.45 0 0)' }}>
                  Aggiunto il {new Date(c.created_at).toLocaleDateString('it-IT')}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <div className="text-xs font-medium px-3 py-1 rounded-full"
                  style={{ background: 'oklch(0.65 0.18 150 / 15%)', color: 'oklch(0.65 0.18 150)' }}>
                  Attivo
                </div>
                <span className="text-sm" style={{ color: 'oklch(0.40 0 0)' }}>→</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Drawer overview cliente */}
      {clienteAperto && (
        <div className="fixed inset-0 z-50 flex justify-end"
          style={{ background: 'oklch(0 0 0 / 60%)' }}
          onClick={() => setClienteAperto(null)}>
          <div className="w-full max-w-xl h-full overflow-y-auto flex flex-col"
            style={{ background: 'oklch(0.13 0 0)', borderLeft: '1px solid oklch(1 0 0 / 8%)' }}
            onClick={e => e.stopPropagation()}>

            {/* Header */}
            <div className="sticky top-0 z-10 flex items-center gap-4 px-5"
              style={{ background: 'oklch(0.13 0 0)', borderBottom: '1px solid oklch(1 0 0 / 8%)', paddingTop: 'calc(env(safe-area-inset-top) + 1rem)', paddingBottom: '1rem' }}>
              <button onClick={() => setClienteAperto(null)}
                className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: 'oklch(0.22 0 0)', color: 'oklch(0.60 0 0)' }}>
                <FontAwesomeIcon icon={faXmark} />
              </button>
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                  style={{ background: 'oklch(0.70 0.19 46 / 15%)', color: 'oklch(0.70 0.19 46)' }}>
                  {clienteAperto.profiles?.full_name?.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="font-black text-base truncate" style={{ color: 'oklch(0.97 0 0)' }}>
                    {clienteAperto.profiles?.full_name}
                  </p>
                  <p className="text-xs" style={{ color: 'oklch(0.50 0 0)' }}>
                    Cliente dal {new Date(clienteAperto.created_at).toLocaleDateString('it-IT')}
                  </p>
                </div>
              </div>
            </div>

            {/* Drawer tabs */}
            <div className="flex gap-2 p-3 flex-shrink-0" style={{ borderBottom: '1px solid oklch(1 0 0 / 8%)' }}>
              {[
                { id: 'overview', label: '📊 Overview' },
                { id: 'nutrizione', label: '🥗 Nutrizione' },
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

            {loading ? (
              <div className="flex-1 flex items-center justify-center">
                <p className="text-sm" style={{ color: 'oklch(0.45 0 0)' }}>Caricamento...</p>
              </div>
            ) : drawerTab === 'nutrizione' ? (
              <div className="flex-1 flex flex-col">
                {dietaAbilitata ? (
                  <MacroTargetForm clienteId={clienteAperto.cliente_id} />
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center gap-3 px-8 text-center">
                    <p className="text-3xl">🥗</p>
                    <p className="text-sm font-semibold" style={{ color: 'oklch(0.60 0 0)' }}>
                      Abilita il piano dieta per impostare i macro di questo cliente
                    </p>
                  </div>
                )}
              </div>
            ) : dettaglio && (
              <div className="flex-1 p-5 space-y-5">

                {/* Stats rapide */}
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: 'Sessioni', value: dettaglio.sessioni.length, color: 'oklch(0.60 0.15 200)' },
                    { label: 'Completate', value: sessCompletate, color: 'oklch(0.65 0.18 150)' },
                    { label: 'Benessere', value: benessereScore !== null ? `${benessereScore}/5` : '—', color: 'oklch(0.70 0.19 46)' },
                  ].map(s => (
                    <div key={s.label} className="rounded-2xl p-4 text-center"
                      style={{ background: 'oklch(0.18 0 0)', border: '1px solid oklch(1 0 0 / 6%)' }}>
                      <p className="text-2xl font-black" style={{ color: s.color }}>{s.value}</p>
                      <p className="text-xs mt-1" style={{ color: 'oklch(0.45 0 0)' }}>{s.label}</p>
                    </div>
                  ))}
                </div>

                {/* Schede assegnate */}
                <div className="rounded-2xl overflow-hidden"
                  style={{ background: 'oklch(0.18 0 0)', border: '1px solid oklch(1 0 0 / 6%)' }}>
                  <div className="px-4 py-3 flex items-center gap-2"
                    style={{ borderBottom: '1px solid oklch(1 0 0 / 6%)' }}>
                    <FontAwesomeIcon icon={faClipboardList} style={{ color: 'oklch(0.70 0.19 46)' }} />
                    <p className="font-bold text-sm" style={{ color: 'oklch(0.97 0 0)' }}>Schede assegnate</p>
                  </div>
                  {dettaglio.assegnazioni.length === 0 ? (
                    <p className="px-4 py-3 text-sm" style={{ color: 'oklch(0.45 0 0)' }}>Nessuna scheda assegnata</p>
                  ) : dettaglio.assegnazioni.map((a, i) => (
                    <div key={a.id} className="flex items-center gap-3 px-4 py-3"
                      style={{ borderBottom: i < dettaglio.assegnazioni.length - 1 ? '1px solid oklch(1 0 0 / 4%)' : 'none' }}>
                      <span className="text-xs px-2 py-0.5 rounded-full"
                        style={{
                          background: a.attiva ? 'oklch(0.65 0.18 150 / 15%)' : 'oklch(0.22 0 0)',
                          color: a.attiva ? 'oklch(0.65 0.18 150)' : 'oklch(0.45 0 0)',
                        }}>
                        {a.attiva ? 'Attiva' : 'Inattiva'}
                      </span>
                      <p className="text-sm flex-1" style={{ color: 'oklch(0.85 0 0)' }}>
                        {(a as any).schede?.nome ?? 'Scheda sconosciuta'}
                      </p>
                      <p className="text-xs" style={{ color: 'oklch(0.40 0 0)' }}>
                        Dal {new Date(a.data_inizio).toLocaleDateString('it-IT')}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Check-in benessere */}
                {dettaglio.ultimoCheckin && (
                  <div className="rounded-2xl overflow-hidden"
                    style={{ background: 'oklch(0.18 0 0)', border: '1px solid oklch(1 0 0 / 6%)' }}>
                    <div className="px-4 py-3 flex items-center justify-between"
                      style={{ borderBottom: '1px solid oklch(1 0 0 / 6%)' }}>
                      <div className="flex items-center gap-2">
                        <FontAwesomeIcon icon={faHeart} style={{ color: 'oklch(0.75 0.15 27)' }} />
                        <p className="font-bold text-sm" style={{ color: 'oklch(0.97 0 0)' }}>Ultimo check-in</p>
                      </div>
                      <p className="text-xs" style={{ color: 'oklch(0.45 0 0)' }}>
                        {new Date(dettaglio.ultimoCheckin.data).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })}
                      </p>
                    </div>
                    <div className="grid grid-cols-4 gap-0">
                      {[
                        { label: 'Energia', value: dettaglio.ultimoCheckin.energia, warn: dettaglio.ultimoCheckin.energia <= 2 },
                        { label: 'Sonno', value: dettaglio.ultimoCheckin.sonno, warn: dettaglio.ultimoCheckin.sonno <= 2 },
                        { label: 'Stress ↑', value: dettaglio.ultimoCheckin.stress, warn: dettaglio.ultimoCheckin.stress >= 4 },
                        { label: 'Motiv.', value: dettaglio.ultimoCheckin.motivazione, warn: dettaglio.ultimoCheckin.motivazione <= 2 },
                      ].map((item, i) => (
                        <div key={item.label} className="p-4 text-center"
                          style={{ borderRight: i < 3 ? '1px solid oklch(1 0 0 / 6%)' : 'none' }}>
                          <p className="text-xl font-black"
                            style={{ color: item.warn ? 'oklch(0.75 0.15 27)' : 'oklch(0.97 0 0)' }}>
                            {item.value}/5
                          </p>
                          <p className="text-xs mt-1" style={{ color: 'oklch(0.45 0 0)' }}>{item.label}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Peso */}
                {dettaglio.misurazioni.length > 0 && (
                  <div className="rounded-2xl overflow-hidden"
                    style={{ background: 'oklch(0.18 0 0)', border: '1px solid oklch(1 0 0 / 6%)' }}>
                    <div className="px-4 py-3 flex items-center justify-between"
                      style={{ borderBottom: '1px solid oklch(1 0 0 / 6%)' }}>
                      <div className="flex items-center gap-2">
                        <FontAwesomeIcon icon={faWeightScale} style={{ color: 'oklch(0.60 0.15 200)' }} />
                        <p className="font-bold text-sm" style={{ color: 'oklch(0.97 0 0)' }}>Peso corporeo</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <p className="text-lg font-black" style={{ color: 'oklch(0.97 0 0)' }}>
                          {ultimoPeso} kg
                        </p>
                        {deltaPeso !== null && (
                          <span className="text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1"
                            style={{
                              background: deltaPeso === 0 ? 'oklch(0.22 0 0)' : deltaPeso > 0 ? 'oklch(0.60 0.15 200 / 15%)' : 'oklch(0.65 0.18 150 / 15%)',
                              color: deltaPeso === 0 ? 'oklch(0.50 0 0)' : deltaPeso > 0 ? 'oklch(0.60 0.15 200)' : 'oklch(0.65 0.18 150)',
                            }}>
                            <FontAwesomeIcon icon={deltaPeso > 0 ? faArrowTrendUp : deltaPeso < 0 ? faArrowTrendDown : faMinus} />
                            {deltaPeso > 0 ? `+${deltaPeso}` : deltaPeso} kg
                          </span>
                        )}
                      </div>
                    </div>
                    {dettaglio.misurazioni.length >= 2 && (
                      <div className="p-4" style={{ height: 120 }}>
                        <WeightChart data={dettaglio.misurazioni} />
                      </div>
                    )}
                  </div>
                )}

                {/* Ultime sessioni */}
                <div className="rounded-2xl overflow-hidden"
                  style={{ background: 'oklch(0.18 0 0)', border: '1px solid oklch(1 0 0 / 6%)' }}>
                  <div className="px-4 py-3 flex items-center gap-2"
                    style={{ borderBottom: '1px solid oklch(1 0 0 / 6%)' }}>
                    <FontAwesomeIcon icon={faChartBar} style={{ color: 'oklch(0.65 0.18 150)' }} />
                    <p className="font-bold text-sm" style={{ color: 'oklch(0.97 0 0)' }}>Ultime sessioni</p>
                  </div>
                  {dettaglio.sessioni.length === 0 ? (
                    <p className="px-4 py-3 text-sm" style={{ color: 'oklch(0.45 0 0)' }}>Nessuna sessione ancora</p>
                  ) : dettaglio.sessioni.slice(0, 8).map((s, i) => (
                    <div key={s.id} className="flex items-center gap-3 px-4 py-3"
                      style={{ borderBottom: i < Math.min(dettaglio.sessioni.length, 8) - 1 ? '1px solid oklch(1 0 0 / 4%)' : 'none' }}>
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{
                          background: s.completata ? 'oklch(0.65 0.18 150 / 15%)' : 'oklch(0.75 0.15 27 / 15%)',
                          color: s.completata ? 'oklch(0.65 0.18 150)' : 'oklch(0.75 0.15 27)',
                        }}>
                        <FontAwesomeIcon icon={s.completata ? faCircleCheck : faPause} className="text-xs" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate" style={{ color: 'oklch(0.85 0 0)' }}>
                          {(s as any).scheda_giorni?.nome ?? 'Allenamento'}
                        </p>
                        <p className="text-xs" style={{ color: 'oklch(0.45 0 0)' }}>
                          {new Date(s.data).toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' })}
                          {formatDurata(s.durata_secondi) && ` · ${formatDurata(s.durata_secondi)}`}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

              </div>

                {/* Bottone analytics avanzate */}
                <div className="pt-2 pb-4">
                  <Link
                    href={`/coach/clienti/${clienteAperto.cliente_id}/analytics`}
                    className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-bold text-sm transition-all active:scale-95"
                    style={{ background: 'oklch(0.70 0.19 46)', color: 'oklch(0.13 0 0)' }}>
                    Analytics avanzate →
                  </Link>
                </div>

              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
