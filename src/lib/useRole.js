import { useState, useEffect } from 'react'
import { supabase } from './supabase'

// Какие страницы доступны каким ролям
const ROLE_PAGES = {
  director: ['schedule', 'students', 'teachers', 'approve', 'crm', 'tasks', 'analytics', 'finance', 'broadcast', 'settings'],
  branch_admin: ['schedule', 'students', 'teachers', 'approve', 'crm', 'tasks', 'broadcast'],
  accountant: ['finance', 'teachers', 'analytics'],
  manager: ['schedule', 'students', 'crm', 'tasks', 'broadcast'],
}

export function useAdminRole(userEmail) {
  const [role, setRole] = useState('director') // по умолчанию director
  const [branchId, setBranchId] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userEmail) { setLoading(false); return }
    
    supabase.from('admin_users').select('role, branch_id, is_active')
      .eq('email', userEmail)
      .eq('is_active', true)
      .single()
      .then(({ data }) => {
        if (data) {
          setRole(data.role || 'director')
          setBranchId(data.branch_id || null)
        }
        setLoading(false)
      })
  }, [userEmail])

  function canAccess(page) {
    const pages = ROLE_PAGES[role] || ROLE_PAGES.director
    return pages.includes(page)
  }

  function canView(feature) {
    switch (feature) {
      case 'salary': return role === 'director' || role === 'accountant'
      case 'rates': return role === 'director' || role === 'accountant'
      case 'delete': return role === 'director'
      case 'settings': return role === 'director'
      case 'export': return role === 'director' || role === 'accountant'
      default: return true
    }
  }

  return { role, branchId, loading, canAccess, canView }
}
