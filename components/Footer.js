export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-content">
        <p className="footer-message">¿Necesitas ayuda? Escríbenos por WhatsApp</p>
        <a
          href="https://wa.me/51999999999"
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
          padding: 48px 24px;
          background-color: #0D0D0D;
          border-top: 1px solid #2E2E2E;
          box-shadow: 0 -4px 12px rgba(0, 0, 0, 0.3);
          margin-top: 80px;
        }

        .footer-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 16px;
          text-align: center;
        }

        .footer-message {
          color: #D1D1D1;
          font-size: 1rem;
          font-weight: 500;
          margin-bottom: 4px;
        }

        .footer-icon img {
          width: 72px;
          height: 72px;
          transition: transform 0.3s ease;
        }

        .footer-icon:hover img {
          transform: scale(1.1);
        }

        .footer-text {
          color: #A6A6A6;
          font-size: 0.95rem;
          font-weight: 500;
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.4);
        }
      `}</style>
    </footer>
  );
}