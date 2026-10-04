import { Mail, MapPin, Phone } from 'lucide-react'
import { Link } from 'react-router-dom'
import { site } from '../config/site'
import { FacebookIcon, InstagramIcon } from './SocialIcons'

const footerLinks = {
  Shop: [
    { label: 'All Collections', href: '/collections' },
    { label: 'Men', href: '/collections?category=men' },
    { label: 'Women', href: '/collections?category=women' },
    { label: 'Occasion Wear', href: '/collections?category=occasion' },
    { label: 'New Arrivals', href: '/collections?filter=new' },
    { label: 'Best Sellers', href: '/collections?filter=bestseller' },
    { label: 'Sale', href: '/collections?filter=sale' },
  ],
  Company: [
    { label: 'About Us', href: '/about' },
    { label: 'Our Story', href: '/about#story' },
  ],
  Support: [
    { label: 'Contact Us', href: '/contact' },
    { label: 'FAQs', href: '/contact#faq' },
    { label: 'Shipping Info', href: '/contact#faq' },
    { label: 'Returns', href: '/contact#faq' },
  ],
}

const iconLink =
  'w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-shreem-gold transition-colors'

export default function Footer() {
  return (
    <footer className="bg-shreem-black text-white">
      <div className="px-4 sm:px-6 lg:px-10 py-16 lg:py-20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-12 lg:gap-8">
          <div className="lg:col-span-2">
            <Link to="/" className="inline-block mb-6">
              <span className="text-3xl font-display font-black tracking-tight">SHREEM</span>
            </Link>
            <p className="text-white/60 text-sm leading-relaxed mb-6 max-w-sm">
              Premium fashion bringing together timeless heritage, rich culture, and contemporary global trends.
            </p>
            <div className="flex gap-4">
              <a href={site.social.instagram} target="_blank" rel="noopener noreferrer" className={iconLink} aria-label="Instagram">
                <InstagramIcon className="w-5 h-5" />
              </a>
              <a href={site.social.facebook} target="_blank" rel="noopener noreferrer" className={iconLink} aria-label="Facebook">
                <FacebookIcon className="w-5 h-5" />
              </a>
              <a href={`mailto:${site.email}`} className={iconLink} aria-label="Email">
                <Mail className="w-5 h-5" />
              </a>
            </div>
          </div>

          {Object.entries(footerLinks).map(([title, links]) => (
            <div key={title}>
              <h3 className="text-sm font-semibold tracking-wider uppercase mb-6">{title}</h3>
              <ul className="space-y-3">
                {links.map((link) => (
                  <li key={link.label}>
                    <Link to={link.href} className="text-white/60 text-sm hover:text-shreem-gold transition-colors">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-16 pt-8 border-t border-white/10">
          <div className="flex flex-wrap gap-6 lg:gap-12 justify-center lg:justify-start">
            <a href={site.phone.href} className="flex items-center gap-2 text-white/60 text-sm hover:text-shreem-gold transition-colors">
              <Phone className="w-4 h-4" />
              <span>{site.phone.display}</span>
            </a>
            <a href={`mailto:${site.email}`} className="flex items-center gap-2 text-white/60 text-sm hover:text-shreem-gold transition-colors">
              <Mail className="w-4 h-4" />
              <span>{site.email}</span>
            </a>
            <div className="flex items-center gap-2 text-white/60 text-sm">
              <MapPin className="w-4 h-4" />
              <span>{site.address.short}</span>
            </div>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-white/10 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-white/40 text-xs">
            © {new Date().getFullYear()} {site.name}. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}
