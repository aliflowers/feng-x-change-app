'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Calculator,
  Wallet,
  Upload,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ChevronRight,
  ChevronLeft,
  Building,
  RefreshCw,
  Info,
  Plus,
  X,
  Users
} from 'lucide-react';
import { supabase } from '@/lib/supabase/client';

interface Currency {
  id: number;
  code: string;
  name: string;
  symbol: string;
}

interface ExchangeRate {
  id: number;
  from_currency_id: number;
  to_currency_id: number;
  rate: number;
}

interface UserBankAccount {
  id: string;
  bank_id?: number;
  bank_platform_id?: number;
  account_number: string;
  account_holder: string;
  bank?: {
    name: string;
    currency_code: string;
  };
  bank_platform?: {
    name: string;
    currency_id: number;
  };
}

interface Bank {
  id: number;
  name: string;
  country_code: string;
  currency_code: string;
  type: string;
  code: string | null;
}

interface SelectedBeneficiary {
  accountId: string;
  amountToSend: number; // Monto en moneda origen (USD/EUR)
}

// Mapeo de código de moneda a código de país para tipos de documento
const currencyToCountryMap: Record<string, string> = {
  'VES': 'VE', 'COP': 'CO', 'PEN': 'PE', 'CLP': 'CL', 'PAB': 'PA', 'USD': 'US', 'EUR': 'EU',
};

// Tipos de documento por país
const documentTypesByCountry: Record<string, { value: string; label: string }[]> = {
  'VE': [{ value: 'CI-V', label: 'Cédula (V)' }, { value: 'CI-E', label: 'Cédula (E)' }, { value: 'RIF-V', label: 'RIF (V)' }, { value: 'RIF-J', label: 'RIF (J)' }],
  'CO': [{ value: 'CC', label: 'Cédula (CC)' }, { value: 'NIT', label: 'NIT' }, { value: 'CE-CO', label: 'Cédula Extranjería' }],
  'PE': [{ value: 'DNI-PE', label: 'DNI Perú' }, { value: 'RUC', label: 'RUC' }, { value: 'CE-PE', label: 'Carnet Extranjería' }],
  'CL': [{ value: 'RUT', label: 'RUT/RUN Chile' }],
  'PA': [{ value: 'CIP', label: 'Cédula Personal' }, { value: 'RUC-PA', label: 'RUC Panamá' }],
  'US': [{ value: 'SSN', label: 'SSN' }, { value: 'EIN', label: 'EIN' }, { value: 'ITIN', label: 'ITIN' }],
  'EU': [{ value: 'DNI-ES', label: 'DNI España' }, { value: 'NIE', label: 'NIE' }, { value: 'NIF', label: 'NIF' }],
};

// Billeteras digitales que usan email/teléfono
const digitalWallets = ['Nequi', 'DaviPlata', 'Yape', 'Plin', 'Zinli', 'Binance Pay', 'PayPal', 'Zelle', 'Venmo', 'CashApp'];
const phoneWallets = ['Nequi', 'DaviPlata', 'Yape', 'Plin'];

// Lista completa de bancos venezolanos para Pago Móvil (códigos oficiales)
const venezuelanBanks = [
  { code: '0102', name: 'Banco de Venezuela' },
  { code: '0104', name: 'Venezolano de Crédito' },
  { code: '0105', name: 'Banco Mercantil' },
  { code: '0108', name: 'Banco Provincial' },
  { code: '0114', name: 'Bancaribe' },
  { code: '0115', name: 'Banco Exterior' },
  { code: '0116', name: 'BOD (Banco Occidental de Descuento)' },
  { code: '0128', name: 'Banco Caroní' },
  { code: '0134', name: 'Banesco' },
  { code: '0137', name: 'Sofitasa' },
  { code: '0138', name: 'Banco Plaza' },
  { code: '0146', name: 'Bangente' },
  { code: '0151', name: 'BFC Banco Fondo Común' },
  { code: '0156', name: '100% Banco' },
  { code: '0157', name: 'Delsur Banco Universal' },
  { code: '0163', name: 'Banco del Tesoro' },
  { code: '0166', name: 'Banco Agrícola de Venezuela' },
  { code: '0168', name: 'Bancrecer' },
  { code: '0169', name: 'Mi Banco' },
  { code: '0171', name: 'Banco Activo' },
  { code: '0172', name: 'Bancamiga' },
  { code: '0173', name: 'Banco Internacional de Desarrollo' },
  { code: '0174', name: 'Banplus' },
  { code: '0175', name: 'Banco Bicentenario' },
  { code: '0177', name: 'Banfanb' },
  { code: '0178', name: 'N58 Banco Digital' },
  { code: '0191', name: 'Banco Nacional de Crédito (BNC)' },
];

const steps = [
  { id: 1, name: 'Calculadora', icon: Calculator },
  { id: 2, name: 'Beneficiarios', icon: Users },
  { id: 3, name: 'Confirmar', icon: CheckCircle2 },
];

export default function OperacionesPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Data
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [exchangeRates, setExchangeRates] = useState<ExchangeRate[]>([]);
  const [userAccounts, setUserAccounts] = useState<UserBankAccount[]>([]);

  // Pre-selected beneficiary from URL
  const [preselectedBeneficiaryId, setPreselectedBeneficiaryId] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      setPreselectedBeneficiaryId(params.get('beneficiaryId'));
    }
  }, []);

  // Form state
  const [fromCurrencyId, setFromCurrencyId] = useState<number>(1); // USD por defecto
  const [toCurrencyId, setToCurrencyId] = useState<number>(2); // VES por defecto
  const [amountSent, setAmountSent] = useState<string>('');

  // Set toCurrency based on preselected beneficiary
  useEffect(() => {
    if (preselectedBeneficiaryId && userAccounts.length > 0 && currencies.length > 0) {
      const account = userAccounts.find(acc => acc.id === preselectedBeneficiaryId);
      if (account) {
        const currencyCode = account.bank?.currency_code;
        const currencyId = account.bank_platform?.currency_id;
        if (currencyCode) {
          const c = currencies.find(c => c.code === currencyCode);
          if (c && c.id !== toCurrencyId) setToCurrencyId(c.id);
        } else if (currencyId && currencyId !== toCurrencyId) {
          setToCurrencyId(currencyId);
        }
      }
    }
  }, [preselectedBeneficiaryId, userAccounts, currencies, toCurrencyId]);

  // Multiple beneficiaries
  const [selectedBeneficiaries, setSelectedBeneficiaries] = useState<SelectedBeneficiary[]>([]);

  // Multiple proof files
  const [proofFiles, setProofFiles] = useState<File[]>([]);
  const [proofPreviews, setProofPreviews] = useState<string[]>([]);

  // Add beneficiary modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [addingBeneficiary, setAddingBeneficiary] = useState(false);
  const [newBeneficiaryForm, setNewBeneficiaryForm] = useState({
    bank_id: '',
    account_number: '',
    account_holder: '',
    document_type: '',
    document_number: '',
  });

  // Load data
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      const { data: currenciesData } = await supabase
        .from('currencies')
        .select('*')
        .eq('is_active', true)
        .order('id');

      const { data: ratesData } = await supabase
        .from('exchange_rates')
        .select('*');

      const { data: accountsData } = await supabase
        .from('user_bank_accounts')
        .select(`
          id,
          bank_id,
          bank_platform_id,
          account_number,
          account_holder,
          bank:banks (
            name,
            currency_code
          ),
          bank_platform:banks_platforms (
            name,
            currency_id
          )
        `)
        .eq('user_id', user.id)
        .eq('is_active', true);

      // Load banks for add modal
      const { data: banksData } = await supabase
        .from('banks')
        .select('id, name, country_code, currency_code, type, code')
        .eq('is_active', true);

      if (currenciesData) setCurrencies(currenciesData);
      if (ratesData) setExchangeRates(ratesData);
      if (accountsData) setUserAccounts(accountsData as unknown as UserBankAccount[]);
      if (banksData) setBanks(banksData);
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Error al cargar los datos');
    } finally {
      setLoading(false);
    }
  };

  // Filtrar monedas de origen disponibles (solo las que tienen tasas activas configuradas como origen)
  const availableFromCurrencies = currencies.filter(c =>
    exchangeRates.some(r => r.from_currency_id === c.id)
  );

  // Filtrar monedas de destino disponibles (basado en el origen seleccionado)
  const availableToCurrencies = currencies.filter(c =>
    exchangeRates.some(r => r.from_currency_id === fromCurrencyId && r.to_currency_id === c.id)
  );

  // Efecto para ajustar monedas si la selección actual no es válida
  useEffect(() => {
    // Si la moneda origen actual no está disponible, seleccionar la primera disponible
    if (availableFromCurrencies.length > 0 && !availableFromCurrencies.find(c => c.id === fromCurrencyId)) {
      setFromCurrencyId(availableFromCurrencies[0].id);
    }
  }, [availableFromCurrencies, fromCurrencyId]);

  useEffect(() => {
    // Si la moneda destino actual no está disponible para este origen, seleccionar la primera disponible
    if (availableToCurrencies.length > 0 && !availableToCurrencies.find(c => c.id === toCurrencyId)) {
      setToCurrencyId(availableToCurrencies[0].id);
    }
  }, [fromCurrencyId, availableToCurrencies, toCurrencyId]);

  // Get current rate
  const getCurrentRate = useCallback(() => {
    const rate = exchangeRates.find(
      r => r.from_currency_id === fromCurrencyId && r.to_currency_id === toCurrencyId
    );
    return rate?.rate || 0;
  }, [exchangeRates, fromCurrencyId, toCurrencyId]);

  // Total amount being sent to beneficiaries
  const totalAmountToBeneficiaries = selectedBeneficiaries.reduce(
    (sum, b) => sum + b.amountToSend, 0
  );

  // Remaining amount to distribute
  const remainingAmount = parseFloat(amountSent || '0') - totalAmountToBeneficiaries;

  // Get currency by ID
  const getCurrency = (id: number) => currencies.find(c => c.id === id);


  // Get account by ID
  const getAccount = (id: string) => userAccounts.find(acc => acc.id === id);

  // Toggle beneficiary selection - with auto-distribution
  const toggleBeneficiary = (accountId: string) => {
    const totalAmount = parseFloat(amountSent || '0');
    const existing = selectedBeneficiaries.find(b => b.accountId === accountId);

    if (existing) {
      // Remove and redistribute among remaining
      const remaining = selectedBeneficiaries.filter(b => b.accountId !== accountId);
      if (remaining.length > 0) {
        const perBeneficiary = totalAmount / remaining.length;
        setSelectedBeneficiaries(remaining.map(b => ({ ...b, amountToSend: perBeneficiary })));
      } else {
        setSelectedBeneficiaries([]);
      }
    } else {
      // Add and redistribute equally among all
      const newList = [...selectedBeneficiaries, { accountId, amountToSend: 0 }];
      const perBeneficiary = totalAmount / newList.length;
      setSelectedBeneficiaries(newList.map(b => ({ ...b, amountToSend: perBeneficiary })));
    }
  };

  // Update beneficiary amount (with validation to not exceed total)
  const updateBeneficiaryAmount = (accountId: string, newAmount: number) => {
    const totalAmount = parseFloat(amountSent || '0');
    const otherBeneficiariesTotal = selectedBeneficiaries
      .filter(b => b.accountId !== accountId)
      .reduce((sum, b) => sum + b.amountToSend, 0);

    // Limit amount to not exceed total - what others have
    const maxAllowed = Math.max(0, totalAmount - otherBeneficiariesTotal);
    const clampedAmount = Math.min(Math.max(0, newAmount), maxAllowed);

    setSelectedBeneficiaries(prev =>
      prev.map(b => b.accountId === accountId ? { ...b, amountToSend: clampedAmount } : b)
    );
  };

  // Handle proof files change (multiple files)
  const handleProofChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      setProofFiles(prev => [...prev, ...files]);
      // Generate previews
      files.forEach(file => {
        const reader = new FileReader();
        reader.onloadend = () => {
          setProofPreviews(prev => [...prev, reader.result as string]);
        };
        reader.readAsDataURL(file);
      });
    }
  };

  // Remove a proof file
  const removeProofFile = (index: number) => {
    setProofFiles(prev => prev.filter((_, i) => i !== index));
    setProofPreviews(prev => prev.filter((_, i) => i !== index));
  };

  // Current currency code and country
  const toCurrencyCode = getCurrency(toCurrencyId)?.code || '';
  const toCountryCode = currencyToCountryMap[toCurrencyCode] || 'VE';
  const rawDocumentTypes = documentTypesByCountry[toCountryCode] || [];

  // Excluir RIF y Pasaporte para VES
  const documentTypesForCurrency = toCurrencyCode === 'VES'
    ? rawDocumentTypes.filter(doc => !doc.value.startsWith('RIF') && !doc.label.toLowerCase().includes('pasaporte'))
    : rawDocumentTypes;

  // Banks available for the selected destination currency
  const availableBanks = banks.filter(b => b.currency_code === toCurrencyCode);

  // Filter accounts by destination currency (support both bank and bank_platform)
  const filteredAccounts = userAccounts.filter(acc => {
    // New records use bank.currency_code
    if (acc.bank?.currency_code) {
      return acc.bank.currency_code === toCurrencyCode;
    }
    // Old records use bank_platform.currency_id
    return acc.bank_platform?.currency_id === toCurrencyId;
  });

  // Selected bank detection for dynamic form
  const selectedBankForModal = banks.find(b => b.id.toString() === newBeneficiaryForm.bank_id);
  const isPagoMovil = selectedBankForModal?.name === 'Pago Móvil';
  const isDigitalWallet = digitalWallets.includes(selectedBankForModal?.name || '');
  const isPhoneWallet = phoneWallets.includes(selectedBankForModal?.name || '');

  const openAddModal = () => {
    setNewBeneficiaryForm({
      bank_id: '',
      account_number: '',
      account_holder: '',
      document_type: '',
      document_number: '',
    });
    setShowAddModal(true);
  };

  // Handle add beneficiary from modal
  const handleAddBeneficiary = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBeneficiaryForm.bank_id || !newBeneficiaryForm.account_number || !newBeneficiaryForm.account_holder) {
      setError('Completa todos los campos obligatorios');
      return;
    }

    setAddingBeneficiary(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No autenticado');

      const payload = {
        user_id: user.id,
        bank_id: parseInt(newBeneficiaryForm.bank_id),
        account_number: newBeneficiaryForm.account_number,
        account_holder: newBeneficiaryForm.account_holder,
        document_type: newBeneficiaryForm.document_type || null,
        document_number: newBeneficiaryForm.document_number || null,
        account_type: isPagoMovil || isDigitalWallet ? 'WALLET' : 'SAVINGS', // Valor por defecto
        is_active: true
      };

      const { error: insertError } = await supabase.from('user_bank_accounts').insert(payload);
      if (insertError) throw insertError;

      // Reload accounts
      const { data: accountsData } = await supabase
        .from('user_bank_accounts')
        .select(`
          id,
          bank_id,
          bank_platform_id,
          account_number,
          account_holder,
          bank:banks (
            name,
            currency_code
          ),
          bank_platform:banks_platforms (
            name,
            currency_id
          )
        `)
        .eq('user_id', user.id)
        .eq('is_active', true);

      if (accountsData) setUserAccounts(accountsData as unknown as UserBankAccount[]);

      setShowAddModal(false);
    } catch (err) {
      console.error('Error adding beneficiary:', err);
      const errorMessage = err instanceof Error ? err.message : 'Error al agregar beneficiario';
      setError(errorMessage);
    } finally {
      setAddingBeneficiary(false);
    }
  };

  // Submit transaction(s)
  const handleSubmit = async () => {
    if (selectedBeneficiaries.length === 0 || proofFiles.length === 0) {
      setError('Por favor selecciona al menos un beneficiario y sube el comprobante de pago');
      return;
    }

    // Validate amounts match total
    const totalSent = parseFloat(amountSent);
    if (Math.abs(totalAmountToBeneficiaries - totalSent) > 0.01) {
      setError(`El total distribuido (${totalAmountToBeneficiaries.toFixed(2)}) no coincide con el monto a enviar (${totalSent.toFixed(2)})`);
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No autenticado');

      // Upload all proof files
      const proofUrls: string[] = [];
      for (const file of proofFiles) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('client-proofs')
          .upload(fileName, file);

        if (!uploadError) {
          const { data: { publicUrl } } = supabase.storage
            .from('client-proofs')
            .getPublicUrl(fileName);
          proofUrls.push(publicUrl);
        }
      }

      const proofUrl = proofUrls.length > 0 ? proofUrls.join(',') : null;

      // Create transactions for each beneficiary
      const rate = getCurrentRate();
      const transactions = selectedBeneficiaries.map(b => ({
        user_id: user.id,
        from_currency_id: fromCurrencyId,
        to_currency_id: toCurrencyId,
        amount_sent: b.amountToSend,
        exchange_rate_applied: rate,
        amount_received: b.amountToSend * rate,
        user_bank_account_id: b.accountId,
        client_proof_url: proofUrl,
        status: 'POOL'
      }));

      const { error: txError } = await supabase
        .from('transactions')
        .insert(transactions);

      if (txError) throw txError;

      setSuccess(true);
      setTimeout(() => {
        router.push('/app/historial');
      }, 3000);

    } catch (err) {
      console.error('Error creating transaction:', err);
      const errorMessage = err instanceof Error ? err.message : 'Error al crear la operación';
      setError(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  // Step navigation
  const nextStep = () => {
    if (currentStep === 1 && (!amountSent || parseFloat(amountSent) <= 0)) {
      setError('Ingresa un monto válido');
      return;
    }

    // Auto-skip logic for preselected beneficiary
    if (currentStep === 1 && preselectedBeneficiaryId) {
      const account = userAccounts.find(acc => acc.id === preselectedBeneficiaryId);
      if (account) {
        setSelectedBeneficiaries([{ accountId: preselectedBeneficiaryId, amountToSend: parseFloat(amountSent) }]);
        setCurrentStep(3);
        setError(null);
        return;
      }
    }

    if (currentStep === 2) {
      if (selectedBeneficiaries.length === 0) {
        setError('Selecciona al menos un beneficiario');
        return;
      }
      const totalSent = parseFloat(amountSent);
      if (Math.abs(totalAmountToBeneficiaries - totalSent) > 0.01) {
        setError(`El total distribuido debe ser igual al monto a enviar (${totalSent.toFixed(2)} ${getCurrency(fromCurrencyId)?.code})`);
        return;
      }
    }
    setError(null);
    setCurrentStep(prev => Math.min(prev + 1, 3));
  };

  const prevStep = () => {
    setError(null);
    if (currentStep === 3 && preselectedBeneficiaryId) {
      setCurrentStep(1);
    } else {
      setCurrentStep(prev => Math.max(prev - 1, 1));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (success) {
    return (
      <div className="max-w-lg mx-auto py-12 text-center animate-in fade-in duration-500">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 className="w-10 h-10 text-green-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-3">
          ¡{selectedBeneficiaries.length > 1 ? 'Operaciones Creadas' : 'Operación Creada'}!
        </h1>
        <p className="text-gray-600 mb-6">
          {selectedBeneficiaries.length > 1
            ? `Se han creado ${selectedBeneficiaries.length} operaciones y serán procesadas pronto.`
            : 'Tu operación ha sido enviada al pool y será procesada pronto.'}
        </p>
        <p className="text-sm text-gray-500">Redirigiendo al historial...</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Nueva Operación</h1>
        <p className="text-gray-500">Envía dinero de forma rápida y segura.</p>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-between bg-white rounded-2xl p-4 border border-gray-200">
        {steps.map((step, index) => {
          const Icon = step.icon;
          const isActive = currentStep === step.id;
          const isCompleted = currentStep > step.id;
          return (
            <div key={step.id} className="flex items-center flex-1">
              <div className={`flex items-center gap-2 ${isActive ? 'text-blue-600' : isCompleted ? 'text-green-600' : 'text-gray-400'}`}>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isActive ? 'bg-blue-100' : isCompleted ? 'bg-green-100' : 'bg-gray-100'
                  }`}>
                  {isCompleted ? <CheckCircle2 size={20} /> : <Icon size={20} />}
                </div>
                <span className="font-medium text-sm hidden sm:block">{step.name}</span>
              </div>
              {index < steps.length - 1 && (
                <div className={`flex-1 h-0.5 mx-4 ${isCompleted ? 'bg-green-300' : 'bg-gray-200'}`} />
              )}
            </div>
          );
        })}
      </div>


      {/* Step Content */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        {/* Step 1: Calculator */}
        {currentStep === 1 && (
          <div className="p-6 space-y-6">
            <div className="text-center mb-6">
              <h2 className="text-lg font-bold text-gray-900">Calculadora de Cambio</h2>
              <p className="text-sm text-gray-500">Ingresa el monto total que deseas enviar</p>
            </div>

            {/* From Currency */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">Moneda Origen</label>
              <select
                value={fromCurrencyId}
                onChange={(e) => setFromCurrencyId(parseInt(e.target.value))}
                className="input"
              >
                {availableFromCurrencies.map(currency => (
                  <option key={currency.id} value={currency.id}>
                    {currency.symbol} {currency.code} - {currency.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Amount Sent */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">Monto Total a Enviar</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold">
                  {getCurrency(fromCurrencyId)?.symbol}
                </span>
                <input
                  type="number"
                  value={amountSent}
                  onChange={(e) => {
                    setAmountSent(e.target.value);
                    // Reset beneficiaries when amount changes
                    setSelectedBeneficiaries([]);
                  }}
                  className="input pl-10 text-2xl font-bold text-center"
                  placeholder="0.00"
                  min="1"
                  step="0.01"
                />
              </div>
            </div>

            {/* Exchange Rate Display */}
            <div className="flex items-center justify-center gap-2 py-4">
              <RefreshCw size={16} className="text-gray-400" />
              <span className="text-sm text-gray-500">
                Tasa: 1 {getCurrency(fromCurrencyId)?.code} = {getCurrentRate().toLocaleString('es-VE')} {getCurrency(toCurrencyId)?.code}
              </span>
            </div>

            {/* To Currency */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">Moneda Destino</label>
              <select
                value={toCurrencyId}
                onChange={(e) => {
                  setToCurrencyId(parseInt(e.target.value));
                  setSelectedBeneficiaries([]);
                }}
                className={`input ${preselectedBeneficiaryId ? 'bg-gray-100 cursor-not-allowed opacity-70' : ''}`}
                disabled={!!preselectedBeneficiaryId}
              >
                {availableToCurrencies.map(currency => (
                  <option key={currency.id} value={currency.id}>
                    {currency.symbol} {currency.code} - {currency.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Amount Received Preview */}
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-6 text-center border border-green-200">
              <p className="text-sm text-gray-600 mb-2">Monto Total a Recibir (aprox.)</p>
              <p className="text-3xl font-bold text-green-600">
                {getCurrency(toCurrencyId)?.symbol} {(parseFloat(amountSent || '0') * getCurrentRate()).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-gray-500 mt-2">{getCurrency(toCurrencyId)?.name}</p>
            </div>
          </div>
        )}

        {/* Step 2: Multiple Beneficiaries */}
        {currentStep === 2 && (
          <div className="p-6 space-y-6">
            <div className="text-center mb-6">
              <h2 className="text-lg font-bold text-gray-900">Selecciona los Beneficiarios</h2>
              <p className="text-sm text-gray-500">
                Puedes enviar a <span className="font-semibold text-blue-600">uno o varios</span> beneficiarios. Indica cuánto enviar a cada uno.
              </p>
            </div>

            {/* Info message */}
            <div className="p-3 bg-blue-50 rounded-xl border border-blue-200 flex items-center gap-2">
              <Info className="text-blue-600 flex-shrink-0" size={18} />
              <p className="text-sm text-blue-700">
                Selecciona los beneficiarios. El monto se distribuirá automáticamente entre ellos. Podrás ajustar la distribución en el siguiente paso.
              </p>
            </div>

            {filteredAccounts.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Wallet className="text-gray-400" size={32} />
                </div>
                <h3 className="text-lg font-semibold text-gray-700 mb-2">
                  No tienes cuentas en {getCurrency(toCurrencyId)?.code}
                </h3>
                <p className="text-gray-500 mb-6">
                  Primero debes registrar una cuenta beneficiaria
                </p>
                <Link
                  href="/app/beneficiarios/nuevo"
                  className="btn-primary inline-flex items-center gap-2"
                >
                  <Plus size={20} />
                  Agregar Cuenta
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredAccounts.map(account => {
                  const isSelected = selectedBeneficiaries.some(b => b.accountId === account.id);
                  return (
                    <div
                      key={account.id}
                      className={`p-4 rounded-xl border-2 transition-all ${isSelected
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                        }`}
                    >
                      <div className="flex items-center gap-4">
                        <button
                          onClick={() => toggleBeneficiary(account.id)}
                          className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${isSelected ? 'bg-blue-100' : 'bg-gray-100'
                            }`}
                        >
                          {isSelected ? (
                            <CheckCircle2 className="text-blue-600" size={24} />
                          ) : (
                            <Building className="text-gray-500" size={24} />
                          )}
                        </button>
                        <div className="flex-1 min-w-0" onClick={() => !isSelected && toggleBeneficiary(account.id)}>
                          <p className="font-bold text-gray-900 truncate">{account.bank?.name || account.bank_platform?.name}</p>
                          <p className="text-sm text-gray-600 truncate">{account.account_holder}</p>
                          <p className="text-sm text-gray-500 font-mono truncate">{account.account_number}</p>
                        </div>
                        {isSelected && (
                          <button
                            onClick={() => toggleBeneficiary(account.id)}
                            className="p-2 hover:bg-red-100 rounded-lg transition-colors"
                          >
                            <X className="text-red-500" size={20} />
                          </button>
                        )}
                      </div>

                    </div>
                  );
                })}

                {/* Add new account button */}
                <button
                  type="button"
                  onClick={openAddModal}
                  className="w-full p-4 rounded-xl border-2 border-dashed border-gray-300 hover:border-blue-400 hover:bg-blue-50 transition-all flex items-center justify-center gap-2 text-gray-600 hover:text-blue-600"
                >
                  <Plus size={20} />
                  <span className="font-medium">Agregar Nueva Cuenta</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Step 3: Confirm */}
        {currentStep === 3 && (
          <div className="p-6 space-y-6">
            <div className="text-center mb-6">
              <h2 className="text-lg font-bold text-gray-900">Confirmar Operación</h2>
              <p className="text-sm text-gray-500">Revisa los detalles y confirma</p>
            </div>

            {/* Summary */}
            <div className="bg-gray-50 rounded-xl p-4 space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Envías</span>
                <span className="font-bold text-lg">
                  {getCurrency(fromCurrencyId)?.symbol} {parseFloat(amountSent).toLocaleString('es-VE', { minimumFractionDigits: 2 })} {getCurrency(fromCurrencyId)?.code}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Tasa de cambio</span>
                <span className="font-medium">
                  1 {getCurrency(fromCurrencyId)?.code} = {getCurrentRate().toLocaleString('es-VE')} {getCurrency(toCurrencyId)?.code}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Beneficiarios</span>
                <span className="font-medium">{selectedBeneficiaries.length}</span>
              </div>
            </div>

            {/* Beneficiaries breakdown */}
            {/* Beneficiaries breakdown with editable amounts */}
            <div className="space-y-3">
              <p className="text-sm font-semibold text-gray-700">Distribución por beneficiario:</p>

              {/* Amount indicator */}
              <div className={`p-3 rounded-xl border ${Math.abs(remainingAmount) < 0.01
                ? 'bg-green-50 border-green-200'
                : remainingAmount < 0
                  ? 'bg-red-50 border-red-200'
                  : 'bg-amber-50 border-amber-200'
                }`}>
                <div className="flex justify-between items-center text-sm">
                  <span>Total a enviar:</span>
                  <span className="font-bold">{getCurrency(fromCurrencyId)?.symbol} {parseFloat(amountSent).toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span>Distribuido:</span>
                  <span className="font-bold">{getCurrency(fromCurrencyId)?.symbol} {totalAmountToBeneficiaries.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span>Restante:</span>
                  <span className={`font-bold ${remainingAmount < 0 ? 'text-red-600' : remainingAmount > 0.01 ? 'text-amber-600' : 'text-green-600'}`}>
                    {getCurrency(fromCurrencyId)?.symbol} {remainingAmount.toFixed(2)}
                  </span>
                </div>
              </div>

              {selectedBeneficiaries.map((b, index) => {
                const account = getAccount(b.accountId);
                if (!account) return null;
                return (
                  <div key={b.accountId} className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-semibold text-blue-600 bg-blue-100 px-2 py-1 rounded-full">
                        Beneficiario {index + 1}
                      </span>
                    </div>
                    <p className="font-bold text-gray-900">{account.account_holder}</p>
                    <p className="text-sm text-gray-600">{account.bank_platform?.name}</p>
                    <p className="text-sm text-gray-500 font-mono">{account.account_number}</p>

                    {/* Editable amount input - only show if multiple beneficiaries */}
                    {selectedBeneficiaries.length > 1 ? (
                      <div className="mt-3 pt-3 border-t border-blue-200">
                        <label className="text-xs font-semibold text-gray-600 mb-1 block">
                          Monto a enviar ({getCurrency(fromCurrencyId)?.code})
                        </label>
                        <div className="flex gap-2 items-center">
                          <div className="relative flex-1">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm font-bold">
                              {getCurrency(fromCurrencyId)?.symbol}
                            </span>
                            <input
                              type="number"
                              value={b.amountToSend || ''}
                              onChange={(e) => updateBeneficiaryAmount(b.accountId, parseFloat(e.target.value) || 0)}
                              className="input pl-8 py-2 text-lg font-bold w-full"
                              placeholder="0.00"
                              min="0"
                              step="0.01"
                            />
                          </div>
                          <div className="text-right min-w-[90px]">
                            <p className="text-xs text-gray-500">Recibe</p>
                            <p className="font-bold text-green-600">
                              {getCurrency(toCurrencyId)?.symbol} {(b.amountToSend * getCurrentRate()).toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                            </p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-3 pt-3 border-t border-blue-200 flex justify-between items-center">
                        <span className="text-sm text-gray-600">Recibe:</span>
                        <span className="font-bold text-green-600 text-lg">
                          {getCurrency(toCurrencyId)?.symbol} {(b.amountToSend * getCurrentRate()).toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Datos bancarios de Fengxchange (placeholder) */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl p-5 text-white">
              <div className="flex items-center gap-2 mb-3">
                <Building className="flex-shrink-0" size={20} />
                <h3 className="font-bold">Datos para depositar tu {getCurrency(fromCurrencyId)?.code}</h3>
              </div>
              <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
                <div className="flex items-center justify-center gap-2 text-white/80">
                  <Info size={18} />
                  <p className="text-sm">
                    Los datos bancarios de Fengxchange serán cargados por el administrador.
                    Por ahora, contacta a soporte para obtener los datos de depósito.
                  </p>
                </div>
                {/* TODO: Mostrar datos bancarios de Fengxchange según fromCurrencyId
                    - Si es USD: cuenta Zelle, Wise, etc.
                    - Si es EUR: cuenta SEPA, etc.
                    Estos datos vendrán de la tabla company_bank_accounts configurada por el super admin
                */}
              </div>
            </div>

            {/* Proof Upload - Multiple images */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Upload size={18} className="text-gray-500" />
                <label className="text-sm font-semibold text-gray-700">
                  Comprobantes de Pago *
                </label>
              </div>
              <div className="flex items-center gap-2 p-3 bg-amber-50 rounded-lg border border-amber-200">
                <Info size={16} className="text-amber-600 flex-shrink-0" />
                <p className="text-xs text-amber-700">
                  Sube capturas de pantalla o fotos de tus comprobantes de depósito.
                </p>
              </div>

              {/* Uploaded images gallery */}
              {proofPreviews.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {proofPreviews.map((preview, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={preview}
                        alt={`Comprobante ${index + 1}`}
                        className="w-full h-24 object-cover rounded-lg border border-gray-200"
                      />
                      <button
                        type="button"
                        onClick={() => removeProofFile(index)}
                        className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Upload button */}
              <label className={`block border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${proofFiles.length > 0 ? 'border-green-400 bg-green-50' : 'border-gray-300 hover:border-blue-400'
                }`}>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleProofChange}
                  className="hidden"
                />
                <Upload className="mx-auto text-gray-400 mb-2" size={32} />
                <p className="text-sm text-gray-500">
                  {proofFiles.length > 0
                    ? `${proofFiles.length} imagen(es) seleccionada(s) - Haz clic para agregar más`
                    : 'Haz clic o arrastra imágenes'}
                </p>
              </label>
            </div>

            {/* Error Message - at the bottom */}
            {error && (
              <div className="flex items-center gap-3 p-4 bg-red-50 text-red-700 rounded-xl border border-red-200">
                <AlertCircle size={20} />
                <span>{error}</span>
              </div>
            )}
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="p-6 bg-gray-50 border-t border-gray-200 flex justify-between">
          {currentStep > 1 ? (
            <button
              onClick={prevStep}
              className="btn-secondary flex items-center gap-2"
            >
              <ChevronLeft size={20} />
              Anterior
            </button>
          ) : (
            <div />
          )}

          {currentStep < 3 ? (
            <button
              onClick={nextStep}
              disabled={currentStep === 2 && filteredAccounts.length === 0}
              className="btn-primary flex items-center gap-2"
            >
              Siguiente
              <ChevronRight size={20} />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={submitting || proofFiles.length === 0}
              className="btn-primary flex items-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  Procesando...
                </>
              ) : (
                <>
                  <CheckCircle2 size={20} />
                  Crear {selectedBeneficiaries.length > 1 ? 'Operaciones' : 'Operación'}
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Add Beneficiary Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowAddModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-auto animate-in fade-in zoom-in-95 duration-200">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">Agregar Nueva Cuenta</h3>
              <button type="button" onClick={() => setShowAddModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X size={20} className="text-gray-500" />
              </button>
            </div>
            <form onSubmit={handleAddBeneficiary} className="p-6 space-y-4">
              {/* Bank/Platform Selection */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">Banco / Plataforma <span className="text-red-500">*</span></label>
                {availableBanks.length === 0 ? (
                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-xl text-sm text-yellow-700">
                    No hay bancos disponibles para {getCurrency(toCurrencyId)?.code}
                  </div>
                ) : (
                  <select
                    value={newBeneficiaryForm.bank_id}
                    onChange={(e) => setNewBeneficiaryForm(prev => ({ ...prev, bank_id: e.target.value, account_number: '' }))}
                    className="input w-full"
                    required
                  >
                    <option value="">Selecciona una opción</option>
                    {availableBanks.map(bank => (
                      <option key={bank.id} value={bank.id}>{bank.name}</option>
                    ))}
                  </select>
                )}
              </div>

              {/* Pago Móvil - Bank Code + Phone */}
              {isPagoMovil && (
                <>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-gray-700">Banco (código) <span className="text-red-500">*</span></label>
                    <select
                      value={newBeneficiaryForm.account_number.slice(0, 4)}
                      onChange={(e) => setNewBeneficiaryForm(prev => ({ ...prev, account_number: e.target.value + prev.account_number.slice(4) }))}
                      className="input w-full"
                      required
                    >
                      <option value="">Selecciona banco</option>
                      {venezuelanBanks.map(bank => (
                        <option key={bank.code} value={bank.code}>{bank.code} - {bank.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-gray-700">Número de Teléfono <span className="text-red-500">*</span></label>
                    <input
                      type="tel"
                      value={newBeneficiaryForm.account_number.slice(4) || ''}
                      onChange={(e) => {
                        const bankCode = newBeneficiaryForm.account_number.slice(0, 4);
                        setNewBeneficiaryForm(prev => ({ ...prev, account_number: bankCode + e.target.value.replace(/\D/g, '') }));
                      }}
                      className="input w-full font-mono"
                      placeholder="04141234567"
                      maxLength={11}
                      required
                    />
                    <p className="text-xs text-gray-400">Número de 11 dígitos (04XX...)</p>
                  </div>
                </>
              )}

              {/* Digital Wallets (Phone-based) */}
              {!isPagoMovil && isPhoneWallet && (
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700">Número de Teléfono <span className="text-red-500">*</span></label>
                  <input
                    type="tel"
                    value={newBeneficiaryForm.account_number}
                    onChange={(e) => setNewBeneficiaryForm(prev => ({ ...prev, account_number: e.target.value.replace(/\D/g, '') }))}
                    className="input w-full font-mono"
                    placeholder={toCurrencyCode === 'COP' ? '3001234567' : '912345678'}
                    required
                  />
                </div>
              )}

              {/* Digital Wallets (Email-based) */}
              {!isPagoMovil && isDigitalWallet && !isPhoneWallet && (
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700">Correo Electrónico o ID <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={newBeneficiaryForm.account_number}
                    onChange={(e) => setNewBeneficiaryForm(prev => ({ ...prev, account_number: e.target.value }))}
                    className="input w-full"
                    placeholder="correo@ejemplo.com"
                    required
                  />
                </div>
              )}

              {/* Regular Bank Account */}
              {!isPagoMovil && !isDigitalWallet && newBeneficiaryForm.bank_id && (
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700">Número de Cuenta <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={newBeneficiaryForm.account_number}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '');
                      if (toCurrencyCode === 'VES' && value.length > 20) return;
                      setNewBeneficiaryForm(prev => ({ ...prev, account_number: value }));
                    }}
                    className="input w-full font-mono"
                    placeholder={
                      toCurrencyCode === 'VES'
                        ? (selectedBankForModal?.code ? `${selectedBankForModal.code}${'0'.repeat(16)}` : '01020000000000000000')
                        : 'Número de cuenta'
                    }
                    maxLength={toCurrencyCode === 'VES' ? 20 : undefined}
                    required
                  />
                  {toCurrencyCode === 'VES' && <p className="text-xs text-gray-400">20 dígitos. Los primeros 4 son el código del banco.</p>}
                </div>
              )}

              {/* Account Holder */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">Nombre del Titular <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={newBeneficiaryForm.account_holder}
                  onChange={(e) => setNewBeneficiaryForm(prev => ({ ...prev, account_holder: e.target.value }))}
                  className="input w-full"
                  placeholder="Nombre Apellido"
                  required
                />
              </div>

              {/* Document Type Selector */}
              {documentTypesForCurrency.length > 0 && (
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700">Tipo de Documento</label>
                  <select
                    value={newBeneficiaryForm.document_type}
                    onChange={(e) => setNewBeneficiaryForm(prev => ({ ...prev, document_type: e.target.value }))}
                    className="input w-full"
                  >
                    <option value="">Seleccionar tipo</option>
                    {documentTypesForCurrency.map(doc => (
                      <option key={doc.value} value={doc.value}>{doc.label}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Document Number */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">Número de Documento</label>
                <input
                  type="text"
                  value={newBeneficiaryForm.document_number}
                  onChange={(e) => setNewBeneficiaryForm(prev => ({ ...prev, document_number: e.target.value }))}
                  className="input w-full"
                  placeholder="Ej: 12345678"
                />
              </div>
              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-xl text-sm">
                  <AlertCircle size={16} />
                  {error}
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowAddModal(false)} className="btn-secondary flex-1">
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={addingBeneficiary || availableBanks.length === 0}
                  className="btn-primary flex-1 flex items-center justify-center gap-2"
                >
                  {addingBeneficiary ? (
                    <>
                      <Loader2 className="animate-spin" size={18} />
                      Guardando...
                    </>
                  ) : (
                    <>
                      <Plus size={18} />
                      Agregar Cuenta
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
