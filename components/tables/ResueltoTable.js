'use client'

import { useEffect, useState } from 'react'
import { FaCheckCircle } from 'react-icons/fa'

export default function ResueltoTable() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const BASE_URL = process.env.NEXT_PUBLIC_API_URL || ''

  const normalize = (rows) =>
    (Array.isArray(rows) ? rows : []).map((t, idx) => ({
      id: t.id ?? idx,
      productName: t.productName ?? '',
      clientName: t.clientName ?? '',
      clientPhone: t.clientPhone ?? '',
      providerName: t.providerName ?? '',
      supportId: t.supportId ?? t.id ?? null,
      supportResolutionNote: t.supportResolutionNote ?? '',
      supportStatus: (t.supportStatus ?? 'IN_PROCESS').toUpperCase()
    }))

  const fetchData = async () => {
    setLoading(true); setError(null)
    try {
      const token = localStorage.getItem('accessToken')
      const res = await fetch(`${BASE_URL}/api/support/client/in-process`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (!res.ok) throw new Error(`Error ${res.status}`)
      const data = await res.json()
      setItems(normalize(data))
    } catch (err) {
      setError(err.message || String(err))
      setItems([])
    } finally {
      setLoading(false)
    }
  }

  const approveTicket = async (supportId) => {
    if (!supportId) { alert('supportId inválido'); return }
    try {
      const token = localStorage.getItem('accessToken')
      const url = `${BASE_URL}/api/support/${encodeURIComponent(supportId)}/approve`
      console.log('PATCH URL:', url)
      const res = await fetch(url, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ approvalNote: 'Cliente aprueba resolución' })
      })
      if (!res.ok) throw new Error(`Error ${res.status}`)
      await fetchData()
    } catch (err) {
      alert(err.message || 'Error al aprobar ticket')
    }
  }

  useEffect(() => { fetchData() }, [])

  if (loading) return <div className="info">Cargando…</div>
  if (error) return <div className="error">Error: {error}</div>

  return (
    <div className="table-wrapper">
      <div className="table-header">
        <FaCheckCircle className="icon-large" />
        <span className="title">Tickets en proceso (Resuelto)</span>
      </div>

      <div className="table-scroll">
        <table className="styled-table">
          <colgroup>
            <col style={{ width: '60px' }} />
            <col style={{ width: '240px' }} />
            <col style={{ width: '180px' }} />
            <col style={{ width: '140px' }} />
            <col style={{ width: '180px' }} />
            <col />
            <col style={{ width: '120px' }} />
          </colgroup>

          <thead>
            <tr>
              <th>#</th>
              <th>Producto</th>
              <th>Cliente</th>
              <th>Celular</th>
              <th>Proveedor</th>
              <th>Detalle solución</th>
              <th>Acción</th>
            </tr>
          </thead>

          <tbody>
            {items.map((row, idx) => (
              <tr key={`${row.supportId}-${idx}`}>
                <td><div className="row-inner index">{idx + 1}</div></td>
                <td><div className="row-inner td-name" title={row.productName}>{row.productName}</div></td>
                <td><div className="row-inner">{row.clientName || ''}</div></td>
                <td><div className="row-inner">{row.clientPhone || ''}</div></td>
                <td><div className="row-inner">{row.providerName || ''}</div></td>
                <td><div className="row-inner">{row.supportResolutionNote || '—'}</div></td>
                <td>
                  <div className="row-inner">
                    <button
                      className="approve-btn"
                      title="Aprobar ticket"
                      onClick={() => approveTicket(row.supportId)}
                    >
                      <FaCheckCircle />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <style jsx>{`
        .table-wrapper { overflow:hidden; background: rgba(22,22,22,0.6); border:1px solid rgba(255,255,255,0.06); border-radius:12px; padding:12px; }
        .table-header { display:flex; align-items:center; gap:10px; padding:8px 4px 16px; color:#cfe7ff; }
        .icon-large { font-size: 18px; }
        .title { font-weight:700; letter-spacing:0.02em; }
        .table-scroll { overflow:auto; border-radius:8px; }
        table.styled-table { width:100%; border-collapse:separate; border-spacing: 0 12px; color:#e1e1e1; min-width: 980px; }
        thead tr { background: rgba(30,30,30,0.8); text-transform:uppercase; letter-spacing:0.06em; color:#cfcfcf; font-size:0.72rem; }
        thead th { padding:10px; text-align:center; font-weight:700; }
        tbody td { padding:0; vertical-align:middle; text-align:center; }
        .row-inner { display:flex; align-items:center; justify-content:center; gap:12px; padding:12px; background-color: rgba(22,22,22,0.6); border-radius:12px; min-height:36px; }
        .row-inner.index { justify-content:center; width:36px; height:36px; padding:0; }
        .td-name { white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .approve-btn {
          width:36px; height:36px; display:inline-grid; place-items:center;
          border-radius:8px; background: linear-gradient(90deg,#10b981,#06b6d4);
          color:#fff; border:none; cursor:pointer;
        }
        .info { padding:28px; text-align:center; color:#cbd5e1; }
        .error { padding:28px; text-align:center; color:#fca5a5; }
      `}</style>
    </div>
  )
}