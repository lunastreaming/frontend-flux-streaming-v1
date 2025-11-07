import { useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useAuth } from '../../context/AuthProvider';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUser, faLock } from '@fortawesome/free-solid-svg-icons';
import Cookies from 'js-cookie';

export default function LoginSupplier() {
  const router = useRouter();
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const apiUrl = `${process.env.NEXT_PUBLIC_API_URL || ''}/api/auth/login-supplier`;

  const pickToken = (data) => {
    if (!data) return null;
    return data.accessToken || data.access_token || data.token || data.jwt || null;
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(null);
    if (!username.trim() || !password) {
      setError('Usuario y contraseña son obligatorios');
      return;
    }
    setLoading(true);
    try {
      const resp = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password }),
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

      // ✅ Guardar token en cookies para que el middleware lo lea
      Cookies.set('accessToken', token, { path: '/', sameSite: 'Lax' });

      // También puedes guardar el refresh token si lo usas
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

          {error && <div className="error">{error}</div>}

          <div className="group">
            <FontAwesomeIcon icon={faUser} />
            <input type="text" placeholder="Usuario" value={username} onChange={e => setUsername(e.target.value)} />
          </div>

          <div className="group">
            <FontAwesomeIcon icon={faLock} />
            <input type="password" placeholder="Contraseña" value={password} onChange={e => setPassword(e.target.value)} />
          </div>

          <button type="submit" className="cta" disabled={loading}>
            {loading ? 'Ingresando...' : 'Ingresar'}
          </button>

          <p className="back-login">
            ¿No tienes cuenta? <span className="link" onClick={() => router.push('/supplier/registerSupplier')}>Regístrate</span>
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
          gap: 14px;
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
        }
        .error {
          color: #ffb4b4;
          text-align: center;
          font-size: 0.9rem;
        }
        .group {
          display: flex;
          align-items: center;
          gap: 10px;
          background: rgba(30,30,30,0.7);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 14px;
          padding: 10px 14px;
        }
        .group input {
          flex: 1;
          background: transparent;
          border: none;
          color: #f5f5f5;
          font-size: 1rem;
          outline: none;
        }
        .cta {
          padding: 12px;
          background: linear-gradient(135deg, #8b5cf6, #22d3ee);
          color: #0e0e0e;
          border: none;
          border-radius: 14px;
          font-weight: 800;
          cursor: pointer;
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
      `}</style>
    </>
  );
}