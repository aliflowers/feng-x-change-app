'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { initializeSession } from '@/lib/session-config';
import { Eye, EyeOff, Mail, Lock, ArrowRight, Shield, Users, Settings, AlertTriangle, Smartphone, Clock } from 'lucide-react';

interface BusinessConfig {
  business_name: string;
  logo_url: string;
}

function BackofficeLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionMessage, setSessionMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [businessConfig, setBusinessConfig] = useState<BusinessConfig>({
    business_name: 'Fengxchange',
    logo_url: '',
  });

  // Estados para 2FA
  const [requires2FA, setRequires2FA] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [twoFactorMethod, setTwoFactorMethod] = useState<'totp' | 'email'>('totp');
  const [pendingToken, setPendingToken] = useState<string | null>(null);

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

  // Detectar razón de logout por expiración de sesión
  useEffect(() => {
    const reason = searchParams.get('reason');
    if (reason === 'inactivity') {
      setSessionMessage('Tu sesión expiró por inactividad. Por seguridad, debes iniciar sesión nuevamente.');
    } else if (reason === 'session_expired') {
      setSessionMessage('Tu sesión ha expirado. Por seguridad, debes iniciar sesión nuevamente.');
    }
  }, [searchParams]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSessionMessage(null);
    setLoading(true);

    try {
      // Paso 1: Usar pre-login para validar credenciales SIN crear sesión
      const preLoginRes = await fetch('/api/auth/pre-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const preLoginData = await preLoginRes.json();

      if (!preLoginRes.ok) {
        setError(preLoginData.error || 'Credenciales inválidas o acceso no autorizado.');
        return;
      }

      // Paso 2: Verificar si requiere 2FA
      if (preLoginData.requires2FA) {
        // Guardar token temporal (NO las credenciales)
        setPendingToken(preLoginData.preLoginToken);
        setTwoFactorMethod(preLoginData.twoFactorMethod as 'totp' | 'email');
        setRequires2FA(true);
        return; // Esperar código 2FA
      }

      // Sin 2FA - crear sesión directa con Supabase
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError || !authData.user) {
        setError('Error al crear sesión. Intenta de nuevo.');
        return;
      }

      // Validar Rol de Usuario Administrativo
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', authData.user.id)
        .single();

      if (profile && ['CLIENT', 'AFFILIATE'].includes(profile.role)) {
        await supabase.auth.signOut();
        setError('Acceso denegado. Portal exclusivo para administración. Utiliza /login');
        setLoading(false);
        return;
      }

      // Inicializar datos de sesión en localStorage
      initializeSession();

      router.refresh();
      router.push('/panel');
    } catch (err) {
      console.error(err);
      setError('Error al iniciar sesión. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (!pendingToken) {
      setError('Sesión expirada. Por favor, inicia sesión de nuevo.');
      setRequires2FA(false);
      setLoading(false);
      return;
    }

    try {
      // Verificar código 2FA con el token temporal
      const res = await fetch('/api/auth/2fa/verify-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: twoFactorCode,
          preLoginToken: pendingToken,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Código incorrecto');
        setTwoFactorCode('');
        return;
      }

      // Código válido - Establecer sesión con los tokens del servidor
      if (data.session?.access_token && data.session?.refresh_token) {
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        });

        if (sessionError) {
          console.error('Error estableciendo sesión:', sessionError);
          setError('Error al crear sesión. Intenta de nuevo.');
          return;
        }
      }

      // Inicializar datos de sesión en localStorage
      initializeSession();

      // Limpiar token y redirigir
      setPendingToken(null);
      router.refresh();
      router.push('/panel');
    } catch (err) {
      console.error(err);
      setError('Error al verificar código');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex">
      {/* Panel Izquierdo - Branding Administrativo */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden">
        {/* Decoraciones de fondo */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-20 left-10 w-72 h-72 bg-red-500 rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-amber-500 rounded-full blur-3xl"></div>
        </div>

        {/* Patrón de grid */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0" style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.3) 1px, transparent 0)`,
            backgroundSize: '40px 40px'
          }}></div>
        </div>

        {/* Contenido */}
        <div className="relative z-10 flex flex-col justify-center px-12 xl:px-20">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-12">
            {businessConfig.logo_url ? (
              <img
                src={businessConfig.logo_url}
                alt={businessConfig.business_name}
                className="h-16 w-auto object-contain"
              />
            ) : (
              <div className="w-16 h-16 bg-gradient-to-br from-[#AB2820] to-[#8B2E34] rounded-2xl flex items-center justify-center shadow-lg shadow-red-900/30">
                <span className="text-white font-bold text-2xl">{businessConfig.business_name.charAt(0)}</span>
              </div>
            )}
            <span className="text-sm text-amber-400 font-medium tracking-wide">BACKOFFICE</span>
          </div>

          {/* Título principal */}
          <h1 className="text-4xl xl:text-5xl font-bold text-white mb-6 leading-tight">
            Panel de
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#AB2820] to-amber-500"> Administración</span>
          </h1>

          <p className="text-slate-400 text-lg mb-12 max-w-md">
            Acceso exclusivo para personal autorizado. Gestiona operaciones, usuarios y configuraciones del sistema.
          </p>

          {/* Features */}
          <div className="space-y-4">
            {[
              { icon: Shield, text: 'Control total del sistema', color: 'text-emerald-400' },
              { icon: Users, text: 'Gestión de agentes y clientes', color: 'text-blue-400' },
              { icon: Settings, text: 'Configuración de tasas y comisiones', color: 'text-amber-400' },
            ].map((feature, i) => (
              <div key={i} className="flex items-center gap-4 text-slate-300">
                <div className="w-10 h-10 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center">
                  <feature.icon size={20} className={feature.color} />
                </div>
                <span>{feature.text}</span>
              </div>
            ))}
          </div>

          {/* Warning */}
          <div className="mt-12 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-start gap-3">
            <AlertTriangle size={20} className="text-amber-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-amber-200/80">
              Acceso restringido. Todos los intentos de inicio de sesión son registrados y monitoreados.
            </p>
          </div>
        </div>
      </div>

      {/* Panel Derecho - Formulario */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-8 lg:p-12 bg-gradient-to-br from-slate-100 to-slate-200">
        <div className="w-full max-w-md">
          {/* Logo móvil */}
          <div className="lg:hidden text-center mb-8">
            <div className="inline-flex flex-col items-center gap-2">
              {businessConfig.logo_url ? (
                <img
                  src={businessConfig.logo_url}
                  alt={businessConfig.business_name}
                  className="h-14 w-auto object-contain"
                />
              ) : (
                <div className="w-14 h-14 bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl flex items-center justify-center">
                  <span className="text-white font-bold text-xl">{businessConfig.business_name.charAt(0)}</span>
                </div>
              )}
              <span className="text-xs text-[#AB2820] font-semibold">BACKOFFICE</span>
            </div>
          </div>

          {/* Título del formulario */}
          <div className="text-center lg:text-left mb-8">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
              Acceso Interno
            </h2>
            <p className="text-gray-500">
              Ingresa tus credenciales de administrador
            </p>
          </div>

          {/* Card de login */}
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-6 sm:p-8">
            {/* Mensaje de sesión expirada */}
            {sessionMessage && (
              <div className="mb-6 p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 text-sm flex items-center gap-3">
                <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <Clock size={16} className="text-amber-600" />
                </div>
                {sessionMessage}
              </div>
            )}

            {requires2FA ? (
              /* Formulario de verificación 2FA */
              <form onSubmit={handleVerify2FA} className="space-y-5">
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Smartphone className="w-8 h-8 text-purple-600" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    Verificación en 2 pasos
                  </h3>
                  <p className="text-gray-500 text-sm">
                    {twoFactorMethod === 'totp'
                      ? 'Ingresa el código de tu aplicación de autenticación'
                      : 'Ingresa el código enviado a tu email'}
                  </p>
                </div>

                {/* Error */}
                {error && (
                  <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm flex items-center gap-3">
                    <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <AlertTriangle size={16} className="text-red-500" />
                    </div>
                    {error}
                  </div>
                )}

                {/* Código 2FA */}
                <div>
                  <label htmlFor="twoFactorCode" className="block text-sm font-medium text-gray-700 mb-2">
                    Código de verificación
                  </label>
                  <input
                    id="twoFactorCode"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9A-Za-z]*"
                    maxLength={8}
                    value={twoFactorCode}
                    onChange={(e) => setTwoFactorCode(e.target.value.replace(/[^0-9A-Za-z]/g, ''))}
                    className="w-full bg-slate-50 border border-gray-200 rounded-xl px-4 py-4 text-gray-900 text-center text-2xl tracking-widest font-mono focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                    placeholder="000000"
                    autoFocus
                    required
                  />
                </div>

                {/* Botones */}
                <button
                  type="submit"
                  disabled={loading || twoFactorCode.length < 6}
                  className="w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-semibold py-4 rounded-xl transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Verificando...
                    </span>
                  ) : (
                    <>
                      Verificar código
                      <ArrowRight size={18} />
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setRequires2FA(false);
                    setTwoFactorCode('');
                    setPendingToken(null);
                  }}
                  className="w-full text-gray-500 hover:text-gray-700 text-sm py-2"
                >
                  Cancelar e intentar con otra cuenta
                </button>

                <p className="text-center text-xs text-gray-400">
                  ¿Problemas? Usa un código de respaldo de 8 caracteres
                </p>
              </form>
            ) : (
              /* Formulario de login normal */
              <form onSubmit={handleLogin} className="space-y-5">
                {/* Error */}
                {error && (
                  <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm flex items-center gap-3">
                    <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <AlertTriangle size={16} className="text-red-500" />
                    </div>
                    {error}
                  </div>
                )}

                {/* Email */}
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                    Correo corporativo
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
                      className="w-full bg-slate-50 border border-gray-200 rounded-xl px-4 py-3.5 pl-12 text-gray-900 focus:ring-2 focus:ring-slate-800 focus:border-transparent transition-all"
                      placeholder="admin@fengxchange.com"
                      required
                      autoComplete="email"
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
                      className="w-full bg-slate-50 border border-gray-200 rounded-xl px-4 py-3.5 pl-12 pr-12 text-gray-900 focus:ring-2 focus:ring-slate-800 focus:border-transparent transition-all"
                      placeholder="••••••••"
                      required
                      autoComplete="current-password"
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

                {/* Submit */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-slate-800 to-slate-900 hover:from-slate-700 hover:to-slate-800 text-white font-semibold py-4 rounded-xl transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Verificando acceso...
                    </span>
                  ) : (
                    <>
                      Acceder al Panel
                      <ArrowRight size={20} />
                    </>
                  )}
                </button>
              </form>
            )}

            {/* Info de seguridad */}
            <div className="mt-6 pt-6 border-t border-gray-100">
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <Shield size={14} />
                <span>Conexión segura • Sesión protegida con JWT</span>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-8 text-center">
            <p className="text-xs text-gray-400">
              © 2026 {businessConfig.business_name}. Panel de uso interno.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function BackofficeLoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 text-white"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mb-4"></div><p>Cargando panel de administración...</p></div>}>
      <BackofficeLoginForm />
    </Suspense>
  );
}
