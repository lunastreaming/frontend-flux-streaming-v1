import React, { useState, useEffect } from 'react';
import { FaArrowLeft, FaCalendarAlt, FaSyncAlt } from 'react-icons/fa';

export default function LatestRecharges({ userId, apiBase, ensureValidAccess }) {
  const [recharges, setRecharges] = useState([]);
  const [limit, setLimit] = useState(10);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchRecharges = async () => {
      setLoading(true);
      try {
        let token = null;
        try {
          token = typeof ensureValidAccess === 'function' ? await ensureValidAccess() : null;
        } catch (e) {
          console.warn('ensureValidAccess error en LatestRecharges', e);
        }

        if (!token && typeof window !== 'undefined') {
          token = localStorage.getItem('accessToken');
        }

        const res = await fetch(`${apiBase}/api/wallet/${userId}/transactions?type=recharge&limit=${limit}`, {
          headers: {
            'Authorization': token ? `Bearer ${token}` : '',
            'Content-Type': 'application/json'
          }
        });

        if (!res.ok) throw new Error("Error en la respuesta del servidor");
        
        const data = await res.json();
        setRecharges(data);
      } catch (error) {
        console.error("Error cargando recargas", error);
      } finally {
        setLoading(false);
      }
    };

    if (userId && apiBase) {
      fetchRecharges();
    }
  }, [userId, limit, apiBase, ensureValidAccess]);

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-PE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="history-container">
      {/* Header interno del Modal unificado en la caja contenedora */}
      <div className="history-header">
        <div className="header-title-area">
          <div className="icon-badge recharge-badge">
            <FaArrowLeft style={{ transform: 'rotate(45deg)' }} />
          </div>
          <div>
            <h4>Abonos Recientes</h4>
            <span className="subtitle">Últimos movimientos aprobados</span>
          </div>
        </div>
        
        {/* Selector Segmentado Moderno correctamente alineado en el mismo flexbox */}
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
      ) : recharges.length === 0 ? (
        <div className="history-empty">
          No se encontraron recargas aprobadas para este usuario.
        </div>
      ) : (
        <div className="history-list">
          {recharges.map((tx) => (
            <div key={tx.id} className="history-item">
              <div className="item-left">
                <span className="status-indicator approved-dot"></span>
                <div className="item-details">
                  <p className="item-description">{tx.description || 'Recarga de Saldo'}</p>
                  <span className="item-date">
                    <FaCalendarAlt size={10} style={{ marginRight: '4px' }} />
                    {formatDate(tx.createdAt)}
                  </span>
                </div>
              </div>
              <div className="item-right">
                <span className="item-amount approved-amount">
                  +{tx.currency} {tx.amount.toFixed(2)}
                </span>
                <span className="item-badge">APPROVED</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Estilos locales scoped */}
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
        .recharge-badge {
          background: rgba(16, 185, 129, 0.15);
          color: #10b981;
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
        .history-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: #15222e;
          border: 1px solid #1e293b;
          padding: 0.75rem;
          border-radius: 8px;
          transition: border-color 0.2s ease;
        }
        .history-item:hover {
          border-color: #334155;
        }
        .item-left {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          min-width: 0;
        }
        .status-indicator {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          flex-shrink: 0;
        }
        .approved-dot {
          background: #10b981;
          box-shadow: 0 0 8px #10b981;
        }
        .item-details {
          min-width: 0;
        }
        .item-description {
          margin: 0;
          font-size: 0.85rem;
          font-weight: 500;
          color: #e2e8f0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
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
          flex-shrink: 0;
          padding-left: 0.5rem;
        }
        .item-amount {
          font-family: monospace;
          font-size: 0.95rem;
          font-weight: 700;
          display: block;
        }
        .approved-amount {
          color: #34d399;
        }
        .item-badge {
          font-size: 0.6rem;
          font-weight: 800;
          color: #64748b;
          letter-spacing: 0.5px;
        }
        .history-loading {
          text-align: center;
          padding: 2rem;
          color: #10b981;
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
          color: #10b981; /* Esmeralda para recargas/abonos */
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