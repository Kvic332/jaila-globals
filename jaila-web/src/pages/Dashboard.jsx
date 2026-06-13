import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { getDashboardStats, getInvoices, subscribeToInvoices } from '../lib/supabase'
import { C, Card, StatCard, Badge, Btn, Empty } from '../components/ui'
import { fmt, fmtD } from '../utils/format'

const QUOTES = [
  { text: "Success is not final, failure is not fatal: it is the courage to continue that counts.", author: "Winston Churchill" },
  { text: "The secret of getting ahead is getting started.", author: "Mark Twain" },
  { text: "It always seems impossible until it's done.", author: "Nelson Mandela" },
  { text: "Don't watch the clock; do what it does. Keep going.", author: "Sam Levenson" },
  { text: "Your most unhappy customers are your greatest source of learning.", author: "Bill Gates" },
  { text: "The best way to predict the future is to create it.", author: "Peter Drucker" },
  { text: "An entrepreneur is someone who jumps off a cliff and builds a plane on the way down.", author: "Reid Hoffman" },
  { text: "Chase the vision, not the money; the money will end up following you.", author: "Tony Hsieh" },
  { text: "The way to get started is to quit talking and begin doing.", author: "Walt Disney" },
  { text: "In business, what's dangerous is not to evolve.", author: "Jeff Bezos" },
  { text: "Do not be embarrassed by your failures. Learn from them and start again.", author: "Richard Branson" },
  { text: "Success usually comes to those who are too busy to be looking for it.", author: "Henry David Thoreau" },
]

function QuoteCard({ isMobile }) {
  const [idx, setIdx] = useState(() => Math.floor(Math.random() * QUOTES.length))
  const q = QUOTES[idx]
  return (
    <div style={{
      background: `linear-gradient(135deg, #1E3A5F 0%, ${C.navy} 100%)`,
      borderRadius: 16, padding: isMobile ? '18px 18px' : '22px 28px',
      marginBottom: 20, position: 'relative', overflow: 'hidden',
    }}>
      <div style={{ position: 'absolute', top: -20, right: -10, fontSize: 100, opacity: .05, lineHeight: 1 }}>"</div>
      <div style={{ fontSize: 11, fontWeight: 700, color: C.gold, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>Daily Motivation</div>
      <p style={{ fontSize: isMobile ? 14 : 15, color: C.white, fontStyle: 'italic', lineHeight: 1.6, marginBottom: 10, fontFamily: "'DM Serif Display', serif" }}>"{q.text}"</p>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 12, color: 'rgba(255,255,255,.5)' }}>— {q.author}</span>
        <button onClick={() => setIdx(i => (i + 1) % QUOTES.length)}
          style={{ background: 'rgba(255,255,255,.1)', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,.6)', fontSize: 11, padding: '5px 12px', borderRadius: 20, fontWeight: 600 }}>
          Next →
        </button>
      </div>
    </div>
  )
}

function DueDateAlerts({ invoices, navigate, isMobile }) {
  const today = new Date(); today.setHours(0,0,0,0)
  const alerts = invoices.filter(inv => {
    if (!inv.due || ['paid'].includes(inv.status)) return false
    const due = new Date(inv.due); due.setHours(0,0,0,0)
    const days = Math.ceil((due - today) / 86400000)
    return days <= 3
  }).map(inv => {
    const due = new Date(inv.due); due.setHours(0,0,0,0)
    const days = Math.ceil((due - today) / 86400000)
    return { ...inv, daysLeft: days }
  }).sort((a, b) => a.daysLeft - b.daysLeft)

  if (!alerts.length) return null
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: C.ink4, textTransform: 'uppercase', letterSpacing: .6, marginBottom: 10 }}>Due Date Alerts</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {alerts.map(inv => {
          const overdue = inv.daysLeft < 0
          const today0  = inv.daysLeft === 0
          const bg   = overdue ? C.rose   : today0 ? C.amber : '#EDE9FE'
          const text = overdue ? C.rose2  : today0 ? C.amber2 : '#5B21B6'
          const label = overdue ? `${Math.abs(inv.daysLeft)}d overdue` : today0 ? 'Due today' : `Due in ${inv.daysLeft}d`
          return (
            <div key={inv.id} onClick={() => navigate(`/invoice/${inv.id}`, { state: { invoice: inv } })}
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: bg, borderRadius: 10, cursor: 'pointer', border: `1px solid ${text}22` }}>
              <div>
                <span style={{ fontSize: 13, fontWeight: 700, color: text }}>{inv.num}</span>
                <span style={{ fontSize: 13, color: text, marginLeft: 10 }}>{inv.customer.name}</span>
              </div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: text }}>{fmt(inv.total)}</span>
                <span style={{ fontSize: 11, fontWeight: 700, background: text, color: '#fff', padding: '2px 8px', borderRadius: 10 }}>{label}</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function Dashboard() {
  const [stats, setStats]     = useState({ total: 0, paid: 0, pending: 0, overdue: 0, partPaid: 0, revenue: 0 })
  const [recent, setRecent]   = useState([])
  const [allInvs, setAllInvs] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [s, invs] = await Promise.all([getDashboardStats(), getInvoices()])
      setStats(s)
      setAllInvs(invs)
      setRecent(invs.slice(0, 8))
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])
  useEffect(() => { return subscribeToInvoices(() => load()) }, [load])

  const month    = new Date().toLocaleDateString('en-NG', { month: 'long', year: 'numeric' })
  const isMobile = window.innerWidth < 768

  return (
    <div style={{ padding: isMobile ? '20px 16px' : '32px 36px', maxWidth: 1100, animation: 'fadeIn .2s ease' }}>
      {/* Page header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: isMobile ? 20 : 22, fontWeight: 700, color: C.ink, fontFamily: "'DM Serif Display', serif" }}>Dashboard</h1>
          <p style={{ fontSize: 13, color: C.ink4, marginTop: 3 }}>{month}</p>
        </div>
        <Btn variant="primary" icon="+" onClick={() => navigate('/new')}>{isMobile ? 'New' : 'New Invoice'}</Btn>
      </div>

      {/* Motivational quote */}
      <QuoteCard isMobile={isMobile} />

      {/* Due date alerts */}
      <DueDateAlerts invoices={allInvs} navigate={navigate} isMobile={isMobile} />

      {/* Stats grid */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
        <StatCard label="Total Invoices" value={stats.total} icon="📄" />
        <StatCard label="Paid" value={stats.paid} accent={C.sage2} icon="✅" />
        <StatCard label="Part Paid" value={stats.partPaid} accent="#5B21B6" icon="🔄" />
        <StatCard label="Pending" value={stats.pending} accent={C.amber2} icon="⏳" />
        <StatCard label="Overdue" value={stats.overdue} accent={C.rose2} icon="⚠️" />
        <StatCard label="Revenue (Paid)" value={loading ? '—' : fmt(stats.revenue)} accent={C.navy} icon="💰" />
      </div>

      {/* Quick create */}
      <div onClick={() => navigate('/new')}
        style={{ background: `linear-gradient(135deg, ${C.navy} 0%, #1E3A5F 100%)`, borderRadius: 16, padding: isMobile ? '16px 18px' : '22px 28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, cursor: 'pointer', transition: 'transform .15s', boxShadow: '0 4px 20px rgba(10,22,40,.2)' }}
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
            : isMobile
              ? recent.map(inv => (
                  <div key={inv.id} onClick={() => navigate(`/invoice/${inv.id}`, { state: { invoice: inv } })}
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderBottom: `1px solid ${C.surface3}`, cursor: 'pointer' }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: C.navy }}>{inv.num}</div>
                      <div style={{ fontSize: 13, color: C.ink, marginTop: 2 }}>{inv.customer.name}</div>
                      <div style={{ fontSize: 11, color: C.ink4, marginTop: 2 }}>{fmtD(inv.date)}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: C.ink }}>{fmt(inv.total)}</div>
                      <div style={{ marginTop: 4 }}><Badge status={inv.status} /></div>
                    </div>
                  </div>
                ))
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
