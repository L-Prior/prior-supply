import React, { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from './supabase'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Privacy from './pages/Privacy'
import Terms from './pages/Terms'
import ResetPassword from './pages/ResetPassword'
import './index.css'

function ProtectedRoute({ session, children }) {
  if (session === null) return <Navigate to="/login" replace />
  return children
}

export default function App() {
  const [session, setSession] = useState(undefined)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => subscription.unsubscribe()
  }, [])

  if (session === undefined) return <div className="auth-loading">Loading...</div>

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing session={session} />} />
        <Route path="/login" element={session ? <Navigate to="/dashboard" replace /> : <Login />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/dashboard" element={
          <ProtectedRoute session={session}>
            <Dashboard session={session} />
          </ProtectedRoute>
        } />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}