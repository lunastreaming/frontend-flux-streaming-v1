import { useAuth } from '../../context/AuthProvider'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import AdminNavBar from '../../components/AdminNavBar' // ajusta la ruta si tu componente está en otra carpeta

export default function AdminPanel() {
  const { user, ready } = useAuth()
  const router = useRouter()
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    if (!ready) return

    const role = user?.role?.toString().toUpperCase()
    if (!user || role !== 'ADMIN') {
      router.replace('/admin/loginAdmin')
    } else {
      setChecking(false)
    }
  }, [user, ready, router])

  if (!ready || checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        <p className="text-lg font-semibold animate-pulse">Verificando acceso administrativo...</p>
      </div>
    )
  }

  return (
    <div className="admin-root">
      <AdminNavBar />

      <main className="admin-main">
        <div className="container">
          <h1 className="heading">Panel Administrativo</h1>

          <section className="panel-welcome">
            <p className="muted">
              Bienvenido, <span className="role">{user?.role}</span>
            </p>
            <p className="lead">Aquí puedes gestionar usuarios, revisar métricas y administrar el sistema.</p>
          </section>

          {/* Reemplaza con tus módulos: cards, tablas, métricas, etc */}
          <section className="grid">
            <div className="card">Módulo 1</div>
            <div className="card">Módulo 2</div>
            <div className="card">Módulo 3</div>
            <div className="card">Módulo 4</div>
          </section>
        </div>
      </main>

      <style jsx>{`
        .admin-root {
          min-height: 100vh;
          background: linear-gradient(180deg, #070707 0%, #0b0b0b 100%);
          padding: 24px;
        }

        .admin-main {
          max-width: 1200px;
          margin: 24px auto;
          padding: 24px;
        }

        .container {
          background: rgba(20,20,20,0.6);
          border: 1px solid rgba(255,255,255,0.04);
          backdrop-filter: blur(10px);
          border-radius: 16px;
          padding: 24px;
          box-shadow: 0 12px 30px rgba(0,0,0,0.6);
        }

        .heading {
          font-size: 1.75rem;
          font-weight: 800;
          color: #f3f3f3;
          margin: 0 0 12px 0;
        }

        .panel-welcome {
          display: flex;
          flex-direction: column;
          gap: 6px;
          margin-bottom: 18px;
        }

        .muted {
          color: #bdbdbd;
          margin: 0;
        }

        .role {
          color: #ff6b6b;
          font-weight: 700;
        }

        .lead {
          color: #d1d1d1;
          font-size: 0.98rem;
          margin: 0;
        }

        .grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
          margin-top: 18px;
        }

        .card {
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.03);
          border-radius: 12px;
          padding: 18px;
          color: #e9e9e9;
          min-height: 100px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
        }

        @media (max-width: 1024px) {
          .grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 640px) {
          .grid {
            grid-template-columns: 1fr;
          }
          .admin-main {
            padding: 16px;
          }
        }
      `}</style>
    </div>
  )
}