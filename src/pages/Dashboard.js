import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts'

const CATEGORIES = ['Sneakers', 'Pokémon', 'Topps', 'Lego', 'Clothing', 'Miscellaneous']
const COLORS = ['#16a34a','#22c55e','#4ade80','#86efac','#bbf7d0','#f59e0b','#3b82f6']
const POKEMON_TYPES = ['Booster Box', 'Elite Trainer Box', 'Pack', 'Sleeved Booster', 'Blister', 'Triple Blister', 'Bundle', 'Other']
const TOPPS_SEALED_TYPES = ['Hobby Box', 'Blaster Box', 'Mega Box', 'Tin', 'Pack', 'Bundle', 'Other']
const TOPPS_PARALLELS = ['Base', 'Gold', 'Refractor', 'Chrome', 'Prizm', 'Foil', 'Numbered', 'Auto', 'Other']
const CONDITIONS = ['Sealed', 'Near Mint', 'Lightly Played', 'Moderately Played', 'Heavily Played']
const SEALED_CONDITIONS = ['Sealed', 'Box Damaged', 'Ripped', 'Damaged']
const COLLECTOR_SNEAKER_CONDITIONS = ['Deadstock', 'Very Near Deadstock', 'Excellent', 'Good', 'Worn']
const COLLECTOR_POKEMON_CONDITIONS = ['Sealed', 'PSA/BGS Graded', 'Near Mint', 'Lightly Played', 'Moderately Played', 'Heavily Played']
const COLLECTOR_MISC_CONDITIONS = ['Mint in Box', 'Excellent', 'Good', 'Fair']
const GRADING_COMPANIES = ['PSA', 'BGS', 'CGC', 'ACE']

// Fee platforms
const RESELLER_PLATFORMS = [
  { id: 'none', name: 'No fees (in-person)', type: 'flat', rate: 0 },
  { id: 'depop', name: 'Depop (UK)', type: 'percent_plus_fixed', rate: 2.9, fixed: 0.30 },
  { id: 'vinted', name: 'Vinted', type: 'flat', rate: 0 },
  { id: 'vinted_pro', name: 'Vinted Pro', type: 'percent', rate: 5 },
  { id: 'ebay_private', name: 'eBay (Private)', type: 'flat', rate: 0 },
  { id: 'ebay_business', name: 'eBay (Business)', type: 'percent_plus_fixed', rate: 12.8, fixed: 0.40 },
  { id: 'laced', name: 'Laced', type: 'percent', rate: 15 },
  { id: 'stockx_l1', name: 'StockX — Level 1 (0–11 sales)', type: 'percent', rate: 12 },
  { id: 'stockx_l2', name: 'StockX — Level 2 (12–39 sales)', type: 'percent', rate: 11.5 },
  { id: 'stockx_l3', name: 'StockX — Level 3 (40–799 sales)', type: 'percent', rate: 11 },
  { id: 'stockx_l4', name: 'StockX — Level 4 (800+ sales)', type: 'percent', rate: 10 },
  { id: 'whatnot', name: 'Whatnot (UK)', type: 'percent_plus_fixed', rate: 9.09, fixed: 0.35 },
  { id: 'custom', name: 'Custom', type: 'percent', rate: 0 },
]

const BREAKER_PLATFORMS = [
  { id: 'none', name: 'No fees', type: 'flat', rate: 0 },
  { id: 'whatnot', name: 'Whatnot (UK)', type: 'percent_plus_fixed', rate: 9.09, fixed: 0.35 },
  { id: 'tiktok', name: 'TikTok Live (UK)', type: 'percent_plus_fixed', rate: 9, fixed: 0.50 },
  { id: 'custom', name: 'Custom', type: 'percent', rate: 0 },
]

function calcFee(salePrice, platform, customRate = 0) {
  if (!platform || !salePrice) return 0
  const price = parseFloat(salePrice) || 0
  const rate = platform.id === 'custom' ? (parseFloat(customRate) || 0) : platform.rate
  if (platform.type === 'flat') return 0
  if (platform.type === 'fixed') return platform.fixed || 0
  if (platform.type === 'percent') return parseFloat((price * rate / 100).toFixed(2))
  if (platform.type === 'percent_plus_fixed') return parseFloat((price * rate / 100 + (platform.fixed || 0)).toFixed(2))
  return 0
}

const EMPTY_UNIT = { size: '', purchase_price: '', quantity: '1', total_cost: '', custom_qty: '' }
const ITEM_CONDITIONS = ['Brand New', 'BN Defect', 'Used - Great', 'Used - Good', 'Used - Bad']

const EMPTY_FORM = {
  category: '', pokemon_type: '', item_condition: 'Brand New',
  brand: '', style: '', colourway: '', sku: '',
  batch_total_cost: '',
  card_name: '', set_name: '', card_number: '', condition: '', graded: false, grading_company: '', grade: '', product_name: '', pokemon_sealed_type: '', quantity: '',
  lego_set_name: '', set_number: '', theme: '', lego_condition: '',
  clothing_brand: '', item: '', clothing_size: '', colour: '',
  item_name: '', description: '',
  topps_type: '', topps_card_name: '', topps_set: '', topps_year: '', topps_card_number: '', topps_parallel: '', topps_print_run: '', topps_sealed_type: '', topps_product_name: '',
  purchase_platform: '', purchase_date: '', notes: '', long_term: false,
  shipping_cost: '', target_price: '', storage_location: '',
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

function UnitSection({ form, editItem, updateUnit, addUnit, removeUnit, label = 'Variants & Quantities', sizePlaceholder = 'Description (optional)', addLabel = '+ Add' }) {
  const totalUnits = form.units.reduce((s, u) => {
    const q = u.quantity === '10+' ? (parseInt(u.custom_qty) || 1) : (parseInt(u.quantity) || 1)
    return s + q
  }, 0)
  const batchCost = parseFloat(form.batch_total_cost) || 0
  const perUnit = batchCost > 0 && totalUnits > 0 ? (batchCost / totalUnits).toFixed(2) : null

  return (
    <div className="form-group full">
      <div className="units-section">
        <div className="units-header">
          <span className="form-label">{label}</span>
          <button className="btn sm" onClick={addUnit}>{editItem ? '+ Add size' : addLabel}</button>
        </div>
        {form.units.map((unit, i) => {
          const unitQty = unit.quantity === '10+' ? (parseInt(unit.custom_qty) || 1) : (parseInt(unit.quantity) || 1)
          const sizeTotal = perUnit ? (parseFloat(perUnit) * unitQty).toFixed(2) : null
          return (
            <div key={i} className="unit-row-grid">
              <div className="unit-row-inputs">
                <input className="form-input" placeholder={sizePlaceholder} value={unit.size} onChange={e => updateUnit(i, 'size', e.target.value)} style={{ flex: 1 }} />
                <select className="form-input" value={unit.quantity} onChange={e => updateUnit(i, 'quantity', e.target.value)} style={{ flex: '0 0 80px' }}>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => <option key={n} value={n}>{n}</option>)}
                  <option value="10+">10+</option>
                </select>
                {unit.quantity === '10+' && <input className="form-input" type="number" min="11" placeholder="Qty" value={unit.custom_qty || ''} onChange={e => updateUnit(i, 'custom_qty', e.target.value)} style={{ flex: '0 0 70px' }} />}
                {form.units.length > 1 && <button className="btn sm danger" onClick={() => removeUnit(i)}>✕</button>}
              </div>
              {perUnit && (
                <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--muted)', paddingTop: 2 }}>
                  <span>£{perUnit} per unit</span>
                  {sizeTotal && <span>£{sizeTotal} for this variant</span>}
                </div>
              )}
            </div>
          )
        })}
        {perUnit && (
          <div className="units-summary">
            <span>{totalUnits} unit{totalUnits !== 1 ? 's' : ''} total</span>
            <span>£{perUnit} avg per unit</span>
          </div>
        )}
      </div>
    </div>
  )
}

function CategoryForm({ form, setForm, editItem, updateUnit, addUnit, removeUnit }) {
  const cat = form.category

  if (cat === 'Sneakers') return (
    <>
      <div className="form-group"><label className="form-label">Brand *</label><input className="form-input" placeholder="e.g. Nike" value={form.brand} onChange={e=>setForm(f=>({...f,brand:e.target.value}))}/></div>
      <div className="form-group"><label className="form-label">Style</label><input className="form-input" placeholder="e.g. Air Max 95" value={form.style} onChange={e=>setForm(f=>({...f,style:e.target.value}))}/></div>
      <div className="form-group"><label className="form-label">Colourway</label><input className="form-input" placeholder="e.g. Pure Money" value={form.colourway} onChange={e=>setForm(f=>({...f,colourway:e.target.value}))}/></div>
      <div className="form-group"><label className="form-label">SKU</label><input className="form-input" placeholder="e.g. 308497-100" value={form.sku} onChange={e=>setForm(f=>({...f,sku:e.target.value}))}/></div>
      <div className="form-group"><label className="form-label">Purchase Date</label><input className="form-input" type="date" value={form.purchase_date} onChange={e=>setForm(f=>({...f,purchase_date:e.target.value}))}/></div>
      <div className="form-group"><label className="form-label">Purchase Platform</label><input className="form-input" placeholder="e.g. JD, SNKRS, eBay" value={form.purchase_platform} onChange={e=>setForm(f=>({...f,purchase_platform:e.target.value}))}/></div>
      <div className="form-group"><label className="form-label">Total Cost (£) *</label><input className="form-input" type="number" step="0.01" placeholder="0.00" value={form.batch_total_cost||''} onChange={e=>setForm(f=>({...f,batch_total_cost:e.target.value}))}/></div>
      <div className="form-group"><label className="form-label">Notes</label><input className="form-input" placeholder="Any additional notes..." value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))}/></div>
      <div className="form-group full"><div className="units-section"><div className="units-header"><span className="form-label">Sizes & Quantities *</span><button className="btn sm" onClick={addUnit}>+ Add Size</button></div>{form.units.map((unit,i)=>{
        const totalUnits = form.units.reduce((s,u2)=>{
          const q = u2.quantity==='10+'?(parseInt(u2.custom_qty)||1):(parseInt(u2.quantity)||1)
          return s+q
        },0)
        const batchCost = parseFloat(form.batch_total_cost)||0
        const unitQty = unit.quantity==='10+'?(parseInt(unit.custom_qty)||1):(parseInt(unit.quantity)||1)
        const perUnit = batchCost>0&&totalUnits>0?(batchCost/totalUnits).toFixed(2):null
        const sizeTotal = perUnit ? (parseFloat(perUnit)*unitQty).toFixed(2) : null
        return (
          <div key={i} className="unit-row-grid">
            <div className="unit-row-inputs">
              <input className="form-input" placeholder="Size (UK)" value={unit.size} onChange={e=>updateUnit(i,'size',e.target.value)} style={{flex:1}}/>
              <select className="form-input" value={unit.quantity} onChange={e=>updateUnit(i,'quantity',e.target.value)} style={{flex:'0 0 80px'}}>
                {[1,2,3,4,5,6,7,8,9,10].map(n=><option key={n} value={n}>{n}</option>)}
                <option value="10+">10+</option>
              </select>
              {unit.quantity==='10+'&&<input className="form-input" type="number" min="11" placeholder="Qty" value={unit.custom_qty||''} onChange={e=>updateUnit(i,'custom_qty',e.target.value)} style={{flex:'0 0 70px'}}/>}
              {form.units.length>1&&<button className="btn sm danger" onClick={()=>removeUnit(i)}>✕</button>}
            </div>
            {perUnit&&(
              <div style={{display:'flex',gap:16,fontSize:12,color:'var(--muted)',paddingTop:2}}>
                <span>£{perUnit} per unit</span>
                <span>£{sizeTotal} for this size</span>
              </div>
            )}
          </div>
        )
      })}
      {(()=>{
        const totalUnits = form.units.reduce((s,u)=>{
          const q = u.quantity==='10+'?(parseInt(u.custom_qty)||1):(parseInt(u.quantity)||1)
          return s+q
        },0)
        const batchCost = parseFloat(form.batch_total_cost)||0
        const perUnit = batchCost>0&&totalUnits>0?(batchCost/totalUnits).toFixed(2):null
        return perUnit?(
          <div className="units-summary">
            <span>{totalUnits} units total</span>
            <span>£{perUnit} avg per unit</span>
          </div>
        ):null
      })()}
      </div></div>
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
        <div className="form-group"><label className="form-label">Card Name *</label><input className="form-input" placeholder="e.g. Charizard" value={form.card_name} onChange={e=>setForm(f=>({...f,card_name:e.target.value}))}/></div>
        <div className="form-group"><label className="form-label">Set</label><input className="form-input" placeholder="e.g. Base Set" value={form.set_name} onChange={e=>setForm(f=>({...f,set_name:e.target.value}))}/></div>
        <div className="form-group"><label className="form-label">Card Number</label><input className="form-input" placeholder="e.g. 004/102" value={form.card_number} onChange={e=>setForm(f=>({...f,card_number:e.target.value}))}/></div>
        <div className="form-group"><label className="form-label">Condition</label><select className="form-input" value={form.condition} onChange={e=>setForm(f=>({...f,condition:e.target.value}))}><option value="">Select</option>{CONDITIONS.map(c=><option key={c} value={c}>{c}</option>)}</select></div>
        <div className="form-group full"><label className="form-label">Graded?</label><div className="type-toggle"><button className={`type-btn ${!form.graded?'active':''}`} onClick={()=>setForm(f=>({...f,graded:false,grading_company:'',grade:''}))}>No</button><button className={`type-btn ${form.graded?'active':''}`} onClick={()=>setForm(f=>({...f,graded:true}))}>Yes</button></div></div>
        {form.graded&&<><div className="form-group"><label className="form-label">Grading Company</label><select className="form-input" value={form.grading_company} onChange={e=>setForm(f=>({...f,grading_company:e.target.value}))}><option value="">Select</option>{GRADING_COMPANIES.map(g=><option key={g} value={g}>{g}</option>)}</select></div><div className="form-group"><label className="form-label">Grade</label><input className="form-input" placeholder="e.g. 9, 10" value={form.grade} onChange={e=>setForm(f=>({...f,grade:e.target.value}))}/></div></>}
        <div className="form-group"><label className="form-label">Purchase Date</label><input className="form-input" type="date" value={form.purchase_date} onChange={e=>setForm(f=>({...f,purchase_date:e.target.value}))}/></div>
        <div className="form-group"><label className="form-label">Purchase Platform</label><input className="form-input" placeholder="e.g. eBay, Whatnot" value={form.purchase_platform} onChange={e=>setForm(f=>({...f,purchase_platform:e.target.value}))}/></div>
        <div className="form-group"><label className="form-label">Total Cost (£) *</label><input className="form-input" type="number" step="0.01" placeholder="0.00" value={form.batch_total_cost||''} onChange={e=>setForm(f=>({...f,batch_total_cost:e.target.value}))}/></div>
        <div className="form-group full"><label className="form-label">Notes</label><input className="form-input" placeholder="Any additional notes..." value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))}/></div>
      </>}
      {form.pokemon_type==='sealed'&&<>
        <div className="form-group"><label className="form-label">Series *</label><input className="form-input" placeholder="e.g. Scarlet & Violet" value={form.product_name} onChange={e=>setForm(f=>({...f,product_name:e.target.value}))}/></div>
        <div className="form-group"><label className="form-label">Set</label><input className="form-input" placeholder="e.g. Base Set" value={form.set_name} onChange={e=>setForm(f=>({...f,set_name:e.target.value}))}/></div>
        <div className="form-group"><label className="form-label">Product Type</label><select className="form-input" value={form.pokemon_sealed_type} onChange={e=>setForm(f=>({...f,pokemon_sealed_type:e.target.value}))}><option value="">Select</option>{POKEMON_TYPES.map(t=><option key={t} value={t}>{t}</option>)}</select></div>
        <div className="form-group"><label className="form-label">Condition</label><select className="form-input" value={form.condition} onChange={e=>setForm(f=>({...f,condition:e.target.value}))}><option value="">Select</option>{SEALED_CONDITIONS.map(c=><option key={c} value={c}>{c}</option>)}</select></div>
        <div className="form-group"><label className="form-label">Purchase Date</label><input className="form-input" type="date" value={form.purchase_date} onChange={e=>setForm(f=>({...f,purchase_date:e.target.value}))}/></div>
        <div className="form-group"><label className="form-label">Purchase Platform</label><input className="form-input" placeholder="e.g. eBay, Game" value={form.purchase_platform} onChange={e=>setForm(f=>({...f,purchase_platform:e.target.value}))}/></div>
        <div className="form-group"><label className="form-label">Total Cost (£) *</label><input className="form-input" type="number" step="0.01" placeholder="0.00" value={form.batch_total_cost||''} onChange={e=>setForm(f=>({...f,batch_total_cost:e.target.value}))}/></div>
        <div className="form-group full"><label className="form-label">Notes</label><input className="form-input" placeholder="Any additional notes..." value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))}/></div>
        <UnitSection form={form} editItem={editItem} updateUnit={updateUnit} addUnit={addUnit} removeUnit={removeUnit} label="Units & Quantities *" sizePlaceholder="Description (optional)" addLabel="+ Add Unit"/>
      </>}
    </>
  )

  if (cat === 'Topps') return (
    <>
      <div className="form-group full">
        <label className="form-label">Type *</label>
        <div className="type-toggle">
          <button className={`type-btn ${form.topps_type==='singles'?'active':''}`} onClick={()=>setForm(f=>({...f,topps_type:'singles'}))}>Singles</button>
          <button className={`type-btn ${form.topps_type==='sealed'?'active':''}`} onClick={()=>setForm(f=>({...f,topps_type:'sealed'}))}>Sealed</button>
        </div>
      </div>
      {form.topps_type==='singles'&&<>
        <div className="form-group"><label className="form-label">Card Name *</label><input className="form-input" placeholder="e.g. Erling Haaland" value={form.topps_card_name} onChange={e=>setForm(f=>({...f,topps_card_name:e.target.value}))}/></div>
        <div className="form-group"><label className="form-label">Set</label><input className="form-input" placeholder="e.g. Topps Chrome" value={form.topps_set} onChange={e=>setForm(f=>({...f,topps_set:e.target.value}))}/></div>
        <div className="form-group"><label className="form-label">Year</label><input className="form-input" placeholder="e.g. 2024" value={form.topps_year} onChange={e=>setForm(f=>({...f,topps_year:e.target.value}))}/></div>
        <div className="form-group"><label className="form-label">Card Number</label><input className="form-input" placeholder="e.g. 123" value={form.topps_card_number} onChange={e=>setForm(f=>({...f,topps_card_number:e.target.value}))}/></div>
        <div className="form-group"><label className="form-label">Parallel</label><select className="form-input" value={form.topps_parallel} onChange={e=>setForm(f=>({...f,topps_parallel:e.target.value}))}><option value="">Select</option>{TOPPS_PARALLELS.map(p=><option key={p} value={p}>{p}</option>)}</select></div>
        <div className="form-group"><label className="form-label">Print Run</label><input className="form-input" placeholder="e.g. /50" value={form.topps_print_run} onChange={e=>setForm(f=>({...f,topps_print_run:e.target.value}))}/></div>
        <div className="form-group"><label className="form-label">Condition</label><select className="form-input" value={form.condition} onChange={e=>setForm(f=>({...f,condition:e.target.value}))}><option value="">Select</option>{CONDITIONS.map(c=><option key={c} value={c}>{c}</option>)}</select></div>
        <div className="form-group full"><label className="form-label">Graded?</label><div className="type-toggle"><button className={`type-btn ${!form.graded?'active':''}`} onClick={()=>setForm(f=>({...f,graded:false,grading_company:'',grade:''}))}>No</button><button className={`type-btn ${form.graded?'active':''}`} onClick={()=>setForm(f=>({...f,graded:true}))}>Yes</button></div></div>
        {form.graded&&<><div className="form-group"><label className="form-label">Grading Company</label><select className="form-input" value={form.grading_company} onChange={e=>setForm(f=>({...f,grading_company:e.target.value}))}><option value="">Select</option>{GRADING_COMPANIES.map(g=><option key={g} value={g}>{g}</option>)}</select></div><div className="form-group"><label className="form-label">Grade</label><input className="form-input" placeholder="e.g. 9, 10" value={form.grade} onChange={e=>setForm(f=>({...f,grade:e.target.value}))}/></div></>}
        <div className="form-group"><label className="form-label">Purchase Date</label><input className="form-input" type="date" value={form.purchase_date} onChange={e=>setForm(f=>({...f,purchase_date:e.target.value}))}/></div>
        <div className="form-group"><label className="form-label">Purchase Platform</label><input className="form-input" placeholder="e.g. eBay, Whatnot" value={form.purchase_platform} onChange={e=>setForm(f=>({...f,purchase_platform:e.target.value}))}/></div>
        <div className="form-group"><label className="form-label">Total Cost (£) *</label><input className="form-input" type="number" step="0.01" placeholder="0.00" value={form.batch_total_cost||''} onChange={e=>setForm(f=>({...f,batch_total_cost:e.target.value}))}/></div>
        <div className="form-group full"><label className="form-label">Notes</label><input className="form-input" placeholder="Any additional notes..." value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))}/></div>
      </>}
      {form.topps_type==='sealed'&&<>
        <div className="form-group"><label className="form-label">Product Name *</label><input className="form-input" placeholder="e.g. Topps Chrome Premier League" value={form.topps_product_name} onChange={e=>setForm(f=>({...f,topps_product_name:e.target.value}))}/></div>
        <div className="form-group"><label className="form-label">Set</label><input className="form-input" placeholder="e.g. Topps Chrome" value={form.topps_set} onChange={e=>setForm(f=>({...f,topps_set:e.target.value}))}/></div>
        <div className="form-group"><label className="form-label">Year</label><input className="form-input" placeholder="e.g. 2024" value={form.topps_year} onChange={e=>setForm(f=>({...f,topps_year:e.target.value}))}/></div>
        <div className="form-group"><label className="form-label">Product Type</label><select className="form-input" value={form.topps_sealed_type} onChange={e=>setForm(f=>({...f,topps_sealed_type:e.target.value}))}><option value="">Select</option>{TOPPS_SEALED_TYPES.map(t=><option key={t} value={t}>{t}</option>)}</select></div>
        <div className="form-group"><label className="form-label">Condition</label><select className="form-input" value={form.condition} onChange={e=>setForm(f=>({...f,condition:e.target.value}))}><option value="">Select</option>{SEALED_CONDITIONS.map(c=><option key={c} value={c}>{c}</option>)}</select></div>
        <div className="form-group"><label className="form-label">Purchase Date</label><input className="form-input" type="date" value={form.purchase_date} onChange={e=>setForm(f=>({...f,purchase_date:e.target.value}))}/></div>
        <div className="form-group"><label className="form-label">Purchase Platform</label><input className="form-input" placeholder="e.g. eBay, Whatnot" value={form.purchase_platform} onChange={e=>setForm(f=>({...f,purchase_platform:e.target.value}))}/></div>
        <div className="form-group"><label className="form-label">Total Cost (£) *</label><input className="form-input" type="number" step="0.01" placeholder="0.00" value={form.batch_total_cost||''} onChange={e=>setForm(f=>({...f,batch_total_cost:e.target.value}))}/></div>
        <div className="form-group full"><label className="form-label">Notes</label><input className="form-input" placeholder="Any additional notes..." value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))}/></div>
        <UnitSection form={form} editItem={editItem} updateUnit={updateUnit} addUnit={addUnit} removeUnit={removeUnit} label="Units & Quantities *" sizePlaceholder="Description (optional)" addLabel="+ Add Unit"/>
      </>}
    </>
  )

  if (cat === 'Lego') return (
    <>
      <div className="form-group"><label className="form-label">Set Name *</label><input className="form-input" placeholder="e.g. Millennium Falcon" value={form.lego_set_name} onChange={e=>setForm(f=>({...f,lego_set_name:e.target.value}))}/></div>
      <div className="form-group"><label className="form-label">Set Number</label><input className="form-input" placeholder="e.g. 75192" value={form.set_number} onChange={e=>setForm(f=>({...f,set_number:e.target.value}))}/></div>
      <div className="form-group"><label className="form-label">Theme</label><input className="form-input" placeholder="e.g. Star Wars" value={form.theme} onChange={e=>setForm(f=>({...f,theme:e.target.value}))}/></div>
      <div className="form-group"><label className="form-label">Condition</label><select className="form-input" value={form.lego_condition} onChange={e=>setForm(f=>({...f,lego_condition:e.target.value}))}><option value="">Select</option><option value="Sealed">Sealed</option><option value="Open/Complete">Open/Complete</option><option value="Open/Incomplete">Open/Incomplete</option></select></div>
      <div className="form-group"><label className="form-label">Purchase Date</label><input className="form-input" type="date" value={form.purchase_date} onChange={e=>setForm(f=>({...f,purchase_date:e.target.value}))}/></div>
      <div className="form-group"><label className="form-label">Purchase Platform</label><input className="form-input" placeholder="e.g. Lego.com, eBay" value={form.purchase_platform} onChange={e=>setForm(f=>({...f,purchase_platform:e.target.value}))}/></div>
      <div className="form-group"><label className="form-label">Total Cost (£) *</label><input className="form-input" type="number" step="0.01" placeholder="0.00" value={form.batch_total_cost||''} onChange={e=>setForm(f=>({...f,batch_total_cost:e.target.value}))}/></div>
      <div className="form-group full"><label className="form-label">Notes</label><input className="form-input" placeholder="Any additional notes..." value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))}/></div>
      <UnitSection form={form} editItem={editItem} updateUnit={updateUnit} addUnit={addUnit} removeUnit={removeUnit} label="Units & Quantities *" sizePlaceholder="Description (optional)" addLabel="+ Add Unit"/>
    </>
  )

  if (cat === 'Clothing') return (
    <>
      <div className="form-group"><label className="form-label">Brand *</label><input className="form-input" placeholder="e.g. Supreme" value={form.clothing_brand} onChange={e=>setForm(f=>({...f,clothing_brand:e.target.value}))}/></div>
      <div className="form-group"><label className="form-label">Item</label><input className="form-input" placeholder="e.g. Box Logo Hoodie" value={form.item} onChange={e=>setForm(f=>({...f,item:e.target.value}))}/></div>
      <div className="form-group"><label className="form-label">Colour</label><input className="form-input" placeholder="e.g. Black" value={form.colour} onChange={e=>setForm(f=>({...f,colour:e.target.value}))}/></div>
      <div className="form-group"><label className="form-label">Purchase Date</label><input className="form-input" type="date" value={form.purchase_date} onChange={e=>setForm(f=>({...f,purchase_date:e.target.value}))}/></div>
      <div className="form-group"><label className="form-label">Purchase Platform</label><input className="form-input" placeholder="e.g. Supreme, eBay" value={form.purchase_platform} onChange={e=>setForm(f=>({...f,purchase_platform:e.target.value}))}/></div>
      <div className="form-group"><label className="form-label">Total Cost (£) *</label><input className="form-input" type="number" step="0.01" placeholder="0.00" value={form.batch_total_cost||''} onChange={e=>setForm(f=>({...f,batch_total_cost:e.target.value}))}/></div>
      <div className="form-group full"><label className="form-label">Notes</label><input className="form-input" placeholder="Any additional notes..." value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))}/></div>
      <UnitSection form={form} editItem={editItem} updateUnit={updateUnit} addUnit={addUnit} removeUnit={removeUnit} label="Sizes & Quantities *" sizePlaceholder="Size (e.g. S, M, L, XL)" addLabel="+ Add Size"/>
    </>
  )

  if (cat === 'Miscellaneous') return (
    <>
      <div className="form-group"><label className="form-label">Item Name *</label><input className="form-input" placeholder="e.g. Vintage Camera" value={form.item_name} onChange={e=>setForm(f=>({...f,item_name:e.target.value}))}/></div>
      <div className="form-group full"><label className="form-label">Description</label><input className="form-input" placeholder="Brief description..." value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))}/></div>
      <div className="form-group"><label className="form-label">Purchase Date</label><input className="form-input" type="date" value={form.purchase_date} onChange={e=>setForm(f=>({...f,purchase_date:e.target.value}))}/></div>
      <div className="form-group"><label className="form-label">Purchase Platform</label><input className="form-input" placeholder="e.g. eBay, Facebook" value={form.purchase_platform} onChange={e=>setForm(f=>({...f,purchase_platform:e.target.value}))}/></div>
      <div className="form-group"><label className="form-label">Total Cost (£) *</label><input className="form-input" type="number" step="0.01" placeholder="0.00" value={form.batch_total_cost||''} onChange={e=>setForm(f=>({...f,batch_total_cost:e.target.value}))}/></div>
      <div className="form-group full"><label className="form-label">Notes</label><input className="form-input" placeholder="Any additional notes..." value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))}/></div>
      <UnitSection form={form} editItem={editItem} updateUnit={updateUnit} addUnit={addUnit} removeUnit={removeUnit} label="Units & Quantities *" sizePlaceholder="Description (optional)" addLabel="+ Add Unit"/>
    </>
  )

  return null
}

function StockChecklist({ items, breaks, clearedBatch, onAddItem, onEditItem, onSellItem }) {
  const STORAGE_KEY = 'stocktrack_checklist'

  function loadSaved() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      return saved ? JSON.parse(saved) : null
    } catch { return null }
  }

  function saveToStorage(state) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)) } catch {}
  }

  const saved = loadSaved()
  const [selectedCategories, setSelectedCategories] = useState(saved?.selectedCategories || {
    Sneakers: true, 'Pokémon': true, Topps: true, Lego: true, Clothing: true, Miscellaneous: true, Breaker: false
  })
  const [status, setStatus] = useState(saved?.status || {})
  const [notes, setNotes] = useState(saved?.notes || {})
  const [rowData, setRowData] = useState(saved?.rowData || {})
  const [checklistTab, setChecklistTab] = useState('checklist')
  const [unlisted, setUnlisted] = useState(saved?.unlisted || [])
  const [showFlagForm, setShowFlagForm] = useState(false)
  const [flagNote, setFlagNote] = useState('')

  // Save to localStorage whenever state changes
  useEffect(() => {
    saveToStorage({ selectedCategories, status, notes, rowData, unlisted })
  }, [selectedCategories, status, notes, rowData, unlisted])

  // Scroll to top when checklist mounts (prevents opening at bottom when switching back to tab)
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' }) }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // When an item is saved from the edit modal, remove its discrepancy
  useEffect(() => {
    if (!clearedBatch) return
    const prefix = `batch-${clearedBatch}`
    setStatus(prev => { const n = {...prev}; Object.keys(n).forEach(k => { if (k.startsWith(prefix)) delete n[k] }); return n })
    setNotes(prev => { const n = {...prev}; Object.keys(n).forEach(k => { if (k.startsWith(prefix)) delete n[k] }); return n })
  }, [clearedBatch])

  function toggleCategory(cat) { setSelectedCategories(s => ({ ...s, [cat]: !s[cat] })) }

  function setRowStatus(id, val, row) {
    setStatus(s => ({ ...s, [id]: s[id] === val ? undefined : val }))
    if (val === 'correct') setNotes(n => ({ ...n, [id]: '' }))
    if (val === 'incorrect') setRowData(r => ({ ...r, [id]: row }))
  }

  function setNote(id, val) { setNotes(s => ({ ...s, [id]: val })) }
  function addUnlisted() { if (!flagNote.trim()) return; setUnlisted(u => [...u, { id: Date.now(), note: flagNote.trim() }]); setFlagNote(''); setShowFlagForm(false) }
  function removeUnlisted(id) { setUnlisted(u => u.filter(i => i.id !== id)) }
  function clearDiscrepancy(id) { setStatus(s => ({ ...s, [id]: undefined })); setNotes(n => ({ ...n, [id]: '' })) }

  function clearAll() {
    if (!window.confirm('Reset the entire checklist? This cannot be undone.')) return
    setStatus({}); setNotes({}); setRowData({}); setUnlisted([])
    try { localStorage.removeItem(STORAGE_KEY) } catch {}
  }

  const batchMap = {}
  items.filter(i => selectedCategories[i.category] && i.status === 'in_stock').forEach(i => {
    const key = i.batch_id || i.id
    if (!batchMap[key]) batchMap[key] = { ...i, units: [], qty: 0, sizes: {} }
    batchMap[key].units.push(i); batchMap[key].qty++
    if (i.size) batchMap[key].sizes[i.size] = (batchMap[key].sizes[i.size] || 0) + 1
  })

  const stockRows = []
  Object.values(batchMap).forEach(b => {
    const baseRow = {
      brand: b.brand || '—', style: b.style || '—',
      colourway: (b.category === 'Pokémon' || b.category === 'Topps')
        ? [b.set_name || b.topps_set, b.pokemon_sealed_type || b.topps_sealed_type].filter(Boolean).join(' · ') || b.colourway || '—'
        : b.colourway || '—',
      sku: b.sku || '', category: b.category,
      grade: (b.graded && (b.grading_company || b.grade)) ? [b.grading_company, b.grade].filter(Boolean).join(' ') : '',
      itemId: b.units[0]?.id, batchId: b.batch_id
    }
    if (Object.keys(b.sizes).length > 0) {
      Object.entries(b.sizes).forEach(([size, qty]) => {
        stockRows.push({ ...baseRow, id: `batch-${b.batch_id || b.id}-${size}`, sizeDisplay: `UK ${size}`, qty })
      })
    } else {
      stockRows.push({ ...baseRow, id: `batch-${b.batch_id || b.id}`, sizeDisplay: '—', qty: b.qty })
    }
  })

  const breakRows = selectedCategories.Breaker ? breaks.filter(b => b.status !== 'completed').map(b => ({
    id: `break-${b.id}`, brand: b.type === 'break' ? 'Box Break' : 'Mystery Packs',
    style: b.name || (b.type === 'break' ? 'Box Break' : 'Mystery Packs'), colourway: '', sku: '',
    sizeDisplay: b.type === 'break' ? `${b.spots_sold||0}/${b.spots_total||0} spots` : `${b.packs_sold||0}/${b.packs_total||0} packs`,
    qty: 1, category: 'Breaker', itemId: null, batchId: null
  })) : []

  const allRows = [...stockRows, ...breakRows]
  const correctCount = Object.values(status).filter(s => s === 'correct').length
  const incorrectCount = Object.values(status).filter(s => s === 'incorrect').length
  const uncheckedCount = allRows.length - correctCount - incorrectCount

  return (
    <div>
      {/* Three tabs */}
      <div style={{display:'flex',gap:8,marginBottom:20}}>
        <button className={`type-btn ${checklistTab==='checklist'?'active':''}`} onClick={()=>setChecklistTab('checklist')}>
          Checklist <span style={{marginLeft:4,background:'var(--border)',borderRadius:10,padding:'1px 6px',fontSize:11}}>{allRows.length}</span>
        </button>
        <button className={`type-btn ${checklistTab==='discrepancies'?'active':''}`} onClick={()=>setChecklistTab('discrepancies')}>
          Discrepancies {incorrectCount>0&&<span style={{marginLeft:4,background:'#fee2e2',color:'var(--red)',borderRadius:10,padding:'1px 6px',fontSize:11}}>{incorrectCount}</span>}
        </button>
        <button className={`type-btn ${checklistTab==='unlisted'?'active':''}`} onClick={()=>setChecklistTab('unlisted')}>
          Unlisted {unlisted.length>0&&<span style={{marginLeft:4,background:'#fef3c7',color:'#d97706',borderRadius:10,padding:'1px 6px',fontSize:11}}>{unlisted.length}</span>}
        </button>
      </div>

      {/* CHECKLIST TAB */}
      {checklistTab==='checklist'&&(
        <div>
          <div className="chart-card checklist-sticky" style={{marginBottom:20}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:12,marginBottom:16}}>
              <div className="chart-title" style={{margin:0}}>Stock Checklist</div>
              <div style={{display:'flex',gap:8}}>
                <button className="btn sm danger" onClick={clearAll}>🗑 Reset</button>
                <button className="btn sm" style={{borderColor:'#f59e0b',color:'#d97706'}} onClick={()=>setShowFlagForm(true)}>+ Flag unlisted item</button>
              </div>
            </div>
            {showFlagForm&&(
              <div style={{background:'#fffbeb',border:'1px solid #f59e0b',borderRadius:'var(--radius)',padding:'12px 14px',marginBottom:16}}>
                <div style={{fontSize:13,fontWeight:600,color:'#92400e',marginBottom:8}}>Describe the unlisted item</div>
                <div style={{display:'flex',gap:8}}>
                  <input className="form-input" placeholder="e.g. Nike Air Max 95 UK 9 — not in system" value={flagNote} onChange={e=>setFlagNote(e.target.value)} onKeyDown={e=>e.key==='Enter'&&addUnlisted()} autoFocus style={{flex:1}}/>
                  <button className="btn primary sm" onClick={addUnlisted} disabled={!flagNote.trim()}>Add</button>
                  <button className="btn sm" onClick={()=>{setShowFlagForm(false);setFlagNote('')}}>Cancel</button>
                </div>
              </div>
            )}
            <div style={{display:'flex',flexWrap:'wrap',gap:8,marginBottom:16}}>
              {Object.keys(selectedCategories).map(cat => (
                <label key={cat} className="metrics-checkbox"><input type="checkbox" checked={selectedCategories[cat]} onChange={()=>toggleCategory(cat)}/>{cat}</label>
              ))}
            </div>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:8}}>
              <div style={{display:'flex',gap:16,fontSize:13}}>
                <span style={{color:'var(--muted)'}}>{allRows.length} items</span>
                {correctCount>0&&<span style={{color:'var(--green)'}}>✓ {correctCount} correct</span>}
                {incorrectCount>0&&<span style={{color:'var(--red)',cursor:'pointer'}} onClick={()=>setChecklistTab('discrepancies')}>✗ {incorrectCount} incorrect</span>}
                {uncheckedCount>0&&<span style={{color:'var(--muted)'}}>◯ {uncheckedCount} unchecked</span>}
                {unlisted.length>0&&<span style={{color:'#d97706',cursor:'pointer'}} onClick={()=>setChecklistTab('unlisted')}>⚠ {unlisted.length} unlisted</span>}
              </div>
              <button className="btn primary sm" onClick={()=>window.print()}>🖨️ Print</button>
            </div>
          </div>

          {allRows.length===0?(
            <div className="empty"><div className="empty-icon">📋</div><div className="empty-title">No stock found</div><div style={{marginTop:6}}>Select at least one category above</div></div>
          ):(
            <div className="chart-card checklist-card" id="checklist-print">
              <div className="checklist-header">
                <div className="checklist-col actions">Status</div>
                <div className="checklist-col brand">Brand</div>
                <div className="checklist-col style">Style</div>
                <div className="checklist-col colourway">Colourway / Set</div>
                <div className="checklist-col sku">SKU</div>
                <div className="checklist-col size">Sizes</div>
                <div className="checklist-col qty">Qty</div>
                <div className="checklist-col discrepancy">Note</div>
              </div>
              {allRows.map((row, i) => (
                <div key={row.id} className={`checklist-row ${status[row.id]==='correct'?'row-correct':status[row.id]==='incorrect'?'row-incorrect':''} ${i%2===0?'alt':''}`}>
                  <div className="checklist-col actions">
                    <div style={{display:'flex',gap:4}}>
                      <button className={`check-btn correct ${status[row.id]==='correct'?'active':''}`} onClick={()=>setRowStatus(row.id,'correct',row)} title="Correct">✓</button>
                      <button className={`check-btn incorrect ${status[row.id]==='incorrect'?'active':''}`} onClick={()=>setRowStatus(row.id,'incorrect',row)} title="Incorrect">✗</button>
                      {row.category!=='Breaker'&&row.itemId&&(()=>{const item=items.find(i=>i.id===row.itemId);return item&&item.status==='in_stock'?<button className="check-btn sell" title="Sell" onClick={()=>{const batchInStock=item.batch_id?items.filter(i=>i.batch_id===item.batch_id&&i.status==='in_stock'):[item];const ids=batchInStock.map(u=>u.id);onSellItem({...item,_bulkIds:[ids[0]],_allIds:ids,_maxQty:ids.length,_sellQty:1})}}>£</button>:null})()}
                    </div>
                  </div>
                  <div className="checklist-col brand">{row.brand}</div>
                  <div className="checklist-col style">
                    {row.style}
                    {row.grade&&<span style={{fontSize:10,fontWeight:600,background:'#e0e7ff',color:'#3730a3',padding:'1px 5px',borderRadius:4,display:'inline-block',marginLeft:5}}>{row.grade}</span>}
                  </div>
                  <div className="checklist-col colourway">{row.colourway||'—'}</div>
                  <div className="checklist-col sku">{row.sku||'—'}</div>
                  <div className="checklist-col size">{row.sizeDisplay}</div>
                  <div className="checklist-col qty">{row.qty}</div>
                  <div className="checklist-col discrepancy">
                    {status[row.id]==='incorrect'&&(
                      <input className="discrepancy-input" placeholder="Describe the issue..." value={notes[row.id]||''} onChange={e=>setNote(row.id,e.target.value)} title={notes[row.id]||''} autoFocus/>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* DISCREPANCIES TAB */}
      {checklistTab==='discrepancies'&&(
        <div>
          <div className="chart-card" style={{marginBottom:20}}>
            <div className="chart-title" style={{marginBottom:4}}>Discrepancies</div>
            <div style={{fontSize:13,color:'var(--muted)'}}>Items marked as incorrect during the checklist. Edit them to fix the issues.</div>
          </div>
          {incorrectCount===0?(
            <div className="empty"><div className="empty-icon">✅</div><div className="empty-title">No discrepancies</div><div style={{marginTop:6}}>Mark items as incorrect in the Checklist tab to see them here</div></div>
          ):(
            <div style={{display:'flex',flexDirection:'column',gap:8}}>
              {Object.entries(status).filter(([,v])=>v==='incorrect').map(([id])=>{
                const row = rowData[id]
                if (!row) return null
                return (
                  <div key={id} style={{background:'#fff5f5',border:'1px solid #fed7d7',borderRadius:'var(--radius)',padding:'14px 16px'}}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:12,flexWrap:'wrap'}}>
                      <div style={{flex:1}}>
                        <div style={{fontWeight:600,fontSize:14,color:'var(--text)'}}>{row.brand} {row.style}</div>
                        <div style={{fontSize:12,color:'var(--muted)',marginTop:2}}>{[row.colourway,row.sizeDisplay!=='—'?row.sizeDisplay:null,row.sku].filter(Boolean).join(' · ')}</div>
                        {notes[id]&&<div style={{marginTop:8,fontSize:13,color:'#c53030',background:'#fff5f5',padding:'6px 10px',borderRadius:6,border:'1px solid #feb2b2'}}>📝 {notes[id]}</div>}
                      </div>
                      <div style={{display:'flex',gap:8,flexShrink:0}}>
                        {row.itemId&&<button className="btn sm primary" onClick={()=>{const item=items.find(i=>i.id===row.itemId);if(item)onEditItem(item)}}>Edit item</button>}
                        {row.itemId&&(()=>{const item=items.find(i=>i.id===row.itemId);return item&&item.status==='in_stock'?<button className="btn sm success" onClick={()=>{const batchInStock=item.batch_id?items.filter(i=>i.batch_id===item.batch_id&&i.status==='in_stock'):[item];const ids=batchInStock.map(u=>u.id);onSellItem({...item,_bulkIds:[ids[0]],_allIds:ids,_maxQty:ids.length,_sellQty:1})}}>Sell</button>:null})()}
                        <button className="btn sm" onClick={()=>clearDiscrepancy(id)}>Dismiss</button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* UNLISTED TAB */}
      {checklistTab==='unlisted'&&(
        <div>
          <div className="chart-card" style={{marginBottom:20}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <div>
                <div className="chart-title" style={{marginBottom:4}}>Unlisted Items</div>
                <div style={{fontSize:13,color:'var(--muted)'}}>Items found that aren't in the system yet.</div>
              </div>
              <button className="btn sm" style={{borderColor:'#f59e0b',color:'#d97706'}} onClick={()=>{setChecklistTab('checklist');setTimeout(()=>setShowFlagForm(true),50)}}>+ Flag another</button>
            </div>
          </div>
          {unlisted.length===0?(
            <div className="empty"><div className="empty-icon">📦</div><div className="empty-title">No unlisted items</div><div style={{marginTop:6}}>Use the "Flag unlisted item" button in the Checklist tab</div></div>
          ):(
            <div style={{display:'flex',flexDirection:'column',gap:8}}>
              {unlisted.map(u=>(
                <div key={u.id} style={{display:'flex',alignItems:'center',gap:12,padding:'12px 16px',background:'#fffbeb',border:'1px solid #f59e0b',borderRadius:'var(--radius)'}}>
                  <div style={{flex:1,fontSize:13,color:'var(--text)'}}>{u.note}</div>
                  <button className="btn primary sm" onClick={()=>{onAddItem();removeUnlisted(u.id)}}>+ Add to stock</button>
                  <button className="btn sm danger" onClick={()=>removeUnlisted(u.id)}>Del</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function FeeCalculator() {
  const [calcPlatform, setCalcPlatform] = useState(null)
  const [calcPrice, setCalcPrice] = useState('')
  const [calcCost, setCalcCost] = useState('')
  const [calcCustomRate, setCalcCustomRate] = useState('')
  const [calcType, setCalcType] = useState('reseller')

  const platforms = calcType === 'reseller' ? RESELLER_PLATFORMS : BREAKER_PLATFORMS
  const fee = calcFee(calcPrice, calcPlatform, calcCustomRate)
  const price = parseFloat(calcPrice) || 0
  const cost = parseFloat(calcCost) || 0
  const netSale = price - fee
  const profit = netSale - cost
  const roi = cost > 0 ? ((profit / cost) * 100).toFixed(1) : null

  return (
    <div style={{maxWidth:480}}>
      <div className="chart-card">
        <div className="chart-title" style={{marginBottom:20}}>Fee Calculator</div>
        <div className="form-grid">
          <div className="form-group full">
            <label className="form-label">Calculator type</label>
            <div className="type-toggle">
              <button className={`type-btn ${calcType==='reseller'?'active':''}`} onClick={()=>{setCalcType('reseller');setCalcPlatform(null)}}>Reseller</button>
              <button className={`type-btn ${calcType==='breaker'?'active':''}`} onClick={()=>{setCalcType('breaker');setCalcPlatform(null)}}>Breaker</button>
            </div>
          </div>
          <div className="form-group full">
            <label className="form-label">Platform</label>
            <select className="form-input" value={calcPlatform?.id||''} onChange={e=>setCalcPlatform(platforms.find(p=>p.id===e.target.value)||null)}>
              <option value="">Select platform</option>
              {platforms.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          {calcPlatform?.id==='custom'&&(
            <div className="form-group full">
              <label className="form-label">Custom fee %</label>
              <input className="form-input" type="number" step="0.1" placeholder="e.g. 10" value={calcCustomRate} onChange={e=>setCalcCustomRate(e.target.value)}/>
            </div>
          )}
          <div className="form-group">
            <label className="form-label">Sale price (£)</label>
            <input className="form-input" type="number" step="0.01" placeholder="0.00" value={calcPrice} onChange={e=>setCalcPrice(e.target.value)}/>
          </div>
          <div className="form-group">
            <label className="form-label">Cost price (£)</label>
            <input className="form-input" type="number" step="0.01" placeholder="0.00" value={calcCost} onChange={e=>setCalcCost(e.target.value)}/>
          </div>
        </div>

        {calcPrice && calcPlatform && (
          <div className="fee-breakdown" style={{marginTop:8}}>
            <div className="fee-row"><span>Sale price</span><span>{fmt(price)}</span></div>
            {fee>0&&<div className="fee-row fee-deduct"><span>Platform fee ({calcPlatform.id==='custom'?calcCustomRate:calcPlatform.rate}%{calcPlatform.fixed?` + £${calcPlatform.fixed}`:''})</span><span>-{fmt(fee)}</span></div>}
            <div className="fee-row"><span>Net proceeds</span><span>{fmt(netSale)}</span></div>
            {calcCost>0&&<><div className="fee-row"><span>Cost</span><span>-{fmt(cost)}</span></div>
            <div className={`fee-row fee-total ${profit>=0?'pos':'neg'}`}><span>Profit</span><span>{fmt(profit)}</span></div>
            {roi&&<div className="fee-row" style={{fontSize:12,color:'var(--muted)'}}><span>ROI</span><span>{roi}%</span></div>}</>}
          </div>
        )}
      </div>
    </div>
  )
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
  const [sellFeeplatform, setSellFeeplatform] = useState(null)
  const [customFeeRate, setCustomFeeRate] = useState('')
  const [payoutStatus, setPayoutStatus] = useState('pending')
  const [shippingFee, setShippingFee] = useState('')
  const [soldDate, setSoldDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [stockTab, setStockTab] = useState('inventory')
  const [clearedBatch, setClearedBatch] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [search, setSearch] = useState('')
  const [filterBrand, setFilterBrand] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [sortBy, setSortBy] = useState('newest')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [chartMonths, setChartMonths] = useState(6)
  const [metricsSources, setMetricsSources] = useState({ reseller: true, breaker: true, collector: false })

  function toggleSource(key) {
    setMetricsSources(s => ({ ...s, [key]: !s[key] }))
  }

  useEffect(() => { fetchItems(); fetchBreaks(); fetchExpenses() }, [])

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
    else if (form.category === 'Topps') { brand = 'Topps'; style = form.topps_type === 'singles' ? form.topps_card_name : form.topps_product_name; colourway = form.topps_set; sku = form.topps_card_number }
    else if (form.category === 'Miscellaneous') { brand = form.item_name; style = form.description }
    const base = {
      category: form.category, brand, style, colourway, sku,
      item_condition: form.item_condition || 'Brand New',
      target_price: parseFloat(form.target_price) || null,
      purchase_platform: form.purchase_platform, purchase_date: form.purchase_date || null, notes: form.notes,
      pokemon_type: form.pokemon_type || null, card_name: form.card_name || null, set_name: form.set_name || null,
      card_number: form.card_number || null, condition: form.condition || null, graded: form.graded || false,
      grading_company: form.grading_company || null, grade: form.grade || null, product_name: form.product_name || null,
      pokemon_sealed_type: form.pokemon_sealed_type || null, lego_set_name: form.lego_set_name || null,
      set_number: form.set_number || null, theme: form.theme || null, lego_condition: form.lego_condition || null,
      clothing_brand: form.clothing_brand || null, item: form.item || null, clothing_size: form.clothing_size || null,
      colour: form.colour || null, item_name: form.item_name || null, description: form.description || null,
      storage_location: form.storage_location || null,
      batch_id: batchId, user_id: session.user.id, status: 'in_stock'
    }
    let error
    if (editItem) {
      const { status: _s, sold_at: _sa, sale_price: _sp, selling_platform: _spl, fee_amount: _fa, payout_status: _ps, ...editBase } = base

      // Get all in-stock units in this batch with the same size
      const sameSize = form.units[0]?.size || ''
      const batchUnits = editItem.batch_id ? items.filter(i => i.batch_id === editItem.batch_id && i.size === (editItem.size||'') && i.status === 'in_stock') : [editItem].filter(i => i.status === 'in_stock')
      const newQty = form.units[0]?.quantity === '10+' ? (parseInt(form.units[0]?.custom_qty) || 1) : (parseInt(form.units[0]?.quantity) || 1)
      const currentQty = batchUnits.length

      // Only count in-stock units for price-per-unit recalculation
      const allBatchUnits = editItem.batch_id ? items.filter(i => i.batch_id === editItem.batch_id && i.status === 'in_stock') : [editItem].filter(i => i.status === 'in_stock')
      const otherUnits = allBatchUnits.filter(i => i.size !== (editItem.size||''))
      const batchCost = parseFloat(form.batch_total_cost) || 0
      const newTotalUnits = otherUnits.length + newQty
      const pricePerUnit = batchCost > 0 && newTotalUnits > 0 ? parseFloat((batchCost / newTotalUnits).toFixed(2)) : parseFloat(form.units[0]?.purchase_price) || 0

      const payload = { ...editBase, purchase_price: pricePerUnit, size: sameSize, long_term: form.long_term || false }

      // Update all existing units with new metadata
      if (editItem.batch_id) {
        ;({ error } = await supabase.from('stock').update(payload).eq('batch_id', editItem.batch_id))
      } else {
        ;({ error } = await supabase.from('stock').update(payload).eq('id', editItem.id))
      }
      if (error) { setSaveError(error.message); setSaving(false); return }

      // Handle quantity changes for the edited size
      if (newQty > currentQty) {
        const newRows = Array.from({ length: newQty - currentQty }, () => ({
          ...payload, status: 'in_stock', batch_id: editItem.batch_id || editItem.id, user_id: session.user.id
        }))
        ;({ error } = await supabase.from('stock').insert(newRows))
      } else if (newQty < currentQty) {
        const toDelete = batchUnits.slice(newQty).map(u => u.id)
        for (const id of toDelete) {
          await supabase.from('stock').delete().eq('id', id)
        }
      }

      // Insert any additional new sizes added during edit
      const additionalUnits = form.units.slice(1)
      if (additionalUnits.length > 0) {
        const additionalRows = additionalUnits.flatMap(u => {
          const qty = u.quantity === '10+' ? (parseInt(u.custom_qty)||1) : (parseInt(u.quantity)||1)
          return Array.from({ length: qty }, () => ({
            ...payload, size: u.size, purchase_price: pricePerUnit,
            status: 'in_stock', batch_id: editItem.batch_id || editItem.id, user_id: session.user.id
          }))
        })
        await supabase.from('stock').insert(additionalRows)
      }
    } else {
      const rows = form.units.flatMap(u => {
        const qty = u.quantity === '10+' ? (parseInt(u.custom_qty) || 1) : (parseInt(u.quantity) || 1)
        const totalUnits = form.units.reduce((s, u2) => {
          const q = u2.quantity === '10+' ? (parseInt(u2.custom_qty)||1) : (parseInt(u2.quantity)||1)
          return s + q
        }, 0)
        const batchCost = (parseFloat(form.batch_total_cost) || 0) + (parseFloat(form.shipping_cost) || 0)
        const pricePerUnit = batchCost > 0 && totalUnits > 0
          ? parseFloat((batchCost / totalUnits).toFixed(2))
          : parseFloat(u.purchase_price) || 0
        return Array.from({ length: qty }, () => ({ ...base, size: u.size, purchase_price: pricePerUnit }))
      })
      ;({ error } = await supabase.from('stock').insert(rows))
    }
    setSaving(false)
    if (error) { setSaveError(error.message); return }
    if (editItem) { setClearedBatch(editItem.batch_id || editItem.id); setTimeout(() => setClearedBatch(null), 200) }
    setShowAdd(false); setEditItem(null); setForm(EMPTY_FORM); fetchItems()
  }

  function openEdit(item) {
    // Only count in-stock units — sold units have already realised their cost
    const batchUnits = item.batch_id ? items.filter(i => i.batch_id === item.batch_id && i.status === 'in_stock') : [item].filter(i => i.status === 'in_stock')
    const totalCost = parseFloat(batchUnits.reduce((s, u) => s + (u.purchase_price || 0), 0).toFixed(2))
    const sameSize = batchUnits.filter(u => u.size === item.size)
    const qty = sameSize.length > 1 ? sameSize.length : 1
    setForm({ ...EMPTY_FORM, category: item.category||'', pokemon_type: item.pokemon_type||'', item_condition: item.item_condition||'Brand New', long_term: item.long_term||false, target_price: item.target_price||'', storage_location: item.storage_location||'', topps_type: item.topps_type||'', topps_card_name: item.topps_card_name||'', topps_set: item.topps_set||'', topps_year: item.topps_year||'', topps_card_number: item.topps_card_number||'', topps_parallel: item.topps_parallel||'', topps_print_run: item.topps_print_run||'', topps_sealed_type: item.topps_sealed_type||'', topps_product_name: item.topps_product_name||'', brand: item.brand||'', style: item.style||'', colourway: item.colourway||'', sku: item.sku||'', card_name: item.card_name||'', set_name: item.set_name||'', card_number: item.card_number||'', condition: item.condition||'', graded: item.graded||false, grading_company: item.grading_company||'', grade: item.grade||'', product_name: item.product_name||'', pokemon_sealed_type: item.pokemon_sealed_type||'', lego_set_name: item.lego_set_name||'', set_number: item.set_number||'', theme: item.theme||'', lego_condition: item.lego_condition||'', clothing_brand: item.clothing_brand||'', item: item.item||'', clothing_size: item.clothing_size||'', colour: item.colour||'', item_name: item.item_name||'', description: item.description||'', purchase_platform: item.purchase_platform||'', purchase_date: item.purchase_date||'', notes: item.notes||'', batch_total_cost: totalCost||'', units: [{ size: item.size||'', purchase_price: item.purchase_price||'', quantity: qty <= 10 ? String(qty) : '10+', custom_qty: qty > 10 ? String(qty) : '' }] })
    setEditItem(item); setShowAdd(true)
  }

  async function deleteItem(id) {
    if (!window.confirm('Delete this item?')) return
    await supabase.from('stock').delete().eq('id', id)
    fetchItems()
    if (batchModal) setBatchModal(prev => ({ ...prev, units: prev.units.filter(u => u.id !== id) }))
  }

  async function undoSale(id) {
    if (!window.confirm('Restore this item to inventory? The sale record will be cleared.')) return
    await supabase.from('stock').update({
      status: 'in_stock', sale_price: null, selling_platform: null,
      fee_amount: null, shipping_fee: null, sold_at: null,
      payout_status: null, buyer_name: null
    }).eq('id', id)
    fetchItems()
  }

  function duplicateItem(batch) {
    const item = batch.units[0]
    setForm({
      ...EMPTY_FORM,
      category: item.category||'',
      pokemon_type: item.pokemon_type||'',
      item_condition: item.item_condition||'Brand New',
      brand: item.brand||'',
      style: item.style||'',
      colourway: item.colourway||'',
      sku: item.sku||'',
      card_name: item.card_name||'',
      set_name: item.set_name||'',
      card_number: item.card_number||'',
      condition: item.condition||'',
      graded: item.graded||false,
      grading_company: item.grading_company||'',
      grade: item.grade||'',
      product_name: item.product_name||'',
      pokemon_sealed_type: item.pokemon_sealed_type||'',
      lego_set_name: item.lego_set_name||'',
      set_number: item.set_number||'',
      theme: item.theme||'',
      lego_condition: item.lego_condition||'',
      clothing_brand: item.clothing_brand||'',
      item: item.item||'',
      colour: item.colour||'',
      item_name: item.item_name||'',
      description: item.description||'',
      purchase_platform: item.purchase_platform||'',
      notes: item.notes||'',
      batch_total_cost: '',
      units: [{ ...EMPTY_UNIT }]
    })
    setEditItem(null)
    setSaveError('')
    setShowAdd(true)
  }

  async function deleteBatch(batchId) {
    if (!window.confirm('Delete all units in this batch?')) return
    await supabase.from('stock').delete().eq('batch_id', batchId)
    fetchItems(); setBatchModal(null)
  }

  async function markLongTerm(batch) {
    if (batch.units[0]?.batch_id) {
      await supabase.from('stock').update({ long_term: true }).eq('batch_id', batch.units[0].batch_id)
    } else {
      await supabase.from('stock').update({ long_term: true }).eq('id', batch.units[0].id)
    }
    fetchItems()
  }

  async function unmarkLongTerm(batch) {
    if (batch.units[0]?.batch_id) {
      await supabase.from('stock').update({ long_term: false }).eq('batch_id', batch.units[0].batch_id)
    } else {
      await supabase.from('stock').update({ long_term: false }).eq('id', batch.units[0].id)
    }
    fetchItems()
  }

  function resetSellModal() {
    setSellItem(null); setSalePrice(''); setSellingPlatform(''); setSellFeeplatform(null)
    setCustomFeeRate(''); setPayoutStatus('pending'); setShippingFee(''); setBuyerName('')
    setSoldDate(new Date().toISOString().slice(0, 10))
  }

  function handleEditSold(item) {
    setSalePrice(String(item.sale_price || ''))
    setShippingFee(String(item.shipping_fee || ''))
    setBuyerName(item.buyer_name || '')
    setPayoutStatus(item.payout_status || 'pending')
    setSoldDate(item.sold_at ? item.sold_at.slice(0, 10) : new Date().toISOString().slice(0, 10))
    const platform = RESELLER_PLATFORMS.find(p => p.name === item.selling_platform) || null
    setSellFeeplatform(platform)
    setSellingPlatform(item.selling_platform || '')
    setSellItem({ ...item, _editMode: true })
  }

  async function markSold() {
    setSaving(true)
    const feeAmt = calcFee(salePrice, sellFeeplatform, customFeeRate)
    const platformName = sellFeeplatform ? sellFeeplatform.name : sellingPlatform
    const shipAmt = parseFloat(shippingFee) || null
    const sold_at = new Date(soldDate + 'T12:00:00').toISOString()

    if (sellItem._editMode) {
      await supabase.from('stock').update({
        sale_price: parseFloat(salePrice), selling_platform: platformName,
        fee_amount: feeAmt || null, shipping_fee: shipAmt,
        payout_status: payoutStatus, buyer_name: buyerName || null, sold_at
      }).eq('id', sellItem.id)
      setSaving(false); resetSellModal(); fetchItems()
      return
    }

    const updatePayload = { status: 'sold', sale_price: parseFloat(salePrice), selling_platform: platformName, fee_amount: feeAmt || null, shipping_fee: shipAmt, payout_status: payoutStatus, buyer_name: buyerName || null, sold_at }
    if (sellItem._bulkIds) {
      const idsToSell = sellItem._bulkIds
      const perUnitFee = parseFloat((feeAmt / idsToSell.length).toFixed(2))
      const perUnitShip = shipAmt ? parseFloat((shipAmt / idsToSell.length).toFixed(2)) : null
      for (const id of idsToSell) {
        await supabase.from('stock').update({ ...updatePayload, fee_amount: perUnitFee || null, shipping_fee: perUnitShip }).eq('id', id)
      }
    } else {
      await supabase.from('stock').update(updatePayload).eq('id', sellItem.id)
    }
    const batchRef = sellItem.batch_id || sellItem.id
    setSaving(false); resetSellModal(); fetchItems()
    setClearedBatch(batchRef)
    setTimeout(() => setClearedBatch(null), 200)
    if (batchModal) {
      const ids = sellItem._bulkIds || [sellItem.id]
      const updated = batchModal.units.map(u => ids.includes(u.id) ? { ...u, status: 'sold', sale_price: parseFloat(salePrice), selling_platform: platformName, fee_amount: feeAmt } : u)
      setBatchModal({ ...batchModal, units: updated })
    }
  }

  function exportCSV() {
    const headers = ['Category','Brand','Style','Colourway','SKU','Size','Condition','Status','Purchase Date','Purchase Platform','Cost (£)','Target Price (£)','Sale Date','Sale Price (£)','Platform Fee (£)','Postage (£)','Net Proceeds (£)','Profit (£)','Payout Status','Notes']
    const rows = items.map(i => {
      const fee = i.fee_amount || 0
      const ship = i.shipping_fee || 0
      const net = i.status === 'sold' ? ((i.sale_price||0) - fee - ship) : ''
      const profit = i.status === 'sold' ? (Number(net) - (i.purchase_price||0)) : ''
      return [
        i.category||'', i.brand||'', i.style||'', i.colourway||'', i.sku||'',
        i.size||'', i.condition||i.item_condition||'', i.status||'',
        i.purchase_date||'', i.purchase_platform||'',
        i.purchase_price||'', i.target_price||'',
        i.sold_at ? new Date(i.sold_at).toLocaleDateString('en-GB') : '',
        i.sale_price||'', fee||'', ship||'',
        typeof net === 'number' ? net.toFixed(2) : '',
        typeof profit === 'number' ? profit.toFixed(2) : '',
        i.payout_status||'', i.notes||''
      ].map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')
    })
    const csv = [headers.join(','), ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `stocktrack-${new Date().toISOString().slice(0,10)}.csv`
    a.click(); URL.revokeObjectURL(url)
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

  const STALE_DAYS = 21

  const filteredBatches = useMemo(() => {
    const now = new Date()
    let result = batches.filter(b => {
      const q = search.toLowerCase()
      if (search && ![(b.brand||''),(b.style||''),(b.colourway||''),(b.sku||'')].some(v => v.toLowerCase().includes(q))) return false
      if (filterBrand && b.brand !== filterBrand) return false
      if (filterCategory && b.category !== filterCategory) return false
      if (filterStatus) {
        const inStock = b.units.some(u => u.status === 'in_stock')
        const allSold = b.units.every(u => u.status === 'sold')
        if (filterStatus === 'in_stock' && !inStock) return false
        if (filterStatus === 'sold' && !allSold) return false
        if (filterStatus === 'stale') {
          const hasStale = b.units.some(u => u.status==='in_stock' && !u.long_term && u.purchase_date && ((now - new Date(u.purchase_date)) / 86400000) > STALE_DAYS)
          if (!hasStale) return false
        }
        if (filterStatus === 'long_term') {
          if (!b.units.some(u => u.long_term)) return false
        }
      }
      return true
    })

    result.sort((a, b) => {
      if (sortBy === 'newest') return new Date(b.created_at) - new Date(a.created_at)
      if (sortBy === 'oldest') return new Date(a.created_at) - new Date(b.created_at)
      if (sortBy === 'brand') return (a.brand||'').localeCompare(b.brand||'')
      if (sortBy === 'cost_high') { const aC = a.units.reduce((s,u)=>s+(u.purchase_price||0),0); const bC = b.units.reduce((s,u)=>s+(u.purchase_price||0),0); return bC - aC }
      if (sortBy === 'cost_low') { const aC = a.units.reduce((s,u)=>s+(u.purchase_price||0),0); const bC = b.units.reduce((s,u)=>s+(u.purchase_price||0),0); return aC - bC }
      if (sortBy === 'stale') {
        const aDate = a.units[0]?.purchase_date ? new Date(a.units[0].purchase_date) : new Date()
        const bDate = b.units[0]?.purchase_date ? new Date(b.units[0].purchase_date) : new Date()
        return aDate - bDate
      }
      return 0
    })
    return result
  }, [batches, search, filterBrand, filterCategory, filterStatus, sortBy])

  const stats = useMemo(() => {
    const inStock = items.filter(i => i.status === 'in_stock')
    const sold = items.filter(i => i.status === 'sold')
    const stockValue = inStock.reduce((s, i) => s + (i.purchase_price || 0), 0)
    const revenue = sold.reduce((s, i) => s + (i.sale_price || 0), 0)
    const soldCost = sold.reduce((s, i) => s + (i.purchase_price || 0), 0)
    const soldFees = sold.reduce((s, i) => s + (i.fee_amount || 0) + (i.shipping_fee || 0), 0)
    const pl = revenue - soldCost - soldFees
    const now = new Date()
    const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const lastMonth = `${lastMonthDate.getFullYear()}-${String(lastMonthDate.getMonth() + 1).padStart(2, '0')}`
    const monthSold = sold.filter(i => getMonthKey(i.sold_at) === thisMonth)
    const lastMonthSold = sold.filter(i => getMonthKey(i.sold_at) === lastMonth)
    const monthPL = monthSold.reduce((s, i) => s + ((i.sale_price || 0) - (i.purchase_price || 0) - (i.fee_amount || 0) - (i.shipping_fee || 0)), 0)
    const lastMonthPL = lastMonthSold.reduce((s, i) => s + ((i.sale_price || 0) - (i.purchase_price || 0) - (i.fee_amount || 0) - (i.shipping_fee || 0)), 0)
    return { total: items.length, inStock: inStock.length, sold: sold.length, stockValue, revenue, pl, monthPL, lastMonthPL }
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

  const [expenses, setExpenses] = useState([])

  // Net home stats = stock P&L minus expenses (separate useMemo so expenses isn't used before it's defined)
  const netHomeStats = useMemo(() => {
    const now = new Date()
    const thisMonth = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`
    const lastMonthDate = new Date(now.getFullYear(), now.getMonth()-1, 1)
    const lastMonth = `${lastMonthDate.getFullYear()}-${String(lastMonthDate.getMonth()+1).padStart(2,'0')}`
    const totalExp = expenses.reduce((s,e)=>s+(e.amount||0),0)
    const monthExp = expenses.filter(e=>e.date&&e.date.slice(0,7)===thisMonth).reduce((s,e)=>s+(e.amount||0),0)
    const lastMonthExp = expenses.filter(e=>e.date&&e.date.slice(0,7)===lastMonth).reduce((s,e)=>s+(e.amount||0),0)
    return { pl: stats.pl - totalExp, monthPL: stats.monthPL - monthExp, lastMonthPL: stats.lastMonthPL - lastMonthExp }
  }, [stats, expenses])

  const plChartData = useMemo(() => getLast(chartMonths).map(({ key, label }) => {
    let pl = 0, revenue = 0, cost = 0
    if (metricsSources.reseller) {
      const sold = items.filter(i => i.status === 'sold' && getMonthKey(i.sold_at) === key)
      const soldPL = sold.reduce((s,i)=>s+((i.sale_price||0)-(i.purchase_price||0)-(i.fee_amount||0)-(i.shipping_fee||0)),0)
      const soldRev = sold.reduce((s,i)=>s+(i.sale_price||0),0)
      const soldCost = sold.reduce((s,i)=>s+(i.purchase_price||0),0)
      pl += soldPL; revenue += soldRev; cost += soldCost
    }
    if (metricsSources.breaker) {
      const bks = breaks.filter(b => b.status === 'completed' && (
        getMonthKey(b.break_date) === key ||
        getMonthKey(b.last_stream_date) === key ||
        getMonthKey(b.created_at) === key
      ))
      bks.forEach(b => {
        const brev = b.type==='break' ? (b.spots_sold||0)*(b.spot_price||0) : (b.packs_sold||0)*(b.pack_price||0)
        const bcost = b.cost || 0
        pl += brev - bcost; revenue += brev; cost += bcost
      })
    }
    const exp = expenses.filter(e => e.date && e.date.slice(0,7) === key).reduce((s,e) => s + (e.amount||0), 0)
    const netPL = parseFloat((pl - exp).toFixed(2))
    return { label, pl: parseFloat(pl.toFixed(2)), netPL, expenses: parseFloat(exp.toFixed(2)), revenue: parseFloat(revenue.toFixed(2)), cost: parseFloat(cost.toFixed(2)) }
  }), [items, breaks, expenses, chartMonths, metricsSources])

  const categoryData = useMemo(() => {
    const map = {}
    if (metricsSources.reseller) {
      items.forEach(i => { const cat = i.category||'Other'; if(!map[cat])map[cat]=0; map[cat]++ })
    }
    if (metricsSources.breaker) {
      breaks.forEach(b => {
        const cat = b.type==='break' ? 'Box Break' : 'Mystery Packs'
        if(!map[cat])map[cat]=0; map[cat]++
      })
    }
    return Object.entries(map).map(([name,value])=>({name,value}))
  }, [items, breaks, metricsSources])
  const brandData = useMemo(() => { const map = {}; items.filter(i=>i.status==='sold').forEach(i => { const b=i.brand||'Unknown'; if(!map[b])map[b]=0; map[b]+=(i.sale_price||0)-(i.purchase_price||0)-(i.fee_amount||0)-(i.shipping_fee||0) }); return Object.entries(map).map(([brand,pl])=>({brand,pl:parseFloat(pl.toFixed(2))})).sort((a,b)=>b.pl-a.pl).slice(0,8) }, [items])
  const avgPLData = useMemo(() => getLast(6).map(({ key, label }) => { const sold = items.filter(i=>i.status==='sold'&&getMonthKey(i.sold_at)===key); const avg = sold.length ? sold.reduce((s,i)=>s+((i.sale_price||0)-(i.purchase_price||0)-(i.fee_amount||0)-(i.shipping_fee||0)),0)/sold.length : 0; return { label, avg: parseFloat(avg.toFixed(2)) } }), [items])
  const sellThroughData = useMemo(() => { const map = {}; items.forEach(i => { const cat=i.category||'Other'; if(!map[cat])map[cat]={total:0,sold:0}; map[cat].total++; if(i.status==='sold')map[cat].sold++ }); return Object.entries(map).map(([cat,{total,sold}])=>({cat,rate:parseFloat(((sold/total)*100).toFixed(1))})) }, [items])
  const bestWorst = useMemo(() => { const sold = items.filter(i=>i.status==='sold'&&i.sale_price!=null).map(i=>({...i,pl:(i.sale_price||0)-(i.purchase_price||0)-(i.fee_amount||0)-(i.shipping_fee||0)})).sort((a,b)=>b.pl-a.pl); return { best: sold.slice(0,5), worst: sold.slice(-5).reverse() } }, [items])

  const platformData = useMemo(() => {
    const map = {}
    items.filter(i => i.status === 'sold').forEach(i => {
      const p = i.selling_platform || 'Unknown'
      if (!map[p]) map[p] = { platform: p, pl: 0, count: 0 }
      map[p].pl += (i.sale_price||0) - (i.purchase_price||0) - (i.fee_amount||0) - (i.shipping_fee||0)
      map[p].count++
    })
    return Object.values(map).sort((a, b) => b.pl - a.pl).map(d => ({ ...d, pl: parseFloat(d.pl.toFixed(2)) }))
  }, [items])

  const topBuyers = useMemo(() => {
    const map = {}
    items.filter(i => i.status === 'sold' && i.buyer_name).forEach(i => {
      const b = i.buyer_name
      if (!map[b]) map[b] = { name: b, count: 0, spend: 0 }
      map[b].count++
      map[b].spend += i.sale_price || 0
    })
    return Object.values(map).sort((a, b) => b.count - a.count).slice(0, 10).map(d => ({ ...d, spend: parseFloat(d.spend.toFixed(2)) }))
  }, [items])

  const username = session?.user?.email?.split('@')[0] || 'there'

  // Break cards state
  const [breakCards, setBreakCards] = useState([])
  const [viewingBreak, setViewingBreak] = useState(null)
  const [cardForm, setCardForm] = useState({ item: '', tier: 'Floor', cost: '' })

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

  async function fetchBreakSpots(breakId) {
    const { data } = await supabase.from('break_spots').select('*').eq('break_id', breakId).order('spot_number', { ascending: true })
    setBreakSpots(data || [])
  }

  async function saveSpot() {
    if (!slotsBreak || !spotForm.buyer_name.trim()) return
    setSpotsSaving(true)
    const nextNum = breakSpots.length > 0 ? Math.max(...breakSpots.map(s => s.spot_number || 0)) + 1 : 1
    await supabase.from('break_spots').insert([{
      break_id: slotsBreak.id, user_id: session.user.id, spot_number: nextNum,
      buyer_name: spotForm.buyer_name.trim(), notes: spotForm.notes || null, paid: false
    }])
    setSpotsSaving(false)
    setSpotForm({ buyer_name: '', notes: '' })
    fetchBreakSpots(slotsBreak.id)
  }

  async function toggleSpotPaid(spot) {
    await supabase.from('break_spots').update({ paid: !spot.paid }).eq('id', spot.id)
    fetchBreakSpots(slotsBreak.id)
  }

  async function deleteSpot(id) {
    await supabase.from('break_spots').delete().eq('id', id)
    fetchBreakSpots(slotsBreak.id)
  }

  function addToOrder(item) {
    if (orderCart.some(e => e.item.id === item.id)) return
    const batchUnits = item.batch_id
      ? items.filter(i => i.batch_id === item.batch_id && i.size === (item.size||'') && i.status === 'in_stock')
      : items.filter(i => i.id === item.id && i.status === 'in_stock')
    const maxQty = Math.max(batchUnits.length, 1)
    const cartId = `${item.id}-${Date.now()}`
    setOrderCart(c => [...c, { cartId, item, qty: 1, unitPrice: '', maxQty, unitIds: batchUnits.map(u => u.id) }])
  }

  function removeFromOrder(cartId) { setOrderCart(c => c.filter(e => e.cartId !== cartId)) }
  function updateOrderPrice(cartId, price) { setOrderCart(c => c.map(e => e.cartId === cartId ? { ...e, unitPrice: price } : e)) }
  function updateOrderQty(cartId, qty) { setOrderCart(c => c.map(e => e.cartId === cartId ? { ...e, qty: Math.min(Math.max(parseInt(qty)||1, 1), e.maxQty) } : e)) }

  async function confirmOrder() {
    setSaving(true)
    const now = new Date().toISOString()
    const platformName = orderPlatform ? orderPlatform.name : ''
    for (const entry of orderCart) {
      const price = parseFloat(entry.unitPrice) || 0
      const feeAmt = calcFee(entry.unitPrice, orderPlatform, orderCustomRate)
      const payload = {
        status: 'sold', sale_price: price, selling_platform: platformName || null,
        fee_amount: feeAmt || null, payout_status: orderPayoutStatus,
        buyer_name: orderBuyerName || null, sold_at: now
      }
      const toSell = entry.unitIds.slice(0, entry.qty)
      for (const id of toSell) {
        await supabase.from('stock').update(payload).eq('id', id)
      }
    }
    setSaving(false)
    setOrderCart([]); setShowOrderModal(false)
    setOrderPlatform(null); setOrderCustomRate('')
    setOrderBuyerName(''); setOrderPayoutStatus('pending')
    fetchItems()
  }

  function downloadCSVTemplate() {
    const headers = 'Category,Brand,Style,Colourway,SKU,Size,Purchase Date,Purchase Platform,Total Cost (£),Notes'
    const example = 'Sneakers,Nike,Air Max 95,Pure Money,308497-100,9,2024-01-15,SNKRS,120,Great condition'
    const blob = new Blob([headers + '\n' + example], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'stocktrack-import-template.csv'; a.click(); URL.revokeObjectURL(url)
  }

  function parseCsvImport(file) {
    setCsvError(''); setCsvRows(null)
    const reader = new FileReader()
    reader.onload = e => {
      try {
        const lines = e.target.result.split('\n').map(l => l.trim()).filter(Boolean)
        if (lines.length < 2) { setCsvError('File appears empty'); return }
        const headers = lines[0].split(',').map(h => h.replace(/^"|"$/g,'').trim().toLowerCase())
        const rows = lines.slice(1).map((line, idx) => {
          const vals = line.match(/(".*?"|[^,]+|(?<=,)(?=,)|(?<=,)$|^(?=,))/g) || []
          const clean = vals.map(v => v.replace(/^"|"$/g,'').trim())
          const row = {}
          headers.forEach((h, i) => { row[h] = clean[i] || '' })
          row._idx = idx + 2 // row number for error reporting
          return row
        }).filter(r => r['category'] || r['brand'])
        if (rows.length === 0) { setCsvError('No valid data rows found'); return }
        setCsvRows(rows)
      } catch { setCsvError('Could not parse CSV file') }
    }
    reader.readAsText(file)
  }

  async function importCSVRows() {
    if (!csvRows || csvRows.length === 0) return
    setCsvImporting(true); setCsvError('')
    const toInsert = csvRows.map(r => {
      const cat = r['category'] || 'Miscellaneous'
      const brand = r['brand'] || r['item name'] || ''
      const style = r['style'] || ''
      const colourway = r['colourway'] || ''
      const sku = r['sku'] || ''
      const size = r['size'] || ''
      const cost = parseFloat(r['total cost (£)'] || r['cost'] || r['unit cost (£)'] || '0') || 0
      return {
        category: cat, brand, style, colourway, sku, size: size || null,
        purchase_date: r['purchase date'] || null,
        purchase_platform: r['purchase platform'] || null,
        notes: r['notes'] || null,
        purchase_price: cost, batch_id: crypto.randomUUID(),
        user_id: session.user.id, status: 'in_stock', item_condition: 'Brand New'
      }
    })
    const { error } = await supabase.from('stock').insert(toInsert)
    setCsvImporting(false)
    if (error) { setCsvError(error.message); return }
    setCsvRows(null); fetchItems()
  }

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

  async function markPayoutPaid(ids) {
    for (const id of ids) {
      await supabase.from('stock').update({ payout_status: 'paid' }).eq('id', id)
    }
    fetchItems()
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

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [darkMode, setDarkMode] = useState(() => { try { return localStorage.getItem('stocktrack_dark') === 'true' } catch { return false } })
  const GOAL_KEY = 'stocktrack_goal'
  const [monthlyGoal, setMonthlyGoal] = useState(() => { try { return parseFloat(localStorage.getItem('stocktrack_goal') || '0') } catch { return 0 } })
  const [editingGoal, setEditingGoal] = useState(false)
  const [goalInput, setGoalInput] = useState('')
  const [buyerName, setBuyerName] = useState('')
  const [vatRegistered, setVatRegistered] = useState(false)
  const [vatNumber, setVatNumber] = useState('')
  const [breakSpots, setBreakSpots] = useState([])
  const [slotsBreak, setSlotsBreak] = useState(null)
  const [spotForm, setSpotForm] = useState({ buyer_name: '', notes: '' })
  const [spotsSaving, setSpotsSaving] = useState(false)
  const [csvRows, setCsvRows] = useState(null)
  const [csvImporting, setCsvImporting] = useState(false)
  const [csvError, setCsvError] = useState('')
  const [orderCart, setOrderCart] = useState([])
  const [showOrderModal, setShowOrderModal] = useState(false)
  const [orderPlatform, setOrderPlatform] = useState(null)
  const [orderCustomRate, setOrderCustomRate] = useState('')
  const [orderBuyerName, setOrderBuyerName] = useState('')
  const [orderPayoutStatus, setOrderPayoutStatus] = useState('pending')
  const [toolTab, setToolTab] = useState('fee')
  const [metricsTab, setMetricsTab] = useState('reseller')
  const currentTaxYear = (()=>{ const n=new Date(); return n.getMonth()>=3?n.getFullYear():n.getFullYear()-1 })()

  const INV_BIZ_KEY = 'stocktrack_biz'
  const INV_NUM_KEY = 'stocktrack_inv_num'
  const INV_SAVED_KEY = 'stocktrack_invoices'
  const blankBiz = { name: '', address: '', email: '', phone: '', vatNumber: '' }
  const [invBiz, setInvBiz] = useState(()=>{ try { return JSON.parse(localStorage.getItem(INV_BIZ_KEY)||'{}') } catch { return {} } })
  const [invCustomer, setInvCustomer] = useState({ name: '', address: '', email: '' })
  const [invLines, setInvLines] = useState([{ description: '', qty: '1', unitPrice: '' }])
  const [invNotes, setInvNotes] = useState('')
  const [invNumber, setInvNumber] = useState(()=>{ const n=parseInt(localStorage.getItem(INV_NUM_KEY)||'0')+1; return String(n).padStart(4,'0') })
  const [invDate, setInvDate] = useState(new Date().toISOString().slice(0,10))
  const [invDueDate, setInvDueDate] = useState('')
  const [editingBiz, setEditingBiz] = useState(false)
  const [savedInvoices, setSavedInvoices] = useState(()=>{ try { return JSON.parse(localStorage.getItem(INV_SAVED_KEY)||'[]') } catch { return [] } })

  function saveBizDetails() { localStorage.setItem(INV_BIZ_KEY, JSON.stringify(invBiz)); setEditingBiz(false) }

  function saveInvoice() {
    const bizDetails = {...blankBiz,...invBiz}
    const invTotal = invLines.reduce((s,l)=>s+(parseFloat(l.qty)||0)*(parseFloat(l.unitPrice)||0),0)
    const inv = { id: Date.now().toString(), number: invNumber, date: invDate, dueDate: invDueDate, customerName: invCustomer.name, total: invTotal, snapshot: { invNumber, invDate, invDueDate, invCustomer, invLines, invNotes, bizDetails } }
    const updated = [inv, ...savedInvoices]
    setSavedInvoices(updated)
    try { localStorage.setItem(INV_SAVED_KEY, JSON.stringify(updated)) } catch {}
    const next = parseInt(invNumber||'0')+1
    localStorage.setItem(INV_NUM_KEY, String(parseInt(invNumber||'0')))
    setInvNumber(String(next).padStart(4,'0'))
  }

  function deleteSavedInvoice(id) {
    const updated = savedInvoices.filter(i=>i.id!==id)
    setSavedInvoices(updated)
    try { localStorage.setItem(INV_SAVED_KEY, JSON.stringify(updated)) } catch {}
  }

  function printSavedInvoice(snap) {
    const { invNumber: n, invDate: d, invDueDate: dd, invCustomer: c, invLines: lines, invNotes: notes, bizDetails: biz } = snap
    const total = lines.reduce((s,l)=>s+(parseFloat(l.qty)||0)*(parseFloat(l.unitPrice)||0),0)
    openInvoicePrint(n, d, dd, c, lines, notes, biz, total, false)
  }

  function openInvoicePrint(n, d, dd, c, lines, notes, biz, total, autoPrint) {
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Invoice #${n}</title><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#1a2332;padding:40px;max-width:800px;margin:0 auto}.header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:48px}.invoice-label{font-size:36px;font-weight:800;color:#16a34a;margin-bottom:12px}.biz-name{font-size:16px;font-weight:600;margin-bottom:6px}.biz-detail{font-size:13px;color:#666;line-height:1.7}.meta{text-align:right}.meta-row{display:flex;justify-content:flex-end;gap:16px;font-size:13px;margin-bottom:6px}.meta-label{color:#888}.meta-value{font-weight:600;min-width:90px;text-align:right}.bill-to{margin-bottom:32px}.section-label{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#999;margin-bottom:8px}.bill-name{font-size:15px;font-weight:600;margin-bottom:4px}.bill-detail{font-size:13px;color:#555;line-height:1.6}table{width:100%;border-collapse:collapse;margin-bottom:24px}th{text-align:left;padding:10px 0;border-bottom:2px solid #e2e8f0;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#888}.right{text-align:right}td{padding:12px 0;border-bottom:1px solid #f0f4f8;font-size:14px}.total-row td{border-bottom:none;border-top:2px solid #1a2332;font-weight:700;font-size:16px;padding-top:16px}.notes{margin-top:32px;padding-top:24px;border-top:1px solid #e2e8f0}.notes p{font-size:13px;color:#555;line-height:1.7;white-space:pre-wrap}@media print{body{padding:20px}}</style></head><body><div class="header"><div><div class="invoice-label">INVOICE</div>${biz.name?`<div class="biz-name">${biz.name}</div>`:''}<div class="biz-detail">${[biz.address,biz.email,biz.phone,biz.vatNumber?`VAT: ${biz.vatNumber}`:''].filter(Boolean).join('<br>')}</div></div><div class="meta"><div class="meta-row"><span class="meta-label">Invoice #</span><span class="meta-value">${n}</span></div><div class="meta-row"><span class="meta-label">Date</span><span class="meta-value">${d}</span></div>${dd?`<div class="meta-row"><span class="meta-label">Due</span><span class="meta-value">${dd}</span></div>`:''}</div></div>${c.name||c.address?`<div class="bill-to"><div class="section-label">Bill to</div>${c.name?`<div class="bill-name">${c.name}</div>`:''}<div class="bill-detail">${[c.address,c.email].filter(Boolean).join('<br>')}</div></div>`:''}<table><thead><tr><th>Description</th><th class="right" style="width:60px">Qty</th><th class="right" style="width:100px">Unit price</th><th class="right" style="width:100px">Total</th></tr></thead><tbody>${lines.filter(l=>l.description||l.unitPrice).map(l=>`<tr><td>${l.description||''}</td><td class="right">${l.qty||1}</td><td class="right">£${parseFloat(l.unitPrice||0).toFixed(2)}</td><td class="right">£${((parseFloat(l.qty)||0)*(parseFloat(l.unitPrice)||0)).toFixed(2)}</td></tr>`).join('')}<tr class="total-row"><td colspan="3" class="right">Total</td><td class="right">£${total.toFixed(2)}</td></tr></tbody></table>${notes?`<div class="notes"><div class="section-label">Notes</div><p>${notes.replace(/\n/g,'<br>')}</p></div>`:''}</body></html>`
    const win = window.open('','_blank','width=900,height=700')
    win.document.write(html); win.document.close(); win.focus()
    if (autoPrint) setTimeout(()=>win.print(), 400)
  }
  function addInvLine() { setInvLines(l=>[...l,{description:'',qty:'1',unitPrice:''}]) }
  function removeInvLine(i) { setInvLines(l=>l.filter((_,idx)=>idx!==i)) }
  function updateInvLine(i,field,value) { setInvLines(l=>{const n=[...l];n[i]={...n[i],[field]:value};return n}) }
  function previewInvoice() {
    const bizDetails = {...blankBiz,...invBiz}
    const invTotal = invLines.reduce((s,l)=>s+(parseFloat(l.qty)||0)*(parseFloat(l.unitPrice)||0),0)
    openInvoicePrint(invNumber, invDate, invDueDate, invCustomer, invLines, invNotes, bizDetails, invTotal, false)
  }

  function printInvoice() {
    const bizDetails = {...blankBiz,...invBiz}
    const invTotal = invLines.reduce((s,l)=>s+(parseFloat(l.qty)||0)*(parseFloat(l.unitPrice)||0),0)
    openInvoicePrint(invNumber, invDate, invDueDate, invCustomer, invLines, invNotes, bizDetails, invTotal, true)
  }

  const TAX_UTR_KEY = 'stocktrack_utr'
  const [taxUTR, setTaxUTR] = useState(()=>{ try { return localStorage.getItem(TAX_UTR_KEY)||'' } catch { return '' } })

  const [skuQuery, setSkuQuery] = useState('')
  const [skuResults, setSkuResults] = useState(null)
  const [skuLoading, setSkuLoading] = useState(false)
  const [skuError, setSkuError] = useState('')

  async function lookupSKU() {
    if (!skuQuery.trim()) return
    setSkuLoading(true); setSkuError(''); setSkuResults(null)
    try {
      const res = await fetch(`/api/sku-lookup?q=${encodeURIComponent(skuQuery)}`)
      if (!res.ok) throw new Error('API error')
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setSkuResults(data.results || [])
    } catch {
      setSkuResults([])
      setSkuError('Live lookup unavailable — use the platform links below to search manually')
    }
    setSkuLoading(false)
  }
  const [selectedTaxYear, setSelectedTaxYear] = useState(currentTaxYear)

  function switchToolTab(tab) { setToolTab(tab); setTimeout(()=>window.scrollTo({top:0,behavior:'instant'}),50) }
  const [userPlan, setUserPlan] = useState('pro') // default pro until Stripe is set up
  const FREE_LIMIT = 30

  const EXPENSE_CATEGORIES = ['Packaging', 'Shipping Supplies', 'Equipment', 'Platform Subscriptions', 'Advertising', 'Software', 'Travel', 'Professional Services', 'Other']
  const [expensesLoading, setExpensesLoading] = useState(false)
  const [showExpenseForm, setShowExpenseForm] = useState(false)
  const [expenseForm, setExpenseForm] = useState({ date: '', amount: '', category: 'Packaging', description: '' })
  const [expenseSaving, setExpenseSaving] = useState(false)

  useEffect(() => { if (session && page === 'expenses') fetchExpenses() }, [page, session]) // eslint-disable-line react-hooks/exhaustive-deps

  async function fetchExpenses() {
    setExpensesLoading(true)
    const { data } = await supabase.from('expenses').select('*').order('date', { ascending: false })
    setExpenses(data || [])
    setExpensesLoading(false)
  }

  async function saveExpense() {
    setExpenseSaving(true)
    const { error } = await supabase.from('expenses').insert([{ user_id: session.user.id, date: expenseForm.date, amount: parseFloat(expenseForm.amount), category: expenseForm.category, description: expenseForm.description || null }])
    if (!error) { setShowExpenseForm(false); setExpenseForm({ date: '', amount: '', category: 'Packaging', description: '' }); fetchExpenses() }
    setExpenseSaving(false)
  }

  async function deleteExpense(id) {
    if (!window.confirm('Delete this expense?')) return
    await supabase.from('expenses').delete().eq('id', id)
    fetchExpenses()
  }

  useEffect(() => { if (session) fetchProfile() }, [session]) // eslint-disable-line react-hooks/exhaustive-deps
  async function fetchProfile() {
    const { data } = await supabase.from('profiles').select('plan, vat_registered, vat_number').eq('id', session.user.id).single()
    if (data) {
      setUserPlan(data.plan || 'free')
      setVatRegistered(!!data.vat_registered)
      setVatNumber(data.vat_number || '')
    }
  }

  async function saveVATSettings() {
    await supabase.from('profiles').update({ vat_registered: vatRegistered, vat_number: vatNumber || null }).eq('id', session.user.id)
  }

  // Collector state
  const [collectorItems, setCollectorItems] = useState([])
  const [collectorLoading, setCollectorLoading] = useState(false)
  const [showCollectorAdd, setShowCollectorAdd] = useState(false)
  const [editCollectorItem, setEditCollectorItem] = useState(null)
  const [collectorForm, setCollectorForm] = useState({ ...EMPTY_FORM })
  const [collectorSaving, setCollectorSaving] = useState(false)
  const [collectorError, setCollectorError] = useState('')

  useEffect(() => { if (session) fetchCollector() }, [session]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (session && page === 'collector') fetchCollector() }, [page, session]) // eslint-disable-line react-hooks/exhaustive-deps

  async function fetchCollector() {
    setCollectorLoading(true)
    const { data } = await supabase.from('collector').select('*').order('created_at', { ascending: false })
    setCollectorItems(data || [])
    setCollectorLoading(false)
  }

  async function saveCollectorItem() {
    if (userPlan === 'free' && !editCollectorItem && collectorItems.length >= FREE_LIMIT) return
    setCollectorSaving(true); setCollectorError('')
    const batchId = editCollectorItem?.batch_id || crypto.randomUUID()
    let brand = '', style = '', colourway = '', sku = ''
    if (collectorForm.category === 'Sneakers') { brand = collectorForm.brand; style = collectorForm.style; colourway = collectorForm.colourway; sku = collectorForm.sku }
    else if (collectorForm.category === 'Pokémon') { brand = 'Pokémon'; style = collectorForm.pokemon_type === 'singles' ? collectorForm.card_name : collectorForm.product_name; colourway = collectorForm.set_name; sku = collectorForm.card_number }
    else if (collectorForm.category === 'Topps') { brand = 'Topps'; style = collectorForm.topps_type === 'singles' ? collectorForm.topps_card_name : collectorForm.topps_product_name; colourway = collectorForm.topps_set; sku = collectorForm.topps_card_number }
    else if (collectorForm.category === 'Lego') { brand = 'Lego'; style = collectorForm.lego_set_name; colourway = collectorForm.theme; sku = collectorForm.set_number }
    else if (collectorForm.category === 'Clothing') { brand = collectorForm.clothing_brand; style = collectorForm.item; colourway = collectorForm.colour }
    else if (collectorForm.category === 'Miscellaneous') { brand = collectorForm.item_name; style = collectorForm.description }
    const base = {
      category: collectorForm.category, brand, style, colourway, sku,
      item_condition: collectorForm.item_condition || 'Brand New',
      condition: collectorForm.condition || null,
      purchase_price: parseFloat(collectorForm.batch_total_cost) || 0,
      purchase_platform: collectorForm.purchase_platform, purchase_date: collectorForm.purchase_date || null, notes: collectorForm.notes,
      pokemon_type: collectorForm.pokemon_type || null, card_name: collectorForm.card_name || null, set_name: collectorForm.set_name || null,
      card_number: collectorForm.card_number || null, graded: collectorForm.graded || false,
      grading_company: collectorForm.grading_company || null, grade: collectorForm.grade || null,
      product_name: collectorForm.product_name || null, pokemon_sealed_type: collectorForm.pokemon_sealed_type || null,
      topps_type: collectorForm.topps_type || null, topps_card_name: collectorForm.topps_card_name || null,
      topps_set: collectorForm.topps_set || null, topps_year: collectorForm.topps_year || null,
      topps_card_number: collectorForm.topps_card_number || null, topps_parallel: collectorForm.topps_parallel || null,
      topps_print_run: collectorForm.topps_print_run || null, topps_sealed_type: collectorForm.topps_sealed_type || null,
      topps_product_name: collectorForm.topps_product_name || null,
      lego_set_name: collectorForm.lego_set_name || null, set_number: collectorForm.set_number || null,
      theme: collectorForm.theme || null, lego_condition: collectorForm.lego_condition || null,
      clothing_brand: collectorForm.clothing_brand || null, item: collectorForm.item || null, colour: collectorForm.colour || null,
      item_name: collectorForm.item_name || null, description: collectorForm.description || null,
      batch_id: batchId, user_id: session.user.id
    }
    let error
    if (editCollectorItem) {
      ;({ error } = await supabase.from('collector').update({ ...base, size: collectorForm.units[0]?.size || '' }).eq('id', editCollectorItem.id))
    } else {
      const totalUnits = collectorForm.units.reduce((s, u) => { const q = u.quantity === '10+' ? (parseInt(u.custom_qty)||1) : (parseInt(u.quantity)||1); return s + q }, 0)
      const batchCost = parseFloat(collectorForm.batch_total_cost) || 0
      const rows = collectorForm.units.flatMap(u => {
        const qty = u.quantity === '10+' ? (parseInt(u.custom_qty)||1) : (parseInt(u.quantity)||1)
        const pricePerUnit = batchCost > 0 && totalUnits > 0 ? parseFloat((batchCost/totalUnits).toFixed(2)) : 0
        return Array.from({ length: qty }, () => ({ ...base, size: u.size, purchase_price: pricePerUnit }))
      })
      ;({ error } = await supabase.from('collector').insert(rows))
    }
    setCollectorSaving(false)
    if (error) { setCollectorError(error.message); return }
    setShowCollectorAdd(false); setEditCollectorItem(null); setCollectorForm({ ...EMPTY_FORM }); fetchCollector()
  }

  async function deleteCollectorItem(id) {
    if (!window.confirm('Delete this item?')) return
    await supabase.from('collector').delete().eq('id', id)
    fetchCollector()
  }

  function openEditCollector(item) {
    setCollectorForm({ ...EMPTY_FORM, category: item.category||'', pokemon_type: item.pokemon_type||'', item_condition: item.item_condition||'Brand New', brand: item.brand||'', style: item.style||'', colourway: item.colourway||'', sku: item.sku||'', card_name: item.card_name||'', set_name: item.set_name||'', card_number: item.card_number||'', condition: item.condition||'', graded: item.graded||false, grading_company: item.grading_company||'', grade: item.grade||'', product_name: item.product_name||'', pokemon_sealed_type: item.pokemon_sealed_type||'', topps_type: item.topps_type||'', topps_card_name: item.topps_card_name||'', topps_set: item.topps_set||'', topps_year: item.topps_year||'', topps_card_number: item.topps_card_number||'', topps_parallel: item.topps_parallel||'', topps_print_run: item.topps_print_run||'', topps_sealed_type: item.topps_sealed_type||'', topps_product_name: item.topps_product_name||'', lego_set_name: item.lego_set_name||'', set_number: item.set_number||'', theme: item.theme||'', lego_condition: item.lego_condition||'', clothing_brand: item.clothing_brand||'', item: item.item||'', colour: item.colour||'', item_name: item.item_name||'', description: item.description||'', purchase_platform: item.purchase_platform||'', purchase_date: item.purchase_date||'', notes: item.notes||'', batch_total_cost: item.purchase_price||'', units: [{ size: item.size||'', purchase_price: item.purchase_price||'', quantity: '1', custom_qty: '' }] })
    setEditCollectorItem(item); setShowCollectorAdd(true)
  }

  const collectorStats = useMemo(() => {
    const totalValue = collectorItems.reduce((s, i) => s + (i.purchase_price||0), 0)
    const byCategory = {}
    collectorItems.forEach(i => { const c = i.category||'Other'; if(!byCategory[c])byCategory[c]={count:0,value:0}; byCategory[c].count++; byCategory[c].value+=(i.purchase_price||0) })
    const categoryChartData = Object.entries(byCategory).map(([name,{count,value}])=>({name,value:count,totalValue:parseFloat(value.toFixed(2))}))
    const topItems = [...collectorItems].sort((a,b)=>(b.purchase_price||0)-(a.purchase_price||0)).slice(0,5)
    const growthData = getLast(6).map(({key,label})=>({label,count:collectorItems.filter(i=>getMonthKey(i.purchase_date)===key).length}))
    const avgValue = collectorItems.length ? totalValue / collectorItems.length : 0
    return { totalValue, byCategory, categoryChartData, topItems, growthData, total: collectorItems.length, avgValue }
  }, [collectorItems])
  const NAV_ITEMS = [{id:'home',label:'Home'},{id:'stock',label:'Reseller'},{id:'breaks',label:'Breaker'},{id:'collector',label:'Collector'},{id:'metrics',label:'Metrics'},{id:'expenses',label:'Expenses'},{id:'tools',label:'Tools'}]

  return (
    <div className={darkMode ? 'app dark-mode' : 'app'}>
      <div className="topbar">
        <div className="topbar-brand"><span className="brand-mark" />StockTrack</div>
        <nav className="topbar-nav">
          {NAV_ITEMS.map(n=>(
            <button key={n.id} className={`nav-btn ${page===n.id?'active':''}`} onClick={()=>{setPage(n.id);window.scrollTo(0,0)}}>{n.label}</button>
          ))}
        </nav>
        <div style={{position:'relative'}}>
          <div className="topbar-actions">
            {page==='stock'&&<button className="btn primary" onClick={()=>{setForm(EMPTY_FORM);setEditItem(null);setSaveError('');setShowAdd(true)}}>+ Add item</button>}
            {page==='breaks'&&<button className="btn primary" onClick={()=>{setBreakForm(EMPTY_BREAK);setEditBreak(null);setShowBreakForm(true)}}>+ Add break</button>}
            {page==='collector'&&<button className="btn primary" onClick={()=>{setCollectorForm({...EMPTY_FORM});setEditCollectorItem(null);setCollectorError('');setShowCollectorAdd(true)}} disabled={userPlan==='free'&&collectorItems.length>=FREE_LIMIT}>+ Add item</button>}
            <div className="user-pill">
              <a href="/" className="landing-nav-link" style={{fontSize:12}}>← Site</a>
              <span className="user-email">{session.user.email}</span>
              <button className="btn sm" onClick={()=>{ const nd=!darkMode; setDarkMode(nd); try { localStorage.setItem('stocktrack_dark', nd ? 'true' : 'false') } catch {} }} title="Toggle dark mode">{darkMode ? '☀️' : '🌙'}</button>
              <button className="btn sm" onClick={signOut}>Sign out</button>
            </div>
            <button className="mobile-menu-btn" onClick={()=>setMobileMenuOpen(o=>!o)}>
              {mobileMenuOpen ? '✕' : '☰'}
            </button>
          </div>
          {mobileMenuOpen && (
            <div className="mobile-menu">
              {NAV_ITEMS.map(n=>(
                <button key={n.id} className={`mobile-menu-item ${page===n.id?'active':''}`} onClick={()=>{setPage(n.id);setMobileMenuOpen(false);window.scrollTo(0,0)}}>
                  {n.label}
                </button>
              ))}
              <div className="mobile-menu-divider"/>
              <a href="/" className="mobile-menu-item">← Back to site</a>
              <button className="mobile-menu-item danger" onClick={signOut}>Sign out</button>
            </div>
          )}
        </div>
      </div>

      <div className="main">
        {page==='home'&&(
          <div>
            <div className="page-header"><h1 className="page-title">Welcome back, {username} 👋</h1><p className="page-subtitle">Here's how your stock is performing</p></div>
            <div className="stats-bar">
              <div className="stat-card"><div className="stat-label">Units in stock</div><div className="stat-value amber">{stats.inStock}</div></div>
              <div className="stat-card"><div className="stat-label">Stock value</div><div className="stat-value">{fmt(stats.stockValue)}</div></div>
              <div className="stat-card"><div className="stat-label">This month's profit</div><div className={`stat-value ${netHomeStats.monthPL>0?'pos':netHomeStats.monthPL<0?'neg':''}`}>{netHomeStats.monthPL>=0?'+':''}{fmt(netHomeStats.monthPL)}</div>{(()=>{if(netHomeStats.lastMonthPL===0&&netHomeStats.monthPL===0)return null;if(netHomeStats.lastMonthPL===0)return<div style={{fontSize:11,color:'var(--green)',marginTop:2}}>↑ First sales this month</div>;const pct=Math.abs(((netHomeStats.monthPL-netHomeStats.lastMonthPL)/Math.abs(netHomeStats.lastMonthPL))*100).toFixed(0);const up=netHomeStats.monthPL>=netHomeStats.lastMonthPL;return<div style={{fontSize:11,color:up?'var(--green)':'var(--red)',marginTop:2}}>{up?'↑':'↓'} {pct}% vs last month</div>})()}</div>
              <div className="stat-card"><div className="stat-label">All-time P&L</div><div className={`stat-value ${netHomeStats.pl>0?'pos':netHomeStats.pl<0?'neg':''}`}>{netHomeStats.pl>=0?'+':''}{fmt(netHomeStats.pl)}</div></div>
              <div className="stat-card"><div className="stat-label">Total sold</div><div className="stat-value">{stats.sold}</div></div>
            </div>
            {/* Monthly goal progress */}
            <div className="goal-bar-wrap">
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:8}}>
                <div>
                  <div style={{fontSize:11,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.06em',color:'var(--muted)',marginBottom:4}}>Monthly Profit Goal</div>
                  {editingGoal ? (
                    <div style={{display:'flex',gap:8,alignItems:'center'}}>
                      <span style={{color:'var(--muted)',fontSize:14}}>£</span>
                      <input className="form-input" style={{margin:0,width:120}} type="number" step="10" min="0" placeholder="e.g. 500" value={goalInput} onChange={e=>setGoalInput(e.target.value)} autoFocus onKeyDown={e=>{if(e.key==='Enter'){const g=parseFloat(goalInput)||0;setMonthlyGoal(g);try{localStorage.setItem(GOAL_KEY,String(g))}catch{};setEditingGoal(false)}if(e.key==='Escape')setEditingGoal(false)}}/>
                      <button className="btn primary sm" onClick={()=>{const g=parseFloat(goalInput)||0;setMonthlyGoal(g);try{localStorage.setItem(GOAL_KEY,String(g))}catch{};setEditingGoal(false)}}>Save</button>
                      <button className="btn sm" onClick={()=>setEditingGoal(false)}>Cancel</button>
                    </div>
                  ) : (
                    <div style={{display:'flex',alignItems:'center',gap:10}}>
                      <span style={{fontSize:20,fontWeight:700,color:'var(--text)'}}>{monthlyGoal > 0 ? `£${monthlyGoal.toFixed(0)}` : 'No goal set'}</span>
                      <button className="btn sm" onClick={()=>{setGoalInput(monthlyGoal > 0 ? String(monthlyGoal) : '');setEditingGoal(true)}}>{monthlyGoal > 0 ? 'Edit' : '+ Set goal'}</button>
                    </div>
                  )}
                </div>
                {monthlyGoal > 0 && (
                  <div style={{textAlign:'right'}}>
                    <div style={{fontSize:22,fontWeight:700,color:netHomeStats.monthPL>=monthlyGoal?'var(--green)':netHomeStats.monthPL<0?'var(--red)':'var(--text)'}}>{fmt(netHomeStats.monthPL)}</div>
                    <div style={{fontSize:12,color:'var(--muted)'}}>{Math.min(100,Math.max(0,(netHomeStats.monthPL/monthlyGoal*100))).toFixed(0)}% of goal</div>
                  </div>
                )}
              </div>
              {monthlyGoal > 0 && (
                <div className="goal-bar-track">
                  <div className="goal-bar-fill" style={{
                    width: `${Math.min(100, Math.max(0, (netHomeStats.monthPL / monthlyGoal) * 100)).toFixed(1)}%`,
                    background: netHomeStats.monthPL >= monthlyGoal ? 'var(--green)' : netHomeStats.monthPL < 0 ? 'var(--red)' : 'var(--accent)'
                  }}/>
                </div>
              )}
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
            <div style={{display:'flex',gap:8,marginBottom:16}}>
              <button className={`type-btn ${stockTab==='inventory'?'active':''}`} onClick={()=>setStockTab('inventory')}>
                Inventory <span style={{marginLeft:4,background:'var(--border)',borderRadius:10,padding:'1px 6px',fontSize:11}}>{stats.inStock}</span>
              </button>
              <button className={`type-btn ${stockTab==='history'?'active':''}`} onClick={()=>setStockTab('history')}>
                Sold History <span style={{marginLeft:4,background:'var(--border)',borderRadius:10,padding:'1px 6px',fontSize:11}}>{stats.sold}</span>
              </button>
            </div>

            {stockTab==='inventory'&&(
              <div>
                <div className="filters">
                  <input className="filter-input" placeholder="Search brand, style, SKU..." value={search} onChange={e=>setSearch(e.target.value)} style={{flex:1,minWidth:180}}/>
                  <select className="filter-select" value={filterCategory} onChange={e=>setFilterCategory(e.target.value)}><option value="">All categories</option>{CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}</select>
                  <select className="filter-select" value={filterBrand} onChange={e=>setFilterBrand(e.target.value)}><option value="">All brands</option>{[...new Set(items.map(i=>i.brand).filter(Boolean))].sort().map(b=><option key={b} value={b}>{b}</option>)}</select>
                  <select className="filter-select" value={filterStatus} onChange={e=>setFilterStatus(e.target.value)}><option value="">All statuses</option><option value="in_stock">In stock</option><option value="sold">Sold</option><option value="stale">⚠ Stale ({STALE_DAYS}+ days)</option><option value="long_term">📌 Long-term holds</option></select>
                  <select className="filter-select" value={sortBy} onChange={e=>setSortBy(e.target.value)}>
                    <option value="newest">Newest first</option>
                    <option value="oldest">Oldest first</option>
                    <option value="brand">Brand A–Z</option>
                    <option value="cost_high">Cost: high–low</option>
                    <option value="cost_low">Cost: low–high</option>
                    <option value="stale">Longest in stock</option>
                  </select>
                  {(search||filterBrand||filterStatus||filterCategory)&&<button className="btn sm" onClick={()=>{setSearch('');setFilterBrand('');setFilterStatus('');setFilterCategory('')}}>Clear</button>}
                  <span style={{color:'var(--muted)',fontSize:12}}>{filteredBatches.length} item{filteredBatches.length!==1?'s':''}</span>
                </div>
                {orderCart.length>0&&(
                  <div style={{background:'var(--accent)',color:'#fff',padding:'10px 16px',borderRadius:'var(--radius)',marginBottom:16,display:'flex',justifyContent:'space-between',alignItems:'center',gap:12,flexWrap:'wrap'}}>
                    <span style={{fontWeight:600,fontSize:14}}>🛒 {orderCart.length} item{orderCart.length!==1?'s':''} in order</span>
                    <div style={{display:'flex',gap:8}}>
                      <button style={{background:'rgba(255,255,255,0.2)',border:'1px solid rgba(255,255,255,0.5)',color:'#fff',borderRadius:'var(--radius)',padding:'4px 12px',fontSize:12,fontWeight:600,cursor:'pointer'}} onClick={()=>setShowOrderModal(true)}>View order →</button>
                      <button style={{background:'rgba(255,255,255,0.1)',border:'1px solid rgba(255,255,255,0.3)',color:'#fff',borderRadius:'var(--radius)',padding:'4px 10px',fontSize:12,cursor:'pointer'}} onClick={()=>setOrderCart([])}>✕ Clear</button>
                    </div>
                  </div>
                )}
                {loading?<div className="loading">Loading stock...</div>:filteredBatches.length===0?(
                  <div className="empty"><div className="empty-icon">📦</div><div className="empty-title">{items.length===0?'No stock yet':'No results'}</div><div style={{marginTop:6}}>{items.length===0?'Add your first item to get started':'Try adjusting your filters'}</div></div>
                ):(
                  <div className="card-grid">
                    {filteredBatches.map(batch=>{
                      const inStockUnits=batch.units.filter(u=>u.status==='in_stock')
                      const soldUnits=batch.units.filter(u=>u.status==='sold')
                      const totalCost=inStockUnits.reduce((s,u)=>s+(u.purchase_price||0),0)
                      const avgCost=inStockUnits.length?totalCost/inStockUnits.length:0
                      const totalPL=soldUnits.reduce((s,u)=>s+((u.sale_price||0)-(u.purchase_price||0)-(u.fee_amount||0)-(u.shipping_fee||0)),0)
                      const allSold=inStockUnits.length===0
                      const isSingle=batch.units.length===1
                      return (
                        <div key={batch.key} className="item-card" onClick={()=>setBatchModal(batch)} style={{cursor:'pointer'}}>
                          <div className="item-card-header">
                            <div className="item-card-category">{batch.category||'Uncategorised'}</div>
                            <div style={{display:'flex',gap:6,alignItems:'center'}}>
                              {(()=>{
                                const now = new Date()
                                const isLongTerm = batch.units.some(u => u.long_term)
                                const daysInStock = batch.units.reduce((max, u) => {
                                  if (u.status !== 'in_stock' || !u.purchase_date) return max
                                  const days = (now - new Date(u.purchase_date)) / 86400000
                                  return Math.max(max, days)
                                }, 0)
                                if (isLongTerm) return <span style={{fontSize:10,fontWeight:600,color:'#6366f1',background:'#eef2ff',padding:'2px 6px',borderRadius:10,cursor:'pointer'}} onClick={e=>{e.stopPropagation();unmarkLongTerm(batch)}} title="Click to remove long-term hold">📌 Long-term</span>
                                if (daysInStock > 30) return <span style={{fontSize:10,fontWeight:600,color:'#dc2626',background:'#fee2e2',padding:'2px 6px',borderRadius:10,cursor:'pointer'}} onClick={e=>{e.stopPropagation();markLongTerm(batch)}} title="30+ days — no return window. Click to mark as long-term hold">🔴 30+ days</span>
                                if (daysInStock > STALE_DAYS) return <span style={{fontSize:10,fontWeight:600,color:'#d97706',background:'#fef3c7',padding:'2px 6px',borderRadius:10,cursor:'pointer'}} onClick={e=>{e.stopPropagation();markLongTerm(batch)}} title="Click to mark as long-term hold">⚠ {STALE_DAYS}+ days</span>
                                return null
                              })()}
                              <span className={`badge ${allSold?'sold':'in_stock'}`}>{allSold?'Sold':`${inStockUnits.length} in stock`}</span>
                            </div>
                          </div>
                          <div className="item-card-body">
                            <div className="item-card-brand">{batch.brand||'—'}</div>
                            <div className="item-card-style">{batch.category==='Pokémon'&&batch.units[0]?.pokemon_type==='singles'?[batch.style,batch.units[0]?.card_number,batch.colourway].filter(Boolean).join(' · '):batch.category==='Pokémon'&&batch.units[0]?.pokemon_type==='sealed'?[batch.colourway,batch.units[0]?.pokemon_sealed_type,batch.style].filter(Boolean).join(' · ')||'—':[batch.style,batch.colourway].filter(Boolean).join(' — ')||'—'}</div>
                            {batch.units[0]?.storage_location&&<div style={{marginTop:4,fontSize:11,color:'var(--muted)'}}>📦 {batch.units[0].storage_location}</div>}
                          </div>
                          <div className="item-card-stats">
                            <div className="item-card-stat">
                              <div className="item-card-stat-label">
                                {batch.category==='Sneakers'||batch.category==='Clothing'?'Size':'Condition'}
                              </div>
                              <div className="item-card-stat-value">
                                {batch.category==='Sneakers'||batch.category==='Clothing'?(
                                  isSingle?(batch.units[0].size?`UK ${batch.units[0].size}`:'—'):`${inStockUnits.length} unit${inStockUnits.length!==1?'s':''}`
                                ):batch.category==='Pokémon'&&batch.units[0]?.pokemon_type==='singles'&&batch.units[0]?.graded?
                                  `${batch.units[0]?.grading_company||''} ${batch.units[0]?.grade||''}`.trim():
                                  batch.units[0]?.condition||batch.units[0]?.item_condition||'—'}
                              </div>
                            </div>
                            <div className="item-card-stat"><div className="item-card-stat-label">Cost</div><div className="item-card-stat-value">{fmt(totalCost)}</div>{!isSingle&&inStockUnits.length>0&&<div className="item-card-stat-avg">avg {fmt(avgCost)}</div>}</div>
                            <div className="item-card-stat"><div className="item-card-stat-label">P&L</div><div className={`item-card-stat-value ${plColor(soldUnits.length?totalPL:null)}`}>{soldUnits.length?fmt(totalPL):'—'}</div></div>
                            <div className="item-card-stat"><div className="item-card-stat-label">Sold</div><div className="item-card-stat-value">{batch.units.length>1?`${soldUnits.length}/${batch.units.length}`:(soldUnits.length?'✓':'—')}</div></div>
                          </div>
                          <div className="item-card-actions" onClick={e=>e.stopPropagation()}>
                            {isSingle&&batch.units[0].status==='in_stock'&&<button className="btn sm success" style={{flex:1}} onClick={()=>{setSellItem(batch.units[0]);setSalePrice('');setSellingPlatform('')}}>Sell</button>}
                            {!isSingle&&!allSold&&<button className="btn sm success" style={{flex:1}} onClick={()=>setBatchModal(batch)}>View units</button>}
                            {isSingle&&batch.units[0].status==='in_stock'&&(()=>{
                              const inCart=orderCart.some(e=>e.item.id===batch.units[0].id)
                              return <button className={`btn sm${inCart?' primary':''}`} title={inCart?'In order — click to remove':'Add to order'} onClick={()=>inCart?removeFromOrder(orderCart.find(e=>e.item.id===batch.units[0].id)?.cartId):addToOrder(batch.units[0])}>{inCart?'✓ Order':'📋'}</button>
                            })()}
                            {isSingle&&<button className="btn sm" onClick={()=>openEdit(batch.units[0])}>Edit</button>}
                            <button className="btn sm" onClick={()=>duplicateItem(batch)}>Copy</button>
                            {isSingle?<button className="btn sm danger" onClick={()=>deleteItem(batch.units[0].id)}>Del</button>:<button className="btn sm danger" onClick={()=>deleteBatch(batch.key)}>Del all</button>}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {stockTab==='history'&&(()=>{
              const soldItems = items.filter(i=>i.status==='sold').sort((a,b)=>new Date(b.sold_at)-new Date(a.sold_at))
              if (soldItems.length===0) return <div className="empty"><div className="empty-icon">📋</div><div className="empty-title">No sold items yet</div><div style={{marginTop:6}}>Sales will appear here once you mark items as sold</div></div>
              const groups = {}
              soldItems.forEach(i => {
                const key = getMonthKey(i.sold_at) || 'unknown'
                if (!groups[key]) groups[key] = []
                groups[key].push(i)
              })
              return (
                <div>
                  <div style={{display:'flex',justifyContent:'flex-end',marginBottom:16}}>
                    <button className="btn sm" onClick={exportCSV}>↓ Export CSV</button>
                  </div>
                  {Object.entries(groups).map(([key, gItems]) => {
                    const mRevenue = gItems.reduce((s,i)=>s+(i.sale_price||0),0)
                    const mPL = gItems.reduce((s,i)=>s+(i.sale_price||0)-(i.purchase_price||0)-(i.fee_amount||0)-(i.shipping_fee||0),0)
                    return (
                      <div key={key} className="chart-card" style={{marginBottom:16}}>
                        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12,flexWrap:'wrap',gap:8}}>
                          <div className="chart-title" style={{margin:0}}>{getMonthLabel(key)}</div>
                          <div style={{display:'flex',gap:16,fontSize:13}}>
                            <span style={{color:'var(--muted)'}}>{gItems.length} sale{gItems.length!==1?'s':''} · {fmt(mRevenue)} revenue</span>
                            <span className={mPL>=0?'td-pos':'td-neg'}>{mPL>=0?'+':''}{fmt(mPL)} profit</span>
                          </div>
                        </div>
                        <div style={{overflowX:'auto'}}>
                          <div style={{display:'grid',gridTemplateColumns:'1fr 100px 70px 70px 70px 80px 90px 80px',gap:8,padding:'6px 0',borderBottom:'1px solid var(--border)',fontSize:11,color:'var(--muted)',fontWeight:600,minWidth:620}}>
                            <div>Item</div><div>Platform</div><div>Cost</div><div>Sale</div><div>Fees</div><div>Profit</div><div>Payout</div><div></div>
                          </div>
                          {gItems.map(i => {
                            const profit = (i.sale_price||0)-(i.purchase_price||0)-(i.fee_amount||0)-(i.shipping_fee||0)
                            return (
                              <div key={i.id} style={{display:'grid',gridTemplateColumns:'1fr 100px 70px 70px 70px 80px 90px 80px',gap:8,padding:'8px 0',borderBottom:'1px solid var(--surface2)',fontSize:13,alignItems:'center',minWidth:620}}>
                                <div>
                                  <div style={{fontWeight:500}}>{i.brand} {i.style}</div>
                                  <div style={{fontSize:11,color:'var(--muted)'}}>{[i.colourway,i.size?`UK ${i.size}`:null,i.sold_at?new Date(i.sold_at).toLocaleDateString('en-GB'):null].filter(Boolean).join(' · ')}</div>
                                </div>
                                <div style={{color:'var(--muted)',fontSize:12,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{i.selling_platform||'—'}</div>
                                <div>{fmt(i.purchase_price)}</div>
                                <div>{fmt(i.sale_price)}</div>
                                <div style={{color:'var(--muted)'}}>-{fmt((i.fee_amount||0)+(i.shipping_fee||0))}</div>
                                <div className={profit>=0?'td-pos':'td-neg'}>{profit>=0?'+':''}{fmt(profit)}</div>
                                <div>{i.payout_status==='paid'?<span style={{fontSize:11,color:'var(--green)',fontWeight:600}}>✓ Paid</span>:<span style={{fontSize:11,color:'#d97706',fontWeight:600}}>⏳ Pending</span>}</div>
                                <div style={{display:'flex',gap:4}}>
                                  <button className="btn sm" style={{padding:'2px 6px',fontSize:11}} onClick={()=>handleEditSold(i)}>Edit</button>
                                  <button className="btn sm" style={{padding:'2px 6px',fontSize:11,borderColor:'var(--red)',color:'var(--red)'}} onClick={()=>undoSale(i.id)}>Undo</button>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )
            })()}
          </div>
        )}

        {page==='metrics'&&(
          <div>
            <div className="page-header"><h1 className="page-title">Metrics</h1><p className="page-subtitle">Deep dive into your performance</p></div>

            <div style={{display:'flex',gap:8,marginBottom:24}}>
              <button className={`type-btn ${metricsTab==='reseller'?'active':''}`} onClick={()=>setMetricsTab('reseller')}>Reseller & Breaker</button>
              <button className={`type-btn ${metricsTab==='collector'?'active':''}`} onClick={()=>setMetricsTab('collector')}>Collector</button>
              <button className={`type-btn ${metricsTab==='tax'?'active':''}`} onClick={()=>setMetricsTab('tax')}>Tax Summary</button>
            </div>

            {metricsTab==='reseller'&&(
              <div>
                <div style={{display:'flex',justifyContent:'flex-end',marginBottom:16}}>
                  <div className="metrics-sources">
                    <span className="metrics-sources-label">Data sources:</span>
                    {[{key:'reseller',label:'Reseller'},{key:'breaker',label:'Breaker'}].map(s=>(
                      <label key={s.key} className="metrics-checkbox">
                        <input type="checkbox" checked={metricsSources[s.key]} onChange={()=>toggleSource(s.key)}/>{s.label}
                      </label>
                    ))}
                  </div>
                </div>
                <div className="metrics-grid">
              <div className="chart-card full"><div className="chart-header"><div><div className="chart-title">Monthly Profit & Loss</div><div className="chart-subtitle">Gross P&L vs net after expenses</div></div><div className="chart-controls">{[3,6,12].map(m=><button key={m} className={`chart-btn ${chartMonths===m?'active':''}`} onClick={()=>setChartMonths(m)}>{m}M</button>)}</div></div><ResponsiveContainer width="100%" height={260}><BarChart data={plChartData} margin={{top:10,right:10,left:0,bottom:0}}><CartesianGrid strokeDasharray="3 3" stroke="#e3e8ef" vertical={false}/><XAxis dataKey="label" tick={{fontSize:12,fill:'#8792a2'}} axisLine={false} tickLine={false}/><YAxis tickFormatter={fmtShort} tick={{fontSize:12,fill:'#8792a2'}} axisLine={false} tickLine={false}/><Tooltip formatter={v=>fmt(v)} contentStyle={{borderRadius:8,border:'1px solid #e3e8ef'}}/><Legend/><Bar dataKey="pl" name="Gross P&L" fill="#16a34a" radius={[4,4,0,0]}/><Bar dataKey="netPL" name="Net (after expenses)" fill="#22c55e" radius={[4,4,0,0]} opacity={0.7}/></BarChart></ResponsiveContainer></div>
              <div className="chart-card full"><div className="chart-header"><div><div className="chart-title">Revenue vs Cost vs Expenses</div><div className="chart-subtitle">Monthly comparison</div></div></div><ResponsiveContainer width="100%" height={260}><BarChart data={plChartData} margin={{top:10,right:10,left:0,bottom:0}}><CartesianGrid strokeDasharray="3 3" stroke="#e3e8ef" vertical={false}/><XAxis dataKey="label" tick={{fontSize:12,fill:'#8792a2'}} axisLine={false} tickLine={false}/><YAxis tickFormatter={fmtShort} tick={{fontSize:12,fill:'#8792a2'}} axisLine={false} tickLine={false}/><Tooltip formatter={v=>fmt(v)} contentStyle={{borderRadius:8,border:'1px solid #e3e8ef'}}/><Legend/><Bar dataKey="revenue" name="Revenue" fill="#16a34a" radius={[4,4,0,0]}/><Bar dataKey="cost" name="Stock cost" fill="#e3e8ef" radius={[4,4,0,0]}/><Bar dataKey="expenses" name="Expenses" fill="#f59e0b" radius={[4,4,0,0]}/></BarChart></ResponsiveContainer></div>
              <div className="chart-card half"><div className="chart-header"><div><div className="chart-title">Stock by Category</div><div className="chart-subtitle">All items</div></div></div><ResponsiveContainer width="100%" height={260}><PieChart><Pie data={categoryData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={70} outerRadius={110} paddingAngle={3}>{categoryData.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}</Pie><Tooltip contentStyle={{borderRadius:8,border:'1px solid #e3e8ef'}}/><Legend/></PieChart></ResponsiveContainer></div>
              <div className="chart-card half"><div className="chart-header"><div><div className="chart-title">Sell-Through Rate</div><div className="chart-subtitle">% sold per category</div></div></div><ResponsiveContainer width="100%" height={260}><BarChart data={sellThroughData} layout="vertical" margin={{top:10,right:20,left:10,bottom:0}}><CartesianGrid strokeDasharray="3 3" stroke="#e3e8ef" horizontal={false}/><XAxis type="number" domain={[0,100]} tickFormatter={v=>v+'%'} tick={{fontSize:12,fill:'#8792a2'}} axisLine={false} tickLine={false}/><YAxis type="category" dataKey="cat" tick={{fontSize:12,fill:'#8792a2'}} axisLine={false} tickLine={false} width={80}/><Tooltip formatter={v=>v+'%'} contentStyle={{borderRadius:8,border:'1px solid #e3e8ef'}}/><Bar dataKey="rate" name="Sell-through %" fill="#22c55e" radius={[0,4,4,0]}/></BarChart></ResponsiveContainer></div>
              <div className="chart-card half"><div className="chart-header"><div><div className="chart-title">Top Brands by Profit</div><div className="chart-subtitle">All-time</div></div></div><ResponsiveContainer width="100%" height={260}><BarChart data={brandData} layout="vertical" margin={{top:10,right:20,left:10,bottom:0}}><CartesianGrid strokeDasharray="3 3" stroke="#e3e8ef" horizontal={false}/><XAxis type="number" tickFormatter={fmtShort} tick={{fontSize:12,fill:'#8792a2'}} axisLine={false} tickLine={false}/><YAxis type="category" dataKey="brand" tick={{fontSize:12,fill:'#8792a2'}} axisLine={false} tickLine={false} width={70}/><Tooltip formatter={v=>fmt(v)} contentStyle={{borderRadius:8,border:'1px solid #e3e8ef'}}/><Bar dataKey="pl" name="Profit" fill="#16a34a" radius={[0,4,4,0]}/></BarChart></ResponsiveContainer></div>
              <div className="chart-card half"><div className="chart-header"><div><div className="chart-title">Avg Profit per Sale</div><div className="chart-subtitle">Last 6 months</div></div></div><ResponsiveContainer width="100%" height={260}><LineChart data={avgPLData} margin={{top:10,right:20,left:0,bottom:0}}><CartesianGrid strokeDasharray="3 3" stroke="#e3e8ef" vertical={false}/><XAxis dataKey="label" tick={{fontSize:12,fill:'#8792a2'}} axisLine={false} tickLine={false}/><YAxis tickFormatter={fmtShort} tick={{fontSize:12,fill:'#8792a2'}} axisLine={false} tickLine={false}/><Tooltip formatter={v=>fmt(v)} contentStyle={{borderRadius:8,border:'1px solid #e3e8ef'}}/><Line type="monotone" dataKey="avg" name="Avg P&L" stroke="#16a34a" strokeWidth={2} dot={{fill:'#16a34a',r:4}}/></LineChart></ResponsiveContainer></div>
              <div className="chart-card full"><div className="chart-header"><div><div className="chart-title">Best & Worst Performers</div><div className="chart-subtitle">Top and bottom 5 sold items by profit</div></div></div><div className="two-col"><div><div className="perf-label green">🏆 Best performers</div>{bestWorst.best.length===0?<div className="td-muted" style={{fontSize:13}}>No sold items yet</div>:bestWorst.best.map((item,i)=>(<div key={item.id} className="perf-row"><div className="perf-rank">{i+1}</div><div className="perf-info"><div className="perf-name">{item.brand} {item.style}</div><div className="perf-sub">{item.colourway}{item.size?` · UK ${item.size}`:''}</div></div><div className="perf-pl pos">+{fmt(item.pl)}</div></div>))}</div><div><div className="perf-label red">📉 Worst performers</div>{bestWorst.worst.length===0?<div className="td-muted" style={{fontSize:13}}>No sold items yet</div>:bestWorst.worst.map((item,i)=>(<div key={item.id} className="perf-row"><div className="perf-rank">{i+1}</div><div className="perf-info"><div className="perf-name">{item.brand} {item.style}</div><div className="perf-sub">{item.colourway}{item.size?` · UK ${item.size}`:''}</div></div><div className={`perf-pl ${item.pl>=0?'pos':'neg'}`}>{item.pl>=0?'+':''}{fmt(item.pl)}</div></div>))}</div></div></div>
              {expenses.length>0&&(()=>{
                const byCategory = {}
                expenses.forEach(e=>{if(!byCategory[e.category])byCategory[e.category]=0;byCategory[e.category]+=(e.amount||0)})
                const expCatData = Object.entries(byCategory).sort((a,b)=>b[1]-a[1]).map(([name,value])=>({name,value}))
                const totalExp = expenses.reduce((s,e)=>s+(e.amount||0),0)
                return (
                  <div className="chart-card full">
                    <div className="chart-header"><div><div className="chart-title">Business Expenses</div><div className="chart-subtitle">By category — all time</div></div><div style={{fontWeight:700,fontSize:16,color:'var(--red)'}}>−{fmt(totalExp)}</div></div>
                    <div style={{display:'flex',gap:12,flexWrap:'wrap',marginTop:8}}>
                      {expCatData.map(c=>(
                        <div key={c.name} style={{flex:'1 1 140px',background:'var(--surface2)',borderRadius:8,padding:'10px 14px'}}>
                          <div style={{fontSize:11,color:'var(--muted)',fontWeight:600,textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:4}}>{c.name}</div>
                          <div style={{fontWeight:700,fontSize:16,color:'var(--red)'}}>−{fmt(c.value)}</div>
                          <div style={{fontSize:11,color:'var(--muted)',marginTop:2}}>{((c.value/totalExp)*100).toFixed(0)}% of total</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })()}
              {platformData.length > 0 && (
                <div className="chart-card full">
                  <div className="chart-header"><div><div className="chart-title">Profit by Platform</div><div className="chart-subtitle">Net P&amp;L per selling platform (all time)</div></div></div>
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={platformData} layout="vertical" margin={{top:10,right:20,left:10,bottom:0}}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e3e8ef" horizontal={false}/>
                      <XAxis type="number" tickFormatter={fmtShort} tick={{fontSize:12,fill:'#8792a2'}} axisLine={false} tickLine={false}/>
                      <YAxis type="category" dataKey="platform" tick={{fontSize:11,fill:'#8792a2'}} axisLine={false} tickLine={false} width={100}/>
                      <Tooltip formatter={(v,n)=>[fmt(v),n]} contentStyle={{borderRadius:8,border:'1px solid #e3e8ef'}}/>
                      <Bar dataKey="pl" name="Net P&L" fill="#16a34a" radius={[0,4,4,0]}/>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
              {topBuyers.length > 0 && (
                <div className="chart-card full">
                  <div className="chart-header"><div><div className="chart-title">Top Buyers</div><div className="chart-subtitle">Repeat customers by purchase count</div></div></div>
                  <div style={{display:'flex',flexDirection:'column',gap:0}}>
                    <div style={{display:'grid',gridTemplateColumns:'1fr 80px 100px',gap:8,padding:'6px 0',borderBottom:'2px solid var(--border)',fontSize:11,color:'var(--muted)',fontWeight:700}}>
                      <div>Buyer</div><div style={{textAlign:'right'}}>Purchases</div><div style={{textAlign:'right'}}>Total spent</div>
                    </div>
                    {topBuyers.map((b,i)=>(
                      <div key={b.name} style={{display:'grid',gridTemplateColumns:'1fr 80px 100px',gap:8,padding:'8px 0',borderBottom:'1px solid var(--surface2)',fontSize:13,alignItems:'center'}}>
                        <div style={{display:'flex',gap:8,alignItems:'center'}}>
                          <span style={{fontSize:11,fontWeight:700,color:'var(--muted)',minWidth:16}}>{i+1}</span>
                          <span style={{fontWeight:500}}>{b.name}</span>
                        </div>
                        <div style={{textAlign:'right',color:'var(--muted)'}}>{b.count}</div>
                        <div style={{textAlign:'right',fontWeight:600}}>{fmt(b.spend)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            </div>
            )}

            {metricsTab==='collector'&&(
              <div>
                {collectorItems.length===0?(
                  <div className="empty"><div className="empty-icon">🗂️</div><div className="empty-title">No collection data yet</div><div style={{marginTop:6}}>Add items to your collection to see metrics</div></div>
                ):(
                  <div>
                    <div className="stats-bar" style={{marginBottom:24}}>
                      <div className="stat-card"><div className="stat-label">Total items</div><div className="stat-value">{collectorStats.total}</div></div>
                      <div className="stat-card"><div className="stat-label">Collection value</div><div className="stat-value">{fmt(collectorStats.totalValue)}</div></div>
                      <div className="stat-card"><div className="stat-label">Avg per item</div><div className="stat-value">{fmt(collectorStats.avgValue)}</div></div>
                      {Object.entries(collectorStats.byCategory).map(([cat,{count}])=>(
                        <div key={cat} className="stat-card"><div className="stat-label">{cat}</div><div className="stat-value">{count}</div></div>
                      ))}
                    </div>
                    <div className="metrics-grid">
                      <div className="chart-card half">
                        <div className="chart-header"><div><div className="chart-title">Collection by Category</div><div className="chart-subtitle">Items and value</div></div></div>
                        <ResponsiveContainer width="100%" height={260}>
                          <PieChart>
                            <Pie data={collectorStats.categoryChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={70} outerRadius={110} paddingAngle={3}>
                              {collectorStats.categoryChartData.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}
                            </Pie>
                            <Tooltip formatter={(v,n,p)=>[`${v} items · ${fmt(p.payload.totalValue)}`,n]} contentStyle={{borderRadius:8,border:'1px solid var(--border)'}}/>
                            <Legend/>
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="chart-card half">
                        <div className="chart-header"><div><div className="chart-title">Collection Growth</div><div className="chart-subtitle">Items purchased per month</div></div></div>
                        <ResponsiveContainer width="100%" height={260}>
                          <BarChart data={collectorStats.growthData} margin={{top:10,right:10,left:0,bottom:0}}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e3e8ef" vertical={false}/>
                            <XAxis dataKey="label" tick={{fontSize:12,fill:'#8792a2'}} axisLine={false} tickLine={false}/>
                            <YAxis tick={{fontSize:12,fill:'#8792a2'}} axisLine={false} tickLine={false} allowDecimals={false}/>
                            <Tooltip contentStyle={{borderRadius:8,border:'1px solid var(--border)'}}/>
                            <Bar dataKey="count" name="Items purchased" fill="#16a34a" radius={[4,4,0,0]}/>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="chart-card full">
                        <div className="chart-header"><div><div className="chart-title">Most Valuable Items</div><div className="chart-subtitle">Top 5 by purchase price</div></div></div>
                        {collectorStats.topItems.length===0?(
                          <div style={{color:'var(--muted)',fontSize:13,padding:'16px 0'}}>No items with prices yet</div>
                        ):(
                          collectorStats.topItems.map((item,i)=>(
                            <div key={item.id} className="perf-row">
                              <div className="perf-rank">{i+1}</div>
                              <div className="perf-info">
                                <div className="perf-name">{item.brand} {item.style}</div>
                                <div className="perf-sub">{item.colourway}{item.size?` · UK ${item.size}`:''}{item.category?` · ${item.category}`:''}</div>
                              </div>
                              <div className="perf-pl" style={{color:'var(--text)'}}>{fmt(item.purchase_price)}</div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {metricsTab==='tax'&&(()=>{
              const txStart = new Date(selectedTaxYear, 3, 6)
              const txEnd = new Date(selectedTaxYear + 1, 3, 5, 23, 59, 59)
              const inYear = d => { const dt = new Date(d); return dt >= txStart && dt <= txEnd }

              const resellerProfit = items.filter(i => i.status === 'sold' && i.sold_at && inYear(i.sold_at))
                .reduce((s,i) => s + ((i.sale_price||0) - (i.purchase_price||0) - (i.fee_amount||0) - (i.shipping_fee||0)), 0)
              const breakerProfit = breaks.filter(b => b.status === 'completed' && (b.break_date || b.last_stream_date || b.created_at) && inYear(b.break_date || b.last_stream_date || b.created_at))
                .reduce((s,b) => s + (b.type==='break' ? (b.spots_sold||0)*(b.spot_price||0) - (b.cost||0) : (b.packs_sold||0)*(b.pack_price||0) - (b.cost||0)), 0)
              const totalExpenses = expenses.filter(e => e.date && inYear(e.date)).reduce((s,e) => s + (e.amount||0), 0)
              const grossProfit = resellerProfit + breakerProfit
              const taxableProfit = Math.max(0, grossProfit - totalExpenses)

              function calcTax(profit) {
                const PA = 12570, BASIC_LIMIT = 50270, HIGHER_LIMIT = 125140
                if (profit <= PA) return 0
                if (profit <= BASIC_LIMIT) return (profit - PA) * 0.20
                if (profit <= HIGHER_LIMIT) return (BASIC_LIMIT - PA) * 0.20 + (profit - BASIC_LIMIT) * 0.40
                return (BASIC_LIMIT - PA) * 0.20 + (HIGHER_LIMIT - BASIC_LIMIT) * 0.40 + (profit - HIGHER_LIMIT) * 0.45
              }
              function calcNI(profit) {
                const PA = 12570, UPPER = 50270
                if (profit <= PA) return 0
                const lower = Math.min(profit, UPPER) - PA
                const upper = Math.max(0, profit - UPPER)
                return lower * 0.06 + upper * 0.02
              }

              const estimatedTax = calcTax(taxableProfit)
              const estimatedNI = calcNI(taxableProfit)
              const totalLiability = estimatedTax + estimatedNI

              const taxYears = Array.from({length:5},(_,i)=>currentTaxYear-i)

              return (
                <div style={{maxWidth:700}}>
                  <div className="chart-card" style={{marginBottom:20}}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16,flexWrap:'wrap',gap:12}}>
                      <div className="chart-title" style={{margin:0}}>UK Self-Assessment Summary</div>
                      <select className="form-input" style={{width:'auto'}} value={selectedTaxYear} onChange={e=>setSelectedTaxYear(Number(e.target.value))}>
                        {taxYears.map(y=><option key={y} value={y}>{y}/{String(y+1).slice(2)} (6 Apr {y} – 5 Apr {y+1})</option>)}
                      </select>
                    </div>
                    <div className="stats-bar" style={{marginBottom:16}}>
                      <div className="stat-card"><div className="stat-label">Reseller profit</div><div className={`stat-value ${resellerProfit>=0?'pos':'neg'}`}>{resellerProfit>=0?'+':''}{fmt(resellerProfit)}</div></div>
                      <div className="stat-card"><div className="stat-label">Breaker profit</div><div className={`stat-value ${breakerProfit>=0?'pos':'neg'}`}>{breakerProfit>=0?'+':''}{fmt(breakerProfit)}</div></div>
                      <div className="stat-card"><div className="stat-label">Business expenses</div><div className="stat-value neg">−{fmt(totalExpenses)}</div></div>
                      <div className="stat-card"><div className="stat-label">Taxable profit</div><div className={`stat-value ${taxableProfit>0?'pos':''}`}>{fmt(taxableProfit)}</div></div>
                    </div>
                    <div style={{borderTop:'1px solid var(--border)',paddingTop:16}}>
                      <div style={{display:'flex',flexDirection:'column',gap:10}}>
                        <div style={{display:'flex',justifyContent:'space-between',fontSize:14}}><span>Personal Allowance (tax-free)</span><span style={{fontWeight:500}}>{fmt(Math.min(taxableProfit,12570))}</span></div>
                        <div style={{display:'flex',justifyContent:'space-between',fontSize:14}}><span>Income Tax (estimate)</span><span style={{fontWeight:600,color:estimatedTax>0?'var(--red)':'var(--text)'}}>{fmt(estimatedTax)}</span></div>
                        <div style={{display:'flex',justifyContent:'space-between',fontSize:14}}><span>Class 4 NI (estimate)</span><span style={{fontWeight:600,color:estimatedNI>0?'var(--red)':'var(--text)'}}>{fmt(estimatedNI)}</span></div>
                        <div style={{display:'flex',justifyContent:'space-between',fontSize:16,fontWeight:700,borderTop:'1px solid var(--border)',paddingTop:10}}><span>Total estimated liability</span><span style={{color:totalLiability>0?'var(--red)':'var(--text)'}}>{fmt(totalLiability)}</span></div>
                      </div>
                    </div>
                  </div>
                  <div className="chart-card" style={{marginBottom:16}}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
                      <div style={{fontSize:13,fontWeight:600}}>Your UTR (Unique Taxpayer Reference)</div>
                      {taxUTR&&<span style={{fontSize:11,color:'var(--green)'}}>✓ Saved</span>}
                    </div>
                    <div style={{display:'flex',gap:8}}>
                      <input className="form-input" style={{margin:0,flex:1,fontFamily:'monospace',letterSpacing:'0.08em'}} placeholder="10-digit UTR e.g. 1234567890" value={taxUTR} onChange={e=>setTaxUTR(e.target.value)} maxLength={10}/>
                      <button className="btn sm primary" onClick={()=>{ try { localStorage.setItem(TAX_UTR_KEY, taxUTR) } catch {} }}>Save</button>
                    </div>
                    <div style={{fontSize:11,color:'var(--muted)',marginTop:6}}>Your UTR is shown on previous tax returns and HMRC correspondence. Stored locally, never sent anywhere.</div>
                  </div>
                  <div className="chart-card" style={{marginBottom:16}}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
                      <div style={{fontSize:13,fontWeight:600}}>VAT Settings</div>
                      <span style={{fontSize:11,color:vatRegistered?'var(--green)':'var(--muted)'}}>{vatRegistered?'✓ VAT Registered':'Not registered'}</span>
                    </div>
                    <div className="type-toggle" style={{marginBottom:12}}>
                      <button className={`type-btn ${!vatRegistered?'active':''}`} onClick={()=>setVatRegistered(false)}>Not registered</button>
                      <button className={`type-btn ${vatRegistered?'active':''}`} onClick={()=>setVatRegistered(true)}>VAT Registered</button>
                    </div>
                    {vatRegistered && (
                      <div style={{display:'flex',gap:8,marginBottom:8}}>
                        <input className="form-input" style={{margin:0,flex:1,fontFamily:'monospace',letterSpacing:'0.06em'}} placeholder="GB123456789" value={vatNumber} onChange={e=>setVatNumber(e.target.value)} maxLength={12}/>
                        <button className="btn sm primary" onClick={saveVATSettings}>Save</button>
                      </div>
                    )}
                    {!vatRegistered && <button className="btn sm primary" onClick={saveVATSettings}>Save</button>}
                    {vatRegistered && taxableProfit > 0 && (
                      <div style={{marginTop:12,padding:'10px 14px',background:'var(--amber-bg)',border:'1px solid #f59e0b',borderRadius:'var(--radius)',fontSize:13}}>
                        <div style={{fontWeight:600,marginBottom:4}}>VAT Reminder</div>
                        <div style={{color:'var(--text2)'}}>If your taxable turnover exceeds £90,000 you must register for VAT. Current year taxable profit: <strong>{fmt(taxableProfit)}</strong>.</div>
                      </div>
                    )}
                  </div>
                  <div style={{fontSize:12,color:'var(--muted)',background:'var(--surface2)',padding:'10px 14px',borderRadius:'var(--radius)'}}>
                    ⚠️ Estimate only, based on sole trader rates for {selectedTaxYear}/{selectedTaxYear+1}. Does not account for other income, trading allowance, or other reliefs. Always confirm with a qualified accountant before submitting your Self Assessment.
                  </div>
                </div>
              )
            })()}
          </div>
        )}

        {page==='collector'&&(
          <div>
            <div className="page-header"><h1 className="page-title">Collector</h1><p className="page-subtitle">Your personal collection</p></div>

            {/* Free tier limit warning */}
            {userPlan==='free'&&(
              <div style={{background:'#fffbeb',border:'1px solid #f59e0b',borderRadius:'var(--radius)',padding:'12px 16px',marginBottom:20,display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:8}}>
                <span style={{fontSize:13,color:'#92400e'}}>{collectorItems.length}/{FREE_LIMIT} items used on free plan</span>
                {collectorItems.length>=FREE_LIMIT&&<span style={{fontSize:13,fontWeight:600,color:'#d97706'}}>Limit reached — upgrade to add more</span>}
              </div>
            )}

            {/* Pro metrics */}
            {userPlan==='pro'&&collectorItems.length>0&&(
              <div className="stats-bar" style={{marginBottom:20}}>
                <div className="stat-card"><div className="stat-label">Total items</div><div className="stat-value">{collectorStats.total}</div></div>
                <div className="stat-card"><div className="stat-label">Collection value</div><div className="stat-value">{fmt(collectorStats.totalValue)}</div></div>
                {Object.entries(collectorStats.byCategory).map(([cat, {count}]) => (
                  <div key={cat} className="stat-card"><div className="stat-label">{cat}</div><div className="stat-value">{count}</div></div>
                ))}
              </div>
            )}

            {collectorLoading?<div className="loading">Loading collection...</div>:collectorItems.length===0?(
              <div className="empty"><div className="empty-icon">🗂️</div><div className="empty-title">Nothing in your collection yet</div><div style={{marginTop:6}}>Add your first item to get started</div></div>
            ):(
              <div className="card-grid">
                {collectorItems.map(item=>(
                  <div key={item.id} className="item-card">
                    <div className="item-card-header">
                      <div className="item-card-category">{item.category||'Uncategorised'}</div>
                      <span className="badge in_stock">{item.item_condition||'Brand New'}</span>
                    </div>
                    <div className="item-card-body">
                      <div className="item-card-brand">{item.brand||'—'}</div>
                      <div className="item-card-style">{[item.style,item.colourway].filter(Boolean).join(' — ')||'—'}</div>
                    </div>
                    <div className="item-card-stats">
                      <div className="item-card-stat"><div className="item-card-stat-label">{item.category==='Sneakers'||item.category==='Clothing'?'Size':'Condition'}</div><div className="item-card-stat-value">{item.category==='Sneakers'||item.category==='Clothing'?(item.size?`UK ${item.size}`:'—'):(item.condition||item.item_condition||'—')}</div></div>
                      <div className="item-card-stat"><div className="item-card-stat-label">Paid</div><div className="item-card-stat-value">{fmt(item.purchase_price)}</div></div>
                      <div className="item-card-stat"><div className="item-card-stat-label">SKU</div><div className="item-card-stat-value">{item.sku||'—'}</div></div>
                      <div className="item-card-stat"><div className="item-card-stat-label">From</div><div className="item-card-stat-value">{item.purchase_platform||'—'}</div></div>
                    </div>
                    <div className="item-card-actions">
                      <button className="btn sm" style={{flex:1}} onClick={()=>openEditCollector(item)}>Edit</button>
                      <button className="btn sm danger" onClick={()=>deleteCollectorItem(item.id)}>Del</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {page==='tools'&&(
          <div>
            <div className="page-header"><h1 className="page-title">Tools</h1><p className="page-subtitle">Calculators and utilities</p></div>
            <div style={{display:'flex',gap:8,marginBottom:24,flexWrap:'wrap'}}>
              <button className={`type-btn ${toolTab==='fee'?'active':''}`} onClick={()=>switchToolTab('fee')}>Fee Calculator</button>
              <button className={`type-btn ${toolTab==='checklist'?'active':''}`} onClick={()=>switchToolTab('checklist')}>Stock Checklist</button>
              <button className={`type-btn ${toolTab==='payouts'?'active':''}`} onClick={()=>switchToolTab('payouts')}>
                Payouts
                {(()=>{const n=items.filter(i=>i.status==='sold'&&i.payout_status==='pending').length;return n>0?<span style={{marginLeft:4,background:'#fef3c7',color:'#d97706',borderRadius:10,padding:'1px 6px',fontSize:11}}>{n}</span>:null})()}
              </button>
              <button className={`type-btn ${toolTab==='invoice'?'active':''}`} onClick={()=>switchToolTab('invoice')}>Invoice Generator</button>
              <button className={`type-btn ${toolTab==='sku'?'active':''}`} onClick={()=>switchToolTab('sku')}>SKU Lookup</button>
              <button className={`type-btn ${toolTab==='csv'?'active':''}`} onClick={()=>switchToolTab('csv')}>CSV Import</button>
            </div>
            {toolTab==='fee'&&<FeeCalculator/>}
            {toolTab==='checklist'&&<StockChecklist items={items} breaks={breaks} clearedBatch={clearedBatch} onAddItem={()=>{setPage('stock');setTimeout(()=>{setForm(EMPTY_FORM);setEditItem(null);setSaveError('');setShowAdd(true)},100)}} onEditItem={(item)=>{openEdit(item)}} onSellItem={(item)=>{setSellItem(item);setSalePrice('');setSellingPlatform('');setPayoutStatus('pending')}}/>}
            {toolTab==='payouts'&&(()=>{
              const pending = items.filter(i=>i.status==='sold'&&i.payout_status==='pending')
              const totalOutstanding = pending.reduce((s,i)=>s+(i.sale_price||0)-(i.fee_amount||0)-(i.shipping_fee||0),0)
              const byPlatform = {}
              pending.forEach(i=>{const p=i.selling_platform||'Unknown';if(!byPlatform[p])byPlatform[p]=[];byPlatform[p].push(i)})
              if (pending.length===0) return <div className="empty"><div className="empty-icon">✅</div><div className="empty-title">All caught up</div><div style={{marginTop:6}}>No pending payouts</div></div>
              return (
                <div style={{maxWidth:700}}>
                  <div className="chart-card" style={{marginBottom:20}}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:12}}>
                      <div>
                        <div className="chart-title" style={{marginBottom:4}}>Outstanding Payouts</div>
                        <div style={{fontSize:13,color:'var(--muted)'}}>{pending.length} sale{pending.length!==1?'s':''} pending</div>
                      </div>
                      <div style={{textAlign:'right'}}>
                        <div style={{fontSize:24,fontWeight:700,color:'var(--text)'}}>Net {fmt(totalOutstanding)}</div>
                        <button className="btn sm primary" style={{marginTop:8}} onClick={()=>markPayoutPaid(pending.map(i=>i.id))}>✓ Mark all paid</button>
                      </div>
                    </div>
                  </div>
                  {Object.entries(byPlatform).map(([platform, pItems])=>{
                    const platformTotal = pItems.reduce((s,i)=>s+(i.sale_price||0)-(i.fee_amount||0)-(i.shipping_fee||0),0)
                    return (
                      <div key={platform} className="chart-card" style={{marginBottom:16}}>
                        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
                          <div className="chart-title" style={{margin:0}}>{platform}</div>
                          <div style={{display:'flex',gap:12,alignItems:'center'}}>
                            <span style={{fontSize:14,fontWeight:600}}>{fmt(platformTotal)}</span>
                            <button className="btn sm" onClick={()=>markPayoutPaid(pItems.map(i=>i.id))}>Mark all paid</button>
                          </div>
                        </div>
                        {pItems.map(i=>{
                          const net=(i.sale_price||0)-(i.fee_amount||0)-(i.shipping_fee||0)
                          return (
                            <div key={i.id} style={{display:'flex',alignItems:'center',gap:12,padding:'8px 0',borderBottom:'1px solid var(--surface2)'}}>
                              <div style={{flex:1}}>
                                <div style={{fontWeight:500,fontSize:13}}>{i.brand} {i.style}</div>
                                <div style={{fontSize:11,color:'var(--muted)'}}>{[i.colourway,i.size?`UK ${i.size}`:null,i.sold_at?new Date(i.sold_at).toLocaleDateString('en-GB'):null].filter(Boolean).join(' · ')}</div>
                              </div>
                              <div style={{fontSize:12,color:'var(--muted)'}}>{fmt(i.sale_price)}{i.fee_amount?` − ${fmt(i.fee_amount)} fee`:''}</div>
                              <div style={{fontSize:13,fontWeight:600}}>{fmt(net)}</div>
                              <button className="btn sm success" onClick={()=>markPayoutPaid([i.id])}>✓ Paid</button>
                            </div>
                          )
                        })}
                      </div>
                    )
                  })}
                </div>
              )
            })()}
            {toolTab==='invoice'&&(()=>{
              const invTotal = invLines.reduce((s,l)=>s+(parseFloat(l.qty)||0)*(parseFloat(l.unitPrice)||0),0)
              const bizDetails = {...blankBiz,...invBiz}
              return (
                <div style={{display:'flex',gap:20,alignItems:'flex-start',flexWrap:'wrap'}}><div style={{flex:'1 1 480px',minWidth:0,maxWidth:700}}>
                  {/* Business details */}
                  <div className="chart-card" style={{marginBottom:16}}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:editingBiz?16:0}}>
                      <div className="chart-title" style={{margin:0}}>Your Business Details</div>
                      <button className="btn sm" onClick={()=>setEditingBiz(e=>!e)}>{editingBiz?'Cancel':'Edit'}</button>
                    </div>
                    {editingBiz?(
                      <div>
                        <div className="form-grid" style={{marginTop:16}}>
                          <div className="form-group full"><label className="form-label">Business name</label><input className="form-input" value={invBiz.name||''} onChange={e=>setInvBiz(b=>({...b,name:e.target.value}))}/></div>
                          <div className="form-group full"><label className="form-label">Address</label><input className="form-input" placeholder="Line 1, City, Postcode" value={invBiz.address||''} onChange={e=>setInvBiz(b=>({...b,address:e.target.value}))}/></div>
                          <div className="form-group"><label className="form-label">Email</label><input className="form-input" type="email" value={invBiz.email||''} onChange={e=>setInvBiz(b=>({...b,email:e.target.value}))}/></div>
                          <div className="form-group"><label className="form-label">Phone</label><input className="form-input" value={invBiz.phone||''} onChange={e=>setInvBiz(b=>({...b,phone:e.target.value}))}/></div>
                          <div className="form-group"><label className="form-label">VAT Number (optional)</label><input className="form-input" placeholder="GB123456789" value={invBiz.vatNumber||''} onChange={e=>setInvBiz(b=>({...b,vatNumber:e.target.value}))}/></div>
                        </div>
                        <div className="form-actions"><button className="btn primary" onClick={saveBizDetails}>Save details</button></div>
                      </div>
                    ):(
                      bizDetails.name
                        ? <div style={{fontSize:13,color:'var(--muted)',marginTop:8}}>{bizDetails.name}{bizDetails.address?` · ${bizDetails.address}`:''}{bizDetails.email?` · ${bizDetails.email}`:''}</div>
                        : <div style={{fontSize:13,color:'var(--muted)',marginTop:8}}>No business details saved — click Edit to add them.</div>
                    )}
                  </div>

                  {/* Invoice form */}
                  <div className="chart-card" style={{marginBottom:16}}>
                    <div style={{display:'flex',gap:12,marginBottom:20,flexWrap:'wrap'}}>
                      <div className="form-group" style={{margin:0,flex:'0 0 120px'}}>
                        <label className="form-label">Invoice #</label>
                        <input className="form-input" value={invNumber} onChange={e=>setInvNumber(e.target.value)}/>
                      </div>
                      <div className="form-group" style={{margin:0,flex:'1 1 150px'}}>
                        <label className="form-label">Invoice date</label>
                        <input className="form-input" type="date" value={invDate} onChange={e=>setInvDate(e.target.value)}/>
                      </div>
                      <div className="form-group" style={{margin:0,flex:'1 1 150px'}}>
                        <label className="form-label">Due date</label>
                        <input className="form-input" type="date" value={invDueDate} onChange={e=>setInvDueDate(e.target.value)}/>
                      </div>
                    </div>

                    <div style={{fontSize:11,fontWeight:700,textTransform:'uppercase',color:'var(--muted)',letterSpacing:'0.06em',marginBottom:10}}>Bill to</div>
                    <div className="form-grid" style={{marginBottom:20}}>
                      <div className="form-group"><label className="form-label">Customer name</label><input className="form-input" placeholder="John Smith" value={invCustomer.name} onChange={e=>setInvCustomer(c=>({...c,name:e.target.value}))}/></div>
                      <div className="form-group"><label className="form-label">Email</label><input className="form-input" type="email" placeholder="john@example.com" value={invCustomer.email} onChange={e=>setInvCustomer(c=>({...c,email:e.target.value}))}/></div>
                      <div className="form-group full"><label className="form-label">Address</label><input className="form-input" placeholder="123 High St, London, SW1A 1AA" value={invCustomer.address} onChange={e=>setInvCustomer(c=>({...c,address:e.target.value}))}/></div>
                    </div>

                    <div style={{fontSize:11,fontWeight:700,textTransform:'uppercase',color:'var(--muted)',letterSpacing:'0.06em',marginBottom:10}}>Line items</div>
                    <table style={{width:'100%',borderCollapse:'collapse',marginBottom:10}}>
                      <thead><tr style={{borderBottom:'2px solid var(--border)',fontSize:11,color:'var(--muted)',textTransform:'uppercase'}}>
                        <th style={{textAlign:'left',padding:'6px 0',fontWeight:700,letterSpacing:'0.05em'}}>Description</th>
                        <th style={{textAlign:'right',padding:'6px 8px',fontWeight:700,width:60,letterSpacing:'0.05em'}}>Qty</th>
                        <th style={{textAlign:'right',padding:'6px 8px',fontWeight:700,width:100,letterSpacing:'0.05em'}}>Unit (£)</th>
                        <th style={{textAlign:'right',padding:'6px 0',fontWeight:700,width:90,letterSpacing:'0.05em'}}>Total</th>
                        <th style={{width:32}}></th>
                      </tr></thead>
                      <tbody>
                        {invLines.map((l,i)=>(
                          <tr key={i} style={{borderBottom:'1px solid var(--border)'}}>
                            <td style={{padding:'6px 0'}}><input className="form-input" style={{margin:0}} placeholder="Item or service description" value={l.description} onChange={e=>updateInvLine(i,'description',e.target.value)}/></td>
                            <td style={{padding:'6px 8px'}}><input className="form-input" style={{margin:0,textAlign:'right',width:52}} type="number" min="1" value={l.qty} onChange={e=>updateInvLine(i,'qty',e.target.value)}/></td>
                            <td style={{padding:'6px 8px'}}><input className="form-input" style={{margin:0,textAlign:'right',width:80}} type="number" step="0.01" min="0" placeholder="0.00" value={l.unitPrice} onChange={e=>updateInvLine(i,'unitPrice',e.target.value)}/></td>
                            <td style={{padding:'6px 0',textAlign:'right',fontWeight:600,fontSize:14}}>{fmt((parseFloat(l.qty)||0)*(parseFloat(l.unitPrice)||0))}</td>
                            <td style={{padding:'6px 0',textAlign:'right'}}>{invLines.length>1&&<button onClick={()=>removeInvLine(i)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--muted)',fontSize:16,lineHeight:1}}>✕</button>}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <button className="btn sm" onClick={addInvLine} style={{marginBottom:20}}>+ Add line</button>

                    <div style={{display:'flex',justifyContent:'flex-end',marginBottom:20}}>
                      <div style={{width:240,borderTop:'2px solid var(--border)',paddingTop:12}}>
                        <div style={{display:'flex',justifyContent:'space-between',fontSize:18,fontWeight:700}}><span>Total</span><span>{fmt(invTotal)}</span></div>
                      </div>
                    </div>

                    <div className="form-group" style={{margin:0}}>
                      <label className="form-label">Notes (payment terms, bank details, etc.)</label>
                      <textarea className="form-input" rows={3} placeholder="e.g. Bank: Monzo · Sort: 00-00-00 · Acc: 12345678 · Payment within 14 days" value={invNotes} onChange={e=>setInvNotes(e.target.value)}/>
                    </div>
                  </div>

                  <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                    <button className="btn" onClick={previewInvoice}>👁 Preview</button>
                    <button className="btn primary" onClick={printInvoice}>🖨️ Print</button>
                    <button className="btn success" onClick={saveInvoice}>💾 Save Invoice</button>
                    <button className="btn" onClick={()=>{setInvCustomer({name:'',address:'',email:''});setInvLines([{description:'',qty:'1',unitPrice:''}]);setInvNotes('')}}>Clear</button>
                  </div>
                  <div style={{fontSize:12,color:'var(--muted)',marginTop:8}}>Preview opens a new tab. Print opens + auto-prints. Save stores a copy on the right.</div>
                </div>
                {/* Saved invoices panel */}
                <div style={{flex:'0 0 240px',minWidth:220}}>
                  <div className="chart-card">
                    <div className="chart-title" style={{marginBottom:savedInvoices.length?12:0,fontSize:14}}>Saved Invoices</div>
                    {savedInvoices.length===0?(
                      <div style={{fontSize:12,color:'var(--muted)',marginTop:8}}>No saved invoices yet. Hit "Save Invoice" to store one here.</div>
                    ):(
                      <div style={{display:'flex',flexDirection:'column',gap:8}}>
                        {savedInvoices.map(inv=>(
                          <div key={inv.id} style={{padding:'10px 12px',background:'var(--surface2)',borderRadius:'var(--radius)',fontSize:12}}>
                            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:4}}>
                              <div style={{fontWeight:700,fontSize:13}}>INV-{inv.number}</div>
                              <button onClick={()=>deleteSavedInvoice(inv.id)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--muted)',fontSize:14,lineHeight:1,padding:0}}>✕</button>
                            </div>
                            <div style={{color:'var(--muted)',marginBottom:2}}>{inv.customerName||'No customer'}</div>
                            <div style={{color:'var(--muted)',marginBottom:6}}>{inv.date}</div>
                            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                              <div style={{fontWeight:600,color:'var(--text)'}}>{fmt(inv.total)}</div>
                              <button className="btn sm" onClick={()=>printSavedInvoice(inv.snapshot)}>Print ↗</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                </div>
              )
            })()}
            {toolTab==='csv'&&(
              <div style={{maxWidth:680}}>
                <div className="chart-card" style={{marginBottom:16}}>
                  <div className="chart-title" style={{marginBottom:4}}>CSV Import</div>
                  <div style={{fontSize:13,color:'var(--muted)',marginBottom:16}}>Bulk-add stock from a spreadsheet. Download the template, fill it in, then upload it here.</div>
                  <button className="btn sm" onClick={downloadCSVTemplate} style={{marginBottom:16}}>↓ Download template CSV</button>
                  <div className="csv-drop-zone" onClick={()=>document.getElementById('csv-file-input').click()}>
                    <div style={{fontSize:32,marginBottom:8}}>📂</div>
                    <div style={{fontWeight:600,marginBottom:4}}>Click to select a CSV file</div>
                    <div style={{fontSize:12,color:'var(--muted)'}}>Columns: Category, Brand, Style, Colourway, SKU, Size, Purchase Date, Purchase Platform, Total Cost (£), Notes</div>
                  </div>
                  <input id="csv-file-input" type="file" accept=".csv" style={{display:'none'}} onChange={e=>{const f=e.target.files[0];if(f)parseCsvImport(f);e.target.value=''}}/>
                  {csvError&&<div style={{background:'#fff5f5',border:'1px solid #fed7d7',borderRadius:'var(--radius)',padding:'10px 14px',fontSize:13,color:'var(--red)',marginTop:12}}>{csvError}</div>}
                </div>
                {csvRows&&csvRows.length>0&&(
                  <div className="chart-card">
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
                      <div><div className="chart-title" style={{margin:0}}>{csvRows.length} row{csvRows.length!==1?'s':''} ready to import</div></div>
                      <div style={{display:'flex',gap:8}}>
                        <button className="btn sm" onClick={()=>setCsvRows(null)}>Cancel</button>
                        <button className="btn primary sm" onClick={importCSVRows} disabled={csvImporting}>{csvImporting?'Importing...':'Import all'}</button>
                      </div>
                    </div>
                    <div style={{overflowX:'auto'}}>
                      <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
                        <thead><tr style={{borderBottom:'2px solid var(--border)'}}>{['Category','Brand','Style','Size','Cost'].map(h=><th key={h} style={{textAlign:'left',padding:'4px 8px',color:'var(--muted)',fontWeight:600}}>{h}</th>)}</tr></thead>
                        <tbody>
                          {csvRows.slice(0,20).map((r,i)=>(
                            <tr key={i} style={{borderBottom:'1px solid var(--surface2)'}}>
                              <td style={{padding:'4px 8px'}}>{r['category']||'—'}</td>
                              <td style={{padding:'4px 8px'}}>{r['brand']||'—'}</td>
                              <td style={{padding:'4px 8px'}}>{r['style']||'—'}</td>
                              <td style={{padding:'4px 8px'}}>{r['size']||'—'}</td>
                              <td style={{padding:'4px 8px'}}>{r['total cost (£)']||r['cost']||'—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {csvRows.length>20&&<div style={{fontSize:12,color:'var(--muted)',padding:'8px',textAlign:'center'}}>…and {csvRows.length-20} more rows</div>}
                    </div>
                  </div>
                )}
              </div>
            )}
            {toolTab==='sku'&&(
              <div style={{maxWidth:680}}>
                <div className="chart-card" style={{marginBottom:20}}>
                  <div className="chart-title" style={{marginBottom:4}}>SKU / Product Lookup</div>
                  <div style={{fontSize:13,color:'var(--muted)',marginBottom:16}}>Enter a SKU, model name, or style code to look up product details and pricing.</div>
                  <div style={{display:'flex',gap:8}}>
                    <input className="form-input" style={{flex:1,margin:0}} placeholder="e.g. DZ5485-612 or Air Jordan 4 Red Thunder" value={skuQuery} onChange={e=>setSkuQuery(e.target.value)} onKeyDown={e=>e.key==='Enter'&&lookupSKU()}/>
                    <button className="btn primary" onClick={lookupSKU} disabled={skuLoading||!skuQuery.trim()}>{skuLoading?'Searching...':'Search'}</button>
                  </div>
                </div>
                {skuLoading&&<div className="loading">Looking up product…</div>}
                {skuError&&<div style={{background:'#fffbeb',border:'1px solid #f59e0b',borderRadius:'var(--radius)',padding:'10px 14px',fontSize:13,color:'#92400e',marginBottom:16}}>{skuError}</div>}
                {skuResults&&skuResults.length>0&&(
                  <div>
                    <div style={{fontWeight:600,fontSize:13,color:'var(--muted)',marginBottom:12}}>{skuResults.length} result{skuResults.length!==1?'s':''} found</div>
                    <div style={{display:'flex',flexDirection:'column',gap:12}}>
                      {skuResults.map(r=>(
                        <div key={r.id} className="chart-card" style={{display:'flex',gap:16,alignItems:'flex-start',padding:'16px'}}>
                          {r.media?.imageUrl&&<img src={r.media.imageUrl} alt={r.title} style={{width:80,height:80,objectFit:'contain',borderRadius:8,background:'#f8fafc',flexShrink:0}}/>}
                          <div style={{flex:1,minWidth:0}}>
                            <div style={{fontWeight:700,fontSize:15,marginBottom:2}}>{r.title}</div>
                            <div style={{fontSize:12,color:'var(--muted)',marginBottom:8}}>{[r.brand,r.colorway,r.styleId].filter(Boolean).join(' · ')}</div>
                            <div style={{display:'flex',gap:16,flexWrap:'wrap',marginBottom:10}}>
                              {r.retailPrice&&<div><div style={{fontSize:10,fontWeight:700,textTransform:'uppercase',color:'var(--muted)',letterSpacing:'0.06em'}}>Retail</div><div style={{fontWeight:600,fontSize:14}}>{fmt(r.retailPrice)}</div></div>}
                              {r.year&&<div><div style={{fontSize:10,fontWeight:700,textTransform:'uppercase',color:'var(--muted)',letterSpacing:'0.06em'}}>Year</div><div style={{fontWeight:600,fontSize:14}}>{r.year}</div></div>}
                              {r.styleId&&<div><div style={{fontSize:10,fontWeight:700,textTransform:'uppercase',color:'var(--muted)',letterSpacing:'0.06em'}}>SKU</div><div style={{fontWeight:600,fontSize:14}}>{r.styleId}</div></div>}
                            </div>
                            <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                              {r.links?.goat&&<a href={r.links.goat} target="_blank" rel="noopener noreferrer" className="btn sm" style={{textDecoration:'none',fontSize:11}}>GOAT ↗</a>}
                              {r.links?.stockX&&<a href={r.links.stockX} target="_blank" rel="noopener noreferrer" className="btn sm" style={{textDecoration:'none',fontSize:11}}>StockX ↗</a>}
                              <a href={`https://www.ebay.co.uk/sch/i.html?_nkw=${encodeURIComponent((r.title||'')+(r.styleId?` ${r.styleId}`:''))}`} target="_blank" rel="noopener noreferrer" className="btn sm" style={{textDecoration:'none',fontSize:11}}>eBay ↗</a>
                              <a href={`https://www.google.com/search?q=${encodeURIComponent((r.title||'')+' price UK')}`} target="_blank" rel="noopener noreferrer" className="btn sm" style={{textDecoration:'none',fontSize:11}}>Google ↗</a>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {skuResults&&skuResults.length===0&&!skuError&&(
                  <div>
                    <div className="empty" style={{marginBottom:20}}><div className="empty-icon">🔍</div><div className="empty-title">No results found</div><div style={{marginTop:6}}>Try a different SKU or product name</div></div>
                  </div>
                )}
                {(skuResults!==null||skuError)&&(
                  <div className="chart-card" style={{marginTop:16}}>
                    <div style={{fontWeight:600,fontSize:13,marginBottom:12}}>Search manually on platforms</div>
                    <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                      {[
                        {label:'StockX',url:`https://www.stockx.com/search?s=${encodeURIComponent(skuQuery)}`},
                        {label:'GOAT',url:`https://www.goat.com/search?query=${encodeURIComponent(skuQuery)}`},
                        {label:'Laced',url:`https://www.laced.co.uk/products?q=${encodeURIComponent(skuQuery)}`},
                        {label:'Klekt',url:`https://www.klekt.com/search?q=${encodeURIComponent(skuQuery)}`},
                        {label:'eBay',url:`https://www.ebay.co.uk/sch/i.html?_nkw=${encodeURIComponent(skuQuery)}`},
                        {label:'Google',url:`https://www.google.com/search?q=${encodeURIComponent(skuQuery+' price UK')}`},
                      ].map(l=><a key={l.label} href={l.url} target="_blank" rel="noopener noreferrer" className="btn sm" style={{textDecoration:'none'}}>{l.label} ↗</a>)}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {page==='expenses'&&(
          <div>
            <div className="page-header" style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
              <div><h1 className="page-title">Expenses</h1><p className="page-subtitle">Track business costs for tax purposes</p></div>
              <button className="btn primary" onClick={()=>{setShowExpenseForm(true);setExpenseForm({date:new Date().toISOString().slice(0,10),amount:'',category:'Packaging',description:''})}}>+ Add expense</button>
            </div>
            {showExpenseForm&&(
              <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setShowExpenseForm(false)}>
                <div className="modal" style={{maxWidth:480}}>
                  <div className="modal-title">New expense</div>
                  <div className="form-grid">
                    <div className="form-group">
                      <label className="form-label">Date</label>
                      <input className="form-input" type="date" value={expenseForm.date} onChange={e=>setExpenseForm(f=>({...f,date:e.target.value}))}/>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Amount (£)</label>
                      <input className="form-input" type="number" step="0.01" min="0" placeholder="0.00" value={expenseForm.amount} onChange={e=>setExpenseForm(f=>({...f,amount:e.target.value}))} autoFocus/>
                    </div>
                    <div className="form-group full">
                      <label className="form-label">Category</label>
                      <select className="form-input" value={expenseForm.category} onChange={e=>setExpenseForm(f=>({...f,category:e.target.value}))}>
                        {EXPENSE_CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div className="form-group full">
                      <label className="form-label">Description</label>
                      <input className="form-input" placeholder="e.g. Bubble wrap rolls x 200" value={expenseForm.description} onChange={e=>setExpenseForm(f=>({...f,description:e.target.value}))}/>
                    </div>
                  </div>
                  <div className="form-actions">
                    <button className="btn" onClick={()=>setShowExpenseForm(false)}>Cancel</button>
                    <button className="btn primary" onClick={saveExpense} disabled={expenseSaving||!expenseForm.date||!expenseForm.amount}>{expenseSaving?'Saving...':'Save expense'}</button>
                  </div>
                </div>
              </div>
            )}
            {expensesLoading?<div className="loading">Loading...</div>:expenses.length===0?(
              <div className="empty"><div className="empty-icon">🧾</div><div className="empty-title">No expenses logged</div><div style={{marginTop:6}}>Track packaging, subscriptions, and other business costs</div></div>
            ):(
              <div>
                <div className="stats-bar" style={{marginBottom:20}}>
                  {(()=>{
                    const now = new Date()
                    const thisMonthKey = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`
                    const txYearStart = now.getMonth()>=3?now.getFullYear():now.getFullYear()-1
                    const txStart = new Date(txYearStart,3,6); const txEnd = new Date(txYearStart+1,3,5,23,59,59)
                    const monthTotal = expenses.filter(e=>e.date&&e.date.slice(0,7)===thisMonthKey).reduce((s,e)=>s+(e.amount||0),0)
                    const yearTotal = expenses.filter(e=>{const d=new Date(e.date);return d>=txStart&&d<=txEnd}).reduce((s,e)=>s+(e.amount||0),0)
                    const byCategory = {}
                    expenses.forEach(e=>{if(!byCategory[e.category])byCategory[e.category]=0;byCategory[e.category]+=(e.amount||0)})
                    const topCat = Object.entries(byCategory).sort((a,b)=>b[1]-a[1])[0]
                    return <>
                      <div className="stat-card"><div className="stat-label">This month</div><div className="stat-value neg">−{fmt(monthTotal)}</div></div>
                      <div className="stat-card"><div className="stat-label">This tax year</div><div className="stat-value neg">−{fmt(yearTotal)}</div></div>
                      <div className="stat-card"><div className="stat-label">Total logged</div><div className="stat-value neg">−{fmt(expenses.reduce((s,e)=>s+(e.amount||0),0))}</div></div>
                      {topCat&&<div className="stat-card"><div className="stat-label">Top category</div><div className="stat-value" style={{fontSize:14}}>{topCat[0]}</div></div>}
                    </>
                  })()}
                </div>
                <div className="chart-card">
                  <table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}>
                    <thead><tr style={{borderBottom:'2px solid var(--border)'}}><th style={{textAlign:'left',padding:'8px 0',color:'var(--muted)',fontWeight:600}}>Date</th><th style={{textAlign:'left',padding:'8px 0',color:'var(--muted)',fontWeight:600}}>Category</th><th style={{textAlign:'left',padding:'8px 0',color:'var(--muted)',fontWeight:600}}>Description</th><th style={{textAlign:'right',padding:'8px 0',color:'var(--muted)',fontWeight:600}}>Amount</th><th style={{padding:'8px 0'}}></th></tr></thead>
                    <tbody>
                      {expenses.map(e=>(
                        <tr key={e.id} style={{borderBottom:'1px solid var(--border)'}}>
                          <td style={{padding:'10px 8px 10px 0',color:'var(--muted)'}}>{e.date}</td>
                          <td style={{padding:'10px 8px'}}><span style={{background:'var(--surface2)',borderRadius:4,padding:'2px 8px',fontSize:11}}>{e.category}</span></td>
                          <td style={{padding:'10px 8px',color:'var(--text)'}}>{e.description||'—'}</td>
                          <td style={{padding:'10px 0 10px 8px',textAlign:'right',fontWeight:600,color:'var(--red)'}}>−{fmt(e.amount)}</td>
                          <td style={{padding:'10px 0 10px 8px',textAlign:'right'}}><button className="btn sm danger" onClick={()=>deleteExpense(e.id)}>Delete</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
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
                        <div className="item-card-stat"><div className="item-card-stat-label">P&L</div><div className={`item-card-stat-value ${plColor(pl)}`}>{revenue > 0 ? fmt(pl) : '—'}</div></div>
                        <div className="item-card-stat"><div className="item-card-stat-label">{isBreak?'Price/spot':'Price/pack'}</div><div className="item-card-stat-value">{fmt(isBreak?b.spot_price:b.pack_price)}</div></div>
                      </div>
                      <div className="item-card-actions">
                        <button className="btn sm" style={{flex:1}} onClick={()=>openEditBreak(b)}>Edit</button>
                        {b.type==='break'&&<button className="btn sm" onClick={()=>{ setSlotsBreak(b); fetchBreakSpots(b.id) }}>Spots</button>}
                        <button className="btn sm success" onClick={()=>{ setViewingBreak(b); fetchBreakCards(b.id) }}>Inventory</button>
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

      {/* Break Spots Modal */}
      {slotsBreak&&(
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setSlotsBreak(null)}>
          <div className="modal" style={{maxWidth:560}}>
            <div className="modal-title">Break Spots</div>
            <div style={{fontSize:13,color:'var(--muted)',marginTop:-12,marginBottom:16}}>{slotsBreak.name||'Box Break'} · {breakSpots.filter(s=>s.paid).length}/{breakSpots.length} paid</div>

            {/* Add spot form */}
            <div style={{display:'flex',gap:8,marginBottom:16,flexWrap:'wrap'}}>
              <input className="form-input" style={{flex:'1 1 140px',margin:0}} placeholder="Buyer name *" value={spotForm.buyer_name} onChange={e=>setSpotForm(f=>({...f,buyer_name:e.target.value}))} onKeyDown={e=>e.key==='Enter'&&saveSpot()}/>
              <input className="form-input" style={{flex:'1 1 120px',margin:0}} placeholder="Notes (optional)" value={spotForm.notes} onChange={e=>setSpotForm(f=>({...f,notes:e.target.value}))}/>
              <button className="btn primary sm" onClick={saveSpot} disabled={spotsSaving||!spotForm.buyer_name.trim()}>+ Add spot</button>
            </div>

            {/* Spots list */}
            {breakSpots.length===0?(
              <div style={{textAlign:'center',padding:'24px',color:'var(--muted)',fontSize:13}}>No spots added yet — add your first buyer above</div>
            ):(
              <div className="batch-units">
                {breakSpots.map(spot=>(
                  <div key={spot.id} className="batch-unit-row" style={{background:spot.paid?'#f0fdf4':'var(--surface)'}}>
                    <div style={{display:'flex',alignItems:'center',gap:8,flex:1,minWidth:0}}>
                      <input type="checkbox" checked={!!spot.paid} onChange={()=>toggleSpotPaid(spot)} style={{cursor:'pointer',accentColor:'var(--accent)'}}/>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontWeight:500,fontSize:13}}>{spot.buyer_name}</div>
                        {spot.notes&&<div style={{fontSize:11,color:'var(--muted)'}}>{spot.notes}</div>}
                      </div>
                    </div>
                    <div style={{display:'flex',alignItems:'center',gap:8}}>
                      <span style={{fontSize:11,fontWeight:600,color:spot.paid?'var(--green)':'var(--amber)'}}>{spot.paid?'✓ Paid':'Pending'}</span>
                      <button className="btn sm danger" onClick={()=>deleteSpot(spot.id)}>Del</button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {breakSpots.length > 0 && (
              <div style={{marginTop:12,padding:'10px 14px',background:'var(--surface2)',borderRadius:'var(--radius)',border:'1px solid var(--border)',display:'flex',justifyContent:'space-between',fontSize:13}}>
                <span style={{color:'var(--muted)'}}>{breakSpots.filter(s=>s.paid).length} of {breakSpots.length} spots paid</span>
                <span style={{fontWeight:600,color:'var(--green)'}}>{fmt((breakSpots.filter(s=>s.paid).length) * (slotsBreak.spot_price||0))}</span>
              </div>
            )}

            <div className="form-actions" style={{marginTop:16}}>
              <button className="btn" onClick={()=>setSlotsBreak(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Collector Add/Edit Modal */}
      {showCollectorAdd&&(
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setShowCollectorAdd(false)}>
          <div className="modal">
            <div className="modal-title">{editCollectorItem?'Edit collection item':'Add to collection'}</div>
            <div className="form-grid">
              <div className="form-group full">
                <label className="form-label">Category *</label>
                <select className="form-input" value={collectorForm.category} onChange={e=>setCollectorForm(f=>({...f,category:e.target.value,pokemon_type:'',units:[{...EMPTY_UNIT}]}))}>
                  <option value="">Select category</option>
                  {['Sneakers','Pokémon','Topps','Lego','Clothing','Miscellaneous'].map(c=><option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              {collectorForm.category&&<>
                <div className="form-group full">
                  <label className="form-label">Condition</label>
                  <select className="form-input" value={collectorForm.item_condition} onChange={e=>setCollectorForm(f=>({...f,item_condition:e.target.value}))}>
                    <option value="">Select condition</option>
                    {(collectorForm.category==='Sneakers'?COLLECTOR_SNEAKER_CONDITIONS:
                      collectorForm.category==='Pokémon'?COLLECTOR_POKEMON_CONDITIONS:
                      collectorForm.category==='Miscellaneous'?COLLECTOR_MISC_CONDITIONS:
                      COLLECTOR_MISC_CONDITIONS
                    ).map(c=><option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <CategoryForm form={collectorForm} setForm={setCollectorForm} editItem={editCollectorItem} updateUnit={(i,field,value)=>setCollectorForm(f=>{const units=[...f.units];units[i]={...units[i],[field]:value};return{...f,units}})} addUnit={()=>setCollectorForm(f=>({...f,units:[...f.units,{...EMPTY_UNIT}]}))} removeUnit={(i)=>setCollectorForm(f=>({...f,units:f.units.filter((_,idx)=>idx!==i)}))}/>
              </>}
            </div>
            {collectorError&&<div style={{color:'#e53e3e',fontSize:13,marginTop:8}}>Error: {collectorError}</div>}
            <div className="form-actions">
              <button className="btn" onClick={()=>{setShowCollectorAdd(false);setEditCollectorItem(null);setCollectorForm({...EMPTY_FORM});setCollectorError('')}}>Cancel</button>
              <button className="btn primary" onClick={saveCollectorItem} disabled={collectorSaving||!collectorForm.category}>{collectorSaving?'Saving...':editCollectorItem?'Save changes':'Add to collection'}</button>
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
              {form.category&&<>
                {form.category!=='Pokémon'&&form.category!=='Topps'&&<div className="form-group full">
                  <label className="form-label">Condition</label>
                  <select className="form-input" value={form.item_condition} onChange={e=>setForm(f=>({...f,item_condition:e.target.value}))}>
                    {ITEM_CONDITIONS.map(c=><option key={c} value={c}>{c}</option>)}
                  </select>
                </div>}
                <CategoryForm form={form} setForm={setForm} editItem={editItem} updateUnit={updateUnit} addUnit={addUnit} removeUnit={removeUnit}/>
                {!editItem&&<div className="form-group">
                  <label className="form-label">Shipping cost (£)</label>
                  <input className="form-input" type="number" step="0.01" placeholder="0.00 (added to unit cost)" value={form.shipping_cost||''} onChange={e=>setForm(f=>({...f,shipping_cost:e.target.value}))}/>
                </div>}
                <div className="form-group">
                  <label className="form-label">Target sell price (£)</label>
                  <input className="form-input" type="number" step="0.01" placeholder="0.00 (optional)" value={form.target_price||''} onChange={e=>setForm(f=>({...f,target_price:e.target.value}))}/>
                </div>
                <div className="form-group">
                  <label className="form-label">Storage location</label>
                  <input className="form-input" placeholder="e.g. Shelf A, Box 3 (optional)" value={form.storage_location||''} onChange={e=>setForm(f=>({...f,storage_location:e.target.value}))}/>
                </div>
              </>}
            </div>
            {!form.category&&<div style={{color:'var(--muted)',fontSize:13,textAlign:'center',padding:'16px 0'}}>Select a category to continue</div>}
            {editItem&&(
              <label className="metrics-checkbox" style={{marginTop:12,borderColor:form.long_term?'#6366f1':'var(--border)',color:form.long_term?'#6366f1':'var(--text2)'}}>
                <input type="checkbox" checked={!!form.long_term} onChange={e=>setForm(f=>({...f,long_term:e.target.checked}))}/>
                📌 Long-term hold — disable the 21-day stale warning for this item
              </label>
            )}
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
              {batchModal.units[0]?.target_price&&<span className="detail-tag"><span className="detail-tag-label">Target</span>{fmt(batchModal.units[0].target_price)}</span>}
            </div>
            {batchModal.notes&&<div className="detail-notes">📝 {batchModal.notes}</div>}
            {(()=>{
              const q = encodeURIComponent([batchModal.brand, batchModal.style, batchModal.colourway, batchModal.sku].filter(Boolean).join(' '))
              const cat = batchModal.category
              const links = []
              if (cat==='Sneakers') { links.push({label:'StockX',url:`https://www.stockx.com/search?s=${q}`},{label:'eBay',url:`https://www.ebay.co.uk/sch/i.html?_nkw=${q}`}) }
              else if (cat==='Pokémon') { links.push({label:'TCGPlayer',url:`https://www.tcgplayer.com/search/pokemon/product?q=${q}`},{label:'eBay',url:`https://www.ebay.co.uk/sch/i.html?_nkw=${q}`}) }
              else if (cat==='Topps') { links.push({label:'eBay',url:`https://www.ebay.co.uk/sch/i.html?_nkw=${q}`},{label:'TCGPlayer',url:`https://www.tcgplayer.com/search/all/product?q=${q}`}) }
              else if (cat==='Lego') { links.push({label:'BrickLink',url:`https://www.bricklink.com/v2/search.page?q=${q}`},{label:'eBay',url:`https://www.ebay.co.uk/sch/i.html?_nkw=${q}`}) }
              else { links.push({label:'eBay',url:`https://www.ebay.co.uk/sch/i.html?_nkw=${q}`}) }
              links.push({label:'Google',url:`https://www.google.com/search?q=${q}+price+UK`})
              return <div style={{display:'flex',gap:8,flexWrap:'wrap',margin:'12px 0'}}>
                <span style={{fontSize:11,color:'var(--muted)',alignSelf:'center'}}>Search:</span>
                {links.map(l=><a key={l.label} href={l.url} target="_blank" rel="noopener noreferrer" className="btn sm" style={{textDecoration:'none'}}>{l.label} ↗</a>)}
              </div>
            })()}
            <div className="detail-units-title">Units</div>
            <div className="batch-units">
              {(()=>{
                const groups = {}
                batchModal.units.forEach(u => {
                  const key = u.size || 'no-size'
                  if (!groups[key]) groups[key] = { size: u.size, inStock: [], sold: [] }
                  if (u.status === 'in_stock') groups[key].inStock.push(u)
                  else groups[key].sold.push(u)
                })
                return Object.values(groups).map(g => (
                  <div key={g.size||'no-size'} className="batch-unit-row">
                    <div className="batch-unit-info" style={{flex:1}}>
                      <div className="batch-unit-size">{g.size ? `UK ${g.size}` : 'No size'}</div>
                      <div style={{fontSize:12,color:'var(--muted)',marginTop:2}}>
                        {g.inStock.length > 0 && <span style={{marginRight:8}}>{g.inStock.length} in stock</span>}
                        {g.sold.length > 0 && <span style={{color:'var(--green)'}}>{g.sold.length} sold</span>}
                      </div>
                    </div>
                    <div style={{display:'flex',gap:6,alignItems:'center'}}>
                      {g.inStock.length > 0 && (
                        <button className="btn sm success" onClick={()=>{
                          const ids = g.inStock.map(u => u.id)
                          setSellItem({ ...g.inStock[0], _bulkIds: [g.inStock[0].id], _allIds: ids, _maxQty: ids.length, _sellQty: 1 })
                          setSalePrice(''); setSellingPlatform(''); setPayoutStatus('pending')
                        }}>
                          Sell
                        </button>
                      )}
                      {g.inStock.length > 0 && (()=>{
                        const inCart = orderCart.some(e => e.item.id === g.inStock[0].id)
                        return <button className={`btn sm${inCart?' primary':''}`} onClick={()=>inCart?removeFromOrder(orderCart.find(e=>e.item.id===g.inStock[0].id)?.cartId):addToOrder(g.inStock[0])}>{inCart?'✓ Order':'📋 Order'}</button>
                      })()}
                      <button className="btn sm" onClick={()=>{openEdit(g.inStock[0]||g.sold[0]);setBatchModal(null)}}>Edit</button>
                      <button className="btn sm danger" onClick={()=>{
                        if (!window.confirm(`Delete all ${g.inStock.length} in-stock units of this size?`)) return
                        g.inStock.forEach(u => deleteItem(u.id))
                      }}>Del</button>
                    </div>
                  </div>
                ))
              })()}
            </div>
            <div className="form-actions" style={{marginTop:16}}>
              <button className="btn" onClick={()=>setBatchModal(null)}>Close</button>
              {batchModal.units.some(u=>u.long_term)?(
                <button className="btn" style={{borderColor:'#6366f1',color:'#6366f1'}} onClick={()=>unmarkLongTerm(batchModal)}>📌 Remove long-term hold</button>
              ):(
                <button className="btn" style={{borderColor:'#f59e0b',color:'#d97706'}} onClick={()=>markLongTerm(batchModal)}>📌 Mark as long-term hold</button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Order Modal */}
      {showOrderModal&&(
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setShowOrderModal(false)}>
          <div className="modal" style={{maxWidth:680}}>
            <div className="modal-title">Order — {orderCart.length} item{orderCart.length!==1?'s':''}</div>

            {/* Shared order settings */}
            <div style={{display:'flex',gap:12,marginBottom:16,flexWrap:'wrap',padding:'12px 16px',background:'var(--surface2)',borderRadius:'var(--radius)',border:'1px solid var(--border)'}}>
              <div className="form-group" style={{margin:0,flex:'1 1 180px'}}>
                <label className="form-label">Platform & fees</label>
                <select className="form-input" style={{margin:0}} value={orderPlatform?.id||''} onChange={e=>{const p=RESELLER_PLATFORMS.find(p=>p.id===e.target.value)||null;setOrderPlatform(p)}}>
                  <option value="">No platform / no fees</option>
                  {RESELLER_PLATFORMS.map(p=><option key={p.id} value={p.id}>{p.name}{p.rate>0?` (${p.rate}%)`:''}</option>)}
                </select>
              </div>
              {orderPlatform?.id==='custom'&&(
                <div className="form-group" style={{margin:0,flex:'0 0 100px'}}>
                  <label className="form-label">Custom %</label>
                  <input className="form-input" style={{margin:0}} type="number" step="0.1" placeholder="e.g. 10" value={orderCustomRate} onChange={e=>setOrderCustomRate(e.target.value)}/>
                </div>
              )}
              <div className="form-group" style={{margin:0,flex:'1 1 140px'}}>
                <label className="form-label">Buyer name</label>
                <input className="form-input" style={{margin:0}} placeholder="e.g. John Smith" value={orderBuyerName} onChange={e=>setOrderBuyerName(e.target.value)}/>
              </div>
              <div className="form-group" style={{margin:0,flex:'1 1 140px'}}>
                <label className="form-label">Payout status</label>
                <select className="form-input" style={{margin:0}} value={orderPayoutStatus} onChange={e=>setOrderPayoutStatus(e.target.value)}>
                  <option value="pending">⏳ Pending</option>
                  <option value="paid">✅ Paid out</option>
                </select>
              </div>
            </div>

            {/* Per-item table */}
            <div style={{overflowX:'auto',marginBottom:16}}>
              <table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}>
                <thead>
                  <tr style={{borderBottom:'2px solid var(--border)',fontSize:11,color:'var(--muted)',fontWeight:700}}>
                    <th style={{textAlign:'left',padding:'6px 8px 6px 0'}}>Item</th>
                    <th style={{textAlign:'right',padding:'6px 8px',width:52}}>Qty</th>
                    <th style={{textAlign:'right',padding:'6px 8px',width:60}}>Cost</th>
                    <th style={{textAlign:'right',padding:'6px 8px',width:110}}>Unit price (£)</th>
                    <th style={{textAlign:'right',padding:'6px 8px',width:70}}>Fee</th>
                    <th style={{textAlign:'right',padding:'6px 0',width:80}}>Profit</th>
                    <th style={{width:28}}></th>
                  </tr>
                </thead>
                <tbody>
                  {orderCart.map(entry=>{
                    const price = parseFloat(entry.unitPrice)||0
                    const fee = calcFee(entry.unitPrice, orderPlatform, orderCustomRate)
                    const profit = (price - (entry.item.purchase_price||0) - fee) * entry.qty
                    return (
                      <tr key={entry.cartId} style={{borderBottom:'1px solid var(--surface2)'}}>
                        <td style={{padding:'8px 8px 8px 0'}}>
                          <div style={{fontWeight:500}}>{entry.item.brand} {entry.item.style}</div>
                          <div style={{fontSize:11,color:'var(--muted)'}}>{[entry.item.colourway,entry.item.size?`UK ${entry.item.size}`:null].filter(Boolean).join(' · ')}</div>
                        </td>
                        <td style={{padding:'8px'}}>
                          {entry.maxQty > 1 ? (
                            <input className="form-input" style={{margin:0,textAlign:'right',width:44,padding:'4px 6px',fontSize:12}} type="number" min="1" max={entry.maxQty} value={entry.qty} onChange={e=>updateOrderQty(entry.cartId,e.target.value)}/>
                          ) : (
                            <span style={{textAlign:'right',display:'block',color:'var(--muted)'}}>1</span>
                          )}
                        </td>
                        <td style={{padding:'8px',textAlign:'right',color:'var(--muted)'}}>{fmt(entry.item.purchase_price)}</td>
                        <td style={{padding:'8px'}}>
                          <input className="form-input" style={{margin:0,textAlign:'right',width:90,padding:'4px 8px'}} type="number" step="0.01" placeholder="0.00" value={entry.unitPrice} onChange={e=>updateOrderPrice(entry.cartId,e.target.value)} autoFocus={orderCart.indexOf(entry)===0}/>
                        </td>
                        <td style={{padding:'8px',textAlign:'right',fontSize:12,color:'var(--muted)'}}>{price>0&&fee>0?`-${fmt(fee)}`:'—'}</td>
                        <td style={{padding:'8px 0',textAlign:'right',fontWeight:600}}><span className={price>0?(profit>=0?'td-pos':'td-neg'):''}>{price>0?fmt(profit):'—'}</span></td>
                        <td style={{padding:'8px 0',textAlign:'right'}}><button onClick={()=>removeFromOrder(entry.cartId)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--muted)',fontSize:16,lineHeight:1}}>✕</button></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Order totals */}
            {(()=>{
              const totalRevenue = orderCart.reduce((s,e)=>{const p=parseFloat(e.unitPrice)||0;return s+p*e.qty},0)
              const totalCost = orderCart.reduce((s,e)=>s+(e.item.purchase_price||0)*e.qty,0)
              const totalFees = orderCart.reduce((s,e)=>{const f=calcFee(e.unitPrice,orderPlatform,orderCustomRate);return s+f*e.qty},0)
              const totalProfit = totalRevenue - totalCost - totalFees
              return (
                <div style={{borderTop:'2px solid var(--border)',paddingTop:12,marginBottom:16}}>
                  <div style={{display:'flex',justifyContent:'flex-end'}}>
                    <div style={{width:320}}>
                      <div style={{display:'flex',justifyContent:'space-between',fontSize:13,marginBottom:6}}><span style={{color:'var(--muted)'}}>Total revenue</span><span style={{fontWeight:500}}>{fmt(totalRevenue)}</span></div>
                      {totalFees>0&&<div style={{display:'flex',justifyContent:'space-between',fontSize:13,marginBottom:6}}><span style={{color:'var(--muted)'}}>Total fees</span><span style={{color:'var(--muted)'}}>-{fmt(totalFees)}</span></div>}
                      <div style={{display:'flex',justifyContent:'space-between',fontSize:13,marginBottom:6}}><span style={{color:'var(--muted)'}}>Total cost</span><span style={{color:'var(--muted)'}}>-{fmt(totalCost)}</span></div>
                      <div style={{display:'flex',justifyContent:'space-between',fontSize:16,fontWeight:700,borderTop:'1px solid var(--border)',paddingTop:8}}><span>Net profit</span><span className={totalProfit>=0?'td-pos':'td-neg'}>{fmt(totalProfit)}</span></div>
                    </div>
                  </div>
                </div>
              )
            })()}

            <div className="form-actions">
              <button className="btn" onClick={()=>setShowOrderModal(false)}>Cancel</button>
              <button className="btn primary" onClick={confirmOrder} disabled={saving||orderCart.every(e=>!e.unitPrice)}>{saving?'Saving...':'Confirm order'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Sell Modal */}
      {sellItem&&(
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&resetSellModal()}>
          <div className="modal">
            <div className="modal-title">{sellItem._editMode ? 'Edit sale details' : sellItem._bulkIds ? 'Sell units' : 'Mark as sold'}</div>
            <div className="sell-info">
              <strong>{sellItem.brand} {sellItem.style}</strong>
              {sellItem.colourway&&` — ${sellItem.colourway}`}
              {sellItem.size&&` · Size ${sellItem.size}`}
              <div style={{marginTop:4}}>Cost price: <strong>{fmt(sellItem.purchase_price)}</strong>{sellItem.target_price&&<span style={{marginLeft:12,color:'var(--muted)',fontSize:13}}>Target: <strong>{fmt(sellItem.target_price)}</strong></span>}</div>
            </div>
            {sellItem._bulkIds&&(
              <div className="form-group" style={{marginBottom:8}}>
                <label className="form-label">Quantity to sell (max {sellItem._maxQty})</label>
                <input className="form-input" type="number" min="1" max={sellItem._maxQty} value={sellItem._sellQty||1} onChange={e=>{const q=Math.min(parseInt(e.target.value)||1,sellItem._maxQty);setSellItem(s=>({...s,_bulkIds:s._allIds.slice(0,q),_sellQty:q}))}}/>
              </div>
            )}
            <div className="form-group">
              <label className="form-label">Sale price (£)</label>
              <input className="form-input" type="number" step="0.01" placeholder="0.00" value={salePrice} onChange={e=>setSalePrice(e.target.value)} autoFocus/>
            </div>
            <div className="form-group" style={{marginTop:12}}>
              <label className="form-label">Selling platform & fees</label>
              <select className="form-input" value={sellFeeplatform?.id||''} onChange={e=>{
                const p = RESELLER_PLATFORMS.find(p=>p.id===e.target.value)||null
                setSellFeeplatform(p)
                if(p) setSellingPlatform(p.name)
              }}>
                <option value="">Select platform</option>
                {RESELLER_PLATFORMS.map(p=><option key={p.id} value={p.id}>{p.name}{p.rate>0?` (${p.rate}%${p.fixed?` + £${p.fixed}`:''})`:p.type==='fixed'?` (£${p.fixed} fixed)`:' (0%)'}</option>)}
              </select>
            </div>
            {sellFeeplatform?.id==='custom'&&(
              <div className="form-group" style={{marginTop:8}}>
                <label className="form-label">Custom fee %</label>
                <input className="form-input" type="number" step="0.1" placeholder="e.g. 10" value={customFeeRate} onChange={e=>setCustomFeeRate(e.target.value)}/>
              </div>
            )}
            <div className="form-group" style={{marginTop:8}}>
              <label className="form-label">Postage / shipping (£)</label>
              <input className="form-input" type="number" step="0.01" placeholder="0.00 (optional)" value={shippingFee} onChange={e=>setShippingFee(e.target.value)}/>
            </div>
            <div className="form-group" style={{marginTop:8}}>
              <label className="form-label">Buyer name (optional)</label>
              <input className="form-input" placeholder="e.g. John Smith" value={buyerName} onChange={e=>setBuyerName(e.target.value)}/>
            </div>
            <div className="form-group" style={{marginTop:8}}>
              <label className="form-label">Date sold</label>
              <input className="form-input" type="date" value={soldDate} onChange={e=>setSoldDate(e.target.value)}/>
            </div>
            {salePrice&&(()=>{
              const price = parseFloat(salePrice)||0
              const fee = calcFee(salePrice, sellFeeplatform, customFeeRate)
              const ship = parseFloat(shippingFee)||0
              const netSale = price - fee - ship
              const pl = netSale - (sellItem.purchase_price||0)
              return (
                <div className="fee-breakdown">
                  <div className="fee-row"><span>Sale price</span><span>{fmt(price)}</span></div>
                  {fee>0&&<div className="fee-row fee-deduct"><span>Platform fee</span><span>-{fmt(fee)}</span></div>}
                  {ship>0&&<div className="fee-row fee-deduct"><span>Postage</span><span>-{fmt(ship)}</span></div>}
                  <div className="fee-row"><span>Net proceeds</span><span>{fmt(netSale)}</span></div>
                  <div className="fee-row"><span>Cost</span><span>-{fmt(sellItem.purchase_price)}</span></div>
                  <div className={`fee-row fee-total ${pl>=0?'pos':'neg'}`}><span>Profit</span><span>{fmt(pl)}</span></div>
                </div>
              )
            })()}
            <div style={{marginTop:16}}>
              <label className="form-label" style={{marginBottom:8,display:'block'}}>Payout Status</label>
              <div className="type-toggle">
                <button className={`type-btn ${payoutStatus==='pending'?'active':''}`} onClick={()=>setPayoutStatus('pending')}>⏳ Pending</button>
                <button className={`type-btn ${payoutStatus==='paid'?'active':''}`} onClick={()=>setPayoutStatus('paid')}>✅ Paid out</button>
              </div>
            </div>
            <div className="form-actions" style={{marginTop:16}}>
              <button className="btn" onClick={resetSellModal}>Cancel</button>
              <button className="btn primary" onClick={markSold} disabled={saving||!salePrice}>{saving?'Saving...':sellItem._editMode?'Save changes':'Confirm sale'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}