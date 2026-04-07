import Link from 'next/link'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faClipboardList, faDumbbell } from '@fortawesome/free-solid-svg-icons'

interface Props {
  metadata: {
    tipo: 'scheda' | 'sessione'
    id: string
    nome?: string
    giorni?: number
    data?: string
    giorno_nome?: string
    completata?: boolean
    durata_secondi?: number | null
  }
  daCoach: boolean
  ruolo: 'coach' | 'cliente'
  clienteId?: string
}

function formatDurata(sec: number | null | undefined) {
  if (!sec) return null
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  if (h > 0) return `${h}h ${m}min`
  return `${m}min`
}

export default function ChatAllegatoCard({ metadata, daCoach, ruolo, clienteId }: Props) {
  const isScheda = metadata.tipo === 'scheda'
  const accent = daCoach ? 'oklch(0.70 0.19 46)' : 'oklch(0.60 0.15 200)'
  const accentBg = daCoach ? 'oklch(0.70 0.19 46 / 15%)' : 'oklch(0.60 0.15 200 / 15%)'

  let href = '#'
  if (isScheda) {
    href = ruolo === 'coach' ? `/coach/schede/${metadata.id}` : `/cliente/dashboard`
  } else {
    href = ruolo === 'coach' && clienteId
      ? `/coach/clienti/${clienteId}/analytics`
      : `/cliente/progressi`
  }

  return (
    <Link href={href}
      className="flex items-center gap-3 rounded-xl px-3 py-2.5 mt-1 transition-all hover:opacity-80"
      style={{
        background: 'oklch(0.16 0 0)',
        border: `1px solid ${accent}40`,
        display: 'flex',
        textDecoration: 'none',
        minWidth: 200,
        maxWidth: 280,
      }}>
      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ background: accentBg, color: accent }}>
        <FontAwesomeIcon icon={isScheda ? faClipboardList : faDumbbell} className="text-sm" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold uppercase tracking-wide" style={{ color: accent }}>
          {isScheda ? 'Scheda' : 'Sessione'}
        </p>
        {isScheda ? (
          <>
            <p className="text-sm font-semibold truncate" style={{ color: 'oklch(0.90 0 0)' }}>
              {metadata.nome ?? 'Scheda'}
            </p>
            {metadata.giorni && (
              <p className="text-xs" style={{ color: 'oklch(0.50 0 0)' }}>{metadata.giorni} giorni</p>
            )}
          </>
        ) : (
          <>
            <p className="text-sm font-semibold truncate" style={{ color: 'oklch(0.90 0 0)' }}>
              {metadata.giorno_nome ?? 'Allenamento'}
            </p>
            <p className="text-xs" style={{ color: 'oklch(0.50 0 0)' }}>
              {metadata.data && new Date(metadata.data).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })}
              {metadata.durata_secondi ? ` · ${formatDurata(metadata.durata_secondi)}` : ''}
              {metadata.completata !== undefined ? ` · ${metadata.completata ? '✓ completata' : 'incompleta'}` : ''}
            </p>
          </>
        )}
      </div>
      <span style={{ color: accent, fontSize: 12 }}>→</span>
    </Link>
  )
}
