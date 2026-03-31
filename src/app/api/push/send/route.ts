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

export async function POST(req: NextRequest) {
  try {
    const { userId, title, body, url } = await req.json()
    if (!userId || !title) return NextResponse.json({ error: 'Parametri mancanti' }, { status: 400 })

    const { data: sub } = await supabaseAdmin
      .from('push_subscriptions')
      .select('subscription')
      .eq('user_id', userId)
      .maybeSingle()

    if (!sub?.subscription) return NextResponse.json({ ok: true, skipped: true })

    await webpush.sendNotification(
      sub.subscription as any,
      JSON.stringify({ title, body, url: url || '/' })
    )

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
