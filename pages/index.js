// pages/index.js
import Head from 'next/head'
import { useState, useRef, useEffect } from 'react'
import Navbar from '../components/Navbar'
import Carrusel from '../components/Carrusel'
import Footer from '../components/Footer'

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
  const [selectedCategory, setSelectedCategory] = useState(null) // null = todos

  // refs para carrusel circular
  const stripRef = useRef(null)
  const isDragging = useRef(false)
  const dragStartX = useRef(0)
  const scrollStartX = useRef(0)
  const [hasOverflow, setHasOverflow] = useState(false)

  // BASE toma la variable de entorno NEXT_PUBLIC_API_URL en build/deployment.
  // Si no existe, mantiene el fallback local. Normaliza quitando slash final.
  const rawBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'
  const BASE = rawBase.replace(/\/+$/, '')

  // util: construye URL sin duplicar slashes
  const joinApi = (path) => `${BASE}${path.startsWith('/') ? '' : '/'}${path}`

  // Cerrar vista ampliada
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

  // Fetch categorías (endpoint público)
  useEffect(() => {
    let mounted = true
    const api = joinApi('/api/categories')

    async function load() {
      setCatLoading(true)
      setCatError(null)
      try {
        const res = await fetch(api, { method: 'GET' })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = await res.json()
        if (!mounted) return
        const normalized = Array.isArray(data)
          ? data.map((c, i) => ({
              id: c.id ?? c._id ?? i,
              name: c.name ?? c.title ?? 'Sin nombre',
              image: c.image ?? c.imageUrl ?? c.thumbnail ?? null,
              count: c.count ?? c.itemsCount ?? null,
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
    return () => {
      mounted = false
    }
  }, [BASE])

  // Fetch productos activos (todos) o por categoría
  useEffect(() => {
    fetchProducts()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCategory])

  async function fetchProducts() {
    setProdLoading(true)
    setProdError(null)
    try {
      const url = selectedCategory
        ? joinApi(`/api/categories/products/${selectedCategory}/active`)
        : joinApi('/api/categories/products/active')

      console.debug('[fetchProducts] URL =>', url)
      const res = await fetch(url, { method: 'GET' })
      if (!res.ok) {
        const txt = await res.text().catch(() => '')
        throw new Error(`HTTP ${res.status} ${txt}`)
      }

      const data = await res.json()
      console.debug('[fetchProducts] raw response =>', data)

      // Si backend devuelve Page<T> (Spring), extraer content
      let arr = []
      if (Array.isArray(data)) {
        arr = data
      } else if (Array.isArray(data?.content)) {
        arr = data.content
      } else if (Array.isArray(data?.items)) {
        arr = data.items
      } else if (Array.isArray(data?.rows)) {
        arr = data.rows
      } else {
        console.warn('[fetchProducts] respuesta no contiene array en content/items/rows', data)
        arr = []
      }

      const normalized = arr.map(p => ({
        id: p.id ?? p._id ?? p.uuid ?? null,
        name: p.name ?? p.title ?? 'Sin nombre',
        imageUrl: p.imageUrl ?? p.image ?? p.thumbnail ?? null,
        salePrice: p.salePrice ?? p.price ?? p.sale_price ?? null,
        categoryId: p.categoryId ?? p.category_id ?? null,
        productDetail: p.productDetail ?? p.product_detail ?? p.detail ?? null,
        terms: p.terms ?? null,
        requestDetail: p.requestDetail ?? p.request_detail ?? null,
        active: typeof p.active !== 'undefined' ? p.active : (p.isActive ?? true),
        publishStart: p.publishStart ?? p.publish_start ?? null,
        publishEnd: p.publishEnd ?? p.publish_end ?? null,
        daysPublished: p.daysRemaining ?? p.days_remaining ?? p.daysPublished ?? p.days_published ?? null
      }))

      console.debug('[fetchProducts] normalized count =>', normalized.length)
      setProducts(normalized)
    } catch (err) {
      console.error('Error cargando productos:', err)
      setProdError('No se pudieron cargar los productos')
      setProducts([])
    } finally {
      setProdLoading(false)
    }
  }

  // navegar / seleccionar categoría (acepta objeto o id)
  const goToCategory = (catOrId) => {
    if (!catOrId) {
      setSelectedCategory(null)
      setImagenActiva(null)
      return
    }

    const id = (typeof catOrId === 'object') ? (catOrId.id ?? catOrId._id ?? null) : catOrId
    const image = (typeof catOrId === 'object') ? (catOrId.image ?? null) : null

    console.debug('[goToCategory] selected id =>', id, 'image =>', image)
    setSelectedCategory(id)
    setImagenActiva(image || null)
  }

  // --- Carrusel circular drag handlers (unchanged) ---
  useEffect(() => {
    const el = stripRef.current
    if (!el) return

    const checkOverflow = () => {
      const overflow = el.scrollWidth > el.clientWidth + 1
      setHasOverflow(overflow)
      return overflow
    }

    let attached = false

    const attachIfNeeded = () => {
      const overflow = checkOverflow()
      if (!overflow && attached) {
        detach()
        return
      }
      if (overflow && !attached) attach()
    }

    const attach = () => {
      if (attached) return
      attached = true

      const onPointerDown = (e) => {
        if (!checkOverflow()) return
        isDragging.current = true
        dragStartX.current = e.clientX ?? (e.touches && e.touches[0]?.clientX)
        scrollStartX.current = el.scrollLeft
        el.classList.add('is-dragging')
      }

      const onPointerMove = (e) => {
        if (!isDragging.current) return
        const clientX = e.clientX ?? (e.touches && e.touches[0]?.clientX)
        const dx = dragStartX.current - clientX
        el.scrollLeft = scrollStartX.current + dx
      }

      const onPointerUp = () => {
        if (!isDragging.current) return
        isDragging.current = false
        el.classList.remove('is-dragging')
      }

      const onWheel = (e) => {
        if (!checkOverflow()) return
        if (Math.abs(e.deltaX) > 0 || e.shiftKey) return
        if (Math.abs(e.deltaY) > 0) {
          e.preventDefault()
          el.scrollLeft += e.deltaY
        }
      }

      el.addEventListener('mousedown', onPointerDown)
      window.addEventListener('mousemove', onPointerMove)
      window.addEventListener('mouseup', onPointerUp)

      el.addEventListener('touchstart', onPointerDown, { passive: true })
      el.addEventListener('touchmove', onPointerMove, { passive: false })
      el.addEventListener('touchend', onPointerUp)

      el.addEventListener('wheel', onWheel, { passive: false })

      el._cleanup = () => {
        el.removeEventListener('mousedown', onPointerDown)
        window.removeEventListener('mousemove', onPointerMove)
        window.removeEventListener('mouseup', onPointerUp)
        el.removeEventListener('touchstart', onPointerDown)
        el.removeEventListener('touchmove', onPointerMove)
        el.removeEventListener('touchend', onPointerUp)
        el.removeEventListener('wheel', onWheel)
      }
    }

    const detach = () => {
      if (!attached) return
      attached = false
      if (el._cleanup) el._cleanup()
      el.classList.remove('is-dragging')
    }

    attachIfNeeded()
    const ro = new ResizeObserver(attachIfNeeded)
    ro.observe(el)
    window.addEventListener('resize', attachIfNeeded)

    return () => {
      ro.disconnect()
      detach()
      window.removeEventListener('resize', attachIfNeeded)
    }
  }, [categories])

  const scrollByOffset = (dir = 1) => {
    const el = stripRef.current
    if (!el) return
    const offset = Math.round(el.clientWidth * 0.5) * dir
    el.scrollBy({ left: offset, behavior: 'smooth' })
  }

  const moneyFormatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
  const formatPrice = (valueInCentavos) => {
    if (valueInCentavos === null || valueInCentavos === undefined) return '—'
    const value = Number(valueInCentavos) / 100
    if (Number.isNaN(value)) return '—'
    return moneyFormatter.format(value)
  }
    return (
    <>
      <Head>
        <title>Luna Streaming</title>
        <link rel="icon" href="/logofavicon.ico" type="image/x-icon" />
        <meta name="description" content="Luna Streaming - Visuales ritualizados y experiencias simbólicas" />
      </Head>

      <Navbar />
      <Carrusel />

      <main className="page-root">
        <section className="hero">
          <h1 className="hero-title">Explora nuestras categorías</h1>
          <p className="hero-sub">Curaduría visual y ritmo ritualizado. Selecciona una categoría para descubrir contenidos.</p>
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
                  {/* "Todas" button */}
                  <button
                    key="circle-all"
                    className={`circle-item ${selectedCategory === null ? 'active-cat' : ''}`}
                    onClick={() => goToCategory(null)}
                    title="Ver todos los productos"
                    aria-label="Ver todos los productos"
                  >
                    <div className="circle-fallback">ALL</div>
                    <span className="circle-name">Todos</span>
                  </button>

                  {categories.map(cat => (
                    <button
                      key={`circle-${cat.id}`}
                      className={`circle-item ${selectedCategory === cat.id ? 'active-cat' : ''}`}
                      onClick={() => goToCategory(cat)}
                      title={cat.name}
                      aria-label={`Abrir ${cat.name}`}
                    >
                      {cat.image ? (
                        <img src={cat.image} alt={cat.name} loading="lazy" />
                      ) : (
                        <div className="circle-fallback">{(cat.name || '').slice(0,2).toUpperCase()}</div>
                      )}
                      <span className="circle-name">{cat.name}</span>
                    </button>
                  ))}
                </div>
                <div className="fade right" style={{ display: hasOverflow ? 'block' : 'none' }} />
                <button
                  className="subtle-arrow left"
                  onClick={() => scrollByOffset(-1)}
                  aria-hidden={!hasOverflow}
                  style={{ display: hasOverflow ? 'flex' : 'none' }}
                >
                  ‹
                </button>
                <button
                  className="subtle-arrow right"
                  onClick={() => scrollByOffset(1)}
                  aria-hidden={!hasOverflow}
                  style={{ display: hasOverflow ? 'flex' : 'none' }}
                >
                  ›
                </button>
              </div>
            )}
          </div>

          <div className="products-section">
            <div className="products-header">
              <h3>{selectedCategory ? `Productos en la categoría` : 'Todos los productos activos'}</h3>
              <p className="muted">{prodLoading ? 'Cargando productos...' : (prodError ? prodError : `${products.length} resultados`)}</p>
            </div>

            <div className="cards-grid">
              {prodLoading && Array.from({ length: 8 }).map((_, i) => (
                <article className="product-card skeleton" key={`psk-${i}`} />
              ))}

              {!prodLoading && products.length === 0 && !prodError && (
                <div className="empty">No hay productos activos.</div>
              )}

              {!prodLoading && products.map(p => (
                <article className="product-card" key={p.id}>
                  <div className="product-media">
                    {p.imageUrl ? (
                      <img src={p.imageUrl} alt={p.name} loading="lazy" />
                    ) : (
                      <div className="product-media placeholder" />
                    )}
                  </div>

                  <div className="product-body">
                    <div className="product-title" title={p.name}>{p.name}</div>
                    <div className="product-price">{formatPrice(p.salePrice)}</div>
                    <div className="product-actions">
                      <button className="btn-primary" onClick={() => { setImagenActiva(p.imageUrl || null) }}>
                        Ver imagen
                      </button>
                      <a className="btn-outline" href={`/products/${p.id}`}>
                        Ver
                      </a>
                    </div>
                  </div>
                </article>
              ))}
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

      <Footer />

      <style jsx>{`
        .page-root { background-color: #0D0D0D; color: #D1D1D1; min-height: 100vh; }

        .hero { max-width: 1200px; margin: 36px auto 12px; padding: 20px 28px; border-radius: 16px;
          background: linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01));
          display: flex; flex-direction: column; gap: 8px; box-shadow: 0 8px 30px rgba(0,0,0,0.5); }
        .hero-title { margin: 0; font-size: 1.8rem; font-weight: 800; }
        .hero-sub { margin: 0; color: #bfbfbf; }

        .categories-section { max-width: 1200px; margin: 20px auto 80px; padding: 18px 20px; border-radius: 14px; }
        .section-header { display: flex; justify-content: space-between; align-items: baseline; gap: 12px; margin-bottom: 12px; }
        .muted { color: #9a9a9a; font-size: 0.95rem; }

        /* circle strip */
        .circle-strip-wrapper { margin-bottom: 18px; position: relative; }
        .circle-strip-outer { position: relative; display:flex; align-items:center; gap:8px; }
        .circle-strip { display:flex; gap:16px; overflow-x:auto; overflow-y:hidden; padding:12px 8px 28px; -webkit-overflow-scrolling: touch; scroll-behavior: smooth; align-items:center; width:100%; scroll-snap-type: x proximity; }
        .circle-item { flex:0 0 auto; width:120px; height:120px; border-radius:999px; background: linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01)); border:1px solid rgba(255,255,255,0.04); display:flex; align-items:center; justify-content:center; position: relative; cursor:pointer; transition: transform .18s ease, box-shadow .18s ease; padding: 8px; scroll-snap-align:center; }
        .circle-item img { width:100%; height:100%; object-fit:cover; border-radius:999px; display:block; }
        .circle-fallback { width:100%; height:100%; border-radius:999px; display:flex; align-items:center; justify-content:center; font-weight:800; color:#fff; background: linear-gradient(90deg,#6b46c1,#06b6d4); }
        .circle-name { position:absolute; bottom:-26px; left:50%; transform:translateX(-50%); font-size:0.8rem; color:#bfbfbf; width:150px; text-align:center; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .circle-item.active-cat { box-shadow: 0 12px 30px rgba(11,58,110,0.18); transform: translateY(-4px); }

        .fade { position:absolute; top:0; bottom:20px; width:64px; pointer-events:none; z-index:2; }
        .fade.left { left:0; background: linear-gradient(90deg, rgba(13,13,13,1) 0%, rgba(13,13,13,0.0) 60%); }
        .fade.right { right:0; background: linear-gradient(270deg, rgba(13,13,13,1) 0%, rgba(13,13,13,0.0) 60%); }

        .subtle-arrow { position:absolute; top:50%; transform:translateY(-50%); width:34px; height:34px; border-radius:999px; background: rgba(255,255,255,0.03); color: rgba(255,255,255,0.75); display:inline-grid; place-items:center; border:1px solid rgba(255,255,255,0.04); cursor:pointer; z-index:3; transition: background .12s ease, transform .12s ease; font-size:20px; line-height:1; }
        .subtle-arrow.left { left:6px } .subtle-arrow.right { right:6px }
        .subtle-arrow:hover { background: rgba(255,255,255,0.06); transform: translateY(-50%) scale(1.03); }

        /* products section */
        .products-section { margin-top: 18px; }
        .products-header { display:flex; justify-content:space-between; align-items:baseline; gap:12px; margin-bottom:12px; }
        .cards-grid { display:grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 18px; }

        .product-card {
          background: linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01));
          border: 1px solid rgba(255,255,255,0.04);
          border-radius: 12px;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          transition: transform .18s ease, box-shadow .18s ease;
        }
        .product-card:hover { transform: translateY(-6px); box-shadow: 0 18px 40px rgba(0,0,0,0.5); }
        .product-card.skeleton { min-height: 220px; background: linear-gradient(90deg, rgba(255,255,255,0.02), rgba(255,255,255,0.03)); animation: shimmer 1.2s linear infinite; }
        .product-media { width:100%; aspect-ratio: 4/3; background: #0b0b0b; display:flex; align-items:center; justify-content:center; overflow:hidden; }
        .product-media img { width:100%; height:100%; object-fit:cover; display:block; }
        .product-media.placeholder { background: linear-gradient(135deg,#1f2937,#111827); min-height: 140px; }
        .product-body { padding: 12px; display:flex; flex-direction:column; gap:8px; flex:1; }
        .product-title { font-weight:800; color:#fff; font-size:1rem; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .product-price { color:#9ee7d9; font-weight:700; }
        .product-actions { margin-top:auto; display:flex; gap:8px; }
        .btn-primary { background: linear-gradient(90deg,#06b6d4,#10b981); color: #021018; border:none; padding:8px 10px; border-radius:8px; cursor:pointer; font-weight:700; text-decoration:none; display:inline-flex; align-items:center; justify-content:center; }
        .btn-outline { background: transparent; border:1px solid rgba(255,255,255,0.06); color:#E6EEF7; padding:8px 10px; border-radius:8px; text-decoration:none; display:inline-flex; align-items:center; justify-content:center; font-weight:700; }

        @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
        .empty { color: #9a9a9a; padding: 20px; text-align: center; }

        /* modal */
        .modal { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background-color: rgba(0,0,0,0.7); backdrop-filter: blur(8px); display:flex; justify-content:center; align-items:center; z-index: 999; cursor: pointer; }
        .modal-media { max-width: 90vw; max-height: 90vh; border-radius: 20px; box-shadow: 0 12px 24px rgba(0,0,0,0.3); filter: drop-shadow(0 0 20px #BFBFBF); transition: transform 0.4s ease; cursor: zoom-in; }
        .modal-media--zoom { transform: scale(3); cursor: zoom-out; }
        .modal-text { position: absolute; bottom: -60px; width: 100%; text-align: center; color: #D1D1D1; font-size: 1.2rem; font-weight: bold; text-shadow: 0 2px 4px rgba(0,0,0,0.5); }

        /* responsive */
        @media (max-width: 1100px) { .cards-grid { grid-template-columns: repeat(auto-fill, minmax(200px,1fr)); } }
        @media (max-width: 820px) { .cards-grid { grid-template-columns: repeat(auto-fill, minmax(160px,1fr)); } .circle-item { width:100px; height:100px; } .circle-name { bottom:-22px; width:120px; font-size:0.78rem; } }
        @media (max-width: 520px) { .cards-grid { grid-template-columns: 1fr; } .circle-item { width:84px; height:84px; } .circle-name { display:none; } .fade { display:none; } .subtle-arrow { display:none; } }
      `}</style>

      <style jsx global>{`
        body { background-color: #0D0D0D; margin: 0; padding: 0; font-family: 'Inter', sans-serif; color: #D1D1D; }
        html { box-sizing: border-box; } *, *:before, *:after { box-sizing: inherit; }
      `}</style>
    </>
  )
}