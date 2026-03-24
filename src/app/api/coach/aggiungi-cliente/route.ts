import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()
    if (!email) return NextResponse.json({ error: 'Email richiesta' }, { status: 400 })

    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

    const { data: coachProfile } = await supabase
      .from('profiles').select('role').eq('id', user.id).single()
    if (coachProfile?.role !== 'coach')
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })

    const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers()
    if (authError) return NextResponse.json({ error: 'Errore nella ricerca' }, { status: 500 })

    const targetUser = authUsers.users.find(u => u.email === email.trim())
    if (!targetUser)
      return NextResponse.json({
        error: 'Nessun utente trovato con questa email. Assicurati che si sia già registrato su Bynari.'
      }, { status: 404 })

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles').select('id, full_name, role').eq('id', targetUser.id).single()
    if (profileError || !profile)
      return NextResponse.json({ error: 'Profilo non trovato.' }, { status: 404 })

    // Accetta sia 'atleta' (si è registrato in autonomia) che 'cliente'
    if (profile.role !== 'atleta' && profile.role !== 'cliente')
      return NextResponse.json({
        error: 'Questo utente è registrato come coach, non può essere aggiunto come cliente.'
      }, { status: 400 })

    const { data: existing } = await supabase
      .from('coach_clienti').select('id')
      .eq('coach_id', user.id).eq('cliente_id', profile.id).single()
    if (existing)
      return NextResponse.json({ error: 'Questo cliente è già nella tua lista.' }, { status: 400 })

    // Se era 'atleta' autonomo → promosso a 'cliente'
    if (profile.role === 'atleta') {
      await supabaseAdmin
        .from('profiles')
        .update({ role: 'cliente' })
        .eq('id', profile.id)
    }

    const { error: insertError } = await supabase
      .from('coach_clienti').insert({ coach_id: user.id, cliente_id: profile.id })
    if (insertError)
      return NextResponse.json({ error: "Errore durante l'aggiunta. Riprova." }, { status: 500 })

    return NextResponse.json({ success: true, full_name: profile.full_name })
  } catch {
    return NextResponse.json({ error: 'Errore interno del server' }, { status: 500 })
  }
}
