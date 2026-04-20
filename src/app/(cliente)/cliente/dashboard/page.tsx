import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faDumbbell, faCalendarDays, faPersonRunning, faBell, faClipboardCheck } from '@fortawesome/free-solid-svg-icons'
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
  const setteGiorni = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  const [
    assegnazioniRes, ultimeSessioniRes, totaleRes, settimanaRes,
    ultimoPesoRes, anamnesIRes, todayMacros, progressCheckRes, streakRes,
  ] = await Promise.all([
    supabase.from('assegnazioni')
      .select(`id, data_inizio, data_fine, attiva, pdf_alimentare_url, schede ( id, nome, descrizione, scheda_giorni ( id, nome, ordine ) )`)
      .eq('cliente_id', user.id).order('created_at', { ascending: false }),
    supabase.from('sessioni')
      .select(`id, data, completata, giorno_id, assegnazione_id, scheda_giorni ( nome )`)
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
    supabase.from('sessioni')
      .select('data')
      .eq('cliente_id', user.id)
      .eq('completata', true)
      .gte('data', setteGiorni),
  ])

  const assegnazioni = assegnazioniRes.data
  const ultimeSessioni = ultimeSessioniRes.data
  const totaleSessioni = totaleRes.count
  const sessioniSettimana = settimanaRes.count
  const ultimoPeso = ultimoPesoRes.data
  const haAnamnesi = !!anamnesIRes.data
  const progressCheckList = progressCheckRes.data ?? []
  const streakSessioni = streakRes.data ?? []

  const carbUX = getCarbUX(
    todayMacros?.day_type ?? null,
    todayMacros?.carb_cycling_enabled ?? false,
    todayMacros?.carb_cycling_profile_name,
    todayMacros?.carb_cycling_override_active,
  )
  const dietaAbilitata = carbUX.show

  const ora = new Date().getHours()
  const saluto = ora < 12 ? 'Buongiorno' : ora < 18 ? 'Buon pomeriggio' : 'Buonasera'

  // Streak: compute which Italian weekday indexes (0=Mon…6=Sun) had completed sessions
  const trainedDays = new Set(
    streakSessioni.map(s => {
      const d = new Date(s.data)
      return (d.getDay() + 6) % 7 // convert JS (0=Sun) to Italian (0=Mon)
    })
  )
  const todayItIdx = (new Date().getDay() + 6) % 7
  const dayLabels = ['L', 'M', 'M', 'G', 'V', 'S', 'D']

  // MacroCard ring calc
  const macroRings = dietaAbilitata && todayMacros ? [
    { label: 'Proteine', current: Math.round(todayMacros.proteine_g ?? 0), target: Math.round(todayMacros.proteine_g ?? 0), color: 'oklch(0.70 0.19 46)' },
    { label: 'Carbo', current: Math.round(todayMacros.carboidrati_g ?? 0), target: Math.round(todayMacros.carboidrati_g ?? 0), color: 'oklch(0.78 0.16 85)' },
    { label: 'Grassi', current: Math.round(todayMacros.grassi_g ?? 0), target: Math.round(todayMacros.grassi_g ?? 0), color: 'oklch(0.62 0.14 200)' },
  ] : []

  return (
    <div style={{ paddingBottom: 96 }}>
      <ClienteOnboarding />
      <AnamnesITrigger show={!haAnamnesi} />

      {/* ── Mobile sticky header ── */}
      <div className="lg:hidden sticky top-0 z-30"
        style={{
          background: 'oklch(0.13 0 0 / 95%)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderBottom: '1px solid var(--c-w6)',
          padding: '12px 20px 14px',
        }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--c-50)', letterSpacing: '0.08em', textTransform: 'uppercase', lineHeight: 1 }}>
              {new Date().toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
            <p style={{ fontFamily: 'var(--font-syne)', fontWeight: 800, fontSize: 22, color: 'var(--c-97)', letterSpacing: '-0.02em', lineHeight: 1.1, marginTop: 2 }}>
              {saluto}, {profile.full_name?.split(' ')[0]}
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button style={{
              width: 40, height: 40, borderRadius: 12,
              background: 'var(--c-20)', border: '1px solid var(--c-w8)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--c-60)',
            }}>
              <FontAwesomeIcon icon={faBell} style={{ fontSize: 15 }} />
            </button>
            <div style={{
              width: 40, height: 40, borderRadius: 12,
              background: 'oklch(0.70 0.19 46 / 20%)',
              border: '1px solid oklch(0.70 0.19 46 / 30%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'var(--font-syne)', fontWeight: 800, fontSize: 16, color: 'var(--accent)',
            }}>
              {profile.full_name?.charAt(0).toUpperCase()}
            </div>
          </div>
        </div>
      </div>

      {/* ── Desktop header ── */}
      <div className="hidden lg:block" style={{ padding: '32px 0 24px' }}>
        <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--c-50)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>
          {new Date().toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
        <h1 style={{ fontFamily: 'var(--font-syne)', fontWeight: 800, fontSize: 32, color: 'var(--c-97)', letterSpacing: '-0.02em' }}>
          {saluto}, {profile.full_name?.split(' ')[0]} 👋
        </h1>
      </div>

      <div style={{ padding: '16px 20px 0' }} className="lg:px-0 space-y-4">

        {/* ── Hero workout card ── */}
        <div style={{
          position: 'relative',
          borderRadius: 22,
          padding: 20,
          background: `
            radial-gradient(circle at 80% -20%, oklch(0.70 0.19 46 / 35%) 0%, transparent 60%),
            linear-gradient(135deg, oklch(0.22 0.04 35) 0%, oklch(0.15 0.02 30) 100%)
          `,
          border: '1px solid oklch(0.70 0.19 46 / 25%)',
          overflow: 'hidden',
          animation: 'pulseGlow 3s ease-in-out infinite',
        }}>
          {/* Decorative dot grid */}
          <svg style={{ position: 'absolute', top: -20, right: -30, opacity: 0.10, pointerEvents: 'none' }} width="180" height="180" viewBox="0 0 180 180">
            <defs>
              <pattern id="hero-dots" width="12" height="12" patternUnits="userSpaceOnUse">
                <circle cx="2" cy="2" r="1" fill="var(--accent)" />
              </pattern>
            </defs>
            <rect width="180" height="180" fill="url(#hero-dots)" />
          </svg>

          <div style={{ position: 'relative' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
              <div style={{
                width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)',
                boxShadow: '0 0 8px oklch(0.70 0.19 46)',
              }} />
              <span style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--accent)', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
                Allenamento di oggi
              </span>
            </div>

            {/* SchedeSelector renders the title + days + CTA */}
            <SchedeSelector assegnazioni={(assegnazioni as any) ?? []} heroMode />
          </div>
        </div>

        {/* ── Streak card ── */}
        {(sessioniSettimana ?? 0) > 0 && (
          <div style={{
            background: 'linear-gradient(135deg, oklch(0.24 0.08 35) 0%, oklch(0.16 0.04 25) 100%)',
            border: '1px solid oklch(0.70 0.19 46 / 22%)',
            borderRadius: 18, padding: 14,
            display: 'flex', alignItems: 'center', gap: 12,
            animation: 'fadeIn 0.4s 0.05s backwards',
          }}>
            <div style={{ fontSize: 32, animation: 'flameFlicker 1.8s ease-in-out infinite', flexShrink: 0 }}>🔥</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                <span style={{ fontFamily: 'var(--font-syne)', fontWeight: 800, fontSize: 22, color: 'var(--c-97)', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
                  {sessioniSettimana}
                </span>
                <span style={{ fontSize: 12, color: 'var(--c-70)', fontWeight: 600 }}>allenamenti questa settimana</span>
              </div>
              <div style={{ display: 'flex', gap: 3, marginTop: 7 }}>
                {dayLabels.map((d, i) => (
                  <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                    <div style={{
                      height: 6, width: '100%', borderRadius: 3,
                      background: i === todayItIdx
                        ? 'var(--accent)'
                        : trainedDays.has(i) && i < todayItIdx
                          ? 'oklch(0.70 0.19 46 / 55%)'
                          : 'var(--c-22)',
                      boxShadow: i === todayItIdx ? '0 0 8px oklch(0.70 0.19 46)' : 'none',
                    }} />
                    <span style={{ fontSize: 9, color: (i <= todayItIdx) ? 'var(--c-70)' : 'var(--c-40)', fontWeight: 700 }}>{d}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Macro card ── */}
        {dietaAbilitata && todayMacros && (
          <div style={{
            background: 'var(--c-16)',
            border: '1px solid var(--c-w6)',
            borderRadius: 18, padding: 16,
            animation: 'fadeIn 0.4s 0.1s backwards',
          }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--c-55)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                  {carbUX.title ?? 'Macro oggi'}
                  {carbUX.label && (
                    <span style={{
                      marginLeft: 8, fontSize: 9.5, fontWeight: 800, padding: '2px 7px',
                      borderRadius: 6, background: carbUX.color, color: 'var(--c-11)',
                    }}>{carbUX.label}</span>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 5, marginTop: 3 }}>
                  <span style={{ fontFamily: 'var(--font-syne)', fontWeight: 800, fontSize: 22, color: 'var(--c-97)', letterSpacing: '-0.01em', fontVariantNumeric: 'tabular-nums' }}>
                    {(todayMacros.calorie ?? 0).toLocaleString('it-IT')}
                  </span>
                  <span style={{ fontSize: 12, color: 'var(--c-55)' }}>kcal target</span>
                </div>
              </div>
              {carbUX.emoji && (
                <span style={{ fontSize: 28 }}>{carbUX.emoji}</span>
              )}
            </div>

            {/* Macro bars */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              {[
                { label: 'Proteine', val: Math.round(todayMacros.proteine_g ?? 0), color: 'oklch(0.70 0.19 46)' },
                { label: 'Carbo', val: Math.round(todayMacros.carboidrati_g ?? 0), color: 'oklch(0.78 0.16 85)' },
                { label: 'Grassi', val: Math.round(todayMacros.grassi_g ?? 0), color: 'oklch(0.62 0.14 200)' },
              ].map(m => (
                <div key={m.label} style={{
                  borderRadius: 12, padding: '10px 8px',
                  background: 'var(--c-20)', textAlign: 'center',
                }}>
                  <p style={{ fontFamily: 'var(--font-syne)', fontWeight: 800, fontSize: 20, color: m.color, fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
                    {m.val}
                  </p>
                  <p style={{ fontSize: 8.5, color: 'var(--c-55)', fontWeight: 600, marginTop: 3 }}>/{m.val}g</p>
                  <p style={{ fontSize: 9.5, fontWeight: 700, color: m.color, letterSpacing: '0.08em', textTransform: 'uppercase', marginTop: 4 }}>{m.label}</p>
                </div>
              ))}
            </div>

            <Link href="/cliente/dieta" style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              width: '100%', marginTop: 12, padding: '10px',
              borderRadius: 10, background: 'var(--c-20)',
              border: '1px solid var(--c-w6)', color: 'var(--c-80)',
              fontSize: 12, fontWeight: 600, textDecoration: 'none',
            }}>
              Vedi piano alimentare →
            </Link>
          </div>
        )}

        {/* ── Weight + Checkin cards ── */}
        <CheckinPesoCards
          checkinFatto={todayMacros?.checkin_done ?? false}
          willTrain={todayMacros?.will_train ?? null}
          ultimoPeso={ultimoPeso?.peso_kg ?? null}
          ultimoPesoData={ultimoPeso?.data ?? null}
        />

        {/* ── Appuntamenti ── */}
        <AppuntamentiWidget />

        {/* ── Progress Check ── */}
        {progressCheckList.length > 0 && (
          <div style={{
            borderRadius: 18, overflow: 'hidden',
            background: 'var(--c-16)', border: '1px solid oklch(0.70 0.19 46 / 20%)',
            animation: 'fadeIn 0.4s 0.15s backwards',
          }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--c-w6)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <FontAwesomeIcon icon={faClipboardCheck} style={{ fontSize: 13, color: 'var(--accent)' }} />
              <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--c-97)' }}>Prossimi check-in</p>
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
                  <div key={pc.id} style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
                    borderBottom: '1px solid var(--c-w4)', opacity: 0.45,
                  }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--c-45)', flexShrink: 0 }} />
                    <p style={{ flex: 1, fontSize: 13, fontWeight: 600, color: 'var(--c-80)' }}>
                      {pc.progress_check_set?.titolo ?? 'Check-in'}
                    </p>
                    <p style={{ fontSize: 11, color: 'var(--c-50)' }}>{label} 🔒</p>
                  </div>
                )
              }
              return (
                <Link key={pc.id} href={`/cliente/checkin/${pc.id}`}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: '1px solid var(--c-w4)', textDecoration: 'none' }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)', flexShrink: 0 }} />
                  <p style={{ flex: 1, fontSize: 13, fontWeight: 600, color: 'var(--c-90)' }}>
                    {pc.progress_check_set?.titolo ?? 'Check-in'}
                  </p>
                  <p style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 700 }}>{label} →</p>
                </Link>
              )
            })}
          </div>
        )}

        {/* ── Stats grid ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {[
            { label: 'Sessioni totali', value: totaleSessioni ?? 0, icon: faDumbbell, color: 'var(--accent)' },
            { label: 'Questa settimana', value: sessioniSettimana ?? 0, icon: faCalendarDays, color: 'oklch(0.78 0.16 85)' },
          ].map((stat) => (
            <div key={stat.label} style={{
              borderRadius: 18, padding: '16px 14px',
              background: 'var(--c-16)', border: '1px solid var(--c-w6)',
              animation: 'fadeIn 0.4s 0.2s backwards',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--c-50)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{stat.label}</p>
                <FontAwesomeIcon icon={stat.icon} style={{ fontSize: 13, color: stat.color, opacity: 0.7 }} />
              </div>
              <p style={{ fontFamily: 'var(--font-syne)', fontWeight: 800, fontSize: 36, color: stat.color, fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
                {stat.value}
              </p>
            </div>
          ))}
        </div>

        {/* ── Ultime sessioni ── */}
        <div style={{
          borderRadius: 18, overflow: 'hidden',
          background: 'var(--c-16)', border: '1px solid var(--c-w6)',
          animation: 'fadeIn 0.4s 0.25s backwards',
        }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--c-w6)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--c-97)' }}>Ultimi allenamenti</p>
            <Link href="/cliente/progressi" style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent)', textDecoration: 'none' }}>
              Vedi tutti →
            </Link>
          </div>
          {!ultimeSessioni || ultimeSessioni.length === 0 ? (
            <div style={{ padding: '40px 20px', textAlign: 'center' }}>
              <p style={{ fontSize: 36, marginBottom: 8 }}><FontAwesomeIcon icon={faPersonRunning} style={{ color: 'var(--c-35)' }} /></p>
              <p style={{ fontWeight: 700, color: 'var(--c-97)', marginBottom: 4 }}>Nessun allenamento ancora</p>
              <p style={{ fontSize: 13, color: 'var(--c-50)' }}>Inizia il tuo primo allenamento dalla scheda qui sopra</p>
            </div>
          ) : (
            <SessioniList sessioni={(ultimeSessioni as any[]).map(s => ({
              id: s.id,
              data: s.data,
              completata: s.completata,
              giorno_id: s.giorno_id ?? null,
              assegnazione_id: s.assegnazione_id ?? null,
              scheda_giorni: s.scheda_giorni ?? null,
            }))} />
          )}
        </div>

      </div>
    </div>
  )
}
