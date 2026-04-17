import React, { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Login({ onLogin }) {
  const [email, setEmail] = useState('')
  const [pass, setPass] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleLogin(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const { data, error: err } = await supabase.auth.signInWithPassword({
        email, password: pass
      })
      if (err) throw err
      onLogin(data.user)
    } catch(err) {
      setError(err.message || 'Ошибка входа')
    }
    setLoading(false)
  }

  return (
    <div style={{
      display:'flex', alignItems:'center', justifyContent:'center',
      minHeight:'100vh', background:'var(--sidebar)',
      position:'relative', overflow:'hidden'
    }}>
      <div style={{
        position:'absolute', top:'-30%', right:'-20%', width:'60%', height:'60%',
        background:'radial-gradient(circle, rgba(212,160,58,0.06) 0%, transparent 70%)',
        borderRadius:'50%'
      }} />
      <div style={{
        position:'absolute', bottom:'-20%', left:'-10%', width:'40%', height:'40%',
        background:'radial-gradient(circle, rgba(74,126,199,0.04) 0%, transparent 70%)',
        borderRadius:'50%'
      }} />

      <form onSubmit={handleLogin} style={{
        position:'relative', zIndex:1,
        background:'rgba(255,255,255,0.025)',
        border:'1px solid rgba(255,255,255,0.06)',
        borderRadius:16, padding:'44px 36px', width:360
      }}>
        <div style={{ textAlign:'center', marginBottom:36 }}>
          <div style={{
            fontFamily:'var(--font-display)', fontSize:32, fontWeight:700,
            color:'var(--gold)', letterSpacing:1
          }}>Сцена</div>
          <div style={{
            color:'rgba(255,255,255,0.35)', fontSize:12, marginTop:6,
            letterSpacing:2, textTransform:'uppercase', fontWeight:500
          }}>Панель управления</div>
        </div>

        <div style={{ marginBottom:16 }}>
          <div style={{
            color:'rgba(255,255,255,0.45)', fontSize:10.5, fontWeight:600,
            marginBottom:6, letterSpacing:0.8, textTransform:'uppercase'
          }}>Email</div>
          <input
            type="email" value={email} onChange={e=>setEmail(e.target.value)}
            placeholder="admin@scena.uz" required
            style={{
              width:'100%', padding:'11px 14px',
              background:'rgba(255,255,255,0.05)',
              border:'1px solid rgba(255,255,255,0.08)',
              borderRadius:8, color:'#fff', fontSize:14,
              fontFamily:'var(--font)', outline:'none', boxSizing:'border-box'
            }}
          />
        </div>

        <div style={{ marginBottom:28 }}>
          <div style={{
            color:'rgba(255,255,255,0.45)', fontSize:10.5, fontWeight:600,
            marginBottom:6, letterSpacing:0.8, textTransform:'uppercase'
          }}>Пароль</div>
          <input
            type="password" value={pass} onChange={e=>setPass(e.target.value)}
            placeholder="••••••••" required
            style={{
              width:'100%', padding:'11px 14px',
              background:'rgba(255,255,255,0.05)',
              border:'1px solid rgba(255,255,255,0.08)',
              borderRadius:8, color:'#fff', fontSize:14,
              fontFamily:'var(--font)', outline:'none', boxSizing:'border-box'
            }}
          />
        </div>

        <button type="submit" disabled={loading} style={{
          width:'100%', padding:13, background:'var(--gold)', color:'#fff',
          border:'none', borderRadius:8, fontSize:14, fontWeight:700,
          fontFamily:'var(--font)', cursor:'pointer',
          boxShadow:'0 4px 16px rgba(212,160,58,0.2)',
          opacity: loading ? 0.6 : 1
        }}>
          {loading ? 'Вход...' : 'Войти'}
        </button>

        {error && (
          <div style={{ color:'var(--red)', fontSize:13, textAlign:'center', marginTop:12 }}>
            {error}
          </div>
        )}
      </form>
    </div>
  )
}
