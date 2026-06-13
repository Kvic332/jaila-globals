import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { signIn, signUp } from '../lib/supabase'
import { C, Btn, Field } from '../components/ui'

export default function Auth() {
  const [mode, setMode]       = useState('login')
  const [email, setEmail]     = useState('')
  const [password, setPassword] = useState('')
  const [company, setCompany] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const navigate = useNavigate()

  const submit = async e => {
    e.preventDefault()
    setError('')
    if (!email || !password) { setError('Please fill in all fields'); return }
    setLoading(true)
    try {
      if (mode === 'login') {
        await signIn(email, password)
        navigate('/', { replace: true })
      } else {
        if (!company) { setError('Company name is required'); return }
        await signUp(email, password, company)
        setError('')
        setMode('login')
        alert('Account created! Check your email to confirm, then sign in.')
      }
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: C.navy, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{ width: 64, height: 64, backgroundColor: C.gold, borderRadius: 16, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
            <span style={{ fontSize: 28, fontWeight: 800, color: C.navy, fontFamily: "'DM Serif Display', serif" }}>J</span>
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: C.white, fontFamily: "'DM Serif Display', serif", letterSpacing: -.5, lineHeight: 1.1 }}>Jaila Globals</h1>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,.4)', marginTop: 6 }}>Invoice & Inventory Suite</p>
        </div>

        {/* Card */}
        <div style={{ background: 'rgba(255,255,255,.06)', borderRadius: 20, padding: 32, border: '1px solid rgba(255,255,255,.08)', backdropFilter: 'blur(8px)' }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: C.white, marginBottom: 24 }}>
            {mode === 'login' ? 'Sign in to your account' : 'Create your account'}
          </h2>

          <form onSubmit={submit}>
            {mode === 'signup' && (
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,.45)', textTransform: 'uppercase', letterSpacing: .6, marginBottom: 5 }}>Company Name *</label>
                <input value={company} onChange={e => setCompany(e.target.value)} placeholder="e.g. Jaila Globals Ltd"
                  style={{ width: '100%', padding: '10px 12px', background: 'rgba(255,255,255,.08)', border: '1.5px solid rgba(255,255,255,.12)', borderRadius: 8, fontSize: 14, color: C.white, outline: 'none', fontFamily: 'Inter, sans-serif' }} />
              </div>
            )}

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,.45)', textTransform: 'uppercase', letterSpacing: .6, marginBottom: 5 }}>Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@company.com"
                style={{ width: '100%', padding: '10px 12px', background: 'rgba(255,255,255,.08)', border: '1.5px solid rgba(255,255,255,.12)', borderRadius: 8, fontSize: 14, color: C.white, outline: 'none', fontFamily: 'Inter, sans-serif' }} />
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,.45)', textTransform: 'uppercase', letterSpacing: .6, marginBottom: 5 }}>Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••"
                style={{ width: '100%', padding: '10px 12px', background: 'rgba(255,255,255,.08)', border: '1.5px solid rgba(255,255,255,.12)', borderRadius: 8, fontSize: 14, color: C.white, outline: 'none', fontFamily: 'Inter, sans-serif' }} />
            </div>

            {error && <div style={{ background: '#FEE2E2', color: '#991B1B', padding: '10px 14px', borderRadius: 8, fontSize: 13, marginBottom: 16 }}>{error}</div>}

            <Btn type="submit" variant="gold" loading={loading} style={{ width: '100%', padding: '11px 18px', fontSize: 14 }}>
              {mode === 'login' ? 'Sign in' : 'Create account'}
            </Btn>
          </form>

          <div style={{ textAlign: 'center', marginTop: 20 }}>
            <span style={{ fontSize: 13, color: 'rgba(255,255,255,.35)' }}>
              {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
            </span>
            <button onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError('') }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: C.gold }}>
              {mode === 'login' ? 'Sign up' : 'Sign in'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
