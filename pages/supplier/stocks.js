// pages/supplier/stocks.js
import { useState, useEffect } from 'react'
import NavbarSupplier from '../../components/NavBarSupplier'
import StockModal from '../../components/StockModal'
import ConfirmModal from '../../components/ConfirmModal'
import { FaEdit, FaTrashAlt, FaPlus, FaSearch, FaUpload, FaRedoAlt } from 'react-icons/fa'

export default function StocksPage() {
  const [stocks, setStocks] = useState([])
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingStock, setEditingStock] = useState(null)

  // confirm modal state
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmPayload, setConfirmPayload] = useState({ id: null, name: '', action: '' })
  const [confirmLoading, setConfirmLoading] = useState(false)

  const BASE_URL = process.env.NEXT_PUBLIC_API_URL

  useEffect(() => {
    fetchStocks()
  }, [])

  const fetchStocks = async () => {
    try {
      const token = localStorage.getItem('accessToken')
      const res = await fetch(`${BASE_URL}/api/stocks/provider/me`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (!res.ok) throw new Error(`Error ${res.status}`)
      const text = await res.text()
      const data = text ? JSON.parse(text) : []
      setStocks(data)
    } catch (err) {
      console.error('Error al cargar stocks:', err)
    }
  }

  // filter by productName (primary) and fallback to name for compatibility
  const filtered = stocks.filter(s => {
    const productName = (s.productName ?? s.name ?? '').toString().toLowerCase()
    return productName.includes(search.toLowerCase())
  })

  const handlePublish = async (stock) => {
    try {
      const token = localStorage.getItem('accessToken')
      const res = await fetch(`${BASE_URL}/api/stocks/${stock.id}/publish`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ published: true })
      })
      if (!res.ok) {
        const txt = await res.text().catch(() => '')
        throw new Error(`Error ${res.status} ${txt}`)
      }
      const updated = await res.json()
      setStocks(prev => prev.map(s => s.id === updated.id ? updated : s))
    } catch (err) {
      console.error('Error al publicar stock:', err)
      alert('No se pudo publicar el stock: ' + err.message)
    }
  }

  const handleUnpublish = async (stock) => {
    try {
      const token = localStorage.getItem('accessToken')
      const res = await fetch(`${BASE_URL}/api/stocks/${stock.id}/publish`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ published: false })
      })
      if (!res.ok) {
        const txt = await res.text().catch(() => '')
        throw new Error(`Error ${res.status} ${txt}`)
      }
      const updated = await res.json()
      setStocks(prev => prev.map(s => s.id === updated.id ? updated : s))
    } catch (err) {
      console.error('Error al cambiar publicado:', err)
      alert('No se pudo cambiar el estado: ' + err.message)
    }
  }

  // confirm delete
  const confirmDelete = (stock) => {
    // prefer productName for user-facing confirmation
    setConfirmPayload({ id: stock.id, name: stock.productName ?? stock.name ?? '', action: 'delete' })
    setConfirmOpen(true)
  }

  const handleConfirm = async () => {
    if (!confirmPayload || !confirmPayload.id) {
      setConfirmOpen(false)
      return
    }
    if (confirmPayload.action !== 'delete') {
      setConfirmOpen(false)
      return
    }

    setConfirmLoading(true)
    try {
      const token = localStorage.getItem('accessToken')
      const res = await fetch(`${BASE_URL}/api/stocks/${confirmPayload.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      })
      if (!res.ok) {
        const txt = await res.text().catch(() => '')
        throw new Error(`Error ${res.status} ${txt}`)
      }
      setStocks(prev => prev.filter(s => s.id !== confirmPayload.id))
    } catch (err) {
      console.error('Error al eliminar stock:', err)
      alert('No se pudo eliminar el stock: ' + err.message)
    } finally {
      setConfirmLoading(false)
      setConfirmOpen(false)
      setConfirmPayload({ id: null, name: '', action: '' })
    }
  }

  const handleCancelConfirm = () => {
    setConfirmOpen(false)
    setConfirmPayload({ id: null, name: '', action: '' })
  }

  const handleEdit = (stock) => {
    setEditingStock(stock)
    setShowModal(true)
  }

  const handleModalSuccess = (createdOrUpdated) => {
    setStocks(prev => {
      const exists = prev.some(s => s.id === createdOrUpdated.id)
      if (exists) {
        return prev.map(s => s.id === createdOrUpdated.id ? createdOrUpdated : s)
      }
      return [createdOrUpdated, ...prev]
    })
    setShowModal(false)
    setEditingStock(null)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 text-white font-inter">
      <NavbarSupplier />

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

                  {/* show productName when available, fallback to name */}
                  <td>
                    <div className="row-inner td-name">{s.productName ?? s.name ?? '—'}</div>
                  </td>

                  <td>
                    <div className="row-inner">{s.username ?? '—'}</div>
                  </td>

                  <td>
                    <div className="row-inner" style={{ fontFamily: 'monospace' }}>
                      {s.password ? '••••••' : '—'}
                    </div>
                  </td>

                  <td>
                    <div className="row-inner" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {s.url ?? '—'}
                    </div>
                  </td>

                  <td>
                    <div className="row-inner">{s.profileNumber ?? '—'}</div>
                  </td>

                  <td>
                    <div className="row-inner">{s.pin ?? '—'}</div>
                  </td>

                  <td>
                    <div className="row-inner">
                      <span className={`status-badge ${s.published ? 'active' : 'inactive'}`}>
                        {s.published ? 'PUBLICADO' : 'NO PUBLICADO'}
                      </span>
                    </div>
                  </td>

                  <td>
                    <div className="row-inner actions">
                      {!s.published ? (
                        <button className="btn-action" title="Publicar" onClick={() => handlePublish(s)}>
                          <FaUpload />
                        </button>
                      ) : (
                        <button className="btn-action" title="Despublicar" onClick={() => handleUnpublish(s)}>
                          <FaRedoAlt />
                        </button>
                      )}
                      <button className="btn-edit" title="Editar" onClick={() => handleEdit(s)}>
                        <FaEdit />
                      </button>
                      <button className="btn-delete" title="Eliminar" onClick={() => confirmDelete(s)}>
                        <FaTrashAlt />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <ConfirmModal
          open={confirmOpen}
          title="Confirmar eliminación"
          message={`¿Seguro que quieres eliminar el stock “${confirmPayload.name}”?`}
          confirmText="Eliminar"
          cancelText="Cancelar"
          onConfirm={handleConfirm}
          onCancel={handleCancelConfirm}
          loading={confirmLoading}
        />

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

          tbody tr {
            /* keep semantic table rows; we'll style cells using .row-inner */
          }

          td {
            padding: 0; /* padding is handled inside .row-inner */
            vertical-align: middle;
            overflow: hidden;
          }

          /* visual wrapper inside each td so we can keep the rounded card look per row */
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

          @media (max-width: 980px) {
            /* allow columns to adjust on medium screens */
            col:nth-child(3) { width: 120px; }
            col:nth-child(4) { width: 120px; }
            col:nth-child(6) { width: 80px; }
            col:nth-child(7) { width: 64px; }
          }

          @media (max-width: 640px) {
            /* stack content on small screens */
            table, thead, tbody, th, td, tr { display: block; }
            thead { display: none; }
            tbody tr { margin-bottom: 12px; }
            td { padding: 0 12px; }
            .row-inner { padding: 10px; }
          }
        `}</style>
      </main>
    </div>
  )
}