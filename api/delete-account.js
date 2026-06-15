const { createClient } = require('@supabase/supabase-js')

const SUPABASE_URL = 'https://geintonpintywwtybhvi.supabase.co'

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  // Verify the user's JWT from the Authorization header
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorised' })
  const token = authHeader.slice(7)

  const anonKey = process.env.REACT_APP_SUPABASE_ANON_KEY
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!serviceRoleKey) return res.status(503).json({ error: 'Account deletion not configured' })

  // Verify the JWT and get the user
  const anonClient = createClient(SUPABASE_URL, anonKey)
  const { data: { user }, error: userError } = await anonClient.auth.getUser(token)
  if (userError || !user) return res.status(401).json({ error: 'Invalid or expired session' })

  const userId = user.id

  // Admin client for privileged operations
  const adminClient = createClient(SUPABASE_URL, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  })

  // Delete all user data from every table
  const tables = ['stock', 'breaks', 'break_spots', 'expenses', 'collector']
  for (const table of tables) {
    await adminClient.from(table).delete().eq('user_id', userId)
  }
  // break_cards are linked to breaks, which are now deleted — cascade should handle them,
  // but delete explicitly to be safe
  await adminClient.from('profiles').delete().eq('id', userId)

  // Delete the auth user itself
  const { error: deleteError } = await adminClient.auth.admin.deleteUser(userId)
  if (deleteError) {
    console.error('deleteUser error:', deleteError)
    return res.status(500).json({ error: 'Failed to delete account. Please contact hello@stocktrack.app.' })
  }

  return res.status(200).json({ success: true })
}
