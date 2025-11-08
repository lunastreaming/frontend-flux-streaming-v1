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
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}