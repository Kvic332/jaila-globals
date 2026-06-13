// ============================================================
// src/lib/supabase.js
// Supabase client + all database operations for Jaila Globals
// Install: npm install @supabase/supabase-js
// ============================================================

import { createClient } from '@supabase/supabase-js'

// ── Client ────────────────────────────────────────────────
// In React/Vite: put these in .env as VITE_SUPABASE_URL etc.
// In React Native/Expo: use app.config.js extra or .env via expo-constants
const SUPABASE_URL = import.meta.env?.VITE_SUPABASE_URL
  ?? process.env.EXPO_PUBLIC_SUPABASE_URL
  ?? ''

const SUPABASE_ANON_KEY = import.meta.env?.VITE_SUPABASE_ANON_KEY
  ?? process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
  ?? ''

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
  },
})

// ── Helpers ───────────────────────────────────────────────
const uid = () => supabase.auth.getUser().then(({ data }) => data.user?.id)

function handleError(label, error) {
  if (error) {
    console.error(`[Jaila:${label}]`, error.message)
    throw new Error(error.message)
  }
}

// ============================================================
// AUTH
// ============================================================

/** Sign up a new business owner */
export async function signUp(email, password, companyName) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { company_name: companyName } },
  })
  handleError('signUp', error)
  return data
}

/** Sign in */
export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  handleError('signIn', error)
  return data
}

/** Sign out */
export async function signOut() {
  const { error } = await supabase.auth.signOut()
  handleError('signOut', error)
}

/** Get current session */
export async function getSession() {
  const { data, error } = await supabase.auth.getSession()
  handleError('getSession', error)
  return data.session
}

/** Listen to auth state changes */
export function onAuthChange(callback) {
  const { data: { subscription } } = supabase.auth.onAuthStateChange(callback)
  return subscription
}

// ============================================================
// PROFILE / SETTINGS
// ============================================================

/** Fetch the current user's business profile */
export async function getProfile() {
  const id = await uid()
  if (!id) return null
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', id)
    .single()
  handleError('getProfile', error)
  return data
}

/** Update business settings */
export async function updateProfile(updates) {
  const id = await uid()
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  handleError('updateProfile', error)
  return data
}

/** Upload company logo — returns public URL */
export async function uploadLogo(file) {
  const id = await uid()
  const ext = file.name?.split('.').pop() ?? 'png'
  const path = `${id}/logo.${ext}`

  // Remove old logo first
  await supabase.storage.from('logos').remove([path])

  const { error: uploadError } = await supabase.storage
    .from('logos')
    .upload(path, file, { upsert: true, contentType: file.type })
  handleError('uploadLogo', uploadError)

  const { data } = supabase.storage.from('logos').getPublicUrl(path)
  // Save URL to profile
  await updateProfile({ logo_url: data.publicUrl })
  return data.publicUrl
}

/** Remove company logo */
export async function removeLogo() {
  const id = await uid()
  // Try common extensions
  await supabase.storage.from('logos').remove([`${id}/logo.png`, `${id}/logo.jpg`, `${id}/logo.svg`])
  await updateProfile({ logo_url: null })
}

// ============================================================
// CUSTOMERS
// ============================================================

/** List all customers for this owner */
export async function getCustomers() {
  const id = await uid()
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .eq('owner_id', id)
    .order('name')
  handleError('getCustomers', error)
  return data ?? []
}

/** Upsert a customer — returns the customer row */
export async function upsertCustomer(customer) {
  const id = await uid()
  const { data, error } = await supabase
    .from('customers')
    .upsert({ ...customer, owner_id: id }, { onConflict: 'id' })
    .select()
    .single()
  handleError('upsertCustomer', error)
  return data
}

// ============================================================
// INVOICES
// ============================================================

/**
 * Save a complete invoice (header + items) in a single transaction.
 *
 * @param {Object} invoice — the invoice object from the UI
 * @returns {Object} saved invoice row
 */
export async function saveInvoice(invoice) {
  const id = await uid()

  // 1. Upsert customer record for future autocomplete
  let customerId = null
  if (invoice.customer?.name) {
    const cust = await upsertCustomer({
      id: invoice.customer.id,     // undefined on first save
      name: invoice.customer.name,
      email: invoice.customer.email,
      phone: invoice.customer.phone,
      address: invoice.customer.address,
    }).catch(() => null)
    customerId = cust?.id ?? null
  }

  // 2. Insert invoice header
  const { data: inv, error: invErr } = await supabase
    .from('invoices')
    .insert({
      owner_id:         id,
      customer_id:      customerId,
      invoice_num:      invoice.num,
      invoice_date:     invoice.date,
      due_date:         invoice.due || null,
      status:           invoice.status,
      subtotal:         invoice.subtotal,
      vat_rate:         invoice.vat,
      vat_amount:       invoice.vatAmt,
      total:            invoice.total,
      notes:            invoice.notes || null,
      // snapshot
      customer_name:    invoice.customer.name,
      customer_email:   invoice.customer.email || null,
      customer_phone:   invoice.customer.phone || null,
      customer_address: invoice.customer.address || null,
    })
    .select()
    .single()
  handleError('saveInvoice:header', invErr)

  // 3. Insert line items
  if (invoice.items?.length) {
    const items = invoice.items.map((item, i) => ({
      invoice_id:  inv.id,
      description: item.desc,
      quantity:    item.qty,
      unit_price:  item.price,
      total:       item.total,
      sort_order:  i,
    }))
    const { error: itemsErr } = await supabase.from('invoice_items').insert(items)
    handleError('saveInvoice:items', itemsErr)
  }

  return inv
}

/**
 * List invoices with optional filters.
 * Returns invoices with their line items eagerly loaded.
 */
export async function getInvoices({ month, status, search } = {}) {
  const id = await uid()

  let query = supabase
    .from('invoices')
    .select(`
      *,
      invoice_items ( * )
    `)
    .eq('owner_id', id)
    .order('invoice_date', { ascending: false })
    .order('created_at', { ascending: false })

  if (status) query = query.eq('status', status)
  if (search) query = query.ilike('customer_name', `%${search}%`)

  // Month filter — filter client-side if month provided (simpler than SQL)
  const { data, error } = await query
  handleError('getInvoices', error)

  let results = data ?? []
  if (month !== undefined && month !== '') {
    results = results.filter(inv => {
      const d = new Date(inv.invoice_date)
      return d.getMonth() === parseInt(month)
    })
  }

  return results.map(normalizeInvoice)
}

/** Get a single invoice by ID */
export async function getInvoice(id) {
  const { data, error } = await supabase
    .from('invoices')
    .select(`*, invoice_items ( * )`)
    .eq('id', id)
    .single()
  handleError('getInvoice', error)
  return normalizeInvoice(data)
}

/** Update invoice status */
export async function updateInvoiceStatus(invoiceId, status) {
  const { data, error } = await supabase
    .from('invoices')
    .update({ status })
    .eq('id', invoiceId)
    .select()
    .single()
  handleError('updateInvoiceStatus', error)
  return data
}

/** Delete an invoice (cascade deletes items) */
export async function deleteInvoice(invoiceId) {
  const { error } = await supabase
    .from('invoices')
    .delete()
    .eq('id', invoiceId)
  handleError('deleteInvoice', error)
}

/**
 * Dashboard stats — total invoices, paid count, revenue, pending count
 */
export async function getDashboardStats() {
  const id = await uid()
  const { data, error } = await supabase
    .from('invoices')
    .select('status, total')
    .eq('owner_id', id)
  handleError('getDashboardStats', error)

  const all = data ?? []
  const paid = all.filter(i => i.status === 'paid')
  return {
    total:    all.length,
    paid:     paid.length,
    pending:  all.filter(i => i.status === 'pending').length,
    overdue:  all.filter(i => i.status === 'overdue').length,
    revenue:  paid.reduce((s, i) => s + Number(i.total), 0),
  }
}

/**
 * Next invoice number — e.g. INV-0042
 * Reads the highest existing number and increments.
 */
export async function nextInvoiceNumber() {
  const id = await uid()
  const { data } = await supabase
    .from('invoices')
    .select('invoice_num')
    .eq('owner_id', id)
    .order('created_at', { ascending: false })
    .limit(1)

  if (!data?.length) return 'INV-0001'
  const last = data[0].invoice_num.replace(/\D/g, '')
  const n = (parseInt(last) || 0) + 1
  return 'INV-' + String(n).padStart(4, '0')
}

// ============================================================
// REALTIME — subscribe to invoice changes
// ============================================================

/**
 * Subscribe to real-time invoice updates.
 * Call the returned unsubscribe() to clean up.
 *
 * @param {Function} onChange — called with { eventType, new: row, old: row }
 */
export function subscribeToInvoices(onChange) {
  const channel = supabase
    .channel('invoices-realtime')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'invoices' },
      payload => onChange(payload)
    )
    .subscribe()

  return () => supabase.removeChannel(channel)
}

// ============================================================
// SEND INVOICE EMAIL — calls the Edge Function
// ============================================================

/**
 * Trigger the send-invoice Edge Function.
 * @param {string} invoiceId — UUID of the invoice
 * @param {string} recipientEmail — override if different from customer email
 * @param {string} message — optional personal message
 */
export async function sendInvoiceEmail(invoiceId, recipientEmail, message) {
  const { data, error } = await supabase.functions.invoke('send-invoice', {
    body: { invoiceId, recipientEmail, message },
  })
  handleError('sendInvoiceEmail', error)
  return data
}

// ============================================================
// Internal normalizer — maps DB rows back to UI shape
// ============================================================
function normalizeInvoice(row) {
  if (!row) return null
  return {
    id:         row.id,
    num:        row.invoice_num,
    date:       row.invoice_date,
    due:        row.due_date,
    status:     row.status,
    subtotal:   Number(row.subtotal),
    vat:        Number(row.vat_rate),
    vatAmt:     Number(row.vat_amount),
    total:      Number(row.total),
    notes:      row.notes,
    createdAt:  row.created_at,
    customer: {
      id:      row.customer_id,
      name:    row.customer_name,
      email:   row.customer_email,
      phone:   row.customer_phone,
      address: row.customer_address,
    },
    items: (row.invoice_items ?? [])
      .sort((a, b) => a.sort_order - b.sort_order)
      .map(i => ({
        id:    i.id,
        desc:  i.description,
        qty:   Number(i.quantity),
        price: Number(i.unit_price),
        total: Number(i.total),
      })),
  }
}
