export default function FilterChip({ label, active, onClick }: {
  label: string; active: boolean; onClick: () => void
}) {
  return (
    <button onClick={onClick} style={{
      padding: '4px 9px', borderRadius: 999,
      background: active ? 'oklch(0.70 0.19 46 / 18%)' : 'var(--c-22)',
      color: active ? 'var(--accent)' : 'var(--c-60)',
      border: active ? '1px solid oklch(0.70 0.19 46 / 32%)' : '1px solid transparent',
      fontSize: 10.5, fontWeight: 700,
    }}>{label}</button>
  )
}
