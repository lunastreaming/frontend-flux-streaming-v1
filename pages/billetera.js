// pages/billetera.js
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/router';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import AddBalanceModal from '../components/AddBalanceModal';
import ConfirmModal from '../components/ConfirmModal';

export default function Billetera() {
  const router = useRouter();
  const [balance, setBalance] = useState(0);
  const [movimientos, setMovimientos] = useState([]);
  const [pending, setPending] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTargetId, setConfirmTargetId] = useState(null);
  const [confirmLoading, setConfirmLoading] = useState(false);

  const hasFetched = useRef(false);
  const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

  useEffect(() => {
    if (!router.isReady || hasFetched.current) return;
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    if (!token) {
      router.push('/login');
      return;
    }
    hasFetched.current = true;
    (async () => {
      try {
        await fetchMeAndPopulate(token);
        await fetchPendingRequests(token);
        await fetchUserTransactions(token);
      } catch (err) {
        console.error('Error inicial:', err);
        router.push('/login');
      }
    })();
  }, [router.isReady, router]);

  async function fetchMeAndPopulate(token) {
    const apiUrl = `${apiBase}/api/users/me`;
    const res = await fetch(apiUrl, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Token inválido o expirado');
    const data = await res.json();
    const monto = parseFloat(data.balance) || 0;
    setBalance(monto);

    if (Array.isArray(data.movements) && data.movements.length > 0) {
      setMovimientos(data.movements.map(m => ({
        id: m.id,
        date: m.createdAt || m.date || new Date().toISOString(),
        desc: m.description || m.desc || (m.type ? m.type : 'Movimiento'),
        amount: typeof m.amount === 'number' ? m.amount : parseFloat(m.amount || 0),
        currency: m.currency || 'PEN',
        status: m.status || 'unknown',
        approvedBy: m.approvedBy ? (m.approvedBy.username || m.approvedBy.id || m.approvedBy) : null,
      })));
    }
  }

  async function fetchUserTransactions(token) {
    const endpoint = `${apiBase}/api/wallet/user/transactions?status=complete`;
    const res = await fetch(endpoint, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    });

    if (res.status === 401) {
      router.push('/login');
      return;
    }

    if (!res.ok) {
      console.warn('No se pudieron obtener movimientos del servicio /user/transactions', res.status);
      return;
    }

    const data = await res.json();
    if (!Array.isArray(data)) {
      console.warn('/api/wallet/user/transactions devolvió formato inesperado', data);
      return;
    }

    const mapped = data.map(tx => ({
      id: tx.id,
      date: tx.approvedAt || tx.createdAt || new Date().toISOString(),
      desc: tx.description || tx.type || 'Transacción',
      amount: typeof tx.amount === 'number' ? tx.amount : parseFloat(tx.amount || 0),
      currency: tx.currency || 'PEN',
      status: tx.status || 'unknown',
      approvedBy: tx.approvedBy ? (tx.approvedBy.username || tx.approvedBy.id || tx.approvedBy) : null,
    }));

    const normalized = mapped.map(m => ({
      ...m,
      date: m.date ? new Date(m.date).toLocaleString() : '',
    }));

    setMovimientos(normalized);
  }

  async function fetchPendingRequests(token) {
    const endpoint = `${apiBase}/api/wallet/user/pending`;
    const res = await fetch(endpoint, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      if (res.status === 401) {
        router.push('/login');
      }
      setPending([]);
      return;
    }
    const data = await res.json();
    if (Array.isArray(data)) setPending(data);
    else if (Array.isArray(data.pending)) setPending(data.pending);
    else setPending([]);
  }

  const handleAddClick = () => setModalOpen(true);

  const handleAdd = async ({ amount, currency }) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    if (!token) throw new Error('No autorizado');

    const endpoint = `${apiBase}/api/wallet/recharge`;
    const payload = { amount, isSoles: currency === 'PEN' };

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    });

    if (res.status === 401) {
      router.push('/login');
      throw new Error('No autorizado');
    }
    if (!res.ok) {
      let msg = `Error ${res.status}`;
      try { const body = await res.json(); msg = body?.message || JSON.stringify(body); } catch (e) {}
      throw new Error(msg);
    }

    await fetchMeAndPopulate(token);
    await fetchPendingRequests(token);
    await fetchUserTransactions(token);
  };

  const openConfirmCancel = (id) => {
    setConfirmTargetId(id);
    setConfirmOpen(true);
  };

  const closeConfirm = () => {
    setConfirmTargetId(null);
    setConfirmOpen(false);
  };

  const confirmCancelPending = async () => {
    if (!confirmTargetId) { closeConfirm(); return; }

    setConfirmLoading(true);
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    if (!token) {
      setConfirmLoading(false);
      closeConfirm();
      router.push('/login');
      return;
    }

    try {
      const endpoint = `${apiBase}/api/wallet/cancel/pending/${encodeURIComponent(confirmTargetId)}`;
      const res = await fetch(endpoint, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });

      if (res.status === 401) { router.push('/login'); return; }
      if (!res.ok) {
        let msg = `Error ${res.status}`;
        try { const body = await res.json(); msg = body?.message || JSON.stringify(body); } catch (e) {}
        alert(`No se pudo cancelar la solicitud: ${msg}`);
        return;
      }

      await fetchPendingRequests(token);
      await fetchMeAndPopulate(token);
      await fetchUserTransactions(token);
    } catch (err) {
      console.error('Error cancelando solicitud pendiente:', err);
      alert('Error al cancelar la solicitud. Intenta nuevamente.');
    } finally {
      setConfirmLoading(false);
      closeConfirm();
    }
  };

  return (
    <>
      <Navbar />
      <main className="wallet-container">
        <section className="balance-card">
  <h2>Saldo disponible</h2>
  <div className="balance-row">
    <div className="balance-amount">${balance.toFixed(2)}</div>
    <button className="btn-add" onClick={handleAddClick}>Agregar saldo</button>
  </div>
</section>


        {pending.length > 0 && (
          <section className="pending-card">
            <h3>Solicitudes pendientes</h3>
            <ul className="pending-list">
              {pending.map((p) => (
                <li key={p.id || p.requestId || JSON.stringify(p)}>
                  <div className="pending-info">
                    <div className="pending-amt">{p.currency || 'PEN'} {Number(p.amount).toFixed(2)}</div>
                    <div className="pending-meta">
                      <div className="pending-desc">{p.description || 'Solicitud de recarga'}</div>
                      <div className="pending-date">{p.createdAt ? new Date(p.createdAt).toLocaleString() : ''}</div>
                    </div>
                  </div>
                  <div className="pending-actions">
                    <button className="btn-cancel" onClick={() => openConfirmCancel(p.id || p.requestId)} aria-label={`Eliminar solicitud ${p.id || p.requestId}`}>
                      Eliminar
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="movements-card">
          <h3>Movimientos</h3>

          {/* Movimientos con mismo diseño que solicitudes pendientes */}
          <ul className="pending-list movements-as-pending">
            {movimientos.length === 0 && <li className="empty">No hay movimientos</li>}
            {movimientos.map((m) => (
              <li key={m.id || JSON.stringify(m)}>
                <div className="pending-info">
                  <div className="pending-amt">{m.currency || 'PEN'} {Number(m.amount).toFixed(2)}</div>
                  <div className="pending-meta">
                    <div className="pending-desc">{m.desc}</div>
                    <div className="pending-date">{m.date}</div>
                  </div>
                </div>

                <div className="pending-actions">
                  <span className={`tx-badge ${m.status === 'approved' || m.status === 'complete' ? 'approved' : m.status === 'pending' ? 'pending' : 'rejected'}`}>
                    {m.status}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </main>

      <Footer />

      <AddBalanceModal open={modalOpen} onClose={() => setModalOpen(false)} onAdd={handleAdd} />

      <ConfirmModal
        open={confirmOpen}
        loading={confirmLoading}
        title="Confirmar cancelación"
        message="¿Deseas cancelar esta solicitud pendiente? Esta acción no podrá deshacerse."
        onCancel={closeConfirm}
        onConfirm={confirmCancelPending}
        confirmText="Sí, cancelar"
        cancelText="No, cerrar"
      />

      <style jsx>{`
        .wallet-container {
          min-height: 80vh;
          padding: 60px 24px;
          background: #0d0d0d;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 24px;
        }

        .balance-card,
        .movements-card,
        .pending-card {
          width: 100%;
          max-width: 680px;
          background: rgba(22, 22, 22, 0.6);
          border: 1px solid rgba(255, 255, 255, 0.08);
          backdrop-filter: blur(12px);
          border-radius: 16px;
          padding: 18px;
          box-shadow: 0 12px 24px rgba(0, 0, 0, 0.4);
          color: #f3f3f3;
        }

        .balance-card h2,
        .movements-card h3,
        .pending-card h3 {
          margin: 0 0 12px;
          font-weight: 700;
        }

        .balance-amount {
          font-size: 2.2rem;
          font-weight: 800;
          margin-bottom: 12px;
        }
        
        .balance-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}


        .btn-add {
          padding: 10px 16px;
          background: linear-gradient(135deg, #8b5cf6 0%, #22d3ee 100%);
          color: #0d0d0d;
          border: none;
          border-radius: 12px;
          font-weight: 700;
          cursor: pointer;
          transition: filter 0.2s ease;
        }
        .btn-add:hover { filter: brightness(1.05); }

        /* Pending list (shared for pendientes y movimientos) */
        .pending-list {
          list-style: none;
          margin: 0;
          padding: 0;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .pending-list li {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 10px;
          border-radius: 10px;
          background: rgba(10, 10, 10, 0.35);
          border: 1px solid rgba(255, 255, 255, 0.04);
        }
        .pending-list li.empty {
          justify-content: center;
          color: #9aa0a6;
        }

        .pending-info {
          display: flex;
          gap: 12px;
          align-items: center;
        }
        .pending-amt {
          font-weight: 800;
          color: #ffd166;
          min-width: 110px;
        }
        .pending-meta { color: #cfcfcf; font-size: 0.95rem; }
        .pending-desc { font-weight: 700; color: #e6e6e6; }
        .pending-date { color: #a6a6a6; font-size: 0.85rem; }

        .btn-cancel {
          padding: 8px 12px;
          border-radius: 10px;
          border: 1px solid rgba(255, 255, 255, 0.06);
          background: transparent;
          color: #ffdede;
          cursor: pointer;
          font-weight: 700;
        }
        .btn-cancel:hover { filter: brightness(0.95); }

        .pending-actions {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .tx-badge {
          padding: 6px 10px;
          border-radius: 999px;
          font-weight: 700;
          font-size: 0.75rem;
          color: #07101a;
        }
        .tx-badge.approved { background: linear-gradient(90deg,#bbf7d0,#34d399); color:#04261a; }
        .tx-badge.pending { background: linear-gradient(90deg,#fef3c7,#f59e0b); color:#3a2700; }
        .tx-badge.rejected { background: linear-gradient(90deg,#fecaca,#fb7185); color:#2b0404; }

        @media (max-width: 640px) {
          .balance-amount { font-size: 1.8rem; }
          .pending-amt { min-width: 90px; }
        }
      `}</style>
    </>
  );
}