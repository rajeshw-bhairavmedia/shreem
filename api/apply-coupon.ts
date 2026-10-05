import { shippingFor } from '../shared/store.js'
import { applyCoupon, parseItems, priceCart, str } from './_lib/cart.js'
import { HttpError, handle, json } from './_lib/http.js'
import { adminDb } from './_lib/supabase.js'

// Checkout page: check a coupon code and preview the new total.
export const POST = handle(async (req) => {
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null
  const code = str(body?.code, 30)
  if (!code) throw new HttpError(400, 'Please enter a coupon code.')

  const db = adminDb()
  const { subtotal } = await priceCart(db, parseItems(body?.items))
  const coupon = await applyCoupon(db, code, subtotal)
  const shipping = shippingFor(subtotal - coupon.discount)
  return json({ ...coupon, subtotal, shipping, total: subtotal - coupon.discount + shipping })
})
