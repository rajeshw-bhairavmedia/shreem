import type { Session } from '@supabase/supabase-js'
import { LayoutDashboard, LogOut, Menu, MessageSquareText, Package, ShoppingBasket, ShoppingCart, Store, TicketPercent, Users, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Navigate, NavLink, Outlet, Route, Routes, useLocation } from 'react-router-dom'
import { supabase, supabaseEnabled } from '../lib/supabase'
import AbandonedCartsPage from './AbandonedCartsPage'
import CustomersPage from './CustomersPage'
import DashboardPage from './DashboardPage'
import DiscountsPage from './DiscountsPage'
import InvoicePage from './InvoicePage'
import LoginPage from './LoginPage'
import OrderDetailPage from './OrderDetailPage'
import OrdersPage from './OrdersPage'
import ProductFormPage from './ProductFormPage'
import ProductsPage from './ProductsPage'
import ResetPasswordPage from './ResetPasswordPage'
import ReviewsPage from './ReviewsPage'

type AuthState = 'loading' | 'signed-out' | 'not-admin' | 'admin'

function useAdminAuth() {
  const [state, setState] = useState<AuthState>('loading')
  const [email, setEmail] = useState('')

  useEffect(() => {
    if (!supabaseEnabled) return
    const check = async (session: Session | null) => {
      if (!session) return setState('signed-out')
      setEmail(session.user.email ?? '')
      const { data } = await supabase.rpc('is_admin')
      setState(data ? 'admin' : 'not-admin')
    }
    supabase.auth.getSession().then(({ data }) => check(data.session))
    // Defer: Supabase recommends not awaiting other calls inside this callback.
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setTimeout(() => check(session), 0)
    })
    return () => data.subscription.unsubscribe()
  }, [])

  return { state, email }
}

function Centered({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen flex items-center justify-center px-4 bg-shreem-cream text-center">{children}</div>
}

export default function AdminApp() {
  const { state, email } = useAdminAuth()
  const { pathname } = useLocation()

  if (!supabaseEnabled) {
    return (
      <Centered>
        <div className="max-w-md">
          <h1 className="text-2xl font-display font-black mb-3">Admin not set up yet</h1>
          <p className="text-shreem-gray">Add your Supabase keys to the environment (see README) to use the admin panel.</p>
        </div>
      </Centered>
    )
  }
  // Opened from the reset email: works signed out or during the one-time recovery session.
  if (pathname.replace(/\/$/, '') === '/admin/reset-password') return <ResetPasswordPage />
  if (state === 'loading') return <Centered><p className="text-shreem-gray">Loading…</p></Centered>
  if (state === 'signed-out') return <LoginPage />
  if (state === 'not-admin') {
    return (
      <Centered>
        <div className="max-w-md">
          <h1 className="text-2xl font-display font-black mb-3">No admin access</h1>
          <p className="text-shreem-gray mb-6">{email} is signed in but is not an admin. See README → "Create your admin login".</p>
          <button onClick={() => supabase.auth.signOut()} className="btn-outline">Sign out</button>
        </div>
      </Centered>
    )
  }

  return (
    <Routes>
      <Route element={<AdminLayout email={email} />}>
        <Route index element={<DashboardPage />} />
        <Route path="orders" element={<OrdersPage />} />
        <Route path="orders/:id" element={<OrderDetailPage />} />
        <Route path="orders/:id/invoice" element={<InvoicePage />} />
        <Route path="customers" element={<CustomersPage />} />
        <Route path="discounts" element={<DiscountsPage />} />
        <Route path="carts" element={<AbandonedCartsPage />} />
        <Route path="reviews" element={<ReviewsPage />} />
        <Route path="products" element={<ProductsPage />} />
        <Route path="products/new" element={<ProductFormPage />} />
        <Route path="products/:id" element={<ProductFormPage />} />
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Route>
    </Routes>
  )
}

const navGroups = [
  {
    title: 'Store',
    items: [
      { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
      { to: '/admin/orders', label: 'Orders', icon: ShoppingCart, badge: 'toShip' as const },
      { to: '/admin/products', label: 'Products', icon: Package },
      { to: '/admin/customers', label: 'Customers', icon: Users },
    ],
  },
  {
    title: 'Marketing',
    items: [
      { to: '/admin/discounts', label: 'Discounts', icon: TicketPercent },
      { to: '/admin/carts', label: 'Abandoned carts', icon: ShoppingBasket },
      { to: '/admin/reviews', label: 'Reviews', icon: MessageSquareText, badge: 'pendingReviews' as const },
    ],
  },
]

type Badges = { toShip: number; pendingReviews: number }

/** Counts shown next to Orders (to ship) and Reviews (waiting for approval). */
function useBadges(pathname: string): Badges {
  const [badges, setBadges] = useState<Badges>({ toShip: 0, pendingReviews: 0 })
  useEffect(() => {
    Promise.all([
      supabase.from('orders').select('id', { count: 'exact', head: true }).eq('status', 'paid'),
      supabase.from('reviews').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    ]).then(([orders, reviews]) => setBadges({ toShip: orders.count ?? 0, pendingReviews: reviews.count ?? 0 }))
  }, [pathname])
  return badges
}

function Sidebar({ email, badges, onNavigate }: { email: string; badges: Badges; onNavigate?: () => void }) {
  const link = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
      isActive ? 'bg-shreem-black text-white' : 'text-shreem-black/80 hover:bg-shreem-black/5 hover:text-shreem-black'
    }`

  return (
    <div className="flex flex-col h-full">
      <div className="px-5 h-16 flex items-center border-b border-shreem-black/10">
        <span className="font-display font-black text-lg tracking-tight whitespace-nowrap">
          SHREEM <span className="text-shreem-gold font-semibold text-sm">Admin</span>
        </span>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6" aria-label="Admin">
        {navGroups.map((group) => (
          <div key={group.title}>
            <p className="px-3 mb-2 text-[11px] font-semibold uppercase tracking-wider text-shreem-gray">{group.title}</p>
            <div className="space-y-1">
              {group.items.map((item) => {
                const count = 'badge' in item && item.badge ? badges[item.badge] : 0
                return (
                  <NavLink key={item.to} to={item.to} end={'end' in item} className={link} onClick={onNavigate}>
                    <item.icon className="w-4 h-4 flex-shrink-0" />
                    <span className="flex-1">{item.label}</span>
                    {count > 0 && (
                      <span className="min-w-5 h-5 px-1.5 rounded-full bg-shreem-gold text-shreem-black text-[11px] font-semibold flex items-center justify-center">
                        {count}
                      </span>
                    )}
                  </NavLink>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-shreem-black/10 px-3 py-4 space-y-1">
        <a
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-shreem-black/80 hover:bg-shreem-black/5"
        >
          <Store className="w-4 h-4" /> View store
        </a>
        <button
          onClick={() => supabase.auth.signOut()}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-shreem-black/80 hover:bg-shreem-black/5"
        >
          <LogOut className="w-4 h-4" /> Sign out
        </button>
        <p className="px-3 pt-2 text-xs text-shreem-gray truncate" title={email}>
          {email}
        </p>
      </div>
    </div>
  )
}

function AdminLayout({ email }: { email: string }) {
  const { pathname } = useLocation()
  const badges = useBadges(pathname)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => setMenuOpen(false), [pathname])

  return (
    <div className="min-h-screen bg-shreem-cream print:bg-white lg:flex">
      {/* Sidebar: fixed on large screens */}
      <aside className="hidden lg:block w-60 flex-shrink-0 bg-white border-r border-shreem-black/10 h-screen sticky top-0 print:hidden">
        <Sidebar email={email} badges={badges} />
      </aside>

      {/* Small screens: top bar + slide-in sidebar */}
      <header className="lg:hidden sticky top-0 z-30 bg-white border-b border-shreem-black/10 h-14 flex items-center gap-3 px-4 print:hidden">
        <button onClick={() => setMenuOpen(true)} className="p-2 -ml-2 rounded-lg hover:bg-shreem-black/5" aria-label="Open menu">
          <Menu className="w-5 h-5" />
        </button>
        <span className="font-display font-black tracking-tight">
          SHREEM <span className="text-shreem-gold font-semibold text-sm">Admin</span>
        </span>
        {badges.toShip > 0 && (
          <span className="ml-auto text-xs font-medium bg-shreem-gold/20 rounded-full px-2.5 py-1">{badges.toShip} to ship</span>
        )}
      </header>
      <div
        className={`lg:hidden fixed inset-0 z-40 transition-opacity duration-300 print:hidden ${
          menuOpen ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none'
        }`}
      >
        <div className="absolute inset-0 bg-shreem-black/30" onClick={() => setMenuOpen(false)} />
        <aside
          className={`absolute top-0 left-0 h-full w-64 bg-white shadow-2xl transition-transform duration-300 ${
            menuOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <button onClick={() => setMenuOpen(false)} className="absolute top-4 right-3 p-2 rounded-lg hover:bg-shreem-black/5" aria-label="Close menu">
            <X className="w-4 h-4" />
          </button>
          <Sidebar email={email} badges={badges} onNavigate={() => setMenuOpen(false)} />
        </aside>
      </div>

      <main className="flex-1 min-w-0 px-4 sm:px-6 lg:px-10 py-8 print:p-0">
        <div className="max-w-6xl mx-auto print:max-w-none">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
