'use client'

import React, { useState } from 'react'
import { useAuth } from '../context/AuthProvider'

export default function PurchaseModal({ product, balance, onClose, onSuccess }) {
  const { ensureValidAccess } = useAuth()

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [fieldError, setFieldError] = useState(null)

  // Campos del cliente
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  // Estado para modal de términos
  const [termsOpen, setTermsOpen] = useState(false)

  const BASE_URL = process.env.NEXT_PUBLIC_API_URL

  /* ===== resolveProduct robusto =====
     - Acepta: product directo, wrapper { product: {...} }, o page { content: [ { product: {...} } ] }
     - Limpia valores "null" o "undefined" en strings
  */
  const normalizeString = (v) => {
    if (v === null || v === undefined) return ''
    if (typeof v !== 'string') return v
    const t = v.trim()
    if (t === '' || t.toLowerCase() === 'null' || t.toLowerCase() === 'undefined') return ''
    return t
  }

  const resolveProduct = (p) => {
    if (!p) return null

    // 1) Si ya es el objeto product (tiene id o name o salePrice)
    if (p.id || p.name || p.salePrice || p.terms || p.productDetail || p.requestDetail) {
      return {
        ...p,
        terms: normalizeString(p.terms),
        productDetail: normalizeString(p.productDetail),
        requestDetail: normalizeString(p.requestDetail),
        name: normalizeString(p.name)
      }
    }

    // 2) Si viene envuelto: { product: { ... } }
    if (p.product && (p.product.id || p.product.name || p.product.salePrice)) {
      const pr = p.product
      return {
        ...pr,
        terms: normalizeString(pr.terms),
        productDetail: normalizeString(pr.productDetail),
        requestDetail: normalizeString(pr.requestDetail),
        name: normalizeString(pr.name)
      }
    }

    // 3) Si viene como página: { content: [ { product: {...} }, ... ] } -> tomar el primero válido
    if (Array.isArray(p.content) && p.content.length > 0) {
      const found = p.content.find(c => c && c.product && (c.product.id || c.product.name))
      if (found && found.product) {
        const pr = found.product
        return {
          ...pr,
          terms: normalizeString(pr.terms),
          productDetail: normalizeString(pr.productDetail),
          requestDetail: normalizeString(pr.requestDetail),
          name: normalizeString(pr.name)
        }
      }
    }

    // 4) Fallback: intentar limpiar campos si existen
    return {
      ...p,
      terms: normalizeString(p.terms),
      productDetail: normalizeString(p.productDetail),
      requestDetail: normalizeString(p.requestDetail),
      name: normalizeString(p.name)
    }
  }

  const resolvedProduct = resolveProduct(product)

  // console.log('PurchaseModal prop product:', product) // descomenta para depurar
  // console.log('PurchaseModal resolvedProduct:', resolvedProduct) // descomenta para depurar

  const validateFields = () => {
    if (!customerName.trim()) return 'Ingresa el nombre del cliente'
    if (!customerPhone.trim()) return 'Ingresa el celular'
    if (!/^\+?\d{7,15}$/.test(customerPhone.trim())) return 'Celular inválido'
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
        setError('No hay sesión activa. Inicia sesión para comprar.')
        return
      }

      const res = await fetch(`${BASE_URL}/api/stocks/products/${resolvedProduct.id}/purchase`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          clientName: customerName.trim(),
          clientPhone: customerPhone.trim(),
          password: password.trim()
        })
      })

      if (!res.ok) {
        const contentType = res.headers.get('content-type') || ''
        let serverMsg = ''
        if (contentType.includes('application/json')) {
          const json = await res.json().catch(() => null)
          serverMsg = json?.message || json?.error || ''
        } else {
          serverMsg = await res.text().catch(() => '')
        }

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

      const updated = await res.json()
      if (onSuccess) onSuccess(updated)
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

  const price = resolvedProduct?.salePrice ?? resolvedProduct?.price ?? null
  const insufficient = price != null && balance != null && Number(balance) < Number(price)

  // Extraer campos de términos
  const termsText = resolvedProduct?.terms ?? ''
  const productDetail = resolvedProduct?.productDetail ?? ''
  const requestDetail = resolvedProduct?.requestDetail ?? ''

  const hasAnyTerms = Boolean(
    (termsText && termsText.trim()) ||
    (productDetail && productDetail.trim()) ||
    (requestDetail && requestDetail.trim())
  )

  return (
    <div style={backdrop}>
      <div role="dialog" aria-modal="true" style={card}>
        <button onClick={onClose} aria-label="Cerrar" style={closeBtn}>✕</button>

        <div style={content}>
          <div style={header}>
            <h2 style={title}>{resolvedProduct?.name ?? 'Comprar producto'}</h2>
            <p style={subtitle}>Resumen de compra</p>
          </div>

          <div style={bigValuesRow}>
            <div style={bigValueCard}>
              <div style={bigLabel}>Saldo disponible</div>
              <div style={bigValue}>{formatMoney(balance)}</div>
            </div>
            <div style={bigValueCard}>
              <div style={bigLabel}>Precio producto</div>
              <div style={bigValue}>{formatMoney(price)}</div>
            </div>
          </div>

          {insufficient && <div style={insufficientBanner}>Saldo insuficiente para comprar</div>}
          {error && <p style={errorText}>{error}</p>}

          {/* Campos del cliente */}
          <div style={formBox}>
            <div style={formRow}>
              <label style={label}>Nombre del cliente</label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                style={input}
              />
            </div>
            <div style={formRow}>
              <label style={label}>Celular</label>
              <input
                type="tel"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                style={input}
              />
            </div>
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

          <div style={infoBox}>
            <div style={{ fontSize: 13, color: '#9FB4C8', textAlign: 'center' }}>
              Confirma la compra solo si estás de acuerdo con el cargo correspondiente.
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12, width: '100%', justifyContent: 'center', marginTop: 6 }}>
            <button onClick={() => setTermsOpen(true)} style={termsBtn} type="button">
              Términos y condiciones
            </button>

            <button onClick={onClose} style={secondaryBtn} disabled={loading}>Cerrar</button>
            <button
              onClick={handleConfirm}
              style={confirmBtn(insufficient || loading)}
              disabled={loading || insufficient}
            >
              {loading ? 'Procesando...' : 'Confirmar compra'}
            </button>
          </div>
        </div>
      </div>

      {/* Modal de Términos */}
      {termsOpen && (
        <div style={termsBackdrop} role="dialog" aria-modal="true" aria-labelledby="terms-title">
          <div style={termsCard}>
            <header style={termsHeader}>
              <h3 id="terms-title" style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>Términos y condiciones</h3>
              <button onClick={() => setTermsOpen(false)} aria-label="Cerrar términos" style={termsClose}>✕</button>
            </header>

            <div style={termsContent}>
              {!hasAnyTerms ? (
                <p style={{ color: '#9FB4C8' }}>No hay términos o detalles disponibles para este producto.</p>
              ) : (
                <>
                  {termsText && termsText.trim() && (
                    <section style={termsSection}>
                      <h4 style={termsSectionTitle}>Términos</h4>
                      <p style={termsParagraph}>{termsText}</p>
                    </section>
                  )}

                  {productDetail && productDetail.trim() && (
                    <section style={termsSection}>
                      <h4 style={termsSectionTitle}>Detalle del producto</h4>
                      <p style={termsParagraph}>{productDetail}</p>
                    </section>
                  )}

                  {requestDetail && requestDetail.trim() && (
                    <section style={termsSection}>
                      <h4 style={termsSectionTitle}>Detalle de solicitud</h4>
                      <p style={termsParagraph}>{requestDetail}</p>
                    </section>
                  )}
                </>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, padding: '12px 18px' }}>
              <button onClick={() => setTermsOpen(false)} style={termsCloseBtn}>Cerrar</button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
/* ===== estilos (inline objects) ===== */

const backdrop = {
  position: 'fixed',
  inset: 0,
  backgroundColor: 'rgba(2,6,23,0.6)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 9999,
  padding: '20px'
}

const card = {
  width: '100%',
  maxWidth: 680,
  background: 'linear-gradient(180deg, #071026 0%, #081426 100%)',
  color: '#EDF2F7',
  borderRadius: 16,
  padding: '24px',
  position: 'relative',
  boxShadow: '0 18px 48px rgba(2,6,23,0.75)',
  fontFamily: '"Rubik", system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial'
}

const closeBtn = {
  position: 'absolute',
  right: 16,
  top: 16,
  background: 'transparent',
  border: 'none',
  color: '#9CA3AF',
  fontSize: 18,
  cursor: 'pointer'
}

const content = { display: 'flex', flexDirection: 'column', gap: 20, alignItems: 'center', textAlign: 'center' }
const header = { marginBottom: 2 }
const title = { margin: 0, fontSize: 20, fontWeight: 800, letterSpacing: '-0.02em', color: '#fff' }
const subtitle = { margin: 0, marginTop: 6, fontSize: 13, color: '#BBD2E6' }

const bigValuesRow = {
  width: '100%',
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: 16,
  marginTop: 12,
  alignItems: 'stretch'
}

const bigValueCard = {
  background: 'linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01))',
  border: '1px solid rgba(255,255,255,0.04)',
  borderRadius: 12,
  padding: '18px',
  display: 'flex',
  flexDirection: 'column',
  gap: 10,
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: 110
}

const bigLabel = { fontSize: 13, color: '#9FB4C8', fontWeight: 700, textTransform: 'uppercase' }
const bigValue = { fontSize: 28, fontWeight: 900, color: '#E6EEF7', letterSpacing: '-0.02em' }

const insufficientBanner = {
  marginTop: 12,
  background: 'linear-gradient(90deg, rgba(252,165,165,0.06), rgba(252,165,165,0.04))',
  color: '#FCA5A5',
  padding: '10px 14px',
  borderRadius: 10,
  fontWeight: 800,
  width: '100%',
  textAlign: 'center',
  border: '1px solid rgba(252,165,165,0.08)'
}

const formBox = {
  width: '100%',
  background: 'linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01))',
  borderRadius: 12,
  padding: 16,
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
  border: '1px solid rgba(255,255,255,0.04)'
}

const formRow = {
  width: '100%',
  display: 'flex',
  flexDirection: 'column',
  gap: 8
}

const label = {
  fontSize: 12,
  color: '#9FB4C8',
  fontWeight: 700,
  textTransform: 'uppercase',
  textAlign: 'left'
}

const input = {
  padding: '12px 14px',
  borderRadius: 10,
  border: '1px solid rgba(255,255,255,0.08)',
  background: 'rgba(255,255,255,0.02)',
  color: '#E6EEF7',
  outline: 'none',
  fontSize: 14,
  width: '100%'
}

const passwordWrap = {
  position: 'relative',
  display: 'flex',
  alignItems: 'center'
}

const eyeBtn = {
  position: 'absolute',
  right: 10,
  top: '50%',
  transform: 'translateY(-50%)',
  background: 'transparent',
  border: 'none',
  color: '#E6EEF7',
  borderRadius: 8,
  width: 28,
  height: 28,
  display: 'grid',
  placeItems: 'center',
  cursor: 'pointer',
  fontSize: 16
}

const infoBox = {
  width: '100%',
  background: 'linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01))',
  borderRadius: 10,
  padding: 12,
  display: 'flex',
  gap: 6,
  alignItems: 'center',
  justifyContent: 'center'
}

const actions = { display: 'flex', gap: 12, justifyContent: 'center', marginTop: 6, width: '100%' }

const secondaryBtn = {
  padding: '12px 16px',
  borderRadius: 10,
  background: '#E6EEF7',
  color: '#081426',
  fontWeight: 800,
  border: 'none',
  cursor: 'pointer',
  minWidth: 120
}

const confirmBtn = (disabled) => ({
  padding: '12px 16px',
  borderRadius: 10,
  background: disabled
    ? 'linear-gradient(90deg, #94A3B8, #6B7280)'
    : 'linear-gradient(90deg, #06B6D4, #10B981)',
  color: disabled ? '#E6EEF7' : '#021018',
  fontWeight: 900,
  border: 'none',
  cursor: disabled ? 'not-allowed' : 'pointer',
  minWidth: 220
})

const termsBtn = {
  padding: '10px 14px',
  borderRadius: 10,
  background: 'transparent',
  color: '#93C5FD',
  border: '1px solid rgba(147,197,253,0.12)',
  cursor: 'pointer',
  fontWeight: 700
}

/* ===== estilos modal términos ===== */

const termsBackdrop = {
  position: 'fixed',
  inset: 0,
  backgroundColor: 'rgba(2,6,23,0.6)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 10000,
  padding: '20px'
}

const termsCard = {
  width: '100%',
  maxWidth: 720,
  background: '#071026',
  color: '#E6EEF7',
  borderRadius: 12,
  boxShadow: '0 18px 48px rgba(2,6,23,0.75)',
  overflow: 'hidden',
  display: 'flex',
  flexDirection: 'column'
}

const termsHeader = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '14px 18px',
  borderBottom: '1px solid rgba(255,255,255,0.04)'
}

const termsClose = {
  background: 'transparent',
  border: 'none',
  color: '#9CA3AF',
  fontSize: 18,
  cursor: 'pointer'
}

const termsContent = {
  padding: '16px 18px',
  maxHeight: '56vh',
  overflowY: 'auto',
  display: 'flex',
  flexDirection: 'column',
  gap: 12
}

const termsSection = {
  background: 'linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01))',
  borderRadius: 10,
  padding: 12,
  border: '1px solid rgba(255,255,255,0.04)'
}

const termsSectionTitle = {
  margin: 0,
  fontSize: 13,
  color: '#9FB4C8',
  fontWeight: 800,
  textTransform: 'uppercase'
}

const termsParagraph = {
  margin: '8px 0 0 0',
  color: '#DDEBF6',
  lineHeight: 1.45,
  whiteSpace: 'pre-wrap'
}

const termsCloseBtn = {
  padding: '10px 14px',
  borderRadius: 8,
  background: '#E6EEF7',
  color: '#071026',
  fontWeight: 800,
  border: 'none',
  cursor: 'pointer'
}

const errorText = { color: '#FCA5A5', textAlign: 'center', fontWeight: 700 }