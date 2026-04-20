'use client'

import { useEffect, useState } from 'react'

const STEPS = [
  {
    icon: '👋',
    title: 'Benvenuto su Bynari!',
    body: 'Il tuo coach ti ha aggiunto alla piattaforma. In pochi secondi ti spieghiamo come funziona tutto.',
    tip: null,
  },
  {
    icon: '🏋️',
    title: 'La tua scheda',
    body: 'Nella dashboard trovi la scheda che il tuo coach ti ha assegnato, divisa per giorni di allenamento. Tocca un giorno per iniziare la sessione.',
    tip: 'Il timer parte in automatico e ti guida serie per serie.',
  },
  {
    icon: '✅',
    title: 'Logga ogni serie',
    body: 'Durante l\'allenamento inserisci il peso e le reps per ogni serie, poi spunta ✓ per completarla. Il recupero parte automaticamente.',
    tip: 'Vedi sempre il confronto con la sessione precedente.',
  },
  {
    icon: '📊',
    title: 'Tieni traccia dei progressi',
    body: 'Nella sezione Progressi trovi i grafici del tuo peso massimo e volume per ogni esercizio nel tempo.',
    tip: null,
  },
  {
    icon: '💚',
    title: 'Fai il check-in!',
    body: 'Sempre nella sezione Progressi, compila il check-in giornaliero: energia, sonno, stress e motivazione.',
    tip: 'Il tuo coach riceve questi dati in tempo reale e può aiutarti meglio.',
    highlight: true,
  },
  {
    icon: '📄',
    title: 'Scheda alimentare',
    body: 'Se il tuo coach ti ha assegnato un piano alimentare, lo trovi direttamente in dashboard sotto i giorni di allenamento.',
    tip: null,
  },
  {
    icon: '🚀',
    title: 'Sei pronto!',
    body: 'Hai tutto quello che ti serve. Inizia il tuo primo allenamento e fai sapere al coach come stai tramite il check-in.',
    tip: null,
  },
]

export default function ClienteOnboarding() {
  const [visible, setVisible] = useState(false)
  const [step, setStep] = useState(0)

  useEffect(() => {
    const done = localStorage.getItem('bynari-cliente-onboarding-done')
    if (!done) setTimeout(() => setVisible(true), 800)
  }, [])

  const chiudi = () => {
    localStorage.setItem('bynari-cliente-onboarding-done', '1')
    setVisible(false)
  }

  if (!visible) return null

  const current = STEPS[step]
  const isLast = step === STEPS.length - 1

  return (
    <div className="fixed inset-0 z-[9998] flex items-end sm:items-center justify-center p-4"
      style={{ background: 'oklch(0 0 0 / 70%)' }}>
      <div className="w-full max-w-sm rounded-3xl overflow-hidden"
        style={{ background: 'var(--c-18)', border: '1px solid var(--c-w10)', boxShadow: '0 24px 60px oklch(0 0 0 / 60%)' }}>

        {/* Progress bar */}
        <div className="h-1" style={{ background: 'var(--c-25)' }}>
          <div className="h-full transition-all duration-500"
            style={{ width: `${((step + 1) / STEPS.length) * 100}%`, background: 'oklch(0.70 0.19 46)' }} />
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div className="flex items-start justify-between">
            <div className="text-4xl">{current.icon}</div>
            <span className="text-xs font-bold" style={{ color: 'var(--c-40)' }}>
              {step + 1} / {STEPS.length}
            </span>
          </div>

          <div className="space-y-2">
            <h2 className="text-xl font-black tracking-tight" style={{ color: 'var(--c-97)', fontFamily: 'Syne, sans-serif' }}>
              {current.title}
            </h2>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--c-62)', fontFamily: 'Inter, sans-serif' }}>
              {current.body}
            </p>
          </div>

          {current.tip && (
            <div className="px-4 py-3 rounded-2xl"
              style={{
                background: current.highlight ? 'oklch(0.65 0.18 150 / 10%)' : 'oklch(0.70 0.19 46 / 10%)',
                border: `1px solid ${current.highlight ? 'oklch(0.65 0.18 150 / 30%)' : 'oklch(0.70 0.19 46 / 30%)'}`,
              }}>
              <p className="text-xs leading-relaxed font-medium"
                style={{ color: current.highlight ? 'oklch(0.65 0.18 150)' : 'oklch(0.70 0.19 46)' }}>
                💡 {current.tip}
              </p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="px-6 pb-6 flex items-center gap-3">
          {step > 0 && (
            <button onClick={() => setStep(s => s - 1)}
              className="px-4 py-3 rounded-2xl text-sm font-semibold transition-all active:scale-95"
              style={{ background: 'var(--c-25)', color: 'var(--c-60)' }}>
              ←
            </button>
          )}
          <button
            onClick={isLast ? chiudi : () => setStep(s => s + 1)}
            className="flex-1 py-3 rounded-2xl font-black text-sm transition-all active:scale-95 hover:brightness-110"
            style={{ background: 'oklch(0.70 0.19 46)', color: 'var(--c-11)' }}>
            {isLast ? 'Inizia ad allenarti! 🚀' : 'Avanti →'}
          </button>
        </div>

        {/* Skip */}
        {!isLast && (
          <button onClick={chiudi}
            className="w-full pb-5 text-xs text-center transition-opacity hover:opacity-70"
            style={{ color: 'var(--c-35)' }}>
            Salta tutorial
          </button>
        )}
      </div>
    </div>
  )
}
