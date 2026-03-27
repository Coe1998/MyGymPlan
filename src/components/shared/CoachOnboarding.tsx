'use client'

import { useEffect, useState } from 'react'

const STEPS = [
  {
    icon: '🎯',
    title: 'Benvenuto su Bynari, Coach!',
    body: 'Sei nella piattaforma per gestire i tuoi clienti, monitorare i loro progressi e non perderti nessun segnale di abbandono. Ti guidiamo in 2 minuti.',
    tip: null,
    section: null,
  },
  {
    icon: '👥',
    title: 'Aggiungi i tuoi clienti',
    body: 'Vai su "Clienti" per aggiungere i tuoi atleti. Puoi farlo in due modi: via email (se già registrati) oppure condividendo il tuo link invito personale.',
    tip: 'Il link invito è il metodo più comodo: il cliente clicca, si registra e la richiesta ti arriva direttamente.',
    section: '→ Menu: Clienti',
  },
  {
    icon: '📋',
    title: 'Crea le schede',
    body: 'In "Schede" puoi creare programmi di allenamento. Ogni scheda ha più giorni, ogni giorno ha i suoi esercizi con serie, reps, recupero e note.',
    tip: 'Puoi riordinare gli esercizi con drag & drop e salvare schede come template da riutilizzare.',
    section: '→ Menu: Schede',
  },
  {
    icon: '🗓️',
    title: 'Assegna ai clienti',
    body: 'Dentro ogni scheda trovi il pannello "Assegnazioni". Scegli il cliente, imposta la data di inizio e fine, e opzionalmente carica un PDF del piano alimentare.',
    tip: 'Il cliente vede subito la scheda nella sua dashboard e può iniziare ad allenarsi.',
    section: '→ Menu: Schede → apri una scheda',
  },
  {
    icon: '📚',
    title: 'La libreria esercizi',
    body: 'In "Esercizi" gestisci la tua libreria personale. Aggiungi esercizi con nome, muscoli coinvolti, descrizione tecnica e URL video.',
    tip: 'Gli esercizi della tua libreria sono disponibili in tutte le schede.',
    section: '→ Menu: Esercizi',
  },
  {
    icon: '📊',
    title: 'Analytics — Tab Attività',
    body: 'La sezione Analytics è il cuore del tuo lavoro. Il tab "Attività" mostra tutti i clienti con: schede attive, sessioni totali, ultima sessione e stato.',
    tip: 'Clicca su un cliente per vedere nel dettaglio ogni sessione che ha fatto, esercizio per esercizio.',
    section: '→ Menu: Analytics → Tab Attività',
  },
  {
    icon: '💚',
    title: 'Analytics — Tab Benessere',
    body: 'Il tab "Benessere" mostra l\'ultimo check-in di ogni cliente: energia, sonno, stress e motivazione su scala 1-5.',
    tip: 'Se lo stress è alto o l\'energia è bassa, è il momento di contattare il cliente.',
    section: '→ Menu: Analytics → Tab Benessere',
  },
  {
    icon: '⚖️',
    title: 'Analytics — Tab Peso',
    body: 'Il tab "Peso" mostra l\'andamento del peso corporeo nel tempo per ogni cliente con grafico e delta rispetto alla rilevazione precedente.',
    tip: null,
    section: '→ Menu: Analytics → Tab Peso',
  },
  {
    icon: '⚠️',
    title: 'Analytics — Tab Alert',
    body: 'Il tab "Alert" è quello più importante: ti mostra i clienti che richiedono attenzione. Inattività, stress, motivazione bassa, nessun check-in.',
    tip: 'Il numero rosso sul tab indica quanti clienti hanno alert attivi. Controllalo ogni giorno.',
    section: '→ Menu: Analytics → Tab Alert',
    highlight: true,
  },
  {
    icon: '🔗',
    title: 'Il tuo link invito',
    body: 'In "Clienti" trovi il tuo link personale da condividere con i clienti. Chi lo apre vede il tuo nome e può registrarsi direttamente come tuo cliente.',
    tip: 'Condividilo su WhatsApp, Instagram o dove preferisci. La richiesta ti arriva automaticamente.',
    section: '→ Menu: Clienti → Link invito',
  },
  {
    icon: '🚀',
    title: 'Sei pronto!',
    body: 'Aggiungi i tuoi primi clienti, crea le schede e tieni d\'occhio Analytics ogni giorno. Bynari fa il resto.',
    tip: 'Suggerimento: inizia con 2-3 clienti per prendere confidenza con la piattaforma.',
    section: null,
  },
]

export default function CoachOnboarding() {
  const [visible, setVisible] = useState(false)
  const [step, setStep] = useState(0)

  useEffect(() => {
    const done = localStorage.getItem('bynari-coach-onboarding-done')
    if (!done) setTimeout(() => setVisible(true), 800)
  }, [])

  const chiudi = () => {
    localStorage.setItem('bynari-coach-onboarding-done', '1')
    setVisible(false)
  }

  if (!visible) return null

  const current = STEPS[step]
  const isLast = step === STEPS.length - 1

  return (
    <div className="fixed inset-0 z-[9998] flex items-end sm:items-center justify-center p-4"
      style={{ background: 'oklch(0 0 0 / 70%)' }}>
      <div className="w-full max-w-md rounded-3xl overflow-hidden"
        style={{ background: 'oklch(0.18 0 0)', border: '1px solid oklch(1 0 0 / 10%)', boxShadow: '0 24px 60px oklch(0 0 0 / 60%)' }}>

        {/* Progress bar */}
        <div className="h-1" style={{ background: 'oklch(0.25 0 0)' }}>
          <div className="h-full transition-all duration-500"
            style={{ width: `${((step + 1) / STEPS.length) * 100}%`, background: 'oklch(0.70 0.19 46)' }} />
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div className="flex items-start justify-between">
            <div className="text-4xl">{current.icon}</div>
            <span className="text-xs font-bold px-2.5 py-1 rounded-full"
              style={{ background: 'oklch(0.25 0 0)', color: 'oklch(0.40 0 0)' }}>
              {step + 1} / {STEPS.length}
            </span>
          </div>

          {current.section && (
            <div className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-bold"
              style={{ background: 'oklch(0.70 0.19 46 / 15%)', color: 'oklch(0.70 0.19 46)', border: '1px solid oklch(0.70 0.19 46 / 25%)' }}>
              {current.section}
            </div>
          )}

          <div className="space-y-2">
            <h2 className="text-xl font-black tracking-tight" style={{ color: 'oklch(0.97 0 0)', fontFamily: 'Syne, sans-serif' }}>
              {current.title}
            </h2>
            <p className="text-sm leading-relaxed" style={{ color: 'oklch(0.62 0 0)', fontFamily: 'Inter, sans-serif' }}>
              {current.body}
            </p>
          </div>

          {current.tip && (
            <div className="px-4 py-3 rounded-2xl"
              style={{
                background: current.highlight ? 'oklch(0.65 0.22 27 / 10%)' : 'oklch(0.70 0.19 46 / 10%)',
                border: `1px solid ${current.highlight ? 'oklch(0.65 0.22 27 / 30%)' : 'oklch(0.70 0.19 46 / 30%)'}`,
              }}>
              <p className="text-xs leading-relaxed font-medium"
                style={{ color: current.highlight ? 'oklch(0.85 0.12 46)' : 'oklch(0.70 0.19 46)' }}>
                💡 {current.tip}
              </p>
            </div>
          )}
        </div>

        {/* Dot indicators */}
        <div className="flex items-center justify-center gap-1.5 pb-2">
          {STEPS.map((_, i) => (
            <button key={i} onClick={() => setStep(i)}
              className="rounded-full transition-all"
              style={{
                width: i === step ? 20 : 6,
                height: 6,
                background: i === step ? 'oklch(0.70 0.19 46)' : 'oklch(0.30 0 0)',
              }} />
          ))}
        </div>

        {/* Actions */}
        <div className="px-6 pb-6 flex items-center gap-3">
          {step > 0 && (
            <button onClick={() => setStep(s => s - 1)}
              className="px-4 py-3 rounded-2xl text-sm font-semibold transition-all active:scale-95"
              style={{ background: 'oklch(0.25 0 0)', color: 'oklch(0.60 0 0)' }}>
              ←
            </button>
          )}
          <button
            onClick={isLast ? chiudi : () => setStep(s => s + 1)}
            className="flex-1 py-3 rounded-2xl font-black text-sm transition-all active:scale-95 hover:brightness-110"
            style={{ background: 'oklch(0.70 0.19 46)', color: 'oklch(0.11 0 0)' }}>
            {isLast ? 'Inizia a usare Bynari! 🚀' : 'Avanti →'}
          </button>
        </div>

        {/* Skip */}
        {!isLast && (
          <button onClick={chiudi}
            className="w-full pb-5 text-xs text-center transition-opacity hover:opacity-70"
            style={{ color: 'oklch(0.35 0 0)' }}>
            Salta tutorial
          </button>
        )}
      </div>
    </div>
  )
}
