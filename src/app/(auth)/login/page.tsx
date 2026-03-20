'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'

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

    // Recupera il ruolo e redirecta
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
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-md p-8 space-y-6 rounded-xl border border-border bg-card shadow-sm">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight">MyGymPlan</h1>
          <p className="text-muted-foreground mt-2">Accedi al tuo account</p>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="la@tua.email"
              className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {error && (
            <p className="text-sm text-red-500">{error}</p>
          )}

          <Button
            onClick={handleLogin}
            disabled={loading}
            className="w-full"
          >
            {loading ? 'Accesso in corso...' : 'Accedi'}
          </Button>
        </div>

        <p className="text-center text-sm text-muted-foreground">
          Non hai un account?{' '}
          <a href="/register" className="text-primary font-medium hover:underline">
            Registrati
          </a>
        </p>
      </div>
    </div>
  )
}