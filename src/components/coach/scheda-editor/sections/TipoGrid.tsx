import { SCHEDA_TIPI } from '@/lib/scheda-constants'

export default function TipoGrid({ value, onChange, cols = 4 }: {
  value: string; onChange: (v: string) => void; cols?: 3 | 4
}) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 5 }}>
      {SCHEDA_TIPI.map(t => {
        const active = t.id === value
        return (
          <button key={t.id} onClick={() => onChange(t.id)} style={{
            padding: '8px 6px', borderRadius: 9, textAlign: 'center',
            background: active ? t.bg : 'var(--c-18)',
            border: active ? `1px solid ${t.color.replace(')', ' / 45%)')}` : '1px solid var(--c-w4)',
            color: active ? t.color : 'var(--c-70)',
            fontSize: 10.5, fontWeight: 700,
            transition: 'all 120ms',
          }}>
            {t.label}
          </button>
        )
      })}
    </div>
  )
}
