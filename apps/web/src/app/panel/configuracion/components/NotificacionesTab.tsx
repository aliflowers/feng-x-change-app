'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  MessageSquare,
  Mail,
  FileText,
  Send,
  Loader2,
  Check,
  Eye,
  EyeOff,
  AlertCircle
} from 'lucide-react';

// Tipos
interface WhatsAppConfig {
  api_url: string;
  phone_number_id: string;
  business_account_id: string;
  access_token_masked: string;
  has_token: boolean;
  enabled: boolean;
}

interface EmailConfig {
  host: string;
  port: number;
  user: string;
  password_masked: string;
  has_password: boolean;
  from_email: string;
  from_name: string;
  enabled: boolean;
}

interface NotificationsConfig {
  whatsapp: WhatsAppConfig;
  email: EmailConfig;
}

type SubTab = 'whatsapp' | 'email' | 'templates';

export default function NotificacionesTab() {
  const [activeTab, setActiveTab] = useState<SubTab>('whatsapp');
  const [config, setConfig] = useState<NotificationsConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState<'whatsapp' | 'email' | null>(null);
  const [testResult, setTestResult] = useState<{ type: 'whatsapp' | 'email'; success: boolean; message: string } | null>(null);

  // Formularios
  const [waForm, setWaForm] = useState({
    api_url: 'https://graph.facebook.com/v18.0',
    phone_number_id: '',
    business_account_id: '',
    access_token: '',
    enabled: false
  });

  const [emailForm, setEmailForm] = useState({
    host: '',
    port: 587,
    user: '',
    password: '',
    from_email: '',
    from_name: '',
    enabled: false
  });

  const [showWaToken, setShowWaToken] = useState(false);
  const [showEmailPassword, setShowEmailPassword] = useState(false);
  const [hasTokenChanges, setHasTokenChanges] = useState(false);
  const [hasPasswordChanges, setHasPasswordChanges] = useState(false);

  // Estado para envío de mensaje de prueba
  const [sendingTestMessage, setSendingTestMessage] = useState(false);
  const [testMessageForm, setTestMessageForm] = useState({
    to: '+584144559038',
    message: 'Hola! Esto es una prueba de envío de mensaje con la integración de WhatsApp Business API desde FengXchange.'
  });
  const [testMessageResult, setTestMessageResult] = useState<{ success: boolean; message: string } | null>(null);

  // Cargar configuración
  const loadConfig = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/config/notifications');

      if (!res.ok) {
        throw new Error('Error al cargar configuración');
      }

      const data = await res.json();
      setConfig(data.config);

      // Inicializar formularios
      if (data.config?.whatsapp) {
        setWaForm({
          api_url: data.config.whatsapp.api_url || 'https://graph.facebook.com/v18.0',
          phone_number_id: data.config.whatsapp.phone_number_id || '',
          business_account_id: data.config.whatsapp.business_account_id || '',
          access_token: '',
          enabled: data.config.whatsapp.enabled
        });
      }

      if (data.config?.email) {
        setEmailForm({
          host: data.config.email.host || '',
          port: data.config.email.port || 587,
          user: data.config.email.user || '',
          password: '',
          from_email: data.config.email.from_email || '',
          from_name: data.config.email.from_name || '',
          enabled: data.config.email.enabled
        });
      }
    } catch (error) {
      console.error('Error loading config:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  // Guardar WhatsApp
  const saveWhatsApp = async () => {
    try {
      setSaving(true);
      const payload: Record<string, unknown> = {
        whatsapp: {
          api_url: waForm.api_url,
          phone_number_id: waForm.phone_number_id,
          business_account_id: waForm.business_account_id,
          enabled: waForm.enabled
        }
      };

      // Solo enviar token si fue modificado
      if (hasTokenChanges && waForm.access_token) {
        (payload.whatsapp as Record<string, unknown>).access_token = waForm.access_token;
      }

      const res = await fetch('/api/config/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error('Error al guardar');

      setHasTokenChanges(false);
      await loadConfig();
    } catch (error) {
      console.error('Error saving WhatsApp config:', error);
    } finally {
      setSaving(false);
    }
  };

  // Guardar Email
  const saveEmail = async () => {
    try {
      setSaving(true);
      const payload: Record<string, unknown> = {
        email: {
          host: emailForm.host,
          port: emailForm.port,
          user: emailForm.user,
          from_email: emailForm.from_email,
          from_name: emailForm.from_name,
          enabled: emailForm.enabled
        }
      };

      // Solo enviar password si fue modificado
      if (hasPasswordChanges && emailForm.password) {
        (payload.email as Record<string, unknown>).password = emailForm.password;
      }

      const res = await fetch('/api/config/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error('Error al guardar');

      setHasPasswordChanges(false);
      await loadConfig();
    } catch (error) {
      console.error('Error saving email config:', error);
    } finally {
      setSaving(false);
    }
  };

  // Probar conexión WhatsApp
  const testWhatsApp = async () => {
    try {
      setTesting('whatsapp');
      setTestResult(null);

      const res = await fetch('/api/config/test-whatsapp', {
        method: 'POST'
      });

      const data = await res.json();

      setTestResult({
        type: 'whatsapp',
        success: data.success,
        message: data.success
          ? `✓ ${data.message}`
          : `✗ ${data.error}: ${data.details || ''}`
      });
    } catch {
      setTestResult({
        type: 'whatsapp',
        success: false,
        message: 'Error de conexión'
      });
    } finally {
      setTesting(null);
    }
  };

  // Probar conexión Email
  const testEmail = async () => {
    try {
      setTesting('email');
      setTestResult(null);

      const res = await fetch('/api/config/test-email', {
        method: 'POST'
      });

      const data = await res.json();

      setTestResult({
        type: 'email',
        success: data.success,
        message: data.success
          ? `✓ ${data.message}`
          : `✗ ${data.error}: ${data.details || ''}`
      });
    } catch {
      setTestResult({
        type: 'email',
        success: false,
        message: 'Error de conexión'
      });
    } finally {
      setTesting(null);
    }
  };

  // Enviar mensaje de prueba de WhatsApp
  const sendTestMessage = async () => {
    try {
      setSendingTestMessage(true);
      setTestMessageResult(null);

      const res = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: testMessageForm.to,
          message: testMessageForm.message
        })
      });

      const data = await res.json();

      setTestMessageResult({
        success: data.success,
        message: data.success
          ? `✓ Mensaje enviado correctamente (ID: ${data.details?.message_id || 'N/A'})`
          : `✗ ${data.error}: ${data.details || ''}`
      });
    } catch {
      setTestMessageResult({
        success: false,
        message: 'Error de conexión al enviar mensaje'
      });
    } finally {
      setSendingTestMessage(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-amber-400" />
      </div>
    );
  }

  const subTabs = [
    { id: 'whatsapp' as SubTab, label: 'WhatsApp', icon: MessageSquare },
    { id: 'email' as SubTab, label: 'Email SMTP', icon: Mail },
    { id: 'templates' as SubTab, label: 'Plantillas', icon: FileText }
  ];

  return (
    <div className="space-y-6">
      {/* Sub-tabs */}
      <div className="flex gap-2 p-1 bg-slate-800/50 rounded-xl">
        {subTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id);
              setTestResult(null);
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all
              ${activeTab === tab.id
                ? 'bg-amber-500/20 text-amber-400 shadow-lg'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* WhatsApp Config */}
      {activeTab === 'whatsapp' && (
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/20 rounded-lg">
                <MessageSquare className="text-green-400" size={24} />
              </div>
              <div>
                <h3 className="font-semibold text-white">WhatsApp Business API</h3>
                <p className="text-sm text-gray-400">Configura la integración con Meta WhatsApp Business</p>
              </div>
            </div>

            {/* Toggle enabled */}
            <label className="flex items-center gap-2 cursor-pointer">
              <span className="text-sm text-gray-400">Habilitado</span>
              <div className="relative">
                <input
                  type="checkbox"
                  checked={waForm.enabled}
                  onChange={(e) => setWaForm({ ...waForm, enabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-700 rounded-full peer peer-checked:bg-green-500 transition-colors"></div>
                <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-5"></div>
              </div>
            </label>
          </div>

          {/* Form */}
          <div className="grid gap-4">
            {/* API URL */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                API URL
              </label>
              <input
                type="url"
                value={waForm.api_url}
                onChange={(e) => setWaForm({ ...waForm, api_url: e.target.value })}
                placeholder="https://graph.facebook.com/v18.0"
                className="w-full px-4 py-3 bg-slate-800/50 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:border-green-500/50 focus:outline-none"
              />
            </div>

            {/* Phone Number ID */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Phone Number ID
              </label>
              <input
                type="text"
                value={waForm.phone_number_id}
                onChange={(e) => setWaForm({ ...waForm, phone_number_id: e.target.value })}
                placeholder="123456789012345"
                className="w-full px-4 py-3 bg-slate-800/50 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:border-green-500/50 focus:outline-none"
              />
              <p className="mt-1 text-xs text-gray-500">
                ID del número de teléfono registrado en Meta Business
              </p>
            </div>

            {/* Business Account ID */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                WhatsApp Business Account ID (WABA ID)
              </label>
              <input
                type="text"
                value={waForm.business_account_id}
                onChange={(e) => setWaForm({ ...waForm, business_account_id: e.target.value })}
                placeholder="123456789012345"
                className="w-full px-4 py-3 bg-slate-800/50 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:border-green-500/50 focus:outline-none"
              />
              <p className="mt-1 text-xs text-gray-500">
                ID de tu cuenta de WhatsApp Business en Meta Business Manager
              </p>
            </div>

            {/* Access Token */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Access Token
                {config?.whatsapp.has_token && !hasTokenChanges && (
                  <span className="ml-2 text-xs text-green-400">
                    (Token configurado: {config.whatsapp.access_token_masked})
                  </span>
                )}
              </label>
              <div className="relative">
                <input
                  type={showWaToken ? 'text' : 'password'}
                  value={waForm.access_token}
                  onChange={(e) => {
                    setWaForm({ ...waForm, access_token: e.target.value });
                    setHasTokenChanges(true);
                  }}
                  placeholder={config?.whatsapp.has_token ? "Dejar vacío para mantener actual" : "EAAG..."}
                  className="w-full px-4 py-3 pr-12 bg-slate-800/50 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:border-green-500/50 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowWaToken(!showWaToken)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                >
                  {showWaToken ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                El token se cifrará antes de guardarse. Solo se mostrará enmascarado.
              </p>
            </div>
          </div>

          {/* Test Result */}
          {testResult?.type === 'whatsapp' && (
            <div className={`p-4 rounded-xl flex items-center gap-3 ${testResult.success
              ? 'bg-green-500/10 border border-green-500/30'
              : 'bg-red-500/10 border border-red-500/30'
              }`}>
              {testResult.success ? (
                <Check className="text-green-400" size={20} />
              ) : (
                <AlertCircle className="text-red-400" size={20} />
              )}
              <span className={testResult.success ? 'text-green-300' : 'text-red-300'}>
                {testResult.message}
              </span>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={testWhatsApp}
              disabled={testing === 'whatsapp' || !config?.whatsapp.has_token}
              className="flex items-center gap-2 px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {testing === 'whatsapp' ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <Send size={18} />
              )}
              Probar Conexión
            </button>

            <button
              onClick={saveWhatsApp}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-xl font-medium transition-colors disabled:opacity-50"
            >
              {saving ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <Check size={18} />
              )}
              Guardar Configuración
            </button>
          </div>

          {/* Sección de Envío de Mensaje de Prueba */}
          <div className="mt-8 pt-6 border-t border-white/10">
            <h4 className="text-lg font-medium text-white mb-4">📤 Enviar Mensaje de Prueba</h4>
            <div className="grid gap-4">
              {/* Número de destino */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Número de destino (con código de país)
                </label>
                <input
                  type="text"
                  value={testMessageForm.to}
                  onChange={(e) => setTestMessageForm({ ...testMessageForm, to: e.target.value })}
                  placeholder="+584144559038"
                  className="w-full px-4 py-3 bg-slate-800/50 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:border-green-500/50 focus:outline-none"
                />
              </div>

              {/* Mensaje */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Mensaje
                </label>
                <textarea
                  value={testMessageForm.message}
                  onChange={(e) => setTestMessageForm({ ...testMessageForm, message: e.target.value })}
                  placeholder="Escribe el mensaje de prueba..."
                  rows={3}
                  className="w-full px-4 py-3 bg-slate-800/50 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:border-green-500/50 focus:outline-none resize-none"
                />
              </div>

              {/* Resultado del envío */}
              {testMessageResult && (
                <div className={`p-4 rounded-xl flex items-center gap-3 ${testMessageResult.success
                  ? 'bg-green-500/10 border border-green-500/30'
                  : 'bg-red-500/10 border border-red-500/30'
                  }`}>
                  {testMessageResult.success ? (
                    <Check className="text-green-400" size={20} />
                  ) : (
                    <AlertCircle className="text-red-400" size={20} />
                  )}
                  <span className={testMessageResult.success ? 'text-green-300' : 'text-red-300'}>
                    {testMessageResult.message}
                  </span>
                </div>
              )}

              {/* Botón de enviar */}
              <button
                onClick={sendTestMessage}
                disabled={sendingTestMessage || !config?.whatsapp.has_token || !testMessageForm.to || !testMessageForm.message}
                className="flex items-center justify-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {sendingTestMessage ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <MessageSquare size={18} />
                )}
                {sendingTestMessage ? 'Enviando...' : 'Enviar Mensaje de Prueba'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Email Config */}
      {activeTab === 'email' && (
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <Mail className="text-blue-400" size={24} />
              </div>
              <div>
                <h3 className="font-semibold text-white">Configuración SMTP</h3>
                <p className="text-sm text-gray-400">Configura el servidor de correo para envío de notificaciones</p>
              </div>
            </div>

            {/* Toggle enabled */}
            <label className="flex items-center gap-2 cursor-pointer">
              <span className="text-sm text-gray-400">Habilitado</span>
              <div className="relative">
                <input
                  type="checkbox"
                  checked={emailForm.enabled}
                  onChange={(e) => setEmailForm({ ...emailForm, enabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-700 rounded-full peer peer-checked:bg-blue-500 transition-colors"></div>
                <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-5"></div>
              </div>
            </label>
          </div>

          {/* Form */}
          <div className="grid gap-4 md:grid-cols-2">
            {/* Host */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Host SMTP
              </label>
              <input
                type="text"
                value={emailForm.host}
                onChange={(e) => setEmailForm({ ...emailForm, host: e.target.value })}
                placeholder="smtp.gmail.com"
                className="w-full px-4 py-3 bg-slate-800/50 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:border-blue-500/50 focus:outline-none"
              />
            </div>

            {/* Port */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Puerto
              </label>
              <input
                type="number"
                value={emailForm.port}
                onChange={(e) => setEmailForm({ ...emailForm, port: parseInt(e.target.value) || 587 })}
                placeholder="587"
                className="w-full px-4 py-3 bg-slate-800/50 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:border-blue-500/50 focus:outline-none"
              />
            </div>

            {/* User */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Usuario
              </label>
              <input
                type="email"
                value={emailForm.user}
                onChange={(e) => setEmailForm({ ...emailForm, user: e.target.value })}
                placeholder="info@fengxchange.com"
                className="w-full px-4 py-3 bg-slate-800/50 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:border-blue-500/50 focus:outline-none"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Contraseña
                {config?.email.has_password && !hasPasswordChanges && (
                  <span className="ml-2 text-xs text-blue-400">
                    (Contraseña configurada: {config.email.password_masked})
                  </span>
                )}
              </label>
              <div className="relative">
                <input
                  type={showEmailPassword ? 'text' : 'password'}
                  value={emailForm.password}
                  onChange={(e) => {
                    setEmailForm({ ...emailForm, password: e.target.value });
                    setHasPasswordChanges(true);
                  }}
                  placeholder={config?.email.has_password ? "Dejar vacío para mantener" : "Contraseña SMTP"}
                  className="w-full px-4 py-3 pr-12 bg-slate-800/50 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:border-blue-500/50 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowEmailPassword(!showEmailPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                >
                  {showEmailPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {/* From Email */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Email Remitente
              </label>
              <input
                type="email"
                value={emailForm.from_email}
                onChange={(e) => setEmailForm({ ...emailForm, from_email: e.target.value })}
                placeholder="notificaciones@fengxchange.com"
                className="w-full px-4 py-3 bg-slate-800/50 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:border-blue-500/50 focus:outline-none"
              />
            </div>

            {/* From Name */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Nombre Remitente
              </label>
              <input
                type="text"
                value={emailForm.from_name}
                onChange={(e) => setEmailForm({ ...emailForm, from_name: e.target.value })}
                placeholder="FengXchange Notificaciones"
                className="w-full px-4 py-3 bg-slate-800/50 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:border-blue-500/50 focus:outline-none"
              />
            </div>
          </div>

          {/* Test Result */}
          {testResult?.type === 'email' && (
            <div className={`p-4 rounded-xl flex items-center gap-3 ${testResult.success
              ? 'bg-green-500/10 border border-green-500/30'
              : 'bg-red-500/10 border border-red-500/30'
              }`}>
              {testResult.success ? (
                <Check className="text-green-400" size={20} />
              ) : (
                <AlertCircle className="text-red-400" size={20} />
              )}
              <span className={testResult.success ? 'text-green-300' : 'text-red-300'}>
                {testResult.message}
              </span>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={testEmail}
              disabled={testing === 'email' || !config?.email.has_password}
              className="flex items-center gap-2 px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {testing === 'email' ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <Send size={18} />
              )}
              Probar Conexión
            </button>

            <button
              onClick={saveEmail}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-medium transition-colors disabled:opacity-50"
            >
              {saving ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <Check size={18} />
              )}
              Guardar Configuración
            </button>
          </div>
        </div>
      )}

      {/* Templates */}
      {activeTab === 'templates' && (
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500/20 rounded-lg">
              <FileText className="text-purple-400" size={24} />
            </div>
            <div>
              <h3 className="font-semibold text-white">Plantillas de Notificación</h3>
              <p className="text-sm text-gray-400">Administra las plantillas para WhatsApp y Email</p>
            </div>
          </div>

          {/* Coming Soon */}
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="p-4 bg-purple-500/10 rounded-full mb-4">
              <FileText className="text-purple-400" size={40} />
            </div>
            <h4 className="text-lg font-medium text-white mb-2">Próximamente</h4>
            <p className="text-gray-400 max-w-md">
              La gestión de plantillas estará disponible en una próxima actualización.
              Podrás crear y editar plantillas para diferentes tipos de notificaciones.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
