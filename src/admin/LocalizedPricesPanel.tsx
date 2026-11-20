import { Pencil, Plus, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useState, type KeyboardEvent } from 'react'
import { CURRENCIES, getLiveRates, type CurrencyCode, type Rates } from '../lib/fx'
import { supabase, type ProductPriceRow } from '../lib/supabase'
import { card, input } from './shared'

// INR is the product's own price (what checkout charges), so it is not listed here.
const LOCAL_CURRENCIES = CURRENCIES.filter((c) => c !== 'INR') as Exclude<CurrencyCode, 'INR'>[]

const money = (amount: number, currency: string) =>
  new Intl.NumberFormat('en', { style: 'currency', currency, currencyDisplay: 'narrowSymbol' }).format(amount)

/** More than zero, with at most 2 decimal places. */
const validAmount = (n: number) => Number.isFinite(n) && n > 0 && Math.abs(Math.round(n * 100) - n * 100) < 1e-6
const round2 = (n: number) => Math.round(n * 100) / 100

const MISSING_TABLE = 'The product_prices table is missing. Run migration 20261121000000_product_prices.sql in Supabase.'
const friendly = (message: string) => (/product_prices/.test(message) && /not find|does not exist/.test(message) ? MISSING_TABLE : message)

interface Draft {
  price: string
  original: string
}

interface Props {
  /** Database id of the saved product; prices can only be added once the product exists. */
  productId?: string
  /** The product's saved rupee prices, used to show converted prices for currencies without a set price. */
  inrPrice?: number
  inrOriginal?: number | null
}

/**
 * Create, view, edit and delete the price a product sells for in each currency.
 * Currencies without a saved price are converted from rupees at the live rate
 * on the storefront; those converted values are only shown, never saved.
 */
export default function LocalizedPricesPanel({ productId, inrPrice, inrOriginal }: Props) {
  const [rows, setRows] = useState<ProductPriceRow[]>([])
  const [loading, setLoading] = useState(Boolean(productId))
  const [rates, setRates] = useState<Rates | null>(null)
  const [drafts, setDrafts] = useState<Partial<Record<CurrencyCode, Draft>>>({})
  const [busy, setBusy] = useState<CurrencyCode | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!productId) return
    const { data, error } = await supabase
      .from('product_prices')
      .select('id, product_id, currency, price, original_price, updated_at')
      .eq('product_id', productId)
    if (error) setError(friendly(error.message))
    else setRows((data as ProductPriceRow[]).map((r) => ({ ...r, price: Number(r.price), original_price: r.original_price == null ? null : Number(r.original_price) })))
    setLoading(false)
  }, [productId])

  useEffect(() => {
    load()
    getLiveRates().then(setRates).catch(() => setRates(null))
  }, [load])

  if (!productId) {
    return (
      <section className={`${card} p-6`}>
        <h2 className="font-semibold mb-1">Prices by currency</h2>
        <p className="text-xs text-shreem-gray">Save the product first, then set prices for other currencies here.</p>
      </section>
    )
  }

  const rowFor = (c: CurrencyCode) => rows.find((r) => r.currency === c)
  const auto = (c: CurrencyCode, inr?: number | null) => (rates && inr ? round2(inr * rates[c]) : null)
  const setDraft = (c: CurrencyCode, d: Draft | null) =>
    setDrafts((all) => {
      const next = { ...all }
      if (d) next[c] = d
      else delete next[c]
      return next
    })

  const startEdit = (c: CurrencyCode) => {
    setError(null)
    setNotice(null)
    const row = rowFor(c)
    // New prices start from today's converted value as a suggestion; nothing is saved until "Save".
    const price = row ? row.price : auto(c, inrPrice)
    const original = row ? row.original_price : auto(c, inrOriginal)
    setDraft(c, { price: price != null ? String(price) : '', original: original != null ? String(original) : '' })
  }

  const save = async (c: CurrencyCode) => {
    const d = drafts[c]
    if (!d) return
    setError(null)
    setNotice(null)
    const price = Number(d.price)
    const original = d.original.trim() ? Number(d.original) : null
    if (!validAmount(price)) return setError(`${c}: price must be more than 0, with at most 2 decimal places.`)
    if (original !== null && (!validAmount(original) || original <= price)) {
      return setError(`${c}: original price must be higher than the price (or left empty).`)
    }
    setBusy(c)
    const existing = rowFor(c)
    const { error } = existing
      ? await supabase.from('product_prices').update({ price, original_price: original }).eq('id', existing.id)
      : await supabase.from('product_prices').insert({ product_id: productId, currency: c, price, original_price: original })
    setBusy(null)
    if (error) return setError(error.code === '23505' ? `${c} already has a price. Reload the page.` : friendly(error.message))
    setDraft(c, null)
    setNotice(`${c} price saved.`)
    load()
  }

  const remove = async (c: CurrencyCode) => {
    const row = rowFor(c)
    if (!row || !confirm(`Remove the ${c} price? Shoppers will see a price converted from rupees instead.`)) return
    setError(null)
    setNotice(null)
    setBusy(c)
    const { error } = await supabase.from('product_prices').delete().eq('id', row.id)
    setBusy(null)
    if (error) return setError(friendly(error.message))
    setDraft(c, null)
    setNotice(`${c} price removed. It now follows the exchange rate.`)
    load()
  }

  // These inputs sit inside the product form: Enter saves this row instead of submitting the whole product.
  const onEnter = (c: CurrencyCode) => (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      save(c)
    }
  }

  return (
    <section className={`${card} p-6`}>
      <h2 className="font-semibold mb-1">Prices by currency</h2>
      <p className="text-xs text-shreem-gray mb-4">
        Set an exact price for shoppers using a currency. Currencies marked &ldquo;Auto&rdquo; are converted from the rupee
        price at the live exchange rate and change with it. A price you set here is never changed automatically. Customers
        are always charged in rupees.
      </p>

      {loading ? (
        <p className="text-sm text-shreem-gray">Loading…</p>
      ) : (
        <ul className="divide-y divide-shreem-black/10">
          {LOCAL_CURRENCIES.map((c) => {
            const row = rowFor(c)
            const draft = drafts[c]
            const autoPrice = auto(c, inrPrice)
            const autoOriginal = auto(c, inrOriginal)
            return (
              <li key={c} className="py-3 flex flex-wrap items-center gap-3" data-currency={c}>
                <span className="w-12 font-semibold text-sm">{c}</span>

                {draft ? (
                  <>
                    <input
                      type="number"
                      min={0.01}
                      step={0.01}
                      value={draft.price}
                      onChange={(e) => setDraft(c, { ...draft, price: e.target.value })}
                      onKeyDown={onEnter(c)}
                      placeholder="Price"
                      aria-label={`${c} price`}
                      className={`${input} w-28`}
                    />
                    <input
                      type="number"
                      min={0.01}
                      step={0.01}
                      value={draft.original}
                      onChange={(e) => setDraft(c, { ...draft, original: e.target.value })}
                      onKeyDown={onEnter(c)}
                      placeholder="Original"
                      aria-label={`${c} original price`}
                      className={`${input} w-28`}
                    />
                    <div className="flex gap-2 ml-auto">
                      <button type="button" onClick={() => save(c)} disabled={busy === c} className="px-3 h-9 rounded-lg bg-shreem-black text-white text-xs font-medium disabled:opacity-50">
                        {busy === c ? 'Saving…' : 'Save'}
                      </button>
                      <button type="button" onClick={() => setDraft(c, null)} className="px-3 h-9 rounded-lg text-xs text-shreem-gray hover:bg-shreem-black/5">
                        Cancel
                      </button>
                    </div>
                  </>
                ) : row ? (
                  <>
                    <span className="text-sm font-medium">{money(row.price, c)}</span>
                    {row.original_price != null && <span className="text-sm text-shreem-gray line-through">{money(row.original_price, c)}</span>}
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-shreem-gold/20 font-medium">Manual</span>
                    <div className="flex gap-1 ml-auto">
                      <button type="button" onClick={() => startEdit(c)} className="p-2 rounded-lg hover:bg-shreem-black/5" aria-label={`Edit ${c} price`}>
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button type="button" onClick={() => remove(c)} disabled={busy === c} className="p-2 rounded-lg text-red-600 hover:bg-red-50" aria-label={`Delete ${c} price`}>
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <span className="text-sm text-shreem-gray">
                      {autoPrice != null ? `≈ ${money(autoPrice, c)}` : 'Exchange rate unavailable'}
                      {autoOriginal != null && <span className="line-through ml-2">{money(autoOriginal, c)}</span>}
                    </span>
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-shreem-black/5 text-shreem-gray font-medium">Auto</span>
                    <button type="button" onClick={() => startEdit(c)} className="ml-auto inline-flex items-center gap-1 px-3 h-9 rounded-lg text-xs font-medium bg-shreem-black/5 hover:bg-shreem-black/10">
                      <Plus className="w-3.5 h-3.5" /> Set price
                    </button>
                  </>
                )}
              </li>
            )
          })}
        </ul>
      )}

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      {notice && <p className="mt-3 text-sm text-green-700">{notice}</p>}
    </section>
  )
}
