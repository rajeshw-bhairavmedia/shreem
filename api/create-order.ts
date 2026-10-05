import {
  INDIAN_STATES,
  MAX_QUANTITY_PER_ITEM,
  shippingFor,
  type Address,
  type OrderItem,
} from '../shared/store.js'
import { HttpError, env, handle, json } from './_lib/http.js'
import { createRazorpayOrder } from './_lib/razorpay.js'
import { adminDb } from './_lib/supabase.js'

interface CartItemInput {
  slug: string
  size: string
  color: string
  quantity: number
}

const str = (v: unknown, max = 200) => (typeof v === 'string' ? v.trim().slice(0, max) : '')

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

function parseItems(raw: unknown): CartItemInput[] {
  if (!Array.isArray(raw) || raw.length === 0) throw new HttpError(400, 'Your cart is empty.')
  if (raw.length > 30) throw new HttpError(400, 'Too many items in one order.')
  return raw.map((r) => {
    const i = (r ?? {}) as Record<string, unknown>
    const quantity = Number(i.quantity)
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QUANTITY_PER_ITEM) {
      throw new HttpError(400, `Quantity must be between 1 and ${MAX_QUANTITY_PER_ITEM}.`)
    }
    return { slug: str(i.slug), size: str(i.size, 50), color: str(i.color, 50), quantity }
  })
}

interface ProductRow {
  id: string
  slug: string
  name: string
  price: number
  images: string[]
  sizes: string[]
  colors: string[]
  stock: Record<string, number>
  is_active: boolean
}

export const POST = handle(async (req) => {
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null
  const items = parseItems(body?.items)
  const customer = parseCustomer(body?.customer)

  const db = adminDb()
  const { data, error } = await db
    .from('products')
    .select('id, slug, name, price, images, sizes, colors, stock, is_active')
    .in('slug', [...new Set(items.map((i) => i.slug))])
  if (error) throw error
  const products = data as ProductRow[]

  // Prices and stock always come from the database, never from the browser.
  const requested = new Map<string, number>()
  const lines: OrderItem[] = items.map((item) => {
    const p = products.find((x) => x.slug === item.slug && x.is_active)
    if (!p) throw new HttpError(409, 'An item in your cart is no longer available. Please remove it and try again.')
    if (p.sizes.length && !p.sizes.includes(item.size)) throw new HttpError(409, `Please choose an available size for ${p.name}.`)
    if (p.colors.length && !p.colors.includes(item.color)) throw new HttpError(409, `Please choose an available colour for ${p.name}.`)

    const key = `${p.id}|${item.size}`
    const total = (requested.get(key) ?? 0) + item.quantity
    requested.set(key, total)
    const available = p.stock[item.size]
    if (available !== undefined && total > available) {
      throw new HttpError(
        409,
        available > 0
          ? `Only ${available} left of ${p.name}${item.size ? ` (size ${item.size})` : ''}.`
          : `${p.name}${item.size ? ` (size ${item.size})` : ''} is sold out.`,
      )
    }
    return {
      product_id: p.id,
      slug: p.slug,
      name: p.name,
      image: p.images[0] ?? '',
      size: item.size,
      color: item.color,
      price: p.price,
      quantity: item.quantity,
    }
  })

  const subtotal = lines.reduce((sum, l) => sum + l.price * l.quantity, 0)
  const shipping = shippingFor(subtotal)
  const total = subtotal + shipping

  const { data: order, error: insertError } = await db
    .from('orders')
    .insert({
      customer_name: customer.name,
      customer_email: customer.email,
      customer_phone: customer.phone,
      address: customer.address,
      items: lines,
      subtotal,
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
