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
  giornata_alimentare_esempio?: string | null
}

export interface NotaAnamnesi {
  testo: string
  tipo: 'warning' | 'info' | 'tip'
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function calcBMI(peso: number, altezza_cm: number): number {
  return peso / Math.pow(altezza_cm / 100, 2)
}

function match(testo: string | null | undefined, pattern: RegExp): boolean {
  if (!testo) return false
  return pattern.test(testo.toLowerCase())
}

// ── Algoritmo principale ──────────────────────────────────────────────────────

export function generateNoteAnamnesi(a: AnamnesIData, pesoKg?: number): NotaAnamnesi[] {
  const note: NotaAnamnesi[] = []

  const eta = a.eta ?? null
  const freq = a.allenamenti_settimana ?? null
  const ore_sonno = a.ore_sonno ?? null
  const ore_seduto = a.ore_seduto_giorno ?? null
  const occ = (a.occupazione ?? '').toLowerCase()
  const car = (a.descrizione_caratteriale ?? '').toLowerCase()
  const pat = (a.patologie ?? '').toLowerCase()
  const alim = (a.giornata_alimentare_esempio ?? '').toLowerCase()

  // ── 1. ETA ────────────────────────────────────────────────────────────────

  if (eta !== null) {
    if (eta < 16) {
      note.push({ tipo: 'warning', testo: `Cliente giovanissimo (${eta} anni) — privilegiare esercizi a corpo libero, schemi motori e coordinazione. Evitare carichi elevati su colonna vertebrale e articolazioni in crescita` })
    } else if (eta >= 16 && eta < 18) {
      note.push({ tipo: 'info', testo: `Minorenne (${eta} anni) — verificare consenso genitoriale. Progredire sui carichi con cautela, scheletro ancora in sviluppo` })
    } else if (eta >= 60 && eta < 70) {
      note.push({ tipo: 'tip', testo: `Età ${eta} anni — recupero inter-set più lungo (2-3 min), mobilità articolare prioritaria nel warmup, progressione carichi più graduale` })
    } else if (eta >= 70) {
      note.push({ tipo: 'warning', testo: `Età avanzata (${eta} anni) — priorità assoluta a equilibrio, mobilità e prevenzione cadute. Carichi moderati, massima attenzione alla tecnica esecutiva` })
    }
  }

  // ── 2. BMI ────────────────────────────────────────────────────────────────

  if (pesoKg && a.altezza_cm) {
    const bmi = calcBMI(pesoKg, a.altezza_cm)
    if (bmi < 17.5) {
      note.push({ tipo: 'warning', testo: `BMI molto basso (${bmi.toFixed(1)}) — valutare stato nutrizionale prima di programmare. Evitare deficit calorici, priorità all'apporto proteico e calorico adeguato` })
    } else if (bmi < 18.5) {
      note.push({ tipo: 'info', testo: `Sottopeso (BMI ${bmi.toFixed(1)}) — considerare surplus calorico lieve. Scheda orientata alla costruzione muscolare con progressione graduale` })
    } else if (bmi >= 30 && bmi < 35) {
      note.push({ tipo: 'tip', testo: `Sovrappeso moderato (BMI ${bmi.toFixed(1)}) — combinare forza e cardio. Attenzione al carico articolare, valutare varianti meno impattanti inizialmente` })
    } else if (bmi >= 35) {
      note.push({ tipo: 'warning', testo: `Obesità (BMI ${bmi.toFixed(1)}) — ridurre stress articolare, privilegiare esercizi in scarico (cyclette, lat machine). Progressione molto graduale` })
    }
  }

  // ── 3. PATOLOGIE ──────────────────────────────────────────────────────────

  if (a.patologie && pat !== 'nessuna' && pat.trim() !== '') {

    if (match(pat, /lombar|lombo|schiena|ernia|disco|vertebr|colonna|sciatic/)) {
      note.push({ tipo: 'warning', testo: 'Problemi lombari/schiena — evitare stacchi da terra e squat pesanti nelle prime settimane, priorità core stability (plank, dead bug, bird-dog) e mobilità toracica' })
    }
    if (match(pat, /ginocch|menisco|crociato|rotula|patella|condromalac/)) {
      note.push({ tipo: 'warning', testo: 'Problemi al ginocchio — evitare leg press profondo e squat full ROM, preferire catena cinetica aperta a ROM ridotto. Rinforzare quadricipiti e glutei in scarico' })
    }
    if (match(pat, /spalla|rotator|cuffi|sovraspinato|glenoumer|lussaz/)) {
      note.push({ tipo: 'warning', testo: 'Problemi alla spalla — limitare overhead press e movimenti oltre 90° di abduzione. Rinforzare cuffia dei rotatori con esercizi di rotazione esterna' })
    }
    if (match(pat, /ipertension|pressione alta/)) {
      note.push({ tipo: 'warning', testo: 'Ipertensione — evitare isometrie prolungate e manovre di Valsalva. Serie da 12-15 reps con recuperi lunghi (2+ min). Monitorare la FC durante la sessione' })
    }
    if (match(pat, /cardio|cuore|aritmia|fibrillaz|angina|infarto/)) {
      note.push({ tipo: 'warning', testo: 'Patologia cardiovascolare — intensità massimale controindicata. Richiedere certificato medico per attività sportiva. Monitorare FC, evitare picchi di intensità' })
    }
    if (match(pat, /diabete|diabetic|glicemia/)) {
      note.push({ tipo: 'warning', testo: 'Diabete — pasto 1-2h prima dell\'allenamento, spuntino proteico post-workout. Monitorare sintomi di ipoglicemia durante la sessione' })
    }
    if (match(pat, /artrosi|artrite/)) {
      note.push({ tipo: 'warning', testo: 'Artrosi/artrite — privilegiare esercizi a basso impatto, evitare carichi elevati sulle articolazioni interessate. Riscaldamento prolungato, ROM ridotto nelle fasi acute' })
    }
    if (match(pat, /anca|coxartrosi/)) {
      note.push({ tipo: 'warning', testo: 'Problemi all\'anca — limitare abduzione profonda, evitare squat profondi. Rinforzare gluteo medio e piccolo, esercizi di stabilizzazione pelvica' })
    }
    if (match(pat, /asma|bronchite|polmon/)) {
      note.push({ tipo: 'info', testo: 'Problemi respiratori — riscaldamento graduale obbligatorio, evitare sforzi massimali prolungati. Verificare disponibilità broncodilatatore prima della sessione' })
    }
    if (match(pat, /tiroid/)) {
      note.push({ tipo: 'info', testo: 'Problemi tiroidei — metabolismo basale alterato. Calibrare piano nutrizionale e intensità dell\'allenamento con l\'endocrinologo' })
    }

    const patologieRiconosciute = /lombar|lombo|schiena|ernia|disco|vertebr|colonna|sciatic|ginocch|menisco|crociato|rotula|patella|spalla|rotator|cuffi|ipertension|pressione alta|cardio|cuore|aritmia|diabete|artrosi|artrite|anca|coxartrosi|asma|bronchite|tiroid|nessuna/
    if (!patologieRiconosciute.test(pat)) {
      note.push({ tipo: 'info', testo: `Patologia/infortunio riferito: "${a.patologie}" — valutare attentamente prima di programmare. Considerare parere medico se necessario` })
    }
  }

  // ── 4. FARMACI ────────────────────────────────────────────────────────────

  if (a.farmaci) {
    const det = a.farmaci_dettaglio
    if (det) {
      const d = det.toLowerCase()
      if (match(d, /beta.*block|bisoprolol|metoprolol|atenolol/)) {
        note.push({ tipo: 'warning', testo: `Beta-bloccante (${det}) — la FC non è un indicatore affidabile dell'intensità. Usare scala RPE. La risposta cardiaca all'esercizio è attenuata` })
      } else if (match(d, /cortisonico|cortisone|prednison|deflazacort/)) {
        note.push({ tipo: 'warning', testo: `Corticosteroidi (${det}) — rischio fragilità ossea e muscolare aumentato. Progressione molto graduale, attenzione a dolori articolari` })
      } else if (match(d, /antidepress|ssri|sertralina|paroxetin|fluoxetin/)) {
        note.push({ tipo: 'info', testo: `Antidepressivi (${det}) — l'esercizio regolare supporta l'effetto terapeutico. Possibile fatica iniziale, progressione graduale` })
      } else {
        note.push({ tipo: 'info', testo: `In assunzione di ${det} — valutare impatto su performance e recupero. Verificare eventuali controindicazioni all'attività fisica` })
      }
    } else {
      note.push({ tipo: 'info', testo: 'In assunzione di farmaci (non specificati) — chiedere dettagli per valutare impatto su allenamento e recupero' })
    }
  }

  // ── 5. SONNO ──────────────────────────────────────────────────────────────

  if (ore_sonno !== null) {
    if (ore_sonno <= 4) {
      if (freq !== null && freq >= 4) {
        note.push({ tipo: 'warning', testo: `Sonno molto ridotto (${ore_sonno}h) + alta frequenza (${freq}x/settimana) — rischio overtraining elevato. Ridurre il volume, inserire deload, monitorare attentamente i check-in` })
      } else {
        note.push({ tipo: 'warning', testo: `Sonno molto ridotto (${ore_sonno}h) — recupero fortemente compromesso. Volume moderato, sessioni brevi e dense` })
      }
    } else if (ore_sonno <= 5) {
      note.push({ tipo: 'warning', testo: `Sonno insufficiente (${ore_sonno}h) — recupero compromesso. Mantenere volume moderato, monitorare energia nei check-in` })
    } else if (a.qualita_sonno !== null && a.qualita_sonno !== undefined && a.qualita_sonno <= 2) {
      note.push({ tipo: 'info', testo: 'Qualità del sonno bassa — anche con ore sufficienti il recupero può essere inadeguato. Monitorare energia e motivazione nei check-in' })
    }
  }

  // ── 6. STILE DI VITA ──────────────────────────────────────────────────────

  if (ore_seduto !== null && ore_seduto >= 8) {
    note.push({ tipo: 'tip', testo: `Lavoro molto sedentario (${ore_seduto}h/giorno) — inserire mobilità anca, toracica e spalle nel warmup. Attivazione glutei obbligatoria (spesso inibiti da postura seduta prolungata)` })
  } else if (ore_seduto !== null && ore_seduto >= 6) {
    note.push({ tipo: 'tip', testo: `Lavoro sedentario (${ore_seduto}h/giorno) — priorità mobilità anca e toracica nel riscaldamento` })
  }

  if (match(occ, /pensionat/)) {
    note.push({ tipo: 'tip', testo: 'Pensionato — disponibilità oraria elevata, ottimo per allenamenti mattutini. Considera attività di gruppo per aumentare socializzazione e aderenza' })
  }
  if (match(occ, /operaio|manovale|edile|magazzin|corriere/)) {
    note.push({ tipo: 'info', testo: 'Lavoro fisicamente impegnativo — considerare il carico lavorativo nel volume settimanale totale. Sessioni post-lavoro potrebbero trovare il cliente già affaticato' })
  }

  // ── 7. ESPERIENZA ────────────────────────────────────────────────────────

  if (freq !== null) {
    if (freq === 0) {
      note.push({ tipo: 'tip', testo: 'Nessuna esperienza pregressa — iniziare con 2-3 sessioni/settimana, volume ridotto, focus sulla tecnica. Normalizzare il DOMS con il cliente nelle prime settimane' })
    } else if (freq <= 2) {
      note.push({ tipo: 'tip', testo: `Bassa frequenza pregressa (${freq}x/settimana) — progressione graduale nelle prime 4 settimane, non aumentare volume e intensità contemporaneamente` })
    } else if (freq >= 6) {
      note.push({ tipo: 'info', testo: `Alta frequenza pregressa (${freq}x/settimana) — verificare presenza di giorni di recupero. Potrebbe essere necessario un deload iniziale` })
    }
  }

  // ── 8. ALIMENTAZIONE ─────────────────────────────────────────────────────

  if (alim) {
    if (match(alim, /disordinat|saltando|un pasto/)) {
      note.push({ tipo: 'tip', testo: 'Alimentazione disordinata riferita — strutturare orari fissi è prioritario quanto la scheda. Saltare i pasti compromette recupero e composizione corporea' })
    }
    if (match(alim, /processati|junk|fast food|merendine|frittur/)) {
      note.push({ tipo: 'tip', testo: 'Alimentazione ricca di cibi processati — lavorare sull\'educazione alimentare di base prima del dettaglio macro' })
    }
  }

  // ── 9. COMBINAZIONI DI RISCHIO ───────────────────────────────────────────

  if (eta !== null && eta >= 60 && match(pat, /ipertension/) && a.farmaci) {
    note.push({ tipo: 'warning', testo: 'Profilo ad alto rischio cardiovascolare (età avanzata + ipertensione + farmaci) — richiedere certificato medico per attività sportiva, intensità bassa-moderata, mai sforzi massimali' })
  }

  if (ore_sonno !== null && ore_sonno <= 5 && match(car, /stress|ansios|agitat/)) {
    note.push({ tipo: 'warning', testo: 'Combinazione critica: sonno ridotto + profilo stressato — rischio burnout elevato. Privilegiare sessioni di intensità media, inserire recupero attivo e stretching' })
  }

  // ── 10. CARATTERE ────────────────────────────────────────────────────────

  if (car) {
    if (match(car, /ansios|stress|agitat|nervos/)) {
      note.push({ tipo: 'tip', testo: 'Profilo ansioso/stressato — sessioni strutturate con recuperi fissi e progressioni chiare. Evitare AMRAP e metodi ad alta percezione dello sforzo nelle prime settimane' })
    }
    if (match(car, /pigr|procrastin|scarsa motivaz|demotivat/)) {
      note.push({ tipo: 'tip', testo: 'Tendenza alla demotivazione — sessioni brevi e dense (max 60 min), obiettivi settimanali misurabili, feedback frequenti sui progressi' })
    }
    if (match(car, /introvert/)) {
      note.push({ tipo: 'tip', testo: 'Profilo introverso — schede autonome senza dipendenza da partner. Check-in via chat funziona meglio delle chiamate' })
    }
    if (match(car, /energic|dinamico/)) {
      note.push({ tipo: 'tip', testo: 'Profilo energico e dinamico — gestisce bene alta intensità e varietà. Variare periodicamente per evitare noia, attenzione alla tendenza a voler fare troppo' })
    }
    if (match(car, /competitiv/)) {
      note.push({ tipo: 'tip', testo: 'Profilo competitivo — usare i dati di progressione come leva motivazionale. Enfatizzare il valore del recupero per evitare overtraining da eccesso di ambizione' })
    }
  }

  // ── 11. INTOLLERANZE ────────────────────────────────────────────────────

  if (a.intolleranze && !match(a.intolleranze, /^nessun/)) {
    note.push({ tipo: 'info', testo: `Intolleranze/allergie: ${a.intolleranze} — da considerare nel piano nutrizionale, specialmente nelle fonti proteiche` })
  }

  return note
}

// ── TDEE (formula Mifflin-St Jeor) ───────────────────────────────────────────

export function stimaTDEE(a: AnamnesIData, pesoKg: number): number | null {
  if (!a.eta || !a.altezza_cm || !pesoKg) return null

  let bmr: number
  if (a.sesso === 'M') {
    bmr = 10 * pesoKg + 6.25 * a.altezza_cm - 5 * a.eta + 5
  } else if (a.sesso === 'F') {
    bmr = 10 * pesoKg + 6.25 * a.altezza_cm - 5 * a.eta - 161
  } else {
    const bmrM = 10 * pesoKg + 6.25 * a.altezza_cm - 5 * a.eta + 5
    const bmrF = 10 * pesoKg + 6.25 * a.altezza_cm - 5 * a.eta - 161
    bmr = (bmrM + bmrF) / 2
  }

  const freq = a.allenamenti_settimana ?? 0
  let pal = 1.2
  if (freq <= 1) pal = 1.2
  else if (freq <= 3) pal = 1.375
  else if (freq <= 5) pal = 1.55
  else pal = 1.725

  if (a.ore_piedi_giorno && a.ore_piedi_giorno >= 6) pal = Math.min(pal + 0.1, 1.9)
  if (a.ore_seduto_giorno && a.ore_seduto_giorno >= 8) pal = Math.max(pal - 0.05, 1.2)

  return Math.round(bmr * pal)
}
