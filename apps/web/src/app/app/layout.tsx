'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import {
  Home,
  ArrowRightLeft,
  History,
  Wallet,
  User,
  LogOut,
  ChevronDown,
  MoreHorizontal
} from 'lucide-react';
import { supabase } from '@/lib/supabase/client';

interface UserProfile {
  first_name: string;
  last_name: string;
  email: string;
  is_kyc_verified: boolean;
  role: string;
}

interface BusinessConfig {
  business_name: string;
  logo_url: string;
}

const navItems = [
  { href: '/app', label: 'Inicio', icon: Home },
  { href: '/app/operaciones', label: 'Operación', icon: ArrowRightLeft },
  { href: '/app/historial', label: 'Historial', icon: History },
  { href: '/app/beneficiarios', label: 'Cuentas', icon: Wallet },
  { href: '/app/perfil', label: 'Perfil', icon: User },
];

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const menuRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const [businessConfig, setBusinessConfig] = useState<BusinessConfig>({
    business_name: 'Fengxchange',
    logo_url: '',
  });

  // Rutas que no requieren KYC verificado
  const kycExemptPaths = [
    '/app/verificar-identidad',
    '/app/verificar-identidad/callback',
  ];

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data } = await supabase
            .from('profiles')
            .select('first_name, last_name, email, is_kyc_verified, role')
            .eq('id', user.id)
            .single();
          if (data) {
            setProfile(data);

            // Verificar si el usuario necesita KYC
            const needsKyc = ['CLIENT', 'AFFILIATE'].includes(data.role) && !data.is_kyc_verified;
            const isExemptPath = kycExemptPaths.some(path => pathname.startsWith(path));

            if (needsKyc && !isExemptPath) {
              router.push('/app/verificar-identidad');
              return;
            }
          }
        }
      } catch (error) {
        console.error('Error loading profile:', error);
      }
      setIsLoading(false);
    };
    const loadBusinessConfig = async () => {
      try {
        const response = await fetch('/api/public/business');
        if (response.ok) {
          const data = await response.json();
          if (data.info) {
            setBusinessConfig({
              business_name: data.info.business_name || 'Fengxchange',
              logo_url: data.info.logo_url || '',
            });
          }
        }
      } catch (error) {
        console.error('Error loading business config:', error);
      }
    };
    loadProfile();
    loadBusinessConfig();
  }, [pathname, router]);

  // Close menu when clicking outside (only when menu is open)
  useEffect(() => {
    if (!showUserMenu) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const isOutsideDesktop = menuRef.current && !menuRef.current.contains(target);
      const isOutsideMobile = mobileMenuRef.current && !mobileMenuRef.current.contains(target);

      // Only close if click is outside BOTH menus (one may be null/hidden)
      if ((menuRef.current === null || isOutsideDesktop) &&
        (mobileMenuRef.current === null || isOutsideMobile)) {
        setShowUserMenu(false);
      }
    };
    // Use mousedown to close before click propagates
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showUserMenu]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const getInitials = () => {
    if (!profile) return 'U';
    return `${profile.first_name?.[0] || ''}${profile.last_name?.[0] || ''}`.toUpperCase() || 'U';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#05294F]"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 pb-20 md:pb-0">
      {/* Header - Desktop con navegación, Móvil simplificado */}
      <header className="bg-gradient-to-r from-[#05294F] to-[#07478F] shadow-lg sticky top-0 z-50">
        <div className="container-app flex items-center justify-between h-14 md:h-16">
          {/* Logo */}
          <Link href="/app" className="flex items-center no-underline">
            {businessConfig.logo_url ? (
              <img
                src={businessConfig.logo_url}
                alt={businessConfig.business_name}
                className="h-10 md:h-12 w-auto object-contain"
              />
            ) : (
              <div className="w-9 h-9 md:w-10 md:h-10 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
                <span className="text-white font-bold text-lg md:text-xl">{businessConfig.business_name.charAt(0)}</span>
              </div>
            )}
          </Link>

          {/* Navegación Desktop - Oculta en móvil */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all no-underline ${isActive
                    ? 'bg-white/20 text-white'
                    : 'text-white/70 hover:text-white hover:bg-white/10'
                    }`}
                >
                  <Icon size={18} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Usuario y Menú - Desktop */}
          <div className="hidden md:flex items-center gap-3" ref={menuRef}>
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 bg-white/10 hover:bg-white/20 rounded-xl px-3 py-2 transition-all"
              >
                <div className="w-8 h-8 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                  {getInitials()}
                </div>
                <span className="text-white text-sm font-medium max-w-[120px] truncate">
                  {profile?.first_name || 'Usuario'}
                </span>
                <ChevronDown size={16} className={`text-white/70 transition-transform ${showUserMenu ? 'rotate-180' : ''}`} />
              </button>

              {/* Dropdown Menu - Solo cerrar sesión */}
              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-100 py-2 animate-in fade-in slide-in-from-top-2 duration-200 z-50">
                  <div className="px-4 py-3 border-b border-gray-100">
                    <p className="text-sm font-semibold text-gray-900">{profile?.first_name} {profile?.last_name}</p>
                    <p className="text-xs text-gray-500 truncate">{profile?.email}</p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleLogout();
                    }}
                    className="flex items-center gap-3 px-4 py-2.5 text-red-600 hover:bg-red-50 w-full transition-colors"
                  >
                    <LogOut size={18} />
                    <span className="text-sm font-medium">Cerrar Sesión</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Avatar Móvil - Solo visible en móvil */}
          <div className="md:hidden relative" ref={mobileMenuRef}>
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 bg-white/10 hover:bg-white/20 rounded-xl p-2 transition-all"
            >
              <div className="w-8 h-8 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                {getInitials()}
              </div>
              <MoreHorizontal size={18} className="text-white/70" />
            </button>

            {/* Dropdown Menu Móvil */}
            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-100 py-2 animate-in fade-in slide-in-from-top-2 duration-200 z-50">
                <div className="px-4 py-3 border-b border-gray-100">
                  <p className="text-sm font-semibold text-gray-900">{profile?.first_name} {profile?.last_name}</p>
                  <p className="text-xs text-gray-500 truncate">{profile?.email}</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-3 px-4 py-2.5 text-red-600 hover:bg-red-50 w-full transition-colors"
                >
                  <LogOut size={18} />
                  <span className="text-sm font-medium">Cerrar Sesión</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header >

      {/* Contenido principal - Con padding inferior para el bottom nav en móvil */}
      < main className="container-app py-6 md:py-8" > {children}</main >

      {/* Footer Desktop */}
      < footer className="hidden md:block border-t border-gray-200 bg-white/50 mt-auto" >
        <div className="container-app py-4 text-center">
          <p className="text-xs text-gray-400">© 2026 {businessConfig.business_name}. Todos los derechos reservados.</p>
        </div>
      </footer >

      {/* Bottom Navigation - Solo móvil/tablet (fixed en la parte inferior) */}
      < nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-50 safe-area-bottom" >
        <div className="flex items-center justify-around h-16">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center justify-center flex-1 h-full py-2 no-underline transition-colors ${isActive
                  ? 'text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
                  }`}
              >
                <div className={`p-1.5 rounded-xl transition-all ${isActive ? 'bg-blue-100' : ''}`}>
                  <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
                </div>
                <span className={`text-[10px] mt-0.5 font-medium ${isActive ? 'text-blue-600' : 'text-gray-500'}`}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav >
    </div >
  );
}
