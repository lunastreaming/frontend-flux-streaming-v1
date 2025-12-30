// pages/admin/wallet-supplier.js
import { useEffect, useState } from 'react'
import Head from 'next/head'
import AdminNavBar from '../../components/AdminNavBar'
import ConfirmModal from '../../components/ConfirmModal'
import TransferToUserModal from '../../components/TransferToUserModal'
import { useAuth } from '../../context/AuthProvider'
import { FaCheckCircle, FaTimesCircle, FaSpinner, FaExchangeAlt } from 'react-icons/fa'

export default function WalletSupplierPending() {
  const { ensureValidAccess, logout } = useAuth()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState({})
  const [error, setError] = useState(null)

  const BASE = process.env.NEXT_PUBLIC_API_URL || ''

  const [confirmData, setConfirmData] = useState({
    open: false,
    id: null,
    action: null, // approve | reject
    message: ''
  })

  // Flags y estados obtenidos de /api/users/me
  const [canTransfer, setCanTransfer] = useState(false)
  const [userBalance, setUserBalance] = useState(null)

  // Estado para el TransferToUserModal
  const [showTransferModal, setShowTransferModal] = useState(false)
  const [selectedItem, setSelectedItem] = useState(null)

  useEffect(() => {
    fetchPending()
    fetchMe()
  }, [])

  const getAuthToken = async () => {
    try {
      const t = typeof ensureValidAccess === 'function' ? await ensureValidAccess() : null
      if (t) return t
    } catch (_) {}
    if (typeof window !== 'undefined') return localStorage.getItem('accessToken')
    return null
  }

  const fetchMe = async () => {
    try {
      const token = await getAuthToken()
      const headers = { 'Content-Type': 'application/json' }
      if (token) headers['Authorization'] = `Bearer ${token}`

      const res = await fetch(`${BASE}/api/users/me`, {
        method: 'GET',
        headers,
        credentials: token ? 'omit' : 'include'
      })
      if (!res.ok) throw new Error(`Error ${res.status}`)
      const data = await res.json()
      setCanTransfer(Boolean(data?.canTransfer))
      setUserBalance(data?.balance ?? null)
      console.log('Balance en padre después de fetchMe:', data?.balance)
    } catch (err) {
      console.error('Error fetching /me:', err)
      setCanTransfer(false)
      setUserBalance(null)
    }
  }

  const fetchPending = async () => {
    setLoading(true)
    setError(null)
    try {
      const token = await getAuthToken()
      const headers = { 'Content-Type': 'application/json' }
      if (token) headers['Authorization'] = `Bearer ${token}`

      const res = await fetch(`${BASE}/api/wallet/admin/pending-provider`, {
        method: 'GET',
        headers,
        credentials: token ? 'omit' : 'include'
      })

      if (res.status === 401) {
        try { logout() } catch (_) {}
        throw new Error('No autorizado')
      }

      if (!res.ok) {
        const txt = await res.text().catch(() => null)
        throw new Error(txt || `Error ${res.status}`)
      }

      const data = await res.json()
      setItems(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('Error fetching pending wallet approvals:', err)
      setError('No se pudieron cargar las solicitudes pendientes')
      setItems([])
    } finally {
      setLoading(false)
    }
  }

  const performAction = async (id, action) => {
    setActionLoading(prev => ({ ...prev, [id]: true }))
    setError(null)
    try {
      const token = await getAuthToken()
      const headers = { 'Content-Type': 'application/json' }
      if (token) headers['Authorization'] = `Bearer ${token}`

      const url =
        action === 'approve'
          ? `${BASE}/api/wallet/admin/approve/${id}`
          : `${BASE}/api/wallet/admin/reject/${id}`

      const res = await fetch(url, {
        method: 'POST',
        headers,
        credentials: token ? 'omit' : 'include',
        body: JSON.stringify({})
      })

      if (res.status === 401) {
        try { logout() } catch (_) {}
        throw new Error('No autorizado')
      }

      if (!res.ok) {
        const txt = await res.text().catch(() => null)
        throw new Error(txt || `Error ${res.status}`)
      }

      setItems(prev => prev.filter(i => i.id !== id))
    } catch (err) {
      console.error(`Error ${action} wallet request ${id}:`, err)
      const label = action === 'approve' ? 'aprobar' : 'rechazar'
      setError(`No se pudo ${label} la solicitud`)
    } finally {
      setActionLoading(prev => ({ ...prev, [id]: false }))
    }
  }

  // Confirm para aprobar/rechazar
  const requestActionWithConfirm = (id, action, userName, displayAmount) => {
    const actionText = action === 'approve' ? 'aprobar' : 'rechazar'
    const message = `¿Seguro que quieres ${actionText} la solicitud de ${userName ?? 'este proveedor'} por ${displayAmount}?`
    setConfirmData({ open: true, id, action, message })
  }

  const handleConfirm = async () => {
    const { id, action } = confirmData
    setConfirmData(prev => ({ ...prev, open: false }))
    if (!id || !action) return
    await performAction(id, action)
  }

  const handleCancelConfirm = () => {
    setConfirmData({ open: false, id: null, action: null, message: '' })
  }

  // Helpers de monto
  const parseToNumber = (v) => {
    if (v === null || v === undefined) return null
    if (typeof v === 'number') return v
    if (typeof v === 'string') {
      const trimmed = v.trim()
      if (trimmed === '') return null
      const n = parseFloat(trimmed.replace(',', '.'))
      return Number.isNaN(n) ? null : n
    }
    return null
  }

  const formatItemAmount = (item) => {
    const currency = item.currency || 'PEN'
    const isWithdrawal = item.type && item.type.toLowerCase() === 'withdrawal'
    const raw = isWithdrawal
      ? (item.realAmount !== undefined && item.realAmount !== null ? item.realAmount : item.amount)
      : item.amount

    const num = parseToNumber(raw)
    const display = num == null ? '0.00' : num.toFixed(2)
    return `${currency} ${display}`
  }

  const translateType = (type) => {
    if (!type || typeof type !== 'string') return ''
    const t = type.toLowerCase()
    switch (t) {
      case 'recharge': return 'Recarga'
      case 'withdrawal': return 'Retiro'
      case 'adjustment': return 'Ajuste'
      case 'publish': return 'Publicación'
      case 'purchase': return 'Compra'
      case 'sale': return 'Venta'
      default: return type.charAt(0).toUpperCase() + type.slice(1)
    }
  }

  // Opción 2: enviar el saldo como parte del selectedItem
  const openTransferModal = (item) => {
    if (!canTransfer) {
      alert('No tienes permisos para transferir.')
      return
    }
    if (userBalance == null) {
      console.warn('Intento de abrir modal sin balance cargado')
      alert('Tu saldo aún no está cargado. Intenta nuevamente en unos segundos.')
      return
    }
    // Inyectamos el saldo dentro del item seleccionado
    setSelectedItem({ ...item, currentBalance: userBalance })
    console.log('Abrir modal con balance (padre):', userBalance)
    setShowTransferModal(true)
  }

  return (
    <>
      <Head>
        <title>Recargas Pendientes Proveedores | Admin</title>
      </Head>

      <div className="min-h-screen text-white font-inter">
        <AdminNavBar />

        <main className="max-w-6xl mx-auto px-6 py-10">
          <header className="mb-6 flex items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold">Recargas pendientes (Proveedores)</h1>
              <p className="text-sm text-gray-400">Aprobar, rechazar o transferir solicitudes recibidas</p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={fetchPending}
                className="refresh-btn"
                aria-label="Refrescar lista"
              >
                <FaSpinner className="spin" />
                <span className="sr-only">Refrescar</span>
              </button>
            </div>
          </header>

          {error && <div className="error-msg">{error}</div>}

          {loading ? (
            <div className="grid gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div className="card skeleton" key={i} />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="empty">No hay solicitudes pendientes</div>
          ) : (
            <div className="grid-cards">
              {items.map(item => (
                <article className="card" key={item.id}>
                  <div className="card-left">
                    <div className="user">{item.user ?? 'Proveedor'}</div>
                    <div className="meta">{translateType(item.type ?? item.method ?? 'Tipo')}</div>
                    <div className="date">{new Date(item.createdAt ?? Date.now()).toLocaleString()}</div>
                  </div>

                  <div className="card-right">
                    <div className="amount-container">
    <div className="amount">{formatItemAmount(item)}</div>
    
    {/* Nuevo: Mostrar monto en soles si existe */}
    {item.amountSoles !== undefined && item.amountSoles !== null && (
      <div className="amount-soles">
        S/ {parseToNumber(item.amountSoles).toFixed(2)}
      </div>
    )}
  </div>

                    <div className="actions">
                      <button
                        className="btn-approve"
                        onClick={() => requestActionWithConfirm(item.id, 'approve', item.user, formatItemAmount(item))}
                        disabled={Boolean(actionLoading[item.id])}
                        aria-label={`Aprobar solicitud ${item.id}`}
                      >
                        {actionLoading[item.id] ? <FaSpinner className="spin small" /> : <FaCheckCircle />}
                      </button>

                      <button
                        className="btn-reject"
                        onClick={() => requestActionWithConfirm(item.id, 'reject', item.user, formatItemAmount(item))}
                        disabled={Boolean(actionLoading[item.id])}
                        aria-label={`Rechazar solicitud ${item.id}`}
                      >
                        {actionLoading[item.id] ? <FaSpinner className="spin small" /> : <FaTimesCircle />}
                      </button>

                      {canTransfer && userBalance != null && (
                        <button
                          className="btn-transfer"
                          onClick={() => openTransferModal(item)}
                          disabled={Boolean(actionLoading[item.id])}
                          aria-label={`Transferir solicitud ${item.id}`}
                          title="Transferir"
                        >
                          <FaExchangeAlt />
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </main>
      </div>

      <ConfirmModal
        open={confirmData.open}
        title={confirmData.action === 'approve' ? 'Confirmar aprobación' : 'Confirmar rechazo'}
        message={confirmData.message}
        confirmText={confirmData.action === 'approve' ? 'Aprobar' : 'Rechazar'}
        cancelText="Cancelar"
        onConfirm={handleConfirm}
        onCancel={handleCancelConfirm}
        loading={Boolean(confirmData.open && confirmData.id && actionLoading[confirmData.id])}
      />

      {showTransferModal && selectedItem?.currentBalance != null && (
        <TransferToUserModal
          open={showTransferModal}
          onClose={() => { setShowTransferModal(false); setSelectedItem(null) }}
          sourceItem={selectedItem}  // incluye currentBalance
          getAuthToken={getAuthToken}
          baseUrl={BASE}
          onSuccess={() => { setShowTransferModal(false); setSelectedItem(null); fetchPending() }}
          // Nota: ya no pasamos userBalance como prop
        />
      )}

      <style jsx>{`
        .error-msg {
          max-width: 720px;
          margin: 0 auto 12px;
          padding: 10px 12px;
          background: rgba(239, 68, 68, 0.08);
          color: #fecaca;
          border: 1px solid rgba(239,68,68,0.12);
          border-radius: 10px;
        }

        .empty {
          max-width: 720px;
          margin: 16px auto;
          color: #9aa0a6;
          padding: 18px;
          text-align: center;
          border-radius: 10px;
          background: rgba(255,255,255,0.02);
        }

        .grid-cards {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 16px;
        }

        @media (max-width: 900px) {
          .grid-cards { grid-template-columns: 1fr; }
        }

        .card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 14px;
  border-radius: 12px;
  background: linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01));
  border: 1px solid rgba(255,255,255,0.04);
  box-shadow: 0 8px 20px rgba(0,0,0,0.4);
}

/* Agrega este Media Query o modifica el existente */
@media (max-width: 640px) {
  .card {
    flex-direction: column; /* Apila el contenido verticalmente */
    align-items: flex-start; /* Alinea todo a la izquierda */
  }
  
  .card-right {
    width: 100%; /* Ocupa todo el ancho */
    justify-content: space-between; /* Separa el monto de los botones */
    margin-top: 10px;
    padding-top: 10px;
    border-top: 1px solid rgba(255,255,255,0.05); /* Separador visual */
  }
}

        .card-left { display:flex; flex-direction:column; gap:6px; }
        .user { font-weight:800; color:#fff; }
        .meta { color:#bdbdbd; font-size:0.9rem; text-transform: none; }
        .date { color:#9aa0a6; font-size:0.8rem; }

        .card-right { 
  display: flex; 
  align-items: center; 
  gap: 12px;
}

@media (max-width: 480px) {
  .amount-container {
    align-items: flex-start; /* En móvil queda mejor a la izquierda */
  }
}

/* Estilo para el nuevo monto en soles */
.amount-soles {
  font-size: 0.85rem;
  color: #9aa0a6; /* Gris, menos resaltado que el blanco */
  font-weight: 400; /* No negrita */
  margin-top: 2px;
}
        .amount { font-weight:900; color:#fff; font-size:1.05rem; min-width:120px; text-align:right; }

        .actions { display:flex; gap:8px; align-items:center; }

        .btn-approve, .btn-reject, .refresh-btn, .btn-transfer {
          width:44px; height:44px; display:inline-grid; place-items:center; border-radius:10px; border:0; cursor:pointer;
        }
        .btn-approve { background: linear-gradient(135deg,#06b6d4 0%, #34d399 100%); color: #07101a; box-shadow: 0 8px 18px rgba(52,211,153,0.06); }
        .btn-reject { background: linear-gradient(135deg,#f97316 0%, #ef4444 100%); color: #fff; box-shadow: 0 8px 18px rgba(239,68,68,0.06); }
        .btn-transfer { background: linear-gradient(135deg,#3b82f6 0%, #06b6d4 100%); color: #07101a; box-shadow: 0 8px 18px rgba(59,130,246,0.06); }
        .refresh-btn { background: rgba(255,255,255,0.03); color: #d1d1d1; width:40px; height:40px; border-radius:10px; }

        .btn-approve:disabled, .btn-reject:disabled, .btn-transfer:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }
        .skeleton { height: 120px; border-radius: 12px; background: linear-gradient(90deg, rgba(255,255,255,0.02), rgba(255,255,255,0.03)); animation: shimmer 1.2s linear infinite; }

        .spin { animation: spin 1s linear infinite; }
        .spin.small { width:16px; height:16px; }
        @keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }
      `}</style>
    </>
  )
}