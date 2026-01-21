'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
 ArrowRight,
 Shield,
 Zap,
 TrendingUp,
 Headphones,
 ChevronDown,
 MessageCircle,
 Facebook,
 Instagram,
 MapPin,
 Mail,
 Phone,
 CheckCircle,
 ArrowRightLeft,
 Users,
 Clock,
 Building
} from 'lucide-react';

// Tipos para tasas
interface ExchangeRate {
 from: string;
 to: string;
 rate: number;
 symbol: string;
 flag: string;
}

// Tasas de ejemplo (después se conectarán a Supabase)
const exchangeRates: ExchangeRate[] = [
 { from: 'USD', to: 'VES', rate: 42.50, symbol: 'Bs.S', flag: '🇻🇪' },
 { from: 'USD', to: 'COP', rate: 4150, symbol: '$', flag: '🇨🇴' },
 { from: 'USD', to: 'PEN', rate: 3.75, symbol: 'S/', flag: '🇵🇪' },
 { from: 'EUR', to: 'VES', rate: 46.20, symbol: 'Bs.S', flag: '🇻🇪' },
 { from: 'EUR', to: 'COP', rate: 4500, symbol: '$', flag: '🇨🇴' },
];

// Bancos aliados
const banks = [
 { name: 'Banco de Venezuela', logo: '🏦' },
 { name: 'Banesco', logo: '🏦' },
 { name: 'Mercantil', logo: '🏦' },
 { name: 'Provincial', logo: '🏦' },
 { name: 'BNC', logo: '🏦' },
 { name: 'Bancolombia', logo: '🏦' },
];

// Pasos del proceso
const processSteps = [
 { step: 1, title: 'Regístrate', description: 'Crea tu cuenta gratis en minutos', icon: Users },
 { step: 2, title: 'Selecciona monedas', description: 'Elige origen y destino del envío', icon: ArrowRightLeft },
 { step: 3, title: 'Agrega beneficiario', description: 'Datos de quien recibirá el dinero', icon: Building },
 { step: 4, title: 'Realiza el pago', description: 'Transfiere a nuestra cuenta', icon: Clock },
 { step: 5, title: 'Confirmación', description: 'Tu beneficiario recibe el dinero', icon: CheckCircle },
];

export default function HomePage() {
 const [fromCurrency, setFromCurrency] = useState('USD');
 const [toCurrency, setToCurrency] = useState('VES');
 const [amount, setAmount] = useState('100');
 const [isScrolled, setIsScrolled] = useState(false);
 const [activeTab, setActiveTab] = useState('USD');

 // Calcular monto a recibir
 const currentRate = exchangeRates.find(r => r.from === fromCurrency && r.to === toCurrency);
 const receivedAmount = currentRate ? (parseFloat(amount) || 0) * currentRate.rate : 0;

 // Función para formatear números consistentemente (evita hydration mismatch)
 const formatNumber = (num: number, decimals: number = 0) => {
  return new Intl.NumberFormat('en-US', {
   minimumFractionDigits: decimals,
   maximumFractionDigits: decimals,
  }).format(num);
 };

 // Efecto de scroll para header sticky
 useEffect(() => {
  const handleScroll = () => setIsScrolled(window.scrollY > 50);
  window.addEventListener('scroll', handleScroll);
  return () => window.removeEventListener('scroll', handleScroll);
 }, []);

 return (
  <main className="min-h-screen overflow-x-hidden">
   {/* Ticker de Tasas */}
   <div className="bg-gradient-to-r from-[#05294F] to-[#07478F] py-2 overflow-hidden">
    <div className="animate-marquee whitespace-nowrap flex items-center gap-8">
     {[...exchangeRates, ...exchangeRates].map((rate, i) => (
      <span key={i} className="inline-flex items-center gap-2 text-white/90 text-sm">
       <span className="text-lg">{rate.flag}</span>
       <span className="font-semibold">{rate.from} → {rate.to}:</span>
       <span className="text-amber-400 font-bold">{rate.symbol} {formatNumber(rate.rate)}</span>
      </span>
     ))}
    </div>
   </div>

   {/* Header Premium */}
   <header className={`sticky top-0 z-50 transition-all duration-300 ${isScrolled
    ? 'bg-white/95 backdrop-blur-md shadow-lg'
    : 'bg-transparent'
    }`}>
    <div className="container mx-auto px-4 py-4">
     <div className="flex items-center justify-between">
      {/* Logo */}
      <Link href="/" className="flex items-center gap-3 no-underline">
       <div className="w-10 h-10 bg-gradient-to-br from-[#05294F] to-[#07478F] rounded-xl flex items-center justify-center shadow-lg">
        <span className="text-white font-bold text-xl">F</span>
       </div>
       <span className={`text-xl font-bold ${isScrolled ? 'text-gray-900' : 'text-white'}`}>
        Fengxchange
       </span>
      </Link>

      {/* Navegación Desktop */}
      <nav className="hidden md:flex items-center gap-8">
       {['Inicio', 'Sistema de envíos', 'Tasas', 'Contacto'].map((item) => (
        <a
         key={item}
         href={`#${item.toLowerCase().replace(/ /g, '-')}`}
         className={`text-sm font-medium transition-colors hover:text-amber-500 no-underline ${isScrolled ? 'text-gray-700' : 'text-white/90'
          }`}
        >
         {item}
        </a>
       ))}
      </nav>

      {/* CTAs y Redes */}
      <div className="flex items-center gap-4">
       <div className="hidden sm:flex items-center gap-2">
        <a href="https://wa.me/1234567890" target="_blank" rel="noopener noreferrer"
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
       <Link href="/login" className={`font-medium text-sm px-4 py-2 rounded-lg transition-all no-underline ${isScrolled
        ? 'text-gray-700 hover:text-[#05294F]'
        : 'text-white/90 hover:text-white'
        }`}>
        Iniciar Sesión
       </Link>
       <Link href="/register" className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold text-sm px-5 py-2.5 rounded-xl transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 no-underline">
        Registrarse
       </Link>
      </div>
     </div>
    </div>
   </header>

   {/* Hero Section con Calculadora */}
   <section className="relative min-h-[90vh] bg-gradient-to-br from-[#05294F] via-[#07478F] to-[#0a5cb8] flex items-center -mt-20 pt-20">
    {/* Background Pattern */}
    <div className="absolute inset-0 opacity-10">
     <div className="absolute top-20 left-10 w-72 h-72 bg-white rounded-full blur-3xl"></div>
     <div className="absolute bottom-20 right-10 w-96 h-96 bg-amber-400 rounded-full blur-3xl"></div>
    </div>

    <div className="container mx-auto px-4 py-20 relative z-10">
     <div className="grid lg:grid-cols-2 gap-12 items-center">
      {/* Texto Hero */}
      <div className="text-white space-y-6 animate-fade-in">
       <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full text-sm">
        <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
        <span>Más de 10,000 clientes confían en nosotros</span>
       </div>

       <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight">
        Envía dinero a
        <br />
        <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-400">
         Venezuela y más
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

      {/* Calculadora Glassmorphism */}
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
          <select
           value={fromCurrency}
           onChange={(e) => setFromCurrency(e.target.value)}
           className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 pr-10 text-gray-900 font-medium focus:ring-2 focus:ring-[#05294F] focus:border-transparent appearance-none"
          >
           <option value="USD">🇺🇸 Dólares (USD)</option>
           <option value="EUR">🇪🇺 Euros (EUR)</option>
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
         </div>
        </div>

        {/* Moneda Destino */}
        <div className="mb-4">
         <label className="text-sm font-medium text-gray-600 mb-2 block">Moneda de Destino</label>
         <div className="relative">
          <select
           value={toCurrency}
           onChange={(e) => setToCurrency(e.target.value)}
           className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 pr-10 text-gray-900 font-medium focus:ring-2 focus:ring-[#05294F] focus:border-transparent appearance-none"
          >
           <option value="VES">🇻🇪 Bolívares (VES)</option>
           <option value="COP">🇨🇴 Pesos Colombianos (COP)</option>
           <option value="PEN">🇵🇪 Soles (PEN)</option>
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
         </div>
        </div>

        {/* Monto a Enviar */}
        <div className="mb-4">
         <label className="text-sm font-medium text-gray-600 mb-2 block">Monto a Enviar</label>
         <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">$</span>
          <input
           type="number"
           value={amount}
           onChange={(e) => setAmount(e.target.value)}
           className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 pl-8 text-gray-900 font-medium focus:ring-2 focus:ring-[#05294F] focus:border-transparent text-lg"
           placeholder="0.00"
          />
         </div>
        </div>

        {/* Monto a Recibir */}
        <div className="mb-6 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4">
         <label className="text-sm font-medium text-green-700 mb-1 block">Monto a Recibir</label>
         <p className="text-3xl font-bold text-green-600">
          {currentRate?.symbol} {formatNumber(receivedAmount, 2)}
         </p>
         <p className="text-sm text-green-600/70 mt-1">
          Tasa: 1 {fromCurrency} = {formatNumber(currentRate?.rate || 0)} {toCurrency}
         </p>
        </div>

        {/* CTA */}
        <Link href="/register" className="w-full bg-gradient-to-r from-[#05294F] to-[#07478F] hover:from-[#063a6b] hover:to-[#0862b0] text-white font-semibold py-4 rounded-xl transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2 no-underline">
         Realizar Envío
         <ArrowRight size={20} />
        </Link>
       </div>
      </div>
     </div>
    </div>
   </section>

   {/* Por Qué Elegirnos */}
   <section className="py-20 bg-white">
    <div className="container mx-auto px-4">
     <div className="text-center mb-16">
      <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
       ¿Por qué elegir <span className="text-[#05294F]">Fengxchange</span>?
      </h2>
      <p className="text-gray-600 max-w-2xl mx-auto">
       Somos la opción preferida de miles de personas para enviar dinero a Venezuela, Colombia y Perú
      </p>
     </div>

     <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
      {[
       { icon: Zap, title: 'Ultra Rápido', desc: 'Transferencias en menos de 15 minutos', color: 'from-amber-500 to-orange-500' },
       { icon: Shield, title: '100% Seguro', desc: 'Encriptación de nivel bancario', color: 'from-blue-500 to-indigo-500' },
       { icon: TrendingUp, title: 'Mejores Tasas', desc: 'Las tasas más competitivas del mercado', color: 'from-green-500 to-emerald-500' },
       { icon: Headphones, title: 'Soporte 24/7', desc: 'Atención personalizada siempre', color: 'from-purple-500 to-pink-500' },
      ].map((item, i) => (
       <div key={i} className="group bg-white border border-gray-100 rounded-2xl p-6 hover:shadow-xl transition-all duration-300 hover:-translate-y-2">
        <div className={`w-14 h-14 bg-gradient-to-br ${item.color} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-lg`}>
         <item.icon className="text-white" size={28} />
        </div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">{item.title}</h3>
        <p className="text-gray-600">{item.desc}</p>
       </div>
      ))}
     </div>
    </div>
   </section>

   {/* Cómo Funciona */}
   <section id="como-funciona" className="py-20 bg-gradient-to-br from-slate-50 to-blue-50">
    <div className="container mx-auto px-4">
     <div className="text-center mb-16">
      <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
       ¿Cómo funciona?
      </h2>
      <p className="text-gray-600 max-w-2xl mx-auto">
       En solo 5 sencillos pasos tu dinero llega a su destino
      </p>
     </div>

     <div className="relative">
      {/* Línea conectora desktop */}
      <div className="hidden lg:block absolute top-24 left-1/2 -translate-x-1/2 w-[80%] h-1 bg-gradient-to-r from-[#05294F] via-[#07478F] to-[#05294F] rounded-full"></div>

      <div className="grid md:grid-cols-3 lg:grid-cols-5 gap-8">
       {processSteps.map((step, i) => (
        <div key={i} className="relative text-center group">
         <div className="relative z-10 w-20 h-20 mx-auto bg-white border-4 border-[#05294F] rounded-full flex items-center justify-center mb-4 group-hover:bg-[#05294F] transition-all shadow-lg">
          <step.icon className="text-[#05294F] group-hover:text-white transition-colors" size={32} />
          <span className="absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-br from-amber-500 to-orange-500 text-white font-bold rounded-full flex items-center justify-center text-sm shadow-lg">
           {step.step}
          </span>
         </div>
         <h3 className="text-lg font-bold text-gray-900 mb-2">{step.title}</h3>
         <p className="text-gray-600 text-sm">{step.description}</p>
        </div>
       ))}
      </div>
     </div>
    </div>
   </section>

   {/* Bancos Aliados */}
   <section className="py-16 bg-white">
    <div className="container mx-auto px-4">
     <div className="text-center mb-12">
      <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
       Bancos Aliados
      </h2>
      <p className="text-gray-600">Trabajamos con los principales bancos de la región</p>
     </div>

     <div className="flex flex-wrap justify-center items-center gap-8">
      {banks.map((bank, i) => (
       <div key={i} className="bg-gray-50 hover:bg-gray-100 px-8 py-4 rounded-xl transition-all hover:scale-105 cursor-pointer">
        <span className="text-3xl mr-2">{bank.logo}</span>
        <span className="font-medium text-gray-700">{bank.name}</span>
       </div>
      ))}
     </div>
    </div>
   </section>

   {/* Tabla de Tasas */}
   <section id="tasas" className="py-20 bg-gradient-to-br from-slate-50 to-blue-50">
    <div className="container mx-auto px-4">
     <div className="text-center mb-12">
      <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
       Nuestras Tasas
      </h2>
      <p className="text-gray-600">Tasas actualizadas en tiempo real</p>
     </div>

     {/* Tabs */}
     <div className="flex justify-center gap-2 mb-8">
      {['USD', 'EUR'].map((tab) => (
       <button
        key={tab}
        onClick={() => setActiveTab(tab)}
        className={`px-6 py-3 rounded-xl font-semibold transition-all ${activeTab === tab
         ? 'bg-[#05294F] text-white shadow-lg'
         : 'bg-white text-gray-600 hover:bg-gray-100'
         }`}
       >
        {tab === 'USD' ? '🇺🇸' : '🇪🇺'} {tab}
       </button>
      ))}
     </div>

     {/* Tabla */}
     <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-xl overflow-hidden">
      <div className="bg-[#05294F] text-white px-6 py-4 grid grid-cols-3 font-semibold">
       <span>Moneda</span>
       <span className="text-center">Tasa</span>
       <span className="text-right">Acción</span>
      </div>
      {exchangeRates.filter(r => r.from === activeTab).map((rate, i) => (
       <div key={i} className="px-6 py-4 grid grid-cols-3 items-center border-b border-gray-100 hover:bg-gray-50 transition-colors">
        <span className="flex items-center gap-2">
         <span className="text-2xl">{rate.flag}</span>
         <span className="font-medium">{rate.to}</span>
        </span>
        <span className="text-center font-bold text-lg text-[#05294F]">
         {rate.symbol} {formatNumber(rate.rate)}
        </span>
        <div className="text-right">
         <Link href="/register" className="inline-flex items-center gap-1 bg-gradient-to-r from-amber-500 to-orange-500 text-white px-4 py-2 rounded-lg font-medium text-sm hover:shadow-lg transition-all no-underline">
          Enviar <ArrowRight size={16} />
         </Link>
        </div>
       </div>
      ))}
     </div>
    </div>
   </section>

   {/* CTA Final */}
   <section className="py-20 bg-gradient-to-br from-[#05294F] via-[#07478F] to-[#0a5cb8] relative overflow-hidden">
    <div className="absolute inset-0 opacity-10">
     <div className="absolute top-10 left-20 w-64 h-64 bg-white rounded-full blur-3xl"></div>
     <div className="absolute bottom-10 right-20 w-80 h-80 bg-amber-400 rounded-full blur-3xl"></div>
    </div>

    <div className="container mx-auto px-4 text-center relative z-10">
     <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">
      ¿Listo para enviar dinero?
     </h2>
     <p className="text-xl text-white/80 mb-8 max-w-2xl mx-auto">
      Únete a miles de personas que confían en nosotros para sus transferencias internacionales
     </p>
     <Link href="/register" className="inline-flex items-center gap-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold text-lg px-10 py-5 rounded-2xl transition-all shadow-2xl hover:shadow-3xl hover:-translate-y-1 no-underline">
      Crear Cuenta Gratis
      <ArrowRight size={24} />
     </Link>
    </div>
   </section>

   {/* Footer Premium */}
   <footer className="bg-gray-900 text-white py-16">
    <div className="container mx-auto px-4">
     <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
      {/* Logo y descripción */}
      <div>
       <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl flex items-center justify-center">
         <span className="text-white font-bold text-xl">F</span>
        </div>
        <span className="text-xl font-bold">Fengxchange</span>
       </div>
       <p className="text-gray-400 mb-4">
        La forma más rápida y segura de enviar dinero a Venezuela, Colombia y Perú
       </p>
       <div className="flex gap-3">
        <a href="#" className="w-10 h-10 bg-white/10 hover:bg-green-500 rounded-full flex items-center justify-center transition-all">
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
       <h4 className="font-bold text-lg mb-4">Enlaces Rápidos</h4>
       <ul className="space-y-3">
        {['Sistema de envíos', 'Nuestras tasas', 'Preguntas frecuentes', 'Blog'].map((link) => (
         <li key={link}>
          <a href="#" className="text-gray-400 hover:text-amber-400 transition-colors no-underline">{link}</a>
         </li>
        ))}
       </ul>
      </div>

      {/* Legal */}
      <div>
       <h4 className="font-bold text-lg mb-4">Legal</h4>
       <ul className="space-y-3">
        {['Términos y condiciones', 'Política de privacidad', 'Condiciones de envío'].map((link) => (
         <li key={link}>
          <a href="#" className="text-gray-400 hover:text-amber-400 transition-colors no-underline">{link}</a>
         </li>
        ))}
       </ul>
      </div>

      {/* Contacto */}
      <div>
       <h4 className="font-bold text-lg mb-4">Contacto</h4>
       <ul className="space-y-3">
        <li className="flex items-center gap-3 text-gray-400">
         <MapPin size={18} className="text-amber-400" />
         St. Petersburg, FL, USA
        </li>
        <li className="flex items-center gap-3 text-gray-400">
         <Mail size={18} className="text-amber-400" />
         soporte@fengxchange.com
        </li>
        <li className="flex items-center gap-3 text-gray-400">
         <Phone size={18} className="text-amber-400" />
         +1 (234) 567-8900
        </li>
       </ul>
      </div>
     </div>

     {/* Copyright */}
     <div className="border-t border-gray-800 pt-8 text-center">
      <p className="text-gray-500 text-sm">
       © {new Date().getFullYear()} Fengxchange. Todos los derechos reservados.
      </p>
     </div>
    </div>
   </footer>
  </main>
 );
}
