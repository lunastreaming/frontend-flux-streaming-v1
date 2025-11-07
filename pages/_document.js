import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html>
      <Head>
        <title>Luna Streaming</title>
        <link rel="icon" href="/logo.png" type="image/png" />
        <meta name="description" content="Luna Streaming - Visuales ritualizados y experiencias simbólicas" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}