import { useAuth } from '../../context/AuthProvider'
import { useRouter } from 'next/router'
import { useEffect, useState, useCallback, useMemo } from 'react'
import AdminNavBar from '../../components/AdminNavBar'
import Head from 'next/head'
import { 
  CartesianGrid, Tooltip, ResponsiveContainer, Cell, BarChart, Bar, XAxis, YAxis
} from 'recharts'

export default function AdminPanel() {
  const { user, ready, ensureValidAccess } = useAuth()
  const router = useRouter()
  
  const [metrics, setMetrics] = useState([])
  const [categorySales, setCategorySales] = useState([])
  const [balanceMovimientos, setBalanceMovimientos] = useState({
    totalRecargasContador: 0,
    totalRecargasMonto: 0,
    totalRetirosContador: 0,
    totalRetirosMonto: 0
  })
  
  const [methodIncomes, setMethodIncomes] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  
  // NUEVO ESTADO: Guarda el índice de la categoría seleccionada para ver en grande
  const [selectedCategoryIdx, setSelectedCategoryIdx] = useState(0)
  
  const todayStr = useMemo(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, []);

  const [dates, setDates] = useState({
    startDate: todayStr,
    endDate: todayStr
  })

  const getAuthToken = async () => {
    try {
      const t = typeof ensureValidAccess === 'function' ? await ensureValidAccess() : null
      if (t) return t
    } catch (_) {}
    if (typeof window !== 'undefined') return localStorage.getItem('accessToken')
    return null
  }

  const fetchDashboardData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const token = await getAuthToken()
      const headers = { 'Content-Type': 'application/json' }
      if (token) headers['Authorization'] = `Bearer ${token}`

      const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'
      
      const urlIncomes = `${API_BASE}/api/admin/dashboard/incomes?startDate=${dates.startDate}&endDate=${dates.endDate}`
      const urlCategories = `${API_BASE}/api/admin/dashboard/ventas-categoria?startDate=${dates.startDate}T00:00:00&endDate=${dates.endDate}T23:59:59`
      const urlBalance = `${API_BASE}/api/admin/dashboard/balance-movimientos?startDate=${dates.startDate}T00:00:00&endDate=${dates.endDate}T23:59:59`
      const urlMethods = `${API_BASE}/api/admin/dashboard/income-by-methods?startDate=${dates.startDate}&endDate=${dates.endDate}`
      
      const [resIncomes, resCategories, resBalance, resMethods] = await Promise.all([
        fetch(urlIncomes, { method: 'GET', headers }),
        fetch(urlCategories, { method: 'GET', headers }),
        fetch(urlBalance, { method: 'GET', headers }),
        fetch(urlMethods, { method: 'GET', headers })
      ])
      
      if (!resIncomes.ok) throw new Error(`Error Incomes: ${resIncomes.status}`)
      if (!resCategories.ok) throw new Error(`Error Categories: ${resCategories.status}`)
      if (!resBalance.ok) throw new Error(`Error Balance: ${resBalance.status}`)
      if (!resMethods.ok) throw new Error(`Error Methods: ${resMethods.status}`)
      
      const dataIncomes = await resIncomes.json()
      const dataCategories = await resCategories.json()
      const dataBalance = await resBalance.json()
      const dataMethods = await resMethods.json()
      
      setMetrics(Array.isArray(dataIncomes) ? dataIncomes.map(item => ({
        ...item,
        name: item.concepto.replace(/_/g, ' ').toLowerCase()
      })) : [])
      
      setCategorySales(Array.isArray(dataCategories) ? dataCategories : [])
      setBalanceMovimientos(dataBalance || { totalRecargasContador: 0, totalRecargasMonto: 0, totalRetirosContador: 0, totalRetirosMonto: 0 })
      setMethodIncomes(Array.isArray(dataMethods) ? dataMethods : [])
      
      // Resetear la selección a la primera posición tras una nueva búsqueda
      if (Array.isArray(dataCategories) && dataCategories.length > 0) {
        setSelectedCategoryIdx(0)
      }

    } catch (err) {
      setError('Error al obtener datos del dashboard.')
    } finally {
      setLoading(false)
    }
  }, [dates])

  const totalGeneral = useMemo(() => {
    return metrics.reduce((acc, curr) => acc + curr.ingresosTotales, 0)
  }, [metrics])

  const totalStocksVendidos = useMemo(() => {
    return categorySales.reduce((acc, curr) => acc + (curr.totalUnidades || 0), 0)
  }, [categorySales])

  // Obtener de forma segura los datos de la categoría actualmente seleccionada
  const activeCategoryData = useMemo(() => {
    if (categorySales.length > 0 && categorySales[selectedCategoryIdx]) {
      return categorySales[selectedCategoryIdx];
    }
    return null;
  }, [categorySales, selectedCategoryIdx]);

  useEffect(() => {
    if (ready && user?.role?.toUpperCase() === 'ADMIN') {
      fetchDashboardData()
    } else if (ready) {
      router.replace('/admin/loginAdmin')
    }
  }, [ready, user, router, fetchDashboardData])

  if (!ready) return null

  return (
    <>
      <Head><title>Revenue Analytics | Admin</title></Head>
      <div className="dashboard-container">
        <AdminNavBar />

        <main className="content">
          {/* HEADER SECT */}
          <div className="header-flex">
            <div className="brand">
              <div className="dot"></div>
              <h1>Revenue Analytics</h1>
              <p>Monitor de transacciones en tiempo real (USD)</p>
            </div>

            <div className="controls">
              <div className="date-group">
                <div className="date-input-container">
                  <small>INICIO</small>
                  <input type="date" value={dates.startDate} onChange={e => setDates({...dates, startDate: e.target.value})} />
                </div>
                <div className="sep"></div>
                <div className="date-input-container">
                  <small>FIN</small>
                  <input type="date" value={dates.endDate} onChange={e => setDates({...dates, endDate: e.target.value})} />
                </div>
              </div>
              <button className="btn-main" onClick={fetchDashboardData} disabled={loading}>
                {loading ? 'Cargando...' : 'Actualizar'}
              </button>
            </div>
          </div>

          {error && <div className="error-msg">{error}</div>}

          {/* MAIN STAT */}
          <section className="main-stat-card">
            <div className="stat-label">RECAUDACIÓN TOTAL NETA</div>
            <div className="stat-value">
              <span className="symbol">$</span>
              {totalGeneral.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
          </section>

          {/* BALANCE DE TESORERÍA */}
          <div className="balance-grid">
            <div className="balance-card deposit">
              <div className="balance-info">
                <span className="balance-label">TOTAL RECARGAS APROBADAS</span>
                <span className="balance-sub">{balanceMovimientos.totalRecargasContador} operaciones</span>
              </div>
              <div className="balance-amount">
                <span className="amt-symbol">$</span>
                {balanceMovimientos.totalRecargasMonto.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
            </div>

            <div className="balance-card withdraw">
              <div className="balance-info">
                <span className="balance-label">TOTAL RETIROS CONFIRMADOS</span>
                <span className="balance-sub">{balanceMovimientos.totalRetirosContador} operaciones</span>
              </div>
              <div className="balance-amount">
                <span className="amt-symbol">$</span>
                {balanceMovimientos.totalRetirosMonto.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
            </div>
          </div>

          {/* INGRESOS POR MÉTODO DE PAGO */}
          <div className="grid-layout">
            <div className="chart-card">
              <div className="card-info">
                <h3>Ingresos por Método de Pago</h3>
                <p>Dinero recibido según la cuenta de destino</p>
              </div>
              <div className="chart-holder">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={methodIncomes} layout="vertical" margin={{ left: 20 }}>
                    <CartesianGrid strokeDasharray="0" horizontal={false} stroke="#1a1a1a" />
                    <XAxis type="number" hide />
                    <YAxis 
                       dataKey="methodName" 
                       type="category" 
                       axisLine={false} 
                       tickLine={false}
                       tick={{fill: '#999', fontSize: 12, fontWeight: 600}}
                    />
                    <Tooltip 
                      cursor={{fill: '#ffffff05'}}
                      contentStyle={{ background: '#000', border: '1px solid #222', borderRadius: '12px' }}
                      formatter={(value) => [`$${value.toLocaleString()}`, 'Monto Recibido']}
                    />
                    <Bar dataKey="totalAmount" radius={[0, 8, 8, 0]} barSize={30}>
                      {methodIncomes.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color || '#6366f1'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="list-card">
              <h3>Detalle de Cuentas</h3>
              <div className="items-container">
                {methodIncomes.map((m, i) => (
                  <div className="data-row" key={i}>
                    <div className="row-info">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: m.color }} />
                        <span className="row-title" style={{ color: '#fff' }}>{m.methodName}</span>
                      </div>
                      <span className="row-sub">{m.transactionCount} recargas</span>
                    </div>
                    <div className="row-amount">
                      <span className="amt-symbol">$</span>
                      {m.totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* DISTRIBUCIÓN DE INGRESOS (CONCEPTOS) */}
          <div className="grid-layout">
            <div className="chart-card">
              <div className="card-info">
                <h3>Distribución por Concepto</h3>
                <p>Análisis de ingresos por tipo de operación</p>
              </div>
              <div className="chart-holder">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={metrics}>
                    <CartesianGrid strokeDasharray="0" vertical={false} stroke="#1a1a1a" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#444', fontSize: 11}} />
                    <Tooltip contentStyle={{ background: '#000', borderRadius: '12px' }} />
                    <Bar dataKey="ingresosTotales" radius={[8, 8, 8, 8]} barSize={55}>
                      {metrics.map((_, i) => (
                        <Cell key={`c-${i}`} fill={['#6366f1', '#a855f7', '#ec4899'][i % 3]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="list-card">
              <h3>Desglose</h3>
              <div className="items-container">
                {metrics.map((m, i) => (
                  <div className="data-row" key={i}>
                    <div className="row-info">
                      <span className="row-title">{m.concepto.replace(/_/g, ' ')}</span>
                      <span className="row-sub">{m.totalOperaciones} transacciones</span>
                    </div>
                    <div className="row-amount">
                      <span className="amt-symbol">$</span>
                      {m.ingresosTotales.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* NUEVO REDISEÑO: INTERFAZ DE ENFOQUE PREMIUM (SPLIT-VIEW) */}
          <section className="performance-section">
            <div className="section-header-inline">
              <h2>Auditoría Comercial por Categorías</h2>
              <p>Selecciona una plataforma a la izquierda para inspeccionar su volumen financiero en pantalla completa.</p>
            </div>

            {categorySales.length === 0 ? (
              <div className="empty-state-card">No hay transacciones registradas en este periodo</div>
            ) : (
              <div className="split-focus-layout">
                {/* Panel Izquierdo: Selectores de Categoría estilo Tab */}
                <div className="selection-sidebar">
                  {categorySales.map((c, i) => (
                    <button 
                      key={`tab-${i}`}
                      className={`sidebar-tab ${selectedCategoryIdx === i ? 'active' : ''}`}
                      onClick={() => setSelectedCategoryIdx(i)}
                    >
                      <div className="tab-left">
                        <span className="tab-name">{c.categoria}</span>
                        <span className="tab-sub">{c.totalUnidades} operaciones</span>
                      </div>
                      <div className="tab-right">
                        <span>${c.totalRecaudado.toLocaleString('en-US', { minimumFractionDigits: 0 })}</span>
                      </div>
                    </button>
                  ))}
                </div>

                {/* Panel Derecho: Tarjeta de Presentación Corporativa e Inmersiva */}
                {activeCategoryData && (
                  <div className="focus-showcase-container">
                    <div className="focus-header">
                      <div className="focus-title-block">
                        <span className="live-pill">AUDITORÍA ACTIVA</span>
                        <h2>{activeCategoryData.categoria}</h2>
                      </div>
                      <div className="focus-master-revenue">
                        <small>TOTAL FACTURADO NETO</small>
                        <div className="big-amount-display">
                          <span className="currency-color">$</span>
                          {activeCategoryData.totalRecaudado.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </div>
                      </div>
                    </div>

                    <div className="focus-grid-metrics">
                      {/* Sub-tarjeta Ventas Directas */}
                      <div className="giant-metric-card purple-theme">
                        <div className="g-card-header">
                          <div className="g-icon-dot"></div>
                          <span>VENTAS DE CUENTAS NUEVAS</span>
                        </div>
                        <div className="g-card-body">
                          <div className="g-value">{activeCategoryData.cantidadVentas} <small>u.</small></div>
                          <div className="g-money-label">Monto Inyectado</div>
                          <div className="g-money-value">${activeCategoryData.montoVentas.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
                        </div>
                      </div>

                      {/* Sub-tarjeta Renovaciones */}
                      <div className="giant-metric-card emerald-theme">
                        <div className="g-card-header">
                          <div className="g-icon-dot"></div>
                          <span>RENOVACIONES RECURRENTES</span>
                        </div>
                        <div className="g-card-body">
                          <div className="g-value">{activeCategoryData.cantidadRenovaciones} <small>u.</small></div>
                          <div className="g-money-label">Monto Recaudado</div>
                          <div className="g-money-value">${activeCategoryData.montoRenovaciones.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
                        </div>
                      </div>
                    </div>

                    <div className="focus-footer-summary">
                      <span>Métricas consolidadas de la categoría <strong>{activeCategoryData.categoria}</strong> basadas en un flujo total de <strong>{activeCategoryData.totalUnidades}</strong> órdenes procesadas dentro del rango temporal parametrizado.</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>

        </main>
      </div>

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;800&display=swap');
        body { background: #030303; color: #fff; font-family: 'Outfit', sans-serif; margin: 0; }
        .dashboard-container { padding: 40px 20px; }
        .content { max-width: 1200px; margin: 0 auto; display: flex; flex-direction: column; gap: 30px; }
        .header-flex { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 20px; }
        .brand h1 { font-size: 24px; font-weight: 800; margin: 0; }
        .brand p { color: #555; margin: 5px 0 0 0; font-size: 13px; }
        .dot { width: 8px; height: 8px; background: #6366f1; border-radius: 50%; margin-bottom: 8px; box-shadow: 0 0 15px #6366f1; }
        .controls { display: flex; gap: 15px; align-items: center; }
        .date-group { background: #0f0f0f; border: 1px solid #1a1a1a; padding: 5px 20px; border-radius: 16px; display: flex; align-items: center; gap: 15px; }
        .date-input-container { display: flex; flex-direction: column; min-width: 110px; }
        .date-input-container small { font-size: 9px; color: #444; font-weight: 800; }
        .date-input-container input { background: transparent; border: none; color: #fff; font-size: 13px; outline: none; }
        .sep { width: 1px; height: 25px; background: #1a1a1a; }
        .btn-main { background: #6366f1; color: #fff; border: none; padding: 12px 25px; border-radius: 14px; font-weight: 700; cursor: pointer; }
        .main-stat-card { background: linear-gradient(180deg, #0a0a0a 0%, #030303 100%); border: 1px solid #1a1a1a; border-radius: 30px; padding: 50px; text-align: center; }
        .stat-label { font-size: 12px; color: #555; font-weight: 800; letter-spacing: 3px; }
        .stat-value { font-size: 70px; font-weight: 800; margin: 15px 0; }
        .symbol { color: #6366f1; margin-right: 10px; }
        .balance-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
        .balance-card { background: #0a0a0a; border: 1px solid #111; border-radius: 24px; padding: 25px 30px; display: flex; justify-content: space-between; align-items: center; }
        .balance-label { font-size: 11px; font-weight: 800; letter-spacing: 1.5px; }
        .balance-card.deposit .balance-label { color: #3b82f6; }
        .balance-card.withdraw .balance-label { color: #f59e0b; }
        .balance-sub { font-size: 11px; color: #444; }
        .balance-amount { font-size: 26px; font-weight: 800; }
        .grid-layout { display: grid; grid-template-columns: 1.5fr 1fr; gap: 20px; }
        .chart-card, .list-card { background: #0a0a0a; border: 1px solid #111; border-radius: 24px; padding: 30px; }
        .chart-holder { height: 300px; width: 100%; }
        .items-container { display: flex; flex-direction: column; gap: 12px; margin-top: 25px; }
        .data-row { background: #0d0d0d; border: 1px solid #161616; padding: 20px; border-radius: 18px; display: flex; justify-content: space-between; align-items: center; }
        .row-title { display: block; font-size: 13px; font-weight: 700; text-transform: uppercase; color: #999; }
        .row-sub { font-size: 11px; color: #444; }
        .row-amount { font-size: 18px; font-weight: 700; }
        .amt-symbol { font-size: 12px; color: #6366f1; margin-right: 4px; }
        .error-msg { background: rgba(239, 68, 68, 0.1); border: 1px solid #ef4444; color: #ef4444; padding: 15px; border-radius: 12px; text-align: center; }
        
        /* NUEVO APARTADO CSS: SPLIT-VIEW DE ENFOQUE GIGANTE */
        .performance-section { display: flex; flex-direction: column; gap: 20px; margin-top: 15px; }
        .performance-section h2 { font-size: 20px; font-weight: 800; margin: 0; }
        .performance-section p { color: #555; margin: 5px 0 0 0; font-size: 13px; }
        
        .empty-state-card { background: #0a0a0a; border: 1px dashed #222; border-radius: 24px; padding: 40px; text-align: center; color: #444; font-weight: 600; }
        
        .split-focus-layout { display: grid; grid-template-columns: 350px 1fr; gap: 30px; align-items: start; }
        
        /* Barra lateral de opciones */
        .selection-sidebar { display: flex; flex-direction: column; gap: 10px; max-height: 520px; overflow-y: auto; padding-right: 5px; }
        .selection-sidebar::-webkit-scrollbar { width: 4px; }
        .selection-sidebar::-webkit-scrollbar-thumb { background: #222; border-radius: 4px; }
        
        .sidebar-tab { background: #090909; border: 1px solid #141414; padding: 18px 20px; border-radius: 16px; display: flex; justify-content: space-between; align-items: center; cursor: pointer; text-align: left; transition: all 0.2s ease; }
        .sidebar-tab:hover { background: #0d0d0d; border-color: #252525; }
        .sidebar-tab.active { background: linear-gradient(90deg, #121214 0%, #0a0a0a 100%); border-color: #6366f1; box-shadow: 0 4px 20px rgba(99, 102, 241, 0.05); }
        
        .tab-name { display: block; font-size: 14px; font-weight: 700; color: #888; text-transform: uppercase; letter-spacing: 0.5px; transition: color 0.2s; }
        .sidebar-tab.active .tab-name { color: #fff; }
        .tab-sub { font-size: 11px; color: #444; display: block; margin-top: 2px; }
        .tab-right { font-size: 16px; font-weight: 800; color: #555; transition: color 0.2s; }
        .sidebar-tab.active .tab-right { color: #6366f1; }
        
        /* Panel Gigante de Enfoque */
        .focus-showcase-container { background: linear-gradient(180deg, #070708 0%, #030303 100%); border: 1px solid #161619; border-radius: 28px; padding: 40px; display: flex; flex-direction: column; gap: 35px; box-shadow: 0 20px 40px rgba(0,0,0,0.5); }
        
        .focus-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #161619; padding-bottom: 30px; flex-wrap: wrap; gap: 20px; }
        .focus-title-block h2 { font-size: 32px; font-weight: 800; color: #fff; letter-spacing: -0.5px; margin-top: 5px; text-transform: uppercase; }
        
        .live-pill { background: rgba(99, 102, 241, 0.1); border: 1px solid rgba(99, 102, 241, 0.2); color: #6366f1; font-size: 9px; font-weight: 800; padding: 4px 10px; border-radius: 20px; letter-spacing: 1px; }
        
        .focus-master-revenue { text-align: right; }
        .focus-master-revenue small { font-size: 10px; color: #555; font-weight: 800; letter-spacing: 1.5px; display: block; }
        .big-amount-display { font-size: 42px; font-weight: 800; color: #fff; margin-top: 5px; letter-spacing: -1px; }
        .currency-color { color: #6366f1; margin-right: 5px; }
        
        /* Cajas Métricas Gigantes */
        .focus-grid-metrics { display: grid; grid-template-columns: 1fr 1fr; gap: 25px; }
        .giant-metric-card { background: #0a0a0c; border: 1px solid #161619; border-radius: 20px; padding: 30px; position: relative; overflow: hidden; }
        
        .g-card-header { display: flex; align-items: center; gap: 10px; font-size: 11px; font-weight: 800; color: #555; letter-spacing: 1px; }
        .g-icon-dot { width: 6px; height: 6px; border-radius: 50%; }
        
        .purple-theme .g-icon-dot { background: #a855f7; box-shadow: 0 0 10px #a855f7; }
        .emerald-theme .g-icon-dot { background: #10b981; box-shadow: 0 0 10px #10b981; }
        
        .g-card-body { margin-top: 20px; }
        .g-value { font-size: 38px; font-weight: 800; color: #fff; }
        .g-value small { font-size: 16px; color: #444; font-weight: 400; }
        
        .g-money-label { font-size: 10px; color: #444; font-weight: 700; margin-top: 20px; letter-spacing: 0.5px; text-transform: uppercase; }
        .g-money-value { font-size: 24px; font-weight: 800; margin-top: 2px; }
        
        .purple-theme .g-money-value { color: #a855f7; }
        .emerald-theme .g-money-value { color: #10b981; }
        
        .focus-footer-summary { background: #070709; border: 1px solid #111113; border-radius: 16px; padding: 20px; font-size: 13px; color: #555; line-height: 1.6; }
        .focus-footer-summary strong { color: #aaa; font-weight: 600; }
        
        @media (max-width: 950px) { 
          .grid-layout, .balance-grid { grid-template-columns: 1fr; } 
          .stat-value { font-size: 45px; } 
          .split-focus-layout { grid-template-columns: 1fr; }
          .focus-grid-metrics { grid-template-columns: 1fr; }
          .focus-header { flex-direction: column; align-items: flex-start; }
          .focus-master-revenue { text-align: left; margin-top: 10px; }
        }
      `}</style>
    </>
  )
}