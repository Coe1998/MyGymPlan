'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface Scheda {
  id: string
  nome: string
  descrizione: string | null
  is_template: boolean
  created_at: string
  assegnazioni: { id: string; profiles: { full_name: string | null } }[]
}

export default function SchedePage() {
  const [schede, setSchede] = useState<Scheda[]>([])
  const [loading, setLoading] = useState(true)
  const [duplicating, setDuplicating] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const fetchSchede = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from('schede')
      .select(`
        *,
        assegnazioni (
          id,
          attiva,
          profiles!assegnazioni_cliente_id_fkey ( full_name )
        )
      `)
      .eq('coach_id', user.id)
      .order('created_at', { ascending: false })
    setSchede((data as any) ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchSchede() }, [])

  const handleDelete = async (id: string, nome: string) => {
    if (!confirm(`Vuoi eliminare la scheda "${nome}"? Questa azione è irreversibile.`)) return
    await supabase.from('schede').delete().eq('id', id)
    fetchSchede()
  }

  const handleDuplica = async (scheda: Scheda) => {
    setDuplicating(scheda.id)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: nuovaScheda } = await supabase
      .from('schede')
      .insert({ coach_id: user.id, nome: `${scheda.nome} (copia)`, descrizione: scheda.descrizione, is_template: false })
      .select().single()

    if (!nuovaScheda) { setDuplicating(null); return }

    const { data: giorni } = await supabase
      .from('scheda_giorni')
      .select(`id, nome, ordine, scheda_esercizi ( esercizio_id, serie, ripetizioni, recupero_secondi, note, ordine )`)
      .eq('scheda_id', scheda.id).order('ordine')

    if (giorni && giorni.length > 0) {
      for (const giorno of giorni) {
        const { data: nuovoGiorno } = await supabase
          .from('scheda_giorni')
          .insert({ scheda_id: nuovaScheda.id, nome: giorno.nome, ordine: giorno.ordine })
          .select().single()
        if (nuovoGiorno && (giorno as any).scheda_esercizi?.length > 0) {
          await supabase.from('scheda_esercizi').insert(
            (giorno as any).scheda_esercizi.map((se: any) => ({
              giorno_id: nuovoGiorno.id, esercizio_id: se.esercizio_id,
              serie: se.serie, ripetizioni: se.ripetizioni,
              recupero_secondi: se.recupero_secondi, note: se.note, ordine: se.ordine,
            }))
          )
        }
      }
    }

    setDuplicating(null)
    router.push(`/coach/schede/${nuovaScheda.id}`)
  }

  return (
    <div className="space-y-8 max-w-5xl">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-4xl font-black tracking-tight" style={{ color: 'oklch(0.97 0 0)' }}>Schede</h1>
          <p className="mt-1 text-sm" style={{ color: 'oklch(0.50 0 0)' }}>Crea e gestisci le schede di allenamento</p>
        </div>
        <button onClick={() => router.push('/coach/schede/nuova')}
          className="px-5 py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-95"
          style={{ background: 'oklch(0.70 0.19 46)', color: 'oklch(0.13 0 0)' }}>
          + Nuova scheda
        </button>
      </div>

      <div className="rounded-2xl overflow-hidden"
        style={{ background: 'oklch(0.18 0 0)', border: '1px solid oklch(1 0 0 / 6%)' }}>
        <div className="px-6 py-4 flex items-center justify-between"
          style={{ borderBottom: '1px solid oklch(1 0 0 / 6%)' }}>
          <h2 className="font-bold" style={{ color: 'oklch(0.97 0 0)' }}>Le tue schede</h2>
          <span className="text-xs font-semibold px-3 py-1 rounded-full"
            style={{ background: 'oklch(0.70 0.19 46 / 15%)', color: 'oklch(0.70 0.19 46)' }}>
            {schede.length} totali
          </span>
        </div>

        {loading ? (
          <div className="py-16 text-center">
            <p className="text-sm" style={{ color: 'oklch(0.45 0 0)' }}>Caricamento...</p>
          </div>
        ) : schede.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <div className="text-5xl">📋</div>
            <p className="font-semibold" style={{ color: 'oklch(0.97 0 0)' }}>Nessuna scheda ancora</p>
            <button onClick={() => router.push('/coach/schede/nuova')}
              className="inline-flex items-center gap-2 mt-2 px-5 py-2.5 rounded-xl text-sm font-semibold"
              style={{ background: 'oklch(0.70 0.19 46)', color: 'oklch(0.13 0 0)' }}>
              + Crea scheda
            </button>
          </div>
        ) : (
          <div>
            {schede.map((s, i) => {
              const assegnazioniAttive = s.assegnazioni?.filter((a: any) => a.attiva) ?? []
              const isAssegnata = assegnazioniAttive.length > 0

              return (
                <div key={s.id}
                  className="flex items-center gap-4 px-6 py-5 group transition-colors cursor-pointer hover:bg-white/2"
                  style={{ borderBottom: i < schede.length - 1 ? '1px solid oklch(1 0 0 / 4%)' : 'none' }}
                  onClick={() => router.push(`/coach/schede/${s.id}`)}>

                  {/* Icona con colore diverso se assegnata */}
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                    style={{ background: isAssegnata ? 'oklch(0.65 0.18 150 / 15%)' : 'oklch(0.70 0.19 46 / 10%)' }}>
                    {isAssegnata ? '✅' : '📋'}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold" style={{ color: 'oklch(0.97 0 0)' }}>{s.nome}</p>
                      {s.is_template && (
                        <span className="text-xs px-2 py-0.5 rounded-full"
                          style={{ background: 'oklch(0.55 0.20 300 / 15%)', color: 'oklch(0.65 0.15 300)' }}>
                          Template
                        </span>
                      )}
                      {/* Badge clienti assegnati */}
                      {assegnazioniAttive.length > 0 && (
                        <span className="text-xs px-2 py-0.5 rounded-full"
                          style={{ background: 'oklch(0.65 0.18 150 / 15%)', color: 'oklch(0.65 0.18 150)' }}>
                          {assegnazioniAttive.length === 1
                            ? `Assegnata a ${(assegnazioniAttive[0] as any).profiles?.full_name}`
                            : `Assegnata a ${assegnazioniAttive.length} clienti`}
                        </span>
                      )}
                    </div>
                    {s.descrizione && (
                      <p className="text-sm mt-0.5 truncate" style={{ color: 'oklch(0.50 0 0)' }}>{s.descrizione}</p>
                    )}
                    <p className="text-xs mt-1" style={{ color: 'oklch(0.40 0 0)' }}>
                      Creata il {new Date(s.created_at).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                  </div>

                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0"
                    onClick={(e) => e.stopPropagation()}>
                    <button onClick={() => router.push(`/coach/schede/${s.id}`)}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                      style={{ background: 'oklch(0.22 0 0)', color: 'oklch(0.70 0 0)', border: '1px solid oklch(1 0 0 / 8%)' }}>
                      Modifica
                    </button>
                    <button onClick={() => handleDuplica(s)} disabled={duplicating === s.id}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                      style={{ background: 'oklch(0.55 0.20 300 / 15%)', color: 'oklch(0.65 0.15 300)', border: '1px solid oklch(0.55 0.20 300 / 20%)' }}>
                      {duplicating === s.id ? '...' : 'Duplica'}
                    </button>
                    <button onClick={() => handleDelete(s.id, s.nome)}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                      style={{ background: 'oklch(0.65 0.22 27 / 15%)', color: 'oklch(0.75 0.15 27)', border: '1px solid oklch(0.65 0.22 27 / 20%)' }}>
                      Elimina
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
