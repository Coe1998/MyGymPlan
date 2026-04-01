'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPrint, faDumbbell, faCalendarDays, faHeartPulse, faWeightScale } from '@fortawesome/free-solid-svg-icons'

interface Assegnazione {
  id: string
  data_inizio: string | null
  data_fine: string | null
  attiva: boolean
  schede: { id: string; nome: string } | null
}

interface Props {
  clienteId: string
  nomeCliente: string
  assegnazioni: Assegnazione[]
  totSessioni: number
  ultimoPeso: number | null
  clienteDal: string | null
}

export type PeriodoGiorni = 30 | 90 | 180 | 9999

const PERIODI: { label: string; value: PeriodoGiorni }[] = [
  { label: '30gg', value: 30 },
  { label: '90gg', value: 90 },
  { label: '6 mesi', value: 180 },
  { label: 'tutto', value: 9999 },
]

export default function AnalyticsHeader({
  clienteId, nomeCliente, assegnazioni, totSessioni, ultimoPeso, clienteDal,
}: Props) {
  const supabase = useMemo(() => createClient(), [])
  const [periodo, setPeriodo] = useState<PeriodoGiorni>(90)
  const [kpi, setKpi] = useState<{
    sessioni: number; sessioniPrec: number
    benessere: number | null; benesserePrec: number | null
    completamento: number; completamentoPrec: number
  } | null>(null)

  const iniziali = nomeCliente.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase()
  const clienteDalLabel = clienteDal
    ? new Date(clienteDal).toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' })
    : null

  useEffect(() => {
    const fetchKpi = async () => {
      const now = Date.now()
      const msPerDay = 86400000
      const dataInizio = periodo === 9999 ? '2000-01-01' : new Date(now - periodo * msPerDay).toISOString()
      const dataInizioPrec = periodo === 9999 ? '2000-01-01' : new Date(now - periodo * 2 * msPerDay).toISOString()
      const dataFinePrec = new Date(now - periodo * msPerDay).toISOString()

      const [sessRes, sessPreRes, ciRes, ciPreRes] = await Promise.all([
        supabase.from('sessioni').select('id, completata', { count: 'exact' })
          .eq('cliente_id', clienteId).gte('data', dataInizio),
        supabase.from('sessioni').select('id, completata', { count: 'exact' })
          .eq('cliente_id', clienteId).gte('data', dataInizioPrec).lt('data', dataFinePrec),
        supabase.from('checkin').select('energia, sonno, stress, motivazione')
          .eq('cliente_id', clienteId).gte('data', dataInizio),
        supabase.from('checkin').select('energia, sonno, stress, motivazione')
          .eq('cliente_id', clienteId).gte('data', dataInizioPrec).lt('data', dataFinePrec),
      ])

      const calcBenessere = (rows: any[]) => {
        if (!rows.length) return null
        const avg = rows.reduce((acc, r) =>
          acc + (r.energia + r.sonno + (6 - r.stress) + r.motivazione) / 4, 0) / rows.length
        return Math.round(avg * 10) / 10
      }

      const sessioni = sessRes.data ?? []
      const sessPrec = sessPreRes.data ?? []
      const completate = sessioni.filter((s: any) => s.completata).length
      const completatePrec = sessPrec.filter((s: any) => s.completata).length
      const totPrec = sessPrec.length

      setKpi({
        sessioni: sessioni.length,
        sessioniPrec: sessPrec.length,
        benessere: calcBenessere(ciRes.data ?? []),
        benesserePrec: calcBenessere(ciPreRes.data ?? []),
        completamento: sessioni.length > 0 ? Math.round((completate / sessioni.length) * 100) : 0,
        completamentoPrec: totPrec > 0 ? Math.round((completatePrec / totPrec) * 100) : 0,
      })
    }
    fetchKpi()
  }, [clienteId, periodo])

  const delta = (curr: number, prev: number, decimali = 0) => {
    const d = curr - prev
    if (d === 0) return null
    const str = decimali > 0 ? d.toFixed(decimali) : String(Math.round(d))
    return { val: d, str: d > 0 ? `+${str}` : str }
  }

  const handlePrint = () => window.print()

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
            style={{ background: 'oklch(0.70 0.19 46 / 15%)', color: 'oklch(0.70 0.19 46)' }}>
            {iniziali}
          </div>
          <div>
            <p className="font-black text-xl" style={{ color: 'oklch(0.97 0 0)' }}>{nomeCliente}</p>
            <p className="text-xs" style={{ color: 'oklch(0.50 0 0)' }}>
              {clienteDalLabel ? `Cliente dal ${clienteDalLabel} · ` : ''}{totSessioni} sessioni totali
            </p>
          </div>
        </div>
        <button
          onClick={handlePrint}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all active:scale-95"
          style={{ background: 'oklch(0.22 0 0)', color: 'oklch(0.65 0 0)', border: '1px solid oklch(1 0 0 / 8%)' }}>
          <FontAwesomeIcon icon={faPrint} />
          <span className="hidden sm:inline">Stampa report</span>
        </button>
      </div>

      <div className="flex gap-2">
        {PERIODI.map(p => (
          <button key={p.value} onClick={() => setPeriodo(p.value)}
            className="px-4 py-2 rounded-xl text-xs font-bold transition-all"
            style={{
              background: periodo === p.value ? 'oklch(0.70 0.19 46)' : 'oklch(0.22 0 0)',
              color: periodo === p.value ? 'oklch(0.11 0 0)' : 'oklch(0.55 0 0)',
            }}>
            {p.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          {
            label: 'Sessioni',
            icon: faDumbbell,
            val: kpi?.sessioni ?? '—',
            delta: kpi ? delta(kpi.sessioni, kpi.sessioniPrec) : null,
            color: 'oklch(0.60 0.15 200)',
          },
          {
            label: 'Completamento',
            icon: faCalendarDays,
            val: kpi ? `${kpi.completamento}%` : '—',
            delta: kpi ? delta(kpi.completamento, kpi.completamentoPrec) : null,
            color: 'oklch(0.65 0.18 150)',
          },
          {
            label: 'Benessere medio',
            icon: faHeartPulse,
            val: kpi?.benessere ?? '—',
            delta: kpi?.benessere != null && kpi?.benesserePrec != null
              ? delta(kpi.benessere, kpi.benesserePrec, 1) : null,
            color: 'oklch(0.70 0.19 46)',
          },
          {
            label: 'Peso attuale',
            icon: faWeightScale,
            val: ultimoPeso ? `${ultimoPeso} kg` : '—',
            delta: null,
            color: 'oklch(0.65 0.15 300)',
          },
        ].map(stat => (
          <div key={stat.label} className="rounded-2xl p-4 space-y-2"
            style={{ background: 'oklch(0.18 0 0)', border: '1px solid oklch(1 0 0 / 6%)' }}>
            <div className="flex items-center justify-between">
              <p className="text-xs" style={{ color: 'oklch(0.50 0 0)' }}>{stat.label}</p>
              <FontAwesomeIcon icon={stat.icon} style={{ color: stat.color, fontSize: 14 }} />
            </div>
            <p className="text-3xl font-black" style={{ color: stat.color }}>{stat.val}</p>
            {stat.delta && (
              <p className="text-xs" style={{
                color: stat.delta.val > 0 ? 'oklch(0.65 0.18 150)' : 'oklch(0.75 0.15 27)',
              }}>
                {stat.delta.str} vs periodo prec.
              </p>
            )}
          </div>
        ))}
      </div>

      <div className="rounded-2xl p-4"
        style={{ background: 'oklch(0.18 0 0)', border: '1px solid oklch(1 0 0 / 6%)' }}>
        <p className="text-xs font-semibold uppercase tracking-widest mb-3"
          style={{ color: 'oklch(0.45 0 0)' }}>
          Schede assegnate
        </p>
        <div className="flex flex-wrap gap-2">
          {assegnazioni.map(a => (
            <span key={a.id}
              className="text-xs px-3 py-1.5 rounded-full font-medium"
              style={{
                background: a.attiva ? 'oklch(0.70 0.19 46 / 15%)' : 'oklch(0.22 0 0)',
                color: a.attiva ? 'oklch(0.70 0.19 46)' : 'oklch(0.50 0 0)',
                border: a.attiva ? '1px solid oklch(0.70 0.19 46 / 30%)' : '1px solid oklch(1 0 0 / 8%)',
              }}>
              {a.schede?.nome ?? 'Scheda'}
              {a.attiva && ' · attiva'}
            </span>
          ))}
          {assegnazioni.length === 0 && (
            <span className="text-xs" style={{ color: 'oklch(0.45 0 0)' }}>Nessuna scheda assegnata</span>
          )}
        </div>
      </div>
    </div>
  )
}
