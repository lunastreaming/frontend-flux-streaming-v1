// pages/_app.js
import '../styles/globals.css'
import { AuthProvider } from '../context/AuthProvider'
import SupplierLayout from '../components/SupplierLayout'

export default function MyApp({ Component, pageProps, router }) {
  // Si la ruta empieza con /supplier, usamos el layout
  if (router.pathname.startsWith('/supplier')) {
    return (
      <AuthProvider>
        <SupplierLayout>
          <Component {...pageProps} />
        </SupplierLayout>
      </AuthProvider>
    )
  }

  // Para otras rutas, solo AuthProvider
  return (
    <AuthProvider>
      <Component {...pageProps} />
    </AuthProvider>
  )
}