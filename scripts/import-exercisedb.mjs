/**
 * Import ExerciseDB Pro (nuovo formato) + link GIF da Supabase Storage
 *
 * Logica:
 *  1. Legge exerciseData_complete.json (formato nuovo: id/name/target/...)
 *  2. Per esercizi custom esistenti senza gif_url → match per nome (jaccard)
 *  3. Per esercizi ExerciseDB già presenti → aggiorna gif_url/gif_url_hd/difficulty/category
 *  4. Esercizi nuovi → inserisce come globali
 *
 * Prerequisito: eseguire prima `node scripts/upload-gifs.mjs`
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

// ─── Dati ExerciseDB Pro ─────────────────────────────────────────────────────
const EDB_PATH = resolve(__dir, '../data/exercisedb/exerciseData_complete.json') // nuovo formato ExerciseDB Pro
const EDB = JSON.parse(readFileSync(EDB_PATH, 'utf8'))

// URL base Supabase Storage (viene costruito a runtime)
const STORAGE_BASE = env.NEXT_PUBLIC_SUPABASE_URL + '/storage/v1/object/public/exercise-gifs'

function gifUrl(id, res) { return `${STORAGE_BASE}/${res}/${id}.gif` }

// ─── Risoluzione GIF disponibili (pre-caricata da upload-gifs.mjs) ───────────
// Lista ricavata dalla directory locale (solo per sapere cosa c'è)
import { existsSync, readdirSync } from 'fs'
const GIF_BASE = process.env.GIF_PATH ||
  'C:/Users/cozmin.bejinari/Downloads/cross-platform-20260422T064002Z-3-002/cross-platform'
const HAS_360  = new Set(
  existsSync(GIF_BASE + '/360')
    ? readdirSync(GIF_BASE + '/360').map(f => f.replace('.gif',''))
    : []
)
const HAS_1080 = new Set(
  existsSync(GIF_BASE + '/1080')
    ? readdirSync(GIF_BASE + '/1080').map(f => f.replace('.gif',''))
    : []
)

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
  const s = new Set([target, ...secondary].map(m => MUSCLE_MAP[m]).filter(Boolean))
  return s.size ? [...s] : null
}
function toTitle(str) {
  return str.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}

// ─── Matching per nome (identico al vecchio script) ──────────────────────────
const MANUAL_MATCH = {
  'Trazioni alla Sbarra':         'pull-up',
  'Trazioni al petto':            'chest dip on straight bar',
  'Burpees':                      'burpee',
  'Farmer Walk':                  'farmers walk',
  'Panca Piana':                  'barbell bench press',
  'Abs crunch':                   'crunch',
  'Plank':                        'weighted front plank',
  'Box Jump':                     'box jump',
  'Bulgarian Split Squat':        'barbell split squat',
  'Stacco da Terra':              'barbell deadlift',
  'Squat con Bilanciere':         'barbell squat on knees',
  'Dip alle Parallele':           'chest dip on straight bar',
  'dips':                         'chest dip on straight bar',
  'RDL':                          'barbell romanian deadlift',
  'Leg curl':                     'lever lying leg curl',
  'rematore':                     'barbell bent over row',
  'lat machine':                  'cable lat pulldown',
  'Erettori':                     'hyperextension',
  'shoulder press':               'dumbbell standing overhead press',
  'rear delt':                    'barbell rear delt raise',
  'Calf raise':                   'standing calf raise',
  'Hack Squat':                   'barbell hack squat',
  'HSPU':                         'handstand push-up',
}

const IT_EN = {
  'panca piana': 'bench press flat', 'panca inclinata': 'bench press incline',
  'stacco da terra': 'deadlift', 'stacco': 'deadlift',
  'affondi bulgari': 'bulgarian split squat', 'affondi': 'lunge',
  'trazioni alla sbarra': 'pullup', 'trazioni': 'pullup',
  'alzate laterali': 'lateral raise', 'alzate frontali': 'front raise',
  'rematore con bilanciere': 'barbell row', 'rematore con manubrio': 'dumbbell row',
  'rematore': 'row',
  'lento avanti': 'overhead press',
  'calf raise in piedi': 'standing calf raise', 'calf raise seduto': 'seated calf raise',
  'calf raise': 'calf raise',
  'curl con bilanciere': 'barbell curl', 'curl con manubri': 'dumbbell curl',
  'curl al cavo': 'cable curl', 'curl a martello': 'hammer curl',
  'estensione tricipiti': 'triceps extension', 'kickback al cavo': 'cable triceps kickback',
  'push down': 'pushdown', 'dip alle parallele': 'parallel bar dip',
  'croci con manubri': 'dumbbell fly', 'croci': 'fly',
  'lat machine': 'lat pulldown', 'pulley': 'cable row',
  'squat con bilanciere': 'barbell squat', 'face pull': 'face pull',
  'bilanciere': 'barbell', 'manubri': 'dumbbell', 'cavo': 'cable',
  'laterali': 'lateral', 'frontali': 'front', 'seduto': 'seated',
}

const STOP = new Set(['con','al','alla','alle','di','da','del','della','le','la','lo','il',
  'in','su','per','tra','and','the','a','an','with','at','on','from','to','of','or','by'])

function deaccent(s) {
  return s.replace(/[àáâã]/g,'a').replace(/[èéêë]/g,'e')
          .replace(/[ìíîï]/g,'i').replace(/[òóôõ]/g,'o').replace(/[ùúûü]/g,'u')
}
function normalize(name) {
  let s = deaccent(name.toLowerCase()).replace(/[-_]/g,' ').replace(/[^a-z0-9 ]/g,'').replace(/\s+/g,' ').trim()
  const keys = Object.keys(IT_EN).sort((a,b) => b.length - a.length)
  for (const k of keys) if (s.includes(k)) s = s.replace(k, IT_EN[k])
  return s.replace(/[-_]/g,' ').replace(/[^a-z0-9 ]/g,'').replace(/\s+/g,' ').trim()
}
function tokens(norm) { return norm.split(' ').filter(w => w.length > 1 && !STOP.has(w)) }
function jaccard(a, b) {
  if (!a.length || !b.length) return 0
  const sa = new Set(a), sb = new Set(b)
  let common = 0
  for (const w of sa) if (sb.has(w)) common++
  return common / new Set([...sa, ...sb]).size
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`\nDataset: ${EDB.length} esercizi`)
  console.log(`GIF 360p: ${HAS_360.size} | GIF 1080p: ${HAS_1080.size}`)
  console.log(`Storage base: ${STORAGE_BASE}\n`)

  // 1. Fetch esercizi esistenti (paginato)
  const existing = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase.from('esercizi')
      .select('id, nome, gif_url, gif_url_hd, exercisedb_id, is_global, difficulty, category')
      .range(from, from + 999)
    if (error) throw new Error('Fetch fallito: ' + error.message)
    if (!data || data.length === 0) break
    existing.push(...data)
    if (data.length < 1000) break
  }
  console.log(`DB: ${existing.length} esercizi totali`)
  console.log(`  Custom: ${existing.filter(e => !e.is_global).length}`)
  console.log(`  Globali ExerciseDB: ${existing.filter(e => e.is_global).length}\n`)

  // 2. Pre-calcola token EDB (nuovo formato)
  const edbTokens = EDB.map(e => ({
    id: e.id,
    name: e.name,
    norm: normalize(e.name),
    toks: tokens(normalize(e.name)),
    gif360:  HAS_360.has(e.id)  ? gifUrl(e.id, '360')  : null,
    gif1080: HAS_1080.has(e.id) ? gifUrl(e.id, '1080') : null,
    muscoli: mapMuscles(e.target, e.secondaryMuscles || []),
    descrizione: e.description || null,
    difficulty: e.difficulty || null,
    category: e.category || null,
  }))

  function findBestByKeyword(keyword) {
    const kNorm = normalize(keyword), kToks = tokens(kNorm)
    let bestScore = 0, bestEdb = null
    for (const edb of edbTokens) {
      if (edb.norm.includes(kNorm) || kNorm.includes(edb.norm)) {
        const s = jaccard(kToks, edb.toks)
        if (s > bestScore || (s === bestScore && edb.name.length < (bestEdb?.name?.length ?? 999))) {
          bestScore = s; bestEdb = edb
        }
      }
    }
    if (!bestEdb) {
      for (const edb of edbTokens) {
        const s = jaccard(kToks, edb.toks)
        if (s > bestScore) { bestScore = s; bestEdb = edb }
      }
    }
    return { bestScore, bestEdb }
  }

  // 3. Aggiorna esercizi globali già presenti: aggiorna gif_url_hd + nuovi campi
  const existingGlobals = existing.filter(e => e.is_global && e.exercisedb_id)
  const edbById = new Map(edbTokens.map(e => [e.id, e]))
  const globalUpdates = []
  for (const ex of existingGlobals) {
    const edb = edbById.get(ex.exercisedb_id)
    if (!edb) continue
    const needsUpdate =
      ex.gif_url !== edb.gif360 ||
      ex.gif_url_hd !== edb.gif1080 ||
      ex.difficulty !== edb.difficulty ||
      ex.category !== edb.category
    if (needsUpdate) globalUpdates.push({
      id: ex.id,
      gif_url:     edb.gif360,
      gif_url_hd:  edb.gif1080,
      difficulty:  edb.difficulty,
      category:    edb.category,
    })
  }
  console.log(`Globali da aggiornare (gif_url_hd + difficulty/category): ${globalUpdates.length}`)

  // 4. Match esercizi custom senza gif_url
  const SCORE_THRESHOLD = 0.40
  const toMatch = existing.filter(e => !e.is_global && !e.gif_url)
  const matchedEdbIds = new Set(existing.map(e => e.exercisedb_id).filter(Boolean))
  const customUpdates = []
  const noMatch = []

  for (const ex of toMatch) {
    let found = null
    const manualKey = Object.keys(MANUAL_MATCH).find(k => ex.nome.toLowerCase() === k.toLowerCase())
    if (manualKey) {
      const { bestEdb } = findBestByKeyword(MANUAL_MATCH[manualKey])
      if (bestEdb) found = { edb: bestEdb, score: 1.0 }
    }
    if (!found) {
      const exToks = tokens(normalize(ex.nome))
      let bestScore = 0, bestEdb = null
      for (const edb of edbTokens) {
        const s = jaccard(exToks, edb.toks)
        if (s > bestScore) { bestScore = s; bestEdb = edb }
      }
      if (bestScore >= SCORE_THRESHOLD) found = { edb: bestEdb, score: bestScore }
    }
    if (found) {
      matchedEdbIds.add(found.edb.id)
      customUpdates.push({
        id: ex.id, nome: ex.nome,
        gif_url:    found.edb.gif360 ?? found.edb.gif1080,
        gif_url_hd: found.edb.gif1080,
        exercisedb_id: found.edb.id,
        score: found.score,
        matched: found.edb.name,
      })
    } else {
      noMatch.push(ex)
    }
  }

  console.log(`Custom da matchare: ${toMatch.length} → match: ${customUpdates.length}`)
  for (const u of customUpdates) {
    const tag = u.score >= 0.99 ? '[M]' : `[${u.score.toFixed(2)}]`
    console.log(`  ${tag} "${u.nome}" → "${u.matched}"`)
  }
  if (noMatch.length) {
    console.log(`\nSenza match (${noMatch.length}):`)
    for (const e of noMatch) console.log(`  - "${e.nome}"`)
  }

  // 5. Nuovi globali da inserire (non ancora in DB)
  const existingEdbIds = new Set(existing.map(e => e.exercisedb_id).filter(Boolean))
  const toInsert = edbTokens.filter(e =>
    !matchedEdbIds.has(e.id) && !existingEdbIds.has(e.id) &&
    (e.gif360 || e.gif1080)   // solo quelli con almeno una GIF
  ).map(e => ({
    nome:          toTitle(e.name),
    descrizione:   e.descrizione,
    video_url:     null,
    gif_url:       e.gif360 ?? e.gif1080,
    gif_url_hd:    e.gif1080,
    muscoli:       e.muscoli,
    tipo_input:    'reps',
    is_global:     true,
    coach_id:      null,
    exercisedb_id: e.id,
    difficulty:    e.difficulty,
    category:      e.category,
  }))
  console.log(`\nNuovi globali da inserire: ${toInsert.length}`)

  // 6. Conferma
  console.log()
  const readline = await import('readline')
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  const answer = await new Promise(r => rl.question(
    `Procedere? (${globalUpdates.length} aggiornamenti globali, ${customUpdates.length} match custom, ${toInsert.length} nuovi) (s/N) `, r
  ))
  rl.close()
  if (answer.toLowerCase() !== 's') { console.log('Annullato.'); return }

  // 7. Aggiorna globali esistenti
  if (globalUpdates.length > 0) {
    console.log('\nAggiorno globali esistenti...')
    let ok = 0, fail = 0
    for (const u of globalUpdates) {
      const { error } = await supabase.from('esercizi').update({
        gif_url: u.gif_url, gif_url_hd: u.gif_url_hd,
        difficulty: u.difficulty, category: u.category,
      }).eq('id', u.id)
      if (error) { console.error(`  ERRORE: ${error.message}`); fail++ } else ok++
    }
    console.log(`  OK: ${ok} | Errori: ${fail}`)
  }

  // 8. Aggiorna custom con match
  if (customUpdates.length > 0) {
    console.log('\nAggiorno esercizi custom matchati...')
    let ok = 0, fail = 0
    const dbEdbIds = new Set(existing.map(e => e.exercisedb_id).filter(Boolean))
    const usedNow  = new Set()
    for (const u of customUpdates) {
      const alreadyTaken = (dbEdbIds.has(u.exercisedb_id) && !existing.find(e => e.id === u.id && e.exercisedb_id === u.exercisedb_id))
                        || usedNow.has(u.exercisedb_id)
      usedNow.add(u.exercisedb_id)
      const payload = alreadyTaken
        ? { gif_url: u.gif_url, gif_url_hd: u.gif_url_hd }
        : { gif_url: u.gif_url, gif_url_hd: u.gif_url_hd, exercisedb_id: u.exercisedb_id }
      const { error } = await supabase.from('esercizi').update(payload).eq('id', u.id)
      if (error) { console.error(`  ERRORE "${u.nome}": ${error.message}`); fail++ } else ok++
    }
    console.log(`  OK: ${ok} | Errori: ${fail}`)
  }

  // 9. Inserisci nuovi globali
  if (toInsert.length > 0) {
    console.log(`\nInserisco ${toInsert.length} nuovi esercizi...`)
    const BATCH = 100
    let inserted = 0, errors = 0
    for (let i = 0; i < toInsert.length; i += BATCH) {
      const { error } = await supabase.from('esercizi').insert(toInsert.slice(i, i + BATCH))
      if (error) { console.error(`Errore batch: ${error.message}`); errors += Math.min(BATCH, toInsert.length - i) }
      else { inserted += Math.min(BATCH, toInsert.length - i) }
      process.stdout.write(`\r  ${inserted}/${toInsert.length}`)
    }
    console.log()
  }

  console.log('\n─────────────────────────────────────────────')
  console.log('RIEPILOGO:')
  console.log(`  Globali aggiornati (HD + metadati): ${globalUpdates.length}`)
  console.log(`  Custom matchati con GIF:            ${customUpdates.length}`)
  console.log(`  Nuovi esercizi inseriti:            ${toInsert.length}`)
  console.log('─────────────────────────────────────────────')
}

main().catch(err => { console.error('\nErrore fatale:', err.message); process.exit(1) })
