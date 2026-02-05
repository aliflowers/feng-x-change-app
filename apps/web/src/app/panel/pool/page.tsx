'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import {
  Inbox,
  Search,
  RefreshCw,
  Eye,
  Clock,
  CheckCircle2,
  XCircle,
  HandMetal,
  ExternalLink,
  X,
  Loader2,
  Timer,
  User,
  Building2,
  Copy,
  Check,
  ArrowRight,
  ShieldCheck,
  type LucideIcon
} from 'lucide-react';
import Link from 'next/link';

interface PoolOperation {
  id: string;
  transaction_number: string;
  amount_sent: number;
  amount_received: number;
  exchange_rate_applied: number;
  status: string;
  created_at: string;
  taken_at: string | null;
  client_proof_url: string | null;
  admin_notes: string | null;
  from_currency: { id: number; code: string; symbol: string };
  to_currency: { id: number; code: string; symbol: string };
  user: { id: string; first_name: string; last_name: string; email: string };
  user_bank_account: {
    id: string;
    account_holder: string;
    account_number: string;
    document_type: string | null;
    document_number: string | null;
    bank: { id: number; name: string } | null;
  } | null;
  taken_by_profile: { first_name: string; last_name: string } | null;
}

interface Currency {
  id: number;
  code: string;
  name: string;
}

const statusConfig: Record<string, { label: string; color: string; icon: LucideIcon; bgColor: string }> = {
  POOL: { label: 'Por verificar', color: 'text-amber-600', icon: Inbox, bgColor: 'bg-amber-100' },
  VERIFIED: { label: 'Verificada', color: 'text-purple-600', icon: ShieldCheck, bgColor: 'bg-purple-100' },
  TAKEN: { label: 'Tomada', color: 'text-blue-600', icon: Clock, bgColor: 'bg-blue-100' },
  COMPLETED: { label: 'Completada', color: 'text-emerald-600', icon: CheckCircle2, bgColor: 'bg-emerald-100' },
  REJECTED: { label: 'Rechazada', color: 'text-red-600', icon: XCircle, bgColor: 'bg-red-100' },
};

export default function PoolPage() {
  const [operations, setOperations] = useState<PoolOperation[]>([]);
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string>('');

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [currencyFilter, setCurrencyFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modal states
  const [selectedOperation, setSelectedOperation] = useState<PoolOperation | null>(null);
  const [showProofModal, setShowProofModal] = useState(false);
  const [showTakeModal, setShowTakeModal] = useState(false);
  const [showBeneficiaryModal, setShowBeneficiaryModal] = useState(false);
  const [takenOperation, setTakenOperation] = useState<PoolOperation | null>(null);
  const [takingOperation, setTakingOperation] = useState(false);
  const [verifyingOperation, setVerifyingOperation] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Reject modal states
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectingOperation, setRejectingOperation] = useState<PoolOperation | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [isRejecting, setIsRejecting] = useState(false);

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (currentUserId) {
      loadOperations();
    }
  }, [statusFilter, currencyFilter, currentUserId]);

  const loadInitialData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setCurrentUserId(user.id);

      // Get user role
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profile) setUserRole(profile.role);

      // Load currencies
      const { data: currenciesData } = await supabase
        .from('currencies')
        .select('id, code, name')
        .eq('is_active', true);
      if (currenciesData) setCurrencies(currenciesData);
    } catch (error) {
      console.error('Error loading initial data:', error);
    }
  };

  const loadOperations = useCallback(async () => {
    if (!currentUserId) return;

    setRefreshing(true);
    try {
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
          taken_at,
          client_proof_url,
          admin_notes,
          from_currency:currencies!transactions_from_currency_id_fkey(id, code, symbol),
          to_currency:currencies!transactions_to_currency_id_fkey(id, code, symbol),
          user:profiles!transactions_user_id_fkey(id, first_name, last_name, email),
          user_bank_account:user_bank_accounts(
            id,
            account_holder,
            account_number,
            document_type,
            document_number,
            bank:banks(id, name)
          ),
          taken_by_profile:profiles!transactions_taken_by_fkey(first_name, last_name)
        `)
        .order('created_at', { ascending: false });

      // Apply filters
      if (statusFilter) {
        query = query.eq('status', statusFilter);
      }

      if (currencyFilter) {
        query = query.or(`from_currency_id.eq.${currencyFilter},to_currency_id.eq.${currencyFilter}`);
      }

      const { data, error } = await query.limit(50);

      if (error) throw error;

      // Apply search filter client-side
      let filteredData = data as unknown as PoolOperation[];
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        filteredData = filteredData.filter(op =>
          op.transaction_number?.toLowerCase().includes(query) ||
          op.user?.first_name?.toLowerCase().includes(query) ||
          op.user?.last_name?.toLowerCase().includes(query) ||
          op.user?.email?.toLowerCase().includes(query)
        );
      }

      setOperations(filteredData);
    } catch (error) {
      console.error('Error loading operations:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [currentUserId, statusFilter, currencyFilter, searchQuery]);

  const handleTakeOperation = async (operation: PoolOperation) => {
    if (takingOperation) return;
    setTakingOperation(true);

    try {
      const { error } = await supabase
        .from('transactions')
        .update({
          status: 'TAKEN',
          taken_by: currentUserId,
          taken_at: new Date().toISOString(),
        })
        .eq('id', operation.id)
        .eq('status', 'VERIFIED'); // Only take if VERIFIED

      if (error) throw error;

      // Show beneficiary modal with the taken operation data
      setTakenOperation(operation);
      setShowTakeModal(false);
      setSelectedOperation(null);
      setShowBeneficiaryModal(true);

      // Refresh the list in background
      loadOperations();
    } catch (error) {
      console.error('Error taking operation:', error);
      alert('Error al tomar la operación. Puede que ya haya sido tomada por otro usuario.');
    } finally {
      setTakingOperation(false);
    }
  };

  const handleVerifyOperation = async (operation: PoolOperation) => {
    if (verifyingOperation) return;
    if (userRole !== 'SUPER_ADMIN') {
      alert('Solo el Super Admin puede verificar operaciones.');
      return;
    }
    setVerifyingOperation(true);

    try {
      const { error } = await supabase
        .from('transactions')
        .update({
          status: 'VERIFIED',
        })
        .eq('id', operation.id)
        .eq('status', 'POOL');

      if (error) throw error;

      // Enviar notificación WhatsApp a usuarios operativos
      try {
        await fetch('/api/whatsapp/notify-verified-operation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ transactionId: operation.id }),
        });
      } catch (notifyError) {
        console.error('Error sending verification notification:', notifyError);
      }

      // Refresh the list
      loadOperations();
    } catch (error) {
      console.error('Error verifying operation:', error);
      alert('Error al verificar la operación.');
    } finally {
      setVerifyingOperation(false);
    }
  };

  const openRejectModal = (operation: PoolOperation) => {
    setRejectingOperation(operation);
    setRejectReason('');
    setShowRejectModal(true);
  };

  const closeRejectModal = () => {
    setShowRejectModal(false);
    setRejectingOperation(null);
    setRejectReason('');
  };

  const handleRejectOperation = async () => {
    if (!rejectingOperation || !rejectReason.trim()) {
      alert('Por favor ingresa el motivo del rechazo.');
      return;
    }
    setIsRejecting(true);

    try {
      // Actualizar estado a REJECTED
      const { error } = await supabase
        .from('transactions')
        .update({
          status: 'REJECTED',
          admin_notes: rejectReason.trim(),
        })
        .eq('id', rejectingOperation.id);

      if (error) throw error;

      // Enviar notificación WhatsApp al cliente
      try {
        await fetch('/api/whatsapp/notify-rejection', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            transactionId: rejectingOperation.id,
            reason: rejectReason.trim(),
          }),
        });
      } catch (notifyError) {
        console.error('Error sending rejection notification:', notifyError);
      }

      // Cerrar modal y refrescar
      closeRejectModal();
      loadOperations();
    } catch (error) {
      console.error('Error rejecting operation:', error);
      alert('Error al rechazar la operación.');
    } finally {
      setIsRejecting(false);
    }
  };

  const copyToClipboard = async (text: string, fieldName: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(fieldName);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (error) {
      console.error('Error copying:', error);
    }
  };

  const copyAllBeneficiaryData = async () => {
    if (!takenOperation?.user_bank_account) return;
    const acc = takenOperation.user_bank_account;
    const allData = `Beneficiario: ${acc.account_holder}
Documento: ${acc.document_type || ''}-${acc.document_number || 'N/A'}
Banco: ${acc.bank?.name || 'N/A'}
Número de cuenta: ${acc.account_number}
Monto a pagar: ${takenOperation.to_currency?.symbol}${takenOperation.amount_received.toLocaleString('es-VE', { minimumFractionDigits: 2 })} ${takenOperation.to_currency?.code}`;
    await copyToClipboard(allData, 'all');
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-VE', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getTimeInPool = (createdAt: string) => {
    const minutes = Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000);
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ${minutes % 60}m`;
    return `${Math.floor(hours / 24)}d ${hours % 24}h`;
  };

  // Helper para parsear datos del OCR
  const parseOcrData = (adminNotes: string | null): { amount?: number; reference?: string; date?: string; bank?: string } | null => {
    if (!adminNotes) return null;
    try {
      return JSON.parse(adminNotes);
    } catch {
      // Formato legacy: "OCR Ref: XXX"
      const refMatch = adminNotes.match(/Ref[:\s]+([A-Za-z0-9]+)/i);
      if (refMatch) return { reference: refMatch[1] };
      return null;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <RefreshCw className="w-8 h-8 text-slate-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Pool de Operaciones</h1>
          <p className="text-slate-500">Operaciones pendientes de procesar</p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/panel/tomadas"
            className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-xl hover:bg-amber-600 transition-colors"
          >
            <Clock size={18} />
            Mis Tomadas
            <ArrowRight size={16} />
          </Link>
          <button
            onClick={() => loadOperations()}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-xl hover:bg-slate-700 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={18} className={refreshing ? 'animate-spin' : ''} />
            Actualizar
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200">
        <div className="flex flex-wrap gap-4">
          {/* Search */}
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                placeholder="Buscar por número, cliente..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-800 focus:border-transparent"
              />
            </div>
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-800"
          >
            <option value="">Todos los estados</option>
            <option value="POOL">Por verificar</option>
            <option value="VERIFIED">Verificadas</option>
            <option value="TAKEN">Tomadas</option>
            <option value="COMPLETED">Completadas</option>
            <option value="REJECTED">Rechazadas</option>
          </select>

          {/* Currency Filter */}
          <select
            value={currencyFilter}
            onChange={(e) => setCurrencyFilter(e.target.value)}
            className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-800"
          >
            <option value="">Todas las monedas</option>
            {currencies.map((curr) => (
              <option key={curr.id} value={curr.id}>
                {curr.code} - {curr.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Operations Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {operations.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Inbox className="text-slate-400" size={32} />
            </div>
            <h3 className="text-lg font-semibold text-slate-700 mb-2">
              No hay operaciones
            </h3>
            <p className="text-slate-500">
              {statusFilter === 'POOL'
                ? 'No hay operaciones pendientes en el pool'
                : 'No se encontraron operaciones con los filtros seleccionados'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Operación
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Cliente
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Monto
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Destino
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Tiempo
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {operations.map((op) => {
                  const status = statusConfig[op.status] || statusConfig.POOL;
                  const StatusIcon = status.icon;
                  return (
                    <tr key={op.id} className="hover:bg-slate-50 transition-colors">
                      {/* Operation Number */}
                      <td className="px-4 py-4">
                        <div>
                          <p className="font-semibold text-slate-800">
                            {op.transaction_number || `OP-${op.id.slice(0, 8)}`}
                          </p>
                          <p className="text-xs text-slate-500">{formatDate(op.created_at)}</p>
                        </div>
                      </td>

                      {/* Client */}
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center">
                            <User size={14} className="text-slate-500" />
                          </div>
                          <div>
                            <p className="font-medium text-slate-800 text-sm">
                              {op.user?.first_name} {op.user?.last_name}
                            </p>
                            <p className="text-xs text-slate-500">{op.user?.email}</p>
                          </div>
                        </div>
                      </td>

                      {/* Amount */}
                      <td className="px-4 py-4">
                        <div>
                          <p className="font-bold text-slate-800">
                            {op.from_currency?.symbol}{op.amount_sent.toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                            <span className="text-xs text-slate-500 ml-1">{op.from_currency?.code}</span>
                          </p>
                          <p className="text-sm text-emerald-600">
                            → {op.to_currency?.symbol}{op.amount_received.toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                            <span className="text-xs ml-1">{op.to_currency?.code}</span>
                          </p>
                        </div>
                      </td>

                      {/* Destination Bank */}
                      <td className="px-4 py-4">
                        {op.user_bank_account ? (
                          <div className="flex items-center gap-2">
                            <Building2 size={14} className="text-slate-400" />
                            <div>
                              <p className="text-sm font-medium text-slate-700">
                                {op.user_bank_account.bank?.name || 'N/A'}
                              </p>
                              <p className="text-xs text-slate-500">
                                {op.user_bank_account.account_holder}
                              </p>
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-sm">No especificado</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <div className={`w-8 h-8 ${status.bgColor} rounded-lg flex items-center justify-center`}>
                            <StatusIcon size={16} className={status.color} />
                          </div>
                          <div>
                            <span className={`text-sm font-medium ${status.color}`}>
                              {status.label}
                            </span>
                            {op.status === 'TAKEN' && op.taken_by_profile && (
                              <p className="text-xs text-slate-500">
                                por {op.taken_by_profile.first_name}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Time in Pool */}
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-1 text-slate-600">
                          <Timer size={14} />
                          <span className="text-sm">{getTimeInPool(op.created_at)}</span>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-4">
                        <div className="flex items-center justify-end gap-2">
                          {/* View Proof */}
                          {op.client_proof_url && (
                            <button
                              onClick={() => {
                                setSelectedOperation(op);
                                setShowProofModal(true);
                              }}
                              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                              title="Ver comprobante"
                            >
                              <Eye size={18} className="text-slate-600" />
                            </button>
                          )}

                          {/* Verify Operation Button - Only for SUPER_ADMIN on POOL status */}
                          {op.status === 'POOL' && userRole === 'SUPER_ADMIN' && (
                            <>
                              <button
                                onClick={() => handleVerifyOperation(op)}
                                disabled={verifyingOperation}
                                className="flex items-center gap-1 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                              >
                                <ShieldCheck size={16} />
                                Verificar
                              </button>
                              <button
                                onClick={() => openRejectModal(op)}
                                className="flex items-center gap-1 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors"
                              >
                                <XCircle size={16} />
                                Rechazar
                              </button>
                            </>
                          )}

                          {/* Take Operation Button - Only for VERIFIED status */}
                          {op.status === 'VERIFIED' && (
                            <button
                              onClick={() => {
                                setSelectedOperation(op);
                                setShowTakeModal(true);
                              }}
                              className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
                            >
                              <HandMetal size={16} />
                              Tomar
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Proof Modal */}
      {showProofModal && selectedOperation && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <h3 className="font-bold text-lg">Comprobante del Cliente</h3>
              <button
                onClick={() => {
                  setShowProofModal(false);
                  setSelectedOperation(null);
                }}
                className="p-2 hover:bg-slate-100 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-4 overflow-y-auto max-h-[70vh]">
              {/* Operation Summary + OCR Data Combined */}
              {(() => {
                const ocrData = parseOcrData(selectedOperation.admin_notes);
                return (
                  <div className="mb-4 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-slate-500">Operación:</span>
                        <span className="font-bold ml-2">{selectedOperation.transaction_number}</span>
                      </div>
                      <div>
                        <span className="text-slate-500">Cliente:</span>
                        <span className="font-medium ml-2">{selectedOperation.user?.first_name} {selectedOperation.user?.last_name}</span>
                      </div>
                      <div>
                        <span className="text-slate-500">Envía:</span>
                        <span className="font-bold ml-2">{selectedOperation.from_currency?.symbol}{selectedOperation.amount_sent.toLocaleString('es-VE', { minimumFractionDigits: 2 })} {selectedOperation.from_currency?.code}</span>
                      </div>
                      <div>
                        <span className="text-slate-500">Recibe:</span>
                        <span className="font-bold text-emerald-600 ml-2">{selectedOperation.to_currency?.symbol}{selectedOperation.amount_received.toLocaleString('es-VE', { minimumFractionDigits: 2 })} {selectedOperation.to_currency?.code}</span>
                      </div>
                      {/* OCR Data in same grid */}
                      {ocrData?.reference && (
                        <div>
                          <span className="text-slate-500">Referencia:</span>
                          <span className="font-mono font-bold ml-2">{ocrData.reference}</span>
                        </div>
                      )}
                      {ocrData?.date && (
                        <div>
                          <span className="text-slate-500">Fecha:</span>
                          <span className="font-medium ml-2">{ocrData.date}</span>
                        </div>
                      )}
                      {ocrData?.bank && (
                        <div>
                          <span className="text-slate-500">Banco:</span>
                          <span className="font-medium ml-2">{ocrData.bank}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* Proof Image */}
              {selectedOperation.client_proof_url?.split(',').map((url, index) => (
                <div key={index} className="mb-4">
                  <img
                    src={url.trim()}
                    alt={`Comprobante ${index + 1}`}
                    className="w-full rounded-lg border border-slate-200"
                  />
                </div>
              ))}
              <a
                href={selectedOperation.client_proof_url?.split(',')[0]}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full py-3 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
              >
                <ExternalLink size={18} />
                Abrir en nueva pestaña
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Take Operation Modal */}
      {showTakeModal && selectedOperation && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full">
            <div className="p-6">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <HandMetal className="text-blue-600" size={32} />
              </div>
              <h3 className="text-xl font-bold text-center mb-2">¿Tomar esta operación?</h3>
              {userRole === 'SUPER_ADMIN' ? (
                <p className="text-slate-500 text-center mb-6">
                  Como Super Admin, puedes tomar esta operación sin límite de tiempo.
                </p>
              ) : (
                <p className="text-slate-500 text-center mb-6">
                  Al tomar esta operación tendrás <strong className="text-red-600">15 minutos</strong> para completar el pago.
                </p>
              )}

              <div className="bg-slate-50 rounded-xl p-4 mb-6 space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500">Operación:</span>
                  <span className="font-bold">{selectedOperation.transaction_number}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Cliente:</span>
                  <span className="font-medium">{selectedOperation.user?.first_name} {selectedOperation.user?.last_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Monto a pagar:</span>
                  <span className="font-bold text-emerald-600">
                    {selectedOperation.to_currency?.symbol}{selectedOperation.amount_received.toLocaleString('es-VE', { minimumFractionDigits: 2 })} {selectedOperation.to_currency?.code}
                  </span>
                </div>
                {selectedOperation.user_bank_account && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Banco destino:</span>
                    <span className="font-medium">{selectedOperation.user_bank_account.bank?.name || 'N/A'}</span>
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowTakeModal(false);
                    setSelectedOperation(null);
                  }}
                  className="flex-1 py-3 border border-slate-200 rounded-xl font-medium hover:bg-slate-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => handleTakeOperation(selectedOperation)}
                  disabled={takingOperation}
                  className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {takingOperation ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Tomando...
                    </>
                  ) : (
                    <>
                      <HandMetal size={18} />
                      Tomar Operación
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Beneficiary Modal (after taking operation) */}
      {showBeneficiaryModal && takenOperation && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full">
            <div className="p-6">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="text-emerald-600" size={32} />
              </div>
              <h3 className="text-xl font-bold text-center mb-2">¡Operación Tomada!</h3>
              <p className="text-slate-500 text-center mb-6">
                A continuación los datos del beneficiario para realizar el pago
              </p>

              {/* Beneficiary Data with Copy Buttons */}
              <div className="space-y-3 mb-6">
                {/* Account Holder */}
                <div className="flex items-center justify-between bg-slate-50 rounded-xl p-3 border border-slate-200">
                  <div>
                    <p className="text-xs text-slate-500">Beneficiario</p>
                    <p className="font-bold text-slate-800">
                      {takenOperation.user_bank_account?.account_holder || 'N/A'}
                    </p>
                  </div>
                  <button
                    onClick={() => copyToClipboard(takenOperation.user_bank_account?.account_holder || '', 'holder')}
                    className="p-2 hover:bg-slate-200 rounded-lg transition-colors"
                    title="Copiar"
                  >
                    {copiedField === 'holder' ? <Check size={18} className="text-emerald-600" /> : <Copy size={18} className="text-slate-500" />}
                  </button>
                </div>

                {/* Document */}
                <div className="flex items-center justify-between bg-slate-50 rounded-xl p-3 border border-slate-200">
                  <div>
                    <p className="text-xs text-slate-500">Documento</p>
                    <p className="font-mono font-bold text-slate-800">
                      {takenOperation.user_bank_account?.document_type || ''}-{takenOperation.user_bank_account?.document_number || 'N/A'}
                    </p>
                  </div>
                  <button
                    onClick={() => copyToClipboard(`${takenOperation.user_bank_account?.document_type || ''}-${takenOperation.user_bank_account?.document_number || ''}`, 'document')}
                    className="p-2 hover:bg-slate-200 rounded-lg transition-colors"
                    title="Copiar"
                  >
                    {copiedField === 'document' ? <Check size={18} className="text-emerald-600" /> : <Copy size={18} className="text-slate-500" />}
                  </button>
                </div>

                {/* Bank */}
                <div className="flex items-center justify-between bg-slate-50 rounded-xl p-3 border border-slate-200">
                  <div>
                    <p className="text-xs text-slate-500">Banco</p>
                    <p className="font-bold text-slate-800">
                      {takenOperation.user_bank_account?.bank?.name || 'N/A'}
                    </p>
                  </div>
                  <button
                    onClick={() => copyToClipboard(takenOperation.user_bank_account?.bank?.name || '', 'bank')}
                    className="p-2 hover:bg-slate-200 rounded-lg transition-colors"
                    title="Copiar"
                  >
                    {copiedField === 'bank' ? <Check size={18} className="text-emerald-600" /> : <Copy size={18} className="text-slate-500" />}
                  </button>
                </div>

                {/* Account Number */}
                <div className="flex items-center justify-between bg-slate-50 rounded-xl p-3 border border-slate-200">
                  <div>
                    <p className="text-xs text-slate-500">Número de Cuenta</p>
                    <p className="font-mono font-bold text-slate-800">
                      {takenOperation.user_bank_account?.account_number || 'N/A'}
                    </p>
                  </div>
                  <button
                    onClick={() => copyToClipboard(takenOperation.user_bank_account?.account_number || '', 'account')}
                    className="p-2 hover:bg-slate-200 rounded-lg transition-colors"
                    title="Copiar"
                  >
                    {copiedField === 'account' ? <Check size={18} className="text-emerald-600" /> : <Copy size={18} className="text-slate-500" />}
                  </button>
                </div>

                {/* Amount to Pay */}
                <div className="flex items-center justify-between bg-emerald-50 rounded-xl p-3 border border-emerald-200">
                  <div>
                    <p className="text-xs text-emerald-600">Monto a Pagar</p>
                    <p className="font-bold text-emerald-700 text-lg">
                      {takenOperation.to_currency?.symbol}{takenOperation.amount_received.toLocaleString('es-VE', { minimumFractionDigits: 2 })} {takenOperation.to_currency?.code}
                    </p>
                  </div>
                  <button
                    onClick={() => copyToClipboard(takenOperation.amount_received.toString(), 'amount')}
                    className="p-2 hover:bg-emerald-100 rounded-lg transition-colors"
                    title="Copiar"
                  >
                    {copiedField === 'amount' ? <Check size={18} className="text-emerald-600" /> : <Copy size={18} className="text-emerald-600" />}
                  </button>
                </div>
              </div>

              {/* Copy All Button */}
              <button
                onClick={copyAllBeneficiaryData}
                className="w-full py-3 mb-3 bg-slate-100 hover:bg-slate-200 rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
              >
                {copiedField === 'all' ? (
                  <>
                    <Check size={18} className="text-emerald-600" />
                    <span className="text-emerald-600">¡Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy size={18} />
                    Copiar Todos los Datos
                  </>
                )}
              </button>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowBeneficiaryModal(false);
                    setTakenOperation(null);
                  }}
                  className="flex-1 py-3 border border-slate-200 rounded-xl font-medium hover:bg-slate-50 transition-colors"
                >
                  Cerrar
                </button>
                <Link
                  href="/panel/tomadas"
                  className="flex-1 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
                >
                  Ir a Mis Tomadas
                  <ArrowRight size={18} />
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reject Operation Modal */}
      {showRejectModal && rejectingOperation && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl animate-in fade-in zoom-in duration-200">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
                  <XCircle className="text-red-600" size={20} />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">Rechazar Transacción</h3>
                  <p className="text-sm text-slate-500">{rejectingOperation.transaction_number}</p>
                </div>
              </div>
              <button
                onClick={closeRejectModal}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X size={20} className="text-slate-500" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              <div>
                <p className="text-sm text-slate-600 mb-2">
                  Cliente: <span className="font-medium text-slate-900">{rejectingOperation.user.first_name} {rejectingOperation.user.last_name}</span>
                </p>
                <p className="text-sm text-slate-600">
                  Monto: <span className="font-medium text-slate-900">{rejectingOperation.from_currency.symbol}{rejectingOperation.amount_sent.toLocaleString('es-VE', { minimumFractionDigits: 2 })} {rejectingOperation.from_currency.code}</span>
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Motivo del rechazo <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Escribe el motivo por el cual se rechaza esta transacción. Este mensaje será enviado al cliente por WhatsApp."
                  rows={4}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-200 focus:border-red-400 transition-all resize-none"
                />
                <p className="text-xs text-slate-400 mt-1">
                  Este mensaje será enviado al cliente vía WhatsApp.
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 p-6 border-t border-slate-100">
              <button
                onClick={closeRejectModal}
                disabled={isRejecting}
                className="flex-1 py-3 border border-slate-200 rounded-xl font-medium hover:bg-slate-50 transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleRejectOperation}
                disabled={isRejecting || !rejectReason.trim()}
                className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isRejecting ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Rechazando...
                  </>
                ) : (
                  <>
                    <XCircle size={18} />
                    Confirmar Rechazo
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
