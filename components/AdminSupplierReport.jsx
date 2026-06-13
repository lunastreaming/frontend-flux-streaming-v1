import React, { useState, useEffect } from 'react';
import { 
  FaCalendarAlt, 
  FaSyncAlt, 
  FaDollarSign, 
  FaTag, 
  FaChartLine, 
  FaLayerGroup, 
  FaArrowLeft,
  FaInbox
} from 'react-icons/fa';

export default function AdminSupplierReport({ providerId, providerName, onBack }) {
  const getFechaHoyPeru = () => {
    const tzoffset = 5 * 60 * 60 * 1000;
    return new Date(Date.now() - tzoffset).toISOString().slice(0, 10);
  };

  const hoyPeru = getFechaHoyPeru();
  const [startDate, setStartDate] = useState(hoyPeru);
  const [endDate, setEndDate] = useState(hoyPeru);
  const [reporte, setReporte] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchReporte = async () => {
    if (!providerId) return;
    setLoading(true);
    setError(null);
    try {
      const startDateTime = `${startDate}T00:00:00`;
      const endDateTime = `${endDate}T23:59:59`;
      
      // 1. Obtener la URL base del Backend desde las variables de entorno de Next.js
      const BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';
      
      // 2. Extraer de manera segura el Token de autenticación del LocalStorage
      let token = null;
      if (typeof window !== 'undefined') {
        token = localStorage.getItem('accessToken');
      }

      // 3. Realizar la petición apuntando al servidor correcto con sus cabeceras
      const response = await fetch(
        `${BASE_URL}/api/admin/dashboard/proveedores/${providerId}/reporte-categorias?startDate=${startDateTime}&endDate=${endDateTime}`,
        {
          method: 'GET',
          headers: {
            'Authorization': token ? `Bearer ${token}` : '',
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) throw new Error('No se pudo cargar el reporte de categorías');
      const data = await response.json();
      setReporte(data);
    } catch (err) {
      setError(err.message || 'Ocurrió un error inesperado');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReporte();
  }, [providerId]);

  const totalGeneral = reporte.reduce((acc, item) => acc + (item.totalRecaudado || 0), 0);
  const totalVentasCount = reporte.reduce((acc, item) => acc + (item.cantidadVentas || 0), 0);
  const totalRenovCount = reporte.reduce((acc, item) => acc + (item.cantidadRenovaciones || 0), 0);

  return (
    <div className="report-container">
      <div className="report-card">
        
        {/* HEADER DEL REPORTE */}
        <div className="report-header">
          <div className="header-identity">
            <button onClick={onBack} className="back-btn" type="button">
              <FaArrowLeft size={14} />
            </button>
            <div className="icon-badge">
              <FaLayerGroup size={16} />
            </div>
            <div>
              <h3>Métricas: <span className="provider-highlight">{providerName}</span></h3>
              <p className="subtitle">Análisis bruto categorizado por rango de fechas</p>
            </div>
          </div>

          {/* FILTROS DE FECHA */}
          <div className="filter-group">
            <div className="date-picker-wrapper">
              <FaCalendarAlt size={12} className="calendar-icon" />
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="date-input"
              />
              <span className="date-separator">al</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="date-input"
              />
            </div>

            <button
              onClick={fetchReporte}
              disabled={loading}
              className="filter-submit-btn"
            >
              <FaSyncAlt size={12} className={loading ? 'spin-animation' : ''} />
              <span>{loading ? 'Filtrando...' : 'Filtrar'}</span>
            </button>
          </div>
        </div>

        {/* TARJETAS DE RESUMEN (KPIs) */}
        <div className="kpi-grid">
          <div className="kpi-card card-emerald">
            <div className="kpi-icon"><FaDollarSign size={18} /></div>
            <div className="kpi-data">
              <p className="kpi-title">Recaudación</p>
              <h4 className="kpi-value">${totalGeneral.toFixed(2)}</h4>
            </div>
          </div>

          <div className="kpi-card card-indigo">
            <div className="kpi-icon"><FaTag size={16} /></div>
            <div className="kpi-data">
              <p className="kpi-title">Ventas Brutas</p>
              <h4 className="kpi-value">{totalVentasCount} <span className="kpi-unit">unds.</span></h4>
            </div>
          </div>

          <div className="kpi-card card-violet">
            <div className="kpi-icon"><FaChartLine size={16} /></div>
            <div className="kpi-data">
              <p className="kpi-title">Renovaciones</p>
              <h4 className="kpi-value">{totalRenovCount} <span className="kpi-unit">unds.</span></h4>
            </div>
          </div>
        </div>

        {error && <div className="error-banner">{error}</div>}

        {/* CONTENIDO PRINCIPAL: TABLA O ESTADO VACÍO */}
        {loading ? (
          <div className="report-loading">
            <FaSyncAlt className="spin-animation" size={24} />
            <p>Procesando métricas de categorías...</p>
          </div>
        ) : reporte.length === 0 ? (
          <div className="report-empty">
            <FaInbox size={36} style={{ marginBottom: '0.75rem', color: '#475569' }} />
            <p>No se encontraron movimientos para este proveedor en las fechas seleccionadas.</p>
          </div>
        ) : (
          <>
            {/* VISTA DESKTOP (Tabla) */}
            <div className="table-responsive desktop-only">
              <table className="report-table">
                <thead>
                  <tr>
                    <th>Categoría</th>
                    <th style={{ textAlign: 'center' }}>Cant. Ventas</th>
                    <th style={{ textAlign: 'right' }}>Monto Ventas</th>
                    <th style={{ textAlign: 'center' }}>Cant. Renovaciones</th>
                    <th style={{ textAlign: 'right' }}>Monto Renovaciones</th>
                    <th style={{ textAlign: 'right', color: '#818cf8' }}>Total Recaudado</th>
                  </tr>
                </thead>
                <tbody>
                  {reporte.map((item) => (
                    <tr key={item.categoryId}>
                      <td className="font-semibold text-white">{item.categoriaNombre}</td>
                      <td style={{ textAlign: 'center' }}>{item.cantidadVentas}</td>
                      <td style={{ textAlign: 'right' }} className="text-emerald-400">${(item.montoVentas || 0).toFixed(2)}</td>
                      <td style={{ textAlign: 'center' }}>{item.cantidadRenovaciones}</td>
                      <td style={{ textAlign: 'right' }} className="text-violet-400">${(item.montoRenovaciones || 0).toFixed(2)}</td>
                      <td style={{ textAlign: 'right' }} className="font-bold text-white highlight-cell">
                        ${(item.totalRecaudado || 0).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* VISTA MOBILE (Tarjetas) */}
            <div className="mobile-only mobile-cards-container">
              {reporte.map((item) => (
                <div key={item.categoryId} className="mobile-report-card">
                  <div className="mobile-card-header">
                    <span className="category-name">{item.categoriaNombre}</span>
                    <span className="total-badge">${(item.totalRecaudado || 0).toFixed(2)}</span>
                  </div>
                  <div className="mobile-card-grid">
                    <div className="mobile-metric-box">
                      <span className="box-label">Ventas</span>
                      <div className="box-values">
                        <span className="box-count">{item.cantidadVentas} unids.</span>
                        <span className="box-amount text-emerald-400">${(item.montoVentas || 0).toFixed(2)}</span>
                      </div>
                    </div>
                    <div className="mobile-metric-box">
                      <span className="box-label">Renovaciones</span>
                      <div className="box-values">
                        <span className="box-count">{item.cantidadRenovaciones} unids.</span>
                        <span className="box-amount text-violet-400">${(item.montoRenovaciones || 0).toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

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
        .back-btn {
          background: #1e293b;
          border: 1px solid #334155;
          color: #cbd5e1;
          padding: 8px;
          border-radius: 8px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        }
        .back-btn:hover {
          background: #334155;
          color: #fff;
        }
        .icon-badge {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 36px;
          height: 36px;
          border-radius: 10px;
          background: rgba(99, 102, 241, 0.15);
          color: #818cf8;
        }
        .header-identity h3 {
          margin: 0;
          font-size: 1.1rem;
          font-weight: 700;
          color: #fff;
        }
        .provider-highlight {
          color: #818cf8;
        }
        .subtitle {
          margin: 2px 0 0 0;
          font-size: 0.78rem;
          color: #94a3b8;
        }
        
        /* FILTROS Y CONTROLES */
        .filter-group {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          flex-wrap: wrap;
        }
        .date-picker-wrapper {
          display: flex;
          align-items: center;
          background: #1e293b;
          padding: 6px 12px;
          border-radius: 8px;
          border: 1px solid rgba(255, 255, 255, 0.02);
          gap: 0.5rem;
        }
        .calendar-icon {
          color: #64748b;
        }
        .date-input {
          background: transparent;
          border: none;
          color: #e2e8f0;
          font-size: 0.8rem;
          font-weight: 600;
          outline: none;
          cursor: pointer;
        }
        .date-separator {
          color: #475569;
          font-size: 0.75rem;
          font-weight: bold;
          text-transform: uppercase;
          padding: 0 4px;
        }
        .filter-submit-btn {
          background: #6366f1;
          border: none;
          color: #fff;
          font-size: 0.78rem;
          font-weight: 600;
          padding: 8px 16px;
          border-radius: 8px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          transition: background 0.2s;
        }
        .filter-submit-btn:hover:not(:disabled) {
          background: #4f46e5;
        }
        .filter-submit-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        /* GRID DE TARJETAS RESUMEN (KPIs) */
        .kpi-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1rem;
          padding: 1.25rem 1.5rem;
          background: rgba(15, 23, 42, 0.3);
          border-bottom: 1px solid #1e293b;
        }
        .kpi-card {
          display: flex;
          align-items: center;
          gap: 1rem;
          background: #15222e;
          border: 1px solid #1e293b;
          padding: 1rem;
          border-radius: 12px;
        }
        .kpi-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 40px;
          height: 40px;
          border-radius: 10px;
        }
        .kpi-data {
          display: flex;
          flex-direction: column;
        }
        .kpi-title {
          margin: 0;
          font-size: 0.68rem;
          font-weight: 700;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .kpi-value {
          margin: 2px 0 0 0;
          font-size: 1.3rem;
          font-weight: 800;
          color: #fff;
        }
        .kpi-unit {
          font-size: 0.8rem;
          font-weight: 500;
          color: #64748b;
        }
        
        /* VARIACIONES DE COLOR PARA KPIs */
        .card-emerald .kpi-icon { background: rgba(16, 185, 129, 0.1); color: #10b981; }
        .card-indigo .kpi-icon { background: rgba(99, 102, 241, 0.1); color: #818cf8; }
        .card-violet .kpi-icon { background: rgba(139, 92, 246, 0.1); color: #a78bfa; }

        /* TABLA TRADICIONAL */
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
        .font-semibold { font-weight: 600; }
        .text-white { color: #fff !important; }
        .text-emerald-400 { color: #34d399; font-family: monospace; }
        .text-violet-400 { color: #a78bfa; font-family: monospace; }
        .highlight-cell {
          background: rgba(99, 102, 241, 0.03);
          font-family: monospace;
          font-size: 0.9rem;
        }

        /* ERRORES Y CARGAS */
        .error-banner {
          padding: 0.75rem 1.5rem;
          background: rgba(239, 68, 68, 0.1);
          border-bottom: 1px solid rgba(239, 68, 68, 0.2);
          color: #f87171;
          font-size: 0.8rem;
        }
        .report-loading {
          text-align: center;
          padding: 4rem 2rem;
          color: #6366f1;
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

        /* VISTA MOBILE (TARJETAS INDIVIDUALES) */
        .mobile-cards-container {
          padding: 1rem;
          display: flex;
          flex-direction: column;
          gap: 0.85rem;
        }
        .mobile-report-card {
          background: #15222e;
          border: 1px solid #1e293b;
          border-radius: 12px;
          padding: 1rem;
        }
        .mobile-card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
          padding-bottom: 0.5rem;
          margin-bottom: 0.75rem;
        }
        .category-name {
          font-weight: 700;
          color: #fff;
          font-size: 0.95rem;
        }
        .total-badge {
          background: rgba(99, 102, 241, 0.15);
          color: #818cf8;
          font-weight: 700;
          font-size: 0.85rem;
          padding: 3px 8px;
          border-radius: 6px;
          font-family: monospace;
        }
        .mobile-card-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 0.5rem;
        }
        .mobile-metric-box {
          background: #0f172a;
          border: 1px solid rgba(255, 255, 255, 0.02);
          border-radius: 8px;
          padding: 8px;
        }
        .box-label {
          display: block;
          font-size: 0.65rem;
          color: #64748b;
          text-transform: uppercase;
          font-weight: 700;
        }
        .box-values {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          margin-top: 4px;
          font-size: 0.78rem;
        }
        .box-count {
          color: #cbd5e1;
          font-weight: 600;
        }
        .box-amount {
          font-weight: 700;
          font-family: monospace;
        }

        /* ANIMACIONES */
        .spin-animation {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        /* RESPONSIVE DISPLAY TRIGGERS */
        .desktop-only { display: block; }
        .mobile-only { display: none; }

        @media (max-width: 768px) {
          .report-header {
            flex-direction: column;
            align-items: flex-start;
          }
          .filter-group {
            width: 100%;
            justify-content: space-between;
          }
          .kpi-grid {
            grid-template-columns: 1fr;
            gap: 0.75rem;
          }
          .desktop-only { display: none; }
          .mobile-only { display: flex; flex-direction: column; }
        }
      `}</style>
    </div>
  );
}