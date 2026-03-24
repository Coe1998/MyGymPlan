import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const { invito_id, azione } = await request.json()
    // azione: 'approva' | 'rifiuta'

    if (!invito_id || !['approva', 'rifiuta'].includes(azione)) {
      return NextResponse.json({ error: 'Parametri non validi' }, { status: 400 })
    }

    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

    // Verifica che il coach sia il proprietario dell'invito
    const { data: invito } = await supabaseAdmin
      .from('coach_inviti').select('*').eq('id', invito_id).single()

    if (!invito || invito.coach_id !== user.id) {
      return NextResponse.json({ error: 'Invito non trovato' }, { status: 404 })
    }

    if (azione === 'approva') {
      // 1. Aggiorna stato invito
      await supabaseAdmin.from('coach_inviti')
        .update({ stato: 'approvato' }).eq('id', invito_id)

      // 2. Aggiorna ruolo cliente → 'cliente' se era atleta
      await supabaseAdmin.from('profiles')
        .update({ role: 'cliente' }).eq('id', invito.cliente_id)

      // 3. Crea relazione coach_clienti
      const { error } = await supabaseAdmin.from('coach_clienti').insert({
        coach_id: user.id,
        cliente_id: invito.cliente_id,
      })
      if (error && !error.message.includes('duplicate')) {
        return NextResponse.json({ error: 'Errore durante approvazione' }, { status: 500 })
      }
    } else {
      // Rifiuta — aggiorna solo lo stato
      await supabaseAdmin.from('coach_inviti')
        .update({ stato: 'rifiutato' }).eq('id', invito_id)
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}
