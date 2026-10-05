// Pricing rules shared by the website and the payment server, so the total a
// customer sees is exactly what they are charged.

/** Orders at or above this subtotal (₹) ship free. */
export const FREE_SHIPPING_ABOVE = 999

/** TODO: confirm your shipping charge (₹) for orders below the free-shipping amount. */
export const SHIPPING_FEE = 99

export const MAX_QUANTITY_PER_ITEM = 10

/** Shipping is charged on the amount after any coupon discount. */
export const shippingFor = (subtotal: number) =>
  subtotal === 0 || subtotal >= FREE_SHIPPING_ABOVE ? 0 : SHIPPING_FEE

export interface Coupon {
  id: string
  code: string
  type: 'percent' | 'flat'
  value: number
  min_subtotal: number
  max_uses: number | null
  used_count: number
  starts_at: string | null
  ends_at: string | null
  is_active: boolean
  created_at: string
}

/** Rupees off for a coupon on this subtotal (0 if the minimum isn't met). Never makes an order free. */
export function discountFor(coupon: Pick<Coupon, 'type' | 'value' | 'min_subtotal'>, subtotal: number) {
  if (subtotal < coupon.min_subtotal) return 0
  const off = coupon.type === 'percent' ? Math.floor((subtotal * coupon.value) / 100) : coupon.value
  return Math.max(0, Math.min(off, subtotal - 1))
}

/**
 * GST rate (%) on clothing by price per piece, for the invoice. Prices on the site include GST.
 * TODO: confirm these rates with your CA. Currently 5% up to ₹2,500 per piece, 18% above.
 */
export const gstRateFor = (unitPrice: number) => (unitPrice <= 2500 ? 5 : 18)

export const INDIAN_STATES = [
  'Andaman and Nicobar Islands', 'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chandigarh',
  'Chhattisgarh', 'Dadra and Nagar Haveli and Daman and Diu', 'Delhi', 'Goa', 'Gujarat', 'Haryana',
  'Himachal Pradesh', 'Jammu and Kashmir', 'Jharkhand', 'Karnataka', 'Kerala', 'Ladakh', 'Lakshadweep',
  'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Puducherry',
  'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand',
  'West Bengal',
]

export type OrderStatus = 'pending_payment' | 'paid' | 'shipped' | 'delivered' | 'cancelled'

export interface OrderItem {
  product_id: string
  slug: string
  name: string
  image: string
  size: string
  color: string
  price: number
  quantity: number
  hsn?: string | null
}

export interface Address {
  line1: string
  line2: string
  city: string
  state: string
  pincode: string
}

export interface Order {
  id: string
  order_number: string
  status: OrderStatus
  customer_name: string
  customer_email: string
  customer_phone: string
  address: Address
  items: OrderItem[]
  subtotal: number
  discount: number
  coupon_code: string | null
  shipping: number
  total: number
  invoice_number: string | null
  razorpay_order_id: string | null
  razorpay_payment_id: string | null
  tracking: string | null
  admin_notes: string | null
  created_at: string
  paid_at: string | null
  shipped_at: string | null
}
