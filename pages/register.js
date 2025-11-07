import { useState, useEffect } from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'
import Select from 'react-select'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faUser, faLock, faHashtag } from '@fortawesome/free-solid-svg-icons'
import { faWhatsapp } from '@fortawesome/free-brands-svg-icons'

export default function Register() {
  const router = useRouter()

  // Form fields
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [refCode, setRefCode] = useState('')

  // Countries & selection
  const [countries, setCountries] = useState([])
  const [selectedCountry, setSelectedCountry] = useState(null)
  const [loadingCountries, setLoadingCountries] = useState(true)

  // API / UI states
  const [showSuccess, setShowSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Field-level validation errors
  const [errors, setErrors] = useState({
    username: null,
    password: null,
    phone: null,
  })

  // touched flags: mensajes aparecen si se tocó el campo (blur) o si hubo intento de submit
  const [touched, setTouched] = useState({
    username: false,
    password: false,
    phone: false,
  })
  const [submitAttempt, setSubmitAttempt] = useState(false)

  // Minimal fallback list
  const fallbackCountries = [
    { name: 'Peru', dial: '51' },
    { name: 'Argentina', dial: '54' },
    { name: 'Chile', dial: '56' },
    { name: 'Colombia', dial: '57' },
    { name: 'México', dial: '52' },
    { name: 'España', dial: '34' },
    { name: 'Brasil', dial: '55' },
  ]

  useEffect(() => {
    const fetchCountries = async () => {
      try {
        setLoadingCountries(true)
        const res = await fetch('https://restcountries.com/v2/all')
        const json = await res.json()
        let mapped = Array.isArray(json)
          ? json
              .map(c => {
                const dial = Array.isArray(c.callingCodes) && c.callingCodes[0]
                  ? String(c.callingCodes[0]).replace(/\D/g, '')
                  : ''
                if (!c.name || !dial) return null
                return {
                  label: `${c.name} (+${dial})`,
                  value: `+${dial}`,
                  name: c.name,
                  dial,
                }
              })
              .filter(Boolean)
              .sort((a, b) => a.label.localeCompare(b.label))
          : []

        if (!mapped.length) {
          mapped = fallbackCountries
            .map(c => ({
              label: `${c.name} (+${c.dial})`,
              value: `+${c.dial}`,
              name: c.name,
              dial: c.dial,
            }))
            .sort((a, b) => a.label.localeCompare(b.label))
        }

        setCountries(mapped)
        const defaultCountry =
          mapped.find(c => c.name.toLowerCase().includes('peru')) || mapped[0]
        setSelectedCountry(defaultCountry)
        setWhatsapp(defaultCountry.dial)
      } catch {
        const mapped = fallbackCountries
          .map(c => ({
            label: `${c.name} (+${c.dial})`,
            value: `+${c.dial}`,
            name: c.name,
            dial: c.dial,
          }))
          .sort((a, b) => a.label.localeCompare(b.label))
        setCountries(mapped)
        setSelectedCountry(mapped[0])
        setWhatsapp(mapped[0].dial)
      } finally {
        setLoadingCountries(false)
      }
    }

    fetchCountries()
  }, [])

  // Ajusta esta URL al endpoint real de tu backend
  const apiUrl = `${process.env.NEXT_PUBLIC_API_URL}/api/auth/register`

  // Reglas de validación de cliente (sin mostrar mensajes aquí)
  const validateUsername = value => {
    if (!value || !value.trim()) return 'El usuario es obligatorio'
    if (value.trim().length < 3) return 'El usuario debe tener al menos 3 caracteres'
    return null
  }

  const validatePassword = value => {
    if (!value) return 'La contraseña es obligatoria'
    if (value.length < 8) return 'La contraseña debe tener al menos 8 caracteres'
    return null
  }

  const validatePhone = (phoneRaw, countryDial) => {
    if (!phoneRaw) return 'El número es obligatorio'
    const digits = phoneRaw.replace(/\D/g, '')
    if (digits.length < 6) return 'Número demasiado corto'
    if (digits.length > 20) return 'Número demasiado largo'
    return null
  }

  // Actualizar errores reactivamente (pero no mostrarlos hasta blur o submit)
  useEffect(() => {
    setErrors(prev => ({ ...prev, username: validateUsername(username) }))
  }, [username])

  useEffect(() => {
    setErrors(prev => ({ ...prev, password: validatePassword(password) }))
  }, [password])

  useEffect(() => {
    setErrors(prev => ({ ...prev, phone: validatePhone(whatsapp, selectedCountry?.dial) }))
  }, [whatsapp, selectedCountry])

  // Handlers de blur para marcar touched
  const handleBlur = field => {
    setTouched(prev => ({ ...prev, [field]: true }))
  }

  const handleRegister = async e => {
    e.preventDefault()
    setError(null)
    setSubmitAttempt(true) // fuerza mostrar errores si existen

    const uErr = validateUsername(username)
    const pErr = validatePassword(password)
    const phErr = validatePhone(whatsapp, selectedCountry?.dial)

    setErrors({ username: uErr, password: pErr, phone: phErr })

    if (uErr || pErr || phErr) {
      setError('Corrige los errores del formulario')
      return
    }

    setLoading(true)

    const phone = `+${selectedCountry.dial}${whatsapp.replace(/\D/g, '')}`

    const payload = {
      username: username.trim(),
      password,
      phone,
      role: 'user',
      referrerCode: refCode?.trim() || null,
    }

    try {
      const resp = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!resp.ok) {
        let msg = `Error en el registro (${resp.status})`
        try {
          const json = await resp.json()
          if (json?.message) msg = json.message
          else if (json?.errors) msg = JSON.stringify(json.errors)
        } catch (_) {}
        throw new Error(msg)
      }

      setShowSuccess(true)
      setTimeout(() => router.push('/login'), 2500)
    } catch (err) {
      setError(err.message || 'Error desconocido al registrar')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => router.push('/')
  const handleWhatsAppChange = e => {
    setWhatsapp(e.target.value.replace(/\D/g, ''))
  }

  // Util: mostrar error sólo si existe y si campo fue tocado o hubo intento de submit
  const showFieldError = field => {
    return errors[field] && (touched[field] || submitAttempt)
  }

  return (
    <>
      <Head>
        <title>Registro | Luna Streaming</title>
      </Head>

      <div className="canvas">
        <div className="aurora" />
        <div className="grain" />

        <form className="card" onSubmit={handleRegister} noValidate>
          <button type="button" className="close" onClick={handleClose} aria-label="Cerrar">
            ✕
          </button>

          <h1 className="title">Regístrate</h1>
          <p className="subtitle">Crea tu ritual</p>

          {error && <div style={{ color: '#ffb4b4', textAlign: 'center' }}>{error}</div>}

          <div className="group">
            <div className="icon"><FontAwesomeIcon icon={faUser} /></div>
            <input
              type="text"
              placeholder="Usuario"
              value={username}
              onChange={e => setUsername(e.target.value)}
              onBlur={() => handleBlur('username')}
              required
              aria-invalid={!!errors.username}
              aria-describedby="username-error"
            />
            <span className="underline" />
          </div>
          {showFieldError('username') && (
            <div id="username-error" style={{ color: '#ffb4b4', fontSize: 12, marginTop: -8 }}>
              {errors.username}
            </div>
          )}

          <div className="group">
            <div className="icon"><FontAwesomeIcon icon={faLock} /></div>
            <input
              type="password"
              placeholder="Contraseña"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onBlur={() => handleBlur('password')}
              required
              aria-invalid={!!errors.password}
              aria-describedby="password-error"
            />
            <span className="underline" />
          </div>
          {showFieldError('password') && (
            <div id="password-error" style={{ color: '#ffb4b4', fontSize: 12, marginTop: -8 }}>
              {errors.password}
            </div>
          )}

          <div className="group whatsapp">
            <div className="icon"><FontAwesomeIcon icon={faWhatsapp} /></div>

            <div className="select-country">
              <Select
                options={countries}
                value={selectedCountry}
                onChange={opt => {
                  setSelectedCountry(opt)
                  setWhatsapp(opt.dial)
                }}
                placeholder={loadingCountries ? '...' : 'País'}
                isDisabled={loadingCountries}
                styles={{
                  control: (base) => ({ ...base, backgroundColor: 'transparent', border: 'none', boxShadow: 'none', cursor: 'pointer', minWidth: 112, height: 44 }),
                  singleValue: base => ({ ...base, color: '#F0F0F0', fontSize: '0.88rem' }),
                  menu: base => ({ ...base, backgroundColor: '#131313', borderRadius: 14 }),
                  option: (base, state) => ({ ...base, backgroundColor: state.isFocused ? '#232323' : '#131313', color: '#F0F0F0', fontSize: '0.88rem' }),
                  indicatorsContainer: base => ({ ...base, display: 'none' }),
                  placeholder: base => ({ ...base, color: '#9A9A9A' }),
                }}
              />
            </div>

            <input
              type="tel"
              inputMode="numeric"
              pattern="[0-9]*"
              placeholder="Celular"
              value={whatsapp}
              onChange={handleWhatsAppChange}
              onBlur={() => handleBlur('phone')}
              required
              aria-invalid={!!errors.phone}
              aria-describedby="phone-error"
            />
            <span className="underline" />
          </div>
          {showFieldError('phone') && (
            <div id="phone-error" style={{ color: '#ffb4b4', fontSize: 12, marginTop: -8 }}>
              {errors.phone}
            </div>
          )}

          <div className="group">
            <div className="icon"><FontAwesomeIcon icon={faHashtag} /></div>
            <input
              type="text"
              placeholder="Código de referencia"
              value={refCode}
              onChange={e => setRefCode(e.target.value)}
            />
            <span className="underline" />
          </div>

          <button
            type="submit"
            className="cta"
            disabled={loading}
          >
            {loading ? 'Registrando...' : 'Registrarme'}
          </button>

          <p className="back-login">
            ¿Ya tienes una cuenta?{' '}
            <span className="link" onClick={() => router.push('/login')}>Volver al login</span>
          </p>
        </form>
      </div>

      {showSuccess && (
        <div className="popup" role="dialog" aria-modal="true">
          <div className="popup-content">
            <div className="check">✔</div>
            <h2>Registro exitoso</h2>
            <p>Serás redirigido al login en breve...</p>
            <button className="popup-button" onClick={() => router.push('/login')}>Ir ahora</button>
          </div>
        </div>
      )}

      <style jsx>{`
        .canvas {
          min-height: 100vh;
          background: radial-gradient(
            1200px 600px at 20% 10%,
            #1a1a1a 0%,
            #0e0e0e 60%,
            #0b0b0b 100%
          );
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
          background: conic-gradient(
            from 180deg at 50% 50%,
            #8b5cf6 0%,
            #22d3ee 20%,
            #f472b6 40%,
            transparent 60%
          );
          filter: blur(100px) saturate(1.2);
          opacity: 0.25;
          animation: float 12s ease-in-out infinite alternate;
        }
        @keyframes float {
          from {
            transform: translateY(-10px) translateX(6px) rotate(0.5deg);
          }
          to {
            transform: translateY(10px) translateX(-6px) rotate(-0.5deg);
          }
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
          gap: 14px;
          position: relative;
          animation: rise 0.35s ease forwards;
        }
        @keyframes rise {
          from {
            opacity: 0;
            transform: translateY(10px) scale(0.98);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
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

        .group.whatsapp {
          display: grid;
          grid-template-columns: 112px 1fr;
          align-items: center;
          gap: 8px;
        }
        .select-country {
          background: rgba(30, 30, 30, 0.7);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 14px;
          height: 44px;
          display: flex;
          align-items: center;
          padding: 0 8px;
        }
        .group.whatsapp .icon {
          left: calc(112px + 12px);
        }

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
        .cta:hover {
          filter: brightness(1.05);
          box-shadow: 0 16px 30px rgba(139, 92, 246, 0.22);
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

        .popup {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.65);
          display: grid;
          place-items: center;
          z-index: 999;
          animation: fadeInOverlay 0.2s ease forwards;
          backdrop-filter: blur(2px);
        }
        @keyframes fadeInOverlay {
          from { opacity: 0; } to { opacity: 1; }
        }
        .popup-content {
          background: rgba(20, 20, 20, 0.85);
          border: 1px solid rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(12px);
          border-radius: 18px;
          padding: 24px;
          max-width: 420px;
          width: 92%;
          text-align: center;
          color: #ededed;
          box-shadow: 0 24px 48px rgba(0, 0, 0, 0.45);
          animation: scaleIn 0.25s ease forwards;
        }
        @keyframes scaleIn { from { opacity: 0; transform: scale(0.96); } to { opacity: 1; transform: scale(1); } }
        .check {
          width: 56px;
          height: 56px;
          border-radius: 50%;
          display: grid;
          place-items: center;
          margin: 0 auto 10px;
          background: linear-gradient(135deg, #22d3ee 0%, #8b5cf6 100%);
          color: #0e0e0e;
          font-weight: 900;
          box-shadow: 0 10px 18px rgba(139, 92, 246, 0.25);
        }
        .popup-content h2 { font-size: 1.35rem; margin-bottom: 6px; font-weight: 800; }
        .popup-content p { font-size: 0.98rem; color: #bfbfbf; margin-bottom: 14px; }
        .popup-button {
          padding: 10px 14px;
          background: #f3f3f3;
          color: #0e0e0e;
          border: none;
          border-radius: 12px;
          font-weight: 800;
          cursor: pointer;
          transition: transform 0.08s ease, filter 0.2s ease;
        }
        .popup-button:hover { filter: brightness(0.98); }
        .popup-button:active { transform: translateY(1px); }
      `}</style>
    </>
  )
}