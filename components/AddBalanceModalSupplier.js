import { useState, useEffect } from 'react';
import Modal from './Modal';

export default function AddBalanceModalSupplier({ open, onClose, onAdd }) {
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('PEN');
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      setAmount('');
      setCurrency('PEN');
      setError(null);
      setSubmitting(false);
    }
  }, [open]);

  const submit = async () => {
    setError(null);
    const parsed = parseFloat(amount);
    if (!amount || isNaN(parsed) || parsed <= 0) {
      setError('Ingresa un monto válido mayor a 0');
      return;
    }

    setSubmitting(true);
    try {
      // onAdd debe devolver una Promise que resuelva cuando la operación backend haya terminado
      await onAdd({ amount: parsed, currency });
      // si onAdd resuelve sin excepción cerramos
      setSubmitting(false);
      onClose();
    } catch (err) {
      // mostramos el error y no cerramos el modal
      setSubmitting(false);
      setError(err?.message || 'Error al procesar el depósito');
    }
  };

  return (
    <Modal open={open} onClose={() => { if (!submitting) onClose(); }} ariaLabel="Agregar saldo">
      <div className="modal-header">
        <h2>Agregar saldo</h2>
        <button className="close" onClick={() => { if (!submitting) onClose(); }} aria-label="Cerrar">✕</button>
      </div>

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
      </div>

      {error && <div className="error">{error}</div>}

      <div className="actions">
        <button className="btn ghost" onClick={() => { if (!submitting) onClose(); }} disabled={submitting}>Cancelar</button>
        <button className="btn primary" onClick={submit} disabled={submitting}>
          {submitting ? 'Enviando...' : 'Agregar'}
        </button>
      </div>

      <style jsx>{`
        .modal-header { display:flex; align-items:center; justify-content:space-between; gap:12px; margin-bottom:10px; }
        h2 { margin:0; font-size:1.1rem; color:#f3f3f3; }
        .close { background:transparent; border:none; color:#cfcfcf; font-size:1.05rem; cursor:pointer; }
        .field { display:flex; flex-direction:column; gap:6px; margin:10px 0; }
        label { color:#bfbfbf; font-size:0.9rem; }
        input, select {
          padding:10px 12px;
          border-radius:10px;
          border:1px solid rgba(255,255,255,0.06);
          background: rgba(30,30,30,0.7);
          color:#eee;
          outline:none;
        }
        input::placeholder { color:#8e8e8e; }
        .error { color:#ffb4b4; margin-top:8px; font-size:0.9rem; text-align:center; }
        .actions { display:flex; justify-content:flex-end; gap:10px; margin-top:14px; }
        .btn { padding:10px 14px; border-radius:10px; font-weight:700; cursor:pointer; border:none; }
        .btn.ghost { background:transparent; color:#e6e6e6; border:1px solid rgba(255,255,255,0.06); }
        .btn.primary { background:linear-gradient(135deg,#8b5cf6 0%,#22d3ee 100%); color:#0d0d0d; }
      `}</style>
    </Modal>
  );
}