import { useState, useEffect, useRef } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useAuth } from '../context/AuthProvider'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
// ⬅️ Nuevo: Se importa el icono de advertencia
import { faUser, faLock, faEye, faEyeSlash, faExclamationTriangle } from '@fortawesome/free-solid-svg-icons'
import { Turnstile } from '@marsidev/react-turnstile' 

export default function Login() {
  const router = useRouter()
  const { login } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [showPassword, setShowPassword] = useState(false)
  const [turnstileToken, setTurnstileToken] = useState(null) 

  const apiUrl = `${process.env.NEXT_PUBLIC_API_URL || ''}/api/auth/login-seller`
  const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITEKEY 

  const pickToken = (data) => {
    if (!data) return null
    return data.accessToken || data.access_token || data.token || data.jwt || null
  }

  const adContainerRef = useRef(null); // Referencia para el contenedor del anuncio

  useEffect(() => {
    // Solo ejecutamos esto si el contenedor existe y no tiene hijos (evita duplicados)
    if (adContainerRef.current && !adContainerRef.current.firstChild) {
      const atOptions = document.createElement('script');
      atOptions.innerHTML = `
        atOptions = {
          'key' : '690c6f42a678c0742bf1e451d81ab0ca',
          'format' : 'iframe',
          'height' : 250,
          'width' : 300,
          'params' : {}
        };
      `;
      
      const invokeScript = document.createElement('script');
      invokeScript.src = 'https://www.highperformanceformat.com/690c6f42a678c0742bf1e451d81ab0ca/invoke.js';
      invokeScript.type = 'text/javascript';

      adContainerRef.current.appendChild(atOptions);
      adContainerRef.current.appendChild(invokeScript);
    }
  }, []);

  const handleLogin = async e => {
    e.preventDefault()
    setError(null)
    
    // ⚠️ Validación de Turnstile (Aseguramos que solo se valide si la clave existe)
    if (turnstileSiteKey && !turnstileToken) {
        setError('Por favor, completa la verificación de seguridad (robot).')
        return
    }

    if (!username.trim() || !password) {
      setError('Por favor ingresa tu usuario y contraseña.')
      return
    }
    
    setLoading(true)
    
    try {
      const resp = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // 🔑 Envía el token al backend para su verificación
        body: JSON.stringify({ 
          username: username.trim(), 
          password,
          turnstileToken: turnstileToken // Aquí se envía el token
        }),
      })

      if (!resp.ok) {
        if (resp.status === 400 || resp.status === 401) {
          setError('No pudimos iniciar sesión. Verifica tus credenciales e inténtalo nuevamente.')
          setUsername('')
          setPassword('')
          return
        }
        let msg = `Error al iniciar sesión (${resp.status})`
        try {
          const json = await resp.json()
          if (json?.message) msg = json.message
        } catch (_) {}
        setError(msg)
        return
      }

      const data = await resp.json()
      const token = pickToken(data)
      
      if (!token) {
        setError('Respuesta inválida del servidor: falta token')
        console.error('[Login] response data (sin token):', data)
        return
      }

      login({
        token,
        refresh_token: data.refreshToken || data.refresh_token
      })

      await new Promise(resolve => setTimeout(resolve, 40))

      router.push('/')
    } catch (err) {
      setError('Ocurrió un error inesperado. Por favor, inténtalo nuevamente.')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => router.push('/')

  return (
    <>
      <Head>
        <title>Login | Luna Streaming</title>
      </Head>

      <div className="canvas">
        <div className="aurora" />
        <div className="grain" />

        <form className="card" onSubmit={handleLogin} noValidate>
          <button type="button" className="close" onClick={handleClose} aria-label="Cerrar">
            ✕
          </button>

          <h1 className="title">Bienvenido</h1>
          <p className="subtitle">Login Luna Plataformas</p>

          {/* 🚨 MEJORA: Estilo de error con icono */}
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
                  theme: 'dark' // Ajusta el tema a 'light' si es necesario
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
           // ⬅️ Ajustado: Deshabilitar si está cargando O si la clave existe y no hay token
            disabled={loading || (turnstileSiteKey && !turnstileToken)}
          >
            {loading ? 'Ingresando...' : 'Ingresar'}
          </button>

          <div className="ad-wrapper" ref={adContainerRef}></div>

          <p className="back-login">
            ¿No tienes una cuenta? <Link href="/register"><span className="link">Regístrate aquí</span></Link>
          </p>
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
        .aurora {
          position: absolute;
          inset: -20% -10% auto auto;
          width: 60vw;
          height: 60vh;
          background: conic-gradient(from 180deg at 50% 50%, #8b5cf6 0%, #22d3ee 20%, #f472b6 40%, transparent 60%);
          filter: blur(100px) saturate(1.2);
          opacity: 0.25;
          animation: float 12s ease-in-out infinite alternate;
        }
        @keyframes float {
          from { transform: translateY(-10px) translateX(6px) rotate(0.5deg); }
          to { transform: translateY(10px) translateX(-6px) rotate(-0.5deg); }
        }
        .grain {
          position: absolute;
          inset: 0;
          opacity: 0.06;
          background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence baseFrequency='0.6'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>");
          mix-blend-mode: soft-light;
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
          gap: 12px;
          position: relative;
          animation: rise 0.35s ease forwards;
        }
        @keyframes rise {
          from { opacity: 0; transform: translateY(10px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }

        .close {
          position: absolute;
          top: 12px;
          right: 12px;
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.12);
          color: #cfcfcf;
          width: 32px;
          height: 32px;
          border-radius: 10px;
          display: grid;
          place-items: center;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .close:hover {
          background: rgba(255, 255, 255, 0.12);
          color: #fff;
        }

        .title {
          color: #f3f3f3;
          font-size: 1.9rem;
          text-align: center;
          font-weight: 800;
          letter-spacing: 0.2px;
        }
        .subtitle {
          color: #afafaf;
          font-size: 0.98rem;
          text-align: center;
          margin-bottom: 6px;
        }

        /* 🚨 MEJORA: Estilos de Error Box */
        .error-box {
            display: flex; /* ⬅️ Nuevo: Para alinear icono y texto */
            align-items: center;
            gap: 10px;
            background: rgba(255, 92, 92, 0.08);
            border: 1px solid rgba(255, 92, 92, 0.2);
            border-radius: 12px;
            padding: 12px 16px;
            animation: fadeInError 0.3s ease forwards;
        }
        .error-icon {
            color: #ff5c5c; /* Color del icono */
            font-size: 1.2rem;
        }
        .error-text {
            color: #ffb4b4;
            font-size: 0.95rem;
            font-weight: 500;
            margin: 0;
        }
        @keyframes fadeInError {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }

        /* 🚨 MEJORA: Espaciado y Foco */
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

        .group input { 
          width: 100%; 
          padding: 12px 14px 12px 40px;
          background: transparent; 
          border: none; 
          border-radius: 10px; 
          color: #f5f5f5; 
          font-size: 1rem; 
          outline: none;
        }
        .group input::placeholder { 
            color: #8e8e8e; 
            transition: color 0.2s ease; /* ⬅️ MEJORA: Transición para placeholder */
        }
        .group:focus-within input::placeholder {
            color: #cfcfcf; /* ⬅️ MEJORA: Placeholder más claro en foco */
        }
        .underline { 
            position: absolute; 
            bottom: 6px; 
            left: 40px; 
            right: 10px; 
            height: 2px;
            background: linear-gradient(90deg, transparent, rgba(139, 92, 246, 0.8), transparent); 
            border-radius: 2px; 
            opacity: 0; 
            transform: scaleX(0.8);
            transition: opacity 0.2s ease, transform 0.2s ease; 
        }
        .group:focus-within .underline { 
            opacity: 1;
            transform: scaleX(1); 
        }

        /* Password group specific: eye button on the right */
        .password-group { padding-right: 44px; } /* leave space for eye button */
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
        .eye-btn:hover { 
            background: rgba(255,255,255,0.04);
            color: #fff; 
        }

        /* 🚨 MEJORA: CTA con transiciones y estado :active */
        .cta {
          padding: 12px 16px;
          background: linear-gradient(135deg, #8b5cf6 0%, #22d3ee 100%);
          color: #0e0e0e;
          border: none;
          border-radius: 14px;
          font-weight: 800;
          cursor: pointer;
          box-shadow: 0 12px 26px rgba(34, 211, 238, 0.18);
          /* ⬅️ MEJORA: Transiciones completas */
          transition: filter 0.2s ease, box-shadow 0.2s ease, opacity 0.3s ease, transform 0.1s ease; 
        }
        .cta:hover { 
            filter: brightness(1.05); 
            box-shadow: 0 16px 30px rgba(139, 92, 246, 0.22);
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

        .back-login { 
            text-align: center; 
            font-size: 0.95rem; 
            color: #afafaf; 
            margin-top: 6px;
        }
        .link { 
            color: #f3f3f3; 
            font-weight: 600; 
            text-decoration: underline; 
            cursor: pointer;
        }
        .link:hover { 
            color: #d6d6d6;
        }

        /* ... (Otros estilos como .popup, @media, etc. se mantuvieron) ... */

        @media (max-width: 560px) {
          .card { padding: 20px;
            border-radius: 16px; 
          }
          .title { font-size: 1.4rem;
          }
          .cta { width: 100%;
          }
        }

        .ad-wrapper {
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 250px; /* Evita saltos de diseño cuando cargue */
          width: 100%;
          margin: 10px 0;
          background: rgba(255, 255, 255, 0.02); /* Fondo sutil para el área */
          border-radius: 12px;
          overflow: hidden;
        }
      `}</style>
    </>
  )
}