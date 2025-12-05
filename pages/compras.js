'use client'

import { useState } from 'react'
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
  // Vista por defecto = 'compras'
  const [viewFilter, setViewFilter] = useState('compras')
  const [search, setSearch] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)

  // Handler genérico: cambia vista y fuerza remount
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

          {/* Botones de vista */}
          <div className="actions-right" role="toolbar" aria-label="Acciones de vista">
            <div
              className={`icon-btn ${viewFilter === 'compras' ? 'active' : ''}`}
              onClick={() => handleClick('compras')}
              title="Compras"
            >
              <FaShoppingCart className="icon-large" />
              <div className="icon-label">Compras</div>
            </div>

            <div
              className={`icon-btn ${viewFilter === 'pedido' ? 'active' : ''}`}
              onClick={() => handleClick('pedido')}
              title="A pedido"
            >
              <FaClipboardList className="icon-large" />
              <div className="icon-label">A pedido</div>
            </div>

            <div
              className={`icon-btn ${viewFilter === 'soporte' ? 'active' : ''}`}
              onClick={() => handleClick('soporte')}
              title="Soporte"
            >
              <FaLifeRing className="icon-large" />
              <div className="icon-label">Soporte</div>
            </div>

            <div
              className={`icon-btn ${viewFilter === 'resuelto' ? 'active' : ''}`}
              onClick={() => handleClick('resuelto')}
              title="Resuelto"
            >
              <FaCheckCircle className="icon-large" />
              <div className="icon-label">Resuelto</div>
            </div>

            <div
              className={`icon-btn ${viewFilter === 'reembolsado' ? 'active' : ''}`}
              onClick={() => handleClick('reembolsado')}
              title="Reembolsado"
            >
              <FaUndo className="icon-large" />
              <div className="icon-label">Reembolsado</div>
            </div>
          </div>
        </div>

        {/* Renderizado condicional de tablas con refreshKey */}
        {viewFilter === 'compras' && (
          <ComprasTable key={refreshKey} search={search} endpoint="purchases" />
        )}
        {viewFilter === 'pedido' && (
  <PedidoTable key={refreshKey} search={search} />
)}
        {viewFilter === 'soporte' && (
          <SoporteTable key={refreshKey} search={search} />
        )}
        {viewFilter === 'resuelto' && (
          <ResueltoTable key={refreshKey} search={search} />
        )}
        {viewFilter === 'reembolsado' && (
  <ReembolsadoTable key={refreshKey} search={search} />
)}
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
        .icon-btn { display:flex; flex-direction:column; align-items:center; justify-content:center; gap:6px; width:72px; height:72px; border-radius:12px; background: rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.04); color:#cfe7ff; cursor:pointer; transition: transform 120ms ease, box-shadow 120ms ease, background 120ms ease; text-align:center; padding:8px; }
        .icon-btn.active { background: linear-gradient(90deg,#06b6d4,#3b82f6); color:#021018; border: none; box-shadow: 0 8px 28px rgba(59,130,246,0.18); }
        .icon-large { font-size: 20px; }
        .icon-label { font-size: 12px; font-weight:700; margin-top:2px; }
      `}</style>
    </div>
  )
}