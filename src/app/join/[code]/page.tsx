import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function JoinPage({ params }: { params: { code: string } }) {
  const supabase = await createClient()
  const code = params.code

  // Trova il coach dal codice
  const { data: coach } = await supabase
    .from('profiles')
    .select('id, full_name')
    .eq('coach_code', code)
    .eq('role', 'coach')
    .single()

  if (!coach) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ background: 'oklch(0.13 0 0)' }}>
        <div className="text-center space-y-3">
          <p className="text-4xl">❌</p>
          <p className="font-bold text-lg" style={{ color: 'oklch(0.97 0 0)' }}>Link non valido</p>
          <p className="text-sm" style={{ color: 'oklch(0.50 0 0)' }}>Questo link di invito non esiste o è scaduto.</p>
          <a href="/" className="inline-block mt-4 px-5 py-2.5 rounded-xl text-sm font-semibold"
            style={{ background: 'oklch(0.70 0.19 46)', color: 'oklch(0.13 0 0)' }}>
            Vai alla home
          </a>
        </div>
      </div>
    )
  }

  // Controlla se l'utente è già loggato
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    // Utente loggato → controlla che non sia il coach stesso
    if (user.id === coach.id) redirect('/coach/dashboard')

    const { data: profile } = await supabase
      .from('profiles').select('role').eq('id', user.id).single()

    // Se è già cliente di questo coach → dashboard
    const { data: existing } = await supabase
      .from('coach_clienti').select('id')
      .eq('coach_id', coach.id).eq('cliente_id', user.id).single()
    if (existing) redirect('/cliente/dashboard')

    // Se era atleta → aggiorna ruolo a cliente
    if (profile?.role === 'atleta') {
      await supabase.from('profiles').update({ role: 'cliente' }).eq('id', user.id)
    }

    // Crea invito pending (o lo trova se già esiste)
    const { data: invito } = await supabase
      .from('coach_inviti')
      .select('id, stato')
      .eq('coach_id', coach.id)
      .eq('cliente_id', user.id)
      .single()

    if (!invito) {
      await supabase.from('coach_inviti').insert({
        coach_id: coach.id,
        cliente_id: user.id,
        stato: 'pending',
      })
    }

    // Mostra pagina "richiesta inviata"
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ background: 'oklch(0.13 0 0)' }}>
        <div className="w-full max-w-sm text-center space-y-5">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mx-auto"
            style={{ background: 'oklch(0.65 0.18 150 / 15%)', color: 'oklch(0.65 0.18 150)' }}>
            ✓
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-black" style={{ color: 'oklch(0.97 0 0)' }}>Richiesta inviata!</h1>
            <p className="text-sm leading-relaxed" style={{ color: 'oklch(0.55 0 0)' }}>
              La tua richiesta di collegamento al coach{' '}
              <strong style={{ color: 'oklch(0.97 0 0)' }}>{coach.full_name}</strong>{' '}
              è stata inviata. Riceverai accesso non appena verrà approvata.
            </p>
          </div>
          <a href="/atleta/dashboard"
            className="inline-block px-6 py-3 rounded-xl text-sm font-semibold"
            style={{ background: 'oklch(0.22 0 0)', color: 'oklch(0.70 0 0)', border: '1px solid oklch(1 0 0 / 10%)' }}>
            Torna alla dashboard
          </a>
        </div>
      </div>
    )
  }

  // Utente NON loggato → pagina di benvenuto con scelta login/register
  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: 'oklch(0.13 0 0)' }}>
      <div className="w-full max-w-sm space-y-8">
        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm"
            style={{ background: 'oklch(0.70 0.19 46)', color: 'oklch(0.11 0 0)' }}>B</div>
          <span className="font-black text-lg tracking-tight" style={{ color: 'oklch(0.97 0 0)' }}>BYNARI</span>
        </div>

        {/* Card invito */}
        <div className="rounded-2xl p-6 space-y-4"
          style={{ background: 'oklch(0.18 0 0)', border: '1px solid oklch(0.70 0.19 46 / 30%)' }}>
          <div className="w-12 h-12 rounded-xl flex items-center justify-center text-xl font-black"
            style={{ background: 'oklch(0.70 0.19 46 / 15%)', color: 'oklch(0.70 0.19 46)' }}>
            {coach.full_name?.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: 'oklch(0.70 0.19 46)' }}>
              Invito personale
            </p>
            <h1 className="text-xl font-black" style={{ color: 'oklch(0.97 0 0)' }}>
              {coach.full_name} ti ha invitato
            </h1>
            <p className="text-sm mt-1 leading-relaxed" style={{ color: 'oklch(0.55 0 0)' }}>
              Accedi o crea un account gratuito per iniziare ad allenarti con il tuo coach su Bynari.
            </p>
          </div>
        </div>

        {/* CTA */}
        <div className="space-y-3">
          <a href={`/register?code=${code}`}
            className="w-full py-3 rounded-xl font-bold text-sm text-center block transition-all hover:scale-105 active:scale-95"
            style={{ background: 'oklch(0.70 0.19 46)', color: 'oklch(0.11 0 0)' }}>
            Crea account gratuito →
          </a>
          <a href={`/login?code=${code}`}
            className="w-full py-3 rounded-xl font-bold text-sm text-center block transition-all"
            style={{ background: 'oklch(0.22 0 0)', color: 'oklch(0.70 0 0)', border: '1px solid oklch(1 0 0 / 10%)' }}>
            Ho già un account → Accedi
          </a>
        </div>
      </div>
    </div>
  )
}
