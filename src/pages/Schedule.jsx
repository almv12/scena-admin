import React, { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { instrColor, INSTRUMENTS, formatDate, dateStr, addDays, Avatar, Modal, Field, Spinner } from '../components/UI'

// 15-минутные слоты для точного позиционирования
const START_HOUR = 8
const END_HOUR = 21
const TOTAL_SLOTS = (END_HOUR - START_HOUR) * 2 // 30-мин слоты для header
const SLOT_WIDTH = 60 // px за 30 мин

// Часовые метки для header
const HOURS_LABELS = []
for (let h = START_HOUR; h <= END_HOUR; h++) {
  HOURS_LABELS.push(h)
}

function timeToMinutes(time) {
  if (!time) return 0
  const p = time.split(':')
  return parseInt(p[0]) * 60 + parseInt(p[1] || 0)
}

function minutesToTime(min) {
  const h = Math.floor(min / 60)
  const m = min % 60
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`
}

// Позиция урока в пикселях (от начала сетки)
function lessonLeft(time) {
  const min = timeToMinutes(time)
  return ((min - START_HOUR * 60) / 30) * SLOT_WIDTH
}

function lessonWidth(duration) {
  return ((duration || 60) / 30) * SLOT_WIDTH - 4
}

export default function Schedule({ branch, branches }) {
  const [date, setDate] = useState(new Date())
  const [teachers, setTeachers] = useState([])
  const [students, setStudents] = useState([])
  const [lessons, setLessons] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)
  const [editModal, setEditModal] = useState(null)

  const branchNames = branches && branches.length > 0
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
    const { data: sch } = await supabase.from('schedule').select('*')
      .or(`start_date.eq.${ds},and(repeat_weekly.eq.true,day_of_week.eq.${dow})`)
      .neq('status','cancelled')

    setLessons(sch || [])
    setLoading(false)
  }, [date])

  useEffect(() => { load() }, [load])

  // Фильтр уроков по филиалу
  const filteredLessons = branch && branch !== 'all'
    ? lessons.filter(l => l.branch_name === branch)
    : lessons

  // Фильтр педагогов: показывать только тех у кого есть уроки или привязаны к филиалу
  const filteredTeachers = branch && branch !== 'all'
    ? teachers.filter(t => {
        // Показать если у педагога есть уроки в этом филиале
        const hasLessons = filteredLessons.some(l => l.teacher_id === t.id)
        return hasLessons || !branch // или если филиал не выбран
      })
    : teachers

  // Если после фильтра пусто — показать всех (чтобы можно было добавлять)
  const displayTeachers = filteredTeachers.length > 0 ? filteredTeachers : teachers

  function openCreate(teacherId, minuteOfDay) {
    const time = minuteOfDay ? minutesToTime(minuteOfDay) : ''
    setModal({
      teacher_id: teacherId || '',
      student_id: '',
      student_name: '',
      instrument: '',
      lesson_time: time,
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

  // Уроки для конкретного педагога
  function teacherLessons(tid) {
    return filteredLessons.filter(l => l.teacher_id === tid)
  }

  // Клик на пустую область — вычисляем время по X координатe
  function handleRowClick(e, teacherId) {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const minuteOffset = Math.floor(x / SLOT_WIDTH) * 30
    const minuteOfDay = START_HOUR * 60 + minuteOffset
    if (minuteOfDay >= START_HOUR * 60 && minuteOfDay < END_HOUR * 60) {
      openCreate(teacherId, minuteOfDay)
    }
  }

  const gridWidth = HOURS_LABELS.length * SLOT_WIDTH * 2

  // Модалка
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
          <Field label="Время"><input className="s-input" type="time" value={data.lesson_time || ''} onChange={e => setData({...data, lesson_time: e.target.value})} step="300" /></Field>
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
        <button className="btn-primary" onClick={() => openCreate()}>+ Новый урок</button>
      </div>

      {loading ? <Spinner /> : (
        <div className="s-card" style={{ overflowX:'auto', overflowY:'auto' }}>
          {/* Header — часовые метки */}
          <div style={{ display:'flex', borderBottom:'2px solid var(--line)' }}>
            <div style={{ width:140, minWidth:140, flexShrink:0, padding:'10px 14px', fontSize:10.5, fontWeight:700, color:'var(--ink-muted)', background:'var(--bg-alt)', position:'sticky', left:0, zIndex:3 }}>
              ПЕДАГОГ
            </div>
            <div style={{ display:'flex', position:'relative' }}>
              {HOURS_LABELS.map(h => (
                <div key={h} style={{
                  width: SLOT_WIDTH * 2, minWidth: SLOT_WIDTH * 2,
                  padding:'10px 0', fontSize:10, fontWeight:600,
                  color:'var(--ink-muted)', textAlign:'center',
                  borderLeft:'1px solid var(--line-soft)', background:'var(--bg-alt)'
                }}>
                  {h}:00
                </div>
              ))}
            </div>
          </div>

          {/* Rows — педагоги */}
          {displayTeachers.length === 0 ? (
            <div style={{ padding:40, textAlign:'center', color:'var(--ink-muted)' }}>Педагоги не найдены.</div>
          ) : displayTeachers.map((teacher, ri) => {
            const tLessons = teacherLessons(teacher.id)
            const bgColor = ri % 2 === 0 ? 'transparent' : 'rgba(239,238,233,0.3)'
            return (
              <div key={teacher.id} style={{ display:'flex', borderBottom:'1px solid var(--line-soft)' }}>
                {/* Имя педагога */}
                <div style={{
                  width:140, minWidth:140, flexShrink:0, padding:'0 14px',
                  fontSize:13, fontWeight:600, display:'flex', alignItems:'center', gap:8,
                  background: bgColor, position:'sticky', left:0, zIndex:2
                }}>
                  <Avatar name={teacher.full_name} size={26} color={instrColor(null)} />
                  <span style={{ whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                    {teacher.full_name || '—'}
                  </span>
                </div>

                {/* Сетка + уроки (absolute positioning) */}
                <div
                  style={{ position:'relative', minHeight:50, width: HOURS_LABELS.length * SLOT_WIDTH * 2, background: bgColor, cursor:'pointer' }}
                  onClick={(e) => {
                    // Только если кликнули на пустое место (не на урок)
                    if (e.target === e.currentTarget || e.target.dataset.empty) {
                      handleRowClick(e, teacher.id)
                    }
                  }}
                >
                  {/* Вертикальные линии каждый час */}
                  {HOURS_LABELS.map((h, i) => (
                    <div key={h} data-empty="true" style={{
                      position:'absolute', left: i * SLOT_WIDTH * 2, top:0, bottom:0,
                      borderLeft:'1px solid var(--line-soft)', width:1, pointerEvents:'none'
                    }} />
                  ))}
                  {/* Пунктирные линии каждые 30 мин */}
                  {HOURS_LABELS.map((h, i) => (
                    <div key={`half-${h}`} data-empty="true" style={{
                      position:'absolute', left: i * SLOT_WIDTH * 2 + SLOT_WIDTH, top:0, bottom:0,
                      borderLeft:'1px dashed rgba(0,0,0,0.04)', width:1, pointerEvents:'none'
                    }} />
                  ))}

                  {/* Уроки — абсолютно спозиционированные */}
                  {tLessons.map(lesson => {
                    const left = lessonLeft(lesson.lesson_time)
                    const width = lessonWidth(lesson.lesson_duration)
                    if (left < 0) return null
                    return (
                      <div key={lesson.id}
                        onClick={(e) => { e.stopPropagation(); openEdit(lesson) }}
                        style={{
                          position:'absolute', top:3, bottom:3,
                          left: left + 2, width: width,
                          borderRadius:5, padding:'3px 6px',
                          background: instrColor(lesson.instrument), color:'#fff',
                          fontSize:10, fontWeight:600, overflow:'hidden',
                          display:'flex', flexDirection:'column', justifyContent:'center',
                          boxShadow:'0 1px 4px rgba(0,0,0,0.15)', cursor:'pointer',
                          zIndex:1
                        }}
                        title={`${lesson.student_name} • ${lesson.instrument} • ${lesson.lesson_time} • ${lesson.lesson_duration}мин`}
                      >
                        <div style={{ whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', fontWeight:700, fontSize:10.5 }}>
                          {lesson.student_name || '—'}
                        </div>
                        <div style={{ opacity:0.85, fontSize:9 }}>
                          {lesson.instrument || ''} • {lesson.lesson_duration || 60}м
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
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

