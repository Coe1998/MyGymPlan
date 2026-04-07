'use client'

import { use, useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCalendarDays, faVideo, faPhone, faPerson, faCheck, faXmark, faArrowLeft } from '@fortawesome/free-solid-svg-icons'
import Link from 'next/link'

interface Appuntamento {
  id: string
  data_ora: string
  durata_minuti: number
  tipo: string
  link: string | null
  note: string | null
  stato: string
}

const TIPO_ICON: Record<string, any> = {
  videocall: faVideo,
  chiamata: faPhone,
  presenza: faPerson,
}

export default function CheckinPage({ params }: { params: Promise<{ clienteId: string }> }) {
  const { clienteId } = use(params)
  const supabase = useMemo(() => createClient(), [])

  const [nomeCliente, setNomeCliente] = useState('')
  const [appuntamenti, setAppuntamenti] = useState<Appuntamento[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Form state
  const [data, setData] = useState('')
  const [ora, setOra] = useState('')
  const [durata, setDurata] = useState('30')
  const [tipo, setTipo] = useState('videocall')
  const [link, setLink] = useState('')
  const [note, setNote] = useState('')

  const fetchAll = async () => {
    setLoading(true)
    const [profileRes, appRes] = await Promise.all([
      supabase.from('profiles').select('full_name').eq('id', clienteId).single(),
      supabase.from('appuntamenti')
        .select('id, data_ora, durata_minuti, tipo, link, note, stato')
        .eq('cliente_id', clienteId)
        .order('data_ora', { ascending: false }),
    ])
    setNomeCliente(profileRes.data?.full_name ?? 'Cliente')
    setAppuntamenti((appRes.data as any) ?? [])
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

  const now = new Date()
  const futuri = appuntamenti.filter(a => new Date(a.data_ora) >= now && a.stato === 'programmato')
  const storici = appuntamenti.filter(a => new Date(a.data_ora) < now || a.stato !== 'programmato')

  const inputStyle = {
    background: 'oklch(0.14 0 0)',
    border: '1px solid oklch(1 0 0 / 10%)',
    color: 'oklch(0.97 0 0)',
    borderRadius: '10px',
    padding: '8px 12px',
    fontSize: '14px',
    width: '100%',
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <Link href={`/coach/clienti`}
          className="inline-flex items-center gap-2 text-sm mb-4"
          style={{ color: 'oklch(0.50 0 0)' }}>
          <FontAwesomeIcon icon={faArrowLeft} />
          Clienti
        </Link>
        <h1 className="text-3xl font-black tracking-tight" style={{ color: 'oklch(0.97 0 0)' }}>
          Check-in con {nomeCliente}
        </h1>
        <p className="mt-1 text-sm" style={{ color: 'oklch(0.50 0 0)' }}>
          {futuri.length} programmati · {storici.length} passati
        </p>
      </div>

      {/* Form nuovo appuntamento */}
      <div className="rounded-2xl overflow-hidden"
        style={{ background: 'oklch(0.18 0 0)', border: '1px solid oklch(1 0 0 / 6%)' }}>
        <div className="px-5 py-3" style={{ borderBottom: '1px solid oklch(1 0 0 / 6%)' }}>
          <p className="font-bold text-sm" style={{ color: 'oklch(0.97 0 0)' }}>
            <FontAwesomeIcon icon={faCalendarDays} className="mr-2" style={{ color: 'oklch(0.70 0.19 46)' }} />
            Nuovo appuntamento
          </p>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'oklch(0.55 0 0)' }}>Data</label>
              <input type="date" value={data} onChange={e => setData(e.target.value)}
                required style={inputStyle} />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'oklch(0.55 0 0)' }}>Ora</label>
              <input type="time" value={ora} onChange={e => setOra(e.target.value)}
                required style={inputStyle} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'oklch(0.55 0 0)' }}>Durata</label>
              <select value={durata} onChange={e => setDurata(e.target.value)} style={inputStyle}>
                {['15', '30', '45', '60'].map(d => (
                  <option key={d} value={d}>{d} min</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'oklch(0.55 0 0)' }}>Tipo</label>
              <select value={tipo} onChange={e => setTipo(e.target.value)} style={inputStyle}>
                <option value="videocall">Videocall</option>
                <option value="chiamata">Chiamata</option>
                <option value="presenza">Presenza</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'oklch(0.55 0 0)' }}>Link (opzionale)</label>
            <input type="url" value={link} onChange={e => setLink(e.target.value)}
              placeholder="https://meet.google.com/..." style={inputStyle} />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'oklch(0.55 0 0)' }}>Note (opzionale)</label>
            <textarea value={note} onChange={e => setNote(e.target.value)}
              rows={2} placeholder="Argomenti da discutere..."
              style={{ ...inputStyle, resize: 'none' }} />
          </div>

          <button type="submit" disabled={saving}
            className="w-full py-2.5 rounded-xl text-sm font-bold transition-opacity disabled:opacity-50"
            style={{ background: 'oklch(0.70 0.19 46)', color: 'oklch(0.11 0 0)' }}>
            {saving ? 'Salvataggio...' : 'Fissa appuntamento'}
          </button>
        </form>
      </div>

      {/* Prossimi appuntamenti */}
      {!loading && futuri.length > 0 && (
        <div>
          <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: 'oklch(0.50 0 0)' }}>
            Programmati
          </p>
          <div className="space-y-2">
            {futuri.map(a => (
              <div key={a.id} className="rounded-2xl p-4 flex items-center gap-3"
                style={{ background: 'oklch(0.18 0 0)', border: '1px solid oklch(1 0 0 / 6%)' }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: 'oklch(0.60 0.15 200 / 15%)', color: 'oklch(0.60 0.15 200)' }}>
                  <FontAwesomeIcon icon={TIPO_ICON[a.tipo] ?? faCalendarDays} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm" style={{ color: 'oklch(0.97 0 0)' }}>
                    {new Date(a.data_ora).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: 'oklch(0.50 0 0)' }}>
                    {new Date(a.data_ora).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                    {' · '}{a.durata_minuti} min · {a.tipo}
                    {a.link && <> · <a href={a.link} target="_blank" rel="noopener noreferrer"
                      style={{ color: 'oklch(0.60 0.15 200)' }}>Link</a></>}
                  </p>
                  {a.note && <p className="text-xs mt-0.5 italic" style={{ color: 'oklch(0.45 0 0)' }}>{a.note}</p>}
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button onClick={() => handleStato(a.id, 'completato')}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold"
                    style={{ background: 'oklch(0.65 0.18 150 / 15%)', color: 'oklch(0.65 0.18 150)' }}>
                    <FontAwesomeIcon icon={faCheck} />
                  </button>
                  <button onClick={() => handleStato(a.id, 'annullato')}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium"
                    style={{ background: 'oklch(0.65 0.22 27 / 15%)', color: 'oklch(0.75 0.15 27)' }}>
                    <FontAwesomeIcon icon={faXmark} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Storico */}
      {!loading && storici.length > 0 && (
        <div>
          <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: 'oklch(0.40 0 0)' }}>
            Storico
          </p>
          <div className="space-y-2">
            {storici.map(a => (
              <div key={a.id} className="rounded-2xl px-4 py-3 flex items-center gap-3"
                style={{ background: 'oklch(0.16 0 0)', border: '1px solid oklch(1 0 0 / 4%)', opacity: 0.6 }}>
                <FontAwesomeIcon icon={TIPO_ICON[a.tipo] ?? faCalendarDays}
                  style={{ color: 'oklch(0.40 0 0)' }} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold" style={{ color: 'oklch(0.70 0 0)' }}>
                    {new Date(a.data_ora).toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' })}
                    {' · '}{new Date(a.data_ora).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                  <p className="text-xs" style={{ color: 'oklch(0.40 0 0)' }}>{a.stato} · {a.tipo}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
