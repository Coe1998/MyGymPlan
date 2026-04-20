'use client'

import { useEffect, useState, useMemo } from 'react'
import BynariLoader from '@/components/shared/BynariLoader'
import { createClient } from '@/lib/supabase/client'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faTriangleExclamation, faCircleCheck, faUsers,
  faLink, faCopy, faCheck, faClock, faXmark, faEye,
} from '@fortawesome/free-solid-svg-icons'
import AnamnesIDrawer from '@/components/coach/AnamnesIDrawer'

interface Cliente {
  cliente_id: string
  created_at: string
  profiles: { id: string; full_name: string | null; avatar_url: string | null }
}

interface Invito {
  id: string
  created_at: string
  stato: string
  profiles: { full_name: string | null }
}

export default function ClientiPage() {
  const [clienti, setClienti] = useState<Cliente[]>([])
  const [inviti, setInviti] = useState<Invito[]>([])
  const [coachCode, setCoachCode] = useState<string | null>(null)
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [inviting, setInviting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [processingId, setProcessingId] = useState<string | null>(null)

  // Anamnesi drawer
  const [anamnesIClienteId, setAnamnesIClienteId] = useState<string | null>(null)
  const [anamnesIClienteNome, setAnamnesIClienteNome] = useState('')

  const supabase = useMemo(() => createClient(), [])

  const fetchAll = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: profile } = await supabase
      .from('profiles').select('coach_code').eq('id', user.id).single()

    if (!profile?.coach_code) {
      const newCode = Math.random().toString(36).substring(2, 10).toUpperCase()
      await supabase.from('profiles').update({ coach_code: newCode }).eq('id', user.id)
      setCoachCode(newCode)
    } else {
      setCoachCode(profile.coach_code)
    }

    const { data: clientiData } = await supabase
      .from('coach_clienti')
      .select(`cliente_id, created_at, profiles!coach_clienti_cliente_id_fkey (id, full_name, avatar_url)`)
      .eq('coach_id', user.id)
      .order('created_at', { ascending: false })
    setClienti((clientiData as any) ?? [])

    const { data: invitiData } = await supabase
      .from('coach_inviti')
      .select(`id, created_at, stato, profiles!coach_inviti_cliente_id_fkey (full_name)`)
      .eq('coach_id', user.id)
      .eq('stato', 'pending')
      .order('created_at', { ascending: false })
    setInviti((invitiData as any) ?? [])

    setLoading(false)
  }

  useEffect(() => { fetchAll() }, [])

  const handleCopyLink = () => {
    const url = `${window.location.origin}/join/${coachCode}`
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleInvite = async () => {
    if (!email.trim()) return
    setInviting(true); setError(null); setSuccess(null)
    const response = await fetch('/api/coach/aggiungi-cliente', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim() }),
    })
    const data = await response.json()
    if (!response.ok) { setError(data.error ?? 'Errore sconosciuto'); setInviting(false); return }
    setSuccess(`${data.full_name} è stato aggiunto con successo!`)
    setEmail(''); fetchAll(); setInviting(false)
  }

  const handleAzione = async (invitoId: string, azione: 'approva' | 'rifiuta') => {
    setProcessingId(invitoId)
    await fetch('/api/coach/accetta-invito', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ invito_id: invitoId, azione }),
    })
    setProcessingId(null)
    fetchAll()
  }

  const handleRemove = async (clienteId: string, nome: string) => {
    if (!confirm(`Vuoi rimuovere ${nome} dalla tua lista clienti?`)) return
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('coach_clienti').delete()
      .eq('coach_id', user.id).eq('cliente_id', clienteId)
    fetchAll()
  }

  const inviteUrl = coachCode ? `${typeof window !== 'undefined' ? window.location.origin : 'https://bynari.app'}/join/${coachCode}` : ''

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h1 className="text-4xl font-black tracking-tight" style={{ color: 'var(--c-97)' }}>Clienti</h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--c-50)' }}>Gestisci i tuoi atleti e aggiungine di nuovi</p>
      </div>

      {/* ── Link invito ── */}
      <div className="rounded-2xl p-6 space-y-4"
        style={{ background: 'var(--c-18)', border: '1px solid oklch(0.70 0.19 46 / 25%)' }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'oklch(0.70 0.19 46 / 15%)', color: 'oklch(0.70 0.19 46)' }}>
            <FontAwesomeIcon icon={faLink} />
          </div>
          <div>
            <h2 className="font-bold" style={{ color: 'var(--c-97)' }}>Il tuo link di invito</h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--c-50)' }}>
              Condividilo con i tuoi clienti — si registrano e la richiesta arriva qui
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <div className="flex-1 px-4 py-3 rounded-xl text-sm font-mono truncate"
            style={{ background: 'var(--c-14)', border: '1px solid var(--c-w8)', color: 'var(--c-60)' }}>
            {inviteUrl || 'Generazione codice...'}
          </div>
          <button onClick={handleCopyLink} disabled={!coachCode}
            className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold flex-shrink-0 transition-all active:scale-95"
            style={{
              background: copied ? 'oklch(0.65 0.18 150 / 20%)' : 'oklch(0.70 0.19 46)',
              color: copied ? 'oklch(0.65 0.18 150)' : 'var(--c-13)',
            }}>
            <FontAwesomeIcon icon={copied ? faCheck : faCopy} />
            {copied ? 'Copiato!' : 'Copia'}
          </button>
        </div>
      </div>

      {/* ── Richieste in attesa ── */}
      {inviti.length > 0 && (
        <div className="rounded-2xl overflow-hidden"
          style={{ background: 'var(--c-18)', border: '1px solid oklch(0.75 0.18 80 / 30%)' }}>
          <div className="px-6 py-4 flex items-center gap-3"
            style={{ borderBottom: '1px solid var(--c-w6)', background: 'oklch(0.75 0.18 80 / 8%)' }}>
            <FontAwesomeIcon icon={faClock} style={{ color: 'oklch(0.75 0.18 80)' }} />
            <h2 className="font-bold" style={{ color: 'var(--c-97)' }}>Richieste in attesa</h2>
            <span className="text-xs font-bold px-2.5 py-1 rounded-full ml-auto"
              style={{ background: 'oklch(0.75 0.18 80 / 20%)', color: 'oklch(0.75 0.18 80)' }}>
              {inviti.length}
            </span>
          </div>
          {inviti.map((inv, i) => (
            <div key={inv.id} className="flex items-center gap-4 px-6 py-4"
              style={{ borderBottom: i < inviti.length - 1 ? '1px solid var(--c-w4)' : 'none' }}>
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                style={{ background: 'oklch(0.75 0.18 80 / 15%)', color: 'oklch(0.75 0.18 80)' }}>
                {(inv as any).profiles?.full_name?.charAt(0).toUpperCase() ?? '?'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm" style={{ color: 'var(--c-97)' }}>
                  {(inv as any).profiles?.full_name ?? 'Utente'}
                </p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--c-45)' }}>
                  Richiesta il {new Date(inv.created_at).toLocaleDateString('it-IT', { day: 'numeric', month: 'long' })}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button onClick={() => handleAzione(inv.id, 'approva')} disabled={processingId === inv.id}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all active:scale-95"
                  style={{ background: 'oklch(0.65 0.18 150 / 15%)', color: 'oklch(0.65 0.18 150)' }}>
                  <FontAwesomeIcon icon={faCircleCheck} />
                  {processingId === inv.id ? '...' : 'Approva'}
                </button>
                <button onClick={() => handleAzione(inv.id, 'rifiuta')} disabled={processingId === inv.id}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all active:scale-95"
                  style={{ background: 'oklch(0.65 0.22 27 / 15%)', color: 'oklch(0.75 0.15 27)' }}>
                  <FontAwesomeIcon icon={faXmark} />
                  Rifiuta
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Aggiungi via email ── */}
      <div className="rounded-2xl p-6 space-y-4"
        style={{ background: 'var(--c-18)', border: '1px solid var(--c-w6)' }}>
        <div>
          <h2 className="font-bold" style={{ color: 'var(--c-97)' }}>Aggiungi via email</h2>
          <p className="text-sm mt-0.5" style={{ color: 'var(--c-50)' }}>
            Se il cliente è già registrato su Bynari, inserisci la sua email per aggiungerlo direttamente.
          </p>
        </div>
        <div className="flex gap-3">
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleInvite()}
            placeholder="email@cliente.com"
            className="flex-1 px-4 py-3 rounded-xl text-sm outline-none transition-all"
            style={{ background: 'var(--c-22)', border: '1px solid var(--c-w8)', color: 'var(--c-97)' }}
            onFocus={(e) => e.target.style.borderColor = 'oklch(0.70 0.19 46)'}
            onBlur={(e) => e.target.style.borderColor = 'var(--c-w8)'} />
          <button onClick={handleInvite} disabled={inviting || !email.trim()}
            className="px-6 py-3 rounded-xl text-sm font-semibold transition-all active:scale-95 whitespace-nowrap"
            style={{
              background: inviting || !email.trim() ? 'oklch(0.40 0.10 46)' : 'oklch(0.70 0.19 46)',
              color: 'var(--c-13)',
              cursor: inviting || !email.trim() ? 'not-allowed' : 'pointer',
            }}>
            {inviting ? 'Aggiunta...' : '+ Aggiungi'}
          </button>
        </div>
        {error && (
          <div className="px-4 py-3 rounded-xl text-sm"
            style={{ background: 'oklch(0.65 0.22 27 / 15%)', color: 'oklch(0.75 0.15 27)', border: '1px solid oklch(0.65 0.22 27 / 30%)' }}>
            <FontAwesomeIcon icon={faTriangleExclamation} /> {error}
          </div>
        )}
        {success && (
          <div className="px-4 py-3 rounded-xl text-sm"
            style={{ background: 'oklch(0.65 0.18 150 / 15%)', color: 'oklch(0.65 0.18 150)', border: '1px solid oklch(0.65 0.18 150 / 30%)' }}>
            <FontAwesomeIcon icon={faCircleCheck} /> {success}
          </div>
        )}
      </div>

      {/* ── Lista clienti attivi ── */}
      <div className="rounded-2xl overflow-hidden"
        style={{ background: 'var(--c-18)', border: '1px solid var(--c-w6)' }}>
        <div className="px-6 py-4 flex items-center justify-between"
          style={{ borderBottom: '1px solid var(--c-w6)' }}>
          <h2 className="font-bold" style={{ color: 'var(--c-97)' }}>I tuoi clienti</h2>
          <span className="text-xs font-semibold px-3 py-1 rounded-full"
            style={{ background: 'oklch(0.70 0.19 46 / 15%)', color: 'oklch(0.70 0.19 46)' }}>
            {clienti.length} totali
          </span>
        </div>
        {loading ? (
          <BynariLoader file="blue" size={80} />
        ) : clienti.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <div className="text-5xl"><FontAwesomeIcon icon={faUsers} /></div>
            <p className="font-semibold" style={{ color: 'var(--c-97)' }}>Nessun cliente ancora</p>
            <p className="text-sm" style={{ color: 'var(--c-45)' }}>
              Condividi il tuo link di invito o aggiungi un cliente via email
            </p>
          </div>
        ) : (
          <div>
            {clienti.map((c, i) => (
              <div key={c.cliente_id}
                className="flex items-center gap-4 px-6 py-4 transition-colors group"
                style={{ borderBottom: i < clienti.length - 1 ? '1px solid var(--c-w4)' : 'none' }}>
                <div className="w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                  style={{ background: 'oklch(0.70 0.19 46 / 15%)', color: 'oklch(0.70 0.19 46)' }}>
                  {c.profiles?.full_name?.charAt(0).toUpperCase() ?? '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm" style={{ color: 'var(--c-97)' }}>
                    {c.profiles?.full_name ?? 'Nome non disponibile'}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--c-45)' }}>
                    Aggiunto il {new Date(c.created_at).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                </div>
                <div className="text-xs font-medium px-3 py-1 rounded-full"
                  style={{ background: 'oklch(0.65 0.18 150 / 15%)', color: 'oklch(0.65 0.18 150)' }}>
                  Attivo
                </div>
                {/* Anamnesi eye button */}
                <button
                  onClick={() => {
                    setAnamnesIClienteId(c.cliente_id)
                    setAnamnesIClienteNome(c.profiles?.full_name ?? 'Cliente')
                  }}
                  className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-all hover:opacity-80"
                  style={{ background: 'oklch(0.60 0.15 200 / 12%)', color: 'oklch(0.60 0.15 200)' }}
                  title="Vedi anamnesi">
                  <FontAwesomeIcon icon={faEye} className="text-sm" />
                </button>
                <button
                  onClick={() => handleRemove(c.cliente_id, c.profiles?.full_name ?? 'questo cliente')}
                  className="opacity-0 group-hover:opacity-100 ml-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                  style={{ background: 'oklch(0.65 0.22 27 / 15%)', color: 'oklch(0.75 0.15 27)', border: '1px solid oklch(0.65 0.22 27 / 20%)' }}>
                  Rimuovi
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Drawer anamnesi */}
      {anamnesIClienteId && (
        <AnamnesIDrawer
          clienteId={anamnesIClienteId}
          clienteNome={anamnesIClienteNome}
          onClose={() => setAnamnesIClienteId(null)}
        />
      )}
    </div>
  )
}
