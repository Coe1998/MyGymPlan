'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { UserRole } from '@/types'

export default function RegisterPage() {
  const router = useRouter()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<UserRole>('cliente')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleRegister = async () => {
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          role: role,
        }
      }
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    // Il trigger su Supabase crea automaticamente il profilo
    if (role === 'coach') {
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
          <p className="text-muted-foreground mt-2">Crea il tuo account</p>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Nome completo</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Mario Rossi"
              className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

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

          <div className="space-y-2">
            <label className="text-sm font-medium">Sei un coach o un cliente?</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setRole('coach')}
                className={`py-3 rounded-md border text-sm font-medium transition-colors ${
                  role === 'coach'
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background border-input hover:bg-accent'
                }`}
              >
                💪 Coach
              </button>
              <button
                onClick={() => setRole('cliente')}
                className={`py-3 rounded-md border text-sm font-medium transition-colors ${
                  role === 'cliente'
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background border-input hover:bg-accent'
                }`}
              >
                🏃 Cliente
              </button>
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-500">{error}</p>
          )}

          <Button
            onClick={handleRegister}
            disabled={loading}
            className="w-full"
          >
            {loading ? 'Registrazione in corso...' : 'Crea account'}
          </Button>
        </div>

        <p className="text-center text-sm text-muted-foreground">
          Hai già un account?{' '}
          <a href="/login" className="text-primary font-medium hover:underline">
            Accedi
          </a>
        </p>
      </div>
    </div>
  )
}