import React, { useState } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { supabase } from '../supabase'
import PasswordChecklist, { validatePassword } from '../components/PasswordChecklist'

const INTERESTS = ['Sneakers', 'Pokémon', 'Topps', 'Lego', 'Clothing', 'Other']

export default function Login() {
  const location = useLocation()
  const startWaitlist = new URLSearchParams(location.search).get('join') != null
  const [mode, setMode] = useState(startWaitlist ? 'waitlist' : 'login') // 'login' | 'waitlist' | 'code' | 'signup' | 'forgot'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [username, setUsername] = useState('')
  const [role, setRole] = useState('Reseller')
  const [name, setName] = useState('')
  const [interest, setInterest] = useState('Sneakers')
  const [betaCode, setBetaCode] = useState('')
  const [betaUnlocked, setBetaUnlocked] = useState(false)
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

    if (mode === 'waitlist') {
      if (!email.trim()) { setError('Please enter your email address'); return }
      if (!name.trim()) { setError('Please enter your name'); return }
      setLoading(true)
      const { error } = await supabase.from('waitlist').insert({
        email: email.trim(), name: name.trim(), interest
      })
      setLoading(false)
      if (error) setError('Something went wrong — please try again.')
      else setSuccess("You're on the list! We'll be in touch as beta spots open up.")
      return
    }

    if (mode === 'code') {
      if (!betaCode.trim()) { setError('Please enter your beta code'); return }
      setLoading(true)
      const { data, error } = await supabase.rpc('verify_beta_code', { p_code: betaCode.trim() })
      setLoading(false)
      if (error || !data) { setError("That code isn't valid. Double-check it and try again.") }
      else { setBetaUnlocked(true); switchMode('signup') }
      return
    }

    if (mode === 'signup') {
      if (!betaUnlocked) { setError('Beta signups are invite-only right now.'); switchMode('waitlist'); return }
      if (password !== confirm) { setError('Passwords do not match'); return }
      if (!username.trim()) { setError('Username is required'); return }
      if (!validatePassword(password).valid) {
        setError('Please choose a stronger password (see requirements below)'); return
      }
    }

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

  const title = mode === 'login' ? 'Sign in to your account'
    : mode === 'waitlist' ? 'Register your interest'
    : mode === 'code' ? 'Enter your beta code'
    : mode === 'signup' ? 'Create your account'
    : 'Reset your password'

  const submitLabel = loading
    ? (mode === 'login' ? 'Signing in…' : mode === 'waitlist' ? 'Sending…' : mode === 'code' ? 'Checking…' : mode === 'signup' ? 'Creating account…' : 'Sending link…')
    : (mode === 'login' ? 'Sign in' : mode === 'waitlist' ? 'Register my interest' : mode === 'code' ? 'Unlock signup' : mode === 'signup' ? 'Create account' : 'Send reset link')

  // Waitlist success — show a friendly confirmation instead of the form
  const waitlistDone = mode === 'waitlist' && success

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <Link to="/" className="auth-brand" style={{ textDecoration: 'none' }}>
          <img src="/logo-dark.svg" alt="ITS VAULTED" className="auth-logo" />
        </Link>

        <h2 className="auth-title">{title}</h2>

        {mode === 'waitlist' && !waitlistDone && (
          <p className="auth-sub">ITS VAULTED is in private beta. Leave your details and we'll invite you as spots open up.</p>
        )}

        {waitlistDone ? (
          <>
            <div className="auth-success" style={{ marginBottom: 18 }}>{success}</div>
            <button className="btn primary auth-btn" onClick={() => switchMode('login')}>Back to sign in</button>
          </>
        ) : (
          <form onSubmit={handleSubmit} className="auth-form">
            {mode === 'code' ? (
              <div className="form-group">
                <label className="form-label">Beta code</label>
                <input className="form-input" placeholder="Enter your invite code" value={betaCode} onChange={e => setBetaCode(e.target.value)} autoFocus required />
              </div>
            ) : (
              <div className="form-group">
                <label className="form-label">Email</label>
                <input className="form-input" type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required />
              </div>
            )}

            {mode === 'waitlist' && (
              <>
                <div className="form-group">
                  <label className="form-label">Name</label>
                  <input className="form-input" placeholder="Your name" value={name} onChange={e => setName(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="form-label">What do you sell or collect?</label>
                  <div className="type-toggle" style={{ flexWrap: 'wrap' }}>
                    {INTERESTS.map(i => (
                      <button key={i} type="button" className={`type-btn ${interest === i ? 'active' : ''}`} onClick={() => setInterest(i)}>{i}</button>
                    ))}
                  </div>
                </div>
              </>
            )}

            {(mode === 'login' || mode === 'signup') && (
              <div className="form-group">
                <label className="form-label">Password</label>
                <input className="form-input" type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required />
                {mode === 'signup' && <PasswordChecklist password={password} />}
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

            <button className="btn primary auth-btn" type="submit" disabled={loading}>{submitLabel}</button>

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
        )}

        {!waitlistDone && (
          <div className="auth-switch">
            {mode === 'login' && <>Want early access? <button className="auth-link" onClick={() => switchMode('waitlist')}>Register your interest</button></>}
            {mode === 'waitlist' && <>Already have an account? <button className="auth-link" onClick={() => switchMode('login')}>Sign in</button></>}
            {mode === 'code' && <>Changed your mind? <button className="auth-link" onClick={() => switchMode('waitlist')}>Back to waitlist</button></>}
            {mode === 'signup' && <>Already have an account? <button className="auth-link" onClick={() => switchMode('login')}>Sign in</button></>}
            {mode === 'forgot' && <>Remembered it? <button className="auth-link" onClick={() => switchMode('login')}>Sign in</button></>}
          </div>
        )}

        {mode === 'waitlist' && !waitlistDone && (
          <div className="auth-beta-hint">
            Got a beta invite code? <button className="auth-link" onClick={() => switchMode('code')}>Enter it here</button>
          </div>
        )}
      </div>
    </div>
  )
}
