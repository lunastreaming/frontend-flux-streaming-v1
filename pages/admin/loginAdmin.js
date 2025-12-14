import { useState } from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'
import { useAuth } from '../../context/AuthProvider'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
// ⬅️ Importamos Turnstile y el nuevo icono de advertencia
import { faUser, faLock, faEye, faEyeSlash, faExclamationTriangle } from '@fortawesome/free-solid-svg-icons'
import { Turnstile } from '@marsidev/react-turnstile' 

export default function LoginAdmin() {
  const router = useRouter()
  const { login } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [showPassword, setShowPassword] = useState(false)
  const [turnstileToken, setTurnstileToken] = useState(null) // ⬅️ NUEVO: Estado para el token

  const apiUrl = `${process.env.NEXT_PUBLIC_API_URL || ''}/api/auth/login-admin`
  const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITEKEY // ⬅️ NUEVO: Clave pública

  const pickToken = (data) => {
    if (!data) return null
    return data.accessToken || data.access_token || data.token || data.jwt || null
  }

  const handleLogin = async e => {
    e.preventDefault()
    setError(null)

    // ⚠️ Validación de Turnstile
    if (turnstileSiteKey && !turnstileToken) {
        setError('Por favor, completa la verificación de seguridad (robot).')
        return
    }

    if (!username.trim() || !password) {
      setError('Usuario y contraseña son obligatorios')
      return
    }
    setLoading(true)
    try {
      const resp = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
       
        // 🔑 Envía el token al backend
        body: JSON.stringify({ 
            username: username.trim(), 
            password,
            turnstileToken: turnstileToken // Aquí se envía el token
        }),
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
      await Promise.resolve(login({
        accessToken: token,
        refresh_token: data.refreshToken || data.refresh_token || null
      }))

      // Guardar cookie para que el middleware Edge la pueda leer
      try {
        document.cookie = `accessToken=${token}; path=/; SameSite=Lax`
      } catch (_) {}

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

          {/* 🚨 MEJORA 2: Estilo de error con icono */}
          {error && (
            <div className="error-box" role="alert">
                <FontAwesomeIcon icon={faExclamationTriangle} className="error-icon" />
                <p className="error-text">{error}</p>
            </div>
          )}

          <div className="group">
            <div className="icon"><FontAwesomeIcon icon={faUser} /></div>
        
            <input
              type="text"
              placeholder="Usuario"
              value={username}
              onChange={e => setUsername(e.target.value)}
              required
              aria-label="Usuario"
          
            />
            <span className="underline" />
          </div>

          <div className="group password-group">
            <div className="icon"><FontAwesomeIcon icon={faLock} /></div>
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Contraseña"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              aria-label="Contraseña"
            />
            <button
  
              type="button"
              className="eye-btn"
              onClick={() => setShowPassword(s => !s)}
              aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              title={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            >
              <FontAwesomeIcon icon={showPassword ? faEyeSlash : faEye} />
            </button>
            <span className="underline" />
          </div>

          {/* ----------------------------------------------------- */}
          {/* 🤖 WIDGET DE VALIDACIÓN DE ROBOT (Cloudflare Turnstile) */}
          {/* ----------------------------------------------------- */}
          {turnstileSiteKey && (
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: '10px', marginBottom: '10px' }}>
              <Turnstile
                siteKey={turnstileSiteKey}
                options={{
                  theme: 'dark' // Ajusta el tema si es necesario
                }}
                onSuccess={(token) => {
                  setTurnstileToken(token); // Almacena el token
                  setError(null); 
                }}
                onExpire={() => setTurnstileToken(null)} 
                onError={() => { 
                  setTurnstileToken(null); 
                  setError('Error en la verificación de seguridad. Intenta recargar la página.');
                }}
              />
            </div>
          )}
          {/* ----------------------------------------------------- */}


          <button 
            type="submit" 
            className="cta" 
            // Deshabilitar si está cargando O NO hay token de Turnstile
            disabled={loading || (turnstileSiteKey && !turnstileToken)}
          >
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
        @keyframes rise { from { opacity: 0;
          transform: translateY(10px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1);
        } }
        .close { position: absolute; top: 12px; right: 12px;
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.12);
          color: #cfcfcf;
          width: 32px; height: 32px; border-radius: 10px;
          display: grid; place-items: center; cursor: pointer; transition: all 0.2s ease;
        }
        .close:hover { background: rgba(255, 255, 255, 0.12); color: #fff;
        }

        .title { color: #f3f3f3; font-size: 1.9rem; text-align: center; font-weight: 800; letter-spacing: 0.2px;
        }
        .subtitle { color: #afafaf; font-size: 0.98rem; text-align: center; margin-bottom: 6px;
        }

        /* 🚨 MEJORA: Estilos de Error Box (Mejora 2) */
        .error-box {
            display: flex;
            align-items: center;
            gap: 10px;
            background: rgba(255, 92, 92, 0.08);
            border: 1px solid rgba(255, 92, 92, 0.2);
            border-radius: 12px;
            padding: 12px 16px;
            animation: fadeInError 0.3s ease forwards;
        }
        .error-icon {
            color: #ff5c5c; 
            font-size: 1.2rem;
        }
        .error-text {
            color: #ffb4b4;
            font-size: 0.95rem;
            font-weight: 500;
            margin: 0;
        }

        /* 🚨 MEJORA: Espaciado y Foco (Mejoras 1 & 3) */
        .group {
          position: relative;
          display: flex;
          align-items: center;
          background: rgba(30, 30, 30, 0.7);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 14px;
          padding: 8px 10px;
          margin-bottom: 8px; /* ⬅️ MEJORA: Espacio extra abajo */
          transition: border-color 0.2s ease, background 0.2s ease;
        }
        .group:focus-within { 
            border-color: #8b5cf6; 
            background: rgba(30, 30, 30, 0.85);
        }
        .icon { 
            position: absolute; 
            left: 12px; 
            display: flex; 
            align-items: center; 
            color: #cfcfcf;
            font-size: 1rem;
            transition: color 0.2s ease; /* ⬅️ MEJORA: Transición para el icono */
        }
        .group:focus-within .icon { 
            color: #8b5cf6; /* ⬅️ MEJORA: Icono cambia de color en foco */
        }

        .group input { width: 100%; padding: 12px 14px 12px 40px;
          background: transparent; border: none; border-radius: 10px; color: #f5f5f5; font-size: 1rem; outline: none;
        }
        .group input::placeholder { 
            color: #8e8e8e;
            transition: color 0.2s ease;
        }
        .group:focus-within input::placeholder {
            color: #cfcfcf; /* ⬅️ MEJORA: Placeholder más claro en foco */
        }
        .underline { position: absolute; bottom: 6px; left: 40px; right: 10px; height: 2px;
          background: linear-gradient(90deg, transparent, rgba(139, 92, 246, 0.8), transparent); border-radius: 2px; opacity: 0; transform: scaleX(0.8);
          transition: opacity 0.2s ease, transform 0.2s ease;
        }
        .group:focus-within .underline { opacity: 1;
          transform: scaleX(1);
        }

        /* Password group: reserve space for eye button */
        .password-group { padding-right: 44px;
        }

        .eye-btn {
          position: absolute;
          right: 10px;
          background: transparent;
          border: none;
          color: #cfcfcf;
          width: 32px;
          height: 32px;
          display: grid;
          place-items: center;
          cursor: pointer;
          border-radius: 8px;
          transition: background 0.12s ease, color 0.12s ease;
        }
        .eye-btn:hover { background: rgba(255,255,255,0.04);
          color: #fff;
        }

        /* 🚨 MEJORA: CTA con transiciones y estado :active (Mejoras 4 & 5) */
        .cta {
          padding: 12px 16px;
          background: linear-gradient(135deg, #8b5cf6 0%, #22d3ee 100%);
          color: #0e0e0e;
          border: none;
          border-radius: 14px;
          font-weight: 800;
          cursor: pointer;
          box-shadow: 0 12px 26px rgba(34, 211, 238, 0.18);
          transition: filter 0.2s ease, box-shadow 0.2s ease, opacity 0.3s ease, transform 0.1s ease;
        }
        .cta:hover { filter: brightness(1.05); box-shadow: 0 16px 30px rgba(139, 92, 246, 0.22);
        }
        .cta:active { 
            transform: translateY(1px); /* ⬅️ MEJORA: Efecto "presionado" */
            filter: brightness(0.95); 
            box-shadow: 0 8px 16px rgba(139, 92, 246, 0.15);
        }
        .cta:disabled { 
            opacity: 0.6; /* ⬅️ MEJORA: Opacidad ajustada */
            cursor: not-allowed; 
            filter: none;
            box-shadow: none;
            transform: none;
        }

        @media (max-width: 640px) {
          .card { padding: 20px;
            border-radius: 16px;
          }
          .title { font-size: 1.6rem;
          }
        }
      `}</style>
    </>
  )
}