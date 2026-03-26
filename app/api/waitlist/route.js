import { neon } from '@neondatabase/serverless'

function getDb() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is not set')
  }
  return neon(process.env.DATABASE_URL)
}

// Ensure table + all columns exist (idempotent, runs on cold start)
async function ensureTable(sql) {
  await sql`
    CREATE TABLE IF NOT EXISTS waitlist (
      id          SERIAL PRIMARY KEY,
      email       TEXT NOT NULL UNIQUE,
      source      TEXT NOT NULL DEFAULT 'unknown',
      use_cases   TEXT,
      reasoning   TEXT,
      user_count  TEXT,
      req_per_day TEXT,
      industry    TEXT,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `
  // Safe to run on existing table — adds missing columns only
  await sql`ALTER TABLE waitlist ADD COLUMN IF NOT EXISTS use_cases   TEXT`
  await sql`ALTER TABLE waitlist ADD COLUMN IF NOT EXISTS reasoning   TEXT`
  await sql`ALTER TABLE waitlist ADD COLUMN IF NOT EXISTS user_count  TEXT`
  await sql`ALTER TABLE waitlist ADD COLUMN IF NOT EXISTS req_per_day TEXT`
  await sql`ALTER TABLE waitlist ADD COLUMN IF NOT EXISTS industry    TEXT`
}

export async function POST(request) {
  let body
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const email       = (body.email       || '').trim().toLowerCase()
  const source      = (body.source      || 'unknown').slice(0, 50)
  const use_cases   = body.use_cases   || null
  const reasoning   = body.reasoning   || null
  const user_count  = body.user_count  || null
  const req_per_day = body.req_per_day || null
  const industry    = body.industry    || null

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return Response.json({ error: 'Please enter a valid email address.' }, { status: 400 })
  }

  try {
    const sql = getDb()
    await ensureTable(sql)

    await sql`
      INSERT INTO waitlist (email, source, use_cases, reasoning, user_count, req_per_day, industry)
      VALUES (${email}, ${source}, ${use_cases}, ${reasoning}, ${user_count}, ${req_per_day}, ${industry})
      ON CONFLICT (email) DO UPDATE SET
        use_cases   = COALESCE(EXCLUDED.use_cases,   waitlist.use_cases),
        reasoning   = COALESCE(EXCLUDED.reasoning,   waitlist.reasoning),
        user_count  = COALESCE(EXCLUDED.user_count,  waitlist.user_count),
        req_per_day = COALESCE(EXCLUDED.req_per_day, waitlist.req_per_day),
        industry    = COALESCE(EXCLUDED.industry,    waitlist.industry)
    `

    return Response.json({ ok: true })
  } catch (err) {
    console.error('Waitlist insert error:', err)
    return Response.json(
      { error: 'Something went wrong on our end. Please try again shortly.' },
      { status: 500 }
    )
  }
}

// GET — returns signup count for social proof (no emails exposed)
export async function GET() {
  try {
    const sql = getDb()
    await ensureTable(sql)
    const [{ count }] = await sql`SELECT COUNT(*)::int AS count FROM waitlist`
    return Response.json({ count })
  } catch {
    return Response.json({ count: null })
  }
}
