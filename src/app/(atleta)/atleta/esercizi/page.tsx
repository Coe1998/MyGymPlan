'use client'

import { useEffect, useState } from 'react'
import BynariLoader from '@/components/shared/BynariLoader'
import { createClient } from '@/lib/supabase/client'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faDumbbell, faPlus, faTrash, faPen, faXmark, faCheck } from '@fortawesome/free-solid-svg-icons'

interface Esercizio {
  id: string
  nome: string
  muscoli: string[] | null
  descrizione: string | null
  is_global: boolean
  coach_id: string | null
}

const MUSCOLI_OPTIONS = [
  'Petto', 'Spalle', 'Tricipiti', 'Bicipiti', 'Schiena', 'Dorsali',
  'Addome', 'Quadricipiti', 'Femorali', 'Glutei', 'Polpacci', 'Avambracci',
]

const PAGE_SIZE = 10

export default function AtletaEserciziPage() {
  const supabase = createClient()
  const [esercizi, setEsercizi] = useState<Esercizio[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filtroTipo, setFiltroTipo] = useState<'tutti' | 'miei' | 'globali'>('tutti')
  const [filtroMuscolo, setFiltroMuscolo] = useState<string | null>(null)
  const [visibili, setVisibili] = useState(PAGE_SIZE)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [nome, setNome] = useState('')
  const [muscoli, setMuscoli] = useState<string[]>([])
  const [descrizione, setDescrizione] = useState('')
  const [saving, setSaving] = useState(false)

  const fetchEsercizi = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from('esercizi').select('*')
      .or('is_global.eq.true,coach_id.eq.' + user.id)
      .order('is_global', { ascending: false })
      .order('nome', { ascending: true })
    setEsercizi(data ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchEsercizi() }, [])
  useEffect(() => { setVisibili(PAGE_SIZE) }, [search, filtroTipo, filtroMuscolo])

  const resetForm = () => {
    setNome(''); setMuscoli([]); setDescrizione('')
    setEditingId(null); setShowForm(false)
  }

  const handleSave = async () => {
    if (!nome.trim()) return
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    if (editingId) {
      await supabase.from('esercizi').update({
        nome: nome.trim(), muscoli, descrizione: descrizione.trim() || null,
      }).eq('id', editingId)
    } else {
      await supabase.from('esercizi').insert({
        coach_id: user.id, nome: nome.trim(), muscoli, descrizione: descrizione.trim() || null,
      })
    }
    setSaving(false); resetForm(); fetchEsercizi()
  }

  const handleEdit = (e: Esercizio) => {
    setEditingId(e.id); setNome(e.nome)
    setMuscoli(e.muscoli ?? []); setDescrizione(e.descrizione ?? '')
    setShowForm(true)
  }

  const handleDelete = async (id: string, nome: string) => {
    if (!confirm(`Eliminare "${nome}"?`)) return
    await supabase.from('esercizi').delete().eq('id', id)
    fetchEsercizi()
  }

  const toggleMuscolo = (m: string) =>
    setMuscoli(prev => prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m])

  const filtered = esercizi.filter(e => {
    if (search && !e.nome.toLowerCase().includes(search.toLowerCase()) &&
        !e.muscoli?.some(m => m.toLowerCase().includes(search.toLowerCase()))) return false
    if (filtroTipo === 'miei' && e.is_global) return false
    if (filtroTipo === 'globali' && !e.is_global) return false
    if (filtroMuscolo && !e.muscoli?.includes(filtroMuscolo)) return false
    return true
  })

  const visibiliEsercizi = filtered.slice(0, visibili)
  const haAltri = filtered.length > visibili

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight" style={{ color: 'var(--c-97)' }}>Esercizi</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--c-50)' }}>
            {esercizi.filter(e => !e.is_global).length} tuoi · {esercizi.filter(e => e.is_global).length} globali
          </p>
        </div>
        <button onClick={() => { resetForm(); setShowForm(true) }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-95"
          style={{ background: 'oklch(0.70 0.19 46)', color: 'var(--c-13)' }}>
          <FontAwesomeIcon icon={faPlus} /> Nuovo
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="rounded-2xl p-6 space-y-4"
          style={{ background: 'var(--c-18)', border: '1px solid oklch(0.70 0.19 46 / 30%)' }}>
          <div className="flex items-center justify-between">
            <h2 className="font-bold" style={{ color: 'var(--c-97)' }}>
              {editingId ? 'Modifica esercizio' : 'Nuovo esercizio'}
            </h2>
            <button onClick={resetForm} className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{ background: 'var(--c-25)', color: 'var(--c-55)' }}>
              <FontAwesomeIcon icon={faXmark} />
            </button>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium" style={{ color: 'var(--c-80)' }}>Nome *</label>
            <input type="text" value={nome} onChange={e => setNome(e.target.value)}
              placeholder="es. Panca Piana" autoFocus
              className="w-full px-4 py-3 rounded-xl text-sm outline-none"
              style={{ background: 'var(--c-22)', border: '1px solid var(--c-w8)', color: 'var(--c-97)' }}
              onFocus={e => e.target.style.borderColor = 'oklch(0.70 0.19 46)'}
              onBlur={e => e.target.style.borderColor = 'var(--c-w8)'} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium" style={{ color: 'var(--c-80)' }}>Muscoli</label>
            <div className="flex flex-wrap gap-2">
              {MUSCOLI_OPTIONS.map(m => (
                <button key={m} onClick={() => toggleMuscolo(m)}
                  className="px-3 py-1.5 rounded-full text-xs font-medium transition-all"
                  style={{
                    background: muscoli.includes(m) ? 'oklch(0.70 0.19 46 / 20%)' : 'var(--c-22)',
                    color: muscoli.includes(m) ? 'oklch(0.70 0.19 46)' : 'var(--c-55)',
                    border: muscoli.includes(m) ? '1px solid oklch(0.70 0.19 46 / 40%)' : '1px solid transparent',
                  }}>
                  {m}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium" style={{ color: 'var(--c-80)' }}>Note / Descrizione</label>
            <textarea value={descrizione} onChange={e => setDescrizione(e.target.value)}
              placeholder="es. Supinato, busto eretto, schiena dritta..."
              rows={2} className="w-full px-4 py-3 rounded-xl text-sm outline-none resize-none"
              style={{ background: 'var(--c-22)', border: '1px solid var(--c-w8)', color: 'var(--c-97)' }}
              onFocus={e => e.target.style.borderColor = 'oklch(0.70 0.19 46)'}
              onBlur={e => e.target.style.borderColor = 'var(--c-w8)'} />
          </div>
          <div className="flex gap-3">
            <button onClick={handleSave} disabled={saving || !nome.trim()}
              className="px-6 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2"
              style={{
                background: !nome.trim() ? 'var(--c-35)' : 'oklch(0.70 0.19 46)',
                color: 'var(--c-13)', cursor: !nome.trim() ? 'not-allowed' : 'pointer',
              }}>
              <FontAwesomeIcon icon={faCheck} /> {saving ? 'Salvataggio...' : 'Salva'}
            </button>
            <button onClick={resetForm} className="px-6 py-2.5 rounded-xl text-sm font-medium"
              style={{ background: 'var(--c-22)', color: 'var(--c-60)', border: '1px solid var(--c-w8)' }}>
              Annulla
            </button>
          </div>
        </div>
      )}

      {/* ── Filtri ── */}
      <div className="space-y-3">
        <input type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Cerca per nome o muscolo..."
          className="w-full px-4 py-3 rounded-xl text-sm outline-none"
          style={{ background: 'var(--c-18)', border: '1px solid var(--c-w8)', color: 'var(--c-97)' }}
          onFocus={e => e.target.style.borderColor = 'oklch(0.70 0.19 46)'}
          onBlur={e => e.target.style.borderColor = 'var(--c-w8)'} />

        <div className="flex gap-2">
          {[
            { id: 'tutti', label: 'Tutti' },
            { id: 'miei', label: '👤 Miei' },
            { id: 'globali', label: '🌐 Globali' },
          ].map(f => (
            <button key={f.id} onClick={() => setFiltroTipo(f.id as any)}
              className="px-4 py-2 rounded-xl text-xs font-bold transition-all"
              style={{
                background: filtroTipo === f.id ? 'oklch(0.70 0.19 46)' : 'var(--c-22)',
                color: filtroTipo === f.id ? 'var(--c-11)' : 'var(--c-55)',
              }}>
              {f.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          <button onClick={() => setFiltroMuscolo(null)}
            className="px-3 py-1.5 rounded-full text-xs font-medium transition-all"
            style={{
              background: filtroMuscolo === null ? 'oklch(0.60 0.15 200 / 20%)' : 'var(--c-22)',
              color: filtroMuscolo === null ? 'oklch(0.60 0.15 200)' : 'var(--c-50)',
              border: filtroMuscolo === null ? '1px solid oklch(0.60 0.15 200 / 40%)' : '1px solid var(--c-w8)',
            }}>
            Tutti i muscoli
          </button>
          {MUSCOLI_OPTIONS.map(m => (
            <button key={m} onClick={() => setFiltroMuscolo(filtroMuscolo === m ? null : m)}
              className="px-3 py-1.5 rounded-full text-xs font-medium transition-all"
              style={{
                background: filtroMuscolo === m ? 'oklch(0.60 0.15 200 / 20%)' : 'var(--c-22)',
                color: filtroMuscolo === m ? 'oklch(0.60 0.15 200)' : 'var(--c-50)',
                border: filtroMuscolo === m ? '1px solid oklch(0.60 0.15 200 / 40%)' : '1px solid var(--c-w8)',
              }}>
              {m}
            </button>
          ))}
        </div>
      </div>

      {/* Lista */}
      {loading ? (
        <BynariLoader file="blue" size={80} />
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl py-16 text-center space-y-3"
          style={{ background: 'var(--c-18)', border: '1px solid var(--c-w6)' }}>
          <p className="text-5xl"><FontAwesomeIcon icon={faDumbbell} /></p>
          <p className="font-semibold" style={{ color: 'var(--c-97)' }}>
            {search || filtroTipo !== 'tutti' || filtroMuscolo ? 'Nessun risultato' : 'Nessun esercizio ancora'}
          </p>
          <p className="text-sm" style={{ color: 'var(--c-45)' }}>
            {search || filtroTipo !== 'tutti' || filtroMuscolo ? 'Prova a cambiare i filtri' : 'Aggiungi il tuo primo esercizio'}
          </p>
        </div>
      ) : (
        <div className="rounded-2xl overflow-hidden"
          style={{ background: 'var(--c-18)', border: '1px solid var(--c-w6)' }}>
          <div className="px-5 py-3 flex items-center justify-between"
            style={{ borderBottom: '1px solid var(--c-w6)', background: 'var(--c-15)' }}>
            <p className="text-xs font-semibold" style={{ color: 'var(--c-45)' }}>
              {filtered.length} esercizi trovati
            </p>
          </div>
          {visibiliEsercizi.map((e, i) => (
            <div key={e.id} className="flex items-center gap-4 px-5 py-4 group"
              style={{ borderBottom: i < visibiliEsercizi.length - 1 || haAltri ? '1px solid var(--c-w4)' : 'none' }}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{
                  background: e.is_global ? 'oklch(0.65 0.18 150 / 15%)' : 'oklch(0.70 0.19 46 / 15%)',
                  color: e.is_global ? 'oklch(0.65 0.18 150)' : 'oklch(0.70 0.19 46)',
                }}>
                <FontAwesomeIcon icon={faDumbbell} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm" style={{ color: 'var(--c-97)' }}>{e.nome}</p>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {e.muscoli?.map(m => (
                    <span key={m} className="text-xs px-2 py-0.5 rounded-full"
                      style={{ background: 'oklch(0.60 0.15 200 / 15%)', color: 'oklch(0.60 0.15 200)' }}>
                      {m}
                    </span>
                  ))}
                </div>
                {e.descrizione && (
                  <p className="text-xs mt-1 italic" style={{ color: 'var(--c-45)' }}>{e.descrizione}</p>
                )}
              </div>
              {e.is_global ? (
                <span className="text-xs px-2.5 py-1 rounded-full flex-shrink-0"
                  style={{ background: 'oklch(0.65 0.18 150 / 15%)', color: 'oklch(0.65 0.18 150)' }}>
                  🌐 Globale
                </span>
              ) : (
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0">
                  <button onClick={() => handleEdit(e)}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-xs"
                    style={{ background: 'var(--c-22)', color: 'var(--c-60)' }}>
                    <FontAwesomeIcon icon={faPen} />
                  </button>
                  <button onClick={() => handleDelete(e.id, e.nome)}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-xs"
                    style={{ background: 'oklch(0.65 0.22 27 / 15%)', color: 'oklch(0.75 0.15 27)' }}>
                    <FontAwesomeIcon icon={faTrash} />
                  </button>
                </div>
              )}
            </div>
          ))}
          {haAltri && (
            <div className="px-5 py-4 text-center">
              <button onClick={() => setVisibili(v => v + PAGE_SIZE)}
                className="px-6 py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-80 active:scale-95"
                style={{ background: 'var(--c-22)', color: 'var(--c-70)', border: '1px solid var(--c-w8)' }}>
                Mostra altri ({filtered.length - visibili} rimasti)
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
