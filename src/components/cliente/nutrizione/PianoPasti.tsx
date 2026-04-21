'use client'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faClockRotateLeft } from '@fortawesome/free-solid-svg-icons'
import BynariLoader from '@/components/shared/BynariLoader'

interface PastoConfig {
  nome: string; percentuale: number
  macro_custom?: boolean; prot_pct?: number; carb_pct?: number; grassi_pct?: number
}

interface PastoLog {
  id: string; alimento_nome: string; quantita_g: number
  calorie: number; proteine_g: number; carboidrati_g: number; grassi_g: number
  gruppo_nome: string | null; gruppo_id: string | null; created_at: string; data: string
}

interface Props {
  pastiConfig: PastoConfig[]
  pasti: PastoLog[]
  calorieEffettive: number
  targetP: number; targetC: number; targetG: number
  pastiSaltati: Set<number>
  onToggleSalta: (idx: number) => void
  redistribuisciSu: number | null
  onSetRedistr: (n: number | null) => void
  copiaPastoAperto: string | null
  onApriStorico: (nome: string) => void
  storicoPerPasto: PastoLog[]
  loadingStorico: boolean
  onCopiaPasto: (items: PastoLog[]) => void
  copiando: boolean
  totaleKcal: number; totaleP: number; totaleC: number; totaleG: number
}

function formatDataStorico(d: string) {
  return new Date(d + 'T12:00:00').toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' })
}

export default function PianoPasti({
  pastiConfig, pasti, calorieEffettive,
  targetP, targetC, targetG,
  pastiSaltati, onToggleSalta,
  redistribuisciSu, onSetRedistr,
  copiaPastoAperto, onApriStorico,
  storicoPerPasto, loadingStorico, onCopiaPasto, copiando,
  totaleKcal, totaleP, totaleC, totaleG,
}: Props) {
  const pastiAttivi = pastiConfig
    .map((p, i) => ({ ...p, idx: i }))
    .filter(p => !pastiSaltati.has(p.idx))

  const percTotaleAttiva = pastiAttivi.reduce((a, p) => a + p.percentuale, 0)

  const getPastoMacro = (idx: number) => {
    if (pastiSaltati.has(idx)) return null
    const p = pastiConfig[idx]
    const percEff = percTotaleAttiva > 0 ? (p.percentuale / percTotaleAttiva) * 100 : 0
    const kcal = calorieEffettive * percEff / 100
    if (p.macro_custom && (p.prot_pct != null || p.carb_pct != null || p.grassi_pct != null)) {
      return {
        kcal: Math.round(kcal),
        prot: Math.round((kcal * (p.prot_pct ?? 0) / 100) / 4),
        carb: Math.round((kcal * (p.carb_pct ?? 0) / 100) / 4),
        grassi: Math.round((kcal * (p.grassi_pct ?? 0) / 100) / 9),
      }
    }
    return {
      kcal: Math.round(kcal),
      prot: Math.round(targetP * percEff / 100),
      carb: Math.round(targetC * percEff / 100),
      grassi: Math.round(targetG * percEff / 100),
    }
  }

  const getLoggato = (nome: string) => {
    return pasti.filter(p => p.gruppo_nome === nome).reduce(
      (a, p) => ({ kcal: a.kcal + (p.calorie || 0), prot: a.prot + (p.proteine_g || 0), carb: a.carb + (p.carboidrati_g || 0), grassi: a.grassi + (p.grassi_g || 0) }),
      { kcal: 0, prot: 0, carb: 0, grassi: 0 }
    )
  }

  const rimanente = {
    kcal:   Math.max(0, calorieEffettive - totaleKcal),
    prot:   Math.max(0, targetP - totaleP),
    carb:   Math.max(0, targetC - totaleC),
    grassi: Math.max(0, targetG - totaleG),
  }

  return (
    <div style={{ borderRadius: 20, background: 'var(--c-16)', border: '1px solid var(--c-w6)', overflow: 'hidden' }}>
      {/* Header */}
      <div className="flex items-center justify-between" style={{ padding: '13px 16px', borderBottom: '1px solid var(--c-w6)' }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.1em', color: 'var(--c-60)' }}>PIANO DI OGGI</div>
          <div style={{ fontSize: 11.5, color: 'var(--c-45)', marginTop: 2 }}>
            {pastiSaltati.size > 0
              ? `${pastiSaltati.size} ${pastiSaltati.size === 1 ? 'pasto saltato' : 'pasti saltati'} — redistribuiti`
              : `${pastiConfig.length} pasti · tocca per saltare`}
          </div>
        </div>
        <div style={{ padding: '4px 8px', borderRadius: 6, background: 'var(--c-22)', fontSize: 10, fontWeight: 700, color: 'var(--c-60)' }}>
          {pastiAttivi.length}/{pastiConfig.length}
        </div>
      </div>

      {/* Pasti */}
      {pastiConfig.map((pasto, i) => {
        const saltato = pastiSaltati.has(i)
        const macro = getPastoMacro(i)
        const log = getLoggato(pasto.nome)
        const done = !saltato && macro != null && log.kcal >= macro.kcal * 0.8
        const pct = !saltato && macro ? Math.min(100, Math.round(log.kcal / macro.kcal * 100)) : 0

        return (
          <div key={i} style={{
            padding: '13px 16px',
            borderBottom: i < pastiConfig.length - 1 ? '1px solid var(--c-w4)' : 'none',
            opacity: saltato ? 0.42 : 1,
            transition: 'opacity 200ms',
          }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                {/* Status dot */}
                <div style={{
                  width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                  background: done ? 'oklch(0.65 0.18 150)' : saltato ? 'var(--c-40)' : 'var(--c-30)',
                  boxShadow: done ? '0 0 8px oklch(0.65 0.18 150 / 60%)' : 'none',
                }} />
                <div style={{ fontSize: 14, fontWeight: 700, color: saltato ? 'var(--c-45)' : 'var(--c-97)' }}>
                  {pasto.nome}
                </div>
                {done && (
                  <span style={{
                    fontSize: 9, fontWeight: 800, letterSpacing: '0.06em',
                    color: 'oklch(0.65 0.18 150)', padding: '2px 6px', borderRadius: 4,
                    background: 'oklch(0.65 0.18 150 / 14%)',
                  }}>OK</span>
                )}
              </div>

              <div className="flex items-center gap-2">
                {!saltato && (
                  <button onClick={() => onApriStorico(pasto.nome)}
                    className="flex items-center justify-center"
                    style={{
                      width: 28, height: 28, borderRadius: 8,
                      background: copiaPastoAperto === pasto.nome ? 'oklch(0.60 0.15 200 / 20%)' : 'var(--c-w4)',
                      color: copiaPastoAperto === pasto.nome ? 'oklch(0.60 0.15 200)' : 'var(--c-55)',
                    }}>
                    <FontAwesomeIcon icon={faClockRotateLeft} style={{ fontSize: 10 }} />
                  </button>
                )}
                <button onClick={() => onToggleSalta(i)} style={{
                  fontSize: 10.5, fontWeight: 700, padding: '5px 10px', borderRadius: 7,
                  background: saltato ? 'oklch(0.70 0.19 46 / 14%)' : 'oklch(0.65 0.22 27 / 12%)',
                  color: saltato ? 'oklch(0.70 0.19 46)' : 'oklch(0.75 0.18 27)',
                }}>{saltato ? 'Ripristina' : 'Salta'}</button>
              </div>
            </div>

            {!saltato && macro && (
              <>
                <div className="flex gap-3" style={{ marginTop: 10, fontSize: 10.5, fontVariantNumeric: 'tabular-nums' }}>
                  {[
                    { label: 'kcal', val: Math.round(log.kcal), target: macro.kcal, color: 'oklch(0.70 0.19 46)' },
                    { label: 'p',    val: Math.round(log.prot),  target: macro.prot, color: 'oklch(0.62 0.14 200)' },
                    { label: 'c',    val: Math.round(log.carb),  target: macro.carb, color: 'oklch(0.78 0.16 85)' },
                    { label: 'g',    val: Math.round(log.grassi),target: macro.grassi,color:'oklch(0.65 0.18 150)'},
                  ].map(m => (
                    <div key={m.label} style={{ flex: 1, minWidth: 0 }}>
                      <div className="flex items-baseline gap-0.5">
                        <span style={{ fontWeight: 700, color: log.kcal >= macro.kcal * 0.8 ? m.color : 'var(--c-85)' }}>{m.val}</span>
                        <span style={{ color: 'var(--c-40)', fontSize: 9.5 }}>/{m.target}</span>
                      </div>
                      <div style={{ fontSize: 8.5, fontWeight: 700, letterSpacing: '0.08em', color: 'var(--c-45)', textTransform: 'uppercase', marginTop: 1 }}>
                        {m.label}
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ height: 3, borderRadius: 999, background: 'var(--c-22)', marginTop: 9, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', width: `${pct}%`,
                    background: done ? 'oklch(0.65 0.18 150)' : 'oklch(0.70 0.19 46)',
                    borderRadius: 999, transition: 'width 500ms',
                  }} />
                </div>
              </>
            )}

            {/* Storico pasto inline */}
            {!saltato && copiaPastoAperto === pasto.nome && (
              <div className="rounded-xl overflow-hidden mt-3"
                style={{ border: '1px solid oklch(0.60 0.15 200 / 20%)', background: 'var(--c-16)' }}>
                <p className="text-xs font-semibold px-3 py-2"
                  style={{ color: 'oklch(0.60 0.15 200)', borderBottom: '1px solid var(--c-w5)' }}>
                  Copia {pasto.nome} da…
                </p>
                {loadingStorico ? (
                  <BynariLoader file="blue" size={60} />
                ) : (() => {
                  const perGiorno = new Map<string, PastoLog[]>()
                  for (const item of storicoPerPasto) {
                    if (!perGiorno.has(item.data)) perGiorno.set(item.data, [])
                    perGiorno.get(item.data)!.push(item)
                  }
                  const giorni = Array.from(perGiorno.entries()).slice(0, 7)
                  if (giorni.length === 0) return (
                    <p className="text-xs text-center py-4" style={{ color: 'var(--c-45)' }}>
                      Nessuno storico per questo pasto
                    </p>
                  )
                  return giorni.map(([d, items]) => {
                    const kcal = Math.round(items.reduce((a, x) => a + (x.calorie || 0), 0))
                    const preview = items.slice(0, 3).map(x => x.alimento_nome).join(', ')
                    return (
                      <button key={d} onClick={() => onCopiaPasto(items)} disabled={copiando}
                        className="w-full text-left px-3 py-2.5 flex items-center justify-between gap-2 hover:opacity-80 transition-all"
                        style={{ borderBottom: '1px solid var(--c-w4)' }}>
                        <div className="min-w-0">
                          <p className="text-xs font-bold" style={{ color: 'var(--c-85)' }}>{formatDataStorico(d)}</p>
                          <p className="text-xs truncate mt-0.5" style={{ color: 'var(--c-42)' }}>
                            {preview}{items.length > 3 ? ` +${items.length - 3}` : ''}
                          </p>
                        </div>
                        <span className="text-xs font-bold flex-shrink-0" style={{ color: 'oklch(0.60 0.15 200)' }}>
                          {kcal} kcal →
                        </span>
                      </button>
                    )
                  })
                })()}
              </div>
            )}
          </div>
        )
      })}

      {/* Redistribuisci rimanente */}
      {rimanente.kcal > 50 && pastiAttivi.length > 0 && (
        <div style={{
          padding: '12px 16px 14px',
          background: 'linear-gradient(180deg, transparent, oklch(0.75 0.18 80 / 5%))',
          borderTop: '1px solid var(--c-w6)',
        }}>
          <div className="flex items-center justify-between">
            <div>
              <div style={{ fontSize: 11, fontWeight: 800, color: 'oklch(0.78 0.16 85)', letterSpacing: '0.02em' }}>
                Rimanente: {Math.round(rimanente.kcal)} kcal
              </div>
              <div style={{ fontSize: 10.5, color: 'var(--c-45)', marginTop: 2 }}>Distribuisci su…</div>
            </div>
            <div className="flex gap-1">
              {[1, 2, 3].filter(n => n <= pastiAttivi.length).map(n => (
                <button key={n} onClick={() => onSetRedistr(redistribuisciSu === n ? null : n)}
                  className="flex items-center justify-center"
                  style={{
                    width: 30, height: 30, borderRadius: 9,
                    fontSize: 12, fontWeight: 800,
                    background: redistribuisciSu === n ? 'oklch(0.78 0.16 85)' : 'var(--c-22)',
                    color: redistribuisciSu === n ? 'oklch(0.14 0.02 80)' : 'var(--c-60)',
                  }}>{n}</button>
              ))}
            </div>
          </div>

          {redistribuisciSu !== null && (
            <div style={{ marginTop: 10, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
              {[
                { l: 'kcal', v: Math.round(rimanente.kcal / redistribuisciSu), c: 'oklch(0.70 0.19 46)' },
                { l: 'p',    v: Math.round(rimanente.prot / redistribuisciSu),  c: 'oklch(0.62 0.14 200)' },
                { l: 'c',    v: Math.round(rimanente.carb / redistribuisciSu),  c: 'oklch(0.78 0.16 85)' },
                { l: 'g',    v: Math.round(rimanente.grassi / redistribuisciSu),c: 'oklch(0.65 0.18 150)' },
              ].map(m => (
                <div key={m.l} style={{
                  padding: '7px 4px', borderRadius: 9,
                  background: 'var(--c-20)', border: '1px solid oklch(0.78 0.16 85 / 18%)', textAlign: 'center',
                }}>
                  <div style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 13, color: m.c, fontVariantNumeric: 'tabular-nums' }}>
                    {m.v}
                  </div>
                  <div style={{ fontSize: 8.5, color: 'var(--c-45)', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 2 }}>
                    {m.l}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
