import React, { useState, useEffect } from 'react'
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom'
import { supabase } from './lib/supabase'
import Layout from './components/Layout'
import { GlobalStyles, Toaster } from './components/ui'

import Auth          from './pages/Auth'
import Dashboard     from './pages/Dashboard'
import CreateInvoice from './pages/CreateInvoice'
import InvoiceDetail from './pages/InvoiceDetail'
import History       from './pages/History'
import Settings      from './pages/Settings'
import Customers     from './pages/Customers'
import Inventory     from './pages/Inventory'
import Admin         from './pages/Admin'

function PrivateRoute({ children }) {
  const [session, setSession] = useState(undefined)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, s) => setSession(s))
    return () => subscription.unsubscribe()
  }, [])

  if (session === undefined) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0A1628' }}>
        <div style={{ width: 40, height: 40, border: '3px solid rgba(212,168,73,.3)', borderTopColor: '#D4A849', borderRadius: '50%', animation: 'spin .7s linear infinite' }} />
      </div>
    )
  }

  return session
    ? <Layout>{children}</Layout>
    : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <>
      <GlobalStyles />
      <Toaster />
      <Routes>
        <Route path="/login" element={<AuthRedirect />} />
        <Route path="/" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
        <Route path="/new" element={<PrivateRoute><CreateInvoice /></PrivateRoute>} />
        <Route path="/invoice/:id" element={<PrivateRoute><InvoiceDetail /></PrivateRoute>} />
        <Route path="/history" element={<PrivateRoute><History /></PrivateRoute>} />
        <Route path="/customers" element={<PrivateRoute><Customers /></PrivateRoute>} />
        <Route path="/inventory" element={<PrivateRoute><Inventory /></PrivateRoute>} />
        <Route path="/settings" element={<PrivateRoute><Settings /></PrivateRoute>} />
        <Route path="/admin"    element={<PrivateRoute><Admin /></PrivateRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  )
}

function AuthRedirect() {
  const navigate = useNavigate()
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate('/', { replace: true })
    })
  }, [])
  return <Auth />
}
