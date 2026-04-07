'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Props {
  clienteId: string
  onClose?: () => void
}

export default function MacroTargetForm({ clienteId, onClose }: Props) {
  const supabase = createClient()
  const [calorie, setCalorie] = useState('2000')
  const [proteine, setProteine] = useState('150')
  const [carboidrati, setCarboidrati] = useState('200')
  const [grassi, setGrassi] = useState('70')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [pastiConfig, setPastiConfig] = useState<{ nome: string; percentuale: number }[]>([])
  const [numPasti, setNumPasti] = useState(3)

  useEffect(() => {
    supabase.from('macro_target').select('*').eq('cliente_id', clienteId).maybeSingle()
      .then(({ data }) => {
        if (data) {
          setCalorie(String(data.calorie))
          setProteine(String(data.proteine_g))
          setCarboidrati(String(data.carboidrati_g))
          setGrassi(String(data.grassi_g))
          setNote(data.note ?? '')
          if (data.pasti_config && Array.isArray(data.pasti_config) && data.pasti_config.length > 0) {
            setPastiConfig(data.pasti_config)
            setNumPasti(data.pasti_config.length)
          } else {
            setPastiConfig([
              { nome: 'Colazione', percentuale: 25 },
              { nome: 'Pranzo', percentuale: 40 },
              { nome: 'Cena', percentuale: 35 },
            ])
          }
        }
      })
  }, [clienteId])

  useEffect(() => {
    setPastiConfig(prev => {
      const nomiDefault = ['Colazione', 'Spuntino mattina', 'Pranzo', 'Spuntino pomeriggio', 'Cena', 'Post-workout']
      const nuovi = Array.from({ length: numPasti }, (_, i) => ({
        nome: prev[i]?.nome ?? nomiDefault[i] ?? `Pasto ${i + 1}`,
        percentuale: prev[i]?.percentuale ?? Math.round(100 / numPasti),
      }))
      const tot = nuovi.reduce((a, p) => a + p.percentuale, 0)
      if (tot !== 100) nuovi[nuovi.length - 1].percentuale += 100 - tot
      return nuovi
    })
  }, [numPasti])

  const handleSave = async () => {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase.from('macro_target').upsert({
      cliente_id: clienteId, coach_id: user.id,
      calorie: parseInt(calorie) || 2000,
      proteine_g: parseInt(proteine) || 150,
      carboidrati_g: parseInt(carboidrati) || 200,
      grassi_g: parseInt(grassi) || 70,
      note: note.trim() || null,
      pasti_config: pastiConfig,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'cliente_id' })

    setSaving(false); setSaved(true)
    setTimeout(() => { setSaved(false); onClose?.() }, 1200)
  }

  // Auto-calcola le calorie dai macro (4/4/9 kcal per g)
  const calcolaCalorie = () => {
    const p = parseInt(proteine) || 0
    const c = parseInt(carboidrati) || 0
    const g = parseInt(grassi) || 0
    setCalorie(String(p * 4 + c * 4 + g * 9))
  }

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <p className="font-bold text-sm" style={{ color: 'oklch(0.70 0.19 46)' }}>🎯 Macro target</p>
        <button onClick={calcolaCalorie}
          className="text-xs px-3 py-1.5 rounded-lg font-medium"
          style={{ background: 'oklch(0.22 0 0)', color: 'oklch(0.60 0 0)' }}>
          Ricalcola kcal
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {[
          { label: 'Calorie (kcal)', val: calorie, set: setCalorie, color: 'oklch(0.70 0.19 46)' },
          { label: 'Proteine (g)', val: proteine, set: setProteine, color: 'oklch(0.60 0.15 200)' },
          { label: 'Carboidrati (g)', val: carboidrati, set: setCarboidrati, color: 'oklch(0.70 0.19 46)' },
          { label: 'Grassi (g)', val: grassi, set: setGrassi, color: 'oklch(0.65 0.18 150)' },
        ].map(f => (
          <div key={f.label} className="space-y-1.5">
            <label className="text-xs font-semibold" style={{ color: 'oklch(0.55 0 0)' }}>{f.label}</label>
            <input type="number" value={f.val} onChange={e => f.set(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none text-center font-bold"
              style={{ background: 'oklch(0.22 0 0)', border: `1px solid ${f.color}30`, color: f.color }}
              onFocus={e => e.target.style.borderColor = f.color}
              onBlur={e => e.target.style.borderColor = `${f.color}30`} />
          </div>
        ))}
      </div>

      {/* ── Ripartizione pasti ── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold uppercase tracking-wide" style={{ color: 'oklch(0.55 0 0)' }}>
            Ripartizione pasti
          </p>
          <div className="flex gap-1">
            {[3, 4, 5, 6].map(n => (
              <button key={n} onClick={() => setNumPasti(n)}
                className="w-7 h-7 rounded-lg text-xs font-bold transition-all"
                style={{
                  background: numPasti === n ? 'oklch(0.70 0.19 46)' : 'oklch(0.22 0 0)',
                  color: numPasti === n ? 'oklch(0.13 0 0)' : 'oklch(0.50 0 0)',
                }}>
                {n}
              </button>
            ))}
          </div>
        </div>

        {(() => {
          const tot = pastiConfig.reduce((a, p) => a + (p.percentuale || 0), 0)
          return (
            <div className="flex items-center justify-between px-3 py-2 rounded-xl"
              style={{ background: tot === 100 ? 'oklch(0.65 0.18 150 / 10%)' : 'oklch(0.65 0.22 27 / 10%)' }}>
              <span className="text-xs font-semibold" style={{ color: 'oklch(0.55 0 0)' }}>Totale</span>
              <span className="text-sm font-black"
                style={{ color: tot === 100 ? 'oklch(0.65 0.18 150)' : 'oklch(0.75 0.15 27)' }}>
                {tot}% {tot !== 100 && `(${tot < 100 ? `mancano ${100 - tot}%` : `eccedono ${tot - 100}%`})`}
              </span>
            </div>
          )
        })()}

        {pastiConfig.map((pasto, i) => {
          const kcalPasto = Math.round((parseInt(calorie) || 0) * pasto.percentuale / 100)
          const protPasto = Math.round((parseInt(proteine) || 0) * pasto.percentuale / 100)
          const carbPasto = Math.round((parseInt(carboidrati) || 0) * pasto.percentuale / 100)
          const grassiPasto = Math.round((parseInt(grassi) || 0) * pasto.percentuale / 100)
          return (
            <div key={i} className="rounded-xl p-3 space-y-2"
              style={{ background: 'oklch(0.20 0 0)', border: '1px solid oklch(1 0 0 / 6%)' }}>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={pasto.nome}
                  onChange={e => setPastiConfig(prev => prev.map((p, j) => j === i ? { ...p, nome: e.target.value } : p))}
                  className="flex-1 px-2 py-1.5 rounded-lg text-sm font-semibold outline-none"
                  style={{ background: 'oklch(0.16 0 0)', color: 'oklch(0.90 0 0)', border: '1px solid oklch(1 0 0 / 8%)' }}
                />
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => setPastiConfig(prev => prev.map((p, j) => j === i ? { ...p, percentuale: Math.max(0, p.percentuale - 1) } : p))}
                    className="w-6 h-6 rounded-md flex items-center justify-center text-sm font-bold"
                    style={{ background: 'oklch(0.25 0 0)', color: 'oklch(0.60 0 0)' }}>−</button>
                  <input
                    type="number"
                    value={pasto.percentuale}
                    onChange={e => setPastiConfig(prev => prev.map((p, j) => j === i ? { ...p, percentuale: Math.min(100, Math.max(0, parseInt(e.target.value) || 0)) } : p))}
                    className="w-12 text-center text-sm font-black outline-none rounded-lg py-1"
                    style={{ background: 'oklch(0.16 0 0)', color: 'oklch(0.70 0.19 46)', border: '1px solid oklch(0.70 0.19 46 / 30%)' }}
                  />
                  <span className="text-xs font-bold" style={{ color: 'oklch(0.50 0 0)' }}>%</span>
                  <button
                    onClick={() => setPastiConfig(prev => prev.map((p, j) => j === i ? { ...p, percentuale: Math.min(100, p.percentuale + 1) } : p))}
                    className="w-6 h-6 rounded-md flex items-center justify-center text-sm font-bold"
                    style={{ background: 'oklch(0.25 0 0)', color: 'oklch(0.60 0 0)' }}>+</button>
                </div>
              </div>
              <p className="text-xs" style={{ color: 'oklch(0.40 0 0)' }}>
                {kcalPasto} kcal · {protPasto}g prot · {carbPasto}g carb · {grassiPasto}g grassi
              </p>
            </div>
          )
        })}
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-semibold" style={{ color: 'oklch(0.55 0 0)' }}>Note (opzionale)</label>
        <input type="text" value={note} onChange={e => setNote(e.target.value)}
          placeholder="es. Deficit calorico, refeed il sabato..."
          className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
          style={{ background: 'oklch(0.22 0 0)', border: '1px solid oklch(1 0 0 / 8%)', color: 'oklch(0.97 0 0)' }} />
      </div>

      <button onClick={handleSave} disabled={saving}
        className="w-full py-3 rounded-xl text-sm font-bold transition-all"
        style={{ background: saved ? 'oklch(0.65 0.18 150)' : 'oklch(0.70 0.19 46)', color: 'oklch(0.11 0 0)' }}>
        {saved ? '✓ Salvato!' : saving ? 'Salvataggio...' : 'Salva macro target'}
      </button>
    </div>
  )
}
