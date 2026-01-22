'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import {
  Users,
  Search,
  RefreshCw,
  Eye,
  Phone,
  MapPin,
  CreditCard,
  Calendar,
  Shield,
  ShieldCheck,
  ShieldX,
  CheckCircle2,
  Filter,
  ChevronLeft,
  ChevronRight,
  X,
  History,
  Loader2,
  UserPlus,
  Building2
} from 'lucide-react';

interface Client {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string | null;
  country: string | null;
  nationality: string | null;
  document_type: string | null;
  document_number: string | null;
  role: string;
  agent_code: string | null;
  agent_id: string | null;
  is_kyc_verified: boolean;
  created_at: string;
  updated_at: string;
  // Relation
  agent: {
    id: string;
    first_name: string;
    last_name: string;
    agent_code: string;
  } | null;
  // Stats
  total_transactions?: number;
}

interface AdminUser {
  id: string;
  first_name: string;
  last_name: string;
  agent_code: string;
}

const ITEMS_PER_PAGE = 50;

export default function ClientesPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [agents, setAgents] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  // Filters
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [agentFilter, setAgentFilter] = useState('');
  const [kycFilter, setKycFilter] = useState('');
  const [countryFilter, setCountryFilter] = useState('');

  // Modal states
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showBeneficiariesModal, setShowBeneficiariesModal] = useState(false);
  const [clientTransactions, setClientTransactions] = useState<any[]>([]);
  const [clientBeneficiaries, setClientBeneficiaries] = useState<any[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  const [loadingBeneficiaries, setLoadingBeneficiaries] = useState(false);

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    loadClients();
  }, [currentPage, searchQuery, agentFilter, kycFilter, countryFilter]);

  const loadInitialData = async () => {
    try {
      // Load admin users (agents)
      const { data: adminData } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, agent_code')
        .in('role', ['SUPER_ADMIN', 'ADMIN', 'CAJERO'])
        .not('agent_code', 'is', null)
        .order('first_name');

      if (adminData) setAgents(adminData);

      await loadClients();
    } catch (error) {
      console.error('Error loading initial data:', error);
    }
  };

  const loadClients = useCallback(async () => {
    setLoading(true);
    try {
      // Build query - only get CLIENT role users
      let query = supabase
        .from('profiles')
        .select(`
          id,
          first_name,
          last_name,
          email,
          phone_number,
          country,
          nationality,
          document_type,
          document_number,
          role,
          agent_code,
          agent_id,
          is_kyc_verified,
          created_at,
          updated_at
        `, { count: 'exact' })
        .eq('role', 'CLIENT');

      // Apply filters
      if (agentFilter) {
        query = query.eq('agent_id', agentFilter);
      }

      if (kycFilter === 'verified') {
        query = query.eq('is_kyc_verified', true);
      } else if (kycFilter === 'pending') {
        query = query.eq('is_kyc_verified', false);
      }

      if (countryFilter) {
        query = query.eq('country', countryFilter);
      }

      // Pagination
      const from = (currentPage - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;

      query = query
        .order('created_at', { ascending: false })
        .range(from, to);

      const { data, count, error } = await query;

      if (error) throw error;

      // Get agent info for each client with agent_id
      let clientsWithAgents = data || [];

      // Fetch agent profiles for clients that have agent_id
      const agentIds = [...new Set(clientsWithAgents.filter(c => c.agent_id).map(c => c.agent_id))];
      let agentMap: Record<string, any> = {};

      if (agentIds.length > 0) {
        const { data: agentsData } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, agent_code')
          .in('id', agentIds);

        if (agentsData) {
          agentMap = agentsData.reduce((acc, agent) => {
            acc[agent.id] = agent;
            return acc;
          }, {} as Record<string, any>);
        }
      }

      // Map agents to clients
      clientsWithAgents = clientsWithAgents.map(client => ({
        ...client,
        agent: client.agent_id ? agentMap[client.agent_id] || null : null
      }));

      // Client-side search filter
      if (searchQuery.trim()) {
        const search = searchQuery.toLowerCase();
        clientsWithAgents = clientsWithAgents.filter(c =>
          c.first_name?.toLowerCase().includes(search) ||
          c.last_name?.toLowerCase().includes(search) ||
          c.email?.toLowerCase().includes(search) ||
          c.document_number?.toLowerCase().includes(search) ||
          c.phone_number?.toLowerCase().includes(search)
        );
      }

      setClients(clientsWithAgents as Client[]);
      setTotalCount(count || 0);
    } catch (error) {
      console.error('Error loading clients:', error);
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchQuery, agentFilter, kycFilter, countryFilter]);

  const loadClientTransactions = async (clientId: string) => {
    setLoadingTransactions(true);
    try {
      const { data, error } = await supabase
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
          payment_reference,
          from_currency:currencies!transactions_from_currency_id_fkey(code, symbol, name),
          to_currency:currencies!transactions_to_currency_id_fkey(code, symbol, name),
          user_bank_account:user_bank_accounts!transactions_user_bank_account_id_fkey(
            account_holder,
            account_number,
            bank_platform:banks_platforms(name, type)
          )
        `)
        .eq('user_id', clientId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      // Transform data
      const transformed = (data || []).map(t => {
        const userBankAccount = Array.isArray(t.user_bank_account) ? t.user_bank_account[0] : t.user_bank_account;
        return {
          ...t,
          from_currency: Array.isArray(t.from_currency) ? t.from_currency[0] : t.from_currency,
          to_currency: Array.isArray(t.to_currency) ? t.to_currency[0] : t.to_currency,
          user_bank_account: userBankAccount ? {
            ...userBankAccount,
            bank_platform: Array.isArray(userBankAccount.bank_platform) ? userBankAccount.bank_platform[0] : userBankAccount.bank_platform
          } : null
        };
      });

      setClientTransactions(transformed);
    } catch (error) {
      console.error('Error loading transactions:', error);
    } finally {
      setLoadingTransactions(false);
    }
  };

  const loadClientBeneficiaries = async (clientId: string) => {
    setLoadingBeneficiaries(true);
    try {
      const { data, error } = await supabase
        .from('user_bank_accounts')
        .select(`
          id,
          account_holder,
          account_number,
          document_type,
          document_number,
          is_active,
          created_at,
          bank_platform:banks_platforms(id, name, type)
        `)
        .eq('user_id', clientId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Supabase error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        throw error;
      }

      // Transform data
      const transformed = (data || []).map(b => ({
        ...b,
        bank_platform: Array.isArray(b.bank_platform) ? b.bank_platform[0] : b.bank_platform,
      }));

      setClientBeneficiaries(transformed);
    } catch (error) {
      console.error('Error loading beneficiaries:', error);
      if (error && typeof error === 'object') {
        if ('message' in error) console.error('Error message:', (error as any).message);
        if ('details' in error) console.error('Error details:', (error as any).details);
        if ('hint' in error) console.error('Error hint:', (error as any).hint);
      }
    } finally {
      setLoadingBeneficiaries(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadClients();
    setRefreshing(false);
  };

  const clearFilters = () => {
    setSearchQuery('');
    setAgentFilter('');
    setKycFilter('');
    setCountryFilter('');
    setCurrentPage(1);
  };

  const hasActiveFilters = searchQuery || agentFilter || kycFilter || countryFilter;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-VE', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const getStatusConfig = (status: string) => {
    const configs: Record<string, { label: string; color: string; bg: string }> = {
      POOL: { label: 'En Pool', color: 'text-blue-600', bg: 'bg-blue-100' },
      TAKEN: { label: 'Tomada', color: 'text-amber-600', bg: 'bg-amber-100' },
      COMPLETED: { label: 'Completada', color: 'text-green-600', bg: 'bg-green-100' },
      REJECTED: { label: 'Rechazada', color: 'text-red-600', bg: 'bg-red-100' },
      CANCELLED: { label: 'Cancelada', color: 'text-slate-600', bg: 'bg-slate-100' },
    };
    return configs[status] || { label: status, color: 'text-slate-600', bg: 'bg-slate-100' };
  };

  // Get unique countries from clients
  const uniqueCountries = [...new Set(clients.filter(c => c.country).map(c => c.country))];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Users className="text-blue-600" size={28} />
            Clientes
          </h1>
          <p className="text-slate-500 mt-1">
            Clientes registrados en el sistema ({totalCount} registros)
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
                {[searchQuery, agentFilter, kycFilter, countryFilter].filter(Boolean).length}
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
                placeholder="Nombre, email, documento..."
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Agent Filter */}
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">
                <UserPlus size={14} className="inline mr-1" />
                Agente
              </label>
              <select
                value={agentFilter}
                onChange={(e) => { setAgentFilter(e.target.value); setCurrentPage(1); }}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Todos</option>
                {agents.map(a => (
                  <option key={a.id} value={a.id}>
                    {a.first_name} {a.last_name} ({a.agent_code})
                  </option>
                ))}
              </select>
            </div>

            {/* KYC Filter */}
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">
                <Shield size={14} className="inline mr-1" />
                Estado KYC
              </label>
              <select
                value={kycFilter}
                onChange={(e) => { setKycFilter(e.target.value); setCurrentPage(1); }}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Todos</option>
                <option value="verified">Verificado</option>
                <option value="pending">Pendiente</option>
              </select>
            </div>

            {/* Country Filter */}
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">
                <MapPin size={14} className="inline mr-1" />
                País
              </label>
              <select
                value={countryFilter}
                onChange={(e) => { setCountryFilter(e.target.value); setCurrentPage(1); }}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Todos</option>
                {uniqueCountries.map(c => (
                  <option key={c} value={c!}>{c}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Clients Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="animate-spin text-blue-600" size={32} />
            <span className="ml-3 text-slate-600">Cargando clientes...</span>
          </div>
        ) : clients.length === 0 ? (
          <div className="text-center py-20">
            <Users className="mx-auto text-slate-300 mb-4" size={48} />
            <p className="text-slate-500">No se encontraron clientes</p>
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
                      Cliente
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      Documento
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      Contacto
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      País
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      Agente
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      KYC
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      Registro
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {clients.map((client) => (
                    <tr key={client.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold">
                            {client.first_name?.[0]}{client.last_name?.[0]}
                          </div>
                          <div>
                            <p className="font-medium text-slate-800">
                              {client.first_name} {client.last_name}
                            </p>
                            <p className="text-xs text-slate-500">{client.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {client.document_number ? (
                          <span className="text-sm text-slate-700">
                            {client.document_type} {client.document_number}
                          </span>
                        ) : (
                          <span className="text-sm text-slate-400">Sin documento</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-slate-700">{client.phone_number || '-'}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-slate-700">{client.country || '-'}</span>
                      </td>
                      <td className="px-4 py-3">
                        {client.agent ? (
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center text-xs font-bold text-amber-700">
                              {client.agent.first_name?.[0]}{client.agent.last_name?.[0]}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-slate-700">
                                {client.agent.first_name} {client.agent.last_name}
                              </p>
                              <p className="text-xs text-amber-600 font-mono">
                                {client.agent.agent_code}
                              </p>
                            </div>
                          </div>
                        ) : client.agent_code ? (
                          <span className="text-xs text-slate-500 font-mono bg-slate-100 px-2 py-1 rounded">
                            Código: {client.agent_code}
                          </span>
                        ) : (
                          <span className="text-sm text-slate-400">Sin agente</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {client.is_kyc_verified ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                            <ShieldCheck size={12} />
                            Verificado
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                            <ShieldX size={12} />
                            Pendiente
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-slate-600">
                          {formatDate(client.created_at)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => {
                              setSelectedClient(client);
                              setShowDetailModal(true);
                            }}
                            className="p-2 hover:bg-blue-50 rounded-lg transition-colors text-blue-600"
                            title="Ver perfil"
                          >
                            <Eye size={18} />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedClient(client);
                              loadClientTransactions(client.id);
                              setShowHistoryModal(true);
                            }}
                            className="p-2 hover:bg-green-50 rounded-lg transition-colors text-green-600"
                            title="Ver historial"
                          >
                            <History size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="lg:hidden divide-y divide-slate-100">
              {clients.map((client) => (
                <div key={client.id} className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm">
                        {client.first_name?.[0]}{client.last_name?.[0]}
                      </div>
                      <div>
                        <p className="font-medium text-slate-800">
                          {client.first_name} {client.last_name}
                        </p>
                        <p className="text-xs text-slate-500">{client.email}</p>
                      </div>
                    </div>
                    {client.is_kyc_verified ? (
                      <ShieldCheck size={18} className="text-green-600" />
                    ) : (
                      <ShieldX size={18} className="text-amber-600" />
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-3 text-sm">
                    <div>
                      <span className="text-slate-500">Documento:</span>
                      <p className="font-medium text-slate-700">
                        {client.document_number || '-'}
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-500">País:</span>
                      <p className="font-medium text-slate-700">
                        {client.country || '-'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    {client.agent ? (
                      <span className="text-xs text-amber-600 font-mono">
                        Agente: {client.agent.agent_code}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400">Sin agente</span>
                    )}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setSelectedClient(client);
                          setShowDetailModal(true);
                        }}
                        className="flex items-center gap-1 text-blue-600 text-sm font-medium"
                      >
                        <Eye size={16} />
                        Perfil
                      </button>
                      <button
                        onClick={() => {
                          setSelectedClient(client);
                          loadClientTransactions(client.id);
                          setShowHistoryModal(true);
                        }}
                        className="flex items-center gap-1 text-green-600 text-sm font-medium"
                      >
                        <History size={16} />
                        Historial
                      </button>
                    </div>
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

      {/* Profile Detail Modal */}
      {showDetailModal && selectedClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowDetailModal(false)}
          />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b border-slate-200 p-4 flex items-center justify-between z-10">
              <h2 className="text-lg font-bold text-slate-800">Perfil del Cliente</h2>
              <button
                onClick={() => setShowDetailModal(false)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X size={20} className="text-slate-500" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6">
              {/* Avatar and Name */}
              <div className="text-center">
                <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-2xl font-bold">
                  {selectedClient.first_name?.[0]}{selectedClient.last_name?.[0]}
                </div>
                <h3 className="mt-3 text-xl font-bold text-slate-800">
                  {selectedClient.first_name} {selectedClient.last_name}
                </h3>
                <p className="text-slate-500">{selectedClient.email}</p>
                {selectedClient.is_kyc_verified ? (
                  <span className="inline-flex items-center gap-1 mt-2 px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                    <ShieldCheck size={14} />
                    KYC Verificado
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 mt-2 px-3 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                    <ShieldX size={14} />
                    KYC Pendiente
                  </span>
                )}
              </div>

              {/* Info Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
                  <div className="flex items-center gap-2 text-slate-500 mb-1">
                    <CreditCard size={14} />
                    <span className="text-xs">Documento</span>
                  </div>
                  <p className="font-medium text-slate-800">
                    {selectedClient.document_type} {selectedClient.document_number || 'N/A'}
                  </p>
                </div>
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
                  <div className="flex items-center gap-2 text-slate-500 mb-1">
                    <Phone size={14} />
                    <span className="text-xs">Teléfono</span>
                  </div>
                  <p className="font-medium text-slate-800">
                    {selectedClient.phone_number || 'N/A'}
                  </p>
                </div>
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
                  <div className="flex items-center gap-2 text-slate-500 mb-1">
                    <MapPin size={14} />
                    <span className="text-xs">País</span>
                  </div>
                  <p className="font-medium text-slate-800">
                    {selectedClient.country || 'N/A'}
                  </p>
                </div>
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
                  <div className="flex items-center gap-2 text-slate-500 mb-1">
                    <Building2 size={14} />
                    <span className="text-xs">Nacionalidad</span>
                  </div>
                  <p className="font-medium text-slate-800">
                    {selectedClient.nationality || 'N/A'}
                  </p>
                </div>
              </div>

              {/* Agent Info */}
              <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
                <div className="flex items-center gap-2 text-amber-700 mb-2">
                  <UserPlus size={16} />
                  <span className="font-semibold">Agente Asociado</span>
                </div>
                {selectedClient.agent ? (
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-amber-200 flex items-center justify-center text-amber-700 font-bold">
                      {selectedClient.agent.first_name?.[0]}{selectedClient.agent.last_name?.[0]}
                    </div>
                    <div>
                      <p className="font-medium text-amber-900">
                        {selectedClient.agent.first_name} {selectedClient.agent.last_name}
                      </p>
                      <p className="text-sm text-amber-600 font-mono">
                        Código: {selectedClient.agent.agent_code}
                      </p>
                    </div>
                  </div>
                ) : selectedClient.agent_code ? (
                  <p className="text-amber-700">
                    Código ingresado: <span className="font-mono font-bold">{selectedClient.agent_code}</span>
                    <br />
                    <span className="text-sm text-amber-600">(Agente no encontrado)</span>
                  </p>
                ) : (
                  <p className="text-amber-600">Este cliente no tiene agente asociado</p>
                )}
              </div>

              {/* Ver Beneficiarios Button */}
              <div>
                <button
                  onClick={() => {
                    loadClientBeneficiaries(selectedClient.id);
                    setShowBeneficiariesModal(true);
                  }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl hover:from-blue-600 hover:to-indigo-700 transition-all shadow-md hover:shadow-lg"
                >
                  <Building2 size={18} />
                  <span className="font-semibold">Ver Beneficiarios</span>
                </button>
              </div>

              {/* Dates */}
              <div className="flex items-center justify-between text-sm text-slate-500 border-t border-slate-200 pt-4">
                <div className="flex items-center gap-1">
                  <Calendar size={14} />
                  Registrado: {formatDate(selectedClient.created_at)}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* History Modal */}
      {showHistoryModal && selectedClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowHistoryModal(false)}
          />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b border-slate-200 p-4 flex items-center justify-between z-10">
              <div>
                <h2 className="text-lg font-bold text-slate-800">Historial de Operaciones</h2>
                <p className="text-sm text-slate-500">
                  {selectedClient.first_name} {selectedClient.last_name}
                </p>
              </div>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X size={20} className="text-slate-500" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              {loadingTransactions ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="animate-spin text-blue-600" size={32} />
                  <span className="ml-3 text-slate-600">Cargando operaciones...</span>
                </div>
              ) : clientTransactions.length === 0 ? (
                <div className="text-center py-10">
                  <History className="mx-auto text-slate-300 mb-4" size={48} />
                  <p className="text-slate-500">Este cliente no tiene operaciones</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-100 border-b border-slate-200">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600">Nº Operación</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600">Envía</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600">Recibe</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600">Tasa</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600">Beneficiario</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600">Referencia</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600">Fecha</th>
                        <th className="px-3 py-2 text-center text-xs font-semibold text-slate-600">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {clientTransactions.map((t) => {
                        const statusConfig = getStatusConfig(t.status);
                        return (
                          <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-3 py-3">
                              <p className="font-mono font-bold text-blue-600">{t.transaction_number}</p>
                            </td>
                            <td className="px-3 py-3">
                              <p className="font-semibold text-slate-800">
                                {t.from_currency?.symbol} {t.amount_sent?.toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                              </p>
                              <p className="text-xs text-slate-500">{t.from_currency?.code}</p>
                            </td>
                            <td className="px-3 py-3">
                              <p className="font-semibold text-green-600">
                                {t.to_currency?.symbol} {t.amount_received?.toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                              </p>
                              <p className="text-xs text-slate-500">{t.to_currency?.code}</p>
                            </td>
                            <td className="px-3 py-3">
                              <p className="text-slate-700">
                                {t.exchange_rate_applied?.toLocaleString('es-VE', { minimumFractionDigits: 2 }) || '-'}
                              </p>
                            </td>
                            <td className="px-3 py-3">
                              {t.user_bank_account ? (
                                <div>
                                  <p className="font-medium text-slate-800 truncate max-w-[150px]">
                                    {t.user_bank_account.account_holder}
                                  </p>
                                  <p className="text-xs text-slate-500 truncate max-w-[150px]">
                                    {t.user_bank_account.bank_platform?.name || 'Banco'}
                                  </p>
                                </div>
                              ) : (
                                <span className="text-slate-400">-</span>
                              )}
                            </td>
                            <td className="px-3 py-3">
                              <p className="font-mono text-xs text-slate-600">
                                {t.payment_reference || '-'}
                              </p>
                            </td>
                            <td className="px-3 py-3">
                              <p className="text-slate-700">{formatDate(t.created_at)}</p>
                              {t.paid_at && t.status === 'COMPLETED' && (
                                <p className="text-xs text-green-600">Pagado: {formatDate(t.paid_at)}</p>
                              )}
                            </td>
                            <td className="px-3 py-3 text-center">
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${statusConfig.bg} ${statusConfig.color}`}>
                                {statusConfig.label}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Beneficiaries Modal */}
      {showBeneficiariesModal && selectedClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowBeneficiariesModal(false)}
          />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b border-slate-200 p-4 flex items-center justify-between z-10">
              <div>
                <h2 className="text-lg font-bold text-slate-800">Beneficiarios</h2>
                <p className="text-sm text-slate-500">
                  {selectedClient.first_name} {selectedClient.last_name}
                </p>
              </div>
              <button
                onClick={() => setShowBeneficiariesModal(false)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X size={20} className="text-slate-500" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              {loadingBeneficiaries ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="animate-spin text-blue-600" size={32} />
                  <span className="ml-3 text-slate-600">Cargando beneficiarios...</span>
                </div>
              ) : clientBeneficiaries.length === 0 ? (
                <div className="text-center py-10">
                  <Building2 className="mx-auto text-slate-300 mb-4" size={48} />
                  <p className="text-slate-500">Este cliente no tiene beneficiarios registrados</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {clientBeneficiaries.map((beneficiary) => (
                    <div
                      key={beneficiary.id}
                      className="bg-gradient-to-r from-slate-50 to-blue-50 rounded-xl p-5 border border-slate-200 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold shadow-md">
                            {beneficiary.account_holder?.[0] || 'B'}
                          </div>
                          <div>
                            <p className="font-bold text-slate-800 text-lg">
                              {beneficiary.account_holder}
                            </p>
                            <p className="text-sm text-slate-600">
                              {beneficiary.bank_platform?.name || 'Banco no especificado'}
                            </p>
                          </div>
                        </div>
                        {beneficiary.is_active ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                            <CheckCircle2 size={12} />
                            Activo
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                            Inactivo
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Account Number */}
                        <div className="bg-white rounded-lg p-3 border border-slate-200">
                          <div className="flex items-center gap-2 text-slate-500 mb-1">
                            <CreditCard size={14} />
                            <span className="text-xs font-medium">Número de Cuenta</span>
                          </div>
                          <p className="font-mono font-bold text-blue-600">
                            {beneficiary.account_number}
                          </p>
                        </div>

                        {/* Document */}
                        <div className="bg-white rounded-lg p-3 border border-slate-200">
                          <div className="flex items-center gap-2 text-slate-500 mb-1">
                            <CreditCard size={14} />
                            <span className="text-xs font-medium">Documento</span>
                          </div>
                          <p className="font-medium text-slate-700">
                            {beneficiary.document_type} {beneficiary.document_number || 'N/A'}
                          </p>
                        </div>

                        {/* Bank Type */}
                        {beneficiary.bank_platform?.type && (
                          <div className="bg-white rounded-lg p-3 border border-slate-200">
                            <div className="flex items-center gap-2 text-slate-500 mb-1">
                              <Building2 size={14} />
                              <span className="text-xs font-medium">Tipo</span>
                            </div>
                            <p className="font-medium text-slate-700">
                              {beneficiary.bank_platform.type}
                            </p>
                          </div>
                        )}

                        {/* Created Date */}
                        <div className="bg-white rounded-lg p-3 border border-slate-200">
                          <div className="flex items-center gap-2 text-slate-500 mb-1">
                            <Calendar size={14} />
                            <span className="text-xs font-medium">Fecha de Registro</span>
                          </div>
                          <p className="font-medium text-slate-700">
                            {formatDate(beneficiary.created_at)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
