const COLS = [
  { l: '#',        w: 36 },
  { l: 'ESERCIZIO', flex: 1.5 },
  { l: 'TIPO',     w: 110 },
  { l: 'SER.',     w: 60 },
  { l: 'REPS',     w: 80 },
  { l: 'REC.',     w: 60 },
  { l: 'PROGR.',   w: 110 },
  { l: '',         w: 68 },
]

export default function DesktopColumnHeader() {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '10px 12px 8px', marginTop: 12,
      borderBottom: '1px solid var(--c-w6)',
      fontSize: 9.5, fontWeight: 800, letterSpacing: '0.1em', color: 'var(--c-50)',
    }}>
      {COLS.map((c, i) => (
        <div key={i} style={{ width: c.w, flex: (c as any).flex ?? 'none', textAlign: c.l === '#' ? 'center' : 'left' }}>
          {c.l}
        </div>
      ))}
    </div>
  )
}
