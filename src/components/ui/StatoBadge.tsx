interface StatoBadgeProps {
  stato: string
  size?: 'sm' | 'md'
}

const MAP: Record<string, { color: string; bg: string }> = {
  'Attivo':       { color: 'oklch(0.65 0.18 150)',  bg: 'oklch(0.65 0.18 150 / 15%)' },
  'A rischio':    { color: 'oklch(0.78 0.14 27)',    bg: 'oklch(0.65 0.22 27 / 15%)' },
  'Regolare':     { color: 'oklch(0.75 0.18 80)',    bg: 'oklch(0.75 0.18 80 / 15%)' },
  'In calo':      { color: 'oklch(0.75 0.18 80)',    bg: 'oklch(0.75 0.18 80 / 15%)' },
  'Mai allenato': { color: 'var(--c-55)',            bg: 'var(--c-22)' },
}

export default function StatoBadge({ stato, size = 'md' }: StatoBadgeProps) {
  const s = MAP[stato] ?? { color: 'var(--c-55)', bg: 'var(--c-22)' }
  return (
    <span
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 5,
        fontSize: size === 'sm' ? 11 : 11.5,
        fontWeight: 600,
        padding: size === 'sm' ? '2px 8px' : '3px 10px',
        borderRadius: 10,
        background: s.bg, color: s.color,
      }}
    >
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: s.color, flexShrink: 0 }} />
      {stato}
    </span>
  )
}
