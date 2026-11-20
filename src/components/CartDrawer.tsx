import { Minus, Plus, ShoppingBag, Trash2, X } from 'lucide-react'
import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { MAX_QUANTITY_PER_ITEM, shippingFor } from '../../shared/store'
import { site } from '../config/site'
import { useCart } from '../context/CartContext'
import { useCatalog } from '../context/CatalogContext'
import { useCurrency } from '../context/CurrencyContext'

export default function CartDrawer() {
  const { formatPrice, formatAmount, productPrice } = useCurrency()
  const { lines, isOpen, closeCart, setQuantity, removeLine, subtotal } = useCart()
  const { getProduct } = useCatalog()
  // Shown in the shopper's currency; the rupee subtotal is still what is charged.
  const unitAmount = (l: (typeof lines)[number]) => productPrice(getProduct(l.productId) ?? { price: l.price }).price
  const shownSubtotal = lines.reduce((sum, l) => sum + unitAmount(l) * l.quantity, 0)

  useEffect(() => {
    if (!isOpen) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && closeCart()
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [isOpen, closeCart])

  const remaining = site.freeShippingAbove - subtotal
  const shipping = shippingFor(subtotal)

  return (
    <div
      className={`fixed inset-0 z-[60] transition-all duration-300 ${
        isOpen ? 'opacity-100 pointer-events-auto visible' : 'opacity-0 pointer-events-none invisible'
      }`}
      aria-hidden={!isOpen}
    >
      <div className="absolute inset-0 bg-shreem-black/30 backdrop-blur-sm" onClick={closeCart} />
      <aside
        className={`absolute top-0 right-0 h-full w-full max-w-md bg-shreem-cream shadow-2xl flex flex-col transition-transform duration-500 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        aria-label="Shopping cart"
      >
        <div className="flex items-center justify-between px-6 py-5 border-b border-shreem-black/10">
          <h2 className="text-lg font-display font-bold uppercase tracking-tight">Your Cart</h2>
          <button onClick={closeCart} className="p-2 hover:bg-shreem-black/5 rounded-full transition-colors" aria-label="Close cart">
            <X className="w-5 h-5" />
          </button>
        </div>

        {lines.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
            <ShoppingBag className="w-12 h-12 text-shreem-gold mb-4" />
            <p className="text-shreem-gray mb-6">Your cart is empty.</p>
            <Link to="/collections" onClick={closeCart} className="btn-primary">
              Shop the Collection
            </Link>
          </div>
        ) : (
          <>
            <ul className="flex-1 overflow-y-auto px-6 py-4 divide-y divide-shreem-black/10">
              {lines.map((line) => (
                <li key={line.key} className="flex gap-4 py-4">
                  <Link to={`/product/${line.productId}`} onClick={closeCart} className="w-20 h-24 flex-shrink-0 rounded-lg overflow-hidden bg-white">
                    <img src={line.image} alt={line.name} className="w-full h-full object-cover" />
                  </Link>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <Link to={`/product/${line.productId}`} onClick={closeCart} className="font-medium text-sm hover:text-shreem-gold transition-colors">
                        {line.name}
                      </Link>
                      <button onClick={() => removeLine(line.key)} className="p-1 text-shreem-gray hover:text-red-500 transition-colors" aria-label={`Remove ${line.name}`}>
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <p className="text-xs text-shreem-gray mt-1">{[line.size, line.color].filter(Boolean).join(' / ')}</p>
                    <div className="flex items-center justify-between mt-3">
                      <div className="flex items-center border border-shreem-black/10 rounded-lg">
                        <button onClick={() => setQuantity(line.key, line.quantity - 1)} className="w-8 h-8 flex items-center justify-center hover:bg-shreem-black/5" aria-label="Decrease quantity">
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-8 text-center text-sm font-medium">{line.quantity}</span>
                        <button
                          onClick={() => setQuantity(line.key, Math.min(MAX_QUANTITY_PER_ITEM, line.quantity + 1))}
                          className="w-8 h-8 flex items-center justify-center hover:bg-shreem-black/5"
                          aria-label="Increase quantity"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                      <span className="text-sm font-semibold">{formatAmount(unitAmount(line) * line.quantity)}</span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            <div className="px-6 py-5 border-t border-shreem-black/10 bg-white/60">
              <p className="text-xs text-shreem-gray mb-3">
                {remaining > 0 ? `Add ${formatPrice(remaining)} more for free shipping.` : 'Your order ships free.'}
              </p>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-shreem-gray">Subtotal</span>
                <span className="text-lg font-semibold">{formatAmount(shownSubtotal)}</span>
              </div>
              <p className="text-xs text-shreem-gray mb-4">
                Shipping: {shipping ? formatPrice(shipping) : 'Free'}. Pay securely by UPI, card or netbanking.
              </p>
              <Link to="/checkout" onClick={closeCart} className="w-full btn-gold">
                Checkout
              </Link>
            </div>
          </>
        )}
      </aside>
    </div>
  )
}
