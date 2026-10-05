import { HttpError, handle, json } from './_lib/http.js'
import { finalizePayment } from './_lib/orders.js'
import { isValidPaymentSignature } from './_lib/razorpay.js'

// Called by the checkout page after Razorpay reports a successful payment.
export const POST = handle(async (req) => {
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null
  const orderId = body?.razorpay_order_id
  const paymentId = body?.razorpay_payment_id
  const signature = body?.razorpay_signature
  if (typeof orderId !== 'string' || typeof paymentId !== 'string' || typeof signature !== 'string') {
    throw new HttpError(400, 'Missing payment details.')
  }
  if (!isValidPaymentSignature(orderId, paymentId, signature)) {
    throw new HttpError(400, 'We could not verify your payment. If money was deducted, please contact us.')
  }

  const order = await finalizePayment(orderId, paymentId)
  if (!order) throw new HttpError(404, 'Order not found.')
  return json({ orderNumber: order.order_number, total: order.total, email: order.customer_email })
})
