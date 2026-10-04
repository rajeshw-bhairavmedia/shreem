import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { ArrowRight } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import ProductCard from '../components/ProductCard'
import { site } from '../config/site'
import { useCatalog } from '../context/CatalogContext'
import { categories } from '../data/categories'
import { formsEnabled, submitForm } from '../lib/utils'

gsap.registerPlugin(ScrollTrigger)

const looks = [
  { headline: 'VERSATILE STYLE', body: 'From morning meetings to evening plans—clean lines that work anywhere.', link: 'See styling notes', image: '/look_versatile.jpg', align: 'right' },
  { headline: 'FOR EVERY MOMENT', body: 'Lightweight layers, effortless movement—designed to keep up with your day.', cta: 'Shop daily wear', image: '/look_every_moment.jpg', align: 'left' },
  { headline: 'DESIGNED FOR MOVEMENT', body: 'Stretch-friendly fits, breathable fabrics, and details that stay clean on the go.', link: 'View performance details', image: '/look_movement.jpg', align: 'right' },
  { headline: 'TIMELESS DESIGN', body: 'Minimal silhouettes, honest materials, and finishes that age beautifully.', cta: 'Explore essentials', image: '/look_timeless.jpg', align: 'left' },
  { headline: 'QUALITY YOU CAN FEEL', body: 'Soft hand-feel, durable construction, and finishes that last wash after wash.', link: 'Read fabric care', image: '/look_quality.jpg', align: 'right' },
  { headline: 'MADE FOR YOU', body: 'A fit that feels right and a look that stays true—no noise, just comfort.', cta: 'Find your size', image: '/look_made_for_you.jpg', align: 'left' },
  { headline: 'FIND YOUR FIT', body: 'A range of sizes and fits designed to look good on real people—clean, modern, wearable.', cta: 'View size guide', image: '/look_find_your_fit.jpg', align: 'right' },
] as const

const instagramImages = [
  '/look_versatile.jpg',
  '/look_every_moment.jpg',
  '/look_movement.jpg',
  '/look_timeless.jpg',
  '/look_quality.jpg',
  '/look_made_for_you.jpg',
]

export default function HomePage() {
  const lookRefs = useRef<(HTMLElement | null)[]>([])
  const { products, loading } = useCatalog()

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo('.hero-bg', { opacity: 0, scale: 1.06 }, { opacity: 1, scale: 1, duration: 1.1, ease: 'power2.out' })
      gsap.fromTo('.hero-headline-word', { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: 0.9, stagger: 0.05, ease: 'power2.out', delay: 0.3 })
      gsap.fromTo('.hero-subtext', { y: 18, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, stagger: 0.08, ease: 'power2.out', delay: 0.6 })

      lookRefs.current.forEach((section, i) => {
        if (!section) return
        const fromRight = looks[i].align === 'right'
        gsap.fromTo(
          section.querySelector('.value-bg'),
          { scale: 1.1, x: fromRight ? '-4vw' : '4vw' },
          { scale: 1, x: 0, scrollTrigger: { trigger: section, start: 'top 80%', end: 'top 30%', scrub: 0.5 } },
        )
        gsap.fromTo(
          section.querySelector('.value-content'),
          { x: fromRight ? '12vw' : '-12vw', opacity: 0 },
          { x: 0, opacity: 1, scrollTrigger: { trigger: section, start: 'top 75%', end: 'top 40%', scrub: 0.5 } },
        )
      })
    })
    return () => ctx.revert()
  }, [])

  // Product sections change the page height once the catalog loads.
  useEffect(() => {
    if (!loading) ScrollTrigger.refresh()
  }, [loading])

  const bestsellers = products.filter((p) => p.isBestseller).slice(0, 4)
  const newArrivals = products.filter((p) => p.isNew).slice(0, 6)

  return (
    <div className="relative">
      {/* Hero */}
      <section className="relative h-screen w-full overflow-hidden">
        <div className="hero-bg absolute inset-0">
          <img src="/hero_fabric.jpg" alt="Premium fabric texture" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-shreem-cream/30 via-transparent to-shreem-cream/60" />
        </div>
        <div className="relative z-10 h-full flex flex-col items-center justify-center px-4 text-center">
          <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-display font-black text-shreem-black uppercase tracking-tight leading-[0.9] mb-6">
            {'TOUCH THE CRAFT'.split(' ').map((word) => (
              <span key={word} className="hero-headline-word inline-block mr-4">
                {word}
              </span>
            ))}
          </h1>
          <p className="hero-subtext text-lg md:text-xl text-shreem-gray max-w-xl mb-8">
            Premium essentials designed for real life—soft, durable, quietly bold.
          </p>
          <Link to="/collections" className="hero-subtext btn-primary">
            Explore the Collection
            <ArrowRight className="w-4 h-4 ml-2" />
          </Link>
        </div>
      </section>

      {/* Lookbook */}
      <div id="lookbook">
        {looks.map((look, i) => (
          <section
            key={look.headline}
            ref={(el) => {
              lookRefs.current[i] = el
            }}
            className="relative min-h-screen w-full overflow-hidden flex items-center"
          >
            <div className="value-bg absolute inset-0">
              <img src={look.image} alt={look.headline} loading="lazy" className="w-full h-full object-cover" />
              <div
                className={`absolute inset-0 ${
                  look.align === 'right' ? 'bg-gradient-to-l' : 'bg-gradient-to-r'
                } from-shreem-cream/80 via-shreem-cream/40 to-transparent`}
              />
            </div>
            <div
              className={`value-content relative z-10 w-full px-6 sm:px-10 lg:px-20 py-20 ${
                look.align === 'right' ? 'ml-auto text-right' : 'mr-auto text-left'
              }`}
              style={{ maxWidth: '600px' }}
            >
              <h2 className="section-heading text-shreem-black mb-6">{look.headline}</h2>
              <p className="section-subheading mb-8">{look.body}</p>
              {'cta' in look && (
                <Link to="/collections" className="btn-outline">
                  {look.cta}
                </Link>
              )}
              {'link' in look && (
                <Link
                  to="/collections"
                  className="inline-flex items-center text-shreem-black font-medium hover:text-shreem-gold transition-colors group"
                >
                  {look.link}
                  <ArrowRight className="w-4 h-4 ml-2 transform group-hover:translate-x-1 transition-transform" />
                </Link>
              )}
            </div>
          </section>
        ))}
      </div>

      {/* Shop by category */}
      <section className="py-20 lg:py-32 px-4 sm:px-6 lg:px-10">
        <div className="text-center mb-16">
          <h2 className="section-heading mb-4">Shop by Category</h2>
          <p className="section-subheading max-w-xl mx-auto">Discover our curated collections for every occasion</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
          {categories.map((c) => (
            <Link
              key={c.id}
              to={`/collections?category=${c.id}`}
              className="group relative aspect-[3/4] overflow-hidden rounded-lg"
            >
              <img
                src={c.image}
                alt={c.label}
                loading="lazy"
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-shreem-black/60 via-transparent to-transparent" />
              <div className="absolute bottom-6 left-6 right-6">
                <h3 className="text-2xl font-display font-bold text-white mb-2">{c.label}</h3>
                <span className="inline-flex items-center text-white/80 text-sm group-hover:text-shreem-gold transition-colors">
                  Explore
                  <ArrowRight className="w-4 h-4 ml-2 transform group-hover:translate-x-1 transition-transform" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Trending */}
      {bestsellers.length > 0 && (
        <section className="py-20 lg:py-32 px-4 sm:px-6 lg:px-10 bg-white">
          <div className="flex items-end justify-between mb-12">
            <div>
              <h2 className="section-heading mb-4">Trending Now</h2>
              <p className="section-subheading">Our most loved pieces</p>
            </div>
            <Link to="/collections?filter=bestseller" className="hidden sm:inline-flex items-center text-shreem-black font-medium hover:text-shreem-gold transition-colors">
              View All
              <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 lg:gap-6">
            {bestsellers.map((p) => (
              <ProductCard key={p.id} product={p} badges={['bestseller']} />
            ))}
          </div>
        </section>
      )}

      {/* New arrivals */}
      {newArrivals.length > 0 && (
        <section className="py-20 lg:py-32 px-4 sm:px-6 lg:px-10">
          <div className="flex items-end justify-between mb-12">
            <div>
              <h2 className="section-heading mb-4">New Arrivals</h2>
              <p className="section-subheading">Fresh from our atelier</p>
            </div>
            <Link to="/collections?filter=new" className="hidden sm:inline-flex items-center text-shreem-black font-medium hover:text-shreem-gold transition-colors">
              View All
              <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 lg:gap-6">
            {newArrivals.map((p) => (
              <ProductCard key={p.id} product={p} badges={['new']} />
            ))}
          </div>
        </section>
      )}

      {/* Instagram */}
      <section className="py-20 lg:py-32 px-4 sm:px-6 lg:px-10 bg-white">
        <div className="text-center mb-12">
          <h2 className="section-heading mb-4">{site.instagramHandle}</h2>
          <p className="section-subheading">Follow us for daily inspiration</p>
        </div>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2 lg:gap-4">
          {instagramImages.map((src, i) => (
            <a
              key={src}
              href={site.social.instagram}
              target="_blank"
              rel="noopener noreferrer"
              className="group relative aspect-square overflow-hidden"
            >
              <img
                src={src}
                alt={`Instagram post ${i + 1}`}
                loading="lazy"
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-shreem-black/0 group-hover:bg-shreem-black/40 transition-colors flex items-center justify-center">
                <span className="text-white opacity-0 group-hover:opacity-100 transition-opacity text-sm font-medium">View</span>
              </div>
            </a>
          ))}
        </div>
      </section>

      <Newsletter />
    </div>
  )
}

function Newsletter() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'sending' | 'done' | 'error'>('idle')

  const subscribe = async (e: FormEvent) => {
    e.preventDefault()
    if (!formsEnabled) {
      // No form service configured: hand off to the visitor's email app.
      const body = `Please add ${email} to the ${site.name} newsletter.`
      window.location.href = `mailto:${site.email}?subject=${encodeURIComponent('Newsletter signup')}&body=${encodeURIComponent(body)}`
      setStatus('done')
      return
    }
    setStatus('sending')
    try {
      await submitForm({ email, _subject: 'Newsletter signup' })
      setStatus('done')
      setEmail('')
    } catch {
      setStatus('error')
    }
  }

  return (
    <section className="py-20 lg:py-32 px-4 sm:px-6 lg:px-10">
      <div className="max-w-2xl mx-auto text-center">
        <h2 className="section-heading mb-4">Join the Family</h2>
        <p className="section-subheading mb-8">
          Subscribe for exclusive offers, early access to new collections, and styling tips.
        </p>
        {status === 'done' ? (
          <p className="text-shreem-black font-medium">Thank you for subscribing!</p>
        ) : (
          <form onSubmit={subscribe} className="flex flex-col sm:flex-row gap-4">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              className="flex-1 px-6 py-4 bg-white border border-shreem-black/10 rounded-full focus:outline-none focus:border-shreem-gold transition-colors"
            />
            <button type="submit" disabled={status === 'sending'} className="btn-primary disabled:opacity-60">
              {status === 'sending' ? 'Subscribing…' : 'Subscribe'}
            </button>
          </form>
        )}
        {status === 'error' && <p className="text-sm text-red-600 mt-3">Something went wrong. Please try again.</p>}
        <p className="text-xs text-shreem-gray mt-4">
          By subscribing, you agree to receive marketing emails. Unsubscribe anytime.
        </p>
      </div>
    </section>
  )
}
