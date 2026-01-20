'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  User,
  Mail,
  Phone,
  MapPin,
  FileText,
  Lock,
  Save,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Eye,
  EyeOff,
  Globe,
  ChevronDown
} from 'lucide-react';
import { supabase } from '@/lib/supabase/client';

interface ProfileData {
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string | null;
  country: string | null;
  nationality: string | null;
  document_type: string | null;
  document_number: string | null;
}

const documentTypes = [
  { value: 'CEDULA', label: 'Cédula de Identidad' },
  { value: 'PASAPORTE', label: 'Pasaporte' },
  { value: 'DNI', label: 'DNI (Documento Nacional)' },
  { value: 'SSN', label: 'SSN (Social Security Number)' },
  { value: 'RIF', label: 'RIF (Venezuela)' },
  { value: 'NIT', label: 'NIT (Colombia)' },
  { value: 'RUC', label: 'RUC (Perú)' },
  { value: 'RUT', label: 'RUT (Chile)' },
];

// Países con códigos de bandera
const countriesWithFlags = [
  { value: 'Venezuela', code: 'VE' },
  { value: 'Colombia', code: 'CO' },
  { value: 'Perú', code: 'PE' },
  { value: 'Chile', code: 'CL' },
  { value: 'Ecuador', code: 'EC' },
  { value: 'Argentina', code: 'AR' },
  { value: 'México', code: 'MX' },
  { value: 'Estados Unidos', code: 'US' },
  { value: 'España', code: 'ES' },
  { value: 'Panamá', code: 'PA' },
  { value: 'República Dominicana', code: 'DO' },
  { value: 'Brasil', code: 'BR' },
  { value: 'Otro', code: 'WORLD' },
];

// Nacionalidades con códigos de bandera
const nationalitiesWithFlags = [
  { value: 'Venezolana', code: 'VE' },
  { value: 'Colombiana', code: 'CO' },
  { value: 'Peruana', code: 'PE' },
  { value: 'Chilena', code: 'CL' },
  { value: 'Ecuatoriana', code: 'EC' },
  { value: 'Argentina', code: 'AR' },
  { value: 'Mexicana', code: 'MX' },
  { value: 'Estadounidense', code: 'US' },
  { value: 'Española', code: 'ES' },
  { value: 'Panameña', code: 'PA' },
  { value: 'Dominicana', code: 'DO' },
  { value: 'Brasileña', code: 'BR' },
  { value: 'Otra', code: 'WORLD' },
];

// Componente de bandera por código de país
const CountryFlag = ({ code, size = 20 }: { code: string; size?: number }) => {
  const flags: Record<string, React.ReactNode> = {
    VE: (
      <svg viewBox="0 0 60 40" width={size} height={size * 0.67} className="rounded">
        <rect fill="#FFCC00" width="60" height="13.33" />
        <rect fill="#00247D" y="13.33" width="60" height="13.33" />
        <rect fill="#CF142B" y="26.66" width="60" height="13.34" />
      </svg>
    ),
    CO: (
      <svg viewBox="0 0 60 40" width={size} height={size * 0.67} className="rounded">
        <rect fill="#FCD116" width="60" height="20" />
        <rect fill="#003893" y="20" width="60" height="10" />
        <rect fill="#CE1126" y="30" width="60" height="10" />
      </svg>
    ),
    PE: (
      <svg viewBox="0 0 60 40" width={size} height={size * 0.67} className="rounded">
        <rect fill="#D91023" width="20" height="40" />
        <rect fill="#fff" x="20" width="20" height="40" />
        <rect fill="#D91023" x="40" width="20" height="40" />
      </svg>
    ),
    CL: (
      <svg viewBox="0 0 60 40" width={size} height={size * 0.67} className="rounded">
        <rect fill="#fff" width="60" height="20" />
        <rect fill="#D52B1E" y="20" width="60" height="20" />
        <rect fill="#0039A6" width="20" height="20" />
      </svg>
    ),
    EC: (
      <svg viewBox="0 0 60 40" width={size} height={size * 0.67} className="rounded">
        <rect fill="#FFD100" width="60" height="20" />
        <rect fill="#0033A0" y="20" width="60" height="10" />
        <rect fill="#CE1126" y="30" width="60" height="10" />
      </svg>
    ),
    AR: (
      <svg viewBox="0 0 60 40" width={size} height={size * 0.67} className="rounded">
        <rect fill="#74ACDF" width="60" height="13.33" />
        <rect fill="#fff" y="13.33" width="60" height="13.33" />
        <rect fill="#74ACDF" y="26.66" width="60" height="13.34" />
      </svg>
    ),
    MX: (
      <svg viewBox="0 0 60 40" width={size} height={size * 0.67} className="rounded">
        <rect fill="#006847" width="20" height="40" />
        <rect fill="#fff" x="20" width="20" height="40" />
        <rect fill="#CE1126" x="40" width="20" height="40" />
      </svg>
    ),
    US: (
      <svg viewBox="0 0 60 40" width={size} height={size * 0.67} className="rounded">
        <rect fill="#B22234" width="60" height="40" />
        <g fill="#fff">{[0, 1, 2, 3, 4, 5].map(i => <rect key={i} y={i * 6.15 + 3.08} width="60" height="3.08" />)}</g>
        <rect fill="#3C3B6E" width="24" height="21.54" />
      </svg>
    ),
    ES: (
      <svg viewBox="0 0 60 40" width={size} height={size * 0.67} className="rounded">
        <rect fill="#AA151B" width="60" height="10" />
        <rect fill="#F1BF00" y="10" width="60" height="20" />
        <rect fill="#AA151B" y="30" width="60" height="10" />
      </svg>
    ),
    PA: (
      <svg viewBox="0 0 60 40" width={size} height={size * 0.67} className="rounded">
        <rect fill="#fff" width="30" height="20" />
        <rect fill="#005EB8" x="30" width="30" height="20" />
        <rect fill="#DA121A" y="20" width="30" height="20" />
        <rect fill="#fff" x="30" y="20" width="30" height="20" />
      </svg>
    ),
    DO: (
      <svg viewBox="0 0 60 40" width={size} height={size * 0.67} className="rounded">
        <rect fill="#002D62" width="30" height="20" />
        <rect fill="#CE1126" x="30" width="30" height="20" />
        <rect fill="#CE1126" y="20" width="30" height="20" />
        <rect fill="#002D62" x="30" y="20" width="30" height="20" />
        <rect fill="#fff" x="25" y="15" width="10" height="10" />
      </svg>
    ),
    BR: (
      <svg viewBox="0 0 60 40" width={size} height={size * 0.67} className="rounded">
        <rect fill="#009C3B" width="60" height="40" />
        <polygon fill="#FFDF00" points="30,5 55,20 30,35 5,20" />
        <circle cx="30" cy="20" r="8" fill="#002776" />
      </svg>
    ),
    WORLD: (
      <svg viewBox="0 0 60 40" width={size} height={size * 0.67} className="rounded">
        <rect fill="#4ECDC4" width="60" height="40" />
        <circle cx="30" cy="20" r="14" fill="none" stroke="#fff" strokeWidth="2" />
        <ellipse cx="30" cy="20" rx="7" ry="14" fill="none" stroke="#fff" strokeWidth="1.5" />
        <line x1="16" y1="20" x2="44" y2="20" stroke="#fff" strokeWidth="1.5" />
      </svg>
    ),
  };
  return <span className="flex-shrink-0">{flags[code] || null}</span>;
};

export default function ProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [formData, setFormData] = useState<ProfileData>({
    first_name: '',
    last_name: '',
    email: '',
    phone_number: '',
    country: '',
    nationality: '',
    document_type: '',
    document_number: '',
  });

  const [passwordForm, setPasswordForm] = useState({
    current: '',
    new: '',
    confirm: '',
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });
  const [showNationalityDropdown, setShowNationalityDropdown] = useState(false);
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('first_name, last_name, email, phone_number, country, nationality, document_type, document_number')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      if (data) {
        setFormData(data);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No authenticated user');

      const { error } = await supabase
        .from('profiles')
        .update({
          first_name: formData.first_name,
          last_name: formData.last_name,
          phone_number: formData.phone_number || null,
          country: formData.country || null,
          nationality: formData.nationality || null,
          document_type: formData.document_type || null,
          document_number: formData.document_number || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) throw error;
      setMessage({ type: 'success', text: '¡Perfil actualizado correctamente!' });
    } catch (error: any) {
      console.error('Error updating profile:', error);
      setMessage({ type: 'error', text: error.message || 'Error al actualizar el perfil' });
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();

    if (passwordForm.new !== passwordForm.confirm) {
      setMessage({ type: 'error', text: 'Las contraseñas nuevas no coinciden' });
      return;
    }

    if (passwordForm.new.length < 6) {
      setMessage({ type: 'error', text: 'La contraseña debe tener al menos 6 caracteres' });
      return;
    }

    setChangingPassword(true);
    setMessage(null);

    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordForm.new
      });

      if (error) throw error;

      setMessage({ type: 'success', text: '¡Contraseña actualizada correctamente!' });
      setPasswordForm({ current: '', new: '', confirm: '' });
    } catch (error: any) {
      console.error('Error changing password:', error);
      setMessage({ type: 'error', text: error.message || 'Error al cambiar la contraseña' });
    } finally {
      setChangingPassword(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Mi Perfil</h1>
        <p className="text-gray-500">Administra tu información personal y configuración de cuenta.</p>
      </div>

      {/* Mensaje de estado */}
      {message && (
        <div className={`flex items-center gap-3 p-4 rounded-xl ${message.type === 'success'
          ? 'bg-green-50 text-green-800 border border-green-200'
          : 'bg-red-50 text-red-800 border border-red-200'
          }`}>
          {message.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
          <span className="font-medium">{message.text}</span>
        </div>
      )}

      {/* Formulario de Datos Personales */}
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <User size={20} className="text-blue-600" />
            Información Personal
          </h2>
          <p className="text-sm text-gray-500 mt-1">Mantén tus datos actualizados para recibir tus operaciones sin problemas.</p>
        </div>

        <div className="p-6 space-y-6">
          {/* Nombres */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">Nombres *</label>
              <div className="relative">
                <input
                  type="text"
                  name="first_name"
                  value={formData.first_name}
                  onChange={handleChange}
                  className="input pl-10"
                  required
                />
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">Apellidos *</label>
              <div className="relative">
                <input
                  type="text"
                  name="last_name"
                  value={formData.last_name}
                  onChange={handleChange}
                  className="input pl-10"
                  required
                />
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              </div>
            </div>
          </div>

          {/* Email (solo lectura) */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700">Correo Electrónico</label>
            <div className="relative">
              <input
                type="email"
                value={formData.email}
                disabled
                className="input pl-10 bg-gray-100 text-gray-500 cursor-not-allowed"
              />
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            </div>
            <p className="text-xs text-gray-400">El correo electrónico no se puede cambiar.</p>
          </div>

          {/* Teléfono */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700">Número de Teléfono</label>
            <div className="relative">
              <input
                type="tel"
                name="phone_number"
                value={formData.phone_number || ''}
                onChange={handleChange}
                className="input pl-10"
                placeholder="+58 412 1234567"
              />
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            </div>
          </div>

          {/* Nacionalidad y País */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Dropdown de Nacionalidad */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">Nacionalidad</label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowNationalityDropdown(!showNationalityDropdown)}
                  className="input w-full flex items-center gap-3 text-left cursor-pointer"
                >
                  {formData.nationality ? (
                    <>
                      <CountryFlag code={nationalitiesWithFlags.find(n => n.value === formData.nationality)?.code || 'WORLD'} size={24} />
                      <span className="flex-1 truncate">{formData.nationality}</span>
                    </>
                  ) : (
                    <>
                      <Globe className="text-gray-400" size={18} />
                      <span className="flex-1 text-gray-400">Selecciona nacionalidad</span>
                    </>
                  )}
                  <ChevronDown className={`text-gray-400 transition-transform ${showNationalityDropdown ? 'rotate-180' : ''}`} size={18} />
                </button>

                {showNationalityDropdown && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowNationalityDropdown(false)} />
                    <div className="absolute z-50 mt-1 w-full bg-white rounded-xl border border-gray-200 shadow-xl max-h-64 overflow-auto animate-in fade-in slide-in-from-top-2 duration-200">
                      {nationalitiesWithFlags.map(n => (
                        <button
                          key={n.value}
                          type="button"
                          onClick={() => {
                            setFormData(prev => ({ ...prev, nationality: n.value }));
                            setShowNationalityDropdown(false);
                          }}
                          className={`w-full px-4 py-2.5 text-left flex items-center gap-3 hover:bg-blue-50 transition-colors ${formData.nationality === n.value ? 'bg-blue-50 text-blue-700' : 'text-gray-700'}`}
                        >
                          <CountryFlag code={n.code} size={24} />
                          <span className="flex-1">{n.value}</span>
                          {formData.nationality === n.value && <CheckCircle2 className="text-blue-600" size={18} />}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Dropdown de País de Residencia */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">País de Residencia</label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowCountryDropdown(!showCountryDropdown)}
                  className="input w-full flex items-center gap-3 text-left cursor-pointer"
                >
                  {formData.country ? (
                    <>
                      <CountryFlag code={countriesWithFlags.find(c => c.value === formData.country)?.code || 'WORLD'} size={24} />
                      <span className="flex-1 truncate">{formData.country}</span>
                    </>
                  ) : (
                    <>
                      <MapPin className="text-gray-400" size={18} />
                      <span className="flex-1 text-gray-400">Selecciona país</span>
                    </>
                  )}
                  <ChevronDown className={`text-gray-400 transition-transform ${showCountryDropdown ? 'rotate-180' : ''}`} size={18} />
                </button>

                {showCountryDropdown && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowCountryDropdown(false)} />
                    <div className="absolute z-50 mt-1 w-full bg-white rounded-xl border border-gray-200 shadow-xl max-h-64 overflow-auto animate-in fade-in slide-in-from-top-2 duration-200">
                      {countriesWithFlags.map(c => (
                        <button
                          key={c.value}
                          type="button"
                          onClick={() => {
                            setFormData(prev => ({ ...prev, country: c.value }));
                            setShowCountryDropdown(false);
                          }}
                          className={`w-full px-4 py-2.5 text-left flex items-center gap-3 hover:bg-blue-50 transition-colors ${formData.country === c.value ? 'bg-blue-50 text-blue-700' : 'text-gray-700'}`}
                        >
                          <CountryFlag code={c.code} size={24} />
                          <span className="flex-1">{c.value}</span>
                          {formData.country === c.value && <CheckCircle2 className="text-blue-600" size={18} />}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Documento */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">Tipo de Documento</label>
              <div className="relative">
                <select
                  name="document_type"
                  value={formData.document_type || ''}
                  onChange={handleChange}
                  className="input appearance-none pl-10"
                >
                  <option value="">Selecciona tipo</option>
                  {documentTypes.map(dt => (
                    <option key={dt.value} value={dt.value}>{dt.label}</option>
                  ))}
                </select>
                <FileText className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">Número de Documento</label>
              <div className="relative">
                <input
                  type="text"
                  name="document_number"
                  value={formData.document_number || ''}
                  onChange={handleChange}
                  className="input pl-10"
                  placeholder="V12345678"
                />
                <FileText className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              </div>
            </div>
          </div>

          {/* Botón Guardar */}
          <div className="pt-4">
            <button
              type="submit"
              disabled={saving}
              className="btn-primary w-full md:w-auto"
            >
              {saving ? (
                <>
                  <Loader2 className="animate-spin mr-2" size={20} />
                  Guardando...
                </>
              ) : (
                <>
                  <Save size={20} className="mr-2" />
                  Guardar Cambios
                </>
              )}
            </button>
          </div>
        </div>
      </form>

      {/* Cambiar Contraseña */}
      <form onSubmit={handlePasswordChange} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-amber-50 to-orange-50">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Lock size={20} className="text-amber-600" />
            Cambiar Contraseña
          </h2>
          <p className="text-sm text-gray-500 mt-1">Mantén tu cuenta segura con una contraseña fuerte.</p>
        </div>

        <div className="p-6 space-y-4">
          {/* Nueva Contraseña */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700">Nueva Contraseña</label>
            <div className="relative">
              <input
                type={showPasswords.new ? 'text' : 'password'}
                value={passwordForm.new}
                onChange={(e) => setPasswordForm(prev => ({ ...prev, new: e.target.value }))}
                className="input pl-10 pr-12"
                placeholder="••••••••"
                minLength={6}
              />
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <button
                type="button"
                onClick={() => setShowPasswords(prev => ({ ...prev, new: !prev.new }))}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPasswords.new ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Confirmar Contraseña */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700">Confirmar Nueva Contraseña</label>
            <div className="relative">
              <input
                type={showPasswords.confirm ? 'text' : 'password'}
                value={passwordForm.confirm}
                onChange={(e) => setPasswordForm(prev => ({ ...prev, confirm: e.target.value }))}
                className="input pl-10 pr-12"
                placeholder="••••••••"
                minLength={6}
              />
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <button
                type="button"
                onClick={() => setShowPasswords(prev => ({ ...prev, confirm: !prev.confirm }))}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPasswords.confirm ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Botón Cambiar */}
          <div className="pt-4">
            <button
              type="submit"
              disabled={changingPassword || !passwordForm.new || !passwordForm.confirm}
              className="btn-secondary w-full md:w-auto"
            >
              {changingPassword ? (
                <>
                  <Loader2 className="animate-spin mr-2" size={20} />
                  Cambiando...
                </>
              ) : (
                <>
                  <Lock size={20} className="mr-2" />
                  Cambiar Contraseña
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
