import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import type { CartLine } from '../types'

const STORAGE_KEY = 'shreem-cart'
const CART_ID_KEY = 'shreem-cart-id'

/** Identifies this cart for reminder emails; a new one starts after each paid order. */
export function getCartId(): string {
  try {
    let id = localStorage.getItem(CART_ID_KEY)
    if (!id) {
      id = crypto.randomUUID()
      localStorage.setItem(CART_ID_KEY, id)
    }
    return id
  } catch {
    return crypto.randomUUID()
  }
}

export function setCartId(id: string | null) {
  try {
    if (id) localStorage.setItem(CART_ID_KEY, id)
    else localStorage.removeItem(CART_ID_KEY)
  } catch {
    // Storage unavailable.
  }
}

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
  clear: () => void
  /** Replaces the cart (used by the reminder email's restore link). */
  replaceLines: (lines: Omit<CartLine, 'key'>[]) => void
}

const CartContext = createContext<CartState | null>(null)

function loadLines(): CartLine[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const lines = raw ? (JSON.parse(raw) as CartLine[]) : []
    return Array.isArray(lines) ? lines : []
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
    const key = `${line.productId}|${line.size ?? ''}|${line.color ?? ''}`
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
  const clear = useCallback(() => {
    setLines([])
    setCartId(null)
  }, [])
  const replaceLines = useCallback(
    (next: Omit<CartLine, 'key'>[]) =>
      setLines(next.map((l) => ({ ...l, key: `${l.productId}|${l.size ?? ''}|${l.color ?? ''}` }))),
    [],
  )

  const count = lines.reduce((n, l) => n + l.quantity, 0)
  const subtotal = lines.reduce((sum, l) => sum + l.price * l.quantity, 0)

  return (
    <CartContext.Provider
      value={{ lines, count, subtotal, isOpen, openCart, closeCart, addLine, setQuantity, removeLine, clear, replaceLines }}
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
