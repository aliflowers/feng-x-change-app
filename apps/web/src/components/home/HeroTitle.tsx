'use client';

import { useState, useEffect } from 'react';
import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { CountryFlag } from '@/components/ui/CountryFlag';

const countries = [
 { name: 'Venezuela', code: 'VE' },
 { name: 'Colombia', code: 'CO' },
 { name: 'Perú', code: 'PE' },
 { name: 'Chile', code: 'CL' },
 { name: 'Panamá', code: 'PA' },
 { name: 'Estados Unidos', code: 'US' },
];

export const HeroTitle = () => {
 const [currentCountryIndex, setCurrentCountryIndex] = useState(0);

 useEffect(() => {
  const interval = setInterval(() => {
   setCurrentCountryIndex((prev) => (prev + 1) % countries.length);
  }, 1500); // 1.5s para leer mejor
  return () => clearInterval(interval);
 }, []);

 return (
  <div className="text-white space-y-6 animate-fade-in">
   <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full text-sm">
    <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
    <span>Más de 10,000 clientes confían en nosotros</span>
   </div>

   <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight">
    Envía dinero a
    <br />
    <span
     key={currentCountryIndex} // Key para reiniciar animación
     className="inline-flex items-center gap-4 animate-fade-in"
    >
     <CountryFlag code={countries[currentCountryIndex].code} size={56} />
     <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-400">
      {countries[currentCountryIndex].name}
     </span>
    </span>
   </h1>

   <p className="text-lg md:text-xl text-white/80 max-w-lg">
    Las mejores tasas del mercado, transferencias rápidas y seguras.
    Tu dinero llega en minutos, no en días.
   </p>

   <div className="flex flex-wrap gap-4">
    <Link href="/register" className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold px-8 py-4 rounded-xl transition-all shadow-xl hover:shadow-2xl hover:-translate-y-1 no-underline">
     Comenzar Ahora
     <ArrowRight size={20} />
    </Link>
    <a href="#como-funciona" className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white font-semibold px-8 py-4 rounded-xl transition-all no-underline">
     ¿Cómo funciona?
    </a>
   </div>

   {/* Stats */}
   <div className="flex flex-wrap gap-8 pt-8 border-t border-white/10">
    <div>
     <p className="text-3xl font-bold text-amber-400">$5M+</p>
     <p className="text-white/60 text-sm">Transferidos</p>
    </div>
    <div>
     <p className="text-3xl font-bold text-amber-400">10K+</p>
     <p className="text-white/60 text-sm">Clientes felices</p>
    </div>
    <div>
     <p className="text-3xl font-bold text-amber-400">15min</p>
     <p className="text-white/60 text-sm">Tiempo promedio</p>
    </div>
   </div>
  </div>
 );
};
