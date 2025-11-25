// components/AdminPasswordModal.jsx
import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthProvider'

export default function AdminPasswordModal({
  open,
  userId,
  username,              // opcional, para mostrar contexto
  onClose,               // () => void
  onSuccess              // (userId) => void  opcional: refrescar lista, toasts, etc.
}) {
  const { ensureValidAccess } = useAuth()
  const API_BASE_RAW = process.env.NEXT_PUBLIC_API_URL || ''
  const API_BASE = API_BASE_RAW.replace(/\/+$/, '')

  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (open) {
      setPassword('')
      setShow(false)
      setLoading(false)
      setError(null)
    }
  }, [open])

  const minLenOk = (password || '').length >= 8
  const canSubmit = open && !loading && minLenOk && Boolean(userId)

  const submit = async (e) => {
    e?.preventDefault?.()
    if (!canSubmit) return
    setLoading(true)
    setError(null)
    try {
      const token = typeof ensureValidAccess === 'function'
        ? await ensureValidAccess()
        : (typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null)

      const url = `${API_BASE}/api/admin/users/${encodeURIComponent(userId)}/password`
      const res = await fetch(url, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          newPassword: password,
          requireReset: false
        })
      })
      if (!res.ok) {
        const text = await res.text().catch(() => '')
        throw new Error(text || `Error ${res.status}`)
      }

      setLoading(false)
      onClose?.()
      onSuccess?.(userId)
    } catch (err) {
      setLoading(false)
      setError(err?.message || 'No se pudo actualizar la contraseña')
    }
  }

  if (!open) return null

  return (
    <div className="apm-backdrop" role="dialog" aria-modal="true" aria-labelledby="apm-title">
      <div className="apm-modal">
        <header className="apm-header">
          <h2 id="apm-title">Cambiar contraseña</h2>
          <button className="apm-close" onClick={onClose} aria-label="Cerrar">×</button>
        </header>

        <div className="apm-body">
          {username && (
            <p className="apm-context">
              Estás cambiando la contraseña de <span className="apm-user">{username}</span>.
            </p>
          )}

          <form onSubmit={submit} className="apm-form">
            <label htmlFor="apm-password" className="apm-label">Nueva contraseña</label>
            <div className="apm-input-wrap">
              <input
                id="apm-password"
                type={show ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 8 caracteres"
                autoFocus
                disabled={loading}
                aria-invalid={!minLenOk}
                aria-describedby="apm-help"
              />
              <button
                type="button"
                className="apm-toggle"
                onClick={() => setShow(s => !s)}
                aria-label={show ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                disabled={loading}
              >
                {show ? 'Ocultar' : 'Mostrar'}
              </button>
            </div>
            <p id="apm-help" className="apm-help">
              Debe tener al menos 8 caracteres.
            </p>

            {error && <div className="apm-error">{error}</div>}

            <div className="apm-actions">
              <button type="button" className="apm-cancel" onClick={onClose} disabled={loading}>
                Cancelar
              </button>
              <button type="submit" className="apm-submit" disabled={!canSubmit}>
                {loading ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </form>
        </div>
      </div>

      <style jsx>{`
        .apm-backdrop {
          position: fixed; inset: 0;
          background: rgba(0,0,0,0.6);
          display: grid; place-items: center;
          z-index: 50;
        }
        .apm-modal {
          width: 100%;
          max-width: 520px;
          border-radius: 12px;
          background: #0f172a; /* slate-900 */
          color: #e5e7eb;      /* gray-200 */
          box-shadow: 0 10px 30px rgba(0,0,0,0.45);
          overflow: hidden;
          border: 1px solid rgba(255,255,255,0.06);
        }
        .apm-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 16px 18px; background: rgba(255,255,255,0.03);
        }
        .apm-header h2 {
          margin: 0; font-size: 1.1rem; font-weight: 800; color: #fff;
        }
        .apm-close {
          border: 0; background: transparent; color: #9aa0a6;
          font-size: 22px; cursor: pointer; line-height: 1;
        }
        .apm-close:hover { color: #fff; }

        .apm-body { padding: 16px 18px; }
        .apm-context { margin: 0 0 10px 0; color: #9aa0a6; }
        .apm-user { color: #fff; font-weight: 700; }

        .apm-form { display: grid; gap: 10px; }
        .apm-label { font-weight: 700; color: #e5e7eb; }
        .apm-input-wrap {
          display: flex; align-items: stretch; gap: 8px;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 10px; padding: 8px;
        }
        .apm-input-wrap input {
          flex: 1; border: 0; outline: none; background: transparent;
          color: #e5e7eb; font-size: 0.95rem;
        }
        .apm-toggle {
          border: 0; padding: 6px 10px; border-radius: 8px;
          background: rgba(255,255,255,0.06); color: #0b1220;
          cursor: pointer; font-weight: 700;
        }
        .apm-toggle:hover { background: rgba(255,255,255,0.12); }

        .apm-help { margin: 0; font-size: 0.85rem; color: #9aa0a6; }
        .apm-error {
          background: rgba(239,68,68,0.08);
          border: 1px solid rgba(239,68,68,0.35);
          color: #fecaca;
          padding: 8px 10px; border-radius: 8px;
        }

        .apm-actions {
          display: flex; justify-content: flex-end; gap: 10px; margin-top: 6px;
        }
        .apm-cancel {
          border: 0; padding: 8px 12px; border-radius: 8px;
          background: rgba(255,255,255,0.06); color: #e5e7eb; cursor: pointer;
        }
        .apm-submit {
          border: 0; padding: 8px 12px; border-radius: 8px;
          background: linear-gradient(90deg,#06b6d4,#10b981);
          color: #07101a; font-weight: 800; cursor: pointer;
        }
        .apm-submit[disabled] { opacity: 0.6; cursor: not-allowed; }
      `}</style>
    </div>
  )
}