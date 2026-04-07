'use client'

import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCalendarDays, faVideo, faPhone, faPerson } from '@fortawesome/free-solid-svg-icons'

const TIPO_ICON: Record<string, any> = { videocall: faVideo, chiamata: faPhone, presenza: faPerson }

export default function AppuntamentiWidget() {
  const supabase = useMemo(() => createClient(), [])
  const [appuntamenti, setAppuntamenti] = useState<any[]>([])

  useEffect(() => {
    const fetch = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase
        .from('appuntamenti')
        .select('id, data_ora, durata_minuti, tipo, link, note')
        .eq('cliente_id', user.id)
        .eq('stato', 'programmato')
        .gte('data_ora', new Date().toISOString())
        .order('data_ora')
        .limit(3)
      setAppuntamenti(data ?? [])
    }
    fetch()
  }, [])

  if (appuntamenti.length === 0) return null

  return (
    <div className="rounded-2xl overflow-hidden"
      style={{ background: 'oklch(0.18 0 0)', border: '1px solid oklch(0.60 0.15 200 / 25%)' }}>
      <div className="px-5 py-3" style={{ borderBottom: '1px solid oklch(1 0 0 / 6%)' }}>
        <p className="font-bold text-sm" style={{ color: 'oklch(0.97 0 0)' }}>
          <FontAwesomeIcon icon={faCalendarDays} className="mr-2" style={{ color: 'oklch(0.60 0.15 200)' }} />
          Prossimi check-in col coach
        </p>
      </div>
      {appuntamenti.map((a, i) => (
        <div key={a.id} className="flex items-center gap-3 px-5 py-3"
          style={{ borderBottom: i < appuntamenti.length - 1 ? '1px solid oklch(1 0 0 / 4%)' : 'none' }}>
          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: 'oklch(0.60 0.15 200 / 15%)', color: 'oklch(0.60 0.15 200)' }}>
            <FontAwesomeIcon icon={TIPO_ICON[a.tipo] ?? faCalendarDays} className="text-xs" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold" style={{ color: 'oklch(0.97 0 0)' }}>
              {new Date(a.data_ora).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'oklch(0.50 0 0)' }}>
              {new Date(a.data_ora).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
              {' · '}{a.durata_minuti}min
              {a.link && <> · <a href={a.link} target="_blank" rel="noopener noreferrer"
                style={{ color: 'oklch(0.60 0.15 200)' }}>Partecipa</a></>}
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}
