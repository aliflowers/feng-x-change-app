'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { supabase } from '@/lib/supabase/client';
import {
  ArrowRight,
  Search,
  Loader2,
  RefreshCw,
  AlertCircle,
  Check,
  X
} from 'lucide-react';

interface ExchangeRate {
  id: number;
  from_currency_id: number;
  to_currency_id: number;
  rate: number;
  is_active: boolean;
  updated_at: string;
  from_currency?: { code: string; name: string; symbol: string };
  to_currency?: { code: string; name: string; symbol: string };
}

// Banderas disponibles en /flags/
const countryFlags: Record<string, string> = {
  'USD': '/flags/us.svg',
  'VES': '/flags/ve.svg',
  'COP': '/flags/co.svg',
  'PEN': '/flags/pe.svg',
  'CLP': '/flags/cl.svg',
  'PAB': '/flags/pa.svg',
  'EUR': '/flags/eu.svg',
  'PAYPAL': '/flags/PayPal.svg',
  'ZINLI': '/flags/Zinli.jpg',
  'USDT': '/flags/usdt.svg',
};

// Códigos que no muestran texto (solo icono)
const hideTextCodes: string[] = [];

const CountryFlag = ({ code, size = 24 }: { code: string; size?: number }) => {
  const flagPath = countryFlags[code];

  if (!flagPath) return null;

  return (
    <div className="relative overflow-hidden rounded-full shadow-sm border border-slate-100 flex-shrink-0" style={{ width: size, height: size }}>
      <Image
        src={flagPath}
        alt={code}
        fill
        className="object-cover"
      />
    </div>
  );
};

export default function TasasPage() {
  const [rates, setRates] = useState<ExchangeRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<string | 'ALL'>('ALL');

  // Estado local para edición inline (id -> value)
  const [editValues, setEditValues] = useState<Record<number, string>>({});

  useEffect(() => {
    fetchRates();
  }, []);

  const fetchRates = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('exchange_rates')
        .select(`
          *,
          from_currency:currencies!exchange_rates_from_currency_id_fkey(code, name, symbol),
          to_currency:currencies!exchange_rates_to_currency_id_fkey(code, name, symbol)
        `)
        .order('id');

      if (error) throw error;
      setRates(data || []);
    } catch (error) {
      console.error('Error fetching rates:', error);
      alert('Error al cargar las tasas');
    } finally {
      setLoading(false);
    }
  };

  const handleRateChange = (id: number, value: string) => {
    setEditValues(prev => ({ ...prev, [id]: value }));
  };

  const cancelEdit = (id: number) => {
    const newEditValues = { ...editValues };
    delete newEditValues[id];
    setEditValues(newEditValues);
  };

  const saveRate = async (id: number) => {
    const newValue = parseFloat(editValues[id]);
    if (isNaN(newValue) || newValue <= 0) return;

    setUpdating(id);
    try {
      const { error } = await supabase
        .from('exchange_rates')
        .update({ rate: newValue })
        .eq('id', id);

      if (error) throw error;

      // Actualizar estado local
      setRates(prev => prev.map(r => r.id === id ? { ...r, rate: newValue } : r));

      // Limpiar valor de edición
      cancelEdit(id);

    } catch (error) {
      console.error('Error updating rate:', error);
      alert('Error al actualizar la tasa');
    } finally {
      setUpdating(null);
    }
  };

  const toggleActive = async (id: number, currentState: boolean) => {
    setUpdating(id);
    try {
      const { error } = await supabase
        .from('exchange_rates')
        .update({ is_active: !currentState })
        .eq('id', id);

      if (error) throw error;

      setRates(prev => prev.map(r => r.id === id ? { ...r, is_active: !currentState } : r));
    } catch (error) {
      console.error('Error toggling status:', error);
      alert('Error al cambiar el estado');
    } finally {
      setUpdating(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, id: number) => {
    if (e.key === 'Enter') {
      saveRate(id);
      (e.target as HTMLInputElement).blur();
    } else if (e.key === 'Escape') {
      cancelEdit(id);
      (e.target as HTMLInputElement).blur();
    }
  };

  // Obtener monedas únicas para los filtros
  const uniqueCurrencies = Array.from(new Set(rates.map(r => r.from_currency?.code))).filter(Boolean) as string[];

  const filteredRates = rates.filter(r => {
    const search = searchTerm.toLowerCase();
    const matchesSearch = (
      r.from_currency?.code.toLowerCase().includes(search) ||
      r.to_currency?.code.toLowerCase().includes(search) ||
      r.from_currency?.name.toLowerCase().includes(search) ||
      r.to_currency?.name.toLowerCase().includes(search)
    );

    const matchesFilter = activeFilter === 'ALL' || r.from_currency?.code === activeFilter;

    return matchesSearch && matchesFilter;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <RefreshCw className="text-blue-600" size={28} />
              Gestión de Tasas
            </h1>
            <p className="text-slate-500 mt-1">
              Administra las tasas de cambio y su disponibilidad en tiempo real.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                placeholder="Buscar moneda..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none w-full sm:w-64"
              />
            </div>
            <button
              onClick={fetchRates}
              className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              title="Recargar"
            >
              <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* Filtros de Monedas */}
        <div className="flex flex-wrap gap-2 pb-2">
          <button
            onClick={() => setActiveFilter('ALL')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${activeFilter === 'ALL'
              ? 'bg-blue-600 text-white shadow-md'
              : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
              }`}
          >
            Todas
          </button>
          {uniqueCurrencies.map(code => (
            <button
              key={code}
              onClick={() => setActiveFilter(code)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${activeFilter === code
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
                }`}
            >
              <CountryFlag code={code} size={18} />
              {!hideTextCodes.includes(code) && code}
            </button>
          ))}
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-500">
            <Loader2 className="animate-spin mb-2" size={32} />
            <p>Cargando tasas...</p>
          </div>
        ) : filteredRates.length === 0 ? (
          <div className="text-center py-20 text-slate-500">
            No se encontraron tasas de cambio registradas.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Par de Divisas</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Tasa de Cambio</th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">Estado</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">Última Actualización</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRates.map((rate) => {
                  const currentValue = editValues[rate.id] ?? rate.rate.toString();
                  const isModified = editValues[rate.id] !== undefined && parseFloat(editValues[rate.id]) !== rate.rate;
                  const isUpdatingThis = updating === rate.id;

                  return (
                    <tr key={rate.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center bg-slate-100 px-3 py-2 rounded-xl border border-slate-200">
                            <span className="flex items-center gap-2 font-bold text-slate-700">
                              <CountryFlag code={rate.from_currency?.code || ''} size={24} />
                              {rate.from_currency?.code}
                            </span>
                            <ArrowRight size={16} className="mx-3 text-slate-400" />
                            <span className="flex items-center gap-2 font-bold text-slate-700">
                              <CountryFlag code={rate.to_currency?.code || ''} size={24} />
                              {rate.to_currency?.code}
                            </span>
                          </div>
                          <div className="flex flex-col text-xs text-slate-500 ml-2">
                            <span className="font-medium">{rate.from_currency?.name}</span>
                            <span className="text-slate-400">a</span>
                            <span className="font-medium">{rate.to_currency?.name}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className={`flex items-center border rounded-lg overflow-hidden transition-all ${isModified
                            ? 'border-amber-300 bg-amber-50 ring-2 ring-amber-100'
                            : 'border-slate-200 ring-0 bg-white'
                            }`}>
                            <div className="w-10 flex-shrink-0 py-1.5 bg-slate-50 border-r border-slate-200 text-slate-500 font-medium select-none text-sm text-center flex items-center justify-center">
                              {rate.to_currency?.symbol}
                            </div>
                            <input
                              type="number"
                              step="0.0001"
                              min="0"
                              value={currentValue}
                              onChange={(e) => handleRateChange(rate.id, e.target.value)}
                              onKeyDown={(e) => handleKeyDown(e, rate.id)}
                              disabled={isUpdatingThis}
                              className={`w-20 px-2 py-1.5 font-mono font-bold text-slate-700 focus:outline-none bg-transparent text-right text-sm`}
                            />
                          </div>

                          {/* Botones de acción explícitos: Siempre visibles si hay modificación */}
                          {isModified && !isUpdatingThis && (
                            <div className="flex items-center gap-1 animate-in fade-in zoom-in duration-200">
                              <button
                                onClick={() => saveRate(rate.id)}
                                className="p-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors shadow-sm"
                                title="Guardar cambios"
                              >
                                <Check size={18} />
                              </button>
                              <button
                                onClick={() => cancelEdit(rate.id)}
                                className="p-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors shadow-sm"
                                title="Cancelar"
                              >
                                <X size={18} />
                              </button>
                            </div>
                          )}

                          {isUpdatingThis && (
                            <Loader2 className="animate-spin text-blue-600" size={20} />
                          )}
                        </div>

                        {isModified && !isUpdatingThis && (
                          <p className="text-[10px] text-amber-600 mt-1.5 flex items-center gap-1">
                            <AlertCircle size={10} />
                            Sin guardar
                          </p>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => toggleActive(rate.id, rate.is_active)}
                          disabled={isUpdatingThis}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${rate.is_active ? 'bg-green-500' : 'bg-slate-300'
                            } ${isUpdatingThis ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${rate.is_active ? 'translate-x-6' : 'translate-x-1'
                              }`}
                          />
                        </button>
                        <p className={`text-xs mt-1 font-medium ${rate.is_active ? 'text-green-600' : 'text-slate-500'}`}>
                          {rate.is_active ? 'Activo' : 'Inactivo'}
                        </p>
                      </td>
                      <td className="px-6 py-4 text-right text-slate-500 text-sm font-mono">
                        {new Date(rate.updated_at).toLocaleString('es-VE')}
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
  );
}
