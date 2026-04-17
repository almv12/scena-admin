import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Stat, Spinner, Empty, Avatar, Badge } from '../components/UI'

export default function Finance() {
  const [teachers, setTeachers] = useState([])
  const [rates, setRates] = useState([])
  const [lessons, setLessons] = useState([])
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const now = new Date()
    const firstDay = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-01`

    Promise.all([
      supabase.from('users').select('*').eq('role','teacher').order('full_name'),
      supabase.from('teacher_rates').select('*'),
      supabase.from('conducted_lessons').select('*').eq('status','approved').gte('lesson_date', firstDay),
      supabase.from('payments').select('*').order('created_at', { ascending: false }).limit(50),
    ]).then(([t, r, l, p]) => {
      setTeachers(t.data || [])
      setRates(r.data || [])
      setLessons(l.data || [])
      setPayments(p.data || [])
      setLoading(false)
    })
  }, [])

  function getRate(teacherId) {
    return rates.find(r => r.teacher_id === teacherId)
  }

  function getTeacherLessons(teacherId) {
    return lessons.filter(l => l.teacher_id === teacherId)
  }

  function calcSalary(teacherId) {
    const rate = getRate(teacherId)
    const tLessons = getTeacherLessons(teacherId)
    const indiv = tLessons.filter(l => l.lesson_type !== 'group').length
    const group = tLessons.filter(l => l.lesson_type === 'group').length
    const total = (indiv * (rate?.individual_rate || 0)) + (group * (rate?.group_rate || 0))
    return { indiv, group, total }
  }

  const totalSalary = teachers.reduce((sum, t) => sum + calcSalary(t.id).total, 0)

  if (loading) return <Spinner />

  return (
    <div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(170px,1fr))', gap:12, marginBottom:20 }}>
        <Stat label="Зарплаты (месяц)" value={totalSalary > 0 ? `${(totalSalary/1000000).toFixed(1)}M` : '0'} sub="сум" accent="#D4574E" />
        <Stat label="Уроков за месяц" value={lessons.length} sub="подтверждённых" />
        <Stat label="Выплат" value={payments.length} />
        <Stat label="Оплачено" value={payments.filter(p=>p.status==='paid').length} accent="#3BA676" />
      </div>

      {/* Salary Table */}
      <div className="s-card">
        <div style={{ padding:'14px 18px', borderBottom:'1px solid var(--line)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div style={{ fontSize:14, fontWeight:700 }}>
            Зарплаты — {new Date().toLocaleDateString('ru', { month:'long', year:'numeric' })}
          </div>
          <button className="btn-primary">Сформировать зарплату</button>
        </div>

        {teachers.length === 0 ? (
          <Empty title="Нет педагогов" sub="Добавьте педагогов в систему" />
        ) : (
          <div style={{ overflowX:'auto' }}>
            <table className="s-table">
              <thead>
                <tr>
                  <th>Педагог</th>
                  <th>Инд. уроков</th>
                  <th>Груп. уроков</th>
                  <th>Ставка инд.</th>
                  <th>Ставка гр.</th>
                  <th>Итого</th>
                </tr>
              </thead>
              <tbody>
                {teachers.map(t => {
                  const rate = getRate(t.id)
                  const sal = calcSalary(t.id)
                  return (
                    <tr key={t.id}>
                      <td>
                        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                          <Avatar name={t.full_name} size={26} />
                          <span style={{ fontWeight:600 }}>{t.full_name || '—'}</span>
                        </div>
                      </td>
                      <td style={{ fontWeight:600, fontVariantNumeric:'tabular-nums' }}>{sal.indiv}</td>
                      <td style={{ fontWeight:600, fontVariantNumeric:'tabular-nums' }}>{sal.group}</td>
                      <td style={{ fontSize:12, fontVariantNumeric:'tabular-nums' }}>
                        {rate?.individual_rate ? `${(rate.individual_rate/1000).toFixed(0)}k` : '—'}
                      </td>
                      <td style={{ fontSize:12, fontVariantNumeric:'tabular-nums' }}>
                        {rate?.group_rate ? `${(rate.group_rate/1000).toFixed(0)}k` : '—'}
                      </td>
                      <td style={{ fontWeight:700, fontVariantNumeric:'tabular-nums' }}>
                        {sal.total > 0 ? `${sal.total.toLocaleString()} сум` : '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Payments History */}
      {payments.length > 0 && (
        <div className="s-card" style={{ marginTop:20 }}>
          <div style={{ padding:'14px 18px', borderBottom:'1px solid var(--line)', fontSize:14, fontWeight:700 }}>
            История выплат
          </div>
          <div style={{ overflowX:'auto' }}>
            <table className="s-table">
              <thead>
                <tr><th>Период</th><th>Сумма</th><th>Статус</th><th>Дата</th></tr>
              </thead>
              <tbody>
                {payments.slice(0, 20).map(p => (
                  <tr key={p.id}>
                    <td>{p.period_month}/{p.period_year}</td>
                    <td style={{ fontWeight:600 }}>{p.amount ? `${p.amount.toLocaleString()} сум` : '—'}</td>
                    <td><Badge color={p.status==='paid'?'#3BA676':'#E08A3C'}>{p.status==='paid'?'Оплачено':'Ожидает'}</Badge></td>
                    <td style={{ fontSize:12, color:'var(--ink-muted)' }}>{p.paid_at ? new Date(p.paid_at).toLocaleDateString('ru') : p.created_at ? new Date(p.created_at).toLocaleDateString('ru') : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
