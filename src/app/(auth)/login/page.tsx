'use client'

import { useState, Suspense } from 'react'
import BynariLoader from '@/components/shared/BynariLoader'
import Image from 'next/image'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const inviteCode = searchParams.get('code')

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleLogin = async () => {
    setLoading(true)
    setError(null)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError('Email o password non corretti')
      setLoading(false)
      return
    }
    const { data: { user } } = await supabase.auth.getUser()
    const { data: profile } = await supabase
      .from('profiles').select('role, coach_status').eq('id', user!.id).single()

    // Se c'è un codice invito → crea l'invito pending e vai alla dashboard atleta
    if (inviteCode && profile?.role !== 'coach') {
      const { data: coach } = await supabase
        .from('profiles').select('id').eq('coach_code', inviteCode).single()
      if (coach) {
        // Controlla se già collegato
        const { data: existing } = await supabase
          .from('coach_clienti').select('id')
          .eq('coach_id', coach.id).eq('cliente_id', user!.id).single()
        if (!existing) {
          // Crea invito pending se non esiste già
          const { data: invito } = await supabase
            .from('coach_inviti').select('id')
            .eq('coach_id', coach.id).eq('cliente_id', user!.id).single()
          if (!invito) {
            await supabase.from('coach_inviti').insert({
              coach_id: coach.id, cliente_id: user!.id, stato: 'pending',
            })
          }
          // Aggiorna ruolo se era atleta
          if (profile?.role === 'atleta') {
            await supabase.from('profiles').update({ role: 'cliente' }).eq('id', user!.id)
          }
        }
      }
      const dest = profile?.role === 'atleta' || profile?.role === 'cliente'
        ? '/atleta/dashboard?invito=inviato'
        : '/cliente/dashboard'
      router.push(dest)
      return
    }

    // Routing normale per ruolo
    if (profile?.role === 'coach') {
      if (profile.coach_status === 'pending') {
        router.push('/coach/pending')
      } else {
        router.push('/coach/dashboard')
      }
    } else if (profile?.role === 'cliente') {
      router.push('/cliente/dashboard')
    } else if (profile?.role === 'admin') {
      router.push('/admin/dashboard')
    } else {
      router.push('/atleta/dashboard')
    }
  }

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--c-13)' }}>
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 relative overflow-hidden"
        style={{ background: 'var(--c-16)' }}>
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full opacity-10"
          style={{ background: 'oklch(0.70 0.19 46)' }} />
        <div className="absolute -bottom-24 -right-24 w-80 h-80 rounded-full opacity-10"
          style={{ background: 'oklch(0.70 0.19 46)' }} />

        <div className="relative z-10">
          <Image src="/logo/Bynari_WO1.png" alt="Bynari" width={130} height={32} style={{ height: '32px', width: 'auto' }} />
        </div>

        <div className="relative z-10 space-y-6">
          <h2 className="text-5xl font-black leading-tight" style={{ color: 'var(--c-97)' }}>
            Allena.<br />
            <span style={{ color: 'oklch(0.70 0.19 46)' }}>Monitora.</span><br />
            Migliora.
          </h2>
          <p className="text-lg" style={{ color: 'var(--c-60)' }}>
            La piattaforma che connette coach e atleti per risultati misurabili.
          </p>
          <div className="flex flex-wrap gap-3 pt-4">
            {['Schede personalizzate', 'Progressione in tempo reale', 'Analytics avanzate'].map((f) => (
              <span key={f} className="px-4 py-2 rounded-full text-sm font-medium"
                style={{ background: 'var(--c-22)', color: 'oklch(0.70 0.19 46)', border: '1px solid oklch(0.70 0.19 46 / 30%)' }}>
                {f}
              </span>
            ))}
          </div>
        </div>

        <div className="relative z-10">
          <p className="text-sm italic" style={{ color: 'var(--c-45)' }}>
            "Il progresso non è un caso. È una scelta."
          </p>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md space-y-8">
          <div className="lg:hidden">
            <Image src="/logo/Bynari_WO1.png" alt="Bynari" width={120} height={28} style={{ height: '28px', width: 'auto' }} />
          </div>

          {/* Banner invito */}
          {inviteCode && (
            <div className="px-4 py-3 rounded-xl text-sm"
              style={{ background: 'oklch(0.70 0.19 46 / 12%)', border: '1px solid oklch(0.70 0.19 46 / 30%)', color: 'var(--c-80)' }}>
              🎯 Accedi per collegarti al tuo coach
            </div>
          )}

          <div className="space-y-2">
            <h1 className="text-3xl font-bold" style={{ color: 'var(--c-97)' }}>Bentornato</h1>
            <p style={{ color: 'var(--c-60)' }}>Accedi al tuo account per continuare</p>
          </div>

          <div className="space-y-4">
            {[
              { label: 'Email', value: email, setter: setEmail, type: 'email', placeholder: 'la@tua.email' },
              { label: 'Password', value: password, setter: setPassword, type: 'password', placeholder: '••••••••' },
            ].map((f) => (
              <div key={f.label} className="space-y-2">
                <label className="text-sm font-medium" style={{ color: 'var(--c-80)' }}>{f.label}</label>
                <input type={f.type} value={f.value} onChange={e => f.setter(e.target.value)}
                  placeholder={f.placeholder} onKeyDown={e => e.key === 'Enter' && handleLogin()}
                  className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all"
                  style={{ background: 'var(--c-20)', border: '1px solid var(--c-w8)', color: 'var(--c-97)' }}
                  onFocus={e => e.target.style.borderColor = 'oklch(0.70 0.19 46)'}
                  onBlur={e => e.target.style.borderColor = 'var(--c-w8)'} />
              </div>
            ))}

            {error && (
              <div className="px-4 py-3 rounded-xl text-sm"
                style={{ background: 'oklch(0.65 0.22 27 / 15%)', color: 'oklch(0.75 0.15 27)', border: '1px solid oklch(0.65 0.22 27 / 30%)' }}>
                {error}
              </div>
            )}

            <button onClick={handleLogin} disabled={loading}
              className="w-full py-3 rounded-xl font-semibold text-sm transition-all active:scale-95"
              style={{
                background: loading ? 'oklch(0.50 0.12 46)' : 'oklch(0.70 0.19 46)',
                color: 'var(--c-13)', cursor: loading ? 'not-allowed' : 'pointer',
              }}>
              {loading ? 'Accesso in corso...' : 'Accedi →'}
            </button>
          </div>

          <p className="text-center text-sm" style={{ color: 'var(--c-60)' }}>
            Non hai un account?{' '}
            <a href={inviteCode ? `/register?code=${inviteCode}` : '/register'}
              className="font-semibold transition-opacity hover:opacity-80"
              style={{ color: 'oklch(0.70 0.19 46)' }}>
              Registrati gratis
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--c-13)' }}>
        <BynariLoader file="blue" size={80} />
      </div>
    }>
      <LoginForm />
    </Suspense>
  )
}
