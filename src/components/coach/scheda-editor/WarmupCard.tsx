export default function WarmupCard({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div style={{
      padding: '12px 14px', borderRadius: 14, marginBottom: 4,
      background: 'oklch(0.65 0.18 150 / 8%)',
      border: '1px solid oklch(0.65 0.18 150 / 24%)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 7 }}>
        <i className="fa-solid fa-fire-flame-curved" style={{ fontSize: 11, color: 'oklch(0.72 0.18 150)' }} />
        <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.12em', color: 'oklch(0.72 0.18 150)' }}>
          WARMUP GENERALE
        </span>
      </div>
      <input
        value={value} onChange={e => onChange(e.target.value)}
        placeholder="es. 5 min cyclette · mobilità spalle · 10 hip circles…"
        style={{
          width: '100%', background: 'transparent', border: 'none', outline: 'none',
          fontSize: 13, color: 'var(--c-85)', fontFamily: 'inherit',
        }}
      />
    </div>
  )
}
