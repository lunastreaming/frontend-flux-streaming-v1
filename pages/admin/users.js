// pages/admin/users.js
import { useEffect, useMemo, useState } from 'react'
import Head from 'next/head'
import AdminNavBar from '../../components/AdminNavBar'
import ConfirmModal from '../../components/ConfirmModal'
import AdminPasswordModal from '../../components/AdminPasswordModal'
import { useAuth } from '../../context/AuthProvider'
import {
  FaSearch, FaSyncAlt, FaCheck, FaKey, FaTag, FaGift, FaUserFriends, FaTrash
} from 'react-icons/fa'

export default function AdminUsersPage() {
  const { ensureValidAccess } = useAuth()

  const rawApiBase = process.env.NEXT_PUBLIC_API_URL || ''
  const API_BASE = rawApiBase.replace(/\/+$/, '')
  const USERS_ENDPOINT = `${API_BASE}/api/users/sellers`

  // server-side data
  const [users, setUsers] = useState([]) // content for current page
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // search + server pagination state
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1) // UI 1-based
  const pageSize = 30                 // 30 por página (server-side)
  const [totalPages, setTotalPages] = useState(1)
  const [totalElements, setTotalElements] = useState(0)

  const [confirmData, setConfirmData] = useState({
    open: false,
    userId: null,
    username: null,
    action: null,
    message: '',
    loading: false
  })

  const [pwdModal, setPwdModal] = useState({ open: false, userId: null, username: null })

  useEffect(() => {
    fetchUsers(page)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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

  // Fetch page from backend (server-side pagination)
  const fetchUsers = async (uiPage = 1) => {
    setLoading(true)
    setError(null)
    try {
      const token = await getAuthToken()
      const headers = { 'Content-Type': 'application/json' }
      if (token) headers['Authorization'] = `Bearer ${token}`

      // backend expects 0-based page
      const zeroPage = Math.max(0, (uiPage ?? 1) - 1)
      const url = `${USERS_ENDPOINT}?page=${zeroPage}&size=${pageSize}`
      const res = await fetch(url, {
        method: 'GET',
        headers,
        credentials: token ? 'omit' : 'include'
      })
      const text = await res.text().catch(() => null)
      if (!res.ok) {
        const msg = text && text.length ? text : `Error ${res.status}`
        throw new Error(msg)
      }
      const payload = text ? JSON.parse(text) : null
      const content = Array.isArray(payload?.content) ? payload.content : []
      setUsers(content)
      setTotalElements(Number(payload?.totalElements ?? content.length))
      setTotalPages(Number(payload?.totalPages ?? 1))
      const respNumber = Number(payload?.number ?? zeroPage)
      setPage(respNumber + 1)
    } catch (err) {
      console.error('Error fetching users:', err)
      setError('No se pudo cargar la lista de usuarios')
      setUsers([])
      setTotalElements(0)
      setTotalPages(1)
      setPage(1)
    } finally {
      setLoading(false)
    }
  }

  // Client-side filtering only over current page content
  const filtered = useMemo(() => {
    if (!query) return users
    const q = query.trim().toLowerCase()
    return users.filter(u =>
      String(u.id ?? '').toLowerCase().includes(q) ||
      (u.username || '').toLowerCase().includes(q) ||
      (u.phone || '').toLowerCase().includes(q) ||
      (u.role || '').toLowerCase().includes(q)
    )
  }, [users, query])

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

  // Confirm modal flow
  const requestConfirmAction = (userId, username, currentStatus, actionOverride = null) => {
    const action = actionOverride || (currentStatus === 'active' ? 'disable' : 'verify')

    if (action === 'password') {
      openPasswordModal(userId, username)
      return
    }

    let message = ''
    if (action === 'verify') {
      message = `Vas a activar al usuario ${username}. ¿Deseas continuar?`
    } else if (action === 'disable') {
      message = `Vas a inhabilitar al usuario ${username}. ¿Deseas continuar?`
    } else if (action === 'delete') {
      message = `¿Seguro que quieres eliminar al usuario ${username}? Esta acción es irreversible.`
    } else {
      message = `Confirmar acción ${action} para usuario ${username}.`
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
      } else if (action === 'disable') {
        const url = `${API_BASE}/api/users/${encodeURIComponent(userId)}/status?status=inactive`
        await callEndpoint(url, { method: 'PATCH' }, true)
      } else if (action === 'delete') {
        const url = `${API_BASE}/api/users/delete/${encodeURIComponent(userId)}`
        await callEndpoint(url, { method: 'DELETE' }, true)
      } else {
        const url = `${API_BASE}/api/admin/users/${action}/${encodeURIComponent(userId)}`
        await callEndpoint(url, { method: 'POST', body: JSON.stringify({}) }, true)
      }
      // refresh current page from backend
      await fetchUsers(page)
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

  // Password modal
  const openPasswordModal = (userId, username) => {
    setPwdModal({ open: true, userId, username })
  }
  const closePasswordModal = () => {
    setPwdModal({ open: false, userId: null, username: null })
  }

  // Pagination controls (server-side)
  const goPrev = () => {
    const next = Math.max(1, page - 1)
    if (next !== page) fetchUsers(next)
  }
  const goNext = () => {
    const next = Math.min(totalPages, page + 1)
    if (next !== page) fetchUsers(next)
  }
  const refresh = () => fetchUsers(page)

  return (
    <>
      <Head><title>Usuarios | Admin</title></Head>

      <div className="min-h-screen text-white font-inter">
        <AdminNavBar />

        <main className="max-w-7xl mx-auto px-6 py-8">
          <header className="mb-6 flex items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold">Usuarios</h1>
              <p className="text-sm text-gray-400">Lista de vendedores y acciones administrativas</p>
            </div>
            <div className="header-actions">
              <button className="btn-refresh" onClick={refresh} aria-label="Refrescar">
                <FaSyncAlt />
              </button>
            </div>
          </header>

          <section className="search-row">
            <div className="search-box" role="search">
              <FaSearch className="icon" />
              <input
                placeholder="Buscar por nro, username, celular o rol..."
                value={query}
                onChange={(e) => { setQuery(e.target.value) }}
                aria-label="Buscar usuarios"
              />
            </div>
          </section>

          <section className="table-wrap">
            {loading ? (
              <div className="loading">Cargando usuarios...</div>
            ) : error ? (
              <div className="error">{error}</div>
            ) : (
              <>
                <div className="table-scroll">
                  <table className="users-table" role="table" aria-label="Tabla de usuarios">
                    <thead>
                      <tr>
                        <th>No.</th>
                        <th>Username</th>
                        <th>Celular</th>
                        <th>Rol</th>
                        <th>Balance</th>
                        <th>Nº Ventas</th>
                        <th>Activo</th>
                        <th>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((u, idx) => {
                        const currentStatus = (u.status ?? (u.active ? 'active' : 'inactive'))
                        const actionLabel = currentStatus === 'active' ? 'Inhabilitar' : 'Verificar'
                        const isDeletable = String(currentStatus).toLowerCase() === 'inactive'
                        return (
                          <tr key={u.id ?? idx}>
                            <td className="mono">{(page - 1) * pageSize + idx + 1}</td>
                            <td>{u.username ?? '-'}</td>
                            <td>{u.phone ?? u.celular ?? '-'}</td>
                            <td>{u.role ?? '-'}</td>
                            <td className="mono">
                              {typeof u.balance === 'number'
                                ? u.balance.toFixed(2)
                                : (u.balance ?? '-')}
                            </td>
                            <td className="mono">{u.salesCount ?? 0}</td>
                            <td>{statusBadge(currentStatus)}</td>
                            <td>
                              <div className="actions">
                                <button
                                  title={actionLabel}
                                  onClick={() => requestConfirmAction(
                                    u.id,
                                    u.username ?? u.phone ?? String(u.id),
                                    currentStatus
                                  )}
                                  aria-label={`${actionLabel} usuario ${u.id}`}
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
                                  title="Descuento"
                                  onClick={() => requestConfirmAction(
                                    u.id,
                                    u.username ?? u.phone ?? String(u.id),
                                    currentStatus,
                                    'discount'
                                  )}
                                  aria-label={`Aplicar descuento ${u.id}`}
                                >
                                  <FaTag />
                                </button>

                                <button
                                  title="Incentivo"
                                  onClick={() => requestConfirmAction(
                                    u.id,
                                    u.username ?? u.phone ?? String(u.id),
                                    currentStatus,
                                    'incentive'
                                  )}
                                  aria-label={`Incentivo ${u.id}`}
                                >
                                  <FaGift />
                                </button>

                                <button
                                  title="Referidos"
                                  onClick={() => requestConfirmAction(
                                    u.id,
                                    u.username ?? u.phone ?? String(u.id),
                                    currentStatus,
                                    'referrals'
                                  )}
                                  aria-label={`Referidos ${u.id}`}
                                >
                                  <FaUserFriends />
                                </button>

                                {/* Delete button: enabled only when status === 'inactive' */}
                                <button
                                  title={isDeletable ? 'Eliminar' : 'No disponible (usuario activo)'}
                                  onClick={() => { if (isDeletable) requestConfirmAction(u.id, u.username ?? u.phone ?? String(u.id), currentStatus, 'delete') }}
                                  className={isDeletable ? 'danger' : 'danger disabled'}
                                  aria-label={`Eliminar ${u.id}`}
                                  disabled={!isDeletable}
                                >
                                  <FaTrash />
                                </button>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                      {filtered.length === 0 && (
                        <tr>
                          <td colSpan="8" className="empty">No se encontraron usuarios</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="pager-container">
                  <div className="pager-info">
                    Página {page} de {totalPages} • Mostrando {filtered.length} registros (de {totalElements} totales)
                  </div>
                  <div className="pager-controls" role="navigation" aria-label="Paginación">
                    <button onClick={goPrev} disabled={page === 1}>Anterior</button>
                    <span className="pager-page"> {page} / {totalPages} </span>
                    <button onClick={goNext} disabled={page === totalPages}>Siguiente</button>
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
        onSuccess={() => { closePasswordModal(); fetchUsers(page); }}
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
        thead th:nth-child(2), tbody td:nth-child(2) { width: 20%; }
        thead th:nth-child(3), tbody td:nth-child(3) { width: 14%; }
        thead th:nth-child(4), tbody td:nth-child(4) { width: 12%; }
        thead th:nth-child(5), tbody td:nth-child(5) { width: 12%; }

        thead th:nth-child(6), tbody td:nth-child(6) { width: 6%; }
        thead th:nth-child(7), tbody td:nth-child(7) { width: 10%; }

        thead th:nth-child(8), tbody td:nth-child(8) {
          width: 24%;
          max-width: 360px;
          vertical-align: top;
          padding-right: 8px;
          overflow: hidden;
        }

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

        /* Disabled variant for delete button */
        .actions button.danger.disabled {
          background: linear-gradient(90deg, rgba(239,68,68,0.18), rgba(249,115,22,0.12));
          color: rgba(255,255,255,0.6);
          cursor: not-allowed;
          transform: none;
          opacity: 0.6;
        }

        .verify-btn { background: linear-gradient(90deg,#06b6d4,#10b981); color:#07101a; }
        .disable-btn { background: linear-gradient(90deg,#f97316,#ef4444); color:#fff; }

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
          thead th:nth-child(8), tbody td:nth-child(8) { max-width: 300px; width: 26%; }
          thead th:nth-child(6), tbody td:nth-child(6) { width: 8%; }
        }
      `}</style>
    </>
  )
}