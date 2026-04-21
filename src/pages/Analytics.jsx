import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Stat, Spinner, Badge, instrColor } from '../components/UI'

export default function Analytics({ branch }) {
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState(null)
  const [lessonsByDay, setLessonsByDay] = useState([])
  const [teacherStats, setTeacherStats] = useState([])
  const [instrStats, setInstrStats] = useState([])
  const [period, setPeriod] = useState('month') // 'week' | 'month'

  useEffect(() => { loadAll() }, [period])

  async function loadAll() {
    setLoading(true)
    const now = new Date()

    let dateFrom
    if (period === 'week') {
      const day = now.getDay()
      const diff = day === 0 ? 6 : day - 1
      const monday = new Date(now)
      monday.setDate(now.getDate() - diff)
      dateFrom = monday.toISOString().split('T')[0]
    } else {
      dateFrom = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-01`
    }

    const [sCount, tCount, lessonsRes, pendingRes, ratingsRes, checkinsRes, teachersRes] = await Promise.all([
      supabase.from('users').select('id', { count:'exact', head:true }).eq('role','student'),
      supabase.from('users').select('id', { count:'exact', head:true }).eq('role','teacher'),
      supabase.from('conducted_lessons').select('*').gte('lesson_date', dateFrom),
      supabase.from('conducted_lessons').select('id', { count:'exact', head:true }).eq('status','pending'),
      supabase.from('lesson_ratings').select('rating').gte('created_at', dateFrom),
      supabase.from('checkins').select('id', { count:'exact', head:true }).gte('check_in_at', dateFrom),
      supabase.from('users').select('id,full_name').eq('role','teacher'),
    ])

    const lessons = lessonsRes.data || []
    const approved = lessons.filter(l => l.status === 'approved')
    const rejected = lessons.filter(l => l.status === 'rejected')
    const present = approved.filter(l => l.attendance === 'present' || l.attendance === 'late')
    const absent = approved.filter(l => l.attendance === 'absent')
    const ratings = ratingsRes.data || []
    const avgRating = ratings.length > 0 ? (ratings.reduce((s,r) => s + (r.rating || 0), 0) / ratings.length).toFixed(1) : '—'

    setStats({
      students: sCount.count || 0,
      teachers: tCount.count || 0,
      totalLessons: lessons.length,
      approved: approved.length,
      pending: pendingRes.count || 0,
      rejected: rejected.length,
      present: present.length,
      absent: absent.length,
      avgRating,
      checkins: checkinsRes.count || 0,
      attendanceRate: approved.length > 0 ? Math.round(present.length / approved.length * 100) : 0,
    })

    // Уроки по дням
    const byDay = {}
    approved.forEach(l => {
      const d = l.lesson_date
      if (!byDay[d]) byDay[d] = 0
      byDay[d]++
    })
    const days = Object.entries(byDay).sort((a,b) => a[0] > b[0] ? 1 : -1).map(([date, count]) => ({ date, count }))
    setLessonsByDay(days)

    // Статистика по педагогам
    const teachers = teachersRes.data || []
    const tStats = teachers.map(t => {
      const tLessons = approved.filter(l => l.teacher_id === t.id)
      const tPresent = tLessons.filter(l => l.attendance === 'present' || l.attendance === 'late')
      return {
        id: t.id,
        name: t.full_name,
        total: tLessons.length,
        present: tPresent.length,
        rate: tLessons.length > 0 ? Math.round(tPresent.length / tLessons.length * 100) : 0,
      }
    }).sort((a,b) => b.total - a.total)
    setTeacherStats(tStats)

    // Статистика по инструментам
    const iMap = {}
    approved.forEach(l => {
      const i = l.instrument || 'Другое'
      if (!iMap[i]) iMap[i] = 0
      iMap[i]++
    })
    const iStats = Object.entries(iMap).sort((a,b) => b[1] - a[1]).map(([name, count]) => ({ name, count }))
    setInstrStats(iStats)

    setLoading(false)
  }

  if (loading) return <Spinner />

  const maxDay = lessonsByDay.reduce((m, d) => Math.max(m, d.count), 1)
  const maxTeacher = teacherStats.reduce((m, t) => Math.max(m, t.total), 1)
  const maxInstr = instrStats.reduce((m, i) => Math.max(m, i.count), 1)
  const periodLabel = period === 'week' ? 'неделю' : 'месяц'

  return (
    <div>
      {/* Переключатель периода */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:18 }}>
        <div style={{ fontSize:14, fontWeight:700, color:'var(--ink-soft)' }}>Данные за {periodLabel}</div>
        <div style={{ display:'flex', gap:2, background:'var(--bg-alt)', padding:2, borderRadius:6, border:'1px solid var(--line)' }}>
          {[{id:'week',label:'Неделя'},{id:'month',label:'Месяц'}].map(p => (
            <button key={p.id} onClick={() => setPeriod(p.id)} style={{
              padding:'5px 14px', borderRadius:4, fontSize:12, fontWeight:600,
              border:'none', cursor:'pointer', fontFamily:'var(--font)',
              background: period===p.id ? 'var(--card)' : 'transparent',
              color: period===p.id ? 'var(--gold)' : 'var(--ink-muted)',
              boxShadow: period===p.id ? 'var(--shadow-1)' : 'none',
            }}>{p.label}</button>
          ))}
        </div>
      </div>

      {/* Основные метрики */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))', gap:12, marginBottom:24 }}>
        <Stat label="Учеников" value={stats.students} />
        <Stat label="Педагогов" value={stats.teachers} />
        <Stat label="Уроков" value={stats.approved} sub="подтверждённых" />
        <Stat label="На проверке" value={stats.pending} accent={stats.pending > 0 ? '#E08A3C' : undefined} />
        <Stat label="Посещаемость" value={`${stats.attendanceRate}%`} accent={stats.attendanceRate >= 80 ? '#3BA676' : '#E08A3C'} />
        <Stat label="Рейтинг" value={stats.avgRating} sub="средний" accent="#D4A03A" />
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>
        {/* Уроки по дням — барчарт */}
        <div className="s-card" style={{ padding:20 }}>
          <div style={{ fontSize:14, fontWeight:700, marginBottom:16 }}>Уроки по дням</div>
          {lessonsByDay.length === 0 ? (
            <div style={{ fontSize:13, color:'var(--ink-muted)', textAlign:'center', padding:20 }}>Нет данных</div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
              {lessonsByDay.map(d => (
                <div key={d.date} style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <div style={{ width:55, fontSize:11, color:'var(--ink-soft)', textAlign:'right', fontVariantNumeric:'tabular-nums' }}>
                    {d.date.slice(5).split('-').reverse().join('.')}
                  </div>
                  <div style={{ flex:1, height:20, background:'var(--bg-alt)', borderRadius:4, overflow:'hidden' }}>
                    <div style={{
                      width: `${(d.count / maxDay) * 100}%`,
                      height:'100%', background:'var(--gold)',
                      borderRadius:4, minWidth:2,
                      transition:'width 0.3s'
                    }} />
                  </div>
                  <div style={{ width:24, fontSize:12, fontWeight:700, textAlign:'right', fontVariantNumeric:'tabular-nums' }}>
                    {d.count}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Педагоги — рейтинг по урокам */}
        <div className="s-card" style={{ padding:20 }}>
          <div style={{ fontSize:14, fontWeight:700, marginBottom:16 }}>Педагоги — уроки за {periodLabel}</div>
          {teacherStats.length === 0 ? (
            <div style={{ fontSize:13, color:'var(--ink-muted)', textAlign:'center', padding:20 }}>Нет данных</div>
          ) : teacherStats.map((t, i) => (
            <div key={t.id} style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8 }}>
              <div style={{
                width:20, height:20, borderRadius:10, background:'var(--gold)',
                display:'flex', alignItems:'center', justifyContent:'center',
                fontSize:10, fontWeight:700, color:'#fff', flexShrink:0
              }}>{i+1}</div>
              <div style={{ width:100, fontSize:12.5, fontWeight:600, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                {t.name || '—'}
              </div>
              <div style={{ flex:1, height:18, background:'var(--bg-alt)', borderRadius:4, overflow:'hidden' }}>
                <div style={{
                  width: `${(t.total / maxTeacher) * 100}%`,
                  height:'100%', background:'#4A7EC7',
                  borderRadius:4, minWidth:2,
                }} />
              </div>
              <div style={{ width:50, fontSize:11, textAlign:'right', fontVariantNumeric:'tabular-nums' }}>
                <span style={{ fontWeight:700 }}>{t.total}</span>
                <span style={{ color:'var(--ink-muted)' }}> ур.</span>
              </div>
            </div>
          ))}
        </div>

        {/* Инструменты */}
        <div className="s-card" style={{ padding:20 }}>
          <div style={{ fontSize:14, fontWeight:700, marginBottom:16 }}>По инструментам</div>
          {instrStats.length === 0 ? (
            <div style={{ fontSize:13, color:'var(--ink-muted)', textAlign:'center', padding:20 }}>Нет данных</div>
          ) : instrStats.map(inst => (
            <div key={inst.name} style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8 }}>
              <div style={{
                width:10, height:10, borderRadius:3,
                background:instrColor(inst.name), flexShrink:0
              }} />
              <div style={{ width:90, fontSize:12.5, fontWeight:600 }}>{inst.name}</div>
              <div style={{ flex:1, height:18, background:'var(--bg-alt)', borderRadius:4, overflow:'hidden' }}>
                <div style={{
                  width: `${(inst.count / maxInstr) * 100}%`,
                  height:'100%', background:instrColor(inst.name),
                  borderRadius:4, minWidth:2,
                }} />
              </div>
              <div style={{ width:40, fontSize:12, fontWeight:700, textAlign:'right', fontVariantNumeric:'tabular-nums' }}>
                {inst.count}
              </div>
            </div>
          ))}
        </div>

        {/* Краткие показатели */}
        <div className="s-card" style={{ padding:20 }}>
          <div style={{ fontSize:14, fontWeight:700, marginBottom:16 }}>Сводка за {periodLabel}</div>
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {[
              { label:'Всего уроков отмечено', value:stats.totalLessons, color:'var(--ink)' },
              { label:'Подтверждено', value:stats.approved, color:'#3BA676' },
              { label:'Отклонено', value:stats.rejected, color:'#D4574E' },
              { label:'Ожидают проверки', value:stats.pending, color:'#E08A3C' },
              { label:'Присутствовали', value:stats.present, color:'#3BA676' },
              { label:'Отсутствовали', value:stats.absent, color:'#D4574E' },
              { label:'Check-in отметок', value:stats.checkins, color:'#4A7EC7' },
            ].map(row => (
              <div key={row.label} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'6px 0', borderBottom:'1px solid var(--line-soft)' }}>
                <span style={{ fontSize:13, color:'var(--ink-soft)' }}>{row.label}</span>
                <span style={{ fontSize:15, fontWeight:700, color:row.color, fontVariantNumeric:'tabular-nums' }}>{row.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

