'use client'

import { useState, useRef, useCallback } from 'react'
import type { MacroAlert } from '@/lib/dieta/solver'

interface Portion {
  food: { id: string; product_name: string; brands?: string | null; pnns_groups_1?: string | null }
  grams: number
  kcal: number
  protein_g: number
  carbs_g: number
  fat_g: number
}

interface MealResult {
  meal_name: string
  target: { kcal: number; protein_g: number; carbs_g: number; fat_g: number }
  portions: Portion[]
  achieved: { kcal: number; protein_g: number; carbs_g: number; fat_g: number }
  kcal_error_pct: number
}

interface FoodSuggestion {
  id: string
  product_name: string
  brands?: string | null
  pnns_groups_1?: string | null
  energy_kcal_100g: number
  proteins_100g: number
  carbs_100g: number
  fat_100g: number
}

interface Props {
  clienteId: string
  dayType?: 'training' | 'rest' | null
}

const ACCENT = 'oklch(0.70 0.19 46)'

export default function DietaIntelligente({ clienteId, dayType }: Props) {
  const [mode, setMode] = useState<null | 'piano' | 'frigo'>(null)

  // ── Piano di oggi ────────────────────────────────────────────────────────
  const [piano, setPiano] = useState<MealResult[] | null>(null)
  const [loadingPiano, setLoadingPiano] = useState(false)
  const [errorPiano, setErrorPiano] = useState<string | null>(null)

  const generaPiano = async () => {
    setLoadingPiano(true); setErrorPiano(null); setPiano(null)
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
      setErrorPiano(e.message ?? 'Errore nella generazione del piano')
    } finally {
      setLoadingPiano(false)
    }
  }

  // ── Dal frigo ────────────────────────────────────────────────────────────
  const [fridgeSearch, setFridgeSearch] = useState('')
  const [suggestions, setSuggestions] = useState<FoodSuggestion[]>([])
  const [loadingSug, setLoadingSug] = useState(false)
  const [selectedFoods, setSelectedFoods] = useState<FoodSuggestion[]>([])
  const [fridgeResult, setFridgeResult] = useState<{ portions: Portion[]; achieved: any; target: any; alerts: MacroAlert[]; kcal_error_pct: number } | null>(null)
  const [loadingFrigo, setLoadingFrigo] = useState(false)
  const [errorFrigo, setErrorFrigo] = useState<string | null>(null)
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  const searchFoods = useCallback(async (q: string) => {
    if (q.length < 2) { setSuggestions([]); return }
    setLoadingSug(true)
    const res = await fetch(`/api/dieta/cerca-alimenti?q=${encodeURIComponent(q)}`)
    const data = await res.json()
    setSuggestions(data)
    setLoadingSug(false)
  }, [])

  const onSearchChange = (v: string) => {
    setFridgeSearch(v)
    if (searchTimeout.current) clearTimeout(searchTimeout.current)
    searchTimeout.current = setTimeout(() => searchFoods(v), 300)
  }

  const addFood = (f: FoodSuggestion) => {
    if (!selectedFoods.find(s => s.id === f.id)) {
      setSelectedFoods(prev => [...prev, f])
    }
    setFridgeSearch('')
    setSuggestions([])
  }

  const removeFood = (id: string) => setSelectedFoods(prev => prev.filter(f => f.id !== id))

  const calcolaFrigo = async () => {
    if (selectedFoods.length === 0) return
    setLoadingFrigo(true); setErrorFrigo(null); setFridgeResult(null)
    try {
      const res = await fetch('/api/dieta/dal-frigo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clienteId, foodIds: selectedFoods.map(f => f.id) }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      setFridgeResult(json)
    } catch (e: any) {
      setErrorFrigo(e.message ?? 'Errore nel calcolo')
    } finally {
      setLoadingFrigo(false)
    }
  }

  const alertColor: Record<string, string> = {
    missing_protein: '#ffb4b4',
    missing_carb:    '#ffd580',
    missing_fat:     '#cfe0ff',
    missing_veggie:  '#b4e5c9',
    excess_kcal:     '#ffb4b4',
    deficit_kcal:    '#ffd580',
  }
  const alertBg: Record<string, string> = {
    missing_protein: 'rgba(229,72,77,0.09)',
    missing_carb:    'rgba(220,160,60,0.09)',
    missing_fat:     'rgba(100,160,240,0.09)',
    missing_veggie:  'rgba(48,164,108,0.09)',
    excess_kcal:     'rgba(229,72,77,0.09)',
    deficit_kcal:    'rgba(220,160,60,0.09)',
  }

  return (
    <div style={{ background: 'var(--c-18)', border: '1px solid var(--c-w6)', borderRadius: 16, overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '14px 16px', borderBottom: mode ? '1px solid var(--c-w6)' : 'none' }}>
        <div style={{ fontSize: 11, color: 'var(--c-50)', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 700, marginBottom: 10 }}>
          Dieta intelligente
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <button
            onClick={() => { setMode(mode === 'piano' ? null : 'piano'); setPiano(null); setErrorPiano(null) }}
            style={{
              padding: '10px 12px', borderRadius: 12, border: `1.5px solid ${mode === 'piano' ? ACCENT : 'var(--c-w8)'}`,
              background: mode === 'piano' ? 'oklch(0.70 0.19 46 / 12%)' : 'var(--c-22)',
              color: mode === 'piano' ? ACCENT : 'var(--c-70)', fontSize: 13, fontWeight: 600, cursor: 'pointer',
              textAlign: 'left', lineHeight: 1.3,
            }}>
            <div style={{ fontSize: 16, marginBottom: 4 }}>🍽️</div>
            Genera piano di oggi
          </button>
          <button
            onClick={() => { setMode(mode === 'frigo' ? null : 'frigo'); setFridgeResult(null); setErrorFrigo(null); setSelectedFoods([]) }}
            style={{
              padding: '10px 12px', borderRadius: 12, border: `1.5px solid ${mode === 'frigo' ? ACCENT : 'var(--c-w8)'}`,
              background: mode === 'frigo' ? 'oklch(0.70 0.19 46 / 12%)' : 'var(--c-22)',
              color: mode === 'frigo' ? ACCENT : 'var(--c-70)', fontSize: 13, fontWeight: 600, cursor: 'pointer',
              textAlign: 'left', lineHeight: 1.3,
            }}>
            <div style={{ fontSize: 16, marginBottom: 4 }}>🧊</div>
            Ho nel frigo...
          </button>
        </div>
      </div>

      {/* ── GENERA PIANO ─────────────────────────────────────────────────── */}
      {mode === 'piano' && (
        <div style={{ padding: '14px 16px' }}>
          {!piano && !loadingPiano && (
            <button onClick={generaPiano}
              style={{ width: '100%', padding: '12px', borderRadius: 12, border: 'none', cursor: 'pointer', background: ACCENT, color: '#0b0b0c', fontWeight: 700, fontSize: 14 }}>
              Genera il piano per oggi
            </button>
          )}
          {loadingPiano && (
            <p style={{ textAlign: 'center', color: 'var(--c-50)', fontSize: 13, padding: '16px 0' }}>Calcolo in corso...</p>
          )}
          {errorPiano && (
            <p style={{ color: '#ffb4b4', fontSize: 13, padding: '8px 0' }}>{errorPiano}</p>
          )}
          {piano && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {piano.map((meal, i) => (
                <div key={i} style={{ background: 'var(--c-22)', borderRadius: 12, overflow: 'hidden' }}>
                  <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--c-w6)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--c-97)' }}>{meal.meal_name}</span>
                    <span style={{ fontSize: 11, color: 'var(--c-45)' }}>{Math.round(meal.target.kcal)} kcal target</span>
                  </div>
                  {meal.portions.length === 0 ? (
                    <p style={{ padding: '10px 12px', fontSize: 12, color: 'var(--c-45)' }}>Nessun alimento trovato per questo pasto</p>
                  ) : (
                    <div>
                      {meal.portions.map((p, j) => (
                        <div key={j} style={{ padding: '9px 12px', borderBottom: j < meal.portions.length - 1 ? '1px solid var(--c-w4)' : 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--c-90)' }}>{p.food.product_name}</div>
                            <div style={{ fontSize: 11, color: 'var(--c-45)', marginTop: 1 }}>{p.food.brands ?? p.food.pnns_groups_1 ?? ''}</div>
                          </div>
                          <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 12 }}>
                            <div style={{ fontSize: 15, fontWeight: 800, color: ACCENT }}>{p.grams}g</div>
                            <div style={{ fontSize: 10, color: 'var(--c-45)' }}>{p.kcal} kcal · {p.protein_g}p · {p.carbs_g}c · {p.fat_g}f</div>
                          </div>
                        </div>
                      ))}
                      <div style={{ padding: '8px 12px', background: 'oklch(0.70 0.19 46 / 6%)', display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: 11, color: 'var(--c-55)' }}>Raggiunto</span>
                        <span style={{ fontSize: 11, fontWeight: 700, color: meal.kcal_error_pct < 15 ? '#b4e5c9' : '#ffd580' }}>
                          {Math.round(meal.achieved.kcal)} kcal ({meal.kcal_error_pct}% scarto)
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              <button onClick={() => { setPiano(null); generaPiano() }}
                style={{ padding: '10px', borderRadius: 10, border: '1px solid var(--c-w8)', background: 'transparent', color: 'var(--c-55)', fontSize: 12, cursor: 'pointer' }}>
                Rigenera
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── DAL FRIGO ────────────────────────────────────────────────────── */}
      {mode === 'frigo' && (
        <div style={{ padding: '14px 16px' }}>
          {/* Search */}
          <div style={{ position: 'relative', marginBottom: 10 }}>
            <input
              type="text" value={fridgeSearch} onChange={e => onSearchChange(e.target.value)}
              placeholder="Cerca alimento nel database..."
              style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid var(--c-w10)', background: 'var(--c-22)', color: 'var(--c-97)', fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
            />
            {loadingSug && <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 11, color: 'var(--c-40)' }}>...</span>}
            {suggestions.length > 0 && (
              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--c-22)', border: '1px solid var(--c-w10)', borderRadius: 10, zIndex: 50, marginTop: 4, maxHeight: 240, overflowY: 'auto' }}>
                {suggestions.map(s => (
                  <button key={s.id} onClick={() => addFood(s)}
                    style={{ width: '100%', padding: '9px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'transparent', border: 'none', cursor: 'pointer', borderBottom: '1px solid var(--c-w4)', textAlign: 'left' }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--c-90)' }}>{s.product_name}</div>
                      <div style={{ fontSize: 10, color: 'var(--c-45)' }}>{s.brands ?? s.pnns_groups_1 ?? ''}</div>
                    </div>
                    <span style={{ fontSize: 11, color: 'var(--c-45)', flexShrink: 0, marginLeft: 8 }}>{s.energy_kcal_100g} kcal/100g</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Selected foods */}
          {selectedFoods.length > 0 && (
            <div style={{ marginBottom: 12, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {selectedFoods.map(f => (
                <div key={f.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 10px', borderRadius: 999, background: 'oklch(0.70 0.19 46 / 14%)', border: '1px solid oklch(0.70 0.19 46 / 30%)' }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: ACCENT }}>{f.product_name}</span>
                  <button onClick={() => removeFood(f.id)}
                    style={{ background: 'none', border: 'none', color: 'var(--c-45)', cursor: 'pointer', fontSize: 14, lineHeight: 1, padding: 0 }}>×</button>
                </div>
              ))}
            </div>
          )}

          {selectedFoods.length > 0 && !fridgeResult && (
            <button onClick={calcolaFrigo} disabled={loadingFrigo}
              style={{ width: '100%', padding: '12px', borderRadius: 12, border: 'none', cursor: 'pointer', background: ACCENT, color: '#0b0b0c', fontWeight: 700, fontSize: 14 }}>
              {loadingFrigo ? 'Calcolo...' : 'Calcola porzioni'}
            </button>
          )}

          {errorFrigo && <p style={{ color: '#ffb4b4', fontSize: 13, marginTop: 8 }}>{errorFrigo}</p>}

          {/* Risultato frigo */}
          {fridgeResult && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {/* Alerts */}
              {fridgeResult.alerts.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {fridgeResult.alerts.map((a, i) => (
                    <div key={i} style={{ padding: '10px 12px', borderRadius: 10, background: alertBg[a.type] ?? 'var(--c-22)', border: `1px solid ${alertColor[a.type] ?? 'var(--c-w8)'}22` }}>
                      <span style={{ fontSize: 12.5, color: alertColor[a.type] ?? 'var(--c-70)' }}>⚠ {a.message}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Porzioni */}
              <div style={{ background: 'var(--c-22)', borderRadius: 12, overflow: 'hidden' }}>
                <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--c-w6)' }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--c-97)' }}>Porzioni consigliate</span>
                  <span style={{ fontSize: 11, color: 'var(--c-45)', marginLeft: 8 }}>per raggiungere i tuoi macro</span>
                </div>
                {fridgeResult.portions.map((p, i) => (
                  <div key={i} style={{ padding: '9px 12px', borderBottom: i < fridgeResult.portions.length - 1 ? '1px solid var(--c-w4)' : 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--c-90)' }}>{p.food.product_name}</div>
                      <div style={{ fontSize: 10, color: 'var(--c-45)', marginTop: 1 }}>{p.kcal} kcal · {p.protein_g}g prot · {p.carbs_g}g carb · {p.fat_g}g grass</div>
                    </div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: ACCENT, flexShrink: 0, marginLeft: 12 }}>{p.grams}g</div>
                  </div>
                ))}
                <div style={{ padding: '8px 12px', background: 'oklch(0.70 0.19 46 / 6%)', display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 11, color: 'var(--c-55)' }}>Totale giornata</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: fridgeResult.kcal_error_pct < 15 ? '#b4e5c9' : '#ffd580' }}>
                    {Math.round(fridgeResult.achieved.kcal)} / {Math.round(fridgeResult.target.kcal)} kcal
                  </span>
                </div>
              </div>

              <button onClick={() => { setFridgeResult(null); setSelectedFoods([]) }}
                style={{ padding: '10px', borderRadius: 10, border: '1px solid var(--c-w8)', background: 'transparent', color: 'var(--c-55)', fontSize: 12, cursor: 'pointer' }}>
                Ricomincia
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
