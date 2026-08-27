import React, { useEffect, useState } from 'react'
import { supabase } from '../supabase'
import { isAdminEmail } from '../admins'
import Icon from '../components/Icon'

const STATUSES = ['New', 'In progress', 'Resolved', 'Dismissed']
const statusClass = s => (s || 'New').toLowerCase().replace(/\s+/g, '-')

export default function AdminFeedback({ session }) {
  const [feedback, setFeedback] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')

  const isAdmin = isAdminEmail(session?.user?.email)

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

  const filtered = feedback.filter(f =>
    (filter === 'all' || (f.category || 'Other').toLowerCase() === filter) &&
    (statusFilter === 'all' || (f.status || 'New') === statusFilter)
  )

  return (
    <div className="admin-wrap">
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
          <select className="admin-status-filter" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="all">All statuses</option>
            {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <div className="admin-count">{filtered.length} submission{filtered.length !== 1 ? 's' : ''}</div>
          <button className="admin-refresh-btn" onClick={fetchFeedback}>↻ Refresh</button>
        </div>

        {loading ? (
          <div className="admin-loading">Loading feedback…</div>
        ) : filtered.length === 0 ? (
          <div className="admin-empty" style={{ padding: 40, textAlign: 'center' }}>No feedback yet</div>
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
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
