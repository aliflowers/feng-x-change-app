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
  Globe
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

const countries = [
  'Venezuela', 'Colombia', 'Perú', 'Chile', 'Ecuador', 'Argentina', 'México',
  'Estados Unidos', 'España', 'Panamá', 'República Dominicana', 'Brasil', 'Otro'
];

const nationalities = [
  'Venezolana', 'Colombiana', 'Peruana', 'Chilena', 'Ecuatoriana', 'Argentina', 'Mexicana',
  'Estadounidense', 'Española', 'Panameña', 'Dominicana', 'Brasileña', 'Otra'
];

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
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">Nacionalidad</label>
              <div className="relative">
                <select
                  name="nationality"
                  value={formData.nationality || ''}
                  onChange={handleChange}
                  className="input appearance-none pl-10"
                >
                  <option value="">Selecciona nacionalidad</option>
                  {nationalities.map(n => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">País de Residencia</label>
              <div className="relative">
                <select
                  name="country"
                  value={formData.country || ''}
                  onChange={handleChange}
                  className="input appearance-none pl-10"
                >
                  <option value="">Selecciona país</option>
                  {countries.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
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
