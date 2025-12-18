import { useState, useEffect } from 'react'
import StockModal from '../../components/StockModal'
import ConfirmModal from '../../components/ConfirmModal'
import { FaEdit, FaTrashAlt, FaPlus, FaSearch, FaUpload, FaRedoAlt, FaCheckDouble } from 'react-icons/fa'

export default function StocksPage() {
  const [stocks, setStocks] = useState([])
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingStock, setEditingStock] = useState(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmPayload, setConfirmPayload] = useState({ id: null, name: '', action: '', stock: null, customMessage: '' })
  const [confirmLoading, setConfirmLoading] = useState(false)

  // Paginación
  const [page, setPage] = useState(0)
  const [size] = useState(50) 
  const [totalPages, setTotalPages] = useState(1)
  const [totalElements, setTotalElements] = useState(0)

  // Selección múltiple
  const [selectedIds, setSelectedIds] = useState([])

  const BASE_URL = process.env.NEXT_PUBLIC_API_URL

  useEffect(() => {
    fetchStocks(page)
    setSelectedIds([]) 
  }, [page])

  function getAuthHeaders() {
    const token = localStorage.getItem('accessToken')
    return token ? { Authorization: `Bearer ${token}` } : null
  }

  function normalizeStock(raw) {
    if (!raw) return null
    const s = raw?.stock ?? raw
    const profileNumber = s?.numeroPerfil ?? s?.profileNumber ?? s?.numberProfile ?? s?.numero_perfil ?? null
    const statusString = (s?.status ?? (typeof s?.published !== 'undefined' ? (s.published ? 'active' : 'inactive') : 'inactive')).toLowerCase()
    
    return {
      id: s?.id ?? raw?.id ?? null,
      productName: s?.productName ?? raw?.productName ?? raw?.product?.name ?? s?.product?.name ?? null,
      username: s?.username ?? raw?.username ?? null,
      password: s?.password ?? raw?.password ?? null,
      url: s?.url ?? raw?.url ?? null,
      profileNumber: profileNumber,
      pin: s?.pin ?? raw?.pin ?? null,
      status: statusString,
      raw: raw
    }
  }

  const fetchStocks = async (p = 0) => {
    try {
      const headers = getAuthHeaders()
      if (!headers) return
      const res = await fetch(`${BASE_URL}/api/stocks/provider/me?page=${p}&size=${size}`, { headers })
      const payload = await res.json()
      const content = Array.isArray(payload?.content) ? payload.content : []
      setStocks(content.map(normalizeStock).filter(Boolean))
      setPage(Number(payload?.number ?? p))
      setTotalElements(Number(payload?.totalElements ?? content.length))
      setTotalPages(Number(payload?.totalPages ?? 1))
    } catch (err) {
      console.error(err)
      setStocks([])
    }
  }

  const filtered = stocks.filter(s => {
    const isVisible = s.status === 'active' || s.status === 'inactive'
    return isVisible && (s.productName ?? '').toLowerCase().includes(search.toLowerCase())
  })

  const selectableOnPage = filtered.filter(s => s.status === 'inactive')

  const handleSelectAll = (e) => {
    setSelectedIds(e.target.checked ? selectableOnPage.map(s => s.id) : [])
  }

  const handleSelectOne = (id, status) => {
    if (status !== 'inactive') return
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id])
  }

  // --- TRIGGERS CON MENSAJES DINÁMICOS ---

  const triggerBulkActivate = () => {
    setConfirmPayload({
      action: 'bulkActivate',
      id: 'bulk',
      customMessage: `Has seleccionado ${selectedIds.length} ítems para activar. Una vez activados, los clientes podrán comprarlos inmediatamente. ¿Deseas continuar?`
    })
    setConfirmOpen(true)
  }

  const triggerToggleStatus = (s) => {
    const target = s.status === 'active' ? 'inactive' : 'active'
    const verb = target === 'active' ? 'ACTIVAR' : 'DESACTIVAR'
    setConfirmPayload({
      id: s.id,
      name: s.productName,
      action: 'toggleStatus',
      stock: { ...s, targetStatus: target },
      customMessage: `¿Estás seguro de que deseas ${verb} el stock de "${s.productName}"?`
    })
    setConfirmOpen(true)
  }

  const triggerRemove = (s) => {
    setConfirmPayload({
      id: s.id,
      name: s.productName,
      action: 'remove',
      customMessage: `Estás a punto de ELIMINAR permanentemente el registro "${s.productName}". Esta acción no se puede deshacer. ¿Confirmas la eliminación?`
    })
    setConfirmOpen(true)
  }

  const handleConfirm = async () => {
    setConfirmLoading(true)
    try {
      const headers = getAuthHeaders()
      if (confirmPayload.action === 'bulkActivate') {
        const res = await fetch(`${BASE_URL}/api/stocks/bulk-activate`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', ...headers },
          body: JSON.stringify({ ids: selectedIds })
        })
        if (!res.ok) throw new Error("Error en activación masiva")
        setSelectedIds([])
      } else if (confirmPayload.action === 'toggleStatus') {
        await fetch(`${BASE_URL}/api/stocks/${confirmPayload.id}/status`, {
          method: 'PATCH', headers: { 'Content-Type': 'application/json', ...headers },
          body: JSON.stringify({ status: confirmPayload.stock.targetStatus })
        })
      } else if (confirmPayload.action === 'remove') {
        await fetch(`${BASE_URL}/api/stocks/remove/${confirmPayload.id}`, { method: 'DELETE', headers })
      }
      fetchStocks(page)
    } catch (err) { alert(err.message) }
    finally { setConfirmLoading(false); setConfirmOpen(false) }
  }

  const displayUrl = (u) => u ? (u.length > 35 ? u.substring(0, 32) + '...' : u) : ''

  return (
    <div className="min-h-screen text-white font-inter">
      <main className="px-6 py-10 max-w-7xl mx-auto">
        <div className="header-row">
          <div className="search-bar">
            <FaSearch className="search-icon-inline" />
            <input type="text" placeholder="Buscar stock…" value={search} onChange={e => setSearch(e.target.value)} className="search-input-inline" />
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            {selectedIds.length > 0 && (
              <button className="btn-bulk" onClick={triggerBulkActivate}>
                <FaCheckDouble style={{ marginRight: '8px' }} /> ACTIVAR ({selectedIds.length})
              </button>
            )}
            <button className="btn-primary" onClick={() => { setEditingStock(null); setShowModal(true) }}>
              <FaPlus /> <span className="btn-text">AGREGAR STOCK</span>
            </button>
          </div>
        </div>

        <div className="table-wrapper">
          <table>
            <colgroup>
              <col style={{ width: '45px' }} />
              <col style={{ width: '40px' }} />
              <col /> {/* Nombre */}
              <col style={{ width: '150px' }} /> {/* Usuario */}
              <col style={{ width: '130px' }} /> {/* Password */}
              <col /> {/* URL */}
              <col style={{ width: '100px' }} /> {/* Perfil */}
              <col style={{ width: '80px' }} /> {/* PIN */}
              <col style={{ width: '110px' }} /> {/* Estado */}
              <col style={{ width: '150px' }} /> {/* Configuración */}
            </colgroup>
            <thead>
              <tr className="thead-row">
                <th><input type="checkbox" onChange={handleSelectAll} checked={selectableOnPage.length > 0 && selectedIds.length === selectableOnPage.length} disabled={selectableOnPage.length === 0}/></th>
                <th>#</th>
                <th>Nombre</th>
                <th>Usuario</th>
                <th>Password</th>
                <th>URL</th>
                <th>Nº Perfil</th>
                <th>PIN</th>
                <th>Estado</th>
                <th>Configuración</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s, i) => (
                <tr key={s.id} className="body-row">
                  <td><div className="row-inner"><input type="checkbox" checked={selectedIds.includes(s.id)} onChange={() => handleSelectOne(s.id, s.status)} disabled={s.status !== 'inactive'} /></div></td>
                  <td><div className="row-inner">{i + 1}</div></td>
                  <td><div className="row-inner td-name">{s.productName}</div></td>
                  <td><div className="row-inner">{s.username}</div></td>
                  <td><div className="row-inner" style={{fontFamily:'monospace'}}>{s.password}</div></td>
                  <td><div className="row-inner url-text">{displayUrl(s.url)}</div></td>
                  <td><div className="row-inner">{s.profileNumber || '-'}</div></td>
                  <td><div className="row-inner">{s.pin || '-'}</div></td>
                  <td><div className="row-inner"><span className={`status-badge ${s.status}`}>{s.status?.toUpperCase()}</span></div></td>
                  <td>
                    <div className="row-inner actions">
                      <button className="btn-action" title="Cambiar estado" onClick={() => triggerToggleStatus(s)}>
                        {s.status === 'active' ? <FaRedoAlt /> : <FaUpload />}
                      </button>
                      <button className="btn-edit" title="Editar" onClick={() => { setEditingStock(s); setShowModal(true); }}>
                        <FaEdit />
                      </button>
                      {s.status === 'inactive' && (
                        <button className="btn-delete" title="Eliminar" onClick={() => triggerRemove(s)}>
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

        <div className="pager-row">
          <div className="pager-info">Mostrando {filtered.length} de {totalElements}</div>
          <div className="pager-controls">
            <button onClick={() => setPage(p => p - 1)} disabled={page <= 0} className="pager-btn">Anterior</button>
            <button onClick={() => setPage(p => p + 1)} disabled={page >= totalPages - 1} className="pager-btn">Siguiente</button>
          </div>
        </div>

        <ConfirmModal 
          open={confirmOpen} 
          title={confirmPayload.action === 'bulkActivate' ? 'Activación Masiva' : (confirmPayload.action === 'remove' ? 'Eliminar Stock' : 'Confirmar Cambio')} 
          message={confirmPayload.customMessage} 
          onConfirm={handleConfirm} 
          onCancel={() => setConfirmOpen(false)} 
          loading={confirmLoading} 
        />
        
        <StockModal visible={showModal} onClose={() => setShowModal(false)} onSuccess={() => fetchStocks(page)} initialData={editingStock} />
      </main>

      <style jsx>{`
        .header-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 32px; }
        .search-bar { display: flex; align-items: center; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; padding: 0 12px; height: 38px; width: 100%; max-width: 420px; }
        .search-input-inline { flex: 1; background: transparent; border: none; color: #fff; font-size: 0.85rem; outline: none; }
        .btn-primary { height: 38px; display: inline-flex; align-items: center; gap: 10px; padding: 0 16px; background: linear-gradient(135deg, #06b6d4 0%, #8b5cf6 50%, #22c55e 100%); color: #000; border: none; border-radius: 10px; font-weight: 800; font-size: 0.85rem; text-transform: uppercase; cursor: pointer; }
        .btn-bulk { height: 38px; padding: 0 16px; background: #22c55e; color: #000; border: none; border-radius: 10px; font-weight: bold; cursor: pointer; box-shadow: 0 4px 12px rgba(34, 197, 94, 0.4); }
        .table-wrapper { overflow-x: auto; background: rgba(22,22,22,0.6); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 16px; backdrop-filter: blur(12px); }
        table { width: 100%; border-collapse: separate; border-spacing: 0 12px; min-width: 1300px; }
        thead th { padding: 10px; text-align: left; color: #cfcfcf; font-size: 0.72rem; text-transform: uppercase; }
        .row-inner { display: flex; align-items: center; gap: 12px; padding: 12px; background: rgba(22,22,22,0.6); border-radius: 12px; min-height: 36px; color: #fff; font-size: 0.85rem; }
        .url-text { color: #ccc; }
        .td-name { font-weight: 700; }
        .status-badge { padding: 6px 10px; border-radius: 999px; font-size: 0.72rem; font-weight: 700; }
        .status-badge.active { background: rgba(34,197,94,0.12); color: #4ade80; }
        .status-badge.inactive { background: rgba(239,68,68,0.12); color: #ef4444; }
        .actions { display: flex; gap: 8px; }
        .btn-action, .btn-edit, .btn-delete { padding: 8px; border-radius: 8px; cursor: pointer; border: none; color: #000; }
        .btn-action { background: linear-gradient(135deg, #06b6d4, #8b5cf6); }
        .btn-edit { background: linear-gradient(135deg, #f59e0b, #fbbf24); }
        .btn-delete { background: linear-gradient(135deg, #ef4444, #f87171); color: white; }
        .pager-btn { padding: 8px 12px; border-radius: 8px; background: rgba(255,255,255,0.08); color: #fff; border: none; cursor: pointer; }
        .pager-btn:disabled { opacity: 0.4; }
        @media (max-width: 640px) { .btn-text { display: none; } }
      `}</style>
    </div>
  )
}