'use client'

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faLock, faXmark, faRocketLaunch } from '@fortawesome/free-solid-svg-icons'

interface PaywallModalProps {
  titolo: string
  descrizione: string
  onClose: () => void
}

export default function PaywallModal({ titolo, descrizione, onClose }: PaywallModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ background: 'oklch(0 0 0 / 70%)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-3xl p-6 space-y-5"
        style={{ background: 'oklch(0.18 0 0)', border: '1px solid oklch(0.70 0.19 46 / 30%)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl"
            style={{ background: 'oklch(0.70 0.19 46 / 15%)', color: 'oklch(0.70 0.19 46)' }}>
            <FontAwesomeIcon icon={faLock} />
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: 'oklch(0.25 0 0)', color: 'oklch(0.55 0 0)' }}>
            <FontAwesomeIcon icon={faXmark} />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'oklch(0.70 0.19 46)' }}>
            Piano Pro
          </p>
          <h2 className="text-xl font-black" style={{ color: 'oklch(0.97 0 0)' }}>{titolo}</h2>
          <p className="text-sm leading-relaxed" style={{ color: 'oklch(0.55 0 0)' }}>{descrizione}</p>
        </div>

        {/* CTA */}
        <div className="space-y-3">
          <button
            className="w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-95"
            style={{ background: 'oklch(0.70 0.19 46)', color: 'oklch(0.13 0 0)' }}
            onClick={() => alert('Stripe in arrivo — stay tuned!')}>
            <FontAwesomeIcon icon={faRocketLaunch} />
            Passa a Pro
          </button>
          <button onClick={onClose} className="w-full py-2.5 rounded-xl text-sm font-medium"
            style={{ background: 'oklch(0.22 0 0)', color: 'oklch(0.55 0 0)' }}>
            Non ora
          </button>
        </div>

        {/* Drag handle */}
        <div className="flex justify-center">
          <div className="w-10 h-1 rounded-full" style={{ background: 'oklch(0.30 0 0)' }} />
        </div>
      </div>
    </div>
  )
}
