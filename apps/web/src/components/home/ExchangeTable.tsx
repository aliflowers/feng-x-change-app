'use client';

import { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { CountryFlag } from '@/components/ui/CountryFlag';

interface ExchangeRate {
  id: number;
  rate: number;
  from_currency: { code: string; name: string };
  to_currency: { code: string; name: string; symbol: string };
}

interface ExchangeTableProps {
  rates: ExchangeRate[];
  loading?: boolean;
}

export const ExchangeTable = ({ rates, loading = false }: ExchangeTableProps) => {
  const [activeTab, setActiveTab] = useState('USD');
  const [tableAmounts, setTableAmounts] = useState<Record<string, string>>({});

  const uniqueFromCurrencies = Array.from(new Set(rates.map(r => r.from_currency.code)));

  const formatNumber = (num: number, decimals: number = 2) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(num);
  };

  if (loading) {
    return (
      <div className="px-6 py-12 text-center text-gray-500">
        <div className="animate-spin inline-block w-6 h-6 border-2 border-current border-t-transparent rounded-full mb-2"></div>
        <p>Cargando tasas...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4">
      <div className="text-center mb-12">
        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
          Nuestras Tasas
        </h2>
        <p className="text-gray-600">Tasas actualizadas en tiempo real</p>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap justify-center gap-2 mb-8">
        {uniqueFromCurrencies.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-xl font-semibold transition-all text-sm ${activeTab === tab
              ? 'bg-[#05294F] text-white shadow-lg'
              : 'bg-white text-gray-600 hover:bg-gray-100'
              }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tabla */}
      <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-xl overflow-hidden">
        {/* Encabezado Desktop */}
        <div className="hidden md:grid bg-[#05294F] text-white px-6 py-4 grid-cols-4 font-semibold text-sm">
          <span>Conversión</span>
          <span className="text-center">Envías</span>
          <span className="text-center">Recibes</span>
          <span className="text-right">Acción</span>
        </div>

        {rates.filter(r => r.from_currency.code === activeTab).map((rate, i) => {
          const key = `${rate.from_currency.code}-${rate.to_currency.code}`;
          const inputAmount = tableAmounts[key] ?? "1";
          const calculatedAmount = (parseFloat(inputAmount) || 0) * rate.rate;

          return (
            <div key={i} className="p-5 md:px-6 md:py-4 flex flex-col md:grid md:grid-cols-4 items-center gap-4 md:gap-0 border-b border-gray-100 hover:bg-gray-50 transition-colors">
              
              {/* Conversión */}
              <div className="flex items-center justify-between w-full md:w-auto md:justify-start">
                <span className="text-xs font-bold text-gray-400 md:hidden uppercase tracking-wider">Conversión</span>
                <span className="flex items-center gap-2">
                  <CountryFlag code={rate.from_currency.code} size={24} />
                  <span className="text-sm font-semibold text-gray-700">{rate.from_currency.code}</span>
                  <ArrowRight size={14} className="text-gray-400 mx-1" />
                  <CountryFlag code={rate.to_currency.code} size={24} />
                  <span className="text-sm font-semibold text-gray-700">{rate.to_currency.code}</span>
                </span>
              </div>

              {/* Envías */}
              <div className="flex items-center justify-between w-full md:w-auto md:justify-center">
                <span className="text-xs font-bold text-gray-400 md:hidden uppercase tracking-wider">Envías</span>
                <div className="flex items-center">
                  <input
                    type="number"
                    value={inputAmount}
                    onChange={(e) => setTableAmounts(prev => ({ ...prev, [key]: e.target.value }))}
                    className="w-24 text-center border border-gray-200 rounded-lg px-3 py-1.5 text-sm font-semibold text-gray-700 focus:ring-2 focus:ring-[#05294F] focus:border-transparent bg-gray-50"
                    min="0"
                  />
                  <span className="ml-2 text-sm font-bold text-gray-500">{rate.from_currency.code}</span>
                </div>
              </div>

              {/* Recibes */}
              <div className="flex items-center justify-between w-full md:w-auto md:justify-center">
                <span className="text-xs font-bold text-gray-400 md:hidden uppercase tracking-wider">Recibes</span>
                <span className="font-bold text-lg md:text-xl text-emerald-600 flex items-baseline gap-1">
                  <span className="text-sm">{rate.to_currency.symbol}</span>
                  {formatNumber(calculatedAmount, 2)}
                </span>
              </div>

              {/* Acción */}
              <div className="w-full md:w-auto md:text-right mt-2 md:mt-0">
                <Link href="/register" className="w-full md:inline-flex flex justify-center items-center gap-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white px-6 py-2.5 rounded-xl font-semibold hover:shadow-lg hover:-translate-y-0.5 transition-all no-underline">
                  Enviar <ArrowRight size={18} />
                </Link>
              </div>
            </div>
          );
        })}
        {rates.filter(r => r.from_currency.code === activeTab).length === 0 && (
          <div className="px-6 py-8 text-center text-gray-500">
            No hay tasas disponibles para esta moneda
          </div>
        )}
      </div>
    </div>
  );
};
