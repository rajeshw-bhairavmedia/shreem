import { INDIAN_STATES, shippingFor, type Address } from '../shared/store.js'
import { applyCoupon, parseItems, priceCart, str } from './_lib/cart.js'
import { HttpError, env, handle, json } from './_lib/http.js'
import { createRazorpayOrder } from './_lib/razorpay.js'
import { adminDb } from './_lib/supabase.js'

function parseCustomer(raw: unknown) {
  const c = (raw ?? {}) as Record<string, unknown>
  const name = str(c.name, 100)
  const email = str(c.email, 200).toLowerCase()
  const phone = str(c.phone, 20).replace(/[\s-]/g, '').replace(/^(\+91|91|0)(?=\d{10}$)/, '')
  const address: Address = {
    line1: str(c.line1),
    line2: str(c.line2),
    city: str(c.city, 100),
    state: str(c.state, 100),
    pincode: str(c.pincode, 6),
  }
  if (name.length < 2) throw new HttpError(400, 'Please enter your full name.')
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new HttpError(400, 'Please enter a valid email address.')
  if (!/^[6-9]\d{9}$/.test(phone)) throw new HttpError(400, 'Please enter a valid 10-digit mobile number.')
  if (!address.line1) throw new HttpError(400, 'Please enter your address.')
  if (!address.city) throw new HttpError(400, 'Please enter your city.')
  if (!INDIAN_STATES.includes(address.state)) throw new HttpError(400, 'Please choose your state.')
  if (!/^\d{6}$/.test(address.pincode)) throw new HttpError(400, 'Please enter a valid 6-digit PIN code.')
  return { name, email, phone, address }
}

export const POST = handle(async (req) => {
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null
  const items = parseItems(body?.items)
  const customer = parseCustomer(body?.customer)
  const couponCode = str(body?.couponCode, 30)

  const db = adminDb()
  // Prices, stock and discounts always come from the database, never from the browser.
  const { lines, subtotal } = await priceCart(db, items)
  const coupon = couponCode ? await applyCoupon(db, couponCode, subtotal) : null
  const discount = coupon?.discount ?? 0
  const shipping = shippingFor(subtotal - discount)
  const total = subtotal - discount + shipping

  const { data: order, error: insertError } = await db
    .from('orders')
    .insert({
      customer_name: customer.name,
      customer_email: customer.email,
      customer_phone: customer.phone,
      address: customer.address,
      items: lines,
      subtotal,
      discount,
      coupon_code: coupon?.code ?? null,
      shipping,
      total,
    })
    .select('id, order_number')
    .single()
  if (insertError) throw insertError

  let razorpayOrderId: string
  try {
    razorpayOrderId = await createRazorpayOrder(total * 100, order.order_number, { order_number: order.order_number })
  } catch (err) {
    await db.from('orders').delete().eq('id', order.id)
    throw err
  }

  const { error: updateError } = await db.from('orders').update({ razorpay_order_id: razorpayOrderId }).eq('id', order.id)
  if (updateError) throw updateError

  return json({
    orderNumber: order.order_number,
    razorpayOrderId,
    amount: total * 100,
    currency: 'INR',
    keyId: env('RAZORPAY_KEY_ID'),
  })
})
