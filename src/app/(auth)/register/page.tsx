'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
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
        data: { full_name: fullName, role }
      }
    })
    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }
    if (role === 'coach') {
      router.push('/coach/dashboard')
    } else {
      router.push('/cliente/dashboard')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-8" style={{ background: 'oklch(0.13 0 0)' }}>
      <div className="w-full max-w-md space-y-8">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl font-black"
            style={{ background: 'oklch(0.70 0.19 46)', color: 'oklch(0.13 0 0)' }}>
            M
          </div>
          <span className="text-xl font-bold" style={{ color: 'oklch(0.97 0 0)' }}>MyGymPlan</span>
        </div>

        <div className="space-y-2">
          <h1 className="text-3xl font-bold" style={{ color: 'oklch(0.97 0 0)' }}>Crea il tuo account</h1>
          <p style={{ color: 'oklch(0.60 0 0)' }}>Inizia subito, è gratuito</p>
        </div>

        {/* Role selector */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { value: 'coach', label: 'Sono un Coach', icon: '🏋️', desc: 'Gestisco atleti e schede' },
            { value: 'cliente', label: 'Sono un Atleta', icon: '🏃', desc: 'Seguo le schede del mio coach' },
          ].map((r) => (
            <button
              key={r.value}
              onClick={() => setRole(r.value as UserRole)}
              className="p-4 rounded-xl text-left transition-all"
              style={{
                background: role === r.value ? 'oklch(0.70 0.19 46 / 15%)' : 'oklch(0.20 0 0)',
                border: role === r.value ? '1px solid oklch(0.70 0.19 46 / 60%)' : '1px solid oklch(1 0 0 / 8%)',
              }}
            >
              <div className="text-2xl mb-2">{r.icon}</div>
              <div className="font-semibold text-sm" style={{ color: role === r.value ? 'oklch(0.70 0.19 46)' : 'oklch(0.97 0 0)' }}>
                {r.label}
              </div>
              <div className="text-xs mt-1" style={{ color: 'oklch(0.55 0 0)' }}>{r.desc}</div>
            </button>
          ))}
        </div>

        <div className="space-y-4">
          {[
            { label: 'Nome completo', value: fullName, setter: setFullName, type: 'text', placeholder: 'Mario Rossi' },
            { label: 'Email', value: email, setter: setEmail, type: 'email', placeholder: 'la@tua.email' },
            { label: 'Password', value: password, setter: setPassword, type: 'password', placeholder: '••••••••' },
          ].map((field) => (
            <div key={field.label} className="space-y-2">
              <label className="text-sm font-medium" style={{ color: 'oklch(0.80 0 0)' }}>{field.label}</label>
              <input
                type={field.type}
                value={field.value}
                onChange={(e) => field.setter(e.target.value)}
                placeholder={field.placeholder}
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
          ))}

          {error && (
            <div className="px-4 py-3 rounded-xl text-sm"
              style={{ background: 'oklch(0.65 0.22 27 / 15%)', color: 'oklch(0.75 0.15 27)', border: '1px solid oklch(0.65 0.22 27 / 30%)' }}>
              {error}
            </div>
          )}

          <button
            onClick={handleRegister}
            disabled={loading}
            className="w-full py-3 rounded-xl font-semibold text-sm transition-all active:scale-95"
            style={{
              background: loading ? 'oklch(0.50 0.12 46)' : 'oklch(0.70 0.19 46)',
              color: 'oklch(0.13 0 0)',
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? 'Registrazione in corso...' : 'Crea account →'}
          </button>
        </div>

        <p className="text-center text-sm" style={{ color: 'oklch(0.60 0 0)' }}>
          Hai già un account?{' '}
          <a href="/login" className="font-semibold hover:opacity-80 transition-opacity"
            style={{ color: 'oklch(0.70 0.19 46)' }}>
            Accedi
          </a>
        </p>
      </div>
    </div>
  )
}
