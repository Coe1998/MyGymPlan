'use client'

import { useEffect, useState, useMemo } from 'react'
import BynariLoader from '@/components/shared/BynariLoader'
import { createClient } from '@/lib/supabase/client'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faClipboardList, faCircleCheck, faXmark, faCopy, faHourglass } from '@fortawesome/free-solid-svg-icons'
import { PIANI } from '@/lib/piani'
import PaywallModal from '@/components/shared/PaywallModal'
import SchedaEditorModal from '@/components/coach/SchedaEditorModal'

interface Scheda {
  id: string
  nome: string
  descrizione: string | null
  created_at: string
  scheda_giorni: { id: string }[]
  assegnazioni: { id: string; attiva: boolean }[]
}

export default function AtletaSchedePage() {
  const supabase = useMemo(() => createClient(), [])
  const [schede, setSchede] = useState<Scheda[]>([])
  const [piano, setPiano] = useState<'free' | 'pro'>('free')
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [showPaywall, setShowPaywall] = useState(false)
  const [creating, setCreating] = useState(false)
  const [duplicating, setDuplicating] = useState<string | null>(null)
  const [editingScheda, setEditingScheda] = useState<{ id: string; nome: string } | null>(null)

  const fetchSchede = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setUserId(user.id)
    const { data: profile } = await supabase.from('profiles').select('piano').eq('id', user.id).single()
    setPiano(profile?.piano ?? 'free')
    const { data } = await supabase
      .from('schede')
      .select('id, nome, descrizione, created_at, scheda_giorni ( id ), assegnazioni ( id, attiva )')
      .eq('coach_id', user.id)
      .order('created_at', { ascending: false })
    setSchede((data as any) ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchSchede() }, [])

  const limite = PIANI[piano].max_schede
  const limitaRaggiunto = schede.length >= limite

  const handleNuovaScheda = async () => {
    if (limitaRaggiunto) { setShowPaywall(true); return }
    setCreating(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setCreating(false); return }

    const { data: nuova } = await supabase
      .from('schede')
      .insert({ coach_id: user.id, nome: 'Nuova scheda', is_template: false })
      .select().single()

    if (nuova) {
      // Disattiva assegnazioni precedenti
      await supabase.from('assegnazioni')
        .update({ attiva: false })
        .eq('cliente_id', user.id)
        .eq('coach_id', user.id)
        .eq('attiva', true)

      // Auto-assegnazione self-service
      await supabase.from('assegnazioni').insert({
        scheda_id: nuova.id,
        cliente_id: user.id,
        coach_id: user.id,
        data_inizio: new Date().toISOString().split('T')[0],
        attiva: true,
      })

      setEditingScheda({ id: nuova.id, nome: nuova.nome })
    }
    setCreating(false)
  }

  const handleDelete = async (id: string, nome: string) => {
    if (!confirm(`Eliminare la scheda "${nome}"? Questa azione è irreversibile.`)) return
    await supabase.from('schede').delete().eq('id', id)
    fetchSchede()
  }

  const handleDuplica = async (scheda: Scheda) => {
    if (limitaRaggiunto) { setShowPaywall(true); return }
    setDuplicating(scheda.id)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setDuplicating(null); return }

    const { data: nuovaScheda } = await supabase
      .from('schede')
      .insert({ coach_id: user.id, nome: `${scheda.nome} (copia)`, descrizione: scheda.descrizione, is_template: false })
      .select().single()

    if (!nuovaScheda) { setDuplicating(null); return }

    const { data: giorni } = await supabase
      .from('scheda_giorni')
      .select('id, nome, ordine, scheda_esercizi ( esercizio_id, serie, ripetizioni, recupero_secondi, note, ordine )')
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
    fetchSchede()
  }

  const handleAttivaScheda = async (schedaId: string) => {
    if (!userId) return
    await supabase.from('assegnazioni')
      .update({ attiva: false })
      .eq('cliente_id', userId)
      .eq('coach_id', userId)
      .eq('attiva', true)

    const existing = await supabase.from('assegnazioni')
      .select('id').eq('scheda_id', schedaId).eq('cliente_id', userId).eq('coach_id', userId).maybeSingle()

    if (existing.data) {
      await supabase.from('assegnazioni').update({ attiva: true }).eq('id', existing.data.id)
    } else {
      await supabase.from('assegnazioni').insert({
        scheda_id: schedaId, cliente_id: userId, coach_id: userId,
        data_inizio: new Date().toISOString().split('T')[0], attiva: true,
      })
    }
    fetchSchede()
  }

  return (
    <div className="space-y-6 max-w-5xl">
      {showPaywall && (
        <PaywallModal
          titolo="Sblocca più schede"
          descrizione={`Con il piano Free puoi creare ${limite === 1 ? 'solo 1 scheda' : `${limite} schede`}. Passa a Pro per schede illimitate e tutte le funzionalità avanzate.`}
          onClose={() => setShowPaywall(false)}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-3xl lg:text-4xl font-black tracking-tight truncate" style={{ color: 'var(--c-97)' }}>
            Schede
          </h1>
          <p className="mt-0.5 text-sm" style={{ color: 'var(--c-50)' }}>
            {loading ? '...' : `${schede.length}/${limite === Infinity ? '∞' : limite} schede`}
          </p>
        </div>
        <button onClick={handleNuovaScheda} disabled={creating}
          className="flex-shrink-0 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-95 whitespace-nowrap"
          style={{ background: 'oklch(0.70 0.19 46)', color: 'var(--c-13)' }}>
          {creating ? '...' : '+ Nuova'}
        </button>
      </div>

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
            <div className="text-5xl" style={{ color: 'var(--c-35)' }}>
              <FontAwesomeIcon icon={faClipboardList} />
            </div>
            <p className="font-semibold" style={{ color: 'var(--c-97)' }}>Nessuna scheda ancora</p>
            <button onClick={handleNuovaScheda}
              className="inline-flex items-center gap-2 mt-2 px-5 py-2.5 rounded-xl text-sm font-semibold"
              style={{ background: 'oklch(0.70 0.19 46)', color: 'var(--c-13)' }}>
              + Crea scheda
            </button>
          </div>
        ) : (
          <div>
            {schede.map((s, i) => {
              const assegnazioniAttive = s.assegnazioni?.filter((a: any) => a.attiva) ?? []
              const isAttiva = assegnazioniAttive.length > 0

              return (
                <div key={s.id}
                  className="flex items-center gap-3 px-4 py-4 group transition-colors cursor-pointer hover:bg-white/2"
                  style={{ borderBottom: i < schede.length - 1 ? '1px solid var(--c-w4)' : 'none' }}
                  onClick={() => setEditingScheda({ id: s.id, nome: s.nome })}>

                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                    style={{ background: isAttiva ? 'oklch(0.65 0.18 150 / 15%)' : 'oklch(0.70 0.19 46 / 10%)' }}>
                    <FontAwesomeIcon icon={isAttiva ? faCircleCheck : faClipboardList}
                      style={{ color: isAttiva ? 'oklch(0.65 0.18 150)' : 'oklch(0.70 0.19 46)' }} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold truncate" style={{ color: 'var(--c-97)' }}>{s.nome}</p>
                      {isAttiva && (
                        <span className="text-xs px-2 py-0.5 rounded-full flex-shrink-0"
                          style={{ background: 'oklch(0.65 0.18 150 / 15%)', color: 'oklch(0.65 0.18 150)' }}>
                          Attiva
                        </span>
                      )}
                    </div>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--c-40)' }}>
                      {s.scheda_giorni?.length ?? 0} giorni ·{' '}
                      {new Date(s.created_at).toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </div>

                  <div className="flex gap-1.5 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                    {!isAttiva && (
                      <button onClick={() => handleAttivaScheda(s.id)}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                        style={{ background: 'oklch(0.65 0.18 150 / 15%)', color: 'oklch(0.65 0.18 150)', border: '1px solid oklch(0.65 0.18 150 / 25%)' }}>
                        Attiva
                      </button>
                    )}
                    <button onClick={() => handleDuplica(s)} disabled={duplicating === s.id}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-sm transition-all"
                      style={{ background: 'oklch(0.55 0.20 300 / 15%)', color: 'oklch(0.65 0.15 300)', border: '1px solid oklch(0.55 0.20 300 / 20%)' }}
                      title="Duplica">
                      <FontAwesomeIcon icon={duplicating === s.id ? faHourglass : faCopy} />
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

      {editingScheda && (
        <SchedaEditorModal
          schedaId={editingScheda.id}
          schedaNome={editingScheda.nome}
          onClose={() => { setEditingScheda(null); fetchSchede() }}
        />
      )}
    </div>
  )
}
