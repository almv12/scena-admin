import React, { useState, useEffect, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { instrColor, Badge, Avatar, Stat, Spinner, Empty, DetailPanel, Section, InfoRow, Modal, Field } from '../components/UI'

const STATUSES = [
  { id: 'lead', label: 'Лид', color: '#9498A8' },
  { id: 'trial', label: 'Пробный', color: '#E08A3C' },
  { id: 'active', label: 'Активный', color: '#3BA676' },
  { id: 'frozen', label: 'Заморозка', color: '#4A7EC7' },
  { id: 'left', label: 'Ушёл', color: '#D4574E' },
  { id: 'returned', label: 'Вернулся', color: '#8B6CC7' },
]

const SOURCES = [
  { id: 'instagram', label: 'Instagram' },
  { id: 'website', label: 'Сайт' },
  { id: 'landing', label: 'Лендинг' },
  { id: 'referral', label: 'Реферал' },
  { id: 'call', label: 'Звонок' },
  { id: 'sign', label: 'Вывеска' },
  { id: 'friends', label: 'Друзья' },
  { id: 'event', label: 'Мероприятие' },
  { id: 'other', label: 'Другое' },
]

export default function Students({ branch }) {
  const [students, setStudents] = useState([])
  const [packages, setPackages] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [detail, setDetail] = useState(null)
  const [detailLessons, setDetailLessons] = useState([])
  const [addModal, setAddModal] = useState(null)
  const [editName, setEditName] = useState(null)
  const [balanceModal, setBalanceModal] = useState(null)
  const [balanceAmount, setBalanceAmount] = useState('')
  const [editDetailModal, setEditDetailModal] = useState(null)
  const [filterStatus, setFilterStatus] = useState('')

  async function loadStudents() {
    const [s, p] = await Promise.all([
      supabase.from('users').select('*').eq('role','student').order('full_name'),
      supabase.from('lesson_packages').select('*').eq('is_active', true).order('lessons_count'),
    ])
    setStudents(s.data || [])
    setPackages(p.data || [])
    setLoading(false)
  }

  useEffect(() => { loadStudents() }, [])

  const filtered = useMemo(() => {
    let list = students
    if (filterStatus) list = list.filter(st => (st.student_status || 'active') === filterStatus)
    if (search) {
      const s = search.toLowerCase()
      list = list.filter(st =>
        (st.full_name||'').toLowerCase().includes(s) ||
        (st.phone||'').includes(s) ||
        (st.username||'').toLowerCase().includes(s)
      )
    }
    return list
  }, [students, search, filterStatus])

  async function openDetail(st) {
    setDetail(st)
    const { data } = await supabase.from('conducted_lessons').select('*')
      .eq('student_name', st.full_name)
      .order('lesson_date', { ascending: false })
      .limit(15)
    setDetailLessons(data || [])
  }

  async function addStudent() {
    if (!addModal.full_name) return
    const { error } = await supabase.from('users').insert({
      full_name: addModal.full_name,
      phone: addModal.phone || null,
      role: 'student',
      source: addModal.source || null,
      student_status: 'active',
      lessons_balance: 0,
    })
    if (error) { alert('Ошибка: ' + error.message); return }
    setAddModal(null)
    loadStudents()
  }

  async function saveName() {
    if (!editName || !editName.full_name) return
    const { error } = await supabase.from('users').update({ full_name: editName.full_name }).eq('id', editName.id)
    if (error) { alert('Ошибка: ' + error.message); return }
    setEditName(null)
    setDetail(null)
    loadStudents()
  }

  // Пополнить баланс пакетом
  async function addPackage(studentId, count, pkgName) {
    const student = students.find(s => s.id === studentId)
    const newBalance = (student?.lessons_balance || 0) + count
    await supabase.from('users').update({ lessons_balance: newBalance, subscription_type: pkgName }).eq('id', studentId)
    setBalanceModal(null)
    loadStudents()
  }

  // Установить баланс вручную
  async function setBalanceDirect(studentId) {
    const amount = parseInt(balanceAmount)
    if (isNaN(amount) || amount < 0) return
    await supabase.from('users').update({ lessons_balance: amount }).eq('id', studentId)
    setBalanceModal(null)
    setBalanceAmount('')
    loadStudents()
  }

  // Сохранить статус/источник
  async function saveDetail() {
    if (!editDetailModal) return
    await supabase.from('users').update({
      student_status: editDetailModal.student_status,
      source: editDetailModal.source || null,
      notes: editDetailModal.notes || null,
    }).eq('id', editDetailModal.id)
    setEditDetailModal(null)
    setDetail(null)
    loadStudents()
  }

  // Экспорт CSV
  function exportCSV() {
    const headers = ['Имя', 'Телефон', 'Telegram', 'Статус', 'Источник', 'Баланс', 'Пакет', 'Дата регистрации']
    const rows = filtered.map(st => [
      st.full_name || '',
      st.phone || '',
      st.username ? '@' + st.username : '',
      getStatusLabel(st.student_status),
      getSourceLabel(st.source),
      st.lessons_balance || 0,
      st.subscription_type || '',
      st.created_at ? new Date(st.created_at).toLocaleDateString('ru') : '',
    ])
    const csv = [headers, ...rows].map(r => r.map(c => '"' + String(c).replace(/"/g, '""') + '"').join(',')).join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'students_' + new Date().toISOString().slice(0, 10) + '.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const getStatusInfo = id => STATUSES.find(s => s.id === id) || { label: 'Активный', color: '#3BA676' }
  const getStatusLabel = id => getStatusInfo(id).label
  const getSourceLabel = id => SOURCES.find(s => s.id === id)?.label || id || '—'

  const attLabel = a => ({present:'Был',late:'Опоздал',absent:'Не был',cancelled:'Отменён'}[a]||'—')
  const attColor = a => ({present:'#3BA676',late:'#E08A3C',absent:'#D4574E'}[a]||'#9498A8')

  const lowBalance = students.filter(s => (s.lessons_balance || 0) <= 2 && (s.lessons_balance || 0) >= 0).length
  const zeroBalance = students.filter(s => (s.lessons_balance || 0) <= 0).length

  return (
    <div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))', gap:12, marginBottom:20 }}>
        <Stat label="Всего учеников" value={students.length} />
        <Stat label="Баланс = 0" value={zeroBalance} accent={zeroBalance > 0 ? '#D4574E' : '#3BA676'} />
        <Stat label="Баланс ≤ 2" value={lowBalance} accent={lowBalance > 0 ? '#E08A3C' : undefined} />
        <Stat label="С Telegram" value={students.filter(s=>s.telegram_id).length} accent="#4A7EC7" />
      </div>

      <div className="s-card">
        <div style={{ padding:'14px 18px', borderBottom:'1px solid var(--line)', display:'flex', gap:10, alignItems:'center', flexWrap:'wrap' }}>
          <div style={{ position:'relative', flex:1, minWidth:200 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--ink-muted)" strokeWidth="2" style={{ position:'absolute', left:11, top:'50%', transform:'translateY(-50%)' }}>
              <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
            </svg>
            <input className="s-input" style={{ paddingLeft:34 }} placeholder="Поиск по имени, телефону..." value={search} onChange={e=>setSearch(e.target.value)} />
          </div>
          {/* Фильтр по статусу */}
          <select className="s-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ minWidth: 130 }}>
            <option value="">Все статусы</option>
            {STATUSES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
          <button className="btn-secondary" onClick={exportCSV} title="Экспорт">📥 Excel</button>
          <button className="btn-primary" onClick={() => setAddModal({ full_name: '', phone: '', source: '' })}>+ Добавить</button>
        </div>

        {loading ? <Spinner /> : filtered.length === 0 ? (
          <Empty title="Учеников не найдено" sub={search ? 'Попробуйте изменить запрос' : 'Нет данных'} />
        ) : (
          <div style={{ overflowX:'auto', maxHeight:'calc(100vh - 300px)', overflowY:'auto' }}>
            <table className="s-table">
              <thead>
                <tr>
                  <th>Имя</th><th>Телефон</th><th>Баланс</th><th>Статус</th><th>Источник</th><th>Telegram</th><th>Дата</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(st => {
                  const si = getStatusInfo(st.student_status)
                  const bal = st.lessons_balance || 0
                  return (
                    <tr key={st.id} onClick={()=>openDetail(st)}>
                      <td>
                        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                          <Avatar name={st.full_name} size={28} />
                          <span style={{ fontWeight:600 }}>{st.full_name || '—'}</span>
                        </div>
                      </td>
                      <td style={{ fontSize:12.5, color:'var(--ink-soft)', fontVariantNumeric:'tabular-nums' }}>{st.phone || '—'}</td>
                      <td>
                        <span style={{
                          fontWeight:700, fontSize:13, fontVariantNumeric:'tabular-nums',
                          color: bal <= 0 ? '#D4574E' : bal <= 2 ? '#E08A3C' : '#3BA676',
                          cursor: 'pointer'
                        }} onClick={e => { e.stopPropagation(); setBalanceModal(st.id); setBalanceAmount(String(bal)) }}>
                          🎟 {bal}
                        </span>
                      </td>
                      <td><Badge color={si.color}>{si.label}</Badge></td>
                      <td style={{ fontSize:12 }}>{getSourceLabel(st.source)}</td>
                      <td style={{ fontSize:12.5 }}>{st.username ? `@${st.username}` : '—'}</td>
                      <td style={{ fontSize:12, color:'var(--ink-muted)' }}>{st.created_at ? new Date(st.created_at).toLocaleDateString('ru') : '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail Panel */}
      {detail && (
        <DetailPanel title={detail.full_name || 'Ученик'} onClose={()=>setDetail(null)}>
          <Section title="Контакты">
            <InfoRow label="Имя" value={
              <span style={{ display:'flex', alignItems:'center', gap:6 }}>
                {detail.full_name || '—'}
                <button onClick={() => setEditName({ id: detail.id, full_name: detail.full_name })}
                  style={{ background:'none', border:'none', cursor:'pointer', fontSize:14, padding:0 }}>✏️</button>
              </span>
            } />
            <InfoRow label="Телефон" value={detail.phone} />
            <InfoRow label="Telegram" value={detail.username ? `@${detail.username}` : '—'} />
          </Section>

          <Section title="Абонемент">
            <InfoRow label="Баланс" value={
              <span style={{ fontWeight:700, color: (detail.lessons_balance||0) <= 0 ? '#D4574E' : (detail.lessons_balance||0) <= 2 ? '#E08A3C' : '#3BA676' }}>
                {detail.lessons_balance || 0} уроков
              </span>
            } />
            <InfoRow label="Пакет" value={detail.subscription_type || '—'} />
            <button className="btn-primary" style={{ width:'100%', marginTop:8, padding:10, fontSize:13 }}
              onClick={() => { setBalanceModal(detail.id); setBalanceAmount(String(detail.lessons_balance || 0)) }}>
              🎟 Пополнить баланс
            </button>
          </Section>

          <Section title="Статус и источник">
            <InfoRow label="Статус" value={<Badge color={getStatusInfo(detail.student_status).color}>{getStatusInfo(detail.student_status).label}</Badge>} />
            <InfoRow label="Источник" value={getSourceLabel(detail.source)} />
            {detail.notes && <InfoRow label="Заметки" value={detail.notes} />}
            <button className="btn-secondary" style={{ width:'100%', marginTop:8, padding:8, fontSize:12 }}
              onClick={() => setEditDetailModal({ id: detail.id, student_status: detail.student_status || 'active', source: detail.source || '', notes: detail.notes || '' })}>
              ⚙️ Изменить статус/источник
            </button>
          </Section>

          <Section title="Последние уроки">
            {detailLessons.length === 0 ? (
              <div style={{ fontSize:13, color:'var(--ink-faint)' }}>Нет данных</div>
            ) : detailLessons.slice(0,10).map(cl => (
              <div key={cl.id} style={{
                display:'flex', justifyContent:'space-between', padding:'5px 0',
                fontSize:12, borderBottom:'1px solid var(--line-soft)', alignItems:'center'
              }}>
                <span style={{ color:'var(--ink-soft)' }}>{cl.lesson_date} {cl.lesson_time}</span>
                <span>{cl.instrument}</span>
                <span style={{ color:attColor(cl.attendance), fontWeight:600 }}>{attLabel(cl.attendance)}</span>
                <Badge color={cl.status==='approved'?'#3BA676':cl.status==='rejected'?'#D4574E':'#E08A3C'}>{cl.status}</Badge>
              </div>
            ))}
          </Section>
        </DetailPanel>
      )}

      {/* Add Student Modal */}
      {addModal && (
        <Modal title="Новый ученик" onClose={() => setAddModal(null)}>
          <Field label="Имя">
            <input className="s-input" value={addModal.full_name} onChange={e => setAddModal({...addModal, full_name: e.target.value})} placeholder="Имя ученика" autoFocus />
          </Field>
          <Field label="Телефон">
            <input className="s-input" value={addModal.phone} onChange={e => setAddModal({...addModal, phone: e.target.value})} placeholder="+998 90 123 45 67" />
          </Field>
          <Field label="Источник">
            <select className="s-input" value={addModal.source} onChange={e => setAddModal({...addModal, source: e.target.value})}>
              <option value="">—</option>
              {SOURCES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
          </Field>
          <div style={{ display:'flex', gap:10, justifyContent:'flex-end', marginTop:20 }}>
            <button className="btn-secondary" onClick={() => setAddModal(null)}>Отмена</button>
            <button className="btn-primary" onClick={addStudent}>Добавить</button>
          </div>
        </Modal>
      )}

      {/* Edit Name Modal */}
      {editName && (
        <Modal title="Редактировать имя" onClose={() => setEditName(null)} width={380}>
          <Field label="Имя">
            <input className="s-input" value={editName.full_name} onChange={e => setEditName({...editName, full_name: e.target.value})} autoFocus />
          </Field>
          <div style={{ display:'flex', gap:10, justifyContent:'flex-end', marginTop:20 }}>
            <button className="btn-secondary" onClick={() => setEditName(null)}>Отмена</button>
            <button className="btn-primary" onClick={saveName}>Сохранить</button>
          </div>
        </Modal>
      )}

      {/* Balance Modal */}
      {balanceModal && (
        <Modal title="Баланс уроков" onClose={() => setBalanceModal(null)} width={420}>
          <div style={{ fontSize:14, fontWeight:700, marginBottom:12 }}>
            Текущий баланс: <span style={{ color: 'var(--gold)' }}>{balanceAmount} уроков</span>
          </div>
          {packages.length > 0 && (
            <div style={{ marginBottom:16 }}>
              <div style={{ fontSize:12, fontWeight:700, color:'var(--ink-muted)', marginBottom:6 }}>ДОБАВИТЬ ПАКЕТ</div>
              <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                {packages.map(pkg => (
                  <button key={pkg.id} className="btn-secondary" style={{ padding:'8px 14px', fontSize:12 }}
                    onClick={() => addPackage(balanceModal, pkg.lessons_count, pkg.name)}>
                    +{pkg.lessons_count} ({pkg.name})
                  </button>
                ))}
              </div>
            </div>
          )}
          <div style={{ fontSize:12, fontWeight:700, color:'var(--ink-muted)', marginBottom:6 }}>ИЛИ УСТАНОВИТЬ ВРУЧНУЮ</div>
          <div style={{ display:'flex', gap:8 }}>
            <input className="s-input" type="number" value={balanceAmount} onChange={e => setBalanceAmount(e.target.value)} style={{ flex:1 }} />
            <button className="btn-primary" onClick={() => setBalanceDirect(balanceModal)}>Сохранить</button>
          </div>
          <div style={{ display:'flex', justifyContent:'flex-end', marginTop:12 }}>
            <button className="btn-secondary" onClick={() => setBalanceModal(null)}>Закрыть</button>
          </div>
        </Modal>
      )}

      {/* Edit Status/Source Modal */}
      {editDetailModal && (
        <Modal title="Статус и источник" onClose={() => setEditDetailModal(null)} width={420}>
          <Field label="Статус">
            <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
              {STATUSES.map(s => (
                <button key={s.id} onClick={() => setEditDetailModal({...editDetailModal, student_status: s.id})} style={{
                  padding:'6px 12px', borderRadius:8, fontSize:12, fontWeight:600,
                  border: `2px solid ${editDetailModal.student_status === s.id ? s.color : 'var(--line)'}`,
                  background: editDetailModal.student_status === s.id ? s.color + '15' : 'transparent',
                  color: editDetailModal.student_status === s.id ? s.color : 'var(--ink-muted)',
                  cursor:'pointer', fontFamily:'var(--font)'
                }}>{s.label}</button>
              ))}
            </div>
          </Field>
          <Field label="Источник">
            <select className="s-input" value={editDetailModal.source} onChange={e => setEditDetailModal({...editDetailModal, source: e.target.value})}>
              <option value="">—</option>
              {SOURCES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
          </Field>
          <Field label="Заметки">
            <input className="s-input" value={editDetailModal.notes} onChange={e => setEditDetailModal({...editDetailModal, notes: e.target.value})} placeholder="Необязательно" />
          </Field>
          <div style={{ display:'flex', gap:10, justifyContent:'flex-end', marginTop:20 }}>
            <button className="btn-secondary" onClick={() => setEditDetailModal(null)}>Отмена</button>
            <button className="btn-primary" onClick={saveDetail}>Сохранить</button>
          </div>
        </Modal>
      )}
    </div>
  )
}

