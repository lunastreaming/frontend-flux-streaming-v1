// pages/supplier/billetera-supplier.js
import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/router'
import NavBarSupplier from '../../components/NavBarSupplier'
import Footer from '../../components/Footer'
import AddBalanceModal from '../../components/AddBalanceModalSupplier'
import ConfirmModal from '../../components/ConfirmModal'
import LiquidarModal from '../../components/LiquidarModal'
import TransferToUserModal from '../../components/TransferToUserModal'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faExchangeAlt } from '@fortawesome/free-solid-svg-icons'

export default function BilleteraSupplier() {
  const router = useRouter()

  // auth / mount guards
  const hasFetchedRef = useRef(false)
  const [mounted, setMounted] = useState(false)

  // data
  const [balance, setBalance] = useState(0)
  const [movimientos, setMovimientos] = useState([])
  const [pending, setPending] = useState([])

  // modals
  const [modalOpen, setModalOpen] = useState(false)
  const [liquidarOpen, setLiquidarOpen] = useState(false)
  const [transferOpen, setTransferOpen] = useState(false)
  const [transferSource, setTransferSource] = useState(null)

  // confirm cancel
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmTargetId, setConfirmTargetId] = useState(null)
  const [confirmLoading, setConfirmLoading] = useState(false)

  // pagination for supplier movements (20 per page by default)
  const [movPage, setMovPage] = useState(0)
  const [movSize, setMovSize] = useState(20)
  const [movTotalElements, setMovTotalElements] = useState(0)
  const [movTotalPages, setMovTotalPages] = useState(1)

  // BASE desde variable de entorno (SSR-safe)
  const rawApiBase = process.env.NEXT_PUBLIC_API_URL
  const apiBase = rawApiBase ? rawApiBase.replace(/\/+$/, '') : ''
  const buildUrl = (path) => `${apiBase}${path.startsWith('/') ? '' : '/'}${path}`

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    if (!router.isReady || hasFetchedRef.current) return

    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null
    if (!token) {
      router.push('/supplier/loginSupplier')
      return
    }

    hasFetchedRef.current = true
    ;(async () => {
      try {
        await fetchMeAndPopulate(token)
        await fetchPendingRequests(token)
        await fetchUserTransactions(token, movPage, movSize)
      } catch (err) {
        console.error('Error inicial:', err)
        router.push('/supplier/loginSupplier')
      }
    })()
  }, [router.isReady]) // eslint-disable-line react-hooks/exhaustive-deps

  async function fetchMeAndPopulate(token) {
    const res = await fetch(buildUrl('/api/users/me'), {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) throw new Error('Token inválido')
    const data = await res.json()
    setBalance(Number.parseFloat(data.balance) || 0)

    // If the user object returns movements, keep them as a fallback (not paginated)
    if (Array.isArray(data.movements) && data.movements.length > 0) {
      const mapped = data.movements.map(tx => normalizeTx(tx))
      setMovimientos(mapped)
    }
  }

  /**
   * fetchUserTransactions consumes the paginated endpoint:
   * GET /api/wallet/user/transactions?status=complete&page={page}&size={size}
   * Accepts Page<WalletResponse> or an array fallback.
   */
  const fetchUserTransactions = useCallback(async (token, page = 0, size = 20) => {
    if (!token) return
    const endpoint = buildUrl(`/api/wallet/user/transactions?status=complete&page=${page}&size=${size}`)
    const res = await fetch(endpoint, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    })

    if (res.status === 401) {
      router.push('/supplier/loginSupplier')
      return
    }

    if (!res.ok) {
      console.warn('No se pudieron obtener movimientos del servicio /user/transactions', res.status)
      return
    }

    const data = await res.json()

    // If backend returns Page<T>, use content + metadata; if array, treat as content
    const content = Array.isArray(data) ? data : Array.isArray(data?.content) ? data.content : []
    const totalElements = typeof data?.totalElements === 'number' ? data.totalElements : (Array.isArray(data) ? data.length : (typeof data?.total === 'number' ? data.total : content.length))
    const totalPages = typeof data?.totalPages === 'number' ? data.totalPages : Math.max(1, Math.ceil(totalElements / size))
    const number = typeof data?.number === 'number' ? data.number : page

    const mapped = content.map(tx => normalizeTx(tx))
    setMovimientos(mapped)
    setMovTotalElements(totalElements)
    setMovTotalPages(totalPages)
    setMovPage(number)
    setMovSize(size)
  }, [buildUrl, router])

  async function fetchPendingRequests(token) {
    const res = await fetch(buildUrl('/api/wallet/user/pending'), {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) {
      if (res.status === 401) router.push('/supplier/loginSupplier')
      setPending([])
      return
    }
    const data = await res.json()
    const list = Array.isArray(data) ? data : Array.isArray(data.pending) ? data.pending : []
    setPending(list.map(p => ({ ...p })))
  }

  // normalize a transaction object coming from backend to the UI shape
  function normalizeTx(tx) {
    return {
      id: tx.id,
      date: tx.approvedAt || tx.createdAt || tx.date || tx.created_at || null,
      desc: tx.description || tx.type || tx.desc || 'Transacción',
      amount: typeof tx.amount === 'number' ? tx.amount : Number.parseFloat(tx.amount || 0),
      currency: tx.currency || 'PEN',
      status: tx.status || 'unknown',
      approvedBy: tx.approvedBy ? (tx.approvedBy.username || tx.approvedBy.id || tx.approvedBy) : null
    }
  }

  // Actions
  const handleAddClick = () => setModalOpen(true)
  const handleTransferClick = () => { setTransferSource(null); setTransferOpen(true) }
  const handleLiquidarClick = () => { setModalOpen(false); setLiquidarOpen(true) }

  const handleAdd = async ({ amount, currency }) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null
    if (!token) return
    const res = await fetch(buildUrl('/api/wallet/recharge'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ amount, isSoles: currency === 'PEN' }),
    })
    if (!res.ok) return
    await fetchMeAndPopulate(token)
    await fetchPendingRequests(token)
    await fetchUserTransactions(token, movPage, movSize)
  }

  const openCancelConfirm = (id) => {
    setConfirmTargetId(id)
    setConfirmOpen(true)
  }

  const onConfirmCancel = async () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null
    if (!token || !confirmTargetId) return
    setConfirmLoading(true)
    try {
      const res = await fetch(buildUrl(`/api/wallet/cancel/pending/${confirmTargetId}`), {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Error al cancelar')
      await fetchMeAndPopulate(token)
      await fetchPendingRequests(token)
      await fetchUserTransactions(token, movPage, movSize)
      setConfirmOpen(false)
      setConfirmTargetId(null)
    } catch (err) {
      console.error(err)
    } finally {
      setConfirmLoading(false)
    }
  }

  // pagination controls
  const movPrev = async () => {
    if (movPage <= 0) return
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null
    if (!token) { router.push('/supplier/loginSupplier'); return }
    await fetchUserTransactions(token, Math.max(0, movPage - 1), movSize)
  }

  const movNext = async () => {
    if (movPage >= movTotalPages - 1) return
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null
    if (!token) { router.push('/supplier/loginSupplier'); return }
    await fetchUserTransactions(token, Math.min(movTotalPages - 1, movPage + 1), movSize)
  }

  // helper formatters
  const formatPendingAmount = (p) => {
    const currency = p.currency || 'PEN'
    const isWithdrawal = p.type && p.type.toLowerCase() === 'withdrawal'
    const raw = isWithdrawal ? (p.realAmount ?? p.amount) : p.amount
    const units = (raw === null || raw === undefined) ? 0 : Number(raw)
    const absVal = Math.abs(units).toFixed(2)
    const sign = isWithdrawal ? '-' : ''
    return `${currency} ${sign}${absVal}`
  }

  const translateStatus = (status) => {
    if (!status) return ''
    const s = status.toString().toLowerCase()
    switch (s) {
      case 'approved':
      case 'complete':
        return 'Completado'
      case 'pending':
        return 'Pendiente'
      case 'rejected':
      case 'rejected_by_user':
      case 'failed':
        return 'Rechazado'
      default:
        return status.charAt(0).toUpperCase() + status.slice(1)
    }
  }

  // transfer modal helpers
  const getAuthToken = async () => {
    try { return typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null } catch { return null }
  }
  const onTransferSuccess = async () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null
    if (token) {
      await fetchMeAndPopulate(token)
      await fetchPendingRequests(token)
      await fetchUserTransactions(token, movPage, movSize)
    }
  }

  return (
    <>
      <NavBarSupplier />
      <main className="wallet-container">
        <section className="balance-card">
          <div className="balance-header">
            <h2>Saldo disponible</h2>
            <button type="button" className="btn-transfer" onClick={handleTransferClick} aria-label="Transferir">
              <FontAwesomeIcon icon={faExchangeAlt} />
            </button>
          </div>

          <div className="balance-row">
            <div className="balance-amount">${Number(balance || 0).toFixed(2)}</div>

            <div className="balance-actions">
              <button type="button" className="btn-add" onClick={handleAddClick}>Agregar saldo</button>
              <button type="button" className="btn-liquidar" onClick={handleLiquidarClick}>Liquidar</button>
            </div>
          </div>
        </section>

        {pending.length > 0 && (
          <section className="pending-card">
            <h3>Solicitudes pendientes</h3>
            <ul className="pending-list">
              {pending.map((p) => (
                <li key={p.id || p.requestId}>
                  <div className="pending-info">
                    <div className="pending-amt">{formatPendingAmount(p)}</div>
                    <div className="pending-meta">
                      <div className="pending-desc">{p.description || 'Solicitud pendiente'}</div>
                      <div className="pending-date">{p.createdAt ? new Date(p.createdAt).toLocaleString() : ''}</div>
                    </div>
                  </div>
                  <div className="pending-actions">
                    <button type="button" className="btn-cancel" onClick={() => openCancelConfirm(p.id || p.requestId)}>Eliminar</button>
                    <span className={`tx-badge ${p.status === 'approved' || p.status === 'complete' ? 'approved' : p.status === 'pending' ? 'pending' : 'rejected'}`} style={{ marginLeft: 8 }}>
                      {translateStatus(p.status)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="movements-card">
          <h3>Movimientos</h3>

          <ul className="pending-list movements-as-pending">
            {movimientos.length === 0 && <li className="empty">No hay movimientos</li>}
            {movimientos.map((m) => (
              <li key={m.id}>
                <div className="pending-info">
                  <div className="pending-amt">{m.currency || 'PEN'} {Number(m.amount).toFixed(2)}</div>
                  <div className="pending-meta">
                    <div className="pending-desc">{m.desc || m.description || 'Transacción'}</div>
                    <div className="pending-date">{m.date ? new Date(m.date).toLocaleString() : ''}</div>
                  </div>
                </div>
                <div className="pending-actions">
                  <span className={`tx-badge ${m.status === 'approved' || m.status === 'complete' ? 'approved' : m.status === 'pending' ? 'pending' : 'rejected'}`}>
                    {translateStatus(m.status)}
                  </span>
                </div>
              </li>
            ))}
          </ul>

          <div className="mov-pager">
            <div className="pager-info">Página {movPage + 1} de {movTotalPages} — {movTotalElements} movimientos</div>
            <div className="pager-controls">
              <button onClick={movPrev} disabled={movPage <= 0} className="pager-btn">Anterior</button>
              <button onClick={movNext} disabled={movPage >= movTotalPages - 1} className="pager-btn">Siguiente</button>
            </div>
          </div>
        </section>
      </main>

      <Footer />

      <AddBalanceModal open={modalOpen} onClose={() => setModalOpen(false)} onAdd={handleAdd} />

      <LiquidarModal
        open={liquidarOpen}
        onClose={() => setLiquidarOpen(false)}
        onDone={async () => {
          const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null
          if (token) {
            await fetchMeAndPopulate(token)
            await fetchPendingRequests(token)
            await fetchUserTransactions(token, movPage, movSize)
          }
        }}
      />

      <TransferToUserModal
        open={transferOpen}
        onClose={() => setTransferOpen(false)}
        sourceItem={transferSource}
        getAuthToken={getAuthToken}
        baseUrl={apiBase}
        settingsPath="/api/settings"
        searchEndpoint="/api/users/search-by-phone"
        transferEndpoint="/api/wallet/admin/transfer-to-user"
        onSuccess={onTransferSuccess}
      />

      <ConfirmModal
        open={confirmOpen}
        loading={confirmLoading}
        title="Confirmar cancelación"
        message="¿Deseas cancelar esta solicitud pendiente?"
        onCancel={() => setConfirmOpen(false)}
        onConfirm={onConfirmCancel}
      />

      <style jsx>{`
        .wallet-container {
          min-height: 80vh;
          padding: 60px 24px;
          background: #0d0d0d;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 24px;
        }

        .balance-card,
        .movements-card,
        .pending-card {
          width: 100%;
          max-width: 680px;
          background: rgba(22, 22, 22, 0.6);
          border: 1px solid rgba(255, 255, 255, 0.08);
          backdrop-filter: blur(12px);
          border-radius: 16px;
          padding: 18px;
          box-shadow: 0 12px 24px rgba(0, 0, 0, 0.4);
          color: #f3f3f3;
        }

        .balance-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }

        .btn-transfer {
          background: transparent;
          border: none;
          color: #22d3ee;
          font-size: 1.2rem;
          cursor: pointer;
          transition: transform 0.2s ease;
        }

        .btn-transfer:hover { transform: scale(1.1); }

        .balance-row {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 16px;
          flex-wrap: wrap;
        }

        .balance-amount { font-size: 2.2rem; font-weight: 800; }

        .balance-actions { display: flex; flex-direction: column; gap: 10px; }

        .btn-add {
          padding: 10px 16px;
          background: linear-gradient(135deg, #8b5cf6 0%, #22d3ee 100%);
          color: #0d0d0d;
          border: none;
          border-radius: 12px;
          font-weight: 700;
          cursor: pointer;
          white-space: nowrap;
          font-size: 0.95rem;
        }

        .btn-liquidar {
          padding: 10px 16px;
          background: linear-gradient(135deg, #f87171 0%, #fbbf24 100%);
          color: #0d0d0d;
          border: none;
          border-radius: 12px;
          font-weight: 700;
          cursor: pointer;
          white-space: nowrap;
          font-size: 0.95rem;
        }

        .btn-cancel {
          background: transparent;
          color: #ffdede;
          border: 1px solid rgba(255, 255, 255, 0.06);
          padding: 8px 12px;
          border-radius: 10px;
          font-weight: 600;
          font-size: 0.85rem;
        }

        .pending-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 10px; }

        .pending-list li {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 10px;
          border-radius: 10px;
          background: rgba(10, 10, 10, 0.35);
          border: 1px solid rgba(255, 255, 255, 0.04);
        }

        .pending-info { display: flex; gap: 12px; align-items: center; }
        .pending-amt { font-weight: 800; color: #ffd166; min-width: 110px; }
        .pending-meta { color: #cfcfcf; font-size: 0.95rem; }
        .pending-desc { font-weight: 700; color: #e6e6e6; }
        .pending-date { color: #a6a6a6; font-size: 0.85rem; }
        .pending-actions { display: flex; align-items: center; gap: 8px; }

        .tx-badge { padding: 6px 10px; border-radius: 999px; font-weight: 700; font-size: 0.75rem; color: #07101a; }
        .tx-badge.approved { background: linear-gradient(90deg,#bbf7d0,#34d399); color:#04261a; }
        .tx-badge.pending { background: linear-gradient(90deg,#fef3c7,#f59e0b); color:#3a2700; }
        .tx-badge.rejected { background: linear-gradient(90deg,#fecaca,#fb7185); color:#2b0404; }

        .mov-pager { display:flex; justify-content:space-between; align-items:center; margin-top:12px; gap:12px; flex-wrap:wrap; }
        .pager-info { color:#cbd5e1; font-size:0.9rem; }
        .pager-controls { display:flex; gap:8px; }
        .pager-btn { padding:8px 12px; border-radius:8px; border:none; background:rgba(255,255,255,0.03); color:#e1e1e1; cursor:pointer; }
        .pager-btn:disabled { opacity:0.4; cursor:not-allowed; }

        .empty { padding:12px; color:#9aa4b2; text-align:center; }

        @media (max-width: 640px) {
          .balance-amount { font-size: 1.8rem; }
          .pending-amt { min-width: 90px; }
        }
      `}</style>
    </>
  )
}