import React, { useState, useEffect } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { getInvoice, updateInvoiceStatus, deleteInvoice, sendInvoiceEmail, getProfile, getPayments, addPayment } from '../lib/supabase'
import { C, Card, Badge, Btn, Modal, Field, Select, toast } from '../components/ui'
import { fmt, fmtD } from '../utils/format'
import { downloadInvoice, shareInvoicePDF } from '../utils/pdf'

export default function InvoiceDetail() {
  const { id }   = useParams()
  const location = useLocation()
  const navigate = useNavigate()

  const [invoice, setInvoice]       = useState(location.state?.invoice ?? null)
  const [profile, setProfile]       = useState(null)
  const [loading, setLoading]       = useState(!invoice)
  const [emailModal, setEmailModal]   = useState(false)
  const [emailTo, setEmailTo]       = useState('')
  const [emailMsg, setEmailMsg]     = useState('')
  const [sending, setSending]       = useState(false)
  const [payments, setPayments]     = useState([])
  const [payModal, setPayModal]     = useState(false)
  const [payAmount, setPayAmount]   = useState('')
  const [payMethod, setPayMethod]   = useState('cash')
  const [payNote, setPayNote]       = useState('')
  const [payLoading, setPayLoading] = useState(false)
  const isMobile = window.innerWidth < 768

  useEffect(() => {
    getProfile().then(setProfile)
    getPayments(id).then(setPayments).catch(() => {})
    if (!invoice) {
      getInvoice(id).then(inv => { setInvoice(inv); setLoading(false) }).catch(() => setLoading(false))
    } else {
      setEmailTo(invoice.customer.email ?? '')
    }
  }, [id])

  useEffect(() => { if (invoice) setEmailTo(invoice.customer.email ?? '') }, [invoice])

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: C.ink4 }}>Loading…</div>
  if (!invoice) return <div style={{ padding: 40, textAlign: 'center', color: C.ink4 }}>Invoice not found.</div>

  const changeStatus = async s => {
    try { await updateInvoiceStatus(invoice.id, s); setInvoice(p => ({ ...p, status: s })); toast.success('Status updated') }
    catch (e) { toast.error(e.message) }
  }

  const doDelete = async () => {
    if (!confirm(`Delete invoice ${invoice.num}? This cannot be undone.`)) return
    try { await deleteInvoice(invoice.id); toast.success('Invoice deleted'); navigate('/history') }
    catch (e) { toast.error(e.message) }
  }

  const doEmail = async () => {
    if (!emailTo) { toast.error('Enter recipient email'); return }
    setSending(true)
    try { await sendInvoiceEmail(invoice.id, emailTo, emailMsg); toast.success(`Invoice emailed to ${emailTo}`); setEmailModal(false) }
    catch (e) { toast.error(e.message) }
    finally { setSending(false) }
  }

  const doPayment = async () => {
    if (!payAmount || isNaN(Number(payAmount)) || Number(payAmount) <= 0) { toast.error('Enter a valid amount'); return }
    setPayLoading(true)
    try {
      const result = await addPayment(invoice.id, { amount: payAmount, method: payMethod, note: payNote })
      setInvoice(p => ({ ...p, status: result.newStatus }))
      setPayments(p => [{ amount: Number(payAmount), method: payMethod, note: payNote, paid_at: new Date().toISOString() }, ...p])
      toast.success(`Payment of ${fmt(Number(payAmount))} recorded`)
      setPayModal(false); setPayAmount(''); setPayNote('')
    } catch (e) { toast.error(e.message) }
    finally { setPayLoading(false) }
  }

  const amountPaid = payments.reduce((s, p) => s + Number(p.amount), 0)
  const balance    = invoice.total - amountPaid
  const payPct     = Math.min(100, Math.round((amountPaid / invoice.total) * 100))

  const co = profile?.company_name ?? 'Jaila Globals'
  const statusColors = { paid: ['#D1FAE5','#065F46'], pending: ['#FEF3C7','#92400E'], overdue: ['#FEE2E2','#991B1B'], 'part-paid': ['#EDE9FE','#5B21B6'] }
  const [sBg, sText] = statusColors[invoice.status] ?? statusColors.pending

  return (
    <div style={{ padding: isMobile ? '16px' : '32px 36px', maxWidth: 900, animation: 'fadeIn .2s ease' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: C.ink4, marginBottom: 6, padding: 0, display: 'flex', alignItems: 'center', gap: 4 }}>← Back</button>
          <h1 style={{ fontSize: isMobile ? 18 : 22, fontWeight: 700, color: C.ink, fontFamily: "'DM Serif Display', serif" }}>{invoice.num}</h1>
          <p style={{ fontSize: 13, color: C.ink4, marginTop: 3 }}>{invoice.customer.name} · {fmtD(invoice.date)}</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          {!isMobile && <Btn variant="outline" icon="📧" onClick={() => setEmailModal(true)}>Email</Btn>}
          <Btn variant="outline" icon="💬" onClick={() => shareInvoicePDF(invoice, document.getElementById('invoice-capture'))}>{isMobile ? 'Share' : 'Share PDF'}</Btn>
          <Btn variant="primary" icon="⬇️" onClick={() => downloadInvoice(invoice, document.getElementById('invoice-capture'))}>{isMobile ? 'PDF' : 'Download PDF'}</Btn>
          {!isMobile && <Btn variant="danger" icon="🗑" onClick={doDelete}>Delete</Btn>}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '2fr 1fr', gap: 20 }}>
        {/* Invoice card */}
        <div id="invoice-capture">
          {/* Top banner */}
          <div style={{ background: C.navy, borderRadius: '12px 12px 0 0', padding: '24px 28px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              {profile?.logo_url
                ? <img src={profile.logo_url} crossOrigin="anonymous" style={{ height: 48, width: 'auto', maxWidth: 130, objectFit: 'contain', borderRadius: 7, marginBottom: 10, display: 'block' }} alt="" />
                : <div style={{ width: 38, height: 38, background: C.gold, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, fontWeight: 700, color: C.navy, marginBottom: 10 }}>{co.charAt(0)}</div>}
              <div style={{ fontSize: 15, fontWeight: 700, color: C.white }}>{co}</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,.4)', marginTop: 1 }}>{profile?.address}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,.4)', textTransform: 'uppercase', letterSpacing: .8 }}>Invoice</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: C.gold, marginTop: 3 }}>{invoice.num}</div>
              <span style={{ display: 'inline-block', background: sBg, color: sText, padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, marginTop: 8 }}>{invoice.status.toUpperCase()}</span>
            </div>
          </div>

          {/* Meta strip */}
          <div style={{ background: '#F8FAFC', padding: '14px 28px', display: 'flex', gap: 36, borderBottom: `1px solid ${C.surface3}` }}>
            {[['Issue Date', fmtD(invoice.date)], ['Due Date', fmtD(invoice.due)], ['Amount Due', fmt(invoice.total)]].map(([l, v], i) => (
              <div key={l} style={i === 2 ? { marginLeft: 'auto', textAlign: 'right' } : {}}>
                <div style={{ fontSize: 10, color: C.ink4, textTransform: 'uppercase', letterSpacing: .6, marginBottom: 2 }}>{l}</div>
                <div style={{ fontSize: i === 2 ? 18 : 14, fontWeight: 700, color: i === 2 ? C.navy : C.ink }}>{v}</div>
              </div>
            ))}
          </div>

          {/* Parties */}
          <div style={{ padding: '18px 28px', display: 'flex', justifyContent: 'space-between', borderBottom: `1px solid ${C.surface3}`, background: C.white }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: C.ink4, textTransform: 'uppercase', letterSpacing: .6, marginBottom: 4 }}>Bill To</div>
              <div style={{ fontWeight: 600, fontSize: 14, color: C.ink }}>{invoice.customer.name}</div>
              {invoice.customer.address && <div style={{ fontSize: 12, color: C.ink3, marginTop: 2 }}>{invoice.customer.address}</div>}
              {invoice.customer.phone   && <div style={{ fontSize: 12, color: C.ink3 }}>{invoice.customer.phone}</div>}
              {invoice.customer.email   && <div style={{ fontSize: 12, color: C.ink3 }}>{invoice.customer.email}</div>}
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: C.ink4, textTransform: 'uppercase', letterSpacing: .6, marginBottom: 4 }}>From</div>
              <div style={{ fontWeight: 600, fontSize: 14, color: C.ink }}>{co}</div>
              {profile?.email && <div style={{ fontSize: 12, color: C.ink3, marginTop: 2 }}>{profile.email}</div>}
              {profile?.phone && <div style={{ fontSize: 12, color: C.ink3 }}>{profile.phone}</div>}
            </div>
          </div>

          {/* Items */}
          <div style={{ background: C.white, padding: '0 28px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: C.surface2 }}>
                  {['Description', 'Qty', 'Unit Price', 'Total'].map((h, i) => (
                    <th key={h} style={{ padding: '9px 12px', textAlign: i === 0 ? 'left' : 'right', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: .6, color: C.ink3 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {invoice.items.map((item, i) => (
                  <tr key={i} style={{ borderBottom: `1px solid ${C.surface3}` }}>
                    <td style={{ padding: '10px 12px', fontSize: 13, color: C.ink2 }}>{item.desc}</td>
                    <td style={{ padding: '10px 12px', fontSize: 13, textAlign: 'right', color: C.ink3 }}>{item.qty}</td>
                    <td style={{ padding: '10px 12px', fontSize: 13, textAlign: 'right', color: C.ink3 }}>{fmt(item.price)}</td>
                    <td style={{ padding: '10px 12px', fontSize: 13, fontWeight: 700, textAlign: 'right', color: C.ink }}>{fmt(item.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div style={{ background: C.white, padding: '14px 28px 18px', display: 'flex', justifyContent: 'flex-end' }}>
            <div style={{ minWidth: 220 }}>
              {[['Subtotal', fmt(invoice.subtotal)], [`VAT (${invoice.vat}%)`, fmt(invoice.vatAmt)]].map(([l, v]) => (
                <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', fontSize: 13, color: C.ink3 }}>
                  <span>{l}</span><span>{v}</span>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: `2px solid ${C.navy}`, paddingTop: 10, marginTop: 6, fontWeight: 700, fontSize: 15, color: C.navy }}>
                <span>Total</span><span>{fmt(invoice.total)}</span>
              </div>
            </div>
          </div>

          {/* Bank + Terms */}
          {(profile?.bank_name || invoice.notes) && (
            <div style={{ background: '#F8FAFC', padding: '16px 28px', display: 'flex', justifyContent: 'space-between', borderTop: `1px solid ${C.surface3}` }}>
              {profile?.bank_name && (
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: C.ink4, textTransform: 'uppercase', letterSpacing: .6, marginBottom: 4 }}>Payment Details</div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{profile.bank_name}</div>
                  <div style={{ fontSize: 12, color: C.ink3 }}>{profile.account_name}</div>
                  <div style={{ fontSize: 12, color: C.ink3 }}>Acct: {profile.bank_account}</div>
                </div>
              )}
              {invoice.notes && (
                <div style={{ textAlign: 'right', maxWidth: 240 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: C.ink4, textTransform: 'uppercase', letterSpacing: .6, marginBottom: 4 }}>Terms</div>
                  <div style={{ fontSize: 12, color: C.ink3, lineHeight: 1.6 }}>{invoice.notes}</div>
                </div>
              )}
            </div>
          )}

          {/* Signatures */}
          <div style={{ background: C.white, borderRadius: '0 0 12px 12px', padding: '24px 28px 28px', display: 'flex', justifyContent: 'space-between', border: `1px solid ${C.surface3}`, borderTop: 'none' }}>
            <div style={{ width: 200 }}>
              <div style={{ fontFamily: "'Dancing Script', cursive", fontSize: 28, color: C.navy, lineHeight: 1.1, marginBottom: 2 }}>{co}</div>
              <div style={{ borderBottom: `1px solid ${C.surface3}`, height: 10, marginBottom: 6 }} />
              <div style={{ fontSize: 11, color: C.ink4 }}>Authorized Signature — {co}</div>
            </div>
            <div style={{ width: 200 }}>
              <div style={{ height: 38, marginBottom: 2 }} />
              <div style={{ borderBottom: `1px solid ${C.surface3}`, height: 10, marginBottom: 6 }} />
              <div style={{ fontSize: 11, color: C.ink4 }}>Customer Signature — {invoice.customer.name}</div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div>
          {/* Payment summary */}
          <Card style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.ink4, textTransform: 'uppercase', letterSpacing: .6, marginBottom: 12 }}>Payment Tracker</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 12, color: C.ink3 }}>Total</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: C.ink }}>{fmt(invoice.total)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 12, color: C.ink3 }}>Paid</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#065F46' }}>{fmt(amountPaid)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ fontSize: 12, color: C.ink3 }}>Balance</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: balance > 0 ? C.rose2 : C.sage2 }}>{fmt(balance)}</span>
            </div>
            {/* Progress bar */}
            <div style={{ height: 6, background: C.surface3, borderRadius: 4, marginBottom: 12, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${payPct}%`, background: payPct >= 100 ? '#10B981' : '#8B5CF6', borderRadius: 4, transition: 'width .4s' }} />
            </div>
            <div style={{ fontSize: 11, color: C.ink4, marginBottom: 14, textAlign: 'right' }}>{payPct}% paid</div>
            {balance > 0 && (
              <Btn variant="gold" icon="💳" onClick={() => setPayModal(true)} style={{ width: '100%' }}>Record Payment</Btn>
            )}
            {/* Payment history */}
            {payments.length > 0 && (
              <div style={{ marginTop: 14, borderTop: `1px solid ${C.surface3}`, paddingTop: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.ink4, textTransform: 'uppercase', letterSpacing: .6, marginBottom: 8 }}>History</div>
                {payments.map((p, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: C.ink }}>{fmt(p.amount)}</div>
                      <div style={{ fontSize: 11, color: C.ink4 }}>{p.method} · {new Date(p.paid_at).toLocaleDateString('en-NG', { day: '2-digit', month: 'short' })}</div>
                      {p.note && <div style={{ fontSize: 11, color: C.ink4, fontStyle: 'italic' }}>{p.note}</div>}
                    </div>
                    <span style={{ fontSize: 10, background: C.sage, color: C.sage2, padding: '2px 7px', borderRadius: 10, fontWeight: 700 }}>✓</span>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.ink4, textTransform: 'uppercase', letterSpacing: .6, marginBottom: 14 }}>Update Status</div>
            {['pending', 'part-paid', 'paid', 'overdue'].map(s => (
              <button key={s} onClick={() => changeStatus(s)}
                style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '9px 12px', borderRadius: 8, border: `1.5px solid ${invoice.status === s ? C.navy : C.surface3}`, background: invoice.status === s ? C.navy : C.white, color: invoice.status === s ? C.white : C.ink3, fontSize: 13, fontWeight: 600, cursor: 'pointer', marginBottom: 8, textTransform: 'capitalize' }}>
                <span>{s === 'paid' ? '✅' : s === 'part-paid' ? '🔄' : s === 'pending' ? '⏳' : '⚠️'}</span> {s}
              </button>
            ))}
          </Card>

          <Card>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.ink4, textTransform: 'uppercase', letterSpacing: .6, marginBottom: 14 }}>Actions</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <Btn variant="primary" icon="⬇️" onClick={() => downloadInvoice(invoice, document.getElementById('invoice-capture'))} style={{ width: '100%' }}>Download PDF</Btn>
              <Btn variant="outline" icon="📧" onClick={() => setEmailModal(true)} style={{ width: '100%' }}>Email to Customer</Btn>
              <Btn variant="danger" icon="🗑" onClick={doDelete} style={{ width: '100%' }}>Delete Invoice</Btn>
            </div>
          </Card>
        </div>
      </div>

      {/* Payment modal */}
      <Modal open={payModal} onClose={() => setPayModal(false)} title="Record Part Payment">
        <div style={{ marginBottom: 4, padding: '10px 14px', background: C.surface2, borderRadius: 8, display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
          <span style={{ fontSize: 13, color: C.ink3 }}>Balance Due</span>
          <span style={{ fontSize: 14, fontWeight: 700, color: C.rose2 }}>{fmt(balance)}</span>
        </div>
        <Field label="Amount Paid (₦)" value={payAmount} onChange={setPayAmount} placeholder="e.g. 50000" type="number" required />
        <Select label="Payment Method" value={payMethod} onChange={setPayMethod} options={[
          { value: 'cash', label: 'Cash' },
          { value: 'transfer', label: 'Bank Transfer' },
          { value: 'pos', label: 'POS / Card' },
          { value: 'cheque', label: 'Cheque' },
        ]} />
        <Field label="Note (optional)" value={payNote} onChange={setPayNote} placeholder="e.g. First instalment" multiline />
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
          <Btn variant="outline" onClick={() => setPayModal(false)}>Cancel</Btn>
          <Btn variant="gold" icon="💳" onClick={doPayment} loading={payLoading}>Save Payment</Btn>
        </div>
      </Modal>

      {/* Email modal */}
      <Modal open={emailModal} onClose={() => setEmailModal(false)} title="Email Invoice to Customer">
        <Field label="Recipient Email" value={emailTo} onChange={setEmailTo} placeholder="customer@email.com" type="email" required />
        <Field label="Personal message (optional)" value={emailMsg} onChange={setEmailMsg} placeholder="Hi, please find your invoice attached. Thank you!" multiline />
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
          <Btn variant="outline" onClick={() => setEmailModal(false)}>Cancel</Btn>
          <Btn variant="primary" icon="📧" onClick={doEmail} loading={sending}>Send Email</Btn>
        </div>
      </Modal>
    </div>
  )
}
