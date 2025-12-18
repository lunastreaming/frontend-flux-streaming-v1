// components/NavBarSupplier.js
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useAuth } from '../context/AuthProvider'
import {
  FaBoxes,
  FaListAlt,
  FaChartLine,
  FaClipboardList,
  FaHeadset,
  FaRedo,
  FaHourglassEnd,
  FaWallet,
  FaSignOutAlt
} from 'react-icons/fa'
import { useState, useEffect } from 'react'

export default function NavBarSupplier({ counts = {} }) {
  const router = useRouter()
  const { logout } = useAuth()

  const [menuOpen, setMenuOpen] = useState(false)

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || ''
  const LOGOUT_ENDPOINT = `${API_BASE}/api/auth/logout`

  useEffect(() => {
    const handleRouteChange = () => setMenuOpen(false)
    router.events.on('routeChangeComplete', handleRouteChange)
    return () => router.events.off('routeChangeComplete', handleRouteChange)
  }, [router.events])

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') setMenuOpen(false) }
    if (menuOpen) window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [menuOpen])

  const handleLogout = async () => {
    try {
      await fetch(LOGOUT_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      }).catch(() => {})

      try { logout() } catch (_) {}

      try {
        document.cookie = 'accessToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax'
      } catch (_) {}

      router.replace('/supplier/login')
    } catch (err) {
      try { logout() } catch (_) {}
      try {
        document.cookie = 'accessToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax'
      } catch (_) {}
      router.replace('/supplier/login')
    }
  }

  const toggleMenu = () => setMenuOpen(v => !v)
  const closeMenu = () => setMenuOpen(false)

  return (
    <nav className="supplier-navbar" role="navigation" aria-label="Barra de navegación proveedor">
      <div className="navbar-main">
        <Link href="/supplier" passHref legacyBehavior>
          <a className="logo-container" aria-label="Ir al inicio" onClick={closeMenu}>
            <img src="/logo.png" alt="Luna Streaming Logo" className="logo-image" />
          </a>
        </Link>

        {/* Hamburger */}
        <button
          className={`hamburger ${menuOpen ? 'open' : ''}`}
          aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'}
          aria-expanded={menuOpen}
          aria-controls="supplier-primary-navigation"
          onClick={toggleMenu}
          type="button"
        >
          <span className="hamburger-box" aria-hidden="true">
            <span className="hamburger-inner" />
          </span>
        </button>

        <ul id="supplier-primary-navigation" className={`supplier-nav-items ${menuOpen ? 'open' : ''}`}>
          <li onClick={closeMenu}>
            <Link href="/supplier/products" passHref legacyBehavior>
              <a><FaBoxes /><span>Productos</span></a>
            </Link>
          </li>
          <li onClick={closeMenu}>
            <Link href="/supplier/stocks" passHref legacyBehavior>
              <a><FaListAlt /><span>Stocks</span></a>
            </Link>
          </li>
          <li onClick={closeMenu}>
            <Link href="/supplier/sales" passHref legacyBehavior>
              <a>
                <FaChartLine /><span>Ventas</span>
                {counts.sales > 0 && <span className="badge">{counts.sales}</span>}
              </a>
            </Link>
          </li>
          <li onClick={closeMenu}>
            <Link href="/supplier/orders" passHref legacyBehavior>
              <a>
                <FaClipboardList /><span>Órdenes</span>
                {counts.orders > 0 && <span className="badge">{counts.orders}</span>}
              </a>
            </Link>
          </li>
          <li onClick={closeMenu}>
            <Link href="/supplier/support" passHref legacyBehavior>
              <a>
                <FaHeadset /><span>Soporte</span>
                {counts.support > 0 && <span className="badge">{counts.support}</span>}
              </a>
            </Link>
          </li>
          <li onClick={closeMenu}>
            <Link href="/supplier/renewal" passHref legacyBehavior>
              <a>
                <FaRedo /><span>Renewal</span>
                {counts.renewed > 0 && <span className="badge">{counts.renewed}</span>}
              </a>
            </Link>
          </li>
          <li onClick={closeMenu}>
            <Link href="/supplier/expired" passHref legacyBehavior>
              <a>
                <FaHourglassEnd /><span>Vencidas</span>
                {counts.expired > 0 && <span className="badge">{counts.expired}</span>}
              </a>
            </Link>
          </li>
          <li onClick={closeMenu}>
            <Link href="/supplier/wallet" passHref legacyBehavior>
              <a><FaWallet /><span>Billetera</span></a>
            </Link>
          </li>

          {/* Logout as menu item for mobile */}
          <li className="logout-item" onClick={closeMenu}>
            <button
              type="button"
              className="logout-button-inline"
              onClick={handleLogout}
              title="Cerrar sesión"
              aria-label="Cerrar sesión"
            >
              <FaSignOutAlt />
              <span className="sr-only">Cerrar sesión</span>
            </button>
          </li>
        </ul>
      </div>

      {/* Desktop logout button */}
      <div className="logout-area">
        <button
          type="button"
          className="logout-button"
          onClick={handleLogout}
          title="Cerrar sesión"
          aria-label="Cerrar sesión"
        >
          <FaSignOutAlt />
        </button>
      </div>

      <style jsx>{`
        .supplier-navbar {
          width: 100%;
          max-width: 1200px;
          margin: 32px auto;
          padding: 16px 24px;
          background-color: rgba(26, 26, 26, 0.8);
          backdrop-filter: blur(12px);
          border-radius: 20px;
          border: 1px solid #2E2E2E;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: nowrap;
          font-family: 'Inter', sans-serif;
          animation: fadeIn 0.6s ease-out;
          position: relative;
          z-index: 1000;
          overflow: visible;
        }

        .navbar-main {
          display: flex;
          align-items: center;
          gap: 32px;
          flex: 1;
        }

        .logo-container {
          display: inline-block;
          transition: transform 0.3s ease, filter 0.3s ease;
        }
        .logo-container:hover { 
          transform: scale(1.05);
          filter: drop-shadow(0 0 8px #BFBFBF);
        }
        .logo-image { 
          height: 60px; 
          object-fit: contain;
        }

        /* HAMBURGER */
        .hamburger {
          display: none;
          background: transparent;
          border: none;
          padding: 8px;
          margin-left: 8px; /* Este margen es para escritorio/tablet */
          cursor: pointer;
          border-radius: 8px;
          z-index: 1200;
        }
        .hamburger:focus { outline: 2px solid rgba(191,191,191,0.25);
        }
        .hamburger-box { display: inline-block; width: 28px; height: 18px; position: relative;
        }
        .hamburger-inner, .hamburger-inner::before, .hamburger-inner::after {
          width: 28px;
          height: 2px;
          background-color: #E0E0E0;
          position: absolute;
          left: 0;
          transition: transform 0.25s ease, opacity 0.2s ease, top 0.25s ease;
        }
        .hamburger-inner { top: 50%; transform: translateY(-50%);
        }
        .hamburger-inner::before { content: ''; top: -8px;
        }
        .hamburger-inner::after { content: ''; top: 8px;
        }
        .hamburger.open .hamburger-inner { transform: rotate(45deg); top: 50%;
        }
        .hamburger.open .hamburger-inner::before { transform: rotate(90deg); top: 0; opacity: 0;
        }
        .hamburger.open .hamburger-inner::after { transform: rotate(-90deg); top: 0;
        }

        .supplier-nav-items {
          display: flex;
          gap: 22px;
          list-style: none;
          margin: 0;
          padding: 0;
          font-size: 1rem;
          font-weight: 500;
          align-items: center;
          flex: 1;
          justify-content: center;
        }

        .supplier-nav-items li {
          cursor: pointer;
          transition: transform 0.18s ease, background-color 0.18s ease;
          padding: 6px 10px;
          border-radius: 10px;
          position: relative;
          display: flex;
          align-items: center;
        }

        .supplier-nav-items li a {
          display: flex;
          align-items: center;
          gap: 8px;
          text-decoration: none;
          color: #D1D1D1;
          position: relative;
          min-height: 40px;
        }

        .supplier-nav-items li:hover { transform: translateY(-3px); background-color: rgba(255,255,255,0.04);
        }
        .supplier-nav-items li:hover svg { color: #BFBFBF; filter: drop-shadow(0 0 6px rgba(191,191,191,0.4));
        }
        .supplier-nav-items li:hover span { color: #BFBFBF;
        }

        .badge {
          position: absolute;
          top: -6px;
          right: -10px;
          background: #ef4444;
          color: #fff;
          font-size: 0.7rem;
          font-weight: bold;
          border-radius: 999px;
          padding: 2px 6px;
          line-height: 1;
          min-width: 20px;
          text-align: center;
        }

        .logout-area {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .logout-button {
          display: inline-grid;
          place-items: center;
          width: 44px;
          height: 44px;
          background: linear-gradient(135deg, rgba(255,77,77,0.95) 0%, rgba(255,107,107,0.95) 100%);
          color: #fff;
          border: none;
          border-radius: 12px;
          cursor: pointer;
          transition: transform 0.12s ease, box-shadow 0.12s ease, opacity 0.12s ease;
          box-shadow: 0 8px 18px rgba(255,77,77,0.14);
        }
        .logout-button:hover { transform: translateY(-2px); box-shadow: 0 12px 26px rgba(255,77,77,0.2);
        }
        .logout-button svg { width: 18px; height: 18px;
        }

        .logout-button-inline {
          display: inline-grid;
          place-items: center;
          width: 40px;
          height: 40px;
          background: linear-gradient(135deg, rgba(255,77,77,0.95) 0%, rgba(255,107,107,0.95) 100%);
          color: #fff;
          border: none;
          border-radius: 10px;
          cursor: pointer;
        }

        .sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px;
          overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border: 0; }

        @keyframes fadeIn { from { opacity: 0;
          transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }

        /* MOBILE STYLES */
        @media (max-width: 768px) {
          .supplier-navbar { 
            /* *** CAMBIO CLAVE 1: Fuerza al padding a incluirse dentro del 100% del ancho *** */
            box-sizing: border-box; /* AÑADIDO PARA EVITAR DESBORDAMIENTO */
            flex-direction: column;
            align-items: flex-start; 
            /* Ajustamos el padding a 24px para un buen margen */
            padding: 12px 24px; /* AJUSTADO */
            gap: 12px; 
          } 
          
          .navbar-main { 
            width: 100%;
            display: flex;
            align-items: center; 
            justify-content: space-between; 
            gap: 12px;
          }

          .hamburger { 
            display: inline-flex;
            align-items: center;
            justify-content: center; 
            margin-left: 0;
          }

          /* Ocultamos los items por defecto en mobile */
          .supplier-nav-items { display: none;
          } 

          /* Dropdown absoluto */
          .supplier-nav-items.open {
            display: flex;
            position: absolute;
            top: calc(100% + 10px);
            /* *** CAMBIO CLAVE 2: Aseguramos que el menú se alinee al nuevo borde (24px) *** */
            right: 24px; /* AJUSTADO (antes 16px) */
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

          .supplier-nav-items li { width: 100%; padding: 10px 12px; border-radius: 8px;
          }
          .supplier-nav-items li a { width: 100%;
          }

          /* Se oculta el botón de logout de escritorio */
          .logout-area { display: none;
          }
          .supplier-nav-items.open .logout-button-inline { display: inline-grid;
          }

          /* If you prefer the menu to be inline (push content down) instead of absolute,
             replace .supplier-nav-items.open rules with position: static;
             width: 100%; */
        }

        @media (min-width: 769px) {
          /* Ensure dropdown not visible on desktop */
          .supplier-nav-items.open { position: static;
          display: flex; }
          .logout-area { display: flex;
          }
          
          /* Oculta el ítem de logout INLINE en escritorio para prevenir duplicados */
          .logout-item { 
            display: none !important;
          }
        }
      `}</style>
    </nav>
  )
}