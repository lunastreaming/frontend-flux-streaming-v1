// pages/admin/transactions.js
'use client'

import React, { useEffect, useState } from 'react'
import AdminNavBar from '../../components/AdminNavBar'
import Footer from '../../components/Footer'
import ConfirmModal from '../../components/ConfirmModal'
import { FaSearch, FaRedoAlt, FaUndo } from 'react-icons/fa'

export default function AdminTransactionsPage() {
  const [items, setItems] = useState([])
  const [page, setPage] = useState(0)
  const [size] = useState(100)
  const [totalPages, setTotalPages] = useState(1)
  const [totalElements, setTotalElements] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [banner, setBanner] = useState(null)
  const [processingExtorno, setProcessingExtorno] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [selectedRow, setSelectedRow] = useState(null)
  const BASE_URL = process.env.NEXT_PUBLIC_API_URL || ''

  useEffect(() => {
    let mounted = true

    const fetchPage = async (p = 0) => {
      setLoading(true)
      setError(null)
      try {
        const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null
        if (!token) throw new Error('No token')

        const url = `${BASE_URL}/api/wallet/transactions?page=${p}`
        const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })

        if (!res.ok) {
          const txt = await res.text().catch(() => '')
          throw new Error(`Error ${res.status} ${txt}`)
        }

        const payload = await res.json()
        if (!mounted) return

        const content = Array.isArray(payload?.content) ? payload.content : []
        setItems(content)
        setPage(Number(payload?.number ?? p))
        setTotalElements(Number(payload?.totalElements ?? payload?.total ?? content.length))
        setTotalPages(Number(payload?.totalPages ?? Math.ceil((payload?.totalElements ?? content.length) / size) ?? 1))
      } catch (err) {
        if (!mounted) return
        setError(err.message || String(err))
        setItems([])
        setTotalElements(0)
        setTotalPages(1)
      } finally {
        if (mounted) setLoading(false)
      }
    }

    fetchPage(page)
    return () => { mounted = false }
  }, [page, BASE_URL, size])

  // Filtered list for display (search across userName, description)
  const displayed = items.filter(it =>
    ((it.userName ?? '') + ' ' + (it.description ?? '')).toLowerCase().includes(search.toLowerCase())
  )

  const formatDate = (v) => v ? new Date(v).toLocaleString() : '—'
  const formatAmount = (v, curr = 'USD') => v == null ? '—' : new Intl.NumberFormat('en-US', { style: 'currency', currency: curr }).format(Number(v))

  const formatDateLocal = (value) => {
  if (!value) return '—'
  try {
    const d = new Date(value)
    if (Number.isNaN(d.getTime())) return '—'
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
    return '—'
  }
}

  // Mapea type a etiqueta legible (incluye chargeback -> Extorno)
  const typeLabel = (t) => {
    const tt = String(t ?? '').toLowerCase()
    if (tt === 'recharge') return 'Recarga'
    if (tt === 'withdrawal') return 'Retiro'
    if (tt === 'transfer') return 'Transferencia'
    if (tt === 'chargeback' || tt === 'rechargeback' || tt === 'extorno') return 'Extorno'
    return t ?? '—'
  }

  // Muestra monto; si es withdrawal y backend no trae signo, lo mostramos con prefijo '-'
  const displayAmount = (row) => {
    const amt = row?.amount
    const curr = row?.currency ?? 'USD'
    if (amt == null) return '—'
    const numeric = Number(amt)
    if (String(row?.type ?? '').toLowerCase() === 'withdrawal') {
      if (numeric < 0) return formatAmount(Math.abs(numeric), curr).replace(/^/, '-')
      return '-' + formatAmount(numeric, curr)
    }
    return formatAmount(numeric, curr)
  }

  const stateClass = (s) => {
    const st = String(s ?? '').toLowerCase()
    if (st === 'approved' || st === 'complete' || st === 'success') return 'tx-badge approved'
    if (st === 'pending' || st === 'waiting') return 'tx-badge pending'
    if (st === 'rejected' || st === 'failed' || st === 'cancelled') return 'tx-badge rejected'
    return 'tx-badge neutral'
  }

  // Open confirm modal for extorno
  const openConfirmExtorno = (row) => {
    setSelectedRow(row)
    setConfirmOpen(true)
  }

  // Cancel modal
  const cancelExtorno = () => {
    setConfirmOpen(false)
    setSelectedRow(null)
  }

  // Execute extorno: calls POST /api/wallet/admin/extorno/{txId}
  const executeExtorno = async () => {
    if (!selectedRow || !selectedRow.id) return
    setProcessingExtorno(true)
    setBanner(null)
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null
      if (!token) throw new Error('No token')

      const txId = selectedRow.id
      const url = `${BASE_URL}/api/wallet/admin/extorno/${encodeURIComponent(txId)}`
      const res = await fetch(url, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: null
      })

      if (!res.ok) {
        const txt = await res.text().catch(() => '')
        throw new Error(`Error ${res.status} ${txt}`)
      }

      const payload = await res.json().catch(() => null)
      // backend may return amount or extornoAmount
      const extornoAmount = payload?.amount ?? payload?.extornoAmount ?? payload?.refundAmount ?? selectedRow.amount ?? null
      const amountText = extornoAmount != null ? Number(extornoAmount).toFixed(2) : '—'

      setBanner({ type: 'success', message: `Extorno aplicado. Usuario: ${selectedRow.userName ?? '—'}. Monto: ${amountText} ${selectedRow.currency ?? 'USD'}.` })
      // refresh
      setPage(p => p)
    } catch (err) {
      setBanner({ type: 'error', message: 'No se pudo ejecutar el extorno: ' + (err.message || err) })
    } finally {
      setProcessingExtorno(false)
      setConfirmOpen(false)
      setSelectedRow(null)
    }
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
              placeholder="Buscar por usuario o descripción..."
            />
          </div>

        </div>

        {banner && (
          <div className={`inline-banner ${banner.type}`}>
            <span className="inline-banner-text">{banner.message}</span>
            <button className="inline-banner-close" onClick={() => setBanner(null)} aria-label="Cerrar aviso">✕</button>
          </div>
        )}

        <div className="table-wrapper">
          {loading ? <div className="info">Cargando transacciones…</div> :
            error ? <div className="error">Error: {error}</div> :
              <div className="table-scroll">
                <table className="styled-table" role="table" aria-label="Transacciones">
                  <colgroup>
                    <col style={{ width: '40px' }} />
                    <col style={{ width: '220px' }} />
                    <col style={{ width: '140px' }} />
                    <col style={{ width: '140px' }} />
                    <col style={{ width: '180px' }} />
                    <col style={{ width: '160px' }} />
                    <col style={{ width: '260px' }} />
                    <col style={{ width: '120px' }} />
                    <col />
                  </colgroup>

                  <thead>
                    <tr>
                      <th>#</th>
                      <th>USUARIO</th>
                      <th>TIPO</th>
                      <th>MONTO</th>
                      <th>FECHA</th>
                      <th>ESTADO</th>
                      <th>DESCRIPCION</th>
                      <th>CONFIGURACIONES</th>
                      <th />
                    </tr>
                  </thead>

                  <tbody>
                    {displayed.map((r, i) => (
                      <tr key={r.id ?? i}>
                        <td><div className="row-inner index">{i + 1}</div></td>

                        <td><div className="row-inner">{r.userName ?? '—'}</div></td>

                        <td><div className="row-inner">{typeLabel(r.type)}</div></td>

                        <td><div className="row-inner">{displayAmount(r)}</div></td>

                        <td><div className="row-inner no-wrap">{formatDateLocal(r.date)}</div></td>

                        <td>
                          <div className="row-inner">
                            <span className={stateClass(r.status)}>{(r.status ?? '—').toString().toUpperCase()}</span>
                          </div>
                        </td>

                        <td><div className="row-inner" title={r.description ?? ''}>{r.description ?? '—'}</div></td>

                        <td>
                          <div className="row-inner">
                            {String(r.type ?? '').toLowerCase() === 'recharge' && String(r.status ?? '').toLowerCase() === 'approved' ? (
                              <button
                                className="btn-extorno-icon"
                                onClick={() => openConfirmExtorno(r)}
                                disabled={processingExtorno}
                                title="Extorno"
                                aria-label="Extorno"
                              >
                                <FaUndo />
                              </button>
                            ) : (
                              <div style={{ minWidth: 40 }} />
                            )}
                          </div>
                        </td>

                        <td />
                      </tr>
                    ))}
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

      {/* ConfirmModal para extorno */}
      <ConfirmModal
        open={confirmOpen}
        title="Confirmar extorno"
        description={
          selectedRow
            ? `¿Estás seguro de aplicar el extorno al usuario ${selectedRow.userName ?? '—'} por un monto de ${selectedRow.amount != null ? formatAmount(selectedRow.amount, selectedRow.currency ?? 'USD') : '—'}?`
            : '¿Deseas continuar?'
        }
        confirmLabel="APLICAR EXTORNO"
        cancelLabel="Cancelar"
        onConfirm={executeExtorno}
        onCancel={cancelExtorno}
        loading={processingExtorno}
      />

      <style jsx>{`
        .page-bg { /* Se eliminó el fondo para usar el fondo del padre */ min-height:100vh; }
        .page-container { padding: 60px 24px; max-width:1200px; margin:0 auto; }
        .header-row { display:flex; justify-content:space-between; align-items:center; gap:12px; margin-bottom:24px; }
        .search-bar { display:flex; align-items:center; background: rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.06); border-radius:10px; padding:0 12px; height:38px; max-width:520px; width:100%; }
        .search-icon-inline { color:#9fb4c8; margin-right:8px; }
        .search-input-inline { flex:1; background:transparent; border:none; color:#fff; outline:none; font-size:0.95rem; }

        .header-actions { display:flex; gap:8px; align-items:center; }
        .btn-action { padding:8px; border-radius:8px; min-width:36px; height:36px; display:inline-flex; align-items:center; justify-content:center; border:none; font-weight:700; color:#0d0d0d; background: linear-gradient(135deg,#06b6d4 0%,#8b5cf6 100%); cursor:pointer; }

        .inline-banner { display:flex; align-items:center; justify-content:space-between; gap:12px; padding:10px 12px; border-radius:10px; margin: 12px 0; border:1px solid rgba(255,255,255,0.06); }
        .inline-banner.success { background: linear-gradient(90deg, rgba(34,197,94,0.08), rgba(34,197,94,0.06)); color:#86efac; }
        .inline-banner.error { background: linear-gradient(90deg, rgba(239,68,68,0.08), rgba(239,68,68,0.06)); color:#fca5a5; }
        .inline-banner-text { font-weight:700; }
        .inline-banner-close { background:transparent; border:none; color:#9fb4c8; cursor:pointer; font-size:16px; }

        .table-wrapper { overflow:hidden; background: rgba(22,22,22,0.6); border:1px solid rgba(255,255,255,0.06); backdrop-filter: blur(12px); border-radius:12px; padding:12px; box-shadow: 0 12px 24px rgba(0,0,0,0.4); }
        .table-scroll { overflow:auto; border-radius:8px; }

        table.styled-table { width:100%; border-collapse:separate; border-spacing:0 12px; color:#e1e1e1; min-width:1000px; }
        thead tr { background: rgba(30,30,30,0.8); text-transform:uppercase; letter-spacing:0.06em; color:#cfcfcf; font-size:0.72rem; }
        thead th { padding:10px; text-align:center; font-weight:700; vertical-align:middle; white-space:nowrap; }

        tbody td { padding:0; vertical-align:middle; }
        .row-inner { display:flex; align-items:center; justify-content:center; gap:12px; padding:12px; background-color: rgba(22,22,22,0.6); border-radius:12px; min-height:36px; }
        .row-inner.index { justify-content:center; width:36px; height:36px; padding:0; }
        .td-name { white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:420px; }
        .no-wrap { white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }

        .btn-extorno-icon {
          display:inline-grid;
          place-items:center;
          width:36px;
          height:36px;
          border-radius:8px;
          background: linear-gradient(90deg,#f97316,#ef4444);
          color:#fff;
          border:none;
          cursor:pointer;
          transition: transform .12s ease, box-shadow .12s ease;
        }
        .btn-extorno-icon:disabled { opacity:0.6; cursor:not-allowed; }
        .btn-extorno-icon svg { width:16px; height:16px; }

        .pager-row { display:flex; justify-content:space-between; align-items:center; margin-top:12px; }
        .pager-info { color:#cbd5e1; }
        .pager-controls { display:flex; gap:8px; }
        .pager-btn { padding:8px 12px; border-radius:8px; border:none; background:rgba(255,255,255,0.03); color:#e1e1e1; cursor:pointer; }
        .pager-btn:disabled { opacity:0.45; cursor:not-allowed; }

        .info { padding:28px; text-align:center; color:#cbd5e1; }
        .error { padding:28px; text-align:center; color:#fca5a5; }

        .tx-badge { padding:6px 10px; border-radius:999px; font-weight:700; font-size:0.72rem; text-transform:uppercase; color:#07101a; }
        .tx-badge.approved { background: linear-gradient(90deg,#bbf7d0,#34d399); color:#04261a; }
        .tx-badge.pending { background: linear-gradient(90deg,#fef3c7,#f59e0b); color:#3a2700; }
        .tx-badge.rejected { background: linear-gradient(90deg,#fecaca,#fb7185); color:#2b0404; }
        .tx-badge.neutral { background: rgba(255,255,255,0.04); color:#cfcfcf; }

        .table-scroll::-webkit-scrollbar { height:10px; }
        .table-scroll::-webkit-scrollbar-track { background: transparent; }
        .table-scroll::-webkit-scrollbar-thumb {
          background: linear-gradient(90deg, rgba(139,92,246,0.9), rgba(34,211,238,0.9));
          border-radius:999px;
          border:2px solid rgba(2,6,23,0.0);
        }
        .table-scroll { scrollbar-width: thin; scrollbar-color: rgba(139,92,246,0.9) transparent; }

        @media (max-width: 980px) {
          .page-container { padding: 40px 16px; }
          table.styled-table { min-width:900px; }
        }
        @media (max-width: 640px) {
          .search-input-inline { font-size: 0.9rem; }
          table.styled-table { min-width:700px; }
        }
      `}</style>
    </div>
  )
}