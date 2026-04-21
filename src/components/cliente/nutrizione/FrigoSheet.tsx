'use client'
import { useState, useEffect } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faMagnifyingGlass, faXmark, faWandMagicSparkles, faArrowLeft, faCheck, faClock } from '@fortawesome/free-solid-svg-icons'
import SheetShell from './SheetShell'

const QUICK_PICK = [
  { n: 'Pollo', i: '🍗' }, { n: 'Uova', i: '🥚' }, { n: 'Riso', i: '🍚' },
  { n: 'Avena', i: '🌾' }, { n: 'Tonno', i: '🐟' }, { n: 'Broccoli', i: '🥦' },
  { n: 'Patate', i: '🥔' }, { n: 'Yogurt', i: '🍶' }, { n: 'Pasta', i: '🍝' },
  { n: 'Olio EVO', i: '🫒' }, { n: 'Pomodori', i: '🍅' }, { n: 'Parmigiano', i: '🧀' },
]

interface Ricetta {
  nome: string; tempo: string; match: number
  usa: string[]; manca: string[]
  kcal: number; p: number; c: number; g: number
  copertura: { kcal: number; p: number; c: number; g: number }
}

const MOCK_RICETTE: Ricetta[] = [
  {
    nome: 'Bowl pollo & riso basmati', tempo: '20 min', match: 96,
    usa: ['Pollo', 'Riso', 'Broccoli', 'Olio EVO'], manca: [],
    kcal: 680, p: 48, c: 82, g: 12,
    copertura: { kcal: 72, p: 68, c: 78, g: 65 },
  },
  {
    nome: 'Insalata di tonno e patate', tempo: '15 min', match: 82,
    usa: ['Tonno', 'Patate', 'Pomodori', 'Olio EVO'], manca: ['Cipolla rossa'],
    kcal: 540, p: 38, c: 55, g: 16,
    copertura: { kcal: 57, p: 54, c: 52, g: 87 },
  },
  {
    nome: 'Omelette proteica e avena', tempo: '10 min', match: 75,
    usa: ['Uova', 'Avena', 'Parmigiano'], manca: ['Spinaci freschi'],
    kcal: 510, p: 42, c: 38, g: 18,
    copertura: { kcal: 54, p: 60, c: 36, g: 98 },
  },
]

interface Props {
  onClose: () => void
  kcalResidue: number
  onConfirma?: (ricetta: Ricetta, pasto: string) => void
}

export default function FrigoSheet({ onClose, kcalResidue, onConfirma }: Props) {
  const [step, setStep] = useState(1)
  const [ingredienti, setIngredienti] = useState<string[]>([])
  const [input, setInput] = useState('')
  const [selezionata, setSelezionata] = useState<Ricetta | null>(null)

  useEffect(() => {
    if (step === 2) {
      const t = setTimeout(() => setStep(3), 1800)
      return () => clearTimeout(t)
    }
  }, [step])

  const add = (n: string) => {
    const v = n.trim()
    if (!v || ingredienti.includes(v)) return
    setIngredienti(prev => [...prev, v])
    setInput('')
  }
  const remove = (n: string) => setIngredienti(prev => prev.filter(x => x !== n))

  const subtitles = [
    '', 'Dimmi cosa hai in casa',
    'Sto pensando alle migliori ricette…',
    `${ingredienti.length} ingredienti · scegli una ricetta`,
    'Pasto calcolato e salvato',
  ]

  return (
    <SheetShell
      title={step === 4 ? 'Aggiunto al diario' : 'Ho nel frigo'}
      subtitle={subtitles[step]}
      onClose={onClose}
    >
      {/* Stepper */}
      <div className="flex gap-1" style={{ padding: '0 20px 14px' }}>
        {[1,2,3,4].map(n => (
          <div key={n} style={{
            flex: 1, height: 3, borderRadius: 999,
            background: n <= step ? 'oklch(0.70 0.19 46)' : 'var(--c-22)',
            transition: 'background 300ms',
          }} />
        ))}
      </div>

      {/* Step 1 — Ingredienti */}
      {step === 1 && (
        <div style={{ padding: '0 20px' }}>
          {/* Input */}
          <div className="flex items-center gap-2" style={{
            padding: '10px 12px', borderRadius: 12,
            background: 'var(--c-16)', border: '1.5px solid oklch(0.70 0.19 46 / 35%)',
            marginBottom: 14,
          }}>
            <FontAwesomeIcon icon={faMagnifyingGlass} style={{ fontSize: 12, color: 'var(--c-55)' }} />
            <input value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && add(input)}
              placeholder="Es. peperoni rossi, lenticchie…"
              style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontSize: 13, color: 'var(--c-97)', fontFamily: 'inherit' }} />
            {input && (
              <button onClick={() => add(input)} style={{
                padding: '4px 9px', borderRadius: 7,
                background: 'oklch(0.70 0.19 46)', color: 'oklch(0.14 0.02 40)',
                fontSize: 11, fontWeight: 800,
              }}>Aggiungi</button>
            )}
          </div>

          {/* Tag cloud */}
          {ingredienti.length > 0 && (
            <div style={{
              padding: 12, borderRadius: 12,
              background: 'oklch(0.70 0.19 46 / 6%)',
              border: '1px solid oklch(0.70 0.19 46 / 18%)',
              marginBottom: 14,
            }}>
              <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.08em', color: 'oklch(0.70 0.19 46)', marginBottom: 8 }}>
                NEL TUO FRIGO · {ingredienti.length}
              </div>
              <div className="flex flex-wrap gap-2">
                {ingredienti.map(n => (
                  <button key={n} onClick={() => remove(n)} className="flex items-center gap-2" style={{
                    padding: '6px 10px', borderRadius: 999,
                    background: 'oklch(0.70 0.19 46 / 16%)',
                    border: '1px solid oklch(0.70 0.19 46 / 30%)',
                    color: 'var(--c-97)', fontSize: 11.5, fontWeight: 600,
                  }}>
                    {n}
                    <FontAwesomeIcon icon={faXmark} style={{ fontSize: 9, opacity: 0.6 }} />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Quick picks */}
          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.08em', color: 'var(--c-55)', marginBottom: 8 }}>
            AGGIUNTE VELOCI
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, marginBottom: 18 }}>
            {QUICK_PICK.filter(q => !ingredienti.includes(q.n)).map(q => (
              <button key={q.n} onClick={() => add(q.n)} className="flex items-center gap-2" style={{
                padding: '10px 8px', borderRadius: 10,
                background: 'var(--c-16)', border: '1px solid var(--c-w6)',
                color: 'var(--c-80)', fontSize: 11, fontWeight: 600, textAlign: 'left',
              }}>
                <span style={{ fontSize: 14 }}>{q.i}</span>{q.n}
              </button>
            ))}
          </div>

          <button disabled={ingredienti.length < 2} onClick={() => setStep(2)}
            className="w-full flex items-center justify-center gap-2"
            style={{
              padding: 14, borderRadius: 14,
              background: ingredienti.length >= 2
                ? 'linear-gradient(135deg, oklch(0.70 0.19 46), oklch(0.62 0.19 40))'
                : 'var(--c-20)',
              color: ingredienti.length >= 2 ? 'oklch(0.14 0.02 40)' : 'var(--c-45)',
              fontSize: 13.5, fontWeight: 800, letterSpacing: '0.01em',
              boxShadow: ingredienti.length >= 2 ? '0 10px 28px -12px oklch(0.70 0.19 46 / 60%)' : 'none',
            }}>
            <FontAwesomeIcon icon={faWandMagicSparkles} />
            {ingredienti.length < 2 ? 'Aggiungi almeno 2 ingredienti' : `Trova ricette con ${ingredienti.length}`}
          </button>
          <div style={{ fontSize: 10.5, color: 'var(--c-45)', textAlign: 'center', marginTop: 10, lineHeight: 1.45 }}>
            L&apos;AI userà <span style={{ color: 'var(--c-80)', fontWeight: 700 }}>{kcalResidue} kcal</span> residue
            e i tuoi macro target per proporre ricette equilibrate.
          </div>
        </div>
      )}

      {/* Step 2 — AI thinking */}
      {step === 2 && (
        <div style={{ padding: '30px 20px 40px', textAlign: 'center' }}>
          <div className="flex items-center justify-center" style={{
            width: 56, height: 56, borderRadius: '50%',
            background: 'oklch(0.70 0.19 46 / 15%)',
            border: '1px solid oklch(0.70 0.19 46 / 30%)',
            margin: '0 auto 14px',
            animation: 'pulse 1.4s ease-in-out infinite',
          }}>
            <FontAwesomeIcon icon={faWandMagicSparkles} style={{ fontSize: 20, color: 'oklch(0.70 0.19 46)' }} />
          </div>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--c-90)' }}>
            Incrocio {ingredienti.length} ingredienti…
          </div>
          <div style={{ fontSize: 11, color: 'var(--c-50)', marginTop: 6 }}>
            Controllo database ricette · calcolo macro · ordino per fit
          </div>
          <div style={{ height: 2, borderRadius: 999, background: 'var(--c-22)', maxWidth: 180, margin: '22px auto 0', overflow: 'hidden' }}>
            <div style={{ height: '100%', background: 'oklch(0.70 0.19 46)', animation: 'slideThink 1.8s ease-out forwards' }} />
          </div>
        </div>
      )}

      {/* Step 3 — Ricette */}
      {step === 3 && (
        <div style={{ padding: '0 20px 20px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {MOCK_RICETTE.map((r, i) => (
              <button key={i} onClick={() => { setSelezionata(r); setStep(4) }}
                style={{
                  textAlign: 'left', padding: 14, borderRadius: 16,
                  background: 'var(--c-16)',
                  border: i === 0 ? '1.5px solid oklch(0.70 0.19 46 / 35%)' : '1px solid var(--c-w6)',
                  boxShadow: i === 0 ? '0 8px 20px -10px oklch(0.70 0.19 46 / 30%)' : 'none',
                  position: 'relative', width: '100%',
                }}>
                {i === 0 && (
                  <div style={{
                    position: 'absolute', top: -8, left: 12,
                    padding: '2px 7px', borderRadius: 4,
                    background: 'oklch(0.70 0.19 46)', color: 'oklch(0.14 0.02 40)',
                    fontSize: 8.5, fontWeight: 900, letterSpacing: '0.08em',
                  }}>MIGLIOR FIT</div>
                )}

                <div className="flex items-start justify-between gap-3">
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--c-97)', letterSpacing: '-0.01em' }}>{r.nome}</div>
                    <div className="flex items-center gap-2" style={{ fontSize: 11, color: 'var(--c-55)', marginTop: 3 }}>
                      <span><FontAwesomeIcon icon={faClock} style={{ marginRight: 4 }} />{r.tempo}</span>
                      <span style={{ width: 3, height: 3, borderRadius: '50%', background: 'var(--c-30)', display: 'inline-block' }} />
                      <span style={{ color: r.match >= 90 ? 'oklch(0.65 0.18 150)' : 'var(--c-55)', fontWeight: 700 }}>{r.match}% match</span>
                    </div>
                  </div>
                  <div style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 17, color: 'var(--c-97)', fontVariantNumeric: 'tabular-nums' }}>
                    {r.kcal}<span style={{ fontSize: 9, color: 'var(--c-50)', fontWeight: 600, marginLeft: 2 }}>kcal</span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1" style={{ marginTop: 10 }}>
                  {r.usa.map(n => (
                    <span key={n} style={{ fontSize: 9.5, padding: '3px 7px', borderRadius: 999, background: 'oklch(0.65 0.18 150 / 14%)', color: 'oklch(0.68 0.18 150)', fontWeight: 600 }}>✓ {n}</span>
                  ))}
                  {r.manca.map(n => (
                    <span key={n} style={{ fontSize: 9.5, padding: '3px 7px', borderRadius: 999, background: 'oklch(0.65 0.22 27 / 12%)', color: 'oklch(0.72 0.18 27)', fontWeight: 600 }}>+ {n}</span>
                  ))}
                </div>

                <div className="flex gap-2" style={{ marginTop: 10 }}>
                  {[
                    { l: 'P', v: r.p, cov: r.copertura.p, c: 'oklch(0.62 0.14 200)' },
                    { l: 'C', v: r.c, cov: r.copertura.c, c: 'oklch(0.78 0.16 85)' },
                    { l: 'G', v: r.g, cov: r.copertura.g, c: 'oklch(0.65 0.18 150)' },
                  ].map(m => (
                    <div key={m.l} style={{ flex: 1 }}>
                      <div className="flex justify-between" style={{ fontSize: 9.5, color: 'var(--c-50)', marginBottom: 3 }}>
                        <span>{m.l} {m.v}g</span>
                        <span style={{ color: m.c, fontWeight: 700 }}>{m.cov}%</span>
                      </div>
                      <div style={{ height: 3, borderRadius: 999, background: 'var(--c-22)', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${Math.min(100, m.cov)}%`, background: m.c, borderRadius: 999 }} />
                      </div>
                    </div>
                  ))}
                </div>
              </button>
            ))}
          </div>

          <button onClick={() => setStep(1)} className="w-full flex items-center justify-center gap-2"
            style={{ marginTop: 14, padding: 11, borderRadius: 12, background: 'transparent', border: '1px solid var(--c-w8)', color: 'var(--c-60)', fontSize: 12, fontWeight: 600 }}>
            <FontAwesomeIcon icon={faArrowLeft} style={{ fontSize: 10 }} />
            Modifica ingredienti
          </button>
        </div>
      )}

      {/* Step 4 — Conferma */}
      {step === 4 && selezionata && (
        <div style={{ padding: '0 20px 24px' }}>
          <div style={{
            padding: 16, borderRadius: 16,
            background: 'oklch(0.65 0.18 150 / 8%)', border: '1px solid oklch(0.65 0.18 150 / 25%)',
            marginBottom: 14,
          }}>
            <div className="flex items-center gap-3" style={{ marginBottom: 8 }}>
              <div className="flex items-center justify-center" style={{
                width: 32, height: 32, borderRadius: '50%',
                background: 'oklch(0.65 0.18 150)', color: 'oklch(0.12 0 0)',
              }}>
                <FontAwesomeIcon icon={faCheck} style={{ fontSize: 13 }} />
              </div>
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--c-97)' }}>{selezionata.nome}</div>
                <div style={{ fontSize: 11, color: 'var(--c-55)' }}>Aggiunto al diario · {selezionata.kcal} kcal</div>
              </div>
            </div>
          </div>

          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.08em', color: 'var(--c-55)', marginBottom: 8 }}>PROSSIMO PASSO</div>
          <button onClick={onClose} className="w-full" style={{
            padding: 14, borderRadius: 14,
            background: 'oklch(0.70 0.19 46)', color: 'oklch(0.14 0.02 40)',
            fontSize: 13.5, fontWeight: 800, marginBottom: 8,
          }}>Torna al diario</button>
          <button onClick={() => { setStep(1); setSelezionata(null) }} className="w-full" style={{
            padding: 12, borderRadius: 12, background: 'var(--c-16)',
            border: '1px solid var(--c-w6)', color: 'var(--c-70)', fontSize: 12, fontWeight: 700,
          }}>Genera un altro pasto</button>
        </div>
      )}
    </SheetShell>
  )
}
