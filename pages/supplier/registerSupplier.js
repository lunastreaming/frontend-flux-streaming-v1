// pages/supplier/registerSupplier.js
import { useState, useEffect, useMemo } from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'
import Select, { components } from 'react-select'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faUser, faLock, faEye, faEyeSlash, faExclamationTriangle } from '@fortawesome/free-solid-svg-icons'
import { faWhatsapp } from '@fortawesome/free-brands-svg-icons'
import countriesData from '../../data/countries.json' // Ruta exacta para la subcarpeta supplier 🔍

// Flag helper (FlagCDN)
const flagPngUrl = (iso2) => `https://flagcdn.com/w40/${iso2.toLowerCase()}.png`

// Componente para la opción de Select con Bandera (manteniendo la estructura original)
function OptionWithFlag(props) {
  const { data } = props
  const iso = data.value
  const alt = `${data.name} flag`
  return (
    <components.Option {...props}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <img
          src={flagPngUrl(iso)}
          alt={alt}
          onError={(e) => {
            e.currentTarget.style.display = 'none'
            const parent = e.currentTarget.parentElement
            if (parent && data.flag) {
              const el = document.createElement('span')
              el.textContent = data.flag
              el.style.fontSize = '14px'
              parent.insertBefore(el, e.currentTarget)
            }
          }}
          style={{ width: 28, height: 18, objectFit: 'cover', borderRadius: 2 }}
        />
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 14, color: '#EEE' }}>{data.name}</div>
          <div style={{ fontSize: 12, color: '#9A9A9A' }}>{`+${data.dial}`}</div>
        </div>
      </div>
    </components.Option>
  )
}

// Componente para el valor seleccionado en Select con Bandera
function SingleValueWithFlag(props) {
  const { data } = props
  const iso = data.value
  return (
    <components.SingleValue {...props}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <img
          src={flagPngUrl(iso)}
          alt={`${data.name} flag`}
          onError={(e) => { e.currentTarget.style.display = 'none' }}
          style={{ width: 20, height: 14, objectFit: 'cover', borderRadius: 2 }}
        />
        <span style={{ color: '#F0F0F0' }}>{data.name} (+{data.dial})</span>
      </div>
    </components.SingleValue>
  )
}

export default function RegisterSupplier() {
  const router = useRouter()

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [phone, setPhone] = useState('')
  
  // Estados de control para el paso OTP
  const [step, setStep] = useState(1) 
  const [otpCode, setOtpCode] = useState('')
  const [countdown, setCountdown] = useState(0)
  const [loadingOtp, setLoadingOtp] = useState(false)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  const [countries, setCountries] = useState([])
  const [selectedCountry, setSelectedCountry] = useState(null)
  const [loadingCountries, setLoadingCountries] = useState(true)

  const [usernameError, setUsernameError] = useState(null)
  const [touched, setTouched] = useState({ username: false, password: false, phone: false })
  const handleBlur = field => setTouched(prev => ({ ...prev, [field]: true }))

  useEffect(() => {
    let timer
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000)
    }
    return () => clearTimeout(timer)
  }, [countdown])

  // VALIDACIÓN EN TIEMPO REAL: Usuario (mínimo 6 caracteres)
  useEffect(() => {
    if (username.length > 0 && username.length < 6) {
        setUsernameError('El usuario debe tener al menos 6 caracteres.')
    } else {
        setUsernameError(null)
    }
  }, [username])

  useEffect(() => {
    try {
      setLoadingCountries(true)
      const mapped = countriesData
        .map(c => ({
          label: `${c.flag ? c.flag + ' ' : ''}${c.name} (+${c.dial})`,
          value: c.code,
          name: c.name,
          dial: String(c.dial).replace(/\D/g, ''),
          flag: c.flag || null
        }))
        .sort((a, b) => a.name.localeCompare(b.name))
      setCountries(mapped)
      const defaultCountry = mapped.find(c => c.name.toLowerCase().includes('peru')) || mapped[0]
      setSelectedCountry(defaultCountry)
      setPhone('')
    } finally {
      setLoadingCountries(false)
    }
  }, [])

  const otpSolicitarUrl = `${process.env.NEXT_PUBLIC_API_URL || ''}/api/auth/otp/solicitar`
  const registerUrl = `${process.env.NEXT_PUBLIC_API_URL || ''}/api/auth/register`

  const handleRequestOtp = async (e) => {
    if (e) e.preventDefault()
    setError(null)
    
    if (username.length < 6) {
        setError('El usuario debe tener al menos 6 caracteres.')
        setUsernameError('El usuario debe tener al menos 6 caracteres.')
        return
    }

    if (!username || !password || !phone || !selectedCountry) {
      setError('Todos los campos son obligatorios')
      return
    }

    setLoadingOtp(true)
    const localDigits = phone.replace(/\D/g, '')
    const fullPhone = `${String(selectedCountry.dial).replace(/\D/g, '')}${localDigits}`

    try {
      const res = await fetch(otpSolicitarUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          telefono: fullPhone, 
          contexto: 'REGISTER_PROVIDER' 
        }),
      })

      const data = await res.json().catch(() => null)

      if (!res.ok) {
        throw new Error(data?.error || data?.message || 'No se pudo enviar el código OTP.')
      }

      setStep(2)
      setCountdown(60)
    } catch (err) {
      setError(err.message || 'Error al solicitar el código de verificación')
    } finally {
      setLoadingOtp(false)
    }
  }

  const handleRegisterFinal = async (e) => {
    e.preventDefault()
    setError(null)

    if (!otpCode || otpCode.length < 6) {
      setError('Por favor, ingresa el código de verificación completo.')
      return
    }

    setLoading(true)
    const localDigits = phone.replace(/\D/g, '')
    const fullPhone = `+${String(selectedCountry.dial).replace(/\D/g, '')}${localDigits}`

    const payload = {
      username: username.trim(),
      password,
      phone: fullPhone,
      role: 'provider',
      otpCode: otpCode.trim() 
    }

    try {
      const res = await fetch(registerUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        let msg = `Error ${res.status}`
        try {
          const json = await res.json()
          if (json?.message === 'phone_taken') {
            msg = 'El número de teléfono ya está registrado'
          } else if (json?.message === 'username_taken') {
            msg = 'El nombre de usuario ya está en uso'
          } else if (json?.detail) {
            msg = json.detail
          } else if (json?.message) {
            msg = json.message
          }
        } catch (_) {}
        throw new Error(msg)
      }

      setSuccess(true)
      setTimeout(() => router.push('/supplier/loginSupplier'), 1800)
    } catch (err) {
      setError(err.message || 'Error al completar el registro')
    } finally {
      setLoading(false)
    }
  }

  const selectComponents = useMemo(() => ({ Option: OptionWithFlag, SingleValue: SingleValueWithFlag }), [])
  
  const selectStyles = {
    control: (base) => ({ 
        ...base, 
        backgroundColor: 'transparent', 
        border: 'none', 
        boxShadow: 'none', 
        cursor: 'pointer', 
        minWidth: 140, 
        height: 44,
    }),
    singleValue: (base) => ({ ...base, color: '#F0F0F0', fontSize: '0.88rem' }),
    menu: (base) => ({ ...base, backgroundColor: '#131313', borderRadius: 14, zIndex: 10 }),
    option: (base, state) => ({ 
        ...base, 
        backgroundColor: state.isFocused ? '#232323' : '#131313', 
        color: '#F0F0F0', 
        fontSize: '0.88rem' 
    }),
    indicatorsContainer: (base) => ({ ...base, display: 'none' }),
    placeholder: (base) => ({ ...base, color: '#9A9A9A' }),
  }

  return (
    <>
      <Head><title>Registro Proveedor | Flux Streaming</title></Head>
      <div className="canvas">
        
        {step === 1 && (
          <form className="card" onSubmit={handleRequestOtp}>
            <h1 className="title">Registro Proveedor</h1>
            <p className="subtitle">Crea tu cuenta de proveedor</p>

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
                onChange={e => setUsername(e.target.value.replace(/\s/g, ''))}
                onBlur={() => handleBlur('username')}
                required
              />
              <span className="underline" />
            </div>
            {usernameError && <p className="field-error">{usernameError}</p>}

            <div className="group password-group">
              <div className="icon"><FontAwesomeIcon icon={faLock} /></div>
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Contraseña"
                value={password}
                onChange={e => setPassword(e.target.value)}
                onBlur={() => handleBlur('password')}
                required
              />
              <button
                type="button"
                className="eye-btn"
                onClick={() => setShowPassword(s => !s)}
              >
                <FontAwesomeIcon icon={showPassword ? faEyeSlash : faEye} />
              </button>
              <span className="underline" />
            </div>

            <div className="group whatsapp">
              <div className="select-country">
                <Select
                  options={countries}
                  value={selectedCountry}
                  onChange={opt => setSelectedCountry(opt)}
                  placeholder={loadingCountries ? '...' : 'País'}
                  isDisabled={loadingCountries}
                  components={selectComponents}
                  styles={selectStyles}
                />
              </div>

              <div className="cell-input-wrapper">
                <div className="input-icon">
                  <FontAwesomeIcon icon={faWhatsapp} />
                </div>
                <input
                  type="tel"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  placeholder="Celular"
                  value={phone}
                  onChange={e => setPhone(e.target.value.replace(/\D/g, ''))}
                  onBlur={() => handleBlur('phone')}
                  required
                />
              </div>
              <span className="underline" />
            </div>

            <button 
              type="submit" 
              className="cta" 
              disabled={loadingOtp || !!usernameError || !username || !password || !phone}
            >
              {loadingOtp ? 'Enviando código...' : 'Siguiente (Validar Celular)'}
            </button>

            <p className="back-login">
              ¿Ya tienes cuenta?{' '}
              <span className="link" onClick={() => router.push('/supplier/loginSupplier')}>Ir al login</span>
            </p>
          </form>
        )}

        {step === 2 && (
          <form className="card" onSubmit={handleRegisterFinal}>
            <h1 className="title">Verificación de Celular</h1>
            <p className="subtitle">Ingresa el código de 6 dígitos enviado a tu WhatsApp</p>

            {error && (
              <div className="error-box" role="alert">
                  <FontAwesomeIcon icon={faExclamationTriangle} className="error-icon" />
                  <p className="error-text">{error}</p>
              </div>
            )}

            <div className="group">
              <div className="icon"><FontAwesomeIcon icon={faLock} /></div>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                placeholder="Código OTP (Ej: 123456)"
                value={otpCode}
                onChange={e => setOtpCode(e.target.value.replace(/\D/g, ''))}
                required
                style={{ paddingLeft: '44px' }}
              />
              <span className="underline" />
            </div>

            <button 
              type="submit" 
              className="cta" 
              disabled={loading || otpCode.length < 6}
            >
              {loading ? 'Registrando...' : 'Confirmar y Registrarme'}
            </button>

            <div className="otp-actions" style={{ marginTop: '10px', textAlign: 'center', fontSize: '0.9rem' }}>
              {countdown > 0 ? (
                <p style={{ color: '#afafaf' }}>Reenviar código en <span style={{ color: '#8b5cf6', fontWeight: 'bold' }}>{countdown}s</span></p>
              ) : (
                <button 
                  type="button" 
                  onClick={() => handleRequestOtp(null)} 
                  style={{ background: 'transparent', border: 'none', color: '#22d3ee', cursor: 'pointer', fontWeight: '600', textDecoration: 'underline' }}
                >
                  Reenviar código por WhatsApp
                </button>
              )}
              <p style={{ marginTop: '15px' }}>
                <span className="link" onClick={() => { setStep(1); setError(null); }} style={{ color: '#cfcfcf', fontSize: '0.85rem' }}>
                  ← Modificar datos ingresados
                </span>
              </p>
            </div>
          </form>
        )}

      </div>

      {success && (
        <div className="popup" role="dialog" aria-modal="true">
          <div className="popup-content">
            <div className="check">✔</div>
            <h2>Registro exitoso</h2>
            <p>Redirigiendo al login...</p>
            <button className="popup-button" onClick={() => router.push('/supplier/loginSupplier')}>Ir ahora</button>
          </div>
        </div>
      )}

<style jsx>{`
        /* 1. EL CONTENEDOR: Mantiene el formulario perfectamente centrado */
        .canvas {
          min-height: 100vh;
          background: transparent; /* 👈 Esto permite que se vea tu fondo global */
          position: relative;
          display: grid;
          place-items: center; /* 👈 Esto es lo que evita que se vaya a la esquina izquierda */
          overflow: hidden;
          padding: 40px 12px;
          z-index: 1;
        }
        
        /* 2. CÍRCULOS DECORATIVOS: Opcionales. Si se ve negro, es porque estos círculos 
           son muy grandes. Los hacemos más sutiles o puedes borrarlos si prefieres */
        .canvas::before {
          content: "";
          position: absolute;
          width: 440px;
          height: 440px;
          background: radial-gradient(circle, rgba(139,92,246,0.05) 0%, transparent 70%);
          top: -10%;
          left: -10%;
          z-index: -1;
        }
        .canvas::after {
          content: "";
          position: absolute;
          width: 500px;
          height: 500px;
          background: radial-gradient(circle, rgba(34,211,238,0.03) 0%, transparent 70%);
          bottom: -15%;
          right: -10%;
          z-index: -1;
        }

        /* 3. LA TARJETA DEL FORMULARIO: Tu diseño original intacto */
        .card {
          width: 92%;
          max-width: 520px;
          background: rgba(22,22,22,0.6); /* 👈 Fondo semitransparente para que se fusione con tu fondo global */
          border: 1px solid rgba(255,255,255,0.08);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border-radius: 20px;
          padding: 28px;
          box-shadow: 0 30px 60px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.06);
          display: flex;
          flex-direction: column;
          gap: 12px;
          position: relative;
          z-index: 2;
          animation: rise 0.35s ease forwards;
        }
        
        @keyframes rise { 
          from { opacity: 0; transform: translateY(10px) scale(0.98); } 
          to { opacity: 1; transform: translateY(0) scale(1); } 
        }

        .title { color: #f3f3f3; font-size: 1.9rem; text-align: center; font-weight: 800; letter-spacing: -0.5px; margin: 0; }
        .subtitle { color: #afafaf; font-size: 0.98rem; text-align: center; margin-bottom: 6px; margin-top: 0; }
        
        .error-box {
            display: flex;
            align-items: center;
            gap: 10px;
            background: rgba(255, 92, 92, 0.08);
            border: 1px solid rgba(255, 92, 92, 0.2);
            border-radius: 12px;
            padding: 12px 16px;
            animation: fadeInError 0.3s ease forwards;
            margin-bottom: 10px;
        }
        @keyframes fadeInError { from { opacity: 0; transform: scale(0.98); } to { opacity: 1; transform: scale(1); } }
        .error-icon { color: #ff5c5c; font-size: 1.2rem; flex-shrink: 0; }
        .error-text { color: #ffb4b4; font-size: 0.95rem; font-weight: 500; margin: 0; line-height: 1.4; }
        
        .field-error {
            color: #ff5c5c;
            font-size: 0.85rem;
            margin: -6px 0 4px 10px; 
            font-weight: 500;
            animation: fadeInField 0.2s ease forwards;
        }
        @keyframes fadeInField { from { opacity: 0; transform: translateY(-2px); } to { opacity: 1; transform: translateY(0); } }

        .group { position: relative; display: flex; align-items: center; background: rgba(30,30,30,0.7); border: 1px solid rgba(255,255,255,0.08); border-radius: 14px; padding: 8px 10px; transition: border-color 0.2s ease, background 0.2s ease; }
        .group:focus-within { border-color: #8b5cf6; background: rgba(30, 30, 30, 0.85); }
        
        .icon { position: absolute; left: 16px; display: flex; align-items: center; color: #cfcfcf; font-size: 1rem; transition: color 0.2s ease; pointer-events: none; }
        .group:focus-within .icon { color: #8b5cf6; }
        
        .group input { width: 100%; padding: 12px 14px 12px 44px; background: transparent; border: none; border-radius: 10px; color: #f5f5f5; font-size: 1rem; outline: none; font-weight: 400; }
        .group input::placeholder { color: #8e8e8e; transition: color 0.2s ease; }
        .group:focus-within input::placeholder { color: #cfcfcf; }
        
        .underline { position: absolute; bottom: 6px; left: 44px; right: 10px; height: 2px; background: linear-gradient(90deg, transparent, rgba(139,92,246,0.8), transparent); border-radius: 2px; opacity: 0; transform: scaleX(0.8); transition: opacity .2s, transform .2s; pointer-events: none; }
        .group:focus-within .underline { opacity: 1; transform: scaleX(1); }
        
        .group.password-group { padding-right: 44px; }
        .eye-btn { position: absolute; right: 10px; background: transparent; border: none; color: #cfcfcf; width: 32px; height: 32px; display: grid; place-items: center; cursor: pointer; border-radius: 8px; transition: background 0.12s ease, color 0.12s ease; outline: none; }
        .eye-btn:hover { background: rgba(255,255,255,0.04); color: #fff; }
        
        .group.whatsapp { display: grid; grid-template-columns: 140px 1fr; gap: 8px; align-items: center; padding: 0; border: none; background: transparent; }
        .group.whatsapp:focus-within { border-color: transparent; background: transparent; }
        
        .select-country { background: rgba(30,30,30,0.7); border: 1px solid rgba(255,255,255,0.08); border-radius: 14px; height: 44px; display: flex; align-items: center; padding: 0 8px; transition: border-color 0.2s ease, background 0.2s ease; }
        .group.whatsapp:focus-within .select-country { border-color: #8b5cf6; background: rgba(30, 30, 30, 0.85); }
        
        .cell-input-wrapper { position: relative; display: block; height: 44px; background: rgba(30,30,30,0.7); border: 1px solid rgba(255,255,255,0.08); border-radius: 14px; transition: border-color 0.2s ease, background 0.2s ease; }
        .group.whatsapp:focus-within .cell-input-wrapper { border-color: #8b5cf6; background: rgba(30, 30, 30, 0.85); }
        .cell-input-wrapper input { padding: 0 14px 0 38px; width: 100%; height: 44px; border-radius: 10px; border: none; background: transparent; color: #f5f5f5; outline: none; }
        
        .input-icon { position: absolute; left: 14px; top: 50%; transform: translateY(-50%); color: #25d366; font-size: 1.1rem; z-index: 2; pointer-events: none; }

        .cta { margin-top: 8px; width: 100%; height: 48px; background: linear-gradient(135deg, #8b5cf6 0%, #22d3ee 100%); border: none; border-radius: 14px; color: #0e0e0e; font-size: 1rem; font-weight: 700; cursor: pointer; transition: opacity 0.2s ease, transform 0.1s ease; box-shadow: 0 10px 20px rgba(34, 211, 238, 0.15); outline: none; }
        .cta:hover:not(:disabled) { opacity: 0.95; transform: translateY(-1px); }
        .cta:active:not(:disabled) { transform: translateY(0); }
        .cta:disabled { background: #2a2a2a; color: #666; border: 1px solid rgba(255,255,255,0.03); cursor: not-allowed; box-shadow: none; transform: none; opacity: 1; }
        
        .back-login { text-align: center; font-size: 0.95rem; color: #afafaf; margin-top: 8px; margin-bottom: 0; }
        .link { color: #f3f3f3; font-weight: 600; cursor: pointer; text-decoration: underline; transition: color 0.15s ease; }
        .link:hover { color: #22d3ee; }

        .popup { position: fixed; inset: 0; background: rgba(0,0,0,0.65); display: grid; place-items: center; z-index: 999; backdrop-filter: blur(4px); }
        .popup-content { background: rgba(20,20,20,0.85); border: 1px solid rgba(255,255,255,0.08); border-radius: 18px; padding: 28px; text-align: center; color: #ededed; box-shadow: 0 24px 48px rgba(0,0,0,0.45); max-width: 340px; width: 85%; }
        .check { width: 56px; height: 56px; border-radius: 50%; display: grid; place-items: center; margin: 0 auto 14px; background: linear-gradient(135deg, #22d3ee 0%, #8b5cf6 100%); color: #0e0e0e; font-weight: 900; font-size: 1.4rem; box-shadow: 0 10px 18px rgba(139, 92, 246, 0.25); }
        .popup h2 { margin: 0 0 6px 0; color: #fff; font-size: 1.4rem; font-weight: 700; }
        .popup p { margin: 0; color: #aaa; font-size: 0.95rem; }
        .popup-button { padding: 10px 20px; background: linear-gradient(135deg, #8b5cf6 0%, #22d3ee 100%); color: #0e0e0e; border: none; border-radius: 10px; font-weight: 700; cursor: pointer; margin-top: 18px; font-size: 0.92rem; transition: opacity 0.15s ease; }
        .popup-button:hover { opacity: 0.9; }
      `}</style>
    </>
  )
}