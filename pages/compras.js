'use client'

import { useCallback, useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/router'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import SupportModal from '../components/SupportModal'
import {
  FaEye,
  FaEyeSlash,
  FaSearch,
  FaWhatsapp,
  FaClipboardList,
  FaLifeRing,
  FaCheckCircle,
  FaUndo,
  FaShoppingCart
} from 'react-icons/fa'

export default function ComprasPage() {
  const router = useRouter()

  const [mounted, setMounted] = useState(false)
  const [token, setToken] = useState(null)

  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const [size] = useState(20)
  const [totalElements, setTotalElements] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [visiblePasswords, setVisiblePasswords] = useState(() => new Set())

  const [viewFilter, setViewFilter] = useState('all')
  const [supportOpen, setSupportOpen] = useState(false)
  const [supportTarget, setSupportTarget] = useState(null)

  const BASE_URL = process.env.NEXT_PUBLIC_API_URL || ''
  const fetchControllerRef = useRef(null)
  const requestIdRef = useRef(0)
  const isUnmountedRef = useRef(false)

  const moneyFormatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
  const formatPrice = (v) => {
    if (v === null || v === undefined) return '—'
    try { return moneyFormatter.format(Number(v)) } catch { return '—' }
  }
  const formatDate = (value) => {
    if (!value) return '—'
    try {
      const d = (value instanceof Date) ? value : new Date(value)
      if (Number.isNaN(d.getTime())) return '—'
      return d.toLocaleDateString()
    } catch { return '—' }
  }

  useEffect(() => {
    setMounted(true)
    if (typeof window !== 'undefined') {
      const t = localStorage.getItem('accessToken')
      setToken(t)
      if (!t) router.replace('/login')
    }
    return () => {
      isUnmountedRef.current = true
      if (fetchControllerRef.current) { try { fetchControllerRef.current.abort() } catch {} }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const sanitizeSupportType = (raw) => {
    if (!raw && raw !== 0) return null
    return String(raw).replace(/\s*\(?\s*REFUND\s*\)?/i, '').trim() || null
  }
  const normalizeStatus = (raw) => {
    if (!raw && raw !== 0) return null
    return String(raw).toUpperCase()
  }

  const startNewFetch = () => {
    if (fetchControllerRef.current) { try { fetchControllerRef.current.abort() } catch {} }
    const controller = new AbortController()
    fetchControllerRef.current = controller
    requestIdRef.current += 1
    const localRequestId = requestIdRef.current
    return { controller, signal: controller.signal, localRequestId }
  }

  // Compras normales
  const fetchPurchases = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const tokenVal = token
      if (!tokenVal) { router.replace('/login'); return }

      const { signal, localRequestId } = startNewFetch()

      const params = new URLSearchParams()
      params.set('page', String(page))
      params.set('size', String(size))

      const res = await fetch(`${BASE_URL}/api/stocks/purchases?${params.toString()}`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${tokenVal}`, 'Content-Type': 'application/json' },
        signal
      })

      if (!res.ok) {
        if (res.status === 401) { router.replace('/login'); return }
        const txt = await res.text().catch(() => '')
        throw new Error(`Error ${res.status} ${txt}`)
      }

      const payload = await res.json()
      const rawItems = Array.isArray(payload) ? payload : (Array.isArray(payload?.content) ? payload.content : [])

      const normalized = rawItems.map((p, idx) => {
        const supportTypeClean = sanitizeSupportType(p.supportType ?? null)
        const supportStatusNormalized = normalizeStatus(p.supportStatus ?? null)
        return {
          id: p.id ?? idx,
          productId: p.productId ?? p.product_id ?? null,
          productName: p.productName ?? p.name ?? '',
          username: p.username ?? '',
          password: p.password ?? '',
          url: p.url ?? null,
          numeroPerfil: p.numeroPerfil ?? p.numero_perfil ?? null,
          pin: p.pin ?? null,
          startAt: p.startAt ?? p.start_at ?? p.soldAt ?? null,
          endAt: p.endAt ?? p.end_at ?? p.soldAt ?? null,
          refund: typeof p.refund !== 'undefined' ? p.refund : null,
          clientName: p.clientName ?? p.client_name ?? '',
          clientPhone: p.clientPhone ?? p.client_phone ?? '',
          providerName: p.providerName ?? p.provider_name ?? p.providerUsername ?? null,
          providerPhone: p.providerPhone ?? p.provider_phone ?? p.providerPhoneNumber ?? '',
          status: p.status ?? null,
          supportId: p.supportId ?? null,
          supportType: supportTypeClean,
          supportStatus: supportStatusNormalized,
          supportCreatedAt: p.supportCreatedAt ?? null,
          supportUpdatedAt: p.supportUpdatedAt ?? null,
          supportResolvedAt: p.supportResolvedAt ?? null,
          supportResolutionNote: p.supportResolutionNote ?? null,
          buyerUsername: p.buyerUsername ?? null
        }
      })

      if (isUnmountedRef.current || localRequestId !== requestIdRef.current) return

      setItems(normalized)
      setTotalElements(Array.isArray(payload) ? normalized.length : Number(payload.totalElements ?? normalized.length))
      setTotalPages(Array.isArray(payload) ? 1 : Number(payload.totalPages ?? 1))
      setPage(Array.isArray(payload) ? 0 : Number(payload.page ?? payload.number ?? page))
    } catch (err) {
      if (err.name === 'AbortError') return
      setError(err.message || String(err))
      setItems([])
    } finally { setLoading(false) }
  }, [BASE_URL, page, size, router, token])

  // Lista de soporte del cliente (no usada en “Resuelto”)
  const fetchSupportList = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const tokenVal = token
      if (!tokenVal) { router.replace('/login'); return }

      const { signal, localRequestId } = startNewFetch()

      const res = await fetch(`${BASE_URL}/api/support/client/me`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${tokenVal}`, 'Content-Type': 'application/json' },
        signal
      })

      if (!res.ok) {
        if (res.status === 401) { router.replace('/login'); return }
        const txt = await res.text().catch(() => '')
        throw new Error(`Error ${res.status} ${txt}`)
      }

      const payload = await res.json()
      const normalized = (Array.isArray(payload) ? payload : []).map((t, idx) => {
        const stock = t.stock ?? t.stockSummary ?? t.stockEntity ?? null
        const stockId = stock?.id ?? t.stockId ?? t.purchaseId ?? null
        const rowId = t.id ?? stockId ?? idx

        const rawSupportType = t.issueType ?? t.supportType ?? null
        const supportTypeClean = sanitizeSupportType(rawSupportType)
        const supportStatusNormalized = normalizeStatus(t.status ?? t.supportStatus ?? null)

        return {
          id: rowId,
          productId: stock?.productId ?? stock?.product_id ?? null,
          productName: stock?.productName ?? stock?.name ?? t.productName ?? '',
          username: stock?.username ?? t.username ?? '',
          password: stock?.password ?? t.password ?? '',
          url: stock?.url ?? t.url ?? null,
          numeroPerfil: stock?.numeroPerfil ?? stock?.numero_perfil ?? t.numeroPerfil ?? null,
          pin: stock?.pin ?? t.pin ?? null,
          startAt: stock?.startAt ?? stock?.start_at ?? stock?.soldAt ?? t.startAt ?? null,
          endAt: stock?.endAt ?? stock?.end_at ?? stock?.soldAt ?? t.endAt ?? null,
          refund: stock?.refund ?? t.refund ?? null,
          clientName: stock?.clientName ?? t.clientName ?? '',
          clientPhone: stock?.clientPhone ?? t.clientPhone ?? t.client_phone ?? '',
          providerName: stock?.providerName ?? t.providerName ?? t.provider_name ?? '',
          providerPhone: stock?.providerPhone ?? t.providerPhone ?? t.provider_phone ?? t.providerPhoneNumber ?? '',
          status: stock?.status ?? t.status ?? null,
          supportId: t.id ?? null,
          supportType: supportTypeClean,
          supportStatus: supportStatusNormalized,
          supportCreatedAt: t.createdAt ?? t.supportCreatedAt ?? null,
          supportUpdatedAt: t.updatedAt ?? t.supportUpdatedAt ?? null,
          supportResolvedAt: t.resolvedAt ?? t.supportResolvedAt ?? null,
          supportResolutionNote: t.resolutionNote ?? t.supportResolutionNote ?? null,
          buyerUsername: t.buyerUsername ?? null
        }
      })

      if (isUnmountedRef.current || localRequestId !== requestIdRef.current) return

      setItems(normalized)
      setTotalElements(normalized.length)
      setTotalPages(1)
      setPage(0)
    } catch (err) {
      if (err.name === 'AbortError') return
      setError(err.message || String(err))
      setItems([])
    } finally { setLoading(false) }
  }, [BASE_URL, router, token])

  // Resuelto: traer tickets IN_PROCESS
  const fetchClientInProcess = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const tokenVal = token
      if (!tokenVal) { router.replace('/login'); return }

      const { signal, localRequestId } = startNewFetch()

      const res = await fetch(`${BASE_URL}/api/support/client/in-process`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${tokenVal}`, 'Content-Type': 'application/json' },
        signal
      })

      if (!res.ok) {
        if (res.status === 401) { router.replace('/login'); return }
        const txt = await res.text().catch(() => '')
        throw new Error(`Error ${res.status} ${txt}`)
      }

      const payload = await res.json()
      const normalized = (Array.isArray(payload) ? payload : []).map((t, idx) => ({
        id: t.id ?? idx,
        productId: t.productId ?? null,
        productName: t.productName ?? '',
        username: t.username ?? '',
        password: t.password ?? '',
        url: t.url ?? null,
        numeroPerfil: t.numeroPerfil ?? null,
        pin: t.pin ?? null,
        startAt: t.startAt ?? t.soldAt ?? null,
        endAt: t.endAt ?? null,
        clientName: t.clientName ?? '',
        clientPhone: t.clientPhone ?? '',
        providerName: t.providerName ?? '',
        providerPhone: t.providerPhone ?? '',
        refund: t.refund ?? null,
        supportId: t.supportId ?? t.id ?? null,
        supportType: t.supportType ?? '',
        supportStatus: normalizeStatus(t.supportStatus ?? 'IN_PROCESS'),
        supportResolutionNote: t.supportResolutionNote ?? null,
        buyerUsername: t.buyerUsername ?? null
      }))

      if (isUnmountedRef.current || localRequestId !== requestIdRef.current) return

      setItems(normalized)
      setTotalElements(normalized.length)
      setTotalPages(1)
      setPage(0)
    } catch (err) {
      if (err.name === 'AbortError') return
      setError(err.message || String(err))
      setItems([])
    } finally { setLoading(false) }
  }, [BASE_URL, router, token])

  // Aprobar ticket (solo se usa en vista Resuelto)
  const approveTicket = async (ticketId) => {
    try {
      setLoading(true)
      const res = await fetch(`${BASE_URL}/api/support/${encodeURIComponent(ticketId)}/approve`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ approvalNote: 'Cliente aprueba resolución' })
      })
      if (res.status === 401) { router.replace('/login'); return }
      if (!res.ok) {
        const txt = await res.text().catch(() => '')
        throw new Error(`Error ${res.status} ${txt}`)
      }
      await fetchClientInProcess()
    } catch (err) {
      alert(err.message || 'Error al aprobar ticket')
    } finally { setLoading(false) }
  }

  // Carga inicial según vista
  useEffect(() => {
    if (!mounted) return
    if (!token) return
    if (viewFilter === 'support') return
    if (viewFilter === 'resolved') { fetchClientInProcess(); return }
    fetchPurchases()
  }, [fetchPurchases, fetchClientInProcess, mounted, token, viewFilter])

  const togglePasswordVisibility = (id) => {
    setVisiblePasswords(prev => {
      const copy = new Set(prev)
      if (copy.has(id)) copy.delete(id)
      else copy.add(id)
      return copy
    })
  }

  const displayed = items.filter(i => (i.productName ?? '').toLowerCase().includes(search.toLowerCase()))

  const goPrev = () => setPage(p => Math.max(0, p - 1))
  const goNext = () => setPage(p => Math.min(totalPages - 1, p + 1))

  const toolbarDisabled = loading

  if (!mounted || !token) return null

  return (
    <div className="min-h-screen page-bg text-white font-inter">
      <Navbar />
      <main className="page-container">
        <div className="header-row">
          <div className="search-bar">
            <FaSearch className="search-icon-inline" />
            <input
              type="text"
              placeholder="Buscar producto…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="search-input-inline"
            />
          </div>

          <div className="actions-right" role="toolbar" aria-label="Acciones de vista">
            <div
              className={`icon-btn ${viewFilter === 'all' ? 'active' : ''}`}
              onClick={() => { if (!toolbarDisabled) { setViewFilter('all'); setPage(0); fetchPurchases() } }}
              role="button"
              tabIndex={0}
              aria-pressed={viewFilter === 'all'}
              title="Compras"
              aria-disabled={toolbarDisabled}
              style={{ opacity: toolbarDisabled ? 0.5 : 1, pointerEvents: toolbarDisabled ? 'none' : 'auto' }}
            >
              <FaShoppingCart className="icon-large" />
              <div className="icon-label">Compras</div>
            </div>

            <div
              className={`icon-btn ${viewFilter === 'requested' ? 'active' : ''}`}
              onClick={() => { if (!toolbarDisabled) { setViewFilter('requested'); setPage(0); fetchPurchases() } }}
              role="button"
              tabIndex={0}
              aria-pressed={viewFilter === 'requested'}
              title="A pedido"
              aria-disabled={toolbarDisabled}
              style={{ opacity: toolbarDisabled ? 0.5 : 1, pointerEvents: toolbarDisabled ? 'none' : 'auto' }}
            >
              <FaClipboardList className="icon-large" />
              <div className="icon-label">A pedido</div>
            </div>

            <div
              className={`icon-btn ${viewFilter === 'support' ? 'active' : ''}`}
              onClick={async () => { if (!toolbarDisabled) { setViewFilter('support'); setPage(0); await fetchSupportList() } }}
              role="button"
              tabIndex={0}
              aria-pressed={viewFilter === 'support'}
              title="Soporte"
              aria-disabled={toolbarDisabled}
              style={{ opacity: toolbarDisabled ? 0.5 : 1, pointerEvents: toolbarDisabled ? 'none' : 'auto' }}
            >
              <FaLifeRing className="icon-large" />
              <div className="icon-label">Soporte</div>
            </div>

            <div
              className={`icon-btn ${viewFilter === 'resolved' ? 'active' : ''}`}
              onClick={() => { if (!toolbarDisabled) { setViewFilter('resolved'); setPage(0); fetchClientInProcess() } }}
              role="button"
              tabIndex={0}
              aria-pressed={viewFilter === 'resolved'}
              title="Resuelto (IN_PROCESS)"
              aria-disabled={toolbarDisabled}
              style={{ opacity: toolbarDisabled ? 0.5 : 1, pointerEvents: toolbarDisabled ? 'none' : 'auto' }}
            >
              <FaCheckCircle className="icon-large" />
              <div className="icon-label">Resuelto</div>
            </div>

            <div
              className={`icon-btn ${viewFilter === 'refunded' ? 'active' : ''}`}
              onClick={() => { if (!toolbarDisabled) { setViewFilter('refunded'); setPage(0); fetchPurchases() } }}
              role="button"
              tabIndex={0}
              aria-pressed={viewFilter === 'refunded'}
              title="Reembolsado"
              aria-disabled={toolbarDisabled}
              style={{ opacity: toolbarDisabled ? 0.5 : 1, pointerEvents: toolbarDisabled ? 'none' : 'auto' }}
            >
              <FaUndo className="icon-large" />
              <div className="icon-label">Reembolsado</div>
            </div>
          </div>
        </div>

        <div className="table-wrapper">
          {loading ? (
            <div className="info">Cargando…</div>
          ) : error ? (
            <div className="error">Error: {error}</div>
          ) : displayed.length === 0 ? (
            <div className="info">No hay datos</div>
          ) : (
            <div className="table-scroll">
              <table className="styled-table">
                <colgroup>
                  <col style={{ width: '40px' }} />
                  <col style={{ width: '120px' }} />
                  <col />
                  <col style={{ width: '180px' }} />
                  <col style={{ width: '160px' }} />
                  <col style={{ width: '160px' }} />
                  <col style={{ width: '120px' }} />
                  <col style={{ width: '120px' }} />
                  <col style={{ width: '140px' }} />
                  <col style={{ width: '140px' }} />
                  <col style={{ width: '120px' }} />
                  <col style={{ width: '160px' }} />
                  <col style={{ width: '160px' }} />
                  <col style={{ width: '180px' }} />
                  {/* Proveedor */}
                  <col style={{ width: '180px' }} />
                  {/* Detalle solución / Celular proveedor */}
                  <col style={{ width: '220px' }} />
                  {/* Aprobar (solo resuelto) */}
                  {viewFilter === 'resolved' && <col style={{ width: '140px' }} />}
                </colgroup>

                <thead>
                  <tr>
                    <th>#</th>
                    <th>Id</th>
                    <th>Producto</th>
                    <th>Username</th>
                    <th>Password</th>
                    <th>URL</th>
                    <th>Nº Perfil</th>
                    <th>Pin</th>
                    <th>Inicio</th>
                    <th>Fin</th>
                    <th>Refund</th>
                    <th>Cliente</th>
                    {/* Celular del cliente: botón WhatsApp + número debajo */}
                    <th>Celular</th>
                    <th>Tipo Soporte</th>
                    <th>Proveedor</th>
                    {/* En Resuelto: “Detalle de la solución”, en otras vistas: “Celular Proveedor” */}
                    <th>{viewFilter === 'resolved' ? 'Detalle de la solución' : 'Celular Proveedor'}</th>
                    {viewFilter === 'resolved' && <th>APROBAR</th>}
                  </tr>
                </thead>

                <tbody>
                  {displayed.map((row, idx) => {
                    const isVisible = visiblePasswords.has(row.id)
                    const masked = row.password ? '••••••••' : ''
                    const supportStatusClass = (row.supportStatus || '').toLowerCase().replace(/\s+/g, '_')

                    // Mensaje de WhatsApp (usa buyerUsername y supportResolutionNote)
                    const whatsappMsg = `Hola ${row.buyerUsername ?? ''} 👋🏻
${row.supportResolutionNote ?? ''} 👋🏻
🍿De ${row.productName ?? ''}🍿
✉ usuario: ${row.username ?? ''}
🔐 Contraseña: ${row.password ?? ''}
🌍 Url: ${row.url ?? ''}
👥 Perfil: ${row.numeroPerfil ?? ''}
🔐 Pin: ${row.pin ?? ''}
🎬🍿🎬🍿🎬🍿🎬🍿🎬🍿🎬
¡¡Siga disfrutando del servicio!!`

                    const onClickWhatsAppClient = () => {
                      const phoneRaw = row.clientPhone ?? ''
                      const phone = String(phoneRaw || '').replace(/[^\d+]/g, '')
                      const waNumber = phone.startsWith('+') ? phone.slice(1) : phone
                      const encoded = encodeURIComponent(whatsappMsg)
                      if (!waNumber) {
                        window.open(`https://web.whatsapp.com/send?text=${encoded}`, '_blank')
                        return
                      }
                      window.open(`https://api.whatsapp.com/send?phone=${waNumber}&text=${encoded}`, '_blank')
                    }

                    return (
                      <tr key={row.id}>
                        <td><div className="row-inner index">{idx + 1}</div></td>
                        <td><div className="row-inner">{row.id}</div></td>
                        <td><div className="row-inner td-name" title={row.productName}>{row.productName}</div></td>
                        <td><div className="row-inner">{row.username || ''}</div></td>

                        <td>
                          <div className="row-inner password-cell">
                            <div className="pw-text">{isVisible ? (row.password || '') : masked}</div>
                            <button onClick={() => togglePasswordVisibility(row.id)} className="pw-btn" aria-label={isVisible ? 'Ocultar contraseña' : 'Mostrar contraseña'}>
                              {isVisible ? <FaEyeSlash /> : <FaEye />}
                            </button>
                          </div>
                        </td>

                        <td>
                          <div className="row-inner">
                            {row.url ? <span className="url-text" title={row.url}>{row.url}</span> : <span className="url-empty" aria-hidden="true"></span>}
                          </div>
                        </td>

                        <td><div className="row-inner">{row.numeroPerfil ?? ''}</div></td>
                        <td><div className="row-inner">{row.pin ?? ''}</div></td>
                        <td><div className="row-inner no-wrap">{formatDate(row.startAt)}</div></td>
                        <td><div className="row-inner no-wrap">{formatDate(row.endAt)}</div></td>
                        <td><div className="row-inner">{formatPrice(row.refund)}</div></td>
                        <td><div className="row-inner">{row.clientName || ''}</div></td>

                        {/* Celular del cliente con botón WhatsApp y número debajo */}
                        <td>
                          <div className="row-inner whatsapp-cell">
                            <button
                              className="wa-btn"
                              title={`WhatsApp cliente ${row.clientPhone || ''}`}
                              onClick={onClickWhatsAppClient}
                              aria-label={`WhatsApp cliente ${row.clientPhone || ''}`}
                            >
                              <FaWhatsapp />
                            </button>
                            <div className="wa-number">{row.clientPhone ?? ''}</div>
                          </div>
                        </td>

                        <td>
                          <div className="row-inner type-provider-cell">
                            <span className={`support-badge ${supportStatusClass}`}>
                              {row.supportType ?? '—'}
                            </span>
                            <div style={{ fontSize: 12, color: '#9fb4c8', marginTop: 6 }}>{row.supportStatus ?? ''}</div>
                          </div>
                        </td>

                        <td><div className="row-inner"><strong style={{ color: '#e6eef7' }}>{row.providerName ?? '—'}</strong></div></td>

                        {/* En Resuelto: Detalle de la solución (supportResolutionNote). En otras vistas: celular del proveedor */}
                        <td>
                          {viewFilter === 'resolved' ? (
                            <div className="row-inner">{row.supportResolutionNote ?? '—'}</div>
                          ) : (
                            <div className="row-inner">{row.providerPhone ?? ''}</div>
                          )}
                        </td>

                        {/* Botón Aprobar solo en vista Resuelto */}
                        {viewFilter === 'resolved' && (
                          <td>
                            <div className="row-inner">
                              <button
                                className="approve-btn"
                                title="Aprobar ticket"
                                onClick={() => approveTicket(row.id)}
                              >
                                <FaCheckCircle />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="pager-row">
          <div className="pager-info">Mostrando {displayed.length} de {totalElements}</div>
          <div className="pager-controls">
            <button onClick={goPrev} disabled={page <= 0} className="pager-btn">Anterior</button>
            <button onClick={goNext} disabled={page >= totalPages - 1} className="pager-btn">Siguiente</button>
          </div>
        </div>
      </main>

      <Footer />

      <SupportModal open={supportOpen} onClose={() => setSupportOpen(false)} onAccept={(choice) => {
        if (!supportTarget) { alert('Selecciona primero una compra para generar soporte.'); return }
        const stockId = supportTarget.id
        const issueType = choice
        const description = `Soporte generado desde UI: ${issueType}`
        setLoading(true); setError(null)
        ;(async () => {
          try {
            if (!token) { router.replace('/login'); return }
            const res = await fetch(`${BASE_URL}/api/support`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
              body: JSON.stringify({ stockId, issueType, description })
            })
            if (res.status === 401) { router.replace('/login'); return }
            if (!res.ok) {
              const txt = await res.text().catch(() => '')
              throw new Error(`Error ${res.status} ${txt}`)
            }
            setSupportOpen(false)
            if (viewFilter === 'support') await fetchSupportList()
            else await fetchPurchases()
          } catch (err) {
            setError(err.message || String(err))
            alert(err.message || 'Error al crear soporte')
          } finally { setLoading(false) }
        })()
      }} />

      <style jsx>{`
        .page-bg { background: radial-gradient(circle at top, #0b1220, #05060a); min-height: 100vh; }
        .page-container { padding: 60px 24px; max-width: 1200px; margin: 0 auto; }
        .header-row { display:flex; justify-content:space-between; align-items:center; gap:12px; margin-bottom:24px; }
        .search-bar { display:flex; align-items:center; background: rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.06); border-radius:10px; padding:0 12px; height:38px; max-width:520px; width:100%; }
        .search-icon-inline { color:#9fb4c8; margin-right:8px; }
        .search-input-inline { flex:1; background:transparent; border:none; color:#fff; outline:none; font-size:0.95rem; }
        .actions-right { display:flex; gap:12px; align-items:center; justify-content:flex-end; }
        .icon-btn { display:flex; flex-direction:column; align-items:center; justify-content:center; gap:6px; width:72px; height:72px; border-radius:12px; background: rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.04); color:#cfe7ff; cursor:pointer; transition: transform 120ms ease, box-shadow 120ms ease, background 120ms ease; text-align:center; padding:8px; }
        .icon-btn:focus { outline: 2px solid rgba(59,130,246,0.35); outline-offset: 2px; }
        .icon-btn:hover { transform: translateY(-4px); }
        .icon-btn.active { background: linear-gradient(90deg,#06b6d4,#3b82f6); color:#021018; border: none; box-shadow: 0 8px 28px rgba(59,130,246,0.18); }
        .icon-large { font-size: 20px; }
        .icon-label { font-size: 12px; font-weight:700; margin-top:2px; }

        .table-wrapper { overflow:hidden; background: rgba(22,22,22,0.6); border:1px solid rgba(255,255,255,0.06); backdrop-filter: blur(12px); border-radius:12px; padding:12px; box-shadow: 0 12px 24px rgba(0,0,0,0.4); }
        .table-scroll { overflow:auto; border-radius:8px; }
        table.styled-table { width:100%; border-collapse:separate; border-spacing: 0 12px; color:#e1e1e1; min-width: 1280px; }
        thead tr { background: rgba(30,30,30,0.8); text-transform:uppercase; letter-spacing:0.06em; color:#cfcfcf; font-size:0.72rem; }
        thead th { padding:10px; text-align:center; font-weight:700; vertical-align:middle; white-space:nowrap; }
        tbody td { padding:0; vertical-align:middle; text-align:center; }
        .row-inner { display:flex; align-items:center; justify-content:center; gap:12px; padding:12px; background-color: rgba(22,22,22,0.6); border-radius:12px; min-height:36px; }
        .row-inner.index { justify-content:center; width:36px; height:36px; padding:0; }
        .td-name { white-space:nowrap; overflow:hidden; text-overflow:ellipsis; text-align:center; width:100%; }
        .password-cell { justify-content:center; align-items:center; }
        .pw-text { margin-right:8px; }
        .pw-btn { background:transparent; border:none; color:#9fb4c8; cursor:pointer; display:flex; align-items:center; }

        .url-text { color: inherit; display: inline-block; max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; text-align:center; }
        .url-empty { display:inline-block; width:0; height:0; }
        .no-wrap { white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }

        .type-provider-cell { display:flex; flex-direction:column; align-items:center; justify-content:center; gap:6px; }
        .support-badge { background: rgba(255,255,255,0.04); color: #dbeafe; padding: 4px 8px; border-radius: 999px; font-weight: 700; font-size: 12px; display:inline-block; text-align:center; }
        .support-badge.open { background: linear-gradient(90deg,#f97316,#f43f5e); color: #021018; }
        .support-badge.resolved { background: linear-gradient(90deg,#10b981,#06b6d4); color: #021018; }
        .support-badge.in_progress, .support-badge.in_process { background: linear-gradient(90deg,#f59e0b,#f97316); color: #021018; }

        .whatsapp-cell { display:flex; flex-direction:column; align-items:center; gap:6px; min-width:140px; }
        .wa-btn { width:36px; height:36px; display:inline-grid; place-items:center; border-radius:8px; background: linear-gradient(90deg,#25D366,#128C7E); color: #fff; border: none; cursor: pointer; }
        .wa-number { font-size: 0.82rem; color:#cbd5e1; margin-top:2px; word-break:break-all; text-align:center; max-width:140px; }

        .approve-btn {
          width:36px; height:36px; display:inline-grid; place-items:center;
          border-radius:8px; background: linear-gradient(90deg,#10b981,#06b6d4);
          color:#fff; border:none; cursor:pointer;
        }

        .pager-row { display:flex; justify-content:space-between; align-items:center; margin-top:12px; }
        .pager-info { color:#cbd5e1; }
        .pager-controls { display:flex; gap:8px; }
        .pager-btn { padding:8px 12px; border-radius:8px; border:none; background:rgba(255,255,255,0.03); color:#e1e1e1; cursor:pointer; }
        .pager-btn:disabled { opacity:0.4; cursor:not-allowed; }

        .info { padding:28px; text-align:center; color:#cbd5e1; }
        .error { padding:28px; text-align:center; color:#fca5a5; }

        .table-scroll::-webkit-scrollbar { height: 10px; }
        .table-scroll::-webkit-scrollbar-track { background: transparent; }
        .table-scroll::-webkit-scrollbar-thumb { background: linear-gradient(90deg, rgba(139,92,246,0.9), rgba(34,211,238,0.9)); border-radius: 999px; border: 2px solid rgba(2,6,23,0.0); }
        .table-scroll { scrollbar-width: thin; scrollbar-color: rgba(139,92,246,0.9) transparent; }

        @media (max-width: 980px) {
          .page-container { padding: 40px 16px; }
          table.styled-table { min-width: 1100px; }
          .actions-right { gap:8px; }
          .icon-btn { width:60px; height:60px; }
        }
        @media (max-width: 640px) {
          .search-input-inline { font-size: 0.9rem; }
          table.styled-table { min-width: 900px; }
          .actions-right { display:none; }
        }
      `}</style>
    </div>
  )
}