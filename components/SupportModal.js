// components/SupportModal.js
import { useEffect, useState } from 'react'
import { FaWrench } from 'react-icons/fa'

export default function SupportModal({ open, onClose, onAccept }) {
  const [choice, setChoice] = useState('Password')

  useEffect(() => {
    if (!open) setChoice('Password')
  }, [open])

  if (!open) return null

  const options = ['Password', 'Pago', 'Geo', 'Código']

  return (
    <div style={modalBackdrop}>
      <div role="dialog" aria-modal="true" style={modalCard}>
        <header style={modalHeader}>
          <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
            <FaWrench style={{ color: '#E6EEF7' }} />
            <span>Generar Soporte</span>
          </h3>
          <button onClick={onClose} aria-label="Cerrar" style={modalClose}>✕</button>
        </header>

        <div style={{ padding: 18 }}>
          <p style={{ marginTop: 0, color: '#9FB4C8' }}>Elija una de las siguientes opciones:</p>

          <div style={{ display: 'grid', gap: 8 }}>
            {options.map(opt => (
              <label key={opt} style={radioRow}>
                <input
                  type="radio"
                  name="supportOption"
                  value={opt}
                  checked={choice === opt}
                  onChange={() => setChoice(opt)}
                  style={{ marginRight: 8 }}
                />
                <span style={{ fontWeight: 700 }}>{opt}</span>
              </label>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 18 }}>
            <button onClick={onClose} style={cancelBtn}>Cancelar</button>
            <button onClick={() => { onAccept(choice); onClose() }} style={acceptBtn}>Aceptar</button>
          </div>
        </div>
      </div>
    </div>
  )
}

/* estilos inline exportados en el mismo archivo para simplicidad */
const modalBackdrop = {
  position: 'fixed',
  inset: 0,
  backgroundColor: 'rgba(2,6,23,0.6)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 14000,
  padding: 20
}

const modalCard = {
  width: '100%',
  maxWidth: 520,
  background: 'linear-gradient(180deg,#071026,#081426)',
  color: '#EDF2F7',
  borderRadius: 12,
  boxShadow: '0 18px 40px rgba(2,6,23,0.7)',
  overflow: 'hidden'
}

const modalHeader = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '12px 16px',
  borderBottom: '1px solid rgba(255,255,255,0.04)'
}

const modalClose = {
  background: 'transparent',
  border: 'none',
  color: '#9CA3AF',
  fontSize: 16,
  cursor: 'pointer'
}

const radioRow = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: '8px 10px',
  borderRadius: 8,
  background: 'rgba(255,255,255,0.01)',
  cursor: 'pointer'
}

const acceptBtn = {
  padding: '10px 14px',
  borderRadius: 8,
  background: 'linear-gradient(90deg,#10b981,#06b6d4)',
  color: '#021018',
  border: 'none',
  fontWeight: 800,
  cursor: 'pointer'
}

const cancelBtn = {
  padding: '10px 14px',
  borderRadius: 8,
  background: '#ef4444',
  color: '#fff',
  border: 'none',
  fontWeight: 700,
  cursor: 'pointer'
}