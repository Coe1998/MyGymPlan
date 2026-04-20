'use client'

import { useEffect, useState, useCallback } from 'react'
import BynariLoader from '@/components/shared/BynariLoader'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPlus, faXmark, faSearch, faLeaf, faPills, faChevronDown, faChevronUp, faTrash, faClockRotateLeft, faCopy } from '@fortawesome/free-solid-svg-icons'
import DietaIntelligente from '@/components/cliente/DietaIntelligente'

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

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-black tracking-tight" style={{ color: 'var(--c-97)' }}>Nutrizione</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--c-50)' }}>
          {new Date().toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
      </div>

      {/* Macro summary */}
      {target ? (
        <div className="rounded-2xl p-5 space-y-4"
          style={{ background: 'var(--c-18)', border: '1px solid var(--c-w6)' }}>
          {/* Calorie */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-sm font-bold" style={{ color: 'var(--c-97)' }}>Calorie</p>
              <p className="text-sm font-black tabular-nums" style={{ color: 'oklch(0.70 0.19 46)' }}>
                {Math.round(totali.calorie)} / {calorieEffettive ?? target.calorie} kcal
              </p>
            </div>
            <div className="w-full h-3 rounded-full overflow-hidden" style={{ background: 'var(--c-25)' }}>
              <div className="h-full rounded-full transition-all duration-500"
                style={{ width: `${perc(totali.calorie, calorieEffettive ?? target.calorie)}%`, background: 'oklch(0.70 0.19 46)' }} />
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
                style={{ background: 'var(--c-22)' }}>
                <div className="flex items-center justify-between">
                  <p className="text-xs" style={{ color: 'var(--c-55)' }}>{m.label}</p>
                  <p className="text-xs font-bold tabular-nums" style={{ color: m.color }}>
                    {Math.round(m.val)}g
                  </p>
                </div>
                <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: 'var(--c-30)' }}>
                  <div className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${perc(m.val, m.target)}%`, background: m.color }} />
                </div>
                <p className="text-xs text-right" style={{ color: 'var(--c-40)' }}>/ {m.target}g</p>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="rounded-2xl p-5 text-center"
          style={{ background: 'var(--c-18)', border: '1px solid var(--c-w6)' }}>
          <p className="text-sm" style={{ color: 'var(--c-50)' }}>
            Il tuo coach non ha ancora impostato i tuoi macro target
          </p>
        </div>
      )}

      {/* Banner carb cycling — visibile solo se cycling ON ma day_type mancante */}
      {target?.carb_cycling_enabled && dayType === null && (
        <div className="rounded-2xl px-4 py-3 flex items-center gap-3"
          style={{ background: 'oklch(0.75 0.18 80 / 8%)', border: '1px solid oklch(0.75 0.18 80 / 25%)' }}>
          <span className="text-xl flex-shrink-0">⚠️</span>
          <div>
            <p className="text-sm font-bold" style={{ color: 'oklch(0.75 0.18 80)' }}>Carb cycling attivo</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--c-55)' }}>
              Completa il check-in di oggi (alleni/riposo) per applicare i carbo corretti
            </p>
          </div>
        </div>
      )}

      {/* Badge giorno attivo quando cycling è applicato */}
      {target?.carb_cycling_enabled && dayType !== null && (
        <div className="rounded-2xl px-4 py-3 flex items-center gap-3"
          style={{
            background: dayType === 'training' ? 'oklch(0.70 0.19 46 / 8%)' : 'oklch(0.60 0.15 200 / 8%)',
            border: `1px solid ${dayType === 'training' ? 'oklch(0.70 0.19 46 / 25%)' : 'oklch(0.60 0.15 200 / 25%)'}`,
          }}>
          <span className="text-xl flex-shrink-0">{dayType === 'training' ? '🔥' : '💧'}</span>
          <div>
            <p className="text-sm font-bold"
              style={{ color: dayType === 'training' ? 'oklch(0.70 0.19 46)' : 'oklch(0.60 0.15 200)' }}>
              {dayType === 'training' ? 'HIGH CARB — Giorno allenamento' : 'LOW CARB — Giorno recupero'}
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--c-50)' }}>
              Target calorie adattato: {calorieEffettive} kcal · {carbEffettivi}g carbo
            </p>
          </div>
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
          const kcal = (calorieEffettive ?? target.calorie) * percEffettiva / 100

          if (p.macro_custom && (p.prot_pct != null || p.carb_pct != null || p.grassi_pct != null)) {
            const pp = p.prot_pct ?? 0
            const cp = p.carb_pct ?? 0
            const gp = p.grassi_pct ?? 0
            return {
              kcal: Math.round(kcal),
              prot: Math.round((kcal * pp / 100) / 4),
              carb: Math.round((kcal * cp / 100) / 4),
              grassi: Math.round((kcal * gp / 100) / 9),
            }
          }
          return {
            kcal: Math.round(kcal),
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
          kcal: Math.max(0, (calorieEffettive ?? target.calorie) - totali.calorie),
          prot: Math.max(0, target.proteine_g - totali.proteine_g),
          carb: Math.max(0, (carbEffettivi ?? target.carboidrati_g) - totali.carboidrati_g),
          grassi: Math.max(0, target.grassi_g - totali.grassi_g),
        }

        return (
          <div className="rounded-2xl overflow-hidden"
            style={{ background: 'var(--c-18)', border: '1px solid var(--c-w6)' }}>
            <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--c-w6)' }}>
              <p className="font-bold text-sm" style={{ color: 'var(--c-97)' }}>📋 Piano pasti di oggi</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--c-45)' }}>
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
                    borderBottom: i < pastiConfig.length - 1 ? '1px solid var(--c-w4)' : 'none',
                    opacity: saltato ? 0.45 : 1,
                  }}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold" style={{ color: saltato ? 'var(--c-45)' : 'var(--c-97)' }}>
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
                          style={{ background: 'var(--c-30)', color: 'var(--c-50)' }}>
                          Saltato
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      {!saltato && (
                        <button
                          onClick={() => apriCopiaPasto(pasto.nome)}
                          className="w-7 h-7 rounded-lg flex items-center justify-center transition-all"
                          style={{
                            background: copiaPastoAperto === pasto.nome ? 'oklch(0.60 0.15 200 / 20%)' : 'var(--c-22)',
                            color: copiaPastoAperto === pasto.nome ? 'oklch(0.60 0.15 200)' : 'var(--c-45)',
                          }}>
                          <FontAwesomeIcon icon={faClockRotateLeft} className="text-xs" />
                        </button>
                      )}
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
                          style={{ background: 'var(--c-22)' }}>
                          <p className="text-xs font-bold tabular-nums" style={{ color: m.color }}>
                            {m.fatto > 0 ? `${m.fatto}/` : ''}{m.target}
                          </p>
                          <p className="text-xs" style={{ color: 'var(--c-40)' }}>{m.label}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Storico pasto — pannello inline */}
                  {!saltato && copiaPastoAperto === pasto.nome && (
                    <div className="rounded-xl overflow-hidden" style={{ border: '1px solid oklch(0.60 0.15 200 / 20%)', background: 'var(--c-16)' }}>
                      <p className="text-xs font-semibold px-3 py-2" style={{ color: 'oklch(0.60 0.15 200)', borderBottom: '1px solid var(--c-w5)' }}>
                        Copia {pasto.nome} da...
                      </p>
                      {loadingStoricoPerPasto ? (
                        <BynariLoader file="blue" size={60} />
                      ) : (() => {
                        const perGiorno = new Map<string, PastoLog[]>()
                        for (const item of storicoPerPasto) {
                          if (!perGiorno.has(item.data)) perGiorno.set(item.data, [])
                          perGiorno.get(item.data)!.push(item)
                        }
                        const giorni = Array.from(perGiorno.entries()).slice(0, 7)
                        if (giorni.length === 0) return (
                          <p className="text-xs text-center py-4" style={{ color: 'var(--c-45)' }}>
                            Nessuno storico per questo pasto
                          </p>
                        )
                        return giorni.map(([d, items]) => {
                          const kcal = Math.round(items.reduce((a, x) => a + (x.calorie || 0), 0))
                          const preview = items.slice(0, 3).map(x => x.alimento_nome).join(', ')
                          return (
                            <button key={d} onClick={() => handleCopiaPasto(items)} disabled={copiando}
                              className="w-full text-left px-3 py-2.5 flex items-center justify-between gap-2 transition-all hover:opacity-80"
                              style={{ borderBottom: '1px solid var(--c-w4)' }}>
                              <div className="min-w-0">
                                <p className="text-xs font-bold" style={{ color: 'var(--c-85)' }}>{formatDataStorico(d)}</p>
                                <p className="text-xs truncate mt-0.5" style={{ color: 'var(--c-42)' }}>
                                  {preview}{items.length > 3 ? ` +${items.length - 3}` : ''}
                                </p>
                              </div>
                              <span className="text-xs font-bold flex-shrink-0" style={{ color: 'oklch(0.60 0.15 200)' }}>
                                {kcal} kcal →
                              </span>
                            </button>
                          )
                        })
                      })()}
                    </div>
                  )}
                </div>
              )
            })}

            {rimanente.kcal > 50 && pastiAttivi.length > 0 && (
              <div className="px-4 py-3 space-y-3"
                style={{ borderTop: '1px solid var(--c-w6)', background: 'var(--c-16)' }}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold" style={{ color: 'oklch(0.75 0.18 80)' }}>
                      Rimanente: {Math.round(rimanente.kcal)} kcal
                    </p>
                    <p className="text-xs" style={{ color: 'var(--c-45)' }}>
                      In quanti pasti vuoi distribuirle?
                    </p>
                  </div>
                  <div className="flex gap-1">
                    {[1, 2, 3].filter(n => n <= pastiAttivi.length).map(n => (
                      <button key={n} onClick={() => setRedistribuisciSu(redistribuisciSu === n ? null : n)}
                        className="w-8 h-8 rounded-xl text-sm font-bold transition-all"
                        style={{
                          background: redistribuisciSu === n ? 'oklch(0.75 0.18 80)' : 'var(--c-25)',
                          color: redistribuisciSu === n ? 'var(--c-13)' : 'var(--c-55)',
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
                        style={{ background: 'var(--c-20)', border: '1px solid oklch(0.75 0.18 80 / 20%)' }}>
                        <p className="text-xs font-bold tabular-nums" style={{ color: m.color }}>{m.val}</p>
                        <p className="text-xs" style={{ color: 'var(--c-40)' }}>{m.label}</p>
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
      <div className="flex gap-2 p-1 rounded-2xl" style={{ background: 'var(--c-18)' }}>
        {[
          { id: 'dieta', label: '🥗 Dieta', icon: faLeaf },
          { id: 'integratori', label: '💊 Integratori', icon: faPills },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id as any)}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all"
            style={{
              background: tab === t.id ? 'oklch(0.70 0.19 46)' : 'transparent',
              color: tab === t.id ? 'var(--c-13)' : 'var(--c-50)',
            }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* TAB: DIETA */}
      {tab === 'dieta' && (
        <div className="space-y-3">

          {/* Dieta intelligente */}
          {target && userId && (
            <DietaIntelligente clienteId={userId} dayType={dayType} />
          )}

          {/* Copia giornata intera */}
          {!copiaGiornataAperta ? (
            <button onClick={apriCopiaGiornata}
              className="w-full py-2.5 rounded-2xl text-sm font-semibold flex items-center justify-center gap-2"
              style={{ background: 'var(--c-18)', color: 'var(--c-55)', border: '1px solid var(--c-w6)' }}>
              <FontAwesomeIcon icon={faCopy} className="text-xs" /> Copia giornata precedente
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
              <div className="flex items-center justify-between">
                <p className="font-bold text-sm" style={{ color: 'var(--c-97)' }}>Aggiungi alimento</p>
                <button onClick={() => { setShowForm(false); setSelectedFood(null); setSearchQuery(''); setSearchResults([]) }}
                  className="w-8 h-8 rounded-full flex items-center justify-center"
                  style={{ background: 'var(--c-25)', color: 'var(--c-55)' }}>
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
                      style={{ background: 'var(--c-22)', border: '1px solid var(--c-w8)', color: 'var(--c-97)' }}
                      onFocus={e => e.target.style.borderColor = 'oklch(0.70 0.19 46)'}
                      onBlur={e => e.target.style.borderColor = 'var(--c-w8)'} />
                    <button onClick={searchFood} disabled={searching}
                      className="px-4 py-3 rounded-xl text-sm font-bold flex-shrink-0"
                      style={{ background: 'oklch(0.70 0.19 46)', color: 'var(--c-11)' }}>
                      {searching ? '...' : <FontAwesomeIcon icon={faSearch} />}
                    </button>
                  </div>

                  {searchResults.length > 0 && (
                    <div className="rounded-xl overflow-hidden"
                      style={{ border: '1px solid var(--c-w8)' }}>
                      {searchResults.map((r, i) => (
                        <button key={i} onClick={() => setSelectedFood(r)}
                          className="w-full text-left px-4 py-3 transition-all hover:opacity-80"
                          style={{
                            background: i % 2 === 0 ? 'var(--c-20)' : 'var(--c-18)',
                            borderBottom: i < searchResults.length - 1 ? '1px solid var(--c-w5)' : 'none',
                          }}>
                          <p className="text-sm font-medium" style={{ color: 'var(--c-90)' }}>{r.product_name}</p>
                          <p className="text-xs mt-0.5" style={{ color: 'var(--c-45)' }}>
                            {Math.round(r.nutriments['energy-kcal_100g'] ?? 0)} kcal · {Math.round(r.nutriments.proteins_100g ?? 0)}g prot · {Math.round(r.nutriments.carbohydrates_100g ?? 0)}g carb · {Math.round(r.nutriments.fat_100g ?? 0)}g grassi — per 100g
                          </p>
                        </button>
                      ))}
                    </div>
                  )}

                  {searchResults.length === 0 && !searching && searchQuery && (
                    <p className="text-sm text-center py-4" style={{ color: 'var(--c-45)' }}>
                      Nessun risultato. Prova un termine diverso.
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Alimento selezionato */}
                  <div className="flex items-center gap-2">
                    <div className="flex-1 px-4 py-3 rounded-xl text-sm font-semibold"
                      style={{ background: 'oklch(0.70 0.19 46 / 12%)', color: 'var(--c-97)', border: '1px solid oklch(0.70 0.19 46 / 25%)' }}>
                      {selectedFood.product_name}
                    </div>
                    <button onClick={() => setSelectedFood(null)}
                      className="w-9 h-9 rounded-xl flex items-center justify-center"
                      style={{ background: 'var(--c-25)', color: 'var(--c-55)' }}>
                      <FontAwesomeIcon icon={faXmark} className="text-xs" />
                    </button>
                  </div>

                  {/* Quantità */}
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
                            style={{ background: 'var(--c-22)' }}>
                            <p className="text-lg font-black" style={{ color: x.color }}>{x.val}</p>
                            <p className="text-xs mt-0.5" style={{ color: 'var(--c-45)' }}>{x.label}</p>
                          </div>
                        ))}
                      </div>
                    )
                  })()}

                  {/* Assegna a pasto */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--c-50)' }}>
                      Aggiungi a
                    </label>

                    {target?.pasti_config && target.pasti_config.length > 0 ? (
                      <>
                        {/* Griglia pasti del coach */}
                        <div className="grid grid-cols-2 gap-2">
                          {target.pasti_config.map(p => {
                            const isSelected = gruppoNome === p.nome
                            return (
                              <button key={p.nome}
                                onClick={() => { setGruppoNome(isSelected ? '' : p.nome); setGruppoEsistente('') }}
                                className="px-3 py-2.5 rounded-xl text-left transition-all"
                                style={{
                                  background: isSelected ? 'oklch(0.70 0.19 46 / 15%)' : 'var(--c-22)',
                                  border: `1px solid ${isSelected ? 'oklch(0.70 0.19 46 / 50%)' : 'var(--c-w6)'}`,
                                }}>
                                <p className="text-sm font-bold" style={{ color: isSelected ? 'oklch(0.70 0.19 46)' : 'var(--c-90)' }}>
                                  {p.nome}
                                </p>
                                <p className="text-xs" style={{ color: 'var(--c-45)' }}>{p.percentuale}% delle kcal</p>
                              </button>
                            )
                          })}
                          {/* Fuori dai pasti */}
                          <button
                            onClick={() => { setGruppoNome(''); setGruppoEsistente('') }}
                            className="px-3 py-2.5 rounded-xl text-left transition-all"
                            style={{
                              background: gruppoNome === '' && gruppoEsistente === '' ? 'var(--c-25)' : 'var(--c-20)',
                              border: '1px solid var(--c-w4)',
                            }}>
                            <p className="text-sm font-bold" style={{ color: 'var(--c-55)' }}>Fuori dai pasti</p>
                            <p className="text-xs" style={{ color: 'var(--c-38)' }}>Conta nel totale giornaliero</p>
                          </button>
                        </div>
                        {/* Eventuali gruppi loggati oggi non nei pasti del coach */}
                        {gruppiEsistenti.filter(g => !target.pasti_config!.some(p => p.nome === g)).length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {gruppiEsistenti
                              .filter(g => !target.pasti_config!.some(p => p.nome === g))
                              .map(g => (
                                <button key={g}
                                  onClick={() => { setGruppoNome(gruppoNome === g ? '' : g); setGruppoEsistente('') }}
                                  className="px-2.5 py-1 rounded-full text-xs font-semibold"
                                  style={{
                                    background: gruppoNome === g ? 'oklch(0.60 0.15 200 / 15%)' : 'var(--c-22)',
                                    color: gruppoNome === g ? 'oklch(0.60 0.15 200)' : 'var(--c-45)',
                                  }}>
                                  {g}
                                </button>
                              ))}
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        {/* Nessun piano coach: mostra gruppi esistenti + input libero */}
                        {gruppiEsistenti.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {gruppiEsistenti.map(g => (
                              <button key={g} onClick={() => { setGruppoEsistente(g === gruppoEsistente ? '' : g); setGruppoNome('') }}
                                className="px-3 py-1.5 rounded-full text-xs font-semibold"
                                style={{
                                  background: gruppoEsistente === g ? 'oklch(0.60 0.15 200 / 20%)' : 'var(--c-22)',
                                  color: gruppoEsistente === g ? 'oklch(0.60 0.15 200)' : 'var(--c-50)',
                                }}>
                                {g}
                              </button>
                            ))}
                          </div>
                        )}
                        <input type="text" value={gruppoNome}
                          onChange={e => { setGruppoNome(e.target.value); setGruppoEsistente('') }}
                          placeholder="Pasto (es. Pranzo, Post workout...)"
                          className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
                          style={{ background: 'var(--c-22)', border: '1px solid var(--c-w8)', color: 'var(--c-97)' }}
                          onFocus={e => e.target.style.borderColor = 'oklch(0.70 0.19 46)'}
                          onBlur={e => e.target.style.borderColor = 'var(--c-w8)'} />
                      </>
                    )}
                  </div>

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
              className="w-full py-3.5 rounded-2xl text-sm font-bold flex items-center justify-center gap-2"
              style={{ background: 'transparent', color: 'oklch(0.70 0.19 46)', border: '2px dashed oklch(0.70 0.19 46 / 30%)' }}>
              <FontAwesomeIcon icon={faPlus} /> Aggiungi alimento
            </button>
          )}

          {/* Lista pasti */}
          {loading ? (
            <BynariLoader file="blue" size={80} />
          ) : pastiRaggruppati.length === 0 ? (
            <div className="rounded-2xl py-12 text-center"
              style={{ background: 'var(--c-18)', border: '1px solid var(--c-w6)' }}>
              <p className="text-3xl mb-2">🥗</p>
              <p className="font-semibold text-sm" style={{ color: 'var(--c-97)' }}>Nessun alimento registrato oggi</p>
              <p className="text-xs mt-1" style={{ color: 'var(--c-45)' }}>Inizia aggiungendo il tuo primo alimento</p>
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
                    style={{ background: 'var(--c-18)', border: '1px solid var(--c-w6)' }}>
                    {gruppo.label && (
                      <div className="flex items-center justify-between px-4 py-3 cursor-pointer"
                        style={{ borderBottom: isCollapsed ? 'none' : '1px solid var(--c-w6)', background: 'var(--c-15)' }}
                        onClick={() => setCollapsedGroups(prev => {
                          const n = new Set(prev)
                          n.has(gruppo.key) ? n.delete(gruppo.key) : n.add(gruppo.key)
                          return n
                        })}>
                        <div>
                          <p className="font-bold text-sm" style={{ color: 'var(--c-97)' }}>{gruppo.label}</p>
                          <p className="text-xs mt-0.5" style={{ color: 'var(--c-45)' }}>
                            {Math.round(totGruppo.calorie)} kcal · {Math.round(totGruppo.proteine_g)}p · {Math.round(totGruppo.carboidrati_g)}c · {Math.round(totGruppo.grassi_g)}g
                          </p>
                        </div>
                        <FontAwesomeIcon icon={isCollapsed ? faChevronDown : faChevronUp}
                          className="text-xs" style={{ color: 'var(--c-45)' }} />
                      </div>
                    )}
                    {!isCollapsed && gruppo.items.map((p, i) => (
                      <div key={p.id} className="flex items-center gap-3 px-4 py-3"
                        style={{ borderBottom: i < gruppo.items.length - 1 ? '1px solid var(--c-w4)' : 'none' }}>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate" style={{ color: 'var(--c-90)' }}>{p.alimento_nome}</p>
                          <p className="text-xs mt-0.5" style={{ color: 'var(--c-45)' }}>
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
