import { Info, Ruler, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

type Fit = 'women' | 'men'
/** Tops = kurtas, kurta sets, anarkalis (sized by bust/chest). Bottoms = pants, palazzos, salwars etc. (sized by waist). */
type Garment = 'top' | 'bottom'
type MeasureKey = 'bust' | 'waist' | 'hips' | 'length'
type Region = 'UK' | 'US' | 'EU' | 'AUS'
interface Chart {
  /** Measurements per size, in inches (cm is calculated). Bust/chest, waist and hips are body measurements; length is garment length. */
  indian: Record<string, Partial<Record<MeasureKey, number>>>
  /** The same size in other sizing systems. */
  international: Record<string, Record<Region, string>>
}

// ---------------------------------------------------------------------------
// PROVISIONAL size charts.
//
// Shreem has not confirmed its own measurements yet. These are generic,
// industry-standard estimates for Indian ethnic wear (TOP_CHARTS: kurtas /
// kurta sets; BOTTOM_CHARTS: pants / palazzos), rounded to common size steps. They are not Shreem's official measurements
// and are not copied from any other brand. The popup labels them as
// provisional while SIZES_CONFIRMED is false.
//
// Covers every size the site sells (XS–3XL). "Free Size" items have no chart.
// When Shreem shares its real measurements: replace the numbers below and set
// SIZES_CONFIRMED to true. Any size not listed here shows "–".
// ---------------------------------------------------------------------------
const SIZES_CONFIRMED = false

const TOP_CHARTS: Record<Fit, Chart> = {
  women: {
    indian: {
      XS: { bust: 32, waist: 26, hips: 35, length: 43.5 },
      S: { bust: 34, waist: 28, hips: 37, length: 44 },
      M: { bust: 36, waist: 30, hips: 39, length: 44.5 },
      L: { bust: 38, waist: 32, hips: 41, length: 45 },
      XL: { bust: 40, waist: 34, hips: 43, length: 45.5 },
      XXL: { bust: 42, waist: 36, hips: 45, length: 46 },
      '3XL': { bust: 44, waist: 38, hips: 47, length: 46.5 },
    },
    international: {
      XS: { UK: '6', US: '2', EU: '34', AUS: '6' },
      S: { UK: '8', US: '4', EU: '36', AUS: '8' },
      M: { UK: '10', US: '6', EU: '38', AUS: '10' },
      L: { UK: '12', US: '8', EU: '40', AUS: '12' },
      XL: { UK: '14', US: '10', EU: '42', AUS: '14' },
      XXL: { UK: '16', US: '12', EU: '44', AUS: '16' },
      '3XL': { UK: '18', US: '14', EU: '46', AUS: '18' },
    },
  },
  men: {
    indian: {
      XS: { bust: 36, waist: 30, hips: 36, length: 39 },
      S: { bust: 38, waist: 32, hips: 38, length: 40 },
      M: { bust: 40, waist: 34, hips: 40, length: 41 },
      L: { bust: 42, waist: 36, hips: 42, length: 42 },
      XL: { bust: 44, waist: 38, hips: 44, length: 43 },
      XXL: { bust: 46, waist: 40, hips: 46, length: 44 },
      '3XL': { bust: 48, waist: 42, hips: 48, length: 45 },
    },
    // Men's sizes are by chest: UK/US/AUS use chest inches, EU uses chest cm ÷ 2.
    international: {
      XS: { UK: '36', US: '36', EU: '46', AUS: '36' },
      S: { UK: '38', US: '38', EU: '48', AUS: '38' },
      M: { UK: '40', US: '40', EU: '50', AUS: '40' },
      L: { UK: '42', US: '42', EU: '52', AUS: '42' },
      XL: { UK: '44', US: '44', EU: '54', AUS: '44' },
      XXL: { UK: '46', US: '46', EU: '56', AUS: '46' },
      '3XL': { UK: '48', US: '48', EU: '58', AUS: '48' },
    },
  },
}

// Bottoms: waist and hips are body measurements; length is waist to hem (outside leg).
const BOTTOM_CHARTS: Record<Fit, Chart> = {
  women: {
    indian: {
      XS: { waist: 26, hips: 35, length: 38 },
      S: { waist: 28, hips: 37, length: 38.5 },
      M: { waist: 30, hips: 39, length: 39 },
      L: { waist: 32, hips: 41, length: 39.5 },
      XL: { waist: 34, hips: 43, length: 40 },
      XXL: { waist: 36, hips: 45, length: 40.5 },
      '3XL': { waist: 38, hips: 47, length: 41 },
    },
    // Women's bottoms use the same dress-size system as tops.
    international: {
      XS: { UK: '6', US: '2', EU: '34', AUS: '6' },
      S: { UK: '8', US: '4', EU: '36', AUS: '8' },
      M: { UK: '10', US: '6', EU: '38', AUS: '10' },
      L: { UK: '12', US: '8', EU: '40', AUS: '12' },
      XL: { UK: '14', US: '10', EU: '42', AUS: '14' },
      XXL: { UK: '16', US: '12', EU: '44', AUS: '16' },
      '3XL': { UK: '18', US: '14', EU: '46', AUS: '18' },
    },
  },
  men: {
    indian: {
      XS: { waist: 28, hips: 36, length: 40 },
      S: { waist: 30, hips: 38, length: 40.5 },
      M: { waist: 32, hips: 40, length: 41 },
      L: { waist: 34, hips: 42, length: 41.5 },
      XL: { waist: 36, hips: 44, length: 42 },
      XXL: { waist: 38, hips: 46, length: 42.5 },
      '3XL': { waist: 40, hips: 48, length: 43 },
    },
    // Men's trousers are sized by waist: UK/US/AUS use waist inches; EU uses its own trouser sizes.
    international: {
      XS: { UK: '28', US: '28', EU: '44', AUS: '28' },
      S: { UK: '30', US: '30', EU: '46', AUS: '30' },
      M: { UK: '32', US: '32', EU: '48', AUS: '32' },
      L: { UK: '34', US: '34', EU: '50', AUS: '34' },
      XL: { UK: '36', US: '36', EU: '52', AUS: '36' },
      XXL: { UK: '38', US: '38', EU: '54', AUS: '38' },
      '3XL': { UK: '40', US: '40', EU: '56', AUS: '40' },
    },
  },
}

const measuresFor = (fit: Fit, garment: Garment): { key: MeasureKey; label: string }[] => [
  ...(garment === 'top' ? [{ key: 'bust' as const, label: fit === 'men' ? 'Chest' : 'Bust' }] : []),
  { key: 'waist', label: 'Waist' },
  { key: 'hips', label: 'Hips' },
  { key: 'length', label: 'Length' },
]
const REGIONS: Region[] = ['UK', 'US', 'EU', 'AUS']

const howToMeasure = (fit: Fit, garment: Garment) => [
  ...(garment === 'top'
    ? [
        fit === 'men'
          ? { title: 'Chest', text: 'Place the measuring tape under your arms and around the fullest part of your chest.' }
          : { title: 'Bust', text: 'Place the measuring tape under your arms and around the fullest part of your bust.' },
      ]
    : []),
  { title: 'Waist', text: 'Measure around your natural waist, above the belly button, at the slimmest part. Keep the tape snug, not tight.' },
  { title: 'Hips', text: 'Stand with your feet together and measure around the fullest part of your hips.' },
  garment === 'top'
    ? { title: 'Length', text: 'Measure from the highest point of the shoulder, near the neck, straight down to where you want the garment to end.' }
    : { title: 'Length', text: 'Measure from your waist down the outside of your leg to where you want the hem to end, usually the ankle.' },
]

/** Men's and women's products use their own chart; other products (e.g. occasion wear) let the shopper choose. */
const fitFromCategory = (category?: string): Fit | null => (category === 'men' ? 'men' : category === 'women' ? 'women' : null)

// Products have no garment-type field, so bottoms are recognised by name. Sets
// (e.g. "Kurta with Trouser") are sized by the kurta, so they stay "top".
const BOTTOM_WORDS = /\b(pants?|palazzos?|trousers?|salwars?|churidars?|pyjamas?|pajamas?|leggings?|skirts?|dhotis?|shorts?)\b/i
const TOP_WORDS = /\b(kurtas?|kurtis?|sets?|anarkalis?|tops?|shirts?|dress(es)?|suits?|tunics?|cholis?)\b/i
const garmentFromName = (name: string): Garment => (BOTTOM_WORDS.test(name) && !TOP_WORDS.test(name) ? 'bottom' : 'top')

const TABS = [
  { id: 'indian', label: 'Indian Size Chart' },
  { id: 'international', label: 'US/UK/General Size Chart' },
  { id: 'measure', label: 'How to Measure' },
] as const
type Tab = (typeof TABS)[number]['id']

const DASH = '–'

interface Props {
  open: boolean
  onClose: () => void
  product: { name: string; image?: string; price: string; originalPrice?: string }
  sizes: string[]
  selected: string
  onSelect: (size: string) => void
  isAvailable: (size: string) => boolean
  /** Product category ('men' | 'women' | 'occasion'); picks the men's or women's chart. */
  category?: string
}

export default function SizeGuideModal({ open, onClose, product, sizes, selected, onSelect, isAvailable, category }: Props) {
  const [tab, setTab] = useState<Tab>('indian')
  const [unit, setUnit] = useState<'in' | 'cm'>('in')
  const fixedFit = fitFromCategory(category)
  const [chosenFit, setChosenFit] = useState<Fit>('women')
  const fit = fixedFit ?? chosenFit
  const garment = garmentFromName(product.name)
  const chart = (garment === 'bottom' ? BOTTOM_CHARTS : TOP_CHARTS)[fit]
  const MEASURES = measuresFor(fit, garment)
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    const t = setTimeout(() => closeRef.current?.focus(), 50)
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    return () => {
      clearTimeout(t)
      document.body.style.overflow = prevOverflow
      window.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  const hasIndian = sizes.some((s) => chart.indian[s])
  const hasInternational = sizes.some((s) => chart.international[s])
  const fmt = (inches?: number) => (inches == null ? DASH : unit === 'in' ? inches.toFixed(1) : (inches * 2.54).toFixed(1))

  // A radio-style size picker, matching the size buttons on the product page.
  const sizeCell = (s: string) => {
    const ok = isAvailable(s)
    const checked = selected === s
    return (
      <td className="py-3 pl-3 sm:pl-4 pr-1.5 sm:pr-2">
        <button
          type="button"
          role="radio"
          aria-checked={checked}
          disabled={!ok}
          onClick={() => onSelect(s)}
          className="flex items-center gap-2 sm:gap-3 disabled:opacity-40 disabled:cursor-not-allowed"
          aria-label={ok ? `Select size ${s}` : `Size ${s} is out of stock`}
        >
          <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${checked ? 'border-shreem-black' : 'border-shreem-black/30'}`}>
            {checked && <span className="w-2.5 h-2.5 rounded-full bg-shreem-black" />}
          </span>
          <span className={`font-medium ${ok ? '' : 'line-through'}`}>{s}</span>
        </button>
      </td>
    )
  }

  const ComingSoon = () => (
    <div className="flex items-center gap-2 rounded-lg bg-shreem-gold/10 px-4 py-3 mb-4 text-sm">
      <Ruler className="w-4 h-4 flex-shrink-0 text-shreem-gold" />
      Size chart coming soon
    </div>
  )

  // Shown above a chart: "coming soon" when there is no data for this product's sizes,
  // otherwise a provisional notice until Shreem confirms its measurements.
  const ChartNotice = ({ hasData }: { hasData: boolean }) =>
    !hasData ? (
      <ComingSoon />
    ) : SIZES_CONFIRMED ? null : (
      <div className="flex items-start gap-2 rounded-lg bg-shreem-gold/10 px-4 py-3 mb-4 text-sm">
        <Ruler className="w-4 h-4 mt-0.5 flex-shrink-0 text-shreem-gold" />
        <span>
          <span className="font-semibold">Provisional sizes.</span> Standard {fit === 'men' ? "men's" : "women's"} estimates while Shreem confirms its own
          measurements. Final sizes may vary slightly.
        </span>
      </div>
    )

  // Only for products that aren't clearly men's or women's (e.g. occasion wear).
  const FitSwitch = () =>
    fixedFit ? null : (
      <div className="flex items-center justify-between gap-3 mb-4">
        <span className="text-sm text-shreem-gray">Show sizes for</span>
        <div className="inline-flex rounded-full bg-shreem-black/5 p-1" role="group" aria-label="Sizing for">
          {(['women', 'men'] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setChosenFit(f)}
              aria-pressed={fit === f}
              className={`px-4 py-1 rounded-full text-xs font-medium capitalize transition-colors ${fit === f ? 'bg-shreem-black text-white' : 'text-shreem-gray'}`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>
    )

  // Compact on phones (headers wrap) so every column fits without sideways scrolling.
  const thBase = 'py-3 px-1.5 sm:px-3 text-[11px] sm:text-xs font-semibold uppercase tracking-wide text-shreem-gray leading-tight sm:whitespace-nowrap'
  const th = `${thBase} text-center`
  const thSize = `${thBase} text-left pl-3 sm:pl-4`
  const td = 'py-3 px-1.5 sm:px-3 text-sm text-center whitespace-nowrap'

  // Rendered on <body>: the product details column is sticky on desktop, which would
  // otherwise trap the overlay below the navbar and WhatsApp button.
  return createPortal(
    <div
      className={`fixed inset-0 z-[60] flex sm:items-center sm:justify-center sm:p-4 transition-all duration-300 ${
        open ? 'opacity-100 pointer-events-auto visible' : 'opacity-0 pointer-events-none invisible'
      }`}
      aria-hidden={!open}
    >
      <div className="absolute inset-0 bg-shreem-black/30 backdrop-blur-sm" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="size-guide-title"
        className={`relative flex flex-col w-full h-full sm:h-auto sm:max-h-[90vh] sm:max-w-2xl bg-shreem-cream sm:rounded-2xl shadow-nav transition-transform duration-300 ${
          open ? 'translate-y-0 sm:scale-100' : 'translate-y-full sm:translate-y-0 sm:scale-95'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 pt-5 pb-3">
          <h2 id="size-guide-title" className="font-display font-black tracking-tight text-2xl">
            Size Guide
          </h2>
          <button ref={closeRef} type="button" onClick={onClose} className="p-2 -mr-2 hover:bg-shreem-black/5 rounded-full" aria-label="Close size guide">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Product summary */}
        <div className="flex items-center gap-4 mx-4 sm:mx-6 mb-4 p-3 rounded-xl bg-white/70 border border-shreem-black/5">
          {product.image && <img src={product.image} alt="" className="w-16 h-20 object-cover rounded-lg flex-shrink-0" />}
          <div className="min-w-0">
            <p className="font-medium leading-snug line-clamp-2">{product.name}</p>
            <p className="mt-1 text-sm">
              {product.originalPrice && <span className="text-shreem-gray line-through mr-2">{product.originalPrice}</span>}
              <span className="font-semibold">{product.price}</span>
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div role="tablist" className="flex border-b border-shreem-black/10 px-4 sm:px-6">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className={`relative flex-1 sm:flex-none px-2 sm:px-3 py-3 text-sm font-medium leading-tight text-center sm:whitespace-nowrap transition-colors ${
                tab === t.id ? 'text-shreem-black' : 'text-shreem-gray hover:text-shreem-black'
              }`}
            >
              {t.label}
              <span className={`absolute left-0 right-0 -bottom-px h-0.5 rounded-full bg-shreem-gold transition-opacity ${tab === t.id ? 'opacity-100' : 'opacity-0'}`} />
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-5">
          {tab === 'indian' && (
            <>
              <FitSwitch />
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold">Body Measurement</h3>
                <div className="inline-flex rounded-full bg-shreem-black/5 p-1" role="group" aria-label="Measurement unit">
                  {(['in', 'cm'] as const).map((u) => (
                    <button
                      key={u}
                      type="button"
                      onClick={() => setUnit(u)}
                      aria-pressed={unit === u}
                      className={`px-4 py-1 rounded-full text-xs font-medium transition-colors ${unit === u ? 'bg-shreem-black text-white' : 'text-shreem-gray'}`}
                    >
                      {u}
                    </button>
                  ))}
                </div>
              </div>
              <ChartNotice hasData={hasIndian} />
              <div className="overflow-x-auto rounded-xl border border-shreem-black/10 bg-white/60">
                <table className="w-full" role="radiogroup" aria-label="Indian size chart">
                  <thead className="bg-shreem-black/5">
                    <tr>
                      <th className={thSize}>Size</th>
                      {MEASURES.map((m) => (
                        <th key={m.key} className={th}>
                          {m.label} ({unit})
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-shreem-black/5">
                    {sizes.map((s) => (
                      <tr key={s} className={selected === s ? 'bg-shreem-gold/10' : ''}>
                        {sizeCell(s)}
                        {MEASURES.map((m) => (
                          <td key={m.key} className={td}>
                            {fmt(chart.indian[s]?.[m.key])}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {hasIndian && (
                <p className="mt-3 text-xs text-shreem-gray">
                  {garment === 'bottom'
                    ? 'Waist and hips are body measurements. Length is the garment length from waist to hem.'
                    : `${fit === 'men' ? 'Chest' : 'Bust'}, waist and hips are body measurements. Length is the garment length.`}
                </p>
              )}
            </>
          )}

          {tab === 'international' && (
            <>
              <FitSwitch />
              <h3 className="text-sm font-semibold mb-4">International Conversions</h3>
              <ChartNotice hasData={hasInternational} />
              <div className="overflow-x-auto rounded-xl border border-shreem-black/10 bg-white/60">
                <table className="w-full" role="radiogroup" aria-label="US/UK/General size chart">
                  <thead className="bg-shreem-black/5">
                    <tr>
                      <th className={thSize}>IN</th>
                      {REGIONS.map((r) => (
                        <th key={r} className={th}>
                          {r}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-shreem-black/5">
                    {sizes.map((s) => (
                      <tr key={s} className={selected === s ? 'bg-shreem-gold/10' : ''}>
                        {sizeCell(s)}
                        {REGIONS.map((r) => (
                          <td key={r} className={td}>
                            {chart.international[s]?.[r] ?? DASH}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {tab === 'measure' && (
            <div className="space-y-3">
              {howToMeasure(fit, garment).map((m, i) => (
                <div key={m.title} className="flex gap-4 rounded-xl border border-shreem-black/10 bg-white/60 p-4">
                  <span className="w-8 h-8 flex-shrink-0 rounded-full bg-shreem-black text-white text-sm font-semibold flex items-center justify-center">{i + 1}</span>
                  <div>
                    <h4 className="font-semibold text-sm mb-1">{m.title}</h4>
                    <p className="text-sm text-shreem-gray">{m.text}</p>
                  </div>
                </div>
              ))}
              <p className="text-sm text-shreem-gray pt-2">
                For accurate results, keep the tape parallel to the floor and measure over light clothing.
              </p>
            </div>
          )}

          {tab !== 'measure' && (
            <p className="flex items-start gap-2 mt-4 text-sm text-shreem-gray">
              <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
              Tip: If you don&apos;t find an exact match, go for the next larger size.
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 sm:px-6 py-4 border-t border-shreem-black/10">
          <button type="button" onClick={onClose} className="btn-primary w-full justify-center">
            {selected ? `Continue with size ${selected}` : 'Done'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
