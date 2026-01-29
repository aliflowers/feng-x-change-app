'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase/client';
import {
  Save,
  Loader2,
  Building2,
  Mail,
  Phone,
  MessageCircle,
  MapPin,
  Clock,
  FileText,
  Shield,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Upload,
  Image as ImageIcon
} from 'lucide-react';

interface BusinessInfo {
  business_name: string;
  logo_url: string;
  contact_email: string;
  contact_phone: string;
  contact_whatsapp: string;
  address: string;
  business_hours: string;
  terms_and_conditions: string;
  privacy_policy: string;
}

interface BusinessHours {
  monday: string;
  tuesday: string;
  wednesday: string;
  thursday: string;
  friday: string;
  saturday: string;
  sunday: string;
}

interface Toast {
  type: 'success' | 'error';
  message: string;
}

const defaultHours: BusinessHours = {
  monday: '9:00-18:00',
  tuesday: '9:00-18:00',
  wednesday: '9:00-18:00',
  thursday: '9:00-18:00',
  friday: '9:00-18:00',
  saturday: 'cerrado',
  sunday: 'cerrado',
};

const dayLabels: Record<keyof BusinessHours, string> = {
  monday: 'Lunes',
  tuesday: 'Martes',
  wednesday: 'Miércoles',
  thursday: 'Jueves',
  friday: 'Viernes',
  saturday: 'Sábado',
  sunday: 'Domingo',
};

export default function InfoNegocioTab() {
  const [info, setInfo] = useState<BusinessInfo>({
    business_name: 'FengXchange',
    logo_url: '',
    contact_email: '',
    contact_phone: '',
    contact_whatsapp: '',
    address: '',
    business_hours: JSON.stringify(defaultHours),
    terms_and_conditions: '',
    privacy_policy: '',
  });
  const [originalInfo, setOriginalInfo] = useState<BusinessInfo | null>(null);
  const [hours, setHours] = useState<BusinessHours>(defaultHours);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);
  const [activeSection, setActiveSection] = useState<'general' | 'hours' | 'legal'>('general');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validar tipo de archivo
    const validTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];
    if (!validTypes.includes(file.type)) {
      setToast({ type: 'error', message: 'Formato no válido. Use PNG, JPG, WEBP o SVG' });
      return;
    }

    // Validar tamaño (2MB máximo)
    if (file.size > 2 * 1024 * 1024) {
      setToast({ type: 'error', message: 'El archivo es muy grande. Máximo 2MB' });
      return;
    }

    setUploading(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `logo-${Date.now()}.${fileExt}`;
      const filePath = `logos/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('assets')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Obtener URL pública
      const { data: { publicUrl } } = supabase.storage
        .from('assets')
        .getPublicUrl(filePath);

      setInfo({ ...info, logo_url: publicUrl });
      setToast({ type: 'success', message: 'Logo subido correctamente' });
    } catch (error) {
      console.error('Error uploading logo:', error);
      setToast({ type: 'error', message: 'Error al subir el logo' });
    } finally {
      setUploading(false);
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  useEffect(() => {
    fetchInfo();
  }, []);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const fetchInfo = async () => {
    try {
      const response = await fetch('/api/config/business');

      if (!response.ok) {
        throw new Error('Error al cargar información');
      }

      const data = await response.json();

      if (data.info) {
        const newInfo: BusinessInfo = {
          business_name: data.info.business_name || 'FengXchange',
          logo_url: data.info.logo_url || '',
          contact_email: data.info.contact_email || '',
          contact_phone: data.info.contact_phone || '',
          contact_whatsapp: data.info.contact_whatsapp || '',
          address: data.info.address || '',
          business_hours: data.info.business_hours || JSON.stringify(defaultHours),
          terms_and_conditions: data.info.terms_and_conditions || '',
          privacy_policy: data.info.privacy_policy || '',
        };
        setInfo(newInfo);
        setOriginalInfo(newInfo);

        try {
          const parsedHours = JSON.parse(data.info.business_hours || '{}');
          setHours({ ...defaultHours, ...parsedHours });
        } catch {
          setHours(defaultHours);
        }
      }
    } catch (error) {
      console.error('Error fetching business info:', error);
      setToast({ type: 'error', message: 'Error al cargar información' });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);

    try {
      const updatedInfo = {
        ...info,
        business_hours: JSON.stringify(hours),
      };

      const response = await fetch('/api/config/business', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedInfo),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al guardar');
      }

      setInfo(updatedInfo);
      setOriginalInfo(updatedInfo);
      setToast({ type: 'success', message: 'Información guardada correctamente' });
    } catch (error) {
      console.error('Error saving business info:', error);
      setToast({ type: 'error', message: error instanceof Error ? error.message : 'Error al guardar' });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (originalInfo) {
      setInfo(originalInfo);
      try {
        const parsedHours = JSON.parse(originalInfo.business_hours || '{}');
        setHours({ ...defaultHours, ...parsedHours });
      } catch {
        setHours(defaultHours);
      }
    }
  };

  const hasChanges = originalInfo && (
    JSON.stringify(info) !== JSON.stringify(originalInfo) ||
    JSON.stringify(hours) !== JSON.stringify(JSON.parse(originalInfo.business_hours || '{}'))
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toast notification */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg transition-all ${toast.type === 'success'
          ? 'bg-green-500 text-white'
          : 'bg-red-500 text-white'
          }`}>
          {toast.type === 'success' ? (
            <CheckCircle2 size={20} />
          ) : (
            <AlertTriangle size={20} />
          )}
          <span className="font-medium">{toast.message}</span>
        </div>
      )}

      {/* Section tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        <button
          onClick={() => setActiveSection('general')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeSection === 'general'
            ? 'bg-white text-slate-800 shadow-sm'
            : 'text-slate-500 hover:text-slate-700'
            }`}
        >
          <Building2 size={16} />
          General
        </button>
        <button
          onClick={() => setActiveSection('hours')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeSection === 'hours'
            ? 'bg-white text-slate-800 shadow-sm'
            : 'text-slate-500 hover:text-slate-700'
            }`}
        >
          <Clock size={16} />
          Horarios
        </button>
        <button
          onClick={() => setActiveSection('legal')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeSection === 'legal'
            ? 'bg-white text-slate-800 shadow-sm'
            : 'text-slate-500 hover:text-slate-700'
            }`}
        >
          <FileText size={16} />
          Legal
        </button>
      </div>

      {/* General Section */}
      {activeSection === 'general' && (
        <div className="space-y-4">
          {/* Nombre y Logo en una fila */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                <Building2 size={16} className="text-slate-400" />
                Nombre del Negocio
              </label>
              <input
                type="text"
                value={info.business_name}
                onChange={(e) => setInfo({ ...info, business_name: e.target.value })}
                className="w-full px-4 py-2.5 rounded-lg border border-slate-200 bg-white focus:ring-2 focus:ring-[#AB2820]/20 focus:border-[#AB2820] transition-all"
                placeholder="Nombre del negocio"
              />
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                <ImageIcon size={16} className="text-slate-400" />
                URL del Logo
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={info.logo_url}
                  onChange={(e) => setInfo({ ...info, logo_url: e.target.value })}
                  className="flex-1 px-4 py-2.5 rounded-lg border border-slate-200 bg-white focus:ring-2 focus:ring-[#AB2820]/20 focus:border-[#AB2820] transition-all"
                  placeholder="https://ejemplo.com/logo.png"
                />
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleLogoUpload}
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="px-3 py-2.5 bg-slate-100 border border-slate-200 rounded-lg hover:bg-slate-200 transition-colors disabled:opacity-50"
                >
                  {uploading ? (
                    <Loader2 size={18} className="text-slate-600 animate-spin" />
                  ) : (
                    <Upload size={18} className="text-slate-600" />
                  )}
                </button>
              </div>
              {info.logo_url && (
                <div className="mt-2 p-2 bg-slate-50 rounded-lg border border-slate-100 inline-block">
                  <img src={info.logo_url} alt="Logo preview" className="h-10 object-contain" />
                </div>
              )}
            </div>
          </div>

          {/* Contacto */}
          <div className="pt-4 border-t border-slate-100">
            <h4 className="text-sm font-semibold text-slate-600 uppercase tracking-wider mb-4">Información de Contacto</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                  <Mail size={16} className="text-slate-400" />
                  Email de Contacto
                </label>
                <input
                  type="email"
                  value={info.contact_email}
                  onChange={(e) => setInfo({ ...info, contact_email: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-200 bg-white focus:ring-2 focus:ring-[#AB2820]/20 focus:border-[#AB2820] transition-all"
                  placeholder="contacto@empresa.com"
                />
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                  <Phone size={16} className="text-slate-400" />
                  Teléfono
                </label>
                <input
                  type="tel"
                  value={info.contact_phone}
                  onChange={(e) => setInfo({ ...info, contact_phone: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-200 bg-white focus:ring-2 focus:ring-[#AB2820]/20 focus:border-[#AB2820] transition-all"
                  placeholder="+58 412 1234567"
                />
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                  <MessageCircle size={16} className="text-slate-400" />
                  WhatsApp
                </label>
                <input
                  type="tel"
                  value={info.contact_whatsapp}
                  onChange={(e) => setInfo({ ...info, contact_whatsapp: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-200 bg-white focus:ring-2 focus:ring-[#AB2820]/20 focus:border-[#AB2820] transition-all"
                  placeholder="+58 412 1234567"
                />
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                  <MapPin size={16} className="text-slate-400" />
                  Dirección
                </label>
                <input
                  type="text"
                  value={info.address}
                  onChange={(e) => setInfo({ ...info, address: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-200 bg-white focus:ring-2 focus:ring-[#AB2820]/20 focus:border-[#AB2820] transition-all"
                  placeholder="Av. Principal, Edificio Centro, Piso 5"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hours Section */}
      {activeSection === 'hours' && (
        <div className="space-y-4">
          <p className="text-sm text-slate-500">Configura el horario de atención para cada día de la semana. Usa formato "9:00-18:00" o escribe "cerrado".</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {(Object.keys(dayLabels) as (keyof BusinessHours)[]).map((day) => (
              <div key={day} className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">{dayLabels[day]}</label>
                <input
                  type="text"
                  value={hours[day]}
                  onChange={(e) => setHours({ ...hours, [day]: e.target.value })}
                  className={`w-full px-3 py-2 rounded-lg border text-sm transition-all focus:ring-2 focus:ring-[#AB2820]/20 focus:border-[#AB2820] ${hours[day].toLowerCase() === 'cerrado'
                    ? 'bg-slate-50 border-slate-200 text-slate-400'
                    : 'bg-white border-slate-200'
                    }`}
                  placeholder="9:00-18:00"
                />
              </div>
            ))}
          </div>

          <div className="flex gap-2 pt-2">
            <button
              onClick={() => setHours({
                monday: '9:00-18:00',
                tuesday: '9:00-18:00',
                wednesday: '9:00-18:00',
                thursday: '9:00-18:00',
                friday: '9:00-18:00',
                saturday: 'cerrado',
                sunday: 'cerrado',
              })}
              className="text-sm text-[#AB2820] hover:text-[#8a201a] font-medium"
            >
              Aplicar horario estándar (L-V 9-18)
            </button>
          </div>
        </div>
      )}

      {/* Legal Section */}
      {activeSection === 'legal' && (
        <div className="space-y-6">
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <FileText size={16} className="text-slate-400" />
              Términos y Condiciones
            </label>
            <textarea
              value={info.terms_and_conditions}
              onChange={(e) => setInfo({ ...info, terms_and_conditions: e.target.value })}
              className="w-full px-4 py-3 rounded-lg border border-slate-200 bg-white focus:ring-2 focus:ring-[#AB2820]/20 focus:border-[#AB2820] transition-all resize-none text-sm"
              rows={8}
              placeholder="Escribe aquí los términos y condiciones de uso del servicio..."
            />
            <p className="text-xs text-slate-400">Este texto se mostrará a los usuarios en la sección de Términos y Condiciones.</p>
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <Shield size={16} className="text-slate-400" />
              Política de Privacidad
            </label>
            <textarea
              value={info.privacy_policy}
              onChange={(e) => setInfo({ ...info, privacy_policy: e.target.value })}
              className="w-full px-4 py-3 rounded-lg border border-slate-200 bg-white focus:ring-2 focus:ring-[#AB2820]/20 focus:border-[#AB2820] transition-all resize-none text-sm"
              rows={8}
              placeholder="Escribe aquí la política de privacidad y manejo de datos..."
            />
            <p className="text-xs text-slate-400">Este texto se mostrará a los usuarios en la sección de Política de Privacidad.</p>
          </div>
        </div>
      )}

      {/* Botones de acción */}
      <div className="flex items-center justify-between pt-4 border-t border-slate-200">
        <div>
          {hasChanges && (
            <span className="text-sm text-amber-600 flex items-center gap-2">
              <AlertTriangle size={16} />
              Hay cambios sin guardar
            </span>
          )}
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleReset}
            disabled={!hasChanges || saving}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            <RefreshCw size={18} />
            Restablecer
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#AB2820] to-[#C13030] text-white font-medium hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {saving ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <Save size={18} />
            )}
            {saving ? 'Guardando...' : 'Guardar Cambios'}
          </button>
        </div>
      </div>
    </div>
  );
}
