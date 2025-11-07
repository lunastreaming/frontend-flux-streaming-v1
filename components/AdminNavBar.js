import Link from 'next/link'
import { useRouter } from 'next/router'
import { useAuth } from '../context/AuthProvider' // ajusta si tu provider está en otra ruta
import {
  FaChartLine, FaMoneyBill, FaTags, FaBoxOpen,
  FaUsers, FaWallet, FaTruck, FaCoins, FaSignOutAlt
} from 'react-icons/fa'

export default function AdminNavBar() {
  const router = useRouter()
  const { logout } = useAuth()

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || ''
  const LOGOUT_ENDPOINT = `${API_BASE}/api/auth/logout`

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

  return (
    <nav className="admin-navbar">
      <Link href="/" passHref legacyBehavior>
        <a className="logo-container" aria-label="Ir al inicio">
          <img src="/logo.png" alt="Luna Streaming Logo" className="logo-image" />
        </a>
      </Link>

      <ul className="admin-nav-items">
        <li><Link href="/admin/solds" passHref legacyBehavior><a><FaChartLine /><span>Solds</span></a></Link></li>
        <li><Link href="/admin/finance" passHref legacyBehavior><a><FaMoneyBill /><span>Finance</span></a></Link></li>
        <li><Link href="/admin/category" passHref legacyBehavior><a><FaTags /><span>Category</span></a></Link></li>
        <li><Link href="/admin/other" passHref legacyBehavior><a><FaBoxOpen /><span>Other</span></a></Link></li>
        <li><Link href="/admin/users" passHref legacyBehavior><a><FaUsers /><span>Users</span></a></Link></li>
        <li><Link href="/admin/wallet-user" passHref legacyBehavior><a><FaWallet /><span>Wallet User</span></a></Link></li>
        <li><Link href="/admin/supplier" passHref legacyBehavior><a><FaTruck /><span>Supplier</span></a></Link></li>
        <li><Link href="/admin/wallet-supplier" passHref legacyBehavior><a><FaCoins /><span>Wallet Supplier</span></a></Link></li>
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
        .admin-navbar {
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
          .admin-navbar { flex-direction: column; align-items: flex-start; padding: 12px; gap: 12px; }
          .admin-nav-items { flex-direction: column; gap: 12px; width: 100%; justify-content: flex-start; }
          .logout-area { width: 100%; display: flex; justify-content: flex-end; }
        }
      `}</style>
    </nav>
  )
}