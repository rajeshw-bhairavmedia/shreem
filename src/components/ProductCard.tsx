import { Link } from 'react-router-dom'
import { useCurrency } from '../context/CurrencyContext'
import { categoryLabel } from '../lib/utils'
import type { Product } from '../types'

type Badge = 'new' | 'bestseller' | 'sale'

interface Props {
  product: Product
  /** Which badges to show on the image. */
  badges?: Badge[]
  /** Show category, compare-at price (and description in list layout). */
  detailed?: boolean
  list?: boolean
}

export default function ProductCard({ product: p, badges = [], detailed = false, list = false }: Props) {
  const { formatPrice } = useCurrency()
  const show = (b: Badge) => badges.includes(b)

  return (
    <Link to={`/product/${p.id}`} className={`group ${list ? 'flex gap-6' : ''}`}>
      <div className={`product-card ${list ? 'flex gap-6 w-full' : ''}`}>
        <div className={`product-card-image ${list ? 'w-48 flex-shrink-0' : ''}`}>
          <img src={p.images[0]} alt={p.name} loading="lazy" className="w-full h-full object-cover" />
          {show('new') && p.isNew && (
            <span className="absolute top-3 left-3 px-3 py-1 bg-shreem-black text-white text-xs font-medium rounded-full">
              New
            </span>
          )}
          {show('bestseller') && p.isBestseller && (
            <span className="absolute top-3 left-3 px-3 py-1 bg-shreem-gold text-shreem-black text-xs font-medium rounded-full">
              Bestseller
            </span>
          )}
          {show('sale') && p.isSale && (
            <span className="absolute top-3 right-3 px-3 py-1 bg-red-500 text-white text-xs font-medium rounded-full">
              Sale
            </span>
          )}
          {!p.available && (
            <span className="absolute bottom-3 left-3 px-3 py-1 bg-white/90 text-shreem-black text-xs font-medium rounded-full">
              Sold Out
            </span>
          )}
        </div>

        {detailed ? (
          <div className={`p-4 ${list ? 'flex-1' : ''}`}>
            <h3 className="font-medium text-shreem-black group-hover:text-shreem-gold transition-colors">
              {p.name}
            </h3>
            <p className="text-sm text-shreem-gray mt-1 capitalize">{categoryLabel(p)}</p>
            <div className="flex items-center gap-2 mt-2">
              <span className="font-semibold text-shreem-black">{formatPrice(p.price)}</span>
              {p.originalPrice && (
                <span className="text-sm text-shreem-gray line-through">{formatPrice(p.originalPrice)}</span>
              )}
            </div>
            {list && <p className="text-sm text-shreem-gray mt-3 line-clamp-2">{p.description}</p>}
          </div>
        ) : (
          <div className="p-4">
            <h3 className="font-medium text-shreem-black group-hover:text-shreem-gold transition-colors truncate">
              {p.name}
            </h3>
            <p className="text-sm text-shreem-gray mt-1">{formatPrice(p.price)}</p>
          </div>
        )}
      </div>
    </Link>
  )
}
