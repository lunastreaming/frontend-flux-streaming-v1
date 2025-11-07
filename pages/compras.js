import { useState } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

export default function Compras() {
  const [purchases] = useState([
    {
      id: 1,
      code: 'ABC123',
      name: 'Premium Plan',
      username: 'usuario1',
      password: '••••••••',
      url: 'https://servicio.example.com',
      numberProfile: '555-1234',
      pin: '4321',
      startDate: '2025-09-01',
      endDate: '2026-09-01',
      refund: '$0.00',
      customerName: 'Juan Pérez',
      customerPhone: '+51 987654321',
      description: 'Suscripción anual',
      supplier: 'Proveedor A',
      setting: '',
      resolved: false,
    },
    {
      id: 2,
      code: 'DEF456',
      name: 'Basic Plan',
      username: 'usuario2',
      password: '••••••••',
      url: 'https://otro.example.com',
      numberProfile: '555-5678',
      pin: '1234',
      startDate: '2025-07-15',
      endDate: '2025-10-15',
      refund: '$5.00',
      customerName: 'María Gómez',
      customerPhone: '+51 912345678',
      description: 'Promoción verano',
      supplier: 'Proveedor B',
      setting: '',
      resolved: true,
    },
  ]);

  const [viewResolved, setViewResolved] = useState(false);
  const displayed = purchases.filter(p => viewResolved ? p.resolved : !p.resolved);

  return (
    <div className="page-wrapper">
      <Navbar />

      <main className="container">
        <div className="controls">
          <h1>Compras</h1>
          <div className="btn-group">
            <button
              className={!viewResolved ? 'active' : ''}
              onClick={() => setViewResolved(false)}
            >
              Activas
            </button>
            <button
              className={viewResolved ? 'active' : ''}
              onClick={() => setViewResolved(true)}
            >
              Resueltos
            </button>
          </div>
        </div>

        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Id</th>
                <th>Code</th>
                <th>Name</th>
                <th>Username</th>
                <th>Password</th>
                <th>URL</th>
                <th>Number Profile</th>
                <th>Pin</th>
                <th>Start Date</th>
                <th>End Date</th>
                <th>Refund</th>
                <th>Customer Name</th>
                <th>Phone Customer</th>
                <th>Description</th>
                <th>Supplier</th>
                <th>Setting</th>
              </tr>
            </thead>
            <tbody>
              {displayed.map(p => (
                <tr key={p.id}>
                  <td>{p.id}</td>
                  <td>{p.code}</td>
                  <td>{p.name}</td>
                  <td>{p.username}</td>
                  <td>{p.password}</td>
                  <td><a href={p.url} target="_blank" rel="noreferrer">Link</a></td>
                  <td>{p.numberProfile}</td>
                  <td>{p.pin}</td>
                  <td>{p.startDate}</td>
                  <td>{p.endDate}</td>
                  <td>{p.refund}</td>
                  <td>{p.customerName}</td>
                  <td>{p.customerPhone}</td>
                  <td>{p.description}</td>
                  <td>{p.supplier}</td>
                  <td>
                    <button className="setting-btn">⚙️</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>

      <Footer />

      <style jsx>{`
        .page-wrapper {
          background: radial-gradient(circle at top, #1a1a1a, #0d0d0d);
          min-height: 100vh;
          width: 100%;
          margin: 0;
          padding: 0;
          overflow-x: hidden;
          display: flex;
          flex-direction: column;
        }

        .container {
          flex: 1;
          padding: 60px 24px;
        }

        .controls {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
        }
        .controls h1 {
          color: #f3f3f3;
          margin: 0;
        }
        .btn-group button {
          margin-left: 8px;
          padding: 8px 16px;
          background: rgba(46,46,46,0.6);
          border: 1px solid #2e2e2e;
          color: #d1d1d1;
          border-radius: 8px;
          cursor: pointer;
          transition: background 0.2s ease, color 0.2s ease;
        }
        .btn-group .active {
          background: linear-gradient(135deg, #8b5cf6 0%, #22d3ee 100%);
          color: #0d0d0d;
        }

        .table-wrapper {
          overflow-x: auto;
          background: rgba(22,22,22,0.6);
          border: 1px solid rgba(255,255,255,0.08);
          backdrop-filter: blur(12px);
          border-radius: 12px;
          padding: 16px;
          box-shadow: 0 12px 24px rgba(0,0,0,0.4);
        }
        table {
          width: 100%;
          border-collapse: collapse;
          color: #e1e1e1;
        }
        thead {
          background: rgba(30,30,30,0.8);
        }
        th, td {
          padding: 8px 12px;
          font-size: 0.85rem;
          text-align: left;
          border-bottom: 1px solid rgba(255,255,255,0.08);
        }
        tr:nth-child(even) {
          background: rgba(255,255,255,0.03);
        }
        a {
          color: #22d3ee;
          text-decoration: underline;
        }
        .setting-btn {
          background: transparent;
          border: none;
          cursor: pointer;
          font-size: 1rem;
          transition: transform 0.1s ease;
        }
        .setting-btn:hover {
          transform: scale(1.1);
        }

        @media (max-width: 768px) {
          .controls {
            flex-direction: column;
            align-items: flex-start;
          }
          .btn-group {
            margin-top: 12px;
          }
        }
      `}</style>
    </div>
  );
}