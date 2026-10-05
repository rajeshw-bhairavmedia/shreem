import { requireAdmin } from './_lib/auth.js'
import { HttpError, handle, json } from './_lib/http.js'
import { createRazorpayRefund } from './_lib/razorpay.js'
import { adminDb } from './_lib/supabase.js'

// /admin → order → Refund. Sends money back through Razorpay (full or partial).
export const POST = handle(async (req) => {
  const adminId = await requireAdmin(req)
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null
  const orderId = typeof body?.orderId === 'string' ? body.orderId : ''
  const amount = Number(body?.amount)
  const reason = typeof body?.reason === 'string' ? body.reason.trim().slice(0, 200) : ''
  if (!Number.isInteger(amount) || amount < 1) throw new HttpError(400, 'Enter a refund amount in whole rupees.')

  const db = adminDb()
  const { data: order, error } = await db
    .from('orders')
    .select('id, order_number, status, total, refunded_amount, razorpay_payment_id')
    .eq('id', orderId)
    .maybeSingle()
  if (error) throw error
  if (!order) throw new HttpError(404, 'Order not found.')
  if (!order.razorpay_payment_id || order.status === 'pending_payment') {
    throw new HttpError(400, 'This order was never paid, so there is nothing to refund.')
  }
  const refundable = order.total - order.refunded_amount
  if (amount > refundable) {
    throw new HttpError(400, refundable > 0 ? `You can refund at most ₹${refundable.toLocaleString('en-IN')}.` : 'This order is already fully refunded.')
  }

  // Reserve the amount first, so a double click can never refund twice.
  const { data: reserved, error: reserveError } = await db
    .from('orders')
    .update({ refunded_amount: order.refunded_amount + amount })
    .eq('id', order.id)
    .eq('refunded_amount', order.refunded_amount)
    .select('id')
  if (reserveError) throw reserveError
  if (!reserved?.length) throw new HttpError(409, 'Another refund was just made on this order. Reload and try again.')

  try {
    const refund = await createRazorpayRefund(order.razorpay_payment_id, amount * 100, { order_number: order.order_number })
    const { error: insertError } = await db.from('refunds').insert({
      order_id: order.id,
      razorpay_refund_id: refund.id,
      amount,
      status: refund.status,
      reason: reason || null,
      created_by: adminId,
    })
    if (insertError) console.error('Refund saved in Razorpay but not recorded:', refund.id, insertError)
    return json({ refundId: refund.id, status: refund.status, refundedAmount: order.refunded_amount + amount })
  } catch (err) {
    // Razorpay refused: release the reserved amount.
    await db.from('orders').update({ refunded_amount: order.refunded_amount }).eq('id', order.id)
    throw err
  }
})
