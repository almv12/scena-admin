import React, { useState, useEffect, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { instrColor, Badge, Avatar, Stat, Spinner, Empty, DetailPanel, Section, InfoRow } from '../components/UI'

export default function Students({ branch }) {
  const [students, setStudents] = useState([])
  const [search, setSearch] = useState('')
  const [filterInstr, setFilterInstr] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [loading, setLoading] = useState(true)
  const [detail, setDetail] = useState(null)
  const [detailLessons, setDetailLessons] = useState([])

  useEffect(() => {
    supabase.from('users').select('*').eq('role','student').order('full_name').then(({data}) => {
      setStudents(data || [])
      setLoading(false)
    })
  }, [])

  const filtered = useMemo(() => {
    let list = students
    if (search) {
      const s = search.toLowerCase()
      list = list.filter(st =>
        (st.full_name||'').toLowerCase().includes(s) ||
        (st.phone||'').includes(s) ||
        (st.username||'').toLowerCase().includes(s)
      )
    }
    return list
  }, [students, search, filterInstr, filterStatus])

  async function openDetail(st) {
    setDetail(st)
    const { data } = await supabase.from('conducted_lessons').select('*')
      .eq('student_name', st.full_name)
      .order('lesson_date', { ascending: false })
      .limit(15)
    setDetailLessons(data || [])
  }

  const attLabel = a => ({present:'Был',late:'Опоздал',absent:'Не был',cancelled:'Отменён'}[a]||'—')
  const attColor = a => ({present:'#3BA676',late:'#E08A3C',absent:'#D4574E'}[a]||'#9498A8')

  return (
    <div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(170px,1fr))', gap:12, marginBottom:20 }}>
        <Stat label="Всего учеников" value={students.length} />
        <Stat label="С Telegram" value={students.filter(s=>s.telegram_id).length} accent="#4A7EC7" />
        <Stat label="С Altegio" value={students.filter(s=>s.altegio_client_id).length} accent="#3BA676" />
      </div>

      <div className="s-card">
        <div style={{ padding:'14px 18px', borderBottom:'1px solid var(--line)', display:'flex', gap:10, alignItems:'center', flexWrap:'wrap' }}>
          <div style={{ position:'relative', flex:1, minWidth:200 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--ink-muted)" strokeWidth="2" style={{ position:'absolute', left:11, top:'50%', transform:'translateY(-50%)' }}>
              <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
            </svg>
            <input className="s-input" style={{ paddingLeft:34 }} placeholder="Поиск по имени, телефону..." value={search} onChange={e=>setSearch(e.target.value)} />
          </div>
          <button className="btn-primary">+ Добавить</button>
        </div>

        {loading ? <Spinner /> : filtered.length === 0 ? (
          <Empty title="Учеников не найдено" sub={search ? 'Попробуйте изменить запрос' : 'Нет данных'} />
        ) : (
          <div style={{ overflowX:'auto', maxHeight:'calc(100vh - 300px)', overflowY:'auto' }}>
            <table className="s-table">
              <thead>
                <tr>
                  <th>Имя</th><th>Телефон</th><th>Telegram</th><th>Altegio</th><th>Дата</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(st => (
                  <tr key={st.id} onClick={()=>openDetail(st)}>
                    <td>
                      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                        <Avatar name={st.full_name} size={28} />
                        <span style={{ fontWeight:600 }}>{st.full_name || '—'}</span>
                      </div>
                    </td>
                    <td style={{ fontSize:12.5, color:'var(--ink-soft)', fontVariantNumeric:'tabular-nums' }}>{st.phone || '—'}</td>
                    <td style={{ fontSize:12.5 }}>{st.username ? `@${st.username}` : '—'}</td>
                    <td>{st.altegio_client_id ? <Badge color="#4A7EC7">ID: {st.altegio_client_id}</Badge> : '—'}</td>
                    <td style={{ fontSize:12, color:'var(--ink-muted)' }}>{st.created_at ? new Date(st.created_at).toLocaleDateString('ru') : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail Panel */}
      {detail && (
        <DetailPanel title={detail.full_name || 'Ученик'} onClose={()=>setDetail(null)}>
          <Section title="Контакты">
            <InfoRow label="Телефон" value={detail.phone} />
            <InfoRow label="Telegram" value={detail.username ? `@${detail.username}` : '—'} />
            <InfoRow label="Telegram ID" value={detail.telegram_id} />
            <InfoRow label="Altegio" value={detail.altegio_client_id} />
          </Section>

          <Section title="Реферал">
            <InfoRow label="Бонус" value={detail.referral_bonus || 0} />
            <InfoRow label="Привёл" value={detail.referred_by} />
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
    </div>
  )
}
