import React, { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { Avatar, Badge, Stat, Spinner, Empty, Modal, Field } from '../components/UI'

const PRIORITIES = [
  { id: 'low', label: 'Низкий', color: '#9498A8' },
  { id: 'medium', label: 'Средний', color: '#E08A3C' },
  { id: 'high', label: 'Высокий', color: '#D4574E' },
  { id: 'urgent', label: 'Срочный', color: '#B83246' },
]

const STATUSES = [
  { id: 'open', label: 'Открыта', color: '#4A7EC7' },
  { id: 'in_progress', label: 'В работе', color: '#E08A3C' },
  { id: 'done', label: 'Готово', color: '#3BA676' },
  { id: 'cancelled', label: 'Отменена', color: '#9498A8' },
]

export default function Tasks() {
  const [tasks, setTasks] = useState([])
  const [staff, setStaff] = useState([])
  const [loading, setLoading] = useState(true)
  const [addModal, setAddModal] = useState(null)
  const [filterStatus, setFilterStatus] = useState('active') // active | done | all
  const [filterAssignee, setFilterAssignee] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const [t, s] = await Promise.all([
      supabase.from('tasks').select('*').order('created_at', { ascending: false }),
      supabase.from('users').select('id,full_name,role').in('role', ['teacher', 'admin']).order('full_name'),
    ])
    setTasks(t.data || [])
    setStaff(s.data || [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function addTask() {
    if (!addModal || !addModal.title) return
    const { error } = await supabase.from('tasks').insert({
      title: addModal.title,
      description: addModal.description || null,
      assigned_to: addModal.assigned_to || null,
      priority: addModal.priority || 'medium',
      due_date: addModal.due_date || null,
      branch_name: addModal.branch_name || null,
      status: 'open',
    })
    if (error) { alert('Ошибка: ' + error.message); return }
    setAddModal(null)
    load()
  }

  async function changeStatus(taskId, newStatus) {
    const updates = { status: newStatus }
    if (newStatus === 'done') updates.completed_at = new Date().toISOString()
    await supabase.from('tasks').update(updates).eq('id', taskId)
    load()
  }

  async function changePriority(taskId, newPriority) {
    await supabase.from('tasks').update({ priority: newPriority }).eq('id', taskId)
    load()
  }

  async function deleteTask(taskId) {
    if (!confirm('Удалить задачу?')) return
    await supabase.from('tasks').delete().eq('id', taskId)
    load()
  }

  const staffName = id => staff.find(s => s.id === id)?.full_name || '—'
  const priInfo = id => PRIORITIES.find(p => p.id === id) || PRIORITIES[1]
  const statInfo = id => STATUSES.find(s => s.id === id) || STATUSES[0]

  // Фильтрация
  let filtered = tasks
  if (filterStatus === 'active') filtered = filtered.filter(t => t.status === 'open' || t.status === 'in_progress')
  else if (filterStatus === 'done') filtered = filtered.filter(t => t.status === 'done' || t.status === 'cancelled')
  if (filterAssignee) filtered = filtered.filter(t => t.assigned_to === filterAssignee)

  // Stats
  const openCount = tasks.filter(t => t.status === 'open').length
  const progressCount = tasks.filter(t => t.status === 'in_progress').length
  const doneCount = tasks.filter(t => t.status === 'done').length
  const overdueCount = tasks.filter(t => t.due_date && new Date(t.due_date) < new Date() && t.status !== 'done' && t.status !== 'cancelled').length

  if (loading) return <Spinner />

  return (
    <div>
      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: 12, marginBottom: 20 }}>
        <Stat label="Открытых" value={openCount} accent="#4A7EC7" />
        <Stat label="В работе" value={progressCount} accent="#E08A3C" />
        <Stat label="Готово" value={doneCount} accent="#3BA676" />
        <Stat label="Просрочено" value={overdueCount} accent={overdueCount > 0 ? '#D4574E' : undefined} />
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: 2, background: 'var(--bg-alt)', padding: 2, borderRadius: 6, border: '1px solid var(--line)' }}>
            {[{ id: 'active', label: 'Активные' }, { id: 'done', label: 'Готовые' }, { id: 'all', label: 'Все' }].map(f => (
              <button key={f.id} onClick={() => setFilterStatus(f.id)} style={{
                padding: '5px 12px', borderRadius: 4, fontSize: 11, fontWeight: 600,
                border: 'none', cursor: 'pointer', fontFamily: 'var(--font)',
                background: filterStatus === f.id ? 'var(--card)' : 'transparent',
                color: filterStatus === f.id ? 'var(--gold)' : 'var(--ink-muted)',
                boxShadow: filterStatus === f.id ? 'var(--shadow-1)' : 'none',
              }}>{f.label}</button>
            ))}
          </div>
          <select className="s-select" value={filterAssignee} onChange={e => setFilterAssignee(e.target.value)} style={{ minWidth: 150 }}>
            <option value="">Все сотрудники</option>
            {staff.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}
          </select>
        </div>
        <button className="btn-primary" onClick={() => setAddModal({ title: '', description: '', assigned_to: '', priority: 'medium', due_date: '', branch_name: '' })}>
          + Новая задача
        </button>
      </div>

      {/* Task list */}
      {filtered.length === 0 ? <Empty title="Нет задач" sub={filterStatus === 'active' ? 'Всё сделано ✓' : 'Нет задач по фильтру'} /> :
        filtered.map(task => {
          const pri = priInfo(task.priority)
          const stat = statInfo(task.status)
          const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'done' && task.status !== 'cancelled'
          return (
            <div key={task.id} style={{
              background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 12,
              padding: '14px 18px', marginBottom: 10, boxShadow: 'var(--shadow-1)',
              borderLeft: `4px solid ${pri.color}`,
              opacity: task.status === 'done' || task.status === 'cancelled' ? 0.6 : 1,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontSize: 14, fontWeight: 700, marginBottom: 4,
                    textDecoration: task.status === 'done' ? 'line-through' : 'none'
                  }}>{task.title}</div>
                  {task.description && <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginBottom: 6 }}>{task.description}</div>}
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', fontSize: 11 }}>
                    <Badge color={pri.color}>{pri.label}</Badge>
                    <Badge color={stat.color}>{stat.label}</Badge>
                    {task.assigned_to && (
                      <span style={{ color: 'var(--ink-muted)' }}>👤 {staffName(task.assigned_to)}</span>
                    )}
                    {task.due_date && (
                      <span style={{ color: isOverdue ? 'var(--red)' : 'var(--ink-muted)', fontWeight: isOverdue ? 700 : 400 }}>
                        📅 {new Date(task.due_date).toLocaleDateString('ru')} {isOverdue ? '⚠️' : ''}
                      </span>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                  {task.status !== 'done' && (
                    <>
                      {task.status === 'open' && <button className="btn-secondary" style={{ padding: '4px 8px', fontSize: 10 }} onClick={() => changeStatus(task.id, 'in_progress')}>▶ В работу</button>}
                      <button className="btn-secondary" style={{ padding: '4px 8px', fontSize: 10, color: 'var(--green)' }} onClick={() => changeStatus(task.id, 'done')}>✓</button>
                    </>
                  )}
                  <button className="btn-secondary" style={{ padding: '4px 8px', fontSize: 10, color: 'var(--red)' }} onClick={() => deleteTask(task.id)}>✕</button>
                </div>
              </div>
            </div>
          )
        })
      }

      {/* Add Modal */}
      {addModal && (
        <Modal title="Новая задача" onClose={() => setAddModal(null)}>
          <Field label="Задача">
            <input className="s-input" value={addModal.title} onChange={e => setAddModal({ ...addModal, title: e.target.value })} placeholder="Что нужно сделать" autoFocus />
          </Field>
          <Field label="Описание">
            <input className="s-input" value={addModal.description} onChange={e => setAddModal({ ...addModal, description: e.target.value })} placeholder="Подробности (необязательно)" />
          </Field>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Назначить">
              <select className="s-input" value={addModal.assigned_to} onChange={e => setAddModal({ ...addModal, assigned_to: e.target.value })}>
                <option value="">Не назначено</option>
                {staff.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}
              </select>
            </Field>
            <Field label="Приоритет">
              <select className="s-input" value={addModal.priority} onChange={e => setAddModal({ ...addModal, priority: e.target.value })}>
                {PRIORITIES.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Дедлайн">
            <input className="s-input" type="date" value={addModal.due_date} onChange={e => setAddModal({ ...addModal, due_date: e.target.value })} />
          </Field>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
            <button className="btn-secondary" onClick={() => setAddModal(null)}>Отмена</button>
            <button className="btn-primary" onClick={addTask}>Создать</button>
          </div>
        </Modal>
      )}
    </div>
  )
}
