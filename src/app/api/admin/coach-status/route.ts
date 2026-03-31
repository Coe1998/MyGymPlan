import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const { coachId, status } = await req.json()
    if (!coachId || !['approved', 'suspended'].includes(status)) {
      return NextResponse.json({ error: 'Parametri non validi' }, { status: 400 })
    }
    const { error } = await supabaseAdmin
      .from('profiles')
      .update({ coach_status: status })
      .eq('id', coachId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
