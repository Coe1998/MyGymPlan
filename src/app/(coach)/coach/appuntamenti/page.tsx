'use client'

import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCalendarDays, faVideo, faPhone, faPerson, faCheck, faXmark, faChevronDown } from '@fortawesome/free-solid-svg-icons'

interface Appuntamento {
  id: string
  cliente_id: string
  data_ora: string
  durata_minuti: number
  tipo: string
  link: string | null
  note: string | null
  stato: string
  profiles: { full_name: string | null }
}

const TIPO_ICON: Record<string, any> = {
  videocall: faVideo,
  chiamata: faPhone,
  presenza: faPerson,
}

export default function AppuntamentiPage() {
  const supabase = useMemo(() => createClient(), [])
  const [appuntamenti, setAppuntamenti] = useState<Appuntamento[]>([])
  const [loading, setLoading] = useState(true)
  const [storicoAperto, setStoricoAperto] = useState(false)

  const fetchAll = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from('appuntamenti')
      .select('id, cliente_id, data_ora, durata_minuti, tipo, link, note, stato, profiles!appuntamenti_cliente_id_fkey(full_name)')
      .eq('coach_id', user.id)
      .order('data_ora', { ascending: true })
    setAppuntamenti((data as any) ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchAll() }, [])

  const now = new Date()
  const futuri = appuntamenti.filter(a => new Date(a.data_ora) >= now && a.stato === 'programmato')
  const storici = appuntamenti.filter(a => new Date(a.data_ora) < now || a.stato !== 'programmato')

  const handleStato = async (id: string, stato: 'completato' | 'annullato') => {
    await supabase.from('appuntamenti').update({ stato }).eq('id', id)
    fetchAll()
  }

  const perGiorno = futuri.reduce((acc, a) => {
    const giorno = new Date(a.data_ora).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })
    if (!acc[giorno]) acc[giorno] = []
    acc[giorno].push(a)
    return acc
  }, {} as Record<string, Appuntamento[]>)

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-4xl font-black tracking-tight" style={{ color: 'oklch(0.97 0 0)' }}>Appuntamenti</h1>
        <p className="mt-1 text-sm" style={{ color: 'oklch(0.50 0 0)' }}>
          {futuri.length} prossimi · {storici.length} passati
        </p>
      </div>

      {loading ? (
        <p className="text-sm" style={{ color: 'oklch(0.45 0 0)' }}>Caricamento...</p>
      ) : futuri.length === 0 ? (
        <div className="rounded-2xl py-16 text-center"
          style={{ background: 'oklch(0.18 0 0)', border: '1px solid oklch(1 0 0 / 6%)' }}>
          <p className="text-4xl mb-3"><FontAwesomeIcon icon={faCalendarDays} /></p>
          <p className="font-semibold" style={{ color: 'oklch(0.97 0 0)' }}>Nessun appuntamento programmato</p>
          <p className="text-sm mt-1" style={{ color: 'oklch(0.45 0 0)' }}>
            Vai nel profilo di un cliente per fissare un check-in
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(perGiorno).map(([giorno, apps]) => (
            <div key={giorno}>
              <p className="text-xs font-bold uppercase tracking-widest mb-2 capitalize"
                style={{ color: 'oklch(0.50 0 0)' }}>{giorno}</p>
              <div className="space-y-2">
                {apps.map(a => (
                  <div key={a.id} className="rounded-2xl p-4 flex items-center gap-4"
                    style={{ background: 'oklch(0.18 0 0)', border: '1px solid oklch(1 0 0 / 6%)' }}>
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: 'oklch(0.60 0.15 200 / 15%)', color: 'oklch(0.60 0.15 200)' }}>
                      <FontAwesomeIcon icon={TIPO_ICON[a.tipo] ?? faCalendarDays} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm" style={{ color: 'oklch(0.97 0 0)' }}>
                        {(a as any).profiles?.full_name ?? 'Cliente'}
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: 'oklch(0.50 0 0)' }}>
                        {new Date(a.data_ora).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                        {' · '}{a.durata_minuti} min
                        {' · '}{a.tipo}
                        {a.link && <> · <a href={a.link} target="_blank" rel="noopener noreferrer"
                          style={{ color: 'oklch(0.60 0.15 200)' }}>Link</a></>}
                      </p>
                      {a.note && <p className="text-xs mt-0.5 italic" style={{ color: 'oklch(0.45 0 0)' }}>{a.note}</p>}
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <button onClick={() => handleStato(a.id, 'completato')}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold"
                        style={{ background: 'oklch(0.65 0.18 150 / 15%)', color: 'oklch(0.65 0.18 150)' }}>
                        <FontAwesomeIcon icon={faCheck} />
                      </button>
                      <button onClick={() => handleStato(a.id, 'annullato')}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium"
                        style={{ background: 'oklch(0.65 0.22 27 / 15%)', color: 'oklch(0.75 0.15 27)' }}>
                        <FontAwesomeIcon icon={faXmark} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Storico */}
      {storici.length > 0 && (
        <div>
          <button onClick={() => setStoricoAperto(p => !p)}
            className="flex items-center gap-2 text-sm font-semibold mb-3"
            style={{ color: 'oklch(0.45 0 0)' }}>
            <FontAwesomeIcon icon={faChevronDown}
              style={{ transform: storicoAperto ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
            Storico ({storici.length})
          </button>
          {storicoAperto && (
            <div className="space-y-2">
              {storici.map(a => (
                <div key={a.id} className="rounded-2xl px-4 py-3 flex items-center gap-3"
                  style={{ background: 'oklch(0.16 0 0)', border: '1px solid oklch(1 0 0 / 4%)', opacity: 0.6 }}>
                  <FontAwesomeIcon icon={TIPO_ICON[a.tipo] ?? faCalendarDays}
                    style={{ color: 'oklch(0.40 0 0)' }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold" style={{ color: 'oklch(0.70 0 0)' }}>
                      {(a as any).profiles?.full_name ?? 'Cliente'}
                    </p>
                    <p className="text-xs" style={{ color: 'oklch(0.40 0 0)' }}>
                      {new Date(a.data_ora).toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' })}
                      {' · '}{a.stato}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
