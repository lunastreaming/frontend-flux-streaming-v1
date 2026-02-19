import React from 'react';
import { FaWhatsapp } from 'react-icons/fa';

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
          {/* Usamos el componente FaWhatsapp en lugar de <img> */}
          <FaWhatsapp className="whatsapp-icon" />
        </a>
        <p className="footer-text">© 2025 Luna Streaming</p>
      </div>

      <style jsx>{`
        .footer {
          width: 100%;
          max-width: 1200px;
          margin: 40px auto 0 auto;
          padding: 24px 24px;
          background-color: rgba(13, 13, 13, 0.8);
          backdrop-filter: blur(8px);
          border-top: 1px solid #2E2E2E;
          border-radius: 20px 20px 0 0;
          box-shadow: 0 -4px 12px rgba(0, 0, 0, 0.5);
        }
        
        .footer-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 16px;
          text-align: center;
          max-width: 600px; 
          margin: 0 auto;
        }

        .footer-message {
          color: #D1D1D1;
          font-size: 1rem;
          font-weight: 500;
          margin-bottom: 4px;
        }

        /* Estilos específicos para el icono de React Icons */
        .footer-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          text-decoration: none;
          transition: transform 0.3s ease;
        }

        :global(.whatsapp-icon) {
          width: 60px;
          height: 60px;
          color: #25D366; /* Color oficial de WhatsApp */
        }

        .footer-icon:hover {
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
            padding: 20px 16px;
            margin-top: 30px;
          }
          :global(.whatsapp-icon) {
            width: 50px;
            height: 50px;
          }
        }
      `}</style>
    </footer>
  );
}