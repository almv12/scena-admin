import React, { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { instrColor, Badge, Avatar, Spinner, Empty, attLabel, attColor } from '../components/UI'

export default function Approve() {
  const [lessons, setLessons] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('pending')
  const [selected, setSelected] = useState(new Set())

  const load = useCallback(async () => {
    setLoading(true)
    let query = supabase.from('conducted_lessons').select('*')
      .order('lesson_date', { ascending: false }).limit(50)
    if (tab !== 'all') query = query.eq('status', tab)
    const { data } = await query
    setLessons(data || [])
    setSelected(new Set())
    setLoading(false)
  }, [tab])

  useEffect(() => { load() }, [load])

  async function approve(id) {
    await supabase.from('conducted_lessons').update({ status:'approved', approved_at: new Date().toISOString() }).eq('id', id)
    load()
  }

  async function reject(id) {
    await supabase.from('conducted_lessons').update({ status:'rejected' }).eq('id', id)
    load()
  }

  async function massApprove() {
    for (const id of selected) {
      await supabase.from('conducted_lessons').update({ status:'approved', approved_at: new Date().toISOString() }).eq('id', id)
    }
    load()
  }

  function toggleSel(id) {
    const s = new Set(selected)
    s.has(id) ? s.delete(id) : s.add(id)
    setSelected(s)
  }

  function selectAll() {
    setSelected(selected.size === lessons.length ? new Set() : new Set(lessons.map(l=>l.id)))
  }

  const tabs = [
    { id:'pending', label:'Ожидают' },
    { id:'approved', label:'Подтверждённые' },
    { id:'rejected', label:'Отклонённые' },
  ]

  return (
    <div>
      <div style={{ display:'flex', gap:4, marginBottom:18, background:'var(--bg-alt)', padding:3, borderRadius:8, border:'1px solid var(--line)', width:'fit-content' }}>
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
            {t.id==='pending' && tab==='pending' && lessons.length > 0 && (
              <span style={{ background:'var(--gold)', color:'#fff', borderRadius:10, padding:'1px 7px', fontSize:10, fontWeight:700 }}>{lessons.length}</span>
            )}
          </button>
        ))}
      </div>

      {tab === 'pending' && lessons.length > 0 && (
        <div style={{ display:'flex', gap:10, marginBottom:14, alignItems:'center' }}>
          <label style={{ display:'flex', alignItems:'center', gap:6, cursor:'pointer', fontSize:13, fontWeight:600, color:'var(--ink-soft)' }}>
            <input type="checkbox" checked={selected.size===lessons.length && lessons.length>0} onChange={selectAll} style={{ accentColor:'var(--gold)', width:15, height:15 }} />
            Выбрать все
          </label>
          {selected.size > 0 && (
            <button className="btn-primary" onClick={massApprove} style={{ background:'var(--green)', boxShadow:'none' }}>
              ✓ Подтвердить ({selected.size})
            </button>
          )}
        </div>
      )}

      {loading ? <Spinner /> : lessons.length === 0 ? (
        <Empty
          title={tab==='pending' ? 'Нет уроков на проверку' : `Нет ${tab==='approved'?'подтверждённых':'отклонённых'} уроков`}
          sub={tab==='pending' ? 'Все уроки проверены' : ''}
        />
      ) : lessons.map(l => (
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
            {l.note && <div style={{ fontSize:11.5, color:'var(--ink-muted)', marginTop:2 }}>{l.note}</div>}
          </div>
          {tab === 'pending' ? (
            <div style={{ display:'flex', gap:6, flexShrink:0 }}>
              <button className="btn-success-sm" onClick={()=>approve(l.id)}>✓</button>
              <button className="btn-danger-sm" onClick={()=>reject(l.id)}>✗</button>
            </div>
          ) : (
            <Badge color={l.status==='approved'?'#3BA676':'#D4574E'}>
              {l.status==='approved'?'Подтверждён':'Отклонён'}
            </Badge>
          )}
        </div>
      ))}
    </div>
  )
}
