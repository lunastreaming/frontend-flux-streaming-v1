// pages/admin/supplier.js
import { useEffect, useMemo, useState } from 'react'
import Head from 'next/head'
import AdminNavBar from '../../components/AdminNavBar'
import ConfirmModal from '../../components/ConfirmModal'
import AdminPasswordModal from '../../components/AdminPasswordModal'
import { useAuth } from '../../context/AuthProvider'
import {
  FaSearch, FaSyncAlt, FaCheck, FaKey, FaTrash, FaExchangeAlt, FaBan
} from 'react-icons/fa'

export default function AdminSuppliersPage() {
  const { ensureValidAccess } = useAuth()
  const API_BASE_RAW = process.env.NEXT_PUBLIC_API_URL || ''
  const API_BASE = API_BASE_RAW.replace(/\/+$/, '')
  const PROVIDERS_ENDPOINT = `${API_BASE}/api/users/providers`

  const [suppliers, setSuppliers] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const pageSize = 20

  const [confirmData, setConfirmData] = useState({
    open: false,
    userId: null,
    username: null,
    action: null,
    message: '',
    loading: false
  })

  // Estado para el modal de cambio de contraseña
  const [pwdModal, setPwdModal] = useState({ open: false, userId: null, username: null })

  useEffect(() => { fetchSuppliers() }, []) // eslint-disable-line react-hooks/exhaustive-deps

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

  const fetchSuppliers = async () => {
    setLoading(true)
    setError(null)
    try {
      const token = await getAuthToken()
      const headers = { 'Content-Type': 'application/json' }
      if (token) headers['Authorization'] = `Bearer ${token}`

      const res = await fetch(PROVIDERS_ENDPOINT, {
        method: 'GET',
        headers,
        credentials: token ? 'omit' : 'include'
      })
      const text = await res.text().catch(() => null)
      if (!res.ok) {
        const msg = text && text.length ? text : `Error ${res.status}`
        throw new Error(msg)
      }
      const data = text ? JSON.parse(text) : []
      setSuppliers(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('Error fetching suppliers:', err)
      setError('No se pudo cargar la lista de proveedores')
      setSuppliers([])
    } finally {
      setLoading(false)
    }
  }

  const filtered = useMemo(() => {
    if (!query) return suppliers
    const q = query.trim().toLowerCase()
    return suppliers.filter(u =>
      String(u.id ?? '').toLowerCase().includes(q) ||
      (u.name || u.username || '').toLowerCase().includes(q) ||
      (u.username || '').toLowerCase().includes(q) ||
      (u.phone || '').toLowerCase().includes(q)
    )
  }, [suppliers, query])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const pageItems = filtered.slice((page - 1) * pageSize, page * pageSize)
  const startIndex = (page - 1) * pageSize

  useEffect(() => { if (page > totalPages) setPage(1) }, [totalPages, page])

  const callEndpoint = async (url, opts = {}, requireAuth = true) => {
    opts.headers = opts.headers || { 'Content-Type': 'application/json' }
    const token = await getAuthToken()
    if (requireAuth) {
      if (token) opts.headers['Authorization'] = `Bearer ${token}`
      else console.warn('callEndpoint: no token found, request will use cookies')
    }
    if (requireAuth && token) opts.credentials = opts.credentials ?? 'omit'
    else opts.credentials = opts.credentials ?? 'include'

    const res = await fetch(url, opts)
    const text = await res.text().catch(() => null)
    if (!res.ok) {
      const msg = text && text.length ? text : `Error ${res.status}`
      throw new Error(msg)
    }
    try { return text ? JSON.parse(text) : null } catch (_) { return text }
  }

  const statusBadge = (status) => {
    if (!status) return <span className="status unknown">-</span>
    if (status === 'active') return <span className="status active">Activo</span>
    return <span className="status inactive">Inactivo</span>
  }

  // Abre modal de confirmación para acciones que no sean password
  const requestConfirmAction = (userId, username, currentStatus, actionOverride = null) => {
    const action = actionOverride || (currentStatus === 'active' ? 'disable' : 'verify')
    // Si la acción es 'password' no usamos este modal; abrimos el modal de password
    if (action === 'password') {
      openPasswordModal(userId, username)
      return
    }

    let message = ''
    if (action === 'verify') {
      message = `Vas a activar al proveedor ${username}. ¿Deseas continuar?`
    } else if (action === 'disable') {
      message = `Vas a inhabilitar al proveedor ${username}. ¿Deseas continuar?`
    } else if (action === 'delete') {
      message = `¿Seguro que quieres eliminar al proveedor ${username}? Esta acción es irreversible.`
    } else {
      message = `Confirmar acción ${action} para proveedor ${username}.`
    }
    setConfirmData({ open: true, userId, username, action, message, loading: false })
  }

  const handleConfirm = async () => {
    const { userId, action } = confirmData
    if (!userId || !action) {
      setConfirmData({ open: false, userId: null, username: null, action: null, message: '', loading: false })
      return
    }
    setConfirmData(prev => ({ ...prev, loading: true }))
    setLoading(true)
    try {
      if (action === 'verify') {
        const url = `${API_BASE}/api/users/${encodeURIComponent(userId)}/status?status=active`
        await callEndpoint(url, { method: 'PATCH' }, true)
        await fetchSuppliers()
      } else if (action === 'disable') {
        const url = `${API_BASE}/api/users/${encodeURIComponent(userId)}/status?status=inactive`
        await callEndpoint(url, { method: 'PATCH' }, true)
        await fetchSuppliers()
      } else if (action === 'delete') {
        const url = `${API_BASE}/api/users/delete/${encodeURIComponent(userId)}`
        await callEndpoint(url, { method: 'DELETE' }, true)
        await fetchSuppliers()
      } else {
        // otras acciones administrativas si las tuvieras
        const url = `${API_BASE}/api/admin/users/${action}/${encodeURIComponent(userId)}`
        await callEndpoint(url, { method: 'POST', body: JSON.stringify({}) }, true)
        await fetchSuppliers()
      }
      setConfirmData({ open: false, userId: null, username: null, action: null, message: '', loading: false })
    } catch (err) {
      console.error(`handleConfirm error for ${action} ${userId}:`, err)
      setError(err.message || 'Ocurrió un error en la acción')
      setConfirmData(prev => ({ ...prev, loading: false }))
    } finally {
      setLoading(false)
    }
  }

  const handleCancelConfirm = () => {
    setConfirmData({ open: false, userId: null, username: null, action: null, message: '', loading: false })
  }

  // Abrir / cerrar modal de contraseña
  const openPasswordModal = (userId, username) => {
    setPwdModal({ open: true, userId, username })
  }
  const closePasswordModal = () => {
    setPwdModal({ open: false, userId: null, username: null })
  }
    return (
    <>
      <Head><title>Proveedores | Admin</title></Head>

      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 text-white">
        <AdminNavBar />

        <main className="max-w-7xl mx-auto px-6 py-8">
          <header className="mb-6 flex items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold">Proveedores</h1>
              <p className="text-sm text-gray-400">Lista de proveedores y acciones administrativas</p>
            </div>
            <div className="header-actions">
              <button className="btn-refresh" onClick={fetchSuppliers} aria-label="Refrescar">
                <FaSyncAlt />
              </button>
            </div>
          </header>

          <section className="search-row">
            <div className="search-box" role="search">
              <FaSearch className="icon" />
              <input
                placeholder="Buscar por id, name, username o celular..."
                value={query}
                onChange={(e) => { setQuery(e.target.value); setPage(1) }}
                aria-label="Buscar proveedores"
              />
            </div>
          </section>

          <section className="table-wrap">
            {loading ? (
              <div className="loading">Cargando proveedores...</div>
            ) : error ? (
              <div className="error">{error}</div>
            ) : (
              <>
                <div className="table-scroll">
                  <table className="users-table" role="table" aria-label="Tabla de proveedores">
                    <thead>
                      <tr>
                        <th>No.</th>
                        <th>Name</th>
                        <th>Username</th>
                        <th>Celular</th>
                        <th>Balance</th>
                        <th>Activo</th>
                        <th>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pageItems.map((u, idx) => {
                        const currentStatus = (u.status ?? (u.active ? 'active' : 'inactive'))
                        const actionLabel = currentStatus === 'active' ? 'Inhabilitar' : 'Verificar'
                        const canTransfer = Boolean(u.canTransfer ?? u.can_transfer ?? u.allowTransfer)
                        return (
                          <tr key={u.id ?? idx}>
                            <td className="mono">{startIndex + idx + 1}</td>
                            <td>{u.name ?? u.username ?? '-'}</td>
                            <td>{u.username ?? '-'}</td>
                            <td>{u.phone ?? u.celular ?? '-'}</td>
                            <td className="mono">{typeof u.balance === 'number' ? u.balance.toFixed(2) : (u.balance ?? '-')}</td>
                            <td>{statusBadge(currentStatus)}</td>
                            <td>
                              <div className="actions">
                                <button
                                  title={actionLabel}
                                  onClick={() => requestConfirmAction(u.id, u.username ?? u.phone ?? String(u.id), currentStatus)}
                                  aria-label={`${actionLabel} proveedor ${u.id}`}
                                  className={currentStatus === 'active' ? 'disable-btn' : 'verify-btn'}
                                >
                                  <FaCheck />
                                </button>

                                <button
                                  title="Password"
                                  onClick={() => openPasswordModal(u.id, u.username ?? u.phone ?? String(u.id))}
                                  aria-label={`Reset password ${u.id}`}
                                >
                                  <FaKey />
                                </button>

                                <button
                                  title={canTransfer ? 'Puede transferir' : 'No puede transferir'}
                                  aria-label={`Transfer capability ${u.id}`}
                                  className={canTransfer ? 'transfer-true' : 'transfer-false'}
                                >
                                  {canTransfer ? <FaExchangeAlt /> : <FaBan />}
                                </button>

                                <button
                                  title="Eliminar"
                                  onClick={() => requestConfirmAction(u.id, u.username ?? u.phone ?? String(u.id), currentStatus, 'delete')}
                                  className="danger"
                                  aria-label={`Eliminar ${u.id}`}
                                >
                                  <FaTrash />
                                </button>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                      {pageItems.length === 0 && (
                        <tr><td colSpan="7" className="empty">No se encontraron proveedores</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="pager-container">
                  <div className="pager-info">Mostrando {Math.min(filtered.length, page * pageSize)} de {filtered.length} proveedores</div>
                  <div className="pager-controls" role="navigation" aria-label="Paginación">
                    <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>Anterior</button>
                    <span className="pager-page"> {page} / {totalPages} </span>
                    <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Siguiente</button>
                  </div>
                </div>
              </>
            )}
          </section>
        </main>
      </div>

      <ConfirmModal
        open={confirmData.open}
        title={
          confirmData.action === 'verify'
            ? 'Confirmar activación'
            : confirmData.action === 'disable'
            ? 'Confirmar inhabilitación'
            : confirmData.action === 'delete'
            ? 'Confirmar eliminación'
            : 'Confirmar acción'
        }
        message={confirmData.message}
        confirmText={
          confirmData.action === 'verify'
            ? 'Activar'
            : confirmData.action === 'disable'
            ? 'Inhabilitar'
            : confirmData.action === 'delete'
            ? 'Eliminar'
            : 'Confirmar'
        }
        cancelText="Cancelar"
        onConfirm={handleConfirm}
        onCancel={handleCancelConfirm}
        loading={confirmData.loading}
      />

      <AdminPasswordModal
        open={pwdModal.open}
        userId={pwdModal.userId}
        username={pwdModal.username}
        onClose={closePasswordModal}
        onSuccess={() => { closePasswordModal(); fetchSuppliers(); }}
      />

      <style jsx>{`
        .search-row { margin-bottom: 12px; display:flex; gap:12px; align-items:center; }
        .search-box { display:flex; align-items:center; gap:8px; background: rgba(255,255,255,0.02); padding:8px 12px; border-radius:10px; border:1px solid rgba(255,255,255,0.03); }
        .search-box input { background: transparent; border: 0; outline: none; color: #e6e6e6; width: 380px; min-width: 160px; font-size: 0.95rem; }
        .search-box .icon { color:#9aa0a6 }

        .table-wrap {
          margin-top: 8px;
          display: flex;
          justify-content: center;
          flex-direction: column;
          gap: 12px;
        }
        .table-scroll {
          max-width: 100%;
          overflow-x: auto;
          border-radius: 10px;
        }

        table.users-table {
          table-layout: fixed;
          width: 100%;
          border-collapse: collapse;
          min-width: 900px;
          margin: 0 auto;
        }

        th, td {
          padding: 12px 10px;
          text-align: left;
          border-bottom: 1px solid rgba(255,255,255,0.03);
          font-size: 0.95rem;
          color: #d7d7d7;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        thead th { background: rgba(255,255,255,0.02); font-weight:800; color:#fff; position: sticky; top: 0; backdrop-filter: blur(6px); }

        thead th:nth-child(1), tbody td:nth-child(1) { width: 6%; }
        thead th:nth-child(2), tbody td:nth-child(2) { width: 16%; } /* Name */
        thead th:nth-child(3), tbody td:nth-child(3) { width: 16%; } /* Username */
        thead th:nth-child(4), tbody td:nth-child(4) { width: 14%; } /* Phone */
        thead th:nth-child(5), tbody td:nth-child(5) { width: 12%; } /* Balance */
        thead th:nth-child(6), tbody td:nth-child(6) { width: 10%; } /* Active */
        thead th:nth-child(7), tbody td:nth-child(7) { width: 20%; max-width: 360px; vertical-align: top; padding-right: 8px; overflow: hidden; }

        .mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, "Roboto Mono", monospace; }

        .actions {
          display: flex;
          flex-wrap: nowrap;
          gap: 8px;
          justify-content: flex-start;
          align-items: center;
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
          max-width: 100%;
        }

        .actions button {
          display: inline-grid;
          place-items: center;
          min-width: 34px;
          width: 34px;
          height: 34px;
          padding: 0;
          border-radius: 8px;
          background: rgba(255,255,255,0.02);
          border: 0;
          color: #d1d1d1;
          cursor: pointer;
          transition: transform .12s ease, background .12s ease, opacity .12s ease;
          font-size: 14px;
          white-space: nowrap;
        }
        .actions button:hover { transform: translateY(-2px); background: rgba(255,255,255,0.04); }
        .actions button.danger { background: linear-gradient(90deg,#ef4444,#f97316); color: #fff; }

        .verify-btn { background: linear-gradient(90deg,#06b6d4,#10b981); color:#07101a; }
        .disable-btn { background: linear-gradient(90deg,#f97316,#ef4444); color:#fff; }

        /* Transfer icons styling */
        .transfer-true { background: linear-gradient(90deg,#06b6d4,#3b82f6); color: #07101a; }
        .transfer-false { background: linear-gradient(90deg,#9ca3af,#6b7280); color: #0b0b0b; }

        .loading, .empty { color:#9aa0a6; padding: 18px; text-align:center; }
        .error { color:#fecaca; padding: 10px; background: rgba(239,68,68,0.06); border-radius:8px; margin-bottom:8px; }

        .status { display:inline-block; padding:6px 10px; border-radius:999px; font-weight:700; font-size:0.85rem; color:#07101a; }
        .status.active { background: linear-gradient(90deg,#34d399,#10b981); color:#04261a; }
        .status.inactive { background: linear-gradient(90deg,#fecaca,#f87171); color:#2b0404; }
        .status.unknown { background: rgba(255,255,255,0.03); color:#d7d7d7; }

        .pager-container {
          display: flex;
          flex-direction: column;
          gap: 8px;
          align-items: center;
          justify-content: center;
          margin-top: 8px;
          color: #9aa0a6;
          font-size: 0.95rem;
        }
        .pager-info { text-align: center; }
        .pager-controls { display:flex; gap:10px; align-items:center; }
        .pager-controls button { padding:6px 10px; border-radius:8px; border:0; background: rgba(255,255,255,0.02); color:#d1d1d1; cursor:pointer; }
        .pager-page { font-weight:700; color:#fff; }

        .btn-refresh { width:40px; height:40px; display:inline-grid; place-items:center; border-radius:10px; border:0; background: rgba(255,255,255,0.03); color:#d1d1d1; cursor:pointer; }

        @media (max-width: 920px) {
          table.users-table { min-width: 760px; }
          .search-box input { width: 100%; }
          thead th:nth-child(7), tbody td:nth-child(7) { max-width: 300px; width: 26%; }
          thead th:nth-child(5), tbody td:nth-child(5) { width: 12%; }
        }
      `}</style>
    </>
  )
}