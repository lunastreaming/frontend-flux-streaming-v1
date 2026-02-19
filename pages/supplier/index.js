// pages/supplier/index.js
import Head from 'next/head'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import NavBarSupplier from '../../components/NavBarSupplier'
import {
  FaBoxes, FaListAlt, FaChartLine, FaClipboardList,
  FaHeadset, FaRedo, FaHourglassEnd, FaWallet
} from 'react-icons/fa'

export default function SupplierIndex() {
  const [counts, setCounts] = useState({
    orders: 0,
    sales: 0,
    support: 0,
    renewed: 0,
    expired: 0
  })

  const BASE_URL = process.env.NEXT_PUBLIC_API_URL ||
''
  const token = typeof window !== 'undefined' ?
localStorage.getItem('accessToken') : null

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
          expired: expired.totalElements ??
0
        })
      })
      .catch(err => console.error('Error cargando conteos', err))
  }, [token])

  const cards = [
    { href: '/supplier/products', title: 'Productos', icon: <FaBoxes />, desc: 'Gestiona tus productos' },
    { href: '/supplier/stocks', title: 'Stocks', icon: <FaListAlt />, desc: 'Control de stocks' },
    { href: '/supplier/sales', title: 'Ventas', icon: <FaChartLine />, desc: 'Resumen de ventas' },
    { href: '/supplier/orders', title: 'Órdenes', icon: <FaClipboardList />, desc: 
 'Stocks a pedido' },
    { href: '/supplier/support', title: 'Soporte', icon: <FaHeadset />, desc: 'Tickets de soporte' },
    { href: '/supplier/renewal', title: 'Renewal', icon: <FaRedo />, desc: 'Renovaciones de stocks' },
    { href: '/supplier/expired', title: 'Vencidas', icon: <FaHourglassEnd />, desc: 'Stocks vencidos' },
    { href: '/supplier/wallet', title: 'Billetera', icon: <FaWallet />, desc: 'Saldo, recargas y movimientos' },
  ]

  return (
    <>
      <Head>
        <title>Panel Supplier |
Flux Streaming</title>
      </Head>

      <div className="page-bg">
        {/* Pasamos counts al NavBarSupplier */}
        {/* Asegúrate de incluir <NavBarSupplier counts={counts} /> si es necesario */}

        <main className="container">
          <header className="hero">
            <div>
              <h1>Panel de Proveedor</h1>
       
              <p className="lead">Accede rápidamente a las secciones principales de tu espacio de 
 proveedor</p>
            </div>
          </header>

          <section className="grid">
            {cards.map(c => (
              <Link key={c.href} href={c.href} passHref legacyBehavior>
                
 <a className="card" aria-label={c.title}>
                 
                  <div className="icon">{c.icon}</div>
                  <div className="body">
                    <h3>{c.title}</h3>
                    <p>{c.desc}</p>
   
                </div>
                </a>
     
              </Link>
            ))}
          </section>
        </main>
      </div>

      <style jsx>{`
       
  .page-bg {
          min-height: 100vh;
 /* 🚨 SOLUCIÓN: Cambiado de degradado opaco a transparente */
          background: transparent;
 color: #e6e6e6;
          padding-bottom: 48px;
        }
        .container {
          max-width: 1200px;
 margin: 12px auto 0;
          padding: 20px 24px;
        }
        .hero {
          display: flex;
 align-items: center;
          justify-content: space-between;
          gap: 20px;
          margin: 18px 0 22px;
          background: rgba(255,255,255,0.02);
          border-radius: 12px;
          padding: 18px;
          border: 1px solid rgba(255,255,255,0.03);
 }
        .hero h1 { margin: 0; font-size: 1.6rem; font-weight: 800;
 }
        .lead { margin: 4px 0 0; color: #9aa0a6;
 }

        .grid {
          display: grid;
 grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 14px;
        }

        .card {
          display: flex;
 gap: 12px;
          align-items: center;
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.035);
          padding: 14px;
          border-radius: 12px;
          text-decoration: none;
          color: inherit;
 transition: transform .12s ease, box-shadow .12s ease, background .12s ease;
 }
        .card:hover {
          transform: translateY(-6px);
 box-shadow: 0 12px 30px rgba(2,6,23,0.6);
          background: linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01));
        }
        .icon {
          width: 52px;
 height: 52px;
          border-radius: 10px;
          display: grid;
          place-items: center;
          background: linear-gradient(135deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01));
          border: 1px solid rgba(255,255,255,0.02);
          font-size: 20px;
          color: #d1d5db;
 }
        .body h3 { margin: 0 0 6px; font-size: 1rem; font-weight: 800;
 color: #ffffff; }
        .body p { margin: 0; color: #9aa0a6; font-size: 0.9rem;
 }

        @media (max-width: 720px) {
          /* 💡 CORRECCIÓN AÑADIDA: Asegura el centrado y evita el desbordamiento del contenedor principal */
          .container {
            width: 100%;
            padding: 20px 16px; /* Ajusta el padding lateral para dejar espacio sin desbordar */
            margin: 12px auto 0;
            max-width: 100vw;
          }

          /* 💡 CORRECCIÓN ANTERIOR: Centra el contenido del encabezado */
          .hero { 
            flex-direction: column;
            align-items: center; 
            text-align: center;
 }
          .grid { 
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); /* Reducimos el minmax si es necesario */
            /* Se asegura que la rejilla no se desborde */
            width: 100%;
          }

          .hero h1 {
            text-align: center;
          }
          .lead {
            text-align: center;
            /* Opción: Ajustar el ancho máximo del texto lead para que no sea demasiado largo en pantallas pequeñas */
            max-width: 90%; 
            margin-left: auto;
            margin-right: auto;
          }
 }
        }
      `}</style>
    </>
  )
}