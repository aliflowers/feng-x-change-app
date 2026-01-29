'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import {
  Building2,
  RefreshCw,
  Search,
  Filter,
  Plus,
  Edit2,
  Trash2,
  X,
  Save,
  Loader2,
  Check,
  DollarSign,
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

interface BankPlatform {
  id: number;
  name: string;
  type: 'BANK' | 'PLATFORM';
  currency_id: number;
  account_number: string;
  account_holder: string;
  current_balance: number;
  is_active: boolean;
  bank_code: string | null;
  created_at: string;
  updated_at: string;
  currency?: {
    id: number;
    code: string;
    symbol: string;
    name: string;
  };
}

interface Currency {
  id: number;
  code: string;
  symbol: string;
  name: string;
}

// Payment methods by currency code
const PAYMENT_METHODS_BY_CURRENCY: Record<string, { value: string; label: string; accountLabel: string; placeholder: string }[]> = {
  // Venezuela
  VES: [
    { value: 'TRANSFER', label: 'Transferencia Bancaria', accountLabel: 'Número de Cuenta', placeholder: '0102-1234-5678-9012-3456' },
    { value: 'PAGO_MOVIL', label: 'Pago Móvil', accountLabel: 'Número de Teléfono', placeholder: '0412-1234567' },
  ],
  // Colombia
  COP: [
    { value: 'TRANSFER', label: 'Transferencia Bancaria', accountLabel: 'Número de Cuenta', placeholder: '1234567890' },
    { value: 'NEQUI', label: 'Nequi', accountLabel: 'Número de Teléfono', placeholder: '3001234567' },
    { value: 'DAVIPLATA', label: 'Daviplata', accountLabel: 'Número de Teléfono', placeholder: '3001234567' },
  ],
  // Estados Unidos
  USD: [
    { value: 'TRANSFER', label: 'Transferencia Bancaria (ACH)', accountLabel: 'Número de Cuenta', placeholder: '1234567890' },
    { value: 'ZELLE', label: 'Zelle (Email)', accountLabel: 'Correo Electrónico', placeholder: 'correo@ejemplo.com' },
    { value: 'ZELLE_PHONE', label: 'Zelle (Teléfono)', accountLabel: 'Número de Teléfono', placeholder: '+1 234 567 8901' },
    { value: 'WIRE', label: 'Wire Transfer', accountLabel: 'Número de Cuenta', placeholder: '1234567890' },
  ],
  // Perú
  PEN: [
    { value: 'TRANSFER', label: 'Transferencia Bancaria', accountLabel: 'Número de Cuenta', placeholder: '1234567890123456' },
    { value: 'YAPE', label: 'Yape', accountLabel: 'Número de Teléfono', placeholder: '912345678' },
    { value: 'PLIN', label: 'Plin', accountLabel: 'Número de Teléfono', placeholder: '912345678' },
  ],
  // Chile
  CLP: [
    { value: 'TRANSFER', label: 'Transferencia Bancaria', accountLabel: 'Número de Cuenta', placeholder: '1234567890' },
  ],
  // Argentina
  ARS: [
    { value: 'TRANSFER', label: 'Transferencia Bancaria', accountLabel: 'CBU/CVU', placeholder: '0000000000000000000000' },
    { value: 'MERCADOPAGO', label: 'Mercado Pago', accountLabel: 'Alias/CVU', placeholder: 'alias.mp o CVU' },
  ],
  // México
  MXN: [
    { value: 'TRANSFER', label: 'Transferencia Bancaria', accountLabel: 'CLABE', placeholder: '123456789012345678' },
  ],
  // Panamá
  PAB: [
    { value: 'TRANSFER', label: 'Transferencia Bancaria', accountLabel: 'Número de Cuenta', placeholder: '1234567890' },
  ],
  // Euro
  EUR: [
    { value: 'TRANSFER', label: 'Transferencia SEPA', accountLabel: 'IBAN', placeholder: 'ES12 1234 5678 9012 3456 7890' },
  ],
};

// Platform payment methods (always use email)
const PLATFORM_PAYMENT_METHODS = [
  { value: 'EMAIL', label: 'Correo Electrónico', accountLabel: 'Correo Electrónico', placeholder: 'correo@ejemplo.com' },
  { value: 'USERNAME', label: 'Usuario', accountLabel: 'Nombre de Usuario', placeholder: '@usuario' },
  { value: 'PHONE', label: 'Teléfono', accountLabel: 'Número de Teléfono', placeholder: '+1 234 567 8901' },
];

const ITEMS_PER_PAGE = 20;

// Mapeo de nombres de banco/plataforma a sus logos
// Los nombres deben coincidir con el campo 'name' en la tabla banks_platforms
const BANK_LOGOS: Record<string, string> = {
  // Venezuela
  'Banco de Venezuela': '/flags/bdv.png',
  'BDV': '/flags/bdv.png',
  'Banesco': '/flags/banesco-768x256.jpg',
  'Mercantil': '/flags/banco-mercantil.jpg',
  'Banco Mercantil': '/flags/banco-mercantil.jpg',
  'BNC': '/flags/bnc.png',
  'Banco Nacional de Crédito': '/flags/bnc.png',
  // Perú
  'BCP': '/flags/BCP-Peru.svg',
  'BCP (Banco de Crédito del Perú)': '/flags/BCP-Peru.svg',
  'Banco de Crédito del Perú': '/flags/BCP-Peru.svg',
  'Interbank': '/flags/Interbank.jpeg',
  'Yape': '/flags/Yape.svg',
  'Plin': '/flags/Plin.png',
  'Scotiabank': '/flags/scotiabank.svg',
  'Scotiabank Perú': '/flags/scotiabank.svg',
  // Colombia
  'Bancolombia': '/flags/bancolombia.svg',
  'Nequi': '/flags/Nequi.jpeg',
  // Chile
  'Banco Estado': '/flags/Banco-estado-chile.svg',
  'BancoEstado': '/flags/Banco-estado-chile.svg',
  // Internacional
  'Zelle': '/flags/Zelle.svg',
  'PayPal': '/flags/PayPal.svg',
  'Zinli': '/flags/Zinli.jpg',
  'Binance': '/flags/Binance.jpeg',
  'Binance Pay': '/flags/Binance.jpeg',
  'USDT': '/flags/usdt.svg',
};

// Componente para mostrar el logo del banco o fallback a iniciales
const BankLogo = ({ name, type }: { name: string; type: 'BANK' | 'PLATFORM' }) => {
  const logoPath = BANK_LOGOS[name];

  if (logoPath) {
    return (
      <div className="w-10 h-10 rounded-lg overflow-hidden bg-white border border-slate-200 flex items-center justify-center">
        <img
          src={logoPath}
          alt={name}
          className="w-full h-full object-contain"
          onError={(e) => {
            // Si falla la carga, mostrar iniciales
            const target = e.target as HTMLImageElement;
            target.style.display = 'none';
            target.parentElement!.innerHTML = `<span class="text-white font-bold">${name.substring(0, 2).toUpperCase()}</span>`;
            target.parentElement!.className = `w-10 h-10 rounded-lg flex items-center justify-center ${type === 'BANK' ? 'bg-gradient-to-br from-blue-500 to-indigo-600' : 'bg-gradient-to-br from-purple-500 to-pink-600'}`;
          }}
        />
      </div>
    );
  }

  // Fallback a iniciales
  return (
    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${type === 'BANK'
      ? 'bg-gradient-to-br from-blue-500 to-indigo-600'
      : 'bg-gradient-to-br from-purple-500 to-pink-600'
      } text-white font-bold`}>
      {name.substring(0, 2).toUpperCase()}
    </div>
  );
};

// Funciones para formatear números con separador de miles (.) y decimales (,)
const formatNumberInput = (value: string): string => {
  // Remover todo excepto números y coma
  let cleaned = value.replace(/[^\d,]/g, '');

  // Asegurar solo una coma
  const parts = cleaned.split(',');
  if (parts.length > 2) {
    cleaned = parts[0] + ',' + parts.slice(1).join('');
  }

  // Separar parte entera y decimal
  const [intPart, decPart] = cleaned.split(',');

  // Formatear parte entera con puntos de miles
  const formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');

  // Limitar decimales a 2
  const formattedDec = decPart ? decPart.slice(0, 2) : '';

  return formattedDec !== undefined && cleaned.includes(',')
    ? `${formattedInt},${formattedDec}`
    : formattedInt;
};

const parseFormattedNumber = (formatted: string): string => {
  // Convertir de formato 1.000.000,00 a 1000000.00
  if (!formatted || formatted.trim() === '') return '';
  const cleaned = formatted.replace(/\./g, '').replace(',', '.');
  return cleaned;
};

const displayFormattedNumber = (value: string): string => {
  // Convertir de 1000000.00 a 1.000.000,00 para mostrar
  const num = parseFloat(value) || 0;
  return num.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export default function BancosPage() {
  const [banks, setBanks] = useState<BankPlatform[]>([]);
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  // Filters
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [currencyFilter, setCurrencyFilter] = useState('');
  const [activeFilter, setActiveFilter] = useState('');

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editingBank, setEditingBank] = useState<BankPlatform | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Selection states
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  // Form data
  const [formData, setFormData] = useState({
    name: '',
    type: 'BANK' as 'BANK' | 'PLATFORM',
    currency_id: '',
    payment_method: 'TRANSFER',
    account_number: '',
    account_holder: '',
    current_balance: '',
    bank_code: '',
    is_active: true
  });

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    loadBanks();
  }, [currentPage, searchQuery, typeFilter, currencyFilter, activeFilter]);

  const loadInitialData = async () => {
    try {
      // Load currencies
      const { data: currenciesData } = await supabase
        .from('currencies')
        .select('id, code, symbol, name')
        .order('code');

      if (currenciesData) setCurrencies(currenciesData);

      await loadBanks();
    } catch (error) {
      console.error('Error loading initial data:', error);
    }
  };

  const loadBanks = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('banks_platforms')
        .select(`
          id,
          name,
          type,
          currency_id,
          account_number,
          account_holder,
          current_balance,
          is_active,
          bank_code,
          created_at,
          updated_at,
          currency:currencies(id, code, symbol, name)
        `, { count: 'exact' });

      // Apply filters
      if (typeFilter) {
        query = query.eq('type', typeFilter);
      }

      if (currencyFilter) {
        query = query.eq('currency_id', parseInt(currencyFilter));
      }

      if (activeFilter === 'active') {
        query = query.eq('is_active', true);
      } else if (activeFilter === 'inactive') {
        query = query.eq('is_active', false);
      }

      // Pagination
      const from = (currentPage - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;

      query = query
        .order('name')
        .range(from, to);

      const { data, count, error } = await query;

      if (error) throw error;

      // Transform data
      let transformed = (data || []).map(bank => ({
        ...bank,
        currency: Array.isArray(bank.currency) ? bank.currency[0] : bank.currency,
      }));

      // Client-side search filter
      if (searchQuery.trim()) {
        const search = searchQuery.toLowerCase();
        transformed = transformed.filter(b =>
          b.name?.toLowerCase().includes(search) ||
          b.account_number?.toLowerCase().includes(search) ||
          b.account_holder?.toLowerCase().includes(search) ||
          b.bank_code?.toLowerCase().includes(search)
        );
      }

      setBanks(transformed as BankPlatform[]);
      setTotalCount(count || 0);
    } catch (error) {
      console.error('Error loading banks:', error);
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchQuery, typeFilter, currencyFilter, activeFilter]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadBanks();
    setRefreshing(false);
  };

  const clearFilters = () => {
    setSearchQuery('');
    setTypeFilter('');
    setCurrencyFilter('');
    setActiveFilter('');
    setCurrentPage(1);
  };

  const hasActiveFilters = searchQuery || typeFilter || currencyFilter || activeFilter;

  const openCreateModal = () => {
    setEditingBank(null);
    setFormData({
      name: '',
      type: 'BANK',
      currency_id: '',
      payment_method: 'TRANSFER',
      account_number: '',
      account_holder: '',
      current_balance: '',
      bank_code: '',
      is_active: true
    });
    setMessage(null);
    setShowModal(true);
  };

  const openEditModal = (bank: BankPlatform) => {
    setEditingBank(bank);
    // Try to detect payment method from account format
    let detectedMethod = 'TRANSFER';
    if (bank.type === 'PLATFORM') {
      detectedMethod = 'EMAIL';
    } else if (bank.account_number.includes('@')) {
      detectedMethod = 'ZELLE';
    } else if (bank.account_number.startsWith('04') && bank.currency?.code === 'VES') {
      detectedMethod = 'PAGO_MOVIL';
    }
    setFormData({
      name: bank.name,
      type: bank.type,
      currency_id: bank.currency_id.toString(),
      payment_method: detectedMethod,
      account_number: bank.account_number,
      account_holder: bank.account_holder,
      current_balance: bank.current_balance.toString(),
      bank_code: bank.bank_code || '',
      is_active: bank.is_active
    });
    setMessage(null);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const bankData = {
        name: formData.name,
        type: formData.type,
        currency_id: parseInt(formData.currency_id),
        account_number: formData.account_number,
        account_holder: formData.account_holder,
        current_balance: parseFloat(formData.current_balance) || 0,
        bank_code: formData.bank_code || null,
        is_active: formData.is_active,
        updated_at: new Date().toISOString()
      };

      if (editingBank) {
        // Update
        const { error } = await supabase
          .from('banks_platforms')
          .update(bankData)
          .eq('id', editingBank.id);

        if (error) throw error;
        setMessage({ type: 'success', text: '¡Banco/Plataforma actualizado correctamente!' });
      } else {
        // Create
        const { error } = await supabase
          .from('banks_platforms')
          .insert(bankData);

        if (error) throw error;
        setMessage({ type: 'success', text: '¡Banco/Plataforma creado correctamente!' });
      }

      await loadBanks();
      setTimeout(() => setShowModal(false), 1500);
    } catch (error) {
      console.error('Error saving bank:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error al guardar';
      setMessage({ type: 'error', text: errorMessage });
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (bank: BankPlatform) => {
    try {
      const { error } = await supabase
        .from('banks_platforms')
        .update({ is_active: !bank.is_active, updated_at: new Date().toISOString() })
        .eq('id', bank.id);

      if (error) throw error;
      await loadBanks();
    } catch (error) {
      console.error('Error toggling active:', error);
    }
  };

  // Selection functions
  const toggleSelection = (id: number) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === banks.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(banks.map(b => b.id)));
    }
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) return;

    setDeleting(true);
    try {
      const { error } = await supabase
        .from('banks_platforms')
        .delete()
        .in('id', Array.from(selectedIds));

      if (error) throw error;

      setShowDeleteModal(false);
      clearSelection();
      await loadBanks();
    } catch (error) {
      console.error('Error deleting banks:', error);
    } finally {
      setDeleting(false);
    }
  };

  const formatCurrency = (amount: number, symbol?: string) => {
    return `${symbol || ''} ${amount.toLocaleString('es-VE', { minimumFractionDigits: 2 })}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Building2 className="text-blue-600" size={28} />
            Bancos y Plataformas
          </h1>
          <p className="text-slate-500 mt-1">
            Cuentas bancarias y plataformas de la empresa ({totalCount} registros)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-2 rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all shadow-md"
          >
            <Plus size={18} />
            Nuevo
          </button>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${showFilters || hasActiveFilters
              ? 'bg-blue-600 text-white'
              : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
              }`}
          >
            <Filter size={18} />
            Filtros
            {hasActiveFilters && (
              <span className="bg-white text-blue-600 text-xs px-2 py-0.5 rounded-full font-bold">
                {[searchQuery, typeFilter, currencyFilter, activeFilter].filter(Boolean).length}
              </span>
            )}
          </button>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 bg-white text-slate-700 px-4 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={18} className={refreshing ? 'animate-spin' : ''} />
            Actualizar
          </button>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-800 flex items-center gap-2">
              <Filter size={18} className="text-blue-600" />
              Filtros
            </h3>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="text-sm text-red-600 hover:text-red-800 flex items-center gap-1"
              >
                <X size={14} />
                Limpiar filtros
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">
                <Search size={14} className="inline mr-1" />
                Buscar
              </label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                placeholder="Nombre, cuenta, titular..."
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Type Filter */}
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">
                <Building2 size={14} className="inline mr-1" />
                Tipo
              </label>
              <select
                value={typeFilter}
                onChange={(e) => { setTypeFilter(e.target.value); setCurrentPage(1); }}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Todos</option>
                <option value="BANK">Banco</option>
                <option value="PLATFORM">Plataforma</option>
              </select>
            </div>

            {/* Currency Filter */}
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">
                <DollarSign size={14} className="inline mr-1" />
                Moneda
              </label>
              <select
                value={currencyFilter}
                onChange={(e) => { setCurrencyFilter(e.target.value); setCurrentPage(1); }}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Todas</option>
                {currencies.map(c => (
                  <option key={c.id} value={c.id}>{c.code} - {c.name}</option>
                ))}
              </select>
            </div>

            {/* Active Filter */}
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">
                <Check size={14} className="inline mr-1" />
                Estado
              </label>
              <select
                value={activeFilter}
                onChange={(e) => { setActiveFilter(e.target.value); setCurrentPage(1); }}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Todos</option>
                <option value="active">Activos</option>
                <option value="inactive">Inactivos</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Selection Action Bar */}
      {selectedIds.size > 0 && (
        <div className="bg-gradient-to-r from-red-500 to-rose-600 rounded-xl p-4 shadow-lg flex items-center justify-between">
          <div className="flex items-center gap-3 text-white">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
              <Check size={20} />
            </div>
            <div>
              <p className="font-bold">{selectedIds.size} {selectedIds.size === 1 ? 'cuenta seleccionada' : 'cuentas seleccionadas'}</p>
              <p className="text-sm text-white/80">Selecciona más cuentas o elimina las seleccionadas</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={clearSelection}
              className="px-4 py-2 bg-white/20 text-white rounded-lg hover:bg-white/30 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={() => setShowDeleteModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-white text-red-600 rounded-lg hover:bg-red-50 transition-colors font-semibold"
            >
              <Trash2 size={18} />
              Eliminar seleccionadas
            </button>
          </div>
        </div>
      )}

      {/* Banks Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="animate-spin text-blue-600" size={32} />
            <span className="ml-3 text-slate-600">Cargando bancos...</span>
          </div>
        ) : banks.length === 0 ? (
          <div className="text-center py-20">
            <Building2 className="mx-auto text-slate-300 mb-4" size={48} />
            <p className="text-slate-500">No se encontraron bancos/plataformas</p>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="mt-4 text-blue-600 hover:text-blue-800 text-sm"
              >
                Limpiar filtros
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-center">
                    <input
                      type="checkbox"
                      checked={banks.length > 0 && selectedIds.size === banks.length}
                      onChange={toggleSelectAll}
                      className="w-4 h-4 text-blue-600 bg-slate-100 border-slate-300 rounded focus:ring-blue-500 cursor-pointer"
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Banco/Plataforma
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Tipo
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Cuenta
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Titular
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Moneda
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Saldo
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {banks.map((bank) => (
                  <tr key={bank.id} className={`hover:bg-slate-50 transition-colors ${selectedIds.has(bank.id) ? 'bg-blue-50' : ''}`}>
                    <td className="px-4 py-3 text-center">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(bank.id)}
                        onChange={() => toggleSelection(bank.id)}
                        className="w-4 h-4 text-blue-600 bg-slate-100 border-slate-300 rounded focus:ring-blue-500 cursor-pointer"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <BankLogo name={bank.name} type={bank.type} />
                        <div>
                          <p className="font-medium text-slate-800">{bank.name}</p>
                          {bank.bank_code && (
                            <p className="text-xs text-slate-500 font-mono">{bank.bank_code}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${bank.type === 'BANK'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-purple-100 text-purple-700'
                        }`}>
                        {bank.type === 'BANK' ? 'Banco' : 'Plataforma'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-mono text-sm text-slate-700">{bank.account_number}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-slate-700">{bank.account_holder}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                        {bank.currency?.code || 'N/A'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <p className={`font-bold ${bank.current_balance > 0 ? 'text-green-600' : 'text-slate-600'}`}>
                        {formatCurrency(bank.current_balance, bank.currency?.symbol)}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => toggleActive(bank)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${bank.is_active ? 'bg-green-500' : 'bg-slate-300'
                          }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${bank.is_active ? 'translate-x-6' : 'translate-x-1'
                            }`}
                        />
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => openEditModal(bank)}
                          className="p-2 hover:bg-blue-50 rounded-lg transition-colors text-blue-600"
                          title="Editar"
                        >
                          <Edit2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="bg-slate-50 border-t border-slate-200 px-4 py-3 flex items-center justify-between">
            <div className="text-sm text-slate-600">
              Mostrando {((currentPage - 1) * ITEMS_PER_PAGE) + 1} - {Math.min(currentPage * ITEMS_PER_PAGE, totalCount)} de {totalCount}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-lg border border-slate-200 hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={18} />
              </button>
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let page;
                  if (totalPages <= 5) {
                    page = i + 1;
                  } else if (currentPage <= 3) {
                    page = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    page = totalPages - 4 + i;
                  } else {
                    page = currentPage - 2 + i;
                  }
                  return (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${currentPage === page
                        ? 'bg-blue-600 text-white'
                        : 'hover:bg-white border border-slate-200'
                        }`}
                    >
                      {page}
                    </button>
                  );
                })}
              </div>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-2 rounded-lg border border-slate-200 hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowModal(false)}
          />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b border-slate-200 p-4 flex items-center justify-between z-10">
              <h2 className="text-lg font-bold text-slate-800">
                {editingBank ? 'Editar Banco/Plataforma' : 'Nuevo Banco/Plataforma'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X size={20} className="text-slate-500" />
              </button>
            </div>

            {/* Modal Content */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Nombre *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Banco de Venezuela"
                  required
                />
              </div>

              {/* Type */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Tipo *
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => {
                    const newType = e.target.value as 'BANK' | 'PLATFORM';
                    setFormData({
                      ...formData,
                      type: newType,
                      payment_method: newType === 'PLATFORM' ? 'EMAIL' : 'TRANSFER'
                    });
                  }}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="BANK">Banco</option>
                  <option value="PLATFORM">Plataforma</option>
                </select>
              </div>

              {/* Currency */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Moneda *
                </label>
                <select
                  value={formData.currency_id}
                  onChange={(e) => {
                    const newCurrencyId = e.target.value;
                    const currency = currencies.find(c => c.id.toString() === newCurrencyId);
                    const methods = currency ? PAYMENT_METHODS_BY_CURRENCY[currency.code] : null;
                    // Reset payment method when currency changes
                    setFormData({
                      ...formData,
                      currency_id: newCurrencyId,
                      payment_method: methods?.[0]?.value || 'TRANSFER'
                    });
                  }}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="">Seleccionar moneda</option>
                  {currencies.map(c => (
                    <option key={c.id} value={c.id}>{c.code} - {c.name}</option>
                  ))}
                </select>
              </div>

              {/* Payment Method - Only for BANK type with multiple methods */}
              {formData.type === 'BANK' && formData.currency_id && (() => {
                const currency = currencies.find(c => c.id.toString() === formData.currency_id);
                const methods = currency ? PAYMENT_METHODS_BY_CURRENCY[currency.code] : null;
                if (methods && methods.length > 1) {
                  return (
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Método de Pago *
                      </label>
                      <select
                        value={formData.payment_method}
                        onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      >
                        {methods.map(m => (
                          <option key={m.value} value={m.value}>{m.label}</option>
                        ))}
                      </select>
                    </div>
                  );
                }
                return null;
              })()}

              {/* Payment Method for PLATFORM */}
              {formData.type === 'PLATFORM' && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Tipo de Identificador *
                  </label>
                  <select
                    value={formData.payment_method}
                    onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    {PLATFORM_PAYMENT_METHODS.map(m => (
                      <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Dynamic Account/Identifier Field */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {(() => {
                    if (formData.type === 'PLATFORM') {
                      const method = PLATFORM_PAYMENT_METHODS.find(m => m.value === formData.payment_method);
                      return method?.accountLabel || 'Identificador';
                    }
                    const currency = currencies.find(c => c.id.toString() === formData.currency_id);
                    const methods = currency ? PAYMENT_METHODS_BY_CURRENCY[currency.code] : null;
                    const method = methods?.find(m => m.value === formData.payment_method);
                    return method?.accountLabel || 'Número de Cuenta';
                  })()} *
                </label>
                <input
                  type="text"
                  value={formData.account_number}
                  onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder={(() => {
                    if (formData.type === 'PLATFORM') {
                      const method = PLATFORM_PAYMENT_METHODS.find(m => m.value === formData.payment_method);
                      return method?.placeholder || 'correo@ejemplo.com';
                    }
                    const currency = currencies.find(c => c.id.toString() === formData.currency_id);
                    const methods = currency ? PAYMENT_METHODS_BY_CURRENCY[currency.code] : null;
                    const method = methods?.find(m => m.value === formData.payment_method);
                    return method?.placeholder || '0102-1234-5678-9012';
                  })()}
                  required
                />
              </div>

              {/* Account Holder */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {formData.type === 'PLATFORM' ? 'Nombre de Usuario/Titular' : 'Titular de la Cuenta'} *
                </label>
                <input
                  type="text"
                  value={formData.account_holder}
                  onChange={(e) => setFormData({ ...formData, account_holder: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder={formData.type === 'PLATFORM' ? 'FENGXCHANGE' : 'FENGXCHANGE C.A.'}
                  required
                />
              </div>

              {/* Bank Code - Only for BANK type and currencies that use bank codes */}
              {formData.type === 'BANK' && (() => {
                const currency = currencies.find(c => c.id.toString() === formData.currency_id);
                // Only show for countries that use bank codes in account numbers
                const currenciesWithBankCode = ['VES', 'COP', 'PEN'];
                if (currency && currenciesWithBankCode.includes(currency.code)) {
                  return (
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Código del Banco
                      </label>
                      <input
                        type="text"
                        value={formData.bank_code}
                        onChange={(e) => setFormData({ ...formData, bank_code: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder={currency.code === 'VES' ? '0102' : currency.code === 'COP' ? '1007' : '002'}
                      />
                    </div>
                  );
                }
                return null;
              })()}

              {/* Current Balance */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Saldo Actual
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={formatNumberInput(formData.current_balance.replace('.', ','))}
                  onChange={(e) => {
                    const formatted = formatNumberInput(e.target.value);
                    const parsed = parseFormattedNumber(formatted);
                    setFormData({ ...formData, current_balance: parsed });
                  }}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-right font-mono"
                  placeholder="0,00"
                />
              </div>

              {/* Active */}
              <div className="flex items-center gap-3">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
                <span className="text-sm font-medium text-slate-700">Activo</span>
              </div>

              {/* Message */}
              {message && (
                <div className={`flex items-center gap-2 p-3 rounded-lg ${message.type === 'success'
                  ? 'bg-green-50 text-green-700 border border-green-200'
                  : 'bg-red-50 text-red-700 border border-red-200'
                  }`}>
                  {message.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                  <span className="text-sm font-medium">{message.text}</span>
                </div>
              )}

              {/* Submit Button */}
              <div className="pt-4">
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-3 rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all shadow-md disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <Loader2 className="animate-spin" size={20} />
                      Guardando...
                    </>
                  ) : (
                    <>
                      <Save size={20} />
                      {editingBank ? 'Actualizar' : 'Crear'}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowDeleteModal(false)}
          />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
                <Trash2 className="text-red-600" size={32} />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">
                ¿Eliminar {selectedIds.size === 1 ? 'cuenta' : 'cuentas'}?
              </h3>
              <p className="text-slate-600 mb-6">
                Estás a punto de eliminar <span className="font-bold text-red-600">{selectedIds.size}</span> {selectedIds.size === 1 ? 'cuenta bancaria/plataforma' : 'cuentas bancarias/plataformas'}.
                Esta acción no se puede deshacer.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="flex-1 px-4 py-3 border border-slate-200 rounded-xl text-slate-700 hover:bg-slate-50 transition-colors font-medium"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleDeleteSelected}
                  disabled={deleting}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-red-500 to-rose-600 text-white rounded-xl hover:from-red-600 hover:to-rose-700 transition-all font-medium disabled:opacity-50"
                >
                  {deleting ? (
                    <>
                      <Loader2 className="animate-spin" size={18} />
                      Eliminando...
                    </>
                  ) : (
                    <>
                      <Trash2 size={18} />
                      Sí, eliminar
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
