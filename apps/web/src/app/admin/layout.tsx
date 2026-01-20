/**
 * Layout para el Panel de Super Admin (/admin)
 * Ruta: /admin/*
 * Rol: SUPER_ADMIN
 */

export default function AdminLayout({
 children,
}: {
 children: React.ReactNode;
}) {
 return (
  <div className="min-h-screen bg-bg-form">
   {/* Sidebar */}
   <aside className="fixed left-0 top-0 h-full w-64 bg-burgundy text-white p-4 hidden md:block">
    <div className="mb-8">
     <h1 className="text-xl font-bold">Fengxchange</h1>
     <p className="text-xs text-white/50">Super Admin</p>
    </div>
    <nav className="space-y-2">
     <a
      href="/admin"
      className="block px-4 py-2 rounded-lg hover:bg-white/10 transition-colors"
     >
      📊 Dashboard
     </a>
     <a
      href="/admin/pool"
      className="block px-4 py-2 rounded-lg hover:bg-white/10 transition-colors"
     >
      📥 Pool de Operaciones
     </a>
     <a
      href="/admin/clientes"
      className="block px-4 py-2 rounded-lg hover:bg-white/10 transition-colors"
     >
      👥 Todos los Clientes
     </a>
     <a
      href="/admin/historial"
      className="block px-4 py-2 rounded-lg hover:bg-white/10 transition-colors"
     >
      📋 Historial Global
     </a>
     <a
      href="/admin/comisiones"
      className="block px-4 py-2 rounded-lg hover:bg-white/10 transition-colors"
     >
      💰 Comisiones (Todos)
     </a>
     <a
      href="/admin/ganancias"
      className="block px-4 py-2 rounded-lg hover:bg-white/10 transition-colors"
     >
      📈 Ganancias
     </a>
     <a
      href="/admin/tasas"
      className="block px-4 py-2 rounded-lg hover:bg-white/10 transition-colors"
     >
      💱 Tasas de Cambio
     </a>
     <a
      href="/admin/bancos"
      className="block px-4 py-2 rounded-lg hover:bg-white/10 transition-colors"
     >
      🏦 Bancos
     </a>
     <a
      href="/admin/usuarios"
      className="block px-4 py-2 rounded-lg hover:bg-white/10 transition-colors"
     >
      👔 Usuarios del Sistema
     </a>
    </nav>
   </aside>

   {/* Main Content */}
   <div className="md:ml-64">
    {/* Header */}
    <header className="bg-white shadow-sm sticky top-0 z-50">
     <div className="flex items-center justify-between h-16 px-6">
      <div className="flex items-center gap-4">
       <button className="md:hidden text-2xl">☰</button>
       <h2 className="text-lg font-semibold text-text-dark">
        Panel Super Admin
       </h2>
      </div>
      <nav className="flex items-center gap-4">
       <span className="px-3 py-1 bg-burgundy text-white text-xs rounded-full font-semibold">
        SUPER_ADMIN
       </span>
      </nav>
     </div>
    </header>

    {/* Contenido */}
    <main className="p-6">{children}</main>
   </div>
  </div>
 );
}
