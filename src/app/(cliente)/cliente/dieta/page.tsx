'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPlus, faXmark, faSearch, faLeaf, faPills, faChevronDown, faChevronUp, faTrash } from '@fortawesome/free-solid-svg-icons'

interface MacroTarget { calorie: number; proteine_g: number; carboidrati_g: number; grassi_g: number }

interface PastoLog {
  id: string; alimento_nome: string; quantita_g: number
  calorie: number; proteine_g: number; carboidrati_g: number; grassi_g: number
  gruppo_nome: string | null; gruppo_id: string | null; created_at: string
}

interface IntegrazioneLog {
  id: string; nome: string; quantita: number | null; unita: string; ora: string | null; note: string | null
}

interface OFFProduct {
  product_name: string; nutriments: {
    'energy-kcal_100g'?: number; proteins_100g?: number; carbohydrates_100g?: number; fat_100g?: number
  }
}

const UNITA = ['g', 'mg', 'ml', 'capsule', 'compresse', 'IU']

export default function DietaPage() {
  const supabase = createClient()
  const [target, setTarget] = useState<MacroTarget | null>(null)
  const [pasti, setPasti] = useState<PastoLog[]>([])
  const [integratori, setIntegratori] = useState<IntegrazioneLog[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'dieta' | 'integratori'>('dieta')
  const [oggi] = useState(new Date().toISOString().split('T')[0])

  // Alimento form
  const [showForm, setShowForm] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<OFFProduct[]>([])
  const [searching, setSearching] = useState(false)
  const [selectedFood, setSelectedFood] = useState<OFFProduct | null>(null)
  const [quantita, setQuantita] = useState('100')
  const [gruppoNome, setGruppoNome] = useState('')
  const [gruppoEsistente, setGruppoEsistente] = useState('')
  const [saving, setSaving] = useState(false)

  // Integratore form
  const [showIntForm, setShowIntForm] = useState(false)
  const [intNome, setIntNome] = useState('')
  const [intQuantita, setIntQuantita] = useState('')
  const [intUnita, setIntUnita] = useState('g')
  const [intOra, setIntOra] = useState('')
  const [intNote, setIntNote] = useState('')

  // Collapsed groups
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())

  const fetchAll = useCallback(async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const [targetRes, pastiRes, intRes] = await Promise.all([
      supabase.from('macro_target').select('*').eq('cliente_id', user.id).maybeSingle(),
      supabase.from('pasto_log').select('*').eq('cliente_id', user.id).eq('data', oggi).order('created_at'),
      supabase.from('integrazione_log').select('*').eq('cliente_id', user.id).eq('data', oggi).order('created_at'),
    ])

    setTarget(targetRes.data)
    setPasti(pastiRes.data ?? [])
    setIntegratori(intRes.data ?? [])
    setLoading(false)
  }, [oggi])

  useEffect(() => { fetchAll() }, [fetchAll])

  // Totali giornalieri
  const totali = pasti.reduce((acc, p) => ({
    calorie: acc.calorie + (p.calorie || 0),
    proteine_g: acc.proteine_g + (p.proteine_g || 0),
    carboidrati_g: acc.carboidrati_g + (p.carboidrati_g || 0),
    grassi_g: acc.grassi_g + (p.grassi_g || 0),
  }), { calorie: 0, proteine_g: 0, carboidrati_g: 0, grassi_g: 0 })

  // Gruppi pasti
  const gruppiEsistenti = Array.from(new Set(pasti.filter(p => p.gruppo_nome).map(p => p.gruppo_nome!))).filter(Boolean)

  // Ricerca Open Food Facts
  const searchFood = async () => {
    if (!searchQuery.trim()) return
    setSearching(true)
    setSearchResults([])
    try {
      const res = await fetch(
        `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(searchQuery)}&search_simple=1&action=process&json=1&page_size=8&fields=product_name,nutriments`
      )
      const data = await res.json()
      setSearchResults((data.products ?? []).filter((p: any) =>
        p.product_name && p.nutriments?.['energy-kcal_100g']
      ).slice(0, 6))
    } catch { }
    setSearching(false)
  }

  const calcolaValori = (food: OFFProduct, qtg: number) => {
    const f = qtg / 100
    return {
      calorie: Math.round((food.nutriments['energy-kcal_100g'] ?? 0) * f * 10) / 10,
      proteine_g: Math.round((food.nutriments.proteins_100g ?? 0) * f * 10) / 10,
      carboidrati_g: Math.round((food.nutriments.carbohydrates_100g ?? 0) * f * 10) / 10,
      grassi_g: Math.round((food.nutriments.fat_100g ?? 0) * f * 10) / 10,
    }
  }

  const handleSaveAlimento = async () => {
    if (!selectedFood) return
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const qt = parseFloat(quantita) || 100
    const valori = calcolaValori(selectedFood, qt)
    const nomeGruppo = gruppoNome.trim() || gruppoEsistente || null
    const gId = nomeGruppo
      ? (pasti.find(p => p.gruppo_nome === nomeGruppo)?.gruppo_id ?? crypto.randomUUID())
      : null

    await supabase.from('pasto_log').insert({
      cliente_id: user.id, data: oggi,
      alimento_nome: selectedFood.product_name,
      quantita_g: qt, ...valori,
      gruppo_nome: nomeGruppo, gruppo_id: gId,
    })

    setSelectedFood(null); setSearchQuery(''); setSearchResults([])
    setQuantita('100'); setGruppoNome(''); setGruppoEsistente('')
    setShowForm(false); setSaving(false)
    fetchAll()
  }

  const handleDeleteAlimento = async (id: string) => {
    await supabase.from('pasto_log').delete().eq('id', id)
    fetchAll()
  }

  const handleSaveIntegratore = async () => {
    if (!intNome.trim()) return
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('integrazione_log').insert({
      cliente_id: user.id, data: oggi,
      nome: intNome.trim(),
      quantita: parseFloat(intQuantita) || null,
      unita: intUnita,
      ora: intOra || null,
      note: intNote.trim() || null,
    })
    setIntNome(''); setIntQuantita(''); setIntOra(''); setIntNote('')
    setShowIntForm(false); setSaving(false)
    fetchAll()
  }

  const perc = (val: number, target: number) => Math.min(100, target > 0 ? Math.round((val / target) * 100) : 0)

  // Group pasti by gruppo_id
  const pastiRaggruppati: { key: string; label: string | null; items: PastoLog[] }[] = []
  const seen = new Set<string>()
  for (const p of pasti) {
    const key = p.gruppo_id ?? `single_${p.id}`
    if (seen.has(key)) continue
    seen.add(key)
    if (p.gruppo_id) {
      pastiRaggruppati.push({ key, label: p.gruppo_nome, items: pasti.filter(x => x.gruppo_id === p.gruppo_id) })
    } else {
      pastiRaggruppati.push({ key, label: null, items: [p] })
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-black tracking-tight" style={{ color: 'oklch(0.97 0 0)' }}>Nutrizione</h1>
        <p className="text-sm mt-1" style={{ color: 'oklch(0.50 0 0)' }}>
          {new Date().toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
      </div>

      {/* Macro summary */}
      {target ? (
        <div className="rounded-2xl p-5 space-y-4"
          style={{ background: 'oklch(0.18 0 0)', border: '1px solid oklch(1 0 0 / 6%)' }}>
          {/* Calorie */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-sm font-bold" style={{ color: 'oklch(0.97 0 0)' }}>Calorie</p>
              <p className="text-sm font-black tabular-nums" style={{ color: 'oklch(0.70 0.19 46)' }}>
                {Math.round(totali.calorie)} / {target.calorie} kcal
              </p>
            </div>
            <div className="w-full h-3 rounded-full overflow-hidden" style={{ background: 'oklch(0.25 0 0)' }}>
              <div className="h-full rounded-full transition-all duration-500"
                style={{ width: `${perc(totali.calorie, target.calorie)}%`, background: 'oklch(0.70 0.19 46)' }} />
            </div>
          </div>
          {/* Macro bars */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Proteine', val: totali.proteine_g, target: target.proteine_g, color: 'oklch(0.60 0.15 200)' },
              { label: 'Carboidrati', val: totali.carboidrati_g, target: target.carboidrati_g, color: 'oklch(0.70 0.19 46)' },
              { label: 'Grassi', val: totali.grassi_g, target: target.grassi_g, color: 'oklch(0.65 0.18 150)' },
            ].map(m => (
              <div key={m.label} className="rounded-xl p-3 space-y-2"
                style={{ background: 'oklch(0.22 0 0)' }}>
                <div className="flex items-center justify-between">
                  <p className="text-xs" style={{ color: 'oklch(0.55 0 0)' }}>{m.label}</p>
                  <p className="text-xs font-bold tabular-nums" style={{ color: m.color }}>
                    {Math.round(m.val)}g
                  </p>
                </div>
                <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: 'oklch(0.30 0 0)' }}>
                  <div className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${perc(m.val, m.target)}%`, background: m.color }} />
                </div>
                <p className="text-xs text-right" style={{ color: 'oklch(0.40 0 0)' }}>/ {m.target}g</p>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="rounded-2xl p-5 text-center"
          style={{ background: 'oklch(0.18 0 0)', border: '1px solid oklch(1 0 0 / 6%)' }}>
          <p className="text-sm" style={{ color: 'oklch(0.50 0 0)' }}>
            Il tuo coach non ha ancora impostato i tuoi macro target
          </p>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 p-1 rounded-2xl" style={{ background: 'oklch(0.18 0 0)' }}>
        {[
          { id: 'dieta', label: '🥗 Dieta', icon: faLeaf },
          { id: 'integratori', label: '💊 Integratori', icon: faPills },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id as any)}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all"
            style={{
              background: tab === t.id ? 'oklch(0.70 0.19 46)' : 'transparent',
              color: tab === t.id ? 'oklch(0.13 0 0)' : 'oklch(0.50 0 0)',
            }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* TAB: DIETA */}
      {tab === 'dieta' && (
        <div className="space-y-3">
          {/* Form aggiungi alimento */}
          {showForm ? (
            <div className="rounded-2xl p-5 space-y-4"
              style={{ background: 'oklch(0.18 0 0)', border: '1px solid oklch(0.70 0.19 46 / 30%)' }}>
              <div className="flex items-center justify-between">
                <p className="font-bold text-sm" style={{ color: 'oklch(0.97 0 0)' }}>Aggiungi alimento</p>
                <button onClick={() => { setShowForm(false); setSelectedFood(null); setSearchQuery(''); setSearchResults([]) }}
                  className="w-8 h-8 rounded-full flex items-center justify-center"
                  style={{ background: 'oklch(0.25 0 0)', color: 'oklch(0.55 0 0)' }}>
                  <FontAwesomeIcon icon={faXmark} className="text-xs" />
                </button>
              </div>

              {!selectedFood ? (
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && searchFood()}
                      placeholder="Cerca alimento (es. pollo, riso, banana)..."
                      className="flex-1 px-4 py-3 rounded-xl text-sm outline-none"
                      style={{ background: 'oklch(0.22 0 0)', border: '1px solid oklch(1 0 0 / 8%)', color: 'oklch(0.97 0 0)' }}
                      onFocus={e => e.target.style.borderColor = 'oklch(0.70 0.19 46)'}
                      onBlur={e => e.target.style.borderColor = 'oklch(1 0 0 / 8%)'} />
                    <button onClick={searchFood} disabled={searching}
                      className="px-4 py-3 rounded-xl text-sm font-bold flex-shrink-0"
                      style={{ background: 'oklch(0.70 0.19 46)', color: 'oklch(0.11 0 0)' }}>
                      {searching ? '...' : <FontAwesomeIcon icon={faSearch} />}
                    </button>
                  </div>

                  {searchResults.length > 0 && (
                    <div className="rounded-xl overflow-hidden"
                      style={{ border: '1px solid oklch(1 0 0 / 8%)' }}>
                      {searchResults.map((r, i) => (
                        <button key={i} onClick={() => setSelectedFood(r)}
                          className="w-full text-left px-4 py-3 transition-all hover:opacity-80"
                          style={{
                            background: i % 2 === 0 ? 'oklch(0.20 0 0)' : 'oklch(0.18 0 0)',
                            borderBottom: i < searchResults.length - 1 ? '1px solid oklch(1 0 0 / 5%)' : 'none',
                          }}>
                          <p className="text-sm font-medium" style={{ color: 'oklch(0.90 0 0)' }}>{r.product_name}</p>
                          <p className="text-xs mt-0.5" style={{ color: 'oklch(0.45 0 0)' }}>
                            {Math.round(r.nutriments['energy-kcal_100g'] ?? 0)} kcal · {Math.round(r.nutriments.proteins_100g ?? 0)}g prot · {Math.round(r.nutriments.carbohydrates_100g ?? 0)}g carb · {Math.round(r.nutriments.fat_100g ?? 0)}g grassi — per 100g
                          </p>
                        </button>
                      ))}
                    </div>
                  )}

                  {searchResults.length === 0 && !searching && searchQuery && (
                    <p className="text-sm text-center py-4" style={{ color: 'oklch(0.45 0 0)' }}>
                      Nessun risultato. Prova un termine diverso.
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Alimento selezionato */}
                  <div className="flex items-center gap-2">
                    <div className="flex-1 px-4 py-3 rounded-xl text-sm font-semibold"
                      style={{ background: 'oklch(0.70 0.19 46 / 12%)', color: 'oklch(0.97 0 0)', border: '1px solid oklch(0.70 0.19 46 / 25%)' }}>
                      {selectedFood.product_name}
                    </div>
                    <button onClick={() => setSelectedFood(null)}
                      className="w-9 h-9 rounded-xl flex items-center justify-center"
                      style={{ background: 'oklch(0.25 0 0)', color: 'oklch(0.55 0 0)' }}>
                      <FontAwesomeIcon icon={faXmark} className="text-xs" />
                    </button>
                  </div>

                  {/* Quantità */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'oklch(0.50 0 0)' }}>
                      Quantità (grammi)
                    </label>
                    <input type="number" value={quantita} onChange={e => setQuantita(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl text-sm outline-none text-center font-bold"
                      style={{ background: 'oklch(0.22 0 0)', border: '1px solid oklch(1 0 0 / 8%)', color: 'oklch(0.97 0 0)' }}
                      onFocus={e => e.target.style.borderColor = 'oklch(0.70 0.19 46)'}
                      onBlur={e => e.target.style.borderColor = 'oklch(1 0 0 / 8%)'} />
                  </div>

                  {/* Preview valori */}
                  {(() => {
                    const v = calcolaValori(selectedFood, parseFloat(quantita) || 0)
                    return (
                      <div className="grid grid-cols-4 gap-2">
                        {[
                          { label: 'Kcal', val: v.calorie, color: 'oklch(0.70 0.19 46)' },
                          { label: 'Prot', val: v.proteine_g, color: 'oklch(0.60 0.15 200)' },
                          { label: 'Carb', val: v.carboidrati_g, color: 'oklch(0.70 0.19 46)' },
                          { label: 'Grassi', val: v.grassi_g, color: 'oklch(0.65 0.18 150)' },
                        ].map(x => (
                          <div key={x.label} className="rounded-xl p-2.5 text-center"
                            style={{ background: 'oklch(0.22 0 0)' }}>
                            <p className="text-lg font-black" style={{ color: x.color }}>{x.val}</p>
                            <p className="text-xs mt-0.5" style={{ color: 'oklch(0.45 0 0)' }}>{x.label}</p>
                          </div>
                        ))}
                      </div>
                    )
                  })()}

                  {/* Gruppo pasto */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'oklch(0.50 0 0)' }}>
                      Pasto (opzionale)
                    </label>
                    {gruppiEsistenti.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {gruppiEsistenti.map(g => (
                          <button key={g} onClick={() => { setGruppoEsistente(g === gruppoEsistente ? '' : g); setGruppoNome('') }}
                            className="px-3 py-1.5 rounded-full text-xs font-semibold"
                            style={{
                              background: gruppoEsistente === g ? 'oklch(0.60 0.15 200 / 20%)' : 'oklch(0.22 0 0)',
                              color: gruppoEsistente === g ? 'oklch(0.60 0.15 200)' : 'oklch(0.50 0 0)',
                            }}>
                            {g}
                          </button>
                        ))}
                      </div>
                    )}
                    <input type="text" value={gruppoNome}
                      onChange={e => { setGruppoNome(e.target.value); setGruppoEsistente('') }}
                      placeholder="Nuovo pasto (es. Pranzo, Post workout...)"
                      className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
                      style={{ background: 'oklch(0.22 0 0)', border: '1px solid oklch(1 0 0 / 8%)', color: 'oklch(0.97 0 0)' }}
                      onFocus={e => e.target.style.borderColor = 'oklch(0.70 0.19 46)'}
                      onBlur={e => e.target.style.borderColor = 'oklch(1 0 0 / 8%)'} />
                  </div>

                  <button onClick={handleSaveAlimento} disabled={saving}
                    className="w-full py-3 rounded-xl text-sm font-bold"
                    style={{ background: 'oklch(0.70 0.19 46)', color: 'oklch(0.11 0 0)' }}>
                    {saving ? 'Salvataggio...' : '+ Aggiungi al diario'}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button onClick={() => setShowForm(true)}
              className="w-full py-3.5 rounded-2xl text-sm font-bold flex items-center justify-center gap-2"
              style={{ background: 'transparent', color: 'oklch(0.70 0.19 46)', border: '2px dashed oklch(0.70 0.19 46 / 30%)' }}>
              <FontAwesomeIcon icon={faPlus} /> Aggiungi alimento
            </button>
          )}

          {/* Lista pasti */}
          {loading ? (
            <p className="text-sm text-center py-8" style={{ color: 'oklch(0.45 0 0)' }}>Caricamento...</p>
          ) : pastiRaggruppati.length === 0 ? (
            <div className="rounded-2xl py-12 text-center"
              style={{ background: 'oklch(0.18 0 0)', border: '1px solid oklch(1 0 0 / 6%)' }}>
              <p className="text-3xl mb-2">🥗</p>
              <p className="font-semibold text-sm" style={{ color: 'oklch(0.97 0 0)' }}>Nessun alimento registrato oggi</p>
              <p className="text-xs mt-1" style={{ color: 'oklch(0.45 0 0)' }}>Inizia aggiungendo il tuo primo alimento</p>
            </div>
          ) : (
            <div className="space-y-2">
              {pastiRaggruppati.map(gruppo => {
                const isCollapsed = collapsedGroups.has(gruppo.key)
                const totGruppo = gruppo.items.reduce((a, p) => ({
                  calorie: a.calorie + p.calorie, proteine_g: a.proteine_g + p.proteine_g,
                  carboidrati_g: a.carboidrati_g + p.carboidrati_g, grassi_g: a.grassi_g + p.grassi_g,
                }), { calorie: 0, proteine_g: 0, carboidrati_g: 0, grassi_g: 0 })

                return (
                  <div key={gruppo.key} className="rounded-2xl overflow-hidden"
                    style={{ background: 'oklch(0.18 0 0)', border: '1px solid oklch(1 0 0 / 6%)' }}>
                    {gruppo.label && (
                      <div className="flex items-center justify-between px-4 py-3 cursor-pointer"
                        style={{ borderBottom: isCollapsed ? 'none' : '1px solid oklch(1 0 0 / 6%)', background: 'oklch(0.15 0 0)' }}
                        onClick={() => setCollapsedGroups(prev => {
                          const n = new Set(prev)
                          n.has(gruppo.key) ? n.delete(gruppo.key) : n.add(gruppo.key)
                          return n
                        })}>
                        <div>
                          <p className="font-bold text-sm" style={{ color: 'oklch(0.97 0 0)' }}>{gruppo.label}</p>
                          <p className="text-xs mt-0.5" style={{ color: 'oklch(0.45 0 0)' }}>
                            {Math.round(totGruppo.calorie)} kcal · {Math.round(totGruppo.proteine_g)}p · {Math.round(totGruppo.carboidrati_g)}c · {Math.round(totGruppo.grassi_g)}g
                          </p>
                        </div>
                        <FontAwesomeIcon icon={isCollapsed ? faChevronDown : faChevronUp}
                          className="text-xs" style={{ color: 'oklch(0.45 0 0)' }} />
                      </div>
                    )}
                    {!isCollapsed && gruppo.items.map((p, i) => (
                      <div key={p.id} className="flex items-center gap-3 px-4 py-3"
                        style={{ borderBottom: i < gruppo.items.length - 1 ? '1px solid oklch(1 0 0 / 4%)' : 'none' }}>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate" style={{ color: 'oklch(0.90 0 0)' }}>{p.alimento_nome}</p>
                          <p className="text-xs mt-0.5" style={{ color: 'oklch(0.45 0 0)' }}>
                            {p.quantita_g}g · {Math.round(p.calorie)} kcal · {Math.round(p.proteine_g)}p
                          </p>
                        </div>
                        <button onClick={() => handleDeleteAlimento(p.id)}
                          className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{ background: 'oklch(0.65 0.22 27 / 10%)', color: 'oklch(0.70 0.20 27)' }}>
                          <FontAwesomeIcon icon={faTrash} className="text-xs" />
                        </button>
                      </div>
                    ))}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB: INTEGRATORI */}
      {tab === 'integratori' && (
        <div className="space-y-3">
          {showIntForm ? (
            <div className="rounded-2xl p-5 space-y-4"
              style={{ background: 'oklch(0.18 0 0)', border: '1px solid oklch(0.65 0.15 300 / 30%)' }}>
              <div className="flex items-center justify-between">
                <p className="font-bold text-sm" style={{ color: 'oklch(0.97 0 0)' }}>Aggiungi integratore</p>
                <button onClick={() => setShowIntForm(false)}
                  className="w-8 h-8 rounded-full flex items-center justify-center"
                  style={{ background: 'oklch(0.25 0 0)', color: 'oklch(0.55 0 0)' }}>
                  <FontAwesomeIcon icon={faXmark} className="text-xs" />
                </button>
              </div>
              <input type="text" value={intNome} onChange={e => setIntNome(e.target.value)}
                placeholder="Nome integratore (es. Creatina, Vitamina D...)"
                className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                style={{ background: 'oklch(0.22 0 0)', border: '1px solid oklch(1 0 0 / 8%)', color: 'oklch(0.97 0 0)' }}
                onFocus={e => e.target.style.borderColor = 'oklch(0.65 0.15 300)'}
                onBlur={e => e.target.style.borderColor = 'oklch(1 0 0 / 8%)'} />
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold" style={{ color: 'oklch(0.50 0 0)' }}>Quantità</label>
                  <input type="number" value={intQuantita} onChange={e => setIntQuantita(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                    style={{ background: 'oklch(0.22 0 0)', border: '1px solid oklch(1 0 0 / 8%)', color: 'oklch(0.97 0 0)' }} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold" style={{ color: 'oklch(0.50 0 0)' }}>Unità</label>
                  <select value={intUnita} onChange={e => setIntUnita(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                    style={{ background: 'oklch(0.22 0 0)', border: '1px solid oklch(1 0 0 / 8%)', color: 'oklch(0.97 0 0)', colorScheme: 'dark' }}>
                    {UNITA.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold" style={{ color: 'oklch(0.50 0 0)' }}>Orario</label>
                  <input type="time" value={intOra} onChange={e => setIntOra(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                    style={{ background: 'oklch(0.22 0 0)', border: '1px solid oklch(1 0 0 / 8%)', color: 'oklch(0.97 0 0)', colorScheme: 'dark' }} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold" style={{ color: 'oklch(0.50 0 0)' }}>Note</label>
                  <input type="text" value={intNote} onChange={e => setIntNote(e.target.value)}
                    placeholder="es. a stomaco pieno"
                    className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                    style={{ background: 'oklch(0.22 0 0)', border: '1px solid oklch(1 0 0 / 8%)', color: 'oklch(0.97 0 0)' }} />
                </div>
              </div>
              <button onClick={handleSaveIntegratore} disabled={saving || !intNome.trim()}
                className="w-full py-3 rounded-xl text-sm font-bold"
                style={{ background: 'oklch(0.65 0.15 300)', color: 'oklch(0.97 0 0)' }}>
                {saving ? 'Salvataggio...' : '+ Aggiungi'}
              </button>
            </div>
          ) : (
            <button onClick={() => setShowIntForm(true)}
              className="w-full py-3.5 rounded-2xl text-sm font-bold flex items-center justify-center gap-2"
              style={{ background: 'transparent', color: 'oklch(0.65 0.15 300)', border: '2px dashed oklch(0.65 0.15 300 / 30%)' }}>
              <FontAwesomeIcon icon={faPlus} /> Aggiungi integratore
            </button>
          )}

          {integratori.length === 0 ? (
            <div className="rounded-2xl py-12 text-center"
              style={{ background: 'oklch(0.18 0 0)', border: '1px solid oklch(1 0 0 / 6%)' }}>
              <p className="text-3xl mb-2">💊</p>
              <p className="font-semibold text-sm" style={{ color: 'oklch(0.97 0 0)' }}>Nessun integratore oggi</p>
            </div>
          ) : (
            <div className="rounded-2xl overflow-hidden"
              style={{ background: 'oklch(0.18 0 0)', border: '1px solid oklch(1 0 0 / 6%)' }}>
              {integratori.map((int, i) => (
                <div key={int.id} className="flex items-center gap-3 px-4 py-3"
                  style={{ borderBottom: i < integratori.length - 1 ? '1px solid oklch(1 0 0 / 4%)' : 'none' }}>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: 'oklch(0.65 0.15 300 / 15%)', color: 'oklch(0.65 0.15 300)' }}>
                    💊
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold" style={{ color: 'oklch(0.97 0 0)' }}>{int.nome}</p>
                    <p className="text-xs mt-0.5" style={{ color: 'oklch(0.45 0 0)' }}>
                      {int.quantita && `${int.quantita}${int.unita}`}
                      {int.ora && ` · ${int.ora.slice(0, 5)}`}
                      {int.note && ` · ${int.note}`}
                    </p>
                  </div>
                  <button onClick={async () => { await supabase.from('integrazione_log').delete().eq('id', int.id); fetchAll() }}
                    className="w-7 h-7 rounded-lg flex items-center justify-center"
                    style={{ background: 'oklch(0.65 0.22 27 / 10%)', color: 'oklch(0.70 0.20 27)' }}>
                    <FontAwesomeIcon icon={faTrash} className="text-xs" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
