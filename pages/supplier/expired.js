// pages/supplier/expired.js
'use client'

import React, { useEffect, useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/router'
import Footer from '../../components/Footer'
import { FaSearch, FaEye, FaEyeSlash, FaTrash, FaWhatsapp, FaCheckSquare, FaSquare } from 'react-icons/fa'
import ConfirmModal from '../../components/ConfirmModal'

export default function ExpiredPage() {
  const router = useRouter()

  // Estado principal
  const [token, setToken] = useState(undefined)
  const [items, setItems] = useState([])
  const [page, setPage] = useState(0)
  const [size] = useState(30)
  const [totalPages, setTotalPages] = useState(1)
  const [totalElements, setTotalElements] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [visiblePasswords, setVisiblePasswords] = useState(() => new Set())

  // Selección múltiple
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [bulkConfirmOpen, setBulkConfirmOpen] = useState(false)

  // ConfirmModal (eliminar individual)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [selectedStock, setSelectedStock] = useState(null)

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
      const url = `${BASE_URL}/api/supplier/supplier/stocks/expired?page=${p}&size=${size}`
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
      
      // Limpiar selección al cambiar de página
      setSelectedIds(new Set())
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

  // Funciones de Selección
  const toggleSelectAll = () => {
    if (selectedIds.size === displayed.length && displayed.length > 0) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(displayed.map(it => it.id)))
    }
  }

  const toggleSelectOne = (id) => {
    setSelectedIds(prev => {
      const copy = new Set(prev)
      if (copy.has(id)) copy.delete(id)
      else copy.add(id)
      return copy
    })
  }

  // Eliminar Individual
  const handleDeleteClick = (stock) => {
    setSelectedStock(stock)
    setConfirmOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!selectedStock) return
    try {
      const res = await fetch(`${BASE_URL}/api/stocks/remove/${selectedStock.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      })
      if (!res.ok) throw new Error(`delete_failed ${res.status}`)
      await fetchPage(page)
    } catch (err) {
      console.error(err)
      alert('No se pudo eliminar el stock')
    } finally {
      setConfirmOpen(false)
      setSelectedStock(null)
    }
  }

  // Eliminar Múltiple
  const handleBulkDeleteConfirm = async () => {
    try {
      const res = await fetch(`${BASE_URL}/api/stocks/remove-multiple`, {
        method: 'DELETE',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(Array.from(selectedIds))
      })
      if (!res.ok) throw new Error('Error en borrado masivo')
      
      setSelectedIds(new Set())
      await fetchPage(page)
    } catch (err) {
      console.error(err)
      alert('No se pudo realizar la eliminación múltiple')
    } finally {
      setBulkConfirmOpen(false)
    }
  }

  if (token === undefined) {
    return (
      <div className="min-h-screen page-bg text-white font-inter">
        <main className="page-container">
          <div className="header-row">
            <div className="search-bar" style={{ height: 40, width: '100%', maxWidth: 520 }} />
          </div>
          <div className="table-wrapper">
            <div className="info">Cargando…</div>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  if (token === null) return null

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

          {selectedIds.size > 0 && (
            <button 
              className="bulk-delete-btn"
              onClick={() => setBulkConfirmOpen(true)}
            >
              <FaTrash style={{ marginRight: 8 }} />
              Eliminar seleccionados ({selectedIds.size})
            </button>
          )}
        </div>

        <div className="table-wrapper">
          {loading ? (
            <div className="info">Cargando stocks vencidos…</div>
          ) : error ? (
            <div className="error">Error: {error}</div>
          ) : (
            <div className="table-scroll" ref={scrollRef}>
              <table className="styled-table" role="table" aria-label="Stocks vencidos">
                <colgroup>
                  <col style={{ width: '50px' }} />
                  <col style={{ width: '60px' }} />
                  <col style={{ width: '120px' }} />
                  <col style={{ width: '220px' }} />
                  <col style={{ width: '180px' }} />
                  <col style={{ width: '180px' }} />
                  <col style={{ width: '160px' }} />
                  <col style={{ width: '160px' }} />
                  <col style={{ width: '140px' }} />
                  <col style={{ width: '140px' }} />
                  <col style={{ width: '130px' }} />
                  <col style={{ width: '100px' }} />
                </colgroup>

                <thead>
                  <tr>
                    <th>
                      <button className="select-btn-head" onClick={toggleSelectAll}>
                        {selectedIds.size === displayed.length && displayed.length > 0 
                          ? <FaCheckSquare color="#ef4444" /> 
                          : <FaSquare color="rgba(255,255,255,0.2)" />}
                      </button>
                    </th>
                    <th>#</th>
                    <th>Id</th>
                    <th>Producto</th>
                    <th>Username</th>
                    <th>Password</th>
                    <th>Cliente</th>
                    <th>Celular cliente</th>
                    <th>Inicio</th>
                    <th>Fin</th>
                    <th>Días restantes</th>
                    <th>Acciones</th>
                  </tr>
                </thead>

                <tbody>
                  {displayed.map((r, i) => {
                    const isVisible = visiblePasswords.has(r.id)
                    const isSelected = selectedIds.has(r.id)
                    const masked = r.password ? '••••••••' : ''
                    const daysBadgeClass =
                      r.daysRemaining < 0
                        ? 'badge negative'
                        : r.daysRemaining > 0
                        ? 'badge positive'
                        : 'badge neutral'

                    return (
                      <tr key={r.id ?? i} className={isSelected ? 'selected-row' : ''}>
                        <td>
                          <div className="row-inner">
                            <button className="select-btn-row" onClick={() => toggleSelectOne(r.id)}>
                              {isSelected 
                                ? <FaCheckSquare color="#ef4444" /> 
                                : <FaSquare color="rgba(255,255,255,0.15)" />}
                            </button>
                          </div>
                        </td>
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
                                className="pw-btn"
                              >
                                {isVisible ? <FaEyeSlash /> : <FaEye />}
                              </button>
                            )}
                          </div>
                        </td>
                        <td><div className="row-inner">{r.buyerUsername ?? ''}</div></td>
                        <td>
                          <div className="row-inner phone-cell">
                            {r.buyerUsernamePhone && (
                              <button
                                className="wa-btn"
                                onClick={() => {
                                  const message = `Hola reseller ${r.buyerUsername || ''} 👋🏻
🍿Tu subscripcion a ${r.productName || ''}🍿
✉ usuario: ${r.username || ''}
🔐 Vence en : ${r.daysRemaining ?? 0} días
📣 Comunicate con tu cliente ${r.clientName || ''}
Al 📲 ${r.clientPhone || ''}, para consultar si ${r.productName || ''} será renovado...
🤖 Atentamente Proveedor ${r.providerName || ''}`;
                                  const rawPhone = String(r.buyerUsernamePhone).replace(/\D/g, '');
                                  window.open(`https://api.whatsapp.com/send?phone=${rawPhone}&text=${encodeURIComponent(message)}`, '_blank');
                                }}
                              >
                                <FaWhatsapp />
                              </button>
                            )}
                            <span className="client-phone">{r.buyerUsernamePhone ?? ''}</span>
                          </div>
                        </td>
                        <td><div className="row-inner">{formatDateLocal(r.startAt)}</div></td>
                        <td><div className="row-inner">{formatDateLocal(r.endAt)}</div></td>
                        <td>
                          <div className="row-inner">
                            <span className={daysBadgeClass}>
                              {r.daysRemaining ?? 0}
                            </span>
                          </div>
                        </td>
                        <td>
                          <div className="row-inner config-cell">
                            <button
                              className="config-btn delete"
                              title="Eliminar"
                              onClick={() => handleDeleteClick(r)}
                            >
                              <FaTrash />
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

      {confirmOpen && (
        <ConfirmModal
          open={confirmOpen}
          onCancel={() => { setConfirmOpen(false); setSelectedStock(null) }}
          onConfirm={handleDeleteConfirm}
          message={`¿Desea eliminar el ${selectedStock?.productName} ${selectedStock?.username} del ID ${selectedStock?.id}?`}
        />
      )}

      {bulkConfirmOpen && (
        <ConfirmModal
          open={bulkConfirmOpen}
          onCancel={() => setBulkConfirmOpen(false)}
          onConfirm={handleBulkDeleteConfirm}
          message={`¿Estás seguro de que deseas eliminar los ${selectedIds.size} stocks seleccionados? Esta acción marcará los registros como eliminados.`}
        />
      )}

      <style jsx>{`
        .page-bg { min-height: 100vh; background-color: #0b1220; }
        .page-container { padding: 36px 20px; max-width: 1400px; margin:0 auto; }
        .header-row { display:flex; justify-content:space-between; align-items:center; gap:12px; margin-bottom:16px; flex-wrap: wrap; }
        .search-bar { display:flex; align-items:center; background: rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.06); border-radius:10px; padding:0 12px; height:40px; max-width:520px; width:100%; }
        .search-icon-inline { color:#9fb4c8; margin-right:8px; }
        .search-input-inline { flex:1; background:transparent; border:none; color:#fff; outline:none; font-size:0.95rem; }
        
        .bulk-delete-btn { background: linear-gradient(135deg, #f87171 0%, #ef4444 100%); color: white; border: none; padding: 0 16px; height: 40px; border-radius: 10px; font-weight: 700; cursor: pointer; display: flex; align-items: center; box-shadow: 0 4px 12px rgba(239, 68, 68, 0.2); transition: transform 0.2s; }
        .bulk-delete-btn:hover { transform: translateY(-2px); }

        .table-wrapper { overflow:hidden; background: rgba(22,22,22,0.6); border:1px solid rgba(255,255,255,0.06); backdrop-filter: blur(12px); border-radius:12px; padding:12px; box-shadow: 0 12px 24px rgba(0,0,0,0.4); }
        .table-scroll { overflow:auto; border-radius:8px; }
        table.styled-table { width:100%; border-collapse:separate; border-spacing:0 12px; color:#e1e1e1; min-width:1200px; }
        thead tr { background: rgba(30,30,30,0.8); text-transform:uppercase; letter-spacing:0.06em; color:#cfcfcf; font-size:0.8rem; }
        thead th { padding:10px; text-align:center; font-weight:800; vertical-align:middle; white-space:nowrap; }
        tbody td { padding:0; vertical-align:middle; text-align:center; }
        
        .row-inner { display:flex; align-items:center; justify-content:center; gap:12px; padding:12px; background-color: rgba(22,22,22,0.6); border-radius:12px; min-height:36px; transition: background-color 0.2s; }
        .selected-row .row-inner { background-color: rgba(239, 68, 68, 0.15) !important; border: 1px solid rgba(239, 68, 68, 0.2); }
        
        .select-btn-head, .select-btn-row { background: transparent; border: none; cursor: pointer; font-size: 1.2rem; display: flex; align-items: center; padding: 0; }
        
        .td-name { white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:300px; }
        .id-cell { font-weight:700; color:#cfe8ff; }
        .password-cell { justify-content:center; }
        .pw-text { margin-right:8px; }
        .pw-btn { background:transparent; border:none; color:#9fb4c8; cursor:pointer; display:flex; align-items:center; }
        .badge { display:inline-flex; align-items:center; justify-content:center; min-width:32px; height:32px; padding:0 10px; border-radius:999px; font-weight:700; font-size:0.9rem; line-height:1; color:#0b1220; background:#94a3b8; box-shadow: inset 0 0 0 1px rgba(255,255,255,0.2); }
        .badge.positive { background:#22c55e; color:#052e1a; }
        .badge.negative { background:#ef4444; color:#3b0a0a; }
        .config-cell { display:flex; justify-content:center; }
        .config-btn.delete { padding:8px; border-radius:8px; min-width:36px; height:36px; display:inline-flex; align-items:center; justify-content:center; border:none; cursor:pointer; color:#fff; background: linear-gradient(135deg,#f87171 0%,#ef4444 100%); }
        .pager-row { display:flex; justify-content:space-between; align-items:center; margin-top:12px; }
        .pager-btn { padding:8px 12px; border-radius:8px; border:none; background:rgba(255,255,255,0.03); color:#e1e1e1; cursor:pointer; }
        .pager-btn:disabled { opacity:0.45; cursor:not-allowed; }
        .wa-btn { width:32px; height:32px; display:inline-grid; place-items:center; border-radius:8px; background: linear-gradient(90deg, #25D366, #128C7E); color: #fff; border: none; cursor: pointer; }
        .phone-cell { display: flex; align-items: center; gap: 8px; }
        .table-scroll::-webkit-scrollbar { height: 12px; }
        .table-scroll::-webkit-scrollbar-thumb { background: linear-gradient(90deg, rgba(139,92,246,0.9), rgba(34,211,238,0.9)); border-radius: 999px; }

        @media (max-width: 768px) {
          .header-row { flex-direction: column; align-items: stretch; }
          .bulk-delete-btn { width: 100%; justify-content: center; order: -1; margin-bottom: 8px; }
          .search-bar { max-width: none; }
        }
      `}</style>
    </div>
  )
}