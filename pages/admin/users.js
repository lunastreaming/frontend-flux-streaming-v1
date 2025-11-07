// pages/admin/users.js
import { useEffect, useMemo, useState } from 'react'
import Head from 'next/head'
import AdminNavBar from '../../components/AdminNavBar'
import ConfirmModal from '../../components/ConfirmModal'
import { useAuth } from '../../context/AuthProvider'
import {
  FaSearch, FaSyncAlt, FaCheck, FaKey, FaTag, FaGift, FaUserFriends, FaTrash
} from 'react-icons/fa'

export default function AdminUsersPage() {
  const { ensureValidAccess } = useAuth()
  const API_BASE = process.env.NEXT_PUBLIC_API_URL || ''
  const USERS_ENDPOINT = `${API_BASE}/api/users/sellers`

  const [users, setUsers] = useState([])
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

  useEffect(() => { fetchUsers() }, [])

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

  const fetchUsers = async () => {
    setLoading(true)
    setError(null)
    try {
      const token = await getAuthToken()
      const headers = { 'Content-Type': 'application/json' }
      if (token) headers['Authorization'] = `Bearer ${token}`

      const res = await fetch(USERS_ENDPOINT, {
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
      setUsers(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('Error fetching users:', err)
      setError('No se pudo cargar la lista de usuarios')
      setUsers([])
    } finally {
      setLoading(false)
    }
  }

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

    try { console.debug('callEndpoint', { url, method: opts.method || 'GET', hasToken: Boolean(token) }) } catch (_) {}
    const res = await fetch(url, opts)
    const text = await res.text().catch(() => null)
    try { console.debug('callEndpoint response', { url, status: res.status, bodyPreview: text ? (text.length > 200 ? text.slice(0, 200) + '...' : text) : null }) } catch (_) {}
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

  const requestConfirmAction = (userId, username, currentStatus, actionOverride = null) => {
    const action = actionOverride || (currentStatus === 'active' ? 'disable' : 'verify')
    const message = action === 'verify'
      ? `Vas a activar al usuario ${username}. ¿Deseas continuar?`
      : action === 'disable'
        ? `Vas a inhabilitar al usuario ${username}. ¿Deseas continuar?`
        : `Confirmar acción ${action} para usuario ${username}.`
    setConfirmData({ open: true, userId, username, action, message, loading: false })
  }

  const handleConfirm = async () => {
    const { userId, username, action } = confirmData
    if (!userId || !action) {
      setConfirmData({ open: false, userId: null, username: null, action: null, message: '', loading: false })
      return
    }
    setConfirmData(prev => ({ ...prev, loading: true }))
    setLoading(true)
    try {
      if (action === 'verify') {
        const url = `http://localhost:8080/api/users/${encodeURIComponent(userId)}/status?status=active`
        await callEndpoint(url, { method: 'PATCH' }, true)
        await fetchUsers()
        alert(`Usuario ${username} activado correctamente`)
      } else if (action === 'disable') {
        const url = `http://localhost:8080/api/users/${encodeURIComponent(userId)}/status?status=inactive`
        await callEndpoint(url, { method: 'PATCH' }, true)
        await fetchUsers()
        alert(`Usuario ${username} inhabilitado correctamente`)
      } else {
        const url = `${API_BASE}/api/admin/users/${action}/${encodeURIComponent(userId)}`
        await callEndpoint(url, { method: 'POST', body: JSON.stringify({}) }, true)
        await fetchUsers()
        alert(`Acción ${action} ejecutada correctamente para ${username}`)
      }
      setConfirmData({ open: false, userId: null, username: null, action: null, message: '', loading: false })
    } catch (err) {
      console.error(`handleConfirm error for ${action} ${userId}:`, err)
      alert(err.message || 'Ocurrió un error en la acción')
      setConfirmData(prev => ({ ...prev, loading: false }))
    } finally {
      setLoading(false)
    }
  }

  const handleCancelConfirm = () => {
    setConfirmData({ open: false, userId: null, username: null, action: null, message: '', loading: false })
  }

  return (
    <>
      <Head><title>Usuarios | Admin</title></Head>

      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 text-white">
        <AdminNavBar />

        <main className="max-w-7xl mx-auto px-6 py-8">
          <header className="mb-6 flex items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold">Usuarios</h1>
              <p className="text-sm text-gray-400">Lista de vendedores y acciones administrativas</p>
            </div>
            <div className="header-actions">
              <button className="btn-refresh" onClick={fetchUsers} aria-label="Refrescar">
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
                onChange={(e) => { setQuery(e.target.value); setPage(1) }}
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
                      {pageItems.map((u, idx) => {
                        const currentStatus = (u.status ?? (u.active ? 'active' : 'inactive'))
                        const actionLabel = currentStatus === 'active' ? 'Inhabilitar' : 'Verificar'
                        return (
                          <tr key={u.id ?? idx}>
                            <td className="mono">{startIndex + idx + 1}</td>
                            <td>{u.username ?? '-'}</td>
                            <td>{u.phone ?? u.celular ?? '-'}</td>
                            <td>{u.role ?? '-'}</td>
                            <td className="mono">{typeof u.balance === 'number' ? u.balance.toFixed(2) : (u.balance ?? '-')}</td>
                            <td className="mono">{u.salesCount ?? 0}</td>
                            <td>{statusBadge(currentStatus)}</td>
                            <td>
                              <div className="actions">
                                <button
                                  title={actionLabel}
                                  onClick={() => requestConfirmAction(u.id, u.username ?? u.phone ?? String(u.id), currentStatus)}
                                  aria-label={`${actionLabel} usuario ${u.id}`}
                                  className={currentStatus === 'active' ? 'disable-btn' : 'verify-btn'}
                                >
                                  <FaCheck />
                                </button>

                                <button title="Password" onClick={() => requestConfirmAction(u.id, u.username ?? u.phone ?? String(u.id), currentStatus, 'password')} aria-label={`Reset password ${u.id}`}>
                                  <FaKey />
                                </button>

                                <button title="Descuento" onClick={() => requestConfirmAction(u.id, u.username ?? u.phone ?? String(u.id), currentStatus, 'discount')} aria-label={`Aplicar descuento ${u.id}`}>
                                  <FaTag />
                                </button>

                                <button title="Incentivo" onClick={() => requestConfirmAction(u.id, u.username ?? u.phone ?? String(u.id), currentStatus, 'incentive')} aria-label={`Incentivo ${u.id}`}>
                                  <FaGift />
                                </button>

                                <button title="Referidos" onClick={() => requestConfirmAction(u.id, u.username ?? u.phone ?? String(u.id), currentStatus, 'referrals')} aria-label={`Referidos ${u.id}`}>
                                  <FaUserFriends />
                                </button>

                                <button title="Eliminar" onClick={() => requestConfirmAction(u.id, u.username ?? u.phone ?? String(u.id), currentStatus, 'delete')} className="danger" aria-label={`Eliminar ${u.id}`}>
                                  <FaTrash />
                                </button>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                      {pageItems.length === 0 && (
                        <tr><td colSpan="8" className="empty">No se encontraron usuarios</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="pager-container">
                  <div className="pager-info">Mostrando {Math.min(filtered.length, page * pageSize)} de {filtered.length} usuarios</div>
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
        title={confirmData.action === 'verify' ? 'Confirmar activación' : (confirmData.action === 'disable' ? 'Confirmar inhabilitación' : 'Confirmar acción')}
        message={confirmData.message}
        confirmText={confirmData.action === 'verify' ? 'Activar' : (confirmData.action === 'disable' ? 'Inhabilitar' : 'Confirmar')}
        cancelText="Cancelar"
        onConfirm={handleConfirm}
        onCancel={handleCancelConfirm}
        loading={confirmData.loading}
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

        /* Reduced width for "Nº Ventas" (col 6) and increased width for "Acciones" (col 8) */
        thead th:nth-child(6), tbody td:nth-child(6) { width: 6%; }   /* Nº Ventas reducido */
        thead th:nth-child(7), tbody td:nth-child(7) { width: 10%; }

        thead th:nth-child(8), tbody td:nth-child(8) {
          width: 24%;              /* aumentado para acciones */
          max-width: 360px;       /* mayor max para más espacio a botones */
          vertical-align: top;
          padding-right: 8px;
          overflow: hidden;
        }

        .mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, "Roboto Mono", monospace; }

        /* Keep buttons in a single row; allow horizontal scroll inside the cell if needed */
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
          thead th:nth-child(6), tbody td:nth-child(6) { width: 8%; } /* small adjustment on small screens */
        }
      `}</style>
    </>
  )
}