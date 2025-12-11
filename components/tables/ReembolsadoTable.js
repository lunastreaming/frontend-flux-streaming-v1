'use client'

import { useEffect, useState } from 'react'
import { FaEye, FaEyeSlash, FaCheck } from 'react-icons/fa'
import ConfirmModal from '../../components/ConfirmModal'

export default function ReembolsadoTable({ search = '' }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [visiblePasswords, setVisiblePasswords] = useState(() => new Set())

  // confirm modal
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmPayload, setConfirmPayload] = useState(null)
  const [confirmLoading, setConfirmLoading] = useState(false)

  // paginación
  const [page, setPage] = useState(0)
  const [totalPages, setTotalPages] = useState(0)

  const BASE_URL = process.env.NEXT_PUBLIC_API_URL || ''

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

  const formatPrice = (v) => {
    if (v === null || v === undefined) return '—'
    try {
      return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(v))
    } catch { return '—' }
  }

  const togglePasswordVisibility = (id) => {
    setVisiblePasswords(prev => {
      const copy = new Set(prev)
      if (copy.has(id)) copy.delete(id)
      else copy.add(id)
      return copy
    })
  }

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true); setError(null)
      try {
        const token = localStorage.getItem('accessToken')
        const res = await fetch(`${BASE_URL}/api/stocks/refunds?page=${page}&size=50`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        if (!res.ok) throw new Error(`Error ${res.status}`)
        const data = await res.json()

        setItems(data.content || [])
        setTotalPages(data.totalPages || 0)
      } catch (err) {
        setError(err.message || String(err))
        setItems([])
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [page])

  const displayed = items.filter(i => (i.productName ?? '').toLowerCase().includes(search.toLowerCase()))

  const handleConfirmClick = (row) => {
    setConfirmPayload({
      id: row.id,
      productName: row.productName
    })
    setConfirmOpen(true)
  }

  const handleConfirm = async () => {
    if (!confirmPayload?.id) {
      setConfirmOpen(false)
      return
    }
    setConfirmLoading(true)
    try {
      const token = localStorage.getItem('accessToken')
      const res = await fetch(`${BASE_URL}/api/stocks/stocks/${confirmPayload.id}/refund/confirm`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` }
      })
      // Respuesta esperada 204 No Content
      if (res.status !== 204) {
        const txt = await res.text().catch(() => '')
        throw new Error(`Error ${res.status} ${txt}`)
      }
      // eliminar el item confirmado
      setItems(prev => prev.filter(i => i.id !== confirmPayload.id))
    } catch (err) {
      alert('No se pudo confirmar el reembolso: ' + (err.message || err))
    } finally {
      setConfirmLoading(false)
      setConfirmOpen(false)
      setConfirmPayload(null)
    }
  }

  const handleCancelConfirm = () => {
    setConfirmOpen(false)
    setConfirmPayload(null)
  }

  if (loading) return <div className="info">Cargando…</div>
  if (error) return <div className="error">Error: {error}</div>

  return (
    <div className="table-wrapper">
      <div className="table-scroll">
        <table className="styled-table">
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
              <th>Celular</th>
              <th>Proveedor</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {displayed.map((row, idx) => {
              const isVisible = visiblePasswords.has(row.id)
              const masked = row.password ? '••••••••' : ''

              return (
                <tr key={row.id}>
                  <td><div className="row-inner index">{idx + 1 + page * 50}</div></td>
                  <td><div className="row-inner">{row.id}</div></td>
                  <td><div className="row-inner td-name">{row.productName}</div></td>
                  <td><div className="row-inner">{row.username}</div></td>
                  <td>
                    <div className="row-inner password-cell">
                      <div className="pw-text">{isVisible ? (row.password || '') : masked}</div>
                      <button onClick={() => togglePasswordVisibility(row.id)} className="pw-btn">
                        {isVisible ? <FaEyeSlash /> : <FaEye />}
                      </button>
                    </div>
                  </td>
                  <td><div className="row-inner">{row.url ?? ''}</div></td>
                  <td><div className="row-inner">{row.numeroPerfil ?? ''}</div></td>
                  <td><div className="row-inner">{row.pin ?? ''}</div></td>
                  <td><div className="row-inner">{formatDateLocal(row.startAt)}</div></td>
                  <td><div className="row-inner">{formatDateLocal(row.endAt)}</div></td>
                  <td><div className="row-inner">{formatPrice(row.refund)}</div></td>
                  <td><div className="row-inner">{row.clientName}</div></td>
                  <td><div className="row-inner">{row.clientPhone}</div></td>
                  <td><div className="row-inner">{row.providerName}</div></td>
                  <td>
                    <div className="row-inner actions">
                      <button
                        className="btn-confirm"
                        title="Confirmar reembolso"
                        onClick={() => handleConfirmClick(row)}
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

      {/* Controles de paginación */}
      <div className="pagination">
        <button disabled={page === 0} onClick={() => setPage(p => p - 1)}>Anterior</button>
        <span>Página {page + 1} de {totalPages}</span>
        <button disabled={page + 1 >= totalPages} onClick={() => setPage(p => p + 1)}>Siguiente</button>
      </div>

      <ConfirmModal
        open={confirmOpen}
        title="Confirmar reembolso"
        message={confirmPayload ? `¿Seguro que quieres confirmar el reembolso del stock “${confirmPayload.productName}”?` : ''}
        confirmText="Confirmar"
        cancelText="Cancelar"
        onConfirm={handleConfirm}
        onCancel={handleCancelConfirm}
        loading={confirmLoading}
      />

      <style jsx>{`
        .table-wrapper { overflow:hidden; background: rgba(22,22,22,0.6); border:1px solid rgba(255,255,255,0.06); border-radius:12px; padding:12px; }
        .table-scroll { overflow:auto; border-radius:8px; }
        table.styled-table { width:100%; border-collapse:separate; border-spacing: 0 12px; color:#e1e1e1; min-width: 1080px; }
        thead tr { background: rgba(30,30,30,0.8); text-transform:uppercase; letter-spacing:0.06em; color:#cfcfcf; font-size:0.72rem; }
        thead th { padding:10px; text-align:center; font-weight:700; }
        tbody td { padding:0; text-align:center; }
        .row-inner { display:flex; align-items:center; justify-content:center; gap:12px; padding:12px; background-color: rgba(22,22,22,0.6); border-radius:12px; min-height:36px; }
        .row-inner.index { justify-content:center; width:36px; height:36px; padding:0; }
        .td-name { white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .password-cell { display:flex; align-items:center; gap:8px; }
        .pw-btn { background:none; border:none; color:#9fb4c8; cursor:pointer; }

        .actions { display:flex; gap:8px; justify-content:center; align-items:center; }
        .btn-confirm {
          padding: 8px;
          border-radius: 8px;
          min-width: 36px;
          height: 36px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border: none;
          cursor: pointer;
          font-weight: 700;
          background: linear-gradient(135deg, #22c55e 0%, #10b981 100%);
          color: #0d0d0d;
        }

        .info { padding:28px; text-align:center; color:#cbd5e1; }
        .error { padding:28px; text-align:center; color:#fca5a5; }
        .pagination { display:flex; justify-content:center; align-items:center; gap:12px; margin-top:16px; }
        .pagination button { padding:6px 12px; border-radius:6px; border:none; cursor:pointer; }
        .pagination span { color:#cbd5e1; }
      `}</style>
    </div>
  )
}