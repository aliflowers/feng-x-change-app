'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save, Building, User, Hash, CreditCard, ChevronDown, CheckCircle2, AlertCircle, Loader2, Phone } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { z } from 'zod';
import { createUserBankAccountSchema } from '@fengxchange/shared/validators';

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
        <text x="10" y="14" fill="#fff" fontSize="12" textAnchor="middle">★</text>
      </svg>
    ),
    EUR: (
      <svg viewBox="0 0 60 40" width={size} height={size * 0.67} className="rounded shadow-sm">
        <rect fill="#003399" width="60" height="40" />
        <g fill="#FFCC00">{[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map(i => {
          const angle = (i * 30 - 90) * Math.PI / 180;
          const x = 30 + 12 * Math.cos(angle);
          const y = 20 + 12 * Math.sin(angle);
          return <text key={i} x={x} y={y} fontSize="6" textAnchor="middle" dominantBaseline="middle">★</text>;
        })}</g>
      </svg>
    ),
    PAB: (
      <svg viewBox="0 0 60 40" width={size} height={size * 0.67} className="rounded shadow-sm">
        <rect fill="#fff" width="30" height="20" />
        <rect fill="#005EB8" x="30" width="30" height="20" />
        <text x="15" y="14" fill="#005EB8" fontSize="10" textAnchor="middle">★</text>
        <rect fill="#DA121A" y="20" width="30" height="20" />
        <rect fill="#fff" x="30" y="20" width="30" height="20" />
        <text x="45" y="34" fill="#DA121A" fontSize="10" textAnchor="middle">★</text>
      </svg>
    ),
  };
  return flags[code] || <div className="w-10 h-7 bg-gray-200 rounded flex items-center justify-center text-xs">💱</div>;
};

// Banderas pequeñas para el dropdown de tipo de documento
const CountryFlag = ({ country, size = 20 }: { country: string; size?: number }) => {
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
    PA: (
      <svg viewBox="0 0 60 40" width={size} height={size * 0.67} className="rounded">
        <rect fill="#fff" width="30" height="20" />
        <rect fill="#005EB8" x="30" width="30" height="20" />
        <rect fill="#DA121A" y="20" width="30" height="20" />
        <rect fill="#fff" x="30" y="20" width="30" height="20" />
      </svg>
    ),
    US: (
      <svg viewBox="0 0 60 40" width={size} height={size * 0.67} className="rounded">
        <rect fill="#B22234" width="60" height="40" />
        <g fill="#fff">{[0, 1, 2, 3, 4, 5].map(i => <rect key={i} y={i * 6.15 + 3.08} width="60" height="3.08" />)}</g>
        <rect fill="#3C3B6E" width="24" height="21.54" />
      </svg>
    ),
    EU: (
      <svg viewBox="0 0 60 40" width={size} height={size * 0.67} className="rounded">
        <rect fill="#003399" width="60" height="40" />
        <g fill="#FFCC00">{[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map(i => {
          const angle = (i * 30 - 90) * Math.PI / 180;
          const x = 30 + 10 * Math.cos(angle);
          const y = 20 + 10 * Math.sin(angle);
          return <circle key={i} cx={x} cy={y} r="2" />;
        })}</g>
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
  return <span className="flex-shrink-0">{flags[country] || null}</span>;
};

// Opciones de tipo de documento por país
const documentTypeOptions = [
  {
    country: 'VE', label: 'Venezuela', options: [
      { value: 'CI-V', label: 'Cédula de Identidad (V)' },
      { value: 'CI-E', label: 'Cédula de Identidad (E)' },
      { value: 'RIF-V', label: 'RIF Personal (V)' },
    ]
  },
  {
    country: 'CO', label: 'Colombia', options: [
      { value: 'CC', label: 'Cédula de Ciudadanía (CC)' },
      { value: 'NIT', label: 'NIT Empresarial' },
      { value: 'CE-CO', label: 'Cédula de Extranjería' },
      { value: 'TI', label: 'Tarjeta de Identidad (TI)' },
    ]
  },
  {
    country: 'PE', label: 'Perú', options: [
      { value: 'DNI-PE', label: 'DNI Perú' },
      { value: 'RUC', label: 'RUC Empresarial' },
      { value: 'CE-PE', label: 'Carnet de Extranjería' },
    ]
  },
  {
    country: 'CL', label: 'Chile', options: [
      { value: 'RUT', label: 'RUT/RUN Chile' },
    ]
  },
  {
    country: 'PA', label: 'Panamá', options: [
      { value: 'CIP', label: 'Cédula de Identidad Personal' },
      { value: 'RUC-PA', label: 'RUC Panamá' },
    ]
  },
  {
    country: 'US', label: 'Estados Unidos', options: [
      { value: 'SSN', label: 'Social Security Number (SSN)' },
      { value: 'EIN', label: 'Employer ID Number (EIN)' },
      { value: 'ITIN', label: 'Individual Tax ID (ITIN)' },
    ]
  },
  {
    country: 'EU', label: 'Europa', options: [
      { value: 'DNI-ES', label: 'DNI España' },
      { value: 'NIE', label: 'NIE España' },
      { value: 'NIF', label: 'NIF España' },
    ]
  },
  {
    country: 'WORLD', label: 'Universal', options: [
      { value: 'PASAPORTE', label: 'Pasaporte' },
    ]
  },
];

// Mapeo de código de moneda a código de país
const currencyToCountryMap: Record<string, string> = {
  'VES': 'VE',
  'COP': 'CO',
  'PEN': 'PE',
  'CLP': 'CL',
  'PAB': 'PA',
  'USD': 'US',
  'EUR': 'EU',
};

// Componente personalizado de selección de tipo de documento
const DocumentTypeSelect = ({
  value,
  onChange,
  currencyCode
}: {
  value: string;
  onChange: (value: string) => void;
  currencyCode?: string;
}) => {
  const [isOpen, setIsOpen] = useState(false);

  // Filtrar opciones según la moneda seleccionada
  const filteredOptions = currencyCode
    ? documentTypeOptions.map(group => {
      // Para VES, personalizar las opciones
      if (currencyCode === 'VES') {
        if (group.country === 'VE') {
          return {
            ...group,
            options: group.options.filter(opt => opt.value === 'CI-V' || opt.value === 'CI-E')
          };
        }
        // Excluir WORLD si es VES
        if (group.country === 'WORLD') return null;
      }

      if (group.country === currencyToCountryMap[currencyCode] || group.country === 'WORLD') {
        return group;
      }
      return null;
    }).filter(Boolean) as typeof documentTypeOptions
    : documentTypeOptions;

  // Obtener la opción seleccionada
  const getSelectedOption = () => {
    for (const group of documentTypeOptions) {
      const option = group.options.find(o => o.value === value);
      if (option) return { ...option, country: group.country };
    }
    return null;
  };

  const selected = getSelectedOption();

  return (
    <div className="relative">
      {/* Botón de selección */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="input w-full flex items-center gap-3 text-left cursor-pointer"
      >
        {selected ? (
          <>
            <CountryFlag country={selected.country} size={24} />
            <span className="flex-1 truncate">{selected.label}</span>
          </>
        ) : (
          <>
            <Hash className="text-gray-400" size={18} />
            <span className="flex-1 text-gray-400">Selecciona tipo de documento</span>
          </>
        )}
        <ChevronDown className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} size={18} />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <>
          {/* Overlay para cerrar al hacer clic fuera */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Lista de opciones */}
          <div className="absolute z-50 mt-1 w-full bg-white rounded-xl border border-gray-200 shadow-xl max-h-80 overflow-auto animate-in fade-in slide-in-from-top-2 duration-200">
            {filteredOptions.map(group => (
              <div key={group.country}>
                {/* Header del grupo */}
                <div className="sticky top-0 px-3 py-2 bg-gray-50 border-b border-gray-100 flex items-center gap-2">
                  <CountryFlag country={group.country} size={20} />
                  <span className="font-semibold text-gray-700 text-sm">{group.label}</span>
                </div>

                {/* Opciones del grupo */}
                {group.options.map(option => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      onChange(option.value);
                      setIsOpen(false);
                    }}
                    className={`w-full px-4 py-2.5 text-left flex items-center gap-3 hover:bg-blue-50 transition-colors ${value === option.value ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                      }`}
                  >
                    <span className="flex-1">{option.label}</span>
                    {value === option.value && <CheckCircle2 className="text-blue-600" size={18} />}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

interface Bank {
  id: number;
  name: string;
  country_code: string;
  currency_code: string;
  type: string;
  code: string | null;
}

interface Currency {
  id: number;
  code: string;
  name: string;
}

export default function NewBeneficiaryPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Catalogs
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [banks, setBanks] = useState<Bank[]>([]);

  // Form State
  const [selectedCurrency, setSelectedCurrency] = useState<number>(0);
  const [formData, setFormData] = useState({
    bank_id: '',
    account_number: '',
    account_holder: '',
    document_type: '', // Tipo de documento
    document_number: '', // Número de documento
    email: '',
    alias: '',
  });

  // Load Data
  useEffect(() => {
    async function loadData() {
      try {
        const { data: curData } = await supabase.from('currencies').select('*').order('id');
        if (curData) setCurrencies(curData);

        const { data: bankData } = await supabase.from('banks').select('id, name, country_code, currency_code, type, code').eq('is_active', true);
        if (bankData) setBanks(bankData);
      } catch (error) {
        console.error('Error loading catalogs:', error);
      } finally {
        setFetching(false);
      }
    }
    loadData();
  }, []);

  const currentCurrencyCode = currencies.find(c => c.id === selectedCurrency)?.code;
  const availableBanks = banks.filter(b => b.currency_code === currentCurrencyCode);

  // Banco seleccionado actual
  const selectedBank = banks.find(b => b.id.toString() === formData.bank_id);
  const isPagoMovil = selectedBank?.name === 'Pago Móvil';
  const isDigitalWallet = ['Nequi', 'DaviPlata', 'Yape', 'Plin', 'Zinli', 'Binance Pay', 'PayPal', 'Zelle', 'Venmo', 'CashApp'].includes(selectedBank?.name || '');

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    // Base Validation using Shared Schema
    const result = createUserBankAccountSchema.safeParse({
      bank_platform_id: parseInt(formData.bank_id) || 1, // Temporary - schema still expects bank_platform_id
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

    // Specific Logic
    if (currentCurrencyCode === 'VES') {
      const vesCheck = vesAccountSchema.safeParse(formData.account_number);
      if (!vesCheck.success) newErrors.account_number = vesCheck.error.errors[0].message;

      // Validate bank code match
      const selectedBank = banks.find(b => b.id.toString() === formData.bank_id);
      if (selectedBank) {
        // Logic to check if account starts with bank code could be added here if we had bank codes
      }
    }

    if (currentCurrencyCode === 'USD') {
      // Usually email for wallets
      if (!formData.account_number.includes('@') && formData.account_number.length < 5) {
        // Assume it might be an ID if not email, but usually wallets are emails
        // newErrors.account_number = 'Debe ser un correo o ID válido';
      }
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

      // Prepare payload
      const payload = {
        user_id: user.id,
        bank_id: parseInt(formData.bank_id),
        account_number: formData.account_number,
        account_holder: formData.account_holder,
        document_type: formData.document_type || null,
        document_number: formData.document_number,
        // Auto-set account_type: WALLET para móviles/digitales, SAVINGS para bancos normales
        account_type: isPagoMovil || isDigitalWallet ? 'WALLET' : 'SAVINGS',
        email: formData.email || null,
        alias: formData.alias || null,
        is_active: true
      };

      const { error } = await supabase.from('user_bank_accounts').insert(payload);
      if (error) throw error;

      router.push('/app/beneficiarios');
      router.refresh();
    } catch (error: unknown) {
      const err = error as { message?: string; code?: string; details?: string };
      console.error('Error creating beneficiary:', err.message || err.code || JSON.stringify(error));
      alert(`Error al guardar el beneficiario: ${err.message || 'Intenta de nuevo.'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    let { name, value } = e.target;

    // Para VES, solo permitir dígitos numéricos en account_number (máximo 20)
    if (name === 'account_number' && currentCurrencyCode === 'VES') {
      value = value.replace(/\D/g, '').slice(0, 20);
    }

    // Para COP - Bancolombia: solo numérico, máximo 11 dígitos
    if (name === 'account_number' && selectedBank?.name === 'Bancolombia') {
      value = value.replace(/\D/g, '').slice(0, 11);
    }

    // Para COP - Nequi: solo numérico, máximo 10 dígitos (teléfono colombiano)
    if (name === 'account_number' && selectedBank?.name === 'Nequi') {
      value = value.replace(/\D/g, '').slice(0, 10);
    }

    // Para document_number, solo permitir dígitos numéricos
    if (name === 'document_number') {
      value = value.replace(/\D/g, '');
    }

    // Si cambia el banco, actualizar prefijo de cuenta para bancos VES
    if (name === 'bank_id' && value) {
      const bank = banks.find(b => b.id.toString() === value);
      if (bank?.code && currentCurrencyCode === 'VES') {
        // Agregar prefijo automático solo si el campo está vacío o tiene un prefijo anterior
        setFormData(prev => {
          const currentAccount = prev.account_number;
          // Si está vacío o empieza con 4 dígitos que son un código de banco conocido
          const startsWithBankCode = banks.some(b => b.code && currentAccount.startsWith(b.code));
          if (currentAccount === '' || startsWithBankCode) {
            return { ...prev, [name]: value, account_number: bank.code + currentAccount.slice(4) };
          }
          return { ...prev, [name]: value };
        });
      } else {
        setFormData(prev => ({ ...prev, [name]: value }));
      }
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }

    // Clear error when user types
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  if (fetching) {
    return (
      <div className="max-w-3xl mx-auto flex flex-col items-center justify-center min-h-[50vh] space-y-4">
        <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
        <p className="text-gray-500 animate-pulse">Cargando bancos disponibles...</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/app/beneficiarios" className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-600">
          <ArrowLeft size={24} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Agregar Beneficiario</h1>
          <p className="text-gray-500 text-sm">Registra una nueva cuenta para tus operaciones.</p>
        </div>
      </div>

      <div className="card shadow-lg border-0 ring-1 ring-gray-100">
        <form onSubmit={handleSubmit} className="space-y-8">

          {/* 1. Selección de Moneda */}
          <div className="space-y-3">
            <label className="text-sm font-semibold text-gray-700 uppercase tracking-wider">1. Selecciona la Moneda</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {currencies.map(currency => {
                const isSelected = selectedCurrency === currency.id;
                return (
                  <button
                    key={currency.id}
                    type="button"
                    onClick={() => { setSelectedCurrency(currency.id); setFormData(prev => ({ ...prev, bank_id: '' })); setErrors({}); }}
                    className={`relative group flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all duration-300 bg-white ${isSelected
                      ? 'border-blue-500 ring-2 ring-blue-500 ring-offset-2 shadow-lg'
                      : 'border-gray-200 hover:border-blue-300 hover:shadow-md'
                      }`}
                  >
                    <FlagIcon code={currency.code} size={48} />
                    <span className={`text-sm font-bold mt-2 ${isSelected ? 'text-blue-700' : 'text-gray-700'}`}>{currency.code}</span>
                    <span className="text-[10px] font-medium text-gray-500 text-center leading-tight">{currency.name}</span>
                    {isSelected && (
                      <div className="absolute top-2 right-2 text-blue-600">
                        <CheckCircle2 size={16} />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Formulario Dinámico */}
          {selectedCurrency !== 0 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-500">
              <div className="h-px bg-gray-100 my-6"></div>
              <label className="text-sm font-semibold text-gray-700 uppercase tracking-wider">2. Datos de la Cuenta</label>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                {/* Banco */}
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-sm font-medium text-gray-700">
                    Banco / Plataforma
                    {availableBanks.length > 0 && (
                      <span className="ml-2 text-xs text-gray-400">({availableBanks.length} disponibles)</span>
                    )}
                  </label>
                  {availableBanks.length === 0 ? (
                    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-xl text-center">
                      <p className="text-sm text-yellow-700">
                        No hay bancos registrados para esta moneda aún.
                      </p>
                      <p className="text-xs text-yellow-600 mt-1">
                        Pronto estarán disponibles más opciones.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="relative">
                        <select
                          name="bank_id"
                          value={formData.bank_id}
                          onChange={handleChange}
                          className={`input appearance-none w-full pl-10 ${errors.bank_id ? 'border-red-500 focus:ring-red-200' : ''}`}
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

                    </div>
                  )}
                  {errors.bank_id && <p className="text-xs text-red-500 flex items-center gap-1"><AlertCircle size={12} /> {errors.bank_id}</p>}
                </div>

                {/* Campos dinámicos según tipo de plataforma */}
                {isPagoMovil ? (
                  /* PAGO MÓVIL - Campos específicos */
                  <>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-gray-700">Banco (4 dígitos)</label>
                      <div className="relative">
                        <select
                          name="account_number"
                          value={formData.account_number.slice(0, 4)}
                          onChange={(e) => setFormData(prev => ({ ...prev, account_number: e.target.value }))}
                          className="input appearance-none w-full pl-10"
                          required
                        >
                          <option value="">Selecciona banco</option>
                          {banks.filter(b => b.currency_code === currentCurrencyCode && b.code).map(bank => (
                            <option key={bank.id} value={bank.code!}>{bank.code} - {bank.name}</option>
                          ))}
                        </select>
                        <Building className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={18} />
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={18} />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-gray-700">Número de Teléfono</label>
                      <div className="relative">
                        <input
                          type="tel"
                          name="phone_for_pago_movil"
                          value={formData.account_number.slice(4) || ''}
                          onChange={(e) => {
                            const bankCode = formData.account_number.slice(0, 4);
                            setFormData(prev => ({ ...prev, account_number: bankCode + e.target.value.replace(/\D/g, '') }));
                          }}
                          className="input pl-10 w-full font-mono"
                          placeholder="04141234567"
                          maxLength={11}
                        />
                        <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                      </div>
                      <p className="text-xs text-gray-400">Número de 11 dígitos (04XX...)</p>
                    </div>
                  </>
                ) : isDigitalWallet ? (
                  /* BILLETERAS DIGITALES - Email o teléfono */
                  <div className="space-y-1.5 md:col-span-2">
                    <label className="text-sm font-medium text-gray-700">
                      {['Nequi', 'DaviPlata', 'Yape', 'Plin'].includes(selectedBank?.name || '')
                        ? 'Número de Teléfono'
                        : 'Correo Electrónico o ID'}
                    </label>
                    <div className="relative">
                      <input
                        type={['Nequi', 'DaviPlata', 'Yape', 'Plin'].includes(selectedBank?.name || '') ? 'tel' : 'text'}
                        inputMode={['Nequi', 'DaviPlata', 'Yape', 'Plin'].includes(selectedBank?.name || '') ? 'numeric' : undefined}
                        maxLength={selectedBank?.name === 'Nequi' ? 10 : undefined}
                        name="account_number"
                        value={formData.account_number}
                        onChange={handleChange}
                        className={`input pl-10 w-full ${errors.account_number ? 'border-red-500 focus:ring-red-200' : ''}`}
                        placeholder={selectedBank?.name === 'Nequi' ? '3001234567' :
                          ['DaviPlata'].includes(selectedBank?.name || '') ? '3001234567' :
                            ['Yape', 'Plin'].includes(selectedBank?.name || '') ? '912345678' : 'correo@ejemplo.com'}
                      />
                      {['Nequi', 'DaviPlata', 'Yape', 'Plin'].includes(selectedBank?.name || '')
                        ? <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        : <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />}
                    </div>
                    {errors.account_number && <p className="text-xs text-red-500 flex items-center gap-1"><AlertCircle size={12} /> {errors.account_number}</p>}
                    {selectedBank?.name === 'Nequi' && <p className="text-xs text-gray-400">Número de celular de 10 dígitos</p>}
                  </div>
                ) : (
                  /* BANCO NORMAL - Número de cuenta */
                  <div className="space-y-1.5 md:col-span-2">
                    <label className="text-sm font-medium text-gray-700">
                      {currentCurrencyCode === 'USD' ? 'Correo Electrónico / ID' : 'Número de Cuenta'}
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        inputMode={currentCurrencyCode === 'VES' || selectedBank?.name === 'Bancolombia' ? 'numeric' : undefined}
                        maxLength={currentCurrencyCode === 'VES' ? 20 : selectedBank?.name === 'Bancolombia' ? 11 : undefined}
                        name="account_number"
                        value={formData.account_number}
                        onChange={handleChange}
                        className={`input pl-10 w-full font-mono ${errors.account_number ? 'border-red-500 focus:ring-red-200' : ''}`}
                        placeholder={currentCurrencyCode === 'VES' ? '01020000000000000000' :
                          selectedBank?.name === 'Bancolombia' ? '12345678901' : ''}
                      />
                      <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    </div>
                    {errors.account_number && <p className="text-xs text-red-500 flex items-center gap-1"><AlertCircle size={12} /> {errors.account_number}</p>}
                    {currentCurrencyCode === 'VES' && !isPagoMovil && <p className="text-xs text-gray-400">Debe tener 20 dígitos numéricos. Los primeros 4 son el código del banco.</p>}
                    {selectedBank?.name === 'Bancolombia' && <p className="text-xs text-gray-400">Número de cuenta de 11 dígitos numéricos</p>}
                  </div>
                )}

                {/* Campo Tipo de Cuenta eliminado - se asigna automáticamente */}

                {/* Tipo de Documento - Componente personalizado con banderas */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700">Tipo de Documento</label>
                  <DocumentTypeSelect
                    value={formData.document_type}
                    onChange={(value) => setFormData(prev => ({ ...prev, document_type: value }))}
                    currencyCode={currentCurrencyCode}
                  />
                </div>

                {/* Número de Documento */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700">Número de Documento</label>
                  <div className="relative">
                    <input
                      type="text"
                      name="document_number"
                      value={formData.document_number}
                      onChange={handleChange}
                      className={`input pl-10 w-full ${errors.document_number ? 'border-red-500 focus:ring-red-200' : ''}`}
                      placeholder={formData.document_type ? `Ej: 12345678` : 'Selecciona tipo primero'}
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
                      Guardar Beneficiario
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

        </form>
      </div>
    </div>
  );
}
