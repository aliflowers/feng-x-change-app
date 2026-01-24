'use client';

import { ArrowRight } from 'lucide-react';
import { CountryFlag } from '@/components/ui/CountryFlag';

interface ExchangeRate {
 id: number;
 rate: number;
 from_currency: { code: string; name: string };
 to_currency: { code: string; name: string; symbol: string };
}

interface ExchangeTickerProps {
 rates: ExchangeRate[];
 loading?: boolean;
}

export const ExchangeTicker = ({ rates, loading = false }: ExchangeTickerProps) => {
 const formatNumber = (num: number, decimals: number = 2) => {
  return new Intl.NumberFormat('en-US', {
   minimumFractionDigits: decimals,
   maximumFractionDigits: decimals,
  }).format(num);
 };

 if (loading) {
  return <div className="flex justify-center text-white/50 text-xs animate-pulse">Cargando tasas en tiempo real...</div>;
 }

 return (
  <div className="animate-marquee whitespace-nowrap flex w-max">
   {/* Primer bloque original */}
   <div className="flex items-center gap-12 pr-12">
    {rates.map((rate, i) => (
     <span key={`original-${i}`} className="inline-flex items-center gap-2 text-white/90 text-sm">
      <CountryFlag code={rate.from_currency.code} size={20} />
      <span className="font-semibold">{rate.from_currency.name}</span>
      <ArrowRight size={16} className="text-amber-400 flex-shrink-0" />
      <CountryFlag code={rate.to_currency.code} size={20} />
      <span className="font-semibold">{rate.to_currency.name}</span>
      <span className="text-amber-400 font-bold">
       {rate.to_currency.symbol} {formatNumber(rate.rate, rate.rate < 1 ? 4 : 2)}
      </span>
      <span className="text-white/30 mx-4">|</span>
     </span>
    ))}
   </div>
   {/* Segundo bloque copia para efecto infinito */}
   <div className="flex items-center gap-12 pr-12">
    {rates.map((rate, i) => (
     <span key={`copy-${i}`} className="inline-flex items-center gap-2 text-white/90 text-sm">
      <CountryFlag code={rate.from_currency.code} size={20} />
      <span className="font-semibold">{rate.from_currency.name}</span>
      <ArrowRight size={16} className="text-amber-400 flex-shrink-0" />
      <CountryFlag code={rate.to_currency.code} size={20} />
      <span className="font-semibold">{rate.to_currency.name}</span>
      <span className="text-amber-400 font-bold">
       {rate.to_currency.symbol} {formatNumber(rate.rate, rate.rate < 1 ? 4 : 2)}
      </span>
      <span className="text-white/30 mx-4">|</span>
     </span>
    ))}
   </div>
  </div>
 );
};
