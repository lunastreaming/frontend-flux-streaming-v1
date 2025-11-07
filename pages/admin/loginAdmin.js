import { useState } from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'
import { useAuth } from '../../context/AuthProvider'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faUser, faLock } from '@fortawesome/free-solid-svg-icons'

export default function LoginAdmin() {
  const router = useRouter()
  const { login } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const apiUrl = `${process.env.NEXT_PUBLIC_API_URL || ''}/api/auth/login-admin`

  const pickToken = (data) => {
    if (!data) return null
    return data.accessToken || data.access_token || data.token || data.jwt || null
  }

  const handleLogin = async e => {
    e.preventDefault()
    setError(null)
    if (!username.trim() || !password) {
      setError('Usuario y contraseña son obligatorios')
      return
    }
    setLoading(true)
    try {
      const resp = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password }),
      })

      if (!resp.ok) {
        const msg = resp.status === 401 ? 'Credenciales inválidas' : `Error ${resp.status}`
        setError(msg)
        setUsername('')
        setPassword('')
        return
      }

      const data = await resp.json()
      const token = pickToken(data)
      if (!token) {
        setError('Respuesta inválida del servidor: falta token')
        return
      }

      // Decodificar rol desde el JWT (fuente de verdad)
      let payload = null
      try {
        const raw = token.split('.')[1]
        const b64 = raw.replace(/-/g, '+').replace(/_/g, '/')
        payload = JSON.parse(decodeURIComponent(escape(atob(b64))))
      } catch (_) {
        payload = null
      }

      const rawRole = payload?.role || (Array.isArray(payload?.roles) ? payload.roles[0] : null) || data.role || null
      const role = rawRole?.toString().toUpperCase() || null

      if (role !== 'ADMIN') {
        setError('Acceso denegado: solo usuarios con rol ADMIN pueden ingresar')
        return
      }

      // Persistir en provider (normaliza nombres internamente)
      // login puede ser sincrónico; envolver en Promise para await seguro
      await Promise.resolve(login({
        accessToken: token,
        refresh_token: data.refreshToken || data.refresh_token || null
      }))

      // Guardar cookie para que el middleware Edge la pueda leer
      try {
        document.cookie = `accessToken=${token}; path=/; SameSite=Lax`
      } catch (_) {}

      // Pequeña espera para asegurar persistencia si es necesario
      await new Promise(resolve => setTimeout(resolve, 80))

      console.log('Login exitoso, redirigiendo a /admin')
      router.push('/admin')
    } catch (err) {
      setError(err?.message || 'Error desconocido al iniciar sesión')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => router.push('/')

  return (
    <>
      <Head><title>Login Admin | Luna Streaming</title></Head>

      <div className="canvas">
        <form className="card" onSubmit={handleLogin} noValidate>
          <button type="button" className="close" onClick={handleClose}>✕</button>
          <h1 className="title">Acceso Administrativo</h1>
          <p className="subtitle">Login administrativo</p>

          {error && <div style={{ color: '#ffb4b4', textAlign: 'center' }}>{error}</div>}

          <div className="group">
            <div className="icon"><FontAwesomeIcon icon={faUser} /></div>
            <input
              type="text"
              placeholder="Usuario"
              value={username}
              onChange={e => setUsername(e.target.value)}
              required
            />
            <span className="underline" />
          </div>

          <div className="group">
            <div className="icon"><FontAwesomeIcon icon={faLock} /></div>
            <input
              type="password"
              placeholder="Contraseña"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
            <span className="underline" />
          </div>

          <button type="submit" className="cta" disabled={loading}>
            {loading ? 'Ingresando...' : 'Ingresar como Admin'}
          </button>
        </form>
      </div>

      <style jsx>{`
        .canvas {
          min-height: 100vh;
          background: radial-gradient(1200px 600px at 20% 10%, #1a1a1a 0%, #0e0e0e 60%, #0b0b0b 100%);
          position: relative;
          display: grid;
          place-items: center;
          overflow: hidden;
        }
        .card {
          width: 92%;
          max-width: 480px;
          background: rgba(22, 22, 22, 0.6);
          border: 1px solid rgba(255, 255, 255, 0.08);
          backdrop-filter: blur(16px);
          border-radius: 20px;
          padding: 28px;
          box-shadow: 0 30px 60px rgba(0, 0, 0, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.06);
          display: flex;
          flex-direction: column;
          gap: 14px;
          position: relative;
          animation: rise 0.35s ease forwards;
        }
        @keyframes rise { from { opacity: 0; transform: translateY(10px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
        .close { position: absolute; top: 12px; right: 12px; background: rgba(255, 255, 255, 0.06); border: 1px solid rgba(255, 255, 255, 0.12); color: #cfcfcf; width: 32px; height: 32px; border-radius: 10px; display: grid; place-items: center; cursor: pointer; transition: all 0.2s ease; }
        .close:hover { background: rgba(255, 255, 255, 0.12); color: #fff; }

        .title { color: #f3f3f3; font-size: 1.9rem; text-align: center; font-weight: 800; letter-spacing: 0.2px; }
        .subtitle { color: #afafaf; font-size: 0.98rem; text-align: center; margin-bottom: 6px; }

        .group {
          position: relative;
          display: flex;
          align-items: center;
          background: rgba(30, 30, 30, 0.7);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 14px;
          padding: 8px 10px;
          transition: border-color 0.2s ease, background 0.2s ease;
        }
        .group:focus-within { border-color: #8b5cf6; background: rgba(30, 30, 30, 0.85); }
        .icon { position: absolute; left: 12px; display: flex; align-items: center; color: #cfcfcf; font-size: 1rem; }
        .group input { width: 100%; padding: 12px 14px 12px 40px; background: transparent; border: none; border-radius: 10px; color: #f5f5f5; font-size: 1rem; outline: none; }
        .group input::placeholder { color: #8e8e8e; }
        .underline { position: absolute; bottom: 6px; left: 40px; right: 10px; height: 2px; background: linear-gradient(90deg, transparent, rgba(139, 92, 246, 0.8), transparent); border-radius: 2px; opacity: 0; transform: scaleX(0.8); transition: opacity 0.2s ease, transform 0.2s ease; }
        .group:focus-within .underline { opacity: 1; transform: scaleX(1); }

        .cta {
          padding: 12px 16px;
          background: linear-gradient(135deg, #8b5cf6 0%, #22d3ee 100%);
          color: #0e0e0e;
          border: none;
          border-radius: 14px;
          font-weight: 800;
          cursor: pointer;
          transition: filter 0.2s ease, box-shadow 0.2s ease;
          box-shadow: 0 12px 26px rgba(34, 211, 238, 0.18);
        }
        .cta:hover { filter: brightness(1.05); box-shadow: 0 16px 30px rgba(139, 92, 246, 0.22); }
      `}</style>
    </>
  )
}