'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  Save,
  Loader2,
  AlertTriangle,
  CheckCircle,
  ShieldCheck,
  Info,
  Phone
} from 'lucide-react';

interface MiCuentaTabProps {
  userRole: 'SUPER_ADMIN' | 'ADMIN' | 'CAJERO' | 'SUPERVISOR';
  userEmail: string;
  userPhone: string;
  user2FAEnabled: boolean;
}

// Validación de fortaleza de contraseña
function getPasswordStrength(password: string): {
  score: number;
  label: string;
  color: string;
  checks: { passed: boolean; label: string }[];
} {
  const checks = [
    { passed: password.length >= 8, label: 'Mínimo 8 caracteres' },
    { passed: /[A-Z]/.test(password), label: 'Una mayúscula' },
    { passed: /[a-z]/.test(password), label: 'Una minúscula' },
    { passed: /[0-9]/.test(password), label: 'Un número' },
    { passed: /[!@#$%^&*(),.?":{}|<>]/.test(password), label: 'Un carácter especial' },
  ];

  const score = checks.filter(c => c.passed).length;

  let label = 'Muy débil';
  let color = 'bg-red-500';

  if (score === 5) {
    label = 'Muy fuerte';
    color = 'bg-green-500';
  } else if (score === 4) {
    label = 'Fuerte';
    color = 'bg-emerald-500';
  } else if (score === 3) {
    label = 'Buena';
    color = 'bg-yellow-500';
  } else if (score === 2) {
    label = 'Débil';
    color = 'bg-orange-500';
  }

  return { score, label, color, checks };
}

export default function MiCuentaTab({ userRole, userEmail, userPhone, user2FAEnabled }: MiCuentaTabProps) {
  const isSuperAdmin = userRole === 'SUPER_ADMIN';

  // Estado unificado del formulario
  const [formData, setFormData] = useState({
    // Cambio de email (solo SUPER_ADMIN)
    changeEmail: false,
    newEmail: '',
    // Cambio de teléfono
    changePhone: false,
    newPhone: '',
    // Cambio de contraseña
    changePassword: false,
    newPassword: '',
    confirmPassword: '',
    // Código 2FA único para todos los cambios
    twoFactorCode: '',
  });

  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Visibilidad de contraseñas
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Cálculo de fortaleza de contraseña
  const passwordStrength = useMemo(
    () => getPasswordStrength(formData.newPassword),
    [formData.newPassword]
  );

  // Determinar si hay algún cambio activo
  const hasActiveChange = formData.changeEmail || formData.changePhone || formData.changePassword;

  // Validar si el formulario está listo para enviar
  const isFormValid = useMemo(() => {
    if (!hasActiveChange) return false;
    if (formData.twoFactorCode.length !== 6) return false;

    if (formData.changeEmail) {
      if (!formData.newEmail) return false;
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.newEmail)) return false;
    }

    if (formData.changePhone) {
      const cleanedPhone = formData.newPhone.replace(/\D/g, '');
      if (cleanedPhone.length < 10 || cleanedPhone.length > 15) return false;
    }

    if (formData.changePassword) {
      if (!formData.newPassword || !formData.confirmPassword) return false;
      if (formData.newPassword !== formData.confirmPassword) return false;
      if (passwordStrength.score < 5) return false;
    }

    return true;
  }, [formData, hasActiveChange, passwordStrength.score]);

  // Limpiar mensaje después de 5 segundos
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  // Handler para enviar cambios
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user2FAEnabled) {
      setMessage({ type: 'error', text: 'Debes tener 2FA habilitado para realizar cambios.' });
      return;
    }

    if (!isFormValid) {
      setMessage({ type: 'error', text: 'Por favor completa todos los campos requeridos correctamente.' });
      return;
    }

    setIsLoading(true);
    setMessage(null);

    try {
      const results: string[] = [];

      // Cambiar email si está activo (solo SUPER_ADMIN)
      if (formData.changeEmail && isSuperAdmin) {
        const emailRes = await fetch('/api/auth/change-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            newEmail: formData.newEmail,
            twoFactorCode: formData.twoFactorCode,
          }),
        });

        const emailData = await emailRes.json();

        if (emailRes.ok) {
          results.push('Email actualizado');
        } else {
          setMessage({ type: 'error', text: emailData.error || 'Error al actualizar email' });
          setIsLoading(false);
          return;
        }
      }

      // Cambiar teléfono si está activo
      if (formData.changePhone) {
        const phoneRes = await fetch('/api/auth/change-phone', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            newPhone: formData.newPhone,
            twoFactorCode: formData.twoFactorCode,
          }),
        });

        const phoneData = await phoneRes.json();

        if (phoneRes.ok) {
          results.push('Teléfono actualizado');
        } else {
          setMessage({ type: 'error', text: phoneData.error || 'Error al actualizar teléfono' });
          setIsLoading(false);
          return;
        }
      }

      // Cambiar contraseña si está activo
      if (formData.changePassword) {
        const passRes = await fetch('/api/auth/change-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            newPassword: formData.newPassword,
            confirmPassword: formData.confirmPassword,
            twoFactorCode: formData.twoFactorCode,
          }),
        });

        const passData = await passRes.json();

        if (passRes.ok) {
          results.push('Contraseña actualizada');
        } else {
          setMessage({ type: 'error', text: passData.error || 'Error al actualizar contraseña' });
          setIsLoading(false);
          return;
        }
      }

      if (results.length > 0) {
        setMessage({ type: 'success', text: results.join(' y ') + ' correctamente' });
        setFormData({
          changeEmail: false,
          newEmail: '',
          changePhone: false,
          newPhone: '',
          changePassword: false,
          newPassword: '',
          confirmPassword: '',
          twoFactorCode: '',
        });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error de conexión' });
    } finally {
      setIsLoading(false);
    }
  };

  // Si no tiene 2FA habilitado, mostrar advertencia
  if (!user2FAEnabled) {
    return (
      <div className="space-y-6">
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-amber-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
              <ShieldCheck size={24} className="text-amber-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-amber-300 mb-2">
                Autenticación de Dos Factores Requerida
              </h3>
              <p className="text-slate-300 mb-4">
                Para cambiar tus credenciales, debes tener la autenticación de dos factores (2FA) habilitada.
              </p>
              <p className="text-slate-400 text-sm">
                Ve a la pestaña <span className="text-amber-300 font-medium">&quot;Seguridad&quot;</span> para configurar tu 2FA.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-6">

        {/* Sección: Cambiar Email (Solo SUPER_ADMIN) */}
        {isSuperAdmin && (
          <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center">
                  <Mail size={20} className="text-blue-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Cambiar Email</h3>
                  <p className="text-sm text-slate-400">Email actual: {userEmail}</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.changeEmail}
                  onChange={(e) => setFormData({ ...formData, changeEmail: e.target.checked, newEmail: '' })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-600 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500/50 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            {formData.changeEmail && (
              <div className="mt-4 pt-4 border-t border-slate-700/50">
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Nuevo email
                </label>
                <input
                  type="email"
                  value={formData.newEmail}
                  onChange={(e) => setFormData({ ...formData, newEmail: e.target.value })}
                  placeholder="nuevo@ejemplo.com"
                  className="w-full px-4 py-3 bg-slate-700/80 border border-slate-600/50 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  required={formData.changeEmail}
                />
              </div>
            )}
          </div>
        )}

        {/* Mensaje para no-SUPER_ADMIN */}
        {!isSuperAdmin && (
          <div className="bg-slate-800/30 rounded-xl border border-slate-700/30 p-4">
            <div className="flex items-center gap-3 text-slate-400">
              <Info size={18} />
              <p className="text-sm">
                El cambio de email no está disponible para tu rol.
              </p>
            </div>
          </div>
        )}

        {/* Sección: Cambiar Teléfono/WhatsApp */}
        <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-500/20 rounded-xl flex items-center justify-center">
                <Phone size={20} className="text-green-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Cambiar Teléfono</h3>
                <p className="text-sm text-slate-400">
                  {userPhone ? `Actual: +${userPhone}` : 'No configurado'}
                </p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={formData.changePhone}
                onChange={(e) => setFormData({ ...formData, changePhone: e.target.checked, newPhone: '' })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-600 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-green-500/50 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
            </label>
          </div>

          {formData.changePhone && (
            <div className="mt-4 pt-4 border-t border-slate-700/50">
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Nuevo número de teléfono/WhatsApp
              </label>
              <input
                type="tel"
                value={formData.newPhone}
                onChange={(e) => setFormData({ ...formData, newPhone: e.target.value.replace(/\D/g, '') })}
                placeholder="584121234567"
                className="w-full px-4 py-3 bg-slate-700/80 border border-slate-600/50 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-green-500/50"
                required={formData.changePhone}
              />
              <p className="text-xs text-slate-500 mt-2">
                Ingresa el número sin espacios ni guiones, incluyendo código de país (ej: 584121234567)
              </p>
            </div>
          )}
        </div>

        {/* Sección: Cambiar Contraseña */}
        <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-500/20 rounded-xl flex items-center justify-center">
                <Lock size={20} className="text-purple-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Cambiar Contraseña</h3>
                <p className="text-sm text-slate-400">Actualiza tu contraseña de acceso</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={formData.changePassword}
                onChange={(e) => setFormData({
                  ...formData,
                  changePassword: e.target.checked,
                  newPassword: '',
                  confirmPassword: ''
                })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-600 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-purple-500/50 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
            </label>
          </div>

          {formData.changePassword && (
            <div className="mt-4 pt-4 border-t border-slate-700/50 space-y-4">
              {/* Nueva contraseña */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Nueva contraseña
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={formData.newPassword}
                    onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                    placeholder="••••••••"
                    className="w-full px-4 py-3 bg-slate-700/80 border border-slate-600/50 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 pr-12"
                    required={formData.changePassword}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-300"
                  >
                    {showNewPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>

                {/* Medidor de fortaleza */}
                {formData.newPassword && (
                  <div className="mt-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${passwordStrength.color} transition-all duration-300`}
                          style={{ width: `${(passwordStrength.score / 5) * 100}%` }}
                        />
                      </div>
                      <span className={`text-sm font-medium ${passwordStrength.score >= 4 ? 'text-green-400' :
                        passwordStrength.score >= 3 ? 'text-yellow-400' : 'text-red-400'
                        }`}>
                        {passwordStrength.label}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {passwordStrength.checks.map((check, index) => (
                        <div key={index} className={`flex items-center gap-1 ${check.passed ? 'text-green-400' : 'text-slate-500'}`}>
                          {check.passed ? <CheckCircle size={12} /> : <div className="w-3 h-3 rounded-full border border-slate-500" />}
                          {check.label}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Confirmar contraseña */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Confirmar nueva contraseña
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    placeholder="••••••••"
                    className={`w-full px-4 py-3 bg-slate-700/80 border rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 pr-12 ${formData.confirmPassword && formData.confirmPassword !== formData.newPassword
                      ? 'border-red-500/50'
                      : 'border-slate-600/50'
                      }`}
                    required={formData.changePassword}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-300"
                  >
                    {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
                {formData.confirmPassword && formData.confirmPassword !== formData.newPassword && (
                  <p className="text-xs text-red-400 mt-1">Las contraseñas no coinciden</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Sección: Código 2FA (Solo visible si hay cambios activos) */}
        {hasActiveChange && (
          <div className="bg-slate-800/50 rounded-xl border border-amber-500/30 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-amber-500/20 rounded-xl flex items-center justify-center">
                <ShieldCheck size={20} className="text-amber-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Verificación 2FA</h3>
                <p className="text-sm text-slate-400">Confirma tu identidad con Google Authenticator</p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Código de verificación
              </label>
              <input
                type="text"
                value={formData.twoFactorCode}
                onChange={(e) => setFormData({ ...formData, twoFactorCode: e.target.value.replace(/\D/g, '').slice(0, 6) })}
                placeholder="000000"
                maxLength={6}
                className="w-full px-4 py-3 bg-slate-700/80 border border-slate-600/50 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 text-center text-2xl tracking-[0.5em] font-mono"
                required
              />
              <p className="text-xs text-slate-500 mt-2 text-center">
                Ingresa el código de 6 dígitos de tu aplicación
              </p>
            </div>
          </div>
        )}

        {/* Mensaje de estado */}
        {message && (
          <div className={`flex items-center gap-2 p-4 rounded-xl ${message.type === 'success'
            ? 'bg-green-500/10 border border-green-500/30 text-green-300'
            : 'bg-red-500/10 border border-red-500/30 text-red-300'
            }`}>
            {message.type === 'success' ? <CheckCircle size={20} /> : <AlertTriangle size={20} />}
            {message.text}
          </div>
        )}

        {/* Botón de enviar */}
        {hasActiveChange && (
          <button
            type="submit"
            disabled={isLoading || !isFormValid}
            className="w-full py-4 px-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-slate-600 disabled:to-slate-600 disabled:cursor-not-allowed text-white font-medium rounded-xl transition-all flex items-center justify-center gap-2 text-lg"
          >
            {isLoading ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                Aplicando cambios...
              </>
            ) : (
              <>
                <Save size={20} />
                Guardar Cambios
              </>
            )}
          </button>
        )}

        {/* Mensaje cuando no hay cambios activos */}
        {!hasActiveChange && (
          <div className="text-center py-8 text-slate-400">
            <p>Activa los cambios que deseas realizar usando los interruptores de arriba.</p>
          </div>
        )}
      </form>
    </div>
  );
}
