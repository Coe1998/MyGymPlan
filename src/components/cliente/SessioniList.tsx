'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCircleCheck, faTrash, faPersonRunning, faPlay } from '@fortawesome/free-solid-svg-icons'

interface Sessione {
  id: string
  data: string
  completata: boolean
  giorno_id: string | null
  assegnazione_id: string | null
  scheda_giorni: { nome: string } | null
}

export default function SessioniList({ sessioni }: { sessioni: Sessione[] }) {
  const [lista, setLista] = useState(sessioni)
  const [eliminando, setEliminando] = useState<string | null>(null)
  const [conferma, setConferma] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const eliminaSessione = async (id: string) => {
    setEliminando(id)
    await supabase.from('log_serie').delete().eq('sessione_id', id)
    await supabase.from('sessioni').delete().eq('id', id)
    setLista(prev => prev.filter(s => s.id !== id))
    setConferma(null)
    setEliminando(null)
    router.refresh()
  }

  if (lista.length === 0) {
    return (
      <div className="py-12 text-center space-y-3">
        <p className="text-4xl"><FontAwesomeIcon icon={faPersonRunning} /></p>
        <p className="font-semibold" style={{ color: 'oklch(0.97 0 0)' }}>Nessun allenamento ancora</p>
        <p className="text-sm" style={{ color: 'oklch(0.45 0 0)' }}>
          Inizia il tuo primo allenamento dalla scheda qui sopra
        </p>
      </div>
    )
  }

  return (
    <div>
      {lista.map((s, i) => {
        const isInCorso = !s.completata
        const isConfirming = conferma === s.id
        // In-progress: resume via giorno+assegnazione (edit mode), NOT ?sessione= (view mode)
        const resumeUrl = s.giorno_id && s.assegnazione_id
          ? `/cliente/allenamento?giorno=${s.giorno_id}&assegnazione=${s.assegnazione_id}`
          : null
        const handleResume = () => { if (isInCorso && !isConfirming && resumeUrl) router.push(resumeUrl) }

        return (
          <div key={s.id} className="flex items-center gap-4 px-6 py-4"
            style={{
              borderBottom: i < lista.length - 1 ? '1px solid oklch(1 0 0 / 4%)' : 'none',
              borderLeft: isInCorso ? '3px solid oklch(0.70 0.19 46)' : '3px solid transparent',
              background: isInCorso ? 'oklch(0.70 0.19 46 / 4%)' : 'transparent',
            }}>

            {/* Icona stato — cliccabile se in corso */}
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
              style={{
                background: isInCorso ? 'oklch(0.70 0.19 46 / 15%)' : 'oklch(0.65 0.18 150 / 15%)',
                cursor: isInCorso && resumeUrl ? 'pointer' : 'default',
              }}
              onClick={handleResume}>
              {isInCorso
                ? <FontAwesomeIcon icon={faPlay} style={{ color: 'oklch(0.70 0.19 46)', fontSize: 14 }} />
                : <FontAwesomeIcon icon={faCircleCheck} style={{ color: 'oklch(0.65 0.18 150)' }} />}
            </div>

            {/* Nome + data — cliccabile se in corso */}
            <div className="flex-1 min-w-0"
              style={{ cursor: isInCorso && resumeUrl ? 'pointer' : 'default' }}
              onClick={handleResume}>
              <p className="font-semibold text-sm" style={{ color: 'oklch(0.97 0 0)' }}>
                {s.scheda_giorni?.nome ?? 'Allenamento'}
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'oklch(0.45 0 0)' }}>
                {new Date(s.data).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })}
              </p>
            </div>

            {/* Badge stato */}
            {!isConfirming && (
              <span
                className="text-xs px-2.5 py-1 rounded-full flex-shrink-0"
                style={{
                  background: isInCorso ? 'oklch(0.70 0.19 46 / 15%)' : 'oklch(0.65 0.18 150 / 15%)',
                  color: isInCorso ? 'oklch(0.70 0.19 46)' : 'oklch(0.65 0.18 150)',
                  cursor: isInCorso && resumeUrl ? 'pointer' : 'default',
                }}
                onClick={handleResume}>
                {isInCorso ? 'In corso →' : 'Completato'}
              </span>
            )}

            {/* Bottone elimina — solo su incomplete */}
            {isInCorso && (
              isConfirming ? (
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => eliminaSessione(s.id)}
                    disabled={eliminando === s.id}
                    className="text-xs px-2.5 py-1 rounded-lg font-semibold transition-all active:scale-95"
                    style={{ background: 'oklch(0.55 0.18 27 / 20%)', color: 'oklch(0.75 0.15 27)' }}>
                    {eliminando === s.id ? '...' : 'Sì, elimina'}
                  </button>
                  <button
                    onClick={() => setConferma(null)}
                    className="text-xs px-2.5 py-1 rounded-lg transition-all"
                    style={{ background: 'oklch(0.22 0 0)', color: 'oklch(0.50 0 0)' }}>
                    Annulla
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConferma(s.id)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-all active:scale-90 hover:opacity-80"
                  style={{ background: 'oklch(0.22 0 0)', color: 'oklch(0.40 0 0)' }}
                  title="Elimina sessione">
                  <FontAwesomeIcon icon={faTrash} className="text-xs" />
                </button>
              )
            )}
          </div>
        )
      })}
    </div>
  )
}
