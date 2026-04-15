import Link from 'next/link'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faClipboardList, faDumbbell, faNoteSticky } from '@fortawesome/free-solid-svg-icons'

interface Props {
  metadata: {
    tipo: 'scheda' | 'sessione' | 'nota_esercizio'
    id?: string
    nome?: string
    giorni?: number
    data?: string
    giorno_nome?: string
    completata?: boolean
    durata_secondi?: number | null
    // nota_esercizio fields
    nota_id?: string
    testo_nota?: string
    esercizio_nome?: string
    sessione_id?: string
    scheda_esercizio_id?: string
    assegnazione_id?: string
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
  const isNota = metadata.tipo === 'nota_esercizio'
  const accent = daCoach ? 'oklch(0.70 0.19 46)' : 'oklch(0.60 0.15 200)'
  const accentBg = daCoach ? 'oklch(0.70 0.19 46 / 15%)' : 'oklch(0.60 0.15 200 / 15%)'

  let href = '#'
  if (isScheda) {
    href = ruolo === 'coach' ? `/coach/schede/${metadata.id}` : `/cliente/schede/${metadata.id}`
  } else if (isNota) {
    href = ruolo === 'coach' && clienteId
      ? `/coach/clienti/${clienteId}/analytics`
      : `/cliente/allenamento?sessione=${metadata.sessione_id}`
  } else {
    href = ruolo === 'coach' && clienteId
      ? `/coach/clienti/${clienteId}/analytics`
      : `/cliente/allenamento?sessione=${metadata.id}`
  }

  if (isNota) {
    return (
      <Link href={href}
        className="flex flex-col gap-1.5 rounded-xl px-3 py-2.5 mt-1 transition-all hover:opacity-80"
        style={{
          background: 'oklch(0.16 0 0)',
          border: '1px solid oklch(0.70 0.19 46 / 30%)',
          textDecoration: 'none',
          minWidth: 200,
          maxWidth: 300,
        }}>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: 'oklch(0.70 0.19 46 / 15%)', color: 'oklch(0.70 0.19 46)' }}>
            <FontAwesomeIcon icon={faNoteSticky} style={{ fontSize: 12 }} />
          </div>
          <p className="text-xs font-bold uppercase tracking-wide" style={{ color: 'oklch(0.70 0.19 46)' }}>
            📝 Nota esercizio
          </p>
        </div>
        {metadata.esercizio_nome && (
          <p className="text-sm font-bold" style={{ color: 'oklch(0.90 0 0)' }}>
            {metadata.esercizio_nome}
          </p>
        )}
        {metadata.testo_nota && (
          <p className="text-xs leading-snug" style={{ color: 'oklch(0.62 0 0)' }}>
            {metadata.testo_nota.length > 100 ? metadata.testo_nota.slice(0, 100) + '…' : metadata.testo_nota}
          </p>
        )}
        <p className="text-xs font-semibold mt-0.5" style={{ color: 'oklch(0.70 0.19 46)' }}>
          Vedi sessione →
        </p>
      </Link>
    )
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
