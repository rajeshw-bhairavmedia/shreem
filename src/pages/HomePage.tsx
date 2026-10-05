import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { ArrowRight } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import LookSections from '../components/LookSections'
import ProductCard from '../components/ProductCard'
import { site } from '../config/site'
import { useCatalog } from '../context/CatalogContext'
import { categories } from '../data/categories'
import { looks } from '../data/lookbook'
import { formsEnabled, submitForm } from '../lib/utils'

gsap.registerPlugin(ScrollTrigger)
// Don't recalculate scroll animations when a phone's address bar shows/hides (causes jumps).
ScrollTrigger.config({ ignoreMobileResize: true })

const instagramImages = [
  '/look_versatile.jpg',
  '/look_every_moment.jpg',
  '/look_movement.jpg',
  '/look_timeless.jpg',
  '/look_quality.jpg',
  '/look_made_for_you.jpg',
]

export default function HomePage() {
  const { products, loading } = useCatalog()

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo('.hero-bg', { opacity: 0, scale: 1.06 }, { opacity: 1, scale: 1, duration: 1.1, ease: 'power2.out' })
      gsap.fromTo('.hero-headline-word', { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: 0.9, stagger: 0.05, ease: 'power2.out', delay: 0.3 })
      gsap.fromTo('.hero-subtext', { y: 18, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, stagger: 0.08, ease: 'power2.out', delay: 0.6 })
    })
    return () => ctx.revert()
  }, [])

  // Product sections change the page height once the catalog loads.
  useEffect(() => {
    if (!loading) ScrollTrigger.refresh()
  }, [loading])

  const trending = products.filter((p) => p.isTrending).slice(0, 8)
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

      {/* Lookbook preview: 2 looks here, all of them on /lookbook */}
      <div id="lookbook">
        <LookSections looks={looks.slice(0, 2)} />
        <div className="py-16 lg:py-20 px-4 text-center">
          <Link to="/lookbook" className="btn-primary">
            View the Full Lookbook
            <ArrowRight className="w-4 h-4 ml-2" />
          </Link>
        </div>
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
      {trending.length > 0 && (
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
            {trending.map((p) => (
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
