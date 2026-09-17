import React, { useEffect, useState } from 'react'
import { supabase } from '../supabase'
import { isAdminEmail } from '../admins'
import Icon from '../components/Icon'

const STATUSES = ['New', 'In progress', 'Resolved', 'Dismissed']
const OPEN_STATUSES = ['New', 'In progress']
const statusClass = s => (s || 'New').toLowerCase().replace(/\s+/g, '-')
const isOpen = f => OPEN_STATUSES.includes(f.status || 'New')

export default function AdminFeedback({ session }) {
  const [feedback, setFeedback] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [view, setView] = useState('open') // 'open' | 'resolved'

  const isAdmin = isAdminEmail(session?.user?.email)
  const lightTheme = (() => { try { return localStorage.getItem('iv_dark') !== 'true' } catch { return true } })()

  useEffect(() => {
    if (isAdmin) fetchFeedback()
  }, [isAdmin]) // eslint-disable-line react-hooks/exhaustive-deps

  async function fetchFeedback() {
    setLoading(true)
    const { data, error } = await supabase
      .from('feedback')
      .select('*')
      .order('created_at', { ascending: false })
    if (!error) setFeedback(data || [])
    setLoading(false)
  }

  async function updateStatus(id, status) {
    const prev = feedback
    setFeedback(fb => fb.map(f => (f.id === id ? { ...f, status } : f)))
    const { error } = await supabase.from('feedback').update({ status }).eq('id', id)
    if (error) setFeedback(prev) // revert on failure
  }

  async function updateResolution(id, resolution) {
    const { error } = await supabase.from('feedback').update({ resolution }).eq('id', id)
    if (error) fetchFeedback() // reload on failure to avoid a stale local value
  }

  if (!isAdmin) {
    return (
      <div className="suspended-wrap">
        <div className="suspended-card">
          <div className="suspended-icon"><Icon name="ban" size={48} /></div>
          <h1 className="suspended-title">Access denied</h1>
          <p className="suspended-body">You don't have permission to view this page.</p>
          <a href="/" className="suspended-cta">← Back to home</a>
        </div>
      </div>
    )
  }

  const openCount = feedback.filter(isOpen).length
  const resolvedCount = feedback.length - openCount
  const filtered = feedback.filter(f =>
    (filter === 'all' || (f.category || 'Other').toLowerCase() === filter) &&
    (view === 'open' ? isOpen(f) : !isOpen(f))
  )

  return (
    <div className={`admin-wrap ${lightTheme ? 'admin-light' : ''}`}>
      <div className="admin-header">
        <div className="admin-header-left">
          <img src="/logo-dark.svg" alt="ITS VAULTED" className="admin-logo" />
          <div>
            <div className="admin-title">Feedback</div>
            <div className="admin-subtitle">Beta tester submissions</div>
          </div>
        </div>
        <a href="/admin" className="admin-back-btn">← Admin</a>
      </div>

      <div className="admin-body">
        <div className="admin-tabs">
          <button className={`admin-tab ${view === 'open' ? 'active' : ''}`} onClick={() => setView('open')}>
            Open{openCount > 0 && <span className="admin-tab-count">{openCount}</span>}
          </button>
          <button className={`admin-tab ${view === 'resolved' ? 'active' : ''}`} onClick={() => setView('resolved')}>
            Resolved / Closed{resolvedCount > 0 && <span className="admin-tab-count">{resolvedCount}</span>}
          </button>
        </div>

        <div className="admin-toolbar">
          <div style={{ display: 'flex', gap: 6 }}>
            {['all', 'bug', 'idea', 'other'].map(c => (
              <button
                key={c}
                className={`admin-tab ${filter === c ? 'active' : ''}`}
                onClick={() => setFilter(c)}
                style={{ textTransform: 'capitalize' }}
              >
                {c}
              </button>
            ))}
          </div>
          <div className="admin-count">{filtered.length} submission{filtered.length !== 1 ? 's' : ''}</div>
          <button className="admin-refresh-btn" onClick={fetchFeedback}>↻ Refresh</button>
        </div>

        {loading ? (
          <div className="admin-loading">Loading feedback…</div>
        ) : filtered.length === 0 ? (
          <div className="admin-empty" style={{ padding: 40, textAlign: 'center' }}>
            {view === 'open' ? 'Nothing open — all caught up' : 'Nothing resolved yet'}
          </div>
        ) : (
          <div className="admin-feedback-list">
            {filtered.map(f => (
              <div key={f.id} className="admin-feedback-card">
                <div className="admin-feedback-head">
                  <span className={`admin-feedback-badge admin-feedback-${(f.category || 'other').toLowerCase()}`}>{f.category || 'Other'}</span>
                  <span className="admin-feedback-email">{f.email}</span>
                  {f.page && <span className="admin-feedback-page">on {f.page}</span>}
                  <span className="admin-feedback-date">
                    {f.created_at ? new Date(f.created_at).toLocaleString('en-GB') : '—'}
                  </span>
                  <select
                    className={`admin-feedback-status admin-feedback-status-${statusClass(f.status)}`}
                    value={f.status || 'New'}
                    onChange={e => updateStatus(f.id, e.target.value)}
                  >
                    {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="admin-feedback-message">{f.message}</div>
                {!isOpen(f) && (
                  <div className="admin-resolution">
                    <label className="admin-resolution-label">Resolution notes</label>
                    <textarea
                      className="admin-resolution-input"
                      placeholder="What was the fix or outcome? (saved when you click away)"
                      value={f.resolution || ''}
                      onChange={e => setFeedback(fb => fb.map(x => (x.id === f.id ? { ...x, resolution: e.target.value } : x)))}
                      onBlur={e => updateResolution(f.id, e.target.value)}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
