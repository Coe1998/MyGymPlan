/**
 * Import ExerciseDB Pro + link GIF agli esercizi esistenti
 *
 * Logica:
 *  1. Legge esercizi esistenti dal DB
 *  2. Per ciascuno senza gif_url, cerca il miglior match in ExerciseDB (nome + traduzione)
 *  3. Se match: aggiorna gif_url sull'esercizio esistente (NO duplicati)
 *  4. ExerciseDB senza match: inserisce come nuovi globali
 *
 * Run:  node scripts/import-exercisedb.mjs
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'

// ─── Env ────────────────────────────────────────────────────────────────────
const __dir = dirname(fileURLToPath(import.meta.url))
const envContent = readFileSync(resolve(__dir, '../.env.local'), 'utf8')
const env = Object.fromEntries(
  envContent.split('\n')
    .filter(l => l.trim() && !l.startsWith('#') && l.includes('='))
    .map(l => { const i = l.indexOf('='); return [l.slice(0,i).trim(), l.slice(i+1).trim()] })
)
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
})

// ─── Dati ExerciseDB ─────────────────────────────────────────────────────────
const EDB_PATH = resolve(__dir, '../data/exercisedb/exercises2.json')
const EDB = JSON.parse(readFileSync(EDB_PATH, 'utf8'))

// ─── Mapping muscoli ExerciseDB → italiano ───────────────────────────────────
const MUSCLE_MAP = {
  'abs': 'Addome', 'pectorals': 'Petto', 'serratus anterior': 'Petto',
  'glutes': 'Glutei', 'abductors': 'Glutei', 'biceps': 'Bicipiti',
  'triceps': 'Tricipiti', 'delts': 'Spalle', 'upper back': 'Dorsali',
  'lats': 'Dorsali', 'calves': 'Polpacci', 'quads': 'Quadricipiti',
  'forearms': 'Avambracci', 'hamstrings': 'Femorali', 'adductors': 'Femorali',
  'spine': 'Lombari', 'traps': 'Trapezio', 'levator scapulae': 'Trapezio',
}
function mapMuscles(target, secondary) {
  const s = new Set([...target, ...secondary].map(m => MUSCLE_MAP[m]).filter(Boolean))
  return s.size ? [...s] : null
}
function toTitle(str) {
  return str.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}
function buildDesc(e) {
  const parts = []
  if (e.equipments?.length) parts.push(`Attrezzatura: ${e.equipments.join(', ')}`)
  if (e.instructions?.length)
    parts.push(e.instructions.slice(0, 4).map(s => s.replace(/^Step:\d+\s*/, '')).join(' '))
  return parts.join('\n') || null
}

// ─── Match manuale (nome esercizio esistente → nome ExerciseDB parziale) ─────
// Usato per i casi dove il matching automatico fallisce o sbaglia
const MANUAL_MATCH = {
  'Trazioni alla Sbarra':         'pull-up',
  'Trazioni al petto':            'chest dip on straight bar',
  'Burpees':                      'burpee',
  'Farmer Walk':                  'farmers walk',
  'Panca Piana':                  'barbell bench press',
  'Abs crunch':                   'crunch',
  'Plank':                        'weighted front plank',
  'Box Jump':                     'box jump',
  'Box jump mono':                'box jump',
  'Bulgarian Split Squat':        'barbell split squat',
  'Stacco da Terra':              'barbell deadlift',
  'Squat con Bilanciere':         'barbell squat on knees',
  'Dip alle Parallele':           'chest dip on straight bar',
  'dips':                         'chest dip on straight bar',
  'dip machine':                  'assisted chest dip kneeling',
  'curl':                         'barbell curl',
  'RDL':                          'barbell romanian deadlift',
  'Leg curl':                     'lever lying leg curl',
  'leg curl prono mono':          'lever lying leg curl',
  'chest supported row':          'barbell bent over row',
  'rematore uni':                 'dumbbell bent over row',
  'rematore':                     'barbell bent over row',
  'lat machine':                  'cable lat pulldown',
  'Lat Machine':                  'cable lat pulldown',
  'pulldown':                     'cable lat pulldown',
  'Erettori':                     'hyperextension',
  'copenaghen plank':             'weighted front plank',
  'chest press per petto alto':   'cable incline bench row',
  'Chest Press Uni':              'lever chest press',
  'Shoulder Press Uni':           'dumbbell standing overhead press',
  'shoulder press':               'dumbbell standing overhead press',
  'Spinte manubri':               'dumbbell standing overhead press',
  'push jerk manubri':            'dumbbell push press',
  'Read Delt Cavo Uni':           'cable rear delt row',
  'rear delt':                    'barbell rear delt raise',
  'pullover':                     'dumbbell pullover',
  'Calf raise':                   'standing calf raise',
  'bike':                         'stationary bike',
  'L sit press':                  'barbell press sit-up',
  'half burpee con salto':        'burpee',
  'Pancake Good Morning':         'barbell good morning',
  'Hack Squat':                   'barbell hack squat',
  'hack squat':                   'barbell hack squat',
  'Hspu liberi':                  'handstand push-up',
  'Hspu parallele':               'handstand push-up',
  'HSPU':                         'handstand push-up',
}

// ─── Normalizzazione per matching automatico ─────────────────────────────────
const IT_EN = {
  'panca piana': 'bench press flat', 'panca inclinata': 'bench press incline',
  'panca declinata': 'bench press decline', 'panca': 'bench',
  'stacco da terra': 'deadlift', 'stacco': 'deadlift',
  'affondi bulgari': 'bulgarian split squat', 'affondi laterali': 'lateral lunge',
  'affondi': 'lunge',
  'trazioni alla sbarra': 'pullup', 'trazioni al petto': 'pullup chest',
  'trazioni': 'pullup',
  'alzate laterali': 'lateral raise', 'alzate frontali': 'front raise', 'alzate': 'raise',
  'alzata': 'raise',
  'rematore con bilanciere': 'barbell row', 'rematore con manubrio': 'dumbbell row',
  'rematore': 'row',
  'lento avanti con manubri': 'dumbbell shoulder press', 'lento avanti': 'overhead press',
  'calf raise in piedi': 'standing calf raise', 'calf raise seduto': 'seated calf raise',
  'calf raise': 'calf raise',
  'curl con bilanciere': 'barbell curl', 'curl con manubri': 'dumbbell curl',
  'curl al cavo': 'cable curl', 'curl su panca scott': 'preacher curl',
  'curl a martello': 'hammer curl', 'curl ez bar': 'ez bar curl',
  'estensione tricipiti con manubrio': 'dumbbell triceps extension overhead',
  'estensione tricipiti': 'triceps extension',
  'estensioni over head': 'overhead triceps extension',
  'kickback al cavo': 'cable triceps kickback',
  'push-down al cavo': 'cable pushdown', 'push down': 'pushdown',
  'tricipiti su panca': 'bench dip triceps',
  'dip alle parallele': 'parallel bar dip',
  'croci con manubri': 'dumbbell fly', 'croci': 'fly',
  'lat machine': 'lat pulldown', 'pulley basso': 'seated cable row', 'pulley': 'cable row',
  'squat con bilanciere': 'barbell squat',
  'leg press calf raise': 'leg press calf raise',
  'face pull': 'face pull',
  'alzate con bilanciere shrug': 'barbell shrug',
  'bilanciere': 'barbell', 'manubri': 'dumbbell', 'manubrio': 'dumbbell',
  'cavo': 'cable', 'cavi': 'cable', 'macchina': 'machine',
  'laterali': 'lateral', 'frontali': 'front',
  'seduto': 'seated', 'piedi': 'standing',
}

// Stopwords — NON includiamo "up","down","bar" perché utili (pull-up, push-up...)
const STOP = new Set(['con','al','alla','alle','di','da','del','della','le','la','lo','il',
  'in','su','per','tra','and','the','a','an','with','at','on','from','to','of','or','by'])

function deaccent(s) {
  return s.replace(/[àáâã]/g,'a').replace(/[èéêë]/g,'e')
          .replace(/[ìíîï]/g,'i').replace(/[òóôõ]/g,'o')
          .replace(/[ùúûü]/g,'u')
}

function normalize(name) {
  let s = deaccent(name.toLowerCase())
    .replace(/[-_]/g, ' ')
    .replace(/[^a-z0-9 ]/g, '')
    .replace(/\s+/g, ' ').trim()

  // Applica traduzioni multi-parola (lunghezza decrescente)
  const keys = Object.keys(IT_EN).sort((a, b) => b.length - a.length)
  for (const k of keys) {
    if (s.includes(k)) s = s.replace(k, IT_EN[k])
  }

  // Cleanup post-traduzione (le traduzioni possono introdurre trattini)
  s = s.replace(/[-_]/g, ' ').replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim()
  return s
}

function tokens(norm) {
  return norm.split(' ').filter(w => w.length > 1 && !STOP.has(w))
}

function jaccard(a, b) {
  if (!a.length || !b.length) return 0
  const sa = new Set(a), sb = new Set(b)
  let common = 0
  for (const w of sa) if (sb.has(w)) common++
  return common / new Set([...sa, ...sb]).size
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  // 1. Fetch esercizi esistenti (paginato per superare il limite di 1000)
  const existing = []
  const PAGE = 1000
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from('esercizi')
      .select('id, nome, gif_url, exercisedb_id, is_global')
      .range(from, from + PAGE - 1)
    if (error) throw new Error('Fetch fallito: ' + error.message)
    if (!data || data.length === 0) break
    existing.push(...data)
    if (data.length < PAGE) break
  }
  const fetchErr = null

  console.log(`\nDB: ${existing.length} esercizi totali`)
  const withGif    = existing.filter(e => e.gif_url)
  const toMatch    = existing.filter(e => !e.gif_url)
  console.log(`  Con GIF già: ${withGif.length}`)
  console.log(`  Da matchare: ${toMatch.length}\n`)

  // 2. Pre-calcola token ExerciseDB
  const edbTokens = EDB.map(e => ({
    ...e,
    norm: normalize(e.name),
    toks: tokens(normalize(e.name)),
  }))

  // Helper: trova il miglior match EDB dato un testo di ricerca (stringa parziale)
  function findBestByKeyword(keyword) {
    const kNorm = normalize(keyword)
    const kToks = tokens(kNorm)
    let bestScore = 0, bestEdb = null
    for (const edb of edbTokens) {
      // Prima: matching esatto sulla stringa normalizzata
      if (edb.norm.includes(kNorm) || kNorm.includes(edb.norm)) {
        const s = jaccard(kToks, edb.toks)
        if (s > bestScore || (s === bestScore && edb.name.length < (bestEdb?.name?.length ?? 999))) {
          bestScore = s; bestEdb = edb
        }
      }
    }
    // Se non trovato con includes, usa jaccard puro
    if (!bestEdb) {
      for (const edb of edbTokens) {
        const s = jaccard(kToks, edb.toks)
        if (s > bestScore) { bestScore = s; bestEdb = edb }
      }
    }
    return { bestScore, bestEdb }
  }

  // 3. Match ogni esercizio esistente senza GIF
  const SCORE_THRESHOLD = 0.40
  const matchedEdbIds = new Set()
  const updates = []
  const noMatch  = []

  for (const ex of toMatch) {
    let gifUrl = null, edbId = null, matchedName = '', finalScore = 0

    // 3a. Prova match manuale prima
    const manualKey = Object.keys(MANUAL_MATCH).find(k =>
      ex.nome.toLowerCase() === k.toLowerCase()
    )
    if (manualKey) {
      const keyword = MANUAL_MATCH[manualKey]
      const { bestEdb, bestScore } = findBestByKeyword(keyword)
      if (bestEdb) {
        gifUrl = bestEdb.gifUrl; edbId = bestEdb.exerciseId
        matchedName = bestEdb.name; finalScore = 1.0 // manuale = affidabile
      }
    }

    // 3b. Se non trovato manualmente, usa jaccard automatico
    if (!gifUrl) {
      const exNorm = normalize(ex.nome)
      const exToks = tokens(exNorm)
      let bestScore = 0, bestEdb = null
      for (const edb of edbTokens) {
        const s = jaccard(exToks, edb.toks)
        if (s > bestScore) { bestScore = s; bestEdb = edb }
      }
      if (bestScore >= SCORE_THRESHOLD && bestEdb) {
        gifUrl = bestEdb.gifUrl; edbId = bestEdb.exerciseId
        matchedName = bestEdb.name; finalScore = bestScore
      }
    }

    if (gifUrl) {
      matchedEdbIds.add(edbId)
      updates.push({ id: ex.id, nome: ex.nome, gif_url: gifUrl, exercisedb_id: edbId, score: finalScore, matched: matchedName })
    } else {
      noMatch.push(ex)
    }
  }

  // 4. Log risultati
  console.log(`Match trovati: ${updates.length}`)
  for (const u of updates) {
    const tag = u.score >= 0.99 ? '[M]' : `[${u.score.toFixed(2)}]`
    console.log(`  ${tag} "${u.nome}" → "${u.matched}"`)
  }
  if (noMatch.length) {
    console.log(`\nSenza match (${noMatch.length}) — resteranno senza GIF:`)
    for (const e of noMatch) console.log(`  - "${e.nome}"`)
  }
  console.log()

  // 5. Conferma
  const readline = await import('readline')
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  const answer = await new Promise(r => rl.question(`Procedere con ${updates.length} aggiornamenti + inserimento nuovi globali? (s/N) `, r))
  rl.close()
  if (answer.toLowerCase() !== 's') { console.log('Annullato.'); return }

  // 6. Aggiorna esercizi esistenti
  // Se due esercizi puntano allo stesso EDB (es: "lat machine" e "pulldown"),
  // il secondo non può avere lo stesso exercisedb_id → aggiorna solo gif_url
  if (updates.length > 0) {
    console.log('\nAggiorno esercizi esistenti...')
    let ok = 0, fail = 0
    // EDB IDs già assegnati ad altri esercizi nel DB (dalla run precedente)
    const dbEdbIds = new Set(existing.map(e => e.exercisedb_id).filter(Boolean))
    const usedEdbIds = new Set()
    for (const u of updates) {
      const takenInDb   = dbEdbIds.has(u.exercisedb_id) && !existing.find(e => e.id === u.id && e.exercisedb_id === u.exercisedb_id)
      const usedNow     = usedEdbIds.has(u.exercisedb_id)
      usedEdbIds.add(u.exercisedb_id)
      const payload = (takenInDb || usedNow)
        ? { gif_url: u.gif_url }                                    // solo gif, no edb_id
        : { gif_url: u.gif_url, exercisedb_id: u.exercisedb_id }
      const { error } = await supabase
        .from('esercizi')
        .update(payload)
        .eq('id', u.id)
      if (error) { console.error(`  ERRORE "${u.nome}": ${error.message}`); fail++ }
      else ok++
    }
    console.log(`  OK: ${ok} | Errori: ${fail}`)
  }

  // 7. Inserisci nuovi ExerciseDB come globali (skip già matchati + già presenti)
  const existingEdbIds = new Set(existing.map(e => e.exercisedb_id).filter(Boolean))
  const toInsert = EDB
    .filter(e => !matchedEdbIds.has(e.exerciseId) && !existingEdbIds.has(e.exerciseId))
    .map(e => ({
      nome: toTitle(e.name),
      descrizione: buildDesc(e),
      video_url: null,
      gif_url: e.gifUrl,
      muscoli: mapMuscles(e.targetMuscles || [], e.secondaryMuscles || []),
      tipo_input: 'reps',
      is_global: true,
      coach_id: null,
      exercisedb_id: e.exerciseId,
    }))

  console.log(`\nInserisco ${toInsert.length} nuovi esercizi ExerciseDB...`)
  const BATCH = 100
  let inserted = 0, errors = 0
  for (let i = 0; i < toInsert.length; i += BATCH) {
    const batch = toInsert.slice(i, i + BATCH)
    // Insert semplice — exercisedb_id è già filtrato, non ci saranno duplicati
    const { error } = await supabase.from('esercizi').insert(batch)
    if (error) { console.error(`Errore batch ${i/BATCH+1}: ${error.message}`); errors += batch.length }
    else { inserted += batch.length; process.stdout.write(`\r  Inseriti: ${inserted}/${toInsert.length}`) }
  }

  console.log('\n')
  console.log('─────────────────────────────────────────────')
  console.log('RIEPILOGO FINALE:')
  console.log(`  Esercizi esistenti aggiornati con GIF: ${updates.length}`)
  console.log(`  Nuovi esercizi ExerciseDB inseriti:    ${inserted}`)
  if (errors > 0) console.log(`  Errori inserimento:                    ${errors}`)
  console.log('─────────────────────────────────────────────')
}

main().catch(err => { console.error('\nErrore fatale:', err.message); process.exit(1) })
