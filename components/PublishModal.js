'use client'

import React, { useEffect, useState } from 'react'

export default function PublishModal({ open, onClose, product, onPublished }) {
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(false)
  const [balance, setBalance] = useState(null)
  const [price, setPrice] = useState(null)
  const [error, setError] = useState(null)
  const [publishStart, setPublishStart] = useState(null)
  const [publishEnd, setPublishEnd] = useState(null)
  const [daysRemaining, setDaysRemaining] = useState(null)
  const BASE_URL = process.env.NEXT_PUBLIC_API_URL

  useEffect(() => {
    if (!open) return
    setError(null)
    setBalance(null)
    setPrice(null)
    setPublishStart(null)
    setPublishEnd(null)
    setDaysRemaining(null)
    fetchInfo()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, product])

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

      // Si el producto ya tiene fechas (por ejemplo producto cargado previamente), mostrar localmente
      if (product) {
        setPublishStart(normalizeDate(product.publish_start ?? product.publishStart))
        setPublishEnd(normalizeDate(product.publish_end ?? product.publishEnd))
        setDaysRemaining(product.daysRemaining ?? product.days_remaining ?? null)
      }
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
      const res = await fetch(`${BASE_URL}/api/products/${product.id}/publish`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ active: true })
      })

      if (!res.ok) {
        const txt = await res.text().catch(() => '')
        throw new Error(`Error ${res.status} ${txt}`)
      }

      const updated = await res.json()

      // Actualizar UI: leer explícitamente publish_start, publish_end y daysRemaining/days_remaining
      const serverStart = normalizeDate(updated.publish_start ?? updated.publishStart)
      const serverEnd = normalizeDate(updated.publish_end ?? updated.publishEnd)
      const serverDays = updated.daysRemaining ?? updated.days_remaining ?? null

      setPublishStart(serverStart)
      setPublishEnd(serverEnd)
      setDaysRemaining(serverDays)

      // Actualizar balance local si backend devuelve el nuevo saldo (opcional)
      setBalance(updated.providerBalance ?? updated.userBalance ?? updated.balance ?? balance)

      if (onPublished) onPublished(updated)
      onClose()
    } catch (err) {
      console.error('Error al publicar producto:', err)
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

  // muestra solo fecha (sin hora). acepta Date, timestamp string, or null
  function normalizeDate(value) {
    if (!value) return null
    try {
      const d = (value instanceof Date) ? value : new Date(value)
      if (Number.isNaN(d.getTime())) return null
      // devolver ISO local date yyyy-mm-dd para mostrar sin hora
      const year = d.getFullYear()
      const month = String(d.getMonth() + 1).padStart(2, '0')
      const day = String(d.getDate()).padStart(2, '0')
      return `${year}-${month}-${day}`
    } catch {
      return null
    }
  }

  const insufficient = price != null && balance != null && Number(balance) < Number(price)

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
              <h2 style={title}>{product?.name ?? 'Publicar producto'}</h2>
              <p style={subtitle}>Fechas de publicación</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, width: '100%', marginTop: 6 }}>
              <div style={infoBox}>
                <div style={infoLabel}>Fecha inicio</div>
                <div style={dateBox}>{publishStart ?? '—'}</div>
              </div>

              <div style={infoBox}>
                <div style={infoLabel}>Fecha fin</div>
                <div style={dateBox}>{publishEnd ?? '—'}</div>
              </div>

              <div style={infoBox}>
                <div style={infoLabel}>Días restantes</div>
                <div style={dateBox}>{daysRemaining == null ? '—' : String(daysRemaining)}</div>
              </div>
            </div>

            <div style={actions}>
              <button onClick={onClose} style={secondaryBtn} disabled={loading}>Cerrar</button>
              <button
                onClick={handleConfirm}
                style={confirmBtn(insufficient || loading)}
                disabled={loading || insufficient}
              >
                {loading ? 'Procesando...' : 'Confirmar publicación'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

/* ===== estilos (mantengo los anteriores con pequeño ajuste en dateBox) ===== */

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
  maxWidth: 640,
  background: 'linear-gradient(180deg, #071026 0%, #081426 100%)',
  color: '#EDF2F7',
  borderRadius: 14,
  padding: '22px',
  position: 'relative',
  boxShadow: '0 12px 40px rgba(2,6,23,0.7)',
  fontFamily: '"Rubik", system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial'
}

const closeBtn = {
  position: 'absolute',
  right: 14,
  top: 14,
  background: 'transparent',
  border: 'none',
  color: '#9CA3AF',
  fontSize: 18,
  cursor: 'pointer'
}

const content = { display: 'flex', flexDirection: 'column', gap: 18, alignItems: 'center', textAlign: 'center' }

const header = { marginBottom: 4 }
const title = { margin: 0, fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em', color: '#fff' }
const subtitle = { margin: 0, marginTop: 6, fontSize: 13, color: '#BBD2E6' }

const infoBox = {
  background: 'linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01))',
  borderRadius: 10,
  padding: 14,
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
  alignItems: 'center'
}

const infoLabel = { fontSize: 12, color: '#9FB4C8' }

const dateBox = {
  fontSize: 16,
  fontWeight: 700,
  color: '#E6EEF7'
}

const actions = { display: 'flex', gap: 10, justifyContent: 'center', marginTop: 12, width: '100%' }

const outlineBtn = {
  padding: '8px 12px',
  borderRadius: 8,
  border: '1px solid rgba(255,255,255,0.06)',
  background: 'transparent',
  color: '#E6EEF7',
  cursor: 'pointer'
}

const secondaryBtn = {
  padding: '10px 14px',
  borderRadius: 10,
  background: '#E6EEF7',
  color: '#081426',
  fontWeight: 700,
  border: 'none',
  cursor: 'pointer'
}

const confirmBtn = (disabled) => ({
  padding: '10px 14px',
  borderRadius: 10,
  background: disabled ? 'linear-gradient(90deg, #94A3B8, #6B7280)' : 'linear-gradient(90deg, #06B6D4, #10B981)',
  color: disabled ? '#E6EEF7' : '#021018',
  fontWeight: 800,
  border: 'none',
  cursor: disabled ? 'not-allowed' : 'pointer',
  minWidth: 180
})

const centerSection = { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: 18 }
const muted = { color: '#9FB4C8' }
const errorText = { color: '#FCA5A5', textAlign: 'center' }