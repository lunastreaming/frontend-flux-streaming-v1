import { useState, useEffect, useMemo } from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'
import Select, { components } from 'react-select'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
// 🚨 CAMBIO: Se añade faExclamationTriangle para el Error Box
import { faUser, faLock, faEye, faEyeSlash, faExclamationTriangle } from '@fortawesome/free-solid-svg-icons'
import { faWhatsapp } from '@fortawesome/free-brands-svg-icons'
import countriesData from '../data/countries.json' // Ajusta la ruta si necesitas

// Helpers para banderas (FlagCDN)
const flagPngUrl = (iso2) => `https://flagcdn.com/w40/${iso2.toLowerCase()}.png`

// Custom option con imagen + fallback emoji
function OptionWithFlag(props) {
  const { data } = props
  const iso = data.value
  const alt = `${data.name} flag`
  return (
    <components.Option {...props}>
      <div 
        style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
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

function SingleValueWithFlag(props) {
  const { data } = props
  const iso = data.value
  return (
    <components.SingleValue {...props}>
      <div 
        style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
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

export default function Register() {
  const router = useRouter()

  // Form fields
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [whatsapp, setWhatsapp] = useState('') // solo dígitos del número (sin prefijo)
  const [refCode, setRefCode] = useState('')

  // Countries & selection
  const [countries, setCountries] = useState([])
  const [selectedCountry, setSelectedCountry] = useState(null)
  const [loadingCountries, setLoadingCountries] = useState(true)

  // API / UI
  const [showSuccess, setShowSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Validation
  const [errors, setErrors] = useState({ username: null, password: null, phone: null })
  const [touched, setTouched] = useState({ username: false, password: false, phone: false })
  const [submitAttempt, setSubmitAttempt] = useState(false)

  useEffect(() => {
    try {
      setLoadingCountries(true)
      const mapped = countriesData
        .map(c => ({
          label: `${c.flag ? c.flag + ' ' : ''}${c.name} (+${c.dial})`,
          value: c.code,           // ISO2 uppercase
          name: c.name,
          dial: String(c.dial).replace(/\D/g, ''), // digits only
          flag: c.flag || null
        }))
        .sort((a, b) => a.name.localeCompare(b.name))
      setCountries(mapped)
      const defaultCountry = mapped.find(c => c.name.toLowerCase().includes('peru')) || mapped[0]
      setSelectedCountry(defaultCountry)
    } finally {
      setLoadingCountries(false)
    }
  }, [])

  const apiUrl = `${process.env.NEXT_PUBLIC_API_URL || ''}/api/auth/register`

  // 🚨 CAMBIO DE VALIDACIÓN: Requiere 6 caracteres
  const validateUsername = value => {
    if (!value || !value.trim()) return 'El usuario es obligatorio'
    if (value.trim().length < 6) return 'El usuario debe tener al menos 6 caracteres' // 🚨 Cambiado de 3 a 6
    return null
  }
  const validatePassword = value => {
    if (!value) return 'La contraseña es obligatoria'
    if (value.length < 8) return 'La contraseña debe tener al menos 8 caracteres'
    return null
  }
  const validatePhone = (phoneRaw) => {
    if (!phoneRaw) return 'El número es obligatorio'
    const digits = phoneRaw.replace(/\D/g, '')
    if (digits.length < 6) return 'Número demasiado corto'
    if (digits.length > 20) return 'Número demasiado largo'
    return null
  }

  // Las validaciones en tiempo real para UX ahora usan la nueva regla de 6
  useEffect(() => { setErrors(prev => ({ ...prev, username: validateUsername(username) })) }, [username])
  useEffect(() => { setErrors(prev => ({ ...prev, password: validatePassword(password) })) }, [password])
  useEffect(() => { setErrors(prev => ({ ...prev, phone: validatePhone(whatsapp) })) }, [whatsapp])

  const handleBlur = field => setTouched(prev => ({ ...prev, [field]: true }))
  const handleWhatsAppChange = e => setWhatsapp(e.target.value.replace(/\D/g, ''))
  const showFieldError = field => errors[field] && (touched[field] || submitAttempt)

  // map backend codes to friendly messages
  const backendMessageMap = {
    username_taken: 'El nombre de usuario ya está en uso',
    phone_taken: 'El número de teléfono ya está registrado',
  }

  const handleRegister = async e => {
    e.preventDefault()
    setError(null)
    setSubmitAttempt(true)

    const uErr = validateUsername(username)
    const pErr = validatePassword(password)
    const phErr = validatePhone(whatsapp)
    setErrors({ username: uErr, password: pErr, phone: phErr })

    // Se mantiene la verificación con la nueva regla
    if (uErr || pErr || phErr) {
      setError('Corrige los errores del formulario')
      return
    }

    if (!selectedCountry) {
      setError('Selecciona tu país')
      return
    }

    setLoading(true)

    // Construimos el número asegurando un único '+' y solo dígitos después
    const localDigits = whatsapp.replace(/\D/g, '')
    const phone = `+${String(selectedCountry.dial).replace(/\D/g, '')}${localDigits}`

    const payload = {
      username: username.trim(),
      password,
      phone,
      role: 'seller',
    }

    try {
      const resp = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!resp.ok) {
        let parsed = null
        try { parsed = await resp.json() } catch (_) { parsed = null }

        if (parsed && parsed.errors && typeof parsed.errors === 'object') {
          const newErr = { username: null, password: null, phone: null }
          for (const k of Object.keys(parsed.errors)) {
            if (k === 'username' || k === 'phone' || k === 'password') {
              newErr[k] = Array.isArray(parsed.errors[k]) ? parsed.errors[k].join(', ') : String(parsed.errors[k])
            }
          }
          setErrors(prev => ({ ...prev, ...newErr }))
          setError(parsed.message || 'Errores de validación')
        } else if (parsed && parsed.message) {
          const key = parsed.message
          if (backendMessageMap[key]) {
            if (key === 'username_taken') {
              setErrors(prev => ({ ...prev, username: backendMessageMap[key] }))
            } else if (key === 'phone_taken') {
              setErrors(prev => ({ ...prev, phone: backendMessageMap[key] }))
            }
            setError(parsed.detail || backendMessageMap[key])
          } else if (parsed.detail) {
            setError(parsed.detail)
          } else {
            setError(parsed.message || `Error en el registro (${resp.status})`)
          }
        } else {
          setError(`Error en el registro (${resp.status})`)
        }

        throw new Error('backend_error')
      }

      setShowSuccess(true)
      setTimeout(() => router.push('/login'), 1600)
    } catch (err) {
      if (err.message !== 'backend_error') {
        setError(err.message || 'Error desconocido al registrar')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => router.push('/')
  
  // Condición para deshabilitar el botón
  const isFormInvalid = errors.username || errors.password || errors.phone || !username || !password || !whatsapp;

  // Select components/styles
  const selectComponents = useMemo(() => ({ Option: OptionWithFlag, SingleValue: SingleValueWithFlag }), [])
  const selectStyles = {
    // Se mantiene la estructura y se eliminan los bordes de react-select
    control: (base) => ({ ...base, backgroundColor: 'transparent', border: 'none', boxShadow: 'none', cursor: 'pointer', minWidth: 140, height: 44 }),
    singleValue: (base) => ({ ...base, color: '#F0F0F0', fontSize: '0.88rem' }),
    menu: (base) => ({ ...base, backgroundColor: '#131313', borderRadius: 14 }),
    option: (base, state) => ({ ...base, backgroundColor: state.isFocused ? '#232323' : '#131313', color: '#F0F0F0', fontSize: '0.88rem' }),
    indicatorsContainer: (base) => ({ ...base, display: 'none' }),
    placeholder: (base) => ({ ...base, color: '#9A9A9A' }),
  }

  return (
    <>
      <Head><title>Registro | Luna Streaming</title></Head>

      <div className="canvas">
        <form className="card" onSubmit={handleRegister} noValidate>
          <button type="button" className="close" onClick={handleClose} aria-label="Cerrar">✕</button>

          <h1 className="title">Regístrate</h1>
          <p className="subtitle">Regístrate a Luna</p>

          {/* 🚨 NUEVO: Error Box para errores generales/servidor */}
          {error && (
            <div className="error-box" role="alert">
                <FontAwesomeIcon icon={faExclamationTriangle} className="error-icon" />
                <p className="error-text">{error}</p>
            </div>
          )}

          {/* CAMPO USUARIO */}
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
          {showFieldError('username') && <div id="username-error" className="field-error">{errors.username}</div>}

          {/* Password con ojito */}
          <div className="group password-group">
            <div className="icon"><FontAwesomeIcon icon={faLock} /></div>
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Contraseña"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onBlur={() => handleBlur('password')}
              required
              aria-invalid={!!errors.password}
              aria-describedby="password-error"
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
          {showFieldError('password') && <div id="password-error" className="field-error">{errors.password}</div>}

          {/* Whatsapp group: Select (country) + input (cell) with whatsapp icon inside the input */}
          <div className="group whatsapp">
            {/* select-country column */}
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

            {/* input column */}
            <div className="cell-input-wrapper">
              {/* icon positioned inside input */}
              <div className="input-icon" aria-hidden="true">
                <FontAwesomeIcon icon={faWhatsapp} />
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
            </div>

            <span className="underline" />
          </div>
          {showFieldError('phone') && <div id="phone-error" className="field-error">{errors.phone}</div>}

          <button 
            type="submit" 
            className="cta" 
            // 🚨 CAMBIO: Se deshabilita si está cargando O si el formulario es inválido
            disabled={loading || isFormInvalid}
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
        /* --- ESTILOS MEJORADOS --- */
        .canvas {
          min-height: 100vh;
          background: radial-gradient(1200px 600px at 20% 10%, #1a1a1a 0%, #0e0e0e 60%, #0b0b0b 100%);
          position: relative;
          display: grid;
          place-items: center;
          overflow: hidden;
          padding: 40px 12px;
        }
        .card {
          width: 92%;
          max-width: 520px;
          background: rgba(22,22,22,0.6);
          border: 1px solid rgba(255,255,255,0.08);
          backdrop-filter: blur(16px);
          border-radius: 20px;
          padding: 28px;
          box-shadow: 0 30px 60px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.06);
          display: flex;
          flex-direction: column;
          gap: 12px; /* Ajustado a 12px */
          position: relative;
          /* 🚨 NUEVO: Animación de subida al cargar */
          animation: rise 0.35s ease forwards;
        }
        @keyframes rise { 
          from { opacity: 0; transform: translateY(10px) scale(0.98); } 
          to { opacity: 1; transform: translateY(0) scale(1); } 
        }

        .close {
          position: absolute; top: 12px; right: 12px;
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.12);
          color: #cfcfcf;
          width: 36px; height: 36px;
          border-radius: 10px;
          display: grid; place-items: center;
          cursor: pointer;
          transition: background 0.1s ease;
        }
        .close:hover { background: rgba(255,255,255,0.1); }
        .title { color: #f3f3f3; font-size: 1.9rem; text-align: center; font-weight: 800; }
        .subtitle { color: #afafaf; font-size: 0.98rem; text-align: center; margin-bottom: 6px; }
        
        /* 🚨 NUEVO: Error Box para errores generales/servidor */
        .error-box {
            display: flex; 
            align-items: center;
            gap: 10px;
            background: rgba(255, 92, 92, 0.08);
            border: 1px solid rgba(255, 92, 92, 0.2);
            border-radius: 12px;
            padding: 12px 16px;
            animation: fadeInError 0.3s ease forwards;
            margin-bottom: 4px; /* Ajustado */
        }
        .error-icon { color: #ff5c5c; font-size: 1.2rem; }
        .error-text { color: #ffb4b4; font-size: 0.95rem; font-weight: 500; margin: 0; }
        @keyframes fadeInError {
            from { opacity: 0; transform: translateY(-5px); }
            to { opacity: 1; transform: translateY(0); }
        }

        /* Grupos de Inputs */
        .group {
          position: relative;
          display: flex;
          align-items: center;
          background: rgba(30,30,30,0.7);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 14px;
          padding: 8px 10px;
          /* 🚨 MEJORA: Transición para el foco */
          transition: border-color 0.2s ease, background 0.2s ease;
        }
        /* 🚨 MEJORA: Estilo de Foco para el grupo */
        .group:focus-within { 
            border-color: #8b5cf6; 
            background: rgba(30, 30, 30, 0.85);
        }
        .icon { 
            position: absolute; left: 12px; display:flex; align-items:center; color:#cfcfcf; font-size:1rem;
            /* 🚨 MEJORA: Transición para el ícono */
            transition: color 0.2s ease; 
        }
        /* 🚨 MEJORA: Ícono cambia de color en foco */
        .group:focus-within .icon { 
            color: #8b5cf6;
        }
        .group input {
          width: 100%;
          padding: 12px 14px 12px 44px;
          background: transparent;
          border: none;
          border-radius: 10px;
          color: #f5f5f5;
          font-size: 1rem;
          outline: none;
        }
        .group input::placeholder { 
            color: #8e8e8e;
            /* 🚨 MEJORA: Transición para el placeholder */
            transition: color 0.2s ease;
        }
        /* 🚨 MEJORA: Placeholder se aclara en foco */
        .group:focus-within input::placeholder {
            color: #cfcfcf; 
        }
        .underline {
          position: absolute;
          bottom: 6px; left: 44px; right: 10px;
          height: 2px;
          background: linear-gradient(90deg, transparent, rgba(139,92,246,0.8), transparent);
          border-radius:2px; opacity:0; transform:scaleX(0.8);
          transition:opacity .2s, transform .2s;
        }
        .group:focus-within .underline { opacity:1; transform:scaleX(1); }

        /* 👁️ Password: espacio y botón ojito */
        .group.password-group { padding-right: 44px; }
        .eye-btn {
          position: absolute; right: 10px; background: transparent; border: none; color: #cfcfcf;
          width: 32px; height: 32px; display: grid; place-items: center; cursor: pointer; border-radius: 8px;
          transition: background 0.12s ease, color 0.12s ease;
        }
        .eye-btn:hover { background: rgba(255,255,255,0.04); color: #fff; }

        /* --- Whatsapp specific layout --- */
        .group.whatsapp {
          display: grid;
          grid-template-columns: 140px 1fr;
          gap: 8px;
          align-items: center;
          padding: 0; /* Quitamos padding del grupo para el select y el input */
        }
        .select-country {
          background: rgba(30,30,30,0.7);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 14px;
          height: 44px;
          display: flex;
          align-items: center;
          padding: 0 8px;
          /* 🚨 MEJORA: Transición para el foco del select */
          transition: border-color 0.2s ease, background 0.2s ease;
        }
        /* 🚨 MEJORA: Estilo de Foco para el select */
        .group.whatsapp:focus-within .select-country {
            border-color: #8b5cf6; 
            background: rgba(30, 30, 30, 0.85);
        }

        /* wrapper around the input to position icon inside the input */
        .cell-input-wrapper {
          position: relative; 
          display: block; 
          height: 44px; 
          /* 🚨 MEJORA: Se mueve el background/border aquí para tener foco individual */
          background: rgba(30,30,30,0.7);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 14px;
          transition: border-color 0.2s ease, background 0.2s ease;
        }
        .group.whatsapp:focus-within .cell-input-wrapper {
             border-color: #8b5cf6; 
             background: rgba(30, 30, 30, 0.85);
        }

        .cell-input-wrapper input {
          /* 🚨 FIX: Ajuste de padding-left para alinear texto con ícono */
          padding: 0 14px 0 38px;
          width: 100%; height: 44px;
          border-radius: 10px;
          border: none; background: transparent; color: #f5f5f5;
          outline: none; font-size: 1rem;
        }
        .input-icon {
          position: absolute; 
          left: 11px; /* Posición horizontal ajustada */
          top: 50%; 
          transform: translateY(-50%);
          color: #25D366; /* whatsapp green */
          font-size: 16px; /* Tamaño ajustado para alineación vertical */
          display: flex; 
          align-items: center; 
          justify-content: center; 
          pointer-events: none;
        }

        /* 🚨 MEJORA: Estilo para errores en campos (Mensaje amigable) */
        .field-error { 
            color: #ff5c5c; /* Color más fuerte para error */
            font-size: 0.85rem;
            margin: -6px 0 4px 10px; 
            font-weight: 500;
            animation: fadeInField 0.2s ease forwards;
        }
        @keyframes fadeInField {
            from { opacity: 0; transform: translateY(-2px); }
            to { opacity: 1; transform: translateY(0); }
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
          transition: filter 0.2s ease, box-shadow 0.2s ease, opacity 0.3s ease, transform 0.1s ease;
          margin-top: 10px;
        }
        .cta:hover { filter: brightness(1.05); box-shadow: 0 16px 30px rgba(139, 92, 246, 0.22); }
        .cta:active { 
            transform: translateY(1px); /* Efecto "presionado" */
            filter: brightness(0.95); 
            box-shadow: 0 8px 16px rgba(139, 92, 246, 0.15);
        }
        .cta:disabled { 
            opacity: 0.6; 
            cursor: not-allowed; 
            filter: none;
            box-shadow: none;
            transform: none;
        }

        .back-login { text-align: center; font-size: 0.95rem; color: #afafaf; margin-top: 8px; }
        .link { color: #f3f3f3; font-weight: 600; cursor: pointer; text-decoration: underline; }

        /* Estilos de Popup */
        .popup { position: fixed; inset: 0; background: rgba(0,0,0,0.65); display:grid; place-items:center; z-index:999; }
        .popup-content { background: rgba(20,20,20,0.85); border-radius:18px; padding:24px; text-align:center; color:#ededed; box-shadow: 0 24px 48px rgba(0,0,0,0.45); }
        .check { width:56px; height:56px; border-radius:50%; display:grid; place-items:center; margin:0 auto 10px; background: linear-gradient(135deg,#22d3ee 0%,#8b5cf6 100%); color:#0e0e0e; font-weight:900; box-shadow: 0 10px 18px rgba(139, 92, 246, 0.25); }
        .popup-button { padding:10px 14px; background:linear-gradient(135deg,#8b5cf6 0%,#22d3ee 100%); color:#0e0e0e; border:none; border-radius:12px; font-weight:800; cursor:pointer; transition: transform 0.08s ease, filter 0.2s ease; }
        .popup-button:hover { filter: brightness(1.05); }
        .popup-button:active { transform: translateY(1px); }

        /* Media Queries */
        @media (max-width: 640px) {
          .group.whatsapp { grid-template-columns: 112px 1fr; }
          .select-country { min-width: 112px; }
          /* Ajustes en media query para móvil */
          .input-icon { left: 10px; font-size: 16px; } 
          .cell-input-wrapper input { padding-left: 36px; } 
        }
      `}</style>
    </>
  )
}