'use client'

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faLock, faChartLine, faWeightScale, faCamera,
  faRocket, faCircleCheck,
} from '@fortawesome/free-solid-svg-icons'

const FEATURES_PRO = [
  { icon: faChartLine, label: 'Grafici progressione pesi', desc: 'Vedi il tuo 1RM stimato crescere nel tempo' },
  { icon: faWeightScale, label: 'Misurazioni corporee', desc: 'Traccia peso, BF% e circonferenze' },
  { icon: faCamera, label: 'Foto progressi', desc: 'Confronta la tua forma nel tempo' },
]

export default function AtletaProgressiPage() {
  return (
    <div className="space-y-8 max-w-lg mx-auto pt-8">
      {/* Hero lock */}
      <div className="text-center space-y-4">
        <div className="w-20 h-20 rounded-3xl flex items-center justify-center text-3xl mx-auto"
          style={{ background: 'oklch(0.70 0.19 46 / 15%)', color: 'oklch(0.70 0.19 46)' }}>
          <FontAwesomeIcon icon={faLock} />
        </div>
        <div className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'oklch(0.70 0.19 46)' }}>
            Funzionalità Pro
          </p>
          <h1 className="text-3xl font-black tracking-tight" style={{ color: 'oklch(0.97 0 0)' }}>
            Traccia i tuoi progressi
          </h1>
          <p className="text-sm leading-relaxed" style={{ color: 'oklch(0.55 0 0)' }}>
            I progressi avanzati sono disponibili con il piano Pro.
            Sblocca grafici, misurazioni e foto per vedere davvero quanto sei migliorato.
          </p>
        </div>
      </div>

      {/* Feature list */}
      <div className="rounded-2xl overflow-hidden"
        style={{ background: 'oklch(0.18 0 0)', border: '1px solid oklch(1 0 0 / 6%)' }}>
        {FEATURES_PRO.map((f, i) => (
          <div key={f.label} className="flex items-center gap-4 px-5 py-4"
            style={{ borderBottom: i < FEATURES_PRO.length - 1 ? '1px solid oklch(1 0 0 / 4%)' : 'none' }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'oklch(0.70 0.19 46 / 15%)', color: 'oklch(0.70 0.19 46)' }}>
              <FontAwesomeIcon icon={f.icon} />
            </div>
            <div>
              <p className="font-semibold text-sm" style={{ color: 'oklch(0.97 0 0)' }}>{f.label}</p>
              <p className="text-xs mt-0.5" style={{ color: 'oklch(0.50 0 0)' }}>{f.desc}</p>
            </div>
            <FontAwesomeIcon icon={faCircleCheck} className="ml-auto flex-shrink-0"
              style={{ color: 'oklch(0.70 0.19 46)' }} />
          </div>
        ))}
      </div>

      {/* CTA */}
      <div className="space-y-3">
        <button
          onClick={() => alert('Stripe in arrivo — stay tuned!')}
          className="w-full py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-2 transition-all active:scale-95"
          style={{ background: 'oklch(0.70 0.19 46)', color: 'oklch(0.13 0 0)' }}>
          <FontAwesomeIcon icon={faRocket} />
          Passa a Pro
        </button>
        <p className="text-center text-xs" style={{ color: 'oklch(0.40 0 0)' }}>
          Disponibile a breve · Nessun addebito ora
        </p>
      </div>
    </div>
  )
}
