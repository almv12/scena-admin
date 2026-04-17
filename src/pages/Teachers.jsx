import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { instrColor, Avatar, Badge, Stat, Spinner, DetailPanel, Section, InfoRow } from '../components/UI'

export default function Teachers({ branch }) {
  const [teachers, setTeachers] = useState([])
  const [rates, setRates] = useState([])
  const [loading, setLoading] = useState(true)
  const [detail, setDetail] = useState(null)

  useEffect(() => {
    Promise.all([
      supabase.from('users').select('*').eq('role','teacher').order('full_name'),
      supabase.from('teacher_rates').select('*'),
    ]).then(([t,r]) => {
      setTeachers(t.data || [])
      setRates(r.data || [])
      setLoading(false)
    })
  }, [])

  const getRate = id => rates.find(r => r.teacher_id === id)

  if (loading) return <Spinner />

  return (
    <div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(170px,1fr))', gap:12, marginBottom:20 }}>
        <Stat label="Педагогов" value={teachers.length} />
        <Stat label="С Altegio ID" value={teachers.filter(t=>t.altegio_staff_id).length} accent="#4A7EC7" />
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(320px,1fr))', gap:14 }}>
        {teachers.map(t => {
          const rate = getRate(t.id)
          return (
            <div key={t.id} onClick={()=>setDetail(t)} className="s-card" style={{ cursor:'pointer', transition:'0.15s' }}>
              <div style={{ height:4, background:instrColor(null) }} />
              <div style={{ padding:'16px 18px' }}>
                <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:12 }}>
                  <Avatar name={t.full_name} size={40} />
                  <div>
                    <div style={{ fontSize:15, fontWeight:700 }}>{t.full_name || '—'}</div>
                    <div style={{ display:'flex', gap:6, alignItems:'center', marginTop:2 }}>
                      {t.altegio_staff_id && <Badge color="#4A7EC7">Altegio {t.altegio_staff_id}</Badge>}
                    </div>
                  </div>
                </div>
                <div style={{
                  display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8,
                  background:'var(--bg-alt)', borderRadius:8, padding:10
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
                    <div style={{ fontSize:14, fontWeight:700 }}>{t.phone ? '✓' : '—'}</div>
                    <div style={{ fontSize:9.5, color:'var(--ink-muted)', textTransform:'uppercase', letterSpacing:0.5 }}>телефон</div>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {detail && (
        <DetailPanel title={detail.full_name || 'Педагог'} onClose={()=>setDetail(null)}>
          <Section title="Контакты">
            <InfoRow label="Телефон" value={detail.phone} />
            <InfoRow label="Telegram" value={detail.username ? `@${detail.username}` : '—'} />
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
        </DetailPanel>
      )}
    </div>
  )
}
