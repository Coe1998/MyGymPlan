'use client'

import { useEffect, useState, useMemo } from 'react'
import BynariLoader from '@/components/shared/BynariLoader'
import { createClient } from '@/lib/supabase/client'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faTriangleExclamation, faCircleCheck, faUsers,
  faLink, faCopy, faCheck, faClock, faXmark, faEye,
  faMagnifyingGlass, faPlus,
} from '@fortawesome/free-solid-svg-icons'
import AnamnesIDrawer from '@/components/coach/AnamnesIDrawer'
import SortDropdown from '@/components/ui/SortDropdown'

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

type SortKey = 'nome' | 'recente'

const SORT_OPTIONS: { id: SortKey; label: string }[] = [
  { id: 'recente', label: 'Più recente' },
  { id: 'nome', label: 'A→Z Nome' },
]

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
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<SortKey>('recente')
  const [addOpen, setAddOpen] = useState(false)

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
    setEmail(''); fetchAll(); setInviting(false); setAddOpen(false)
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

  const filteredClienti = useMemo(() => {
    let list = [...clienti]
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(c => (c.profiles?.full_name ?? '').toLowerCase().includes(q))
    }
    if (sort === 'nome') {
      list.sort((a, b) => (a.profiles?.full_name ?? '').localeCompare(b.profiles?.full_name ?? ''))
    }
    // 'recente' is already sorted by created_at desc from supabase
    return list
  }, [clienti, search, sort])

  return (
    <div style={{ paddingBottom: 100 }}>

      {/* ── Header mobile ── */}
      <div className="lg:hidden" style={{ padding: '16px 20px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <p style={{ fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--c-50)', fontWeight: 700 }}>
              GESTIONE
            </p>
            <h1 style={{ fontFamily: 'var(--font-syne)', fontWeight: 700, fontSize: 26, letterSpacing: '-0.02em', color: 'var(--c-97)', lineHeight: 1.1 }}>
              Clienti
            </h1>
          </div>
          <button
            onClick={() => setAddOpen(o => !o)}
            aria-label="Aggiungi cliente"
            style={{
              width: 40, height: 40, borderRadius: 12,
              background: 'oklch(0.70 0.19 46)',
              color: 'var(--c-13)', fontSize: 16,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
            <FontAwesomeIcon icon={faPlus} />
          </button>
        </div>

        {/* Panel aggiungi — espandibile su mobile */}
        {addOpen && (
          <div style={{
            borderRadius: 16, padding: 16, marginBottom: 16,
            background: 'var(--c-18)', border: '1px solid oklch(0.70 0.19 46 / 25%)',
          }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--c-97)', marginBottom: 10 }}>Aggiungi via email</p>
            <div style={{ display: 'flex', gap: 8, marginBottom: error || success ? 10 : 0 }}>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleInvite()}
                placeholder="email@cliente.com"
                style={{
                  flex: 1, padding: '10px 14px', borderRadius: 10,
                  background: 'var(--c-22)', border: '1px solid var(--c-w8)',
                  color: 'var(--c-97)', fontSize: 14, outline: 'none',
                }}
              />
              <button
                onClick={handleInvite}
                disabled={inviting || !email.trim()}
                style={{
                  padding: '10px 16px', borderRadius: 10, fontSize: 13, fontWeight: 600,
                  background: inviting || !email.trim() ? 'oklch(0.40 0.10 46)' : 'oklch(0.70 0.19 46)',
                  color: 'var(--c-13)', whiteSpace: 'nowrap',
                  cursor: inviting || !email.trim() ? 'not-allowed' : 'pointer',
                }}>
                {inviting ? '...' : '+ Aggiungi'}
              </button>
            </div>
            {error && (
              <div style={{ padding: '9px 12px', borderRadius: 10, fontSize: 12.5, background: 'oklch(0.65 0.22 27 / 15%)', color: 'oklch(0.75 0.15 27)', border: '1px solid oklch(0.65 0.22 27 / 30%)' }}>
                <FontAwesomeIcon icon={faTriangleExclamation} style={{ marginRight: 6 }} />{error}
              </div>
            )}
            {success && (
              <div style={{ padding: '9px 12px', borderRadius: 10, fontSize: 12.5, background: 'oklch(0.65 0.18 150 / 15%)', color: 'oklch(0.65 0.18 150)', border: '1px solid oklch(0.65 0.18 150 / 30%)' }}>
                <FontAwesomeIcon icon={faCircleCheck} style={{ marginRight: 6 }} />{success}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Header desktop ── */}
      <div className="hidden lg:flex" style={{ alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <p style={{ fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--c-50)', fontWeight: 700, marginBottom: 4 }}>
            GESTIONE CLIENTI
          </p>
          <h1 style={{ fontFamily: 'var(--font-syne)', fontWeight: 700, fontSize: 32, letterSpacing: '-0.02em', color: 'var(--c-97)' }}>
            Clienti
          </h1>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => setAddOpen(o => !o)}
            style={{
              height: 44, padding: '0 18px', borderRadius: 12, fontSize: 13.5, fontWeight: 600,
              background: addOpen ? 'oklch(0.70 0.19 46 / 15%)' : 'oklch(0.70 0.19 46)',
              color: addOpen ? 'oklch(0.70 0.19 46)' : 'var(--c-13)',
              border: addOpen ? '1px solid oklch(0.70 0.19 46 / 40%)' : 'none',
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
            <FontAwesomeIcon icon={faPlus} />
            Aggiungi cliente
          </button>
        </div>
      </div>

      <div style={{ padding: '0 20px' }} className="lg:p-0 space-y-4 lg:space-y-6">

        {/* ── Link invito ── */}
        <div style={{
          borderRadius: 16, padding: '14px 16px',
          background: 'var(--c-18)', border: '1px solid oklch(0.70 0.19 46 / 25%)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10, flexShrink: 0,
              background: 'oklch(0.70 0.19 46 / 15%)', color: 'oklch(0.70 0.19 46)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <FontAwesomeIcon icon={faLink} style={{ fontSize: 14 }} />
            </div>
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--c-97)' }}>Link di invito</p>
              <p style={{ fontSize: 11.5, color: 'var(--c-50)', marginTop: 1 }}>
                Condividilo — il cliente si registra e la richiesta arriva qui
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{
              flex: 1, padding: '9px 12px', borderRadius: 10, fontSize: 12,
              fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              background: 'var(--c-14)', border: '1px solid var(--c-w8)', color: 'var(--c-60)',
            }}>
              {inviteUrl || 'Generazione...'}
            </div>
            <button
              onClick={handleCopyLink}
              disabled={!coachCode}
              aria-label="Copia link"
              style={{
                padding: '9px 14px', borderRadius: 10, fontSize: 12.5, fontWeight: 600, flexShrink: 0,
                background: copied ? 'oklch(0.65 0.18 150 / 20%)' : 'oklch(0.70 0.19 46)',
                color: copied ? 'oklch(0.65 0.18 150)' : 'var(--c-13)',
                display: 'flex', alignItems: 'center', gap: 7,
              }}>
              <FontAwesomeIcon icon={copied ? faCheck : faCopy} />
              {copied ? 'Copiato!' : 'Copia'}
            </button>
          </div>
        </div>

        {/* ── Panel aggiungi desktop ── */}
        {addOpen && (
          <div className="hidden lg:block" style={{
            borderRadius: 16, padding: '16px 20px',
            background: 'var(--c-18)', border: '1px solid var(--c-w8)',
          }}>
            <p style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--c-97)', marginBottom: 12 }}>Aggiungi via email</p>
            <p style={{ fontSize: 12.5, color: 'var(--c-50)', marginBottom: 12 }}>
              Se il cliente è già registrato su Bynari, inserisci la sua email per aggiungerlo direttamente.
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleInvite()}
                placeholder="email@cliente.com"
                style={{
                  flex: 1, padding: '11px 14px', borderRadius: 10,
                  background: 'var(--c-22)', border: '1px solid var(--c-w8)',
                  color: 'var(--c-97)', fontSize: 14, outline: 'none',
                }}
                onFocus={e => (e.target.style.borderColor = 'oklch(0.70 0.19 46)')}
                onBlur={e => (e.target.style.borderColor = 'var(--c-w8)')}
              />
              <button
                onClick={handleInvite}
                disabled={inviting || !email.trim()}
                style={{
                  padding: '11px 20px', borderRadius: 10, fontSize: 13.5, fontWeight: 600,
                  background: inviting || !email.trim() ? 'oklch(0.40 0.10 46)' : 'oklch(0.70 0.19 46)',
                  color: 'var(--c-13)', whiteSpace: 'nowrap',
                  cursor: inviting || !email.trim() ? 'not-allowed' : 'pointer',
                }}>
                {inviting ? 'Aggiunta...' : '+ Aggiungi'}
              </button>
            </div>
            {error && (
              <div style={{ marginTop: 10, padding: '10px 14px', borderRadius: 10, fontSize: 13, background: 'oklch(0.65 0.22 27 / 15%)', color: 'oklch(0.75 0.15 27)', border: '1px solid oklch(0.65 0.22 27 / 30%)' }}>
                <FontAwesomeIcon icon={faTriangleExclamation} style={{ marginRight: 8 }} />{error}
              </div>
            )}
            {success && (
              <div style={{ marginTop: 10, padding: '10px 14px', borderRadius: 10, fontSize: 13, background: 'oklch(0.65 0.18 150 / 15%)', color: 'oklch(0.65 0.18 150)', border: '1px solid oklch(0.65 0.18 150 / 30%)' }}>
                <FontAwesomeIcon icon={faCircleCheck} style={{ marginRight: 8 }} />{success}
              </div>
            )}
          </div>
        )}

        {/* ── Richieste in attesa ── */}
        {inviti.length > 0 && (
          <div style={{
            borderRadius: 16, overflow: 'hidden',
            background: 'var(--c-18)', border: '1px solid oklch(0.75 0.18 80 / 30%)',
          }}>
            <div style={{
              padding: '13px 16px', display: 'flex', alignItems: 'center', gap: 10,
              borderBottom: '1px solid var(--c-w6)', background: 'oklch(0.75 0.18 80 / 8%)',
            }}>
              <FontAwesomeIcon icon={faClock} style={{ color: 'oklch(0.75 0.18 80)', fontSize: 13 }} />
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--c-97)', flex: 1 }}>Richieste in attesa</span>
              <span style={{
                fontSize: 11, fontWeight: 700, padding: '2px 9px', borderRadius: 20,
                background: 'oklch(0.75 0.18 80 / 20%)', color: 'oklch(0.75 0.18 80)',
              }}>
                {inviti.length}
              </span>
            </div>
            {inviti.map((inv, i) => (
              <div key={inv.id} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '13px 16px',
                borderBottom: i < inviti.length - 1 ? '1px solid var(--c-w4)' : 'none',
              }}>
                <div style={{
                  width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
                  background: 'oklch(0.75 0.18 80 / 15%)', color: 'oklch(0.75 0.18 80)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 700, fontSize: 14,
                }}>
                  {(inv as any).profiles?.full_name?.charAt(0).toUpperCase() ?? '?'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--c-97)' }}>
                    {(inv as any).profiles?.full_name ?? 'Utente'}
                  </p>
                  <p style={{ fontSize: 11.5, color: 'var(--c-45)', marginTop: 2 }}>
                    {new Date(inv.created_at).toLocaleDateString('it-IT', { day: 'numeric', month: 'long' })}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  <button
                    onClick={() => handleAzione(inv.id, 'approva')}
                    disabled={processingId === inv.id}
                    aria-label="Approva richiesta"
                    style={{
                      display: 'flex', alignItems: 'center', gap: 5,
                      padding: '7px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700,
                      background: 'oklch(0.65 0.18 150 / 15%)', color: 'oklch(0.65 0.18 150)',
                      minHeight: 32,
                    }}>
                    <FontAwesomeIcon icon={faCircleCheck} />
                    {processingId === inv.id ? '...' : 'Approva'}
                  </button>
                  <button
                    onClick={() => handleAzione(inv.id, 'rifiuta')}
                    disabled={processingId === inv.id}
                    aria-label="Rifiuta richiesta"
                    style={{
                      display: 'flex', alignItems: 'center', gap: 5,
                      padding: '7px 10px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                      background: 'oklch(0.65 0.22 27 / 15%)', color: 'oklch(0.75 0.15 27)',
                      minHeight: 32,
                    }}>
                    <FontAwesomeIcon icon={faXmark} />
                    Rifiuta
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Lista clienti ── */}
        <div style={{
          borderRadius: 16, overflow: 'hidden',
          background: 'var(--c-18)', border: '1px solid var(--c-w6)',
        }}>
          {/* Header: titolo + contatore */}
          <div style={{
            padding: '13px 16px', display: 'flex', alignItems: 'center', gap: 10,
            borderBottom: '1px solid var(--c-w6)',
          }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--c-97)', flex: 1 }}>I tuoi clienti</span>
            <span style={{
              fontSize: 11, fontWeight: 700, padding: '2px 9px', borderRadius: 20,
              background: 'oklch(0.70 0.19 46 / 15%)', color: 'oklch(0.70 0.19 46)',
            }}>
              {clienti.length}
            </span>
          </div>

          {/* Barra ricerca + sort */}
          {clienti.length > 0 && (
            <div style={{
              padding: '10px 12px', display: 'flex', gap: 8, alignItems: 'center',
              borderBottom: '1px solid var(--c-w4)',
              position: 'sticky', top: 0, zIndex: 10,
              background: 'var(--c-18)',
            }}>
              <div style={{
                flex: 1, display: 'flex', alignItems: 'center', gap: 8,
                padding: '8px 12px', borderRadius: 10,
                background: 'var(--c-22)', border: '1px solid var(--c-w8)',
              }}>
                <FontAwesomeIcon icon={faMagnifyingGlass} style={{ fontSize: 11, color: 'var(--c-45)', flexShrink: 0 }} />
                <input
                  type="search"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Cerca cliente..."
                  style={{
                    flex: 1, background: 'transparent', border: 'none', outline: 'none',
                    fontSize: 13.5, color: 'var(--c-97)',
                  }}
                />
              </div>
              <SortDropdown options={SORT_OPTIONS} value={sort} onChange={setSort} />
            </div>
          )}

          {loading ? (
            <div style={{ padding: '32px 0' }}>
              <BynariLoader file="blue" size={60} />
            </div>
          ) : clienti.length === 0 ? (
            <div style={{ padding: '48px 20px', textAlign: 'center' }}>
              <div style={{ fontSize: 40, color: 'var(--c-30)', marginBottom: 12 }}>
                <FontAwesomeIcon icon={faUsers} />
              </div>
              <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--c-97)', marginBottom: 6 }}>Nessun cliente ancora</p>
              <p style={{ fontSize: 13, color: 'var(--c-45)' }}>
                Condividi il link o aggiungi un cliente via email
              </p>
            </div>
          ) : filteredClienti.length === 0 ? (
            <div style={{ padding: '32px 20px', textAlign: 'center' }}>
              <p style={{ fontSize: 13, color: 'var(--c-50)' }}>Nessun risultato per "{search}"</p>
            </div>
          ) : (
            <>
              {/* Mobile list */}
              <div className="lg:hidden">
                {filteredClienti.map((c, i) => {
                  const nome = c.profiles?.full_name ?? 'Nome non disponibile'
                  const initiale = c.profiles?.full_name?.charAt(0).toUpperCase() ?? '?'
                  const isNuovo = (Date.now() - new Date(c.created_at).getTime()) < 7 * 24 * 60 * 60 * 1000
                  return (
                    <button
                      key={c.cliente_id}
                      onClick={() => {
                        setAnamnesIClienteId(c.cliente_id)
                        setAnamnesIClienteNome(nome)
                      }}
                      style={{
                        width: '100%', textAlign: 'left',
                        display: 'flex', alignItems: 'center', gap: 12,
                        padding: '13px 14px',
                        borderBottom: i < filteredClienti.length - 1 ? '1px solid var(--c-w4)' : 'none',
                        background: 'transparent', cursor: 'pointer', minHeight: 44,
                      }}>
                      {/* Avatar */}
                      <div style={{ position: 'relative', flexShrink: 0 }}>
                        <div style={{
                          width: 40, height: 40, borderRadius: '50%',
                          background: 'oklch(0.70 0.19 46 / 15%)', color: 'oklch(0.70 0.19 46)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontWeight: 700, fontSize: 14,
                        }}>
                          {initiale}
                        </div>
                        {isNuovo && (
                          <span style={{
                            position: 'absolute', top: -2, right: -4,
                            fontSize: 8, fontWeight: 800, padding: '1.5px 4px',
                            borderRadius: 4, background: 'oklch(0.70 0.19 46)', color: 'var(--c-13)',
                            letterSpacing: '0.04em',
                          }}>NEW</span>
                        )}
                      </div>
                      {/* Info */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--c-97)' }}>{nome}</div>
                        <div style={{ fontSize: 11.5, color: 'var(--c-50)', marginTop: 2 }}>
                          Aggiunto {new Date(c.created_at).toLocaleDateString('it-IT', { day: 'numeric', month: 'long' })}
                        </div>
                      </div>
                      <FontAwesomeIcon icon={faEye} style={{ color: 'var(--c-40)', fontSize: 13, flexShrink: 0 }} />
                    </button>
                  )
                })}
              </div>

              {/* Desktop table */}
              <div className="hidden lg:block">
                {/* Column header */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 160px 160px 100px 80px',
                  gap: 12, padding: '10px 18px',
                  background: 'var(--c-15)', borderBottom: '1px solid var(--c-w6)',
                  fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase',
                  letterSpacing: '0.08em', color: 'var(--c-45)',
                }}>
                  <span>Cliente</span>
                  <span>Aggiunto il</span>
                  <span>Stato</span>
                  <span style={{ textAlign: 'center' }}>Anamnesi</span>
                  <span></span>
                </div>

                {filteredClienti.map((c, i) => {
                  const nome = c.profiles?.full_name ?? 'Nome non disponibile'
                  const isNuovo = (Date.now() - new Date(c.created_at).getTime()) < 7 * 24 * 60 * 60 * 1000
                  return (
                    <div
                      key={c.cliente_id}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 160px 160px 100px 80px',
                        gap: 12, alignItems: 'center',
                        padding: '14px 18px',
                        borderBottom: i < filteredClienti.length - 1 ? '1px solid var(--c-w4)' : 'none',
                        transition: 'background 0.15s',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--c-w4)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      {/* Cliente col */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                        <div style={{ position: 'relative', flexShrink: 0 }}>
                          <div style={{
                            width: 36, height: 36, borderRadius: '50%',
                            background: 'oklch(0.70 0.19 46 / 15%)', color: 'oklch(0.70 0.19 46)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontWeight: 700, fontSize: 13.5,
                          }}>
                            {c.profiles?.full_name?.charAt(0).toUpperCase() ?? '?'}
                          </div>
                          {isNuovo && (
                            <span style={{
                              position: 'absolute', top: -4, right: -4,
                              fontSize: 8, fontWeight: 800, padding: '1.5px 4px',
                              borderRadius: 4, background: 'oklch(0.70 0.19 46)', color: 'var(--c-13)',
                              letterSpacing: '0.04em',
                            }}>NEW</span>
                          )}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--c-97)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{nome}</div>
                        </div>
                      </div>

                      {/* Data */}
                      <div style={{ fontSize: 12.5, color: 'var(--c-60)' }}>
                        {new Date(c.created_at).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </div>

                      {/* Stato */}
                      <div>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: 6,
                          fontSize: 11.5, fontWeight: 600,
                          padding: '3px 10px', borderRadius: 10,
                          background: 'oklch(0.65 0.18 150 / 15%)', color: 'oklch(0.65 0.18 150)',
                        }}>
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'oklch(0.65 0.18 150)', flexShrink: 0 }} />
                          Attivo
                        </span>
                      </div>

                      {/* Anamnesi */}
                      <div style={{ display: 'flex', justifyContent: 'center' }}>
                        <button
                          onClick={() => {
                            setAnamnesIClienteId(c.cliente_id)
                            setAnamnesIClienteNome(nome)
                          }}
                          aria-label="Vedi anamnesi"
                          style={{
                            width: 34, height: 34, borderRadius: 8, flexShrink: 0,
                            background: 'oklch(0.60 0.15 200 / 12%)', color: 'oklch(0.60 0.15 200)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}>
                          <FontAwesomeIcon icon={faEye} style={{ fontSize: 12 }} />
                        </button>
                      </div>

                      {/* Rimuovi */}
                      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <button
                          onClick={() => handleRemove(c.cliente_id, nome)}
                          style={{
                            padding: '5px 10px', borderRadius: 7, fontSize: 11.5, fontWeight: 600,
                            background: 'oklch(0.65 0.22 27 / 12%)', color: 'oklch(0.75 0.15 27)',
                            border: '1px solid oklch(0.65 0.22 27 / 20%)',
                          }}>
                          Rimuovi
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Drawer anamnesi ── */}
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
