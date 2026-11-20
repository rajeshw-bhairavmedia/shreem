import { ArrowLeft, ChevronLeft, ChevronRight, ImagePlus, Trash2, X } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { CURRENCIES, currencySymbols, getLiveRates, isCurrency, toInr, type CurrencyCode, type Rates } from '../lib/fx'
import { supabase, type ProductRow } from '../lib/supabase'
import type { Category, Style } from '../types'
import LocalizedPricesPanel from './LocalizedPricesPanel'
import { card, input } from './shared'

const MAX_IMAGE_MB = 5
const sizePresets = {
  'XS–XXL': ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
  'S–3XL': ['S', 'M', 'L', 'XL', 'XXL', '3XL'],
  'Free Size': ['Free Size'],
}

interface FormState {
  name: string
  slug: string
  description: string
  price_currency: CurrencyCode
  price: string
  original_price: string
  category: Category
  style: Style | ''
  images: string[]
  sizes: { size: string; qty: string }[]
  colors: string
  hsn: string
  is_new: boolean
  is_bestseller: boolean
  is_trending: boolean
  is_active: boolean
  sort_order: string
}

const blank: FormState = {
  name: '',
  slug: '',
  description: '',
  price_currency: 'INR',
  price: '',
  original_price: '',
  category: 'women',
  style: 'casual',
  images: [],
  sizes: [],
  colors: '',
  hsn: '',
  is_new: true,
  is_bestseller: false,
  is_trending: false,
  is_active: true,
  sort_order: '0',
}

const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

const currencyNames: Record<CurrencyCode, string> = {
  INR: 'Indian Rupee',
  USD: 'US Dollar',
  GBP: 'British Pound',
  EUR: 'Euro',
  RUB: 'Russian Ruble',
  AED: 'UAE Dirham',
  CAD: 'Canadian Dollar',
  AUD: 'Australian Dollar',
}

const rupees = (n: number) => `₹${n.toLocaleString('en-IN')}`

/** More than zero, with at most 2 decimal places. */
const validAmount = (n: number) => Number.isFinite(n) && n > 0 && Math.abs(Math.round(n * 100) - n * 100) < 1e-6

function fromRow(p: ProductRow): FormState {
  // Show the amounts in the currency the admin typed them in; older products are rupees.
  const foreign = isCurrency(p.price_currency) && p.price_currency !== 'INR' && p.entered_price != null
  return {
    name: p.name,
    slug: p.slug,
    description: p.description,
    price_currency: foreign ? (p.price_currency as CurrencyCode) : 'INR',
    price: String(foreign ? p.entered_price : p.price),
    original_price: foreign
      ? p.entered_original_price != null ? String(p.entered_original_price) : ''
      : p.original_price ? String(p.original_price) : '',
    category: p.category,
    style: p.style ?? '',
    images: p.images,
    sizes: p.sizes.map((size) => ({ size, qty: p.stock[size] === undefined ? '' : String(p.stock[size]) })),
    colors: p.colors.join(', '),
    hsn: p.hsn ?? '',
    is_new: p.is_new,
    is_bestseller: p.is_bestseller,
    is_trending: p.is_trending,
    is_active: p.is_active,
    sort_order: String(p.sort_order),
  }
}

export default function ProductFormPage() {
  const { id } = useParams()
  const isNew = !id
  const navigate = useNavigate()
  const [form, setForm] = useState<FormState>(blank)
  const [slugTouched, setSlugTouched] = useState(!isNew)
  const [loaded, setLoaded] = useState(isNew)
  const [busy, setBusy] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [rates, setRates] = useState<Rates | null>(null)
  const [ratesError, setRatesError] = useState<string | null>(null)
  // Saved rupee prices, used by the per-currency price panel for converted suggestions.
  const [savedInr, setSavedInr] = useState<Pick<ProductRow, 'price' | 'original_price'> | null>(null)

  // Live exchange rates, needed to convert a non-rupee price to rupees.
  const foreign = form.price_currency !== 'INR'
  useEffect(() => {
    if (!foreign || rates) return
    let cancelled = false
    setRatesError(null)
    getLiveRates()
      .then((r) => !cancelled && setRates(r))
      .catch(() => !cancelled && setRatesError('Could not load exchange rates. Check your connection, or enter the price in INR.'))
    return () => {
      cancelled = true
    }
  }, [foreign, rates])

  useEffect(() => {
    if (isNew) return
    supabase
      .from('products')
      .select('*')
      .eq('id', id!)
      .single()
      .then(({ data, error }) => {
        if (error) setError(error.message)
        else {
          setForm(fromRow(data as ProductRow))
          setSavedInr({ price: (data as ProductRow).price, original_price: (data as ProductRow).original_price })
        }
        setLoaded(true)
      })
  }, [id, isNew])

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((f) => ({ ...f, [key]: value }))

  const setName = (name: string) =>
    setForm((f) => ({ ...f, name, slug: slugTouched ? f.slug : slugify(name) }))

  const uploadImages = async (files: FileList | null) => {
    if (!files?.length) return
    setUploading(true)
    setError(null)
    const urls: string[] = []
    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) continue
      if (file.size > MAX_IMAGE_MB * 1024 * 1024) {
        setError(`${file.name} is larger than ${MAX_IMAGE_MB} MB. Please use a smaller photo.`)
        continue
      }
      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
      const path = `products/${crypto.randomUUID()}.${ext}`
      const { error } = await supabase.storage.from('product-images').upload(path, file, { contentType: file.type })
      if (error) {
        setError(`Upload failed: ${error.message}`)
        continue
      }
      urls.push(supabase.storage.from('product-images').getPublicUrl(path).data.publicUrl)
    }
    setForm((f) => ({ ...f, images: [...f.images, ...urls] }))
    setUploading(false)
  }

  const moveImage = (from: number, to: number) =>
    setForm((f) => {
      const images = [...f.images]
      ;[images[from], images[to]] = [images[to], images[from]]
      return { ...f, images }
    })

  const updateSize = (i: number, patch: Partial<{ size: string; qty: string }>) =>
    setForm((f) => ({ ...f, sizes: f.sizes.map((s, j) => (j === i ? { ...s, ...patch } : s)) }))

  const save = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    const currency = form.price_currency
    const enteredPrice = Number(form.price)
    const enteredOriginal = form.original_price ? Number(form.original_price) : null
    const sizes = form.sizes.filter((s) => s.size.trim())
    const sizeNames = sizes.map((s) => s.size.trim())

    if (currency === 'INR') {
      if (!Number.isInteger(enteredPrice) || enteredPrice <= 0) return setError('Price must be a whole number of rupees.')
    } else if (!validAmount(enteredPrice)) {
      return setError('Price must be more than 0, with at most 2 decimal places.')
    }
    if (
      enteredOriginal !== null &&
      (!(currency === 'INR' ? Number.isInteger(enteredOriginal) : validAmount(enteredOriginal)) || enteredOriginal <= enteredPrice)
    ) {
      return setError('"Original price" must be higher than the price (or left empty).')
    }

    // Checkout charges in rupees, so a non-rupee price is converted at today's rate.
    let price = enteredPrice
    let originalPrice = enteredOriginal
    if (currency !== 'INR') {
      let live = rates
      if (!live) {
        try {
          live = await getLiveRates()
          setRates(live)
        } catch {
          return setError('Could not load exchange rates to convert this price to rupees. Please try again.')
        }
      }
      price = toInr(enteredPrice, currency, live)
      originalPrice = enteredOriginal === null ? null : toInr(enteredOriginal, currency, live)
      if (price < 1) return setError('This price is less than ₹1 after conversion.')
      if (originalPrice !== null && originalPrice <= price) {
        return setError('"Original price" is not higher than the price once converted to rupees. Increase it slightly.')
      }
    }
    if (new Set(sizeNames).size !== sizeNames.length) return setError('Each size can only be listed once.')
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(form.slug)) return setError('Web address may only use lowercase letters, numbers and dashes.')

    const row = {
      name: form.name.trim(),
      slug: form.slug,
      description: form.description.trim(),
      price,
      original_price: originalPrice,
      price_currency: currency,
      entered_price: enteredPrice,
      entered_original_price: enteredOriginal,
      category: form.category,
      style: form.category === 'occasion' ? null : form.style || null,
      images: form.images,
      sizes: sizeNames,
      stock: Object.fromEntries(
        sizes.filter((s) => s.qty !== '').map((s) => [s.size.trim(), Math.max(0, Math.floor(Number(s.qty)) || 0)]),
      ),
      colors: form.colors.split(',').map((c) => c.trim()).filter(Boolean),
      hsn: form.hsn.trim() || null,
      is_new: form.is_new,
      is_bestseller: form.is_bestseller,
      is_trending: form.is_trending,
      is_active: form.is_active,
      sort_order: Number(form.sort_order) || 0,
    }

    setBusy(true)
    const { error } = isNew
      ? await supabase.from('products').insert(row)
      : await supabase.from('products').update(row).eq('id', id!)
    setBusy(false)
    if (error) {
      if (error.code === '23505') return setError('Another product already uses this web address. Change it slightly.')
      if (/price_currency|entered_(original_)?price/.test(error.message)) {
        return setError('The database is missing the price currency columns. Run migration 20261120000000_product_price_currency.sql in Supabase, then save again.')
      }
      return setError(error.message)
    }
    navigate('/admin/products')
  }

  const remove = async () => {
    if (!confirm(`Delete "${form.name}"? This cannot be undone. (Tip: you can hide it instead.)`)) return
    setBusy(true)
    const { error } = await supabase.from('products').delete().eq('id', id!)
    setBusy(false)
    if (error) return setError(error.message)
    navigate('/admin/products')
  }

  if (!loaded) return <p className="text-shreem-gray text-sm">Loading…</p>

  return (
    <form onSubmit={save}>
      <Link to="/admin/products" className="inline-flex items-center text-sm text-shreem-gray hover:text-shreem-black mb-4">
        <ArrowLeft className="w-4 h-4 mr-1" /> Products
      </Link>
      <div className="flex items-center justify-between mb-6 gap-4">
        <h1 className="text-2xl font-display font-black tracking-tight">{isNew ? 'Add product' : form.name || 'Edit product'}</h1>
        <div className="flex gap-2">
          {!isNew && (
            <button type="button" onClick={remove} disabled={busy} className="p-2.5 rounded-full text-red-600 hover:bg-red-50" title="Delete product">
              <Trash2 className="w-4 h-4" />
            </button>
          )}
          <button type="submit" disabled={busy || uploading} className="btn-primary !px-6 !py-2.5 disabled:opacity-60">
            {busy ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>

      {error && <p className="mb-4 text-sm text-red-600 bg-white rounded-lg px-4 py-2">{error}</p>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <section className={`${card} p-6 space-y-4`}>
            <div>
              <label htmlFor="name" className="text-sm font-medium">Product name</label>
              <input id="name" required value={form.name} onChange={(e) => setName(e.target.value)} className={`${input} mt-1`} />
            </div>
            <div>
              <label htmlFor="slug" className="text-sm font-medium">Web address</label>
              <div className="flex items-center mt-1">
                <span className="text-sm text-shreem-gray mr-1">/product/</span>
                <input
                  id="slug"
                  required
                  value={form.slug}
                  onChange={(e) => {
                    setSlugTouched(true)
                    set('slug', slugify(e.target.value))
                  }}
                  className={input}
                />
              </div>
            </div>
            <div>
              <label htmlFor="description" className="text-sm font-medium">Description</label>
              <textarea
                id="description"
                rows={4}
                value={form.description}
                onChange={(e) => set('description', e.target.value)}
                className={`${input} h-auto py-2 mt-1`}
              />
            </div>
          </section>

          <section className={`${card} p-6`}>
            <h2 className="font-semibold mb-1">Photos</h2>
            <p className="text-xs text-shreem-gray mb-4">The first photo is shown on product cards. JPG or PNG, up to {MAX_IMAGE_MB} MB each.</p>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {form.images.map((src, i) => (
                <div key={src} className="relative group aspect-[3/4] rounded-lg overflow-hidden bg-shreem-cream">
                  <img src={src} alt="" className="w-full h-full object-cover" />
                  {i === 0 && <span className="absolute top-1 left-1 text-[10px] px-1.5 py-0.5 rounded bg-shreem-black text-white">Main</span>}
                  <div className="absolute inset-x-0 bottom-0 flex justify-between p-1 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button type="button" disabled={i === 0} onClick={() => moveImage(i, i - 1)} className="p-1 text-white disabled:opacity-30" aria-label="Move left">
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button type="button" onClick={() => set('images', form.images.filter((_, j) => j !== i))} className="p-1 text-white" aria-label="Remove photo">
                      <X className="w-4 h-4" />
                    </button>
                    <button type="button" disabled={i === form.images.length - 1} onClick={() => moveImage(i, i + 1)} className="p-1 text-white disabled:opacity-30" aria-label="Move right">
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
              <label className="aspect-[3/4] rounded-lg border-2 border-dashed border-shreem-black/15 flex flex-col items-center justify-center text-shreem-gray text-xs cursor-pointer hover:border-shreem-gold hover:text-shreem-gold transition-colors">
                <ImagePlus className="w-6 h-6 mb-1" />
                {uploading ? 'Uploading…' : 'Add photos'}
                <input type="file" accept="image/*" multiple className="hidden" disabled={uploading} onChange={(e) => uploadImages(e.target.files)} />
              </label>
            </div>
          </section>

          <section className={`${card} p-6`}>
            <h2 className="font-semibold mb-1">Sizes & stock</h2>
            <p className="text-xs text-shreem-gray mb-4">Units available per size. Stock goes down automatically when an order is paid.</p>
            {form.sizes.length > 0 && (
              <div className="space-y-2 mb-4">
                {form.sizes.map((s, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <input value={s.size} onChange={(e) => updateSize(i, { size: e.target.value })} placeholder="Size" aria-label="Size" className={`${input} w-32`} />
                    <input
                      type="number"
                      min={0}
                      value={s.qty}
                      onChange={(e) => updateSize(i, { qty: e.target.value })}
                      placeholder="Qty"
                      aria-label={`Stock for ${s.size || 'size'}`}
                      className={`${input} w-28`}
                    />
                    <span className="text-xs text-shreem-gray flex-1">{s.qty === '0' ? 'Sold out' : ''}</span>
                    <button type="button" onClick={() => set('sizes', form.sizes.filter((_, j) => j !== i))} className="p-2 text-shreem-gray hover:text-red-600" aria-label="Remove size">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => set('sizes', [...form.sizes, { size: '', qty: '' }])} className="px-3 py-1.5 rounded-full text-xs font-medium bg-shreem-black/5 hover:bg-shreem-black/10">
                + Add size
              </button>
              {Object.entries(sizePresets).map(([label, sizes]) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => set('sizes', sizes.map((size) => ({ size, qty: '10' })))}
                  className="px-3 py-1.5 rounded-full text-xs font-medium bg-shreem-black/5 hover:bg-shreem-black/10"
                >
                  Use {label}
                </button>
              ))}
            </div>
          </section>

          <LocalizedPricesPanel productId={id} inrPrice={savedInr?.price} inrOriginal={savedInr?.original_price} />
        </div>

        <div className="space-y-6">
          <section className={`${card} p-6 space-y-4`}>
            <div>
              <label htmlFor="price_currency" className="text-sm font-medium">Currency</label>
              <select
                id="price_currency"
                value={form.price_currency}
                onChange={(e) => set('price_currency', e.target.value as CurrencyCode)}
                className={`${input} mt-1`}
              >
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>
                    {c} ({currencySymbols[c]}) · {currencyNames[c]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="price" className="text-sm font-medium">Price ({currencySymbols[form.price_currency]})</label>
              <input
                id="price"
                type="number"
                min={foreign ? 0.01 : 1}
                step={foreign ? 0.01 : 1}
                required
                value={form.price}
                onChange={(e) => set('price', e.target.value)}
                className={`${input} mt-1`}
              />
              {foreign && rates && Number(form.price) > 0 && (
                <p className="text-xs text-shreem-gray mt-1">≈ {rupees(toInr(Number(form.price), form.price_currency, rates))} at today&apos;s rate</p>
              )}
            </div>
            <div>
              <label htmlFor="original_price" className="text-sm font-medium">Original price ({currencySymbols[form.price_currency]})</label>
              <input
                id="original_price"
                type="number"
                min={foreign ? 0.01 : 1}
                step={foreign ? 0.01 : 1}
                value={form.original_price}
                onChange={(e) => set('original_price', e.target.value)}
                className={`${input} mt-1`}
              />
              {foreign && rates && Number(form.original_price) > 0 && (
                <p className="text-xs text-shreem-gray mt-1">≈ {rupees(toInr(Number(form.original_price), form.price_currency, rates))} at today&apos;s rate</p>
              )}
              <p className="text-xs text-shreem-gray mt-1">Optional. Fill in to show a sale with % off.</p>
            </div>
            {foreign && (
              <p className="text-xs text-shreem-gray bg-shreem-cream rounded-lg px-3 py-2">
                {rates
                  ? `1 ${form.price_currency} = ${rupees(Math.round((1 / rates[form.price_currency]) * 100) / 100)}. `
                  : (ratesError ?? 'Loading exchange rate… ')}
                Customers pay in rupees, so the price is converted to INR when you save. Re-save to update it to a newer rate.
              </p>
            )}
          </section>

          <section className={`${card} p-6 space-y-4`}>
            <div>
              <label htmlFor="category" className="text-sm font-medium">Category</label>
              <select id="category" value={form.category} onChange={(e) => set('category', e.target.value as Category)} className={`${input} mt-1`}>
                <option value="men">Men</option>
                <option value="women">Women</option>
                <option value="occasion">Occasion Wear</option>
              </select>
            </div>
            {form.category !== 'occasion' && (
              <div>
                <label htmlFor="style" className="text-sm font-medium">Style</label>
                <select id="style" value={form.style} onChange={(e) => set('style', e.target.value as Style | '')} className={`${input} mt-1`}>
                  <option value="casual">Casual</option>
                  <option value="formal">Formal</option>
                  <option value="traditional">Traditional</option>
                </select>
              </div>
            )}
            <div>
              <label htmlFor="colors" className="text-sm font-medium">Colours</label>
              <input id="colors" value={form.colors} onChange={(e) => set('colors', e.target.value)} placeholder="Ivory, Peach, Mint" className={`${input} mt-1`} />
              <p className="text-xs text-shreem-gray mt-1">Separate with commas.</p>
            </div>
            <div>
              <label htmlFor="hsn" className="text-sm font-medium">HSN code</label>
              <input id="hsn" value={form.hsn} onChange={(e) => set('hsn', e.target.value.replace(/\D/g, '').slice(0, 8))} placeholder="e.g. 6204" inputMode="numeric" className={`${input} mt-1`} />
              <p className="text-xs text-shreem-gray mt-1">Printed on GST invoices. Ask your CA for the right code.</p>
            </div>
          </section>

          <section className={`${card} p-6 space-y-3 text-sm`}>
            {(
              [
                ['is_active', 'Visible in store'],
                ['is_new', 'New arrival'],
                ['is_bestseller', 'Bestseller (badge + Bestsellers filter)'],
                ['is_trending', 'Trending Now (home page)'],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={form[key]} onChange={(e) => set(key, e.target.checked)} className="w-4 h-4 accent-shreem-gold" />
                {label}
              </label>
            ))}
            <div className="pt-2">
              <label htmlFor="sort_order" className="text-sm font-medium">Display order</label>
              <input id="sort_order" type="number" value={form.sort_order} onChange={(e) => set('sort_order', e.target.value)} className={`${input} mt-1`} />
              <p className="text-xs text-shreem-gray mt-1">Lower numbers appear first.</p>
            </div>
          </section>
        </div>
      </div>

      {/* Second save button so a long form never needs scrolling back up. */}
      <div className="flex items-center justify-end gap-4 mt-8 pt-6 border-t border-shreem-black/10">
        {error && <p className="text-sm text-red-600 mr-auto">{error}</p>}
        <Link to="/admin/products" className="text-sm text-shreem-gray hover:text-shreem-black">Cancel</Link>
        <button type="submit" disabled={busy || uploading} className="btn-primary !px-8 !py-2.5 disabled:opacity-60">
          {busy ? 'Saving…' : uploading ? 'Uploading photos…' : 'Save product'}
        </button>
      </div>
    </form>
  )
}
