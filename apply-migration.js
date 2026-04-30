/**
 * Applica la migration degli indici mancanti su Supabase.
 *
 * Uso:
 *   DB_PASSWORD=<la-tua-password-postgres> node apply-migration.js
 *
 * La DB password si trova in:
 *   Supabase Dashboard → Settings → Database → Connection string (sezione Direct)
 *   oppure Settings → Database → Database password
 */

const { Client } = require('pg')
const fs = require('fs')
const path = require('path')

const password = process.env.DB_PASSWORD
if (!password) {
  console.error('❌  Imposta DB_PASSWORD=<password> prima di eseguire')
  console.error('    Es: DB_PASSWORD=mypassword node apply-migration.js')
  process.exit(1)
}

const sql = fs.readFileSync(
  path.join(__dirname, 'supabase/migrations/20260428_add_missing_indexes.sql'),
  'utf8'
)

async function main() {
  // Supabase direct connection — funziona anche con transaction pooler porta 5432
  const hosts = [
    'db.dcwchgzxuzfywkxsadjp.supabase.co',
    'aws-0-eu-central-1.pooler.supabase.com',
    'aws-0-eu-west-2.pooler.supabase.com',
    'aws-0-us-east-1.pooler.supabase.com',
    'aws-0-ap-southeast-1.pooler.supabase.com',
  ]

  for (const host of hosts) {
    const client = new Client({
      host,
      port: host.includes('pooler') ? 5432 : 5432,
      database: 'postgres',
      user: host.includes('pooler') ? `postgres.dcwchgzxuzfywkxsadjp` : 'postgres',
      password,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 8000,
    })

    try {
      console.log(`Connessione a ${host}...`)
      await client.connect()
      console.log('✅  Connesso! Eseguo migration...')
      await client.query(sql)
      console.log('✅  Migration applicata con successo!')
      await client.end()
      return
    } catch (e) {
      console.log(`   ⚠️  ${e.message}`)
      try { await client.end() } catch {}
    }
  }

  console.error('\n❌  Non riesco a connettermi. Incolla manualmente il file:')
  console.error('    supabase/migrations/20260428_add_missing_indexes.sql')
  console.error('    nel Supabase Dashboard → SQL Editor → New query\n')
}

main().catch(console.error)
