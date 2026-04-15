'use client'

import { useEffect, useState, useRef } from 'react'
import BynariLoader from '@/components/shared/BynariLoader'
import { createClient } from '@/lib/supabase/client'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPaperPlane, faPaperclip } from '@fortawesome/free-solid-svg-icons'
import ChatAllegatoCard from '@/components/shared/ChatAllegatoCard'

interface Messaggio {
  id: string
  testo: string | null
  da_coach: boolean
  letto: boolean
  created_at: string
  metadata?: {
    tipo: 'scheda' | 'sessione' | 'nota_esercizio'
    id?: string
    nome?: string
    giorni?: number
    data?: string
    giorno_nome?: string
    completata?: boolean
    durata_secondi?: number | null
    nota_id?: string
    testo_nota?: string
    esercizio_nome?: string
    sessione_id?: string
    scheda_esercizio_id?: string
    assegnazione_id?: string
  } | null
}

export default function ClienteChatPage() {
  const supabase = createClient()
  const [messaggi, setMessaggi] = useState<Messaggio[]>([])
  const [testo, setTesto] = useState('')
  const [clienteId, setClienteId] = useState<string | null>(null)
  const [coachId, setCoachId] = useState<string | null>(null)
  const [coachNome, setCoachNome] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [showAllegati, setShowAllegati] = useState(false)
  const [sessioniRecenti, setSessioniRecenti] = useState<any[]>([])
  const [noteRecenti, setNoteRecenti] = useState<any[]>([])
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setClienteId(user.id)

      const { data: cc } = await supabase.from('coach_clienti')
        .select('coach_id, profiles!coach_clienti_coach_id_fkey(full_name)')
        .eq('cliente_id', user.id)
        .maybeSingle()
      if (!cc) { setLoading(false); return }
      setCoachId(cc.coach_id)
      setCoachNome((cc as any).profiles?.full_name ?? 'Coach')

      const { data } = await supabase.from('messaggi')
        .select('*')
        .eq('coach_id', cc.coach_id)
        .eq('cliente_id', user.id)
        .order('created_at')
      setMessaggi((data as any) ?? [])

      await supabase.from('messaggi')
        .update({ letto: true })
        .eq('coach_id', cc.coach_id)
        .eq('cliente_id', user.id)
        .eq('da_coach', true)
        .eq('letto', false)

      setLoading(false)
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
    if (messaggi.length === 0) return
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messaggi])

  useEffect(() => {
    if (!coachId || !clienteId) return
    const channel = supabase.channel(`chat-cliente-${clienteId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'messaggi',
        filter: `cliente_id=eq.${clienteId}`,
      }, (payload) => {
        const nuovo = payload.new as Messaggio
        if (!nuovo.da_coach) return
        setMessaggi(prev => [...prev, nuovo])
        supabase.from('messaggi').update({ letto: true }).eq('id', nuovo.id)
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [coachId, clienteId])

  const fetchAllegati = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const [sessRes, noteRes] = await Promise.all([
      supabase
        .from('sessioni')
        .select('id, data, completata, durata_secondi, scheda_giorni(nome)')
        .eq('cliente_id', user.id)
        .order('data', { ascending: false })
        .limit(8),
      supabase
        .from('note_esercizio')
        .select(`id, testo, created_at, sessione_id,
          scheda_esercizi!note_esercizio_scheda_esercizio_id_fkey ( id, esercizi!scheda_esercizi_esercizio_id_fkey ( nome ) )`)
        .eq('cliente_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10),
    ])
    setSessioniRecenti((sessRes.data as any) ?? [])
    setNoteRecenti((noteRes.data as any) ?? [])
  }

  const inviaAllegato = async (metadata: object) => {
    if (!coachId || !clienteId) return
    setShowAllegati(false)
    const tempId = crypto.randomUUID()
    setMessaggi(prev => [...prev, {
      id: tempId, testo: null, da_coach: false, letto: false,
      created_at: new Date().toISOString(), metadata: metadata as any,
    }])
    await supabase.from('messaggi').insert({
      coach_id: coachId,
      cliente_id: clienteId,
      testo: null,
      da_coach: false,
      metadata,
    })
  }

  const inviaMessaggio = async () => {
    if (!testo.trim() || !coachId || !clienteId) return
    const t = testo.trim()
    setTesto('')
    const tempId = crypto.randomUUID()
    setMessaggi(prev => [...prev, {
      id: tempId, testo: t, da_coach: false, letto: false,
      created_at: new Date().toISOString(),
    }])
    const { error } = await supabase.from('messaggi').insert({
      coach_id: coachId, cliente_id: clienteId, testo: t, da_coach: false,
    })
    if (error) { setMessaggi(prev => prev.filter(m => m.id !== tempId)); return }
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

  const formatDataSeparatore = (ts: string) => {
    const d = new Date(ts); d.setHours(0,0,0,0)
    const oggi = new Date(); oggi.setHours(0,0,0,0)
    const ieri = new Date(oggi); ieri.setDate(ieri.getDate() - 1)
    if (d.getTime() === oggi.getTime()) return 'Oggi'
    if (d.getTime() === ieri.getTime()) return 'Ieri'
    return d.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })
  }

  const renderTesto = (t: string, daCoach: boolean) => {
    const parti = t.split(/(https?:\/\/[^\s]+)/g)
    return parti.map((parte, i) => {
      if (!/(https?:\/\/[^\s]+)/.test(parte)) return <span key={i}>{parte}</span>
      const isImg = /\.(png|jpg|jpeg|webp|gif)(\?.*)?$/i.test(parte)
      if (isImg) return (
        <a key={i} href={parte} target="_blank" rel="noopener noreferrer" style={{ display: 'block', marginTop: 4 }}>
          <img src={parte} alt="Report" className="rounded-xl max-w-full"
            style={{ display: 'block', maxWidth: 280, cursor: 'pointer', opacity: 0.95 }} />
        </a>
      )
      return (
        <a key={i} href={parte} target="_blank" rel="noopener noreferrer"
          className="underline break-all"
          style={{ color: daCoach ? 'oklch(0.55 0.15 200)' : 'oklch(0.20 0 0)' }}>
          {parte}
        </a>
      )
    })
  }

  if (loading) return <BynariLoader file="blue" size={80} />

  if (!coachId) return (
    <div className="flex items-center justify-center h-64">
      <p className="text-sm" style={{ color: 'oklch(0.45 0 0)' }}>Non hai ancora un coach assegnato.</p>
    </div>
  )

  return (
    <div className="flex flex-col max-w-2xl" style={{ height: 'calc(100vh - 10rem)' }}>
      <div className="flex items-center gap-3 mb-4 flex-shrink-0">
        <h1 className="text-3xl font-black tracking-tight" style={{ color: 'oklch(0.97 0 0)' }}>Chat</h1>
      </div>

      <div className="flex-1 flex flex-col rounded-2xl overflow-hidden"
        style={{ background: 'oklch(0.18 0 0)', border: '1px solid oklch(1 0 0 / 6%)' }}>
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

        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-2">
          {messaggi.length === 0 && (
            <p className="text-sm text-center py-8" style={{ color: 'oklch(0.40 0 0)' }}>
              Nessun messaggio ancora. Scrivi al tuo coach!
            </p>
          )}
          {messaggi.map((m, i) => {
            const prevM = messaggi[i - 1]
            const showDate = !prevM || new Date(m.created_at).toDateString() !== new Date(prevM.created_at).toDateString()
            return (
              <div key={m.id}>
                {showDate && (
                  <div className="flex items-center gap-3 my-3">
                    <div className="flex-1 h-px" style={{ background: 'oklch(1 0 0 / 6%)' }} />
                    <span className="text-xs font-semibold px-2" style={{ color: 'oklch(0.45 0 0)' }}>
                      {formatDataSeparatore(m.created_at)}
                    </span>
                    <div className="flex-1 h-px" style={{ background: 'oklch(1 0 0 / 6%)' }} />
                  </div>
                )}
                <div className={`flex ${m.da_coach ? 'justify-start' : 'justify-end'}`}>
                  <div className="max-w-xs lg:max-w-md px-4 py-2.5 rounded-2xl"
                    style={{
                      background: m.da_coach ? 'oklch(0.22 0 0)' : 'oklch(0.70 0.19 46)',
                      borderBottomLeftRadius: m.da_coach ? 4 : 16,
                      borderBottomRightRadius: m.da_coach ? 16 : 4,
                    }}>
                    {m.metadata ? (
                      <ChatAllegatoCard metadata={m.metadata} daCoach={m.da_coach} ruolo="cliente" />
                    ) : (
                      <p className="text-sm break-words" style={{ color: m.da_coach ? 'oklch(0.90 0 0)' : 'oklch(0.11 0 0)' }}>
                        {renderTesto(m.testo ?? '', m.da_coach)}
                      </p>
                    )}
                    <p className="text-xs mt-1" style={{ color: m.da_coach ? 'oklch(0.45 0 0)' : 'oklch(0.30 0 0)' }}>
                      {formatOra(m.created_at)}
                    </p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {showAllegati && (
          <div className="px-4 pb-3 flex-shrink-0 space-y-3 max-h-56 overflow-y-auto"
            style={{ borderBottom: '1px solid oklch(1 0 0 / 6%)' }}>
            {sessioniRecenti.length === 0 && noteRecenti.length === 0 ? (
              <p className="text-xs py-3 text-center" style={{ color: 'oklch(0.45 0 0)' }}>Nessun allegato disponibile</p>
            ) : (
              <>
                {sessioniRecenti.length > 0 && (
                  <div className="pt-2">
                    <p className="text-xs font-bold uppercase tracking-wide mb-1.5" style={{ color: 'oklch(0.40 0 0)' }}>Sessioni recenti</p>
                    <div className="flex flex-wrap gap-2">
                      {sessioniRecenti.map((s: any) => (
                        <button key={s.id}
                          onClick={() => inviaAllegato({
                            tipo: 'sessione', id: s.id,
                            giorno_nome: s.scheda_giorni?.nome ?? 'Allenamento',
                            data: s.data, completata: s.completata, durata_secondi: s.durata_secondi,
                          })}
                          className="px-3 py-1.5 rounded-xl text-xs font-semibold transition-all hover:opacity-80"
                          style={{ background: 'oklch(0.60 0.15 200 / 15%)', color: 'oklch(0.60 0.15 200)', border: '1px solid oklch(0.60 0.15 200 / 25%)' }}>
                          🏋️ {new Date(s.data).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })} — {s.scheda_giorni?.nome ?? 'Allenamento'}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {noteRecenti.length > 0 && (
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide mb-1.5" style={{ color: 'oklch(0.40 0 0)' }}>Note esercizi</p>
                    <div className="flex flex-col gap-1.5">
                      {noteRecenti.map((n: any) => {
                        const nomeEse = (n.scheda_esercizi as any)?.esercizi?.nome ?? 'Esercizio'
                        const schedaEseId = (n.scheda_esercizi as any)?.id ?? n.scheda_esercizio_id
                        return (
                          <button key={n.id}
                            onClick={() => inviaAllegato({
                              tipo: 'nota_esercizio',
                              nota_id: n.id,
                              testo_nota: n.testo,
                              esercizio_nome: nomeEse,
                              sessione_id: n.sessione_id,
                              scheda_esercizio_id: schedaEseId,
                            })}
                            className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-left transition-all hover:opacity-80"
                            style={{ background: 'oklch(0.70 0.19 46 / 10%)', border: '1px solid oklch(0.70 0.19 46 / 25%)' }}>
                            <span style={{ fontSize: 13, flexShrink: 0 }}>📝</span>
                            <div className="min-w-0">
                              <p className="text-xs font-bold truncate" style={{ color: 'oklch(0.82 0 0)' }}>{nomeEse}</p>
                              <p className="text-xs truncate" style={{ color: 'oklch(0.55 0 0)' }}>
                                {n.testo.length > 45 ? n.testo.slice(0, 45) + '…' : n.testo}
                              </p>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        <div className="px-4 py-3 flex gap-3 flex-shrink-0"
          style={{ borderTop: '1px solid oklch(1 0 0 / 6%)', paddingBottom: 'calc(env(safe-area-inset-bottom) + 0.75rem)' }}>
          <button
            onClick={() => { setShowAllegati(p => !p); if (!showAllegati) fetchAllegati() }}
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all"
            style={{
              background: showAllegati ? 'oklch(0.60 0.15 200 / 20%)' : 'oklch(0.22 0 0)',
              color: showAllegati ? 'oklch(0.60 0.15 200)' : 'oklch(0.45 0 0)',
              border: '1px solid oklch(1 0 0 / 8%)',
            }}>
            <FontAwesomeIcon icon={faPaperclip} className="text-sm" />
          </button>
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
