/**
 * Dashboard del Super Admin
 * Ruta: /admin
 * Rol: SUPER_ADMIN
 */

export default function AdminDashboard() {
 return (
  <div className="space-y-6">
   {/* Métricas globales */}
   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
    <div className="card">
     <p className="text-sm text-gray-500 mb-1">Operaciones en Pool</p>
     <p className="text-3xl font-bold text-status-pool">0</p>
    </div>
    <div className="card">
     <p className="text-sm text-gray-500 mb-1">Operaciones Hoy</p>
     <p className="text-3xl font-bold text-hero-end">0</p>
    </div>
    <div className="card">
     <p className="text-sm text-gray-500 mb-1">Clientes Totales</p>
     <p className="text-3xl font-bold text-text-dark">0</p>
    </div>
    <div className="card bg-burgundy-gradient text-white">
     <p className="text-sm text-white/80 mb-1">Ganancias del Mes</p>
     <p className="text-3xl font-bold">$0.00</p>
    </div>
   </div>

   {/* Segunda fila de métricas */}
   <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
    <div className="card">
     <p className="text-sm text-gray-500 mb-1">Agentes Activos</p>
     <p className="text-3xl font-bold">0</p>
     <p className="text-xs text-gray-400 mt-2">ADMIN + CAJERO</p>
    </div>
    <div className="card">
     <p className="text-sm text-gray-500 mb-1">Comisiones Pendientes</p>
     <p className="text-3xl font-bold text-yellow-600">$0.00</p>
     <p className="text-xs text-gray-400 mt-2">Por pagar este mes</p>
    </div>
    <div className="card">
     <p className="text-sm text-gray-500 mb-1">Pagos Demorados</p>
     <p className="text-3xl font-bold text-status-rejected">0</p>
     <p className="text-xs text-gray-400 mt-2">Total este mes</p>
    </div>
   </div>

   {/* Gráficos (placeholders) */}
   <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
    <div className="card">
     <h3 className="font-bold text-lg mb-4">Operaciones por Día</h3>
     <div className="h-48 bg-bg-form rounded-lg flex items-center justify-center text-gray-400">
      Gráfico de Barras (Placeholder)
     </div>
    </div>
    <div className="card">
     <h3 className="font-bold text-lg mb-4">Distribución por Moneda</h3>
     <div className="h-48 bg-bg-form rounded-lg flex items-center justify-center text-gray-400">
      Gráfico de Pastel (Placeholder)
     </div>
    </div>
   </div>

   {/* Pool de Operaciones (preview) */}
   <div className="card">
    <div className="flex items-center justify-between mb-4">
     <h3 className="font-bold text-lg">Pool de Operaciones</h3>
     <a href="/admin/pool" className="text-primary text-sm hover:underline">
      Ver todo →
     </a>
    </div>
    <div className="text-center py-8 text-gray-400">
     <p>No hay operaciones pendientes</p>
    </div>
   </div>
  </div>
 );
}
