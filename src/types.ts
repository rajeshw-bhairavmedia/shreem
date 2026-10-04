export type Category = 'men' | 'women' | 'occasion'
export type Style = 'casual' | 'formal' | 'traditional'

export interface Variant {
  id: string
  size?: string
  color?: string
  price: number
  compareAtPrice?: number
  available: boolean
}

export interface Product {
  /** URL slug (the Shopify product handle when connected to Shopify). */
  id: string
  name: string
  description: string
  price: number
  originalPrice?: number
  category: Category | ''
  subcategory: Style | ''
  images: string[]
  sizes: string[]
  colors: string[]
  isNew?: boolean
  isBestseller?: boolean
  isSale?: boolean
  available: boolean
  /** Present only for Shopify products; used to build a real checkout. */
  variants?: Variant[]
}

export interface CartLine {
  key: string
  productId: string
  variantId?: string
  name: string
  image: string
  price: number
  size?: string
  color?: string
  quantity: number
}
