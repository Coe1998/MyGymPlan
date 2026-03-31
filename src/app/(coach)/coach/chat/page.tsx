'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPaperPlane, faArrowLeft } from '@fortawesome/free-solid-svg-icons'

interface Cliente { id: string; full_name: string | null }
interface Messaggio {
  id: string; testo: string; da_coach: boolean; letto: boolean; created_at: string
}

export default function CoachChatPage() {
  const supabase = createClient()
  const [clienti, setClienti] = useState<Cliente[]>([])
  const [clienteAttivo, setClienteAttivo] = useState<Cliente | null>(null)
  const [messaggi, setMessaggi] = useState<Messaggio[]>([])
  const [testo, setTesto] = useState('')
  const [coachId, setCoachId] = useState<string | null>(null)
  const [unread, setUnread] = useState<Record<string, number>>({})
  const bottomRef = useRef<HTMLDivElement>(null)

  // Fetch clienti e coach id
  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setCoachId(user.id)
      const { data } = await supabase.from('coach_clienti')
        .select('profiles!coach_clienti_cliente_id_fkey(id, full_name)')
        .eq('coach_id', user.id)
      const list = (data ?? []).map((r: any) => r.profiles).filter(Boolean)
      setClienti(list)
      // Conta unread per cliente
      const { data: unreadData } = await supabase.from('messaggi')
        .select('cliente_id')
        .eq('coach_id', user.id)
        .eq('da_coach', false)
        .eq('letto', false)
      const counts: Record<string, number> = {}
      for (const m of unreadData ?? []) {
        counts[m.cliente_id] = (counts[m.cliente_id] || 0) + 1
      }
      setUnread(counts)
    }
    init()
  }, [])

  // Fetch messaggi quando cambia cliente
  const fetchMessaggi = useCallback(async () => {
    if (!clienteAttivo || !coachId) return
    const { data } = await supabase.from('messaggi')
      .select('*')
      .eq('coach_id', coachId)
      .eq('cliente_id', clienteAttivo.id)
      .order('created_at')
    setMessaggi((data as any) ?? [])
    // Marca come letti
    await supabase.from('messaggi')
      .update({ letto: true })
      .eq('coach_id', coachId)
      .eq('cliente_id', clienteAttivo.id)
      .eq('da_coach', false)
      .eq('letto', false)
    setUnread(prev => ({ ...prev, [clienteAttivo.id]: 0 }))
  }, [clienteAttivo, coachId])

  useEffect(() => { fetchMessaggi() }, [fetchMessaggi])

  // Scroll bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messaggi])

  // Realtime
  useEffect(() => {
    if (!clienteAttivo || !coachId) return
    const channel = supabase.channel(`chat-coach-${clienteAttivo.id}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'messaggi',
        filter: `cliente_id=eq.${clienteAttivo.id}`,
      }, (payload) => {
        setMessaggi(prev => [...prev, payload.new as Messaggio])
        // Marca letto subito se è del cliente
        if (!(payload.new as Messaggio).da_coach) {
          supabase.from('messaggi').update({ letto: true }).eq('id', payload.new.id)
        }
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [clienteAttivo, coachId])

  const inviaMessaggio = async () => {
    if (!testo.trim() || !clienteAttivo || !coachId) return
    const t = testo.trim()
    setTesto('')

    // Aggiornamento ottimistico immediato
    const tempId = crypto.randomUUID()
    const tempMsg: Messaggio = {
      id: tempId,
      testo: t,
      da_coach: true,
      letto: false,
      created_at: new Date().toISOString(),
    }
    setMessaggi(prev => [...prev, tempMsg])

    const { error } = await supabase.from('messaggi').insert({
      coach_id: coachId,
      cliente_id: clienteAttivo.id,
      testo: t,
      da_coach: true,
    })

    if (error) {
      console.error('Errore invio messaggio:', error.message)
      setMessaggi(prev => prev.filter(m => m.id !== tempId))
      return
    }

    fetch('/api/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: clienteAttivo.id,
        title: 'Nuovo messaggio dal coach',
        body: t.length > 60 ? t.slice(0, 60) + '...' : t,
        url: '/cliente/chat',
      }),
    })
  }

  const formatOra = (ts: string) => new Date(ts).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })

  return (
    <div className="flex h-[calc(100vh-6rem)] max-w-5xl gap-4">
      {/* Lista clienti */}
      <div className="w-72 flex-shrink-0 rounded-2xl overflow-hidden flex flex-col"
        style={{ background: 'oklch(0.18 0 0)', border: '1px solid oklch(1 0 0 / 6%)' }}>
        <div className="px-4 py-4" style={{ borderBottom: '1px solid oklch(1 0 0 / 6%)' }}>
          <p className="font-black text-base" style={{ color: 'oklch(0.97 0 0)' }}>Chat</p>
        </div>
        <div className="flex-1 overflow-y-auto">
          {clienti.length === 0 ? (
            <p className="px-4 py-8 text-sm text-center" style={{ color: 'oklch(0.45 0 0)' }}>Nessun cliente</p>
          ) : clienti.map(c => (
            <button key={c.id} onClick={() => setClienteAttivo(c)}
              className="w-full flex items-center gap-3 px-4 py-3 transition-all hover:opacity-80"
              style={{
                background: clienteAttivo?.id === c.id ? 'oklch(0.70 0.19 46 / 12%)' : 'transparent',
                borderLeft: clienteAttivo?.id === c.id ? '3px solid oklch(0.70 0.19 46)' : '3px solid transparent',
                borderBottom: '1px solid oklch(1 0 0 / 4%)',
              }}>
              <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                style={{ background: 'oklch(0.70 0.19 46 / 15%)', color: 'oklch(0.70 0.19 46)' }}>
                {c.full_name?.charAt(0).toUpperCase()}
              </div>
              <p className="text-sm font-medium flex-1 text-left truncate" style={{ color: 'oklch(0.90 0 0)' }}>
                {c.full_name}
              </p>
              {(unread[c.id] ?? 0) > 0 && (
                <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0"
                  style={{ background: 'oklch(0.70 0.19 46)', color: 'oklch(0.11 0 0)' }}>
                  {unread[c.id]}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Area chat */}
      {clienteAttivo ? (
        <div className="flex-1 flex flex-col rounded-2xl overflow-hidden"
          style={{ background: 'oklch(0.18 0 0)', border: '1px solid oklch(1 0 0 / 6%)' }}>
          {/* Header */}
          <div className="px-5 py-4 flex items-center gap-3 flex-shrink-0"
            style={{ borderBottom: '1px solid oklch(1 0 0 / 6%)' }}>
            <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
              style={{ background: 'oklch(0.70 0.19 46 / 15%)', color: 'oklch(0.70 0.19 46)' }}>
              {clienteAttivo.full_name?.charAt(0).toUpperCase()}
            </div>
            <p className="font-bold text-sm" style={{ color: 'oklch(0.97 0 0)' }}>{clienteAttivo.full_name}</p>
          </div>

          {/* Messaggi */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {messaggi.length === 0 && (
              <p className="text-sm text-center py-8" style={{ color: 'oklch(0.40 0 0)' }}>
                Nessun messaggio ancora. Inizia la conversazione!
              </p>
            )}
            {messaggi.map(m => (
              <div key={m.id} className={`flex ${m.da_coach ? 'justify-end' : 'justify-start'}`}>
                <div className="max-w-xs lg:max-w-md px-4 py-2.5 rounded-2xl"
                  style={{
                    background: m.da_coach ? 'oklch(0.70 0.19 46)' : 'oklch(0.22 0 0)',
                    borderBottomRightRadius: m.da_coach ? 4 : 16,
                    borderBottomLeftRadius: m.da_coach ? 16 : 4,
                  }}>
                  <p className="text-sm" style={{ color: m.da_coach ? 'oklch(0.11 0 0)' : 'oklch(0.90 0 0)' }}>
                    {m.testo}
                  </p>
                  <p className="text-xs mt-1" style={{ color: m.da_coach ? 'oklch(0.30 0 0)' : 'oklch(0.45 0 0)' }}>
                    {formatOra(m.created_at)}
                  </p>
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="px-4 py-3 flex gap-3 flex-shrink-0"
            style={{ borderTop: '1px solid oklch(1 0 0 / 6%)' }}>
            <input
              type="text" value={testo} onChange={e => setTesto(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && inviaMessaggio()}
              placeholder="Scrivi un messaggio..."
              className="flex-1 px-4 py-2.5 rounded-xl text-sm outline-none"
              style={{ background: 'oklch(0.22 0 0)', border: '1px solid oklch(1 0 0 / 8%)', color: 'oklch(0.97 0 0)' }} />
            <button onClick={inviaMessaggio} disabled={!testo.trim()}
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'oklch(0.70 0.19 46)', color: 'oklch(0.11 0 0)', opacity: testo.trim() ? 1 : 0.4 }}>
              <FontAwesomeIcon icon={faPaperPlane} className="text-sm" />
            </button>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center rounded-2xl"
          style={{ background: 'oklch(0.18 0 0)', border: '1px solid oklch(1 0 0 / 6%)' }}>
          <div className="text-center space-y-2">
            <p className="text-3xl">💬</p>
            <p className="text-sm font-semibold" style={{ color: 'oklch(0.55 0 0)' }}>
              Seleziona un cliente per chattare
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
