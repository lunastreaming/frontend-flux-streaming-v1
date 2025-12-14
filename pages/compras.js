// ComprasPage.js
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
  const [balance, setBalance] = useState(null)
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
  }, [BASE_URL])

  useEffect(() => {
    const token = localStorage.getItem('accessToken')
    const fetchCount = async (key, url) => {
      try {
        const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
        if (!res.ok) throw new Error()
        const data = await res.json()
        const total = Array.isArray(data)
          ? data.length
          : (data.totalElements ?? (data.content?.length || 0))
        setCounts(prev => ({ ...prev, [key]: total }))
      } catch {
        setCounts(prev => ({ ...prev, [key]: 0 }))
      }
    }

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
        
        {/* Cabecera Responsiva */}
        <div className="header-row">
          
          {/* ⭐ 1. Botones de navegación (Scroll horizontal en móvil) */}
          <div className="actions-right" role="toolbar" aria-label="Filtros de vista">
            {[
              { id: 'compras', label: 'Compras', icon: FaShoppingCart },
              { id: 'pedido', label: 'A pedido', icon: FaClipboardList },
              { id: 'soporte', label: 'Soporte', icon: FaLifeRing },
              { id: 'resuelto', label: 'Resuelto', icon: FaCheckCircle },
              { id: 'reembolsado', label: 'Reembolsado', icon: FaUndo }
            ].map((item) => (
              <div
                key={item.id}
                className={`icon-btn ${viewFilter === item.id ? 'active' : ''}`}
                onClick={() => handleClick(item.id)}
                title={item.label}
              >
                <item.icon className="icon-large" />
                <div className="icon-label">{item.label}</div>
                {counts[item.id] > 0 && <span className="badge">{counts[item.id]}</span>}
              </div>
            ))}
          </div>

          {/* ⭐ 2. Barra de búsqueda */}
          <div className="search-bar">
            <FaSearch className="search-icon-inline" />
            <input
              type="text"
              placeholder="Buscar producto..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="search-input-inline"
            />
          </div>
        </div>

        {/* Tablas */}
        <div className="table-container">
          {viewFilter === 'compras' && (
            <ComprasTable key={refreshKey} search={search} endpoint="purchases" balance={balance} />
          )}
          {viewFilter === 'pedido' && <PedidoTable key={refreshKey} search={search} />}
          {viewFilter === 'soporte' && <SoporteTable key={refreshKey} search={search} />}
          {viewFilter === 'resuelto' && <ResueltoTable key={refreshKey} search={search} />}
          {viewFilter === 'reembolsado' && <ReembolsadoTable key={refreshKey} search={search} />}
        </div>
      </main>
      <Footer />
      
      <style jsx>{`
        .page-bg { 
          background: transparent;
          min-height: 100vh;
        }
        
        .page-container { 
          padding: 80px 16px 40px; 
          max-width: 1200px; 
          margin: 0 auto;
          width: 100%;
        }

        /* --- Header Layout --- */
        .header-row {
          display: flex;
          flex-direction: column; 
          gap: 16px;
          margin-bottom: 24px;
        }

        /* --- Search Bar (Debajo de los botones en móvil) --- */
        .search-bar {
          display: flex;
          align-items: center;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 12px;
          padding: 0 16px;
          height: 48px;
          width: 100%;
        }
        
        .search-icon-inline { color: #9fb4c8;
          margin-right: 12px; }
        
        .search-input-inline { 
          flex: 1;
          background: transparent; 
          border: none; 
          color: #fff; 
          outline: none; 
          font-size: 1rem;
          width: 100%;
        }

        /* --- Actions / Navigation (Scroll Horizontal y FIX de recorte) --- */
        .actions-right {
          display: flex;
          gap: 10px;
          overflow-x: auto; /* Scroll horizontal habilitado */
          padding-bottom: 8px;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: none;
          
          /* Usamos padding del .page-container (16px) */
          margin-left: 0;
          padding-left: 0; 
          padding-right: 0; 
          width: 100%; 
        }
        
        .actions-right::-webkit-scrollbar {
          display: none;
        }
        
        /* ⭐ FIX FINAL: Espaciador invisible para garantizar que el último badge se vea completamente */
        .actions-right::after {
            content: "";
            min-width: 30px; /* Aumentamos el espacio extra para scroll */
            height: 1px;
            display: block;
            flex-shrink: 0;
        }


        .icon-btn {
          position: relative;
          display: flex;
          flex-direction: column; 
          align-items: center;
          justify-content: center;
          gap: 6px;
          
          /* ⭐ AUMENTO DE TAMAÑO: Usamos el tamaño de escritorio (72px) en móvil para dar más aire */
          min-width: 72px; 
          width: 72px;
          height: 72px;
          
          border-radius: 12px;
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.04);
          color: #cfe7ff;
          cursor: pointer;
          transition: all 0.2s ease;
          flex-shrink: 0; 
        }

        .icon-btn.active { 
          background: linear-gradient(90deg, #06b6d4, #3b82f6);
          color: #021018; 
          border: none; 
          box-shadow: 0 4px 12px rgba(59,130,246,0.3);
          transform: translateY(-2px);
        }

        .icon-large { font-size: 20px;
        }
        .icon-label { font-size: 11px; font-weight: 700;
        }

        .badge {
          position: absolute;
          top: -4px;
          right: 0; /* Mantenemos el FIX: Asegura que el badge no sobresalga del botón */
          min-width: 20px;
          height: 20px;
          padding: 0 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 10px;
          background: #ef4444;
          color: #fff;
          font-size: 11px;
          font-weight: 700;
          box-shadow: 0 2px 4px rgba(0,0,0,0.3);
          z-index: 9999; 
        }

        /* --- Estilos Desktop (Min-Width 768px) --- */
        @media (min-width: 768px) {
          .page-container {
            padding: 80px 24px;
          }

          .header-row {
            /* Invertimos el orden para desktop: buscador a la izquierda, botones a la derecha */
            flex-direction: row; 
            justify-content: space-between;
            align-items: center;
          }

          .search-bar {
            order: 1; /* Coloca el buscador a la izquierda */
            width: 400px;
            height: 42px;
          }

          .actions-right {
            order: 2; /* Coloca los botones a la derecha */
            overflow-x: visible; 
            justify-content: flex-end;
            width: auto; 
          }
          
          .actions-right::after {
            content: none; /* Eliminar el espaciador en desktop */
          }

          .icon-btn {
            width: 72px;
            height: 72px;
          }
          
          .icon-btn:hover {
            background: rgba(255,255,255,0.05);
            transform: translateY(-2px);
          }
        }
      `}</style>
    </div>
  )
}