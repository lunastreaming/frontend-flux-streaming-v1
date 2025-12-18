// pages/_app.js
import '../styles/globals.css'
import { AuthProvider } from '../context/AuthProvider'
import SupplierLayout from '../components/SupplierLayout'
import { Analytics } from '@vercel/analytics/next'

export default function MyApp({ Component, pageProps, router }) {
  const path = router.pathname

  // rutas que NO deben mostrar el layout del proveedor
  const excludedSupplierRoutes = [
    '/supplier/loginSupplier',
    '/supplier/registerSupplier'
  ]

  const isSupplierRoute =
    path.startsWith('/supplier') && !excludedSupplierRoutes.includes(path)

  if (isSupplierRoute) {
    return (
      <AuthProvider>
        <SupplierLayout>
          <Component {...pageProps} />
        </SupplierLayout>
        <Analytics />
      </AuthProvider>
    )
  }

  // Para otras rutas (incluyendo loginSupplier y registerSupplier)
  return (
    <AuthProvider>
      <Component {...pageProps} />
      <Analytics />
    </AuthProvider>
  )
}