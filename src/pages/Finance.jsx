import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Stat, Spinner, Empty, Avatar, Badge, Modal, Field } from '../components/UI'

export default function Finance() {
  const [teachers, setTeachers] = useState([])
  const [rates, setRates] = useState([])
  const [lessons, setLessons] = useState([])
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState('month') // 'week' or 'month'
  const [generating, setGenerating] = useState(false)

  useEffect(() => { loadData() }, [period])

  async function loadData() {
    setLoading(true)
    const now = new Date()

    let dateFrom
    if (period === 'week') {
      // Текущая неделя (Пн-Вс)
      const day = now.getDay()
      const diff = day === 0 ? 6 : day - 1 // Понедельник
      const monday = new Date(now)
      monday.setDate(now.getDate() - diff)
      dateFrom = monday.toISOString().split('T')[0]
    } else {
      // Текущий месяц
      dateFrom = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-01`
    }

    const [t, r, l, p] = await Promise.all([
      supabase.from('users').select('*').eq('role','teacher').order('full_name'),
      supabase.from('teacher_rates').select('*'),
      supabase.from('conducted_lessons').select('*').eq('status','approved').gte('lesson_date', dateFrom),
      supabase.from('payments').select('*').order('created_at', { ascending: false }).limit(50),
    ])
    setTeachers(t.data || [])
    setRates(r.data || [])
    setLessons(l.data || [])
    setPayments(p.data || [])
    setLoading(false)
  }

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

  // Сформировать зарплату для всех педагогов
  async function generatePayments() {
    if (!confirm('Сформировать зарплату для всех педагогов?')) return
    setGenerating(true)
    const now = new Date()
    let created = 0

    for (const teacher of teachers) {
      const sal = calcSalary(teacher.id)
      if (sal.total <= 0) continue

      const { error } = await supabase.from('payments').insert({
        teacher_id: teacher.id,
        amount: sal.total,
        period_month: now.getMonth() + 1,
        period_year: now.getFullYear(),
        lessons_individual: sal.indiv,
        lessons_group: sal.group,
        status: 'pending',
      })
      if (!error) created++
    }

    alert(`Сформировано ${created} записей о зарплате`)
    setGenerating(false)
    loadData()
  }

  // Отметить как оплачено
  async function markPaid(paymentId) {
    await supabase.from('payments').update({ status: 'paid', paid_at: new Date().toISOString() }).eq('id', paymentId)
    loadData()
  }

  const totalSalary = teachers.reduce((sum, t) => sum + calcSalary(t.id).total, 0)
  const periodLabel = period === 'week' ? 'неделю' : 'месяц'

  if (loading) return <Spinner />

  return (
    <div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(170px,1fr))', gap:12, marginBottom:20 }}>
        <Stat label={`Зарплаты (${periodLabel})`} value={totalSalary > 0 ? `${(totalSalary/1000000).toFixed(1)}M` : '0'} sub="сум" accent="#D4574E" />
        <Stat label={`Уроков за ${periodLabel}`} value={lessons.length} sub="подтверждённых" />
        <Stat label="Выплат" value={payments.length} />
        <Stat label="Оплачено" value={payments.filter(p=>p.status==='paid').length} accent="#3BA676" />
      </div>

      {/* Salary Table */}
      <div className="s-card">
        <div style={{ padding:'14px 18px', borderBottom:'1px solid var(--line)', display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:10 }}>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <div style={{ fontSize:14, fontWeight:700 }}>Зарплаты</div>
            {/* Переключатель неделя / месяц */}
            <div style={{ display:'flex', gap:2, background:'var(--bg-alt)', padding:2, borderRadius:6, border:'1px solid var(--line)' }}>
              {[{id:'week',label:'Неделя'},{id:'month',label:'Месяц'}].map(p => (
                <button key={p.id} onClick={() => setPeriod(p.id)} style={{
                  padding:'4px 12px', borderRadius:4, fontSize:11, fontWeight:600,
                  border:'none', cursor:'pointer', fontFamily:'var(--font)',
                  background: period===p.id ? 'var(--card)' : 'transparent',
                  color: period===p.id ? 'var(--gold)' : 'var(--ink-muted)',
                  boxShadow: period===p.id ? 'var(--shadow-1)' : 'none',
                }}>{p.label}</button>
              ))}
            </div>
          </div>
          <button className="btn-primary" onClick={generatePayments} disabled={generating}
            style={{ opacity: generating ? 0.6 : 1 }}>
            {generating ? 'Формирование...' : 'Сформировать зарплату'}
          </button>
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
                <tr><th>Педагог</th><th>Период</th><th>Инд./Гр.</th><th>Сумма</th><th>Статус</th><th>Действия</th></tr>
              </thead>
              <tbody>
                {payments.slice(0, 20).map(p => {
                  const teacher = teachers.find(t => t.id === p.teacher_id)
                  return (
                    <tr key={p.id}>
                      <td style={{ fontWeight:600 }}>{teacher?.full_name || '—'}</td>
                      <td>{p.period_month}/{p.period_year}</td>
                      <td style={{ fontSize:12 }}>{p.lessons_individual || 0} / {p.lessons_group || 0}</td>
                      <td style={{ fontWeight:600 }}>{p.amount ? `${p.amount.toLocaleString()} сум` : '—'}</td>
                      <td><Badge color={p.status==='paid'?'#3BA676':'#E08A3C'}>{p.status==='paid'?'Оплачено':'Ожидает'}</Badge></td>
                      <td>
                        {p.status !== 'paid' && (
                          <button className="btn-secondary" style={{ padding:'3px 10px', fontSize:11 }}
                            onClick={() => markPaid(p.id)}>
                            Оплатить
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

