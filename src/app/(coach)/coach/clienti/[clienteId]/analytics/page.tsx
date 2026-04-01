import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import AnalyticsHeader from '@/components/coach/analytics/AnalyticsHeader'
import ProgressioneEsercizi from '@/components/coach/analytics/ProgressioneEsercizi'
import MassimoMuscoli from '@/components/coach/analytics/MassimoMuscoli'
import PatternBenessere from '@/components/coach/analytics/PatternBenessere'
import AndamentoPeso from '@/components/coach/analytics/AndamentoPeso'
import StoricoSessioni from '@/components/coach/analytics/StoricoSessioni'

export default async function ClienteAnalyticsPage({
  params,
}: {
  params: Promise<{ clienteId: string }>
}) {
  const { clienteId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'coach') redirect('/login')

  const { data: relazioneRows } = await supabase
    .from('coach_clienti')
    .select('coach_id, profiles!coach_clienti_cliente_id_fkey(full_name, email)')
    .eq('cliente_id', clienteId)
  const relazione = (relazioneRows ?? []).find(r => r.coach_id === user.id)
  if (!relazione) notFound()

  const clienteProfile = (relazione as any).profiles as { full_name: string | null; email: string | null } | null
  if (!clienteProfile) notFound()

  const [assegnazioniRes, totSessioniRes, ultimoPesoRes, primaSessioneRes] = await Promise.all([
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

  const cliente = clienteProfile
  const assegnazioni = (assegnazioniRes.data ?? []) as any[]
  const totSessioni = totSessioniRes.count ?? 0
  const ultimoPeso = ultimoPesoRes.data?.peso_kg ?? null
  const clienteDal = primaSessioneRes.data?.data ?? null

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
        nomeCliente={cliente.full_name ?? cliente.email ?? 'Cliente'}
        assegnazioni={assegnazioni}
        totSessioni={totSessioni}
        ultimoPeso={ultimoPeso}
        clienteDal={clienteDal}
      />

      <ProgressioneEsercizi
        clienteId={clienteId}
        assegnazioni={assegnazioni}
      />

      <MassimoMuscoli clienteId={clienteId} />

      <PatternBenessere clienteId={clienteId} />

      <AndamentoPeso clienteId={clienteId} />

      <StoricoSessioni clienteId={clienteId} />
    </div>
  )
}
