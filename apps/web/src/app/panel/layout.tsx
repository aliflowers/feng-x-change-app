/**
 * Layout para el Panel de Admin/Cajero (/panel)
 * Ruta: /panel/*
 * Roles: ADMIN, CAJERO
 */

export default function PanelLayout({
 children,
}: {
 children: React.ReactNode;
}) {
 return (
  <div className="min-h-screen bg-bg-form">
   {/* Sidebar */}
   <aside className="fixed left-0 top-0 h-full w-64 bg-hero-start text-white p-4 hidden md:block">
    <div className="mb-8">
     <h1 className="text-xl font-bold">Fengxchange</h1>
     <p className="text-xs text-white/50">Panel Operativo</p>
    </div>
    <nav className="space-y-2">
     <a
      href="/panel"
      className="block px-4 py-2 rounded-lg hover:bg-white/10 transition-colors"
     >
      📊 Dashboard
     </a>
     <a
      href="/panel/pool"
      className="block px-4 py-2 rounded-lg hover:bg-white/10 transition-colors"
     >
      📥 Pool de Operaciones
     </a>
     <a
      href="/panel/clientes"
      className="block px-4 py-2 rounded-lg hover:bg-white/10 transition-colors"
     >
      👥 Mis Clientes
     </a>
     <a
      href="/panel/historial"
      className="block px-4 py-2 rounded-lg hover:bg-white/10 transition-colors"
     >
      📋 Historial
     </a>
     <a
      href="/panel/comisiones"
      className="block px-4 py-2 rounded-lg hover:bg-white/10 transition-colors"
     >
      💰 Comisiones
     </a>
     <a
      href="/panel/bancos"
      className="block px-4 py-2 rounded-lg hover:bg-white/10 transition-colors"
     >
      🏦 Bancos
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
        Panel Operativo
       </h2>
      </div>
      <nav className="flex items-center gap-4">
       <span className="text-sm text-gray-500">Admin/Cajero</span>
      </nav>
     </div>
    </header>

    {/* Contenido */}
    <main className="p-6">{children}</main>
   </div>
  </div>
 );
}
