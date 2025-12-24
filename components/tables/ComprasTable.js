'use client'

import { useEffect, useState, useMemo } from 'react'
import { FaEye, FaEyeSlash, FaWhatsapp, FaCog, FaRedo, FaEdit } from 'react-icons/fa'
import SupportModal from '../SupportModal'
import RenewModal from '../RenewModal'
import EditPhoneModal from '../EditPhoneModal'

export default function ComprasTable({ endpoint = 'purchases', balance, search = '' }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [visiblePasswords, setVisiblePasswords] = useState(() => new Set())
  const [showSupportModal, setShowSupportModal] = useState(false)
  const [selectedStock, setSelectedStock] = useState(null)

  const [showRenewModal, setShowRenewModal] = useState(false)
  const [renewProduct, setRenewProduct] = useState(null)

  // paginación
  const [page, setPage] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [totalElements, setTotalElements] = useState(0)

  // ... dentro de la función ComprasTable
const [showEditPhoneModal, setShowEditPhoneModal] = useState(false);
const [phoneToEdit, setPhoneToEdit] = useState({ id: null, currentPhone: '' });

const openEditPhone = (id, phone) => {
  setPhoneToEdit({ id, currentPhone: phone });
  setShowEditPhoneModal(true);
};

  const SIZE = 50

  const BASE_URL = process.env.NEXT_PUBLIC_API_URL || ''

  // Formateo en UTC para ver el mismo valor del backend (sin desplazamiento de zona horaria)
  const formatDateUTC = (value) => {
    if (!value) return ''
    try {
      const d = new Date(value)
      if (Number.isNaN(d.getTime())) return ''
      return d.toLocaleString('es-PE', {
        timeZone: 'UTC',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      })
    } catch { return '' }
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

  // Si quisieras ver el ISO exacto del backend (incluye milisegundos y 'Z'), usa esta:
  // const formatIsoUTC = (value) => {
  //   if (!value) return ''
  //   try {
  //     const d = new Date(value)
  //     if (Number.isNaN(d.getTime())) return ''
  //     return d.toISOString() // UTC puro
  //   } catch { return '' }
  // }

  const formatPrice = (v) => {
    if (v === null || v === undefined) return ''
    try {
      return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(v))
    } catch { return '' }
  }

  const togglePasswordVisibility = (id) => {
    setVisiblePasswords(prev => {
      const copy = new Set(prev)
      if (copy.has(id)) copy.delete(id)
      else copy.add(id)
      return copy
    })
  }

  const openSupportModal = (stock) => {
    setSelectedStock(stock)
    setShowSupportModal(true)
  }
  const closeSupportModal = () => {
    setSelectedStock(null)
    setShowSupportModal(false)
  }

  const fetchData = async (pageToLoad = 0) => {
    setLoading(true);
    setError(null)
    try {
      const token = localStorage.getItem('accessToken')
      const res = await fetch(`${BASE_URL}/api/stocks/${endpoint}?page=${pageToLoad}&size=${SIZE}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (!res.ok) throw new Error(`Error ${res.status}`)
      const data = await res.json()

      // data: PagedResponse<StockResponse>
      setItems(data.content || [])
      setTotalPages(data.totalPages ?? 0)
      setTotalElements(data.totalElements ?? 0)
    } catch (err) {
      setError(err.message || String(err))
      setItems([])
      setTotalPages(0)
      setTotalElements(0)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData(page) }, [endpoint, page])

  const createSupport = async (choice) => {
    try {
      const token = localStorage.getItem('accessToken')
      const res = await fetch(`${BASE_URL}/api/support`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          stockId: selectedStock?.id,
          issueType: choice
        })
      })
      if (!res.ok) throw new Error(`Error ${res.status}`)
      await fetchData(page) // refrescar manteniendo página
    } catch (err) {
      console.error('Error creando soporte:', err)
    }
  }

  const openRenewModal = (row) => {
    setRenewProduct(row.product ?? row)
    setShowRenewModal(true)
  }
  const closeRenewModal = () => {
    setRenewProduct(null)
    setShowRenewModal(false)
  }

  const goPrev = () => setPage(p => Math.max(0, p - 1))
  const goNext = () => setPage(p => (p + 1 < totalPages ? p + 1 : p))
  const jumpTo = (e) => {
    const val = Number(e.target.value) - 1
    if (!Number.isNaN(val) && val >= 0 && val < totalPages) setPage(val)
  }

  // calcular items visibles por búsqueda (si aplica)
  const displayed = useMemo(() => {
    const q = (search || '').toLowerCase()
    return items.filter(i => (i.productName ?? '').toLowerCase().includes(q))
  }, [items, search])

  if (loading) return <div className="info">Cargando…</div>
  if (error) return <div className="error">Error: {error}</div>

  // INICIO DE LA LÓGICA AGREGADA: Mostrar imagen si no hay resultados
  if (displayed.length === 0) {
    return (
      <div className="no-results">
        <img src="/SinCompras.png" alt="No hay compras registradas" className="no-results-image" />
        <p className="no-results-text">
          {search ? 
           `No se encontraron compras que coincidan con "${search}".` : 
           'Aún no tienes compras registradas.'
          }
        </p>
        <style jsx>{`
          .no-results {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 40px;
            text-align: center;
            color: #cbd5e1;
            min-height: 400px;
            background: rgba(22,22,22,0.6); 
            border:1px solid rgba(255,255,255,0.06); 
            border-radius:12px;
          }
          .no-results-image {
            max-width: 600px;
            height: auto;
            margin-bottom: 20px;
            opacity: 0.8;
          }
          .no-results-text {
            font-size: 1.1rem;
            font-weight: 500;
          }
        `}</style>
      </div>
    )
  }
  // FIN DE LA LÓGICA AGREGADA

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
              <th>Días Restantes</th>
              <th>Refund</th>
              <th>Cliente</th>
              <th>Celular</th>
              <th>Proveedor</th>
              <th>Celular proveedor</th>
              <th>Configuración</th>
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
                  <td><div className="row-inner">{row.id || ''}</div></td>
                  <td><div className="row-inner td-name">{row.productName || ''}</div></td>
                  <td><div className="row-inner">{row.username || ''}</div></td>
                  <td>
                    <div className="row-inner password-cell">
                      <div className="pw-text">{isVisible ? (row.password || '') : masked}</div>
                      {row.password && (
                        <button
                          onClick={() => togglePasswordVisibility(row.id)}
                          className="pw-btn"
                          aria-label={isVisible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                        >
                          {isVisible ? <FaEyeSlash /> : <FaEye />}
                        </button>
                      )}
                    </div>
                  </td>
                  <td><div className="row-inner">{row.url || ''}</div></td>
                  <td><div className="row-inner">{row.numeroPerfil || ''}</div></td>
                  <td><div className="row-inner">{row.pin || ''}</div></td>
                  {/* Fechas en UTC, reflejando exactamente el backend */}
                  <td><div className="row-inner">{formatDateLocal(row.startAt)}</div></td>
                  <td><div className="row-inner">{formatDateLocal(row.endAt)}</div></td>
                  <td><div className="row-inner">{row.daysRemaining ?? ''}</div></td>
                  <td><div className="row-inner">{formatPrice(row.refund)}</div></td>
                  <td><div className="row-inner">{row.clientName || ''}</div></td>
                  <td>
  <div className="row-inner whatsapp-cell">
    <button
      className="wa-btn"
      onClick={onClickWhatsAppClient}
      aria-label={`WhatsApp cliente ${row.clientPhone || ''}`}
    >
      <FaWhatsapp />
    </button>
    <div className="wa-number">{row.clientPhone || ''}</div>
    
    {/* NUEVO BOTÓN DE EDICIÓN */}
    <button 
      className="edit-phone-btn"
      onClick={() => openEditPhone(row.id, row.clientPhone)}
      title="Editar teléfono"
    >
      <FaEdit />
    </button>
  </div>
</td>
                  <td><div className="row-inner">{row.providerName || ''}</div></td>
                  <td><div className="row-inner">{row.providerPhone || ''}</div></td>
                  <td>
                    <div className="row-inner config-cell">
                      <button
                        className="config-btn"
                        onClick={() => openSupportModal(row)}
                        aria-label="Abrir soporte"
                      >
                        <FaCog /> <span className="config-label">Soporte</span>
                      </button>

                      {row.renewable && (
                        <button
                          className="config-btn renew-btn"
                          onClick={() => openRenewModal(row)}
                          aria-label="Renovar stock"
                        >
                          <FaRedo /> <span className="config-label">Renovar</span>
                        </button>
                      )}
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

      {/* Modales */}
      {showSupportModal && (
        <SupportModal
          open={showSupportModal}
          onClose={closeSupportModal}
          onAccept={(choice) => {
            createSupport(choice)
            closeSupportModal()
          }}
        />
      )}

      {showEditPhoneModal && (
  <EditPhoneModal
    isOpen={showEditPhoneModal}
    onClose={() => setShowEditPhoneModal(false)}
    stockId={phoneToEdit.id}
    currentPhone={phoneToEdit.currentPhone}
    onSuccess={() => fetchData(page)} // Recarga la tabla para ver el cambio
  />
)}

      {showRenewModal && (
        <RenewModal
          product={renewProduct}
          balance={balance}
          onClose={closeRenewModal}
          onSuccess={() => {
            closeRenewModal()
            fetchData(page) // refrescar manteniendo página actual
          }}
        />
      )}

      <style jsx>{`
        .table-wrapper { overflow:hidden;
          background: rgba(22,22,22,0.6); border:1px solid rgba(255,255,255,0.06); border-radius:12px; padding:12px; }
        .table-scroll { overflow:auto; border-radius:8px;
        }
        table.styled-table { width:100%; border-collapse:separate; border-spacing: 0 12px; color:#e1e1e1; min-width: 980px;
        }
        thead tr { background: rgba(30,30,30,0.8); text-transform:uppercase; letter-spacing:0.06em; color:#cfcfcf; font-size:0.72rem;
        }
        thead th { padding:10px; text-align:center; font-weight:700;
        }
        tbody td { padding:0; text-align:center;
        }
        .row-inner { display:flex; align-items:center; justify-content:center; gap:12px; padding:12px; background-color: rgba(22,22,22,0.6); border-radius:12px; min-height:36px;
        }
        .row-inner.index { justify-content:center; width:36px; height:36px; padding:0;
        }
        .td-name { white-space:nowrap; overflow:hidden; text-overflow:ellipsis;
        }

        .password-cell { display:flex; align-items:center; gap:8px;
        }
        .pw-btn { background:none; border:none; color:#9fb4c8; cursor:pointer;
        }

        .whatsapp-cell { display:flex; align-items:center; gap:8px;
        }
        .wa-btn { width:28px; height:28px; border-radius:50%; background:#25d366; color:#fff; border:none; cursor:pointer; display:flex; align-items:center; justify-content:center;
        }
        .wa-number { font-size:12px; color:#cbd5e1;
        }

        .config-cell { display:flex; align-items:center; gap:8px;
        }
        .config-btn { display:flex; align-items:center; gap:8px; background: rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.12); color:#e6eef7;
        padding:8px 12px; border-radius:8px; cursor:pointer; }
        .config-btn:hover { background: rgba(255,255,255,0.14);
        }
        .config-label { font-weight:700; font-size:12px;
        }
        .renew-btn { background: linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%); border: none; color:#fff;
        }

        .info { padding:28px; text-align:center; color:#cbd5e1;
        }
        .error { padding:28px; text-align:center; color:#fca5a5;
        }

        .pagination { display:flex; justify-content:center; align-items:center; gap:12px; margin-top:16px; color:#cbd5e1;
        }
        .pagination button { padding:6px 12px; border-radius:6px; border:none; cursor:pointer;
        }
        .pagination-extra { display:flex; justify-content:center; align-items:center; gap:12px; margin-top:8px; color:#cbd5e1;
        }
        .pagination-extra input { width:80px; padding:6px 8px; border-radius:6px; border:1px solid rgba(255,255,255,0.12); background: rgba(255,255,255,0.04);
        color:#fff; }
        .edit-phone-btn {
  background: none;
  border: none;
  color: #9fb4c8;
  cursor: pointer;
  padding: 4px;
  display: flex;
  align-items: center;
  margin-left: 4px;
  transition: color 0.2s;
}
.edit-phone-btn:hover {
  color: #3b82f6;
}
      `}</style>
    </div>
  )
}