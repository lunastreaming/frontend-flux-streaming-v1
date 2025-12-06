// components/RequestToSoldModal.jsx
'use client'

import React, { useEffect, useRef, useState } from 'react'
import ReactDOM from 'react-dom'
import { FaTimes } from 'react-icons/fa'

export default function RequestToSoldModal({
  visible,
  onClose,
  onSuccess,
  initialData = null,
  BASE_URL = process.env.NEXT_PUBLIC_API_URL || ''
}) {
  const [mounted, setMounted] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const [form, setForm] = useState({
    productNameReadOnly: '',
    username: '',
    password: '',
    url: '',
    tipo: 'CUENTA',
    numeroPerfil: '',
    pin: '',
    approvalNote: ''
  })

  const contentRef = useRef(null)

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    if (!visible) {
      resetForm()
      return
    }

    if (initialData) {
      setForm({
        productNameReadOnly: initialData.productName ?? initialData?.rawStock?.productName ?? '',
        username: initialData.username ?? '',
        password: initialData.password ?? '',
        url: initialData.url ?? '',
        tipo: initialData.tipo ?? (initialData.type ?? 'CUENTA'),
        numeroPerfil: initialData.numeroPerfil ?? initialData.numberProfile ?? '',
        pin: initialData.pin ?? '',
        approvalNote: initialData.note ?? ''
      })
    }

    const t = setTimeout(() => updateShadows(), 120)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, initialData])

  function resetForm() {
    setForm({
      productNameReadOnly: '',
      username: '',
      password: '',
      url: '',
      tipo: 'CUENTA',
      numeroPerfil: '',
      pin: '',
      approvalNote: ''
    })
    setSubmitting(false)
  }

  function getAuthHeader() {
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null
    return token ? { Authorization: `Bearer ${token}` } : null
  }

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
  }

  const validate = () => {
    if (!form.username?.trim()) { alert('El campo Username es obligatorio'); return false }
    if (form.tipo === 'PERFIL') {
      if (form.numeroPerfil === '') { alert('Indica la cantidad de perfiles'); return false }
      const n = Number(form.numeroPerfil)
      if (!Number.isInteger(n) || n < 1) { alert('Número de perfil debe ser un entero mayor o igual a 1'); return false }
      if (n > 7) { alert('Máximo 7 perfiles por operación'); return false }
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

      const stockId = initialData?.id ?? initialData?.stockId ?? null
      if (!stockId) {
        alert('No se encontró el id del stock. No se puede aprobar.')
        setSubmitting(false)
        return
      }

      const payload = {
        username: form.username?.trim() || null,
        password: form.password || null,
        url: form.url || null,
        tipo: form.tipo || null,
        numeroPerfil: form.numeroPerfil === '' ? null : Number(form.numeroPerfil),
        pin: form.pin || null,
        note: form.approvalNote || null
      }

      const res = await fetch(`${BASE_URL}/api/supplier/provider/${encodeURIComponent(stockId)}/sell-orders`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...headersAuth },
        body: JSON.stringify(payload)
      })

      if (!res.ok) {
        const txt = await res.text().catch(() => '')
        throw new Error(`Error ${res.status}: ${txt || res.statusText}`)
      }

      const data = await res.json()
      if (typeof onSuccess === 'function') onSuccess(data)
      handleClose()
    } catch (err) {
      console.error('Error aprobando cambio request->sold:', err)
      alert('No se pudo procesar la aprobación: ' + (err.message || err))
    } finally {
      setSubmitting(false)
    }
  }

  function handleClose() {
    resetForm()
    if (typeof onClose === 'function') {
      try { onClose() } catch (e) { console.error('onClose threw', e) }
    }
  }

  function updateShadows() {
    const el = contentRef.current
    if (!el) return
    setTimeout(() => { if (!el) return }, 0)
  }

  if (!visible) return null
  if (typeof document === 'undefined' || !mounted) return null

  return ReactDOM.createPortal(
    <div
      style={styles.backdrop}
      onMouseDown={(e) => { if (e.target === e.currentTarget) handleClose() }}
      data-testid="requesttosoldmodal-backdrop"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Aprobar cambio de stock"
        style={styles.modal}
        onMouseDown={(e) => e.stopPropagation()}
        data-testid="requesttosoldmodal-dialog"
      >
        <header style={styles.header}>
          <h3 style={styles.title}>✅ Aprobar cambio de stock</h3>
          <button type="button" onClick={handleClose} aria-label="Cerrar" style={styles.closeBtn} data-testid="requesttosoldmodal-close"><FaTimes /></button>
        </header>

        <div ref={contentRef} style={styles.contentWrap} className="requesttosold-modal-scroll">
          <form onSubmit={(e) => { e.preventDefault(); handleSubmit() }} style={styles.formGrid}>
            {/* Producto solo lectura */}
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={styles.label}>Producto</label>
              <div style={styles.readOnlyProduct} data-testid="requesttosold-product">
                {form.productNameReadOnly || ''}
              </div>
            </div>

            {/* Username */}
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={styles.label}>Username</label>
              <input
                name="username"
                value={form.username}
                onChange={handleChange}
                placeholder="Usuario"
                style={styles.input}
                data-testid="requesttosold-username"
              />
            </div>

            {/* Password */}
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={styles.label}>Password</label>
              <input
                name="password"
                value={form.password}
                onChange={handleChange}
                placeholder="Password"
                style={{ ...styles.input, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace' }}
                data-testid="requesttosold-password"
              />
            </div>

            {/* URL */}
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={styles.label}>URL</label>
              <input
                name="url"
                value={form.url}
                onChange={handleChange}
                placeholder="https://..."
                style={styles.input}
                data-testid="requesttosold-url"
              />
            </div>

            {/* Tipo */}
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

            {/* Número de perfil */}
            <div>
              <label style={styles.label}>Número de perfil</label>
              <input
                name="numeroPerfil"
                value={form.numeroPerfil}
                onChange={handleChange}
                placeholder="1-7"
                style={styles.input}
                data-testid="requesttosold-numperfil"
              />
            </div>

            {/* PIN */}
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={styles.label}>PIN</label>
              <input
                name="pin"
                value={form.pin}
                onChange={handleChange}
                placeholder="PIN"
                style={styles.input}
                data-testid="requesttosold-pin"
              />
            </div>

            {/* Nota de aprobación */}
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={styles.label}>Nota de aprobación</label>
              <textarea
                name="approvalNote"
                value={form.approvalNote}
                onChange={handleChange}
                placeholder="Escribe aquí la nota de aprobación..."
                style={{ ...styles.input, minHeight: 120, resize: 'vertical' }}
                data-testid="requesttosold-note"
              />
            </div>
          </form>
        </div>

        <footer style={styles.footer}>
          <button type="button" onClick={handleClose} style={styles.cancelBtn} disabled={submitting} data-testid="requesttosold-cancel">Cancelar</button>
          <button type="button" onClick={handleSubmit} style={styles.submitBtn(submitting)} disabled={submitting} data-testid="requesttosold-approve">
            {submitting ? 'Procesando...' : 'Aprobar cambio'}
          </button>
        </footer>

        <style>{`
          .requesttosold-modal-scroll { scrollbar-width: thin; scrollbar-color: rgba(155,178,200,0.6) transparent; overflow-x: hidden; }
          .requesttosold-modal-scroll::-webkit-scrollbar { height: 10px; width: 10px; }
          .requesttosold-modal-scroll::-webkit-scrollbar-track { background: transparent; }
          .requesttosold-modal-scroll::-webkit-scrollbar-thumb { background: linear-gradient(180deg, rgba(155,178,200,0.18), rgba(155,178,200,0.28)); border-radius: 999px; border: 2px solid rgba(2,6,23,0.0); }
          select option { background: #071026 !important; color: #EDF2F7 !important; }
          select option[disabled] { color: #9CA3AF !important; }
        `}</style>
      </div>
    </div>,
    document.body
  )
}

/* ===== estilos (mismos que SupportResolveModal) ===== */
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
  readOnlyProduct: { padding: '10px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.04)', background: 'rgba(255,255,255,0.01)', color: '#cfe8ff', minHeight: 44, display: 'flex', alignItems: 'center' },
  select: { padding: '10px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.06)', background: '#071026', color: '#E6EEF7', outline: 'none', appearance: 'none', WebkitAppearance: 'none', MozAppearance: 'none', backgroundImage: 'linear-gradient(45deg, transparent 50%, #9fb4c8 50%), linear-gradient(135deg, #9fb4c8 50%, transparent 50%)', backgroundPosition: 'calc(100% - 18px) calc(1em + 2px), calc(100% - 13px) calc(1em + 2px)', backgroundSize: '6px 6px, 6px 6px', backgroundRepeat: 'no-repeat', cursor: 'pointer' },
  radioLabel: { display: 'flex', alignItems: 'center', gap: 8 }, radioText: { marginLeft: 6, color: '#E6EEF7' },
  footer: { borderTop: '1px solid rgba(255,255,255,0.04)', padding: '10px 14px', background: 'linear-gradient(180deg, rgba(255,255,255,0.01), rgba(255,255,255,0.00))', display: 'flex', justifyContent: 'flex-end', gap: 10, flexShrink: 0 },
  cancelBtn: { padding: '10px 14px', borderRadius: 8, background: '#e6eef7', color: '#081426', border: 'none', cursor: 'pointer' },
  submitBtn: (disabled) => ({ padding: '10px 14px', borderRadius: 8, background: disabled ? 'linear-gradient(90deg,#94A3B8,#6B7280)' : 'linear-gradient(90deg,#06B6D4,#10B981)', color: disabled ? '#E6EEF7' : '#021018', border: 'none', cursor: disabled ? 'not-allowed' : 'pointer', fontWeight: 700 })
}

/* Responsive tweak (ejecuta en cliente) */
try {
  const mq = window?.matchMedia?.('(max-width: 900px)')
  if (mq && mq.matches) {
    styles.formGrid.gridTemplateColumns = '1fr'
    styles.modal.maxWidth = '96%'
    styles.modal.maxHeight = '92vh'
  }
} catch (e) { /* ignore in SSR */ }