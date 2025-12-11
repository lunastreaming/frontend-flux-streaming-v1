// components/SupplierLayout.js
'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'   // App Router
import NavBarSupplier from './NavBarSupplier'

export default function SupplierLayout({ children }) {
  const [counts, setCounts] = useState({
    orders: 0,
    sales: 0,
    support: 0,
    renewed: 0,
    expired: 0
  })
  const [authToken, setAuthToken] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const BASE_URL = process.env.NEXT_PUBLIC_API_URL || ''
  const pathname = usePathname()

  // rutas donde NO debe aparecer el navbar
  const excludedRoutes = [
    '/supplier/loginSupplier',
    '/supplier/registerSupplier'
  ]
  const shouldShowNavbar = !excludedRoutes.includes(pathname)

  // cargar token en cliente
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const t = window.localStorage.getItem('accessToken')
      setAuthToken(t || null)
    }
  }, [])

  // cargar conteos cuando hay token
  useEffect(() => {
    if (!authToken) {
      setCounts({ orders: 0, sales: 0, support: 0, renewed: 0, expired: 0 })
      setLoading(false)
      return
    }

    const controller = new AbortController()
    const headers = { Authorization: `Bearer ${authToken}` }
    const SIZE = 50

    async function loadCounts() {
      setLoading(true)
      setError(null)
      try {
        const [ordersRes, salesRes, supportRes, renewedRes, expiredRes] =
          await Promise.all([
            fetch(`${BASE_URL}/api/onrequest/support/provider/in-process?page=0&size=${SIZE}`, { headers, signal: controller.signal }),
            fetch(`${BASE_URL}/api/stocks/provider/sales?page=0&size=${SIZE}`, { headers, signal: controller.signal }),
            fetch(`${BASE_URL}/api/support/provider/me?page=0&size=${SIZE}`, { headers, signal: controller.signal }),
            fetch(`${BASE_URL}/api/supplier/sales/provider/renewed?page=0&size=${SIZE}`, { headers, signal: controller.signal }),
            fetch(`${BASE_URL}/api/supplier/supplier/stocks/expired?page=0&size=${SIZE}`, { headers, signal: controller.signal })
          ])

        const [orders, sales, support, renewed, expired] = await Promise.all([
          ordersRes.json(),
          salesRes.json(),
          supportRes.json(),
          renewedRes.json(),
          expiredRes.json()
        ])

        setCounts({
          orders: orders?.totalElements ?? (Array.isArray(orders) ? orders.length : 0),
          sales: sales?.totalElements ?? (Array.isArray(sales) ? sales.length : 0),
          support: support?.totalElements ?? (Array.isArray(support) ? support.length : 0),
          renewed: renewed?.totalElements ?? (Array.isArray(renewed) ? renewed.length : 0),
          expired: expired?.totalElements ?? (Array.isArray(expired) ? expired.length : 0)
        })
      } catch (err) {
        if (controller.signal.aborted) return
        setError(err.message || 'Error cargando conteos')
        setCounts({ orders: 0, sales: 0, support: 0, renewed: 0, expired: 0 })
      } finally {
        setLoading(false)
      }
    }

    loadCounts()
    const interval = setInterval(loadCounts, 60_000) // refresco cada 60s
    return () => {
      clearInterval(interval)
      controller.abort()
    }
  }, [authToken, BASE_URL])

  return (
    <div className="supplier-layout">
      {shouldShowNavbar && <NavBarSupplier counts={counts} loading={loading} error={error} />}
      <main>{children}</main>
      <style jsx>{`
        .supplier-layout { min-height: 100vh; display: flex; flex-direction: column; }
        main { flex: 1; }
      `}</style>
    </div>
  )
}