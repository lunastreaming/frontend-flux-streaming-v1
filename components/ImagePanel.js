import React from 'react';

const ImagenCentrada = () => {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh', // altura completa de la ventana
      backgroundColor: '#f0f0f0' // fondo suave para resaltar la imagen
    }}>
      <img 
        src="https://via.placeholder.com/300" 
        alt="Imagen ritualizada" 
        style={{ maxWidth: '100%', height: 'auto', borderRadius: '12px' }}
      />
    </div>
  );
};

export default ImagenCentrada;