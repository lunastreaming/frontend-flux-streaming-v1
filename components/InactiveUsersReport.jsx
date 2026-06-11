import React, { useState, useEffect } from 'react';
import { FaUserClock, FaShoppingBag, FaArrowLeft, FaCalendarAlt, FaSyncAlt, FaChevronLeft, FaChevronRight, FaPhoneAlt } from 'react-icons/fa';

export default function InactiveUsersReport({ apiBase, ensureValidAccess }) {
  // Estados para los filtros dinámicos que maneja el endpoint
  const [type, setType] = useState('purchase'); // 'purchase' o 'recharge'
  const [days, setDays] = useState(15);         // 15, 30 o 60
  const [page, setPage] = useState(0);
  const [size] = useState(10);                  // Filas por página constante

  // Estados de carga y datos de la API (Paginados de Spring Data)
  const [users, setUsers] = useState([]);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchInactiveUsers = async () => {
      setLoading(true);
      try {
        let token = null;
        try {
          token = typeof ensureValidAccess === 'function' ? await ensureValidAccess() : null;
        } catch (e) {
          console.warn('ensureValidAccess error en InactiveUsersReport', e);
        }

        if (!token && typeof window !== 'undefined') {
          token = localStorage.getItem('accessToken');
        }

        const res = await fetch(
          `${apiBase}/api/reports/inactive-users?type=${type}&days=${days}&page=${page}&size=${size}`,
          {
            headers: {
              'Authorization': token ? `Bearer ${token}` : '',
              'Content-Type': 'application/json'
            }
          }
        );

        if (!res.ok) throw new Error("Error obteniendo el reporte");

        const data = await res.json();
        // Spring Data retorna la lista en 'content'
        setUsers(data.content || []);
        setTotalPages(data.totalPages || 0);
        setTotalElements(data.totalElements || 0);
      } catch (error) {
        console.error("Error cargando reporte de inactividad", error);
      } finally {
        setLoading(false);
      }
    };

    if (apiBase) {
      fetchInactiveUsers();
    }
  }, [type, days, page, size, apiBase, ensureValidAccess]);

  // Resetear la página a 0 cada vez que se alterne un filtro primario
  const handleTypeChange = (newType) => {
    setType(newType);
    setPage(0);
  };

  const handleDaysChange = (newDays) => {
    setDays(newDays);
    setPage(0);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Sin registros';
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-PE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="report-container">
      {/* CARD PRINCIPAL */}
      <div className="report-card">
        
        {/* HEADER DEL REPORTE */}
        <div className="report-header">
          <div className="header-identity">
            <div className={`icon-badge ${type === 'purchase' ? 'badge-purchase' : 'badge-recharge'}`}>
              {type === 'purchase' ? <FaShoppingBag size={16} /> : <FaArrowLeft style={{ transform: 'rotate(45deg)' }} size={16} />}
            </div>
            <div>
              <h3>Alerta de Inactividad</h3>
              <p className="subtitle">Monitoreo de usuarios en riesgo de abandono</p>
            </div>
          </div>

          {/* CONTROLES DINÁMICOS DE FILTRADO */}
          <div className="filter-group">
            {/* Control 1: Casuística de Negocio */}
            <div className="segmented-control">
              <button
                type="button"
                className={`segment-btn ${type === 'purchase' ? 'active purchase-active' : ''}`}
                onClick={() => handleTypeChange('purchase')}
              >
                Sin Compras
              </button>
              <button
                type="button"
                className={`segment-btn ${type === 'recharge' ? 'active recharge-active' : ''}`}
                onClick={() => handleTypeChange('recharge')}
              >
                Sin Recargas
              </button>
            </div>

            {/* Control 2: Ventana de tiempo */}
            <div className="segmented-control">
              {[15, 30, 60].map((d) => (
                <button
                  key={d}
                  type="button"
                  className={`segment-btn ${days === d ? 'active-days' : ''}`}
                  onClick={() => handleDaysChange(d)}
                >
                  {d} días
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* CUERPO DEL TABLERO / TABLA */}
        {loading ? (
          <div className="report-loading">
            <FaSyncAlt className="spin-animation" size={24} />
            <p>Calculando métricas de retención...</p>
          </div>
        ) : users.length === 0 ? (
          <div className="report-empty">
            <FaUserClock size={36} style={{ marginBottom: '0.75rem', color: '#475569' }} />
            <p>¡Excelente! No hay usuarios inactivos en este rango de tiempo.</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="report-table">
              <thead>
                <tr>
                  <th>Usuario</th>
                  <th>Contacto</th>
                  <th>Rol</th>
                  <th>Balance actual</th>
                  <th>Ventas tot.</th>
                  <th>Último Movimiento ({type === 'purchase' ? 'Compra' : 'Abono'})</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <td className="font-semibold text-white">{user.username}</td>
                    <td>
                      <span className="phone-cell">
                        <FaPhoneAlt size={10} style={{ color: '#64748b' }} />
                        {user.phone || '—'}
                      </span>
                    </td>
                    <td>
                      <span className="role-tag">{user.role.toUpperCase()}</span>
                    </td>
                    <td className="font-mono text-cyan-400">
                      ${user.balance.toFixed(2)}
                    </td>
                    <td className="font-mono">{user.salesCount}</td>
                    <td>
                      <span className="date-cell">
                        <FaCalendarAlt size={11} />
                        {formatDate(user.lastTransactionAt)}
                      </span>
                    </td>
                    <td>
                      <span className={`status-pill ${user.status === 'active' ? 'status-active' : 'status-disabled'}`}>
                        {user.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* PIE DE PAGINACIÓN */}
        {totalPages > 1 && (
          <div className="report-footer">
            <span className="pagination-info">
              Mostrando página <strong>{page + 1}</strong> de {totalPages} ({totalElements} usuarios en total)
            </span>
            <div className="pagination-buttons">
              <button
                className="nav-btn"
                disabled={page === 0 || loading}
                onClick={() => setPage(prev => Math.max(prev - 1, 0))}
              >
                <FaChevronLeft size={12} /> Ante.
              </button>
              <button
                className="nav-btn"
                disabled={page >= totalPages - 1 || loading}
                onClick={() => setPage(prev => prev + 1)}
              >
                Sig. <FaChevronRight size={12} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* DISEÑO MODERNO SCOPED (EMERALD GREEN / OXFORD GREY) */}
      <style jsx>{`
        .report-container {
          width: 100%;
          font-family: system-ui, -apple-system, sans-serif;
          color: #e2e8f0;
          padding: 1rem 0;
        }
        .report-card {
          background: #111c24;
          border: 1px solid #1e293b;
          border-radius: 16px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.25);
          overflow: hidden;
        }
        .report-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 1.5rem;
          padding: 1.25rem 1.5rem;
          border-bottom: 1px solid #1e293b;
          background: #0f172a;
        }
        .header-identity {
          display: flex;
          align-items: center;
          gap: 0.85rem;
        }
        .header-identity h3 {
          margin: 0;
          font-size: 1.1rem;
          font-weight: 700;
          color: #fff;
        }
        .subtitle {
          margin: 2px 0 0 0;
          font-size: 0.78rem;
          color: #94a3b8;
        }
        .icon-badge {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 38px;
          height: 38px;
          border-radius: 10px;
        }
        .badge-purchase {
          background: rgba(99, 102, 241, 0.15);
          color: #818cf8;
        }
        .badge-recharge {
          background: rgba(16, 185, 129, 0.15);
          color: #10b981;
        }
        .filter-group {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          flex-wrap: wrap;
        }
        
        /* SEGMENTED CAPSULES */
        .segmented-control {
          display: flex;
          background: #1e293b;
          padding: 3px;
          border-radius: 8px;
          border: 1px solid rgba(255, 255, 255, 0.02);
        }
        .segment-btn {
          background: transparent;
          border: none;
          color: #94a3b8;
          font-size: 0.75rem;
          font-weight: 600;
          padding: 6px 14px;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .segment-btn:hover {
          color: #fff;
        }
        .segment-btn.active {
          background: #0f172a;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.4);
        }
        .purchase-active {
          color: #818cf8 !important;
        }
        .recharge-active {
          color: #10b981 !important;
        }
        .active-days {
          background: #334155;
          color: #38bdf8 !important;
          border-radius: 6px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
        }

        /* DATA TABLE STYLE */
        .table-responsive {
          width: 100%;
          overflow-x: auto;
        }
        .report-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
          font-size: 0.85rem;
        }
        .report-table th {
          background: #15222e;
          color: #94a3b8;
          font-weight: 600;
          padding: 0.85rem 1.25rem;
          border-bottom: 1px solid #1e293b;
          text-transform: uppercase;
          font-size: 0.72rem;
          letter-spacing: 0.5px;
        }
        .report-table td {
          padding: 0.9rem 1.25rem;
          border-bottom: 1px solid #1e293b;
          color: #cbd5e1;
          vertical-align: middle;
        }
        .report-table tr:hover td {
          background: rgba(255, 255, 255, 0.01);
        }
        
        /* DATA CELLS COMPONENTS */
        .phone-cell {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          color: #94a3b8;
        }
        .role-tag {
          background: #1e293b;
          color: #94a3b8;
          font-size: 0.65rem;
          font-weight: 700;
          padding: 2px 6px;
          border-radius: 4px;
        }
        .date-cell {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          color: #f1f5f9;
        }
        .date-cell :global(svg) {
          color: #64748b;
        }
        .status-pill {
          font-size: 0.65rem;
          font-weight: 800;
          padding: 2px 6px;
          border-radius: 20px;
          text-transform: uppercase;
          display: inline-block;
        }
        .status-active {
          background: rgba(16, 185, 129, 0.12);
          color: #34d399;
        }
        .status-disabled {
          background: rgba(239, 68, 68, 0.12);
          color: #f87171;
        }

        /* LOADING / EMPTY STATES */
        .report-loading {
          text-align: center;
          padding: 4rem 2rem;
          color: #10b981;
        }
        .report-loading p {
          margin: 0.75rem 0 0 0;
          font-size: 0.85rem;
          color: #94a3b8;
        }
        .report-empty {
          text-align: center;
          padding: 4rem 2rem;
          color: #94a3b8;
          font-size: 0.88rem;
        }
        .spin-animation {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        /* FOOTER PAGINATION */
        .report-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1rem 1.5rem;
          background: #0f172a;
          border-top: 1px solid #1e293b;
          flex-wrap: wrap;
          gap: 1rem;
        }
        .pagination-info {
          font-size: 0.78rem;
          color: #64748b;
        }
        .pagination-info strong {
          color: #e2e8f0;
        }
        .pagination-buttons {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .nav-btn {
          background: #1e293b;
          border: 1px solid #334155;
          color: #e2e8f0;
          font-size: 0.75rem;
          font-weight: 600;
          padding: 5px 12px;
          border-radius: 6px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 0.3rem;
          transition: background 0.2s;
        }
        .nav-btn:hover:not(:disabled) {
          background: #334155;
          color: #fff;
        }
        .nav-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        /* RESPONSIVE DESIGN */
        @media (max-width: 768px) {
          .report-header {
            flex-direction: column;
            align-items: flex-start;
          }
          .filter-group {
            width: 100%;
            justify-content: space-between;
          }
        }
      `}</style>
    </div>
  );
}