'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
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
      .from('profiles')
      .select('role')
      .eq('id', user!.id)
      .single()
    if (profile?.role === 'coach') {
      router.push('/coach/dashboard')
    } else {
      router.push('/cliente/dashboard')
    }
  }

  return (
    <div className="min-h-screen flex" style={{ background: 'oklch(0.13 0 0)' }}>
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 relative overflow-hidden"
        style={{ background: 'oklch(0.16 0 0)' }}>
        {/* Decorative circles */}
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full opacity-10"
          style={{ background: 'oklch(0.70 0.19 46)' }} />
        <div className="absolute -bottom-24 -right-24 w-80 h-80 rounded-full opacity-10"
          style={{ background: 'oklch(0.70 0.19 46)' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full opacity-5"
          style={{ background: 'oklch(0.70 0.19 46)' }} />

        {/* Logo */}
        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl font-black"
              style={{ background: 'oklch(0.70 0.19 46)', color: 'oklch(0.13 0 0)' }}>
              M
            </div>
            <span className="text-xl font-bold tracking-tight" style={{ color: 'oklch(0.97 0 0)' }}>
              MyGymPlan
            </span>
          </div>
        </div>

        {/* Center content */}
        <div className="relative z-10 space-y-6">
          <h2 className="text-5xl font-black leading-tight" style={{ color: 'oklch(0.97 0 0)' }}>
            Allena.<br />
            <span style={{ color: 'oklch(0.70 0.19 46)' }}>Monitora.</span><br />
            Migliora.
          </h2>
          <p className="text-lg" style={{ color: 'oklch(0.60 0 0)' }}>
            La piattaforma che connette coach e atleti per risultati misurabili.
          </p>

          {/* Feature pills */}
          <div className="flex flex-wrap gap-3 pt-4">
            {['Schede personalizzate', 'Progressione in tempo reale', 'Chat diretta'].map((f) => (
              <span key={f} className="px-4 py-2 rounded-full text-sm font-medium"
                style={{ background: 'oklch(0.22 0 0)', color: 'oklch(0.70 0.19 46)', border: '1px solid oklch(0.70 0.19 46 / 30%)' }}>
                {f}
              </span>
            ))}
          </div>
        </div>

        {/* Bottom quote */}
        <div className="relative z-10">
          <p className="text-sm italic" style={{ color: 'oklch(0.45 0 0)' }}>
            "Il progresso non è un caso. È una scelta."
          </p>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md space-y-8">
          {/* Mobile logo */}
          <div className="flex items-center gap-3 lg:hidden">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl font-black"
              style={{ background: 'oklch(0.70 0.19 46)', color: 'oklch(0.13 0 0)' }}>
              M
            </div>
            <span className="text-xl font-bold" style={{ color: 'oklch(0.97 0 0)' }}>MyGymPlan</span>
          </div>

          <div className="space-y-2">
            <h1 className="text-3xl font-bold" style={{ color: 'oklch(0.97 0 0)' }}>Bentornato</h1>
            <p style={{ color: 'oklch(0.60 0 0)' }}>Accedi al tuo account per continuare</p>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium" style={{ color: 'oklch(0.80 0 0)' }}>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="la@tua.email"
                className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all"
                style={{
                  background: 'oklch(0.20 0 0)',
                  border: '1px solid oklch(1 0 0 / 8%)',
                  color: 'oklch(0.97 0 0)',
                }}
                onFocus={(e) => e.target.style.borderColor = 'oklch(0.70 0.19 46)'}
                onBlur={(e) => e.target.style.borderColor = 'oklch(1 0 0 / 8%)'}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium" style={{ color: 'oklch(0.80 0 0)' }}>Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all"
                style={{
                  background: 'oklch(0.20 0 0)',
                  border: '1px solid oklch(1 0 0 / 8%)',
                  color: 'oklch(0.97 0 0)',
                }}
                onFocus={(e) => e.target.style.borderColor = 'oklch(0.70 0.19 46)'}
                onBlur={(e) => e.target.style.borderColor = 'oklch(1 0 0 / 8%)'}
              />
            </div>

            {error && (
              <div className="px-4 py-3 rounded-xl text-sm"
                style={{ background: 'oklch(0.65 0.22 27 / 15%)', color: 'oklch(0.75 0.15 27)', border: '1px solid oklch(0.65 0.22 27 / 30%)' }}>
                {error}
              </div>
            )}

            <button
              onClick={handleLogin}
              disabled={loading}
              className="w-full py-3 rounded-xl font-semibold text-sm transition-all active:scale-95"
              style={{
                background: loading ? 'oklch(0.50 0.12 46)' : 'oklch(0.70 0.19 46)',
                color: 'oklch(0.13 0 0)',
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
            >
              {loading ? 'Accesso in corso...' : 'Accedi →'}
            </button>
          </div>

          <p className="text-center text-sm" style={{ color: 'oklch(0.60 0 0)' }}>
            Non hai un account?{' '}
            <a href="/register" className="font-semibold transition-opacity hover:opacity-80"
              style={{ color: 'oklch(0.70 0.19 46)' }}>
              Registrati gratis
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
