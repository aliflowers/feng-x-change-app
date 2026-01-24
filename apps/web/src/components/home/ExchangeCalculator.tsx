'use client';

import { useState, useEffect } from 'react';
import { ArrowRight, ArrowRightLeft, ChevronDown } from 'lucide-react';
import Link from 'next/link';

interface ExchangeRate {
 id: number;
 rate: number;
 from_currency: { code: string; name: string; symbol: string };
 to_currency: { code: string; name: string; symbol: string };
}

interface ExchangeCalculatorProps {
 rates: ExchangeRate[];
 loading?: boolean;
}

export const ExchangeCalculator = ({ rates, loading = false }: ExchangeCalculatorProps) => {
 const [fromCurrencyCode, setFromCurrencyCode] = useState('USD');
 const [toCurrencyCode, setToCurrencyCode] = useState('VES');
 const [amount, setAmount] = useState('100');

 // Funciones auxiliares
 const uniqueFromCurrencies = Array.from(new Set(rates.map(r => r.from_currency.code)));

 const availableToCurrencies = rates
  .filter(r => r.from_currency.code === fromCurrencyCode)
  .map(r => r.to_currency.code);

 const currentRateObj = rates.find(
  r => r.from_currency.code === fromCurrencyCode && r.to_currency.code === toCurrencyCode
 );
 const currentRate = currentRateObj?.rate || 0;
 const currentSymbol = currentRateObj?.to_currency.symbol || '';
 const receivedAmount = (parseFloat(amount) || 0) * currentRate;

 // Efecto para ajustar moneda destino si cambia origen
 useEffect(() => {
  if (availableToCurrencies.length > 0 && !availableToCurrencies.includes(toCurrencyCode)) {
   setToCurrencyCode(availableToCurrencies[0]);
  }
 }, [fromCurrencyCode, availableToCurrencies, toCurrencyCode]);

 const formatNumber = (num: number, decimals: number = 2) => {
  return new Intl.NumberFormat('en-US', {
   minimumFractionDigits: decimals,
   maximumFractionDigits: decimals,
  }).format(num);
 };

 return (
  <div className="relative">
   <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-white/5 rounded-3xl blur-xl"></div>
   <div className="relative bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-white/20">
    <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
     <ArrowRightLeft className="text-[#05294F]" size={24} />
     Calculadora de Envíos
    </h2>

    {/* Moneda Origen */}
    <div className="mb-4">
     <label className="text-sm font-medium text-gray-600 mb-2 block">Moneda de Origen</label>
     <div className="relative">
      {loading ? (
       <div className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-400">Cargando...</div>
      ) : (
       <select
        value={fromCurrencyCode}
        onChange={(e) => setFromCurrencyCode(e.target.value)}
        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 pr-10 text-gray-900 font-medium focus:ring-2 focus:ring-[#05294F] focus:border-transparent appearance-none"
       >
        {uniqueFromCurrencies.map(code => (
         <option key={code} value={code}>
          {rates.find(r => r.from_currency.code === code)?.from_currency.symbol} {rates.find(r => r.from_currency.code === code)?.from_currency.name} ({code})
         </option>
        ))}
       </select>
      )}
      {!loading && <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />}
     </div>
    </div>

    {/* Moneda Destino */}
    <div className="mb-4">
     <label className="text-sm font-medium text-gray-600 mb-2 block">Moneda de Destino</label>
     <div className="relative">
      {loading ? (
       <div className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-400">Cargando...</div>
      ) : (
       <select
        value={toCurrencyCode}
        onChange={(e) => setToCurrencyCode(e.target.value)}
        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 pr-10 text-gray-900 font-medium focus:ring-2 focus:ring-[#05294F] focus:border-transparent appearance-none"
       >
        {availableToCurrencies.map(code => (
         <option key={code} value={code}>
          {rates.find(r => r.to_currency.code === code)?.to_currency.symbol} {rates.find(r => r.to_currency.code === code)?.to_currency.name} ({code})
         </option>
        ))}
       </select>
      )}
      {!loading && <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />}
     </div>
    </div>

    {/* Monto a Enviar */}
    <div className="mb-4">
     <label className="text-sm font-medium text-gray-600 mb-2 block">Monto a Enviar</label>
     <div className="relative">
      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">
       {rates.find(r => r.from_currency.code === fromCurrencyCode)?.from_currency.symbol || '$'}
      </span>
      <input
       type="number"
       value={amount}
       onChange={(e) => setAmount(e.target.value)}
       className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 pl-8 text-gray-900 font-medium focus:ring-2 focus:ring-[#05294F] focus:border-transparent text-lg"
       placeholder="0.00"
       min="0"
      />
     </div>
    </div>

    {/* Monto a Recibir */}
    <div className="mb-6 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4">
     <label className="text-sm font-medium text-green-700 mb-1 block">Monto a Recibir</label>
     <p className="text-3xl font-bold text-green-600">
      {currentRateObj ? `${currentSymbol} ${formatNumber(receivedAmount, 2)}` : '---'}
     </p>
     <p className="text-sm text-green-600/70 mt-1">
      {currentRateObj
       ? `Tasa: 1 ${fromCurrencyCode} = ${formatNumber(currentRate, currentRate < 1 ? 4 : 2)} ${toCurrencyCode}`
       : 'Seleccione un par válido'}
     </p>
    </div>

    {/* CTA */}
    <Link href="/register" className="w-full bg-gradient-to-r from-[#05294F] to-[#07478F] hover:from-[#063a6b] hover:to-[#0862b0] text-white font-semibold py-4 rounded-xl transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2 no-underline">
     Realizar Envío
     <ArrowRight size={20} />
    </Link>
   </div>
  </div>
 );
};
