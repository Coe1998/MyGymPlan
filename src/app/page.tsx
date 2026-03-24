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
const COACH_FEATURES = [
  { num: '01', title: 'Gestione clienti', body: 'Aggiungi atleti via email, monitora la loro attività e ricevi alert automatici quando qualcuno si ferma.' },
  { num: '02', title: 'Schede avanzate', body: 'Crea schede con giorni, esercizi e note. Duplica template, riordina con drag & drop, assegna in un tap.' },
  { num: '03', title: 'Analytics in tempo reale', body: 'Frequenza, volume, benessere, stress — tutto in un\'unica dashboard per prendere decisioni informate.' },
  { num: '04', title: 'Scheda alimentare', body: 'Carica un PDF per ogni cliente direttamente sull\'assegnazione. Nutrizione e allenamento, un\'unica piattaforma.' },
]

const ATLETA_FEATURES = [
  { num: '01', title: 'Workout logger', body: 'Logga peso e reps serie per serie. Il timer recupero parte in automatico. Confronta con l\'ultima sessione.' },
  { num: '02', title: 'Progressi visivi', body: 'Grafici peso massimo e volume per esercizio. Vedi la curva di forza crescere settimana dopo settimana.' },
  { num: '03', title: 'Share overlay', body: 'Genera una card stile Strava con i tuoi highlight di allenamento e condividila dove vuoi.' },
  { num: '04', title: 'Check-in settimanale', body: 'Registra energia, sonno, stress e motivazione. Il tuo coach riceve i dati in tempo reale.' },
]

const STATS = [
  { value: '∞', label: 'Esercizi nella libreria' },
  { value: '100%', label: 'Mobile first' },
  { value: '0€', label: 'Per iniziare' },
  { value: '1 tap', label: 'Per condividere' },
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
        {/* Accent line top */}
        <div className="absolute top-0 left-6 right-6 h-px transition-all duration-300"
          style={{ background: 'oklch(0.70 0.19 46 / 0%)', }}
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

  // Parallax hero text
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
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4"
        style={{ background: 'oklch(0.11 0 0 / 80%)', backdropFilter: 'blur(12px)', borderBottom: '1px solid oklch(1 0 0 / 6%)' }}>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm"
            style={{ background: 'oklch(0.70 0.19 46)', color: 'oklch(0.11 0 0)' }}>B</div>
          <span className="font-black text-lg tracking-tight">BYNARI</span>
        </div>
        <div className="hidden md:flex items-center gap-8">
          {['Coach', 'Atleti', 'Pricing'].map(item => (
            <a key={item} href={`#${item.toLowerCase()}`}
              className="text-sm font-medium transition-colors hover:opacity-100"
              style={{ color: 'oklch(0.50 0 0)' }}
              onMouseEnter={e => (e.currentTarget.style.color = 'oklch(0.97 0 0)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'oklch(0.50 0 0)')}>
              {item}
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
            Inizia gratis
          </Link>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20">
        {/* Background grid */}
        <div className="absolute inset-0" style={{
          backgroundImage: `linear-gradient(oklch(1 0 0 / 3%) 1px, transparent 1px), linear-gradient(90deg, oklch(1 0 0 / 3%) 1px, transparent 1px)`,
          backgroundSize: '60px 60px',
        }} />
        {/* Radial glow */}
        <div className="absolute inset-0" style={{
          background: 'radial-gradient(ellipse 80% 50% at 50% 40%, oklch(0.70 0.19 46 / 12%) 0%, transparent 70%)',
        }} />
        {/* Diagonal accent line */}
        <div className="absolute top-0 right-0 w-px h-full opacity-20"
          style={{ background: 'linear-gradient(to bottom, transparent, oklch(0.70 0.19 46), transparent)' }} />

        <div ref={heroRef} className="relative z-10 text-center px-6 max-w-5xl mx-auto">
          {/* Tag */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-8 text-xs font-bold tracking-widest uppercase"
            style={{ background: 'oklch(0.70 0.19 46 / 12%)', border: '1px solid oklch(0.70 0.19 46 / 30%)', color: 'oklch(0.70 0.19 46)' }}>
            <span className="w-1.5 h-1.5 rounded-full animate-pulse inline-block" style={{ background: 'oklch(0.70 0.19 46)' }} />
            Ora in beta · Registrati gratis
          </div>

          {/* Headline */}
          <h1 className="font-black tracking-tighter leading-none mb-6" style={{
            fontSize: 'clamp(3rem, 10vw, 8rem)',
            fontFamily: 'Syne, sans-serif',
            letterSpacing: '-0.04em',
          }}>
            ALLENA.<br />
            <span style={{ color: 'oklch(0.70 0.19 46)' }}>MIGLIORA.</span><br />
            DOMINA.
          </h1>

          <p className="text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed"
            style={{ color: 'oklch(0.52 0 0)', fontFamily: 'Inter, sans-serif', fontWeight: 400 }}>
            La piattaforma per coach e atleti che vogliono risultati concreti.
            Schede intelligenti, tracking preciso, analytics avanzate.
          </p>

          {/* Dual CTA */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/register"
              className="group flex items-center gap-3 px-8 py-4 rounded-2xl font-black text-base transition-all active:scale-95 hover:scale-105"
              style={{ background: 'oklch(0.70 0.19 46)', color: 'oklch(0.11 0 0)', minWidth: 200 }}>
              Sono un Coach
              <span className="transition-transform group-hover:translate-x-1">→</span>
            </Link>
            <Link href="/register"
              className="group flex items-center gap-3 px-8 py-4 rounded-2xl font-black text-base transition-all active:scale-95 hover:scale-105"
              style={{ background: 'oklch(0.18 0 0)', color: 'oklch(0.97 0 0)', border: '1px solid oklch(1 0 0 / 12%)', minWidth: 200 }}>
              Sono un Atleta
              <span className="transition-transform group-hover:translate-x-1">→</span>
            </Link>
          </div>

          {/* Social proof mini */}
          <p className="mt-8 text-xs" style={{ color: 'oklch(0.35 0 0)', fontFamily: 'Inter, sans-serif' }}>
            Nessuna carta di credito · Piano free sempre disponibile
          </p>
        </div>

        {/* Bottom fade */}
        <div className="absolute bottom-0 left-0 right-0 h-32"
          style={{ background: 'linear-gradient(to bottom, transparent, oklch(0.11 0 0))' }} />
      </section>

      {/* ── STATS BAR ── */}
      <section className="py-12 px-6" style={{ borderTop: '1px solid oklch(1 0 0 / 6%)', borderBottom: '1px solid oklch(1 0 0 / 6%)' }}>
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
          {STATS.map((s, i) => (
            <FadeIn key={s.label} delay={i * 0.1}>
              <div className="text-center">
                <p className="font-black text-3xl md:text-4xl tracking-tight mb-1"
                  style={{ color: 'oklch(0.70 0.19 46)', fontFamily: 'Syne, sans-serif' }}>
                  {s.value}
                </p>
                <p className="text-xs uppercase tracking-widest" style={{ color: 'oklch(0.40 0 0)' }}>
                  {s.label}
                </p>
              </div>
            </FadeIn>
          ))}
        </div>
      </section>

      {/* ── COACH SECTION ── */}
      <section id="coach" className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <FadeIn>
            <div className="mb-14">
              <p className="text-xs font-black tracking-widest uppercase mb-3"
                style={{ color: 'oklch(0.70 0.19 46)' }}>Per i Coach</p>
              <h2 className="font-black tracking-tighter leading-none mb-4"
                style={{ fontSize: 'clamp(2rem, 6vw, 4.5rem)', fontFamily: 'Syne, sans-serif' }}>
                Il tuo studio.<br />
                <span style={{ color: 'oklch(0.70 0.19 46)' }}>Sotto controllo.</span>
              </h2>
              <p className="text-base max-w-xl leading-relaxed"
                style={{ color: 'oklch(0.50 0 0)', fontFamily: 'Inter, sans-serif' }}>
                Gestisci tutti i tuoi atleti da un'unica dashboard. Crea schede professionali,
                monitora i progressi e intervieni prima che qualcuno si perda.
              </p>
            </div>
          </FadeIn>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {COACH_FEATURES.map((f, i) => (
              <FeatureCard key={f.num} {...f} delay={i * 0.1} />
            ))}
          </div>

          <FadeIn delay={0.4}>
            <div className="mt-8 flex items-center gap-4">
              <Link href="/register"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all hover:scale-105 active:scale-95"
                style={{ background: 'oklch(0.70 0.19 46)', color: 'oklch(0.11 0 0)' }}>
                Inizia come Coach →
              </Link>
              <span className="text-xs" style={{ color: 'oklch(0.35 0 0)', fontFamily: 'Inter, sans-serif' }}>
                Gratis · Nessun limite di clienti in beta
              </span>
            </div>
          </FadeIn>
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
              <p className="text-xs font-black tracking-widest uppercase mb-3"
                style={{ color: 'oklch(0.70 0.19 46)' }}>Per gli Atleti</p>
              <h2 className="font-black tracking-tighter leading-none mb-4"
                style={{ fontSize: 'clamp(2rem, 6vw, 4.5rem)', fontFamily: 'Syne, sans-serif' }}>
                Ogni rep.<br />
                <span style={{ color: 'oklch(0.70 0.19 46)' }}>Ogni kg.</span><br />
                Tracciato.
              </h2>
              <p className="text-base max-w-xl ml-auto leading-relaxed"
                style={{ color: 'oklch(0.50 0 0)', fontFamily: 'Inter, sans-serif' }}>
                Con o senza coach. Crea la tua scheda, logga ogni allenamento
                e guarda i numeri crescere nel tempo.
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
                Inizia come Atleta →
              </Link>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section id="pricing" className="py-24 px-6" style={{ background: 'oklch(0.13 0 0)' }}>
        <div className="max-w-3xl mx-auto text-center">
          <FadeIn>
            <p className="text-xs font-black tracking-widest uppercase mb-4"
              style={{ color: 'oklch(0.70 0.19 46)' }}>Pricing</p>
            <h2 className="font-black tracking-tighter mb-4"
              style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)', fontFamily: 'Syne, sans-serif' }}>
              Semplice.<br />
              <span style={{ color: 'oklch(0.70 0.19 46)' }}>Trasparente.</span>
            </h2>
            <p className="text-base mb-12 leading-relaxed"
              style={{ color: 'oklch(0.50 0 0)', fontFamily: 'Inter, sans-serif' }}>
              I piani a pagamento sono in arrivo. Oggi tutto è gratuito — registrati adesso
              e avrai accesso anticipato al piano Pro.
            </p>
          </FadeIn>

          {/* Pricing cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-14">
            {[
              {
                name: 'Free', price: '0€', period: 'per sempre',
                color: 'oklch(0.60 0.15 200)',
                features: ['1 scheda', '3 giorni per scheda', 'Logger allenamento', 'Share overlay'],
                cta: 'Inizia gratis', href: '/register', highlight: false,
              },
              {
                name: 'Pro', price: '???', period: 'coming soon',
                color: 'oklch(0.70 0.19 46)',
                features: ['Schede illimitate', 'Giorni illimitati', 'Grafici & progressi', 'Foto & misurazioni', 'Check-in settimanale'],
                cta: 'Notificami', href: '#waitlist', highlight: true,
              },
              {
                name: 'Coach', price: '???', period: 'coming soon',
                color: 'oklch(0.65 0.18 150)',
                features: ['Tutto il Pro', 'Clienti illimitati', 'Analytics avanzate', 'Scheda alimentare PDF', 'Alert automatici'],
                cta: 'Notificami', href: '#waitlist', highlight: false,
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
                  <p className="text-xs font-black tracking-widest uppercase mb-3"
                    style={{ color: plan.color }}>{plan.name}</p>
                  <div className="mb-6">
                    <span className="text-4xl font-black tracking-tight"
                      style={{ fontFamily: 'Syne, sans-serif' }}>{plan.price}</span>
                    <span className="text-sm ml-2" style={{ color: 'oklch(0.40 0 0)', fontFamily: 'Inter, sans-serif' }}>
                      {plan.period}
                    </span>
                  </div>
                  <ul className="space-y-2.5 flex-1 mb-6">
                    {plan.features.map(f => (
                      <li key={f} className="flex items-center gap-2.5 text-sm"
                        style={{ color: 'oklch(0.65 0 0)', fontFamily: 'Inter, sans-serif' }}>
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

      {/* ── WAITLIST ── */}
      <section id="waitlist" className="py-24 px-6">
        <div className="max-w-xl mx-auto text-center">
          <FadeIn>
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl mx-auto mb-6"
              style={{ background: 'oklch(0.70 0.19 46 / 15%)', color: 'oklch(0.70 0.19 46)' }}>
              ⚡
            </div>
            <h2 className="font-black tracking-tighter mb-3"
              style={{ fontSize: '2.2rem', fontFamily: 'Syne, sans-serif' }}>
              Sii il primo a sapere
            </h2>
            <p className="text-sm mb-8 leading-relaxed"
              style={{ color: 'oklch(0.50 0 0)', fontFamily: 'Inter, sans-serif' }}>
              I piani Pro e Coach arriveranno presto. Lascia la tua email
              per accedere in anteprima e ricevere un prezzo speciale al lancio.
            </p>

            {submitted ? (
              <div className="px-6 py-4 rounded-2xl"
                style={{ background: 'oklch(0.65 0.18 150 / 15%)', border: '1px solid oklch(0.65 0.18 150 / 30%)' }}>
                <p className="font-bold" style={{ color: 'oklch(0.65 0.18 150)' }}>✓ Sei in lista!</p>
                <p className="text-sm mt-1" style={{ color: 'oklch(0.50 0 0)', fontFamily: 'Inter, sans-serif' }}>
                  Ti contatteremo non appena il piano Pro sarà disponibile.
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
                  Iscriviti
                </button>
              </div>
            )}
          </FadeIn>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="py-10 px-6" style={{ borderTop: '1px solid oklch(1 0 0 / 6%)' }}>
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center font-black text-xs"
              style={{ background: 'oklch(0.70 0.19 46)', color: 'oklch(0.11 0 0)' }}>B</div>
            <span className="font-black text-sm tracking-tight">BYNARI</span>
            <span className="text-xs ml-2" style={{ color: 'oklch(0.30 0 0)', fontFamily: 'Inter, sans-serif' }}>
              © 2026
            </span>
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
