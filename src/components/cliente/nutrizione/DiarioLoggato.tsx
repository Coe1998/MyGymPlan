'use client'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faXmark } from '@fortawesome/free-solid-svg-icons'

interface PastoLog {
  id: string; alimento_nome: string; quantita_g: number
  calorie: number; proteine_g: number; carboidrati_g: number; grassi_g: number
  gruppo_nome: string | null
}

interface Props {
  pasti: PastoLog[]
  onDelete: (id: string) => void
}

export default function DiarioLoggato({ pasti, onDelete }: Props) {
  const groups: Record<string, PastoLog[]> = {}
  pasti.forEach(x => {
    const k = x.gruppo_nome ?? 'Senza gruppo'
    if (!groups[k]) groups[k] = []
    groups[k].push(x)
  })

  if (pasti.length === 0) {
    return (
      <div style={{
        padding: '40px 20px', textAlign: 'center',
        borderRadius: 20, background: 'var(--c-16)', border: '1px solid var(--c-w6)',
      }}>
        <div style={{ fontSize: 28, marginBottom: 8 }}>🥗</div>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--c-85)' }}>Nessun alimento oggi</div>
        <div style={{ fontSize: 11, color: 'var(--c-45)', marginTop: 4 }}>Inizia aggiungendo il primo</div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{
        fontSize: 10, fontWeight: 800, letterSpacing: '0.1em',
        color: 'var(--c-50)', padding: '4px 4px 0',
      }}>DIARIO DI OGGI</div>

      {Object.entries(groups).map(([gruppo, items]) => {
        const totK = Math.round(items.reduce((a, x) => a + x.calorie, 0))
        return (
          <div key={gruppo} style={{
            borderRadius: 16, background: 'var(--c-16)',
            border: '1px solid var(--c-w6)', overflow: 'hidden',
          }}>
            <div className="flex items-center justify-between" style={{
              padding: '10px 14px', background: 'var(--c-15)', borderBottom: '1px solid var(--c-w4)',
            }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--c-90)' }}>{gruppo}</div>
              <div style={{ fontSize: 10.5, color: 'var(--c-55)', fontVariantNumeric: 'tabular-nums' }}>
                {totK} kcal · {items.length} {items.length === 1 ? 'alimento' : 'alimenti'}
              </div>
            </div>

            {items.map((it, i) => (
              <div key={it.id} className="flex items-center gap-3" style={{
                padding: '10px 14px',
                borderBottom: i < items.length - 1 ? '1px solid var(--c-w4)' : 'none',
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 12.5, fontWeight: 600, color: 'var(--c-90)',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>{it.alimento_nome}</div>
                  <div style={{ fontSize: 10.5, color: 'var(--c-45)', marginTop: 2 }}>
                    {it.quantita_g}g · {it.proteine_g}p · {it.carboidrati_g}c · {it.grassi_g}g
                  </div>
                </div>
                <div style={{
                  fontFamily: 'Syne', fontWeight: 800, fontSize: 13,
                  color: 'var(--c-97)', fontVariantNumeric: 'tabular-nums',
                }}>{Math.round(it.calorie)}</div>
                <button onClick={() => onDelete(it.id)}
                  className="flex items-center justify-center"
                  style={{ width: 26, height: 26, borderRadius: 7, background: 'transparent', color: 'var(--c-40)' }}>
                  <FontAwesomeIcon icon={faXmark} style={{ fontSize: 10 }} />
                </button>
              </div>
            ))}
          </div>
        )
      })}
    </div>
  )
}
