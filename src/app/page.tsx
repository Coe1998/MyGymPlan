'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'

// ── Intersection Observer hook ──────────────────────────────────
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

// ── Data ────────────────────────────────────────────────────────
const COACH_BENEFITS = [
  {
    num: '01',
    title: 'Sai chi sta per mollare',
    body: 'Vedi in tempo reale chi non si allena da giorni, chi ha i livelli di stress alle stelle, chi non dorme. Intervieni prima che sparisca.',
  },
  {
    num: '02',
    title: 'Schede pronte in 3 minuti',
    body: 'Crea una scheda, salvala come template, assegnala a più clienti in un tap. Niente più copie manuali o file Excel.',
  },
  {
    num: '03',
    title: 'I clienti si allenano davvero',
    body: 'App mobile che guida il cliente serie per serie, con timer automatico. Più autonomia per loro, meno messaggi alle 22 per te.',
  },
  {
    num: '04',
    title: 'Tutto in un posto solo',
    body: 'Scheda di allenamento, piano alimentare PDF, messaggi, progressi. Smetti di usare 4 app diverse per ogni cliente.',
  },
]

const ATLETA_FEATURES = [
  { num: '01', title: 'Logga ogni serie in secondi', body: 'Peso, reps, recupero automatico. Confronto immediato con la sessione precedente. Niente distrazioni.' },
  { num: '02', title: 'Vedi i progressi davvero', body: 'Grafici peso massimo e volume per esercizio. La curva di forza che cresce settimana dopo settimana.' },
  { num: '03', title: 'Condividi i tuoi risultati', body: 'Card stile Strava con i tuoi highlight. Un tap e la condividi dove vuoi.' },
  { num: '04', title: 'Tieni traccia di come stai', body: 'Check-in energía, sonno, stress. Capisce quando spingerti e quando rallentare.' },
]

const STEPS = [
  { num: '1', title: 'Crea il tuo account', body: 'Registrazione in 30 secondi. Nessuna carta di credito.' },
  { num: '2', title: 'Aggiungi i tuoi clienti', body: 'Via email o link invito. Il cliente scarica l\'app e parte.' },
  { num: '3', title: 'Assegna le schede', body: 'Crea o duplica una scheda, assegnala, imposta le date. Fatto.' },
  { num: '4', title: 'Monitora tutto', body: 'Dashboard in tempo reale. Sai esattamente come sta andando ognuno.' },
]

// ── Components ──────────────────────────────────────────────────
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

// ── Page ────────────────────────────────────────────────────────
export default function LandingPage() {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const heroRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onScroll = () => {
      if (heroRef.current) {
        heroRef.current.style.transform = `translateY(${window.scrollY * 0.3}px)`
        heroRef.current.style.opacity = `${1 - window.scrollY / 500}`
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
          background: 'oklch(0.11 0 0 / 80%)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid oklch(1 0 0 / 6%)',
          paddingTop: 'calc(env(safe-area-inset-top) + 1rem)',
          paddingBottom: '1rem',
        }}>
        <div>
          <img src="/logo/Bynari_WO1.png" alt="Bynari" style={{ height: '26px', width: 'auto' }} />
        </div>
        <div className="hidden md:flex items-center gap-8">
          {[['Come funziona', '#come-funziona'], ['Coach', '#coach'], ['Atleti', '#atleti'], ['Pricing', '#pricing']].map(([label, href]) => (
            <a key={label} href={href}
              className="text-sm font-medium transition-colors"
              style={{ color: 'oklch(0.50 0 0)' }}
              onMouseEnter={e => (e.currentTarget.style.color = 'oklch(0.97 0 0)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'oklch(0.50 0 0)')}>
              {label}
            </a>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login"
            className="hidden sm:block text-sm font-semibold px-4 py-2 rounded-xl transition-all"
            style={{ color: 'oklch(0.60 0 0)' }}>
            Accedi
          </Link>
          <Link href="/register"
            className="text-sm font-bold px-4 py-2 rounded-xl transition-all active:scale-95"
            style={{ background: 'oklch(0.70 0.19 46)', color: 'oklch(0.11 0 0)' }}>
            Prova gratis
          </Link>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 5rem)' }}>
        {/* Background grid */}
        <div className="absolute inset-0" style={{
          backgroundImage: `linear-gradient(oklch(1 0 0 / 3%) 1px, transparent 1px), linear-gradient(90deg, oklch(1 0 0 / 3%) 1px, transparent 1px)`,
          backgroundSize: '60px 60px',
        }} />
        {/* Radial glow */}
        <div className="absolute inset-0" style={{
          background: 'radial-gradient(ellipse 80% 50% at 50% 40%, oklch(0.70 0.19 46 / 12%) 0%, transparent 70%)',
        }} />
        <div className="absolute top-0 right-0 w-px h-full opacity-20"
          style={{ background: 'linear-gradient(to bottom, transparent, oklch(0.70 0.19 46), transparent)' }} />

        <div ref={heroRef} className="relative z-10 text-center px-6 max-w-5xl mx-auto">
          {/* Tag */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-8 text-xs font-bold tracking-widest uppercase"
            style={{ background: 'oklch(0.70 0.19 46 / 12%)', border: '1px solid oklch(0.70 0.19 46 / 30%)', color: 'oklch(0.70 0.19 46)' }}>
            <span className="w-1.5 h-1.5 rounded-full animate-pulse inline-block" style={{ background: 'oklch(0.70 0.19 46)' }} />
            Ora in beta · Accesso gratuito
          </div>

          {/* Headline */}
          <h1 className="font-black tracking-tighter leading-none mb-6" style={{
            fontSize: 'clamp(2.6rem, 9vw, 7.5rem)',
            fontFamily: 'Syne, sans-serif',
            letterSpacing: '-0.04em',
          }}>
            I tuoi clienti si allenano.<br />
            <span style={{ color: 'oklch(0.70 0.19 46)' }}>Tu sai tutto.</span>
          </h1>

          {/* Subheadline */}
          <p className="text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed"
            style={{ color: 'oklch(0.52 0 0)', fontFamily: 'Inter, sans-serif', fontWeight: 400 }}>
            Bynari è il software per personal trainer che vuole smettere di perdere clienti,
            risparmiare tempo sulla gestione e capire davvero come sta andando ognuno.
          </p>

          {/* Dual CTA */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/register"
              className="group flex items-center gap-3 px-8 py-4 rounded-2xl font-black text-base transition-all active:scale-95 hover:scale-105"
              style={{ background: 'oklch(0.70 0.19 46)', color: 'oklch(0.11 0 0)', minWidth: 220 }}>
              Inizia con 3 clienti gratis
              <span className="transition-transform group-hover:translate-x-1">→</span>
            </Link>
            <Link href="/register"
              className="group flex items-center gap-3 px-8 py-4 rounded-2xl font-black text-base transition-all active:scale-95 hover:scale-105"
              style={{ background: 'oklch(0.18 0 0)', color: 'oklch(0.97 0 0)', border: '1px solid oklch(1 0 0 / 12%)', minWidth: 200 }}>
              Sono un Atleta
              <span className="transition-transform group-hover:translate-x-1">→</span>
            </Link>
          </div>

          <p className="mt-8 text-xs" style={{ color: 'oklch(0.35 0 0)', fontFamily: 'Inter, sans-serif' }}>
            Nessuna carta di credito · Setup in 2 minuti · Cancella quando vuoi
          </p>
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-32"
          style={{ background: 'linear-gradient(to bottom, transparent, oklch(0.11 0 0))' }} />
      </section>

      {/* ── PROBLEMA ── */}
      <section className="py-24 px-6" style={{ background: 'oklch(0.13 0 0)' }}>
        <div className="max-w-4xl mx-auto">
          <FadeIn>
            <p className="text-xs font-black tracking-widest uppercase mb-4" style={{ color: 'oklch(0.70 0.19 46)' }}>
              Il problema
            </p>
            <h2 className="font-black tracking-tighter mb-6 leading-tight"
              style={{ fontSize: 'clamp(1.8rem, 5vw, 3.2rem)', fontFamily: 'Syne, sans-serif' }}>
              Gestire i clienti oggi è un&apos;altro lavoro.
            </h2>
          </FadeIn>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-10">
            {[
              { icon: '📋', title: 'Schede su Excel, WhatsApp e PDF', body: 'Ogni cliente ha la scheda in un posto diverso. Aggiornarle richiede più tempo che allenarli.' },
              { icon: '👻', title: 'Clienti che spariscono', body: 'Non sai chi non si allena da una settimana. Quando te ne accorgi, si sono già disiscritti.' },
              { icon: '🕐', title: 'Ore perse in gestione', body: 'Messaggi, aggiornamenti, controlli manuali. Tempo sottratto ai clienti che puoi realmente aiutare.' },
            ].map((item, i) => (
              <FadeIn key={item.title} delay={i * 0.1}>
                <div className="p-6 rounded-2xl h-full" style={{
                  background: 'oklch(0.16 0 0)',
                  border: '1px solid oklch(1 0 0 / 7%)',
                }}>
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
      <section className="py-20 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <FadeIn>
            <p className="text-xs font-black tracking-widest uppercase mb-4" style={{ color: 'oklch(0.70 0.19 46)' }}>La soluzione</p>
            <h2 className="font-black tracking-tighter mb-6 leading-tight"
              style={{ fontSize: 'clamp(1.8rem, 5vw, 3.2rem)', fontFamily: 'Syne, sans-serif' }}>
              Un posto solo per tutto.<br />
              <span style={{ color: 'oklch(0.70 0.19 46)' }}>Niente più caos.</span>
            </h2>
            <p className="text-base leading-relaxed" style={{ color: 'oklch(0.52 0 0)', fontFamily: 'Inter, sans-serif' }}>
              Bynari mette insieme schede, allenamenti, progressi e comunicazione in una sola app.
              I tuoi clienti si allenano meglio. Tu lavori meno. E tieni tutto sotto controllo.
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
              Parti in 4 passi.
            </h2>
          </FadeIn>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {STEPS.map((step, i) => (
              <FadeIn key={step.num} delay={i * 0.1}>
                <div className="relative p-6 rounded-2xl h-full" style={{
                  background: 'oklch(0.16 0 0)',
                  border: '1px solid oklch(1 0 0 / 7%)',
                }}>
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
                Perdi meno clienti.<br />
                <span style={{ color: 'oklch(0.70 0.19 46)' }}>Guadagna di più.</span>
              </h2>
              <p className="text-base max-w-xl leading-relaxed" style={{ color: 'oklch(0.50 0 0)', fontFamily: 'Inter, sans-serif' }}>
                Ogni cliente che abbandona è un mancato rinnovo. Bynari ti aiuta a tenerli attivi,
                motivati e convinti che valga la pena continuare con te.
              </p>
            </div>
          </FadeIn>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {COACH_BENEFITS.map((f, i) => (
              <FeatureCard key={f.num} {...f} delay={i * 0.1} />
            ))}
          </div>

          <FadeIn delay={0.4}>
            <div className="mt-8 flex items-center gap-4">
              <Link href="/register"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all hover:scale-105 active:scale-95"
                style={{ background: 'oklch(0.70 0.19 46)', color: 'oklch(0.11 0 0)' }}>
                Inizia con 3 clienti gratis →
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
              <div className="p-6 rounded-2xl h-full" style={{
                background: 'oklch(0.70 0.19 46 / 6%)',
                border: '1px solid oklch(0.70 0.19 46 / 25%)',
              }}>
                <p className="font-black text-sm mb-4 uppercase tracking-widest" style={{ color: 'oklch(0.70 0.19 46)' }}>✓ È per te</p>
                {[
                  'Sei un personal trainer con 5+ clienti attivi',
                  'Passi troppo tempo a gestire schede e messaggi',
                  'Hai perso clienti senza capire perché',
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
              <div className="p-6 rounded-2xl h-full" style={{
                background: 'oklch(0.16 0 0)',
                border: '1px solid oklch(1 0 0 / 7%)',
              }}>
                <p className="font-black text-sm mb-4 uppercase tracking-widest" style={{ color: 'oklch(0.45 0 0)' }}>✗ Non è per te</p>
                {[
                  'Hai solo 1–2 clienti e gestisci tutto via WhatsApp',
                  'Cerchi un software con CRM, fatturazione e contabilità',
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
                Con o senza un coach. Crea la tua scheda, logga ogni allenamento e
                smetti di allenarti a memoria senza sapere se stai progredendo.
              </p>
            </div>
          </FadeIn>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {ATLETA_FEATURES.map((f, i) => (
              <FeatureCard key={f.num} {...f} delay={i * 0.1} />
            ))}
          </div>

          <FadeIn delay={0.4}>
            <div className="mt-8 flex items-center justify-end gap-4">
              <span className="text-xs" style={{ color: 'oklch(0.35 0 0)', fontFamily: 'Inter, sans-serif' }}>
                Piano free · 1 scheda · 3 giorni
              </span>
              <Link href="/register"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all hover:scale-105 active:scale-95"
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
              <span style={{ color: 'oklch(0.70 0.19 46)' }}>Cresci quando sei pronto.</span>
            </h2>
            <p className="text-base mb-12 leading-relaxed" style={{ color: 'oklch(0.50 0 0)', fontFamily: 'Inter, sans-serif' }}>
              Durante la beta tutto è gratuito. Registrati adesso e blocchi
              il prezzo di lancio prima che i piani a pagamento partano.
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
                features: ['Schede illimitate', 'Giorni illimitati', 'Progressi & grafici', 'Foto & misurazioni', 'Check-in benessere'],
                cta: 'Avvisami al lancio', href: '#waitlist', highlight: true,
              },
              {
                name: 'Coach', price: '???', period: 'coming soon',
                color: 'oklch(0.65 0.18 150)',
                features: ['Tutto il Pro', 'Clienti illimitati', 'Dashboard analytics', 'PDF alimentare', 'Alert clienti inattivi'],
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
                  Smetti di perdere clienti<br />
                  <span style={{ color: 'oklch(0.70 0.19 46)' }}>per mancanza di attenzione.</span>
                </h2>
                <p className="text-base mb-10 leading-relaxed" style={{ color: 'oklch(0.52 0 0)', fontFamily: 'Inter, sans-serif' }}>
                  Registrati gratis oggi. Inizia a usarlo con i tuoi clienti.
                  Nessuna carta di credito, nessun vincolo.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                  <Link href="/register"
                    className="group flex items-center gap-3 px-10 py-4 rounded-2xl font-black text-base transition-all active:scale-95 hover:scale-105"
                    style={{ background: 'oklch(0.70 0.19 46)', color: 'oklch(0.11 0 0)', minWidth: 240 }}>
                    Inizia con 3 clienti gratis
                    <span className="transition-transform group-hover:translate-x-1">→</span>
                  </Link>
                </div>
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
              style={{ background: 'oklch(0.70 0.19 46 / 15%)', color: 'oklch(0.70 0.19 46)' }}>
              ⚡
            </div>
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
                <p className="text-sm mt-1" style={{ color: 'oklch(0.50 0 0)', fontFamily: 'Inter, sans-serif' }}>
                  Ti contatteremo non appena il piano sarà disponibile.
                </p>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="la@tua.email"
                  className="flex-1 px-4 py-3 rounded-xl text-sm outline-none"
                  style={{ background: 'oklch(0.16 0 0)', border: '1px solid oklch(1 0 0 / 10%)', color: 'oklch(0.97 0 0)', fontFamily: 'Inter, sans-serif' }}
                  onFocus={e => e.target.style.borderColor = 'oklch(0.70 0.19 46)'}
                  onBlur={e => e.target.style.borderColor = 'oklch(1 0 0 / 10%)'}
                  onKeyDown={e => e.key === 'Enter' && email && setSubmitted(true)}
                />
                <button
                  onClick={() => email && setSubmitted(true)}
                  className="px-6 py-3 rounded-xl font-bold text-sm transition-all hover:scale-105 active:scale-95"
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
            {[['Accedi', '/login'], ['Registrati', '/register']].map(([label, href]) => (
              <Link key={label} href={href}
                className="text-xs font-medium transition-opacity hover:opacity-100"
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
