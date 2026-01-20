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
  bank_platform_id: number;
  account_number: string;
  account_holder: string;
  bank_platform: {
    name: string;
    currency_id: number;
  };
}

interface SelectedBeneficiary {
  accountId: string;
  amountToSend: number; // Monto en moneda origen (USD/EUR)
}

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

  // Form state
  const [fromCurrencyId, setFromCurrencyId] = useState<number>(1); // USD por defecto
  const [toCurrencyId, setToCurrencyId] = useState<number>(2); // VES por defecto
  const [amountSent, setAmountSent] = useState<string>('');

  // Multiple beneficiaries
  const [selectedBeneficiaries, setSelectedBeneficiaries] = useState<SelectedBeneficiary[]>([]);

  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofPreview, setProofPreview] = useState<string | null>(null);

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
          bank_platform_id,
          account_number,
          account_holder,
          bank_platform:banks_platforms (
            name,
            currency_id
          )
        `)
        .eq('user_id', user.id)
        .eq('is_active', true);

      if (currenciesData) setCurrencies(currenciesData);
      if (ratesData) setExchangeRates(ratesData);
      if (accountsData) setUserAccounts(accountsData as unknown as UserBankAccount[]);
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Error al cargar los datos');
    } finally {
      setLoading(false);
    }
  };

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

  // Filter accounts by destination currency
  const filteredAccounts = userAccounts.filter(
    acc => acc.bank_platform?.currency_id === toCurrencyId
  );

  // Get account by ID
  const getAccount = (id: string) => userAccounts.find(acc => acc.id === id);

  // Toggle beneficiary selection
  const toggleBeneficiary = (accountId: string) => {
    const existing = selectedBeneficiaries.find(b => b.accountId === accountId);
    if (existing) {
      // Remove
      setSelectedBeneficiaries(prev => prev.filter(b => b.accountId !== accountId));
    } else {
      // Add with remaining amount (or 0 if negative)
      setSelectedBeneficiaries(prev => [
        ...prev,
        { accountId, amountToSend: Math.max(0, remainingAmount) }
      ]);
    }
  };

  // Update beneficiary amount
  const updateBeneficiaryAmount = (accountId: string, amount: number) => {
    setSelectedBeneficiaries(prev =>
      prev.map(b => b.accountId === accountId ? { ...b, amountToSend: amount } : b)
    );
  };

  // Handle proof file change
  const handleProofChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setProofFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setProofPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Submit transaction(s)
  const handleSubmit = async () => {
    if (selectedBeneficiaries.length === 0 || !proofFile) {
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

      // Upload proof
      let proofUrl: string | null = null;
      const fileExt = proofFile.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('client-proofs')
        .upload(fileName, proofFile);

      if (uploadError) {
        console.error('Error uploading proof:', uploadError);
      } else {
        const { data: { publicUrl } } = supabase.storage
          .from('client-proofs')
          .getPublicUrl(fileName);
        proofUrl = publicUrl;
      }

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

    } catch (err: any) {
      console.error('Error creating transaction:', err);
      setError(err.message || 'Error al crear la operación');
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
    setCurrentStep(prev => Math.max(prev - 1, 1));
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

      {/* Error Message */}
      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-50 text-red-700 rounded-xl border border-red-200">
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      )}

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
                {currencies.filter(c => c.code === 'USD' || c.code === 'EUR').map(currency => (
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
                className="input"
              >
                {currencies.filter(c => c.code !== 'USD' && c.code !== 'EUR').map(currency => (
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

            {/* Amount indicator */}
            <div className={`p-4 rounded-xl border ${Math.abs(remainingAmount) < 0.01
                ? 'bg-green-50 border-green-200'
                : remainingAmount < 0
                  ? 'bg-red-50 border-red-200'
                  : 'bg-amber-50 border-amber-200'
              }`}>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Total a enviar:</span>
                <span className="font-bold">{getCurrency(fromCurrencyId)?.symbol} {parseFloat(amountSent).toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center mt-1">
                <span className="text-sm font-medium">Distribuido:</span>
                <span className="font-bold">{getCurrency(fromCurrencyId)?.symbol} {totalAmountToBeneficiaries.toFixed(2)}</span>
              </div>
              <div className="h-px bg-gray-300 my-2" />
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Restante:</span>
                <span className={`font-bold ${remainingAmount < 0 ? 'text-red-600' : remainingAmount > 0.01 ? 'text-amber-600' : 'text-green-600'}`}>
                  {getCurrency(fromCurrencyId)?.symbol} {remainingAmount.toFixed(2)}
                </span>
              </div>
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
                  const beneficiary = selectedBeneficiaries.find(b => b.accountId === account.id);
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
                          <p className="font-bold text-gray-900 truncate">{account.bank_platform?.name}</p>
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

                      {/* Amount input for selected beneficiary */}
                      {isSelected && beneficiary && (
                        <div className="mt-4 pt-4 border-t border-blue-200">
                          <label className="text-xs font-semibold text-gray-600 mb-1 block">
                            Monto a enviar ({getCurrency(fromCurrencyId)?.code})
                          </label>
                          <div className="flex gap-3 items-center">
                            <div className="relative flex-1">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm font-bold">
                                {getCurrency(fromCurrencyId)?.symbol}
                              </span>
                              <input
                                type="number"
                                value={beneficiary.amountToSend || ''}
                                onChange={(e) => updateBeneficiaryAmount(account.id, parseFloat(e.target.value) || 0)}
                                className="input pl-8 py-2 text-lg font-bold"
                                placeholder="0.00"
                                min="0"
                                step="0.01"
                              />
                            </div>
                            <div className="text-right min-w-[100px]">
                              <p className="text-xs text-gray-500">Recibe</p>
                              <p className="font-bold text-green-600">
                                {getCurrency(toCurrencyId)?.symbol} {(beneficiary.amountToSend * getCurrentRate()).toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
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
            <div className="space-y-3">
              <p className="text-sm font-semibold text-gray-700">Distribución por beneficiario:</p>
              {selectedBeneficiaries.map((b, index) => {
                const account = getAccount(b.accountId);
                if (!account) return null;
                return (
                  <div key={b.accountId} className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-blue-600">Beneficiario {index + 1}</span>
                      <span className="text-xs text-gray-500">
                        Envías: {getCurrency(fromCurrencyId)?.symbol} {b.amountToSend.toFixed(2)}
                      </span>
                    </div>
                    <p className="font-bold text-gray-900">{account.account_holder}</p>
                    <p className="text-sm text-gray-600">{account.bank_platform?.name}</p>
                    <p className="text-sm text-gray-500 font-mono">{account.account_number}</p>
                    <div className="mt-2 pt-2 border-t border-blue-200 flex justify-between items-center">
                      <span className="text-sm text-gray-600">Recibe:</span>
                      <span className="font-bold text-green-600 text-lg">
                        {getCurrency(toCurrencyId)?.symbol} {(b.amountToSend * getCurrentRate()).toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Proof Upload */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Upload size={18} className="text-gray-500" />
                <label className="text-sm font-semibold text-gray-700">
                  Comprobante de Pago *
                </label>
              </div>
              <div className="flex items-center gap-2 p-3 bg-amber-50 rounded-lg border border-amber-200">
                <Info size={16} className="text-amber-600 flex-shrink-0" />
                <p className="text-xs text-amber-700">
                  Debes subir el comprobante de tu depósito para continuar.
                </p>
              </div>
              <label className={`block border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${proofFile ? 'border-green-400 bg-green-50' : 'border-gray-300 hover:border-blue-400'
                }`}>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleProofChange}
                  className="hidden"
                />
                {proofPreview ? (
                  <img src={proofPreview} alt="Comprobante" className="max-h-40 mx-auto rounded-lg" />
                ) : (
                  <>
                    <Upload className="mx-auto text-gray-400 mb-2" size={32} />
                    <p className="text-sm text-gray-500">
                      Haz clic o arrastra una imagen
                    </p>
                  </>
                )}
              </label>
            </div>
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
              disabled={submitting || !proofFile}
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
    </div>
  );
}
