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

// Tipos
interface UserProfile {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: 'SUPER_ADMIN' | 'ADMIN' | 'CAJERO' | 'SUPERVISOR' | 'CLIENT';
}

type TabId = 'parametros' | 'notificaciones' | 'negocio' | 'seguridad' | 'cuenta' | 'agente';

interface Tab {
  id: TabId;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  description: string;
}

const tabs: Tab[] = [
  { id: 'parametros', label: 'Parámetros', icon: Settings, description: 'Timer, penalizaciones y comisiones' },
  { id: 'notificaciones', label: 'Notificaciones', icon: Bell, description: 'WhatsApp y Email' },
  { id: 'negocio', label: 'Negocio', icon: Building2, description: 'Info, horarios y políticas' },
  { id: 'seguridad', label: 'Seguridad', icon: Shield, description: 'Rate limit, 2FA, auditoría' },
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
        .select('id, first_name, last_name, email, role')
        .eq('id', user.id)
        .single();

      if (error || !profileData) {
        router.push('/panel');
        return;
      }

      // Verificación estricta: SOLO SUPER_ADMIN
      if (profileData.role !== 'SUPER_ADMIN') {
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

  const ActiveTabIcon = tabs.find(t => t.id === activeTab)?.icon || Settings;

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
              Solo accesible para Super Administrador • {profile.first_name} {profile.last_name}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="flex overflow-x-auto border-b border-slate-200">
          {tabs.map((tab) => {
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
                {tabs.find(t => t.id === activeTab)?.label}
              </h2>
              <p className="text-sm text-slate-500">
                {tabs.find(t => t.id === activeTab)?.description}
              </p>
            </div>
          </div>

          {/* Contenido de cada tab */}
          {activeTab === 'parametros' && <ParametrosTab />}

          {activeTab === 'notificaciones' && (
            <div className="text-center py-12 text-slate-400">
              <Bell size={48} className="mx-auto mb-4 opacity-50" />
              <p>Configuración de notificaciones</p>
              <p className="text-sm mt-2">Se implementará en la Fase 4</p>
            </div>
          )}

          {activeTab === 'negocio' && (
            <div className="text-center py-12 text-slate-400">
              <Building2 size={48} className="mx-auto mb-4 opacity-50" />
              <p>Información del negocio</p>
              <p className="text-sm mt-2">Se implementará en la Fase 3</p>
            </div>
          )}

          {activeTab === 'seguridad' && (
            <div className="text-center py-12 text-slate-400">
              <Shield size={48} className="mx-auto mb-4 opacity-50" />
              <p>Configuración de seguridad</p>
              <p className="text-sm mt-2">Se implementará en la Fase 5</p>
            </div>
          )}

          {activeTab === 'cuenta' && (
            <div className="text-center py-12 text-slate-400">
              <User size={48} className="mx-auto mb-4 opacity-50" />
              <p>Gestión de credenciales</p>
              <p className="text-sm mt-2">Se implementará en la Fase 6</p>
            </div>
          )}

          {activeTab === 'agente' && (
            <div className="text-center py-12 text-slate-400">
              <Bot size={48} className="mx-auto mb-4 opacity-50" />
              <p>Configuración del Agente IA</p>
              <p className="text-sm mt-2">Se implementará en la Fase 7</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
