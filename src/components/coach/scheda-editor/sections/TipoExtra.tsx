import FieldInput from '../shared/FieldInput'
import type { EsForm } from '../types'

export default function TipoExtra({ tipo, local, set }: {
  tipo: string; local: EsForm; set: (k: keyof EsForm, v: string) => void
}) {
  if (['normale', 'superset', 'giant_set', 'jump_set'].includes(tipo)) return null

  const wrap = (children: React.ReactNode) => (
    <div style={{
      marginTop: 10, padding: 10, borderRadius: 9,
      background: 'oklch(0.10 0 0 / 60%)', border: '1px solid var(--c-w4)',
      display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8,
    }}>{children}</div>
  )

  switch (tipo) {
    case 'dropset': return wrap(<>
      <FieldInput label="N. drop"  value={local.drop_count}      onChange={v => set('drop_count', v)} num />
      <FieldInput label="Drop %"   value={local.drop_pct}        onChange={v => set('drop_pct', v)} num suffix="%" />
    </>)
    case 'rest_pause': return wrap(<>
      <FieldInput label="Pausa (s)" value={local.rest_pause_sec} onChange={v => set('rest_pause_sec', v)} num />
    </>)
    case 'piramidale': return (
      <div style={{ marginTop: 10, padding: 10, borderRadius: 9, background: 'oklch(0.10 0 0 / 60%)', border: '1px solid var(--c-w4)' }}>
        <div style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: '0.1em', color: 'var(--c-55)', marginBottom: 6 }}>
          DIREZIONE
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {['ascendente', 'discendente', 'ascendente_discendente'].map(d => (
            <button key={d} onClick={() => set('piramide_dir', d)} style={{
              flex: 1, padding: '7px', borderRadius: 7,
              background: local.piramide_dir === d ? 'oklch(0.82 0.13 85 / 18%)' : 'var(--c-18)',
              color: local.piramide_dir === d ? 'oklch(0.85 0.13 85)' : 'var(--c-70)',
              fontSize: 10, fontWeight: 700,
            }}>{d.replace('_', ' ↔ ')}</button>
          ))}
        </div>
      </div>
    )
    case 'amrap': return wrap(<>
      <FieldInput label="Durata (min)" value={local.amrap_minuti}     onChange={v => set('amrap_minuti', v)} num />
    </>)
    case 'emom': return wrap(<>
      <FieldInput label="Reps/min"     value={local.emom_reps_per_minuto} onChange={v => set('emom_reps_per_minuto', v)} num />
      <FieldInput label="Durata (min)" value={local.emom_durata_minuti}   onChange={v => set('emom_durata_minuti', v)} num />
      <FieldInput label="Rounds"       value={local.emom_rounds}          onChange={v => set('emom_rounds', v)} num />
    </>)
    case 'tabata': return wrap(<>
      <FieldInput label="Work (s)"  value={local.tabata_work_secondi}  onChange={v => set('tabata_work_secondi', v)} num />
      <FieldInput label="Rest (s)"  value={local.tabata_rest_secondi}  onChange={v => set('tabata_rest_secondi', v)} num />
      <FieldInput label="Rounds"    value={local.tabata_rounds}         onChange={v => set('tabata_rounds', v)} num />
    </>)
    case 'max_reps': return wrap(<>
      <FieldInput label="Reps target" value={local.max_reps_target}    onChange={v => set('max_reps_target', v)} num />
    </>)
    default: return null
  }
}
