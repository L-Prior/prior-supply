import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../supabase'

export default function Login() {
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [username, setUsername] = useState('')
  const [role, setRole] = useState('Reseller')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setError(''); setSuccess('')
    if (mode === 'signup') {
      if (password !== confirm) { setError('Passwords do not match'); return }
      if (!username.trim()) { setError('Username is required'); return }
    }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return }
    setLoading(true)
    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setError(error.message)
      else navigate('/dashboard')
    } else {
      const { data, error } = await supabase.auth.signUp({ email, password })
      if (error) { setError(error.message); setLoading(false); return }
      if (data?.user) {
        await supabase.from('profiles').upsert({ id: data.user.id, username: username.trim(), role, plan: 'free' })
      }
      setSuccess('Account created! Check your email to confirm, then log in.')
    }
    setLoading(false)
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <Link to="/" className="auth-brand" style={{textDecoration:'none'}}>
          <span className="brand-mark" />
          StockTrack
        </Link>
        <h2 className="auth-title">{mode === 'login' ? 'Sign in to your account' : 'Create your account'}</h2>
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label className="form-label">Email</label>
            <input className="form-input" type="email" placeholder="you@example.com" value={email} onChange={e=>setEmail(e.target.value)} required />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input className="form-input" type="password" placeholder="••••••••" value={password} onChange={e=>setPassword(e.target.value)} required />
          </div>
          {mode === 'signup' && (
            <>
              <div className="form-group">
                <label className="form-label">Confirm password</label>
                <input className="form-input" type="password" placeholder="••••••••" value={confirm} onChange={e=>setConfirm(e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">Username</label>
                <input className="form-input" placeholder="e.g. sneakerking99" value={username} onChange={e=>setUsername(e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">I am a...</label>
                <div className="type-toggle">
                  {['Reseller','Collector','Both'].map(r=>(
                    <button key={r} type="button" className={`type-btn ${role===r?'active':''}`} onClick={()=>setRole(r)}>{r}</button>
                  ))}
                </div>
              </div>
            </>
          )}
          {error && <div className="auth-error">{error}</div>}
          {success && <div className="auth-success">{success}</div>}
          <button className="btn primary auth-btn" type="submit" disabled={loading}>
            {loading ? (mode === 'login' ? 'Signing in...' : 'Creating account...') : (mode === 'login' ? 'Sign in' : 'Create account')}
          </button>
        </form>
        <div className="auth-switch">
          {mode === 'login'
            ? <>Don't have an account? <button className="auth-link" onClick={() => { setMode('signup'); setError(''); setSuccess('') }}>Sign up</button></>
            : <>Already have an account? <button className="auth-link" onClick={() => { setMode('login'); setError(''); setSuccess('') }}>Sign in</button></>
          }
        </div>
      </div>
    </div>
  )
}
