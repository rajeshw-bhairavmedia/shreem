import type { Session } from '@supabase/supabase-js'
import { LayoutDashboard, LogOut, MessageSquareText, Package, ShoppingBasket, ShoppingCart, Store, TicketPercent, Users } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Navigate, NavLink, Outlet, Route, Routes } from 'react-router-dom'
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

function AdminLayout({ email }: { email: string }) {
  const link = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
      isActive ? 'bg-shreem-black text-white' : 'text-shreem-black hover:bg-shreem-black/5'
    }`

  return (
    <div className="min-h-screen bg-shreem-cream print:bg-white">
      <header className="bg-white border-b border-shreem-black/10 sticky top-0 z-30 print:hidden">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center gap-4">
          <span className="font-display font-black text-lg tracking-tight mr-2 whitespace-nowrap">
            SHREEM <span className="text-shreem-gold font-semibold text-sm">Admin</span>
          </span>
          <nav className="flex gap-1 overflow-x-auto">
            <NavLink to="/admin" end className={link} title="Dashboard">
              <LayoutDashboard className="w-4 h-4" /> <span className="hidden xl:inline">Dashboard</span>
            </NavLink>
            <NavLink to="/admin/orders" className={link} title="Orders">
              <ShoppingCart className="w-4 h-4" /> <span className="hidden xl:inline">Orders</span>
            </NavLink>
            <NavLink to="/admin/products" className={link} title="Products">
              <Package className="w-4 h-4" /> <span className="hidden xl:inline">Products</span>
            </NavLink>
            <NavLink to="/admin/customers" className={link} title="Customers">
              <Users className="w-4 h-4" /> <span className="hidden xl:inline">Customers</span>
            </NavLink>
            <NavLink to="/admin/discounts" className={link} title="Discounts">
              <TicketPercent className="w-4 h-4" /> <span className="hidden xl:inline">Discounts</span>
            </NavLink>
            <NavLink to="/admin/carts" className={link} title="Carts">
              <ShoppingBasket className="w-4 h-4" /> <span className="hidden xl:inline">Carts</span>
            </NavLink>
            <NavLink to="/admin/reviews" className={link} title="Reviews">
              <MessageSquareText className="w-4 h-4" /> <span className="hidden xl:inline">Reviews</span>
            </NavLink>
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <a href="/" target="_blank" rel="noopener noreferrer" className="hidden sm:flex items-center gap-1 text-sm text-shreem-gray hover:text-shreem-black px-2">
              <Store className="w-4 h-4" /> <span className="hidden xl:inline whitespace-nowrap">View store</span>
            </a>
            <span className="hidden 2xl:inline text-xs text-shreem-gray">{email}</span>
            <button onClick={() => supabase.auth.signOut()} className="p-2 rounded-lg hover:bg-shreem-black/5" aria-label="Sign out" title="Sign out">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 py-8 print:p-0 print:max-w-none">
        <Outlet />
      </main>
    </div>
  )
}
