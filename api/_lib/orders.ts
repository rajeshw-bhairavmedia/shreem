import type { Order } from '../../shared/store.js'
import { sendOrderEmails } from './email.js'
import { adminDb } from './supabase.js'

/**
 * Marks the order paid (once) and reduces stock. Safe to call from both the
 * browser verification and the webhook; emails go out only the first time.
 */
export async function finalizePayment(razorpayOrderId: string, paymentId: string): Promise<Order | null> {
  const { data, error } = await adminDb().rpc('mark_order_paid', {
    p_razorpay_order_id: razorpayOrderId,
    p_payment_id: paymentId,
  })
  if (error) throw error
  if (!data) return null
  const { order, newly_paid } = data as { order: Order; newly_paid: boolean }
  if (newly_paid) await sendOrderEmails(order)
  return order
}
