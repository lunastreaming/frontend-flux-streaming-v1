// pages/supplier/stocks.js
import { useState, useEffect } from 'react'
import StockModal from '../../components/StockModal'
import ConfirmModal from '../../components/ConfirmModal'
import { FaEdit, FaTrashAlt, FaPlus, FaSearch, FaUpload, FaRedoAlt } from 'react-icons/fa'

export default function StocksPage() {
  const [stocks, setStocks] = useState([])
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingStock, setEditingStock] = useState(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmPayload, setConfirmPayload] = useState({ id: null, name: '', action: '', stock: null })
  const [confirmLoading, setConfirmLoading] = useState(false)

  // Paginación
  const [page, setPage] = useState(0)
  const [size] = useState(50) // 50 por página
  const [totalPages, setTotalPages] = useState(1)
  const [totalElements, setTotalElements] = useState(0)

  const BASE_URL = process.env.NEXT_PUBLIC_API_URL

  useEffect(() => {
    fetchStocks(page)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page])

  function getAuthHeaders() {
    const token = localStorage.getItem('accessToken')
    if (!token) return null
    return { Authorization: `Bearer ${token}` }
  }

  function normalizeStock(raw) {
    if (!raw) return null
    const s = raw?.stock ?? raw
    const profileNumber =
      s?.numeroPerfil ?? s?.profileNumber ?? s?.numberProfile ?? s?.numero_perfil ?? null

    const statusString = s?.status ?? (typeof s?.published !== 'undefined' ? (s.published ? 'active' : 'inactive') : null)
    const publishedBool = typeof s?.published !== 'undefined' ? s.published : (statusString ? statusString.toLowerCase() === 'active' : false)

    return {
      id: s?.id ?? raw?.id ?? null,
      productId: s?.productId ?? raw?.productId ?? s?.product_id ?? raw?.product_id ?? null,
      productName: s?.productName ?? raw?.productName ?? raw?.product?.name ?? s?.product?.name ?? null,
      username: s?.username ?? raw?.username ?? null,
      password: s?.password ?? raw?.password ?? null,
      url: s?.url ?? raw?.url ?? null,
      tipo: s?.tipo ?? raw?.tipo ?? null,
      profileNumber: profileNumber,
      pin: s?.pin ?? raw?.pin ?? null,
      status: statusString,
      published: publishedBool,
      raw: raw
    }
  }

  const fetchStocks = async (p = 0) => {
    try {
      const headers = getAuthHeaders()
      if (!headers) return

      const res = await fetch(`${BASE_URL}/api/stocks/provider/me?page=${p}&size=${size}`, { headers })
      if (!res.ok) {
        const txt = await res.text().catch(() => '')
        console.error('[fetchStocks] fetch failed', res.status, txt)
        throw new Error(`Error ${res.status} ${txt}`)
      }

      const text = await res.text()
      const payload = text ? JSON.parse(text) : {}

      const content = Array.isArray(payload?.content) ? payload.content : (Array.isArray(payload) ? payload : [])
      const normalized = content.map(item => normalizeStock(item)).filter(Boolean)

      setStocks(normalized)
      setPage(Number(payload?.number ?? p))
      setTotalElements(Number(payload?.totalElements ?? payload?.total ?? content.length))
      const totalPagesCalc = Math.ceil((payload?.totalElements ?? content.length) / size) || 1
      setTotalPages(Number(payload?.totalPages ?? totalPagesCalc))
    } catch (err) {
      console.error('Error al cargar stocks:', err)
      setStocks([])
      setTotalElements(0)
      setTotalPages(1)
    }
  }

  const filtered = stocks.filter(s => {
    const status = (s.status ?? '').toLowerCase()
    const isVisible = status === 'active' || status === 'inactive'
    const productName = (s.productName ?? s.name ?? '').toString().toLowerCase()
    return isVisible && productName.includes(search.toLowerCase())
  })

  const confirmToggleStatus = (stock) => {
    const currentStatus = (stock?.status ?? (stock.published ? 'active' : 'inactive'))?.toString().toLowerCase()
    const target = currentStatus === 'active' ? 'inactive' : 'active'
    setConfirmPayload({
      id: stock.id,
      name: stock.productName ?? stock.name ?? '',
      action: 'toggleStatus',
      stock: { ...stock, targetStatus: target }
    })
    setConfirmOpen(true)
  }

  const confirmRemove = (stock) => {
    setConfirmPayload({
      id: stock.id,
      name: stock.productName ?? stock.name ?? '',
      action: 'remove',
      stock
    })
    setConfirmOpen(true)
  }

  const handleConfirm = async () => {
    if (!confirmPayload || !confirmPayload.id) {
      setConfirmOpen(false)
      return
    }

    setConfirmLoading(true)

    try {
      const headers = getAuthHeaders()
      if (!headers) {
        alert('No autorizado. Inicia sesión nuevamente.')
        setConfirmLoading(false)
        setConfirmOpen(false)
        return
      }

      if (confirmPayload.action === 'toggleStatus') {
        const stock = confirmPayload.stock
        const targetStatus = stock.targetStatus || (stock.status === 'active' ? 'inactive' : 'active')

        const res = await fetch(`${BASE_URL}/api/stocks/${confirmPayload.id}/status`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            ...headers
          },
          body: JSON.stringify({ status: targetStatus })
        })

        if (!res.ok) {
          const txt = await res.text().catch(() => '')
          console.error('[handleConfirm][toggleStatus] failed', res.status, txt)
          throw new Error(`Error ${res.status} ${txt}`)
        }

        const updated = await res.json()
        const norm = normalizeStock(updated) ?? updated
        setStocks(prev => prev.map(s => s.id === (norm.id ?? updated.id) ? norm : s))

      } else if (confirmPayload.action === 'remove') {
        const res = await fetch(`${BASE_URL}/api/stocks/remove/${confirmPayload.id}`, {
          method: 'DELETE',
          headers: {
            ...headers
          }
        })
        if (!res.ok) {
          const txt = await res.text().catch(() => '')
          console.error('[handleConfirm][remove] failed', res.status, txt)
          throw new Error(`Error ${res.status} ${txt}`)
        }
        setStocks(prev => prev.filter(s => s.id !== confirmPayload.id))
      }

    } catch (err) {
      console.error('Error en acción confirmada:', err)
      alert('No se pudo completar la acción: ' + (err.message || err))
    } finally {
      setConfirmLoading(false)
      setConfirmOpen(false)
      setConfirmPayload({ id: null, name: '', action: '', stock: null })
    }
  }

  const handleCancelConfirm = () => {
    setConfirmOpen(false)
    setConfirmPayload({ id: null, name: '', action: '', stock: null })
  }

  const handleEdit = (stock) => {
    setEditingStock(stock)
    setShowModal(true)
  }

  const handleModalSuccess = (createdOrUpdated) => {
    if (!createdOrUpdated) {
      setShowModal(false)
      setEditingStock(null)
      return
    }

    if (Array.isArray(createdOrUpdated)) {
      const normalized = createdOrUpdated.map(item => normalizeStock(item) ?? item)
      setStocks(prev => [...normalized, ...prev])
    } else {
      const normalizedItem = normalizeStock(createdOrUpdated) ?? createdOrUpdated
      setStocks(prev => {
        const exists = prev.some(s => s.id === normalizedItem.id)
        if (exists) {
          return prev.map(s => s.id === normalizedItem.id ? normalizedItem : s)
        }
        return [normalizedItem, ...prev]
      })
    }

    setShowModal(false)
    setEditingStock(null)
  }

  const confirmMessage = () => {
    if (!confirmPayload) return ''
    if (confirmPayload.action === 'toggleStatus') {
      const target = confirmPayload.stock?.targetStatus ?? 'active'
      return `¿Seguro que quieres cambiar el estado de “${confirmPayload.name}” a ${target.toUpperCase()}?`
    }
    if (confirmPayload.action === 'remove') {
      return `¿Seguro que quieres eliminar el stock “${confirmPayload.name}”? Esta acción es irreversible.`
    }
    return ''
  }

  const confirmButtonText = () => {
    if (!confirmPayload) return 'Confirmar'
    if (confirmPayload.action === 'toggleStatus') {
      return confirmPayload.stock?.targetStatus === 'active' ? 'Publicar' : 'Dejar de publicar'
    }
    if (confirmPayload.action === 'remove') return 'Eliminar'
    return 'Confirmar'
  }

  const displayUrl = (rawUrl, max = 48) => {
    if (!rawUrl) return ''
    const s = String(rawUrl)
    if (s.length <= max) return s
    const start = s.slice(0, Math.floor(max * 0.6))
    const end = s.slice(-Math.floor(max * 0.4))
    return `${start}…${end}`
  }

  return (
    <div className="min-h-screen text-white font-inter">
      <main className="px-6 py-10 max-w-7xl mx-auto">
        <div className="header-row">
          <div className="search-bar">
            <FaSearch className="search-icon-inline" />
            <input
              type="text"
              placeholder="Buscar stock…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="search-input-inline"
            />
          </div>
          <button className="btn-primary" onClick={() => { setEditingStock(null); setShowModal(true) }}>
            <FaPlus className="btn-icon" />
            <span className="btn-text">AGREGAR STOCK</span>
          </button>
        </div>

        <StockModal
          visible={showModal}
          onClose={() => { setShowModal(false); setEditingStock(null) }}
          onSuccess={handleModalSuccess}
          initialData={editingStock}
        />

        <div className="table-wrapper">
          <table>
            <colgroup>
              <col style={{ width: '40px' }} />
              <col />
              <col style={{ width: '160px' }} />
              <col style={{ width: '140px' }} />
              <col />
              <col style={{ width: '100px' }} />
              <col style={{ width: '80px' }} />
              <col style={{ width: '140px' }} />
              <col style={{ width: '160px' }} />
            </colgroup>

            <thead>
              <tr className="thead-row">
                <th>#</th>
                <th>Nombre</th>
                <th>Usuario</th>
                <th>Password</th>
                <th>URL</th>
                <th>Nº Perfil</th>
                <th>PIN</th>
                <th>Estado</th>
                <th>Config</th>
              </tr>
            </thead>

            <tbody>
              {filtered.map((s, i) => (
                <tr key={s.id} className="body-row">
                  <td>
                    <div className="row-inner">{i + 1}</div>
                  </td>

                  <td>
                    <div className="row-inner td-name">{s.productName ?? s.name ?? ''}</div>
                  </td>

                  <td>
                    <div className="row-inner">{s.username ?? ''}</div>
                  </td>

                  <td>
                    <div className="row-inner" style={{ fontFamily: 'monospace', gap: 8 }}>
                      <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {s.password ?? ''}
                      </span>
                    </div>
                  </td>

                  <td>
                    <div className="row-inner url-cell">
                      {s.url ? (
                        <span className="url-text" title={s.url}>
                          {displayUrl(s.url, 48)}
                        </span>
                      ) : (
                        <span className="url-empty" aria-hidden="true"></span>
                      )}
                    </div>
                  </td>

                  <td>
                    <div className="row-inner">{s.profileNumber ?? ''}</div>
                  </td>

                  <td>
                    <div className="row-inner">{s.pin ?? ''}</div>
                  </td>

                  <td>
                    <div className="row-inner">
                      <span className={`status-badge ${(s.status ?? (s.published ? 'active' : 'inactive')).toLowerCase()}`}>
                        {(s.status ?? (s.published ? 'active' : 'inactive')).toUpperCase()}
                      </span>
                    </div>
                  </td>

                  <td>
                    <div className="row-inner actions">
                      {!(s.status ?? (s.published ? 'active' : 'inactive')) || (s.status ?? '').toLowerCase() !== 'active' ? (
                        <button className="btn-action" title="Publicar" onClick={() => confirmToggleStatus(s)}>
                          <FaUpload />
                        </button>
                      ) : (
                        <button className="btn-action" title="Despublicar" onClick={() => confirmToggleStatus(s)}>
                          <FaRedoAlt />
                        </button>
                      )}
                      <button className="btn-edit" title="Editar" onClick={() => handleEdit(s)}>
                        <FaEdit />
                      </button>
                        {(s.status ?? '').toLowerCase() === 'inactive' && (
    <button className="btn-delete" title="Eliminar" onClick={() => confirmRemove(s)}>
      <FaTrashAlt />
    </button>
  )}

                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        <div className="pager-row">
          <div className="pager-info">
            Mostrando {filtered.length} de {totalElements}
          </div>
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

        <ConfirmModal
          open={confirmOpen}
          title={confirmPayload.action === 'remove' ? 'Confirmar eliminación' : 'Confirmar cambio de estado'}
          message={confirmMessage()}
          confirmText={confirmButtonText()}
          cancelText="Cancelar"
          onConfirm={handleConfirm}
          onCancel={handleCancelConfirm}
          loading={confirmLoading}
        />
      </main>

      <style jsx>{`
        .header-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          margin-bottom: 32px;
        }

        .search-bar {
          display: flex;
          align-items: center;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 10px;
          padding: 0 12px;
          height: 38px;
          max-width: 420px;
          width: 100%;
          margin: 0 auto;
        }

        .search-icon-inline { color: #ccc; font-size: 0.85rem; margin-right: 8px; }

        .search-input-inline {
          flex: 1;
          background: transparent;
          border: none;
          color: #fff;
          font-size: 0.85rem;
          outline: none;
        }

        .btn-primary {
          height: 38px;
          display: inline-flex;
          align-items: center;
          gap: 10px;
          padding: 0 16px;
          background: linear-gradient(135deg, #06b6d4 0%, #8b5cf6 50%, #22c55e 100%);
          color: #0d0d0d;
          border: none;
          border-radius: 10px;
          font-weight: 800;
          font-size: 0.85rem;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          box-shadow: 0 12px 28px rgba(34,211,238,0.06), 0 6px 12px rgba(0,0,0,0.35);
          cursor: pointer;
        }

        .btn-icon { width: 18px; height: 18px; color: inherit; }
        .btn-text { font-weight: 800; font-size: 0.86rem; }

        .table-wrapper {
          overflow-x: auto;
          background: rgba(22,22,22,0.6);
          border: 1px solid rgba(255,255,255,0.08);
          backdrop-filter: blur(12px);
          border-radius: 12px;
          padding: 16px;
          box-shadow: 0 12px 24px rgba(0,0,0,0.4);
        }

        table { width: 100%; border-collapse: separate; border-spacing: 0 12px; color: #e1e1e1; table-layout: fixed; }

        thead tr {
          background: rgba(30,30,30,0.8);
          text-transform: uppercase;
          letter-spacing: 0.06em;
          color: #cfcfcf;
          font-size: 0.72rem;
          border-radius: 10px;
        }

        thead th {
          padding: 10px;
          text-align: left;
          font-weight: 700;
          vertical-align: middle;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        td {
          padding: 0;
          vertical-align: middle;
          overflow: hidden;
        }

        .row-inner {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px;
          background-color: rgba(22,22,22,0.6);
          border-radius: 12px;
          box-shadow: 0 6px 14px rgba(0,0,0,0.16) inset;
          min-height: 36px;
        }

        .td-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight:700; color:#fff; }

        .status-badge {
          display: inline-block;
          padding: 6px 10px;
          border-radius: 999px;
          font-size: 0.72rem;
          font-weight: 700;
        }
        .status-badge.active { background: rgba(34,197,94,0.12); color: #4ade80; }
        .status-badge.inactive { background: rgba(239,68,68,0.12); color: #ef4444; }

        .actions { display: flex; gap: 8px; justify-content: center; align-items: center; }

        .btn-action, .btn-edit, .btn-delete {
          padding: 8px;
          border-radius: 8px;
          min-width: 36px;
          height: 36px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          cursor: pointer;
          border: none;
          font-weight: 700;
        }

        .btn-action { background: linear-gradient(135deg, #06b6d4 0%, #8b5cf6 100%); color: #0d0d0d; }
        .btn-edit { background: linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%); color: #0d0d0d; }
        .btn-delete { background: linear-gradient(135deg, #ef4444 0%, #f87171 100%); color: #fff; }

        .url-cell { min-width: 0; }
        .url-text {
          color: inherit;
          display: inline-block;
          max-width: 100%;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .url-empty { display: inline-block; width: 0; height: 0; }

        @media (max-width: 980px) {
          col:nth-child(3) { width: 120px; }
          col:nth-child(4) { width: 120px; }
          col:nth-child(6) { width: 80px; }
          col:nth-child(7) { width: 64px; }
        }

        @media (max-width: 640px) {
          table, thead, tbody, th, td, tr { display: block; }
          thead { display: none; }
          tbody tr { margin-bottom: 12px; }
          td { padding: 0 12px; }
          .row-inner { padding: 10px; }
        }

        /* Paginación */
        .pager-row { display:flex; justify-content:space-between; align-items:center; margin-top:16px; }
        .pager-info { color:#cbd5e1; }
        .pager-controls { display:flex; gap:8px; }
        .pager-btn {
          padding:8px 12px;
          border-radius:8px;
          border:none;
          background:rgba(255,255,255,0.08);
          color:#e1e1e1;
          cursor:pointer;
          font-weight:700;
        }
        .pager-btn:disabled { opacity:0.45; cursor:not-allowed; }
      `}</style>
    </div>
  )
}