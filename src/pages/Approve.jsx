import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { instrColor, Badge, Avatar, Spinner, Empty, attLabel, attColor, Stat } from '../components/UI'

export default function Approve({ branch }) {
  const [lessons, setLessons] = useState([])
  const [teachers, setTeachers] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('pending')
  const [selected, setSelected] = useState(new Set())
  const [filterTeacher, setFilterTeacher] = useState('')
  const [counts, setCounts] = useState({ pending: 0, approved: 0, rejected: 0 })

  const load = useCallback(async () => {
    setLoading(true)

    // Загружаем педагогов для фильтра
    const { data: tData } = await supabase.from('users').select('id,full_name').eq('role','teacher').order('full_name')
    setTeachers(tData || [])

    // Счётчики по статусам
    const [pCount, aCount, rCount] = await Promise.all([
      supabase.from('conducted_lessons').select('id', { count:'exact', head:true }).eq('status','pending'),
      supabase.from('conducted_lessons').select('id', { count:'exact', head:true }).eq('status','approved'),
      supabase.from('conducted_lessons').select('id', { count:'exact', head:true }).eq('status','rejected'),
    ])
    setCounts({ pending: pCount.count || 0, approved: aCount.count || 0, rejected: rCount.count || 0 })

    // Уроки по текущему табу
    let query = supabase.from('conducted_lessons').select('*')
      .order('lesson_date', { ascending: false }).limit(100)
    if (tab !== 'all') query = query.eq('status', tab)
    const { data } = await query
    setLessons(data || [])
    setSelected(new Set())
    setLoading(false)
  }, [tab])

  useEffect(() => { load() }, [load])

  // Фильтрация на клиенте (педагог + филиал)
  const filtered = useMemo(() => {
    let list = lessons
    if (filterTeacher) {
      list = list.filter(l => l.teacher_id === filterTeacher)
    }
    // Фильтр по филиалу — ищем по имени педагога если branch задан
    // conducted_lessons не имеет branch_name, поэтому пока фильтруем только по педагогу
    return list
  }, [lessons, filterTeacher])

  async function approve(id) {
    await supabase.from('conducted_lessons').update({ status:'approved', approved_at: new Date().toISOString() }).eq('id', id)
    load()
  }

  async function reject(id) {
    await supabase.from('conducted_lessons').update({ status:'rejected' }).eq('id', id)
    load()
  }

  async function massApprove() {
    if (selected.size === 0) return
    const ids = [...selected]
    for (const id of ids) {
      await supabase.from('conducted_lessons').update({ status:'approved', approved_at: new Date().toISOString() }).eq('id', id)
    }
    load()
  }

  async function massReject() {
    if (selected.size === 0) return
    if (!confirm(`Отклонить ${selected.size} уроков?`)) return
    const ids = [...selected]
    for (const id of ids) {
      await supabase.from('conducted_lessons').update({ status:'rejected' }).eq('id', id)
    }
    load()
  }

  function toggleSel(id) {
    const s = new Set(selected)
    s.has(id) ? s.delete(id) : s.add(id)
    setSelected(s)
  }

  function selectAll() {
    setSelected(selected.size === filtered.length ? new Set() : new Set(filtered.map(l=>l.id)))
  }

  // Найти имя педагога по teacher_id
  function teacherName(teacherId) {
    const t = teachers.find(t => t.id === teacherId)
    return t?.full_name || ''
  }

  const tabs = [
    { id:'pending', label:'Ожидают', count: counts.pending },
    { id:'approved', label:'Подтверждённые', count: counts.approved },
    { id:'rejected', label:'Отклонённые', count: counts.rejected },
  ]

  return (
    <div>
      {/* Статистика */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))', gap:12, marginBottom:18 }}>
        <Stat label="Ожидают" value={counts.pending} accent={counts.pending > 0 ? '#E08A3C' : '#3BA676'} />
        <Stat label="Подтверждено" value={counts.approved} accent="#3BA676" />
        <Stat label="Отклонено" value={counts.rejected} accent="#D4574E" />
      </div>

      {/* Табы + фильтры */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:10, marginBottom:14 }}>
        <div style={{ display:'flex', gap:4, background:'var(--bg-alt)', padding:3, borderRadius:8, border:'1px solid var(--line)', width:'fit-content' }}>
          {tabs.map(t => (
            <button key={t.id} onClick={()=>setTab(t.id)} style={{
              padding:'6px 14px', borderRadius:6, fontSize:12, fontWeight:600,
              border:'none', cursor:'pointer', fontFamily:'var(--font)',
              background: tab===t.id ? 'var(--card)' : 'transparent',
              color: tab===t.id ? 'var(--gold)' : 'var(--ink-muted)',
              boxShadow: tab===t.id ? 'var(--shadow-1)' : 'none',
              display:'flex', gap:5, alignItems:'center'
            }}>
              {t.label}
              {t.count > 0 && tab === t.id && (
                <span style={{
                  background: t.id === 'pending' ? 'var(--gold)' : t.id === 'approved' ? '#3BA676' : '#D4574E',
                  color:'#fff', borderRadius:10, padding:'1px 7px', fontSize:10, fontWeight:700
                }}>{t.count}</span>
              )}
            </button>
          ))}
        </div>

        {/* Фильтр по педагогу */}
        <select className="s-select" value={filterTeacher} onChange={e => setFilterTeacher(e.target.value)}
          style={{ minWidth:180 }}>
          <option value="">Все педагоги</option>
          {teachers.map(t => <option key={t.id} value={t.id}>{t.full_name}</option>)}
        </select>
      </div>

      {/* Массовые действия */}
      {tab === 'pending' && filtered.length > 0 && (
        <div style={{ display:'flex', gap:10, marginBottom:14, alignItems:'center' }}>
          <label style={{ display:'flex', alignItems:'center', gap:6, cursor:'pointer', fontSize:13, fontWeight:600, color:'var(--ink-soft)' }}>
            <input type="checkbox" checked={selected.size===filtered.length && filtered.length>0} onChange={selectAll} style={{ accentColor:'var(--gold)', width:15, height:15 }} />
            Выбрать все ({filtered.length})
          </label>
          {selected.size > 0 && (
            <>
              <button className="btn-primary" onClick={massApprove} style={{ background:'var(--green)', boxShadow:'none' }}>
                ✓ Подтвердить ({selected.size})
              </button>
              <button className="btn-secondary" onClick={massReject} style={{ color:'var(--red)', borderColor:'var(--red)' }}>
                ✗ Отклонить ({selected.size})
              </button>
            </>
          )}
        </div>
      )}

      {/* Список уроков */}
      {loading ? <Spinner /> : filtered.length === 0 ? (
        <Empty
          title={tab==='pending' ? 'Нет уроков на проверку' : `Нет ${tab==='approved'?'подтверждённых':'отклонённых'} уроков`}
          sub={tab==='pending' ? 'Все уроки проверены ✓' : filterTeacher ? 'Попробуйте убрать фильтр' : ''}
        />
      ) : filtered.map(l => (
        <div key={l.id} style={{
          background:'var(--card)', border:'1px solid var(--line)', borderRadius:12,
          padding:'14px 18px', marginBottom:10, display:'flex', alignItems:'center', gap:14,
          boxShadow:'var(--shadow-1)'
        }}>
          {tab === 'pending' && (
            <input type="checkbox" checked={selected.has(l.id)} onChange={()=>toggleSel(l.id)}
              style={{ accentColor:'var(--gold)', width:15, height:15, cursor:'pointer', flexShrink:0 }} />
          )}
          <Avatar name={l.student_name} size={38} color={instrColor(l.instrument)} />
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:14, fontWeight:700 }}>{l.student_name || '—'}</div>
            <div style={{ fontSize:12, color:'var(--ink-soft)', display:'flex', gap:6, alignItems:'center', flexWrap:'wrap', marginTop:2 }}>
              <Badge color={instrColor(l.instrument)}>{l.instrument || '—'}</Badge>
              <span>{l.lesson_type==='group'?'Групповой':'Индивид.'}</span>
              <span style={{color:'var(--ink-faint)'}}>•</span>
              <span>{l.lesson_date} {l.lesson_time}</span>
              {l.attendance && (
                <>
                  <span style={{color:'var(--ink-faint)'}}>•</span>
                  <span style={{ fontWeight:600, color:attColor(l.attendance) }}>{attLabel(l.attendance)}</span>
                </>
              )}
            </div>
            {/* Имя педагога */}
            {l.teacher_id && (
              <div style={{ fontSize:11, color:'var(--ink-muted)', marginTop:2 }}>
                Педагог: {teacherName(l.teacher_id) || '—'}
              </div>
            )}
            {l.note && <div style={{ fontSize:11.5, color:'var(--ink-muted)', marginTop:2, fontStyle:'italic' }}>💬 {l.note}</div>}
          </div>
          {tab === 'pending' ? (
            <div style={{ display:'flex', gap:6, flexShrink:0 }}>
              <button className="btn-success-sm" onClick={()=>approve(l.id)} title="Подтвердить">✓</button>
              <button className="btn-danger-sm" onClick={()=>reject(l.id)} title="Отклонить">✗</button>
            </div>
          ) : (
            <div style={{ textAlign:'right', flexShrink:0 }}>
              <Badge color={l.status==='approved'?'#3BA676':'#D4574E'}>
                {l.status==='approved'?'Подтверждён':'Отклонён'}
              </Badge>
              {l.approved_at && (
                <div style={{ fontSize:10, color:'var(--ink-muted)', marginTop:2 }}>
                  {new Date(l.approved_at).toLocaleDateString('ru')}
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

