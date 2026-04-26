import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Spinner, Empty, Badge } from '../components/UI'

export default function Broadcast() {
  const [target, setTarget] = useState('student')
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState(null)
  const [history, setHistory] = useState([])
  const [historyError, setHistoryError] = useState(false)

  useEffect(() => {
    supabase.from('message_history').select('*').order('created_at', { ascending: false }).limit(20)
      .then(({ data, error }) => {
        if (error) { setHistoryError(true); return }
        setHistory(data || [])
      })
  }, [])

  async function sendBroadcast() {
    if (!text.trim()) return
    setSending(true)
    setResult(null)

    try {
      const res = await fetch(`https://scena-app-proba.vercel.app/api/notify?action=broadcast&role=${target}&text=${encodeURIComponent(text)}`)
      const data = await res.json()

      if (!data.ok) {
        setResult({ success: false, error: data.error || 'Ошибка API' })
        setSending(false)
        return
      }

      // Сохраняем в историю (если таблица есть)
      if (!historyError) {
        await supabase.from('message_history').insert({
          target_role: target,
          message_text: text,
          recipients_count: data.sent || 0,
        }).catch(() => {})

        const { data: hist } = await supabase.from('message_history').select('*')
          .order('created_at', { ascending: false }).limit(20)
        if (hist) setHistory(hist)
      }

      setResult({ success: true, count: data.sent || 0 })
      setText('')
    } catch (err) {
      setResult({ success: false, error: err.message })
    }
    setSending(false)
  }

  return (
    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>
      {/* Compose */}
      <div className="s-card" style={{ padding:22 }}>
        <div style={{ fontSize:14, fontWeight:700, marginBottom:16 }}>Новая рассылка</div>

        <div style={{ marginBottom:14 }}>
          <div style={{ fontSize:12, fontWeight:700, color:'var(--ink-muted)', marginBottom:4, textTransform:'uppercase', letterSpacing:0.5 }}>Получатели</div>
          <select className="s-input" value={target} onChange={e=>setTarget(e.target.value)}>
            <option value="student">Все ученики</option>
            <option value="teacher">Все педагоги</option>
            <option value="all">Все пользователи</option>
          </select>
        </div>

        <div style={{ marginBottom:14 }}>
          <div style={{ fontSize:12, fontWeight:700, color:'var(--ink-muted)', marginBottom:4, textTransform:'uppercase', letterSpacing:0.5 }}>Сообщение</div>
          <textarea
            className="s-input"
            placeholder="Текст рассылки..."
            rows={6}
            value={text}
            onChange={e=>setText(e.target.value)}
            style={{ resize:'vertical' }}
          />
        </div>

        <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
          <button className="btn-primary" onClick={sendBroadcast} disabled={sending || !text.trim()} style={{ opacity: (sending || !text.trim()) ? 0.5 : 1 }}>
            {sending ? 'Отправка...' : '📨 Отправить'}
          </button>
        </div>

        {result && (
          <div style={{
            marginTop:14, padding:12, borderRadius:8, fontSize:13,
            background: result.success ? '#3BA67615' : '#D4574E15',
            color: result.success ? '#3BA676' : '#D4574E',
            fontWeight:600
          }}>
            {result.success
              ? `✓ Отправлено ${result.count} получателям`
              : `✗ Ошибка: ${result.error}`
            }
          </div>
        )}
      </div>

      {/* History */}
      <div className="s-card" style={{ padding:22 }}>
        <div style={{ fontSize:14, fontWeight:700, marginBottom:16 }}>История рассылок</div>

        {historyError ? (
          <div style={{ fontSize:12, color:'var(--ink-muted)', textAlign:'center', padding:20 }}>
            Таблица message_history не создана. Рассылка работает, но история не сохраняется.
            <div style={{ marginTop:8, fontSize:11, color:'var(--ink-faint)' }}>
              Создайте таблицу в Supabase SQL Editor:
              <code style={{ display:'block', marginTop:4, padding:8, background:'var(--bg-alt)', borderRadius:6, fontSize:10, textAlign:'left' }}>
                CREATE TABLE message_history (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), target_role text, message_text text, recipients_count int4, created_at timestamptz DEFAULT now());
                ALTER TABLE message_history ENABLE ROW LEVEL SECURITY;
                CREATE POLICY "mh_all" ON message_history FOR ALL USING (true) WITH CHECK (true);
              </code>
            </div>
          </div>
        ) : history.length === 0 ? (
          <Empty title="Нет рассылок" sub="Отправьте первую рассылку" />
        ) : history.map(h => (
          <div key={h.id} style={{ padding:'12px 0', borderBottom:'1px solid var(--line-soft)' }}>
            <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, marginBottom:4 }}>
              <span style={{ fontWeight:600 }}>
                {h.target_role === 'student' ? 'Ученики' : h.target_role === 'teacher' ? 'Педагоги' : 'Все'}
              </span>
              <span style={{ color:'var(--ink-muted)' }}>
                {h.created_at ? new Date(h.created_at).toLocaleDateString('ru') : '—'}
              </span>
            </div>
            <div style={{ fontSize:12.5, color:'var(--ink-soft)', marginBottom:4 }}>
              {(h.message_text || '').substring(0, 80)}{(h.message_text || '').length > 80 ? '...' : ''}
            </div>
            <Badge color="#4A7EC7">{h.recipients_count || 0} получателей</Badge>
          </div>
        ))}
      </div>
    </div>
  )
}

