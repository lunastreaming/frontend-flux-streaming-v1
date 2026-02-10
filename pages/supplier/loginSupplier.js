import { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useAuth } from '../../context/AuthProvider';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUser, faLock, faEye, faEyeSlash, faExclamationTriangle } from '@fortawesome/free-solid-svg-icons'; // ⬅️ Nuevo: Icono de advertencia
import Cookies from 'js-cookie';
import { Turnstile } from '@marsidev/react-turnstile'; 

export default function LoginSupplier() {
  const router = useRouter();
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState(null); 

  const apiUrl = `${process.env.NEXT_PUBLIC_API_URL || ''}/api/auth/login-supplier`;
  const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITEKEY; 

  const pickToken = (data) => {
    if (!data) return null;
    return data.accessToken || data.access_token || data.token || data.jwt || null;
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(null);
    
    // Validación de Turnstile
    if (turnstileSiteKey && !turnstileToken) {
        setError('Por favor, completa la verificación de seguridad (robot).');
        return;
    }
    
    if (!username.trim() || !password) {
      setError('Usuario y contraseña son obligatorios');
      return;
    }
    setLoading(true);
    try {
      const resp = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            username: username.trim(), 
            password,
            turnstileToken: turnstileToken
        }),
      });

      if (!resp.ok) {
        setError(resp.status === 401 ? 'Credenciales incorrectas' : `Error ${resp.status}`);
        return;
      }

      const data = await resp.json();
      const token = pickToken(data);
      if (!token) {
        setError('Token no recibido del servidor');
        return;
      }

      Cookies.set('accessToken', token, { path: '/', sameSite: 'Lax' });
      if (data.refreshToken || data.refresh_token) {
        Cookies.set('refreshToken', data.refreshToken || data.refresh_token, { path: '/', sameSite: 'Lax' });
      }

      login({ token, refresh_token: data.refreshToken || data.refresh_token });

      await new Promise((r) => setTimeout(r, 40));
      router.push('/supplier');
    } catch (err) {
      setError(err.message || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <>
      <Head><title>Login Proveedor | Luna Streaming</title></Head>
      <div className="canvas">
        <form className="card" onSubmit={handleLogin}>
          <h1 className="title">Proveedor</h1>
          <p className="subtitle">Accede a tu panel</p>

          {/* 🚨 MEJORA 1: Estilo de error con icono */}
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

          {/* WIDGET DE VALIDACIÓN DE ROBOT */}
          {turnstileSiteKey && (
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: '10px', marginBottom: '10px' }}>
              <Turnstile
                siteKey={turnstileSiteKey}
                options={{ theme: 'dark' }}
                onSuccess={(token) => { setTurnstileToken(token); setError(null); }}
                onExpire={() => setTurnstileToken(null)} 
                onError={() => { setTurnstileToken(null); setError('Error en la verificación de seguridad. Intenta recargar la página.'); }}
              />
            </div>
          )}

          <button 
  type="submit" 
  className="cta" 
  style={{ 
    position: 'relative', 
    zIndex: 999999, 
    pointerEvents: 'auto',
    cursor: 'pointer'
  }}
  disabled={loading || (turnstileSiteKey && !turnstileToken)}
>
  {loading ? 'Ingresando...' : 'Ingresar'}
</button>

          <p className="back-login">
            ¿No tienes cuenta?
            <span className="link" onClick={() => router.push('/supplier/registerSupplier')}>Regístrate</span>
          </p>
        </form>
      </div>

      <style jsx>{`
        .canvas {
          min-height: 100vh;
          background: radial-gradient(circle at 20% 10%, #1a1a1a, #0e0e0e);
          display: grid;
          place-items: center;
        }
        .card {
          background: rgba(22,22,22,0.6);
          border: 1px solid rgba(255,255,255,0.08);
          backdrop-filter: blur(16px);
          border-radius: 20px;
          padding: 28px;
          width: 92%;
          max-width: 480px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .title {
          font-size: 1.8rem;
          font-weight: 800;
          text-align: center;
          color: #f3f3f3;
        }
        .subtitle {
          text-align: center;
          color: #afafaf;
          font-size: 0.95rem;
          margin-bottom: 6px;
        }

        /* 🚨 MEJORA 2: Estilos de Error Box */
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

        /* 🚨 MEJORA 3 & 4: Estilos de Grupo y Foco/Espaciado */
        .group {
          position: relative;
          display: flex;
          align-items: center;
          gap: 10px;
          background: rgba(30,30,30,0.7);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 14px;
          padding: 10px 14px;
          margin-bottom: 8px; /* ⬅️ MEJORA: Espacio extra abajo */
          transition: border-color 0.2s ease, background 0.2s ease;
        }
        .group:focus-within { 
            border-color: #8b5cf6; 
            background: rgba(30,30,30,0.85); 
        }
        .group:focus-within .icon { 
            color: #8b5cf6; /* ⬅️ MEJORA: Icono cambia de color en foco */
        }
        .icon {
            color: #cfcfcf;
            font-size: 1rem;
            transition: color 0.2s ease; /* ⬅️ MEJORA: Transición para el icono */
        }
        .group input {
          flex: 1;
          background: transparent;
          border: none;
          color: #f5f5f5;
          font-size: 1rem;
          outline: none;
        }
        .group input::placeholder {
            transition: color 0.2s ease;
            color: #8e8e8e;
        }
        .group:focus-within input::placeholder {
            color: #cfcfcf; /* ⬅️ MEJORA: Placeholder más claro en foco */
        }
        .underline {
          position: absolute; bottom: 6px; left: 40px; right: 10px; height: 2px;
          background: linear-gradient(90deg, transparent, rgba(139, 92, 246, 0.8), transparent); border-radius: 2px; opacity: 0; transform: scaleX(0.8);
          transition: opacity 0.2s ease, transform 0.2s ease;
        }
        .group:focus-within .underline { opacity: 1; transform: scaleX(1); }


        /* Password group: reserve space for eye button */
        .password-group { padding-right: 44px; }

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
        .eye-btn:hover { background: rgba(255,255,255,0.04); color: #fff; }

        /* 🚨 MEJORA 5: CTA con transiciones y estado :active */
        .cta {
          padding: 12px;
          background: linear-gradient(135deg, #8b5cf6, #22d3ee);
          color: #0e0e0e;
          border: none;
          border-radius: 14px;
          font-weight: 800;
          cursor: pointer;
          box-shadow: 0 12px 26px rgba(34, 211, 238, 0.18);
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
            opacity: 0.6; /* Un poco menos de opacidad para que se note más */
            cursor: not-allowed; 
            filter: none;
            box-shadow: none;
            transform: none;
        }

        .back-login {
          text-align: center;
          font-size: 0.95rem;
          color: #afafaf;
        }
        .link {
          color: #f3f3f3;
          font-weight: 600;
          text-decoration: underline;
          cursor: pointer;
        }

        @media (max-width: 560px) {
          .card { padding: 20px; border-radius: 16px; }
          .title { font-size: 1.6rem; }
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

        .ad-wrapper-box {
          display: flex;
          justify-content: center;
          min-height: 250px;
          margin: 10px 0;
        }

        .ad-footer-container {
          position: relative;
          display: flex;
          justify-content: center;
          width: 100%;
          margin-top: 30px;
          padding-bottom: 20px;
          overflow: hidden; /* Evita scroll horizontal si el banner es muy ancho */
        }

        /* Ajuste para móviles: escala el banner si la pantalla es pequeña */
        @media (max-width: 768px) {
          .ad-footer-container {
            transform: scale(0.8); /* Reduce el tamaño visualmente para que quepa */
            transform-origin: center;
          }
        }

      `}</style>
    </>
  );
}