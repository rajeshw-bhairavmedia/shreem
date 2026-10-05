// Pricing rules shared by the website and the payment server, so the total a
// customer sees is exactly what they are charged.

/** Orders at or above this subtotal (₹) ship free. */
export const FREE_SHIPPING_ABOVE = 999

/** TODO: confirm your shipping charge (₹) for orders below the free-shipping amount. */
export const SHIPPING_FEE = 99

export const MAX_QUANTITY_PER_ITEM = 10

export const shippingFor = (subtotal: number) =>
  subtotal === 0 || subtotal >= FREE_SHIPPING_ABOVE ? 0 : SHIPPING_FEE

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
  shipping: number
  total: number
  razorpay_order_id: string | null
  razorpay_payment_id: string | null
  tracking: string | null
  admin_notes: string | null
  created_at: string
  paid_at: string | null
  shipped_at: string | null
}
