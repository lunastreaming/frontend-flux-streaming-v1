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
    }

    const t = setTimeout(() => updateShadows(), 120)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      const fetchOptions = headers ? { headers } : {}
      const res = await fetch(url, fetchOptions)
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

  const validate = () => {
    if (!form.productId) { alert('Selecciona un producto'); return false }
    if (!form.username?.trim()) { alert('El campo Username es obligatorio'); return false }
    if (form.tipo === 'PERFIL') {
      if (form.numeroPerfil === '') { alert('Indica la cantidad de perfiles'); return false }
      const n = Number(form.numeroPerfil)
      if (!Number.isInteger(n) || n < 1) { alert('Número de perfil debe ser un entero mayor o igual a 1'); return false }
      if (n > 7) { alert('Máximo 7 stocks por operación'); return false }
    }
    if (form.numeroPerfil !== '' && isNaN(Number(form.numeroPerfil))) { alert('Número de perfil debe ser un número válido'); return false }
    return true
  }

  const handleSubmit = async () => {
    if (!validate()) return
    setSubmitting(true)
    try {
      const headersAuth = getAuthHeader()
      if (!headersAuth) {
        alert('No estás autenticado. Inicia sesión e intenta nuevamente.')
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
          pin: form.pin || null
        }

        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/stocks/${initialData.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', ...headersAuth },
          body: JSON.stringify(payload)
        })
        const txt = await res.text().catch(() => '')
        if (!res.ok) throw new Error(`Error ${res.status}: ${txt || res.statusText}`)
        const data = txt ? JSON.parse(txt) : {}
        if (onSuccess) onSuccess(data)
        handleClose()
        return
      }

      let stocksToSend = []
      if (form.tipo === 'CUENTA') {
        stocksToSend.push({
          productId: form.productId,
          username: form.username.trim(),
          password: form.password || null,
          url: form.url || null,
          tipo: 'CUENTA',
          numeroPerfil: null,
          pin: form.pin || null
        })
      } else {
        const n = Number(form.numeroPerfil || 0)
        const capped = Math.min(n, 7)
        for (let i = 1; i <= capped; i++) {
          stocksToSend.push({
            productId: form.productId,
            username: form.username.trim(),
            password: form.password || null,
            url: form.url || null,
            tipo: 'PERFIL',
            numeroPerfil: i,
            pin: form.pin || null
          })
        }
      }

      const body = { stocks: stocksToSend }

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/stocks/batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headersAuth },
        body: JSON.stringify(body)
      })

      const txt = await res.text().catch(() => '')
      if (!res.ok) throw new Error(`Error ${res.status}: ${txt || res.statusText}`)
      const resp = txt ? JSON.parse(txt) : {}
      const created = resp?.created ?? resp?.createdStocks ?? resp ?? []

      if (onSuccess) onSuccess(created)
      handleClose()
    } catch (err) {
      console.error('Error guardando stock batch:', err)
      alert('No se pudo guardar el stock: ' + (err.message || err))
    } finally {
      setSubmitting(false)
    }
  }

  /* ---------- close handler centralizado ---------- */
  function handleClose() {
    console.log('[StockModal] handleClose called, onClose exists?', typeof onClose === 'function')
    resetForm()
    if (typeof onClose === 'function') {
      try { onClose() } catch (e) { console.error('onClose threw', e) }
    }
  }

  /* ---------- scroll helpers ---------- */
  function updateShadows() {
    const el = contentRef.current
    if (!el) return
    setTimeout(() => {
      if (!el) return
      const top = el.scrollTop > 8
      const bottom = el.scrollHeight - el.clientHeight - el.scrollTop > 8
      setShowTopShadow(top)
      setShowBottomShadow(bottom)
    }, 0)
  }

  function onContentScroll() { updateShadows() }

  /* ---------- IMPORTANT: respect 'visible' and SSR guard ---------- */
  if (!visible) return null
  if (typeof document === 'undefined' || !mounted) return null

  /* ---------- RENDER (portal) ---------- */
  return ReactDOM.createPortal(
    <div
      style={styles.backdrop}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) handleClose()
      }}
      data-testid="stockmodal-backdrop"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={initialData && initialData.id ? 'Editar stock' : 'Nuevo stock'}
        style={styles.modal}
        onMouseDown={(e) => e.stopPropagation()}
        data-testid="stockmodal-dialog"
      >
        <header style={styles.header}>
          <h3 style={styles.title}>{initialData && initialData.id ? '✏️ Editar stock' : '➕ Nuevo stock'}</h3>

          <button
            type="button"
            onClick={handleClose}
            aria-label="Cerrar"
            style={styles.closeBtn}
            data-testid="stockmodal-close"
          >
            <FaTimes />
          </button>
        </header>

        <div ref={contentRef} onScroll={onContentScroll} style={styles.contentWrap} className="stock-modal-scroll">
          <form onSubmit={(e) => { e.preventDefault(); handleSubmit() }} style={styles.formGrid}>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={styles.label}>Producto</label>
              <select
                name="productId"
                value={form.productId}
                onChange={handleChange}
                style={styles.select}
                disabled={loadingProducts}
                aria-required="true"
                data-testid="stockmodal-select-product"
              >
                <option value="" disabled style={styles.optionDisabled}>{loadingProducts ? 'Cargando productos…' : 'Selecciona producto'}</option>
                {products.map(p => <option key={p.id} value={p.id} style={styles.option}>{p.name}</option>)}
              </select>
            </div>

            <div style={{ gridColumn: '1 / -1' }}>
              <label style={styles.label}>Username</label>
              <input name="username" value={form.username} onChange={handleChange} placeholder="Usuario" style={styles.input} data-testid="stockmodal-username" />
            </div>

            <div>
              <label style={styles.label}>Password</label>
              <input name="password" value={form.password} onChange={handleChange} placeholder="Password" style={{ ...styles.input, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace' }} data-testid="stockmodal-password" />
            </div>

            <div style={{ gridColumn: '1 / -1' }}>
              <label style={styles.label}>URL</label>
              <input name="url" value={form.url} onChange={handleChange} placeholder="https://..." style={styles.input} data-testid="stockmodal-url" />
            </div>

            <div style={{ gridColumn: '1 / -1' }}>
              <label style={styles.label}>Tipo</label>
              <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
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

            <div>
              <label style={styles.label}>Número de perfil</label>
              <input name="numeroPerfil" value={form.numeroPerfil} onChange={handleChange} placeholder="123" style={styles.input} data-testid="stockmodal-numperfil" />
            </div>

            <div style={{ gridColumn: '1 / -1' }}>
              <label style={styles.label}>PIN</label>
              <input name="pin" value={form.pin} onChange={handleChange} placeholder="PIN" style={styles.input} data-testid="stockmodal-pin" />
            </div>
          </form>
        </div>

        <footer style={styles.footer}>
          <button type="button" onClick={handleClose} style={styles.cancelBtn} disabled={submitting} data-testid="stockmodal-cancel">Cancelar</button>
          <button type="button" onClick={handleSubmit} style={styles.submitBtn(submitting)} disabled={submitting} data-testid="stockmodal-create">
            {submitting ? 'Guardando...' : (initialData && initialData.id ? 'Guardar cambios' : 'Crear')}
          </button>
        </footer>

        <style>{`
          .stock-modal-scroll { scrollbar-width: thin; scrollbar-color: rgba(155,178,200,0.6) transparent; overflow-x: hidden; }
          .stock-modal-scroll::-webkit-scrollbar { height: 10px; width: 10px; }
          .stock-modal-scroll::-webkit-scrollbar-track { background: transparent; }
          .stock-modal-scroll::-webkit-scrollbar-thumb { background: linear-gradient(180deg, rgba(155,178,200,0.18), rgba(155,178,200,0.28)); border-radius: 999px; border: 2px solid rgba(2,6,23,0.0); }
          select option { background: #071026 !important; color: #EDF2F7 !important; }
          select option[disabled] { color: #9CA3AF !important; }
        `}</style>
      </div>
    </div>,
    document.body
  )
}

/* ===== estilos (idénticos a la versión anterior, adaptables) ===== */
const styles = {
  backdrop: { position: 'fixed', inset: 0, backgroundColor: 'rgba(2,6,23,0.55)', zIndex: 2147483647, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 18 },
  modal: { width: '100%', maxWidth: 760, background: 'linear-gradient(180deg, #071026 0%, #081426 100%)', color: '#EDF2F7', borderRadius: 12, boxShadow: '0 20px 60px rgba(2,6,23,0.7)', overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: '85vh' },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.04)' },
  title: { margin: 0, fontSize: 17, fontWeight: 700 },
  closeBtn: { background: 'transparent', border: 'none', color: '#9CA3AF', fontSize: 18, cursor: 'pointer', padding: 6, lineHeight: 1 },
  contentWrap: { position: 'relative', overflowY: 'auto', padding: 16, flex: '1 1 auto' },
  formGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },
  label: { display: 'block', marginBottom: 6, fontWeight: 700, color: '#9FB4C8', fontSize: 13 },
  input: { width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)', color: '#E6EEF7', outline: 'none' },
  select: { padding: '10px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.06)', background: '#071026', color: '#E6EEF7', outline: 'none', appearance: 'none', WebkitAppearance: 'none', MozAppearance: 'none', backgroundImage: 'linear-gradient(45deg, transparent 50%, #9fb4c8 50%), linear-gradient(135deg, #9fb4c8 50%, transparent 50%)', backgroundPosition: 'calc(100% - 18px) calc(1em + 2px), calc(100% - 13px) calc(1em + 2px)', backgroundSize: '6px 6px, 6px 6px', backgroundRepeat: 'no-repeat', cursor: 'pointer' },
  option: { background: '#071026', color: '#EDF2F7' }, optionDisabled: { color: '#9CA3AF' },
  radioLabel: { display: 'flex', alignItems: 'center', gap: 8 }, radioText: { marginLeft: 6, color: '#E6EEF7' },
  footer: { borderTop: '1px solid rgba(255,255,255,0.04)', padding: '10px 14px', background: 'linear-gradient(180deg, rgba(255,255,255,0.01), rgba(255,255,255,0.00))', display: 'flex', justifyContent: 'flex-end', gap: 10, flexShrink: 0 },
  cancelBtn: { padding: '10px 14px', borderRadius: 8, background: '#e6eef7', color: '#081426', border: 'none', cursor: 'pointer' },
  submitBtn: (disabled) => ({ padding: '10px 14px', borderRadius: 8, background: disabled ? 'linear-gradient(90deg,#94A3B8,#6B7280)' : 'linear-gradient(90deg,#06B6D4,#10B981)', color: disabled ? '#E6EEF7' : '#021018', border: 'none', cursor: disabled ? 'not-allowed' : 'pointer', fontWeight: 700 })
}

/* Responsive tweak */
try {
  const mq = window?.matchMedia?.('(max-width: 900px)')
  if (mq && mq.matches) {
    styles.formGrid.gridTemplateColumns = '1fr'
    styles.modal.maxWidth = '96%'
    styles.modal.maxHeight = '92vh'
  }
} catch (e) { /* ignore in SSR */ }