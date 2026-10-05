export type Category = 'men' | 'women' | 'occasion'
export type Style = 'casual' | 'formal' | 'traditional'

export interface Product {
  /** URL slug. */
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
  /** Shown in "Trending Now" on the home page (chosen in /admin). */
  isTrending?: boolean
  isSale?: boolean
  available: boolean
  /** Units in stock per size. Missing when stock isn't tracked (local catalog). */
  stock?: Record<string, number>
}

export interface CartLine {
  key: string
  productId: string
  name: string
  image: string
  price: number
  size?: string
  color?: string
  quantity: number
}
