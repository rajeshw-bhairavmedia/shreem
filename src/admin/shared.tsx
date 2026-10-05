import type { OrderStatus } from '../../shared/store'

export const statusLabels: Record<OrderStatus, string> = {
  pending_payment: 'Awaiting payment',
  paid: 'To ship',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
}

const statusColors: Record<OrderStatus, string> = {
  pending_payment: 'bg-gray-100 text-gray-600',
  paid: 'bg-amber-100 text-amber-800',
  shipped: 'bg-blue-100 text-blue-800',
  delivered: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-700',
}

export function StatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap ${statusColors[status]}`}>
      {statusLabels[status]}
    </span>
  )
}

export const formatDate = (iso: string) =>
  new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })

export const card = 'bg-white rounded-xl shadow-sm'
export const input =
  'w-full h-10 px-3 rounded-lg border border-shreem-black/15 bg-white text-sm focus:outline-none focus:border-shreem-gold'
