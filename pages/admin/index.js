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
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  
  // Fecha de hoy por defecto
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

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
      const url = `${API_BASE}/api/admin/dashboard/incomes?startDate=${dates.startDate}&endDate=${dates.endDate}`
      
      const response = await fetch(url, { method: 'GET', headers })
      if (!response.ok) throw new Error(`Error: ${response.status}`)
      
      const data = await response.json()
      // Aseguramos que los datos tengan nombre legible para la gráfica
      const formattedData = Array.isArray(data) ? data.map(item => ({
        ...item,
        name: item.concepto.replace(/_/g, ' ').toLowerCase()
      })) : []
      
      setMetrics(formattedData)
    } catch (err) {
      setError('Error de conexión con tesorería.')
    } finally {
      setLoading(false)
    }
  }, [dates])

  const totalGeneral = useMemo(() => {
    return metrics.reduce((acc, curr) => acc + curr.ingresosTotales, 0)
  }, [metrics])

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
                  <input 
                    type="date" 
                    value={dates.startDate} 
                    onChange={e => setDates({...dates, startDate: e.target.value})} 
                    onClick={(e) => e.target.showPicker?.()} 
                  />
                </div>
                <div className="sep"></div>
                <div className="date-input-container">
                  <small>FIN</small>
                  <input 
                    type="date" 
                    value={dates.endDate} 
                    onChange={e => setDates({...dates, endDate: e.target.value})} 
                    onClick={(e) => e.target.showPicker?.()}
                  />
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
            <div className="stat-footer">Basado en el rango seleccionado</div>
          </section>

          {/* GRID */}
          <div className="grid-layout">
            <div className="chart-card">
              <div className="card-info">
                <h3>Distribución de Ingresos</h3>
                <p>Análisis porcentual por tipo de operación</p>
              </div>
              <div className="chart-holder">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={metrics}>
                    <CartesianGrid strokeDasharray="0" vertical={false} stroke="#1a1a1a" />
                    <XAxis 
                       dataKey="name" 
                       axisLine={false} 
                       tickLine={false} 
                       tick={{fill: '#444', fontSize: 11, fontWeight: 600}}
                       textAnchor="middle"
                    />
                    <Tooltip 
                      cursor={{fill: '#ffffff05'}}
                      contentStyle={{ background: '#000', border: '1px solid #222', borderRadius: '12px' }}
                      itemStyle={{ color: '#fff', fontSize: '12px', fontWeight: 'bold' }}
                      formatter={(value) => [`$${value.toLocaleString()}`, 'Ingreso']}
                    />
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
              <h3>Desglose por Concepto</h3>
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
        </main>
      </div>

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;800&display=swap');

        body { 
          background: #030303; 
          color: #fff; 
          font-family: 'Outfit', sans-serif; 
          margin: 0;
        }

        .dashboard-container { padding: 40px 20px; }
        .content { max-width: 1200px; margin: 0 auto; }

        /* Header */
        .header-flex { display: flex; justify-content: space-between; align-items: center; margin-bottom: 40px; flex-wrap: wrap; gap: 20px; }
        .brand { display: flex; flex-direction: column; }
        .brand h1 { font-size: 24px; font-weight: 800; margin: 0; letter-spacing: -0.5px; }
        .brand p { color: #555; margin: 5px 0 0 0; font-size: 13px; font-weight: 600; }
        .dot { width: 8px; height: 8px; background: #6366f1; border-radius: 50%; margin-bottom: 8px; box-shadow: 0 0 15px #6366f1; }

        /* Controls */
        .controls { display: flex; gap: 15px; align-items: center; }
        .date-group { 
          background: #0f0f0f; border: 1px solid #1a1a1a; padding: 5px 20px; 
          border-radius: 16px; display: flex; align-items: center; gap: 15px;
        }
        .date-input-container { display: flex; flex-direction: column; min-width: 110px; position: relative; }
        .date-input-container small { font-size: 9px; color: #444; font-weight: 800; letter-spacing: 1px; }
        .date-input-container input { 
          background: transparent; border: none; color: #fff; font-size: 13px; font-weight: 600; outline: none;
          cursor: pointer; padding: 2px 0;
          width: 100%;
        }
        /* Este truco hace que el calendario se abra al tocar el input */
        input::-webkit-calendar-picker-indicator {
          position: absolute; left: 0; top: 0; width: 100%; height: 100%; margin: 0; padding: 0; cursor: pointer; opacity: 0;
        }

        .sep { width: 1px; height: 25px; background: #1a1a1a; }
        .btn-main { 
          background: #6366f1; color: #fff; border: none; padding: 12px 25px; border-radius: 14px;
          font-weight: 700; cursor: pointer; transition: 0.3s;
        }
        .btn-main:hover { background: #4f46e5; box-shadow: 0 0 20px rgba(99, 102, 241, 0.3); }

        /* Hero Card */
        .main-stat-card { 
          background: linear-gradient(180deg, #0a0a0a 0%, #030303 100%);
          border: 1px solid #1a1a1a; border-radius: 30px; padding: 50px; text-align: center;
          margin-bottom: 30px;
        }
        .stat-label { font-size: 12px; color: #555; font-weight: 800; letter-spacing: 3px; }
        .stat-value { font-size: 70px; font-weight: 800; margin: 15px 0; letter-spacing: -3px; }
        .symbol { color: #6366f1; margin-right: 10px; }
        .stat-footer { font-size: 12px; color: #333; font-weight: 600; }

        /* Grid Layout */
        .grid-layout { display: grid; grid-template-columns: 1.5fr 1fr; gap: 20px; }
        .chart-card, .list-card { background: #0a0a0a; border: 1px solid #111; border-radius: 24px; padding: 30px; }
        
        .card-info h3, .list-card h3 { margin: 0; font-size: 16px; font-weight: 700; }
        .card-info p { color: #444; font-size: 12px; margin: 5px 0 20px 0; font-weight: 600; }

        .chart-holder { height: 300px; width: 100%; }

        /* Rows */
        .items-container { display: flex; flex-direction: column; gap: 12px; margin-top: 25px; }
        .data-row { 
          background: #0d0d0d; border: 1px solid #161616; padding: 20px; border-radius: 18px;
          display: flex; justify-content: space-between; align-items: center; transition: 0.2s;
        }
        .data-row:hover { border-color: #333; background: #111; }
        .row-title { display: block; font-size: 13px; font-weight: 700; text-transform: uppercase; color: #999; }
        .row-sub { font-size: 11px; color: #444; font-weight: 600; }
        .row-amount { font-size: 18px; font-weight: 700; }
        .amt-symbol { font-size: 12px; color: #6366f1; margin-right: 4px; }

        @media (max-width: 950px) {
          .grid-layout { grid-template-columns: 1fr; }
          .header-flex { flex-direction: column; align-items: flex-start; }
          .stat-value { font-size: 45px; }
        }
      `}</style>
    </>
  )
}