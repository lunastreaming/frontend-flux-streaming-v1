import React from 'react';
import { FaWhatsapp } from 'react-icons/fa';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-content">
        {/* Sección de Ayuda */}
        <div className="support-section">
          <p className="footer-message">¿Necesitas ayuda? Escríbenos por WhatsApp</p>
          <a
            href="https://wa.me/51906844368"
            target="_blank"
            rel="noopener noreferrer"
            className="footer-icon"
            aria-label="Soporte WhatsApp"
          >
            <FaWhatsapp className="whatsapp-icon" />
          </a>
        </div>

        <hr className="footer-divider" />

        {/* Sección de Copyright y Software */}
        <div className="copyright-section">
          <div className="brand-info">
            <span className="brand-name">SOFTWARE TIENDA LUNA PLATAFORMAS</span>
            <span className="separator">|</span>
            <p className="footer-text">© 2025 Todos los derechos reservados</p>
          </div>
          
          <a 
            href="https://wa.me/51935769255" 
            className="dev-link"
            target="_blank"
            rel="noopener noreferrer"
          >
            ¿Quieres un sistema similar? <span>Contáctanos aquí</span>
          </a>
        </div>
      </div>

      <style jsx>{`
        .footer {
          width: 100%;
          max-width: 1200px;
          margin: 40px auto 0 auto;
          padding: 32px 24px;
          background-color: rgba(13, 13, 13, 0.8);
          backdrop-filter: blur(10px);
          border-top: 1px solid #2E2E2E;
          border-radius: 24px 24px 0 0;
          box-shadow: 0 -10px 25px rgba(0, 0, 0, 0.5);
        }
        
        .footer-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 24px;
          max-width: 800px; 
          margin: 0 auto;
        }

        /* Soporte */
        .support-section {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
        }

        .footer-message {
          color: #D1D1D1;
          font-size: 1rem;
          font-weight: 500;
        }

        :global(.whatsapp-icon) {
          width: 55px;
          height: 55px;
          color: #25D366;
          transition: transform 0.3s ease;
        }

        .footer-icon:hover :global(.whatsapp-icon) {
          transform: scale(1.1) rotate(5deg);
        }

        /* Divisor */
        .footer-divider {
          width: 100%;
          border: 0;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
          margin: 0;
        }

        /* Copyright Section */
        .copyright-section {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
        }

        .brand-info {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
          justify-content: center;
        }

        .brand-name {
          color: #FFFFFF;
          font-weight: 700;
          letter-spacing: 1px;
          font-size: 0.9rem;
        }

        .separator {
          color: #444;
          font-weight: 300;
        }

        .footer-text {
          color: #A6A6A6;
          font-size: 0.85rem;
        }

        .dev-link {
          color: #888;
          text-decoration: none;
          font-size: 0.8rem;
          transition: color 0.2s;
        }

        .dev-link span {
          color: #3498db; /* Un azul suave para diferenciar la acción */
          font-weight: 600;
        }

        .dev-link:hover {
          color: #BBB;
        }

        @media (max-width: 768px) {
          .footer {
            padding: 24px 16px;
          }
          .brand-info {
            flex-direction: column;
            gap: 4px;
          }
          .separator {
            display: none;
          }
        }
      `}</style>
    </footer>
  );
}