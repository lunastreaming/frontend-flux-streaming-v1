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

  useEffect(() => {
    setHasMounted(true)
  }, [])

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

  return (
    <nav className="navbar">
      <Link href="/" passHref legacyBehavior>
        <a className="logo-container" aria-label="Ir al inicio">
          <img src="/logo.png" alt="Luna Streaming Logo" className="logo-image" />
        </a>
      </Link>

      <div className="nav-right">
        <ul className="nav-items">
          <li className="nav-item">
            <Link href="/" passHref legacyBehavior>
              <a>
                <FaUserAlt className="nav-icon" />
                <span className="nav-text">Inicio</span>
              </a>
            </Link>
          </li>

          <li className="nav-item">
            <Link href="/billetera" passHref legacyBehavior>
              <a>
                <FaWallet className="nav-icon" />
                <span className="nav-text">Billetera</span>
              </a>
            </Link>
          </li>

          <li className="nav-item">
            <Link href="/compras" passHref legacyBehavior>
              <a>
                <FaShoppingCart className="nav-icon" />
                <span className="nav-text">Compras</span>
              </a>
            </Link>
          </li>
        </ul>

        {!user ? (
          <Link href="/login" passHref legacyBehavior>
            <a className="login-box" aria-label="Iniciar sesión">Login</a>
          </Link>
        ) : (
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
        )}
      </div>
            <style jsx>{`
        .navbar {
          width: 100%;
          max-width: 1200px;
          margin: 32px auto;
          padding: 16px 32px;
          background-color: rgba(26, 26, 26, 0.8);
          backdrop-filter: blur(12px);
          border-radius: 20px;
          border: 1px solid #2E2E2E;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          font-family: 'Inter', sans-serif;
          animation: fadeIn 0.6s ease-out;
        }

        .logo-container {
          display: inline-block;
          transition: transform 0.4s ease, filter 0.4s ease;
        }
        .logo-container:hover {
          transform: scale(1.1);
          filter: drop-shadow(0 0 12px #BFBFBF);
        }
        .logo-image {
          height: 40px;
          object-fit: contain;
        }

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
          box-shadow: 0 0 12px rgba(191, 191, 191, 0.4);
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
          box-shadow: 0 0 12px rgba(191, 191, 191, 0.5);
          transform: scale(1.05);
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

        .logout-icon {
          font-size: 1rem;
          color: rgba(255,255,255,0.95);
        }
        .logout-text {
          color: #fff;
          font-weight: 700;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @media (max-width: 768px) {
          .navbar { flex-direction: column; align-items: flex-start; padding: 16px; }
          .logo-container { margin-bottom: 12px; }
          .nav-right { flex-direction: column; align-items: flex-start; gap: 16px; width: 100%; }
          .nav-items { flex-direction: column; gap: 16px; width: 100%; }
          .login-box { align-self: flex-end; }
        }
      `}</style>
    </nav>
  )
}