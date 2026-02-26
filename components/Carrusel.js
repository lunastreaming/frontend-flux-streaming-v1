import { useRef, useEffect, useState } from 'react';

export default function Carrusel() {
  const videoRef = useRef(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // 1. Iniciamos la reproducción
    if (videoRef.current) {
      videoRef.current.muted = true;
      videoRef.current.play().catch(() => {
        // Fallo silencioso si el navegador bloquea autoplay
      });
    }
  }, []);

  return (
    <div className={`video-container ${isLoaded ? 'loaded' : ''}`}>
      <div className="media-frame">
        <video
          ref={videoRef}
          src="/videos/intro.mp4"
          className="video-media"
          muted
          loop
          playsInline
          autoPlay
          /* CAMBIO CLAVE 1: preload="metadata" 
            Evita que el navegador descargue todo el video al inicio. 
            Solo descarga los primeros bytes para saber dimensiones y duración.
          */
          preload="metadata"
          /* CAMBIO CLAVE 2: onCanPlay 
            Solo mostramos el video con opacidad cuando esté listo para no ver saltos.
          */
          onCanPlay={() => setIsLoaded(true)}
        />
        <div className="media-overlay" />
      </div>

      <style jsx>{`
        .video-container {
          width: 100%;
          max-width: 1500px;
          aspect-ratio: 3 / 1; 
          margin: 40px auto;
          border-radius: 20px;
          overflow: visible;
          display: block;    /* Asegura que ocupe su lugar en el flujo */
          clear: both;       /* Evita que elementos flotantes se encimen */
          box-shadow: 0 18px 48px rgba(0,0,0,0.55);
          position: relative;
          background-color: #0f0f10;
          /* CAMBIO CLAVE 3: Opacidad inicial. 
             La caja ya ocupa su lugar (aspect-ratio) pero el contenido 
             no distrae al navegador hasta estar listo.
          */
          opacity: 0;
          transition: opacity 1s ease-in-out;
        }

        .video-container.loaded {
          opacity: 1;
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
          transform: scale(1.02);
        }

        .media-overlay {
          position: absolute;
          inset: 0;
          z-index: 2;
          background: transparent;
        }

        @media (max-width: 768px) {
          .video-container {
            border-radius: 12px;
            margin: 12px auto;
            /* CONSEJO: En móvil 3G, el 3:1 puede ser muy pequeño. 
               Si quieres que se vea más alto en móviles, usa 16/9:
            */
            aspect-ratio: 16 / 9;
          }
        }
      `}</style>
    </div>
  );
}