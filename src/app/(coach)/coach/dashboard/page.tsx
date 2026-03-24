import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faUsers, faClipboardList, faCircleCheck, faHand } from '@fortawesome/free-solid-svg-icons'

export default async function CoachDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('*').eq('id', user.id).single()
  if (profile?.role !== 'coach') redirect('/cliente/dashboard')

  const { data: clienti } = await supabase
    .from('coach_clienti')
    .select(`cliente_id, created_at, profiles!coach_clienti_cliente_id_fkey (id, full_name)`)
    .eq('coach_id', user.id)

  const { data: schede } = await supabase
    .from('schede').select('id').eq('coach_id', user.id)

  const { data: assegnazioni } = await supabase
    .from('assegnazioni').select('id').eq('coach_id', user.id).eq('attiva', true)

  const stats = [
    { label: 'Clienti attivi', value: clienti?.length ?? 0, icon: faUsers, color: 'oklch(0.60 0.15 200)' },
    { label: 'Schede create', value: schede?.length ?? 0, icon: faClipboardList, color: 'oklch(0.70 0.19 46)' },
    { label: 'Schede assegnate', value: assegnazioni?.length ?? 0, icon: faCircleCheck, color: 'oklch(0.65 0.18 150)' },
  ]

  const ora = new Date().getHours()
  const saluto = ora < 12 ? 'Buongiorno' : ora < 18 ? 'Buon pomeriggio' : 'Buonasera'

  return (
    <div className="space-y-8 max-w-5xl">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium mb-1" style={{ color: 'oklch(0.70 0.19 46)' }}>
            {saluto} <FontAwesomeIcon icon={faHand} />
          </p>
          <h1 className="text-4xl font-black tracking-tight" style={{ color: 'oklch(0.97 0 0)' }}>
            {profile.full_name}
          </h1>
          <p className="mt-1 text-sm" style={{ color: 'oklch(0.50 0 0)' }}>
            {new Date().toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
        <a
          href="/coach/clienti"
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-95"
          style={{ background: 'oklch(0.70 0.19 46)', color: 'oklch(0.13 0 0)' }}
        >
          + Nuovo cliente
        </a>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-2xl p-6 space-y-4"
            style={{ background: 'oklch(0.18 0 0)', border: '1px solid oklch(1 0 0 / 6%)' }}
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium" style={{ color: 'oklch(0.50 0 0)' }}>{stat.label}</p>
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center text-base"
                style={{ background: `${stat.color} / 15%`, border: `1px solid ${stat.color} / 20%` }}
              >
                <FontAwesomeIcon icon={stat.icon} />
              </div>
            </div>
            <p className="text-5xl font-black" style={{ color: stat.color }}>
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      {/* Clienti recenti */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{ background: 'oklch(0.18 0 0)', border: '1px solid oklch(1 0 0 / 6%)' }}
      >
        <div
          className="px-6 py-4 flex items-center justify-between"
          style={{ borderBottom: '1px solid oklch(1 0 0 / 6%)' }}
        >
          <h2 className="font-bold" style={{ color: 'oklch(0.97 0 0)' }}>I tuoi clienti</h2>
          <a
            href="/coach/clienti"
            className="text-sm font-medium transition-opacity hover:opacity-70"
            style={{ color: 'oklch(0.70 0.19 46)' }}
          >
            Vedi tutti →
          </a>
        </div>

        {(clienti?.length ?? 0) === 0 ? (
          <div className="py-16 text-center space-y-3">
            <div className="text-5xl"><FontAwesomeIcon icon={faUsers} /></div>
            <p className="font-semibold" style={{ color: 'oklch(0.97 0 0)' }}>Nessun cliente ancora</p>
            <p className="text-sm" style={{ color: 'oklch(0.45 0 0)' }}>
              Inizia aggiungendo il tuo primo cliente
            </p>
            <a
              href="/coach/clienti"
              className="inline-flex items-center gap-2 mt-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all"
              style={{ background: 'oklch(0.70 0.19 46)', color: 'oklch(0.13 0 0)' }}
            >
              + Aggiungi cliente
            </a>
          </div>
        ) : (
          <div>
            {clienti?.slice(0, 6).map((c: any, i: number) => (
              <div
                key={c.cliente_id}
                className="flex items-center gap-4 px-6 py-4 transition-colors hover:bg-white/2"
                style={{ borderBottom: i < (clienti.length - 1) ? '1px solid oklch(1 0 0 / 4%)' : 'none' }}
              >
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                  style={{ background: 'oklch(0.70 0.19 46 / 15%)', color: 'oklch(0.70 0.19 46)' }}
                >
                  {c.profiles?.full_name?.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm" style={{ color: 'oklch(0.97 0 0)' }}>
                    {c.profiles?.full_name}
                  </p>
                  <p className="text-xs" style={{ color: 'oklch(0.45 0 0)' }}>
                    Aggiunto il {new Date(c.created_at).toLocaleDateString('it-IT')}
                  </p>
                </div>
                <div
                  className="text-xs font-medium px-3 py-1 rounded-full"
                  style={{ background: 'oklch(0.65 0.18 150 / 15%)', color: 'oklch(0.65 0.18 150)' }}
                >
                  Attivo
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
