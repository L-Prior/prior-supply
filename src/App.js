import React, { useState, useEffect, useMemo } from 'react'
import { supabase } from './supabase'
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts'
import './index.css'

const CATEGORIES = ['Sneakers', 'Pokémon', 'Lego', 'Clothing', 'Accessories', 'Electronics', 'Miscellaneous']
const COLORS = ['#16a34a','#22c55e','#4ade80','#86efac','#bbf7d0','#f59e0b','#3b82f6']

const EMPTY_UNIT = { size: '', purchase_price: '' }
const EMPTY_FORM = {
  category: '', brand: '', style: '', colourway: '', sku: '',
  purchase_platform: '', purchase_date: '', notes: '',
  units: [{ ...EMPTY_UNIT }]
}

function fmt(n) {
  if (n == null || n === '') return '—'
  return '£' + Number(n).toFixed(2)
}
function fmtShort(n) {
  if (n == null) return '£0'
  return '£' + Number(n).toFixed(0)
}
function plColor(pl) {
  if (pl == null) return ''
  if (pl > 0) return 'td-pos'
  if (pl < 0) return 'td-neg'
  return ''
}
function getMonthKey(dateStr) {
  if (!dateStr) return null
  const d = new Date(dateStr)
  if (isNaN(d)) return null
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}
function getMonthLabel(key) {
  const [year, month] = key.split('-')
  const d = new Date(parseInt(year), parseInt(month) - 1)
  return d.toLocaleString('default', { month: 'short', year: '2-digit' })
}
function getLast(n) {
  const months = []
  const now = new Date()
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    months.push({ key, label: getMonthLabel(key) })
  }
  return months
}

// ─── Auth ─────────────────────────────────────────────────────────────────────
function AuthPage({ onAuth }) {
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setError(''); setSuccess('')
    if (mode === 'signup' && password !== confirm) { setError('Passwords do not match'); return }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return }
    setLoading(true)
    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setError(error.message)
      else onAuth()
    } else {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) setError(error.message)
      else setSuccess('Account created! Check your email to confirm, then log in.')
    }
    setLoading(false)
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="auth-brand"><span className="brand-mark" />StockTrack</div>
        <h2 className="auth-title">{mode === 'login' ? 'Sign in to your account' : 'Create your account'}</h2>
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label className="form-label">Email</label>
            <input className="form-input" type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input className="form-input" type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required />
          </div>
          {mode === 'signup' && (
            <div className="form-group">
              <label className="form-label">Confirm password</label>
              <input className="form-input" type="password" placeholder="••••••••" value={confirm} onChange={e => setConfirm(e.target.value)} required />
            </div>
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

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [session, setSession] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [page, setPage] = useState('home')
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [batchModal, setBatchModal] = useState(null)
  const [sellItem, setSellItem] = useState(null)
  const [salePrice, setSalePrice] = useState('')
  const [sellingPlatform, setSellingPlatform] = useState('')
  const [form, setForm] = useState(EMPTY_FORM)
  const [search, setSearch] = useState('')
  const [filterBrand, setFilterBrand] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [sortBy, setSortBy] = useState('created_at')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [chartMonths, setChartMonths] = useState(6)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => { setSession(session); setAuthLoading(false) })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => { if (session) fetchItems() }, [session])

  async function fetchItems() {
    setLoading(true)
    const { data, error } = await supabase.from('stock').select('*').order('created_at', { ascending: false })
    if (error) console.error(error)
    setItems(data || [])
    setLoading(false)
  }

  async function signOut() { await supabase.auth.signOut(); setItems([]); setPage('home') }

  function updateUnit(i, field, value) {
    setForm(f => { const units = [...f.units]; units[i] = { ...units[i], [field]: value }; return { ...f, units } })
  }
  function addUnit() { setForm(f => ({ ...f, units: [...f.units, { ...EMPTY_UNIT }] })) }
  function removeUnit(i) { setForm(f => ({ ...f, units: f.units.filter((_, idx) => idx !== i) })) }

  async function saveItem() {
    if (!form.brand || !form.purchase_price && form.units.some(u => !u.purchase_price)) return
    setSaving(true); setSaveError('')
    const batchId = editItem?.batch_id || crypto.randomUUID()
    const base = {
      category: form.category, brand: form.brand, style: form.style,
      colourway: form.colourway, sku: form.sku, purchase_platform: form.purchase_platform,
      purchase_date: form.purchase_date || null, notes: form.notes,
      batch_id: batchId, user_id: session.user.id, status: 'in_stock'
    }
    let error
    if (editItem) {
      // Single item edit
      const payload = { ...base, purchase_price: parseFloat(form.units[0]?.purchase_price) || 0, size: form.units[0]?.size || '' }
      ;({ error } = await supabase.from('stock').update(payload).eq('id', editItem.id))
    } else {
      const rows = form.units.map(u => ({ ...base, size: u.size, purchase_price: parseFloat(u.purchase_price) || 0 }))
      ;({ error } = await supabase.from('stock').insert(rows))
    }
    setSaving(false)
    if (error) { setSaveError(error.message); return }
    setShowAdd(false); setEditItem(null); setForm(EMPTY_FORM); fetchItems()
  }

  function openEdit(item) {
    setForm({
      category: item.category || '', brand: item.brand || '', style: item.style || '',
      colourway: item.colourway || '', sku: item.sku || '',
      purchase_platform: item.purchase_platform || '', purchase_date: item.purchase_date || '',
      notes: item.notes || '', units: [{ size: item.size || '', purchase_price: item.purchase_price || '' }]
    })
    setEditItem(item); setShowAdd(true)
  }

  async function deleteItem(id) {
    if (!window.confirm('Delete this item?')) return
    await supabase.from('stock').delete().eq('id', id)
    fetchItems(); if (batchModal) setBatchModal(prev => ({ ...prev, units: prev.units.filter(u => u.id !== id) }))
  }

  async function deleteBatch(batchId) {
    if (!window.confirm('Delete all units in this batch?')) return
    await supabase.from('stock').delete().eq('batch_id', batchId)
    fetchItems(); setBatchModal(null)
  }

  async function markSold() {
    if (!salePrice || !sellItem) return
    setSaving(true)
    await supabase.from('stock').update({
      status: 'sold', sale_price: parseFloat(salePrice),
      selling_platform: sellingPlatform, sold_at: new Date().toISOString()
    }).eq('id', sellItem.id)
    setSaving(false); setSellItem(null); setSalePrice(''); setSellingPlatform('')
    fetchItems()
    if (batchModal) {
      const updated = batchModal.units.map(u => u.id === sellItem.id ? { ...u, status: 'sold', sale_price: parseFloat(salePrice), selling_platform: sellingPlatform } : u)
      setBatchModal({ ...batchModal, units: updated })
    }
  }

  // Group items into batches
  const batches = useMemo(() => {
    const map = {}
    items.forEach(item => {
      const key = item.batch_id || item.id
      if (!map[key]) map[key] = { key, units: [], brand: item.brand, style: item.style, colourway: item.colourway, category: item.category, sku: item.sku, purchase_platform: item.purchase_platform, purchase_date: item.purchase_date, notes: item.notes, created_at: item.created_at }
      map[key].units.push(item)
    })
    return Object.values(map).sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
  }, [items])

  const filteredBatches = useMemo(() => {
    return batches.filter(b => {
      const q = search.toLowerCase()
      if (search && ![(b.brand||''),(b.style||''),(b.colourway||''),(b.sku||'')].some(v => v.toLowerCase().includes(q))) return false
      if (filterBrand && b.brand !== filterBrand) return false
      if (filterCategory && b.category !== filterCategory) return false
      if (filterStatus) {
        const inStock = b.units.some(u => u.status === 'in_stock')
        const allSold = b.units.every(u => u.status === 'sold')
        if (filterStatus === 'in_stock' && !inStock) return false
        if (filterStatus === 'sold' && !allSold) return false
      }
      return true
    })
  }, [batches, search, filterBrand, filterCategory, filterStatus])

  const stats = useMemo(() => {
    const inStock = items.filter(i => i.status === 'in_stock')
    const sold = items.filter(i => i.status === 'sold')
    const stockValue = inStock.reduce((s, i) => s + (i.purchase_price || 0), 0)
    const revenue = sold.reduce((s, i) => s + (i.sale_price || 0), 0)
    const soldCost = sold.reduce((s, i) => s + (i.purchase_price || 0), 0)
    const pl = revenue - soldCost
    const now = new Date()
    const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    const monthSold = sold.filter(i => getMonthKey(i.sold_at) === thisMonth)
    const monthPL = monthSold.reduce((s, i) => s + ((i.sale_price || 0) - (i.purchase_price || 0)), 0)
    return { total: items.length, inStock: inStock.length, sold: sold.length, stockValue, revenue, pl, monthPL }
  }, [items])

  const plChartData = useMemo(() => getLast(chartMonths).map(({ key, label }) => {
    const sold = items.filter(i => i.status === 'sold' && getMonthKey(i.sold_at) === key)
    return {
      label,
      pl: parseFloat(sold.reduce((s, i) => s + ((i.sale_price||0)-(i.purchase_price||0)), 0).toFixed(2)),
      revenue: parseFloat(sold.reduce((s, i) => s + (i.sale_price||0), 0).toFixed(2)),
      cost: parseFloat(sold.reduce((s, i) => s + (i.purchase_price||0), 0).toFixed(2))
    }
  }), [items, chartMonths])

  const categoryData = useMemo(() => {
    const map = {}
    items.forEach(i => { const cat = i.category||'Other'; if(!map[cat]) map[cat]=0; map[cat]++ })
    return Object.entries(map).map(([name,value])=>({name,value}))
  }, [items])

  const brandData = useMemo(() => {
    const map = {}
    items.filter(i=>i.status==='sold').forEach(i => { const b=i.brand||'Unknown'; if(!map[b])map[b]=0; map[b]+=(i.sale_price||0)-(i.purchase_price||0) })
    return Object.entries(map).map(([brand,pl])=>({brand,pl:parseFloat(pl.toFixed(2))})).sort((a,b)=>b.pl-a.pl).slice(0,8)
  }, [items])

  const avgPLData = useMemo(() => getLast(6).map(({ key, label }) => {
    const sold = items.filter(i=>i.status==='sold'&&getMonthKey(i.sold_at)===key)
    const avg = sold.length ? sold.reduce((s,i)=>s+((i.sale_price||0)-(i.purchase_price||0)),0)/sold.length : 0
    return { label, avg: parseFloat(avg.toFixed(2)) }
  }), [items])

  const sellThroughData = useMemo(() => {
    const map = {}
    items.forEach(i => { const cat=i.category||'Other'; if(!map[cat])map[cat]={total:0,sold:0}; map[cat].total++; if(i.status==='sold')map[cat].sold++ })
    return Object.entries(map).map(([cat,{total,sold}])=>({cat,rate:parseFloat(((sold/total)*100).toFixed(1))}))
  }, [items])

  const bestWorst = useMemo(() => {
    const sold = items.filter(i=>i.status==='sold'&&i.sale_price!=null).map(i=>({...i,pl:(i.sale_price||0)-(i.purchase_price||0)})).sort((a,b)=>b.pl-a.pl)
    return { best: sold.slice(0,5), worst: sold.slice(-5).reverse() }
  }, [items])

  const plSell = sellItem ? (parseFloat(salePrice)||0)-(sellItem.purchase_price||0) : 0
  const username = session?.user?.email?.split('@')[0] || 'there'

  if (authLoading) return <div className="auth-loading">Loading...</div>
  if (!session) return <AuthPage onAuth={() => fetchItems()} />

  return (
    <div className="app">
      <div className="topbar">
        <div className="topbar-brand"><span className="brand-mark" />StockTrack</div>
        <nav className="topbar-nav">
          {[{id:'home',label:'Home'},{id:'stock',label:'Stock'},{id:'metrics',label:'Metrics'}].map(n=>(
            <button key={n.id} className={`nav-btn ${page===n.id?'active':''}`} onClick={()=>setPage(n.id)}>{n.label}</button>
          ))}
        </nav>
        <div className="topbar-actions">
          {page==='stock' && <button className="btn primary" onClick={()=>{setForm(EMPTY_FORM);setEditItem(null);setSaveError('');setShowAdd(true)}}>+ Add item</button>}
          <div className="user-pill">
            <span className="user-email">{session.user.email}</span>
            <button className="btn sm" onClick={signOut}>Sign out</button>
          </div>
        </div>
      </div>

      <div className="main">

        {/* HOME */}
        {page==='home' && (
          <div>
            <div className="page-header">
              <h1 className="page-title">Welcome back, {username} 👋</h1>
              <p className="page-subtitle">Here's how your stock is performing</p>
            </div>
            <div className="stats-bar">
              <div className="stat-card"><div className="stat-label">Units in stock</div><div className="stat-value amber">{stats.inStock}</div></div>
              <div className="stat-card"><div className="stat-label">Stock value</div><div className="stat-value">{fmt(stats.stockValue)}</div></div>
              <div className="stat-card">
                <div className="stat-label">This month's profit</div>
                <div className={`stat-value ${stats.monthPL>0?'pos':stats.monthPL<0?'neg':''}`}>{stats.monthPL>=0?'+':''}{fmt(stats.monthPL)}</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">All-time P&L</div>
                <div className={`stat-value ${stats.pl>0?'pos':stats.pl<0?'neg':''}`}>{stats.pl>=0?'+':''}{fmt(stats.pl)}</div>
              </div>
              <div className="stat-card"><div className="stat-label">Total sold</div><div className="stat-value">{stats.sold}</div></div>
            </div>
            <div className="chart-card">
              <div className="chart-header">
                <div><div className="chart-title">Monthly Profit & Loss</div><div className="chart-subtitle">Net profit per month</div></div>
                <div className="chart-controls">{[3,6,12].map(m=><button key={m} className={`chart-btn ${chartMonths===m?'active':''}`} onClick={()=>setChartMonths(m)}>{m}M</button>)}</div>
              </div>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={plChartData} margin={{top:10,right:10,left:0,bottom:0}}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e3e8ef" vertical={false}/>
                  <XAxis dataKey="label" tick={{fontSize:12,fill:'#8792a2'}} axisLine={false} tickLine={false}/>
                  <YAxis tickFormatter={fmtShort} tick={{fontSize:12,fill:'#8792a2'}} axisLine={false} tickLine={false}/>
                  <Tooltip formatter={v=>fmt(v)} contentStyle={{borderRadius:8,border:'1px solid #e3e8ef',boxShadow:'0 4px 6px rgba(0,0,0,0.07)'}}/>
                  <Bar dataKey="pl" name="P&L" fill="#16a34a" radius={[4,4,0,0]}/>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* STOCK */}
        {page==='stock' && (
          <div>
            <div className="page-header"><h1 className="page-title">Stock</h1><p className="page-subtitle">Manage your inventory</p></div>
            <div className="stats-bar" style={{gridTemplateColumns:'repeat(auto-fit, minmax(130px, 1fr))'}}>
              <div className="stat-card"><div className="stat-label">Total units</div><div className="stat-value">{stats.total}</div></div>
              <div className="stat-card"><div className="stat-label">In stock</div><div className="stat-value amber">{stats.inStock}</div></div>
              <div className="stat-card"><div className="stat-label">Stock value</div><div className="stat-value">{fmt(stats.stockValue)}</div></div>
              <div className="stat-card"><div className="stat-label">Units sold</div><div className="stat-value">{stats.sold}</div></div>
              <div className="stat-card"><div className="stat-label">Revenue</div><div className="stat-value">{fmt(stats.revenue)}</div></div>
              <div className="stat-card"><div className="stat-label">Net P&L</div><div className={`stat-value ${stats.pl>0?'pos':stats.pl<0?'neg':''}`}>{stats.pl>=0?'+':''}{fmt(stats.pl)}</div></div>
            </div>
            <div className="filters">
              <input className="filter-input" placeholder="Search brand, style, SKU..." value={search} onChange={e=>setSearch(e.target.value)} style={{flex:1,minWidth:180}}/>
              <select className="filter-select" value={filterCategory} onChange={e=>setFilterCategory(e.target.value)}>
                <option value="">All categories</option>
                {CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}
              </select>
              <select className="filter-select" value={filterBrand} onChange={e=>setFilterBrand(e.target.value)}>
                <option value="">All brands</option>
                {[...new Set(items.map(i=>i.brand).filter(Boolean))].sort().map(b=><option key={b} value={b}>{b}</option>)}
              </select>
              <select className="filter-select" value={filterStatus} onChange={e=>setFilterStatus(e.target.value)}>
                <option value="">All statuses</option>
                <option value="in_stock">In stock</option>
                <option value="sold">Sold</option>
              </select>
              {(search||filterBrand||filterStatus||filterCategory)&&<button className="btn sm" onClick={()=>{setSearch('');setFilterBrand('');setFilterStatus('');setFilterCategory('')}}>Clear</button>}
              <span style={{color:'var(--muted)',fontSize:12}}>{filteredBatches.length} item{filteredBatches.length!==1?'s':''}</span>
            </div>

            {loading ? <div className="loading">Loading stock...</div> : filteredBatches.length===0 ? (
              <div className="empty">
                <div className="empty-icon">📦</div>
                <div className="empty-title">{items.length===0?'No stock yet':'No results'}</div>
                <div style={{marginTop:6}}>{items.length===0?'Add your first item to get started':'Try adjusting your filters'}</div>
              </div>
            ) : (
              <div className="card-grid">
                {filteredBatches.map(batch => {
                  const inStockUnits = batch.units.filter(u=>u.status==='in_stock')
                  const soldUnits = batch.units.filter(u=>u.status==='sold')
                  const totalCost = inStockUnits.reduce((s,u)=>s+(u.purchase_price||0),0)
                  const avgCost = inStockUnits.length ? totalCost/inStockUnits.length : 0
                  const totalPL = soldUnits.reduce((s,u)=>s+((u.sale_price||0)-(u.purchase_price||0)),0)
                  const allSold = inStockUnits.length===0
                  const isSingle = batch.units.length===1

                  return (
                    <div key={batch.key} className="item-card" onClick={!isSingle ? ()=>setBatchModal(batch) : undefined} style={!isSingle?{cursor:'pointer'}:{}}>
                      <div className="item-card-header">
                        <div className="item-card-info">
                          <div className="item-card-category">{batch.category||'Uncategorised'}</div>
                          <div className="item-card-brand">{batch.brand||'—'}</div>
                          <div className="item-card-style">{[batch.style,batch.colourway].filter(Boolean).join(' — ')||'—'}</div>
                        </div>
                        <span className={`badge ${allSold?'sold':'in_stock'}`} style={{flexShrink:0}}>{allSold?'Sold':`${inStockUnits.length} in stock`}</span>
                      </div>

                      <div className="item-card-stats">
                        <div className="item-card-stat">
                          <div className="item-card-stat-label">Size</div>
                          <div className="item-card-stat-value">
                            {isSingle ? (batch.units[0].size ? `UK ${batch.units[0].size}` : '—') : `${inStockUnits.length} unit${inStockUnits.length!==1?'s':''}`}
                          </div>
                        </div>
                        <div className="item-card-stat">
                          <div className="item-card-stat-label">Total cost</div>
                          <div className="item-card-stat-value">{fmt(totalCost)}</div>
                          {!isSingle && inStockUnits.length>0 && <div className="item-card-stat-avg">avg {fmt(avgCost)}</div>}
                        </div>
                        <div className="item-card-stat">
                          <div className="item-card-stat-label">P&L</div>
                          <div className={`item-card-stat-value ${plColor(soldUnits.length?totalPL:null)}`}>
                            {soldUnits.length ? (totalPL>=0?'+':'')+fmt(totalPL) : '—'}
                          </div>
                        </div>
                        <div className="item-card-stat">
                          <div className="item-card-stat-label">Sold</div>
                          <div className="item-card-stat-value">{soldUnits.length}/{batch.units.length}</div>
                        </div>
                      </div>

                      {(batch.sku||batch.purchase_date||batch.purchase_platform||batch.notes) && (
                        <div className="item-card-meta">
                          {batch.sku&&<span className="item-card-meta-tag">SKU: {batch.sku}</span>}
                          {batch.purchase_date&&<span className="item-card-meta-tag">Bought: {batch.purchase_date}</span>}
                          {batch.purchase_platform&&<span className="item-card-meta-tag">From: {batch.purchase_platform}</span>}
                          {batch.notes&&<span className="item-card-meta-tag">📝 {batch.notes.length>30?batch.notes.slice(0,30)+'...':batch.notes}</span>}
                        </div>
                      )}

                      <div className="item-card-actions" onClick={e=>e.stopPropagation()}>
                        {isSingle && batch.units[0].status==='in_stock' && (
                          <button className="btn sm success" style={{flex:1}} onClick={()=>{setSellItem(batch.units[0]);setSalePrice('');setSellingPlatform('')}}>Sell</button>
                        )}
                        {!isSingle && !allSold && (
                          <button className="btn sm success" style={{flex:1}} onClick={()=>setBatchModal(batch)}>View units</button>
                        )}
                        {isSingle && <button className="btn sm" onClick={()=>openEdit(batch.units[0])}>Edit</button>}
                        {isSingle
                          ? <button className="btn sm danger" onClick={()=>deleteItem(batch.units[0].id)}>Del</button>
                          : <button className="btn sm danger" onClick={()=>deleteBatch(batch.key)}>Del all</button>
                        }
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* METRICS */}
        {page==='metrics' && (
          <div>
            <div className="page-header"><h1 className="page-title">Metrics</h1><p className="page-subtitle">Deep dive into your performance</p></div>
            <div className="metrics-grid">
              <div className="chart-card full">
                <div className="chart-header">
                  <div><div className="chart-title">Monthly Profit & Loss</div><div className="chart-subtitle">Net profit per month</div></div>
                  <div className="chart-controls">{[3,6,12].map(m=><button key={m} className={`chart-btn ${chartMonths===m?'active':''}`} onClick={()=>setChartMonths(m)}>{m}M</button>)}</div>
                </div>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={plChartData} margin={{top:10,right:10,left:0,bottom:0}}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e3e8ef" vertical={false}/>
                    <XAxis dataKey="label" tick={{fontSize:12,fill:'#8792a2'}} axisLine={false} tickLine={false}/>
                    <YAxis tickFormatter={fmtShort} tick={{fontSize:12,fill:'#8792a2'}} axisLine={false} tickLine={false}/>
                    <Tooltip formatter={v=>fmt(v)} contentStyle={{borderRadius:8,border:'1px solid #e3e8ef'}}/>
                    <Bar dataKey="pl" name="P&L" fill="#16a34a" radius={[4,4,0,0]}/>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="chart-card full">
                <div className="chart-header"><div><div className="chart-title">Revenue vs Cost</div><div className="chart-subtitle">Monthly comparison</div></div></div>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={plChartData} margin={{top:10,right:10,left:0,bottom:0}}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e3e8ef" vertical={false}/>
                    <XAxis dataKey="label" tick={{fontSize:12,fill:'#8792a2'}} axisLine={false} tickLine={false}/>
                    <YAxis tickFormatter={fmtShort} tick={{fontSize:12,fill:'#8792a2'}} axisLine={false} tickLine={false}/>
                    <Tooltip formatter={v=>fmt(v)} contentStyle={{borderRadius:8,border:'1px solid #e3e8ef'}}/>
                    <Legend/>
                    <Bar dataKey="revenue" name="Revenue" fill="#16a34a" radius={[4,4,0,0]}/>
                    <Bar dataKey="cost" name="Cost" fill="#e3e8ef" radius={[4,4,0,0]}/>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="chart-card half">
                <div className="chart-header"><div><div className="chart-title">Stock by Category</div><div className="chart-subtitle">All items</div></div></div>
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie data={categoryData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={70} outerRadius={110} paddingAngle={3}>
                      {categoryData.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}
                    </Pie>
                    <Tooltip contentStyle={{borderRadius:8,border:'1px solid #e3e8ef'}}/>
                    <Legend/>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="chart-card half">
                <div className="chart-header"><div><div className="chart-title">Sell-Through Rate</div><div className="chart-subtitle">% sold per category</div></div></div>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={sellThroughData} layout="vertical" margin={{top:10,right:20,left:10,bottom:0}}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e3e8ef" horizontal={false}/>
                    <XAxis type="number" domain={[0,100]} tickFormatter={v=>v+'%'} tick={{fontSize:12,fill:'#8792a2'}} axisLine={false} tickLine={false}/>
                    <YAxis type="category" dataKey="cat" tick={{fontSize:12,fill:'#8792a2'}} axisLine={false} tickLine={false} width={80}/>
                    <Tooltip formatter={v=>v+'%'} contentStyle={{borderRadius:8,border:'1px solid #e3e8ef'}}/>
                    <Bar dataKey="rate" name="Sell-through %" fill="#22c55e" radius={[0,4,4,0]}/>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="chart-card half">
                <div className="chart-header"><div><div className="chart-title">Top Brands by Profit</div><div className="chart-subtitle">All-time</div></div></div>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={brandData} layout="vertical" margin={{top:10,right:20,left:10,bottom:0}}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e3e8ef" horizontal={false}/>
                    <XAxis type="number" tickFormatter={fmtShort} tick={{fontSize:12,fill:'#8792a2'}} axisLine={false} tickLine={false}/>
                    <YAxis type="category" dataKey="brand" tick={{fontSize:12,fill:'#8792a2'}} axisLine={false} tickLine={false} width={70}/>
                    <Tooltip formatter={v=>fmt(v)} contentStyle={{borderRadius:8,border:'1px solid #e3e8ef'}}/>
                    <Bar dataKey="pl" name="Profit" fill="#16a34a" radius={[0,4,4,0]}/>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="chart-card half">
                <div className="chart-header"><div><div className="chart-title">Avg Profit per Sale</div><div className="chart-subtitle">Last 6 months</div></div></div>
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={avgPLData} margin={{top:10,right:20,left:0,bottom:0}}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e3e8ef" vertical={false}/>
                    <XAxis dataKey="label" tick={{fontSize:12,fill:'#8792a2'}} axisLine={false} tickLine={false}/>
                    <YAxis tickFormatter={fmtShort} tick={{fontSize:12,fill:'#8792a2'}} axisLine={false} tickLine={false}/>
                    <Tooltip formatter={v=>fmt(v)} contentStyle={{borderRadius:8,border:'1px solid #e3e8ef'}}/>
                    <Line type="monotone" dataKey="avg" name="Avg P&L" stroke="#16a34a" strokeWidth={2} dot={{fill:'#16a34a',r:4}}/>
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="chart-card full">
                <div className="chart-header"><div><div className="chart-title">Best & Worst Performers</div><div className="chart-subtitle">Top and bottom 5 sold items by profit</div></div></div>
                <div className="two-col">
                  <div>
                    <div className="perf-label green">🏆 Best performers</div>
                    {bestWorst.best.length===0?<div className="td-muted" style={{fontSize:13}}>No sold items yet</div>:bestWorst.best.map((item,i)=>(
                      <div key={item.id} className="perf-row">
                        <div className="perf-rank">{i+1}</div>
                        <div className="perf-info"><div className="perf-name">{item.brand} {item.style}</div><div className="perf-sub">{item.colourway}{item.size?` · UK ${item.size}`:''}</div></div>
                        <div className="perf-pl pos">+{fmt(item.pl)}</div>
                      </div>
                    ))}
                  </div>
                  <div>
                    <div className="perf-label red">📉 Worst performers</div>
                    {bestWorst.worst.length===0?<div className="td-muted" style={{fontSize:13}}>No sold items yet</div>:bestWorst.worst.map((item,i)=>(
                      <div key={item.id} className="perf-row">
                        <div className="perf-rank">{i+1}</div>
                        <div className="perf-info"><div className="perf-name">{item.brand} {item.style}</div><div className="perf-sub">{item.colourway}{item.size?` · UK ${item.size}`:''}</div></div>
                        <div className={`perf-pl ${item.pl>=0?'pos':'neg'}`}>{item.pl>=0?'+':''}{fmt(item.pl)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
      {showAdd && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setShowAdd(false)}>
          <div className="modal">
            <div className="modal-title">{editItem?'Edit item':'Add new item'}</div>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Category</label>
                <select className="form-input" value={form.category} onChange={e=>setForm(f=>({...f,category:e.target.value}))}>
                  <option value="">Select category</option>
                  {CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Brand *</label>
                <input className="form-input" placeholder="e.g. Nike" value={form.brand} onChange={e=>setForm(f=>({...f,brand:e.target.value}))}/>
              </div>
              <div className="form-group">
                <label className="form-label">Style</label>
                <input className="form-input" placeholder="e.g. Air Max 95" value={form.style} onChange={e=>setForm(f=>({...f,style:e.target.value}))}/>
              </div>
              <div className="form-group">
                <label className="form-label">Colourway</label>
                <input className="form-input" placeholder="e.g. Pure Money" value={form.colourway} onChange={e=>setForm(f=>({...f,colourway:e.target.value}))}/>
              </div>
              <div className="form-group">
                <label className="form-label">SKU</label>
                <input className="form-input" placeholder="e.g. 308497-100" value={form.sku} onChange={e=>setForm(f=>({...f,sku:e.target.value}))}/>
              </div>
              <div className="form-group">
                <label className="form-label">Purchase date</label>
                <input className="form-input" type="date" value={form.purchase_date} onChange={e=>setForm(f=>({...f,purchase_date:e.target.value}))}/>
              </div>
              <div className="form-group full">
                <label className="form-label">Purchase platform</label>
                <input className="form-input" placeholder="e.g. JD, SNKRS, eBay" value={form.purchase_platform} onChange={e=>setForm(f=>({...f,purchase_platform:e.target.value}))}/>
              </div>
              <div className="form-group full">
                <label className="form-label">Notes</label>
                <input className="form-input" placeholder="e.g. Used, missing box..." value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))}/>
              </div>
            </div>

            <div className="units-section">
              <div className="units-header">
                <span className="form-label">Sizes & prices *</span>
                {!editItem && <button className="btn sm" onClick={addUnit}>+ Add size</button>}
              </div>
              {form.units.map((unit,i)=>(
                <div key={i} className="unit-row">
                  <input className="form-input" placeholder="Size (UK)" value={unit.size} onChange={e=>updateUnit(i,'size',e.target.value)} style={{flex:1}}/>
                  <input className="form-input" type="number" step="0.01" placeholder="Price (£)" value={unit.purchase_price} onChange={e=>updateUnit(i,'purchase_price',e.target.value)} style={{flex:1}}/>
                  {form.units.length>1 && <button className="btn sm danger" onClick={()=>removeUnit(i)}>✕</button>}
                </div>
              ))}
            </div>

            {saveError && <div style={{color:'#e53e3e',fontSize:13,marginTop:8}}>Error: {saveError}</div>}
            <div className="form-actions">
              <button className="btn" onClick={()=>{setShowAdd(false);setEditItem(null);setForm(EMPTY_FORM);setSaveError('')}}>Cancel</button>
              <button className="btn primary" onClick={saveItem} disabled={saving}>{saving?'Saving...':editItem?'Save changes':'Add item'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Batch Modal */}
      {batchModal && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setBatchModal(null)}>
          <div className="modal" style={{maxWidth:560}}>
            <div className="modal-title">{batchModal.brand} {batchModal.style}</div>
            {batchModal.colourway && <div style={{fontSize:13,color:'var(--muted)',marginTop:-12,marginBottom:16}}>{batchModal.colourway}</div>}
            <div className="batch-units">
              {batchModal.units.map(unit=>{
                const pl = unit.status==='sold'&&unit.sale_price!=null ? unit.sale_price-(unit.purchase_price||0) : null
                return (
                  <div key={unit.id} className={`batch-unit-row ${unit.status==='sold'?'sold':''}`}>
                    <div className="batch-unit-info">
                      <div className="batch-unit-size">{unit.size?`UK ${unit.size}`:'No size'}</div>
                      <div className="batch-unit-cost">{fmt(unit.purchase_price)}</div>
                    </div>
                    <div className="batch-unit-right">
                      {unit.status==='sold' ? (
                        <div className="batch-unit-sold">
                          <span className="badge sold">Sold</span>
                          <span className={`batch-unit-pl ${plColor(pl)}`}>{pl!=null?(pl>=0?'+':'')+fmt(pl):'—'}</span>
                        </div>
                      ) : (
                        <div style={{display:'flex',gap:6}}>
                          <button className="btn sm success" onClick={()=>{setSellItem(unit);setSalePrice('');setSellingPlatform('')}}>Sell</button>
                          <button className="btn sm" onClick={()=>{openEdit(unit);setBatchModal(null)}}>Edit</button>
                          <button className="btn sm danger" onClick={()=>deleteItem(unit.id)}>Del</button>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="form-actions" style={{marginTop:16}}>
              <button className="btn" onClick={()=>setBatchModal(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Sell Modal */}
      {sellItem && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setSellItem(null)}>
          <div className="modal">
            <div className="modal-title">Mark as sold</div>
            <div className="sell-info">
              <strong>{sellItem.brand} {sellItem.style}</strong>
              {sellItem.colourway&&` — ${sellItem.colourway}`}
              {sellItem.size&&` · Size ${sellItem.size}`}
              <div style={{marginTop:4}}>Cost price: <strong>{fmt(sellItem.purchase_price)}</strong></div>
            </div>
            <div className="form-group">
              <label className="form-label">Sale price (£)</label>
              <input className="form-input" type="number" step="0.01" placeholder="0.00" value={salePrice} onChange={e=>setSalePrice(e.target.value)} autoFocus/>
            </div>
            <div className="form-group" style={{marginTop:12}}>
              <label className="form-label">Selling platform</label>
              <input className="form-input" placeholder="e.g. eBay, StockX, Vinted" value={sellingPlatform} onChange={e=>setSellingPlatform(e.target.value)}/>
            </div>
            {salePrice && (
              <div className="pl-preview">
                <span style={{color:'var(--muted)'}}>P&L</span>
                <span className={plColor(plSell)} style={{fontWeight:600}}>{plSell>=0?'+':''}{fmt(plSell)}</span>
              </div>
            )}
            <div className="form-actions" style={{marginTop:16}}>
              <button className="btn" onClick={()=>setSellItem(null)}>Cancel</button>
              <button className="btn primary" onClick={markSold} disabled={saving||!salePrice}>{saving?'Saving...':'Confirm sale'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}