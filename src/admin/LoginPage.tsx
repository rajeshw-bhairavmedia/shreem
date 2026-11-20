import { useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'

const inputClass =
  'w-full h-11 px-3 mt-1 rounded-lg border border-shreem-black/15 focus:outline-none focus:border-shreem-gold'

export default function LoginPage() {
  const [mode, setMode] = useState<'sign-in' | 'forgot' | 'sent'>('sign-in')
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

  const sendReset = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    // Supabase emails a one-time link to this page; the URL must be in Auth > URL Configuration > Redirect URLs.
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/admin/reset-password`,
    })
    setBusy(false)
    if (error) {
      return setError(
        error.status === 429 || error.code === 'over_email_send_rate_limit'
          ? 'Too many reset emails were requested. Please wait a few minutes and try again.'
          : error.message,
      )
    }
    // Same message whether or not the email has an account, so addresses can't be probed.
    setMode('sent')
  }

  const switchMode = (next: typeof mode) => {
    setError(null)
    setMode(next)
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-shreem-cream">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm p-8">
        <h1 className="font-display font-black text-2xl tracking-tight mb-1">SHREEM</h1>

        {mode === 'sign-in' && (
          <form onSubmit={signIn}>
            <p className="text-sm text-shreem-gray mb-8">Sign in to manage your store</p>
            <label htmlFor="email" className="text-sm font-medium">Email</label>
            <input
              id="email"
              type="email"
              required
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={`${inputClass} mb-4`}
            />
            <div className="flex items-center justify-between">
              <label htmlFor="password" className="text-sm font-medium">Password</label>
              <button type="button" onClick={() => switchMode('forgot')} className="text-xs text-shreem-gray hover:text-shreem-black underline">
                Forgot password?
              </button>
            </div>
            <input
              id="password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`${inputClass} mb-6`}
            />
            {error && <p className="text-sm text-red-600 mb-4">{error}</p>}
            <button type="submit" disabled={busy} className="w-full btn-primary disabled:opacity-60">
              {busy ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        )}

        {mode === 'forgot' && (
          <form onSubmit={sendReset}>
            <p className="text-sm text-shreem-gray mb-8">Enter your registered email and we&apos;ll send you a link to set a new password.</p>
            <label htmlFor="reset-email" className="text-sm font-medium">Email</label>
            <input
              id="reset-email"
              type="email"
              required
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={`${inputClass} mb-6`}
            />
            {error && <p className="text-sm text-red-600 mb-4">{error}</p>}
            <button type="submit" disabled={busy} className="w-full btn-primary disabled:opacity-60">
              {busy ? 'Sending…' : 'Send reset link'}
            </button>
            <button type="button" onClick={() => switchMode('sign-in')} className="w-full mt-4 text-sm text-shreem-gray hover:text-shreem-black">
              Back to sign in
            </button>
          </form>
        )}

        {mode === 'sent' && (
          <div>
            <p className="text-sm text-shreem-gray mb-6">
              If an account exists for <span className="font-medium text-shreem-black">{email.trim()}</span>, a password reset link
              is on its way. Check your inbox and spam folder. The link works once and expires after a while, so use it soon.
            </p>
            <button type="button" onClick={() => switchMode('sign-in')} className="w-full btn-primary">
              Back to sign in
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
