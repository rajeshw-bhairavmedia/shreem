// Exchange rates against the Indian Rupee, shared by the storefront currency
// selector and the admin product form. Rates are "1 INR = x <currency>".

export const CURRENCIES = ['INR', 'USD', 'GBP', 'EUR', 'RUB', 'AED', 'CAD', 'AUD'] as const
export type CurrencyCode = (typeof CURRENCIES)[number]
export type Rates = Record<CurrencyCode, number>

export const currencySymbols: Record<CurrencyCode, string> = {
  INR: '₹',
  USD: '$',
  GBP: '£',
  EUR: '€',
  RUB: '₽',
  AED: 'AED',
  CAD: 'C$',
  AUD: 'A$',
}

export const isCurrency = (c: unknown): c is CurrencyCode => CURRENCIES.includes(c as CurrencyCode)

const CACHE_KEY = 'shreem-fx-rates'
export const RATES_MAX_AGE = 12 * 60 * 60 * 1000 // refresh twice a day

/** Approximate rates, used by the storefront only until live rates load. Never used to save prices. */
export const FALLBACK_RATES: Rates = {
  INR: 1,
  USD: 0.0113,
  GBP: 0.0086,
  EUR: 0.0098,
  RUB: 0.9,
  AED: 0.0415,
  CAD: 0.0158,
  AUD: 0.0174,
}

export function isRates(r: unknown): r is Rates {
  return (
    !!r &&
    typeof r === 'object' &&
    CURRENCIES.every((c) => {
      const v = (r as Record<string, unknown>)[c]
      return typeof v === 'number' && Number.isFinite(v) && v > 0
    })
  )
}

const pick = (src: Record<string, unknown> | undefined, key: (c: CurrencyCode) => string) =>
  Object.fromEntries(CURRENCIES.map((c) => [c, c === 'INR' ? 1 : src?.[key(c)]]))

/** Live INR rates: ExchangeRate-API first, then the jsDelivr currency mirror. */
export async function fetchRates(): Promise<Rates> {
  try {
    const res = await fetch('https://open.er-api.com/v6/latest/INR')
    const data = await res.json()
    const rates = pick(data?.rates, (c) => c)
    if (data?.result === 'success' && isRates(rates)) return rates
  } catch {
    /* try the next source */
  }
  const res = await fetch('https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/inr.json')
  const rates = pick((await res.json())?.inr, (c) => c.toLowerCase())
  if (!isRates(rates)) throw new Error('Exchange rates are unavailable right now.')
  return rates
}

export function loadCachedRates(): { rates: Rates; at: number } | null {
  try {
    const cached = JSON.parse(localStorage.getItem(CACHE_KEY) ?? 'null')
    return cached && isRates(cached.rates) && typeof cached.at === 'number' ? cached : null
  } catch {
    return null
  }
}

/** Fresh cached rates if we have them, otherwise fetches and caches live rates. Throws if offline. */
export async function getLiveRates(): Promise<Rates> {
  const cached = loadCachedRates()
  if (cached && Date.now() - cached.at < RATES_MAX_AGE) return cached.rates
  const rates = await fetchRates()
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ rates, at: Date.now() }))
  } catch {
    /* storage blocked */
  }
  return rates
}

/** Converts an amount in `currency` to whole rupees. */
export const toInr = (amount: number, currency: CurrencyCode, rates: Rates) =>
  Math.round(amount / rates[currency])
