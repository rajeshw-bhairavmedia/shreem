import type { Category, Product, Style, Variant } from '../types'

const domain = import.meta.env.VITE_SHOPIFY_STORE_DOMAIN
const token = import.meta.env.VITE_SHOPIFY_STOREFRONT_TOKEN
const apiVersion = import.meta.env.VITE_SHOPIFY_API_VERSION || '2026-07'

export const shopifyEnabled = Boolean(domain && token)

async function storefront<T>(query: string, variables: Record<string, unknown> = {}): Promise<T> {
  const res = await fetch(`https://${domain}/api/${apiVersion}/graphql.json`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Storefront-Access-Token': token as string,
    },
    body: JSON.stringify({ query, variables }),
  })
  if (!res.ok) throw new Error(`Shopify request failed (${res.status})`)
  const json = (await res.json()) as { data?: T; errors?: { message: string }[] }
  if (json.errors?.length) throw new Error(json.errors.map((e) => e.message).join('; '))
  return json.data as T
}

interface ShopifyProductNode {
  handle: string
  title: string
  description: string
  tags: string[]
  availableForSale: boolean
  images: { nodes: { url: string }[] }
  options: { name: string; optionValues: { name: string }[] }[]
  variants: {
    nodes: {
      id: string
      availableForSale: boolean
      selectedOptions: { name: string; value: string }[]
      price: { amount: string }
      compareAtPrice: { amount: string } | null
    }[]
  }
}

const PRODUCTS_QUERY = `
  query Products($cursor: String) {
    products(first: 100, after: $cursor, sortKey: CREATED_AT, reverse: true) {
      pageInfo { hasNextPage endCursor }
      nodes {
        handle
        title
        description
        tags
        availableForSale
        images(first: 10) { nodes { url } }
        options { name optionValues { name } }
        variants(first: 100) {
          nodes {
            id
            availableForSale
            selectedOptions { name value }
            price { amount }
            compareAtPrice { amount }
          }
        }
      }
    }
  }
`

const isSize = (name: string) => /^size$/i.test(name)
const isColor = (name: string) => /^colou?r$/i.test(name)

// Shopify products are sorted into the site's categories by tags:
//   men | women | occasion            -> main category
//   casual | formal | traditional     -> style (for Men and Women)
//   new | bestseller                  -> badges; "sale" comes from compare-at prices
function mapProduct(node: ShopifyProductNode): Product {
  const tags = new Set(node.tags.map((t) => t.toLowerCase().trim()))
  const has = (...names: string[]) => names.some((n) => tags.has(n))

  const category: Category | '' = has('occasion', 'occasion wear', 'occasion-wear')
    ? 'occasion'
    : has('men')
      ? 'men'
      : has('women')
        ? 'women'
        : ''
  const style = (['casual', 'formal', 'traditional'] as Style[]).find((s) => tags.has(s))

  const variants: Variant[] = node.variants.nodes.map((v) => ({
    id: v.id,
    size: v.selectedOptions.find((o) => isSize(o.name))?.value,
    color: v.selectedOptions.find((o) => isColor(o.name))?.value,
    price: Number(v.price.amount),
    compareAtPrice: v.compareAtPrice ? Number(v.compareAtPrice.amount) : undefined,
    available: v.availableForSale,
  }))
  const cheapest = variants.reduce((a, b) => (b.price < a.price ? b : a), variants[0])
  const onSale = variants.some((v) => v.compareAtPrice && v.compareAtPrice > v.price)
  const optionValues = (match: (name: string) => boolean) =>
    node.options.find((o) => match(o.name))?.optionValues.map((v) => v.name) ?? []

  return {
    id: node.handle,
    name: node.title,
    description: node.description,
    price: cheapest?.price ?? 0,
    originalPrice:
      cheapest?.compareAtPrice && cheapest.compareAtPrice > cheapest.price
        ? cheapest.compareAtPrice
        : undefined,
    category,
    subcategory: category === 'occasion' ? '' : (style ?? ''),
    images: node.images.nodes.length ? node.images.nodes.map((i) => i.url) : ['/hero_fabric.jpg'],
    sizes: optionValues(isSize),
    colors: optionValues(isColor),
    isNew: has('new', 'new arrival', 'new arrivals'),
    isBestseller: has('bestseller', 'best seller', 'best-seller'),
    isSale: onSale,
    available: node.availableForSale,
    variants,
  }
}

export async function fetchShopifyProducts(): Promise<Product[]> {
  const products: Product[] = []
  let cursor: string | null = null
  for (;;) {
    const data: {
      products: {
        pageInfo: { hasNextPage: boolean; endCursor: string | null }
        nodes: ShopifyProductNode[]
      }
    } = await storefront(PRODUCTS_QUERY, { cursor })
    products.push(...data.products.nodes.map(mapProduct))
    if (!data.products.pageInfo.hasNextPage) return products
    cursor = data.products.pageInfo.endCursor
  }
}

const CART_CREATE = `
  mutation CartCreate($lines: [CartLineInput!]!) {
    cartCreate(input: { lines: $lines }) {
      cart { checkoutUrl }
      userErrors { message }
    }
  }
`

/** Creates a Shopify cart and returns the hosted checkout URL (payments via Razorpay etc.). */
export async function createCheckout(lines: { variantId: string; quantity: number }[]): Promise<string> {
  const data = await storefront<{
    cartCreate: { cart: { checkoutUrl: string } | null; userErrors: { message: string }[] }
  }>(CART_CREATE, {
    lines: lines.map((l) => ({ merchandiseId: l.variantId, quantity: l.quantity })),
  })
  const { cart, userErrors } = data.cartCreate
  if (userErrors.length || !cart) {
    throw new Error(userErrors.map((e) => e.message).join('; ') || 'Could not start checkout')
  }
  return cart.checkoutUrl
}
