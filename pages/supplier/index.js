// pages/supplier/index.js
import Head from 'next/head'
import Link from 'next/link'
import AdminNavBar from '../../components/NavBarSupplier' // usar el navbar existente
import { FaBoxes, FaListAlt, FaChartLine, FaClipboardList, FaHeadset, FaRedo, FaHourglassEnd, FaWallet } from 'react-icons/fa'

export default function SupplierIndex() {
  const cards = [
    { href: '/supplier/products', title: 'Productos', icon: <FaBoxes /> , desc: 'Gestiona tus catálogos y colecciones' },
    { href: '/supplier/items', title: 'Items', icon: <FaListAlt /> , desc: 'Control de unidades y SKUs' },
    { href: '/supplier/sales', title: 'Ventas', icon: <FaChartLine /> , desc: 'Resumen de ventas y métricas' },
    { href: '/supplier/orders', title: 'Órdenes', icon: <FaClipboardList /> , desc: 'Revisión y fulfillment' },
    { href: '/supplier/support', title: 'Soporte', icon: <FaHeadset /> , desc: 'Tickets y comunicación con clientes' },
    { href: '/supplier/renewal', title: 'Renewal', icon: <FaRedo /> , desc: 'Renovaciones y suscripciones' },
    { href: '/supplier/expired', title: 'Vencidas', icon: <FaHourglassEnd /> , desc: 'Items o suscripciones vencidas' },
    { href: '/supplier/wallet', title: 'Billetera', icon: <FaWallet /> , desc: 'Balance, recargas y movimientos' },
  ]

  return (
    <>
      <Head>
        <title>Panel Supplier | Luna Streaming</title>
      </Head>

      <div className="page-bg">
        <AdminNavBar />

        <main className="container">
          <header className="hero">
            <div>
              <h1>Panel de Proveedor</h1>
              <p className="lead">Accede rápidamente a las secciones principales de tu espacio de proveedor</p>
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
          background: linear-gradient(180deg, #070707 0%, #0f1724 100%);
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
        .hero h1 { margin: 0; font-size: 1.6rem; font-weight: 800; }
        .lead { margin: 4px 0 0; color: #9aa0a6; }

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
        .body h3 { margin: 0 0 6px; font-size: 1rem; font-weight: 800; color: #ffffff; }
        .body p { margin: 0; color: #9aa0a6; font-size: 0.9rem; }

        @media (max-width: 720px) {
          .hero { flex-direction: column; align-items: flex-start; }
          .grid { grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); }
        }
      `}</style>
    </>
  )
}