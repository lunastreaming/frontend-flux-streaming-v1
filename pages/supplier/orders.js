// pages/supplier/orders.js
'use client'

import React, { useEffect, useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/router'
import Footer from '../../components/Footer'
import { FaSearch, FaEye, FaEyeSlash, FaUndo, FaEdit, FaWhatsapp } from 'react-icons/fa'
import ConfirmModal from '../../components/ConfirmModal'
import RequestToSoldModal from '../../components/RequestToSoldModal'

export default function OrdersPage() {
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

  // Confirm modal (refund)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [selectedStock, setSelectedStock] = useState(null)

  // RequestToSoldModal (edit -> requested -> sold)
  const [editOpen, setEditOpen] = useState(false)
  const [editStock, setEditStock] = useState(null)

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
    if (typeof window === 'undefined') return
    if (!token) return

    setLoading(true)
    setError(null)
    try {
      const url = `${BASE_URL}/api/onrequest/support/provider/in-process?page=${p}&size=${size}`
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

  const formatAmount = (v) => {
    if (v == null) return ''
    try {
      return Number(v).toLocaleString(undefined, { style: 'currency', currency: 'USD', minimumFractionDigits: 2 })
    } catch {
      return String(v ?? '')
    }
  }

  // WhatsApp cliente: ícono primero y número al costado
  const openWhatsAppToClient = (clientPhone, clientName, productName) => {
    const raw = String(clientPhone ?? '').replace(/[^\d+]/g, '')
    const name = clientName ?? ''
    const product = productName ?? ''
    const message = `Hola *${name}* 👋🏻\n¿Has realizado una compra de *${product}*?`
    const encoded = encodeURIComponent(message)
    if (!raw) {
      window.open(`https://web.whatsapp.com/send?text=${encoded}`, '_blank')
      return
    }
    const num = raw.startsWith('+') ? raw.slice(1) : raw
    window.open(`https://api.whatsapp.com/send?phone=${num}&text=${encoded}`, '_blank')
  }

  // Reembolso
  const handleRefundClick = (stock) => {
    setSelectedStock(stock)
    setConfirmOpen(true)
  }

  const handleRefundConfirm = async () => {
    if (!selectedStock) return
    try {
      const res = await fetch(`${BASE_URL}/api/supplier/provider/stocks/${selectedStock.id}/refund/full`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      if (!res.ok) {
        const txt = await res.text().catch(() => '')
        throw new Error(`refund_failed ${res.status} ${txt}`)
      }
      await res.json()
      await fetchPage(page) // recargar tabla tras reembolso
    } catch (err) {
      console.error(err)
      alert('No se pudo procesar el reembolso')
    } finally {
      setConfirmOpen(false)
      setSelectedStock(null)
    }
  }

  // Editar (RequestToSoldModal)
  const handleEditClick = (stock) => {
    setEditStock({
      id: stock.id,
      productName: stock.productName,
      username: stock.username,
      password: stock.password,
      url: stock.url,
      tipo: stock.tipo ?? (stock.type ?? 'CUENTA'),
      numeroPerfil: stock.numeroPerfil ?? stock.numberProfile ?? '',
      pin: stock.pin,
      note: stock.note
    })
    setEditOpen(true)
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

  // Placeholder mientras token es undefined
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

  // Si token === null ya redirigimos; no renderizamos nada
  if (token === null) return null

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
            <div className="info">Cargando órdenes bajo pedido…</div>
          ) : error ? (
            <div className="error">Error: {error}</div>
          ) : (
            <div className="table-scroll" ref={scrollRef}>
              <table className="styled-table" role="table" aria-label="Órdenes bajo pedido">
                <colgroup>
                  <col style={{ width: '40px' }} />
                  <col style={{ width: '160px' }} />
                  <col style={{ width: '260px' }} />
                  <col style={{ width: '180px' }} />
                  <col style={{ width: '200px' }} />
                  <col style={{ width: '140px' }} />
                  <col style={{ width: '180px' }} />
                  <col style={{ width: '160px' }} />
                  <col style={{ width: '200px' }} />
                  <col style={{ width: '140px' }} />
                  <col style={{ width: '160px' }} />
                  <col style={{ width: '160px' }} />
                  <col style={{ width: '220px' }} />
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
                    <th>Cliente</th>
                    <th>Celular cliente</th>
                    <th>Pin</th>
                    <th>Refund</th>
                    <th>Proveedor</th>
                    <th>Celular proveedor</th>
                    <th>Configuraciones</th>
                  </tr>
                </thead>

                <tbody>
                  {displayed.map((r, i) => {
                    const isVisible = visiblePasswords.has(r.id)
                    const masked = r.password ? '••••••••' : ''

                    return (
                      <tr key={r.id ?? i}>
                        <td><div className="row-inner index">{i + 1}</div></td>
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
                        {/* URL en texto plano */}
                        <td><div className="row-inner">{r.url ?? ''}</div></td>
                        <td><div className="row-inner">{r.numeroPerfil ?? r.numberProfile ?? ''}</div></td>
                        <td><div className="row-inner">{r.clientName ?? r.buyerUsername ?? ''}</div></td>

                        {/* Celular cliente: ícono primero y número al costado */}
                        <td>
                          <div className="row-inner phone-cell">
                            {r.clientPhone && (
                              <button
                                className="wa-btn"
                                title={`WhatsApp cliente ${r.clientPhone}`}
                                onClick={() => openWhatsAppToClient(r.clientPhone, r.clientName ?? r.buyerUsername, r.productName)}
                                aria-label={`WhatsApp cliente ${r.clientPhone}`}
                              >
                                <FaWhatsapp />
                              </button>
                            )}
                            <span className="client-phone">{r.clientPhone ?? ''}</span>
                          </div>
                        </td>

                        <td><div className="row-inner">{r.pin ?? ''}</div></td>
                        {/* Refund: mostrar amount del backend */}
                        <td><div className="row-inner">{formatAmount(r.amount)}</div></td>
                        <td><div className="row-inner">{r.providerName ?? ''}</div></td>
                        <td><div className="row-inner">{r.providerPhone ?? ''}</div></td>
                        {/* Configuraciones */}
                        <td>
                          <div className="row-inner config-cell">
                            <button
                              className="config-btn refund"
                              title="Reembolso"
                              onClick={() => handleRefundClick(r)}
                            >
                              <FaUndo />
                            </button>
                            <button
                              className="config-btn edit"
                              title="Editar (requested → sold)"
                              onClick={() => handleEditClick(r)}
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

      {/* ConfirmModal (refund) */}
      {confirmOpen && (
        <ConfirmModal
          open={confirmOpen}
          onCancel={() => setConfirmOpen(false)}
          onConfirm={handleRefundConfirm}
          message={`¿Desea reembolsar el monto ${formatAmount(selectedStock?.amount)}?`}
        />
      )}

      {/* RequestToSoldModal (edit -> requested -> sold) */}
      {editOpen && (
        <RequestToSoldModal
          visible={editOpen}
          onClose={() => { setEditOpen(false); setEditStock(null) }}
          onSuccess={() => {
            setEditOpen(false)
            setEditStock(null)
            fetchPage(page) // refrescar tabla tras aprobar cambio
          }}
          initialData={editStock}
          BASE_URL={BASE_URL}
        />
      )}

      <style jsx>{`
        .page-bg { background: radial-gradient(circle at top, #0b1220, #05060a); min-height:100vh; }
        .page-container { padding: 36px 20px; max-width: 1400px; margin:0 auto; }
        .header-row { display:flex; justify-content:space-between; align-items:center; gap:12px; margin-bottom:16px; }
        .search-bar { display:flex; align-items:center; background: rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.06); border-radius:10px; padding:0 12px; height:40px; max-width:520px; width:100%; }
        .search-icon-inline { color:#9fb4c8; margin-right:8px; }
        .search-input-inline { flex:1; background:transparent; border:none; color:#fff; outline:none; font-size:0.95rem; }

        .table-wrapper { overflow:hidden; background: rgba(22,22,22,0.6); border:1px solid rgba(255,255,255,0.06); backdrop-filter: blur(12px); border-radius:12px; padding:12px; box-shadow: 0 12px 24px rgba(0,0,0,0.4); }
        .table-scroll { overflow:auto; border-radius:8px; }

        table.styled-table { width:100%; border-collapse:separate; border-spacing:0 12px; color:#e1e1e1; min-width:1200px; }
        thead tr { background: rgba(30,30,30,0.8); text-transform:uppercase; letter-spacing:0.06em; color:#cfcfcf; font-size:0.72rem; }
        thead th { padding:10px; text-align:left; font-weight:700; vertical-align:middle; white-space:nowrap; }

        tbody td { padding:0; vertical-align:middle; }
        .row-inner { display:flex; align-items:center; gap:12px; padding:12px; background-color: rgba(22,22,22,0.6); border-radius:12px; min-height:36px; }
        .row-inner.index { justify-content:center; width:36px; height:36px; padding:0; }
        .td-name { white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:420px; }
        .id-cell { font-weight:700; color:#cfe8ff; }

        .password-cell { justify-content:space-between; align-items:center; }
        .pw-text { margin-right:8px; }
        .pw-btn { background:transparent; border:none; color:#9fb4c8; cursor:pointer; display:flex; align-items:center; }

        .phone-cell { display:flex; align-items:center; gap:8px; }
        .client-phone { color:#cbd5e1; font-size:0.95rem; }

        .pager-row { display:flex; justify-content:space-between; align-items:center; margin-top:12px; }
        .pager-info { color:#cbd5e1; }
        .pager-controls { display:flex; gap:8px; }
        .pager-btn { padding:8px 12px; border-radius:8px; border:none; background:rgba(255,255,255,0.03); color:#e1e1e1; cursor:pointer; }
        .pager-btn:disabled { opacity:0.45; cursor:not-allowed; }

        .info { padding:28px; text-align:center; color:#cbd5e1; }
        .error { padding:28px; text-align:center; color:#fca5a5; }

        .config-cell { display:flex; gap:10px; }
        .config-btn { padding:8px; border-radius:8px; min-width:36px; height:36px; display:inline-flex; align-items:center; justify-content:center; border:none; cursor:pointer; color:#0d0d0d; }
        .config-btn.refund { background: linear-gradient(135deg,#f87171 0%,#ef4444 100%); }
        .config-btn.edit { background: linear-gradient(135deg,#06b6d4 0%,#8b5cf6 100%); }

        .wa-btn {
          width:36px;
          height:36px;
          display:inline-grid;
          place-items:center;
          border-radius:8px;
          background: linear-gradient(90deg,#25D366,#128C7E);
          color: #fff;
          border: none;
          cursor: pointer;
        }

        /* modern horizontal scrollbar themed */
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