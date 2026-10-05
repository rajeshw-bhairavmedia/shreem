import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import type { Look } from '../data/lookbook'

gsap.registerPlugin(ScrollTrigger)

/** Full-screen lookbook panels that slide in as you scroll. */
export default function LookSections({ looks }: { looks: Look[] }) {
  const refs = useRef<(HTMLElement | null)[]>([])

  useEffect(() => {
    const ctx = gsap.context(() => {
      refs.current.forEach((section, i) => {
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
  }, [looks])

  return (
    <>
      {looks.map((look, i) => (
        <section
          key={look.headline}
          ref={(el) => {
            refs.current[i] = el
          }}
          className="relative min-h-screen w-full overflow-hidden flex items-center"
        >
          <div className="value-bg absolute inset-0">
            {/* Not lazy: these move with the scroll, so decode them before they arrive on screen. */}
            <img src={look.image} alt={look.headline} decoding="async" className="w-full h-full object-cover" />
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
            <Link to="/collections" className="btn-outline">
              {look.cta}
            </Link>
          </div>
        </section>
      ))}
    </>
  )
}
