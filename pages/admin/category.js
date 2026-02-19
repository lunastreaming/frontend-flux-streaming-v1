import { useEffect, useState } from 'react'
import AdminNavbar from '../../components/AdminNavBar'
import CategoryModal from '../../components/CategoryModal'
import ConfirmModal from '../../components/ConfirmModal'
import {
  FaPlus,
  FaExchangeAlt,
  FaEdit,
  FaTrashAlt
} from 'react-icons/fa'
import { useAuth } from '../../context/AuthProvider'

const BASE = process.env.NEXT_PUBLIC_API_URL

export default function CategoryPage() {
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newCategory, setNewCategory] = useState({ name: '', description: '', imageUrl: '' })
  const [showEditModal, setShowEditModal] = useState(false)
  const [editCategory, setEditCategory] = useState({ id: '', name: '', description: '', imageUrl: '' })
  const [confirmData, setConfirmData] = useState({ id: null, name: '', action: '', newStatus: '' })

  const { ensureValidAccess } = useAuth()

  useEffect(() => {
    fetchCategories()
  }, [])

  const fetchCategories = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${BASE}/api/categories`)
      if (!res.ok) throw new Error(await res.text())
      const data = await res.json()
      // Ya no ordenamos por ID, confiamos en el orden que viene del backend
      setCategories(data)
    } catch (err) {
      console.error('Error fetching categories:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateCategory = async () => {
    try {
      const res = await fetch(`${BASE}/api/categories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newCategory, status: 'inactive' })
      })
      if (!res.ok) throw new Error(await res.text())
      setShowCreateModal(false)
      setNewCategory({ name: '', description: '', imageUrl: '' })
      await fetchCategories()
    } catch (err) {
      console.error('Error creando categoría:', err)
    }
  }

  const handleReorder = async (newOrderedList) => {
    try {
      const ids = newOrderedList.map(cat => cat.id); // Extraemos solo los IDs [cite: 3]
      const res = await fetch(`${BASE}/api/categories/reorder`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ids) // Enviamos la lista de Integer/Long
      });
      if (!res.ok) throw new Error(await res.text());
      setCategories(newOrderedList); // Actualizamos estado local
    } catch (err) {
      console.error('Error al reordenar:', err);
      await fetchCategories(); // Si falla, revertimos al orden del servidor
    }
  };

  const moveCategory = (index, direction) => {
    const newList = [...categories];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;

    if (targetIndex < 0 || targetIndex >= newList.length) return;

    // Intercambio de posiciones
    const [movedItem] = newList.splice(index, 1);
    newList.splice(targetIndex, 0, movedItem);

    handleReorder(newList); // Guardar en base de datos
  };

  const handleUpdateCategory = async () => {
    try {
      const { id, name, description, imageUrl } = editCategory
      const res = await fetch(`${BASE}/api/categories/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description, imageUrl })
      })
      if (!res.ok) throw new Error(await res.text())
      setShowEditModal(false)
      await fetchCategories()
    } catch (err) {
      console.error('Error actualizando categoría:', err)
    }
  }

  const handleDeleteCategory = async (id) => {
    try {
      const res = await fetch(`${BASE}/api/categories/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error(await res.text())
      await fetchCategories()
    } catch (err) {
      console.error('Error al eliminar categoría:', err)
    }
  }

  const handleToggleStatus = async (id, newStatus) => {
    try {
      const url = `${BASE}/api/categories/${id}/status?status=${encodeURIComponent(newStatus)}`
      let token = null
      try {
        token = await ensureValidAccess()
      } catch (_) {
        token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null
      }
      const headers = { 'Content-Type': 'application/json' }
      if (token) headers['Authorization'] = `Bearer ${token}`
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 10000)
      const res = await fetch(url, { method: 'PATCH', headers, credentials: token ? 'omit' : 'include', signal: controller.signal })
      clearTimeout(timeout)
      if (!res.ok) throw new Error(await res.text())
      await fetchCategories()
    } catch (err) {
      console.error('Error al cambiar estado:', err)
    }
  }

  const confirmAction = () => {
    if (confirmData.action === 'delete') {
      handleDeleteCategory(confirmData.id)
    } else {
      handleToggleStatus(confirmData.id, confirmData.newStatus)
    }
    setConfirmData({ id: null, name: '', action: '', newStatus: '' })
  }

  const getOptimizedUrl = (url) => {
    if (!url || !url.includes('res.cloudinary.com')) return url
    return url.replace('/upload/', '/upload/f_auto,q_auto,w_150/')
  }

  const cancelAction = () => setConfirmData({ id: null, name: '', action: '', newStatus: '' })

  return (
    <>
      <div className="min-h-screen text-white font-inter">
        <AdminNavbar />

        <main className="px-6 py-10">
          <div className="header-row max-w-4xl mx-auto mb-6">
            <div className="left-meta">
              <div className="count-label">
                <span className="count-number">{categories.length}</span>
                <span className="count-text">categorías</span>
              </div>
            </div>
            <div className="right-actions">
              <button onClick={() => setShowCreateModal(true)} className="btn-primary">
                <FaPlus className="btn-icon" />
                <span className="btn-text">AGREGAR CATEGORÍA</span>
              </button>
            </div>
          </div>

          {loading ? (
            <div className="text-center text-gray-400 text-lg">Cargando categorías…</div>
          ) : (
            <div className="table-wrapper max-w-4xl mx-auto">
              <table>
                <thead>
                  <tr className="thead-row">
                    <th className="th">ID</th>
                    <th className="th">Imagen</th>
                    <th className="th">Nombre</th>
                    <th className="th">Descripción</th>
                    <th className="th">Estado</th>
                    <th className="th">Orden</th>
                    <th className="th">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {categories.map((cat, index) => {
                    const toggled = cat.status === 'active' ? 'inactive' : 'active'
                    return (
                      <tr key={cat.id} className="body-row">
                        <td className="td">{cat.id}</td>
                        <td className="td">
                          {cat.imageUrl ? (
                            <div className="img-wrap">
                              <img src={getOptimizedUrl(cat.imageUrl)} alt={cat.name} className="cat-img" />
                            </div>
                          ) : (
                            <span className="text-gray-400 italic">Sin imagen</span>
                          )}
                        </td>
                        <td className="td">{cat.name}</td>
                        <td className="td text-gray-300">{cat.description || '—'}</td>
                        <td className="td">
                          <span className={`status-badge ${cat.status === 'active' ? 'active' : 'inactive'}`}>
                            {cat.status}
                          </span>
                        </td>

                        <td className="td">
          <div className="flex flex-col items-center gap-1">
            <button 
              onClick={() => moveCategory(index, 'up')} 
              disabled={index === 0}
              className="btn-order"
              title="Subir"
            >
              <span className="text-[10px]">▲</span>
            </button>
            <button 
              onClick={() => moveCategory(index, 'down')} 
              disabled={index === categories.length - 1}
              className="btn-order"
              title="Bajar"
            >
              <span className="text-[10px]">▼</span>
            </button>
          </div>
        </td>
                        <td className="td">
                          <div className="actions">
                            <div className="action-col">
                              <button
                                onClick={() => setConfirmData({ id: cat.id, name: cat.name, action: 'toggle', newStatus: toggled })}
                                className="btn-action"
                              >
                                <FaExchangeAlt />
                              </button>
                              <span className="action-label">Cambiar</span>
                            </div>
                            <div className="action-col">
                              <button
                                onClick={() => {
                                  setEditCategory({ id: cat.id, name: cat.name, description: cat.description, imageUrl: cat.imageUrl })
                                  setShowEditModal(true)
                                }}
                                className="btn-edit"
                              >
                                <FaEdit />
                              </button>
                              <span className="action-label">Editar</span>
                            </div>
                            <div className="action-col">
                              <button
                                onClick={() => setConfirmData({ id: cat.id, name: cat.name, action: 'delete', newStatus: '' })}
                                className="btn-delete"
                              >
                                <FaTrashAlt />
                              </button>
                              <span className="action-label">Eliminar</span>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </main>
      </div>

      <CategoryModal visible={showCreateModal} onClose={() => setShowCreateModal(false)} onSubmit={handleCreateCategory} category={newCategory} setCategory={setNewCategory} mode="create" />
      <CategoryModal visible={showEditModal} onClose={() => setShowEditModal(false)} onSubmit={handleUpdateCategory} category={editCategory} setCategory={setEditCategory} mode="edit" />
      <ConfirmModal
        visible={confirmData.id !== null}
        title={confirmData.action === 'delete' ? 'Confirmar eliminación' : confirmData.newStatus === 'active' ? 'Confirmar publicación' : 'Confirmar desactivación'}
        message={confirmData.action === 'delete' ? `¿Seguro que quieres eliminar la categoría “${confirmData.name}”?` : `¿Cambiar estado de “${confirmData.name}” a "${confirmData.newStatus}"?`}
        confirmText={confirmData.action === 'delete' ? 'Eliminar' : confirmData.newStatus === 'active' ? 'Publicar' : 'Desactivar'}
        cancelText="Cancelar"
        onConfirm={confirmAction}
        onCancel={cancelAction}
      />

      <style jsx>{`
        .header-row { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 16px; }
        .left-meta { display: flex; align-items: center; gap: 12px; }
        .count-label { display: inline-flex; align-items: baseline; gap: 8px; background: rgba(255,255,255,0.03); padding: 8px 12px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.04); }
        .count-number { font-weight: 800; font-size: 1.15rem; color: #ffffff; }
        .count-text { font-size: 0.85rem; color: #cfcfcf; text-transform: lowercase; }
        .right-actions { display: flex; align-items: center; }

        .table-wrapper { 
          overflow-x: auto; 
          background: rgba(22,22,22,0.6); 
          border: 1px solid rgba(255,255,255,0.08); 
          backdrop-filter: blur(12px); 
          border-radius: 12px; 
          padding: 16px; 
          box-shadow: 0 12px 24px rgba(0,0,0,0.4);
          -webkit-overflow-scrolling: touch;
        }

        table { 
          width: 100%; 
          border-collapse: separate; 
          border-spacing: 0 12px; 
          color: #e1e1e1;
          min-width: 800px; /* Fuerza el scroll horizontal en móviles */
        }

        .thead-row { background: rgba(30,30,30,0.8); text-transform: uppercase; letter-spacing: 0.06em; color: #cfcfcf; font-size: 0.72rem; }
        .th { padding: 12px; text-align: center; font-weight: 600; }
        
        .body-row { background-color: rgba(22,22,22,0.6); transition: background 0.18s ease, transform 0.12s ease; }
        .body-row:hover { background-color: rgba(40,40,40,0.6); }
        
        .td { padding: 12px; text-align: center; font-size: 0.92rem; border-bottom: 1px solid rgba(255,255,255,0.03); vertical-align: middle; }

        .img-wrap { width: 80px; height: 50px; margin: 0 auto; overflow: hidden; border-radius: 8px; border: 1px solid rgba(255,255,255,0.06); }
        .cat-img { width: 100%; height: 100%; object-fit: contain; }

        .status-badge { display: inline-block; padding: 6px 10px; border-radius: 999px; font-size: 0.72rem; font-weight: 700; text-transform: lowercase; }
        .status-badge.active { background: rgba(34,197,94,0.12); color: #4ade80; }
        .status-badge.inactive { background: rgba(245,158,11,0.12); color: #f59e0b; }

        .actions { display: flex; gap: 12px; justify-content: center; align-items: center; }
        .action-col { display: flex; flex-direction: column; align-items: center; }
        .action-label { margin-top: 6px; font-size: 0.72rem; color: #cfcfcf; }

        .btn-action, .btn-edit, .btn-delete { 
          padding: 10px; border: none; border-radius: 10px; width: 40px; height: 40px; 
          display: inline-grid; place-items: center; cursor: pointer; transition: transform 0.12s ease; 
        }
        .btn-action { background: linear-gradient(135deg, #8b5cf6 0%, #22d3ee 100%); color: #0d0d0d; }
        .btn-edit { background: linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%); color: #0d0d0d; }
        .btn-delete { background: linear-gradient(135deg, #ef4444 0%, #f87171 100%); color: #fff; }
        
        .btn-primary { 
          display: inline-flex; align-items: center; gap: 10px; padding: 10px 16px; 
          background: linear-gradient(135deg, #06b6d4 0%, #8b5cf6 50%, #22c55e 100%); 
          color: #0d0d0d; border: none; border-radius: 12px; font-weight: 800; font-size: 0.85rem; 
          text-transform: uppercase; cursor: pointer; transition: transform 0.12s ease;
        }

        @media (max-width: 640px) {
          .btn-text { display: none; }
          .btn-primary { padding: 10px; }
          .action-label { display: none; }
          .header-row { margin-bottom: 20px; }
        }
          .btn-order {
  background: rgba(255,255,255,0.1);
  border: 1px solid rgba(255,255,255,0.1);
  color: white;
  border-radius: 4px;
  padding: 2px 8px;
  cursor: pointer;
  font-size: 0.6rem;
}
.btn-order:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}
.btn-order:hover:not(:disabled) {
  background: #8b5cf6;
}
      `}</style>
    </>
  )
}