import React from 'react'

// ── Design tokens ─────────────────────────────────────────────
export const C = {
  navy:    '#0A1628',
  navy2:   '#162544',
  gold:    '#D4A849',
  gold2:   '#B8943D',
  ink:     '#111827',
  ink2:    '#374151',
  ink3:    '#6B7280',
  ink4:    '#9CA3AF',
  surface: '#FAFAF8',
  surface2:'#F3F4F6',
  surface3:'#E5E7EB',
  white:   '#FFFFFF',
  sage:    '#D1FAE5',
  sage2:   '#065F46',
  amber:   '#FEF3C7',
  amber2:  '#92400E',
  rose:    '#FEE2E2',
  rose2:   '#991B1B',
}

const shadow = { boxShadow: '0 1px 3px rgba(0,0,0,.07), 0 1px 2px rgba(0,0,0,.05)' }
const shadowMd = { boxShadow: '0 4px 16px rgba(0,0,0,.08)' }

// ── Button ─────────────────────────────────────────────────────
const btnBase = {
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  gap: 6, padding: '9px 18px', borderRadius: 8, fontFamily: 'Inter, sans-serif',
  fontSize: 13, fontWeight: 600, cursor: 'pointer', border: '1px solid transparent',
  transition: 'all .15s', whiteSpace: 'nowrap', lineHeight: 1,
}

export function Btn({ children, onClick, variant = 'outline', icon, loading, disabled, style, type = 'button', size }) {
  const sm = size === 'sm'
  const variants = {
    primary: { backgroundColor: C.navy, color: C.white, borderColor: C.navy },
    gold:    { backgroundColor: C.gold, color: C.navy,  borderColor: C.gold },
    outline: { backgroundColor: C.white, color: C.ink2, borderColor: C.surface3 },
    ghost:   { backgroundColor: 'transparent', color: C.ink3, borderColor: 'transparent' },
    danger:  { backgroundColor: C.white, color: C.rose2, borderColor: '#FECACA' },
  }
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={loading || disabled}
      style={{
        ...btnBase,
        ...(sm ? { padding: '6px 12px', fontSize: 12 } : {}),
        ...variants[variant],
        ...(loading || disabled ? { opacity: .6, cursor: 'default' } : {}),
        ...style,
      }}
    >
      {loading
        ? <span style={{ width: 14, height: 14, border: `2px solid ${variant === 'primary' || variant === 'gold' ? 'rgba(255,255,255,.4)' : C.ink3}`, borderTopColor: 'transparent', borderRadius: '50%', display: 'inline-block', animation: 'spin .6s linear infinite' }} />
        : icon && <span style={{ fontSize: sm ? 13 : 15 }}>{icon}</span>}
      {children}
    </button>
  )
}

// ── Card ───────────────────────────────────────────────────────
export function Card({ children, style, padding }) {
  return (
    <div style={{
      backgroundColor: C.white, borderRadius: 12,
      padding: padding ?? 24,
      border: `1px solid ${C.surface3}`,
      ...shadow, ...style,
    }}>
      {children}
    </div>
  )
}

// ── Badge ──────────────────────────────────────────────────────
const statusMeta = {
  paid:      { bg: C.sage,       text: C.sage2  },
  pending:   { bg: C.amber,      text: C.amber2 },
  overdue:   { bg: C.rose,       text: C.rose2  },
  'part-paid': { bg: '#EDE9FE',  text: '#5B21B6' },
}

export function Badge({ status }) {
  const s = statusMeta[status] ?? statusMeta.pending
  return (
    <span style={{ backgroundColor: s.bg, color: s.text, padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, letterSpacing: .3, whiteSpace: 'nowrap' }}>
      ● {status.toUpperCase()}
    </span>
  )
}

// ── Input / Field ──────────────────────────────────────────────
export function Field({ label, value, onChange, placeholder, type = 'text', multiline, disabled, required, style }) {
  const inputStyle = {
    width: '100%', padding: '9px 12px',
    border: `1.5px solid ${C.surface3}`, borderRadius: 8,
    fontSize: 14, color: C.ink, backgroundColor: disabled ? C.surface2 : C.white,
    outline: 'none', fontFamily: 'Inter, sans-serif',
    resize: multiline ? 'vertical' : 'none',
    transition: 'border-color .15s',
    ...style,
  }
  return (
    <div style={{ marginBottom: 16 }}>
      {label && (
        <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: C.ink3, textTransform: 'uppercase', letterSpacing: .6, marginBottom: 5 }}>
          {label}{required && <span style={{ color: C.rose2, marginLeft: 2 }}>*</span>}
        </label>
      )}
      {multiline
        ? <textarea rows={3} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} disabled={disabled} style={{ ...inputStyle, resize: 'vertical', minHeight: 72 }} />
        : <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} disabled={disabled} required={required} style={inputStyle} />}
    </div>
  )
}

// ── Select ─────────────────────────────────────────────────────
export function Select({ label, value, onChange, options }) {
  return (
    <div style={{ marginBottom: 16 }}>
      {label && <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: C.ink3, textTransform: 'uppercase', letterSpacing: .6, marginBottom: 5 }}>{label}</label>}
      <select value={value} onChange={e => onChange(e.target.value)}
        style={{ width: '100%', padding: '9px 12px', border: `1.5px solid ${C.surface3}`, borderRadius: 8, fontSize: 14, color: C.ink, backgroundColor: C.white, outline: 'none', fontFamily: 'Inter, sans-serif', cursor: 'pointer' }}>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  )
}

// ── Stat card ──────────────────────────────────────────────────
export function StatCard({ label, value, sub, accent, icon }) {
  return (
    <Card style={{ flex: 1, minWidth: 0 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: C.ink4, textTransform: 'uppercase', letterSpacing: .6, marginBottom: 8 }}>{label}</div>
          <div style={{ fontSize: 26, fontWeight: 700, color: accent ?? C.ink, lineHeight: 1 }}>{value}</div>
          {sub && <div style={{ fontSize: 12, color: C.ink4, marginTop: 4 }}>{sub}</div>}
        </div>
        {icon && <span style={{ fontSize: 22, opacity: .7 }}>{icon}</span>}
      </div>
    </Card>
  )
}

// ── Empty state ────────────────────────────────────────────────
export function Empty({ icon = '📋', title, sub }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '64px 24px', color: C.ink4 }}>
      <span style={{ fontSize: 40, marginBottom: 12 }}>{icon}</span>
      <div style={{ fontSize: 15, fontWeight: 600, color: C.ink3, marginBottom: 4 }}>{title}</div>
      {sub && <div style={{ fontSize: 13 }}>{sub}</div>}
    </div>
  )
}

// ── Modal ──────────────────────────────────────────────────────
export function Modal({ open, onClose, title, children, width = 480 }) {
  if (!open) return null
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: C.white, borderRadius: 16, width: '100%', maxWidth: width, ...shadowMd, animation: 'modalIn .2s ease' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: `1px solid ${C.surface3}` }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: C.ink }}>{title}</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: C.ink3, lineHeight: 1 }}>×</button>
        </div>
        <div style={{ padding: 24 }}>{children}</div>
      </div>
    </div>
  )
}

// ── Toast ──────────────────────────────────────────────────────
let _setToast = null
export function Toaster() {
  const [toast, setToast] = React.useState(null)
  _setToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3200)
  }
  if (!toast) return null
  const colors = { success: [C.sage, C.sage2], error: [C.rose, C.rose2], info: ['#EFF6FF', '#1D4ED8'] }
  const [bg, text] = colors[toast.type] ?? colors.info
  return (
    <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 9999, backgroundColor: bg, color: text, padding: '12px 20px', borderRadius: 10, fontSize: 14, fontWeight: 500, ...shadowMd, maxWidth: 320, animation: 'toastIn .2s ease' }}>
      {toast.msg}
    </div>
  )
}
export const toast = {
  success: msg => _setToast?.(msg, 'success'),
  error:   msg => _setToast?.(msg, 'error'),
  info:    msg => _setToast?.(msg, 'info'),
}

// ── Global keyframe styles ─────────────────────────────────────
export function GlobalStyles() {
  return (
    <style>{`
      @keyframes spin    { to { transform: rotate(360deg); } }
      @keyframes modalIn { from { opacity: 0; transform: scale(.96); } to { opacity: 1; transform: scale(1); } }
      @keyframes toastIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
      @keyframes fadeIn  { from { opacity: 0; } to { opacity: 1; } }
      input:focus, textarea:focus, select:focus { border-color: #0A1628 !important; box-shadow: 0 0 0 3px rgba(10,22,40,.08); }
      button:hover { filter: brightness(.96); }
    `}</style>
  )
}
