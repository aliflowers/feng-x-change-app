'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  History,
  Clock,
  CheckCircle2,
  XCircle,
  Eye,
  ChevronRight,
  ArrowUpRight,
  ArrowDownLeft,
  Filter,
  RefreshCw,
  Loader2,
  AlertCircle,
  Plus,
  X,
  Building,
  User,
  Calendar,
  FileText,
  Image as ImageIcon,
  Receipt
} from 'lucide-react';
import { supabase } from '@/lib/supabase/client';

// Types for transactions with relations
interface TransactionWithDetails {
  id: string;
  transaction_number: string;
  user_id: string;
  from_currency_id: number;
  to_currency_id: number;
  amount_sent: number;
  exchange_rate_applied: number;
  amount_received: number;
  client_proof_url: string | null;
  status: string;
  taken_by: string | null;
  taken_at: string | null;
  payment_proof_url: string | null;
  payment_reference: string | null;
  paid_at: string | null;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
  user_bank_account_id: string | null;
  // Relations
  from_currency?: { code: string; symbol: string; name: string };
  to_currency?: { code: string; symbol: string; name: string };
  user_bank_account?: {
    account_holder: string;
    account_number: string;
    bank?: { name: string };
    bank_platform?: { name: string };
  };
}

// Status display configuration
const getStatusConfig = (status: string) => {
  switch (status) {
    case 'POOL':
    case 'TAKEN':
      return {
        label: 'En Proceso',
        bgColor: 'bg-amber-100',
        textColor: 'text-amber-700',
        borderColor: 'border-amber-300',
        icon: Clock,
      };
    case 'VERIFIED':
      return {
        label: 'Verificado',
        bgColor: 'bg-blue-100',
        textColor: 'text-blue-700',
        borderColor: 'border-blue-300',
        icon: Eye,
      };
    case 'COMPLETED':
      return {
        label: 'Completado',
        bgColor: 'bg-green-100',
        textColor: 'text-green-700',
        borderColor: 'border-green-300',
        icon: CheckCircle2,
      };
    case 'REJECTED':
      return {
        label: 'Rechazado',
        bgColor: 'bg-red-100',
        textColor: 'text-red-700',
        borderColor: 'border-red-300',
        icon: XCircle,
      };
    default:
      return {
        label: status,
        bgColor: 'bg-gray-100',
        textColor: 'text-gray-700',
        borderColor: 'border-gray-300',
        icon: Clock,
      };
  }
};

// Format date
const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('es-VE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export default function HistoryPage() {
  const [transactions, setTransactions] = useState<TransactionWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedTransaction, setSelectedTransaction] = useState<TransactionWithDetails | null>(null);
  const [modalType, setModalType] = useState<'details' | 'receipt'>('details');

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No autenticado');

      const { data, error: fetchError } = await supabase
        .from('transactions')
        .select(`
          *,
          from_currency:currencies!transactions_from_currency_id_fkey(code, symbol, name),
          to_currency:currencies!transactions_to_currency_id_fkey(code, symbol, name),
          user_bank_account:user_bank_accounts(
            account_holder,
            account_number,
            bank:banks(name),
            bank_platform:banks_platforms(name)
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setTransactions(data || []);
    } catch (err) {
      console.error('Error fetching transactions:', err);
      setError('Error al cargar el historial');
    } finally {
      setLoading(false);
    }
  };

  // Filter transactions
  const filteredTransactions = statusFilter === 'all'
    ? transactions
    : transactions.filter(t => {
      if (statusFilter === 'EN_PROCESO') return t.status === 'POOL' || t.status === 'TAKEN';
      if (statusFilter === 'VERIFIED') return t.status === 'VERIFIED';
      if (statusFilter === 'COMPLETED') return t.status === 'COMPLETED';
      if (statusFilter === 'REJECTED') return t.status === 'REJECTED';
      return true;
    });

  // Stats
  const stats = {
    total: transactions.length,
    enProceso: transactions.filter(t => t.status === 'POOL' || t.status === 'TAKEN').length,
    completadas: transactions.filter(t => t.status === 'COMPLETED').length,
    rechazadas: transactions.filter(t => t.status === 'REJECTED').length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="animate-spin mx-auto mb-4 text-blue-600" size={40} />
          <p className="text-gray-500">Cargando historial...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <History className="text-blue-600" size={28} />
            Historial de Operaciones
          </h1>
          <p className="text-gray-500 mt-1">Consulta el estado de tus transacciones</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchTransactions}
            className="btn-secondary flex items-center gap-2"
          >
            <RefreshCw size={18} />
            Actualizar
          </button>
          <Link href="/app/operaciones" className="btn-primary flex items-center gap-2">
            <Plus size={18} />
            Nueva Operación
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <p className="text-sm text-gray-500">Total</p>
          <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
        </div>
        <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
          <p className="text-sm text-amber-600">En Proceso</p>
          <p className="text-2xl font-bold text-amber-700">{stats.enProceso}</p>
        </div>
        <div className="bg-green-50 rounded-xl p-4 border border-green-200">
          <p className="text-sm text-green-600">Completadas</p>
          <p className="text-2xl font-bold text-green-700">{stats.completadas}</p>
        </div>
        <div className="bg-red-50 rounded-xl p-4 border border-red-200">
          <p className="text-sm text-red-600">Rechazadas</p>
          <p className="text-2xl font-bold text-red-700">{stats.rechazadas}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 overflow-x-auto pb-2">
        <Filter size={18} className="text-gray-400 flex-shrink-0" />
        {[
          { value: 'all', label: 'Todas' },
          { value: 'EN_PROCESO', label: 'En Proceso' },
          { value: 'VERIFIED', label: 'Verificado' },
          { value: 'COMPLETED', label: 'Completadas' },
          { value: 'REJECTED', label: 'Rechazadas' },
        ].map(filter => (
          <button
            key={filter.value}
            onClick={() => setStatusFilter(filter.value)}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${statusFilter === filter.value
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-50 text-red-700 rounded-xl border border-red-200">
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      )}

      {/* Transactions Table */}
      {filteredTransactions.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <History className="text-gray-400" size={32} />
          </div>
          <h3 className="text-lg font-semibold text-gray-700 mb-2">
            No hay operaciones
          </h3>
          <p className="text-gray-500 mb-6">
            {statusFilter !== 'all'
              ? 'No hay operaciones con este filtro'
              : 'Aún no has realizado ninguna operación'}
          </p>
          <Link href="/app/operaciones" className="btn-primary inline-flex items-center gap-2">
            <Plus size={20} />
            Crear Primera Operación
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Operación
                  </th>
                  <th className="text-left px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Envías
                  </th>
                  <th className="text-left px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Recibes
                  </th>
                  <th className="text-left px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Beneficiario
                  </th>
                  <th className="text-left px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="text-left px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Fecha
                  </th>
                  <th className="text-right px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredTransactions.map((tx) => {
                  const statusConfig = getStatusConfig(tx.status);
                  const StatusIcon = statusConfig.icon;
                  return (
                    <tr key={tx.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <p className="font-bold text-gray-900">{tx.transaction_number || tx.id.slice(0, 8)}</p>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <ArrowUpRight className="text-red-500" size={16} />
                          <span className="font-semibold text-gray-900">
                            {tx.from_currency?.symbol} {tx.amount_sent.toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                          </span>
                          <span className="text-gray-500 text-sm">{tx.from_currency?.code}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <ArrowDownLeft className="text-green-500" size={16} />
                          <span className="font-semibold text-gray-900">
                            {tx.to_currency?.symbol} {tx.amount_received.toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                          </span>
                          <span className="text-gray-500 text-sm">{tx.to_currency?.code}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-medium text-gray-900 truncate max-w-[150px]">
                          {tx.user_bank_account?.account_holder || '-'}
                        </p>
                        <p className="text-xs text-gray-500 truncate max-w-[150px]">
                          {tx.user_bank_account?.bank?.name || tx.user_bank_account?.bank_platform?.name || '-'}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${statusConfig.bgColor} ${statusConfig.textColor} border ${statusConfig.borderColor}`}>
                          <StatusIcon size={14} />
                          {statusConfig.label}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-gray-600">{formatDate(tx.created_at)}</p>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {/* Receipt Button for completed transactions */}
                          {tx.status === 'COMPLETED' && tx.payment_proof_url && (
                            <button
                              onClick={() => {
                                setModalType('receipt');
                                setSelectedTransaction(tx);
                              }}
                              className="flex items-center gap-1.5 text-emerald-600 hover:text-emerald-800 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors text-sm font-medium"
                            >
                              <Receipt size={16} />
                              Ver Pago
                            </button>
                          )}
                          <button
                            onClick={() => {
                              setModalType('details');
                              setSelectedTransaction(tx);
                            }}
                            className="text-blue-600 hover:text-blue-800 p-2 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Ver detalles"
                          >
                            <Eye size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden divide-y divide-gray-100">
            {filteredTransactions.map((tx) => {
              const statusConfig = getStatusConfig(tx.status);
              const StatusIcon = statusConfig.icon;
              return (
                <div
                  key={tx.id}
                  className="p-4 space-y-3 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => setSelectedTransaction(tx)}
                >
                  <div className="flex items-center justify-between">
                    <p className="font-bold text-gray-900">{tx.transaction_number || tx.id.slice(0, 8)}</p>
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${statusConfig.bgColor} ${statusConfig.textColor}`}>
                      <StatusIcon size={12} />
                      {statusConfig.label}
                    </span>
                  </div>

                  <div className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                    <div className="text-center">
                      <p className="text-xs text-gray-500 mb-1">Envías</p>
                      <p className="font-bold text-red-600">
                        {tx.from_currency?.symbol} {tx.amount_sent.toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                      </p>
                      <p className="text-xs text-gray-500">{tx.from_currency?.code}</p>
                    </div>
                    <ChevronRight className="text-gray-300" size={24} />
                    <div className="text-center">
                      <p className="text-xs text-gray-500 mb-1">Recibes</p>
                      <p className="font-bold text-green-600">
                        {tx.to_currency?.symbol} {tx.amount_received.toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                      </p>
                      <p className="text-xs text-gray-500">{tx.to_currency?.code}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <div>
                      <p className="text-gray-500">Beneficiario</p>
                      <p className="font-medium text-gray-900">{tx.user_bank_account?.account_holder || '-'}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-gray-500">Fecha</p>
                      <p className="font-medium text-gray-900">{formatDate(tx.created_at)}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Transaction Detail Modal */}
      {selectedTransaction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setSelectedTransaction(null)}
          />

          {/* Modal */}
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-auto animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between z-10">
              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  {modalType === 'receipt' ? 'Recibo de Pago' : 'Detalles de Operación'}
                </h2>
                <p className="text-sm text-gray-500">{selectedTransaction.transaction_number}</p>
              </div>
              <button
                onClick={() => setSelectedTransaction(null)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>

            {/* Content */}
            <div className="p-5 space-y-5">
              {modalType === 'receipt' ? (
                /* Receipt Modal - Only payment proof from company */
                <>
                  {/* Status Badge */}
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-100 text-green-700 border border-green-300">
                    <CheckCircle2 size={18} />
                    <span className="font-semibold">Pago Completado</span>
                  </div>

                  {/* Amount Received */}
                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-4 border border-green-100">
                    <p className="text-xs text-gray-500 mb-1 text-center">Monto Recibido</p>
                    <p className="text-2xl font-bold text-green-600 text-center">
                      {selectedTransaction.to_currency?.symbol} {selectedTransaction.amount_received.toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                    </p>
                    <p className="text-sm text-gray-500 text-center">{selectedTransaction.to_currency?.code}</p>
                  </div>

                  {/* Payment Reference */}
                  {selectedTransaction.payment_reference && (
                    <div className="space-y-3">
                      <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                        <FileText size={16} className="text-gray-400" />
                        Referencia de Pago
                      </h3>
                      <div className="bg-green-50 rounded-xl p-4 border border-green-200">
                        <p className="font-mono font-bold text-green-700">{selectedTransaction.payment_reference}</p>
                      </div>
                    </div>
                  )}

                  {/* Payment Date */}
                  {selectedTransaction.paid_at && (
                    <div className="space-y-3">
                      <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                        <Calendar size={16} className="text-gray-400" />
                        Fecha de Pago
                      </h3>
                      <div className="bg-green-50 rounded-xl p-4 border border-green-200">
                        <p className="font-medium text-green-700">{formatDate(selectedTransaction.paid_at)}</p>
                      </div>
                    </div>
                  )}

                  {/* Payment Proof Image */}
                  {selectedTransaction.payment_proof_url && (
                    <div className="space-y-3">
                      <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                        <Receipt size={16} className="text-green-500" />
                        Comprobante de Pago
                      </h3>
                      <div className="bg-green-50 rounded-xl p-3 border border-green-200">
                        <a
                          href={selectedTransaction.payment_proof_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block"
                        >
                          <img
                            src={selectedTransaction.payment_proof_url}
                            alt="Recibo de pago"
                            className="w-full rounded-lg border border-green-200 hover:opacity-90 transition-opacity"
                          />
                        </a>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                /* Details Modal - Full transaction details */
                <>
                  {/* Status Badge */}
                  {(() => {
                    const statusConfig = getStatusConfig(selectedTransaction.status);
                    const StatusIcon = statusConfig.icon;
                    return (
                      <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${statusConfig.bgColor} ${statusConfig.textColor} border ${statusConfig.borderColor}`}>
                        <StatusIcon size={18} />
                        <span className="font-semibold">{statusConfig.label}</span>
                      </div>
                    );
                  })()}

                  {/* Amounts */}
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-100">
                    <div className="flex items-center justify-between">
                      <div className="text-center flex-1">
                        <p className="text-xs text-gray-500 mb-1 flex items-center justify-center gap-1">
                          <ArrowUpRight size={14} className="text-red-500" />
                          Envías
                        </p>
                        <p className="text-xl font-bold text-red-600">
                          {selectedTransaction.from_currency?.symbol} {selectedTransaction.amount_sent.toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                        </p>
                        <p className="text-sm text-gray-500">{selectedTransaction.from_currency?.code}</p>
                      </div>
                      <ChevronRight className="text-gray-300 mx-2" size={24} />
                      <div className="text-center flex-1">
                        <p className="text-xs text-gray-500 mb-1 flex items-center justify-center gap-1">
                          <ArrowDownLeft size={14} className="text-green-500" />
                          Recibe
                        </p>
                        <p className="text-xl font-bold text-green-600">
                          {selectedTransaction.to_currency?.symbol} {selectedTransaction.amount_received.toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                        </p>
                        <p className="text-sm text-gray-500">{selectedTransaction.to_currency?.code}</p>
                      </div>
                    </div>
                    <div className="mt-3 pt-3 border-t border-blue-200 text-center">
                      <p className="text-xs text-gray-500">Tasa aplicada</p>
                      <p className="font-bold text-gray-700">
                        1 {selectedTransaction.from_currency?.code} = {selectedTransaction.exchange_rate_applied.toLocaleString('es-VE')} {selectedTransaction.to_currency?.code}
                      </p>
                    </div>
                  </div>

                  {/* Beneficiary Info */}
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                      <User size={16} className="text-gray-400" />
                      Beneficiario
                    </h3>
                    <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                      <p className="font-bold text-gray-900">{selectedTransaction.user_bank_account?.account_holder || 'No especificado'}</p>
                      <div className="flex items-center gap-2 mt-2 text-sm text-gray-600">
                        <Building size={14} className="text-gray-400" />
                        {selectedTransaction.user_bank_account?.bank?.name || selectedTransaction.user_bank_account?.bank_platform?.name || 'Banco no especificado'}
                      </div>
                      <p className="text-sm text-gray-500 font-mono mt-1">
                        {selectedTransaction.user_bank_account?.account_number || 'Sin número de cuenta'}
                      </p>
                    </div>
                  </div>

                  {/* Dates */}
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                      <Calendar size={16} className="text-gray-400" />
                      Fechas
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                        <p className="text-xs text-gray-500">Creada</p>
                        <p className="font-medium text-gray-900 text-sm">{formatDate(selectedTransaction.created_at)}</p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                        <p className="text-xs text-gray-500">Actualizada</p>
                        <p className="font-medium text-gray-900 text-sm">{formatDate(selectedTransaction.updated_at)}</p>
                      </div>
                      {selectedTransaction.taken_at && (
                        <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                          <p className="text-xs text-blue-600">Tomada</p>
                          <p className="font-medium text-blue-900 text-sm">{formatDate(selectedTransaction.taken_at)}</p>
                        </div>
                      )}
                      {selectedTransaction.paid_at && (
                        <div className="bg-green-50 rounded-lg p-3 border border-green-200">
                          <p className="text-xs text-green-600">Pagada</p>
                          <p className="font-medium text-green-900 text-sm">{formatDate(selectedTransaction.paid_at)}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Client Proof */}
                  {selectedTransaction.client_proof_url && (
                    <div className="space-y-3">
                      <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                        <ImageIcon size={16} className="text-gray-400" />
                        Tu Comprobante de Pago
                      </h3>
                      <div className="bg-gray-50 rounded-xl p-3 border border-gray-200">
                        {selectedTransaction.client_proof_url.split(',').map((url, index) => (
                          <a
                            key={index}
                            href={url.trim()}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block"
                          >
                            <img
                              src={url.trim()}
                              alt={`Comprobante ${index + 1}`}
                              className="w-full rounded-lg border border-gray-200 hover:opacity-90 transition-opacity mb-2 last:mb-0"
                            />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Admin Notes */}
                  {selectedTransaction.admin_notes && (
                    <div className="space-y-3">
                      <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                        <AlertCircle size={16} className="text-amber-500" />
                        Notas del Administrador
                      </h3>
                      <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
                        <p className="text-amber-800">{selectedTransaction.admin_notes}</p>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 p-4">
              <button
                onClick={() => setSelectedTransaction(null)}
                className="w-full btn-secondary"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
