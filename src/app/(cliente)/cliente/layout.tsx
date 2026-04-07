import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ClienteSidebar from '@/components/cliente/ClienteSidebar'
import CheckinGate from '@/components/cliente/CheckinGate'

export default async function ClienteLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('*').eq('id', user.id).single()
  if (profile?.role !== 'cliente') redirect('/coach/dashboard')

  const { data: cc } = await supabase
    .from('coach_clienti')
    .select('dieta_abilitata')
    .eq('cliente_id', user.id)
    .maybeSingle()
  const dietaAbilitata = cc?.dieta_abilitata ?? false

  // Check-in obbligatorio giornaliero
  const oggi = new Date()
  oggi.setHours(0, 0, 0, 0)
  const { data: checkinOggi } = await supabase
    .from('checkin')
    .select('id')
    .eq('cliente_id', user.id)
    .gte('data', oggi.toISOString())
    .maybeSingle()

  return (
    <div className="min-h-screen bg-background">
      <ClienteSidebar profile={profile} dietaAbilitata={dietaAbilitata} />
      {/* Gate check-in obbligatorio — se non ancora fatto oggi */}
      {!checkinOggi && <CheckinGate />}
      {/* Desktop: margin per sidebar. Mobile: padding bottom per bottom nav */}
      <main
        className="lg:ml-64 pb-24 lg:pb-8"
        style={{
          paddingTop: 'calc(env(safe-area-inset-top) + 1rem)',
          paddingLeft: '1rem',
          paddingRight: '1rem',
          paddingBottom: '',
        }}
      >
        {children}
      </main>
    </div>
  )
}
