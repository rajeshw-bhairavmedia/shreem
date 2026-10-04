import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { createCheckout, shopifyEnabled } from '../lib/shopify'
import { openWhatsApp, orderMessage } from '../lib/utils'
import type { CartLine } from '../types'

const STORAGE_KEY = 'shreem-cart'

interface CartState {
  lines: CartLine[]
  count: number
  subtotal: number
  isOpen: boolean
  openCart: () => void
  closeCart: () => void
  addLine: (line: Omit<CartLine, 'key'>) => void
  setQuantity: (key: string, quantity: number) => void
  removeLine: (key: string) => void
  /** Shopify checkout when every line maps to a Shopify variant, otherwise a WhatsApp order. */
  checkout: () => Promise<void>
  orderOnWhatsApp: () => void
}

const CartContext = createContext<CartState | null>(null)

function loadLines(): CartLine[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as CartLine[]) : []
  } catch {
    return []
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>(loadLines)
  const [isOpen, setIsOpen] = useState(false)
  const openCart = useCallback(() => setIsOpen(true), [])
  const closeCart = useCallback(() => setIsOpen(false), [])

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(lines))
    } catch {
      // Storage unavailable (private mode); the cart still works for this visit.
    }
  }, [lines])

  const addLine = (line: Omit<CartLine, 'key'>) => {
    const key = line.variantId ?? `${line.productId}|${line.size ?? ''}|${line.color ?? ''}`
    setLines((prev) => {
      const existing = prev.find((l) => l.key === key)
      if (existing) {
        return prev.map((l) => (l.key === key ? { ...l, quantity: l.quantity + line.quantity } : l))
      }
      return [...prev, { ...line, key }]
    })
  }

  const setQuantity = (key: string, quantity: number) =>
    setLines((prev) =>
      quantity < 1
        ? prev.filter((l) => l.key !== key)
        : prev.map((l) => (l.key === key ? { ...l, quantity } : l)),
    )

  const removeLine = (key: string) => setLines((prev) => prev.filter((l) => l.key !== key))

  const orderOnWhatsApp = () => openWhatsApp(orderMessage(lines))

  const checkout = async () => {
    if (!lines.length) return
    if (shopifyEnabled && lines.every((l) => l.variantId)) {
      const url = await createCheckout(
        lines.map((l) => ({ variantId: l.variantId as string, quantity: l.quantity })),
      )
      window.location.href = url
      return
    }
    orderOnWhatsApp()
  }

  const count = lines.reduce((n, l) => n + l.quantity, 0)
  const subtotal = lines.reduce((sum, l) => sum + l.price * l.quantity, 0)

  return (
    <CartContext.Provider
      value={{
        lines,
        count,
        subtotal,
        isOpen,
        openCart,
        closeCart,
        addLine,
        setQuantity,
        removeLine,
        checkout,
        orderOnWhatsApp,
      }}
    >
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used inside CartProvider')
  return ctx
}
