import gsap from 'gsap'
import { Clock, Mail, MapPin, MessageCircle, Phone, Send } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { FacebookIcon, InstagramIcon, LinkedinIcon } from '../components/SocialIcons'
import { site } from '../config/site'
import { formatPrice, formsEnabled, openWhatsApp, submitForm } from '../lib/utils'

const contactItems = [
  { icon: Phone, label: 'Phone', value: site.phone.display, href: site.phone.href },
  { icon: Mail, label: 'Email', value: site.email, href: `mailto:${site.email}` },
  {
    icon: MapPin,
    label: 'Address',
    value: site.address.full,
    href: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(site.address.full)}`,
  },
  { icon: Clock, label: 'Working Hours', value: site.hours },
]

// TODO: confirm these match your actual policies.
const faqs = [
  {
    q: 'What is your shipping policy?',
    a: `We offer free shipping on all orders above ${formatPrice(site.freeShippingAbove)}. Orders are typically delivered within 5-7 business days across India.`,
  },
  {
    q: 'How do I find my size?',
    a: 'Tap "Size Guide" on any product page to get personalised sizing help from us on WhatsApp.',
  },
  {
    q: 'What is your return policy?',
    a: 'We accept returns within 7 days of delivery for unused items with original tags. Contact us to start a return.',
  },
  {
    q: 'Do you offer customization?',
    a: 'Yes! We offer customization services for bulk orders and special occasions. Contact us for more information.',
  },
]

const emptyForm = { name: '', email: '', subject: '', message: '' }
const inputClass =
  'w-full h-12 px-4 rounded-lg border border-shreem-black/10 bg-white text-sm focus:outline-none focus:border-shreem-gold transition-colors'

export default function ContactPage() {
  const [form, setForm] = useState(emptyForm)
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'whatsapp' | 'error'>('idle')
  const infoRef = useRef<HTMLDivElement>(null)
  const formRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(infoRef.current, { x: -30, opacity: 0 }, { x: 0, opacity: 1, duration: 0.8, ease: 'power2.out' })
      gsap.fromTo(formRef.current, { x: 30, opacity: 0 }, { x: 0, opacity: 1, duration: 0.8, ease: 'power2.out', delay: 0.2 })
    })
    return () => ctx.revert()
  }, [])

  const update = (field: keyof typeof emptyForm) => (e: { target: { value: string } }) =>
    setForm({ ...form, [field]: e.target.value })

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!formsEnabled) {
      // No form service configured yet: deliver the message through WhatsApp.
      openWhatsApp(`Hi! I'm ${form.name} (${form.email}).\n\nSubject: ${form.subject}\n\n${form.message}`)
      setStatus('whatsapp')
      setForm(emptyForm)
      return
    }
    setStatus('sending')
    try {
      await submitForm({ ...form, _subject: `Website enquiry: ${form.subject}` })
      setStatus('sent')
      setForm(emptyForm)
    } catch {
      setStatus('error')
    }
  }

  return (
    <div className="pt-24 lg:pt-32 pb-20">
      <div className="px-4 sm:px-6 lg:px-10 mb-12">
        <h1 className="section-heading mb-4">Get in Touch</h1>
        <p className="section-subheading max-w-xl">
          Have a question about sizing, bulk orders, or stockists? We'd love to hear from you. We reply within 1-2
          business days.
        </p>
      </div>

      <div className="px-4 sm:px-6 lg:px-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16">
          <div ref={infoRef}>
            <div className="space-y-6 mb-10">
              {contactItems.map((item) => {
                const content = (
                  <>
                    <div className="w-12 h-12 bg-shreem-gold/10 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:bg-shreem-gold/20 transition-colors">
                      <item.icon className="w-5 h-5 text-shreem-gold" />
                    </div>
                    <div>
                      <p className="text-sm text-shreem-gray mb-1">{item.label}</p>
                      <p className="text-shreem-black font-medium group-hover:text-shreem-gold transition-colors">{item.value}</p>
                    </div>
                  </>
                )
                return item.href ? (
                  <a key={item.label} href={item.href} target={item.href.startsWith('http') ? '_blank' : undefined} rel="noopener noreferrer" className="flex items-start gap-4 group">
                    {content}
                  </a>
                ) : (
                  <div key={item.label} className="flex items-start gap-4">
                    {content}
                  </div>
                )
              })}
            </div>

            <div className="bg-shreem-black rounded-xl p-6 mb-10">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-[#25D366] rounded-full flex items-center justify-center">
                  <MessageCircle className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-white font-semibold">Chat on WhatsApp</h3>
                  <p className="text-white/60 text-sm">Get instant replies</p>
                </div>
              </div>
              <button
                onClick={() => openWhatsApp('Hi! I have a question about your products.')}
                className="w-full py-3 bg-[#25D366] text-white font-medium rounded-lg hover:bg-[#128C7E] transition-colors"
              >
                Start Chat
              </button>
            </div>

            <div>
              <h3 className="text-sm font-medium text-shreem-gray mb-4">Follow Us</h3>
              <div className="flex gap-3">
                {[
                  { href: site.social.instagram, Icon: InstagramIcon, label: 'Instagram' },
                  { href: site.social.facebook, Icon: FacebookIcon, label: 'Facebook' },
                  { href: site.social.linkedin, Icon: LinkedinIcon, label: 'LinkedIn' },
                ].map(({ href, Icon, label }) => (
                  <a
                    key={label}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={label}
                    className="w-12 h-12 bg-shreem-black/5 rounded-lg flex items-center justify-center hover:bg-shreem-gold/20 transition-colors"
                  >
                    <Icon className="w-5 h-5" />
                  </a>
                ))}
              </div>
            </div>
          </div>

          <div ref={formRef} className="bg-white rounded-xl p-6 lg:p-8 shadow-sm">
            <h2 className="text-xl font-semibold mb-6">Send a Message</h2>
            {status === 'sent' || status === 'whatsapp' ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-shreem-gold/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Send className="w-8 h-8 text-shreem-gold" />
                </div>
                <h3 className="text-xl font-semibold mb-2">{status === 'sent' ? 'Message Sent!' : 'Almost done!'}</h3>
                <p className="text-shreem-gray mb-6">
                  {status === 'sent'
                    ? "Thank you for reaching out. We'll get back to you soon."
                    : 'Your message is ready in WhatsApp. Tap send there and we will reply soon.'}
                </p>
                <button onClick={() => setStatus('idle')} className="btn-outline">
                  Send Another Message
                </button>
              </div>
            ) : (
              <form onSubmit={submit} className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <label htmlFor="name" className="text-sm font-medium">Name</label>
                    <input id="name" placeholder="Your name" value={form.name} onChange={update('name')} required className={inputClass} />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="email" className="text-sm font-medium">Email</label>
                    <input id="email" type="email" placeholder="your@email.com" value={form.email} onChange={update('email')} required className={inputClass} />
                  </div>
                </div>
                <div className="space-y-2">
                  <label htmlFor="subject" className="text-sm font-medium">Subject</label>
                  <input id="subject" placeholder="How can we help?" value={form.subject} onChange={update('subject')} required className={inputClass} />
                </div>
                <div className="space-y-2">
                  <label htmlFor="message" className="text-sm font-medium">Message</label>
                  <textarea
                    id="message"
                    placeholder="Tell us more about your inquiry..."
                    value={form.message}
                    onChange={update('message')}
                    required
                    rows={5}
                    className={`${inputClass} h-auto py-3 resize-none`}
                  />
                </div>
                {status === 'error' && (
                  <p className="text-sm text-red-600">Could not send your message. Please try again or reach us on WhatsApp.</p>
                )}
                <button
                  type="submit"
                  disabled={status === 'sending'}
                  className="w-full h-12 bg-shreem-black hover:bg-shreem-black/90 text-white rounded-full text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {status === 'sending' ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Send Message
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>

      <div className="mt-20 px-4 sm:px-6 lg:px-10">
        <div className="bg-shreem-black/5 rounded-xl overflow-hidden h-[400px] relative">
          <iframe
            src={site.mapEmbedUrl}
            width="100%"
            height="100%"
            style={{ border: 0 }}
            allowFullScreen
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            title={`${site.name} location`}
          />
          <div className="absolute bottom-4 left-4 bg-white rounded-lg p-4 shadow-lg max-w-xs">
            <h4 className="font-semibold mb-1">{site.name}</h4>
            <p className="text-sm text-shreem-gray">{site.address.full}</p>
          </div>
        </div>
      </div>

      <div id="faq" className="mt-20 px-4 sm:px-6 lg:px-10 scroll-mt-24">
        <div className="max-w-3xl mx-auto">
          <h2 className="section-heading text-center mb-12">Frequently Asked Questions</h2>
          <div className="space-y-4">
            {faqs.map((f) => (
              <div key={f.q} className="bg-white rounded-lg p-6 shadow-sm">
                <h3 className="font-semibold mb-2">{f.q}</h3>
                <p className="text-shreem-gray text-sm">{f.a}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
