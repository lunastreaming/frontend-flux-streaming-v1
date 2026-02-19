// pages/registersupplier.js
import { useState, useEffect, useMemo } from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'
import Select, { components } from 'react-select'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faUser, faLock, faEye, faEyeSlash, faExclamationTriangle } from '@fortawesome/free-solid-svg-icons'
import { faWhatsapp } from '@fortawesome/free-brands-svg-icons'
import countriesData from '../../data/countries.json' // ajusta ruta si tu estructura difiere

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

// Componente para el valor seleccionado con Bandera
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

  // Mantenemos los campos originales
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [phone, setPhone] = useState('')
  const [refCode, setRefCode] = useState('')
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  const [countries, setCountries] = useState([])
  const [selectedCountry, setSelectedCountry] = useState(null)
  const [loadingCountries, setLoadingCountries] = useState(true)

  // Estado para validación de usuario (UX)
  const [usernameError, setUsernameError] = useState(null);

  const [touched, setTouched] = useState({ username: false, password: false, phone: false })
  const handleBlur = field => setTouched(prev => ({ ...prev, [field]: true }))

  // VALIDACIÓN EN TIEMPO REAL: Usuario (mínimo 6 dígitos)
  useEffect(() => {
    if (username.length > 0 && username.length < 6) {
        setUsernameError('El usuario debe tener al menos 6 caracteres.');
    } else {
        setUsernameError(null);
    }
  }, [username]);


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

  const apiUrl = `${process.env.NEXT_PUBLIC_API_URL || ''}/api/auth/register`

  const handleRegister = async (e) => {
    e.preventDefault()
    setError(null)
    
    // VALIDACIÓN DE LONGITUD MÍNIMA DE USUARIO (antes de envío)
    if (username.length < 6) {
        setError('El usuario debe tener al menos 6 caracteres.');
        setUsernameError('El usuario debe tener al menos 6 caracteres.');
        return;
    }

    if (!username || !password || !phone) {
      setError('Todos los campos son obligatorios')
      return
    }
    if (!selectedCountry) {
      setError('Selecciona tu país')
      return
    }

    const localDigits = phone.replace(/\D/g, '')
    const fullPhone = `+${String(selectedCountry.dial).replace(/\D/g, '')}${localDigits}`

    const payload = {
      username: username.trim(),
      password,
      phone: fullPhone,
      role: 'provider',
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
      setError(err.message || 'Error al registrar')
    } finally {
      setLoading(false)
    }
  }

  const selectComponents = useMemo(() => ({ Option: OptionWithFlag, SingleValue: SingleValueWithFlag }), [])
  const selectStyles = {
    control: (base, state) => ({ 
        ...base, 
        backgroundColor: 'transparent', 
        border: 'none', 
        boxShadow: 'none', 
        cursor: 'pointer', 
        minWidth: 140, 
        height: 44,
    }),
    singleValue: (base) => ({ ...base, color: '#F0F0F0', fontSize: '0.88rem' }),
    menu: (base) => ({ ...base, backgroundColor: '#131313', borderRadius: 14 }),
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
        <form className="card" onSubmit={handleRegister}>
          <h1 className="title">Registro Proveedor</h1>
          <p className="subtitle">Crea tu cuenta de proveedor</p>

          
          {/* ERROR BOX */}
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
              aria-label="Usuario"
              required
            />
            <span className="underline" />
          </div>
          {/* MENSAJE AMIGABLE DE VALIDACIÓN */}
          {usernameError && <p className="field-error">{usernameError}</p>}

          {/* CAMPO CONTRASEÑA */}
          <div className="group password-group">
            <div className="icon"><FontAwesomeIcon icon={faLock} /></div>
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Contraseña"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onBlur={() => handleBlur('password')}
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

          {/* CAMPO WHATSAPP (País + Teléfono) */}
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
                value={phone}
                onChange={e => setPhone(e.target.value.replace(/\D/g, ''))}
                onBlur={() => handleBlur('phone')}
                aria-label="Celular"
                required
              />
            </div>

            <span className="underline" />
          </div>

          <button 
            type="submit" 
            className="cta" 
            disabled={loading || !!usernameError || !username || !password || !phone}
          >
            {loading ? 'Registrando...' : 'Registrarme'}
          </button>

          <p className="back-login">
            ¿Ya tienes cuenta?{' '}
            <span className="link" onClick={() => router.push('/supplier/loginSupplier')}>Ir al login</span>
          </p>
        </form>
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
        /* --- ESTILOS VISUALES --- */
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

        .title { color: #f3f3f3; font-size: 1.9rem; text-align: center; font-weight: 800; }
        .subtitle { color: #afafaf; font-size: 0.98rem; text-align: center; margin-bottom: 6px; }
        
        /* Error Box para errores generales/servidor */
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
        .error-icon { color: #ff5c5c; font-size: 1.2rem; }
        .error-text { color: #ffb4b4; font-size: 0.95rem; font-weight: 500; margin: 0; }
        
        /* Estilo para errores en campos (Mensaje amigable) */
        .field-error {
            color: #ff5c5c;
            font-size: 0.85rem;
            margin: -6px 0 4px 10px; 
            font-weight: 500;
            animation: fadeInField 0.2s ease forwards;
        }
        @keyframes fadeInField {
            from { opacity: 0; transform: translateY(-2px); }
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
          transition: border-color 0.2s ease, background 0.2s ease;
        }
        .group:focus-within { 
            border-color: #8b5cf6; 
            background: rgba(30, 30, 30, 0.85);
        }
        .icon { 
            position: absolute; left: 12px; display:flex; align-items:center; color:#cfcfcf; font-size:1rem;
            transition: color 0.2s ease; 
        }
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
            transition: color 0.2s ease;
        }
        .group:focus-within input::placeholder {
            color: #cfcfcf; 
        }
        .underline {
          position: absolute; bottom: 6px; left: 44px; right: 10px; height: 2px;
          background: linear-gradient(90deg, transparent, rgba(139,92,246,0.8), transparent);
          border-radius:2px; opacity:0; transform:scaleX(0.8);
          transition:opacity .2s, transform .2s;
        }
        .group:focus-within .underline { opacity:1; transform:scaleX(1); }

        /* Password: ojito */
        .group.password-group { padding-right: 44px; }
        .eye-btn {
          position: absolute; right: 10px; background: transparent; border: none; color: #cfcfcf;
          width: 32px; height: 32px; display: grid; place-items: center; cursor: pointer; border-radius: 8px;
          transition: background 0.12s ease, color 0.12s ease;
        }
        .eye-btn:hover { background: rgba(255,255,255,0.04); color: #fff; }

        /* WhatsApp group (País + Teléfono) */
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
            background: rgba(30,30,30,0.7); /* Se mueve el background aquí */
            border: 1px solid rgba(255,255,255,0.08); /* Se mueve el border aquí */
            border-radius: 14px;
            transition: border-color 0.2s ease, background 0.2s ease;
        }
        .group.whatsapp:focus-within .cell-input-wrapper {
             border-color: #8b5cf6; 
             background: rgba(30, 30, 30, 0.85);
        }

        /* 🚨 FIX DE ALINEACIÓN DEL ÍCONO */
        .cell-input-wrapper input {
          /* Ajuste de padding-left y height/padding para centrar texto */
          padding: 0 14px 0 38px; /* Arriba 0, Derecha 14, Abajo 0, Izquierda 38 */
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
          color: #25D366; 
          font-size: 16px; /* Tamaño ajustado para alineación vertical */
          display: flex; 
          align-items: center; 
          justify-content: center; 
          pointer-events: none;
        }
        
        /* CTA con transiciones y estado :active */
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
            transform: translateY(1px); 
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