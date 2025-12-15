import { useRef, useEffect, useState } from 'react';
import Slider from 'react-slick';
import 'slick-carousel/slick/slick.css';
import 'slick-carousel/slick/slick-theme.css';

const itemsCarrusel = [
  { src: '/videos/SPO.mp4' },
  { src: '/videos/DIS.mp4' },
  { src: '/videos/NET.mp4' },
  { src: '/videos/YOU.mp4' },
  { src: '/videos/CHR.mp4' },
  { src: '/videos/IPTV.mp4' },
];

function PrevArrow({ onClick }) {
  return (
    <button aria-label="Anterior" className="slick-custom-arrow slick-prev" onClick={onClick}>
      ‹
    </button>
  );
}
function NextArrow({ onClick }) {
  return (
    <button aria-label="Siguiente" className="slick-custom-arrow slick-next" onClick={onClick}>
      ›
    </button>
  );
}

export default function Carrusel() {
  const sliderRef = useRef(null);
  const videoRefs = useRef([]);
  const containerRef = useRef(null);
  const [isGrabbing, setIsGrabbing] = useState(false);

  useEffect(() => {
    videoRefs.current = videoRefs.current.slice(0, itemsCarrusel.length);
    // play first video on mount (muted autoplay)
    const first = videoRefs.current[0];
    if (first) {
      first.muted = true;
      first.play().catch(() => {});
    }
  }, []);

  const settings = {
    dots: true,
    arrows: true,
    prevArrow: <PrevArrow />,
    nextArrow: <NextArrow />,
    infinite: true,
    speed: 700,
    fade: true,
    cssEase: 'cubic-bezier(.2,.9,.2,1)',
    slidesToShow: 1,
    slidesToScroll: 1,
    autoplay: true,
    autoplaySpeed: 5000,
    pauseOnHover: true,
    adaptiveHeight: true,

    // drag / swipe
    draggable: true,
    swipe: true,
    swipeToSlide: true,
    touchMove: true,
    touchThreshold: 8,

    beforeChange: (current, next) => {
      const cur = videoRefs.current[current];
      if (cur && !cur.paused) {
        try { cur.pause(); cur.currentTime = 0; } catch (_) {}
      }
    },
    afterChange: (index) => {
      const v = videoRefs.current[index];
      if (v) {
        try { v.currentTime = 0; v.muted = true; v.play().catch(() => {}); } catch (_) {}
      }
    },
  };

  // cursor visual mientras el usuario arrastra
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let pointerDown = false;
    let startX = 0;
    let moved = false;

    const onPointerDown = (e) => {
      if (e.button !== undefined && e.button !== 0) return;
      pointerDown = true;
      startX = e.clientX || (e.touches && e.touches[0]?.clientX) || 0;
      moved = false;
      setIsGrabbing(true);
    };
    const onPointerMove = (e) => {
      if (!pointerDown) return;
      const x = e.clientX || (e.touches && e.touches[0]?.clientX) || 0;
      if (Math.abs(x - startX) > 6) moved = true;
    };
    const onPointerUp = () => { pointerDown = false; setIsGrabbing(false); };
    const onPointerCancel = () => { pointerDown = false; setIsGrabbing(false); };

    el.addEventListener('pointerdown', onPointerDown, { passive: true });
    el.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerCancel);

    return () => {
      el.removeEventListener('pointerdown', onPointerDown);
      el.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerCancel);
    };
  }, []);

  const handleOverlayClick = (e) => {
    // placeholder para futuras interacciones
    e.stopPropagation();
  };

  return (
    <div ref={containerRef} className={`carrusel-container ${isGrabbing ? 'grabbing' : 'grab'}`}>
      <Slider ref={sliderRef} {...settings}>
        {itemsCarrusel.map((item, index) => (
          <div key={index} className="slide-wrap">
            <div className="media-frame">
              <video
                ref={(el) => (videoRefs.current[index] = el)}
                src={item.src}
                className="carrusel-media"
                muted
                loop
                playsInline
                preload="metadata"
                style={{ pointerEvents: 'none' }}
              />
              <div className="media-overlay" onClick={handleOverlayClick} />
            </div>
          </div>
        ))}
      </Slider>

      <style jsx>{`
        /*
          DIMENSIONES ACTUALIZADAS:
          Ancho máximo: 1500px (un poco más de 1200px)
          Altura: 500px (para mantener la proporción 3:1 -> 1500 / 500 = 3)
        */
        .carrusel-container {
          width: 100%;
          max-width: 1500px; /* Aumentado para aprovechar la alta resolución */
          height: 500px; /* 1/3 del ancho, para proporción 3:1 (5000x1667) */
          margin: 40px auto;
          border-radius: 20px;
          overflow: hidden;
          box-shadow: 0 18px 48px rgba(0,0,0,0.55);
          position: relative;
          background-color: #0f0f10;
          touch-action: pan-y;
        }

        .carrusel-container.grab { cursor: grab; }
        .carrusel-container.grabbing { cursor: grabbing; }

        .slide-wrap { width: 100%; height: 100%; display: flex !important; align-items: center; justify-content: center; position: relative; }
        .media-frame { width: 100%; height: 100%; position: relative; }

        .carrusel-media {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
          border: none;
          transition: transform 1s cubic-bezier(.2,.9,.2,1), opacity 0.7s ease;
          transform-origin: center center;
        }

        .slick-active .carrusel-media { transform: scale(1.03); opacity: 1; }
        .slick-slide:not(.slick-active) .carrusel-media { transform: scale(1); opacity: 0.6; }

        /* overlay: captura clicks y mantiene pointer events para slider */
        .media-overlay {
          position: absolute;
          inset: 0;
          z-index: 2;
          background: transparent;
        }

        .slick-custom-arrow { position: absolute; top: 50%; transform: translateY(-50%); z-index: 50; width: 44px; height: 44px; border-radius: 999px; border: 1px solid rgba(255,255,255,0.08); background: rgba(10,10,10,0.55); color: #fff; font-size: 24px; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: transform 0.18s ease, background 0.18s ease; box-shadow: 0 6px 18px rgba(8,8,10,0.45); }
        .slick-prev { left: 14px; }
        .slick-next { right: 14px; }
        .slick-custom-arrow:hover { transform: translateY(-50%) scale(1.06); background: rgba(139,92,246,0.9); }

        /* AJUSTE PARA MÓVILES (también manteniendo proporción 3:1, ancho 100%) */
        @media (max-width: 768px) {
          .carrusel-container {
            /* 3:1 proporción: si el ancho es 700px, la altura es 233px */
            /* Usamos una altura de 250px para mantener un buen tamaño visual en móvil */
            height: 250px; 
            border-radius: 12px; 
            margin: 24px auto; 
          }
        }
      `}</style>

      <style jsx global>{`
        .slick-slider .slick-list, .slick-slider .slick-track { height: 100% !important; }
        .slick-slider .slick-slide { height: 100%; display: block; }
        .slick-slide > div { height: 100%; } /* inner wrapper */

        .slick-dots { bottom: 16px; z-index: 40; }
        .slick-dots li button:before { font-size: 12px; color: rgba(191,191,191,0.7); opacity: 1; }
        .slick-dots li.slick-active button:before { color: #ffffff; opacity: 1; }
      `}</style>
    </div>
  );
}