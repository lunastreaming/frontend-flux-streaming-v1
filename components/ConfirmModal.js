import { useEffect, useState } from 'react'
import ReactDOM from 'react-dom'
import { FaTimes } from 'react-icons/fa'

export default function ConfirmModal({
  // aceptamos ambos nombres: visible u open
  visible,
  open,
  // texto y callbacks
  title,
  message,
  confirmText = 'Eliminar',
  cancelText = 'Cancelar',
  onConfirm,
  onCancel,
  // estado de loading opcional
  loading = false,
}) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // resolver valor booleano de visibilidad (open tiene prioridad)
  const isVisible = typeof open !== 'undefined' ? open : !!visible

  useEffect(() => {
    console.log('🔔 [ConfirmModal] visible =', isVisible, '– mounted =', mounted)
  }, [isVisible, mounted])

  if (!mounted || !isVisible) return null

  return ReactDOM.createPortal(
    <div
      // atributo para que el fallback pueda detectarlo
      data-confirm-modal
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: 'rgba(0,0,0,0.6)',
        zIndex: 2147483647,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title || 'Confirmar acción'}
        style={{
          position: 'relative',
          backgroundColor: 'white',
          padding: '1.5rem',
          borderRadius: '8px',
          border: '4px solid #e53e3e',
          boxShadow: '0 0 20px rgba(0,0,0,0.5)',
          maxWidth: '400px',
          width: '90%',
        }}
      >
        <button
          onClick={onCancel}
          aria-label="Cerrar"
          style={{
            position: 'absolute',
            top: '0.5rem',
            right: '0.5rem',
            background: 'none',
            border: 'none',
            fontSize: '1.25rem',
            cursor: 'pointer',
          }}
        >
          <FaTimes />
        </button>

        {title && <h3 style={{ marginTop: 0, marginBottom: '0.5rem' }}>{title}</h3>}
        <p style={{ marginBottom: '1rem', fontSize: '1rem' }}>{message}</p>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
          <button
            onClick={onCancel}
            disabled={loading}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#a0aec0',
              border: 'none',
              borderRadius: '4px',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
            }}
          >
            {cancelText}
          </button>

          <button
            onClick={onConfirm}
            disabled={loading}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#e53e3e',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.85 : 1,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            {loading ? (
              // spinner simple CSS inline
              <svg width="16" height="16" viewBox="0 0 38 38" xmlns="http://www.w3.org/2000/svg" stroke="#fff">
                <g fill="none" fillRule="evenodd">
                  <g transform="translate(1 1)" strokeWidth="2">
                    <circle strokeOpacity=".3" cx="18" cy="18" r="18" />
                    <path d="M36 18c0-9.94-8.06-18-18-18">
                      <animateTransform
                        attributeName="transform"
                        type="rotate"
                        from="0 18 18"
                        to="360 18 18"
                        dur="0.9s"
                        repeatCount="indefinite"
                      />
                    </path>
                  </g>
                </g>
              </svg>
            ) : null}
            {confirmText}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}