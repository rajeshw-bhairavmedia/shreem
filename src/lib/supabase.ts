import { createClient } from '@supabase/supabase-js'
import type { Category, Product, Style } from '../types'

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
  return (data as ProductRow[]).map(toProduct)
}
