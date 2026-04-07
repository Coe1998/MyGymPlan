import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { sendTelegram } from '@/lib/telegram'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date()

  // Cerca appuntamenti nelle prossime 24h (finestra larga: da ora a +25h)
  const windows = [
    { label: 'oggi o domani', from: now, to: addMinutes(now, 25 * 60) },
  ]

  const righe: string[] = []

  for (const window of windows) {
    const { data: apps } = await supabaseAdmin
      .from('appuntamenti')
      .select('id, data_ora, durata_minuti, tipo, profiles!appuntamenti_cliente_id_fkey(full_name), coach:profiles!appuntamenti_coach_id_fkey(full_name)')
      .eq('stato', 'programmato')
      .gte('data_ora', window.from.toISOString())
      .lte('data_ora', window.to.toISOString())

    if (!apps || apps.length === 0) continue

    righe.push(`\n<b>Appuntamenti ${window.label}:</b>`)
    for (const a of apps as any[]) {
      const dataOra = new Date(a.data_ora)
      const oraStr = dataOra.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
      const coach = a.coach?.full_name ?? '?'
      const cliente = a.profiles?.full_name ?? '?'
      righe.push(`• ${oraStr} — ${coach} ↔ ${cliente} (${a.tipo}, ${a.durata_minuti}min)`)
    }
  }

  if (righe.length === 0) {
    return NextResponse.json({ ok: true, message: 'Nessun reminder da inviare' })
  }

  await sendTelegram(`📅 <b>Reminder appuntamenti</b>\n${righe.join('\n')}`)

  return NextResponse.json({ ok: true })
}

function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60 * 1000)
}
