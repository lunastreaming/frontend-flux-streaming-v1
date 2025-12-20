// pages/supplier/products.js
import { useState, useEffect } from 'react'
import ProductModal from '../../components/ProductModal'
import ConfirmModal from '../../components/ConfirmModal'
import PublishModal from '../../components/PublishModal'
import {
  FaEdit,
  FaTrashAlt,
  FaPlus,
  FaSearch,
  FaUpload,
  FaRedoAlt,
  FaBoxes
} from 'react-icons/fa'

export default function ProductsPage() {
  const [products, setProducts] = useState([])
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingProduct, setEditingProduct] = useState(null)

  // publish modal state
  const [publishOpen, setPublishOpen] = useState(false)
  const [publishProduct, setPublishProduct] = useState(null)
  const [publishMode, setPublishMode] = useState('publish') // 'publish' | 'renew'

  // confirm modal state
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmPayload, setConfirmPayload] = useState({ id: null, name: '', action: '' })
  const [confirmLoading, setConfirmLoading] = useState(false)

  // info viewer modal (for terms / productDetail / requestDetail)
  const [infoOpen, setInfoOpen] = useState(false)
  const [infoTitle, setInfoTitle] = useState('')
  const [infoContent, setInfoContent] = useState('')

  const BASE_URL = process.env.NEXT_PUBLIC_API_URL

  useEffect(() => { fetchProducts() }, [BASE_URL])

  // helper: return headers object or null if no token
  function getAuthHeaders() {
    const token = localStorage.getItem('accessToken')
    if (!token) return null
    return { Authorization: `Bearer ${token}` }
  }

  const getOptimizedUrl = (url) => {
  if (!url || !url.includes('cloudinary.com')) return url;

  // Limpiamos cualquier transformación previa para evitar duplicados
  const baseUrl = url.replace(/\/upload\/.*?\/(v\d+)/, '/upload/$1');

  // Aplicamos: Formato automático, Calidad automática y 
  // Ancho de 200px (suficiente para el contenedor de 80px de la tabla)
  return baseUrl.replace('/upload/', '/upload/f_auto,q_auto,w_200/');
};

  const fetchProducts = async () => {
    try {
      const headers = getAuthHeaders()
      if (!headers) {
        console.warn('[ProductsPage] no access token found in localStorage - aborting fetchProducts')
        return
      }

      const url = `${BASE_URL}/api/products/provider/me`
      const res = await fetch(url, { headers })
      
      if (!res.ok) {
        const txt = await res.text().catch(() => '')
        throw new Error(`Error ${res.status} ${txt}`)
      }

      const text = await res.text()
      const raw = text ? JSON.parse(text) : []

      const now = new Date()

      const normalized = raw.map(item => {
        const prod = item?.product ?? item
        const p = prod ?? {}

        const publishStartRaw = p.publishStart ?? p.publish_start ?? null
        const publishEndRaw = p.publishEnd ?? p.publish_end ?? null
        const daysRemaining = p.daysRemaining ?? p.days_remaining ?? p.daysRemaining ?? null

        let publishEndDate = null
        try {
          if (publishEndRaw) {
            publishEndDate = (publishEndRaw instanceof Date) ? publishEndRaw : new Date(publishEndRaw)
            if (Number.isNaN(publishEndDate.getTime())) publishEndDate = null
          }
        } catch {
          publishEndDate = null
        }

        const isExpired = publishEndDate ? (publishEndDate < now) : false
        const isActiveNow = Boolean(p.active) && (publishEndDate ? (publishEndDate > now) : Boolean(p.active))

        const stockResponses = item?.stockResponses ?? []

        return {
          id: p.id ?? null,
          providerId: p.providerId ?? p.provider_id ?? null,
          categoryId: p.categoryId ?? p.category_id ?? null,
          name: p.name ?? p.title ?? '',
          terms: p.terms ?? null,
          productDetail: p.productDetail ?? p.product_detail ?? p.detail ?? null,
          requestDetail: p.requestDetail ?? p.request_detail ?? null,
          days: p.days ?? null,
          salePrice: p.salePrice ?? p.sale_price ?? p.price ?? null,
          renewalPrice: p.renewalPrice ?? p.renewal_price ?? null,
          isRenewable: typeof p.isRenewable !== 'undefined' ? p.isRenewable : (p.renewable ?? false),
          isOnRequest: typeof p.isOnRequest !== 'undefined' ? p.isOnRequest : (p.onRequest ?? false),
          active: typeof p.active !== 'undefined' ? p.active : (p.isActive ?? false),
          createdAt: p.createdAt ?? p.created_at ?? null,
          updatedAt: p.updatedAt ?? p.updated_at ?? null,
          imageUrl: p.imageUrl ?? p.image ?? p.thumbnail ?? null,
          publishStart: publishStartRaw,
          publishEnd: publishEndRaw,
          publishEndDate: publishEndDate ? publishEndDate.toISOString() : null,
          isExpired,
          isActiveNow,
          daysRemaining,
          stockResponses,
          stock: Array.isArray(stockResponses) ? stockResponses.length : 0
        }
      })

      setProducts(normalized)
    } catch (err) {
      console.error('Error al cargar productos:', err)
    }
  }

  const formatPrice = (value) => {
    if (value === null || value === undefined) return '—'
    const num = Number(value)
    if (Number.isNaN(num)) return '—'
    return num.toLocaleString('en-US', { style: 'currency', currency: 'USD' })
  }

  const normalizeDateOnly = (value) => {
    if (!value) return null
    try {
      const d = (value instanceof Date) ? value : new Date(value)
      if (Number.isNaN(d.getTime())) return null
      const year = d.getFullYear()
      const month = String(d.getMonth() + 1).padStart(2, '0')
      const day = String(d.getDate()).padStart(2, '0')
      return `${year}-${month}-${day}`
    } catch {
      return null
    }
  }

  const filtered = products.filter(p =>
    (p.name ?? '').toLowerCase().includes(search.toLowerCase())
  )

  // Open publish modal in publish mode
  const openPublishModal = (product) => {
    setPublishProduct(product)
    setPublishMode('publish')
    setPublishOpen(true)
  }

  // Open publish modal in renew mode (modal will call renew endpoint on confirm)
  const openRenewModal = (product) => {
    setPublishProduct(product)
    setPublishMode('renew')
    setPublishOpen(true)
  }

  const confirmDelete = (product) => {
    setConfirmPayload({ id: product.id, name: product.name, action: 'delete' })
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
      const headers = getAuthHeaders()
      if (!headers) {
        alert('No autorizado. Inicia sesión nuevamente.')
        setConfirmLoading(false)
        setConfirmOpen(false)
        return
      }

      const url = `${BASE_URL}/api/products/${confirmPayload.id}`
      const res = await fetch(url, {
        method: 'DELETE',
        headers: { ...headers }
      })
      if (!res.ok) {
        const txt = await res.text().catch(() => '')
        throw new Error(`Error ${res.status} ${txt}`)
      }
      
      setProducts(prev => prev.filter(p => p.id !== confirmPayload.id))
    } catch (err) {
      console.error('Error al eliminar producto:', err)
      alert('No se pudo eliminar el producto: ' + err.message)
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

  const handleDelete = (product) => {
    confirmDelete(product)
  }

  const handleEdit = (product) => {
    setEditingProduct(product)
    setShowModal(true)
  }

  const handleModalSuccess = (createdOrUpdated) => {
    setProducts(prev => {
      const exists = prev.some(p => p.id === createdOrUpdated.id)
      if (exists) {
        return prev.map(p => p.id === createdOrUpdated.id ? createdOrUpdated : p)
      }
      return [...prev, createdOrUpdated]
    })
    setShowModal(false)
    setEditingProduct(null)
  }

  // Called by PublishModal after successful publish/renew
  const handleAfterPublish = (updatedProduct) => {
    // minimal normalization to keep UI consistent
    const publishEndRaw = updatedProduct.publishEnd ?? updatedProduct.publish_end ?? null
    let publishEndDate = null
    try {
      if (publishEndRaw) {
        publishEndDate = (publishEndRaw instanceof Date) ? publishEndRaw : new Date(publishEndRaw)
        if (Number.isNaN(publishEndDate.getTime())) publishEndDate = null
      }
    } catch {
      publishEndDate = null
    }
    const now = new Date()
    const isExpired = publishEndDate ? (publishEndDate < now) : false
    const isActiveNow = Boolean(updatedProduct.active) && (publishEndDate ? (publishEndDate > now) : Boolean(updatedProduct.active))

    const normalized = {
      ...updatedProduct,
      publishEndDate: publishEndDate ? publishEndDate.toISOString() : null,
      isExpired,
      isActiveNow,
      stock: Array.isArray(updatedProduct.stockResponses) ? updatedProduct.stockResponses.length : (updatedProduct.stock ?? 0)
    }

    setProducts(prev => prev.map(p => p.id === normalized.id ? { ...p, ...normalized } : p))
    // close modal handled by modal itself via onClose; ensure state cleaned
    setPublishOpen(false)
    setPublishProduct(null)
    setPublishMode('publish')
  }

  const openInfoModal = (title, content) => {
    if (!content) return
    setInfoTitle(title)
    setInfoContent(content)
    setInfoOpen(true)
  }

  return (
    <div className="min-h-screen text-white font-inter">

      <main className="px-6 py-10 max-w-7xl mx-auto">
        <div className="header-row">
          <div className="search-bar">
            
            <FaSearch className="search-icon-inline" />
            <input
              type="text"
              placeholder="Buscar producto…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="search-input-inline"
            />
 
          </div>
          <button className="btn-primary" onClick={() => { setEditingProduct(null); setShowModal(true) }}>
            <FaPlus className="btn-icon" />
            <span className="btn-text">AGREGAR PRODUCTO</span>
          </button>
        </div>

    
        <ProductModal
          visible={showModal}
          
          onClose={() => { setShowModal(false); setEditingProduct(null) }}
          onSuccess={handleModalSuccess}
          initialData={editingProduct}
        />

        {/* El wrapper maneja el scroll horizontal en pantallas pequeñas */}
<div className="table-wrapper">
  <table>
    <colgroup>
      {/* 15 columnas en total basadas en tu orden solicitado */}
      <col style={{ width: '40px' }} /> {/* # */}
      <col style={{ width: '70px' }} /> {/* Stock */}
      <col />                          {/* Nombre */}
      <col style={{ width: '100px' }} />{/* Imagen */}
      <col />                          {/* Info */}
      <col style={{ width: '60px' }} /> {/* Días */}
      <col style={{ width: '80px' }} /> {/* Venta (USD) */}
      <col style={{ width: '80px' }} /> {/* Renovación (USD) */}
      <col style={{ width: '90px' }} /> {/* Renovable */}
      <col style={{ width: '90px' }} /> {/* A solicitud */}
      <col style={{ width: '90px' }} /> {/* Publicado */}
      <col style={{ width: '100px' }} />{/* Inicio */}
      <col style={{ width: '100px' }} />{/* Fin */}
      <col style={{ width: '100px' }} />{/* Días publicados */}
      <col style={{ width: '120px' }} />{/* Config */}
    </colgroup>

    <thead>
      <tr className="thead-row">
        <th>#</th>
        <th>Stock</th>
        <th>Nombre</th>
        <th>Imagen</th>
        <th>Info</th>
        <th>Días</th>
        <th>Venta (USD)</th>
        <th>Renovación (USD)</th>
        <th>Renovable</th>
        <th>A solicitud</th>
        <th>Publicado</th>
        <th>Inicio</th>
        <th>Fin</th>
        <th>Días publicados</th>
        <th>Config</th>
      </tr>
    </thead>
    
    <tbody>
      {filtered.map((p, i) => {
        // Variables de ayuda para fechas y días
        const publishStart = normalizeDateOnly(p.publish_start ?? p.publishStart);
        const publishEnd = normalizeDateOnly(p.publish_end ?? p.publishEnd);
        const daysPublished = p.daysRemaining ?? p.days_remaining ?? p.daysPublished ?? '—';
        
        const stockCount = Number(p.stock ?? 0);
        const stockLabel = stockCount > 1 ? 'STOCKS' : 'STOCK';

        return (
          <tr key={p.id}>
            {/* 1. #  */}
            <td><div className="row-inner">{i + 1}</div></td>

            {/* 2. Stock */}
            <td>
              <div className="row-inner stock-cell vertical">
                <div className="stock-icon-wrap"><FaBoxes className="stock-icon" /></div>
                <div className={`stock-number ${stockCount > 0 ? (stockCount > 1 ? 'green' : 'single') : 'empty'}`}>
                  {stockCount}
                </div>
                <div className={`stock-label ${stockCount > 0 ? 'label-active' : 'label-empty'}`}>{stockLabel}</div>
              </div>
            </td>

            {/* 3. Nombre*/}
            <td><div className="row-inner td-name" title={p.name}>{p.name}</div></td>

            {/* 4. Imagen*/}
            <td>
              <div className="row-inner">
                {p.imageUrl ? (
                  <div className="img-wrap"><img src={getOptimizedUrl(p.imageUrl)} alt={p.name} className="img" /></div>
                ) : (
                  <span className="text-gray-400 italic">Sin imagen</span>
                )}
              </div>
            </td>

            {/* 5. Info*/}
            <td>
              <div className="row-inner td-info">
                <div className="info-buttons">
                  {p.terms && <button className="info-btn" onClick={() => openInfoModal('Términos', p.terms)}>Términos</button>}
                  {p.productDetail && <button className="info-btn" onClick={() => openInfoModal('Detalle', p.productDetail)}>Detalle</button>}
                  {p.requestDetail && <button className="info-btn" onClick={() => openInfoModal('Solicitud', p.requestDetail)}>Solicitud</button>}
                  {!p.terms && !p.productDetail && !p.requestDetail && <span className="muted">—</span>}
                </div>
              </div>
            </td>

            {/* 6. Días*/}
            <td><div className="row-inner">{p.days ?? '—'}</div></td>

            {/* 7. Venta (USD)*/}
            <td><div className="row-inner">{formatPrice(p.salePrice)}</div></td>

            {/* 8. Renovación (USD)*/}
            <td><div className="row-inner">{formatPrice(p.renewalPrice)}</div></td>

            {/* 9. Renovable*/}
            <td><div className="row-inner">
              <span className={`status-badge ${p.isRenewable ? 'active' : 'inactive'}`}>{p.isRenewable ? 'SÍ' : 'NO'}</span>
            </div></td>

            {/* 10. A solicitud*/}
            <td><div className="row-inner">
              <span className={`status-badge ${p.isOnRequest ? 'active' : 'inactive'}`}>{p.isOnRequest ? 'SÍ' : 'NO'}</span>
            </div></td>

            {/* 11. Publicado*/}
            <td><div className="row-inner">
              <span className={`status-badge ${p.active ? 'active' : 'inactive'}`}>{p.active ? 'SÍ' : 'NO'}</span>
            </div></td>

            {/* 12. Inicio*/}
            <td><div className="row-inner no-wrap">{publishStart ?? '—'}</div></td>

            {/* 13. Fin*/}
            <td><div className="row-inner no-wrap">{publishEnd ?? '—'}</div></td>

            {/* 14. Días publicados */}
            <td><div className="row-inner no-wrap">{daysPublished}</div></td>

            {/* 15. Config*/}
            {/* 15. Config */}
<td className="td-config">
  <div className="row-inner actions">
    {/* Botón Publicar: Se muestra si el producto NO está activo y NO ha expirado (es nuevo) */}
    {!p.isActiveNow && !p.isExpired && (
      <button 
        className="btn-action" 
        title="Publicar" 
        onClick={() => openPublishModal(p)}
      >
        <FaUpload />
      </button>
    )}

    {/* Botón Renovar: Se muestra si el producto está activo actualmente O si ya expiró */}
    {(p.isActiveNow || p.isExpired) && (
      <button 
        className="btn-action" 
        title="Renovar" 
        onClick={() => openRenewModal(p)}
      >
        <FaRedoAlt />
      </button>
    )}

    {/* Botón Editar (Siempre visible) */}
    <button className="btn-edit" title="Editar" onClick={() => handleEdit(p)}>
      <FaEdit />
    </button>

    {/* Botón Eliminar: Solo habilitado si el producto NO está activo */}
    <button 
       className={!p.active ? 'btn-delete' : 'btn-delete disabled'}
       disabled={p.active}
       title={p.active ? "No se puede eliminar un producto activo" : "Eliminar"}
       onClick={() => !p.active && handleDelete(p)}
    >
      <FaTrashAlt />
    </button>
  </div>
</td>
          </tr>
        )
      })}
    </tbody>
  </table>
</div>

        <ConfirmModal
          open={confirmOpen}
          title="Confirmar eliminación"
          message={`¿Seguro que quieres eliminar el producto “${confirmPayload.name}”?`}
          confirmText="Eliminar"
          cancelText="Cancelar"
          onConfirm={handleConfirm}
          onCancel={handleCancelConfirm}
          loading={confirmLoading}
        />

        <PublishModal
          open={publishOpen}
          onClose={() => { setPublishOpen(false); setPublishProduct(null); setPublishMode('publish') }}
          product={publishProduct}
          mode={publishMode}
          onPublished={handleAfterPublish}
        />

        {infoOpen && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 14000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(2,6,23,0.6)' }} onClick={() => setInfoOpen(false)} />
  
            <div style={{
              width: 'min(880px, 96%)',
              maxHeight: '80vh',
              overflow: 'auto',
              background: 'linear-gradient(180deg,#071026,#081426)',
              color: '#EDF2F7',
           
              borderRadius: 12,
              padding: 20,
              boxShadow: '0 18px 40px rgba(2,6,23,0.7)',
              zIndex: 14001
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
              
                <h3 style={{ margin: 0, fontSize: 18 }}>{infoTitle}</h3>
                <button onClick={() => setInfoOpen(false)} style={{ background: 'transparent', border: 'none', color: '#9CA3AF', fontSize: 18, cursor: 'pointer' }}>✕</button>
              </div>
              <div style={{ marginTop: 12, whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{infoContent || '—'}</div>
            </div>
          </div>
        )}

        <style jsx>{`
          /* Estilos Generales */
          .header-row { display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; margin-bottom:32px; }
          .search-bar { display:flex; align-items:center; background: rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.08); border-radius:10px; padding:0 12px; height:38px; max-width:420px; width:100%; margin:0; }
          .search-icon-inline { color:#ccc; font-size:0.85rem; margin-right:8px; }
          .search-input-inline { flex:1; background:transparent; border:none; color:#fff; font-size:0.85rem; outline:none; }
          .btn-primary { height:38px; display:inline-flex; align-items:center; gap:10px; padding:0 16px; background: linear-gradient(135deg, #06b6d4 0%, #8b5cf6 50%, #22c55e 100%); color:#0d0d0d; border:none; border-radius:10px; font-weight:800; font-size:0.85rem; letter-spacing:0.08em; text-transform:uppercase; box-shadow:0 12px 28px rgba(34,211,238,0.06), 0 6px 12px rgba(0,0,0,0.35); cursor:pointer; transition: transform 0.12s ease, filter 0.12s ease, opacity 0.12s ease; will-change: transform; }
          .btn-icon { width:18px; height:18px; display:inline-block; color:inherit; }
          .btn-text { display:inline-block; font-weight:800; font-size:0.86rem; }

          /* Estilos de la Tabla (Desktop/Tablet) */
          /* Importante: overflow-x: auto mantiene las columnas y añade scroll horizontal si es necesario */
          .table-wrapper { 
            overflow-x: auto; 
            overflow-y: auto; 
            max-height:calc(100vh - 240px); 
            background: rgba(22,22,22,0.6); 
            border:1px solid rgba(255,255,255,0.06); 
            backdrop-filter: blur(12px); 
            border-radius:12px; 
            padding:12px; 
            box-shadow:0 12px 24px rgba(0,0,0,0.4); 
          }
          
          /* Estilo para el scrollbar horizontal (Scroll Moderno) */
          .table-wrapper::-webkit-scrollbar { height: 12px; }
          .table-wrapper::-webkit-scrollbar-track { background: transparent; }
          .table-wrapper::-webkit-scrollbar-thumb {
            /* Usar un degradado para el look moderno */
            background: linear-gradient(90deg, #06b6d4, #8b5cf6, #22c55e); 
            border-radius: 999px;
            /* El borde coincide con el fondo del wrapper para crear un efecto de margen */
            border: 3px solid rgba(22,22,22,0.6); 
          }
          /* Fallback para Firefox */
          .table-wrapper { 
            scrollbar-width: thin; 
            scrollbar-color: #8b5cf6 transparent; 
          }


          table { width:100%; border-collapse:separate; border-spacing:0 12px; color:#e1e1e1; table-layout:auto; min-width: 1400px; /* Asegurar que la tabla siempre tenga un ancho mínimo para forzar el scroll */ }
          thead tr { background: rgba(30,30,30,0.8); text-transform:uppercase; letter-spacing:0.06em; color:#cfcfcf; font-size:0.72rem; border-radius:10px; }
          thead th { padding:10px; text-align:left; font-weight:700; vertical-align:middle; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
          td { padding:0; vertical-align:middle; overflow:visible; }
          
          /* Importante: En desktop/mobile row-inner tiene fondo y radio */
          .row-inner { display:flex; align-items:center; gap:12px; padding:12px; background-color: rgba(22,22,22,0.6); border-radius:12px; box-shadow:0 6px 14px rgba(0,0,0,0.16) inset; min-height:36px; }
          
          .row-inner.no-wrap { white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
          .img-wrap { width:80px; height:56px; margin:0 auto; overflow:hidden; border-radius:8px; border:1px solid rgba(255,255,255,0.06); box-shadow:0 6px 14px rgba(0,0,0,0.35); display:flex; align-items:center; justify-content:center; background: rgba(255,255,255,0.02); }
          .img { width:100%; height:100%; object-fit:cover; display:block; }
          .row-inner.td-name { white-space:nowrap; overflow:visible; text-overflow:clip; } .td-name { white-space:nowrap; overflow:visible; text-overflow:clip; }
          .info-buttons { display:flex; gap:8px; align-items:center; flex-wrap:wrap; }
          .info-btn { background: linear-gradient(90deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01)); border:1px solid rgba(255,255,255,0.06); color:#E6EEF7; padding:6px 8px; border-radius:8px; font-size:12px; cursor:pointer; min-width:64px; text-align:center; font-weight:700; }
          .info-btn:hover { filter: brightness(1.06); }
          .muted { color:#9FB4C8 } .td-info { overflow:visible; color:#cfcfcf; }
          .status-badge { display:inline-block; padding:6px 10px; border-radius:999px; font-size:0.72rem; font-weight:700; text-transform:uppercase; }
          .status-badge.active { background: rgba(49,201,80,0.12); color: #31C950; } .status-badge.inactive { background: rgba(245,158,11,0.12); color:#f59e0b; }
          .actions { display:flex; gap:8px; justify-content:center; align-items:center; } .btn-action, .btn-edit, .btn-delete { padding:8px; border-radius:8px; min-width:36px; height:36px; display:inline-flex; align-items:center; justify-content:center; gap:8px; cursor:pointer; border:none; font-weight:700; color:#0d0d0d; }
          .btn-action { background: linear-gradient(135deg, #06b6d4 0%, #8b5cf6 100%); color:#0d0d0d; } .btn-edit { background: linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%); color:#0d0d0d; } .btn-delete { background: linear-gradient(135deg, #ef4444 0%, #f87171 100%); color:#fff; }

          /* Disabled variant for delete button */
          .btn-delete.disabled {
            background: linear-gradient(90deg, rgba(239,68,68,0.18), rgba(249,115,22,0.12));
            color: rgba(255,255,255,0.6);
            cursor: not-allowed;
            transform: none;
            opacity: 0.6;
          }

          /* STOCK cell vertical layout (Desktop/Tablet) */
          .stock-cell { flex-direction: column; align-items: center; justify-content: center; gap: 6px; padding: 8px; min-width: 64px; }
          .stock-icon-wrap { width: 34px; height: 34px; display:flex; align-items:center; justify-content:center; border-radius:8px; background: rgba(255,255,255,0.02); }
          .stock-icon { width: 20px; height: 20px; color: #9FB4C8; }
          .stock-number { font-weight: 900; font-size: 0.95rem; line-height: 1; padding: 0 6px; border-radius: 8px; }
          .stock-number.empty { color: #9CA3AF; background: rgba(255,255,255,0.02); }
          .stock-number.single { color: #31C950; background: rgba(49,201,80,0.08); }
          .stock-number.green { color: #31C950; background: rgba(49,201,80,0.08); }
          .stock-label { font-size: 0.68rem; letter-spacing: 0.06em; font-weight: 800; }
          .stock-label.label-empty { color: #9CA3AF; }
          .stock-label.label-active { color: #31C950; }

          col:nth-child(12), col:nth-child(13), col:nth-child(14) { min-width:110px; max-width:220px; }

          /* AJUSTES PARA TABLET (MAX-WIDTH: 980PX) */
          @media (max-width: 980px) {
            .header-row { flex-wrap: wrap; }
            .search-bar { max-width: none; }
            .btn-primary { width: 100%; margin-top: 12px; }
          }
          
          /* Ajuste para móvil: Asegurar que el botón "AGREGAR PRODUCTO" se oculte */
          @media (max-width: 640px) {
            .header-row { 
              flex-wrap: nowrap;
              gap: 12px; 
              align-items: center; 
            }
            .search-bar { 
              flex: 1; 
              width: auto;
              margin: 0; 
            }
            .btn-primary { 
              width: auto; 
              flex-shrink: 0; 
              margin-top: 0;
            }
            .btn-primary .btn-text {
              display: none; /* Ocultar el texto del botón en móvil */
            }
          }
        `}</style>
      </main>
    </div>
  )
}