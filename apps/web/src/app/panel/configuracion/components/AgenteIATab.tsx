'use client';

import { useState, useEffect } from 'react';
import type { AIConfigResponse } from '@/types/ai-types';

// =========================================================================
// Componente de Configuración del Agente IA - FengBot
// =========================================================================

export default function AgenteIATab() {
  const [config, setConfig] = useState<AIConfigResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Estado del formulario
  const [formData, setFormData] = useState({
    is_enabled: false,
    model: 'gpt-5-nano' as 'gpt-5-nano' | 'gpt-4o' | 'gpt-4o-mini',
    reasoning_effort: 'medium' as 'low' | 'medium' | 'high',
    max_tokens: 2000,
    can_query_rates: true,
    can_calculate_amounts: true,
    can_list_beneficiaries: true,
    can_create_operations: true,
    can_analyze_images: true,
    notify_on_payment_complete: true,
    system_prompt: ''
  });

  // Cargar configuración al montar
  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const response = await fetch('/api/config/ai');
      console.log('[AgenteIATab] Response status:', response.status);
      const data = await response.json();
      console.log('[AgenteIATab] Response data:', data);

      if (response.ok) {
        setConfig(data);
        setFormData({
          is_enabled: data.is_enabled,
          model: data.model,
          reasoning_effort: data.reasoning_effort,
          max_tokens: data.max_tokens,
          can_query_rates: data.can_query_rates,
          can_calculate_amounts: data.can_calculate_amounts,
          can_list_beneficiaries: data.can_list_beneficiaries,
          can_create_operations: data.can_create_operations,
          can_analyze_images: data.can_analyze_images,
          notify_on_payment_complete: data.notify_on_payment_complete,
          system_prompt: data.system_prompt || ''
        });
      }
    } catch (error) {
      console.error('Error loading AI config:', error);
      setMessage({ type: 'error', text: 'Error al cargar la configuración' });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);

    try {
      const response = await fetch('/api/config/ai', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        const data = await response.json();
        setConfig(data);
        setMessage({ type: 'success', text: 'Configuración guardada correctamente' });
      } else {
        const error = await response.json();
        setMessage({ type: 'error', text: error.message || 'Error al guardar' });
      }
    } catch (error) {
      console.error('Error saving AI config:', error);
      setMessage({ type: 'error', text: 'Error de conexión' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500"></div>
        <span className="ml-3 text-gray-400">Cargando configuración...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-3xl">🤖</span>
          <div>
            <h2 className="text-xl font-semibold text-white">Agente IA - FengBot</h2>
            <p className="text-sm text-gray-400">Asistente virtual para WhatsApp</p>
          </div>
        </div>

        {/* Toggle Principal */}
        <label className="flex items-center gap-3 cursor-pointer">
          <span className="text-sm text-gray-400">
            {formData.is_enabled ? 'Activo' : 'Inactivo'}
          </span>
          <div className="relative">
            <input
              type="checkbox"
              checked={formData.is_enabled}
              onChange={(e) => setFormData({ ...formData, is_enabled: e.target.checked })}
              className="sr-only"
            />
            <div className={`w-14 h-7 rounded-full transition-colors ${formData.is_enabled ? 'bg-green-500' : 'bg-gray-600'
              }`}>
              <div className={`absolute top-1 left-1 w-5 h-5 rounded-full bg-white transition-transform ${formData.is_enabled ? 'translate-x-7' : ''
                }`} />
            </div>
          </div>
        </label>
      </div>

      {/* Mensaje de feedback */}
      {message && (
        <div className={`p-4 rounded-xl ${message.type === 'success'
          ? 'bg-green-500/20 border border-green-500/50 text-green-400'
          : 'bg-red-500/20 border border-red-500/50 text-red-400'
          }`}>
          {message.text}
        </div>
      )}

      {/* Configuración del Modelo */}
      <div className="bg-slate-800/50 rounded-xl p-6 border border-white/5">
        <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
          <span>⚙️</span> Configuración del Modelo
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Modelo */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Modelo de IA
            </label>
            <select
              value={formData.model}
              onChange={(e) => setFormData({ ...formData, model: e.target.value as typeof formData.model })}
              className="w-full px-4 py-3 bg-slate-700/50 border border-white/10 rounded-lg text-white focus:border-cyan-500/50 focus:outline-none"
            >
              <option value="gpt-5-nano">gpt-5-nano (Razonamiento avanzado)</option>
              <option value="gpt-5-mini">gpt-5-mini (Recomendado - Agéntico)</option>
              <option value="gpt-4o-mini">gpt-4o-mini (Económico)</option>
              <option value="gpt-4o">gpt-4o (Mayor costo)</option>
            </select>
            <p className="mt-1 text-xs text-gray-500">
              {formData.model === 'gpt-5-nano' && '✨ Con Vision API - Ideal para análisis de comprobantes'}
            </p>
          </div>

          {/* API Key Status */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Estado de API Key
            </label>
            <div className={`px-4 py-3 rounded-lg border ${config?.api_key_status === 'configured'
              ? 'bg-green-500/10 border-green-500/30 text-green-400'
              : 'bg-red-500/10 border-red-500/30 text-red-400'
              }`}>
              {config?.api_key_status === 'configured' ? (
                <span className="flex items-center gap-2">
                  ✅ Configurada en variables de entorno
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  ⚠️ No configurada - Añade OPENAI_API_KEY en .env.local
                </span>
              )}
            </div>
          </div>

          {/* Reasoning Effort */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Esfuerzo de Razonamiento
            </label>
            <div className="flex gap-4">
              {(['low', 'medium', 'high'] as const).map((level) => (
                <label key={level} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="reasoning_effort"
                    checked={formData.reasoning_effort === level}
                    onChange={() => setFormData({ ...formData, reasoning_effort: level })}
                    className="w-4 h-4 text-cyan-500 bg-slate-700 border-gray-600 focus:ring-cyan-500"
                  />
                  <span className="text-gray-300 capitalize">
                    {level === 'low' ? '🐢 Bajo' : level === 'medium' ? '⚡ Medio' : '🚀 Alto'}
                  </span>
                </label>
              ))}
            </div>
            <p className="mt-1 text-xs text-gray-500">
              ℹ️ gpt-5-nano no soporta temperature, usa reasoning_effort en su lugar
            </p>
          </div>

          {/* Max Tokens */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Máx. Tokens de Respuesta
            </label>
            <input
              type="number"
              value={formData.max_tokens}
              onChange={(e) => setFormData({ ...formData, max_tokens: Number(e.target.value) })}
              min={100}
              max={4000}
              className="w-full px-4 py-3 bg-slate-700/50 border border-white/10 rounded-lg text-white focus:border-cyan-500/50 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Capacidades */}
      <div className="bg-slate-800/50 rounded-xl p-6 border border-white/5">
        <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
          <span>🛠️</span> Capacidades Habilitadas
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { key: 'can_query_rates', label: 'Consultar tasas de cambio', icon: '💱' },
            { key: 'can_calculate_amounts', label: 'Calcular montos de conversión', icon: '🧮' },
            { key: 'can_list_beneficiaries', label: 'Listar beneficiarios del cliente', icon: '👥' },
            { key: 'can_analyze_images', label: 'Analizar comprobantes con Vision', icon: '🖼️' },
            { key: 'can_create_operations', label: 'Crear operaciones automáticamente', icon: '📝' },
            { key: 'notify_on_payment_complete', label: 'Notificar pagos completados', icon: '🔔' }
          ].map(({ key, label, icon }) => (
            <label key={key} className="flex items-center gap-3 p-3 bg-slate-700/30 rounded-lg cursor-pointer hover:bg-slate-700/50 transition-colors">
              <input
                type="checkbox"
                checked={formData[key as keyof typeof formData] as boolean}
                onChange={(e) => setFormData({ ...formData, [key]: e.target.checked })}
                className="w-5 h-5 text-cyan-500 bg-slate-700 border-gray-600 rounded focus:ring-cyan-500"
              />
              <span className="text-gray-300 flex items-center gap-2">
                <span>{icon}</span> {label}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* System Prompt */}
      <div className="bg-slate-800/50 rounded-xl p-6 border border-white/5">
        <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
          <span>📋</span> Instrucciones del Agente (System Prompt)
        </h3>

        <textarea
          value={formData.system_prompt}
          onChange={(e) => setFormData({ ...formData, system_prompt: e.target.value })}
          rows={12}
          className="w-full px-4 py-3 bg-slate-700/50 border border-white/10 rounded-lg text-white font-mono text-sm focus:border-cyan-500/50 focus:outline-none resize-y"
          placeholder="Ingresa las instrucciones para el agente..."
        />

        <div className="mt-3 p-3 bg-slate-700/30 rounded-lg">
          <p className="text-xs text-gray-400 mb-2">
            <strong>Variables disponibles:</strong>
          </p>
          <div className="flex flex-wrap gap-2">
            {['{{nombre_negocio}}', '{{horario}}', '{{telefono_soporte}}'].map(v => (
              <code key={v} className="px-2 py-1 bg-slate-600/50 rounded text-xs text-cyan-400">
                {v}
              </code>
            ))}
          </div>
        </div>
      </div>

      {/* Botón Guardar */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-medium rounded-lg hover:from-cyan-600 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
        >
          {saving ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              Guardando...
            </>
          ) : (
            <>💾 Guardar Cambios</>
          )}
        </button>
      </div>
    </div>
  );
}
