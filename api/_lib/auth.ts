import { HttpError } from './http.js'
import { adminDb } from './supabase.js'

/** Checks the request comes from a signed-in admin (Supabase session token). Returns their user id. */
export async function requireAdmin(req: Request): Promise<string> {
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  if (!token) throw new HttpError(401, 'Please sign in again.')
  const db = adminDb()
  const { data, error } = await db.auth.getUser(token)
  if (error || !data.user) throw new HttpError(401, 'Please sign in again.')
  const { data: admin } = await db.from('admins').select('user_id').eq('user_id', data.user.id).maybeSingle()
  if (!admin) throw new HttpError(403, 'Only admins can do this.')
  return data.user.id
}
