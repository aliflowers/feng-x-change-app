'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
 ArrowRightLeft,
 History,
 Wallet,
 TrendingUp,
 Clock,
 Sparkles,
 ChevronRight
} from 'lucide-react';
import { supabase } from '@/lib/supabase/client';

interface UserProfile {
 first_name: string;
 last_name: string;
}

export default function ClientDashboard() {
 const [profile, setProfile] = useState<UserProfile | null>(null);
 const [greeting, setGreeting] = useState('¡Hola!');

 useEffect(() => {
  const loadProfile = async () => {
   const { data: { user } } = await supabase.auth.getUser();
   if (user) {
    const { data } = await supabase
     .from('profiles')
     .select('first_name, last_name')
     .eq('id', user.id)
     .single();
    if (data) setProfile(data);
   }
  };
  loadProfile();

  // Set greeting based on time
  const hour = new Date().getHours();
  if (hour < 12) setGreeting('¡Buenos días!');
  else if (hour < 18) setGreeting('¡Buenas tardes!');
  else setGreeting('¡Buenas noches!');
 }, []);

 const quickActions = [
  {
   href: '/app/operaciones',
   icon: ArrowRightLeft,
   title: 'Nueva Operación',
   description: 'Envía dinero con las mejores tasas',
   gradient: 'from-blue-500 to-indigo-600',
   iconBg: 'bg-blue-100',
   iconColor: 'text-blue-600'
  },
  {
   href: '/app/historial',
   icon: History,
   title: 'Mi Historial',
   description: 'Ver todas mis operaciones',
   gradient: 'from-emerald-500 to-teal-600',
   iconBg: 'bg-emerald-100',
   iconColor: 'text-emerald-600'
  },
  {
   href: '/app/beneficiarios',
   icon: Wallet,
   title: 'Mis Cuentas',
   description: 'Administrar cuentas beneficiarias',
   gradient: 'from-amber-500 to-orange-600',
   iconBg: 'bg-amber-100',
   iconColor: 'text-amber-600'
  },
 ];

 return (
  <div className="space-y-8 animate-in fade-in duration-500">
   {/* Saludo y Bienvenida */}
   <div className="relative overflow-hidden bg-gradient-to-br from-[#05294F] via-[#07478F] to-[#0a5bc4] rounded-3xl p-8 text-white shadow-xl">
    <div className="relative z-10">
     <div className="flex items-center gap-2 mb-2">
      <Sparkles className="text-amber-400" size={24} />
      <span className="text-amber-400 font-semibold text-sm uppercase tracking-wider">
       Panel de Cliente
      </span>
     </div>
     <h1 className="text-3xl md:text-4xl font-bold mb-3">
      {greeting} {profile?.first_name || 'Usuario'}
     </h1>
     <p className="text-blue-200 text-lg max-w-2xl">
      Desde aquí puedes realizar operaciones de cambio, ver tu historial y administrar tus cuentas.
     </p>
    </div>
    {/* Decoración */}
    <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
    <div className="absolute bottom-0 left-1/2 w-48 h-48 bg-white/5 rounded-full translate-y-1/2" />
   </div>

   {/* Indicadores rápidos */}
   <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
    <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
     <div className="flex items-center gap-3 mb-3">
      <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
       <TrendingUp className="text-green-600" size={20} />
      </div>
      <span className="text-xs text-gray-500 font-semibold uppercase">Tasa USD/VES</span>
     </div>
     <p className="text-2xl font-bold text-gray-900">--</p>
     <p className="text-xs text-gray-400">Consulta al operar</p>
    </div>

    <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
     <div className="flex items-center gap-3 mb-3">
      <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
       <ArrowRightLeft className="text-blue-600" size={20} />
      </div>
      <span className="text-xs text-gray-500 font-semibold uppercase">Operaciones</span>
     </div>
     <p className="text-2xl font-bold text-gray-900">0</p>
     <p className="text-xs text-gray-400">Este mes</p>
    </div>

    <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
     <div className="flex items-center gap-3 mb-3">
      <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
       <Wallet className="text-amber-600" size={20} />
      </div>
      <span className="text-xs text-gray-500 font-semibold uppercase">Cuentas</span>
     </div>
     <p className="text-2xl font-bold text-gray-900">--</p>
     <p className="text-xs text-gray-400">Registradas</p>
    </div>

    <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
     <div className="flex items-center gap-3 mb-3">
      <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
       <Clock className="text-purple-600" size={20} />
      </div>
      <span className="text-xs text-gray-500 font-semibold uppercase">En proceso</span>
     </div>
     <p className="text-2xl font-bold text-gray-900">0</p>
     <p className="text-xs text-gray-400">Pendientes</p>
    </div>
   </div>

   {/* Acciones rápidas */}
   <div>
    <h2 className="text-xl font-bold text-gray-900 mb-4">Acciones Rápidas</h2>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
     {quickActions.map((action) => {
      const Icon = action.icon;
      return (
       <Link
        key={action.href}
        href={action.href}
        className="group relative bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300 no-underline overflow-hidden"
       >
        {/* Gradient overlay on hover */}
        <div className={`absolute inset-0 bg-gradient-to-br ${action.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-300`} />

        <div className="relative z-10">
         <div className={`w-14 h-14 ${action.iconBg} rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
          <Icon className={action.iconColor} size={28} />
         </div>
         <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
          {action.title}
         </h3>
         <p className="text-sm text-gray-500 mb-4">{action.description}</p>
         <div className="flex items-center text-blue-600 font-semibold text-sm">
          <span>Ir ahora</span>
          <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
         </div>
        </div>
       </Link>
      );
     })}
    </div>
   </div>

   {/* Operaciones Recientes */}
   <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
    <div className="p-6 border-b border-gray-100">
     <div className="flex items-center justify-between">
      <h2 className="text-xl font-bold text-gray-900">Operaciones Recientes</h2>
      <Link
       href="/app/historial"
       className="text-sm font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 no-underline"
      >
       Ver todas <ChevronRight size={16} />
      </Link>
     </div>
    </div>
    <div className="p-12 text-center">
     <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
      <History className="text-gray-400" size={32} />
     </div>
     <h3 className="text-lg font-semibold text-gray-700 mb-2">No tienes operaciones recientes</h3>
     <p className="text-gray-500 mb-6 max-w-md mx-auto">
      Cuando realices tu primera operación de cambio, aparecerá aquí.
     </p>
     <Link
      href="/app/operaciones"
      className="btn-primary inline-flex items-center gap-2"
     >
      <ArrowRightLeft size={20} />
      Realizar mi primera operación
     </Link>
    </div>
   </div>
  </div>
 );
}
