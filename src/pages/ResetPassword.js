import React, { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../supabase'

export default function ResetPassword() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [validSession, setValidSession] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    // Supabase embeds the recovery token in the URL hash.
    // Calling getSession() after the hash is processed by the client
    // will return a valid session if the link is genuine.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setValidSession(true)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' && session) setValidSession(true)
    })
    return () => subscription.unsubscribe()
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (password.length < 6) { setError('Password must be at least 6 characters'); return }
    if (password !== confirm) { setError('Passwords do not match'); return }
    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    if (error) { setError(error.message); setLoading(false); return }
    setSuccess(true)
    setTimeout(() => navigate('/dashboard'), 2500)
  }

  if (!validSession) {
    return (
      <div className="auth-wrap">
        <div className="auth-card">
          <Link to="/" className="auth-brand" style={{ textDecoration: 'none' }}>
            <span className="brand-mark" />
            StockTrack
          </Link>
          <h2 className="auth-title">Reset your password</h2>
          <div className="auth-error">This reset link is invalid or has expired. <Link to="/login" style={{ color: 'inherit', fontWeight: 600 }}>Request a new one</Link>.</div>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="auth-wrap">
        <div className="auth-card">
          <Link to="/" className="auth-brand" style={{ textDecoration: 'none' }}>
            <span className="brand-mark" />
            StockTrack
          </Link>
          <div className="auth-success" style={{ fontSize: 14, textAlign: 'center', padding: 20 }}>
            ✓ Password updated. Redirecting to your dashboard…
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <Link to="/" className="auth-brand" style={{ textDecoration: 'none' }}>
          <span className="brand-mark" />
          StockTrack
        </Link>
        <h2 className="auth-title">Set a new password</h2>
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label className="form-label">New password</label>
            <input className="form-input" type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required autoFocus />
          </div>
          <div className="form-group">
            <label className="form-label">Confirm new password</label>
            <input className="form-input" type="password" placeholder="••••••••" value={confirm} onChange={e => setConfirm(e.target.value)} required />
          </div>
          {error && <div className="auth-error">{error}</div>}
          <button className="btn primary auth-btn" type="submit" disabled={loading}>
            {loading ? 'Updating…' : 'Update password'}
          </button>
        </form>
      </div>
    </div>
  )
}
