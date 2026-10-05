import { CART_REMINDER_AFTER_HOURS, CART_REMINDER_MAX_DAYS, type AbandonedCart } from '../shared/store.js'
import { cartReminderHtml, emailEnabled, sendEmail } from './_lib/email.js'
import { HttpError, handle, json } from './_lib/http.js'
import { adminDb } from './_lib/supabase.js'

const HOUR = 60 * 60 * 1000

// Run by Vercel Cron (see vercel.json). Sends ONE reminder per unpaid cart, and at most
// one per email address per week; never to anyone who unsubscribed.
export const GET = handle(async (req) => {
  const secret = process.env.CRON_SECRET
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) throw new HttpError(401, 'Unauthorized')
  if (!emailEnabled()) return json({ sent: 0, skipped: 'Email is not configured (RESEND_API_KEY / ORDER_EMAIL_FROM).' })

  const siteUrl = (process.env.SITE_URL || new URL(req.url).origin).replace(/\/$/, '')
  const now = Date.now()
  const db = adminDb()

  const { data: due, error } = await db
    .from('abandoned_carts')
    .select('*')
    .is('reminder_sent_at', null)
    .is('recovered_at', null)
    .lt('updated_at', new Date(now - CART_REMINDER_AFTER_HOURS * HOUR).toISOString())
    .gt('updated_at', new Date(now - CART_REMINDER_MAX_DAYS * 24 * HOUR).toISOString())
    .order('updated_at')
    .limit(200)
  if (error) throw error
  const carts = (due ?? []) as AbandonedCart[]
  if (!carts.length) return json({ sent: 0 })

  const emails = [...new Set(carts.map((c) => c.email))]
  const [{ data: optouts }, { data: recent }] = await Promise.all([
    db.from('email_optouts').select('email').in('email', emails),
    db
      .from('abandoned_carts')
      .select('email')
      .in('email', emails)
      .gt('reminder_sent_at', new Date(now - 7 * 24 * HOUR).toISOString()),
  ])
  const skip = new Set([...(optouts ?? []), ...(recent ?? [])].map((r) => r.email))

  let sent = 0
  for (const cart of carts) {
    if (skip.has(cart.email)) continue
    skip.add(cart.email) // one email per address per run, even with several carts
    const withAbsoluteImages = {
      ...cart,
      items: cart.items.map((i) => ({ ...i, image: i.image.startsWith('/') ? siteUrl + i.image : i.image })),
    }
    try {
      await sendEmail(
        cart.email,
        'You left something in your cart',
        cartReminderHtml(
          withAbsoluteImages,
          `${siteUrl}/cart/restore?id=${cart.id}`,
          `${siteUrl}/api/cart-reminder?action=unsubscribe&id=${cart.id}`,
        ),
      )
      await db.from('abandoned_carts').update({ reminder_sent_at: new Date().toISOString() }).eq('id', cart.id)
      sent++
    } catch (err) {
      console.error('Cart reminder failed for', cart.id, err)
    }
  }
  return json({ sent })
})
