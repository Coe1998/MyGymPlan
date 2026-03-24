import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

    // 1. Elimina dati storage (foto progressi)
    const { data: fotoList } = await supabaseAdmin.storage
      .from('progressi-foto').list(user.id)
    if (fotoList && fotoList.length > 0) {
      await supabaseAdmin.storage.from('progressi-foto')
        .remove(fotoList.map(f => `${user.id}/${f.name}`))
    }

    // 2. Elimina PDF alimentari (se coach)
    const { data: assegnazioni } = await supabaseAdmin
      .from('assegnazioni').select('id').eq('coach_id', user.id)
    if (assegnazioni && assegnazioni.length > 0) {
      await supabaseAdmin.storage.from('alimentari')
        .remove(assegnazioni.map(a => `${a.id}.pdf`))
    }

    // 3. Elimina tutti i dati dal DB (cascade gestisce il resto)
    // Log serie → sessioni → schede_esercizi → scheda_giorni → schede
    // misurazioni → checkin → coach_clienti → coach_inviti → profiles
    await supabaseAdmin.from('log_serie')
      .delete().eq('sessione_id',
        supabaseAdmin.from('sessioni').select('id').eq('cliente_id', user.id) as any)

    // Più semplice: elimina direttamente l'utente auth — il CASCADE del DB fa il resto
    const { error } = await supabaseAdmin.auth.admin.deleteUser(user.id)
    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Errore eliminazione account:', err)
    return NextResponse.json({ error: 'Errore durante la cancellazione' }, { status: 500 })
  }
}
