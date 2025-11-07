// pages/_app.js
import '../styles/globals.css'
import { AuthProvider } from '../context/AuthProvider'

export default function MyApp({ Component, pageProps }) {
  return (
    <AuthProvider>
      <Component {...pageProps} />
    </AuthProvider>
  )
}