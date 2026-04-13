'use client'

import Link from 'next/link'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCircleCheck, faChevronRight } from '@fortawesome/free-solid-svg-icons'

interface Props {
  schedulazioneId: string
  titolo: string
}

export default function ProgressCheckBanner({ schedulazioneId, titolo }: Props) {
  return (
    <Link href={`/cliente/checkin/${schedulazioneId}`}
      className="flex items-center gap-4 rounded-2xl px-5 py-4 transition-all active:scale-95"
      style={{ background: 'oklch(0.70 0.19 46)', border: '1px solid oklch(0.70 0.19 46)' }}>
      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: 'oklch(0 0 0 / 20%)' }}>
        <FontAwesomeIcon icon={faCircleCheck} style={{ color: 'oklch(0.13 0 0)', fontSize: 18 }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold uppercase tracking-wide mb-0.5"
          style={{ color: 'oklch(0.40 0.10 46)' }}>
          Check-in di oggi
        </p>
        <p className="text-sm font-black truncate" style={{ color: 'oklch(0.13 0 0)' }}>
          {titolo} — Il tuo coach ti aspetta
        </p>
        <p className="text-xs mt-0.5" style={{ color: 'oklch(0.35 0.08 46)' }}>
          Hai fino a mezzanotte per inviarlo
        </p>
      </div>
      <FontAwesomeIcon icon={faChevronRight} style={{ color: 'oklch(0.13 0 0)', flexShrink: 0 }} />
    </Link>
  )
}
