'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faClipboardList, faPlus, faTrash, faArrowRight, faLock } from '@fortawesome/free-solid-svg-icons'
import { PIANI } from '@/lib/piani'
import PaywallModal from '@/components/shared/PaywallModal'

interface Scheda {
  id: string
  nome: string
  descrizione: string | null
  created_at: string
  scheda_giorni: { id: string }[]
}

export default function AtletaSchedePage() {
  const supabase = createClient()
  const router = useRouter()
  const [schede, setSchede] = useState<Scheda[]>([])
  const [piano, setPiano] = useState<'free' | 'pro'>('free')
  const [loading, setLoading] = useState(true)
  const [showPaywall, setShowPaywall] = useState(false)
  const [creando, setCreando] = useState(false)
  const [nomeNuova, setNomeNuova] = useState('')
  const [showForm, setShowForm] = useState(false)

  const fetchSchede = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: profile } = await supabase.from('profiles').select('piano').eq('id', user.id).single()
    setPiano(profile?.piano ?? 'free')
    const { data } = await supabase
      .from('schede')
      .select('id, nome, descrizione, created_at, scheda_giorni ( id )')
      .eq('coach_id', user.id)
      .order('created_at', { ascending: false })
    setSchede((data as any) ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchSchede() }, [])

  const limite = PIANI[piano].max_schede
  const limitaRaggiunto = schede.length >= limite

  const handleNuovaScheda = () => {
    if (limitaRaggiunto) { setShowPaywall(true); return }
    setShowForm(true)
  }

  const handleCreaScheda = async () => {
    if (!nomeNuova.trim()) return
    setCreando(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Crea scheda
    const { data: nuova } = await supabase
      .from('schede')
      .insert({ coach_id: user.id, nome: nomeNuova.trim(), is_template: false })
      .select().single()

    if (nuova) {
      // Auto-assegnazione: il coach_id e cliente_id sono lo stesso utente
      await supabase.from('assegnazioni').insert({
        scheda_id: nuova.id,
        cliente_id: user.id,
        coach_id: user.id,
        data_inizio: new Date().toISOString().split('T')[0],
        attiva: true,
      })
      router.push(`/atleta/schede/${nuova.id}`)
    }
    setCreando(false)
  }

  const handleDelete = async (id: string, nome: string) => {
    if (!confirm(`Eliminare la scheda "${nome}"? Tutti i dati verranno persi.`)) return
    await supabase.from('schede').delete().eq('id', id)
    fetchSchede()
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {showPaywall && (
        <PaywallModal
          titolo="Sblocca più schede"
          descrizione={`Con il piano Free puoi creare ${limite === 1 ? 'solo 1 scheda' : `${limite} schede`}. Passa a Pro per schede illimitate, più giorni e tutte le funzionalità avanzate.`}
          onClose={() => setShowPaywall(false)}
        />
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight" style={{ color: 'oklch(0.97 0 0)' }}>Schede</h1>
          <p className="text-sm mt-1" style={{ color: 'oklch(0.50 0 0)' }}>
            {schede.length}/{limite === Infinity ? '∞' : limite} schede utilizzate
          </p>
        </div>
        <button onClick={handleNuovaScheda}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-95"
          style={{
            background: limitaRaggiunto ? 'oklch(0.22 0 0)' : 'oklch(0.70 0.19 46)',
            color: limitaRaggiunto ? 'oklch(0.50 0 0)' : 'oklch(0.13 0 0)',
            border: limitaRaggiunto ? '1px solid oklch(1 0 0 / 8%)' : 'none',
          }}>
          {limitaRaggiunto
            ? <><FontAwesomeIcon icon={faLock} /> Limite raggiunto</>
            : <><FontAwesomeIcon icon={faPlus} /> Nuova scheda</>}
        </button>
      </div>

      {/* Banner limite raggiunto */}
      {limitaRaggiunto && piano === 'free' && (
        <div className="rounded-2xl p-4 flex items-center gap-4"
          style={{ background: 'oklch(0.70 0.19 46 / 10%)', border: '1px solid oklch(0.70 0.19 46 / 25%)' }}>
          <FontAwesomeIcon icon={faLock} style={{ color: 'oklch(0.70 0.19 46)' }} className="text-xl flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold" style={{ color: 'oklch(0.70 0.19 46)' }}>Limite piano Free raggiunto</p>
            <p className="text-xs mt-0.5" style={{ color: 'oklch(0.55 0 0)' }}>
              Passa a Pro per schede illimitate, fino a ∞ giorni e tutte le funzionalità.
            </p>
          </div>
          <button onClick={() => setShowPaywall(true)}
            className="px-3 py-1.5 rounded-xl text-xs font-bold flex-shrink-0"
            style={{ background: 'oklch(0.70 0.19 46)', color: 'oklch(0.13 0 0)' }}>
            Vai a Pro
          </button>
        </div>
      )}

      {/* Form nuova scheda */}
      {showForm && (
        <div className="rounded-2xl p-5 space-y-4"
          style={{ background: 'oklch(0.18 0 0)', border: '1px solid oklch(0.70 0.19 46 / 30%)' }}>
          <h2 className="font-bold" style={{ color: 'oklch(0.97 0 0)' }}>Nuova scheda</h2>
          <input type="text" value={nomeNuova} onChange={e => setNomeNuova(e.target.value)}
            placeholder='es. "Push / Pull / Legs", "Full Body"' autoFocus
            className="w-full px-4 py-3 rounded-xl text-sm outline-none"
            style={{ background: 'oklch(0.22 0 0)', border: '1px solid oklch(1 0 0 / 8%)', color: 'oklch(0.97 0 0)' }}
            onKeyDown={e => e.key === 'Enter' && handleCreaScheda()}
            onFocus={e => e.target.style.borderColor = 'oklch(0.70 0.19 46)'}
            onBlur={e => e.target.style.borderColor = 'oklch(1 0 0 / 8%)'} />
          <div className="flex gap-3">
            <button onClick={handleCreaScheda} disabled={creando || !nomeNuova.trim()}
              className="px-6 py-2.5 rounded-xl text-sm font-semibold"
              style={{
                background: !nomeNuova.trim() ? 'oklch(0.35 0 0)' : 'oklch(0.70 0.19 46)',
                color: 'oklch(0.13 0 0)',
              }}>
              {creando ? 'Creazione...' : 'Crea e modifica →'}
            </button>
            <button onClick={() => { setShowForm(false); setNomeNuova('') }}
              className="px-6 py-2.5 rounded-xl text-sm font-medium"
              style={{ background: 'oklch(0.22 0 0)', color: 'oklch(0.60 0 0)', border: '1px solid oklch(1 0 0 / 8%)' }}>
              Annulla
            </button>
          </div>
        </div>
      )}

      {/* Lista schede */}
      {loading ? (
        <p className="text-sm text-center py-8" style={{ color: 'oklch(0.45 0 0)' }}>Caricamento...</p>
      ) : schede.length === 0 ? (
        <div className="rounded-2xl py-16 text-center space-y-3"
          style={{ background: 'oklch(0.18 0 0)', border: '1px solid oklch(1 0 0 / 6%)' }}>
          <p className="text-5xl"><FontAwesomeIcon icon={faClipboardList} /></p>
          <p className="font-semibold" style={{ color: 'oklch(0.97 0 0)' }}>Nessuna scheda ancora</p>
          <p className="text-sm" style={{ color: 'oklch(0.45 0 0)' }}>Crea la tua prima scheda di allenamento</p>
        </div>
      ) : (
        <div className="space-y-3">
          {(schede as any[]).map((s) => (
            <div key={s.id} className="rounded-2xl p-5 flex items-center gap-4 group"
              style={{ background: 'oklch(0.18 0 0)', border: '1px solid oklch(1 0 0 / 6%)' }}>
              <div className="flex-1 min-w-0">
                <p className="font-bold" style={{ color: 'oklch(0.97 0 0)' }}>{s.nome}</p>
                {s.descrizione && (
                  <p className="text-sm mt-0.5" style={{ color: 'oklch(0.50 0 0)' }}>{s.descrizione}</p>
                )}
                <p className="text-xs mt-2" style={{ color: 'oklch(0.40 0 0)' }}>
                  {s.scheda_giorni?.length ?? 0} giorni ·{' '}
                  {new Date(s.created_at).toLocaleDateString('it-IT')}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button onClick={() => router.push(`/atleta/schede/${s.id}`)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition-all"
                  style={{ background: 'oklch(0.70 0.19 46 / 15%)', color: 'oklch(0.70 0.19 46)' }}>
                  Modifica <FontAwesomeIcon icon={faArrowRight} />
                </button>
                <button onClick={() => handleDelete(s.id, s.nome)}
                  className="w-9 h-9 rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"
                  style={{ background: 'oklch(0.65 0.22 27 / 15%)', color: 'oklch(0.75 0.15 27)' }}>
                  <FontAwesomeIcon icon={faTrash} className="text-xs" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
