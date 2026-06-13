import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL     = import.meta.env.VITE_SUPABASE_URL     ?? ''
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY ?? ''

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { autoRefreshToken: true, persistSession: true },
})

const uid = () => supabase.auth.getUser().then(({ data }) => data.user?.id)

function handleError(label, error) {
  if (error) { console.error(`[Jaila:${label}]`, error.message); throw new Error(error.message) }
}

// ── Auth ─────────────────────────────────────────────────────
export async function signUp(email, password, companyName) {
  const { data, error } = await supabase.auth.signUp({
    email, password,
    options: { data: { company_name: companyName } },
  })
  handleError('signUp', error)
  return data
}

export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  handleError('signIn', error)
  return data
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  handleError('signOut', error)
}

// ── Profile ───────────────────────────────────────────────────
export async function getProfile() {
  const id = await uid()
  if (!id) return null
  const { data, error } = await supabase.from('profiles').select('*').eq('id', id).single()
  handleError('getProfile', error)
  return data
}

export async function updateProfile(updates) {
  const id = await uid()
  const { data, error } = await supabase.from('profiles').update(updates).eq('id', id).select().single()
  handleError('updateProfile', error)
  return data
}

export async function uploadLogo(file) {
  const id = await uid()
  const ext  = file.name?.split('.').pop() ?? 'png'
  const path = `${id}/logo.${ext}`
  await supabase.storage.from('logos').remove([path])
  const { error: upErr } = await supabase.storage.from('logos').upload(path, file, { upsert: true, contentType: file.type })
  handleError('uploadLogo', upErr)
  const { data } = supabase.storage.from('logos').getPublicUrl(path)
  await updateProfile({ logo_url: data.publicUrl })
  return data.publicUrl
}

// ── Invoices ──────────────────────────────────────────────────
export async function saveInvoice(invoice) {
  const id = await uid()
  let customerId = null
  if (invoice.customer?.name) {
    const { data: cust } = await supabase.from('customers')
      .upsert({ id: invoice.customer.id, name: invoice.customer.name, email: invoice.customer.email, phone: invoice.customer.phone, address: invoice.customer.address, owner_id: id }, { onConflict: 'id' })
      .select().single()
    customerId = cust?.id ?? null
  }
  const { data: inv, error: invErr } = await supabase.from('invoices').insert({
    owner_id: id, customer_id: customerId,
    invoice_num: invoice.num, invoice_date: invoice.date, due_date: invoice.due || null,
    status: invoice.status, subtotal: invoice.subtotal, vat_rate: invoice.vat,
    vat_amount: invoice.vatAmt, total: invoice.total, notes: invoice.notes || null,
    customer_name: invoice.customer.name, customer_email: invoice.customer.email || null,
    customer_phone: invoice.customer.phone || null, customer_address: invoice.customer.address || null,
  }).select().single()
  handleError('saveInvoice', invErr)
  if (invoice.items?.length) {
    const items = invoice.items.map((item, i) => ({
      invoice_id: inv.id, description: item.desc, quantity: item.qty,
      unit_price: item.price, total: item.total, sort_order: i,
    }))
    const { error: itemsErr } = await supabase.from('invoice_items').insert(items)
    handleError('saveInvoice:items', itemsErr)
  }
  return inv
}

export async function getInvoices({ month, status, search } = {}) {
  const id = await uid()
  let q = supabase.from('invoices').select('*, invoice_items(*)').eq('owner_id', id)
    .order('invoice_date', { ascending: false }).order('created_at', { ascending: false })
  if (status) q = q.eq('status', status)
  if (search) q = q.ilike('customer_name', `%${search}%`)
  const { data, error } = await q
  handleError('getInvoices', error)
  let results = data ?? []
  if (month !== undefined && month !== '') {
    results = results.filter(r => new Date(r.invoice_date).getMonth() === parseInt(month))
  }
  return results.map(normalizeInvoice)
}

export async function getInvoice(id) {
  const { data, error } = await supabase.from('invoices').select('*, invoice_items(*)').eq('id', id).single()
  handleError('getInvoice', error)
  return normalizeInvoice(data)
}

export async function updateInvoiceStatus(invoiceId, status) {
  const { data, error } = await supabase.from('invoices').update({ status }).eq('id', invoiceId).select().single()
  handleError('updateInvoiceStatus', error)
  return data
}

export async function deleteInvoice(invoiceId) {
  const { error } = await supabase.from('invoices').delete().eq('id', invoiceId)
  handleError('deleteInvoice', error)
}

export async function getDashboardStats() {
  const id = await uid()
  const { data, error } = await supabase.from('invoices').select('status, total').eq('owner_id', id)
  handleError('getDashboardStats', error)
  const all = data ?? []
  const paid = all.filter(i => i.status === 'paid')
  return {
    total: all.length, paid: paid.length,
    pending: all.filter(i => i.status === 'pending').length,
    overdue: all.filter(i => i.status === 'overdue').length,
    partPaid: all.filter(i => i.status === 'part-paid').length,
    revenue: paid.reduce((s, i) => s + Number(i.total), 0),
  }
}

// ── Payments ──────────────────────────────────────────────────
export async function getPayments(invoiceId) {
  const { data, error } = await supabase.from('payments')
    .select('*').eq('invoice_id', invoiceId).order('paid_at', { ascending: false })
  handleError('getPayments', error)
  return data ?? []
}

export async function addPayment(invoiceId, { amount, method, note }) {
  const { data: inv } = await supabase.from('invoices').select('total').eq('id', invoiceId).single()
  const { data: existing } = await supabase.from('payments').select('amount').eq('invoice_id', invoiceId)
  const alreadyPaid = (existing ?? []).reduce((s, p) => s + Number(p.amount), 0)
  const newTotal = alreadyPaid + Number(amount)
  const newStatus = newTotal >= Number(inv.total) ? 'paid' : 'part-paid'

  const { data, error } = await supabase.from('payments').insert({
    invoice_id: invoiceId, amount: Number(amount), method: method || 'cash', note: note || null,
    paid_at: new Date().toISOString(),
  }).select().single()
  handleError('addPayment', error)

  await supabase.from('invoices').update({ status: newStatus }).eq('id', invoiceId)
  return { payment: data, newStatus, amountPaid: newTotal }
}

export async function nextInvoiceNumber() {
  const id = await uid()
  const { data } = await supabase.from('invoices').select('invoice_num').eq('owner_id', id)
    .order('created_at', { ascending: false }).limit(1)
  if (!data?.length) return 'INV-0001'
  const last = data[0].invoice_num.replace(/\D/g, '')
  return 'INV-' + String((parseInt(last) || 0) + 1).padStart(4, '0')
}

export async function sendInvoiceEmail(invoiceId, recipientEmail, message) {
  const { data, error } = await supabase.functions.invoke('send-invoice', {
    body: { invoiceId, recipientEmail, message },
  })
  handleError('sendInvoiceEmail', error)
  return data
}

export function subscribeToInvoices(onChange) {
  const ch = supabase.channel('invoices-rt')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'invoices' }, onChange)
    .subscribe()
  return () => supabase.removeChannel(ch)
}

function normalizeInvoice(row) {
  if (!row) return null
  return {
    id: row.id, num: row.invoice_num, date: row.invoice_date, due: row.due_date,
    status: row.status, subtotal: Number(row.subtotal), vat: Number(row.vat_rate),
    vatAmt: Number(row.vat_amount), total: Number(row.total), notes: row.notes,
    createdAt: row.created_at,
    customer: { id: row.customer_id, name: row.customer_name, email: row.customer_email, phone: row.customer_phone, address: row.customer_address },
    items: (row.invoice_items ?? []).sort((a, b) => a.sort_order - b.sort_order).map(i => ({
      id: i.id, desc: i.description, qty: Number(i.quantity), price: Number(i.unit_price), total: Number(i.total),
    })),
  }
}
