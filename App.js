// ============================================================
// Jaila Globals — React Native / Expo Mobile App
// ============================================================
// Setup:
//   npx create-expo-app jaila-mobile --template blank
//   cd jaila-mobile
//   npx expo install @supabase/supabase-js @react-native-async-storage/async-storage
//   npm install @react-navigation/native @react-navigation/bottom-tabs @react-navigation/stack
//   npx expo install react-native-screens react-native-safe-area-context
//   npm install react-native-paper react-native-vector-icons
//   npx expo install expo-print expo-sharing expo-file-system expo-image-picker
//
// Copy src/lib/supabase.js into this project (works for both web + native)
// Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in .env
// ============================================================

import React, { useState, useEffect, useCallback } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, FlatList,
  StyleSheet, StatusBar, Alert, ActivityIndicator, Modal,
  KeyboardAvoidingView, Platform, RefreshControl, Image,
} from 'react-native'
import { NavigationContainer } from '@react-navigation/native'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { createStackNavigator } from '@react-navigation/stack'
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context'
import * as Print from 'expo-print'
import * as Sharing from 'expo-sharing'
import * as ImagePicker from 'expo-image-picker'
import {
  supabase, signIn, signUp, signOut, getProfile, updateProfile,
  getInvoices, saveInvoice, deleteInvoice, updateInvoiceStatus,
  getDashboardStats, nextInvoiceNumber, sendInvoiceEmail,
  uploadLogo, subscribeToInvoices,
} from './src/lib/supabase'

// ── Design tokens ─────────────────────────────────────────
const C = {
  navy:    '#0A1628',
  navy2:   '#162544',
  gold:    '#D4A849',
  gold2:   '#E8C56A',
  ink:     '#111827',
  ink2:    '#374151',
  ink3:    '#6b7280',
  ink4:    '#9ca3af',
  surface: '#FAFAF8',
  surface2:'#F3F4F6',
  surface3:'#E5E7EB',
  sage:    '#D1FAE5',
  sage2:   '#065F46',
  amber:   '#FEF3C7',
  amber2:  '#92400E',
  rose:    '#FEE2E2',
  rose2:   '#991B1B',
  white:   '#FFFFFF',
}

const T = {
  h1:   { fontSize: 22, fontWeight: '700', color: C.ink },
  h2:   { fontSize: 18, fontWeight: '600', color: C.ink },
  h3:   { fontSize: 15, fontWeight: '600', color: C.ink },
  body: { fontSize: 14, color: C.ink2, lineHeight: 22 },
  sm:   { fontSize: 12, color: C.ink3 },
  label:{ fontSize: 11, fontWeight: '600', color: C.ink3, letterSpacing: 0.6, textTransform: 'uppercase' },
  mono: { fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
}

const shadow = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.07,
  shadowRadius: 8,
  elevation: 3,
}

// ── Helpers ───────────────────────────────────────────────
const fmt   = (n)  => '₦' + Number(n).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const fmtD  = (d)  => d ? new Date(d).toLocaleDateString('en-NG', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'
const today = ()   => new Date().toISOString().split('T')[0]

const statusStyle = (s) => ({
  paid:    { bg: C.sage,  text: C.sage2  },
  pending: { bg: C.amber, text: C.amber2 },
  overdue: { bg: C.rose,  text: C.rose2  },
})[s] ?? { bg: C.amber, text: C.amber2 }

// ── Shared components ─────────────────────────────────────

function Btn({ label, onPress, variant = 'outline', icon, loading, style }) {
  const isPrimary = variant === 'primary'
  const isGold    = variant === 'gold'
  const isDanger  = variant === 'danger'
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={loading}
      activeOpacity={0.75}
      style={[{
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: 6, paddingVertical: 10, paddingHorizontal: 16,
        borderRadius: 8,
        backgroundColor: isPrimary ? C.navy : isGold ? C.gold : isDanger ? C.rose : C.white,
        borderWidth: 1,
        borderColor: isPrimary ? C.navy : isGold ? C.gold : isDanger ? C.rose2 : C.surface3,
      }, style]}
    >
      {loading
        ? <ActivityIndicator color={isPrimary ? C.white : C.navy} size="small" />
        : <>
            {icon && <Text style={{ fontSize: 15 }}>{icon}</Text>}
            <Text style={{ fontSize: 13, fontWeight: '600', color: isPrimary ? C.white : isGold ? C.navy : isDanger ? C.rose2 : C.ink2 }}>
              {label}
            </Text>
          </>}
    </TouchableOpacity>
  )
}

function Field({ label, value, onChangeText, placeholder, keyboardType, multiline, editable = true }) {
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={[T.label, { marginBottom: 5 }]}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={C.ink4}
        keyboardType={keyboardType}
        multiline={multiline}
        editable={editable}
        numberOfLines={multiline ? 3 : 1}
        style={{
          borderWidth: 1.5, borderColor: C.surface3, borderRadius: 8,
          padding: 10, fontSize: 14, color: C.ink, backgroundColor: editable ? C.surface : C.surface2,
          minHeight: multiline ? 80 : undefined, textAlignVertical: multiline ? 'top' : 'center',
        }}
      />
    </View>
  )
}

function Badge({ status }) {
  const s = statusStyle(status)
  return (
    <View style={{ backgroundColor: s.bg, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 }}>
      <Text style={{ fontSize: 11, fontWeight: '700', color: s.text }}>
        {'● ' + status.toUpperCase()}
      </Text>
    </View>
  )
}

function Card({ children, style }) {
  return (
    <View style={[{ backgroundColor: C.white, borderRadius: 12, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: C.surface3, ...shadow }, style]}>
      {children}
    </View>
  )
}

function StatCard({ label, value, color = C.ink, bg = C.surface2 }) {
  return (
    <View style={{ flex: 1, backgroundColor: bg, borderRadius: 10, padding: 14, margin: 4 }}>
      <Text style={[T.label, { marginBottom: 6 }]}>{label}</Text>
      <Text style={{ fontSize: 22, fontWeight: '700', color }}>{value}</Text>
    </View>
  )
}

// ============================================================
// AUTH SCREEN
// ============================================================
function AuthScreen({ onAuth }) {
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [company, setCompany] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async () => {
    if (!email || !password) { Alert.alert('Error', 'Please fill in all fields'); return }
    setLoading(true)
    try {
      if (mode === 'login') {
        await signIn(email, password)
      } else {
        if (!company) { Alert.alert('Error', 'Please enter your company name'); return }
        await signUp(email, password, company)
        Alert.alert('Check your email', 'We sent you a confirmation link.')
      }
      onAuth()
    } catch (e) {
      Alert.alert('Error', e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, backgroundColor: C.navy }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 28 }}>
        <View style={{ alignItems: 'center', marginBottom: 36 }}>
          <View style={{ width: 64, height: 64, backgroundColor: C.gold, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
            <Text style={{ fontSize: 28, fontWeight: '800', color: C.navy }}>J</Text>
          </View>
          <Text style={{ fontSize: 26, fontWeight: '700', color: C.white, letterSpacing: -0.5 }}>Jaila Globals</Text>
          <Text style={{ fontSize: 13, color: 'rgba(255,255,255,.5)', marginTop: 4 }}>Invoice & Inventory Suite</Text>
        </View>

        <View style={{ backgroundColor: 'rgba(255,255,255,.07)', borderRadius: 16, padding: 24 }}>
          <Text style={{ fontSize: 18, fontWeight: '600', color: C.white, marginBottom: 20 }}>
            {mode === 'login' ? 'Sign in' : 'Create account'}
          </Text>
          {mode === 'signup' && (
            <Field label="Company name" value={company} onChangeText={setCompany} placeholder="e.g. Jaila Globals Ltd" />
          )}
          <Field label="Email" value={email} onChangeText={setEmail} placeholder="you@company.com" keyboardType="email-address" />
          <Field label="Password" value={password} onChangeText={setPassword} placeholder="••••••••" />
          <Btn label={mode === 'login' ? 'Sign in' : 'Create account'} onPress={submit} variant="gold" loading={loading} style={{ marginTop: 8 }} />
          <TouchableOpacity onPress={() => setMode(mode === 'login' ? 'signup' : 'login')} style={{ marginTop: 16, alignItems: 'center' }}>
            <Text style={{ color: 'rgba(255,255,255,.5)', fontSize: 13 }}>
              {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
              <Text style={{ color: C.gold, fontWeight: '600' }}>{mode === 'login' ? 'Sign up' : 'Sign in'}</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

// ============================================================
// DASHBOARD SCREEN
// ============================================================
function DashboardScreen({ navigation }) {
  const [stats, setStats]       = useState({ total: 0, paid: 0, pending: 0, revenue: 0 })
  const [recent, setRecent]     = useState([])
  const [loading, setLoading]   = useState(true)
  const [profile, setProfile]   = useState(null)
  const insets = useSafeAreaInsets()

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [s, invs, p] = await Promise.all([getDashboardStats(), getInvoices(), getProfile()])
      setStats(s)
      setRecent(invs.slice(0, 6))
      setProfile(p)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [])

  useEffect(() => {
    const unsub = subscribeToInvoices(() => load())
    return unsub
  }, [])

  const co = profile?.company_name ?? 'Jaila Globals'

  return (
    <View style={{ flex: 1, backgroundColor: C.surface }}>
      {/* Header */}
      <View style={{ backgroundColor: C.navy, paddingTop: insets.top + 8, paddingBottom: 20, paddingHorizontal: 20 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            {profile?.logo_url
              ? <Image source={{ uri: profile.logo_url }} style={{ width: 36, height: 36, borderRadius: 8 }} />
              : <View style={{ width: 36, height: 36, backgroundColor: C.gold, borderRadius: 8, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontSize: 16, fontWeight: '700', color: C.navy }}>{co.charAt(0)}</Text>
                </View>}
            <View>
              <Text style={{ fontSize: 16, fontWeight: '700', color: C.white }}>{co}</Text>
              <Text style={{ fontSize: 11, color: 'rgba(255,255,255,.45)' }}>{new Date().toLocaleDateString('en-NG', { weekday: 'short', day: 'numeric', month: 'long' })}</Text>
            </View>
          </View>
          <TouchableOpacity onPress={() => navigation.navigate('Settings')} style={{ width: 36, height: 36, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,.1)', borderRadius: 8 }}>
            <Text style={{ fontSize: 16 }}>⚙️</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={C.navy} />}
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
      >
        {/* Stats */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', margin: -4, marginBottom: 8 }}>
          <StatCard label="Total" value={stats.total} />
          <StatCard label="Paid" value={stats.paid} color={C.sage2} bg={C.sage} />
          <StatCard label="Pending" value={stats.pending} color={C.amber2} bg={C.amber} />
          <StatCard label="Revenue" value={'₦' + Number(stats.revenue).toLocaleString('en-NG', { maximumFractionDigits: 0 })} color={C.navy} />
        </View>

        {/* New Invoice CTA */}
        <TouchableOpacity
          onPress={() => navigation.navigate('CreateInvoice')}
          style={{ backgroundColor: C.gold, borderRadius: 12, padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, ...shadow }}
        >
          <View>
            <Text style={{ fontSize: 15, fontWeight: '700', color: C.navy }}>Create New Invoice</Text>
            <Text style={{ fontSize: 12, color: C.navy2, marginTop: 2 }}>Tap to start a new invoice</Text>
          </View>
          <Text style={{ fontSize: 28 }}>📄</Text>
        </TouchableOpacity>

        {/* Recent Invoices */}
        <Text style={[T.h3, { marginBottom: 10 }]}>Recent Invoices</Text>
        {loading && !recent.length
          ? <ActivityIndicator color={C.navy} />
          : recent.length === 0
            ? <Card><Text style={[T.body, { textAlign: 'center', color: C.ink4 }]}>No invoices yet. Create your first one!</Text></Card>
            : recent.map(inv => (
                <TouchableOpacity key={inv.id} onPress={() => navigation.navigate('InvoiceDetail', { invoice: inv })}>
                  <Card style={{ flexDirection: 'row', alignItems: 'center', padding: 14 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={[T.h3, { fontSize: 14 }]}>{inv.customer.name}</Text>
                      <Text style={T.sm}>{inv.num} · {fmtD(inv.date)}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end', gap: 6 }}>
                      <Text style={{ fontSize: 14, fontWeight: '700', color: C.ink }}>{fmt(inv.total)}</Text>
                      <Badge status={inv.status} />
                    </View>
                  </Card>
                </TouchableOpacity>
              ))}
      </ScrollView>
    </View>
  )
}

// ============================================================
// CREATE INVOICE SCREEN
// ============================================================
function CreateInvoiceScreen({ navigation }) {
  const [custName, setCustName]   = useState('')
  const [custEmail, setCustEmail] = useState('')
  const [custPhone, setCustPhone] = useState('')
  const [custAddr, setCustAddr]   = useState('')
  const [invNum, setInvNum]       = useState('')
  const [invDate, setInvDate]     = useState(today())
  const [invDue, setInvDue]       = useState('')
  const [status, setStatus]       = useState('pending')
  const [vat, setVat]             = useState('7.5')
  const [notes, setNotes]         = useState('')
  const [items, setItems]         = useState([{ desc: '', qty: '1', price: '0' }])
  const [saving, setSaving]       = useState(false)

  useEffect(() => {
    nextInvoiceNumber().then(setInvNum).catch(() => setInvNum('INV-0001'))
  }, [])

  const addItem  = () => setItems(prev => [...prev, { desc: '', qty: '1', price: '0' }])
  const removeItem = (i) => setItems(prev => prev.filter((_, idx) => idx !== i))
  const updateItem = (i, key, val) => setItems(prev => prev.map((it, idx) => idx === i ? { ...it, [key]: val } : it))

  const computedItems = items.map(i => ({
    desc: i.desc, qty: parseFloat(i.qty) || 0,
    price: parseFloat(i.price) || 0,
    total: (parseFloat(i.qty) || 0) * (parseFloat(i.price) || 0),
  }))
  const subtotal = computedItems.reduce((s, i) => s + i.total, 0)
  const vatAmt   = subtotal * (parseFloat(vat) || 0) / 100
  const total    = subtotal + vatAmt

  const save = async () => {
    if (!custName.trim()) { Alert.alert('Error', 'Customer name is required'); return }
    const validItems = computedItems.filter(i => i.desc || i.price)
    if (!validItems.length) { Alert.alert('Error', 'Add at least one item'); return }
    setSaving(true)
    try {
      await saveInvoice({
        num: invNum, date: invDate, due: invDue || null, status,
        customer: { name: custName, email: custEmail, phone: custPhone, address: custAddr },
        items: validItems, notes, vat: parseFloat(vat), subtotal, vatAmt, total,
      })
      Alert.alert('Saved', `Invoice ${invNum} saved successfully`)
      navigation.goBack()
    } catch (e) {
      Alert.alert('Error', e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={{ flex: 1, backgroundColor: C.surface }} contentContainerStyle={{ padding: 16, paddingBottom: 48 }}>

        <Card>
          <Text style={[T.h3, { marginBottom: 14 }]}>Customer Details</Text>
          <Field label="Customer Name *" value={custName} onChangeText={setCustName} placeholder="e.g. Amaka Traders" />
          <Field label="Email" value={custEmail} onChangeText={setCustEmail} placeholder="customer@email.com" keyboardType="email-address" />
          <Field label="Phone" value={custPhone} onChangeText={setCustPhone} placeholder="+234 803 000 0000" keyboardType="phone-pad" />
          <Field label="Address" value={custAddr} onChangeText={setCustAddr} placeholder="Street, City, State" />
        </Card>

        <Card>
          <Text style={[T.h3, { marginBottom: 14 }]}>Invoice Details</Text>
          <Field label="Invoice Number" value={invNum} onChangeText={setInvNum} placeholder="INV-0001" />
          <Field label="Invoice Date (YYYY-MM-DD)" value={invDate} onChangeText={setInvDate} placeholder={today()} />
          <Field label="Due Date (YYYY-MM-DD)" value={invDue} onChangeText={setInvDue} placeholder="optional" />
          <Text style={[T.label, { marginBottom: 5 }]}>Status</Text>
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
            {['pending', 'paid', 'overdue'].map(s => (
              <TouchableOpacity key={s} onPress={() => setStatus(s)}
                style={{ flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center',
                  backgroundColor: status === s ? C.navy : C.surface2,
                  borderWidth: 1, borderColor: status === s ? C.navy : C.surface3 }}>
                <Text style={{ fontSize: 12, fontWeight: '600', color: status === s ? C.white : C.ink3, textTransform: 'capitalize' }}>{s}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Field label="VAT (%)" value={vat} onChangeText={setVat} keyboardType="decimal-pad" />
        </Card>

        <Card>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <Text style={T.h3}>Line Items</Text>
            <TouchableOpacity onPress={addItem} style={{ backgroundColor: C.surface2, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 }}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: C.navy }}>+ Add item</Text>
            </TouchableOpacity>
          </View>

          {items.map((item, i) => (
            <View key={i} style={{ backgroundColor: C.surface2, borderRadius: 8, padding: 12, marginBottom: 10 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <Text style={[T.sm, { fontWeight: '600' }]}>Item {i + 1}</Text>
                {items.length > 1 && (
                  <TouchableOpacity onPress={() => removeItem(i)}>
                    <Text style={{ color: C.rose2, fontSize: 13, fontWeight: '600' }}>Remove</Text>
                  </TouchableOpacity>
                )}
              </View>
              <TextInput
                value={item.desc}
                onChangeText={v => updateItem(i, 'desc', v)}
                placeholder="Description"
                placeholderTextColor={C.ink4}
                style={{ borderWidth: 1, borderColor: C.surface3, borderRadius: 6, padding: 8, fontSize: 13, color: C.ink, backgroundColor: C.white, marginBottom: 8 }}
              />
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <View style={{ flex: 1 }}>
                  <Text style={[T.label, { marginBottom: 4 }]}>Qty</Text>
                  <TextInput value={item.qty} onChangeText={v => updateItem(i, 'qty', v)} keyboardType="decimal-pad"
                    style={{ borderWidth: 1, borderColor: C.surface3, borderRadius: 6, padding: 8, fontSize: 13, color: C.ink, backgroundColor: C.white }} />
                </View>
                <View style={{ flex: 2 }}>
                  <Text style={[T.label, { marginBottom: 4 }]}>Unit Price (₦)</Text>
                  <TextInput value={item.price} onChangeText={v => updateItem(i, 'price', v)} keyboardType="decimal-pad"
                    style={{ borderWidth: 1, borderColor: C.surface3, borderRadius: 6, padding: 8, fontSize: 13, color: C.ink, backgroundColor: C.white }} />
                </View>
                <View style={{ flex: 2 }}>
                  <Text style={[T.label, { marginBottom: 4 }]}>Total</Text>
                  <View style={{ borderWidth: 1, borderColor: C.surface3, borderRadius: 6, padding: 8, backgroundColor: C.surface3 }}>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: C.ink }}>{fmt((parseFloat(item.qty)||0)*(parseFloat(item.price)||0))}</Text>
                  </View>
                </View>
              </View>
            </View>
          ))}

          {/* Totals */}
          <View style={{ backgroundColor: C.navy, borderRadius: 10, padding: 16, marginTop: 4 }}>
            {[['Subtotal', fmt(subtotal)], [`VAT (${vat}%)`, fmt(vatAmt)]].map(([l, v]) => (
              <View key={l} style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                <Text style={{ color: 'rgba(255,255,255,.6)', fontSize: 13 }}>{l}</Text>
                <Text style={{ color: 'rgba(255,255,255,.85)', fontSize: 13, fontWeight: '500' }}>{v}</Text>
              </View>
            ))}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,.15)', paddingTop: 10, marginTop: 4 }}>
              <Text style={{ color: C.white, fontSize: 16, fontWeight: '700' }}>Total</Text>
              <Text style={{ color: C.gold, fontSize: 18, fontWeight: '700' }}>{fmt(total)}</Text>
            </View>
          </View>
        </Card>

        <Card>
          <Text style={[T.h3, { marginBottom: 14 }]}>Notes & Terms</Text>
          <Field label="Payment terms / notes" value={notes} onChangeText={setNotes} placeholder="e.g. Payment within 7 days." multiline />
        </Card>

        <Btn label="Save Invoice" onPress={save} variant="primary" loading={saving} icon="💾" />
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

// ============================================================
// INVOICE DETAIL SCREEN
// ============================================================
function InvoiceDetailScreen({ route, navigation }) {
  const [invoice, setInvoice] = useState(route.params.invoice)
  const [printing, setPrinting] = useState(false)
  const [emailing, setEmailing] = useState(false)
  const [emailTo, setEmailTo]   = useState(invoice.customer.email ?? '')
  const [emailMsg, setEmailMsg] = useState('')
  const [emailModal, setEmailModal] = useState(false)

  const printPDF = async () => {
    setPrinting(true)
    try {
      const html = buildInvoiceHtml(invoice)
      const { uri } = await Print.printToFileAsync({ html })
      await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: `Invoice ${invoice.num}` })
    } catch (e) { Alert.alert('Error', e.message) }
    finally { setPrinting(false) }
  }

  const doEmail = async () => {
    if (!emailTo) { Alert.alert('Error', 'Enter recipient email'); return }
    setEmailing(true)
    try {
      await sendInvoiceEmail(invoice.id, emailTo, emailMsg)
      setEmailModal(false)
      Alert.alert('Sent', `Invoice emailed to ${emailTo}`)
    } catch (e) { Alert.alert('Error', e.message) }
    finally { setEmailing(false) }
  }

  const changeStatus = async (s) => {
    try {
      await updateInvoiceStatus(invoice.id, s)
      setInvoice(prev => ({ ...prev, status: s }))
    } catch (e) { Alert.alert('Error', e.message) }
  }

  const doDelete = () => Alert.alert('Delete Invoice', `Delete ${invoice.num}?`, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: async () => {
      try { await deleteInvoice(invoice.id); navigation.goBack() }
      catch (e) { Alert.alert('Error', e.message) }
    }},
  ])

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.surface }} contentContainerStyle={{ padding: 16, paddingBottom: 48 }}>

      {/* Header card */}
      <View style={{ backgroundColor: C.navy, borderRadius: 14, padding: 20, marginBottom: 14 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View>
            <Text style={{ fontSize: 11, color: 'rgba(255,255,255,.4)', letterSpacing: 0.8, textTransform: 'uppercase' }}>Invoice</Text>
            <Text style={{ fontSize: 24, fontWeight: '700', color: C.gold, marginTop: 2 }}>{invoice.num}</Text>
          </View>
          <Badge status={invoice.status} />
        </View>
        <View style={{ flexDirection: 'row', marginTop: 16, gap: 20 }}>
          {[['Customer', invoice.customer.name], ['Date', fmtD(invoice.date)], ['Due', fmtD(invoice.due)]].map(([l, v]) => (
            <View key={l}>
              <Text style={{ fontSize: 10, color: 'rgba(255,255,255,.4)', textTransform: 'uppercase', letterSpacing: 0.6 }}>{l}</Text>
              <Text style={{ fontSize: 13, color: C.white, fontWeight: '500', marginTop: 2 }}>{v}</Text>
            </View>
          ))}
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,.12)' }}>
          <Text style={{ color: 'rgba(255,255,255,.6)', fontSize: 14 }}>Total</Text>
          <Text style={{ color: C.gold, fontSize: 20, fontWeight: '700' }}>{fmt(invoice.total)}</Text>
        </View>
      </View>

      {/* Items */}
      <Card>
        <Text style={[T.h3, { marginBottom: 12 }]}>Items</Text>
        {invoice.items.map((item, i) => (
          <View key={i} style={{ flexDirection: 'row', paddingVertical: 9, borderBottomWidth: i < invoice.items.length - 1 ? 1 : 0, borderBottomColor: C.surface3 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 13, fontWeight: '500', color: C.ink }}>{item.desc}</Text>
              <Text style={T.sm}>{item.qty} × {fmt(item.price)}</Text>
            </View>
            <Text style={{ fontSize: 13, fontWeight: '700', color: C.ink }}>{fmt(item.total)}</Text>
          </View>
        ))}
        <View style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: C.surface3 }}>
          {[['Subtotal', fmt(invoice.subtotal)], [`VAT (${invoice.vat}%)`, fmt(invoice.vatAmt)]].map(([l, v]) => (
            <View key={l} style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
              <Text style={T.sm}>{l}</Text>
              <Text style={T.sm}>{v}</Text>
            </View>
          ))}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
            <Text style={{ fontSize: 15, fontWeight: '700', color: C.ink }}>Total</Text>
            <Text style={{ fontSize: 15, fontWeight: '700', color: C.navy }}>{fmt(invoice.total)}</Text>
          </View>
        </View>
      </Card>

      {/* Status change */}
      <Card>
        <Text style={[T.h3, { marginBottom: 12 }]}>Update Status</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {['pending', 'paid', 'overdue'].map(s => (
            <TouchableOpacity key={s} onPress={() => changeStatus(s)}
              style={{ flex: 1, paddingVertical: 9, borderRadius: 8, alignItems: 'center',
                backgroundColor: invoice.status === s ? C.navy : C.surface2,
                borderWidth: 1, borderColor: invoice.status === s ? C.navy : C.surface3 }}>
              <Text style={{ fontSize: 12, fontWeight: '600', textTransform: 'capitalize', color: invoice.status === s ? C.white : C.ink3 }}>{s}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </Card>

      {/* Actions */}
      <View style={{ gap: 10 }}>
        <Btn label="Export as PDF" onPress={printPDF} variant="primary" loading={printing} icon="📥" />
        <Btn label="Email to Customer" onPress={() => setEmailModal(true)} icon="📧" />
        <Btn label="Delete Invoice" onPress={doDelete} variant="danger" icon="🗑" />
      </View>

      {/* Email modal */}
      <Modal visible={emailModal} animationType="slide" transparent>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,.5)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: C.white, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 40 }}>
            <Text style={[T.h2, { marginBottom: 4 }]}>Email Invoice</Text>
            <Text style={[T.sm, { marginBottom: 20 }]}>Send this invoice directly to your customer</Text>
            <Field label="Recipient Email" value={emailTo} onChangeText={setEmailTo} placeholder="customer@email.com" keyboardType="email-address" />
            <Field label="Message (optional)" value={emailMsg} onChangeText={setEmailMsg} placeholder="Hi, please find your invoice attached." multiline />
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
              <Btn label="Cancel" onPress={() => setEmailModal(false)} style={{ flex: 1 }} />
              <Btn label="Send" onPress={doEmail} variant="primary" loading={emailing} style={{ flex: 2 }} />
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  )
}

// ============================================================
// HISTORY SCREEN
// ============================================================
function HistoryScreen({ navigation }) {
  const [invoices, setInvoices] = useState([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [status, setStatus]     = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try { setInvoices(await getInvoices({ status: status || undefined, search: search || undefined })) }
    catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [status, search])

  useEffect(() => { load() }, [load])

  return (
    <View style={{ flex: 1, backgroundColor: C.surface }}>
      <View style={{ backgroundColor: C.white, padding: 14, borderBottomWidth: 1, borderBottomColor: C.surface3 }}>
        <TextInput
          value={search} onChangeText={setSearch} placeholder="Search customer or invoice..."
          placeholderTextColor={C.ink4}
          style={{ backgroundColor: C.surface2, borderRadius: 8, padding: 10, fontSize: 13, color: C.ink, marginBottom: 10 }}
        />
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {[['All', ''], ['Pending', 'pending'], ['Paid', 'paid'], ['Overdue', 'overdue']].map(([l, v]) => (
              <TouchableOpacity key={v} onPress={() => setStatus(v)}
                style={{ paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, backgroundColor: status === v ? C.navy : C.surface2, borderWidth: 1, borderColor: status === v ? C.navy : C.surface3 }}>
                <Text style={{ fontSize: 12, fontWeight: '600', color: status === v ? C.white : C.ink3 }}>{l}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      {loading
        ? <ActivityIndicator color={C.navy} style={{ marginTop: 40 }} />
        : <FlatList
            data={invoices}
            keyExtractor={i => i.id}
            contentContainerStyle={{ padding: 14, paddingBottom: 32 }}
            refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={C.navy} />}
            ListEmptyComponent={
              <View style={{ alignItems: 'center', padding: 48 }}>
                <Text style={{ fontSize: 32, marginBottom: 8 }}>📋</Text>
                <Text style={[T.h3, { color: C.ink4 }]}>No invoices found</Text>
              </View>
            }
            renderItem={({ item: inv }) => (
              <TouchableOpacity onPress={() => navigation.navigate('InvoiceDetail', { invoice: inv })}>
                <Card style={{ flexDirection: 'row', alignItems: 'center', padding: 14 }}>
                  <View style={{ width: 40, height: 40, backgroundColor: C.surface2, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                    <Text style={{ fontSize: 18 }}>📄</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: C.ink }}>{inv.customer.name}</Text>
                    <Text style={T.sm}>{inv.num} · {fmtD(inv.date)}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 5 }}>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: C.ink }}>{fmt(inv.total)}</Text>
                    <Badge status={inv.status} />
                  </View>
                </Card>
              </TouchableOpacity>
            )}
          />}
    </View>
  )
}

// ============================================================
// SETTINGS SCREEN
// ============================================================
function SettingsScreen() {
  const [profile, setProfile] = useState(null)
  const [saving, setSaving]   = useState(false)
  const [uploading, setUploading] = useState(false)
  const [form, setForm]       = useState({ company_name: '', email: '', phone: '', address: '', rc_number: '', bank_name: '', bank_account: '', account_name: '', default_vat: '7.5', default_terms: '' })

  useEffect(() => {
    getProfile().then(p => {
      if (p) { setProfile(p); setForm({ ...form, ...p, default_vat: String(p.default_vat ?? 7.5) }) }
    })
  }, [])

  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }))

  const save = async () => {
    setSaving(true)
    try { await updateProfile({ ...form, default_vat: parseFloat(form.default_vat) || 7.5 }); Alert.alert('Saved', 'Settings updated') }
    catch (e) { Alert.alert('Error', e.message) }
    finally { setSaving(false) }
  }

  const pickLogo = async () => {
    const res = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!res.granted) { Alert.alert('Permission required', 'Allow photo access to upload a logo'); return }
    const pick = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8 })
    if (!pick.canceled && pick.assets[0]) {
      setUploading(true)
      try {
        const asset = pick.assets[0]
        const file = { uri: asset.uri, name: 'logo.jpg', type: 'image/jpeg' }
        const url = await uploadLogo(file)
        setProfile(prev => ({ ...prev, logo_url: url }))
        Alert.alert('Done', 'Logo uploaded')
      } catch (e) { Alert.alert('Error', e.message) }
      finally { setUploading(false) }
    }
  }

  const doSignOut = () => Alert.alert('Sign out', 'Sign out of Jaila Globals?', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Sign out', style: 'destructive', onPress: () => signOut().catch(console.error) },
  ])

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.surface }} contentContainerStyle={{ padding: 16, paddingBottom: 48 }}>

      {/* Logo */}
      <Card style={{ alignItems: 'center', paddingVertical: 20 }}>
        {profile?.logo_url
          ? <Image source={{ uri: profile.logo_url }} style={{ width: 80, height: 80, borderRadius: 14, marginBottom: 12 }} />
          : <View style={{ width: 80, height: 80, backgroundColor: C.navy, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
              <Text style={{ fontSize: 32, fontWeight: '700', color: C.gold }}>{form.company_name?.charAt(0) || 'J'}</Text>
            </View>}
        <Btn label={uploading ? 'Uploading…' : 'Change Logo'} onPress={pickLogo} loading={uploading} />
      </Card>

      <Card>
        <Text style={[T.h3, { marginBottom: 14 }]}>Company Information</Text>
        <Field label="Company Name" value={form.company_name} onChangeText={v => set('company_name', v)} placeholder="Jaila Globals" />
        <Field label="RC / Business Number" value={form.rc_number} onChangeText={v => set('rc_number', v)} placeholder="RC1234567" />
        <Field label="Email" value={form.email} onChangeText={v => set('email', v)} placeholder="info@company.com" keyboardType="email-address" />
        <Field label="Phone" value={form.phone} onChangeText={v => set('phone', v)} placeholder="+234 ..." keyboardType="phone-pad" />
        <Field label="Address" value={form.address} onChangeText={v => set('address', v)} placeholder="Street, City, State" />
        <Field label="Default VAT (%)" value={form.default_vat} onChangeText={v => set('default_vat', v)} keyboardType="decimal-pad" />
        <Field label="Default Terms" value={form.default_terms} onChangeText={v => set('default_terms', v)} placeholder="Payment within 7 days." multiline />
      </Card>

      <Card>
        <Text style={[T.h3, { marginBottom: 14 }]}>Bank Details</Text>
        <Field label="Bank Name" value={form.bank_name} onChangeText={v => set('bank_name', v)} placeholder="GTBank" />
        <Field label="Account Number" value={form.bank_account} onChangeText={v => set('bank_account', v)} placeholder="0123456789" keyboardType="number-pad" />
        <Field label="Account Name" value={form.account_name} onChangeText={v => set('account_name', v)} placeholder="Jaila Globals Limited" />
      </Card>

      <Btn label="Save Settings" onPress={save} variant="primary" loading={saving} icon="✓" style={{ marginBottom: 12 }} />
      <Btn label="Sign Out" onPress={doSignOut} variant="danger" />
    </ScrollView>
  )
}

// ============================================================
// HTML invoice builder for PDF export
// ============================================================
function buildInvoiceHtml(inv) {
  const fmt  = n => '₦' + Number(n).toLocaleString('en-NG', { minimumFractionDigits: 2 })
  const fmtD = d => d ? new Date(d).toLocaleDateString('en-NG', { day: '2-digit', month: 'long', year: 'numeric' }) : '—'
  const rows = (inv.items ?? []).map(i =>
    `<tr><td>${i.desc}</td><td style="text-align:center">${i.qty}</td><td style="text-align:right">${fmt(i.price)}</td><td style="text-align:right;font-weight:700">${fmt(i.total)}</td></tr>`
  ).join('')
  return `<!DOCTYPE html><html><head><meta charset="UTF-8">
  <style>
    body{font-family:Arial,sans-serif;padding:40px;color:#111}
    .header{background:#0A1628;color:#fff;padding:28px 32px;display:flex;justify-content:space-between;margin:-40px -40px 28px;border-radius:0}
    .inv-num{color:#D4A849;font-size:24px;font-weight:700}
    table{width:100%;border-collapse:collapse;margin-bottom:20px}
    th{background:#f3f4f6;padding:9px 12px;font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:#6b7280;text-align:left}
    td{padding:9px 12px;border-bottom:1px solid #f0f0f0;font-size:13px}
    .total-row{display:flex;justify-content:space-between;font-size:13px;padding:4px 0;color:#6b7280}
    .grand{font-size:16px;font-weight:700;color:#0A1628;border-top:2px solid #0A1628;padding-top:10px;margin-top:6px}
    .sig{border-bottom:1px solid #ccc;margin-top:40px;width:180px;display:inline-block}
  </style></head><body>
  <div class="header">
    <div><div style="font-size:20px;font-weight:700">${inv.settings?.name ?? 'Jaila Globals'}</div><div style="opacity:.5;font-size:12px">${inv.settings?.address ?? ''}</div></div>
    <div style="text-align:right"><div style="opacity:.4;font-size:11px;text-transform:uppercase">Invoice</div><div class="inv-num">${inv.num}</div></div>
  </div>
  <table style="margin-bottom:24px"><tr>
    <td><b style="font-size:11px;color:#9ca3af;text-transform:uppercase">Bill to</b><br><b>${inv.customer.name}</b><br><span style="color:#6b7280;font-size:12px">${inv.customer.address ?? ''}<br>${inv.customer.phone ?? ''}<br>${inv.customer.email ?? ''}</span></td>
    <td style="text-align:right"><b style="font-size:11px;color:#9ca3af;text-transform:uppercase">Details</b><br>Date: ${fmtD(inv.date)}<br>Due: ${fmtD(inv.due)}<br>Status: ${inv.status.toUpperCase()}</td>
  </tr></table>
  <table><thead><tr><th>Description</th><th>Qty</th><th style="text-align:right">Unit Price</th><th style="text-align:right">Total</th></tr></thead><tbody>${rows}</tbody></table>
  <div style="display:flex;justify-content:flex-end"><div style="min-width:220px">
    <div class="total-row"><span>Subtotal</span><span>${fmt(inv.subtotal)}</span></div>
    <div class="total-row"><span>VAT (${inv.vat}%)</span><span>${fmt(inv.vatAmt)}</span></div>
    <div class="total-row grand"><span>Total</span><span>${fmt(inv.total)}</span></div>
  </div></div>
  ${inv.notes ? `<p style="font-size:12px;color:#6b7280;margin-top:20px"><b>Terms:</b> ${inv.notes}</p>` : ''}
  <div style="margin-top:40px;display:flex;justify-content:space-between">
    <div><div class="sig"></div><div style="font-size:11px;color:#9ca3af;margin-top:4px">Authorized signature — ${inv.settings?.name ?? ''}</div></div>
    <div><div class="sig"></div><div style="font-size:11px;color:#9ca3af;margin-top:4px">Customer signature — ${inv.customer.name}</div></div>
  </div>
  </body></html>`
}

// ============================================================
// NAVIGATION
// ============================================================
const Tab   = createBottomTabNavigator()
const Stack = createStackNavigator()

function HomeTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: { backgroundColor: C.white, borderTopColor: C.surface3, height: 58, paddingBottom: 8 },
        tabBarActiveTintColor: C.navy,
        tabBarInactiveTintColor: C.ink4,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        tabBarIcon: ({ focused }) => {
          const icons = { Dashboard: '🏠', History: '📋', Settings: '⚙️' }
          return <Text style={{ fontSize: focused ? 22 : 20 }}>{icons[route.name]}</Text>
        },
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="History" component={HistoryScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  )
}

function AppNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerStyle: { backgroundColor: C.white, elevation: 0, shadowOpacity: 0 }, headerTintColor: C.navy, headerTitleStyle: { fontWeight: '700' } }}>
      <Stack.Screen name="Home" component={HomeTabs} options={{ headerShown: false }} />
      <Stack.Screen name="CreateInvoice" component={CreateInvoiceScreen} options={{ title: 'New Invoice' }} />
      <Stack.Screen name="InvoiceDetail" component={InvoiceDetailScreen} options={({ route }) => ({ title: route.params.invoice.num })} />
    </Stack.Navigator>
  )
}

// ============================================================
// ROOT APP
// ============================================================
export default function App() {
  const [session, setSession] = useState(undefined) // undefined = loading

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_evt, s) => setSession(s))
    return () => subscription.unsubscribe()
  }, [])

  if (session === undefined) {
    return (
      <View style={{ flex: 1, backgroundColor: C.navy, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={C.gold} size="large" />
      </View>
    )
  }

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" backgroundColor={C.surface} />
      <NavigationContainer>
        {session ? <AppNavigator /> : <AuthScreen onAuth={() => {}} />}
      </NavigationContainer>
    </SafeAreaProvider>
  )
}
