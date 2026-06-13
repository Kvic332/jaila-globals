import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { getInvoices } from '../lib/supabase'
import { C, Card, Badge, Btn, Empty } from '../components/ui'
import { fmt, fmtD } from '../utils/format'

const MONTHS = [
  'All Months','January','February','March','April','May','June',
  'July','August','September','October','November','December',
]

export default function History() {
  const [invoices, setInvoices] = useState([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [status, setStatus]     = useState('')
  const [month, setMonth]       = useState('')
  const navigate = useNavigate()

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const monthIdx = month ? String(parseInt(month) - 1) : ''
      setInvoices(await getInvoices({ status: status || undefined, search: search || undefined, month: monthIdx || undefined }))
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [search, status, month])

  useEffect(() => { const t = setTimeout(load, search ? 350 : 0); return () => clearTimeout(t) }, [load, search])
  useEffect(() => { if (!search) load() }, [status, month])

  const totalRevenue = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + i.total, 0)

  return (
    <div style={{ padding: '32px 36px', maxWidth: 1100, animation: 'fadeIn .2s ease' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: C.ink, fontFamily: "'DM Serif Display', serif" }}>Invoice History</h1>
          <p style={{ fontSize: 13, color: C.ink4, marginTop: 3 }}>{invoices.length} invoice{invoices.length !== 1 ? 's' : ''}{invoices.length ? ` · ${fmt(totalRevenue)} collected` : ''}</p>
        </div>
        <Btn variant="primary" icon="+" onClick={() => navigate('/new')}>New Invoice</Btn>
      </div>

      {/* Filters */}
      <Card style={{ marginBottom: 20, padding: 18 }}>
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ flex: 1, minWidth: 200, position: 'relative' }}>
            <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 14, color: C.ink4 }}>🔍</span>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by customer or invoice…"
              style={{ width: '100%', padding: '9px 12px 9px 34px', border: `1.5px solid ${C.surface3}`, borderRadius: 8, fontSize: 13, color: C.ink, outline: 'none', fontFamily: 'Inter, sans-serif', background: C.white }} />
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            {[['All', ''], ['Pending', 'pending'], ['Paid', 'paid'], ['Overdue', 'overdue']].map(([l, v]) => (
              <button key={v} onClick={() => setStatus(v)}
                style={{ padding: '8px 14px', borderRadius: 20, border: `1.5px solid ${status === v ? C.navy : C.surface3}`, background: status === v ? C.navy : C.white, color: status === v ? C.white : C.ink3, fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all .15s' }}>
                {l}
              </button>
            ))}
          </div>

          <select value={month} onChange={e => setMonth(e.target.value)}
            style={{ padding: '9px 12px', border: `1.5px solid ${C.surface3}`, borderRadius: 8, fontSize: 13, color: C.ink, background: C.white, outline: 'none', fontFamily: 'Inter, sans-serif', cursor: 'pointer' }}>
            {MONTHS.map((m, i) => <option key={i} value={i === 0 ? '' : String(i)}>{m}</option>)}
          </select>
        </div>
      </Card>

      {/* Table */}
      <Card padding={0} style={{ overflow: 'hidden' }}>
        {loading
          ? <div style={{ padding: 48, textAlign: 'center', color: C.ink4 }}>Loading…</div>
          : invoices.length === 0
            ? <Empty icon="🔍" title="No invoices found" sub="Try adjusting your filters" />
            : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${C.surface3}`, background: C.surface2 }}>
                    {['Invoice #', 'Customer', 'Date', 'Due', 'Items', 'Total', 'Status', ''].map(h => (
                      <th key={h} style={{ padding: '11px 16px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: C.ink4, textTransform: 'uppercase', letterSpacing: .6 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((inv, i) => (
                    <tr key={inv.id}
                      onClick={() => navigate(`/invoice/${inv.id}`, { state: { invoice: inv } })}
                      style={{ borderBottom: i < invoices.length - 1 ? `1px solid ${C.surface3}` : 'none', cursor: 'pointer', transition: 'background .1s' }}
                      onMouseEnter={e => e.currentTarget.style.background = C.surface2}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <td style={{ padding: '13px 16px', fontSize: 13, fontWeight: 700, color: C.navy }}>{inv.num}</td>
                      <td style={{ padding: '13px 16px' }}>
                        <div style={{ fontSize: 13, fontWeight: 500, color: C.ink }}>{inv.customer.name}</div>
                        {inv.customer.email && <div style={{ fontSize: 11, color: C.ink4, marginTop: 1 }}>{inv.customer.email}</div>}
                      </td>
                      <td style={{ padding: '13px 16px', fontSize: 13, color: C.ink3 }}>{fmtD(inv.date)}</td>
                      <td style={{ padding: '13px 16px', fontSize: 13, color: inv.status === 'overdue' ? C.rose2 : C.ink3 }}>{fmtD(inv.due)}</td>
                      <td style={{ padding: '13px 16px', fontSize: 13, color: C.ink3, textAlign: 'center' }}>{inv.items.length}</td>
                      <td style={{ padding: '13px 16px', fontSize: 13, fontWeight: 700, color: C.ink }}>{fmt(inv.total)}</td>
                      <td style={{ padding: '13px 16px' }}><Badge status={inv.status} /></td>
                      <td style={{ padding: '13px 16px', fontSize: 16, color: C.ink4 }}>›</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
      </Card>
    </div>
  )
}
