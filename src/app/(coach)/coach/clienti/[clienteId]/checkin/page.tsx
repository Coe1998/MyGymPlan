'use client'

import { use, useEffect, useState, useMemo } from 'react'
import BynariLoader from '@/components/shared/BynariLoader'
import { createClient } from '@/lib/supabase/client'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCalendarDays, faVideo, faPhone, faPerson, faCheck, faXmark, faArrowLeft, faChevronLeft, faChevronRight, faPlus } from '@fortawesome/free-solid-svg-icons'
import Link from 'next/link'

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

const TIPO_COLOR: Record<string, { bg: string; border: string; text: string }> = {
  videocall: { bg: 'oklch(0.60 0.15 200 / 20%)', border: 'oklch(0.60 0.15 200)', text: 'oklch(0.75 0.12 200)' },
  chiamata:  { bg: 'oklch(0.70 0.19 46 / 20%)',  border: 'oklch(0.70 0.19 46)',  text: 'oklch(0.80 0.15 46)' },
  presenza:  { bg: 'oklch(0.65 0.18 150 / 20%)', border: 'oklch(0.65 0.18 150)', text: 'oklch(0.75 0.14 150)' },
}
const TIPO_ICON: Record<string, any> = { videocall: faVideo, chiamata: faPhone, presenza: faPerson }

const HOUR_START = 8
const HOUR_END = 22
const TOTAL_HOURS = HOUR_END - HOUR_START
const PX_PER_HOUR = 64

function getMondayOf(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

function WeekCalendar({
  allApps,
  clienteId,
  weekOffset,
  onDelete,
}: {
  allApps: Appuntamento[]
  clienteId: string
  weekOffset: number
  onDelete: (id: string, stato: 'completato' | 'annullato') => void
}) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const weekStart = getMondayOf(new Date(today.getTime() + weekOffset * 7 * 86400000))
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart)
    d.setDate(d.getDate() + i)
    return d
  })

  const hours = Array.from({ length: TOTAL_HOURS }, (_, i) => HOUR_START + i)

  const appsInWeek = allApps.filter(a => {
    const d = new Date(a.data_ora)
    d.setHours(0, 0, 0, 0)
    return d >= days[0] && d <= days[6] && a.stato === 'programmato'
  })

  const [tooltip, setTooltip] = useState<string | null>(null)

  return (
    <div className="rounded-2xl overflow-hidden"
      style={{ background: 'var(--c-18)', border: '1px solid var(--c-w6)' }}>

      {/* Header giorni */}
      <div className="grid" style={{ gridTemplateColumns: '44px repeat(7, 1fr)', borderBottom: '1px solid var(--c-w8)' }}>
        <div />
        {days.map((d, i) => {
          const isToday = d.getTime() === today.getTime()
          return (
            <div key={i} className="py-3 text-center">
              <p className="text-xs font-medium" style={{ color: 'var(--c-45)' }}>
                {d.toLocaleDateString('it-IT', { weekday: 'short' }).toUpperCase()}
              </p>
              <div className={`mx-auto mt-1 w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold`}
                style={{
                  background: isToday ? 'oklch(0.60 0.15 200)' : 'transparent',
                  color: isToday ? 'white' : 'var(--c-75)',
                }}>
                {d.getDate()}
              </div>
            </div>
          )
        })}
      </div>

      {/* Grid ore */}
      <div className="overflow-y-auto" style={{ maxHeight: `${PX_PER_HOUR * 8}px` }}>
        <div className="relative grid" style={{ gridTemplateColumns: '44px repeat(7, 1fr)', height: `${PX_PER_HOUR * TOTAL_HOURS}px` }}>

          {/* Righe ore — label + linea */}
          {hours.map(h => (
            <div key={h} className="contents">
              <div className="absolute text-right pr-2"
                style={{ top: `${(h - HOUR_START) * PX_PER_HOUR - 8}px`, left: 0, width: '44px' }}>
                <span className="text-xs" style={{ color: 'var(--c-35)' }}>{h}:00</span>
              </div>
              {/* Linea orizzontale su tutta la griglia */}
              <div className="absolute left-11 right-0"
                style={{ top: `${(h - HOUR_START) * PX_PER_HOUR}px`, borderTop: '1px solid var(--c-w5)' }} />
            </div>
          ))}

          {/* Colonne giorni */}
          {days.map((d, colIdx) => {
            const dayApps = appsInWeek.filter(a => {
              const ad = new Date(a.data_ora)
              ad.setHours(0, 0, 0, 0)
              return ad.getTime() === d.getTime()
            })

            return (
              <div key={colIdx} className="relative"
                style={{
                  gridColumn: colIdx + 2,
                  gridRow: 1,
                  borderLeft: '1px solid var(--c-w5)',
                }}>
                {dayApps.map(a => {
                  const startDate = new Date(a.data_ora)
                  const startMin = (startDate.getHours() - HOUR_START) * 60 + startDate.getMinutes()
                  const top = (startMin / 60) * PX_PER_HOUR
                  const height = Math.max((a.durata_minuti / 60) * PX_PER_HOUR, 20)
                  const isCurrentCliente = a.cliente_id === clienteId
                  const colors = isCurrentCliente
                    ? (TIPO_COLOR[a.tipo] ?? TIPO_COLOR.videocall)
                    : { bg: 'var(--c-25)', border: 'var(--c-35)', text: 'var(--c-50)' }

                  return (
                    <div key={a.id}
                      className="absolute left-0.5 right-0.5 rounded-lg px-1.5 overflow-visible cursor-pointer"
                      style={{
                        top: `${top}px`,
                        height: `${height}px`,
                        background: colors.bg,
                        borderLeft: `2px solid ${colors.border}`,
                        zIndex: tooltip === a.id ? 30 : isCurrentCliente ? 2 : 1,
                      }}
                      onClick={() => setTooltip(tooltip === a.id ? null : a.id)}>
                      <p className="text-xs font-semibold leading-tight truncate mt-0.5" style={{ color: colors.text }}>
                        {new Date(a.data_ora).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                        {height > 30 && <> · {a.profiles?.full_name ?? '—'}</>}
                      </p>

                      {/* Tooltip azioni */}
                      {tooltip === a.id && isCurrentCliente && (
                        <div className="absolute left-0 top-full mt-1 z-50 rounded-xl overflow-hidden shadow-xl min-w-44"
                          style={{ background: 'var(--c-22)', border: '1px solid var(--c-w14)' }}
                          onClick={e => e.stopPropagation()}>
                          <div className="px-3 py-2" style={{ borderBottom: '1px solid var(--c-w8)' }}>
                            <p className="text-xs font-bold" style={{ color: 'var(--c-85)' }}>
                              {a.profiles?.full_name} · {new Date(a.data_ora).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })} {new Date(a.data_ora).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                            <p className="text-xs mt-0.5" style={{ color: 'var(--c-50)' }}>{a.durata_minuti}min · {a.tipo}</p>
                            {a.link && <a href={a.link} target="_blank" rel="noopener noreferrer" className="text-xs" style={{ color: 'oklch(0.60 0.15 200)' }}>Link →</a>}
                            {a.note && <p className="text-xs italic mt-0.5" style={{ color: 'var(--c-45)' }}>{a.note}</p>}
                          </div>
                          <div className="flex">
                            <button onClick={() => { onDelete(a.id, 'completato'); setTooltip(null) }}
                              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold"
                              style={{ color: 'oklch(0.65 0.18 150)', borderRight: '1px solid var(--c-w8)' }}>
                              <FontAwesomeIcon icon={faCheck} /> Fatto
                            </button>
                            <button onClick={() => { onDelete(a.id, 'annullato'); setTooltip(null) }}
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
      </div>
    </div>
  )
}

export default function CheckinPage({ params }: { params: Promise<{ clienteId: string }> }) {
  const { clienteId } = use(params)
  const supabase = useMemo(() => createClient(), [])

  const [nomeCliente, setNomeCliente] = useState('')
  const [allApps, setAllApps] = useState<Appuntamento[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [weekOffset, setWeekOffset] = useState(0)
  const [showForm, setShowForm] = useState(false)

  // Form state
  const [data, setData] = useState('')
  const [ora, setOra] = useState('')
  const [durata, setDurata] = useState('30')
  const [tipo, setTipo] = useState('videocall')
  const [link, setLink] = useState('')
  const [note, setNote] = useState('')

  const fetchAll = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }

    const [profileRes, allAppsRes] = await Promise.all([
      supabase.from('profiles').select('full_name').eq('id', clienteId).single(),
      // Fetch ALL coach appointments for the calendar (full picture)
      supabase.from('appuntamenti')
        .select('id, cliente_id, data_ora, durata_minuti, tipo, link, note, stato, profiles!appuntamenti_cliente_id_fkey(full_name)')
        .eq('coach_id', user.id)
        .order('data_ora'),
    ])
    setNomeCliente(profileRes.data?.full_name ?? 'Cliente')
    setAllApps((allAppsRes.data as any) ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchAll() }, [clienteId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!data || !ora) return
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(false); return }

    const data_ora = new Date(`${data}T${ora}:00`).toISOString()
    await supabase.from('appuntamenti').insert({
      coach_id: user.id,
      cliente_id: clienteId,
      data_ora,
      durata_minuti: parseInt(durata),
      tipo,
      link: link || null,
      note: note || null,
      stato: 'programmato',
    })

    setData(''); setOra(''); setDurata('30'); setTipo('videocall'); setLink(''); setNote('')
    setSaving(false)
    fetchAll()
  }

  const handleStato = async (id: string, stato: 'completato' | 'annullato') => {
    await supabase.from('appuntamenti').update({ stato }).eq('id', id)
    fetchAll()
  }

  const clienteApps = allApps.filter(a => a.cliente_id === clienteId)
  const futuri = clienteApps.filter(a => new Date(a.data_ora) >= new Date() && a.stato === 'programmato')
  const storici = clienteApps.filter(a => new Date(a.data_ora) < new Date() || a.stato !== 'programmato')

  const weekStart = getMondayOf(new Date(Date.now() + weekOffset * 7 * 86400000))
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekEnd.getDate() + 6)
  const labelSettimana = weekOffset === 0
    ? 'Questa settimana'
    : weekOffset === 1 ? 'Prossima settimana'
    : weekOffset === -1 ? 'Settimana scorsa'
    : `${weekStart.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })} – ${weekEnd.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })}`

  const inputStyle = {
    background: 'var(--c-14)',
    border: '1px solid var(--c-w10)',
    color: 'var(--c-97)',
    borderRadius: '10px',
    padding: '8px 12px',
    fontSize: '14px',
    width: '100%',
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <Link href="/coach/clienti"
          className="inline-flex items-center gap-2 text-sm mb-4"
          style={{ color: 'var(--c-50)' }}>
          <FontAwesomeIcon icon={faArrowLeft} />
          Clienti
        </Link>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-3xl font-black tracking-tight" style={{ color: 'var(--c-97)' }}>
              Check-in con {nomeCliente}
            </h1>
            <p className="mt-1 text-sm" style={{ color: 'var(--c-50)' }}>
              {futuri.length} programmati · {storici.length} passati
            </p>
          </div>
          <button
            onClick={() => setShowForm(p => !p)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold flex-shrink-0 transition-all active:scale-95"
            style={{ background: showForm ? 'var(--c-22)' : 'oklch(0.70 0.19 46)', color: showForm ? 'var(--c-55)' : 'var(--c-11)' }}>
            <FontAwesomeIcon icon={faPlus} style={{ transform: showForm ? 'rotate(45deg)' : 'none', transition: 'transform 0.2s' }} />
            {showForm ? 'Chiudi' : 'Nuovo'}
          </button>
        </div>
      </div>

      {/* Calendario settimanale */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <button onClick={() => setWeekOffset(p => p - 1)}
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:bg-white/8"
              style={{ background: 'var(--c-22)', color: 'var(--c-60)' }}>
              <FontAwesomeIcon icon={faChevronLeft} className="text-xs" />
            </button>
            <p className="text-sm font-semibold" style={{ color: 'var(--c-75)' }}>{labelSettimana}</p>
            <button onClick={() => setWeekOffset(p => p + 1)}
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:bg-white/8"
              style={{ background: 'var(--c-22)', color: 'var(--c-60)' }}>
              <FontAwesomeIcon icon={faChevronRight} className="text-xs" />
            </button>
            {weekOffset !== 0 && (
              <button onClick={() => setWeekOffset(0)} className="text-xs font-medium" style={{ color: 'oklch(0.60 0.15 200)' }}>
                Oggi
              </button>
            )}
          </div>
          {/* Legenda */}
          <div className="hidden sm:flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm" style={{ background: 'oklch(0.60 0.15 200 / 30%)', borderLeft: '2px solid oklch(0.60 0.15 200)' }} />
              <span className="text-xs" style={{ color: 'var(--c-45)' }}>{nomeCliente}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm" style={{ background: 'var(--c-25)', borderLeft: '2px solid var(--c-35)' }} />
              <span className="text-xs" style={{ color: 'var(--c-45)' }}>Altri clienti</span>
            </div>
          </div>
        </div>

        {loading ? (
          <BynariLoader file="blue" size={80} />
        ) : (
          <WeekCalendar
            allApps={allApps}
            clienteId={clienteId}
            weekOffset={weekOffset}
            onDelete={handleStato}
          />
        )}
      </div>

      {/* Form nuovo appuntamento */}
      {showForm && <div className="rounded-2xl overflow-hidden"
        style={{ background: 'var(--c-18)', border: '1px solid oklch(0.60 0.15 200 / 30%)' }}>
        <div className="px-5 py-3" style={{ borderBottom: '1px solid var(--c-w6)' }}>
          <p className="font-bold text-sm" style={{ color: 'var(--c-97)' }}>
            <FontAwesomeIcon icon={faCalendarDays} className="mr-2" style={{ color: 'oklch(0.70 0.19 46)' }} />
            Nuovo appuntamento
          </p>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--c-55)' }}>Data</label>
              <input type="date" value={data} onChange={e => setData(e.target.value)}
                required style={inputStyle} />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--c-55)' }}>Ora</label>
              <input type="time" value={ora} onChange={e => setOra(e.target.value)}
                required style={inputStyle} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--c-55)' }}>Durata</label>
              <select value={durata} onChange={e => setDurata(e.target.value)} style={inputStyle}>
                {['15', '30', '45', '60'].map(d => (
                  <option key={d} value={d}>{d} min</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--c-55)' }}>Tipo</label>
              <select value={tipo} onChange={e => setTipo(e.target.value)} style={inputStyle}>
                <option value="videocall">Videocall</option>
                <option value="chiamata">Chiamata</option>
                <option value="presenza">Presenza</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--c-55)' }}>Link (opzionale)</label>
            <input type="url" value={link} onChange={e => setLink(e.target.value)}
              placeholder="https://meet.google.com/..." style={inputStyle} />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--c-55)' }}>Note (opzionale)</label>
            <textarea value={note} onChange={e => setNote(e.target.value)}
              rows={2} placeholder="Argomenti da discutere..."
              style={{ ...inputStyle, resize: 'none' }} />
          </div>

          <button type="submit" disabled={saving}
            className="w-full py-2.5 rounded-xl text-sm font-bold transition-opacity disabled:opacity-50"
            style={{ background: 'oklch(0.70 0.19 46)', color: 'var(--c-11)' }}>
            {saving ? 'Salvataggio...' : 'Fissa appuntamento'}
          </button>
        </form>
      </div>}

      {/* Storico di questo cliente */}
      {!loading && storici.length > 0 && (
        <div>
          <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--c-40)' }}>
            Storico
          </p>
          <div className="space-y-2">
            {storici.map(a => (
              <div key={a.id} className="rounded-2xl px-4 py-3 flex items-center gap-3"
                style={{ background: 'var(--c-16)', border: '1px solid var(--c-w4)', opacity: 0.6 }}>
                <FontAwesomeIcon icon={TIPO_ICON[a.tipo] ?? faCalendarDays}
                  style={{ color: 'var(--c-40)' }} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold" style={{ color: 'var(--c-70)' }}>
                    {new Date(a.data_ora).toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' })}
                    {' · '}{new Date(a.data_ora).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--c-40)' }}>{a.stato} · {a.tipo}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
