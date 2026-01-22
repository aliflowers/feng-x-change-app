'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import {
  History,
  RefreshCw,
  Eye,
  CheckCircle2,
  Calendar,
  User,
  Building2,
  CreditCard,
  Filter,
  ChevronLeft,
  ChevronRight,
  X,
  FileText,
  Receipt,
  Loader2,
  Hash,
  UserCog
} from 'lucide-react';

interface CompletedOperation {
  id: string;
  transaction_number: string;
  amount_sent: number;
  amount_received: number;
  exchange_rate_applied: number;
  status: string;
  created_at: string;
  paid_at: string;
  payment_proof_url: string;
  payment_reference: string;
  admin_notes: string | null;
  from_currency: { id: number; code: string; symbol: string; name: string };
  to_currency: { id: number; code: string; symbol: string; name: string };
  user: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    document_type: string | null;
    document_number: string | null;
  };
  user_bank_account: {
    id: string;
    account_holder: string;
    account_number: string;
    document_type: string | null;
    document_number: string | null;
    bank_platform: { id: number; name: string };
  } | null;
  taken_by_profile: {
    id: string;
    first_name: string;
    last_name: string;
    role: string;
  } | null;
}

interface Currency {
  id: number;
  code: string;
  name: string;
}

interface BankPlatform {
  id: number;
  name: string;
}

interface AdminUser {
  id: string;
  first_name: string;
  last_name: string;
  role: string;
}

const ITEMS_PER_PAGE = 100;

export default function OperacionesPage() {
  const [operations, setOperations] = useState<CompletedOperation[]>([]);
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [banks, setBanks] = useState<BankPlatform[]>([]);
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  // Filters
  const [showFilters, setShowFilters] = useState(false);
  const [clientName, setClientName] = useState('');
  const [documentNumber, setDocumentNumber] = useState('');
  const [fromCurrency, setFromCurrency] = useState('');
  const [toCurrency, setToCurrency] = useState('');
  const [bankFilter, setBankFilter] = useState('');
  const [referenceFilter, setReferenceFilter] = useState('');
  const [adminFilter, setAdminFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Modal states
  const [selectedOperation, setSelectedOperation] = useState<CompletedOperation | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    loadOperations();
  }, [currentPage, clientName, documentNumber, fromCurrency, toCurrency, bankFilter, referenceFilter, adminFilter, dateFrom, dateTo]);

  const loadInitialData = async () => {
    try {
      // Load currencies
      const { data: currenciesData } = await supabase
        .from('currencies')
        .select('id, code, name')
        .eq('is_active', true);

      if (currenciesData) setCurrencies(currenciesData);

      // Load bank platforms
      const { data: banksData } = await supabase
        .from('banks_platforms')
        .select('id, name')
        .eq('is_active', true)
        .order('name');

      if (banksData) setBanks(banksData);

      // Load admin users (profiles with admin/cajero roles)
      const { data: adminData } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, role')
        .in('role', ['SUPER_ADMIN', 'ADMIN', 'CAJERO'])
        .order('first_name');

      if (adminData) setAdminUsers(adminData);

      await loadOperations();
    } catch (error) {
      console.error('Error loading initial data:', error);
    }
  };

  const loadOperations = useCallback(async () => {
    setLoading(true);
    try {
      // Build query
      let query = supabase
        .from('transactions')
        .select(`
          id,
          transaction_number,
          amount_sent,
          amount_received,
          exchange_rate_applied,
          status,
          created_at,
          paid_at,
          payment_proof_url,
          payment_reference,
          admin_notes,
          from_currency:currencies!transactions_from_currency_id_fkey(id, code, symbol, name),
          to_currency:currencies!transactions_to_currency_id_fkey(id, code, symbol, name),
          user:profiles!transactions_user_id_fkey(id, first_name, last_name, email, document_type, document_number),
          user_bank_account:user_bank_accounts!transactions_user_bank_account_id_fkey(
            id,
            account_holder,
            account_number,
            document_type,
            document_number,
            bank_platform:banks_platforms(id, name)
          ),
          taken_by_profile:profiles!transactions_taken_by_fkey(id, first_name, last_name, role)
        `, { count: 'exact' })
        .eq('status', 'COMPLETED')
        .not('payment_proof_url', 'is', null)
        .not('payment_reference', 'is', null);

      // Apply filters
      if (referenceFilter.trim()) {
        query = query.ilike('payment_reference', `%${referenceFilter}%`);
      }

      if (fromCurrency) {
        query = query.eq('from_currency_id', parseInt(fromCurrency));
      }

      if (toCurrency) {
        query = query.eq('to_currency_id', parseInt(toCurrency));
      }

      if (adminFilter) {
        query = query.eq('taken_by', adminFilter);
      }

      if (dateFrom) {
        query = query.gte('paid_at', `${dateFrom}T00:00:00`);
      }

      if (dateTo) {
        query = query.lte('paid_at', `${dateTo}T23:59:59`);
      }

      // Pagination
      const from = (currentPage - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;

      query = query
        .order('paid_at', { ascending: false })
        .range(from, to);

      const { data, count, error } = await query;

      if (error) throw error;

      // Transform Supabase data to extract first element from arrays (one-to-one relations)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let transformedData: any[] = (data || []).map(op => ({
        ...op,
        from_currency: Array.isArray(op.from_currency) ? op.from_currency[0] : op.from_currency,
        to_currency: Array.isArray(op.to_currency) ? op.to_currency[0] : op.to_currency,
        user: Array.isArray(op.user) ? op.user[0] : op.user,
        user_bank_account: Array.isArray(op.user_bank_account) ? op.user_bank_account[0] : op.user_bank_account,
        taken_by_profile: Array.isArray(op.taken_by_profile) ? op.taken_by_profile[0] : op.taken_by_profile,
      })).map(op => ({
        ...op,
        user_bank_account: op.user_bank_account ? {
          ...op.user_bank_account,
          bank_platform: Array.isArray(op.user_bank_account.bank_platform)
            ? op.user_bank_account.bank_platform[0]
            : op.user_bank_account.bank_platform
        } : null
      }));

      // Client-side filtering for nested relations
      if (clientName.trim()) {
        const searchTerm = clientName.toLowerCase();
        transformedData = transformedData.filter(op =>
          op.user?.first_name?.toLowerCase().includes(searchTerm) ||
          op.user?.last_name?.toLowerCase().includes(searchTerm)
        );
      }

      if (documentNumber.trim()) {
        transformedData = transformedData.filter(op =>
          op.user_bank_account?.document_number?.toLowerCase().includes(documentNumber.toLowerCase()) ||
          op.user?.document_number?.toLowerCase().includes(documentNumber.toLowerCase())
        );
      }

      if (bankFilter) {
        transformedData = transformedData.filter(op =>
          op.user_bank_account?.bank_platform?.id === parseInt(bankFilter)
        );
      }

      setOperations(transformedData as CompletedOperation[]);
      setTotalCount(count || 0);
    } catch (error) {
      console.error('Error loading operations:', error);
      if (error && typeof error === 'object' && 'message' in error) {
        console.error('Error message:', (error as any).message);
      }
      if (error && typeof error === 'object' && 'details' in error) {
        console.error('Error details:', (error as any).details);
      }
      if (error && typeof error === 'object' && 'hint' in error) {
        console.error('Error hint:', (error as any).hint);
      }
    } finally {
      setLoading(false);
    }
  }, [currentPage, clientName, documentNumber, fromCurrency, toCurrency, bankFilter, referenceFilter, adminFilter, dateFrom, dateTo]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadOperations();
    setRefreshing(false);
  };

  const clearFilters = () => {
    setClientName('');
    setDocumentNumber('');
    setFromCurrency('');
    setToCurrency('');
    setBankFilter('');
    setReferenceFilter('');
    setAdminFilter('');
    setDateFrom('');
    setDateTo('');
    setCurrentPage(1);
  };

  const hasActiveFilters = clientName || documentNumber || fromCurrency || toCurrency || bankFilter || referenceFilter || adminFilter || dateFrom || dateTo;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-VE', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatAmount = (amount: number, symbol: string) => {
    return `${symbol} ${amount.toLocaleString('es-VE', { minimumFractionDigits: 2 })}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <History className="text-blue-600" size={28} />
            Historial de Operaciones
          </h1>
          <p className="text-slate-500 mt-1">
            Operaciones completadas con comprobante de pago ({totalCount} registros)
          </p>
        </div>
        <div className="flex items-center gap-2">
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
                {[clientName, documentNumber, fromCurrency, toCurrency, bankFilter, referenceFilter, adminFilter, dateFrom, dateTo].filter(Boolean).length}
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
              Filtros Avanzados
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
            {/* Client Name */}
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">
                <User size={14} className="inline mr-1" />
                Nombre del Cliente
              </label>
              <input
                type="text"
                value={clientName}
                onChange={(e) => { setClientName(e.target.value); setCurrentPage(1); }}
                placeholder="Buscar por nombre..."
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Document Number */}
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">
                <CreditCard size={14} className="inline mr-1" />
                Documento de Identidad
              </label>
              <input
                type="text"
                value={documentNumber}
                onChange={(e) => { setDocumentNumber(e.target.value); setCurrentPage(1); }}
                placeholder="Número de documento..."
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* From Currency */}
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">
                Moneda Origen
              </label>
              <select
                value={fromCurrency}
                onChange={(e) => { setFromCurrency(e.target.value); setCurrentPage(1); }}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Todas</option>
                {currencies.map(c => (
                  <option key={c.id} value={c.id}>{c.code} - {c.name}</option>
                ))}
              </select>
            </div>

            {/* To Currency */}
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">
                Moneda Destino
              </label>
              <select
                value={toCurrency}
                onChange={(e) => { setToCurrency(e.target.value); setCurrentPage(1); }}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Todas</option>
                {currencies.map(c => (
                  <option key={c.id} value={c.id}>{c.code} - {c.name}</option>
                ))}
              </select>
            </div>

            {/* Bank/Platform */}
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">
                <Building2 size={14} className="inline mr-1" />
                Banco/Plataforma
              </label>
              <select
                value={bankFilter}
                onChange={(e) => { setBankFilter(e.target.value); setCurrentPage(1); }}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Todos</option>
                {banks.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>

            {/* Payment Reference */}
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">
                <Hash size={14} className="inline mr-1" />
                Referencia de Pago
              </label>
              <input
                type="text"
                value={referenceFilter}
                onChange={(e) => { setReferenceFilter(e.target.value); setCurrentPage(1); }}
                placeholder="Número de referencia..."
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Admin User */}
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">
                <UserCog size={14} className="inline mr-1" />
                Procesado por
              </label>
              <select
                value={adminFilter}
                onChange={(e) => { setAdminFilter(e.target.value); setCurrentPage(1); }}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Todos</option>
                {adminUsers.map(u => (
                  <option key={u.id} value={u.id}>
                    {u.first_name} {u.last_name} ({u.role})
                  </option>
                ))}
              </select>
            </div>

            {/* Date Range */}
            <div className="md:col-span-2 lg:col-span-2">
              <label className="block text-sm font-medium text-slate-600 mb-1">
                <Calendar size={14} className="inline mr-1" />
                Rango de Fechas
              </label>
              <div className="flex gap-2">
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => { setDateFrom(e.target.value); setCurrentPage(1); }}
                  className="flex-1 px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => { setDateTo(e.target.value); setCurrentPage(1); }}
                  className="flex-1 px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Operations Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="animate-spin text-blue-600" size={32} />
            <span className="ml-3 text-slate-600">Cargando operaciones...</span>
          </div>
        ) : operations.length === 0 ? (
          <div className="text-center py-20">
            <History className="mx-auto text-slate-300 mb-4" size={48} />
            <p className="text-slate-500">No se encontraron operaciones</p>
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
          <>
            {/* Desktop Table */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      # Operación
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      Cliente
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      Envía
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      Recibe
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      Banco
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      Referencia
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      Procesado por
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      Fecha Pago
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {operations.map((op) => (
                    <tr key={op.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3">
                        <span className="font-mono text-sm font-semibold text-slate-800">
                          {op.transaction_number}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-slate-800">
                            {op.user?.first_name} {op.user?.last_name}
                          </p>
                          <p className="text-xs text-slate-500">{op.user?.email}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-semibold text-red-600">
                          {formatAmount(op.amount_sent, op.from_currency?.symbol || '')}
                        </span>
                        <span className="text-xs text-slate-500 ml-1">{op.from_currency?.code}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-semibold text-green-600">
                          {formatAmount(op.amount_received, op.to_currency?.symbol || '')}
                        </span>
                        <span className="text-xs text-slate-500 ml-1">{op.to_currency?.code}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-slate-700">
                          {op.user_bank_account?.bank_platform?.name || 'N/A'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-sm text-blue-600 bg-blue-50 px-2 py-1 rounded">
                          {op.payment_reference}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600">
                            {op.taken_by_profile?.first_name?.[0]}{op.taken_by_profile?.last_name?.[0]}
                          </div>
                          <span className="text-sm text-slate-700">
                            {op.taken_by_profile?.first_name} {op.taken_by_profile?.last_name}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-slate-600">
                          {formatDate(op.paid_at)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => {
                            setSelectedOperation(op);
                            setShowDetailModal(true);
                          }}
                          className="p-2 hover:bg-blue-50 rounded-lg transition-colors text-blue-600"
                          title="Ver detalles"
                        >
                          <Eye size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="lg:hidden divide-y divide-slate-100">
              {operations.map((op) => (
                <div key={op.id} className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <span className="font-mono text-sm font-bold text-slate-800">
                        {op.transaction_number}
                      </span>
                      <p className="text-sm text-slate-600 mt-1">
                        {op.user?.first_name} {op.user?.last_name}
                      </p>
                    </div>
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                      <CheckCircle2 size={12} />
                      Completada
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-3 text-sm">
                    <div>
                      <span className="text-slate-500">Envía:</span>
                      <p className="font-semibold text-red-600">
                        {formatAmount(op.amount_sent, op.from_currency?.symbol || '')}
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-500">Recibe:</span>
                      <p className="font-semibold text-green-600">
                        {formatAmount(op.amount_received, op.to_currency?.symbol || '')}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">
                      {formatDate(op.paid_at)}
                    </span>
                    <button
                      onClick={() => {
                        setSelectedOperation(op);
                        setShowDetailModal(true);
                      }}
                      className="flex items-center gap-1 text-blue-600 text-sm font-medium"
                    >
                      <Eye size={16} />
                      Ver detalles
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
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

      {/* Detail Modal */}
      {showDetailModal && selectedOperation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowDetailModal(false)}
          />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b border-slate-200 p-4 flex items-center justify-between z-10">
              <div>
                <h2 className="text-lg font-bold text-slate-800">Detalle de Operación</h2>
                <p className="text-sm text-slate-500">{selectedOperation.transaction_number}</p>
              </div>
              <button
                onClick={() => setShowDetailModal(false)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X size={20} className="text-slate-500" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6">
              {/* Status */}
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-100 text-green-700 border border-green-300">
                <CheckCircle2 size={18} />
                <span className="font-semibold">Operación Completada</span>
              </div>

              {/* Amounts */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-100">
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Monto Enviado</p>
                    <p className="text-xl font-bold text-red-600">
                      {formatAmount(selectedOperation.amount_sent, selectedOperation.from_currency?.symbol || '')}
                    </p>
                    <p className="text-sm text-slate-500">{selectedOperation.from_currency?.name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Monto Recibido</p>
                    <p className="text-xl font-bold text-green-600">
                      {formatAmount(selectedOperation.amount_received, selectedOperation.to_currency?.symbol || '')}
                    </p>
                    <p className="text-sm text-slate-500">{selectedOperation.to_currency?.name}</p>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-blue-200 text-center">
                  <p className="text-xs text-slate-500">Tasa aplicada</p>
                  <p className="font-bold text-slate-700">
                    1 {selectedOperation.from_currency?.code} = {selectedOperation.exchange_rate_applied.toLocaleString('es-VE')} {selectedOperation.to_currency?.code}
                  </p>
                </div>
              </div>

              {/* Client Info */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <User size={16} className="text-slate-400" />
                  Cliente
                </h3>
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                  <p className="font-bold text-slate-800">
                    {selectedOperation.user?.first_name} {selectedOperation.user?.last_name}
                  </p>
                  <p className="text-sm text-slate-500">{selectedOperation.user?.email}</p>
                  {selectedOperation.user?.document_number && (
                    <p className="text-sm text-slate-600 mt-2">
                      <span className="font-medium">Documento:</span> {selectedOperation.user?.document_type} {selectedOperation.user?.document_number}
                    </p>
                  )}
                </div>
              </div>

              {/* Beneficiary Info */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <Building2 size={16} className="text-slate-400" />
                  Beneficiario
                </h3>
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                  <p className="font-bold text-slate-800">
                    {selectedOperation.user_bank_account?.account_holder || 'N/A'}
                  </p>
                  <p className="text-sm text-slate-600">
                    {selectedOperation.user_bank_account?.bank_platform?.name}
                  </p>
                  <p className="text-sm text-slate-500 font-mono mt-1">
                    {selectedOperation.user_bank_account?.account_number}
                  </p>
                  {selectedOperation.user_bank_account?.document_number && (
                    <p className="text-sm text-slate-600 mt-2">
                      <span className="font-medium">Documento:</span> {selectedOperation.user_bank_account?.document_type} {selectedOperation.user_bank_account?.document_number}
                    </p>
                  )}
                </div>
              </div>

              {/* Payment Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                    <FileText size={16} className="text-slate-400" />
                    Referencia de Pago
                  </h3>
                  <div className="bg-green-50 rounded-xl p-4 border border-green-200">
                    <p className="font-mono font-bold text-green-700 text-lg">
                      {selectedOperation.payment_reference}
                    </p>
                  </div>
                </div>
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                    <Calendar size={16} className="text-slate-400" />
                    Fecha de Pago
                  </h3>
                  <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                    <p className="font-medium text-blue-700">
                      {formatDate(selectedOperation.paid_at)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Processed By */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <UserCog size={16} className="text-slate-400" />
                  Procesado por
                </h3>
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                    {selectedOperation.taken_by_profile?.first_name?.[0]}{selectedOperation.taken_by_profile?.last_name?.[0]}
                  </div>
                  <div>
                    <p className="font-medium text-slate-800">
                      {selectedOperation.taken_by_profile?.first_name} {selectedOperation.taken_by_profile?.last_name}
                    </p>
                    <p className="text-xs text-slate-500 uppercase">{selectedOperation.taken_by_profile?.role}</p>
                  </div>
                </div>
              </div>

              {/* Payment Proof */}
              {selectedOperation.payment_proof_url && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                    <Receipt size={16} className="text-green-500" />
                    Comprobante de Pago
                  </h3>
                  <div className="bg-green-50 rounded-xl p-3 border border-green-200">
                    <a
                      href={selectedOperation.payment_proof_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block"
                    >
                      <img
                        src={selectedOperation.payment_proof_url}
                        alt="Comprobante de pago"
                        className="w-full rounded-lg border border-green-200 hover:opacity-90 transition-opacity"
                      />
                    </a>
                  </div>
                </div>
              )}

              {/* Admin Notes */}
              {selectedOperation.admin_notes && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                    <FileText size={16} className="text-amber-500" />
                    Notas
                  </h3>
                  <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
                    <p className="text-amber-800">{selectedOperation.admin_notes}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
