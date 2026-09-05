import React, { useEffect, useState } from 'react'
import { supabase } from '../supabase'
import Icon from '../components/Icon'
import { isAdminEmail } from '../admins'

export default function Admin({ session }) {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [actionMsg, setActionMsg] = useState('')
  const [search, setSearch] = useState('')
  const [tab, setTab] = useState('users')
  const [feedback, setFeedback] = useState([])
  const [feedbackLoading, setFeedbackLoading] = useState(true)
  const [waitlist, setWaitlist] = useState([])
  const [waitlistLoading, setWaitlistLoading] = useState(true)

  const isAdmin = isAdminEmail(session?.user?.email)

  useEffect(() => {
    if (isAdmin) { fetchUsers(); fetchFeedback(); fetchWaitlist() }
  }, [isAdmin]) // eslint-disable-line react-hooks/exhaustive-deps

  async function fetchUsers() {
    setLoading(true)
    const { data, error } = await supabase
      .from('admin_users_view')
      .select('*')
      .order('created_at', { ascending: false })
    if (!error) setUsers(data || [])
    setLoading(false)
  }

  async function fetchFeedback() {
    setFeedbackLoading(true)
    const { data, error } = await supabase
      .from('feedback')
      .select('*')
      .order('created_at', { ascending: false })
    if (!error) setFeedback(data || [])
    setFeedbackLoading(false)
  }

  async function fetchWaitlist() {
    setWaitlistLoading(true)
    const { data, error } = await supabase
      .from('waitlist')
      .select('*')
      .order('created_at', { ascending: false })
    if (!error) setWaitlist(data || [])
    setWaitlistLoading(false)
  }

  function exportWaitlistCsv() {
    const escape = v => {
      if (v === null || v === undefined) return ''
      const s = String(v)
      return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s
    }
    const keys = ['created_at', 'name', 'email', 'interest']
    const rows = [keys.join(','), ...waitlist.map(w => keys.map(k => escape(w[k])).join(','))].join('\n')
    const blob = new Blob([rows], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `itsvaulted-waitlist-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function toggleSuspend(userId, currentValue) {
    const { error } = await supabase
      .from('profiles')
      .update({ suspended: !currentValue, suspended_at: !currentValue ? new Date().toISOString() : null })
      .eq('id', userId)
    if (!error) {
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, suspended: !currentValue } : u))
      setActionMsg(!currentValue ? 'Account suspended.' : 'Account reinstated.')
      setTimeout(() => setActionMsg(''), 3000)
    }
  }

  async function updatePlan(userId, plan) {
    const prev = users
    setUsers(u => u.map(x => x.id === userId ? { ...x, plan } : x))
    const { error } = await supabase.from('profiles').update({ plan }).eq('id', userId)
    if (error) {
      setUsers(prev) // revert on failure
      setActionMsg('Could not update plan — check the profiles admin-update RLS policy.')
    } else {
      setActionMsg(`Plan set to ${plan}.`)
    }
    setTimeout(() => setActionMsg(''), 3000)
  }

  async function exportUserData(userId, userEmail) {
    // Fetch all tables for this user
    const [stock, collector, expenses, breaks] = await Promise.all([
      supabase.from('stock').select('*').eq('user_id', userId),
      supabase.from('collector').select('*').eq('user_id', userId),
      supabase.from('expenses').select('*').eq('user_id', userId),
      supabase.from('breaks').select('*').eq('user_id', userId),
    ])

    const escape = v => {
      if (v === null || v === undefined) return ''
      const s = String(v)
      return s.includes(',') || s.includes('"') || s.includes('\n')
        ? `"${s.replace(/"/g, '""')}"` : s
    }
    const toCsv = (rows) => {
      if (!rows?.length) return 'No data'
      const keys = Object.keys(rows[0])
      return [keys.join(','), ...rows.map(r => keys.map(k => escape(r[k])).join(','))].join('\n')
    }

    const sections = [
      `=== STOCK (${stock.data?.length || 0} items) ===\n${toCsv(stock.data)}`,
      `\n\n=== COLLECTOR (${collector.data?.length || 0} items) ===\n${toCsv(collector.data)}`,
      `\n\n=== EXPENSES (${expenses.data?.length || 0} items) ===\n${toCsv(expenses.data)}`,
      `\n\n=== BREAKS (${breaks.data?.length || 0} items) ===\n${toCsv(breaks.data)}`,
    ]

    const blob = new Blob([sections.join('')], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `itsvaulted-data-${userEmail.replace('@', '-at-')}.txt`
    a.click()
    URL.revokeObjectURL(url)
    setActionMsg(`Data exported for ${userEmail}`)
    setTimeout(() => setActionMsg(''), 4000)
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

  const filtered = users.filter(u =>
    !search || u.email?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="admin-wrap">
      <div className="admin-header">
        <div className="admin-header-left">
          <img src="/logo-dark.svg" alt="ITS VAULTED" className="admin-logo" />
          <div>
            <div className="admin-title">Admin Panel</div>
            <div className="admin-subtitle">Account management</div>
          </div>
        </div>
        <a href="/dashboard" className="admin-back-btn">← Dashboard</a>
      </div>

      {actionMsg && (
        <div className="admin-toast">{actionMsg}</div>
      )}

      <div className="admin-body">
        <div className="admin-tabs">
          <button className={`admin-tab ${tab === 'users' ? 'active' : ''}`} onClick={() => setTab('users')}>Users</button>
          <button className={`admin-tab ${tab === 'feedback' ? 'active' : ''}`} onClick={() => setTab('feedback')}>
            Feedback{feedback.length > 0 && <span className="admin-tab-count">{feedback.length}</span>}
          </button>
          <button className={`admin-tab ${tab === 'waitlist' ? 'active' : ''}`} onClick={() => setTab('waitlist')}>
            Waitlist{waitlist.length > 0 && <span className="admin-tab-count">{waitlist.length}</span>}
          </button>
        </div>

        {tab === 'users' && (<>
        <div className="admin-toolbar">
          <input
            className="admin-search"
            placeholder="Search by email…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <div className="admin-count">{filtered.length} user{filtered.length !== 1 ? 's' : ''}</div>
          <button className="admin-refresh-btn" onClick={fetchUsers}>↻ Refresh</button>
        </div>

        {loading ? (
          <div className="admin-loading">Loading users…</div>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Plan</th>
                  <th>Joined</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(u => (
                  <tr key={u.id} className={u.suspended ? 'admin-row-suspended' : ''}>
                    <td className="admin-email">{u.email}</td>
                    <td>
                      <select
                        className={`admin-plan-select admin-plan-${u.plan || 'free'}`}
                        value={u.plan || 'free'}
                        onChange={e => updatePlan(u.id, e.target.value)}
                        title="Change this user's plan"
                      >
                        <option value="free">free</option>
                        <option value="core">core</option>
                        <option value="pro">pro</option>
                      </select>
                    </td>
                    <td className="admin-date">
                      {u.created_at ? new Date(u.created_at).toLocaleDateString('en-GB') : '—'}
                    </td>
                    <td>
                      <span className={`admin-status ${u.suspended ? 'admin-status-suspended' : 'admin-status-active'}`}>
                        {u.suspended ? 'Suspended' : 'Active'}
                      </span>
                    </td>
                    <td className="admin-actions">
                      <button
                        className={`admin-btn ${u.suspended ? 'admin-btn-reinstate' : 'admin-btn-suspend'}`}
                        onClick={() => toggleSuspend(u.id, u.suspended)}
                      >
                        {u.suspended ? 'Reinstate' : 'Suspend'}
                      </button>
                      <button
                        className="admin-btn admin-btn-export"
                        onClick={() => exportUserData(u.id, u.email)}
                      >
                        Export data
                      </button>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={5} className="admin-empty">No users found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
        </>)}

        {tab === 'feedback' && (<>
        <div className="admin-toolbar">
          <div className="admin-count">{feedback.length} submission{feedback.length !== 1 ? 's' : ''}</div>
          <a href="/admin/feedback" className="admin-refresh-btn" style={{ textDecoration: 'none' }}>Open full page →</a>
          <button className="admin-refresh-btn" onClick={fetchFeedback}>↻ Refresh</button>
        </div>

        {feedbackLoading ? (
          <div className="admin-loading">Loading feedback…</div>
        ) : feedback.length === 0 ? (
          <div className="admin-empty" style={{ padding: 40, textAlign: 'center' }}>No feedback yet</div>
        ) : (
          <div className="admin-feedback-list">
            {feedback.map(f => (
              <div key={f.id} className="admin-feedback-card">
                <div className="admin-feedback-head">
                  <span className={`admin-feedback-badge admin-feedback-${(f.category || 'other').toLowerCase()}`}>{f.category || 'Other'}</span>
                  <span className="admin-feedback-email">{f.email}</span>
                  {f.page && <span className="admin-feedback-page">on {f.page}</span>}
                  <span className="admin-feedback-date">
                    {f.created_at ? new Date(f.created_at).toLocaleString('en-GB') : '—'}
                  </span>
                </div>
                <div className="admin-feedback-message">{f.message}</div>
              </div>
            ))}
          </div>
        )}
        </>)}

        {tab === 'waitlist' && (<>
        <div className="admin-toolbar">
          <div className="admin-count">{waitlist.length} registration{waitlist.length !== 1 ? 's' : ''}</div>
          <button className="admin-refresh-btn" onClick={exportWaitlistCsv} disabled={!waitlist.length}>↓ Export CSV</button>
          <button className="admin-refresh-btn" onClick={fetchWaitlist}>↻ Refresh</button>
        </div>

        {waitlistLoading ? (
          <div className="admin-loading">Loading waitlist…</div>
        ) : waitlist.length === 0 ? (
          <div className="admin-empty" style={{ padding: 40, textAlign: 'center' }}>No registrations yet</div>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Interest</th>
                  <th>Registered</th>
                </tr>
              </thead>
              <tbody>
                {waitlist.map(w => (
                  <tr key={w.id}>
                    <td>{w.name || '—'}</td>
                    <td className="admin-email">{w.email}</td>
                    <td>{w.interest || '—'}</td>
                    <td className="admin-date">
                      {w.created_at ? new Date(w.created_at).toLocaleString('en-GB') : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        </>)}
      </div>
    </div>
  )
}
