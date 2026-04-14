import React, { useState, useEffect, useMemo } from 'react'
import { supabase } from './supabase'
import './index.css'

const BRANDS = ['Nike', 'Adidas', 'UGG', 'ASICS', 'Vans', 'New Balance', 'Puma', 'Reebok', 'Pokémon', 'Lego', 'Other']
const PLATFORMS = ['SNKRS', 'Nike', 'Adidas', 'JD', 'ASOS', 'eBay', 'Vinted', 'StockX', 'GOAT', 'Offspring', 'Other', 'IRL']
const SELLING_PLATFORMS = ['eBay', 'StockX', 'GOAT', 'Vinted', 'Depop', 'Instagram', 'Discord', 'In Person', 'Other']

const EMPTY_FORM = {
  brand: '', style: '', colourway: '', sku: '', size: '',
  purchase_platform: '', selling_platform: '', purchase_price: '', notes: ''
}

function fmt(n) {
  if (n == null || n === '') return '—'
  return '£' + Number(n).toFixed(2)
}

function plColor(pl) {
  if (pl == null) return ''
  if (pl > 0) return 'td-pos'
  if (pl < 0) return 'td-neg'
  return ''
}

export default function App() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [sellItem, setSellItem] = useState(null)
  const [salePrice, setSalePrice] = useState('')
  const [form, setForm] = useState(EMPTY_FORM)
  const [search, setSearch] = useState('')
  const [filterBrand, setFilterBrand] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [sortCol, setSortCol] = useState('created_at')
  const [sortDir, setSortDir] = useState('desc')
  const [saving, setSaving] = useState(false)

  useEffect(() => { fetchItems() }, [])

  async function fetchItems() {
    setLoading(true)
    const { data } = await supabase.from('stock').select('*').order('created_at', { ascending: false })
    setItems(data || [])
    setLoading(false)
  }

  async function saveItem() {
    if (!form.brand || !form.purchase_price) return
    setSaving(true)
    const payload = { ...form, purchase_price: parseFloat(form.purchase_price) || 0 }
    if (editItem) {
      await supabase.from('stock').update(payload).eq('id', editItem.id)
    } else {
      await supabase.from('stock').insert([{ ...payload, status: 'in_stock' }])
    }
    setSaving(false)
    setShowAdd(false)
    setEditItem(null)
    setForm(EMPTY_FORM)
    fetchItems()
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
      status: 'sold',
      sale_price: parseFloat(salePrice),
      sold_at: new Date().toISOString()
    }).eq('id', sellItem.id)
    setSaving(false)
    setSellItem(null)
    setSalePrice('')
    fetchItems()
  }

  function openEdit(item) {
    setForm({
      brand: item.brand || '', style: item.style || '', colourway: item.colourway || '',
      sku: item.sku || '', size: item.size || '', purchase_platform: item.purchase_platform || '',
      selling_platform: item.selling_platform || '', purchase_price: item.purchase_price || '', notes: item.notes || ''
    })
    setEditItem(item)
    setShowAdd(true)
  }

  function handleSort(col) {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortCol(col); setSortDir('asc') }
  }

  function sortArrow(col) {
    if (sortCol !== col) return ' ↕'
    return sortDir === 'asc' ? ' ↑' : ' ↓'
  }

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
    res.sort((a, b) => {
      let va = a[sortCol], vb = b[sortCol]
      if (va == null) va = ''
      if (vb == null) vb = ''
      if (typeof va === 'string') va = va.toLowerCase()
      if (typeof vb === 'string') vb = vb.toLowerCase()
      if (va < vb) return sortDir === 'asc' ? -1 : 1
      if (va > vb) return sortDir === 'asc' ? 1 : -1
      return 0
    })
    return res
  }, [items, search, filterBrand, filterStatus, sortCol, sortDir])

  const stats = useMemo(() => {
    const inStock = items.filter(i => i.status === 'in_stock')
    const sold = items.filter(i => i.status === 'sold')
    const totalCost = items.reduce((s, i) => s + (i.purchase_price || 0), 0)
    const stockValue = inStock.reduce((s, i) => s + (i.purchase_price || 0), 0)
    const revenue = sold.reduce((s, i) => s + (i.sale_price || 0), 0)
    const soldCost = sold.reduce((s, i) => s + (i.purchase_price || 0), 0)
    const pl = revenue - soldCost
    return { total: items.length, inStock: inStock.length, sold: sold.length, totalCost, stockValue, revenue, pl }
  }, [items])

  const plSell = sellItem ? (parseFloat(salePrice) || 0) - (sellItem.purchase_price || 0) : 0

  return (
    <div className="app">
      <div className="topbar">
        <div className="topbar-brand">Prior Supply <span>stock tracker</span></div>
        <div className="topbar-actions">
          <button className="btn primary" onClick={() => { setForm(EMPTY_FORM); setEditItem(null); setShowAdd(true) }}>+ Add item</button>
        </div>
      </div>

      <div className="main">
        {/* Stats */}
        <div className="stats-bar">
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

        {/* Filters */}
        <div className="filters">
          <input
            className="filter-input"
            placeholder="Search brand, style, SKU..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ flex: 1, minWidth: 180 }}
          />
          <select className="filter-select" value={filterBrand} onChange={e => setFilterBrand(e.target.value)}>
            <option value="">All brands</option>
            {[...new Set(items.map(i => i.brand).filter(Boolean))].sort().map(b => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
          <select className="filter-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="">All statuses</option>
            <option value="in_stock">In stock</option>
            <option value="sold">Sold</option>
          </select>
          {(search || filterBrand || filterStatus) && (
            <button className="btn sm" onClick={() => { setSearch(''); setFilterBrand(''); setFilterStatus('') }}>Clear</button>
          )}
          <span style={{ color: 'var(--muted)', fontSize: 11, marginLeft: 4 }}>{filtered.length} item{filtered.length !== 1 ? 's' : ''}</span>
        </div>

        {/* Table */}
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
                  <th onClick={() => handleSort('brand')}>Brand{sortArrow('brand')}</th>
                  <th onClick={() => handleSort('style')}>Style{sortArrow('style')}</th>
                  <th onClick={() => handleSort('colourway')}>Colourway{sortArrow('colourway')}</th>
                  <th onClick={() => handleSort('size')}>Size{sortArrow('size')}</th>
                  <th onClick={() => handleSort('sku')}>SKU{sortArrow('sku')}</th>
                  <th onClick={() => handleSort('purchase_price')}>Cost{sortArrow('purchase_price')}</th>
                  <th onClick={() => handleSort('sale_price')}>Sale{sortArrow('sale_price')}</th>
                  <th onClick={() => handleSort('status')}>P&amp;L{sortArrow('status')}</th>
                  <th onClick={() => handleSort('status')}>Status{sortArrow('status')}</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(item => {
                  const pl = item.status === 'sold' && item.sale_price != null
                    ? item.sale_price - (item.purchase_price || 0)
                    : null
                  return (
                    <tr key={item.id}>
                      <td style={{ fontWeight: 500 }}>{item.brand || '—'}</td>
                      <td>{item.style || '—'}</td>
                      <td className="td-muted">{item.colourway || '—'}</td>
                      <td className="td-muted">{item.size || '—'}</td>
                      <td className="td-muted">{item.sku || '—'}</td>
                      <td>{fmt(item.purchase_price)}</td>
                      <td>{item.sale_price ? fmt(item.sale_price) : <span className="td-muted">—</span>}</td>
                      <td className={plColor(pl)}>
                        {pl != null ? (pl >= 0 ? '+' : '') + fmt(pl) : <span className="td-muted">—</span>}
                      </td>
                      <td><span className={`badge ${item.status}`}>{item.status === 'in_stock' ? 'In stock' : 'Sold'}</span></td>
                      <td>
                        <div style={{ display: 'flex', gap: 5 }}>
                          {item.status === 'in_stock' && (
                            <button className="btn sm success" onClick={() => { setSellItem(item); setSalePrice('') }}>Sell</button>
                          )}
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

      {/* Add / Edit Modal */}
      {showAdd && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowAdd(false)}>
          <div className="modal">
            <div className="modal-title">{editItem ? 'Edit item' : 'Add new item'}</div>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Brand *</label>
                <select className="form-input" value={form.brand} onChange={e => setForm(f => ({ ...f, brand: e.target.value }))}>
                  <option value="">Select brand</option>
                  {BRANDS.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
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
                <label className="form-label">Purchase platform</label>
                <select className="form-input" value={form.purchase_platform} onChange={e => setForm(f => ({ ...f, purchase_platform: e.target.value }))}>
                  <option value="">Select platform</option>
                  {PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Selling platform</label>
                <select className="form-input" value={form.selling_platform} onChange={e => setForm(f => ({ ...f, selling_platform: e.target.value }))}>
                  <option value="">Select platform</option>
                  {SELLING_PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div className="form-group full">
                <label className="form-label">Notes</label>
                <input className="form-input" placeholder="e.g. Used, missing box..." value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
              </div>
            </div>
            <div className="form-actions">
              <button className="btn" onClick={() => { setShowAdd(false); setEditItem(null); setForm(EMPTY_FORM) }}>Cancel</button>
              <button className="btn primary" onClick={saveItem} disabled={saving}>
                {saving ? 'Saving...' : editItem ? 'Save changes' : 'Add item'}
              </button>
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
              <input
                className="form-input"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={salePrice}
                onChange={e => setSalePrice(e.target.value)}
                autoFocus
              />
            </div>
            {salePrice && (
              <div className="pl-preview">
                <span style={{ color: 'var(--muted)' }}>P&L</span>
                <span className={plColor(plSell)} style={{ fontWeight: 500 }}>
                  {plSell >= 0 ? '+' : ''}{fmt(plSell)}
                </span>
              </div>
            )}
            <div className="form-actions" style={{ marginTop: 16 }}>
              <button className="btn" onClick={() => setSellItem(null)}>Cancel</button>
              <button className="btn primary" onClick={markSold} disabled={saving || !salePrice}>
                {saving ? 'Saving...' : 'Confirm sale'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
