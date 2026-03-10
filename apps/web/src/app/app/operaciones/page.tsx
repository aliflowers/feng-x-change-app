'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
  Copy,
  CheckCircle,
  RefreshCw,
  Info,
  Plus,
  X,
  Users,
  Search,
  ChevronDown,
  AlertTriangle,
  Mail,
  Shield,
  XCircle
} from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { updateClientLastActivity } from '@/lib/client-session-config';

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
  document_type?: string;
  document_number?: string;
  account_type?: string;
  email?: string;
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

interface CompanyBankAccount {
  id: number;
  name: string;
  type: 'BANK' | 'PLATFORM';
  currency_id: number;
  account_number: string;
  account_holder: string;
  bank_code: string | null;
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

// Monedas que son realmente plataformas de pago (no deben aparecer en el selector de moneda origen)
const PLATFORM_CURRENCY_CODES = ['PAYPAL', 'ZINLI', 'USDT'];

// Comisiones PayPal estándar
const PAYPAL_FEE_PERCENTAGE = 0.054; // 5.4%
const PAYPAL_FIXED_FEE = 0.30;      // $0.30 USD

// Calcular: "Envío X bruto" → "Recibo Y neto"
const calcPaypalNet = (gross: number): number => {
  if (gross <= 0) return 0;
  return gross - (gross * PAYPAL_FEE_PERCENTAGE + PAYPAL_FIXED_FEE);
};

// Calcular: "Quiero recibir Y neto" → "Debo enviar X bruto"
const calcPaypalGross = (net: number): number => {
  if (net <= 0) return 0;
  return (net + PAYPAL_FIXED_FEE) / (1 - PAYPAL_FEE_PERCENTAGE);
};

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
  const [companyAccounts, setCompanyAccounts] = useState<CompanyBankAccount[]>([]);
  const [selectedCompanyAccountId, setSelectedCompanyAccountId] = useState<number | null>(null);
  const [paypalEmail, setPaypalEmail] = useState('');
  const [sendingPaypalInvoice, setSendingPaypalInvoice] = useState(false);
  const [paypalInvoiceSent, setPaypalInvoiceSent] = useState(false);
  const [paypalInvoiceId, setPaypalInvoiceId] = useState<string | null>(null);
  const [paypalInvoiceError, setPaypalInvoiceError] = useState<string | null>(null);
  const [paypalPaymentConfirmed, setPaypalPaymentConfirmed] = useState(false);
  const [checkingPaypalPayment, setCheckingPaypalPayment] = useState(false);
  const [showPaypalConfirmModal, setShowPaypalConfirmModal] = useState(false);
  const [paypalTransactionData, setPaypalTransactionData] = useState<{
    transactionId: string | null;
    paymentDate: string | null;
    reference: string | null;
  } | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [dropdownSearch, setDropdownSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // PayPal Identity verification states
  const [paypalIdentityVerified, setPaypalIdentityVerified] = useState(false);
  const [paypalVerifiedName, setPaypalVerifiedName] = useState('');

  const [verifyingPaypalIdentity, setVerifyingPaypalIdentity] = useState(false);
  const [paypalIdentityError, setPaypalIdentityError] = useState<string | null>(null);

  // User role & 2FA states for PayPal flow
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [isUserAffiliate, setIsUserAffiliate] = useState(false);
  const [userHas2FA, setUserHas2FA] = useState(false);
  const [show2FAModal, setShow2FAModal] = useState(false);
  const [twoFACode, setTwoFACode] = useState('');
  const [verifying2FA, setVerifying2FA] = useState(false);
  const [twoFAError, setTwoFAError] = useState<string | null>(null);

  // PayPal commission calculator states
  const [paypalCalcMode, setPaypalCalcMode] = useState<'send' | 'receive'>('send');
  const [paypalReceiveAmount, setPaypalReceiveAmount] = useState<string>('');

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [dropdownOpen]);

  // PayPal payment polling - checks invoice status every 10s after sending
  useEffect(() => {
    if (!paypalInvoiceSent || !paypalInvoiceId || paypalPaymentConfirmed) return;

    setCheckingPaypalPayment(true);
    const intervalId = setInterval(async () => {
      try {
        const res = await fetch(`/api/paypal/check-invoice-status?invoiceId=${paypalInvoiceId}`);
        const data = await res.json();
        if (data.status === 'PAID' || data.status === 'MARKED_AS_PAID') {
          setPaypalPaymentConfirmed(true);
          setCheckingPaypalPayment(false);
          setShowPaypalConfirmModal(true);
          setPaypalTransactionData({
            transactionId: data.transactionId || null,
            paymentDate: data.paymentDate || null,
            reference: data.reference || null,
          });
          clearInterval(intervalId);
        }
      } catch (err) {
        console.error('[PayPal Polling] Error checking status:', err);
      }
    }, 10000); // Every 10 seconds

    return () => {
      clearInterval(intervalId);
      setCheckingPaypalPayment(false);
    };
  }, [paypalInvoiceSent, paypalInvoiceId, paypalPaymentConfirmed]);

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
          document_type,
          document_number,
          account_type,
          email,
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

      // Load company bank accounts (banks_platforms) for deposit info
      const { data: companyBanksData } = await supabase
        .from('banks_platforms')
        .select('id, name, type, currency_id, account_number, account_holder, bank_code')
        .eq('is_active', true)
        .order('name');

      if (currenciesData) setCurrencies(currenciesData);
      if (ratesData) setExchangeRates(ratesData);
      if (accountsData) setUserAccounts(accountsData as unknown as UserBankAccount[]);
      if (banksData) setBanks(banksData);
      if (companyBanksData) setCompanyAccounts(companyBanksData);

      // Load user profile for affiliate/2FA info
      const { data: profileData } = await supabase
        .from('profiles')
        .select('is_affiliate, two_factor_method, two_factor_verified')
        .eq('id', user.id)
        .single();

      if (profileData) {
        setCurrentUserId(user.id);
        setIsUserAffiliate(profileData.is_affiliate || false);
        setUserHas2FA(profileData.two_factor_method === 'totp' && profileData.two_factor_verified === true);
      }
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Error al cargar los datos');
    } finally {
      setLoading(false);
    }
  };

  // PayPal Identity verification — opens popup for "Log In with PayPal"
  const paypalResultProcessed = useRef(false);

  const verifyPaypalIdentity = async () => {
    setVerifyingPaypalIdentity(true);
    setPaypalIdentityError(null);
    paypalResultProcessed.current = false;
    try {
      // Get userId — use state or fallback to Supabase session
      let userId = currentUserId;
      if (!userId) {
        const { data: { user } } = await supabase.auth.getUser();
        userId = user?.id || '';
      }
      if (!userId) {
        setPaypalIdentityError('No se pudo obtener tu usuario. Recarga la página e intenta de nuevo.');
        setVerifyingPaypalIdentity(false);
        return;
      }
      localStorage.setItem('paypal_verify_userId', userId);
      localStorage.removeItem('paypal_identity_result');
      // Clear any previous cookie
      document.cookie = 'paypal_result=; path=/; max-age=0';
      updateClientLastActivity();

      const res = await fetch(`/api/paypal/identity/authorize?userId=${encodeURIComponent(userId)}`);
      const { authUrl } = await res.json();
      const popup = window.open(authUrl, 'paypal-identity', 'width=500,height=600,scrollbars=yes');

      // Helper: Apply the result to state
      const applyResult = (result: { success?: boolean; error?: string; data?: Record<string, string | boolean> }) => {
        if (paypalResultProcessed.current) return; // Already processed
        paypalResultProcessed.current = true;
        setVerifyingPaypalIdentity(false);

        if (result.success && result.data) {
          if (result.data.nameMatch === false) {
            setPaypalIdentityVerified(false);
            setPaypalIdentityError(
              `El nombre de tu cuenta PayPal (${result.data.name}) no coincide con tu nombre registrado (${result.data.profileName}). Debes usar una cuenta PayPal a tu nombre.`
            );
          } else {
            setPaypalIdentityError(null);
            setPaypalIdentityVerified(true);
            setPaypalVerifiedName(String(result.data.name || ''));
            if (result.data.email) {
              setPaypalEmail(String(result.data.email));
            }
          }
        } else if (result.error === 'name_mismatch' && result.data) {
          setPaypalIdentityVerified(false);
          setPaypalIdentityError(
            `El nombre de tu cuenta PayPal (${result.data.name}) no coincide con tu nombre registrado (${result.data.profileName}). Debes usar una cuenta PayPal a tu nombre.`
          );
        } else {
          setPaypalIdentityVerified(false);
        }
      };

      // Try to read result from any available channel
      const tryReadResult = (): boolean => {
        if (paypalResultProcessed.current) return true;

        // Channel 1: localStorage
        const lsResult = localStorage.getItem('paypal_identity_result');
        if (lsResult) {
          localStorage.removeItem('paypal_identity_result');
          try {
            applyResult(JSON.parse(lsResult));
            return true;
          } catch { /* continue to other channels */ }
        }

        // Channel 2: cookie
        const cookieMatch = document.cookie.match(/paypal_result=([^;]+)/);
        if (cookieMatch) {
          document.cookie = 'paypal_result=; path=/; max-age=0';
          try {
            applyResult(JSON.parse(decodeURIComponent(cookieMatch[1])));
            return true;
          } catch { /* continue */ }
        }

        return false;
      };

      // Channel 3: postMessage listener
      const handleMessage = (event: MessageEvent) => {
        if (event.data?.type !== 'paypal-identity') return;
        window.removeEventListener('message', handleMessage);
        applyResult(event.data);
      };
      window.addEventListener('message', handleMessage);

      // Poll every 500ms (faster than before)
      const pollInterval = setInterval(() => {
        updateClientLastActivity();

        if (tryReadResult()) {
          clearInterval(pollInterval);
          window.removeEventListener('message', handleMessage);
          window.removeEventListener('focus', handleFocus);
          document.removeEventListener('visibilitychange', handleVisibility);
          return;
        }

        if (!popup || popup.closed) {
          clearInterval(pollInterval);
          // Give one extra 500ms for result to arrive
          setTimeout(() => {
            if (!tryReadResult()) {
              if (!paypalResultProcessed.current) {
                paypalResultProcessed.current = true;
                setVerifyingPaypalIdentity(false);
              }
            }
            window.removeEventListener('message', handleMessage);
            window.removeEventListener('focus', handleFocus);
            document.removeEventListener('visibilitychange', handleVisibility);
          }, 500);
        }
      }, 500);

      // Focus/visibility handlers — fire when main window regains focus
      const handleFocus = () => {
        setTimeout(() => tryReadResult(), 100); // Small delay to let localStorage sync
      };
      const handleVisibility = () => {
        if (document.visibilityState === 'visible') {
          setTimeout(() => tryReadResult(), 100);
        }
      };
      window.addEventListener('focus', handleFocus);
      document.addEventListener('visibilitychange', handleVisibility);
    } catch (err) {
      console.error('PayPal identity error:', err);
      setVerifyingPaypalIdentity(false);
    }
  };

  // 2FA verification for affiliates
  const verify2FACode = async (): Promise<boolean> => {
    setVerifying2FA(true);
    setTwoFAError(null);
    try {
      const res = await fetch('/api/auth/2fa/verify-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: twoFACode }),
      });
      const data = await res.json();
      if (!res.ok || !data.valid) {
        setTwoFAError('Código inválido. Intenta de nuevo.');
        return false;
      }
      setShow2FAModal(false);
      setTwoFACode('');
      return true;
    } catch (err) {
      console.error('2FA verification error:', err);
      setTwoFAError('Error al verificar el código.');
      return false;
    } finally {
      setVerifying2FA(false);
    }
  };

  // Filtrar monedas de origen disponibles (solo las que tienen tasas activas configuradas como origen)
  // Excluir monedas que son realmente plataformas (PayPal, Zinli, USDT)
  const availableFromCurrencies = currencies.filter(c =>
    exchangeRates.some(r => r.from_currency_id === c.id) &&
    !PLATFORM_CURRENCY_CODES.includes(c.code.toUpperCase())
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
          document_type,
          document_number,
          account_type,
          email,
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
    // Determine if PayPal flow
    const paypalAccount = companyAccounts.find(a => a.id === selectedCompanyAccountId);
    const isPaypalFlow = paypalAccount?.name.toLowerCase().includes('paypal');

    // For PayPal: require confirmed payment, no proof files needed
    // For other methods: require proof files
    if (isPaypalFlow) {
      if (selectedBeneficiaries.length === 0 || !paypalPaymentConfirmed) {
        setError('Por favor selecciona al menos un beneficiario y espera la confirmación de pago de PayPal');
        return;
      }
    } else {
      if (selectedBeneficiaries.length === 0 || proofFiles.length === 0) {
        setError('Por favor selecciona al menos un beneficiario y sube el comprobante de pago');
        return;
      }
    }

    // Validate PayPal email if PayPal is selected
    if (isPaypalFlow) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!paypalEmail || !emailRegex.test(paypalEmail)) {
        setError('Ingresa un correo de PayPal válido para recibir la solicitud de pago');
        return;
      }
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

      // Upload proof files (only for non-PayPal flows)
      let proofUrl: string | null = null;
      if (isPaypalFlow) {
        // PayPal verified - no upload needed
        proofUrl = `PAYPAL_VERIFIED|INVOICE:${paypalInvoiceId}`;
      } else {
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
        proofUrl = proofUrls.length > 0 ? proofUrls.join(',') : null;
      }

      // Get the latest transaction number for the current year
      const currentYear = new Date().getFullYear();
      const { data: latestTx } = await supabase
        .from('transactions')
        .select('transaction_number')
        .like('transaction_number', `OP-${currentYear}-%`)
        .order('transaction_number', { ascending: false })
        .limit(1);

      let lastNumber = 0;
      if (latestTx && latestTx.length > 0 && latestTx[0].transaction_number) {
        const parts = latestTx[0].transaction_number.split('-');
        if (parts.length === 3) {
          lastNumber = parseInt(parts[2], 10) || 0;
        }
      }

      // Determine if PayPal is selected
      const selectedAccount = companyAccounts.find(a => a.id === selectedCompanyAccountId);
      const isPaypal = selectedAccount?.name.toLowerCase().includes('paypal');

      // Create transactions for each beneficiary
      const rate = getCurrentRate();
      const transactions = selectedBeneficiaries.map((b, index) => {
        // Generar un número de transacción secuencial: OP-YYYY-XXXXX
        const nextNumber = lastNumber + 1 + index;
        const uniqueTxNumber = `OP-${currentYear}-${String(nextNumber).padStart(5, '0')}`;

        return {
          user_id: user.id,
          from_currency_id: fromCurrencyId,
          to_currency_id: toCurrencyId,
          amount_sent: b.amountToSend,
          exchange_rate_applied: rate,
          amount_received: b.amountToSend * rate,
          user_bank_account_id: b.accountId,
          client_proof_url: proofUrl,
          bank_platform_id: selectedCompanyAccountId,
          admin_notes: isPaypal ? `PAYPAL_EMAIL: ${paypalEmail} | INVOICE_ID: ${paypalInvoiceId || 'N/A'} | TRANSACTION_ID: ${paypalTransactionData?.transactionId || 'N/A'} | PAYMENT_DATE: ${paypalTransactionData?.paymentDate || 'N/A'} | REFERENCE: ${paypalTransactionData?.reference || 'N/A'} | PAYMENT_VERIFIED: YES` : null,
          status: isPaypal ? 'VERIFIED' : 'POOL',
          transaction_number: uniqueTxNumber
        };
      });

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
  // Company accounts filtered by selected origin currency
  const companyAccountsForCurrency = useMemo(() =>
    companyAccounts.filter(acc => acc.currency_id === fromCurrencyId),
    [companyAccounts, fromCurrencyId]
  );

  // Auto-select if only one company account available
  useEffect(() => {
    if (companyAccountsForCurrency.length === 1) {
      setSelectedCompanyAccountId(companyAccountsForCurrency[0].id);
    } else if (!companyAccountsForCurrency.find(a => a.id === selectedCompanyAccountId)) {
      setSelectedCompanyAccountId(null);
    }
  }, [companyAccountsForCurrency, selectedCompanyAccountId]);

  // Mapeo de logos de bancos/plataformas
  const COMPANY_BANK_LOGOS: Record<string, string> = {
    'Banco de Venezuela': '/flags/bdv.png',
    'BDV': '/flags/bdv.png',
    'Banesco': '/flags/banesco-768x256.jpg',
    'Mercantil': '/flags/banco-mercantil.jpg',
    'Banco Mercantil': '/flags/banco-mercantil.jpg',
    'BNC': '/flags/bnc.png',
    'Banco Nacional de Crédito': '/flags/bnc.png',
    'BCP': '/flags/BCP-Peru.svg',
    'Interbank': '/flags/Interbank.jpeg',
    'Yape': '/flags/Yape.svg',
    'Plin': '/flags/Plin.png',
    'Scotiabank': '/flags/scotiabank.svg',
    'Bancolombia': '/flags/bancolombia.svg',
    'Nequi': '/flags/Nequi.jpeg',
    'Banco Estado': '/flags/Banco-estado-chile.svg',
    'Zelle': '/flags/Zelle.svg',
    'PayPal': '/flags/PayPal.svg',
    'Zinli': '/flags/Zinli.jpg',
    'Binance': '/flags/Binance.jpeg',
    'Binance Pay': '/flags/Binance.jpeg',
    'USDT': '/flags/usdt.svg',
  };

  // Copiar al portapapeles
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // Detectar si PayPal está seleccionado como plataforma
  const selectedPlatform = companyAccounts.find(a => a.id === selectedCompanyAccountId);
  const isPaypalSelected = selectedPlatform?.name.toLowerCase().includes('paypal') ?? false;

  // Cálculos de comisión PayPal derivados
  const paypalGrossAmount = paypalCalcMode === 'send'
    ? parseFloat(amountSent || '0')
    : calcPaypalGross(parseFloat(paypalReceiveAmount || '0'));
  const paypalNetAmount = paypalCalcMode === 'send'
    ? calcPaypalNet(parseFloat(amountSent || '0'))
    : parseFloat(paypalReceiveAmount || '0');
  const paypalFeeAmount = paypalGrossAmount - paypalNetAmount;
  const paypalPercentageFee = paypalGrossAmount * PAYPAL_FEE_PERCENTAGE;
  const paypalFixedFeeDisplay = PAYPAL_FIXED_FEE;

  const nextStep = () => {
    if (currentStep === 1 && (!amountSent || parseFloat(amountSent) <= 0)) {
      setError('Ingresa un monto válido');
      return;
    }

    // Validate company account selection
    if (currentStep === 1 && companyAccountsForCurrency.length > 0 && !selectedCompanyAccountId) {
      setError('Selecciona el banco o plataforma por donde realizarás tu envío');
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
                onChange={(e) => {
                  setFromCurrencyId(parseInt(e.target.value));
                  setSelectedCompanyAccountId(null);
                }}
                className="input"
              >
                {availableFromCurrencies.map(currency => (
                  <option key={currency.id} value={currency.id}>
                    {currency.symbol} {currency.code} - {currency.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Company Bank/Platform Selector */}
            {companyAccountsForCurrency.length > 0 && (
              <div className="space-y-3">
                <label className="text-sm font-semibold text-gray-700">
                  ¿Por dónde enviarás tu {getCurrency(fromCurrencyId)?.code}?
                </label>
                <p className="text-xs text-gray-500 -mt-1">
                  Escoge el banco o plataforma por donde deseas hacer tu envío
                </p>

                {/* Adaptive: Cards if ≤7, Custom Dropdown if >7 */}
                {companyAccountsForCurrency.length <= 7 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {companyAccountsForCurrency.map(account => {
                      const isSelected = selectedCompanyAccountId === account.id;
                      const logoPath = COMPANY_BANK_LOGOS[account.name];
                      return (
                        <button
                          key={account.id}
                          type="button"
                          onClick={() => setSelectedCompanyAccountId(account.id)}
                          className={`relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all text-center ${isSelected
                            ? 'border-blue-500 bg-blue-50 shadow-md ring-2 ring-blue-200'
                            : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                            }`}
                        >
                          {isSelected && (
                            <div className="absolute top-2 right-2">
                              <CheckCircle2 className="text-blue-600" size={18} />
                            </div>
                          )}
                          {logoPath ? (
                            <div className="w-10 h-10 rounded-lg overflow-hidden bg-white border border-gray-100 flex items-center justify-center">
                              <img
                                src={logoPath}
                                alt={account.name}
                                className="w-full h-full object-contain"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.style.display = 'none';
                                  if (target.parentElement) {
                                    target.parentElement.innerHTML = `<span class="text-white font-bold text-sm">${account.name.substring(0, 2).toUpperCase()}</span>`;
                                    target.parentElement.className = `w-10 h-10 rounded-lg flex items-center justify-center ${account.type === 'BANK'
                                      ? 'bg-gradient-to-br from-blue-500 to-indigo-600'
                                      : 'bg-gradient-to-br from-purple-500 to-pink-600'
                                      }`;
                                  }
                                }}
                              />
                            </div>
                          ) : (
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm ${account.type === 'BANK'
                              ? 'bg-gradient-to-br from-blue-500 to-indigo-600'
                              : 'bg-gradient-to-br from-purple-500 to-pink-600'
                              }`}>
                              {account.name.substring(0, 2).toUpperCase()}
                            </div>
                          )}
                          <div>
                            <p className={`text-sm font-semibold leading-tight ${isSelected ? 'text-blue-700' : 'text-gray-800'}`}>
                              {account.name}
                            </p>
                            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full mt-1 inline-block ${account.type === 'BANK'
                              ? 'bg-blue-100 text-blue-600'
                              : 'bg-purple-100 text-purple-600'
                              }`}>
                              {account.type === 'BANK' ? 'Banco' : 'Plataforma'}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  /* Custom Dropdown with Search for >7 options */
                  <div className="relative" ref={dropdownRef}>
                    {/* Trigger button */}
                    <button
                      type="button"
                      onClick={() => {
                        setDropdownOpen(!dropdownOpen);
                        setDropdownSearch('');
                      }}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${selectedCompanyAccountId
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                        }`}
                    >
                      {(() => {
                        const selected = companyAccountsForCurrency.find(a => a.id === selectedCompanyAccountId);
                        if (selected) {
                          const logoPath = COMPANY_BANK_LOGOS[selected.name];
                          return (
                            <>
                              {logoPath ? (
                                <div className="w-8 h-8 rounded-lg overflow-hidden bg-white border border-gray-100 flex items-center justify-center flex-shrink-0">
                                  <img src={logoPath} alt={selected.name} className="w-full h-full object-contain" />
                                </div>
                              ) : (
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-white font-bold text-xs ${selected.type === 'BANK' ? 'bg-gradient-to-br from-blue-500 to-indigo-600' : 'bg-gradient-to-br from-purple-500 to-pink-600'
                                  }`}>
                                  {selected.name.substring(0, 2).toUpperCase()}
                                </div>
                              )}
                              <div className="flex-1 text-left">
                                <p className="text-sm font-semibold text-gray-800">{selected.name}</p>
                                <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${selected.type === 'BANK' ? 'bg-blue-100 text-blue-600' : 'bg-purple-100 text-purple-600'}`}>
                                  {selected.type === 'BANK' ? 'Banco' : 'Plataforma'}
                                </span>
                              </div>
                            </>
                          );
                        }
                        return (
                          <>
                            <Building size={20} className="text-gray-400 flex-shrink-0" />
                            <span className="flex-1 text-left text-sm text-gray-500">Selecciona un banco o plataforma...</span>
                          </>
                        );
                      })()}
                      <ChevronDown size={18} className={`text-gray-400 transition-transform flex-shrink-0 ${dropdownOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {/* Dropdown panel */}
                    {dropdownOpen && (
                      <div className="absolute z-50 w-full mt-2 bg-white rounded-xl border border-gray-200 shadow-xl overflow-hidden">
                        {/* Search input */}
                        <div className="p-3 border-b border-gray-100">
                          <div className="relative">
                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                              type="text"
                              value={dropdownSearch}
                              onChange={(e) => setDropdownSearch(e.target.value)}
                              placeholder="Buscar banco o plataforma..."
                              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
                              autoFocus
                            />
                          </div>
                        </div>
                        {/* Options list */}
                        <div className="max-h-60 overflow-y-auto">
                          {companyAccountsForCurrency
                            .filter(a => a.name.toLowerCase().includes(dropdownSearch.toLowerCase()))
                            .map(account => {
                              const isSelected = selectedCompanyAccountId === account.id;
                              const logoPath = COMPANY_BANK_LOGOS[account.name];
                              return (
                                <button
                                  key={account.id}
                                  type="button"
                                  onClick={() => {
                                    setSelectedCompanyAccountId(account.id);
                                    setDropdownOpen(false);
                                    setDropdownSearch('');
                                  }}
                                  className={`w-full flex items-center gap-3 px-4 py-3 transition-colors text-left ${isSelected
                                    ? 'bg-blue-50 border-l-4 border-l-blue-500'
                                    : 'hover:bg-gray-50 border-l-4 border-l-transparent'
                                    }`}
                                >
                                  {logoPath ? (
                                    <div className="w-8 h-8 rounded-lg overflow-hidden bg-white border border-gray-100 flex items-center justify-center flex-shrink-0">
                                      <img src={logoPath} alt={account.name} className="w-full h-full object-contain" />
                                    </div>
                                  ) : (
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-white font-bold text-xs ${account.type === 'BANK' ? 'bg-gradient-to-br from-blue-500 to-indigo-600' : 'bg-gradient-to-br from-purple-500 to-pink-600'
                                      }`}>
                                      {account.name.substring(0, 2).toUpperCase()}
                                    </div>
                                  )}
                                  <div className="flex-1">
                                    <p className={`text-sm font-semibold ${isSelected ? 'text-blue-700' : 'text-gray-800'}`}>{account.name}</p>
                                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${account.type === 'BANK' ? 'bg-blue-100 text-blue-600' : 'bg-purple-100 text-purple-600'}`}>
                                      {account.type === 'BANK' ? 'Banco' : 'Plataforma'}
                                    </span>
                                  </div>
                                  {isSelected && <CheckCircle2 className="text-blue-600 flex-shrink-0" size={18} />}
                                </button>
                              );
                            })
                          }
                          {companyAccountsForCurrency.filter(a => a.name.toLowerCase().includes(dropdownSearch.toLowerCase())).length === 0 && (
                            <div className="px-4 py-6 text-center text-sm text-gray-500">
                              No se encontraron resultados para &quot;{dropdownSearch}&quot;
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Amount Sent — PayPal mode shows bidirectional calculator */}
            {isPaypalSelected ? (
              <div className="space-y-4">
                {/* Mode selector tabs */}
                <div className="flex rounded-xl border border-gray-200 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => {
                      setPaypalCalcMode('send');
                      setPaypalReceiveAmount('');
                    }}
                    className={`flex-1 py-3 text-sm font-semibold transition-all ${paypalCalcMode === 'send'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-600 hover:bg-gray-50'
                      }`}
                  >
                    Si envías
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPaypalCalcMode('receive');
                      setAmountSent('');
                      setSelectedBeneficiaries([]);
                    }}
                    className={`flex-1 py-3 text-sm font-semibold transition-all ${paypalCalcMode === 'receive'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-600 hover:bg-gray-50'
                      }`}
                  >
                    Si recibimos
                  </button>
                </div>

                {paypalCalcMode === 'send' ? (
                  /* Mode: "Si envías" → Recibimos */
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-gray-700">Si envías</label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold">
                          {getCurrency(fromCurrencyId)?.symbol}
                        </span>
                        <input
                          type="number"
                          value={amountSent}
                          onChange={(e) => {
                            setAmountSent(e.target.value);
                            setSelectedBeneficiaries([]);
                          }}
                          className="input pl-10 text-2xl font-bold text-center"
                          placeholder="0.00"
                          min="1"
                          step="0.01"
                        />
                      </div>
                    </div>
                    {parseFloat(amountSent || '0') > 0 && (
                      <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                        <p className="text-sm font-semibold text-blue-700 mb-1">Recibimos</p>
                        <p className="text-2xl font-bold text-blue-800">
                          {getCurrency(fromCurrencyId)?.symbol} {paypalNetAmount.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  /* Mode: "Si recibimos" → Debes enviar */
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-gray-700">Si recibimos</label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold">
                          {getCurrency(fromCurrencyId)?.symbol}
                        </span>
                        <input
                          type="number"
                          value={paypalReceiveAmount}
                          onChange={(e) => {
                            const val = e.target.value;
                            setPaypalReceiveAmount(val);
                            // Auto-calculate gross and set as amountSent
                            const net = parseFloat(val || '0');
                            if (net > 0) {
                              setAmountSent(calcPaypalGross(net).toFixed(2));
                            } else {
                              setAmountSent('');
                            }
                            setSelectedBeneficiaries([]);
                          }}
                          className="input pl-10 text-2xl font-bold text-center"
                          placeholder="0.00"
                          min="1"
                          step="0.01"
                        />
                      </div>
                    </div>
                    {parseFloat(paypalReceiveAmount || '0') > 0 && (
                      <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
                        <p className="text-sm font-semibold text-amber-700 mb-1">Debes enviar</p>
                        <p className="text-2xl font-bold text-amber-800">
                          {getCurrency(fromCurrencyId)?.symbol} {paypalGrossAmount.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Commission breakdown */}
                {paypalGrossAmount > 0 && (
                  <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 space-y-2">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle size={16} className="text-amber-500" />
                      <p className="text-sm font-semibold text-gray-700">Comisión PayPal</p>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Comisión porcentual (5.4%)</span>
                      <span className="text-red-600 font-medium">
                        -{getCurrency(fromCurrencyId)?.symbol}{paypalPercentageFee.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Comisión fija</span>
                      <span className="text-red-600 font-medium">
                        -{getCurrency(fromCurrencyId)?.symbol}{paypalFixedFeeDisplay.toFixed(2)}
                      </span>
                    </div>
                    <div className="border-t border-gray-200 pt-2 mt-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600 font-semibold">Total comisión</span>
                        <span className="text-red-600 font-bold">
                          -{getCurrency(fromCurrencyId)?.symbol}{paypalFeeAmount.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm mt-1">
                        <span className="text-gray-600 font-semibold">Monto neto que llega</span>
                        <span className="text-green-600 font-bold">
                          {getCurrency(fromCurrencyId)?.symbol}{paypalNetAmount.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Non-PayPal: standard amount input */
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
                      setSelectedBeneficiaries([]);
                    }}
                    className="input pl-10 text-2xl font-bold text-center"
                    placeholder="0.00"
                    min="1"
                    step="0.01"
                  />
                </div>
              </div>
            )}

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

            {/* Exchange Rate Display */}
            <div className="flex items-center justify-center gap-2 py-4">
              <RefreshCw size={16} className="text-gray-400" />
              <span className="text-sm text-gray-500">
                Tasa: 1 {getCurrency(fromCurrencyId)?.code} = {getCurrentRate().toLocaleString('es-VE')} {getCurrency(toCurrencyId)?.code}
              </span>
            </div>

            {/* Amount Received Preview */}
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-6 text-center border border-green-200">
              <p className="text-sm text-gray-600 mb-2">Monto Total a Recibir (aprox.)</p>
              <p className="text-3xl font-bold text-green-600">
                {getCurrency(toCurrencyId)?.symbol} {((isPaypalSelected ? paypalNetAmount : parseFloat(amountSent || '0')) * getCurrentRate()).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-gray-500 mt-2">{getCurrency(toCurrencyId)?.name}</p>
              {isPaypalSelected && paypalGrossAmount > 0 && (
                <p className="text-xs text-amber-600 mt-1">
                  Tasa aplicada sobre el monto neto ({getCurrency(fromCurrencyId)?.symbol}{paypalNetAmount.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
                </p>
              )}
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
                  {getCurrency(fromCurrencyId)?.symbol} {parseFloat(amountSent).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {getCurrency(fromCurrencyId)?.code}
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
              <div className={`p-3 rounded-xl border ${selectedBeneficiaries.length > 1
                ? Math.abs(remainingAmount) < 0.01
                  ? 'bg-green-50 border-green-200'
                  : remainingAmount < 0
                    ? 'bg-red-50 border-red-200'
                    : 'bg-amber-50 border-amber-200'
                : 'bg-gray-50 border-gray-200'
                }`}>
                <div className="flex justify-between items-center text-sm">
                  <span>Total a enviar:</span>
                  <span className="font-bold text-lg text-gray-900">{getCurrency(fromCurrencyId)?.symbol} {parseFloat(amountSent).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                {selectedBeneficiaries.length > 1 && (
                  <>
                    <div className="flex justify-between items-center text-sm mt-2 pt-2 border-t border-gray-200/50">
                      <span>Distribuido:</span>
                      <span className="font-bold">{getCurrency(fromCurrencyId)?.symbol} {totalAmountToBeneficiaries.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm mt-1">
                      <span>Restante:</span>
                      <span className={`font-bold ${remainingAmount < 0 ? 'text-red-600' : remainingAmount > 0.01 ? 'text-amber-600' : 'text-green-600'}`}>
                        {getCurrency(fromCurrencyId)?.symbol} {remainingAmount.toFixed(2)}
                      </span>
                    </div>
                  </>
                )}
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
                    <p className="font-bold text-gray-900 text-lg mb-3">{account.account_holder}</p>

                    <div className="bg-white/60 rounded-lg p-3 space-y-2 border border-blue-100">
                      <div className="flex flex-col sm:flex-row sm:justify-between gap-2 sm:gap-4">
                        <div className="flex-1">
                          <span className="text-xs text-gray-500 block leading-tight mb-0.5">Banco / Plataforma</span>
                          <span className="text-sm font-medium text-gray-800">{account.bank_platform?.name || account.bank?.name}</span>
                        </div>
                        <div className="flex-1">
                          <span className="text-xs text-gray-500 block leading-tight mb-0.5">Cuenta / Identificador</span>
                          <span className="text-sm font-mono text-gray-800 break-all">{account.account_number}</span>
                        </div>
                      </div>

                      {(account.document_type || account.document_number) && (
                        <div className="flex flex-col sm:flex-row sm:justify-between gap-2 sm:gap-4 pt-2 border-t border-blue-100/50">
                          <div className="flex-1">
                            <span className="text-xs text-gray-500 block leading-tight mb-0.5">Documento</span>
                            <span className="text-sm font-medium text-gray-800">
                              {(() => {
                                const type = account.document_type;
                                const num = account.document_number;
                                if (!type && !num) return '';
                                if (!type) return num;
                                if (!num) return type;
                                if (type.startsWith('CI-')) return `C.I: ${type.split('-')[1]}-${num}`;
                                if (type.startsWith('RIF-')) return `RIF: ${type.split('-')[1]}-${num}`;
                                return `${type}-${num}`;
                              })()}
                            </span>
                          </div>
                        </div>
                      )}

                      {account.email && (
                        <div className="flex flex-col sm:flex-row sm:justify-between gap-2 sm:gap-4 pt-2 border-t border-blue-100/50">
                          <div className="flex-1">
                            <span className="text-xs text-gray-500 block leading-tight mb-0.5">Correo Electrónico</span>
                            <span className="text-sm font-medium text-gray-800 truncate">{account.email}</span>
                          </div>
                        </div>
                      )}
                    </div>

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

            {/* Datos bancarios de Fengxchange */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl p-5 text-white">
              <div className="flex items-center gap-2 mb-3">
                <Building className="flex-shrink-0" size={20} />
                <h3 className="font-bold">Datos para depositar tu {getCurrency(fromCurrencyId)?.code}</h3>
              </div>
              {(() => {
                const selectedAccount = companyAccounts.find(a => a.id === selectedCompanyAccountId);
                if (selectedAccount) {
                  // Check if PayPal is selected
                  const isPaypalSelected = selectedAccount.name.toLowerCase().includes('paypal');

                  if (isPaypalSelected) {
                    // PayPal-specific UI: email input + invoice flow explanation
                    return (
                      <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm space-y-4">
                        {/* PayPal header with logo */}
                        <div className="flex items-center gap-3">
                          {COMPANY_BANK_LOGOS[selectedAccount.name] ? (
                            <div className="w-9 h-9 rounded-lg overflow-hidden bg-white flex items-center justify-center flex-shrink-0">
                              <img
                                src={COMPANY_BANK_LOGOS[selectedAccount.name]}
                                alt={selectedAccount.name}
                                className="w-full h-full object-contain"
                              />
                            </div>
                          ) : (
                            <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 bg-blue-500 text-white font-bold text-sm">
                              PP
                            </div>
                          )}
                          <div>
                            <p className="font-bold text-white">Solicitud de Pago PayPal</p>
                            <span className="text-[10px] font-medium bg-yellow-400/20 text-yellow-200 px-1.5 py-0.5 rounded-full">
                              Flujo especial
                            </span>
                          </div>
                        </div>

                        {/* Identity Verification — conditional by role */}
                        <div className="border-t border-white/20 pt-3">
                          {/* CLIENT NORMAL: "Log In with PayPal" identity verification */}
                          {!isUserAffiliate && (
                            <div className="mb-3">
                              {!paypalIdentityVerified ? (
                                <div className="space-y-2">
                                  <div className="flex items-start gap-2 mb-2">
                                    <Shield size={14} className="text-yellow-300 flex-shrink-0 mt-0.5" />
                                    <p className="text-xs text-white/70">
                                      Para tu seguridad, verifica tu identidad con PayPal antes de continuar.
                                    </p>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={verifyPaypalIdentity}
                                    disabled={verifyingPaypalIdentity}
                                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg font-semibold text-sm transition-all disabled:opacity-50 bg-[#0070ba] hover:bg-[#005ea6] text-white"
                                  >
                                    {verifyingPaypalIdentity ? (
                                      <>
                                        <Loader2 className="animate-spin" size={16} />
                                        Verificando...
                                      </>
                                    ) : (
                                      <>
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.023.143-.047.288-.077.437-.983 5.05-4.349 6.797-8.647 6.797h-2.19c-.524 0-.968.382-1.05.9l-1.12 7.106z" /></svg>
                                        Verificar con PayPal
                                      </>
                                    )}
                                  </button>
                                  {paypalIdentityError && (
                                    <div className="mt-2 p-3 bg-red-500/15 border border-red-400/30 rounded-lg">
                                      <div className="flex items-start gap-2">
                                        <XCircle size={14} className="text-red-400 flex-shrink-0 mt-0.5" />
                                        <p className="text-xs text-red-300">{paypalIdentityError}</p>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div className="flex items-center gap-2 p-3 bg-green-500/15 border border-green-400/30 rounded-lg mb-3">
                                  <CheckCircle2 size={16} className="text-green-400 flex-shrink-0" />
                                  <div>
                                    <p className="text-xs text-green-300 font-semibold">Identidad verificada</p>
                                    <p className="text-[10px] text-green-300/70">{paypalVerifiedName}</p>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          {/* AFFILIATE: 2FA check */}
                          {isUserAffiliate && !userHas2FA && (
                            <div className="bg-amber-500/15 border border-amber-400/30 rounded-lg p-3 mb-3 flex items-start gap-2">
                              <AlertCircle size={16} className="text-amber-400 flex-shrink-0 mt-0.5" />
                              <div>
                                <p className="text-xs text-amber-300 font-semibold">2FA requerido</p>
                                <p className="text-[10px] text-amber-200/70 mt-0.5">
                                  Como afiliado, debes activar la autenticación de 2 factores en tu{' '}
                                  <a href="/app/perfil" className="underline text-amber-200 hover:text-white">perfil</a>{' '}
                                  antes de enviar solicitudes de pago.
                                </p>
                              </div>
                            </div>
                          )}

                          {/* PayPal email input */}
                          <label className="text-xs text-white/60 mb-1.5 block">Tu correo de PayPal *</label>
                          <div className="relative">
                            <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
                            <input
                              type="email"
                              value={paypalEmail}
                              onChange={(e) => !paypalIdentityVerified && setPaypalEmail(e.target.value)}
                              placeholder="tu-email@ejemplo.com"
                              disabled={!isUserAffiliate && !paypalIdentityVerified}
                              readOnly={!isUserAffiliate && paypalIdentityVerified}
                              className={`w-full pl-9 pr-3 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/30 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400/50 focus:border-yellow-400/50 transition-all disabled:opacity-40 ${!isUserAffiliate && paypalIdentityVerified ? 'cursor-not-allowed opacity-70' : ''}`}
                            />
                          </div>
                          {paypalEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(paypalEmail) && (
                            <p className="text-xs text-red-300 mt-1">Ingresa un correo electrónico válido</p>
                          )}

                          {/* Request PayPal Invoice Button */}
                          {!paypalInvoiceSent ? (
                            <button
                              type="button"
                              onClick={async () => {
                                if (!paypalEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(paypalEmail)) return;

                                // Affiliate: require 2FA verification
                                if (isUserAffiliate && userHas2FA) {
                                  setShow2FAModal(true);
                                  return;
                                }

                                // Client normal: must have verified PayPal identity
                                if (!isUserAffiliate && !paypalIdentityVerified) return;

                                setSendingPaypalInvoice(true);
                                setPaypalInvoiceError(null);
                                try {
                                  const totalAmount = selectedBeneficiaries.reduce((sum, b) => sum + b.amountToSend, 0);
                                  const res = await fetch('/api/paypal/create-invoice', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({
                                      recipientEmail: paypalEmail,
                                      amount: totalAmount.toFixed(2),
                                      currencyCode: getCurrency(fromCurrencyId)?.code || 'USD',
                                      transactionNumber: `REQ-${Date.now()}`,
                                    }),
                                  });
                                  const data = await res.json();
                                  if (!res.ok) throw new Error(data.error || 'Error al enviar solicitud');
                                  setPaypalInvoiceId(data.invoiceId);
                                  setPaypalInvoiceSent(true);
                                } catch (err) {
                                  console.error('PayPal invoice error:', err);
                                  setPaypalInvoiceError(err instanceof Error ? err.message : 'Error al enviar la solicitud de pago');
                                } finally {
                                  setSendingPaypalInvoice(false);
                                }
                              }}
                              disabled={
                                sendingPaypalInvoice ||
                                !paypalEmail ||
                                !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(paypalEmail) ||
                                (!isUserAffiliate && !paypalIdentityVerified) ||
                                (isUserAffiliate && !userHas2FA)
                              }
                              className="mt-3 w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg font-semibold text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed bg-yellow-500 hover:bg-yellow-400 text-gray-900"
                            >
                              {sendingPaypalInvoice ? (
                                <>
                                  <Loader2 className="animate-spin" size={16} />
                                  Enviando solicitud...
                                </>
                              ) : (
                                <>
                                  <Mail size={16} />
                                  Solicitar pago
                                </>
                              )}
                            </button>
                          ) : paypalPaymentConfirmed ? (
                            <div className="mt-3 flex items-center gap-2 py-2.5 px-4 rounded-lg bg-green-500/20 border border-green-400/30">
                              <CheckCircle size={16} className="text-green-400 flex-shrink-0" />
                              <p className="text-xs text-green-300">
                                <strong className="text-green-200">¡Pago confirmado!</strong> Tu pago ha sido verificado por PayPal.
                              </p>
                            </div>
                          ) : (
                            <div className="mt-3 space-y-2">
                              <div className="flex items-center gap-2 py-2.5 px-4 rounded-lg bg-blue-500/20 border border-blue-400/30">
                                <Loader2 size={16} className="text-blue-400 flex-shrink-0 animate-spin" />
                                <p className="text-xs text-blue-300">
                                  Solicitud enviada a <strong className="text-blue-200">{paypalEmail}</strong>. Esperando confirmación de pago...
                                </p>
                              </div>
                              <p className="text-[10px] text-white/40 text-center">Verificando automáticamente cada 10 segundos</p>
                            </div>
                          )}

                          {/* Error message */}
                          {paypalInvoiceError && (
                            <div className="mt-2 flex items-center gap-2 py-2 px-3 rounded-lg bg-red-500/20 border border-red-400/30">
                              <AlertTriangle size={14} className="text-red-400 flex-shrink-0" />
                              <p className="text-xs text-red-300">{paypalInvoiceError}</p>
                            </div>
                          )}
                        </div>

                        {/* Steps explanation */}
                        <div className="border-t border-white/20 pt-3">
                          <p className="text-xs font-semibold text-white/70 mb-2">Proceso:</p>
                          <div className="space-y-2">
                            <div className="flex items-start gap-2">
                              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${paypalInvoiceSent ? 'bg-green-400/30 text-green-300' : 'bg-yellow-400/20 text-yellow-300'}`}>1</span>
                              <p className={`text-xs ${paypalInvoiceSent ? 'text-green-300/60 line-through' : 'text-white/60'}`}>Recibirás una solicitud de pago en tu correo de PayPal</p>
                            </div>
                            <div className="flex items-start gap-2">
                              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${paypalPaymentConfirmed ? 'bg-green-400/30 text-green-300' : checkingPaypalPayment ? 'bg-blue-400/20 text-blue-300' : 'bg-yellow-400/20 text-yellow-300'}`}>2</span>
                              <p className={`text-xs ${paypalPaymentConfirmed ? 'text-green-300/60 line-through' : 'text-white/60'}`}>Paga la solicitud desde tu cuenta PayPal</p>
                            </div>
                            <div className="flex items-start gap-2">
                              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${paypalPaymentConfirmed ? 'bg-green-400/30 text-green-300' : 'bg-yellow-400/20 text-yellow-300'}`}>3</span>
                              <p className={`text-xs ${paypalPaymentConfirmed ? 'text-green-300/60 line-through' : 'text-white/60'}`}>Tu pago será verificado automáticamente</p>
                            </div>
                          </div>
                        </div>

                        {/* Warning */}
                        <div className="border-t border-orange-500/30 pt-3 flex items-start gap-2">
                          <AlertTriangle size={14} className="text-orange-400 flex-shrink-0 mt-0.5" />
                          <p className="text-xs text-orange-300/80">
                            {paypalInvoiceSent && !paypalPaymentConfirmed
                              ? 'No cierres esta ventana mientras se verifica tu pago.'
                              : 'Revisa tu bandeja de entrada y spam después de solicitar el pago.'}
                          </p>
                        </div>
                      </div>
                    );
                  }

                  // Standard bank/platform UI (non-PayPal)
                  return (
                    <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm space-y-3">
                      {/* Bank/Platform name with logo */}
                      <div className="flex items-center gap-3">
                        {COMPANY_BANK_LOGOS[selectedAccount.name] ? (
                          <div className="w-9 h-9 rounded-lg overflow-hidden bg-white flex items-center justify-center flex-shrink-0">
                            <img
                              src={COMPANY_BANK_LOGOS[selectedAccount.name]}
                              alt={selectedAccount.name}
                              className="w-full h-full object-contain"
                            />
                          </div>
                        ) : (
                          <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${selectedAccount.type === 'BANK' ? 'bg-white/20' : 'bg-white/20'} text-white font-bold text-sm`}>
                            {selectedAccount.name.substring(0, 2).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <p className="font-bold text-white">{selectedAccount.name}</p>
                          <span className="text-[10px] font-medium bg-white/20 px-1.5 py-0.5 rounded-full">
                            {selectedAccount.type === 'BANK' ? 'Banco' : 'Plataforma'}
                          </span>
                        </div>
                      </div>

                      {/* Account holder */}
                      <div className="border-t border-white/20 pt-3">
                        <p className="text-xs text-white/60 mb-0.5">Titular</p>
                        <p className="font-semibold text-white">{selectedAccount.account_holder}</p>
                      </div>

                      {/* Account number with copy button */}
                      <div className="border-t border-white/20 pt-3">
                        <p className="text-xs text-white/60 mb-0.5">Cuenta / Identificador</p>
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-mono font-semibold text-white break-all">{selectedAccount.account_number}</p>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(selectedAccount.account_number, 'account')}
                            className="flex-shrink-0 p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                            title="Copiar"
                          >
                            {copiedField === 'account' ? (
                              <CheckCircle className="text-green-300" size={16} />
                            ) : (
                              <Copy className="text-white/70" size={16} />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Bank code if exists */}
                      {selectedAccount.bank_code && (
                        <div className="border-t border-white/20 pt-3">
                          <p className="text-xs text-white/60 mb-0.5">Código del Banco</p>
                          <div className="flex items-center justify-between gap-2">
                            <p className="font-mono font-semibold text-white">{selectedAccount.bank_code}</p>
                            <button
                              type="button"
                              onClick={() => copyToClipboard(selectedAccount.bank_code!, 'bankcode')}
                              className="flex-shrink-0 p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                              title="Copiar"
                            >
                              {copiedField === 'bankcode' ? (
                                <CheckCircle className="text-green-300" size={16} />
                              ) : (
                                <Copy className="text-white/70" size={16} />
                              )}
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Reminder / Warning */}
                      {selectedAccount.name.toLowerCase().includes('zelle') ? (
                        <div className="border-t border-orange-500/40 pt-3 flex items-start gap-2">
                          <AlertTriangle size={16} className="text-orange-500 flex-shrink-0 mt-0.5" />
                          <p className="text-xs font-semibold text-orange-300">
                            NO COLOCAR NADA EN EL CAMPO DE &quot;CONCEPTO&quot;. DEBE DEJAR ESE ESPACIO EN BLANCO, DE LO CONTRARIO SU TRANSACCIÓN PUEDE SER REVERSADA.
                          </p>
                        </div>
                      ) : (
                        <div className="border-t border-white/20 pt-3 flex items-start gap-2">
                          <Info size={14} className="text-white/50 flex-shrink-0 mt-0.5" />
                          <p className="text-xs text-white/60">
                            Realiza tu depósito a esta cuenta y luego sube el comprobante de pago más abajo.
                          </p>
                        </div>
                      )}
                    </div>
                  );
                }

                // No account selected or no accounts available
                return (
                  <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
                    <div className="flex items-center justify-center gap-2 text-white/80">
                      <Info size={18} />
                      <p className="text-sm">
                        {companyAccountsForCurrency.length === 0
                          ? 'No hay cuentas disponibles para esta moneda. Contacta a soporte para obtener los datos de depósito.'
                          : 'Selecciona un banco o plataforma en el paso anterior para ver los datos de depósito.'
                        }
                      </p>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Proof Upload - Only for non-PayPal flows */}
            {!(() => {
              const selectedAccount = companyAccounts.find(a => a.id === selectedCompanyAccountId);
              return selectedAccount?.name.toLowerCase().includes('paypal');
            })() && (
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
              )}

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
              disabled={submitting || (() => {
                const pa = companyAccounts.find(a => a.id === selectedCompanyAccountId);
                const isPaypal = pa?.name.toLowerCase().includes('paypal');
                if (isPaypal) {
                  return !paypalPaymentConfirmed;
                }
                return proofFiles.length === 0;
              })()}
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

      {/* PayPal Payment Confirmed Modal */}
      {showPaypalConfirmModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 text-center animate-in fade-in zoom-in-95 duration-300">
            {/* Animated check icon */}
            <div className="mx-auto w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mb-5">
              <CheckCircle size={48} className="text-green-500" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              ¡Pago confirmado exitosamente!
            </h3>
            <p className="text-sm text-gray-500 mb-6">
              Tu pago ha sido verificado por PayPal. Haz clic en el botón para crear tu operación.
            </p>
            <button
              onClick={() => {
                setShowPaypalConfirmModal(false);
                handleSubmit();
              }}
              className="w-full py-3 px-6 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-xl transition-colors shadow-lg shadow-green-500/25"
            >
              Aceptar
            </button>
          </div>
        </div>
      )}

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
      {/* 2FA Verification Modal for Affiliates */}
      {show2FAModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <Shield size={24} className="text-purple-600" />
              <h3 className="text-lg font-bold text-gray-900">Verificación 2FA</h3>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Ingresa el código de tu aplicación de autenticación para confirmar la solicitud de pago.
            </p>
            <input
              type="text"
              value={twoFACode}
              onChange={(e) => setTwoFACode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              className="w-full text-center text-2xl font-mono tracking-[0.5em] px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none transition-colors"
              maxLength={6}
              autoFocus
            />
            {twoFAError && (
              <p className="text-xs text-red-500 mt-2 text-center">{twoFAError}</p>
            )}
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => { setShow2FAModal(false); setTwoFACode(''); setTwoFAError(null); }}
                className="flex-1 py-2.5 px-4 rounded-xl border border-gray-200 text-gray-700 font-medium text-sm hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={async () => {
                  const valid = await verify2FACode();
                  if (valid) {
                    // Proceed to send invoice
                    setSendingPaypalInvoice(true);
                    setPaypalInvoiceError(null);
                    try {
                      const totalAmount = selectedBeneficiaries.reduce((sum, b) => sum + b.amountToSend, 0);
                      const res = await fetch('/api/paypal/create-invoice', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          recipientEmail: paypalEmail,
                          amount: totalAmount.toFixed(2),
                          currencyCode: getCurrency(fromCurrencyId)?.code || 'USD',
                          transactionNumber: `REQ-${Date.now()}`,
                        }),
                      });
                      const data = await res.json();
                      if (!res.ok) throw new Error(data.error || 'Error al enviar solicitud');
                      setPaypalInvoiceId(data.invoiceId);
                      setPaypalInvoiceSent(true);
                    } catch (err) {
                      console.error('PayPal invoice error:', err);
                      setPaypalInvoiceError(err instanceof Error ? err.message : 'Error al enviar la solicitud de pago');
                    } finally {
                      setSendingPaypalInvoice(false);
                    }
                  }
                }}
                disabled={verifying2FA || twoFACode.length !== 6}
                className="flex-1 py-2.5 px-4 rounded-xl bg-purple-600 text-white font-medium text-sm hover:bg-purple-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {verifying2FA ? (
                  <>
                    <Loader2 className="animate-spin" size={16} />
                    Verificando...
                  </>
                ) : (
                  'Confirmar'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
