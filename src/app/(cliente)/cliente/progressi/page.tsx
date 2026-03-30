'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar
} from 'recharts'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faDumbbell, faCalendarDays, faCircleCheck, faChartBar,
  faScaleBalanced, faCamera, faUpload, faPause, faPersonRunning,
  faFaceTired, faFaceFrown, faFaceMeh, faFaceSmile, faFaceGrinStars,
  faChevronLeft, faChevronRight, faXmark, faShareNodes,
} from '@fortawesome/free-solid-svg-icons'
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core'
import ShareOverlayWeek from '@/components/shared/ShareOverlayWeek'

type Tab = 'grafici' | 'misurazioni' | 'foto' | 'checkin'

interface Sessione {
  id: string
  data: string
  completata: boolean
  scheda_giorni: { nome: string } | null
}

interface EsercizioOption {
  id: string
  nome: string
}

interface PuntoGrafico {
  data: string
  peso_max: number
  volume: number
}

interface Misurazione {
  id: string
  data: string
  peso_kg: number | null
  note: string | null
}

interface FotoProgressi {
  id: string
  created_at: string
  url: string
}

interface Checkin {
  id: string
  data: string
  energia: number
  sonno: number
  stress: number
  motivazione: number
  note: string | null
}

const EMOJI_VOTO: (IconDefinition | null)[] = [null, faFaceTired, faFaceFrown, faFaceMeh, faFaceSmile, faFaceGrinStars]

interface WeekData {
  label: string
  volume: number
  reps: number
  sessioni: number
  durataSecondi: number
  inizioISO: string
}

const fmt = (d: Date) => d.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })

const getLunedi = (offsetSettimane = 0): Date => {
  const d = new Date()
  d.setDate(d.getDate() - d.getDay() + 1 + offsetSettimane * 7)
  d.setHours(0, 0, 0, 0)
  return d
}

const formatDurataWeek = (sec: number) =>
  sec > 0
    ? `${Math.floor(sec / 3600).toString().padStart(2, '0')}:${Math.floor((sec % 3600) / 60).toString().padStart(2, '0')}:${(sec % 60).toString().padStart(2, '0')}`
    : '—'

const formatDurataShort = (sec: number) =>
  sec > 0
    ? `${Math.floor(sec / 3600)}h${Math.floor((sec % 3600) / 60)}m`
    : '—'

export default function ProgressiPage() {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('grafici')
  const [sessioni, setSessioni] = useState<Sessione[]>([])
  const [esercizi, setEsercizi] = useState<EsercizioOption[]>([])
  const [selectedEsercizio, setSelectedEsercizio] = useState('')
  const [graficoDati, setGraficoDati] = useState<PuntoGrafico[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingGrafico, setLoadingGrafico] = useState(false)

  // Misurazioni
  const [misurazioni, setMisurazioni] = useState<Misurazione[]>([])
  const [newPeso, setNewPeso] = useState('')
  const [newMisNote, setNewMisNote] = useState('')
  const [savingMis, setSavingMis] = useState(false)

  // Foto
  const [foto, setFoto] = useState<FotoProgressi[]>([])
  const [uploadingFoto, setUploadingFoto] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const [fotoSelezionata, setFotoSelezionata] = useState<string | null>(null)

  // Check-in
  const [checkins, setCheckins] = useState<Checkin[]>([])
  const [checkinOggi, setCheckinOggi] = useState<Checkin | null>(null)
  const [newCheckin, setNewCheckin] = useState({ energia: 0, sonno: 0, stress: 0, motivazione: 0, note: '' })
  const [savingCheckin, setSavingCheckin] = useState(false)

  // Riepilogo settimanale
  const [weekVolume, setWeekVolume] = useState(0)
  const [weekReps, setWeekReps] = useState(0)
  const [weekSessioni, setWeekSessioni] = useState(0)
  const [weekDurataSecondi, setWeekDurataSecondi] = useState(0)
  const [weekLabel, setWeekLabel] = useState('')
  const [showWeekShare, setShowWeekShare] = useState(false)
  const [weekOffset, setWeekOffset] = useState(0) // 0 = corrente, -1 = precedente
  const [showStorico, setShowStorico] = useState(false)
  const [storicoSettimane, setStoricoSettimane] = useState<WeekData[]>([])
  const [storicoShareIdx, setStoricoShareIdx] = useState<number | null>(null)

  // Cache sessioni con durata per il calcolo settimanale
  const sessioniCacheRef = useRef<any[]>([])

  const supabase = createClient()

  const fetchAll = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: sessioniData } = await supabase
      .from('sessioni').select('id, data, completata, scheda_giorni ( nome )')
      .eq('cliente_id', user.id).order('data', { ascending: false })
    setSessioni((sessioniData as any) ?? [])

    const { data: logData } = await supabase
      .from('log_serie')
      .select('scheda_esercizio_id, scheda_esercizi!inner ( esercizi!scheda_esercizi_esercizio_id_fkey ( id, nome ) )')
      .in('sessione_id', (sessioniData ?? []).map((s: any) => s.id))
    const eserciziMap = new Map<string, EsercizioOption>()
    for (const log of (logData ?? []) as any[]) {
      const id = log.scheda_esercizi?.esercizi?.id
      const nome = log.scheda_esercizi?.esercizi?.nome
      if (id && !eserciziMap.has(id)) eserciziMap.set(id, { id, nome })
    }
    const eserciziList = Array.from(eserciziMap.values()).sort((a, b) => a.nome.localeCompare(b.nome))
    setEsercizi(eserciziList)
    if (eserciziList.length > 0) setSelectedEsercizio(eserciziList[0].id)

    const { data: misData } = await supabase
      .from('misurazioni').select('*').eq('cliente_id', user.id).order('data', { ascending: false })
    setMisurazioni(misData ?? [])

    const { data: fotoData } = await supabase.storage.from('progressi-foto')
      .list(`${user.id}`, { sortBy: { column: 'created_at', order: 'desc' } })
    if (fotoData) {
      const fotoConUrl = fotoData
        .filter(f => f.id !== null)
        .map(f => {
          const { data: urlData } = supabase.storage.from('progressi-foto')
            .getPublicUrl(`${user.id}/${f.name}`)
          return { id: f.id as string, created_at: f.created_at ?? '', url: urlData.publicUrl }
        })
      setFoto(fotoConUrl)
    }

    const { data: checkinData } = await supabase
      .from('checkin').select('*').eq('cliente_id', user.id).order('data', { ascending: false })
    setCheckins(checkinData ?? [])
    const oggi = new Date().toISOString().split('T')[0]
    const checkinDiOggi = checkinData?.find(c => c.data === oggi) ?? null
    setCheckinOggi(checkinDiOggi)

    // ── Dati settimanali con offset ───────────────────────────────
    // Salva sessioni con durata in cache per riuso
    const ids = (sessioniData ?? []).filter((s: any) => s.completata).map((s: any) => s.id)
    let sessioniConDurata: any[] = []
    if (ids.length > 0) {
      const { data: durataData } = await supabase
        .from('sessioni').select('id, data, durata_secondi').in('id', ids)
      sessioniConDurata = durataData ?? []
    }
    sessioniCacheRef.current = sessioniConDurata

    // Fetch log_serie una sola volta per tutte le sessioni completate
    let allLogs: any[] = []
    if (ids.length > 0) {
      const { data: logsAll } = await supabase
        .from('log_serie').select('sessione_id, peso_kg, ripetizioni, completata')
        .in('sessione_id', ids).eq('completata', true)
      allLogs = logsAll ?? []
    }

    // Calcola stats per una settimana dato offset (0 = corrente, -1 = precedente, ecc.)
    const calcWeek = (offset: number): WeekData => {
      const lun = getLunedi(offset)
      const dom = new Date(lun); dom.setDate(dom.getDate() + 6); dom.setHours(23, 59, 59, 999)
      const label = `${fmt(lun)} – ${fmt(dom)}`
      const sessWeek = (sessioniData ?? []).filter((s: any) =>
        s.completata && new Date(s.data) >= lun && new Date(s.data) <= dom
      )
      const weekIds = sessWeek.map((s: any) => s.id)
      const weekLogs = allLogs.filter(l => weekIds.includes(l.sessione_id))
      let vol = 0, rep = 0
      for (const l of weekLogs) {
        vol += (parseFloat(l.peso_kg) || 0) * (parseInt(l.ripetizioni) || 0)
        rep += parseInt(l.ripetizioni) || 0
      }
      const totSec = sessioniConDurata
        .filter(s => weekIds.includes(s.id))
        .reduce((acc, s) => acc + (s.durata_secondi ?? 0), 0)
      return { label, volume: Math.round(vol), reps: rep, sessioni: sessWeek.length, durataSecondi: totSec, inizioISO: lun.toISOString() }
    }

    // Settimana corrente e precedente
    const current = calcWeek(0)
    setWeekLabel(current.label)
    setWeekVolume(current.volume)
    setWeekReps(current.reps)
    setWeekSessioni(current.sessioni)
    setWeekDurataSecondi(current.durataSecondi)

    // Storico: tutte le settimane che hanno almeno 1 sessione
    const settimaneSet = new Set<string>()
    for (const s of (sessioniData ?? []).filter((s: any) => s.completata)) {
      const lun = getLunedi(0)
      const d = new Date(s.data)
      const lunS = new Date(d); lunS.setDate(d.getDate() - d.getDay() + 1); lunS.setHours(0,0,0,0)
      settimaneSet.add(lunS.toISOString())
    }
    const storico: WeekData[] = []
    for (const lunISO of Array.from(settimaneSet).sort((a, b) => b.localeCompare(a))) {
      const lun = new Date(lunISO)
      const dom = new Date(lun); dom.setDate(dom.getDate() + 6); dom.setHours(23, 59, 59, 999)
      const label = `${fmt(lun)} – ${fmt(dom)}`
      const sessWeek = (sessioniData ?? []).filter((s: any) =>
        s.completata && new Date(s.data) >= lun && new Date(s.data) <= dom
      )
      const weekIds = sessWeek.map((s: any) => s.id)
      const weekLogs = allLogs.filter(l => weekIds.includes(l.sessione_id))
      let vol = 0, rep = 0
      for (const l of weekLogs) {
        vol += (parseFloat(l.peso_kg) || 0) * (parseInt(l.ripetizioni) || 0)
        rep += parseInt(l.ripetizioni) || 0
      }
      const totSec = sessioniConDurata.filter(s => weekIds.includes(s.id)).reduce((acc, s) => acc + (s.durata_secondi ?? 0), 0)
      storico.push({ label, volume: Math.round(vol), reps: rep, sessioni: sessWeek.length, durataSecondi: totSec, inizioISO: lunISO })
    }
    setStoricoSettimane(storico)

    setLoading(false)
  }

  const fetchGrafico = async (eseId: string) => {
    if (!eseId) return
    setLoadingGrafico(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: logs } = await supabase
      .from('log_serie')
      .select('peso_kg, ripetizioni, completata, scheda_esercizi!inner ( esercizi!inner ( id ) ), sessioni!inner ( data, completata, cliente_id )')
      .eq('scheda_esercizi.esercizi.id', eseId)
      .eq('sessioni.cliente_id', user.id)
      .eq('sessioni.completata', true)
      .eq('completata', true)
      .order('sessioni(data)', { ascending: true })

    const byData = new Map<string, { pesi: number[]; volume: number }>()
    for (const log of (logs ?? []) as any[]) {
      const data = new Date(log.sessioni.data).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })
      const peso = parseFloat(log.peso_kg) || 0
      const reps = parseInt(log.ripetizioni) || 0
      if (!byData.has(data)) byData.set(data, { pesi: [], volume: 0 })
      const entry = byData.get(data)!
      if (peso > 0) entry.pesi.push(peso)
      entry.volume += peso * reps
    }
    setGraficoDati(Array.from(byData.entries()).map(([data, val]) => ({
      data, peso_max: val.pesi.length > 0 ? Math.max(...val.pesi) : 0, volume: Math.round(val.volume),
    })))
    setLoadingGrafico(false)
  }

  useEffect(() => { fetchAll() }, [])
  useEffect(() => { if (selectedEsercizio) fetchGrafico(selectedEsercizio) }, [selectedEsercizio])

  // Aggiorna dati visualizzati quando cambia l'offset settimana
  useEffect(() => {
    if (storicoSettimane.length === 0) return
    // offset 0 = prima voce storico (corrente), -1 = seconda
    const idx = weekOffset === 0 ? 0 : 1
    const w = storicoSettimane[idx]
    if (!w) return
    setWeekLabel(w.label)
    setWeekVolume(w.volume)
    setWeekReps(w.reps)
    setWeekSessioni(w.sessioni)
    setWeekDurataSecondi(w.durataSecondi)
  }, [weekOffset, storicoSettimane])

  const handleSaveMisurazione = async () => {
    if (!newPeso.trim()) return
    setSavingMis(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('misurazioni').insert({
      cliente_id: user.id,
      peso_kg: parseFloat(newPeso),
      note: newMisNote.trim() || null,
      data: new Date().toISOString().split('T')[0],
    })
    setNewPeso(''); setNewMisNote('')
    setSavingMis(false)
    fetchAll()
  }

  const handleDeleteMisurazione = async (id: string) => {
    await supabase.from('misurazioni').delete().eq('id', id)
    fetchAll()
  }

  const handleUploadFoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingFoto(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const ext = file.name.split('.').pop()
    const filename = `${user.id}/${Date.now()}.${ext}`
    await supabase.storage.from('progressi-foto').upload(filename, file)
    setUploadingFoto(false)
    fetchAll()
  }

  const handleDeleteFoto = async (url: string) => {
    if (!confirm('Vuoi eliminare questa foto?')) return
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const path = url.split(`progressi-foto/`)[1]
    await supabase.storage.from('progressi-foto').remove([path])
    fetchAll()
  }

  const handleSaveCheckin = async () => {
    if (!newCheckin.energia || !newCheckin.sonno || !newCheckin.stress || !newCheckin.motivazione) return
    setSavingCheckin(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const oggi = new Date().toISOString().split('T')[0]
    await supabase.from('checkin').upsert({
      cliente_id: user.id, data: oggi,
      energia: newCheckin.energia, sonno: newCheckin.sonno,
      stress: newCheckin.stress, motivazione: newCheckin.motivazione,
      note: newCheckin.note.trim() || null,
    }, { onConflict: 'cliente_id,data' })
    setNewCheckin({ energia: 0, sonno: 0, stress: 0, motivazione: 0, note: '' })
    setSavingCheckin(false)
    fetchAll()
  }

  const sessioniCompletate = sessioni.filter(s => s.completata).length
  const sessioniSettimana = sessioni.filter(s => {
    const diff = (Date.now() - new Date(s.data).getTime()) / (1000 * 60 * 60 * 24)
    return diff <= 7 && s.completata
  }).length

  const tooltipStyle = {
    backgroundColor: 'oklch(0.22 0 0)', border: '1px solid oklch(1 0 0 / 10%)',
    borderRadius: '12px', color: 'oklch(0.97 0 0)', fontSize: '12px',
  }

  const frequenzaSettimanale = () => {
    const settimane = new Map<string, number>()
    for (const s of sessioni.filter(s => s.completata)) {
      const data = new Date(s.data)
      const lunedi = new Date(data)
      lunedi.setDate(data.getDate() - data.getDay() + 1)
      const key = lunedi.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })
      settimane.set(key, (settimane.get(key) ?? 0) + 1)
    }
    return Array.from(settimane.entries()).slice(-8).map(([settimana, allenamenti]) => ({ settimana, allenamenti }))
  }

  const tabs: { id: Tab; label: string; icon: IconDefinition }[] = [
    { id: 'grafici', label: 'Grafici', icon: faChartBar },
    { id: 'misurazioni', label: 'Misure', icon: faScaleBalanced },
    { id: 'foto', label: 'Foto', icon: faCamera },
    { id: 'checkin', label: 'Check-in', icon: faCircleCheck },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <p className="text-sm" style={{ color: 'oklch(0.45 0 0)' }}>Caricamento...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-3xl lg:text-4xl font-black tracking-tight" style={{ color: 'oklch(0.97 0 0)' }}>Progressi</h1>
        <p className="mt-1 text-sm" style={{ color: 'oklch(0.50 0 0)' }}>Il tuo percorso di miglioramento</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Sessioni', value: sessioniCompletate, icon: faDumbbell, color: 'oklch(0.60 0.15 200)' },
          { label: 'Questa settimana', value: sessioniSettimana, icon: faCalendarDays, color: 'oklch(0.70 0.19 46)' },
          { label: 'Check-in', value: checkins.length, icon: faCircleCheck, color: 'oklch(0.65 0.18 150)' },
        ].map((stat) => (
          <div key={stat.label} className="rounded-2xl p-4 space-y-2"
            style={{ background: 'oklch(0.18 0 0)', border: '1px solid oklch(1 0 0 / 6%)' }}>
            <div className="flex items-center justify-between">
              <p className="text-xs" style={{ color: 'oklch(0.50 0 0)' }}>{stat.label}</p>
              <FontAwesomeIcon icon={stat.icon} />
            </div>
            <p className="text-3xl font-black" style={{ color: stat.color }}>{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-2 p-1 rounded-2xl" style={{ background: 'oklch(0.18 0 0)' }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-semibold transition-all"
            style={{
              background: tab === t.id ? 'oklch(0.60 0.15 200)' : 'transparent',
              color: tab === t.id ? 'oklch(0.13 0 0)' : 'oklch(0.50 0 0)',
            }}>
            <FontAwesomeIcon icon={t.icon} />
            <span className="hidden sm:inline">{t.label}</span>
          </button>
        ))}
      </div>

      {/* TAB: GRAFICI */}
      {tab === 'grafici' && (
        <div className="space-y-6">

          {/* ── Riepilogo settimanale ── */}
          <div className="rounded-2xl overflow-hidden"
            style={{ background: 'oklch(0.18 0 0)', border: '1px solid oklch(0.70 0.19 46 / 25%)' }}>

            {/* Header con frecce navigazione */}
            <div className="px-5 py-4 flex items-center justify-between"
              style={{ borderBottom: '1px solid oklch(1 0 0 / 6%)' }}>
              <div className="flex items-center gap-2">
                {/* ← solo se siamo sulla settimana corrente (per andare alla precedente) */}
                <button
                  onClick={() => { setWeekOffset(-1); setShowWeekShare(false) }}
                  disabled={weekOffset === -1}
                  className="w-7 h-7 rounded-lg flex items-center justify-center transition-all"
                  style={{
                    background: weekOffset === -1 ? 'oklch(0.70 0.19 46)' : 'oklch(0.22 0 0)',
                    color: weekOffset === -1 ? 'oklch(0.13 0 0)' : 'oklch(0.55 0 0)',
                    opacity: weekOffset === -1 ? 1 : 0.6,
                  }}>
                  <FontAwesomeIcon icon={faChevronLeft} className="text-xs" />
                </button>
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest"
                    style={{ color: 'oklch(0.70 0.19 46)' }}>
                    {weekOffset === 0 ? 'Questa settimana' : 'Settimana scorsa'}
                  </p>
                  <p className="font-black text-sm" style={{ color: 'oklch(0.97 0 0)' }}>{weekLabel}</p>
                </div>
                {/* → torna alla corrente */}
                {weekOffset === -1 && (
                  <button
                    onClick={() => { setWeekOffset(0); setShowWeekShare(false) }}
                    className="w-7 h-7 rounded-lg flex items-center justify-center transition-all"
                    style={{ background: 'oklch(0.22 0 0)', color: 'oklch(0.55 0 0)' }}>
                    <FontAwesomeIcon icon={faChevronRight} className="text-xs" />
                  </button>
                )}
              </div>
              <button
                onClick={() => setShowWeekShare(p => !p)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all active:scale-95"
                style={{
                  background: showWeekShare ? 'oklch(0.70 0.19 46)' : 'oklch(0.70 0.19 46 / 15%)',
                  color: showWeekShare ? 'oklch(0.13 0 0)' : 'oklch(0.70 0.19 46)',
                }}>
                <FontAwesomeIcon icon={faShareNodes} />
                {showWeekShare ? 'Chiudi' : 'Condividi'}
              </button>
            </div>

            {/* Stats mini */}
            {!showWeekShare && (
              <div className="grid grid-cols-4 divide-x"
                style={{ borderColor: 'oklch(1 0 0 / 6%)' }}>
                {[
                  { label: 'Allenamenti', value: weekSessioni },
                  { label: 'Volume kg', value: weekVolume.toLocaleString('it-IT') },
                  { label: 'Reps', value: weekReps.toLocaleString('it-IT') },
                  { label: 'Tempo', value: formatDurataShort(weekDurataSecondi) },
                ].map(s => (
                  <div key={s.label} className="p-3 text-center">
                    <p className="text-base font-black" style={{ color: 'oklch(0.97 0 0)' }}>{s.value}</p>
                    <p className="text-xs mt-0.5" style={{ color: 'oklch(0.45 0 0)' }}>{s.label}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Share overlay */}
            {showWeekShare && weekSessioni > 0 && (
              <div className="p-5">
                <ShareOverlayWeek
                  weekLabel={weekLabel}
                  volume={weekVolume}
                  reps={weekReps}
                  sessioni={weekSessioni}
                  durata={formatDurataWeek(weekDurataSecondi)}
                />
              </div>
            )}
            {showWeekShare && weekSessioni === 0 && (
              <div className="p-6 text-center">
                <p className="text-sm" style={{ color: 'oklch(0.50 0 0)' }}>Nessun allenamento questa settimana.</p>
              </div>
            )}

            {/* Storico button */}
            {!showWeekShare && storicoSettimane.length > 2 && (
              <div className="px-5 py-3" style={{ borderTop: '1px solid oklch(1 0 0 / 6%)' }}>
                <button
                  onClick={() => setShowStorico(true)}
                  className="w-full py-2.5 rounded-xl text-xs font-bold transition-all"
                  style={{ background: 'oklch(0.22 0 0)', color: 'oklch(0.60 0 0)', border: '1px solid oklch(1 0 0 / 8%)' }}>
                  Visualizza storico completo ({storicoSettimane.length} settimane) →
                </button>
              </div>
            )}
          </div>

          {/* ── Modal storico ── */}
          {showStorico && (
            <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
              style={{ background: 'oklch(0 0 0 / 75%)' }}
              onClick={() => { setShowStorico(false); setStoricoShareIdx(null) }}>
              <div className="w-full max-w-lg rounded-3xl overflow-hidden"
                style={{ background: 'oklch(0.16 0 0)', border: '1px solid oklch(1 0 0 / 8%)', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}
                onClick={e => e.stopPropagation()}>

                {/* Modal header */}
                <div className="px-6 py-4 flex items-center justify-between flex-shrink-0"
                  style={{ borderBottom: '1px solid oklch(1 0 0 / 8%)' }}>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'oklch(0.70 0.19 46)' }}>Storico</p>
                    <h2 className="font-black" style={{ color: 'oklch(0.97 0 0)' }}>Tutti i riepiloghi</h2>
                  </div>
                  <button onClick={() => { setShowStorico(false); setStoricoShareIdx(null) }}
                    className="w-9 h-9 rounded-full flex items-center justify-center"
                    style={{ background: 'oklch(0.22 0 0)', color: 'oklch(0.55 0 0)' }}>
                    <FontAwesomeIcon icon={faXmark} />
                  </button>
                </div>

                {/* Lista settimane */}
                <div className="overflow-y-auto flex-1">
                  {storicoSettimane.map((w, i) => (
                    <div key={w.inizioISO}>
                      <div className="px-5 py-4"
                        style={{ borderBottom: '1px solid oklch(1 0 0 / 5%)' }}>
                        {/* Header settimana */}
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <p className="text-xs font-bold" style={{ color: 'oklch(0.70 0.19 46)' }}>
                              {i === 0 ? 'Questa settimana' : i === 1 ? 'Settimana scorsa' : w.label}
                            </p>
                            {i > 1 && <p className="text-xs mt-0.5" style={{ color: 'oklch(0.40 0 0)' }}>{w.label}</p>}
                          </div>
                          <button
                            onClick={() => setStoricoShareIdx(storicoShareIdx === i ? null : i)}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all"
                            style={{
                              background: storicoShareIdx === i ? 'oklch(0.70 0.19 46)' : 'oklch(0.22 0 0)',
                              color: storicoShareIdx === i ? 'oklch(0.13 0 0)' : 'oklch(0.55 0 0)',
                            }}>
                            <FontAwesomeIcon icon={faShareNodes} />
                            {storicoShareIdx === i ? 'Chiudi' : 'Share'}
                          </button>
                        </div>

                        {/* Stats inline */}
                        {storicoShareIdx !== i && (
                          <div className="grid grid-cols-4 gap-2">
                            {[
                              { label: 'Allenamenti', value: w.sessioni },
                              { label: 'Volume', value: `${w.volume.toLocaleString('it-IT')} kg` },
                              { label: 'Reps', value: w.reps.toLocaleString('it-IT') },
                              { label: 'Tempo', value: formatDurataShort(w.durataSecondi) },
                            ].map(s => (
                              <div key={s.label} className="rounded-xl p-2.5 text-center"
                                style={{ background: 'oklch(0.20 0 0)' }}>
                                <p className="text-sm font-black" style={{ color: 'oklch(0.97 0 0)' }}>{s.value}</p>
                                <p className="text-xs mt-0.5" style={{ color: 'oklch(0.42 0 0)' }}>{s.label}</p>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Share overlay nel modal */}
                        {storicoShareIdx === i && w.sessioni > 0 && (
                          <ShareOverlayWeek
                            weekLabel={w.label}
                            volume={w.volume}
                            reps={w.reps}
                            sessioni={w.sessioni}
                            durata={formatDurataWeek(w.durataSecondi)}
                          />
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Drag handle */}
                <div className="flex justify-center py-3 flex-shrink-0">
                  <div className="w-10 h-1 rounded-full" style={{ background: 'oklch(0.28 0 0)' }} />
                </div>
              </div>
            </div>
          )}
          {sessioniCompletate > 0 && (
            <div className="rounded-2xl p-5 space-y-4"
              style={{ background: 'oklch(0.18 0 0)', border: '1px solid oklch(1 0 0 / 6%)' }}>
              <h2 className="font-bold" style={{ color: 'oklch(0.97 0 0)' }}>Frequenza settimanale</h2>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={frequenzaSettimanale()} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 5%)" />
                  <XAxis dataKey="settimana" tick={{ fill: 'oklch(0.50 0 0)', fontSize: 10 }} />
                  <YAxis tick={{ fill: 'oklch(0.50 0 0)', fontSize: 10 }} allowDecimals={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="allenamenti" fill="oklch(0.60 0.15 200)" radius={[6, 6, 0, 0]} name="Allenamenti" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {esercizi.length > 0 && (
            <div className="rounded-2xl p-5 space-y-5"
              style={{ background: 'oklch(0.18 0 0)', border: '1px solid oklch(1 0 0 / 6%)' }}>
              <div className="flex items-center justify-between flex-wrap gap-3">
                <h2 className="font-bold" style={{ color: 'oklch(0.97 0 0)' }}>Progressione</h2>
                <select value={selectedEsercizio} onChange={(e) => setSelectedEsercizio(e.target.value)}
                  className="px-3 py-2 rounded-xl text-sm outline-none"
                  style={{ background: 'oklch(0.22 0 0)', border: '1px solid oklch(1 0 0 / 8%)', color: 'oklch(0.97 0 0)' }}>
                  {esercizi.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
                </select>
              </div>
              {loadingGrafico ? (
                <div className="h-40 flex items-center justify-center">
                  <p className="text-sm" style={{ color: 'oklch(0.45 0 0)' }}>Caricamento...</p>
                </div>
              ) : graficoDati.length < 2 ? (
                <div className="h-40 flex items-center justify-center text-center">
                  <div>
                    <p className="text-2xl mb-2"><FontAwesomeIcon icon={faChartBar} /></p>
                    <p className="text-sm" style={{ color: 'oklch(0.50 0 0)' }}>Servono almeno 2 sessioni per il grafico</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-5">
                  <div>
                    <p className="text-xs uppercase tracking-wider mb-2" style={{ color: 'oklch(0.45 0 0)' }}>Peso max (kg)</p>
                    <ResponsiveContainer width="100%" height={180}>
                      <LineChart data={graficoDati} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 5%)" />
                        <XAxis dataKey="data" tick={{ fill: 'oklch(0.50 0 0)', fontSize: 10 }} />
                        <YAxis tick={{ fill: 'oklch(0.50 0 0)', fontSize: 10 }} />
                        <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => [`${v} kg`, 'Peso max']} />
                        <Line type="monotone" dataKey="peso_max" stroke="oklch(0.70 0.19 46)"
                          strokeWidth={2.5} dot={{ fill: 'oklch(0.70 0.19 46)', r: 4 }} activeDot={{ r: 6 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wider mb-2" style={{ color: 'oklch(0.45 0 0)' }}>Volume totale (kg×reps)</p>
                    <ResponsiveContainer width="100%" height={180}>
                      <LineChart data={graficoDati} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 5%)" />
                        <XAxis dataKey="data" tick={{ fill: 'oklch(0.50 0 0)', fontSize: 10 }} />
                        <YAxis tick={{ fill: 'oklch(0.50 0 0)', fontSize: 10 }} />
                        <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => [`${v}`, 'Volume']} />
                        <Line type="monotone" dataKey="volume" stroke="oklch(0.60 0.15 200)"
                          strokeWidth={2.5} dot={{ fill: 'oklch(0.60 0.15 200)', r: 4 }} activeDot={{ r: 6 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Storico cliccabile */}
          <div className="rounded-2xl overflow-hidden"
            style={{ background: 'oklch(0.18 0 0)', border: '1px solid oklch(1 0 0 / 6%)' }}>
            <div className="px-5 py-4 flex items-center justify-between"
              style={{ borderBottom: '1px solid oklch(1 0 0 / 6%)' }}>
              <h2 className="font-bold" style={{ color: 'oklch(0.97 0 0)' }}>Storico allenamenti</h2>
              <span className="text-xs px-3 py-1 rounded-full"
                style={{ background: 'oklch(0.60 0.15 200 / 15%)', color: 'oklch(0.60 0.15 200)' }}>
                {sessioni.length}
              </span>
            </div>
            {sessioni.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-4xl mb-2"><FontAwesomeIcon icon={faPersonRunning} /></p>
                <p className="text-sm" style={{ color: 'oklch(0.45 0 0)' }}>Nessun allenamento ancora</p>
              </div>
            ) : (
              <div>
                {sessioni.map((s, i) => (
                  <div key={s.id}
                    className="flex items-center gap-3 px-5 py-3 cursor-pointer transition-colors hover:bg-white/2"
                    style={{ borderBottom: i < sessioni.length - 1 ? '1px solid oklch(1 0 0 / 4%)' : 'none' }}
                    onClick={() => router.push(`/cliente/allenamento?sessione=${s.id}`)}>
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center text-base flex-shrink-0"
                      style={{ background: s.completata ? 'oklch(0.65 0.18 150 / 15%)' : 'oklch(0.22 0 0)' }}>
                      {s.completata ? <FontAwesomeIcon icon={faCircleCheck} /> : <FontAwesomeIcon icon={faPause} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate" style={{ color: 'oklch(0.97 0 0)' }}>
                        {(s as any).scheda_giorni?.nome ?? 'Allenamento'}
                      </p>
                      <p className="text-xs" style={{ color: 'oklch(0.45 0 0)' }}>
                        {new Date(s.data).toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' })}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-xs px-2 py-1 rounded-full"
                        style={{
                          background: s.completata ? 'oklch(0.65 0.18 150 / 15%)' : 'oklch(0.22 0 0)',
                          color: s.completata ? 'oklch(0.65 0.18 150)' : 'oklch(0.45 0 0)',
                        }}>
                        {s.completata ? 'Fatto' : 'Parziale'}
                      </span>
                      <span className="text-xs" style={{ color: 'oklch(0.40 0 0)' }}>→</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB: MISURAZIONI */}
      {tab === 'misurazioni' && (
        <div className="space-y-5">
          <div className="rounded-2xl p-5 space-y-4"
            style={{ background: 'oklch(0.18 0 0)', border: '1px solid oklch(1 0 0 / 6%)' }}>
            <h2 className="font-bold" style={{ color: 'oklch(0.97 0 0)' }}>Registra peso corporeo</h2>
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="text-xs mb-1.5 block" style={{ color: 'oklch(0.60 0 0)' }}>Peso (kg)</label>
                <input type="number" inputMode="decimal" value={newPeso}
                  onChange={(e) => setNewPeso(e.target.value)} placeholder="es. 75.5"
                  className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                  style={{ background: 'oklch(0.22 0 0)', border: '1px solid oklch(1 0 0 / 8%)', color: 'oklch(0.97 0 0)' }}
                  onFocus={(e) => e.target.style.borderColor = 'oklch(0.60 0.15 200)'}
                  onBlur={(e) => e.target.style.borderColor = 'oklch(1 0 0 / 8%)'} />
              </div>
              <div className="flex-1">
                <label className="text-xs mb-1.5 block" style={{ color: 'oklch(0.60 0 0)' }}>Note (opzionale)</label>
                <input type="text" value={newMisNote}
                  onChange={(e) => setNewMisNote(e.target.value)} placeholder="es. mattino a digiuno"
                  className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                  style={{ background: 'oklch(0.22 0 0)', border: '1px solid oklch(1 0 0 / 8%)', color: 'oklch(0.97 0 0)' }}
                  onFocus={(e) => e.target.style.borderColor = 'oklch(0.60 0.15 200)'}
                  onBlur={(e) => e.target.style.borderColor = 'oklch(1 0 0 / 8%)'} />
              </div>
            </div>
            <button onClick={handleSaveMisurazione} disabled={savingMis || !newPeso.trim()}
              className="w-full py-3 rounded-xl text-sm font-semibold transition-all"
              style={{
                background: !newPeso.trim() ? 'oklch(0.22 0 0)' : 'oklch(0.60 0.15 200)',
                color: !newPeso.trim() ? 'oklch(0.40 0 0)' : 'oklch(0.13 0 0)',
                cursor: !newPeso.trim() ? 'not-allowed' : 'pointer',
              }}>
              {savingMis ? 'Salvataggio...' : '+ Registra peso'}
            </button>
          </div>

          {misurazioni.length >= 2 && (
            <div className="rounded-2xl p-5 space-y-4"
              style={{ background: 'oklch(0.18 0 0)', border: '1px solid oklch(1 0 0 / 6%)' }}>
              <h2 className="font-bold" style={{ color: 'oklch(0.97 0 0)' }}>Andamento peso</h2>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart
                  data={[...misurazioni].reverse().map(m => ({
                    data: new Date(m.data).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' }),
                    peso: m.peso_kg,
                  }))}
                  margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 5%)" />
                  <XAxis dataKey="data" tick={{ fill: 'oklch(0.50 0 0)', fontSize: 10 }} />
                  <YAxis tick={{ fill: 'oklch(0.50 0 0)', fontSize: 10 }} domain={['auto', 'auto']} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => [`${v} kg`, 'Peso']} />
                  <Line type="monotone" dataKey="peso" stroke="oklch(0.65 0.15 300)"
                    strokeWidth={2.5} dot={{ fill: 'oklch(0.65 0.15 300)', r: 4 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          <div className="rounded-2xl overflow-hidden"
            style={{ background: 'oklch(0.18 0 0)', border: '1px solid oklch(1 0 0 / 6%)' }}>
            <div className="px-5 py-4 flex items-center justify-between"
              style={{ borderBottom: '1px solid oklch(1 0 0 / 6%)' }}>
              <h2 className="font-bold" style={{ color: 'oklch(0.97 0 0)' }}>Storico misurazioni</h2>
              <span className="text-xs px-3 py-1 rounded-full"
                style={{ background: 'oklch(0.65 0.15 300 / 15%)', color: 'oklch(0.65 0.15 300)' }}>
                {misurazioni.length}
              </span>
            </div>
            {misurazioni.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-4xl mb-2"><FontAwesomeIcon icon={faScaleBalanced} /></p>
                <p className="text-sm" style={{ color: 'oklch(0.45 0 0)' }}>Nessuna misurazione ancora</p>
              </div>
            ) : (
              <div>
                {misurazioni.map((m, i) => (
                  <div key={m.id} className="flex items-center gap-4 px-5 py-3 group"
                    style={{ borderBottom: i < misurazioni.length - 1 ? '1px solid oklch(1 0 0 / 4%)' : 'none' }}>
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <span className="text-lg font-black" style={{ color: 'oklch(0.65 0.15 300)' }}>
                          {m.peso_kg} kg
                        </span>
                        {i < misurazioni.length - 1 && misurazioni[i + 1].peso_kg && m.peso_kg && (
                          <span className="text-xs font-medium px-2 py-0.5 rounded-full"
                            style={{
                              background: m.peso_kg < misurazioni[i + 1].peso_kg! ? 'oklch(0.65 0.18 150 / 15%)' : 'oklch(0.65 0.22 27 / 15%)',
                              color: m.peso_kg < misurazioni[i + 1].peso_kg! ? 'oklch(0.65 0.18 150)' : 'oklch(0.75 0.15 27)',
                            }}>
                            {m.peso_kg < misurazioni[i + 1].peso_kg!
                              ? `▼ ${(misurazioni[i + 1].peso_kg! - m.peso_kg).toFixed(1)} kg`
                              : `▲ +${(m.peso_kg - misurazioni[i + 1].peso_kg!).toFixed(1)} kg`}
                          </span>
                        )}
                      </div>
                      <p className="text-xs mt-0.5" style={{ color: 'oklch(0.45 0 0)' }}>
                        {new Date(m.data).toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'long' })}
                        {m.note && ` · ${m.note}`}
                      </p>
                    </div>
                    <button onClick={() => handleDeleteMisurazione(m.id)}
                      className="opacity-0 group-hover:opacity-100 px-2.5 py-1.5 rounded-lg text-xs transition-all"
                      style={{ background: 'oklch(0.65 0.22 27 / 15%)', color: 'oklch(0.75 0.15 27)' }}>
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB: FOTO */}
      {tab === 'foto' && (
        <div className="space-y-5">
          <div className="rounded-2xl p-5 space-y-3"
            style={{ background: 'oklch(0.18 0 0)', border: '1px solid oklch(1 0 0 / 6%)' }}>
            <h2 className="font-bold" style={{ color: 'oklch(0.97 0 0)' }}>Foto progressi</h2>
            <p className="text-sm" style={{ color: 'oklch(0.50 0 0)' }}>Visibili solo a te e al tuo coach</p>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleUploadFoto} />
            <button onClick={() => fileRef.current?.click()} disabled={uploadingFoto}
              className="w-full py-3 rounded-xl text-sm font-semibold border-2 border-dashed transition-all"
              style={{ background: 'oklch(0.22 0 0)', borderColor: 'oklch(1 0 0 / 15%)', color: 'oklch(0.60 0 0)' }}>
              {uploadingFoto ? <><FontAwesomeIcon icon={faUpload} /> Caricamento...</> : <><FontAwesomeIcon icon={faCamera} /> Carica foto</>}
            </button>
          </div>

          {foto.length === 0 ? (
            <div className="rounded-2xl py-16 text-center"
              style={{ background: 'oklch(0.18 0 0)', border: '1px solid oklch(1 0 0 / 6%)' }}>
              <p className="text-5xl mb-3"><FontAwesomeIcon icon={faCamera} /></p>
              <p className="font-semibold" style={{ color: 'oklch(0.97 0 0)' }}>Nessuna foto ancora</p>
              <p className="text-sm mt-1" style={{ color: 'oklch(0.45 0 0)' }}>Carica la tua prima foto per tracciare i progressi visivi</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {foto.map((f) => (
                <div key={f.id} className="relative group rounded-2xl overflow-hidden aspect-square cursor-pointer"
                  onClick={() => setFotoSelezionata(f.url)}>
                  <img src={f.url} alt="Foto progressi" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-between p-3">
                    <p className="text-xs text-white">
                      {new Date(f.created_at).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })}
                    </p>
                    <button onClick={(e) => { e.stopPropagation(); handleDeleteFoto(f.url) }}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-xs"
                      style={{ background: 'oklch(0.65 0.22 27 / 80%)' }}>✕</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {fotoSelezionata && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
              style={{ background: 'oklch(0 0 0 / 90%)' }}
              onClick={() => setFotoSelezionata(null)}>
              <img src={fotoSelezionata} alt="Foto ingrandita"
                className="max-w-full max-h-full rounded-2xl object-contain" />
              <button className="absolute top-4 right-4 w-10 h-10 rounded-full flex items-center justify-center"
                style={{ background: 'oklch(0.22 0 0)', color: 'oklch(0.97 0 0)' }}>✕</button>
            </div>
          )}
        </div>
      )}

      {/* TAB: CHECK-IN */}
      {tab === 'checkin' && (
        <div className="space-y-5">
          <div className="rounded-2xl p-5 space-y-5"
            style={{ background: 'oklch(0.18 0 0)', border: `1px solid ${checkinOggi ? 'oklch(0.65 0.18 150 / 30%)' : 'oklch(1 0 0 / 6%)'}` }}>
            <div className="flex items-center justify-between">
              <h2 className="font-bold" style={{ color: 'oklch(0.97 0 0)' }}>Check-in di oggi</h2>
              {checkinOggi && (
                <span className="text-xs px-3 py-1 rounded-full"
                  style={{ background: 'oklch(0.65 0.18 150 / 15%)', color: 'oklch(0.65 0.18 150)' }}>
                  <FontAwesomeIcon icon={faCircleCheck} /> Completato
                </span>
              )}
            </div>

            {checkinOggi ? (
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Energia', value: checkinOggi.energia },
                  { label: 'Sonno', value: checkinOggi.sonno },
                  { label: 'Stress', value: checkinOggi.stress },
                  { label: 'Motivazione', value: checkinOggi.motivazione },
                ].map(item => (
                  <div key={item.label} className="rounded-xl p-3 text-center" style={{ background: 'oklch(0.22 0 0)' }}>
                    <p className="text-xs mb-1" style={{ color: 'oklch(0.55 0 0)' }}>{item.label}</p>
                    <p className="text-2xl">{EMOJI_VOTO[item.value] && <FontAwesomeIcon icon={EMOJI_VOTO[item.value]!} />}</p>
                    <p className="text-xs font-bold mt-1" style={{ color: 'oklch(0.97 0 0)' }}>{item.value}/5</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {[
                  { label: 'Come ti senti di energia?', key: 'energia' as const },
                  { label: 'Hai dormito bene?', key: 'sonno' as const },
                  { label: 'Livello di stress', key: 'stress' as const },
                  { label: 'Motivazione ad allenarti', key: 'motivazione' as const },
                ].map(item => (
                  <div key={item.key} className="space-y-2">
                    <label className="text-sm font-medium" style={{ color: 'oklch(0.80 0 0)' }}>{item.label}</label>
                    <div className="flex gap-2">
                      {[1, 2, 3, 4, 5].map(v => (
                        <button key={v} onClick={() => setNewCheckin(p => ({ ...p, [item.key]: v }))}
                          className="flex-1 py-2.5 rounded-xl text-xl transition-all active:scale-95"
                          style={{
                            background: newCheckin[item.key] === v ? 'oklch(0.60 0.15 200 / 20%)' : 'oklch(0.22 0 0)',
                            border: newCheckin[item.key] === v ? '2px solid oklch(0.60 0.15 200)' : '2px solid transparent',
                          }}>
                          {EMOJI_VOTO[v] ? <FontAwesomeIcon icon={EMOJI_VOTO[v]!} /> : null}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium" style={{ color: 'oklch(0.80 0 0)' }}>Note (opzionale)</label>
                  <textarea value={newCheckin.note}
                    onChange={(e) => setNewCheckin(p => ({ ...p, note: e.target.value }))}
                    placeholder="Come stai? Qualcosa da segnalare al coach?"
                    rows={2} className="w-full px-4 py-3 rounded-xl text-sm outline-none resize-none"
                    style={{ background: 'oklch(0.22 0 0)', border: '1px solid oklch(1 0 0 / 8%)', color: 'oklch(0.97 0 0)' }}
                    onFocus={(e) => e.target.style.borderColor = 'oklch(0.60 0.15 200)'}
                    onBlur={(e) => e.target.style.borderColor = 'oklch(1 0 0 / 8%)'} />
                </div>
                <button onClick={handleSaveCheckin}
                  disabled={savingCheckin || !newCheckin.energia || !newCheckin.sonno || !newCheckin.stress || !newCheckin.motivazione}
                  className="w-full py-3 rounded-xl text-sm font-semibold transition-all"
                  style={{
                    background: (!newCheckin.energia || !newCheckin.sonno || !newCheckin.stress || !newCheckin.motivazione)
                      ? 'oklch(0.22 0 0)' : 'oklch(0.60 0.15 200)',
                    color: (!newCheckin.energia || !newCheckin.sonno || !newCheckin.stress || !newCheckin.motivazione)
                      ? 'oklch(0.40 0 0)' : 'oklch(0.13 0 0)',
                  }}>
                  {savingCheckin ? 'Salvataggio...' : 'Invia check-in'}
                </button>
              </div>
            )}
          </div>

          {checkins.length > 0 && (
            <div className="rounded-2xl overflow-hidden"
              style={{ background: 'oklch(0.18 0 0)', border: '1px solid oklch(1 0 0 / 6%)' }}>
              <div className="px-5 py-4" style={{ borderBottom: '1px solid oklch(1 0 0 / 6%)' }}>
                <h2 className="font-bold" style={{ color: 'oklch(0.97 0 0)' }}>Storico check-in</h2>
              </div>
              <div>
                {checkins.slice(0, 10).map((c, i) => (
                  <div key={c.id} className="px-5 py-4"
                    style={{ borderBottom: i < Math.min(checkins.length, 10) - 1 ? '1px solid oklch(1 0 0 / 4%)' : 'none' }}>
                    <p className="text-sm font-semibold mb-2" style={{ color: 'oklch(0.97 0 0)' }}>
                      {new Date(c.data).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })}
                    </p>
                    <div className="flex gap-4">
                      {[
                        { label: 'Energia', value: c.energia },
                        { label: 'Sonno', value: c.sonno },
                        { label: 'Stress', value: c.stress },
                        { label: 'Motivazione', value: c.motivazione },
                      ].map(item => (
                        <div key={item.label} className="text-center">
                          <p className="text-xl">{EMOJI_VOTO[item.value] && <FontAwesomeIcon icon={EMOJI_VOTO[item.value]!} />}</p>
                          <p className="text-xs mt-0.5" style={{ color: 'oklch(0.45 0 0)' }}>{item.label.slice(0, 3)}</p>
                        </div>
                      ))}
                    </div>
                    {c.note && <p className="text-xs mt-2 italic" style={{ color: 'oklch(0.50 0 0)' }}>"{c.note}"</p>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
