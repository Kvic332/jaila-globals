import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { saveInvoice, nextInvoiceNumber, getProfile } from '../lib/supabase'
import { C, Card, Btn, Field, Select, toast } from '../components/ui'
import { fmt, today } from '../utils/format'
import { downloadInvoice } from '../utils/pdf'

export default function CreateInvoice() {
  const [custName, setCustName]     = useState('')
  const [custEmail, setCustEmail]   = useState('')
  const [custPhone, setCustPhone]   = useState('')
  const [custAddr, setCustAddr]     = useState('')
  const [invNum, setInvNum]         = useState('')
  const [invDate, setInvDate]       = useState(today())
  const [invDue, setInvDue]         = useState('')
  const [status, setStatus]         = useState('pending')
  const [vat, setVat]               = useState('7.5')
  const [notes, setNotes]           = useState('')
  const [items, setItems]           = useState([{ desc: '', qty: '1', price: '' }])
  const [saving, setSaving]         = useState(false)
  const [preview, setPreview]       = useState(false)
  const [profile, setProfile]       = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    nextInvoiceNumber().then(setInvNum).catch(() => setInvNum('INV-0001'))
    getProfile().then(p => { setProfile(p); if (p?.default_vat) setVat(String(p.default_vat)); if (p?.default_terms) setNotes(p.default_terms) })
  }, [])

  const addItem    = () => setItems(p => [...p, { desc: '', qty: '1', price: '' }])
  const removeItem = i  => setItems(p => p.filter((_, idx) => idx !== i))
  const updateItem = (i, k, v) => setItems(p => p.map((it, idx) => idx === i ? { ...it, [k]: v } : it))

  const computed = items.map(i => ({
    desc: i.desc, qty: parseFloat(i.qty) || 0,
    price: parseFloat(i.price) || 0,
    total: (parseFloat(i.qty) || 0) * (parseFloat(i.price) || 0),
  }))
  const subtotal = computed.reduce((s, i) => s + i.total, 0)
  const vatAmt   = subtotal * (parseFloat(vat) || 0) / 100
  const total    = subtotal + vatAmt

  const invoiceObj = {
    num: invNum, date: invDate, due: invDue || null, status,
    customer: { name: custName, email: custEmail, phone: custPhone, address: custAddr },
    items: computed, notes, vat: parseFloat(vat), subtotal, vatAmt, total,
  }

  const save = async () => {
    if (!custName.trim()) { toast.error('Customer name is required'); return }
    if (!computed.some(i => i.desc || i.price)) { toast.error('Add at least one line item'); return }
    setSaving(true)
    try {
      await saveInvoice(invoiceObj)
      toast.success(`Invoice ${invNum} saved!`)
      navigate('/')
    } catch (e) { toast.error(e.message) }
    finally { setSaving(false) }
  }

  const doPreview = () => {
    if (!custName.trim()) { toast.error('Enter a customer name first'); return }
    setPreview(true)
  }

  return (
    <div style={{ padding: '32px 36px', maxWidth: 860, animation: 'fadeIn .2s ease' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: C.ink, fontFamily: "'DM Serif Display', serif" }}>New Invoice</h1>
          <p style={{ fontSize: 13, color: C.ink4, marginTop: 3 }}>Fill in the details below</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <Btn variant="outline" onClick={() => navigate('/')}>Cancel</Btn>
          <Btn variant="outline" icon="👁" onClick={doPreview}>Preview</Btn>
          <Btn variant="primary" icon="💾" onClick={save} loading={saving}>Save Invoice</Btn>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Customer */}
        <Card>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: C.ink, marginBottom: 18 }}>Customer Details</h3>
          <Field label="Customer Name" value={custName} onChange={setCustName} placeholder="e.g. Amaka Traders" required />
          <Field label="Email" value={custEmail} onChange={setCustEmail} placeholder="customer@email.com" type="email" />
          <Field label="Phone" value={custPhone} onChange={setCustPhone} placeholder="+234 803 000 0000" type="tel" />
          <Field label="Address" value={custAddr} onChange={setCustAddr} placeholder="Street, City, State" multiline />
        </Card>

        {/* Invoice info */}
        <Card>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: C.ink, marginBottom: 18 }}>Invoice Details</h3>
          <Field label="Invoice Number" value={invNum} onChange={setInvNum} placeholder="INV-0001" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Invoice Date" value={invDate} onChange={setInvDate} type="date" />
            <Field label="Due Date" value={invDue} onChange={setInvDue} type="date" />
          </div>
          <Select label="Status" value={status} onChange={setStatus} options={[
            { value: 'pending', label: 'Pending' },
            { value: 'paid',    label: 'Paid'    },
            { value: 'overdue', label: 'Overdue' },
          ]} />
          <Field label="VAT (%)" value={vat} onChange={setVat} type="number" placeholder="7.5" />
        </Card>
      </div>

      {/* Line Items */}
      <Card style={{ marginTop: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: C.ink }}>Line Items</h3>
          <Btn variant="outline" size="sm" icon="+" onClick={addItem}>Add item</Btn>
        </div>

        {/* Header */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 140px 120px 32px', gap: 10, padding: '0 0 8px', borderBottom: `1px solid ${C.surface3}`, marginBottom: 10 }}>
          {['Description', 'Qty', 'Unit Price (₦)', 'Total', ''].map(h => (
            <div key={h} style={{ fontSize: 10, fontWeight: 700, color: C.ink4, textTransform: 'uppercase', letterSpacing: .6 }}>{h}</div>
          ))}
        </div>

        {items.map((item, i) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 80px 140px 120px 32px', gap: 10, marginBottom: 10, alignItems: 'center' }}>
            <input value={item.desc} onChange={e => updateItem(i, 'desc', e.target.value)} placeholder="Item description"
              style={{ padding: '9px 12px', border: `1.5px solid ${C.surface3}`, borderRadius: 8, fontSize: 14, color: C.ink, outline: 'none', fontFamily: 'Inter, sans-serif', width: '100%' }} />
            <input value={item.qty} onChange={e => updateItem(i, 'qty', e.target.value)} type="number" min="0" placeholder="1"
              style={{ padding: '9px 12px', border: `1.5px solid ${C.surface3}`, borderRadius: 8, fontSize: 14, color: C.ink, outline: 'none', fontFamily: 'Inter, sans-serif', width: '100%', textAlign: 'center' }} />
            <input value={item.price} onChange={e => updateItem(i, 'price', e.target.value)} type="number" min="0" placeholder="0.00"
              style={{ padding: '9px 12px', border: `1.5px solid ${C.surface3}`, borderRadius: 8, fontSize: 14, color: C.ink, outline: 'none', fontFamily: 'Inter, sans-serif', width: '100%' }} />
            <div style={{ padding: '9px 12px', background: C.surface2, borderRadius: 8, fontSize: 13, fontWeight: 700, color: C.ink, textAlign: 'right' }}>
              {fmt(computed[i]?.total ?? 0)}
            </div>
            {items.length > 1
              ? <button onClick={() => removeItem(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.rose2, fontSize: 18, lineHeight: 1, padding: 4, borderRadius: 6 }}>×</button>
              : <div />}
          </div>
        ))}

        {/* Totals */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
          <div style={{ background: C.navy, borderRadius: 12, padding: '20px 24px', minWidth: 260 }}>
            {[['Subtotal', fmt(subtotal)], [`VAT (${vat || 0}%)`, fmt(vatAmt)]].map(([l, v]) => (
              <div key={l} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 13, color: 'rgba(255,255,255,.55)' }}>{l}</span>
                <span style={{ fontSize: 13, color: 'rgba(255,255,255,.8)', fontWeight: 500 }}>{v}</span>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,.12)', paddingTop: 12, marginTop: 4 }}>
              <span style={{ fontSize: 16, fontWeight: 700, color: C.white }}>Total</span>
              <span style={{ fontSize: 20, fontWeight: 700, color: C.gold }}>{fmt(total)}</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Notes */}
      <Card style={{ marginTop: 20 }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: C.ink, marginBottom: 14 }}>Notes & Terms</h3>
        <Field label="Payment terms / additional notes" value={notes} onChange={setNotes} placeholder="e.g. Payment due within 7 days. Thank you for your business." multiline />
      </Card>

      {/* Bottom actions */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 24 }}>
        <Btn variant="outline" onClick={() => navigate('/')}>Cancel</Btn>
        <Btn variant="outline" icon="👁" onClick={doPreview}>Preview PDF</Btn>
        <Btn variant="primary" icon="💾" onClick={save} loading={saving}>Save Invoice</Btn>
      </div>

      {/* PDF Preview overlay */}
      {preview && (
        <div onClick={() => setPreview(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: C.white, borderRadius: 16, width: '100%', maxWidth: 820, maxHeight: '90vh', overflow: 'auto', boxShadow: '0 24px 60px rgba(0,0,0,.25)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', borderBottom: `1px solid ${C.surface3}`, position: 'sticky', top: 0, background: C.white, zIndex: 1 }}>
              <span style={{ fontWeight: 700, fontSize: 15 }}>Invoice Preview — {invNum}</span>
              <div style={{ display: 'flex', gap: 10 }}>
                <Btn variant="primary" icon="⬇️" onClick={() => downloadInvoice(invoiceObj, profile)}>Download PDF</Btn>
                <button onClick={() => setPreview(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: C.ink3 }}>×</button>
              </div>
            </div>
            <div style={{ padding: 24 }}>
              <InvoicePreviewInline inv={invoiceObj} profile={profile} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function InvoicePreviewInline({ inv, profile }) {
  const co = profile?.company_name ?? 'Jaila Globals'
  const fmtN = n => '₦' + Number(n).toLocaleString('en-NG', { minimumFractionDigits: 2 })
  const fmtDate = d => d ? new Date(d).toLocaleDateString('en-NG', { day: '2-digit', month: 'long', year: 'numeric' }) : '—'
  const statusColors = { paid: ['#D1FAE5','#065F46'], pending: ['#FEF3C7','#92400E'], overdue: ['#FEE2E2','#991B1B'] }
  const [sBg, sText] = statusColors[inv.status] ?? statusColors.pending

  return (
    <div style={{ border: `1px solid ${C.surface3}`, borderRadius: 10, overflow: 'hidden', background: C.white }}>
      {/* Header */}
      <div style={{ background: C.navy, padding: '28px 36px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          {profile?.logo_url
            ? <img src={profile.logo_url} height={44} style={{ borderRadius: 8, marginBottom: 10 }} alt="" />
            : <div style={{ width: 44, height: 44, background: C.gold, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 700, color: C.navy, marginBottom: 10 }}>{co.charAt(0)}</div>}
          <div style={{ fontSize: 17, fontWeight: 700, color: C.white }}>{co}</div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,.4)', marginTop: 2 }}>{[profile?.address, profile?.phone].filter(Boolean).join(' · ')}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,.4)', textTransform: 'uppercase', letterSpacing: .7 }}>Invoice</div>
          <div style={{ fontSize: 26, fontWeight: 700, color: C.gold, marginTop: 4 }}>{inv.num}</div>
          <span style={{ display: 'inline-block', background: sBg, color: sText, padding: '3px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700, marginTop: 8 }}>{inv.status.toUpperCase()}</span>
        </div>
      </div>

      {/* Meta */}
      <div style={{ background: '#F8FAFC', padding: '16px 36px', display: 'flex', gap: 40, borderBottom: `1px solid ${C.surface3}` }}>
        {[['Issue Date', fmtDate(inv.date)], ['Due Date', fmtDate(inv.due)], ['Amount Due', fmtN(inv.total)]].map(([l, v], i) => (
          <div key={l} style={i === 2 ? { marginLeft: 'auto', textAlign: 'right' } : {}}>
            <div style={{ fontSize: 10, color: C.ink4, textTransform: 'uppercase', letterSpacing: .6, marginBottom: 3 }}>{l}</div>
            <div style={{ fontSize: i === 2 ? 18 : 14, fontWeight: 700, color: i === 2 ? C.navy : C.ink }}>{v}</div>
          </div>
        ))}
      </div>

      {/* Parties */}
      <div style={{ padding: '20px 36px', display: 'flex', justifyContent: 'space-between', borderBottom: `1px solid ${C.surface3}` }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: C.ink4, textTransform: 'uppercase', letterSpacing: .6, marginBottom: 5 }}>Bill To</div>
          <div style={{ fontWeight: 600, color: C.ink }}>{inv.customer.name || '—'}</div>
          {inv.customer.address && <div style={{ fontSize: 12, color: C.ink3, marginTop: 2 }}>{inv.customer.address}</div>}
          {inv.customer.phone   && <div style={{ fontSize: 12, color: C.ink3 }}>{inv.customer.phone}</div>}
          {inv.customer.email   && <div style={{ fontSize: 12, color: C.ink3 }}>{inv.customer.email}</div>}
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: C.ink4, textTransform: 'uppercase', letterSpacing: .6, marginBottom: 5 }}>From</div>
          <div style={{ fontWeight: 600, color: C.ink }}>{co}</div>
          {profile?.email && <div style={{ fontSize: 12, color: C.ink3, marginTop: 2 }}>{profile.email}</div>}
          {profile?.phone && <div style={{ fontSize: 12, color: C.ink3 }}>{profile.phone}</div>}
        </div>
      </div>

      {/* Items table */}
      <div style={{ padding: '20px 36px 0' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: C.surface2 }}>
              {['Description', 'Qty', 'Unit Price', 'Total'].map((h, i) => (
                <th key={h} style={{ padding: '9px 12px', textAlign: i === 0 ? 'left' : 'right', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: .6, color: C.ink3 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {inv.items.map((item, i) => (
              <tr key={i} style={{ borderBottom: `1px solid ${C.surface3}` }}>
                <td style={{ padding: '10px 12px', fontSize: 13, color: C.ink2 }}>{item.desc || '—'}</td>
                <td style={{ padding: '10px 12px', fontSize: 13, textAlign: 'right', color: C.ink3 }}>{item.qty}</td>
                <td style={{ padding: '10px 12px', fontSize: 13, textAlign: 'right', color: C.ink3 }}>{fmtN(item.price)}</td>
                <td style={{ padding: '10px 12px', fontSize: 13, fontWeight: 700, textAlign: 'right', color: C.ink }}>{fmtN(item.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Totals */}
      <div style={{ padding: '16px 36px 20px', display: 'flex', justifyContent: 'flex-end' }}>
        <div style={{ minWidth: 220 }}>
          {[['Subtotal', fmtN(inv.subtotal)], [`VAT (${inv.vat}%)`, fmtN(inv.vatAmt)]].map(([l, v]) => (
            <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', fontSize: 13, color: C.ink3 }}>
              <span>{l}</span><span>{v}</span>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: `2px solid ${C.navy}`, paddingTop: 10, marginTop: 6, fontWeight: 700, fontSize: 15, color: C.navy }}>
            <span>Total</span><span>{fmtN(inv.total)}</span>
          </div>
        </div>
      </div>

      {/* Bank + Terms */}
      {(profile?.bank_name || inv.notes) && (
        <div style={{ background: '#F8FAFC', padding: '16px 36px', display: 'flex', justifyContent: 'space-between', borderTop: `1px solid ${C.surface3}` }}>
          {profile?.bank_name && (
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: C.ink4, textTransform: 'uppercase', letterSpacing: .6, marginBottom: 4 }}>Payment Details</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: C.ink }}>{profile.bank_name}</div>
              <div style={{ fontSize: 12, color: C.ink3 }}>{profile.account_name}</div>
              <div style={{ fontSize: 12, color: C.ink3 }}>Acct: {profile.bank_account}</div>
            </div>
          )}
          {inv.notes && (
            <div style={{ textAlign: 'right', maxWidth: 260 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: C.ink4, textTransform: 'uppercase', letterSpacing: .6, marginBottom: 4 }}>Terms & Conditions</div>
              <div style={{ fontSize: 12, color: C.ink3, lineHeight: 1.6 }}>{inv.notes}</div>
            </div>
          )}
        </div>
      )}

      {/* Signatures */}
      <div style={{ padding: '28px 36px 32px', display: 'flex', justifyContent: 'space-between' }}>
        {[`Authorized Signature — ${co}`, `Customer Signature — ${inv.customer.name || 'Customer'}`].map(l => (
          <div key={l} style={{ width: 210 }}>
            <div style={{ borderBottom: `1px solid ${C.surface3}`, height: 40, marginBottom: 6 }} />
            <div style={{ fontSize: 11, color: C.ink4 }}>{l}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
