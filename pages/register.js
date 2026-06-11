import { useState, useEffect, useMemo } from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'
import Select, { components } from 'react-select'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faUser, faLock, faEye, faEyeSlash, faExclamationTriangle, faCheckCircle, faShieldAlt } from '@fortawesome/free-solid-svg-icons'
import { faWhatsapp } from '@fortawesome/free-brands-svg-icons'
import countriesData from '../data/countries.json'

const flagPngUrl = (iso2) => `https://flagcdn.com/w40/${iso2.toLowerCase()}.png`

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

export default function Register() {
  const router = useRouter()

  // Form fields
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [whatsapp, setWhatsapp] = useState('')
  
  // 🚨 NUEVOS ESTADOS PARA OTP
  const [step, setStep] = useState(1) // Paso 1: Datos, Paso 2: Validación OTP
  const [otpCode, setOtpCode] = useState('')
  const [countdown, setCountdown] = useState(0) // Control de 60 segundos para reenvío

  // Countries & selection
  const [countries, setCountries] = useState([])
  const [selectedCountry, setSelectedCountry] = useState(null)
  const [loadingCountries, setLoadingCountries] = useState(true)

  // API / UI
  const [showSuccess, setShowSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Validation
  const [errors, setErrors] = useState({ username: null, password: null, phone: null, otp: null })
  const [touched, setTouched] = useState({ username: false, password: false, phone: false, otp: false })
  const [submitAttempt, setSubmitAttempt] = useState(false)

  // Configuración de URLs del backend de Spring Boot
  const BASE_API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
  const REQUEST_OTP_URL = `${BASE_API_URL}/api/auth/otp/solicitar`;
  const VERIFY_OTP_URL = `${BASE_API_URL}/api/auth/otp/verificar`;
  const REGISTER_FINAL_URL = `${BASE_API_URL}/api/auth/register`; // Tu endpoint actual de guardado

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
    } finally {
      setLoadingCountries(false)
    }
  }, [])

  // 🚨 MANEJO REACTIVO DEL TEMPORIZADOR (60 SEGUNDOS)
  useEffect(() => {
    let timer;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  // Validaciones de negocio sincronizadas
  const validateUsername = value => {
    if (!value || !value.trim()) return 'El usuario es obligatorio'
    if (value.trim().length < 6) return 'El usuario debe tener al menos 6 caracteres'
    const usernameRegex = /^[a-zA-Z0-9]+$/
    if (!usernameRegex.test(value)) return 'El usuario solo puede contener letras y números'
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
  const validateOtp = value => {
    if (!value) return 'El código OTP es obligatorio'
    if (value.length !== 6) return 'El código debe tener exactamente 6 dígitos'
    return null
  }

  useEffect(() => { setErrors(prev => ({ ...prev, username: validateUsername(username) })) }, [username])
  useEffect(() => { setErrors(prev => ({ ...prev, password: validatePassword(password) })) }, [password])
  useEffect(() => { setErrors(prev => ({ ...prev, phone: validatePhone(whatsapp) })) }, [whatsapp])
  useEffect(() => { setErrors(prev => ({ ...prev, otp: validateOtp(otpCode) })) }, [otpCode])

  const handleBlur = field => setTouched(prev => ({ ...prev, [field]: true }))
  const handleWhatsAppChange = e => setWhatsapp(e.target.value.replace(/\D/g, ''))
  const handleOtpChange = e => setOtpCode(e.target.value.replace(/\D/g, '').substring(0, 6))
  const showFieldError = field => errors[field] && (touched[field] || submitAttempt)

  // Formateador internacional estricto compatible con Spring Boot/Baileys
  const getFormattedPhone = () => {
    if (!selectedCountry) return '';
    const dialDigits = String(selectedCountry.dial).replace(/\D/g, '');
    const localDigits = whatsapp.replace(/\D/g, '');
    return `${dialDigits}${localDigits}`; // Retorna formato puro: e.g., 51999888777
  }

  // 🚨 PASO 1: SOLICITAR OTP VÍA SPRING BOOT
  const handleRequestOtp = async (e) => {
    if (e) e.preventDefault();
    setError(null);
    setSubmitAttempt(true);

    const uErr = validateUsername(username);
    const pErr = validatePassword(password);
    const phErr = validatePhone(whatsapp);

    if (uErr || pErr || phErr) {
      setError('Corrige los errores del formulario antes de continuar');
      return;
    }

    setLoading(true);
    const fullPhone = getFormattedPhone();

    try {
      const response = await fetch(REQUEST_OTP_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
  telefono: fullPhone, 
  contexto: 'REGISTER_SELLER' 
})
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al solicitar el código de verificación.');
      }

      // Iniciar el cooldown de reenvío de 60 segundos y avanzar el paso
      setCountdown(60);
      setStep(2);
      setSubmitAttempt(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // 🚨 PASO 2: VERIFICAR OTP Y COMPLETAR REGISTRO FINAL EN BD
  const handleVerifyAndRegister = async (e) => {
    e.preventDefault();
    setError(null);
    setSubmitAttempt(true);

    const otpErr = validateOtp(otpCode);
    if (otpErr) return;

    setLoading(true);
    const fullPhone = getFormattedPhone();

    try {
      // A. Validar el OTP contra Spring Boot
      const verifyResponse = await fetch(VERIFY_OTP_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telefono: fullPhone, codigo: otpCode })
      });

      const verifyData = await verifyResponse.json();

      if (!verifyResponse.ok) {
        throw new Error(verifyData.error || 'Código inválido o expirado.');
      }

      // B. Si el OTP es correcto, impactamos tu endpoint definitivo de Registro
      const registerPayload = {
        username: username.trim(),
        password,
        phone: `+${fullPhone}`, // Enviamos con '+' si tu BD de sellers lo requiere así
        role: 'seller'
      };

      const registerResponse = await fetch(REGISTER_FINAL_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(registerPayload)
      });

      const registerData = await registerResponse.json();

      if (!registerResponse.ok) {
        // Mapear errores de llaves duplicadas si el backend responde con códigos controlados
        if (registerData.message === 'username_taken') {
          setStep(1);
          setErrors(prev => ({ ...prev, username: 'El nombre de usuario ya está en uso' }));
          throw new Error('El nombre de usuario ya está en uso');
        }
        throw new Error(registerData.detail || registerData.message || 'Error en el alta de usuario');
      }

      setShowSuccess(true);
      setTimeout(() => router.push('/login'), 1600);

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const handleClose = () => router.push('/')
  
  const isFormInvalid = errors.username || errors.password || errors.phone || !username || !password || !whatsapp;
  const isOtpInvalid = errors.otp || !otpCode;

  const selectComponents = useMemo(() => ({ Option: OptionWithFlag, SingleValue: SingleValueWithFlag }), [])
  const selectStyles = {
    control: (base) => ({ ...base, backgroundColor: 'transparent', border: 'none', boxShadow: 'none', cursor: 'pointer', minWidth: 140, height: 44 }),
    singleValue: (base) => ({ ...base, color: '#F0F0F0', fontSize: '0.88rem' }),
    menu: (base) => ({ ...base, backgroundColor: '#131313', borderRadius: 14 }),
    option: (base, state) => ({ ...base, backgroundColor: state.isFocused ? '#232323' : '#131313', color: '#F0F0F0', fontSize: '0.88rem' }),
    indicatorsContainer: (base) => ({ ...base, display: 'none' }),
    placeholder: (base) => ({ ...base, color: '#9A9A9A' }),
  }

  return (
    <>
      <Head><title>Registro | Flux Streaming</title></Head>

      <div className="canvas">
        {step === 1 ? (
          /* ================= PASO 1: CAPTURA DE DATOS PRINCIPALES ================= */
          <form className="card" onSubmit={handleRequestOtp} noValidate>
            <button type="button" className="close" onClick={handleClose} aria-label="Cerrar">✕</button>
            <h1 className="title">Regístrate</h1>
            <p className="subtitle">Crea tu cuenta en Flux Streaming</p>

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
                aria-invalid={!!errors.username}
                aria-describedby="username-error"
              />
              <span className="underline" />
            </div>
            {showFieldError('username') && <div id="username-error" className="field-error">{errors.username}</div>}

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

            <button type="submit" className="cta" disabled={loading || isFormInvalid}>
              {loading ? 'Validando datos...' : 'Siguiente (Verificar WhatsApp)'}
            </button>

            <p className="back-login">
              ¿Ya tienes una cuenta?{' '}
              <span className="link" onClick={() => router.push('/login')}>Volver al login</span>
            </p>
          </form>
        ) : (
          /* ================= PASO 2: VERIFICACIÓN EXCLUSIVA DEL OTP ================= */
          <form className="card" onSubmit={handleVerifyAndRegister} noValidate>
            <button type="button" className="close" onClick={() => setStep(1)} aria-label="Volver">←</button>
            <h1 className="title">Verificación</h1>
            <p className="subtitle" style={{ color: '#25D366' }}>
              <FontAwesomeIcon icon={faShieldAlt} style={{ marginRight: 6 }} /> 
              Código enviado al +{getFormattedPhone()} vía WhatsApp
            </p>

            {error && (
              <div className="error-box" role="alert">
                  <FontAwesomeIcon icon={faExclamationTriangle} className="error-icon" />
                  <p className="error-text">{error}</p>
              </div>
            )}

            <div className="group">
              <div className="icon" style={{ color: '#25D366' }}><FontAwesomeIcon icon={faShieldAlt} /></div>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="Ingresa el código de 6 dígitos"
                value={otpCode}
                onChange={handleOtpChange}
                onBlur={() => handleBlur('otp')}
                style={{ paddingLeft: '44px', letterSpacing: '4px', fontSize: '1.1rem', fontWeight: 'bold' }}
                required
                aria-invalid={!!errors.otp}
                aria-describedby="otp-error"
              />
              <span className="underline" />
            </div>
            {showFieldError('otp') && <div id="otp-error" className="field-error">{errors.otp}</div>}

            <button type="submit" className="cta" disabled={loading || isOtpInvalid}>
              {loading ? 'Registrando cuenta...' : 'Confirmar y Registrarme'}
            </button>

            {/* CONTROL DEL REENVÍO CON CONTADOR DE 60 SEGUNDOS */}
            <p className="back-login" style={{ marginTop: '14px' }}>
              {countdown > 0 ? (
                <span>Puedes solicitar un nuevo código en: <b style={{ color: '#8b5cf6' }}>{countdown}s</b></span>
              ) : (
                <span className="link" style={{ color: '#22d3ee', fontWeight: 'bold' }} onClick={() => handleRequestOtp(null)}>
                  Resolicitar código por WhatsApp
                </span>
              )}
            </p>
          </form>
        )}
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
        /* Se mantienen intactos todos tus estilos CSS heredados */
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
          top: 12px; right: 12px;
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.12);
          color: #cfcfcf;
          width: 36px; height: 36px;
          border-radius: 10px;
          display: grid;
          place-items: center;
          cursor: pointer;
          transition: background 0.1s ease;
        }
        .close:hover { background: rgba(255,255,255,0.1); }
        .title { color: #f3f3f3; font-size: 1.9rem; text-align: center; font-weight: 800; }
        .subtitle { color: #afafaf; font-size: 0.98rem; text-align: center; margin-bottom: 6px; }
        
        .error-box {
            display: flex;
            align-items: center;
            gap: 10px;
            background: rgba(255, 92, 92, 0.08);
            border: 1px solid rgba(255, 92, 92, 0.2);
            border-radius: 12px;
            padding: 12px 16px;
            animation: fadeInError 0.3s ease forwards;
            margin-bottom: 4px;
        }
        .error-icon { color: #ff5c5c; font-size: 1.2rem; }
        .error-text { color: #ffb4b4; font-size: 0.95rem; font-weight: 500; margin: 0; }
        @keyframes fadeInError {
            from { opacity: 0; transform: translateY(-5px); }
            to { opacity: 1; transform: translateY(0); }
        }

        .group {
          position: relative;
          display: flex;
          align-items: center;
          background: rgba(30,30,30,0.7);
          border: 1px solid rgba(255,255,255,0.08);
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
            left: 12px; display:flex; align-items:center; color:#cfcfcf; font-size:1rem;
            transition: color 0.2s ease;
        }
        .group:focus-within .icon { color: #8b5cf6; }
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
        .group input::placeholder { color: #8e8e8e; transition: color 0.2s ease; }
        .group:focus-within input::placeholder { color: #cfcfcf; }
        .underline {
          position: absolute;
          bottom: 6px; left: 44px; right: 10px;
          height: 2px;
          background: linear-gradient(90deg, transparent, rgba(139,92,246,0.8), transparent);
          border-radius:2px; opacity:0; transform:scaleX(0.8);
          transition:opacity .2s, transform .2s;
        }
        .group:focus-within .underline { opacity:1; transform:scaleX(1); }

        .group.password-group { padding-right: 44px; }
        .eye-btn {
          position: absolute;
          right: 10px; background: transparent; border: none; color: #cfcfcf;
          width: 32px; height: 32px; display: grid; place-items: center; cursor: pointer; border-radius: 8px;
          transition: background 0.12s ease, color 0.12s ease;
        }
        .eye-btn:hover { background: rgba(255,255,255,0.04); color: #fff; }

        .group.whatsapp {
          display: grid;
          grid-template-columns: 140px 1fr;
          gap: 8px;
          align-items: center;
          padding: 0;
        }
        .select-country {
          background: rgba(30,30,30,0.7);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 14px;
          height: 44px;
          display: flex;
          align-items: center;
          padding: 0 8px;
          transition: border-color 0.2s ease, background 0.2s ease;
        }
        .group.whatsapp:focus-within .select-country {
            border-color: #8b5cf6;
            background: rgba(30, 30, 30, 0.85);
        }

        .cell-input-wrapper {
          position: relative;
          display: block; 
          height: 44px; 
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
          padding: 0 14px 0 38px;
          width: 100%; height: 44px;
          border-radius: 10px;
          border: none; background: transparent; color: #f5f5f5;
          outline: none; font-size: 1rem;
        }
        .input-icon {
          position: absolute;
          left: 11px; top: 50%; transform: translateY(-50%);
          color: #25D366; font-size: 16px;
          display: flex; align-items: center; justify-content: center; pointer-events: none;
        }

        .field-error { 
            color: #ff5c5c; font-size: 0.85rem; margin: -6px 0 4px 10px; font-weight: 500;
            animation: fadeInField 0.2s ease forwards;
        }
        @keyframes fadeInField {
            from { opacity: 0; transform: translateY(-2px); }
            to { opacity: 1; transform: translateY(0); }
        }

        .cta {
          padding: 12px 16px;
          background: linear-gradient(135deg, #8b5cf6 0%, #22d3ee 100%);
          color: #0e0e0e; border: none; border-radius: 14px; font-weight: 800; cursor: pointer;
          box-shadow: 0 12px 26px rgba(34, 211, 238, 0.18);
          transition: filter 0.2s ease, box-shadow 0.2s ease, opacity 0.3s ease, transform 0.1s ease;
          margin-top: 10px;
        }
        .cta:hover { filter: brightness(1.05); box-shadow: 0 16px 30px rgba(139, 92, 246, 0.22); }
        .cta:active { transform: translateY(1px); filter: brightness(0.95); box-shadow: 0 8px 16px rgba(139, 92, 246, 0.15); }
        .cta:disabled { opacity: 0.6; cursor: not-allowed; filter: none; box-shadow: none; transform: none; }

        .back-login { text-align: center; font-size: 0.95rem; color: #afafaf; margin-top: 8px; }
        .link { color: #f3f3f3; font-weight: 600; cursor: pointer; text-decoration: underline; }

        .popup { position: fixed; inset: 0; background: rgba(0,0,0,0.65); display:grid; place-items:center; z-index:999; }
        .popup-content { background: rgba(20,20,20,0.85); border-radius:18px; padding:24px; text-align:center; color:#ededed; box-shadow: 0 24px 48px rgba(0,0,0,0.45); }
        .check { width:56px; height:56px; border-radius:50%; display:grid; place-items:center; margin:0 auto 10px; background: linear-gradient(135deg,#22d3ee 0%,#8b5cf6 100%); color:#0e0e0e; font-weight:900; box-shadow: 0 10px 18px rgba(139, 92, 246, 0.25); }
        .popup-button { padding:10px 14px; background:linear-gradient(135deg,#8b5cf6 0%,#22d3ee 100%); color:#0e0e0e; border:none; border-radius:12px; font-weight:800; cursor:pointer; transition: transform 0.08s ease, filter 0.2s ease; }
        .popup-button:hover { filter: brightness(1.05); }
        .popup-button:active { transform: translateY(1px); }

        @media (max-width: 640px) {
          .group.whatsapp { grid-template-columns: 112px 1fr; }
          .select-country { min-width: 112px; }
          .input-icon { left: 10px; font-size: 16px; } 
          .cell-input-wrapper input { padding-left: 36px; } 
        }
      `}</style>
    </>
  )
}