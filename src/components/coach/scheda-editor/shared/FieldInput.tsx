'use client'

export function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: 9.5, fontWeight: 800, letterSpacing: '0.1em',
      color: 'var(--c-55)', marginBottom: 4,
    }}>{children}</div>
  )
}

export default function FieldInput({ label, value, onChange, num, area, placeholder, suffix }: {
  label?: string; value: string; onChange: (v: string) => void
  num?: boolean; area?: boolean; placeholder?: string; suffix?: string
}) {
  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '8px 10px',
    paddingRight: suffix ? 28 : 10,
    borderRadius: 8,
    background: 'var(--c-18)', border: '1px solid var(--c-w6)',
    color: 'var(--c-97)', fontSize: 13, fontFamily: 'inherit',
    outline: 'none', fontWeight: 600,
    fontVariantNumeric: 'tabular-nums',
  }
  return (
    <div>
      {label && <FieldLabel>{label.toUpperCase()}</FieldLabel>}
      <div style={{ position: 'relative' }}>
        {area ? (
          <textarea
            value={value} onChange={e => onChange(e.target.value)}
            placeholder={placeholder}
            style={{ ...inputStyle, fontSize: 12, resize: 'vertical', minHeight: 50 }}
          />
        ) : (
          <input
            value={value} onChange={e => onChange(e.target.value)}
            placeholder={placeholder}
            inputMode={num ? 'numeric' : undefined}
            style={inputStyle}
          />
        )}
        {suffix && (
          <span style={{
            position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
            fontSize: 11, color: 'var(--c-50)', fontWeight: 600, pointerEvents: 'none',
          }}>{suffix}</span>
        )}
      </div>
    </div>
  )
}
