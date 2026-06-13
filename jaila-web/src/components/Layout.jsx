import React, { useState, useEffect } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { supabase, getProfile, signOut } from '../lib/supabase'
import { C } from './ui'

const navItems = [
  { to: '/',          icon: '🏠', label: 'Dashboard'  },
  { to: '/new',       icon: '➕', label: 'New Invoice' },
  { to: '/history',   icon: '📋', label: 'History'    },
  { to: '/customers', icon: '👥', label: 'Customers'  },
  { to: '/inventory', icon: '📦', label: 'Inventory'  },
  { to: '/settings',  icon: '⚙️', label: 'Settings'   },
]

function useIsMobile() {
  const [mobile, setMobile] = useState(window.innerWidth < 768)
  useEffect(() => {
    const fn = () => setMobile(window.innerWidth < 768)
    window.addEventListener('resize', fn)
    return () => window.removeEventListener('resize', fn)
  }, [])
  return mobile
}

export default function Layout({ children }) {
  const [profile, setProfile]   = useState(null)
  const [collapsed, setCollapsed] = useState(false)
  const isMobile = useIsMobile()
  const navigate = useNavigate()

  useEffect(() => {
    getProfile().then(setProfile).catch(() => {})
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      getProfile().then(setProfile).catch(() => {})
    })
    return () => subscription.unsubscribe()
  }, [])

  const co      = profile?.company_name ?? 'Jaila Globals'
  const initial = co.charAt(0).toUpperCase()

  const doSignOut = async () => {
    await signOut().catch(() => {})
    navigate('/login', { replace: true })
  }

  if (isMobile) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: C.surface }}>
        {/* Mobile top bar */}
        <div style={{ background: C.navy, padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, background: C.gold, borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800, color: C.navy, flexShrink: 0 }}>
              {profile?.logo_url
                ? <img src={profile.logo_url} alt="" style={{ width: 32, height: 32, borderRadius: 7, objectFit: 'cover' }} />
                : initial}
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.white, fontFamily: "'DM Serif Display', serif" }}>{co}</div>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,.35)', textTransform: 'uppercase', letterSpacing: .6 }}>Invoice Suite</div>
            </div>
          </div>
          <button onClick={doSignOut} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,.5)', fontSize: 12, fontWeight: 600 }}>↪ Sign out</button>
        </div>

        {/* Content */}
        <main style={{ flex: 1, overflowY: 'auto', paddingBottom: 70 }}>
          {children}
        </main>

        {/* Mobile bottom nav */}
        <nav style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: C.navy, display: 'flex', borderTop: '1px solid rgba(255,255,255,.08)', zIndex: 100 }}>
          {navItems.map(({ to, icon, label }) => (
            <NavLink key={to} to={to} end={to === '/'}
              style={({ isActive }) => ({
                flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                padding: '10px 4px 8px', textDecoration: 'none', gap: 3,
                color: isActive ? C.gold : 'rgba(255,255,255,.4)',
                borderTop: isActive ? `2px solid ${C.gold}` : '2px solid transparent',
              })}
            >
              <span style={{ fontSize: 18 }}>{icon}</span>
              <span style={{ fontSize: 9, fontWeight: 600, textTransform: 'uppercase', letterSpacing: .4 }}>{label}</span>
            </NavLink>
          ))}
        </nav>
      </div>
    )
  }

  const W = collapsed ? 68 : 228

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', backgroundColor: C.surface }}>
      {/* Sidebar */}
      <aside style={{
        width: W, minWidth: W, flexShrink: 0,
        background: C.navy,
        display: 'flex', flexDirection: 'column',
        transition: 'width .2s',
        position: 'relative', zIndex: 10,
        boxShadow: '2px 0 12px rgba(0,0,0,.15)',
      }}>
        {/* Brand */}
        <div style={{ padding: collapsed ? '22px 0' : '22px 20px', borderBottom: '1px solid rgba(255,255,255,.07)', display: 'flex', alignItems: 'center', gap: 12, overflow: 'hidden' }}>
          <div style={{
            width: 38, height: 38, minWidth: 38, backgroundColor: C.gold, borderRadius: 9,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 17, fontWeight: 800, color: C.navy, flexShrink: 0,
            ...(collapsed ? { margin: '0 auto' } : {}),
          }}>
            {profile?.logo_url
              ? <img src={profile.logo_url} alt="" style={{ width: 38, height: 38, borderRadius: 9, objectFit: 'cover' }} />
              : initial}
          </div>
          {!collapsed && (
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.white, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontFamily: "'DM Serif Display', serif" }}>{co}</div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,.35)', marginTop: 1, textTransform: 'uppercase', letterSpacing: .6 }}>Invoice Suite</div>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '12px 8px', overflowY: 'auto' }}>
          {navItems.map(({ to, icon, label }) => (
            <NavLink key={to} to={to} end={to === '/'}
              style={({ isActive }) => ({
                display: 'flex', alignItems: 'center', gap: 11,
                padding: collapsed ? '11px 0' : '11px 12px',
                justifyContent: collapsed ? 'center' : 'flex-start',
                borderRadius: 9, marginBottom: 2,
                textDecoration: 'none',
                fontWeight: 600, fontSize: 13,
                transition: 'all .15s',
                backgroundColor: isActive ? 'rgba(212,168,73,.15)' : 'transparent',
                color: isActive ? C.gold : 'rgba(255,255,255,.55)',
                borderLeft: isActive ? `3px solid ${C.gold}` : '3px solid transparent',
              })}
            >
              <span style={{ fontSize: 17, flexShrink: 0 }}>{icon}</span>
              {!collapsed && <span style={{ whiteSpace: 'nowrap' }}>{label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div style={{ padding: '12px 8px', borderTop: '1px solid rgba(255,255,255,.07)' }}>
          <button onClick={() => setCollapsed(c => !c)}
            style={{ display: 'flex', alignItems: 'center', gap: 11, padding: collapsed ? '9px 0' : '9px 12px', justifyContent: collapsed ? 'center' : 'flex-start', borderRadius: 9, width: '100%', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,.35)', fontSize: 13, fontWeight: 600, marginBottom: 4, transition: 'all .15s' }}
          >
            <span style={{ fontSize: 16 }}>{collapsed ? '→' : '←'}</span>
            {!collapsed && 'Collapse'}
          </button>
          <button onClick={doSignOut}
            style={{ display: 'flex', alignItems: 'center', gap: 11, padding: collapsed ? '9px 0' : '9px 12px', justifyContent: collapsed ? 'center' : 'flex-start', borderRadius: 9, width: '100%', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,.35)', fontSize: 13, fontWeight: 600, transition: 'all .15s' }}
          >
            <span style={{ fontSize: 16 }}>↪</span>
            {!collapsed && 'Sign out'}
          </button>
        </div>
      </aside>

      {/* Main */}
      <main style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {children}
      </main>
    </div>
  )
}
