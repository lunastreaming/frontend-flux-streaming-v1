// components/SupplierLayout.js
import { useEffect, useState } from 'react'
import NavBarSupplier from './NavBarSupplier'

export default function SupplierLayout({ children }) {
  const [counts, setCounts] = useState({
    orders: 0,
    sales: 0,
    support: 0,
    renewed: 0,
    expired: 0
  })

  const BASE_URL = process.env.NEXT_PUBLIC_API_URL || ''
  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null

  useEffect(() => {
    if (!token) return
    const headers = { Authorization: `Bearer ${token}` }

    Promise.all([
      fetch(`${BASE_URL}/api/onrequest/support/provider/in-process?page=0&size=20`, { headers }).then(r => r.json()),
      fetch(`${BASE_URL}/api/stocks/provider/sales?page=0&size=20`, { headers }).then(r => r.json()),
      fetch(`${BASE_URL}/api/support/provider/me?page=0&size=50`, { headers }).then(r => r.json()),
      fetch(`${BASE_URL}/api/supplier/sales/provider/renewed?page=0&size=20`, { headers }).then(r => r.json()),
      fetch(`${BASE_URL}/api/supplier/supplier/stocks/expired?page=0&size=30`, { headers }).then(r => r.json())
    ])
      .then(([orders, sales, support, renewed, expired]) => {
        setCounts({
          orders: orders.totalElements ?? 0,
          sales: sales.totalElements ?? 0,
          support: support.totalElements ?? 0,
          renewed: renewed.totalElements ?? 0,
          expired: expired.totalElements ?? 0
        })
      })
      .catch(err => console.error('Error cargando conteos', err))
  }, [token])

  return (
    <div className="supplier-layout">
      <NavBarSupplier counts={counts} />
      <main>{children}</main>
    </div>
  )
}