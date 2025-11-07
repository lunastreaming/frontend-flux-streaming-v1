// pages/supplier/products.js
import { useState, useEffect } from 'react'
import NavbarSupplier from '../../components/NavBarSupplier'
import ProductModal from '../../components/ProductModal'
import ConfirmModal from '../../components/ConfirmModal'
import PublishModal from '../../components/PublishModal'
import {
  FaEdit,
  FaTrashAlt,
  FaPlus,
  FaSearch,
  FaUpload,
  FaRedoAlt
} from 'react-icons/fa'

export default function ProductsPage() {
  const [products, setProducts] = useState([])
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingProduct, setEditingProduct] = useState(null)

  // publish modal state
  const [publishOpen, setPublishOpen] = useState(false)
  const [publishProduct, setPublishProduct] = useState(null)

  // confirm modal state
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmPayload, setConfirmPayload] = useState({ id: null, name: '', action: '' })
  const [confirmLoading, setConfirmLoading] = useState(false)

  // info viewer modal (for terms / productDetail / requestDetail)
  const [infoOpen, setInfoOpen] = useState(false)
  const [infoTitle, setInfoTitle] = useState('')
  const [infoContent, setInfoContent] = useState('')

  const BASE_URL = process.env.NEXT_PUBLIC_API_URL

  useEffect(() => { fetchProducts() }, [])

  const fetchProducts = async () => {
    try {
      const token = localStorage.getItem('accessToken')
      const res = await fetch(`${BASE_URL}/api/products/provider/me`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (!res.ok) throw new Error(`Error ${res.status}`)
      const text = await res.text()
      const data = text ? JSON.parse(text) : []
      setProducts(data)
    } catch (err) {
      console.error('Error al cargar productos:', err)
    }
  }

  const moneyFormatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })

  const formatPrice = (valueInCentavos) => {
    if (valueInCentavos === null || valueInCentavos === undefined) return '—'
    const value = Number(valueInCentavos) / 100
    if (Number.isNaN(value)) return '—'
    return moneyFormatter.format(value)
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

  const getDaysPublished = (p) => {
    const val = p.daysRemaining ?? p.days_remaining ?? p.daysPublished ?? p.days_published ?? null
    if (val == null) return '—'
    return String(val)
  }

  const filtered = products.filter(p =>
    (p.name ?? '').toLowerCase().includes(search.toLowerCase())
  )

  const handleRenew = async (product) => {
    try {
      const token = localStorage.getItem('accessToken')
      const res = await fetch(`${BASE_URL}/api/products/${product.id}/renew`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      })
      if (!res.ok) {
        const txt = await res.text().catch(() => '')
        throw new Error(`Error ${res.status} ${txt}`)
      }
      const updated = await res.json()
      setProducts(prev => prev.map(p => p.id === updated.id ? updated : p))
    } catch (err) {
      console.error('Error al renovar producto:', err)
      alert('No se pudo renovar el producto: ' + err.message)
    }
  }

  // open confirm modal for delete
  const confirmDelete = (product) => {
    setConfirmPayload({ id: product.id, name: product.name, action: 'delete' })
    setConfirmOpen(true)
  }

  // on confirm modal confirm -> call backend delete
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
      const res = await fetch(`${BASE_URL}/api/products/${confirmPayload.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`
        }
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

  const handleOpenPublishModal = (product) => {
    setPublishProduct(product)
    setPublishOpen(true)
  }

  const handleAfterPublish = (updatedProduct) => {
    const normalized = {
      ...updatedProduct,
      publishStart: normalizeDateOnly(updatedProduct.publish_start ?? updatedProduct.publishStart),
      publishEnd: normalizeDateOnly(updatedProduct.publish_end ?? updatedProduct.publishEnd),
      daysPublished: updatedProduct.daysRemaining ?? updatedProduct.days_remaining ?? updatedProduct.daysPublished ?? updatedProduct.days_published ?? null
    }
    setProducts(prev => prev.map(p => p.id === normalized.id ? normalized : p))
  }

  // show info modal: title and content (string). only show when content truthy.
  const openInfoModal = (title, content) => {
    if (!content) return
    setInfoTitle(title)
    setInfoContent(content)
    setInfoOpen(true)
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

        <div className="table-wrapper">
          <table>
            <colgroup>
              <col style={{ width: '40px' }} />
              <col style={{ width: '60px' }} />
              <col /> {/* Nombre: no width so it can grow */}
              <col style={{ width: '100px' }} />
              <col />
              <col style={{ width: '60px' }} />
              <col style={{ width: '80px' }} />
              <col style={{ width: '80px' }} />
              <col style={{ width: '90px' }} />
              <col style={{ width: '90px' }} />
              <col style={{ width: '90px' }} />
              <col style={{ width: '100px' }} />
              <col style={{ width: '100px' }} />
              <col style={{ width: '100px' }} />
              <col style={{ width: '120px' }} />
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
                const publishStart = normalizeDateOnly(p.publish_start ?? p.publishStart)
                const publishEnd = normalizeDateOnly(p.publish_end ?? p.publishEnd)
                const daysPublished = p.daysRemaining ?? p.days_remaining ?? p.daysPublished ?? p.days_published ?? null

                // helper to detect presence of content
                const hasTerms = !!(p.terms && String(p.terms).trim())
                const hasProductDetail = !!(p.productDetail && String(p.productDetail).trim())
                const hasRequestDetail = !!(p.requestDetail && String(p.requestDetail).trim())

                return (
                  <tr key={p.id}>
                    <td>
                      <div className="row-inner">{i + 1}</div>
                    </td>

                    <td>
                      <div className="row-inner">{p.stock ?? '—'}</div>
                    </td>

                    <td>
                      {/* single-line name; long names expand the table width and are visible via horizontal scroll */}
                      <div className="row-inner td-name" title={p.name}>{p.name}</div>
                    </td>

                    <td>
                      <div className="row-inner">
                        {p.imageUrl ? (
                          <div className="img-wrap">
                            <img src={p.imageUrl} alt={p.name} className="img" />
                          </div>
                        ) : (
                          <span className="text-gray-400 italic">Sin imagen</span>
                        )}
                      </div>
                    </td>

                    <td>
                      <div className="row-inner td-info">
                        {/* three conditional buttons: Terms, Product detail, Request detail */}
                        <div className="info-buttons">
                          {hasTerms && (
                            <button
                              className="info-btn"
                              onClick={() => openInfoModal('Términos y condiciones', p.terms)}
                            >
                              Términos
                            </button>
                          )}
                          {hasProductDetail && (
                            <button
                              className="info-btn"
                              onClick={() => openInfoModal('Detalle del producto', p.productDetail)}
                            >
                              Detalle
                            </button>
                          )}
                          {hasRequestDetail && (
                            <button
                              className="info-btn"
                              onClick={() => openInfoModal('Detalle de la solicitud', p.requestDetail)}
                            >
                              Solicitud
                            </button>
                          )}

                          {/* if none available, show fallback short text */}
                          {!hasTerms && !hasProductDetail && !hasRequestDetail && (
                            <span className="muted">—</span>
                          )}
                        </div>
                      </div>
                    </td>

                    <td>
                      <div className="row-inner">{p.days ?? '—'}</div>
                    </td>

                    <td>
                      <div className="row-inner">{formatPrice(p.salePrice)}</div>
                    </td>

                    <td>
                      <div className="row-inner">{formatPrice(p.renewalPrice)}</div>
                    </td>

                    <td>
                      <div className="row-inner">
                        <span className={`status-badge ${p.isRenewable ? 'active' : 'inactive'}`}>
                          {p.isRenewable ? 'SÍ' : 'NO'}
                        </span>
                      </div>
                    </td>

                    <td>
                      <div className="row-inner">
                        <span className={`status-badge ${p.isOnRequest ? 'active' : 'inactive'}`}>
                          {p.isOnRequest ? 'SÍ' : 'NO'}
                        </span>
                      </div>
                    </td>

                    <td>
                      <div className="row-inner">
                        <span className={`status-badge ${p.active ? 'active' : 'inactive'}`}>
                          {p.active ? 'SÍ' : 'NO'}
                        </span>
                      </div>
                    </td>

                    <td>
                      <div className="row-inner no-wrap" title={publishStart ?? ''}>{publishStart ?? '—'}</div>
                    </td>

                    <td>
                      <div className="row-inner no-wrap" title={publishEnd ?? ''}>{publishEnd ?? '—'}</div>
                    </td>

                    <td>
                      <div className="row-inner no-wrap" title={daysPublished == null ? '' : String(daysPublished)}>{daysPublished == null ? '—' : String(daysPublished)}</div>
                    </td>

                    <td>
                      <div className="row-inner actions">
                        {(!p.active) ? (
                          <button className="btn-action" title="Publicar" onClick={() => handleOpenPublishModal(p)}>
                            <FaUpload />
                          </button>
                        ) : (
                          <button className="btn-action" title="Renovar" onClick={() => handleRenew(p)}>
                            <FaRedoAlt />
                          </button>
                        )}
                        <button className="btn-edit" title="Editar" onClick={() => handleEdit(p)}>
                          <FaEdit />
                        </button>
                        <button className="btn-delete" title="Eliminar" onClick={() => handleDelete(p)}>
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
          onClose={() => { setPublishOpen(false); setPublishProduct(null) }}
          product={publishProduct}
          onPublished={handleAfterPublish}
        />

        {/* Info viewer modal (reusable) */}
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
                <button onClick={() => setInfoOpen(false)} style={{
                  background: 'transparent', border: 'none', color: '#9CA3AF', fontSize: 18, cursor: 'pointer'
                }}>✕</button>
              </div>
              <div style={{ marginTop: 12, whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
                {infoContent || '—'}
              </div>
            </div>
          </div>
        )}

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

          .search-icon-inline {
            color: #ccc;
            font-size: 0.85rem;
            margin-right: 8px;
          }

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
            font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial;
            box-shadow: 0 12px 28px rgba(34,211,238,0.06), 0 6px 12px rgba(0,0,0,0.35);
            cursor: pointer;
            transition: transform 0.12s ease, filter 0.12s ease;
            will-change: transform;
          }

          .btn-primary:hover {
            transform: translateY(-3px);
            filter: brightness(1.04);
          }

          .btn-icon {
            width: 18px;
            height: 18px;
            display: inline-block;
            color: inherit;
          }

          .btn-text {
            display: inline-block;
            font-weight: 800;
            font-size: 0.86rem;
          }

          /* table container: allow horizontal scroll and vertical scroll when tall */
          .table-wrapper {
            overflow-x: auto;
            overflow-y: auto;
            max-height: calc(100vh - 240px);
            background: rgba(22,22,22,0.6);
            border: 1px solid rgba(255,255,255,0.06);
            backdrop-filter: blur(12px);
            border-radius: 12px;
            padding: 12px;
            box-shadow: 0 12px 24px rgba(0,0,0,0.4);
          }

          /* subtle dark scrollbars */
          .table-wrapper::-webkit-scrollbar { height: 10px; width: 10px; }
          .table-wrapper::-webkit-scrollbar-track { background: transparent; }
          .table-wrapper::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.06); border-radius: 999px; border: 2px solid rgba(2,6,23,0.0); }
          .table-wrapper { scrollbar-width: thin; scrollbar-color: rgba(255,255,255,0.06) transparent; }

          table {
            width: 100%;
            border-collapse: separate;
            border-spacing: 0 12px;
            color: #e1e1e1;
            table-layout: auto;
          }

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
            overflow: visible;
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

          .row-inner.no-wrap {
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }

          .img-wrap {
            width: 80px;
            height: 56px;
            margin: 0 auto;
            overflow: hidden;
            border-radius: 8px;
            border: 1px solid rgba(255,255,255,0.06);
            box-shadow: 0 6px 14px rgba(0,0,0,0.35);
            display: flex;
            align-items: center;
            justify-content: center;
            background: rgba(255,255,255,0.02);
          }

          .img {
            width: 100%;
            height: 100%;
            object-fit: cover;
            display: block;
          }

          /* NAME: force single line without wrapping */
          .row-inner.td-name {
            white-space: nowrap;
            overflow: visible;
            text-overflow: clip;
          }
          .td-name { white-space: nowrap; overflow: visible; text-overflow: clip; }

          /* INFO: buttons layout */
          .info-buttons {
            display: flex;
            gap: 8px;
            align-items: center;
            flex-wrap: wrap;
          }

          .info-btn {
            background: linear-gradient(90deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01));
            border: 1px solid rgba(255,255,255,0.06);
            color: #E6EEF7;
            padding: 6px 8px;
            border-radius: 8px;
            font-size: 12px;
            cursor: pointer;
            min-width: 64px;
            text-align: center;
            font-weight: 700;
          }

          .info-btn:hover {
            filter: brightness(1.06);
          }

          .muted { color: #9FB4C8 }

          .td-info { overflow: visible; color: #cfcfcf; }

          .status-badge {
            display: inline-block;
            padding: 6px 10px;
            border-radius: 999px;
            font-size: 0.72rem;
            font-weight: 700;
            text-transform: uppercase;
          }

          .status-badge.active { background: rgba(34,197,94,0.12); color: #4ade80; }
          .status-badge.inactive { background: rgba(245,158,11,0.12); color: #f59e0b; }

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
            color: #0d0d0d;
          }

          .btn-action { background: linear-gradient(135deg, #06b6d4 0%, #8b5cf6 100%); color: #0d0d0d; }
          .btn-edit { background: linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%); color: #0d0d0d; }
          .btn-delete { background: linear-gradient(135deg, #ef4444 0%, #f87171 100%); color: #fff; }

          col:nth-child(12), col:nth-child(13), col:nth-child(14) {
            min-width: 110px;
            max-width: 220px;
          }

          @media (max-width: 980px) {
            col:nth-child(2) { width: 56px; }
            col:nth-child(4) { width: 88px; }
            col:nth-child(6) { width: 48px; }
            col:nth-child(7) { width: 72px; }
            col:nth-child(8) { width: 72px; }
            .img-wrap { width: 72px; height: 48px; }
          }

          @media (max-width: 640px) {
            table, thead, tbody, th, td, tr { display: block; }
            thead { display: none; }
            tbody tr { margin-bottom: 12px; }
            td { padding: 0 12px; }
            .row-inner { padding: 10px; }
            .img-wrap { width: 56px; height: 48px; }
          }
        `}</style>
      </main>
    </div>
  )
}