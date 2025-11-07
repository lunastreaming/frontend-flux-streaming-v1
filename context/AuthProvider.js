import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react'

const AuthContext = createContext()
const FIVE_MINUTES_MS = 5 * 60 * 1000
const KEY_ACCESS = 'accessToken'
const KEY_REFRESH = 'refreshToken'
const KEY_EXPIRES = 'accessTokenExpiresAt'
const KEY_LOGOUT_TIME = 'logoutTime'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'
const REFRESH_ENDPOINT = `${API_BASE}/auth/refresh`

function nowMs() {
  return Date.now()
}

function decodeJwtPayload(token) {
  try {
    const payload = token.split('.')[1]
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'))
    const obj = JSON.parse(decodeURIComponent(escape(json)))
    return obj
  } catch (e) {
    return null
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(undefined)
  const [ready, setReady] = useState(false)
  const expiryTimeoutRef = useRef(null)
  const isRefreshingRef = useRef(false)
  const pendingRefreshPromiseRef = useRef(null)

  const clearExpiryTimeout = () => {
    if (expiryTimeoutRef.current) {
      clearTimeout(expiryTimeoutRef.current)
      expiryTimeoutRef.current = null
    }
  }

  const persistAccess = (token, expiresAtMs) => {
    try { localStorage.setItem(KEY_ACCESS, token) } catch (_) {}
    try { localStorage.setItem(KEY_EXPIRES, String(expiresAtMs)) } catch (_) {}
  }

  const removePersisted = () => {
    try { localStorage.removeItem(KEY_ACCESS) } catch (_) {}
    try { localStorage.removeItem(KEY_REFRESH) } catch (_) {}
    try { localStorage.removeItem(KEY_EXPIRES) } catch (_) {}
  }

  const logoutInternal = useCallback(() => {
    removePersisted()
    setUser(null)
    try { localStorage.setItem(KEY_LOGOUT_TIME, String(nowMs())) } catch (_) {}
    try { window.dispatchEvent(new CustomEvent('session:logout')) } catch (_) {}
  }, [])

  const logout = useCallback(() => {
    clearExpiryTimeout()
    logoutInternal()
  }, [logoutInternal])

  const scheduleLogout = useCallback((ms) => {
    clearExpiryTimeout()
    if (ms <= 0) {
      logoutInternal()
      return
    }
    expiryTimeoutRef.current = setTimeout(() => {
      logoutInternal()
    }, ms)
  }, [logoutInternal])

  const setSession = useCallback((accessToken, refreshToken = null, expiresAtMs = null) => {
    if (typeof window === 'undefined') return
    if (!accessToken) return

    const payload = decodeJwtPayload(accessToken)
    const rawRole = payload?.role || (Array.isArray(payload?.roles) ? payload.roles[0] : null)
    const role = rawRole?.toUpperCase() || null

    let exp = expiresAtMs || payload?.exp * 1000 || (nowMs() + FIVE_MINUTES_MS)
    persistAccess(accessToken, exp)
    if (refreshToken) {
      try { localStorage.setItem(KEY_REFRESH, refreshToken) } catch (_) {}
    }

    setUser({ token: accessToken, role })
    scheduleLogout(exp - nowMs())
    try { localStorage.setItem(KEY_LOGOUT_TIME, String(nowMs())) } catch (_) {}
  }, [scheduleLogout])

  const login = useCallback(({ accessToken, access_token, token, jwt, refreshToken, refresh_token } = {}) => {
    const normalized = accessToken || access_token || token || jwt
    if (!normalized) return
    const refresh = refreshToken || refresh_token || null
    setSession(normalized, refresh)
  }, [setSession])

  const doRefresh = useCallback(async () => {
    if (isRefreshingRef.current && pendingRefreshPromiseRef.current) {
      return pendingRefreshPromiseRef.current
    }

    isRefreshingRef.current = true
    const p = (async () => {
      try {
        const refreshToken = localStorage.getItem(KEY_REFRESH)
        const body = refreshToken ? { refreshToken } : undefined
        const res = await fetch(REFRESH_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: body ? JSON.stringify(body) : undefined
        })

        if (!res.ok) throw new Error(`Refresh failed ${res.status}`)

        const data = await res.json()
        const newAccess = data.accessToken || data.token || data.access_token
        const newRefresh = data.refreshToken || data.refresh_token || null
        const expiresAt = data.expiresAt || decodeJwtPayload(newAccess)?.exp * 1000 || (nowMs() + FIVE_MINUTES_MS)
        if (!newAccess) throw new Error('No access token in refresh response')

        setSession(newAccess, newRefresh, expiresAt)
        return newAccess
      } finally {
        isRefreshingRef.current = false
        pendingRefreshPromiseRef.current = null
      }
    })()

    pendingRefreshPromiseRef.current = p
    return p
  }, [setSession])

  const ensureValidAccess = useCallback(async () => {
    const token = localStorage.getItem(KEY_ACCESS)
    const expiresRaw = localStorage.getItem(KEY_EXPIRES)
    const expiresAt = expiresRaw ? parseInt(expiresRaw, 10) : null
    if (!token || !expiresAt) throw new Error('No token')
    if (expiresAt - nowMs() < 30 * 1000) {
      return doRefresh()
    }
    return token
  }, [doRefresh])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const restore = () => {
      const token = localStorage.getItem(KEY_ACCESS)
      const expiresRaw = localStorage.getItem(KEY_EXPIRES)
      const expiresAt = expiresRaw ? parseInt(expiresRaw, 10) : null

      if (!token || !expiresAt) {
        setUser(null)
        setReady(true)
        return
      }

      const now = nowMs()
      if (expiresAt <= now) {
        doRefresh().then(() => {
          setReady(true)
        }).catch(() => {
          logoutInternal()
          setUser(null)
          setReady(true)
        })
        return
      }

      const payload = decodeJwtPayload(token)
      const rawRole = payload?.role || (Array.isArray(payload?.roles) ? payload.roles[0] : null)
      const role = rawRole?.toUpperCase() || null

      setUser({ token, role })
      scheduleLogout(expiresAt - now)
      setReady(true)
    }

    restore()

    const onStorage = (e) => {
      if (!e) return
      if ([KEY_ACCESS, KEY_EXPIRES, KEY_LOGOUT_TIME, KEY_REFRESH].includes(e.key)) {
        restore()
      }
    }

    const onActivity = () => {
      try {
        const tokenNow = localStorage.getItem(KEY_ACCESS)
        const expiresRawNow = localStorage.getItem(KEY_EXPIRES)
        const expiresAtNow = expiresRawNow ? parseInt(expiresRawNow, 10) : null
        if (!tokenNow || !expiresAtNow) return
        const msLeft = expiresAtNow - nowMs()
        if (msLeft < 2 * 60 * 1000) {
          doRefresh().catch(() => { logoutInternal() })
        }
      } catch (_) {}
    }

    window.addEventListener('storage', onStorage)
    const events = ['mousemove', 'keydown', 'click', 'touchstart', 'visibilitychange']
    events.forEach(ev => window.addEventListener(ev, onActivity))

    const onSessionLogout = () => {
      clearExpiryTimeout()
      setUser(null)
    }
    window.addEventListener('session:logout', onSessionLogout)

    return () => {
      window.removeEventListener('storage', onStorage)
      events.forEach(ev => window.removeEventListener(ev, onActivity))
      window.removeEventListener('session:logout', onSessionLogout)
      clearExpiryTimeout()
    }
  }, [doRefresh, logoutInternal, scheduleLogout])

  return (
    <AuthContext.Provider value={{
      user,
      ready,
      login,
      logout,
      ensureValidAccess,
      refresh: doRefresh,
      setSession
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}