'use client'

import React, { useState, useEffect } from 'react'
import Select, { components } from 'react-select'
import countriesData from '../data/countries.json' // Ajusta la ruta según tu estructura
import { FaPhoneAlt, FaSave, FaTimes } from 'react-icons/fa'

// Helper para URL de banderas
const flagPngUrl = (iso2) => `https://flagcdn.com/w40/${iso2.toLowerCase()}.png`

// Componentes personalizados para el Select (igual que en PurchaseModal)
function OptionWithFlag(props) {
  const { data } = props
  const iso = data.value
  return (
    <components.Option {...props}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <img
          src={flagPngUrl(iso)}
          alt={data.name}
          style={{ width: 28, height: 18, objectFit: 'cover', borderRadius: 2 }}
        />
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 14, color: '#EEE' }}>{data.name}</div>
          <div style={{ fontSize: 12, color: '#9A9A9A' }}>{`+${data.dial}`}</div>
        </div>
      </div>
    </components.Option>
  )
}

function SingleValueWithFlag(props) {
  const { data } = props
  const iso = data.value
  return (
    <components.SingleValue {...props}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <img
          src={flagPngUrl(iso)}
          alt={`${data.name} flag`}
          style={{ width: 20, height: 14, objectFit: 'cover', borderRadius: 2 }}
        />
        <span style={{ color: '#F0F0F0' }}>{data.name} (+{data.dial})</span>
      </div>
    </components.SingleValue>
  )
}

// Estilos del Select
const selectStyles = {
  control: (base) => ({
    ...base,
    backgroundColor: 'transparent',
    border: 'none',
    boxShadow: 'none',
    cursor: 'pointer',
    minWidth: 140,
    height: 44,
  }),
  singleValue: (base) => ({
    ...base,
    color: '#F0F0F0',
    fontSize: '0.88rem',
  }),
  menu: (base) => ({
    ...base,
    backgroundColor: '#131313',
    borderRadius: 14,
    zIndex: 9999
  }),
  option: (base, state) => ({
    ...base,
    backgroundColor: state.isFocused ? '#232323' : '#131313',
    color: '#F0F0F0',
    fontSize: '0.88rem',
  }),
  indicatorsContainer: (base) => ({ ...base, display: 'none' }),
}

export default function EditPhoneModal({ isOpen, onClose, stockId, currentPhone, onSuccess }) {
  const [customerPhone, setCustomerPhone] = useState('')
  const [countries, setCountries] = useState([])
  const [selectedCountry, setSelectedCountry] = useState(null)
  const [loading, setLoading] = useState(false)
  const [loadingCountries, setLoadingCountries] = useState(true)

  // Cargar países y limpiar número inicial
  useEffect(() => {
    const mapped = countriesData
      .map(c => ({
        label: `${c.flag || ''} ${c.name} (+${c.dial})`,
        value: c.code,
        name: c.name,
        dial: String(c.dial).replace(/\D/g, ''),
      }))
      .sort((a, b) => a.name.localeCompare(b.name))
    
    setCountries(mapped)
    
    // Intentar detectar el país del número actual o poner Perú por defecto
    const defaultCountry = mapped.find(c => c.name.toLowerCase().includes('peru')) || mapped[0]
    setSelectedCountry(defaultCountry)
    
    // Si ya hay un teléfono, quitarle caracteres no numéricos para el input
    if (currentPhone) {
      const onlyNums = currentPhone.replace(/\D/g, '')
      setCustomerPhone(onlyNums)
    }
    
    setLoadingCountries(false)
  }, [currentPhone])

  if (!isOpen) return null

  const handleUpdate = async (e) => {
    e.preventDefault()
    setLoading(true)
    
    try {
      const token = localStorage.getItem('accessToken')
      const BASE_URL = process.env.NEXT_PUBLIC_API_URL || ''
      
      // Construir número final con el prefijo seleccionado 
      const fullPhone = `+${selectedCountry.dial}${customerPhone.replace(/\D/g, '')}`

      const res = await fetch(`${BASE_URL}/api/stocks/${stockId}/client-phone`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ clientPhone: fullPhone })
      })

      if (!res.ok) throw new Error('Error al actualizar')

      onSuccess()
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
          <FaPhoneAlt />
          <h2>Actualizar Celular</h2>
        </div>

        <form onSubmit={handleUpdate} className="modal-body">
          <label className="input-label">Número de Celular</label>
          <div className="phone-input-container">
            <Select
              options={countries}
              value={selectedCountry}
              onChange={opt => setSelectedCountry(opt)}
              placeholder={loadingCountries ? '...' : 'País'}
              isDisabled={loadingCountries}
              components={{ Option: OptionWithFlag, SingleValue: SingleValueWithFlag }}
              styles={selectStyles}
            />
            <input
              type="tel"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value.replace(/\D/g, ''))}
              placeholder="Ej: 987654321"
              className="main-input"
              required
            />
          </div>

          <div className="actions">
            <button type="button" onClick={onClose} className="btn-secondary" disabled={loading}>
              Cerrar
            </button>
            <button type="submit" className="btn-primary" disabled={loading || !customerPhone}>
              {loading ? 'Procesando...' : 'Actualizar'}
            </button>
          </div>
        </form>
      </div>

      <style jsx>{`
        .modal-overlay {
          position: fixed; inset: 0; background: rgba(2, 6, 23, 0.7);
          display: flex; align-items: center; justify-content: center; z-index: 10000; padding: 20px;
        }
        .modal-card {
          width: 100%; max-width: 500px; background: #071026; border-radius: 16px;
          padding: 24px; position: relative; color: #fff;
          box-shadow: 0 18px 48px rgba(0,0,0,0.5);
        }
        .close-x {
          position: absolute; right: 16px; top: 16px; background: none; border: none;
          color: #9CA3AF; cursor: pointer; font-size: 18px;
        }
        .modal-header { display: flex; align-items: center; gap: 12px; margin-bottom: 24px; }
        .modal-header h2 { font-size: 20px; font-weight: 800; margin: 0; }
        .input-label { display: block; font-size: 12px; color: #9FB4C8; font-weight: 700; text-transform: uppercase; margin-bottom: 8px; text-align: left; }
        .phone-input-container {
          display: grid; grid-template-columns: 140px 1fr; gap: 8px; align-items: center;
          background: rgba(255, 255, 255, 0.02); border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 10px; padding: 2px 8px;
        }
        .main-input {
          background: transparent; border: none; color: #E6EEF7; outline: none; padding: 10px; font-size: 14px; width: 100%;
        }
        .actions { display: flex; justify-content: space-between; gap: 12px; margin-top: 24px; }
        .btn-secondary {
          padding: 12px 24px; border-radius: 10px; background: #E6EEF7; color: #081426;
          font-weight: 800; border: none; cursor: pointer;
        }
        .btn-primary {
          flex-grow: 1; padding: 12px 24px; border-radius: 10px; font-weight: 900; border: none; cursor: pointer;
          background: linear-gradient(90deg, #06B6D4, #10B981); color: #021018;
        }
        .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
      `}</style>
    </div>
  )
}