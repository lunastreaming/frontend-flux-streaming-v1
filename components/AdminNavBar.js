'use client'

import Link from 'next/link'
import { useRouter } from 'next/router'
import { useAuth } from '../context/AuthProvider'
import {
  FaChartLine, FaMoneyBill, FaTags, FaBoxOpen,
  FaUsers, FaWallet, FaTruck, FaCoins, FaSignOutAlt
} from 'react-icons/fa'
import { useState, useEffect } from 'react'

export default function AdminNavBar() {
  const router = useRouter()
  const { logout } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const [hasMounted, setHasMounted] = useState(false)

  useEffect(() => {
    setHasMounted(true)
  }, [])

  useEffect(() => {
    const handleRouteChange = () => setMenuOpen(false)
    if (router.events) {
      router.events.on('routeChangeComplete', handleRouteChange)
      return () => router.events.off('routeChangeComplete', handleRouteChange)
    }
  }, [router.events])

  if (!hasMounted) return null

  const handleLogout = async () => {
    try {
      if (typeof logout === 'function') logout()
      document.cookie = 'accessToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax'
      router.replace('/admin/loginAdmin')
    } catch (err) {
      router.replace('/admin/loginAdmin')
    }
  }

  return (
    <nav className="admin-navbar">
      <div className="navbar-content">
        <Link href="/admin" passHref legacyBehavior>
          <a className="logo-container" onClick={() => setMenuOpen(false)}>
            <img src="/logo.png" alt="Luna Streaming Logo" className="logo-image" />
          </a>
        </Link>

        <button
          className={`hamburger ${menuOpen ? 'open' : ''}`}
          onClick={() => setMenuOpen(!menuOpen)}
          type="button"
          aria-label="Menú"
        >
          <div className="bar" />
          <div className="bar" />
          <div className="bar" />
        </button>

        {/* Lista completa de items recuperada de tu archivo original */}
        <ul className={`admin-nav-items ${menuOpen ? 'open' : ''}`}>
          <li><Link href="/admin/solds" passHref legacyBehavior><a><FaChartLine /><span>Solds</span></a></Link></li>
          <li><Link href="/admin/finance" passHref legacyBehavior><a><FaMoneyBill /><span>Finance</span></a></Link></li>
          <li><Link href="/admin/category" passHref legacyBehavior><a><FaTags /><span>Category</span></a></Link></li>
          <li><Link href="/admin/other" passHref legacyBehavior><a><FaBoxOpen /><span>Other</span></a></Link></li>
          <li><Link href="/admin/users" passHref legacyBehavior><a><FaUsers /><span>Users</span></a></Link></li>
          <li><Link href="/admin/wallet-user" passHref legacyBehavior><a><FaWallet /><span>Wallet User</span></a></Link></li>
          <li><Link href="/admin/supplier" passHref legacyBehavior><a><FaTruck /><span>Supplier</span></a></Link></li>
          <li><Link href="/admin/wallet-supplier" passHref legacyBehavior><a><FaCoins /><span>Wallet Supplier</span></a></Link></li>
          <li className="logout-item">
            <button className="logout-button" onClick={handleLogout}>
              <FaSignOutAlt /> <span className="logout-text-mobile">Cerrar sesión</span>
            </button>
          </li>
        </ul>
      </div>

      <style jsx>{`
        .admin-navbar {
          width: 92%;
          max-width: 1200px;
          margin: 20px auto;
          background-color: rgba(26, 26, 26, 0.4);
          backdrop-filter: blur(12px);
          border-radius: 20px;
          border: 1px solid #2E2E2E;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
          position: relative;
          z-index: 1000;
          box-sizing: border-box;
        }

        .navbar-content {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 24px;
          width: 100%;
          box-sizing: border-box;
        }

        .logo-image { height: 70px; object-fit: contain; display: block; }

        .hamburger {
          display: none;
          flex-direction: column;
          justify-content: space-between;
          width: 28px;
          height: 18px;
          background: transparent;
          border: none;
          cursor: pointer;
          padding: 0;
        }

        .bar { width: 100%; height: 2px; background-color: #E0E0E0; border-radius: 10px; transition: all 0.3s ease; }

        .hamburger.open .bar:nth-child(1) { transform: translateY(8px) rotate(45deg); }
        .hamburger.open .bar:nth-child(2) { opacity: 0; }
        .hamburger.open .bar:nth-child(3) { transform: translateY(-8px) rotate(-45deg); }

        /* Desktop */
        @media (min-width: 1025px) {
          .admin-nav-items {
            display: flex;
            gap: 15px;
            list-style: none;
            align-items: center;
            margin: 0;
            padding: 0;
          }
          .admin-nav-items li a {
            color: #D1D1D1;
            text-decoration: none;
            display: flex;
            align-items: center;
            gap: 6px;
            font-size: 0.85rem;
          }
          .logout-button {
            background: linear-gradient(135deg, #ff4d6d 0%, #ff233f 100%);
            border: none;
            color: white;
            padding: 8px 12px;
            border-radius: 10px;
            cursor: pointer;
          }
          .logout-text-mobile { display: none; }
        }

        /* Mobile */
        @media (max-width: 1024px) {
          .hamburger { display: flex; }
          .admin-nav-items { display: none; }
          .admin-nav-items.open {
            display: flex;
            flex-direction: column;
            position: absolute;
            top: calc(100% + 10px);
            right: 0;
            width: 240px;
            background: rgba(20, 20, 20, 0.98);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 15px;
            padding: 15px;
            gap: 5px;
            list-style: none;
            box-shadow: 0 12px 30px rgba(0,0,0,0.6);
          }
          .admin-nav-items li a {
            color: white;
            text-decoration: none;
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 10px;
          }
          .logout-button {
            width: 100%;
            background: #ff4d6d;
            border: none;
            color: white;
            padding: 12px;
            border-radius: 10px;
            display: flex;
            justify-content: center;
            gap: 8px;
          }
          .logout-text-mobile { display: inline; }
        }
      `}</style>
    </nav>
  )
}