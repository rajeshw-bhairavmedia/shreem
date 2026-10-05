import type { AbandonedCart, Order } from '../../shared/store.js'

const escape = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)

const rupees = (n: number) => `₹${n.toLocaleString('en-IN')}`

function orderSummaryHtml(o: Order) {
  const rows = o.items
    .map(
      (i) =>
        `<tr><td style="padding:6px 0">${escape(i.name)}<br><small style="color:#6e6a63">${escape(
          [i.size, i.color].filter(Boolean).join(' / '),
        )} × ${i.quantity}</small></td><td style="text-align:right">${rupees(i.price * i.quantity)}</td></tr>`,
    )
    .join('')
  const a = o.address
  return `
    <table style="width:100%;border-collapse:collapse;font-family:Arial,sans-serif;font-size:14px">${rows}
      ${o.discount ? `<tr><td style="padding-top:12px">Discount (${escape(o.coupon_code ?? '')})</td><td style="text-align:right;padding-top:12px">−${rupees(o.discount)}</td></tr>` : ''}
      <tr><td style="padding-top:12px">Shipping</td><td style="text-align:right;padding-top:12px">${o.shipping ? rupees(o.shipping) : 'Free'}</td></tr>
      <tr><td><b>Total paid</b></td><td style="text-align:right"><b>${rupees(o.total)}</b></td></tr>
    </table>
    <p style="font-family:Arial,sans-serif;font-size:14px"><b>Ship to</b><br>${escape(o.customer_name)}<br>${escape(a.line1)}${
      a.line2 ? `<br>${escape(a.line2)}` : ''
    }<br>${escape(a.city)}, ${escape(a.state)} ${escape(a.pincode)}<br>${escape(o.customer_phone)}</p>`
}

/**
 * Sends order confirmation emails through Resend (https://resend.com) when
 * RESEND_API_KEY and ORDER_EMAIL_FROM are set. Never throws: a failed email
 * must not fail a paid order.
 */
export async function sendOrderEmails(o: Order) {
  if (!emailEnabled()) return
  const send = sendEmail

  const summary = orderSummaryHtml(o)
  const results = await Promise.allSettled([
    send(
      o.customer_email,
      `Your Shreem Lifestyle order ${o.order_number} is confirmed`,
      `<p style="font-family:Arial,sans-serif;font-size:14px">Hi ${escape(o.customer_name)},<br><br>Thank you for your order! We'll let you know when it ships.</p>${summary}`,
    ),
    process.env.ORDER_NOTIFY_EMAIL
      ? send(process.env.ORDER_NOTIFY_EMAIL, `New order ${o.order_number} – ${rupees(o.total)}`, summary)
      : Promise.resolve(null),
  ])
  for (const r of results) if (r.status === 'rejected') console.error('Order email failed:', r.reason)
}

export const emailEnabled = () => Boolean(process.env.RESEND_API_KEY && process.env.ORDER_EMAIL_FROM)

/** Sends one email through Resend. Throws if Resend rejects it. */
export async function sendEmail(to: string, subject: string, html: string) {
  const res = await fetch(`${process.env.RESEND_API_BASE || 'https://api.resend.com'}/emails`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: process.env.ORDER_EMAIL_FROM, to, subject, html }),
  })
  if (!res.ok) throw new Error(`Resend error ${res.status}: ${await res.text()}`)
}

/** The one reminder sent for an unpaid cart. */
export function cartReminderHtml(cart: AbandonedCart, restoreUrl: string, unsubscribeUrl: string) {
  const rows = cart.items
    .map(
      (i) =>
        `<tr><td style="padding:8px 0;width:64px">${i.image ? `<img src="${escape(i.image)}" width="56" height="70" style="object-fit:cover;border-radius:4px" alt="">` : ''}</td>` +
        `<td style="padding:8px">${escape(i.name)}<br><small style="color:#6e6a63">${escape([i.size, i.color].filter(Boolean).join(' / '))} × ${i.quantity}</small></td>` +
        `<td style="text-align:right">${rupees(i.price * i.quantity)}</td></tr>`,
    )
    .join('')
  return `
    <div style="font-family:Arial,sans-serif;font-size:14px;color:#111;max-width:520px">
      <p style="font-size:22px;font-weight:900;letter-spacing:-0.5px;margin:0 0 16px">SHREEM</p>
      <p>Hi ${escape(cart.name || 'there')},</p>
      <p>You left a few pieces in your cart. We've saved them for you:</p>
      <table style="width:100%;border-collapse:collapse">${rows}</table>
      <p style="margin:24px 0">
        <a href="${escape(restoreUrl)}" style="background:#D4A24A;color:#111;padding:12px 28px;border-radius:999px;text-decoration:none;font-weight:bold;text-transform:uppercase;font-size:13px;letter-spacing:1px">Complete your order</a>
      </p>
      <p style="color:#6e6a63;font-size:12px">Items are not reserved and may sell out.<br>
      This is a one-time reminder. <a href="${escape(unsubscribeUrl)}" style="color:#6e6a63">Don't send me cart reminders</a>.</p>
    </div>`
}
