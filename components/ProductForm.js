import { useState, useEffect } from 'react'

export default function ProductForm({ onCancel, onSuccess }) {
  const [form, setForm] = useState({
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
  })

  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetch('/api/categories')
      .then(res => res.json())
      .then(setCategories)
      .catch(() => setCategories([]))
  }, [])

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const token = localStorage.getItem('accessToken')
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(form)
      })

      if (!res.ok) {
        const errText = await res.text()
        throw new Error(errText || `Error ${res.status}`)
      }

      const created = await res.json()
      if (onSuccess) onSuccess(created)
    } catch (err) {
      setError(err.message || 'Error al crear el producto')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="form">
      <input name="name" placeholder="Nombre" value={form.name} onChange={handleChange} required />
      <select name="categoryId" value={form.categoryId} onChange={handleChange} required>
        <option value="">Selecciona categoría</option>
        {categories.map(cat => (
          <option key={cat.id} value={cat.id}>{cat.name}</option>
        ))}
      </select>
      <textarea name="terms" placeholder="Condiciones de uso" value={form.terms} onChange={handleChange} />
      <textarea name="productDetail" placeholder="Detalle del producto" value={form.productDetail} onChange={handleChange} />
      <textarea name="requestDetail" placeholder="Detalle de la solicitud" value={form.requestDetail} onChange={handleChange} />
      <input type="number" name="days" placeholder="Días" value={form.days} onChange={handleChange} />
      <input type="number" name="salePrice" placeholder="Precio de venta (centavos)" value={form.salePrice} onChange={handleChange} />
      <input type="number" name="renewalPrice" placeholder="Precio de renovación (centavos)" value={form.renewalPrice} onChange={handleChange} />
      <label>
        <input type="checkbox" name="isRenewable" checked={form.isRenewable} onChange={handleChange} /> Renovable
      </label>
      <label>
        <input type="checkbox" name="isOnRequest" checked={form.isOnRequest} onChange={handleChange} /> A solicitud
      </label>

      {error && <p style={{ color: 'tomato' }}>{error}</p>}

      <div>
        <button type="submit" disabled={loading}>
          {loading ? 'Guardando...' : 'Guardar'}
        </button>
        <button type="button" onClick={onCancel}>Cancelar</button>
      </div>
    </form>
  )
}