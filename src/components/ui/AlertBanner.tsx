import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faTriangleExclamation } from '@fortawesome/free-solid-svg-icons'

interface AlertBannerProps {
  count: number
  /** nomi dei clienti con alert */
  nomi: string[]
  /** callback cliccando l'intero banner */
  onClick?: () => void
}

export default function AlertBanner({ count, nomi, onClick }: AlertBannerProps) {
  if (count === 0) return null
  const label = count === 1 ? `1 cliente richiede attenzione` : `${count} clienti richiedono attenzione`
  const El = onClick ? 'button' : 'div'
  return (
    <El
      onClick={onClick}
      style={{
        width: '100%', textAlign: 'left',
        background: 'linear-gradient(180deg, oklch(0.65 0.22 27 / 14%) 0%, oklch(0.65 0.22 27 / 7%) 100%)',
        border: '1px solid oklch(0.65 0.22 27 / 28%)',
        borderRadius: 16, padding: '14px 16px',
        display: 'flex', alignItems: 'center', gap: 14,
        cursor: onClick ? 'pointer' : 'default',
      }}
    >
      <div style={{
        width: 42, height: 42, borderRadius: 12, flexShrink: 0,
        background: 'oklch(0.65 0.22 27 / 20%)', color: 'oklch(0.78 0.14 27)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <FontAwesomeIcon icon={faTriangleExclamation} style={{ fontSize: 16 }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 700, color: 'oklch(0.78 0.14 27)' }}>{label}</div>
        <div style={{ fontSize: 11.5, color: 'var(--c-60)', marginTop: 2 }} className="truncate">
          {nomi.join(', ')}
        </div>
      </div>
      {onClick && (
        <i className="fa-solid fa-chevron-right" style={{ color: 'oklch(0.60 0.14 27)', fontSize: 12, flexShrink: 0 }} />
      )}
    </El>
  )
}
