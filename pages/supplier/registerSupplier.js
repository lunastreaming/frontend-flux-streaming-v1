import { useState } from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faUser, faLock, faHashtag } from '@fortawesome/free-solid-svg-icons'
import { faWhatsapp } from '@fortawesome/free-brands-svg-icons'


export default function RegisterSupplier() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [phone, setPhone] = useState('')
  const [refCode, setRefCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  const apiUrl = `${process.env.NEXT_PUBLIC_API_URL}/api/auth/register`

  const handleRegister = async e => {
    e.preventDefault()
    setError(null)

    if (!username || !password || !phone) {
      setError('Todos los campos son obligatorios')
      return
    }

    const payload = {
      username: username.trim(),
      password,
      phone: `+51${phone.replace(/\D/g, '')}`,
      role: 'provider',
      referrerCode: refCode?.trim() || null,
    }

    setLoading(true)
    try {
      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        let msg = `Error ${res.status}`
        try {
          const json = await res.json()
          msg = json?.message || msg
        } catch (_) {}
        throw new Error(msg)
      }

      setSuccess(true)
      setTimeout(() => router.push('/supplier/loginSupplier'), 2500)
    } catch (err) {
      setError(err.message || 'Error al registrar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Head><title>Registro Proveedor | Luna Streaming</title></Head>
      <div className="canvas">
        <form className="card" onSubmit={handleRegister}>
          <h1 className="title">Registro Proveedor</h1>
          <p className="subtitle">Crea tu cuenta de proveedor</p>

          {error && <div className="error">{error}</div>}

          <div className="group"><FontAwesomeIcon icon={faUser} /><input type="text" placeholder="Usuario" value={username} onChange={e => setUsername(e.target.value)} /></div>
          <div className="group"><FontAwesomeIcon icon={faLock} /><input type="password" placeholder="Contraseña" value={password} onChange={e => setPassword(e.target.value)} /></div>
          <div className="group"><FontAwesomeIcon icon={faWhatsapp} /><input type="tel" placeholder="Celular" value={phone} onChange={e => setPhone(e.target.value)} /></div>
          <div className="group"><FontAwesomeIcon icon={faHashtag} /><input type="text" placeholder="Código de referencia" value={refCode} onChange={e => setRefCode(e.target.value)} /></div>

          <button type="submit" className="cta" disabled={loading}>
            {loading ? 'Registrando...' : 'Registrarme'}
          </button>

          <p className="back-login">
            ¿Ya tienes cuenta? <span className="link" onClick={() => router.push('/supplier/loginSupplier')}>Ir al login</span>
          </p>
        </form>
      </div>

      {success && (
        <div className="popup">
          <div className="popup-content">
            <h2>Registro exitoso</h2>
            <p>Redirigiendo al login...</p>
          </div>
        </div>
      )}

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
        .title { font-size: 1.8rem; font-weight: 800; text-align: center; color: #f3f3f3; }
        .subtitle { text-align: center; color: #afafaf; font-size: 0.95rem; }
        .error { color: #ffb4b4; text-align: center; font-size: 0.9rem; }
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
        .popup {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.6);
          display: grid;
          place-items: center;
          z-index: 999;
        }
        .popup-content {
          background: rgba(20,20,20,0.85);
          border: 1px solid rgba(255,255,255,0.1);
          backdrop-filter: blur(12px);
          border-radius: 18px;
          padding: 24px;
          max-width: 420px;
          width: 92%;
          text-align: center;
          color: #ededed;
          box-shadow: 0 24px 48px rgba(0,0,0,0.45);
        }
      `}</style>
    </>
  )
}