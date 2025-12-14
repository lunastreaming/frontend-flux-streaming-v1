export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-content">
        <p className="footer-message">¿Necesitas ayuda? Escríbenos por WhatsApp</p>
        <a
          href="https://wa.me/51902229594"
          target="_blank"
          rel="noopener noreferrer"
          className="footer-icon"
          aria-label="WhatsApp"
        >
          <img src="whatsapp.svg" alt="WhatsApp" />
        </a>
        <p className="footer-text">© 2025 Luna Streaming</p>
      </div>

      <style jsx>{`
        .footer {
          width: 100%;
          max-width: 1200px; /* Limitar el ancho para que esté centrado como la Navbar */
          margin: 40px auto 0 auto; /* 🚨 ESPACIO REDUCIDO: 40px margin-top, centrado */
          padding: 24px 24px; /* 🚨 TAMAÑO REDUCIDO: 24px padding arriba/abajo */
          
          /* 🚨 TRANSPARENCIA: Fondo semi-transparente + efecto de cristal */
          background-color: rgba(13, 13, 13, 0.8); /* Fondo semi-transparente oscuro */
          backdrop-filter: blur(8px); /* Efecto Glassmorphism */

          border-top: 1px solid #2E2E2E;
          border-radius: 20px 20px 0 0; /* Bordes redondeados para que coincida con el estilo */
          box-shadow: 0 -4px 12px rgba(0, 0, 0, 0.5);
        }
        
        /* Aseguramos que el contenido esté centrado si limitamos el ancho */
        .footer-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 16px;
          text-align: center;
          /* Limitar ancho máximo del contenido */
          max-width: 600px; 
          margin: 0 auto;
        }

        .footer-message {
          color: #D1D1D1;
          font-size: 1rem;
          font-weight: 500;
          margin-bottom: 4px;
        }

        .footer-icon img {
          width: 60px; /* 🚨 TAMAÑO REDUCIDO: De 72px a 60px */
          height: 60px;
          transition: transform 0.3s ease;
        }

        .footer-icon:hover img {
          transform: scale(1.15);
        }

        .footer-text {
          color: #A6A6A6;
          font-size: 0.95rem;
          font-weight: 500;
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.4);
        }
        
        @media (max-width: 768px) {
            .footer {
                padding: 20px 16px; /* Padding reducido en móviles */
                margin-top: 30px; /* Margen reducido en móviles */
            }
            .footer-icon img {
                width: 50px; /* Aún más pequeño en móvil */
                height: 50px;
            }
        }
      `}</style>
    </footer>
  );
}