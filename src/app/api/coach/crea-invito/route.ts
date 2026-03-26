import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const { coach_id, cliente_id } = await request.json()
    if (!coach_id || !cliente_id)
      return NextResponse.json({ error: 'Parametri mancanti' }, { status: 400 })

    // Controlla se esiste già un invito
    const { data: existing } = await supabaseAdmin
      .from('coach_inviti')
      .select('id')
      .eq('coach_id', coach_id)
      .eq('cliente_id', cliente_id)
      .maybeSingle()

    if (existing)
      return NextResponse.json({ success: true, already_exists: true })

    const { error } = await supabaseAdmin.from('coach_inviti').insert({
      coach_id,
      cliente_id,
      stato: 'pending',
    })

    if (error)
      return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}
