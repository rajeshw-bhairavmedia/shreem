import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const MIN_LENGTH = 8
const field =
  'w-full h-11 px-3 mt-1 rounded-lg border border-shreem-black/15 focus:outline-none focus:border-shreem-gold'

/** Reads an error Supabase puts in the reset link, e.g. #error_code=otp_expired&error_description=... */
function linkError(): string | null {
  const params = new URLSearchParams(window.location.hash.slice(1) || window.location.search.slice(1))
  if (!params.get('error') && !params.get('error_code')) return null
  return params.get('error_code') === 'otp_expired'
    ? 'This reset link has expired or was already used.'
    : (params.get('error_description')?.replace(/\+/g, ' ') ?? 'This reset link is not valid.')
}

/**
 * Opened from the password reset email. Supabase signs the user in from the
 * link's one-time token; they then choose a new password here.
 */
export default function ResetPasswordPage() {
  const [stage, setStage] = useState<'checking' | 'ready' | 'invalid' | 'done'>('checking')
  const [invalidReason, setInvalidReason] = useState<string | null>(null)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const reason = linkError()
    if (reason) {
      setInvalidReason(reason)
      setStage('invalid')
      return
    }
    let settled = false
    const ready = () => {
      settled = true
      setStage((s) => (s === 'checking' ? 'ready' : s))
    }
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN' || event === 'INITIAL_SESSION')) ready()
    })
    supabase.auth.getSession().then(({ data: { session } }) => session && ready())
    // No session from the link after a few seconds: the link is invalid or was opened twice.
    const t = setTimeout(() => {
      if (!settled) {
        setInvalidReason('This reset link is not valid or has expired.')
        setStage((s) => (s === 'checking' ? 'invalid' : s))
      }
    }, 4000)
    return () => {
      clearTimeout(t)
      data.subscription.unsubscribe()
    }
  }, [])

  const save = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    if (password.length < MIN_LENGTH) return setError(`Use at least ${MIN_LENGTH} characters.`)
    if (password !== confirm) return setError('The two passwords do not match.')
    setBusy(true)
    const { error } = await supabase.auth.updateUser({ password })
    setBusy(false)
    if (error) {
      if (error.code === 'same_password') return setError('Choose a password different from your old one.')
      if (error.code === 'weak_password') return setError('That password is too weak. Try a longer one with a mix of characters.')
      if (error.code === 'session_not_found' || error.status === 401) {
        setInvalidReason('Your reset session has ended. Please request a new link.')
        return setStage('invalid')
      }
      return setError(error.message)
    }
    setStage('done')
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-shreem-cream">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm p-8">
        <h1 className="font-display font-black text-2xl tracking-tight mb-1">SHREEM</h1>

        {stage === 'checking' && <p className="text-sm text-shreem-gray">Checking your reset link…</p>}

        {stage === 'invalid' && (
          <>
            <p className="text-sm text-shreem-gray mb-6">{invalidReason}</p>
            <Link to="/admin" className="w-full btn-primary">Request a new link</Link>
          </>
        )}

        {stage === 'ready' && (
          <form onSubmit={save}>
            <p className="text-sm text-shreem-gray mb-8">Choose a new password</p>
            <label htmlFor="new-password" className="text-sm font-medium">New password</label>
            <input
              id="new-password"
              type="password"
              required
              minLength={MIN_LENGTH}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`${field} mb-4`}
            />
            <label htmlFor="confirm-password" className="text-sm font-medium">Confirm new password</label>
            <input
              id="confirm-password"
              type="password"
              required
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className={`${field} mb-2`}
            />
            <p className="text-xs text-shreem-gray mb-6">At least {MIN_LENGTH} characters.</p>
            {error && <p className="text-sm text-red-600 mb-4">{error}</p>}
            <button type="submit" disabled={busy} className="w-full btn-primary disabled:opacity-60">
              {busy ? 'Saving…' : 'Set new password'}
            </button>
          </form>
        )}

        {stage === 'done' && (
          <>
            <p className="text-sm text-shreem-gray mb-6">Your password has been changed. You are now signed in.</p>
            <Link to="/admin" replace className="w-full btn-primary">Go to dashboard</Link>
          </>
        )}
      </div>
    </div>
  )
}
