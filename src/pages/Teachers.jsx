import React, { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { instrColor, Avatar, Badge, Stat, Spinner, Empty, DetailPanel, Section, InfoRow, Modal, Field } from '../components/UI'

export default function Teachers({ branch }) {
  const [teachers, setTeachers] = useState([])
  const [rates, setRates] = useState([])
  const [lessonCounts, setLessonCounts] = useState({})
  const [loading, setLoading] = useState(true)
  const [detail, setDetail] = useState(null)
  const [detailLessons, setDetailLessons] = useState([])
  const [rateModal, setRateModal] = useState(null)
  const [editModal, setEditModal] = useState(null)
  const [addModal, setAddModal] = useState(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    const [t, r] = await Promise.all([
      supabase.from('users').select('*').eq('role','teacher').order('full_name'),
      supabase.from('teacher_rates').select('*'),
    ])
    setTeachers(t.data || [])
    setRates(r.data || [])

    // Подсчёт уроков за текущий месяц
    const now = new Date()
    const firstDay = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-01`
    const { data: lessons } = await supabase.from('conducted_lessons').select('teacher_id, lesson_type, status')
      .eq('status','approved').gte('lesson_date', firstDay)

    const counts = {}
    ;(lessons || []).forEach(l => {
      if (!counts[l.teacher_id]) counts[l.teacher_id] = { indiv: 0, group: 0, total: 0 }
      if (l.lesson_type === 'group') counts[l.teacher_id].group++
      else counts[l.teacher_id].indiv++
      counts[l.teacher_id].total++
    })
    setLessonCounts(counts)
    setLoading(false)
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const getRate = id => rates.find(r => r.teacher_id === id)
  const getCount = id => lessonCounts[id] || { indiv: 0, group: 0, total: 0 }

  // Открыть карточку педагога
  async function openDetail(t) {
    setDetail(t)
    const { data } = await supabase.from('conducted_lessons').select('*')
      .eq('teacher_id', t.id)
      .order('lesson_date', { ascending: false })
      .limit(15)
    setDetailLessons(data || [])
  }

  // Установить / обновить ставки
  async function saveRate() {
    if (!rateModal) return
    const indiv = parseInt(rateModal.individual_rate) || 0
    const group = parseInt(rateModal.group_rate) || 0

    const existing = getRate(rateModal.teacher_id)
    if (existing) {
      const { error } = await supabase.from('teacher_rates').update({
        individual_rate: indiv,
        group_rate: group,
      }).eq('id', existing.id)
      if (error) { alert('Ошибка: ' + error.message); return }
    } else {
      const { error } = await supabase.from('teacher_rates').insert({
        teacher_id: rateModal.teacher_id,
        individual_rate: indiv,
        group_rate: group,
      })
      if (error) { alert('Ошибка: ' + error.message); return }
    }
    setRateModal(null)
    loadData()
  }

  // Редактировать педагога (имя, телефон, altegio_staff_id)
  async function saveEdit() {
    if (!editModal) return
    const updates = {
      full_name: editModal.full_name,
      phone: editModal.phone || null,
    }
    if (editModal.altegio_staff_id !== undefined) {
      updates.altegio_staff_id = editModal.altegio_staff_id ? parseInt(editModal.altegio_staff_id) : null
    }
    const { error } = await supabase.from('users').update(updates).eq('id', editModal.id)
    if (error) { alert('Ошибка: ' + error.message); return }
    setEditModal(null)
    setDetail(null)
    loadData()
  }

  // Добавить нового педагога
  async function addTeacher() {
    if (!addModal || !addModal.full_name) return
    const { error } = await supabase.from('users').insert({
      full_name: addModal.full_name,
      phone: addModal.phone || null,
      role: 'teacher',
      altegio_staff_id: addModal.altegio_staff_id ? parseInt(addModal.altegio_staff_id) : null,
    })
    if (error) { alert('Ошибка: ' + error.message); return }
    setAddModal(null)
    loadData()
  }

  const attLabel = a => ({present:'Был',late:'Опоздал',absent:'Не был',cancelled:'Отменён'}[a]||'—')
  const attColor = a => ({present:'#3BA676',late:'#E08A3C',absent:'#D4574E'}[a]||'#9498A8')

  if (loading) return <Spinner />

  const totalLessons = Object.values(lessonCounts).reduce((s, c) => s + c.total, 0)
  const withRates = teachers.filter(t => getRate(t.id)).length

  return (
    <div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(170px,1fr))', gap:12, marginBottom:20 }}>
        <Stat label="Педагогов" value={teachers.length} />
        <Stat label="Со ставками" value={withRates} accent={withRates < teachers.length ? '#E08A3C' : '#3BA676'} />
        <Stat label="С Altegio ID" value={teachers.filter(t=>t.altegio_staff_id).length} accent="#4A7EC7" />
        <Stat label="Уроков (месяц)" value={totalLessons} sub="подтверждённых" />
      </div>

      <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:14 }}>
        <button className="btn-primary" onClick={() => setAddModal({ full_name:'', phone:'', altegio_staff_id:'' })}>
          + Добавить педагога
        </button>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(320px,1fr))', gap:14 }}>
        {teachers.map(t => {
          const rate = getRate(t.id)
          const count = getCount(t.id)
          return (
            <div key={t.id} className="s-card" style={{ cursor:'pointer', transition:'0.15s' }}>
              <div style={{ height:4, background: rate ? instrColor(null) : '#E08A3C' }} />
              <div style={{ padding:'16px 18px' }}>
                <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:12 }} onClick={() => openDetail(t)}>
                  <Avatar name={t.full_name} size={40} />
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:15, fontWeight:700 }}>{t.full_name || '—'}</div>
                    <div style={{ display:'flex', gap:6, alignItems:'center', marginTop:2, flexWrap:'wrap' }}>
                      {t.altegio_staff_id && <Badge color="#4A7EC7">Altegio {t.altegio_staff_id}</Badge>}
                      {!t.altegio_staff_id && <Badge color="#E08A3C">Без Altegio</Badge>}
                      {count.total > 0 && <Badge color="#3BA676">{count.total} уроков</Badge>}
                    </div>
                  </div>
                </div>

                <div style={{
                  display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8,
                  background:'var(--bg-alt)', borderRadius:8, padding:10, marginBottom:10
                }}>
                  <div style={{ textAlign:'center' }}>
                    <div style={{ fontSize:14, fontWeight:700 }}>{rate?.individual_rate ? `${(rate.individual_rate/1000).toFixed(0)}k` : '—'}</div>
                    <div style={{ fontSize:9.5, color:'var(--ink-muted)', textTransform:'uppercase', letterSpacing:0.5 }}>инд.</div>
                  </div>
                  <div style={{ textAlign:'center' }}>
                    <div style={{ fontSize:14, fontWeight:700 }}>{rate?.group_rate ? `${(rate.group_rate/1000).toFixed(0)}k` : '—'}</div>
                    <div style={{ fontSize:9.5, color:'var(--ink-muted)', textTransform:'uppercase', letterSpacing:0.5 }}>груп.</div>
                  </div>
                  <div style={{ textAlign:'center' }}>
                    <div style={{ fontSize:14, fontWeight:700 }}>{count.indiv}/{count.group}</div>
                    <div style={{ fontSize:9.5, color:'var(--ink-muted)', textTransform:'uppercase', letterSpacing:0.5 }}>инд/гр</div>
                  </div>
                </div>

                <div style={{ display:'flex', gap:6 }}>
                  <button className="btn-secondary" style={{ flex:1, padding:'5px 0', fontSize:11 }}
                    onClick={(e) => { e.stopPropagation(); setRateModal({
                      teacher_id: t.id,
                      teacher_name: t.full_name,
                      individual_rate: rate?.individual_rate || '',
                      group_rate: rate?.group_rate || '',
                    })}}>
                    💰 Ставки
                  </button>
                  <button className="btn-secondary" style={{ flex:1, padding:'5px 0', fontSize:11 }}
                    onClick={(e) => { e.stopPropagation(); setEditModal({
                      id: t.id,
                      full_name: t.full_name || '',
                      phone: t.phone || '',
                      altegio_staff_id: t.altegio_staff_id || '',
                    })}}>
                    ✏️ Редактировать
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {teachers.length === 0 && <Empty title="Нет педагогов" sub="Добавьте первого педагога" />}

      {/* Detail Panel */}
      {detail && (
        <DetailPanel title={detail.full_name || 'Педагог'} onClose={() => setDetail(null)}>
          <Section title="Контакты">
            <InfoRow label="Телефон" value={detail.phone} />
            <InfoRow label="Telegram" value={detail.username ? `@${detail.username}` : '—'} />
            <InfoRow label="Telegram ID" value={detail.telegram_id} />
            <InfoRow label="Altegio Staff ID" value={detail.altegio_staff_id} />
          </Section>

          <Section title="Ставки">
            {(() => {
              const r = getRate(detail.id)
              return r ? (
                <>
                  <InfoRow label="Индивидуальная" value={r.individual_rate ? `${r.individual_rate.toLocaleString()} сум` : 'Не установлена'} />
                  <InfoRow label="Групповая" value={r.group_rate ? `${r.group_rate.toLocaleString()} сум` : 'Не установлена'} />
                </>
              ) : <div style={{ fontSize:13, color:'var(--ink-faint)' }}>Ставки не установлены</div>
            })()}
          </Section>

          <Section title="Статистика (месяц)">
            {(() => {
              const c = getCount(detail.id)
              const r = getRate(detail.id)
              const salary = (c.indiv * (r?.individual_rate || 0)) + (c.group * (r?.group_rate || 0))
              return (
                <>
                  <InfoRow label="Индивидуальных" value={c.indiv} />
                  <InfoRow label="Групповых" value={c.group} />
                  <InfoRow label="Всего уроков" value={c.total} />
                  <InfoRow label="Зарплата" value={salary > 0 ? `${salary.toLocaleString()} сум` : '—'} />
                </>
              )
            })()}
          </Section>

          <Section title="Последние уроки">
            {detailLessons.length === 0 ? (
              <div style={{ fontSize:13, color:'var(--ink-faint)' }}>Нет данных</div>
            ) : detailLessons.slice(0,10).map(cl => (
              <div key={cl.id} style={{
                display:'flex', justifyContent:'space-between', padding:'5px 0',
                fontSize:12, borderBottom:'1px solid var(--line-soft)', alignItems:'center', gap:6
              }}>
                <span style={{ color:'var(--ink-soft)', minWidth:70 }}>{cl.lesson_date}</span>
                <span style={{ minWidth:40 }}>{cl.lesson_time}</span>
                <span style={{ flex:1 }}>{cl.student_name}</span>
                <span>{cl.instrument}</span>
                <span style={{ color:attColor(cl.attendance), fontWeight:600 }}>{attLabel(cl.attendance)}</span>
                <Badge color={cl.status==='approved'?'#3BA676':cl.status==='rejected'?'#D4574E':'#E08A3C'}>
                  {cl.status==='approved'?'✓':cl.status==='rejected'?'✗':'⏳'}
                </Badge>
              </div>
            ))}
          </Section>

          <div style={{ display:'flex', gap:8, marginTop:16 }}>
            <button className="btn-primary" style={{ flex:1 }} onClick={() => {
              setDetail(null)
              setRateModal({
                teacher_id: detail.id,
                teacher_name: detail.full_name,
                individual_rate: getRate(detail.id)?.individual_rate || '',
                group_rate: getRate(detail.id)?.group_rate || '',
              })
            }}>💰 Установить ставки</button>
            <button className="btn-secondary" style={{ flex:1 }} onClick={() => {
              setDetail(null)
              setEditModal({
                id: detail.id,
                full_name: detail.full_name || '',
                phone: detail.phone || '',
                altegio_staff_id: detail.altegio_staff_id || '',
              })
            }}>✏️ Редактировать</button>
          </div>
        </DetailPanel>
      )}

      {/* Rate Modal */}
      {rateModal && (
        <Modal title={`Ставки — ${rateModal.teacher_name}`} onClose={() => setRateModal(null)} width={400}>
          <Field label="Индивидуальная ставка (сум)">
            <input className="s-input" type="number" value={rateModal.individual_rate}
              onChange={e => setRateModal({...rateModal, individual_rate: e.target.value})}
              placeholder="50000" autoFocus />
          </Field>
          <Field label="Групповая ставка (сум)">
            <input className="s-input" type="number" value={rateModal.group_rate}
              onChange={e => setRateModal({...rateModal, group_rate: e.target.value})}
              placeholder="70000" />
          </Field>
          <div style={{ fontSize:11, color:'var(--ink-muted)', marginBottom:14 }}>
            Ставка за 1 урок. Зарплата = кол-во подтверждённых уроков × ставка.
          </div>
          <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
            <button className="btn-secondary" onClick={() => setRateModal(null)}>Отмена</button>
            <button className="btn-primary" onClick={saveRate}>Сохранить</button>
          </div>
        </Modal>
      )}

      {/* Edit Modal */}
      {editModal && (
        <Modal title="Редактировать педагога" onClose={() => setEditModal(null)} width={440}>
          <Field label="Имя">
            <input className="s-input" value={editModal.full_name}
              onChange={e => setEditModal({...editModal, full_name: e.target.value})} autoFocus />
          </Field>
          <Field label="Телефон">
            <input className="s-input" value={editModal.phone}
              onChange={e => setEditModal({...editModal, phone: e.target.value})}
              placeholder="+998 90 123 45 67" />
          </Field>
          <Field label="Altegio Staff ID">
            <input className="s-input" type="number" value={editModal.altegio_staff_id}
              onChange={e => setEditModal({...editModal, altegio_staff_id: e.target.value})}
              placeholder="Оставьте пустым если нет Altegio" />
          </Field>
          <div style={{ fontSize:11, color:'var(--ink-muted)', marginBottom:14 }}>
            Altegio Staff ID нужен для привязки расписания из Altegio. Если филиал без Altegio — оставьте пустым.
          </div>
          <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
            <button className="btn-secondary" onClick={() => setEditModal(null)}>Отмена</button>
            <button className="btn-primary" onClick={saveEdit}>Сохранить</button>
          </div>
        </Modal>
      )}

      {/* Add Teacher Modal */}
      {addModal && (
        <Modal title="Новый педагог" onClose={() => setAddModal(null)} width={440}>
          <Field label="Имя">
            <input className="s-input" value={addModal.full_name}
              onChange={e => setAddModal({...addModal, full_name: e.target.value})}
              placeholder="Имя педагога" autoFocus />
          </Field>
          <Field label="Телефон">
            <input className="s-input" value={addModal.phone}
              onChange={e => setAddModal({...addModal, phone: e.target.value})}
              placeholder="+998 90 123 45 67" />
          </Field>
          <Field label="Altegio Staff ID (необязательно)">
            <input className="s-input" type="number" value={addModal.altegio_staff_id}
              onChange={e => setAddModal({...addModal, altegio_staff_id: e.target.value})}
              placeholder="Оставьте пустым если нет" />
          </Field>
          <div style={{ display:'flex', gap:10, justifyContent:'flex-end', marginTop:20 }}>
            <button className="btn-secondary" onClick={() => setAddModal(null)}>Отмена</button>
            <button className="btn-primary" onClick={addTeacher}>Добавить</button>
          </div>
        </Modal>
      )}
    </div>
  )
}

