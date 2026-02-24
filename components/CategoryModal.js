import { useState, useEffect } from 'react'
import ReactDOM from 'react-dom'
import { FaTimes } from 'react-icons/fa'

export default function CategoryModal({
  visible,
  onClose,
  onSubmit,
  category,
  setCategory,
  mode = 'create'
}) {
  const [mounted, setMounted] = useState(false)
  const [uploading, setUploading] = useState(false)

  const CLOUDINARY_UPLOAD_PRESET = 'streamingflux_unsigned'
  const CLOUDINARY_URL = 'https://api.cloudinary.com/v1_1/dgxzaeuaq/image/upload'

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (visible) {
      setCategory(prev => ({ ...prev, imageUrl: '' })) // 🧹 Limpia imagen al abrir
    }
  }, [visible])

  if (!mounted || !visible) return null

  const title = mode === 'create' ? '📝 Nueva categoría' : '✏️ Editar categoría'
  const submitLabel = mode === 'create' ? 'Crear' : 'Modificar'

const handleImageUpload = async (file) => {
  if (!file) return;

  // 1. Validar que sea una imagen estática (Bloquea Videos y GIFs)
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!allowedTypes.includes(file.type)) {
    alert("❌ Error: Solo se permiten imágenes estáticas (JPG, PNG, WEBP). Los GIFs y Videos no están permitidos.");
    return;
  }

  // 2. Validar el peso máximo (Ejemplo: 2MB)
  const maxSize = 2 * 1024 * 1024; // 2 Megabytes
  if (file.size > maxSize) {
    alert("❌ Error: La imagen es muy pesada. El máximo permitido es 2MB.");
    return;
  }

  setUploading(true);
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

  try {
    const res = await fetch(CLOUDINARY_URL, {
      method: 'POST',
      body: formData,
    });

    const data = await res.json();

    if (data.secure_url) {
      // Guardamos la URL en el estado de la categoría
      setCategory({ ...category, imageUrl: data.secure_url });
    } else {
      alert("Hubo un error al obtener la URL de la imagen.");
    }
  } catch (err) {
    console.error("Error subiendo imagen:", err);
    alert("Error de conexión al subir la imagen.");
  } finally {
    setUploading(false);
  }
};
    return ReactDOM.createPortal(
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        zIndex: 2147483647,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          boxShadow: '0 0 20px rgba(0,0,0,0.3)',
          width: '90%',
          maxWidth: '400px',
          maxHeight: '90vh',
          overflowY: 'auto',
          padding: '1.5rem',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}
      >
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '0.5rem',
            right: '0.5rem',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: '1.25rem'
          }}
        >
          <FaTimes />
        </button>

        <h2 style={{ marginBottom: '1rem', fontSize: '1.25rem', fontWeight: '600' }}>
          {title}
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <input
            type="text"
            placeholder="Nombre"
            value={category.name}
            onChange={e => setCategory({ ...category, name: e.target.value })}
            style={{
              padding: '0.5rem',
              border: '1px solid #ccc',
              borderRadius: '4px',
              fontSize: '1rem'
            }}
          />
          <input
            type="text"
            placeholder="Descripción"
            value={category.description}
            onChange={e => setCategory({ ...category, description: e.target.value })}
            style={{
              padding: '0.5rem',
              border: '1px solid #ccc',
              borderRadius: '4px',
              fontSize: '1rem'
            }}
          />
          <input
            type="file"
            accept="image/jpeg, image/png, image/webp"
            onChange={(e) => {
              const file = e.target.files[0]
              if (file) handleImageUpload(file)
            }}
            style={{
              padding: '0.5rem',
              border: '1px solid #ccc',
              borderRadius: '4px',
              fontSize: '1rem'
            }}
          />
          {uploading && <div style={{ fontSize: '0.9rem', color: '#555' }}>Subiendo imagen…</div>}
          {category.imageUrl && (
  <img
    src={category.imageUrl.includes('cloudinary.com') 
      ? category.imageUrl.replace('/upload/', '/upload/f_auto,q_auto,w_400/') 
      : category.imageUrl
    }
    alt="Preview"
    style={{ width: '100%', borderRadius: '6px', marginTop: '0.5rem' }}
  />
)}
        </div>

        <div style={{ marginTop: '1.25rem', textAlign: 'right' }}>
          <button
            onClick={onClose}
            style={{
              marginRight: '0.5rem',
              padding: '0.5rem 1rem',
              backgroundColor: '#e2e8f0',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Cancelar
          </button>
          <button
            onClick={onSubmit}
            disabled={uploading || !category.imageUrl}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: uploading || !category.imageUrl ? '#a0aec0' : '#3182ce',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: uploading || !category.imageUrl ? 'not-allowed' : 'pointer'
            }}
          >
            {submitLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}