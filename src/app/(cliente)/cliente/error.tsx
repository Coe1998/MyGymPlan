'use client'

import { useEffect } from 'react'

export default function ClienteError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center">
      <p className="text-4xl">⚠️</p>
      <p className="text-lg font-semibold" style={{ color: 'oklch(0.97 0 0)' }}>
        Qualcosa è andato storto
      </p>
      <p className="text-sm" style={{ color: 'oklch(0.50 0 0)' }}>
        {error.message || 'Errore sconosciuto'}
      </p>
      <button
        onClick={reset}
        className="mt-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-95"
        style={{ background: 'oklch(0.60 0.15 200)', color: 'oklch(0.11 0 0)' }}
      >
        Riprova
      </button>
    </div>
  )
}
