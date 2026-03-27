import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faDumbbell, faCalendarDays, faHand, faClipboardList, faPersonRunning, faCircleCheck, faPause } from '@fortawesome/free-solid-svg-icons'
import SessioniList from '@/components/cliente/SessioniList'
import ClienteOnboarding from '@/components/shared/ClienteOnboarding'

export default async function ClienteDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('*').eq('id', user.id).single()
  if (profile?.role !== 'cliente') redirect('/coach/dashboard')

  const inizioSettimana = new Date()
  inizioSettimana.setDate(inizioSettimana.getDate() - inizioSettimana.getDay())
  inizioSettimana.setHours(0, 0, 0, 0)

  const [assegnazioniRes, ultimeSessioniRes, totaleRes, settimanaRes] = await Promise.all([
    supabase.from('assegnazioni')
      .select(`id, data_inizio, data_fine, attiva, pdf_alimentare_url, schede ( id, nome, descrizione, scheda_giorni ( id, nome, ordine ) )`)
      .eq('cliente_id', user.id).eq('attiva', true).order('created_at', { ascending: false }),
    supabase.from('sessioni')
      .select(`id, data, completata, scheda_giorni ( nome )`)
      .eq('cliente_id', user.id).order('data', { ascending: false }).limit(5),
    supabase.from('sessioni').select('id', { count: 'exact' }).eq('cliente_id', user.id),
    supabase.from('sessioni').select('id', { count: 'exact' })
      .eq('cliente_id', user.id).gte('data', inizioSettimana.toISOString()),
  ])

  const assegnazioni = assegnazioniRes.data
  const ultimeSessioni = ultimeSessioniRes.data
  const totaleSessioni = totaleRes.count
  const sessioniSettimana = settimanaRes.count

  const ora = new Date().getHours()
  const saluto = ora < 12 ? 'Buongiorno' : ora < 18 ? 'Buon pomeriggio' : 'Buonasera'

  const schedaAttiva = assegnazioni && assegnazioni.length > 0 ? (assegnazioni[0] as any) : null

  return (
    <div className="space-y-8 max-w-5xl">
      <ClienteOnboarding />
      {/* Header */}
      <div>
        <p className="text-sm font-medium mb-1" style={{ color: 'oklch(0.60 0.15 200)' }}>
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
          { label: 'Sessioni totali', value: totaleSessioni ?? 0, icon: faDumbbell, color: 'oklch(0.60 0.15 200)' },
          { label: 'Questa settimana', value: sessioniSettimana ?? 0, icon: faCalendarDays, color: 'oklch(0.70 0.19 46)' },
        ].map((stat) => (
          <div key={stat.label} className="rounded-2xl p-6 space-y-3"
            style={{ background: 'oklch(0.18 0 0)', border: '1px solid oklch(1 0 0 / 6%)' }}>
            <div className="flex items-center justify-between">
              <p className="text-sm" style={{ color: 'oklch(0.50 0 0)' }}>{stat.label}</p>
              <FontAwesomeIcon icon={stat.icon} className="text-2xl" />
            </div>
            <p className="text-5xl font-black" style={{ color: stat.color }}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Scheda attiva */}
      <div className="rounded-2xl overflow-hidden"
        style={{ background: 'oklch(0.18 0 0)', border: '1px solid oklch(1 0 0 / 6%)' }}>
        <div className="px-6 py-4 flex items-center justify-between"
          style={{ borderBottom: '1px solid oklch(1 0 0 / 6%)' }}>
          <h2 className="font-bold" style={{ color: 'oklch(0.97 0 0)' }}>La tua scheda attiva</h2>
          {schedaAttiva && (
            <Link href="/cliente/allenamento"
              className="text-sm font-medium transition-opacity hover:opacity-70"
              style={{ color: 'oklch(0.60 0.15 200)' }}>
              Inizia allenamento →
            </Link>
          )}
        </div>

        {!schedaAttiva ? (
          <div className="py-16 text-center space-y-3">
            <p className="text-5xl"><FontAwesomeIcon icon={faClipboardList} /></p>
            <p className="font-semibold" style={{ color: 'oklch(0.97 0 0)' }}>Nessuna scheda assegnata</p>
            <p className="text-sm" style={{ color: 'oklch(0.45 0 0)' }}>
              Il tuo coach non ti ha ancora assegnato una scheda
            </p>
          </div>
        ) : (
          <div className="p-6 space-y-4">
            <div>
              <h3 className="text-xl font-bold" style={{ color: 'oklch(0.97 0 0)' }}>
                {schedaAttiva.schede?.nome}
              </h3>
              {schedaAttiva.schede?.descrizione && (
                <p className="text-sm mt-1" style={{ color: 'oklch(0.50 0 0)' }}>
                  {schedaAttiva.schede.descrizione}
                </p>
              )}
              <p className="text-xs mt-2" style={{ color: 'oklch(0.40 0 0)' }}>
                Attiva dal {new Date(schedaAttiva.data_inizio).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })}
                {schedaAttiva.data_fine ? ` · Scade il ${new Date(schedaAttiva.data_fine).toLocaleDateString('it-IT')}` : ''}
              </p>
            </div>

            {/* Giorni della scheda */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {schedaAttiva.schede?.scheda_giorni
                ?.sort((a: any, b: any) => a.ordine - b.ordine)
                .map((giorno: any) => (
                  <Link key={giorno.id}
                    href={`/cliente/allenamento?giorno=${giorno.id}&assegnazione=${schedaAttiva.id}`}
                    className="p-4 rounded-xl transition-all hover:opacity-80 active:scale-95"
                    style={{ background: 'oklch(0.22 0 0)', border: '1px solid oklch(1 0 0 / 8%)' }}>
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold mb-2"
                      style={{ background: 'oklch(0.60 0.15 200 / 20%)', color: 'oklch(0.60 0.15 200)' }}>
                      {giorno.ordine + 1}
                    </div>
                    <p className="text-sm font-semibold" style={{ color: 'oklch(0.97 0 0)' }}>
                      {giorno.nome}
                    </p>
                    <p className="text-xs mt-1" style={{ color: 'oklch(0.60 0.15 200)' }}>
                      Inizia →
                    </p>
                  </Link>
                ))}
            </div>

            {/* PDF Alimentare */}
            {schedaAttiva.pdf_alimentare_url && (
              <a href={schedaAttiva.pdf_alimentare_url} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-3 p-4 rounded-xl transition-all hover:opacity-80 active:scale-95"
                style={{ background: 'oklch(0.65 0.18 150 / 8%)', border: '1px solid oklch(0.65 0.18 150 / 25%)' }}>
                <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 text-lg"
                  style={{ background: 'oklch(0.65 0.18 150 / 20%)', color: 'oklch(0.65 0.18 150)' }}>
                  📄
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm" style={{ color: 'oklch(0.97 0 0)' }}>Scheda alimentare</p>
                  <p className="text-xs mt-0.5" style={{ color: 'oklch(0.50 0 0)' }}>Apri il PDF del tuo coach →</p>
                </div>
              </a>
            )}
          </div>
        )}
      </div>

      {/* Ultime sessioni */}
      <div className="rounded-2xl overflow-hidden"
        style={{ background: 'oklch(0.18 0 0)', border: '1px solid oklch(1 0 0 / 6%)' }}>
        <div className="px-6 py-4 flex items-center justify-between"
          style={{ borderBottom: '1px solid oklch(1 0 0 / 6%)' }}>
          <h2 className="font-bold" style={{ color: 'oklch(0.97 0 0)' }}>Ultimi allenamenti</h2>
          <Link href="/cliente/progressi"
            className="text-sm font-medium transition-opacity hover:opacity-70"
            style={{ color: 'oklch(0.60 0.15 200)' }}>
            Vedi tutti →
          </Link>
        </div>

        {!ultimeSessioni || ultimeSessioni.length === 0 ? (
          <div className="py-12 text-center space-y-3">
            <p className="text-4xl"><FontAwesomeIcon icon={faPersonRunning} /></p>
            <p className="font-semibold" style={{ color: 'oklch(0.97 0 0)' }}>Nessun allenamento ancora</p>
            <p className="text-sm" style={{ color: 'oklch(0.45 0 0)' }}>
              Inizia il tuo primo allenamento dalla scheda qui sopra
            </p>
          </div>
        ) : (
          <SessioniList sessioni={(ultimeSessioni as any[]).map(s => ({
            id: s.id,
            data: s.data,
            completata: s.completata,
            scheda_giorni: s.scheda_giorni ?? null,
          }))} />
        )}
      </div>
    </div>
  )
}
