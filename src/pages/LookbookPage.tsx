import gsap from 'gsap'
import { ArrowRight } from 'lucide-react'
import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import LookSections from '../components/LookSections'
import { looks } from '../data/lookbook'

export default function LookbookPage() {
  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo('.lookbook-intro', { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.9, ease: 'power2.out' })
    })
    return () => ctx.revert()
  }, [])

  return (
    <div>
      <section className="pt-32 lg:pt-40 pb-16 px-4 sm:px-6 lg:px-10 text-center">
        <div className="lookbook-intro max-w-2xl mx-auto">
          <h1 className="section-heading mb-4">Lookbook</h1>
          <p className="section-subheading">
            Seven ways to wear Shreem: heritage craft, modern silhouettes, made for every moment.
          </p>
        </div>
      </section>

      <LookSections looks={looks} />

      <section className="py-20 lg:py-32 px-4 text-center">
        <h2 className="section-heading mb-6">Find Your Look</h2>
        <Link to="/collections" className="btn-primary">
          Shop the Collection
          <ArrowRight className="w-4 h-4 ml-2" />
        </Link>
      </section>
    </div>
  )
}
