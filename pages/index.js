import Head from 'next/head'
import { useState, useRef, useEffect, useCallback } from 'react'
import Navbar from '../components/Navbar'
import Carrusel from '../components/Carrusel'
import Footer from '../components/Footer'
import PurchaseModal from '../components/PurchaseModal'
import { useAuth } from '../context/AuthProvider'

export default function Home() {
  const [imagenActiva, setImagenActiva] = useState(null)
  const [zoomActivo, setZoomActivo] = useState(false)
  const [zoomOrigin, setZoomOrigin] = useState({ x: '50%', y: '50%' })
  const mediaRef = useRef(null)

  // categorías
  const [categories, setCategories] = useState([])
  const [catLoading, setCatLoading] = useState(true)
  const [catError, setCatError] = useState(null)

  // productos
  const [products, setProducts] = useState([])
  const [prodLoading, setProdLoading] = useState(true)
  const [prodError, setProdError] = useState(null)
  const [selectedCategory, setSelectedCategory] = useState(null)

  // producto seleccionado y saldo del usuario
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [userBalance, setUserBalance] = useState(0)

  // refs carrusel
  const stripRef = useRef(null)
  const isDragging = useRef(false)
  const dragStartX = useRef(0)
  const scrollStartX = useRef(0)
  const [hasOverflow, setHasOverflow] = useState(false)

  // AuthProvider
  const { ensureValidAccess } = useAuth()

  // 🚨 CORRECCIÓN DE ERROR API: Usamos cadena vacía como fallback para usar rutas relativas /api/
  const rawBase = process.env.NEXT_PUBLIC_API_URL || '' 
  const BASE = rawBase.replace(/\/+$/, '')
  const joinApi = (path) => `${BASE}${path.startsWith('/') ? '' : '/'}${path}`

  // cargar saldo del usuario al montar
  useEffect(() => {
    async function loadUserBalance() {
      let token = null
      try {
        token = await ensureValidAccess()
      } catch {
        token = null
      }
      if (!token) {
        setUserBalance(0)
        return
      }

      try {
        const res = await fetch(joinApi('/api/users/me'), {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          }
        })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = await res.json()
        setUserBalance(data.balance ?? 0)
      } catch (err) {
        console.error('Error cargando saldo del usuario:', err)
        setUserBalance(0)
      }
    }
    loadUserBalance()
  }, [ensureValidAccess])

  // cerrar vista ampliada
  const cerrarVistaAmpliada = () => {
    setImagenActiva(null)
    setZoomActivo(false)
    setZoomOrigin({ x: '50%', y: '50%' })
  }

  const aplicarZoomFocalizado = (e) => {
    e.stopPropagation()
    if (!mediaRef.current) return
    if (zoomActivo) {
      setZoomActivo(false)
      setZoomOrigin({ x: '50%', y: '50%' })
    } else {
      const rect = mediaRef.current.getBoundingClientRect()
      const x = ((e.clientX - rect.left) / rect.width) * 100
      const y = ((e.clientY - rect.top) / rect.height) * 100
      setZoomOrigin({ x: `${x}%`, y: `${y}%` })

      setZoomActivo(true)
    }
  }

  // fetch categorías
  useEffect(() => {
    let mounted = true
    const api = joinApi('/api/categories')
    async function load() {
      setCatLoading(true)
      setCatError(null)
      try {
        const res = await fetch(api)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = await res.json()

        if (!mounted) return
        const normalized = Array.isArray(data)
          ? data.map((c, i) => ({
            id: c.id ?? c._id ?? i,
            name: c.name ?? c.title ?? 'Sin nombre',
            image: c.image ?? c.imageUrl ?? c.thumbnail ?? null,
            status: (c.status ?? c.state ?? c.active ?? null)
          }))
          : []
   
        const onlyActive = normalized.filter(c => {
          const s = (c.status ?? '').toString().toLowerCase()
          return s === 'active' || s === 'true' || s === 'enabled' || s === ''
        })
        onlyActive.sort((a, b) => (a.name || '').localeCompare(b.name || '', undefined, { numeric: true }))
        setCategories(onlyActive)

      } catch (err) {
     
        if (!mounted) return
        console.error('Error cargando categorías:', err)
        setCatError('No se pudieron cargar las categorías')
        setCategories([])
      } finally {
        if (mounted) setCatLoading(false)
      }
    }
    load()
    return () => { mounted = false }
  }, [BASE])

  // fetch productos (adaptado a ProductWithStockCountResponse)
  useEffect(() => { fetchProducts() }, [selectedCategory])
  async function fetchProducts() {
    setProdLoading(true)
    setProdError(null)
    try {
      const url = selectedCategory
        ? joinApi(`/api/categories/products/${selectedCategory}/active`)
        : joinApi('/api/categories/products/active')
      const res = await fetch(url)
      // 🚨 La línea que fallaba, ahora con la URL de destino correcta.
      if (!res.ok) throw new Error(`HTTP ${res.status}`) 
      const data = await res.json()

      let raw = []
      if (Array.isArray(data)) {
        raw = data
      } else if (Array.isArray(data?.content)) {
        raw = data.content
      } else if (Array.isArray(data?.items)) {
        raw = data.items
      } else if (Array.isArray(data?.rows)) {
       
        raw = data.rows
      } else {
        console.warn('[fetchProducts] respuesta no contiene array en content/items/rows', data)
        raw = []
      }

      // Normalizar respuesta nueva/antigua:
      const normalized = raw.map((item) => {
        // si viene la forma { product: {...}, availableStockCount: N }
        const productWrapper = item.product ?? item
        const availableStockCount = typeof item.availableStockCount === 'number'
          ? item.availableStockCount
          : (typeof productWrapper.availableStockCount === 'number' ? productWrapper.availableStockCount : null)

        // posible lista histórica de stockResponses
        const inlineStockResponses = Array.isArray(item.stockResponses)
          ? item.stockResponses
          : Array.isArray(productWrapper.stockResponses)
            ? productWrapper.stockResponses
            : (Array.isArray(productWrapper.stocks) ? productWrapper.stocks : [])

        const stockCount = availableStockCount != null
          ? Number(availableStockCount)
          : (Array.isArray(inlineStockResponses) ? inlineStockResponses.length : 0)

        return {
          id: productWrapper.id,
          name: productWrapper.name,
          salePrice: productWrapper.salePrice,
          renewalPrice: productWrapper.renewalPrice,
          providerName: productWrapper.providerName,
          categoryId: productWrapper.categoryId,

          
          categoryName: productWrapper.categoryName,
          imageUrl: productWrapper.imageUrl,
          // conservamos stockResponses por compatibilidad si existieran
          stockResponses: inlineStockResponses,
          // stock ahora proviene de availableStockCount cuando esté presente
          stock: stockCount,
          // <-- guardamos el objeto product completo para usar en el modal
          fullProduct: productWrapper,
          isOnRequest: productWrapper.isOnRequest ?? false,
          // 💡 NUEVO: Añadimos la propiedad isRenewable
          isRenewable: productWrapper.isRenewable ?? false 
        }
      })

      setProducts(normalized)
    } catch (err) {
      console.error('Error cargando productos:', err)
      setProdError('No se pudieron cargar los productos')
      setProducts([])
    } finally {
      setProdLoading(false)
    }
  }

  const moneyFormatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2

  
  })
  const formatPrice = (value) => {
    if (value === null || value === undefined) return '—'
    const num = Number(value)
    if (Number.isNaN(num)) return '—'
    return moneyFormatter.format(num)
  }

  const handleBuyClick = async (p) => {
    try {
      const token = await ensureValidAccess()
      if (!token) {
        window.location.href = '/login';
        return
      }
      // p es el objeto normalizado;
      const productToOpen = p?.fullProduct ?? p
      setSelectedProduct(productToOpen)
    } catch { window.location.href = '/login' }
  }

  // navegar / seleccionar categoría (acepta objeto o id)
  const goToCategory = (catOrId) => {
    if (!catOrId) {
      setSelectedCategory(null)
      return
    }

    const id = (typeof catOrId === 'object')
      ? (catOrId.id ?? catOrId._id ?? null)
      : catOrId

    console.debug('[goToCategory] selected id =>', id)
    setSelectedCategory(id)
  }

  return (
    <>
      <Head>
        <title>Luna Streaming</title>
        <link rel="icon" href="/logofavicon.ico" type="image/x-icon" />
        <meta name="description" content="Luna Streaming - Visuales ritualizados y experiencias simbólicas" />
        <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;800&display=swap" rel="stylesheet" />
      </Head>

      
      <Navbar />
      <Carrusel />

      <main className="page-root">
        <section className="hero">
          <h1 className="hero-title">Explora nuestras categorías</h1>
          <p className="hero-sub">Disfruta del mejor contenido digital. Selecciona una categoría para descubrir contenidos.</p>
        </section>

        <section className="categories-section">
          <div className="section-header">
            <h2>Categorías</h2>

  
           <p className="muted">{catLoading ? 'Cargando...' : (catError ? catError : `${categories.length} disponibles`)}</p>
          </div>

          <div className="circle-strip-wrapper" aria-hidden={catLoading}>
            {catLoading ?
(
                <div className="circle-strip skeleton-strip">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div className="circle-item skeleton" key={`skc-${i}`} />
                  ))}
                
</div>

              ) : (
                <div className="circle-strip-outer">
                  <div className="fade left" style={{ display: hasOverflow ? 'block' : 'none' }} />
                  <div className="circle-strip" ref={stripRef} role="list" tabIndex={0}>
                
    <div className="circle-item-wrap" role="listitem">

                      <button
                        key="circle-all"
                        className={`circle-item ${selectedCategory === null ? 'active-cat' : ''}`}
                 
        onClick={() => goToCategory(null)}

                        title="Ver todos los productos"
                        aria-label="Ver todos los productos"
                        aria-pressed={selectedCategory === null}
           
            >
                        <div className="circle-fallback">ALL</div>

                      </button>
                      <span className="circle-name">Todos</span>
                   
  </div>

                    {categories.map(cat => (
                      <div className="circle-item-wrap" role="listitem"
                        key={`wrap-${cat.id}`}>
                        <button
     
                       key={`circle-${cat.id}`}
                          className={`circle-item ${selectedCategory === cat.id ? 'active-cat' : ''}`}
                          onClick={() => goToCategory(cat)}
                          title={cat.name}
                          aria-label={`Abrir ${cat.name}`}

                 
          aria-pressed={selectedCategory === cat.id}
                        >
                          {cat.image ?
(
                              <img src={cat.image} alt={cat.name} loading="lazy" />
                            ) : (
                              <div className="circle-fallback">{(cat.name || '').slice(0, 2).toUpperCase()}</div>

  
                            )}
                        </button>
                        <span className="circle-name">{cat.name}</span>
                      </div>
   
                  ))}

                  </div>
                  <div className="fade right" style={{ display: hasOverflow ? 'block' : 'none' }} />
                  <button
                    className="subtle-arrow left"
                    onClick={() => stripRef.current && stripRef.current.scrollBy({ left: -200, behavior: 'smooth' })}
                    aria-hidden={!hasOverflow}

        
             style={{ display: hasOverflow ? 'flex' : 'none' }}
                  >
                    ‹
                  </button>
                  <button
                    className="subtle-arrow right"

  
                    onClick={() => stripRef.current && stripRef.current.scrollBy({ left: 200, behavior: 'smooth' })}
                    aria-hidden={!hasOverflow}
                    style={{ display: hasOverflow ? 'flex' : 'none' }}
                  >
                    ›
                  </button>
                </div>
              )}
          </div>

 
          <div
            className="products-section">
            <div className="products-header">
              <h3>{selectedCategory ? `Productos en la categoría` : 'Todos los productos activos'}</h3>
              <p className="muted">{prodLoading ? 'Cargando productos...' : (prodError ? prodError : `${products.length} resultados`)}</p>
            </div>
            <div className="legend">
              <div className="legend-item">
                <span className="legend-dot blue"></span>
                <span>A SOLICITUD</span>
              </div>
   
            <div className="legend-item">
                <span className="legend-dot emerald"></span>
                <span>ENTREGA INMEDIATA</span>
              </div>
            </div>
            <div className="cards-grid">
              
{prodLoading && Array.from({ length: 8 }).map((_, i) => (

                <article className="product-card skeleton" key={`psk-${i}`} />
              ))}

              {!prodLoading && products.length === 0 && !prodError && (
                <div className="empty">No hay productos activos.</div>
              )}

  
             {!prodLoading && products.map(p => {

                const stockCount = Number(p.stock ?? 0)
                const hasStock = stockCount > 0
                const categoryName = p.categoryName ?? categories.find(c => String(c.id) === String(p.categoryId))?.name ??
                  'Sin categoría'

                return (
                  <article className="product-card" key={p.id}>
                    <div className={`stock-bar ${p.isOnRequest ? 'stock-request' : 'stock-normal'}`}>
                      <div className="stock-cat-name">{categoryName}</div>
       
              </div>

                    <div className="product-media">
                      {p.imageUrl ? (
                        <img src={p.imageUrl} alt={p.name} loading="lazy" />
              
            ) : (
                        <div className="product-media placeholder" />
                      )}
                    </div>

                    <div 
className="product-body">
                      <div className="product-title marquee" title={p.name}>
                        <span>{p.name}</span>
                      </div>

                      {p.providerName && (

     
                       <div className="provider-name" title={p.providerName}>
                          {p.providerName}
                        </div>
                      )}

                      {/* 💡 INICIO: Nueva estructura de Precios y Renovación */}
                      <div className="price-wrapper">
                        {/* Línea 1: Precio de Venta (Centrado) */}
                        <div className="sale-price-badge">
                          <span className="price-prefix">VENTA:</span> {formatPrice(p.salePrice)}
                        </div>

                        {/* Línea 2: Estado de Renovación (Booleano) */}
                        <div className={`renewal-status-tag ${p.isRenewable ? 'is-renewable' : 'not-renewable'}`}>
                          {p.isRenewable ? (
                            <>
                              {/* Usamos RENOVABLE: y el precio si es renovable */}
                              <span className="renewal-prefix">RENOVABLE:</span> {formatPrice(p.renewalPrice)}
                            </>
                          ) : (
                            /* Si NO es renovable, solo mostramos el texto */
                            <span>NO RENOVABLE</span>
                          )}
                        </div>
                      </div>
                      {/* 💡 FIN: Nueva estructura de Precios y Renovación */}


                      <div className="product-actions">
                        {hasStock ?
(
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 12 }}>
                            <button
                              className={`btn-primary in-stock`}
       
                       onClick={() => handleBuyClick(p)}

                              aria-disabled="false"
                            >
                 
                          <span className="btn-text">Comprar</span>
                            </button>

                            <div className="stock-pill" aria-hidden>
                            
  <span className="stock-icon">📦</span>
                              <span className="stock-count-pill">{stockCount}</span>
                            </div>
                          </div>
            
             )
                          : (
                            <button
                              className="btn-primary out-stock disabled-sin-stock"
 
                              aria-disabled="true"
                              onClick={() => { }}
                            >
          
                          SIN STOCK
                            </button>
                          )}
                      </div>
   
                  </div>
                  </article>
                )

              })}
            </div>
          </div>
        </section>
     
  </main>

      {imagenActiva && (
        <div onClick={cerrarVistaAmpliada} className="modal">
          <div style={{ position: 'relative' }} onClick={(e) => e.stopPropagation()}>
            <img

              ref={mediaRef}
              src={imagenActiva}
              alt="Imagen"
          
     className={`modal-media ${zoomActivo ?
                'modal-media--zoom' : ''}`}
              style={{ transformOrigin: `${zoomOrigin.x} ${zoomOrigin.y}` }}
              onClick={aplicarZoomFocalizado}
            />
            <div className="modal-text">Toca para ampliar</div>
          </div>
        </div>
      )}

      {selectedProduct && 
(

        <PurchaseModal
          product={selectedProduct}
          balance={userBalance}
          onClose={() => setSelectedProduct(null)}
          onSuccess={() => { fetchProducts(); setSelectedProduct(null) }}
        />
      )}

      <Footer />

      <style jsx>{`
  :root{
    --bg-surface: rgba(255,255,255,0.02);
--bg-surface-strong: rgba(255,255,255,0.04);
    --muted: #bfbfbf;
    --accent-1: #06b6d4;
    --accent-2: #6b46c1;
    --accent-contrast: #021018;
    --glass-blur: 8px;
/* Variable para el blur */
    --shadow-subtle: 0 12px 30px rgba(2,6,23,0.45);
    --green-stock: #31C950;
    --green-stock-bg: rgba(49,201,80,0.08);
    --red-stock: #EF4444;
--red-stock-bg: rgba(239,68,68,0.08);
    --blue-buy: #0677f5;
    --red-buy: #ef4444;
  }

  /* barra superior de stock por tipo */
  .stock-request {
    background: rgba(59,130,246,0.15);
color: #3b82f6;
    border-bottom: 1px solid rgba(59,130,246,0.25);
  }
  .stock-normal {
    background: rgba(16,185,129,0.15);
    color: #10b981;
border-bottom: 1px solid rgba(16,185,129,0.25);
  }

  /* leyenda estados */
  .legend {
    display: flex;
    gap: 24px;
margin: 16px 0;
    font-size: 0.95rem;
    font-weight: 600;
    align-items: center;
    justify-content: center;
/* Centrar leyenda */
  }
  .legend-item {
    display: flex;
    align-items: center;
    gap: 8px;
/* Aplicar un fondo semi-transparente para que el fondo global se vea */
    background: rgba(255,255,255,0.08);
    backdrop-filter: blur(5px);
padding: 6px 12px;
    border-radius: 8px;
    box-shadow: 0 2px 6px rgba(0,0,0,0.2);
    border: 1px solid rgba(255,255,255,0.05);
/* Borde sutil */
  }
  .legend-dot {
    width: 14px;
    height: 14px;
    border-radius: 50%;
    display: inline-block;
}
  .legend-dot.blue { background-color: #3b82f6; }
  .legend-dot.emerald { background-color: #10b981;
}

  /* layout general */
  .page-root { 
    /* 🚨 CAMBIO DE DISEÑO: Hacemos el fondo transparente para ver el fondo global */
    background-color: transparent;
color: #D1D1D1; min-height: 100vh;
  }
  .hero {
    max-width: 1200px; margin: 36px auto 12px; padding: 40px 28px;
border-radius: 16px;
    /* 🚨 CAMBIO DE DISEÑO: Glassmorphism */
    background: rgba(13, 13, 13, 0.7); 
    backdrop-filter: blur(8px);
border: 1px solid rgba(255, 255, 255, 0.08);
    display: flex; flex-direction: column; gap: 8px; box-shadow: 0 8px 30px rgba(0,0,0,0.5);
}
  .hero-title { margin: 0; font-size: 1.8rem; font-weight: 800; font-family: 'Poppins', Inter, sans-serif; }
  .hero-sub { margin: 0;
color: #bfbfbf; font-family: Inter, sans-serif; }

  /* categorías */
  .categories-section { max-width: 1200px; margin: 20px auto 80px;
padding: 18px 20px; border-radius: 14px; }
  .section-header { display: flex; justify-content: space-between; align-items: baseline; gap: 12px; margin-bottom: 12px;
}
  .muted { color: var(--muted); font-size: 0.95rem; }

  .circle-strip-wrapper {
    margin-bottom: 18px; position: relative;
/* 🚨 CAMBIO DE DISEÑO: Glassmorphism */
    background: rgba(13, 13, 13, 0.7);
    backdrop-filter: blur(10px);
border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 14px; padding: 10px 12px; box-shadow: var(--shadow-subtle);
  }
  .circle-strip-outer { position: relative;
display: flex;
    align-items: center; gap: 8px; }
  .circle-strip {
    display: flex; gap: 16px; overflow-x: auto;
padding: 8px 6px 48px;
    -webkit-overflow-scrolling: touch; scroll-behavior: smooth; align-items: center; width: 100%;
    scroll-snap-type: x mandatory; scrollbar-width: thin; scrollbar-color: rgba(255,255,255,0.06) transparent;
}
  .circle-item-wrap { flex: 0 0 auto; width: 120px; display: flex; flex-direction: column; align-items: center; gap: 8px; scroll-snap-align: center;
}
  .circle-item {
    width: 120px; height: 120px; border-radius: 999px;
/* 🚨 Cambio de diseño: Fondo semi-transparente para que el fondo global se filtre */
    background: rgba(40, 40, 40, 0.6);
backdrop-filter: blur(5px);
    border: 1px solid rgba(255,255,255,0.08);
    display: inline-flex; align-items: center; justify-content: center;
    cursor: pointer;
transition: transform 240ms ease, box-shadow 240ms ease;
    -webkit-tap-highlight-color: transparent;
  }
  .circle-item:hover {
    transform: translateY(-4px);
}
  .circle-item.active-cat {
    border-color: var(--accent-1);
    box-shadow: 0 0 15px rgba(6, 182, 212, 0.5);
}
  .circle-item img { width: 100%; height: 100%; object-fit: cover; border-radius: 999px;
}
  .circle-fallback {
    width: 100%; height: 100%; border-radius: 999px; display: flex; align-items: center; justify-content: center;
font-weight: 800; color: #fff; background: linear-gradient(90deg, var(--accent-2), var(--accent-1));
  }
  .circle-name {
    font-family: 'Poppins', Inter, sans-serif;
font-weight: 600; font-size: 0.92rem; color: var(--muted);
    text-align: center; width: 160px; margin-top: 4px; overflow: hidden; text-overflow: ellipsis;
}

  /* productos */
  .products-section { margin-top: 18px; }
  .products-header { display:flex; justify-content:space-between; align-items:baseline; gap:12px; margin-bottom:12px;
}
  .cards-grid { display:grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 18px;
}

  /* 🚨 CAMBIO DE DISEÑO: PRODUCT CARD (Glassmorphism) */
  .product-card {
    /* Fondo semi-transparente */
    background: rgba(26, 26, 26, 0.5);
/* Efecto cristal */
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 12px;
    display: flex;
    flex-direction: column;
transition: transform .18s ease, box-shadow .18s ease;
  }
  .product-card:hover { transform: translateY(-6px); box-shadow: 0 18px 40px rgba(0,0,0,0.5);
}
  .product-card.skeleton {
    min-height: 220px; background: linear-gradient(90deg, rgba(255,255,255,0.02), rgba(255,255,255,0.03));
    animation: shimmer 1.2s linear infinite;
}

  .stock-bar {
    display:flex; align-items:center; justify-content: center;
    gap: 8px; padding: 8px 12px; font-weight: 800; font-size: 0.86rem;
text-transform: uppercase;
  }
  .stock-cat-name { flex: 1; text-align: center; }

  .product-media { width:100%; aspect-ratio: 4/3; background: #0b0b0b; display:flex;
align-items:center; justify-content:center; overflow:hidden; }
  .product-media img { width:100%; height:100%; object-fit:cover; }
  .product-media.placeholder { background: linear-gradient(135deg,#1f2937,#111827); min-height: 140px;
}

  .product-body { padding: 12px; display:flex; flex-direction:column; gap:8px; flex:1; }
  .product-title { font-weight:800; color:#fff; font-size:1rem; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;
}
  .product-title.marquee { height: 26px; overflow: hidden; position: relative; }
  .product-title.marquee span { display: inline-block; padding-left: 100%;
animation: marquee 8s linear infinite; white-space: nowrap; }
  @keyframes marquee { 0% { transform: translateX(0%);
} 100% { transform: translateX(-100%); } }

  /* 💡 INICIO: NUEVOS ESTILOS DE PRECIOS (Mejora: Venta Centrado + Etiqueta de Renovación) */
  
  .price-wrapper {
    display: flex;
    flex-direction: column;
    align-items: center; /* Centra todo el contenido (Venta y Renovación) */
    gap: 8px; /* Espacio entre el badge de venta y el tag de renovación */
    margin-top: 8px;
  }

  /* Estilo base para el badge de venta */
  .sale-price-badge {
    background: rgba(0,0,0,0.35); 
    padding: 6px 12px; 
    border-radius: 999px;
    color: #9ee7d9; 
    font-weight: 800;
    border: 1px solid rgba(255,255,255,0.04);
    white-space: nowrap; /* Evita que el precio salte de línea */
    font-size: 1.1rem; /* Ajuste para hacerlo más prominente */
  }

  /* Prefijo VENTA: (similar al anterior, pero asegurando el tamaño reducido) */
  .price-prefix {
    font-size: 0.8em; /* Relativo al tamaño del .sale-price-badge */
    font-weight: 600;
    opacity: 0.9;
    margin-right: 4px;
    color: #fff; /* Que el prefijo sea un poco más claro que el precio */
  }

  /* Etiqueta de estado de renovación (Línea 2) */
  .renewal-status-tag {
    padding: 4px 10px;
    border-radius: 6px;
    font-weight: 700;
    font-size: 0.85rem; /* Tamaño más pequeño que el precio de venta */
    white-space: nowrap;
    text-align: center;
    width: 100%; /* Ocupa el ancho completo para centrar mejor el texto */
    max-width: 90%; /* Limita un poco para que no se pegue tanto a los bordes */
  }

  /* Prefijo RENOVABLE: */
  .renewal-prefix {
    font-size: 1em; /* Mismo tamaño que el texto circundante */
    font-weight: 700;
    margin-right: 4px;
  }

  /* Estilo para productos Renovables (isRenewable: true) */
  .renewal-status-tag.is-renewable {
    background: rgba(49, 201, 80, 0.15); /* Fondo verde tenue */
    color: #31C950; /* Texto verde */
    border: 1px solid rgba(49, 201, 80, 0.3);
  }

  /* Estilo para productos NO Renovables (isRenewable: false) */
  .renewal-status-tag.not-renewable {
    background: rgba(239, 68, 68, 0.15); /* Fondo rojo tenue */
    color: #EF4444; /* Texto rojo */
    border: 1px solid rgba(239, 68, 68, 0.3);
  }

  /* 💡 FIN: NUEVOS ESTILOS DE PRECIOS */


  .provider-name {
    color: var(--muted); font-size: 0.88rem; margin-top: 6px; margin-bottom: 6px; font-weight: 600;
text-overflow: ellipsis; white-space: nowrap; overflow: hidden; display: block; width: 100%; text-align: center;
  }

  .product-actions { margin-top:auto; display:flex; gap:8px; align-items:center;
justify-content:center; }
  .btn-primary {
    background: linear-gradient(90deg,#06b6d4,var(--green-stock)); color: var(--accent-contrast);
    border:none; padding:10px 12px; border-radius:8px; cursor:pointer; font-weight:700;
    display:inline-flex; align-items:center;
justify-content:center;
    min-height:44px; font-size:0.95rem;
  }
  .btn-primary[aria-disabled="true"] { opacity: 0.95; cursor: not-allowed; }

.btn-primary.in-stock { 
    /* Gradiente Cian (#06B6D4) a Verde Esmeralda (#10B981) */
    background: linear-gradient(90deg, #06B6D4, #10B981);
    /* Color de texto oscuro para alto contraste (#021018) */
    color: #021018; 
    /* Mismo peso de fuente que el modal */
    font-weight: 900;
}
  .btn-primary.out-stock {
    background: linear-gradient(90deg, rgba(255,240,240,0.02), rgba(255,240,240,0.01));
    color: var(--red-stock); border:1px solid rgba(239,68,68,0.08);
}
  .btn-primary.out-stock[aria-disabled="true"],
  .btn-primary.out-stock.disabled-sin-stock {
    background: linear-gradient(90deg, rgba(239,68,68,0.98), rgba(239,68,68,0.9));
    color: #fff; border: none; opacity: 1;
width: 100%; letter-spacing: 0.02em;
  }

  .stock-pill {
    display: inline-flex; align-items: center; gap: 6px; padding: 6px 10px;
border-radius: 999px;
    background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.04);
    color: var(--muted); font-weight: 800;
  }
  .stock-pill .stock-icon { font-size: 14px;
}
  .stock-pill .stock-count-pill { font-weight: 900; color: #E6EEF7; }

  @keyframes shimmer { 0% { background-position: -200% 0;
} 100% { background-position: 200% 0; } }
  .empty { color: var(--muted); padding: 20px; text-align: center;
}

  /* modal */
  .modal {
    position: fixed; top: 0; left: 0; width: 100vw;
height: 100vh;
    background-color: rgba(0,0,0,0.7); backdrop-filter: blur(8px);
    display:flex; justify-content:center; align-items:center; z-index: 999; cursor: pointer;
}
  .modal-media {
    max-width: 90vw; max-height: 90vh; border-radius: 20px;
    box-shadow: 0 12px 24px rgba(0,0,0,0.3);
filter: drop-shadow(0 0 20px #BFBFBF);
    transition: transform 0.4s ease; cursor: zoom-in;
  }
  .modal-media--zoom { transform: scale(3); cursor: zoom-out;
}
  .modal-text {
    position: absolute; bottom: -60px; width: 100%; text-align: center;
    color: #D1D1D1; font-size: 1.2rem;
font-weight: bold; text-shadow: 0 2px 4px rgba(0,0,0,0.5);
  }

  /* breakpoints */
  @media (max-width: 1100px) {
    .cards-grid { grid-template-columns: repeat(auto-fill, minmax(200px,1fr));
}
  }

  @media (max-width: 820px) {
    .cards-grid { grid-template-columns: repeat(auto-fill, minmax(160px,1fr));
}
    .circle-item { width:100px; height:100px; }
    .circle-item-wrap { width:100px;
}
    .circle-name { width: 140px; font-size: 0.86rem; white-space: nowrap;
}
  }

  @media (max-width: 520px) {
    .hero-title { font-size: 1.4rem;
}
    .hero-sub { font-size: 0.9rem; }

    .legend { flex-direction: column; gap: 12px;
}

    .cards-grid { grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 12px; }

    .circle-item { width:84px; height:84px;
}
    .circle-item-wrap { width:84px; }
    .circle-name {
      width:120px; font-size:0.76rem;
white-space: normal;
      display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
    }
    .fade, .subtle-arrow { display:none;
}

    .product-actions { flex-direction: column; gap: 8px; align-items: stretch; }
    .stock-pill { justify-content: center;
}

    .modal-media { max-width: 100vw; max-height: 70vh; }
    .modal-text { font-size: 1rem; bottom: -48px;
}
  }

  @media (max-width: 400px) {
    .circle-item { width:72px; height:72px;
}
    .circle-item-wrap { width:72px; }
  }
`}</style>

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;800&display=swap');
body { 
          /* CRUCIAL para ver el fondo global (background.png) */
          background-color: transparent;
margin: 0; padding: 0; font-family: 'Inter', sans-serif; color: #D1D1D1;
        }
        .circle-name, .hero-title { font-family: 'Poppins', Inter, sans-serif;
}
        html { box-sizing: border-box; } *, *:before, *:after { box-sizing: inherit;
}
      `}</style>
    </>
  )
}