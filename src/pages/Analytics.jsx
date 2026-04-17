import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Stat, Spinner, Empty } from '../components/UI'

export default function Analytics() {
  const [stats, setStats] = useState(null)

  useEffect(() => {
    Promise.all([
      supabase.from('users').select('id', { count:'exact', head:true }).eq('role','student'),
      supabase.from('users').select('id', { count:'exact', head:true }).eq('role','teacher'),
      supabase.from('conducted_lessons').select('id', { count:'exact', head:true }).eq('status','approved'),
      supabase.from('conducted_lessons').select('id', { count:'exact', head:true }).eq('status','pending'),
    ]).then(([s,t,a,p]) => {
      setStats({
        students: s.count || 0,
        teachers: t.count || 0,
        approved: a.count || 0,
        pending: p.count || 0,
      })
    })
  }, [])

  if (!stats) return <Spinner />

  return (
    <div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(170px,1fr))', gap:12, marginBottom:24 }}>
        <Stat label="Учеников" value={stats.students} sub="активных" />
        <Stat label="Педагогов" value={stats.teachers} />
        <Stat label="Уроков проведено" value={stats.approved} sub="подтверждённых" />
        <Stat label="На проверке" value={stats.pending} accent="#E08A3C" />
      </div>

      <div className="s-card" style={{ padding:20 }}>
        <Empty title="Графики — Фаза 3" sub="Детальная аналитика с графиками будет добавлена после утверждения базового функционала" />
      </div>
    </div>
  )
}
