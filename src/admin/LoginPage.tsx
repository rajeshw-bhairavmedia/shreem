import { useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const signIn = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setError(error.message === 'Invalid login credentials' ? 'Wrong email or password.' : error.message)
    setBusy(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-shreem-cream">
      <form onSubmit={signIn} className="w-full max-w-sm bg-white rounded-2xl shadow-sm p-8">
        <h1 className="font-display font-black text-2xl tracking-tight mb-1">SHREEM</h1>
        <p className="text-sm text-shreem-gray mb-8">Sign in to manage your store</p>
        <label htmlFor="email" className="text-sm font-medium">Email</label>
        <input
          id="email"
          type="email"
          required
          autoComplete="username"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full h-11 px-3 mt-1 mb-4 rounded-lg border border-shreem-black/15 focus:outline-none focus:border-shreem-gold"
        />
        <label htmlFor="password" className="text-sm font-medium">Password</label>
        <input
          id="password"
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full h-11 px-3 mt-1 mb-6 rounded-lg border border-shreem-black/15 focus:outline-none focus:border-shreem-gold"
        />
        {error && <p className="text-sm text-red-600 mb-4">{error}</p>}
        <button type="submit" disabled={busy} className="w-full btn-primary disabled:opacity-60">
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  )
}
