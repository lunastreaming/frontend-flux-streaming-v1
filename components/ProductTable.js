import { FaEdit, FaTrashAlt, FaCog } from 'react-icons/fa'

export default function ProductTable({ products }) {
  return (
    <div className="table-wrapper">
      <table>
        <thead>
          <tr className="thead-row">
            <th className="th">#</th>
            <th className="th">Stock</th>
            <th className="th">Nombre</th>
            <th className="th">Imagen</th>
            <th className="th">Info</th>
            <th className="th">Días</th>
            <th className="th">Venta</th>
            <th className="th">Renovación</th>
            <th className="th">Renovable</th>
            <th className="th">A solicitud</th>
            <th className="th">Publicado</th>
            <th className="th">Inicio</th>
            <th className="th">Fin</th>
            <th className="th">Días publicados</th>
            <th className="th">Config</th>
          </tr>
        </thead>
        <tbody>
          {products.map((p, i) => (
            <tr key={p.id} className="body-row">
              <td className="td">{i + 1}</td>
              <td className="td">{p.stock ?? '—'}</td>
              <td className="td">{p.name}</td>
              <td className="td">
                {p.imageUrl ? (
                  <div className="img-wrap">
                    <img src={p.imageUrl} alt={p.name} className="img" />
                  </div>
                ) : (
                  <span className="text-gray-400 italic">Sin imagen</span>
                )}
              </td>
              <td className="td">{p.productDetail || '—'}</td>
              <td className="td">{p.days}</td>
              <td className="td">{(p.salePrice / 100).toFixed(2)} S/</td>
              <td className="td">{(p.renewalPrice / 100).toFixed(2)} S/</td>
              <td className="td">
                <span className={`status-badge ${p.isRenewable ? 'active' : 'inactive'}`}>
                  {p.isRenewable ? 'Sí' : 'No'}
                </span>
              </td>
              <td className="td">
                <span className={`status-badge ${p.isOnRequest ? 'active' : 'inactive'}`}>
                  {p.isOnRequest ? 'Sí' : 'No'}
                </span>
              </td>
              <td className="td">
                <span className={`status-badge ${p.active ? 'active' : 'inactive'}`}>
                  {p.active ? 'Sí' : 'No'}
                </span>
              </td>
              <td className="td">{p.publishStart ?? '—'}</td>
              <td className="td">{p.publishEnd ?? '—'}</td>
              <td className="td">{p.daysPublished ?? '—'}</td>
              <td className="td">
                <div className="actions">
                  <button className="btn-edit" title="Editar">
                    <FaEdit />
                  </button>
                  <button className="btn-delete" title="Eliminar">
                    <FaTrashAlt />
                  </button>
                  <button className="btn-action" title="Configurar">
                    <FaCog />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <style jsx>{`
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
          border-collapse: separate;
          border-spacing: 0 12px;
          color: #e1e1e1;
          table-layout: fixed;
        }

        .thead-row,
        .body-row {
          display: grid;
          grid-template-columns: 40px 60px 1fr 100px 1.2fr 60px 80px 80px 90px 90px 90px 100px 100px 100px 120px;
          gap: 12px;
          align-items: center;
          padding: 10px;
        }

        .thead-row {
          background: rgba(30,30,30,0.8);
          text-transform: uppercase;
          letter-spacing: 0.06em;
          color: #cfcfcf;
          font-size: 0.72rem;
          border-radius: 10px;
          margin-bottom: 6px;
        }

        .body-row {
          background-color: rgba(22,22,22,0.6);
          border-radius: 12px;
          transition: background 0.18s ease, transform 0.12s ease;
          padding: 12px;
          margin-bottom: 12px;
          box-shadow: 0 6px 14px rgba(0,0,0,0.16) inset;
        }

        .body-row:hover {
          background-color: rgba(40,40,40,0.6);
          transform: translateY(-2px);
        }

        .td {
          padding: 6px 8px;
          text-align: center;
          font-size: 0.92rem;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .img-wrap {
          width: 80px;
          height: 56px;
          margin: 0 auto;
          overflow: hidden;
          border-radius: 8px;
          border: 1px solid rgba(255,255,255,0.06);
          box-shadow: 0 6px 14px rgba(0,0,0,0.35);
        }

        .img {
          width: 100%;
          height: 100%;
          object-fit: contain;
          display: block;
        }

        .status-badge {
          display: inline-block;
          padding: 6px 10px;
          border-radius: 999px;
          font-size: 0.72rem;
          font-weight: 700;
          text-transform: lowercase;
        }

        .status-badge.active {
          background: rgba(34,197,94,0.12);
          color: #4ade80;
        }

        .status-badge.inactive {
          background: rgba(245,158,11,0.12);
          color: #f59e0b;
        }

        .actions {
          display: flex;
          gap: 8px;
          justify-content: center;
        }

        .btn-action, .btn-edit, .btn-delete {
          padding: 8px;
          border-radius: 8px;
          width: 36px;
          height: 36px;
          display: grid;
          place-items: center;
          cursor: pointer;
          border: none;
        }

        .btn-action {
          background: linear-gradient(135deg, #06b6d4 0%, #8b5cf6 100%);
          color: #0d0d0d;
        }

        .btn-edit {
          background: linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%);
          color: #0d0d0d;
        }

        .btn-delete {
          background: linear-gradient(135deg, #ef4444 0%, #f87171 100%);
          color: #fff;
        }
      `}</style>
    </div>
  )
}