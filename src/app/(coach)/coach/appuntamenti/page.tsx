'use client'

import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faCalendarDays, faVideo, faPhone, faPerson,
  faCheck, faXmark, faChevronLeft, faChevronRight, faPlus,
} from '@fortawesome/free-solid-svg-icons'

interface Appuntamento {
  id: string
  cliente_id: string
  data_ora: string
  durata_minuti: number
  tipo: string
  link: string | null
  note: string | null
  stato: string
  profiles?: { full_name: string | null }
}

interface Cliente {
  cliente_id: string
  full_name: string | null
}

const TIPO_COLOR: Record<string, { bg: string; border: string; text: string }> = {
  videocall: { bg: 'oklch(0.60 0.15 200 / 20%)', border: 'oklch(0.60 0.15 200)', text: 'oklch(0.75 0.12 200)' },
  chiamata:  { bg: 'oklch(0.70 0.19 46 / 20%)',  border: 'oklch(0.70 0.19 46)',  text: 'oklch(0.80 0.15 46)' },
  presenza:  { bg: 'oklch(0.65 0.18 150 / 20%)', border: 'oklch(0.65 0.18 150)', text: 'oklch(0.75 0.14 150)' },
}

const HOUR_START = 8
const HOUR_END = 22
const TOTAL_HOURS = HOUR_END - HOUR_START
const PX_PER_HOUR = 64

function getMondayOf(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day))
  d.setHours(0, 0, 0, 0)
  return d
}

export default function AppuntamentiPage() {
  const supabase = useMemo(() => createClient(), [])

  const [appuntamenti, setAppuntamenti] = useState<Appuntamento[]>([])
  const [clienti, setClienti] = useState<Cliente[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [weekOffset, setWeekOffset] = useState(0)
  const [showForm, setShowForm] = useState(false)
  const [tooltip, setTooltip] = useState<string | null>(null)

  // Form
  const [fCliente, setFCliente] = useState('')
  const [fData, setFData] = useState('')
  const [fOra, setFOra] = useState('')
  const [fDurata, setFDurata] = useState('30')
  const [fTipo, setFTipo] = useState('videocall')
  const [fLink, setFLink] = useState('')
  const [fNote, setFNote] = useState('')

  const fetchAll = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }

    const [appsRes, clientiRes] = await Promise.all([
      supabase.from('appuntamenti')
        .select('id, cliente_id, data_ora, durata_minuti, tipo, link, note, stato, profiles!appuntamenti_cliente_id_fkey(full_name)')
        .eq('coach_id', user.id)
        .order('data_ora'),
      supabase.from('coach_clienti')
        .select('cliente_id, profiles!coach_clienti_cliente_id_fkey(full_name)')
        .eq('coach_id', user.id),
    ])

    setAppuntamenti((appsRes.data as any) ?? [])
    setClienti(
      ((clientiRes.data as any) ?? []).map((c: any) => ({
        cliente_id: c.cliente_id,
        full_name: c.profiles?.full_name ?? null,
      }))
    )
    setLoading(false)
  }

  useEffect(() => { fetchAll() }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!fCliente || !fData || !fOra) return
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(false); return }

    await supabase.from('appuntamenti').insert({
      coach_id: user.id,
      cliente_id: fCliente,
      data_ora: new Date(`${fData}T${fOra}:00`).toISOString(),
      durata_minuti: parseInt(fDurata),
      tipo: fTipo,
      link: fLink || null,
      note: fNote || null,
      stato: 'programmato',
    })

    setFCliente(''); setFData(''); setFOra(''); setFDurata('30')
    setFTipo('videocall'); setFLink(''); setFNote('')
    setShowForm(false)
    setSaving(false)
    fetchAll()
  }

  const handleStato = async (id: string, stato: 'completato' | 'annullato') => {
    await supabase.from('appuntamenti').update({ stato }).eq('id', id)
    setTooltip(null)
    fetchAll()
  }

  // Week days
  const today = useMemo(() => { const d = new Date(); d.setHours(0,0,0,0); return d }, [])
  const weekStart = getMondayOf(new Date(today.getTime() + weekOffset * 7 * 86400000))
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart)
    d.setDate(d.getDate() + i)
    return d
  })

  const weekApps = appuntamenti.filter(a => {
    const d = new Date(a.data_ora); d.setHours(0,0,0,0)
    return d >= days[0] && d <= days[6] && a.stato === 'programmato'
  })

  const labelSettimana = weekOffset === 0 ? 'Questa settimana'
    : weekOffset === 1 ? 'Prossima settimana'
    : weekOffset === -1 ? 'Settimana scorsa'
    : `${days[0].toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })} – ${days[6].toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })}`

  const futuri = appuntamenti.filter(a => new Date(a.data_ora) >= new Date() && a.stato === 'programmato')

  const inputStyle = {
    background: 'oklch(0.14 0 0)',
    border: '1px solid oklch(1 0 0 / 10%)',
    color: 'oklch(0.97 0 0)',
    borderRadius: '10px',
    padding: '8px 12px',
    fontSize: '14px',
    width: '100%',
  } as const

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-4xl font-black tracking-tight" style={{ color: 'oklch(0.97 0 0)' }}>Appuntamenti</h1>
          <p className="mt-1 text-sm" style={{ color: 'oklch(0.50 0 0)' }}>
            {futuri.length} programmati
          </p>
        </div>
        <button
          onClick={() => setShowForm(p => !p)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold flex-shrink-0 transition-all active:scale-95"
          style={{ background: 'oklch(0.70 0.19 46)', color: 'oklch(0.11 0 0)' }}>
          <FontAwesomeIcon icon={faPlus} />
          Nuovo
        </button>
      </div>

      {/* Form nuovo appuntamento */}
      {showForm && (
        <div className="rounded-2xl overflow-hidden"
          style={{ background: 'oklch(0.18 0 0)', border: '1px solid oklch(0.60 0.15 200 / 30%)' }}>
          <div className="px-5 py-3" style={{ borderBottom: '1px solid oklch(1 0 0 / 6%)' }}>
            <p className="font-bold text-sm" style={{ color: 'oklch(0.97 0 0)' }}>
              <FontAwesomeIcon icon={faCalendarDays} className="mr-2" style={{ color: 'oklch(0.70 0.19 46)' }} />
              Nuovo appuntamento
            </p>
          </div>
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'oklch(0.55 0 0)' }}>Cliente</label>
              <select value={fCliente} onChange={e => setFCliente(e.target.value)} required style={inputStyle}>
                <option value="">Seleziona cliente…</option>
                {clienti
                  .slice()
                  .sort((a, b) => (a.full_name ?? '').localeCompare(b.full_name ?? '', 'it'))
                  .map(c => (
                    <option key={c.cliente_id} value={c.cliente_id}>{c.full_name ?? c.cliente_id}</option>
                  ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'oklch(0.55 0 0)' }}>Data</label>
                <input type="date" value={fData} onChange={e => setFData(e.target.value)} required style={inputStyle} />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'oklch(0.55 0 0)' }}>Ora</label>
                <input type="time" value={fOra} onChange={e => setFOra(e.target.value)} required style={inputStyle} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'oklch(0.55 0 0)' }}>Durata</label>
                <select value={fDurata} onChange={e => setFDurata(e.target.value)} style={inputStyle}>
                  {['15', '30', '45', '60'].map(d => <option key={d} value={d}>{d} min</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'oklch(0.55 0 0)' }}>Tipo</label>
                <select value={fTipo} onChange={e => setFTipo(e.target.value)} style={inputStyle}>
                  <option value="videocall">Videocall</option>
                  <option value="chiamata">Chiamata</option>
                  <option value="presenza">Presenza</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'oklch(0.55 0 0)' }}>Link (opzionale)</label>
              <input type="url" value={fLink} onChange={e => setFLink(e.target.value)}
                placeholder="https://meet.google.com/…" style={inputStyle} />
            </div>

            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'oklch(0.55 0 0)' }}>Note (opzionale)</label>
              <textarea value={fNote} onChange={e => setFNote(e.target.value)} rows={2}
                placeholder="Argomenti da discutere…" style={{ ...inputStyle, resize: 'none' }} />
            </div>

            <div className="flex gap-2">
              <button type="submit" disabled={saving}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-opacity disabled:opacity-50"
                style={{ background: 'oklch(0.70 0.19 46)', color: 'oklch(0.11 0 0)' }}>
                {saving ? 'Salvataggio…' : 'Fissa appuntamento'}
              </button>
              <button type="button" onClick={() => setShowForm(false)}
                className="px-4 py-2.5 rounded-xl text-sm font-medium"
                style={{ background: 'oklch(0.22 0 0)', color: 'oklch(0.55 0 0)' }}>
                Annulla
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Calendario settimanale */}
      <div>
        <div className="flex items-center gap-3 mb-3">
          <button onClick={() => setWeekOffset(p => p - 1)}
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: 'oklch(0.22 0 0)', color: 'oklch(0.60 0 0)' }}>
            <FontAwesomeIcon icon={faChevronLeft} className="text-xs" />
          </button>
          <p className="text-sm font-semibold" style={{ color: 'oklch(0.75 0 0)' }}>{labelSettimana}</p>
          <button onClick={() => setWeekOffset(p => p + 1)}
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: 'oklch(0.22 0 0)', color: 'oklch(0.60 0 0)' }}>
            <FontAwesomeIcon icon={faChevronRight} className="text-xs" />
          </button>
          {weekOffset !== 0 && (
            <button onClick={() => setWeekOffset(0)} className="text-xs font-medium" style={{ color: 'oklch(0.60 0.15 200)' }}>
              Oggi
            </button>
          )}
        </div>

        <div className="rounded-2xl overflow-hidden"
          style={{ background: 'oklch(0.18 0 0)', border: '1px solid oklch(1 0 0 / 6%)' }}>

          {/* Header giorni */}
          <div className="grid" style={{ gridTemplateColumns: '44px repeat(7, 1fr)', borderBottom: '1px solid oklch(1 0 0 / 8%)' }}>
            <div />
            {days.map((d, i) => {
              const isToday = d.getTime() === today.getTime()
              return (
                <div key={i} className="py-3 text-center">
                  <p className="text-xs font-medium" style={{ color: 'oklch(0.45 0 0)' }}>
                    {d.toLocaleDateString('it-IT', { weekday: 'short' }).toUpperCase()}
                  </p>
                  <div className="mx-auto mt-1 w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold"
                    style={{
                      background: isToday ? 'oklch(0.60 0.15 200)' : 'transparent',
                      color: isToday ? 'white' : 'oklch(0.75 0 0)',
                    }}>
                    {d.getDate()}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Griglia ore */}
          <div className="overflow-y-auto" style={{ maxHeight: `${PX_PER_HOUR * 8}px` }}>
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <p className="text-sm" style={{ color: 'oklch(0.45 0 0)' }}>Caricamento…</p>
              </div>
            ) : (
              <div className="relative grid"
                style={{ gridTemplateColumns: '44px repeat(7, 1fr)', height: `${PX_PER_HOUR * TOTAL_HOURS}px` }}
                onClick={() => setTooltip(null)}>

                {/* Label ore + linee orizzontali */}
                {Array.from({ length: TOTAL_HOURS }, (_, i) => HOUR_START + i).map(h => (
                  <div key={h} className="contents">
                    <div className="absolute text-right pr-2"
                      style={{ top: `${(h - HOUR_START) * PX_PER_HOUR - 8}px`, left: 0, width: '44px' }}>
                      <span className="text-xs" style={{ color: 'oklch(0.35 0 0)' }}>{h}:00</span>
                    </div>
                    <div className="absolute left-11 right-0"
                      style={{ top: `${(h - HOUR_START) * PX_PER_HOUR}px`, borderTop: '1px solid oklch(1 0 0 / 5%)' }} />
                  </div>
                ))}

                {/* Colonne giorni */}
                {days.map((d, colIdx) => {
                  const isToday = d.getTime() === today.getTime()
                  const dayApps = weekApps.filter(a => {
                    const ad = new Date(a.data_ora); ad.setHours(0,0,0,0)
                    return ad.getTime() === d.getTime()
                  })

                  return (
                    <div key={colIdx} className="relative"
                      style={{
                        gridColumn: colIdx + 2,
                        gridRow: 1,
                        borderLeft: '1px solid oklch(1 0 0 / 5%)',
                        background: isToday ? 'oklch(0.60 0.15 200 / 3%)' : 'transparent',
                      }}>

                      {/* Linea ora corrente */}
                      {isToday && (() => {
                        const now = new Date()
                        const mins = (now.getHours() - HOUR_START) * 60 + now.getMinutes()
                        if (mins < 0 || mins > TOTAL_HOURS * 60) return null
                        const top = (mins / 60) * PX_PER_HOUR
                        return (
                          <div className="absolute left-0 right-0 z-10 pointer-events-none flex items-center"
                            style={{ top: `${top}px` }}>
                            <div className="w-2 h-2 rounded-full flex-shrink-0"
                              style={{ background: 'oklch(0.60 0.15 200)', marginLeft: '-4px' }} />
                            <div className="flex-1" style={{ borderTop: '1px solid oklch(0.60 0.15 200)' }} />
                          </div>
                        )
                      })()}

                      {/* Blocchi appuntamento */}
                      {dayApps.map(a => {
                        const startDate = new Date(a.data_ora)
                        const startMin = (startDate.getHours() - HOUR_START) * 60 + startDate.getMinutes()
                        const top = (startMin / 60) * PX_PER_HOUR
                        const height = Math.max((a.durata_minuti / 60) * PX_PER_HOUR, 20)
                        const colors = TIPO_COLOR[a.tipo] ?? TIPO_COLOR.videocall

                        return (
                          <div key={a.id}
                            className="absolute left-0.5 right-0.5 rounded-lg px-1.5 overflow-visible cursor-pointer"
                            style={{ top: `${top}px`, height: `${height}px`, background: colors.bg, borderLeft: `2px solid ${colors.border}`, zIndex: tooltip === a.id ? 30 : 2 }}
                            onClick={e => { e.stopPropagation(); setTooltip(tooltip === a.id ? null : a.id) }}>
                            <p className="text-xs font-semibold leading-tight truncate mt-0.5" style={{ color: colors.text, fontSize: '10px' }}>
                              {startDate.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                              {height > 30 && <> · {a.profiles?.full_name ?? '—'}</>}
                            </p>

                            {/* Tooltip */}
                            {tooltip === a.id && (
                              <div className="absolute left-0 top-full mt-1 rounded-xl overflow-hidden shadow-xl min-w-52"
                                style={{ background: 'oklch(0.22 0 0)', border: '1px solid oklch(1 0 0 / 14%)', zIndex: 50 }}
                                onClick={e => e.stopPropagation()}>
                                <div className="px-3 py-2.5" style={{ borderBottom: '1px solid oklch(1 0 0 / 8%)' }}>
                                  <p className="text-sm font-bold" style={{ color: 'oklch(0.90 0 0)' }}>
                                    {a.profiles?.full_name ?? '—'}
                                  </p>
                                  <p className="text-xs mt-0.5" style={{ color: 'oklch(0.55 0 0)' }}>
                                    {startDate.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })}
                                    {' · '}{startDate.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                                    {' · '}{a.durata_minuti}min · {a.tipo}
                                  </p>
                                  {a.link && (
                                    <a href={a.link} target="_blank" rel="noopener noreferrer"
                                      className="text-xs" style={{ color: 'oklch(0.60 0.15 200)' }}>
                                      Partecipa →
                                    </a>
                                  )}
                                  {a.note && <p className="text-xs italic mt-0.5" style={{ color: 'oklch(0.45 0 0)' }}>{a.note}</p>}
                                </div>
                                <div className="flex">
                                  <button onClick={() => handleStato(a.id, 'completato')}
                                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold"
                                    style={{ color: 'oklch(0.65 0.18 150)', borderRight: '1px solid oklch(1 0 0 / 8%)' }}>
                                    <FontAwesomeIcon icon={faCheck} /> Fatto
                                  </button>
                                  <button onClick={() => handleStato(a.id, 'annullato')}
                                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium"
                                    style={{ color: 'oklch(0.75 0.15 27)' }}>
                                    <FontAwesomeIcon icon={faXmark} /> Annulla
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Legenda */}
          <div className="px-4 py-2 flex items-center gap-4 flex-wrap" style={{ borderTop: '1px solid oklch(1 0 0 / 6%)' }}>
            {Object.entries(TIPO_COLOR).map(([tipo, c]) => (
              <div key={tipo} className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm" style={{ background: c.bg, borderLeft: `2px solid ${c.border}` }} />
                <span className="text-xs capitalize" style={{ color: 'oklch(0.45 0 0)' }}>{tipo}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
