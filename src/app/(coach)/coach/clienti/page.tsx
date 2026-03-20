'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Cliente {
  cliente_id: string
  created_at: string
  profiles: {
    id: string
    full_name: string | null
    avatar_url: string | null
  }
}

export default function ClientiPage() {
  const [clienti, setClienti] = useState<Cliente[]>([])
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [inviting, setInviting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const supabase = createClient()

  const fetchClienti = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data } = await supabase
      .from('coach_clienti')
      .select(`
        cliente_id,
        created_at,
        profiles!coach_clienti_cliente_id_fkey (
          id,
          full_name,
          avatar_url
        )
      `)
      .eq('coach_id', user.id)
      .order('created_at', { ascending: false })

    setClienti((data as any) ?? [])
    setLoading(false)
  }

  useEffect(() => {
    fetchClienti()
  }, [])

  const handleInvite = async () => {
    if (!email.trim()) return
    setInviting(true)
    setError(null)
    setSuccess(null)

    const response = await fetch('/api/coach/aggiungi-cliente', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim() }),
    })

    const data = await response.json()

    if (!response.ok) {
      setError(data.error ?? 'Errore sconosciuto')
      setInviting(false)
      return
    }

    setSuccess(`${data.full_name} è stato aggiunto con successo!`)
    setEmail('')
    fetchClienti()
    setInviting(false)
  }

  const handleRemove = async (clienteId: string, nome: string) => {
    if (!confirm(`Vuoi rimuovere ${nome} dalla tua lista clienti?`)) return

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase
      .from('coach_clienti')
      .delete()
      .eq('coach_id', user.id)
      .eq('cliente_id', clienteId)

    fetchClienti()
  }

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h1 className="text-4xl font-black tracking-tight" style={{ color: 'oklch(0.97 0 0)' }}>
          Clienti
        </h1>
        <p className="mt-1 text-sm" style={{ color: 'oklch(0.50 0 0)' }}>
          Gestisci i tuoi atleti e aggiungine di nuovi
        </p>
      </div>

      <div
        className="rounded-2xl p-6 space-y-4"
        style={{ background: 'oklch(0.18 0 0)', border: '1px solid oklch(1 0 0 / 6%)' }}
      >
        <h2 className="font-bold" style={{ color: 'oklch(0.97 0 0)' }}>Aggiungi un cliente</h2>
        <p className="text-sm" style={{ color: 'oklch(0.50 0 0)' }}>
          Il cliente deve essere già registrato su MyGymPlan. Inserisci la sua email.
        </p>
        <div className="flex gap-3">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleInvite()}
            placeholder="email@cliente.com"
            className="flex-1 px-4 py-3 rounded-xl text-sm outline-none transition-all"
            style={{ background: 'oklch(0.22 0 0)', border: '1px solid oklch(1 0 0 / 8%)', color: 'oklch(0.97 0 0)' }}
            onFocus={(e) => e.target.style.borderColor = 'oklch(0.70 0.19 46)'}
            onBlur={(e) => e.target.style.borderColor = 'oklch(1 0 0 / 8%)'}
          />
          <button
            onClick={handleInvite}
            disabled={inviting || !email.trim()}
            className="px-6 py-3 rounded-xl text-sm font-semibold transition-all active:scale-95 whitespace-nowrap"
            style={{
              background: inviting || !email.trim() ? 'oklch(0.40 0.10 46)' : 'oklch(0.70 0.19 46)',
              color: 'oklch(0.13 0 0)',
              cursor: inviting || !email.trim() ? 'not-allowed' : 'pointer',
            }}
          >
            {inviting ? 'Aggiunta...' : '+ Aggiungi'}
          </button>
        </div>
        {error && (
          <div className="px-4 py-3 rounded-xl text-sm"
            style={{ background: 'oklch(0.65 0.22 27 / 15%)', color: 'oklch(0.75 0.15 27)', border: '1px solid oklch(0.65 0.22 27 / 30%)' }}>
            ⚠️ {error}
          </div>
        )}
        {success && (
          <div className="px-4 py-3 rounded-xl text-sm"
            style={{ background: 'oklch(0.65 0.18 150 / 15%)', color: 'oklch(0.65 0.18 150)', border: '1px solid oklch(0.65 0.18 150 / 30%)' }}>
            ✅ {success}
          </div>
        )}
      </div>

      <div
        className="rounded-2xl overflow-hidden"
        style={{ background: 'oklch(0.18 0 0)', border: '1px solid oklch(1 0 0 / 6%)' }}
      >
        <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid oklch(1 0 0 / 6%)' }}>
          <h2 className="font-bold" style={{ color: 'oklch(0.97 0 0)' }}>I tuoi clienti</h2>
          <span className="text-xs font-semibold px-3 py-1 rounded-full"
            style={{ background: 'oklch(0.70 0.19 46 / 15%)', color: 'oklch(0.70 0.19 46)' }}>
            {clienti.length} totali
          </span>
        </div>
        {loading ? (
          <div className="py-16 text-center">
            <p className="text-sm" style={{ color: 'oklch(0.45 0 0)' }}>Caricamento...</p>
          </div>
        ) : clienti.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <div className="text-5xl">👥</div>
            <p className="font-semibold" style={{ color: 'oklch(0.97 0 0)' }}>Nessun cliente ancora</p>
            <p className="text-sm" style={{ color: 'oklch(0.45 0 0)' }}>Aggiungi il tuo primo cliente usando il form qui sopra</p>
          </div>
        ) : (
          <div>
            {clienti.map((c, i) => (
              <div
                key={c.cliente_id}
                className="flex items-center gap-4 px-6 py-4 transition-colors group"
                style={{ borderBottom: i < clienti.length - 1 ? '1px solid oklch(1 0 0 / 4%)' : 'none' }}
              >
                <div className="w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                  style={{ background: 'oklch(0.70 0.19 46 / 15%)', color: 'oklch(0.70 0.19 46)' }}>
                  {c.profiles?.full_name?.charAt(0).toUpperCase() ?? '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm" style={{ color: 'oklch(0.97 0 0)' }}>
                    {c.profiles?.full_name ?? 'Nome non disponibile'}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: 'oklch(0.45 0 0)' }}>
                    Aggiunto il {new Date(c.created_at).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                </div>
                <div className="text-xs font-medium px-3 py-1 rounded-full"
                  style={{ background: 'oklch(0.65 0.18 150 / 15%)', color: 'oklch(0.65 0.18 150)' }}>
                  Attivo
                </div>
                <button
                  onClick={() => handleRemove(c.cliente_id, c.profiles?.full_name ?? 'questo cliente')}
                  className="opacity-0 group-hover:opacity-100 ml-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                  style={{ background: 'oklch(0.65 0.22 27 / 15%)', color: 'oklch(0.75 0.15 27)', border: '1px solid oklch(0.65 0.22 27 / 20%)' }}
                >
                  Rimuovi
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
