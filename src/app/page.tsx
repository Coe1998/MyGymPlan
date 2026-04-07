'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'

function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null)
  const [inView, setInView] = useState(false)
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setInView(true) }, { threshold })
    if (ref.current) obs.observe(ref.current)
    return () => obs.disconnect()
  }, [threshold])
  return { ref, inView }
}

const COACH_BENEFITS = [
  { num: "01", title: "7 alert intelligenti per cliente", body: "Inattività, check-in mancanti, calo volume −30%, sessioni incomplete, stress elevato, variazione peso anomala, esercizi saltati. Tocca l'alert e vedi i dati specifici." },
  { num: "02", title: "Analytics avanzate per ogni cliente", body: "e1RM stimato per esercizio, serie per gruppo muscolare, pattern benessere settimanale, andamento peso. Tutto aggregato in una pagina con export PDF." },
  { num: "03", title: "Anamnesi corporea completa", body: "Al primo accesso il cliente compila età, altezza, sesso, stile di vita, sonno, patologie, intolleranze e foto anatomiche. Tu hai subito il profilo completo per programmare correttamente." },
  { num: "04", title: "Piano nutrizionale personalizzato", body: "Imposta macro target, ripartiscili su N pasti con percentuali configurabili. Il cliente vede i macro per ogni pasto e può saltarne uno — i macro si ridistribuiscono automaticamente." },
  { num: "05", title: "Piano integratori prescritto da te", body: "Prescrivi nome, dose, unità e momento di assunzione per ogni integratore. Il cliente vede una checklist giornaliera e ti spunta cosa ha preso." },
  { num: "06", title: "Appuntamenti e check-in in app", body: "Fissa videocall, chiamate o sessioni in presenza direttamente dall'app. Il cliente riceve notifica push 24h e 15 minuti prima. Nessun tool esterno." },
  { num: "07", title: "Schede avanzate in 3 minuti", body: "Superset, dropset, piramidale, RPE/RIR, timer, unilaterale, warmup generale e specifico per esercizio. Editor ottimizzato sia mobile che desktop." },
  { num: "08", title: "Triple Progression automatica", body: "L'algoritmo suggerisce peso, serie o reps ottimali per ogni cliente sessione dopo sessione. Zero calcoli manuali, zero fogli Excel." },
]

const ATLETA_FEATURES = [
  { num: "01", title: "Triple Progression automatica", body: "Finisci una sessione e l'app calcola quanto caricare nella prossima. Peso, serie o reps — scegli tu la direzione, l'algoritmo fa i conti." },
  { num: "02", title: "Forza stimata (e1RM) e grafici muscoli", body: "Traccia la forza stimata per ogni esercizio settimana dopo settimana. Vedi quali muscoli stai sviluppando e dove sei indietro." },
  { num: "03", title: "Check-in e benessere giornaliero", body: "Logga energia, sonno, stress e motivazione ogni giorno. Capisci quando spingere e quando recuperare. I dati rimangono nel tuo storico." },
  { num: "04", title: "Nutrizione e tracciamento pasti", body: "Cerca alimenti dal database Open Food Facts, logga i pasti e monitora macro e calorie giornalieri rispetto al tuo target." },
  { num: "05", title: "Schede avanzate come un pro", body: "Crea le tue schede con superset, dropset, timer, unilaterale, RPE, warmup. Lo stesso editor dei coach professionisti, anche su desktop." },
]

const STEPS = [
  { num: '1', title: 'Crea il tuo account', body: 'Registrazione in 30 secondi. Nessuna carta di credito.' },
  { num: '2', title: 'Aggiungi i tuoi clienti', body: 'Via email o link invito. Il cliente installa l\'app e parte subito.' },
  { num: '3', title: 'Assegna le schede', body: 'Crea o duplica una scheda, assegnala, imposta le date. Fatto.' },
  { num: '4', title: 'Monitora e intervieni', body: 'Dashboard in tempo reale. Sai esattamente chi rischia di abbandonare.' },
]

function FadeIn({ children, delay = 0, className = '' }: { children: React.ReactNode, delay?: number, className?: string }) {
  const { ref, inView } = useInView()
  return (
    <div ref={ref} className={className} style={{
      opacity: inView ? 1 : 0,
      transform: inView ? 'translateY(0)' : 'translateY(28px)',
      transition: `opacity 0.7s ease ${delay}s, transform 0.7s ease ${delay}s`,
    }}>
      {children}
    </div>
  )
}

function FeatureCard({ num, title, body, delay }: { num: string, title: string, body: string, delay: number }) {
  return (
    <FadeIn delay={delay}>
      <div className="group relative p-6 rounded-2xl h-full transition-all duration-300 hover:-translate-y-1" style={{
        background: 'oklch(0.16 0 0)',
        border: '1px solid oklch(1 0 0 / 7%)',
      }}>
        <div className="absolute top-0 left-6 right-6 h-px transition-all duration-300"
          style={{ background: 'oklch(0.70 0.19 46 / 0%)' }}
          onMouseEnter={e => (e.currentTarget.style.background = 'oklch(0.70 0.19 46 / 60%)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'oklch(0.70 0.19 46 / 0%)')} />
        <p className="text-xs font-black tracking-widest mb-4" style={{ color: 'oklch(0.70 0.19 46)' }}>{num}</p>
        <h3 className="text-lg font-black mb-2 tracking-tight" style={{ color: 'oklch(0.97 0 0)', fontFamily: 'Syne, sans-serif' }}>{title}</h3>
        <p className="text-sm leading-relaxed" style={{ color: 'oklch(0.52 0 0)' }}>{body}</p>
      </div>
    </FadeIn>
  )
}

function MockDashboard() {
  return (
    <div className="relative w-full max-w-2xl mx-auto rounded-2xl overflow-hidden" style={{
      background: 'oklch(0.15 0 0)',
      border: '1px solid oklch(1 0 0 / 10%)',
      boxShadow: '0 40px 80px oklch(0 0 0 / 60%), 0 0 0 1px oklch(0.70 0.19 46 / 10%)',
    }}>
      {/* Window bar */}
      <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: '1px solid oklch(1 0 0 / 6%)', background: 'oklch(0.13 0 0)' }}>
        <div className="w-3 h-3 rounded-full" style={{ background: 'oklch(0.65 0.18 27)' }} />
        <div className="w-3 h-3 rounded-full" style={{ background: 'oklch(0.75 0.15 85)' }} />
        <div className="w-3 h-3 rounded-full" style={{ background: 'oklch(0.65 0.18 150)' }} />
        <div className="flex-1 mx-4 h-5 rounded-md" style={{ background: 'oklch(0.20 0 0)' }} />
      </div>
      <div className="p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs font-bold mb-1" style={{ color: 'oklch(0.50 0 0)' }}>Buongiorno</div>
            <div className="text-lg font-black" style={{ color: 'oklch(0.97 0 0)' }}>Dashboard Coach</div>
          </div>
          <div className="px-3 py-1.5 rounded-lg text-xs font-bold" style={{ background: 'oklch(0.70 0.19 46 / 15%)', color: 'oklch(0.70 0.19 46)' }}>
            12 clienti attivi
          </div>
        </div>
        {/* Alert */}
        <div className="space-y-2">
          <div className="p-3 rounded-xl flex items-center gap-3" style={{ background: 'oklch(0.75 0.15 27 / 10%)', border: '1px solid oklch(0.75 0.15 27 / 25%)' }}>
            <div className="text-lg">⚠️</div>
            <div className="flex-1">
              <div className="text-xs font-bold" style={{ color: 'oklch(0.85 0.12 50)' }}>3 clienti non si allenano da 5+ giorni</div>
              <div className="text-xs mt-0.5" style={{ color: 'oklch(0.50 0 0)' }}>Marco R. · Giulia T. · Andrea M.</div>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5 px-1">
            {[
              { label: 'Calo volume −38%', color: 'oklch(0.75 0.15 27)', bg: 'oklch(0.65 0.22 27 / 18%)' },
              { label: 'Stress elevato', color: 'oklch(0.75 0.14 46)', bg: 'oklch(0.70 0.19 46 / 18%)' },
              { label: 'Check-in mancante 6gg', color: 'oklch(0.80 0.12 80)', bg: 'oklch(0.75 0.15 80 / 18%)' },
            ].map(a => (
              <span key={a.label} className="text-xs px-2.5 py-1 rounded-full font-medium" style={{ background: a.bg, color: a.color }}>
                ▲ {a.label}
              </span>
            ))}
          </div>
        </div>
        {/* Client list */}
        <div className="space-y-2">
          {[
            { name: 'Marco Rossi', days: '5 giorni fa', status: 'warning', perc: 20 },
            { name: 'Sara Bianchi', days: 'Oggi', status: 'ok', perc: 100 },
            { name: 'Luca Ferrari', days: 'Ieri', status: 'ok', perc: 75 },
          ].map((c) => (
            <div key={c.name} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'oklch(0.18 0 0)' }}>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black flex-shrink-0"
                style={{
                  background: c.status === 'warning' ? 'oklch(0.75 0.15 27 / 20%)' : 'oklch(0.65 0.18 150 / 20%)',
                  color: c.status === 'warning' ? 'oklch(0.85 0.12 50)' : 'oklch(0.65 0.18 150)',
                }}>
                {c.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold" style={{ color: 'oklch(0.90 0 0)' }}>{c.name}</div>
                <div className="text-xs" style={{ color: c.status === 'warning' ? 'oklch(0.75 0.15 27)' : 'oklch(0.50 0 0)' }}>{c.days}</div>
              </div>
              <div className="w-16 h-1.5 rounded-full overflow-hidden" style={{ background: 'oklch(0.25 0 0)' }}>
                <div className="h-full rounded-full" style={{
                  width: `${c.perc}%`,
                  background: c.status === 'warning' ? 'oklch(0.75 0.15 27)' : 'oklch(0.65 0.18 150)',
                }} />
              </div>
            </div>
          ))}
        </div>
        {/* Stats row */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'Sessioni settimana', value: '34' },
            { label: 'Retention media', value: '91%' },
            { label: 'Nuovi PR', value: '7' },
          ].map((s) => (
            <div key={s.label} className="p-3 rounded-xl text-center" style={{ background: 'oklch(0.18 0 0)' }}>
              <div className="text-xl font-black" style={{ color: 'oklch(0.70 0.19 46)' }}>{s.value}</div>
              <div className="text-xs mt-0.5" style={{ color: 'oklch(0.45 0 0)' }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function LandingPage() {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const heroRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onScroll = () => {
      if (heroRef.current) {
        heroRef.current.style.transform = `translateY(${window.scrollY * 0.2}px)`
        heroRef.current.style.opacity = `${1 - window.scrollY / 600}`
      }
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div style={{ background: 'oklch(0.11 0 0)', color: 'oklch(0.97 0 0)', fontFamily: 'Syne, Inter, sans-serif', overflowX: 'hidden' }}>

      {/* ── NAV ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6"
        style={{
          background: 'oklch(0.11 0 0 / 85%)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid oklch(1 0 0 / 6%)',
          paddingTop: 'calc(env(safe-area-inset-top) + 1rem)',
          paddingBottom: '1rem',
        }}>
        <img src="/logo/Bynari_WO1.png" alt="Bynari" style={{ height: '26px', width: 'auto' }} />
        <div className="hidden md:flex items-center gap-8">
          {[['Come funziona', '#come-funziona'], ['Per i Coach', '#coach'], ['Per gli Atleti', '#atleti'], ['Pricing', '#pricing']].map(([label, href]) => (
            <a key={label} href={href} className="text-sm font-medium"
              style={{ color: 'oklch(0.50 0 0)' }}
              onMouseEnter={e => (e.currentTarget.style.color = 'oklch(0.97 0 0)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'oklch(0.50 0 0)')}>
              {label}
            </a>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login" className="hidden sm:block text-sm font-semibold px-4 py-2 rounded-xl"
            style={{ color: 'oklch(0.55 0 0)' }}>Accedi</Link>
          <Link href="/register"
            className="text-sm font-bold px-4 py-2 rounded-xl transition-all active:scale-95 hover:brightness-110"
            style={{ background: 'oklch(0.70 0.19 46)', color: 'oklch(0.11 0 0)' }}>
            Prova gratis
          </Link>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="relative overflow-hidden" style={{
        paddingTop: 'calc(env(safe-area-inset-top) + 7rem)',
        paddingBottom: '5rem',
      }}>
        <div className="absolute inset-0" style={{
          backgroundImage: `linear-gradient(oklch(1 0 0 / 3%) 1px, transparent 1px), linear-gradient(90deg, oklch(1 0 0 / 3%) 1px, transparent 1px)`,
          backgroundSize: '60px 60px',
        }} />
        <div className="absolute inset-0" style={{
          background: 'radial-gradient(ellipse 70% 60% at 50% 20%, oklch(0.70 0.19 46 / 10%) 0%, transparent 70%)',
        }} />

        <div ref={heroRef} className="relative z-10 px-6 max-w-5xl mx-auto">
          <div className="flex justify-center mb-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold tracking-widest uppercase"
              style={{ background: 'oklch(0.70 0.19 46 / 12%)', border: '1px solid oklch(0.70 0.19 46 / 30%)', color: 'oklch(0.70 0.19 46)' }}>
              <span className="w-1.5 h-1.5 rounded-full animate-pulse inline-block" style={{ background: 'oklch(0.70 0.19 46)' }} />
              Ora in beta · Accesso gratuito
            </div>
          </div>

          <div className="text-center mb-12">
            <h1 className="font-black tracking-tighter leading-none mb-6" style={{
              fontSize: 'clamp(2.4rem, 7vw, 6rem)',
              fontFamily: 'Syne, sans-serif',
              letterSpacing: '-0.04em',
            }}>
              Gestisci ogni cliente.<br />
              <span style={{ color: 'oklch(0.70 0.19 46)' }}>Su tutto. In un posto solo.</span>
            </h1>
            <p className="text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed"
              style={{ color: 'oklch(0.52 0 0)', fontFamily: 'Inter, sans-serif', fontWeight: 400 }}>
              Schede, nutrizione, anamnesi, analytics, chat, appuntamenti check-in e alert intelligenti.
              Tutto quello che un coach professionista usa ogni giorno, in un'unica app PWA.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-4">
              <Link href="/register"
                className="group flex items-center gap-3 px-8 py-4 rounded-2xl font-black text-base transition-all active:scale-95 hover:brightness-110"
                style={{ background: 'oklch(0.70 0.19 46)', color: 'oklch(0.11 0 0)', minWidth: 240 }}>
                Prova gratis con 3 clienti
                <span className="transition-transform group-hover:translate-x-1">→</span>
              </Link>
              <Link href="/register"
                className="group flex items-center gap-3 px-8 py-4 rounded-2xl font-black text-base transition-all active:scale-95"
                style={{ background: 'oklch(0.18 0 0)', color: 'oklch(0.97 0 0)', border: '1px solid oklch(1 0 0 / 12%)', minWidth: 200 }}>
                Sono un Atleta
                <span className="transition-transform group-hover:translate-x-1">→</span>
              </Link>
            </div>
            <p className="text-xs" style={{ color: 'oklch(0.35 0 0)', fontFamily: 'Inter, sans-serif' }}>
              Nessuna carta di credito · Setup in 2 minuti · Cancella quando vuoi
            </p>
          </div>

          {/* Mock UI prodotto */}
          <FadeIn delay={0.2}>
            <MockDashboard />
          </FadeIn>
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-32"
          style={{ background: 'linear-gradient(to bottom, transparent, oklch(0.11 0 0))' }} />
      </section>

      {/* ── NUMERI ── */}
      <section className="py-12 px-6" style={{ borderTop: '1px solid oklch(1 0 0 / 6%)', borderBottom: '1px solid oklch(1 0 0 / 6%)' }}>
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
          {[
            { value: '8+', label: 'moduli integrati in un'unica app' },
            { value: '0€', label: 'per iniziare, nessun vincolo' },
            { value: '2 min', label: 'per creare e assegnare una scheda' },
            { value: '100%', label: 'mobile first, PWA installabile' },
          ].map((s, i) => (
            <FadeIn key={s.label} delay={i * 0.1}>
              <div className="text-center">
                <p className="font-black text-3xl md:text-4xl tracking-tight mb-1"
                  style={{ color: 'oklch(0.70 0.19 46)', fontFamily: 'Syne, sans-serif' }}>{s.value}</p>
                <p className="text-xs leading-snug" style={{ color: 'oklch(0.40 0 0)', fontFamily: 'Inter, sans-serif' }}>{s.label}</p>
              </div>
            </FadeIn>
          ))}
        </div>
      </section>

      {/* ── PROBLEMA ── */}
      <section className="py-24 px-6" style={{ background: 'oklch(0.13 0 0)' }}>
        <div className="max-w-4xl mx-auto">
          <FadeIn>
            <p className="text-xs font-black tracking-widest uppercase mb-4" style={{ color: 'oklch(0.70 0.19 46)' }}>Il problema</p>
            <h2 className="font-black tracking-tighter mb-6 leading-tight"
              style={{ fontSize: 'clamp(1.8rem, 5vw, 3.2rem)', fontFamily: 'Syne, sans-serif' }}>
              Ogni cliente perso è un rinnovo mancato.<br />
              <span style={{ color: 'oklch(0.55 0 0)' }}>E di solito non capisci perché.</span>
            </h2>
          </FadeIn>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-10">
            {[
              { icon: '📋', title: 'Schede su Excel, WhatsApp e PDF', body: 'Ogni cliente ha la scheda in un posto diverso. Aggiornarle richiede più tempo che allenarli.' },
              { icon: '👻', title: 'Clienti che spariscono in silenzio', body: 'Non sai chi non si allena da una settimana. Quando te ne accorgi, si sono già disiscritti.' },
              { icon: '🕐', title: 'Ore perse in gestione', body: 'Messaggi, aggiornamenti, controlli manuali. Tempo rubato ai clienti che potresti realmente aiutare.' },
            ].map((item, i) => (
              <FadeIn key={item.title} delay={i * 0.1}> {/* Corretto: uso i invece di item.num */}
                <div className="p-6 rounded-2xl h-full" style={{ background: 'oklch(0.16 0 0)', border: '1px solid oklch(1 0 0 / 7%)' }}>
                  <div className="text-3xl mb-4">{item.icon}</div>
                  <h3 className="font-black text-base mb-2 tracking-tight" style={{ color: 'oklch(0.97 0 0)', fontFamily: 'Syne, sans-serif' }}>{item.title}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: 'oklch(0.52 0 0)', fontFamily: 'Inter, sans-serif' }}>{item.body}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── SOLUZIONE ── */}
      <section className="py-16 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <FadeIn>
            <p className="text-xs font-black tracking-widest uppercase mb-4" style={{ color: 'oklch(0.70 0.19 46)' }}>La soluzione</p>
            <h2 className="font-black tracking-tighter mb-5 leading-tight"
              style={{ fontSize: 'clamp(1.8rem, 5vw, 3rem)', fontFamily: 'Syne, sans-serif' }}>
              Uno strumento che ti fa<br />
              <span style={{ color: 'oklch(0.70 0.19 46)' }}>guadagnare di più perdendo meno.</span>
            </h2>
            <p className="text-base leading-relaxed mb-4" style={{ color: 'oklch(0.52 0 0)', fontFamily: 'Inter, sans-serif' }}>
              Bynari non è una semplice app per schede. È la piattaforma completa per coach professionisti:
              anamnesi del cliente, schede avanzate, piano alimentare con suddivisione sui pasti,
              piano integratori, analytics con e1RM e volume muscolare, alert intelligenti, appuntamenti check-in e chat.
            </p>
            <p className="text-base leading-relaxed" style={{ color: 'oklch(0.52 0 0)', fontFamily: 'Inter, sans-serif' }}>
              Smetti di usare WhatsApp per le schede, Excel per i progressi, un'app per la dieta e un'altra per gli appuntamenti.
              Con Bynari hai tutto in un posto solo — e i tuoi clienti hanno un'esperienza professionale dall'onboarding alla sessione.
            </p>
          </FadeIn>
        </div>
      </section>

      {/* ── COME FUNZIONA ── */}
      <section id="come-funziona" className="py-24 px-6" style={{ background: 'oklch(0.13 0 0)' }}>
        <div className="max-w-5xl mx-auto">
          <FadeIn>
            <p className="text-xs font-black tracking-widest uppercase mb-4" style={{ color: 'oklch(0.70 0.19 46)' }}>Come funziona</p>
            <h2 className="font-black tracking-tighter mb-14"
              style={{ fontSize: 'clamp(1.8rem, 5vw, 3.2rem)', fontFamily: 'Syne, sans-serif' }}>
              Operativo in 4 passi.
            </h2>
          </FadeIn>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {STEPS.map((step, i) => (
              <FadeIn key={step.num} delay={i * 0.1}>
                <div className="relative p-6 rounded-2xl h-full" style={{ background: 'oklch(0.16 0 0)', border: '1px solid oklch(1 0 0 / 7%)' }}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm mb-4"
                    style={{ background: 'oklch(0.70 0.19 46 / 15%)', color: 'oklch(0.70 0.19 46)', fontFamily: 'Syne, sans-serif' }}>
                    {step.num}
                  </div>
                  <h3 className="font-black text-base mb-2 tracking-tight" style={{ color: 'oklch(0.97 0 0)', fontFamily: 'Syne, sans-serif' }}>{step.title}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: 'oklch(0.52 0 0)', fontFamily: 'Inter, sans-serif' }}>{step.body}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── COACH SECTION ── */}
      <section id="coach" className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <FadeIn>
            <div className="mb-14">
              <p className="text-xs font-black tracking-widest uppercase mb-3" style={{ color: 'oklch(0.70 0.19 46)' }}>Per i Coach</p>
              <h2 className="font-black tracking-tighter leading-none mb-4"
                style={{ fontSize: 'clamp(2rem, 6vw, 4.5rem)', fontFamily: 'Syne, sans-serif' }}>
                Meno clienti persi.<br />
                <span style={{ color: 'oklch(0.70 0.19 46)' }}>Più rinnovi.</span>
              </h2>
              <p className="text-base max-w-xl leading-relaxed" style={{ color: 'oklch(0.50 0 0)', fontFamily: 'Inter, sans-serif' }}>
                Dall'anamnesi iniziale alla progressione automatica dei carichi, dal piano pasti agli appuntamenti check-in.
                Bynari batte CoachPlus e qualsiasi competitor su ogni singola feature — ed è pensato mobile-first come i tuoi clienti.
              </p>
            </div>
          </FadeIn>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {COACH_BENEFITS.map((f, i) => <FeatureCard key={f.num} {...f} delay={i * 0.1} />)}
          </div>
          <FadeIn delay={0.5}>
            <div className="mt-8 flex items-center gap-4">
              <Link href="/register"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all hover:brightness-110 active:scale-95"
                style={{ background: 'oklch(0.70 0.19 46)', color: 'oklch(0.11 0 0)' }}>
                Prova gratis con 3 clienti →
              </Link>
              <span className="text-xs" style={{ color: 'oklch(0.35 0 0)', fontFamily: 'Inter, sans-serif' }}>
                Nessuna carta · Beta gratuita
              </span>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── PER CHI È / NON È ── */}
      <section className="py-24 px-6" style={{ background: 'oklch(0.13 0 0)' }}>
        <div className="max-w-4xl mx-auto">
          <FadeIn>
            <p className="text-xs font-black tracking-widest uppercase mb-4" style={{ color: 'oklch(0.70 0.19 46)' }}>Fa per te?</p>
            <h2 className="font-black tracking-tighter mb-12"
              style={{ fontSize: 'clamp(1.8rem, 5vw, 3.2rem)', fontFamily: 'Syne, sans-serif' }}>
              Bynari è per te se...
            </h2>
          </FadeIn>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FadeIn delay={0.1}>
              <div className="p-6 rounded-2xl h-full" style={{ background: 'oklch(0.70 0.19 46 / 6%)', border: '1px solid oklch(0.70 0.19 46 / 25%)' }}>
                <p className="font-black text-sm mb-4 uppercase tracking-widest" style={{ color: 'oklch(0.70 0.19 46)' }}>✓ È per te</p>
                {[
                  'Hai 5+ clienti attivi e vuoi tenerli il più a lungo possibile',
                  'Perdi troppo tempo su schede, messaggi e aggiornamenti manuali',
                  'Hai già perso clienti senza capire il motivo',
                  'Vuoi monitorare i progressi senza fare tutto a mano',
                  'Cerchi uno strumento professionale, non un foglio Excel',
                ].map((item) => (
                  <div key={item} className="flex items-start gap-3 mb-3">
                    <span className="mt-0.5 text-sm shrink-0" style={{ color: 'oklch(0.70 0.19 46)' }}>✓</span>
                    <p className="text-sm leading-relaxed" style={{ color: 'oklch(0.70 0 0)', fontFamily: 'Inter, sans-serif' }}>{item}</p>
                  </div>
                ))}
              </div>
            </FadeIn>
            <FadeIn delay={0.2}>
              <div className="p-6 rounded-2xl h-full" style={{ background: 'oklch(0.16 0 0)', border: '1px solid oklch(1 0 0 / 7%)' }}>
                <p className="font-black text-sm mb-4 uppercase tracking-widest" style={{ color: 'oklch(0.45 0 0)' }}>✗ Non è per te</p>
                {[
                  'Hai solo 1–2 clienti e gestisci tutto via WhatsApp',
                  'Cerchi un software con CRM, fatturazione e contabilità integrata',
                  'Vuoi uno strumento per palestre con 50+ istruttori',
                  'Non hai intenzione di usare la tecnologia nel tuo lavoro',
                ].map((item) => (
                  <div key={item} className="flex items-start gap-3 mb-3">
                    <span className="mt-0.5 text-sm shrink-0" style={{ color: 'oklch(0.45 0 0)' }}>✗</span>
                    <p className="text-sm leading-relaxed" style={{ color: 'oklch(0.45 0 0)', fontFamily: 'Inter, sans-serif' }}>{item}</p>
                  </div>
                ))}
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* ── DIVIDER ── */}
      <div className="px-6">
        <div className="max-w-5xl mx-auto h-px" style={{ background: 'linear-gradient(to right, transparent, oklch(0.70 0.19 46 / 30%), transparent)' }} />
      </div>

      {/* ── ATLETA SECTION ── */}
      <section id="atleti" className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <FadeIn>
            <div className="mb-14 text-right">
              <p className="text-xs font-black tracking-widest uppercase mb-3" style={{ color: 'oklch(0.70 0.19 46)' }}>Per gli Atleti</p>
              <h2 className="font-black tracking-tighter leading-none mb-4"
                style={{ fontSize: 'clamp(2rem, 6vw, 4.5rem)', fontFamily: 'Syne, sans-serif' }}>
                Allenati con un piano.<br />
                <span style={{ color: 'oklch(0.70 0.19 46)' }}>Vedi i numeri crescere.</span>
              </h2>
              <p className="text-base max-w-xl ml-auto leading-relaxed" style={{ color: 'oklch(0.50 0 0)', fontFamily: 'Inter, sans-serif' }}>
                Con o senza coach. Crea la tua scheda, logga ogni allenamento e
                smetti di allenarti a memoria senza sapere se stai davvero progredendo.
              </p>
            </div>
          </FadeIn>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {ATLETA_FEATURES.map((f, i) => <FeatureCard key={f.num} {...f} delay={i * 0.1} />)}
          </div>
          <FadeIn delay={0.4}>
            <div className="mt-8 flex items-center justify-end gap-4">
              <span className="text-xs" style={{ color: 'oklch(0.35 0 0)', fontFamily: 'Inter, sans-serif' }}>Piano free · 1 scheda · 3 giorni</span>
              <Link href="/register"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all hover:opacity-80 active:scale-95"
                style={{ background: 'oklch(0.18 0 0)', color: 'oklch(0.97 0 0)', border: '1px solid oklch(1 0 0 / 15%)' }}>
                Inizia gratis →
              </Link>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section id="pricing" className="py-24 px-6" style={{ background: 'oklch(0.13 0 0)' }}>
        <div className="max-w-3xl mx-auto text-center">
          <FadeIn>
            <p className="text-xs font-black tracking-widest uppercase mb-4" style={{ color: 'oklch(0.70 0.19 46)' }}>Pricing</p>
            <h2 className="font-black tracking-tighter mb-4"
              style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)', fontFamily: 'Syne, sans-serif' }}>
              Inizia gratis.<br />
              <span style={{ color: 'oklch(0.70 0.19 46)' }}>Blocca il prezzo di lancio.</span>
            </h2>
            <p className="text-base mb-12 leading-relaxed" style={{ color: 'oklch(0.50 0 0)', fontFamily: 'Inter, sans-serif' }}>
              Durante la beta tutto è gratuito. Chi si registra ora blocca il prezzo speciale
              prima che i piani a pagamento partano.
            </p>
          </FadeIn>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-14">
            {[
              {
                name: 'Free', price: '0€', period: 'per sempre',
                color: 'oklch(0.60 0.15 200)',
                features: ['1 scheda', '3 giorni per scheda', 'Logger allenamento', 'Share card'],
                cta: 'Inizia gratis', href: '/register', highlight: false,
              },
              {
                name: 'Pro', price: '???', period: 'coming soon',
                color: 'oklch(0.70 0.19 46)',
                features: ['Schede illimitate', 'Triple Progression automatica', 'e1RM & grafici forza', 'Muscoli & benessere analytics', 'Check-in & misurazioni', 'Nutrizione & tracciamento pasti', 'Share card highlight'],
                cta: 'Avvisami al lancio', href: '#waitlist', highlight: true,
              },
              {
                name: 'Coach', price: '???', period: 'coming soon',
                color: 'oklch(0.65 0.18 150)',
                features: ['Clienti illimitati', '7 alert intelligenti', 'Analytics avanzate + export PDF', 'Anamnesi corporea clienti', 'Piano nutrizionale + pasti + integratori', 'Appuntamenti check-in con reminder push', 'Chat integrata con allegati scheda/sessione', 'Triple Progression automatica'],
                cta: 'Avvisami al lancio', href: '#waitlist', highlight: false,
              },
            ].map((plan, i) => (
              <FadeIn key={plan.name} delay={i * 0.1}>
                <div className="relative rounded-2xl p-6 h-full flex flex-col text-left"
                  style={{
                    background: plan.highlight ? 'oklch(0.70 0.19 46 / 8%)' : 'oklch(0.16 0 0)',
                    border: `1px solid ${plan.highlight ? 'oklch(0.70 0.19 46 / 40%)' : 'oklch(1 0 0 / 7%)'}`,
                  }}>
                  {plan.highlight && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs font-black"
                      style={{ background: 'oklch(0.70 0.19 46)', color: 'oklch(0.11 0 0)' }}>
                      EARLY ACCESS
                    </div>
                  )}
                  <p className="text-xs font-black tracking-widest uppercase mb-3" style={{ color: plan.color }}>{plan.name}</p>
                  <div className="mb-6">
                    <span className="text-4xl font-black tracking-tight" style={{ fontFamily: 'Syne, sans-serif' }}>{plan.price}</span>
                    <span className="text-sm ml-2" style={{ color: 'oklch(0.40 0 0)', fontFamily: 'Inter, sans-serif' }}>{plan.period}</span>
                  </div>
                  <ul className="space-y-2.5 flex-1 mb-6">
                    {plan.features.map(f => (
                      <li key={f} className="flex items-center gap-2.5 text-sm" style={{ color: 'oklch(0.65 0 0)', fontFamily: 'Inter, sans-serif' }}>
                        <span style={{ color: plan.color }}>✓</span> {f}
                      </li>
                    ))}
                  </ul>
                  <a href={plan.href}
                    className="w-full py-3 rounded-xl font-bold text-sm text-center transition-all hover:scale-105 active:scale-95 block"
                    style={{
                      background: plan.highlight ? 'oklch(0.70 0.19 46)' : 'oklch(0.22 0 0)',
                      color: plan.highlight ? 'oklch(0.11 0 0)' : 'oklch(0.60 0 0)',
                      border: plan.highlight ? 'none' : '1px solid oklch(1 0 0 / 10%)',
                    }}>
                    {plan.cta}
                  </a>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA FINALE ── */}
      <section className="py-28 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <FadeIn>
            <div className="relative p-10 md:p-16 rounded-3xl overflow-hidden" style={{
              background: 'oklch(0.16 0 0)',
              border: '1px solid oklch(0.70 0.19 46 / 20%)',
            }}>
              <div className="absolute inset-0" style={{
                background: 'radial-gradient(ellipse 70% 60% at 50% 100%, oklch(0.70 0.19 46 / 10%) 0%, transparent 70%)',
              }} />
              <div className="relative z-10">
                <h2 className="font-black tracking-tighter mb-4 leading-tight"
                  style={{ fontSize: 'clamp(1.8rem, 5vw, 3.5rem)', fontFamily: 'Syne, sans-serif' }}>
                  Il prossimo cliente che stava<br />per mollare{' '}
                  <span style={{ color: 'oklch(0.70 0.19 46)' }}>lo tieni.</span>
                </h2>
                <p className="text-base mb-10 leading-relaxed" style={{ color: 'oklch(0.52 0 0)', fontFamily: 'Inter, sans-serif' }}>
                  Registrati gratis oggi. Nessuna carta di credito, nessun vincolo.
                  Inizia con 3 clienti e vedi la differenza.
                </p>
                <Link href="/register"
                  className="group inline-flex items-center gap-3 px-10 py-4 rounded-2xl font-black text-base transition-all active:scale-95 hover:brightness-110"
                  style={{ background: 'oklch(0.70 0.19 46)', color: 'oklch(0.11 0 0)' }}>
                  Prova gratis con 3 clienti
                  <span className="transition-transform group-hover:translate-x-1">→</span>
                </Link>
                <p className="mt-5 text-xs" style={{ color: 'oklch(0.35 0 0)', fontFamily: 'Inter, sans-serif' }}>
                  Setup in 2 minuti · Beta gratuita · Nessun obbligo
                </p>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── WAITLIST ── */}
      <section id="waitlist" className="py-24 px-6" style={{ background: 'oklch(0.13 0 0)' }}>
        <div className="max-w-xl mx-auto text-center">
          <FadeIn>
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl mx-auto mb-6"
              style={{ background: 'oklch(0.70 0.19 46 / 15%)', color: 'oklch(0.70 0.19 46)' }}>⚡</div>
            <h2 className="font-black tracking-tighter mb-3" style={{ fontSize: '2.2rem', fontFamily: 'Syne, sans-serif' }}>
              Vuoi il prezzo di lancio?
            </h2>
            <p className="text-sm mb-8 leading-relaxed" style={{ color: 'oklch(0.50 0 0)', fontFamily: 'Inter, sans-serif' }}>
              I piani Pro e Coach arriveranno presto. Lascia la tua email
              e ti avvisiamo prima di tutti con un prezzo riservato.
            </p>
            {submitted ? (
              <div className="px-6 py-4 rounded-2xl" style={{ background: 'oklch(0.65 0.18 150 / 15%)', border: '1px solid oklch(0.65 0.18 150 / 30%)' }}>
                <p className="font-bold" style={{ color: 'oklch(0.65 0.18 150)' }}>✓ Sei in lista!</p>
                <p className="text-sm mt-1" style={{ color: 'oklch(0.50 0 0)', fontFamily: 'Inter, sans-serif' }}>Ti contatteremo non appena il piano sarà disponibile.</p>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row gap-3">
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="la@tua.email"
                  className="flex-1 px-4 py-3 rounded-xl text-sm outline-none"
                  style={{ background: 'oklch(0.16 0 0)', border: '1px solid oklch(1 0 0 / 10%)', color: 'oklch(0.97 0 0)', fontFamily: 'Inter, sans-serif' }}
                  onFocus={e => e.target.style.borderColor = 'oklch(0.70 0.19 46)'}
                  onBlur={e => e.target.style.borderColor = 'oklch(1 0 0 / 10%)'}
                  onKeyDown={e => e.key === 'Enter' && email && setSubmitted(true)} />
                <button onClick={() => email && setSubmitted(true)}
                  className="px-6 py-3 rounded-xl font-bold text-sm transition-all hover:brightness-110 active:scale-95"
                  style={{ background: 'oklch(0.70 0.19 46)', color: 'oklch(0.11 0 0)' }}>
                  Avvisami
                </button>
              </div>
            )}
          </FadeIn>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="py-10 px-6" style={{ borderTop: '1px solid oklch(1 0 0 / 6%)' }}>
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img src="/logo/Bynari_WO1.png" alt="Bynari" style={{ height: '22px', width: 'auto' }} />
            <span className="text-xs" style={{ color: 'oklch(0.30 0 0)', fontFamily: 'Inter, sans-serif' }}>© 2026</span>
          </div>
          <div className="flex items-center gap-6">
            {[['Accedi', '/login'], ['Registrati', '/register'], ['Privacy Policy', '/privacy'], ['Termini di servizio', '/terms']].map(([label, href]) => (
              <Link key={label} href={href}
                className="text-xs font-medium hover:opacity-100"
                style={{ color: 'oklch(0.40 0 0)', fontFamily: 'Inter, sans-serif' }}>
                {label}
              </Link>
            ))}
          </div>
        </div>
      </footer>
    </div>
  )
}
