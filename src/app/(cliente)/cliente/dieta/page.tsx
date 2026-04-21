'use client'

import { useEffect, useState, useCallback } from 'react'
import BynariLoader from '@/components/shared/BynariLoader'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPlus, faXmark, faSearch, faLeaf, faPills, faCopy } from '@fortawesome/free-solid-svg-icons'
import DietaIntelligenteHero from '@/components/cliente/nutrizione/DietaIntelligenteHero'
import MacroSummary from '@/components/cliente/nutrizione/MacroSummary'
import PianoPasti from '@/components/cliente/nutrizione/PianoPasti'
import DiarioLoggato from '@/components/cliente/nutrizione/DiarioLoggato'
import FrigoSheet from '@/components/cliente/nutrizione/FrigoSheet'
import GenPlanSheet from '@/components/cliente/nutrizione/GenPlanSheet'

interface MacroTarget {
  calorie: number
  proteine_g: number
  carboidrati_g: number
  grassi_g: number
  pasti_config?: { nome: string; percentuale: number; macro_custom?: boolean; prot_pct?: number; carb_pct?: number; grassi_pct?: number }[]
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
  gruppo_nome: string | null; gruppo_id: string | null; created_at: string; data: string
}

interface InternalFood {
  id: string
  product_name: string
  brands?: string | null
  energy_kcal_100g: number
  proteins_100g: number
  carbs_100g: number
  fat_100g: number
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

  // Alimento form — nuovo flusso: pasto → ricerca → quantità
  const [showForm, setShowForm] = useState(false)
  const [selectedMeal, setSelectedMeal] = useState<string | null>(null) // null=non scelto, ''=fuori dai pasti
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<InternalFood[]>([])
  const [searching, setSearching] = useState(false)
  const [selectedFood, setSelectedFood] = useState<InternalFood | null>(null)
  const [quantita, setQuantita] = useState('100')
  const [saving, setSaving] = useState(false)

  const resetForm = () => {
    setShowForm(false); setSelectedMeal(null); setSearchQuery('')
    setSearchResults([]); setSelectedFood(null); setQuantita('100')
  }

  // Sheets
  const [frigoOpen, setFrigoOpen] = useState(false)
  const [genPlanOpen, setGenPlanOpen] = useState(false)

  // Piano integratori coach-driven
  const [pianoInt, setPianoInt] = useState<PianoIntegratore[]>([])
  const [checkinInt, setCheckinInt] = useState<IntegrazioneCheckin[]>([])
  const [pastiSaltati, setPastiSaltati] = useState<Set<number>>(new Set())
  const [redistribuisciSu, setRedistribuisciSu] = useState<number | null>(null)
  // Carb cycling — carbo effettivi per oggi
  const [carbEffettivi, setCarbEffettivi] = useState<number | null>(null)
  const [dayType, setDayType] = useState<'training' | 'rest' | null>(null)
  const [userId, setUserId] = useState<string | null>(null)

  // Collapsed groups
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())

  // Copia pasto / giornata
  const [copiaPastoAperto, setCopiaPastoAperto] = useState<string | null>(null)
  const [storicoPerPasto, setStoricoPerPasto] = useState<PastoLog[]>([])
  const [loadingStoricoPerPasto, setLoadingStoricoPerPasto] = useState(false)
  const [copiaGiornataAperta, setCopiaGiornataAperta] = useState(false)
  const [storicoGiornate, setStoricoGiornate] = useState<{ data: string; items: PastoLog[] }[]>([])
  const [loadingGiornate, setLoadingGiornate] = useState(false)
  const [copiando, setCopiando] = useState(false)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setUserId(user.id)

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
      const dt: 'training' | 'rest' | null = willTrain === true ? 'training' : willTrain === false ? 'rest' : null
      setDayType(dt)
      let effettivi = t.carboidrati_g
      if (cyclingOn && dt !== null) {
        if (dt === 'training' && t.carbs_training != null) effettivi = t.carbs_training
        else if (dt === 'rest' && t.carbs_rest != null) effettivi = t.carbs_rest
      }
      setCarbEffettivi(effettivi)
    } else {
      setCarbEffettivi(null)
      setDayType(null)
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

  // Calorie effettive: derivate dai macro effettivi (tiene conto del carb cycling)
  const calorieEffettive = target
    ? Math.round(target.proteine_g * 4 + (carbEffettivi ?? target.carboidrati_g) * 4 + target.grassi_g * 9)
    : null

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
  const searchFood = async (q: string) => {
    setSearchQuery(q)
    if (q.trim().length < 2) { setSearchResults([]); return }
    setSearching(true)
    try {
      const res = await fetch(`/api/dieta/cerca-alimenti?q=${encodeURIComponent(q.trim())}`)
      const data = await res.json()
      setSearchResults(data ?? [])
    } catch { }
    setSearching(false)
  }

  const calcolaValori = (food: InternalFood, qtg: number) => {
    const f = qtg / 100
    return {
      calorie: Math.round(food.energy_kcal_100g * f * 10) / 10,
      proteine_g: Math.round(food.proteins_100g * f * 10) / 10,
      carboidrati_g: Math.round(food.carbs_100g * f * 10) / 10,
      grassi_g: Math.round(food.fat_100g * f * 10) / 10,
    }
  }

  const handleSaveAlimento = async () => {
    if (!selectedFood || selectedMeal === null) return
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const qt = parseFloat(quantita) || 100
    const valori = calcolaValori(selectedFood, qt)
    const nomeGruppo = selectedMeal || null
    const gId = nomeGruppo
      ? (pasti.find(p => p.gruppo_nome === nomeGruppo)?.gruppo_id ?? crypto.randomUUID())
      : null

    await supabase.from('pasto_log').insert({
      cliente_id: user.id, data: oggi,
      alimento_nome: selectedFood.product_name,
      quantita_g: qt, ...valori,
      gruppo_nome: nomeGruppo, gruppo_id: gId,
    })

    resetForm(); setSaving(false); fetchAll()
  }

  const handleDeleteAlimento = async (id: string) => {
    await supabase.from('pasto_log').delete().eq('id', id)
    fetchAll()
  }

  const apriCopiaPasto = async (nomePasto: string) => {
    if (copiaPastoAperto === nomePasto) { setCopiaPastoAperto(null); return }
    setCopiaPastoAperto(nomePasto)
    setStoricoPerPasto([])
    setLoadingStoricoPerPasto(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from('pasto_log').select('*')
      .eq('cliente_id', user.id).eq('gruppo_nome', nomePasto).neq('data', oggi)
      .order('data', { ascending: false }).limit(150)
    setStoricoPerPasto(data ?? [])
    setLoadingStoricoPerPasto(false)
  }

  const apriCopiaGiornata = async () => {
    setCopiaGiornataAperta(true)
    setLoadingGiornate(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from('pasto_log').select('*')
      .eq('cliente_id', user.id).neq('data', oggi)
      .order('data', { ascending: false }).limit(300)
    const map = new Map<string, PastoLog[]>()
    for (const item of (data ?? []) as PastoLog[]) {
      if (!map.has(item.data)) map.set(item.data, [])
      map.get(item.data)!.push(item)
    }
    setStoricoGiornate(Array.from(map.entries()).slice(0, 7).map(([d, items]) => ({ data: d, items })))
    setLoadingGiornate(false)
  }

  const handleCopiaPasto = async (items: PastoLog[]) => {
    if (!items.length || copiando) return
    setCopiando(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const nomePasto = items[0].gruppo_nome
    const esistente = pasti.find(p => p.gruppo_nome === nomePasto)
    const gId = esistente?.gruppo_id ?? crypto.randomUUID()
    await supabase.from('pasto_log').insert(
      items.map(item => ({
        cliente_id: user.id, data: oggi,
        alimento_nome: item.alimento_nome, quantita_g: item.quantita_g,
        calorie: item.calorie, proteine_g: item.proteine_g,
        carboidrati_g: item.carboidrati_g, grassi_g: item.grassi_g,
        gruppo_nome: item.gruppo_nome, gruppo_id: gId,
      }))
    )
    setCopiaPastoAperto(null)
    setCopiando(false)
    fetchAll()
  }

  const handleCopiaGiornata = async (items: PastoLog[]) => {
    if (!items.length || copiando) return
    setCopiando(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const groupIdMap = new Map<string, string>()
    for (const item of items) {
      if (item.gruppo_id && !groupIdMap.has(item.gruppo_id)) {
        const esistente = pasti.find(p => p.gruppo_nome === item.gruppo_nome)
        groupIdMap.set(item.gruppo_id, esistente?.gruppo_id ?? crypto.randomUUID())
      }
    }
    await supabase.from('pasto_log').insert(
      items.map(item => ({
        cliente_id: user.id, data: oggi,
        alimento_nome: item.alimento_nome, quantita_g: item.quantita_g,
        calorie: item.calorie, proteine_g: item.proteine_g,
        carboidrati_g: item.carboidrati_g, grassi_g: item.grassi_g,
        gruppo_nome: item.gruppo_nome,
        gruppo_id: item.gruppo_id ? (groupIdMap.get(item.gruppo_id) ?? null) : null,
      }))
    )
    setCopiaGiornataAperta(false)
    setCopiando(false)
    fetchAll()
  }

  const formatDataStorico = (dataStr: string) => {
    const d = new Date(dataStr + 'T00:00:00')
    const oggi_ = new Date(); oggi_.setHours(0, 0, 0, 0)
    const ieri = new Date(oggi_); ieri.setDate(ieri.getDate() - 1)
    if (d.toDateString() === ieri.toDateString()) return 'Ieri'
    return d.toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' })
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

  const calorieEffettiveCalc = calorieEffettive ?? target?.calorie ?? 0

  return (
    <div className="space-y-4 max-w-2xl pb-safe">
      {/* Header */}
      <div className="flex items-start justify-between" style={{ padding: '8px 0 4px' }}>
        <div>
          <h1 style={{ fontSize: 30, fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1, color: 'var(--c-97)' }}>
            Nutrizione
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--c-50)' }}>
            {new Date().toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
        {target?.carb_cycling_enabled && dayType && (
          <div style={{
            padding: '6px 11px', borderRadius: 999,
            background: 'oklch(0.70 0.19 46 / 12%)',
            border: '1px solid oklch(0.70 0.19 46 / 28%)',
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <span style={{ fontSize: 13 }}>{dayType === 'training' ? '🔥' : '💧'}</span>
            <span style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '0.06em', color: 'oklch(0.70 0.19 46)' }}>
              {dayType === 'training' ? 'HIGH CARB' : 'LOW CARB'}
            </span>
          </div>
        )}
      </div>

      {/* Hero Dieta Intelligente */}
      <DietaIntelligenteHero
        kcalResidue={Math.max(0, calorieEffettiveCalc - Math.round(totali.calorie))}
        onGenPlan={() => setGenPlanOpen(true)}
        onFrigo={() => setFrigoOpen(true)}
      />

      {/* MacroSummary */}
      {target && (
        <MacroSummary
          totaleKcal={Math.round(totali.calorie)}
          calorieEffettive={calorieEffettiveCalc}
          totaleP={totali.proteine_g} targetP={target.proteine_g}
          totaleC={totali.carboidrati_g} targetC={carbEffettivi ?? target.carboidrati_g} carbCycling={target.carb_cycling_enabled}
          totaleG={totali.grassi_g} targetG={target.grassi_g}
          dayType={dayType}
        />
      )}

      {/* Warning carb cycling senza check-in */}
      {target?.carb_cycling_enabled && dayType === null && (
        <div className="rounded-2xl px-4 py-3 flex items-center gap-3"
          style={{ background: 'oklch(0.75 0.18 80 / 8%)', border: '1px solid oklch(0.75 0.18 80 / 25%)' }}>
          <span className="text-xl flex-shrink-0">⚠️</span>
          <div>
            <p className="text-sm font-bold" style={{ color: 'oklch(0.75 0.18 80)' }}>Carb cycling attivo</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--c-55)' }}>
              Completa il check-in di oggi per applicare i carbo corretti
            </p>
          </div>
        </div>
      )}

      {/* Piano pasti */}
      {target?.pasti_config && target.pasti_config.length > 0 && (
        <PianoPasti
          pastiConfig={target.pasti_config}
          pasti={pasti}
          calorieEffettive={calorieEffettiveCalc}
          targetP={target.proteine_g}
          targetC={carbEffettivi ?? target.carboidrati_g}
          targetG={target.grassi_g}
          pastiSaltati={pastiSaltati}
          onToggleSalta={i => setPastiSaltati(prev => { const n = new Set(prev); n.has(i) ? n.delete(i) : n.add(i); return n })}
          redistribuisciSu={redistribuisciSu}
          onSetRedistr={setRedistribuisciSu}
          copiaPastoAperto={copiaPastoAperto}
          onApriStorico={apriCopiaPasto}
          storicoPerPasto={storicoPerPasto}
          loadingStorico={loadingStoricoPerPasto}
          onCopiaPasto={handleCopiaPasto}
          copiando={copiando}
          totaleKcal={Math.round(totali.calorie)}
          totaleP={totali.proteine_g}
          totaleC={totali.carboidrati_g}
          totaleG={totali.grassi_g}
        />
      )}

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-2xl" style={{ background: 'var(--c-16)', border: '1px solid var(--c-w6)' }}>
        {[
          { id: 'dieta', icon: faLeaf, label: 'Dieta' },
          { id: 'integratori', icon: faPills, label: 'Integratori' },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id as any)}
            className="flex-1 flex items-center justify-center gap-2 transition-all"
            style={{
              padding: '9px 8px', borderRadius: 10,
              background: tab === t.id ? 'oklch(1 0 0 / 6%)' : 'transparent',
              color: tab === t.id ? 'var(--c-97)' : 'var(--c-50)',
              border: tab === t.id ? '1px solid var(--c-w8)' : '1px solid transparent',
              fontSize: 12, fontWeight: 700,
            }}>
            <FontAwesomeIcon icon={t.icon} style={{ fontSize: 11 }} />
            {t.label}
          </button>
        ))}
      </div>

      {/* TAB: DIETA */}
      {tab === 'dieta' && (
        <div className="space-y-3">

          {/* Copia giornata intera */}
          {!copiaGiornataAperta ? (
            <button onClick={apriCopiaGiornata}
              className="w-full flex items-center justify-center gap-2"
              style={{ padding: 11, borderRadius: 14, background: 'var(--c-16)', border: '1px solid var(--c-w6)', color: 'var(--c-60)', fontSize: 12.5, fontWeight: 600 }}>
              <FontAwesomeIcon icon={faCopy} style={{ fontSize: 11 }} /> Copia giornata precedente
            </button>
          ) : (
            <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--c-18)', border: '1px solid oklch(0.70 0.19 46 / 25%)' }}>
              <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--c-w6)' }}>
                <p className="text-sm font-bold" style={{ color: 'var(--c-97)' }}>Copia giornata da...</p>
                <button onClick={() => setCopiaGiornataAperta(false)}
                  className="w-7 h-7 rounded-lg flex items-center justify-center"
                  style={{ background: 'var(--c-25)', color: 'var(--c-50)' }}>
                  <FontAwesomeIcon icon={faXmark} className="text-xs" />
                </button>
              </div>
              {loadingGiornate ? (
                <BynariLoader file="blue" size={80} />
              ) : storicoGiornate.length === 0 ? (
                <p className="text-sm text-center py-6" style={{ color: 'var(--c-45)' }}>Nessun giorno precedente trovato</p>
              ) : (
                <div>
                  {storicoGiornate.map(({ data: d, items }) => {
                    const totKcal = Math.round(items.reduce((a, x) => a + (x.calorie || 0), 0))
                    const nomiPasti = Array.from(new Set(items.map(x => x.gruppo_nome).filter(Boolean)))
                    return (
                      <button key={d} onClick={() => handleCopiaGiornata(items)} disabled={copiando}
                        className="w-full text-left px-4 py-3 flex items-center justify-between transition-all hover:opacity-80"
                        style={{ borderBottom: '1px solid var(--c-w4)' }}>
                        <div>
                          <p className="text-sm font-bold" style={{ color: 'var(--c-90)' }}>{formatDataStorico(d)}</p>
                          <p className="text-xs mt-0.5" style={{ color: 'var(--c-45)' }}>
                            {nomiPasti.length > 0 ? nomiPasti.join(' · ') : `${items.length} alimenti`}
                          </p>
                        </div>
                        <span className="text-xs font-bold flex-shrink-0 ml-3" style={{ color: 'oklch(0.70 0.19 46)' }}>
                          {totKcal} kcal →
                        </span>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* Form aggiungi alimento */}
          {showForm ? (
            <div className="rounded-2xl p-5 space-y-4"
              style={{ background: 'var(--c-18)', border: '1px solid oklch(0.70 0.19 46 / 30%)' }}>

              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {selectedMeal !== null && (
                    <button onClick={() => { setSelectedMeal(null); setSelectedFood(null); setSearchQuery(''); setSearchResults([]) }}
                      className="w-7 h-7 rounded-full flex items-center justify-center text-xs"
                      style={{ background: 'var(--c-25)', color: 'var(--c-55)' }}>←</button>
                  )}
                  <p className="font-bold text-sm" style={{ color: 'var(--c-97)' }}>
                    {selectedMeal === null ? 'In quale pasto?' : selectedMeal === '' ? 'Fuori dai pasti' : selectedMeal}
                  </p>
                </div>
                <button onClick={resetForm}
                  className="w-8 h-8 rounded-full flex items-center justify-center"
                  style={{ background: 'var(--c-25)', color: 'var(--c-55)' }}>
                  <FontAwesomeIcon icon={faXmark} className="text-xs" />
                </button>
              </div>

              {/* Step 1 — Selezione pasto */}
              {selectedMeal === null && (
                <div className="space-y-2">
                  {target?.pasti_config && target.pasti_config.length > 0 ? (
                    <div className="grid grid-cols-2 gap-2">
                      {target.pasti_config.map(p => (
                        <button key={p.nome} onClick={() => setSelectedMeal(p.nome)}
                          className="px-3 py-3 rounded-xl text-left transition-all hover:opacity-80"
                          style={{ background: 'var(--c-22)', border: '1px solid var(--c-w6)' }}>
                          <p className="text-sm font-bold" style={{ color: 'var(--c-90)' }}>{p.nome}</p>
                          <p className="text-xs" style={{ color: 'var(--c-45)' }}>{p.percentuale}% delle kcal</p>
                        </button>
                      ))}
                      <button onClick={() => setSelectedMeal('')}
                        className="px-3 py-3 rounded-xl text-left transition-all hover:opacity-80"
                        style={{ background: 'var(--c-20)', border: '1px solid var(--c-w4)' }}>
                        <p className="text-sm font-bold" style={{ color: 'var(--c-55)' }}>Fuori dai pasti</p>
                        <p className="text-xs" style={{ color: 'var(--c-38)' }}>Conta nel totale</p>
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {gruppiEsistenti.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {gruppiEsistenti.map(g => (
                            <button key={g} onClick={() => setSelectedMeal(g)}
                              className="px-3 py-1.5 rounded-full text-xs font-semibold"
                              style={{ background: 'var(--c-22)', color: 'var(--c-50)' }}>{g}</button>
                          ))}
                        </div>
                      )}
                      <input type="text" placeholder="Nome pasto (es. Pranzo, Post workout...)"
                        className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
                        style={{ background: 'var(--c-22)', border: '1px solid var(--c-w8)', color: 'var(--c-97)' }}
                        onFocus={e => e.target.style.borderColor = 'oklch(0.70 0.19 46)'}
                        onBlur={e => e.target.style.borderColor = 'var(--c-w8)'}
                        onKeyDown={e => { if (e.key === 'Enter' && (e.target as HTMLInputElement).value.trim()) setSelectedMeal((e.target as HTMLInputElement).value.trim()) }} />
                      <button onClick={() => setSelectedMeal('')}
                        className="w-full py-2 rounded-xl text-xs font-semibold"
                        style={{ background: 'var(--c-20)', color: 'var(--c-45)' }}>Fuori dai pasti</button>
                    </div>
                  )}
                </div>
              )}

              {/* Step 2 — Ricerca alimento */}
              {selectedMeal !== null && !selectedFood && (
                <div className="space-y-3">
                  <input type="text" value={searchQuery}
                    onChange={e => searchFood(e.target.value)}
                    placeholder="Cerca alimento (es. pollo, riso, avena)..."
                    autoFocus
                    className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                    style={{ background: 'var(--c-22)', border: '1px solid var(--c-w8)', color: 'var(--c-97)' }}
                    onFocus={e => e.target.style.borderColor = 'oklch(0.70 0.19 46)'}
                    onBlur={e => e.target.style.borderColor = 'var(--c-w8)'} />

                  {searching && (
                    <p className="text-xs text-center py-2" style={{ color: 'var(--c-45)' }}>Ricerca...</p>
                  )}

                  {searchResults.length > 0 && (
                    <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--c-w8)' }}>
                      {searchResults.map((r, i) => (
                        <button key={r.id} onClick={() => { setSelectedFood(r); setSearchResults([]) }}
                          className="w-full text-left px-4 py-3 transition-all hover:opacity-80"
                          style={{
                            background: i % 2 === 0 ? 'var(--c-20)' : 'var(--c-18)',
                            borderBottom: i < searchResults.length - 1 ? '1px solid var(--c-w5)' : 'none',
                          }}>
                          <p className="text-sm font-medium" style={{ color: 'var(--c-90)' }}>{r.product_name}</p>
                          <p className="text-xs mt-0.5" style={{ color: 'var(--c-45)' }}>
                            {Math.round(r.energy_kcal_100g)} kcal · {r.proteins_100g}p · {r.carbs_100g}c · {r.fat_100g}f — per 100g
                          </p>
                        </button>
                      ))}
                    </div>
                  )}

                  {searchResults.length === 0 && !searching && searchQuery.length >= 2 && (
                    <p className="text-sm text-center py-4" style={{ color: 'var(--c-45)' }}>
                      Nessun risultato. Prova un termine diverso.
                    </p>
                  )}
                </div>
              )}

              {/* Step 3 — Quantità e salva */}
              {selectedFood && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 px-4 py-3 rounded-xl text-sm font-semibold"
                      style={{ background: 'oklch(0.70 0.19 46 / 12%)', color: 'var(--c-97)', border: '1px solid oklch(0.70 0.19 46 / 25%)' }}>
                      {selectedFood.product_name}
                      {selectedFood.brands && <span className="text-xs font-normal ml-1" style={{ color: 'var(--c-50)' }}>· {selectedFood.brands}</span>}
                    </div>
                    <button onClick={() => setSelectedFood(null)}
                      className="w-9 h-9 rounded-xl flex items-center justify-center"
                      style={{ background: 'var(--c-25)', color: 'var(--c-55)' }}>
                      <FontAwesomeIcon icon={faXmark} className="text-xs" />
                    </button>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--c-50)' }}>
                      Quantità (grammi)
                    </label>
                    <input type="number" value={quantita} onChange={e => setQuantita(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl text-sm outline-none text-center font-bold"
                      style={{ background: 'var(--c-22)', border: '1px solid var(--c-w8)', color: 'var(--c-97)' }}
                      onFocus={e => e.target.style.borderColor = 'oklch(0.70 0.19 46)'}
                      onBlur={e => e.target.style.borderColor = 'var(--c-w8)'} />
                  </div>

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
                          <div key={x.label} className="rounded-xl p-2.5 text-center" style={{ background: 'var(--c-22)' }}>
                            <p className="text-lg font-black" style={{ color: x.color }}>{x.val}</p>
                            <p className="text-xs mt-0.5" style={{ color: 'var(--c-45)' }}>{x.label}</p>
                          </div>
                        ))}
                      </div>
                    )
                  })()}

                  <button onClick={handleSaveAlimento} disabled={saving}
                    className="w-full py-3 rounded-xl text-sm font-bold"
                    style={{ background: 'oklch(0.70 0.19 46)', color: 'var(--c-11)' }}>
                    {saving ? 'Salvataggio...' : '+ Aggiungi al diario'}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button onClick={() => setShowForm(true)}
              className="w-full flex items-center justify-center gap-2"
              style={{
                padding: 13, borderRadius: 14, fontSize: 13, fontWeight: 800, letterSpacing: '0.01em',
                background: 'oklch(0.70 0.19 46 / 8%)', border: '1.5px dashed oklch(0.70 0.19 46 / 40%)',
                color: 'oklch(0.70 0.19 46)',
              }}>
              <FontAwesomeIcon icon={faPlus} style={{ fontSize: 12 }} /> Aggiungi alimento
            </button>
          )}

          {/* Diario loggato */}
          {loading ? (
            <BynariLoader file="blue" size={80} />
          ) : (
            <DiarioLoggato pasti={pasti} onDelete={handleDeleteAlimento} />
          )}
        </div>
      )}

      {/* STORICO */}
      {tab === 'dieta' && !loading && storico.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-widest px-1" style={{ color: 'var(--c-40)' }}>
            Storico
          </p>

          {/* Ultimi 7 giorni — cards dettagliate */}
          {storico.slice(0, 7).map(g => {
            const data = new Date(g.data + 'T00:00:00')
            const label = data.toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' })
            const ok = target ? g.calorie >= target.calorie * 0.85 && g.calorie <= target.calorie * 1.15 : null
            return (
              <div key={g.data} className="rounded-2xl p-4 space-y-3"
                style={{ background: 'var(--c-18)', border: '1px solid var(--c-w6)' }}>
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold capitalize" style={{ color: 'var(--c-85)' }}>{label}</p>
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
                  <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: 'var(--c-25)' }}>
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
                    <div key={m.label} className="rounded-xl p-2.5" style={{ background: 'var(--c-22)' }}>
                      <p className="text-xs font-bold tabular-nums" style={{ color: m.color }}>{Math.round(m.val)}g</p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--c-40)' }}>{m.label}{m.tgt ? ` / ${m.tgt}g` : ''}</p>
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
                style={{ background: 'var(--c-18)', border: '1px solid var(--c-w6)' }}>
                {(storicoEsteso ? storico.slice(7) : storico.slice(7, 14)).map((g, i, arr) => {
                  const data = new Date(g.data + 'T00:00:00')
                  const label = data.toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' })
                  const ok = target ? g.calorie >= target.calorie * 0.85 && g.calorie <= target.calorie * 1.15 : null
                  return (
                    <div key={g.data} className="flex items-center gap-3 px-4 py-3"
                      style={{ borderBottom: i < arr.length - 1 ? '1px solid var(--c-w4)' : 'none' }}>
                      <div className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ background: ok === null ? 'var(--c-35)' : ok ? 'oklch(0.65 0.18 150)' : 'oklch(0.75 0.15 27)' }} />
                      <p className="text-sm capitalize flex-1" style={{ color: 'var(--c-70)' }}>{label}</p>
                      <p className="text-sm font-bold tabular-nums" style={{ color: 'var(--c-60)' }}>
                        {Math.round(g.calorie)} kcal
                      </p>
                    </div>
                  )
                })}
              </div>

              {storico.length > 14 && (
                <button onClick={() => setStoricoEsteso(p => !p)}
                  className="w-full py-3 rounded-2xl text-sm font-semibold"
                  style={{ background: 'var(--c-18)', color: 'var(--c-50)', border: '1px solid var(--c-w6)' }}>
                  {storicoEsteso ? 'Mostra meno' : `Mostra altri ${storico.length - 14} giorni`}
                </button>
              )}
            </>
          )}
        </div>
      )}

      {/* Sheets */}
      {frigoOpen && (
        <FrigoSheet
          onClose={() => setFrigoOpen(false)}
          kcalResidue={Math.max(0, calorieEffettiveCalc - Math.round(totali.calorie))}
        />
      )}
      {genPlanOpen && (
        <GenPlanSheet
          onClose={() => setGenPlanOpen(false)}
          clienteId={userId}
          dayType={dayType}
        />
      )}

      {/* TAB: INTEGRATORI */}
      {tab === 'integratori' && (
        <div className="space-y-3">
          {pianoInt.length === 0 ? (
            <div className="rounded-2xl py-12 text-center"
              style={{ background: 'var(--c-18)', border: '1px solid var(--c-w6)' }}>
              <p className="text-3xl mb-2">💊</p>
              <p className="font-semibold text-sm" style={{ color: 'var(--c-97)' }}>
                Nessun integratore prescritto
              </p>
              <p className="text-xs mt-1" style={{ color: 'var(--c-45)' }}>
                Il tuo coach non ha ancora prescritto integratori
              </p>
            </div>
          ) : (
            <div className="rounded-2xl overflow-hidden"
              style={{ background: 'var(--c-18)', border: '1px solid var(--c-w6)' }}>
              <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--c-w6)' }}>
                <p className="font-bold text-sm" style={{ color: 'var(--c-97)' }}>Piano integratori</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--c-45)' }}>
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
                    style={{ borderBottom: i < pianoInt.length - 1 ? '1px solid var(--c-w4)' : 'none' }}>
                    <button onClick={togglePreso}
                      className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 transition-all"
                      style={{
                        background: preso ? 'oklch(0.65 0.18 150)' : 'transparent',
                        border: `2px solid ${preso ? 'oklch(0.65 0.18 150)' : 'var(--c-35)'}`,
                      }}>
                      {preso && <span className="text-xs font-black" style={{ color: 'var(--c-13)' }}>✓</span>}
                    </button>
                    <div className="flex-1 min-w-0" style={{ opacity: preso ? 0.5 : 1 }}>
                      <p className="text-sm font-semibold"
                        style={{ color: 'var(--c-97)', textDecoration: preso ? 'line-through' : 'none' }}>
                        {int.nome}
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--c-45)' }}>
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
