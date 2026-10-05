import type { SupabaseClient } from '@supabase/supabase-js'
import { MAX_QUANTITY_PER_ITEM, discountFor, type Coupon, type OrderItem } from '../../shared/store.js'
import { HttpError } from './http.js'

export interface CartItemInput {
  slug: string
  size: string
  color: string
  quantity: number
}

export const str = (v: unknown, max = 200) => (typeof v === 'string' ? v.trim().slice(0, max) : '')

export function parseItems(raw: unknown): CartItemInput[] {
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
  hsn: string | null
  is_active: boolean
}

/** Prices the cart from the database (never from the browser) and checks stock. */
export async function priceCart(db: SupabaseClient, items: CartItemInput[]) {
  const { data, error } = await db
    .from('products')
    .select('id, slug, name, price, images, sizes, colors, stock, hsn, is_active')
    .in('slug', [...new Set(items.map((i) => i.slug))])
  if (error) throw error
  const products = data as ProductRow[]

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
      hsn: p.hsn,
    }
  })

  return { lines, subtotal: lines.reduce((sum, l) => sum + l.price * l.quantity, 0) }
}

const rupees = (n: number) => `₹${n.toLocaleString('en-IN')}`

/** Validates a coupon code for this subtotal. Throws a customer-friendly error if it can't be used. */
export async function applyCoupon(db: SupabaseClient, rawCode: string, subtotal: number) {
  const code = rawCode.trim().toUpperCase()
  const { data, error } = await db.from('coupons').select('*').eq('code', code).maybeSingle()
  if (error) throw error
  const coupon = data as Coupon | null
  const now = Date.now()
  if (!coupon || !coupon.is_active) throw new HttpError(400, 'This coupon code is not valid.')
  if (coupon.starts_at && Date.parse(coupon.starts_at) > now) throw new HttpError(400, 'This coupon is not active yet.')
  if (coupon.ends_at && Date.parse(coupon.ends_at) < now) throw new HttpError(400, 'This coupon has expired.')
  if (coupon.max_uses !== null && coupon.used_count >= coupon.max_uses) {
    throw new HttpError(400, 'This coupon has reached its usage limit.')
  }
  if (subtotal < coupon.min_subtotal) {
    throw new HttpError(400, `Add ${rupees(coupon.min_subtotal - subtotal)} more to use ${coupon.code}.`)
  }
  return { code: coupon.code, discount: discountFor(coupon, subtotal) }
}
