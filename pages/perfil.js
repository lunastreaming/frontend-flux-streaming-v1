import { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import Select, { components } from 'react-select';
import countriesData from '../data/countries.json'; 
import ConfirmModal from '../components/ConfirmModal'; 
import { 
  FaUserCircle, FaWallet, FaShieldAlt, FaIdCard, 
  FaChevronRight, FaInfoCircle, FaWhatsapp 
} from 'react-icons/fa';

/** * COMPONENTES PARA EL SELECTOR DE PAÍSES (Basado en tu Register)
 */
const flagPngUrl = (iso2) => `https://flagcdn.com/w40/${iso2.toLowerCase()}.png`;

const OptionWithFlag = (props) => (
  <components.Option {...props}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <img src={flagPngUrl(props.data.value)} alt="" style={{ width: 28, height: 18, objectFit: 'cover', borderRadius: 2 }} />
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <span style={{ fontSize: 14, color: '#EEE' }}>{props.data.name}</span>
        <span style={{ fontSize: 12, color: '#9A9A9A' }}>{`+${props.data.dial}`}</span>
      </div>
    </div>
  </components.Option>
);

const SingleValueWithFlag = (props) => (
  <components.SingleValue {...props}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <img src={flagPngUrl(props.data.value)} alt="" style={{ width: 20, height: 14, borderRadius: 2 }} />
      <span style={{ color: '#F0F0F0', fontSize: '14px' }}>+{props.data.dial}</span>
    </div>
  </components.SingleValue>
);

export default function Profile() {
  // Estados de datos
  const [userData, setUserData] = useState(null);
  const [cost, setCost] = useState(0);
  const [countries, setCountries] = useState([]);
  const [selectedCountry, setSelectedCountry] = useState(null);
  
  // Estados de UI
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [phoneDigits, setPhoneDigits] = useState('');
  const [status, setStatus] = useState({ type: '', msg: '' });
  
  // Estados para el ConfirmModal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const [userRes, settingsRes] = await Promise.all([
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users/me`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/settings`, { headers: { 'Authorization': `Bearer ${token}` } })
      ]);

      const settings = await settingsRes.json();
      const userSummary = await userRes.json();

      // Buscamos el costo en los settings
      const costSetting = settings.find(s => s.key === 'cost_change_phone');
      
      // Mapeamos países del JSON
      const mapped = countriesData.map(c => ({
        value: c.code,
        name: c.name,
        dial: String(c.dial).replace(/\D/g, '')
      })).sort((a, b) => a.name.localeCompare(b.name));

      setCountries(mapped);
      setSelectedCountry(mapped.find(c => c.name.toLowerCase().includes('peru')) || mapped[0]);
      setUserData(userSummary);
      setCost(costSetting?.valueNum || 0);
      setLoading(false);
    } catch (err) { 
      console.error("Error cargando perfil:", err);
      setLoading(false); 
    }
  };

const handleUpdateExecution = async () => {
  setIsUpdating(true);
  setStatus({ type: '', msg: '' });
  
  const fullPhone = `+${selectedCountry.dial}${phoneDigits}`;
  
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users/me/phone`, {
      method: 'PATCH',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('accessToken')}` 
      },
      body: JSON.stringify({ newPhone: fullPhone })
    });

    // Éxito (Status 204 o 200)
    if (res.status === 204 || res.ok) {
      setIsModalOpen(false);
      setShowForm(false); // Cerramos el formulario automáticamente
      
      // ACTUALIZACIÓN LOCAL DEL ESTADO (Sin recargar página)
      setUserData(prev => ({
        ...prev,
        phone: fullPhone, // Actualizamos el teléfono visualmente
        balance: prev.balance - cost // Restamos el costo del balance actual
      }));

      setStatus({ type: 'success', msg: '¡Datos actualizados correctamente!' });
      
      // Limpiamos el mensaje de éxito después de unos segundos
      setTimeout(() => setStatus({ type: '', msg: '' }), 4000);
      
    } else {
      // Manejo de errores
      const data = await res.json();
      setIsModalOpen(false);
      if (data.message === 'phone_already_exists') {
        setStatus({ type: 'error', msg: 'Este número ya está en uso por otro usuario.' });
      } else {
        setStatus({ type: 'error', msg: data.message || 'Error al procesar el cambio.' });
      }
    }
  } catch (err) {
    console.error("Error:", err);
    setStatus({ type: 'error', msg: 'Error de conexión.' });
    setIsModalOpen(false);
  } finally {
    setIsUpdating(false);
  }
};

  // Estilos del Select
  const selectStyles = {
    control: (base) => ({ 
      ...base, 
      background: 'transparent', 
      border: 'none', 
      boxShadow: 'none', 
      height: '42px',
      cursor: 'pointer'
    }),
    singleValue: (base) => ({ ...base, color: '#fff' }),
    menu: (base) => ({ ...base, background: '#111', border: '1px solid #333', borderRadius: '12px', zIndex: 100 }),
    option: (base, state) => ({ 
      ...base, 
      background: state.isFocused ? '#222' : 'transparent', 
      color: '#fff',
      cursor: 'pointer'
    }),
    indicatorsContainer: (base) => ({ ...base, display: 'none' })
  };

  if (loading) return null;

  return (
    <div className="profile-page">
      <Navbar />
      
      <main className="profile-container animate-rise">
        {/* TARJETA 1: IDENTIDAD */}
        <div className="glass-card identity-card">
          <div className="header-flex">
            <div className="avatar-box">
              <FaUserCircle size={75} color="#2a2a2a" />
              <div className="status-badge">ACTIVO</div>
            </div>
            <div className="name-box">
              <span className="label-top">DISTRIBUIDOR</span>
              <h1>{userData?.username}</h1>
            </div>
          </div>
          
          <div className="balance-widget">
            <div className="b-left">
              <FaWallet className="icon-blue" />
              <span>SALDO ACTUAL</span>
            </div>
            <div className="b-right">
              <h2>${userData?.balance?.toFixed(2)} <small>USD</small></h2>
            </div>
          </div>
        </div>

        {/* TARJETA 2: SEGURIDAD */}
        <div className="glass-card security-card">
          <h3 className="card-title"><FaShieldAlt /> AJUSTES DE SEGURIDAD</h3>
          
          <div className="data-row">
            <div className="data-info">
              <div className="icon-wrap"><FaWhatsapp /></div>
              <div>
                <label>WHATSAPP VINCULADO</label>
                <p>{userData?.phone || 'NO REGISTRADO'}</p>
              </div>
            </div>
            {!showForm && (
              <button className="btn-edit" onClick={() => setShowForm(true)}>
                Cambiar número <FaChevronRight />
              </button>
            )}
          </div>

          {showForm && (
            <div className="expand-form">
              <div className="cost-info">
                <FaInfoCircle /> Costo por actualización: <strong>${cost} USD</strong>
              </div>
              
              <div className="input-group">
                <div className="sel-container">
                  <Select 
                    options={countries}
                    value={selectedCountry}
                    onChange={setSelectedCountry}
                    components={{ Option: OptionWithFlag, SingleValue: SingleValueWithFlag }}
                    styles={selectStyles}
                    isSearchable={false}
                  />
                </div>
                <input 
                  type="tel" 
                  placeholder="Nuevo número" 
                  value={phoneDigits}
                  onChange={(e) => setPhoneDigits(e.target.value.replace(/\D/g, ''))}
                />
              </div>

              <div className="form-actions">
                <button className="btn-cancel" onClick={() => setShowForm(false)}>Cancelar</button>
                <button 
                  className="btn-confirm-trigger" 
                  onClick={() => setIsModalOpen(true)}
                  disabled={phoneDigits.length < 6}
                >
                  Actualizar
                </button>
              </div>
            </div>
          )}

          {status.msg && <div className={`status-msg ${status.type}`}>{status.msg}</div>}

          <div className="divider" />

          <div className="data-row">
            <div className="data-info">
              <div className="icon-wrap gray"><FaIdCard /></div>
              <div>
                <label>ID DE USUARIO (UUID)</label>
                <p className="uuid-text">{userData?.id}</p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* INTEGRACIÓN CON TU CONFIRM MODAL */}
      <ConfirmModal 
        open={isModalOpen} // Sincronizado con tu prop 'open'
        onCancel={() => setIsModalOpen(false)} // Sincronizado con tu prop 'onCancel'
        onConfirm={handleUpdateExecution}
        loading={isUpdating} // Sincronizado con tu prop 'loading'
        title="¿Confirmar cambio de número?"
        description={`Esta operación tiene un costo de $${cost} USD. Tu nuevo número será +${selectedCountry?.dial}${phoneDigits}.`}
        confirmText="Confirmar Pago"
        cancelText="Volver"
      />

      <style jsx>{`
        .profile-page { min-height: 100vh; background: transparent; padding: 20px; }
        .profile-container { max-width: 800px; margin: 40px auto; display: flex; flex-direction: column; gap: 20px; }
        .animate-rise { animation: rise 0.5s ease-out; }
        @keyframes rise { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }

        .glass-card {
          background: rgba(18, 18, 18, 0.6);
          backdrop-filter: blur(15px);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 24px;
          padding: 35px;
          color: white;
          box-shadow: 0 10px 40px rgba(0,0,0,0.5);
        }


        .balance-panel h2 { 
    margin: 0; 
    font-size: 32px; 
    transition: all 0.5s ease; /* <--- Agrégalo aquí */
  }
        .header-flex { display: flex; align-items: center; gap: 20px; margin-bottom: 25px; }
        .avatar-box { position: relative; }
        .status-badge {
          position: absolute; bottom: 0; right: 0; background: #4ade80; color: #000;
          font-size: 9px; font-weight: 900; padding: 2px 6px; border-radius: 5px;
        }
        .label-top { color: #007cf0; font-size: 11px; font-weight: 800; letter-spacing: 1px; }
        h1 { margin: 0; font-size: 28px; }

        .balance-widget {
          background: rgba(255,255,255,0.03); border-radius: 18px; padding: 20px;
          display: flex; justify-content: space-between; align-items: center;
          border: 1px solid rgba(255,255,255,0.05);
        }
        .b-left { display: flex; align-items: center; gap: 10px; font-size: 11px; font-weight: bold; color: #666; }
        .icon-blue { color: #007cf0; font-size: 18px; }
        .b-right h2 { margin: 0; font-size: 32px; }
        .b-right small { color: #007cf0; font-size: 14px; }

        .card-title { font-size: 13px; color: #444; margin-bottom: 30px; display: flex; align-items: center; gap: 10px; }
        .data-row { display: flex; justify-content: space-between; align-items: center; }
        .data-info { display: flex; align-items: center; gap: 15px; }
        .icon-wrap {
          width: 44px; height: 44px; background: rgba(37, 211, 102, 0.1);
          border-radius: 12px; display: flex; align-items: center; justify-content: center; color: #25D366; font-size: 18px;
        }
        .icon-wrap.gray { background: rgba(255,255,255,0.05); color: #444; }
        label { font-size: 10px; font-weight: 800; color: #555; display: block; margin-bottom: 3px; }
        .data-info p { margin: 0; font-size: 17px; color: #ddd; }
        .uuid-text { font-family: monospace; font-size: 12px !important; color: #333 !important; }

        .btn-edit {
          background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1);
          color: white; padding: 8px 16px; border-radius: 10px; cursor: pointer; font-size: 13px;
        }

        .expand-form {
          margin-top: 25px; padding: 20px; background: rgba(0,0,0,0.2);
          border-radius: 20px; border: 1px dashed #333;
        }
        .cost-info { font-size: 13px; color: #007cf0; margin-bottom: 15px; display: flex; align-items: center; gap: 8px; }
        .input-group { display: flex; gap: 10px; margin-bottom: 20px; }
        .sel-container { background: #0a0a0a; border: 1px solid #222; border-radius: 10px; width: 110px; }
        .input-group input {
          flex: 1; background: #0a0a0a; border: 1px solid #222; border-radius: 10px;
          padding: 0 15px; color: white; outline: none; height: 44px;
        }

        .form-actions { display: flex; justify-content: flex-end; gap: 12px; }
        .btn-cancel { background: transparent; border: none; color: #555; cursor: pointer; font-weight: bold; }
        .btn-confirm-trigger {
          background: linear-gradient(90deg, #06B6D4, #10B981);
          color: #000; border: none; padding: 10px 20px; border-radius: 10px;
          font-weight: 800; cursor: pointer;
        }

        .status-msg { margin-top: 15px; text-align: center; font-size: 13px; padding: 8px; border-radius: 8px; }
        .status-msg.error { background: rgba(248,113,113,0.1); color: #f87171; }
        .status-msg.success { background: rgba(74,222,128,0.1); color: #4ade80; }
        .divider { height: 1px; background: rgba(255,255,255,0.05); margin: 25px 0; }
      `}</style>
    </div>
  );
}