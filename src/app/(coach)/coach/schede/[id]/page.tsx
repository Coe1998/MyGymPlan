'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCircleCheck, faUser, faPen, faTriangleExclamation, faCalendarDays, faNoteSticky, faXmark, faGripVertical, faFilePdf, faUpload, faTrash } from '@fortawesome/free-solid-svg-icons'

interface Esercizio { id: string; nome: string; muscoli: string[] | null }
interface SchedaEsercizio {
  id: string; esercizio_id: string; serie: number; ripetizioni: string
  recupero_secondi: number; note: string | null; ordine: number; esercizi: Esercizio
}
interface Giorno { id: string; nome: string; ordine: number; scheda_esercizi: SchedaEsercizio[] }
interface Scheda { id: string; nome: string; descrizione: string | null; is_template: boolean }
interface Cliente { cliente_id: string; profiles: { id: string; full_name: string | null } }
interface Assegnazione {
  id: string; data_inizio: string; data_fine: string | null; attiva: boolean
  pdf_alimentare_url: string | null
  profiles: { full_name: string | null }
}

export default function SchedaDetailPage() {
  const params = useParams()
  const router = useRouter()
  const schedaId = params.id as string
  const supabase = createClient()

  const [scheda, setScheda] = useState<Scheda | null>(null)
  const [giorni, setGiorni] = useState<Giorno[]>([])
  const [esercizi, setEsercizi] = useState<Esercizio[]>([])
  const [loading, setLoading] = useState(true)
  const [editingInfo, setEditingInfo] = useState(false)
  const [editNome, setEditNome] = useState('')
  const [editDescrizione, setEditDescrizione] = useState('')
  const [savingInfo, setSavingInfo] = useState(false)
  const [editingGiornoId, setEditingGiornoId] = useState<string | null>(null)
  const [editGiornoNome, setEditGiornoNome] = useState('')
  const [newGiornoNome, setNewGiornoNome] = useState('')
  const [addingGiorno, setAddingGiorno] = useState(false)
  const [addingToGiorno, setAddingToGiorno] = useState<string | null>(null)
  const [selectedEsercizio, setSelectedEsercizio] = useState('')
  const [filtroMuscolo, setFiltroMuscolo] = useState<string>('')
  const [searchEsercizio, setSearchEsercizio] = useState('')
  const [serie, setSerie] = useState('3')
  const [ripetizioni, setRipetizioni] = useState('8-12')
  const [recupero, setRecupero] = useState('90')
  const [noteEsercizio, setNoteEsercizio] = useState('')
  const [clienti, setClienti] = useState<Cliente[]>([])
  const [assegnazioni, setAssegnazioni] = useState<Assegnazione[]>([])
  const [showFormAssegna, setShowFormAssegna] = useState(false)
  const [selectedClienti, setSelectedClienti] = useState<string[]>([])
  const [dataInizio, setDataInizio] = useState(new Date().toISOString().split('T')[0])
  const [dataFine, setDataFine] = useState('')
  const [assegnando, setAssegnando] = useState(false)
  const [assegnaError, setAssegnaError] = useState<string | null>(null)
  const [uploadingPdf, setUploadingPdf] = useState<string | null>(null) // assegnazione id in corso
  const pdfInputRef = useRef<HTMLInputElement>(null)
  const pdfTargetAssId = useRef<string | null>(null)

  // Drag & drop state
  const [dragging, setDragging] = useState<{ giornoId: string; eseId: string } | null>(null)
  const [dragOver, setDragOver] = useState<string | null>(null) // eseId target
  const dragNode = useRef<HTMLDivElement | null>(null)
  const dragGhost = useRef<HTMLDivElement | null>(null)
  const pointerOffset = useRef({ x: 0, y: 0 })

  const fetchAll = async () => {
    setLoading(true)
    const { data: schedaData } = await supabase.from('schede').select('*').eq('id', schedaId).single()
    setScheda(schedaData)
    setEditNome(schedaData?.nome ?? '')
    setEditDescrizione(schedaData?.descrizione ?? '')

    const { data: giorniData } = await supabase
      .from('scheda_giorni')
      .select(`id, nome, ordine, scheda_esercizi (
        id, esercizio_id, serie, ripetizioni, recupero_secondi, note, ordine,
        esercizi ( id, nome, muscoli )
      )`)
      .eq('scheda_id', schedaId).order('ordine')
    setGiorni((giorniData as any) ?? [])

    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: eserciziData } = await supabase
        .from('esercizi').select('id, nome, muscoli').eq('coach_id', user.id).order('nome')
      setEsercizi(eserciziData ?? [])

      const { data: clientiData } = await supabase
        .from('coach_clienti')
        .select('cliente_id, profiles!coach_clienti_cliente_id_fkey (id, full_name)')
        .eq('coach_id', user.id)
      setClienti((clientiData as any) ?? [])

      const { data: assegnazioniData } = await supabase
        .from('assegnazioni')
        .select('id, data_inizio, data_fine, attiva, pdf_alimentare_url, profiles!assegnazioni_cliente_id_fkey (full_name)')
        .eq('scheda_id', schedaId)
        .order('created_at', { ascending: false })
      setAssegnazioni((assegnazioniData as any) ?? [])
    }
    setLoading(false)
  }

  useEffect(() => { fetchAll() }, [schedaId])

  const handleSaveInfo = async () => {
    if (!editNome.trim()) return
    setSavingInfo(true)
    await supabase.from('schede').update({ nome: editNome.trim(), descrizione: editDescrizione.trim() || null }).eq('id', schedaId)
    setSavingInfo(false); setEditingInfo(false); fetchAll()
  }

  const handleSaveGiornoNome = async (giornoId: string) => {
    if (!editGiornoNome.trim()) return
    await supabase.from('scheda_giorni').update({ nome: editGiornoNome.trim() }).eq('id', giornoId)
    setEditingGiornoId(null); fetchAll()
  }

  const handleAddGiorno = async () => {
    if (!newGiornoNome.trim()) return
    setAddingGiorno(true)
    await supabase.from('scheda_giorni').insert({ scheda_id: schedaId, nome: newGiornoNome.trim(), ordine: giorni.length })
    setNewGiornoNome(''); setAddingGiorno(false); fetchAll()
  }

  const handleDeleteGiorno = async (giornoId: string, nome: string) => {
    if (!confirm(`Vuoi eliminare "${nome}" e tutti i suoi esercizi?`)) return
    await supabase.from('scheda_giorni').delete().eq('id', giornoId); fetchAll()
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

  const handleAssegna = async () => {
    if (selectedClienti.length === 0) return
    setAssegnando(true); setAssegnaError(null)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    for (const clienteId of selectedClienti) {
      await supabase.from('assegnazioni').update({ attiva: false })
        .eq('scheda_id', schedaId).eq('cliente_id', clienteId).eq('attiva', true)
      await supabase.from('assegnazioni').insert({
        scheda_id: schedaId, cliente_id: clienteId, coach_id: user.id,
        data_inizio: dataInizio, data_fine: dataFine || null, attiva: true,
      })
    }
    setSelectedClienti([]); setDataFine(''); setShowFormAssegna(false); setAssegnando(false); fetchAll()
  }

  const handleRimuoviAssegnazione = async (id: string) => {
    if (!confirm('Vuoi rimuovere questa assegnazione?')) return
    await supabase.from('assegnazioni').delete().eq('id', id); fetchAll()
  }

  // ── PDF Alimentare ───────────────────────────────────────────────
  const handleUploadPdf = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const assId = pdfTargetAssId.current
    if (!assId || !e.target.files?.[0]) return
    const file = e.target.files[0]
    if (file.type !== 'application/pdf') { alert('Carica un file PDF'); return }
    if (file.size > 10 * 1024 * 1024) { alert('Il PDF non può superare 10MB'); return }

    setUploadingPdf(assId)
    // Rimuovi eventuale PDF precedente
    const assCorrente = assegnazioni.find(a => a.id === assId)
    if (assCorrente?.pdf_alimentare_url) {
      const path = `${assId}.pdf`
      await supabase.storage.from('alimentari').remove([path])
    }

    const path = `${assId}.pdf`
    const { error: uploadError } = await supabase.storage.from('alimentari').upload(path, file, { upsert: true })
    if (uploadError) { alert('Errore upload PDF'); setUploadingPdf(null); return }

    const { data: urlData } = supabase.storage.from('alimentari').getPublicUrl(path)
    await supabase.from('assegnazioni').update({ pdf_alimentare_url: urlData.publicUrl }).eq('id', assId)

    setUploadingPdf(null)
    pdfTargetAssId.current = null
    if (pdfInputRef.current) pdfInputRef.current.value = ''
    fetchAll()
  }

  const handleDeletePdf = async (assId: string) => {
    if (!confirm('Vuoi rimuovere la scheda alimentare?')) return
    await supabase.storage.from('alimentari').remove([`${assId}.pdf`])
    await supabase.from('assegnazioni').update({ pdf_alimentare_url: null }).eq('id', assId)
    fetchAll()
  }

  // ── Drag & drop helpers ──────────────────────────────────────────
  const saveOrdine = async (giornoId: string, ordinati: SchedaEsercizio[]) => {
    await Promise.all(
      ordinati.map((ese, i) =>
        supabase.from('scheda_esercizi').update({ ordine: i }).eq('id', ese.id)
      )
    )
  }

  const reorderInGiorno = (giornoId: string, fromId: string, toId: string) => {
    setGiorni(prev => prev.map(g => {
      if (g.id !== giornoId) return g
      const lista = [...g.scheda_esercizi].sort((a, b) => a.ordine - b.ordine)
      const fromIdx = lista.findIndex(e => e.id === fromId)
      const toIdx = lista.findIndex(e => e.id === toId)
      if (fromIdx === -1 || toIdx === -1 || fromIdx === toIdx) return g
      const [moved] = lista.splice(fromIdx, 1)
      lista.splice(toIdx, 0, moved)
      const aggiornati = lista.map((e, i) => ({ ...e, ordine: i }))
      saveOrdine(giornoId, aggiornati)
      return { ...g, scheda_esercizi: aggiornati }
    }))
  }

  const onDragStart = (e: React.DragEvent, giornoId: string, eseId: string) => {
    setDragging({ giornoId, eseId })
    e.dataTransfer.effectAllowed = 'move'
    // ghost trasparente
    const ghost = document.createElement('div')
    ghost.style.position = 'absolute'; ghost.style.top = '-9999px'
    document.body.appendChild(ghost)
    e.dataTransfer.setDragImage(ghost, 0, 0)
    dragGhost.current = ghost
  }

  const onDragOver = (e: React.DragEvent, eseId: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOver(eseId)
  }

  const onDrop = (e: React.DragEvent, toId: string) => {
    e.preventDefault()
    if (!dragging || dragging.eseId === toId) { endDrag(); return }
    reorderInGiorno(dragging.giornoId, dragging.eseId, toId)
    endDrag()
  }

  const endDrag = () => {
    setDragging(null); setDragOver(null)
    if (dragGhost.current) { document.body.removeChild(dragGhost.current); dragGhost.current = null }
  }

  // Touch / pointer drag
  const onPointerDown = (e: React.PointerEvent, giornoId: string, eseId: string, el: HTMLDivElement) => {
    if (e.pointerType === 'mouse') return // handled by HTML5 drag
    e.preventDefault()
    const rect = el.getBoundingClientRect()
    pointerOffset.current = { x: e.clientX - rect.left, y: e.clientY - rect.top }

    const clone = el.cloneNode(true) as HTMLDivElement
    clone.style.cssText = `position:fixed;z-index:9999;width:${rect.width}px;opacity:0.92;pointer-events:none;
      border-radius:12px;background:oklch(0.28 0 0);box-shadow:0 8px 32px oklch(0 0 0 / 60%);
      left:${rect.left}px;top:${rect.top}px;`
    document.body.appendChild(clone)
    dragGhost.current = clone
    dragNode.current = el
    el.style.opacity = '0.3'
    setDragging({ giornoId, eseId })

    const onMove = (me: PointerEvent) => {
      clone.style.left = `${me.clientX - pointerOffset.current.x}px`
      clone.style.top = `${me.clientY - pointerOffset.current.y}px`
      // trova elemento sotto
      clone.style.display = 'none'
      const below = document.elementFromPoint(me.clientX, me.clientY)
      clone.style.display = ''
      const row = below?.closest('[data-eseid]') as HTMLElement | null
      if (row) setDragOver(row.dataset.eseid ?? null)
    }
    const onUp = (ue: PointerEvent) => {
      document.removeEventListener('pointermove', onMove)
      document.removeEventListener('pointerup', onUp)
      clone.style.display = 'none'
      const below = document.elementFromPoint(ue.clientX, ue.clientY)
      clone.style.display = ''
      const row = below?.closest('[data-eseid]') as HTMLElement | null
      const toId = row?.dataset.eseid
      if (toId && toId !== eseId) reorderInGiorno(giornoId, eseId, toId)
      if (dragNode.current) dragNode.current.style.opacity = '1'
      document.body.removeChild(clone)
      dragGhost.current = null; dragNode.current = null
      setDragging(null); setDragOver(null)
    }
    document.addEventListener('pointermove', onMove)
    document.addEventListener('pointerup', onUp)
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-64">
      <p className="text-sm" style={{ color: 'oklch(0.45 0 0)' }}>Caricamento...</p>
    </div>
  )

  const assegnazioniAttive = assegnazioni.filter(a => a.attiva)

  return (
    <div className="space-y-8 max-w-5xl">
      {/* Input PDF nascosto */}
      <input
        ref={pdfInputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={handleUploadPdf}
      />
      {/* Header */}
		<div className="space-y-3">
		  <button onClick={() => router.push('/coach/schede')}
			className="text-sm transition-opacity hover:opacity-70" style={{ color: 'oklch(0.50 0 0)' }}>
			← Schede
		  </button>
		  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
			<div>
			  <div className="flex items-center gap-3 flex-wrap">
				<h1 className="text-3xl lg:text-4xl font-black tracking-tight" style={{ color: 'oklch(0.97 0 0)' }}>
				  {scheda?.nome}
				</h1>
				{assegnazioniAttive.length > 0 && (
				  <span className="text-xs px-2.5 py-1 rounded-full font-medium"
					style={{ background: 'oklch(0.65 0.18 150 / 15%)', color: 'oklch(0.65 0.18 150)' }}>
					<FontAwesomeIcon icon={faCircleCheck} /> {assegnazioniAttive.length === 1 ? '1 cliente' : `${assegnazioniAttive.length} clienti`}
				  </span>
				)}
			  </div>
			  {scheda?.descrizione && (
				<p className="mt-1 text-sm" style={{ color: 'oklch(0.50 0 0)' }}>{scheda.descrizione}</p>
			  )}
			</div>
			<div className="flex gap-2 flex-shrink-0">
			  <button onClick={() => setShowFormAssegna(!showFormAssegna)}
				className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-95"
				style={{ background: 'oklch(0.70 0.19 46)', color: 'oklch(0.13 0 0)' }}>
				<FontAwesomeIcon icon={faUser} /> Assegna
			  </button>
			  <button onClick={() => setEditingInfo(true)}
				className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
				style={{ background: 'oklch(0.22 0 0)', color: 'oklch(0.70 0 0)', border: '1px solid oklch(1 0 0 / 8%)' }}>
				<FontAwesomeIcon icon={faPen} /> Modifica
			  </button>
			</div>
		  </div>
		</div>

      {/* Form modifica info */}
      {editingInfo && (
        <div className="rounded-2xl p-6 space-y-4"
          style={{ background: 'oklch(0.18 0 0)', border: '1px solid oklch(0.70 0.19 46 / 30%)' }}>
          <h2 className="font-bold" style={{ color: 'oklch(0.97 0 0)' }}>Modifica scheda</h2>
          <div className="space-y-2">
            <label className="text-sm font-medium" style={{ color: 'oklch(0.80 0 0)' }}>Nome</label>
            <input type="text" value={editNome} onChange={(e) => setEditNome(e.target.value)}
              className="w-full px-4 py-3 rounded-xl text-sm outline-none"
              style={{ background: 'oklch(0.22 0 0)', border: '1px solid oklch(1 0 0 / 8%)', color: 'oklch(0.97 0 0)' }}
              onFocus={(e) => e.target.style.borderColor = 'oklch(0.70 0.19 46)'}
              onBlur={(e) => e.target.style.borderColor = 'oklch(1 0 0 / 8%)'} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium" style={{ color: 'oklch(0.80 0 0)' }}>Descrizione</label>
            <textarea value={editDescrizione} onChange={(e) => setEditDescrizione(e.target.value)}
              rows={3} className="w-full px-4 py-3 rounded-xl text-sm outline-none resize-none"
              style={{ background: 'oklch(0.22 0 0)', border: '1px solid oklch(1 0 0 / 8%)', color: 'oklch(0.97 0 0)' }}
              onFocus={(e) => e.target.style.borderColor = 'oklch(0.70 0.19 46)'}
              onBlur={(e) => e.target.style.borderColor = 'oklch(1 0 0 / 8%)'} />
          </div>
          <div className="flex gap-3">
            <button onClick={handleSaveInfo} disabled={savingInfo}
              className="px-6 py-2.5 rounded-xl text-sm font-semibold"
              style={{ background: 'oklch(0.70 0.19 46)', color: 'oklch(0.13 0 0)' }}>
              {savingInfo ? 'Salvataggio...' : 'Salva'}
            </button>
            <button onClick={() => { setEditingInfo(false); setEditNome(scheda?.nome ?? ''); setEditDescrizione(scheda?.descrizione ?? '') }}
              className="px-6 py-2.5 rounded-xl text-sm font-medium"
              style={{ background: 'oklch(0.22 0 0)', color: 'oklch(0.60 0 0)', border: '1px solid oklch(1 0 0 / 8%)' }}>
              Annulla
            </button>
          </div>
        </div>
      )}

      {/* Sezione assegnazioni — SEMPRE VISIBILE */}
      <div className="rounded-2xl overflow-hidden"
        style={{ background: 'oklch(0.18 0 0)', border: `1px solid ${assegnazioniAttive.length > 0 ? 'oklch(0.65 0.18 150 / 30%)' : 'oklch(1 0 0 / 6%)'}` }}>
        <div className="px-6 py-4 flex items-center justify-between"
          style={{ borderBottom: '1px solid oklch(1 0 0 / 6%)' }}>
          <div className="flex items-center gap-3">
            <h2 className="font-bold" style={{ color: 'oklch(0.97 0 0)' }}>Clienti assegnati</h2>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full"
              style={{
                background: assegnazioniAttive.length > 0 ? 'oklch(0.65 0.18 150 / 15%)' : 'oklch(0.22 0 0)',
                color: assegnazioniAttive.length > 0 ? 'oklch(0.65 0.18 150)' : 'oklch(0.45 0 0)',
              }}>
              {assegnazioniAttive.length} attive
            </span>
          </div>
          <button onClick={() => setShowFormAssegna(!showFormAssegna)}
            className="px-4 py-2 rounded-xl text-sm font-semibold transition-all active:scale-95"
            style={{ background: 'oklch(0.70 0.19 46)', color: 'oklch(0.13 0 0)' }}>
            + Assegna
          </button>
        </div>

        {/* Form aggiunta assegnazione */}
        {showFormAssegna && (
          <div className="px-6 py-5 space-y-4" style={{ borderBottom: '1px solid oklch(1 0 0 / 6%)', background: 'oklch(0.15 0 0)' }}>
            <h3 className="font-semibold text-sm" style={{ color: 'oklch(0.70 0.19 46)' }}>Nuova assegnazione</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2 md:col-span-1">
                <label className="text-sm font-medium" style={{ color: 'oklch(0.80 0 0)' }}>
                  Clienti
                  {selectedClienti.length > 0 && (
                    <span className="ml-2 text-xs px-2 py-0.5 rounded-full"
                      style={{ background: 'oklch(0.70 0.19 46 / 15%)', color: 'oklch(0.70 0.19 46)' }}>
                      {selectedClienti.length} selezionati
                    </span>
                  )}
                </label>
                <div className="rounded-xl overflow-hidden max-h-40 overflow-y-auto"
                  style={{ border: '1px solid oklch(1 0 0 / 8%)', background: 'oklch(0.22 0 0)' }}>
                  {clienti.length === 0 ? (
                    <p className="px-4 py-3 text-sm" style={{ color: 'oklch(0.45 0 0)' }}>Nessun cliente</p>
                  ) : clienti.map((c, i) => {
                    const isSelected = selectedClienti.includes(c.cliente_id)
                    return (
                      <button key={c.cliente_id}
                        onClick={() => setSelectedClienti(prev =>
                          isSelected ? prev.filter(id => id !== c.cliente_id) : [...prev, c.cliente_id]
                        )}
                        className="w-full flex items-center gap-3 px-4 py-3 text-left transition-all"
                        style={{
                          background: isSelected ? 'oklch(0.70 0.19 46 / 12%)' : 'transparent',
                          borderBottom: i < clienti.length - 1 ? '1px solid oklch(1 0 0 / 5%)' : 'none',
                        }}>
                        <div className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0"
                          style={{
                            background: isSelected ? 'oklch(0.70 0.19 46)' : 'oklch(0.30 0 0)',
                            border: isSelected ? 'none' : '1px solid oklch(1 0 0 / 15%)',
                          }}>
                          {isSelected && <span className="text-xs font-bold" style={{ color: 'oklch(0.11 0 0)' }}>✓</span>}
                        </div>
                        <span className="text-sm" style={{ color: isSelected ? 'oklch(0.97 0 0)' : 'oklch(0.75 0 0)' }}>
                          {c.profiles?.full_name}
                        </span>
                      </button>
                    )
                  })}
                </div>
                {clienti.length > 1 && (
                  <button
                    onClick={() => setSelectedClienti(
                      selectedClienti.length === clienti.length ? [] : clienti.map(c => c.cliente_id)
                    )}
                    className="mt-2 text-xs font-medium"
                    style={{ color: 'oklch(0.70 0.19 46)' }}>
                    {selectedClienti.length === clienti.length ? 'Deseleziona tutti' : 'Seleziona tutti'}
                  </button>
                )}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium" style={{ color: 'oklch(0.80 0 0)' }}>Data inizio</label>
                <input type="date" value={dataInizio} onChange={(e) => setDataInizio(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                  style={{ background: 'oklch(0.22 0 0)', border: '1px solid oklch(1 0 0 / 8%)', color: 'oklch(0.97 0 0)', colorScheme: 'dark' }}
                  onFocus={(e) => e.target.style.borderColor = 'oklch(0.70 0.19 46)'}
                  onBlur={(e) => e.target.style.borderColor = 'oklch(1 0 0 / 8%)'} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium" style={{ color: 'oklch(0.80 0 0)' }}>
                  Data fine <span style={{ color: 'oklch(0.45 0 0)' }}>(opzionale)</span>
                </label>
                <input type="date" value={dataFine} onChange={(e) => setDataFine(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                  style={{ background: 'oklch(0.22 0 0)', border: '1px solid oklch(1 0 0 / 8%)', color: 'oklch(0.97 0 0)', colorScheme: 'dark' }}
                  onFocus={(e) => e.target.style.borderColor = 'oklch(0.70 0.19 46)'}
                  onBlur={(e) => e.target.style.borderColor = 'oklch(1 0 0 / 8%)'} />
              </div>
            </div>
            {assegnaError && (
              <div className="px-4 py-3 rounded-xl text-sm"
                style={{ background: 'oklch(0.65 0.22 27 / 15%)', color: 'oklch(0.75 0.15 27)', border: '1px solid oklch(0.65 0.22 27 / 30%)' }}>
                <FontAwesomeIcon icon={faTriangleExclamation} /> {assegnaError}
              </div>
            )}
            <div className="flex gap-3">
              <button onClick={handleAssegna} disabled={assegnando || selectedClienti.length === 0}
                className="px-6 py-2.5 rounded-xl text-sm font-semibold transition-all"
                style={{
                  background: selectedClienti.length === 0 ? 'oklch(0.40 0.10 46)' : 'oklch(0.70 0.19 46)',
                  color: 'oklch(0.13 0 0)', cursor: selectedClienti.length === 0 ? 'not-allowed' : 'pointer',
                }}>
                {assegnando ? 'Assegnazione...' : selectedClienti.length > 1 ? `Assegna a ${selectedClienti.length} clienti` : 'Conferma assegnazione'}
              </button>
              <button onClick={() => { setShowFormAssegna(false); setAssegnaError(null); setSelectedClienti([]) }}
                className="px-6 py-2.5 rounded-xl text-sm font-medium"
                style={{ background: 'oklch(0.22 0 0)', color: 'oklch(0.60 0 0)', border: '1px solid oklch(1 0 0 / 8%)' }}>
                Annulla
              </button>
            </div>
          </div>
        )}

        {/* Lista assegnazioni */}
        {assegnazioni.length === 0 ? (
          <div className="py-10 text-center space-y-2">
            <p className="text-3xl"><FontAwesomeIcon icon={faUser} /></p>
            <p className="text-sm font-medium" style={{ color: 'oklch(0.60 0 0)' }}>Nessun cliente assegnato</p>
            <p className="text-xs" style={{ color: 'oklch(0.40 0 0)' }}>Clicca "+ Assegna" per assegnare questa scheda a un cliente</p>
          </div>
        ) : (
          <div>
            {assegnazioni.map((a, i) => (
              <div key={a.id} className="px-6 py-4"
                style={{ borderBottom: i < assegnazioni.length - 1 ? '1px solid oklch(1 0 0 / 4%)' : 'none' }}>
                {/* Riga principale */}
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                    style={{ background: 'oklch(0.70 0.19 46 / 15%)', color: 'oklch(0.70 0.19 46)' }}>
                    {(a as any).profiles?.full_name?.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-sm" style={{ color: 'oklch(0.97 0 0)' }}>
                      {(a as any).profiles?.full_name}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: 'oklch(0.45 0 0)' }}>
                      Dal {new Date(a.data_inizio).toLocaleDateString('it-IT')}
                      {a.data_fine ? ` · Scade il ${new Date(a.data_fine).toLocaleDateString('it-IT')}` : ' · Nessuna scadenza'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end">
                    <span className="text-xs px-2.5 py-1 rounded-full"
                      style={{
                        background: a.attiva ? 'oklch(0.65 0.18 150 / 15%)' : 'oklch(0.30 0 0)',
                        color: a.attiva ? 'oklch(0.65 0.18 150)' : 'oklch(0.45 0 0)',
                      }}>
                      {a.attiva ? 'Attiva' : 'Inattiva'}
                    </span>
                    <button onClick={() => handleRimuoviAssegnazione(a.id)}
                      className="text-xs px-3 py-1.5 rounded-lg transition-all"
                      style={{ background: 'oklch(0.65 0.22 27 / 15%)', color: 'oklch(0.75 0.15 27)' }}>
                      Rimuovi
                    </button>
                  </div>
                </div>

                {/* Riga PDF alimentare */}
                <div className="mt-3 ml-14 flex items-center gap-2 flex-wrap">
                  {a.pdf_alimentare_url ? (
                    <>
                      <a
                        href={a.pdf_alimentare_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium transition-all hover:opacity-80"
                        style={{ background: 'oklch(0.65 0.22 27 / 15%)', color: 'oklch(0.85 0.12 46)' }}>
                        <FontAwesomeIcon icon={faFilePdf} /> Scheda alimentare
                      </a>
                      <button
                        onClick={() => {
                          pdfTargetAssId.current = a.id
                          pdfInputRef.current?.click()
                        }}
                        disabled={uploadingPdf === a.id}
                        className="text-xs px-3 py-1.5 rounded-lg transition-all hover:opacity-80"
                        style={{ background: 'oklch(0.22 0 0)', color: 'oklch(0.55 0 0)', border: '1px solid oklch(1 0 0 / 8%)' }}>
                        <FontAwesomeIcon icon={faUpload} /> Sostituisci
                      </button>
                      <button
                        onClick={() => handleDeletePdf(a.id)}
                        className="text-xs px-2.5 py-1.5 rounded-lg transition-all hover:opacity-80"
                        style={{ background: 'oklch(0.65 0.22 27 / 10%)', color: 'oklch(0.65 0.22 27)' }}>
                        <FontAwesomeIcon icon={faTrash} />
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => {
                        pdfTargetAssId.current = a.id
                        pdfInputRef.current?.click()
                      }}
                      disabled={uploadingPdf === a.id}
                      className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-all border border-dashed hover:opacity-80"
                      style={{ background: 'transparent', borderColor: 'oklch(1 0 0 / 15%)', color: 'oklch(0.50 0 0)' }}>
                      {uploadingPdf === a.id
                        ? <><FontAwesomeIcon icon={faUpload} /> Caricamento...</>
                        : <><FontAwesomeIcon icon={faFilePdf} /> + Scheda alimentare</>}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Aggiungi giorno */}
      <div className="rounded-2xl p-5" style={{ background: 'oklch(0.18 0 0)', border: '1px solid oklch(1 0 0 / 6%)' }}>
        <h2 className="font-bold mb-4" style={{ color: 'oklch(0.97 0 0)' }}>Aggiungi un giorno</h2>
        <div className="flex flex-col sm:flex-row gap-3">
		  <input
			type="text" value={newGiornoNome}
			onChange={(e) => setNewGiornoNome(e.target.value)}
			onKeyDown={(e) => e.key === 'Enter' && handleAddGiorno()}
			placeholder='es. "Giorno A — Push", "Lunedì — Upper"'
			className="flex-1 px-4 py-3 rounded-xl text-sm outline-none"
			style={{ background: 'oklch(0.22 0 0)', border: '1px solid oklch(1 0 0 / 8%)', color: 'oklch(0.97 0 0)' }}
			onFocus={(e) => e.target.style.borderColor = 'oklch(0.70 0.19 46)'}
			onBlur={(e) => e.target.style.borderColor = 'oklch(1 0 0 / 8%)'} />
		  <button
			onClick={handleAddGiorno} disabled={addingGiorno || !newGiornoNome.trim()}
			className="w-full sm:w-auto px-5 py-3 rounded-xl text-sm font-semibold transition-all active:scale-95 whitespace-nowrap"
			style={{
			  background: !newGiornoNome.trim() ? 'oklch(0.40 0.10 46)' : 'oklch(0.70 0.19 46)',
			  color: 'oklch(0.13 0 0)',
			  cursor: !newGiornoNome.trim() ? 'not-allowed' : 'pointer',
			}}>
			+ Aggiungi giorno
		  </button>
		</div>
      </div>

      {/* Giorni */}
      {giorni.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-4xl mb-3"><FontAwesomeIcon icon={faCalendarDays} /></p>
          <p className="font-semibold" style={{ color: 'oklch(0.97 0 0)' }}>Nessun giorno ancora</p>
          <p className="text-sm mt-1" style={{ color: 'oklch(0.45 0 0)' }}>Aggiungi il primo giorno di allenamento</p>
        </div>
      ) : (
        <div className="space-y-6">
          {giorni.map((giorno) => (
            <div key={giorno.id} className="rounded-2xl overflow-hidden"
              style={{ background: 'oklch(0.18 0 0)', border: '1px solid oklch(1 0 0 / 6%)' }}>
              <div className="px-6 py-4 flex items-center justify-between"
                style={{ borderBottom: '1px solid oklch(1 0 0 / 6%)' }}>
                <div className="flex items-center gap-3 flex-1 min-w-0">
				  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0"
					style={{ background: 'oklch(0.70 0.19 46 / 15%)', color: 'oklch(0.70 0.19 46)' }}>
					{giorno.ordine + 1}
				  </div>
				  {editingGiornoId === giorno.id ? (
					<div className="flex items-center gap-2 flex-1 min-w-0">
					  <input type="text" value={editGiornoNome}
						onChange={(e) => setEditGiornoNome(e.target.value)}
						onKeyDown={(e) => {
						  if (e.key === 'Enter') handleSaveGiornoNome(giorno.id)
						  if (e.key === 'Escape') setEditingGiornoId(null)
						}}
						autoFocus
						className="flex-1 px-3 py-1.5 rounded-lg text-sm font-bold outline-none min-w-0"
						style={{ background: 'oklch(0.22 0 0)', border: '1px solid oklch(0.70 0.19 46)', color: 'oklch(0.97 0 0)' }} />
					  <button onClick={() => handleSaveGiornoNome(giorno.id)}
						className="px-3 py-1.5 rounded-lg text-xs font-semibold flex-shrink-0"
						style={{ background: 'oklch(0.70 0.19 46)', color: 'oklch(0.13 0 0)' }}>✓</button>
					  <button onClick={() => setEditingGiornoId(null)}
						className="px-3 py-1.5 rounded-lg text-xs font-medium flex-shrink-0"
						style={{ background: 'oklch(0.22 0 0)', color: 'oklch(0.60 0 0)', border: '1px solid oklch(1 0 0 / 8%)' }}>✕</button>
					</div>
				  ) : (
					<div className="flex items-center gap-2 flex-1 min-w-0">
					  <div className="flex-1 min-w-0 overflow-hidden">
						<h3 className="font-bold whitespace-nowrap"
						  style={{
							color: 'oklch(0.97 0 0)',
							overflow: 'hidden',
							textOverflow: 'ellipsis',
						  }}
						  onMouseEnter={(e) => {
							const el = e.currentTarget
							if (el.scrollWidth > el.clientWidth) {
							  el.style.animation = 'marquee 4s linear infinite'
							  el.style.textOverflow = 'unset'
							}
						  }}
						  onMouseLeave={(e) => {
							e.currentTarget.style.animation = ''
							e.currentTarget.style.textOverflow = 'ellipsis'
						  }}>
						  {giorno.nome}
						</h3>
					  </div>
					</div>
				  )}
				</div>
                {editingGiornoId !== giorno.id && (
				  <div className="flex gap-1.5 flex-shrink-0">
					<button
					  onClick={() => { setEditingGiornoId(giorno.id); setEditGiornoNome(giorno.nome) }}
					  className="w-8 h-8 rounded-lg flex items-center justify-center text-sm transition-all"
					  style={{ background: 'oklch(0.22 0 0)', color: 'oklch(0.60 0 0)', border: '1px solid oklch(1 0 0 / 8%)' }}
					  title="Rinomina">
					  <FontAwesomeIcon icon={faPen} />
					</button>
					<button
					  onClick={() => setAddingToGiorno(addingToGiorno === giorno.id ? null : giorno.id)}
					  className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold transition-all"
					  style={{ background: 'oklch(0.70 0.19 46 / 15%)', color: 'oklch(0.70 0.19 46)', border: '1px solid oklch(0.70 0.19 46 / 30%)' }}
					  title="Aggiungi esercizio">
					  +
					</button>
					<button
					  onClick={() => handleDeleteGiorno(giorno.id, giorno.nome)}
					  className="w-8 h-8 rounded-lg flex items-center justify-center text-sm transition-all"
					  style={{ background: 'oklch(0.65 0.22 27 / 15%)', color: 'oklch(0.75 0.15 27)', border: '1px solid oklch(0.65 0.22 27 / 20%)' }}
					  title="Elimina giorno">
					  ✕
					</button>
				  </div>
				)}
              </div>

              {addingToGiorno === giorno.id && (
                <div className="px-6 py-5 space-y-4"
                  style={{ background: 'oklch(0.15 0 0)', borderBottom: '1px solid oklch(1 0 0 / 6%)' }}>
                  <h4 className="font-semibold text-sm" style={{ color: 'oklch(0.70 0.19 46)' }}>
                    Aggiungi esercizio a &quot;{giorno.nome}&quot;
                  </h4>

                  {/* Filtro gruppi muscolari */}
                  {(() => {
                    const gruppi = Array.from(new Set(esercizi.flatMap(e => e.muscoli ?? []))).sort()
                    return gruppi.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        <button
                          onClick={() => setFiltroMuscolo('')}
                          className="px-3 py-1 rounded-full text-xs font-semibold transition-all"
                          style={{
                            background: filtroMuscolo === '' ? 'oklch(0.70 0.19 46)' : 'oklch(0.22 0 0)',
                            color: filtroMuscolo === '' ? 'oklch(0.13 0 0)' : 'oklch(0.55 0 0)',
                            border: '1px solid oklch(1 0 0 / 8%)',
                          }}>
                          Tutti
                        </button>
                        {gruppi.map(g => (
                          <button key={g}
                            onClick={() => setFiltroMuscolo(filtroMuscolo === g ? '' : g)}
                            className="px-3 py-1 rounded-full text-xs font-semibold transition-all capitalize"
                            style={{
                              background: filtroMuscolo === g ? 'oklch(0.70 0.19 46)' : 'oklch(0.22 0 0)',
                              color: filtroMuscolo === g ? 'oklch(0.13 0 0)' : 'oklch(0.55 0 0)',
                              border: '1px solid oklch(1 0 0 / 8%)',
                            }}>
                            {g}
                          </button>
                        ))}
                      </div>
                    ) : null
                  })()}

                  {/* Ricerca testuale */}
                  <input
                    type="text"
                    value={searchEsercizio}
                    onChange={e => { setSearchEsercizio(e.target.value); setSelectedEsercizio('') }}
                    placeholder="Cerca esercizio..."
                    className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
                    style={{ background: 'oklch(0.22 0 0)', border: '1px solid oklch(1 0 0 / 8%)', color: 'oklch(0.97 0 0)' }}
                    onFocus={e => e.target.style.borderColor = 'oklch(0.70 0.19 46)'}
                    onBlur={e => e.target.style.borderColor = 'oklch(1 0 0 / 8%)'}
                  />

                  {/* Lista esercizi filtrata */}
                  {(() => {
                    const filtered = esercizi.filter(e => {
                      const matchMuscolo = filtroMuscolo === '' || (e.muscoli ?? []).includes(filtroMuscolo)
                      const matchSearch = searchEsercizio === '' || e.nome.toLowerCase().includes(searchEsercizio.toLowerCase())
                      return matchMuscolo && matchSearch
                    })
                    return (
                      <div className="rounded-xl overflow-hidden max-h-48 overflow-y-auto"
                        style={{ border: '1px solid oklch(1 0 0 / 8%)' }}>
                        {filtered.length === 0 ? (
                          <div className="px-4 py-6 text-center">
                            <p className="text-sm" style={{ color: 'oklch(0.45 0 0)' }}>Nessun esercizio trovato</p>
                          </div>
                        ) : filtered.map((e, i) => (
                          <button key={e.id}
                            onClick={() => setSelectedEsercizio(e.id)}
                            className="w-full flex items-center justify-between px-4 py-3 text-left transition-all"
                            style={{
                              background: selectedEsercizio === e.id ? 'oklch(0.70 0.19 46 / 15%)' : i % 2 === 0 ? 'oklch(0.20 0 0)' : 'oklch(0.18 0 0)',
                              borderBottom: i < filtered.length - 1 ? '1px solid oklch(1 0 0 / 5%)' : 'none',
                            }}>
                            <span className="text-sm font-medium" style={{ color: selectedEsercizio === e.id ? 'oklch(0.70 0.19 46)' : 'oklch(0.90 0 0)' }}>
                              {e.nome}
                            </span>
                            <div className="flex gap-1 flex-wrap justify-end ml-2">
                              {(e.muscoli ?? []).slice(0, 2).map(m => (
                                <span key={m} className="text-xs px-2 py-0.5 rounded-full capitalize"
                                  style={{ background: 'oklch(0.70 0.19 46 / 15%)', color: 'oklch(0.70 0.19 46)' }}>
                                  {m}
                                </span>
                              ))}
                            </div>
                          </button>
                        ))}
                      </div>
                    )
                  })()}
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: 'Serie', value: serie, setter: setSerie, placeholder: '3' },
                      { label: 'Ripetizioni', value: ripetizioni, setter: setRipetizioni, placeholder: '8-12' },
                      { label: 'Recupero (sec)', value: recupero, setter: setRecupero, placeholder: '90' },
                    ].map((f) => (
                      <div key={f.label} className="space-y-1.5">
                        <label className="text-xs font-medium" style={{ color: 'oklch(0.70 0 0)' }}>{f.label}</label>
                        <input type="text" value={f.value} onChange={(e) => f.setter(e.target.value)}
                          placeholder={f.placeholder} className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                          style={{ background: 'oklch(0.22 0 0)', border: '1px solid oklch(1 0 0 / 8%)', color: 'oklch(0.97 0 0)' }}
                          onFocus={(e) => e.target.style.borderColor = 'oklch(0.70 0.19 46)'}
                          onBlur={(e) => e.target.style.borderColor = 'oklch(1 0 0 / 8%)'} />
                      </div>
                    ))}
                  </div>
                  <input type="text" value={noteEsercizio} onChange={(e) => setNoteEsercizio(e.target.value)}
                    placeholder="Note (opzionale)" className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                    style={{ background: 'oklch(0.22 0 0)', border: '1px solid oklch(1 0 0 / 8%)', color: 'oklch(0.97 0 0)' }}
                    onFocus={(e) => e.target.style.borderColor = 'oklch(0.70 0.19 46)'}
                    onBlur={(e) => e.target.style.borderColor = 'oklch(1 0 0 / 8%)'} />
                  <div className="flex gap-3">
                    <button onClick={() => handleAddEsercizio(giorno.id)} disabled={!selectedEsercizio}
                      className="px-5 py-2.5 rounded-xl text-sm font-semibold"
                      style={{ background: !selectedEsercizio ? 'oklch(0.40 0.10 46)' : 'oklch(0.70 0.19 46)', color: 'oklch(0.13 0 0)', cursor: !selectedEsercizio ? 'not-allowed' : 'pointer' }}>
                      Aggiungi
                    </button>
                    <button onClick={() => { setAddingToGiorno(null); setFiltroMuscolo(''); setSearchEsercizio(''); setSelectedEsercizio('') }}
                      className="px-5 py-2.5 rounded-xl text-sm font-medium"
                      style={{ background: 'oklch(0.22 0 0)', color: 'oklch(0.60 0 0)', border: '1px solid oklch(1 0 0 / 8%)' }}>
                      Annulla
                    </button>
                  </div>
                </div>
              )}

              {(giorno.scheda_esercizi?.length ?? 0) === 0 ? (
                <div className="px-6 py-8 text-center">
                  <p className="text-sm" style={{ color: 'oklch(0.40 0 0)' }}>Nessun esercizio. Clicca "+ Esercizio" per iniziare.</p>
                </div>
              ) : (
                <div>
                  {giorno.scheda_esercizi.sort((a, b) => a.ordine - b.ordine).map((se, i) => {
                    const isDraggingThis = dragging?.eseId === se.id
                    const isDragTarget = dragOver === se.id && dragging?.eseId !== se.id
                    return (
                      <div
                        key={se.id}
                        data-eseid={se.id}
                        draggable
                        onDragStart={(e) => onDragStart(e, giorno.id, se.id)}
                        onDragOver={(e) => onDragOver(e, se.id)}
                        onDrop={(e) => onDrop(e, se.id)}
                        onDragEnd={endDrag}
                        className="flex items-center gap-4 px-6 py-4 group transition-all duration-150"
                        style={{
                          borderBottom: i < giorno.scheda_esercizi.length - 1 ? '1px solid oklch(1 0 0 / 4%)' : 'none',
                          opacity: isDraggingThis ? 0.35 : 1,
                          background: isDragTarget ? 'oklch(0.70 0.19 46 / 8%)' : 'transparent',
                          borderTop: isDragTarget ? '2px solid oklch(0.70 0.19 46 / 60%)' : undefined,
                        }}>
                        {/* Drag handle */}
                        <div
                          className="flex-shrink-0 cursor-grab active:cursor-grabbing touch-none select-none"
                          style={{ color: 'oklch(0.35 0 0)', padding: '4px' }}
                          ref={(el) => {
                            if (!el) return
                            el.onpointerdown = (e) => {
                              const row = el.closest('[data-eseid]') as HTMLDivElement
                              onPointerDown(e as any, giorno.id, se.id, row)
                            }
                          }}
                        >
                          <FontAwesomeIcon icon={faGripVertical} />
                        </div>

                        <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0"
                          style={{ background: 'oklch(0.22 0 0)', color: 'oklch(0.55 0 0)' }}>{i + 1}</div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm" style={{ color: 'oklch(0.97 0 0)' }}>{se.esercizi?.nome}</p>
                          <div className="flex items-center gap-3 mt-1">
                            {[`${se.serie} serie`, `${se.ripetizioni} reps`, `${se.recupero_secondi}s recupero`].map(t => (
                              <span key={t} className="text-xs px-2 py-0.5 rounded"
                                style={{ background: 'oklch(0.22 0 0)', color: 'oklch(0.60 0 0)' }}>{t}</span>
                            ))}
                          </div>
                          {se.note && <p className="text-xs mt-1 italic" style={{ color: 'oklch(0.45 0 0)' }}><FontAwesomeIcon icon={faNoteSticky} /> {se.note}</p>}
                        </div>
                        <div className="flex flex-wrap gap-1 max-w-32">
                          {se.esercizi?.muscoli?.slice(0, 2).map(m => (
                            <span key={m} className="text-xs px-2 py-0.5 rounded-full"
                              style={{ background: 'oklch(0.60 0.15 200 / 15%)', color: 'oklch(0.60 0.15 200)' }}>{m}</span>
                          ))}
                        </div>
                        <button
                          onClick={() => handleDeleteEsercizio(se.id)}
                          className="lg:opacity-0 lg:group-hover:opacity-100 px-2.5 py-1.5 rounded-lg text-xs transition-all flex-shrink-0"
                          style={{ background: 'oklch(0.65 0.22 27 / 15%)', color: 'oklch(0.75 0.15 27)' }}>✕</button>
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
