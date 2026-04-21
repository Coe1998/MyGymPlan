'use client'

interface Props {
  totaleKcal: number
  calorieEffettive: number
  totaleP: number; targetP: number
  totaleC: number; targetC: number; carbCycling?: boolean
  totaleG: number; targetG: number
  dayType?: 'training' | 'rest' | null
}

export default function MacroSummary({ totaleKcal, calorieEffettive, totaleP, targetP, totaleC, targetC, carbCycling, totaleG, targetG, dayType }: Props) {
  const pct = Math.min(100, Math.round(totaleKcal / calorieEffettive * 100))
  const size = 82, stroke = 7
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const offset = circ * (1 - pct / 100)

  return (
    <div style={{
      padding: 16, borderRadius: 20,
      background: 'var(--c-16)', border: '1px solid var(--c-w6)',
      display: 'flex', flexDirection: 'column', gap: 14,
    }}>
      {/* Kcal row */}
      <div className="flex items-center gap-4">
        <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
          <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
            <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--c-22)" strokeWidth={stroke} />
            <circle cx={size/2} cy={size/2} r={r} fill="none"
              stroke="oklch(0.70 0.19 46)" strokeWidth={stroke}
              strokeDasharray={circ} strokeDashoffset={offset}
              strokeLinecap="round"
              style={{ transition: 'stroke-dashoffset 700ms ease' }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 17, lineHeight: 1, color: 'var(--c-97)' }}>
              {Math.round(totaleKcal)}
            </div>
            <div style={{ fontSize: 8.5, color: 'var(--c-50)', marginTop: 2, fontWeight: 600, letterSpacing: '0.04em' }}>
              / {calorieEffettive}
            </div>
          </div>
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="flex items-baseline gap-2">
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: 'var(--c-55)' }}>CALORIE</div>
            <div style={{ fontSize: 10, fontWeight: 600, color: 'oklch(0.70 0.19 46)', marginLeft: 'auto' }}>{pct}%</div>
          </div>
          <div style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 24, color: 'var(--c-97)', lineHeight: 1.1, marginTop: 4, letterSpacing: '-0.02em' }}>
            {Math.max(0, calorieEffettive - Math.round(totaleKcal))}
            <span style={{ fontSize: 12, color: 'var(--c-50)', fontWeight: 600, marginLeft: 4 }}>kcal residue</span>
          </div>
          {carbCycling && dayType && (
            <div style={{ fontSize: 10.5, color: 'var(--c-45)', marginTop: 2 }}>
              {dayType === 'training' ? '🔥 High carb · giorno allenamento' : '💧 Low carb · giorno riposo'}
            </div>
          )}
        </div>
      </div>

      <div style={{ height: 1, background: 'var(--c-w6)' }} />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
        <MacroBar label="Proteine"    val={Math.round(totaleP)} target={targetP} color="oklch(0.62 0.14 200)" />
        <MacroBar label="Carboidrati" val={Math.round(totaleC)} target={targetC} color="oklch(0.78 0.16 85)"  badge={carbCycling && dayType === 'training' ? 'HIGH' : carbCycling && dayType === 'rest' ? 'LOW' : undefined} />
        <MacroBar label="Grassi"      val={Math.round(totaleG)} target={targetG} color="oklch(0.65 0.18 150)" />
      </div>
    </div>
  )
}

function MacroBar({ label, val, target, color, badge }: { label: string; val: number; target: number; color: string; badge?: string }) {
  const pct = Math.min(100, target > 0 ? Math.round(val / target * 100) : 0)
  return (
    <div>
      <div className="flex justify-between items-baseline" style={{ marginBottom: 5 }}>
        <div className="flex items-center gap-2">
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--c-70)' }}>{label}</div>
          {badge && (
            <span style={{
              fontSize: 7.5, fontWeight: 800, letterSpacing: '0.08em',
              color: 'oklch(0.70 0.19 46)', padding: '1px 4px',
              borderRadius: 3, background: 'oklch(0.70 0.19 46 / 14%)',
            }}>{badge}</span>
          )}
        </div>
        <div style={{ fontFamily: 'Syne', fontSize: 12, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
          <span style={{ color: 'var(--c-97)' }}>{val}</span>
          <span style={{ color: 'var(--c-45)', fontWeight: 500 }}>/{target}g</span>
        </div>
      </div>
      <div style={{ height: 5, borderRadius: 999, background: 'var(--c-22)', overflow: 'hidden', position: 'relative' }}>
        <div style={{
          position: 'absolute', left: 0, top: 0, bottom: 0,
          width: `${pct}%`, background: color, borderRadius: 999,
          boxShadow: `0 0 8px ${color} / 50%`,
          transition: 'width 600ms ease',
        }} />
      </div>
    </div>
  )
}
