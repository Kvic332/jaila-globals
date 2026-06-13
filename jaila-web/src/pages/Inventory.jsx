import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { C, Card, Btn, Field, Modal, Empty, toast } from '../components/ui'
import { fmt } from '../utils/format'

async function getItems() {
  const { data: { user } } = await supabase.auth.getUser()
  const { data, error } = await supabase.from('inventory').select('*').eq('owner_id', user.id).order('name')
  if (error) throw new Error(error.message)
  return data ?? []
}
async function saveItem(item) {
  const { data: { user } } = await supabase.auth.getUser()
  if (item.id) {
    const { data, error } = await supabase.from('inventory').update({ name: item.name, sku: item.sku, qty: item.qty, unit_price: item.unit_price, low_stock: item.low_stock, category: item.category }).eq('id', item.id).select().single()
    if (error) throw new Error(error.message)
    return data
  }
  const { data, error } = await supabase.from('inventory').insert({ ...item, owner_id: user.id }).select().single()
  if (error) throw new Error(error.message)
  return data
}
async function deleteItem(id) {
  const { error } = await supabase.from('inventory').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

const EMPTY_FORM = { name: '', sku: '', qty: '', unit_price: '', low_stock: '5', category: '' }

export default function Inventory() {
  const [items, setItems]     = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal]     = useState(false)
  const [form, setForm]       = useState(EMPTY_FORM)
  const [saving, setSaving]   = useState(false)
  const [search, setSearch]   = useState('')
  const [filter, setFilter]   = useState('all')
  const isMobile = window.innerWidth < 768

  const load = () => getItems().then(setItems).catch(e => toast.error(e.message)).finally(() => setLoading(false))
  useEffect(() => { load() }, [])

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const openNew  = () => { setForm(EMPTY_FORM); setModal(true) }
  const openEdit = item => { setForm({ ...item, qty: String(item.qty), unit_price: String(item.unit_price), low_stock: String(item.low_stock) }); setModal(true) }

  const submit = async () => {
    if (!form.name) { toast.error('Product name is required'); return }
    setSaving(true)
    try {
      await saveItem({ ...form, qty: Number(form.qty) || 0, unit_price: Number(form.unit_price) || 0, low_stock: Number(form.low_stock) || 5 })
      toast.success(form.id ? 'Item updated' : 'Item added')
      setModal(false); load()
    } catch (e) { toast.error(e.message) }
    finally { setSaving(false) }
  }

  const remove = async id => {
    if (!confirm('Delete this item?')) return
    try { await deleteItem(id); toast.success('Deleted'); load() }
    catch (e) { toast.error(e.message) }
  }

  const lowStock = items.filter(i => i.qty <= i.low_stock)
  let filtered = items.filter(i => i.name.toLowerCase().includes(search.toLowerCase()) || (i.sku ?? '').toLowerCase().includes(search.toLowerCase()))
  if (filter === 'low') filtered = filtered.filter(i => i.qty <= i.low_stock)
  if (filter === 'out') filtered = filtered.filter(i => i.qty === 0)

  const totalValue = items.reduce((s, i) => s + i.qty * i.unit_price, 0)

  return (
    <div style={{ padding: isMobile ? '20px 16px' : '32px 36px', maxWidth: 1100, animation: 'fadeIn .2s ease' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: isMobile ? 20 : 22, fontWeight: 700, color: C.ink, fontFamily: "'DM Serif Display', serif" }}>Inventory</h1>
          <p style={{ fontSize: 13, color: C.ink4, marginTop: 3 }}>{items.length} products · Stock value {fmt(totalValue)}</p>
        </div>
        <Btn variant="primary" icon="+" onClick={openNew}>{isMobile ? 'Add' : 'Add Product'}</Btn>
      </div>

      {/* Low stock alert */}
      {lowStock.length > 0 && (
        <div style={{ background: C.amber, border: `1px solid ${C.amber2}22`, borderRadius: 10, padding: '12px 16px', marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: C.amber2 }}>⚠️ {lowStock.length} item{lowStock.length > 1 ? 's' : ''} running low on stock: {lowStock.map(i => i.name).join(', ')}</span>
          <button onClick={() => setFilter('low')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700, color: C.amber2, textDecoration: 'underline' }}>View</button>
        </div>
      )}

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2,1fr)' : 'repeat(4,1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Total Products', value: items.length, icon: '📦' },
          { label: 'Low Stock', value: items.filter(i => i.qty <= i.low_stock && i.qty > 0).length, icon: '⚠️' },
          { label: 'Out of Stock', value: items.filter(i => i.qty === 0).length, icon: '🚫' },
          { label: 'Stock Value', value: fmt(totalValue), icon: '💰' },
        ].map(s => (
          <Card key={s.label} style={{ padding: 16 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: C.ink4, textTransform: 'uppercase', letterSpacing: .5, marginBottom: 6 }}>{s.label}</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: C.ink }}>{s.value} <span style={{ fontSize: 16 }}>{s.icon}</span></div>
          </Card>
        ))}
      </div>

      {/* Filters + Search */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search products…"
          style={{ flex: 1, minWidth: 180, padding: '9px 14px', border: `1.5px solid ${C.surface3}`, borderRadius: 8, fontSize: 13, color: C.ink, outline: 'none', fontFamily: 'Inter, sans-serif' }} />
        {['all','low','out'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            style={{ padding: '9px 16px', borderRadius: 8, border: `1.5px solid ${filter===f ? C.navy : C.surface3}`, background: filter===f ? C.navy : C.white, color: filter===f ? C.white : C.ink3, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
            {f === 'all' ? 'All' : f === 'low' ? 'Low Stock' : 'Out of Stock'}
          </button>
        ))}
      </div>

      {/* Table */}
      {loading
        ? <div style={{ textAlign: 'center', padding: 60, color: C.ink4 }}>Loading…</div>
        : filtered.length === 0
          ? <Empty icon="📦" title="No products yet" sub="Add your first product to start tracking inventory" />
          : (
            <Card padding={0}>
              {!isMobile && (
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 80px', padding: '10px 20px', borderBottom: `1px solid ${C.surface3}`, background: C.surface2 }}>
                  {['Product', 'SKU', 'Qty', 'Unit Price', 'Stock Value', ''].map(h => (
                    <div key={h} style={{ fontSize: 10, fontWeight: 700, color: C.ink4, textTransform: 'uppercase', letterSpacing: .5 }}>{h}</div>
                  ))}
                </div>
              )}
              {filtered.map((item, i) => {
                const isLow = item.qty <= item.low_stock
                const isOut = item.qty === 0
                const statusColor = isOut ? C.rose2 : isLow ? C.amber2 : C.sage2
                const statusBg    = isOut ? C.rose   : isLow ? C.amber   : C.sage
                return isMobile ? (
                  <div key={item.id} onClick={() => openEdit(item)}
                    style={{ padding: '14px 16px', borderBottom: i < filtered.length-1 ? `1px solid ${C.surface3}` : 'none', cursor: 'pointer' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: C.ink }}>{item.name}</div>
                        {item.sku && <div style={{ fontSize: 11, color: C.ink4, marginTop: 2 }}>SKU: {item.sku}</div>}
                        {item.category && <div style={{ fontSize: 11, color: C.ink4 }}>{item.category}</div>}
                      </div>
                      <span style={{ background: statusBg, color: statusColor, fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10 }}>
                        {isOut ? 'OUT' : isLow ? 'LOW' : 'OK'} · {item.qty}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
                      <span style={{ fontSize: 12, color: C.ink3 }}>{fmt(item.unit_price)} / unit</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: C.navy }}>{fmt(item.qty * item.unit_price)}</span>
                    </div>
                  </div>
                ) : (
                  <div key={item.id} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 80px', padding: '14px 20px', borderBottom: i < filtered.length-1 ? `1px solid ${C.surface3}` : 'none', alignItems: 'center' }}
                    onMouseEnter={e => e.currentTarget.style.background = C.surface2}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: C.ink }}>{item.name}</div>
                      {item.category && <div style={{ fontSize: 11, color: C.ink4, marginTop: 1 }}>{item.category}</div>}
                    </div>
                    <div style={{ fontSize: 12, color: C.ink4 }}>{item.sku || '—'}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: statusColor }}>{item.qty}</span>
                      <span style={{ background: statusBg, color: statusColor, fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 8 }}>{isOut ? 'OUT' : isLow ? 'LOW' : 'OK'}</span>
                    </div>
                    <div style={{ fontSize: 13, color: C.ink3 }}>{fmt(item.unit_price)}</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: C.ink }}>{fmt(item.qty * item.unit_price)}</div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => openEdit(item)} style={{ background: C.surface2, border: 'none', cursor: 'pointer', padding: '5px 10px', borderRadius: 6, fontSize: 12, color: C.ink3, fontWeight: 600 }}>Edit</button>
                      <button onClick={() => remove(item.id)} style={{ background: C.rose, border: 'none', cursor: 'pointer', padding: '5px 10px', borderRadius: 6, fontSize: 12, color: C.rose2, fontWeight: 600 }}>Del</button>
                    </div>
                  </div>
                )
              })}
            </Card>
          )}

      {/* Add/Edit modal */}
      <Modal open={modal} onClose={() => setModal(false)} title={form.id ? 'Edit Product' : 'Add Product'} width={520}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
          <div style={{ gridColumn: '1/-1' }}>
            <Field label="Product Name *" value={form.name} onChange={v => set('name', v)} placeholder="e.g. Laptop Stand" />
          </div>
          <Field label="SKU / Code" value={form.sku} onChange={v => set('sku', v)} placeholder="LS-001" />
          <Field label="Category" value={form.category} onChange={v => set('category', v)} placeholder="Electronics" />
          <Field label="Quantity in Stock" value={form.qty} onChange={v => set('qty', v)} placeholder="0" type="number" />
          <Field label="Unit Price (₦)" value={form.unit_price} onChange={v => set('unit_price', v)} placeholder="0" type="number" />
          <div style={{ gridColumn: '1/-1' }}>
            <Field label="Low Stock Alert (qty)" value={form.low_stock} onChange={v => set('low_stock', v)} placeholder="5" type="number" />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
          <Btn variant="outline" onClick={() => setModal(false)}>Cancel</Btn>
          <Btn variant="primary" onClick={submit} loading={saving}>{form.id ? 'Save Changes' : 'Add Product'}</Btn>
        </div>
      </Modal>
    </div>
  )
}
