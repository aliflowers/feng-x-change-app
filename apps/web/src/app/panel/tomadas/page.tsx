'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import {
  Clock,
  CheckCircle2,
  RefreshCw,
  Eye,
  Timer,
  Copy,
  Check,
  ArrowLeft,
  Upload,
  AlertTriangle,
  Loader2,
  X,
  FileText
} from 'lucide-react';

interface TakenOperation {
  id: string;
  transaction_number: string;
  amount_sent: number;
  amount_received: number;
  status: string;
  created_at: string;
  taken_at: string;
  from_currency: { code: string; symbol: string };
  to_currency: { code: string; symbol: string };
  user: { first_name: string; last_name: string; email: string };
  user_bank_account: {
    account_holder: string;
    account_number: string;
    document_type: string | null;
    document_number: string | null;
    bank_platform: { name: string };
  } | null;
}

export default function TomadasPage() {
  const [operations, setOperations] = useState<TakenOperation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string>('');
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(Date.now());

  // Modal states
  const [selectedOperation, setSelectedOperation] = useState<TakenOperation | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [showBeneficiaryModal, setShowBeneficiaryModal] = useState(false);

  // Payment form
  const [paymentReference, setPaymentReference] = useState('');
  const [paymentProofFile, setPaymentProofFile] = useState<File | null>(null);
  const [paymentProofPreview, setPaymentProofPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Error form
  const [errorNote, setErrorNote] = useState('');

  // Update current time every second for real-time countdown
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setCurrentUserId(user.id);
      loadOperations(user.id);

      // Get user role
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();
      if (profile) setUserRole(profile.role);
    }
  };

  const loadOperations = useCallback(async (userId?: string) => {
    const uid = userId || currentUserId;
    if (!uid) return;

    setRefreshing(true);
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select(`
          id,
          transaction_number,
          amount_sent,
          amount_received,
          status,
          created_at,
          taken_at,
          from_currency:currencies!transactions_from_currency_id_fkey(code, symbol),
          to_currency:currencies!transactions_to_currency_id_fkey(code, symbol),
          user:profiles!transactions_user_id_fkey(first_name, last_name, email),
          user_bank_account:user_bank_accounts(
            account_holder,
            account_number,
            document_type,
            document_number,
            bank_platform:banks_platforms(name)
          )
        `)
        .eq('status', 'TAKEN')
        .eq('taken_by', uid)
        .order('taken_at', { ascending: false });

      if (error) throw error;
      setOperations((data || []) as unknown as TakenOperation[]);
    } catch (error) {
      console.error('Error loading operations:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [currentUserId]);

  // Countdown timer: 15 minutes from when operation was taken
  const getCountdownTime = (takenAt: string) => {
    const takenTime = new Date(takenAt).getTime();
    const elapsedMs = currentTime - takenTime;
    const limitMs = 15 * 60 * 1000; // 15 minutes in milliseconds
    const remainingMs = limitMs - elapsedMs;

    const isOverdue = remainingMs < 0;
    const absMs = Math.abs(remainingMs);
    const totalSeconds = Math.floor(absMs / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    const formattedTime = `${isOverdue ? '-' : ''}${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

    return {
      text: formattedTime,
      isOverdue,
      isSuperAdmin: userRole === 'SUPER_ADMIN'
    };
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPaymentProofFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPaymentProofPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleMarkAsPaid = async () => {
    if (!selectedOperation || !paymentProofFile || !paymentReference.trim()) {
      alert('Por favor completa todos los campos');
      return;
    }

    setSubmitting(true);
    try {
      // Upload proof to Supabase Storage
      const fileExt = paymentProofFile.name.split('.').pop();
      const fileName = `payment_proofs/${selectedOperation.id}_${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('proofs')
        .upload(fileName, paymentProofFile);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: publicUrlData } = supabase.storage
        .from('proofs')
        .getPublicUrl(fileName);

      const proofUrl = publicUrlData.publicUrl;

      // Update transaction
      const { error: updateError } = await supabase
        .from('transactions')
        .update({
          status: 'COMPLETED',
          payment_proof_url: proofUrl,
          payment_reference: paymentReference.trim(),
          paid_at: new Date().toISOString(),
        })
        .eq('id', selectedOperation.id);

      if (updateError) throw updateError;

      // Send WhatsApp notification to client
      try {
        await fetch('/api/whatsapp/notify-payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            transactionId: selectedOperation.id,
            paymentReference: paymentReference.trim(),
            proofUrl,
          }),
        });
      } catch (notifyError) {
        console.error('Error sending WhatsApp notification:', notifyError);
        // No bloqueamos el flujo si falla la notificación
      }

      // Close modal and refresh
      setShowPaymentModal(false);
      setSelectedOperation(null);
      setPaymentReference('');
      setPaymentProofFile(null);
      setPaymentProofPreview(null);
      loadOperations();
    } catch (error) {
      console.error('Error marking as paid:', error);
      alert('Error al procesar el pago. Intenta de nuevo.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReportError = async () => {
    if (!selectedOperation || !errorNote.trim()) {
      alert('Por favor describe el error');
      return;
    }

    setSubmitting(true);
    try {
      // Return to pool with admin note
      const { error } = await supabase
        .from('transactions')
        .update({
          status: 'POOL',
          taken_by: null,
          taken_at: null,
          admin_notes: `Error reportado: ${errorNote.trim()}`,
        })
        .eq('id', selectedOperation.id);

      if (error) throw error;

      // Close modal and refresh
      setShowErrorModal(false);
      setSelectedOperation(null);
      setErrorNote('');
      loadOperations();
    } catch (error) {
      console.error('Error reporting:', error);
      alert('Error al reportar. Intenta de nuevo.');
    } finally {
      setSubmitting(false);
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
          <div className="flex items-center gap-3 mb-1">
            <Link href="/panel/pool" className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
              <ArrowLeft size={20} className="text-slate-600" />
            </Link>
            <h1 className="text-2xl font-bold text-slate-800">Mis Operaciones Tomadas</h1>
          </div>
          <p className="text-slate-500 ml-11">Operaciones pendientes de pago</p>
        </div>
        <button
          onClick={() => loadOperations()}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-xl hover:bg-slate-700 transition-colors disabled:opacity-50"
        >
          <RefreshCw size={18} className={refreshing ? 'animate-spin' : ''} />
          Actualizar
        </button>
      </div>

      {/* Operations List */}
      {operations.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Clock className="text-slate-400" size={32} />
          </div>
          <h3 className="text-lg font-semibold text-slate-700 mb-2">No tienes operaciones tomadas</h3>
          <p className="text-slate-500 mb-6">Toma operaciones del pool para verlas aquí</p>
          <Link
            href="/panel/pool"
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
          >
            Ir al Pool
          </Link>
        </div>
      ) : (
        <div className="grid gap-4">
          {operations.map((op) => {
            const timeInfo = getCountdownTime(op.taken_at);
            const showAsOverdue = timeInfo.isOverdue && !timeInfo.isSuperAdmin;
            return (
              <div
                key={op.id}
                className={`bg-white rounded-2xl border ${showAsOverdue ? 'border-red-300' : 'border-slate-200'} p-5 shadow-sm`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  {/* Left: Operation Info */}
                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Operation Number */}
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Operación</p>
                      <p className="font-bold text-slate-800">{op.transaction_number}</p>
                      <p className="text-xs text-slate-500">
                        {op.user.first_name} {op.user.last_name}
                      </p>
                    </div>

                    {/* Amount */}
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Monto a Pagar</p>
                      <p className="font-bold text-emerald-600">
                        {op.to_currency.symbol}{op.amount_received.toLocaleString('es-VE', { minimumFractionDigits: 2 })} {op.to_currency.code}
                      </p>
                    </div>

                    {/* Beneficiary */}
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Beneficiario</p>
                      <p className="font-medium text-slate-800">{op.user_bank_account?.account_holder || 'N/A'}</p>
                      <p className="text-xs text-slate-500">{op.user_bank_account?.bank_platform?.name || 'N/A'}</p>
                    </div>

                    {/* Countdown Timer */}
                    <div>
                      <p className="text-xs text-slate-500 mb-1">
                        {timeInfo.isSuperAdmin ? 'Tiempo' : 'Tiempo Restante'}
                      </p>
                      <div className={`flex items-center gap-1 ${timeInfo.isOverdue ? 'text-red-600' : 'text-emerald-600'}`}>
                        <Timer size={16} />
                        <span className="font-mono font-bold text-lg">{timeInfo.text}</span>
                        {showAsOverdue && (
                          <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full ml-1">
                            Demorada
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => {
                        setSelectedOperation(op);
                        setShowBeneficiaryModal(true);
                      }}
                      className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                      title="Ver datos"
                    >
                      <Eye size={20} className="text-slate-600" />
                    </button>
                    <button
                      onClick={() => {
                        setSelectedOperation(op);
                        setShowErrorModal(true);
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-colors"
                    >
                      <AlertTriangle size={18} />
                      Reportar Error
                    </button>
                    <button
                      onClick={() => {
                        setSelectedOperation(op);
                        setShowPaymentModal(true);
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors"
                    >
                      <CheckCircle2 size={18} />
                      Marcar Pagada
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Beneficiary Modal */}
      {showBeneficiaryModal && selectedOperation && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full">
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <h3 className="font-bold text-lg">Datos del Beneficiario</h3>
              <button onClick={() => { setShowBeneficiaryModal(false); setSelectedOperation(null); }} className="p-2 hover:bg-slate-100 rounded-lg">
                <X size={20} />
              </button>
            </div>
            <div className="p-5 space-y-3">
              {/* Account Holder */}
              <div className="flex items-center justify-between bg-slate-50 rounded-xl p-3 border border-slate-200">
                <div>
                  <p className="text-xs text-slate-500">Beneficiario</p>
                  <p className="font-bold text-slate-800">{selectedOperation.user_bank_account?.account_holder || 'N/A'}</p>
                </div>
                <button onClick={() => copyToClipboard(selectedOperation.user_bank_account?.account_holder || '', 'holder')} className="p-2 hover:bg-slate-200 rounded-lg">
                  {copiedField === 'holder' ? <Check size={18} className="text-emerald-600" /> : <Copy size={18} className="text-slate-500" />}
                </button>
              </div>

              {/* Document */}
              <div className="flex items-center justify-between bg-slate-50 rounded-xl p-3 border border-slate-200">
                <div>
                  <p className="text-xs text-slate-500">Documento</p>
                  <p className="font-mono font-bold text-slate-800">
                    {selectedOperation.user_bank_account?.document_type || ''}-{selectedOperation.user_bank_account?.document_number || 'N/A'}
                  </p>
                </div>
                <button onClick={() => copyToClipboard(`${selectedOperation.user_bank_account?.document_type || ''}-${selectedOperation.user_bank_account?.document_number || ''}`, 'document')} className="p-2 hover:bg-slate-200 rounded-lg">
                  {copiedField === 'document' ? <Check size={18} className="text-emerald-600" /> : <Copy size={18} className="text-slate-500" />}
                </button>
              </div>

              {/* Bank */}
              <div className="flex items-center justify-between bg-slate-50 rounded-xl p-3 border border-slate-200">
                <div>
                  <p className="text-xs text-slate-500">Banco</p>
                  <p className="font-bold text-slate-800">{selectedOperation.user_bank_account?.bank_platform?.name || 'N/A'}</p>
                </div>
                <button onClick={() => copyToClipboard(selectedOperation.user_bank_account?.bank_platform?.name || '', 'bank')} className="p-2 hover:bg-slate-200 rounded-lg">
                  {copiedField === 'bank' ? <Check size={18} className="text-emerald-600" /> : <Copy size={18} className="text-slate-500" />}
                </button>
              </div>

              {/* Account Number */}
              <div className="flex items-center justify-between bg-slate-50 rounded-xl p-3 border border-slate-200">
                <div>
                  <p className="text-xs text-slate-500">Número de Cuenta</p>
                  <p className="font-mono font-bold text-slate-800">{selectedOperation.user_bank_account?.account_number || 'N/A'}</p>
                </div>
                <button onClick={() => copyToClipboard(selectedOperation.user_bank_account?.account_number || '', 'account')} className="p-2 hover:bg-slate-200 rounded-lg">
                  {copiedField === 'account' ? <Check size={18} className="text-emerald-600" /> : <Copy size={18} className="text-slate-500" />}
                </button>
              </div>

              {/* Amount */}
              <div className="flex items-center justify-between bg-emerald-50 rounded-xl p-3 border border-emerald-200">
                <div>
                  <p className="text-xs text-emerald-600">Monto a Pagar</p>
                  <p className="font-bold text-emerald-700 text-lg">
                    {selectedOperation.to_currency.symbol}{selectedOperation.amount_received.toLocaleString('es-VE', { minimumFractionDigits: 2 })} {selectedOperation.to_currency.code}
                  </p>
                </div>
                <button onClick={() => copyToClipboard(selectedOperation.amount_received.toString(), 'amount')} className="p-2 hover:bg-emerald-100 rounded-lg">
                  {copiedField === 'amount' ? <Check size={18} className="text-emerald-600" /> : <Copy size={18} className="text-emerald-600" />}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && selectedOperation && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-auto">
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <h3 className="font-bold text-lg">Marcar como Pagada</h3>
              <button onClick={() => { setShowPaymentModal(false); setSelectedOperation(null); setPaymentReference(''); setPaymentProofFile(null); setPaymentProofPreview(null); }} className="p-2 hover:bg-slate-100 rounded-lg">
                <X size={20} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              {/* Summary */}
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                <div className="flex justify-between mb-2">
                  <span className="text-slate-500">Operación:</span>
                  <span className="font-bold">{selectedOperation.transaction_number}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Monto pagado:</span>
                  <span className="font-bold text-emerald-600">
                    {selectedOperation.to_currency.symbol}{selectedOperation.amount_received.toLocaleString('es-VE', { minimumFractionDigits: 2 })} {selectedOperation.to_currency.code}
                  </span>
                </div>
              </div>

              {/* Reference Number */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  <FileText size={16} className="inline mr-2" />
                  Número de Referencia
                </label>
                <input
                  type="text"
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                  placeholder="Ingresa el número de referencia del banco"
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
              </div>

              {/* Proof Upload */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  <Upload size={16} className="inline mr-2" />
                  Comprobante de Pago
                </label>
                {paymentProofPreview ? (
                  <div className="relative">
                    <img src={paymentProofPreview} alt="Preview" className="w-full rounded-xl border border-slate-200" />
                    <button
                      onClick={() => { setPaymentProofFile(null); setPaymentProofPreview(null); }}
                      className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full hover:bg-red-600"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <label className="block border-2 border-dashed border-slate-300 rounded-xl p-8 text-center cursor-pointer hover:bg-slate-50 transition-colors">
                    <Upload size={32} className="mx-auto text-slate-400 mb-2" />
                    <p className="text-slate-600">Haz clic para subir el comprobante</p>
                    <p className="text-xs text-slate-400 mt-1">JPG, PNG o PDF</p>
                    <input type="file" accept="image/*,.pdf" onChange={handleFileChange} className="hidden" />
                  </label>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => { setShowPaymentModal(false); setSelectedOperation(null); setPaymentReference(''); setPaymentProofFile(null); setPaymentProofPreview(null); }}
                  className="flex-1 py-3 border border-slate-200 rounded-xl font-medium hover:bg-slate-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleMarkAsPaid}
                  disabled={submitting || !paymentReference.trim() || !paymentProofFile}
                  className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Procesando...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={18} />
                      Confirmar Pago
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error Modal */}
      {showErrorModal && selectedOperation && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full">
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <h3 className="font-bold text-lg text-red-600">Reportar Error</h3>
              <button onClick={() => { setShowErrorModal(false); setSelectedOperation(null); setErrorNote(''); }} className="p-2 hover:bg-slate-100 rounded-lg">
                <X size={20} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                <p className="text-sm text-red-700">
                  <AlertTriangle size={16} className="inline mr-2" />
                  Al reportar un error, esta operación volverá al pool para ser tomada por otro usuario.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Describe el problema
                </label>
                <textarea
                  value={errorNote}
                  onChange={(e) => setErrorNote(e.target.value)}
                  placeholder="Ej: Cuenta bancaria no existe, datos incorrectos..."
                  rows={3}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => { setShowErrorModal(false); setSelectedOperation(null); setErrorNote(''); }}
                  className="flex-1 py-3 border border-slate-200 rounded-xl font-medium hover:bg-slate-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleReportError}
                  disabled={submitting || !errorNote.trim()}
                  className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Procesando...
                    </>
                  ) : (
                    <>
                      <AlertTriangle size={18} />
                      Reportar Error
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
