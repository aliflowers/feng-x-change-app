'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import {
 UserCog,
 Plus,
 Search,
 Filter,
 Phone,
 Mail,
 Shield,
 Eye,
 EyeOff,
 RefreshCw,
 X,
 Check,
 AlertTriangle,
 Loader2,
 KeyRound,
 UserCheck,
 UserX,
 Trash2,
} from 'lucide-react';

interface InternalUser {
 id: string;
 first_name: string;
 last_name: string;
 email: string;
 role: 'SUPER_ADMIN' | 'ADMIN' | 'CAJERO' | 'SUPERVISOR';
 whatsapp_number: string | null;
 is_active: boolean;
 created_at: string;
}

interface FormData {
 first_name: string;
 last_name: string;
 email: string;
 password: string;
 role: 'ADMIN' | 'CAJERO' | 'SUPERVISOR';
 whatsapp_number: string;
}

const ROLE_LABELS: Record<string, { label: string; color: string; bgColor: string }> = {
 SUPER_ADMIN: { label: 'Super Admin', color: 'text-amber-700', bgColor: 'bg-amber-100' },
 ADMIN: { label: 'Administrador', color: 'text-blue-700', bgColor: 'bg-blue-100' },
 CAJERO: { label: 'Cajero', color: 'text-emerald-700', bgColor: 'bg-emerald-100' },
 SUPERVISOR: { label: 'Supervisor', color: 'text-purple-700', bgColor: 'bg-purple-100' },
};

const INTERNAL_ROLES = [
 { value: 'ADMIN', label: 'Administrador' },
 { value: 'CAJERO', label: 'Cajero' },
 { value: 'SUPERVISOR', label: 'Supervisor' },
];

export default function UsuariosPage() {
 const router = useRouter();
 const [users, setUsers] = useState<InternalUser[]>([]);
 const [loading, setLoading] = useState(true);
 const [searchTerm, setSearchTerm] = useState('');
 const [roleFilter, setRoleFilter] = useState('');
 const [showModal, setShowModal] = useState(false);
 const [editingUser, setEditingUser] = useState<InternalUser | null>(null);
 const [saving, setSaving] = useState(false);
 const [error, setError] = useState('');
 const [success, setSuccess] = useState('');
 const [showPassword, setShowPassword] = useState(false);
 const [generatePassword, setGeneratePassword] = useState(true);
 const [confirmAction, setConfirmAction] = useState<{ type: 'deactivate' | 'activate' | 'reset' | 'delete'; user: InternalUser } | null>(null);

 const [formData, setFormData] = useState<FormData>({
  first_name: '',
  last_name: '',
  email: '',
  password: '',
  role: 'CAJERO',
  whatsapp_number: '',
 });

 // Verificar acceso SUPER_ADMIN
 useEffect(() => {
  const checkAccess = async () => {
   const { data: { user } } = await supabase.auth.getUser();
   if (!user) {
    router.push('/backoffice');
    return;
   }

   const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

   if (!profile || profile.role !== 'SUPER_ADMIN') {
    router.push('/panel');
    return;
   }

   loadUsers();
  };

  checkAccess();
 }, [router]);

 const loadUsers = useCallback(async () => {
  setLoading(true);
  try {
   const params = new URLSearchParams();
   if (roleFilter) params.append('role', roleFilter);
   if (searchTerm) params.append('search', searchTerm);

   const response = await fetch(`/api/admin/users?${params.toString()}`);
   const data = await response.json();

   if (response.ok) {
    setUsers(data.users || []);
   } else {
    setError(data.error || 'Error al cargar usuarios');
   }
  } catch {
   setError('Error de conexión');
  } finally {
   setLoading(false);
  }
 }, [roleFilter, searchTerm]);

 useEffect(() => {
  const debounce = setTimeout(() => {
   loadUsers();
  }, 300);
  return () => clearTimeout(debounce);
 }, [loadUsers]);

 const openCreateModal = () => {
  setEditingUser(null);
  setFormData({
   first_name: '',
   last_name: '',
   email: '',
   password: '',
   role: 'CAJERO',
   whatsapp_number: '',
  });
  setGeneratePassword(true);
  setShowPassword(false);
  setError('');
  setShowModal(true);
 };

 const openEditModal = (user: InternalUser) => {
  setEditingUser(user);
  setFormData({
   first_name: user.first_name,
   last_name: user.last_name,
   email: user.email,
   password: '',
   role: user.role as 'ADMIN' | 'CAJERO' | 'SUPERVISOR',
   whatsapp_number: user.whatsapp_number || '',
  });
  setError('');
  setShowModal(true);
 };

 const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setSaving(true);
  setError('');

  try {
   if (editingUser) {
    // Actualizar usuario
    const response = await fetch(`/api/admin/users/${editingUser.id}`, {
     method: 'PUT',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({
      first_name: formData.first_name,
      last_name: formData.last_name,
      role: formData.role,
      whatsapp_number: formData.whatsapp_number,
     }),
    });

    const data = await response.json();
    if (!response.ok) {
     throw new Error(data.error);
    }

    setSuccess('Usuario actualizado correctamente');
   } else {
    // Crear usuario
    const response = await fetch('/api/admin/users', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({
      ...formData,
      password: generatePassword ? undefined : formData.password,
     }),
    });

    const data = await response.json();
    if (!response.ok) {
     throw new Error(data.error);
    }

    // La contraseña ya no se muestra por seguridad - solo se envía por WhatsApp
    setSuccess(`Usuario "${data.user.first_name} ${data.user.last_name}" creado correctamente. Las credenciales fueron enviadas por WhatsApp.`);
   }

   setShowModal(false);
   loadUsers();
  } catch (err) {
   setError(err instanceof Error ? err.message : 'Error al guardar');
  } finally {
   setSaving(false);
  }
 };

 const handleToggleActive = async () => {
  if (!confirmAction) return;
  setSaving(true);

  try {
   const response = await fetch(`/api/admin/users/${confirmAction.user.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
     is_active: confirmAction.type === 'activate',
    }),
   });

   const data = await response.json();
   if (!response.ok) {
    throw new Error(data.error);
   }

   setSuccess(`Usuario ${confirmAction.type === 'activate' ? 'activado' : 'desactivado'} correctamente`);
   setConfirmAction(null);
   loadUsers();
  } catch (err) {
   setError(err instanceof Error ? err.message : 'Error al cambiar estado');
  } finally {
   setSaving(false);
  }
 };

 const handleResetPassword = async () => {
  if (!confirmAction || confirmAction.type !== 'reset') return;
  setSaving(true);

  try {
   const response = await fetch(`/api/admin/users/${confirmAction.user.id}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
   });

   const data = await response.json();
   if (!response.ok) {
    throw new Error(data.error);
   }

   // Ya no mostramos la contraseña - solo se envía por WhatsApp
   setSuccess(`Contraseña reseteada y enviada por WhatsApp a ${confirmAction.user.first_name}`);
   setConfirmAction(null);
  } catch (err) {
   setError(err instanceof Error ? err.message : 'Error al resetear contraseña');
  } finally {
   setSaving(false);
  }
 };

 const handleDeleteUser = async () => {
  if (!confirmAction || confirmAction.type !== 'delete') return;
  setSaving(true);

  try {
   const response = await fetch(`/api/admin/users/${confirmAction.user.id}?permanent=true`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
   });

   const data = await response.json();
   if (!response.ok) {
    throw new Error(data.error);
   }

   setSuccess(`Usuario "${confirmAction.user.first_name} ${confirmAction.user.last_name}" eliminado permanentemente`);
   setConfirmAction(null);
   loadUsers();
  } catch (err) {
   setError(err instanceof Error ? err.message : 'Error al eliminar usuario');
  } finally {
   setSaving(false);
  }
 };

 const formatPhone = (phone: string | null) => {
  if (!phone) return '-';
  // Formatear como +XX XXX-XXXXXXX
  if (phone.length >= 11) {
   return `+${phone.slice(0, 2)} ${phone.slice(2, 5)}-${phone.slice(5)}`;
  }
  return phone;
 };

 return (
  <div className="space-y-6">
   {/* Header */}
   <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
    <div className="flex items-center gap-3">
     <div className="w-12 h-12 bg-gradient-to-br from-slate-700 to-slate-800 rounded-xl flex items-center justify-center">
      <UserCog className="text-white" size={24} />
     </div>
     <div>
      <h1 className="text-2xl font-bold text-slate-800">Usuarios Internos</h1>
      <p className="text-slate-500 text-sm">Gestiona administradores, cajeros y supervisores</p>
     </div>
    </div>
    <button
     onClick={openCreateModal}
     className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-medium rounded-xl shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/50 transition-all"
    >
     <Plus size={20} />
     Nuevo Usuario
    </button>
   </div>

   {/* Alerts */}
   {error && (
    <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
     <AlertTriangle size={20} />
     <span>{error}</span>
     <button onClick={() => setError('')} className="ml-auto"><X size={18} /></button>
    </div>
   )}
   {success && (
    <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700">
     <Check size={20} />
     <span>{success}</span>
     <button onClick={() => setSuccess('')} className="ml-auto"><X size={18} /></button>
    </div>
   )}

   {/* Contraseña ya no se muestra por seguridad - solo se envía por WhatsApp */}

   {/* Filters */}
   <div className="flex flex-col sm:flex-row gap-3">
    <div className="relative flex-1">
     <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
     <input
      type="text"
      placeholder="Buscar por nombre o email..."
      value={searchTerm}
      onChange={(e) => setSearchTerm(e.target.value)}
      className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-300"
     />
    </div>
    <div className="relative">
     <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
     <select
      value={roleFilter}
      onChange={(e) => setRoleFilter(e.target.value)}
      className="pl-10 pr-8 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-300 appearance-none bg-white min-w-[180px]"
     >
      <option value="">Todos los roles</option>
      <option value="ADMIN">Administradores</option>
      <option value="CAJERO">Cajeros</option>
      <option value="SUPERVISOR">Supervisores</option>
     </select>
    </div>
    <button
     onClick={loadUsers}
     className="px-4 py-2.5 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
    >
     <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
    </button>
   </div>

   {/* Users List */}
   {loading ? (
    <div className="flex items-center justify-center py-12">
     <Loader2 className="animate-spin text-slate-400" size={32} />
    </div>
   ) : users.length === 0 ? (
    <div className="text-center py-12 bg-white rounded-2xl border border-slate-200">
     <UserCog className="mx-auto text-slate-300" size={48} />
     <p className="mt-3 text-slate-500">No se encontraron usuarios</p>
    </div>
   ) : (
    <div className="grid gap-4">
     {users.map((user) => (
      <div
       key={user.id}
       className={`bg-white rounded-2xl border p-5 transition-all hover:shadow-lg ${user.is_active ? 'border-slate-200' : 'border-red-200 bg-red-50/30'
        }`}
      >
       <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        {/* Avatar & Info */}
        <div className="flex items-center gap-4 flex-1">
         <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-white ${user.role === 'SUPER_ADMIN'
          ? 'bg-gradient-to-br from-amber-500 to-orange-500'
          : user.is_active
           ? 'bg-gradient-to-br from-slate-600 to-slate-700'
           : 'bg-slate-400'
          }`}>
          {user.first_name[0]}{user.last_name[0]}
         </div>
         <div className="min-w-0">
          <div className="flex items-center gap-2">
           <h3 className="font-semibold text-slate-800 truncate">
            {user.first_name} {user.last_name}
           </h3>
           {!user.is_active && (
            <span className="px-2 py-0.5 text-xs bg-red-100 text-red-700 rounded-full">
             Inactivo
            </span>
           )}
          </div>
          <div className="flex items-center gap-4 text-sm text-slate-500 mt-1">
           <span className="flex items-center gap-1">
            <Mail size={14} />
            {user.email}
           </span>
           <span className="flex items-center gap-1">
            <Phone size={14} />
            {formatPhone(user.whatsapp_number)}
           </span>
          </div>
         </div>
        </div>

        {/* Role Badge */}
        <div className={`px-3 py-1.5 rounded-lg text-sm font-medium ${ROLE_LABELS[user.role].bgColor} ${ROLE_LABELS[user.role].color}`}>
         {user.role === 'SUPER_ADMIN' && <Shield size={14} className="inline mr-1" />}
         {ROLE_LABELS[user.role].label}
        </div>

        {/* Actions */}
        {user.role !== 'SUPER_ADMIN' && (
         <div className="flex items-center gap-2">
          <button
           onClick={() => openEditModal(user)}
           className="px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
           Editar
          </button>
          <button
           onClick={() => setConfirmAction({ type: 'reset', user })}
           className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
           title="Resetear contraseña"
          >
           <KeyRound size={18} />
          </button>
          {user.is_active ? (
           <button
            onClick={() => setConfirmAction({ type: 'deactivate', user })}
            className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
            title="Desactivar usuario"
           >
            <UserX size={18} />
           </button>
          ) : (
           <button
            onClick={() => setConfirmAction({ type: 'activate', user })}
            className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
            title="Activar usuario"
           >
            <UserCheck size={18} />
           </button>
          )}
          <button
           onClick={() => setConfirmAction({ type: 'delete', user })}
           className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
           title="Eliminar permanentemente"
          >
           <Trash2 size={18} />
          </button>
         </div>
        )}
       </div>
      </div>
     ))}
    </div>
   )}

   {/* Create/Edit Modal */}
   {showModal && (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
     <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
      <div className="p-6 border-b border-slate-200">
       <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-800">
         {editingUser ? 'Editar Usuario' : 'Nuevo Usuario Interno'}
        </h2>
        <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
         <X size={24} />
        </button>
       </div>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-4">
       {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
         {error}
        </div>
       )}

       <div className="grid grid-cols-2 gap-4">
        <div>
         <label className="block text-sm font-medium text-slate-700 mb-1">Nombre *</label>
         <input
          type="text"
          value={formData.first_name}
          onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
          className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-300"
          required
         />
        </div>
        <div>
         <label className="block text-sm font-medium text-slate-700 mb-1">Apellido *</label>
         <input
          type="text"
          value={formData.last_name}
          onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
          className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-300"
          required
         />
        </div>
       </div>

       <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Email *</label>
        <input
         type="email"
         value={formData.email}
         onChange={(e) => setFormData({ ...formData, email: e.target.value })}
         className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-300 disabled:bg-slate-100"
         required
         disabled={!!editingUser}
        />
        {editingUser && (
         <p className="text-xs text-slate-500 mt-1">El email no puede ser modificado</p>
        )}
       </div>

       {!editingUser && (
        <div>
         <label className="block text-sm font-medium text-slate-700 mb-1">Contraseña</label>
         <div className="space-y-2">
          <label className="flex items-center gap-2">
           <input
            type="checkbox"
            checked={generatePassword}
            onChange={(e) => setGeneratePassword(e.target.checked)}
            className="rounded border-slate-300"
           />
           <span className="text-sm text-slate-600">Generar automáticamente</span>
          </label>
          {!generatePassword && (
           <div className="relative">
            <input
             type={showPassword ? 'text' : 'password'}
             value={formData.password}
             onChange={(e) => setFormData({ ...formData, password: e.target.value })}
             className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-300 pr-10"
             minLength={8}
             required={!generatePassword}
            />
            <button
             type="button"
             onClick={() => setShowPassword(!showPassword)}
             className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
            >
             {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
           </div>
          )}
         </div>
        </div>
       )}

       <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Rol *</label>
        <select
         value={formData.role}
         onChange={(e) => setFormData({ ...formData, role: e.target.value as 'ADMIN' | 'CAJERO' | 'SUPERVISOR' })}
         className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-300 bg-white"
         disabled={editingUser?.role === 'SUPER_ADMIN'}
        >
         {INTERNAL_ROLES.map((r) => (
          <option key={r.value} value={r.value}>{r.label}</option>
         ))}
        </select>
       </div>

       <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
         WhatsApp * <span className="text-slate-400 font-normal">(para notificaciones)</span>
        </label>
        <input
         type="tel"
         value={formData.whatsapp_number}
         onChange={(e) => setFormData({ ...formData, whatsapp_number: e.target.value })}
         placeholder="584141234567"
         className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-300"
         required
        />
        <p className="text-xs text-slate-500 mt-1">Incluir código de país sin + ni espacios</p>
       </div>

       <div className="flex gap-3 pt-4">
        <button
         type="button"
         onClick={() => setShowModal(false)}
         className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 font-medium rounded-xl hover:bg-slate-50 transition-colors"
        >
         Cancelar
        </button>
        <button
         type="submit"
         disabled={saving}
         className="flex-1 px-4 py-2.5 bg-gradient-to-r from-slate-700 to-slate-800 text-white font-medium rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
        >
         {saving ? <Loader2 className="animate-spin" size={18} /> : null}
         {editingUser ? 'Guardar Cambios' : 'Crear Usuario'}
        </button>
       </div>
      </form>
     </div>
    </div>
   )}

   {/* Confirm Action Modal */}
   {confirmAction && (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
     <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
      <div className="text-center">
       {confirmAction.type === 'reset' ? (
        <KeyRound className="mx-auto text-amber-500" size={48} />
       ) : confirmAction.type === 'deactivate' ? (
        <UserX className="mx-auto text-amber-500" size={48} />
       ) : confirmAction.type === 'delete' ? (
        <Trash2 className="mx-auto text-red-500" size={48} />
       ) : (
        <UserCheck className="mx-auto text-emerald-500" size={48} />
       )}

       <h3 className="mt-4 text-xl font-bold text-slate-800">
        {confirmAction.type === 'reset' && 'Resetear Contraseña'}
        {confirmAction.type === 'deactivate' && 'Desactivar Usuario'}
        {confirmAction.type === 'activate' && 'Activar Usuario'}
        {confirmAction.type === 'delete' && 'Eliminar Usuario Permanentemente'}
       </h3>

       <p className="mt-2 text-slate-600">
        {confirmAction.type === 'reset' && (
         <>
          Se generará una nueva contraseña para <strong>{confirmAction.user.first_name} {confirmAction.user.last_name}</strong>
          y se enviará a su WhatsApp.
         </>
        )}
        {confirmAction.type === 'deactivate' && (
         <>
          <strong>{confirmAction.user.first_name} {confirmAction.user.last_name}</strong> no podrá iniciar sesión
          y no recibirá notificaciones.
         </>
        )}
        {confirmAction.type === 'activate' && (
         <>
          <strong>{confirmAction.user.first_name} {confirmAction.user.last_name}</strong> podrá iniciar sesión
          nuevamente.
         </>
        )}
        {confirmAction.type === 'delete' && (
         <>
          ⚠️ <strong>Esta acción es irreversible.</strong> Se eliminará permanentemente a{' '}
          <strong>{confirmAction.user.first_name} {confirmAction.user.last_name}</strong> del sistema.
         </>
        )}
       </p>

       <div className="flex gap-3 mt-6">
        <button
         onClick={() => setConfirmAction(null)}
         className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 font-medium rounded-xl hover:bg-slate-50 transition-colors"
        >
         Cancelar
        </button>
        <button
         onClick={
          confirmAction.type === 'reset' ? handleResetPassword :
           confirmAction.type === 'delete' ? handleDeleteUser :
            handleToggleActive
         }
         disabled={saving}
         className={`flex-1 px-4 py-2.5 text-white font-medium rounded-xl shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2 ${confirmAction.type === 'reset' ? 'bg-amber-500 hover:bg-amber-600' :
           confirmAction.type === 'deactivate' ? 'bg-amber-500 hover:bg-amber-600' :
            confirmAction.type === 'delete' ? 'bg-red-600 hover:bg-red-700' :
             'bg-emerald-500 hover:bg-emerald-600'
          }`}
        >
         {saving ? <Loader2 className="animate-spin" size={18} /> : null}
         {confirmAction.type === 'delete' ? 'Eliminar' : 'Confirmar'}
        </button>
       </div>
      </div>
     </div>
    </div>
   )}
  </div>
 );
}
