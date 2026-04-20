'use client'

import { use, useEffect, useMemo, useState } from 'react'
import BynariLoader from '@/components/shared/BynariLoader'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import AnalyticsHeader from '@/components/coach/analytics/AnalyticsHeader'
import ProgressioneEsercizi from '@/components/coach/analytics/ProgressioneEsercizi'
import ClienteInsights from '@/components/coach/analytics/ClienteInsights'
import AltreVisteLinks from '@/components/coach/analytics/AltreVisteLinks'

interface Assegnazione {
  id: string
  data_inizio: string | null
  data_fine: string | null
  attiva: boolean
  schede: { id: string; nome: string } | null
}

interface PageData {
  nomeCliente: string
  assegnazioni: Assegnazione[]
  totSessioni: number
  ultimoPeso: number | null
  clienteDal: string | null
  obiettivo: string | null
  frequenzaDichiarata: number | null
}

export default function ClienteAnalyticsPage({
  params,
}: {
  params: Promise<{ clienteId: string }>
}) {
  const { clienteId } = use(params)
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const [data, setData] = useState<PageData | null>(null)
  const [stato, setStato] = useState<'loading' | 'forbidden' | 'ok'>('loading')

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/login'); return }

      const [profileRes, relazioneRes] = await Promise.all([
        supabase.from('profiles').select('role').eq('id', user.id).single(),
        supabase.from('coach_clienti')
          .select(`
            coach_id,
            profiles!coach_clienti_cliente_id_fkey(
              full_name,
              anamnesi(allenamenti_settimana)
            )
          `)
          .eq('cliente_id', clienteId),
      ])

      if (profileRes.data?.role !== 'coach') { router.replace('/login'); return }

      const relazione = (relazioneRes.data ?? []).find((r: any) => r.coach_id === user.id)
      if (!relazione) { setStato('forbidden'); return }

      const clienteProfile = (relazione as any).profiles
      const anamnesiData = Array.isArray(clienteProfile?.anamnesi)
        ? clienteProfile.anamnesi[0]
        : clienteProfile?.anamnesi

      const [assegRes, sessCountRes, pesoRes, primaSessioneRes] = await Promise.all([
        supabase.from('assegnazioni')
          .select('id, data_inizio, data_fine, attiva, schede ( id, nome )')
          .eq('cliente_id', clienteId)
          .order('created_at', { ascending: false }),
        supabase.from('sessioni')
          .select('id', { count: 'exact', head: true })
          .eq('cliente_id', clienteId)
          .eq('completata', true),
        supabase.from('misurazioni')
          .select('peso_kg, data')
          .eq('cliente_id', clienteId)
          .order('data', { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase.from('sessioni')
          .select('data')
          .eq('cliente_id', clienteId)
          .eq('completata', true)
          .order('data', { ascending: true })
          .limit(1)
          .maybeSingle(),
      ])

      setData({
        nomeCliente: clienteProfile?.full_name ?? 'Cliente',
        assegnazioni: (assegRes.data ?? []) as unknown as Assegnazione[],
        totSessioni: sessCountRes.count ?? 0,
        ultimoPeso: pesoRes.data?.peso_kg ?? null,
        clienteDal: primaSessioneRes.data?.data ?? null,
        obiettivo: null,
        frequenzaDichiarata: anamnesiData?.allenamenti_settimana ?? null,
      })
      setStato('ok')
    }
    fetchData()
  }, [clienteId, router, supabase])

  if (stato === 'loading') return <BynariLoader file="blue" size={80} />

  if (stato === 'forbidden') {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-sm" style={{ color: 'var(--c-45)' }}>Cliente non trovato.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Breadcrumb */}
      <Link href="/coach/analytics" className="text-sm hover:opacity-70 transition-opacity"
        style={{ color: 'var(--c-50)', display: 'inline-block' }}>
        ← Analytics
      </Link>

      {/* 1. Header: avatar + KPI + schede + periodo */}
      <AnalyticsHeader
        clienteId={clienteId}
        nomeCliente={data!.nomeCliente}
        assegnazioni={data!.assegnazioni}
        totSessioni={data!.totSessioni}
        ultimoPeso={data!.ultimoPeso}
        clienteDal={data!.clienteDal}
      />

      {/* 2. Insights — subito dopo le KPI */}
      <ClienteInsights
        clienteId={clienteId}
        frequenzaDichiarata={data?.frequenzaDichiarata}
        obiettivo={data?.obiettivo}
      />

      {/* 3. Progressione esercizi */}
      <ProgressioneEsercizi
        clienteId={clienteId}
        assegnazioni={data!.assegnazioni}
      />

      {/* 4. Altre viste → sotto-pagine */}
      <AltreVisteLinks clienteId={clienteId} />
    </div>
  )
}
