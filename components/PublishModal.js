'use client'

import React, { useEffect, useState } from 'react'

export default function PublishModal({
  open,
  onClose,
  product,
  onPublished,      // callback que recibe el producto actualizado
  mode = 'publish'  // 'publish' | 'renew'
}) {
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(false)
  const [balance, setBalance] = useState(null)
  const [price, setPrice] = useState(null)
  const [error, setError] = useState(null)
  const BASE_URL = process.env.NEXT_PUBLIC_API_URL

  useEffect(() => {
    if (!open) return
    setError(null)
    setBalance(null)
    setPrice(null)
    fetchInfo()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, product, mode])

  async function fetchInfo() {
    setChecking(true)
    setError(null)
    try {
      const token = localStorage.getItem('accessToken')

      const userRes = await fetch(`${BASE_URL}/api/users/me`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (!userRes.ok) throw new Error(`Error al obtener usuario ${userRes.status}`)
      const userJson = await userRes.json()
      setBalance(userJson.balance ?? userJson.walletBalance ?? userJson.available ?? null)

      const setRes = await fetch(`${BASE_URL}/api/admin/settings`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (!setRes.ok) throw new Error(`Error al obtener settings ${setRes.status}`)
      const setJson = await setRes.json()
      let cfgPrice = null
      if (setJson) {
        if (setJson.supplierPublication && typeof setJson.supplierPublication.valueNum !== 'undefined') {
          cfgPrice = setJson.supplierPublication.valueNum
        } else if (Array.isArray(setJson)) {
          const entry = setJson.find(e => (e.key === 'supplierPublication' || e.name === 'supplierPublication'))
          if (entry) cfgPrice = entry.valueNum ?? entry.value ?? null
        } else {
          cfgPrice = setJson.supplierPublication?.valueNum ?? null
        }
      }
      setPrice(cfgPrice)
    } catch (err) {
      console.error('PublishModal fetch error:', err)
      setError(err.message || String(err))
    } finally {
      setChecking(false)
    }
  }

  const handleConfirm = async () => {
    if (!product) return
    setLoading(true)
    setError(null)
    try {
      const token = localStorage.getItem('accessToken')

      // elegir endpoint según mode
      const endpoint =
        mode === 'renew'
          ? `${BASE_URL}/api/products/${encodeURIComponent(product.id)}/publish/renew`
          : `${BASE_URL}/api/products/${encodeURIComponent(product.id)}/publish`

      const res = await fetch(endpoint, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        // para publish mantenemos body { active: true } por compatibilidad; renew no necesita body
        body: mode === 'publish' ? JSON.stringify({ active: true }) : undefined
      })

      const text = await res.text().catch(() => null)
      if (!res.ok) {
        const msg = text && text.length ? text : `Error ${res.status}`
        throw new Error(msg)
      }

      // Dentro de handleConfirm, después de JSON.parse(text)
const updated = text ? JSON.parse(text) : null;

// Si el backend devolvió el nuevo ProductResponse, extraemos el balance
if (updated?.product) {
    // Buscamos el balance dentro del DTO del producto si existe allí
    setBalance(updated.product.providerBalance ?? updated.product.balance ?? balance);
}

if (typeof onPublished === 'function') {
    // IMPORTANTE: Enviamos updated.product para que la tabla/fila 
    // reciba el DTO que espera y no el objeto envoltorio.
    onPublished(updated?.product ?? updated ?? product);
}

      // actualizar balance si backend lo devuelve
      setBalance(updated?.providerBalance ?? updated?.userBalance ?? updated?.balance ?? balance)

      if (typeof onPublished === 'function') onPublished(updated ?? product)
      onClose()
    } catch (err) {
      console.error('Error en PublishModal:', err)
      setError(err.message || String(err))
    } finally {
      setLoading(false)
    }
  }

  if (!open) return null

  const formatMoney = (v) => {
    if (v == null) return '—'
    const n = typeof v === 'number' ? v : Number(v)
    if (Number.isNaN(n)) return String(v)
    return n.toLocaleString('en-US', { style: 'currency', currency: 'USD' })
  }

  const insufficient = price != null && balance != null && Number(balance) < Number(price)

  const title =
    mode === 'renew'
      ? (product?.isExpired ? 'Reactivar producto' : 'Renovar producto')
      : 'Publicar producto'

  const subtitle =
    mode === 'renew'
      ? (product?.isExpired ? 'Este producto está vencido. Confirma para reactivarlo por 30 días.' : 'Este producto está activo. Confirma para sumar 30 días al periodo actual.')
      : 'Resumen de publicación'

  const confirmLabel =
    mode === 'renew'
      ? (loading ? 'Procesando renovación...' : (product?.isExpired ? 'Confirmar reactivación' : 'Confirmar renovación'))
      : (loading ? 'Procesando publicación...' : 'Confirmar publicación')

  return (
    <div style={backdrop}>
      <div role="dialog" aria-modal="true" style={card}>
        <button onClick={onClose} aria-label="Cerrar" style={closeBtn}>✕</button>

        {checking ? (
          <div style={centerSection}>
            <p style={muted}>Cargando información…</p>
          </div>
        ) : error ? (
          <div style={centerSection}>
            <p style={errorText}>Error: {error}</p>
            <div style={{ marginTop: 12 }}>
              <button onClick={fetchInfo} style={outlineBtn}>Reintentar</button>
            </div>
          </div>
        ) : (
          <div style={content}>
            <div style={header}>
              <h2 style={titleStyle}>{product?.name ?? title}</h2>
              <p style={subtitleStyle}>{subtitle}</p>
            </div>

            <div style={bigValuesRow}>
              <div style={bigValueCard}>
                <div style={bigLabel}>Saldo disponible</div>
                <div style={bigValue}>{formatMoney(balance)}</div>
              </div>

              <div style={bigValueCard}>
                <div style={bigLabel}>Precio publicación</div>
                <div style={bigValue}>{formatMoney(price)}</div>
              </div>
            </div>

            {price != null && balance != null && Number(balance) < Number(price) && (
              <div style={insufficientBanner}>Saldo insuficiente para {mode === 'renew' ? 'renovar' : 'publicar'}</div>
            )}

            <div style={infoBox}>
              <div style={{ fontSize: 13, color: '#9FB4C8', textAlign: 'center' }}>
                {mode === 'renew'
                  ? 'Confirma la renovación solo si estás de acuerdo con el cargo de renovación.'
                  : 'Confirma la publicación solo si estás de acuerdo con el cargo de publicación.'}
              </div>
            </div>

            <div style={actions}>
              <button onClick={onClose} style={secondaryBtn} disabled={loading}>Cerrar</button>
              <button
                onClick={handleConfirm}
                style={confirmBtn(insufficient || loading)}
                disabled={loading || insufficient}
              >
                {confirmLabel}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

/* ===== estilos (ligeramente renombrados para evitar colisiones) ===== */

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
const titleStyle = { margin: 0, fontSize: 20, fontWeight: 800, letterSpacing: '-0.02em', color: '#fff' }
const subtitleStyle = { margin: 0, marginTop: 6, fontSize: 13, color: '#BBD2E6' }

/* Big values row */
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

const outlineBtn = {
  padding: '10px 14px',
  borderRadius: 10,
  border: '1px solid rgba(255,255,255,0.06)',
  background: 'transparent',
  color: '#E6EEF7',
  cursor: 'pointer'
}

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
  background: disabled ? 'linear-gradient(90deg, #94A3B8, #6B7280)' : 'linear-gradient(90deg, #06B6D4, #10B981)',
  color: disabled ? '#E6EEF7' : '#021018',
  fontWeight: 900,
  border: 'none',
  cursor: disabled ? 'not-allowed' : 'pointer',
  minWidth: 220
})

const centerSection = { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: 18 }
const muted = { color: '#9FB4C8' }
const errorText = { color: '#FCA5A5', textAlign: 'center' }