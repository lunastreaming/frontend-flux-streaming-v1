'use client'

import { useEffect, useState, useMemo } from 'react'
import { FaEye, FaEyeSlash, FaWhatsapp } from 'react-icons/fa'

export default function PedidoTable({ search = '' }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [visiblePasswords, setVisiblePasswords] = useState(() => new Set())

  // paginación
  const [page, setPage] = useState(0)            // índice base 0
  const [totalPages, setTotalPages] = useState(0)
  const [totalElements, setTotalElements] = useState(0)

  const BASE_URL = process.env.NEXT_PUBLIC_API_URL || ''
  const SIZE = 50

  const formatDate = (value) => {
    if (!value) return '—'
    try {
      const d = new Date(value)
      if (Number.isNaN(d.getTime())) return '—'
      return d.toLocaleDateString()
    } catch { return '—' }
  }

  const formatDateUTC = (value) => {
  if (!value) return '—'
  try {
    const d = new Date(value)
    if (Number.isNaN(d.getTime())) return '—'
    return d.toLocaleString('es-PE', {
      timeZone: 'UTC',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  } catch { return '—' }
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

  const togglePasswordVisibility = (id) => {
    setVisiblePasswords(prev => {
      const copy = new Set(prev)
      if (copy.has(id)) copy.delete(id)
      else copy.add(id)
      return copy
    })
  }

  const fetchData = async (pageToLoad = 0) => {
    setLoading(true); setError(null)
    try {
      const token = localStorage.getItem('accessToken')
      const url = `${BASE_URL}/api/onrequest/support/client/in-process?page=${pageToLoad}&size=${SIZE}`
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (!res.ok) throw new Error(`Error ${res.status}`)
      const data = await res.json()

      // data es Page<StockResponse>
      setItems(data.content || [])
      setTotalPages(data.totalPages ?? 0)
      setTotalElements(data.totalElements ?? 0)
    } catch (err) {
      setError(err.message || 'Error al cargar datos')
      setItems([])
      setTotalPages(0)
      setTotalElements(0)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData(page) }, [page])

  const displayed = useMemo(() => {
    const q = (search || '').toLowerCase()
    return items.filter(i => (i.productName ?? '').toLowerCase().includes(q))
  }, [items, search])

  const goPrev = () => setPage(p => Math.max(0, p - 1))
  const goNext = () => setPage(p => (p + 1 < totalPages ? p + 1 : p))
  const jumpTo = (e) => {
    const val = Number(e.target.value) - 1
    if (!Number.isNaN(val) && val >= 0 && val < totalPages) setPage(val)
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
              <th>Cliente</th>
              <th>Celular</th>
              <th>Tipo Soporte</th>
              <th>Proveedor</th>
              <th>Detalle</th>
            </tr>
          </thead>
          <tbody>
            {displayed.map((row, idx) => {
              const isVisible = visiblePasswords.has(row.id)
              const masked = row.password ? '••••••••' : ''

              const whatsappMsg = `Hola ${row.clientName ?? ''} 👋🏻
🍿De ${row.productName ?? ''}🍿
✉ usuario: ${row.username ?? ''}
🔐 Contraseña: ${row.password ?? ''}
🌍 Url: ${row.url ?? ''}
👥 Perfil: ${row.numeroPerfil ?? ''}
🔐 Pin: ${row.pin ?? ''}`

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
                  <td><div className="row-inner index">{idx + 1 + page * SIZE}</div></td>
                  <td><div className="row-inner">{row.id}</div></td>
                  <td><div className="row-inner td-name">{row.productName}</div></td>
                  <td><div className="row-inner">{row.username}</div></td>
                  <td>
                    <div className="row-inner password-cell">
                      <div className="pw-text">{isVisible ? (row.password || '') : masked}</div>
                      <button onClick={() => togglePasswordVisibility(row.id)} className="pw-btn" aria-label="Mostrar/ocultar contraseña">
                        {isVisible ? <FaEyeSlash /> : <FaEye />}
                      </button>
                    </div>
                  </td>
                  <td><div className="row-inner">{row.url ?? ''}</div></td>
                  <td><div className="row-inner">{row.numeroPerfil ?? ''}</div></td>
                  <td><div className="row-inner">{row.pin ?? ''}</div></td>
                  <td><div className="row-inner">{formatDateLocal(row.startAt)}</div></td>
                  <td><div className="row-inner">{formatDateLocal(row.endAt)}</div></td>
                  <td><div className="row-inner">{row.clientName}</div></td>
                  <td>
                    <div className="row-inner whatsapp-cell">
                      <button className="wa-btn" onClick={onClickWhatsAppClient} aria-label="Enviar por WhatsApp">
                        <FaWhatsapp />
                      </button>
                      <div className="wa-number">{row.clientPhone}</div>
                    </div>
                  </td>
                  <td><div className="row-inner">{row.supportType ?? '—'}</div></td>
                  <td><div className="row-inner">{row.providerName}</div></td>
                  <td><div className="row-inner">{row.supportResolutionNote ?? '—'}</div></td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Controles de paginación */}
      <div className="pagination">
        <button disabled={page === 0} onClick={goPrev}>Anterior</button>
        <span>Página {page + 1} de {Math.max(totalPages, 1)} • Total: {totalElements}</span>
        <button disabled={page + 1 >= totalPages} onClick={goNext}>Siguiente</button>
      </div>

      <div className="pagination-extra">
        <label htmlFor="jump">Ir a página:</label>
        <input
          id="jump"
          type="number"
          min={1}
          max={Math.max(totalPages, 1)}
          onChange={jumpTo}
          placeholder="N°"
        />
      </div>

      <style jsx>{`
        .table-wrapper { overflow:hidden; background: rgba(22,22,22,0.6); border:1px solid rgba(255,255,255,0.06); border-radius:12px; padding:12px; }
        .table-scroll { overflow:auto; border-radius:8px; }
        table.styled-table { width:100%; border-collapse:separate; border-spacing: 0 12px; color:#e1e1e1; min-width: 980px; }
        thead tr { background: rgba(30,30,30,0.8); text-transform:uppercase; letter-spacing:0.06em; color:#cfcfcf; font-size:0.72rem; }
        thead th { padding:10px; text-align:center; font-weight:700; }
        tbody td { padding:0; text-align:center; }
        .row-inner { display:flex; align-items:center; justify-content:center; gap:12px; padding:12px; background-color: rgba(22,22,22,0.6); border-radius:12px; min-height:36px; }
        .row-inner.index { justify-content:center; width:36px; height:36px; padding:0; }
        .td-name { white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .password-cell { display:flex; align-items:center; gap:8px; }
        .pw-btn { background:none; border:none; color:#9fb4c8; cursor:pointer; }
        .wa-btn { width:28px; height:28px; border-radius:50%; background:#25d366; color:#fff; border:none; cursor:pointer; display:flex; align-items:center; justify-content:center; }
        .wa-number { font-size:12px; margin-top:4px; color:#cbd5e1; }
        .info { padding:28px; text-align:center; color:#cbd5e1; }
        .error { padding:28px; text-align:center; color:#fca5a5; }
        .pagination { display:flex; justify-content:center; align-items:center; gap:12px; margin-top:16px; color:#cbd5e1; }
        .pagination button { padding:6px 12px; border-radius:6px; border:none; cursor:pointer; }
        .pagination-extra { display:flex; justify-content:center; align-items:center; gap:12px; margin-top:8px; color:#cbd5e1; }
        .pagination-extra input { width:80px; padding:6px 8px; border-radius:6px; border:1px solid rgba(255,255,255,0.12); background: rgba(255,255,255,0.04); color:#fff; }
      `}</style>
    </div>
  )
}