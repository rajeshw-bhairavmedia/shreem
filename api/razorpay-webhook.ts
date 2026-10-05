import { handle, json } from './_lib/http.js'
import { finalizePayment } from './_lib/orders.js'
import { isValidWebhookSignature } from './_lib/razorpay.js'

interface WebhookEvent {
  event: string
  payload?: {
    payment?: { entity?: { id?: string; order_id?: string } }
    order?: { entity?: { id?: string } }
  }
}

// Backup to verify-payment: marks orders paid even if the customer closes the
// tab before the browser reports back. Set up in Razorpay Dashboard > Webhooks.
export const POST = handle(async (req) => {
  const rawBody = await req.text()
  if (!isValidWebhookSignature(rawBody, req.headers.get('x-razorpay-signature') ?? '')) {
    return json({ error: 'Invalid signature' }, 400)
  }

  const event = JSON.parse(rawBody) as WebhookEvent
  if (event.event === 'payment.captured' || event.event === 'order.paid') {
    const payment = event.payload?.payment?.entity
    const orderId = payment?.order_id ?? event.payload?.order?.entity?.id
    if (orderId && payment?.id) await finalizePayment(orderId, payment.id)
  }
  return json({ ok: true })
})
