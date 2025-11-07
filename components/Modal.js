import { useEffect } from 'react';

export default function Modal({ open, onClose, children, ariaLabel }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      <div className="overlay" onMouseDown={onClose} role="dialog" aria-label={ariaLabel || 'Modal'}>
        <div className="content" onMouseDown={(e) => e.stopPropagation()}>
          {children}
        </div>
      </div>

      <style jsx>{`
        .overlay {
          position: fixed;
          inset: 0;
          display: grid;
          place-items: center;
          background: rgba(0,0,0,0.6);
          z-index: 1200;
          backdrop-filter: blur(4px);
        }
        .content {
          width: 92%;
          max-width: 420px;
          background: rgba(20,20,20,0.95);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 14px;
          padding: 18px;
          box-shadow: 0 20px 40px rgba(0,0,0,0.6);
          color: #eee;
        }
      `}</style>
    </>
  );
}