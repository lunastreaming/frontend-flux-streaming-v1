import { NextResponse } from 'next/server'

function decodeJwtPayload(token) {
  try {
    const payload = token.split('.')[1]
    const decoded = JSON.parse(Buffer.from(payload, 'base64').toString('utf8'))
    return decoded
  } catch (err) {
    return null
  }
}

export function middleware(request) {
  const { pathname } = request.nextUrl
  const token = request.cookies.get('accessToken')?.value

  // Rutas públicas que no requieren autenticación
  const publicAdminRoutes = ['/admin/loginAdmin']
  const publicSupplierRoutes = ['/supplier/loginSupplier', '/supplier/registerSupplier']

  if (publicAdminRoutes.includes(pathname) || publicSupplierRoutes.includes(pathname)) {
    return NextResponse.next()
  }

  // Validación para rutas de administrador
  if (pathname.startsWith('/admin')) {
    if (!token) {
      return NextResponse.redirect(new URL('/admin/loginAdmin', request.url))
    }

    const payload = decodeJwtPayload(token)
    const rawRole = payload?.role || (Array.isArray(payload?.roles) ? payload.roles[0] : null)
    const role = rawRole?.toUpperCase() || null

    if (role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/admin/loginAdmin', request.url))
    }
  }

  // Validación para rutas de proveedor
  if (pathname.startsWith('/supplier')) {
    if (!token) {
      return NextResponse.redirect(new URL('/supplier/loginSupplier', request.url))
    }

    const payload = decodeJwtPayload(token)
    const rawRole = payload?.role || (Array.isArray(payload?.roles) ? payload.roles[0] : null)
    const role = rawRole?.toUpperCase() || null

    if (role !== 'PROVIDER') {
      return NextResponse.redirect(new URL('/supplier/loginSupplier', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin', '/admin/:path*', '/supplier', '/supplier/:path*'],
}