'use client'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faCalendarDay, faHourglassHalf, faChartColumn, faBullseye,
  faWandMagicSparkles, faUtensils, faMinus, faPlus,
  faArrowsRotate, faCheck, faChevronDown, faChevronUp,
} from '@fortawesome/free-solid-svg-icons'
import { useState } from 'react'
import type { DietaDraft, ProfiloMacro } from './types'

// ── helpers ──────────────────────────────────────────────────────────────────

const todayISO = () => {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

const shiftDay = (iso: string, days: number) => {
  const d = new Date(iso)
  d.setDate(d.getDate() + days)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

const fmtISO = (iso: string) => {
  if (!iso) return '—'
  const [y, m, d] = iso.split('-')
  const mesi = ['gen','feb','mar','apr','mag','giu','lug','ago','set','ott','nov','dic']
  return `${parseInt(d)} ${mesi[parseInt(m) - 1]} ${y.slice(2)}`
}

const PASTO_NOMI = ['Colazione','Pranzo','Merenda','Cena','Spuntino','Pre-workout']
const PROFILO_COLORS = [
  'oklch(0.70 0.14 200)',
  'oklch(0.70 0.19 46)',
  'oklch(0.68 0.18 150)',
  'oklch(0.82 0.13 85)',
]

// ── props ────────────────────────────────────────────────────────────────────

interface TdeeInfo {
  mantenimento: number
  fattori: { icon: string; label: string; impact: string }[]
}

interface Props {
  draft: DietaDraft
  setDraft: (d: DietaDraft) => void
  profili: ProfiloMacro[]
  setProfili: (p: ProfiloMacro[]) => void
  ciclo: string[]
  setCiclo: (c: string[]) => void
  tdee: TdeeInfo | null
}

// ── NumField ─────────────────────────────────────────────────────────────────

function NumField({ label, unit, value, onChange, color }: {
  label: string; unit: string; value: string
  onChange: (v: string) => void; color: string
}) {
  return (
    <div style={{ padding: 12, borderRadius: 11, background: 'var(--c-15)', border: '1px solid var(--c-w6)' }}>
      <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.08em', color: 'var(--c-60)', textTransform: 'uppercase' }}>
        {label}
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginTop: 4 }}>
        <input
          value={value}
          onChange={e => onChange(e.target.value.replace(/[^0-9]/g, ''))}
          inputMode="numeric"
          style={{
            background: 'transparent', border: 'none', outline: 'none',
            fontFamily: 'Syne, Inter', fontWeight: 800, fontSize: 24,
            color, letterSpacing: '-0.02em', width: '100%', padding: 0,
            fontVariantNumeric: 'tabular-nums',
          }}
        />
        <span style={{ fontSize: 11, color: 'var(--c-50)', fontWeight: 600 }}>{unit}</span>
      </div>
    </div>
  )
}

// ── DataInizioCard ────────────────────────────────────────────────────────────

function DataInizioCard({ draft, setDraft }: { draft: DietaDraft; setDraft: (d: DietaDraft) => void }) {
  const today = todayISO()
  const inPast = draft.data_inizio < today
  const isToday = draft.data_inizio === today
  const inFuture = draft.data_inizio > today

  const badge = isToday
    ? { bg: 'oklch(0.65 0.18 150 / 14%)', col: 'oklch(0.70 0.18 150)', lbl: 'OGGI' }
    : inPast
    ? { bg: 'oklch(0.65 0.14 200 / 14%)', col: 'oklch(0.70 0.14 200)', lbl: 'ATTIVA' }
    : { bg: 'oklch(0.82 0.13 85 / 14%)',  col: 'oklch(0.85 0.13 85)',  lbl: 'PROGRAMMATA' }

  return (
    <div style={{
      padding: 18, borderRadius: 16,
      background: inFuture ? 'oklch(0.82 0.13 85 / 6%)' : 'var(--c-13)',
      border: '1px solid ' + (inFuture ? 'oklch(0.82 0.13 85 / 24%)' : 'var(--c-w8)'),
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <div style={{
          width: 28, height: 28, borderRadius: 8,
          background: 'oklch(0.65 0.14 200 / 18%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <FontAwesomeIcon icon={faCalendarDay} style={{ fontSize: 12, color: 'oklch(0.65 0.14 200)' }} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--c-95)' }}>Data di inizio</div>
          <div style={{ fontSize: 10.5, color: 'var(--c-50)', marginTop: 1 }}>Quando il cliente inizia questa dieta</div>
        </div>
        <span style={{ padding: '4px 10px', borderRadius: 999, background: badge.bg, color: badge.col, fontSize: 9.5, fontWeight: 800, letterSpacing: '0.1em' }}>
          {badge.lbl}
        </span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto auto', gap: 8, alignItems: 'center' }}>
        <input
          type="date"
          value={draft.data_inizio}
          onChange={e => setDraft({ ...draft, data_inizio: e.target.value })}
          style={{
            padding: '11px 14px', borderRadius: 11,
            background: 'var(--c-18)', border: '1px solid var(--c-w8)',
            color: 'var(--c-97)', fontSize: 13, fontWeight: 600,
            fontFamily: 'inherit', outline: 'none', colorScheme: 'dark',
          }}
        />
        {[
          { label: 'Oggi',     v: today },
          { label: '+1 sett.', v: shiftDay(today, 7) },
          { label: '+1 mese',  v: shiftDay(today, 30) },
        ].map(q => (
          <button key={q.label} onClick={() => setDraft({ ...draft, data_inizio: q.v })} style={{
            padding: '11px 14px', borderRadius: 11,
            background: 'var(--c-18)', color: 'var(--c-75)',
            fontSize: 11, fontWeight: 700, border: '1px solid var(--c-w6)',
          }}>{q.label}</button>
        ))}
      </div>
      {inFuture && (
        <div style={{
          marginTop: 12, padding: '10px 12px', borderRadius: 10,
          background: 'oklch(0.82 0.13 85 / 12%)', color: 'oklch(0.88 0.13 85)',
          fontSize: 11.5, fontWeight: 600, display: 'flex', gap: 8, alignItems: 'flex-start',
        }}>
          <FontAwesomeIcon icon={faHourglassHalf} style={{ fontSize: 11, marginTop: 2 }} />
          <span>Dieta programmata: inizierà il <strong>{fmtISO(draft.data_inizio)}</strong>. Fino ad allora resta in vigore la versione attuale.</span>
        </div>
      )}
    </div>
  )
}

// ── TdeeStimaCard ─────────────────────────────────────────────────────────────

function TdeeStimaCard({ tdee }: { tdee: TdeeInfo | null }) {
  if (!tdee) return (
    <div style={{ padding: 18, borderRadius: 16, background: 'var(--c-13)', border: '1px solid var(--c-w8)' }}>
      <div style={{ fontSize: 11, color: 'var(--c-45)' }}>Dati anamnesi insufficienti per stimare il TDEE.</div>
    </div>
  )
  return (
    <div style={{
      padding: 18, borderRadius: 16,
      background: 'linear-gradient(135deg, oklch(0.65 0.14 200 / 8%), oklch(0.10 0 0))',
      border: '1px solid oklch(0.65 0.14 200 / 22%)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <FontAwesomeIcon icon={faChartColumn} style={{ color: 'oklch(0.70 0.14 200)', fontSize: 13 }} />
        <span style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '0.14em', color: 'oklch(0.72 0.14 200)' }}>
          STIMA TDEE DA ANAMNESI
        </span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
        {[
          { label: 'Deficit',      sub: '−300 kcal', val: tdee.mantenimento - 300, col: 'oklch(0.70 0.14 200)' },
          { label: 'Mantenimento', sub: 'TDEE',       val: tdee.mantenimento,       col: 'var(--c-97)' },
          { label: 'Surplus',      sub: '+300 kcal',  val: tdee.mantenimento + 300, col: 'oklch(0.70 0.19 46)' },
        ].map(k => (
          <div key={k.label} style={{ padding: 16, borderRadius: 12, background: 'var(--c-13)', border: '1px solid var(--c-w6)', textAlign: 'center' }}>
            <div style={{ fontFamily: 'Syne, Inter', fontWeight: 800, fontSize: 28, color: k.col, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em' }}>
              {k.val}
            </div>
            <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--c-85)', marginTop: 2 }}>{k.label}</div>
            <div style={{ fontSize: 10, color: 'var(--c-50)', marginTop: 1 }}>{k.sub}</div>
          </div>
        ))}
      </div>
      {tdee.fattori.map((f, i) => (
        <div key={i} style={{
          marginTop: 10, padding: '10px 12px', borderRadius: 10,
          background: 'var(--c-13)', border: '1px solid var(--c-w4)',
          fontSize: 11.5, color: 'var(--c-85)', display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <FontAwesomeIcon icon={faChartColumn} style={{ fontSize: 11, color: 'oklch(0.70 0.14 200)' }} />
          <span><strong style={{ color: 'var(--c-95)' }}>{f.label}</strong> — {f.impact}</span>
        </div>
      ))}
    </div>
  )
}

// ── MacroTargetCard ───────────────────────────────────────────────────────────

function MacroTargetCard({ draft, setDraft }: { draft: DietaDraft; setDraft: (d: DietaDraft) => void }) {
  const set = (k: keyof DietaDraft['macro'], v: string) =>
    setDraft({ ...draft, macro: { ...draft.macro, [k]: v } })

  const calcolaKcal = () => {
    const p = parseInt(draft.macro.prot) || 0
    const c = parseInt(draft.macro.carb) || 0
    const g = parseInt(draft.macro.grassi) || 0
    set('kcal', String(p * 4 + c * 4 + g * 9))
  }

  return (
    <div style={{ padding: 18, borderRadius: 16, background: 'var(--c-13)', border: '1px solid var(--c-w8)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <FontAwesomeIcon icon={faBullseye} style={{ color: 'oklch(0.70 0.19 46)', fontSize: 13 }} />
        <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--c-95)', flex: 1 }}>Macro target</div>
        <button onClick={calcolaKcal} style={{
          padding: '6px 12px', borderRadius: 9, background: 'var(--c-18)', color: 'var(--c-75)',
          fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <FontAwesomeIcon icon={faWandMagicSparkles} style={{ fontSize: 10 }} />
          Ricalcola kcal
        </button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
        <NumField label="Calorie" unit="kcal" value={draft.macro.kcal} color="oklch(0.70 0.19 46)" onChange={v => set('kcal', v)} />
        <NumField label="Proteine" unit="g"   value={draft.macro.prot} color="oklch(0.65 0.14 200)" onChange={v => set('prot', v)} />
        <NumField label="Carboidrati" unit="g" value={draft.macro.carb} color="oklch(0.82 0.13 85)" onChange={v => set('carb', v)} />
        <NumField label="Grassi" unit="g"     value={draft.macro.grassi} color="oklch(0.68 0.18 150)" onChange={v => set('grassi', v)} />
      </div>
      <div style={{ marginTop: 12 }}>
        <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.1em', color: 'var(--c-55)', marginBottom: 6 }}>NOTE COACH</div>
        <textarea
          value={draft.macro.note}
          onChange={e => set('note', e.target.value)}
          placeholder="Es. Deficit moderato, refeed sabato, idratazione minima 3L…"
          style={{
            width: '100%', padding: '10px 12px', borderRadius: 10,
            background: 'var(--c-18)', border: '1px solid var(--c-w6)',
            color: 'var(--c-90)', fontSize: 12, fontFamily: 'inherit',
            outline: 'none', resize: 'vertical', minHeight: 52,
          }}
        />
      </div>
    </div>
  )
}

// ── PastiCard ─────────────────────────────────────────────────────────────────

function PastiCard({ draft, setDraft }: { draft: DietaDraft; setDraft: (d: DietaDraft) => void }) {
  const p = draft.pasti
  const kcalTot = parseInt(draft.macro.kcal) || 0

  const setCount = (n: number) => {
    const cur = p.split.length
    let split = [...p.split]
    if (n > cur) {
      for (let i = cur; i < n; i++)
        split.push({ nome: PASTO_NOMI[i] ?? `Pasto ${i + 1}`, pct: 0 })
    } else {
      split = split.slice(0, n)
    }
    const even = Math.floor(100 / n)
    split = split.map(s => ({ ...s, pct: even }))
    split[0].pct += 100 - even * n
    setDraft({ ...draft, pasti: { count: n, split } })
  }

  const setPct = (i: number, v: number) => {
    const split = [...p.split]
    split[i] = { ...split[i], pct: Math.max(0, Math.min(100, v)) }
    setDraft({ ...draft, pasti: { ...p, split } })
  }

  const totPct = p.split.reduce((a, b) => a + b.pct, 0)
  const ok = totPct === 100

  return (
    <div style={{ padding: 18, borderRadius: 16, background: 'var(--c-13)', border: '1px solid var(--c-w8)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <FontAwesomeIcon icon={faUtensils} style={{ color: 'oklch(0.70 0.19 46)', fontSize: 13 }} />
        <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--c-95)', flex: 1 }}>Ripartizione pasti</div>
        <div style={{ display: 'flex', gap: 3, padding: 3, borderRadius: 999, background: 'var(--c-18)', border: '1px solid var(--c-w6)' }}>
          {[3, 4, 5, 6].map(n => (
            <button key={n} onClick={() => setCount(n)} style={{
              width: 28, height: 24, borderRadius: 999,
              background: n === p.count ? 'oklch(0.70 0.19 46)' : 'transparent',
              color: n === p.count ? 'oklch(0.14 0.02 40)' : 'var(--c-70)',
              fontSize: 11, fontWeight: 800,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>{n}</button>
          ))}
        </div>
      </div>

      {/* Barra totale */}
      <div style={{
        padding: '8px 14px', borderRadius: 10, marginBottom: 10,
        background: ok ? 'oklch(0.65 0.18 150 / 10%)' : 'oklch(0.70 0.19 46 / 12%)',
        border: '1px solid ' + (ok ? 'oklch(0.65 0.18 150 / 28%)' : 'oklch(0.70 0.19 46 / 28%)'),
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        fontSize: 12, fontWeight: 700,
        color: ok ? 'oklch(0.72 0.18 150)' : 'oklch(0.75 0.19 46)',
      }}>
        <span>Totale allocazione</span>
        <span style={{ fontFamily: 'Syne, Inter', fontVariantNumeric: 'tabular-nums' }}>{totPct}%{!ok && ` (${totPct < 100 ? `mancano ${100 - totPct}%` : `eccedono ${totPct - 100}%`})`}</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {p.split.map((s, i) => (
          <div key={i} style={{
            padding: '10px 12px', borderRadius: 11,
            background: 'var(--c-15)', border: '1px solid var(--c-w6)',
            display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <span style={{ flex: 1, fontSize: 13, fontWeight: 700, color: 'var(--c-95)' }}>{s.nome}</span>
            <span style={{ fontSize: 10.5, color: 'var(--c-55)', fontVariantNumeric: 'tabular-nums', minWidth: 56, textAlign: 'right' }}>
              {Math.round(kcalTot * s.pct / 100)} kcal
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 6px', borderRadius: 8, background: 'var(--c-18)' }}>
              <button onClick={() => setPct(i, s.pct - 5)} style={{ width: 22, height: 22, borderRadius: 6, background: 'var(--c-22)', color: 'var(--c-70)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <FontAwesomeIcon icon={faMinus} style={{ fontSize: 9 }} />
              </button>
              <input
                value={s.pct}
                onChange={e => setPct(i, parseInt(e.target.value.replace(/\D/g, '')) || 0)}
                inputMode="numeric"
                style={{ width: 38, textAlign: 'center', background: 'transparent', border: 'none', outline: 'none', fontFamily: 'Syne, Inter', fontSize: 13, fontWeight: 800, color: 'oklch(0.70 0.19 46)', fontVariantNumeric: 'tabular-nums' }}
              />
              <span style={{ fontSize: 11, color: 'var(--c-55)', fontWeight: 700 }}>%</span>
              <button onClick={() => setPct(i, s.pct + 5)} style={{ width: 22, height: 22, borderRadius: 6, background: 'var(--c-22)', color: 'var(--c-70)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <FontAwesomeIcon icon={faPlus} style={{ fontSize: 9 }} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── CarbCyclingCard ───────────────────────────────────────────────────────────

function CarbCyclingCard({ draft, setDraft, profili, setProfili, ciclo, setCiclo }: {
  draft: DietaDraft; setDraft: (d: DietaDraft) => void
  profili: ProfiloMacro[]; setProfili: (p: ProfiloMacro[]) => void
  ciclo: string[]; setCiclo: (c: string[]) => void
}) {
  const enabled = draft.carb_cycling_abilitato
  const [expandedProfilo, setExpandedProfilo] = useState<string | null>(null)

  const addProfilo = () => {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
    const label = letters[profili.length % 26]
    const color = PROFILO_COLORS[profili.length % PROFILO_COLORS.length]
    const newP: ProfiloMacro = { id: crypto.randomUUID(), label, kcal: 2000, prot: 150, carb: 200, grassi: 70, color }
    setProfili([...profili, newP])
  }

  const updateProfilo = (id: string, k: keyof ProfiloMacro, v: string | number) =>
    setProfili(profili.map(p => p.id === id ? { ...p, [k]: v } : p))

  const removeProfilo = (id: string) => {
    setProfili(profili.filter(p => p.id !== id))
    setCiclo(ciclo.map(pid => pid === id ? (profili[0]?.id ?? '') : pid))
  }

  const shiftCiclo = (days: number) => {
    const newDate = shiftDay(draft.carb_cycling_start_date || todayISO(), days)
    setDraft({ ...draft, carb_cycling_start_date: newDate })
  }

  // compute "today" cycle index
  const today = todayISO()
  const startDate = draft.carb_cycling_start_date || today
  const daysDiff = Math.floor((new Date(today).getTime() - new Date(startDate).getTime()) / 86400000)
  const todayIdx = ((daysDiff % 7) + 7) % 7

  return (
    <div style={{
      padding: 18, borderRadius: 16,
      background: enabled ? 'oklch(0.65 0.14 200 / 5%)' : 'var(--c-13)',
      border: '1px solid ' + (enabled ? 'oklch(0.65 0.14 200 / 24%)' : 'var(--c-w8)'),
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: enabled ? 14 : 0 }}>
        <FontAwesomeIcon icon={faArrowsRotate} style={{ color: 'oklch(0.70 0.14 200)', fontSize: 13 }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--c-95)' }}>Carb cycling avanzato</div>
          <div style={{ fontSize: 10.5, color: 'var(--c-50)', marginTop: 1 }}>Ciclo settimanale con profili personalizzati</div>
        </div>
        <button onClick={() => setDraft({ ...draft, carb_cycling_abilitato: !enabled })} style={{
          width: 38, height: 22, borderRadius: 999,
          background: enabled ? 'oklch(0.65 0.18 150)' : 'var(--c-25)',
          position: 'relative', cursor: 'pointer', flexShrink: 0,
        }}>
          <div style={{ position: 'absolute', top: 2, left: enabled ? 18 : 2, width: 18, height: 18, borderRadius: '50%', background: '#fff', transition: 'left 160ms' }} />
        </button>
      </div>

      {enabled && (
        <>
          {/* Profili */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.1em', color: 'var(--c-55)', marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>PROFILI MACRO</span>
              <button onClick={addProfilo} style={{ padding: '4px 10px', borderRadius: 8, background: 'oklch(0.65 0.14 200 / 14%)', color: 'oklch(0.72 0.14 200)', fontSize: 10.5, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 5 }}>
                <FontAwesomeIcon icon={faPlus} style={{ fontSize: 9 }} />Aggiungi
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {profili.map(p => (
                <div key={p.id} style={{ borderRadius: 11, overflow: 'hidden', background: p.color.replace(')', ' / 8%)'), border: '1px solid ' + p.color.replace(')', ' / 32%)') }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', cursor: 'pointer' }}
                    onClick={() => setExpandedProfilo(expandedProfilo === p.id ? null : p.id)}>
                    <div style={{ width: 24, height: 24, borderRadius: '50%', background: p.color.replace(')', ' / 22%)'), color: p.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Syne, Inter', fontSize: 11, fontWeight: 800, flexShrink: 0 }}>
                      {p.label}
                    </div>
                    <span style={{ fontFamily: 'Syne, Inter', fontWeight: 800, fontSize: 14, color: p.color, fontVariantNumeric: 'tabular-nums' }}>{p.kcal} kcal</span>
                    <span style={{ fontSize: 10.5, color: 'var(--c-60)' }}>P {p.prot}g · C {p.carb}g · G {p.grassi}g</span>
                    <div style={{ flex: 1 }} />
                    <FontAwesomeIcon icon={expandedProfilo === p.id ? faChevronUp : faChevronDown} style={{ fontSize: 10, color: 'var(--c-55)' }} />
                  </div>
                  {expandedProfilo === p.id && (
                    <div style={{ padding: '0 12px 12px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                      {[
                        { k: 'kcal' as const, label: 'Kcal', col: p.color },
                        { k: 'prot' as const, label: 'Prot g', col: 'oklch(0.65 0.14 200)' },
                        { k: 'carb' as const, label: 'Carb g', col: 'oklch(0.82 0.13 85)' },
                        { k: 'grassi' as const, label: 'Grassi g', col: 'oklch(0.68 0.18 150)' },
                      ].map(f => (
                        <div key={f.k} style={{ padding: '8px 10px', borderRadius: 9, background: 'var(--c-13)', border: '1px solid var(--c-w6)' }}>
                          <div style={{ fontSize: 9.5, color: 'var(--c-55)', fontWeight: 800, letterSpacing: '0.06em', marginBottom: 4 }}>{f.label.toUpperCase()}</div>
                          <input value={p[f.k]} onChange={e => updateProfilo(p.id, f.k, parseInt(e.target.value.replace(/\D/g,'')) || 0)}
                            inputMode="numeric"
                            style={{ background: 'transparent', border: 'none', outline: 'none', fontFamily: 'Syne, Inter', fontWeight: 800, fontSize: 18, color: f.col, width: '100%', fontVariantNumeric: 'tabular-nums' }} />
                        </div>
                      ))}
                      <button onClick={() => removeProfilo(p.id)}
                        style={{ gridColumn: '4', padding: '6px 10px', borderRadius: 8, background: 'oklch(0.65 0.22 27 / 18%)', color: 'oklch(0.80 0.18 27)', fontSize: 11, fontWeight: 700, marginTop: 4 }}>
                        Rimuovi
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Ciclo 7 giorni */}
          <div>
            <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.1em', color: 'var(--c-55)', marginBottom: 8 }}>CICLO 7 GIORNI</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6 }}>
              {Array.from({ length: 7 }, (_, i) => {
                const pid = ciclo[i] ?? profili[0]?.id ?? ''
                const profile = profili.find(p => p.id === pid) ?? profili[0]
                const isToday = i === todayIdx
                return (
                  <div key={i} style={{ position: 'relative' }}>
                    <select
                      value={pid}
                      onChange={e => { const c = [...ciclo]; c[i] = e.target.value; setCiclo(c) }}
                      style={{
                        position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', zIndex: 1,
                        width: '100%', height: '100%',
                      }}>
                      {profili.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
                    </select>
                    <div style={{
                      padding: '10px 6px', borderRadius: 10, textAlign: 'center', pointerEvents: 'none',
                      background: profile ? profile.color.replace(')', ' / 14%)') : 'var(--c-15)',
                      border: '1px solid ' + (isToday ? (profile?.color ?? 'var(--c-w8)') : (profile?.color ?? 'var(--c-w8)').replace(')', ' / 30%)')),
                      boxShadow: isToday ? `0 0 0 2px ${(profile?.color ?? 'oklch(0.70 0.19 46)').replace(')', ' / 35%)')}` : 'none',
                    }}>
                      <div style={{ fontSize: 9.5, color: 'var(--c-55)', fontWeight: 800, letterSpacing: '0.08em' }}>
                        G{i + 1}{isToday && <span style={{ color: profile?.color ?? 'var(--c-accent)', marginLeft: 2 }}>•</span>}
                      </div>
                      <div style={{ marginTop: 4, fontFamily: 'Syne, Inter', fontWeight: 800, fontSize: 16, color: profile?.color ?? 'var(--c-70)' }}>
                        {profile?.label ?? '?'}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
            <div style={{ marginTop: 10, padding: '8px 12px', borderRadius: 9, background: 'var(--c-13)', border: '1px solid var(--c-w6)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 11, color: 'var(--c-70)' }}>
              <span>Inizio ciclo: <strong style={{ color: 'var(--c-95)' }}>{fmtISO(draft.carb_cycling_start_date || todayISO())}</strong></span>
              <div style={{ display: 'flex', gap: 4 }}>
                <button onClick={() => shiftCiclo(-1)} style={{ padding: '4px 9px', borderRadius: 7, background: 'var(--c-18)', color: 'var(--c-75)', fontSize: 10, fontWeight: 700 }}>← −1</button>
                <button onClick={() => shiftCiclo(1)}  style={{ padding: '4px 9px', borderRadius: 7, background: 'var(--c-18)', color: 'var(--c-75)', fontSize: 10, fontWeight: 700 }}>+1 →</button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// ── EditorTab ─────────────────────────────────────────────────────────────────

export default function NutEditorTab({ draft, setDraft, profili, setProfili, ciclo, setCiclo, tdee }: Props) {
  return (
    <div style={{ padding: '18px 22px 24px', display: 'flex', flexDirection: 'column', gap: 18, overflowY: 'auto', flex: 1 }}>
      <DataInizioCard draft={draft} setDraft={setDraft} />
      <TdeeStimaCard tdee={tdee} />
      <MacroTargetCard draft={draft} setDraft={setDraft} />
      <PastiCard draft={draft} setDraft={setDraft} />
      <CarbCyclingCard draft={draft} setDraft={setDraft} profili={profili} setProfili={setProfili} ciclo={ciclo} setCiclo={setCiclo} />
    </div>
  )
}
