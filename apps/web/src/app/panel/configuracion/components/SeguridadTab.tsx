'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ShieldCheck,
  Clock,
  KeyRound,
  FileText,
  AlertTriangle,
  Save,
  Loader2,
  Info,
  ExternalLink,
  Smartphone
} from 'lucide-react';
import SegundoFactorSetup from './SegundoFactorSetup';

interface SecurityConfig {
  rate_limiting: {
    enabled: boolean;
    requests_per_minute: number;
  };
  two_factor_auth: {
    enabled: boolean;
    required_for_internal_users: boolean;
  };
  audit_retention_days: number;
  failed_login_alerts: {
    enabled: boolean;
    threshold: number;
    notify_email: string;
  };
}

const defaultConfig: SecurityConfig = {
  rate_limiting: { enabled: true, requests_per_minute: 100 },
  two_factor_auth: { enabled: false, required_for_internal_users: false },
  audit_retention_days: 90,
  failed_login_alerts: { enabled: true, threshold: 5, notify_email: '' },
};

interface SeguridadTabProps {
  userRole: 'SUPER_ADMIN' | 'ADMIN' | 'CAJERO' | 'SUPERVISOR' | 'OPERATOR' | 'CLIENT';
}

export default function SeguridadTab({ userRole }: SeguridadTabProps) {
  const isSuperAdmin = userRole === 'SUPER_ADMIN';
  const [config, setConfig] = useState<SecurityConfig>(defaultConfig);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [show2FASetup, setShow2FASetup] = useState(false);
  const [userTwoFactorMethod, setUserTwoFactorMethod] = useState<'none' | 'email' | 'totp'>('none');
  const [userHasSecret, setUserHasSecret] = useState(false); // Si tiene config guardada
  const [user2FAVerified, setUser2FAVerified] = useState(false); // Si está activo
  const [isToggling2FA, setIsToggling2FA] = useState(false);

  // Cargar configuración inicial
  useEffect(() => {
    loadConfig();
    loadUserTwoFactorStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadConfig = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/config/security');
      if (res.ok) {
        const data = await res.json();
        setConfig({
          rate_limiting: data.rate_limiting || defaultConfig.rate_limiting,
          two_factor_auth: data.two_factor_auth || defaultConfig.two_factor_auth,
          audit_retention_days: data.audit_retention_days || defaultConfig.audit_retention_days,
          failed_login_alerts: data.failed_login_alerts || defaultConfig.failed_login_alerts,
        });
      }
    } catch (error) {
      console.error('Error loading security config:', error);
      setMessage({ type: 'error', text: 'Error al cargar la configuración' });
    } finally {
      setIsLoading(false);
    }
  };

  const loadUserTwoFactorStatus = async () => {
    try {
      const res = await fetch('/api/auth/2fa/status');
      if (res.ok) {
        const data = await res.json();
        setUserTwoFactorMethod(data.actualMethod || data.method || 'none');
        setUserHasSecret(data.hasSecret || false);
        setUser2FAVerified(data.verified || false);
      }
    } catch (error) {
      console.error('Error loading 2FA status:', error);
    }
  };


  const saveConfig = async () => {
    try {
      setIsSaving(true);
      setMessage(null);

      const res = await fetch('/api/config/security', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });

      const data = await res.json();

      if (res.ok) {
        setMessage({ type: 'success', text: 'Configuración guardada correctamente' });
        setHasChanges(false);
      } else {
        setMessage({ type: 'error', text: data.message || 'Error al guardar' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error de conexión' });
    } finally {
      setIsSaving(false);
    }
  };

  const updateConfig = <K extends keyof SecurityConfig>(
    key: K,
    value: SecurityConfig[K]
  ) => {
    setConfig(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const toggle2FA = async (enabled: boolean) => {
    // Si no tiene configuración y quiere habilitar, mostrar setup
    if (enabled && !userHasSecret) {
      setShow2FASetup(true);
      return;
    }

    try {
      setIsToggling2FA(true);
      const res = await fetch('/api/auth/2fa/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled }),
      });

      const data = await res.json();

      if (res.ok) {
        setMessage({ type: 'success', text: enabled ? '2FA habilitado' : '2FA deshabilitado' });
        setUser2FAVerified(enabled);
        if (enabled) {
          // Recargar para obtener el método correcto
          await loadUserTwoFactorStatus();
        }
      } else {
        setMessage({ type: 'error', text: data.error || 'Error al cambiar estado 2FA' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error de conexión' });
    } finally {
      setIsToggling2FA(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        <span className="ml-2 text-gray-400">Cargando configuración...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header - Solo para SUPER_ADMIN */}
      {isSuperAdmin && (
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-white flex items-center gap-2">
              <ShieldCheck className="w-6 h-6 text-green-400" />
              Configuración de Seguridad
            </h2>
            <p className="text-sm text-gray-400 mt-1">
              Configura los parámetros de seguridad del sistema
            </p>
          </div>
          <button
            onClick={saveConfig}
            disabled={isSaving || !hasChanges}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition ${hasChanges
              ? 'bg-green-600 hover:bg-green-700 text-white'
              : 'bg-gray-700 text-gray-400 cursor-not-allowed'
              }`}
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Guardar Cambios
          </button>
        </div>
      )}

      {/* Header simple para usuarios normales */}
      {!isSuperAdmin && (
        <div>
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-green-400" />
            Seguridad de tu Cuenta
          </h2>
          <p className="text-sm text-gray-400 mt-1">
            Configura la autenticación de dos factores para proteger tu cuenta
          </p>
        </div>
      )}

      {/* Message */}
      {message && (
        <div
          className={`p-4 rounded-lg ${message.type === 'success'
            ? 'bg-green-900/50 border border-green-700 text-green-300'
            : 'bg-red-900/50 border border-red-700 text-red-300'
            }`}
        >
          {message.text}
        </div>
      )}

      {/* Rate Limiting - Solo para SUPER_ADMIN */}
      {isSuperAdmin && (
        <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <Clock className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h3 className="font-medium text-white">Rate Limiting</h3>
              <p className="text-sm text-gray-400">Limita las solicitudes por IP para prevenir abusos</p>
            </div>
          </div>

          <div className="space-y-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={config.rate_limiting.enabled}
                onChange={(e) =>
                  updateConfig('rate_limiting', {
                    ...config.rate_limiting,
                    enabled: e.target.checked,
                  })
                }
                className="w-5 h-5 rounded border-gray-600 bg-gray-700 text-green-500 focus:ring-green-500"
              />
              <span className="text-white">Habilitar Rate Limiting</span>
            </label>

            {config.rate_limiting.enabled && (
              <div className="ml-8 space-y-3">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">
                    Requests por minuto (general)
                  </label>
                  <input
                    type="number"
                    min="10"
                    max="1000"
                    value={config.rate_limiting.requests_per_minute}
                    onChange={(e) =>
                      updateConfig('rate_limiting', {
                        ...config.rate_limiting,
                        requests_per_minute: parseInt(e.target.value) || 100,
                      })
                    }
                    className="w-32 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div className="flex items-start gap-2 p-3 bg-blue-900/30 rounded-lg">
                  <Info className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-blue-300">
                    Los límites específicos por tipo de ruta se aplican automáticamente:
                    <br />• Auth: 10/min • WhatsApp: 30/min • Público: 50/min
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2FA Personal - Visible para todos los usuarios internos */}
      <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-purple-500/20 rounded-lg">
            <KeyRound className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h3 className="font-medium text-white">Tu Autenticación de Dos Factores (2FA)</h3>
            <p className="text-sm text-gray-400">Añade una capa extra de seguridad a tu cuenta</p>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-sm text-gray-400">
              {!userHasSecret ? (
                <span className="text-yellow-400">No configurado - Haz clic en &quot;Configurar 2FA&quot;</span>
              ) : user2FAVerified ? (
                userTwoFactorMethod === 'totp' ? (
                  <span className="text-green-400">✓ Google Authenticator activo</span>
                ) : (
                  <span className="text-blue-400">✓ Email activo</span>
                )
              ) : (
                <span className="text-orange-400">⚠ Configurado pero deshabilitado</span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Checkbox para activar/desactivar 2FA */}
            {userHasSecret && (
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={user2FAVerified}
                  onChange={(e) => toggle2FA(e.target.checked)}
                  disabled={isToggling2FA}
                  className="w-5 h-5 rounded border-gray-600 bg-gray-700 text-green-500 focus:ring-green-500 disabled:opacity-50"
                />
                <span className="text-sm text-gray-300">
                  {isToggling2FA ? 'Cambiando...' : (user2FAVerified ? 'Activo' : 'Inactivo')}
                </span>
              </label>
            )}
            <button
              onClick={() => setShow2FASetup(true)}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition"
            >
              <Smartphone className="w-4 h-4" />
              {!userHasSecret ? 'Configurar 2FA' : 'Reconfigurar'}
            </button>
          </div>
        </div>
      </div>

      {/* Secciones solo para SUPER_ADMIN */}
      {isSuperAdmin && (
        <>
          {/* Retención de Logs */}
          <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-cyan-500/20 rounded-lg">
                <FileText className="w-5 h-5 text-cyan-400" />
              </div>
              <div>
                <h3 className="font-medium text-white">Retención de Logs de Auditoría</h3>
                <p className="text-sm text-gray-400">Define cuánto tiempo se conservan los registros</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  Días de retención
                </label>
                <input
                  type="number"
                  min="7"
                  max="365"
                  value={config.audit_retention_days}
                  onChange={(e) =>
                    updateConfig('audit_retention_days', parseInt(e.target.value) || 90)
                  }
                  className="w-24 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                />
              </div>
              <p className="text-sm text-gray-400 mt-5">
                Los logs más antiguos de {config.audit_retention_days} días se eliminarán automáticamente.
              </p>
            </div>

            {/* Link a Audit Logs */}
            <div className="pt-4 border-t border-gray-700 mt-4">
              <Link
                href="/panel/configuracion/audit"
                className="flex items-center justify-between p-3 bg-gray-700/50 hover:bg-gray-700 rounded-lg transition group"
              >
                <div>
                  <p className="text-white font-medium">Ver Logs de Auditoría</p>
                  <p className="text-sm text-gray-400">Visualiza y exporta el historial de actividad</p>
                </div>
                <ExternalLink className="w-5 h-5 text-gray-400 group-hover:text-cyan-400 transition" />
              </Link>
            </div>
          </div>

          {/* Alertas de Seguridad */}
          <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-500/20 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <h3 className="font-medium text-white">Alertas de Intentos de Login Fallidos</h3>
                <p className="text-sm text-gray-400">Notifica cuando se detectan múltiples intentos fallidos</p>
              </div>
            </div>

            <div className="space-y-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.failed_login_alerts.enabled}
                  onChange={(e) =>
                    updateConfig('failed_login_alerts', {
                      ...config.failed_login_alerts,
                      enabled: e.target.checked,
                    })
                  }
                  className="w-5 h-5 rounded border-gray-600 bg-gray-700 text-red-500 focus:ring-red-500"
                />
                <span className="text-white">Habilitar alertas de seguridad</span>
              </label>

              {config.failed_login_alerts.enabled && (
                <div className="ml-8 space-y-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">
                      Umbral de intentos fallidos
                    </label>
                    <input
                      type="number"
                      min="3"
                      max="20"
                      value={config.failed_login_alerts.threshold}
                      onChange={(e) =>
                        updateConfig('failed_login_alerts', {
                          ...config.failed_login_alerts,
                          threshold: parseInt(e.target.value) || 5,
                        })
                      }
                      className="w-24 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Se enviará alerta después de {config.failed_login_alerts.threshold} intentos fallidos
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm text-gray-400 mb-1">
                      Email para notificaciones
                    </label>
                    <input
                      type="email"
                      value={config.failed_login_alerts.notify_email}
                      onChange={(e) =>
                        updateConfig('failed_login_alerts', {
                          ...config.failed_login_alerts,
                          notify_email: e.target.value,
                        })
                      }
                      placeholder="admin@fengxchange.com"
                      className="w-full max-w-md px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Modal 2FA Setup - Visible para todos */}
      <SegundoFactorSetup
        isOpen={show2FASetup}
        onClose={() => setShow2FASetup(false)}
        onSuccess={() => {
          loadUserTwoFactorStatus();
        }}
        currentMethod={userTwoFactorMethod}
      />

      {/* Botón flotante de guardar - Solo para SUPER_ADMIN cuando hay cambios */}
      {isSuperAdmin && hasChanges && (
        <div className="fixed bottom-6 right-6 z-50">
          <button
            onClick={saveConfig}
            disabled={isSaving}
            className="flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl shadow-2xl transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Save className="w-5 h-5" />
            )}
            Guardar Cambios
          </button>
        </div>
      )}
    </div>
  );
}

