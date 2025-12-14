'use client'

import Link from 'next/link'
import { FaUserAlt, FaWallet, FaShoppingCart, FaSignOutAlt } from 'react-icons/fa'
import { useRouter } from 'next/router'
import { useAuth } from '../context/AuthProvider'
import { useState, useEffect } from 'react'

export default function Navbar() {
  const router = useRouter()
  const { user, logout } = useAuth()
  const [loggingOut, setLoggingOut] = useState(false)
  const [hasMounted, setHasMounted] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    setHasMounted(true)
  }, [])

  // Cerrar menú al cambiar de ruta
  useEffect(() => {
    const handleRouteChange = () => setMenuOpen(false)
    router.events.on('routeChangeComplete', handleRouteChange)
    return () => {
      router.events.off('routeChangeComplete', handleRouteChange)
    }
  }, [router.events])

  // Cerrar con Escape
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    if (menuOpen) window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [menuOpen])

  // Evitamos render en SSR para prevenir mismatches de hidratación
  if (!hasMounted) return null

  const handleLogout = async () => {
    if (loggingOut) return
    setLoggingOut(true)

    try {
      const refreshToken = localStorage.getItem('refreshToken')
      const accessToken = localStorage.getItem('accessToken')

      const rawApiBase = process.env.NEXT_PUBLIC_API_URL || ''
      const API_BASE = rawApiBase.replace(/\/+$/, '')
      const logoutEndpoint = API_BASE ? `${API_BASE}/api/users/logout` : '/api/users/logout'

      const headers = { 'Content-Type': 'application/json' }
      if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`

      // Intentamos llamar al endpoint de logout; fallos no deben bloquear limpieza local
      await fetch(logoutEndpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({ refreshToken })
      })
    } catch (err) {
      console.error('Error during logout:', err)
    } finally {
      try {
        logout()
      } catch {
        try { localStorage.removeItem('accessToken'); localStorage.removeItem('refreshToken') } catch {}
      }
      setLoggingOut(false)
      router.push('/')
    }
  }

  const toggleMenu = () => setMenuOpen(v => !v)
  const closeMenu = () => setMenuOpen(false)

  return (
    <nav className="navbar" role="navigation" aria-label="Barra de navegación principal">
      <Link href="/" passHref legacyBehavior>
        <a className="logo-container" aria-label="Ir al inicio" onClick={closeMenu}>
          <img src="/logo.png" alt="Luna Streaming Logo" className="logo-image" />
        </a>
      </Link>

      {/* Botón hamburger visible solo en mobile */}
      <button
        className={`hamburger ${menuOpen ? 'open' : ''}`}
        aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'}
        aria-expanded={menuOpen}
        aria-controls="primary-navigation"
        onClick={toggleMenu}
        type="button"
      >
        <span className="hamburger-box" aria-hidden="true">
          <span className="hamburger-inner" />
        </span>
      </button>

      <div className="nav-right">
        <ul id="primary-navigation" className={`nav-items ${menuOpen ? 'open' : ''}`}>
          <li className="nav-item" onClick={closeMenu}>
            <Link href="/" passHref legacyBehavior>
              <a>
                <FaUserAlt className="nav-icon" />
                <span className="nav-text">Inicio</span>
              </a>
            </Link>
          </li>

          <li className="nav-item" onClick={closeMenu}>
            <Link href="/billetera" passHref legacyBehavior>
              <a>
                <FaWallet className="nav-icon" />
                <span className="nav-text">Billetera</span>
              </a>
            </Link>
          </li>

          <li className="nav-item" onClick={closeMenu}>
            <Link href="/compras" passHref legacyBehavior>
              <a>
                <FaShoppingCart className="nav-icon" />
                <span className="nav-text">Compras</span>
              </a>
            </Link>
          </li>

          {!user ? (
            <li className="nav-item" onClick={closeMenu}>
              <Link href="/login" passHref legacyBehavior>
                <a className="login-box" aria-label="Iniciar sesión">Login</a>
              </Link>
            </li>
          ) : (
            <li className="nav-item" onClick={closeMenu}>
              <button
                className="login-box logout"
                onClick={handleLogout}
                aria-label="Cerrar sesión"
                disabled={loggingOut}
                title={loggingOut ? 'Cerrando sesión...' : 'Cerrar sesión'}
              >
                <FaSignOutAlt className="logout-icon" />
                <span className="logout-text">{loggingOut ? 'Cerrando...' : 'Cerrar sesión'}</span>
              </button>
            </li>
          )}
        </ul>
      </div>

      <style jsx>{`
        .navbar {
          width: 100%;
          max-width: 1200px;
          margin: 32px auto;
          padding: 16px 32px;
          /* 🚨 CAMBIO DE OPACIDAD: De 0.8 a 0.4 (más transparente) */
          background-color: rgba(26, 26, 26, 0.4); 
          backdrop-filter: blur(12px);
          border-radius: 20px;
          border: 1px solid #2E2E2E;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: nowrap;
          font-family: 'Inter', sans-serif;
          animation: fadeIn 0.6s ease-out;
          gap: 16px;
          position: relative; /* importante para posicionar el dropdown */
          z-index: 1000;
          overflow: visible; /* permitir que el dropdown se muestre fuera */
        }

        .logo-container {
          display: inline-block;
          transition: transform 0.4s ease, filter 0.4s ease;
        }
        .logo-container:hover {
          transform: scale(1.05);
          filter: drop-shadow(0 0 8px #BFBFBF);
        }
        .logo-image {
          height: 40px;
          object-fit: contain;
        }

        /* HAMBURGER */
        .hamburger {
          display: none;
          background: transparent;
          border: none;
          padding: 8px;
          margin-left: 8px;
          cursor: pointer;
          border-radius: 8px;
          z-index: 1200;
        }
        .hamburger:focus { outline: 2px solid rgba(191,191,191,0.25); }
        .hamburger-box { display: inline-block; width: 28px; height: 18px; position: relative; }
        .hamburger-inner, .hamburger-inner::before, .hamburger-inner::after {
          width: 28px;
          height: 2px;
          background-color: #E0E0E0;
          position: absolute;
          left: 0;
          transition: transform 0.25s ease, opacity 0.2s ease, top 0.25s ease;
        }
        .hamburger-inner { top: 50%; transform: translateY(-50%); }
        .hamburger-inner::before { content: ''; top: -8px; }
        .hamburger-inner::after { content: ''; top: 8px; }
        .hamburger.open .hamburger-inner { transform: rotate(45deg); top: 50%; }
        .hamburger.open .hamburger-inner::before { transform: rotate(90deg); top: 0; opacity: 0; }
        .hamburger.open .hamburger-inner::after { transform: rotate(-90deg); top: 0; }

        .nav-right {
          display: flex;
          align-items: center;
          gap: 24px;
        }

        .nav-items {
          display: flex;
          gap: 32px;
          list-style: none;
          margin: 0;
          padding: 0;
          font-size: 1rem;
          font-weight: 500;
          align-items: center;
        }

        .nav-item {
          cursor: pointer;
          transition: all 0.3s ease;
          padding: 6px 12px;
          border-radius: 12px;
        }
        .nav-item a {
          display: flex;
          align-items: center;
          gap: 8px;
          text-decoration: none;
        }

        .nav-icon {
          color: #E0E0E0;
          font-size: 1.2rem;
          transition: color 0.3s ease, filter 0.3s ease;
        }
        .nav-text {
          color: #D1D1D1;
          text-shadow: 0 0 6px rgba(255, 255, 255, 0.1);
          transition: color 0.3s ease, text-shadow 0.3s ease;
        }

        .nav-item:hover {
          transform: scale(1.05);
          background-color: rgba(255, 255, 255, 0.05);
          box-shadow: 0 0 12px rgba(191, 191, 191, 0.15);
        }
        .nav-item:hover .nav-icon {
          color: #BFBFBF;
          filter: drop-shadow(0 0 6px rgba(191, 191, 191, 0.5));
        }
        .nav-item:hover .nav-text {
          color: #BFBFBF;
          text-shadow: 0 0 8px rgba(191, 191, 191, 0.6);
        }

        .login-box {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          background-color: rgba(26, 26, 26, 0.6);
          border: 1px solid #2E2E2E;
          color: #D1D1D1;
          padding: 8px 16px;
          border-radius: 12px;
          font-weight: 600;
          text-decoration: none;
          box-shadow: 0 0 8px rgba(0, 0, 0, 0.4);
          transition: all 0.3s ease;
          cursor: pointer;
        }
        .login-box:hover {
          background-color: rgba(46, 46, 46, 0.6);
          box-shadow: 0 0 12px rgba(191, 191, 191, 0.2);
          transform: translateY(-1px);
        }

        .login-box.logout {
          background: linear-gradient(135deg, #ff4d6d 0%, #ff233f 100%);
          color: #ffffff;
          border: 1px solid rgba(255, 35, 63, 0.18);
          box-shadow: 0 8px 20px rgba(255, 35, 63, 0.12), 0 2px 6px rgba(0,0,0,0.35);
          transition: transform 0.12s ease, box-shadow 0.12s ease, filter 0.12s ease;
        }
        .login-box.logout:hover {
          transform: translateY(-2px);
          box-shadow: 0 14px 30px rgba(255, 35, 63, 0.16), 0 4px 12px rgba(0,0,0,0.38);
          filter: saturate(1.05);
        }
        .login-box.logout:active {
          transform: translateY(0);
          box-shadow: 0 8px 18px rgba(255, 35, 63, 0.12), 0 2px 6px rgba(0,0,0,0.35);
        }

        .logout-icon { font-size: 1rem; color: rgba(255,255,255,0.95); }
        .logout-text { color: #fff; font-weight: 700; }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        /* MOBILE STYLES */
        @media (max-width: 768px) {
          .navbar {
            padding: 12px 16px;
            gap: 12px;
          }

          .hamburger {
            display: inline-flex;
            align-items: center;
            justify-content: center;
          }

          /* Ocultamos los items por defecto en mobile */
          .nav-items {
            display: none;
          }

          /* Cuando el menú está abierto mostramos los items en columna (dropdown absoluto) */
          .nav-items.open {
            display: flex;
            position: absolute;
            top: calc(100% + 10px);
            right: 16px;
            background: rgba(20,20,20,0.98);
            border: 1px solid rgba(255,255,255,0.04);
            border-radius: 12px;
            padding: 12px;
            flex-direction: column;
            gap: 8px;
            min-width: 220px;
            z-index: 1100;
            box-shadow: 0 12px 30px rgba(0,0,0,0.6);
          }

          .nav-item {
            width: 100%;
            padding: 10px 12px;
            border-radius: 8px;
          }

          .nav-item a { width: 100%; }

          .nav-right {
            display: flex;
            align-items: center;
            gap: 12px;
          }

          /* Ajustes para que el login/logout se vea bien en mobile */
          .login-box {
            padding: 10px 12px;
            font-size: 0.95rem;
          }
        }
      `}</style>
    </nav>
  )
}