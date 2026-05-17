import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts'

const CATEGORIES = ['Sneakers', 'Pokémon', 'Lego', 'Clothing', 'Miscellaneous']
const COLORS = ['#16a34a','#22c55e','#4ade80','#86efac','#bbf7d0','#f59e0b','#3b82f6']
const POKEMON_TYPES = ['Booster Box', 'Elite Trainer Box', 'Pack', 'Bundle', 'Other']
const CONDITIONS = ['Mint', 'Near Mint', 'Lightly Played', 'Moderately Played', 'Heavily Played']
const GRADING_COMPANIES = ['PSA', 'BGS', 'CGC', 'ACE']

const EMPTY_UNIT = { size: '', purchase_price: '' }
const EMPTY_FORM = {
  category: '', pokemon_type: '',
  brand: '', style: '', colourway: '', sku: '',
  card_name: '', set_name: '', card_number: '', condition: '', graded: false, grading_company: '', grade: '', product_name: '', pokemon_sealed_type: '', quantity: '',
  lego_set_name: '', set_number: '', theme: '', lego_condition: '',
  clothing_brand: '', item: '', clothing_size: '', colour: '',
  item_name: '', description: '',
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

function CategoryForm({ form, setForm, editItem, updateUnit, addUnit, removeUnit }) {
  const cat = form.category
  const common = (
    <>
      <div className="form-group">
        <label className="form-label">Purchase date</label>
        <input className="form-input" type="date" value={form.purchase_date} onChange={e=>setForm(f=>({...f,purchase_date:e.target.value}))}/>
      </div>
      <div className="form-group full">
        <label className="form-label">Purchase platform</label>
        <input className="form-input" placeholder="e.g. JD, eBay, Game" value={form.purchase_platform} onChange={e=>setForm(f=>({...f,purchase_platform:e.target.value}))}/>
      </div>
      <div className="form-group full">
        <label className="form-label">Notes</label>
        <input className="form-input" placeholder="Any additional notes..." value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))}/>
      </div>
    </>
  )

  if (cat === 'Sneakers') return (
    <>
      <div className="form-group"><label className="form-label">Brand *</label><input className="form-input" placeholder="e.g. Nike" value={form.brand} onChange={e=>setForm(f=>({...f,brand:e.target.value}))}/></div>
      <div className="form-group"><label className="form-label">Style</label><input className="form-input" placeholder="e.g. Air Max 95" value={form.style} onChange={e=>setForm(f=>({...f,style:e.target.value}))}/></div>
      <div className="form-group"><label className="form-label">Colourway</label><input className="form-input" placeholder="e.g. Pure Money" value={form.colourway} onChange={e=>setForm(f=>({...f,colourway:e.target.value}))}/></div>
      <div className="form-group"><label className="form-label">SKU</label><input className="form-input" placeholder="e.g. 308497-100" value={form.sku} onChange={e=>setForm(f=>({...f,sku:e.target.value}))}/></div>
      {common}
      <div className="form-group full"><div className="units-section"><div className="units-header"><span className="form-label">Sizes & prices *</span>{!editItem&&<button className="btn sm" onClick={addUnit}>+ Add size</button>}</div>{form.units.map((unit,i)=>(<div key={i} className="unit-row"><input className="form-input" placeholder="Size (UK)" value={unit.size} onChange={e=>updateUnit(i,'size',e.target.value)} style={{flex:1}}/><input className="form-input" type="number" step="0.01" placeholder="Price (£)" value={unit.purchase_price} onChange={e=>updateUnit(i,'purchase_price',e.target.value)} style={{flex:1}}/>{form.units.length>1&&<button className="btn sm danger" onClick={()=>removeUnit(i)}>✕</button>}</div>))}</div></div>
    </>
  )

  if (cat === 'Pokémon') return (
    <>
      <div className="form-group full">
        <label className="form-label">Type *</label>
        <div className="type-toggle">
          <button className={`type-btn ${form.pokemon_type==='singles'?'active':''}`} onClick={()=>setForm(f=>({...f,pokemon_type:'singles'}))}>Singles</button>
          <button className={`type-btn ${form.pokemon_type==='sealed'?'active':''}`} onClick={()=>setForm(f=>({...f,pokemon_type:'sealed'}))}>Sealed</button>
        </div>
      </div>
      {form.pokemon_type==='singles'&&<>
        <div className="form-group"><label className="form-label">Card name *</label><input className="form-input" placeholder="e.g. Charizard" value={form.card_name} onChange={e=>setForm(f=>({...f,card_name:e.target.value}))}/></div>
        <div className="form-group"><label className="form-label">Set</label><input className="form-input" placeholder="e.g. Base Set" value={form.set_name} onChange={e=>setForm(f=>({...f,set_name:e.target.value}))}/></div>
        <div className="form-group"><label className="form-label">Card number</label><input className="form-input" placeholder="e.g. 004/102" value={form.card_number} onChange={e=>setForm(f=>({...f,card_number:e.target.value}))}/></div>
        <div className="form-group"><label className="form-label">Condition</label><select className="form-input" value={form.condition} onChange={e=>setForm(f=>({...f,condition:e.target.value}))}><option value="">Select</option>{CONDITIONS.map(c=><option key={c} value={c}>{c}</option>)}</select></div>
        <div className="form-group full"><label className="form-label">Graded?</label><div className="type-toggle"><button className={`type-btn ${!form.graded?'active':''}`} onClick={()=>setForm(f=>({...f,graded:false,grading_company:'',grade:''}))}>No</button><button className={`type-btn ${form.graded?'active':''}`} onClick={()=>setForm(f=>({...f,graded:true}))}>Yes</button></div></div>
        {form.graded&&<><div className="form-group"><label className="form-label">Grading company</label><select className="form-input" value={form.grading_company} onChange={e=>setForm(f=>({...f,grading_company:e.target.value}))}><option value="">Select</option>{GRADING_COMPANIES.map(g=><option key={g} value={g}>{g}</option>)}</select></div><div className="form-group"><label className="form-label">Grade</label><input className="form-input" placeholder="e.g. 9, 10" value={form.grade} onChange={e=>setForm(f=>({...f,grade:e.target.value}))}/></div></>}
        <div className="form-group"><label className="form-label">Purchase price (£) *</label><input className="form-input" type="number" step="0.01" placeholder="0.00" value={form.units[0]?.purchase_price||''} onChange={e=>updateUnit(0,'purchase_price',e.target.value)}/></div>
        {common}
      </>}
      {form.pokemon_type==='sealed'&&<>
        <div className="form-group"><label className="form-label">Product name *</label><input className="form-input" placeholder="e.g. Scarlet & Violet ETB" value={form.product_name} onChange={e=>setForm(f=>({...f,product_name:e.target.value}))}/></div>
        <div className="form-group"><label className="form-label">Set</label><input className="form-input" placeholder="e.g. Scarlet & Violet" value={form.set_name} onChange={e=>setForm(f=>({...f,set_name:e.target.value}))}/></div>
        <div className="form-group"><label className="form-label">Product type</label><select className="form-input" value={form.pokemon_sealed_type} onChange={e=>setForm(f=>({...f,pokemon_sealed_type:e.target.value}))}><option value="">Select</option>{POKEMON_TYPES.map(t=><option key={t} value={t}>{t}</option>)}</select></div>
        <div className="form-group"><label className="form-label">Quantity</label><input className="form-input" type="number" placeholder="1" value={form.quantity} onChange={e=>setForm(f=>({...f,quantity:e.target.value}))}/></div>
        {common}
        <div className="form-group full"><div className="units-section"><div className="units-header"><span className="form-label">Units & prices *</span>{!editItem&&<button className="btn sm" onClick={addUnit}>+ Add unit</button>}</div>{form.units.map((unit,i)=>(<div key={i} className="unit-row"><input className="form-input" placeholder="Description (optional)" value={unit.size} onChange={e=>updateUnit(i,'size',e.target.value)} style={{flex:2}}/><input className="form-input" type="number" step="0.01" placeholder="Price (£)" value={unit.purchase_price} onChange={e=>updateUnit(i,'purchase_price',e.target.value)} style={{flex:1}}/>{form.units.length>1&&<button className="btn sm danger" onClick={()=>removeUnit(i)}>✕</button>}</div>))}</div></div>
      </>}
    </>
  )

  if (cat === 'Lego') return (
    <>
      <div className="form-group"><label className="form-label">Set name *</label><input className="form-input" placeholder="e.g. Millennium Falcon" value={form.lego_set_name} onChange={e=>setForm(f=>({...f,lego_set_name:e.target.value}))}/></div>
      <div className="form-group"><label className="form-label">Set number</label><input className="form-input" placeholder="e.g. 75192" value={form.set_number} onChange={e=>setForm(f=>({...f,set_number:e.target.value}))}/></div>
      <div className="form-group"><label className="form-label">Theme</label><input className="form-input" placeholder="e.g. Star Wars" value={form.theme} onChange={e=>setForm(f=>({...f,theme:e.target.value}))}/></div>
      <div className="form-group"><label className="form-label">Condition</label><select className="form-input" value={form.lego_condition} onChange={e=>setForm(f=>({...f,lego_condition:e.target.value}))}><option value="">Select</option><option value="Sealed">Sealed</option><option value="Open/Complete">Open/Complete</option><option value="Open/Incomplete">Open/Incomplete</option></select></div>
      {common}
      <div className="form-group full"><div className="units-section"><div className="units-header"><span className="form-label">Units & prices *</span>{!editItem&&<button className="btn sm" onClick={addUnit}>+ Add unit</button>}</div>{form.units.map((unit,i)=>(<div key={i} className="unit-row"><input className="form-input" placeholder="Description (optional)" value={unit.size} onChange={e=>updateUnit(i,'size',e.target.value)} style={{flex:2}}/><input className="form-input" type="number" step="0.01" placeholder="Price (£)" value={unit.purchase_price} onChange={e=>updateUnit(i,'purchase_price',e.target.value)} style={{flex:1}}/>{form.units.length>1&&<button className="btn sm danger" onClick={()=>removeUnit(i)}>✕</button>}</div>))}</div></div>
    </>
  )

  if (cat === 'Clothing') return (
    <>
      <div className="form-group"><label className="form-label">Brand *</label><input className="form-input" placeholder="e.g. Supreme" value={form.clothing_brand} onChange={e=>setForm(f=>({...f,clothing_brand:e.target.value}))}/></div>
      <div className="form-group"><label className="form-label">Item</label><input className="form-input" placeholder="e.g. Box Logo Hoodie" value={form.item} onChange={e=>setForm(f=>({...f,item:e.target.value}))}/></div>
      <div className="form-group"><label className="form-label">Colour</label><input className="form-input" placeholder="e.g. Black" value={form.colour} onChange={e=>setForm(f=>({...f,colour:e.target.value}))}/></div>
      {common}
      <div className="form-group full"><div className="units-section"><div className="units-header"><span className="form-label">Sizes & prices *</span>{!editItem&&<button className="btn sm" onClick={addUnit}>+ Add size</button>}</div>{form.units.map((unit,i)=>(<div key={i} className="unit-row"><input className="form-input" placeholder="Size (e.g. M, L, XL)" value={unit.size} onChange={e=>updateUnit(i,'size',e.target.value)} style={{flex:1}}/><input className="form-input" type="number" step="0.01" placeholder="Price (£)" value={unit.purchase_price} onChange={e=>updateUnit(i,'purchase_price',e.target.value)} style={{flex:1}}/>{form.units.length>1&&<button className="btn sm danger" onClick={()=>removeUnit(i)}>✕</button>}</div>))}</div></div>
    </>
  )

  if (cat === 'Miscellaneous') return (
    <>
      <div className="form-group"><label className="form-label">Item name *</label><input className="form-input" placeholder="e.g. Vintage Camera" value={form.item_name} onChange={e=>setForm(f=>({...f,item_name:e.target.value}))}/></div>
      <div className="form-group full"><label className="form-label">Description</label><input className="form-input" placeholder="Brief description..." value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))}/></div>
      {common}
      <div className="form-group full"><div className="units-section"><div className="units-header"><span className="form-label">Units & prices *</span>{!editItem&&<button className="btn sm" onClick={addUnit}>+ Add unit</button>}</div>{form.units.map((unit,i)=>(<div key={i} className="unit-row"><input className="form-input" placeholder="Description (optional)" value={unit.size} onChange={e=>updateUnit(i,'size',e.target.value)} style={{flex:2}}/><input className="form-input" type="number" step="0.01" placeholder="Price (£)" value={unit.purchase_price} onChange={e=>updateUnit(i,'purchase_price',e.target.value)} style={{flex:1}}/>{form.units.length>1&&<button className="btn sm danger" onClick={()=>removeUnit(i)}>✕</button>}</div>))}</div></div>
    </>
  )

  return null
}

export default function Dashboard({ session }) {
  const navigate = useNavigate()
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
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [chartMonths, setChartMonths] = useState(6)
  const [metricsSources, setMetricsSources] = useState({ reseller: true, breaker: true, collector: false })

  function toggleSource(key) {
    setMetricsSources(s => ({ ...s, [key]: !s[key] }))
  }

  useEffect(() => { fetchItems() }, [])

  async function fetchItems() {
    setLoading(true)
    const { data, error } = await supabase.from('stock').select('*').order('created_at', { ascending: false })
    if (error) console.error(error)
    setItems(data || [])
    setLoading(false)
  }

  async function signOut() { await supabase.auth.signOut(); navigate('/') }

  function updateUnit(i, field, value) {
    setForm(f => { const units = [...f.units]; units[i] = { ...units[i], [field]: value }; return { ...f, units } })
  }
  function addUnit() { setForm(f => ({ ...f, units: [...f.units, { ...EMPTY_UNIT }] })) }
  function removeUnit(i) { setForm(f => ({ ...f, units: f.units.filter((_, idx) => idx !== i) })) }

  async function saveItem() {
    setSaving(true); setSaveError('')
    const batchId = editItem?.batch_id || crypto.randomUUID()
    let brand = '', style = '', colourway = '', sku = ''
    if (form.category === 'Sneakers') { brand = form.brand; style = form.style; colourway = form.colourway; sku = form.sku }
    else if (form.category === 'Pokémon') { brand = 'Pokémon'; style = form.pokemon_type === 'singles' ? form.card_name : form.product_name; colourway = form.set_name; sku = form.card_number }
    else if (form.category === 'Lego') { brand = 'Lego'; style = form.lego_set_name; colourway = form.theme; sku = form.set_number }
    else if (form.category === 'Clothing') { brand = form.clothing_brand; style = form.item; colourway = form.colour }
    else if (form.category === 'Miscellaneous') { brand = form.item_name; style = form.description }
    const base = {
      category: form.category, brand, style, colourway, sku,
      purchase_platform: form.purchase_platform, purchase_date: form.purchase_date || null, notes: form.notes,
      pokemon_type: form.pokemon_type || null, card_name: form.card_name || null, set_name: form.set_name || null,
      card_number: form.card_number || null, condition: form.condition || null, graded: form.graded || false,
      grading_company: form.grading_company || null, grade: form.grade || null, product_name: form.product_name || null,
      pokemon_sealed_type: form.pokemon_sealed_type || null, lego_set_name: form.lego_set_name || null,
      set_number: form.set_number || null, theme: form.theme || null, lego_condition: form.lego_condition || null,
      clothing_brand: form.clothing_brand || null, item: form.item || null, clothing_size: form.clothing_size || null,
      colour: form.colour || null, item_name: form.item_name || null, description: form.description || null,
      batch_id: batchId, user_id: session.user.id, status: 'in_stock'
    }
    let error
    if (editItem) {
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
    setForm({ ...EMPTY_FORM, category: item.category||'', pokemon_type: item.pokemon_type||'', brand: item.brand||'', style: item.style||'', colourway: item.colourway||'', sku: item.sku||'', card_name: item.card_name||'', set_name: item.set_name||'', card_number: item.card_number||'', condition: item.condition||'', graded: item.graded||false, grading_company: item.grading_company||'', grade: item.grade||'', product_name: item.product_name||'', pokemon_sealed_type: item.pokemon_sealed_type||'', lego_set_name: item.lego_set_name||'', set_number: item.set_number||'', theme: item.theme||'', lego_condition: item.lego_condition||'', clothing_brand: item.clothing_brand||'', item: item.item||'', clothing_size: item.clothing_size||'', colour: item.colour||'', item_name: item.item_name||'', description: item.description||'', purchase_platform: item.purchase_platform||'', purchase_date: item.purchase_date||'', notes: item.notes||'', units: [{ size: item.size||'', purchase_price: item.purchase_price||'' }] })
    setEditItem(item); setShowAdd(true)
  }

  async function deleteItem(id) {
    if (!window.confirm('Delete this item?')) return
    await supabase.from('stock').delete().eq('id', id)
    fetchItems()
    if (batchModal) setBatchModal(prev => ({ ...prev, units: prev.units.filter(u => u.id !== id) }))
  }

  async function deleteBatch(batchId) {
    if (!window.confirm('Delete all units in this batch?')) return
    await supabase.from('stock').delete().eq('batch_id', batchId)
    fetchItems(); setBatchModal(null)
  }

  async function markSold() {
    if (!salePrice || !sellItem) return
    setSaving(true)
    await supabase.from('stock').update({ status: 'sold', sale_price: parseFloat(salePrice), selling_platform: sellingPlatform, sold_at: new Date().toISOString() }).eq('id', sellItem.id)
    setSaving(false); setSellItem(null); setSalePrice(''); setSellingPlatform('')
    fetchItems()
    if (batchModal) {
      const updated = batchModal.units.map(u => u.id === sellItem.id ? { ...u, status: 'sold', sale_price: parseFloat(salePrice), selling_platform: sellingPlatform } : u)
      setBatchModal({ ...batchModal, units: updated })
    }
  }

  const batches = useMemo(() => {
    const map = {}
    items.forEach(item => {
      const key = item.batch_id || item.id
      if (!map[key]) map[key] = { key, units: [], brand: item.brand, style: item.style, colourway: item.colourway, category: item.category, sku: item.sku, purchase_platform: item.purchase_platform, purchase_date: item.purchase_date, notes: item.notes, created_at: item.created_at }
      map[key].units.push(item)
    })
    return Object.values(map).sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
  }, [items])

  const filteredBatches = useMemo(() => batches.filter(b => {
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
  }), [batches, search, filterBrand, filterCategory, filterStatus])

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

  // Breaks state - declared before chart data so it can be used in combined metrics
  const [breaks, setBreaks] = useState([])
  const [breaksLoading, setBreaksLoading] = useState(false)
  const [showBreakForm, setShowBreakForm] = useState(false)
  const [editBreak, setEditBreak] = useState(null)
  const [breakForm, setBreakForm] = useState({
    type: 'break', name: '', cost: '', spots_total: '', spots_sold: '', spot_price: '',
    packs_total: '', packs_sold: '', pack_price: '',
    first_card_date: '', last_card_date: '', first_stream_date: '', last_stream_date: '',
    break_date: '', status: 'upcoming', notes: ''
  })
  const EMPTY_BREAK = {
    type: 'break', name: '', cost: '', spots_total: '', spots_sold: '', spot_price: '',
    packs_total: '', packs_sold: '', pack_price: '',
    first_card_date: '', last_card_date: '', first_stream_date: '', last_stream_date: '',
    break_date: '', status: 'upcoming', notes: ''
  }

  function breakPL(b) {
    if (b.type === 'break') return (b.spots_sold||0)*(b.spot_price||0) - (b.cost||0)
    return (b.packs_sold||0)*(b.pack_price||0) - (b.cost||0)
  }

  const plChartData = useMemo(() => getLast(chartMonths).map(({ key, label }) => {
    let pl = 0, revenue = 0, cost = 0
    if (metricsSources.reseller) {
      const sold = items.filter(i => i.status === 'sold' && getMonthKey(i.sold_at) === key)
      pl += sold.reduce((s,i)=>s+((i.sale_price||0)-(i.purchase_price||0)),0)
      revenue += sold.reduce((s,i)=>s+(i.sale_price||0),0)
      cost += sold.reduce((s,i)=>s+(i.purchase_price||0),0)
    }
    if (metricsSources.breaker) {
      const bks = breaks.filter(b => b.status === 'completed' && getMonthKey(b.break_date || b.last_stream_date) === key)
      bks.forEach(b => {
        const bpl = breakPL(b)
        const brev = b.type==='break' ? (b.spots_sold||0)*(b.spot_price||0) : (b.packs_sold||0)*(b.pack_price||0)
        pl += bpl; revenue += brev; cost += (b.cost||0)
      })
    }
    return { label, pl: parseFloat(pl.toFixed(2)), revenue: parseFloat(revenue.toFixed(2)), cost: parseFloat(cost.toFixed(2)) }
  }), [items, breaks, chartMonths, metricsSources])

  const categoryData = useMemo(() => { const map = {}; items.forEach(i => { const cat = i.category||'Other'; if(!map[cat])map[cat]=0; map[cat]++ }); return Object.entries(map).map(([name,value])=>({name,value})) }, [items])
  const brandData = useMemo(() => { const map = {}; items.filter(i=>i.status==='sold').forEach(i => { const b=i.brand||'Unknown'; if(!map[b])map[b]=0; map[b]+=(i.sale_price||0)-(i.purchase_price||0) }); return Object.entries(map).map(([brand,pl])=>({brand,pl:parseFloat(pl.toFixed(2))})).sort((a,b)=>b.pl-a.pl).slice(0,8) }, [items])
  const avgPLData = useMemo(() => getLast(6).map(({ key, label }) => { const sold = items.filter(i=>i.status==='sold'&&getMonthKey(i.sold_at)===key); const avg = sold.length ? sold.reduce((s,i)=>s+((i.sale_price||0)-(i.purchase_price||0)),0)/sold.length : 0; return { label, avg: parseFloat(avg.toFixed(2)) } }), [items])
  const sellThroughData = useMemo(() => { const map = {}; items.forEach(i => { const cat=i.category||'Other'; if(!map[cat])map[cat]={total:0,sold:0}; map[cat].total++; if(i.status==='sold')map[cat].sold++ }); return Object.entries(map).map(([cat,{total,sold}])=>({cat,rate:parseFloat(((sold/total)*100).toFixed(1))})) }, [items])
  const bestWorst = useMemo(() => { const sold = items.filter(i=>i.status==='sold'&&i.sale_price!=null).map(i=>({...i,pl:(i.sale_price||0)-(i.purchase_price||0)})).sort((a,b)=>b.pl-a.pl); return { best: sold.slice(0,5), worst: sold.slice(-5).reverse() } }, [items])

  const plSell = sellItem ? (parseFloat(salePrice)||0)-(sellItem.purchase_price||0) : 0
  const username = session?.user?.email?.split('@')[0] || 'there'

  useEffect(() => { if (session) { fetchBreaks() } }, [session])
  useEffect(() => { if (session && page === 'breaks') fetchBreaks() }, [page, session])

  // Break cards state
  const [breakCards, setBreakCards] = useState([])
  const [viewingBreak, setViewingBreak] = useState(null)
  const [cardForm, setCardForm] = useState({ item: '', tier: 'Floor', cost: '' })
  const TIER_ORDER = { 'Floor': 0, 'Mid': 1, 'Chase': 2 }

  async function fetchBreakCards(breakId) {
    const { data } = await supabase.from('break_cards').select('*').eq('break_id', breakId)
    setBreakCards(data || [])
  }

  async function saveCard() {
    if (!cardForm.item || !viewingBreak) return
    setSaving(true)
    await supabase.from('break_cards').insert([{
      item: cardForm.item, tier: cardForm.tier,
      cost: parseFloat(cardForm.cost) || null,
      break_id: viewingBreak.id, user_id: session.user.id
    }])
    setSaving(false)
    setCardForm({ item: '', tier: 'Floor', cost: '' })
    fetchBreakCards(viewingBreak.id)
  }

  async function deleteCard(id) {
    await supabase.from('break_cards').delete().eq('id', id)
    fetchBreakCards(viewingBreak.id)
  }

  const sortedCards = useMemo(() => {
    const tierOrder = { 'Floor': 0, 'Mid': 1, 'Chase': 2 }
    return [...breakCards].sort((a, b) => (tierOrder[a.tier] ?? 0) - (tierOrder[b.tier] ?? 0))
  }, [breakCards])

  async function fetchBreaks() {
    setBreaksLoading(true)
    const { data } = await supabase.from('breaks').select('*').order('created_at', { ascending: false })
    setBreaks(data || [])
    setBreaksLoading(false)
  }

  async function saveBreak() {
    setSaving(true)
    const payload = {
      ...breakForm,
      cost: parseFloat(breakForm.cost) || 0,
      spots_total: parseInt(breakForm.spots_total) || null,
      spots_sold: parseInt(breakForm.spots_sold) || null,
      spot_price: parseFloat(breakForm.spot_price) || null,
      packs_total: parseInt(breakForm.packs_total) || null,
      packs_sold: parseInt(breakForm.packs_sold) || null,
      pack_price: parseFloat(breakForm.pack_price) || null,
      first_card_date: breakForm.first_card_date || null,
      last_card_date: breakForm.last_card_date || null,
      first_stream_date: breakForm.first_stream_date || null,
      last_stream_date: breakForm.last_stream_date || null,
      break_date: breakForm.break_date || null,
      user_id: session.user.id
    }
    let error
    if (editBreak) {
      ;({ error } = await supabase.from('breaks').update(payload).eq('id', editBreak.id))
    } else {
      ;({ error } = await supabase.from('breaks').insert([payload]))
    }
    setSaving(false)
    if (error) { console.error(error); return }
    setShowBreakForm(false); setEditBreak(null); setBreakForm(EMPTY_BREAK); fetchBreaks()
  }

  async function deleteBreak(id) {
    if (!window.confirm('Delete this entry?')) return
    await supabase.from('breaks').delete().eq('id', id)
    fetchBreaks()
  }

  function openEditBreak(b) {
    setBreakForm({
      type: b.type||'break', name: b.name||'', cost: b.cost||'', spots_total: b.spots_total||'', spots_sold: b.spots_sold||'', spot_price: b.spot_price||'',
      packs_total: b.packs_total||'', packs_sold: b.packs_sold||'', pack_price: b.pack_price||'',
      first_card_date: b.first_card_date||'', last_card_date: b.last_card_date||'',
      first_stream_date: b.first_stream_date||'', last_stream_date: b.last_stream_date||'',
      break_date: b.break_date||'', status: b.status||'upcoming', notes: b.notes||''
    })
    setEditBreak(b); setShowBreakForm(true)
  }

  const breakStats = useMemo(() => {
    const totalPL = breaks.reduce((s, b) => s + breakPL(b), 0)
    const completed = breaks.filter(b => b.status === 'completed').length
    const active = breaks.filter(b => b.status === 'active' || b.status === 'upcoming').length
    return { totalPL, completed, active, total: breaks.length }
  }, [breaks])

  return (
    <div className="app">
      <div className="topbar">
        <div className="topbar-brand"><span className="brand-mark" />StockTrack</div>
        <nav className="topbar-nav">
          {[{id:'home',label:'Home'},{id:'stock',label:'Reseller'},{id:'breaks',label:'Breaker'},{id:'collector',label:'Collector'},{id:'metrics',label:'Metrics'}].map(n=>(
            <button key={n.id} className={`nav-btn ${page===n.id?'active':''}`} onClick={()=>setPage(n.id)}>{n.label}</button>
          ))}
        </nav>
        <div className="topbar-actions">
          {page==='stock'&&<button className="btn primary" onClick={()=>{setForm(EMPTY_FORM);setEditItem(null);setSaveError('');setShowAdd(true)}}>+ Add item</button>}
          {page==='breaks'&&<button className="btn primary" onClick={()=>{setBreakForm(EMPTY_BREAK);setEditBreak(null);setShowBreakForm(true)}}>+ Add break</button>}
          <div className="user-pill">
            <a href="/" className="landing-nav-link" style={{fontSize:12}}>← Site</a>
            <span className="user-email">{session.user.email}</span>
            <button className="btn sm" onClick={signOut}>Sign out</button>
          </div>
        </div>
      </div>

      <div className="main">
        {page==='home'&&(
          <div>
            <div className="page-header"><h1 className="page-title">Welcome back, {username} 👋</h1><p className="page-subtitle">Here's how your stock is performing</p></div>
            <div className="stats-bar">
              <div className="stat-card"><div className="stat-label">Units in stock</div><div className="stat-value amber">{stats.inStock}</div></div>
              <div className="stat-card"><div className="stat-label">Stock value</div><div className="stat-value">{fmt(stats.stockValue)}</div></div>
              <div className="stat-card"><div className="stat-label">This month's profit</div><div className={`stat-value ${stats.monthPL>0?'pos':stats.monthPL<0?'neg':''}`}>{stats.monthPL>=0?'+':''}{fmt(stats.monthPL)}</div></div>
              <div className="stat-card"><div className="stat-label">All-time P&L</div><div className={`stat-value ${stats.pl>0?'pos':stats.pl<0?'neg':''}`}>{stats.pl>=0?'+':''}{fmt(stats.pl)}</div></div>
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

        {page==='stock'&&(
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
              <select className="filter-select" value={filterCategory} onChange={e=>setFilterCategory(e.target.value)}><option value="">All categories</option>{CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}</select>
              <select className="filter-select" value={filterBrand} onChange={e=>setFilterBrand(e.target.value)}><option value="">All brands</option>{[...new Set(items.map(i=>i.brand).filter(Boolean))].sort().map(b=><option key={b} value={b}>{b}</option>)}</select>
              <select className="filter-select" value={filterStatus} onChange={e=>setFilterStatus(e.target.value)}><option value="">All statuses</option><option value="in_stock">In stock</option><option value="sold">Sold</option></select>
              {(search||filterBrand||filterStatus||filterCategory)&&<button className="btn sm" onClick={()=>{setSearch('');setFilterBrand('');setFilterStatus('');setFilterCategory('')}}>Clear</button>}
              <span style={{color:'var(--muted)',fontSize:12}}>{filteredBatches.length} item{filteredBatches.length!==1?'s':''}</span>
            </div>
            {loading?<div className="loading">Loading stock...</div>:filteredBatches.length===0?(
              <div className="empty"><div className="empty-icon">📦</div><div className="empty-title">{items.length===0?'No stock yet':'No results'}</div><div style={{marginTop:6}}>{items.length===0?'Add your first item to get started':'Try adjusting your filters'}</div></div>
            ):(
              <div className="card-grid">
                {filteredBatches.map(batch=>{
                  const inStockUnits=batch.units.filter(u=>u.status==='in_stock')
                  const soldUnits=batch.units.filter(u=>u.status==='sold')
                  const totalCost=inStockUnits.reduce((s,u)=>s+(u.purchase_price||0),0)
                  const avgCost=inStockUnits.length?totalCost/inStockUnits.length:0
                  const totalPL=soldUnits.reduce((s,u)=>s+((u.sale_price||0)-(u.purchase_price||0)),0)
                  const allSold=inStockUnits.length===0
                  const isSingle=batch.units.length===1
                  return (
                    <div key={batch.key} className="item-card" onClick={()=>setBatchModal(batch)} style={{cursor:'pointer'}}>
                      <div className="item-card-header">
                        <div className="item-card-category">{batch.category||'Uncategorised'}</div>
                        <span className={`badge ${allSold?'sold':'in_stock'}`}>{allSold?'Sold':`${inStockUnits.length} in stock`}</span>
                      </div>
                      <div className="item-card-body">
                        <div className="item-card-brand">{batch.brand||'—'}</div>
                        <div className="item-card-style">{[batch.style,batch.colourway].filter(Boolean).join(' — ')||'—'}</div>
                      </div>
                      <div className="item-card-stats">
                        <div className="item-card-stat"><div className="item-card-stat-label">Size</div><div className="item-card-stat-value">{isSingle?(batch.units[0].size?`UK ${batch.units[0].size}`:'—'):`${inStockUnits.length} unit${inStockUnits.length!==1?'s':''}`}</div></div>
                        <div className="item-card-stat"><div className="item-card-stat-label">Cost</div><div className="item-card-stat-value">{fmt(totalCost)}</div>{!isSingle&&inStockUnits.length>0&&<div className="item-card-stat-avg">avg {fmt(avgCost)}</div>}</div>
                        <div className="item-card-stat"><div className="item-card-stat-label">P&L</div><div className={`item-card-stat-value ${plColor(soldUnits.length?totalPL:null)}`}>{soldUnits.length?(totalPL>=0?'+':'')+fmt(totalPL):'—'}</div></div>
                        <div className="item-card-stat"><div className="item-card-stat-label">Sold</div><div className="item-card-stat-value">{batch.units.length>1?`${soldUnits.length}/${batch.units.length}`:(soldUnits.length?'✓':'—')}</div></div>
                      </div>
                      <div className="item-card-actions" onClick={e=>e.stopPropagation()}>
                        {isSingle&&batch.units[0].status==='in_stock'&&<button className="btn sm success" style={{flex:1}} onClick={()=>{setSellItem(batch.units[0]);setSalePrice('');setSellingPlatform('')}}>Sell</button>}
                        {!isSingle&&!allSold&&<button className="btn sm success" style={{flex:1}} onClick={()=>setBatchModal(batch)}>View units</button>}
                        {isSingle&&<button className="btn sm" onClick={()=>openEdit(batch.units[0])}>Edit</button>}
                        {isSingle?<button className="btn sm danger" onClick={()=>deleteItem(batch.units[0].id)}>Del</button>:<button className="btn sm danger" onClick={()=>deleteBatch(batch.key)}>Del all</button>}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {page==='metrics'&&(
          <div>
            <div className="page-header" style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',flexWrap:'wrap',gap:12}}>
              <div><h1 className="page-title">Metrics</h1><p className="page-subtitle">Deep dive into your performance</p></div>
              <div className="metrics-sources">
                <span className="metrics-sources-label">Data sources:</span>
                {[{key:'reseller',label:'Reseller'},{key:'breaker',label:'Breaker'},{key:'collector',label:'Collector'}].map(s=>(
                  <label key={s.key} className="metrics-checkbox">
                    <input type="checkbox" checked={metricsSources[s.key]} onChange={()=>toggleSource(s.key)}/>
                    {s.label}
                  </label>
                ))}
              </div>
            </div>
            <div className="metrics-grid">
              <div className="chart-card full"><div className="chart-header"><div><div className="chart-title">Monthly Profit & Loss</div><div className="chart-subtitle">Net profit per month</div></div><div className="chart-controls">{[3,6,12].map(m=><button key={m} className={`chart-btn ${chartMonths===m?'active':''}`} onClick={()=>setChartMonths(m)}>{m}M</button>)}</div></div><ResponsiveContainer width="100%" height={260}><BarChart data={plChartData} margin={{top:10,right:10,left:0,bottom:0}}><CartesianGrid strokeDasharray="3 3" stroke="#e3e8ef" vertical={false}/><XAxis dataKey="label" tick={{fontSize:12,fill:'#8792a2'}} axisLine={false} tickLine={false}/><YAxis tickFormatter={fmtShort} tick={{fontSize:12,fill:'#8792a2'}} axisLine={false} tickLine={false}/><Tooltip formatter={v=>fmt(v)} contentStyle={{borderRadius:8,border:'1px solid #e3e8ef'}}/><Bar dataKey="pl" name="P&L" fill="#16a34a" radius={[4,4,0,0]}/></BarChart></ResponsiveContainer></div>
              <div className="chart-card full"><div className="chart-header"><div><div className="chart-title">Revenue vs Cost</div><div className="chart-subtitle">Monthly comparison</div></div></div><ResponsiveContainer width="100%" height={260}><BarChart data={plChartData} margin={{top:10,right:10,left:0,bottom:0}}><CartesianGrid strokeDasharray="3 3" stroke="#e3e8ef" vertical={false}/><XAxis dataKey="label" tick={{fontSize:12,fill:'#8792a2'}} axisLine={false} tickLine={false}/><YAxis tickFormatter={fmtShort} tick={{fontSize:12,fill:'#8792a2'}} axisLine={false} tickLine={false}/><Tooltip formatter={v=>fmt(v)} contentStyle={{borderRadius:8,border:'1px solid #e3e8ef'}}/><Legend/><Bar dataKey="revenue" name="Revenue" fill="#16a34a" radius={[4,4,0,0]}/><Bar dataKey="cost" name="Cost" fill="#e3e8ef" radius={[4,4,0,0]}/></BarChart></ResponsiveContainer></div>
              <div className="chart-card half"><div className="chart-header"><div><div className="chart-title">Stock by Category</div><div className="chart-subtitle">All items</div></div></div><ResponsiveContainer width="100%" height={260}><PieChart><Pie data={categoryData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={70} outerRadius={110} paddingAngle={3}>{categoryData.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}</Pie><Tooltip contentStyle={{borderRadius:8,border:'1px solid #e3e8ef'}}/><Legend/></PieChart></ResponsiveContainer></div>
              <div className="chart-card half"><div className="chart-header"><div><div className="chart-title">Sell-Through Rate</div><div className="chart-subtitle">% sold per category</div></div></div><ResponsiveContainer width="100%" height={260}><BarChart data={sellThroughData} layout="vertical" margin={{top:10,right:20,left:10,bottom:0}}><CartesianGrid strokeDasharray="3 3" stroke="#e3e8ef" horizontal={false}/><XAxis type="number" domain={[0,100]} tickFormatter={v=>v+'%'} tick={{fontSize:12,fill:'#8792a2'}} axisLine={false} tickLine={false}/><YAxis type="category" dataKey="cat" tick={{fontSize:12,fill:'#8792a2'}} axisLine={false} tickLine={false} width={80}/><Tooltip formatter={v=>v+'%'} contentStyle={{borderRadius:8,border:'1px solid #e3e8ef'}}/><Bar dataKey="rate" name="Sell-through %" fill="#22c55e" radius={[0,4,4,0]}/></BarChart></ResponsiveContainer></div>
              <div className="chart-card half"><div className="chart-header"><div><div className="chart-title">Top Brands by Profit</div><div className="chart-subtitle">All-time</div></div></div><ResponsiveContainer width="100%" height={260}><BarChart data={brandData} layout="vertical" margin={{top:10,right:20,left:10,bottom:0}}><CartesianGrid strokeDasharray="3 3" stroke="#e3e8ef" horizontal={false}/><XAxis type="number" tickFormatter={fmtShort} tick={{fontSize:12,fill:'#8792a2'}} axisLine={false} tickLine={false}/><YAxis type="category" dataKey="brand" tick={{fontSize:12,fill:'#8792a2'}} axisLine={false} tickLine={false} width={70}/><Tooltip formatter={v=>fmt(v)} contentStyle={{borderRadius:8,border:'1px solid #e3e8ef'}}/><Bar dataKey="pl" name="Profit" fill="#16a34a" radius={[0,4,4,0]}/></BarChart></ResponsiveContainer></div>
              <div className="chart-card half"><div className="chart-header"><div><div className="chart-title">Avg Profit per Sale</div><div className="chart-subtitle">Last 6 months</div></div></div><ResponsiveContainer width="100%" height={260}><LineChart data={avgPLData} margin={{top:10,right:20,left:0,bottom:0}}><CartesianGrid strokeDasharray="3 3" stroke="#e3e8ef" vertical={false}/><XAxis dataKey="label" tick={{fontSize:12,fill:'#8792a2'}} axisLine={false} tickLine={false}/><YAxis tickFormatter={fmtShort} tick={{fontSize:12,fill:'#8792a2'}} axisLine={false} tickLine={false}/><Tooltip formatter={v=>fmt(v)} contentStyle={{borderRadius:8,border:'1px solid #e3e8ef'}}/><Line type="monotone" dataKey="avg" name="Avg P&L" stroke="#16a34a" strokeWidth={2} dot={{fill:'#16a34a',r:4}}/></LineChart></ResponsiveContainer></div>
              <div className="chart-card full"><div className="chart-header"><div><div className="chart-title">Best & Worst Performers</div><div className="chart-subtitle">Top and bottom 5 sold items by profit</div></div></div><div className="two-col"><div><div className="perf-label green">🏆 Best performers</div>{bestWorst.best.length===0?<div className="td-muted" style={{fontSize:13}}>No sold items yet</div>:bestWorst.best.map((item,i)=>(<div key={item.id} className="perf-row"><div className="perf-rank">{i+1}</div><div className="perf-info"><div className="perf-name">{item.brand} {item.style}</div><div className="perf-sub">{item.colourway}{item.size?` · UK ${item.size}`:''}</div></div><div className="perf-pl pos">+{fmt(item.pl)}</div></div>))}</div><div><div className="perf-label red">📉 Worst performers</div>{bestWorst.worst.length===0?<div className="td-muted" style={{fontSize:13}}>No sold items yet</div>:bestWorst.worst.map((item,i)=>(<div key={item.id} className="perf-row"><div className="perf-rank">{i+1}</div><div className="perf-info"><div className="perf-name">{item.brand} {item.style}</div><div className="perf-sub">{item.colourway}{item.size?` · UK ${item.size}`:''}</div></div><div className={`perf-pl ${item.pl>=0?'pos':'neg'}`}>{item.pl>=0?'+':''}{fmt(item.pl)}</div></div>))}</div></div></div>
            </div>
          </div>
        )}

        {page==='collector'&&(
          <div>
            <div className="page-header"><h1 className="page-title">Collector</h1><p className="page-subtitle">Track your collection</p></div>
            <div className="empty">
              <div className="empty-icon">🗂️</div>
              <div className="empty-title">Coming soon</div>
              <div style={{marginTop:6}}>The collector tracker is on its way — catalogue your collection without the financial side.</div>
            </div>
          </div>
        )}

        {page==='breaks'&&(
          <div>
            <div className="page-header"><h1 className="page-title">Breaker</h1><p className="page-subtitle">Track your box breaks and mystery pack runs</p></div>
            <div className="stats-bar">
              <div className="stat-card"><div className="stat-label">Total entries</div><div className="stat-value">{breakStats.total}</div></div>
              <div className="stat-card"><div className="stat-label">Active / Upcoming</div><div className="stat-value amber">{breakStats.active}</div></div>
              <div className="stat-card"><div className="stat-label">Completed</div><div className="stat-value">{breakStats.completed}</div></div>
              <div className="stat-card"><div className="stat-label">Total P&L</div><div className={`stat-value ${breakStats.totalPL>0?'pos':breakStats.totalPL<0?'neg':''}`}>{breakStats.totalPL>=0?'+':''}{fmt(breakStats.totalPL)}</div></div>
            </div>

            {breaksLoading ? <div className="loading">Loading...</div> : breaks.length === 0 ? (
              <div className="empty"><div className="empty-icon">🃏</div><div className="empty-title">No breaks yet</div><div style={{marginTop:6}}>Add your first box break or mystery pack run</div></div>
            ) : (
              <div className="card-grid">
                {breaks.map(b => {
                  const pl = breakPL(b)
                  const isBreak = b.type === 'break'
                  const revenue = isBreak ? (b.spots_sold||0)*(b.spot_price||0) : (b.packs_sold||0)*(b.pack_price||0)
                  return (
                    <div key={b.id} className="item-card">
                      <div className="item-card-header">
                        <div className="item-card-category">{isBreak ? '📦 Box Break' : '🎲 Mystery Packs'}</div>
                        <span className={`badge ${b.status==='completed'?'sold':b.status==='active'?'in_stock':'in_stock'}`}>
                          {b.status==='completed'?'Completed':b.status==='active'?'Active':'Upcoming'}
                        </span>
                      </div>
                      <div className="item-card-body">
                        <div className="item-card-brand">{b.name || (isBreak ? 'Box Break' : 'Mystery Packs')}</div>
                        <div className="item-card-style">
                          {isBreak ? `${b.spots_sold||0}/${b.spots_total||0} spots sold` : `${b.packs_sold||0}/${b.packs_total||0} packs sold`}
                        </div>
                      </div>
                      <div className="item-card-stats">
                        <div className="item-card-stat"><div className="item-card-stat-label">Cost</div><div className="item-card-stat-value">{fmt(b.cost)}</div></div>
                        <div className="item-card-stat"><div className="item-card-stat-label">Revenue</div><div className="item-card-stat-value">{fmt(revenue)}</div></div>
                        <div className="item-card-stat"><div className="item-card-stat-label">P&L</div><div className={`item-card-stat-value ${plColor(pl)}`}>{pl>=0?'+':''}{fmt(pl)}</div></div>
                        <div className="item-card-stat"><div className="item-card-stat-label">{isBreak?'Price/spot':'Price/pack'}</div><div className="item-card-stat-value">{fmt(isBreak?b.spot_price:b.pack_price)}</div></div>
                      </div>
                      <div className="item-card-actions">
                        <button className="btn sm" style={{flex:1}} onClick={()=>openEditBreak(b)}>Edit</button>
                        {b.type==='packs' && <button className="btn sm success" onClick={()=>{ setViewingBreak(b); fetchBreakCards(b.id) }}>Inventory</button>}
                        <button className="btn sm danger" onClick={()=>deleteBreak(b.id)}>Del</button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Break Form Modal */}
      {showBreakForm&&(
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setShowBreakForm(false)}>
          <div className="modal">
            <div className="modal-title">{editBreak?'Edit entry':'Add break / pack run'}</div>
            <div className="form-grid">
              <div className="form-group full">
                <label className="form-label">Type *</label>
                <div className="type-toggle">
                  <button className={`type-btn ${breakForm.type==='break'?'active':''}`} onClick={()=>setBreakForm(f=>({...f,type:'break'}))}>Box Break</button>
                  <button className={`type-btn ${breakForm.type==='packs'?'active':''}`} onClick={()=>setBreakForm(f=>({...f,type:'packs'}))}>Mystery Packs</button>
                </div>
              </div>
              {breakForm.type==='break'&&(
                <div className="form-group full">
                  <label className="form-label">Break name</label>
                  <input className="form-input" placeholder="e.g. Topps Chrome PL Box 1" value={breakForm.name} onChange={e=>setBreakForm(f=>({...f,name:e.target.value}))}/>
                </div>
              )}
              <div className="form-group">
                <label className="form-label">Total cost (£) *</label>
                <input className="form-input" type="number" step="0.01" placeholder="0.00" value={breakForm.cost} onChange={e=>setBreakForm(f=>({...f,cost:e.target.value}))}/>
              </div>
              <div className="form-group">
                <label className="form-label">Status</label>
                <select className="form-input" value={breakForm.status} onChange={e=>setBreakForm(f=>({...f,status:e.target.value}))}>
                  <option value="upcoming">Upcoming</option>
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                </select>
              </div>

              {breakForm.type==='break'&&<>
                <div className="form-group">
                  <label className="form-label">Total spots</label>
                  <input className="form-input" type="number" placeholder="e.g. 20" value={breakForm.spots_total} onChange={e=>setBreakForm(f=>({...f,spots_total:e.target.value}))}/>
                </div>
                <div className="form-group">
                  <label className="form-label">Spots sold</label>
                  <input className="form-input" type="number" placeholder="0" value={breakForm.spots_sold} onChange={e=>setBreakForm(f=>({...f,spots_sold:e.target.value}))}/>
                </div>
                <div className="form-group">
                  <label className="form-label">Price per spot (£)</label>
                  <input className="form-input" type="number" step="0.01" placeholder="0.00" value={breakForm.spot_price} onChange={e=>setBreakForm(f=>({...f,spot_price:e.target.value}))}/>
                </div>
                <div className="form-group">
                  <label className="form-label">Break date</label>
                  <input className="form-input" type="date" value={breakForm.break_date} onChange={e=>setBreakForm(f=>({...f,break_date:e.target.value}))}/>
                </div>
              </>}

              {breakForm.type==='packs'&&<>
                <div className="form-group">
                  <label className="form-label">Total packs</label>
                  <input className="form-input" type="number" placeholder="e.g. 200" value={breakForm.packs_total} onChange={e=>setBreakForm(f=>({...f,packs_total:e.target.value}))}/>
                </div>
                <div className="form-group">
                  <label className="form-label">Packs sold</label>
                  <input className="form-input" type="number" placeholder="0" value={breakForm.packs_sold} onChange={e=>setBreakForm(f=>({...f,packs_sold:e.target.value}))}/>
                </div>
                <div className="form-group">
                  <label className="form-label">Price per pack (£)</label>
                  <input className="form-input" type="number" step="0.01" placeholder="0.00" value={breakForm.pack_price} onChange={e=>setBreakForm(f=>({...f,pack_price:e.target.value}))}/>
                </div>
                <div className="form-group">
                  <label className="form-label">First card purchase</label>
                  <input className="form-input" type="date" value={breakForm.first_card_date} onChange={e=>setBreakForm(f=>({...f,first_card_date:e.target.value}))}/>
                </div>
                <div className="form-group">
                  <label className="form-label">Last card purchase</label>
                  <input className="form-input" type="date" value={breakForm.last_card_date} onChange={e=>setBreakForm(f=>({...f,last_card_date:e.target.value}))}/>
                </div>
                <div className="form-group">
                  <label className="form-label">First stream date</label>
                  <input className="form-input" type="date" value={breakForm.first_stream_date} onChange={e=>setBreakForm(f=>({...f,first_stream_date:e.target.value}))}/>
                </div>
                <div className="form-group">
                  <label className="form-label">Last stream date</label>
                  <input className="form-input" type="date" value={breakForm.last_stream_date} onChange={e=>setBreakForm(f=>({...f,last_stream_date:e.target.value}))}/>
                </div>
              </>}

              <div className="form-group full">
                <label className="form-label">Notes</label>
                <input className="form-input" placeholder="Any additional notes..." value={breakForm.notes} onChange={e=>setBreakForm(f=>({...f,notes:e.target.value}))}/>
              </div>
            </div>
            <div className="form-actions">
              <button className="btn" onClick={()=>{setShowBreakForm(false);setEditBreak(null);setBreakForm(EMPTY_BREAK)}}>Cancel</button>
              <button className="btn primary" onClick={saveBreak} disabled={saving}>{saving?'Saving...':editBreak?'Save changes':'Add entry'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Card Inventory Modal */}
      {viewingBreak&&(
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setViewingBreak(null)}>
          <div className="modal" style={{maxWidth:580}}>
            <div className="modal-title">Card Inventory</div>
            <div style={{fontSize:13,color:'var(--muted)',marginTop:-12,marginBottom:16}}>{viewingBreak.name||'Mystery Pack Run'}</div>

            {/* Add card form */}
            <div className="card-inventory-add">
              <input className="form-input" placeholder="Item name" value={cardForm.item} onChange={e=>setCardForm(f=>({...f,item:e.target.value}))} style={{flex:2}}/>
              <select className="form-input" value={cardForm.tier} onChange={e=>setCardForm(f=>({...f,tier:e.target.value}))} style={{flex:1}}>
                <option value="Floor">Floor</option>
                <option value="Mid">Mid</option>
                <option value="Chase">Chase</option>
              </select>
              <input className="form-input" type="number" step="0.01" placeholder="Cost (£)" value={cardForm.cost} onChange={e=>setCardForm(f=>({...f,cost:e.target.value}))} style={{flex:1}}/>
              <button className="btn primary sm" onClick={saveCard} disabled={saving||!cardForm.item}>Add</button>
            </div>

            {/* Card list */}
            <div className="batch-units" style={{marginTop:16}}>
              {sortedCards.length===0 ? (
                <div style={{textAlign:'center',padding:'24px',color:'var(--muted)',fontSize:13}}>No items yet — add your first card above</div>
              ) : sortedCards.map(card=>(
                <div key={card.id} className="batch-unit-row">
                  <div className="batch-unit-info" style={{flex:1}}>
                    <div className="batch-unit-size">{card.item}</div>
                    <div className="batch-unit-cost">{card.cost ? fmt(card.cost) : '—'}</div>
                  </div>
                  <div style={{display:'flex',alignItems:'center',gap:10}}>
                    <span className={`tier-badge tier-${card.tier?.toLowerCase()}`}>{card.tier}</span>
                    <button className="btn sm danger" onClick={()=>deleteCard(card.id)}>Del</button>
                  </div>
                </div>
              ))}
            </div>

            {sortedCards.length > 0 && (
              <div style={{marginTop:12,padding:'10px 14px',background:'var(--surface2)',borderRadius:'var(--radius)',border:'1px solid var(--border)',display:'flex',justifyContent:'space-between',fontSize:13}}>
                <span style={{color:'var(--muted)'}}>Total cost</span>
                <span style={{fontWeight:600}}>{fmt(sortedCards.reduce((s,c)=>s+(c.cost||0),0))}</span>
              </div>
            )}

            <div className="form-actions" style={{marginTop:16}}>
              <button className="btn" onClick={()=>setViewingBreak(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {showAdd&&(
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setShowAdd(false)}>
          <div className="modal">
            <div className="modal-title">{editItem?'Edit item':'Add new item'}</div>
            <div className="form-grid">
              <div className="form-group full">
                <label className="form-label">Category *</label>
                <select className="form-input" value={form.category} onChange={e=>setForm(f=>({...f,category:e.target.value,pokemon_type:'',units:[{...EMPTY_UNIT}]}))}>
                  <option value="">Select category</option>
                  {CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              {form.category&&<CategoryForm form={form} setForm={setForm} editItem={editItem} updateUnit={updateUnit} addUnit={addUnit} removeUnit={removeUnit}/>}
            </div>
            {!form.category&&<div style={{color:'var(--muted)',fontSize:13,textAlign:'center',padding:'16px 0'}}>Select a category to continue</div>}
            {saveError&&<div style={{color:'#e53e3e',fontSize:13,marginTop:8}}>Error: {saveError}</div>}
            <div className="form-actions">
              <button className="btn" onClick={()=>{setShowAdd(false);setEditItem(null);setForm(EMPTY_FORM);setSaveError('')}}>Cancel</button>
              <button className="btn primary" onClick={saveItem} disabled={saving||!form.category}>{saving?'Saving...':editItem?'Save changes':'Add item'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {batchModal&&(
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setBatchModal(null)}>
          <div className="modal" style={{maxWidth:580}}>
            <div className="modal-title">{batchModal.brand} {batchModal.style}</div>
            {batchModal.colourway&&<div style={{fontSize:13,color:'var(--muted)',marginTop:-12,marginBottom:16}}>{batchModal.colourway}</div>}
            <div className="detail-tags">
              {batchModal.category&&<span className="detail-tag"><span className="detail-tag-label">Category</span>{batchModal.category}</span>}
              {batchModal.sku&&<span className="detail-tag"><span className="detail-tag-label">SKU</span>{batchModal.sku}</span>}
              {batchModal.purchase_date&&<span className="detail-tag"><span className="detail-tag-label">Purchased</span>{batchModal.purchase_date}</span>}
              {batchModal.purchase_platform&&<span className="detail-tag"><span className="detail-tag-label">From</span>{batchModal.purchase_platform}</span>}
            </div>
            {batchModal.notes&&<div className="detail-notes">📝 {batchModal.notes}</div>}
            <div className="detail-units-title">Units</div>
            <div className="batch-units">
              {batchModal.units.map(unit=>{
                const pl=unit.status==='sold'&&unit.sale_price!=null?unit.sale_price-(unit.purchase_price||0):null
                return (
                  <div key={unit.id} className={`batch-unit-row ${unit.status==='sold'?'sold':''}`}>
                    <div className="batch-unit-info">
                      <div className="batch-unit-size">{unit.size?`UK ${unit.size}`:'No size'}</div>
                      <div className="batch-unit-cost">{fmt(unit.purchase_price)}</div>
                    </div>
                    <div className="batch-unit-right">
                      {unit.status==='sold'?(
                        <div className="batch-unit-sold">
                          <span className="badge sold">Sold{unit.selling_platform?` via ${unit.selling_platform}`:''}</span>
                          <span className={`batch-unit-pl ${plColor(pl)}`}>{pl!=null?(pl>=0?'+':'')+fmt(pl):'—'}</span>
                        </div>
                      ):(
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
      {sellItem&&(
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
            {salePrice&&(
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