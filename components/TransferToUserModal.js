// components/TransferToUserModal.jsx
import { useEffect, useRef, useState } from 'react'
import { FaSearch, FaSpinner } from 'react-icons/fa'
import axios from 'axios'

export default function TransferToUserModal({
  open,
  onClose,
  sourceItem = null,
  getAuthToken,
  baseUrl = '',
  searchEndpoint = '/api/users/search',
  onSuccess = null
}) {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [selectedUser, setSelectedUser] = useState(null)
  const [transferAmount, setTransferAmount] = useState('')
  const [supplierDiscountFraction, setSupplierDiscountFraction] = useState(null)
  const [transferLoading, setTransferLoading] = useState(false)
  const searchDebounce = useRef(null)

  useEffect(() => {
    if (!open) resetAll()
  }, [open])

  useEffect(() => {
    if (searchDebounce.current) clearTimeout(searchDebounce.current)
    if (!searchQuery || searchQuery.trim().length < 2) {
      setSearchResults([])
      return
    }
    searchDebounce.current = setTimeout(() => {
      searchUsers(searchQuery.trim())
    }, 320)
    return () => {
      if (searchDebounce.current) clearTimeout(searchDebounce.current)
    }
  }, [searchQuery])

  useEffect(() => {
    if (open) fetchSupplierDiscount()
  }, [open])

  function resetAll() {
    setSearchQuery('')
    setSearchResults([])
    setSearchLoading(false)
    setSelectedUser(null)
    setTransferAmount('')
    setSupplierDiscountFraction(null)
    setTransferLoading(false)
  }

  const safeBase = (baseUrl || '').replace(/\/+$/, '')

  async function fetchSupplierDiscount() {
    try {
      const token = typeof getAuthToken === 'function' ? await getAuthToken() : null
      const headers = { 'Content-Type': 'application/json' }
      if (token) headers['Authorization'] = `Bearer ${token}`

      const settingsUrl = `${safeBase}/api/admin/settings`
      const res = await axios.get(settingsUrl, { headers, withCredentials: !token })
      const data = res.data
      let frac = 0
      if (Array.isArray(data)) {
        for (const s of data) {
          if (!s) continue
          if (s.key && s.key.toLowerCase() === 'supplierdiscount') {
            const raw = (s.valueNum != null) ? Number(s.valueNum) : Number(s.value || 0)
            if (Number.isNaN(raw)) { frac = 0; break }
            frac = raw > 1 ? raw / 100.0 : raw
            break
          }
        }
      }
      setSupplierDiscountFraction(typeof frac === 'number' ? frac : 0)
    } catch (err) {
      console.error('Failed to fetch supplier discount', err)
      setSupplierDiscountFraction(0)
    }
  }

  const parseToNumber = (v) => {
    if (v === null || v === undefined) return null
    if (typeof v === 'number') return v
    if (typeof v === 'string') {
      const t = v.trim()
      if (t === '') return null
      const n = parseFloat(t.replace(',', '.'))
      return Number.isNaN(n) ? null : n
    }
    return null
  }

  const roundToTwo = (n) => Math.round((n + Number.EPSILON) * 100) / 100

  const computeFeeAndNet = (grossStr) => {
    const gross = parseToNumber(grossStr)
    if (gross == null || isNaN(gross)) return { fee: 0, net: 0 }
    const frac = supplierDiscountFraction == null ? 0 : Number(supplierDiscountFraction)
    const fee = roundToTwo(gross * frac)
    const net = roundToTwo(Math.max(0, gross - fee))
    return { fee, net }
  }

const computeFeeAndTotal = (grossStr) => {
  const gross = parseToNumber(grossStr)
  if (gross == null || isNaN(gross)) return { fee: 0, total: 0 }
  const frac = supplierDiscountFraction == null ? 0 : Number(supplierDiscountFraction)
  const fee = roundToTwo(gross * frac)
  const total = roundToTwo(gross + fee) // proveedor paga más
  return { fee, total }
}

  async function searchUsersByPhone(q) {
    if (!q || q.trim().length < 2) {
      setSearchResults([])
      return
    }
    setSearchLoading(true)
    setSearchResults([])
    try {
      const token = typeof getAuthToken === 'function' ? await getAuthToken() : null
      const headers = { 'Content-Type': 'application/json' }
      if (token) headers['Authorization'] = `Bearer ${token}`

      const url = `${safeBase}${searchEndpoint}?q=${encodeURIComponent(q)}&limit=10`
      const res = await axios.get(url, { headers, withCredentials: !token })
      setSearchResults(Array.isArray(res.data) ? res.data : [])
    } catch (err) {
      console.error('searchUsersByPhone error', err)
      setSearchResults([])
    } finally {
      setSearchLoading(false)
    }
  }

  async function searchUsers(q) { // <-- CAMBIO DE NOMBRE: searchUsersByPhone -> searchUsers
    if (!q || q.trim().length < 2) {
      setSearchResults([])
      return
    }
    setSearchLoading(true)
    setSearchResults([])
    try {
      const token = typeof getAuthToken === 'function' ?
await getAuthToken() : null
      const headers = { 'Content-Type': 'application/json' }
      if (token) headers['Authorization'] = `Bearer ${token}`

      const url = `${safeBase}${searchEndpoint}?q=${encodeURIComponent(q)}&limit=10`
      const res = await axios.get(url, { headers, withCredentials: !token })
      setSearchResults(Array.isArray(res.data) ? res.data : [])
    } catch (err) {
      console.error('searchUsers error', err) // <-- CAMBIO: Se actualiza el mensaje de error
      setSearchResults([])
    } finally {
      setSearchLoading(false)
    }
  }

  const handleSelectUser = (u) => {
    setSelectedUser(u)
  }

  const handleSubmit = async () => {
    const gross = parseToNumber(transferAmount)
    if (!selectedUser || gross == null || gross <= 0) {
      alert('Selecciona un usuario y un monto válido')
      return
    }

    setTransferLoading(true)
    try {
      const token = typeof getAuthToken === 'function' ? await getAuthToken() : null
      const headers = { 'Content-Type': 'application/json' }
      if (token) headers['Authorization'] = `Bearer ${token}`

      // Construcción directa de la URL (igual que settings)
      const url = `${safeBase}/api/supplier/transfer-to-user`
      await axios.post(url, {
        sellerId: selectedUser.id,
        amount: gross
      }, { headers, withCredentials: !token })

      if (typeof onSuccess === 'function') onSuccess()
      onClose()
    } catch (err) {
      console.error('Transfer failed', err)
      alert('Error al realizar la transferencia. Revisa la consola.')
    } finally {
      setTransferLoading(false)
    }
  }

  if (!open) return null

const { fee, total } = computeFeeAndTotal(transferAmount)


  return (
    <>
      <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Transferir a usuario">
        <div className="modal" role="document">
          <header className="modal-header">
            <h2>Transferir saldo a usuario</h2>
            <button className="close" onClick={onClose} aria-label="Cerrar">✕</button>
          </header>

          <div className="modal-body">
            {sourceItem && (
              <div className="source">
                <strong>Origen:</strong> {sourceItem.user ?? 'Proveedor'} — {sourceItem.currency || 'PEN'} {(() => {
                  const raw = sourceItem.type && sourceItem.type.toLowerCase() === 'withdrawal'
                    ? (sourceItem.realAmount ?? sourceItem.amount)
                    : sourceItem.amount
                  const n = parseToNumber(raw)
                  return (n == null ? '0.00' : Number(n).toFixed(2))
                })()}
              </div>
            )}

            <label className="label">
              Buscar usuario por celular o nombre de usuario
              <div className="search-row">
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Ej. 923, +51923, 923117777"
                  className="input"
                  aria-label="Buscar usuario por celular o nombre de usuario"
                />
                <button
                  className="btn-icon"
                  onClick={() => searchUsers(searchQuery)}
                  disabled={searchLoading}
                  aria-label="Buscar"
                >
                  {searchLoading ? <FaSpinner className="spin" /> : <FaSearch />}
                </button>
              </div>
            </label>

            <div className="search-results">
              {searchLoading ? <div className="small-loading">Buscando...</div> : null}
              {!searchLoading && searchResults.length === 0 && searchQuery.trim().length >= 2 && (
                <div className="no-results">No se encontraron usuarios</div>
              )}
              {!searchLoading && searchResults.map(u => (
                <div
                  key={u.id}
                  className={`result ${selectedUser?.id === u.id ? 'selected' : ''}`}
                  onClick={() => handleSelectUser(u)}
                  role="button"
                  tabIndex={0}
                >
                  <div className="r-left">
                    <div className="r-name">{u.username}</div>
                    <div className="r-phone">{u.phone}</div>
                  </div>
                  <div className="r-right">
                    {selectedUser?.id === u.id ? 'Seleccionado' : 'Seleccionar'}
                  </div>
                </div>
              ))}
            </div>

            <label className="label">
              Monto a transferir (unidades)
              <input
                value={transferAmount}
                onChange={(e) => setTransferAmount(e.target.value)}
                placeholder="Ej. 1000.00"
                className="input"
                inputMode="decimal"
              />
            </label>

            <div className="preview">
              <div>Porcentaje de cargo: <strong>{(Number(supplierDiscountFraction || 0) * 100).toFixed(2)}%</strong></div>

              {transferAmount && parseToNumber(transferAmount) != null ? (
                <div className="calc">
  <div>Monto al vendedor: <strong>{Number(transferAmount).toFixed(2)}</strong></div>
  <div>Cargo al proveedor: <strong>{fee.toFixed(2)}</strong></div>
  <div>Total descontado al proveedor: <strong>{total.toFixed(2)}</strong></div>
</div>

              ) : (
                <div className="hint">Introduce un monto válido para ver el cálculo</div>
              )}
            </div>
          </div>

          <footer className="modal-footer">
            <button className="btn-outline" onClick={onClose} disabled={transferLoading}>Cancelar</button>
            <button
              className="btn-primary"
              onClick={handleSubmit}
              disabled={
                transferLoading ||
                !selectedUser ||
                parseToNumber(transferAmount) == null ||
                parseToNumber(transferAmount) <= 0
              }
            >
              {transferLoading ? <FaSpinner className="spin small" /> : 'Transferir'}
            </button>
          </footer>
        </div>
      </div>

      <style jsx>{`
        .modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.6); display:flex; align-items:center; justify-content:center; z-index:60; padding:20px; }
        .modal { width:100%; max-width:820px; background:#0b0b0c; border-radius:12px; border:1px solid rgba(255,255,255,0.04); box-shadow:0 20px 60px rgba(0,0,0,0.7); overflow:hidden; display:flex; flex-direction:column; }
        .modal-header { display:flex; align-items:center; justify-content:space-between; padding:16px 18px; border-bottom:1px solid rgba(255,255,255,0.03); }
        .modal-header h2 { margin:0; font-size:1.1rem; }
        .modal-header .close { background:transparent; border:0; color:#cfcfcf; font-size:1.1rem; cursor:pointer; }
        .modal-body { padding:16px 18px; display:flex; flex-direction:column; gap:12px; }
        .modal-footer { padding:12px 18px; display:flex; gap:12px; justify-content:flex-end; border-top:1px solid rgba(255,255,255,0.03); }
        .source { padding:8px 10px; border-radius:8px; background: rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.04); color:#d1d1d1; }
        .label { display:block; font-size:0.9rem; color:#d1d1d1; }
        .input { width:100%; padding:10px 12px; border-radius:8px; background:#0d0d0d; border:1px solid rgba(255,255,255,0.04); color:#fff; margin-top:6px; }
        .search-row { display:flex; gap:8px; align-items:center; margin-top:6px; }
        .btn-icon { width:40px; height:40px; display:inline-grid; place-items:center; border-radius:8px; background: rgba(255,255,255,0.03); border:0; color:#d1d1d1; cursor:pointer; }
        .search-results { max-height:200px; overflow:auto; margin-top:8px; display:flex; flex-direction:column; gap:6px; }
        .result { display:flex; justify-content:space-between; align-items:center; gap:12px; padding:8px; border-radius:8px; background: rgba(255,255,255,0.01); cursor:pointer; border:1px solid rgba(255,255,255,0.02); }
        .result.selected { outline:2px solid rgba(99,102,241,0.18); background: linear-gradient(90deg, rgba(99,102,241,0.04), rgba(99,102,241,0.02)); }
        .r-left { display:flex; flex-direction:column; }
        .r-name { font-weight:700; }
        .r-phone { color:#9aa0a6; font-size:0.9rem; margin-top:2px; }
        .small-loading { color:#9aa0a6; font-size:0.9rem; }
        .no-results { color:#9aa0a6; font-size:0.9rem; }
        .preview { padding:10px; border-radius:8px; background: rgba(255,255,255,0.01); border:1px solid rgba(255,255,255,0.02); color:#d1d1d1; }
        .calc { display:flex; gap:12px; flex-wrap:wrap; margin-top:6px; }
        .hint { color:#9aa0a6; }
        .btn-outline { padding:10px 14px; border-radius:8px; background:transparent; border:1px solid rgba(255,255,255,0.06); color:#d1d1d1; cursor:pointer; }
        .btn-primary { padding:10px 14px; border-radius:8px; background: linear-gradient(135deg,#06b6d4 0%, #34d399 100%); color:#07101a; cursor:pointer; border:0; font-weight:700; }
        .spin { animation: spin 1s linear infinite; }
        .spin.small { width:16px; height:16px; }
        @keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }
        @media (max-width:640px) { .modal { max-width:100% } }
      `}</style>
    </>
  )
}