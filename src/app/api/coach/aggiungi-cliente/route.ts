import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'

// Client con service role — bypassa la RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json({ error: 'Email richiesta' }, { status: 400 })
    }

    // Verifica che chi chiama sia autenticato come coach
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })
    }

    const { data: coachProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (coachProfile?.role !== 'coach') {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })
    }

    // Cerca l'utente per email usando admin (bypassa RLS)
    const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers()

    if (authError) {
      return NextResponse.json({ error: 'Errore nella ricerca' }, { status: 500 })
    }

    const targetUser = authUsers.users.find(u => u.email === email.trim())

    if (!targetUser) {
      return NextResponse.json({ error: 'Nessun utente trovato con questa email. Assicurati che si sia già registrato su MyGymPlan.' }, { status: 404 })
    }

    // Recupera il profilo
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, role')
      .eq('id', targetUser.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profilo non trovato.' }, { status: 404 })
    }

    if (profile.role !== 'cliente') {
      return NextResponse.json({ error: 'Questo utente è registrato come coach, non come cliente.' }, { status: 400 })
    }

    // Controlla se già associato
    const { data: existing } = await supabase
      .from('coach_clienti')
      .select('id')
      .eq('coach_id', user.id)
      .eq('cliente_id', profile.id)
      .single()

    if (existing) {
      return NextResponse.json({ error: 'Questo cliente è già nella tua lista.' }, { status: 400 })
    }

    // Aggiungi la relazione
    const { error: insertError } = await supabase
      .from('coach_clienti')
      .insert({ coach_id: user.id, cliente_id: profile.id })

    if (insertError) {
      return NextResponse.json({ error: "Errore durante l'aggiunta. Riprova." }, { status: 500 })
    }

    return NextResponse.json({ success: true, full_name: profile.full_name })

  } catch (err) {
    return NextResponse.json({ error: 'Errore interno del server' }, { status: 500 })
  }
}
