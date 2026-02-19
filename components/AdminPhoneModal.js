import { useState, useEffect, useMemo } from 'react';
import Select, { components } from 'react-select';
import countriesData from '../data/countries.json'; // Ajusta la ruta según tu proyecto

// Helper para banderas (usando la misma lógica de tu registro)
const flagPngUrl = (iso2) => `https://flagcdn.com/w40/${iso2.toLowerCase()}.png`;

// Componentes personalizados para el Select (Banderas en la lista y valor seleccionado)
const OptionWithFlag = (props) => (
  <components.Option {...props}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <img src={flagPngUrl(props.data.value)} alt="" style={{ width: 20, borderRadius: 2 }} />
      <span style={{ fontSize: 14, color: '#EEE' }}>{props.data.name} (+{props.data.dial})</span>
    </div>
  </components.Option>
);

const SingleValueWithFlag = (props) => (
  <components.SingleValue {...props}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <img src={flagPngUrl(props.data.value)} alt="" style={{ width: 18, borderRadius: 2 }} />
      <span style={{ color: '#F0F0F0', fontSize: '0.9rem' }}>+{props.data.dial}</span>
    </div>
  </components.SingleValue>
);

export default function AdminPhoneModal({ open, userId, username, currentPhone, onClose, onSuccess }) {
  const [phoneDigits, setPhoneDigits] = useState('');
  const [selectedCountry, setSelectedCountry] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Mapeo de países desde el JSON
  const countries = useMemo(() => {
    return countriesData.map(c => ({
      value: c.code,
      name: c.name,
      dial: String(c.dial).replace(/\D/g, ''),
      label: `${c.name} (+${c.dial})`
    })).sort((a, b) => a.name.localeCompare(b.name));
  }, []);

  useEffect(() => {
    if (open) {
      setError(null);
      // Intentar separar el código de país del número actual si existe
      if (currentPhone && currentPhone.startsWith('+')) {
        const found = countries.find(c => currentPhone.startsWith(`+${c.dial}`));
        if (found) {
          setSelectedCountry(found);
          setPhoneDigits(currentPhone.replace(`+${found.dial}`, ''));
        }
      } else {
        const defaultCountry = countries.find(c => c.name.toLowerCase().includes('peru')) || countries[0];
        setSelectedCountry(defaultCountry);
        setPhoneDigits(currentPhone || '');
      }
    }
  }, [open, currentPhone, countries]);

  const handleSave = async () => {
    if (!phoneDigits.trim()) {
      setError("El número de celular es requerido.");
      return;
    }

    const fullPhone = `+${selectedCountry.dial}${phoneDigits.replace(/\D/g, '')}`;
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/users/${userId}/phone`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ newPhone: fullPhone })
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        if (data?.message === "phone_already_exists") throw new Error("Este número ya está registrado por otro usuario.");
        throw new Error(data?.message || "Error al actualizar");
      }

      onSuccess();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  // Estilos del Select (adaptados de tu registro para que luzcan bien en el modal oscuro)
  const selectStyles = {
    control: (base) => ({ ...base, background: '#0b0e11', border: '1px solid #3f444e', borderRadius: '8px 0 0 8px', height: '44px', boxShadow: 'none' }),
    menu: (base) => ({ ...base, background: '#131313', zIndex: 9999 }),
    option: (base, state) => ({ ...base, background: state.isFocused ? '#232323' : '#131313', cursor: 'pointer' }),
    singleValue: (base) => ({ ...base, color: '#fff' }),
    input: (base) => ({ ...base, color: '#fff' }),
    indicatorsContainer: (base) => ({ ...base, display: 'none' })
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h3>Actualizar Celular</h3>
        <p className="desc">Usuario: <strong>{username}</strong></p>
        
        <div className="phone-input-container">
          <div className="country-selector">
            <Select
              options={countries}
              value={selectedCountry}
              onChange={setSelectedCountry}
              components={{ Option: OptionWithFlag, SingleValue: SingleValueWithFlag }}
              styles={selectStyles}
            />
          </div>
          <input
            type="tel"
            value={phoneDigits}
            onChange={(e) => setPhoneDigits(e.target.value.replace(/\D/g, ''))}
            placeholder="Número de celular"
            disabled={loading}
          />
        </div>

        {error && <div className="error-box">{error}</div>}

        <div className="modal-actions">
          <button onClick={onClose} className="btn-cancel" disabled={loading}>Cancelar</button>
          <button onClick={handleSave} className="btn-confirm" disabled={loading}>
            {loading ? "Cargando..." : "Confirmar"}
          </button>
        </div>
      </div>

      <style jsx>{`
        .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.8); display: flex; align-items: center; justify-content: center; z-index: 3000; }
        .modal-content { background: #1e2227; padding: 24px; border-radius: 16px; width: 400px; border: 1px solid #333; }
        h3 { margin: 0; color: #fff; }
        .desc { color: #9aa0a6; font-size: 0.9rem; margin: 8px 0 20px 0; }
        
        .phone-input-container { display: flex; align-items: center; margin-bottom: 16px; }
        .country-selector { width: 120px; }
        
        input { 
          flex: 1; height: 44px; background: #0b0e11; border: 1px solid #3f444e; 
          border-left: none; border-radius: 0 8px 8px 0; color: #fff; padding: 0 12px;
          outline: none; font-size: 1rem;
        }
        input:focus { border-color: #06b6d4; }

        .error-box { background: rgba(239, 68, 68, 0.1); color: #fca5a5; padding: 10px; border-radius: 8px; font-size: 0.85rem; margin-bottom: 15px; }
        
        .modal-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px; }
        button { padding: 10px 18px; border-radius: 8px; cursor: pointer; font-weight: 600; border: none; }
        .btn-cancel { background: transparent; color: #9aa0a6; }
        .btn-confirm { background: #06b6d4; color: #000; }
      `}</style>
    </div>
  );
}