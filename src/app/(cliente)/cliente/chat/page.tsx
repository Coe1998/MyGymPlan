'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPaperPlane } from '@fortawesome/free-solid-svg-icons'

interface Messaggio {
  id: string; testo: string; da_coach: boolean; letto: boolean; created_at: string
}

export default function ClienteChatPage() {
  const supabase = createClient()
  const [messaggi, setMessaggi] = useState<Messaggio[]>([])
  const [testo, setTesto] = useState('')
  const [clienteId, setClienteId] = useState<string | null>(null)
  const [coachId, setCoachId] = useState<string | null>(null)
  const [coachNome, setCoachNome] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setClienteId(user.id)

      // Trova coach
      const { data: cc } = await supabase.from('coach_clienti')
        .select('coach_id, profiles!coach_clienti_coach_id_fkey(full_name)')
        .eq('cliente_id', user.id)
        .maybeSingle()
      if (!cc) { setLoading(false); return }
      setCoachId(cc.coach_id)
      setCoachNome((cc as any).profiles?.full_name ?? 'Coach')

      // Fetch messaggi
      const { data } = await supabase.from('messaggi')
        .select('*')
        .eq('coach_id', cc.coach_id)
        .eq('cliente_id', user.id)
        .order('created_at')
      setMessaggi((data as any) ?? [])

      // Marca letti
      await supabase.from('messaggi')
        .update({ letto: true })
        .eq('coach_id', cc.coach_id)
        .eq('cliente_id', user.id)
        .eq('da_coach', true)
        .eq('letto', false)

      setLoading(false)

      // Registra push subscription
      registerPush(user.id)
    }
    init()
  }, [])

  const registerPush = async (userId: string) => {
    try {
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) return
      const reg = await navigator.serviceWorker.ready
      const existing = await reg.pushManager.getSubscription()
      const sub = existing ?? await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
      })
      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sub.toJSON()),
      })
    } catch { }
  }

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messaggi])

  // Realtime
  useEffect(() => {
    if (!coachId || !clienteId) return
    const channel = supabase.channel(`chat-cliente-${clienteId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'messaggi',
        filter: `cliente_id=eq.${clienteId}`,
      }, (payload) => {
        setMessaggi(prev => [...prev, payload.new as Messaggio])
        if ((payload.new as Messaggio).da_coach) {
          supabase.from('messaggi').update({ letto: true }).eq('id', payload.new.id)
        }
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [coachId, clienteId])

  const inviaMessaggio = async () => {
    if (!testo.trim() || !coachId || !clienteId) return
    const t = testo.trim()
    setTesto('')
    await supabase.from('messaggi').insert({
      coach_id: coachId,
      cliente_id: clienteId,
      testo: t,
      da_coach: false,
    })
    // Push al coach
    fetch('/api/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: coachId,
        title: 'Nuovo messaggio',
        body: t.length > 60 ? t.slice(0, 60) + '...' : t,
        url: '/coach/chat',
      }),
    })
  }

  const formatOra = (ts: string) => new Date(ts).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <p className="text-sm" style={{ color: 'oklch(0.45 0 0)' }}>Caricamento...</p>
    </div>
  )

  if (!coachId) return (
    <div className="flex items-center justify-center h-64">
      <p className="text-sm" style={{ color: 'oklch(0.45 0 0)' }}>Non hai ancora un coach assegnato.</p>
    </div>
  )

  return (
    <div className="flex flex-col max-w-2xl" style={{ height: 'calc(100vh - 10rem)' }}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-4 flex-shrink-0">
        <h1 className="text-3xl font-black tracking-tight" style={{ color: 'oklch(0.97 0 0)' }}>Chat</h1>
      </div>

      <div className="flex-1 flex flex-col rounded-2xl overflow-hidden"
        style={{ background: 'oklch(0.18 0 0)', border: '1px solid oklch(1 0 0 / 6%)' }}>
        {/* Coach header */}
        <div className="px-5 py-3 flex items-center gap-3 flex-shrink-0"
          style={{ borderBottom: '1px solid oklch(1 0 0 / 6%)' }}>
          <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold"
            style={{ background: 'oklch(0.70 0.19 46 / 15%)', color: 'oklch(0.70 0.19 46)' }}>
            {coachNome?.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-bold" style={{ color: 'oklch(0.97 0 0)' }}>{coachNome}</p>
            <p className="text-xs" style={{ color: 'oklch(0.45 0 0)' }}>Il tuo coach</p>
          </div>
        </div>

        {/* Messaggi */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {messaggi.length === 0 && (
            <p className="text-sm text-center py-8" style={{ color: 'oklch(0.40 0 0)' }}>
              Nessun messaggio ancora. Scrivi al tuo coach!
            </p>
          )}
          {messaggi.map(m => (
            <div key={m.id} className={`flex ${m.da_coach ? 'justify-start' : 'justify-end'}`}>
              <div className="max-w-xs lg:max-w-md px-4 py-2.5 rounded-2xl"
                style={{
                  background: m.da_coach ? 'oklch(0.22 0 0)' : 'oklch(0.70 0.19 46)',
                  borderBottomLeftRadius: m.da_coach ? 4 : 16,
                  borderBottomRightRadius: m.da_coach ? 16 : 4,
                }}>
                <p className="text-sm" style={{ color: m.da_coach ? 'oklch(0.90 0 0)' : 'oklch(0.11 0 0)' }}>
                  {m.testo}
                </p>
                <p className="text-xs mt-1" style={{ color: m.da_coach ? 'oklch(0.45 0 0)' : 'oklch(0.30 0 0)' }}>
                  {formatOra(m.created_at)}
                </p>
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="px-4 py-3 flex gap-3 flex-shrink-0"
          style={{ borderTop: '1px solid oklch(1 0 0 / 6%)', paddingBottom: 'calc(env(safe-area-inset-bottom) + 0.75rem)' }}>
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
    </div>
  )
}
