export interface AnamnesIData {
  eta?: number | null
  altezza_cm?: number | null
  sesso?: 'M' | 'F' | null
  occupazione?: string | null
  ore_piedi_giorno?: number | null
  ore_seduto_giorno?: number | null
  ore_sonno?: number | null
  qualita_sonno?: number | null
  allenamenti_settimana?: number | null
  durata_allenamento_minuti?: number | null
  orario_allenamento?: string | null
  patologie?: string | null
  intolleranze?: string | null
  farmaci?: boolean | null
  farmaci_dettaglio?: string | null
  descrizione_caratteriale?: string | null
}

export interface NotaAnamnesi {
  testo: string
  tipo: 'warning' | 'info' | 'tip'
}

export function generateNoteAnamnesi(a: AnamnesIData): NotaAnamnesi[] {
  const note: NotaAnamnesi[] = []

  // ── Patologie ─────────────────────────────────────────────────────
  if (a.patologie) {
    const p = a.patologie.toLowerCase()

    if (/lombar|lombo|schiena|ernia|disco|vertebr|colonna/.test(p)) {
      note.push({ tipo: 'warning', testo: 'Problemi lombari/schiena riferiti — evitare stacchi e squat pesanti nelle prime settimane, priorità core stability e mobilità' })
    }
    if (/ginocch|menisco|crociato|rotula|patella/.test(p)) {
      note.push({ tipo: 'warning', testo: 'Problemi al ginocchio — evitare leg press profondo e squat full ROM, valutare catena cinetica aperta' })
    }
    if (/spalla|rotator|cuffi|sovraspinato|glenoumer/.test(p)) {
      note.push({ tipo: 'warning', testo: 'Problemi alla spalla — limitare overhead press, valutare ampiezza ROM su movimenti di spinta' })
    }
    if (/cardio|cuore|pressione|ipertension|aritmia/.test(p)) {
      note.push({ tipo: 'warning', testo: 'Patologia cardiovascolare riferita — evitare intensità massimale, monitorare frequenza cardiaca' })
    }
    if (/diabete|diabetic|glicemia/.test(p)) {
      note.push({ tipo: 'warning', testo: 'Diabete riferito — attenzione al timing nutrizionale pre/post allenamento, evitare digiuno prolungato' })
    }
    if (/anca|coxartrosi|femore/.test(p)) {
      note.push({ tipo: 'warning', testo: 'Problemi all\'anca — limitare ROM in abduzione/adduzione, evitare squat profondi inizialmente' })
    }
    if (!/lombar|lombo|schiena|ernia|disco|vertebr|colonna|ginocch|menisco|crociato|spalla|rotator|cuffi|cardio|cuore|pressione|ipertension|diabete|anca|coxartrosi/.test(p)) {
      note.push({ tipo: 'info', testo: `Patologie/infortuni riferiti: "${a.patologie}" — valutare attentamente la programmazione iniziale` })
    }
  }

  // ── Farmaci ───────────────────────────────────────────────────────
  if (a.farmaci) {
    const det = a.farmaci_dettaglio ? ` (${a.farmaci_dettaglio})` : ''
    note.push({ tipo: 'info', testo: `In assunzione farmaci${det} — valutare impatto su performance, recupero e idratazione` })
  }

  // ── Stile di vita sedentario ──────────────────────────────────────
  if (a.ore_seduto_giorno && a.ore_seduto_giorno >= 7) {
    note.push({ tipo: 'tip', testo: `Stile di vita sedentario (${a.ore_seduto_giorno}h seduto/giorno) — inserire mobilità anca, toracica e spalle nel warmup` })
  }

  // ── Esperienza allenamento ────────────────────────────────────────
  if (a.allenamenti_settimana !== null && a.allenamenti_settimana !== undefined) {
    if (a.allenamenti_settimana === 0) {
      note.push({ tipo: 'tip', testo: 'Nessuna esperienza allenamento pregressa — iniziare con volume ridotto e alta frequenza tecnica, focus sulla corretta esecuzione' })
    } else if (a.allenamenti_settimana <= 2) {
      note.push({ tipo: 'tip', testo: `Bassa frequenza pregressa (${a.allenamenti_settimana}x/settimana) — progressione graduale, evitare DOMS eccessivo nelle prime 2-3 settimane` })
    }
  }

  // ── Sonno insufficiente ───────────────────────────────────────────
  if (a.ore_sonno) {
    if (a.ore_sonno < 6) {
      note.push({ tipo: 'warning', testo: `Sonno insufficiente (${a.ore_sonno}h) — recupero compromesso, evitare volume eccessivo e anticipare deload se necessario` })
    } else if (a.qualita_sonno && a.qualita_sonno <= 2) {
      note.push({ tipo: 'info', testo: 'Qualità del sonno bassa riferita — monitorare i check-in per segnali di overtraining' })
    }
  }

  // ── Intolleranze ─────────────────────────────────────────────────
  if (a.intolleranze) {
    note.push({ tipo: 'info', testo: `Intolleranze/allergie: "${a.intolleranze}" — da coordinare con piano nutrizionale` })
  }

  // ── Carattere ────────────────────────────────────────────────────
  if (a.descrizione_caratteriale) {
    const c = a.descrizione_caratteriale.toLowerCase()
    if (/ansiosa|ansioso|stress|agitat|nervos/.test(c)) {
      note.push({ tipo: 'tip', testo: 'Profilo ansioso/stressato — preferire sessioni strutturate con recupero fisso, evitare AMRAP e metodi ad alta intensità percepita inizialmente' })
    }
    if (/pigra|pigro|procrastin|scarsa motivaz/.test(c)) {
      note.push({ tipo: 'tip', testo: 'Motivazione tendenzialmente bassa riferita — sessioni brevi e dense, check-in frequenti, obiettivi a breve termine' })
    }
  }

  // ── Età ───────────────────────────────────────────────────────────
  if (a.eta && a.eta >= 50) {
    note.push({ tipo: 'tip', testo: `Età ${a.eta} anni — priorità mobilità articolare, recupero inter-set più lungo (2-3 min), progressione dei carichi più graduale` })
  }

  return note
}

// Calcolo TDEE (formula Mifflin-St Jeor)
export function stimaTDEE(a: AnamnesIData, pesoKg: number): number | null {
  if (!a.eta || !a.altezza_cm || !pesoKg) return null

  let bmr: number
  if (a.sesso === 'M') {
    bmr = 10 * pesoKg + 6.25 * a.altezza_cm - 5 * a.eta + 5
  } else if (a.sesso === 'F') {
    bmr = 10 * pesoKg + 6.25 * a.altezza_cm - 5 * a.eta - 161
  } else {
    // Senza sesso: media M/F
    const bmrM = 10 * pesoKg + 6.25 * a.altezza_cm - 5 * a.eta + 5
    const bmrF = 10 * pesoKg + 6.25 * a.altezza_cm - 5 * a.eta - 161
    bmr = (bmrM + bmrF) / 2
  }

  // Fattore attività basato su allenamenti/settimana
  const freq = a.allenamenti_settimana ?? 0
  let pal = 1.2 // sedentario
  if (freq <= 1) pal = 1.2
  else if (freq <= 3) pal = 1.375
  else if (freq <= 5) pal = 1.55
  else pal = 1.725

  // Aggiustamento per lavoro fisico
  if (a.ore_piedi_giorno && a.ore_piedi_giorno >= 6) pal = Math.min(pal + 0.1, 1.9)
  if (a.ore_seduto_giorno && a.ore_seduto_giorno >= 8) pal = Math.max(pal - 0.05, 1.2)

  return Math.round(bmr * pal)
}
