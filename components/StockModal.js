// components/StockModal.jsx
import React, { useEffect, useState } from 'react'
import ReactDOM from 'react-dom'
import { FaTimes } from 'react-icons/fa'

export default function StockModal({ visible, onClose, onSuccess, initialData = null }) {
  const [mounted, setMounted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [loadingProducts, setLoadingProducts] = useState(false)
  const [products, setProducts] = useState([])

  const [form, setForm] = useState({
    productId: '',
    username: '',
    password: '',
    url: '',
    tipo: 'CUENTA',
    numeroPerfil: '',
    pin: ''
  })

  // resetForm is hoisted so it can be used safely in useEffect
  function resetForm() {
    setForm({
      productId: '',
      username: '',
      password: '',
      url: '',
      tipo: 'CUENTA',
      numeroPerfil: '',
      pin: ''
    })
    setSubmitting(false)
  }

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    if (!visible) {
      resetForm()
      return
    }

    loadProducts()

    if (initialData) {
      setForm({
        productId: initialData.productId ?? (initialData.product?.id ?? ''),
        username: initialData.username ?? '',
        password: initialData.password ?? '',
        url: initialData.url ?? '',
        tipo: initialData.tipo ?? 'CUENTA',
        numeroPerfil: initialData.numeroPerfil ?? '',
        pin: initialData.pin ?? ''
      })
    }
  }, [visible, initialData])

  if (!mounted || !visible) return null

  async function loadProducts() {
    setLoadingProducts(true)
    try {
      const token = localStorage.getItem('accessToken')
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/products/provider/me`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (!res.ok) throw new Error(`Error ${res.status}`)
      const text = await res.text()
      const data = text ? JSON.parse(text) : []
      setProducts(Array.isArray(data) ? data.map(p => ({ id: p.id, name: p.name })) : [])
    } catch (err) {
      console.error('Error cargando productos:', err)
      setProducts([])
    } finally {
      setLoadingProducts(false)
    }
  }

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
  }

  const validate = () => {
    if (!form.productId) { alert('Selecciona un producto'); return false }
    if (!form.username?.trim()) { alert('El campo Username es obligatorio'); return false }
    if (form.numeroPerfil !== '' && isNaN(Number(form.numeroPerfil))) { alert('Número de perfil debe ser un número válido'); return false }
    return true
  }

  const handleSubmit = async () => {
    if (!validate()) return
    setSubmitting(true)
    try {
      const token = localStorage.getItem('accessToken')

      const payload = {
        productId: form.productId,
        username: form.username.trim(),
        password: form.password || null,
        url: form.url || null,
        type: form.tipo, // use 'type' to match backend DTO field naming
        numberProfile: form.numeroPerfil === '' ? null : Number(form.numeroPerfil),
        pin: form.pin || null
      }

      let res, data
      if (initialData && initialData.id) {
        // editar stock existente
        res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/stocks/${initialData.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(payload)
        })
        if (!res.ok) {
          const txt = await res.text().catch(() => '')
          throw new Error(`Error ${res.status} ${txt}`)
        }
        data = await res.json()
        onSuccess(data)
        onClose()
        return
      }

      // creación: si tipo PERFIL y numeroPerfil > 1 quizá quieras usar batch endpoint (backend)
      // aquí hacemos POST individual (ajusta si usas /api/stock/batch)
      res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/stocks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload)
      })
      if (!res.ok) {
        const txt = await res.text().catch(() => '')
        throw new Error(`Error ${res.status} ${txt}`)
      }
      data = await res.json()

      onSuccess(data)
      onClose()
    } catch (err) {
      console.error('Error guardando stock:', err)
      alert('No se pudo guardar el stock: ' + (err.message || err))
    } finally {
      setSubmitting(false)
    }
  }

  return ReactDOM.createPortal(
    <div style={backdrop}>
      <div role="dialog" aria-modal="true" aria-label={initialData && initialData.id ? 'Editar stock' : 'Nuevo stock'} style={modal}>
        <button onClick={() => { resetForm(); onClose() }} aria-label="Cerrar" style={closeBtn}><FaTimes /></button>

        <h2 style={title}>{initialData && initialData.id ? '✏️ Editar stock' : '➕ Nuevo stock'}</h2>

        <form onSubmit={(e) => { e.preventDefault(); handleSubmit() }} style={formGrid}>

          {/* Producto (full width) */}
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={label}>Producto</label>
            <select
              name="productId"
              value={form.productId}
              onChange={handleChange}
              style={input}
              disabled={loadingProducts}
              aria-required="true"
            >
              <option value="">{loadingProducts ? 'Cargando productos…' : 'Selecciona producto'}</option>
              {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>

          {/* Username (full width below product) */}
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={label}>Username</label>
            <input name="username" value={form.username} onChange={handleChange} placeholder="Usuario" style={input} />
          </div>

          {/* Password (left column) */}
          <div>
            <label style={label}>Password</label>
            <input name="password" value={form.password} onChange={handleChange} placeholder="Password" style={{ ...input, fontFamily: 'monospace' }} />
          </div>

          {/* URL full width */}
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={label}>URL</label>
            <input name="url" value={form.url} onChange={handleChange} placeholder="https://..." style={input} />
          </div>

          {/* Tipo (full width) */}
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={label}>Tipo</label>
            <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
              <label style={radioLabel}>
                <input type="radio" name="tipo" value="CUENTA" checked={form.tipo === 'CUENTA'} onChange={handleChange} />
                <span>Cuenta</span>
              </label>
              <label style={radioLabel}>
                <input type="radio" name="tipo" value="PERFIL" checked={form.tipo === 'PERFIL'} onChange={handleChange} />
                <span>Perfil</span>
              </label>
            </div>
          </div>

          {/* NumeroPerfil (left) */}
          <div>
            <label style={label}>Número de perfil</label>
            <input name="numeroPerfil" value={form.numeroPerfil} onChange={handleChange} placeholder="123" style={input} />
          </div>

          {/* PIN below numeroPerfil (full width) */}
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={label}>PIN</label>
            <input name="pin" value={form.pin} onChange={handleChange} placeholder="PIN" style={input} />
          </div>

          {/* Actions */}
          <div style={{ gridColumn: '1 / -1', textAlign: 'right', marginTop: 8 }}>
            <button type="button" onClick={() => { resetForm(); onClose() }} style={cancelBtn}>Cancelar</button>
            <button type="submit" disabled={submitting} style={submitBtn(submitting)}>
              {submitting ? 'Guardando...' : (initialData && initialData.id ? 'Guardar cambios' : 'Crear')}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  )
}

/* ====== estilos inline reutilizables ====== */

const backdrop = {
  position: 'fixed',
  inset: 0,
  backgroundColor: 'rgba(0,0,0,0.5)',
  zIndex: 2147483647,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center'
}

const modal = {
  backgroundColor: 'white',
  borderRadius: 8,
  boxShadow: '0 0 20px rgba(0,0,0,0.3)',
  width: '92%',
  maxWidth: 600,
  maxHeight: '90vh',
  overflowY: 'auto',
  padding: '1.25rem',
  position: 'relative'
}

const closeBtn = {
  position: 'absolute',
  top: 10,
  right: 10,
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  fontSize: 18
}

const title = { marginBottom: 12, fontSize: 18, fontWeight: 700 }

const formGrid = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: 12
}

const label = { display: 'block', marginBottom: 6, fontWeight: 600 }

const input = { width: '100%', padding: 8, borderRadius: 6, border: '1px solid #d1d5db' }

const radioLabel = { display: 'flex', alignItems: 'center', gap: 8 }

const cancelBtn = {
  marginRight: 8,
  padding: '0.5rem 1rem',
  backgroundColor: '#e2e8f0',
  border: 'none',
  borderRadius: 6,
  cursor: 'pointer'
}

const submitBtn = (disabled) => ({
  padding: '0.5rem 1rem',
  backgroundColor: disabled ? '#a0aec0' : '#3182ce',
  color: 'white',
  border: 'none',
  borderRadius: 6,
  cursor: disabled ? 'not-allowed' : 'pointer'
})