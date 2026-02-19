'use client'

import React, { useState, useEffect } from 'react'
import { FaUserEdit, FaSave, FaTimes } from 'react-icons/fa'

export default function EditNameModal({ isOpen, onClose, stockId, currentName, onSuccess }) {
  const [customerName, setCustomerName] = useState('')
  const [loading, setLoading] = useState(false)

  // Cargar el nombre inicial cuando se abre el modal
  useEffect(() => {
    if (currentName) {
      setCustomerName(currentName)
    } else {
      setCustomerName('')
    }
  }, [currentName, isOpen])

  if (!isOpen) return null

  const handleUpdate = async (e) => {
    e.preventDefault()
    if (!customerName.trim()) return

    setLoading(true)
    try {
      const token = localStorage.getItem('accessToken') 
      const BASE_URL = process.env.NEXT_PUBLIC_API_URL || '' 
      
      const res = await fetch(`${BASE_URL}/api/stocks/${stockId}/client-name`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ clientName: customerName })
      })

      if (!res.ok) throw new Error('Error al actualizar el nombre')

      onSuccess() // Refresca la tabla
      onClose()
    } catch (err) {
      alert(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay">
      <div className="modal-card">
        <button onClick={onClose} className="close-x">✕</button>
        
        <div className="modal-header">
          <FaUserEdit />
          <h2>Actualizar Cliente</h2>
        </div>

        <form onSubmit={handleUpdate} className="modal-body">
          <label className="input-label">Nombre del Cliente</label>
          <div className="name-input-container">
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Ej: Juan Pérez"
              className="main-input"
              required
              autoFocus
            />
          </div>

          <div className="actions">
            <button type="button" onClick={onClose} className="btn-secondary" disabled={loading}>
              Cerrar
            </button>
            <button type="submit" className="btn-primary" disabled={loading || !customerName.trim()}>
              {loading ? 'Procesando...' : 'Actualizar'}
            </button>
          </div>
        </form>
      </div>

      <style jsx>{`
        .modal-overlay {
          position: fixed;
          inset: 0; background: rgba(2, 6, 23, 0.7); 
          display: flex; align-items: center; justify-content: center; z-index: 10000; padding: 20px;
        }
        .modal-card {
          width: 100%;
          max-width: 450px; background: #071026; border-radius: 16px; 
          padding: 24px; position: relative; color: #fff;
          box-shadow: 0 18px 48px rgba(0,0,0,0.5); 
        }
        .close-x {
          position: absolute;
          right: 16px; top: 16px; background: none; border: none;
          color: #9CA3AF; cursor: pointer; font-size: 18px;
        }
        .modal-header { display: flex; align-items: center; gap: 12px; margin-bottom: 24px; color: #06B6D4;  }
        .modal-header h2 { font-size: 20px; font-weight: 800; margin: 0; color: #fff;}
        .input-label { display: block; font-size: 12px; color: #9FB4C8; font-weight: 700; text-transform: uppercase; 
          margin-bottom: 8px; text-align: left; }
        .name-input-container {
          background: rgba(255, 255, 255, 0.02); border: 1px solid rgba(255, 255, 255, 0.08); 
          border-radius: 10px; padding: 4px 12px;
        }
        .main-input {
          background: transparent;
          border: none; color: #E6EEF7; outline: none; padding: 10px; font-size: 14px; width: 100%; 
        }
        .actions { display: flex; justify-content: space-between; gap: 12px; margin-top: 24px;  }
        .btn-secondary {
          padding: 12px 24px;
          border-radius: 10px; background: #E6EEF7; color: #081426;
          font-weight: 800; border: none; cursor: pointer;
        }
        .btn-primary {
          flex-grow: 1;
          padding: 12px 24px; border-radius: 10px; font-weight: 900; border: none; cursor: pointer; 
          background: linear-gradient(90deg, #06B6D4, #10B981); color: #021018;
        .btn-primary:disabled { opacity: 0.5; cursor: not-allowed;  }
      `}</style>
    </div>
  )
}