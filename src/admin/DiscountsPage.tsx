import { Trash2 } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import type { Coupon } from '../../shared/store'
import { supabase } from '../lib/supabase'
import { formatPrice } from '../lib/utils'
import { card, input } from './shared'

const emptyForm = { code: '', type: 'percent' as Coupon['type'], value: '', min_subtotal: '', max_uses: '', starts_at: '', ends_at: '' }

function couponStatus(c: Coupon) {
  const now = Date.now()
  if (!c.is_active) return { label: 'Off', tone: 'bg-gray-100 text-gray-600' }
  if (c.ends_at && Date.parse(c.ends_at) < now) return { label: 'Expired', tone: 'bg-gray-100 text-gray-600' }
  if (c.starts_at && Date.parse(c.starts_at) > now) return { label: 'Scheduled', tone: 'bg-blue-100 text-blue-800' }
  if (c.max_uses !== null && c.used_count >= c.max_uses) return { label: 'Used up', tone: 'bg-gray-100 text-gray-600' }
  return { label: 'Active', tone: 'bg-green-100 text-green-800' }
}

const describe = (c: Coupon) =>
  `${c.type === 'percent' ? `${c.value}% off` : `${formatPrice(c.value)} off`}${c.min_subtotal ? ` orders over ${formatPrice(c.min_subtotal)}` : ''}`

export default function DiscountsPage() {
  const [coupons, setCoupons] = useState<Coupon[] | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const load = () =>
    supabase
      .from('coupons')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data, error }) => (error ? setError(error.message) : setCoupons(data as Coupon[])))

  useEffect(() => {
    load()
  }, [])

  const set = (key: keyof typeof emptyForm, value: string) => setForm((f) => ({ ...f, [key]: value }))

  const create = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    const value = Number(form.value)
    if (!/^[A-Z0-9_-]{3,30}$/.test(form.code)) return setError('Code: 3–30 capital letters, numbers, - or _.')
    if (!Number.isInteger(value) || value <= 0) return setError('Discount must be a whole number.')
    if (form.type === 'percent' && value > 90) return setError('Percentage discounts can be at most 90%.')
    setBusy(true)
    const { error } = await supabase.from('coupons').insert({
      code: form.code,
      type: form.type,
      value,
      min_subtotal: Number(form.min_subtotal) || 0,
      max_uses: form.max_uses ? Number(form.max_uses) : null,
      starts_at: form.starts_at ? new Date(form.starts_at).toISOString() : null,
      ends_at: form.ends_at ? new Date(`${form.ends_at}T23:59:59`).toISOString() : null,
    })
    setBusy(false)
    if (error) return setError(error.code === '23505' ? 'A coupon with this code already exists.' : error.message)
    setForm(emptyForm)
    load()
  }

  const toggle = async (c: Coupon) => {
    await supabase.from('coupons').update({ is_active: !c.is_active }).eq('id', c.id)
    load()
  }

  const remove = async (c: Coupon) => {
    if (!confirm(`Delete coupon ${c.code}?`)) return
    await supabase.from('coupons').delete().eq('id', c.id)
    load()
  }

  return (
    <div>
      <h1 className="text-2xl font-display font-black tracking-tight">Discounts</h1>
      <p className="text-sm text-shreem-gray mt-1 mb-6">Coupon codes customers can enter at checkout.</p>

      <form onSubmit={create} className={`${card} p-5 mb-6`}>
        <h2 className="font-semibold mb-4">New coupon</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="col-span-2 md:col-span-1">
            <label htmlFor="code" className="text-xs font-medium">Code</label>
            <input id="code" required value={form.code} onChange={(e) => set('code', e.target.value.toUpperCase().replace(/\s/g, ''))} placeholder="DIWALI10" className={`${input} mt-1 uppercase`} />
          </div>
          <div>
            <label htmlFor="type" className="text-xs font-medium">Type</label>
            <select id="type" value={form.type} onChange={(e) => set('type', e.target.value)} className={`${input} mt-1`}>
              <option value="percent">% off</option>
              <option value="flat">₹ off</option>
            </select>
          </div>
          <div>
            <label htmlFor="value" className="text-xs font-medium">{form.type === 'percent' ? 'Percent' : 'Amount (₹)'}</label>
            <input id="value" type="number" min={1} required value={form.value} onChange={(e) => set('value', e.target.value)} className={`${input} mt-1`} />
          </div>
          <div>
            <label htmlFor="min" className="text-xs font-medium">Minimum order (₹)</label>
            <input id="min" type="number" min={0} value={form.min_subtotal} onChange={(e) => set('min_subtotal', e.target.value)} placeholder="0" className={`${input} mt-1`} />
          </div>
          <div>
            <label htmlFor="max" className="text-xs font-medium">Usage limit</label>
            <input id="max" type="number" min={1} value={form.max_uses} onChange={(e) => set('max_uses', e.target.value)} placeholder="Unlimited" className={`${input} mt-1`} />
          </div>
          <div>
            <label htmlFor="starts" className="text-xs font-medium">Starts</label>
            <input id="starts" type="date" value={form.starts_at} onChange={(e) => set('starts_at', e.target.value)} className={`${input} mt-1`} />
          </div>
          <div>
            <label htmlFor="ends" className="text-xs font-medium">Ends</label>
            <input id="ends" type="date" value={form.ends_at} onChange={(e) => set('ends_at', e.target.value)} className={`${input} mt-1`} />
          </div>
          <div className="flex items-end">
            <button type="submit" disabled={busy} className="btn-primary !px-5 !py-2 w-full disabled:opacity-60">
              {busy ? 'Saving…' : 'Create'}
            </button>
          </div>
        </div>
        {error && <p className="text-sm text-red-600 mt-3">{error}</p>}
      </form>

      <div className={`${card} overflow-x-auto`}>
        {coupons === null ? (
          <p className="p-8 text-center text-shreem-gray text-sm">Loading…</p>
        ) : coupons.length === 0 ? (
          <p className="p-8 text-center text-shreem-gray text-sm">No coupons yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wider text-shreem-gray border-b border-shreem-black/10">
              <tr>
                <th className="px-4 py-3 font-medium">Code</th>
                <th className="px-4 py-3 font-medium">Discount</th>
                <th className="px-4 py-3 font-medium">Used</th>
                <th className="px-4 py-3 font-medium">Valid</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-shreem-black/5">
              {coupons.map((c) => {
                const status = couponStatus(c)
                const day = (iso: string) => new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                return (
                  <tr key={c.id}>
                    <td className="px-4 py-3 font-mono font-medium">{c.code}</td>
                    <td className="px-4 py-3">{describe(c)}</td>
                    <td className="px-4 py-3 text-shreem-gray">
                      {c.used_count}
                      {c.max_uses !== null ? ` / ${c.max_uses}` : ''}
                    </td>
                    <td className="px-4 py-3 text-shreem-gray whitespace-nowrap">
                      {c.starts_at || c.ends_at
                        ? `${c.starts_at ? day(c.starts_at) : 'Now'} – ${c.ends_at ? day(c.ends_at) : 'no end'}`
                        : 'Always'}
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => toggle(c)} className={`px-2.5 py-1 rounded-full text-xs font-medium ${status.tone}`} title="Click to turn on/off">
                        {status.label}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => remove(c)} className="p-1.5 text-shreem-gray hover:text-red-600" aria-label={`Delete ${c.code}`}>
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
