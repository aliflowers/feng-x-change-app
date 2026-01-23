'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save, Building, User, Hash, CreditCard, ChevronDown, AlertCircle, Loader2, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { z } from 'zod';
import { updateUserBankAccountSchema } from '@fengxchange/shared/validators';

// Extended validation for frontend-only rules
const vesAccountSchema = z.string().length(20, 'El número de cuenta debe tener 20 dígitos');

// Componente de bandera SVG por código de moneda
const FlagIcon = ({ code, size = 40 }: { code: string; size?: number }) => {
  const flags: Record<string, React.ReactNode> = {
    USD: (
      <svg viewBox="0 0 60 40" width={size} height={size * 0.67} className="rounded shadow-sm">
        <rect fill="#B22234" width="60" height="40" />
        <g fill="#fff">{[0, 1, 2, 3, 4, 5].map(i => <rect key={i} y={i * 6.15 + 3.08} width="60" height="3.08" />)}</g>
        <rect fill="#3C3B6E" width="24" height="21.54" />
      </svg>
    ),
    VES: (
      <svg viewBox="0 0 60 40" width={size} height={size * 0.67} className="rounded shadow-sm">
        <rect fill="#FFCC00" width="60" height="13.33" />
        <rect fill="#00247D" y="13.33" width="60" height="13.33" />
        <rect fill="#CF142B" y="26.66" width="60" height="13.34" />
      </svg>
    ),
    COP: (
      <svg viewBox="0 0 60 40" width={size} height={size * 0.67} className="rounded shadow-sm">
        <rect fill="#FCD116" width="60" height="20" />
        <rect fill="#003893" y="20" width="60" height="10" />
        <rect fill="#CE1126" y="30" width="60" height="10" />
      </svg>
    ),
    PEN: (
      <svg viewBox="0 0 60 40" width={size} height={size * 0.67} className="rounded shadow-sm">
        <rect fill="#D91023" width="20" height="40" />
        <rect fill="#fff" x="20" width="20" height="40" />
        <rect fill="#D91023" x="40" width="20" height="40" />
      </svg>
    ),
    CLP: (
      <svg viewBox="0 0 60 40" width={size} height={size * 0.67} className="rounded shadow-sm">
        <rect fill="#fff" width="60" height="20" />
        <rect fill="#D52B1E" y="20" width="60" height="20" />
        <rect fill="#0039A6" width="20" height="20" />
      </svg>
    ),
    EUR: (
      <svg viewBox="0 0 60 40" width={size} height={size * 0.67} className="rounded shadow-sm">
        <rect fill="#003399" width="60" height="40" />
      </svg>
    ),
    PAB: (
      <svg viewBox="0 0 60 40" width={size} height={size * 0.67} className="rounded shadow-sm">
        <rect fill="#fff" width="30" height="20" />
        <rect fill="#005EB8" x="30" width="30" height="20" />
        <rect fill="#DA121A" y="20" width="30" height="20" />
        <rect fill="#fff" x="30" y="20" width="30" height="20" />
      </svg>
    ),
  };
  return flags[code] || <div className="w-10 h-7 bg-gray-200 rounded flex items-center justify-center text-xs">💱</div>;
};

interface Bank {
  id: number;
  name: string;
  currency_code: string;
  country_code: string;
  type: string;
  code: string | null;
}

interface Currency {
  id: number;
  code: string;
  name: string;
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function EditBeneficiaryPage({ params }: PageProps) {
  const { id } = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [notFound, setNotFound] = useState(false);

  // Catalogs
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [banks, setBanks] = useState<Bank[]>([]);

  // Form State
  const [selectedCurrency, setSelectedCurrency] = useState<number>(0);
  const [formData, setFormData] = useState({
    bank_id: '',
    account_number: '',
    account_holder: '',
    document_number: '',
    email: '',
    alias: '',
  });

  // Load Data
  useEffect(() => {
    async function loadData() {
      try {
        // Load catalogs
        const { data: curData } = await supabase.from('currencies').select('*').order('id');
        if (curData) setCurrencies(curData);

        const { data: bankData } = await supabase.from('banks').select('id, name, country_code, currency_code, type, code').eq('is_active', true);
        if (bankData) setBanks(bankData);

        // Load beneficiary data with both bank joins
        const { data: beneficiary, error } = await supabase
          .from('user_bank_accounts')
          .select(`*, 
       bank:banks(name, currency_code),
       banks_platforms(currency_id, currencies(code))
     `)
          .eq('id', id)
          .single();

        if (error || !beneficiary) {
          setNotFound(true);
          return;
        }

        // Set form data - use bank_id if available, fallback to bank_platform_id for old records
        setFormData({
          bank_id: beneficiary.bank_id?.toString() || beneficiary.bank_platform_id?.toString() || '',
          account_number: beneficiary.account_number || '',
          account_holder: beneficiary.account_holder || '',
          document_number: beneficiary.document_number || '',
          email: beneficiary.email || '',
          alias: beneficiary.alias || '',
        });

        // Set selected currency based on bank's currency (new or old records)
        const currCode = beneficiary.bank?.currency_code || beneficiary.banks_platforms?.currencies?.code;
        if (currCode) {
          const cur = curData?.find(c => c.code === currCode);
          if (cur) setSelectedCurrency(cur.id);
        } else if (beneficiary.banks_platforms?.currency_id) {
          setSelectedCurrency(beneficiary.banks_platforms.currency_id);
        }
      } catch (error) {
        console.error('Error loading data:', error);
        setNotFound(true);
      } finally {
        setFetching(false);
      }
    }
    loadData();
  }, [id]);

  const currentCurrencyCode = currencies.find(c => c.id === selectedCurrency)?.code;
  const availableBanks = banks.filter(b => b.currency_code === currentCurrencyCode);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    const result = updateUserBankAccountSchema.safeParse({
      bank_platform_id: parseInt(formData.bank_id) || 1, // Schema still expects bank_platform_id
      account_number: formData.account_number,
      account_holder: formData.account_holder,
      document_number: formData.document_number,
      email: formData.email,
      alias: formData.alias,
    });

    if (!result.success) {
      result.error.errors.forEach(err => {
        if (err.path[0]) newErrors[err.path[0].toString()] = err.message;
      });
    }

    // Specific Logic for VES
    if (currentCurrencyCode === 'VES') {
      const vesCheck = vesAccountSchema.safeParse(formData.account_number);
      if (!vesCheck.success) newErrors.account_number = vesCheck.error.errors[0].message;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No Authenticated User');

      const payload = {
        bank_id: parseInt(formData.bank_id),
        account_number: formData.account_number,
        account_holder: formData.account_holder,
        document_number: formData.document_number,
        email: formData.email || null,
        alias: formData.alias || null,
      };

      const { error } = await supabase
        .from('user_bank_accounts')
        .update(payload)
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      router.push('/app/beneficiarios');
      router.refresh();
    } catch (error) {
      console.error('Error updating beneficiary:', error);
      alert('Error al actualizar el beneficiario. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('¿Estás seguro que deseas eliminar este beneficiario? Esta acción no se puede deshacer.')) return;

    setDeleting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No Authenticated User');

      const { error } = await supabase
        .from('user_bank_accounts')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      router.push('/app/beneficiarios');
      router.refresh();
    } catch (error) {
      console.error('Error deleting beneficiary:', error);
      alert('Error al eliminar el beneficiario.');
    } finally {
      setDeleting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    let { name, value } = e.target;

    // Para VES, solo permitir dígitos numéricos en account_number (máximo 20)
    if (name === 'account_number' && currentCurrencyCode === 'VES') {
      value = value.replace(/\D/g, '').slice(0, 20);
    }

    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  if (fetching) {
    return (
      <div className="max-w-3xl mx-auto flex flex-col items-center justify-center min-h-[50vh] space-y-4">
        <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
        <p className="text-gray-500 animate-pulse">Cargando datos del beneficiario...</p>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="max-w-3xl mx-auto flex flex-col items-center justify-center min-h-[50vh] space-y-4 text-center">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
          <AlertCircle className="w-8 h-8 text-red-500" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900">Beneficiario no encontrado</h2>
        <p className="text-gray-500">El beneficiario que buscas no existe o fue eliminado.</p>
        <Link href="/app/beneficiarios" className="btn-primary">
          Volver a Mis Cuentas
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/app/beneficiarios" className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-600">
            <ArrowLeft size={24} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Editar Beneficiario</h1>
            <p className="text-gray-500 text-sm">Actualiza los datos de esta cuenta.</p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleDelete}
          disabled={deleting}
          className="p-2 text-red-500 hover:bg-red-50 rounded-full transition-colors"
          title="Eliminar beneficiario"
        >
          {deleting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Trash2 size={20} />}
        </button>
      </div>

      <div className="card shadow-lg border-0 ring-1 ring-gray-100">
        <form onSubmit={handleSubmit} className="space-y-8">

          {/* Currency Selection - READ ONLY in edit mode */}
          <div className="space-y-3">
            <label className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Moneda</label>
            <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 flex items-center gap-3">
              <FlagIcon code={currentCurrencyCode || ''} size={36} />
              <div>
                <span className="text-xl font-bold text-gray-700">{currentCurrencyCode}</span>
                <span className="ml-2 text-sm text-gray-500">{currencies.find(c => c.id === selectedCurrency)?.name}</span>
              </div>
            </div>
            <p className="text-xs text-gray-400">La moneda no se puede cambiar. Crea un nuevo beneficiario si necesitas otra moneda.</p>
          </div>

          {/* Form Fields */}
          <div className="space-y-6">
            <div className="h-px bg-gray-100 my-6"></div>
            <label className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Datos de la Cuenta</label>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

              {/* Banco */}
              <div className="space-y-1.5 md:col-span-2">
                <label className="text-sm font-medium text-gray-700">Banco / Plataforma</label>
                <div className="relative">
                  <select
                    name="bank_id"
                    value={formData.bank_id}
                    onChange={handleChange}
                    className={`input appearance-none w-full ${errors.bank_id ? 'border-red-500 focus:ring-red-200' : ''}`}
                    required
                  >
                    <option value="">Selecciona una opción</option>
                    {availableBanks.map(bank => (
                      <option key={bank.id} value={bank.id}>{bank.name}</option>
                    ))}
                  </select>
                  <Building className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={18} />
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={18} />
                </div>
                {errors.bank_id && <p className="text-xs text-red-500 flex items-center gap-1"><AlertCircle size={12} /> {errors.bank_id}</p>}
              </div>

              {/* Número de Cuenta */}
              <div className="space-y-1.5 md:col-span-2">
                <label className="text-sm font-medium text-gray-700">
                  {currentCurrencyCode === 'USD' ? 'Correo Electrónico (Zelle/Zinli/Binance)' : 'Número de Cuenta / Teléfono'}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    name="account_number"
                    value={formData.account_number}
                    onChange={handleChange}
                    className={`input pl-10 w-full font-mono ${errors.account_number ? 'border-red-500 focus:ring-red-200' : ''}`}
                    placeholder={currentCurrencyCode === 'VES' ? '01020000000000000000' : ''}
                  />
                  <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                </div>
                {errors.account_number && <p className="text-xs text-red-500 flex items-center gap-1"><AlertCircle size={12} /> {errors.account_number}</p>}
                {currentCurrencyCode === 'VES' && <p className="text-xs text-gray-400">Debe tener 20 dígitos numéricos.</p>}
              </div>

              {/* Campo Tipo de Cuenta eliminado - se maneja automáticamente */}

              {/* Documento */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">Documento Titular (C.I./NIT/RIF)</label>
                <div className="relative">
                  <input
                    type="text"
                    name="document_number"
                    value={formData.document_number}
                    onChange={handleChange}
                    className={`input pl-10 w-full ${errors.document_number ? 'border-red-500 focus:ring-red-200' : ''}`}
                    placeholder="V-12345678"
                  />
                  <Hash className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                </div>
                {errors.document_number && <p className="text-xs text-red-500 flex items-center gap-1"><AlertCircle size={12} /> {errors.document_number}</p>}
              </div>

              {/* Nombre Titular */}
              <div className="space-y-1.5 md:col-span-2">
                <label className="text-sm font-medium text-gray-700">Nombre del Titular</label>
                <div className="relative">
                  <input
                    type="text"
                    name="account_holder"
                    value={formData.account_holder}
                    onChange={handleChange}
                    className={`input pl-10 w-full ${errors.account_holder ? 'border-red-500 focus:ring-red-200' : ''}`}
                    placeholder="Nombre Apellido"
                  />
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                </div>
                {errors.account_holder && <p className="text-xs text-red-500 flex items-center gap-1"><AlertCircle size={12} /> {errors.account_holder}</p>}
              </div>

              {/* Alias (Opcional) */}
              <div className="space-y-1.5 md:col-span-2">
                <label className="text-sm font-medium text-gray-700 flex justify-between">
                  <span>Alias de la cuenta</span>
                  <span className="text-gray-400 font-normal text-xs">Opcional</span>
                </label>
                <input
                  type="text"
                  name="alias"
                  value={formData.alias}
                  onChange={handleChange}
                  className="input w-full"
                  placeholder="Ej: Mi cuenta personal, Cuenta de Mamá..."
                />
              </div>

            </div>

            {/* Submit Button */}
            <div className="pt-6">
              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full py-3 flex items-center justify-center gap-2 text-base shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 transition-all"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <>
                    <Save size={20} />
                    Guardar Cambios
                  </>
                )}
              </button>
            </div>
          </div>

        </form>
      </div>
    </div>
  );
}
