export async function apiRequest(path, options = {}) {
  const { method = 'GET', body, token } = options

  const response = await fetch(`/api${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  const contentType = response.headers.get('content-type') || ''
  const isJson = contentType.includes('application/json')
  const payload = isJson ? await response.json() : null

  if (response.status === 401) {
    localStorage.removeItem('tm_token')
    localStorage.removeItem('tm_user')

    if (!window.location.pathname.startsWith('/login/')) {
      window.location.href = '/login/user'
    }
  }

  if (!response.ok) {
    const message =
      payload?.message || payload?.error || payload?.details || `${response.status} ${response.statusText}`
    const err = new Error(message)
    err.payload = payload
    throw err
  }

  return payload
}
