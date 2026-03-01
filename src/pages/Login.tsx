import { useState } from 'react'
import './Login.css'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [isSignUp, setIsSignUp] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const { error: err } = isSignUp
      ? await supabase.auth.signUp({ email, password })
      : await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (err) {
      setError(err.message)
      console.error('Auth error:', err)
      return
    }
    navigate('/')
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <h1>KPI System</h1>
        <p className="login-subtitle">Студия анимации</p>
        <form onSubmit={handleSubmit} className="login-form">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
          <input
            type="password"
            placeholder="Пароль"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
          {error && <p className="error">{error}</p>}
          <button type="submit" disabled={loading} className="btn btn-primary">
            {loading ? '...' : isSignUp ? 'Регистрация' : 'Войти'}
          </button>
          <button type="button" onClick={() => setIsSignUp(!isSignUp)} className="btn btn-outline" style={{ marginTop: '0.5rem' }}>
            {isSignUp ? 'Уже есть аккаунт' : 'Регистрация'}
          </button>
        </form>
      </div>
    </div>
  )
}
