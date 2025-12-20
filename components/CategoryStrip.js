import { useRef, useEffect, useState } from 'react'

/**
 * Helper para optimizar imágenes de Cloudinary
 */
const getOptimizedUrl = (url, width = 200) => {
  if (!url || !url.includes('cloudinary.com')) return url;
  const baseUrl = url.replace(/\/upload\/.*?\/(v\d+)/, '/upload/$1');
  return baseUrl.replace('/upload/', `/upload/f_auto,q_auto,w_${width}/`);
};

export default function CategoryStrip({ categories, loading, selectedCategory, onSelectCategory }) {
  const stripRef = useRef(null);
  const [hasOverflow, setHasOverflow] = useState(false);

  // Detectar si el contenido desborda para mostrar las flechas
  useEffect(() => {
    const checkOverflow = () => {
      if (stripRef.current) {
        const { scrollWidth, clientWidth } = stripRef.current;
        setHasOverflow(scrollWidth > clientWidth);
      }
    };

    checkOverflow();
    window.addEventListener('resize', checkOverflow);
    return () => window.removeEventListener('resize', checkOverflow);
  }, [categories, loading]);

  const scroll = (direction) => {
    if (stripRef.current) {
      const scrollAmount = direction === 'left' ? -200 : 200;
      stripRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  return (
    <section className="categories-section">
      <div className="section-header">
        <h2>Categorías</h2>
        <p className="muted">
          {loading ? 'Cargando...' : `${categories.length} disponibles`}
        </p>
      </div>

      <div className="circle-strip-wrapper" aria-hidden={loading}>
        {loading ? (
          <div className="circle-strip skeleton-strip">
            {Array.from({ length: 6 }).map((_, i) => (
              <div className="circle-item skeleton" key={`skc-${i}`} />
            ))}
          </div>
        ) : (
          <div className="circle-strip-outer"> 
            {/* Flecha Izquierda*/}
            <button
              className="subtle-arrow left"
              onClick={() => scroll('left')}
              style={{ display: hasOverflow ? 'flex' : 'none' }}
            >
              ‹
            </button>

            <div className="circle-strip" ref={stripRef} role="list" tabIndex={0}>
              {/* Opción "Todos" */}
              <div className="circle-item-wrap" role="listitem">
                <button
                  className={`circle-item ${selectedCategory === null ? 'active-cat' : ''}`}
                  onClick={() => onSelectCategory(null)}
                >
                  <div className="circle-fallback">ALL</div>
                </button>
                <span className="circle-name">Todos</span>
              </div>

              {/* Mapeo de Categorías*/}
              {categories.map((cat) => (
                <div className="circle-item-wrap" role="listitem" key={`wrap-${cat.id}`}>
                  <button
                    className={`circle-item ${selectedCategory === cat.id ? 'active-cat' : ''}`}
                    onClick={() => onSelectCategory(cat)}
                    title={cat.name}
                  >
                    {cat.image ? (
                      <img 
                        src={getOptimizedUrl(cat.image, 200)}
                        alt={cat.name} 
                        loading="lazy" 
                      />
                    ) : (
                      <div className="circle-fallback">
                        {(cat.name || '').slice(0, 2).toUpperCase()}
                      </div>
                    )}
                  </button>
                  <span className="circle-name">{cat.name}</span>
                </div>
              ))}
            </div>

            {/* Flecha Derecha */}
            <button
              className="subtle-arrow right"
              onClick={() => scroll('right')}
              style={{ display: hasOverflow ? 'flex' : 'none' }}
            >
              ›
            </button>
          </div>
        )}
      </div>

      <style jsx>{`
        .categories-section { max-width: 1200px; margin: 20px auto 30px; padding: 18px 20px; }
        .section-header { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 12px; }
        .muted { color: #bfbfbf; font-size: 0.95rem; } 

        .circle-strip-wrapper {
          position: relative;
          background: rgba(13, 13, 13, 0.7);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.08); 
          border-radius: 14px;
          padding: 10px 12px;
        }
        
        .circle-strip-outer { position: relative; display: flex; align-items: center; gap: 8px; }
        
        .circle-strip {
          display: flex; gap: 16px; overflow-x: auto; padding: 8px 6px 12px;
          scroll-behavior: smooth; width: 100%; scrollbar-width: thin; 
        }

        /* Scrollbar personalizado */
        .circle-strip::-webkit-scrollbar { height: 8px; }
        .circle-strip::-webkit-scrollbar-thumb {
          background: linear-gradient(90deg, #06b6d4, #8b5cf6, #22c55e); 
          border-radius: 999px;
        }

        .circle-item-wrap { flex: 0 0 auto; width: 120px; display: flex; flex-direction: column; align-items: center; gap: 8px; }
        
        .circle-item {
          width: 120px; height: 120px; border-radius: 999px; 
          background: rgba(40, 40, 40, 0.6); backdrop-filter: blur(5px); 
          border: 1px solid rgba(255,255,255,0.08); display: flex; align-items: center; justify-content: center;
          cursor: pointer; transition: transform 240ms ease; 
        }

        .circle-item:hover { transform: translateY(-4px); }
        .circle-item.active-cat { border-color: #06b6d4; box-shadow: 0 0 15px rgba(6, 182, 212, 0.5); }
        .circle-item img { width: 100%; height: 100%; object-fit: cover; border-radius: 999px; } 
        
        .circle-fallback {
          width: 100%; height: 100%; border-radius: 999px; display: flex; align-items: center;
          justify-content: center; font-weight: 800; color: #fff;
          background: linear-gradient(90deg, #6b46c1, #06b6d4); 
        }

        .circle-name {
          font-family: 'Poppins', sans-serif; font-weight: 600; font-size: 0.92rem; 
          color: #bfbfbf; text-align: center; width: 100%; overflow: hidden; text-overflow: ellipsis; 
        }

        .subtle-arrow {
          background: rgba(0,0,0,0.5); border: none; color: white; width: 30px; height: 30px;
          border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center;
          z-index: 10;
        }

        /* Responsividad*/
        @media (max-width: 820px) {
          .circle-item { width:100px; height:100px; }
          .circle-item-wrap { width:100px; }
        }
        @media (max-width: 520px) {
          .circle-item { width:84px; height:84px; }
          .circle-item-wrap { width:84px; }
          .circle-name { font-size: 0.76rem; }
        }
      `}</style>
    </section>
  )
}