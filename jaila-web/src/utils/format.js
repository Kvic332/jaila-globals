export const fmt  = n => '₦' + Number(n).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
export const fmtD = d => d ? new Date(d).toLocaleDateString('en-NG', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'
export const today = () => new Date().toISOString().split('T')[0]

export const statusMeta = {
  paid:    { bg: '#D1FAE5', text: '#065F46', dot: '#10B981' },
  pending: { bg: '#FEF3C7', text: '#92400E', dot: '#F59E0B' },
  overdue: { bg: '#FEE2E2', text: '#991B1B', dot: '#EF4444' },
}
