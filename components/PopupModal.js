import Image from 'next/image';

export default function PopupModal({ isOpen, onClose, imageSrc }) {
  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 10000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      backgroundColor: 'rgba(0, 0, 0, 0.85)',
      backdropFilter: 'blur(4px)'
    }}>
      {/* Fondo para cerrar */}
      <div style={{ position: 'absolute', inset: 0 }} onClick={onClose} />

      {/* Contenedor del Modal */}
      <div style={{
        position: 'relative',
        backgroundColor: '#1a1a1a',
        borderRadius: '16px',
        maxWidth: '450px', // Un poco más ancho para que luzca mejor
        width: '100%',
        overflow: 'hidden',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        border: '1px solid #333',
        display: 'flex',
        flexDirection: 'column'
      }}>
        
        {/* Botón X */}
        <button 
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '12px',
            right: '12px',
            zIndex: 100,
            backgroundColor: 'rgba(0,0,0,0.6)',
            color: 'white',
            border: 'none',
            borderRadius: '50%',
            width: '35px',
            height: '35px',
            cursor: 'pointer',
            fontSize: '18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 'bold'
          }}
        >
          ✕
        </button>

        {/* Contenedor de la Imagen - Ajustado para verla COMPLETA */}
        <div style={{ 
          position: 'relative', 
          width: '100%', 
          height: 'auto', 
          aspectRatio: '4/5', // Proporción común de flyers
          maxHeight: '80vh'   // Para que no se salga de la pantalla en móviles
        }}>
          <Image 
            src={imageSrc} 
            alt="Luna Streaming Promo" 
            fill
            sizes="(max-width: 768px) 100vw, 450px"
            style={{ 
              objectFit: 'contain', // <--- ESTO HACE QUE SE VEA COMPLETA
              backgroundColor: '#1a1a1a' // Fondo para que no se vea vacío si la imagen es delgada
            }}
            priority
          />
        </div>

        {/* Texto inferior */}
        <div style={{
          padding: '20px',
          textAlign: 'center',
          color: 'white',
          background: '#1a1a1a'
        }}>
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '800' }}>
            ¡ACCESO GRATIS!
          </h2>
          <p style={{ margin: '5px 0 0', opacity: 0.8 }}>Por Carnavales hasta el 28 de Febrero</p>
        </div>
      </div>
    </div>
  );
}