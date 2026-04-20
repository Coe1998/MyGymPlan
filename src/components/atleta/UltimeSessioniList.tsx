'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCircleCheck, faPause, faPersonRunning, faXmark } from '@fortawesome/free-solid-svg-icons'

interface Sessione {
  id: string
  data: string
  completata: boolean
  scheda_giorni: { nome: string } | null
}

export default function UltimeSessioniList({ sessioni: iniziali }: { sessioni: Sessione[] }) {
  const [sessioni, setSessioni] = useState(iniziali)
  const supabase = createClient()

  const handleDelete = async (id: string) => {
    await supabase.from('log_serie').delete().eq('sessione_id', id)
    await supabase.from('sessioni').delete().eq('id', id)
    setSessioni(prev => prev.filter(s => s.id !== id))
  }

  if (sessioni.length === 0) {
    return (
      <div className="py-12 text-center space-y-3">
        <p className="text-4xl" style={{ color: 'var(--c-35)' }}><FontAwesomeIcon icon={faPersonRunning} /></p>
        <p className="font-semibold" style={{ color: 'var(--c-97)' }}>Nessun allenamento ancora</p>
        <p className="text-sm" style={{ color: 'var(--c-45)' }}>Inizia dalla scheda qui sopra</p>
      </div>
    )
  }

  return (
    <div>
      {sessioni.map((s, i) => (
        <div key={s.id} className="flex items-center gap-4 px-6 py-4"
          style={{ borderBottom: i < sessioni.length - 1 ? '1px solid var(--c-w4)' : 'none' }}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: s.completata ? 'oklch(0.65 0.18 150 / 15%)' : 'var(--c-22)' }}>
            <FontAwesomeIcon
              icon={s.completata ? faCircleCheck : faPause}
              style={{ color: s.completata ? 'oklch(0.65 0.18 150)' : 'var(--c-45)' }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm" style={{ color: 'var(--c-97)' }}>
              {s.scheda_giorni?.nome ?? 'Allenamento'}
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--c-45)' }}>
              {new Date(s.data).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-xs px-2.5 py-1 rounded-full"
              style={{
                background: s.completata ? 'oklch(0.65 0.18 150 / 15%)' : 'var(--c-22)',
                color: s.completata ? 'oklch(0.65 0.18 150)' : 'var(--c-45)',
              }}>
              {s.completata ? 'Completato' : 'Incompleto'}
            </span>
            {!s.completata && (
              <button
                onClick={() => handleDelete(s.id)}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-xs transition-all"
                style={{ background: 'oklch(0.65 0.22 27 / 15%)', color: 'oklch(0.75 0.15 27)', border: '1px solid oklch(0.65 0.22 27 / 20%)' }}
                title="Elimina sessione incompleta">
                <FontAwesomeIcon icon={faXmark} />
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
