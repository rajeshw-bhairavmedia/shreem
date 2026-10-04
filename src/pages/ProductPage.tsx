import gsap from 'gsap'
import { ArrowLeft, Check, MessageCircle, RefreshCcw, Share2, Shield, ShoppingBag, Truck } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import ProductCard from '../components/ProductCard'
import { site } from '../config/site'
import { useCart } from '../context/CartContext'
import { useCatalog } from '../context/CatalogContext'
import { categoryLabel, formatPrice, openWhatsApp, orderMessage } from '../lib/utils'

export default function ProductPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const { products, loading, getProduct } = useCatalog()
  const { addLine, openCart } = useCart()
  const product = getProduct(id)

  const [size, setSize] = useState('')
  const [color, setColor] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [imageIndex, setImageIndex] = useState(0)
  const [shared, setShared] = useState(false)
  const imageRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!product) return
    const firstAvailable = product.variants?.find((v) => v.available)
    setSize(firstAvailable?.size ?? product.sizes[0] ?? '')
    setColor(firstAvailable?.color ?? product.colors[0] ?? '')
    setQuantity(1)
    setImageIndex(0)
  }, [product])

  useEffect(() => {
    if (imageRef.current && product) {
      gsap.fromTo(imageRef.current, { opacity: 0, scale: 1.02 }, { opacity: 1, scale: 1, duration: 0.6, ease: 'power2.out' })
    }
  }, [product, imageIndex])

  if (!product) {
    if (loading) return <div className="pt-32 pb-20 px-4 text-center text-shreem-gray">Loading…</div>
    return (
      <div className="pt-32 pb-20 px-4 text-center">
        <p className="text-lg text-shreem-gray mb-4">Product not found</p>
        <Link to="/collections" className="btn-primary">
          Browse Collections
        </Link>
      </div>
    )
  }
  // Old numeric links (/product/3) redirect to the product's slug.
  if (product.id !== id) return <Navigate to={`/product/${product.id}`} replace />

  const variants = product.variants
  const variant = variants?.find(
    (v) => (!product.sizes.length || v.size === size) && (!product.colors.length || v.color === color),
  )
  const price = variant?.price ?? product.price
  const compareAt = variants ? variant?.compareAtPrice : product.originalPrice
  const originalPrice = compareAt && compareAt > price ? compareAt : undefined
  const available = variants ? !!variant?.available : product.available
  const sizeInStock = (s: string) =>
    !variants || variants.some((v) => v.size === s && (!color || v.color === color) && v.available)

  const line = {
    productId: product.id,
    variantId: variant?.id,
    name: product.name,
    image: product.images[0],
    price,
    size: size || undefined,
    color: color || undefined,
    quantity,
  }

  const addToCart = () => {
    addLine(line)
    openCart()
  }

  const share = async () => {
    const url = window.location.href
    try {
      if (navigator.share) await navigator.share({ title: product.name, url })
      else {
        await navigator.clipboard.writeText(url)
        setShared(true)
        setTimeout(() => setShared(false), 2000)
      }
    } catch {
      // Share sheet dismissed.
    }
  }

  const related = products.filter((p) => p.category === product.category && p.id !== product.id).slice(0, 4)

  return (
    <div className="pt-24 lg:pt-32 pb-20">
      <div className="px-4 sm:px-6 lg:px-10 mb-6">
        <button
          onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/collections'))}
          className="inline-flex items-center text-sm text-shreem-gray hover:text-shreem-black transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Collections
        </button>
      </div>

      <div className="px-4 sm:px-6 lg:px-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
          {/* Images */}
          <div className="space-y-4">
            <div ref={imageRef} className="relative aspect-[3/4] bg-shreem-cream rounded-lg overflow-hidden">
              <img src={product.images[imageIndex]} alt={product.name} className="w-full h-full object-cover" />
              {product.isNew && (
                <span className="absolute top-4 left-4 px-4 py-1.5 bg-shreem-black text-white text-sm font-medium rounded-full">
                  New Arrival
                </span>
              )}
              {product.isBestseller && (
                <span className="absolute top-4 left-4 px-4 py-1.5 bg-shreem-gold text-shreem-black text-sm font-medium rounded-full">
                  Bestseller
                </span>
              )}
              {product.isSale && (
                <span className="absolute top-4 right-4 px-4 py-1.5 bg-red-500 text-white text-sm font-medium rounded-full">Sale</span>
              )}
            </div>
            {product.images.length > 1 && (
              <div className="flex gap-2 flex-wrap">
                {product.images.map((src, i) => (
                  <button
                    key={src}
                    onClick={() => setImageIndex(i)}
                    className={`w-20 h-20 rounded-lg overflow-hidden border-2 transition-colors ${
                      imageIndex === i ? 'border-shreem-gold' : 'border-transparent'
                    }`}
                  >
                    <img src={src} alt={`${product.name} - view ${i + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Details */}
          <div className="lg:sticky lg:top-32 lg:self-start">
            <div className="mb-6">
              <p className="text-sm text-shreem-gray capitalize mb-2">{categoryLabel(product)}</p>
              <h1 className="text-3xl lg:text-4xl font-display font-bold text-shreem-black mb-4">{product.name}</h1>
              <div className="flex items-center gap-3">
                <span className="text-2xl font-semibold text-shreem-black">{formatPrice(price)}</span>
                {originalPrice && (
                  <>
                    <span className="text-lg text-shreem-gray line-through">{formatPrice(originalPrice)}</span>
                    <span className="px-2 py-1 bg-red-100 text-red-600 text-xs font-medium rounded">
                      {Math.round((1 - price / originalPrice) * 100)}% OFF
                    </span>
                  </>
                )}
              </div>
            </div>

            <p className="text-shreem-gray leading-relaxed mb-8">{product.description}</p>

            {product.colors.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-medium mb-3">
                  Color: <span className="text-shreem-gray">{color}</span>
                </h3>
                <div className="flex flex-wrap gap-3">
                  {product.colors.map((c) => (
                    <button
                      key={c}
                      onClick={() => setColor(c)}
                      className={`px-4 py-2 rounded-full text-sm font-medium border-2 transition-all duration-300 ${
                        color === c ? 'border-shreem-black bg-shreem-black text-white' : 'border-shreem-black/10 hover:border-shreem-black/30'
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {product.sizes.length > 0 && (
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium">
                    Size: <span className="text-shreem-gray">{size}</span>
                  </h3>
                  <button
                    onClick={() => openWhatsApp(`Hi! Can you help me with sizing for the ${product.name}?`)}
                    className="text-sm text-shreem-gold hover:underline"
                  >
                    Size Guide
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {product.sizes.map((s) => (
                    <button
                      key={s}
                      onClick={() => setSize(s)}
                      className={`min-w-12 h-12 px-3 rounded-lg text-sm font-medium border-2 transition-all duration-300 ${
                        size === s ? 'border-shreem-black bg-shreem-black text-white' : 'border-shreem-black/10 hover:border-shreem-black/30'
                      } ${sizeInStock(s) ? '' : 'line-through opacity-50'}`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="mb-8">
              <h3 className="text-sm font-medium mb-3">Quantity</h3>
              <div className="inline-flex items-center border border-shreem-black/10 rounded-lg">
                <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="w-10 h-10 flex items-center justify-center hover:bg-shreem-black/5 transition-colors" aria-label="Decrease quantity">
                  -
                </button>
                <span className="w-10 text-center font-medium">{quantity}</span>
                <button onClick={() => setQuantity(quantity + 1)} className="w-10 h-10 flex items-center justify-center hover:bg-shreem-black/5 transition-colors" aria-label="Increase quantity">
                  +
                </button>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 mb-4">
              <button onClick={addToCart} disabled={!available} className="flex-1 btn-primary gap-2 disabled:opacity-50 disabled:pointer-events-none">
                <ShoppingBag className="w-5 h-5" />
                {available ? 'Add to Cart' : 'Sold Out'}
              </button>
              <button
                onClick={share}
                className="p-4 rounded-full border-2 border-shreem-black/10 hover:border-shreem-black/30 transition-colors self-start sm:self-auto"
                aria-label="Share"
              >
                {shared ? <Check className="w-5 h-5 text-green-600" /> : <Share2 className="w-5 h-5" />}
              </button>
            </div>
            <button
              onClick={() => openWhatsApp(orderMessage([{ ...line, key: '' }]))}
              disabled={!available}
              className="w-full btn-gold gap-2 mb-8 disabled:opacity-50 disabled:pointer-events-none"
            >
              <MessageCircle className="w-5 h-5" />
              Order on WhatsApp
            </button>

            <div className="grid grid-cols-3 gap-4 py-6 border-t border-shreem-black/10">
              <div className="text-center">
                <Truck className="w-6 h-6 mx-auto mb-2 text-shreem-gold" />
                <p className="text-xs text-shreem-gray">Free shipping over {formatPrice(site.freeShippingAbove)}</p>
              </div>
              <div className="text-center">
                <RefreshCcw className="w-6 h-6 mx-auto mb-2 text-shreem-gold" />
                <p className="text-xs text-shreem-gray">Easy Returns</p>
              </div>
              <div className="text-center">
                <Shield className="w-6 h-6 mx-auto mb-2 text-shreem-gold" />
                <p className="text-xs text-shreem-gray">Secure Payment</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {related.length > 0 && (
        <div className="mt-20 px-4 sm:px-6 lg:px-10">
          <h2 className="text-2xl font-display font-bold mb-8">You May Also Like</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 lg:gap-6">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
