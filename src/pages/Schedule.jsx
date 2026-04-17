import React, { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { instrColor, INSTRUMENTS, BRANCHES, HOURS, formatDate, dateStr, addDays, Avatar, Modal, Field, Spinner } from '../components/UI'

export default function Schedule({ branch }) {
  const [date, setDate] = useState(new Date())
  const [teachers, setTeachers] = useState([])
  const [students, setStudents] = useState([])
  const [lessons, setLessons] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    const [t, s] = await Promise.all([
      supabase.from('users').select('*').eq('role','teacher').order('full_name'),
      supabase.from('users').select('*').eq('role','student').order('full_name'),
    ])
    setTeachers(t.data || [])
    setStudents(s.data || [])

    const ds = dateStr(date)
    const dow = date.getDay()
    const { data: sch } = await supabase.from('schedule').select('*')
      .or(`lesson_date.eq.${ds},and(repeat_weekly.eq.true,day_of_week.eq.${dow})`)
      .neq('status','cancelled')

    let filtered = sch || []
    if (branch && branch !== 'all') {
      filtered = filtered.filter(l => l.branch_name === branch)
    }
    setLessons(filtered)
    setLoading(false)
  }, [date, branch])

  useEffect(() => { load() }, [load])

  function openCreate(teacherId, hour) {
    setModal({
      teacher_id: teacherId || '',
      student_id: '',
      student_name: '',
      instrument: '',
      lesson_time: hour !== undefined ? `${String(hour).padStart(2,'0')}:00` : '',
      lesson_duration: 60,
      lesson_type: 'individual',
      branch_name: branch !== 'all' ? branch : 'Ганди 44',
      lesson_date: dateStr(date),
      repeat_weekly: false,
      notes: '',
    })
  }

  async function saveLesson() {
    if (!modal.teacher_id || !modal.lesson_time) return
    const teacher = teachers.find(t => t.id === modal.teacher_id)
    const student = students.find(s => s.id === modal.student_id)
    const { error } = await supabase.from('schedule').insert({
      teacher_id: modal.teacher_id,
      teacher_name: teacher?.full_name || '',
      student_id: modal.student_id || null,
      student_name: student?.full_name || modal.student_name || '',
      instrument: modal.instrument,
      lesson_time: modal.lesson_time,
      lesson_duration: parseInt(modal.lesson_duration),
      lesson_type: modal.lesson_type,
      branch_name: modal.branch_name,
      lesson_date: modal.lesson_date,
      day_of_week: new Date(modal.lesson_date).getDay(),
      repeat_weekly: modal.repeat_weekly,
      status: 'active',
      notes: modal.notes,
    })
    if (error) { alert('Ошибка: ' + error.message); return }
    setModal(null)
    load()
  }

  const getLessonAt = (tid, h) => lessons.find(l =>
    l.teacher_id === tid && parseInt((l.lesson_time||'').split(':')[0]) === h
  )

  return (
    <div>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16, flexWrap:'wrap', gap:10 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <button className="btn-secondary" onClick={()=>setDate(addDays(date,-1))} style={{padding:'5px 8px'}}>‹</button>
          <div style={{ fontSize:15, fontWeight:700, minWidth:200, textAlign:'center' }}>{formatDate(date)}</div>
          <button className="btn-secondary" onClick={()=>setDate(addDays(date,1))} style={{padding:'5px 8px'}}>›</button>
          <button className="btn-secondary" onClick={()=>setDate(new Date())}>Сегодня</button>
        </div>
        <button className="btn-primary" onClick={()=>openCreate()}>
          + Новый урок
        </button>
      </div>

      {loading ? <Spinner /> : (
        <div className="s-card" style={{ overflow:'auto' }}>
          {/* Time header */}
          <div style={{ display:'grid', gridTemplateColumns:'140px repeat(14,1fr)', borderBottom:'2px solid var(--line)' }}>
            <div style={{ padding:'10px 14px', fontSize:10.5, fontWeight:700, color:'var(--ink-muted)', letterSpacing:0.5, textTransform:'uppercase', background:'var(--bg-alt)' }}>
              Педагог
            </div>
            {HOURS.map(h => (
              <div key={h} style={{ padding:'10px 0', fontSize:10, fontWeight:600, color:'var(--ink-muted)', textAlign:'center', borderLeft:'1px solid var(--line-soft)', background:'var(--bg-alt)' }}>
                {h}:00
              </div>
            ))}
          </div>

          {/* Rows */}
          {teachers.length === 0 ? (
            <div style={{ padding:40, textAlign:'center', color:'var(--ink-muted)' }}>
              Педагоги не найдены. Добавьте педагогов в систему.
            </div>
          ) : teachers.map((teacher, ri) => (
            <div key={teacher.id} style={{ display:'grid', gridTemplateColumns:'140px repeat(14,1fr)', borderBottom:'1px solid var(--line-soft)' }}>
              <div style={{
                padding:'0 14px', fontSize:13, fontWeight:600,
                display:'flex', alignItems:'center', gap:8,
                background: ri%2===0 ? 'transparent' : 'rgba(239,238,233,0.3)'
              }}>
                <Avatar name={teacher.full_name} size={26} color={instrColor(null)} />
                <span style={{ whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                  {teacher.full_name || '—'}
                </span>
              </div>
              {HOURS.map(h => {
                const lesson = getLessonAt(teacher.id, h)
                return (
                  <div key={h}
                    onClick={() => !lesson && openCreate(teacher.id, h)}
                    style={{
                      position:'relative', minHeight:50,
                      borderLeft:'1px solid var(--line-soft)',
                      background: ri%2===0 ? 'transparent' : 'rgba(239,238,233,0.3)',
                      cursor:'pointer', transition:'0.15s'
                    }}
                    onMouseEnter={e => { if(!lesson) e.currentTarget.style.background='var(--gold-muted)' }}
                    onMouseLeave={e => { e.currentTarget.style.background = ri%2===0 ? 'transparent' : 'rgba(239,238,233,0.3)' }}
                  >
                    {lesson && (
                      <div style={{
                        position:'absolute', top:3, left:2, right:2, bottom:3,
                        borderRadius:5, padding:'4px 7px',
                        background: instrColor(lesson.instrument), color:'#fff',
                        fontSize:10, fontWeight:600, overflow:'hidden',
                        display:'flex', flexDirection:'column', justifyContent:'center',
                        boxShadow:'0 1px 4px rgba(0,0,0,0.12)', cursor:'pointer'
                      }}>
                        <div style={{ whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', fontWeight:700, fontSize:10.5 }}>
                          {lesson.student_name || '—'}
                        </div>
                        <div style={{ opacity:0.8, fontSize:9 }}>
                          {lesson.instrument || ''}{lesson.lesson_type==='group'?' • Гр.':''}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      )}

      {/* Legend */}
      <div style={{ display:'flex', gap:14, marginTop:12, flexWrap:'wrap' }}>
        {INSTRUMENTS.map(i => (
          <div key={i} style={{ display:'flex', alignItems:'center', gap:5, fontSize:11, color:'var(--ink-soft)' }}>
            <div style={{ width:10, height:10, borderRadius:3, background:instrColor(i) }} />{i}
          </div>
        ))}
      </div>

      {/* Create Modal */}
      {modal && (
        <Modal title="Новый урок" onClose={()=>setModal(null)}>
          <Field label="Педагог">
            <select className="s-input" value={modal.teacher_id} onChange={e=>setModal({...modal,teacher_id:e.target.value})}>
              <option value="">Выберите...</option>
              {teachers.map(t => <option key={t.id} value={t.id}>{t.full_name}</option>)}
            </select>
          </Field>
          <Field label="Ученик">
            <select className="s-input" value={modal.student_id} onChange={e=>setModal({...modal,student_id:e.target.value})}>
              <option value="">Выберите или введите имя ниже</option>
              {students.map(s => <option key={s.id} value={s.id}>{s.full_name} {s.phone?`(${s.phone})`:''}</option>)}
            </select>
          </Field>
          {!modal.student_id && (
            <Field label="Или имя вручную">
              <input className="s-input" value={modal.student_name} onChange={e=>setModal({...modal,student_name:e.target.value})} placeholder="Имя ученика" />
            </Field>
          )}
          <Field label="Инструмент">
            <select className="s-input" value={modal.instrument} onChange={e=>setModal({...modal,instrument:e.target.value})}>
              <option value="">Выберите...</option>
              {INSTRUMENTS.map(i => <option key={i} value={i}>{i}</option>)}
            </select>
          </Field>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <Field label="Дата"><input className="s-input" type="date" value={modal.lesson_date} onChange={e=>setModal({...modal,lesson_date:e.target.value})} /></Field>
            <Field label="Время"><input className="s-input" type="time" value={modal.lesson_time} onChange={e=>setModal({...modal,lesson_time:e.target.value})} /></Field>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <Field label="Длительность">
              <select className="s-input" value={modal.lesson_duration} onChange={e=>setModal({...modal,lesson_duration:e.target.value})}>
                {[30,45,60,90].map(m => <option key={m} value={m}>{m} мин</option>)}
              </select>
            </Field>
            <Field label="Тип">
              <select className="s-input" value={modal.lesson_type} onChange={e=>setModal({...modal,lesson_type:e.target.value})}>
                <option value="individual">Индивидуальный</option>
                <option value="group">Групповой</option>
              </select>
            </Field>
          </div>
          <Field label="Филиал">
            <select className="s-input" value={modal.branch_name} onChange={e=>setModal({...modal,branch_name:e.target.value})}>
              {BRANCHES.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </Field>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:14 }}>
            <input type="checkbox" checked={modal.repeat_weekly} onChange={e=>setModal({...modal,repeat_weekly:e.target.checked})} style={{ accentColor:'var(--gold)' }} />
            <span style={{ fontSize:14 }}>Повторять еженедельно</span>
          </div>
          <Field label="Комментарий">
            <input className="s-input" value={modal.notes} onChange={e=>setModal({...modal,notes:e.target.value})} placeholder="Необязательно" />
          </Field>
          <div style={{ display:'flex', gap:10, justifyContent:'flex-end', marginTop:20 }}>
            <button className="btn-secondary" onClick={()=>setModal(null)}>Отмена</button>
            <button className="btn-primary" onClick={saveLesson}>Создать урок</button>
          </div>
        </Modal>
      )}
    </div>
  )
}
