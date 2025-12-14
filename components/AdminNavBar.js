'use client'

import Link from 'next/link'
import { useRouter } from 'next/router'
import { useAuth } from '../context/AuthProvider' // ajusta si tu provider está en otra ruta
import {
  FaChartLine, FaMoneyBill, FaTags, FaBoxOpen,
  FaUsers, FaWallet, FaTruck, FaCoins, FaSignOutAlt
} from 'react-icons/fa'
import { useState, useEffect } from 'react'

export default function AdminNavBar() {
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
      // Notificar backend (no bloqueante si falla)
      await fetch(LOGOUT_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      }).catch(() => {})

      // Limpieza local
      try { logout() } catch (_) {}

      // Eliminar cookie usada por middleware
      try {
        document.cookie = 'accessToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax'
      } catch (_) {}

      router.replace('/admin/loginAdmin')
    } catch (err) {
      try { logout() } catch (_) {}
      try {
        document.cookie = 'accessToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax'
      } catch (_) {}
      router.replace('/admin/loginAdmin')
    }
  }

  const toggleMenu = () => setMenuOpen(v => !v)
  const closeMenu = () => setMenuOpen(false)

  return (
    <nav className="admin-navbar" role="navigation" aria-label="Barra de navegación de administrador">
      <Link href="/admin" passHref legacyBehavior>
        <a className="logo-container" aria-label="Ir al inicio" onClick={closeMenu}>
          <img src="/logo.png" alt="Luna Streaming Logo" className="logo-image" />
        </a>
      </Link>

      {/* Hamburger (visible en mobile) */}
      <button
        className={`hamburger ${menuOpen ? 'open' : ''}`}
        aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'}
        aria-expanded={menuOpen}
        aria-controls="admin-primary-navigation"
        onClick={toggleMenu}
        type="button"
      >
        <span className="hamburger-box" aria-hidden="true">
          <span className="hamburger-inner" />
        </span>
      </button>

      <ul id="admin-primary-navigation" className={`admin-nav-items ${menuOpen ? 'open' : ''}`}>
        <li onClick={closeMenu}><Link href="/admin/solds" passHref legacyBehavior><a><FaChartLine /><span>Solds</span></a></Link></li>
        <li onClick={closeMenu}><Link href="/admin/finance" passHref legacyBehavior><a><FaMoneyBill /><span>Finance</span></a></Link></li>
        <li onClick={closeMenu}><Link href="/admin/category" passHref legacyBehavior><a><FaTags /><span>Category</span></a></Link></li>
        <li onClick={closeMenu}><Link href="/admin/other" passHref legacyBehavior><a><FaBoxOpen /><span>Other</span></a></Link></li>
        <li onClick={closeMenu}><Link href="/admin/users" passHref legacyBehavior><a><FaUsers /><span>Users</span></a></Link></li>
        <li onClick={closeMenu}><Link href="/admin/wallet-user" passHref legacyBehavior><a><FaWallet /><span>Wallet User</span></a></Link></li>
        <li onClick={closeMenu}><Link href="/admin/supplier" passHref legacyBehavior><a><FaTruck /><span>Supplier</span></a></Link></li>
        <li onClick={closeMenu}><Link href="/admin/wallet-supplier" passHref legacyBehavior><a><FaCoins /><span>Wallet Supplier</span></a></Link></li>

        {/* Logout como item del menú para mobile/desktop coherente */}
        <li className="logout-item" onClick={closeMenu}>
          <button
            type="button"
            className="logout-button"
            onClick={handleLogout}
            title="Cerrar sesión"
            aria-label="Cerrar sesión"
          >
            <FaSignOutAlt />
            <span className="sr-only">Cerrar sesión</span>
          </button>
        </li>
      </ul>

      <style jsx>{`
.admin-navbar {
          width: 100%;
          max-width: 1200px;
          margin: 32px auto;
          padding: 16px 24px;
          
          /* 1. RESTAURAR FONDO OSCURO (SEMI-TRANSPARENTE) Y EL EFECTO BLUR */
          background-color: rgba(26, 26, 26, 0.8); /* Fondo oscuro con transparencia */
          backdrop-filter: blur(12px); /* Efecto de desenfoque */
          
          border-radius: 20px; /* Mantener los bordes redondeados */
          
          /* 2. REEMPLAZAR EL BORDE COMPLETO POR LÍNEAS SUPERIOR E INFERIOR */
          border: none; /* Anula el borde de 4 lados original */
          border-top: 1px solid rgba(255, 255, 255, 0.1); /* Línea superior sutil */
          border-bottom: 1px solid rgba(255, 255, 255, 0.1); /* Línea inferior sutil */
          
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4); /* Mantener la sombra */
          
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: nowrap;
          font-family: 'Inter', sans-serif;
          animation: fadeIn 0.6s ease-out;
          position: relative;
          z-index: 1000;
          overflow: visible;
          gap: 12px;
        }

        .logo-container {
          display: inline-block;
          transition: transform 0.3s ease, filter 0.3s ease;
        }
        .logo-container:hover { transform: scale(1.05); filter: drop-shadow(0 0 8px #BFBFBF); }
        .logo-image { height: 40px; object-fit: contain; }

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

        .admin-nav-items {
          display: flex;
          gap: 28px;
          list-style: none;
          margin: 0;
          padding: 0;
          font-size: 1rem;
          font-weight: 500;
          align-items: center;
          flex: 1;
          justify-content: center;
        }

        .admin-nav-items li {
          cursor: pointer;
          transition: transform 0.18s ease, background-color 0.18s ease;
          padding: 6px 10px;
          border-radius: 10px;
          display: flex;
          align-items: center;
        }

        .admin-nav-items li a {
          display: flex;
          align-items: center;
          gap: 8px;
          text-decoration: none;
          color: #D1D1D1;
        }

        .admin-nav-items li:hover { transform: translateY(-3px); background-color: rgba(255,255,255,0.04); }
        .admin-nav-items li:hover svg { color: #BFBFBF; filter: drop-shadow(0 0 6px rgba(191,191,191,0.4)); }
        .admin-nav-items li:hover span { color: #BFBFBF; }

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
        .logout-button:hover { transform: translateY(-2px); box-shadow: 0 12px 26px rgba(255,77,77,0.2); }
        .logout-button svg { width: 18px; height: 18px; }

        .sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border: 0; }

        @keyframes fadeIn { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }

        /* MOBILE STYLES */
        @media (max-width: 768px) {
          .admin-navbar {
            flex-direction: row;
            align-items: center;
            padding: 12px 16px;
            gap: 8px;
          }

          .hamburger { display: inline-flex; align-items: center; justify-content: center; }

          /* Ocultamos los items por defecto en mobile */
          .admin-nav-items { display: none; }

          /* Cuando el menú está abierto mostramos los items en columna (dropdown absoluto) */
          .admin-nav-items.open {
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

          .admin-nav-items li { width: 100%; padding: 10px 12px; border-radius: 8px; }
          .admin-nav-items li a { width: 100%; }

          /* Mostrar logout al final del dropdown */
          .logout-item { display: flex; justify-content: flex-end; }

          /* Si prefieres que el menú ocupe todo el ancho en pantallas muy pequeñas,
             reemplaza las reglas anteriores por position: static y width: 100% */
        }

        /* Tablet / small desktop adjustments */
        @media (min-width: 769px) and (max-width: 1024px) {
          .admin-nav-items { gap: 18px; }
        }
      `}</style>
    </nav>
  )
}