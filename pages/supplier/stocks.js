import { useState, useEffect } from 'react'
import StockModal from '../../components/StockModal'
import ConfirmModal from '../../components/ConfirmModal'
import { FaEdit, FaTrashAlt, FaPlus, FaSearch, FaUpload, FaRedoAlt, FaCheckDouble, FaChevronLeft, FaChevronRight, FaTrash } from 'react-icons/fa'

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

  const [selectedIds, setSelectedIds] = useState([])
  const BASE_URL = process.env.NEXT_PUBLIC_API_URL

  useEffect(() => {
    fetchStocks(page, search)
    setSelectedIds([]) 
  }, [page, search])

  function getAuthHeaders() {
    const token = localStorage.getItem('accessToken')
    return token ? { Authorization: `Bearer ${token}` } : null 
  }

  function normalizeStock(raw) {
    if (!raw) return null
    const s = raw?.stock ?? raw 
    return {
      id: s?.id ?? raw?.id ?? null, 
      productName: s?.productName ?? raw?.productName ?? raw?.product?.name ?? s?.product?.name ?? null,
      username: s?.username ?? raw?.username ?? null, 
      password: s?.password ?? raw?.password ?? null, 
      url: s?.url ?? raw?.url ?? null,
      profileNumber: s?.numeroPerfil ?? s?.profileNumber ?? s?.numberProfile ?? s?.numero_perfil ?? null,
      pin: s?.pin ?? raw?.pin ?? null,
      status: (s?.status ?? (s?.published ? 'active' : 'inactive')).toLowerCase(),
      raw: raw
    }
  }

  const fetchStocks = async (p = 0, searchTerm = '') => {
    try {
      const headers = getAuthHeaders()
      if (!headers) return
      
      const res = await fetch(`${BASE_URL}/api/stocks/provider/me?page=${p}&size=${size}&search=${searchTerm}`, { headers })
      const payload = await res.json()
      
      const content = Array.isArray(payload?.content) ? payload.content : []
      
      setStocks(content.map(normalizeStock).filter(Boolean))
      setPage(Number(payload?.number ?? p))
      setTotalElements(Number(payload?.totalElements ?? content.length))
      setTotalPages(Number(payload?.totalPages ?? 1))
    } catch (err) {
      console.error('Error al cargar stocks:', err)
    }
  }

  const filtered = stocks.filter(s => s.status === 'active' || s.status === 'inactive')

  // --- MEJORA DE LÓGICA DE SELECCIÓN ---
  
  // Ahora todos los elementos filtrados son seleccionables
  const handleSelectAll = (e) => {
    setSelectedIds(e.target.checked ? filtered.map(s => s.id) : [])
  }

  const handleSelectOne = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id])
  }

  // Identificamos cuáles de los seleccionados están inactivos
  const selectedStocks = filtered.filter(s => selectedIds.includes(s.id))
  const allSelectedAreInactive = selectedIds.length > 0 && selectedStocks.every(s => s.status === 'inactive')

  // --- ACCIONES ---

  const triggerBulkActivate = () => {
    setConfirmPayload({
      action: 'bulkActivate',
      customMessage: `Has seleccionado ${selectedIds.length} ítems. Al activarlos, estarán disponibles para la venta. ¿Deseas continuar?`
    })
    setConfirmOpen(true)
  }

  const triggerBulkRemove = () => {
    setConfirmPayload({
      action: 'bulkRemove',
      customMessage: `¿Estás seguro de que deseas eliminar permanentemente los ${selectedIds.length} stocks seleccionados?`
    })
    setConfirmOpen(true)
  }

  const triggerToggleStatus = (s) => {
    const target = s.status === 'active' ? 'inactive' : 'active' 
    setConfirmPayload({
      id: s.id, name: s.productName, action: 'toggleStatus', stock: { ...s, targetStatus: target },
      customMessage: `¿Seguro que quieres cambiar el estado de "${s.productName}" a ${target.toUpperCase()}?`
    })
    setConfirmOpen(true)
  }

  const handleConfirm = async () => {
    setConfirmLoading(true)
    try {
      const headers = getAuthHeaders()
      if (confirmPayload.action === 'bulkActivate') {
        await fetch(`${BASE_URL}/api/stocks/bulk-activate`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', ...headers },
          body: JSON.stringify({ ids: selectedIds })
        })
        setSelectedIds([])
      } else if (confirmPayload.action === 'bulkRemove') {
        await fetch(`${BASE_URL}/api/stocks/remove-multiple`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json', ...headers },
          body: JSON.stringify(selectedIds)
        })
        setSelectedIds([])
      } else if (confirmPayload.action === 'toggleStatus') {
        await fetch(`${BASE_URL}/api/stocks/${confirmPayload.id}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', ...headers },
          body: JSON.stringify({ status: confirmPayload.stock.targetStatus })
        })
      } else if (confirmPayload.action === 'remove') {
        await fetch(`${BASE_URL}/api/stocks/remove/${confirmPayload.id}`, { method: 'DELETE', headers })
      }
      fetchStocks(page, search)
    } catch (err) { 
      alert(err.message) 
    } finally { 
      setConfirmLoading(false);
      setConfirmOpen(false) 
    }
  }

  const displayUrl = (u) => u ? (u.length > 48 ? u.substring(0, 28) + '…' + u.slice(-16) : u) : '' 

  return (
    <div className="min-h-screen text-white font-inter">
      <main className="px-6 py-10 max-w-7xl mx-auto">
        <div className="header-row"> 
          <div className="search-bar">
            <FaSearch className="search-icon-inline" />
            <input type="text" placeholder="Buscar stock…" value={search} onChange={e => setSearch(e.target.value)} className="search-input-inline" /> 
          </div>
          <div className="header-actions">
            {/* Solo mostramos los botones masivos si TODOS los seleccionados son inactivas */}
            {allSelectedAreInactive && (
              <>
                <button className="btn-bulk-delete" onClick={triggerBulkRemove}>
                  <FaTrash className="btn-icon" />
                  <span className="btn-text">ELIMINAR ({selectedIds.length})</span>
                </button>
                <button className="btn-bulk" onClick={triggerBulkActivate}>
                  <FaCheckDouble className="btn-icon" />
                  <span className="btn-text">ACTIVAR ({selectedIds.length})</span>
                </button>
              </>
            )}
            
            {/* Si hay seleccionados pero algunos están activos, mostramos un aviso sutil o simplemente no mostramos las acciones masivas de 'inactive' */}
            {selectedIds.length > 0 && !allSelectedAreInactive && (
                <span style={{ fontSize: '0.75rem', color: '#999', display: 'flex', alignItems: 'center' }}>
                    Selección mixta (acciones masivas deshabilitadas)
                </span>
            )}

            <button className="btn-primary" onClick={() => { setEditingStock(null); setShowModal(true) }}>
              <FaPlus className="btn-icon" />
              <span className="btn-text">AGREGAR STOCK</span>
            </button>
          </div>
        </div>

        {/* --- PAGINACIÓN SUPERIOR --- */}
        <div className="pagination-wrapper" style={{ marginBottom: '16px' }}>
          <div className="pagination-info">
            Mostrando <b>{stocks.length}</b> de <b>{totalElements}</b> registros
          </div>
          <div className="pagination-controls">
            <button className="btn-pagination" onClick={() => setPage(prev => Math.max(0, prev - 1))} disabled={page === 0}>
              <FaChevronLeft /> Anterior
            </button>
            <span className="page-indicator">Página <b>{page + 1}</b> de <b>{totalPages}</b></span>
            <button className="btn-pagination" onClick={() => setPage(prev => Math.min(totalPages - 1, prev + 1))} disabled={page >= totalPages - 1}>
              Siguiente <FaChevronRight />
            </button>
          </div>
        </div>

        <div className="table-wrapper"> 
          <table> 
            <thead>
              <tr className="thead-row">
                <th style={{ width: '45px' }}>
                  <input 
                    type="checkbox" 
                    onChange={handleSelectAll} 
                    checked={filtered.length > 0 && selectedIds.length === filtered.length} 
                  />
                </th>
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
                <tr key={s.id} className={`body-row ${selectedIds.includes(s.id) ? 'selected-row' : ''}`}>
                  <td>
                    <div className="row-inner">
                      <input 
                        type="checkbox" 
                        checked={selectedIds.includes(s.id)} 
                        onChange={() => handleSelectOne(s.id)} 
                      />
                    </div>
                  </td>
                  <td><div className="row-inner">{(page * size) + (i + 1)}</div></td>
                  <td><div className="row-inner td-name">{s.productName}</div></td>
                  <td><div className="row-inner">{s.username}</div></td>
                  <td><div className="row-inner" style={{fontFamily:'monospace'}}>{s.password}</div></td>
                  <td><div className="row-inner url-text">{displayUrl(s.url)}</div></td> 
                  <td><div className="row-inner">{s.profileNumber || '-'}</div></td> 
                  <td><div className="row-inner">{s.pin || '-'}</div></td> 
                  <td><div className="row-inner"><span className={`status-badge ${s.status}`}>{s.status.toUpperCase()}</span></div></td> 
                  <td>
                    <div className="row-inner actions">
                      <button className="btn-action" onClick={() => triggerToggleStatus(s)} title="Cambiar estado">
                        {s.status === 'active' ? <FaRedoAlt /> : <FaUpload />} 
                      </button>
                      <button className="btn-edit" onClick={() => { setEditingStock(s); setShowModal(true); }} title="Editar">
                        <FaEdit />
                      </button>
                      {s.status === 'inactive' && (
                        <button className="btn-delete" title="Eliminar" onClick={() => {
                          setConfirmPayload({ id: s.id, name: s.productName, action: 'remove', customMessage: `¿Eliminar "${s.productName}" permanentemente?` });
                          setConfirmOpen(true);
                        }}><FaTrashAlt /></button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* --- PAGINACIÓN INFERIOR --- */}
        <div className="pagination-wrapper" style={{ marginTop: '24px' }}>
          <div className="pagination-info">
            Mostrando <b>{stocks.length}</b> de <b>{totalElements}</b> registros
          </div>
          <div className="pagination-controls">
            <button className="btn-pagination" onClick={() => setPage(prev => Math.max(0, prev - 1))} disabled={page === 0}>
              <FaChevronLeft /> Anterior
            </button>
            <span className="page-indicator">Página <b>{page + 1}</b> de <b>{totalPages}</b></span>
            <button className="btn-pagination" onClick={() => setPage(prev => Math.min(totalPages - 1, prev + 1))} disabled={page >= totalPages - 1}>
              Siguiente <FaChevronRight />
            </button>
          </div>
        </div>

        <ConfirmModal 
          open={confirmOpen} 
          title="Confirmar Acción" 
          message={confirmPayload.customMessage} 
          onConfirm={handleConfirm} 
          onCancel={() => setConfirmOpen(false)} 
          loading={confirmLoading} 
        />
        <StockModal visible={showModal} onClose={() => setShowModal(false)} onSuccess={() => fetchStocks(page, search)} initialData={editingStock} />
      </main>

      <style jsx>{`
        .header-row { display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-bottom: 32px; }
        .search-bar { flex: 1; display: flex; align-items: center; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; padding: 0 12px; height: 38px; max-width: 420px; }
        .search-input-inline { flex: 1; background: transparent; border: none; color: #fff; font-size: 0.85rem; outline: none; } 
        .header-actions { display: flex; gap: 12px; align-items: center; } 
        .btn-primary, .btn-bulk, .btn-bulk-delete { height: 38px; display: inline-flex; align-items: center; gap: 8px; padding: 0 16px; border: none; border-radius: 10px; font-weight: 800; font-size: 0.85rem; cursor: pointer; text-transform: uppercase; transition: transform 0.2s; } 
        .btn-primary { background: linear-gradient(135deg, #06b6d4 0%, #8b5cf6 50%, #22c55e 100%); color: #000; } 
        .btn-bulk { background: #22c55e; color: #000; box-shadow: 0 4px 15px rgba(34, 197, 94, 0.3); } 
        .btn-bulk-delete { background: #ef4444; color: #fff; box-shadow: 0 4px 15px rgba(239, 68, 68, 0.3); }
        .btn-primary:hover, .btn-bulk:hover, .btn-bulk-delete:hover { transform: scale(1.02); } 
        .table-wrapper { overflow-x: auto; background: rgba(22,22,22,0.6); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 16px; backdrop-filter: blur(12px); } 
        table { width: 100%; border-collapse: separate; border-spacing: 0 12px; min-width: 1300px; }
        thead th { padding: 10px; text-align: left; color: #cfcfcf; font-size: 0.72rem; text-transform: uppercase; }
        .row-inner { display: flex; align-items: center; gap: 12px; padding: 12px; background: rgba(22,22,22,0.6); border-radius: 12px; min-height: 36px; color: #fff; font-size: 0.85rem; transition: background 0.2s; }
        .selected-row .row-inner { background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.1); }
        .td-name { font-weight: 700; color: #fff; } 
        .url-text { color: #ccc; } 
        .status-badge { padding: 6px 10px; border-radius: 999px; font-size: 0.72rem; font-weight: 700; }
        .status-badge.active { background: rgba(34,197,94,0.12); color: #4ade80; }
        .status-badge.inactive { background: rgba(239,68,68,0.12); color: #ef4444; }
        .actions { display: flex; gap: 8px; } 
        .btn-action, .btn-edit, .btn-delete { padding: 8px; border-radius: 8px; cursor: pointer; border: none; display: flex; align-items: center; justify-content: center; width: 36px; height: 36px; } 
        .btn-action { background: linear-gradient(135deg, #06b6d4, #8b5cf6); color: #000; } 
        .btn-edit { background: linear-gradient(135deg, #f59e0b, #fbbf24); color: #000; }
        .btn-delete { background: linear-gradient(135deg, #ef4444, #f87171); color: #fff; }
        .pagination-wrapper { display: flex; justify-content: space-between; align-items: center; padding: 16px; background: rgba(255,255,255,0.03); border-radius: 12px; border: 1px solid rgba(255,255,255,0.05); }
        .pagination-info { font-size: 0.85rem; color: #999; }
        .pagination-info b { color: #fff; }
        .pagination-controls { display: flex; align-items: center; gap: 16px; }
        .btn-pagination { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: #fff; padding: 8px 16px; border-radius: 8px; display: flex; align-items: center; gap: 8px; font-size: 0.85rem; cursor: pointer; transition: all 0.2s; }
        .btn-pagination:hover:not(:disabled) { background: rgba(255,255,255,0.12); border-color: #8b5cf6; }
        .btn-pagination:disabled { opacity: 0.3; cursor: not-allowed; }
        .page-indicator { font-size: 0.85rem; color: #999; }
        .page-indicator b { color: #8b5cf6; }
        @media (max-width: 640px) {
          .btn-text { display: none; } 
          .btn-primary, .btn-bulk, .btn-bulk-delete { padding: 0; width: 38px; justify-content: center; border-radius: 10px; }
          .header-row { flex-wrap: nowrap; gap: 8px; } 
          .search-bar { max-width: none; } 
          .pagination-wrapper { flex-direction: column; gap: 16px; text-align: center; }
        }
      `}</style>
    </div>
  )
}