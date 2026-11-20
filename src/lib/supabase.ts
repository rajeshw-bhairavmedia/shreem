import { createClient } from '@supabase/supabase-js'
import type { Category, LocalPrice, Product, Style } from '../types'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

/** True once Supabase is configured: products come from the database and checkout takes payments. */
export const supabaseEnabled = Boolean(url && anonKey)

export const supabase = supabaseEnabled ? createClient(url!, anonKey!) : null!

export interface ProductRow {
  id: string
  slug: string
  name: string
  description: string
  price: number
  original_price: number | null
  /** Currency the admin typed the price in (price/original_price are always rupees). Added by migration 20261120000000. */
  price_currency?: string
  entered_price?: number | null
  entered_original_price?: number | null
  category: Category
  style: Style | null
  images: string[]
  sizes: string[]
  colors: string[]
  stock: Record<string, number>
  hsn: string | null
  is_new: boolean
  is_bestseller: boolean
  is_trending: boolean
  is_active: boolean
  sort_order: number
  created_at: string
}

export function toProduct(row: ProductRow): Product {
  const onSale = !!row.original_price && row.original_price > row.price
  return {
    id: row.slug,
    name: row.name,
    description: row.description,
    price: row.price,
    originalPrice: onSale ? row.original_price! : undefined,
    category: row.category,
    subcategory: row.category === 'occasion' ? '' : (row.style ?? ''),
    images: row.images.length ? row.images : ['/hero_fabric.jpg'],
    sizes: row.sizes,
    colors: row.colors,
    isNew: row.is_new,
    isBestseller: row.is_bestseller,
    isTrending: row.is_trending,
    isSale: onSale,
    available: row.sizes.length === 0 || row.sizes.some((s) => (row.stock[s] ?? 1) > 0),
    stock: row.stock,
  }
}

export async function fetchProducts(): Promise<Product[]> {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('is_active', true)
    .order('sort_order')
    .order('created_at', { ascending: false })
  if (error) throw error
  const products = (data as ProductRow[]).map(toProduct)

  // Admin-set prices per currency. Loaded separately so the catalog still works
  // if this table is missing or unreachable (prices are then converted instead).
  const { data: prices, error: pricesError } = await supabase.from('product_prices').select('product_id, currency, price, original_price')
  if (pricesError) {
    console.warn('Localized prices unavailable, using converted prices:', pricesError.message)
    return products
  }
  const slugById = new Map((data as ProductRow[]).map((r) => [r.id, r.slug]))
  const bySlug = new Map<string, Record<string, LocalPrice>>()
  for (const row of prices as ProductPriceRow[]) {
    const slug = slugById.get(row.product_id)
    if (!slug) continue
    const entry = bySlug.get(slug) ?? {}
    entry[row.currency] = {
      price: Number(row.price),
      originalPrice: row.original_price != null ? Number(row.original_price) : undefined,
    }
    bySlug.set(slug, entry)
  }
  return products.map((p) => (bySlug.has(p.id) ? { ...p, localPrices: bySlug.get(p.id) } : p))
}

/** A price an admin set for one product in one currency (table product_prices). */
export interface ProductPriceRow {
  id: string
  product_id: string
  currency: string
  price: number
  original_price: number | null
  updated_at: string
}
