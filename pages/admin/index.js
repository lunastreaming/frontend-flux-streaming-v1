import { useAuth } from '../../context/AuthProvider'
import { useRouter } from 'next/router'
import { useEffect, useState, useCallback, useMemo } from 'react'
import AdminNavBar from '../../components/AdminNavBar'
import Head from 'next/head'
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, BarChart, Bar
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
  
  // NUEVO ESTADO: Ingresos por Métodos de Pago
  const [methodIncomes, setMethodIncomes] = useState([])
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  
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
      
      // NUEVA URL: Endpoint de ingresos por método de pago
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

      // Guardar datos de métodos de pago
      setMethodIncomes(Array.isArray(dataMethods) ? dataMethods : [])

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
    return categorySales.reduce((acc, curr) => acc + curr.cantidadVendida, 0)
  }, [categorySales])

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

          {/* NUEVA SECCIÓN: INGRESOS POR MÉTODO DE PAGO */}
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

          {/* VENTAS POR CATEGORÍA */}
          <div className="grid-layout">
            <div className="chart-card">
              <div className="card-info">
                <h3>Ventas por Categoría</h3>
                <p>Cuentas entregadas vs Recaudación</p>
              </div>
              <div className="chart-holder">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={categorySales}>
                    <defs>
                      <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#111" />
                    <XAxis dataKey="categoria" axisLine={false} tickLine={false} tick={{fill: '#666', fontSize: 11}} />
                    <Tooltip contentStyle={{ background: '#000', borderRadius: '12px' }} />
                    <Area type="monotone" dataKey="cantidadVendida" stroke="#10b981" fill="url(#colorSales)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="list-card">
              <h3>Cuentas ({totalStocksVendidos} u.)</h3>
              <div className="items-container">
                {categorySales.map((c, i) => (
                  <div className="data-row" key={`cat-${i}`}>
                    <div className="row-info">
                      <span className="row-title" style={{color: '#10b981'}}>{c.categoria}</span>
                      <span className="row-sub">{c.cantidadVendida} unidades</span>
                    </div>
                    <div className="row-amount">
                      <span className="amt-symbol" style={{color: '#10b981'}}>$</span>
                      {c.totalRecaudado.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

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
        @media (max-width: 950px) { .grid-layout, .balance-grid { grid-template-columns: 1fr; } .stat-value { font-size: 45px; } }
      `}</style>
    </>
  )
}