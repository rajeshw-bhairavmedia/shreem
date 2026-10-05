import { lazy, Suspense, useCallback, useState } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import CartDrawer from './components/CartDrawer'
import Footer from './components/Footer'
import Navbar from './components/Navbar'
import ScrollToTop from './components/ScrollToTop'
import SearchOverlay from './components/SearchOverlay'
import WhatsAppButton from './components/WhatsAppButton'
import { CartProvider } from './context/CartContext'
import { CatalogProvider } from './context/CatalogContext'
import AboutPage from './pages/AboutPage'
import CheckoutPage from './pages/CheckoutPage'
import CollectionsPage from './pages/CollectionsPage'
import ContactPage from './pages/ContactPage'
import HomePage from './pages/HomePage'
import LookbookPage from './pages/LookbookPage'
import NotFoundPage from './pages/NotFoundPage'
import OrderConfirmedPage from './pages/OrderConfirmedPage'
import ProductPage from './pages/ProductPage'

// Loaded only when visiting /admin, so shoppers never download it.
const AdminApp = lazy(() => import('./admin/AdminApp'))

function Store() {
  const [searchOpen, setSearchOpen] = useState(false)
  const closeSearch = useCallback(() => setSearchOpen(false), [])

  return (
    <CatalogProvider>
      <CartProvider>
        <div className="relative min-h-screen bg-shreem-cream">
          <div className="grain-overlay" />
          <Navbar onSearch={() => setSearchOpen(true)} />
          <main>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/collections" element={<CollectionsPage />} />
              <Route path="/product/:id" element={<ProductPage />} />
              <Route path="/checkout" element={<CheckoutPage />} />
              <Route path="/order-confirmed" element={<OrderConfirmedPage />} />
              <Route path="/lookbook" element={<LookbookPage />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/contact" element={<ContactPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </main>
          <Footer />
          <WhatsAppButton />
          <CartDrawer />
          <SearchOverlay open={searchOpen} onClose={closeSearch} />
        </div>
      </CartProvider>
    </CatalogProvider>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <Routes>
        <Route
          path="/admin/*"
          element={
            <Suspense fallback={<div className="min-h-screen bg-shreem-cream" />}>
              <AdminApp />
            </Suspense>
          }
        />
        <Route path="*" element={<Store />} />
      </Routes>
    </BrowserRouter>
  )
}
