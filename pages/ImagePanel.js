import React from 'react';
import miImagen from './assets/mi-imagen.jpg'; // ajusta la ruta según tu estructura

const ImagePanel = () => {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      backgroundColor: '#f0f0f0'
    }}>
      <img 
        src={miImagen} 
        alt="Imagen ritualizada" 
        style={{ maxWidth: '100%', height: 'auto', borderRadius: '12px' }}
      />
    </div>
  );
};

export default ImagePanel;