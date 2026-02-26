'use client'

import Link from 'next/link'
import { FaUserAlt, FaWallet, FaShoppingCart, FaSignOutAlt, FaHome } from 'react-icons/fa'
import { useRouter } from 'next/router'
import { useAuth } from '../context/AuthProvider'
import { useState, useEffect } from 'react'

export default function Navbar() {
  const router = useRouter()
  const { user, logout } = useAuth()
  const [loggingOut, setLoggingOut] = useState(false)
  const [hasMounted, setHasMounted] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  // Marcamos cuando el componente se monta en el cliente
  useEffect(() => {
    setHasMounted(true)
  }, [])

  // Cerrar menú al cambiar de ruta
  useEffect(() => {
    const handleRouteChange = () => setMenuOpen(false)
    if (router.events) {
      router.events.on('routeChangeComplete', handleRouteChange)
      return () => {
        router.events.off('routeChangeComplete', handleRouteChange)
      }
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
        try { 
          localStorage.removeItem('accessToken')
          localStorage.removeItem('refreshToken') 
        } catch {}
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
          {/* loading="eager" para que sea lo primero en cargar en el navegador */}
          <img src="/logo.png" alt="Flux Streaming Logo" className="logo-image" loading="eager" />
        </a>
      </Link>

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

      <div className={`nav-right ${menuOpen ? 'open' : ''}`}>
        <ul id="primary-navigation" className={`nav-items ${menuOpen ? 'open' : ''}`}>
          <li className="nav-item" onClick={closeMenu}>
            <Link href="/" passHref legacyBehavior>
              <a>
                <FaHome className="nav-icon" />
                <span className="nav-text">Inicio</span>
              </a>
            </Link>
          </li>

          {/* Solo mostramos el perfil si ya cargó el cliente y hay usuario */}
          {hasMounted && user && (
            <li className="nav-item" onClick={closeMenu}>
              <Link href="/perfil" passHref legacyBehavior>
                <a>
                  <FaUserAlt className="nav-icon" />
                  <span className="nav-text">{user.username || 'Mi Perfil'}</span>
                </a>
              </Link>
            </li>
          )}

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

          {/* Renderizado condicional del botón de Login/Logout sin bloquear el resto del Navbar */}
          {!hasMounted ? (
            <li className="nav-item">
              <div className="login-placeholder" />
            </li>
          ) : !user ? (
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
          position: relative;
          z-index: 1000;
          overflow: visible;
        }

        /* Placeholder para evitar saltos visuales antes de la hidratación */
        .login-placeholder {
          width: 90px;
          height: 38px;
          background: rgba(255,255,255,0.05);
          border-radius: 12px;
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
          height: 80px;
          object-fit: contain;
        }

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
          width: 1.2rem;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: color 0.3s ease, filter 0.3s ease;
        }
        .nav-text {
          color: #D1D1D1;
          font-size: 1rem;
          text-shadow: 0 0 6px rgba(255, 255, 255, 0.1);
          transition: color 0.3s ease, text-shadow 0.3s ease;
          max-width: 120px; 
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
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
        }

        .logout-text { color: #fff; font-weight: 700; }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @media (max-width: 768px) {
          .navbar {
            width: 92%;
            margin: 10px auto; 
            padding: 12px 16px;
          }
          .hamburger { display: inline-flex; }
          .nav-right { display: none; }
          .nav-right.open {
            display: block; 
            position: absolute;
            top: 0;
            right: 0;
            width: 100%;
          }
          .nav-items { display: none; }
          .nav-items.open {
            display: flex;
            position: absolute;
            top: 65px;
            right: 0;
            background: rgba(20,20,20,0.98);
            border: 1px solid #2E2E2E;
            border-radius: 12px;
            padding: 12px;
            flex-direction: column;
            gap: 8px;
            min-width: 200px;
            box-shadow: 0 12px 30px rgba(0,0,0,0.6);
          }
          .nav-item { width: 100%; }
        }
      `}</style>
    </nav>
  )
}