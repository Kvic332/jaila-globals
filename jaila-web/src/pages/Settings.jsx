import React, { useState, useEffect, useRef } from 'react'
import { getProfile, updateProfile, uploadLogo } from '../lib/supabase'
import { C, Card, Btn, Field, toast } from '../components/ui'

export default function Settings() {
  const [form, setForm]       = useState({ company_name: '', rc_number: '', email: '', phone: '', address: '', bank_name: '', bank_account: '', account_name: '', default_vat: '7.5', default_terms: '' })
  const [saving, setSaving]   = useState(false)
  const [uploading, setUploading] = useState(false)
  const [logoUrl, setLogoUrl] = useState(null)
  const fileRef = useRef()

  useEffect(() => {
    getProfile().then(p => {
      if (p) {
        setLogoUrl(p.logo_url)
        setForm({
          company_name:  p.company_name  ?? '',
          rc_number:     p.rc_number     ?? '',
          email:         p.email         ?? '',
          phone:         p.phone         ?? '',
          address:       p.address       ?? '',
          bank_name:     p.bank_name     ?? '',
          bank_account:  p.bank_account  ?? '',
          account_name:  p.account_name  ?? '',
          default_vat:   String(p.default_vat  ?? '7.5'),
          default_terms: p.default_terms ?? '',
        })
      }
    })
  }, [])

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const save = async () => {
    setSaving(true)
    try {
      await updateProfile({ ...form, default_vat: parseFloat(form.default_vat) || 7.5 })
      toast.success('Settings saved!')
    } catch (e) { toast.error(e.message) }
    finally { setSaving(false) }
  }

  const handleLogoChange = async e => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) { toast.error('Logo must be under 2MB'); return }
    setUploading(true)
    try {
      const url = await uploadLogo(file)
      setLogoUrl(url + '?t=' + Date.now())
      toast.success('Logo uploaded!')
    } catch (e) { toast.error(e.message) }
    finally { setUploading(false) }
  }

  return (
    <div style={{ padding: '32px 36px', maxWidth: 760, animation: 'fadeIn .2s ease' }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#111827', fontFamily: "'DM Serif Display', serif" }}>Settings</h1>
        <p style={{ fontSize: 13, color: C.ink4, marginTop: 3 }}>Manage your company profile and invoice defaults</p>
      </div>

      {/* Logo */}
      <Card style={{ marginBottom: 20 }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: C.ink, marginBottom: 18 }}>Company Logo</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div
            onClick={() => fileRef.current?.click()}
            style={{ width: 80, height: 80, borderRadius: 16, background: logoUrl ? 'transparent' : C.navy, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', overflow: 'hidden', border: `2px dashed ${C.surface3}`, flexShrink: 0 }}>
            {logoUrl
              ? <img src={logoUrl} alt="Logo" style={{ width: 80, height: 80, objectFit: 'cover' }} />
              : <span style={{ fontSize: 28, fontWeight: 700, color: C.gold, fontFamily: "'DM Serif Display', serif" }}>{form.company_name?.charAt(0) || 'J'}</span>}
          </div>
          <div>
            <Btn variant="outline" loading={uploading} onClick={() => fileRef.current?.click()} icon="📷">
              {uploading ? 'Uploading…' : 'Upload Logo'}
            </Btn>
            <p style={{ fontSize: 12, color: C.ink4, marginTop: 6 }}>PNG, JPG or SVG · max 2MB · recommended 400×400px</p>
          </div>
          <input ref={fileRef} type="file" accept="image/*" onChange={handleLogoChange} style={{ display: 'none' }} />
        </div>
      </Card>

      {/* Company info */}
      <Card style={{ marginBottom: 20 }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: C.ink, marginBottom: 18 }}>Company Information</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 20px' }}>
          <Field label="Company Name" value={form.company_name} onChange={v => set('company_name', v)} placeholder="Jaila Globals Ltd" />
          <Field label="RC / Business Number" value={form.rc_number} onChange={v => set('rc_number', v)} placeholder="RC1234567" />
          <Field label="Email Address" value={form.email} onChange={v => set('email', v)} placeholder="info@company.com" type="email" />
          <Field label="Phone Number" value={form.phone} onChange={v => set('phone', v)} placeholder="+234 803 000 0000" type="tel" />
        </div>
        <Field label="Business Address" value={form.address} onChange={v => set('address', v)} placeholder="Street, City, State" multiline />
      </Card>

      {/* Bank details */}
      <Card style={{ marginBottom: 20 }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: C.ink, marginBottom: 18 }}>Bank Details</h3>
        <p style={{ fontSize: 13, color: C.ink4, marginBottom: 16 }}>These appear on every invoice for customer payment.</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 20px' }}>
          <Field label="Bank Name" value={form.bank_name} onChange={v => set('bank_name', v)} placeholder="GTBank / Access / Zenith…" />
          <Field label="Account Number" value={form.bank_account} onChange={v => set('bank_account', v)} placeholder="0123456789" />
        </div>
        <Field label="Account Name" value={form.account_name} onChange={v => set('account_name', v)} placeholder="Jaila Globals Limited" />
      </Card>

      {/* Invoice defaults */}
      <Card style={{ marginBottom: 28 }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: C.ink, marginBottom: 18 }}>Invoice Defaults</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 3fr', gap: '0 20px' }}>
          <Field label="Default VAT (%)" value={form.default_vat} onChange={v => set('default_vat', v)} placeholder="7.5" type="number" />
          <div />
        </div>
        <Field label="Default Terms & Conditions" value={form.default_terms} onChange={v => set('default_terms', v)} placeholder="e.g. Payment due within 7 days. Goods once sold are not returnable." multiline />
      </Card>

      <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
        <Btn variant="primary" icon="✓" onClick={save} loading={saving}>Save Settings</Btn>
      </div>
    </div>
  )
}
