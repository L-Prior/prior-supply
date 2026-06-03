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
  { id: 'ebay_private', name: 'eBay (Private)', type: 'fixed', rate: 0.40 },
  { id: 'ebay_business', name: 'eBay (Business)', type: 'percent_plus_fixed', rate: 12.8, fixed: 0.40 },
  { id: 'laced', name: 'Laced', type: 'percent', rate: 15 },
  { id: 'stockx_l1', name: 'StockX — Level 1 (0–11 sales)', type: 'percent', rate: 12 },
  { id: 'stockx_l2', name: 'StockX — Level 2 (12–39 sales)', type: 'percent', rate: 11.5 },
  { id: 'stockx_l3', name: 'StockX — Level 3 (40–799 sales)', type: 'percent', rate: 11 },
  { id: 'stockx_l4', name: 'StockX — Level 4 (800+ sales)', type: 'percent', rate: 10 },
  { id: 'alias', name: 'Alias', type: 'percent', rate: 9.5 },
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
          {!editItem && <button className="btn sm" onClick={addUnit}>{addLabel}</button>}
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
      <div className="form-group full"><div className="units-section"><div className="units-header"><span className="form-label">Sizes & Quantities *</span>{!editItem&&<button className="btn sm" onClick={addUnit}>+ Add Size</button>}</div>{form.units.map((unit,i)=>{
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

function StockChecklist({ items, breaks, onAddItem, onEditItem, onSellItem }) {
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
                    </div>
                  </div>
                  <div className="checklist-col brand">{row.brand}</div>
                  <div className="checklist-col style">{row.style}</div>
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
                        {row.itemId&&(()=>{const item=items.find(i=>i.id===row.itemId);return item&&item.status==='in_stock'?<button className="btn sm success" onClick={()=>{onSellItem(item)}}>Mark sold</button>:null})()}
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

  useEffect(() => { fetchItems(); fetchBreaks() }, [])

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
      const batchUnits = editItem.batch_id ? items.filter(i => i.batch_id === editItem.batch_id) : [editItem]
      const totalUnits = batchUnits.length
      const batchCost = parseFloat(form.batch_total_cost) || 0
      const pricePerUnit = batchCost > 0 && totalUnits > 0 ? parseFloat((batchCost / totalUnits).toFixed(2)) : parseFloat(form.units[0]?.purchase_price) || 0
      const payload = { ...base, purchase_price: pricePerUnit, size: form.units[0]?.size || '', long_term: form.long_term || false }
      ;({ error } = await supabase.from('stock').update(payload).eq('id', editItem.id))
    } else {
      const rows = form.units.flatMap(u => {
        const qty = u.quantity === '10+' ? (parseInt(u.custom_qty) || 1) : (parseInt(u.quantity) || 1)
        const totalUnits = form.units.reduce((s, u2) => {
          const q = u2.quantity === '10+' ? (parseInt(u2.custom_qty)||1) : (parseInt(u2.quantity)||1)
          return s + q
        }, 0)
        const batchCost = parseFloat(form.batch_total_cost) || 0
        const pricePerUnit = batchCost > 0 && totalUnits > 0
          ? parseFloat((batchCost / totalUnits).toFixed(2))
          : parseFloat(u.purchase_price) || 0
        return Array.from({ length: qty }, () => ({ ...base, size: u.size, purchase_price: pricePerUnit }))
      })
      ;({ error } = await supabase.from('stock').insert(rows))
    }
    setSaving(false)
    if (error) { setSaveError(error.message); return }
    setShowAdd(false); setEditItem(null); setForm(EMPTY_FORM); fetchItems()
  }

  function openEdit(item) {
    // Calculate total batch cost from all units in the same batch
    const batchUnits = item.batch_id ? items.filter(i => i.batch_id === item.batch_id) : [item]
    const totalCost = parseFloat(batchUnits.reduce((s, u) => s + (u.purchase_price || 0), 0).toFixed(2))
    const sameSize = batchUnits.filter(u => u.size === item.size)
    const qty = sameSize.length > 1 ? sameSize.length : 1
    setForm({ ...EMPTY_FORM, category: item.category||'', pokemon_type: item.pokemon_type||'', item_condition: item.item_condition||'Brand New', long_term: item.long_term||false, topps_type: item.topps_type||'', topps_card_name: item.topps_card_name||'', topps_set: item.topps_set||'', topps_year: item.topps_year||'', topps_card_number: item.topps_card_number||'', topps_parallel: item.topps_parallel||'', topps_print_run: item.topps_print_run||'', topps_sealed_type: item.topps_sealed_type||'', topps_product_name: item.topps_product_name||'', brand: item.brand||'', style: item.style||'', colourway: item.colourway||'', sku: item.sku||'', card_name: item.card_name||'', set_name: item.set_name||'', card_number: item.card_number||'', condition: item.condition||'', graded: item.graded||false, grading_company: item.grading_company||'', grade: item.grade||'', product_name: item.product_name||'', pokemon_sealed_type: item.pokemon_sealed_type||'', lego_set_name: item.lego_set_name||'', set_number: item.set_number||'', theme: item.theme||'', lego_condition: item.lego_condition||'', clothing_brand: item.clothing_brand||'', item: item.item||'', clothing_size: item.clothing_size||'', colour: item.colour||'', item_name: item.item_name||'', description: item.description||'', purchase_platform: item.purchase_platform||'', purchase_date: item.purchase_date||'', notes: item.notes||'', batch_total_cost: totalCost||'', units: [{ size: item.size||'', purchase_price: item.purchase_price||'', quantity: qty <= 10 ? String(qty) : '10+', custom_qty: qty > 10 ? String(qty) : '' }] })
    setEditItem(item); setShowAdd(true)
  }

  async function deleteItem(id) {
    if (!window.confirm('Delete this item?')) return
    await supabase.from('stock').delete().eq('id', id)
    fetchItems()
    if (batchModal) setBatchModal(prev => ({ ...prev, units: prev.units.filter(u => u.id !== id) }))
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

  async function markSold() {
    setSaving(true)
    const feeAmt = calcFee(salePrice, sellFeeplatform, customFeeRate)
    const platformName = sellFeeplatform ? sellFeeplatform.name : sellingPlatform
    const updatePayload = { status: 'sold', sale_price: parseFloat(salePrice), selling_platform: platformName, fee_amount: feeAmt || null, payout_status: payoutStatus, sold_at: new Date().toISOString() }
    if (sellItem._bulkIds) {
      // Bulk sell — update all units
      const perUnitFee = feeAmt / sellItem._bulkIds.length
      for (const id of sellItem._bulkIds) {
        await supabase.from('stock').update({ ...updatePayload, fee_amount: parseFloat(perUnitFee.toFixed(2)) || null }).eq('id', id)
      }
    } else {
      await supabase.from('stock').update(updatePayload).eq('id', sellItem.id)
    }
    setSaving(false); setSellItem(null); setSalePrice(''); setSellingPlatform(''); setSellFeeplatform(null); setCustomFeeRate(''); setPayoutStatus('pending')
    fetchItems()
    if (batchModal) {
      const ids = sellItem._bulkIds || [sellItem.id]
      const updated = batchModal.units.map(u => ids.includes(u.id) ? { ...u, status: 'sold', sale_price: parseFloat(salePrice), selling_platform: platformName, fee_amount: feeAmt } : u)
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
      const soldPL = sold.reduce((s,i)=>s+((i.sale_price||0)-(i.purchase_price||0)),0)
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
    return { label, pl: parseFloat(pl.toFixed(2)), revenue: parseFloat(revenue.toFixed(2)), cost: parseFloat(cost.toFixed(2)) }
  }), [items, breaks, chartMonths, metricsSources])

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
  const brandData = useMemo(() => { const map = {}; items.filter(i=>i.status==='sold').forEach(i => { const b=i.brand||'Unknown'; if(!map[b])map[b]=0; map[b]+=(i.sale_price||0)-(i.purchase_price||0) }); return Object.entries(map).map(([brand,pl])=>({brand,pl:parseFloat(pl.toFixed(2))})).sort((a,b)=>b.pl-a.pl).slice(0,8) }, [items])
  const avgPLData = useMemo(() => getLast(6).map(({ key, label }) => { const sold = items.filter(i=>i.status==='sold'&&getMonthKey(i.sold_at)===key); const avg = sold.length ? sold.reduce((s,i)=>s+((i.sale_price||0)-(i.purchase_price||0)),0)/sold.length : 0; return { label, avg: parseFloat(avg.toFixed(2)) } }), [items])
  const sellThroughData = useMemo(() => { const map = {}; items.forEach(i => { const cat=i.category||'Other'; if(!map[cat])map[cat]={total:0,sold:0}; map[cat].total++; if(i.status==='sold')map[cat].sold++ }); return Object.entries(map).map(([cat,{total,sold}])=>({cat,rate:parseFloat(((sold/total)*100).toFixed(1))})) }, [items])
  const bestWorst = useMemo(() => { const sold = items.filter(i=>i.status==='sold'&&i.sale_price!=null).map(i=>({...i,pl:(i.sale_price||0)-(i.purchase_price||0)})).sort((a,b)=>b.pl-a.pl); return { best: sold.slice(0,5), worst: sold.slice(-5).reverse() } }, [items])

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

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [toolTab, setToolTab] = useState('fee')
  const [metricsTab, setMetricsTab] = useState('reseller')
  const [userPlan, setUserPlan] = useState('pro') // default pro until Stripe is set up
  const FREE_LIMIT = 30

  useEffect(() => { if (session) fetchProfile() }, [session]) // eslint-disable-line react-hooks/exhaustive-deps
  async function fetchProfile() {
    const { data } = await supabase.from('profiles').select('plan').eq('id', session.user.id).single()
    if (data) setUserPlan(data.plan || 'free')
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
    setCollectorForm({ ...EMPTY_FORM, category: item.category||'', pokemon_type: item.pokemon_type||'', item_condition: item.item_condition||'Brand New', brand: item.brand||'', style: item.style||'', colourway: item.colourway||'', sku: item.sku||'', card_name: item.card_name||'', set_name: item.set_name||'', card_number: item.card_number||'', condition: item.condition||'', graded: item.graded||false, grading_company: item.grading_company||'', grade: item.grade||'', product_name: item.product_name||'', pokemon_sealed_type: item.pokemon_sealed_type||'', clothing_brand: item.clothing_brand||'', item: item.item||'', colour: item.colour||'', item_name: item.item_name||'', description: item.description||'', purchase_platform: item.purchase_platform||'', purchase_date: item.purchase_date||'', notes: item.notes||'', batch_total_cost: item.purchase_price||'', units: [{ size: item.size||'', purchase_price: item.purchase_price||'', quantity: '1', custom_qty: '' }] })
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
  const NAV_ITEMS = [{id:'home',label:'Home'},{id:'stock',label:'Reseller'},{id:'breaks',label:'Breaker'},{id:'collector',label:'Collector'},{id:'metrics',label:'Metrics'},{id:'tools',label:'Tools'}]

  return (
    <div className="app">
      <div className="topbar">
        <div className="topbar-brand"><span className="brand-mark" />StockTrack</div>
        <nav className="topbar-nav">
          {NAV_ITEMS.map(n=>(
            <button key={n.id} className={`nav-btn ${page===n.id?'active':''}`} onClick={()=>setPage(n.id)}>{n.label}</button>
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
              <button className="btn sm" onClick={signOut}>Sign out</button>
            </div>
            <button className="mobile-menu-btn" onClick={()=>setMobileMenuOpen(o=>!o)}>
              {mobileMenuOpen ? '✕' : '☰'}
            </button>
          </div>
          {mobileMenuOpen && (
            <div className="mobile-menu">
              {NAV_ITEMS.map(n=>(
                <button key={n.id} className={`mobile-menu-item ${page===n.id?'active':''}`} onClick={()=>{setPage(n.id);setMobileMenuOpen(false)}}>
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

        {page==='metrics'&&(
          <div>
            <div className="page-header"><h1 className="page-title">Metrics</h1><p className="page-subtitle">Deep dive into your performance</p></div>

            <div style={{display:'flex',gap:8,marginBottom:24}}>
              <button className={`type-btn ${metricsTab==='reseller'?'active':''}`} onClick={()=>setMetricsTab('reseller')}>Reseller & Breaker</button>
              <button className={`type-btn ${metricsTab==='collector'?'active':''}`} onClick={()=>setMetricsTab('collector')}>Collector</button>
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
            <div style={{display:'flex',gap:8,marginBottom:24}}>
              <button className={`type-btn ${toolTab==='fee'?'active':''}`} onClick={()=>setToolTab('fee')}>Fee Calculator</button>
              <button className={`type-btn ${toolTab==='checklist'?'active':''}`} onClick={()=>setToolTab('checklist')}>Stock Checklist</button>
            </div>
            {toolTab==='fee'&&<FeeCalculator/>}
            {toolTab==='checklist'&&<StockChecklist items={items} breaks={breaks} onAddItem={()=>{setPage('stock');setTimeout(()=>{setForm(EMPTY_FORM);setEditItem(null);setSaveError('');setShowAdd(true)},100)}} onEditItem={(item)=>{openEdit(item)}} onSellItem={(item)=>{setSellItem(item);setSalePrice('');setSellingPlatform('');setPayoutStatus('pending')}}/>}
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
                  {['Sneakers','Pokémon','Clothing','Miscellaneous'].map(c=><option key={c} value={c}>{c}</option>)}
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
            </div>
            {batchModal.notes&&<div className="detail-notes">📝 {batchModal.notes}</div>}
            <div className="detail-units-title">Units</div>
            <div className="batch-units">
              {(()=>{
                const inStock = batchModal.units.filter(u => u.status === 'in_stock')
                const sold = batchModal.units.filter(u => u.status === 'sold')
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
                          setSellItem({ ...g.inStock[0], _bulkIds: ids, _maxQty: ids.length })
                          setSalePrice(''); setSellingPlatform(''); setPayoutStatus('pending')
                        }}>
                          Sell {g.inStock.length > 1 ? `(${g.inStock.length})` : ''}
                        </button>
                      )}
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

      {/* Sell Modal */}
      {sellItem&&(
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setSellItem(null)}>
          <div className="modal">
            <div className="modal-title">{sellItem._bulkIds ? `Sell units` : 'Mark as sold'}</div>
            <div className="sell-info">
              <strong>{sellItem.brand} {sellItem.style}</strong>
              {sellItem.colourway&&` — ${sellItem.colourway}`}
              {sellItem.size&&` · Size ${sellItem.size}`}
              <div style={{marginTop:4}}>Cost price: <strong>{fmt(sellItem.purchase_price)}</strong></div>
            </div>
            {sellItem._bulkIds&&(
              <div className="form-group" style={{marginBottom:8}}>
                <label className="form-label">Quantity to sell (max {sellItem._maxQty})</label>
                <input className="form-input" type="number" min="1" max={sellItem._maxQty} value={sellItem._sellQty||sellItem._maxQty} onChange={e=>{const q=Math.min(parseInt(e.target.value)||1,sellItem._maxQty);setSellItem(s=>({...s,_bulkIds:s._bulkIds.slice(0,q),_sellQty:q}))}}/>
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
            {salePrice&&(()=>{
              const price = parseFloat(salePrice)||0
              const fee = calcFee(salePrice, sellFeeplatform, customFeeRate)
              const netSale = price - fee
              const pl = netSale - (sellItem.purchase_price||0)
              return (
                <div className="fee-breakdown">
                  <div className="fee-row"><span>Sale price</span><span>{fmt(price)}</span></div>
                  {fee>0&&<div className="fee-row fee-deduct"><span>Platform fee</span><span>-{fmt(fee)}</span></div>}
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
              <button className="btn" onClick={()=>{setSellItem(null);setSellFeeplatform(null);setCustomFeeRate('');setPayoutStatus('pending')}}>Cancel</button>
              <button className="btn primary" onClick={markSold} disabled={saving||!salePrice}>{saving?'Saving...':'Confirm sale'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}