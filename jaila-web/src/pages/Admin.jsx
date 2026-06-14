import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { C, Card, Badge, Empty } from '../components/ui'
import { fmt, fmtD } from '../utils/format'

async function fetchAdminData() {
  const { data, error } = await supabase.rpc('get_admin_stats')
  if (error) throw new Error(error.message)
  return data
}

function StatBox({ label, value, sub, color }) {
  return (
    <div style={{ background: C.white, border: `1px solid ${C.surface3}`, borderRadius: 12, padding: '18px 22px', flex: 1, minWidth: 150 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: C.ink4, textTransform: 'uppercase', letterSpacing: .6, marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 700, color: color ?? C.ink, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: C.ink4, marginTop: 4 }}>{sub}</div>}
    </div>
  )
}

export default function Admin() {
  const [data, setData]         = useState(null)
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState('')
  const [expanded, setExpanded] = useState(null)
  const [search, setSearch]     = useState('')
  const navigate = useNavigate()
  const isMobile = window.innerWidth < 768

  useEffect(() => {
    fetchAdminData()
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <div style={{ width: 40, height: 40, border: `3px solid ${C.surface3}`, borderTopColor: C.navy, borderRadius: '50%', animation: 'spin .7s linear infinite' }} />
    </div>
  )

  if (error) return (
    <div style={{ padding: 40, textAlign: 'center' }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>🔒</div>
      <div style={{ fontSize: 16, fontWeight: 700, color: C.ink, marginBottom: 8 }}>Access Denied</div>
      <div style={{ fontSize: 13, color: C.ink4 }}>You don't have admin privileges. Contact the system administrator.</div>
      <div style={{ fontSize: 11, color: C.rose2, marginTop: 12, background: C.rose, padding: '8px 14px', borderRadius: 8, display: 'inline-block' }}>{error}</div>
    </div>
  )

  const users   = data?.users_detail ?? []
  const recent  = data?.recent_invoices ?? []
  const filtered = users.filter(u =>
    (u.company_name ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (u.email ?? '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div style={{ padding: isMobile ? '20px 16px' : '32px 36px', maxWidth: 1200, animation: 'fadeIn .2s ease' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <span style={{ background: C.rose, color: C.rose2, fontSize: 10, fontWeight: 800, padding: '3px 8px', borderRadius: 6, textTransform: 'uppercase', letterSpacing: .6 }}>Admin Only</span>
          </div>
          <h1 style={{ fontSize: isMobile ? 20 : 24, fontWeight: 700, color: C.ink, fontFamily: "'DM Serif Display', serif" }}>System Overview</h1>
          <p style={{ fontSize: 13, color: C.ink4, marginTop: 3 }}>All users, invoices and revenue across Jaila Globals</p>
        </div>
        <div style={{ fontSize: 11, color: C.ink4, textAlign: 'right' }}>
          <div>Last updated</div>
          <div style={{ fontWeight: 600, color: C.ink }}>{new Date().toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' })}</div>
        </div>
      </div>

      {/* Top stats */}
      <div style={{ display: 'flex', gap: 14, marginBottom: 24, flexWrap: 'wrap' }}>
        <StatBox label="Total Users"    value={data?.total_users ?? 0}    sub="Registered accounts"          color={C.navy} />
        <StatBox label="Total Invoices" value={data?.total_invoices ?? 0} sub="Across all users"             color={C.ink}  />
        <StatBox label="Total Revenue"  value={fmt(data?.total_revenue ?? 0)} sub="Paid invoices only"       color={C.sage2} />
        <StatBox label="Outstanding"    value={fmt(data?.total_outstanding ?? 0)} sub="Pending + overdue"    color={C.rose2} />
        <StatBox label="Part Paid"      value={fmt(data?.total_part_paid ?? 0)} sub="Partially collected"    color="#5B21B6" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 380px', gap: 20 }}>
        {/* Users table */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: C.ink }}>All Users ({filtered.length})</h2>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search users…"
              style={{ padding: '7px 12px', border: `1.5px solid ${C.surface3}`, borderRadius: 8, fontSize: 13, color: C.ink, outline: 'none', fontFamily: 'Inter, sans-serif', width: 180 }} />
          </div>

          {filtered.length === 0
            ? <Empty icon="👥" title="No users yet" sub="Users appear here once they sign up" />
            : (
              <Card padding={0}>
                {filtered.map((user, i) => {
                  const isOpen = expanded === user.id
                  const invoices = user.invoices ?? []
                  const paidPct  = user.total_billed > 0 ? Math.round((user.total_paid / user.total_billed) * 100) : 0
                  return (
                    <div key={user.id}>
                      <div onClick={() => setExpanded(isOpen ? null : user.id)}
                        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: `1px solid ${C.surface3}`, cursor: 'pointer', background: isOpen ? C.surface2 : 'transparent', transition: 'background .1s' }}
                        onMouseEnter={e => { if (!isOpen) e.currentTarget.style.background = C.surface }}
                        onMouseLeave={e => { if (!isOpen) e.currentTarget.style.background = 'transparent' }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                          <div style={{ width: 40, height: 40, borderRadius: 10, background: C.navy, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700, color: C.gold, flexShrink: 0 }}>
                            {(user.company_name ?? user.email ?? '?').charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontSize: 14, fontWeight: 600, color: C.ink }}>{user.company_name ?? 'Unnamed'}</div>
                            <div style={{ fontSize: 12, color: C.ink4, marginTop: 1 }}>{user.email}</div>
                            {user.last_invoice_date && <div style={{ fontSize: 11, color: C.ink4 }}>Last active: {fmtD(user.last_invoice_date)}</div>}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: 14, fontWeight: 700, color: C.navy }}>{fmt(user.total_billed)}</div>
                          <div style={{ fontSize: 11, color: C.sage2, marginTop: 2 }}>{fmt(user.total_paid)} collected</div>
                          <div style={{ fontSize: 11, color: C.ink4 }}>{user.invoice_count} invoice{user.invoice_count !== 1 ? 's' : ''}</div>
                        </div>
                      </div>

                      {/* Expanded invoice list */}
                      {isOpen && (
                        <div style={{ background: '#F8FAFC', borderBottom: `1px solid ${C.surface3}` }}>
                          {/* Progress bar */}
                          <div style={{ padding: '12px 20px 0' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                              <span style={{ fontSize: 11, color: C.ink4 }}>Collection rate</span>
                              <span style={{ fontSize: 11, fontWeight: 700, color: C.ink }}>{paidPct}%</span>
                            </div>
                            <div style={{ height: 5, background: C.surface3, borderRadius: 3, overflow: 'hidden', marginBottom: 14 }}>
                              <div style={{ height: '100%', width: `${paidPct}%`, background: paidPct >= 80 ? '#10B981' : paidPct >= 40 ? C.gold : C.rose2, borderRadius: 3, transition: 'width .4s' }} />
                            </div>
                          </div>

                          {invoices.length === 0
                            ? <div style={{ padding: '12px 20px 14px', fontSize: 13, color: C.ink4 }}>No invoices yet</div>
                            : invoices.slice(0, 8).map(inv => (
                              <div key={inv.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 20px', borderTop: `1px solid ${C.surface3}` }}>
                                <div>
                                  <span style={{ fontSize: 13, fontWeight: 700, color: C.navy }}>{inv.invoice_num}</span>
                                  <span style={{ fontSize: 13, color: C.ink3, marginLeft: 10 }}>{inv.customer_name}</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                  <span style={{ fontSize: 13, fontWeight: 600, color: C.ink }}>{fmt(inv.total)}</span>
                                  <Badge status={inv.status} />
                                  <span style={{ fontSize: 11, color: C.ink4 }}>{fmtD(inv.invoice_date)}</span>
                                </div>
                              </div>
                            ))}
                          {invoices.length > 8 && (
                            <div style={{ padding: '10px 20px', fontSize: 12, color: C.ink4, fontStyle: 'italic' }}>
                              +{invoices.length - 8} more invoices
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </Card>
            )}
        </div>

        {/* Recent activity */}
        <div>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: C.ink, marginBottom: 14 }}>Recent Activity</h2>
          <Card padding={0}>
            {recent.length === 0
              ? <Empty icon="📋" title="No recent activity" />
              : recent.map((inv, i) => (
                <div key={inv.id} style={{ padding: '14px 18px', borderBottom: i < recent.length - 1 ? `1px solid ${C.surface3}` : 'none' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: C.navy }}>{inv.invoice_num}</div>
                      <div style={{ fontSize: 12, color: C.ink3, marginTop: 2 }}>{inv.customer_name}</div>
                      <div style={{ fontSize: 11, color: C.ink4, marginTop: 2 }}>by <strong>{inv.company_name ?? inv.owner_email}</strong></div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: C.ink }}>{fmt(inv.total)}</div>
                      <div style={{ marginTop: 4 }}><Badge status={inv.status} /></div>
                      <div style={{ fontSize: 10, color: C.ink4, marginTop: 4 }}>{fmtD(inv.invoice_date)}</div>
                    </div>
                  </div>
                </div>
              ))}
          </Card>
        </div>
      </div>
    </div>
  )
}
