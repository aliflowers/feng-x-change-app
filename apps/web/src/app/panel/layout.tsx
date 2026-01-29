'use client';

import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import {
  LayoutDashboard,
  Inbox,
  History,
  Users,
  Coins,
  Building2,
  TrendingUp,
  Settings,
  UserCog,
  DollarSign,
  LogOut,
  Menu,
  X,
  ChevronRight,
  Shield
} from 'lucide-react';

interface UserProfile {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: 'SUPER_ADMIN' | 'ADMIN' | 'CAJERO' | 'SUPERVISOR';
}

const menuItems = [
  { href: '/panel', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/panel/pool', label: 'Pool de Operaciones', icon: Inbox },
  { href: '/panel/operaciones', label: 'Historial', icon: History },
  { href: '/panel/clientes', label: 'Clientes', icon: Users },
  { href: '/panel/comisiones', label: 'Comisiones', icon: Coins },
  { href: '/panel/bancos', label: 'Bancos', icon: Building2 },
  { href: '/panel/tasas', label: 'Tasas de Cambio', icon: TrendingUp },
];

const adminOnlyItems = [
  { href: '/panel/usuarios', label: 'Usuarios', icon: UserCog },
  { href: '/panel/ganancias', label: 'Ganancias', icon: DollarSign },
];

const configItems = [
  { href: '/panel/configuracion', label: 'Configuración', icon: Settings },
];

export default function PanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/backoffice');
        return;
      }

      const { data: profileData } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email, role')
        .eq('id', user.id)
        .single();

      if (profileData) {
        // Verificar que sea un rol interno
        if (!['SUPER_ADMIN', 'ADMIN', 'CAJERO', 'SUPERVISOR'].includes(profileData.role)) {
          await supabase.auth.signOut();
          router.push('/backoffice');
          return;
        }
        setProfile(profileData as UserProfile);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/backoffice');
  };

  const isActive = (href: string) => {
    if (href === '/panel') return pathname === '/panel';
    return pathname.startsWith(href);
  };

  const getRoleBadge = (role: string) => {
    const badges: Record<string, { label: string; class: string }> = {
      SUPER_ADMIN: { label: 'Super Admin', class: 'bg-gradient-to-r from-amber-500 to-orange-500' },
      ADMIN: { label: 'Administrador', class: 'bg-gradient-to-r from-blue-500 to-indigo-500' },
      CAJERO: { label: 'Cajero', class: 'bg-gradient-to-r from-emerald-500 to-teal-500' },
      SUPERVISOR: { label: 'Supervisor', class: 'bg-gradient-to-r from-purple-500 to-violet-500' },
    };
    return badges[role] || { label: role, class: 'bg-gray-500' };
  };

  const NavLink = ({ item, onClick }: { item: typeof menuItems[0]; onClick?: () => void }) => {
    const active = isActive(item.href);
    const Icon = item.icon;
    return (
      <Link
        href={item.href}
        onClick={onClick}
        className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${active
          ? 'bg-white/15 text-white shadow-lg shadow-black/10'
          : 'text-white/70 hover:bg-white/10 hover:text-white'
          }`}
      >
        <Icon size={20} className={active ? 'text-amber-400' : 'text-white/50 group-hover:text-white/70'} />
        <span className="font-medium">{item.label}</span>
        {active && <ChevronRight size={16} className="ml-auto text-amber-400" />}
      </Link>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-slate-300 border-t-slate-800 rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-slate-200">
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 h-full w-72 bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 z-50 transform transition-transform duration-300 lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
      >
        {/* Logo */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-[#AB2820] to-[#8B2E34] rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-white font-bold text-lg">F</span>
            </div>
            <div>
              <h1 className="text-white font-bold text-lg">Fengxchange</h1>
              <p className="text-amber-400 text-xs font-medium">Panel Admin</p>
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-white/50 hover:text-white"
          >
            <X size={24} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-1 overflow-y-auto h-[calc(100vh-200px)]">
          {/* Main Menu */}
          <p className="text-white/40 text-xs font-semibold uppercase tracking-wider px-4 mb-2">
            Menú Principal
          </p>
          {menuItems.map((item) => (
            <NavLink key={item.href} item={item} onClick={() => setSidebarOpen(false)} />
          ))}

          {/* Admin Only */}
          {profile?.role === 'SUPER_ADMIN' && (
            <>
              <div className="my-4 border-t border-white/10" />
              <p className="text-white/40 text-xs font-semibold uppercase tracking-wider px-4 mb-2">
                Super Admin
              </p>
              {adminOnlyItems.map((item) => (
                <NavLink key={item.href} item={item} onClick={() => setSidebarOpen(false)} />
              ))}
            </>
          )}

          {/* Config - Solo Super Admin */}
          {profile?.role === 'SUPER_ADMIN' && (
            <>
              <div className="my-4 border-t border-white/10" />
              <p className="text-white/40 text-xs font-semibold uppercase tracking-wider px-4 mb-2">
                Sistema
              </p>
              {configItems.map((item) => (
                <NavLink key={item.href} item={item} onClick={() => setSidebarOpen(false)} />
              ))}
            </>
          )}
        </nav>

        {/* User Profile */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-white/10 bg-slate-900/50 backdrop-blur">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-gradient-to-br from-slate-600 to-slate-700 rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-sm">
                {profile?.first_name?.[0]}{profile?.last_name?.[0]}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-medium text-sm truncate">
                {profile?.first_name} {profile?.last_name}
              </p>
              <span className={`text-xs px-2 py-0.5 rounded-full text-white ${getRoleBadge(profile?.role || '').class}`}>
                {getRoleBadge(profile?.role || '').label}
              </span>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white rounded-xl transition-all"
          >
            <LogOut size={18} />
            <span className="text-sm font-medium">Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="lg:ml-72">
        {/* Header */}
        <header className="bg-white/80 backdrop-blur-lg sticky top-0 z-30 border-b border-slate-200">
          <div className="flex items-center justify-between h-16 px-4 lg:px-6">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 hover:bg-slate-100 rounded-xl transition-colors"
              >
                <Menu size={24} className="text-slate-600" />
              </button>
              <div>
                <h2 className="text-lg font-bold text-slate-800">
                  {menuItems.find(i => isActive(i.href))?.label ||
                    adminOnlyItems.find(i => isActive(i.href))?.label ||
                    configItems.find(i => isActive(i.href))?.label ||
                    'Panel'}
                </h2>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {profile?.role === 'SUPER_ADMIN' && (
                <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-amber-50 text-amber-700 rounded-lg border border-amber-200">
                  <Shield size={16} />
                  <span className="text-sm font-medium">Acceso Total</span>
                </div>
              )}
              <div className="hidden md:block text-right">
                <p className="text-sm font-medium text-slate-700">{profile?.first_name} {profile?.last_name}</p>
                <p className="text-xs text-slate-500">{profile?.email}</p>
              </div>
              <div className="w-10 h-10 bg-gradient-to-br from-slate-700 to-slate-800 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-sm">
                  {profile?.first_name?.[0]}{profile?.last_name?.[0]}
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
