'use client'

import { useState, useEffect } from 'react'
import Modal from './Modal'

export default function AddBalanceModalSupplier({ open, onClose, onAdd }) {
  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState('PEN')
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  // exchange info (rate: PEN per 1 USD)
  const [rate, setRate] = useState(null)
  const [loadingRate, setLoadingRate] = useState(false)
  const [rateError, setRateError] = useState(null)

  // UI state
  const [selectedKey, setSelectedKey] = useState(null)
  const [copySuccess, setCopySuccess] = useState('')

  const BASE_URL = process.env.NEXT_PUBLIC_API_URL || ''

  useEffect(() => {
    if (!open) {
      setAmount('')
      setCurrency('PEN')
      setError(null)
      setSubmitting(false)
      setRate(null)
      setRateError(null)
      setLoadingRate(false)
      setSelectedKey(null)
      setCopySuccess('')
      return
    }
    if (open && currency === 'USD') {
      fetchRate().catch(() => {})
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  useEffect(() => {
    if (open && currency === 'USD' && rate == null && !loadingRate) {
      fetchRate().catch(() => {})
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currency, open])

  async function fetchRate() {
    setRateError(null)
    setLoadingRate(true)
    try {
      const res = await fetch(`${BASE_URL}/api/categories/exchange/current`)
      if (!res.ok) throw new Error(`Error ${res.status}`)
      const json = await res.json()
      const r = json?.rate ?? json?.value ?? null
      if (r == null) throw new Error('Tipo de cambio no disponible')
      const num = typeof r === 'number' ? r : parseFloat(String(r))
      if (Number.isNaN(num) || num <= 0) throw new Error('Tipo de cambio inválido')
      setRate(num)
      setLoadingRate(false)
      return num
    } catch (err) {
      setRate(null)
      setRateError(err?.message || String(err))
      setLoadingRate(false)
      throw err
    }
  }

  const getMinForCurrencyNumber = () => {
    const minPen = 10
    if (currency === 'PEN') return Number(minPen.toFixed(2))
    if (!rate || rate <= 0) return null
    const usdMinRaw = minPen / rate
    return Number(usdMinRaw.toFixed(2))
  }

  const submit = async () => {
    setError(null)
    const parsed = parseFloat(amount)
    if (!amount || isNaN(parsed) || parsed <= 0) {
      setError('Ingresa un monto válido mayor a 0'); return
    }
    if (currency === 'PEN') {
      const min = 10
      if (Number(parsed.toFixed(2)) < min) {
        setError(`El monto mínimo para Soles es ${min.toFixed(2)} PEN`); return
      }
    } else if (currency === 'USD') {
      if (rate == null) { setError('No se pudo obtener el tipo de cambio. Intenta nuevamente.'); return }
      const minUsd = getMinForCurrencyNumber()
      if (minUsd == null) { setError('Tipo de cambio inválido. No se puede validar mínimo en USD.'); return }
      if (Number(parsed.toFixed(2)) < minUsd) {
        setError(`El monto mínimo es ${minUsd.toFixed(2)} USD`); return
      }
    }

    setSubmitting(true)
    try {
      await onAdd({ amount: Number(parseFloat(amount).toFixed(2)), currency })
      setSubmitting(false)
      onClose()
    } catch (err) {
      setSubmitting(false)
      setError(err?.message || 'Error al procesar el depósito')
    }
  }

  const minDisplay = (() => {
    if (currency === 'PEN') return '10.00 PEN'
    if (currency === 'USD') {
      if (loadingRate) return 'Cargando tipo de cambio…'
      if (rateError || rate == null) return 'Tipo de cambio no disponible'
      const minUsd = getMinForCurrencyNumber()
      return `${minUsd.toFixed(2)} USD`
    }
    return ''
  })()

  // Archivos esperados en /public/images/
  // Yape: yape.png, yape-qr.png, yape-qr-alt.png
  // Plin: plin.png, plin-qr.png
  // Binance: binance.svg, binance-qr.png
  // PayPal: paypal.svg, paypal-qr.png
  // Lemon: lemon.svg, lemon-qr.png
  const methods = [
    { key: 'Yape', label: 'Yape', info: '+51 902 229 594', copy: '+51902229594', qr: ['/images/YAPE1-QR.png', '/images/YAPE2-QR.png'], logo: '/images/yape.png' },
    { key: 'Plin', label: 'Plin', info: '+51 935 769 255', copy: '+51935769255', qr: ['/images/PLIN-QR.png'], logo: '/images/plin.png' },
    { key: 'Binance', label: 'Binance', info: 'Cuenta: 1025532462', copy: '1025532462', qr: ['/images/BINANCE-QR.png'], logo: '/images/binance.svg' },
    { key: 'PayPal', label: 'PayPal', info: 'randu.sq@gmail.com', copy: 'randu.sq@gmail.com', qr: ['/images/PAYPAL-QR.png'], logo: '/images/paypal.svg' },
    { key: 'Lemon', label: 'Lemon', info: 'Cuenta Lemon', copy: 'CuentaLemon', qr: ['/images/LEMON-QR.png'], logo: '/images/lemon.svg' }
  ]

  const handleCopy = async (text) => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text)
      } else {
        const ta = document.createElement('textarea')
        ta.value = text
        document.body.appendChild(ta)
        ta.select()
        document.execCommand('copy')
        document.body.removeChild(ta)
      }
      setCopySuccess('Copiado')
      setTimeout(() => setCopySuccess(''), 2000)
    } catch {
      setCopySuccess('Error')
      setTimeout(() => setCopySuccess(''), 2000)
    }
  }

  const selectedMethod = methods.find(m => m.key === selectedKey) || null

  return (
    <Modal open={open} onClose={() => { if (!submitting) onClose() }} ariaLabel="Agregar saldo">
      <div className="modal-header">
        <h2>Agregar saldo</h2>
        <button className="close" onClick={() => { if (!submitting) onClose() }} aria-label="Cerrar">✕</button>
      </div>

      {/* Cuerpo scrollable */}
      <div className="modal-body">
        <div className="field">
          <label>Monto</label>
          <input
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            disabled={submitting}
          />
        </div>

        <div className="field">
          <label>Moneda</label>
          <select value={currency} onChange={(e) => setCurrency(e.target.value)} disabled={submitting}>
            <option value="PEN">Soles (PEN)</option>
            <option value="USD">Dólares (USD)</option>
          </select>
          <div className="min-info">Mínimo: <strong>{minDisplay}</strong></div>
        </div>

        <div className="instructions">
          <h3>Métodos de pago</h3>
          <div className="method-list" role="tablist" aria-label="Métodos de pago">
            {methods.map(m => (
              <button
                key={m.key}
                role="tab"
                aria-pressed={selectedKey === m.key}
                className={`method-btn ${selectedKey === m.key ? 'active' : ''}`}
                onClick={() => { setSelectedKey(m.key); setCopySuccess('') }}
                disabled={submitting}
              >
                <img src={m.logo} alt={`${m.label} logo`} className="method-logo" loading="lazy" />
                <span className="method-label">{m.label}</span>
              </button>
            ))}
          </div>

          <div className="qr-area">
            {!selectedMethod && (
              <div className="qr-placeholder">
                <p>Selecciona un método para ver el detalle</p>
              </div>
            )}

            {selectedMethod && (
              <div className="method-detail" role="region" aria-label={`${selectedMethod.label} detalle`}>
                <div className="method-header">
                  <img
                    src={selectedMethod.logo}
                    alt={`${selectedMethod.label} logo`}
                    className={`method-logo ${selectedMethod.key === 'PayPal' ? 'paypal-logo-large' : ''}`}
                    loading="lazy"
                  />
                  <div className="method-head-info">
                    <strong>{selectedMethod.label}</strong>
                    <p>{selectedMethod.info}</p>
                  </div>
                </div>

                {/* QR centrados; Yape puede mostrar 2 */}
                <div className="qr-list">
                  {selectedMethod.qr.map((qrSrc, idx) => (
                    <img key={idx} src={qrSrc} alt={`QR ${selectedMethod.label} ${idx + 1}`} className="qr" loading="lazy" />
                  ))}
                </div>

                <div className="detail-actions">
                  <button
                    className="copy-btn"
                    onClick={() => handleCopy(selectedMethod.copy)}
                    aria-label={`Copiar dato ${selectedMethod.label}`}
                  >
                    {copySuccess ? copySuccess : 'Copiar dato'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Acciones fuera del área scrollable */}
      {error && <div className="error">{error}</div>}
      {rateError && currency === 'USD' && <div className="error">Error tipo de cambio: {rateError}</div>}

      <div className="actions">
        <button className="btn ghost" onClick={() => { if (!submitting) onClose() }} disabled={submitting}>Cancelar</button>
        <button className="btn primary" onClick={submit} disabled={submitting}>{submitting ? 'Enviando...' : 'Recargar'}</button>
      </div>

      <style jsx>{`
        .modal-header { display:flex; align-items:center; justify-content:space-between; gap:12px; margin-bottom:10px; }
        h2 { margin:0; font-size:1.1rem; color:#f3f3f3; }
        .close { background:transparent; border:none; color:#cfcfcf; font-size:1.05rem; cursor:pointer; }

        /* Cuerpo scrollable + scrollbar moderno */
        .modal-body {
          max-height: calc(100vh - 220px);
          overflow: auto;
          -webkit-overflow-scrolling: touch;
          padding-right: 8px;
          scrollbar-gutter: stable both-edges;
        }
        .modal-body::-webkit-scrollbar { width: 8px; height: 8px; }
        .modal-body::-webkit-scrollbar-track { background: transparent; margin: 6px 0; border-radius: 8px; }
        .modal-body::-webkit-scrollbar-thumb {
          background: linear-gradient(180deg, rgba(255,255,255,0.14), rgba(255,255,255,0.08));
          border-radius: 8px;
          border: 2px solid rgba(0,0,0,0.12);
          min-height: 24px;
          transition: background .18s ease, transform .12s ease, opacity .18s ease;
          opacity: 0;
          transform: translateX(2px);
        }
        .modal-body::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(180deg, rgba(255,255,255,0.22), rgba(255,255,255,0.12));
          transform: translateX(0);
        }
        .modal-body:hover::-webkit-scrollbar-thumb,
        .modal-body:active::-webkit-scrollbar-thumb,
        .modal-body:focus-within::-webkit-scrollbar-thumb { opacity: 1; }
        .modal-body { scrollbar-width: thin; scrollbar-color: rgba(255,255,255,0.16) transparent; }
        @media (pointer: coarse) {
          .modal-body::-webkit-scrollbar { display: none; }
          .modal-body { scrollbar-width: none; }
        }

        .field { display:flex; flex-direction:column; gap:6px; margin:10px 0; }
        label { color:#bfbfbf; font-size:0.9rem; }
        input, select {
          padding:10px 12px; border-radius:10px; border:1px solid rgba(255,255,255,0.06);
          background: rgba(30,30,30,0.7); color:#eee; outline:none;
        }
        input::placeholder { color:#8e8e8e; }
        .min-info { color:#9fb4c8; font-size:0.85rem; margin-top:6px; }

        .instructions { margin-top: 16px; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.04); border-radius: 12px; padding: 16px; color: #e6e6e6; font-size: 0.95rem; }
        .instructions h3 { margin: 0 0 8px; font-size: 1rem; color: #f3f3f3; }

        /* Grilla responsive de métodos */
        .method-list {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
          gap: 12px;
          margin-top: 8px;
        }
        .method-btn {
          background: linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01));
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 12px;
          padding: 16px 12px;
          cursor: pointer;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 8px;
          color: #f3f3f3;
          font-weight: 800;
          transition: transform .12s ease, box-shadow .12s ease, border-color .12s ease;
          min-height: 120px;
        }
        .method-btn:hover { transform: translateY(-4px); box-shadow: 0 8px 20px rgba(2,6,23,0.6); }
        .method-btn.active {
          border-color: rgba(139,92,246,0.95);
          box-shadow: 0 12px 30px rgba(139,92,246,0.12);
          transform: translateY(-6px);
        }
        .method-logo {
          width: 48px; height: 48px;
          object-fit: contain;
          border-radius: 8px;
          background: rgba(255,255,255,0.04);
          padding: 6px;
        }
        .method-label { font-size: 0.95rem; }

        .qr-area { margin-top: 14px; display:flex; flex-direction:column; align-items:center; gap:12px; }
        .qr-placeholder {
          width:100%; padding:18px; border-radius:10px;
          background: rgba(255,255,255,0.01); color:#cfcfcf; text-align:center;
          border:1px dashed rgba(255,255,255,0.03);
        }

        .method-detail {
          width:100%; max-width:620px;
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 12px; padding: 14px;
          display:flex; flex-direction:column; gap:12px;
        }
        .method-header { display:flex; align-items:center; gap:12px; }
        .paypal-logo-large {
          width: 72px; height: 72px; padding:8px;
          background: rgba(255,255,255,0.04); border-radius:10px;
        }
        .method-head-info { display:flex; flex-direction:column; gap:4px; }
        .method-head-info strong { color:#f3f3f3; font-size:1.02rem; }
        .method-head-info p { color:#cfcfcf; margin:0; }

        /* QR centrados y responsivos */
        .qr-list {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 16px;
          width: 100%;
        }
        .qr {
          display: block;
          margin: 0 auto;
          width: 220px;
          height: 220px;
          max-width: 100%;
          object-fit: contain;
          border-radius: 12px;
          background: rgba(255,255,255,0.04);
          box-shadow: 0 8px 24px rgba(2,6,23,0.6);
          transition: transform .12s ease;
        }
        .qr:hover { transform: scale(1.02); }

        .detail-actions { display:flex; gap:10px; margin-top:6px; justify-content:center; }
        .copy-btn {
          padding:8px 12px; border-radius:10px;
          border:1px solid rgba(255,255,255,0.10);
          background:transparent; color:#e6e6e6;
          font-weight:800; cursor:pointer;
        }

        .error { color:#ffb4b4; margin-top:8px; font-size:0.9rem; text-align:center; }

        .actions {
          display:flex; justify-content:flex-end; gap:10px;
          margin-top:14px; padding-top:8px;
          border-top: 1px solid rgba(255,255,255,0.02);
          background: linear-gradient(180deg, rgba(0,0,0,0), rgba(0,0,0,0.02));
        }
        .btn { padding:10px 14px; border-radius:10px; font-weight:700; cursor:pointer; border:none; }
        .btn.ghost { background:transparent; color:#e6e6e6; border:1px solid rgba(255,255,255,0.06); }
        .btn.primary { background:linear-gradient(135deg,#8b5cf6 0%,#22d3ee 100%); color:#0d0d0d; }
      `}</style>
    </Modal>
  )
}