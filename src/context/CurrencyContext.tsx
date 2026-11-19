import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

// Product prices are stored in INR. Shoppers pick a country and see prices
// converted to its currency. Payment is still charged in INR by Razorpay.

export type CountryCode = 'IN' | 'US' | 'GB' | 'RU'
type CurrencyCode = 'INR' | 'USD' | 'GBP' | 'RUB'

export const countries: { code: CountryCode; name: string; currency: CurrencyCode; symbol: string; locale: string }[] = [
  { code: 'IN', name: 'India', currency: 'INR', symbol: '₹', locale: 'en-IN' },
  { code: 'US', name: 'USA', currency: 'USD', symbol: '$', locale: 'en-US' },
  { code: 'GB', name: 'UK', currency: 'GBP', symbol: '£', locale: 'en-GB' },
  { code: 'RU', name: 'Russia', currency: 'RUB', symbol: '₽', locale: 'ru-RU' },
]

type Rates = Record<CurrencyCode, number>

const COUNTRY_KEY = 'shreem-country'
const RATES_KEY = 'shreem-fx-rates'
const RATES_MAX_AGE = 12 * 60 * 60 * 1000 // refresh twice a day

// Used only until live rates load, or if both rate services are unreachable.
const FALLBACK_RATES: Rates = { INR: 1, USD: 0.0113, GBP: 0.0086, RUB: 0.9 }

const isRates = (r: unknown): r is Rates =>
  !!r && typeof r === 'object' && (['USD', 'GBP', 'RUB'] as const).every((c) => {
    const v = (r as Record<string, unknown>)[c]
    return typeof v === 'number' && v > 0
  })

/** Live INR rates: ExchangeRate-API first, then the jsDelivr currency mirror. */
async function fetchRates(): Promise<Rates> {
  try {
    const res = await fetch('https://open.er-api.com/v6/latest/INR')
    const data = await res.json()
    if (data?.result === 'success' && isRates(data.rates)) {
      return { INR: 1, USD: data.rates.USD, GBP: data.rates.GBP, RUB: data.rates.RUB }
    }
  } catch {
    /* try the next source */
  }
  const res = await fetch('https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/inr.json')
  const inr = (await res.json())?.inr
  const rates = { INR: 1, USD: inr?.usd, GBP: inr?.gbp, RUB: inr?.rub }
  if (!isRates(rates)) throw new Error('No exchange rates')
  return rates
}

function loadCachedRates(): { rates: Rates; at: number } | null {
  try {
    const cached = JSON.parse(localStorage.getItem(RATES_KEY) ?? 'null')
    return cached && isRates(cached.rates) && typeof cached.at === 'number' ? cached : null
  } catch {
    return null
  }
}

/** First visit: guess the country from the device's time zone (no network call). */
function guessCountry(): CountryCode {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone ?? ''
    if (tz === 'Asia/Kolkata' || tz === 'Asia/Calcutta') return 'IN'
    if (tz === 'Europe/London') return 'GB'
    if (['Europe/Moscow', 'Europe/Kaliningrad', 'Europe/Samara', 'Europe/Volgograd'].includes(tz) || /^Asia\/(Yekaterinburg|Omsk|Novosibirsk|Krasnoyarsk|Irkutsk|Yakutsk|Vladivostok|Magadan|Kamchatka)$/.test(tz)) return 'RU'
    if (/^America\/(New_York|Chicago|Denver|Los_Angeles|Phoenix|Anchorage|Detroit|Indiana|Kentucky|Boise)/.test(tz) || tz === 'Pacific/Honolulu') return 'US'
  } catch {
    /* fall through */
  }
  return 'IN'
}

function loadCountry(): CountryCode {
  try {
    const saved = localStorage.getItem(COUNTRY_KEY)
    if (countries.some((c) => c.code === saved)) return saved as CountryCode
  } catch {
    /* storage blocked */
  }
  return guessCountry()
}

interface CurrencyValue {
  country: (typeof countries)[number]
  setCountry: (code: CountryCode) => void
  /** Formats an INR amount in the selected country's currency. */
  formatPrice: (inr: number) => string
  /** True when prices are shown in a currency other than INR. */
  converted: boolean
}

const CurrencyContext = createContext<CurrencyValue | null>(null)

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [code, setCode] = useState<CountryCode>(loadCountry)
  const [rates, setRates] = useState<Rates>(() => loadCachedRates()?.rates ?? FALLBACK_RATES)

  useEffect(() => {
    const cached = loadCachedRates()
    if (cached && Date.now() - cached.at < RATES_MAX_AGE) return
    let cancelled = false
    fetchRates()
      .then((r) => {
        if (cancelled) return
        setRates(r)
        try {
          localStorage.setItem(RATES_KEY, JSON.stringify({ rates: r, at: Date.now() }))
        } catch {
          /* storage blocked */
        }
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  const setCountry = useCallback((next: CountryCode) => {
    setCode(next)
    try {
      localStorage.setItem(COUNTRY_KEY, next)
    } catch {
      /* storage blocked */
    }
  }, [])

  const value = useMemo<CurrencyValue>(() => {
    const country = countries.find((c) => c.code === code) ?? countries[0]
    const whole = country.currency === 'INR' || country.currency === 'RUB'
    const fmt = new Intl.NumberFormat(country.locale, {
      style: 'currency',
      currency: country.currency,
      currencyDisplay: 'narrowSymbol',
      minimumFractionDigits: whole ? 0 : 2,
      maximumFractionDigits: whole ? 0 : 2,
    })
    return {
      country,
      setCountry,
      converted: country.currency !== 'INR',
      formatPrice: (inr: number) => fmt.format(inr * rates[country.currency]),
    }
  }, [code, rates, setCountry])

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>
}

export function useCurrency() {
  const ctx = useContext(CurrencyContext)
  if (!ctx) throw new Error('useCurrency must be used inside CurrencyProvider')
  return ctx
}
