// pages/admin/solds.js
'use client'

import React, { useCallback, useEffect, useState } from 'react'
import AdminNavBar from '../../components/AdminNavBar'
import Footer from '../../components/Footer'
import ConfirmModal from '../../components/ConfirmModal'
import { FaSearch, FaMoneyBillWave } from 'react-icons/fa'

export default function AdminSoldsPage() {
  const [items, setItems] = useState([])
  const [page, setPage] = useState(0)
  const [size] = useState(20)
  const [totalPages, setTotalPages] = useState(1)
  const [totalElements, setTotalElements] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [banner, setBanner] = useState(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [selectedRow, setSelectedRow] = useState(null)
  const [processingRefund, setProcessingRefund] = useState(false)
  const BASE_URL = process.env.NEXT_PUBLIC_API_URL || ''

  // fetchPage definido con useCallback para poder invocarlo desde otros handlers
  const fetchPage = useCallback(async (p = 0) => {
    setLoading(true)
    setError(null)
    setBanner(null)
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null
      if (!token) throw new Error('No token')

      const url = `${BASE_URL}/api/admin/users/stocks/sold?page=${p}&size=${size}`
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      if (!res.ok) {
        const txt = await res.text().catch(() => '')
        throw new Error(`Error ${res.status} ${txt}`)
      }

      const payload = await res.json()
      const content = Array.isArray(payload?.content) ? payload.content : Array.isArray(payload) ? payload : []
      setItems(content)
      setPage(Number(payload?.page ?? payload?.number ?? p))
      setTotalElements(Number(payload?.totalElements ?? payload?.total ?? content.length))
      setTotalPages(
        Number(
          payload?.totalPages ??
            (Math.ceil((payload?.totalElements ?? content.length) / size) || 1)
        )
      )
    } catch (err) {
      setError(err.message || String(err))
      setItems([])
      setTotalElements(0)
      setTotalPages(1)
    } finally {
      setLoading(false)
    }
  }, [BASE_URL, size])

  useEffect(() => {
    let mounted = true
    // Llamamos a fetchPage y protegemos mounted para evitar setState en componente desmontado
    const run = async () => {
      if (!mounted) return
      await fetchPage(page)
    }
    run()
    return () => { mounted = false }
  }, [page, fetchPage])

  // Búsqueda sobre los campos relevantes que devuelve el backend
  const displayed = items.filter(it => {
    const hay = (
      (String(it.id) ?? '') + ' ' +
      (it.productName ?? '') + ' ' +
      (it.username ?? '') + ' ' +
      (it.password ?? '') + ' ' +
      (String(it.numeroPerfil ?? '') ) + ' ' +
      (it.clientName ?? '') + ' ' +
      (it.buyerUsername ?? '') + ' ' +
      (String(it.startAt ?? '')) + ' ' +
      (String(it.endAt ?? '')) + ' ' +
      (String(it.daysRemaining ?? '')) + ' ' +
      (it.status ?? '') + ' ' +
      (String(it.refund ?? ''))
    ).toLowerCase()
    return hay.includes(search.toLowerCase())
  })

  const formatDate = (v) => {
    if (!v) return '—'
    try {
      return new Date(v).toLocaleString()
    } catch {
      return String(v)
    }
  }

  const formatAmount = (v, curr = 'PEN') =>
    v == null ? '—' : new Intl.NumberFormat('en-US', { style: 'currency', currency: curr }).format(Number(v))

  const stateClass = (s) => {
    const st = String(s ?? '').toLowerCase()
    if (st === 'sold' || st === 'approved' || st === 'complete' || st === 'success') return 'tx-badge approved'
    if (st === 'pending' || st === 'waiting') return 'tx-badge pending'
    if (st === 'rejected' || st === 'failed' || st === 'cancelled') return 'tx-badge rejected'
    if (st === 'refund' || st === 'refunded' || st === 'refund_pending') return 'tx-badge neutral'
    return 'tx-badge neutral'
  }

  // Determina si el botón de reembolso debe estar habilitado
  const isRefundEnabled = (row) => {
    const days = Number(row?.daysRemaining ?? 0)
    const refundAmount = row?.refund == null ? 0 : Number(row.refund)
    // además evitar reembolsar si ya está en estado REFUND
    const status = String(row?.status ?? '').toLowerCase()
    const alreadyRefunded = status === 'refund' || status === 'refunded' || status === 'refund_pending'
    return days > 0 && refundAmount > 0 && !alreadyRefunded
  }

  // Abrir modal de confirmación para la fila seleccionada
  const openConfirmForRow = (row) => {
    setSelectedRow(row)
    setConfirmOpen(true)
  }

  // Ejecuta el reembolso llamando al servicio backend
  const executeRefund = async () => {
    if (!selectedRow) return
    setProcessingRefund(true)
    setBanner(null)
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null
      if (!token) throw new Error('No token')

      const stockId = selectedRow.id
      const buyerId = selectedRow.buyerId ?? selectedRow.buyerIdString ?? selectedRow.buyerId ?? selectedRow.buyerId
      const url = `${BASE_URL}/api/admin/users/stocks/${encodeURIComponent(stockId)}/refund`
      const body = buyerId ? { buyerId } : {}

      const res = await fetch(url, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: Object.keys(body).length ? JSON.stringify(body) : null
      })

      if (!res.ok) {
        const txt = await res.text().catch(() => '')
        throw new Error(`Error ${res.status} ${txt}`)
      }

      const payload = await res.json().catch(() => null)
      const refundedAmount = payload?.refundAmount ?? selectedRow.refund ?? null
      const amountText = refundedAmount != null ? Number(refundedAmount).toFixed(2) : '—'

      // Mostrar banner detallado
      setBanner({ type: 'success', message: `Reembolso aplicado. Stock ID: ${stockId}. Monto: ${amountText} PEN.` })

      // REFRESH: llamar directamente a fetchPage para actualizar la tabla inmediatamente
      await fetchPage(page)

      // alternativa: si quieres una actualización optimista en lugar de refetch completo,
      // puedes actualizar items localmente (descomentarlo si prefieres):
      // setItems(prev => prev.map(it => it.id === stockId ? { ...it, status: 'REFUND', refund: refundedAmount } : it))

    } catch (err) {
      setBanner({ type: 'error', message: 'No se pudo ejecutar el reembolso: ' + (err.message || err) })
    } finally {
      setProcessingRefund(false)
      setConfirmOpen(false)
      setSelectedRow(null)
    }
  }

  // Handler para cancelar modal
  const cancelRefund = () => {
    setConfirmOpen(false)
    setSelectedRow(null)
  }

  return (
    <div className="min-h-screen page-bg text-white font-inter">
      <AdminNavBar />

      <main className="page-container">
        <div className="header-row">
          <div className="search-bar">
            <FaSearch className="search-icon-inline" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="search-input-inline"
              placeholder="Buscar por Id, producto, usuario, cliente, estado..."
              aria-label="Buscar"
            />
          </div>

          {/* El icono de refrescar fue removido según lo solicitado */}
          <div className="header-actions" aria-hidden="true" />
        </div>

        {banner && (
          <div className={`inline-banner ${banner.type}`}>
            <span className="inline-banner-text">{banner.message}</span>
            <button className="inline-banner-close" onClick={() => setBanner(null)} aria-label="Cerrar aviso">✕</button>
          </div>
        )}

        <div className="table-wrapper">
          {loading ? <div className="info">Cargando registros…</div> :
            error ? <div className="error">Error: {error}</div> :
              <div className="table-scroll">
                <table className="styled-table" role="table" aria-label="Stocks vendidos">
                  <colgroup>
                    <col style={{ width: '40px' }} />
                    <col style={{ width: '120px' }} />
                    <col style={{ width: '260px' }} />
                    <col style={{ width: '160px' }} />
                    <col style={{ width: '160px' }} />
                    <col style={{ width: '120px' }} />
                    <col style={{ width: '180px' }} />
                    <col style={{ width: '160px' }} />
                    <col style={{ width: '160px' }} />
                    <col style={{ width: '160px' }} />
                    <col style={{ width: '120px' }} />
                    <col style={{ width: '120px' }} />
                    <col />
                  </colgroup>

                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Stock ID</th>
                      <th>Producto</th>
                      <th>USUARIO</th>
                      <th>CONTRASEÑA</th>
                      <th>PERFIL</th>
                      <th>CLIENTE</th>
                      <th>Comprador</th>
                      <th>Fecha inicio</th>
                      <th>Fecha fin</th>
                      <th>Días restantes</th>
                      <th>Estado</th>
                      <th>Reembolso</th>
                      <th>Setting</th>
                    </tr>
                  </thead>

                  <tbody>
                    {displayed.map((r, i) => {
                      const refundEnabled = isRefundEnabled(r)
                      return (
                        <tr key={r.id ?? i}>
                          <td><div className="row-inner index">{i + 1}</div></td>

                          <td><div className="row-inner">{r.id ?? '—'}</div></td>

                          <td>
                            <div className="row-inner td-name" title={r.productName ?? ''}>
                              {r.productName ?? '—'}
                            </div>
                          </td>

                          <td><div className="row-inner">{r.username ?? '—'}</div></td>
                          <td><div className="row-inner monospace">{r.password ?? '—'}</div></td>
                          <td><div className="row-inner">{r.numeroPerfil ?? '—'}</div></td>
                          <td><div className="row-inner">{r.clientName ?? r.clientPhone ?? '—'}</div></td>
                          <td><div className="row-inner">{r.buyerUsername ?? r.buyerId ?? '—'}</div></td>
                          <td><div className="row-inner no-wrap">{formatDate(r.startAt)}</div></td>
                          <td><div className="row-inner no-wrap">{formatDate(r.endAt)}</div></td>
                          <td><div className="row-inner">{r.daysRemaining ?? '—'}</div></td>

                          <td>
                            <div className="row-inner">
                              <span className={stateClass(r.status)}>{(r.status ?? '—').toString().toUpperCase()}</span>
                            </div>
                          </td>

                          <td><div className="row-inner">{r.refund == null ? '—' : Number(r.refund).toFixed(2)}</div></td>

                          <td>
                            <div className="row-inner">
                              <button
                                className="btn-disburse"
                                onClick={() => openConfirmForRow(r)}
                                aria-label={refundEnabled ? "Desembolsar" : "Reembolso no disponible"}
                                title={refundEnabled ? "Desembolsar" : "Reembolso no disponible"}
                                disabled={!refundEnabled || processingRefund}
                                style={{ opacity: (!refundEnabled || processingRefund) ? 0.45 : 1, cursor: (!refundEnabled || processingRefund) ? 'not-allowed' : 'pointer' }}
                              >
                                <FaMoneyBillWave />
                                <span className="sr-only">Desembolsar</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
          }
        </div>

        <div className="pager-row">
          <div className="pager-info">Mostrando {displayed.length} de {totalElements}</div>
          <div className="pager-controls">
            <button onClick={() => setPage(p => Math.max(0, p - 1))} className="pager-btn" disabled={page <= 0}>Anterior</button>
            <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} className="pager-btn" disabled={page >= totalPages - 1}>Siguiente</button>
          </div>
        </div>
      </main>

      <Footer />

      {/* ConfirmModal: se abre antes de ejecutar el reembolso */}
      <ConfirmModal
        open={confirmOpen}
        title="Confirmar reembolso"
        description={
          selectedRow
            ? `Vas a desembolsar ${selectedRow.refund == null ? '0.00' : Number(selectedRow.refund).toFixed(2)} PEN para el Stock ID ${selectedRow.id}. ¿Deseas continuar?`
            : '¿Deseas continuar?'
        }
        confirmLabel="DESEMBOLSAR"
        cancelLabel="Cancelar"
        onConfirm={executeRefund}
        onCancel={cancelRefund}
        loading={processingRefund}
      />

      <style jsx>{`
        .page-bg { background: radial-gradient(circle at top, #0b1220, #05060a); min-height:100vh; }
        .page-container { padding: 48px 20px; max-width:1200px; margin:0 auto; }

        .header-row { display:flex; justify-content:space-between; align-items:center; gap:12px; margin-bottom:16px; }
        .search-bar { display:flex; align-items:center; background: rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.06); border-radius:10px; padding:0 12px; height:38px; max-width:520px; width:100%; }
        .search-icon-inline { color:#9fb4c8; margin-right:8px; }
        .search-input-inline { flex:1; background:transparent; border:none; color:#fff; outline:none; font-size:0.95rem; }

        .header-actions { display:flex; gap:8px; align-items:center; }

        .inline-banner { display:flex; align-items:center; justify-content:space-between; gap:12px; padding:10px 12px; border-radius:10px; margin: 12px 0; border:1px solid rgba(255,255,255,0.06); }
        .inline-banner.success { background: linear-gradient(90deg, rgba(34,197,94,0.08), rgba(34,197,94,0.06)); color:#86efac; }
        .inline-banner.error { background: linear-gradient(90deg, rgba(239,68,68,0.08), rgba(239,68,68,0.06)); color:#fca5a5; }
        .inline-banner-text { font-weight:700; }
        .inline-banner-close { background:transparent; border:none; color:#9fb4c8; cursor:pointer; font-size:16px; }

        .table-wrapper { overflow:hidden; background: rgba(22,22,22,0.6); border:1px solid rgba(255,255,255,0.06); backdrop-filter: blur(12px); border-radius:12px; padding:12px; box-shadow: 0 12px 24px rgba(0,0,0,0.4); }
        .table-scroll { overflow:auto; border-radius:8px; }

        table.styled-table { width:100%; border-collapse:separate; border-spacing:0 12px; color:#e1e1e1; min-width:1200px; }
        thead tr { background: rgba(30,30,30,0.8); text-transform:uppercase; letter-spacing:0.06em; color:#cfcfcf; font-size:0.72rem; }
        thead th { padding:10px; text-align:left; font-weight:700; vertical-align:middle; white-space:nowrap; }

        tbody td { padding:0; vertical-align:middle; }
        .row-inner { display:flex; align-items:center; gap:12px; padding:12px; background-color: rgba(22,22,22,0.6); border-radius:12px; min-height:36px; }
        .row-inner.index { justify-content:center; width:36px; height:36px; padding:0; }
        .td-name { white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:260px; }
        .no-wrap { white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .monospace { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace; }

        .pager-row { display:flex; justify-content:space-between; align-items:center; margin-top:12px; }
        .pager-info { color:#cbd5e1; }
        .pager-controls { display:flex; gap:8px; }
        .pager-btn { padding:8px 12px; border-radius:8px; border:none; background:rgba(255,255,255,0.03); color:#e1e1e1; cursor:pointer; }
        .pager-btn:disabled { opacity:0.45; cursor:not-allowed; }

        .info { padding:28px; text-align:center; color:#cbd5e1; }
        .error { padding:28px; text-align:center; color:#fca5a5; }

        /* State badges */
        .tx-badge { padding:6px 10px; border-radius:999px; font-weight:700; font-size:0.72rem; text-transform:uppercase; color:#07101a; }
        .tx-badge.approved { background: linear-gradient(90deg,#bbf7d0,#34d399); color:#04261a; }
        .tx-badge.pending { background: linear-gradient(90deg,#fef3c7,#f59e0b); color:#3a2700; }
        .tx-badge.rejected { background: linear-gradient(90deg,#fecaca,#fb7185); color:#2b0404; }
        .tx-badge.neutral { background: rgba(255,255,255,0.04); color:#cfcfcf; }

        /* Botón de acción (icono) */
        .btn-disburse {
          display: inline-grid;
          place-items: center;
          width: 40px;
          height: 40px;
          padding: 0;
          border-radius: 10px;
          background: linear-gradient(90deg,#06b6d4,#10b981);
          color: #021018;
          border: none;
          cursor: pointer;
          font-weight: 800;
          font-size: 16px;
          line-height: 1;
          transition: transform .12s ease, box-shadow .12s ease, opacity .12s ease;
          box-shadow: 0 6px 18px rgba(6,27,48,0.35);
          -webkit-tap-highlight-color: transparent;
        }
        .btn-disburse svg { width: 18px; height: 18px; display: block; pointer-events: none; color: inherit; }
        .btn-disburse:hover { transform: translateY(-2px); box-shadow: 0 10px 26px rgba(6,27,48,0.45); }
        .btn-disburse:active { transform: translateY(0); box-shadow: 0 6px 18px rgba(6,27,48,0.35); }
        .btn-disburse:focus { outline: 3px solid rgba(147,197,253,0.18); outline-offset: 3px; }
        .btn-disburse:disabled, .btn-disburse[aria-disabled="true"] { opacity: 0.55; cursor: not-allowed; transform: none; box-shadow: none; }
        .row-inner .btn-disburse { margin: 0; }

        .sr-only {
          position: absolute !important;
          width: 1px !important;
          height: 1px !important;
          padding: 0 !important;
          margin: -1px !important;
          overflow: hidden !important;
          clip: rect(0, 0, 0, 0) !important;
          white-space: nowrap !important;
          border: 0 !important;
        }

        .table-scroll::-webkit-scrollbar { height:10px; }
        .table-scroll::-webkit-scrollbar-track { background: transparent; }
        .table-scroll::-webkit-scrollbar-thumb {
          background: linear-gradient(90deg, rgba(139,92,246,0.9), rgba(34,211,238,0.9));
          border-radius:999px;
          border:2px solid rgba(2,6,23,0.0);
        }
        .table-scroll { scrollbar-width: thin; scrollbar-color: rgba(139,92,246,0.9) transparent; }

        @media (max-width: 980px) {
          .page-container { padding: 32px 12px; }
          table.styled-table { min-width:1000px; }
        }
        @media (max-width: 640px) {
          .search-input-inline { font-size: 0.9rem; }
          table.styled-table { min-width:800px; }
        }
      `}</style>
    </div>
  )
}