'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import {
  Settings,
  Bell,
  Building2,
  Shield,
  User,
  Bot,
  Loader2,
  AlertTriangle
} from 'lucide-react';

// Componentes de tabs
import ParametrosTab from './components/ParametrosTab';
import InfoNegocioTab from './components/InfoNegocioTab';
import NotificacionesTab from './components/NotificacionesTab';
import SeguridadTab from './components/SeguridadTab';
import MiCuentaTab from './components/MiCuentaTab';
import AgenteIATab from './components/AgenteIATab';

// Tipos
interface UserProfile {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  whatsapp_number: string | null;
  role: 'SUPER_ADMIN' | 'ADMIN' | 'CAJERO' | 'SUPERVISOR' | 'CLIENT';
  two_factor_method?: 'none' | 'email' | 'totp';
  two_factor_verified?: boolean;
}

type TabId = 'parametros' | 'notificaciones' | 'negocio' | 'seguridad' | 'cuenta' | 'agente';

interface Tab {
  id: TabId;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  description: string;
}

const allTabs: Tab[] = [
  { id: 'parametros', label: 'Parámetros', icon: Settings, description: 'Timer, penalizaciones y comisiones' },
  { id: 'notificaciones', label: 'Notificaciones', icon: Bell, description: 'WhatsApp y Email' },
  { id: 'negocio', label: 'Negocio', icon: Building2, description: 'Info, horarios y políticas' },
  { id: 'seguridad', label: 'Seguridad', icon: Shield, description: '2FA personal' },
  { id: 'cuenta', label: 'Mi Cuenta', icon: User, description: 'Email y contraseña' },
  { id: 'agente', label: 'Agente IA', icon: Bot, description: 'Configuración del bot' },
];

export default function ConfiguracionPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>('parametros');

  useEffect(() => {
    checkAuthorization();
  }, []);

  const checkAuthorization = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push('/backoffice');
        return;
      }

      const { data: profileData, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email, whatsapp_number, role, two_factor_method, two_factor_verified')
        .eq('id', user.id)
        .single();

      if (error || !profileData) {
        router.push('/panel');
        return;
      }

      // Verificación: usuarios internos pueden acceder (2FA personal)
      // SUPER_ADMIN ve todo, otros roles solo ven Seguridad
      const allowedRoles = ['SUPER_ADMIN', 'ADMIN', 'CAJERO', 'SUPERVISOR', 'OPERATOR'];
      if (!allowedRoles.includes(profileData.role)) {
        router.push('/panel');
        return;
      }

      setProfile(profileData as UserProfile);
      setAuthorized(true);
    } catch (error) {
      console.error('Error de autorización:', error);
      router.push('/panel');
    } finally {
      setLoading(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-slate-600" />
          <p className="text-slate-500">Verificando autorización...</p>
        </div>
      </div>
    );
  }

  // No autorizado (fallback, debería redirigir antes)
  if (!authorized || !profile) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-800 mb-2">Acceso Denegado</h2>
          <p className="text-slate-500">No tienes permisos para acceder a esta sección.</p>
        </div>
      </div>
    );
  }

  const ActiveTabIcon = allTabs.find(t => t.id === activeTab)?.icon || Settings;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-2xl p-6 text-white">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-white/10 rounded-xl">
            <Settings className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Configuración del Sistema</h1>
            <p className="text-white/70 text-sm">
              Solo accesible para {profile.role === 'SUPER_ADMIN' ? 'Super Administrador' : 'Usuarios Internos'} • {profile.first_name} {profile.last_name}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs Navigation - Solo SUPER_ADMIN ve todas las allTabs */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="flex overflow-x-auto border-b border-slate-200">
          {(profile?.role === 'SUPER_ADMIN' ? allTabs : allTabs.filter(t => t.id === 'seguridad')).map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-5 py-4 text-sm font-medium whitespace-nowrap transition-all border-b-2 -mb-px ${isActive
                  ? 'border-[#AB2820] text-[#AB2820] bg-red-50/50'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                  }`}
              >
                <Icon size={18} />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {/* Tab Header */}
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
            <div className={`p-2.5 rounded-xl bg-gradient-to-br ${activeTab === 'parametros' ? 'from-blue-500 to-blue-600' :
              activeTab === 'notificaciones' ? 'from-green-500 to-green-600' :
                activeTab === 'negocio' ? 'from-purple-500 to-purple-600' :
                  activeTab === 'seguridad' ? 'from-amber-500 to-amber-600' :
                    activeTab === 'cuenta' ? 'from-slate-500 to-slate-600' :
                      'from-cyan-500 to-cyan-600'
              }`}>
              <ActiveTabIcon size={20} className="text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-800">
                {allTabs.find(t => t.id === activeTab)?.label}
              </h2>
              <p className="text-sm text-slate-500">
                {allTabs.find(t => t.id === activeTab)?.description}
              </p>
            </div>
          </div>

          {/* Contenido de cada tab */}
          {activeTab === 'parametros' && <ParametrosTab />}

          {activeTab === 'notificaciones' && (
            <div className="bg-slate-900/50 rounded-2xl p-6 border border-white/10">
              <NotificacionesTab />
            </div>
          )}

          {activeTab === 'negocio' && <InfoNegocioTab />}

          {activeTab === 'seguridad' && (
            <div className="bg-slate-900/50 rounded-2xl p-6 border border-white/10">
              <SeguridadTab userRole={profile?.role || 'CLIENT'} />
            </div>
          )}

          {activeTab === 'cuenta' && (
            <div className="bg-slate-900/50 rounded-2xl p-6 border border-white/10">
              <MiCuentaTab
                userRole={profile?.role as 'SUPER_ADMIN' | 'ADMIN' | 'CAJERO' | 'SUPERVISOR'}
                userEmail={profile?.email || ''}
                userPhone={profile?.whatsapp_number || ''}
                user2FAEnabled={profile?.two_factor_method !== 'none' && profile?.two_factor_verified === true}
              />
            </div>
          )}

          {activeTab === 'agente' && (
            <div className="bg-slate-900/50 rounded-2xl p-6 border border-white/10">
              <AgenteIATab />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
