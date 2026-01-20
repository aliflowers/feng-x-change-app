'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { Eye, EyeOff } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    first_name: '',
    last_name: '',
    phone_number: '',
    agent_code: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agentCodeValid, setAgentCodeValid] = useState<boolean | null>(null);

  // Validar código de agente en tiempo real
  const validateAgentCode = async (code: string) => {
    if (!code || code.length < 8) {
      setAgentCodeValid(null);
      return;
    }

    // Formato: AG-XXXXX
    if (!/^AG-[A-Z0-9]{5}$/i.test(code)) {
      setAgentCodeValid(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .eq('agent_code', code.toUpperCase())
        .single();

      setAgentCodeValid(!error && !!data);
    } catch {
      setAgentCodeValid(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    if (name === 'agent_code') {
      validateAgentCode(value);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validaciones
    if (formData.password !== formData.confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    if (formData.password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres');
      return;
    }

    if (formData.agent_code && agentCodeValid === false) {
      setError('El código de agente no es válido');
      return;
    }

    setLoading(true);

    try {
      const { data, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            first_name: formData.first_name,
            last_name: formData.last_name,
            phone_number: formData.phone_number || null,
            agent_code: formData.agent_code.toUpperCase() || null,
          },
        },
      });

      if (authError) {
        if (authError.message.includes('already registered')) {
          setError('Este correo ya está registrado');
        } else {
          setError(authError.message);
        }
        return;
      }

      if (data.user) {
        // Redirigir al dashboard del cliente
        router.push('/app');
      }
    } catch (err) {
      setError('Error al registrarse. Intenta de nuevo.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-hero-gradient flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="text-3xl font-bold text-white">
            Fengxchange
          </Link>
          <p className="text-white/70 mt-2">Crea tu cuenta gratis</p>
        </div>

        {/* Card de registro */}
        <div className="card">
          <form onSubmit={handleRegister} className="space-y-5">
            {/* Error */}
            {error && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm">
                {error}
              </div>
            )}

            {/* Nombre y Apellido */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="first_name" className="block text-sm font-medium text-text-dark mb-2">
                  Nombre
                </label>
                <input
                  id="first_name"
                  name="first_name"
                  type="text"
                  value={formData.first_name}
                  onChange={handleChange}
                  className="input"
                  placeholder="Juan"
                  required
                />
              </div>
              <div>
                <label htmlFor="last_name" className="block text-sm font-medium text-text-dark mb-2">
                  Apellido
                </label>
                <input
                  id="last_name"
                  name="last_name"
                  type="text"
                  value={formData.last_name}
                  onChange={handleChange}
                  className="input"
                  placeholder="Pérez"
                  required
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-text-dark mb-2">
                Correo electrónico
              </label>
              <input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                className="input"
                placeholder="tu@email.com"
                required
              />
            </div>

            {/* Teléfono (opcional) */}
            <div>
              <label htmlFor="phone_number" className="block text-sm font-medium text-text-dark mb-2">
                Teléfono <span className="text-gray-400">(opcional)</span>
              </label>
              <input
                id="phone_number"
                name="phone_number"
                type="tel"
                value={formData.phone_number}
                onChange={handleChange}
                className="input"
                placeholder="+58 412 1234567"
              />
            </div>

            {/* Código de Agente (opcional) */}
            <div>
              <label htmlFor="agent_code" className="block text-sm font-medium text-text-dark mb-2">
                Código de Agente <span className="text-gray-400">(opcional)</span>
              </label>
              <div className="relative">
                <input
                  id="agent_code"
                  name="agent_code"
                  type="text"
                  value={formData.agent_code}
                  onChange={handleChange}
                  className={`input uppercase ${agentCodeValid === true
                    ? 'border-green-500 focus:ring-green-500/50'
                    : agentCodeValid === false
                      ? 'border-red-500 focus:ring-red-500/50'
                      : ''
                    }`}
                  placeholder="AG-XXXXX"
                  maxLength={8}
                />
                {agentCodeValid !== null && (
                  <span
                    className={`absolute right-3 top-1/2 -translate-y-1/2 text-lg ${agentCodeValid ? 'text-green-500' : 'text-red-500'
                      }`}
                  >
                    {agentCodeValid ? '✓' : '✗'}
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Si un agente te refirió, ingresa su código aquí
              </p>
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-text-dark mb-2">
                Contraseña
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={handleChange}
                  className="input pr-10"
                  placeholder="Mínimo 8 caracteres"
                  required
                  minLength={8}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-text-dark transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-text-dark mb-2">
                Confirmar Contraseña
              </label>
              <div className="relative">
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="input pr-10"
                  placeholder="Repite la contraseña"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-text-dark transition-colors"
                  tabIndex={-1}
                >
                  {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full"
            >
              {loading ? 'Creando cuenta...' : 'Crear Cuenta'}
            </button>
          </form>

          {/* Links */}
          <div className="mt-6 text-center text-sm text-gray-500">
            ¿Ya tienes cuenta?{' '}
            <Link href="/login" className="text-primary font-medium">
              Inicia sesión
            </Link>
          </div>
        </div>

        {/* Volver */}
        <div className="mt-6 text-center">
          <Link href="/" className="text-white/70 text-sm hover:text-white">
            ← Volver al inicio
          </Link>
        </div>
      </div>
    </main>
  );
}
