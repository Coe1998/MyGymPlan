/**
 * Upload GIF esercizi su Supabase Storage
 *
 * Carica le GIF del nuovo dataset ExerciseDB Pro su Supabase Storage
 * nel bucket `exercise-gifs`, organizzate per risoluzione.
 *
 * Run:  node scripts/upload-gifs.mjs
 *
 * Crea il bucket come public se non esiste, poi carica:
 *   exercise-gifs/360/{id}.gif
 *   exercise-gifs/1080/{id}.gif
 *
 * Le GIF già presenti vengono saltate (--force per sovrascrivere).
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync, readdirSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dir   = dirname(fileURLToPath(import.meta.url))
const envRaw  = readFileSync(resolve(__dir, '../.env.local'), 'utf8')
const env     = Object.fromEntries(
  envRaw.split('\n')
    .filter(l => l.trim() && !l.startsWith('#') && l.includes('='))
    .map(l => { const i = l.indexOf('='); return [l.slice(0,i).trim(), l.slice(i+1).trim()] })
)

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
})

const BUCKET      = 'exercise-gifs'
const GIF_BASE    = process.env.GIF_PATH ||
  'C:/Users/cozmin.bejinari/Downloads/cross-platform-20260422T064002Z-3-002/cross-platform'
const RESOLUTIONS = ['360', '1080']
const FORCE       = process.argv.includes('--force')

async function ensureBucket() {
  const { data: buckets } = await supabase.storage.listBuckets()
  if (buckets?.find(b => b.name === BUCKET)) return
  const { error } = await supabase.storage.createBucket(BUCKET, { public: true })
  if (error) throw new Error('Impossibile creare bucket: ' + error.message)
  console.log(`Bucket "${BUCKET}" creato.`)
}

async function listExisting(res) {
  const existing = new Set()
  const PAGE = 1000
  for (let offset = 0; ; offset += PAGE) {
    const { data } = await supabase.storage.from(BUCKET).list(res, { limit: PAGE, offset })
    if (!data || data.length === 0) break
    for (const f of data) existing.add(f.name)
    if (data.length < PAGE) break
  }
  return existing
}

async function uploadResolution(res) {
  const folder = resolve(GIF_BASE, res)
  const files  = readdirSync(folder).filter(f => f.endsWith('.gif'))
  console.log(`\n[${res}p] ${files.length} GIF locali`)

  const existing = FORCE ? new Set() : await listExisting(res)
  console.log(`  Già su Storage: ${existing.size}`)

  let uploaded = 0, skipped = 0, errors = 0

  for (const file of files) {
    const storagePath = `${res}/${file}`

    if (!FORCE && existing.has(file)) { skipped++; continue }

    const buf = readFileSync(resolve(folder, file))
    const { error } = await supabase.storage.from(BUCKET).upload(storagePath, buf, {
      contentType: 'image/gif',
      upsert: FORCE,
    })

    if (error) {
      if (error.message.includes('already exists')) { skipped++; continue }
      console.error(`  ERRORE ${file}: ${error.message}`)
      errors++
    } else {
      uploaded++
    }

    if ((uploaded + skipped + errors) % 50 === 0) {
      process.stdout.write(`\r  caricati: ${uploaded} | saltati: ${skipped} | errori: ${errors}   `)
    }
  }

  console.log(`\r  [${res}p] caricati: ${uploaded} | già presenti: ${skipped} | errori: ${errors}`)
}

async function main() {
  console.log('Supabase:', env.NEXT_PUBLIC_SUPABASE_URL)
  console.log('GIF path:', GIF_BASE)
  console.log('Modalità:', FORCE ? 'FORCE (sovrascrive)' : 'skip esistenti')

  await ensureBucket()

  for (const res of RESOLUTIONS) {
    await uploadResolution(res)
  }

  const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl('360/0001.gif')
  console.log('\nURL base storage:', publicUrl.replace('360/0001.gif', '{res}/{id}.gif'))
  console.log('\nDone. Ora puoi eseguire: node scripts/import-exercisedb.mjs')
}

main().catch(err => { console.error('\nErrore fatale:', err.message); process.exit(1) })
