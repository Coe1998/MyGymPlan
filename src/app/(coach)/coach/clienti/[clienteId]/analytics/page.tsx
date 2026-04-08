'use client'

import { use, useEffect, useMemo, useState } from 'react'
import BynariLoader from '@/components/shared/BynariLoader'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import AnalyticsHeader from '@/components/coach/analytics/AnalyticsHeader'
import ProgressioneEsercizi from '@/components/coach/analytics/ProgressioneEsercizi'
import MassimoMuscoli from '@/components/coach/analytics/MassimoMuscoli'
import PatternBenessere from '@/components/coach/analytics/PatternBenessere'
import AndamentoPeso from '@/components/coach/analytics/AndamentoPeso'
import StoricoSessioni from '@/components/coach/analytics/StoricoSessioni'
import ClienteInsights from '@/components/coach/analytics/ClienteInsights'

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
              obiettivo, 
              frequenza_settimanale
            )
          `)
          .eq('cliente_id', clienteId),
      ])

      if (profileRes.data?.role !== 'coach') { router.replace('/login'); return }

      const relazione = (relazioneRes.data ?? []).find((r: any) => r.coach_id === user.id)
      if (!relazione) { setStato('forbidden'); return }

      const clienteProfile = (relazione as any).profiles
      const nomeCliente = clienteProfile?.full_name ?? 'Cliente'

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
        nomeCliente,
        assegnazioni: (assegRes.data ?? []) as unknown as Assegnazione[],
        totSessioni: sessCountRes.count ?? 0,
        ultimoPeso: pesoRes.data?.peso_kg ?? null,
        clienteDal: primaSessioneRes.data?.data ?? null,
        obiettivo: clienteProfile?.obiettivo ?? null,
        frequenzaDichiarata: clienteProfile?.frequenza_settimanale ?? null,
      })
      setStato('ok')
    }
    fetchData()
  }, [clienteId, router, supabase])

  if (stato === 'loading') return <BynariLoader file="blue" size={80} />

  if (stato === 'forbidden') {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-sm" style={{ color: 'oklch(0.45 0 0)' }}>Cliente non trovato.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center gap-3">
        <Link
          href="/coach/analytics"
          className="text-sm hover:opacity-70 transition-opacity"
          style={{ color: 'oklch(0.50 0 0)' }}>
          ← Analytics
        </Link>
      </div>

      <AnalyticsHeader
        clienteId={clienteId}
        nomeCliente={data!.nomeCliente}
        assegnazioni={data!.assegnazioni}
        totSessioni={data!.totSessioni}
        ultimoPeso={data!.ultimoPeso}
        clienteDal={data!.clienteDal}
      />

      {/* Sezione Insights Automatici */}
      <div className="mx-5 mt-4">
        <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: 'oklch(0.70 0.19 46)' }}>
          🧠 Insights automatici
        </p>
        <ClienteInsights
          clienteId={clienteId}
          frequenzaDichiarata={data?.frequenzaDichiarata}
          obiettivo={data?.obiettivo}
        />
      </div>

      <ProgressioneEsercizi
        clienteId={clienteId}
        assegnazioni={data!.assegnazioni}
      />

      <MassimoMuscoli clienteId={clienteId} />

      <PatternBenessere clienteId={clienteId} />

      <AndamentoPeso clienteId={clienteId} />

      <StoricoSessioni clienteId={clienteId} />
    </div>
  )
}