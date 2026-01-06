import { useEffect, useState } from 'react'
import Head from 'next/head'
import AdminNavBar from '../../components/AdminNavBar'
import { useAuth } from '../../context/AuthProvider'

export default function Other() {
  const { ensureValidAccess } = useAuth()

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || ''
  const EXCHANGE_ENDPOINT = `${API_BASE}/api/exchange/current`
  const UPDATE_EXCHANGE_ENDPOINT = `${API_BASE}/api/exchange/update`
  const SETTINGS_ENDPOINT = `${API_BASE}/api/admin/settings`
  const UPDATE_SETTING_ENDPOINT = (key) => `${API_BASE}/api/admin/settings/${encodeURIComponent(key)}`

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [exchange, setExchange] = useState(null)
  const [editExchange, setEditExchange] = useState(false)
  const [editedExchangeValue, setEditedExchangeValue] = useState('')
  const [settings, setSettings] = useState([])
  const [editingKey, setEditingKey] = useState(null)
  const [editedValue, setEditedValue] = useState('')

  useEffect(() => {
    loadAll()
  }, [])

  const getAuthToken = async () => {
    try {
      const t = typeof ensureValidAccess === 'function' ? await ensureValidAccess() : null
      if (t) return t
    } catch (_) {}
    if (typeof window !== 'undefined') return localStorage.getItem('accessToken')
    return null
  }

  const loadAll = async () => {
    setLoading(true)
    setError(null)
    try {
      await Promise.all([loadExchange(), loadSettings()])
    } catch (err) {
      console.error('Error cargando datos:', err)
      setError('No se pudieron cargar los datos')
    } finally {
      setLoading(false)
    }
  }

  const loadExchange = async () => {
    try {
      const token = await getAuthToken()
      const headers = { 'Content-Type': 'application/json' }
      if (token) headers['Authorization'] = `Bearer ${token}`

      const res = await fetch(EXCHANGE_ENDPOINT, { method: 'GET', headers })
      if (!res.ok) throw new Error(await res.text())
      const data = await res.json()
      setExchange(data)
      setEditedExchangeValue(data?.rate != null ? String(data.rate) : '')
    } catch (err) {
      console.error('Error cargando tipo de cambio:', err)
    }
  }

  const saveExchange = async () => {
    if (!editedExchangeValue || Number.isNaN(Number(editedExchangeValue))) {
      setError('Valor de tipo de cambio inválido')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const token = await getAuthToken()
      const headers = { 'Content-Type': 'application/json' }
      if (token) headers['Authorization'] = `Bearer ${token}`

      const payload = { rate: Number(editedExchangeValue) }
      const res = await fetch(UPDATE_EXCHANGE_ENDPOINT, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      })
      if (!res.ok) throw new Error(await res.text())
      const updated = await res.json()
      setExchange(updated)
      setEditExchange(false)
    } catch (err) {
      console.error('Error guardando tipo de cambio:', err)
      setError('No se pudo guardar el tipo de cambio')
    } finally {
      setLoading(false)
    }
  }

  const loadSettings = async () => {
    try {
      const token = await getAuthToken()
      const headers = { 'Content-Type': 'application/json' }
      if (token) headers['Authorization'] = `Bearer ${token}`

      const res = await fetch(SETTINGS_ENDPOINT, { method: 'GET', headers })
      if (!res.ok) throw new Error(await res.text())
      const data = await res.json()
      setSettings(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('Error cargando settings:', err)
    }
  }

  const startEditSetting = (key, currentValue) => {
    setEditingKey(key)
    setEditedValue(currentValue != null ? String(currentValue) : '')
    setError(null)
  }

  const cancelEditSetting = () => {
    setEditingKey(null)
    setEditedValue('')
    setError(null)
  }

const saveSetting = async (key, newValue, isBool = false) => {
  setLoading(true);
  setError(null);
  try {
    const token = await getAuthToken();
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    // Construcción del payload dinámico
    const payload = isBool 
      ? { valueBool: newValue }   // Para el switch
      : { number: Number(newValue) }; // Para descuentos y precios

    const res = await fetch(UPDATE_SETTING_ENDPOINT(key), { 
      method: 'PATCH',
      headers,
      body: JSON.stringify(payload)
    });

    if (!res.ok) throw new Error(await res.text());
    
    const updated = await res.json();
    setSettings(prev => {
      const idx = prev.findIndex(s => s.key === updated.key); 
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = updated;
        return copy;
      }
      return [...prev, updated];
    });
  } catch (err) {
    setError(err.message || 'No se pudo guardar el valor');
  } finally {
    setLoading(false);
  }
};

  const getSettingValue = (key) => {
    const s = settings.find(x => String(x.key).toLowerCase() === String(key).toLowerCase())
    return s?.valueNum ?? null
  }

  return (
    <>
      <Head><title>Otros | Admin</title></Head>
      <div className="min-h-screen text-white font-inter">
        <AdminNavBar />
        <main className="max-w-6xl mx-auto px-6 py-10">
          <header className="mb-6">
            <h1 className="text-2xl font-bold">Otros</h1>
            <p className="text-sm text-gray-400">Panel de utilidades administrativas</p>
          </header>

          {/* Tipo de cambio */}
          <section className="card-exchange">
            <div className="card-header">
              <h2 className="card-title">Tipo de cambio</h2>
              <div className="card-actions">
                <button className="btn" onClick={loadExchange}>
                  {loading ? <span className="spin small" /> : 'Refrescar'}
                </button>
                {!editExchange ? (
                  <button className="btn primary" onClick={() => setEditExchange(true)}>
                    Editar
                  </button>
                ) : (
                  <>
                    <button className="btn" onClick={() => setEditExchange(false)}>Cancelar</button>
                    <button className="btn primary" onClick={saveExchange} disabled={loading}>Guardar</button>
                  </>
                )}
              </div>
            </div>
            <div className="card-body">
              {loading && <div className="muted">Cargando...</div>}
              {error && <div className="error">{error}</div>}
              {!loading && !error && exchange && (
                <div className="exchange-grid">
                  <div className="row">
                    <div className="label">Tasa</div>
                    {!editExchange ? (
                      <div className="value">{Number(exchange.rate).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}</div>
                    ) : (
                      <input className="input-rate" value={editedExchangeValue} onChange={(e) => setEditedExchangeValue(e.target.value)} inputMode="decimal" />
                    )}
                  </div>
                  <div className="row small">
                    <div>Base</div>
                    <div><strong>{exchange.base ?? 'USD'}</strong></div>
                  </div>
                </div>
              )}
            </div>
          </section>
                    {/* Configuración proveedores */}
          <section className="card-settings" style={{ marginTop: 16 }}>
            <div className="card-header">
              <h2 className="card-title">Configuración proveedores</h2>
              <div className="card-actions">
                <button className="btn" onClick={loadSettings}>
                  {loading ? <span className="spin small" /> : 'Refrescar'}
                </button>
              </div>
            </div>
            <div className="card-body">
              {error && <div className="error">{error}</div>}

              <div className="exchange-grid">
                {/* supplierDiscount */}
                <div className="row">
                  <div>
                    <div className="label">Descuento por proveedor</div>
                    <div className="muted small">Descuento aplicado al proveedor</div>
                  </div>

                  {!editingKey || editingKey !== 'supplierDiscount' ? (
                    <div style={{ textAlign: 'right' }}>
                      <div className="value">
                        {getSettingValue('supplierDiscount') != null
                          ? `${(Number(getSettingValue('supplierDiscount')) * 100).toLocaleString(undefined, { maximumFractionDigits: 2 })}%`
                          : '—'}
                      </div>
                      <div style={{ marginTop: 8, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                        <button className="btn primary" onClick={() => startEditSetting('supplierDiscount', getSettingValue('supplierDiscount'))}>
                          Editar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ textAlign: 'right' }}>
                      <input
                        className="input-rate"
                        value={editedValue}
                        onChange={(e) => setEditedValue(e.target.value)}
                        inputMode="decimal"
                        aria-label="Editar supplierDiscount"
                        placeholder="0.10"
                      />
                      <div style={{ marginTop: 8, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                        <button className="btn" onClick={cancelEditSetting}>Cancelar</button>
                        <button className="btn primary" onClick={() => saveSetting('supplierDiscount')} disabled={loading}>Guardar</button>
                      </div>
                    </div>
                  )}
                </div>

                {/* supplierPublication */}
                <div className="row">
                  <div>
                    <div className="label">Precio publicación proveedor</div>
                    <div className="muted small">Precio de publicación</div>
                  </div>

                  {!editingKey || editingKey !== 'supplierPublication' ? (
                    <div style={{ textAlign: 'right' }}>
                      <div className="value">
                        {getSettingValue('supplierPublication') != null
                          ? Number(getSettingValue('supplierPublication')).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })
                          : '—'}
                      </div>
                      <div style={{ marginTop: 8, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                        <button className="btn primary" onClick={() => startEditSetting('supplierPublication', getSettingValue('supplierPublication'))}>
                          Editar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ textAlign: 'right' }}>
                      <input
                        className="input-rate"
                        value={editedValue}
                        onChange={(e) => setEditedValue(e.target.value)}
                        inputMode="decimal"
                        aria-label="Editar supplierPublication"
                        placeholder="15"
                      />
                      <div style={{ marginTop: 8, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                        <button className="btn" onClick={cancelEditSetting}>Cancelar</button>
                        <button className="btn primary" onClick={() => saveSetting('supplierPublication')} disabled={loading}>Guardar</button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="row toggle-row">
        <div>
          <div className="label">Activación automática de Vendedores</div>
          <div className="muted small">Los nuevos registros nacen como 'active'</div>
        </div>
        
        <div className="toggle-container">
          <span className={`status-badge ${settings.find(s => s.key === 'auto_activate_sellers')?.valueBool ? 'active' : ''}`}>
            {settings.find(s => s.key === 'auto_activate_sellers')?.valueBool ? 'ON' : 'OFF'}
          </span>
          <label className="switch">
            <input 
              type="checkbox" 
              checked={settings.find(s => s.key === 'auto_activate_sellers')?.valueBool || false}
              onChange={(e) => saveSetting('auto_activate_sellers', e.target.checked, true)}
              disabled={loading}
            />
            <span className="slider round"></span>
          </label>
        </div>
      </div>
          </section>
        </main>
      </div>

      <style jsx>{`
        .card-exchange, .card-settings {
          max-width: 720px;
          margin: 12px auto;
          background: linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01));
          border-radius: 12px;
          padding: 18px;
          border: 1px solid rgba(255,255,255,0.04);
          box-shadow: 0 12px 30px rgba(0,0,0,0.5);
        }
        .card-header { display:flex; justify-content:space-between; align-items:center; gap:12px; margin-bottom:12px; }
        .card-title { margin:0; font-size:1.25rem; font-weight:800; color:#fff; }
        .card-actions { display:flex; gap:8px; align-items:center; }
        .btn {
          padding:8px 12px;
          border-radius:10px;
          background: rgba(255,255,255,0.03);
          color:#d1d1d1;
          border:0;
          cursor:pointer;
          font-weight:700;
          font-size:0.98rem;
          transition: transform 0.2s ease, filter 0.2s ease;
        }
        .btn:hover {
          filter: brightness(1.05);
          transform: translateY(-1px);
        }
        .btn.primary {
          background: linear-gradient(90deg,#06b6d4,#10b981);
          color:#07101a;
        }
        .btn.primary:hover {
          filter: brightness(1.08);
          transform: translateY(-1px);
        }
        .card-body { min-height:100px; display:flex; flex-direction:column; gap:12px; }
        .muted { color:#9aa0a6; font-size:1rem; }
        .error { color:#fecaca; background: rgba(239,68,68,0.06); padding:8px; border-radius:8px; font-size:1rem; }

        .exchange-grid { display:flex; flex-direction:column; gap:10px; }
        .row { display:flex; justify-content:space-between; align-items:center; gap:12px; padding:8px 0; border-bottom: 1px dashed rgba(255,255,255,0.02); }
        .row.small { border-bottom: none; color:#9aa0a6; font-size:1rem; }
        .label { color:#9aa0a6; font-size:1.05rem; }
        .value { font-weight:900; color:#fff; font-size:1.4rem; }

        .input-rate {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.04);
          color: #fff;
          padding: 10px 12px;
          border-radius: 8px;
          min-width:160px;
          text-align:right;
          font-size:1.15rem;
        }

        .spin {
          display:inline-block;
          width:16px;
          height:16px;
          border:2px solid rgba(255,255,255,0.12);
          border-top-color:#fff;
          border-radius:50%;
          animation: spin 1s linear infinite;
        }
        .spin.small { width:14px; height:14px; border-width:2px; }
        @keyframes spin { to { transform: rotate(360deg); } }

        @media (max-width: 900px) {
          .card-exchange, .card-settings { margin: 8px; padding: 14px; }
          .value { font-size: 1.2rem; }
          .label { font-size: 1rem; }
          .input-rate { font-size: 1.05rem; min-width: 120px; }
        }

        .toggle-row {
  padding: 16px 0;
}
.toggle-container {
  display: flex;
  align-items: center;
  gap: 12px;
}
.status-badge {
  font-size: 0.75rem;
  padding: 4px 8px;
  border-radius: 6px;
  background: rgba(255,255,255,0.05);
  color: #9aa0a6;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.status-badge.active {
  background: rgba(16, 185, 129, 0.1);
  color: #10b981;
}

/* Switch Styling */
.switch {
  position: relative;
  display: inline-block;
  width: 44px;
  height: 22px;
}
.switch input { opacity: 0; width: 0; height: 0; }
.slider {
  position: absolute;
  cursor: pointer;
  top: 0; left: 0; right: 0; bottom: 0;
  background-color: rgba(255,255,255,0.1);
  transition: .4s;
  border-radius: 34px;
}
.slider:before {
  position: absolute;
  content: "";
  height: 16px; width: 16px;
  left: 3px; bottom: 3px;
  background-color: white;
  transition: .4s;
  border-radius: 50%;
}
input:checked + .slider { background: linear-gradient(90deg, #06b6d4, #10b981); }
input:checked + .slider:before { transform: translateX(22px); }
      `}</style>
    </>
  )
}