'use client'

import { useEffect, useState } from 'react'
import { FaEye, FaEyeSlash, FaWhatsapp, FaCog } from 'react-icons/fa'
import SupportModal from '../SupportModal' // desde /components/tables → sube a /components

export default function ComprasTable({ endpoint = 'purchases' }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [visiblePasswords, setVisiblePasswords] = useState(() => new Set())
  const [showSupportModal, setShowSupportModal] = useState(false)
  const [selectedStock, setSelectedStock] = useState(null)

  const BASE_URL = process.env.NEXT_PUBLIC_API_URL || ''

  const formatDate = (value) => {
    if (!value) return ''
    try {
      const d = new Date(value)
      if (Number.isNaN(d.getTime())) return ''
      return d.toLocaleDateString()
    } catch { return '' }
  }

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

  // Reutilizable: carga de datos para la tabla
  const fetchData = async () => {
    setLoading(true); setError(null)
    try {
      const token = localStorage.getItem('accessToken')
      const res = await fetch(`${BASE_URL}/api/stocks/${endpoint}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (!res.ok) throw new Error(`Error ${res.status}`)
      const data = await res.json()
      const normalized = Array.isArray(data) ? data : (data.content || [])
      setItems(normalized)
    } catch (err) {
      setError(err.message || String(err))
      setItems([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [endpoint])

  // Crea soporte y refresca la tabla
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
          issueType: choice // usando 'issueType' según tu ejemplo previo
        })
      })
      if (!res.ok) throw new Error(`Error ${res.status}`)
      const data = await res.json()
      console.log('Soporte creado:', data)
      await fetchData() // refresca la tabla
    } catch (err) {
      console.error('Error creando soporte:', err)
    }
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
              <th>Celular proveedor</th>
              <th>Configuración</th>
            </tr>
          </thead>
          <tbody>
            {items.map((row, idx) => {
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
                  <td><div className="row-inner index">{idx + 1}</div></td>
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
                  <td><div className="row-inner">{formatDate(row.startAt)}</div></td>
                  <td><div className="row-inner">{formatDate(row.endAt)}</div></td>
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
                    </div>
                  </td>
                  <td><div className="row-inner">{row.providerName || ''}</div></td>
                  <td><div className="row-inner">{row.providerPhone || ''}</div></td>
                  <td>
                    <div className="row-inner">
                      <button
                        className="config-btn"
                        onClick={() => openSupportModal(row)}
                        aria-label="Abrir soporte"
                      >
                        <FaCog /> <span className="config-label">Soporte</span>
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {showSupportModal && (
        <SupportModal
          open={showSupportModal}
          onClose={closeSupportModal}
          onAccept={(choice) => {
            createSupport(choice) // crea soporte en /api/support y refresca
            closeSupportModal()
          }}
        />
      )}

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
        .config-btn { display:flex; align-items:center; gap:8px; background: rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.12); color:#e6eef7; padding:8px 12px; border-radius:8px; cursor:pointer; }
        .config-btn:hover { background: rgba(255,255,255,0.14); }
        .config-label { font-weight:700; font-size:12px; }
        .info { padding:28px; text-align:center; color:#cbd5e1; }
        .error { padding:28px; text-align:center; color:#fca5a5; }
      `}</style>
    </div>
  )
}