import { createClient } from '@/lib/supabase/server'
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabaseAdmin = createSupabaseAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// POST — schedula una notifica push
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { fireAt, title, body, url } = await req.json()
  if (!fireAt || !title) return NextResponse.json({ error: 'Parametri mancanti' }, { status: 400 })

  // Cancella eventuali push già schedulati per questo utente (evita duplicati)
  await supabaseAdmin.from('push_scheduled').delete().eq('user_id', user.id)

  const { data, error } = await supabaseAdmin
    .from('push_scheduled')
    .insert({ user_id: user.id, fire_at: fireAt, title, body, url })
    .select('id')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, id: data.id })
}

// DELETE — cancella push schedulato (timer finito lato client o saltato)
export async function DELETE(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await supabaseAdmin.from('push_scheduled').delete().eq('user_id', user.id)
  return NextResponse.json({ ok: true })
}
