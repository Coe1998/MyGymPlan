'use client'

import { use, useEffect, useState, useMemo } from 'react'
import BynariLoader from '@/components/shared/BynariLoader'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faArrowLeft, faDumbbell, faChevronDown } from '@fortawesome/free-solid-svg-icons'

interface Esercizio {
  id: string
  nome: string
  muscoli: string[] | null
}
interface SchedaEsercizio {
  id: string
  ordine: number
  serie: number
  ripetizioni: string
  recupero_secondi: number
  note: string | null
  tipo: string
  esercizi: Esercizio
}
interface Giorno {
  id: string
  nome: string
  ordine: number
  scheda_esercizi: SchedaEsercizio[]
}
interface Scheda {
  id: string
  nome: string
  descrizione: string | null
}

export default function ClienteSchedaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: schedaId } = use(params)
  const supabase = useMemo(() => createClient(), [])
  const router = useRouter()

  const [scheda, setScheda] = useState<Scheda | null>(null)
  const [giorni, setGiorni] = useState<Giorno[]>([])
  const [loading, setLoading] = useState(true)
  const [giornoAperto, setGiornoAperto] = useState<string | null>(null)

  useEffect(() => {
    const fetch = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      // Verifica che la scheda sia assegnata a questo cliente
      const { data: assegnazione } = await supabase
        .from('assegnazioni')
        .select('id')
        .eq('cliente_id', user.id)
        .eq('attiva', true)
        .maybeSingle()

      // Fetch scheda + giorni
      const [schedaRes, giorniRes] = await Promise.all([
        supabase.from('schede').select('id, nome, descrizione').eq('id', schedaId).single(),
        supabase.from('scheda_giorni')
          .select(`id, nome, ordine,
            scheda_esercizi (
              id, ordine, serie, ripetizioni, recupero_secondi, note, tipo,
              esercizi!scheda_esercizi_esercizio_id_fkey ( id, nome, muscoli )
            )`)
          .eq('scheda_id', schedaId)
          .order('ordine'),
      ])

      if (!schedaRes.data) { router.push('/cliente/dashboard'); return }
      setScheda(schedaRes.data)
      const g = ((giorniRes.data ?? []) as any[]).map(giorno => ({
        ...giorno,
        scheda_esercizi: (giorno.scheda_esercizi ?? []).sort((a: any, b: any) => a.ordine - b.ordine),
      }))
      setGiorni(g)
      if (g.length > 0) setGiornoAperto(g[0].id)
      setLoading(false)
    }
    fetch()
  }, [schedaId])

  if (loading) return <BynariLoader file="blue" size={80} />

  if (!scheda) return null

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <Link href="/cliente/dashboard"
          className="inline-flex items-center gap-2 text-sm mb-4"
          style={{ color: 'oklch(0.50 0 0)' }}>
          <FontAwesomeIcon icon={faArrowLeft} />
          Dashboard
        </Link>
        <h1 className="text-3xl font-black tracking-tight" style={{ color: 'oklch(0.97 0 0)' }}>
          {scheda.nome}
        </h1>
        {scheda.descrizione && (
          <p className="mt-1 text-sm" style={{ color: 'oklch(0.50 0 0)' }}>{scheda.descrizione}</p>
        )}
        <p className="mt-1 text-sm" style={{ color: 'oklch(0.45 0 0)' }}>
          {giorni.length} {giorni.length === 1 ? 'giorno' : 'giorni'}
        </p>
      </div>

      <div className="space-y-3">
        {giorni.map(g => (
          <div key={g.id} className="rounded-2xl overflow-hidden"
            style={{ background: 'oklch(0.18 0 0)', border: '1px solid oklch(1 0 0 / 6%)' }}>
            {/* Header giorno */}
            <button
              onClick={() => setGiornoAperto(giornoAperto === g.id ? null : g.id)}
              className="w-full flex items-center justify-between px-5 py-4 text-left"
              style={{ borderBottom: giornoAperto === g.id ? '1px solid oklch(1 0 0 / 6%)' : 'none' }}>
              <div>
                <p className="font-bold text-sm" style={{ color: 'oklch(0.97 0 0)' }}>{g.nome}</p>
                <p className="text-xs mt-0.5" style={{ color: 'oklch(0.45 0 0)' }}>
                  {g.scheda_esercizi.length} esercizi
                </p>
              </div>
              <FontAwesomeIcon icon={faChevronDown}
                className="text-xs transition-transform"
                style={{
                  color: 'oklch(0.40 0 0)',
                  transform: giornoAperto === g.id ? 'rotate(180deg)' : 'none',
                }} />
            </button>

            {/* Esercizi */}
            {giornoAperto === g.id && (
              <div>
                {g.scheda_esercizi.length === 0 ? (
                  <p className="px-5 py-4 text-sm" style={{ color: 'oklch(0.40 0 0)' }}>
                    Nessun esercizio
                  </p>
                ) : g.scheda_esercizi.map((e, i) => (
                  <div key={e.id} className="px-5 py-3 flex items-start gap-3"
                    style={{ borderBottom: i < g.scheda_esercizi.length - 1 ? '1px solid oklch(1 0 0 / 4%)' : 'none' }}>
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                      style={{ background: 'oklch(0.60 0.15 200 / 12%)', color: 'oklch(0.60 0.15 200)' }}>
                      <FontAwesomeIcon icon={faDumbbell} style={{ fontSize: 10 }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold" style={{ color: 'oklch(0.90 0 0)' }}>
                        {e.esercizi?.nome ?? '—'}
                      </p>
                      <div className="flex flex-wrap gap-2 mt-1">
                        <span className="text-xs px-2 py-0.5 rounded-md"
                          style={{ background: 'oklch(0.23 0 0)', color: 'oklch(0.60 0 0)' }}>
                          {e.serie} × {e.ripetizioni}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded-md"
                          style={{ background: 'oklch(0.23 0 0)', color: 'oklch(0.60 0 0)' }}>
                          {e.recupero_secondi}s rec.
                        </span>
                        {e.tipo && e.tipo !== 'normale' && (
                          <span className="text-xs px-2 py-0.5 rounded-md font-semibold"
                            style={{ background: 'oklch(0.70 0.19 46 / 15%)', color: 'oklch(0.70 0.19 46)' }}>
                            {e.tipo}
                          </span>
                        )}
                      </div>
                      {e.esercizi?.muscoli && e.esercizi.muscoli.length > 0 && (
                        <p className="text-xs mt-1" style={{ color: 'oklch(0.40 0 0)' }}>
                          {e.esercizi.muscoli.join(', ')}
                        </p>
                      )}
                      {e.note && (
                        <p className="text-xs mt-1 italic" style={{ color: 'oklch(0.45 0 0)' }}>{e.note}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
