import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Stat, Spinner, Empty, Avatar, Badge, Modal, Field } from '../components/UI'

const EXPENSE_CATEGORIES = [
  { id: 'rent', label: 'Аренда', icon: '🏠' },
  { id: 'utilities', label: 'Коммунальные', icon: '💡' },
  { id: 'supplies', label: 'Расходники', icon: '📦' },
  { id: 'marketing', label: 'Маркетинг', icon: '📣' },
  { id: 'salary', label: 'Зарплата (доп)', icon: '💰' },
  { id: 'equipment', label: 'Оборудование', icon: '🎸' },
  { id: 'repairs', label: 'Ремонт', icon: '🔧' },
  { id: 'other', label: 'Другое', icon: '📋' },
]

const PAYMENT_METHODS = [
  { id: 'cash', label: 'Наличные' },
  { id: 'card', label: 'Карта' },
  { id: 'click', label: 'Click' },
  { id: 'payme', label: 'Payme' },
  { id: 'transfer', label: 'Перевод' },
]

const BRANCHES = ['Ганди 44', 'Ганди 29']

export default function Finance() {
  const [tab, setTab] = useState('salary') // salary | income | expenses | pnl
  const [teachers, setTeachers] = useState([])
  const [rates, setRates] = useState([])
  const [lessons, setLessons] = useState([])
  const [payments, setPayments] = useState([])
  const [incomeList, setIncomeList] = useState([])
  const [expensesList, setExpensesList] = useState([])
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState('month')
  const [generating, setGenerating] = useState(false)

  // Модалки
  const [incomeModal, setIncomeModal] = useState(null)
  const [expenseModal, setExpenseModal] = useState(null)
  const [csvModal, setCsvModal] = useState(false)
  const [csvData, setCsvData] = useState([])
  const [csvImporting, setCsvImporting] = useState(false)
  const [recurring, setRecurring] = useState([])
  const [recurringModal, setRecurringModal] = useState(null)
  const [deleteModal, setDeleteModal] = useState(null)
  const [deleteReason, setDeleteReason] = useState('')
  const [editModal, setEditModal] = useState(null)
  const [editReason, setEditReason] = useState('')

  useEffect(() => { loadData() }, [period])

  async function loadData() {
    setLoading(true)
    const now = new Date()
    let dateFrom
    if (period === 'week') {
      const day = now.getDay()
      const diff = day === 0 ? 6 : day - 1
      const monday = new Date(now)
      monday.setDate(now.getDate() - diff)
      dateFrom = monday.toISOString().split('T')[0]
    } else {
      dateFrom = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-01`
    }

    const [t, r, l, p, inc, exp, st, rec] = await Promise.all([
      supabase.from('users').select('*').eq('role','teacher').order('full_name'),
      supabase.from('teacher_rates').select('*'),
      supabase.from('conducted_lessons').select('*').eq('status','approved').gte('lesson_date', dateFrom),
      supabase.from('payments').select('*').order('created_at', { ascending: false }).limit(50),
      supabase.from('income').select('*').neq('is_deleted', true).gte('income_date', dateFrom).order('income_date', { ascending: false }),
      supabase.from('expenses').select('*').neq('is_deleted', true).gte('expense_date', dateFrom).order('expense_date', { ascending: false }),
      supabase.from('users').select('id,full_name').eq('role','student').order('full_name'),
      supabase.from('recurring_expenses').select('*').eq('is_active', true).order('description'),
    ])
    setTeachers(t.data || [])
    setRates(r.data || [])
    setLessons(l.data || [])
    setPayments(p.data || [])
    setIncomeList(inc.data || [])
    setExpensesList(exp.data || [])
    setStudents(st.data || [])
    setRecurring(rec.data || [])
    setLoading(false)
  }

  // === ЗАРПЛАТА ===
  const getRate = id => rates.find(r => r.teacher_id === id)
  const getTeacherLessons = id => lessons.filter(l => l.teacher_id === id)
  function calcSalary(tid) {
    const rate = getRate(tid)
    const tl = getTeacherLessons(tid)
    const indiv = tl.filter(l => l.lesson_type !== 'group').length
    const group = tl.filter(l => l.lesson_type === 'group').length
    return { indiv, group, total: (indiv * (rate?.individual_rate || 0)) + (group * (rate?.group_rate || 0)) }
  }

  async function generatePayments() {
    if (!confirm('Сформировать зарплату для всех педагогов?')) return
    setGenerating(true)
    const now = new Date()
    let created = 0
    let totalAmount = 0
    for (const t of teachers) {
      const sal = calcSalary(t.id)
      if (sal.total <= 0) continue
      const { error } = await supabase.from('payments').insert({ teacher_id: t.id, amount: sal.total, period_month: now.getMonth()+1, period_year: now.getFullYear(), lessons_individual: sal.indiv, lessons_group: sal.group, status: 'pending' })
      if (!error) { created++; totalAmount += sal.total }
    }
    // Автоматически создаём расход "Зарплата"
    if (totalAmount > 0) {
      await supabase.from('expenses').insert({ category:'salary', description:`Зарплата педагогов ${now.getMonth()+1}/${now.getFullYear()} (авто)`, amount:totalAmount, expense_date:now.toISOString().slice(0,10), created_by_name:'Система', created_by_role:'auto' })
    }
    alert(`Сформировано ${created} записей, расход ${totalAmount.toLocaleString()} сум создан`)
    setGenerating(false)
    loadData()
  }

  async function markPaid(id) {
    await supabase.from('payments').update({ status:'paid', paid_at: new Date().toISOString() }).eq('id', id)
    loadData()
  }

  // Soft delete с причиной
  async function softDelete() {
    if (!deleteModal || !deleteReason.trim()) { alert('Укажите причину удаления'); return }
    const table = deleteModal.type === 'income' ? 'income' : 'expenses'
    await supabase.from(table).update({ is_deleted: true, deleted_reason: deleteReason, deleted_by: 'Admin', deleted_at: new Date().toISOString() }).eq('id', deleteModal.id)
    await supabase.from('finance_edits').insert({ record_type: deleteModal.type, record_id: deleteModal.id, action: 'delete', reason: deleteReason, edited_by_name: 'Admin', edited_by_role: 'director' }).catch(() => {})
    setDeleteModal(null); setDeleteReason(''); loadData()
  }

  // Редактирование с причиной
  async function saveFinanceEdit() {
    if (!editModal || !editReason.trim()) { alert('Укажите причину'); return }
    const table = editModal.type === 'income' ? 'income' : 'expenses'
    const updates = { amount: parseInt(editModal.amount) }
    if (editModal.type === 'income') { updates.student_name = editModal.student_name; updates.notes = editModal.notes }
    else { updates.description = editModal.description; updates.category = editModal.category }
    await supabase.from(table).update(updates).eq('id', editModal.id)
    await supabase.from('finance_edits').insert({ record_type: editModal.type, record_id: editModal.id, action: 'edit', field_changed: 'amount', old_value: String(editModal.original_amount), new_value: String(editModal.amount), reason: editReason, edited_by_name: 'Admin', edited_by_role: 'director' }).catch(() => {})
    setEditModal(null); setEditReason(''); loadData()
  }

  // Повторяющиеся расходы
  async function saveRecurring() {
    if (!recurringModal || !recurringModal.amount) return
    await supabase.from('recurring_expenses').insert({ category: recurringModal.category || 'other', description: recurringModal.description || '', amount: parseInt(recurringModal.amount), branch_name: recurringModal.branch_name || null, vendor: recurringModal.vendor || null, day_of_month: parseInt(recurringModal.day_of_month) || 1 })
    setRecurringModal(null); loadData()
  }

  async function deleteRecurring(id) {
    if (!confirm('Удалить шаблон?')) return
    await supabase.from('recurring_expenses').update({ is_active: false }).eq('id', id)
    loadData()
  }

  // === ДОХОДЫ ===
  async function saveIncome() {
    if (!incomeModal || !incomeModal.amount) return
    const student = students.find(s => s.id === incomeModal.student_id)
    const studentName = student?.full_name || incomeModal.student_name || ''

    const { error } = await supabase.from('income').insert({
      student_id: incomeModal.student_id || null,
      student_name: studentName,
      amount: parseInt(incomeModal.amount),
      payment_method: incomeModal.payment_method || 'cash',
      package_name: incomeModal.package_name || null,
      lessons_count: incomeModal.lessons_count ? parseInt(incomeModal.lessons_count) : null,
      branch_name: incomeModal.branch_name || null,
      notes: incomeModal.notes || null,
      income_date: incomeModal.income_date || new Date().toISOString().slice(0,10),
    })
    if (error) { alert('Ошибка: ' + error.message); return }

    // Если указаны уроки и выбран ученик из списка — пополнить баланс
    if (incomeModal.student_id && incomeModal.lessons_count) {
      const { data: st } = await supabase.from('users').select('lessons_balance').eq('id', incomeModal.student_id).single()
      if (st) {
        await supabase.from('users').update({
          lessons_balance: (st.lessons_balance || 0) + parseInt(incomeModal.lessons_count),
          subscription_type: incomeModal.package_name || null,
        }).eq('id', incomeModal.student_id)
      }
    }

    setIncomeModal(null)
    loadData()
  }

  // === РАСХОДЫ ===
  async function saveExpense() {
    if (!expenseModal || !expenseModal.amount || !expenseModal.category) return
    const { error } = await supabase.from('expenses').insert({
      category: expenseModal.category,
      description: expenseModal.description || null,
      amount: parseInt(expenseModal.amount),
      branch_name: expenseModal.branch_name || null,
      vendor: expenseModal.vendor || null,
      expense_date: expenseModal.expense_date || new Date().toISOString().slice(0,10),
    })
    if (error) { alert('Ошибка: ' + error.message); return }
    setExpenseModal(null)
    loadData()
  }

  // === CSV ЗАГРУЗКА РАСХОДОВ ===
  function handleCSVUpload(e) {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = function(ev) {
      const text = ev.target.result
      const lines = text.split('\n').filter(l => l.trim())
      if (lines.length < 2) { alert('Файл пустой или неверный формат'); return }

      // Пробуем определить разделитель
      const sep = lines[0].includes(';') ? ';' : ','
      const headers = lines[0].split(sep).map(h => h.trim().replace(/"/g,'').toLowerCase())
      const rows = []

      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(sep).map(c => c.trim().replace(/"/g,''))
        if (cols.length < 2) continue

        // Ищем колонки по названиям
        const catIdx = headers.findIndex(h => h.includes('категор') || h.includes('category'))
        const descIdx = headers.findIndex(h => h.includes('описан') || h.includes('description') || h.includes('назнач'))
        const amountIdx = headers.findIndex(h => h.includes('сумм') || h.includes('amount') || h.includes('стоим'))
        const dateIdx = headers.findIndex(h => h.includes('дат') || h.includes('date'))
        const branchIdx = headers.findIndex(h => h.includes('филиал') || h.includes('branch'))
        const vendorIdx = headers.findIndex(h => h.includes('поставщ') || h.includes('vendor') || h.includes('контр'))

        const row = {
          category: catIdx >= 0 ? cols[catIdx] : 'other',
          description: descIdx >= 0 ? cols[descIdx] : cols[0] || '',
          amount: amountIdx >= 0 ? parseInt(cols[amountIdx]?.replace(/\s/g,'')) : parseInt(cols[1]?.replace(/\s/g,'')) || 0,
          expense_date: dateIdx >= 0 ? cols[dateIdx] : new Date().toISOString().slice(0,10),
          branch_name: branchIdx >= 0 ? cols[branchIdx] : '',
          vendor: vendorIdx >= 0 ? cols[vendorIdx] : '',
        }
        if (row.amount > 0) rows.push(row)
      }

      setCsvData(rows)
      setCsvModal(true)
    }
    reader.readAsText(file, 'UTF-8')
    e.target.value = ''
  }

  async function importCSV() {
    if (csvData.length === 0) return
    setCsvImporting(true)
    let imported = 0
    for (const row of csvData) {
      // Маппим категорию
      let cat = 'other'
      const catLower = (row.category || '').toLowerCase()
      if (catLower.includes('аренд')) cat = 'rent'
      else if (catLower.includes('коммун') || catLower.includes('электр') || catLower.includes('вод') || catLower.includes('газ')) cat = 'utilities'
      else if (catLower.includes('расход') || catLower.includes('канц')) cat = 'supplies'
      else if (catLower.includes('маркет') || catLower.includes('реклам')) cat = 'marketing'
      else if (catLower.includes('зарп') || catLower.includes('оплат')) cat = 'salary'
      else if (catLower.includes('оборуд') || catLower.includes('инстр')) cat = 'equipment'
      else if (catLower.includes('ремонт')) cat = 'repairs'

      const { error } = await supabase.from('expenses').insert({
        category: cat,
        description: row.description,
        amount: row.amount,
        branch_name: row.branch_name || null,
        vendor: row.vendor || null,
        expense_date: row.expense_date || new Date().toISOString().slice(0,10),
      })
      if (!error) imported++
    }
    alert(`Импортировано ${imported} из ${csvData.length} расходов`)
    setCsvImporting(false)
    setCsvModal(false)
    setCsvData([])
    loadData()
  }

  // === ЭКСПОРТ ===
  function exportCSV(headers, rows, filename) {
    const csv = [headers, ...rows].map(r => r.map(c => '"' + String(c).replace(/"/g,'""') + '"').join(',')).join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type:'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = filename; a.click()
    URL.revokeObjectURL(url)
  }

  // === РАСЧЁТЫ ===
  const totalSalary = teachers.reduce((s, t) => s + calcSalary(t.id).total, 0)
  const totalIncome = incomeList.reduce((s, i) => s + (i.amount || 0), 0)
  const totalExpenses = expensesList.reduce((s, e) => s + (e.amount || 0), 0)
  const totalSalaryPaid = payments.filter(p => p.status === 'paid').reduce((s, p) => s + (p.amount || 0), 0)
  const profit = totalIncome - totalExpenses - totalSalaryPaid
  const periodLabel = period === 'week' ? 'неделю' : 'месяц'

  const catLabel = id => EXPENSE_CATEGORIES.find(c => c.id === id)?.label || id || 'Другое'
  const catIcon = id => EXPENSE_CATEGORIES.find(c => c.id === id)?.icon || '📋'
  const methodLabel = id => PAYMENT_METHODS.find(m => m.id === id)?.label || id || '—'

  // Группировка расходов по категориям
  const expByCategory = {}
  expensesList.forEach(e => {
    const c = e.category || 'other'
    if (!expByCategory[c]) expByCategory[c] = 0
    expByCategory[c] += e.amount || 0
  })

  const tabs = [
    { id:'salary', label:'💰 Зарплаты' },
    { id:'income', label:'📈 Доходы' },
    { id:'expenses', label:'📉 Расходы' },
    { id:'pnl', label:'📊 P&L' },
  ]

  if (loading) return <Spinner />

  return (
    <div>
      {/* Основные метрики */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))', gap:12, marginBottom:20 }}>
        <Stat label={`Доходы (${periodLabel})`} value={totalIncome > 0 ? `${(totalIncome/1000000).toFixed(1)}M` : '0'} sub="сум" accent="#3BA676" />
        <Stat label={`Расходы`} value={totalExpenses > 0 ? `${(totalExpenses/1000000).toFixed(1)}M` : '0'} sub="сум" accent="#D4574E" />
        <Stat label={`Зарплаты`} value={totalSalary > 0 ? `${(totalSalary/1000000).toFixed(1)}M` : '0'} sub="сум" accent="#E08A3C" />
        <Stat label="Прибыль" value={profit !== 0 ? `${(profit/1000000).toFixed(1)}M` : '0'} sub="сум" accent={profit >= 0 ? '#3BA676' : '#D4574E'} />
      </div>

      {/* Табы + период */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16, flexWrap:'wrap', gap:10 }}>
        <div style={{ display:'flex', gap:2, background:'var(--bg-alt)', padding:3, borderRadius:8, border:'1px solid var(--line)' }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              padding:'6px 14px', borderRadius:6, fontSize:12, fontWeight:600,
              border:'none', cursor:'pointer', fontFamily:'var(--font)',
              background: tab===t.id ? 'var(--card)' : 'transparent',
              color: tab===t.id ? 'var(--gold)' : 'var(--ink-muted)',
              boxShadow: tab===t.id ? 'var(--shadow-1)' : 'none',
            }}>{t.label}</button>
          ))}
        </div>
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

      {/* ═══ ЗАРПЛАТЫ ═══ */}
      {tab === 'salary' && (
        <>
          <div className="s-card">
            <div style={{ padding:'14px 18px', borderBottom:'1px solid var(--line)', display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:8 }}>
              <div style={{ fontSize:14, fontWeight:700 }}>Зарплаты педагогов</div>
              <div style={{ display:'flex', gap:8 }}>
                <button className="btn-primary" onClick={generatePayments} disabled={generating}>{generating ? '...' : 'Сформировать'}</button>
                <button className="btn-secondary" onClick={() => exportCSV(
                  ['Педагог','Инд.','Групп.','Ставка инд.','Ставка гр.','Итого'],
                  teachers.map(t => { const r=getRate(t.id); const s=calcSalary(t.id); return [t.full_name,s.indiv,s.group,r?.individual_rate||0,r?.group_rate||0,s.total] }),
                  `salary_${new Date().toISOString().slice(0,10)}.csv`
                )}>📥 Excel</button>
              </div>
            </div>
            {teachers.length === 0 ? <Empty title="Нет педагогов" /> : (
              <div style={{ overflowX:'auto' }}>
                <table className="s-table"><thead><tr><th>Педагог</th><th>Инд.</th><th>Груп.</th><th>Ставка инд.</th><th>Ставка гр.</th><th>Итого</th></tr></thead>
                <tbody>{teachers.map(t => { const r=getRate(t.id); const s=calcSalary(t.id); return (
                  <tr key={t.id}><td><div style={{display:'flex',alignItems:'center',gap:8}}><Avatar name={t.full_name} size={26}/><span style={{fontWeight:600}}>{t.full_name}</span></div></td>
                  <td style={{fontWeight:600}}>{s.indiv}</td><td style={{fontWeight:600}}>{s.group}</td>
                  <td style={{fontSize:12}}>{r?.individual_rate ? `${(r.individual_rate/1000).toFixed(0)}k` : '—'}</td>
                  <td style={{fontSize:12}}>{r?.group_rate ? `${(r.group_rate/1000).toFixed(0)}k` : '—'}</td>
                  <td style={{fontWeight:700}}>{s.total > 0 ? `${s.total.toLocaleString()}` : '—'}</td></tr>
                )})}</tbody></table>
              </div>
            )}
          </div>
          {payments.length > 0 && (
            <div className="s-card" style={{ marginTop:16 }}>
              <div style={{ padding:'14px 18px', borderBottom:'1px solid var(--line)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <span style={{ fontSize:14, fontWeight:700 }}>История выплат</span>
                <button className="btn-secondary" style={{fontSize:11,padding:'4px 12px'}} onClick={() => exportCSV(
                  ['Педагог','Период','Инд.','Груп.','Сумма','Статус'],
                  payments.map(p => { const t=teachers.find(x=>x.id===p.teacher_id); return [t?.full_name||'',`${p.period_month}/${p.period_year}`,p.lessons_individual||0,p.lessons_group||0,p.amount||0,p.status==='paid'?'Оплачено':'Ожидает'] }),
                  `payments_${new Date().toISOString().slice(0,10)}.csv`
                )}>📥 Excel</button>
              </div>
              <div style={{ overflowX:'auto' }}>
                <table className="s-table"><thead><tr><th>Педагог</th><th>Период</th><th>Сумма</th><th>Статус</th><th></th></tr></thead>
                <tbody>{payments.slice(0,20).map(p => { const t=teachers.find(x=>x.id===p.teacher_id); return (
                  <tr key={p.id}><td style={{fontWeight:600}}>{t?.full_name||'—'}</td><td>{p.period_month}/{p.period_year}</td>
                  <td style={{fontWeight:600}}>{p.amount?.toLocaleString()} сум</td>
                  <td><Badge color={p.status==='paid'?'#3BA676':'#E08A3C'}>{p.status==='paid'?'Оплачено':'Ожидает'}</Badge></td>
                  <td>{p.status!=='paid' && <button className="btn-secondary" style={{padding:'3px 10px',fontSize:11}} onClick={()=>markPaid(p.id)}>Оплатить</button>}</td></tr>
                )})}</tbody></table>
              </div>
            </div>
          )}
        </>
      )}

      {/* ═══ ДОХОДЫ ═══ */}
      {tab === 'income' && (
        <div className="s-card">
          <div style={{ padding:'14px 18px', borderBottom:'1px solid var(--line)', display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:8 }}>
            <div style={{ fontSize:14, fontWeight:700 }}>Доходы · {totalIncome.toLocaleString()} сум</div>
            <div style={{ display:'flex', gap:8 }}>
              <button className="btn-primary" onClick={() => setIncomeModal({ student_id:'', student_name:'', amount:'', payment_method:'cash', package_name:'', lessons_count:'', branch_name:'', notes:'', income_date: new Date().toISOString().slice(0,10) })}>+ Добавить оплату</button>
              <button className="btn-secondary" onClick={() => exportCSV(
                ['Ученик','Сумма','Способ','Пакет','Уроков','Филиал','Дата','Заметки'],
                incomeList.map(i => [i.student_name||'',i.amount,methodLabel(i.payment_method),i.package_name||'',i.lessons_count||'',i.branch_name||'',i.income_date||'',i.notes||'']),
                `income_${new Date().toISOString().slice(0,10)}.csv`
              )}>📥 Excel</button>
            </div>
          </div>
          {incomeList.length === 0 ? <Empty title="Нет доходов" sub="Добавьте первую оплату" /> : (
            <div style={{ overflowX:'auto' }}>
              <table className="s-table"><thead><tr><th>Ученик</th><th>Сумма</th><th>Способ</th><th>Пакет</th><th>Филиал</th><th>Дата</th></tr></thead>
              <tbody>{incomeList.map(i => (
                <tr key={i.id}><td style={{fontWeight:600}}>{i.student_name||'—'}</td>
                <td style={{fontWeight:700,color:'#3BA676'}}>{i.amount?.toLocaleString()} сум</td>
                <td><Badge color="#4A7EC7">{methodLabel(i.payment_method)}</Badge></td>
                <td style={{fontSize:12}}>{i.package_name||'—'}</td>
                <td style={{fontSize:12}}>{i.branch_name||'—'}</td>
                <td style={{fontSize:12,color:'var(--ink-muted)'}}>{i.income_date}</td></tr>
              ))}</tbody></table>
            </div>
          )}
        </div>
      )}

      {/* ═══ РАСХОДЫ ═══ */}
      {tab === 'expenses' && (
        <div className="s-card">
          <div style={{ padding:'14px 18px', borderBottom:'1px solid var(--line)', display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:8 }}>
            <div style={{ fontSize:14, fontWeight:700 }}>Расходы · {totalExpenses.toLocaleString()} сум</div>
            <div style={{ display:'flex', gap:8 }}>
              <button className="btn-primary" onClick={() => setExpenseModal({ category:'other', description:'', amount:'', branch_name:'', vendor:'', expense_date: new Date().toISOString().slice(0,10) })}>+ Добавить расход</button>
              <label className="btn-secondary" style={{ cursor:'pointer', display:'inline-flex', alignItems:'center', gap:4 }}>
                📤 Загрузить CSV
                <input type="file" accept=".csv,.txt" onChange={handleCSVUpload} style={{ display:'none' }} />
              </label>
              <button className="btn-secondary" onClick={() => exportCSV(
                ['Категория','Описание','Сумма','Филиал','Поставщик','Дата'],
                expensesList.map(e => [catLabel(e.category),e.description||'',e.amount,e.branch_name||'',e.vendor||'',e.expense_date||'']),
                `expenses_${new Date().toISOString().slice(0,10)}.csv`
              )}>📥 Excel</button>
            </div>
          </div>

          {/* Разбивка по категориям */}
          {Object.keys(expByCategory).length > 0 && (
            <div style={{ padding:'12px 18px', borderBottom:'1px solid var(--line)', display:'flex', gap:12, flexWrap:'wrap' }}>
              {Object.entries(expByCategory).sort((a,b) => b[1]-a[1]).map(([cat, sum]) => (
                <div key={cat} style={{ fontSize:12, display:'flex', alignItems:'center', gap:4 }}>
                  <span>{catIcon(cat)}</span>
                  <span style={{fontWeight:600}}>{catLabel(cat)}:</span>
                  <span style={{color:'var(--red)',fontWeight:700}}>{sum.toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}

          {expensesList.length === 0 ? <Empty title="Нет расходов" sub="Добавьте вручную или загрузите CSV" /> : (
            <div style={{ overflowX:'auto' }}>
              <table className="s-table"><thead><tr><th>Категория</th><th>Описание</th><th>Сумма</th><th>Филиал</th><th>Поставщик</th><th>Дата</th></tr></thead>
              <tbody>{expensesList.map(e => (
                <tr key={e.id}><td><Badge color="#E08A3C">{catIcon(e.category)} {catLabel(e.category)}</Badge></td>
                <td style={{fontSize:13}}>{e.description||'—'}</td>
                <td style={{fontWeight:700,color:'#D4574E'}}>{e.amount?.toLocaleString()} сум</td>
                <td style={{fontSize:12}}>{e.branch_name||'—'}</td>
                <td style={{fontSize:12}}>{e.vendor||'—'}</td>
                <td style={{fontSize:12,color:'var(--ink-muted)'}}>{e.expense_date}</td></tr>
              ))}</tbody></table>
            </div>
          )}
        </div>
      )}

      {/* ═══ P&L ═══ */}
      {tab === 'pnl' && (
        <div className="s-card" style={{ padding:24 }}>
          <div style={{ fontSize:18, fontWeight:800, marginBottom:20 }}>P&L за {periodLabel}</div>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {[
              { label: '📈 Доходы (оплаты учеников)', value: totalIncome, color: '#3BA676', bold: true },
              ...Object.entries(expByCategory).sort((a,b) => b[1]-a[1]).map(([cat, sum]) => ({ label: `    ${catIcon(cat)} ${catLabel(cat)}`, value: -sum, color: '#D4574E' })),
              { label: '💰 Зарплаты (выплаченные)', value: -totalSalaryPaid, color: '#E08A3C' },
              { label: '📉 Итого расходы', value: -(totalExpenses + totalSalaryPaid), color: '#D4574E', bold: true, line: true },
              { label: '💎 ПРИБЫЛЬ / УБЫТОК', value: profit, color: profit >= 0 ? '#3BA676' : '#D4574E', bold: true, big: true },
            ].map((row, i) => (
              <div key={i} style={{
                display:'flex', justifyContent:'space-between', alignItems:'center',
                padding: row.big ? '14px 0' : '8px 0',
                borderTop: row.line || row.big ? '2px solid var(--line)' : '1px solid var(--line-soft)',
                fontSize: row.big ? 18 : 14,
              }}>
                <span style={{ fontWeight: row.bold ? 700 : 400, color: row.bold ? 'var(--ink)' : 'var(--ink-soft)' }}>{row.label}</span>
                <span style={{ fontWeight:700, color: row.color, fontVariantNumeric:'tabular-nums', fontSize: row.big ? 20 : 14 }}>
                  {row.value >= 0 ? '' : '−'}{Math.abs(row.value).toLocaleString()} сум
                </span>
              </div>
            ))}
          </div>
          <button className="btn-secondary" style={{ marginTop:20 }} onClick={() => exportCSV(
            ['Статья','Сумма (сум)'],
            [['Доходы',totalIncome], ...Object.entries(expByCategory).map(([c,s]) => [catLabel(c), -s]), ['Зарплаты выплаченные', -totalSalaryPaid], ['ИТОГО расходы', -(totalExpenses+totalSalaryPaid)], ['ПРИБЫЛЬ', profit]],
            `pnl_${new Date().toISOString().slice(0,10)}.csv`
          )}>📥 Экспорт P&L</button>
        </div>
      )}

      {/* ═══ МОДАЛКИ ═══ */}

      {/* Добавить доход */}
      {incomeModal && (
        <Modal title="Добавить оплату" onClose={() => setIncomeModal(null)}>
          <Field label="Ученик (из системы)">
            <select className="s-input" value={incomeModal.student_id} onChange={e => setIncomeModal({...incomeModal, student_id: e.target.value, student_name: ''})}>
              <option value="">— выберите или введите имя ниже —</option>
              {students.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}
            </select>
          </Field>
          {!incomeModal.student_id && (
            <Field label="Или введите имя вручную">
              <input className="s-input" value={incomeModal.student_name || ''} onChange={e => setIncomeModal({...incomeModal, student_name: e.target.value})} placeholder="Имя ученика (если нет в списке)" />
            </Field>
          )}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <Field label="Сумма (сум)"><input className="s-input" type="number" value={incomeModal.amount} onChange={e => setIncomeModal({...incomeModal, amount: e.target.value})} placeholder="400000" /></Field>
            <Field label="Способ оплаты">
              <select className="s-input" value={incomeModal.payment_method} onChange={e => setIncomeModal({...incomeModal, payment_method: e.target.value})}>
                {PAYMENT_METHODS.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
              </select>
            </Field>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <Field label="Пакет"><input className="s-input" value={incomeModal.package_name} onChange={e => setIncomeModal({...incomeModal, package_name: e.target.value})} placeholder="8 уроков" /></Field>
            <Field label="Кол-во уроков"><input className="s-input" type="number" value={incomeModal.lessons_count} onChange={e => setIncomeModal({...incomeModal, lessons_count: e.target.value})} placeholder="8" /></Field>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <Field label="Филиал">
              <select className="s-input" value={incomeModal.branch_name} onChange={e => setIncomeModal({...incomeModal, branch_name: e.target.value})}>
                <option value="">—</option>
                {BRANCHES.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </Field>
            <Field label="Дата"><input className="s-input" type="date" value={incomeModal.income_date} onChange={e => setIncomeModal({...incomeModal, income_date: e.target.value})} /></Field>
          </div>
          <Field label="Заметки"><input className="s-input" value={incomeModal.notes} onChange={e => setIncomeModal({...incomeModal, notes: e.target.value})} placeholder="Необязательно" /></Field>
          <div style={{ fontSize:11, color:'var(--ink-muted)', marginBottom:12 }}>Если указан ученик и кол-во уроков — баланс автоматически пополнится.</div>
          <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
            <button className="btn-secondary" onClick={() => setIncomeModal(null)}>Отмена</button>
            <button className="btn-primary" onClick={saveIncome}>Добавить</button>
          </div>
        </Modal>
      )}

      {/* Добавить расход */}
      {expenseModal && (
        <Modal title="Добавить расход" onClose={() => setExpenseModal(null)}>
          <Field label="Категория">
            <select className="s-input" value={expenseModal.category} onChange={e => setExpenseModal({...expenseModal, category: e.target.value})}>
              {EXPENSE_CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.icon} {c.label}</option>)}
            </select>
          </Field>
          <Field label="Описание"><input className="s-input" value={expenseModal.description} onChange={e => setExpenseModal({...expenseModal, description: e.target.value})} placeholder="За что платим" /></Field>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <Field label="Сумма (сум)"><input className="s-input" type="number" value={expenseModal.amount} onChange={e => setExpenseModal({...expenseModal, amount: e.target.value})} placeholder="500000" /></Field>
            <Field label="Дата"><input className="s-input" type="date" value={expenseModal.expense_date} onChange={e => setExpenseModal({...expenseModal, expense_date: e.target.value})} /></Field>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <Field label="Филиал">
              <select className="s-input" value={expenseModal.branch_name} onChange={e => setExpenseModal({...expenseModal, branch_name: e.target.value})}>
                <option value="">—</option>
                {BRANCHES.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </Field>
            <Field label="Поставщик"><input className="s-input" value={expenseModal.vendor} onChange={e => setExpenseModal({...expenseModal, vendor: e.target.value})} placeholder="Необязательно" /></Field>
          </div>
          <div style={{ display:'flex', gap:10, justifyContent:'flex-end', marginTop:16 }}>
            <button className="btn-secondary" onClick={() => setExpenseModal(null)}>Отмена</button>
            <button className="btn-primary" onClick={saveExpense}>Добавить</button>
          </div>
        </Modal>
      )}

      {/* CSV Preview */}
      {csvModal && (
        <Modal title={`Импорт CSV — ${csvData.length} записей`} onClose={() => { setCsvModal(false); setCsvData([]) }}>
          <div style={{ maxHeight:300, overflowY:'auto', marginBottom:16 }}>
            <table className="s-table"><thead><tr><th>Категория</th><th>Описание</th><th>Сумма</th><th>Дата</th></tr></thead>
            <tbody>{csvData.slice(0,20).map((r,i) => (
              <tr key={i}><td style={{fontSize:12}}>{r.category}</td><td style={{fontSize:12}}>{r.description}</td>
              <td style={{fontWeight:600}}>{r.amount?.toLocaleString()}</td><td style={{fontSize:12}}>{r.expense_date}</td></tr>
            ))}</tbody></table>
            {csvData.length > 20 && <div style={{ textAlign:'center', padding:8, fontSize:12, color:'var(--ink-muted)' }}>...и ещё {csvData.length - 20}</div>}
          </div>
          <div style={{ fontSize:12, color:'var(--ink-muted)', marginBottom:12 }}>
            Итого: {csvData.reduce((s,r) => s + (r.amount||0), 0).toLocaleString()} сум. Проверьте и нажмите «Импортировать».
          </div>
          <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
            <button className="btn-secondary" onClick={() => { setCsvModal(false); setCsvData([]) }}>Отмена</button>
            <button className="btn-primary" onClick={importCSV} disabled={csvImporting}>{csvImporting ? 'Импорт...' : `Импортировать ${csvData.length} записей`}</button>
          </div>
        </Modal>
      )}
    </div>
  )
}

