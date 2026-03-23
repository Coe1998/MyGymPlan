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
    <div className="flex items-center justify-between gap-3">
	  <div className="min-w-0">
		<h1 className="text-3xl lg:text-4xl font-black tracking-tight truncate" style={{ color: 'oklch(0.97 0 0)' }}>Schede</h1>
		<p className="mt-0.5 text-sm" style={{ color: 'oklch(0.50 0 0)' }}>Crea e gestisci le schede</p>
	  </div>
	  <button onClick={() => router.push('/coach/schede/nuova')}
		className="flex-shrink-0 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-95 whitespace-nowrap"
		style={{ background: 'oklch(0.70 0.19 46)', color: 'oklch(0.13 0 0)' }}>
		+ Nuova
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
				  className="flex items-center gap-3 px-4 py-4 group transition-colors cursor-pointer hover:bg-white/2"
				  style={{ borderBottom: i < schede.length - 1 ? '1px solid oklch(1 0 0 / 4%)' : 'none' }}
				  onClick={() => router.push(`/coach/schede/${s.id}`)}>

				  {/* Icona */}
				  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
					style={{ background: isAssegnata ? 'oklch(0.65 0.18 150 / 15%)' : 'oklch(0.70 0.19 46 / 10%)' }}>
					{isAssegnata ? '✅' : '📋'}
				  </div>

				  {/* Info */}
				  <div className="flex-1 min-w-0">
					<div className="flex items-center gap-2 min-w-0">
					  <p className="font-semibold truncate" style={{ color: 'oklch(0.97 0 0)' }}>{s.nome}</p>
					  {s.is_template && (
						<span className="text-xs px-2 py-0.5 rounded-full flex-shrink-0"
						  style={{ background: 'oklch(0.55 0.20 300 / 15%)', color: 'oklch(0.65 0.15 300)' }}>
						  Template
						</span>
					  )}
					</div>
					<div className="flex items-center gap-2 mt-0.5 flex-wrap">
					  {assegnazioniAttive.length > 0 && (
						<span className="text-xs px-2 py-0.5 rounded-full"
						  style={{ background: 'oklch(0.65 0.18 150 / 15%)', color: 'oklch(0.65 0.18 150)' }}>
						  {assegnazioniAttive.length === 1
							? `👤 ${(assegnazioniAttive[0] as any).profiles?.full_name?.split(' ')[0]}`
							: `👥 ${assegnazioniAttive.length} clienti`}
						</span>
					  )}
					  <p className="text-xs" style={{ color: 'oklch(0.40 0 0)' }}>
						{new Date(s.created_at).toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' })}
					  </p>
					</div>
				  </div>

				  {/* Azioni — icone su mobile, testo su desktop */}
				  <div className="flex gap-1.5 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
					<button onClick={() => handleDuplica(s)} disabled={duplicating === s.id}
					  className="w-8 h-8 rounded-lg flex items-center justify-center text-sm transition-all"
					  style={{ background: 'oklch(0.55 0.20 300 / 15%)', color: 'oklch(0.65 0.15 300)', border: '1px solid oklch(0.55 0.20 300 / 20%)' }}
					  title="Duplica">
					  {duplicating === s.id ? '⏳' : '⧉'}
					</button>
					<button onClick={() => handleDelete(s.id, s.nome)}
					  className="w-8 h-8 rounded-lg flex items-center justify-center text-sm transition-all"
					  style={{ background: 'oklch(0.65 0.22 27 / 15%)', color: 'oklch(0.75 0.15 27)', border: '1px solid oklch(0.65 0.22 27 / 20%)' }}
					  title="Elimina">
					  ✕
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
