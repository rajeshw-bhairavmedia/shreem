import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { Award, Heart, Leaf, Users } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'

gsap.registerPlugin(ScrollTrigger)

const values = [
  { icon: Heart, title: 'Crafted with Love', description: 'Every piece is made with attention to detail and a passion for preserving traditional craftsmanship.' },
  { icon: Award, title: 'Premium Quality', description: 'We use only the finest fabrics and materials, ensuring each garment meets our high standards.' },
  { icon: Users, title: 'Artisan Support', description: 'We work directly with skilled artisans, providing fair wages and preserving their craft.' },
  { icon: Leaf, title: 'Sustainable Practices', description: 'Our commitment to the environment drives us to adopt eco-friendly production methods.' },
]

// TODO: replace with your real milestones.
const journey = [
  { year: '2018', event: 'Shreem Lifestyle founded in Pune' },
  { year: '2019', event: 'Launched first collection with 50+ designs' },
  { year: '2020', event: 'Expanded to online sales nationwide' },
  { year: '2021', event: 'Partnered with 100+ artisans' },
  { year: '2022', event: 'Opened first flagship store' },
  { year: '2023', event: 'Launched sustainable collection' },
]

// TODO: replace with your real numbers.
const stats = [
  { value: '100+', label: 'Artisan Partners' },
  { value: '5000+', label: 'Happy Customers' },
  { value: '15+', label: 'States Served' },
]

export default function AboutPage() {
  const storyRef = useRef<HTMLElement>(null)
  const valuesRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo('.about-hero-content', { y: 50, opacity: 0 }, { y: 0, opacity: 1, duration: 1, ease: 'power2.out' })
      const story = { trigger: storyRef.current, start: 'top 70%', end: 'top 30%', scrub: 0.5 }
      gsap.fromTo('.story-image', { x: -50, opacity: 0 }, { x: 0, opacity: 1, scrollTrigger: story })
      gsap.fromTo('.story-text', { x: 50, opacity: 0 }, { x: 0, opacity: 1, scrollTrigger: { ...story } })
      gsap.fromTo(
        '.value-card',
        { y: 30, opacity: 0 },
        { y: 0, opacity: 1, stagger: 0.1, scrollTrigger: { trigger: valuesRef.current, start: 'top 70%', toggleActions: 'play none none reverse' } },
      )
    })
    return () => ctx.revert()
  }, [])

  return (
    <div className="pt-24 lg:pt-32">
      <section className="relative h-[60vh] min-h-[400px] overflow-hidden">
        <div className="absolute inset-0">
          <img src="/about_fabrics.jpg" alt="Shreem Lifestyle fabrics" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-shreem-black/60 to-shreem-black/30" />
        </div>
        <div className="about-hero-content relative z-10 h-full flex items-center px-4 sm:px-6 lg:px-10">
          <div className="max-w-2xl">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold text-white mb-4">Our Story</h1>
            <p className="text-lg text-white/80">Timeless heritage. Contemporary global trends.</p>
          </div>
        </div>
      </section>

      <section id="story" ref={storyRef} className="py-20 lg:py-32 px-4 sm:px-6 lg:px-10 scroll-mt-24">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          <div className="story-image">
            <div className="relative">
              <img src="/about_craftsmanship.jpg" alt="Artisan craftsmanship" className="w-full rounded-lg shadow-card" />
              <div className="absolute -bottom-6 -right-6 w-48 h-48 bg-shreem-gold/20 rounded-lg -z-10" />
            </div>
          </div>
          <div className="story-text">
            <h2 className="section-heading mb-6">About Shreem Lifestyle</h2>
            <div className="space-y-4 text-shreem-gray leading-relaxed">
              <p>
                Shreem Lifestyle is a premium fashion and lifestyle brand bringing together timeless heritage, rich
                culture, and contemporary global trends.
              </p>
              <p>
                We believe true luxury lies in the details, from the choice of fabric and craftsmanship to the fit,
                finish, and overall experience. Rooted in timeless aesthetics and inspired by the evolving world of
                fashion, our collections blend traditional influences, modern silhouettes, refined fabrics, and
                contemporary detailing to create styles that feel both culturally inspired and effortlessly global.
              </p>
              <p>
                From everyday essentials to statement pieces for special occasions, Shreem Lifestyle celebrates the
                perfect balance of heritage, modernity, and contemporary fashion.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 lg:py-32 px-4 sm:px-6 lg:px-10 bg-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="section-heading mb-8">Our Mission</h2>
          <p className="text-xl text-shreem-gray leading-relaxed mb-12">
            To celebrate and preserve India's rich textile heritage while creating contemporary designs that resonate
            with the modern individual. We strive to empower artisans, promote sustainable practices, and deliver
            exceptional quality in every piece we create.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16">
            {stats.map((s) => (
              <div key={s.label} className="text-center">
                <div className="text-4xl font-display font-bold text-shreem-gold mb-2">{s.value}</div>
                <p className="text-shreem-gray">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section ref={valuesRef} className="py-20 lg:py-32 px-4 sm:px-6 lg:px-10">
        <div className="text-center mb-16">
          <h2 className="section-heading mb-4">What We Stand For</h2>
          <p className="section-subheading max-w-xl mx-auto">Our values guide everything we do, from design to delivery</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {values.map((v) => (
            <div key={v.title} className="value-card bg-white p-8 rounded-lg shadow-sm hover:shadow-card transition-shadow duration-300">
              <v.icon className="w-10 h-10 text-shreem-gold mb-4" />
              <h3 className="text-lg font-semibold mb-2">{v.title}</h3>
              <p className="text-sm text-shreem-gray leading-relaxed">{v.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="py-20 lg:py-32 px-4 sm:px-6 lg:px-10 bg-white">
        <div className="max-w-3xl mx-auto">
          <h2 className="section-heading text-center mb-16">Our Journey</h2>
          <div className="space-y-8">
            {journey.map((item, i) => (
              <div key={item.year} className="flex items-start gap-6">
                <div className="flex-shrink-0 w-20 text-right">
                  <span className="text-xl font-display font-bold text-shreem-gold">{item.year}</span>
                </div>
                <div className="relative flex-shrink-0 w-4 h-4 mt-2">
                  <div className="absolute inset-0 bg-shreem-gold rounded-full" />
                  {i !== journey.length - 1 && (
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 w-0.5 h-12 bg-shreem-black/10" />
                  )}
                </div>
                <div className="flex-1 pb-8">
                  <p className="text-shreem-black">{item.event}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 lg:py-32 px-4 sm:px-6 lg:px-10">
        <div className="relative bg-shreem-black rounded-2xl overflow-hidden">
          <div className="absolute inset-0 opacity-20">
            <img src="/look_find_your_fit.jpg" alt="" className="w-full h-full object-cover" />
          </div>
          <div className="relative z-10 px-8 py-16 lg:py-24 text-center">
            <h2 className="text-3xl lg:text-4xl font-display font-bold text-white mb-4">Be Part of Our Story</h2>
            <p className="text-white/70 max-w-xl mx-auto mb-8">
              Explore our collection and discover the perfect blend of tradition and modernity.
            </p>
            <Link to="/collections" className="btn-gold inline-flex">
              Shop Now
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
