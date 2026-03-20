'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface ClienteStats {
  id: string
  full_name: string | null
  schede_attive: number
  totale_sessioni: number
  ultima_sessione: string | null
  giorni_inattivo: number | null
}

export default function AnalyticsPage() {
  const [clientiStats, setClientiStats] = useState<ClienteStats[]>([])
  const [loading, setLoading] = useState(true)
  const [totaleClienti, setTotaleClienti] = useState(0)
  const [totaleSchede, setTotaleSchede] = useState(0)
  const [totaleAssegnazioni, setTotaleAssegnazioni] = useState(0)
  const [totaleSessioni, setTotaleSessioni] = useState(0)

  const supabase = createClient()

  const fetchAnalytics = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Clienti del coach
    const { data: clientiData } = await supabase
      .from('coach_clienti')
      .select('cliente_id, profiles!coach_clienti_cliente_id_fkey (id, full_name)')
      .eq('coach_id', user.id)

    setTotaleClienti(clientiData?.length ?? 0)

    // Schede del coach
    const { data: schedeData } = await supabase
      .from('schede').select('id').eq('coach_id', user.id)
    setTotaleSchede(schedeData?.length ?? 0)

    // Assegnazioni attive
    const { data: assegnazioniData } = await supabase
      .from('assegnazioni').select('id').eq('coach_id', user.id).eq('attiva', true)
    setTotaleAssegnazioni(assegnazioniData?.length ?? 0)

    // Per ogni cliente calcola le statistiche
    const stats: ClienteStats[] = []

    for (const c of (clientiData ?? [])) {
      const clienteId = c.cliente_id
      const profile = (c as any).profiles

      // Schede attive assegnate
      const { data: schedeAttive } = await supabase
        .from('assegnazioni').select('id')
        .eq('cliente_id', clienteId).eq('coach_id', user.id).eq('attiva', true)

      // Sessioni totali
      const { data: sessioni } = await supabase
        .from('sessioni').select('id, data')
        .eq('cliente_id', clienteId)
        .order('data', { ascending: false })

      const ultimaSessione = sessioni && sessioni.length > 0 ? sessioni[0].data : null
      const giorniInattivo = ultimaSessione
        ? Math.floor((Date.now() - new Date(ultimaSessione).getTime()) / (1000 * 60 * 60 * 24))
        : null

      setTotaleSessioni(prev => prev + (sessioni?.length ?? 0))

      stats.push({
        id: clienteId,
        full_name: profile?.full_name,
        schede_attive: schedeAttive?.length ?? 0,
        totale_sessioni: sessioni?.length ?? 0,
        ultima_sessione: ultimaSessione,
        giorni_inattivo: giorniInattivo,
      })
    }

    // Ordina per giorni inattivo (chi non si allena da più tempo prima)
    stats.sort((a, b) => {
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

  const clientiAttivi = clientiStats.filter(c => c.giorni_inattivo !== null && c.giorni_inattivo <= 7).length
  const clientiARischio = clientiStats.filter(c => c.giorni_inattivo !== null && c.giorni_inattivo > 14).length
  const clientiMaiAllenati = clientiStats.filter(c => c.totale_sessioni === 0).length

  const overviewStats = [
    { label: 'Clienti totali', value: totaleClienti, icon: '👥', color: 'oklch(0.60 0.15 200)' },
    { label: 'Schede create', value: totaleSchede, icon: '📋', color: 'oklch(0.70 0.19 46)' },
    { label: 'Assegnazioni attive', value: totaleAssegnazioni, icon: '✅', color: 'oklch(0.65 0.18 150)' },
    { label: 'Sessioni totali', value: totaleSessioni, icon: '🏋️', color: 'oklch(0.65 0.15 300)' },
  ]

  return (
    <div className="space-y-8 max-w-5xl">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-black tracking-tight" style={{ color: 'oklch(0.97 0 0)' }}>
          Analytics
        </h1>
        <p className="mt-1 text-sm" style={{ color: 'oklch(0.50 0 0)' }}>
          Panoramica completa dei tuoi clienti e del loro progresso
        </p>
      </div>

      {/* Stats overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {overviewStats.map((stat) => (
          <div key={stat.label} className="rounded-2xl p-5 space-y-3"
            style={{ background: 'oklch(0.18 0 0)', border: '1px solid oklch(1 0 0 / 6%)' }}>
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium" style={{ color: 'oklch(0.50 0 0)' }}>{stat.label}</p>
              <span className="text-xl">{stat.icon}</span>
            </div>
            <p className="text-4xl font-black" style={{ color: stat.color }}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Stato clienti summary */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Attivi questa settimana', value: clientiAttivi, color: 'oklch(0.65 0.18 150)', icon: '🟢' },
          { label: 'A rischio abbandono', value: clientiARischio, color: 'oklch(0.75 0.15 27)', icon: '🔴' },
          { label: 'Mai allenati', value: clientiMaiAllenati, color: 'oklch(0.55 0 0)', icon: '⚪' },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl p-5 flex items-center gap-4"
            style={{ background: 'oklch(0.18 0 0)', border: '1px solid oklch(1 0 0 / 6%)' }}>
            <span className="text-2xl">{s.icon}</span>
            <div>
              <p className="text-2xl font-black" style={{ color: s.color }}>{s.value}</p>
              <p className="text-xs mt-0.5" style={{ color: 'oklch(0.50 0 0)' }}>{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Lista clienti con stato */}
      <div className="rounded-2xl overflow-hidden"
        style={{ background: 'oklch(0.18 0 0)', border: '1px solid oklch(1 0 0 / 6%)' }}>
        <div className="px-6 py-4 flex items-center justify-between"
          style={{ borderBottom: '1px solid oklch(1 0 0 / 6%)' }}>
          <h2 className="font-bold" style={{ color: 'oklch(0.97 0 0)' }}>Stato clienti</h2>
          <p className="text-xs" style={{ color: 'oklch(0.45 0 0)' }}>
            Ordinati per inattività
          </p>
        </div>

        {loading ? (
          <div className="py-16 text-center">
            <p className="text-sm" style={{ color: 'oklch(0.45 0 0)' }}>Caricamento analytics...</p>
          </div>
        ) : clientiStats.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <p className="text-5xl">📊</p>
            <p className="font-semibold" style={{ color: 'oklch(0.97 0 0)' }}>Nessun cliente ancora</p>
            <p className="text-sm" style={{ color: 'oklch(0.45 0 0)' }}>
              Aggiungi i tuoi clienti per vedere le analytics
            </p>
          </div>
        ) : (
          <div>
            {/* Header colonne */}
            <div className="px-6 py-3 grid grid-cols-12 gap-4"
              style={{ borderBottom: '1px solid oklch(1 0 0 / 4%)', background: 'oklch(0.15 0 0)' }}>
              <p className="col-span-4 text-xs font-semibold uppercase tracking-wider" style={{ color: 'oklch(0.40 0 0)' }}>Cliente</p>
              <p className="col-span-2 text-xs font-semibold uppercase tracking-wider text-center" style={{ color: 'oklch(0.40 0 0)' }}>Schede</p>
              <p className="col-span-2 text-xs font-semibold uppercase tracking-wider text-center" style={{ color: 'oklch(0.40 0 0)' }}>Sessioni</p>
              <p className="col-span-2 text-xs font-semibold uppercase tracking-wider text-center" style={{ color: 'oklch(0.40 0 0)' }}>Ultima sessione</p>
              <p className="col-span-2 text-xs font-semibold uppercase tracking-wider text-center" style={{ color: 'oklch(0.40 0 0)' }}>Stato</p>
            </div>

            {clientiStats.map((c, i) => {
              const stato = getStatoCliente(c.giorni_inattivo, c.totale_sessioni)
              return (
                <div key={c.id}
                  className="px-6 py-4 grid grid-cols-12 gap-4 items-center"
                  style={{ borderBottom: i < clientiStats.length - 1 ? '1px solid oklch(1 0 0 / 4%)' : 'none' }}>
                  {/* Cliente */}
                  <div className="col-span-4 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                      style={{ background: 'oklch(0.70 0.19 46 / 15%)', color: 'oklch(0.70 0.19 46)' }}>
                      {c.full_name?.charAt(0).toUpperCase()}
                    </div>
                    <p className="font-semibold text-sm truncate" style={{ color: 'oklch(0.97 0 0)' }}>
                      {c.full_name}
                    </p>
                  </div>

                  {/* Schede attive */}
                  <div className="col-span-2 text-center">
                    <p className="text-sm font-semibold" style={{ color: c.schede_attive > 0 ? 'oklch(0.65 0.18 150)' : 'oklch(0.45 0 0)' }}>
                      {c.schede_attive}
                    </p>
                    <p className="text-xs" style={{ color: 'oklch(0.40 0 0)' }}>attive</p>
                  </div>

                  {/* Sessioni */}
                  <div className="col-span-2 text-center">
                    <p className="text-sm font-semibold" style={{ color: 'oklch(0.97 0 0)' }}>
                      {c.totale_sessioni}
                    </p>
                    <p className="text-xs" style={{ color: 'oklch(0.40 0 0)' }}>totali</p>
                  </div>

                  {/* Ultima sessione */}
                  <div className="col-span-2 text-center">
                    {c.ultima_sessione ? (
                      <>
                        <p className="text-sm font-medium" style={{ color: 'oklch(0.97 0 0)' }}>
                          {c.giorni_inattivo === 0 ? 'Oggi' : c.giorni_inattivo === 1 ? 'Ieri' : `${c.giorni_inattivo}gg fa`}
                        </p>
                        <p className="text-xs" style={{ color: 'oklch(0.40 0 0)' }}>
                          {new Date(c.ultima_sessione).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })}
                        </p>
                      </>
                    ) : (
                      <p className="text-sm" style={{ color: 'oklch(0.40 0 0)' }}>—</p>
                    )}
                  </div>

                  {/* Stato */}
                  <div className="col-span-2 flex justify-center">
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
      </div>
    </div>
  )
}
