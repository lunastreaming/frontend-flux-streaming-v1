'use client'

import { useState, useEffect } from 'react'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import {
  FaSearch,
  FaShoppingCart,
  FaClipboardList,
  FaLifeRing,
  FaCheckCircle,
  FaUndo
} from 'react-icons/fa'

import ComprasTable from '../components/tables/ComprasTable'
import SoporteTable from '../components/tables/SoporteTable'
import ResueltoTable from '../components/tables/ResueltoTable'
import ReembolsadoTable from '../components/tables/ReembolsadoTable'
import PedidoTable from '../components/tables/PedidoTable'

export default function ComprasPage() {
  const [viewFilter, setViewFilter] = useState('compras')
  const [search, setSearch] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)

  // saldo del cliente
  const [balance, setBalance] = useState(null)

  // contadores de notificaciones por vista
  const [counts, setCounts] = useState({
    compras: 0,
    pedido: 0,
    soporte: 0,
    resuelto: 0,
    reembolsado: 0
  })

  const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'

  useEffect(() => {
    const fetchBalance = async () => {
      try {
        const token = localStorage.getItem('accessToken')
        const res = await fetch(`${BASE_URL}/api/users/me`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        if (!res.ok) throw new Error(`Error ${res.status}`)
        const data = await res.json()
        setBalance(data.balance)
      } catch (err) {
        console.error('Error obteniendo saldo:', err)
        setBalance(null)
      }
    }
    fetchBalance()
  }, [])

  // cargar contadores al entrar/refrescar
  useEffect(() => {
    const token = localStorage.getItem('accessToken')

    const fetchCount = async (key, url) => {
      try {
        const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
        if (!res.ok) throw new Error()
        const data = await res.json()
        // si es Page usa totalElements, si es List usa length
        const total = Array.isArray(data)
          ? data.length
          : (data.totalElements ?? (data.content?.length || 0))
        setCounts(prev => ({ ...prev, [key]: total }))
      } catch {
        setCounts(prev => ({ ...prev, [key]: 0 }))
      }
    }

    // endpoints por vista
    fetchCount('compras', `${BASE_URL}/api/stocks/purchases`)
    fetchCount('pedido', `${BASE_URL}/api/onrequest/support/client/in-process`)
    fetchCount('soporte', `${BASE_URL}/api/support/client/me?page=0&size=50`)
    fetchCount('resuelto', `${BASE_URL}/api/support/client/in-process?page=0&size=50`)
    fetchCount('reembolsado', `${BASE_URL}/api/stocks/refunds?page=0&size=50`)
  }, [refreshKey, BASE_URL])

  const handleClick = (view) => {
    setViewFilter(view)
    setRefreshKey(prev => prev + 1)
  }

  return (
    <div className="min-h-screen page-bg text-white font-inter">
      <Navbar />
      <main className="page-container">
        {/* Cabecera con búsqueda */}
        <div className="header-row">
          <div className="search-bar">
            <FaSearch className="search-icon-inline" />
            <input
              type="text"
              placeholder="Buscar producto…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="search-input-inline"
            />
          </div>

          {/* Botones de vista con badges de notificación */}
          <div className="actions-right" role="toolbar" aria-label="Acciones de vista">
            <div
              className={`icon-btn ${viewFilter === 'compras' ? 'active' : ''}`}
              onClick={() => handleClick('compras')}
              title="Compras"
            >
              <FaShoppingCart className="icon-large" />
              <div className="icon-label">Compras</div>
              {counts.compras > 0 && <span className="badge">{counts.compras}</span>}
            </div>

            <div
              className={`icon-btn ${viewFilter === 'pedido' ? 'active' : ''}`}
              onClick={() => handleClick('pedido')}
              title="A pedido"
            >
              <FaClipboardList className="icon-large" />
              <div className="icon-label">A pedido</div>
              {counts.pedido > 0 && <span className="badge">{counts.pedido}</span>}
            </div>

            <div
              className={`icon-btn ${viewFilter === 'soporte' ? 'active' : ''}`}
              onClick={() => handleClick('soporte')}
              title="Soporte"
            >
              <FaLifeRing className="icon-large" />
              <div className="icon-label">Soporte</div>
              {counts.soporte > 0 && <span className="badge">{counts.soporte}</span>}
            </div>

            <div
              className={`icon-btn ${viewFilter === 'resuelto' ? 'active' : ''}`}
              onClick={() => handleClick('resuelto')}
              title="Resuelto"
            >
              <FaCheckCircle className="icon-large" />
              <div className="icon-label">Resuelto</div>
              {counts.resuelto > 0 && <span className="badge">{counts.resuelto}</span>}
            </div>

            <div
              className={`icon-btn ${viewFilter === 'reembolsado' ? 'active' : ''}`}
              onClick={() => handleClick('reembolsado')}
              title="Reembolsado"
            >
              <FaUndo className="icon-large" />
              <div className="icon-label">Reembolsado</div>
              {counts.reembolsado > 0 && <span className="badge">{counts.reembolsado}</span>}
            </div>
          </div>
        </div>

        {/* Render condicional de tablas */}
        {viewFilter === 'compras' && (
          <ComprasTable
            key={refreshKey}
            search={search}
            endpoint="purchases"
            balance={balance}
          />
        )}
        {viewFilter === 'pedido' && <PedidoTable key={refreshKey} search={search} />}
        {viewFilter === 'soporte' && <SoporteTable key={refreshKey} search={search} />}
        {viewFilter === 'resuelto' && <ResueltoTable key={refreshKey} search={search} />}
        {viewFilter === 'reembolsado' && <ReembolsadoTable key={refreshKey} search={search} />}
      </main>
      <Footer />

      <style jsx>{`
        .page-bg { background: radial-gradient(circle at top, #0b1220, #05060a); min-height: 100vh; }
        .page-container { padding: 60px 24px; max-width: 1200px; margin: 0 auto; }
        .header-row { display:flex; justify-content:space-between; align-items:center; gap:12px; margin-bottom:24px; }
        .search-bar { display:flex; align-items:center; background: rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.06); border-radius:10px; padding:0 12px; height:38px; max-width:520px; width:100%; }
        .search-icon-inline { color:#9fb4c8; margin-right:8px; }
        .search-input-inline { flex:1; background:transparent; border:none; color:#fff; outline:none; font-size:0.95rem; }
        .actions-right { display:flex; gap:12px; align-items:center; justify-content:flex-end; }
        .icon-btn { position:relative; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:6px; width:72px; height:72px; border-radius:12px; background: rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.04); color:#cfe7ff; cursor:pointer; transition: transform 120ms ease, box-shadow 120ms ease, background 120ms ease; text-align:center; padding:8px; }
        .icon-btn.active { background: linear-gradient(90deg,#06b6d4,#3b82f6); color:#021018; border: none; box-shadow: 0 8px 28px rgba(59,130,246,0.18); }
        .icon-large { font-size: 20px; }
        .icon-label { font-size: 12px; font-weight:700; margin-top:2px; }
        .badge {
          position:absolute;
          top:6px;
          right:6px;
          min-width:22px;
          height:22px;
          padding:0 6px;
          display:flex;
          align-items:center;
          justify-content:center;
          border-radius:11px;
          background:#ef4444;
          color:#fff;
          font-size:12px;
          font-weight:700;
          box-shadow: 0 2px 8px rgba(239,68,68,0.35);
        }
      `}</style>
    </div>
  )
}