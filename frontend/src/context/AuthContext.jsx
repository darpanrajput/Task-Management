import { createContext, useContext, useEffect, useMemo, useState } from 'react'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('tm_token') || '')
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem('tm_user')
    return raw ? JSON.parse(raw) : null
  })

  useEffect(() => {
    if (token) localStorage.setItem('tm_token', token)
    else localStorage.removeItem('tm_token')
  }, [token])

  useEffect(() => {
    if (user) localStorage.setItem('tm_user', JSON.stringify(user))
    else localStorage.removeItem('tm_user')
  }, [user])

  const login = (nextToken, nextUser) => {
    setToken(nextToken)
    setUser(nextUser)
  }

  const logout = () => {
    setToken('')
    setUser(null)
  }

  const value = useMemo(() => ({ token, user, login, logout }), [token, user])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
