'use client';

import { useState, useEffect } from 'react';
import {
 MessageCircle,
 Facebook,
 Instagram,
 MapPin,
 Mail,
 Phone,
} from 'lucide-react';

interface BusinessConfig {
 business_name: string;
 logo_url: string;
 contact_email: string;
 contact_phone: string;
 contact_whatsapp: string;
 address: string;
}

export function LandingFooter() {
 const [config, setConfig] = useState<BusinessConfig>({
  business_name: 'Fengxchange',
  logo_url: '',
  contact_email: 'contacto@fengxchange.com',
  contact_phone: '+507 833-9000',
  contact_whatsapp: '',
  address: 'Calle 50, Torre RBS, Piso 15\nCiudad de Panamá, Panamá',
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
       contact_email: data.info.contact_email || 'contacto@fengxchange.com',
       contact_phone: data.info.contact_phone || '+507 833-9000',
       contact_whatsapp: data.info.contact_whatsapp || '',
       address: data.info.address || 'Calle 50, Torre RBS, Piso 15\nCiudad de Panamá, Panamá',
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
  : '#';

 return (
  <footer className="bg-gray-900 text-white py-16">
   <div className="container mx-auto px-4">
    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
     {/* Logo y descripción */}
     <div>
      <div className="mb-4">
       {config.logo_url ? (
        <img
         src={config.logo_url}
         alt={config.business_name}
         className="h-12 w-auto object-contain"
        />
       ) : (
        <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl flex items-center justify-center">
         <span className="text-white font-bold text-xl">{config.business_name.charAt(0)}</span>
        </div>
       )}
      </div>
      <p className="text-gray-400 mb-4">
       La forma más rápida y segura de enviar dinero a Venezuela, Colombia y Perú
      </p>
      <div className="flex gap-3">
       <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="w-10 h-10 bg-white/10 hover:bg-green-500 rounded-full flex items-center justify-center transition-all">
        <MessageCircle size={20} />
       </a>
       <a href="#" className="w-10 h-10 bg-white/10 hover:bg-blue-600 rounded-full flex items-center justify-center transition-all">
        <Facebook size={20} />
       </a>
       <a href="#" className="w-10 h-10 bg-white/10 hover:bg-pink-500 rounded-full flex items-center justify-center transition-all">
        <Instagram size={20} />
       </a>
      </div>
     </div>

     {/* Enlaces rápidos */}
     <div>
      <h3 className="text-lg font-bold mb-4">Empresa</h3>
      <ul className="space-y-2">
       {['Nosotros', 'Cómo Funciona', 'Tasas', 'Blog', 'Carreras'].map((item) => (
        <li key={item}>
         <a href="#" className="text-gray-400 hover:text-white transition-colors">{item}</a>
        </li>
       ))}
      </ul>
     </div>

     {/* Legal */}
     <div>
      <h3 className="text-lg font-bold mb-4">Legal</h3>
      <ul className="space-y-2">
       {[
        { label: 'Términos y Condiciones', href: '/user-agreement' },
        { label: 'Política de Privacidad', href: '/privacy-policy' },
        { label: 'Política Anti-Lavado', href: '#' },
        { label: 'KYC', href: '#' },
        { label: 'Cookies', href: '#' },
       ].map((item) => (
        <li key={item.label}>
         <a href={item.href} className="text-gray-400 hover:text-white transition-colors">{item.label}</a>
        </li>
       ))}
      </ul>
     </div>

     {/* Contacto */}
     <div>
      <h3 className="text-lg font-bold mb-4">Contacto</h3>
      <ul className="space-y-4">
       <li className="flex items-start gap-3 text-gray-400">
        <MapPin className="shrink-0 mt-1" size={18} />
        <span dangerouslySetInnerHTML={{ __html: config.address.replace(/\n/g, '<br />') }} />
       </li>
       <li className="flex items-center gap-3 text-gray-400">
        <Mail className="shrink-0" size={18} />
        <span>{config.contact_email}</span>
       </li>
       <li className="flex items-center gap-3 text-gray-400">
        <Phone className="shrink-0" size={18} />
        <span>{config.contact_phone}</span>
       </li>
      </ul>
     </div>
    </div>

    <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
     <p className="text-gray-500 text-sm">
      © {new Date().getFullYear()} {config.business_name}. Todos los derechos reservados.
     </p>
     <div className="flex gap-6 text-sm text-gray-500">
      <a href="/privacy-policy" className="hover:text-white transition-colors">Privacidad</a>
      <a href="/user-agreement" className="hover:text-white transition-colors">Términos</a>
      <a href="#" className="hover:text-white transition-colors">Cookies</a>
     </div>
    </div>
   </div>
  </footer>
 );
}
