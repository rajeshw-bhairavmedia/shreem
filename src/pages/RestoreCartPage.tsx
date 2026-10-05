import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import type { SavedCartItem } from '../../shared/store'
import { setCartId, useCart } from '../context/CartContext'

/** Opened from the cart reminder email: puts the saved items back in the cart and goes to checkout. */
export default function RestoreCartPage() {
  const [params] = useSearchParams()
  const { replaceLines } = useCart()
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)
  const id = params.get('id') ?? ''

  useEffect(() => {
    let cancelled = false
    fetch(`/api/cart-reminder?action=restore&id=${encodeURIComponent(id)}`)
      .then(async (res) => {
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data.error ?? 'This cart link has expired.')
        return data.items as SavedCartItem[]
      })
      .then((items) => {
        if (cancelled) return
        replaceLines(
          items.map((i) => ({
            productId: i.slug,
            name: i.name,
            image: i.image,
            price: i.price,
            size: i.size || undefined,
            color: i.color || undefined,
            quantity: i.quantity,
          })),
        )
        setCartId(id) // keep tracking the same cart
        navigate('/checkout', { replace: true })
      })
      .catch((err) => !cancelled && setError(err.message))
    return () => {
      cancelled = true
    }
  }, [id, navigate, replaceLines])

  return (
    <div className="min-h-[60vh] pt-32 pb-20 px-4 text-center">
      {error ? (
        <>
          <h1 className="section-heading mb-4">Cart Expired</h1>
          <p className="section-subheading mb-8">{error}</p>
          <Link to="/collections" className="btn-primary">
            Shop the Collection
          </Link>
        </>
      ) : (
        <p className="text-shreem-gray">Restoring your cart…</p>
      )}
    </div>
  )
}
