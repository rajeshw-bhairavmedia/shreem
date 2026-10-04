import { MessageCircle, X } from 'lucide-react'
import { useState } from 'react'
import { openWhatsApp } from '../lib/utils'

export default function WhatsAppButton() {
  const [open, setOpen] = useState(false)

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <div
        className={`absolute bottom-16 right-0 bg-white rounded-2xl shadow-card p-4 w-64 transition-all duration-300 ${
          open ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-4 pointer-events-none'
        }`}
      >
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-semibold text-shreem-black">Chat with us</span>
          <button onClick={() => setOpen(false)} className="p-1 hover:bg-shreem-black/5 rounded-full transition-colors" aria-label="Close">
            <X className="w-4 h-4 text-shreem-gray" />
          </button>
        </div>
        <p className="text-xs text-shreem-gray mb-4">
          Get instant replies on WhatsApp for product inquiries, sizing help, and orders.
        </p>
        <button
          onClick={() => openWhatsApp('Hi! I am interested in your collection. Can you share more details?')}
          className="w-full py-2.5 bg-[#25D366] text-white text-sm font-medium rounded-full hover:bg-[#128C7E] transition-colors flex items-center justify-center gap-2"
        >
          <MessageCircle className="w-4 h-4" />
          Start Chat
        </button>
      </div>
      <button
        onClick={() => setOpen(!open)}
        className="w-14 h-14 bg-[#25D366] text-white rounded-full shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 flex items-center justify-center"
        aria-label="Open WhatsApp chat"
      >
        <MessageCircle className="w-7 h-7" fill="currentColor" />
      </button>
    </div>
  )
}
