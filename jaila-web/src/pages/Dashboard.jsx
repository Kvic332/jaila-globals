import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { getDashboardStats, getInvoices, subscribeToInvoices } from '../lib/supabase'
import { C, Card, StatCard, Badge, Btn, Empty } from '../components/ui'
import { fmt, fmtD } from '../utils/format'

export default function Dashboard() {
  const [stats, setStats]   = useState({ total: 0, paid: 0, pending: 0, overdue: 0, revenue: 0 })
  const [recent, setRecent] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [s, invs] = await Promise.all([getDashboardStats(), getInvoices()])
      setStats(s)
      setRecent(invs.slice(0, 8))
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])
  useEffect(() => { return subscribeToInvoices(() => load()) }, [load])

  const month = new Date().toLocaleDateString('en-NG', { month: 'long', year: 'numeric' })

  return (
    <div style={{ padding: '32px 36px', maxWidth: 1100, animation: 'fadeIn .2s ease' }}>
      {/* Page header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: C.ink, fontFamily: "'DM Serif Display', serif" }}>Dashboard</h1>
          <p style={{ fontSize: 13, color: C.ink4, marginTop: 3 }}>{month}</p>
        </div>
        <Btn variant="primary" icon="+" onClick={() => navigate('/new')}>New Invoice</Btn>
      </div>

      {/* Stats row */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 28, flexWrap: 'wrap' }}>
        <StatCard label="Total Invoices" value={stats.total} icon="📄" />
        <StatCard label="Paid" value={stats.paid} accent={C.sage2} icon="✅" />
        <StatCard label="Pending" value={stats.pending} accent={C.amber2} icon="⏳" />
        <StatCard label="Overdue" value={stats.overdue} accent={C.rose2} icon="⚠️" />
        <StatCard label="Revenue (Paid)" value={loading ? '—' : fmt(stats.revenue)} accent={C.navy} icon="💰" />
      </div>

      {/* Quick create card */}
      <div onClick={() => navigate('/new')}
        style={{ background: `linear-gradient(135deg, ${C.navy} 0%, #1E3A5F 100%)`, borderRadius: 16, padding: '22px 28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28, cursor: 'pointer', transition: 'transform .15s, box-shadow .15s', boxShadow: '0 4px 20px rgba(10,22,40,.2)' }}
        onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
        onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
      >
        <div>
          <div style={{ fontSize: 17, fontWeight: 700, color: C.white }}>Create a new invoice</div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,.5)', marginTop: 4 }}>Add customer, line items, auto-calculate totals, export PDF</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 44, height: 44, background: C.gold, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>📄</div>
          <span style={{ fontSize: 22, color: C.gold }}>→</span>
        </div>
      </div>

      {/* Recent invoices */}
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: C.ink }}>Recent Invoices</h2>
          <Btn variant="ghost" size="sm" onClick={() => navigate('/history')}>View all →</Btn>
        </div>

        {loading && !recent.length
          ? <div style={{ textAlign: 'center', padding: 40, color: C.ink4 }}>Loading…</div>
          : recent.length === 0
            ? <Empty icon="📄" title="No invoices yet" sub="Tap 'New Invoice' to create your first one" />
            : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${C.surface3}` }}>
                    {['Invoice #', 'Customer', 'Date', 'Due', 'Total', 'Status', ''].map(h => (
                      <th key={h} style={{ textAlign: 'left', padding: '8px 12px', fontSize: 10, fontWeight: 700, color: C.ink4, textTransform: 'uppercase', letterSpacing: .6 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {recent.map(inv => (
                    <tr key={inv.id} onClick={() => navigate(`/invoice/${inv.id}`, { state: { invoice: inv } })}
                      style={{ borderBottom: `1px solid ${C.surface3}`, cursor: 'pointer', transition: 'background .1s' }}
                      onMouseEnter={e => e.currentTarget.style.background = C.surface2}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <td style={{ padding: '13px 12px', fontSize: 13, fontWeight: 700, color: C.navy }}>{inv.num}</td>
                      <td style={{ padding: '13px 12px', fontSize: 13, fontWeight: 500, color: C.ink }}>{inv.customer.name}</td>
                      <td style={{ padding: '13px 12px', fontSize: 13, color: C.ink3 }}>{fmtD(inv.date)}</td>
                      <td style={{ padding: '13px 12px', fontSize: 13, color: C.ink3 }}>{fmtD(inv.due)}</td>
                      <td style={{ padding: '13px 12px', fontSize: 13, fontWeight: 700, color: C.ink }}>{fmt(inv.total)}</td>
                      <td style={{ padding: '13px 12px' }}><Badge status={inv.status} /></td>
                      <td style={{ padding: '13px 12px', fontSize: 18, color: C.ink4 }}>›</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
      </Card>
    </div>
  )
}
