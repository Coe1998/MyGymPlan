'use client'

import { useEffect, useState } from 'react'
import BynariLoader from '@/components/shared/BynariLoader'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faClipboardList, faCircleCheck, faUser, faUsers, faHourglass, faCopy, faXmark } from '@fortawesome/free-solid-svg-icons'
import SchedaEditorModal from '@/components/coach/SchedaEditorModal'

interface Scheda {
  id: string
  nome: string
  descrizione: string | null
  is_template: boolean
  created_at: string
  assegnazioni: { id: string; attiva: boolean; profiles: { full_name: string | null } }[]
}

export default function SchedePage() {
  const [schede, setSchede] = useState<Scheda[]>([])
  const [loading, setLoading] = useState(true)
  const [duplicating, setDuplicating] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()
  const [nuovaSchedaId, setNuovaSchedaId] = useState<string | null>(null)
  const [creatingNuova, setCreatingNuova] = useState(false)

  const handleNuovaScheda = async () => {
    setCreatingNuova(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from('schede')
      .insert({ coach_id: user.id, nome: 'Nuova scheda', is_template: false })
      .select().single()
    if (data) setNuovaSchedaId(data.id)
    setCreatingNuova(false)
  }

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
    <div className="max-w-5xl" style={{ paddingBottom: 100 }}>

      {/* ── Header mobile ── */}
      <div className="lg:hidden" style={{ padding: '16px 20px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <p style={{ fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--c-50)', fontWeight: 700 }}>PROGRAMMI</p>
            <h1 style={{ fontFamily: 'var(--font-syne)', fontWeight: 700, fontSize: 26, letterSpacing: '-0.02em', color: 'var(--c-97)', lineHeight: 1.1 }}>
              Schede
            </h1>
          </div>
          <button onClick={handleNuovaScheda} aria-label="Nuova scheda"
            style={{
              width: 40, height: 40, borderRadius: 12, flexShrink: 0,
              background: creatingNuova ? 'oklch(0.40 0.10 46)' : 'oklch(0.70 0.19 46)',
              color: 'var(--c-13)', fontSize: 16,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
            {creatingNuova ? '…' : '+'}
          </button>
        </div>
      </div>

      {/* ── Header desktop ── */}
      <div className="hidden lg:flex items-center justify-between gap-3" style={{ marginBottom: 24 }}>
        <div>
          <p style={{ fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--c-50)', fontWeight: 700, marginBottom: 4 }}>PROGRAMMI</p>
          <h1 style={{ fontFamily: 'var(--font-syne)', fontWeight: 700, fontSize: 32, letterSpacing: '-0.02em', color: 'var(--c-97)' }}>
            Schede
          </h1>
        </div>
        <button onClick={handleNuovaScheda}
          style={{
            height: 44, padding: '0 20px', borderRadius: 12, fontSize: 13.5, fontWeight: 600,
            background: creatingNuova ? 'oklch(0.40 0.10 46)' : 'oklch(0.70 0.19 46)',
            color: 'var(--c-13)', flexShrink: 0,
          }}>
          {creatingNuova ? 'Creazione…' : '+ Nuova scheda'}
        </button>
      </div>

      <div style={{ padding: '0 20px' }} className="lg:p-0 space-y-4 lg:space-y-6">

      {/* Lista */}
      <div className="rounded-2xl overflow-hidden"
        style={{ background: 'var(--c-18)', border: '1px solid var(--c-w6)' }}>
        <div className="px-5 py-4 flex items-center justify-between"
          style={{ borderBottom: '1px solid var(--c-w6)' }}>
          <h2 className="font-bold" style={{ color: 'var(--c-97)' }}>Le tue schede</h2>
          <span className="text-xs font-semibold px-3 py-1 rounded-full"
            style={{ background: 'oklch(0.70 0.19 46 / 15%)', color: 'oklch(0.70 0.19 46)' }}>
            {schede.length} totali
          </span>
        </div>

        {loading ? (
          <BynariLoader file="blue" size={80} />
        ) : schede.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <div className="text-5xl"><FontAwesomeIcon icon={faClipboardList} /></div>
            <p className="font-semibold" style={{ color: 'var(--c-97)' }}>Nessuna scheda ancora</p>
            <button onClick={() => handleNuovaScheda()}
              className="inline-flex items-center gap-2 mt-2 px-5 py-2.5 rounded-xl text-sm font-semibold"
              style={{ background: 'oklch(0.70 0.19 46)', color: 'var(--c-13)' }}>
              + Crea scheda
            </button>
          </div>
        ) : (
          <div>
            {schede.map((s, i) => {
              const assegnazioniAttive = s.assegnazioni?.filter((a: any) => a.attiva) ?? []
              const assegnazioniInattive = s.assegnazioni?.filter((a: any) => !a.attiva) ?? []
              const isAssegnata = assegnazioniAttive.length > 0

              return (
                <div key={s.id}
                  className="flex items-center gap-3 px-4 py-4 group transition-colors cursor-pointer hover:bg-white/2"
                  style={{ borderBottom: i < schede.length - 1 ? '1px solid var(--c-w4)' : 'none' }}
                  onClick={() => router.push(`/coach/schede/${s.id}`)}>

                  {/* Icona */}
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                    style={{ background: isAssegnata ? 'oklch(0.65 0.18 150 / 15%)' : 'oklch(0.70 0.19 46 / 10%)' }}>
                    {isAssegnata ? <FontAwesomeIcon icon={faCircleCheck} /> : <FontAwesomeIcon icon={faClipboardList} />}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <p className="font-semibold truncate" style={{ color: 'var(--c-97)' }}>{s.nome}</p>
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
                            ? <><FontAwesomeIcon icon={faUser} /> {(assegnazioniAttive[0] as any).profiles?.full_name?.split(' ')[0]}</>
                            : <><FontAwesomeIcon icon={faUsers} /> {assegnazioniAttive.length} clienti</>}
                        </span>
                      )}
                      {assegnazioniInattive.map((a: any) => (
                        <span key={a.id} className="text-xs px-2 py-0.5 rounded-full"
                          style={{ background: 'oklch(0.70 0.19 46 / 12%)', color: 'oklch(0.70 0.19 46)' }}
                          title="Assegnazione inattiva">
                          <FontAwesomeIcon icon={faUser} /> {a.profiles?.full_name?.split(' ')[0]}
                        </span>
                      ))}
                      <p className="text-xs" style={{ color: 'var(--c-40)' }}>
                        {new Date(s.created_at).toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                  </div>

                  {/* Azioni */}
                  <div className="flex gap-1.5 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                    <button onClick={() => handleDuplica(s)} disabled={duplicating === s.id}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-sm transition-all"
                      style={{ background: 'oklch(0.55 0.20 300 / 15%)', color: 'oklch(0.65 0.15 300)', border: '1px solid oklch(0.55 0.20 300 / 20%)' }}
                      title="Duplica">
                      {duplicating === s.id ? <FontAwesomeIcon icon={faHourglass} /> : <FontAwesomeIcon icon={faCopy} />}
                    </button>
                    <button onClick={() => handleDelete(s.id, s.nome)}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-sm transition-all"
                      style={{ background: 'oklch(0.65 0.22 27 / 15%)', color: 'oklch(0.75 0.15 27)', border: '1px solid oklch(0.65 0.22 27 / 20%)' }}
                      title="Elimina">
                      <FontAwesomeIcon icon={faXmark} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
      {nuovaSchedaId && (
        <SchedaEditorModal
          schedaId={nuovaSchedaId}
          schedaNome="Nuova scheda"
          onClose={() => { setNuovaSchedaId(null); fetchSchede() }}
        />
      )}
      </div>{/* end padding wrapper */}
    </div>
  )
}
