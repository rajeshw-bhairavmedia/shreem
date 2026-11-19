import { ChevronDown, Globe } from 'lucide-react'
import { countries, useCurrency, type CountryCode } from '../context/CurrencyContext'

/** Compact country / currency picker. A native select, so it works well on phones. */
export default function CountrySelector({ className = '' }: { className?: string }) {
  const { country, setCountry } = useCurrency()

  return (
    <label className={`relative flex items-center gap-1.5 h-9 pl-2.5 pr-7 rounded-full hover:bg-shreem-black/5 transition-colors cursor-pointer ${className}`}>
      <Globe className="w-4 h-4 text-shreem-black flex-shrink-0" aria-hidden />
      <span className="text-xs font-semibold tracking-wide text-shreem-black whitespace-nowrap">
        {country.symbol} {country.currency}
      </span>
      <ChevronDown className="absolute right-2 w-3.5 h-3.5 text-shreem-gray pointer-events-none" aria-hidden />
      <select
        value={country.code}
        onChange={(e) => setCountry(e.target.value as CountryCode)}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        aria-label="Country and currency"
      >
        {countries.map((c) => (
          <option key={c.code} value={c.code}>
            {c.name} ({c.symbol} {c.currency})
          </option>
        ))}
      </select>
    </label>
  )
}
