'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faFaceTired, faFaceFrown, faFaceMeh, faFaceSmile, faFaceGrinStars,
} from '@fortawesome/free-solid-svg-icons'
import { IconDefinition } from '@fortawesome/fontawesome-svg-core'

const EMOJI_VOTO: (IconDefinition | null)[] = [null, faFaceTired, faFaceFrown, faFaceMeh, faFaceSmile, faFaceGrinStars]

const getEmoji = (key: string, v: number): IconDefinition | null =>
  key === 'stress' ? EMOJI_VOTO[6 - v] ?? null : EMOJI_VOTO[v] ?? null

const CAMPI = [
  { key: 'energia',    label: 'Energia' },
  { key: 'sonno',      label: 'Sonno' },
  { key: 'stress',     label: 'Stress', hint: '1 = basso · 5 = alto' },
  { key: 'motivazione', label: 'Motivazione' },
] as const

type CheckinKey = typeof CAMPI[number]['key']

export default function CheckinGate() {
  const router = useRouter()
  const supabase = createClient()

  const [voti, setVoti] = useState<Record<CheckinKey, number>>({
    energia: 0, sonno: 0, stress: 0, motivazione: 0,
  })
  const [willTrain, setWillTrain] = useState<boolean | null>(null)
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)

  const tuttiVoti = Object.values(voti).every(v => v > 0)
  const pronto = tuttiVoti && willTrain !== null

  const handleSubmit = async () => {
    if (!pronto || saving) return
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(false); return }

    await supabase.from('checkin').insert({
      cliente_id: user.id,
      energia: voti.energia,
      sonno: voti.sonno,
      stress: voti.stress,
      motivazione: voti.motivazione,
      will_train: willTrain,
      note: note.trim() || null,
    })

    setDone(true)
    setSaving(false)
    router.refresh()
  }

  if (done) return null

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center px-4"
      style={{ background: 'oklch(0 0 0 / 85%)', backdropFilter: 'blur(12px)' }}>
      <div
        className="w-full max-w-lg rounded-3xl p-6 space-y-5 overflow-y-auto"
        style={{
          background: 'oklch(0.13 0 0)',
          border: '1px solid oklch(1 0 0 / 10%)',
          maxHeight: '95dvh',
        }}>

        {/* Header */}
        <div className="text-center space-y-1 pb-1">
          <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'oklch(0.60 0.15 200)' }}>
            Check-in mattutino
          </p>
          <p className="text-2xl font-black" style={{ color: 'oklch(0.97 0 0)' }}>Come stai oggi?</p>
          <p className="text-sm" style={{ color: 'oklch(0.45 0 0)' }}>
            {new Date().toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>

        {/* Voti */}
        {CAMPI.map(campo => (
          <div key={campo.key} className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold" style={{ color: 'oklch(0.80 0 0)' }}>
                {campo.label}
              </label>
              {'hint' in campo && (
                <span className="text-xs" style={{ color: 'oklch(0.40 0 0)' }}>{campo.hint}</span>
              )}
            </div>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map(v => {
                const selected = voti[campo.key] === v
                const icon = getEmoji(campo.key, v)
                return (
                  <button
                    key={v}
                    onClick={() => setVoti(prev => ({ ...prev, [campo.key]: v }))}
                    className="flex-1 py-3.5 rounded-2xl text-xl transition-all active:scale-90"
                    style={{
                      background: selected ? 'oklch(0.60 0.15 200 / 20%)' : 'oklch(0.20 0 0)',
                      border: `2px solid ${selected ? 'oklch(0.60 0.15 200)' : 'transparent'}`,
                    }}>
                    {icon ? <FontAwesomeIcon icon={icon} /> : null}
                  </button>
                )
              })}
            </div>
          </div>
        ))}

        {/* Ti alleni oggi? */}
        <div className="space-y-2">
          <p className="text-sm font-semibold" style={{ color: 'oklch(0.80 0 0)' }}>Ti alleni oggi?</p>
          <div className="grid grid-cols-2 gap-3">
            {([
              { val: true,  label: '💪 Sì, mi alleno', color: 'oklch(0.70 0.19 46)',  bg: 'oklch(0.70 0.19 46 / 15%)' },
              { val: false, label: '😴 No, riposo',    color: 'oklch(0.60 0.15 200)', bg: 'oklch(0.60 0.15 200 / 12%)' },
            ] as const).map(opt => (
              <button
                key={String(opt.val)}
                onClick={() => setWillTrain(opt.val)}
                className="py-4 rounded-2xl text-sm font-bold transition-all active:scale-95"
                style={{
                  background: willTrain === opt.val ? opt.bg : 'oklch(0.20 0 0)',
                  border: `2px solid ${willTrain === opt.val ? opt.color : 'transparent'}`,
                  color: willTrain === opt.val ? opt.color : 'oklch(0.45 0 0)',
                }}>
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Note */}
        <div className="space-y-1.5">
          <label className="text-sm font-semibold" style={{ color: 'oklch(0.80 0 0)' }}>
            Note (opzionale)
          </label>
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="Come stai? Qualcosa da segnalare al coach?"
            rows={2}
            className="w-full px-4 py-3 rounded-xl text-sm outline-none resize-none"
            style={{
              background: 'oklch(0.20 0 0)',
              border: '1px solid oklch(1 0 0 / 8%)',
              color: 'oklch(0.97 0 0)',
            }}
          />
        </div>

        {/* Progresso compilazione */}
        <div className="flex gap-1.5">
          {CAMPI.map(campo => (
            <div key={campo.key} className="flex-1 h-1 rounded-full transition-all"
              style={{ background: voti[campo.key] > 0 ? 'oklch(0.60 0.15 200)' : 'oklch(0.25 0 0)' }} />
          ))}
          <div className="flex-1 h-1 rounded-full transition-all"
            style={{ background: willTrain !== null ? 'oklch(0.70 0.19 46)' : 'oklch(0.25 0 0)' }} />
        </div>

        {/* CTA */}
        <button
          onClick={handleSubmit}
          disabled={saving || !pronto}
          className="w-full py-4 rounded-2xl text-base font-black transition-all active:scale-95"
          style={{
            background: pronto ? 'oklch(0.70 0.19 46)' : 'oklch(0.20 0 0)',
            color: pronto ? 'oklch(0.11 0 0)' : 'oklch(0.35 0 0)',
            cursor: pronto ? 'pointer' : 'not-allowed',
          }}>
          {saving ? 'Un secondo...' : 'Inizia la giornata →'}
        </button>
      </div>
    </div>
  )
}
