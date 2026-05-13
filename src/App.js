import React, { useState, useEffect, useMemo } from 'react'
import { supabase } from './supabase'
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts'
import './index.css'

const CATEGORIES = ['Sneakers', 'Pokémon', 'Lego', 'Clothing', 'Accessories', 'Electronics', 'Miscellaneous']
const USERNAME = 'Luke'

const EMPTY_FORM = {
  category: '', brand: '', style: '', colourway: '', sku: '', size: '',
  purchase_platform: '', purchase_price: '', purchase_date: '', notes: ''
}

const COLORS = ['#16a34a','#22c55e','#4ade80','#86efac','#bbf7d0','#f59e0b','#3b82f6']

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

export default function App() {
  const [page, setPage] = useState('home')
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [sellItem, setSellItem] = useState(null)
  const [salePrice, setSalePrice] = useState('')
  const [sellingPlatform, setSellingPlatform] = useState('')
  const [form, setForm] = useState(EMPTY_FORM)
  const [search, setSearch] = useState('')
  const [filterBrand, setFilterBrand] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [sortCol, setSortCol] = useState('created_at')
  const [sortDir, setSortDir] = useState('desc')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [chartMonths, setChartMonths] = useState(6)

  useEffect(() => { fetchItems() }, [])

  async function fetchItems() {
    setLoading(true)
    const { data, error } = await supabase.from('stock').select('*').order('created_at', { ascending: false })
    if (error) console.error('Fetch error:', error)
    setItems(data || [])
    setLoading(false)
  }

  async function saveItem() {
    if (!form.brand || !form.purchase_price) return
    setSaving(true)
    setSaveError('')
    const payload = { ...form, purchase_price: parseFloat(form.purchase_price) || 0, purchase_date: form.purchase_date || null }
    let error
    if (editItem) {
      ({ error } = await supabase.from('stock').update(payload).eq('id', editItem.id))
    } else {
      ({ error } = await supabase.from('stock').insert([{ ...payload, status: 'in_stock' }]))
    }
    setSaving(false)
    if (error) { setSaveError(error.message); return }
    setShowAdd(false); setEditItem(null); setForm(EMPTY_FORM); fetchItems()
  }

  async function deleteItem(id) {
    if (!window.confirm('Delete this item?')) return
    await supabase.from('stock').delete().eq('id', id)
    fetchItems()
  }

  async function markSold() {
    if (!salePrice || !sellItem) return
    setSaving(true)
    await supabase.from('stock').update({
      status: 'sold', sale_price: parseFloat(salePrice),
      selling_platform: sellingPlatform, sold_at: new Date().toISOString()
    }).eq('id', sellItem.id)
    setSaving(false); setSellItem(null); setSalePrice(''); setSellingPlatform(''); fetchItems()
  }

  function openEdit(item) {
    setForm({
      category: item.category || '', brand: item.brand || '', style: item.style || '',
      colourway: item.colourway || '', sku: item.sku || '', size: item.size || '',
      purchase_platform: item.purchase_platform || '', purchase_price: item.purchase_price || '',
      purchase_date: item.purchase_date || '', notes: item.notes || ''
    })
    setEditItem(item); setShowAdd(true)
  }

  function handleSort(col) {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortCol(col); setSortDir('asc') }
  }

  function sortArrow(col) {
    if (sortCol !== col) return ' ↕'
    return sortDir === 'asc' ? ' ↑' : ' ↓'
  }

  // Derived stats
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

  // Chart data
  const plChartData = useMemo(() => {
    const months = getLast(chartMonths)
    return months.map(({ key, label }) => {
      const sold = items.filter(i => i.status === 'sold' && getMonthKey(i.sold_at) === key)
      const pl = sold.reduce((s, i) => s + ((i.sale_price || 0) - (i.purchase_price || 0)), 0)
      const revenue = sold.reduce((s, i) => s + (i.sale_price || 0), 0)
      const cost = sold.reduce((s, i) => s + (i.purchase_price || 0), 0)
      return { label, pl: parseFloat(pl.toFixed(2)), revenue: parseFloat(revenue.toFixed(2)), cost: parseFloat(cost.toFixed(2)) }
    })
  }, [items, chartMonths])

  const categoryData = useMemo(() => {
    const map = {}
    items.forEach(i => {
      const cat = i.category || 'Other'
      if (!map[cat]) map[cat] = 0
      map[cat]++
    })
    return Object.entries(map).map(([name, value]) => ({ name, value }))
  }, [items])

  const brandData = useMemo(() => {
    const map = {}
    items.filter(i => i.status === 'sold').forEach(i => {
      const b = i.brand || 'Unknown'
      if (!map[b]) map[b] = 0
      map[b] += (i.sale_price || 0) - (i.purchase_price || 0)
    })
    return Object.entries(map)
      .map(([brand, pl]) => ({ brand, pl: parseFloat(pl.toFixed(2)) }))
      .sort((a, b) => b.pl - a.pl)
      .slice(0, 8)
  }, [items])

  const avgPLData = useMemo(() => {
    const months = getLast(6)
    return months.map(({ key, label }) => {
      const sold = items.filter(i => i.status === 'sold' && getMonthKey(i.sold_at) === key)
      const avg = sold.length ? sold.reduce((s, i) => s + ((i.sale_price || 0) - (i.purchase_price || 0)), 0) / sold.length : 0
      return { label, avg: parseFloat(avg.toFixed(2)) }
    })
  }, [items])

  const sellThroughData = useMemo(() => {
    const map = {}
    items.forEach(i => {
      const cat = i.category || 'Other'
      if (!map[cat]) map[cat] = { total: 0, sold: 0 }
      map[cat].total++
      if (i.status === 'sold') map[cat].sold++
    })
    return Object.entries(map).map(([cat, { total, sold }]) => ({
      cat, rate: parseFloat(((sold / total) * 100).toFixed(1))
    }))
  }, [items])

  const bestWorst = useMemo(() => {
    const sold = items.filter(i => i.status === 'sold' && i.sale_price != null)
      .map(i => ({ ...i, pl: (i.sale_price || 0) - (i.purchase_price || 0) }))
      .sort((a, b) => b.pl - a.pl)
    return { best: sold.slice(0, 5), worst: sold.slice(-5).reverse() }
  }, [items])

  const filtered = useMemo(() => {
    let res = [...items]
    if (search) {
      const q = search.toLowerCase()
      res = res.filter(i =>
        (i.brand||'').toLowerCase().includes(q) ||
        (i.style||'').toLowerCase().includes(q) ||
        (i.colourway||'').toLowerCase().includes(q) ||
        (i.sku||'').toLowerCase().includes(q)
      )
    }
    if (filterBrand) res = res.filter(i => i.brand === filterBrand)
    if (filterStatus) res = res.filter(i => i.status === filterStatus)
    if (filterCategory) res = res.filter(i => i.category === filterCategory)
    res.sort((a, b) => {
      let va = a[sortCol], vb = b[sortCol]
      if (va == null) va = ''; if (vb == null) vb = ''
      if (typeof va === 'string') va = va.toLowerCase()
      if (typeof vb === 'string') vb = vb.toLowerCase()
      if (va < vb) return sortDir === 'asc' ? -1 : 1
      if (va > vb) return sortDir === 'asc' ? 1 : -1
      return 0
    })
    return res
  }, [items, search, filterBrand, filterStatus, filterCategory, sortCol, sortDir])

  const plSell = sellItem ? (parseFloat(salePrice) || 0) - (sellItem.purchase_price || 0) : 0

  const navItems = [
    { id: 'home', label: 'Home' },
    { id: 'stock', label: 'Stock' },
    { id: 'metrics', label: 'Metrics' },
  ]

  return (
    <div className="app">
      {/* Topbar */}
      <div className="topbar">
        <div className="topbar-brand">
          <span className="brand-mark" />
          StockTrack
        </div>
        <nav className="topbar-nav">
          {navItems.map(n => (
            <button key={n.id} className={`nav-btn ${page === n.id ? 'active' : ''}`} onClick={() => setPage(n.id)}>
              {n.label}
            </button>
          ))}
        </nav>
        <div className="topbar-actions">
          {page === 'stock' && (
            <button className="btn primary" onClick={() => { setForm(EMPTY_FORM); setEditItem(null); setSaveError(''); setShowAdd(true) }}>+ Add item</button>
          )}
        </div>
      </div>

      <div className="main">

        {/* HOME PAGE */}
        {page === 'home' && (
          <div>
            <div className="page-header">
              <h1 className="page-title">Welcome back, {USERNAME} 👋</h1>
              <p className="page-subtitle">Here's how your stock is performing</p>
            </div>

            <div className="stats-bar">
              <div className="stat-card">
                <div className="stat-label">Items in stock</div>
                <div className="stat-value amber">{stats.inStock}</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Stock value</div>
                <div className="stat-value">{fmt(stats.stockValue)}</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">This month's profit</div>
                <div className={`stat-value ${stats.monthPL > 0 ? 'pos' : stats.monthPL < 0 ? 'neg' : ''}`}>
                  {stats.monthPL >= 0 ? '+' : ''}{fmt(stats.monthPL)}
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-label">All-time P&L</div>
                <div className={`stat-value ${stats.pl > 0 ? 'pos' : stats.pl < 0 ? 'neg' : ''}`}>
                  {stats.pl >= 0 ? '+' : ''}{fmt(stats.pl)}
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Total sold</div>
                <div className="stat-value">{stats.sold}</div>
              </div>
            </div>

            {/* P&L Chart */}
            <div className="chart-card">
              <div className="chart-header">
                <div>
                  <div className="chart-title">Monthly Profit & Loss</div>
                  <div className="chart-subtitle">Net profit per month</div>
                </div>
                <div className="chart-controls">
                  {[3, 6, 12].map(m => (
                    <button key={m} className={`chart-btn ${chartMonths === m ? 'active' : ''}`} onClick={() => setChartMonths(m)}>
                      {m}M
                    </button>
                  ))}
                </div>
              </div>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={plChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e3e8ef" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#8792a2' }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={fmtShort} tick={{ fontSize: 12, fill: '#8792a2' }} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(v) => fmt(v)} contentStyle={{ borderRadius: 8, border: '1px solid #e3e8ef', boxShadow: '0 4px 6px rgba(0,0,0,0.07)' }} />
                  <Bar dataKey="pl" name="P&L" fill="#16a34a" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* STOCK PAGE */}
        {page === 'stock' && (
          <div>
            <div className="page-header">
              <h1 className="page-title">Stock</h1>
              <p className="page-subtitle">Manage your inventory</p>
            </div>

            <div className="stats-bar" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))' }}>
              <div className="stat-card">
                <div className="stat-label">Total items</div>
                <div className="stat-value">{stats.total}</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">In stock</div>
                <div className="stat-value amber">{stats.inStock}</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Stock value</div>
                <div className="stat-value">{fmt(stats.stockValue)}</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Items sold</div>
                <div className="stat-value">{stats.sold}</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Revenue</div>
                <div className="stat-value">{fmt(stats.revenue)}</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Net P&L</div>
                <div className={`stat-value ${stats.pl > 0 ? 'pos' : stats.pl < 0 ? 'neg' : ''}`}>
                  {stats.pl >= 0 ? '+' : ''}{fmt(stats.pl)}
                </div>
              </div>
            </div>

            <div className="filters">
              <input className="filter-input" placeholder="Search brand, style, SKU..." value={search} onChange={e => setSearch(e.target.value)} style={{ flex: 1, minWidth: 180 }} />
              <select className="filter-select" value={filterCategory} onChange={e => setFilterCategory(e.target.value)}>
                <option value="">All categories</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <select className="filter-select" value={filterBrand} onChange={e => setFilterBrand(e.target.value)}>
                <option value="">All brands</option>
                {[...new Set(items.map(i => i.brand).filter(Boolean))].sort().map(b => <option key={b} value={b}>{b}</option>)}
              </select>
              <select className="filter-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                <option value="">All statuses</option>
                <option value="in_stock">In stock</option>
                <option value="sold">Sold</option>
              </select>
              {(search || filterBrand || filterStatus || filterCategory) && (
                <button className="btn sm" onClick={() => { setSearch(''); setFilterBrand(''); setFilterStatus(''); setFilterCategory('') }}>Clear</button>
              )}
              <span style={{ color: 'var(--muted)', fontSize: 12 }}>{filtered.length} item{filtered.length !== 1 ? 's' : ''}</span>
            </div>

            {loading ? (
              <div className="loading">Loading stock...</div>
            ) : filtered.length === 0 ? (
              <div className="empty">
                <div className="empty-icon">📦</div>
                <div className="empty-title">{items.length === 0 ? 'No stock yet' : 'No results'}</div>
                <div style={{ marginTop: 6 }}>{items.length === 0 ? 'Add your first item to get started' : 'Try adjusting your filters'}</div>
              </div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th onClick={() => handleSort('category')}>Category{sortArrow('category')}</th>
                      <th onClick={() => handleSort('brand')}>Brand{sortArrow('brand')}</th>
                      <th onClick={() => handleSort('style')}>Style{sortArrow('style')}</th>
                      <th onClick={() => handleSort('colourway')}>Colourway{sortArrow('colourway')}</th>
                      <th onClick={() => handleSort('size')}>Size{sortArrow('size')}</th>
                      <th onClick={() => handleSort('sku')}>SKU{sortArrow('sku')}</th>
                      <th onClick={() => handleSort('purchase_date')}>Purchased{sortArrow('purchase_date')}</th>
                      <th onClick={() => handleSort('purchase_price')}>Cost{sortArrow('purchase_price')}</th>
                      <th onClick={() => handleSort('sale_price')}>Sale{sortArrow('sale_price')}</th>
                      <th onClick={() => handleSort('selling_platform')}>Sold via{sortArrow('selling_platform')}</th>
                      <th onClick={() => handleSort('status')}>P&amp;L{sortArrow('status')}</th>
                      <th onClick={() => handleSort('status')}>Status{sortArrow('status')}</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(item => {
                      const pl = item.status === 'sold' && item.sale_price != null ? item.sale_price - (item.purchase_price || 0) : null
                      return (
                        <tr key={item.id}>
                          <td className="td-muted">{item.category || '—'}</td>
                          <td style={{ fontWeight: 500 }}>{item.brand || '—'}</td>
                          <td>{item.style || '—'}</td>
                          <td className="td-muted">{item.colourway || '—'}</td>
                          <td className="td-muted">{item.size || '—'}</td>
                          <td className="td-muted">{item.sku || '—'}</td>
                          <td className="td-muted">{item.purchase_date || '—'}</td>
                          <td>{fmt(item.purchase_price)}</td>
                          <td>{item.sale_price ? fmt(item.sale_price) : <span className="td-muted">—</span>}</td>
                          <td className="td-muted">{item.selling_platform || '—'}</td>
                          <td className={plColor(pl)}>{pl != null ? (pl >= 0 ? '+' : '') + fmt(pl) : <span className="td-muted">—</span>}</td>
                          <td><span className={`badge ${item.status}`}>{item.status === 'in_stock' ? 'In stock' : 'Sold'}</span></td>
                          <td>
                            <div style={{ display: 'flex', gap: 5 }}>
                              {item.status === 'in_stock' && <button className="btn sm success" onClick={() => { setSellItem(item); setSalePrice(''); setSellingPlatform('') }}>Sell</button>}
                              <button className="btn sm" onClick={() => openEdit(item)}>Edit</button>
                              <button className="btn sm danger" onClick={() => deleteItem(item.id)}>Del</button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* METRICS PAGE */}
        {page === 'metrics' && (
          <div>
            <div className="page-header">
              <h1 className="page-title">Metrics</h1>
              <p className="page-subtitle">Deep dive into your performance</p>
            </div>

            <div className="metrics-grid">
              {/* P&L by month */}
              <div className="chart-card full">
                <div className="chart-header">
                  <div>
                    <div className="chart-title">Monthly Profit & Loss</div>
                    <div className="chart-subtitle">Net profit per month</div>
                  </div>
                  <div className="chart-controls">
                    {[3, 6, 12].map(m => (
                      <button key={m} className={`chart-btn ${chartMonths === m ? 'active' : ''}`} onClick={() => setChartMonths(m)}>{m}M</button>
                    ))}
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={plChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e3e8ef" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#8792a2' }} axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={fmtShort} tick={{ fontSize: 12, fill: '#8792a2' }} axisLine={false} tickLine={false} />
                    <Tooltip formatter={(v) => fmt(v)} contentStyle={{ borderRadius: 8, border: '1px solid #e3e8ef' }} />
                    <Bar dataKey="pl" name="P&L" fill="#16a34a" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Revenue vs Cost */}
              <div className="chart-card full">
                <div className="chart-header">
                  <div>
                    <div className="chart-title">Revenue vs Cost</div>
                    <div className="chart-subtitle">Monthly comparison</div>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={plChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e3e8ef" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#8792a2' }} axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={fmtShort} tick={{ fontSize: 12, fill: '#8792a2' }} axisLine={false} tickLine={false} />
                    <Tooltip formatter={(v) => fmt(v)} contentStyle={{ borderRadius: 8, border: '1px solid #e3e8ef' }} />
                    <Legend />
                    <Bar dataKey="revenue" name="Revenue" fill="#16a34a" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="cost" name="Cost" fill="#e3e8ef" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Stock by category donut */}
              <div className="chart-card half">
                <div className="chart-header">
                  <div>
                    <div className="chart-title">Stock by Category</div>
                    <div className="chart-subtitle">All items</div>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie data={categoryData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={70} outerRadius={110} paddingAngle={3}>
                      {categoryData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e3e8ef' }} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Sell-through by category */}
              <div className="chart-card half">
                <div className="chart-header">
                  <div>
                    <div className="chart-title">Sell-Through Rate</div>
                    <div className="chart-subtitle">% sold per category</div>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={sellThroughData} layout="vertical" margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e3e8ef" horizontal={false} />
                    <XAxis type="number" domain={[0, 100]} tickFormatter={v => v + '%'} tick={{ fontSize: 12, fill: '#8792a2' }} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="cat" tick={{ fontSize: 12, fill: '#8792a2' }} axisLine={false} tickLine={false} width={80} />
                    <Tooltip formatter={v => v + '%'} contentStyle={{ borderRadius: 8, border: '1px solid #e3e8ef' }} />
                    <Bar dataKey="rate" name="Sell-through %" fill="#22c55e" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Top brands by profit */}
              <div className="chart-card half">
                <div className="chart-header">
                  <div>
                    <div className="chart-title">Top Brands by Profit</div>
                    <div className="chart-subtitle">All-time</div>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={brandData} layout="vertical" margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e3e8ef" horizontal={false} />
                    <XAxis type="number" tickFormatter={fmtShort} tick={{ fontSize: 12, fill: '#8792a2' }} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="brand" tick={{ fontSize: 12, fill: '#8792a2' }} axisLine={false} tickLine={false} width={70} />
                    <Tooltip formatter={v => fmt(v)} contentStyle={{ borderRadius: 8, border: '1px solid #e3e8ef' }} />
                    <Bar dataKey="pl" name="Profit" fill="#16a34a" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Avg profit per sale */}
              <div className="chart-card half">
                <div className="chart-header">
                  <div>
                    <div className="chart-title">Avg Profit per Sale</div>
                    <div className="chart-subtitle">Last 6 months</div>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={avgPLData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e3e8ef" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#8792a2' }} axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={fmtShort} tick={{ fontSize: 12, fill: '#8792a2' }} axisLine={false} tickLine={false} />
                    <Tooltip formatter={v => fmt(v)} contentStyle={{ borderRadius: 8, border: '1px solid #e3e8ef' }} />
                    <Line type="monotone" dataKey="avg" name="Avg P&L" stroke="#16a34a" strokeWidth={2} dot={{ fill: '#16a34a', r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Best & Worst performers */}
              <div className="chart-card full">
                <div className="chart-header">
                  <div>
                    <div className="chart-title">Best & Worst Performers</div>
                    <div className="chart-subtitle">Top and bottom 5 sold items by profit</div>
                  </div>
                </div>
                <div className="two-col">
                  <div>
                    <div className="perf-label green">🏆 Best performers</div>
                    {bestWorst.best.length === 0 ? <div className="td-muted" style={{fontSize:13}}>No sold items yet</div> : bestWorst.best.map((item, i) => (
                      <div key={item.id} className="perf-row">
                        <div className="perf-rank">{i + 1}</div>
                        <div className="perf-info">
                          <div className="perf-name">{item.brand} {item.style}</div>
                          <div className="perf-sub">{item.colourway} {item.size ? `· UK ${item.size}` : ''}</div>
                        </div>
                        <div className="perf-pl pos">+{fmt(item.pl)}</div>
                      </div>
                    ))}
                  </div>
                  <div>
                    <div className="perf-label red">📉 Worst performers</div>
                    {bestWorst.worst.length === 0 ? <div className="td-muted" style={{fontSize:13}}>No sold items yet</div> : bestWorst.worst.map((item, i) => (
                      <div key={item.id} className="perf-row">
                        <div className="perf-rank">{i + 1}</div>
                        <div className="perf-info">
                          <div className="perf-name">{item.brand} {item.style}</div>
                          <div className="perf-sub">{item.colourway} {item.size ? `· UK ${item.size}` : ''}</div>
                        </div>
                        <div className={`perf-pl ${item.pl >= 0 ? 'pos' : 'neg'}`}>{item.pl >= 0 ? '+' : ''}{fmt(item.pl)}</div>
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
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowAdd(false)}>
          <div className="modal">
            <div className="modal-title">{editItem ? 'Edit item' : 'Add new item'}</div>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Category</label>
                <select className="form-input" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                  <option value="">Select category</option>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Brand *</label>
                <input className="form-input" placeholder="e.g. Nike" value={form.brand} onChange={e => setForm(f => ({ ...f, brand: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Style</label>
                <input className="form-input" placeholder="e.g. Air Max 95" value={form.style} onChange={e => setForm(f => ({ ...f, style: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Colourway</label>
                <input className="form-input" placeholder="e.g. Pure Money" value={form.colourway} onChange={e => setForm(f => ({ ...f, colourway: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Size (UK)</label>
                <input className="form-input" placeholder="e.g. 9" value={form.size} onChange={e => setForm(f => ({ ...f, size: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">SKU</label>
                <input className="form-input" placeholder="e.g. 308497-100" value={form.sku} onChange={e => setForm(f => ({ ...f, sku: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Purchase price (£) *</label>
                <input className="form-input" type="number" step="0.01" placeholder="0.00" value={form.purchase_price} onChange={e => setForm(f => ({ ...f, purchase_price: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Purchase date</label>
                <input className="form-input" type="date" value={form.purchase_date} onChange={e => setForm(f => ({ ...f, purchase_date: e.target.value }))} />
              </div>
              <div className="form-group full">
                <label className="form-label">Purchase platform</label>
                <input className="form-input" placeholder="e.g. JD, SNKRS, eBay" value={form.purchase_platform} onChange={e => setForm(f => ({ ...f, purchase_platform: e.target.value }))} />
              </div>
              <div className="form-group full">
                <label className="form-label">Notes</label>
                <input className="form-input" placeholder="e.g. Used, missing box..." value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
              </div>
            </div>
            {saveError && <div style={{ color: '#e53e3e', fontSize: 13, marginTop: 8 }}>Error: {saveError}</div>}
            <div className="form-actions">
              <button className="btn" onClick={() => { setShowAdd(false); setEditItem(null); setForm(EMPTY_FORM); setSaveError('') }}>Cancel</button>
              <button className="btn primary" onClick={saveItem} disabled={saving}>{saving ? 'Saving...' : editItem ? 'Save changes' : 'Add item'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Sell Modal */}
      {sellItem && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setSellItem(null)}>
          <div className="modal">
            <div className="modal-title">Mark as sold</div>
            <div className="sell-info">
              <strong>{sellItem.brand} {sellItem.style}</strong>
              {sellItem.colourway && ` — ${sellItem.colourway}`}
              {sellItem.size && ` · Size ${sellItem.size}`}
              <div style={{ marginTop: 4 }}>Cost price: <strong>{fmt(sellItem.purchase_price)}</strong></div>
            </div>
            <div className="form-group">
              <label className="form-label">Sale price (£)</label>
              <input className="form-input" type="number" step="0.01" placeholder="0.00" value={salePrice} onChange={e => setSalePrice(e.target.value)} autoFocus />
            </div>
            <div className="form-group" style={{ marginTop: 12 }}>
              <label className="form-label">Selling platform</label>
              <input className="form-input" placeholder="e.g. eBay, StockX, Vinted" value={sellingPlatform} onChange={e => setSellingPlatform(e.target.value)} />
            </div>
            {salePrice && (
              <div className="pl-preview">
                <span style={{ color: 'var(--muted)' }}>P&L</span>
                <span className={plColor(plSell)} style={{ fontWeight: 600 }}>{plSell >= 0 ? '+' : ''}{fmt(plSell)}</span>
              </div>
            )}
            <div className="form-actions" style={{ marginTop: 16 }}>
              <button className="btn" onClick={() => setSellItem(null)}>Cancel</button>
              <button className="btn primary" onClick={markSold} disabled={saving || !salePrice}>{saving ? 'Saving...' : 'Confirm sale'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}