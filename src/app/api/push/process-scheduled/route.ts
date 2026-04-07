import { createClient as createSupabaseAdmin } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import webpush from 'web-push'

webpush.setVapidDetails(
  process.env.VAPID_EMAIL!,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
)

const supabaseAdmin = createSupabaseAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Chiamato da Supabase pg_cron ogni minuto
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: dovuti } = await supabaseAdmin
    .from('push_scheduled')
    .select('id, user_id, title, body, url')
    .lte('fire_at', new Date().toISOString())

  if (!dovuti || dovuti.length === 0) {
    return NextResponse.json({ ok: true, sent: 0 })
  }

  const ids = dovuti.map(r => r.id)
  // Elimina subito per evitare doppi invii se il job si sovrappone
  await supabaseAdmin.from('push_scheduled').delete().in('id', ids)

  let sent = 0
  for (const row of dovuti) {
    const { data: sub } = await supabaseAdmin
      .from('push_subscriptions')
      .select('subscription')
      .eq('user_id', row.user_id)
      .maybeSingle()

    if (!sub?.subscription) continue

    try {
      await webpush.sendNotification(
        sub.subscription as any,
        JSON.stringify({ title: row.title, body: row.body, url: row.url || '/cliente/allenamento' })
      )
      sent++
    } catch {}
  }

  return NextResponse.json({ ok: true, sent })
}
