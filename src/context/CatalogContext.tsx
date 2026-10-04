import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { legacyProductIds, localProducts } from '../data/products'
import { fetchShopifyProducts, shopifyEnabled } from '../lib/shopify'
import type { Product } from '../types'

interface CatalogState {
  products: Product[]
  loading: boolean
  getProduct: (id: string) => Product | undefined
}

const CatalogContext = createContext<CatalogState | null>(null)

export function CatalogProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<Product[]>(shopifyEnabled ? [] : localProducts)
  const [loading, setLoading] = useState(shopifyEnabled)

  useEffect(() => {
    if (!shopifyEnabled) return
    fetchShopifyProducts()
      .then(setProducts)
      .catch((err) => {
        // Keep the site usable (WhatsApp ordering) if Shopify is unreachable.
        console.error('Failed to load Shopify products, using local catalog:', err)
        setProducts(localProducts)
      })
      .finally(() => setLoading(false))
  }, [])

  const getProduct = (id: string) =>
    products.find((p) => p.id === id) ?? products.find((p) => p.id === legacyProductIds[id])

  return (
    <CatalogContext.Provider value={{ products, loading, getProduct }}>
      {children}
    </CatalogContext.Provider>
  )
}

export function useCatalog() {
  const ctx = useContext(CatalogContext)
  if (!ctx) throw new Error('useCatalog must be used inside CatalogProvider')
  return ctx
}
