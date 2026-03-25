import { neon } from '@neondatabase/serverless'

// Returns a Neon SQL client. Throws if DATABASE_URL is not configured.
function getDb() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is not set')
  }
  return neon(process.env.DATABASE_URL)
}

// Ensure the table exists (runs on cold start — safe to call repeatedly)
async function ensureTable(sql) {
  await sql`
    CREATE TABLE IF NOT EXISTS waitlist (
      id         SERIAL PRIMARY KEY,
      email      TEXT NOT NULL UNIQUE,
      source     TEXT NOT NULL DEFAULT 'unknown',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `
}

export async function POST(request) {
  let body
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const email = (body.email || '').trim().toLowerCase()
  const source = (body.source || 'unknown').slice(0, 50)

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return Response.json({ error: 'Please enter a valid email address.' }, { status: 400 })
  }

  try {
    const sql = getDb()
    await ensureTable(sql)

    await sql`
      INSERT INTO waitlist (email, source)
      VALUES (${email}, ${source})
      ON CONFLICT (email) DO NOTHING
    `

    return Response.json({
      message: "You're on the list! We'll email you with early access and your $20 in credits.",
    })
  } catch (err) {
    console.error('Waitlist insert error:', err)
    return Response.json(
      { error: 'Something went wrong on our end. Please try again shortly.' },
      { status: 500 }
    )
  }
}

// GET — returns count for social proof (no emails exposed)
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
