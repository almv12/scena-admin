import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Spinner, Empty, Badge } from '../components/UI'

export default function Broadcast() {
  const [target, setTarget] = useState('student')
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState(null)
  const [history, setHistory] = useState([])

  useEffect(() => {
    supabase.from('message_history').select('*').order('sent_at', { ascending: false }).limit(20)
      .then(({ data }) => setHistory(data || []))
  }, [])

  async function sendBroadcast() {
    if (!text.trim()) return
    setSending(true)
    setResult(null)

    try {
      // Call existing notify API
      const res = await fetch(`https://scena-app-proba.vercel.app/api/notify?action=broadcast&role=${target}&text=${encodeURIComponent(text)}`)
      const data = await res.json()

      // Save to history
      await supabase.from('message_history').insert({
        target_role: target,
        message_text: text,
        recipients_count: data.sent || 0,
      })

      setResult({ success: true, count: data.sent || 0 })
      setText('')

      // Refresh history
      const { data: hist } = await supabase.from('message_history').select('*').order('sent_at', { ascending: false }).limit(20)
      setHistory(hist || [])
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
          <div className="field-label">Получатели</div>
          <select className="s-input" value={target} onChange={e=>setTarget(e.target.value)}>
            <option value="student">Все ученики</option>
            <option value="teacher">Все педагоги</option>
            <option value="all">Все пользователи</option>
          </select>
        </div>

        <div style={{ marginBottom:14 }}>
          <div className="field-label">Сообщение</div>
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
            background: result.success ? 'var(--green-bg)' : 'var(--red-bg)',
            color: result.success ? 'var(--green)' : 'var(--red)',
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

        {history.length === 0 ? (
          <Empty title="Нет рассылок" sub="Отправьте первую рассылку" />
        ) : history.map(h => (
          <div key={h.id} style={{ padding:'12px 0', borderBottom:'1px solid var(--line-soft)' }}>
            <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, marginBottom:4 }}>
              <span style={{ fontWeight:600 }}>
                {h.target_role === 'student' ? 'Ученики' : h.target_role === 'teacher' ? 'Педагоги' : 'Все'}
              </span>
              <span style={{ color:'var(--ink-muted)' }}>
                {h.sent_at ? new Date(h.sent_at).toLocaleDateString('ru') : '—'}
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
