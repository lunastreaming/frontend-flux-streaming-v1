import Head from 'next/head'
import { useState, useRef, useEffect, useCallback } from 'react'
import Navbar from '../components/Navbar'
import Carrusel from '../components/Carrusel'
import Footer from '../components/Footer'
import PurchaseModal from '../components/PurchaseModal'
import { useAuth } from '../context/AuthProvider'

// DEFINE ESTO FUERA DE LA FUNCIÓN HOME (Arriba del todo o abajo del todo del archivo)
// --- UBICACIÓN: Después de los imports o al final del archivo ---
const PaginationControls = ({ currentPage, totalPages, setCurrentPage }) => {
  if (totalPages <= 1) return null;
  return (
    <div className="pagination-wrapper">
      <button 
        className="pagination-btn" 
        disabled={currentPage === 0} 
        onClick={() => { 
          setCurrentPage(prev => prev - 1); 
          window.scrollTo({ top: 400, behavior: 'smooth' }); 
        }}
      >
        Anterior
      </button>
      <span className="pagination-info">Página {currentPage + 1} de {totalPages}</span>
      <button 
        className="pagination-btn" 
        disabled={currentPage >= totalPages - 1} 
        onClick={() => { 
          setCurrentPage(prev => prev + 1); 
          window.scrollTo({ top: 400, behavior: 'smooth' }); 
        }}
      >
        Siguiente
      </button>
    </div>
  );
};

export default function Home() {
  const [imagenActiva, setImagenActiva] = useState(null)
  const [zoomActivo, setZoomActivo] = useState(false)
  const [zoomOrigin, setZoomOrigin] = useState({ x: '50%', y: '50%' })
  const mediaRef = useRef(null)

  // categorías
  const [categories, setCategories] = useState([])
  const [catLoading, setCatLoading] = useState(true)
  const [catError, setCatError] = useState(null)

  //Paginado

  // Dentro de Home()
const [currentPage, setCurrentPage] = useState(0);
const [searchTerm, setSearchTerm] = useState('');
const [totalPages, setTotalPages] = useState(0);
const PAGE_SIZE = 50;

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

  const getOptimizedUrl = (url, width = 600) => {
  if (!url || !url.includes('cloudinary.com')) return url;
  
  // Limpia cualquier transformación previa para evitar errores de duplicación
  const baseUrl = url.replace(/\/upload\/.*?\/(v\d+)/, '/upload/$1');

  const abrirModal = (url) => {
  // Aquí usamos 1000 para que la imagen se vea grande y nítida
  setImagenActiva(getOptimizedUrl(url, 1000))
  setZoomActivo(false)
}

  // f_auto: formato automático (WebP/AVIF)
  // q_auto: calidad automática
  // w_XXX: redimensión al ancho específico
  return baseUrl.replace('/upload/', `/upload/f_auto,q_auto,w_${width}/`);
};

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
  useEffect(() => {
  // Debounce: espera 400ms después de que el usuario deje de escribir
  const delayDebounceFn = setTimeout(() => {
    fetchProducts();
  }, 400);

  return () => clearTimeout(delayDebounceFn);
}, [searchTerm, currentPage, selectedCategory]);

async function fetchProducts() {
  setProdLoading(true);
  setProdError(null);
  
  try {
    // 1. Determinar el endpoint base (si hay categoría seleccionada o no) [cite: 21, 22]
    const baseEndpoint = selectedCategory
      ? `/api/categories/products/${selectedCategory}/active`
      : '/api/categories/products/active';
    
    // 2. Construir la URL con 'query' para búsqueda y parámetros de paginación [cite: 22, 23]
    const url = joinApi(`${baseEndpoint}?page=${currentPage}&size=${PAGE_SIZE}&query=${encodeURIComponent(searchTerm || '')}`);

    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    
    const data = await res.json();

    // 3. Extraer el array de resultados según la estructura de la respuesta (Paginada o Lista) [cite: 28, 29]
    let raw = [];
    if (Array.isArray(data)) {
      raw = data;
      setTotalPages(1);
    } else if (data?.content && Array.isArray(data.content)) {
      raw = data.content;
      setTotalPages(data.totalPages || 0);
    } else if (data?.items && Array.isArray(data.items)) {
      raw = data.items;
      setTotalPages(data.totalPages || 0);
    } else {
      raw = [];
      setTotalPages(0);
    }

    // 4. Normalización de los datos para el renderizado de las Cards [cite: 30, 31, 35, 36, 37, 38]
    const normalized = raw.map((item) => {
      const productWrapper = item.product ?? item;
      
      // Cálculo de stock disponible [cite: 31, 34]
      const availableStockCount = typeof item.availableStockCount === 'number'
        ? item.availableStockCount
        : (typeof productWrapper.availableStockCount === 'number' ? productWrapper.availableStockCount : 0);

      return {
        id: productWrapper.id,
        name: productWrapper.name,
        salePrice: productWrapper.salePrice,
        salePriceSoles: productWrapper.salePriceSoles,
        renewalPrice: productWrapper.renewalPrice,
        providerName: productWrapper.providerName,
        categoryId: productWrapper.categoryId,
        categoryName: productWrapper.categoryName,
        imageUrl: productWrapper.imageUrl,
        stock: Number(availableStockCount),
        fullProduct: productWrapper,
        isOnRequest: productWrapper.isOnRequest ?? false,
        isRenewable: productWrapper.isRenewable ?? false,
        providerStatus: productWrapper.providerStatus ?? null,
      };
    });

    setProducts(normalized);
  } catch (err) {
    console.error('Error cargando productos:', err);
    setProdError('No se pudieron cargar los productos');
    setProducts([]);
    setTotalPages(0);
  } finally {
    setProdLoading(false);
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
            {catLoading ? (
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
                          {cat.image ? (
  <img 
    src={getOptimizedUrl(cat.image, 200)} // <--- Aquí aplicas el helper
    alt={cat.name} 
    loading="lazy" 
  />
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
            {/* BUSCADOR CENTRALIZADO */}
          {/* BUSCADOR CON DISEÑO MEJORADO */}
<div className="search-container">
      <div className="search-wrapper">
        <div className="search-glass-effect"></div>
        <span className="search-icon-main">🔍</span>
        <input 
          type="text" 
          placeholder="Busca servicios, categorías o proveedores..." 
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setCurrentPage(0); // Reinicia a página 1 al buscar
          }}
          className="search-input-modern"
        />
      </div>
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

            {/* PAGINACIÓN SUPERIOR */}
          <PaginationControls 
  currentPage={currentPage} 
  totalPages={totalPages} 
  setCurrentPage={setCurrentPage} 
/>
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
                const isInactiveForRequest = p.isOnRequest && (p.providerStatus?.toLowerCase() === 'inactive');
                
                const categoryName = p.categoryName ?? categories.find(c => String(c.id) === String(p.categoryId))?.name ??
                  'Sin categoría'

                // --- Lógica del Botón de Compra ---
                let buttonText = 'Comprar';
                let buttonTitle = null; // Para el tooltip de inactivo
                let buttonClass = 'btn-primary';
                let buttonAction = () => handleBuyClick(p);
                let buttonDisabled = false;
                let showStockPill = hasStock;

                if (isInactiveForRequest) {
                    // 1. A Solicitud + Proveedor Inactivo (Botón Naranja Bloqueado con Tooltip)
                    buttonTitle = "No se puede comprar este producto porque el proveedor no se encuentra activo";
                    buttonAction = () => {}; 
                    buttonDisabled = true;
                    // Clase específica para el estilo naranja de botón inactivo
                    buttonClass += ' disabled-provider-inactive-btn'; 
                    showStockPill = false; 
                } else if (!p.isOnRequest && !hasStock) {
                    // 2. Entrega Inmediata + Sin Stock (Botón Rojo SIN STOCK)
                    buttonText = 'SIN STOCK';
                    buttonAction = () => {}; 
                    buttonDisabled = true;
                    buttonClass += ' out-stock disabled-sin-stock';
                    showStockPill = false;
                } else {
                    // 3. Compra Normal (En stock O A Solicitud con proveedor activo)
                    buttonClass += ' in-stock';
                    buttonDisabled = false;
                    // showStockPill se mantiene como 'hasStock'
                }
                // --- Fin Lógica del Botón de Compra ---


                return (
                  <article className="product-card" key={p.id}>
                    <div className={`stock-bar ${p.isOnRequest ? 'stock-request' : 'stock-normal'}`}>
                      <div className="stock-cat-name">{categoryName}</div>
                    </div>

                    <div className="product-media">
                      {p.imageUrl ? (
  <img 
    src={getOptimizedUrl(p.imageUrl, 500)} 
    alt={p.name} 
    loading="lazy" 
  />
) : (
  <div className="product-media placeholder" />
)}
                    </div>

                    <div className="product-body">
                      <div className="product-title marquee" title={p.name}>
                        <span>{p.name}</span>
                      </div>

                      {p.providerName && (
                       <div className="provider-name" title={p.providerName}>
                          {p.providerName}
                        </div>
                      )}

                      {/* 💡 AÑADIDO: Estado del Proveedor */}
                      {p.providerStatus && (
                        <div className={`provider-status-tag status-${p.providerStatus.toLowerCase()}`}>
                          {p.providerStatus.toLowerCase() === 'active' ? (
                            <>
                              <span className="status-emoji">😊</span> ACTIVO
                            </>
                          ) : (
                            <>
                              <span className="status-emoji">😴</span> DURMIENDO
                            </>
                          )}
                        </div>
                      )}
                      {/* 💡 FIN: Estado del Proveedor */}

                      <div className="price-wrapper dual-price">
  <div className="sale-price-container">
    {/* Precio en Dólares */}
    <div className="sale-price-badge usd">
      <span className="price-prefix">USD</span> {formatPrice(p.salePrice)} 
    </div>
    
    {/* Precio en Soles (Nuevo campo del backend) */}
    {p.salePriceSoles && (
      <div className="sale-price-badge pen">
        <span className="price-prefix">PEN</span> S/ {p.salePriceSoles}
      </div>
    )}
  </div>

  {/* Estado de Renovación */}
  <div className={`renewal-status-tag ${p.isRenewable ? 'is-renewable' : 'not-renewable'}`}>
    {p.isRenewable ? (
      <>
        <span className="renewal-prefix">RENOVABLE:</span> {formatPrice(p.renewalPrice)}
      </>
    ) : (
      <span>NO RENOVABLE</span> 
    )}
  </div>
</div>

                      {/* 💡 FIN: Nueva estructura de Precios y Renovación */}


                      <div className="product-actions">
                        {(buttonDisabled && buttonText === 'SIN STOCK') ? (
                            // SIN STOCK (Full width)
                            <button
                                className={buttonClass}
                                aria-disabled="true"
                                onClick={buttonAction}
                            >
                                {buttonText}
                            </button>
                        ) : (
                            // COMPRAR (Normal o Deshabilitado con Tooltip)
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 12 }}>
                                <button
                                    className={buttonClass}
                                    onClick={buttonAction}
                                    aria-disabled={buttonDisabled}
                                    // Tooltip al pasar el cursor
                                    title={buttonTitle || undefined} 
                                >
                                    <span className="btn-text">{buttonText}</span>
                                </button>
                                
                                {showStockPill && (
                                    <div className="stock-pill" aria-hidden>
                                        <span className="stock-icon">📦</span>
                                        <span className="stock-count-pill">{stockCount}</span>
                                    </div>
                                )}
                            </div>
                        )}
                      </div>
                    </div>
                  </article>
                )

              })}
              {/* PAGINACIÓN INFERIOR */}
          <PaginationControls 
  currentPage={currentPage} 
  totalPages={totalPages} 
  setCurrentPage={setCurrentPage} 
/>
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
              className={`modal-media ${zoomActivo ? 'modal-media--zoom' : ''}`}
              style={{ transformOrigin: `${zoomOrigin.x} ${zoomOrigin.y}` }}
              onClick={aplicarZoomFocalizado}
            />
            <div className="modal-text">Toca para ampliar</div>
          </div>
        </div>
      )}

      {selectedProduct && (
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
    /* CRUCIAL: Hacemos el fondo transparente para ver el fondo global */
    background-color: transparent;
color: #D1D1D1; min-height: 100vh;
  }
  .hero {
    max-width: 1200px; 
    /* 💡 CAMBIO: Reducir margen superior de 36px a 20px */
    margin: 20px auto 12px; 
    padding: 40px 28px;
border-radius: 16px;
    /* Glassmorphism */
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
/* Glassmorphism */
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
/* Cambio de diseño: Fondo semi-transparente */
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

  /* PRODUCT CARD (Glassmorphism) */
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
align-items:center; justify-content:center; overflow:hidden; position: relative; overflow: hidden;}
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

  /* INICIO: ESTILOS DE PRECIOS */
  
  .price-wrapper {
    display: flex;
flex-direction: column;
    align-items: center; 
    gap: 8px;
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
    white-space: nowrap;
    font-size: 1.1rem;
  }

  /* Prefijo VENTA: */
  .price-prefix {
    font-size: 0.8em;
    font-weight: 600;
    opacity: 0.9;
    margin-right: 4px;
    color: #fff;
  }

  /* Etiqueta de estado de renovación (Línea 2) */
  .renewal-status-tag {
    padding: 4px 10px;
border-radius: 6px;
    font-weight: 700;
    font-size: 0.85rem; 
    white-space: nowrap;
text-align: center;
    width: 100%; 
    max-width: 90%;
  }

  /* Prefijo RENOVABLE: */
  .renewal-prefix {
    font-size: 1em;
    font-weight: 700;
    margin-right: 4px;
}

  /* Estilo para productos Renovables (isRenewable: true) */
  .renewal-status-tag.is-renewable {
    background: rgba(49, 201, 80, 0.15);
    color: #31C950;
    border: 1px solid rgba(49, 201, 80, 0.3);
}

  /* Estilo para productos NO Renovables (isRenewable: false) */
  .renewal-status-tag.not-renewable {
    background: rgba(239, 68, 68, 0.15);
    color: #EF4444;
    border: 1px solid rgba(239, 68, 68, 0.3);
}

  /* FIN: ESTILOS DE PRECIOS */


  .provider-name {
    color: var(--muted); font-size: 0.88rem;
margin-top: 6px; margin-bottom: 6px; font-weight: 600;
text-overflow: ellipsis; white-space: nowrap; overflow: hidden; display: block; width: 100%; text-align: center;
}

  /* INICIO: ESTILOS PARA EL ESTADO DEL PROVEEDOR */
  .provider-status-tag {
    text-align: center;
    font-size: 0.8rem;
    font-weight: 700;
    padding: 4px 8px;
    border-radius: 6px;
    margin: 4px auto 8px; /* Espacio debajo del nombre del proveedor */
    width: fit-content;
    display: flex;
    align-items: center;
    gap: 4px;
  }
  
  .provider-status-tag.status-active {
    background: rgba(49, 201, 80, 0.15); /* Fondo verde tenue */
    color: #31C950; /* Texto verde */
    border: 1px solid rgba(49, 201, 80, 0.3);
  }
  
  /* 💡 CAMBIO: Color naranja/ámbar para el estado inactivo (Durmiendo) */
  .provider-status-tag.status-inactive {
    background: rgba(251, 191, 36, 0.15); /* Fondo naranja tenue (Amber 400) */
    color: #FBBF24; /* Texto naranja */
    border: 1px solid rgba(251, 191, 36, 0.3);
  }
  
  .status-emoji {
    font-size: 1em;
  }
  /* FIN: ESTILOS PARA EL ESTADO DEL PROVEEDOR */


  .product-actions { margin-top:auto; display:flex; gap:8px; align-items:center;
justify-content:center; }
  .btn-primary {
    background: linear-gradient(90deg,#06b6d4,var(--green-stock)); color: var(--accent-contrast);
border:none; padding:10px 12px; border-radius:8px; cursor:pointer; font-weight:700;
    display:inline-flex; align-items:center;
justify-content:center;
    min-height:44px; font-size:0.95rem;
  }
  .btn-primary[aria-disabled="true"] { opacity: 0.95; cursor: not-allowed;
}

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
  
  /* Botón deshabilitado por falta de stock (Rojo) */
  .btn-primary.out-stock[aria-disabled="true"],
  .btn-primary.out-stock.disabled-sin-stock {
    background: linear-gradient(90deg, rgba(239,68,68,0.98), rgba(239,68,68,0.9));
    color: #fff; border: none; opacity: 1;
    width: 100%; letter-spacing: 0.02em;
  }

  .price-soles-tag {
  position: absolute;
  left: 8px;
  top: 8px;
  background: rgba(16, 185, 129, 0.9); /* Un verde esmeralda semi-transparente */
  color: #fff;
  padding: 4px 8px;
  border-radius: 6px;
  font-weight: 800;
  font-size: 0.85rem;
  z-index: 10;
  box-shadow: 0 4px 10px rgba(0,0,0,0.3);
  backdrop-filter: blur(4px);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

  /* 💡 CAMBIO: Botón de COMPRAR deshabilitado por Proveedor Inactivo (Naranja/Ámbar) */
  .btn-primary.disabled-provider-inactive-btn[aria-disabled="true"] {
    /* Gradiente Naranja/Ámbar */
    background: linear-gradient(90deg, #F97316, #FBBF24); /* Naranja 600 a Ámbar 400 */
    color: #021018; /* Texto oscuro para alto contraste */
    border: none; 
    opacity: 1;
    cursor: not-allowed; 
    pointer-events: auto; /* Mantiene el cursor activo para el tooltip (title) */
    font-weight: 900;
  }
  /* Anular efecto hover para el estado inactivo */
  .btn-primary.disabled-provider-inactive-btn[aria-disabled="true"]:hover {
    transform: none;
    box-shadow: none;
  }
  /* FIN: NUEVO ESTILO */

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

/* Contenedor principal de precios */
.price-wrapper.dual-price {
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 100%;
  align-items: center;
}

/* Fila de los dos badges */
.sale-price-container {
  display: flex;
  gap: 6px;
  justify-content: center;
  flex-wrap: wrap; /* Para que en móviles muy pequeños no se corten */
}

/* Ajuste al badge existente  */
.sale-price-badge {
  padding: 4px 10px;
  border-radius: 8px; /* Un poco más cuadrado para optimizar espacio */
  font-weight: 800;
  font-size: 0.95rem; /* Reducimos ligeramente el tamaño para que quepan dos */
  display: flex;
  align-items: center;
  border: 1px solid rgba(255,255,255,0.1);
}

/* Diferenciación por colores sutiles */
.sale-price-badge.usd {
  background: rgba(6, 182, 212, 0.15); /* Cian tenue */
  color: #06b6d4;
}

.sale-price-badge.pen {
  /* Fondo púrpura muy suave */
  background: rgba(168, 85, 247, 0.15); 
  /* Texto Púrpura vibrante */
  color: #a855f7; 
  border: 1px solid rgba(168, 85, 247, 0.3);
}

.sale-price-badge.pen .price-prefix {
  background: #a855f7;
  color: #fff;
}
/* Prefijos (USD/PEN) */
.price-prefix {
  font-size: 0.65rem;
  margin-right: 5px;
  opacity: 0.8;
  letter-spacing: 0.05em;
  background: rgba(255,255,255,0.1);
  padding: 1px 4px;
  border-radius: 3px;
  color: #fff;
}

/* Reemplaza o añade esto en los estilos de index.txt */

.categories-container {
  overflow-x: auto;
  scrollbar-width: thin; /* Fallback para Firefox */
  scrollbar-color: #8b5cf6 transparent; /* Color para Firefox*/
}

/* Scrollbar para Chrome, Safari y Edge (Webkit) */
.categories-container::-webkit-scrollbar {
  height: 12px; /* Grosor definido en Products  */
}

.categories-container::-webkit-scrollbar-track {
  background: transparent; /* Fondo transparente*/
}

.categories-container::-webkit-scrollbar-thumb {
  /* Gradiente moderno: Cian -> Violeta -> Verde */
  background: linear-gradient(90deg, #06b6d4, #8b5cf6, #22c55e); 
  border-radius: 999px; /* Forma de píldora  */
  
  /* Borde sólido que genera el efecto de margen visual  */
  border: 3px solid rgba(22, 22, 22, 0.6); 
}

/* Efecto opcional para mejorar la interacción */
.categories-container::-webkit-scrollbar-thumb:hover {
  filter: brightness(1.1);
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

/* Estilos para el Buscador */
.search-container {
    display: flex;
    justify-content: center;
    align-items: center;
    margin: 40px 0;
    padding: 0 20px;
  }

  .search-wrapper {
    position: relative;
    width: 100%;
    max-width: 600px;
    display: flex;
    align-items: center;
    z-index: 1;
  }

  .search-glass-effect {
    position: absolute;
    inset: -1px;
    background: linear-gradient(90deg, var(--accent-1), #9333ea);
    border-radius: 16px;
    z-index: -1;
    opacity: 0.3;
    filter: blur(8px);
    transition: opacity 0.3s ease;
  }

  .search-wrapper:focus-within .search-glass-effect {
    opacity: 0.8;
    filter: blur(12px);
  }

  .search-input-modern {
    width: 100%;
    padding: 18px 50px 18px 55px;
    background: rgba(10, 10, 10, 0.8);
    backdrop-filter: blur(20px);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 15px;
    color: #fff;
    font-size: 1.1rem;
    font-family: 'Poppins', sans-serif;
    outline: none;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
  }

  .search-input-modern:focus {
    background: rgba(15, 15, 15, 0.9);
    border-color: rgba(255, 255, 255, 0.2);
    transform: translateY(-2px);
  }

  .search-icon-main {
    position: absolute;
    left: 20px;
    color: var(--accent-1);
    display: flex;
    align-items: center;
    pointer-events: none;
  }

  .search-clear {
    position: absolute;
    right: 15px;
    background: rgba(255, 255, 255, 0.1);
    border: none;
    color: #aaa;
    width: 28px;
    height: 28px;
    border-radius: 50%;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    transition: all 0.2s;
  }

  .search-clear:hover {
    background: var(--accent-1);
    color: #000;
  }

  /* Ajuste para móviles */
  @media (max-width: 480px) {
    .search-input-modern {
      font-size: 0.95rem;
      padding: 15px 45px 15px 45px;
    }
    .search-icon-main {
      left: 15px;
    }
  }

.search-input {
  width: 100%;
  max-width: 500px;
  padding: 12px 20px;
  background: rgba(13, 13, 13, 0.7);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 999px;
  color: #fff;
  font-family: 'Poppins', sans-serif;
  outline: none;
  transition: border-color 0.3s;
}

.search-input:focus {
  border-color: var(--accent-1);
}

/* Estilos para la Paginación */
.pagination-wrapper {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 15px;
  margin: 20px 0;
}

.pagination-btn {
  background: var(--bg-surface-strong);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: white;
  padding: 8px 16px;
  border-radius: 8px;
  cursor: pointer;
}

.pagination-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
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