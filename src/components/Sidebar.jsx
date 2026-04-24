import React from 'react'

const NAV_ITEMS = [
  { id:'schedule', label:'Расписание', icon:'calendar' },
  { id:'students', label:'Ученики', icon:'users' },
  { id:'teachers', label:'Педагоги', icon:'teacher' },
  { id:'approve', label:'Проверка', icon:'check' },
  { id:'crm', label:'CRM', icon:'funnel' },
  { id:'tasks', label:'Задачи', icon:'tasks' },
  { id:'analytics', label:'Аналитика', icon:'chart' },
  { id:'finance', label:'Финансы', icon:'finance' },
  { id:'broadcast', label:'Рассылка', icon:'send' },
  { id:'settings', label:'Настройки', icon:'settings' },
]

const iconPaths = {
  calendar: <><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></>,
  users: <><circle cx="9" cy="7" r="4"/><path d="M3 21v-2a4 4 0 014-4h4a4 4 0 014 4v2M16 3.13a4 4 0 010 7.75M21 21v-2a4 4 0 00-3-3.85"/></>,
  teacher: <><path d="M12 14l9-5-9-5-9 5 9 5z"/><path d="M12 14v7M5 9.5v5.5a7 7 0 007 7 7 7 0 007-7V9.5"/></>,
  check: <><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></>,
  chart: <><path d="M18 20V10M12 20V4M6 20v-6"/></>,
  finance: <><circle cx="12" cy="12" r="10"/><path d="M12 6v12M8 9.5h5.5a2.5 2.5 0 010 5H8"/></>,
  send: <><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></>,
  settings: <><circle cx="12" cy="12" r="3"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></>,
  funnel: <><path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z"/></>,
  tasks: <><path d="M9 11l3 3 8-8"/><rect x="3" y="3" width="18" height="18" rx="2"/></>,
}

function NavIcon({ type, color }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {iconPaths[type]}
    </svg>
  )
}

export default function Sidebar({ page, setPage, collapsed, setCollapsed, user, pendingCount, onLogout }) {
  const sW = collapsed ? 60 : 210

  return (
    <div style={{
      width:sW, minWidth:sW, background:'var(--sidebar)',
      display:'flex', flexDirection:'column', transition:'width 0.2s',
      borderRight:'1px solid rgba(255,255,255,0.04)'
    }}>
      <div style={{
        padding: collapsed ? '16px 8px' : '16px 14px',
        display:'flex', alignItems:'center', gap:10,
        borderBottom:'1px solid rgba(255,255,255,0.05)', minHeight:52
      }}>
        {!collapsed && (
          <div style={{ fontFamily:'var(--font-display)', fontSize:20, fontWeight:700, color:'var(--gold)' }}>Сцена</div>
        )}
        <button onClick={()=>setCollapsed(!collapsed)} style={{
          background:'none', border:'none', color:'rgba(255,255,255,0.35)',
          cursor:'pointer', marginLeft:'auto', padding:2
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M4 6h16M4 12h16M4 18h16"/>
          </svg>
        </button>
      </div>

      <nav style={{ flex:1, padding:'8px 6px', overflowY:'auto' }}>
        {NAV_ITEMS.map(n => {
          const active = page === n.id
          const color = active ? 'var(--gold)' : 'rgba(255,255,255,0.45)'
          return (
            <div key={n.id} onClick={()=>setPage(n.id)} style={{
              display:'flex', alignItems:'center', gap:10,
              padding: collapsed ? '9px 0' : '9px 12px',
              borderRadius:7,
              background: active ? 'var(--sidebar-active)' : 'transparent',
              cursor:'pointer', marginBottom:1,
              justifyContent: collapsed ? 'center' : 'flex-start',
              transition:'0.12s', position:'relative'
            }}>
              {active && (
                <div style={{
                  position:'absolute', left:0, top:'20%', bottom:'20%',
                  width:3, borderRadius:'0 3px 3px 0', background:'var(--gold)'
                }} />
              )}
              <NavIcon type={n.icon} color={active ? '#D4A03A' : 'rgba(255,255,255,0.45)'} />
              {!collapsed && (
                <span style={{ fontSize:13, fontWeight:active?700:500, color, whiteSpace:'nowrap' }}>
                  {n.label}
                </span>
              )}
              {n.id === 'approve' && pendingCount > 0 && !collapsed && (
                <span style={{
                  marginLeft:'auto', background:'var(--gold)', color:'#fff',
                  borderRadius:10, padding:'1px 7px', fontSize:10, fontWeight:700
                }}>{pendingCount}</span>
              )}
            </div>
          )
        })}
      </nav>

      <div style={{
        padding:'10px', borderTop:'1px solid rgba(255,255,255,0.05)',
        display:'flex', alignItems:'center', gap:8
      }}>
        <div style={{
          width:30, height:30, borderRadius:15, background:'var(--gold)',
          display:'flex', alignItems:'center', justifyContent:'center',
          color:'#fff', fontWeight:700, fontSize:12, flexShrink:0
        }}>
          {(user?.email || 'A')[0].toUpperCase()}
        </div>
        {!collapsed && (
          <div style={{ overflow:'hidden', flex:1 }}>
            <div style={{ color:'#fff', fontSize:12, fontWeight:600, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
              {user?.email || 'Admin'}
            </div>
            <div style={{ color:'rgba(255,255,255,0.35)', fontSize:10 }}>Директор</div>
          </div>
        )}
        <button onClick={onLogout} title="Выйти" style={{
          background:'none', border:'none', color:'rgba(255,255,255,0.25)',
          cursor:'pointer', padding:2, flexShrink:0
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/>
          </svg>
        </button>
      </div>
    </div>
  )
}

