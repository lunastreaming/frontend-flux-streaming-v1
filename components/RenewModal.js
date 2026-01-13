'use client'

import React, { useState } from 'react'
import { useAuth } from '../context/AuthProvider'

export default function RenewModal({ product, balance, onClose, onSuccess }) {
  const { ensureValidAccess } = useAuth()

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [fieldError, setFieldError] = useState(null)

  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const BASE_URL = process.env.NEXT_PUBLIC_API_URL

  // Normaliza strings vacíos o "null"/"undefined"
  const normalizeString = (v) => {
    if (v === null || v === undefined) return ''
    if (typeof v !== 'string') return v
    const t = v.trim()
    if (t === '' || t.toLowerCase() === 'null' || t.toLowerCase() === 'undefined') return ''
    return t
  }

  // Acepta product directo o envuelto en { product: {...} }
  const resolveProduct = (p) => {
    if (!p) return null
    if (p.id || p.name || p.renewalPrice) {
      return { ...p, name: normalizeString(p.name) }
    }
    if (p.product && (p.product.id || p.product.name || p.product.renewalPrice)) {
      const pr = p.product
      return { ...pr, name: normalizeString(pr.name) }
    }
    return { ...p, name: normalizeString(p.name) }
  }

  const resolvedProduct = resolveProduct(product)

  const validateFields = () => {
    if (!password.trim()) return 'Ingresa tu contraseña'
    if (password.length < 6) return 'La contraseña debe tener al menos 6 caracteres'
    return null
  }

  const handleConfirm = async () => {
    if (!resolvedProduct) {
      setError('Producto inválido')
      return
    }
    setFieldError(null)
    setError(null)

    const vErr = validateFields()
    if (vErr) {
      setFieldError(vErr)
      return
    }

    setLoading(true)
    try {
      const token = await ensureValidAccess()
      if (!token) {
        setError('No hay sesión activa. Inicia sesión para renovar.')
        return
      }

      // Nota: si tu endpoint espera stockId en vez de product.id, ajusta aquí a resolvedProduct.stockId
      const res = await fetch(`${BASE_URL}/api/stocks/${resolvedProduct.id}/renew`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ password: password.trim() })
      })

      if (!res.ok) {
        const serverMsg = await res.text().catch(() => '')
        if (res.status === 400) {
          setError(serverMsg || 'La contraseña ingresada es incorrecta')
          return
        }
        if (res.status === 401 || res.status === 403) {
          setError('Tu sesión expiró. Vuelve a iniciar sesión.')
          return
        }
        throw new Error(serverMsg || `Error ${res.status}`)
      }

      if (!res.ok) { /* manejo de errores */ }
      const updated = await res.json()
      if (onSuccess) {
      // Enviamos updated.product para que la tabla reciba el DTO plano
      // Si por alguna razón no viene .product, enviamos el objeto tal cual
      onSuccess(updated?.product ?? updated);
    }
      onClose()
    } catch (err) {
      setError(err.message || String(err))
    } finally {
      setLoading(false)
    }
  }

  if (!resolvedProduct) return null

  const formatMoney = (v) => {
    if (v == null) return '—'
    const n = Number(v)
    if (Number.isNaN(n)) return String(v)
    return n.toLocaleString('en-US', { style: 'currency', currency: 'USD' })
  }

  const price = resolvedProduct?.renewalPrice ?? null
  const insufficient = price != null && balance != null && Number(balance) < Number(price)

  return (
    <div style={backdrop}>
      <div role="dialog" aria-modal="true" style={card}>
        <button onClick={onClose} aria-label="Cerrar" style={closeBtn}>✕</button>

        <div style={content}>
          <div style={header}>
            <h2 style={title}>{resolvedProduct?.name ?? 'Renovar producto'}</h2>
            <p style={subtitle}>Resumen de renovación</p>
          </div>

          <div style={bigValuesRow}>
            <div style={bigValueCard}>
              <div style={bigLabel}>Saldo disponible</div>
              <div style={bigValue}>{formatMoney(balance)}</div>
            </div>
            <div style={bigValueCard}>
              <div style={bigLabel}>Precio renovación</div>
              <div style={bigValue}>{formatMoney(price)}</div>
            </div>
          </div>

          {insufficient && <div style={insufficientBanner}>Saldo insuficiente para renovar</div>}
          {error && <p style={errorText}>{error}</p>}

          {/* Campo único: password */}
          <div style={formBox}>
            <div style={formRow}>
              <label style={label}>Password</label>
              <div style={passwordWrap}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{ ...input, paddingRight: 40 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(s => !s)}
                  style={eyeBtn}
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
            </div>
            {fieldError && <p style={errorText}>{fieldError}</p>}
          </div>

          <div style={{ display: 'flex', gap: 12, width: '100%', justifyContent: 'center', marginTop: 6 }}>
            <button onClick={onClose} style={secondaryBtn} disabled={loading}>Cerrar</button>
            <button
              onClick={handleConfirm}
              style={confirmBtn(insufficient || loading)} // cambia el estilo si está deshabilitado
              disabled={loading || insufficient}         // deshabilitado si saldo < price o si está cargando
            >
              {loading ? 'Procesando...' : 'Confirmar renovación'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ===== estilos (inline objects) ===== */
const backdrop = { position: 'fixed', inset: 0, backgroundColor: 'rgba(2,6,23,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px' }
const card = { width: '100%', maxWidth: 680, background: 'linear-gradient(180deg, #071026 0%, #081426 100%)', color: '#EDF2F7', borderRadius: 16, padding: '24px', position: 'relative', boxShadow: '0 18px 48px rgba(2,6,23,0.75)', fontFamily: '"Rubik", system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial' }
const closeBtn = { position: 'absolute', right: 16, top: 16, background: 'transparent', border: 'none', color: '#9CA3AF', fontSize: 18, cursor: 'pointer' }
const content = { display: 'flex', flexDirection: 'column', gap: 20, alignItems: 'center', textAlign: 'center' }
const header = { marginBottom: 2 }
const title = { margin: 0, fontSize: 20, fontWeight: 800, letterSpacing: '-0.02em', color: '#fff' }
const subtitle = { margin: 0, marginTop: 6, fontSize: 13, color: '#BBD2E6' }
const bigValuesRow = { width: '100%', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 12, alignItems: 'stretch' }
const bigValueCard = { background: 'linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01))', border: '1px solid rgba(255,255,255,0.04)', borderRadius: 12, padding: '18px', display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center', justifyContent: 'center', minHeight: 110 }
const bigLabel = { fontSize: 13, color: '#9FB4C8', fontWeight: 700, textTransform: 'uppercase' }
const bigValue = { fontSize: 28, fontWeight: 900, color: '#E6EEF7', letterSpacing: '-0.02em' }
const insufficientBanner = { marginTop: 12, background: 'linear-gradient(90deg, rgba(252,165,165,0.06), rgba(252,165,165,0.04))', color: '#FCA5A5', padding: '10px 14px', borderRadius: 10, fontWeight: 800, width: '100%', textAlign: 'center', border: '1px solid rgba(252,165,165,0.08)' }
const formBox = { width: '100%', background: 'linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01))', borderRadius: 12, padding: 16, display: 'flex', flexDirection: 'column', gap: 12, border: '1px solid rgba(255,255,255,0.04)' }
const formRow = { width: '100%', display: 'flex', flexDirection: 'column', gap: 8 }
const label = { fontSize: 12, color: '#9FB4C8', fontWeight: 700, textTransform: 'uppercase', textAlign: 'left' }
const input = { padding: '12px 14px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.02)', color: '#E6EEF7', outline: 'none', fontSize: 14, width: '100%' }
const passwordWrap = { position: 'relative', display: 'flex', alignItems: 'center' }
const eyeBtn = { position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', color: '#E6EEF7', borderRadius: 8, width: 28, height: 28, display: 'grid', placeItems: 'center', cursor: 'pointer', fontSize: 16 }
const secondaryBtn = { padding: '12px 16px', borderRadius: 10, background: '#E6EEF7', color: '#081426', fontWeight: 800, border: 'none', cursor: 'pointer', minWidth: 120 }
const confirmBtn = (disabled) => ({
  padding: '12px 16px',
  borderRadius: 10,
  background: disabled ? 'linear-gradient(90deg, #94A3B8, #6B7280)' : 'linear-gradient(90deg, #06B6D4, #10B981)',
  color: disabled ? '#E6EEF7' : '#021018',
  fontWeight: 900,
  border: 'none',
  cursor: disabled ? 'not-allowed' : 'pointer',
  minWidth: 220
})
const errorText = { color: '#FCA5A5', textAlign: 'center', fontWeight: 700 }