import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { sendTelegram } from '@/lib/telegram'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: Request) {
  // Protezione base: solo Vercel Cron può chiamare questa route
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const treGiorniFa = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()

  // Coach approvati ma senza clienti né schede, iscritti da più di 3 giorni
  const { data: coachInattivi } = await supabaseAdmin
    .from('profiles')
    .select('id, full_name, created_at')
    .eq('role', 'coach')
    .eq('coach_status', 'approved')
    .lt('created_at', treGiorniFa)

  if (!coachInattivi || coachInattivi.length === 0) {
    return NextResponse.json({ ok: true, message: 'Nessun coach inattivo' })
  }

  // Filtra quelli che non hanno clienti
  const coachIds = coachInattivi.map(c => c.id)
  const { data: clienti } = await supabaseAdmin
    .from('coach_clienti').select('coach_id').in('coach_id', coachIds)
  const { data: schede } = await supabaseAdmin
    .from('schede').select('coach_id').in('coach_id', coachIds)

  const coachConClienti = new Set((clienti ?? []).map(c => c.coach_id))
  const coachConSchede = new Set((schede ?? []).map(s => s.coach_id))

  const inattivi = coachInattivi.filter(c =>
    !coachConClienti.has(c.id) && !coachConSchede.has(c.id)
  )

  if (inattivi.length === 0) {
    return NextResponse.json({ ok: true, message: 'Nessun coach inattivo' })
  }

  const lista = inattivi.map(c => {
    const giorni = Math.floor((Date.now() - new Date(c.created_at).getTime()) / (1000 * 60 * 60 * 24))
    return `• ${c.full_name} (${giorni}gg fa)`
  }).join('\n')

  await sendTelegram(
    `⚠️ <b>Coach approvati ma inattivi</b>\n\n` +
    `${inattivi.length} coach non hanno ancora aggiunto clienti né creato schede:\n\n` +
    `${lista}\n\n` +
    `👉 <a href="https://my-gym-plan-delta.vercel.app/admin/dashboard">Admin Dashboard</a>`
  )

  return NextResponse.json({ ok: true, inattivi: inattivi.length })
}
