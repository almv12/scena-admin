import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Spinner, Badge, Modal, Field } from '../components/UI'

export default function Settings() {
  const [branches, setBranches] = useState([])
  const [adminUsers, setAdminUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [branchModal, setBranchModal] = useState(null)

  useEffect(() => {
    Promise.all([
      supabase.from('branches').select('*').order('name'),
      supabase.from('admin_users').select('*').order('created_at'),
    ]).then(([b, a]) => {
      setBranches(b.data || [])
      setAdminUsers(a.data || [])
      setLoading(false)
    })
  }, [])

  async function saveBranch() {
    if (!branchModal.name) return
    if (branchModal.id) {
      await supabase.from('branches').update({
        name: branchModal.name,
        address: branchModal.address,
        latitude: branchModal.latitude ? parseFloat(branchModal.latitude) : null,
        longitude: branchModal.longitude ? parseFloat(branchModal.longitude) : null,
        checkin_radius: parseInt(branchModal.checkin_radius) || 500,
      }).eq('id', branchModal.id)
    } else {
      await supabase.from('branches').insert({
        name: branchModal.name,
        address: branchModal.address,
        latitude: branchModal.latitude ? parseFloat(branchModal.latitude) : null,
        longitude: branchModal.longitude ? parseFloat(branchModal.longitude) : null,
        checkin_radius: parseInt(branchModal.checkin_radius) || 500,
      })
    }
    setBranchModal(null)
    const { data } = await supabase.from('branches').select('*').order('name')
    setBranches(data || [])
  }

  const roleLabels = { director:'Директор', branch_admin:'Админ филиала', accountant:'Бухгалтер', manager:'Менеджер' }

  if (loading) return <Spinner />

  return (
    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>
      {/* Branches */}
      <div className="s-card" style={{ padding:22 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
          <div style={{ fontSize:14, fontWeight:700 }}>Филиалы</div>
          <button className="btn-primary" onClick={() => setBranchModal({ name:'', address:'', latitude:'', longitude:'', checkin_radius:500 })}>
            + Добавить
          </button>
        </div>

        {branches.map(b => (
          <div key={b.id} style={{ padding:'12px 0', borderBottom:'1px solid var(--line-soft)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <div>
              <div style={{ fontWeight:600, fontSize:13.5 }}>{b.name}</div>
              <div style={{ fontSize:11.5, color:'var(--ink-soft)' }}>{b.address || 'Адрес не указан'}</div>
              <div style={{ fontSize:10.5, color:'var(--ink-muted)', marginTop:2 }}>
                GPS: {b.latitude || '—'}, {b.longitude || '—'} • Радиус: {b.checkin_radius || 500}м
              </div>
            </div>
            <button className="btn-secondary" onClick={() => setBranchModal({
              id: b.id, name: b.name, address: b.address || '',
              latitude: b.latitude || '', longitude: b.longitude || '',
              checkin_radius: b.checkin_radius || 500,
            })}>Изменить</button>
          </div>
        ))}

        {branches.length === 0 && (
          <div style={{ fontSize:13, color:'var(--ink-muted)', padding:'20px 0', textAlign:'center' }}>
            Нет филиалов. Добавьте первый.
          </div>
        )}
      </div>

      {/* Right column */}
      <div>
        {/* Admin Users */}
        <div className="s-card" style={{ padding:22, marginBottom:20 }}>
          <div style={{ fontSize:14, fontWeight:700, marginBottom:16 }}>Пользователи админ-панели</div>
          {adminUsers.length === 0 ? (
            <div style={{ fontSize:13, color:'var(--ink-muted)', padding:'12px 0' }}>
              Нет записей в admin_users. После создания Auth-пользователя добавьте запись в таблицу admin_users вручную или через эту панель.
            </div>
          ) : adminUsers.map(u => (
            <div key={u.id} style={{ padding:'10px 0', borderBottom:'1px solid var(--line-soft)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div>
                <div style={{ fontWeight:600, fontSize:13 }}>{u.email}</div>
                <div style={{ fontSize:11, color:'var(--ink-soft)' }}>{roleLabels[u.role] || u.role}</div>
              </div>
              <Badge color={u.is_active ? '#3BA676' : '#D4574E'}>{u.is_active ? 'Активен' : 'Отключён'}</Badge>
            </div>
          ))}
        </div>

        {/* Integrations */}
        <div className="s-card" style={{ padding:22 }}>
          <div style={{ fontSize:14, fontWeight:700, marginBottom:16 }}>Интеграции</div>
          {[
            { name:'Altegio', status:true, desc:'Company ID: 1167547' },
            { name:'Telegram Bot', status:true, desc:'@Scena_app_bot' },
            { name:'Click / Payme', status:false, desc:'Не подключено' },
          ].map((int, i) => (
            <div key={i} style={{ padding:'10px 0', borderBottom:'1px solid var(--line-soft)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div>
                <div style={{ fontWeight:600, fontSize:13 }}>{int.name}</div>
                <div style={{ fontSize:11, color:'var(--ink-soft)' }}>{int.desc}</div>
              </div>
              <Badge color={int.status ? '#3BA676' : '#D4574E'}>{int.status ? 'Подключено' : 'Отключено'}</Badge>
            </div>
          ))}
        </div>
      </div>

      {/* Branch Modal */}
      {branchModal && (
        <Modal title={branchModal.id ? 'Редактировать филиал' : 'Новый филиал'} onClose={() => setBranchModal(null)}>
          <Field label="Название">
            <input className="s-input" value={branchModal.name} onChange={e => setBranchModal({...branchModal, name: e.target.value})} placeholder="Ганди 44" />
          </Field>
          <Field label="Адрес">
            <input className="s-input" value={branchModal.address} onChange={e => setBranchModal({...branchModal, address: e.target.value})} placeholder="ул. Ганди 44, Ташкент" />
          </Field>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <Field label="Широта (lat)">
              <input className="s-input" value={branchModal.latitude} onChange={e => setBranchModal({...branchModal, latitude: e.target.value})} placeholder="41.31547" />
            </Field>
            <Field label="Долгота (lng)">
              <input className="s-input" value={branchModal.longitude} onChange={e => setBranchModal({...branchModal, longitude: e.target.value})} placeholder="69.29919" />
            </Field>
          </div>
          <Field label="Радиус GPS (метры)">
            <input className="s-input" type="number" value={branchModal.checkin_radius} onChange={e => setBranchModal({...branchModal, checkin_radius: e.target.value})} />
          </Field>
          <div style={{ display:'flex', gap:10, justifyContent:'flex-end', marginTop:20 }}>
            <button className="btn-secondary" onClick={() => setBranchModal(null)}>Отмена</button>
            <button className="btn-primary" onClick={saveBranch}>Сохранить</button>
          </div>
        </Modal>
      )}
    </div>
  )
}
