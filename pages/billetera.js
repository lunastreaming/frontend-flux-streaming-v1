// pages/billetera.js
'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/router'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import AddBalanceModal from '../components/AddBalanceModal'
import ConfirmModal from '../components/ConfirmModal'

export default function Billetera() {
  const router = useRouter()

  // ---- Hooks: siempre declarados en el mismo orden ----
  const [hasMounted, setHasMounted] = useState(false)
  const [token, setToken] = useState(null)

  // Estado principal
  const [balance, setBalance] = useState(null) // null = loading, number = loaded
  const [movimientos, setMovimientos] = useState([]) // items mostrados en la lista (página actual)
  const [pending, setPending] = useState([])
  const [modalOpen, setModalOpen] = useState(false)

  // confirm cancel
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmTargetId, setConfirmTargetId] = useState(null)
  const [confirmLoading, setConfirmLoading] = useState(false)

  // paginación para movimientos (llamado al endpoint paginado)
  const [movPage, setMovPage] = useState(0)
  const [movSize, setMovSize] = useState(20) // por defecto 20 por página
  const [movTotalElements, setMovTotalElements] = useState(0)
  const [movTotalPages, setMovTotalPages] = useState(1)

  // ref para evitar fetch inicial repetido (nombre único para evitar colisiones)
  const hasFetchedRef = useRef(false)

  // BASE desde env (SSR-safe)
  const rawApiBase = process.env.NEXT_PUBLIC_API_URL
  const apiBase = rawApiBase ? rawApiBase.replace(/\/+$/, '') : ''
  const buildUrl = (path) => `${apiBase}${path.startsWith('/') ? '' : '/'}${path}`

  useEffect(() => { setHasMounted(true) }, [])

  // leer token solo en cliente, después del montaje
  useEffect(() => {
    if (!hasMounted) return
    try {
      const t = localStorage.getItem('accessToken')
      setToken(t)
      if (!t) router.replace('/login')
    } catch (e) {
      setToken(null)
      router.replace('/login')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasMounted])

  // Fetch inicial: solo cuando estamos montados, router.ready y token presente
  useEffect(() => {
    if (!hasMounted || !router.isReady || hasFetchedRef.current || !token) return
    hasFetchedRef.current = true

    ;(async () => {
      try {
        await fetchMeAndPopulate(token)
        await fetchPendingRequests(token)
        await fetchUserTransactions(token, movPage, movSize)
      } catch (err) {
        console.error('Error inicial:', err)
        router.replace('/login')
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasMounted, router.isReady, token])

  // ---- Fetchers (client-side) ----
  async function fetchMeAndPopulate(tokenVal) {
    const apiUrl = buildUrl('/api/users/me')
    const res = await fetch(apiUrl, {
      headers: { Authorization: `Bearer ${tokenVal}` }
    })
    if (!res.ok) throw new Error('Token inválido o expirado')
    const data = await res.json()
    const monto = Number.parseFloat(data.balance) || 0
    setBalance(monto)

    const rawMov = Array.isArray(data.movements) ? data.movements : []
    if (rawMov.length > 0) {
      const mapped = rawMov.map(m => ({
        id: m.id,
        dateRaw: m.createdAt || m.date || new Date().toISOString(),
        desc: m.description || m.desc || (m.type ? m.type : 'Movimiento'),
        amount: typeof m.amount === 'number' ? m.amount : Number.parseFloat(m.amount || 0),
        currency: m.currency || 'PEN',
        status: m.status || 'unknown',
        approvedBy: m.approvedBy ? (m.approvedBy.username || m.approvedBy.id || m.approvedBy) : null
      }))
      const normalized = mapped.map(m => ({
        ...m,
        date: m.dateRaw ? formatDateLocal(m.dateRaw) : ''
      }))
      setMovimientos(normalized)
    } else {
      setMovimientos([])
    }
  }

  /**
   * fetchUserTransactions ahora consume el endpoint paginado:
   * GET /api/wallet/user/transactions?status=complete&page={page}&size={size}
   * Respuesta esperada: Page<WalletResponse> con campos content, totalElements, totalPages, number, size
   */
  const fetchUserTransactions = useCallback(async (tokenVal, page = 0, size = 20) => {
    if (!tokenVal) return
    const endpoint = buildUrl(`/api/wallet/user/transactions?status=complete&page=${page}&size=${size}`)
    const res = await fetch(endpoint, {
      headers: { Authorization: `Bearer ${tokenVal}`, Accept: 'application/json' }
    })

    if (res.status === 401) {
      router.replace('/login')
      return
    }

    if (!res.ok) {
      console.warn('No se pudieron obtener movimientos del servicio /user/transactions', res.status)
      return
    }

    const data = await res.json()

    // Si viene un Page (objeto con content), lo usamos;
    // si viene un array, lo tratamos como contenido directo
    const content = Array.isArray(data) ? data : Array.isArray(data?.content) ? data.content : []
    const totalElements = typeof data?.totalElements === 'number' ? data.totalElements : (Array.isArray(data) ? data.length : (typeof data?.total === 'number' ? data.total : content.length))
    const totalPages = typeof data?.totalPages === 'number' ? data.totalPages : Math.max(1, Math.ceil(totalElements / size))
    const number = typeof data?.number === 'number' ? data.number : page

    const mapped = content.map(tx => ({
      id: tx.id,
      dateRaw: tx.approvedAt || tx.createdAt || new Date().toISOString(),
      desc: tx.description || tx.type || 'Transacción',
      amount: typeof tx.amount === 'number' ? tx.amount : Number.parseFloat(tx.amount || 0),
      currency: tx.currency || 'PEN',
      status: tx.status || 'unknown',
      approvedBy: tx.approvedBy ? (tx.approvedBy.username || tx.approvedBy.id || tx.approvedBy) : null
    }))

    const normalized = mapped.map(m => ({
      ...m,
      date: m.dateRaw ? formatDateLocal(m.dateRaw) : ''
    }))

    setMovimientos(normalized)
    setMovTotalElements(totalElements)
    setMovTotalPages(totalPages)
    setMovPage(number)
    setMovSize(size)
  }, [buildUrl, router])

  async function fetchPendingRequests(tokenVal) {
    const endpoint = buildUrl('/api/wallet/user/pending')
    const res = await fetch(endpoint, {
      headers: { Authorization: `Bearer ${tokenVal}` }
    })
    if (!res.ok) {
      if (res.status === 401) {
        router.replace('/login')
      }
      setPending([])
      return
    }
    const data = await res.json()
    const list = Array.isArray(data) ? data : Array.isArray(data.pending) ? data.pending : []
    const normalized = list.map(p => ({
      ...p,
      createdAtRaw: p.createdAt || p.created_at || null
    }))
    const presented = normalized.map(p => ({
      ...p,
      createdAtFormatted: p.createdAtRaw ? formatDateLocal(p.createdAtRaw) : ''
    }))
    setPending(presented)
  }

  // ---- Actions ----
  const handleAddClick = () => setModalOpen(true)

  const handleAdd = async ({ amount, currency }) => {
    const tokenVal = localStorage.getItem('accessToken')
    if (!tokenVal) throw new Error('No autorizado')

    const endpoint = buildUrl('/api/wallet/recharge')
    const payload = { amount, isSoles: currency === 'PEN' }

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenVal}` },
      body: JSON.stringify(payload)
    })

    if (res.status === 401) {
      router.replace('/login')
      throw new Error('No autorizado')
    }
  
    if (!res.ok) {
      let msg = `Error ${res.status}`
      try { const body = await res.json(); msg = body?.message || JSON.stringify(body) } catch (e) {}
      throw new Error(msg)
    }

    // refrescar datos: balance, pendientes y movimientos (mantener página actual)
    await fetchMeAndPopulate(tokenVal)
    await fetchPendingRequests(tokenVal)
    await fetchUserTransactions(tokenVal, movPage, movSize)
  }

  const openConfirmCancel = (id) => {
    setConfirmTargetId(id)
    setConfirmOpen(true)
  }

  const closeConfirm = () => {
    setConfirmTargetId(null)
    setConfirmOpen(false)
  }

  const confirmCancelPending = async () => {
    if (!confirmTargetId) { closeConfirm(); return }

    setConfirmLoading(true)
    const tokenVal = localStorage.getItem('accessToken')
    if (!tokenVal) {
      setConfirmLoading(false)
      closeConfirm()
      router.replace('/login')
      return
    }

    try {
      const endpoint = buildUrl(`/api/wallet/cancel/pending/${encodeURIComponent(confirmTargetId)}`)
      const res = await fetch(endpoint, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${tokenVal}`, 'Content-Type': 'application/json' }
      })

      if (res.status === 401) { router.replace('/login'); return }
      if (!res.ok) {
        let msg = `Error ${res.status}`
        try { const body = await res.json(); msg = body?.message || JSON.stringify(body) } catch (e) {}
        alert(`No se pudo cancelar la solicitud: ${msg}`)
        return
      }

      await fetchPendingRequests(tokenVal)
      await fetchMeAndPopulate(tokenVal)
      await fetchUserTransactions(tokenVal, movPage, movSize)
    } catch (err) {
      console.error('Error cancelando solicitud pendiente:', err)
      alert('Error al cancelar la solicitud. Intenta nuevamente.')
    } finally {
      setConfirmLoading(false)
      closeConfirm()
    }
  }

  // helper: mostrar monto con dos decimales; balance null = loading
  const formatAmount = (v) => {
    if (v === null) return 'Cargando…'
    const n = Number(v)
    if (Number.isNaN(n)) return '—'
    return `$${n.toFixed(2)}`
  }

  const formatDateLocal = (value) => {
  if (!value) return ''
  try {
    const d = new Date(value)
    if (Number.isNaN(d.getTime())) return ''
    const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone
    return d.toLocaleString('es-PE', {
      timeZone: userTimeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  } catch {
    return ''
  }
}

  // paginador UI handlers para movimientos
  const movPrev = async () => {
    if (movPage <= 0) return
    const nextPage = Math.max(0, movPage - 1)
    const tokenVal = localStorage.getItem('accessToken')
    if (!tokenVal) { router.replace('/login'); return }
    await fetchUserTransactions(tokenVal, nextPage, movSize)
  }

  const movNext = async () => {
    if (movPage >= movTotalPages - 1) return
    const nextPage = Math.min(movTotalPages - 1, movPage + 1)
    const tokenVal = localStorage.getItem('accessToken')
    if (!tokenVal) { router.replace('/login'); return }
    await fetchUserTransactions(tokenVal, nextPage, movSize)
  }

  // ---- Render ----
  if (!hasMounted) {
    return (
      <>
        <Navbar />
        <main className="wallet-container">
          <section className="balance-card">
            <h2>Saldo disponible</h2>
            <div className="balance-row">
              <div className="balance-amount">Cargando…</div>
              <button className="btn-add" disabled>Recarga Aquí</button>
            </div>
          </section>
        </main>
        <Footer />
      </>
    )
  }

  if (!token) return null

  return (
    <>
      <Navbar />
      <main className="wallet-container">
        <section className="balance-card">
  <h2>Saldo disponible</h2>
  <div className="balance-row">
    <div className="balance-amount">{formatAmount(balance)}</div>
    
    {/* Contenedor para los botones alineados verticalmente */}
    <div className="balance-actions">
      <button className="btn-add" onClick={handleAddClick}>
        Recarga Aquí
      </button>
      
      <a 
        href={`https://wa.me/51902229594?text=${encodeURIComponent("Hola Flux solicite una recarga, envío el comprobante\nAceptar mi recarga por favor.")}`}
        target="_blank"
        rel="noopener noreferrer"
        className="btn-whatsapp"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.72.937 3.659 1.432 5.628 1.433h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
        </svg>
        Enviar Comprobante
      </a>
    </div>
  </div>
</section>

        {pending.length > 0 && (
          <section className="pending-card">
            <h3>Solicitudes pendientes</h3>
            <ul className="pending-list">
              {pending.map((p) => (
                <li key={p.id || p.requestId || JSON.stringify(p)}>
                  <div className="pending-info">
                    <div className="pending-amt">{p.currency || 'PEN'} {Number(p.amount || 0).toFixed(2)}</div>
                    <div className="pending-meta">
                      <div className="pending-desc">{p.description || 'Solicitud de recarga'}</div>
                      <div className="pending-date">{p.createdAtFormatted || ''}</div>
                    </div>
                  </div>
                  <div className="pending-actions">
                    <button className="btn-cancel" onClick={() => openConfirmCancel(p.id || p.requestId)} aria-label={`Eliminar solicitud ${p.id || p.requestId}`}>
                      Eliminar
                    </button>
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
              <li key={m.id || JSON.stringify(m)}>
                <div className="pending-info">
                  <div className="pending-amt">{m.currency || 'PEN'} {Number(m.amount).toFixed(2)}</div>
                  <div className="pending-meta">
                    <div className="pending-desc">{m.desc}</div>
                    <div className="pending-date">{m.date || ''}</div>
                  </div>
                </div>

                <div className="pending-actions">
                  <span className={`tx-badge ${m.status === 'approved' || m.status === 'complete' ? 'approved' : m.status === 'pending' ? 'pending' : 'rejected'}`}>
                    {m.status}
                  </span>
                </div>
              </li>
            ))}
          </ul>

          {/* Paginador de movimientos */}
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

      <ConfirmModal
        open={confirmOpen}
        loading={confirmLoading}
        title="Confirmar cancelación"
        message="¿Deseas cancelar esta solicitud pendiente? Esta acción no podrá deshacerse."
        onCancel={closeConfirm}
        onConfirm={confirmCancelPending}
        confirmText="Sí, cancelar"
        cancelText="No, cerrar"
      />

      <style jsx>{`
        /* 🚨 CAMBIO CRÍTICO APLICADO AQUÍ: background: transparent; */
        .wallet-container { min-height: 80vh; padding: 60px 24px; background: transparent; display:flex; flex-direction:column; align-items:center; gap:24px; }
        .balance-card, .movements-card, .pending-card { width:100%; max-width:680px; background: rgba(22,22,22,0.6); border:1px solid rgba(255,255,255,0.08); backdrop-filter: blur(12px); border-radius:16px; padding:18px; box-shadow:0 12px 24px rgba(0,0,0,0.4); color:#f3f3f3; }
        .balance-card h2, .movements-card h3, .pending-card h3 { margin:0 0 12px; font-weight:700; }
        .balance-amount { font-size:2.2rem; font-weight:800; margin-bottom:12px; }
        .balance-row { 
  display: flex; 
  justify-content: space-between; 
  align-items: center; 
  gap: 16px; 
  flex-wrap: wrap; 
}

.balance-actions {
  display: flex;
  flex-direction: column;
  gap: 10px;
  align-items: stretch; /* Estira los botones para que tengan el mismo ancho */
  min-width: 200px;
}
        .btn-add { 
  padding: 10px 16px; 
  background: linear-gradient(135deg, #8b5cf6 0%, #22d3ee 100%); 
  color: #0d0d0d;
  border: none; 
  border-radius: 12px; 
  font-weight: 700; 
  cursor: pointer; 
  transition: transform 0.2s ease; 
  text-align: center;
}

.btn-add:hover { transform: translateY(-2px); }

.btn-whatsapp {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px 16px;
  background: #25D366; /* Color oficial de WhatsApp */
  color: #fff;
  text-decoration: none;
  border-radius: 12px;
  font-weight: 700;
  font-size: 0.9rem;
  transition: background 0.2s ease, transform 0.2s ease;
}

.btn-whatsapp:hover {
  background: #20ba5a;
  transform: translateY(-2px);
}
        .pending-list { list-style:none; margin:0; padding:0; display:flex; flex-direction:column; gap:10px; }
        .pending-list li { display:flex; align-items:center; justify-content:space-between; gap:12px; padding:10px; border-radius:10px; background: rgba(10,10,10,0.35); border:1px solid rgba(255,255,255,0.04); }
        .pending-info { display:flex; gap:12px; align-items:center; }
        .pending-amt { font-weight:800; color:#ffd166; min-width:110px; }
        .pending-meta { color:#cfcfcf; font-size:0.95rem; }
        .pending-desc { font-weight:700; color:#e6e6e6; }
        .pending-date { color:#a6a6a6; font-size:0.85rem; }
        .btn-cancel { padding:8px 12px; border-radius:10px; border:1px solid rgba(255,255,255,0.06); background:transparent; color:#ffdede; cursor:pointer; font-weight:700; }
        .tx-badge { padding:6px 10px; border-radius:999px; font-weight:700; font-size:0.75rem; color:#07101a; }
        .tx-badge.approved { background: linear-gradient(90deg,#bbf7d0,#34d399); color:#04261a; }
        .tx-badge.pending { background: linear-gradient(90deg,#fef3c7,#f59e0b); color:#3a2700; }
        .tx-badge.rejected { background: linear-gradient(90deg,#fecaca,#fb7185); color:#2b0404; }

        .mov-pager { display:flex; justify-content:space-between; align-items:center; margin-top:12px; gap:12px; flex-wrap:wrap; }
        .pager-info { color:#cbd5e1; font-size:0.9rem; }
        .pager-controls { display:flex; gap:8px; }
        .pager-btn { padding:8px 12px; border-radius:8px; border:none; background:rgba(255,255,255,0.03); color:#e1e1e1; cursor:pointer; }
        .pager-btn:disabled { opacity:0.4; cursor:not-allowed; }

        .empty { padding:12px; color:#9aa4b2; text-align:center; }

        @media (max-width:640px) { .balance-amount{font-size:1.8rem} .pending-amt{min-width:90px} }
      `}</style>
    </>
  )
}