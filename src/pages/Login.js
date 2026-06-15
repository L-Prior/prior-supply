import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../supabase'

export default function Login() {
  const [mode, setMode] = useState('login') // 'login' | 'signup' | 'forgot'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [username, setUsername] = useState('')
  const [role, setRole] = useState('Reseller')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const navigate = useNavigate()

  function switchMode(m) { setMode(m); setError(''); setSuccess('') }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(''); setSuccess('')

    if (mode === 'forgot') {
      if (!email.trim()) { setError('Please enter your email address'); return }
      setLoading(true)
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`
      })
      setLoading(false)
      if (error) setError(error.message)
      else setSuccess('Check your email for a password reset link.')
      return
    }

    if (mode === 'signup') {
      if (password !== confirm) { setError('Passwords do not match'); return }
      if (!username.trim()) { setError('Username is required'); return }
    }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return }

    setLoading(true)
    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) { setError(error.message); setLoading(false) }
      else navigate('/dashboard')
    } else {
      const { data, error } = await supabase.auth.signUp({ email, password })
      if (error) { setError(error.message); setLoading(false); return }
      if (data?.user) {
        await supabase.from('profiles').upsert({ id: data.user.id, username: username.trim(), role, plan: 'free' })
      }
      setSuccess('Account created! Check your email to confirm, then log in.')
      setLoading(false)
    }
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <Link to="/" className="auth-brand" style={{ textDecoration: 'none' }}>
          <span className="brand-mark" />
          StockTrack
        </Link>

        <h2 className="auth-title">
          {mode === 'login' ? 'Sign in to your account' : mode === 'signup' ? 'Create your account' : 'Reset your password'}
        </h2>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label className="form-label">Email</label>
            <input className="form-input" type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required />
          </div>

          {mode !== 'forgot' && (
            <div className="form-group">
              <label className="form-label">Password</label>
              <input className="form-input" type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required />
            </div>
          )}

          {mode === 'signup' && (
            <>
              <div className="form-group">
                <label className="form-label">Confirm password</label>
                <input className="form-input" type="password" placeholder="••••••••" value={confirm} onChange={e => setConfirm(e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">Username</label>
                <input className="form-input" placeholder="e.g. sneakerking99" value={username} onChange={e => setUsername(e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">I am a...</label>
                <div className="type-toggle">
                  {['Reseller', 'Collector', 'Both'].map(r => (
                    <button key={r} type="button" className={`type-btn ${role === r ? 'active' : ''}`} onClick={() => setRole(r)}>{r}</button>
                  ))}
                </div>
              </div>
            </>
          )}

          {error && <div className="auth-error">{error}</div>}
          {success && <div className="auth-success">{success}</div>}

          <button className="btn primary auth-btn" type="submit" disabled={loading}>
            {loading
              ? (mode === 'login' ? 'Signing in…' : mode === 'signup' ? 'Creating account…' : 'Sending link…')
              : (mode === 'login' ? 'Sign in' : mode === 'signup' ? 'Create account' : 'Send reset link')}
          </button>

          {mode === 'login' && (
            <button type="button" className="auth-link" style={{ alignSelf: 'flex-end', marginTop: -8 }} onClick={() => switchMode('forgot')}>
              Forgot password?
            </button>
          )}

          {mode === 'signup' && (
            <p className="auth-legal">
              By creating an account you agree to our{' '}
              <Link to="/terms" className="auth-legal-link">Terms of Service</Link>
              {' '}and{' '}
              <Link to="/privacy" className="auth-legal-link">Privacy Policy</Link>.
            </p>
          )}
        </form>

        <div className="auth-switch">
          {mode === 'login' && <>Don't have an account? <button className="auth-link" onClick={() => switchMode('signup')}>Sign up</button></>}
          {mode === 'signup' && <>Already have an account? <button className="auth-link" onClick={() => switchMode('login')}>Sign in</button></>}
          {mode === 'forgot' && <>Remembered it? <button className="auth-link" onClick={() => switchMode('login')}>Sign in</button></>}
        </div>
      </div>
    </div>
  )
}
