import React, { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { INSTRUMENTS, instrColor, Avatar, Badge, Stat, Spinner, Empty, Modal, Field } from '../components/UI'

const STAGES = [
  { id: 'new', label: 'Новый', color: '#9498A8', icon: '📥' },
  { id: 'contacted', label: 'Связались', color: '#4A7EC7', icon: '📞' },
  { id: 'trial_scheduled', label: 'Пробный назначен', color: '#E08A3C', icon: '📅' },
  { id: 'trial_done', label: 'Пробный проведён', color: '#8B6CC7', icon: '✅' },
  { id: 'negotiation', label: 'Переговоры', color: '#D4A03A', icon: '💬' },
  { id: 'won', label: 'Оплатил', color: '#3BA676', icon: '🎉' },
  { id: 'lost', label: 'Отказ', color: '#D4574E', icon: '✗' },
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

export default function CRM() {
  const [leads, setLeads] = useState([])
  const [activities, setActivities] = useState([])
  const [loading, setLoading] = useState(true)
  const [addModal, setAddModal] = useState(null)
  const [detailLead, setDetailLead] = useState(null)
  const [actNote, setActNote] = useState('')
  const [actType, setActType] = useState('note')
  const [view, setView] = useState('kanban') // kanban | list
  const [filterSource, setFilterSource] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('crm_leads').select('*').order('created_at', { ascending: false })
    setLeads(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function loadActivities(leadId) {
    const { data } = await supabase.from('crm_activities').select('*').eq('lead_id', leadId).order('created_at', { ascending: false })
    setActivities(data || [])
  }

  async function addLead() {
    if (!addModal || !addModal.full_name) return
    const { error } = await supabase.from('crm_leads').insert({
      full_name: addModal.full_name,
      phone: addModal.phone || null,
      source: addModal.source || null,
      instrument: addModal.instrument || null,
      branch_name: addModal.branch_name || null,
      notes: addModal.notes || null,
      stage: 'new',
    })
    if (error) { alert('Ошибка: ' + error.message); return }
    setAddModal(null)
    load()
  }

  async function moveStage(leadId, newStage) {
    const updates = { stage: newStage, updated_at: new Date().toISOString() }
    if (newStage === 'contacted') updates.last_contact_at = new Date().toISOString()
    await supabase.from('crm_leads').update(updates).eq('id', leadId)

    // Логируем активность
    await supabase.from('crm_activities').insert({
      lead_id: leadId,
      activity_type: 'note',
      note: 'Этап изменён → ' + STAGES.find(s => s.id === newStage)?.label,
    })

    if (detailLead?.id === leadId) {
      setDetailLead({ ...detailLead, stage: newStage })
      loadActivities(leadId)
    }
    load()
  }

  async function addActivity() {
    if (!detailLead || !actNote.trim()) return
    await supabase.from('crm_activities').insert({
      lead_id: detailLead.id,
      activity_type: actType,
      note: actNote.trim(),
    })
    await supabase.from('crm_leads').update({
      last_contact_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq('id', detailLead.id)
    setActNote('')
    loadActivities(detailLead.id)
    load()
  }

  async function updateLead(updates) {
    if (!detailLead) return
    await supabase.from('crm_leads').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', detailLead.id)
    setDetailLead({ ...detailLead, ...updates })
    load()
  }

  function openDetail(lead) {
    setDetailLead(lead)
    loadActivities(lead.id)
  }

  const stageInfo = id => STAGES.find(s => s.id === id) || STAGES[0]
  const sourceLabel = id => SOURCES.find(s => s.id === id)?.label || id || '—'
  const activeStages = STAGES.filter(s => s.id !== 'won' && s.id !== 'lost')
  const filteredLeads = filterSource ? leads.filter(l => l.source === filterSource) : leads

  // Статистика
  const totalLeads = leads.length
  const wonLeads = leads.filter(l => l.stage === 'won').length
  const lostLeads = leads.filter(l => l.stage === 'lost').length
  const convRate = totalLeads > 0 ? Math.round(wonLeads / totalLeads * 100) : 0

  if (loading) return <Spinner />

  return (
    <div>
      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: 12, marginBottom: 20 }}>
        <Stat label="Всего лидов" value={totalLeads} />
        <Stat label="В работе" value={totalLeads - wonLeads - lostLeads} accent="#E08A3C" />
        <Stat label="Оплатили" value={wonLeads} accent="#3BA676" />
        <Stat label="Отказы" value={lostLeads} accent="#D4574E" />
        <Stat label="Конверсия" value={`${convRate}%`} accent={convRate >= 30 ? '#3BA676' : '#E08A3C'} />
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {/* View toggle */}
          <div style={{ display: 'flex', gap: 2, background: 'var(--bg-alt)', padding: 2, borderRadius: 6, border: '1px solid var(--line)' }}>
            {[{ id: 'kanban', label: '▦ Канбан' }, { id: 'list', label: '☰ Список' }].map(v => (
              <button key={v.id} onClick={() => setView(v.id)} style={{
                padding: '5px 12px', borderRadius: 4, fontSize: 11, fontWeight: 600,
                border: 'none', cursor: 'pointer', fontFamily: 'var(--font)',
                background: view === v.id ? 'var(--card)' : 'transparent',
                color: view === v.id ? 'var(--gold)' : 'var(--ink-muted)',
                boxShadow: view === v.id ? 'var(--shadow-1)' : 'none',
              }}>{v.label}</button>
            ))}
          </div>
          <select className="s-select" value={filterSource} onChange={e => setFilterSource(e.target.value)} style={{ minWidth: 140 }}>
            <option value="">Все источники</option>
            {SOURCES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
        </div>
        <button className="btn-primary" onClick={() => setAddModal({ full_name: '', phone: '', source: '', instrument: '', branch_name: '', notes: '' })}>
          + Новый лид
        </button>
      </div>

      {/* KANBAN */}
      {view === 'kanban' && (
        <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 16 }}>
          {activeStages.map(stage => {
            const stageLeads = filteredLeads.filter(l => l.stage === stage.id)
            return (
              <div key={stage.id} style={{ minWidth: 240, maxWidth: 280, flex: '0 0 260px' }}>
                <div style={{
                  padding: '10px 14px', borderRadius: '10px 10px 0 0',
                  background: stage.color + '15', borderBottom: `3px solid ${stage.color}`,
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: stage.color }}>{stage.icon} {stage.label}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: stage.color, background: stage.color + '20', padding: '2px 8px', borderRadius: 10 }}>{stageLeads.length}</span>
                </div>
                <div style={{ background: 'var(--bg-alt)', borderRadius: '0 0 10px 10px', padding: 8, minHeight: 100 }}>
                  {stageLeads.length === 0 && <div style={{ fontSize: 11, color: 'var(--ink-faint)', textAlign: 'center', padding: 20 }}>Пусто</div>}
                  {stageLeads.map(lead => (
                    <div key={lead.id} onClick={() => openDetail(lead)} style={{
                      background: 'var(--card)', borderRadius: 8, padding: '10px 12px', marginBottom: 6,
                      cursor: 'pointer', boxShadow: 'var(--shadow-1)', transition: '0.15s', borderLeft: `3px solid ${instrColor(lead.instrument)}`
                    }}>
                      <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 2 }}>{lead.full_name}</div>
                      <div style={{ fontSize: 11, color: 'var(--ink-muted)', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {lead.instrument && <Badge color={instrColor(lead.instrument)}>{lead.instrument}</Badge>}
                        {lead.source && <span>{sourceLabel(lead.source)}</span>}
                      </div>
                      {lead.phone && <div style={{ fontSize: 11, color: 'var(--ink-muted)', marginTop: 2 }}>{lead.phone}</div>}
                      {lead.next_follow_up && (
                        <div style={{ fontSize: 10, color: new Date(lead.next_follow_up) < new Date() ? 'var(--red)' : 'var(--ink-muted)', marginTop: 3, fontWeight: 600 }}>
                          ⏰ {new Date(lead.next_follow_up).toLocaleDateString('ru')}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* LIST */}
      {view === 'list' && (
        <div className="s-card">
          {filteredLeads.length === 0 ? <Empty title="Нет лидов" sub="Добавьте первого лида" /> : (
            <div style={{ overflowX: 'auto' }}>
              <table className="s-table">
                <thead><tr><th>Имя</th><th>Телефон</th><th>Инструмент</th><th>Источник</th><th>Этап</th><th>Дата</th></tr></thead>
                <tbody>
                  {filteredLeads.map(l => {
                    const si = stageInfo(l.stage)
                    return (
                      <tr key={l.id} onClick={() => openDetail(l)}>
                        <td style={{ fontWeight: 600 }}>{l.full_name}</td>
                        <td style={{ fontSize: 12, color: 'var(--ink-soft)' }}>{l.phone || '—'}</td>
                        <td>{l.instrument ? <Badge color={instrColor(l.instrument)}>{l.instrument}</Badge> : '—'}</td>
                        <td style={{ fontSize: 12 }}>{sourceLabel(l.source)}</td>
                        <td><Badge color={si.color}>{si.icon} {si.label}</Badge></td>
                        <td style={{ fontSize: 11, color: 'var(--ink-muted)' }}>{l.created_at ? new Date(l.created_at).toLocaleDateString('ru') : '—'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Add Lead Modal */}
      {addModal && (
        <Modal title="Новый лид" onClose={() => setAddModal(null)}>
          <Field label="Имя"><input className="s-input" value={addModal.full_name} onChange={e => setAddModal({ ...addModal, full_name: e.target.value })} autoFocus placeholder="Имя" /></Field>
          <Field label="Телефон"><input className="s-input" value={addModal.phone} onChange={e => setAddModal({ ...addModal, phone: e.target.value })} placeholder="+998..." /></Field>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Инструмент">
              <select className="s-input" value={addModal.instrument} onChange={e => setAddModal({ ...addModal, instrument: e.target.value })}>
                <option value="">—</option>
                {INSTRUMENTS.map(i => <option key={i} value={i}>{i}</option>)}
              </select>
            </Field>
            <Field label="Источник">
              <select className="s-input" value={addModal.source} onChange={e => setAddModal({ ...addModal, source: e.target.value })}>
                <option value="">—</option>
                {SOURCES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Заметки"><input className="s-input" value={addModal.notes} onChange={e => setAddModal({ ...addModal, notes: e.target.value })} placeholder="Необязательно" /></Field>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
            <button className="btn-secondary" onClick={() => setAddModal(null)}>Отмена</button>
            <button className="btn-primary" onClick={addLead}>Добавить</button>
          </div>
        </Modal>
      )}

      {/* Detail Lead Panel */}
      {detailLead && (
        <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: 420, background: 'var(--card)', boxShadow: '-4px 0 24px rgba(0,0,0,0.1)', zIndex: 50, overflowY: 'auto', padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div style={{ fontSize: 18, fontWeight: 800 }}>{detailLead.full_name}</div>
            <button onClick={() => setDetailLead(null)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--ink-muted)' }}>✕</button>
          </div>

          {/* Info */}
          <div style={{ fontSize: 13, color: 'var(--ink-soft)', marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {detailLead.phone && <div>📞 {detailLead.phone}</div>}
            {detailLead.instrument && <div>🎵 {detailLead.instrument}</div>}
            {detailLead.source && <div>📊 {sourceLabel(detailLead.source)}</div>}
            {detailLead.notes && <div>📝 {detailLead.notes}</div>}
            <div>📅 Создан: {new Date(detailLead.created_at).toLocaleDateString('ru')}</div>
          </div>

          {/* Stage selector */}
          <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6, color: 'var(--ink-muted)' }}>ЭТАП ВОРОНКИ</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 20 }}>
            {STAGES.map(s => (
              <button key={s.id} onClick={() => moveStage(detailLead.id, s.id)} style={{
                padding: '5px 12px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                border: `2px solid ${detailLead.stage === s.id ? s.color : 'var(--line)'}`,
                background: detailLead.stage === s.id ? s.color + '15' : 'transparent',
                color: detailLead.stage === s.id ? s.color : 'var(--ink-muted)',
                cursor: 'pointer'
              }}>{s.icon} {s.label}</button>
            ))}
          </div>

          {/* Follow-up */}
          <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6, color: 'var(--ink-muted)' }}>СЛЕДУЮЩИЙ КОНТАКТ</div>
          <input type="datetime-local" className="s-input" value={detailLead.next_follow_up ? detailLead.next_follow_up.slice(0, 16) : ''}
            onChange={e => updateLead({ next_follow_up: e.target.value ? new Date(e.target.value).toISOString() : null })}
            style={{ marginBottom: 20 }} />

          {/* Add Activity */}
          <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6, color: 'var(--ink-muted)' }}>ДОБАВИТЬ ЗАПИСЬ</div>
          <div style={{ display: 'flex', gap: 4, marginBottom: 6 }}>
            {[{ id: 'call', label: '📞 Звонок' }, { id: 'message', label: '💬 Сообщение' }, { id: 'note', label: '📝 Заметка' }].map(a => (
              <button key={a.id} onClick={() => setActType(a.id)} style={{
                padding: '4px 10px', borderRadius: 4, fontSize: 10, fontWeight: 600,
                border: actType === a.id ? '2px solid var(--gold)' : '1px solid var(--line)',
                background: actType === a.id ? 'var(--gold-muted)' : 'transparent',
                cursor: 'pointer', fontFamily: 'var(--font)'
              }}>{a.label}</button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
            <input className="s-input" value={actNote} onChange={e => setActNote(e.target.value)} placeholder="Что произошло..." style={{ flex: 1 }} />
            <button className="btn-primary" onClick={addActivity} style={{ padding: '8px 14px' }}>+</button>
          </div>

          {/* Activities */}
          <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8, color: 'var(--ink-muted)' }}>ИСТОРИЯ</div>
          {activities.length === 0 ? (
            <div style={{ fontSize: 12, color: 'var(--ink-faint)' }}>Нет записей</div>
          ) : activities.map(a => (
            <div key={a.id} style={{ padding: '8px 0', borderBottom: '1px solid var(--line-soft)', fontSize: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                <span style={{ fontWeight: 600 }}>
                  {a.activity_type === 'call' ? '📞' : a.activity_type === 'message' ? '💬' : '📝'} {a.activity_type === 'call' ? 'Звонок' : a.activity_type === 'message' ? 'Сообщение' : 'Заметка'}
                </span>
                <span style={{ color: 'var(--ink-faint)', fontSize: 10 }}>{new Date(a.created_at).toLocaleString('ru')}</span>
              </div>
              <div style={{ color: 'var(--ink-soft)' }}>{a.note}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
