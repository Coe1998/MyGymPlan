'use client'

import { useEffect, useState } from 'react'

const STEPS = [
  {
    icon: '👋',
    title: 'Benvenuto su Bynari!',
    body: 'Sei nella tua area personale per gestire i tuoi allenamenti in autonomia. Ti spieghiamo in pochi passi come funziona tutto.',
    tip: null,
  },
  {
    icon: '📋',
    title: 'Crea la tua scheda',
    body: 'Vai su "Schede" per creare il tuo programma di allenamento. Ogni scheda ha più giorni, ogni giorno ha i suoi esercizi con serie, reps e recupero.',
    tip: 'Con il piano Free puoi avere 1 scheda con max 3 giorni.',
  },
  {
    icon: '📚',
    title: 'La libreria esercizi',
    body: 'In "Esercizi" costruisci la tua libreria personale. Aggiungi esercizi con nome, muscoli coinvolti e descrizione per averli sempre disponibili.',
    tip: null,
  },
  {
    icon: '✅',
    title: 'Allenati e logga tutto',
    body: 'Dalla dashboard scegli un giorno della tua scheda e inizia. Inserisci peso e reps per ogni serie e spunta ✓ per completarla.',
    tip: 'Il timer di recupero parte automaticamente dopo ogni serie completata.',
  },
  {
    icon: '📊',
    title: 'Guarda i tuoi progressi',
    body: 'In "Progressi" trovi i grafici del peso massimo e del volume per ogni esercizio nel tempo. Vedi la tua curva di forza crescere.',
    tip: 'Disponibile con il piano Pro.',
  },
  {
    icon: '💚',
    title: 'Fai il check-in!',
    body: 'Sempre in "Progressi" trovi il check-in giornaliero: registra energia, sonno, stress e motivazione per capire quando spingere e quando recuperare.',
    tip: 'Se hai un coach, riceve questi dati in tempo reale.',
    highlight: true,
  },
  {
    icon: '📤',
    title: 'Condividi i tuoi risultati',
    body: 'Dopo ogni allenamento puoi generare una share card con i tuoi highlight e condividerla dove vuoi.',
    tip: null,
  },
  {
    icon: '🚀',
    title: 'Sei pronto!',
    body: 'Crea la tua prima scheda e inizia ad allenarti. Più dati registri, più utili saranno i progressi nel tempo.',
    tip: null,
  },
]

export default function AtletaOnboarding() {
  const [visible, setVisible] = useState(false)
  const [step, setStep] = useState(0)

  useEffect(() => {
    const done = localStorage.getItem('bynari-atleta-onboarding-done')
    if (!done) setTimeout(() => setVisible(true), 800)
  }, [])

  const chiudi = () => {
    localStorage.setItem('bynari-atleta-onboarding-done', '1')
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
            style={{ width: `${((step + 1) / STEPS.length) * 100}%`, background: 'oklch(0.60 0.15 200)' }} />
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
                background: current.highlight ? 'oklch(0.65 0.18 150 / 10%)' : 'oklch(0.60 0.15 200 / 10%)',
                border: `1px solid ${current.highlight ? 'oklch(0.65 0.18 150 / 30%)' : 'oklch(0.60 0.15 200 / 30%)'}`,
              }}>
              <p className="text-xs leading-relaxed font-medium"
                style={{ color: current.highlight ? 'oklch(0.65 0.18 150)' : 'oklch(0.60 0.15 200)' }}>
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
            style={{ background: 'oklch(0.60 0.15 200)', color: 'var(--c-11)' }}>
            {isLast ? 'Inizia ad allenarti! 🚀' : 'Avanti →'}
          </button>
        </div>

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
