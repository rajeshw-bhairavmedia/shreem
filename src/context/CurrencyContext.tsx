import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { FALLBACK_RATES, getLiveRates, loadCachedRates, type CurrencyCode, type Rates } from '../lib/fx'

// Product prices are stored in INR. Shoppers pick a country and see prices
// converted to its currency. Payment is still charged in INR by Razorpay.

export type CountryCode = 'IN' | 'US' | 'GB' | 'RU'

export const countries: { code: CountryCode; name: string; currency: CurrencyCode; symbol: string; locale: string }[] = [
  { code: 'IN', name: 'India', currency: 'INR', symbol: '₹', locale: 'en-IN' },
  { code: 'US', name: 'USA', currency: 'USD', symbol: '$', locale: 'en-US' },
  { code: 'GB', name: 'UK', currency: 'GBP', symbol: '£', locale: 'en-GB' },
  { code: 'RU', name: 'Russia', currency: 'RUB', symbol: '₽', locale: 'ru-RU' },
]

const COUNTRY_KEY = 'shreem-country'

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
  // Cached rates (or approximate fallback ones) show instantly; live rates replace them when loaded.
  const [rates, setRates] = useState<Rates>(() => loadCachedRates()?.rates ?? FALLBACK_RATES)

  useEffect(() => {
    let cancelled = false
    getLiveRates()
      .then((r) => !cancelled && setRates(r))
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
