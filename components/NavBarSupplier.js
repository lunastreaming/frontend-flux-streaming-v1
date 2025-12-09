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

export default function NavBarSupplier({ counts = {} }) {
  const router = useRouter()
  const { logout } = useAuth()

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || ''
  const LOGOUT_ENDPOINT = `${API_BASE}/api/auth/logout`

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

  return (
    <nav className="supplier-navbar">
      <Link href="/" passHref legacyBehavior>
        <a className="logo-container" aria-label="Ir al inicio">
          <img src="/logo.png" alt="Luna Streaming Logo" className="logo-image" />
        </a>
      </Link>

      <ul className="supplier-nav-items">
        <li>
          <Link href="/supplier/products" passHref legacyBehavior>
            <a><FaBoxes /><span>Productos</span></a>
          </Link>
        </li>
        <li>
          <Link href="/supplier/stocks" passHref legacyBehavior>
            <a><FaListAlt /><span>Stocks</span></a>
          </Link>
        </li>
        <li>
          <Link href="/supplier/sales" passHref legacyBehavior>
            <a>
              <FaChartLine /><span>Ventas</span>
              {counts.sales > 0 && <span className="badge">{counts.sales}</span>}
            </a>
          </Link>
        </li>
        <li>
          <Link href="/supplier/orders" passHref legacyBehavior>
            <a>
              <FaClipboardList /><span>Órdenes</span>
              {counts.orders > 0 && <span className="badge">{counts.orders}</span>}
            </a>
          </Link>
        </li>
        <li>
          <Link href="/supplier/support" passHref legacyBehavior>
            <a>
              <FaHeadset /><span>Soporte</span>
              {counts.support > 0 && <span className="badge">{counts.support}</span>}
            </a>
          </Link>
        </li>
        <li>
          <Link href="/supplier/renewal" passHref legacyBehavior>
            <a>
              <FaRedo /><span>Renewal</span>
              {counts.renewed > 0 && <span className="badge">{counts.renewed}</span>}
            </a>
          </Link>
        </li>
        <li>
          <Link href="/supplier/expired" passHref legacyBehavior>
            <a>
              <FaHourglassEnd /><span>Vencidas</span>
              {counts.expired > 0 && <span className="badge">{counts.expired}</span>}
            </a>
          </Link>
        </li>
        <li>
          <Link href="/supplier/wallet" passHref legacyBehavior>
            <a><FaWallet /><span>Billetera</span></a>
          </Link>
        </li>
      </ul>

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
          flex-wrap: wrap;
          font-family: 'Inter', sans-serif;
          animation: fadeIn 0.6s ease-out;
        }

        .logo-container {
          display: inline-block;
          transition: transform 0.3s ease, filter 0.3s ease;
        }
        .logo-container:hover { transform: scale(1.05); filter: drop-shadow(0 0 8px #BFBFBF); }
        .logo-image { height: 40px; object-fit: contain; }

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
        }

        .supplier-nav-items li a {
          display: flex;
          align-items: center;
          gap: 8px;
          text-decoration: none;
          color: #D1D1D1;
          position: relative;
        }

        .supplier-nav-items li:hover { transform: translateY(-3px); background-color: rgba(255,255,255,0.04); }
        .supplier-nav-items li:hover svg { color: #BFBFBF; filter: drop-shadow(0 0 6px rgba(191,191,191,0.4)); }
        .supplier-nav-items li:hover span { color: #BFBFBF; }

        .badge {
          background: #ef4444;
          color: #fff;
          font-size: 0.7rem;
          font-weight: bold;
          border-radius: 999px;
          padding: 2px 6px;
          margin-left: 6px;
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
        .logout-button:hover { transform: translateY(-2px); box-shadow: 0 12px 26px rgba(255,77,77,0.2); }
        .logout-button svg { width: 18px; height: 18px; }

        @keyframes fadeIn { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }

        @media (max-width: 768px) {
          .supplier-navbar { flex-direction: column; align-items: flex-start; padding: 12px; gap: 12px; }
          .supplier-nav-items { flex-direction: column; gap: 12px; width: 100%; justify-content: flex-start; }
          .logout-area { width: 100%; display: flex; justify-content: flex-end; }
        }
      `}</style>
    </nav>
  )
}