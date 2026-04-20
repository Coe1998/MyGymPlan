'use client'

import { useEffect, useState, useMemo } from 'react'
import BynariLoader from '@/components/shared/BynariLoader'
import { createClient } from '@/lib/supabase/client'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faCircleCheck, faCircleDot, faCircle, faChevronDown, faChevronUp,
  faPlus, faXmark, faGripVertical, faCalendarDays, faUsers,
  faClipboardList, faPen, faTrash, faChevronRight, faImage,
  faWeightScale, faAlignLeft, faSliders, faRotate,
} from '@fortawesome/free-solid-svg-icons'

// ─── Types ───────────────────────────────────────────────────────────────────

interface Domanda {
  id: string
  testo: string
  tipo: 'scala' | 'numero' | 'testo' | 'foto'
  ordine: number
}

interface QuestionSet {
  id: string
  titolo: string
  descrizione: string | null
  created_at: string
  progress_check_domande: Domanda[]
}

interface Schedulazione {
  id: string
  cliente_id: string
  set_id: string | null
  data: string
  ricorsivo: boolean
  tipo_ricorrenza: string | null
  ricorrenza_giorno: number | null
  intervallo_settimane: number | null
  richiedi_foto: boolean
  profiles: { full_name: string | null; telefono: string | null } | null
  progress_check_set: { titolo: string } | null
  progress_check_risposte: { id: string; inviato_at: string; visto_coach: boolean }[]
}

interface Cliente {
  id: string
  full_name: string | null
}

type Tab = 'panoramica' | 'set' | 'pianifica'
type TipoQ = 'scala' | 'numero' | 'testo' | 'foto'

const TIPO_LABELS: Record<TipoQ, string> = {
  scala: 'Scala 1–5',
  numero: 'Numero',
  testo: 'Testo libero',
  foto: 'Foto',
}

const TIPO_ICONS: Record<TipoQ, any> = {
  scala: faSliders,
  numero: faWeightScale,
  testo: faAlignLeft,
  foto: faImage,
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CoachCheckinPage() {
  const supabase = useMemo(() => createClient(), [])
  const [tab, setTab] = useState<Tab>('panoramica')
  const [loading, setLoading] = useState(true)
  const [sets, setSets] = useState<QuestionSet[]>([])
  const [schedulazioni, setSchedulazioni] = useState<Schedulazione[]>([])
  const [clienti, setClienti] = useState<Cliente[]>([])
  const [userId, setUserId] = useState<string | null>(null)

  // Accordion state
  const [oggiOpen, setOggiOpen] = useState(true)
  const [domaniOpen, setDomaniOpen] = useState(false)
  const [futuroOpen, setFuturoOpen] = useState(false)

  // Drawer
  const [drawerCliente, setDrawerCliente] = useState<Schedulazione | null>(null)

  // Set editor
  const [editingSet, setEditingSet] = useState<QuestionSet | null>(null)
  const [showSetForm, setShowSetForm] = useState(false)
  const [setTitolo, setSetTitolo] = useState('')
  const [setDesc, setSetDesc] = useState('')
  const [domande, setDomande] = useState<Omit<Domanda, 'id'>[]>([])
  const [savingSet, setSavingSet] = useState(false)

  // Pianifica form
  const [pianClienteId, setPianClienteId] = useState('')
  const [pianSetId, setPianSetId] = useState('')
  const [pianData, setPianData] = useState('')
  const [pianRicorsivo, setPianRicorsivo] = useState(false)
  const [pianTipoRic, setPianTipoRic] = useState<'mensile' | 'settimanale'>('mensile')
  const [pianFoto, setPianFoto] = useState(false)
  const [savingPian, setSavingPian] = useState(false)

  useEffect(() => { fetchAll() }, [])

  const fetchAll = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setUserId(user.id)

    const [setsRes, schedRes, clientiRes] = await Promise.all([
      supabase.from('progress_check_set')
        .select('*, progress_check_domande(id, testo, tipo, ordine)')
        .eq('coach_id', user.id)
        .order('created_at', { ascending: false }),
      supabase.from('progress_check_schedulazioni')
        .select(`*, profiles!progress_check_schedulazioni_cliente_id_fkey(full_name), progress_check_set(titolo), progress_check_risposte(id, inviato_at, visto_coach)`)
        .eq('coach_id', user.id)
        .gte('data', new Date().toISOString().split('T')[0])
        .order('data', { ascending: true })
        .limit(200),
      supabase.from('coach_clienti')
        .select('cliente_id, profiles!coach_clienti_cliente_id_fkey(id, full_name)')
        .eq('coach_id', user.id),
    ])

    setSets((setsRes.data as any) ?? [])
    setSchedulazioni((schedRes.data as any) ?? [])
    setClienti((clientiRes.data as any)?.map((r: any) => r.profiles) ?? [])
    setLoading(false)
  }

  // ─── Date helpers ──────────────────────────────────────────────────────────

  const oggi = new Date(); oggi.setHours(0, 0, 0, 0)
  const domani = new Date(oggi); domani.setDate(domani.getDate() + 1)
  const dopodomani = new Date(oggi); dopodomani.setDate(dopodomani.getDate() + 2)
  const tra90 = new Date(oggi); tra90.setDate(tra90.getDate() + 90)

  const schedOggi = schedulazioni.filter(s => new Date(s.data).toDateString() === oggi.toDateString())
  const schedDomani = schedulazioni.filter(s => new Date(s.data).toDateString() === domani.toDateString())
  const schedFuturo = schedulazioni.filter(s => {
    const d = new Date(s.data); return d >= dopodomani && d <= tra90
  })

  const completatiOggi = schedOggi.filter(s => s.progress_check_risposte?.length > 0).length
  const completatiDomani = schedDomani.filter(s => s.progress_check_risposte?.length > 0).length

  // ─── Set editor handlers ───────────────────────────────────────────────────

  const openNewSet = () => {
    setEditingSet(null)
    setSetTitolo('')
    setSetDesc('')
    setDomande([{ testo: '', tipo: 'scala', ordine: 0 }])
    setShowSetForm(true)
  }

  const openEditSet = (s: QuestionSet) => {
    setEditingSet(s)
    setSetTitolo(s.titolo)
    setSetDesc(s.descrizione ?? '')
    setDomande(s.progress_check_domande.sort((a, b) => a.ordine - b.ordine).map(d => ({ testo: d.testo, tipo: d.tipo, ordine: d.ordine })))
    setShowSetForm(true)
  }

  const addDomanda = () => setDomande(prev => [...prev, { testo: '', tipo: 'scala', ordine: prev.length }])
  const removeDomanda = (i: number) => setDomande(prev => prev.filter((_, idx) => idx !== i))
  const updateDomanda = (i: number, field: string, val: string) =>
    setDomande(prev => prev.map((d, idx) => idx === i ? { ...d, [field]: val } : d))

  const saveSet = async () => {
    if (!setTitolo.trim() || !userId) return
    setSavingSet(true)
    if (editingSet) {
      await supabase.from('progress_check_set').update({ titolo: setTitolo, descrizione: setDesc || null }).eq('id', editingSet.id)
      await supabase.from('progress_check_domande').delete().eq('set_id', editingSet.id)
      if (domande.length > 0) {
        await supabase.from('progress_check_domande').insert(
          domande.map((d, i) => ({ set_id: editingSet.id, testo: d.testo, tipo: d.tipo, ordine: i }))
        )
      }
    } else {
      const { data: newSet } = await supabase.from('progress_check_set')
        .insert({ coach_id: userId, titolo: setTitolo, descrizione: setDesc || null })
        .select().single()
      if (newSet && domande.length > 0) {
        await supabase.from('progress_check_domande').insert(
          domande.map((d, i) => ({ set_id: newSet.id, testo: d.testo, tipo: d.tipo, ordine: i }))
        )
      }
    }
    setSavingSet(false)
    setShowSetForm(false)
    fetchAll()
  }

  const deleteSet = async (id: string, titolo: string) => {
    if (!confirm(`Eliminare il set "${titolo}"?`)) return
    await supabase.from('progress_check_set').delete().eq('id', id)
    fetchAll()
  }

  // ─── Pianifica handler ─────────────────────────────────────────────────────

  const savePianifica = async () => {
    if (!pianClienteId || !pianData || !userId) return
    setSavingPian(true)
    const dataObj = new Date(pianData)
    await supabase.from('progress_check_schedulazioni').insert({
      coach_id: userId,
      cliente_id: pianClienteId,
      set_id: pianSetId || null,
      data: pianData,
      ricorsivo: pianRicorsivo,
      tipo_ricorrenza: pianRicorsivo ? pianTipoRic : null,
      ricorrenza_giorno: pianRicorsivo && pianTipoRic === 'mensile' ? dataObj.getDate() : null,
      intervallo_settimane: pianRicorsivo && pianTipoRic === 'settimanale' ? 1 : null,
      richiedi_foto: pianFoto,
    })
    setSavingPian(false)
    setPianClienteId(''); setPianSetId(''); setPianData('')
    setPianRicorsivo(false); setPianFoto(false)
    fetchAll()
    setTab('panoramica')
  }

  const deleteSchedulazione = async (id: string) => {
    if (!confirm('Eliminare questo check-in?')) return
    await supabase.from('progress_check_schedulazioni').delete().eq('id', id)
    fetchAll()
  }

  // ─── Render helpers ────────────────────────────────────────────────────────

  const formatData = (dateStr: string) => {
    const d = new Date(dateStr)
    return d.toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' })
  }

  const renderCheckinRow = (s: Schedulazione, showDate = false) => {
    const completato = s.progress_check_risposte?.length > 0
    const nonVisto = completato && s.progress_check_risposte.some(r => !r.visto_coach)
    return (
      <div key={s.id}
        className="flex items-center gap-3 px-5 py-3 transition-all cursor-pointer hover:bg-white/3"
        style={{ borderBottom: '1px solid var(--c-w4)' }}
        onClick={() => setDrawerCliente(s)}>
        <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
          style={{ background: completato ? 'oklch(0.65 0.18 150 / 20%)' : 'oklch(0.70 0.19 46 / 15%)', color: completato ? 'oklch(0.65 0.18 150)' : 'oklch(0.70 0.19 46)' }}>
          {s.profiles?.full_name?.charAt(0).toUpperCase() ?? '?'}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold truncate" style={{ color: 'var(--c-90)' }}>
              {s.profiles?.full_name ?? 'Cliente'}
            </p>
            {nonVisto && (
              <span className="text-xs px-1.5 py-0.5 rounded-full font-bold"
                style={{ background: 'oklch(0.60 0.15 200 / 20%)', color: 'oklch(0.60 0.15 200)' }}>
                nuovo
              </span>
            )}
            {s.ricorsivo && (
              <FontAwesomeIcon icon={faRotate} className="text-xs" style={{ color: 'var(--c-45)' }} />
            )}
          </div>
          <p className="text-xs mt-0.5" style={{ color: 'var(--c-45)' }}>
            {s.progress_check_set?.titolo ?? 'Nessun set'}
            {showDate && ` · ${formatData(s.data)}`}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {completato
            ? <span className="text-xs px-2 py-1 rounded-lg font-semibold" style={{ background: 'oklch(0.65 0.18 150 / 15%)', color: 'oklch(0.65 0.18 150)' }}>Inviato ✓</span>
            : <span className="text-xs px-2 py-1 rounded-lg font-semibold" style={{ background: 'oklch(0.65 0.22 27 / 12%)', color: 'oklch(0.70 0.15 27)' }}>In attesa</span>
          }
          <button onClick={e => { e.stopPropagation(); deleteSchedulazione(s.id) }}
            className="w-7 h-7 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"
            style={{ background: 'oklch(0.65 0.22 27 / 10%)', color: 'oklch(0.70 0.15 27)' }}>
            <FontAwesomeIcon icon={faTrash} className="text-xs" />
          </button>
          <FontAwesomeIcon icon={faChevronRight} className="text-xs" style={{ color: 'var(--c-35)' }} />
        </div>
      </div>
    )
  }

  const AccordionHeader = ({ label, count, completati, open, onToggle, color = 'oklch(0.70 0.19 46)' }: any) => (
    <button onClick={onToggle}
      className="w-full flex items-center justify-between px-5 py-4 transition-all hover:bg-white/2"
      style={{ borderBottom: open && count > 0 ? '1px solid var(--c-w6)' : 'none' }}>
      <div className="flex items-center gap-3">
        <span className="text-sm font-bold" style={{ color: 'var(--c-97)' }}>{label}</span>
        <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
          style={{ background: `${color}20`, color }}>
          {completati}/{count}
        </span>
      </div>
      <FontAwesomeIcon icon={open ? faChevronUp : faChevronDown} className="text-xs" style={{ color: 'var(--c-45)' }} />
    </button>
  )

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-5xl" style={{ paddingBottom: 100 }}>

      {/* ── Header mobile ── */}
      <div className="lg:hidden" style={{ padding: '16px 20px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <p style={{ fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--c-50)', fontWeight: 700 }}>PROGRESSI</p>
            <h1 style={{ fontFamily: 'var(--font-syne)', fontWeight: 700, fontSize: 26, letterSpacing: '-0.02em', color: 'var(--c-97)', lineHeight: 1.1 }}>
              Check-in
            </h1>
          </div>
          <button onClick={() => setTab('pianifica')} aria-label="Nuovo check-in"
            style={{
              width: 40, height: 40, borderRadius: 12, flexShrink: 0,
              background: 'oklch(0.70 0.19 46)', color: 'var(--c-13)', fontSize: 16,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
            +
          </button>
        </div>
      </div>

      {/* ── Header desktop ── */}
      <div className="hidden lg:flex items-center justify-between gap-3" style={{ marginBottom: 24 }}>
        <div>
          <p style={{ fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--c-50)', fontWeight: 700, marginBottom: 4 }}>PROGRESSI</p>
          <h1 style={{ fontFamily: 'var(--font-syne)', fontWeight: 700, fontSize: 32, letterSpacing: '-0.02em', color: 'var(--c-97)' }}>
            Check-in
          </h1>
        </div>
        <button onClick={() => setTab('pianifica')}
          style={{
            height: 44, padding: '0 20px', borderRadius: 12, fontSize: 13.5, fontWeight: 600,
            background: 'oklch(0.70 0.19 46)', color: 'var(--c-13)', flexShrink: 0,
          }}>
          + Nuovo check-in
        </button>
      </div>

      <div style={{ padding: '0 20px' }} className="lg:p-0 space-y-4 lg:space-y-6">

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl"
        style={{ background: 'var(--c-18)', border: '1px solid var(--c-w6)' }}>
        {([['panoramica', 'Panoramica'], ['set', 'Set domande'], ['pianifica', 'Pianifica']] as [Tab, string][]).map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)}
            className="flex-1 py-2 rounded-lg text-sm font-semibold transition-all"
            style={{
              background: tab === key ? 'oklch(0.70 0.19 46)' : 'transparent',
              color: tab === key ? 'var(--c-13)' : 'var(--c-50)',
            }}>
            {label}
          </button>
        ))}
      </div>

      {loading ? <BynariLoader file="blue" size={80} /> : (

        <>
          {/* ── TAB PANORAMICA ── */}
          {tab === 'panoramica' && (
            <div className="space-y-4">

              {schedulazioni.length === 0 ? (
                <div className="rounded-2xl py-16 text-center space-y-3"
                  style={{ background: 'var(--c-18)', border: '1px solid var(--c-w6)' }}>
                  <div className="text-4xl"><FontAwesomeIcon icon={faCircleCheck} style={{ color: 'var(--c-35)' }} /></div>
                  <p className="font-semibold" style={{ color: 'var(--c-97)' }}>Nessun check-in programmato</p>
                  <button onClick={() => setTab('pianifica')}
                    className="inline-flex items-center gap-2 mt-2 px-5 py-2.5 rounded-xl text-sm font-semibold"
                    style={{ background: 'oklch(0.70 0.19 46)', color: 'var(--c-13)' }}>
                    + Pianifica il primo
                  </button>
                </div>
              ) : (
                <>
                  {/* OGGI */}
                  <div className="rounded-2xl overflow-hidden"
                    style={{ background: 'var(--c-18)', border: '1px solid oklch(0.70 0.19 46 / 25%)' }}>
                    <AccordionHeader
                      label="Oggi"
                      count={schedOggi.length}
                      completati={completatiOggi}
                      open={oggiOpen}
                      onToggle={() => setOggiOpen(p => !p)}
                    />
                    {oggiOpen && schedOggi.length === 0 && (
                      <div className="px-5 py-4">
                        <p className="text-sm" style={{ color: 'var(--c-45)' }}>Nessun check-in per oggi</p>
                      </div>
                    )}
                    {oggiOpen && schedOggi.map(s => (
                      <div key={s.id} className="group">{renderCheckinRow(s)}</div>
                    ))}
                  </div>

                  {/* DOMANI */}
                  <div className="rounded-2xl overflow-hidden"
                    style={{ background: 'var(--c-18)', border: '1px solid var(--c-w6)' }}>
                    <AccordionHeader
                      label="Domani"
                      count={schedDomani.length}
                      completati={completatiDomani}
                      open={domaniOpen}
                      onToggle={() => setDomaniOpen(p => !p)}
                      color="oklch(0.60 0.15 200)"
                    />
                    {domaniOpen && schedDomani.length === 0 && (
                      <div className="px-5 py-4">
                        <p className="text-sm" style={{ color: 'var(--c-45)' }}>Nessun check-in per domani</p>
                      </div>
                    )}
                    {domaniOpen && schedDomani.map(s => (
                      <div key={s.id} className="group">{renderCheckinRow(s)}</div>
                    ))}
                  </div>

                  {/* PROSSIMI 90GG */}
                  <div className="rounded-2xl overflow-hidden"
                    style={{ background: 'var(--c-18)', border: '1px solid var(--c-w6)' }}>
                    <AccordionHeader
                      label="Prossimi 90 giorni"
                      count={schedFuturo.length}
                      completati={0}
                      open={futuroOpen}
                      onToggle={() => setFuturoOpen(p => !p)}
                      color="var(--c-55)"
                    />
                    {futuroOpen && schedFuturo.length === 0 && (
                      <div className="px-5 py-4">
                        <p className="text-sm" style={{ color: 'var(--c-45)' }}>Nessun check-in nei prossimi 90 giorni</p>
                      </div>
                    )}
                    {futuroOpen && schedFuturo.map(s => (
                      <div key={s.id} className="group">{renderCheckinRow(s, true)}</div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* ── TAB SET DOMANDE ── */}
          {tab === 'set' && (
            <div className="space-y-4">
              <div className="rounded-2xl overflow-hidden"
                style={{ background: 'var(--c-18)', border: '1px solid var(--c-w6)' }}>
                <div className="px-5 py-4 flex items-center justify-between"
                  style={{ borderBottom: '1px solid var(--c-w6)' }}>
                  <h2 className="font-bold" style={{ color: 'var(--c-97)' }}>I tuoi set</h2>
                  <button onClick={openNewSet}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold"
                    style={{ background: 'oklch(0.70 0.19 46 / 15%)', color: 'oklch(0.70 0.19 46)' }}>
                    <FontAwesomeIcon icon={faPlus} /> Nuovo set
                  </button>
                </div>

                {sets.length === 0 ? (
                  <div className="py-12 text-center space-y-3">
                    <div className="text-4xl"><FontAwesomeIcon icon={faClipboardList} style={{ color: 'var(--c-35)' }} /></div>
                    <p className="font-semibold" style={{ color: 'var(--c-97)' }}>Nessun set ancora</p>
                    <p className="text-sm" style={{ color: 'var(--c-45)' }}>Crea un set di domande da assegnare ai clienti</p>
                    <button onClick={openNewSet}
                      className="inline-flex items-center gap-2 mt-2 px-5 py-2.5 rounded-xl text-sm font-semibold"
                      style={{ background: 'oklch(0.70 0.19 46)', color: 'var(--c-13)' }}>
                      + Crea set
                    </button>
                  </div>
                ) : (
                  sets.map((s, i) => (
                    <div key={s.id} className="flex items-center gap-3 px-5 py-4 group"
                      style={{ borderBottom: i < sets.length - 1 ? '1px solid var(--c-w4)' : 'none' }}>
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ background: 'oklch(0.70 0.19 46 / 12%)', color: 'oklch(0.70 0.19 46)' }}>
                        <FontAwesomeIcon icon={faClipboardList} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm" style={{ color: 'var(--c-97)' }}>{s.titolo}</p>
                        <p className="text-xs mt-0.5" style={{ color: 'var(--c-45)' }}>
                          {s.progress_check_domande.length} domande
                          {s.descrizione && ` · ${s.descrizione}`}
                        </p>
                      </div>
                      <div className="flex gap-1.5" onClick={e => e.stopPropagation()}>
                        <button onClick={() => openEditSet(s)}
                          className="w-8 h-8 rounded-lg flex items-center justify-center"
                          style={{ background: 'oklch(0.60 0.15 200 / 12%)', color: 'oklch(0.60 0.15 200)' }}>
                          <FontAwesomeIcon icon={faPen} className="text-xs" />
                        </button>
                        <button onClick={() => deleteSet(s.id, s.titolo)}
                          className="w-8 h-8 rounded-lg flex items-center justify-center"
                          style={{ background: 'oklch(0.65 0.22 27 / 12%)', color: 'oklch(0.70 0.15 27)' }}>
                          <FontAwesomeIcon icon={faTrash} className="text-xs" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* ── TAB PIANIFICA ── */}
          {tab === 'pianifica' && (
            <div className="rounded-2xl overflow-hidden"
              style={{ background: 'var(--c-18)', border: '1px solid var(--c-w6)' }}>
              <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--c-w6)' }}>
                <h2 className="font-bold" style={{ color: 'var(--c-97)' }}>Pianifica check-in</h2>
                <p className="text-xs mt-0.5" style={{ color: 'var(--c-45)' }}>
                  Assegna un check-in a un cliente con data e set di domande
                </p>
              </div>
              <div className="p-5 space-y-4">

                {/* Cliente */}
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide mb-1.5 block" style={{ color: 'var(--c-55)' }}>
                    Cliente *
                  </label>
                  <select value={pianClienteId} onChange={e => setPianClienteId(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl text-sm"
                    style={{ background: 'var(--c-22)', border: '1px solid var(--c-w10)', color: 'var(--c-85)' }}>
                    <option value="">Seleziona cliente...</option>
                    {clienti.map(c => <option key={c.id} value={c.id}>{c.full_name}</option>)}
                  </select>
                </div>

                {/* Set domande */}
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide mb-1.5 block" style={{ color: 'var(--c-55)' }}>
                    Set di domande
                  </label>
                  <select value={pianSetId} onChange={e => setPianSetId(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl text-sm"
                    style={{ background: 'var(--c-22)', border: '1px solid var(--c-w10)', color: 'var(--c-85)' }}>
                    <option value="">Nessun set (solo foto)</option>
                    {sets.map(s => <option key={s.id} value={s.id}>{s.titolo} ({s.progress_check_domande.length} domande)</option>)}
                  </select>
                </div>

                {/* Data */}
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide mb-1.5 block" style={{ color: 'var(--c-55)' }}>
                    Data *
                  </label>
                  <input type="date" value={pianData} onChange={e => setPianData(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-3 py-2.5 rounded-xl text-sm"
                    style={{ background: 'var(--c-22)', border: '1px solid var(--c-w10)', color: 'var(--c-85)' }} />
                </div>

                {/* Toggles */}
                <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--c-w8)' }}>

                  {/* Ricorsivo */}
                  <div className="flex items-center justify-between px-4 py-3"
                    style={{ borderBottom: '1px solid var(--c-w6)' }}>
                    <div>
                      <p className="text-sm font-semibold" style={{ color: 'var(--c-90)' }}>Ricorsivo</p>
                      <p className="text-xs" style={{ color: 'var(--c-45)' }}>Si ripete automaticamente</p>
                    </div>
                    <button onClick={() => setPianRicorsivo(p => !p)}
                      className="w-12 h-6 rounded-full transition-all relative"
                      style={{ background: pianRicorsivo ? 'oklch(0.70 0.19 46)' : 'var(--c-30)' }}>
                      <span className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all"
                        style={{ left: pianRicorsivo ? '26px' : '2px' }} />
                    </button>
                  </div>

                  {/* Tipo ricorrenza */}
                  {pianRicorsivo && (
                    <div className="flex items-center justify-between px-4 py-3"
                      style={{ borderBottom: '1px solid var(--c-w6)' }}>
                      <p className="text-sm font-semibold" style={{ color: 'var(--c-90)' }}>Frequenza</p>
                      <div className="flex gap-2">
                        {(['mensile', 'settimanale'] as const).map(t => (
                          <button key={t} onClick={() => setPianTipoRic(t)}
                            className="px-3 py-1 rounded-lg text-xs font-semibold transition-all"
                            style={{
                              background: pianTipoRic === t ? 'oklch(0.70 0.19 46)' : 'var(--c-25)',
                              color: pianTipoRic === t ? 'var(--c-13)' : 'var(--c-55)',
                            }}>
                            {t.charAt(0).toUpperCase() + t.slice(1)}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Richiedi foto */}
                  <div className="flex items-center justify-between px-4 py-3">
                    <div>
                      <p className="text-sm font-semibold" style={{ color: 'var(--c-90)' }}>Richiedi foto progress</p>
                      <p className="text-xs" style={{ color: 'var(--c-45)' }}>Il cliente vedrà la sezione foto</p>
                    </div>
                    <button onClick={() => setPianFoto(p => !p)}
                      className="w-12 h-6 rounded-full transition-all relative"
                      style={{ background: pianFoto ? 'oklch(0.70 0.19 46)' : 'var(--c-30)' }}>
                      <span className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all"
                        style={{ left: pianFoto ? '26px' : '2px' }} />
                    </button>
                  </div>
                </div>

                {pianRicorsivo && pianData && (
                  <div className="px-4 py-3 rounded-xl text-xs"
                    style={{ background: 'oklch(0.70 0.19 46 / 8%)', border: '1px solid oklch(0.70 0.19 46 / 20%)', color: 'oklch(0.70 0.19 46)' }}>
                    <FontAwesomeIcon icon={faRotate} className="mr-2" />
                    {pianTipoRic === 'mensile'
                      ? `Si ripete ogni mese il giorno ${new Date(pianData).getDate()}`
                      : `Si ripete ogni settimana`
                    }
                  </div>
                )}

                <button onClick={savePianifica} disabled={savingPian || !pianClienteId || !pianData}
                  className="w-full py-3 rounded-xl text-sm font-bold transition-all active:scale-95"
                  style={{
                    background: (!pianClienteId || !pianData) ? 'var(--c-25)' : 'oklch(0.70 0.19 46)',
                    color: (!pianClienteId || !pianData) ? 'var(--c-45)' : 'var(--c-13)',
                  }}>
                  {savingPian ? 'Salvataggio...' : '✓ Pianifica check-in'}
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── DRAWER CLIENTE ── */}
      {drawerCliente && (
        <div className="fixed inset-0 z-50 flex justify-end"
          style={{ background: 'oklch(0 0 0 / 65%)' }}
          onClick={() => setDrawerCliente(null)}>
          <div className="w-full max-w-md h-full overflow-y-auto flex flex-col"
            style={{ background: 'var(--c-13)', borderLeft: '1px solid var(--c-w8)' }}
            onClick={e => e.stopPropagation()}>

            {/* Header drawer */}
            <div className="sticky top-0 z-10 flex items-center gap-3 px-5 py-4"
              style={{ background: 'var(--c-13)', borderBottom: '1px solid var(--c-w8)', paddingTop: 'calc(env(safe-area-inset-top) + 1rem)' }}>
              <button onClick={() => setDrawerCliente(null)}
                className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: 'var(--c-22)', color: 'var(--c-60)' }}>
                <FontAwesomeIcon icon={faXmark} />
              </button>
              <div className="flex-1 min-w-0">
                <p className="font-black text-base truncate" style={{ color: 'var(--c-97)' }}>
                  {drawerCliente.profiles?.full_name ?? 'Cliente'}
                </p>
                <p className="text-xs" style={{ color: 'var(--c-45)' }}>
                  {formatData(drawerCliente.data)} · {drawerCliente.progress_check_set?.titolo ?? 'Nessun set'}
                </p>
              </div>
            </div>

            <div className="p-5 space-y-5 flex-1">

              {/* Stato */}
              <div className="rounded-2xl p-4"
                style={{ background: drawerCliente.progress_check_risposte?.length > 0 ? 'oklch(0.65 0.18 150 / 8%)' : 'oklch(0.65 0.22 27 / 8%)', border: `1px solid ${drawerCliente.progress_check_risposte?.length > 0 ? 'oklch(0.65 0.18 150 / 25%)' : 'oklch(0.65 0.22 27 / 25%)'}` }}>
                <p className="text-sm font-bold" style={{ color: drawerCliente.progress_check_risposte?.length > 0 ? 'oklch(0.65 0.18 150)' : 'oklch(0.70 0.15 27)' }}>
                  {drawerCliente.progress_check_risposte?.length > 0
                    ? `✓ Check-in inviato il ${new Date(drawerCliente.progress_check_risposte[0].inviato_at).toLocaleDateString('it-IT')}`
                    : '⏳ In attesa di risposta'
                  }
                </p>
                {drawerCliente.ricorsivo && (
                  <p className="text-xs mt-1" style={{ color: 'var(--c-50)' }}>
                    <FontAwesomeIcon icon={faRotate} className="mr-1" />
                    Ricorsivo {drawerCliente.tipo_ricorrenza}
                  </p>
                )}
              </div>

              {/* Risposte */}
              {drawerCliente.progress_check_risposte?.length > 0 && drawerCliente.progress_check_set && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--c-45)' }}>
                    Risposte
                  </p>
                  <div className="space-y-3">
                    {sets.find(s => s.id === drawerCliente.set_id)?.progress_check_domande
                      .sort((a, b) => a.ordine - b.ordine)
                      .map(d => {
                        const risposta = (drawerCliente.progress_check_risposte[0] as any)?.risposte?.[d.id]
                        return (
                          <div key={d.id} className="rounded-xl p-3"
                            style={{ background: 'var(--c-18)', border: '1px solid var(--c-w6)' }}>
                            <p className="text-xs mb-1.5" style={{ color: 'var(--c-50)' }}>{d.testo}</p>
                            {risposta !== undefined ? (
                              <p className="text-sm font-bold" style={{ color: 'var(--c-90)' }}>
                                {d.tipo === 'scala' ? `${risposta}/5` : risposta}
                              </p>
                            ) : (
                              <p className="text-sm" style={{ color: 'var(--c-35)' }}>—</p>
                            )}
                          </div>
                        )
                      })
                    }
                  </div>
                </div>
              )}

              {/* Timeline storico */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--c-45)' }}>
                  Storico
                </p>
                <TimelineStorico clienteId={drawerCliente.cliente_id} supabase={supabase} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL SET EDITOR ── */}
      {showSetForm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
          style={{ background: 'oklch(0 0 0 / 70%)' }}
          onClick={() => setShowSetForm(false)}>
          <div className="w-full max-w-lg rounded-3xl overflow-hidden max-h-[85vh] flex flex-col"
            style={{ background: 'var(--c-16)', border: '1px solid var(--c-w10)' }}
            onClick={e => e.stopPropagation()}>

            <div className="flex items-center justify-between px-5 py-4 flex-shrink-0"
              style={{ borderBottom: '1px solid var(--c-w8)' }}>
              <p className="font-black text-base" style={{ color: 'var(--c-97)' }}>
                {editingSet ? 'Modifica set' : 'Nuovo set domande'}
              </p>
              <button onClick={() => setShowSetForm(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{ background: 'var(--c-25)', color: 'var(--c-55)' }}>
                <FontAwesomeIcon icon={faXmark} className="text-xs" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <input
                placeholder="Titolo del set *"
                value={setTitolo}
                onChange={e => setSetTitolo(e.target.value)}
                className="w-full px-4 py-3 rounded-xl text-sm"
                style={{ background: 'var(--c-22)', border: '1px solid var(--c-w10)', color: 'var(--c-90)' }}
              />
              <input
                placeholder="Descrizione (opzionale)"
                value={setDesc}
                onChange={e => setSetDesc(e.target.value)}
                className="w-full px-4 py-3 rounded-xl text-sm"
                style={{ background: 'var(--c-22)', border: '1px solid var(--c-w10)', color: 'var(--c-90)' }}
              />

              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--c-45)' }}>
                    Domande ({domande.length})
                  </p>
                  <button onClick={addDomanda}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold"
                    style={{ background: 'oklch(0.70 0.19 46 / 15%)', color: 'oklch(0.70 0.19 46)' }}>
                    <FontAwesomeIcon icon={faPlus} /> Aggiungi
                  </button>
                </div>
                <div className="space-y-2">
                  {domande.map((d, i) => (
                    <div key={i} className="flex gap-2 items-start">
                      <div className="flex-1 rounded-xl overflow-hidden"
                        style={{ background: 'var(--c-20)', border: '1px solid var(--c-w8)' }}>
                        <input
                          placeholder={`Domanda ${i + 1}`}
                          value={d.testo}
                          onChange={e => updateDomanda(i, 'testo', e.target.value)}
                          className="w-full px-3 py-2.5 text-sm bg-transparent"
                          style={{ color: 'var(--c-90)', borderBottom: '1px solid var(--c-w6)' }}
                        />
                        <div className="flex gap-1 p-2">
                          {(['scala', 'numero', 'testo', 'foto'] as TipoQ[]).map(t => (
                            <button key={t} onClick={() => updateDomanda(i, 'tipo', t)}
                              className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs transition-all"
                              style={{
                                background: d.tipo === t ? 'oklch(0.70 0.19 46 / 20%)' : 'transparent',
                                color: d.tipo === t ? 'oklch(0.70 0.19 46)' : 'var(--c-40)',
                              }}>
                              <FontAwesomeIcon icon={TIPO_ICONS[t]} />
                              <span className="hidden sm:inline">{TIPO_LABELS[t]}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                      <button onClick={() => removeDomanda(i)}
                        className="w-8 h-8 mt-1 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ background: 'oklch(0.65 0.22 27 / 12%)', color: 'oklch(0.70 0.15 27)' }}>
                        <FontAwesomeIcon icon={faXmark} className="text-xs" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-4 flex-shrink-0" style={{ borderTop: '1px solid var(--c-w8)' }}>
              <button onClick={saveSet} disabled={savingSet || !setTitolo.trim()}
                className="w-full py-3 rounded-xl text-sm font-bold"
                style={{
                  background: !setTitolo.trim() ? 'var(--c-25)' : 'oklch(0.70 0.19 46)',
                  color: !setTitolo.trim() ? 'var(--c-45)' : 'var(--c-13)',
                }}>
                {savingSet ? 'Salvataggio...' : editingSet ? '✓ Salva modifiche' : '✓ Crea set'}
              </button>
            </div>
          </div>
        </div>
      )}
      </div>{/* end padding wrapper */}
    </div>
  )
}

// ─── Timeline Storico ─────────────────────────────────────────────────────────

function TimelineStorico({ clienteId, supabase }: { clienteId: string; supabase: any }) {
  const [storico, setStorico] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from('progress_check_schedulazioni')
        .select('id, data, progress_check_risposte(id, inviato_at, visto_coach)')
        .eq('cliente_id', clienteId)
        .order('data', { ascending: false })
        .limit(12)
      setStorico(data ?? [])
      setLoading(false)
    }
    fetch()
  }, [clienteId])

  if (loading) return <BynariLoader file="blue" size={40} />
  if (storico.length === 0) return (
    <p className="text-sm" style={{ color: 'var(--c-35)' }}>Nessuno storico disponibile</p>
  )

  return (
    <div className="relative">
      {/* Linea verticale */}
      <div className="absolute left-3.5 top-4 bottom-4 w-px" style={{ background: 'var(--c-w8)' }} />
      <div className="space-y-3">
        {storico.map((s, i) => {
          const completato = s.progress_check_risposte?.length > 0
          return (
            <div key={s.id} className="flex items-center gap-3 relative">
              <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 z-10"
                style={{ background: completato ? 'oklch(0.65 0.18 150 / 20%)' : 'var(--c-25)', border: `1px solid ${completato ? 'oklch(0.65 0.18 150 / 40%)' : 'var(--c-w10)'}` }}>
                <FontAwesomeIcon
                  icon={completato ? faCircleCheck : faCircle}
                  className="text-xs"
                  style={{ color: completato ? 'oklch(0.65 0.18 150)' : 'var(--c-30)' }}
                />
              </div>
              <div className="flex-1">
                <p className="text-xs font-semibold" style={{ color: completato ? 'var(--c-75)' : 'var(--c-45)' }}>
                  {new Date(s.data).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
                <p className="text-xs" style={{ color: 'var(--c-40)' }}>
                  {completato ? `Inviato il ${new Date(s.progress_check_risposte[0].inviato_at).toLocaleDateString('it-IT')}` : 'Non compilato'}
                </p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
