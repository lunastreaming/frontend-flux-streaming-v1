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
            <img src="/logo.png" alt="Logo" className="logo-image" />
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

        <ul className={`admin-nav-items ${menuOpen ? 'open' : ''}`}>
          <li><Link href="/admin/solds" passHref legacyBehavior><a><FaChartLine /><span>Solds</span></a></Link></li>
          <li><Link href="/admin/finance" passHref legacyBehavior><a><FaMoneyBill /><span>Finance</span></a></Link></li>
          <li><Link href="/admin/category" passHref legacyBehavior><a><FaTags /><span>Category</span></a></Link></li>
          <li><Link href="/admin/other" passHref legacyBehavior><a><FaBoxOpen /><span>Other</span></a></Link></li>
          <li><Link href="/admin/users" passHref legacyBehavior><a><FaUsers /><span>Users</span></a></Link></li>
          <li><Link href="/admin/wallet-user" passHref legacyBehavior><a><FaWallet /><span>Wallet User</span></a></Link></li>
          <li><Link href="/admin/supplier" passHref legacyBehavior><a><FaTruck /><span>Supplier</span></a></Link></li>
          <li><Link href="/admin/wallet-supplier" passHref legacyBehavior><a><FaCoins /><span>Wallet Supplier</span></a></Link></li>
          <li className="logout-item-li">
            <button className="logout-button-red" onClick={handleLogout}>
              <FaSignOutAlt /> <span className="logout-text">Cerrar sesión</span>
            </button>
          </li>
        </ul>
      </div>

      <style jsx>{`
        .admin-navbar {
          width: 96%;
          max-width: 1500px;
          margin: 25px auto;
          background-color: rgba(26, 26, 26, 0.45);
          backdrop-filter: blur(15px);
          border-radius: 20px;
          border: 1px solid #333;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
          position: relative;
          z-index: 1000;
          box-sizing: border-box;
        }

        .navbar-content {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 30px;
          width: 100%;
          box-sizing: border-box;
        }

        .logo-image {
          height: 80px;
          display: block;
        }

        /* --- VISTA PC --- */
        @media (min-width: 1025px) {
          .hamburger { display: none; }
          
          .admin-nav-items {
            display: flex;
            list-style: none;
            margin: 0;
            padding: 0;
            flex: 1;
            justify-content: space-evenly;
            align-items: center;
          }

          .admin-nav-items li a {
            display: flex;
            align-items: center;
            gap: 10px;
            color: #E0E0E0;
            text-decoration: none;
            font-size: 1.05rem; /* Mantiene el tamaño grande */
            font-weight: 400;   /* Texto normal, sin negrita */
            letter-spacing: 0.5px;
            white-space: nowrap;
            transition: all 0.3s ease;
          }

          .admin-nav-items li a:hover {
            color: #ffffff;
            transform: translateY(-2px);
          }

          .logout-button-red {
            background: linear-gradient(135deg, #ff4d6d 0%, #ff233f 100%);
            border: none;
            color: white;
            padding: 10px 20px;
            border-radius: 12px;
            display: flex;
            align-items: center;
            gap: 10px;
            cursor: pointer;
            font-size: 1rem;
            font-weight: 500; /* Un poco más de peso para el botón pero no negrita total */
            transition: all 0.3s ease;
          }
        }

        /* --- VISTA MÓVIL --- */
        @media (max-width: 1024px) {
          .logo-image { height: 65px; }
          .hamburger {
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            width: 28px;
            height: 18px;
            background: transparent;
            border: none;
            padding: 0;
          }
          .bar { width: 100%; height: 2px; background-color: #fff; }
          
          .admin-nav-items { display: none; }
          .admin-nav-items.open {
            display: flex;
            flex-direction: column;
            position: absolute;
            top: calc(100% + 15px);
            right: 0;
            width: 280px;
            background: rgba(18, 18, 18, 0.98);
            border: 1px solid #333;
            border-radius: 18px;
            padding: 20px;
            gap: 10px;
            list-style: none;
          }
          .admin-nav-items li a {
            color: white;
            font-size: 1.1rem;
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 10px;
          }
          .logout-button-red { width: 100%; padding: 15px; border-radius: 12px; background: #ff233f; color: white; border: none; }
        }
      `}</style>
    </nav>
  )
}