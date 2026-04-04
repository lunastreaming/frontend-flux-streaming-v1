// components/StockModal.jsx
import React, { useEffect, useState, useRef } from 'react'
import ReactDOM from 'react-dom'
import { FaTimes } from 'react-icons/fa'

export default function StockModal({
  visible,
  onClose,
  onSuccess,
  initialData = null,
  initialProducts = null
}) {
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

  // Estado para manejar múltiples PINs cuando es tipo PERFIL
  const [pins, setPins] = useState({})

  const [showTopShadow, setShowTopShadow] = useState(false)
  const [showBottomShadow, setShowBottomShadow] = useState(false)
  const contentRef = useRef(null)

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    if (!visible) {
      resetForm()
      return
    }

    if (Array.isArray(initialProducts) && initialProducts.length > 0) {
      setProducts(normalizeProductsArray(initialProducts))
      setLoadingProducts(false)
    } else {
      loadProducts()
    }

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
      if (initialData.tipo === 'PERFIL' && initialData.numeroPerfil) {
        setPins({ [initialData.numeroPerfil]: initialData.pin ?? '' })
      }
    }

    const t = setTimeout(() => updateShadows(), 120)
    return () => clearTimeout(t)
  }, [visible, initialData, initialProducts])

  /* ---------- helpers ---------- */
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
    setPins({})
    setSubmitting(false)
  }

  function getAuthHeader() {
    const token = localStorage.getItem('accessToken')
    return token ? { Authorization: `Bearer ${token}` } : null
  }

  function normalizeProductsArray(raw) {
    if (!Array.isArray(raw)) return []
    return raw
      .map(item => {
        const product = item?.product ?? item
        return {
          id: product?.id ?? null,
          name: product?.name ?? product?.title ?? 'Sin nombre',
          imageUrl: product?.imageUrl ?? product?.thumbnail ?? null
        }
      })
      .filter(p => p.id)
  }

  async function loadProducts() {
    setLoadingProducts(true)
    try {
      const headers = getAuthHeader()
      const url = `${process.env.NEXT_PUBLIC_API_URL}/api/products/provider/me`
      const res = await fetch(url, headers ? { headers } : {})
      const text = await res.text().catch(() => '')
      if (!res.ok) throw new Error(`Error ${res.status}: ${text || res.statusText}`)
      const raw = text ? JSON.parse(text) : []
      setProducts(normalizeProductsArray(raw))
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

  const handlePinChange = (perfilNum, value) => {
    setPins(prev => ({ ...prev, [perfilNum]: value }))
  }

  const validate = () => {
    if (!form.productId) { alert('Selecciona un producto'); return false }
    if (!form.username?.trim()) { alert('El campo Username es obligatorio'); return false }
    if (form.tipo === 'PERFIL') {
      if (form.numeroPerfil === '') { alert('Indica la cantidad de perfiles'); return false }
      const n = Number(form.numeroPerfil)
      if (!Number.isInteger(n) || n < 1) { alert('Número de perfil debe ser un entero mayor o igual a 1'); return false }
      if (n > 7) { alert('Máximo 7 stocks por operación'); return false }
    }
    return true
  }

  const handleSubmit = async () => {
    if (!validate()) return
    setSubmitting(true)
    try {
      const headersAuth = getAuthHeader()
      if (!headersAuth) {
        alert('No estás autenticado.');
        setSubmitting(false)
        return
      }

      if (initialData && initialData.id) {
        const payload = {
          productId: form.productId,
          username: form.username.trim(),
          password: form.password || null,
          url: form.url || null,
          tipo: form.tipo,
          numeroPerfil: form.numeroPerfil === '' ? null : Number(form.numeroPerfil),
          pin: form.tipo === 'PERFIL' ? (pins[form.numeroPerfil] || null) : (form.pin || null)
        }
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/stocks/${initialData.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', ...headersAuth },
          body: JSON.stringify(payload)
        })
        if (!res.ok) throw new Error('Error al actualizar')
        if (onSuccess) onSuccess()
        handleClose()
        return
      }

      let stocksToSend = []
      if (form.tipo === 'CUENTA') {
        stocksToSend.push({ ...form, username: form.username.trim(), numeroPerfil: null })
      } else {
        const n = Math.min(Number(form.numeroPerfil || 0), 7)
        for (let i = 1; i <= n; i++) {
          stocksToSend.push({
            productId: form.productId,
            username: form.username.trim(),
            password: form.password || null,
            url: form.url || null,
            tipo: 'PERFIL',
            numeroPerfil: i,
            pin: pins[i] || null
          })
        }
      }

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/stocks/batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headersAuth },
        body: JSON.stringify({ stocks: stocksToSend })
      })
      if (!res.ok) throw new Error('Error en creación masiva')
      if (onSuccess) onSuccess()
      handleClose()
    } catch (err) {
      alert(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  function handleClose() {
    resetForm()
    if (onClose) onClose()
  }

  function updateShadows() {
    const el = contentRef.current
    if (!el) return
    setShowTopShadow(el.scrollTop > 8)
    setShowBottomShadow(el.scrollHeight - el.clientHeight - el.scrollTop > 8)
  }

  if (!visible || !mounted) return null

  return ReactDOM.createPortal(
    <div style={styles.backdrop} onMouseDown={(e) => e.target === e.currentTarget && handleClose()}>
      <div role="dialog" style={styles.modal} onMouseDown={(e) => e.stopPropagation()}>
        <header style={styles.header}>
          <h3 style={styles.title}>{initialData?.id ? '✏️ Editar stock' : '➕ Nuevo stock'}</h3>
          <button type="button" onClick={handleClose} style={styles.closeBtn}><FaTimes /></button>
        </header>

        <div ref={contentRef} onScroll={updateShadows} style={styles.contentWrap} className="stock-modal-scroll">
          <form onSubmit={(e) => { e.preventDefault(); handleSubmit() }} style={styles.formGrid}>
            
            {/* PRODUCTO */}
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={styles.label}>Producto</label>
              <select name="productId" value={form.productId} onChange={handleChange} style={styles.select} disabled={loadingProducts}>
                <option value="" disabled>{loadingProducts ? 'Cargando...' : 'Selecciona producto'}</option>
                {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>

            {/* USERNAME */}
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={styles.label}>Username</label>
              <input name="username" value={form.username} onChange={handleChange} placeholder="Usuario" style={styles.input} />
            </div>

            {/* PASSWORD */}
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={styles.label}>Password</label>
              <input name="password" value={form.password} onChange={handleChange} placeholder="Password" style={{ ...styles.input, fontFamily: 'monospace' }} />
            </div>

            {/* URL */}
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={styles.label}>URL</label>
              <input name="url" value={form.url} onChange={handleChange} placeholder="https://..." style={styles.input} />
            </div>

            {/* TIPO */}
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={styles.label}>Tipo</label>
              <div style={{ display: 'flex', gap: 16 }}>
                <label style={styles.radioLabel}>
                  <input type="radio" name="tipo" value="CUENTA" checked={form.tipo === 'CUENTA'} onChange={handleChange} />
                  <span style={styles.radioText}>Cuenta</span>
                </label>
                <label style={styles.radioLabel}>
                  <input type="radio" name="tipo" value="PERFIL" checked={form.tipo === 'PERFIL'} onChange={handleChange} />
                  <span style={styles.radioText}>Perfil</span>
                </label>
              </div>
            </div>

            {/* NUMERO DE PERFIL / CANTIDAD */}
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={styles.label}>{form.tipo === 'PERFIL' ? 'Cantidad de perfiles (Máx 7)' : 'Número de perfil'}</label>
              <input name="numeroPerfil" value={form.numeroPerfil} onChange={handleChange} placeholder="Ej: 4" style={styles.input} />
            </div>

            {/* SECCIÓN DE PINS (UNO DEBAJO DEL OTRO) */}
            {form.tipo === 'CUENTA' ? (
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={styles.label}>PIN</label>
                <input name="pin" value={form.pin} onChange={handleChange} placeholder="PIN" style={styles.input} />
              </div>
            ) : (
              // Contenedor para perfiles: cada uno ocupa el ancho completo
              <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: 12 }}>
                {Array.from({ length: Math.min(Number(form.numeroPerfil || 0), 7) }).map((_, idx) => {
                  const i = idx + 1;
                  return (
                    <div key={`pin-field-${i}`}>
                      <label style={styles.label}>PIN Perfil {i}</label>
                      <input 
                        value={pins[i] || ''} 
                        onChange={(e) => handlePinChange(i, e.target.value)} 
                        placeholder={`Ingrese PIN para perfil ${i}`} 
                        style={styles.input} 
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </form>
        </div>

        <footer style={styles.footer}>
          <button type="button" onClick={handleClose} style={styles.cancelBtn} disabled={submitting}>Cancelar</button>
          <button type="button" onClick={handleSubmit} style={styles.submitBtn(submitting)} disabled={submitting}>
            {submitting ? 'Guardando...' : (initialData?.id ? 'Guardar cambios' : 'Crear')}
          </button>
        </footer>

        <style>{`.stock-modal-scroll { scrollbar-width: thin; overflow-x: hidden; }`}</style>
      </div>
    </div>,
    document.body
  )
}

const styles = {
  backdrop: { position: 'fixed', inset: 0, backgroundColor: 'rgba(2,6,23,0.55)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 18 },
  modal: { width: '100%', maxWidth: 500, background: '#071026', color: '#EDF2F7', borderRadius: 12, display: 'flex', flexDirection: 'column', maxHeight: '90vh' },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', borderBottom: '1px solid rgba(255,255,255,0.05)' },
  title: { margin: 0, fontSize: 18, fontWeight: 700 },
  closeBtn: { background: 'transparent', border: 'none', color: '#9CA3AF', fontSize: 20, cursor: 'pointer' },
  contentWrap: { overflowY: 'auto', padding: '20px', flex: '1 1 auto' },
  formGrid: { display: 'grid', gridTemplateColumns: '1fr', gap: 20 },
  label: { display: 'block', marginBottom: 8, fontWeight: 600, color: '#9FB4C8', fontSize: 13 },
  input: { width: '100%', padding: '12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.02)', color: '#fff', outline: 'none' },
  select: { width: '100%', padding: '12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: '#071026', color: '#fff', outline: 'none' },
  radioLabel: { display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' },
  radioText: { color: '#E6EEF7', fontSize: 14 },
  footer: { borderTop: '1px solid rgba(255,255,255,0.05)', padding: '16px', display: 'flex', justifyContent: 'flex-end', gap: 12 },
  cancelBtn: { padding: '10px 20px', borderRadius: 8, background: '#334155', color: '#fff', border: 'none', cursor: 'pointer' },
  submitBtn: (disabled) => ({ padding: '10px 20px', borderRadius: 8, background: disabled ? '#475569' : 'linear-gradient(90deg,#06B6D4,#10B981)', color: '#fff', border: 'none', cursor: disabled ? 'not-allowed' : 'pointer', fontWeight: 700 })
}