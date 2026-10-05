import type { SavedCartItem } from '../shared/store.js'
import { parseItems, priceCart, str } from './_lib/cart.js'
import { HttpError, handle, json } from './_lib/http.js'
import { adminDb } from './_lib/supabase.js'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// POST: checkout saves the cart once the shopper has typed their email (for one reminder email).
export const POST = handle(async (req) => {
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null
  const id = str(body?.id, 36)
  const email = str(body?.email, 200).toLowerCase()
  if (!UUID.test(id)) throw new HttpError(400, 'Invalid cart.')
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new HttpError(400, 'Invalid email.')

  const db = adminDb()
  // Re-price from the database so the reminder shows real products and prices.
  const { lines, subtotal } = await priceCart(db, parseItems(body?.items))
  const items: SavedCartItem[] = lines.map((l) => ({
    slug: l.slug,
    name: l.name,
    image: l.image,
    size: l.size,
    color: l.color,
    price: l.price,
    quantity: l.quantity,
  }))

  const { error } = await db.from('abandoned_carts').upsert(
    { id, email, name: str(body?.name, 100) || null, items, subtotal, updated_at: new Date().toISOString() },
    { onConflict: 'id' },
  )
  if (error) throw error
  return json({ ok: true })
})

// GET ?action=restore&id=…      → the saved items (the email's "Complete your order" link)
// GET ?action=unsubscribe&id=…  → stop all cart reminders for that email
export const GET = handle(async (req) => {
  const url = new URL(req.url)
  const id = url.searchParams.get('id') ?? ''
  const action = url.searchParams.get('action')
  if (!UUID.test(id)) throw new HttpError(400, 'Invalid link.')

  const db = adminDb()
  const { data: cart, error } = await db.from('abandoned_carts').select('email, items').eq('id', id).maybeSingle()
  if (error) throw error

  if (action === 'restore') {
    if (!cart) throw new HttpError(404, 'This cart has expired.')
    return json({ items: cart.items })
  }

  if (action === 'unsubscribe') {
    if (cart) await db.from('email_optouts').upsert({ email: cart.email }, { onConflict: 'email' })
    return new Response(
      `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
      <title>Unsubscribed</title>
      <body style="font-family:Arial,sans-serif;background:#F4F2EE;color:#111;display:flex;min-height:90vh;align-items:center;justify-content:center;text-align:center">
      <div><p style="font-size:24px;font-weight:900">SHREEM</p><p>You won't receive cart reminder emails any more.</p>
      <p><a href="/" style="color:#111">Back to the store</a></p></div></body>`,
      { headers: { 'Content-Type': 'text/html; charset=utf-8' } },
    )
  }

  throw new HttpError(400, 'Unknown action.')
})
