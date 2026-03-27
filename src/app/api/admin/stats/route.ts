import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  // Verifica che chi chiama sia admin
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })

  const oggi = new Date(); oggi.setHours(0, 0, 0, 0)

  const [
    profilesRes,
    sessioniRes,
    schedeRes,
    eventiRegRes,
    eventiSessRes,
    eventiSchedeRes,
    clientiRes,
    schedeCoachRes,
    authRes,
  ] = await Promise.all([
    supabaseAdmin.from('profiles').select('id, full_name, role, coach_status, created_at'),
    supabaseAdmin.from('sessioni').select('id', { count: 'exact', head: true }),
    supabaseAdmin.from('schede').select('id', { count: 'exact', head: true }),
    supabaseAdmin.from('profiles').select('full_name, role, created_at').order('created_at', { ascending: false }).limit(15),
    supabaseAdmin.from('sessioni').select('id, data, cliente_id').order('data', { ascending: false }).limit(15),
    supabaseAdmin.from('schede').select('nome, created_at, coach_id').order('created_at', { ascending: false }).limit(15),
    supabaseAdmin.from('coach_clienti').select('coach_id'),
    supabaseAdmin.from('schede').select('coach_id, created_at'),
    supabaseAdmin.auth.admin.listUsers(),
  ])

  const profiles = profilesRes.data ?? []
  const coachProfiles = profiles.filter(p => p.role === 'coach')

  // Email map
  const emailMap = new Map<string, string>()
  for (const u of authRes.data?.users ?? []) {
    emailMap.set(u.id, u.email ?? '')
  }

  // Clienti per coach
  const clientiPerCoach = new Map<string, number>()
  for (const c of clientiRes.data ?? []) {
    clientiPerCoach.set(c.coach_id, (clientiPerCoach.get(c.coach_id) ?? 0) + 1)
  }

  // Schede per coach
  const schedePerCoach = new Map<string, number>()
  for (const s of schedeCoachRes.data ?? []) {
    schedePerCoach.set(s.coach_id, (schedePerCoach.get(s.coach_id) ?? 0) + 1)
  }

  // Nome cliente per sessioni recenti
  const profileMap = new Map<string, string>()
  for (const p of profiles) {
    profileMap.set(p.id, p.full_name ?? 'Utente')
  }

  // Coach rows
  const coachRows = coachProfiles.map(c => ({
    id: c.id,
    full_name: c.full_name,
    email: emailMap.get(c.id) ?? null,
    coach_status: c.coach_status,
    created_at: c.created_at,
    clienti_count: clientiPerCoach.get(c.id) ?? 0,
    schede_count: schedePerCoach.get(c.id) ?? 0,
  })).sort((a, b) => {
    if (a.coach_status === 'pending' && b.coach_status !== 'pending') return -1
    if (b.coach_status === 'pending' && a.coach_status !== 'pending') return 1
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })

  // Stats
  const stats = {
    totale_coach: coachProfiles.length,
    coach_pending: coachProfiles.filter(p => p.coach_status === 'pending').length,
    coach_approvati: coachProfiles.filter(p => p.coach_status === 'approved').length,
    totale_clienti: profiles.filter(p => p.role === 'cliente').length,
    totale_atleti: profiles.filter(p => p.role === 'atleta').length,
    totale_sessioni: sessioniRes.count ?? 0,
    totale_schede: schedeRes.count ?? 0,
    nuovi_oggi: profiles.filter(p => new Date(p.created_at) >= oggi).length,
  }

  // Feed attività recente
  const eventi: { tipo: string; descrizione: string; data: string }[] = []
  for (const p of eventiRegRes.data ?? []) {
    eventi.push({ tipo: 'registrazione', descrizione: `${p.full_name ?? 'Utente'} si è registrato come ${p.role}`, data: p.created_at })
  }
  for (const s of eventiSessRes.data ?? []) {
    eventi.push({ tipo: 'sessione', descrizione: `Sessione di ${profileMap.get(s.cliente_id) ?? 'cliente'}`, data: s.data })
  }
  for (const s of eventiSchedeRes.data ?? []) {
    eventi.push({ tipo: 'scheda', descrizione: `Scheda "${s.nome}" creata da ${profileMap.get(s.coach_id) ?? 'coach'}`, data: s.created_at })
  }
  eventi.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime())

  return NextResponse.json({ stats, coach: coachRows, eventi: eventi.slice(0, 20) })
}
