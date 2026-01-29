'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
 MessageCircle,
 Facebook,
 Instagram,
} from 'lucide-react';

interface BusinessConfig {
 business_name: string;
 logo_url: string;
 contact_whatsapp: string;
}

export function LandingHeader() {
 const [config, setConfig] = useState<BusinessConfig>({
  business_name: 'Fengxchange',
  logo_url: '',
  contact_whatsapp: '',
 });

 useEffect(() => {
  const loadConfig = async () => {
   try {
    const response = await fetch('/api/public/business');
    if (response.ok) {
     const data = await response.json();
     if (data.info) {
      setConfig({
       business_name: data.info.business_name || 'Fengxchange',
       logo_url: data.info.logo_url || '',
       contact_whatsapp: data.info.contact_whatsapp || '',
      });
     }
    }
   } catch (error) {
    console.error('Error loading business config:', error);
   }
  };
  loadConfig();
 }, []);

 const whatsappUrl = config.contact_whatsapp
  ? `https://wa.me/${config.contact_whatsapp.replace(/[^0-9]/g, '')}`
  : 'https://wa.me/1234567890';

 return (
  <header className="sticky top-[40px] z-50 bg-white/10 backdrop-blur-md transition-all duration-300">
   <div className="container mx-auto px-4 py-4">
    <div className="flex items-center justify-between">
     {/* Logo */}
     <Link href="/" className="flex items-center no-underline">
      {config.logo_url ? (
       <img
        src={config.logo_url}
        alt={config.business_name}
        className="h-12 w-auto object-contain"
       />
      ) : (
       <div className="w-12 h-12 bg-gradient-to-br from-[#05294F] to-[#07478F] rounded-xl flex items-center justify-center shadow-lg">
        <span className="text-white font-bold text-xl">{config.business_name.charAt(0)}</span>
       </div>
      )}
     </Link>

     {/* Navegación Desktop */}
     <nav className="hidden md:flex items-center gap-12">
      {['Inicio', 'Sistema de envíos', 'Tasas', 'Contacto'].map((item) => (
       <a
        key={item}
        href={`#${item.toLowerCase().replace(/ /g, '-')}`}
        className="text-white/90 text-sm font-medium transition-colors hover:text-amber-500 no-underline"
       >
        {item}
       </a>
      ))}
     </nav>

     {/* CTAs y Redes */}
     <div className="flex items-center gap-4">
      <div className="hidden sm:flex items-center gap-2">
       <a href={whatsappUrl} target="_blank" rel="noopener noreferrer"
        className="w-9 h-9 bg-green-500 hover:bg-green-600 rounded-full flex items-center justify-center text-white transition-all hover:scale-110 shadow-lg">
        <MessageCircle size={18} />
       </a>
       <a href="#" className="w-9 h-9 bg-blue-600 hover:bg-blue-700 rounded-full flex items-center justify-center text-white transition-all hover:scale-110 shadow-lg">
        <Facebook size={18} />
       </a>
       <a href="#" className="w-9 h-9 bg-gradient-to-br from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 rounded-full flex items-center justify-center text-white transition-all hover:scale-110 shadow-lg">
        <Instagram size={18} />
       </a>
      </div>
      <Link href="/login" className="font-medium text-sm px-4 py-2 rounded-lg transition-all no-underline text-white/90 hover:text-white">
       Iniciar Sesión
      </Link>
      <Link href="/register" className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold text-sm px-5 py-2.5 rounded-xl transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 no-underline">
       Registrarse
      </Link>
     </div>
    </div>
   </div>
  </header>
 );
}
