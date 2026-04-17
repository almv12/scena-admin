import React from 'react'
import { BRANCHES } from './UI'

const TITLES = {
  schedule:'Расписание', students:'Ученики', teachers:'Педагоги',
  approve:'Проверка уроков', analytics:'Аналитика', finance:'Финансы',
  broadcast:'Рассылка', settings:'Настройки'
}

export default function TopBar({ page, branch, setBranch }) {
  return (
    <div style={{
      height:52, background:'var(--card)', borderBottom:'1px solid var(--line)',
      display:'flex', alignItems:'center', padding:'0 22px', gap:14, flexShrink:0
    }}>
      <div style={{ fontFamily:'var(--font-display)', fontSize:17, fontWeight:700 }}>
        {TITLES[page] || 'Сцена'}
      </div>
      <div style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:12 }}>
        <select className="s-select" value={branch} onChange={e=>setBranch(e.target.value)}>
          <option value="all">Все филиалы</option>
          {BRANCHES.map(b => <option key={b} value={b}>{b}</option>)}
        </select>
        {/* Notification bell */}
        <div style={{ position:'relative', cursor:'pointer', color:'var(--ink-muted)' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0"/>
          </svg>
          <div style={{
            position:'absolute', top:-2, right:-2, width:7, height:7,
            borderRadius:'50%', background:'var(--red)', border:'2px solid var(--card)'
          }} />
        </div>
      </div>
    </div>
  )
}
