import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html>
      <Head>
        {/* Favicon global */}
        <link rel="icon" href="/logofavicon.ico" type="image/png" />

        {/* Metadatos globales */}
        <meta
          name="description"
          content="Luna Streaming - Visuales ritualizados y experiencias simbólicas"
        />
      </Head>
      {/* ESTILO EN LÍNEA: Forzamos la transparencia absoluta del body 
        para que se vea la imagen que está aplicada en el 'html' desde globals.css.
      */}
      <body style={{ backgroundColor: 'transparent', margin: 0, padding: 0 }}>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}