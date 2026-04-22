export default function KPI({ k, v, color }: { k: string; v: string; color?: string }) {
  return (
    <div style={{ textAlign: 'center', minWidth: 0 }}>
      <div style={{ fontSize: 8.5, fontWeight: 800, letterSpacing: '0.1em', color: 'var(--c-50)', marginBottom: 2 }}>
        {k}
      </div>
      <div style={{
        fontFamily: 'Syne, Inter, sans-serif', fontWeight: 800, fontSize: 12.5,
        color: color ?? 'var(--c-97)',
        fontVariantNumeric: 'tabular-nums',
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>
        {v}
      </div>
    </div>
  )
}
