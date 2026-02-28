import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiRequest } from '../../lib/api.js'
import { useAuth } from '../../context/AuthContext.jsx'

function AuthForm({ expectedRole, title, subtitle }) {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [form, setForm] = useState({ email: '', password: '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const submit = async (event) => {
    event.preventDefault()
    setBusy(true)
    setError('')

    try {
      const data = await apiRequest('/auth/login', {
        method: 'POST',
        body: form,
      })

      if (expectedRole === 'Admin' && data.user?.role !== 'Admin') {
        throw new Error('This screen is only for admin accounts.')
      }

      if (expectedRole === 'User' && data.user?.role === 'Admin') {
        throw new Error('Admin accounts must use Admin Login.')
      }

      login(data.token, data.user)

      if (data.user?.role === 'Admin') navigate('/admin', { replace: true })
      else navigate('/user', { replace: true })
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="auth-card">
      <h2>{title}</h2>
      <p>{subtitle}</p>
      {error ? <p className="error-banner">{error}</p> : null}
      <form className="auth-form" onSubmit={submit}>
        <label>
          Email
          <input
            type="email"
            value={form.email}
            onChange={(e) => setForm((v) => ({ ...v, email: e.target.value }))}
            required
          />
        </label>
        <label>
          Password
          <input
            type="password"
            value={form.password}
            onChange={(e) => setForm((v) => ({ ...v, password: e.target.value }))}
            required
          />
        </label>
        <button type="submit" disabled={busy}>
          {busy ? 'Signing in...' : 'Sign in'}
        </button>
      </form>
    </section>
  )
}

export default AuthForm
