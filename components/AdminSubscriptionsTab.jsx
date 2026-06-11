import { useState, useEffect } from 'react'
import { FaSearch, FaPlus, FaCalendarAlt, FaDollarSign, FaUser, FaSpinner, FaTrash } from 'react-icons/fa'

export default function AdminSubscriptionsTab({ API_BASE, callEndpoint, loading, setLoading }) {
  const SUBSCRIPTIONS_ENDPOINT = `${API_BASE}/api/v1/admin/provider-subscriptions`
  const USERS_SEARCH_ENDPOINT = `${API_BASE}/api/users/providers`
  const PAYMENT_METHODS_ENDPOINT = `${API_BASE}/api/admin/payment-methods/active`

  const [subscriptions, setSubscriptions] = useState([])
  const [paymentMethods, setPaymentMethods] = useState([]) 
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [error, setError] = useState(null)

  // Paginación de membresías
  const [subPage, setSubPage] = useState(1)
  const [subTotalPages, setSubTotalPages] = useState(1)
  const [subTotalElements, setSubTotalElements] = useState(0)

  // Estado del Modal de Regularización
  const [regModal, setRegModal] = useState({
    open: false, userId: '', selectedUserName: '', totalAmount: '', startDate: '', endDate: '', status: 'active',
    historicalPayments: []
  })

  // Buscador predictivo de usuarios
  const [userSearchQuery, setUserSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searchingUsers, setSearchingUsers] = useState(false)

  // Estado para el Modal de Confirmación de Borrado
  const [deleteModal, setDeleteModal] = useState({ open: false, id: null, providerName: '' })

  // Estado para el Modal de Abono Rápido
  const [quickPayModal, setQuickPayModal] = useState({
    open: false, subscriptionId: null, providerName: '', amount: '', paymentMethodId: ''
  })

  // Cargar métodos de pago y membresías al montar el componente
  useEffect(() => {
    fetchPaymentMethods()
  }, [])

  // Debounce para la tabla principal
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchSubscriptions(1)
    }, 500)
    return () => clearTimeout(delayDebounceFn)
  }, [query, statusFilter])

  // Debounce para el buscador del Modal
  useEffect(() => {
    if (!userSearchQuery.trim()) {
      setSearchResults([])
      return
    }
    const delayDebounceFn = setTimeout(() => {
      searchUsersFromApi(userSearchQuery)
    }, 400)
    return () => clearTimeout(delayDebounceFn)
  }, [userSearchQuery])

  // Obtener métodos de pago activos desde Spring Boot
  const fetchPaymentMethods = async () => {
    try {
      const data = await callEndpoint(PAYMENT_METHODS_ENDPOINT, { method: 'GET' })
      if (Array.isArray(data)) {
        setPaymentMethods(data)
      }
    } catch (e) {
      console.error('Error cargando métodos de pago:', e)
    }
  }

  const fetchSubscriptions = async (uiPage = 1) => {
    setLoading(true); setError(null);
    try {
      const zeroPage = Math.max(0, (uiPage ?? 1) - 1)
      let url = `${SUBSCRIPTIONS_ENDPOINT}?page=${zeroPage}&size=10`
      if (statusFilter) url += `&status=${statusFilter}`
      if (query.trim()) url += `&userId=${encodeURIComponent(query.trim())}`
      
      const payload = await callEndpoint(url, { method: 'GET' })
      const content = Array.isArray(payload?.content) ? payload.content : []

      setSubscriptions(content)
      setSubTotalElements(Number(payload?.totalElements ?? content.length))
      setSubTotalPages(Number(payload?.totalPages ?? 1))
      setSubPage(uiPage)
    } catch (err) {
      setError('No se pudo cargar el control de membresías')
    } finally { setLoading(false) }
  }

  const searchUsersFromApi = async (searchVal) => {
    setSearchingUsers(true)
    try {
      const url = `${USERS_SEARCH_ENDPOINT}?page=0&size=8&search=${encodeURIComponent(searchVal)}`
      const data = await callEndpoint(url, { method: 'GET' })
      setSearchResults(Array.isArray(data?.content) ? data.content : [])
    } catch (e) {
      console.error('Error buscando usuarios:', e)
    } finally { setSearchingUsers(false) }
  }

  // Lógica del Modal de Confirmación de Borrado
  const triggerDeleteModal = (subscriptionId, providerName) => {
    setDeleteModal({ open: true, id: subscriptionId, providerName })
  }

  const handleConfirmDelete = async () => {
    if (!deleteModal.id) return
    try {
      setLoading(true)
      await callEndpoint(`${SUBSCRIPTIONS_ENDPOINT}/${deleteModal.id}`, {
        method: 'DELETE'
      })
      setDeleteModal({ open: false, id: null, providerName: '' })
      fetchSubscriptions(subPage)
    } catch (err) {
      alert(err.message || 'Error al eliminar la membresía')
    } finally {
      setLoading(false)
    }
  }

  // Lógica del Modal de Abono Rápido (CORREGIDO - Solo una definición)
  const handleQuickPayment = (subscriptionId, providerName) => {
    if (paymentMethods.length === 0) {
      return alert('No hay métodos de pago activos cargados desde el servidor.')
    }
    setQuickPayModal({
      open: true,
      subscriptionId,
      providerName,
      amount: '',
      paymentMethodId: paymentMethods[0]?.id || ''
    })
  }

  const handleConfirmQuickPayment = async (e) => {
    e.preventDefault()
    const { subscriptionId, amount, paymentMethodId } = quickPayModal

    if (!amount || isNaN(amount) || parseFloat(amount) <= 0) {
      return alert('Por favor, ingresa un monto válido mayor a 0.')
    }
    if (!paymentMethodId) {
      return alert('Por favor, selecciona un método de pago.')
    }

    try {
      setLoading(true)
      await callEndpoint(`${SUBSCRIPTIONS_ENDPOINT}/${subscriptionId}/payments`, {
        method: 'POST',
        body: JSON.stringify({ 
          paymentMethodId: paymentMethodId, 
          amountPaid: parseFloat(amount), 
          notes: "Abono rápido desde panel de control" 
        })
      })
      setQuickPayModal({ open: false, subscriptionId: null, providerName: '', amount: '', paymentMethodId: '' })
      fetchSubscriptions(subPage)
    } catch (err) {
      alert(err.message || 'Error al registrar abono')
    } finally {
      setLoading(false)
    }
  }

  // Lógica del Modal de Regularización Histórica
  const handleSelectUser = (user) => {
    setRegModal(prev => ({
      ...prev,
      userId: user.id,
      selectedUserName: `${user.name || user.username} (${user.username})`
    }))
    setUserSearchQuery('')
    setSearchResults([])
  }

  const handleSaveRegularization = async (e) => {
    e.preventDefault()
    if (!regModal.userId) return alert('Por favor, selecciona un usuario válido.')

    const hasInvalidPayment = regModal.historicalPayments.some(p => !p.paymentMethodId)
    if (hasInvalidPayment) return alert('Por favor, selecciona un método de pago para todas las cuotas históricas.')

    setLoading(true)
    try {
      const payload = {
        userId: regModal.userId,
        totalAmount: parseFloat(regModal.totalAmount),
        status: regModal.status,
        startDate: regModal.startDate,
        endDate: regModal.endDate,
        historicalPayments: regModal.historicalPayments.map(p => ({
          ...p,
          amountPaid: parseFloat(p.amountPaid)
        }))
      }

      await callEndpoint(SUBSCRIPTIONS_ENDPOINT, {
        method: 'POST',
        body: JSON.stringify(payload)
      })

      closeModal()
      fetchSubscriptions(1)
    } catch (err) {
      alert(err.message || 'Error al guardar membresía')
    } finally { setLoading(false) }
  }

  const closeModal = () => {
    setRegModal({ open: false, userId: '', selectedUserName: '', totalAmount: '', startDate: '', endDate: '', status: 'active', historicalPayments: [] })
    setUserSearchQuery('')
    setSearchResults([])
  }

  const addHistoricalPaymentRow = () => {
    const defaultMethodId = paymentMethods.length > 0 ? paymentMethods[0].id : ''
    setRegModal(prev => ({
      ...prev,
      historicalPayments: [
        ...prev.historicalPayments,
        { paymentMethodId: defaultMethodId, amountPaid: '', paymentDate: new Date().toISOString().slice(0, 16), referenceNumber: '', notes: '' }
      ]
    }))
  }

  return (
    <>
      <div className="tab-actions-header">
        <button className="btn-add-subscription" onClick={() => setRegModal(prev => ({ ...prev, open: true }))}>
          <FaPlus style={{ marginRight: '8px' }} /> Regularizar Histórico
        </button>
      </div>

      <section className="controls-row">
        <div className="search-container flex-gap">
          <div className="search-box">
            <FaSearch className="icon" />
            <input placeholder="Filtrar membresías por ID..." value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          <select className="modern-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">Todos los estados</option>
            <option value="active">Activos</option>
            <option value="pending">Pendientes</option>
            <option value="completed">Completados</option>
            <option value="overdue">Vencidos</option>
          </select>
        </div>

        <div className="modern-pager">
          <div className="pager-info">Total: <span className="total-badge">{subTotalElements}</span></div>
          <div className="pager-actions">
            <button onClick={() => subPage > 1 && fetchSubscriptions(subPage - 1)} disabled={subPage === 1 || loading} className="pager-btn">Anterior</button>
            <div className="page-indicator">{subPage} / {subTotalPages}</div>
            <button onClick={() => subPage < subTotalPages && fetchSubscriptions(subPage + 1)} disabled={subPage === subTotalPages || loading} className="pager-btn">Siguiente</button>
          </div>
        </div>
      </section>

      <div className="table-wrapper">
        {error && <div className="error-message">{error}</div>}
        <table className="users-table">
          <thead>
            <tr>
              <th>ID Usuario</th><th>Monto Total</th><th>Pagado</th><th>Pendiente</th><th>Vence</th><th>Días Restantes</th><th>Estado</th><th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {subscriptions.map((s) => {
              const pend = (s.totalAmount - s.paidAmount);
              return (
                <tr key={s.id}>
                  <td className="bold text-left" title={`ID: ${s.userId}`} style={{ textAlign: 'left', paddingLeft: '1.5rem' }}>
                    <span className="provider-name-click">{s.providerName || 'Sin Nombre'}</span>
                  </td>
                  <td className="mono bold">${s.totalAmount?.toFixed(2)}</td>
                  <td className="mono text-green">${s.paidAmount?.toFixed(2)}</td>
                  <td className={`mono ${pend > 0 ? 'text-amber' : 'text-gray'}`}>${pend?.toFixed(2)}</td>
                  <td className="mono"><FaCalendarAlt size={12} style={{marginRight:4}}/> {s.endDate}</td>
                  <td className="mono font-bold">
                    {(() => {
                      const days = s.remainingDays;
                      if (days < 10) {
                        return (
                          <span className="badge-days days-danger">
                            {days < 0 ? `Vencido (${days})` : `${days} días`}
                          </span>
                        );
                      }
                      if (days >= 10 && days <= 20) {
                        return (
                          <span className="badge-days days-warning">
                            {days} días
                          </span>
                        );
                      }
                      return (
                        <span className="badge-days days-success">
                          {days} días
                        </span>
                      );
                    })()}
                  </td>
                  <td><span className={`status ${s.status}`}>{s.status}</span></td>
                  <td>
                    <div className="actions" style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                      <button onClick={() => handleQuickPayment(s.id, s.providerName || 'Sin Nombre')} className="btn-verify" title="Abonar Cuota">
                        <FaDollarSign />
                      </button>
                      <button onClick={() => triggerDeleteModal(s.id, s.providerName || 'Sin Nombre')} className="btn-delete" title="Eliminar Suscripción">
                        <FaTrash />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {subscriptions.length === 0 && !loading && <div className="empty-text">No se encontraron registros de membresías.</div>}
      </div>

      {/* MODAL PERSONALIZADO DE CONFIRMACIÓN DE BORRADO */}
      {deleteModal.open && (
        <div className="custom-modal-overlay">
          <div className="custom-modal-box modal-confirm-width">
            <div className="confirm-icon-wrapper">
              <FaTrash size={24} />
            </div>
            <h2>¿Confirmar eliminación?</h2>
            <p className="confirm-text">
              Estás a punto de eliminar permanentemente la suscripción de <strong>{deleteModal.providerName}</strong>. 
              <br />
              <span className="text-danger-alert">Esta acción no se puede deshacer y borrará de forma inmediata todo su historial de pagos y abonos asociados.</span>
            </p>

            <div className="modal-actions-footer" style={{ borderTop: 'none', marginTop: '1rem', paddingTop: 0 }}>
              <button type="button" className="btn-cancel" onClick={() => setDeleteModal({ open: false, id: null, providerName: '' })}>
                Cancelar
              </button>
              <button type="button" className="btn-danger-submit" onClick={handleConfirmDelete}>
                Sí, eliminar definitivamente
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL PERSONALIZADO DE ABONO RÁPIDO */}
      {quickPayModal.open && (
        <div className="custom-modal-overlay">
          <div className="custom-modal-box modal-small-width">
            <h2>Registrar Abono Rápido</h2>
            <p className="confirm-text" style={{ marginBottom: '1.25rem' }}>
              Registrar cuota para: <strong>{quickPayModal.providerName}</strong>
            </p>
            
            <form onSubmit={handleConfirmQuickPayment}>
              <div className="form-group">
                <label>Monto a Abonar ($)</label>
                <input 
                  type="number" 
                  step="0.01" 
                  required 
                  autoFocus
                  placeholder="0.00" 
                  value={quickPayModal.amount}
                  onChange={e => setQuickPayModal({ ...quickPayModal, amount: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Método de Pago</label>
                <select 
                  required
                  value={quickPayModal.paymentMethodId}
                  onChange={e => setQuickPayModal({ ...quickPayModal, paymentMethodId: e.target.value })}
                >
                  {paymentMethods.map(method => (
                    <option key={method.id} value={method.id}>{method.name}</option>
                  ))}
                </select>
              </div>

              <div className="modal-actions-footer" style={{ marginTop: '1.5rem' }}>
                <button 
                  type="button" 
                  className="btn-cancel" 
                  onClick={() => setQuickPayModal({ open: false, subscriptionId: null, providerName: '', amount: '', paymentMethodId: '' })}
                >
                  Cancelar
                </button>
                <button type="submit" className="btn-submit btn-verify-submit">
                  Registrar Pago
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE REGULARIZACIÓN */}
      {regModal.open && (
        <div className="custom-modal-overlay">
          <div className="custom-modal-box">
            <h2>Regularizar Suscripción Proveedor</h2>
            <form onSubmit={handleSaveRegularization}>
              
              <div className="form-group search-async-user">
                <label>Buscar Proveedor Destinatario</label>
                {regModal.userId ? (
                  <div className="selected-user-pill">
                    <FaUser size={12} />
                    <span>{regModal.selectedUserName}</span>
                    <button type="button" className="clear-user" onClick={() => setRegModal({...regModal, userId: '', selectedUserName: ''})}>×</button>
                  </div>
                ) : (
                  <div className="search-input-wrapper">
                    <input type="text" placeholder="Escribe el nombre, username..." value={userSearchQuery} onChange={(e) => setUserSearchQuery(e.target.value)} autoComplete="off" />
                    {searchingUsers && <FaSpinner className="animate-spin text-indigo" />}
                  </div>
                )}

                {searchResults.length > 0 && (
                  <ul className="search-results-dropdown">
                    {searchResults.map(user => (
                      <li key={user.id} onClick={() => handleSelectUser(user)}>
                        <div className="user-name-title">{user.name || user.username}</div>
                        <div className="user-meta-sub">Username: {user.username}</div>
                      </li>
                    ))}
                  </ul>
                )}
                <input type="hidden" required value={regModal.userId} />
              </div>

              <div className="form-grid">
                <div className="form-group">
                  <label>Costo Total Acordado ($)</label>
                  <input type="number" step="0.01" required value={regModal.totalAmount} onChange={e => setRegModal({...regModal, totalAmount: e.target.value})} placeholder="6000.00" />
                </div>
                <div className="form-group">
                  <label>Estado Inicial</label>
                  <select value={regModal.status} onChange={e => setRegModal({...regModal, status: e.target.value})}>
                    <option value="active">Activo</option>
                    <option value="pending">Pendiente</option>
                    <option value="overdue">Moroso / Vencido</option>
                  </select>
                </div>
              </div>

              <div className="form-grid">
                <div className="form-group">
                  <label>Fecha Inicio</label>
                  <input type="date" required value={regModal.startDate} onChange={e => setRegModal({...regModal, startDate: e.target.value})} />
                </div>
                <div className="form-group">
                  <label>Fecha Vencimiento</label>
                  <input type="date" required value={regModal.endDate} onChange={e => setRegModal({...regModal, endDate: e.target.value})} />
                </div>
              </div>

              <div className="payments-section">
                <div className="flex-between">
                  <h3>Abonos o Cuotas Realizadas en el Pasado</h3>
                  <button type="button" className="btn-add-row" onClick={addHistoricalPaymentRow}>+ Agregar Pago</button>
                </div>
                {regModal.historicalPayments.map((p, i) => (
                  <div key={i} className="payment-row">
                    <select 
                      required 
                      value={p.paymentMethodId} 
                      onChange={e => {
                        const copy = [...regModal.historicalPayments]; 
                        copy[i].paymentMethodId = e.target.value;
                        setRegModal({...regModal, historicalPayments: copy});
                      }}
                      className="modal-select-inline"
                    >
                      <option value="" disabled>Método...</option>
                      {paymentMethods.map(method => (
                        <option key={method.id} value={method.id}>{method.name}</option>
                      ))}
                    </select>

                    <input required type="number" step="0.01" placeholder="Monto" value={p.amountPaid} onChange={e => {
                      const copy = [...regModal.historicalPayments]; copy[i].amountPaid = e.target.value;
                      setRegModal({...regModal, historicalPayments: copy});
                    }} />
                    <input required type="datetime-local" value={p.paymentDate} onChange={e => {
                      const copy = [...regModal.historicalPayments]; copy[i].paymentDate = e.target.value;
                      setRegModal({...regModal, historicalPayments: copy});
                    }} />
                    <input placeholder="Ref Bancaria" value={p.referenceNumber} onChange={e => {
                      const copy = [...regModal.historicalPayments]; copy[i].referenceNumber = e.target.value;
                      setRegModal({...regModal, historicalPayments: copy});
                    }} />
                  </div>
                ))}
              </div>

              <div className="modal-actions-footer">
                <button type="button" className="btn-cancel" onClick={closeModal}>Cancelar</button>
                <button type="submit" className="btn-submit" disabled={!regModal.userId}>Guardar Regularización</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style jsx>{`
        .tab-actions-header { display: flex; justify-content: flex-end; margin-bottom: 1rem; }
        .btn-add-subscription { background: #6366f1; border: none; color: #fff; padding: 0.625rem 1.25rem; border-radius: 0.5rem; font-weight: 600; cursor: pointer; display: flex; align-items: center; transition: 0.2s; }
        .btn-add-subscription:hover { background: #4f46e5; transform: translateY(-1px); }
        .controls-row { display: flex; flex-direction: column; gap: 1rem; margin-bottom: 1.5rem; background: rgba(255,255,255,0.02); padding: 1rem; border-radius: 0.75rem; border: 1px solid rgba(255,255,255,0.05); }
        .search-container { width: 100%; }
        .flex-gap { display: flex; gap: 0.75rem; align-items: center; }
        .search-box { display: flex; align-items: center; gap: 0.75rem; background: rgba(0,0,0,0.2); padding: 0.75rem 1rem; border-radius: 0.625rem; border: 1px solid rgba(255,255,255,0.1); flex: 1; }
        .search-box input { background: transparent; border: none; outline: none; color: #fff; width: 100%; font-size: 15px; }
        .search-box .icon { color: #555; }
        .modern-select { background: rgba(0,0,0,0.4); border: 1px solid rgba(255,255,255,0.1); color: #fff; padding: 0.75rem; border-radius: 0.625rem; outline: none; font-size: 0.875rem; cursor: pointer; min-width: 160px; }
        .modern-pager { display: flex; flex-direction: row; justify-content: space-between; align-items: center; width: 100%; gap: 0.5rem; }
        .pager-info { font-size: 0.85rem; color: #9aa0a6; }
        .total-badge { background: #06b6d4; color: #fff; padding: 2px 8px; border-radius: 6px; font-weight: 700; }
        .pager-actions { display: flex; align-items: center; background: rgba(255,255,255,0.03); padding: 0.25rem; border-radius: 0.625rem; border: 1px solid rgba(255,255,255,0.1); }
        .pager-btn { background: transparent; border: none; color: #fff; padding: 0.5rem 0.875rem; cursor: pointer; font-size: 0.8rem; border-radius: 0.375rem; transition: 0.2s; }
        .pager-btn:hover:not(:disabled) { background: rgba(255,255,255,0.1); }
        .pager-btn:disabled { opacity: 0.2; cursor: not-allowed; }
        .page-indicator { padding: 0 1rem; font-weight: 700; border-left: 1px solid #333; border-right: 1px solid #333; font-size: 0.9rem; }
        @media (min-width: 768px) { .controls-row { flex-direction: row; justify-content: space-between; } .search-container { max-width: 600px; } .modern-pager { width: auto; justify-content: flex-end; } }
        .table-wrapper { width: 100%; overflow-x: auto; background: rgba(255,255,255,0.01); border-radius: 0.75rem; border: 1px solid rgba(255,255,255,0.05); }
        .users-table { width: 100%; border-collapse: collapse; text-align: left; min-width: 1000px; }
        th { padding: 1rem; background: rgba(255,255,255,0.03); color: #9aa0a6; font-size: 0.75rem; text-transform: uppercase; text-align: center; }
        td { padding: 1rem; border-bottom: 1px solid rgba(255,255,255,0.03); font-size: 0.9rem; text-align: center; }
        .bold { font-weight: 600; white-space: nowrap; }
        .mono { font-family: ui-monospace, monospace; }
        .text-xs { font-size: 0.75rem; }
        .text-green { color: #10b981; }
        .text-amber { color: #f59e0b; }
        .text-gray { color: #6b7280; }
        .actions button { width: 2.125rem; height: 2.125rem; display: flex; align-items: center; justify-content: center; border-radius: 0.5rem; border: none; background: rgba(255,255,255,0.05); color: #fff; cursor: pointer; }
        .status { padding: 0.25rem 0.75rem; border-radius: 9999px; font-weight: 700; font-size: 0.75rem; display: inline-block; min-width: 80px; text-align: center; text-transform: uppercase; }
        .status.active { background: linear-gradient(90deg, #34d399, #10b981); color: #04261a; }
        .status.pending { background: #3b82f6; color: #fff; }
        .status.completed { background: #10b981; color: #fff; }
        .status.overdue { background: #ef4444; color: #fff; }
        .empty-text { padding: 3rem; text-align: center; color: #555; font-style: italic; }
        .error-message { color: #ef4444; padding: 1rem; font-size: 0.9rem; }

        .custom-modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.8); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 1rem; }
        .custom-modal-box { background: #111; border: 1px solid rgba(255,255,255,0.1); width: 100%; max-width: 750px; border-radius: 0.75rem; padding: 1.5rem; max-height: 90vh; overflow-y: auto; color: #fff; }
        .custom-modal-box h2 { font-size: 1.25rem; margin-top: 0; margin-bottom: 1rem; color: #6366f1; }
        .form-group { display: flex; flex-direction: column; gap: 0.35rem; margin-bottom: 1rem; position: relative; }
        .form-group label { font-size: 0.8rem; color: #9aa0a6; }
        .form-group input, .form-group select { background: #1a1a1a; border: 1px solid rgba(255,255,255,0.1); padding: 0.625rem; border-radius: 0.5rem; color: #fff; outline: none; }
        .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
        
        .payments-section { margin-top: 1.5rem; border-top: 1px solid #222; padding-top: 1rem; }
        .flex-between { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
        .payments-section h3 { font-size: 0.9rem; margin: 0; color: #9aa0a6; }
        .btn-add-row { background: rgba(16, 185, 129, 0.1); border: 1px solid #10b981; color: #10b981; padding: 0.35rem 0.75rem; border-radius: 0.375rem; font-size: 0.8rem; cursor: pointer; font-weight: 600; }
        
        .payment-row { display: grid; grid-template-columns: 1.5fr 1fr 1.8fr 1.5fr; gap: 0.5rem; margin-bottom: 0.5rem; }
        .payment-row input, .modal-select-inline { background: #161616; border: 1px solid #333; padding: 0.5rem; border-radius: 0.375rem; color: #fff; font-size: 0.8rem; outline: none; }
        
        .modal-actions-footer { display: flex; justify-content: flex-end; gap: 0.75rem; margin-top: 1.5rem; border-top: 1px solid #222; padding-top: 1rem; }
        .btn-cancel { background: transparent; border: 1px solid #333; color: #9aa0a6; padding: 0.5rem 1rem; border-radius: 0.5rem; cursor: pointer; }
        .btn-submit { background: #6366f1; border: none; color: #fff; padding: 0.5rem 1rem; border-radius: 0.5rem; cursor: pointer; font-weight: 600; }
        .btn-submit:disabled { opacity: 0.3; cursor: not-allowed; }

        .search-input-wrapper { position: relative; display: flex; align-items: center; }
        .search-input-wrapper input { width: 100%; padding-right: 2.5rem; }
        .search-input-wrapper :global(.animate-spin) { position: absolute; right: 0.75rem; color: #6366f1; animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        
        .search-results-dropdown { position: absolute; top: 100%; left: 0; right: 0; background: #161616; border: 1px solid rgba(255,255,255,0.15); border-radius: 0.5rem; z-index: 1010; max-height: 200px; overflow-y: auto; margin: 0.25rem 0 0; padding: 0; list-style: none; }
        .search-results-dropdown li { padding: 0.65rem 1rem; border-bottom: 1px solid rgba(255,255,255,0.03); cursor: pointer; }
        .search-results-dropdown li:hover { background: rgba(99, 102, 241, 0.15); }
        .user-name-title { font-size: 0.9rem; font-weight: 600; color: #fff; }
        .user-meta-sub { font-size: 0.75rem; color: #9aa0a6; margin-top: 0.15rem; }
        .selected-user-pill { display: flex; align-items: center; gap: 0.65rem; background: rgba(99, 102, 241, 0.15); border: 1px solid #6366f1; padding: 0.625rem; border-radius: 0.5rem; color: #a5b4fc; font-weight: 600; }
        .clear-user { background: transparent; border: none; color: #f87171; font-size: 1.25rem; cursor: pointer; margin-left: auto; line-height: 1; }

        .users-table td.text-left { text-align: left !important; }
        .provider-name-click { font-weight: 600; color: #e2e8f0; font-size: 0.925rem; }

        .badge-days {
          display: inline-block;
          padding: 0.35rem 0.75rem;
          border-radius: 6px;
          font-size: 0.85rem;
          font-weight: 700;
          text-align: center;
          min-width: 90px;
        }

        .days-danger {
          background: rgba(239, 68, 68, 0.15);
          color: #f87171;
          border: 1px solid rgba(239, 68, 68, 0.2);
        }

        .days-warning {
          background: rgba(245, 158, 11, 0.15);
          color: #fbbf24;
          border: 1px solid rgba(245, 158, 11, 0.2);
        }

        .days-success {
          background: rgba(16, 185, 129, 0.15);
          color: #34d399;
          border: 1px solid rgba(16, 185, 129, 0.2);
        }

        .btn-verify { background: #10b981 !important; color: #000 !important; }
        .btn-delete { background: rgba(239, 68, 68, 0.2) !important; color: #ef4444 !important; border: 1px solid rgba(239, 68, 68, 0.4) !important; transition: 0.2s; }
        .btn-delete:hover { background: #ef4444 !important; color: #fff !important; transform: translateY(-1px); }

        .modal-confirm-width { max-width: 450px !important; text-align: center; }
        .confirm-icon-wrapper { background: rgba(239, 68, 68, 0.1); color: #ef4444; width: 56px; height: 56px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 1rem; border: 1px solid rgba(239, 68, 68, 0.2); }
        .confirm-text { color: #9aa0a6; font-size: 0.9rem; line-height: 1.5; margin-bottom: 1.5rem; }
        .text-danger-alert { color: #f87171; font-size: 0.8rem; display: inline-block; margin-top: 0.5rem; background: rgba(239, 68, 68, 0.05); padding: 0.5rem; border-radius: 0.375rem; border: 1px solid rgba(239, 68, 68, 0.1); }
        .btn-danger-submit { background: #ef4444; border: none; color: #fff; padding: 0.5rem 1rem; border-radius: 0.5rem; cursor: pointer; font-weight: 600; transition: 0.2s; }
        .btn-danger-submit:hover { background: #dc2626; transform: translateY(-1px); }

        /* Estilos específicos para el modal de abono rápido */
        .modal-small-width { max-width: 420px !important; }
        .btn-verify-submit { background: #10b981 !important; color: #000 !important; font-weight: 700; }
        .btn-verify-submit:hover { background: #059669 !important; transform: translateY(-1px); }
      `}</style>
    </>
  )
}