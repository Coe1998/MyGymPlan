'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faPen, faCalendarDays, faNoteSticky, faGripVertical,
  faTrash, faPlus, faLock, faCheck,
} from '@fortawesome/free-solid-svg-icons'
import { PIANI } from '@/lib/piani'
import PaywallModal from '@/components/shared/PaywallModal'

interface Esercizio { id: string; nome: string; muscoli: string[] | null }
interface SchedaEsercizio {
  id: string; esercizio_id: string; serie: number; ripetizioni: string
  recupero_secondi: number; note: string | null; ordine: number; esercizi: Esercizio
}
interface Giorno { id: string; nome: string; ordine: number; scheda_esercizi: SchedaEsercizio[] }
interface Scheda { id: string; nome: string; descrizione: string | null }

export default function AtletaSchedaDetailPage() {
  const params = useParams()
  const router = useRouter()
  const schedaId = params.id as string
  const supabase = createClient()

  const [scheda, setScheda] = useState<Scheda | null>(null)
  const [giorni, setGiorni] = useState<Giorno[]>([])
  const [esercizi, setEsercizi] = useState<Esercizio[]>([])
  const [piano, setPiano] = useState<'free' | 'pro'>('free')
  const [loading, setLoading] = useState(true)
  const [showPaywall, setShowPaywall] = useState(false)
  const [paywallMsg, setPaywallMsg] = useState({ titolo: '', descrizione: '' })

  const [editingInfo, setEditingInfo] = useState(false)
  const [editNome, setEditNome] = useState('')
  const [editDesc, setEditDesc] = useState('')
  const [savingInfo, setSavingInfo] = useState(false)

  const [editingGiornoId, setEditingGiornoId] = useState<string | null>(null)
  const [editGiornoNome, setEditGiornoNome] = useState('')
  const [newGiornoNome, setNewGiornoNome] = useState('')
  const [addingGiorno, setAddingGiorno] = useState(false)

  const [addingToGiorno, setAddingToGiorno] = useState<string | null>(null)
  const [selectedEsercizio, setSelectedEsercizio] = useState('')
  const [serie, setSerie] = useState('3')
  const [ripetizioni, setRipetizioni] = useState('8-12')
  const [recupero, setRecupero] = useState('90')
  const [noteEsercizio, setNoteEsercizio] = useState('')

  // Drag state
  const [dragging, setDragging] = useState<{ giornoId: string; eseId: string } | null>(null)
  const [dragOver, setDragOver] = useState<string | null>(null)
  const dragGhost = useRef<HTMLDivElement | null>(null)
  const dragNode = useRef<HTMLDivElement | null>(null)
  const pointerOffset = useRef({ x: 0, y: 0 })

  const fetchAll = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: profile } = await supabase.from('profiles').select('piano').eq('id', user.id).single()
    setPiano(profile?.piano ?? 'free')

    const { data: schedaData } = await supabase.from('schede').select('*').eq('id', schedaId).single()
    setScheda(schedaData); setEditNome(schedaData?.nome ?? ''); setEditDesc(schedaData?.descrizione ?? '')

    const { data: giorniData } = await supabase
      .from('scheda_giorni')
      .select(`id, nome, ordine, scheda_esercizi (
        id, esercizio_id, serie, ripetizioni, recupero_secondi, note, ordine,
        esercizi ( id, nome, muscoli )
      )`)
      .eq('scheda_id', schedaId).order('ordine')
    setGiorni((giorniData as any) ?? [])

    const { data: eserciziData } = await supabase
      .from('esercizi').select('id, nome, muscoli').eq('coach_id', user.id).order('nome')
    setEsercizi(eserciziData ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchAll() }, [schedaId])

  const limiteGiorni = PIANI[piano].max_giorni_per_scheda

  const handleSaveInfo = async () => {
    if (!editNome.trim()) return
    setSavingInfo(true)
    await supabase.from('schede').update({ nome: editNome.trim(), descrizione: editDesc.trim() || null }).eq('id', schedaId)
    setSavingInfo(false); setEditingInfo(false); fetchAll()
  }

  const handleAddGiorno = async () => {
    if (!newGiornoNome.trim()) return
    if (giorni.length >= limiteGiorni) {
      setPaywallMsg({
        titolo: 'Sblocca più giorni',
        descrizione: `Con il piano Free puoi avere massimo ${limiteGiorni} giorni per scheda. Passa a Pro per giorni illimitati.`,
      })
      setShowPaywall(true); return
    }
    setAddingGiorno(true)
    await supabase.from('scheda_giorni').insert({ scheda_id: schedaId, nome: newGiornoNome.trim(), ordine: giorni.length })
    setNewGiornoNome(''); setAddingGiorno(false); fetchAll()
  }

  const handleSaveGiornoNome = async (giornoId: string) => {
    if (!editGiornoNome.trim()) return
    await supabase.from('scheda_giorni').update({ nome: editGiornoNome.trim() }).eq('id', giornoId)
    setEditingGiornoId(null); fetchAll()
  }

  const handleDeleteGiorno = async (id: string, nome: string) => {
    if (!confirm(`Eliminare "${nome}" e tutti i suoi esercizi?`)) return
    await supabase.from('scheda_giorni').delete().eq('id', id); fetchAll()
  }

  const handleAddEsercizio = async (giornoId: string) => {
    if (!selectedEsercizio) return
    const ordine = giorni.find(g => g.id === giornoId)?.scheda_esercizi?.length ?? 0
    await supabase.from('scheda_esercizi').insert({
      giorno_id: giornoId, esercizio_id: selectedEsercizio,
      serie: parseInt(serie) || 3, ripetizioni: ripetizioni || '8-12',
      recupero_secondi: parseInt(recupero) || 90, note: noteEsercizio.trim() || null, ordine,
    })
    setSelectedEsercizio(''); setSerie('3'); setRipetizioni('8-12')
    setRecupero('90'); setNoteEsercizio(''); setAddingToGiorno(null); fetchAll()
  }

  const handleDeleteEsercizio = async (id: string) => {
    await supabase.from('scheda_esercizi').delete().eq('id', id); fetchAll()
  }

  // Drag & drop
  const saveOrdine = async (giornoId: string, ordinati: SchedaEsercizio[]) => {
    await Promise.all(ordinati.map((e, i) =>
      supabase.from('scheda_esercizi').update({ ordine: i }).eq('id', e.id)))
  }

  const reorder = (giornoId: string, fromId: string, toId: string) => {
    setGiorni(prev => prev.map(g => {
      if (g.id !== giornoId) return g
      const lista = [...g.scheda_esercizi].sort((a, b) => a.ordine - b.ordine)
      const fi = lista.findIndex(e => e.id === fromId)
      const ti = lista.findIndex(e => e.id === toId)
      if (fi === -1 || ti === -1 || fi === ti) return g
      const [moved] = lista.splice(fi, 1); lista.splice(ti, 0, moved)
      const aggiornati = lista.map((e, i) => ({ ...e, ordine: i }))
      saveOrdine(giornoId, aggiornati)
      return { ...g, scheda_esercizi: aggiornati }
    }))
  }

  const onDragStart = (e: React.DragEvent, giornoId: string, eseId: string) => {
    setDragging({ giornoId, eseId }); e.dataTransfer.effectAllowed = 'move'
    const ghost = document.createElement('div'); ghost.style.position = 'absolute'; ghost.style.top = '-9999px'
    document.body.appendChild(ghost); e.dataTransfer.setDragImage(ghost, 0, 0); dragGhost.current = ghost
  }
  const onDragOver = (e: React.DragEvent, eseId: string) => { e.preventDefault(); setDragOver(eseId) }
  const onDrop = (e: React.DragEvent, toId: string) => {
    e.preventDefault()
    if (dragging && dragging.eseId !== toId) reorder(dragging.giornoId, dragging.eseId, toId)
    endDrag()
  }
  const endDrag = () => {
    setDragging(null); setDragOver(null)
    if (dragGhost.current) { document.body.removeChild(dragGhost.current); dragGhost.current = null }
  }
  const onPointerDown = (e: React.PointerEvent, giornoId: string, eseId: string, el: HTMLDivElement) => {
    if (e.pointerType === 'mouse') return
    e.preventDefault()
    const rect = el.getBoundingClientRect()
    pointerOffset.current = { x: e.clientX - rect.left, y: e.clientY - rect.top }
    const clone = el.cloneNode(true) as HTMLDivElement
    clone.style.cssText = `position:fixed;z-index:9999;width:${rect.width}px;opacity:0.92;pointer-events:none;
      border-radius:12px;background:oklch(0.28 0 0);box-shadow:0 8px 32px oklch(0 0 0 / 60%);
      left:${rect.left}px;top:${rect.top}px;`
    document.body.appendChild(clone); dragGhost.current = clone; dragNode.current = el; el.style.opacity = '0.3'
    setDragging({ giornoId, eseId })
    const onMove = (me: PointerEvent) => {
      clone.style.left = `${me.clientX - pointerOffset.current.x}px`
      clone.style.top = `${me.clientY - pointerOffset.current.y}px`
      clone.style.display = 'none'
      const below = document.elementFromPoint(me.clientX, me.clientY)
      clone.style.display = ''
      const row = below?.closest('[data-eseid]') as HTMLElement | null
      if (row) setDragOver(row.dataset.eseid ?? null)
    }
    const onUp = (ue: PointerEvent) => {
      document.removeEventListener('pointermove', onMove); document.removeEventListener('pointerup', onUp)
      clone.style.display = 'none'
      const below = document.elementFromPoint(ue.clientX, ue.clientY); clone.style.display = ''
      const row = below?.closest('[data-eseid]') as HTMLElement | null
      const toId = row?.dataset.eseid
      if (toId && toId !== eseId) reorder(giornoId, eseId, toId)
      if (dragNode.current) dragNode.current.style.opacity = '1'
      document.body.removeChild(clone); dragGhost.current = null; dragNode.current = null
      setDragging(null); setDragOver(null)
    }
    document.addEventListener('pointermove', onMove); document.addEventListener('pointerup', onUp)
  }

  if (loading) return <div className="flex items-center justify-center min-h-64"><p className="text-sm" style={{ color: 'oklch(0.45 0 0)' }}>Caricamento...</p></div>

  return (
    <div className="space-y-8 max-w-3xl">
      {showPaywall && (
        <PaywallModal titolo={paywallMsg.titolo} descrizione={paywallMsg.descrizione} onClose={() => setShowPaywall(false)} />
      )}

      {/* Header */}
      <div className="space-y-3">
        <button onClick={() => router.push('/atleta/schede')}
          className="text-sm hover:opacity-70" style={{ color: 'oklch(0.50 0 0)' }}>
          ← Schede
        </button>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-3xl font-black tracking-tight" style={{ color: 'oklch(0.97 0 0)' }}>{scheda?.nome}</h1>
            {scheda?.descrizione && <p className="mt-1 text-sm" style={{ color: 'oklch(0.50 0 0)' }}>{scheda.descrizione}</p>}
          </div>
          <button onClick={() => setEditingInfo(true)}
            className="px-4 py-2.5 rounded-xl text-sm font-medium flex-shrink-0"
            style={{ background: 'oklch(0.22 0 0)', color: 'oklch(0.70 0 0)', border: '1px solid oklch(1 0 0 / 8%)' }}>
            <FontAwesomeIcon icon={faPen} /> Modifica
          </button>
        </div>
      </div>

      {/* Form modifica info */}
      {editingInfo && (
        <div className="rounded-2xl p-6 space-y-4"
          style={{ background: 'oklch(0.18 0 0)', border: '1px solid oklch(0.70 0.19 46 / 30%)' }}>
          <h2 className="font-bold" style={{ color: 'oklch(0.97 0 0)' }}>Modifica scheda</h2>
          {[
            { label: 'Nome', value: editNome, setter: setEditNome, type: 'input' },
            { label: 'Descrizione', value: editDesc, setter: setEditDesc, type: 'textarea' },
          ].map(f => (
            <div key={f.label} className="space-y-2">
              <label className="text-sm font-medium" style={{ color: 'oklch(0.80 0 0)' }}>{f.label}</label>
              {f.type === 'input'
                ? <input type="text" value={f.value} onChange={e => f.setter(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                    style={{ background: 'oklch(0.22 0 0)', border: '1px solid oklch(1 0 0 / 8%)', color: 'oklch(0.97 0 0)' }}
                    onFocus={e => e.target.style.borderColor = 'oklch(0.70 0.19 46)'}
                    onBlur={e => e.target.style.borderColor = 'oklch(1 0 0 / 8%)'} />
                : <textarea value={f.value} onChange={e => f.setter(e.target.value)} rows={2}
                    className="w-full px-4 py-3 rounded-xl text-sm outline-none resize-none"
                    style={{ background: 'oklch(0.22 0 0)', border: '1px solid oklch(1 0 0 / 8%)', color: 'oklch(0.97 0 0)' }}
                    onFocus={e => e.target.style.borderColor = 'oklch(0.70 0.19 46)'}
                    onBlur={e => e.target.style.borderColor = 'oklch(1 0 0 / 8%)'} />}
            </div>
          ))}
          <div className="flex gap-3">
            <button onClick={handleSaveInfo} disabled={savingInfo}
              className="px-6 py-2.5 rounded-xl text-sm font-semibold"
              style={{ background: 'oklch(0.70 0.19 46)', color: 'oklch(0.13 0 0)' }}>
              {savingInfo ? 'Salvataggio...' : 'Salva'}
            </button>
            <button onClick={() => setEditingInfo(false)}
              className="px-6 py-2.5 rounded-xl text-sm font-medium"
              style={{ background: 'oklch(0.22 0 0)', color: 'oklch(0.60 0 0)', border: '1px solid oklch(1 0 0 / 8%)' }}>
              Annulla
            </button>
          </div>
        </div>
      )}

      {/* Aggiungi giorno */}
      <div className="rounded-2xl p-5 space-y-4" style={{ background: 'oklch(0.18 0 0)', border: '1px solid oklch(1 0 0 / 6%)' }}>
        <div className="flex items-center justify-between">
          <h2 className="font-bold" style={{ color: 'oklch(0.97 0 0)' }}>Aggiungi un giorno</h2>
          <span className="text-xs px-2.5 py-1 rounded-full"
            style={{
              background: giorni.length >= limiteGiorni && piano === 'free' ? 'oklch(0.70 0.19 46 / 15%)' : 'oklch(0.22 0 0)',
              color: giorni.length >= limiteGiorni && piano === 'free' ? 'oklch(0.70 0.19 46)' : 'oklch(0.45 0 0)',
            }}>
            {giorni.length}/{limiteGiorni === Infinity ? '∞' : limiteGiorni} giorni
          </span>
        </div>
        <div className="flex gap-3">
          <input type="text" value={newGiornoNome} onChange={e => setNewGiornoNome(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAddGiorno()}
            placeholder='es. "Push Day", "Full Body"'
            className="flex-1 px-4 py-3 rounded-xl text-sm outline-none"
            style={{ background: 'oklch(0.22 0 0)', border: '1px solid oklch(1 0 0 / 8%)', color: 'oklch(0.97 0 0)' }}
            onFocus={e => e.target.style.borderColor = 'oklch(0.70 0.19 46)'}
            onBlur={e => e.target.style.borderColor = 'oklch(1 0 0 / 8%)'} />
          <button onClick={handleAddGiorno} disabled={addingGiorno || !newGiornoNome.trim()}
            className="px-4 py-3 rounded-xl text-sm font-semibold flex items-center gap-2"
            style={{
              background: giorni.length >= limiteGiorni ? 'oklch(0.22 0 0)' : 'oklch(0.70 0.19 46)',
              color: giorni.length >= limiteGiorni ? 'oklch(0.50 0 0)' : 'oklch(0.13 0 0)',
            }}>
            {giorni.length >= limiteGiorni ? <FontAwesomeIcon icon={faLock} /> : <FontAwesomeIcon icon={faPlus} />}
            Aggiungi
          </button>
        </div>
      </div>

      {/* Giorni */}
      {giorni.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-4xl mb-3"><FontAwesomeIcon icon={faCalendarDays} /></p>
          <p className="font-semibold" style={{ color: 'oklch(0.97 0 0)' }}>Nessun giorno ancora</p>
          <p className="text-sm mt-1" style={{ color: 'oklch(0.45 0 0)' }}>Aggiungi il primo giorno qui sopra</p>
        </div>
      ) : (
        <div className="space-y-6">
          {giorni.map((giorno) => (
            <div key={giorno.id} className="rounded-2xl overflow-hidden"
              style={{ background: 'oklch(0.18 0 0)', border: '1px solid oklch(1 0 0 / 6%)' }}>
              {/* Header giorno */}
              <div className="px-6 py-4 flex items-center justify-between"
                style={{ borderBottom: '1px solid oklch(1 0 0 / 6%)' }}>
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0"
                    style={{ background: 'oklch(0.70 0.19 46 / 15%)', color: 'oklch(0.70 0.19 46)' }}>
                    {giorno.ordine + 1}
                  </div>
                  {editingGiornoId === giorno.id ? (
                    <div className="flex items-center gap-2 flex-1">
                      <input value={editGiornoNome} onChange={e => setEditGiornoNome(e.target.value)} autoFocus
                        onKeyDown={e => { if (e.key === 'Enter') handleSaveGiornoNome(giorno.id); if (e.key === 'Escape') setEditingGiornoId(null) }}
                        className="flex-1 px-3 py-1.5 rounded-lg text-sm font-bold outline-none"
                        style={{ background: 'oklch(0.22 0 0)', border: '1px solid oklch(0.70 0.19 46)', color: 'oklch(0.97 0 0)' }} />
                      <button onClick={() => handleSaveGiornoNome(giorno.id)}
                        className="w-8 h-8 rounded-lg flex items-center justify-center"
                        style={{ background: 'oklch(0.70 0.19 46)', color: 'oklch(0.13 0 0)' }}>
                        <FontAwesomeIcon icon={faCheck} />
                      </button>
                    </div>
                  ) : (
                    <h3 className="font-bold truncate" style={{ color: 'oklch(0.97 0 0)' }}>{giorno.nome}</h3>
                  )}
                </div>
                {editingGiornoId !== giorno.id && (
                  <div className="flex gap-1.5 flex-shrink-0">
                    <button onClick={() => { setEditingGiornoId(giorno.id); setEditGiornoNome(giorno.nome) }}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-sm"
                      style={{ background: 'oklch(0.22 0 0)', color: 'oklch(0.60 0 0)', border: '1px solid oklch(1 0 0 / 8%)' }}>
                      <FontAwesomeIcon icon={faPen} />
                    </button>
                    <button onClick={() => setAddingToGiorno(addingToGiorno === giorno.id ? null : giorno.id)}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold"
                      style={{ background: 'oklch(0.70 0.19 46 / 15%)', color: 'oklch(0.70 0.19 46)', border: '1px solid oklch(0.70 0.19 46 / 30%)' }}>
                      <FontAwesomeIcon icon={faPlus} />
                    </button>
                    <button onClick={() => handleDeleteGiorno(giorno.id, giorno.nome)}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-sm"
                      style={{ background: 'oklch(0.65 0.22 27 / 15%)', color: 'oklch(0.75 0.15 27)', border: '1px solid oklch(0.65 0.22 27 / 20%)' }}>
                      ✕
                    </button>
                  </div>
                )}
              </div>

              {/* Form aggiungi esercizio */}
              {addingToGiorno === giorno.id && (
                <div className="px-6 py-5 space-y-4"
                  style={{ background: 'oklch(0.15 0 0)', borderBottom: '1px solid oklch(1 0 0 / 6%)' }}>
                  <h4 className="font-semibold text-sm" style={{ color: 'oklch(0.70 0.19 46)' }}>
                    Aggiungi esercizio a "{giorno.nome}"
                  </h4>
                  <select value={selectedEsercizio} onChange={e => setSelectedEsercizio(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                    style={{ background: 'oklch(0.22 0 0)', border: '1px solid oklch(1 0 0 / 8%)', color: selectedEsercizio ? 'oklch(0.97 0 0)' : 'oklch(0.45 0 0)' }}>
                    <option value="">Seleziona un esercizio...</option>
                    {esercizi.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
                  </select>
                  {esercizi.length === 0 && (
                    <p className="text-xs" style={{ color: 'oklch(0.50 0 0)' }}>
                      Nessun esercizio nella libreria.{' '}
                      <a href="/atleta/esercizi" style={{ color: 'oklch(0.70 0.19 46)' }}>Creane uno →</a>
                    </p>
                  )}
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: 'Serie', value: serie, setter: setSerie, placeholder: '3' },
                      { label: 'Ripetizioni', value: ripetizioni, setter: setRipetizioni, placeholder: '8-12' },
                      { label: 'Recupero (sec)', value: recupero, setter: setRecupero, placeholder: '90' },
                    ].map(f => (
                      <div key={f.label} className="space-y-1.5">
                        <label className="text-xs font-medium" style={{ color: 'oklch(0.70 0 0)' }}>{f.label}</label>
                        <input type="text" value={f.value} onChange={e => f.setter(e.target.value)}
                          placeholder={f.placeholder} className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                          style={{ background: 'oklch(0.22 0 0)', border: '1px solid oklch(1 0 0 / 8%)', color: 'oklch(0.97 0 0)' }}
                          onFocus={e => e.target.style.borderColor = 'oklch(0.70 0.19 46)'}
                          onBlur={e => e.target.style.borderColor = 'oklch(1 0 0 / 8%)'} />
                      </div>
                    ))}
                  </div>
                  <input type="text" value={noteEsercizio} onChange={e => setNoteEsercizio(e.target.value)}
                    placeholder="Note (opzionale)" className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                    style={{ background: 'oklch(0.22 0 0)', border: '1px solid oklch(1 0 0 / 8%)', color: 'oklch(0.97 0 0)' }}
                    onFocus={e => e.target.style.borderColor = 'oklch(0.70 0.19 46)'}
                    onBlur={e => e.target.style.borderColor = 'oklch(1 0 0 / 8%)'} />
                  <div className="flex gap-3">
                    <button onClick={() => handleAddEsercizio(giorno.id)} disabled={!selectedEsercizio}
                      className="px-5 py-2.5 rounded-xl text-sm font-semibold"
                      style={{ background: !selectedEsercizio ? 'oklch(0.35 0 0)' : 'oklch(0.70 0.19 46)', color: 'oklch(0.13 0 0)' }}>
                      Aggiungi
                    </button>
                    <button onClick={() => setAddingToGiorno(null)}
                      className="px-5 py-2.5 rounded-xl text-sm font-medium"
                      style={{ background: 'oklch(0.22 0 0)', color: 'oklch(0.60 0 0)', border: '1px solid oklch(1 0 0 / 8%)' }}>
                      Annulla
                    </button>
                  </div>
                </div>
              )}

              {/* Lista esercizi */}
              {(giorno.scheda_esercizi?.length ?? 0) === 0 ? (
                <div className="px-6 py-8 text-center">
                  <p className="text-sm" style={{ color: 'oklch(0.40 0 0)' }}>Nessun esercizio. Clicca + per aggiungerne uno.</p>
                </div>
              ) : (
                <div>
                  {giorno.scheda_esercizi.sort((a, b) => a.ordine - b.ordine).map((se, i) => {
                    const isDraggingThis = dragging?.eseId === se.id
                    const isDragTarget = dragOver === se.id && dragging?.eseId !== se.id
                    return (
                      <div key={se.id} data-eseid={se.id} draggable
                        onDragStart={e => onDragStart(e, giorno.id, se.id)}
                        onDragOver={e => onDragOver(e, se.id)}
                        onDrop={e => onDrop(e, se.id)}
                        onDragEnd={endDrag}
                        className="flex items-center gap-4 px-6 py-4 group transition-all duration-150"
                        style={{
                          borderBottom: i < giorno.scheda_esercizi.length - 1 ? '1px solid oklch(1 0 0 / 4%)' : 'none',
                          opacity: isDraggingThis ? 0.35 : 1,
                          background: isDragTarget ? 'oklch(0.70 0.19 46 / 8%)' : 'transparent',
                          borderTop: isDragTarget ? '2px solid oklch(0.70 0.19 46 / 60%)' : undefined,
                        }}>
                        <div className="flex-shrink-0 cursor-grab active:cursor-grabbing touch-none select-none"
                          style={{ color: 'oklch(0.35 0 0)', padding: '4px' }}
                          ref={el => {
                            if (!el) return
                            el.onpointerdown = e => {
                              const row = el.closest('[data-eseid]') as HTMLDivElement
                              onPointerDown(e as any, giorno.id, se.id, row)
                            }
                          }}>
                          <FontAwesomeIcon icon={faGripVertical} />
                        </div>
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0"
                          style={{ background: 'oklch(0.22 0 0)', color: 'oklch(0.55 0 0)' }}>{i + 1}</div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm" style={{ color: 'oklch(0.97 0 0)' }}>{se.esercizi?.nome}</p>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            {[`${se.serie} serie`, `${se.ripetizioni} reps`, `${se.recupero_secondi}s recupero`].map(t => (
                              <span key={t} className="text-xs px-2 py-0.5 rounded"
                                style={{ background: 'oklch(0.22 0 0)', color: 'oklch(0.60 0 0)' }}>{t}</span>
                            ))}
                          </div>
                          {se.note && <p className="text-xs mt-1 italic" style={{ color: 'oklch(0.45 0 0)' }}><FontAwesomeIcon icon={faNoteSticky} /> {se.note}</p>}
                        </div>
                        <div className="flex flex-wrap gap-1 max-w-28 hidden sm:flex">
                          {se.esercizi?.muscoli?.slice(0, 2).map(m => (
                            <span key={m} className="text-xs px-2 py-0.5 rounded-full"
                              style={{ background: 'oklch(0.60 0.15 200 / 15%)', color: 'oklch(0.60 0.15 200)' }}>{m}</span>
                          ))}
                        </div>
                        <button onClick={() => handleDeleteEsercizio(se.id)}
                          className="lg:opacity-0 lg:group-hover:opacity-100 w-8 h-8 rounded-lg flex items-center justify-center text-xs transition-all flex-shrink-0"
                          style={{ background: 'oklch(0.65 0.22 27 / 15%)', color: 'oklch(0.75 0.15 27)' }}>
                          <FontAwesomeIcon icon={faTrash} />
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
