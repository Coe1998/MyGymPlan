import { SCHEDA_PROGRESS } from '@/lib/scheda-constants'

export default function ProgressGrid({ value, onChange, cols = 4 }: {
  value: string; onChange: (v: string) => void; cols?: 2 | 4
}) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 6 }}>
      {SCHEDA_PROGRESS.map(p => {
        const active = p.id === value
        return (
          <button key={p.id} onClick={() => onChange(p.id)} style={{
            padding: '9px 6px', borderRadius: 9, textAlign: 'center',
            background: active ? p.color.replace(')', ' / 14%)') : 'var(--c-18)',
            border: active ? `1px solid ${p.color.replace(')', ' / 42%)')}` : '1px solid var(--c-w4)',
            color: active ? p.color : 'var(--c-70)',
          }}>
            <div style={{ fontSize: 11, fontWeight: 800 }}>{p.label}</div>
            <div style={{ fontSize: 9, marginTop: 2, color: active ? p.color.replace(')', ' / 80%)') : 'var(--c-45)' }}>{p.hint}</div>
          </button>
        )
      })}
    </div>
  )
}
