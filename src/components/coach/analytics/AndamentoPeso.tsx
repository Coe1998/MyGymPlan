'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import dynamic from 'next/dynamic'

const LineChart = dynamic(() => import('recharts').then(m => m.LineChart), { ssr: false })
const Line = dynamic(() => import('recharts').then(m => m.Line), { ssr: false })
const XAxis = dynamic(() => import('recharts').then(m => m.XAxis), { ssr: false })
const YAxis = dynamic(() => import('recharts').then(m => m.YAxis), { ssr: false })
const Tooltip = dynamic(() => import('recharts').then(m => m.Tooltip), { ssr: false })
const ReferenceLine = dynamic(() => import('recharts').then(m => m.ReferenceLine), { ssr: false })
const ResponsiveContainer = dynamic(() => import('recharts').then(m => m.ResponsiveContainer), { ssr: false })

interface Props { clienteId: string }

export default function AndamentoPeso({ clienteId }: Props) {
  const supabase = useMemo(() => createClient(), [])
  const [dati, setDati] = useState<{ data: string; peso_kg: number }[]>([])
  const [loading, setLoading] = useState(true)
  const [showAll, setShowAll] = useState(false)

  useEffect(() => {
    const fetch = async () => {
      setLoading(true)
      const dataInizio = showAll ? '2000-01-01' : new Date(Date.now() - 90 * 86400000).toISOString()
      const { data } = await supabase
        .from('misurazioni')
        .select('peso_kg, data')
        .eq('cliente_id', clienteId)
        .gte('data', dataInizio)
        .order('data', { ascending: true })
      setDati(data?.map(d => ({ ...d, data: d.data.split('T')[0] })) ?? [])
      setLoading(false)
    }
    fetch()
  }, [clienteId, showAll])

  const primoValore = dati[0]?.peso_kg
  const ultimoValore = dati[dati.length - 1]?.peso_kg
  const delta = primoValore && ultimoValore ? Math.round((ultimoValore - primoValore) * 10) / 10 : null
  const mediaValore = dati.length > 0
    ? Math.round((dati.reduce((a, d) => a + d.peso_kg, 0) / dati.length) * 10) / 10
    : null

  return (
    <div className="rounded-2xl overflow-hidden"
      style={{ background: 'oklch(0.18 0 0)', border: '1px solid oklch(1 0 0 / 6%)' }}>
      <div className="px-5 py-4 flex items-center justify-between"
        style={{ borderBottom: '1px solid oklch(1 0 0 / 6%)' }}>
        <div>
          <h2 className="font-bold" style={{ color: 'oklch(0.97 0 0)' }}>Andamento peso</h2>
          <p className="text-xs mt-0.5" style={{ color: 'oklch(0.45 0 0)' }}>
            {showAll ? 'Storico completo' : 'Ultimi 90 giorni'}
          </p>
        </div>
        {!showAll && (
          <button onClick={() => setShowAll(true)}
            className="text-xs px-3 py-1.5 rounded-xl"
            style={{ background: 'oklch(0.22 0 0)', color: 'oklch(0.60 0.15 200)', border: '1px solid oklch(1 0 0 / 8%)' }}>
            Mostra tutto
          </button>
        )}
      </div>

      <div className="p-5">
        {loading ? (
          <div className="py-8 text-center">
            <p className="text-sm" style={{ color: 'oklch(0.45 0 0)' }}>Caricamento...</p>
          </div>
        ) : dati.length < 2 ? (
          <p className="text-sm text-center py-8" style={{ color: 'oklch(0.45 0 0)' }}>
            {dati.length === 0 ? 'Nessuna misurazione disponibile' : 'Servono almeno 2 misurazioni per il grafico'}
          </p>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-3 mb-5">
              <div className="rounded-xl p-3" style={{ background: 'oklch(0.22 0 0)' }}>
                <p className="text-xs mb-1" style={{ color: 'oklch(0.50 0 0)' }}>Peso attuale</p>
                <p className="text-xl font-black" style={{ color: 'oklch(0.97 0 0)' }}>
                  {ultimoValore} <span className="text-sm font-normal" style={{ color: 'oklch(0.50 0 0)' }}>kg</span>
                </p>
                <p className="text-xs mt-0.5" style={{ color: 'oklch(0.45 0 0)' }}>
                  {dati[dati.length - 1].data}
                </p>
              </div>
              <div className="rounded-xl p-3" style={{ background: 'oklch(0.22 0 0)' }}>
                <p className="text-xs mb-1" style={{ color: 'oklch(0.50 0 0)' }}>Variazione</p>
                <p className="text-xl font-black"
                  style={{ color: delta === null ? 'oklch(0.55 0 0)' : delta === 0 ? 'oklch(0.55 0 0)' : delta > 0 ? 'oklch(0.60 0.15 200)' : 'oklch(0.65 0.18 150)' }}>
                  {delta === null ? '—' : delta > 0 ? `+${delta}` : delta} <span className="text-sm font-normal" style={{ color: 'oklch(0.50 0 0)' }}>kg</span>
                </p>
                <p className="text-xs mt-0.5" style={{ color: 'oklch(0.45 0 0)' }}>nel periodo</p>
              </div>
              <div className="rounded-xl p-3" style={{ background: 'oklch(0.22 0 0)' }}>
                <p className="text-xs mb-1" style={{ color: 'oklch(0.50 0 0)' }}>Media</p>
                <p className="text-xl font-black" style={{ color: 'oklch(0.97 0 0)' }}>
                  {mediaValore} <span className="text-sm font-normal" style={{ color: 'oklch(0.50 0 0)' }}>kg</span>
                </p>
                <p className="text-xs mt-0.5" style={{ color: 'oklch(0.45 0 0)' }}>
                  {dati.length} misurazioni
                </p>
              </div>
            </div>

            <div style={{ height: 160 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dati} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
                  <XAxis dataKey="data"
                    tick={{ fontSize: 10, fill: 'oklch(0.45 0 0)' }}
                    tickLine={false} axisLine={false}
                    tickFormatter={v => v.slice(5)} />
                  <YAxis
                    tick={{ fontSize: 10, fill: 'oklch(0.45 0 0)' }}
                    tickLine={false} axisLine={false}
                    domain={['auto', 'auto']} />
                  {mediaValore && (
                    <ReferenceLine y={mediaValore} stroke="oklch(0.50 0 0)"
                      strokeDasharray="4 3" strokeWidth={0.8} />
                  )}
                  <Tooltip
                    contentStyle={{ background: 'oklch(0.22 0 0)', border: '1px solid oklch(1 0 0 / 10%)', borderRadius: 8, fontSize: 12 }}
                    labelStyle={{ color: 'oklch(0.70 0 0)' }}
                    itemStyle={{ color: 'oklch(0.70 0.19 46)' }}
                    formatter={(v: any) => [`${v} kg`, 'Peso']}
                  />
                  <Line type="monotone" dataKey="peso_kg"
                    stroke="oklch(0.70 0.19 46)" strokeWidth={2.5}
                    dot={{ r: 3, fill: 'oklch(0.70 0.19 46)', strokeWidth: 0 }}
                    activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
