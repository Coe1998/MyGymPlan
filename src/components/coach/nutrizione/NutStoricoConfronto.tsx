'use client'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCodeCompare, faFlagCheckered, faCheck } from '@fortawesome/free-solid-svg-icons'
import type { DietaVersione } from './types'

const fmtISO = (iso: string | null) => {
  if (!iso) return '—'
  const [y, m, d] = iso.split('-')
  const mesi = ['gen','feb','mar','apr','mag','giu','lug','ago','set','ott','nov','dic']
  return `${parseInt(d)} ${mesi[parseInt(m) - 1]} ${y.slice(2)}`
}

const durataStr = (da: string, a: string | null) => {
  if (!a) return 'in corso'
  const days = Math.round((new Date(a).getTime() - new Date(da).getTime()) / 86400000)
  return `${days} giorni`
}

const statusOf = (v: DietaVersione, today: string): 'active' | 'scheduled' | 'past' => {
  if (v.data_inizio > today) return 'scheduled'
  if (!v.data_fine || v.data_fine >= today) return 'active'
  return 'past'
}

function StatusPill({ s }: { s: 'active' | 'scheduled' | 'past' }) {
  const v = {
    active:    { bg: 'oklch(0.65 0.18 150 / 16%)', c: 'oklch(0.72 0.18 150)', lbl: 'ATTIVA' },
    scheduled: { bg: 'oklch(0.82 0.13 85 / 16%)',  c: 'oklch(0.85 0.13 85)',  lbl: 'PROGRAMMATA' },
    past:      { bg: 'var(--c-w6)',                 c: 'var(--c-60)',          lbl: 'CONCLUSA' },
  }[s]
  return (
    <span style={{ padding: '3px 9px', borderRadius: 999, background: v.bg, color: v.c, fontSize: 9, fontWeight: 800, letterSpacing: '0.12em' }}>
      {v.lbl}
    </span>
  )
}

// ── Storico ───────────────────────────────────────────────────────────────────

export function NutStoricoTab({ versions, compareIds, onToggleCompare }: {
  versions: DietaVersione[]
  compareIds: string[]
  onToggleCompare: (id: string) => void
}) {
  const today = new Date().toISOString().split('T')[0]
  if (versions.length === 0) return (
    <div style={{ padding: 40, textAlign: 'center', color: 'var(--c-50)' }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--c-70)' }}>Nessuna versione salvata</div>
      <div style={{ fontSize: 11.5, marginTop: 6 }}>Salva la prima dieta dall'editor per iniziare lo storico.</div>
    </div>
  )
  return (
    <div style={{ padding: '18px 22px 24px', overflowY: 'auto', flex: 1 }}>
      <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '0.1em', color: 'var(--c-55)', marginBottom: 12 }}>
        TIMELINE DIETE · {versions.length} VERSIONI
      </div>
      <div style={{ position: 'relative', paddingLeft: 20 }}>
        <div style={{ position: 'absolute', left: 7, top: 6, bottom: 6, width: 2, background: 'linear-gradient(180deg, var(--c-w10), transparent)' }} />
        {versions.map(v => {
          const status = statusOf(v, today)
          const selected = compareIds.includes(v.id)
          return (
            <div key={v.id} style={{ position: 'relative', marginBottom: 14 }}>
              <div style={{
                position: 'absolute', left: -18, top: 18,
                width: 14, height: 14, borderRadius: '50%',
                background: status === 'active' ? 'oklch(0.65 0.18 150)' : status === 'scheduled' ? 'oklch(0.82 0.13 85)' : 'var(--c-30)',
                border: '3px solid var(--c-10)',
                boxShadow: status === 'active' ? '0 0 0 3px oklch(0.65 0.18 150 / 20%)' : 'none',
              }} />
              <div style={{
                padding: 16, borderRadius: 14,
                background: selected ? 'oklch(0.65 0.14 200 / 8%)' : 'var(--c-13)',
                border: '1px solid ' + (selected ? 'oklch(0.65 0.14 200 / 30%)' : 'var(--c-w8)'),
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--c-97)' }}>
                        {fmtISO(v.data_inizio)}
                      </span>
                      <StatusPill s={status} />
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--c-55)', marginTop: 3 }}>
                      {fmtISO(v.data_inizio)} → {v.data_fine ? fmtISO(v.data_fine) : 'in corso'}
                      <span style={{ margin: '0 6px' }}>·</span>
                      {durataStr(v.data_inizio, v.data_fine)}
                    </div>
                    <div style={{ marginTop: 10, display: 'flex', gap: 14, fontSize: 11, color: 'var(--c-75)' }}>
                      <span><strong style={{ color: 'oklch(0.70 0.19 46)', fontFamily: 'Syne, Inter', fontVariantNumeric: 'tabular-nums' }}>{v.calorie ?? '—'}</strong> kcal</span>
                      <span><strong style={{ color: 'oklch(0.65 0.14 200)', fontFamily: 'Syne, Inter' }}>{v.proteine_g ?? '—'}g</strong> P</span>
                      <span><strong style={{ color: 'oklch(0.82 0.13 85)', fontFamily: 'Syne, Inter' }}>{v.carboidrati_g ?? '—'}g</strong> C</span>
                      <span><strong style={{ color: 'oklch(0.68 0.18 150)', fontFamily: 'Syne, Inter' }}>{v.grassi_g ?? '—'}g</strong> G</span>
                    </div>
                    {(v.delta_peso_kg !== null || v.outcome_note) && (
                      <div style={{
                        marginTop: 10, padding: '8px 11px', borderRadius: 9,
                        background: 'var(--c-15)', fontSize: 11, color: 'var(--c-80)',
                        display: 'flex', alignItems: 'center', gap: 8,
                      }}>
                        <FontAwesomeIcon icon={faFlagCheckered} style={{ fontSize: 10, color: v.delta_peso_kg !== null && v.delta_peso_kg < 0 ? 'oklch(0.70 0.18 150)' : 'oklch(0.75 0.19 46)' }} />
                        <span>
                          {v.delta_peso_kg !== null && <strong>{v.delta_peso_kg > 0 ? '+' : ''}{v.delta_peso_kg} kg</strong>}
                          {v.delta_peso_kg !== null && v.outcome_note && ' · '}
                          {v.outcome_note}
                        </span>
                      </div>
                    )}
                  </div>
                  <button onClick={() => onToggleCompare(v.id)} style={{
                    padding: '7px 10px', borderRadius: 9,
                    background: selected ? 'oklch(0.65 0.14 200)' : 'var(--c-18)',
                    color: selected ? 'oklch(0.14 0.02 40)' : 'var(--c-75)',
                    fontSize: 10.5, fontWeight: 800, letterSpacing: '0.06em',
                    display: 'flex', alignItems: 'center', gap: 5,
                    flexShrink: 0,
                  }}>
                    <FontAwesomeIcon icon={selected ? faCheck : faCodeCompare} style={{ fontSize: 10 }} />
                    {selected ? 'SEL.' : 'CONFR.'}
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Confronto ─────────────────────────────────────────────────────────────────

export function NutConfrontoTab({ versions, ids }: { versions: DietaVersione[]; ids: string[] }) {
  if (ids.length !== 2) return (
    <div style={{ padding: 40, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--c-55)', textAlign: 'center' }}>
      <FontAwesomeIcon icon={faCodeCompare} style={{ fontSize: 32, marginBottom: 14, color: 'var(--c-30)' }} />
      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--c-80)' }}>Seleziona 2 versioni dalla timeline</div>
      <div style={{ fontSize: 11.5, marginTop: 6 }}>
        Hai selezionato <strong style={{ color: 'oklch(0.72 0.14 200)' }}>{ids.length}/2</strong> versioni
      </div>
    </div>
  )

  const a = versions.find(v => v.id === ids[0])!
  const b = versions.find(v => v.id === ids[1])!

  const macros: { k: keyof DietaVersione; label: string; unit: string; col: string }[] = [
    { k: 'calorie',      label: 'Calorie',     unit: 'kcal', col: 'oklch(0.70 0.19 46)' },
    { k: 'proteine_g',   label: 'Proteine',    unit: 'g',    col: 'oklch(0.65 0.14 200)' },
    { k: 'carboidrati_g',label: 'Carboidrati', unit: 'g',    col: 'oklch(0.82 0.13 85)' },
    { k: 'grassi_g',     label: 'Grassi',      unit: 'g',    col: 'oklch(0.68 0.18 150)' },
  ]

  return (
    <div style={{ padding: '18px 22px 24px', overflowY: 'auto', flex: 1 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 12, alignItems: 'center', marginBottom: 18 }}>
        {[{ v: a, side: 'A', col: 'oklch(0.65 0.14 200)' }, { v: b, side: 'B', col: 'oklch(0.70 0.19 46)' }].map(({ v, side, col }, si) => (
          <div key={side} style={{ padding: 14, borderRadius: 13, background: 'var(--c-13)', border: '1px solid var(--c-w8)', position: 'relative' }}>
            <div style={{ position: 'absolute', top: -8, left: 14, padding: '2px 10px', borderRadius: 999, background: col, color: 'oklch(0.14 0.02 40)', fontSize: 10, fontWeight: 800, letterSpacing: '0.12em' }}>
              VERSIONE {side}
            </div>
            <div style={{ marginTop: 6, fontSize: 13, fontWeight: 800, color: 'var(--c-97)' }}>{fmtISO(v.data_inizio)}</div>
            <div style={{ fontSize: 10.5, color: 'var(--c-55)', marginTop: 2 }}>
              {fmtISO(v.data_inizio)} · {durataStr(v.data_inizio, v.data_fine)}
            </div>
          </div>
        )).reduce<React.ReactNode[]>((acc, el, i) => i === 0 ? [el] : [...acc, <FontAwesomeIcon key="sep" icon={faCodeCompare} style={{ color: 'var(--c-55)', fontSize: 14 }} />, el], [])}
      </div>

      <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '0.1em', color: 'var(--c-55)', marginBottom: 8 }}>DELTA MACRO (B − A)</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 14 }}>
        {macros.map(m => {
          const va = (a[m.k] as number | null) ?? 0
          const vb = (b[m.k] as number | null) ?? 0
          const d = vb - va
          return (
            <div key={m.k} style={{ padding: 14, borderRadius: 12, background: 'var(--c-13)', border: '1px solid var(--c-w6)' }}>
              <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.08em', color: 'var(--c-55)' }}>{m.label.toUpperCase()}</div>
              <div style={{ marginTop: 8, display: 'flex', alignItems: 'baseline', gap: 6 }}>
                <span style={{ fontFamily: 'Syne, Inter', fontWeight: 800, fontSize: 22, letterSpacing: '-0.02em', color: d === 0 ? 'var(--c-60)' : d > 0 ? 'oklch(0.70 0.18 150)' : 'oklch(0.75 0.19 46)' }}>
                  {d > 0 ? '+' : ''}{d}
                </span>
                <span style={{ fontSize: 10.5, color: 'var(--c-55)' }}>{m.unit}</span>
              </div>
              <div style={{ marginTop: 6, display: 'flex', justifyContent: 'space-between', fontSize: 10.5, color: 'var(--c-60)', fontVariantNumeric: 'tabular-nums' }}>
                <span>A <strong style={{ color: 'var(--c-85)' }}>{va}</strong></span>
                <span>B <strong style={{ color: 'var(--c-85)' }}>{vb}</strong></span>
              </div>
            </div>
          )
        })}
      </div>

      {(a.delta_peso_kg !== null || b.delta_peso_kg !== null) && (
        <div style={{ padding: 14, borderRadius: 12, background: 'oklch(0.65 0.14 200 / 8%)', border: '1px solid oklch(0.65 0.14 200 / 26%)' }}>
          <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '0.1em', color: 'oklch(0.72 0.14 200)', marginBottom: 8 }}>ESITO NEL PERIODO</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
            {[{ lbl: 'Variaz. peso A', v: a }, { lbl: 'Variaz. peso B', v: b }].map(({ lbl, v }) => (
              <div key={lbl} style={{ padding: 12, borderRadius: 10, background: 'var(--c-13)', border: '1px solid var(--c-w6)' }}>
                <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--c-55)', letterSpacing: '0.08em' }}>{lbl.toUpperCase()}</div>
                <div style={{ marginTop: 4, fontFamily: 'Syne, Inter', fontWeight: 800, fontSize: 20, color: 'var(--c-97)', letterSpacing: '-0.02em' }}>
                  {v.delta_peso_kg !== null ? `${v.delta_peso_kg > 0 ? '+' : ''}${v.delta_peso_kg} kg` : '—'}
                </div>
                <div style={{ fontSize: 10, color: 'var(--c-50)', marginTop: 2 }}>{durataStr(v.data_inizio, v.data_fine)}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
