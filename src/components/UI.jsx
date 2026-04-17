import React from 'react'

// ── Instrument color helper ──
export function instrColor(instrument) {
  if (!instrument) return '#9498A8'
  const s = instrument.toLowerCase()
  if (s.includes('гитар')) return '#4A7EC7'
  if (s.includes('вокал')) return '#C7627A'
  if (s.includes('барабан')) return '#E08A3C'
  if (s.includes('фортеп') || s.includes('пиан')) return '#3BA676'
  if (s.includes('скрип')) return '#8B6CC7'
  if (s.includes('перкус')) return '#C7A83C'
  if (s.includes('укулел')) return '#5CAAC7'
  return '#9498A8'
}

// ── Constants ──
export const INSTRUMENTS = ['Гитара','Вокал','Барабаны','Фортепиано','Скрипка','Перкуссия','Укулеле']
export const BRANCHES = ['Ганди 44','Ганди 29']
export const HOURS = [8,9,10,11,12,13,14,15,16,17,18,19,20,21]
export const MONTHS_RU = ['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря']
export const DAYS_FULL = ['Воскресенье','Понедельник','Вторник','Среда','Четверг','Пятница','Суббота']

export function formatDate(d) {
  return `${d.getDate()} ${MONTHS_RU[d.getMonth()]}, ${DAYS_FULL[d.getDay()]}`
}
export function dateStr(d) { return d.toISOString().split('T')[0] }
export function addDays(d, n) { const r = new Date(d); r.setDate(r.getDate()+n); return r }

export const attLabel = a => ({present:'Был',late:'Опоздал',absent:'Не был',cancelled:'Отменён'}[a] || '—')
export const attColor = a => ({present:'#3BA676',late:'#E08A3C',absent:'#D4574E',cancelled:'#9498A8'}[a] || '#9498A8')

// ── Badge ──
export function Badge({ children, color = '#D4A03A' }) {
  return (
    <span style={{
      display:'inline-flex', alignItems:'center', padding:'2px 8px',
      borderRadius:10, fontSize:10.5, fontWeight:600, letterSpacing:0.2,
      background: color + '14', color
    }}>{children}</span>
  )
}

// ── Avatar ──
export function Avatar({ name, size = 32, color = '#D4A03A' }) {
  return (
    <div style={{
      width:size, height:size, borderRadius:size/2,
      background: color+'18', display:'flex', alignItems:'center', justifyContent:'center',
      fontSize:size*0.38, fontWeight:700, color, flexShrink:0, letterSpacing:0.5
    }}>
      {(name||'?')[0].toUpperCase()}
    </div>
  )
}

// ── Stat Card ──
export function Stat({ label, value, sub, accent }) {
  return (
    <div style={{
      background:'var(--card)', borderRadius:'var(--radius)', border:'1px solid var(--line)',
      padding:'16px 18px', boxShadow:'var(--shadow-1)'
    }}>
      <div style={{ fontSize:10.5, fontWeight:600, color:'var(--ink-muted)', textTransform:'uppercase', letterSpacing:0.8 }}>{label}</div>
      <div style={{ fontSize:26, fontWeight:700, color:accent||'var(--ink)', marginTop:2, fontFamily:'var(--font-display)' }}>{value}</div>
      {sub && <div style={{ fontSize:11, color:'var(--ink-muted)', marginTop:1 }}>{sub}</div>}
    </div>
  )
}

// ── Spinner ──
export function Spinner() {
  return (
    <div style={{ display:'flex', justifyContent:'center', padding:40 }}>
      <div style={{
        width:28, height:28, border:'3px solid var(--line)',
        borderTopColor:'var(--gold)', borderRadius:'50%', animation:'spin 0.8s linear infinite'
      }} />
    </div>
  )
}

// ── Empty State ──
export function Empty({ title, sub }) {
  return (
    <div style={{ textAlign:'center', padding:'48px 20px', color:'var(--ink-muted)' }}>
      <div style={{ fontSize:15, fontWeight:700, marginBottom:4 }}>{title}</div>
      {sub && <div style={{ fontSize:13, color:'var(--ink-faint)' }}>{sub}</div>}
    </div>
  )
}

// ── Modal ──
export function Modal({ title, onClose, children, width = 520 }) {
  return (
    <div onClick={onClose} style={{
      position:'fixed', inset:0, background:'rgba(0,0,0,0.4)',
      display:'flex', alignItems:'center', justifyContent:'center',
      zIndex:100, backdropFilter:'blur(4px)', animation:'fadeIn 0.15s ease'
    }}>
      <div onClick={e=>e.stopPropagation()} style={{
        background:'var(--card)', borderRadius:12, padding:28,
        width:'92%', maxWidth:width, maxHeight:'90vh', overflowY:'auto',
        boxShadow:'var(--shadow-3)', animation:'slideUp 0.2s ease'
      }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
          <div style={{ fontSize:18, fontWeight:700, fontFamily:'var(--font-display)' }}>{title}</div>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--ink-faint)', fontSize:18, padding:4 }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  )
}

// ── Field ──
export function Field({ label, children }) {
  return (
    <div style={{ marginBottom:14 }}>
      <div className="field-label">{label}</div>
      {children}
    </div>
  )
}

// ── Detail Panel (slide from right) ──
export function DetailPanel({ title, onClose, children, width = 420 }) {
  return (
    <>
      <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.15)', zIndex:89 }} />
      <div style={{
        position:'fixed', right:0, top:0, bottom:0, width,
        background:'var(--card)', boxShadow:'-4px 0 24px rgba(0,0,0,0.08)',
        zIndex:90, overflowY:'auto', borderLeft:'1px solid var(--line)',
        animation:'slideRight 0.2s ease'
      }}>
        <div style={{
          padding:'18px 22px', borderBottom:'1px solid var(--line)',
          display:'flex', justifyContent:'space-between', alignItems:'center', position:'sticky', top:0, background:'var(--card)', zIndex:1
        }}>
          <div style={{ fontFamily:'var(--font-display)', fontSize:18, fontWeight:700 }}>{title}</div>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--ink-muted)', fontSize:18, padding:4 }}>✕</button>
        </div>
        <div style={{ padding:'16px 22px' }}>
          {children}
        </div>
      </div>
    </>
  )
}

// ── Section inside detail panel ──
export function Section({ title, children }) {
  return (
    <div style={{ marginBottom:18 }}>
      <div style={{
        fontSize:10.5, fontWeight:700, color:'var(--ink-muted)',
        textTransform:'uppercase', letterSpacing:0.8,
        marginBottom:8, borderBottom:'1px solid var(--line)', paddingBottom:6
      }}>{title}</div>
      {children}
    </div>
  )
}

export function InfoRow({ label, value }) {
  return (
    <div style={{ display:'flex', justifyContent:'space-between', padding:'4px 0', fontSize:13 }}>
      <span style={{ color:'var(--ink-soft)' }}>{label}</span>
      <span style={{ fontWeight:600 }}>{value || '—'}</span>
    </div>
  )
}
