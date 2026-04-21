'use client'
import { useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faUtensils, faCalendarDay, faWandMagicSparkles, faRotateRight } from '@fortawesome/free-solid-svg-icons'
import SheetShell from './SheetShell'

interface Portion {
  food: { product_name: string; brands?: string | null }
  grams: number; kcal: number; protein_g: number; carbs_g: number; fat_g: number
}
interface MealResult {
  meal_name: string
  target: { kcal: number }
  portions: Portion[]
  achieved: { kcal: number }
  kcal_error_pct: number
}

interface Props {
  onClose: () => void
  clienteId: string | null
  dayType: 'training' | 'rest' | null
}

export default function GenPlanSheet({ onClose, clienteId, dayType }: Props) {
  const [tipo, setTipo] = useState<'pasto' | 'giornata'>('giornata')
  const [generando, setGenerando] = useState(false)
  const [piano, setPiano] = useState<MealResult[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  const genera = async () => {
    if (!clienteId) return
    setGenerando(true); setError(null); setPiano(null)
    try {
      const res = await fetch('/api/dieta/genera-piano', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clienteId, dayType }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      setPiano(json.piano)
    } catch (e: any) {
      setError(e.message ?? 'Errore nella generazione del piano')
    } finally {
      setGenerando(false)
    }
  }

  return (
    <SheetShell
      title="Genera piano"
      subtitle={piano ? 'Piano generato · tocca per usarlo' : "L'AI costruisce un pasto o una giornata intera su misura"}
      onClose={onClose}
    >
      <div style={{ padding: '0 20px 20px' }}>

        {/* Se non ancora generato: selezione tipo + CTA */}
        {!piano && !generando && (
          <>
            <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.08em', color: 'var(--c-55)', marginBottom: 8 }}>
              COSA GENERARE
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 18 }}>
              {([
                { id: 'pasto' as const,    icon: faUtensils,    t: 'Prossimo pasto',  s: 'Chiude i macro residui' },
                { id: 'giornata' as const, icon: faCalendarDay, t: 'Giornata intera', s: 'Tutti i pasti di oggi' },
              ] as const).map(o => (
                <button key={o.id} onClick={() => setTipo(o.id)} style={{
                  padding: 14, borderRadius: 14, width: '100%',
                  background: tipo === o.id ? 'oklch(0.70 0.19 46 / 10%)' : 'var(--c-16)',
                  border: tipo === o.id ? '1.5px solid oklch(0.70 0.19 46 / 45%)' : '1px solid var(--c-w6)',
                  textAlign: 'left',
                }}>
                  <FontAwesomeIcon icon={o.icon} style={{ fontSize: 14, color: tipo === o.id ? 'oklch(0.70 0.19 46)' : 'var(--c-60)' }} />
                  <div style={{ fontSize: 12.5, fontWeight: 800, color: 'var(--c-97)', marginTop: 8 }}>{o.t}</div>
                  <div style={{ fontSize: 10.5, color: 'var(--c-50)', marginTop: 2 }}>{o.s}</div>
                </button>
              ))}
            </div>

            {error && (
              <div style={{ padding: '10px 12px', borderRadius: 10, background: 'oklch(0.65 0.22 27 / 10%)', border: '1px solid oklch(0.65 0.22 27 / 25%)', marginBottom: 14 }}>
                <p style={{ fontSize: 12, color: 'oklch(0.72 0.18 27)' }}>{error}</p>
              </div>
            )}

            <button onClick={genera} className="w-full flex items-center justify-center gap-2" style={{
              padding: 14, borderRadius: 14,
              background: 'linear-gradient(135deg, oklch(0.70 0.19 46), oklch(0.62 0.19 40))',
              color: 'oklch(0.14 0.02 40)', fontSize: 13.5, fontWeight: 800,
              boxShadow: '0 10px 28px -12px oklch(0.70 0.19 46 / 60%)',
            }}>
              <FontAwesomeIcon icon={faWandMagicSparkles} />
              Genera ora
            </button>
          </>
        )}

        {/* Loading */}
        {generando && (
          <div style={{ textAlign: 'center', padding: '30px 0 40px' }}>
            <div className="flex items-center justify-center" style={{
              width: 56, height: 56, borderRadius: '50%',
              background: 'oklch(0.70 0.19 46 / 15%)', border: '1px solid oklch(0.70 0.19 46 / 30%)',
              margin: '0 auto 14px', animation: 'pulse 1.4s ease-in-out infinite',
            }}>
              <FontAwesomeIcon icon={faWandMagicSparkles} style={{ fontSize: 20, color: 'oklch(0.70 0.19 46)' }} />
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--c-90)' }}>Genero il piano…</div>
            <div style={{ fontSize: 11, color: 'var(--c-50)', marginTop: 6 }}>
              Calcolo macro · scelgo gli alimenti · bilancio le porzioni
            </div>
            <div style={{ height: 2, borderRadius: 999, background: 'var(--c-22)', maxWidth: 180, margin: '22px auto 0', overflow: 'hidden' }}>
              <div style={{ height: '100%', background: 'oklch(0.70 0.19 46)', animation: 'slideThink 2s ease-out forwards' }} />
            </div>
          </div>
        )}

        {/* Risultato */}
        {piano && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {piano.map((meal, i) => (
              <div key={i} style={{ background: 'var(--c-16)', borderRadius: 16, overflow: 'hidden', border: '1px solid var(--c-w6)' }}>
                <div className="flex justify-between items-center" style={{ padding: '10px 14px', borderBottom: '1px solid var(--c-w6)' }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--c-97)' }}>{meal.meal_name}</span>
                  <span style={{ fontSize: 11, color: 'var(--c-45)' }}>{Math.round(meal.target.kcal)} kcal target</span>
                </div>
                {meal.portions.length === 0 ? (
                  <p style={{ padding: '10px 14px', fontSize: 12, color: 'var(--c-45)' }}>Nessun alimento trovato</p>
                ) : (
                  <>
                    {meal.portions.map((p, j) => (
                      <div key={j} className="flex justify-between items-center" style={{
                        padding: '9px 14px',
                        borderBottom: j < meal.portions.length - 1 ? '1px solid var(--c-w4)' : 'none',
                      }}>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--c-90)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {p.food.product_name}
                          </div>
                          {p.food.brands && (
                            <div style={{ fontSize: 10.5, color: 'var(--c-45)', marginTop: 1 }}>{p.food.brands}</div>
                          )}
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 10 }}>
                          <div style={{ fontFamily: 'Syne', fontSize: 15, fontWeight: 800, color: 'oklch(0.70 0.19 46)' }}>{p.grams}g</div>
                          <div style={{ fontSize: 9.5, color: 'var(--c-45)' }}>{p.kcal} kcal · {p.protein_g}p · {p.carbs_g}c · {p.fat_g}g</div>
                        </div>
                      </div>
                    ))}
                    <div className="flex justify-between" style={{ padding: '8px 14px', background: meal.kcal_error_pct < 15 ? 'oklch(0.65 0.18 150 / 6%)' : 'oklch(0.70 0.19 46 / 6%)' }}>
                      <span style={{ fontSize: 11, color: 'var(--c-55)' }}>Raggiunto</span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: meal.kcal_error_pct < 15 ? 'oklch(0.65 0.18 150)' : 'oklch(0.78 0.16 85)' }}>
                        {Math.round(meal.achieved.kcal)} kcal ({meal.kcal_error_pct}% scarto)
                      </span>
                    </div>
                  </>
                )}
              </div>
            ))}

            <button onClick={() => { setPiano(null); genera() }}
              className="w-full flex items-center justify-center gap-2"
              style={{ padding: 11, borderRadius: 12, background: 'transparent', border: '1px solid var(--c-w8)', color: 'var(--c-60)', fontSize: 12, fontWeight: 600 }}>
              <FontAwesomeIcon icon={faRotateRight} style={{ fontSize: 10 }} />
              Rigenera
            </button>

            <button onClick={onClose} className="w-full" style={{
              padding: 14, borderRadius: 14,
              background: 'oklch(0.70 0.19 46)', color: 'oklch(0.14 0.02 40)',
              fontSize: 13.5, fontWeight: 800,
            }}>
              Chiudi
            </button>
          </div>
        )}
      </div>
    </SheetShell>
  )
}
