import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faDumbbell, faCalendarDays, faHand, faPersonRunning } from '@fortawesome/free-solid-svg-icons'
import SessioniList from '@/components/cliente/SessioniList'
import ClienteOnboarding from '@/components/shared/ClienteOnboarding'
import SchedeSelector from '@/components/cliente/SchedeSelector'
import CheckinPesoCards from '@/components/cliente/CheckinPesoCards'
import AppuntamentiWidget from '@/components/cliente/AppuntamentiWidget'
import AnamnesITrigger from '@/components/cliente/AnamnesITrigger'
import { getTodayMacros } from '@/lib/getTodayMacros'
import { getCarbUX } from '@/lib/getCarbUX'

export default async function ClienteDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('*').eq('id', user.id).single()
  if (profile?.role !== 'cliente') redirect('/coach/dashboard')

  const ventiquattroOreFA = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  await supabase.from('sessioni')
    .delete()
    .eq('cliente_id', user.id)
    .eq('completata', false)
    .lt('data', ventiquattroOreFA)

  const inizioSettimana = new Date()
  inizioSettimana.setDate(inizioSettimana.getDate() - inizioSettimana.getDay())
  inizioSettimana.setHours(0, 0, 0, 0)

  const oggi = new Date().toISOString().split('T')[0]

  const [
    assegnazioniRes, ultimeSessioniRes, totaleRes, settimanaRes,
    ultimoPesoRes, anamnesIRes, todayMacros, progressCheckRes,
  ] = await Promise.all([
    supabase.from('assegnazioni')
      .select(`id, data_inizio, data_fine, attiva, pdf_alimentare_url, schede ( id, nome, descrizione, scheda_giorni ( id, nome, ordine ) )`)
      .eq('cliente_id', user.id).order('created_at', { ascending: false }),
    supabase.from('sessioni')
      .select(`id, data, completata, scheda_giorni ( nome )`)
      .eq('cliente_id', user.id).order('data', { ascending: false }).limit(5),
    supabase.from('sessioni').select('id', { count: 'exact' }).eq('cliente_id', user.id),
    supabase.from('sessioni').select('id', { count: 'exact' })
      .eq('cliente_id', user.id).gte('data', inizioSettimana.toISOString()),
    supabase.from('misurazioni')
      .select('peso_kg, data')
      .eq('cliente_id', user.id)
      .order('data', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase.from('anamnesi')
      .select('id')
      .eq('cliente_id', user.id)
      .maybeSingle(),
    getTodayMacros(user.id),
    supabase.from('progress_check_schedulazioni')
      .select('id, data, set_id, richiedi_foto, progress_check_set(titolo), progress_check_risposte(id)')
      .eq('cliente_id', user.id)
      .gte('data', oggi)
      .order('data', { ascending: true })
      .limit(3),
  ])

  const assegnazioni = assegnazioniRes.data
  const ultimeSessioni = ultimeSessioniRes.data
  const totaleSessioni = totaleRes.count
  const sessioniSettimana = settimanaRes.count
  const ultimoPeso = ultimoPesoRes.data
  const haAnamnesi = !!anamnesIRes.data
  const progressCheckList = progressCheckRes.data ?? []

  const carbUX = getCarbUX(
    todayMacros?.day_type ?? null,
    todayMacros?.carb_cycling_enabled ?? false,
  )

  const ora = new Date().getHours()
  const saluto = ora < 12 ? 'Buongiorno' : ora < 18 ? 'Buon pomeriggio' : 'Buonasera'

  return (
    <div className="space-y-8 max-w-5xl">
      <ClienteOnboarding />
      <AnamnesITrigger show={!haAnamnesi} />

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

      {/* Day card */}
      {carbUX.show && (
        <div className="rounded-2xl px-5 py-4"
          style={{ background: carbUX.bg, border: `1px solid ${carbUX.border}` }}>
          <div className="flex items-center gap-4">
            <div className="text-3xl flex-shrink-0">{carbUX.emoji}</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-0.5">
                <p className="text-sm font-bold" style={{ color: carbUX.color }}>{carbUX.title}</p>
                {carbUX.label && (
                  <span className="text-xs font-black px-2 py-0.5 rounded-full"
                    style={{ background: carbUX.color, color: 'oklch(0.11 0 0)' }}>
                    {carbUX.label}
                  </span>
                )}
              </div>
              <p className="text-sm" style={{ color: 'oklch(0.65 0 0)' }}>{carbUX.message}</p>
            </div>
          </div>
          {todayMacros && (
            <div className="flex gap-3 mt-3 pt-3" style={{ borderTop: `1px solid ${carbUX.border}` }}>
              {[
                { label: 'Carbo', val: todayMacros.carboidrati_g, color: carbUX.color },
                { label: 'Proteine', val: todayMacros.proteine_g, color: 'oklch(0.60 0.15 200)' },
                { label: 'Grassi', val: todayMacros.grassi_g, color: 'oklch(0.65 0.18 150)' },
              ].map(m => (
                <div key={m.label} className="flex-1 text-center rounded-xl py-2"
                  style={{ background: 'oklch(0 0 0 / 15%)' }}>
                  <p className="text-base font-black tabular-nums" style={{ color: m.color }}>{m.val}g</p>
                  <p className="text-xs mt-0.5" style={{ color: 'oklch(0.50 0 0)' }}>{m.label}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Card Check-in + Peso */}
      <CheckinPesoCards
        checkinFatto={todayMacros?.checkin_done ?? false}
        willTrain={todayMacros?.will_train ?? null}
        ultimoPeso={ultimoPeso?.peso_kg ?? null}
        ultimoPesoData={ultimoPeso?.data ?? null}
      />

      {/* Appuntamenti */}
      <AppuntamentiWidget />

      {/* Progress Check */}
      {progressCheckList.length > 0 && (
        <div className="rounded-2xl overflow-hidden"
          style={{ background: 'oklch(0.18 0 0)', border: '1px solid oklch(0.70 0.19 46 / 20%)' }}>
          <div className="px-5 py-3" style={{ borderBottom: '1px solid oklch(1 0 0 / 6%)' }}>
            <p className="text-sm font-bold" style={{ color: 'oklch(0.97 0 0)' }}>Prossimi check-in</p>
          </div>
          {(progressCheckList as any[]).map((pc: any) => {
            const completato = pc.progress_check_risposte?.length > 0
            if (completato) return null
            const isOggi = pc.data === oggi
            const isFuturo = pc.data > oggi
            const label = isOggi
              ? 'Oggi'
              : new Date(pc.data + 'T12:00:00').toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' })
            if (isFuturo) {
              return (
                <div key={pc.id} className="flex items-center gap-3 px-5 py-3"
                  style={{ borderBottom: '1px solid oklch(1 0 0 / 4%)', opacity: 0.45, cursor: 'not-allowed' }}>
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: 'oklch(0.45 0 0)' }} />
                  <p className="flex-1 text-sm font-semibold" style={{ color: 'oklch(0.85 0 0)' }}>
                    {pc.progress_check_set?.titolo ?? 'Check-in'}
                  </p>
                  <p className="text-xs flex-shrink-0" style={{ color: 'oklch(0.50 0 0)' }}>{label} 🔒</p>
                </div>
              )
            }
            return (
              <Link key={pc.id} href={`/cliente/checkin/${pc.id}`}
                className="flex items-center gap-3 px-5 py-3 transition-all hover:bg-white/3"
                style={{ borderBottom: '1px solid oklch(1 0 0 / 4%)' }}>
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: 'oklch(0.70 0.19 46)' }} />
                <p className="flex-1 text-sm font-semibold" style={{ color: 'oklch(0.85 0 0)' }}>
                  {pc.progress_check_set?.titolo ?? 'Check-in'}
                </p>
                <p className="text-xs flex-shrink-0" style={{ color: 'oklch(0.70 0.19 46)' }}>{label} →</p>
              </Link>
            )
          })}
        </div>
      )}

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
        <div className="px-6 py-4"
          style={{ borderBottom: assegnazioni && assegnazioni.length > 0 ? '1px solid oklch(1 0 0 / 6%)' : 'none' }}>
          <h2 className="font-bold" style={{ color: 'oklch(0.97 0 0)' }}>Le tue schede</h2>
        </div>
        <SchedeSelector assegnazioni={(assegnazioni as any) ?? []} />
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
