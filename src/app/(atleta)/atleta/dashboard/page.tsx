import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faDumbbell, faCalendarDays, faClipboardList,
  faCircleCheck, faPause, faPersonRunning, faHand,
} from '@fortawesome/free-solid-svg-icons'

export default async function AtletaDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('*').eq('id', user.id).single()
  if (profile?.role !== 'atleta') redirect('/login')

  // Schede dell'atleta (self-owned)
  const { data: schede } = await supabase
    .from('schede')
    .select(`id, nome, scheda_giorni ( id, nome, ordine )`)
    .eq('coach_id', user.id)
    .order('created_at', { ascending: false })

  // Self-assegnazione attiva (per ottenere assegnazione_id per il logger)
  const { data: assegnazioni } = await supabase
    .from('assegnazioni')
    .select('id, scheda_id, attiva')
    .eq('cliente_id', user.id)
    .eq('coach_id', user.id)
    .eq('attiva', true)
    .limit(1)

  const assegnazioneAttiva = assegnazioni?.[0] ?? null

  // Ultime sessioni
  const { data: ultimeSessioni } = await supabase
    .from('sessioni')
    .select('id, data, completata, scheda_giorni ( nome )')
    .eq('cliente_id', user.id)
    .order('data', { ascending: false })
    .limit(5)

  // Stats
  const { count: totaleSessioni } = await supabase
    .from('sessioni').select('id', { count: 'exact' }).eq('cliente_id', user.id)

  const inizioSettimana = new Date()
  inizioSettimana.setDate(inizioSettimana.getDate() - inizioSettimana.getDay())
  inizioSettimana.setHours(0, 0, 0, 0)
  const { count: sessioniSettimana } = await supabase
    .from('sessioni').select('id', { count: 'exact' })
    .eq('cliente_id', user.id).gte('data', inizioSettimana.toISOString())

  const ora = new Date().getHours()
  const saluto = ora < 12 ? 'Buongiorno' : ora < 18 ? 'Buon pomeriggio' : 'Buonasera'

  // Trova la scheda associata all'assegnazione attiva
  const schedaAttiva = schede?.find(s => s.id === assegnazioneAttiva?.scheda_id) ?? null

  return (
    <div className="space-y-8 max-w-5xl">
      {/* Header */}
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

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        {[
          { label: 'Sessioni totali', value: totaleSessioni ?? 0, icon: faDumbbell, color: 'oklch(0.70 0.19 46)' },
          { label: 'Questa settimana', value: sessioniSettimana ?? 0, icon: faCalendarDays, color: 'oklch(0.60 0.15 200)' },
        ].map((stat) => (
          <div key={stat.label} className="rounded-2xl p-6 space-y-3"
            style={{ background: 'oklch(0.18 0 0)', border: '1px solid oklch(1 0 0 / 6%)' }}>
            <div className="flex items-center justify-between">
              <p className="text-sm" style={{ color: 'oklch(0.50 0 0)' }}>{stat.label}</p>
              <FontAwesomeIcon icon={stat.icon} style={{ color: stat.color }} />
            </div>
            <p className="text-5xl font-black" style={{ color: stat.color }}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Scheda attiva / Allenamento rapido */}
      <div className="rounded-2xl overflow-hidden"
        style={{ background: 'oklch(0.18 0 0)', border: '1px solid oklch(1 0 0 / 6%)' }}>
        <div className="px-6 py-4 flex items-center justify-between"
          style={{ borderBottom: '1px solid oklch(1 0 0 / 6%)' }}>
          <h2 className="font-bold" style={{ color: 'oklch(0.97 0 0)' }}>Allenati ora</h2>
          <Link href="/atleta/schede"
            className="text-sm font-medium" style={{ color: 'oklch(0.70 0.19 46)' }}>
            Gestisci schede →
          </Link>
        </div>

        {!schedaAttiva ? (
          <div className="py-16 text-center space-y-3">
            <p className="text-5xl"><FontAwesomeIcon icon={faClipboardList} /></p>
            <p className="font-semibold" style={{ color: 'oklch(0.97 0 0)' }}>Nessuna scheda attiva</p>
            <p className="text-sm" style={{ color: 'oklch(0.45 0 0)' }}>Crea la tua prima scheda per iniziare</p>
            <Link href="/atleta/schede"
              className="inline-block mt-2 px-5 py-2.5 rounded-xl text-sm font-semibold"
              style={{ background: 'oklch(0.70 0.19 46)', color: 'oklch(0.13 0 0)' }}>
              Crea scheda
            </Link>
          </div>
        ) : (
          <div className="p-6 space-y-4">
            <h3 className="text-xl font-bold" style={{ color: 'oklch(0.97 0 0)' }}>
              {schedaAttiva.nome}
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {schedaAttiva.scheda_giorni
                ?.sort((a: any, b: any) => a.ordine - b.ordine)
                .map((giorno: any) => (
                  <Link key={giorno.id}
                    href={`/atleta/allenamento?giorno=${giorno.id}&assegnazione=${assegnazioneAttiva!.id}`}
                    className="p-4 rounded-xl transition-all hover:opacity-80 active:scale-95"
                    style={{ background: 'oklch(0.22 0 0)', border: '1px solid oklch(1 0 0 / 8%)' }}>
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold mb-2"
                      style={{ background: 'oklch(0.70 0.19 46 / 20%)', color: 'oklch(0.70 0.19 46)' }}>
                      {giorno.ordine + 1}
                    </div>
                    <p className="text-sm font-semibold" style={{ color: 'oklch(0.97 0 0)' }}>
                      {giorno.nome}
                    </p>
                    <p className="text-xs mt-1" style={{ color: 'oklch(0.70 0.19 46)' }}>Inizia →</p>
                  </Link>
                ))}
            </div>
          </div>
        )}
      </div>

      {/* Ultime sessioni */}
      <div className="rounded-2xl overflow-hidden"
        style={{ background: 'oklch(0.18 0 0)', border: '1px solid oklch(1 0 0 / 6%)' }}>
        <div className="px-6 py-4" style={{ borderBottom: '1px solid oklch(1 0 0 / 6%)' }}>
          <h2 className="font-bold" style={{ color: 'oklch(0.97 0 0)' }}>Ultimi allenamenti</h2>
        </div>

        {!ultimeSessioni || ultimeSessioni.length === 0 ? (
          <div className="py-12 text-center space-y-3">
            <p className="text-4xl"><FontAwesomeIcon icon={faPersonRunning} /></p>
            <p className="font-semibold" style={{ color: 'oklch(0.97 0 0)' }}>Nessun allenamento ancora</p>
            <p className="text-sm" style={{ color: 'oklch(0.45 0 0)' }}>Inizia dalla scheda qui sopra</p>
          </div>
        ) : (
          <div>
            {(ultimeSessioni as any[]).map((s, i) => (
              <div key={s.id} className="flex items-center gap-4 px-6 py-4"
                style={{ borderBottom: i < ultimeSessioni.length - 1 ? '1px solid oklch(1 0 0 / 4%)' : 'none' }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: s.completata ? 'oklch(0.65 0.18 150 / 15%)' : 'oklch(0.22 0 0)' }}>
                  <FontAwesomeIcon
                    icon={s.completata ? faCircleCheck : faPause}
                    style={{ color: s.completata ? 'oklch(0.65 0.18 150)' : 'oklch(0.45 0 0)' }} />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-sm" style={{ color: 'oklch(0.97 0 0)' }}>
                    {s.scheda_giorni?.nome ?? 'Allenamento'}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: 'oklch(0.45 0 0)' }}>
                    {new Date(s.data).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })}
                  </p>
                </div>
                <span className="text-xs px-2.5 py-1 rounded-full"
                  style={{
                    background: s.completata ? 'oklch(0.65 0.18 150 / 15%)' : 'oklch(0.22 0 0)',
                    color: s.completata ? 'oklch(0.65 0.18 150)' : 'oklch(0.45 0 0)',
                  }}>
                  {s.completata ? 'Completato' : 'Incompleto'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
