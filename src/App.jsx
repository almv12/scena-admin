import React, { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import { useAdminRole } from './lib/useRole'
import Sidebar from './components/Sidebar'
import TopBar from './components/TopBar'
import Login from './pages/Login'
import Schedule from './pages/Schedule'
import Students from './pages/Students'
import Teachers from './pages/Teachers'
import Approve from './pages/Approve'
import Analytics from './pages/Analytics'
import Finance from './pages/Finance'
import Broadcast from './pages/Broadcast'
import Settings from './pages/Settings'
import CRM from './pages/CRM'
import Tasks from './pages/Tasks'

export default function App() {
  const [user, setUser] = useState(null)
  const [checking, setChecking] = useState(true)
  const [page, setPage] = useState('schedule')
  const [collapsed, setCollapsed] = useState(false)
  const [branch, setBranch] = useState('all')
  const [pendingCount, setPendingCount] = useState(0)
  const [branches, setBranches] = useState([])

  // Роль админа
  const { role, branchId, canAccess, canView } = useAdminRole(user?.email)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user || null)
      setChecking(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null)
    })
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!user) return
    supabase.from('branches').select('*').eq('is_active', true).order('name')
      .then(({ data }) => setBranches(data || []))
  }, [user])

  useEffect(() => {
    if (!user) return
    supabase.from('conducted_lessons').select('id', { count:'exact', head:true }).eq('status','pending')
      .then(({ count }) => setPendingCount(count || 0))
  }, [user, page])

  // Если branch_admin — автоматически фильтровать по своему филиалу
  useEffect(() => {
    if (branchId && branches.length > 0) {
      const myBranch = branches.find(b => b.id === branchId)
      if (myBranch) setBranch(myBranch.name)
    }
  }, [branchId, branches])

  // Если пользователь пытается открыть страницу без доступа — редирект
  useEffect(() => {
    if (!canAccess(page)) {
      const allowed = ['schedule', 'students', 'teachers', 'approve', 'crm', 'tasks', 'analytics', 'finance', 'broadcast', 'settings']
      const firstAllowed = allowed.find(p => canAccess(p)) || 'schedule'
      setPage(firstAllowed)
    }
  }, [page, role])

  async function handleLogout() {
    await supabase.auth.signOut()
    setUser(null)
  }

  if (checking) {
    return (
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', background:'var(--bg)' }}>
        <div style={{ width:28, height:28, border:'3px solid var(--line)', borderTopColor:'var(--gold)', borderRadius:'50%', animation:'spin 0.8s linear infinite' }} />
      </div>
    )
  }

  if (!user) return <Login onLogin={setUser} />

  function renderPage() {
    if (!canAccess(page)) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--ink-muted)' }}>У вас нет доступа к этой странице</div>
    switch(page) {
      case 'schedule': return <Schedule branch={branch} branches={branches} />
      case 'students': return <Students branch={branch} />
      case 'teachers': return <Teachers branch={branch} />
      case 'approve': return <Approve branch={branch} />
      case 'crm': return <CRM />
      case 'tasks': return <Tasks />
      case 'analytics': return <Analytics branch={branch} />
      case 'finance': return <Finance />
      case 'broadcast': return <Broadcast />
      case 'settings': return <Settings />
      default: return <Schedule branch={branch} branches={branches} />
    }
  }

  return (
    <div style={{ display:'flex', height:'100vh', overflow:'hidden', background:'var(--bg)' }}>
      <Sidebar
        page={page} setPage={setPage}
        collapsed={collapsed} setCollapsed={setCollapsed}
        user={user} pendingCount={pendingCount}
        onLogout={handleLogout}
        canAccess={canAccess}
        role={role}
      />
      <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>
        <TopBar page={page} branch={branch} setBranch={setBranch} branches={branches}
          role={role} branchId={branchId} />
        <div style={{ flex:1, overflowY:'auto', padding:22 }}>
          {renderPage()}
        </div>
      </div>
    </div>
  )
}

