import FieldInput from '../shared/FieldInput'
import type { EsForm } from '../types'

export default function ParametriFields({ local, set, intensita, isTimer }: {
  local: EsForm
  set: (k: keyof EsForm, v: string) => void
  intensita?: 'rpe' | 'rir' | null
  isTimer?: boolean
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
        <FieldInput label="Serie"    value={local.serie}       onChange={v => set('serie', v)} num />
        <FieldInput label={isTimer ? 'Secondi' : 'Reps'} value={local.ripetizioni} onChange={v => set('ripetizioni', v)} />
        <FieldInput label="Rec. (s)" value={local.recupero}   onChange={v => set('recupero', v)} num />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <FieldInput label="Peso consigliato (kg)" value={local.peso_consigliato_kg} placeholder="es. 60" onChange={v => set('peso_consigliato_kg', v)} />
        <FieldInput label="TUT"                    value={local.tut}                  placeholder="3-1-2-0"  onChange={v => set('tut', v)} />
      </div>
      {isTimer && (
        <FieldInput label="Pre-countdown (s)" value={local.prepara_secondi} placeholder="0" onChange={v => set('prepara_secondi', v)} num />
      )}
      {intensita && (
        <FieldInput
          label={intensita.toUpperCase()}
          value={(local as any)[intensita] || ''}
          onChange={v => set(intensita as keyof EsForm, v)}
          placeholder={intensita === 'rpe' ? 'es. 8' : 'es. 2'}
          num
        />
      )}
    </div>
  )
}
