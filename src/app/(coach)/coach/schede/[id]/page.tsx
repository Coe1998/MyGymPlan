'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

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
  const [serie, setSerie] = useState('3')
  const [ripetizioni, setRipetizioni] = useState('8-12')
  const [recupero, setRecupero] = useState('90')
  const [noteEsercizio, setNoteEsercizio] = useState('')
  const [clienti, setClienti] = useState<Cliente[]>([])
  const [assegnazioni, setAssegnazioni] = useState<Assegnazione[]>([])
  const [showFormAssegna, setShowFormAssegna] = useState(false)
  const [selectedCliente, setSelectedCliente] = useState('')
  const [dataInizio, setDataInizio] = useState(new Date().toISOString().split('T')[0])
  const [dataFine, setDataFine] = useState('')
  const [assegnando, setAssegnando] = useState(false)
  const [assegnaError, setAssegnaError] = useState<string | null>(null)

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
        .select('id, data_inizio, data_fine, attiva, profiles!assegnazioni_cliente_id_fkey (full_name)')
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
    if (!selectedCliente) return
    setAssegnando(true); setAssegnaError(null)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('assegnazioni').update({ attiva: false })
      .eq('scheda_id', schedaId).eq('cliente_id', selectedCliente).eq('attiva', true)
    const { error } = await supabase.from('assegnazioni').insert({
      scheda_id: schedaId, cliente_id: selectedCliente, coach_id: user.id,
      data_inizio: dataInizio, data_fine: dataFine || null, attiva: true,
    })
    if (error) { setAssegnaError("Errore durante l'assegnazione."); setAssegnando(false); return }
    setSelectedCliente(''); setDataFine(''); setShowFormAssegna(false); setAssegnando(false); fetchAll()
  }

  const handleRimuoviAssegnazione = async (id: string) => {
    if (!confirm('Vuoi rimuovere questa assegnazione?')) return
    await supabase.from('assegnazioni').delete().eq('id', id); fetchAll()
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-64">
      <p className="text-sm" style={{ color: 'oklch(0.45 0 0)' }}>Caricamento...</p>
    </div>
  )

  const assegnazioniAttive = assegnazioni.filter(a => a.attiva)

  return (
    <div className="space-y-8 max-w-5xl">
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
					✅ {assegnazioniAttive.length === 1 ? '1 cliente' : `${assegnazioniAttive.length} clienti`}
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
				👤 Assegna
			  </button>
			  <button onClick={() => setEditingInfo(true)}
				className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
				style={{ background: 'oklch(0.22 0 0)', color: 'oklch(0.70 0 0)', border: '1px solid oklch(1 0 0 / 8%)' }}>
				✏️ Modifica
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
              <div className="space-y-2">
                <label className="text-sm font-medium" style={{ color: 'oklch(0.80 0 0)' }}>Cliente</label>
                <select value={selectedCliente} onChange={(e) => setSelectedCliente(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                  style={{ background: 'oklch(0.22 0 0)', border: '1px solid oklch(1 0 0 / 8%)', color: selectedCliente ? 'oklch(0.97 0 0)' : 'oklch(0.45 0 0)' }}>
                  <option value="">Seleziona cliente...</option>
                  {clienti.map(c => (
                    <option key={c.cliente_id} value={c.cliente_id}>{c.profiles?.full_name}</option>
                  ))}
                </select>
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
                ⚠️ {assegnaError}
              </div>
            )}
            <div className="flex gap-3">
              <button onClick={handleAssegna} disabled={assegnando || !selectedCliente}
                className="px-6 py-2.5 rounded-xl text-sm font-semibold transition-all"
                style={{
                  background: !selectedCliente ? 'oklch(0.40 0.10 46)' : 'oklch(0.70 0.19 46)',
                  color: 'oklch(0.13 0 0)', cursor: !selectedCliente ? 'not-allowed' : 'pointer',
                }}>
                {assegnando ? 'Assegnazione...' : 'Conferma assegnazione'}
              </button>
              <button onClick={() => { setShowFormAssegna(false); setAssegnaError(null) }}
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
            <p className="text-3xl">👤</p>
            <p className="text-sm font-medium" style={{ color: 'oklch(0.60 0 0)' }}>Nessun cliente assegnato</p>
            <p className="text-xs" style={{ color: 'oklch(0.40 0 0)' }}>Clicca "+ Assegna" per assegnare questa scheda a un cliente</p>
          </div>
        ) : (
          <div>
            {assegnazioni.map((a, i) => (
              <div key={a.id} className="flex items-center gap-4 px-6 py-4"
                style={{ borderBottom: i < assegnazioni.length - 1 ? '1px solid oklch(1 0 0 / 4%)' : 'none' }}>
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
            ))}
          </div>
        )}
      </div>

      {/* Aggiungi giorno */}
      <div className="rounded-2xl p-5" style={{ background: 'oklch(0.18 0 0)', border: '1px solid oklch(1 0 0 / 6%)' }}>
        <h2 className="font-bold mb-4" style={{ color: 'oklch(0.97 0 0)' }}>Aggiungi un giorno</h2>
        <div className="flex gap-3">
          <input type="text" value={newGiornoNome} onChange={(e) => setNewGiornoNome(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddGiorno()}
            placeholder='es. "Giorno A — Push", "Lunedì — Upper"'
            className="flex-1 px-4 py-3 rounded-xl text-sm outline-none"
            style={{ background: 'oklch(0.22 0 0)', border: '1px solid oklch(1 0 0 / 8%)', color: 'oklch(0.97 0 0)' }}
            onFocus={(e) => e.target.style.borderColor = 'oklch(0.70 0.19 46)'}
            onBlur={(e) => e.target.style.borderColor = 'oklch(1 0 0 / 8%)'} />
          <button onClick={handleAddGiorno} disabled={addingGiorno || !newGiornoNome.trim()}
            className="px-5 py-3 rounded-xl text-sm font-semibold transition-all whitespace-nowrap"
            style={{
              background: !newGiornoNome.trim() ? 'oklch(0.40 0.10 46)' : 'oklch(0.70 0.19 46)',
              color: 'oklch(0.13 0 0)', cursor: !newGiornoNome.trim() ? 'not-allowed' : 'pointer',
            }}>
            + Aggiungi giorno
          </button>
        </div>
      </div>

      {/* Giorni */}
      {giorni.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-4xl mb-3">📅</p>
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
                <div className="flex items-center gap-3 flex-1">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0"
                    style={{ background: 'oklch(0.70 0.19 46 / 15%)', color: 'oklch(0.70 0.19 46)' }}>
                    {giorno.ordine + 1}
                  </div>
                  {editingGiornoId === giorno.id ? (
                    <div className="flex items-center gap-2 flex-1">
                      <input type="text" value={editGiornoNome} onChange={(e) => setEditGiornoNome(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleSaveGiornoNome(giorno.id); if (e.key === 'Escape') setEditingGiornoId(null) }}
                        autoFocus
                        className="flex-1 px-3 py-1.5 rounded-lg text-sm font-bold outline-none"
                        style={{ background: 'oklch(0.22 0 0)', border: '1px solid oklch(0.70 0.19 46)', color: 'oklch(0.97 0 0)' }} />
                      <button onClick={() => handleSaveGiornoNome(giorno.id)}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold"
                        style={{ background: 'oklch(0.70 0.19 46)', color: 'oklch(0.13 0 0)' }}>✓</button>
                      <button onClick={() => setEditingGiornoId(null)}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium"
                        style={{ background: 'oklch(0.22 0 0)', color: 'oklch(0.60 0 0)', border: '1px solid oklch(1 0 0 / 8%)' }}>✕</button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold" style={{ color: 'oklch(0.97 0 0)' }}>{giorno.nome}</h3>
                      <button onClick={() => { setEditingGiornoId(giorno.id); setEditGiornoNome(giorno.nome) }}
                        className="p-1 rounded transition-all hover:opacity-70" style={{ color: 'oklch(0.45 0 0)' }}>✏️</button>
                      <span className="text-xs" style={{ color: 'oklch(0.45 0 0)' }}>
                        {giorno.scheda_esercizi?.length ?? 0} esercizi
                      </span>
                    </div>
                  )}
                </div>
                {editingGiornoId !== giorno.id && (
                  <div className="flex gap-2 flex-shrink-0">
                    <button onClick={() => setAddingToGiorno(addingToGiorno === giorno.id ? null : giorno.id)}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium"
                      style={{ background: 'oklch(0.70 0.19 46 / 15%)', color: 'oklch(0.70 0.19 46)', border: '1px solid oklch(0.70 0.19 46 / 30%)' }}>
                      + Esercizio
                    </button>
                    <button onClick={() => handleDeleteGiorno(giorno.id, giorno.nome)}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium"
                      style={{ background: 'oklch(0.65 0.22 27 / 15%)', color: 'oklch(0.75 0.15 27)', border: '1px solid oklch(0.65 0.22 27 / 20%)' }}>
                      Elimina giorno
                    </button>
                  </div>
                )}
              </div>

              {addingToGiorno === giorno.id && (
                <div className="px-6 py-5 space-y-4"
                  style={{ background: 'oklch(0.15 0 0)', borderBottom: '1px solid oklch(1 0 0 / 6%)' }}>
                  <h4 className="font-semibold text-sm" style={{ color: 'oklch(0.70 0.19 46)' }}>
                    Aggiungi esercizio a "{giorno.nome}"
                  </h4>
                  <select value={selectedEsercizio} onChange={(e) => setSelectedEsercizio(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                    style={{ background: 'oklch(0.22 0 0)', border: '1px solid oklch(1 0 0 / 8%)', color: selectedEsercizio ? 'oklch(0.97 0 0)' : 'oklch(0.45 0 0)' }}>
                    <option value="">Seleziona un esercizio...</option>
                    {esercizi.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
                  </select>
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
                    <button onClick={() => setAddingToGiorno(null)}
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
                  {giorno.scheda_esercizi.sort((a, b) => a.ordine - b.ordine).map((se, i) => (
                    <div key={se.id} className="flex items-center gap-4 px-6 py-4 group"
                      style={{ borderBottom: i < giorno.scheda_esercizi.length - 1 ? '1px solid oklch(1 0 0 / 4%)' : 'none' }}>
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
                        {se.note && <p className="text-xs mt-1 italic" style={{ color: 'oklch(0.45 0 0)' }}>📝 {se.note}</p>}
                      </div>
                      <div className="flex flex-wrap gap-1 max-w-32">
                        {se.esercizi?.muscoli?.slice(0, 2).map(m => (
                          <span key={m} className="text-xs px-2 py-0.5 rounded-full"
                            style={{ background: 'oklch(0.60 0.15 200 / 15%)', color: 'oklch(0.60 0.15 200)' }}>{m}</span>
                        ))}
                      </div>
                      <button onClick={() => handleDeleteEsercizio(se.id)}
                        className="opacity-0 group-hover:opacity-100 px-2.5 py-1.5 rounded-lg text-xs"
                        style={{ background: 'oklch(0.65 0.22 27 / 15%)', color: 'oklch(0.75 0.15 27)' }}>✕</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
