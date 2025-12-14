// pages/supplier/renewal.js
'use client'

import React, { useEffect, useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/router'
import Footer from '../../components/Footer'
import { FaSearch, FaEye, FaEyeSlash, FaUndo, FaCheck } from 'react-icons/fa'
import ConfirmModal from '../../components/ConfirmModal'

export default function RenewalPage() {
  const router = useRouter()

  // Estado principal
  const [token, setToken] = useState(undefined)
  const [items, setItems] = useState([])
  const [page, setPage] = useState(0)
  const [size] = useState(20)
  const [totalPages, setTotalPages] = useState(1)
  const [totalElements, setTotalElements] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [visiblePasswords, setVisiblePasswords] = useState(() => new Set())

  // ConfirmModal
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [selectedStock, setSelectedStock] = useState(null)
  const [confirmMode, setConfirmMode] = useState(null) // 'accept' | 'refund'

  const BASE_URL = process.env.NEXT_PUBLIC_API_URL || ''
  const scrollRef = useRef(null)

  // Leer token
  useEffect(() => {
    if (typeof window === 'undefined') return
    const t = localStorage.getItem('accessToken')
    setToken(t || null)
  }, [])

  // Redirigir si no hay sesión
  useEffect(() => {
    if (token === null) router.replace('/supplier/login')
  }, [token, router])

  // Fetch de página
  const fetchPage = useCallback(async (p = page) => {
    if (!token) return
    setLoading(true)
    setError(null)
    try {
      const url = `${BASE_URL}/api/supplier/sales/provider/renewed?page=${p}&size=${size}`
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' }
      })

      if (res.status === 401) {
        router.replace('/supplier/login')
        return
      }
      if (!res.ok) {
        const txt = await res.text().catch(() => '')
        throw new Error(`Error ${res.status} ${txt}`)
      }

      const payload = await res.json()
      const content = Array.isArray(payload?.content)
        ? payload.content
        : (Array.isArray(payload) ? payload : [])

      setItems(content)
      setPage(Number(payload?.number ?? p))
      setTotalElements(Number(payload?.totalElements ?? payload?.total ?? content.length))
      const totalPagesCalc = Math.ceil((payload?.totalElements ?? content.length) / size) || 1
      setTotalPages(Number(payload?.totalPages ?? totalPagesCalc))
    } catch (err) {
      setError(err.message || String(err))
      setItems([])
      setTotalElements(0)
      setTotalPages(1)
    } finally {
      setLoading(false)
    }
  }, [BASE_URL, page, size, token, router])

  useEffect(() => {
    if (token === undefined || token === null) return
    fetchPage(page)
  }, [page, token, fetchPage])

  // Helpers UI
  const togglePasswordVisibility = (id) => {
    setVisiblePasswords(prev => {
      const copy = new Set(prev)
      if (copy.has(id)) copy.delete(id)
      else copy.add(id)
      return copy
    })
  }

  const formatDateUTC = (value) => {
    if (!value) return ''
    try {
      const d = new Date(value)
      if (Number.isNaN(d.getTime())) return ''
      return d.toLocaleString('es-PE', {
        timeZone: 'UTC',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      })
    } catch { return '' }
  }

  const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone
  const formatDateLocal = (v) => {
  if (!v) return ''
  try {
    const d = new Date(v)
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

  const formatAmount = (v) => {
    if (v == null) return ''
    try {
      return Number(v).toLocaleString(undefined, { style: 'currency', currency: 'USD', minimumFractionDigits: 2 })
    } catch {
      return String(v ?? '')
    }
  }

  // Filtro de búsqueda
  const displayed = items.filter(it => {
    const q = search.trim().toLowerCase()
    if (!q) return true
    return (
      String(it.id ?? '').toLowerCase().includes(q) ||
      String(it.productName ?? '').toLowerCase().includes(q) ||
      String(it.username ?? '').toLowerCase().includes(q) ||
      String(it.clientName ?? '').toLowerCase().includes(q) ||
      String(it.buyerUsername ?? '').toLowerCase().includes(q)
    )
  })

  // Abrir modal
  const handleAcceptClick = (row) => {
    setSelectedStock(row)
    setConfirmMode('accept')
    setConfirmOpen(true)
  }
  const handleRefundClick = (row) => {
    setSelectedStock(row)
    setConfirmMode('refund')
    setConfirmOpen(true)
  }

  // Confirmar operación
  const handleConfirm = async () => {
    if (!selectedStock) return
    try {
      if (confirmMode === 'accept') {
        const res = await fetch(`${BASE_URL}/api/supplier/${selectedStock.id}/renewal/approve`, {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${token}` }
        })
        if (res.status === 204) {
          await fetchPage(page)
        } else if (res.status === 401) {
          router.replace('/supplier/login')
        } else {
          const txt = await res.text().catch(() => '')
          alert(`Error al aprobar la renovación: ${res.status} ${txt}`)
        }
      } else if (confirmMode === 'refund') {
        const res = await fetch(`${BASE_URL}/api/supplier/provider/stocks/${selectedStock.id}/refund`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ buyerId: selectedStock.buyerId })
        })
        if (res.ok) {
          const data = await res.json()
          // El backend devuelve refundAmount; lo guardamos para mostrarlo inmediato en el modal
          setSelectedStock(prev => ({ ...prev, refund: data.refundAmount }))
          await fetchPage(page)
        } else if (res.status === 401) {
          router.replace('/supplier/login')
        } else {
          const txt = await res.text().catch(() => '')
          alert(`Error al reembolsar: ${res.status} ${txt}`)
        }
      }
    } catch (err) {
      console.error(err)
      alert('Error de red en la operación')
    } finally {
      setConfirmOpen(false)
      setSelectedStock(null)
      setConfirmMode(null)
    }
  }

  // Render principal
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
              placeholder="Buscar id, producto, username, cliente..."
            />
          </div>
        </div>

        <div className="table-wrapper">
          {loading ? (
            <div className="info">Cargando renovaciones…</div>
          ) : error ? (
            <div className="error">Error: {error}</div>
          ) : (
            <div className="table-scroll" ref={scrollRef}>
              <table className="styled-table" role="table" aria-label="Stocks renovados">
                <colgroup>
                  <col style={{ width: '60px' }} />
                  <col style={{ width: '140px' }} />
                  <col style={{ width: '240px' }} />
                  <col style={{ width: '180px' }} />
                  <col style={{ width: '200px' }} />
                  <col style={{ width: '200px' }} />
                  <col style={{ width: '180px' }} />
                  <col style={{ width: '160px' }} />
                  <col style={{ width: '120px' }} />
                  <col style={{ width: '140px' }} />
                  <col style={{ width: '140px' }} />
                  <col style={{ width: '160px' }} />
                  <col style={{ width: '160px' }} />
                  <col style={{ width: '160px' }} />
                  <col style={{ width: '200px' }} />
                </colgroup>

                <thead>
                  <tr>
                    <th>#</th>
                    <th>Id</th>
                    <th>Producto</th>
                    <th>Username</th>
                    <th>Password</th>
                    <th>URL</th>
                    <th>Cliente</th>
                    <th>Celular cliente</th>
                    <th>Pin</th>
                    <th>Inicio</th>
                    <th>Fin</th>
                    <th>Proveedor</th>
                    <th>Celular proveedor</th>
                    <th>Días restantes</th>
                    <th>Configuraciones</th>
                  </tr>
                </thead>

                <tbody>
                  {displayed.map((r, i) => {
                    const isVisible = visiblePasswords.has(r.id)
                    const masked = r.password ? '••••••••' : ''
                    const daysBadgeClass =
                      r.daysRemaining < 0
                        ? 'badge negative'
                        : r.daysRemaining > 0
                        ? 'badge positive'
                        : 'badge neutral'

                    return (
                      <tr key={r.id ?? i}>
                        <td><div className="row-inner">{i + 1}</div></td>
                        <td><div className="row-inner id-cell">{r.id ?? ''}</div></td>
                        <td><div className="row-inner td-name" title={r.productName ?? ''}>{r.productName ?? ''}</div></td>
                        <td><div className="row-inner">{r.username ?? ''}</div></td>
                        <td>
                          <div className="row-inner password-cell">
                            <div className="pw-text">{isVisible ? (r.password ?? '') : masked}</div>
                            {r.password && (
                              <button
                                onClick={() => togglePasswordVisibility(r.id)}
                                aria-label={isVisible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                                className="pw-btn"
                              >
                                {isVisible ? <FaEyeSlash /> : <FaEye />}
                              </button>
                            )}
                          </div>
                        </td>
                        <td><div className="row-inner">{r.url ?? ''}</div></td>
                        <td><div className="row-inner">{r.clientName ?? r.buyerUsername ?? ''}</div></td>
                        <td><div className="row-inner">{r.clientPhone ?? ''}</div></td>
                        <td><div className="row-inner">{r.pin ?? ''}</div></td>
                        <td><div className="row-inner">{formatDateLocal(r.startAt)}</div></td>
                        <td><div className="row-inner">{formatDateLocal(r.endAt)}</div></td>
                        <td><div className="row-inner">{r.providerName ?? ''}</div></td>
                        <td><div className="row-inner">{r.providerPhone ?? ''}</div></td>
                        <td>
                          <div className="row-inner">
                            <span className={daysBadgeClass}>
                              {r.daysRemaining ?? 0}
                            </span>
                          </div>
                        </td>
                        <td>
                          <div className="row-inner config-cell">
                            {Number(r.refund) > 0 && (
                              <button
                                className="config-btn refund"
                                title="Reembolsar"
                                onClick={() => handleRefundClick(r)}
                              >
                                <FaUndo />
                              </button>
                            )}
                            <button
                              className="config-btn accept"
                              title="Aceptar"
                              onClick={() => handleAcceptClick(r)}
                            >
                              <FaCheck />
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
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              className="pager-btn"
              disabled={page <= 0}
            >
              Anterior
            </button>
            <button
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              className="pager-btn"
              disabled={page >= totalPages - 1}
            >
              Siguiente
            </button>
          </div>
        </div>
      </main>

      <Footer />

      {/* ConfirmModal (aceptar / reembolsar) */}
      {confirmOpen && (
        <ConfirmModal
          open={confirmOpen}
          onCancel={() => { setConfirmOpen(false); setSelectedStock(null); setConfirmMode(null) }}
          onConfirm={handleConfirm}
          message={
            confirmMode === 'refund'
              ? `¿Desea reembolsar el stock ${selectedStock?.id} por ${formatAmount(selectedStock?.refund)}?`
              : `¿Desea aprobar la renovación del stock ${selectedStock?.id}?`
          }
        />
      )}

      <style jsx>{`
        .page-bg { 
          /* Se eliminó la propiedad background para que el componente sea transparente */
          min-height: 100vh; 
        }
        .page-container { padding: 36px 20px; max-width: 1400px; margin:0 auto; }
        .header-row { display:flex; justify-content:space-between; align-items:center; gap:12px; margin-bottom:16px; }
        .search-bar { display:flex; align-items:center; background: rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.06); border-radius:10px; padding:0 12px; height:40px; max-width:520px; width:100%; }
        .search-icon-inline { color:#9fb4c8; margin-right:8px; }
        .search-input-inline { flex:1; background:transparent; border:none; color:#fff; outline:none; font-size:0.95rem; }

        .table-wrapper { overflow:hidden; background: rgba(22,22,22,0.6); border:1px solid rgba(255,255,255,0.06); backdrop-filter: blur(12px); border-radius:12px; padding:12px; box-shadow: 0 12px 24px rgba(0,0,0,0.4); }
        .table-scroll { overflow:auto; border-radius:8px; }

        table.styled-table { width:100%; border-collapse:separate; border-spacing:0 12px; color:#e1e1e1; min-width:1200px; }
        thead tr { background: rgba(30,30,30,0.8); text-transform:uppercase; letter-spacing:0.06em; color:#cfcfcf; font-size:0.72rem; }
        thead th { padding:10px; text-align:center; font-weight:700; vertical-align:middle; white-space:nowrap; }

        tbody td { padding:0; vertical-align:middle; text-align:center; }
        .row-inner { display:flex; align-items:center; justify-content:center; gap:12px; padding:12px; background-color: rgba(22,22,22,0.6); border-radius:12px; min-height:36px; }
        .td-name { white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:420px; }
        .id-cell { font-weight:700; color:#cfe8ff; }

        .password-cell { justify-content:center; align-items:center; }
        .pw-text { margin-right:8px; }
        .pw-btn { background:transparent; border:none; color:#9fb4c8; cursor:pointer; display:flex; align-items:center; }

        .badge {
          display:inline-flex;
          align-items:center;
          justify-content:center;
          min-width:32px;
          height:32px;
          padding:0 10px;
          border-radius:999px;
          font-weight:700;
          font-size:0.9rem;
          line-height:1;
          color:#0b1220;
          background:#CBD5E1;
          box-shadow: inset 0 0 0 1px rgba(255,255,255,0.2);
        }
        .badge.positive { background:#22c55e; color:#052e1a; }
        .badge.negative { background:#ef4444; color:#3b0a0a; }
        .badge.neutral  { background:#94a3b8; color:#0b1220; }

        .config-cell { display:flex; gap:10px; justify-content:center; }
        .config-btn {
          padding:8px;
          border-radius:8px;
          min-width:36px;
          height:36px;
          display:inline-flex;
          align-items:center;
          justify-content:center;
          border:none;
          cursor:pointer;
          color:#fff;
        }
        .config-btn.refund { background: linear-gradient(135deg,#f87171 0%,#ef4444 100%); }
        .config-btn.accept { background: linear-gradient(135deg,#22c55e 0%,#16a34a 100%); }

        .pager-row { display:flex; justify-content:space-between; align-items:center; margin-top:12px; }
        .pager-info { color:#cbd5e1; }
        .pager-controls { display:flex; gap:8px; }
        .pager-btn { padding:8px 12px; border-radius:8px; border:none; background:rgba(255,255,255,0.03); color:#e1e1e1; cursor:pointer; }
        .pager-btn:disabled { opacity:0.45; cursor:not-allowed; }

        .info { padding:28px; text-align:center; color:#cbd5e1; }
        .error { padding:28px; text-align:center; color:#fca5a5; }

        .table-scroll::-webkit-scrollbar { height: 12px; }
        .table-scroll::-webkit-scrollbar-track { background: transparent; }
        .table-scroll::-webkit-scrollbar-thumb {
          background: linear-gradient(90deg, rgba(139,92,246,0.9), rgba(34,211,238,0.9));
          border-radius: 999px;
          border: 2px solid rgba(2,6,23,0.0);
        }
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