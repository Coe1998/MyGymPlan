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

  useEffect(() => {
    supabase.from('macro_target').select('*').eq('cliente_id', clienteId).maybeSingle()
      .then(({ data }) => {
        if (data) {
          setCalorie(String(data.calorie))
          setProteine(String(data.proteine_g))
          setCarboidrati(String(data.carboidrati_g))
          setGrassi(String(data.grassi_g))
          setNote(data.note ?? '')
        }
      })
  }, [clienteId])

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
