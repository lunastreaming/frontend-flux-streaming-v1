'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/router'
import Footer from '../../components/Footer'
import SupportResolveModal from '../../components/SupportResolveModal'
import ConfirmModal from '../../components/ConfirmModal'
import { FaSearch, FaWhatsapp, FaEdit, FaMoneyBillWave } from 'react-icons/fa'

export default function SupportPage() {
  const router = useRouter()
  const BASE_URL = process.env.NEXT_PUBLIC_API_URL || ''

  const [token, setToken] = useState(undefined)
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const [size] = useState(50)
  const [totalElements, setTotalElements] = useState(0)
  const [totalPages, setTotalPages] = useState(1)

  const controllerRef = useRef(null)
  const requestIdRef = useRef(0)
  const unmountedRef = useRef(false)

  // SupportResolveModal state (opened only on Edit)
  const [resolveOpen, setResolveOpen] = useState(false)
  const [resolveTarget, setResolveTarget] = useState(null)
  const [resolveLoading, setResolveLoading] = useState(false)

  // ConfirmModal state (refund)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmTarget, setConfirmTarget] = useState(null)
  const [confirmAmount, setConfirmAmount] = useState('0.00')
  const [confirmLoading, setConfirmLoading] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const t = localStorage.getItem('accessToken')
    setToken(t ?? null)
  }, [])

  useEffect(() => {
    if (token === null) router.replace('/supplier/login')
  }, [token, router])

  // Fechas en UTC: split en fecha y hora, sin aplicar zona local
  const formatDateSplitUTC = (value) => {
    if (!value) return { dateStr: '', timeStr: '' }
    try {
      const d = new Date(value)
      if (Number.isNaN(d.getTime())) return { dateStr: '', timeStr: '' }
      const locale = 'es-PE'
      const dateStr = d.toLocaleDateString(locale, {
        timeZone: 'UTC',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      })
      const timeStr = d.toLocaleTimeString(locale, {
        timeZone: 'UTC',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      })
      return { dateStr, timeStr }
    } catch {
      return { dateStr: '', timeStr: '' }
    }
  }

  const computeDaysRemaining = (endAt) => {
    if (!endAt) return null
    try {
      const now = new Date()
      const end = new Date(endAt)
      const diffMs = end.getTime() - now.getTime()
      const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
      return days
    } catch {
      return null
    }
  }

  const startFetch = () => {
    if (controllerRef.current) {
      try { controllerRef.current.abort() } catch {}
    }
    const c = new AbortController()
    controllerRef.current = c
    requestIdRef.current += 1
    return { signal: c.signal, localId: requestIdRef.current }
  }

  const fetchSupportForProvider = useCallback(async (p = 0) => {
    setLoading(true)
    setError(null)
    try {
      if (!token) {
        router.replace('/supplier/login')
        return
      }

      const { signal, localId } = startFetch()
      const params = new URLSearchParams()
      params.set('page', String(p))
      params.set('size', String(size))

      const res = await fetch(`${BASE_URL}/api/support/provider/me?${params.toString()}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        signal
      })

      if (!res.ok) {
        if (res.status === 401) {
          router.replace('/supplier/login')
          return
        }
        const txt = await res.text().catch(() => '')
        throw new Error(`Error ${res.status} ${txt}`)
      }

      const payload = await res.json()
      const raw = Array.isArray(payload) ? payload : (Array.isArray(payload?.content) ? payload.content : [])
      const normalized = raw.map((t, idx) => {
        const stock = t.stock ?? t.stockSummary ?? null
        const rowId = t.id ?? stock?.id ?? idx
        return {
          id: rowId,
          ticketId: t.id ?? null,
          issueType: t.issueType ?? t.supportType ?? null,
          ticketStatus: t.status ?? t.supportStatus ?? null,
          ticketCreatedAt: t.createdAt ?? t.supportCreatedAt ?? null,
          ticketUpdatedAt: t.updatedAt ?? t.supportUpdatedAt ?? null,
          ticketResolvedAt: t.resolvedAt ?? t.supportResolvedAt ?? null,
          ticketNote: t.resolutionNote ?? t.supportResolutionNote ?? null,
          productName: stock?.productName ?? stock?.name ?? t.productName ?? '',
          username: stock?.username ?? t.username ?? '',
          password: stock?.password ?? t.password ?? '',
          url: stock?.url ?? t.url ?? null,
          numberProfile: stock?.numeroPerfil ?? stock?.numero_perfil ?? t.numeroPerfil ?? t.numberProfile ?? null,
          clientName: stock?.clientName ?? t.clientName ?? '',
          clientPhone: stock?.clientPhone ?? t.clientPhone ?? t.client_phone ?? '',
          pin: stock?.pin ?? t.pin ?? null,
          startAt: stock?.startAt ?? stock?.soldAt ?? t.startAt ?? null,
          endAt: stock?.endAt ?? stock?.end_at ?? t.endAt ?? null,
          refund: stock?.refund ?? t.refund ?? null,
          vendorName: stock?.providerName ?? t.providerName ?? t.provider_name ?? '',
          vendorPhone: stock?.providerPhone ?? t.providerPhone ?? t.provider_phone ?? '',
          settings: stock?.settings ?? t.settings ?? null,
          daysRemaining: typeof stock?.daysRemaining === 'number' ? stock.daysRemaining : (t.daysRemaining ?? null),
          rawTicket: t,
          rawStock: stock
        }
      })

      if (unmountedRef.current) return
      if (localId !== requestIdRef.current) return

      setItems(normalized)
      if (!Array.isArray(payload) && typeof payload === 'object') {
        setTotalElements(Number(payload.totalElements ?? payload.total ?? normalized.length))
        setTotalPages(Number(payload.totalPages ?? Math.ceil((payload.totalElements ?? normalized.length) / size) ?? 1))
        setPage(Number(payload.page ?? payload.number ?? p))
      } else {
        setTotalElements(normalized.length)
        setTotalPages(1)
        setPage(p)
      }
    } catch (err) {
      if (err.name === 'AbortError') return
      setError(err.message || String(err))
      setItems([])
      setTotalElements(0)
      setTotalPages(1)
    } finally {
      setLoading(false)
    }
  }, [BASE_URL, router, size, token])

  useEffect(() => {
    if (token === undefined) return
    if (token === null) return
    fetchSupportForProvider(page)
    return () => {
      if (controllerRef.current) {
        try { controllerRef.current.abort() } catch {}
      }
    }
  }, [fetchSupportForProvider, page, token])

  useEffect(() => {
    return () => { unmountedRef.current = true }
  }, [])

  const displayed = items.filter(it => {
    const q = (search ?? '').trim().toLowerCase()
    if (!q) return true
    return (
      String(it.ticketId ?? it.id ?? '').toLowerCase().includes(q) ||
      String(it.issueType ?? '').toLowerCase().includes(q) ||
      String(it.productName ?? '').toLowerCase().includes(q) ||
      String(it.username ?? '').toLowerCase().includes(q) ||
      String(it.clientName ?? '').toLowerCase().includes(q) ||
      String(it.vendorName ?? '').toLowerCase().includes(q)
    )
  })

  const openWhatsAppToVendor = (vendorPhone, vendorName, productName) => {
    const raw = String(vendorPhone ?? '').replace(/[^\d+]/g, '')
    const name = vendorName ?? ''
    const product = productName ?? ''
    const message = `Hola ${name} 👋🏻
🫴He generado un pedido *${product}*🫴
✉ Por favor acepte mi solicitud, ¡¡¡Gracias!!!`
    const encoded = encodeURIComponent(message)
    if (!raw) {
      window.open(`https://web.whatsapp.com/send?text=${encoded}`, '_blank')
      return
    }
    const num = raw.startsWith('+') ? raw.slice(1) : raw
    window.open(`https://api.whatsapp.com/send?phone=${num}&text=${encoded}`, '_blank')
  }

  // ---------- Resolve modal (Edit) ----------
  const openResolveModal = (row) => {
    setResolveTarget(row)
    setResolveOpen(true)
  }

  const onResolveSuccess = async () => {
    await fetchSupportForProvider(page)
    setResolveOpen(false)
    setResolveTarget(null)
  }

  const onResolveClose = () => {
    if (resolveLoading) return
    setResolveOpen(false)
    setResolveTarget(null)
  }

  // ---------- Refund flow using ConfirmModal (no full refund endpoint) ----------
  const openConfirmRefund = (row) => {
    setConfirmTarget(row)
    const initial = (row?.refund != null) ? Number(row.refund).toFixed(2) : '0.00'
    setConfirmAmount(initial)
    setConfirmOpen(true)
  }

  const performRefund = async (stockId) => {
    try {
      setConfirmLoading(true)
      const tokenVal = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null
      if (!tokenVal) { router.replace('/supplier/login'); return { ok: false, msg: 'No autorizado' } }

      // Endpoint de reembolso NO FULL
      const res = await fetch(`${BASE_URL}/api/supplier/provider/stocks/${encodeURIComponent(stockId)}/refund`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${tokenVal}`, 'Content-Type': 'application/json' }
      })

      if (res.status === 401) { router.replace('/supplier/login'); return { ok: false, msg: 'No autorizado' } }
      if (!res.ok) {
        const txt = await res.text().catch(() => '')
        return { ok: false, msg: `Error ${res.status} ${txt}` }
      }
      return { ok: true }
    } catch (err) {
      return { ok: false, msg: err.message || String(err) }
    } finally {
      setConfirmLoading(false)
    }
  }

  const onConfirmRefund = async () => {
    if (!confirmTarget) return
    // Tomar stockId desde rawStock.id si existe, sino fallback a id
    const stockId = confirmTarget.rawStock?.id ?? confirmTarget.id
    if (!stockId) {
      alert('No se encontró el stockId para el reembolso.')
      return
    }

    const result = await performRefund(stockId)
    if (!result.ok) {
      alert(result.msg || 'Error al procesar reembolso')
      return
    }

    setConfirmOpen(false)
    setConfirmTarget(null)
    await fetchSupportForProvider(page) // refrescar lista
    alert('Reembolso procesado correctamente.')
  }

  const cancelConfirmRefund = () => {
    if (confirmLoading) return
    setConfirmOpen(false)
    setConfirmTarget(null)
  }

  const handleEdit = (row) => {
    openResolveModal(row)
  }

  return (
    <div className="min-h-screen page-bg text-white font-inter">

      <main className="page-container">
        <div className="header-row">
          <div className="search-bar">
            <FaSearch className="search-icon-inline" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="search-input-inline"
              placeholder="Buscar id, producto, username, cliente, vendedor..."
            />
          </div>

          <div style={{ width: 40 }} />
        </div>

        <div className="table-wrapper">
          {loading ? (
            <div className="info">Cargando tickets de soporte…</div>
          ) : error ? (
            <div className="error">Error: {error}</div>
          ) : displayed.length === 0 ? (
            <div className="info">No hay tickets para mostrar</div>
          ) : (
            <div className="table-scroll">
              <table className="styled-table" role="table" aria-label="Soporte proveedor">
                <colgroup>
                  <col style={{ width: '40px' }} />
                  <col style={{ width: '120px' }} />
                  <col style={{ width: '260px' }} />
                  <col style={{ width: '160px' }} />
                  <col style={{ width: '140px' }} />
                  <col style={{ width: '220px' }} />
                  <col style={{ width: '120px' }} />
                  <col style={{ width: '160px' }} />
                  <col style={{ width: '100px' }} />
                  <col style={{ width: '160px' }} />
                  <col style={{ width: '160px' }} />
                  <col style={{ width: '120px' }} />
                  <col style={{ width: '160px' }} />
                  <col style={{ width: '140px' }} />
                  <col style={{ width: '160px' }} />
                  <col style={{ width: '120px' }} />
                </colgroup>

                <thead>
                  <tr>
                    <th>#</th>
                    <th>Id</th>
                    <th>NOMBRE DEL PRODUCTO</th>
                    <th>USERNAME</th>
                    <th>PASSWORD</th>
                    <th>URL</th>
                    <th>N° PERFIL</th>
                    <th>NOMBRE DEL CLIENTE</th>
                    <th>PIN</th>
                    <th>INICIO</th>
                    <th>FIN</th>
                    <th>REEMBOLSO</th>
                    <th>VENDEDOR</th>
                    <th>TIPO DE SOPORTE</th>
                    <th>FECHA DE CREACION SOPORTE</th>
                    <th>DÍAS RESTANTES</th>
                    <th>CONFIGURACIONES</th>
                  </tr>
                </thead>

                <tbody>
                  {displayed.map((r, i) => {
                    const days = (typeof r.daysRemaining === 'number' && Number.isFinite(r.daysRemaining))
                      ? r.daysRemaining
                      : computeDaysRemaining(r.endAt)

                    const startSplit = formatDateSplitUTC(r.startAt)
                    const endSplit = formatDateSplitUTC(r.endAt)
                    const createdSplit = formatDateSplitUTC(r.ticketCreatedAt)

                    return (
                      <tr key={r.id ?? i}>
                        <td><div className="row-inner index centered">{i + 1}</div></td>
                        <td><div className="row-inner id-cell centered">{r.ticketId ?? r.id ?? ''}</div></td>
                        <td><div className="row-inner td-name centered" title={r.productName}>{r.productName ?? ''}</div></td>
                        <td><div className="row-inner centered mono">{r.username ?? ''}</div></td>
                        <td><div className="row-inner centered mono">{r.password ?? ''}</div></td>

                        {/* URL as plain text, empty when null */}
                        <td>
                          <div className="row-inner centered url-cell">
                            {r.url ?? ''}
                          </div>
                        </td>

                        <td><div className="row-inner centered">{r.numberProfile ?? ''}</div></td>
                        <td><div className="row-inner centered">{r.clientName ?? ''}</div></td>
                        <td><div className="row-inner centered">{r.pin ?? ''}</div></td>

                        {/* INICIO */}
                        <td>
                          <div className="row-inner centered no-wrap">
                            <div className="date-cell">
                              <div className="date-line">{startSplit.dateStr}</div>
                              <div className="time-line mono">{startSplit.timeStr}</div>
                            </div>
                          </div>
                        </td>

                        {/* FIN */}
                        <td>
                          <div className="row-inner centered no-wrap">
                            <div className="date-cell">
                              <div className="date-line">{endSplit.dateStr}</div>
                              <div className="time-line mono">{endSplit.timeStr}</div>
                            </div>
                          </div>
                        </td>

                        <td><div className="row-inner centered">{r.refund != null ? `$${Number(r.refund).toFixed(2)}` : ''}</div></td>

                        <td>
                          <div className="row-inner centered" style={{ gap: 8 }}>
                            <div>{r.vendorName ?? ''}</div>
                            <button
                              className="wa-btn"
                              title={`WhatsApp vendedor ${r.vendorPhone ?? ''}`}
                              onClick={() => openWhatsAppToVendor(r.vendorPhone, r.vendorName, r.productName)}
                              aria-label={`WhatsApp vendedor ${r.vendorPhone ?? ''}`}
                            >
                              <FaWhatsapp />
                            </button>
                          </div>
                        </td>

                        <td><div className="row-inner centered">{r.issueType ?? ''}</div></td>

                        {/* FECHA DE CREACION SOPORTE */}
                        <td>
                          <div className="row-inner centered no-wrap">
                            <div className="date-cell">
                              <div className="date-line">{createdSplit.dateStr}</div>
                              <div className="time-line mono">{createdSplit.timeStr}</div>
                            </div>
                          </div>
                        </td>

                        <td>
                          <div className="row-inner centered">
                            {days == null ? '' : (
                              <span className={`days-pill ${days > 0 ? 'positive' : (days === 0 ? 'today' : 'expired')}`}>
                                {days}d
                              </span>
                            )}
                          </div>
                        </td>

                        <td>
                          <div className="row-inner centered" style={{ gap: 8 }}>
                            <button
                              className="icon-action refund"
                              onClick={() => openConfirmRefund(r)}
                              title="Reembolso"
                              aria-label="Reembolso"
                            >
                              <FaMoneyBillWave />
                            </button>

                            <button
                              className="icon-action edit"
                              onClick={() => openResolveModal(r)}
                              title="Editar / Resolver"
                              aria-label="Editar"
                            >
                              <FaEdit />
                            </button>
                          </div>
                        </td>
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
            <button onClick={() => setPage(p => Math.max(0, p - 1))} className="pager-btn" disabled={page <= 0}>Anterior</button>
            <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} className="pager-btn" disabled={page >= totalPages - 1}>Siguiente</button>
          </div>
        </div>
      </main>

      <Footer />

      {/* Resolve modal (opened only from Edit) */}
      <SupportResolveModal
        visible={resolveOpen}
        onClose={onResolveClose}
        onSuccess={onResolveSuccess}
        initialData={resolveTarget}
        BASE_URL={BASE_URL}
      />

      {/* ConfirmModal for refunds (no full endpoint) */}
      <ConfirmModal
        open={confirmOpen}
        title="Confirmar reembolso"
        description={
          confirmTarget
            ? `¿Deseas reembolsar el monto ${confirmAmount} para el producto ${confirmTarget.productName ?? ''}?`
            : '¿Deseas continuar?'
        }
        confirmLabel="PROCESAR REEMBOLSO"
        cancelLabel="Cancelar"
        onConfirm={onConfirmRefund}
        onCancel={cancelConfirmRefund}
        loading={confirmLoading}
      />

      <style jsx>{`
        .page-bg { background: radial-gradient(circle at top, #0b1220, #05060a); min-height:100vh; }
        .page-container { padding: 36px 20px; max-width: 1400px; margin:0 auto; }
        .header-row { display:flex; justify-content:space-between; align-items:center; gap:12px; margin-bottom:16px; }
        .search-bar { display:flex; align-items:center; background: rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.06); border-radius:10px; padding:0 12px; height:40px; max-width:720px; width:100%; }
        .search-icon-inline { color:#9fb4c8; margin-right:8px; }
        .search-input-inline { flex:1; background:transparent; border:none; color:#fff; outline:none; font-size:0.95rem; text-align:center; }

        .table-wrapper { overflow:hidden; background: rgba(22,22,22,0.6); border:1px solid rgba(255,255,255,0.06); backdrop-filter: blur(12px); border-radius:12px; padding:12px; box-shadow: 0 12px 24px rgba(0,0,0,0.4); }
        .table-scroll { overflow:auto; border-radius:8px; }

        table.styled-table { width:100%; border-collapse:separate; border-spacing:0 12px; color:#e1e1e1; min-width:1400px; }
        thead tr { background: rgba(30,30,30,0.8); text-transform:uppercase; letter-spacing:0.06em; color:#cfcfcf; font-size:0.72rem; }
        thead th { padding:10px; text-align:center; font-weight:700; vertical-align:middle; white-space:nowrap; }

        tbody td { padding:0; vertical-align:middle; text-align:center; }
        .row-inner { display:flex; align-items:center; justify-content:center; gap:12px; padding:12px; background-color: rgba(22,22,22,0.6); border-radius:12px; min-height:36px; }
        .row-inner.index { justify-content:center; width:36px; height:36px; padding:0; }
        .td-name { white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:420px; text-align:center; }
        .id-cell { font-weight:700; color:#cfe8ff; text-align:center; }

        .mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, "Roboto Mono", monospace; }

        .url-cell {
          color: #cbd5e1;
          max-width: 220px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: 0.92rem;
          text-align: center;
          user-select: text;
        }

        .wa-btn { width:36px; height:36px; display:inline-grid; place-items:center; border-radius:8px; background: linear-gradient(90deg,#25D366,#128C7E); color: #fff; border: none; cursor: pointer; }

        .days-pill { padding:6px 10px; border-radius:999px; font-weight:700; font-size:0.85rem; color:#07101a; display:inline-block; }
        .days-pill.positive { background: linear-gradient(90deg,#bbf7d0,#34d399); color:#04261a; }
        .days-pill.today { background: linear-gradient(90deg,#fef3c7,#f59e0b); color:#3a2700; }
        .days-pill.expired { background: linear-gradient(90deg,#fecaca,#fb7185); color:#2b0404; }

        .date-cell { display:inline-flex; flex-direction:column; align-items:center; gap:2px; }
        .date-line { display:block; white-space:nowrap; font-weight:600; color:#e6eef7; font-size:0.95rem; }
        .time-line { display:block; white-space:nowrap; font-size:0.85rem; color:#9fb4c8; }

        .icon-action {
          width:36px;
          height:36px;
          display:inline-grid;
          place-items:center;
          border-radius:8px;
          border:none;
          cursor:pointer;
          color: #021018;
          background: rgba(255,255,255,0.9);
        }
        .icon-action.refund { background: linear-gradient(90deg,#fef3c7,#f59e0b); }
        .icon-action.edit { background: linear-gradient(90deg,#bbf7d0,#34d399); }

        .pager-row { display:flex; justify-content:space-between; align-items:center; margin-top:12px; }
        .pager-info { color:#cbd5e1; }
        .pager-controls { display:flex; gap:8px; }
        .pager-btn { padding:8px 12px; border-radius:8px; border:none; background:rgba(255,255,255,0.03); color:#e1e1e1; cursor:pointer; }
        .pager-btn:disabled { opacity:0.45; cursor:not-allowed; }

        .info { padding:28px; text-align:center; color:#cbd5e1; }
        .error { padding:28px; text-align:center; color:#fca5a5; }

        .table-scroll::-webkit-scrollbar { height: 12px; }
        .table-scroll::-webkit-scrollbar-track { background: transparent; }
        .table-scroll::-webkit-scrollbar-thumb { background: linear-gradient(90deg, rgba(139,92,246,0.9), rgba(34,211,238,0.9)); border-radius: 999px; border: 2px solid rgba(2,6,23,0.0); }
        .table-scroll { scrollbar-width: thin; scrollbar-color: rgba(139,92,246,0.9) transparent; }

        @media (max-width: 1200px) {
          .page-container { padding: 24px 12px; }
          table.styled-table { min-width: 1100px; }
        }
        @media (max-width: 700px) {
          table.styled-table { min-width: 900px; }
          .page-container { padding: 18px 10px; }
        }
      `}</style>
    </div>
  )
}