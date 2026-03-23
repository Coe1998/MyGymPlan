'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar
} from 'recharts'

interface Sessione {
  id: string
  data: string
  completata: boolean
  scheda_giorni: { nome: string } | null
}

interface EsercizioOption {
  id: string
  scheda_esercizio_id: string
  nome: string
}

interface PuntoGrafico {
  data: string
  peso_max: number
  volume: number
}

export default function ProgressiPage() {
  const [sessioni, setSessioni] = useState<Sessione[]>([])
  const [esercizi, setEsercizi] = useState<EsercizioOption[]>([])
  const [selectedEsercizio, setSelectedEsercizio] = useState<string>('')
  const [graficoDati, setGraficoDati] = useState<PuntoGrafico[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingGrafico, setLoadingGrafico] = useState(false)
  const [vistaStorico, setVistaStorico] = useState<'lista' | 'settimana'>('lista')

  const supabase = createClient()

  const fetchProgressi = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Sessioni
    const { data: sessioniData } = await supabase
      .from('sessioni')
      .select('id, data, completata, scheda_giorni ( nome )')
      .eq('cliente_id', user.id)
      .order('data', { ascending: false })
    setSessioni((sessioniData as any) ?? [])

    // Esercizi che ha già loggato (con nome)
    const { data: logData } = await supabase
      .from('log_serie')
      .select(`
        scheda_esercizio_id,
        scheda_esercizi!inner (
          esercizi ( id, nome )
        )
      `)
      .in('sessione_id', (sessioniData ?? []).map((s: any) => s.id))

    // Deduplicazione esercizi
    const eserciziMap = new Map<string, EsercizioOption>()
    for (const log of (logData ?? []) as any[]) {
      const eseId = log.scheda_esercizi?.esercizi?.id
      const eseNome = log.scheda_esercizi?.esercizi?.nome
      if (eseId && !eserciziMap.has(eseId)) {
        eserciziMap.set(eseId, {
          id: eseId,
          scheda_esercizio_id: log.scheda_esercizio_id,
          nome: eseNome,
        })
      }
    }
    const eserciziList = Array.from(eserciziMap.values()).sort((a, b) => a.nome.localeCompare(b.nome))
    setEsercizi(eserciziList)
    if (eserciziList.length > 0) setSelectedEsercizio(eserciziList[0].id)

    setLoading(false)
  }

  const fetchGrafico = async (eseId: string) => {
    if (!eseId) return
    setLoadingGrafico(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Trova tutti i log per questo esercizio, ordinati per data sessione
    const { data: logs } = await supabase
      .from('log_serie')
      .select(`
        peso_kg, ripetizioni, completata,
        scheda_esercizi!inner ( esercizi!inner ( id ) ),
        sessioni!inner ( data, completata, cliente_id )
      `)
      .eq('scheda_esercizi.esercizi.id', eseId)
      .eq('sessioni.cliente_id', user.id)
      .eq('sessioni.completata', true)
      .eq('completata', true)
      .order('sessioni(data)', { ascending: true })

    if (!logs || logs.length === 0) {
      setGraficoDati([])
      setLoadingGrafico(false)
      return
    }

    // Raggruppa per data sessione
    const byData = new Map<string, { pesi: number[]; volume: number }>()
    for (const log of logs as any[]) {
      const data = new Date(log.sessioni.data).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })
      const peso = parseFloat(log.peso_kg) || 0
      const reps = parseInt(log.ripetizioni) || 0
      if (!byData.has(data)) byData.set(data, { pesi: [], volume: 0 })
      const entry = byData.get(data)!
      if (peso > 0) entry.pesi.push(peso)
      entry.volume += peso * reps
    }

    const punti: PuntoGrafico[] = Array.from(byData.entries()).map(([data, val]) => ({
      data,
      peso_max: val.pesi.length > 0 ? Math.max(...val.pesi) : 0,
      volume: Math.round(val.volume),
    }))

    setGraficoDati(punti)
    setLoadingGrafico(false)
  }

  useEffect(() => { fetchProgressi() }, [])
  useEffect(() => { if (selectedEsercizio) fetchGrafico(selectedEsercizio) }, [selectedEsercizio])

  // Statistiche sessioni
  const sessioniCompletate = sessioni.filter(s => s.completata).length
  const sessioniSettimana = sessioni.filter(s => {
    const data = new Date(s.data)
    const oggi = new Date()
    const diff = (oggi.getTime() - data.getTime()) / (1000 * 60 * 60 * 24)
    return diff <= 7
  }).length

  // Frequenza settimanale per grafico barre
  const frequenzaSettimanale = () => {
    const settimane = new Map<string, number>()
    for (const s of sessioni.filter(s => s.completata)) {
      const data = new Date(s.data)
      const lunedi = new Date(data)
      lunedi.setDate(data.getDate() - data.getDay() + 1)
      const key = lunedi.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })
      settimane.set(key, (settimane.get(key) ?? 0) + 1)
    }
    return Array.from(settimane.entries())
      .slice(-8)
      .map(([settimana, count]) => ({ settimana, allenamenti: count }))
  }

  const tooltipStyle = {
    backgroundColor: 'oklch(0.22 0 0)',
    border: '1px solid oklch(1 0 0 / 10%)',
    borderRadius: '12px',
    color: 'oklch(0.97 0 0)',
    fontSize: '12px',
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <p className="text-sm" style={{ color: 'oklch(0.45 0 0)' }}>Caricamento progressi...</p>
      </div>
    )
  }

  return (
    <div className="space-y-8 max-w-5xl">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-black tracking-tight" style={{ color: 'oklch(0.97 0 0)' }}>
          Progressi
        </h1>
        <p className="mt-1 text-sm" style={{ color: 'oklch(0.50 0 0)' }}>
          Il tuo percorso di miglioramento nel tempo
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Sessioni totali', value: sessioniCompletate, icon: '🏋️', color: 'oklch(0.60 0.15 200)' },
          { label: 'Questa settimana', value: sessioniSettimana, icon: '📅', color: 'oklch(0.70 0.19 46)' },
          { label: 'Esercizi tracciati', value: esercizi.length, icon: '💪', color: 'oklch(0.65 0.15 300)' },
        ].map((stat) => (
          <div key={stat.label} className="rounded-2xl p-5 space-y-3"
            style={{ background: 'oklch(0.18 0 0)', border: '1px solid oklch(1 0 0 / 6%)' }}>
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium" style={{ color: 'oklch(0.50 0 0)' }}>{stat.label}</p>
              <span className="text-xl">{stat.icon}</span>
            </div>
            <p className="text-4xl font-black" style={{ color: stat.color }}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Grafico frequenza settimanale */}
      {sessioniCompletate > 0 && (
        <div className="rounded-2xl p-6 space-y-4"
          style={{ background: 'oklch(0.18 0 0)', border: '1px solid oklch(1 0 0 / 6%)' }}>
          <h2 className="font-bold" style={{ color: 'oklch(0.97 0 0)' }}>
            Frequenza settimanale
          </h2>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={frequenzaSettimanale()} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 5%)" />
              <XAxis dataKey="settimana" tick={{ fill: 'oklch(0.50 0 0)', fontSize: 11 }} />
              <YAxis tick={{ fill: 'oklch(0.50 0 0)', fontSize: 11 }} allowDecimals={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="allenamenti" fill="oklch(0.60 0.15 200)" radius={[6, 6, 0, 0]} name="Allenamenti" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Grafici progressione per esercizio */}
      {esercizi.length > 0 && (
        <div className="rounded-2xl p-6 space-y-5"
          style={{ background: 'oklch(0.18 0 0)', border: '1px solid oklch(1 0 0 / 6%)' }}>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <h2 className="font-bold" style={{ color: 'oklch(0.97 0 0)' }}>
              Progressione per esercizio
            </h2>
            <select
              value={selectedEsercizio}
              onChange={(e) => setSelectedEsercizio(e.target.value)}
              className="px-4 py-2.5 rounded-xl text-sm outline-none"
              style={{ background: 'oklch(0.22 0 0)', border: '1px solid oklch(1 0 0 / 8%)', color: 'oklch(0.97 0 0)' }}>
              {esercizi.map(e => (
                <option key={e.id} value={e.id}>{e.nome}</option>
              ))}
            </select>
          </div>

          {loadingGrafico ? (
            <div className="h-48 flex items-center justify-center">
              <p className="text-sm" style={{ color: 'oklch(0.45 0 0)' }}>Caricamento...</p>
            </div>
          ) : graficoDati.length < 2 ? (
            <div className="h-48 flex items-center justify-center text-center">
              <div>
                <p className="text-3xl mb-2">📊</p>
                <p className="text-sm font-medium" style={{ color: 'oklch(0.60 0 0)' }}>
                  Servono almeno 2 sessioni per vedere il grafico
                </p>
                <p className="text-xs mt-1" style={{ color: 'oklch(0.40 0 0)' }}>
                  Continua ad allenarti per vedere la tua progressione!
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Peso massimo */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider mb-3"
                  style={{ color: 'oklch(0.50 0 0)' }}>
                  Peso massimo per sessione (kg)
                </p>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={graficoDati} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 5%)" />
                    <XAxis dataKey="data" tick={{ fill: 'oklch(0.50 0 0)', fontSize: 11 }} />
                    <YAxis tick={{ fill: 'oklch(0.50 0 0)', fontSize: 11 }} />
                    <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => [`${v} kg`, 'Peso max']} />
                    <Line
                      type="monotone" dataKey="peso_max"
                      stroke="oklch(0.70 0.19 46)" strokeWidth={2.5}
                      dot={{ fill: 'oklch(0.70 0.19 46)', r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Volume totale */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider mb-3"
                  style={{ color: 'oklch(0.50 0 0)' }}>
                  Volume totale per sessione (kg × reps)
                </p>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={graficoDati} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 5%)" />
                    <XAxis dataKey="data" tick={{ fill: 'oklch(0.50 0 0)', fontSize: 11 }} />
                    <YAxis tick={{ fill: 'oklch(0.50 0 0)', fontSize: 11 }} />
                    <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => [`${v} kg`, 'Volume']} />
                    <Line
                      type="monotone" dataKey="volume"
                      stroke="oklch(0.60 0.15 200)" strokeWidth={2.5}
                      dot={{ fill: 'oklch(0.60 0.15 200)', r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Storico sessioni */}
      <div className="rounded-2xl overflow-hidden"
        style={{ background: 'oklch(0.18 0 0)', border: '1px solid oklch(1 0 0 / 6%)' }}>
        <div className="px-6 py-4 flex items-center justify-between"
          style={{ borderBottom: '1px solid oklch(1 0 0 / 6%)' }}>
          <h2 className="font-bold" style={{ color: 'oklch(0.97 0 0)' }}>Storico allenamenti</h2>
          <span className="text-xs font-semibold px-3 py-1 rounded-full"
            style={{ background: 'oklch(0.60 0.15 200 / 15%)', color: 'oklch(0.60 0.15 200)' }}>
            {sessioni.length} totali
          </span>
        </div>

        {sessioni.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <p className="text-5xl">🏃</p>
            <p className="font-semibold" style={{ color: 'oklch(0.97 0 0)' }}>Nessun allenamento ancora</p>
            <p className="text-sm" style={{ color: 'oklch(0.45 0 0)' }}>
              Inizia il tuo primo allenamento dalla dashboard
            </p>
          </div>
        ) : (
          <div>
            {sessioni.map((s, i) => (
              <div key={s.id} className="flex items-center gap-4 px-6 py-4"
                style={{ borderBottom: i < sessioni.length - 1 ? '1px solid oklch(1 0 0 / 4%)' : 'none' }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                  style={{ background: s.completata ? 'oklch(0.65 0.18 150 / 15%)' : 'oklch(0.22 0 0)' }}>
                  {s.completata ? '✅' : '⏸️'}
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-sm" style={{ color: 'oklch(0.97 0 0)' }}>
                    {(s as any).scheda_giorni?.nome ?? 'Allenamento'}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: 'oklch(0.45 0 0)' }}>
                    {new Date(s.data).toLocaleDateString('it-IT', {
                      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
                    })}
                  </p>
                </div>
                <span className="text-xs px-2.5 py-1 rounded-full"
                  style={{
                    background: s.completata ? 'oklch(0.65 0.18 150 / 15%)' : 'oklch(0.22 0 0)',
                    color: s.completata ? 'oklch(0.65 0.18 150)' : 'oklch(0.45 0 0)',
                  }}>
                  {s.completata ? 'Completato' : 'Incompleto'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
