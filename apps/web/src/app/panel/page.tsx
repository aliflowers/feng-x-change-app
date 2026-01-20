/**
 * Dashboard del Panel Operativo
 * Ruta: /panel
 * Roles: ADMIN, CAJERO
 */

export default function PanelDashboard() {
 return (
  <div className="space-y-6">
   {/* Métricas rápidas */}
   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
    <div className="card">
     <p className="text-sm text-gray-500 mb-1">Operaciones en Pool</p>
     <p className="text-3xl font-bold text-status-pool">0</p>
    </div>
    <div className="card">
     <p className="text-sm text-gray-500 mb-1">En Proceso</p>
     <p className="text-3xl font-bold text-status-taken">0</p>
    </div>
    <div className="card">
     <p className="text-sm text-gray-500 mb-1">Completadas Hoy</p>
     <p className="text-3xl font-bold text-status-completed">0</p>
    </div>
    <div className="card">
     <p className="text-sm text-gray-500 mb-1">Comisiones del Mes</p>
     <p className="text-3xl font-bold text-primary">$0.00</p>
    </div>
   </div>

   {/* Pool de Operaciones (preview) */}
   <div className="card">
    <div className="flex items-center justify-between mb-4">
     <h3 className="font-bold text-lg">Pool de Operaciones</h3>
     <a href="/panel/pool" className="text-primary text-sm hover:underline">
      Ver todo →
     </a>
    </div>
    <div className="text-center py-8 text-gray-400">
     <p>No hay operaciones pendientes</p>
    </div>
   </div>

   {/* Información del Código de Agente */}
   <div className="card border-l-4 border-primary">
    <h3 className="font-bold text-lg mb-2">Tu Código de Agente</h3>
    <p className="text-gray-600 mb-4">
     Comparte este código con tus clientes para que se asocien a ti:
    </p>
    <div className="bg-bg-form px-4 py-3 rounded-lg inline-block">
     <code className="text-2xl font-mono font-bold text-primary">
      AG-XXXXX
     </code>
    </div>
   </div>
  </div>
 );
}
