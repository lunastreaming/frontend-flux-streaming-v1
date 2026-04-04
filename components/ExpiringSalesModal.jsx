// components/ExpiringSalesModal.jsx
import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import { FaTimes, FaWhatsapp, FaSearch } from 'react-icons/fa';

export default function ExpiringSalesModal({ visible, onClose, token, BASE_URL }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (visible && token) {
      fetchExpiring();
    }
  }, [visible, token]);

  const fetchExpiring = async () => {
    setLoading(true);
    try {
      // Llamamos al endpoint con days=5 fijo
      const res = await fetch(`${BASE_URL}/api/stocks/provider/sales?days=5&size=50`, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' }
      });
      if (!res.ok) throw new Error('Error al cargar vencimientos');
      const payload = await res.json();
      setItems(Array.isArray(payload?.content) ? payload.content : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const computeDays = (endAt) => {
    if (!endAt) return 0;
    const diff = new Date(endAt).getTime() - new Date().getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const filtered = items.filter(it => 
    it.productName?.toLowerCase().includes(search.toLowerCase()) ||
    it.username?.toLowerCase().includes(search.toLowerCase()) ||
    it.buyerUsername?.toLowerCase().includes(search.toLowerCase())
  );

  if (!visible) return null;

  return ReactDOM.createPortal(
    <div style={styles.backdrop}>
      <div style={styles.modal}>
        <header style={styles.header}>
          <div>
            <h3 style={styles.title}>⏳ Próximos a Vencer (5 días)</h3>
            <p style={styles.subtitle}>Gestiona tus renovaciones pendientes</p>
          </div>
          <button onClick={onClose} style={styles.closeBtn}><FaTimes /></button>
        </header>

        <div style={styles.searchBox}>
           <FaSearch style={{color: '#9fb4c8', marginRight: 8}} />
           <input 
            placeholder="Filtrar en esta lista..." 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
            style={styles.searchInput}
           />
        </div>

        <div style={styles.tableWrapper} className="custom-scroll">
          {loading ? (
            <div style={styles.msg}>Cargando...</div>
          ) : filtered.length === 0 ? (
            <div style={styles.msg}>No hay ventas por vencer en los próximos 5 días.</div>
          ) : (
            <table style={styles.table}>
              <thead>
                <tr>
                  <th>Producto</th>
                  <th>Usuario</th>
                  <th>Vendedor</th>
                  <th>Vence en</th>
                  <th>Acción</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(r => {
                  const days = computeDays(r.endAt);
                  return (
                    <tr key={r.id} style={styles.tr}>
                      <td style={styles.td}>{r.productName}</td>
                      <td style={styles.td}>{r.username}</td>
                      <td style={styles.td}>{r.buyerUsername}</td>
                      <td style={styles.td}>
                        <span style={styles.pill(days)}>{days}d</span>
                      </td>
                      <td style={styles.td}>
                        {r.buyerUsernamePhone && (
                          <button 
                            onClick={() => {
                              const message = `Hola reseller ${r.buyerUsername} 👋🏻\n🍿Tu subscripcion a *${r.productName}*\n✉ usuario: ${r.username}\n🔐 Vence en : ${days} días\nAtentamente Proveedor.`;
                              window.open(`https://api.whatsapp.com/send?phone=${r.buyerUsernamePhone}&text=${encodeURIComponent(message)}`, '_blank');
                            }}
                            style={styles.waBtn}
                          >
                            <FaWhatsapp />
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
      <style>{`
        .custom-scroll::-webkit-scrollbar { width: 8px; }
        .custom-scroll::-webkit-scrollbar-thumb { background: #334155; border-radius: 4px; }
      `}</style>
    </div>,
    document.body
  );
}

const styles = {
  backdrop: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 },
  modal: { background: '#071026', width: '100%', maxWidth: '900px', maxHeight: '85vh', borderRadius: 16, display: 'flex', flexDirection: 'column', border: '1px solid rgba(255,255,255,0.1)' },
  header: { padding: '20px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  title: { margin: 0, fontSize: '1.2rem', color: '#fff' },
  subtitle: { margin: 0, fontSize: '0.8rem', color: '#9fb4c8' },
  closeBtn: { background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '1.2rem' },
  searchBox: { padding: '10px 20px', display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.02)' },
  searchInput: { background: 'none', border: 'none', color: '#fff', outline: 'none', flex: 1, fontSize: '0.9rem' },
  tableWrapper: { flex: 1, overflowY: 'auto', padding: '0 20px 20px 20px' },
  table: { width: '100%', borderCollapse: 'collapse', marginTop: 10 },
  td: { padding: '12px 8px', borderBottom: '1px solid rgba(255,255,255,0.05)', color: '#e2e8f0', fontSize: '0.9rem' },
  tr: { hover: { background: 'rgba(255,255,255,0.02)' } },
  pill: (d) => ({ padding: '4px 8px', borderRadius: 6, fontSize: '0.75rem', fontWeight: 'bold', background: d <= 1 ? '#ef4444' : '#f59e0b', color: '#fff' }),
  waBtn: { background: '#25D366', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: 6, cursor: 'pointer', fontSize: '1.1rem' },
  msg: { padding: 40, textAlign: 'center', color: '#9fb4c8' }
};