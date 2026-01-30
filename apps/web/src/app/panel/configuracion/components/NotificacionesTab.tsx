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
  AlertCircle,
  Plus,
  Trash2,
  RefreshCw,
  X
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

// Interfaz para plantillas de WhatsApp
interface WhatsAppTemplate {
  name: string;
  status: 'APPROVED' | 'PENDING' | 'REJECTED' | 'PAUSED' | 'DISABLED';
  language: string;
  category: string;
  components: Array<{
    type: string;
    text?: string;
  }>;
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
    message: 'Hola! Esto es una prueba de envío de mensaje con la integración de WhatsApp Business API desde FengXchange.',
    isTemplate: false // Para probar inicio de conversación
  });
  const [testMessageResult, setTestMessageResult] = useState<{ success: boolean; message: string } | null>(null);

  // Estado para plantillas
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [creatingTemplate, setCreatingTemplate] = useState(false);
  const [deletingTemplate, setDeletingTemplate] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [templateResult, setTemplateResult] = useState<{ success: boolean; message: string } | null>(null);
  const [newTemplate, setNewTemplate] = useState({
    name: '',
    category: 'UTILITY' as 'UTILITY' | 'MARKETING' | 'AUTHENTICATION',
    language: 'es',
    body: ''
  });

  // Variables predefinidas para plantillas (clicables)
  // Usamos nombres descriptivos para legibilidad, se transforman a {{1}}, {{2}} al enviar a Meta
  const templateVariables = [
    { variable: '{{nombre_cliente}}', label: 'Nombre Cliente', example: 'Juan', description: 'Nombre del cliente' },
    { variable: '{{apellido_cliente}}', label: 'Apellido Cliente', example: 'Pérez', description: 'Apellido del cliente' },
    { variable: '{{numero_operacion}}', label: 'Número Operación', example: 'OP-12345', description: 'Número de referencia de la operación' },
    { variable: '{{monto_enviado}}', label: 'Monto Enviado', example: '100.00', description: 'Monto que envía el cliente' },
    { variable: '{{moneda_origen}}', label: 'Moneda Origen', example: 'USD', description: 'Moneda de origen' },
    { variable: '{{monto_recibido}}', label: 'Monto Recibido', example: '3,650.00', description: 'Monto que recibe el beneficiario' },
    { variable: '{{moneda_destino}}', label: 'Moneda Destino', example: 'VES', description: 'Moneda de destino' },
    { variable: '{{nombre_beneficiario}}', label: 'Nombre Beneficiario', example: 'María', description: 'Nombre del beneficiario' },
    { variable: '{{apellido_beneficiario}}', label: 'Apellido Beneficiario', example: 'González', description: 'Apellido del beneficiario' },
    { variable: '{{banco_plataforma}}', label: 'Banco/Plataforma', example: 'Banesco', description: 'Banco o plataforma del beneficiario' },
    { variable: '{{cuenta_telefono}}', label: 'Cuenta/Teléfono', example: '0412-1234567', description: 'Número de cuenta o teléfono del beneficiario' },
    { variable: '{{referencia_pago}}', label: 'Referencia Pago', example: 'REF-987654', description: 'Número de referencia del pago realizado' },
    { variable: '{{fecha_operacion}}', label: 'Fecha Operación', example: '30/01/2026', description: 'Fecha de la operación' },
    { variable: '{{hora_operacion}}', label: 'Hora Operación', example: '10:30 AM', description: 'Hora de la operación' },
    { variable: '{{tasa_cambio}}', label: 'Tasa de Cambio', example: '36.50', description: 'Tasa de cambio aplicada' },
    { variable: '{{estado_operacion}}', label: 'Estado Operación', example: 'Completada', description: 'Estado actual de la operación' },
  ];

  // Función para insertar variable en el cuerpo del mensaje
  const insertVariable = (variable: string) => {
    setNewTemplate(prev => ({
      ...prev,
      body: prev.body + variable
    }));
  };

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

  // Cargar plantillas
  const loadTemplates = useCallback(async () => {
    try {
      setLoadingTemplates(true);
      setTemplateResult(null);
      const res = await fetch('/api/whatsapp/templates');

      if (!res.ok) {
        throw new Error('Error al cargar plantillas');
      }

      const data = await res.json();
      if (data.success) {
        setTemplates(data.templates || []);
      } else {
        setTemplateResult({ success: false, message: data.error || 'Error al cargar plantillas' });
      }
    } catch (error) {
      console.error('Error loading templates:', error);
      setTemplateResult({ success: false, message: 'Error al cargar plantillas' });
    } finally {
      setLoadingTemplates(false);
    }
  }, []);

  // Cargar plantillas cuando se cambia a la pestaña de templates
  useEffect(() => {
    if (activeTab === 'templates' && config?.whatsapp.has_token) {
      loadTemplates();
    }
  }, [activeTab, config?.whatsapp.has_token, loadTemplates]);

  // Crear plantilla
  const createTemplate = async () => {
    if (!newTemplate.name || !newTemplate.body) {
      setTemplateResult({ success: false, message: 'El nombre y el cuerpo son requeridos' });
      return;
    }

    try {
      setCreatingTemplate(true);
      setTemplateResult(null);

      // Transformar variables descriptivas a formato numérico para Meta
      // {{nombre_cliente}} -> {{1}}, {{apellido_cliente}} -> {{2}}, etc.
      // Lógica de transformación correcta:
      // 1. Encontrar todas las variables usadas en el texto
      // 2. Asignarles {{1}}, {{2}}... en orden de aparición
      let transformedBody = newTemplate.body;
      const usedVariables: string[] = [];

      // Regex para encontrar {{algo}}
      const variableRegex = /{{[\w_]+}}/g;

      // Reemplazo secuencial
      transformedBody = transformedBody.replace(variableRegex, (match) => {
        // Verificar si es una variable válida de nuestra lista
        const knownVar = templateVariables.find(v => v.variable === match);
        if (!knownVar) return match; // Si no la conocemos, la dejamos igual (podría ser error usuario)

        // Si ya la vimos antes, usamos el mismo número?
        // Meta prefiere {{1}} para la primera variable única.
        // Pero si repites "Hola {{1}}, adiós {{1}}", es válido.
        // Ojo: Meta usualmente pide que cada placeholder sea único si son datos distintos.
        // Asumiremos que cada ocurrencia es una variable posicional nueva para simplificar,
        // o mejor: reutilizamos índice si es exactamente la misma variable.
        let index = usedVariables.indexOf(match);
        if (index === -1) {
          usedVariables.push(match);
          index = usedVariables.length - 1;
        }
        return `{{${index + 1}}}`;
      });

      // Recolectar ejemplos para las variables usadas (REQUERIDO POR META)
      const variableExamples: string[] = [];

      // Iterar sobre las variables usadas en orden secuencial ({{1}}, {{2}}...)
      // usedVariables contiene los strings originales como "{{nombre_cliente}}"
      usedVariables.forEach(varName => {
        const v = templateVariables.find(tv => tv.variable === varName);
        variableExamples.push(v ? v.example : 'ejemplo');
      });

      const payload: any = {
        name: newTemplate.name,
        category: newTemplate.category,
        language: newTemplate.language,
        components: [
          {
            type: 'BODY',
            text: transformedBody,
            // Solo agregar examples si hay variables
            ...(variableExamples.length > 0 && {
              example: {
                body_text: [variableExamples]
              }
            })
          }
        ]
      };

      const res = await fetch('/api/whatsapp/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (data.success) {
        setTemplateResult({ success: true, message: data.message });
        setShowCreateForm(false);
        setNewTemplate({ name: '', category: 'UTILITY', language: 'es', body: '' });
        loadTemplates();
      } else {
        setTemplateResult({ success: false, message: data.details || data.error });
      }
    } catch (error) {
      console.error('Error creating template:', error);
      setTemplateResult({ success: false, message: 'Error al crear plantilla' });
    } finally {
      setCreatingTemplate(false);
    }
  };

  // Eliminar plantilla
  const deleteTemplate = async (name: string) => {
    if (!confirm(`¿Estás seguro de eliminar la plantilla "${name}"? Esta acción eliminará todas las versiones de idioma.`)) {
      return;
    }

    try {
      setDeletingTemplate(name);
      setTemplateResult(null);

      const res = await fetch(`/api/whatsapp/templates?name=${encodeURIComponent(name)}`, {
        method: 'DELETE'
      });

      const data = await res.json();

      if (data.success) {
        setTemplateResult({ success: true, message: data.message });
        loadTemplates();
      } else {
        setTemplateResult({ success: false, message: data.details || data.error });
      }
    } catch (error) {
      console.error('Error deleting template:', error);
      setTemplateResult({ success: false, message: 'Error al eliminar plantilla' });
    } finally {
      setDeletingTemplate(null);
    }
  };

  // Helper para obtener badge de estado
  const getStatusBadge = (status: string) => {
    const badges: Record<string, { bg: string; text: string; label: string }> = {
      'APPROVED': { bg: 'bg-green-500/20', text: 'text-green-400', label: 'Aprobada' },
      'PENDING': { bg: 'bg-yellow-500/20', text: 'text-yellow-400', label: 'Pendiente' },
      'REJECTED': { bg: 'bg-red-500/20', text: 'text-red-400', label: 'Rechazada' },
      'PAUSED': { bg: 'bg-gray-500/20', text: 'text-gray-400', label: 'Pausada' },
      'DISABLED': { bg: 'bg-gray-500/20', text: 'text-gray-400', label: 'Deshabilitada' }
    };
    const badge = badges[status] || badges['PENDING'];
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}>
        {badge.label}
      </span>
    );
  };

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
          message: testMessageForm.message,
          type: testMessageForm.isTemplate ? 'template' : 'text',
          template_name: 'hello_world', // Plantilla default de Meta
          language: 'en_US'
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
                <p className="text-sm text-gray-100">Configura la integración con Meta WhatsApp Business</p>
              </div>
            </div>

            {/* Toggle enabled */}
            <label className="flex items-center gap-2 cursor-pointer">
              <span className="text-sm text-gray-50">Habilitado</span>
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
              <label className="block text-sm font-medium text-gray-100 mb-2">
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
              <label className="block text-sm font-medium text-gray-100 mb-2">
                Phone Number ID
              </label>
              <input
                type="text"
                value={waForm.phone_number_id}
                onChange={(e) => setWaForm({ ...waForm, phone_number_id: e.target.value })}
                placeholder="123456789012345"
                className="w-full px-4 py-3 bg-slate-800/50 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:border-green-500/50 focus:outline-none"
              />
              <p className="mt-1 text-xs text-gray-200">
                ID del número de teléfono registrado en Meta Business
              </p>
            </div>

            {/* Business Account ID */}
            <div>
              <label className="block text-sm font-medium text-gray-100 mb-2">
                WhatsApp Business Account ID (WABA ID)
              </label>
              <input
                type="text"
                value={waForm.business_account_id}
                onChange={(e) => setWaForm({ ...waForm, business_account_id: e.target.value })}
                placeholder="123456789012345"
                className="w-full px-4 py-3 bg-slate-800/50 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:border-green-500/50 focus:outline-none"
              />
              <p className="mt-1 text-xs text-gray-200">
                ID de tu cuenta de WhatsApp Business en Meta Business Manager
              </p>
            </div>

            {/* Access Token */}
            <div>
              <label className="block text-sm font-medium text-gray-100 mb-2">
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
              <p className="mt-1 text-xs text-gray-200">
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

              {/* Checkbox template */}
              <label className="flex items-center gap-2 cursor-pointer mb-2">
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={testMessageForm.isTemplate}
                    onChange={(e) => setTestMessageForm({ ...testMessageForm, isTemplate: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-700 rounded-full peer peer-checked:bg-green-500 transition-colors"></div>
                  <div className="absolute left-1 top-1 w-3 h-3 bg-white rounded-full transition-transform peer-checked:translate-x-4"></div>
                </div>
                <span className="text-sm text-gray-300">
                  Usar plantilla <code className="bg-slate-800 px-1 rounded text-xs">hello_world</code> (para iniciar conversación)
                </span>
              </label>

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
          {/* Header con botones */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/20 rounded-lg">
                <FileText className="text-purple-400" size={24} />
              </div>
              <div>
                <h3 className="font-semibold text-white">Plantillas de WhatsApp</h3>
                <p className="text-sm text-gray-200">
                  {templates.length} plantilla{templates.length !== 1 ? 's' : ''} registrada{templates.length !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={loadTemplates}
                disabled={loadingTemplates}
                className="flex items-center gap-2 px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                <RefreshCw size={16} className={loadingTemplates ? 'animate-spin' : ''} />
                Actualizar
              </button>
              <button
                onClick={() => setShowCreateForm(true)}
                disabled={!config?.whatsapp.has_token}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus size={16} />
                Nueva Plantilla
              </button>
            </div>
          </div>

          {/* Alerta si no hay configuración de WhatsApp */}
          {!config?.whatsapp.has_token && (
            <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl flex items-center gap-3">
              <AlertCircle className="text-yellow-400" size={20} />
              <span className="text-yellow-300">
                Configura WhatsApp Business API primero para gestionar plantillas
              </span>
            </div>
          )}

          {/* Resultado de operación */}
          {templateResult && (
            <div className={`p-4 rounded-xl flex items-center gap-3 ${templateResult.success
              ? 'bg-green-500/10 border border-green-500/30'
              : 'bg-red-500/10 border border-red-500/30'
              }`}>
              {templateResult.success ? (
                <Check className="text-green-400" size={20} />
              ) : (
                <AlertCircle className="text-red-400" size={20} />
              )}
              <span className={templateResult.success ? 'text-green-300' : 'text-red-300'}>
                {templateResult.message}
              </span>
            </div>
          )}

          {/* Formulario de creación */}
          {showCreateForm && (
            <div className="p-6 bg-slate-800/50 border border-purple-500/30 rounded-xl space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-lg font-medium text-white">➕ Crear Nueva Plantilla</h4>
                <button
                  onClick={() => setShowCreateForm(false)}
                  className="p-1 text-gray-400 hover:text-white transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                {/* Nombre */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Nombre (snake_case)
                  </label>
                  <input
                    type="text"
                    value={newTemplate.name}
                    onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '') })}
                    placeholder="welcome_message"
                    className="w-full px-4 py-3 bg-slate-700/50 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:border-purple-500/50 focus:outline-none"
                  />
                </div>

                {/* Categoría */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Categoría
                  </label>
                  <select
                    value={newTemplate.category}
                    onChange={(e) => setNewTemplate({ ...newTemplate, category: e.target.value as 'UTILITY' | 'MARKETING' | 'AUTHENTICATION' })}
                    className="w-full px-4 py-3 bg-slate-700/50 border border-white/10 rounded-xl text-white focus:border-purple-500/50 focus:outline-none"
                  >
                    <option value="UTILITY">Utilidad</option>
                    <option value="MARKETING">Marketing</option>
                    <option value="AUTHENTICATION">Autenticación</option>
                  </select>
                </div>

                {/* Idioma */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Idioma
                  </label>
                  <select
                    value={newTemplate.language}
                    onChange={(e) => setNewTemplate({ ...newTemplate, language: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-700/50 border border-white/10 rounded-xl text-white focus:border-purple-500/50 focus:outline-none"
                  >
                    <option value="es">Español (es)</option>
                    <option value="es_ES">Español España (es_ES)</option>
                    <option value="es_MX">Español México (es_MX)</option>
                    <option value="en">Inglés (en)</option>
                    <option value="en_US">Inglés US (en_US)</option>
                    <option value="pt_BR">Portugués Brasil (pt_BR)</option>
                  </select>
                </div>
              </div>

              {/* Variables disponibles */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  🏷️ Variables disponibles
                  <span className="text-gray-500 font-normal ml-2">
                    (haz clic para insertar)
                  </span>
                </label>
                <div className="flex flex-wrap gap-2 p-3 bg-slate-900/50 rounded-xl max-h-40 overflow-y-auto">
                  {templateVariables.map((v) => (
                    <button
                      key={v.variable}
                      type="button"
                      onClick={() => insertVariable(v.variable)}
                      className="px-3 py-1.5 bg-purple-600/30 hover:bg-purple-600/50 border border-purple-500/30 rounded-lg text-sm text-purple-200 transition-colors"
                      title={`${v.description} - Ejemplo: ${v.example}`}
                    >
                      {v.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Cuerpo del mensaje */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Cuerpo del mensaje
                </label>
                <textarea
                  value={newTemplate.body}
                  onChange={(e) => setNewTemplate({ ...newTemplate, body: e.target.value })}
                  placeholder="Hola {{nombre_cliente}} {{apellido_cliente}}, tu operación #{{numero_operacion}} por {{monto_enviado}} {{moneda_origen}} ha sido procesada exitosamente..."
                  rows={5}
                  className="w-full px-4 py-3 bg-slate-700/50 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:border-purple-500/50 focus:outline-none resize-none font-mono text-sm"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Las variables descriptivas se transforman automáticamente al formato requerido por WhatsApp
                </p>
              </div>

              {/* Vista previa */}
              {newTemplate.body && (
                <div className="p-4 bg-slate-900/50 rounded-xl border border-white/5">
                  <p className="text-sm text-gray-400 mb-2">📱 Vista Previa:</p>
                  <p className="text-white whitespace-pre-wrap">
                    {templateVariables.reduce(
                      (text, v) => text.replace(new RegExp(v.variable.replace(/[{}]/g, '\\$&'), 'g'), v.example),
                      newTemplate.body
                    )}
                  </p>
                </div>
              )}

              {/* Nota de aprobación */}
              <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                <p className="text-yellow-300 text-sm">
                  ⚠️ Las plantillas requieren aprobación de Meta (puede tomar 1-48 horas)
                </p>
              </div>

              {/* Botones */}
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowCreateForm(false)}
                  className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={createTemplate}
                  disabled={creatingTemplate || !newTemplate.name || !newTemplate.body}
                  className="flex items-center gap-2 px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {creatingTemplate ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Plus size={16} />
                  )}
                  Crear Plantilla
                </button>
              </div>
            </div>
          )}

          {/* Lista de plantillas */}
          {config?.whatsapp.has_token && (
            <div className="overflow-x-auto">
              {loadingTemplates ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 size={32} className="animate-spin text-purple-400" />
                </div>
              ) : templates.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="p-4 bg-purple-500/10 rounded-full mb-4">
                    <FileText className="text-purple-400" size={40} />
                  </div>
                  <h4 className="text-lg font-medium text-white mb-2">Sin plantillas</h4>
                  <p className="text-gray-200 max-w-md">
                    No hay plantillas registradas en tu cuenta de WhatsApp Business.
                    Crea tu primera plantilla para enviar mensajes automatizados.
                  </p>
                </div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Nombre</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Idioma</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Categoría</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Estado</th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-400">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {templates.map((template, index) => (
                      <tr key={`${template.name}-${template.language}-${index}`} className="border-b border-white/5 hover:bg-white/5">
                        <td className="px-4 py-4">
                          <span className="font-mono text-white">{template.name}</span>
                        </td>
                        <td className="px-4 py-4 text-gray-300">{template.language}</td>
                        <td className="px-4 py-4">
                          <span className="text-gray-300 capitalize">{template.category.toLowerCase()}</span>
                        </td>
                        <td className="px-4 py-4">
                          {getStatusBadge(template.status)}
                        </td>
                        <td className="px-4 py-4 text-right">
                          <button
                            onClick={() => deleteTemplate(template.name)}
                            disabled={deletingTemplate === template.name}
                            className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors disabled:opacity-50"
                            title="Eliminar plantilla"
                          >
                            {deletingTemplate === template.name ? (
                              <Loader2 size={16} className="animate-spin" />
                            ) : (
                              <Trash2 size={16} />
                            )}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* Info adicional */}
          <div className="p-4 bg-slate-800/30 rounded-xl">
            <h5 className="text-sm font-medium text-white mb-2">ℹ️ Información sobre plantillas</h5>
            <ul className="text-sm text-gray-400 space-y-1">
              <li>• Máximo 100 plantillas por hora pueden ser creadas</li>
              <li>• Hasta 250 plantillas activas por cuenta</li>
              <li>• Las plantillas aprobadas pueden usarse para iniciar conversaciones</li>
              <li>• Los estados posibles son: Pendiente, Aprobada, Rechazada, Pausada, Deshabilitada</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
