'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import BynariLoader from '@/components/shared/BynariLoader'
import { createClient } from '@/lib/supabase/client'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPaperPlane, faArrowLeft, faPaperclip } from '@fortawesome/free-solid-svg-icons'
import ChatAllegatoCard from '@/components/shared/ChatAllegatoCard'

interface Cliente { id: string; full_name: string | null }
interface Messaggio {
  id: string
  testo: string | null
  da_coach: boolean
  letto: boolean
  created_at: string
  metadata?: {
    tipo: 'scheda' | 'sessione'
    id: string
    nome?: string
    giorni?: number
    data?: string
    giorno_nome?: string
    completata?: boolean
    durata_secondi?: number | null
  } | null
}

export default function CoachChatPage() {
  const supabase = createClient()
  const [clienti, setClienti] = useState<Cliente[]>([])
  const [clienteAttivo, setClienteAttivo] = useState<Cliente | null>(null)
  const [messaggi, setMessaggi] = useState<Messaggio[]>([])
  const [testo, setTesto] = useState('')
  const [coachId, setCoachId] = useState<string | null>(null)
  const [unread, setUnread] = useState<Record<string, number>>({})
  const [showAllegati, setShowAllegati] = useState(false)
  const [schedeCoach, setSchedeCoach] = useState<{ id: string; nome: string; giorni_count: number }[]>([])
  const [sessioniCliente, setSessioniCliente] = useState<any[]>([])
  const [loadingAllegati, setLoadingAllegati] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const scrollRefMobile = useRef<HTMLDivElement>(null)

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
      const { data: unreadData } = await supabase.from('messaggi')
        .select('cliente_id')
        .eq('coach_id', user.id)
        .eq('da_coach', false)
        .eq('letto', false)
      const counts: Record<string, number> = {}
      for (const m of unreadData ?? []) counts[m.cliente_id] = (counts[m.cliente_id] || 0) + 1
      setUnread(counts)
    }
    init()
  }, [])

  const fetchMessaggi = useCallback(async () => {
    if (!clienteAttivo || !coachId) return
    const { data } = await supabase.from('messaggi')
      .select('*')
      .eq('coach_id', coachId)
      .eq('cliente_id', clienteAttivo.id)
      .order('created_at')
    setMessaggi((data as any) ?? [])
    await supabase.from('messaggi')
      .update({ letto: true })
      .eq('coach_id', coachId)
      .eq('cliente_id', clienteAttivo.id)
      .eq('da_coach', false)
      .eq('letto', false)
    setUnread(prev => ({ ...prev, [clienteAttivo.id]: 0 }))
  }, [clienteAttivo, coachId])

  useEffect(() => { fetchMessaggi() }, [fetchMessaggi])

  useEffect(() => {
    if (messaggi.length === 0) return
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
    const elM = scrollRefMobile.current
    if (elM) elM.scrollTop = elM.scrollHeight
  }, [messaggi])

  useEffect(() => {
    if (!clienteAttivo || !coachId) return
    const channel = supabase.channel(`chat-coach-${clienteAttivo.id}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'messaggi',
        filter: `cliente_id=eq.${clienteAttivo.id}`,
      }, (payload) => {
        setMessaggi(prev => [...prev, payload.new as Messaggio])
        if (!(payload.new as Messaggio).da_coach) {
          supabase.from('messaggi').update({ letto: true }).eq('id', payload.new.id)
        }
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [clienteAttivo, coachId])

  const fetchAllegati = async () => {
    if (!clienteAttivo) return
    setLoadingAllegati(true)
    const [schedeRes, sessioniRes] = await Promise.all([
      supabase.from('assegnazioni')
        .select('schede(id, nome, scheda_giorni(id))')
        .eq('cliente_id', clienteAttivo.id)
        .eq('attiva', true),
      supabase.from('sessioni')
        .select('id, data, completata, durata_secondi, scheda_giorni(nome)')
        .eq('cliente_id', clienteAttivo.id)
        .order('data', { ascending: false })
        .limit(10),
    ])
    const schede = (schedeRes.data ?? [])
      .map((a: any) => a.schede).filter(Boolean)
      .map((s: any) => ({ id: s.id, nome: s.nome, giorni_count: s.scheda_giorni?.length ?? 0 }))
    setSchedeCoach(schede)
    setSessioniCliente((sessioniRes.data as any) ?? [])
    setLoadingAllegati(false)
  }

  const inviaAllegato = async (metadata: object) => {
    if (!clienteAttivo || !coachId) return
    setShowAllegati(false)
    await supabase.from('messaggi').insert({
      coach_id: coachId,
      cliente_id: clienteAttivo.id,
      testo: null,
      da_coach: true,
      metadata,
    })
  }

  const inviaMessaggio = async () => {
    if (!testo.trim() || !clienteAttivo || !coachId) return
    const t = testo.trim()
    setTesto('')
    await supabase.from('messaggi').insert({
      coach_id: coachId, cliente_id: clienteAttivo.id, testo: t, da_coach: true,
    })
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

  const formatDataSeparatore = (ts: string) => {
    const d = new Date(ts); d.setHours(0,0,0,0)
    const oggi = new Date(); oggi.setHours(0,0,0,0)
    const ieri = new Date(oggi); ieri.setDate(ieri.getDate() - 1)
    if (d.getTime() === oggi.getTime()) return 'Oggi'
    if (d.getTime() === ieri.getTime()) return 'Ieri'
    return d.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })
  }

  const URL_REGEX = /(https?:\/\/[^\s]+)/g
  const renderTesto = (t: string, daCoach: boolean) => {
    const parti = t.split(URL_REGEX)
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

  const renderMessaggi = (ref: React.RefObject<HTMLDivElement>) => (
    <div ref={ref} className="flex-1 overflow-y-auto p-4 space-y-2">
      {messaggi.length === 0 && (
        <p className="text-sm text-center py-8" style={{ color: 'oklch(0.40 0 0)' }}>Nessun messaggio ancora.</p>
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
            <div className={`flex ${m.da_coach ? 'justify-end' : 'justify-start'}`}>
              <div className="max-w-xs lg:max-w-md px-4 py-2.5 rounded-2xl"
                style={{
                  background: m.da_coach ? 'oklch(0.70 0.19 46)' : 'oklch(0.22 0 0)',
                  borderBottomRightRadius: m.da_coach ? 4 : 16,
                  borderBottomLeftRadius: m.da_coach ? 16 : 4,
                }}>
                {m.metadata ? (
                  <ChatAllegatoCard metadata={m.metadata} daCoach={m.da_coach} ruolo="coach" clienteId={clienteAttivo?.id} />
                ) : (
                  <p className="text-sm" style={{ color: m.da_coach ? 'oklch(0.11 0 0)' : 'oklch(0.90 0 0)' }}>
                    {renderTesto(m.testo ?? '', m.da_coach)}
                  </p>
                )}
                <p className="text-xs mt-1" style={{ color: m.da_coach ? 'oklch(0.30 0 0)' : 'oklch(0.45 0 0)' }}>
                  {formatOra(m.created_at)}
                </p>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )

  const pannelloAllegati = (
    <div className="px-4 pb-2 flex-shrink-0" style={{ borderBottom: '1px solid oklch(1 0 0 / 6%)' }}>
      {loadingAllegati ? (
        <BynariLoader file="blue" size={60} />
      ) : (
        <div className="space-y-3 py-2">
          {schedeCoach.length > 0 && (
            <div>
              <p className="text-xs font-bold uppercase tracking-wide mb-1.5" style={{ color: 'oklch(0.40 0 0)' }}>Schede assegnate</p>
              <div className="flex flex-wrap gap-2">
                {schedeCoach.map(s => (
                  <button key={s.id}
                    onClick={() => inviaAllegato({ tipo: 'scheda', id: s.id, nome: s.nome, giorni: s.giorni_count })}
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold transition-all hover:opacity-80"
                    style={{ background: 'oklch(0.70 0.19 46 / 15%)', color: 'oklch(0.70 0.19 46)', border: '1px solid oklch(0.70 0.19 46 / 25%)' }}>
                    📋 {s.nome}
                  </button>
                ))}
              </div>
            </div>
          )}
          {sessioniCliente.length > 0 && (
            <div>
              <p className="text-xs font-bold uppercase tracking-wide mb-1.5" style={{ color: 'oklch(0.40 0 0)' }}>Sessioni recenti</p>
              <div className="flex flex-wrap gap-2">
                {sessioniCliente.slice(0, 5).map((s: any) => (
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
          {schedeCoach.length === 0 && sessioniCliente.length === 0 && (
            <p className="text-xs py-2 text-center" style={{ color: 'oklch(0.45 0 0)' }}>Nessuna scheda o sessione disponibile</p>
          )}
        </div>
      )}
    </div>
  )

  const inputArea = (mobile = false) => (
    <div className="flex-shrink-0" style={{ borderTop: '1px solid oklch(1 0 0 / 6%)' }}>
      {showAllegati && pannelloAllegati}
      <div className="px-4 py-3 flex gap-3"
        style={mobile ? { paddingBottom: 'calc(env(safe-area-inset-bottom) + 0.75rem)' } : {}}>
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
        <input type="text" value={testo} onChange={e => setTesto(e.target.value)}
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
  )

  return (
    <div className="max-w-5xl">
      {/* Lista clienti mobile */}
      <div className={`${clienteAttivo ? 'hidden lg:flex' : 'flex'} lg:flex flex-col`}
        style={{ height: clienteAttivo ? undefined : 'calc(100vh - 8rem)' }}>
        <div className="lg:hidden mb-3">
          <h1 className="text-3xl font-black tracking-tight" style={{ color: 'oklch(0.97 0 0)' }}>Chat</h1>
        </div>
        <div className="lg:hidden rounded-2xl overflow-hidden flex flex-col flex-1"
          style={{ background: 'oklch(0.18 0 0)', border: '1px solid oklch(1 0 0 / 6%)' }}>
          <div className="flex-1 overflow-y-auto">
            {clienti.length === 0 ? (
              <p className="px-4 py-8 text-sm text-center" style={{ color: 'oklch(0.45 0 0)' }}>Nessun cliente</p>
            ) : clienti.map(c => (
              <button key={c.id} onClick={() => { setClienteAttivo(c); setShowAllegati(false) }}
                className="w-full flex items-center gap-3 px-4 py-4 transition-all hover:opacity-80"
                style={{ borderBottom: '1px solid oklch(1 0 0 / 4%)' }}>
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
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
                <span style={{ color: 'oklch(0.40 0 0)' }}>›</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* DESKTOP: layout a due colonne */}
      <div className="hidden lg:flex gap-4"
        style={{
          position: 'fixed',
          top: 'calc(env(safe-area-inset-top) + 1rem)',
          left: '16rem',
          right: '2rem',
          bottom: '1rem',
        }}>
        <div className="w-72 flex-shrink-0 rounded-2xl overflow-hidden flex flex-col"
          style={{ background: 'oklch(0.18 0 0)', border: '1px solid oklch(1 0 0 / 6%)' }}>
          <div className="px-4 py-4" style={{ borderBottom: '1px solid oklch(1 0 0 / 6%)' }}>
            <p className="font-black text-base" style={{ color: 'oklch(0.97 0 0)' }}>Chat</p>
          </div>
          <div className="flex-1 overflow-y-auto">
            {clienti.length === 0 ? (
              <p className="px-4 py-8 text-sm text-center" style={{ color: 'oklch(0.45 0 0)' }}>Nessun cliente</p>
            ) : clienti.map(c => (
              <button key={c.id} onClick={() => { setClienteAttivo(c); setShowAllegati(false) }}
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

        {clienteAttivo ? (
          <div className="flex-1 flex flex-col rounded-2xl overflow-hidden"
            style={{ background: 'oklch(0.18 0 0)', border: '1px solid oklch(1 0 0 / 6%)' }}>
            <div className="px-5 py-4 flex items-center gap-3 flex-shrink-0"
              style={{ borderBottom: '1px solid oklch(1 0 0 / 6%)' }}>
              <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                style={{ background: 'oklch(0.70 0.19 46 / 15%)', color: 'oklch(0.70 0.19 46)' }}>
                {clienteAttivo.full_name?.charAt(0).toUpperCase()}
              </div>
              <p className="font-bold text-sm" style={{ color: 'oklch(0.97 0 0)' }}>{clienteAttivo.full_name}</p>
            </div>
            {renderMessaggi(scrollRef)}
            {inputArea(false)}
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center rounded-2xl"
            style={{ background: 'oklch(0.18 0 0)', border: '1px solid oklch(1 0 0 / 6%)' }}>
            <div className="text-center space-y-2">
              <p className="text-3xl">💬</p>
              <p className="text-sm font-semibold" style={{ color: 'oklch(0.55 0 0)' }}>Seleziona un cliente per chattare</p>
            </div>
          </div>
        )}
      </div>

      {/* MOBILE: area chat */}
      {clienteAttivo && (
        <div className="lg:hidden flex flex-col rounded-2xl overflow-hidden"
          style={{ background: 'oklch(0.18 0 0)', border: '1px solid oklch(1 0 0 / 6%)', height: 'calc(100vh - 8rem)' }}>
          <div className="px-4 py-3 flex items-center gap-3 flex-shrink-0"
            style={{ borderBottom: '1px solid oklch(1 0 0 / 6%)' }}>
            <button onClick={() => { setClienteAttivo(null); setShowAllegati(false) }}
              className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'oklch(0.25 0 0)', color: 'oklch(0.60 0 0)' }}>
              <FontAwesomeIcon icon={faArrowLeft} className="text-xs" />
            </button>
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
              style={{ background: 'oklch(0.70 0.19 46 / 15%)', color: 'oklch(0.70 0.19 46)' }}>
              {clienteAttivo.full_name?.charAt(0).toUpperCase()}
            </div>
            <p className="font-bold text-sm" style={{ color: 'oklch(0.97 0 0)' }}>{clienteAttivo.full_name}</p>
          </div>
          {renderMessaggi(scrollRefMobile)}
          {inputArea(true)}
        </div>
      )}
    </div>
  )
}
