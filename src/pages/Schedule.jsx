import React, { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { instrColor, INSTRUMENTS, HOURS, formatDate, dateStr, addDays, Avatar, Modal, Field, Spinner } from '../components/UI'

export default function Schedule({ branch, branches }) {
  const [date, setDate] = useState(new Date())
  const [teachers, setTeachers] = useState([])
  const [students, setStudents] = useState([])
  const [lessons, setLessons] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)
  const [editModal, setEditModal] = useState(null)

  const branchNames = branches.length > 0
    ? branches.map(b => b.name)
    : ['Ганди 44', 'Ганди 29']

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

    // Фильтруем по start_date (не lesson_date!) + repeat_weekly
    const { data: sch } = await supabase.from('schedule').select('*')
      .or(`start_date.eq.${ds},and(repeat_weekly.eq.true,day_of_week.eq.${dow})`)
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
      branch_name: branch !== 'all' ? branch : (branchNames[0] || 'Ганди 44'),
      start_date: dateStr(date),
      repeat_weekly: false,
      notes: '',
    })
  }

  async function saveLesson() {
    if (!modal.teacher_id || !modal.lesson_time) return
    const teacher = teachers.find(t => t.id === modal.teacher_id)
    const student = students.find(s => s.id === modal.student_id)
    const lessonDate = modal.start_date || dateStr(date)

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
      start_date: lessonDate,
      day_of_week: new Date(lessonDate).getDay(),
      repeat_weekly: modal.repeat_weekly,
      status: 'active',
      notes: modal.notes,
    })
    if (error) { alert('Ошибка: ' + error.message); return }
    setModal(null)
    load()
  }

  function openEdit(lesson) {
    setEditModal({
      ...lesson,
      start_date: lesson.start_date || dateStr(date),
    })
  }

  async function updateLesson() {
    if (!editModal) return
    const teacher = teachers.find(t => t.id === editModal.teacher_id)
    const student = students.find(s => s.id === editModal.student_id)
    const lessonDate = editModal.start_date || dateStr(date)

    const { error } = await supabase.from('schedule').update({
      teacher_id: editModal.teacher_id,
      teacher_name: teacher?.full_name || editModal.teacher_name || '',
      student_id: editModal.student_id || null,
      student_name: student?.full_name || editModal.student_name || '',
      instrument: editModal.instrument,
      lesson_time: editModal.lesson_time,
      lesson_duration: parseInt(editModal.lesson_duration),
      lesson_type: editModal.lesson_type,
      branch_name: editModal.branch_name,
      start_date: lessonDate,
      day_of_week: new Date(lessonDate).getDay(),
      repeat_weekly: editModal.repeat_weekly,
      notes: editModal.notes,
    }).eq('id', editModal.id)
    if (error) { alert('Ошибка: ' + error.message); return }
    setEditModal(null)
    load()
  }

  async function cancelLesson(id) {
    if (!confirm('Отменить урок?')) return
    await supabase.from('schedule').update({ status: 'cancelled' }).eq('id', id)
    setEditModal(null)
    load()
  }

  const getLessonAt = (tid, h) => lessons.find(l =>
    l.teacher_id === tid && parseInt((l.lesson_time||'').split(':')[0]) === h
  )

  // Модалка (общая для создания и редактирования)
  function renderModal(data, setData, title, onSave, extraButtons) {
    return (
      <Modal title={title} onClose={() => setData(null)}>
        <Field label="Педагог">
          <select className="s-input" value={data.teacher_id} onChange={e => setData({...data, teacher_id: e.target.value})}>
            <option value="">Выберите...</option>
            {teachers.map(t => <option key={t.id} value={t.id}>{t.full_name}</option>)}
          </select>
        </Field>
        <Field label="Ученик">
          <select className="s-input" value={data.student_id || ''} onChange={e => setData({...data, student_id: e.target.value})}>
            <option value="">Выберите или введите имя ниже</option>
            {students.map(s => <option key={s.id} value={s.id}>{s.full_name} {s.phone ? `(${s.phone})` : ''}</option>)}
          </select>
        </Field>
        {!data.student_id && (
          <Field label="Или имя вручную">
            <input className="s-input" value={data.student_name || ''} onChange={e => setData({...data, student_name: e.target.value})} placeholder="Имя ученика" />
          </Field>
        )}
        <Field label="Инструмент">
          <select className="s-input" value={data.instrument || ''} onChange={e => setData({...data, instrument: e.target.value})}>
            <option value="">Выберите...</option>
            {INSTRUMENTS.map(i => <option key={i} value={i}>{i}</option>)}
          </select>
        </Field>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
          <Field label="Дата"><input className="s-input" type="date" value={data.start_date || ''} onChange={e => setData({...data, start_date: e.target.value})} /></Field>
          <Field label="Время"><input className="s-input" type="time" value={data.lesson_time || ''} onChange={e => setData({...data, lesson_time: e.target.value})} /></Field>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
          <Field label="Длительность">
            <select className="s-input" value={data.lesson_duration} onChange={e => setData({...data, lesson_duration: e.target.value})}>
              {[30,45,60,90].map(m => <option key={m} value={m}>{m} мин</option>)}
            </select>
          </Field>
          <Field label="Тип">
            <select className="s-input" value={data.lesson_type} onChange={e => setData({...data, lesson_type: e.target.value})}>
              <option value="individual">Индивидуальный</option>
              <option value="group">Групповой</option>
            </select>
          </Field>
        </div>
        <Field label="Филиал">
          <select className="s-input" value={data.branch_name} onChange={e => setData({...data, branch_name: e.target.value})}>
            {branchNames.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
        </Field>
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:14 }}>
          <input type="checkbox" checked={data.repeat_weekly || false} onChange={e => setData({...data, repeat_weekly: e.target.checked})} style={{ accentColor:'var(--gold)' }} />
          <span style={{ fontSize:14 }}>Повторять еженедельно</span>
        </div>
        <Field label="Комментарий">
          <input className="s-input" value={data.notes || ''} onChange={e => setData({...data, notes: e.target.value})} placeholder="Необязательно" />
        </Field>
        <div style={{ display:'flex', gap:10, justifyContent:'flex-end', marginTop:20 }}>
          {extraButtons}
          <button className="btn-secondary" onClick={() => setData(null)}>Отмена</button>
          <button className="btn-primary" onClick={onSave}>{title === 'Новый урок' ? 'Создать урок' : 'Сохранить'}</button>
        </div>
      </Modal>
    )
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16, flexWrap:'wrap', gap:10 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <button className="btn-secondary" onClick={() => setDate(addDays(date,-1))} style={{padding:'5px 8px'}}>‹</button>
          <div style={{ fontSize:15, fontWeight:700, minWidth:200, textAlign:'center' }}>{formatDate(date)}</div>
          <button className="btn-secondary" onClick={() => setDate(addDays(date,1))} style={{padding:'5px 8px'}}>›</button>
          <button className="btn-secondary" onClick={() => setDate(new Date())}>Сегодня</button>
        </div>
        <button className="btn-primary" onClick={() => openCreate()}>
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
                    onClick={() => lesson ? openEdit(lesson) : openCreate(teacher.id, h)}
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
      {modal && renderModal(modal, setModal, 'Новый урок', saveLesson)}

      {/* Edit Modal */}
      {editModal && renderModal(editModal, setEditModal, 'Редактировать урок', updateLesson,
        <button className="btn-secondary" style={{ color:'var(--red)', borderColor:'var(--red)', marginRight:'auto' }}
          onClick={() => cancelLesson(editModal.id)}>
          Отменить урок
        </button>
      )}
    </div>
  )
}
