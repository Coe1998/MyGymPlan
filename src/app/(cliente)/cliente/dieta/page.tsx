'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPlus, faXmark, faSearch, faLeaf, faPills, faChevronDown, faChevronUp, faTrash } from '@fortawesome/free-solid-svg-icons'

interface MacroTarget {
  calorie: number
  proteine_g: number
  carboidrati_g: number
  grassi_g: number
  pasti_config?: { nome: string; percentuale: number }[]
  carb_cycling_enabled?: boolean
  carbs_training?: number | null
  carbs_rest?: number | null
}

interface PianoIntegratore {
  id: string
  nome: string
  quantita: number | null
  unita: string
  momento: string | null
  note: string | null
}

interface IntegrazioneCheckin {
  id: string
  piano_integratore_id: string
  preso: boolean
}

interface PastoLog {
  id: string; alimento_nome: string; quantita_g: number
  calorie: number; proteine_g: number; carboidrati_g: number; grassi_g: number
  gruppo_nome: string | null; gruppo_id: string | null; created_at: string
}

interface OFFProduct {
  product_name: string; nutriments: {
    'energy-kcal_100g'?: number; proteins_100g?: number; carbohydrates_100g?: number; fat_100g?: number
  }
}

interface GiornoStorico {
  data: string
  calorie: number; proteine_g: number; carboidrati_g: number; grassi_g: number
}

export default function DietaPage() {
  const supabase = createClient()
  const router = useRouter()
  const [target, setTarget] = useState<MacroTarget | null>(null)
  const [pasti, setPasti] = useState<PastoLog[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'dieta' | 'integratori'>('dieta')
  const [oggi] = useState(new Date().toISOString().split('T')[0])
  const [storico, setStorico] = useState<GiornoStorico[]>([])
  const [storicoEsteso, setStoricoEsteso] = useState(false)

  // Guard: redirect se dieta non abilitata
  useEffect(() => {
    const check = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase
        .from('coach_clienti')
        .select('dieta_abilitata')
        .eq('cliente_id', user.id)
        .maybeSingle()
      if (!data?.dieta_abilitata) router.replace('/cliente/dashboard')
    }
    check()
  }, [])

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

  // Piano integratori coach-driven
  const [pianoInt, setPianoInt] = useState<PianoIntegratore[]>([])
  const [checkinInt, setCheckinInt] = useState<IntegrazioneCheckin[]>([])
  const [pastiSaltati, setPastiSaltati] = useState<Set<number>>(new Set())
  const [redistribuisciSu, setRedistribuisciSu] = useState<number | null>(null)
  // Carb cycling — carbo effettivi per oggi
  const [carbEffettivi, setCarbEffettivi] = useState<number | null>(null)

  // Collapsed groups
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())

  const fetchAll = useCallback(async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const data30ago = new Date()
    data30ago.setDate(data30ago.getDate() - 30)
    const data30agoStr = data30ago.toISOString().split('T')[0]

    const oggiInizio = new Date()
    oggiInizio.setHours(0, 0, 0, 0)

    const [targetRes, pastiRes, storicoRes, pianoIntRes, checkinIntRes, checkinOggiRes] = await Promise.all([
      supabase.from('macro_target').select('*').eq('cliente_id', user.id).maybeSingle(),
      supabase.from('pasto_log').select('*').eq('cliente_id', user.id).eq('data', oggi).order('created_at'),
      supabase.from('pasto_log')
        .select('data, calorie, proteine_g, carboidrati_g, grassi_g')
        .eq('cliente_id', user.id)
        .gte('data', data30agoStr)
        .lt('data', oggi)
        .order('data', { ascending: false }),
      supabase.from('piano_integratori')
        .select('id, nome, quantita, unita, momento, note')
        .eq('cliente_id', user.id)
        .eq('attivo', true)
        .order('created_at'),
      supabase.from('integratori_checkin')
        .select('id, piano_integratore_id, preso')
        .eq('cliente_id', user.id)
        .eq('data', oggi),
      supabase.from('checkin')
        .select('will_train')
        .eq('cliente_id', user.id)
        .gte('data', oggiInizio.toISOString())
        .maybeSingle(),
    ])

    const t = targetRes.data as MacroTarget | null
    setTarget(t)
    setPasti(pastiRes.data ?? [])
    setPianoInt((pianoIntRes as any)?.data ?? [])
    setCheckinInt((checkinIntRes as any)?.data ?? [])

    // Calcola carbo effettivi con carb cycling
    if (t) {
      const checkin = (checkinOggiRes as any).data
      const willTrain: boolean | null = checkin?.will_train ?? null
      const cyclingOn = t.carb_cycling_enabled ?? false
      let effettivi = t.carboidrati_g
      if (cyclingOn && willTrain !== null) {
        if (willTrain && t.carbs_training != null) effettivi = t.carbs_training
        else if (!willTrain && t.carbs_rest != null) effettivi = t.carbs_rest
      }
      setCarbEffettivi(effettivi)
    } else {
      setCarbEffettivi(null)
    }

    // Aggrega per giorno
    const map = new Map<string, GiornoStorico>()
    for (const r of (storicoRes.data ?? []) as any[]) {
      if (!map.has(r.data)) map.set(r.data, { data: r.data, calorie: 0, proteine_g: 0, carboidrati_g: 0, grassi_g: 0 })
      const g = map.get(r.data)!
      g.calorie += r.calorie || 0
      g.proteine_g += r.proteine_g || 0
      g.carboidrati_g += r.carboidrati_g || 0
      g.grassi_g += r.grassi_g || 0
    }
    setStorico(Array.from(map.values()))
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
        `https://it.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(searchQuery)}&search_simple=1&action=process&json=1&page_size=8&fields=product_name,nutriments`
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
              { label: 'Carboidrati', val: totali.carboidrati_g, target: carbEffettivi ?? target.carboidrati_g, color: 'oklch(0.70 0.19 46)' },
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

      {/* Piano pasti */}
      {target?.pasti_config && target.pasti_config.length > 0 && (() => {
        const pastiConfig = target.pasti_config!

        const pastiAttivi = pastiConfig
          .map((p, i) => ({ ...p, idx: i }))
          .filter(p => !pastiSaltati.has(p.idx))

        const percTotaleAttiva = pastiAttivi.reduce((a, p) => a + p.percentuale, 0)

        const getPastoMacro = (idx: number) => {
          if (pastiSaltati.has(idx)) return null
          const p = pastiConfig[idx]
          const percEffettiva = percTotaleAttiva > 0 ? (p.percentuale / percTotaleAttiva) * 100 : 0
          return {
            kcal: Math.round((target.calorie) * percEffettiva / 100),
            prot: Math.round((target.proteine_g) * percEffettiva / 100),
            carb: Math.round((carbEffettivi ?? target.carboidrati_g) * percEffettiva / 100),
            grassi: Math.round((target.grassi_g) * percEffettiva / 100),
          }
        }

        const getLoggatoPerPasto = (nomePasto: string) => {
          const itemsPasto = pasti.filter(p => p.gruppo_nome === nomePasto)
          return itemsPasto.reduce((a, p) => ({
            kcal: a.kcal + (p.calorie || 0),
            prot: a.prot + (p.proteine_g || 0),
            carb: a.carb + (p.carboidrati_g || 0),
            grassi: a.grassi + (p.grassi_g || 0),
          }), { kcal: 0, prot: 0, carb: 0, grassi: 0 })
        }

        const rimanente = {
          kcal: Math.max(0, target.calorie - totali.calorie),
          prot: Math.max(0, target.proteine_g - totali.proteine_g),
          carb: Math.max(0, (carbEffettivi ?? target.carboidrati_g) - totali.carboidrati_g),
          grassi: Math.max(0, target.grassi_g - totali.grassi_g),
        }

        return (
          <div className="rounded-2xl overflow-hidden"
            style={{ background: 'oklch(0.18 0 0)', border: '1px solid oklch(1 0 0 / 6%)' }}>
            <div className="px-4 py-3" style={{ borderBottom: '1px solid oklch(1 0 0 / 6%)' }}>
              <p className="font-bold text-sm" style={{ color: 'oklch(0.97 0 0)' }}>📋 Piano pasti di oggi</p>
              <p className="text-xs mt-0.5" style={{ color: 'oklch(0.45 0 0)' }}>
                {pastiSaltati.size > 0 ? `${pastiSaltati.size} pasto/i saltato/i — macro redistribuiti` : 'Tocca "Salta" su un pasto per redistribuire i macro'}
              </p>
            </div>

            {pastiConfig.map((pasto, i) => {
              const saltato = pastiSaltati.has(i)
              const macro = getPastoMacro(i)
              const loggato = getLoggatoPerPasto(pasto.nome)
              const completato = !saltato && macro && loggato.kcal >= macro.kcal * 0.8

              return (
                <div key={i} className="px-4 py-3 space-y-2"
                  style={{
                    borderBottom: i < pastiConfig.length - 1 ? '1px solid oklch(1 0 0 / 4%)' : 'none',
                    opacity: saltato ? 0.45 : 1,
                  }}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold" style={{ color: saltato ? 'oklch(0.45 0 0)' : 'oklch(0.97 0 0)' }}>
                        {pasto.nome}
                      </span>
                      {completato && (
                        <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
                          style={{ background: 'oklch(0.65 0.18 150 / 15%)', color: 'oklch(0.65 0.18 150)' }}>
                          ✓ OK
                        </span>
                      )}
                      {saltato && (
                        <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
                          style={{ background: 'oklch(0.30 0 0)', color: 'oklch(0.50 0 0)' }}>
                          Saltato
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => setPastiSaltati(prev => {
                        const n = new Set(prev)
                        n.has(i) ? n.delete(i) : n.add(i)
                        return n
                      })}
                      className="text-xs px-2.5 py-1 rounded-lg font-medium transition-all"
                      style={{
                        background: saltato ? 'oklch(0.70 0.19 46 / 15%)' : 'oklch(0.65 0.22 27 / 12%)',
                        color: saltato ? 'oklch(0.70 0.19 46)' : 'oklch(0.65 0.22 27)',
                      }}>
                      {saltato ? 'Ripristina' : 'Salta'}
                    </button>
                  </div>

                  {!saltato && macro && (
                    <div className="grid grid-cols-4 gap-1.5">
                      {[
                        { label: 'Kcal', target: macro.kcal, fatto: Math.round(loggato.kcal), color: 'oklch(0.70 0.19 46)' },
                        { label: 'Prot', target: macro.prot, fatto: Math.round(loggato.prot), color: 'oklch(0.60 0.15 200)' },
                        { label: 'Carb', target: macro.carb, fatto: Math.round(loggato.carb), color: 'oklch(0.70 0.19 46)' },
                        { label: 'Grassi', target: macro.grassi, fatto: Math.round(loggato.grassi), color: 'oklch(0.65 0.18 150)' },
                      ].map(m => (
                        <div key={m.label} className="rounded-xl p-2 text-center"
                          style={{ background: 'oklch(0.22 0 0)' }}>
                          <p className="text-xs font-bold tabular-nums" style={{ color: m.color }}>
                            {m.fatto > 0 ? `${m.fatto}/` : ''}{m.target}
                          </p>
                          <p className="text-xs" style={{ color: 'oklch(0.40 0 0)' }}>{m.label}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}

            {rimanente.kcal > 50 && pastiAttivi.length > 0 && (
              <div className="px-4 py-3 space-y-3"
                style={{ borderTop: '1px solid oklch(1 0 0 / 6%)', background: 'oklch(0.16 0 0)' }}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold" style={{ color: 'oklch(0.75 0.18 80)' }}>
                      Rimanente: {Math.round(rimanente.kcal)} kcal
                    </p>
                    <p className="text-xs" style={{ color: 'oklch(0.45 0 0)' }}>
                      In quanti pasti vuoi distribuirle?
                    </p>
                  </div>
                  <div className="flex gap-1">
                    {[1, 2, 3].filter(n => n <= pastiAttivi.length).map(n => (
                      <button key={n} onClick={() => setRedistribuisciSu(redistribuisciSu === n ? null : n)}
                        className="w-8 h-8 rounded-xl text-sm font-bold transition-all"
                        style={{
                          background: redistribuisciSu === n ? 'oklch(0.75 0.18 80)' : 'oklch(0.25 0 0)',
                          color: redistribuisciSu === n ? 'oklch(0.13 0 0)' : 'oklch(0.55 0 0)',
                        }}>
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
                {redistribuisciSu !== null && (
                  <div className="grid grid-cols-4 gap-1.5">
                    {[
                      { label: 'Kcal', val: Math.round(rimanente.kcal / redistribuisciSu), color: 'oklch(0.70 0.19 46)' },
                      { label: 'Prot', val: Math.round(rimanente.prot / redistribuisciSu), color: 'oklch(0.60 0.15 200)' },
                      { label: 'Carb', val: Math.round(rimanente.carb / redistribuisciSu), color: 'oklch(0.70 0.19 46)' },
                      { label: 'Grassi', val: Math.round(rimanente.grassi / redistribuisciSu), color: 'oklch(0.65 0.18 150)' },
                    ].map(m => (
                      <div key={m.label} className="rounded-xl p-2 text-center"
                        style={{ background: 'oklch(0.20 0 0)', border: '1px solid oklch(0.75 0.18 80 / 20%)' }}>
                        <p className="text-xs font-bold tabular-nums" style={{ color: m.color }}>{m.val}</p>
                        <p className="text-xs" style={{ color: 'oklch(0.40 0 0)' }}>{m.label}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })()}

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

      {/* STORICO */}
      {tab === 'dieta' && !loading && storico.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-widest px-1" style={{ color: 'oklch(0.40 0 0)' }}>
            Storico
          </p>

          {/* Ultimi 7 giorni — cards dettagliate */}
          {storico.slice(0, 7).map(g => {
            const data = new Date(g.data + 'T00:00:00')
            const label = data.toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' })
            const ok = target ? g.calorie >= target.calorie * 0.85 && g.calorie <= target.calorie * 1.15 : null
            return (
              <div key={g.data} className="rounded-2xl p-4 space-y-3"
                style={{ background: 'oklch(0.18 0 0)', border: '1px solid oklch(1 0 0 / 6%)' }}>
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold capitalize" style={{ color: 'oklch(0.85 0 0)' }}>{label}</p>
                  <div className="flex items-center gap-2">
                    {ok !== null && (
                      <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
                        style={{
                          background: ok ? 'oklch(0.65 0.18 150 / 15%)' : 'oklch(0.65 0.18 27 / 15%)',
                          color: ok ? 'oklch(0.65 0.18 150)' : 'oklch(0.75 0.15 27)',
                        }}>
                        {ok ? 'In target' : 'Fuori target'}
                      </span>
                    )}
                    <p className="text-sm font-black tabular-nums" style={{ color: 'oklch(0.70 0.19 46)' }}>
                      {Math.round(g.calorie)} kcal
                    </p>
                  </div>
                </div>
                {target && (
                  <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: 'oklch(0.25 0 0)' }}>
                    <div className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, target.calorie > 0 ? Math.round((g.calorie / target.calorie) * 100) : 0)}%`, background: 'oklch(0.70 0.19 46)' }} />
                  </div>
                )}
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: 'Proteine', val: g.proteine_g, color: 'oklch(0.60 0.15 200)', tgt: target?.proteine_g },
                    { label: 'Carboidrati', val: g.carboidrati_g, color: 'oklch(0.70 0.19 46)', tgt: target?.carboidrati_g },
                    { label: 'Grassi', val: g.grassi_g, color: 'oklch(0.65 0.18 150)', tgt: target?.grassi_g },
                  ].map(m => (
                    <div key={m.label} className="rounded-xl p-2.5" style={{ background: 'oklch(0.22 0 0)' }}>
                      <p className="text-xs font-bold tabular-nums" style={{ color: m.color }}>{Math.round(m.val)}g</p>
                      <p className="text-xs mt-0.5" style={{ color: 'oklch(0.40 0 0)' }}>{m.label}{m.tgt ? ` / ${m.tgt}g` : ''}</p>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}

          {/* Dal giorno 8 in poi — righe compatte */}
          {storico.length > 7 && (
            <>
              <div className="rounded-2xl overflow-hidden"
                style={{ background: 'oklch(0.18 0 0)', border: '1px solid oklch(1 0 0 / 6%)' }}>
                {(storicoEsteso ? storico.slice(7) : storico.slice(7, 14)).map((g, i, arr) => {
                  const data = new Date(g.data + 'T00:00:00')
                  const label = data.toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' })
                  const ok = target ? g.calorie >= target.calorie * 0.85 && g.calorie <= target.calorie * 1.15 : null
                  return (
                    <div key={g.data} className="flex items-center gap-3 px-4 py-3"
                      style={{ borderBottom: i < arr.length - 1 ? '1px solid oklch(1 0 0 / 4%)' : 'none' }}>
                      <div className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ background: ok === null ? 'oklch(0.35 0 0)' : ok ? 'oklch(0.65 0.18 150)' : 'oklch(0.75 0.15 27)' }} />
                      <p className="text-sm capitalize flex-1" style={{ color: 'oklch(0.70 0 0)' }}>{label}</p>
                      <p className="text-sm font-bold tabular-nums" style={{ color: 'oklch(0.60 0 0)' }}>
                        {Math.round(g.calorie)} kcal
                      </p>
                    </div>
                  )
                })}
              </div>

              {storico.length > 14 && (
                <button onClick={() => setStoricoEsteso(p => !p)}
                  className="w-full py-3 rounded-2xl text-sm font-semibold"
                  style={{ background: 'oklch(0.18 0 0)', color: 'oklch(0.50 0 0)', border: '1px solid oklch(1 0 0 / 6%)' }}>
                  {storicoEsteso ? 'Mostra meno' : `Mostra altri ${storico.length - 14} giorni`}
                </button>
              )}
            </>
          )}
        </div>
      )}

      {/* TAB: INTEGRATORI */}
      {tab === 'integratori' && (
        <div className="space-y-3">
          {pianoInt.length === 0 ? (
            <div className="rounded-2xl py-12 text-center"
              style={{ background: 'oklch(0.18 0 0)', border: '1px solid oklch(1 0 0 / 6%)' }}>
              <p className="text-3xl mb-2">💊</p>
              <p className="font-semibold text-sm" style={{ color: 'oklch(0.97 0 0)' }}>
                Nessun integratore prescritto
              </p>
              <p className="text-xs mt-1" style={{ color: 'oklch(0.45 0 0)' }}>
                Il tuo coach non ha ancora prescritto integratori
              </p>
            </div>
          ) : (
            <div className="rounded-2xl overflow-hidden"
              style={{ background: 'oklch(0.18 0 0)', border: '1px solid oklch(1 0 0 / 6%)' }}>
              <div className="px-4 py-3" style={{ borderBottom: '1px solid oklch(1 0 0 / 6%)' }}>
                <p className="font-bold text-sm" style={{ color: 'oklch(0.97 0 0)' }}>Piano integratori</p>
                <p className="text-xs mt-0.5" style={{ color: 'oklch(0.45 0 0)' }}>
                  {checkinInt.filter(c => c.preso).length} / {pianoInt.length} presi oggi
                </p>
              </div>
              {pianoInt.map((int, i) => {
                const checkin = checkinInt.find(c => c.piano_integratore_id === int.id)
                const preso = checkin?.preso ?? false

                const togglePreso = async () => {
                  const { data: { user } } = await supabase.auth.getUser()
                  if (!user) return
                  if (checkin) {
                    await supabase.from('integratori_checkin')
                      .update({ preso: !preso })
                      .eq('id', checkin.id)
                    setCheckinInt(prev => prev.map(c => c.id === checkin.id ? { ...c, preso: !preso } : c))
                  } else {
                    const { data: newCheckin } = await supabase.from('integratori_checkin')
                      .insert({ cliente_id: user.id, piano_integratore_id: int.id, data: oggi, preso: true })
                      .select().single()
                    if (newCheckin) setCheckinInt(prev => [...prev, newCheckin])
                  }
                }

                return (
                  <div key={int.id} className="flex items-center gap-3 px-4 py-3"
                    style={{ borderBottom: i < pianoInt.length - 1 ? '1px solid oklch(1 0 0 / 4%)' : 'none' }}>
                    <button onClick={togglePreso}
                      className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 transition-all"
                      style={{
                        background: preso ? 'oklch(0.65 0.18 150)' : 'transparent',
                        border: `2px solid ${preso ? 'oklch(0.65 0.18 150)' : 'oklch(0.35 0 0)'}`,
                      }}>
                      {preso && <span className="text-xs font-black" style={{ color: 'oklch(0.13 0 0)' }}>✓</span>}
                    </button>
                    <div className="flex-1 min-w-0" style={{ opacity: preso ? 0.5 : 1 }}>
                      <p className="text-sm font-semibold"
                        style={{ color: 'oklch(0.97 0 0)', textDecoration: preso ? 'line-through' : 'none' }}>
                        {int.nome}
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: 'oklch(0.45 0 0)' }}>
                        {int.quantita && `${int.quantita} ${int.unita}`}
                        {int.momento && ` · ${int.momento}`}
                        {int.note && ` · ${int.note}`}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
