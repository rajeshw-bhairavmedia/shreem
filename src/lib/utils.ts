import { site } from '../config/site'
import type { CartLine, Product } from '../types'

export const formatPrice = (amount: number) => `₹${amount.toLocaleString('en-IN')}`

export const categoryLabel = (p: Product) =>
  p.category === 'occasion'
    ? 'Occasion Wear'
    : [p.category, p.subcategory].filter(Boolean).join(' • ')

/** True when every word of the query appears in the product's name, description, category or colors. */
export function matchesQuery(p: Product, query: string) {
  const haystack = [p.name, p.description, categoryLabel(p), ...p.colors].join(' ').toLowerCase()
  return query
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((word) => haystack.includes(word))
}

export function openWhatsApp(text: string) {
  const url = `https://wa.me/${site.whatsappNumber}?text=${encodeURIComponent(text)}`
  window.open(url, '_blank', 'noopener,noreferrer')
}

export function orderMessage(lines: CartLine[]) {
  const items = lines.map((l, i) => {
    const options = [l.size && `Size: ${l.size}`, l.color && `Color: ${l.color}`]
      .filter(Boolean)
      .join(', ')
    return `${i + 1}. ${l.name}${options ? ` (${options})` : ''} x ${l.quantity} = ${formatPrice(l.price * l.quantity)}`
  })
  const total = lines.reduce((sum, l) => sum + l.price * l.quantity, 0)
  return `Hi! I'd like to place an order:\n\n${items.join('\n')}\n\nTotal: ${formatPrice(total)}\n\nPlease confirm availability.`
}

const formspreeId = import.meta.env.VITE_FORMSPREE_ID

export const formsEnabled = Boolean(formspreeId)

/** Sends form data to your inbox through Formspree. */
export async function submitForm(data: Record<string, string>) {
  const res = await fetch(`https://formspree.io/f/${formspreeId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error('Could not send the form. Please try again.')
}
