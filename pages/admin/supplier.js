import { useEffect, useMemo, useState } from 'react'
import Head from 'next/head'
import AdminNavBar from '../../components/AdminNavBar'
import ConfirmModal from '../../components/ConfirmModal'
import AdminPasswordModal from '../../components/AdminPasswordModal'
import AdminPhoneModal from '../../components/AdminPhoneModal'
import { useAuth } from '../../context/AuthProvider'
import {
  FaSearch, FaSyncAlt, FaCheck, FaKey, FaTrash, FaExchangeAlt, FaBan, FaPen, FaExclamationTriangle
} from 'react-icons/fa'

export default function AdminSuppliersPage() {
  const { ensureValidAccess } = useAuth()
  
  const rawApiBase = process.env.NEXT_PUBLIC_API_URL || ''
  const API_BASE = rawApiBase.replace(/\/+$/, '')
  const PROVIDERS_ENDPOINT = `${API_BASE}/api/users/providers`

  const [suppliers, setSuppliers] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1) 
  const pageSize = 30
  const [totalPages, setTotalPages] = useState(1)
  const [totalElements, setTotalElements] = useState(0)

  const [phoneModal, setPhoneModal] = useState({ open: false, userId: null, username: null, currentPhone: '' })
  const [pwdModal, setPwdModal] = useState({ open: false, userId: null, username: null })
  const [confirmData, setConfirmData] = useState({ 
    open: false, userId: null, username: null, action: null, message: '', loading: false, canTransfer: null 
  })

  // Debounce para búsqueda
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchSuppliers(1)
    }, 500)
    return () => clearTimeout(delayDebounceFn)
  }, [query])

  const getAuthToken = async () => {
    try {
      const t = typeof ensureValidAccess === 'function' ? await ensureValidAccess() : null
      if (t) return t
    } catch (e) {
      console.warn('ensureValidAccess error', e)
    }
    if (typeof window !== 'undefined') return localStorage.getItem('accessToken')
    return null
  }

  const fetchSuppliers = async (uiPage = 1) => {
    setLoading(true)
    setError(null)
    try {
      const token = await getAuthToken()
      const headers = { 'Content-Type': 'application/json' }
      if (token) headers['Authorization'] = `Bearer ${token}`

      const zeroPage = Math.max(0, (uiPage ?? 1) - 1)
      let url = `${PROVIDERS_ENDPOINT}?page=${zeroPage}&size=${pageSize}`
      if (query.trim()) {
        url += `&search=${encodeURIComponent(query.trim())}`
      }

      const res = await fetch(url, {
        method: 'GET',
        headers,
        credentials: token ? 'omit' : 'include'
      })

      const text = await res.text().catch(() => null)
      if (!res.ok) throw new Error(text || `Error ${res.status}`)
      
      const payload = text ? JSON.parse(text) : null
      const content = Array.isArray(payload?.content) ? payload.content : []
      
      setSuppliers(content)
      setTotalElements(Number(payload?.totalElements ?? content.length))
      setTotalPages(Number(payload?.totalPages ?? 1))
      setPage(uiPage) 
    } catch (err) {
      setError('No se pudo cargar la lista de proveedores')
      setSuppliers([])
    } finally {
      setLoading(false)
    }
  }

  const callEndpoint = async (url, opts = {}, requireAuth = true) => {
    opts.headers = opts.headers || { 'Content-Type': 'application/json' }
    const token = await getAuthToken()
    if (requireAuth && token) opts.headers['Authorization'] = `Bearer ${token}`
    opts.credentials = (requireAuth && token) ? 'omit' : 'include'
    const res = await fetch(url, opts)
    const text = await res.text().catch(() => null)
    if (!res.ok) throw new Error(text || `Error ${res.status}`)
    try { return text ? JSON.parse(text) : null } catch (_) { return text }
  }

  const requestConfirmAction = (userId, username, currentStatus, actionOverride = null, canTransfer = null, pStatus = null) => {
  const action = actionOverride || (currentStatus === 'active' ? 'disable' : 'verify');
  
  let message = '';
  if (action === 'verify') message = `Vas a activar al proveedor ${username}. ¿Deseas continuar?`;
  else if (action === 'disable') message = `Vas a inhabilitar al proveedor ${username}. ¿Deseas continuar?`;
  else if (action === 'delete') message = `¿Seguro que quieres eliminar al proveedor ${username}? Esta acción es irreversible.`;
  else if (action === 'transfer') {
    message = canTransfer 
      ? `Vas a deshabilitar la capacidad de transferir del proveedor ${username}.`
      : `Vas a habilitar la capacidad de transferir del proveedor ${username}.`;
  }
  // Nueva lógica para el botón de emergencia
  else if (action === 'emergency') {
    message = pStatus === 'emergency'
      ? `Vas a quitar el estado de EMERGENCIA al proveedor ${username} y volverlo a ACTIVO.`
      : `Vas a poner al proveedor ${username} en estado de EMERGENCIA.`;
  }
  
  setConfirmData({ open: true, userId, username, action, message, loading: false, canTransfer, pStatus });
};

  const handleConfirm = async () => {
    const { userId, action } = confirmData
    if (!userId || !action) return
    setConfirmData(prev => ({ ...prev, loading: true }))
    try {
      let url = '', method = 'PATCH'
      if (action === 'verify') url = `${API_BASE}/api/users/${encodeURIComponent(userId)}/status?status=active`
      else if (action === 'disable') url = `${API_BASE}/api/users/${encodeURIComponent(userId)}/status?status=inactive`
      else if (action === 'delete') { url = `${API_BASE}/api/users/delete/${encodeURIComponent(userId)}`; method = 'DELETE' }
      else if (action === 'transfer') url = `${API_BASE}/api/admin/users/${encodeURIComponent(userId)}/enable-transfer`

      else if (action === 'emergency') {
      url = `${API_BASE}/api/admin/users/toggle-emergency/${encodeURIComponent(userId)}`;
      method = 'PUT';
    }
      
      await callEndpoint(url, { method })
      await fetchSuppliers(page)
      setConfirmData({ open: false, userId: null, username: null, action: null, message: '', loading: false, canTransfer: null })
    } catch (err) {
      setError(err.message || 'Error en la acción')
      setConfirmData(prev => ({ ...prev, loading: false }))
    }
  }

  const goPrev = () => { if (page > 1) fetchSuppliers(page - 1) }
  const goNext = () => { if (page < totalPages) fetchSuppliers(page + 1) }

  return (
    <>
      <Head><title>Proveedores | Admin</title></Head>
      <div className="admin-container">
        <AdminNavBar />
        <main className="admin-content">
          <header className="content-header">
            <div>
              <h1 className="title">Proveedores</h1>
              <p className="subtitle">Gestión de proveedores y transferencias</p>
            </div>
            <button className="btn-refresh" onClick={() => fetchSuppliers(page)}>
              <FaSyncAlt className={loading ? 'animate-spin' : ''} />
            </button>
          </header>

          <section className="controls-row">
            <div className="search-container">
              <div className="search-box">
                <FaSearch className="icon" />
                <input 
                  placeholder="Buscar por nombre, username o celular..." 
                  value={query} 
                  onChange={(e) => setQuery(e.target.value)} 
                />
              </div>
            </div>
            <div className="modern-pager">
              <div className="pager-info">Total: <span className="total-badge">{totalElements}</span></div>
              <div className="pager-actions">
                <button onClick={goPrev} disabled={page === 1 || loading} className="pager-btn">Anterior</button>
                <div className="page-indicator">{page} <span>/</span> {totalPages}</div>
                <button onClick={goNext} disabled={page === totalPages || loading} className="pager-btn">Siguiente</button>
              </div>
            </div>
          </section>

          <section className="table-container">
            {error && <div className="error-message">{error}</div>}
            <div className="table-wrapper">
              <table className="users-table">
                <thead>
                  <tr>
                    <th>No.</th><th>Nombre</th><th>Username</th><th>Celular</th><th>Balance</th><th>Transfer</th><th>Habilitado</th><th>Estado</th><th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {suppliers.map((u, idx) => {
  // Estado de la cuenta de usuario (Habilitado/Inhabilitado)
  const currentStatus = (u.status ?? (u.active ? 'active' : 'inactive'));
  const canTransfer = Boolean(u.canTransfer ?? u.can_transfer ?? u.allowTransfer);
  const isDeletable = String(currentStatus).toLowerCase() === 'inactive'; 
  
  // Estado específico del proveedor (active, inactive, emergency)
  const pStatus = (u.providerStatus || 'inactive').toLowerCase();

  return (
    <tr key={u.id}>
      <td className="mono">{(page - 1) * pageSize + idx + 1}</td>
      <td className="bold">{u.name || u.username || '-'}</td>
      <td>{u.username || '-'}</td>
      <td>
        <div className="phone-cell">
          {u.phone || '-'}
          <button 
            onClick={() => setPhoneModal({ open: true, userId: u.id, username: u.username, currentPhone: u.phone })} 
            className="edit-phone"
          > 
            <FaPen size={11} />
          </button>
        </div>
      </td>
      <td className="mono highlight">
        {typeof u.balance === 'number' ? u.balance.toFixed(2) : (u.balance ?? '0.00')} 
      </td>
      <td className="bold">{canTransfer ? 'SÍ' : 'NO'}</td> 

      {/* Columna: HABILITADO */}
      <td>
        <span className={`status ${currentStatus}`}>
          {currentStatus === 'active' ? 'SÍ' : 'NO'} 
        </span>
      </td>

      {/* Columna: ESTADO */}
      <td>
        <span className={`p-status ${pStatus}`}>
          {pStatus === 'active' && 'ACTIVO'}
          {pStatus === 'inactive' && 'DURMIENDO'}
          {pStatus === 'emergency' && 'EMERGENCIA'}
        </span>
      </td>

      <td className="actions-cell">
        <div className="actions">
          <button 
            onClick={() => requestConfirmAction(u.id, u.username, currentStatus)} 
            className={currentStatus === 'active' ? 'btn-disable' : 'btn-verify'} 
            title={currentStatus === 'active' ? 'Inhabilitar' : 'Activar'}
          >
            <FaCheck />
          </button>
          
          <button 
            onClick={() => setPwdModal({ open: true, userId: u.id, username: u.username })} 
            title="Contraseña"
          >
            <FaKey />
          </button>
          
          <button 
            onClick={() => requestConfirmAction(u.id, u.username, currentStatus, 'transfer', canTransfer)} 
            className={canTransfer ? 'btn-transfer-on' : 'btn-transfer-off'} 
            title="Transferencia"
          >
            {canTransfer ? <FaExchangeAlt /> : <FaBan />}
          </button>

          {/* BOTÓN DE EMERGENCIA: Ahora antes de Eliminar */}
          <button 
            onClick={() => requestConfirmAction(u.id, u.username, currentStatus, 'emergency', null, pStatus)} 
            className={pStatus === 'emergency' ? 'btn-emergency-on' : 'btn-emergency-off'} 
            title="Alternar Emergencia"
          >
            <FaExclamationTriangle />
          </button>
          
          <button 
            onClick={() => isDeletable && requestConfirmAction(u.id, u.username, currentStatus, 'delete')} 
            className={isDeletable ? 'btn-danger' : 'btn-danger disabled'} 
            disabled={!isDeletable} 
            title="Eliminar"
          > 
            <FaTrash />
          </button>
        </div>
      </td>
    </tr>
  )
})}
                </tbody>
              </table>
              {suppliers.length === 0 && !loading && <div className="empty-text">No se encontraron resultados.</div>}
            </div>
            {loading && <div className="loading-overlay">Cargando datos...</div>}
          </section>
        </main>
      </div>

      <style jsx>{`
        .admin-container { min-height: 100vh; font-family: 'Inter', sans-serif; color: #fff; }
        .admin-content { max-width: 100%; padding: 2rem; }
        .content-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; }
        .title { font-size: 1.875rem; font-weight: 700; margin: 0; }
        .subtitle { color: #9aa0a6; font-size: 0.875rem; margin: 0.25rem 0 0; }

        .controls-row { display: flex; flex-direction: column; gap: 1rem; margin-bottom: 1.5rem; background: rgba(255,255,255,0.02); padding: 1rem; border-radius: 0.75rem; border: 1px solid rgba(255,255,255,0.05); }
        .search-container { width: 100%; }
        .search-box { display: flex; align-items: center; gap: 0.75rem; background: rgba(0,0,0,0.2); padding: 0.75rem 1rem; border-radius: 0.625rem; border: 1px solid rgba(255,255,255,0.1); }
        .search-box input { background: transparent; border: none; outline: none; color: #fff; width: 100%; font-size: 16px; }
        .search-box .icon { color: #555; }

        .modern-pager { display: flex; flex-direction: row; justify-content: space-between; align-items: center; width: 100%; gap: 0.5rem; }
        .pager-info { font-size: 0.85rem; color: #9aa0a6; }
        .total-badge { background: #06b6d4; color: #fff; padding: 2px 8px; border-radius: 6px; font-weight: 700; }
        .pager-actions { display: flex; align-items: center; background: rgba(255,255,255,0.03); padding: 0.25rem; border-radius: 0.625rem; border: 1px solid rgba(255,255,255,0.1); }
        .pager-btn { background: transparent; border: none; color: #fff; padding: 0.5rem 0.875rem; cursor: pointer; font-size: 0.8rem; border-radius: 0.375rem; transition: 0.2s; }
        .pager-btn:hover:not(:disabled) { background: rgba(255,255,255,0.1); }
        .pager-btn:disabled { opacity: 0.2; cursor: not-allowed; }
        .page-indicator { padding: 0 1rem; font-weight: 700; border-left: 1px solid #333; border-right: 1px solid #333; font-size: 0.9rem; }

        @media (min-width: 768px) {
          .controls-row { flex-direction: row; justify-content: space-between; }
          .search-container { max-width: 400px; }
          .modern-pager { width: auto; justify-content: flex-end; }
        }

        .table-container { width: 100%; position: relative; }
        .table-wrapper { width: 100%; overflow-x: auto; background: rgba(255,255,255,0.01); border-radius: 0.75rem; border: 1px solid rgba(255,255,255,0.05); }
        .users-table { width: 100%; border-collapse: collapse; text-align: left; min-width: 1000px; }
        th { padding: 1rem; background: rgba(255,255,255,0.03); color: #9aa0a6; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; text-align: center; }
        td { padding: 1rem; border-bottom: 1px solid rgba(255,255,255,0.03); font-size: 0.9rem; text-align: center; }
        
        .bold {
  font-weight: 600; 
  white-space: nowrap; /* Esto garantiza que el nombre siempre esté en una sola línea */
  /* Hemos eliminado max-width, overflow y text-overflow */
}
        .mono { font-family: ui-monospace, monospace; }
        .highlight { color: #22d3ee; }
        .phone-cell { display: flex; align-items: center; gap: 0.5rem; justify-content: center; }
        .edit-phone { background: none; border: none; color: #06b6d4; cursor: pointer; padding: 0.25rem; }
        
        .actions-cell { text-align: center; }
        .actions { display: flex; gap: 0.5rem; justify-content: center; align-items: center; }
        .actions button { width: 2.125rem; height: 2.125rem; display: flex; align-items: center; justify-content: center; border-radius: 0.5rem; border: none; background: rgba(255,255,255,0.05); color: #fff; cursor: pointer; transition: 0.2s; }
        .actions button:hover:not(:disabled) { background: rgba(255,255,255,0.1); transform: translateY(-1px); }
        
        .btn-verify { background: #10b981 !important; color: #000 !important; }
        .btn-disable { background: #f59e0b !important; color: #000 !important; }
        .btn-transfer-on { background: #3b82f6 !important; color: #fff !important; }
        .btn-transfer-off { background: #6b7280 !important; color: #fff !important; }
        .btn-danger { color: #f87171 !important; }
        .btn-danger.disabled { opacity: 0.15; cursor: not-allowed; }

        .status { padding: 0.25rem 0.75rem; border-radius: 9999px; font-weight: 700; font-size: 0.75rem; display: inline-block; min-width: 80px; text-align: center; }
        .status.active { background: linear-gradient(90deg, #34d399, #10b981); color: #04261a; }
        .status.inactive { background: linear-gradient(90deg, #fecaca, #f87171); color: #2b0404; }

        .loading-overlay { padding: 4rem; text-align: center; color: #06b6d4; font-weight: 700; }
        .empty-text { padding: 3rem; text-align: center; color: #555; font-style: italic; }
        .btn-refresh { background: none; border: none; color: #9aa0a6; cursor: pointer; font-size: 1.25rem; }
        .animate-spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

        /* Estilos para la nueva columna de estado del proveedor */
.p-status {
  padding: 0.25rem 0.75rem;
  border-radius: 6px; /* Un diseño más cuadrado para diferenciarlo */
  font-weight: 700;
  font-size: 0.7rem;
  display: inline-block;
  min-width: 90px;
  text-align: center;
  text-transform: uppercase;
}

/* Verde para ACTIVO */
.p-status.active {
  background: #064e3b;
  color: #34d399;
  border: 1px solid #059669;
}

/* Naranja para DURMIENDO (inactive) */
.p-status.inactive {
  background: #451a03;
  color: #fbbf24;
  border: 1px solid #d97706;
}

/* Rojo para EMERGENCIA */
.p-status.emergency {
  background: #450a0a;
  color: #f87171;
  border: 1px solid #dc2626;
  animation: pulse-red 2s infinite; /* Efecto visual de alerta */
}

@keyframes pulse-red {
  0% { opacity: 1; }
  50% { opacity: 0.7; }
  100% { opacity: 1; }
}

.btn-emergency-on {
  background: #dc2626 !important; /* Rojo fuerte */
  color: #fff !important;
}

.btn-emergency-off {
  background: rgba(255, 255, 255, 0.1) !important;
  color: #f87171 !important; /* Texto rojo suave */
}

.btn-emergency-off:hover {
  background: #450a0a !important;
}
      `}</style>

      <ConfirmModal {...confirmData} onConfirm={handleConfirm} onCancel={() => setConfirmData({ ...confirmData, open: false })} />
      <AdminPasswordModal {...pwdModal} onClose={() => setPwdModal({ open: false })} />
      <AdminPhoneModal {...phoneModal} onClose={() => setPhoneModal({ open: false })} onSuccess={() => { setPhoneModal({ open: false }); fetchSuppliers(page); }} />
    </>
  )
}