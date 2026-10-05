import type { OrderItem } from '../shared/store.js'
import { str } from './_lib/cart.js'
import { HttpError, handle, json } from './_lib/http.js'
import { adminDb } from './_lib/supabase.js'

// Product page → "Write a review". Only customers with a paid order for the product
// can review it (order number + email). Reviews appear after admin approval.
export const POST = handle(async (req) => {
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null
  const slug = str(body?.slug, 200)
  const orderNumber = str(body?.orderNumber, 20).toUpperCase().replace(/\s/g, '')
  const email = str(body?.email, 200).toLowerCase()
  const name = str(body?.name, 60)
  const title = str(body?.title, 100)
  const text = str(body?.body, 2000)
  const rating = Number(body?.rating)

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) throw new HttpError(400, 'Please choose a star rating.')
  if (name.length < 2) throw new HttpError(400, 'Please enter your name.')
  if (text.length < 10) throw new HttpError(400, 'Please write at least a sentence (10+ characters).')
  if (!orderNumber || !email) throw new HttpError(400, 'Enter the order number and email from your order.')

  const db = adminDb()
  const [{ data: product }, { data: order }] = await Promise.all([
    db.from('products').select('id').eq('slug', slug).maybeSingle(),
    db
      .from('orders')
      .select('id, items, status')
      .eq('order_number', orderNumber)
      .eq('customer_email', email)
      .in('status', ['paid', 'shipped', 'delivered'])
      .maybeSingle(),
  ])
  if (!product) throw new HttpError(404, 'Product not found.')
  if (!order) throw new HttpError(403, "We couldn't find a paid order with that order number and email.")
  if (!(order.items as OrderItem[]).some((i) => i.product_id === product.id)) {
    throw new HttpError(403, "That order doesn't include this product.")
  }

  const { error } = await db.from('reviews').insert({
    product_id: product.id,
    order_id: order.id,
    name,
    rating,
    title: title || null,
    body: text,
  })
  if (error?.code === '23505') throw new HttpError(409, "You've already reviewed this product for this order. Thank you!")
  if (error) throw error
  return json({ ok: true })
})
