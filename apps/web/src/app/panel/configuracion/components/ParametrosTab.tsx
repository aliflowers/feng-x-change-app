'use client';

import { useState, useEffect } from 'react';
import {
 Save,
 Loader2,
 Clock,
 AlertTriangle,
 DollarSign,
 Percent,
 RefreshCw,
 CheckCircle2
} from 'lucide-react';

interface SystemConfig {
 timer_minutes: number;
 penalty_delay_count: number;
 penalty_amount_usd: number;
 commission_split_percent: number;
}

interface Toast {
 type: 'success' | 'error';
 message: string;
}

export default function ParametrosTab() {
 const [config, setConfig] = useState<SystemConfig>({
  timer_minutes: 15,
  penalty_delay_count: 3,
  penalty_amount_usd: 10,
  commission_split_percent: 50,
 });
 const [originalConfig, setOriginalConfig] = useState<SystemConfig | null>(null);
 const [loading, setLoading] = useState(true);
 const [saving, setSaving] = useState(false);
 const [toast, setToast] = useState<Toast | null>(null);

 useEffect(() => {
  fetchConfig();
 }, []);

 useEffect(() => {
  if (toast) {
   const timer = setTimeout(() => setToast(null), 4000);
   return () => clearTimeout(timer);
  }
 }, [toast]);

 const fetchConfig = async () => {
  try {
   const response = await fetch('/api/config/system');

   if (!response.ok) {
    throw new Error('Error al cargar configuración');
   }

   const data = await response.json();

   if (data.config) {
    const newConfig: SystemConfig = {
     timer_minutes: parseInt(data.config.timer_minutes?.value) || 15,
     penalty_delay_count: parseInt(data.config.penalty_delay_count?.value) || 3,
     penalty_amount_usd: parseFloat(data.config.penalty_amount_usd?.value) || 10,
     commission_split_percent: parseInt(data.config.commission_split_percent?.value) || 50,
    };
    setConfig(newConfig);
    setOriginalConfig(newConfig);
   }
  } catch (error) {
   console.error('Error fetching config:', error);
   setToast({ type: 'error', message: 'Error al cargar configuración' });
  } finally {
   setLoading(false);
  }
 };

 const handleSave = async () => {
  setSaving(true);

  try {
   const response = await fetch('/api/config/system', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config),
   });

   const data = await response.json();

   if (!response.ok) {
    throw new Error(data.error || 'Error al guardar');
   }

   setOriginalConfig(config);
   setToast({ type: 'success', message: 'Configuración guardada correctamente' });
  } catch (error) {
   console.error('Error saving config:', error);
   setToast({ type: 'error', message: error instanceof Error ? error.message : 'Error al guardar' });
  } finally {
   setSaving(false);
  }
 };

 const handleReset = () => {
  if (originalConfig) {
   setConfig(originalConfig);
  }
 };

 const hasChanges = originalConfig && JSON.stringify(config) !== JSON.stringify(originalConfig);

 if (loading) {
  return (
   <div className="flex items-center justify-center py-12">
    <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
   </div>
  );
 }

 return (
  <div className="space-y-6">
   {/* Toast notification */}
   {toast && (
    <div className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg transition-all ${toast.type === 'success'
      ? 'bg-green-500 text-white'
      : 'bg-red-500 text-white'
     }`}>
     {toast.type === 'success' ? (
      <CheckCircle2 size={20} />
     ) : (
      <AlertTriangle size={20} />
     )}
     <span className="font-medium">{toast.message}</span>
    </div>
   )}

   {/* Grid de configuraciones */}
   <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
    {/* Timer de operaciones */}
    <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-xl p-5 border border-blue-200">
     <div className="flex items-center gap-3 mb-4">
      <div className="p-2.5 bg-blue-500 rounded-lg">
       <Clock className="w-5 h-5 text-white" />
      </div>
      <div>
       <h3 className="font-semibold text-slate-800">Timer de Operaciones</h3>
       <p className="text-sm text-slate-500">Tiempo límite para procesar</p>
      </div>
     </div>
     <div className="flex items-center gap-3">
      <input
       type="number"
       min={5}
       max={60}
       value={config.timer_minutes}
       onChange={(e) => setConfig({ ...config, timer_minutes: parseInt(e.target.value) || 15 })}
       className="flex-1 px-4 py-2.5 rounded-lg border border-blue-200 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg font-medium"
      />
      <span className="text-slate-600 font-medium">minutos</span>
     </div>
     <p className="text-xs text-slate-500 mt-2">Mínimo: 5 min | Máximo: 60 min</p>
    </div>

    {/* Penalización - Número de demoras */}
    <div className="bg-gradient-to-br from-amber-50 to-amber-100/50 rounded-xl p-5 border border-amber-200">
     <div className="flex items-center gap-3 mb-4">
      <div className="p-2.5 bg-amber-500 rounded-lg">
       <AlertTriangle className="w-5 h-5 text-white" />
      </div>
      <div>
       <h3 className="font-semibold text-slate-800">Demoras para Penalización</h3>
       <p className="text-sm text-slate-500">Cantidad de retrasos permitidos</p>
      </div>
     </div>
     <div className="flex items-center gap-3">
      <input
       type="number"
       min={1}
       max={10}
       value={config.penalty_delay_count}
       onChange={(e) => setConfig({ ...config, penalty_delay_count: parseInt(e.target.value) || 3 })}
       className="flex-1 px-4 py-2.5 rounded-lg border border-amber-200 bg-white focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-lg font-medium"
      />
      <span className="text-slate-600 font-medium">demoras</span>
     </div>
     <p className="text-xs text-slate-500 mt-2">Después de esta cantidad, se aplica penalización</p>
    </div>

    {/* Monto de penalización */}
    <div className="bg-gradient-to-br from-red-50 to-red-100/50 rounded-xl p-5 border border-red-200">
     <div className="flex items-center gap-3 mb-4">
      <div className="p-2.5 bg-red-500 rounded-lg">
       <DollarSign className="w-5 h-5 text-white" />
      </div>
      <div>
       <h3 className="font-semibold text-slate-800">Monto de Penalización</h3>
       <p className="text-sm text-slate-500">Descuento por demora excesiva</p>
      </div>
     </div>
     <div className="flex items-center gap-3">
      <span className="text-slate-600 font-medium">$</span>
      <input
       type="number"
       min={0}
       max={100}
       step={0.5}
       value={config.penalty_amount_usd}
       onChange={(e) => setConfig({ ...config, penalty_amount_usd: parseFloat(e.target.value) || 0 })}
       className="flex-1 px-4 py-2.5 rounded-lg border border-red-200 bg-white focus:ring-2 focus:ring-red-500 focus:border-red-500 text-lg font-medium"
      />
      <span className="text-slate-600 font-medium">USD</span>
     </div>
     <p className="text-xs text-slate-500 mt-2">Se descuenta de la comisión del agente</p>
    </div>

    {/* Comisión */}
    <div className="bg-gradient-to-br from-green-50 to-green-100/50 rounded-xl p-5 border border-green-200">
     <div className="flex items-center gap-3 mb-4">
      <div className="p-2.5 bg-green-500 rounded-lg">
       <Percent className="w-5 h-5 text-white" />
      </div>
      <div>
       <h3 className="font-semibold text-slate-800">Reparto de Comisión</h3>
       <p className="text-sm text-slate-500">Porcentaje para agentes</p>
      </div>
     </div>
     <div className="space-y-3">
      <input
       type="range"
       min={0}
       max={100}
       value={config.commission_split_percent}
       onChange={(e) => setConfig({ ...config, commission_split_percent: parseInt(e.target.value) })}
       className="w-full h-2 bg-green-200 rounded-lg appearance-none cursor-pointer accent-green-500"
      />
      <div className="flex justify-between text-sm">
       <span className="text-slate-600">
        Agente: <strong className="text-green-600">{config.commission_split_percent}%</strong>
       </span>
       <span className="text-slate-600">
        Empresa: <strong className="text-slate-700">{100 - config.commission_split_percent}%</strong>
       </span>
      </div>
     </div>
    </div>
   </div>

   {/* Botones de acción */}
   <div className="flex items-center justify-between pt-4 border-t border-slate-200">
    <div>
     {hasChanges && (
      <span className="text-sm text-amber-600 flex items-center gap-2">
       <AlertTriangle size={16} />
       Hay cambios sin guardar
      </span>
     )}
    </div>
    <div className="flex gap-3">
     <button
      onClick={handleReset}
      disabled={!hasChanges || saving}
      className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
     >
      <RefreshCw size={18} />
      Restablecer
     </button>
     <button
      onClick={handleSave}
      disabled={saving}
      className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#AB2820] to-[#C13030] text-white font-medium hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
     >
      {saving ? (
       <Loader2 size={18} className="animate-spin" />
      ) : (
       <Save size={18} />
      )}
      {saving ? 'Guardando...' : 'Guardar Cambios'}
     </button>
    </div>
   </div>
  </div>
 );
}
