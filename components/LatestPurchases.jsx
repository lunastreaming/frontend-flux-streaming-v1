import React, { useState, useEffect } from 'react';
import { FaArrowRight, FaCalendarAlt, FaShoppingBag, FaSyncAlt } from 'react-icons/fa';

export default function LatestPurchases({ userId, apiBase, ensureValidAccess }) {
  const [purchases, setPurchases] = useState([]);
  const [limit, setLimit] = useState(10);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchPurchases = async () => {
      setLoading(true);
      try {
        let token = null;
        try {
          token = typeof ensureValidAccess === 'function' ? await ensureValidAccess() : null;
        } catch (e) {
          console.warn('ensureValidAccess error en LatestPurchases', e);
        }

        if (!token && typeof window !== 'undefined') {
          token = localStorage.getItem('accessToken');
        }

        const res = await fetch(`${apiBase}/api/wallet/${userId}/transactions?type=purchase&limit=${limit}`, {
          headers: {
            'Authorization': token ? `Bearer ${token}` : '',
            'Content-Type': 'application/json'
          }
        });

        if (!res.ok) throw new Error("Error en la respuesta del servidor");
        
        const data = await res.json();
        setPurchases(data);
      } catch (error) {
        console.error("Error cargando compras", error);
      } finally {
        setLoading(false);
      }
    };

    if (userId && apiBase) {
      fetchPurchases();
    }
  }, [userId, limit, apiBase, ensureValidAccess]);

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-PE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="history-container">
      {/* Header interno del Modal */}
      <div className="history-header">
        <div className="header-title-area">
          <div className="icon-badge purchase-badge">
            <FaShoppingBag size={16} />
          </div>
          <div>
            <h4>Ventas / Consumos</h4>
            <span className="subtitle">Historial de órdenes liquidadas</span>
          </div>
        </div>
        
        {/* Selector Segmentado Moderno */}
        <div className="segmented-control">
          {[5, 10, 20].map((num) => (
            <button
              key={num}
              type="button"
              className={`segment-btn ${limit === num ? 'active' : ''}`}
              onClick={() => setLimit(num)}
            >
              {num}
            </button>
          ))}
        </div>
      </div>

      {/* Cuerpo / Listado */}
      {loading ? (
        <div className="history-loading">
          <FaSyncAlt className="spin-animation" size={20} />
          <p>Cargando transacciones...</p>
        </div>
      ) : purchases.length === 0 ? (
        <div className="history-empty">
          No se encontraron ventas procesadas para este usuario.
        </div>
      ) : (
        <div className="history-list">
          {purchases.map((tx) => (
            <div key={tx.id} className="history-item">
              {/* Contenedor Izquierdo con ancho mínimo seguro */}
              <div className="item-left">
                <div className="arrow-box">
                  <FaArrowRight style={{ transform: 'rotate(-45deg)' }} size={10} />
                </div>
                <div className="item-text-wrapper">
                  <p className="item-description" title={tx.description || 'Consumo de Servicio'}>
                    {tx.description || 'Consumo de Servicio'}
                  </p>
                  <span className="item-date">
                    <FaCalendarAlt size={10} style={{ marginRight: '4px' }} />
                    {formatDate(tx.createdAt)}
                  </span>
                </div>
              </div>
              
              {/* Contenedor Derecho aislado y alineado */}
              <div className="item-right">
                <span className="item-amount purchase-amount">
                  {tx.currency} {tx.amount.toFixed(2)}
                </span>
                <span className="item-badge font-mono text-slate-400">PROCESSED</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Estilos locales scoped corregidos */}
      <style jsx>{`
        .history-container {
          width: 100%;
          color: #e2e8f0;
          font-family: system-ui, -apple-system, sans-serif;
        }
        .history-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: #0f172a;
          padding: 0.85rem 1rem;
          border-radius: 14px;
          margin-bottom: 1.25rem;
          border: 1px solid rgba(255, 255, 255, 0.05);
          box-shadow: inset 0 1px 1px rgba(255, 255, 255, 0.05);
        }
        .header-title-area {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }
        .icon-badge {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 34px;
          height: 34px;
          border-radius: 8px;
        }
        .purchase-badge {
          background: rgba(99, 102, 241, 0.15);
          color: #818cf8;
        }
        .history-header h4 {
          margin: 0;
          font-size: 0.95rem;
          font-weight: 600;
          color: #fff;
        }
        .subtitle {
          font-size: 0.75rem;
          color: #94a3b8;
          display: block;
        }
        
        .history-list {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          max-height: 280px;
          overflow-y: auto;
          padding-right: 4px;
        }
        .history-list::-webkit-scrollbar {
          width: 4px;
        }
        .history-list::-webkit-scrollbar-thumb {
          background: #334155;
          border-radius: 2px;
        }
        
        /* ITEM LAYOUT FIX */
        .history-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: #15222e;
          border: 1px solid #1e293b;
          padding: 0.75rem;
          border-radius: 8px;
          transition: border-color 0.2s ease;
          gap: 1rem; /* Asegura separación mínima entre izquierda y derecha */
        }
        .history-item:hover {
          border-color: #334155;
        }
        .item-left {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          min-width: 0; /* Crucial para activar el truncado flexbox */
          flex: 1;      /* Ocupa el espacio disponible de forma controlada */
        }
        .arrow-box {
          background: #1e293b;
          color: #94a3b8;
          padding: 5px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .item-text-wrapper {
          min-width: 0; /* Permite que el bloque de textos colapse si es necesario */
          flex: 1;
        }
        .item-description {
          margin: 0;
          font-size: 0.85rem;
          font-weight: 500;
          color: #e2e8f0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis; /* Puntos suspensivos perfectos */
          width: 100%;
        }
        .item-date {
          font-size: 0.7rem;
          color: #64748b;
          display: flex;
          align-items: center;
          margin-top: 2px;
        }
        .item-right {
          text-align: right;
          flex-shrink: 0; /* Evita por completo que el precio se comprima o mutile */
        }
        .item-amount {
          font-family: monospace;
          font-size: 0.95rem;
          font-weight: 700;
          display: block;
        }
        .purchase-amount {
          color: #f1f5f9;
        }
        .item-badge {
          font-size: 0.6rem;
          font-weight: 800;
          color: #475569;
          letter-spacing: 0.5px;
        }
        
        .history-loading {
          text-align: center;
          padding: 2rem;
          color: #6366f1;
        }
        .history-loading p {
          margin: 0.5rem 0 0 0;
          font-size: 0.8rem;
          color: #94a3b8;
        }
        .history-empty {
          text-align: center;
          padding: 2rem;
          color: #64748b;
          font-size: 0.85rem;
          font-style: italic;
        }
        .spin-animation {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .segmented-control {
          display: flex;
          background: #1e293b;
          padding: 3px;
          border-radius: 8px;
          border: 1px solid rgba(255, 255, 255, 0.03);
        }
        .segment-btn {
          background: transparent;
          border: none;
          color: #94a3b8;
          font-size: 0.75rem;
          font-weight: 600;
          padding: 5px 12px;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .segment-btn:hover {
          color: #fff;
        }
        .segment-btn.active {
          background: #0f172a;
          color: #818cf8;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.4);
        }

        @media (max-width: 480px) {
          .history-item {
            padding: 0.6rem;
          }
          .item-description {
            font-size: 0.8rem;
          }
          .item-amount {
            font-size: 0.85rem;
          }
        }
      `}</style>
    </div>
  );
}