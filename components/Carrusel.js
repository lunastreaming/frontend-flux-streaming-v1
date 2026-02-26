import { useRef, useEffect, useState } from 'react';

export default function Carrusel() {
  const videoRef = useRef(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      // 1. Configuración de mute estricta para asegurar Autoplay
      video.muted = true;
      video.defaultMuted = true;

      // 2. Usamos un retraso de 50ms para permitir que React termine 
      // de montar los scripts pesados (Navbar, Iconos) antes de pedir el video.
      const timer = setTimeout(() => {
        const playPromise = video.play();

        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              // Si ya se está reproduciendo, forzamos visibilidad
              setIsLoaded(true);
            })
            .catch((error) => {
              console.log("Autoplay esperando interacción o carga:", error);
            });
        }
      }, 50);

      return () => clearTimeout(timer);
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
          preload="auto"
          /* Se activa en cuanto el primer frame está listo para mostrarse */
          onLoadedData={() => setIsLoaded(true)} 
        />
        <div className="media-overlay" />
      </div>

      <style jsx>{`
        .video-container {
          width: 100%;
          max-width: 1200px;
          /* Mantiene el espacio reservado para evitar saltos de scroll */
          aspect-ratio: 3 / 1; 
          margin: 40px auto;
          border-radius: 20px;
          overflow: hidden;
          display: block;
          position: relative;
          background-color: #0f0f10;
          box-shadow: 0 18px 48px rgba(0,0,0,0.55);
          
          /* Animación suave para que no aparezca de golpe */
          opacity: 0;
          transform: translateY(5px);
          transition: opacity 0.8s ease-in-out, transform 0.8s ease-in-out;
        }

        /* Clase que se activa cuando el video está listo */
        .video-container.loaded {
          opacity: 1;
          transform: translateY(0);
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
        }

        .media-overlay {
          position: absolute;
          inset: 0;
          z-index: 2;
          background: linear-gradient(to bottom, transparent 60%, rgba(0,0,0,0.4));
          pointer-events: none;
        }

        @media (max-width: 768px) {
          .video-container {
            width: 92%;
            margin: 15px auto 40px auto; /* Mayor margen abajo para liberar el scroll */
            aspect-ratio: 16 / 9;
            border-radius: 12px;
          }
        }
      `}</style>
    </div>
  );
}