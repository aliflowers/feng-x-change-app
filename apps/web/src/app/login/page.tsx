'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { Eye, EyeOff, Mail, Lock, ArrowRight, Shield, Zap, Globe } from 'lucide-react';

interface BusinessConfig {
  business_name: string;
  logo_url: string;
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [businessConfig, setBusinessConfig] = useState<BusinessConfig>({
    business_name: 'Fengxchange',
    logo_url: '',
  });

  useEffect(() => {
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
    loadBusinessConfig();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        setError(authError.message);
        return;
      }

      if (data.user) {
        // Obtener el perfil para saber el rol y estado KYC
        const { data: profile } = await supabase
          .from('profiles')
          .select('role, is_kyc_verified')
          .eq('id', data.user.id)
          .single();

        // Redirigir según el rol y verificación
        router.refresh();
        if (profile) {
          // Si el usuario pertenece a la administración (NO es Cliente ni Afiliado)
          // tiene ABSOLUTAMENTE prohibido entrar por este login.
          if (!['CLIENT', 'AFFILIATE'].includes(profile.role)) {
            await supabase.auth.signOut();
            setError('Acceso denegado. El personal administrativo debe ingresar por el acceso administrativo');
            setLoading(false);
            return;
          }

          const needsKyc = !profile.is_kyc_verified;

          if (needsKyc) {
            router.push('/app/verificar-identidad');
          } else {
            router.push('/app');
          }
        } else {
          router.push('/app');
        }
      }
    } catch (err) {
      console.error(err);
      setError('Error al iniciar sesión. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex">
      {/* Panel Izquierdo - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-[#05294F] via-[#07478F] to-[#0a5cb8] relative overflow-hidden">
        {/* Decoraciones de fondo */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-10 w-72 h-72 bg-white rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-amber-400 rounded-full blur-3xl"></div>
        </div>

        {/* Contenido */}
        <div className="relative z-10 flex flex-col justify-center px-12 xl:px-20">
          {/* Logo */}
          <Link href="/" className="mb-12 no-underline">
            {businessConfig.logo_url ? (
              <img
                src={businessConfig.logo_url}
                alt={businessConfig.business_name}
                className="h-16 w-auto object-contain"
              />
            ) : (
              <div className="w-16 h-16 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center">
                <span className="text-white font-bold text-2xl">{businessConfig.business_name.charAt(0)}</span>
              </div>
            )}
          </Link>

          {/* Título principal */}
          <h1 className="text-4xl xl:text-5xl font-bold text-white mb-6 leading-tight">
            Bienvenido de vuelta a tu plataforma de
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-400"> cambio de divisas</span>
          </h1>

          <p className="text-white/70 text-lg mb-12 max-w-md">
            Accede a tu cuenta y realiza transferencias internacionales de forma rápida y segura.
          </p>

          {/* Features */}
          <div className="space-y-4">
            {[
              { icon: Shield, text: 'Transacciones 100% seguras' },
              { icon: Zap, text: 'Transferencias en minutos' },
              { icon: Globe, text: 'Cobertura internacional' },
            ].map((feature, i) => (
              <div key={i} className="flex items-center gap-4 text-white/80">
                <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
                  <feature.icon size={20} className="text-amber-400" />
                </div>
                <span>{feature.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Panel Derecho - Formulario */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-8 lg:p-12 bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="w-full max-w-md">
          {/* Logo móvil */}
          <div className="lg:hidden text-center mb-8">
            <Link href="/" className="inline-block no-underline">
              {businessConfig.logo_url ? (
                <img
                  src={businessConfig.logo_url}
                  alt={businessConfig.business_name}
                  className="h-14 w-auto object-contain"
                />
              ) : (
                <div className="w-14 h-14 bg-gradient-to-br from-[#05294F] to-[#07478F] rounded-xl flex items-center justify-center mx-auto">
                  <span className="text-white font-bold text-xl">{businessConfig.business_name.charAt(0)}</span>
                </div>
              )}
            </Link>
          </div>

          {/* Título del formulario */}
          <div className="text-center lg:text-left mb-8">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
              Iniciar Sesión
            </h2>
            <p className="text-gray-500">
              Ingresa tus credenciales para acceder
            </p>
          </div>

          {/* Card de login */}
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 sm:p-8">
            <form onSubmit={handleLogin} className="space-y-5">
              {/* Error */}
              {error && (
                <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm flex items-center gap-3">
                  <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-red-500">!</span>
                  </div>
                  {error}
                </div>
              )}

              {/* Email */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Correo electrónico
                </label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                    <Mail size={20} />
                  </div>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 pl-12 text-gray-900 focus:ring-2 focus:ring-[#05294F] focus:border-transparent transition-all"
                    placeholder="tu@email.com"
                    required
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                  Contraseña
                </label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                    <Lock size={20} />
                  </div>
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 pl-12 pr-12 text-gray-900 focus:ring-2 focus:ring-[#05294F] focus:border-transparent transition-all"
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              {/* Olvidé contraseña */}
              <div className="text-right">
                <Link href="/forgot-password" className="text-sm text-[#05294F] hover:text-[#07478F] font-medium no-underline">
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-[#05294F] to-[#07478F] hover:from-[#063a6b] hover:to-[#0862b0] text-white font-semibold py-4 rounded-xl transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Iniciando sesión...
                  </span>
                ) : (
                  <>
                    Iniciar Sesión
                    <ArrowRight size={20} />
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-gray-400">o</span>
            </div>
          </div>

          {/* Registrarse */}
          <div className="text-center">
            <p className="text-gray-500 text-sm">
              ¿No tienes cuenta?{' '}
              <Link href="/register" className="text-[#05294F] font-semibold hover:underline no-underline">
                Regístrate gratis
              </Link>
            </p>
          </div>
        </div>

        {/* Volver */}
        <div className="mt-8 text-center">
          <Link href="/" className="inline-flex items-center gap-2 text-gray-500 text-sm hover:text-gray-700 transition-colors no-underline">
            <ArrowRight size={16} className="rotate-180" />
            Volver al inicio
          </Link>
        </div>
      </div>
    </main>
  );
}
