// components/ProductModal.js
import { useState, useEffect, useRef } from 'react'
import ReactDOM from 'react-dom'
import { FaTimes, FaCloudUploadAlt } from 'react-icons/fa'

// Cloudinary config (ajusta si hace falta)
const CLOUDINARY_UPLOAD_PRESET = 'streamingflux_unsigned'
const CLOUDINARY_URL = 'https://api.cloudinary.com/v1_1/dgxzaeuaq/image/upload'

const initialForm = {
  name: '',
  categoryId: '',
  terms: '',
  productDetail: '',
  requestDetail: '',
  days: '',
  salePrice: '',
  renewalPrice: '',
  isRenewable: false,
  isOnRequest: false,
  imageUrl: ''
}

export default function ProductModal({ visible, onClose, onSuccess, initialData = null }) {
  const [mounted, setMounted] = useState(false)
  const [categories, setCategories] = useState([])
  const [form, setForm] = useState(initialForm)
  const [uploading, setUploading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const dropRef = useRef(null)

  useEffect(() => {
    setMounted(true)
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/categories`)
      .then(res => res.json())
      .then(setCategories)
      .catch(() => setCategories([]))
  }, [])

  useEffect(() => {
    if (!visible) {
      setForm(initialForm)
      setError(null)
      return
    }
    if (initialData) {
      setForm({
        name: initialData.name ?? '',
        categoryId: initialData.categoryId?.toString?.() ?? '',
        terms: initialData.terms ?? '',
        productDetail: initialData.productDetail ?? '',
        requestDetail: initialData.requestDetail ?? '',
        days: initialData.days ?? '',
        salePrice: initialData.salePrice != null ? String(initialData.salePrice) : '',
        renewalPrice: initialData.renewalPrice != null ? String(initialData.renewalPrice) : '',
        isRenewable: !!initialData.isRenewable,
        isOnRequest: !!initialData.isOnRequest,
        imageUrl: initialData.imageUrl ?? ''
      })
    } else {
      setForm(initialForm)
    }
  }, [visible, initialData])

  if (!mounted || !visible) return null

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
  }

  const handleDrop = async (e) => {
    e.preventDefault()
    e.stopPropagation()
    const file = e.dataTransfer?.files?.[0]
    if (file) await handleImageUpload(file)
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    e.stopPropagation()
  }

const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // --- VALIDACIÓN DE TIPOS ---
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      alert("Solo se permiten imágenes estáticas (JPG, PNG, WEBP). Los GIFs y Videos no están permitidos.");
      return;
    }

    // --- LLAMADA A LA FUNCIÓN DE CARGA ---
    // Agrega esta línea para que realmente suba el archivo seleccionado
    await handleImageUpload(file); 
  };

  const handleImageUpload = async (file) => {
    setUploading(true)
    setError(null)
    const formData = new FormData()
    formData.append('file', file)
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET)

    try {
      const res = await fetch(CLOUDINARY_URL, { method: 'POST', body: formData })
      const data = await res.json()
      if (data.secure_url) {
        setForm(prev => ({ ...prev, imageUrl: data.secure_url }))
      } else {
        throw new Error('No secure_url returned from Cloudinary')
      }
    } catch (err) {
      setError('Error subiendo imagen: ' + (err.message || err))
    } finally {
      setUploading(false)
    }
  }

  const toDecimal = (val) => {
    if (val === undefined || val === null || val === '') return null
    const f = parseFloat(String(val).replace(',', '.'))
    return Number.isNaN(f) ? null : Number(f.toFixed(2))
  }

  const toInteger = (val) => {
    if (val === undefined || val === null || val === '') return null
    const n = parseInt(String(val), 10)
    return Number.isNaN(n) ? null : n
  }

  const resetForm = () => setForm(initialForm)

const handleSubmit = async () => {
    try {
      setError(null);
      // Validaciones básicas de campos obligatorios
      if (!form.name || !form.categoryId || !form.salePrice) {
        setError('Nombre, categoría y precio de venta son obligatorios');
        return;
      }
      if (uploading) {
        setError('Espera a que la imagen termine de subirse');
        return;
      }

      setSubmitting(true);

      // Preparación del payload procesando tipos de datos
      const payload = {
        name: String(form.name).trim(),
        categoryId: toInteger(form.categoryId),
        terms: form.terms?.trim() || null,
        productDetail: form.productDetail?.trim() || null,
        requestDetail: form.requestDetail?.trim() || null,
        days: toInteger(form.days),
        salePrice: toDecimal(form.salePrice),
        renewalPrice: toDecimal(form.renewalPrice),
        isRenewable: !!form.isRenewable,
        isOnRequest: !!form.isOnRequest,
        imageUrl: form.imageUrl || null
      };

      // Limpieza de valores undefined para el envío JSON 
      const filteredPayload = Object.fromEntries(
        Object.entries(payload).map(([k, v]) => [k, v === undefined ? null : v])
      );

      const token = localStorage.getItem('accessToken');

      // LÓGICA DE ACTUALIZACIÓN (EDICIÓN)
      if (initialData && initialData.id) {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/products/${initialData.id}`, {
          method: 'PUT',
          headers: { 
            'Content-Type': 'application/json', 
            'Authorization': `Bearer ${token}` 
          },
          body: JSON.stringify(filteredPayload)
        });

        if (!res.ok) {
          const text = await res.text().catch(() => '');
          throw new Error(`Error ${res.status} ${text}`);
        }

        // Como el backend responde 204 (No Content), no intentamos hacer res.json()
        // En su lugar, combinamos los datos originales con los cambios del formulario
        const updatedLocally = {
          ...initialData,      // Mantiene campos que no están en el formulario (id, active, providerId, etc.)
          ...filteredPayload   // Sobrescribe con los nuevos valores editados
        };

        if (onSuccess) onSuccess(updatedLocally);
        resetForm();
        onClose();

      } else {
        // LÓGICA DE CREACIÓN (POST)
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/products`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json', 
            'Authorization': `Bearer ${token}` 
          },
          body: JSON.stringify(filteredPayload)
        });

        if (!res.ok) {
          const text = await res.text().catch(() => '');
          throw new Error(`Error ${res.status} ${text}`);
        }

        // El POST normalmente sí retorna el objeto creado (Status 201)
        const created = await res.json();
        if (onSuccess) onSuccess(created);
        resetForm();
        onClose();
      }
    } catch (err) {
      setError('Error al guardar producto: ' + (err.message || err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    resetForm()
    onClose()
  }

  const title = initialData && initialData.id ? 'Editar producto' : 'Nuevo producto'
  const submitLabel = initialData && initialData.id ? (submitting ? 'Guardando...' : 'Guardar cambios') : (submitting ? 'Creando...' : 'Crear producto')

  return ReactDOM.createPortal(
    <div style={styles.backdrop} role="dialog" aria-modal="true" aria-label={title}>
      <div style={styles.modalCard}>
        <header style={styles.header}>
          <h3 style={styles.title}>{title}</h3>
          <button onClick={handleClose} aria-label="Cerrar" style={styles.closeBtn}><FaTimes /></button>
        </header>

        {/* Contenido con scroll independiente y altura limitada */}
        <div style={styles.contentWrap}>
          <div style={styles.contentGrid}>
            {/* Left: formulario (orden restaurado) */}
            <form style={styles.form} onSubmit={(e) => { e.preventDefault(); handleSubmit() }}>
              <div style={styles.row}>
                <label style={styles.label}>Nombre</label>
                <input name="name" value={form.name} onChange={handleChange} style={styles.input} placeholder="Nombre del producto" />
              </div>

              <div style={styles.row}>
                <label style={styles.label}>Categoría</label>
                <select
                  name="categoryId"
                  value={form.categoryId}
                  onChange={handleChange}
                  style={styles.select}
                >
                  <option value="" disabled style={styles.optionDisabled}>Selecciona categoría</option>
                  {categories.map(cat => (
                    <option
                      key={cat.id}
                      value={cat.id}
                      style={styles.option}
                    >
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div style={styles.row}>
                <label style={styles.label}>Condiciones (terms)</label>
                <textarea name="terms" value={form.terms} onChange={handleChange} style={styles.textarea} placeholder="Condiciones de uso"></textarea>
              </div>

              <div style={styles.row}>
                <label style={styles.label}>Detalle del producto</label>
                <textarea name="productDetail" value={form.productDetail} onChange={handleChange} style={styles.textarea} placeholder="Descripción breve"></textarea>
              </div>

              <div style={styles.row}>
                <label style={styles.label}>Detalle de la solicitud</label>
                <textarea name="requestDetail" value={form.requestDetail} onChange={handleChange} style={styles.textarea} placeholder="Instrucciones para el proveedor"></textarea>
              </div>

              <div style={styles.grid2}>
                <div>
                  <label style={styles.label}>Días</label>
                  <input type="number" name="days" value={form.days} onChange={handleChange} style={styles.input} placeholder="Ej. 30" />
                </div>
                <div>
                  <label style={styles.label}>Precio venta (ej. 4.23)</label>
                  <input name="salePrice" value={form.salePrice} onChange={handleChange} style={styles.input} placeholder="4.23" inputMode="decimal" />
                </div>
              </div>

              <div style={styles.grid2}>
                <div>
                  <label style={styles.label}>Precio renovación</label>
                  <input name="renewalPrice" value={form.renewalPrice} onChange={handleChange} style={styles.input} placeholder="6.00" inputMode="decimal" />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <label style={styles.label}>Opciones</label>
                  <div style={styles.checkboxRow}>
                    <label style={styles.checkboxLabel}><input type="checkbox" name="isRenewable" checked={form.isRenewable} onChange={handleChange} /> Renovable</label>
                    <label style={styles.checkboxLabel}><input type="checkbox" name="isOnRequest" checked={form.isOnRequest} onChange={handleChange} /> A solicitud</label>
                  </div>
                </div>
              </div>

              {error && <div style={styles.error}>{error}</div>}
            </form>

            {/* Right: upload + preview */}
            <aside style={styles.preview}>
              <div
                ref={dropRef}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                style={styles.dropzone}
                aria-label="Área para subir imagen"
              >
                <div style={styles.dropInner}>
                  <FaCloudUploadAlt size={36} color="#6b7280" />
                  <div style={{ marginTop: 8, color: '#6b7280' }}>{uploading ? 'Subiendo imagen…' : 'Arrastra o selecciona una imagen'}</div>
                  <input type="file" onChange={handleFile} style={styles.fileInput} id="fileInput" accept="image/jpeg, image/png, image/webp" />
                </div>
              </div>

              {form.imageUrl ? (
                <div style={styles.previewBox}>
                  <img 
  src={form.imageUrl.includes('cloudinary.com') 
    ? form.imageUrl.replace('/upload/', '/upload/f_auto,q_auto,w_400/') 
    : form.imageUrl
  } 
  alt="Preview" 
  style={styles.previewImg} 
/>
                  <div style={styles.previewActions}>
                    <button type="button" onClick={() => setForm(prev => ({ ...prev, imageUrl: '' }))} style={styles.removeBtn}>Eliminar imagen</button>
                  </div>
                </div>
              ) : (
                <div style={styles.placeholder}>
                  <div style={{ color: '#9CA3AF' }}>Sin imagen</div>
                </div>
              )}

              <div style={styles.hint}>
                <strong>Consejo:</strong> usa imágenes cuadradas para mejor visualización (mín. 800×800).
              </div>
            </aside>
          </div>
        </div>

        {/* Footer fijo con botones siempre visibles */}
        <footer style={styles.footer}>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', width: '100%' }}>
            <button onClick={handleClose} style={styles.cancelBtn} disabled={submitting || uploading}>Cancelar</button>
            <button onClick={handleSubmit} style={styles.submitBtn(submitting || uploading)} disabled={submitting || uploading}>
              {submitting ? 'Procesando...' : submitLabel}
            </button>
          </div>
        </footer>

        {/* Estilos globales para opciones (mejora visibilidad en navegadores que respetan) */}
        <style>{`
          /* Forzar color de options en navegadores que lo permiten */
          select option { background: #071026 !important; color: #EDF2F7 !important; }
          select option[disabled] { color: #9CA3AF !important; }
        `}</style>
      </div>
    </div>,
    document.body
  )
}

/* ===== estilos (basados en PurchaseModal) ===== */
const styles = {
  backdrop: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(2,6,23,0.6)',
    zIndex: 2147483647,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20
  },
  modalCard: {
    width: '100%',
    maxWidth: 1100,
    background: 'linear-gradient(180deg, #071026 0%, #081426 100%)',
    color: '#EDF2F7',
    borderRadius: 12,
    boxShadow: '0 20px 60px rgba(2,6,23,0.7)',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    maxHeight: '90vh' // limita altura total del modal
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '14px 18px',
    borderBottom: '1px solid rgba(255,255,255,0.04)'
  },
  title: { margin: 0, fontSize: 18, fontWeight: 700 },
  closeBtn: {
    background: 'transparent',
    border: 'none',
    color: '#9CA3AF',
    fontSize: 18,
    cursor: 'pointer'
  },
  // contenido con scroll independiente
  contentWrap: {
    overflowY: 'auto',
    padding: 18,
    flex: '1 1 auto' // ocupa el espacio disponible entre header y footer
  },
  contentGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 380px',
    gap: 20
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12
  },
  row: { display: 'flex', flexDirection: 'column', gap: 8 },
  label: { fontSize: 13, color: '#9FB4C8', fontWeight: 700 },
  input: {
    padding: '10px 12px',
    borderRadius: 8,
    border: '1px solid rgba(255,255,255,0.06)',
    background: 'rgba(255,255,255,0.02)',
    color: '#E6EEF7',
    outline: 'none'
  },
  // select con fondo y color forzados para tema oscuro y flecha personalizada
  select: {
    padding: '10px 12px',
    borderRadius: 8,
    border: '1px solid rgba(255,255,255,0.06)',
    background: '#071026',
    color: '#E6EEF7',
    outline: 'none',
    appearance: 'none',
    WebkitAppearance: 'none',
    MozAppearance: 'none',
    backgroundImage: 'linear-gradient(45deg, transparent 50%, #9fb4c8 50%), linear-gradient(135deg, #9fb4c8 50%, transparent 50%)',
    backgroundPosition: 'calc(100% - 18px) calc(1em + 2px), calc(100% - 13px) calc(1em + 2px)',
    backgroundSize: '6px 6px, 6px 6px',
    backgroundRepeat: 'no-repeat',
    cursor: 'pointer'
  },
  option: {
    background: '#071026',
    color: '#EDF2F7'
  },
  optionDisabled: {
    color: '#9CA3AF'
  },
  textarea: {
    minHeight: 80,
    padding: 10,
    borderRadius: 8,
    border: '1px solid rgba(255,255,255,0.06)',
    background: 'rgba(255,255,255,0.02)',
    color: '#E6EEF7',
    resize: 'vertical'
  },
  grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },
  checkboxRow: { display: 'flex', gap: 12, alignItems: 'center' },
  checkboxLabel: { display: 'flex', gap: 8, alignItems: 'center', color: '#E6EEF7' },

  preview: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    alignItems: 'stretch'
  },
  dropzone: {
    borderRadius: 10,
    border: '1px dashed rgba(255,255,255,0.06)',
    padding: 18,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(180deg, rgba(255,255,255,0.01), rgba(255,255,255,0.00))',
    position: 'relative',
    minHeight: 120
  },
  dropInner: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, color: '#9CA3AF' },
  fileInput: { position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' },
  previewBox: { borderRadius: 8, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.04)' },
  previewImg: { width: '100%', height: 260, objectFit: 'cover', display: 'block' },
  previewActions: { display: 'flex', justifyContent: 'flex-end', padding: 8, gap: 8 },
  removeBtn: { padding: '8px 10px', borderRadius: 8, background: '#ef4444', color: '#fff', border: 'none', cursor: 'pointer' },
  placeholder: { height: 260, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px dashed rgba(255,255,255,0.04)', color: '#9CA3AF' },
  hint: { fontSize: 12, color: '#9CA3AF', marginTop: 6 },
  error: { color: '#fecaca', background: 'rgba(239,68,68,0.06)', padding: 10, borderRadius: 8 },

  // footer fijo
  footer: {
    borderTop: '1px solid rgba(255,255,255,0.04)',
    padding: '12px 18px',
    background: 'linear-gradient(180deg, rgba(255,255,255,0.01), rgba(255,255,255,0.00))',
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 10,
    flexShrink: 0
  },
  cancelBtn: {
    padding: '10px 14px',
    borderRadius: 8,
    background: '#e6eef7',
    color: '#081426',
    border: 'none',
    cursor: 'pointer'
  },
  submitBtn: (disabled) => ({
    padding: '10px 14px',
    borderRadius: 8,
    background: disabled ? 'linear-gradient(90deg,#94A3B8,#6B7280)' : 'linear-gradient(90deg,#06B6D4,#10B981)',
    color: disabled ? '#E6EEF7' : '#021018',
    border: 'none',
    cursor: disabled ? 'not-allowed' : 'pointer',
    fontWeight: 700
  })
}

/* Responsive tweak */
try {
  const mq = window?.matchMedia?.('(max-width: 900px)')
  if (mq && mq.matches) {
    styles.contentGrid.gridTemplateColumns = '1fr'
    styles.preview.previewImg = { ...styles.previewImg, height: 200 }
  }
} catch (e) {
  // ignore in SSR
}