import type { Order } from '../../shared/store.js'

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
  const key = process.env.RESEND_API_KEY
  const from = process.env.ORDER_EMAIL_FROM
  if (!key || !from) return

  const send = (to: string, subject: string, html: string) =>
    fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to, subject, html }),
    })

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
