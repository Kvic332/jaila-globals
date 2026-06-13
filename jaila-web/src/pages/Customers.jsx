import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getInvoices } from '../lib/supabase'
import { C, Card, Badge, Btn, Empty } from '../components/ui'
import { fmt, fmtD } from '../utils/format'

export default function Customers() {
  const [customers, setCustomers] = useState([])
  const [search, setSearch]       = useState('')
  const [selected, setSelected]   = useState(null)
  const [loading, setLoading]     = useState(true)
  const navigate = useNavigate()
  const isMobile = window.innerWidth < 768

  useEffect(() => {
    getInvoices().then(invs => {
      const map = {}
      invs.forEach(inv => {
        const id = inv.customer.name.toLowerCase().trim()
        if (!map[id]) map[id] = { ...inv.customer, invoices: [], total: 0, paid: 0 }
        map[id].invoices.push(inv)
        map[id].total += inv.total
        if (inv.status === 'paid') map[id].paid += inv.total
      })
      setCustomers(Object.values(map).sort((a, b) => b.total - a.total))
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const filtered = customers.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.email ?? '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div style={{ padding: isMobile ? '20px 16px' : '32px 36px', maxWidth: 1100, animation: 'fadeIn .2s ease' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: isMobile ? 20 : 22, fontWeight: 700, color: C.ink, fontFamily: "'DM Serif Display', serif" }}>Customers</h1>
          <p style={{ fontSize: 13, color: C.ink4, marginTop: 3 }}>{customers.length} customers found</p>
        </div>
      </div>

      {/* Search */}
      <div style={{ marginBottom: 20 }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or email…"
          style={{ width: '100%', padding: '10px 14px', border: `1.5px solid ${C.surface3}`, borderRadius: 10, fontSize: 14, color: C.ink, outline: 'none', fontFamily: 'Inter, sans-serif', background: C.white }} />
      </div>

      {loading
        ? <div style={{ textAlign: 'center', padding: 60, color: C.ink4 }}>Loading…</div>
        : filtered.length === 0
          ? <Empty icon="👥" title="No customers yet" sub="Customers appear here after you create invoices" />
          : (
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : selected ? '1fr 1fr' : '1fr', gap: 16 }}>
              {/* Customer list */}
              <Card padding={0}>
                {filtered.map((c, i) => (
                  <div key={i} onClick={() => setSelected(selected?.name === c.name ? null : c)}
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: i < filtered.length - 1 ? `1px solid ${C.surface3}` : 'none', cursor: 'pointer', background: selected?.name === c.name ? C.surface2 : 'transparent', transition: 'background .1s' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                      <div style={{ width: 42, height: 42, borderRadius: 12, background: C.navy, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700, color: C.gold, flexShrink: 0 }}>
                        {c.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: C.ink }}>{c.name}</div>
                        <div style={{ fontSize: 12, color: C.ink4, marginTop: 2 }}>{c.email || c.phone || 'No contact info'}</div>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: C.navy }}>{fmt(c.total)}</div>
                      <div style={{ fontSize: 11, color: C.ink4, marginTop: 2 }}>{c.invoices.length} invoice{c.invoices.length !== 1 ? 's' : ''}</div>
                    </div>
                  </div>
                ))}
              </Card>

              {/* Customer detail panel */}
              {selected && (
                <div>
                  <Card style={{ marginBottom: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                      <div>
                        <div style={{ fontSize: 17, fontWeight: 700, color: C.ink }}>{selected.name}</div>
                        {selected.email && <div style={{ fontSize: 13, color: C.ink4, marginTop: 3 }}>{selected.email}</div>}
                        {selected.phone && <div style={{ fontSize: 13, color: C.ink4 }}>{selected.phone}</div>}
                        {selected.address && <div style={{ fontSize: 12, color: C.ink4, marginTop: 4, lineHeight: 1.5 }}>{selected.address}</div>}
                      </div>
                      <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: C.ink4 }}>×</button>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      {[
                        ['Total Billed', fmt(selected.total)],
                        ['Total Paid', fmt(selected.paid)],
                        ['Invoices', selected.invoices.length],
                        ['Balance', fmt(selected.total - selected.paid)],
                      ].map(([l, v]) => (
                        <div key={l} style={{ background: C.surface2, borderRadius: 8, padding: '10px 12px' }}>
                          <div style={{ fontSize: 10, fontWeight: 700, color: C.ink4, textTransform: 'uppercase', letterSpacing: .5, marginBottom: 4 }}>{l}</div>
                          <div style={{ fontSize: 15, fontWeight: 700, color: C.ink }}>{v}</div>
                        </div>
                      ))}
                    </div>
                    <div style={{ marginTop: 14 }}>
                      <Btn variant="primary" icon="➕" onClick={() => navigate('/new')} style={{ width: '100%' }}>New Invoice for {selected.name}</Btn>
                    </div>
                  </Card>

                  <Card padding={0}>
                    <div style={{ padding: '14px 18px', borderBottom: `1px solid ${C.surface3}`, fontSize: 13, fontWeight: 700, color: C.ink }}>Invoice History</div>
                    {selected.invoices.map(inv => (
                      <div key={inv.id} onClick={() => navigate(`/invoice/${inv.id}`, { state: { invoice: inv } })}
                        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '13px 18px', borderBottom: `1px solid ${C.surface3}`, cursor: 'pointer' }}
                        onMouseEnter={e => e.currentTarget.style.background = C.surface2}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: C.navy }}>{inv.num}</div>
                          <div style={{ fontSize: 11, color: C.ink4, marginTop: 2 }}>{fmtD(inv.date)}</div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: C.ink }}>{fmt(inv.total)}</span>
                          <Badge status={inv.status} />
                        </div>
                      </div>
                    ))}
                  </Card>
                </div>
              )}
            </div>
          )}
    </div>
  )
}
