'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import {
 Inbox,
 Clock,
 CheckCircle2,
 Coins,
 TrendingUp,
 ArrowRight,
 AlertCircle,
 Users,
 Copy,
 Check,
 RefreshCw,
 AlertTriangle,
 UserCheck,
 UserX,
 Bell
} from 'lucide-react';

interface DashboardMetrics {
 poolCount: number;
 takenCount: number;
 completedToday: number;
 monthlyCommissions: number;
 totalClients: number;
}

interface UserProfile {
 agent_code: string | null;
 role: string;
}

interface RecentOperation {
 id: string;
 transaction_number: string;
 amount_sent: number;
 status: string;
 created_at: string;
 from_currency: { code: string; symbol: string };
 to_currency: { code: string; symbol: string };
 user: { first_name: string; last_name: string };
}

interface DelayedPayment {
 id: string;
 transaction_number: string;
 taken_at: string;
 taken_by_name: string;
 minutes_delayed: number;
}

interface UserStatus {
 online: number;
 offline: number;
}

export default function PanelDashboard() {
 const [metrics, setMetrics] = useState<DashboardMetrics>({
  poolCount: 0,
  takenCount: 0,
  completedToday: 0,
  monthlyCommissions: 0,
  totalClients: 0,
 });
 const [profile, setProfile] = useState<UserProfile | null>(null);
 const [recentOperations, setRecentOperations] = useState<RecentOperation[]>([]);
 const [delayedPayments, setDelayedPayments] = useState<DelayedPayment[]>([]);
 const [userStatus, setUserStatus] = useState<UserStatus>({ online: 0, offline: 0 });
 const [loading, setLoading] = useState(true);
 const [copied, setCopied] = useState(false);

 useEffect(() => {
  loadDashboardData();
 }, []);

 const loadDashboardData = async () => {
  try {
   const { data: { user } } = await supabase.auth.getUser();
   if (!user) return;

   // Get profile
   const { data: profileData } = await supabase
    .from('profiles')
    .select('agent_code, role')
    .eq('id', user.id)
    .single();

   if (profileData) setProfile(profileData);

   // Get metrics
   const today = new Date();
   today.setHours(0, 0, 0, 0);

   const [poolRes, takenRes, completedRes, clientsRes] = await Promise.all([
    supabase.from('transactions').select('id', { count: 'exact', head: true }).eq('status', 'POOL'),
    supabase.from('transactions').select('id', { count: 'exact', head: true }).eq('status', 'TAKEN'),
    supabase.from('transactions').select('id', { count: 'exact', head: true })
     .eq('status', 'COMPLETED')
     .gte('created_at', today.toISOString()),
    supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'CLIENT'),
   ]);

   // Get commissions for this month
   const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
   const { data: commissionsData } = await supabase
    .from('commissions')
    .select('commission_amount')
    .eq('agent_id', user.id)
    .gte('created_at', startOfMonth.toISOString());

   const monthlyCommissions = commissionsData?.reduce((sum, c) => sum + (c.commission_amount || 0), 0) || 0;

   setMetrics({
    poolCount: poolRes.count || 0,
    takenCount: takenRes.count || 0,
    completedToday: completedRes.count || 0,
    monthlyCommissions,
    totalClients: clientsRes.count || 0,
   });

   // Get recent operations
   const { data: recentOps } = await supabase
    .from('transactions')
    .select(`
          id,
          transaction_number,
          amount_sent,
          status,
          created_at,
          from_currency:currencies!transactions_from_currency_id_fkey(code, symbol),
          to_currency:currencies!transactions_to_currency_id_fkey(code, symbol),
          user:profiles!transactions_user_id_fkey(first_name, last_name)
        `)
    .order('created_at', { ascending: false })
    .limit(5);

   if (recentOps) {
    setRecentOperations(recentOps as unknown as RecentOperation[]);
   }

   // If Super Admin, get delayed payments and user status
   if (profileData?.role === 'SUPER_ADMIN') {
    // Get delayed payments (taken > 15 minutes ago, not completed)
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    const { data: delayedOps } = await supabase
     .from('transactions')
     .select(`
          id,
          transaction_number,
          taken_at,
          taken_by:profiles!transactions_taken_by_fkey(first_name, last_name)
        `)
     .eq('status', 'TAKEN')
     .lt('taken_at', fifteenMinutesAgo)
     .order('taken_at', { ascending: true })
     .limit(5);

    if (delayedOps) {
     const delayed: DelayedPayment[] = delayedOps.map((op: any) => ({
      id: op.id,
      transaction_number: op.transaction_number || `OP-${op.id.slice(0, 8)}`,
      taken_at: op.taken_at,
      taken_by_name: op.taken_by ? `${op.taken_by.first_name} ${op.taken_by.last_name}` : 'Desconocido',
      minutes_delayed: Math.floor((Date.now() - new Date(op.taken_at).getTime()) / 60000),
     }));
     setDelayedPayments(delayed);
    }

    // Get internal user status (simulate online/offline based on recent activity)
    // For now, we count total internal users as "online" is hard without realtime presence
    const { count: totalInternal } = await supabase
     .from('profiles')
     .select('id', { count: 'exact', head: true })
     .in('role', ['ADMIN', 'CAJERO']);

    setUserStatus({
     online: 0, // Would require realtime presence to track
     offline: totalInternal || 0,
    });
   }
  } catch (error) {
   console.error('Error loading dashboard:', error);
  } finally {
   setLoading(false);
  }
 };

 const copyAgentCode = () => {
  if (profile?.agent_code) {
   navigator.clipboard.writeText(profile.agent_code);
   setCopied(true);
   setTimeout(() => setCopied(false), 2000);
  }
 };

 const getStatusBadge = (status: string) => {
  const badges: Record<string, { label: string; class: string }> = {
   POOL: { label: 'En Pool', class: 'bg-blue-100 text-blue-700 border-blue-200' },
   TAKEN: { label: 'Tomada', class: 'bg-amber-100 text-amber-700 border-amber-200' },
   VERIFYING: { label: 'Verificando', class: 'bg-purple-100 text-purple-700 border-purple-200' },
   COMPLETED: { label: 'Completada', class: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
   REJECTED: { label: 'Rechazada', class: 'bg-red-100 text-red-700 border-red-200' },
  };
  return badges[status] || { label: status, class: 'bg-gray-100 text-gray-700 border-gray-200' };
 };

 if (loading) {
  return (
   <div className="flex items-center justify-center min-h-[50vh]">
    <RefreshCw className="w-8 h-8 text-slate-400 animate-spin" />
   </div>
  );
 }

 return (
  <div className="space-y-6">
   {/* Metrics Grid */}
   <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
    {/* Pool Count */}
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
     <div className="flex items-center justify-between mb-3">
      <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
       <Inbox className="text-blue-600" size={24} />
      </div>
      {metrics.poolCount > 0 && (
       <span className="px-2.5 py-1 bg-blue-500 text-white text-xs font-bold rounded-full animate-pulse">
        {metrics.poolCount}
       </span>
      )}
     </div>
     <p className="text-sm text-slate-500 mb-1">Operaciones en Pool</p>
     <p className="text-3xl font-bold text-slate-800">{metrics.poolCount}</p>
    </div>

    {/* Taken Count */}
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
     <div className="flex items-center justify-between mb-3">
      <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
       <Clock className="text-amber-600" size={24} />
      </div>
     </div>
     <p className="text-sm text-slate-500 mb-1">En Proceso</p>
     <p className="text-3xl font-bold text-slate-800">{metrics.takenCount}</p>
    </div>

    {/* Completed Today */}
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
     <div className="flex items-center justify-between mb-3">
      <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
       <CheckCircle2 className="text-emerald-600" size={24} />
      </div>
     </div>
     <p className="text-sm text-slate-500 mb-1">Completadas Hoy</p>
     <p className="text-3xl font-bold text-slate-800">{metrics.completedToday}</p>
    </div>

    {/* Commissions */}
    <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
     <div className="flex items-center justify-between mb-3">
      <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center">
       <Coins className="text-amber-400" size={24} />
      </div>
     </div>
     <p className="text-sm text-white/60 mb-1">Comisiones del Mes</p>
     <p className="text-3xl font-bold text-white">${metrics.monthlyCommissions.toFixed(2)}</p>
    </div>
   </div>

   {/* Quick Actions + Agent Code */}
   <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
    {/* Recent Operations */}
    <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
     <div className="flex items-center justify-between p-5 border-b border-slate-100">
      <h3 className="font-bold text-slate-800">Operaciones Recientes</h3>
      <Link
       href="/panel/pool"
       className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 font-medium"
      >
       Ver todas
       <ArrowRight size={16} />
      </Link>
     </div>

     {recentOperations.length === 0 ? (
      <div className="p-8 text-center">
       <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <Inbox className="text-slate-400" size={32} />
       </div>
       <p className="text-slate-500">No hay operaciones recientes</p>
      </div>
     ) : (
      <div className="divide-y divide-slate-100">
       {recentOperations.map((op) => (
        <div key={op.id} className="p-4 hover:bg-slate-50 transition-colors">
         <div className="flex items-center justify-between">
          <div>
           <p className="font-semibold text-slate-800">
            {op.transaction_number || `OP-${op.id.slice(0, 8)}`}
           </p>
           <p className="text-sm text-slate-500">
            {op.user?.first_name} {op.user?.last_name}
           </p>
          </div>
          <div className="text-right">
           <p className="font-bold text-slate-800">
            {op.from_currency?.symbol}{op.amount_sent?.toFixed(2)} {op.from_currency?.code}
           </p>
           <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full border ${getStatusBadge(op.status).class}`}>
            {getStatusBadge(op.status).label}
           </span>
          </div>
         </div>
        </div>
       ))}
      </div>
     )}
    </div>

    {/* Agent Code + Quick Stats */}
    <div className="space-y-6">
     {/* Agent Code */}
     {profile?.role !== 'SUPER_ADMIN' && profile?.agent_code && (
      <div className="bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl p-5 text-white shadow-lg">
       <h3 className="font-bold mb-2">Tu Código de Agente</h3>
       <p className="text-sm text-white/70 mb-4">
        Comparte este código con tus clientes
       </p>
       <div className="flex items-center gap-2">
        <code className="flex-1 bg-white/20 backdrop-blur px-4 py-3 rounded-xl font-mono text-xl font-bold">
         {profile.agent_code}
        </code>
        <button
         onClick={copyAgentCode}
         className="p-3 bg-white/20 hover:bg-white/30 rounded-xl transition-colors"
        >
         {copied ? <Check size={20} /> : <Copy size={20} />}
        </button>
       </div>
      </div>
     )}

     {/* Quick Stats */}
     <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
      <h3 className="font-bold text-slate-800 mb-4">Resumen</h3>
      <div className="space-y-4">
       <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
         <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
          <Users className="text-purple-600" size={20} />
         </div>
         <span className="text-slate-600">Total Clientes</span>
        </div>
        <span className="font-bold text-slate-800">{metrics.totalClients}</span>
       </div>
       <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
         <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
          <TrendingUp className="text-emerald-600" size={20} />
         </div>
         <span className="text-slate-600">Tasa Activa</span>
        </div>
        <span className="font-bold text-emerald-600">Activo</span>
       </div>
      </div>
     </div>

     {/* Help for ADMIN/CAJERO or Alerts for SUPER_ADMIN */}
     {profile?.role === 'SUPER_ADMIN' ? (
      <div className="bg-slate-800 rounded-2xl p-5 text-white">
       <div className="flex items-center gap-2 mb-4">
        <Bell className="text-amber-400" size={20} />
        <h4 className="font-bold">Alertas del Sistema</h4>
       </div>

       {/* Delayed Payments */}
       <div className="space-y-3">
        {delayedPayments.length > 0 ? (
         <>
          <div className="flex items-center gap-2 text-red-400 text-sm font-medium">
           <AlertTriangle size={16} />
           <span>Pagos Demorados ({delayedPayments.length})</span>
          </div>
          {delayedPayments.slice(0, 3).map((delayed) => (
           <div key={delayed.id} className="bg-red-500/20 border border-red-500/30 rounded-lg p-3">
            <div className="flex justify-between items-start">
             <div>
              <p className="font-medium text-sm">{delayed.transaction_number}</p>
              <p className="text-xs text-white/60">{delayed.taken_by_name}</p>
             </div>
             <span className="text-xs bg-red-500 px-2 py-1 rounded-full">
              {delayed.minutes_delayed} min
             </span>
            </div>
           </div>
          ))}
         </>
        ) : (
         <div className="flex items-center gap-2 text-emerald-400 text-sm">
          <CheckCircle2 size={16} />
          <span>Sin pagos demorados</span>
         </div>
        )}
       </div>

       {/* User Status */}
       <div className="mt-4 pt-4 border-t border-white/10">
        <p className="text-xs text-white/50 mb-2">Usuarios Internos</p>
        <div className="flex gap-3">
         <div className="flex items-center gap-1">
          <UserCheck size={14} className="text-emerald-400" />
          <span className="text-sm">{userStatus.online} en línea</span>
         </div>
         <div className="flex items-center gap-1">
          <UserX size={14} className="text-slate-400" />
          <span className="text-sm text-white/60">{userStatus.offline} registrados</span>
         </div>
        </div>
       </div>
      </div>
     ) : (
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
       <div className="flex items-start gap-3">
        <AlertCircle className="text-amber-600 flex-shrink-0 mt-0.5" size={20} />
        <div>
         <h4 className="font-semibold text-amber-800 mb-1">¿Necesitas ayuda?</h4>
         <p className="text-sm text-amber-700">
          Contacta al Super Admin para soporte técnico o consultas.
         </p>
        </div>
       </div>
      </div>
     )}
    </div>
   </div>
  </div>
 );
}
