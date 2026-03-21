'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Plus, Trash2, Wallet, Building2, Edit2, LayoutGrid, List } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { UserBankAccount } from '@fengxchange/shared/types';

// Extended type to include joined bank info
interface ExtendedUserBankAccount extends UserBankAccount {
  bank: {
    name: string;
    currency_code: string;
  } | null;
}

// Mapeo de logos de bancos/plataformas usando Clearbit Logo API
const getBankLogoUrl = (bankName: string): string | null => {
  const bankDomains: Record<string, string> = {
    // Venezuela
    'Banesco': 'banesco.com',
    'Banco Mercantil': 'mercantilbanco.com',
    'Banco de Venezuela': 'bancodevenezuela.com',
    'BBVA Provincial': 'provincial.com',
    'Banco del Tesoro': 'bt.gob.ve',
    'Banco Bicentenario': 'bicentenariobu.com.ve',
    'Banco Exterior': 'bancoexterior.com',
    'Banco Occidental de Descuento': 'bod.com.ve',
    'Banco Nacional de Crédito': 'bnc.com.ve',
    'Banco Activo': 'bancoactivo.com',
    // Colombia
    'Bancolombia': 'bancolombia.com',
    'Banco de Bogotá': 'bancodebogota.com',
    'Banco Davivienda': 'davivienda.com',
    'BBVA Colombia': 'bbva.com.co',
    'Nequi': 'nequi.com.co',
    'DaviPlata': 'daviplata.com',
    // Perú
    'BCP (Banco de Crédito del Perú)': 'viabcp.com',
    'Interbank': 'interbank.pe',
    'BBVA Perú': 'bbva.pe',
    'Scotiabank Perú': 'scotiabank.com.pe',
    'Yape': 'yape.com.pe',
    // Chile
    'Banco de Chile': 'bancochile.cl',
    'Banco Santander Chile': 'santander.cl',
    'BancoEstado': 'bancoestado.cl',
    // Plataformas digitales
    'PayPal': 'paypal.com',
    'Wise': 'wise.com',
    'Zelle': 'zellepay.com',
    'Payoneer': 'payoneer.com',
    'Binance Pay': 'binance.com',
    'Zinli': 'zinli.com',
    'Venmo': 'venmo.com',
    'CashApp': 'cash.app',
    'Skrill': 'skrill.com',
    'Revolut': 'revolut.com',
  };

  const domain = bankDomains[bankName];
  return domain ? `https://logo.clearbit.com/${domain}` : null;
};

export default function BeneficiariesPage() {
  const [beneficiaries, setBeneficiaries] = useState<ExtendedUserBankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');

  useEffect(() => {
    fetchBeneficiaries();
  }, []);

  const fetchBeneficiaries = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('user_bank_accounts')
        .select(`
         *,
         bank:banks (
           name,
           currency_code
         )
       `)
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching accounts:', error);
      } else {
        // Cast likely unsafe but quick for now - verifying structure
        setBeneficiaries(data as any);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar esta cuenta? Esta acción no se puede deshacer.')) return;

    try {
      // Hard delete - eliminar completamente de la base de datos
      const { error } = await supabase
        .from('user_bank_accounts')
        .delete()
        .eq('id', id);

      if (error) throw error;

      // Optimistic update
      setBeneficiaries(prev => prev.filter(b => b.id !== id));
    } catch (err) {
      alert('Error eliminando la cuenta');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header con Título y Botón Crear */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mis Cuentas</h1>
          <p className="text-gray-500 text-sm">Administra tus cuentas bancarias y de pago móvil.</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Toggle de Vista */}
          <div className="flex items-center bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('cards')}
              className={`p-2 rounded-md transition-colors ${viewMode === 'cards' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
              title="Vista de tarjetas"
            >
              <LayoutGrid size={18} />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-2 rounded-md transition-colors ${viewMode === 'table' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
              title="Vista de tabla"
            >
              <List size={18} />
            </button>
          </div>
          <Link href="/app/beneficiarios/nuevo" className="btn-primary flex items-center gap-2 shadow-lg shadow-blue-600/20">
            <Plus size={20} />
            Nueva Cuenta
          </Link>
        </div>
      </div>

      {/* Estado de Carga */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-pulse">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-40 bg-gray-100 rounded-2xl border border-gray-200"></div>
          ))}
        </div>
      ) : beneficiaries.length === 0 ? (
        // Estado Vacío (Empty State)
        <div className="card text-center py-16 flex flex-col items-center border-dashed border-2 bg-gray-50/50">
          <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-4">
            <Wallet size={32} />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">No tienes cuentas registradas</h3>
          <p className="text-gray-500 max-w-sm mb-8">
            Agrega tu primera cuenta bancaria o pago móvil para recibir tus cambios de divisas.
          </p>
          <Link href="/app/beneficiarios/nuevo" className="btn-outline">
            Agregar Cuenta
          </Link>
        </div>
      ) : viewMode === 'cards' ? (
        // Vista de Tarjetas
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {beneficiaries.map((acc) => {
            const bankName = acc.bank?.name || 'Sin banco';
            const currencyCode = acc.bank?.currency_code || '';
            return (
              <div key={acc.id} className="group relative bg-white border border-gray-200 rounded-2xl p-6 hover:shadow-xl transition-all duration-300 hover:border-blue-300">
                <div className="flex justify-between items-start mb-5">
                  <div className="flex items-center gap-4">
                    {(() => {
                      const logoUrl = getBankLogoUrl(bankName);
                      return logoUrl ? (
                        <img
                          src={logoUrl}
                          alt={bankName}
                          className="w-14 h-14 rounded-xl object-contain bg-white border border-gray-100 p-2 shadow-sm"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            e.currentTarget.nextElementSibling?.classList.remove('hidden');
                          }}
                        />
                      ) : null;
                    })()}
                    <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${getBankLogoUrl(bankName) ? 'hidden' : ''
                      } ${currencyCode === 'VES' ? 'bg-yellow-100 text-yellow-700' :
                        currencyCode === 'USD' ? 'bg-green-100 text-green-700' :
                          'bg-blue-100 text-blue-700'
                      }`}>
                      <Building2 size={28} />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-lg font-bold text-gray-900 leading-tight">{bankName}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-sm font-semibold text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                          {currencyCode}
                        </span>
                        <Link
                          href={`/app/operaciones?beneficiaryId=${acc.id}`}
                          className="bg-green-500 hover:bg-green-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-sm transition-colors"
                        >
                          Enviar
                        </Link>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/app/beneficiarios/${acc.id}`}
                      className="text-gray-400 hover:text-blue-500 p-2 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Editar cuenta"
                    >
                      <Edit2 size={20} />
                    </Link>
                    <button
                      onClick={() => handleDelete(acc.id)}
                      className="text-gray-400 hover:text-red-500 p-2 hover:bg-red-50 rounded-lg transition-colors"
                      title="Eliminar cuenta"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wider font-bold mb-1">Titular</p>
                    <p className="text-lg font-bold text-gray-900">{acc.account_holder}</p>
                    <p className="text-base font-semibold text-gray-600">{acc.document_number}</p>
                  </div>

                  {acc.pago_movil_phone ? (
                    /* Pago Móvil: mostrar teléfono y banco emisor */
                    <div className="space-y-2">
                      <div>
                        <p className="text-xs text-gray-400 uppercase tracking-wider font-bold mb-1">Teléfono</p>
                        <p className="text-lg font-mono font-bold text-gray-900 bg-gray-50 px-4 py-2 rounded-xl border border-gray-200 select-all">
                          {acc.pago_movil_phone}
                        </p>
                      </div>
                      {acc.pago_movil_bank_code && (
                        <div>
                          <p className="text-xs text-gray-400 uppercase tracking-wider font-bold mb-1">Código Banco</p>
                          <p className="text-base font-mono font-semibold text-gray-700 bg-gray-50 px-4 py-1.5 rounded-xl border border-gray-200 select-all">
                            {acc.pago_movil_bank_code}
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    /* Cuenta bancaria normal */
                    <div>
                      <p className="text-xs text-gray-400 uppercase tracking-wider font-bold mb-1">Número de Cuenta</p>
                      <p className="text-lg font-mono font-bold text-gray-900 bg-gray-50 px-4 py-2 rounded-xl border border-gray-200 select-all break-all">
                        {acc.account_number}
                      </p>
                    </div>
                  )}
                </div>

                {acc.alias && (
                  <div className="absolute top-0 right-0 -mt-2 -mr-2 bg-blue-600 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg">
                    {acc.alias}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        // Vista de Tabla
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Banco / Plataforma</th>
                  <th className="text-left px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Titular</th>
                  <th className="text-left px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Documento</th>
                  <th className="text-left px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Cuenta / Teléfono</th>
                  <th className="text-center px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {beneficiaries.map((acc) => {
                  const bankName = acc.bank?.name || 'Sin banco';
                  const currencyCode = acc.bank?.currency_code || '';
                  return (
                    <tr key={acc.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {(() => {
                            const logoUrl = getBankLogoUrl(bankName);
                            return logoUrl ? (
                              <img src={logoUrl} alt="" className="w-8 h-8 rounded-lg object-contain bg-white border border-gray-100 p-1" />
                            ) : (
                              <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
                                <Building2 size={16} className="text-gray-500" />
                              </div>
                            );
                          })()}
                          <div>
                            <p className="font-semibold text-gray-900">{bankName}</p>
                            <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                              {currencyCode}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-semibold text-gray-900">{acc.account_holder}</p>
                        {acc.alias && <span className="text-xs text-blue-600 font-medium">({acc.alias})</span>}
                      </td>
                      <td className="px-6 py-4 text-gray-700 font-medium">{acc.document_number}</td>
                      <td className="px-6 py-4">
                        {acc.pago_movil_phone ? (
                          <div>
                            <code className="text-sm font-mono bg-gray-100 px-3 py-1 rounded-lg text-gray-800 select-all">
                              {acc.pago_movil_phone}
                            </code>
                            <span className="text-xs text-gray-400 ml-2">PM</span>
                          </div>
                        ) : (
                          <code className="text-sm font-mono bg-gray-100 px-3 py-1 rounded-lg text-gray-800 select-all">
                            {acc.account_number}
                          </code>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <Link
                            href={`/app/operaciones?beneficiaryId=${acc.id}`}
                            className="bg-green-500 hover:bg-green-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-sm transition-colors"
                            title="Enviar"
                          >
                            Enviar
                          </Link>
                          <Link
                            href={`/app/beneficiarios/${acc.id}`}
                            className="text-blue-600 hover:text-blue-800 p-2 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Editar"
                          >
                            <Edit2 size={18} />
                          </Link>
                          <button
                            onClick={() => handleDelete(acc.id)}
                            className="text-red-500 hover:text-red-700 p-2 hover:bg-red-50 rounded-lg transition-colors"
                            title="Eliminar"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
