'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import ReportGenerator from './ReportGenerator'

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
  const [showReport, setShowReport] = useState(false)
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
  }, [clienteId, periodo, supabase])

  const delta = (curr: number, prev: number, decimali = 0) => {
    const d = curr - prev
    if (d === 0) return null
    const str = decimali > 0 ? d.toFixed(decimali) : String(Math.round(d))
    return { val: d, str: d > 0 ? `+${str}` : str }
  }

  const kpiList = [
    {
      label: 'SESSIONI',
      val: kpi?.sessioni != null ? String(kpi.sessioni) : '—',
      unit: '',
      delta: kpi ? delta(kpi.sessioni, kpi.sessioniPrec) : null,
    },
    {
      label: 'COMPLETAMENTO',
      val: kpi ? String(kpi.completamento) : '—',
      unit: kpi ? '%' : '',
      delta: kpi ? delta(kpi.completamento, kpi.completamentoPrec) : null,
    },
    {
      label: 'BENESSERE MEDIO',
      val: kpi?.benessere != null ? kpi.benessere.toFixed(1) : '—',
      unit: kpi?.benessere != null ? '/5' : '',
      delta: kpi?.benessere != null && kpi?.benesserePrec != null
        ? delta(kpi.benessere, kpi.benesserePrec, 1) : null,
    },
    {
      label: 'PESO ATTUALE',
      val: ultimoPeso != null ? String(ultimoPeso) : '—',
      unit: ultimoPeso != null ? 'kg' : '',
      delta: null,
    },
  ]

  return (
    <div className="space-y-5">
      {/* Avatar + nome + report */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div style={{
          width: 48, height: 48, borderRadius: 14, flexShrink: 0,
          background: 'linear-gradient(135deg, #f57c1f 0%, #e8661a 100%)',
          color: '#0b0b0c', fontWeight: 900, fontSize: 16,
          display: 'flex', alignItems: 'center', justifyContent: 'center', letterSpacing: -0.5,
        }}>
          {iniziali}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontWeight: 800, fontSize: 19, color: 'var(--c-97)', letterSpacing: -0.5, lineHeight: 1.2, margin: 0 }}>{nomeCliente}</p>
          <p style={{ fontSize: 12, color: 'var(--c-50)', marginTop: 2 }}>
            {clienteDalLabel ? `Cliente dal ${clienteDalLabel} · ` : ''}{totSessioni} sessioni totali
          </p>
        </div>
        <button
          onClick={() => setShowReport(true)}
          style={{
            background: 'transparent', border: '1px solid var(--c-w8)',
            borderRadius: 10, padding: '8px 12px',
            color: 'var(--c-70)', fontSize: 13, fontWeight: 600,
            display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', flexShrink: 0,
          }}>
          <span>⎙</span>
          <span className="hidden sm:inline">Report</span>
        </button>
      </div>

      {/* Periodo chips */}
      <div style={{ display: 'flex', gap: 6, overflowX: 'auto' }}>
        {PERIODI.map(p => (
          <button key={p.value} onClick={() => setPeriodo(p.value)}
            style={{
              padding: '8px 14px', borderRadius: 999, fontSize: 13, fontWeight: 600,
              background: periodo === p.value ? 'oklch(0.70 0.19 46)' : 'transparent',
              color: periodo === p.value ? '#0b0b0c' : 'var(--c-70)',
              border: periodo === p.value ? 'none' : '1px solid var(--c-w6)',
              whiteSpace: 'nowrap', cursor: 'pointer', flexShrink: 0,
              transition: 'background 0.15s',
            }}>
            {p.label}
          </button>
        ))}
      </div>

      {/* KPI 2×2 mobile, 4×1 desktop */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {kpiList.map(stat => (
          <div key={stat.label} style={{
            background: 'var(--c-18)', border: '1px solid var(--c-w6)',
            borderRadius: 14, padding: '14px 14px 12px',
            minHeight: 96, display: 'flex', flexDirection: 'column', gap: 2,
          }}>
            <div style={{ fontSize: 11, color: 'var(--c-50)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>
              {stat.label}
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginTop: 6 }}>
              <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--c-97)', letterSpacing: -1, lineHeight: 1 }}>
                {stat.val}
              </div>
              {stat.unit && (
                <div style={{ fontSize: 13, color: 'var(--c-50)', fontWeight: 500 }}>{stat.unit}</div>
              )}
            </div>
            {stat.delta && (
              <div style={{
                fontSize: 11, marginTop: 4, fontWeight: 500,
                color: stat.delta.val > 0 ? '#30a46c' : '#e5484d',
              }}>
                {stat.delta.str} vs periodo prec.
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Schede assegnate */}
      <div style={{ background: 'var(--c-18)', border: '1px solid var(--c-w6)', borderRadius: 16, padding: '14px 16px' }}>
        <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--c-45)', marginBottom: 10 }}>
          Schede assegnate
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {assegnazioni.filter(a => a.attiva).map(a => (
            <span key={a.id} style={{
              padding: '7px 12px', borderRadius: 999, fontSize: 12.5, fontWeight: 600,
              background: 'rgba(245,124,31,0.14)', color: '#f57c1f',
              border: '1px solid rgba(245,124,31,0.3)',
              display: 'inline-flex', alignItems: 'center', gap: 6,
            }}>
              <span style={{ width: 6, height: 6, borderRadius: 999, background: '#f57c1f', flexShrink: 0 }} />
              {a.schede?.nome ?? 'Scheda'}
            </span>
          ))}
          {assegnazioni.filter(a => !a.attiva).length > 0 && (
            <span style={{
              padding: '7px 12px', borderRadius: 999, fontSize: 12.5, fontWeight: 500,
              background: 'transparent', color: 'var(--c-50)',
              border: '1px solid var(--c-w6)',
            }}>
              +{assegnazioni.filter(a => !a.attiva).length} archiviate
            </span>
          )}
          {assegnazioni.length === 0 && (
            <span style={{ fontSize: 12.5, color: 'var(--c-45)' }}>Nessuna scheda assegnata</span>
          )}
        </div>
      </div>

      {showReport && kpi && (
        <ReportGenerator
          clienteId={clienteId}
          nomeCliente={nomeCliente}
          periodo={periodo}
          kpi={{ sessioni: kpi.sessioni, completamento: kpi.completamento, benessere: kpi.benessere }}
          ultimoPeso={ultimoPeso}
          onClose={() => setShowReport(false)}
        />
      )}
    </div>
  )
}
