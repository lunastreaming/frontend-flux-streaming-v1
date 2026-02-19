import { useEffect, useMemo, useState } from 'react'
import Head from 'next/head'
import AdminNavBar from '../../components/AdminNavBar'
import ConfirmModal from '../../components/ConfirmModal'
import AdminPasswordModal from '../../components/AdminPasswordModal'
import AdminPhoneModal from '../../components/AdminPhoneModal'
import { useAuth } from '../../context/AuthProvider'
import {
  FaSearch, FaSyncAlt, FaCheck, FaKey, FaTag, FaGift, FaUserFriends, FaTrash, FaPen, FaWhatsapp, FaWallet
} from 'react-icons/fa'

export default function AdminUsersPage() {
  const { ensureValidAccess } = useAuth()

  const rawApiBase = process.env.NEXT_PUBLIC_API_URL || ''
  const API_BASE = rawApiBase.replace(/\/+$/, '')
  const USERS_ENDPOINT = `${API_BASE}/api/users/sellers`

  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const pageSize = 30
  const [totalPages, setTotalPages] = useState(1)
  const [totalElements, setTotalElements] = useState(0)

  const [depositModal, setDepositModal] = useState({ open: false, userId: null, username: null, amount: '' });

  const [phoneModal, setPhoneModal] = useState({ open: false, userId: null, username: null, currentPhone: '' })
  const [confirmData, setConfirmData] = useState({ open: false, userId: null, username: null, action: null, message: '', loading: false })
  const [pwdModal, setPwdModal] = useState({ open: false, userId: null, username: null })

  const roleLabels = {
    'seller': 'Vendedor',
    'admin': 'Administrador',
    'client': 'Cliente'
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchUsers(1)
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

  // 2. Modifica handleConfirm para incluir la lógica de 'deposit'
  const handleConfirm2 = async () => {
    const { userId, action } = confirmData;
    if (!userId || !action) return;

    setConfirmData(prev => ({ ...prev, loading: true }));
    try {
      let url = '', method = 'POST', body = undefined;

      if (action === 'deposit') {
        // Usamos el endpoint administrativo definido
        url = `${API_BASE}/api/admin/users/admin/deposit-to-user`;
        method = 'POST';
        body = JSON.stringify({
          userId: userId,
          amount: parseFloat(depositModal.amount)
        });
      }
      // ... resto de tus condiciones (verify, disable, delete)
      else if (action === 'verify') {
        url = `${API_BASE}/api/users/${encodeURIComponent(userId)}/status?status=active`;
        method = 'PATCH';
      }
      // ...

      await callEndpoint(url, {
        method,
        body: body || (method === 'POST' ? JSON.stringify({}) : undefined)
      });

      await fetchUsers(page);
      setConfirmData({ open: false, userId: null, username: null, action: null, message: '', loading: false });
      setDepositModal({ open: false, userId: null, username: null, amount: '' }); // Limpiar modal de monto
    } catch (err) {
      setError(err.message || 'Error en la acción');
      setConfirmData(prev => ({ ...prev, loading: false }));
    }
  };

  const fetchUsers = async (uiPage = 1) => {
    setLoading(true)
    setError(null)
    try {
      const token = await getAuthToken()
      const headers = { 'Content-Type': 'application/json' }
      if (token) headers['Authorization'] = `Bearer ${token}`

      const zeroPage = Math.max(0, (uiPage ?? 1) - 1)
      let url = `${USERS_ENDPOINT}?page=${zeroPage}&size=${pageSize}`
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

      setUsers(content)
      setTotalElements(Number(payload?.totalElements ?? content.length))
      setTotalPages(Number(payload?.totalPages ?? 1))
      setPage(uiPage)
    } catch (err) {
      setError('No se pudo cargar la lista de usuarios')
      setUsers([])
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

  const requestConfirmAction = (userId, username, currentStatus, actionOverride = null) => {
    const action = actionOverride || (currentStatus === 'active' ? 'disable' : 'verify')
    if (action === 'password') { setPwdModal({ open: true, userId, username }); return }
    let message = `Confirmar acción ${action} para usuario ${username}.`
    if (action === 'verify') message = `Vas a activar al usuario ${username}. ¿Deseas continuar?`
    if (action === 'disable') message = `Vas a inhabilitar al usuario ${username}. ¿Deseas continuar?`
    if (action === 'delete') message = `¿Seguro que quieres eliminar al usuario ${username}? Esta acción es irreversible.`
    setConfirmData({ open: true, userId, username, action, message, loading: false })
  }

  const handleConfirm = async () => {
    const { userId, action, username } = confirmData;
    if (!userId || !action) return;

    setConfirmData(prev => ({ ...prev, loading: true }));

    try {
      let url = '';
      let method = 'POST'; // Por defecto para la mayoría de acciones personalizadas
      let body = undefined;

      // --- Lógica Nueva: Depósito Administrativo ---
      if (action === 'deposit') {
        url = `${API_BASE}/api/admin/users/admin/deposit-to-user`;
        method = 'POST';
        body = JSON.stringify({
          userId: userId,
          amount: parseFloat(depositModal.amount)
        });
      }
      // --- Lógica Existente: Cambios de Estado ---
      else if (action === 'verify') {
        url = `${API_BASE}/api/users/${encodeURIComponent(userId)}/status?status=active`;
        method = 'PATCH';
      }
      else if (action === 'disable') {
        url = `${API_BASE}/api/users/${encodeURIComponent(userId)}/status?status=inactive`;
        method = 'PATCH';
      }
      // --- Lógica Existente: Eliminación ---
      else if (action === 'delete') {
        url = `${API_BASE}/api/users/delete/${encodeURIComponent(userId)}`;
        method = 'DELETE';
      }
      // --- Otros (discount, incentive, referrals) ---
      else {
        url = `${API_BASE}/api/admin/users/${action}/${encodeURIComponent(userId)}`;
      }

      // Ejecución de la petición usando tu función auxiliar callEndpoint
      await callEndpoint(url, {
        method,
        body: body || (method === 'POST' ? JSON.stringify({}) : undefined)
      });

      // Refrescar la tabla en la página actual
      await fetchUsers(page);

      // Limpiar estados y cerrar modales
      setConfirmData({ open: false, userId: null, username: null, action: null, message: '', loading: false });

      // Si fue un depósito, reseteamos el modal de monto
      if (action === 'deposit') {
        setDepositModal({ open: false, userId: null, username: null, amount: '' });
      }

    } catch (err) {
      // Manejo de errores basado en tu implementación actual
      setError(err.message || 'Error en la acción');
      setConfirmData(prev => ({ ...prev, loading: false }));
    }
  };

  const requestDeposit = (userId, username) => {
    setDepositModal({ open: true, userId, username, amount: '' });
  };

  const proceedToConfirmDeposit = () => {
    if (!depositModal.amount || parseFloat(depositModal.amount) <= 0) {
      alert("Por favor ingrese un monto válido");
      return;
    }

    // Cerramos el modal de monto y abrimos el ConfirmModal existente
    setConfirmData({
      open: true,
      userId: depositModal.userId,
      username: depositModal.username,
      action: 'deposit',
      message: `¿Estás seguro de transferir $. ${depositModal.amount} al usuario ${depositModal.username}? Este saldo se creará administrativamente.`,
      loading: false
    });
    setDepositModal(prev => ({ ...prev, open: false }));
  };

  const goPrev = () => { if (page > 1) fetchUsers(page - 1) }
  const goNext = () => { if (page < totalPages) fetchUsers(page + 1) }

  return (
    <>
      <Head><title>Usuarios | Admin</title></Head>
      <div className="admin-container">
        <AdminNavBar />
        <main className="admin-content">
          <header className="content-header">
            <div>
              <h1 className="title">Usuarios</h1>
              <p className="subtitle">Administración de Sellers y Clientes</p>
            </div>
            <button className="btn-refresh" onClick={() => fetchUsers(page)}>
              <FaSyncAlt className={loading ? 'animate-spin' : ''} />
            </button>
          </header>

          <section className="controls-row">
            <div className="search-container">
              <div className="search-box">
                <FaSearch className="icon" />
                <input
                  placeholder="Buscar username o celular..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
            </div>

            <div className="modern-pager">
              <div className="pager-info">
                <span className="total-badge">{totalElements}</span> <span className="label">registros</span>
              </div>
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
                    <th>No.</th><th>Username</th><th>Celular</th><th>Rol</th><th>Balance</th><th>Ventas</th><th>Estado</th><th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u, idx) => {
                    const currentStatus = (u.status ?? (u.active ? 'active' : 'inactive'))
                    const isDeletable = String(currentStatus).toLowerCase() === 'inactive'
                    return (
                      <tr key={u.id}>
                        <td className="mono">{(page - 1) * pageSize + idx + 1}</td>
                        <td className="bold">{u.username || '-'}</td>
                        <td>
                          <div className="phone-cell">
                            {u.phone ? (
                              <>
                                <a
                                  href={`https://wa.me/${u.phone.replace(/\D/g, '')}?text=${encodeURIComponent(
                                    `Hola ${u.username || ''}\n` +
                                    `Se ha registrado en Flux Streaming,\n` +
                                    `¿Desea afiliarse?\n` +
                                    `por el módico pago de S/.25.00 o $8.00\n\n` +
                                    `Medios de pago\n\n` +
                                    `JOSUE R. SOMOCURCIO\n` +
                                    `-YAPE o PLIN : 935 769 255\n` +
                                    `-BINANCE : 1025532462\n` +
                                    `-PAYPAL: randu.sq@gmail.com\n\n` +
                                    `ENVIAR CAPTURA PARA LA ACTIVACIÒN`
                                  )}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="whatsapp-btn-link"
                                  title="Enviar mensaje de bienvenida"
                                >
                                  <FaWhatsapp size={20} />
                                </a>
                                <span className="phone-number">{u.phone}</span>
                              </>
                            ) : (
                              '-'
                            )}
                            <button
                              onClick={() => setPhoneModal({ open: true, userId: u.id, username: u.username, currentPhone: u.phone })}
                              className="edit-phone"
                            >
                              <FaPen size={11} />
                            </button>
                          </div>
                        </td>
                        <td>
                          <span className="role-tag">
                            {roleLabels[u.role?.toLowerCase()] || u.role}
                          </span>
                        </td>
                        <td className="mono highlight">{u.balance?.toFixed(2) || '0.00'}</td>
                        <td className="mono">{u.salesCount || 0}</td>
                        <td><span className={`status ${currentStatus}`}>{currentStatus === 'active' ? 'Activo' : 'Inactivo'}</span></td>
                        <td>
                          <div className="actions">
                            <button onClick={() => requestConfirmAction(u.id, u.username, currentStatus)} className={currentStatus === 'active' ? 'btn-disable' : 'btn-verify'}><FaCheck /></button>
                            <button onClick={() => setPwdModal({ open: true, userId: u.id, username: u.username })}><FaKey /></button>
                            <button onClick={() => requestConfirmAction(u.id, u.username, currentStatus, 'discount')}><FaTag /></button>
                            <button onClick={() => requestConfirmAction(u.id, u.username, currentStatus, 'incentive')}><FaGift /></button>
                            <button onClick={() => requestConfirmAction(u.id, u.username, currentStatus, 'referrals')}><FaUserFriends /></button>
                            <button
                              onClick={() => requestDeposit(u.id, u.username)}
                              title="Transferencia Administrativa"
                              style={{ color: '#22d3ee' }}
                            >
                              <FaWallet />
                            </button>
                            <button onClick={() => isDeletable && requestConfirmAction(u.id, u.username, currentStatus, 'delete')} className={isDeletable ? 'btn-danger' : 'btn-danger disabled'} disabled={!isDeletable}><FaTrash /></button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              {users.length === 0 && !loading && <div className="empty-text">No se encontraron resultados.</div>}
            </div>
            {loading && <div className="loading-overlay">Cargando datos...</div>}
          </section>
        </main>
      </div>

      {depositModal.open && (
        <div className="modal-overlay-transfer">
          <div className="modal-content-transfer">
            <h3 className="modal-title-transfer">Transferir Saldo</h3>
            <p>Usuario: <strong>{depositModal.username}</strong></p>

            <div className="input-group-transfer">
              <label>Monto a depositar (USD):</label>
              <input
                type="number"
                value={depositModal.amount}
                onChange={(e) => setDepositModal({ ...depositModal, amount: e.target.value })}
                placeholder="0.00"
                autoFocus
              />
            </div>

            <div className="modal-actions-transfer">
              <button className="btn-cancel-modal" onClick={() => setDepositModal({ open: false })}>
                Cancelar
              </button>
              <button className="btn-confirm-modal" onClick={proceedToConfirmDeposit}>
                Siguiente
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .admin-container { min-height: 100vh; font-family: 'Inter', sans-serif; color: #fff; }
        .admin-content { max-width: 100%; padding: 2rem; }
        .content-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; }
        .title { font-size: 1.875rem; font-weight: 700; margin: 0; }
        .subtitle { color: #9aa0a6; font-size: 0.875rem; margin: 0.25rem 0 0; }

        .controls-row {
    display: flex;
    flex-direction: column; 
    gap: 1rem;
    margin-bottom: 1.5rem;
    background: rgba(255, 255, 255, 0.02);
    padding: 1rem;
    border-radius: 0.75rem;
    border: 1px solid rgba(255, 255, 255, 0.05);
  }

  .search-container {
    width: 100%;
  }
        .search-box {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    background: rgba(0, 0, 0, 0.2);
    padding: 0.75rem 1rem;
    border-radius: 0.625rem;
    border: 1px solid rgba(255, 255, 255, 0.1);
  }

  /* Agrega esto al final de tu bloque de estilos existente */
.modal-overlay-transfer { 
  position: fixed; inset: 0; background: rgba(0,0,0,0.85); 
  display: flex; align-items: center; justify-content: center; z-index: 2000; 
}
.modal-content-transfer { 
  background: #1a1d21; padding: 2rem; border-radius: 1rem; 
  border: 1px solid #333; width: 90%; max-width: 400px; 
}
.modal-title-transfer { margin-top: 0; color: #22d3ee; font-size: 1.5rem; }
.input-group-transfer { margin: 1.5rem 0; }
.input-group-transfer label { display: block; margin-bottom: 0.5rem; font-size: 0.9rem; color: #9aa0a6; }
.input-group-transfer input { 
  width: 100%; padding: 0.75rem; background: #000; border: 1px solid #444; 
  color: #fff; border-radius: 0.5rem; font-size: 1.25rem; outline: none;
}
.input-group-transfer input:focus { border-color: #22d3ee; }
.modal-actions-transfer { display: flex; gap: 1rem; justify-content: flex-end; margin-top: 1rem; }
.btn-confirm-modal { 
  background: #06b6d4; border: none; color: #fff; padding: 0.6rem 1.5rem; 
  border-radius: 0.5rem; cursor: pointer; font-weight: 700; 
}

  .search-box input {
    background: transparent;
    border: none;
    outline: none;
    color: #fff;
    width: 100%;
    font-size: 16px; /* Evita que iOS haga zoom automático al enfocar */
  }
        .search-box .icon { color: #555; }

        .modern-pager {
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    width: 100%;
    gap: 0.5rem;
  }

  @media (min-width: 768px) {
    .controls-row {
      flex-direction: row; /* Vuelve a ser una fila en PC */
      justify-content: space-between;
    }
    .search-container {
      max-width: 400px;
    }
    .modern-pager {
      width: auto;
      justify-content: flex-end;
    }
  }
        .pager-info { font-size: 0.85rem; color: #9aa0a6; }
        .total-badge { background: #06b6d4; color: #fff; padding: 2px 8px; border-radius: 6px; font-weight: 700; }
        .pager-actions {
    display: flex;
    align-items: center;
    background: rgba(255, 255, 255, 0.03);
    padding: 0.25rem;
    border-radius: 0.625rem;
    border: 1px solid rgba(255, 255, 255, 0.1);
  } 
        .pager-btn {
    background: transparent;
    border: none;
    color: #fff;
    padding: 0.5rem 0.75rem;
    cursor: pointer;
    font-size: 0.75rem;
    white-space: nowrap;
  }
        .pager-btn:hover:not(:disabled) { background: rgba(255,255,255,0.1); }
        .pager-btn:disabled { opacity: 0.2; cursor: not-allowed; }
        .page-indicator { padding: 0 1rem; font-weight: 700; border-left: 1px solid #333; border-right: 1px solid #333; font-size: 0.9rem; }

        .table-container { width: 100%; position: relative; }
        .table-wrapper {
    width: 100%;
    overflow-x: auto; /* Permite scroll lateral en la tabla */
    -webkit-overflow-scrolling: touch;
  }
        .users-table { width: 100%; border-collapse: collapse; text-align: left; }
        th { padding: 1rem; background: rgba(255,255,255,0.03); color: #9aa0a6; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; }
        td { padding: 1rem; border-bottom: 1px solid rgba(255,255,255,0.03); font-size: 0.9rem; }
        
        .mono { font-family: ui-monospace, monospace; }
        .highlight { color: #22d3ee; }
        .phone-cell { 
  display: flex; 
  align-items: center; 
  gap: 0.5rem; 
}
        .edit-phone { background: none; border: none; color: #06b6d4; cursor: pointer; padding: 0.25rem; }
        
        .actions { display: flex; gap: 0.5rem; justify-content: center; align-items: center;}

        th:last-child, 
  td:last-child {
    text-align: center;
  }

/* 1. Busca la línea 108 y reemplaza el bloque .bold por este: */
.bold {
  font-weight: 600; 
  white-space: nowrap; /* Esto garantiza que el nombre siempre esté en una sola línea */
  /* Hemos eliminado max-width, overflow y text-overflow */
}


.whatsapp-link {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #25d366;
  text-decoration: none;
  font-family: ui-monospace, monospace;
  transition: opacity 0.2s;
}

.whatsapp-btn-link {
  color: #25d366;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.2s ease, opacity 0.2s;
  padding: 2px;
}

.whatsapp-btn-link:hover {
  transform: scale(1.2); /* Aumenta ligeramente al pasar el mouse */
  opacity: 0.9;
}

.whatsapp-link:hover {
  opacity: 0.8;
  text-decoration: underline;
}

.phone-number {
  font-family: ui-monospace, monospace;
  color: #fff;
}

.whatsapp-icon {
  font-size: 1.1rem;
}

/* Ajuste fino para el paginador en móviles muy pequeños */
@media (max-width: 480px) {
  .pager-info {
    display: none; /* Oculta el texto "registros" para ganar espacio */
  }
  .page-indicator {
    padding: 0 0.5rem;
    font-size: 0.8rem;
  }
  .pager-btn {
    padding: 0.5rem 0.5rem;
  }
}

        .actions button { width: 2.125rem; height: 2.125rem; display: flex; align-items: center; justify-content: center; border-radius: 0.5rem; border: none; background: rgba(255,255,255,0.05); color: #fff; cursor: pointer; transition: 0.2s; }
        .actions button:hover:not(:disabled) { background: rgba(255,255,255,0.1); transform: translateY(-1px); }
        
        .btn-verify { background: #10b981 !important; color: #000 !important; }
        .btn-disable { background: #f59e0b !important; color: #000 !important; }
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
        
      `}</style>



      <ConfirmModal {...confirmData} onConfirm={handleConfirm} onCancel={() => setConfirmData({ ...confirmData, open: false })} />
      <AdminPasswordModal {...pwdModal} onClose={() => setPwdModal({ open: false })} />
      <AdminPhoneModal {...phoneModal} onClose={() => setPhoneModal({ open: false })} onSuccess={() => { setPhoneModal({ open: false }); fetchUsers(page); }} />


    </>
  )
}