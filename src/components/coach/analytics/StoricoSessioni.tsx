'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

interface Props { clienteId: string }

interface Sessione {
  id: string
  data: string
  completata: boolean
  durata_secondi: number | null
  giornoNome: string
}

const PAGE_SIZE = 10

export default function StoricoSessioni({ clienteId }: Props) {
  const supabase = useMemo(() => createClient(), [])
  const [sessioni, setSessioni] = useState<Sessione[]>([])
  const [loading, setLoading] = useState(true)
  const [pagina, setPagina] = useState(0)
  const [hasMore, setHasMore] = useState(false)

  useEffect(() => {
    const fetch = async () => {
      setLoading(true)
      const from = pagina * PAGE_SIZE
      const to = from + PAGE_SIZE - 1
      const dataInizio = new Date(Date.now() - 90 * 86400000).toISOString()

      const { data, count } = await supabase
        .from('sessioni')
        .select('id, data, completata, durata_secondi, scheda_giorni ( nome )', { count: 'estimated' })
        .eq('cliente_id', clienteId)
        .gte('data', pagina === 0 ? dataInizio : '2000-01-01')
        .order('data', { ascending: false })
        .range(from, to)

      const mapped = (data ?? []).map((s: any) => ({
        id: s.id,
        data: s.data,
        completata: s.completata,
        durata_secondi: s.durata_secondi,
        giornoNome: s.scheda_giorni?.nome ?? 'Allenamento',
      }))

      setSessioni(prev => pagina === 0 ? mapped : [...prev, ...mapped])
      setHasMore((count ?? 0) > (pagina + 1) * PAGE_SIZE)
      setLoading(false)
    }
    fetch()
  }, [clienteId, pagina])

  const formatDurata = (sec: number | null) => {
    if (!sec) return null
    const h = Math.floor(sec / 3600)
    const m = Math.floor((sec % 3600) / 60)
    return h > 0 ? `${h}h ${m}min` : `${m}min`
  }

  return (
    <div className="rounded-2xl overflow-hidden"
      style={{ background: 'oklch(0.18 0 0)', border: '1px solid oklch(1 0 0 / 6%)' }}>
      <div className="px-5 py-4" style={{ borderBottom: '1px solid oklch(1 0 0 / 6%)' }}>
        <h2 className="font-bold" style={{ color: 'oklch(0.97 0 0)' }}>Storico sessioni</h2>
        <p className="text-xs mt-0.5" style={{ color: 'oklch(0.45 0 0)' }}>Ultimi 90 giorni</p>
      </div>

      {loading && pagina === 0 ? (
        <div className="py-8 text-center">
          <p className="text-sm" style={{ color: 'oklch(0.45 0 0)' }}>Caricamento...</p>
        </div>
      ) : sessioni.length === 0 ? (
        <div className="py-8 text-center">
          <p className="text-sm" style={{ color: 'oklch(0.45 0 0)' }}>Nessuna sessione nel periodo</p>
        </div>
      ) : (
        <>
          <div>
            {sessioni.map((s, i) => (
              <Link
                key={s.id}
                href={`/coach/analytics?cliente=${clienteId}&sessione=${s.id}`}
                className="flex items-center justify-between px-5 py-4 group transition-colors hover:bg-white/[0.02]"
                style={{ borderBottom: i < sessioni.length - 1 ? '1px solid oklch(1 0 0 / 4%)' : 'none' }}>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{
                      background: s.completata ? 'oklch(0.65 0.18 150 / 15%)' : 'oklch(0.22 0 0)',
                      color: s.completata ? 'oklch(0.65 0.18 150)' : 'oklch(0.45 0 0)',
                    }}>
                    <span className="text-xs font-bold">{s.completata ? '✓' : '○'}</span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: 'oklch(0.90 0 0)' }}>
                      {s.giornoNome}
                    </p>
                    <p className="text-xs" style={{ color: 'oklch(0.50 0 0)' }}>
                      {new Date(s.data).toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' })}
                      {formatDurata(s.durata_secondi) ? ` · ${formatDurata(s.durata_secondi)}` : ''}
                    </p>
                  </div>
                </div>
                <span className="text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ color: 'oklch(0.60 0.15 200)' }}>
                  dettagli →
                </span>
              </Link>
            ))}
          </div>

          {hasMore && (
            <div className="px-5 py-4">
              <button
                onClick={() => setPagina(p => p + 1)}
                disabled={loading}
                className="w-full py-2.5 rounded-xl text-xs font-semibold transition-all"
                style={{ background: 'oklch(0.22 0 0)', color: 'oklch(0.55 0 0)', border: '1px solid oklch(1 0 0 / 8%)' }}>
                {loading ? 'Caricamento...' : 'Mostra sessioni precedenti'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
