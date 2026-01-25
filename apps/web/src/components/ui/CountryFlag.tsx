import Image from 'next/image';

interface CountryFlagProps {
 code: string;
 size?: number;
 className?: string; // Permite personalización extra si se necesita
}

export const CountryFlag = ({ code, size = 48, className = '' }: CountryFlagProps) => {
 // Mapeo de códigos de moneda a códigos de país/bandera
 const currencyToFlagMap: Record<string, string> = {
  'VES': 'VE',
  'COP': 'CO',
  'PEN': 'PE',
  'CLP': 'CL',
  'PAB': 'PA',
  'USD': 'US',
  'EUR': 'EU',
  // Mapeos directos si el código ya es de país (para el ticker)
  'VE': 'VE', 'CO': 'CO', 'PE': 'PE', 'CL': 'CL', 'PA': 'PA', 'US': 'US', 'EU': 'EU'
 };

 const flagCode = currencyToFlagMap[code] || code;

 // Banderas de países (archivos SVG externos)
 // Nota: Estas rutas deben existir en /public/flags/
 const countryFlags: Record<string, string> = {
  VE: '/flags/ve.svg',
  CO: '/flags/co.svg',
  PE: '/flags/pe.svg',
  CL: '/flags/cl.svg',
  PA: '/flags/pa.svg',
  US: '/flags/us.svg',
  EU: '/flags/eu.svg',
 };

 // Si es una bandera de país, usar Image con el archivo SVG
 if (countryFlags[flagCode]) {
  return (
   <span className={`flex-shrink-0 ${className}`}>
    <Image
     src={countryFlags[flagCode]}
     alt={`Bandera ${flagCode}`}
     width={size}
     height={Math.round(size * 0.67)}
     className="rounded shadow object-cover"
    />
   </span>
  );
 }

 // Iconos de plataformas de pago
 const platformIcons: Record<string, React.ReactNode> = {
  PAYPAL: (
   <div style={{ width: size, height: size * 0.67 }} className="rounded shadow bg-[#003087] flex items-center justify-center">
    <span className="text-white font-bold" style={{ fontSize: size * 0.35 }}>P</span>
   </div>
  ),
  ZINLI: (
   <div style={{ width: size, height: size * 0.67 }} className="rounded shadow bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
    <span className="text-white font-bold" style={{ fontSize: size * 0.35 }}>Z</span>
   </div>
  ),
  ZELLE: (
   <div style={{ width: size, height: size * 0.67 }} className="rounded shadow bg-[#6D1ED4] flex items-center justify-center">
    <span className="text-white font-bold" style={{ fontSize: size * 0.35 }}>$</span>
   </div>
  ),
  USDT: (
   <div style={{ width: size, height: size * 0.67 }} className="rounded shadow bg-[#26A17B] flex items-center justify-center">
    <span className="text-white font-bold" style={{ fontSize: size * 0.35 }}>₮</span>
   </div>
  ),
 };

 return <span className={`flex-shrink-0 ${className}`}>{platformIcons[flagCode] || null}</span>;
};
