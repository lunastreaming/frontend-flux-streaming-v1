import React, { useState } from 'react';

const RepublishStockModal = ({ open, stock, onClose, onSuccess }) => {
  const [password, setPassword] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [showConfirmStep, setShowConfirmStep] = useState(false); // Para el doble check
  const [notification, setNotification] = useState({ show: false, message: '', type: '' });

  if (!open) return null;

  const showNotify = (message, type) => {
    setNotification({ show: true, message, type });
    setTimeout(() => {
      setNotification({ show: false, message: '', type: '' });
      if (type === 'success') {
        onSuccess();
      }
    }, 2000);
  };

  const handlePreSubmit = (e) => {
    e.preventDefault();
    setShowConfirmStep(true);
  };

  const handleFinalSubmit = async () => {
    setLoading(true);
    const BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';
    const token = localStorage.getItem('accessToken');

    try {
      const res = await fetch(`${BASE_URL}/api/stocks/${stock.id}/republish`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ password, pin })
      });

      if (!res.ok) throw new Error('Error en la respuesta del servidor');
      
      showNotify('¡Stock republicado con éxito!', 'success');
    } catch (error) {
      console.error(error);
      showNotify('Error: No se pudo procesar la republicación', 'error');
      setShowConfirmStep(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      {/* NOTIFICACIÓN TIPO TOAST */}
      {notification.show && (
        <div className={`toast-notification ${notification.type}`}>
          {notification.message}
        </div>
      )}

      <div className="modal-card">
        <h2 className="modal-title">Republicar Stock</h2>
        <p className="modal-subtitle">
          Vas a crear una nueva versión de <strong>{stock?.productName}</strong>. 
          El registro antiguo será eliminado.
        </p>

        {!showConfirmStep ? (
          <form onSubmit={handlePreSubmit} className="modal-form">
            <div className="input-group">
              <label>Nueva Contraseña</label>
              <input
                type="text"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="Ingrese password..."
                autoFocus
                disabled={loading}
              />
            </div>

            <div className="input-group">
              <label>Nuevo PIN</label>
              <input
                type="text"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                required
                placeholder="Ingrese PIN..."
                disabled={loading}
              />
            </div>

            <div className="modal-actions">
              <button type="button" onClick={onClose} className="btn-cancel" disabled={loading}>
                Cancelar
              </button>
              <button type="submit" className="btn-next" disabled={loading}>
                Continuar
              </button>
            </div>
          </form>
        ) : (
          <div className="confirm-step">
            <div className="summary-box">
              <p><strong>Pass:</strong> {password}</p>
              <p><strong>PIN:</strong> {pin}</p>
            </div>
            <p className="confirm-text">¿Confirmas que los datos son correctos?</p>
            <div className="modal-actions">
              <button onClick={() => setShowConfirmStep(false)} className="btn-cancel" disabled={loading}>
                Atrás
              </button>
              <button onClick={handleFinalSubmit} className="btn-confirm" disabled={loading}>
                {loading ? 'Procesando...' : 'Sí, Republicar'}
              </button>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .modal-overlay {
          position: fixed; top: 0; left: 0; width: 100%; height: 100%;
          background: rgba(0,0,0,0.85); backdrop-filter: blur(8px);
          display: flex; align-items: center; justify-content: center; z-index: 9999;
        }
        .modal-card {
          background: #161b26; border: 1px solid rgba(255,255,255,0.1);
          padding: 28px; border-radius: 20px; width: 90%; max-width: 400px;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
          position: relative;
        }
        .modal-title { color: #fff; font-size: 1.4rem; margin-bottom: 8px; font-weight: 700; }
        .modal-subtitle { color: #9fb4c8; font-size: 0.85rem; margin-bottom: 24px; line-height: 1.4; }
        .modal-form { display: flex; flex-direction: column; gap: 18px; }
        
        .input-group label { display: block; color: #9fb4c8; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px; }
        .input-group input {
          width: 100%; background: #0b1220; border: 1px solid #2d3748;
          padding: 12px; border-radius: 10px; color: #fff; outline: none; transition: all 0.2s;
        }
        .input-group input:focus { border-color: #3b82f6; box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2); }
        
        .summary-box { background: #0b1220; padding: 12px; border-radius: 10px; margin-bottom: 16px; border: 1px dashed #2d3748; }
        .summary-box p { color: #fff; font-size: 0.9rem; margin: 4px 0; }
        .confirm-text { color: #fff; text-align: center; margin-bottom: 20px; font-size: 0.95rem; }

        .modal-actions { display: flex; gap: 12px; margin-top: 10px; }
        .btn-cancel { flex: 1; padding: 12px; border-radius: 10px; background: #2d3748; color: #fff; border: none; cursor: pointer; font-weight: 600; transition: background 0.2s; }
        .btn-cancel:hover { background: #3f4a5d; }
        
        .btn-next, .btn-confirm { 
          flex: 2; padding: 12px; border-radius: 10px; border: none; cursor: pointer;
          background: linear-gradient(135deg, #60a5fa 0%, #2563eb 100%); color: white; font-weight: 600;
          box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3); transition: transform 0.1s;
        }
        .btn-next:active, .btn-confirm:active { transform: scale(0.98); }

        /* TOAST ANIMATION */
        .toast-notification {
          position: absolute; top: 20px; padding: 12px 24px; border-radius: 12px;
          color: white; font-weight: 600; animation: slideDown 0.3s ease-out; z-index: 10000;
        }
        .toast-notification.success { background: #22c55e; box-shadow: 0 10px 15px -3px rgba(34, 197, 94, 0.4); }
        .toast-notification.error { background: #ef4444; box-shadow: 0 10px 15px -3px rgba(239, 68, 68, 0.4); }

        @keyframes slideDown {
          from { transform: translateY(-20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default RepublishStockModal;