// pages/billetera.js
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/router';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import AddBalanceModal from '../components/AddBalanceModal';
import ConfirmModal from '../components/ConfirmModal';

export default function Billetera() {
  const router = useRouter();

  // ---- Hooks: siempre declarados en el mismo orden ----
  const [hasMounted, setHasMounted] = useState(false);
  const [token, setToken] = useState(null);

  // Estado y refs que antes causaban el problema al declararse después del early return
  const [balance, setBalance] = useState(null); // null = loading, number = loaded
  const [movimientos, setMovimientos] = useState([]); // store formatted items
  const [pending, setPending] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTargetId, setConfirmTargetId] = useState(null);
  const [confirmLoading, setConfirmLoading] = useState(false);

  const hasFetched = useRef(false);

  // BASE desde env (SSR-safe)
  const rawApiBase = process.env.NEXT_PUBLIC_API_URL;
  const apiBase = rawApiBase ? rawApiBase.replace(/\/+$/, '') : '';
  const buildUrl = (path) => `${apiBase}${path.startsWith('/') ? '' : '/'}${path}`;

  // ---- Effects ----
  useEffect(() => { setHasMounted(true); }, []);

  // leer token solo en cliente, después del montaje
  useEffect(() => {
    if (!hasMounted) return;
    try {
      const t = localStorage.getItem('accessToken');
      setToken(t);
      if (!t) router.replace('/login');
    } catch (e) {
      setToken(null);
      router.replace('/login');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasMounted]);

  // Fetch inicial: solo cuando estamos montados, router.ready y token presente
  useEffect(() => {
    if (!hasMounted || !router.isReady || hasFetched.current || !token) return;
    hasFetched.current = true;

    (async () => {
      try {
        await fetchMeAndPopulate(token);
        await fetchPendingRequests(token);
        await fetchUserTransactions(token);
      } catch (err) {
        console.error('Error inicial:', err);
        router.replace('/login');
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasMounted, router.isReady, token]);

  // ---- Fetchers (client-side) ----
  async function fetchMeAndPopulate(tokenVal) {
    const apiUrl = buildUrl('/api/users/me');
    const res = await fetch(apiUrl, {
      headers: { Authorization: `Bearer ${tokenVal}` },
    });
    if (!res.ok) throw new Error('Token inválido o expirado');
    const data = await res.json();
    const monto = Number.parseFloat(data.balance) || 0;
    setBalance(monto);

    const rawMov = Array.isArray(data.movements) ? data.movements : [];
    if (rawMov.length > 0) {
      const mapped = rawMov.map(m => ({
        id: m.id,
        dateRaw: m.createdAt || m.date || new Date().toISOString(),
        desc: m.description || m.desc || (m.type ? m.type : 'Movimiento'),
        amount: typeof m.amount === 'number' ? m.amount : Number.parseFloat(m.amount || 0),
        currency: m.currency || 'PEN',
        status: m.status || 'unknown',
        approvedBy: m.approvedBy ? (m.approvedBy.username || m.approvedBy.id || m.approvedBy) : null,
      }));
      const normalized = mapped.map(m => ({
        ...m,
        date: m.dateRaw ? new Date(m.dateRaw).toLocaleString() : '',
      }));
      setMovimientos(normalized);
    } else {
      setMovimientos([]);
    }
  }

  async function fetchUserTransactions(tokenVal) {
    const endpoint = buildUrl('/api/wallet/user/transactions?status=complete');
    const res = await fetch(endpoint, {
      headers: { Authorization: `Bearer ${tokenVal}`, Accept: 'application/json' },
    });

    if (res.status === 401) {
      router.replace('/login');
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
      dateRaw: tx.approvedAt || tx.createdAt || new Date().toISOString(),
      desc: tx.description || tx.type || 'Transacción',
      amount: typeof tx.amount === 'number' ? tx.amount : Number.parseFloat(tx.amount || 0),
      currency: tx.currency || 'PEN',
      status: tx.status || 'unknown',
      approvedBy: tx.approvedBy ? (tx.approvedBy.username || tx.approvedBy.id || tx.approvedBy) : null,
    }));

    const normalized = mapped.map(m => ({
      ...m,
      date: m.dateRaw ? new Date(m.dateRaw).toLocaleString() : '',
    }));

    setMovimientos(normalized);
  }

  async function fetchPendingRequests(tokenVal) {
    const endpoint = buildUrl('/api/wallet/user/pending');
    const res = await fetch(endpoint, {
      headers: { Authorization: `Bearer ${tokenVal}` },
    });
    if (!res.ok) {
      if (res.status === 401) {
        router.replace('/login');
      }
      setPending([]);
      return;
    }
    const data = await res.json();
    const list = Array.isArray(data) ? data : Array.isArray(data.pending) ? data.pending : [];
    const normalized = list.map(p => ({
      ...p,
      createdAtRaw: p.createdAt || p.created_at || null,
    }));
    const presented = normalized.map(p => ({
      ...p,
      createdAtFormatted: p.createdAtRaw ? new Date(p.createdAtRaw).toLocaleString() : '',
    }));
    setPending(presented);
  }

  // ---- Actions ----
  const handleAddClick = () => setModalOpen(true);

  const handleAdd = async ({ amount, currency }) => {
    const tokenVal = localStorage.getItem('accessToken');
    if (!tokenVal) throw new Error('No autorizado');

    const endpoint = buildUrl('/api/wallet/recharge');
    const payload = { amount, isSoles: currency === 'PEN' };

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenVal}` },
      body: JSON.stringify(payload),
    });

    if (res.status === 401) {
      router.replace('/login');
      throw new Error('No autorizado');
    }
    if (!res.ok) {
      let msg = `Error ${res.status}`;
      try { const body = await res.json(); msg = body?.message || JSON.stringify(body); } catch (e) {}
      throw new Error(msg);
    }

    await fetchMeAndPopulate(tokenVal);
    await fetchPendingRequests(tokenVal);
    await fetchUserTransactions(tokenVal);
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
    const tokenVal = localStorage.getItem('accessToken');
    if (!tokenVal) {
      setConfirmLoading(false);
      closeConfirm();
      router.replace('/login');
      return;
    }

    try {
      const endpoint = buildUrl(`/api/wallet/cancel/pending/${encodeURIComponent(confirmTargetId)}`);
      const res = await fetch(endpoint, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${tokenVal}`, 'Content-Type': 'application/json' },
      });

      if (res.status === 401) { router.replace('/login'); return; }
      if (!res.ok) {
        let msg = `Error ${res.status}`;
        try { const body = await res.json(); msg = body?.message || JSON.stringify(body); } catch (e) {}
        alert(`No se pudo cancelar la solicitud: ${msg}`);
        return;
      }

      await fetchPendingRequests(tokenVal);
      await fetchMeAndPopulate(tokenVal);
      await fetchUserTransactions(tokenVal);
    } catch (err) {
      console.error('Error cancelando solicitud pendiente:', err);
      alert('Error al cancelar la solicitud. Intenta nuevamente.');
    } finally {
      setConfirmLoading(false);
      closeConfirm();
    }
  };

  // helper: mostrar monto con dos decimales; balance null = loading
  const formatAmount = (v) => {
    if (v === null) return 'Cargando…';
    const n = Number(v);
    if (Number.isNaN(n)) return '—';
    return `$${n.toFixed(2)}`;
  };

  // ---- Render ----
  // Si aún no estamos montados devolvimos un placeholder idéntico en server y cliente
  if (!hasMounted) {
    return (
      <>
        <Navbar />
        <main className="wallet-container">
          <section className="balance-card">
            <h2>Saldo disponible</h2>
            <div className="balance-row">
              <div className="balance-amount">Cargando…</div>
              <button className="btn-add" disabled>Agregar saldo</button>
            </div>
          </section>
        </main>
        <Footer />
      </>
    );
  }

  // Si estamos montados pero token no existe, ya se solicitó redirección en useEffect; no renderizamos nada
  if (!token) return null;

  return (
    <>
      <Navbar />
      <main className="wallet-container">
        <section className="balance-card">
          <h2>Saldo disponible</h2>
          <div className="balance-row">
            <div className="balance-amount">{formatAmount(balance)}</div>
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
                    <div className="pending-amt">{p.currency || 'PEN'} {Number(p.amount || 0).toFixed(2)}</div>
                    <div className="pending-meta">
                      <div className="pending-desc">{p.description || 'Solicitud de recarga'}</div>
                      <div className="pending-date">{p.createdAtFormatted || ''}</div>
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

          <ul className="pending-list movements-as-pending">
            {movimientos.length === 0 && <li className="empty">No hay movimientos</li>}
            {movimientos.map((m) => (
              <li key={m.id || JSON.stringify(m)}>
                <div className="pending-info">
                  <div className="pending-amt">{m.currency || 'PEN'} {Number(m.amount).toFixed(2)}</div>
                  <div className="pending-meta">
                    <div className="pending-desc">{m.desc}</div>
                    <div className="pending-date">{m.date || ''}</div>
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
        .wallet-container { min-height: 80vh; padding: 60px 24px; background: #0d0d0d; display:flex; flex-direction:column; align-items:center; gap:24px; }
        .balance-card, .movements-card, .pending-card { width:100%; max-width:680px; background: rgba(22,22,22,0.6); border:1px solid rgba(255,255,255,0.08); backdrop-filter: blur(12px); border-radius:16px; padding:18px; box-shadow:0 12px 24px rgba(0,0,0,0.4); color:#f3f3f3; }
        .balance-card h2, .movements-card h3, .pending-card h3 { margin:0 0 12px; font-weight:700; }
        .balance-amount { font-size:2.2rem; font-weight:800; margin-bottom:12px; }
        .balance-row { display:flex; justify-content:space-between; align-items:center; gap:16px; flex-wrap:wrap; }
        .btn-add { padding:10px 16px; background: linear-gradient(135deg, #8b5cf6 0%, #22d3ee 100%); color:#0d0d0d; border:none; border-radius:12px; font-weight:700; cursor:pointer; transition:filter 0.2s ease; }
        .pending-list { list-style:none; margin:0; padding:0; display:flex; flex-direction:column; gap:10px; }
        .pending-list li { display:flex; align-items:center; justify-content:space-between; gap:12px; padding:10px; border-radius:10px; background: rgba(10,10,10,0.35); border:1px solid rgba(255,255,255,0.04); }
        .pending-info { display:flex; gap:12px; align-items:center; }
        .pending-amt { font-weight:800; color:#ffd166; min-width:110px; }
        .pending-meta { color:#cfcfcf; font-size:0.95rem; }
        .pending-desc { font-weight:700; color:#e6e6e6; }
        .pending-date { color:#a6a6a6; font-size:0.85rem; }
        .btn-cancel { padding:8px 12px; border-radius:10px; border:1px solid rgba(255,255,255,0.06); background:transparent; color:#ffdede; cursor:pointer; font-weight:700; }
        .tx-badge { padding:6px 10px; border-radius:999px; font-weight:700; font-size:0.75rem; color:#07101a; }
        .tx-badge.approved { background: linear-gradient(90deg,#bbf7d0,#34d399); color:#04261a; }
        .tx-badge.pending { background: linear-gradient(90deg,#fef3c7,#f59e0b); color:#3a2700; }
        .tx-badge.rejected { background: linear-gradient(90deg,#fecaca,#fb7185); color:#2b0404; }
        @media (max-width:640px) { .balance-amount{font-size:1.8rem} .pending-amt{min-width:90px} }
      `}</style>
    </>
  );
}