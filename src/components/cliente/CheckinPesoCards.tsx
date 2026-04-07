'use client'

import { useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faFaceTired, faFaceFrown, faFaceMeh, faFaceSmile, faFaceGrinStars,
  faCircleCheck, faWeightScale, faHeartPulse, faXmark,
} from '@fortawesome/free-solid-svg-icons'
import { IconDefinition } from '@fortawesome/fontawesome-svg-core'

const EMOJI_VOTO: (IconDefinition | null)[] = [null, faFaceTired, faFaceFrown, faFaceMeh, faFaceSmile, faFaceGrinStars]

const getEmojiCheckin = (key: string, value: number): IconDefinition | null =>
  key === 'stress' ? EMOJI_VOTO[6 - value] ?? null : EMOJI_VOTO[value] ?? null

const CHECKIN_CAMPI = [
  { key: 'energia',     label: 'Energia' },
  { key: 'sonno',       label: 'Sonno' },
  { key: 'stress',      label: 'Stress', hint: '1 = basso · 5 = alto' },
  { key: 'motivazione', label: 'Motivazione' },
] as const

type CheckinKey = typeof CHECKIN_CAMPI[number]['key']

interface Props {
  checkinFatto: boolean
  willTrain: boolean | null
  ultimoPeso: number | null
  ultimoPesoData: string | null
}

export default function CheckinPesoCards({
  checkinFatto: checkinFattoInit,
  willTrain: willTrainInit,
  ultimoPeso,
  ultimoPesoData,
}: Props) {
  const supabase = useMemo(() => createClient(), [])

  const [checkinFatto, setCheckinFatto] = useState(checkinFattoInit)
  const [openModal, setOpenModal] = useState<'checkin' | 'peso' | null>(null)
  const [saving, setSaving] = useState(false)

  // Check-in form
  const [checkin, setCheckin] = useState<Record<CheckinKey, number>>({
    energia: 0, sonno: 0, stress: 0, motivazione: 0,
  })
  const [willTrain, setWillTrain] = useState<boolean | null>(null)
  const [noteCheckin, setNoteCheckin] = useState('')

  // Peso form
  const [nuovoPeso, setNuovoPeso] = useState('')
  const [pesoSalvato, setPesoSalvato] = useState(ultimoPeso)
  const [pesoSalvatoData, setPesoSalvatoData] = useState(ultimoPesoData)

  const checkinCompleto = Object.values(checkin).every(v => v > 0) && willTrain !== null

  const handleSaveCheckin = async () => {
    if (!checkinCompleto) return
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(false); return }
    await supabase.from('checkin').insert({
      cliente_id: user.id,
      energia: checkin.energia,
      sonno: checkin.sonno,
      stress: checkin.stress,
      motivazione: checkin.motivazione,
      will_train: willTrain,
      note: noteCheckin.trim() || null,
    })
    setCheckinFatto(true)
    setOpenModal(null)
    setSaving(false)
  }

  const handleSavePeso = async () => {
    const peso = parseFloat(nuovoPeso.replace(',', '.'))
    if (!peso || peso < 20 || peso > 300) return
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(false); return }
    const { error } = await supabase.from('misurazioni').insert({
      cliente_id: user.id,
      peso_kg: peso,
    })
    if (!error) {
      setPesoSalvato(peso)
      setPesoSalvatoData(new Date().toISOString())
      setNuovoPeso('')
      setOpenModal(null)
    }
    setSaving(false)
  }

  const pesoDataLabel = pesoSalvatoData
    ? new Date(pesoSalvatoData).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })
    : null

  // Etichetta will_train per la card completata
  const willTrainLabel = willTrainInit === true
    ? '💪 Alleni oggi'
    : willTrainInit === false
      ? '😴 Riposo oggi'
      : null

  return (
    <>
      <div className="grid grid-cols-2 gap-4">
        {/* Card check-in */}
        <button
          onClick={() => !checkinFatto && setOpenModal('checkin')}
          className="rounded-2xl p-5 text-left transition-all active:scale-95"
          style={{
            background: checkinFatto ? 'oklch(0.65 0.18 150 / 10%)' : 'oklch(0.18 0 0)',
            border: `1px solid ${checkinFatto ? 'oklch(0.65 0.18 150 / 35%)' : 'oklch(0.60 0.15 200 / 40%)'}`,
            cursor: checkinFatto ? 'default' : 'pointer',
          }}>
          <div className="flex items-center justify-between mb-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{
                background: checkinFatto ? 'oklch(0.65 0.18 150 / 20%)' : 'oklch(0.60 0.15 200 / 15%)',
                color: checkinFatto ? 'oklch(0.65 0.18 150)' : 'oklch(0.60 0.15 200)',
              }}>
              <FontAwesomeIcon icon={checkinFatto ? faCircleCheck : faHeartPulse} />
            </div>
            {!checkinFatto && (
              <span className="text-xs px-2 py-1 rounded-full font-semibold"
                style={{ background: 'oklch(0.60 0.15 200 / 15%)', color: 'oklch(0.60 0.15 200)' }}>
                da fare
              </span>
            )}
          </div>
          <p className="text-sm font-bold" style={{ color: 'oklch(0.97 0 0)' }}>Check-in</p>
          <p className="text-xs mt-1" style={{ color: checkinFatto ? 'oklch(0.65 0.18 150)' : 'oklch(0.50 0 0)' }}>
            {checkinFatto
              ? (willTrainLabel ?? '✓ Completato oggi')
              : 'Come stai oggi?'}
          </p>
        </button>

        {/* Card peso */}
        <button
          onClick={() => setOpenModal('peso')}
          className="rounded-2xl p-5 text-left transition-all active:scale-95"
          style={{
            background: pesoSalvato ? 'oklch(0.70 0.19 46 / 8%)' : 'oklch(0.18 0 0)',
            border: `1px solid ${pesoSalvato ? 'oklch(0.70 0.19 46 / 35%)' : 'oklch(0.70 0.19 46 / 30%)'}`,
          }}>
          <div className="flex items-center justify-between mb-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: 'oklch(0.70 0.19 46 / 15%)', color: 'oklch(0.70 0.19 46)' }}>
              <FontAwesomeIcon icon={faWeightScale} />
            </div>
            {pesoSalvato && (
              <span className="text-xs px-2 py-1 rounded-full font-semibold"
                style={{ background: 'oklch(0.70 0.19 46 / 15%)', color: 'oklch(0.70 0.19 46)' }}>
                {pesoDataLabel}
              </span>
            )}
          </div>
          <p className="text-sm font-bold" style={{ color: 'oklch(0.97 0 0)' }}>Peso</p>
          <p className="text-xs mt-1" style={{ color: pesoSalvato ? 'oklch(0.70 0.19 46)' : 'oklch(0.50 0 0)' }}>
            {pesoSalvato ? `${pesoSalvato} kg` : 'Registra il tuo peso'}
          </p>
        </button>
      </div>

      {/* ── Modal check-in ── */}
      {openModal === 'checkin' && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center"
          style={{ background: 'oklch(0 0 0 / 65%)', backdropFilter: 'blur(8px)' }}
          onClick={() => setOpenModal(null)}>
          <div
            className="w-full max-w-2xl rounded-t-3xl p-6 space-y-5"
            style={{ background: 'oklch(0.15 0 0)', border: '1px solid oklch(1 0 0 / 8%)' }}
            onClick={e => e.stopPropagation()}>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest mb-0.5" style={{ color: 'oklch(0.60 0.15 200)' }}>
                  Check-in giornaliero
                </p>
                <p className="font-bold text-lg" style={{ color: 'oklch(0.97 0 0)' }}>Come stai oggi?</p>
              </div>
              <button onClick={() => setOpenModal(null)}
                className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{ background: 'oklch(0.22 0 0)', color: 'oklch(0.55 0 0)' }}>
                <FontAwesomeIcon icon={faXmark} />
              </button>
            </div>

            {CHECKIN_CAMPI.map(campo => (
              <div key={campo.key} className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium" style={{ color: 'oklch(0.80 0 0)' }}>{campo.label}</label>
                  {'hint' in campo && (
                    <span className="text-xs" style={{ color: 'oklch(0.45 0 0)' }}>{campo.hint}</span>
                  )}
                </div>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map(v => (
                    <button key={v}
                      onClick={() => setCheckin(p => ({ ...p, [campo.key]: v }))}
                      className="flex-1 py-3 rounded-xl text-xl transition-all active:scale-95"
                      style={{
                        background: checkin[campo.key] === v ? 'oklch(0.60 0.15 200 / 20%)' : 'oklch(0.22 0 0)',
                        border: checkin[campo.key] === v ? '2px solid oklch(0.60 0.15 200)' : '2px solid transparent',
                      }}>
                      {getEmojiCheckin(campo.key, v)
                        ? <FontAwesomeIcon icon={getEmojiCheckin(campo.key, v)!} />
                        : null}
                    </button>
                  ))}
                </div>
              </div>
            ))}

            {/* Ti alleni oggi? */}
            <div className="space-y-2">
              <p className="text-sm font-medium" style={{ color: 'oklch(0.80 0 0)' }}>Ti alleni oggi?</p>
              <div className="grid grid-cols-2 gap-2">
                {([
                  { val: true,  label: '💪 Sì', color: 'oklch(0.70 0.19 46)',  bg: 'oklch(0.70 0.19 46 / 15%)' },
                  { val: false, label: '😴 No', color: 'oklch(0.60 0.15 200)', bg: 'oklch(0.60 0.15 200 / 12%)' },
                ] as const).map(opt => (
                  <button key={String(opt.val)}
                    onClick={() => setWillTrain(opt.val)}
                    className="py-3 rounded-xl text-sm font-bold transition-all active:scale-95"
                    style={{
                      background: willTrain === opt.val ? opt.bg : 'oklch(0.22 0 0)',
                      border: `2px solid ${willTrain === opt.val ? opt.color : 'transparent'}`,
                      color: willTrain === opt.val ? opt.color : 'oklch(0.45 0 0)',
                    }}>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium" style={{ color: 'oklch(0.80 0 0)' }}>Note (opzionale)</label>
              <textarea
                value={noteCheckin}
                onChange={e => setNoteCheckin(e.target.value)}
                placeholder="Come stai? Qualcosa da segnalare al coach?"
                rows={2}
                className="w-full px-4 py-3 rounded-xl text-sm outline-none resize-none"
                style={{ background: 'oklch(0.22 0 0)', border: '1px solid oklch(1 0 0 / 8%)', color: 'oklch(0.97 0 0)' }}
                onFocus={e => e.target.style.borderColor = 'oklch(0.60 0.15 200)'}
                onBlur={e => e.target.style.borderColor = 'oklch(1 0 0 / 8%)'}
              />
            </div>

            <button
              onClick={handleSaveCheckin}
              disabled={saving || !checkinCompleto}
              className="w-full py-3.5 rounded-xl text-sm font-bold transition-all active:scale-95"
              style={{
                background: checkinCompleto ? 'oklch(0.60 0.15 200)' : 'oklch(0.22 0 0)',
                color: checkinCompleto ? 'oklch(0.13 0 0)' : 'oklch(0.40 0 0)',
                cursor: checkinCompleto ? 'pointer' : 'not-allowed',
              }}>
              {saving ? 'Salvataggio...' : 'Invia check-in'}
            </button>
          </div>
        </div>
      )}

      {/* ── Modal peso ── */}
      {openModal === 'peso' && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center"
          style={{ background: 'oklch(0 0 0 / 65%)', backdropFilter: 'blur(8px)' }}
          onClick={() => setOpenModal(null)}>
          <div
            className="w-full max-w-2xl rounded-t-3xl p-6 space-y-5"
            style={{ background: 'oklch(0.15 0 0)', border: '1px solid oklch(1 0 0 / 8%)' }}
            onClick={e => e.stopPropagation()}>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest mb-0.5" style={{ color: 'oklch(0.70 0.19 46)' }}>
                  Peso corporeo
                </p>
                <p className="font-bold text-lg" style={{ color: 'oklch(0.97 0 0)' }}>
                  {pesoSalvato ? `Ultimo: ${pesoSalvato} kg` : 'Inserisci il tuo peso'}
                </p>
              </div>
              <button onClick={() => setOpenModal(null)}
                className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{ background: 'oklch(0.22 0 0)', color: 'oklch(0.55 0 0)' }}>
                <FontAwesomeIcon icon={faXmark} />
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium" style={{ color: 'oklch(0.80 0 0)' }}>Peso (kg)</label>
              <input
                type="number"
                inputMode="decimal"
                value={nuovoPeso}
                onChange={e => setNuovoPeso(e.target.value)}
                placeholder={pesoSalvato ? String(pesoSalvato) : '70.0'}
                className="w-full px-4 py-4 rounded-xl text-3xl font-black outline-none text-center"
                style={{ background: 'oklch(0.22 0 0)', border: '1px solid oklch(0.70 0.19 46 / 40%)', color: 'oklch(0.97 0 0)' }}
                onFocus={e => e.target.style.borderColor = 'oklch(0.70 0.19 46)'}
                onBlur={e => e.target.style.borderColor = 'oklch(0.70 0.19 46 / 40%)'}
                autoFocus
              />
            </div>

            <button
              onClick={handleSavePeso}
              disabled={saving || !nuovoPeso}
              className="w-full py-3.5 rounded-xl text-sm font-bold transition-all active:scale-95"
              style={{
                background: nuovoPeso ? 'oklch(0.70 0.19 46)' : 'oklch(0.22 0 0)',
                color: nuovoPeso ? 'oklch(0.13 0 0)' : 'oklch(0.40 0 0)',
                cursor: nuovoPeso ? 'pointer' : 'not-allowed',
              }}>
              {saving ? 'Salvataggio...' : 'Salva peso'}
            </button>
          </div>
        </div>
      )}
    </>
  )
}
