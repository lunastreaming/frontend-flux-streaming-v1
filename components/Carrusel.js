import { useRef, useEffect } from 'react';

export default function Carrusel() {
  const videoRef = useRef(null);

  useEffect(() => {
    // Intentar reproducir automáticamente de forma segura
    if (videoRef.current) {
      videoRef.current.muted = true;
      videoRef.current.play().catch((error) => {
        console.log("Autoplay bloqueado por el navegador:", error);
      });
    }
  }, []);

  return (
    <div className="video-container">
      <div className="media-frame">
        <video
          ref={videoRef}
          src="/videos/intro.mp4"
          className="video-media"
          muted
          loop
          playsInline
          autoPlay
          preload="auto"
        />
        {/* Overlay opcional por si quieres añadir texto o filtros encima */}
        <div className="media-overlay" />
      </div>

      <style jsx>{`
        .video-container {
          width: 100%;
          max-width: 1500px;
          /* Mantenemos tu proporción 3:1 */
          aspect-ratio: 3 / 1; 
          
          margin: 40px auto;
          border-radius: 20px;
          overflow: hidden;
          box-shadow: 0 18px 48px rgba(0,0,0,0.55);
          position: relative;
          background-color: #0f0f10;
        }

        .media-frame {
          width: 100%;
          height: 100%;
          position: relative;
        }

        .video-media {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
          /* Sutil efecto de zoom para que se vea más dinámico */
          transform: scale(1.02);
        }

        .media-overlay {
          position: absolute;
          inset: 0;
          z-index: 2;
          background: transparent;
        }

        /* Ajuste para móviles */
        @media (max-width: 768px) {
          .video-container {
            border-radius: 12px;
            margin: 12px auto;
            /* Si en móvil el 3:1 queda muy estrecho, puedes cambiarlo aquí: */
            /* aspect-ratio: 16 / 9; */
          }
        }
      `}</style>
    </div>
  );
}