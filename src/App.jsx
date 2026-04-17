import React, { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
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

export default function App() {
  const [user, setUser] = useState(null)
  const [checking, setChecking] = useState(true)
  const [page, setPage] = useState('schedule')
  const [collapsed, setCollapsed] = useState(false)
  const [branch, setBranch] = useState('all')
  const [pendingCount, setPendingCount] = useState(0)

  // Check auth on load
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

  // Load pending count for badge
  useEffect(() => {
    if (!user) return
    supabase.from('conducted_lessons').select('id', { count:'exact', head:true }).eq('status','pending')
      .then(({ count }) => setPendingCount(count || 0))
  }, [user, page])

  async function handleLogout() {
    await supabase.auth.signOut()
    setUser(null)
  }

  // Auth checking spinner
  if (checking) {
    return (
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', background:'var(--bg)' }}>
        <div style={{ width:28, height:28, border:'3px solid var(--line)', borderTopColor:'var(--gold)', borderRadius:'50%', animation:'spin 0.8s linear infinite' }} />
      </div>
    )
  }

  // Not logged in
  if (!user) {
    return <Login onLogin={setUser} />
  }

  // Render current page
  function renderPage() {
    switch(page) {
      case 'schedule': return <Schedule branch={branch} />
      case 'students': return <Students branch={branch} />
      case 'teachers': return <Teachers branch={branch} />
      case 'approve': return <Approve />
      case 'analytics': return <Analytics />
      case 'finance': return <Finance />
      case 'broadcast': return <Broadcast />
      case 'settings': return <Settings />
      default: return <Schedule branch={branch} />
    }
  }

  return (
    <div style={{ display:'flex', height:'100vh', overflow:'hidden', background:'var(--bg)' }}>
      <Sidebar
        page={page}
        setPage={setPage}
        collapsed={collapsed}
        setCollapsed={setCollapsed}
        user={user}
        pendingCount={pendingCount}
        onLogout={handleLogout}
      />
      <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>
        <TopBar page={page} branch={branch} setBranch={setBranch} />
        <div style={{ flex:1, overflowY:'auto', padding:22 }}>
          {renderPage()}
        </div>
      </div>
    </div>
  )
}
