'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { supabase } from '@/lib/supabase/client';
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

// Tipos para tasas basadas en DB
interface ExchangeRate {
  id: number;
  from_currency_id: number;
  to_currency_id: number;
  rate: number;
  from_currency: { code: string; name: string; symbol: string };
  to_currency: { code: string; name: string; symbol: string };
}

// Bancos aliados (estático por ahora, son logos)
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
  // Estado para las tasas dinámicas
  const [exchangeRates, setExchangeRates] = useState<ExchangeRate[]>([]);
  const [loadingRates, setLoadingRates] = useState(true);

  // Estados de la calculadora
  const [fromCurrencyCode, setFromCurrencyCode] = useState('USD');
  const [toCurrencyCode, setToCurrencyCode] = useState('VES');
  const [amount, setAmount] = useState('100');

  // UI states
  const [isScrolled, setIsScrolled] = useState(false);
  const [activeTab, setActiveTab] = useState('USD');
  const [currentCountryIndex, setCurrentCountryIndex] = useState(0);
  const [tableAmounts, setTableAmounts] = useState<Record<string, string>>({});

  // Lista de países con códigos de bandera para animación
  const countries = [
    { name: 'Venezuela', code: 'VE' },
    { name: 'Colombia', code: 'CO' },
    { name: 'Perú', code: 'PE' },
    { name: 'Chile', code: 'CL' },
    { name: 'Panamá', code: 'PA' },
    { name: 'Estados Unidos', code: 'US' },
  ];

  // Cargar tasas al iniciar
  useEffect(() => {
    const fetchRates = async () => {
      try {
        const { data, error } = await supabase
          .from('exchange_rates')
          .select(`
            *,
            from_currency:currencies!exchange_rates_from_currency_id_fkey(code, name, symbol),
            to_currency:currencies!exchange_rates_to_currency_id_fkey(code, name, symbol)
          `)
          .eq('is_active', true)
          .order('id', { ascending: true });

        if (error) throw error;

        // Transformar la data si es necesario, aquí ya viene con la estructura correcta gracias al join
        if (data) {
          setExchangeRates(data as any); // Cast necesario por tipos complejos de Supabase
        }
      } catch (error) {
        console.error('Error cargando tasas:', error);
      } finally {
        setLoadingRates(false);
      }
    };

    fetchRates();
  }, []);

  // Función para obtener monedas únicas disponibles para origen
  const uniqueFromCurrencies = Array.from(new Set(exchangeRates.map(r => r.from_currency.code)));

  // Función para obtener monedas disponibles para destino basado en el origen seleccionado
  const availableToCurrencies = exchangeRates
    .filter(r => r.from_currency.code === fromCurrencyCode)
    .map(r => r.to_currency.code);

  // Efecto para ajustar moneda destino si la actual no es válida para el nuevo origen
  useEffect(() => {
    if (availableToCurrencies.length > 0 && !availableToCurrencies.includes(toCurrencyCode)) {
      setToCurrencyCode(availableToCurrencies[0]);
    }
  }, [fromCurrencyCode, availableToCurrencies, toCurrencyCode]);

  // Componente de bandera/icono por código
  const CountryFlag = ({ code, size = 48 }: { code: string; size?: number }) => {
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
    const countryFlags: Record<string, string> = {
      VE: '/flags/ve.svg',
      CO: '/flags/co.svg',
      PE: '/flags/pe.svg',
      CL: '/flags/cl.svg',
      PA: '/flags/pa.svg',
      US: '/flags/us.svg',
    };

    // Si es una bandera de país, usar Image con el archivo SVG
    if (countryFlags[flagCode]) {
      return (
        <span className="flex-shrink-0">
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
      EU: (
        <svg viewBox="0 0 60 40" width={size} height={size * 0.67} className="rounded shadow">
          <rect fill="#003399" width="60" height="40" />
          <circle cx="30" cy="20" r="10" fill="none" stroke="#FFCC00" strokeWidth="2" />
        </svg>
      ),
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

    return <span className="flex-shrink-0">{platformIcons[flagCode] || null}</span>;
  };

  // Calcular monto a recibir usando datos reales
  const currentRateObj = exchangeRates.find(
    r => r.from_currency.code === fromCurrencyCode && r.to_currency.code === toCurrencyCode
  );
  const currentRate = currentRateObj?.rate || 0;
  // Usar el símbolo de la moneda DESTINO
  const currentSymbol = currentRateObj?.to_currency.symbol || '';

  const receivedAmount = (parseFloat(amount) || 0) * currentRate;

  // Función para formatear números
  const formatNumber = (num: number, decimals: number = 2) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(num);
  };

  // Efecto de scroll
  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Efecto rotación países demo
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentCountryIndex((prev) => (prev + 1) % countries.length);
    }, 1000);
    return () => clearInterval(interval);
  }, [countries.length]);

  return (
    <>
      {/* Ticker de Tasas - Sticky */}
      <div className="sticky top-0 z-[60] bg-gradient-to-r from-[#05294F] to-[#07478F] py-2 overflow-hidden min-h-[48px]">
        {loadingRates ? (
          <div className="flex justify-center text-white/50 text-xs animate-pulse">Cargando tasas en tiempo real...</div>
        ) : (
          <div className="animate-marquee whitespace-nowrap flex items-center gap-12 w-max">
            {[...exchangeRates, ...exchangeRates].map((rate, i) => (
              <span key={i} className="inline-flex items-center gap-2 text-white/90 text-sm">
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
        )}
      </div>

      <main className="min-h-screen overflow-x-hidden">
        {/* Header Premium */}
        <header className={`sticky top-[40px] z-50 transition-all duration-300 backdrop-blur-md ${isScrolled
          ? 'bg-white/95 shadow-lg'
          : 'bg-white/10'
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
              <nav className="hidden md:flex items-center gap-12">
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
        <section className="relative min-h-[90vh] flex items-center -mt-20 pt-20">
          {/* Imagen de fondo */}
          <div className="absolute inset-0">
            <Image
              src="/images/cambio_divisas.png"
              alt="Cambio de divisas"
              fill
              className="object-cover"
              priority
            />
          </div>

          {/* Overlay azul con gradiente */}
          <div className="absolute inset-0 bg-gradient-to-br from-[#05294F]/95 via-[#07478F]/93 to-[#0a5cb8]/95"></div>

          {/* Background Pattern decorativo */}
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
                  <span
                    key={currentCountryIndex}
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
                      {loadingRates ? (
                        <div className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-400">Cargando...</div>
                      ) : (
                        <select
                          value={fromCurrencyCode}
                          onChange={(e) => setFromCurrencyCode(e.target.value)}
                          className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 pr-10 text-gray-900 font-medium focus:ring-2 focus:ring-[#05294F] focus:border-transparent appearance-none"
                        >
                          {uniqueFromCurrencies.map(code => (
                            <option key={code} value={code}>
                              {exchangeRates.find(r => r.from_currency.code === code)?.from_currency.symbol} {exchangeRates.find(r => r.from_currency.code === code)?.from_currency.name} ({code})
                            </option>
                          ))}
                        </select>
                      )}
                      {!loadingRates && <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />}
                    </div>
                  </div>

                  {/* Moneda Destino */}
                  <div className="mb-4">
                    <label className="text-sm font-medium text-gray-600 mb-2 block">Moneda de Destino</label>
                    <div className="relative">
                      {loadingRates ? (
                        <div className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-400">Cargando...</div>
                      ) : (
                        <select
                          value={toCurrencyCode}
                          onChange={(e) => setToCurrencyCode(e.target.value)}
                          className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 pr-10 text-gray-900 font-medium focus:ring-2 focus:ring-[#05294F] focus:border-transparent appearance-none"
                        >
                          {availableToCurrencies.map(code => (
                            <option key={code} value={code}>
                              {exchangeRates.find(r => r.to_currency.code === code)?.to_currency.symbol} {exchangeRates.find(r => r.to_currency.code === code)?.to_currency.name} ({code})
                            </option>
                          ))}
                        </select>
                      )}
                      {!loadingRates && <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />}
                    </div>
                  </div>

                  {/* Monto a Enviar */}
                  <div className="mb-4">
                    <label className="text-sm font-medium text-gray-600 mb-2 block">Monto a Enviar</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">
                        {exchangeRates.find(r => r.from_currency.code === fromCurrencyCode)?.from_currency.symbol || '$'}
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
            </div>
          </div>
        </section>

        {/* Por Qué Elegirnos */}
        <section className="py-20 bg-white">
          {/* ... (contenido estático sin cambios) ... */}
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
        <section id="como-funciona" className="py-20 bg-gradient-to-br from-slate-100 to-blue-100">
          {/* ... (contenido estático sin cambios) ... */}
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
              <div className="hidden lg:block absolute top-12 left-1/2 -translate-x-1/2 w-[80%] h-1 bg-gradient-to-r from-[#05294F] via-[#07478F] to-[#05294F] rounded-full"></div>

              <div className="grid md:grid-cols-3 lg:grid-cols-5 gap-12">
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
          {/* ... (contenido estático sin cambios) ... */}
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
                Bancos Aliados
              </h2>
              <p className="text-gray-600">Trabajamos con los principales bancos de la región</p>
            </div>

            <div className="flex flex-wrap justify-center items-center gap-12">
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
        <section id="tasas" className="py-20 bg-gradient-to-br from-slate-100 to-blue-100">
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
              <div className="bg-[#05294F] text-white px-6 py-4 grid grid-cols-4 font-semibold text-sm">
                <span>Conversión</span>
                <span className="text-center">Envías</span>
                <span className="text-center">Recibes</span>
                <span className="text-right">Acción</span>
              </div>

              {loadingRates ? (
                <div className="px-6 py-12 text-center text-gray-500">
                  <div className="animate-spin inline-block w-6 h-6 border-2 border-current border-t-transparent rounded-full mb-2"></div>
                  <p>Cargando tasas...</p>
                </div>
              ) : (
                <>
                  {exchangeRates.filter(r => r.from_currency.code === activeTab).map((rate, i) => {
                    const key = `${rate.from_currency.code}-${rate.to_currency.code}`;
                    const inputAmount = tableAmounts[key] ?? "1";
                    const calculatedAmount = (parseFloat(inputAmount) || 0) * rate.rate;

                    return (
                      <div key={i} className="px-6 py-4 grid grid-cols-4 items-center border-b border-gray-100 hover:bg-gray-50 transition-colors">
                        <span className="flex items-center gap-2">
                          <CountryFlag code={rate.from_currency.code} size={24} />
                          <span className="text-xs font-medium text-gray-600">{rate.from_currency.code}</span>
                          <ArrowRight size={14} className="text-gray-400" />
                          <CountryFlag code={rate.to_currency.code} size={24} />
                          <span className="text-xs font-medium text-gray-600">{rate.to_currency.code}</span>
                        </span>
                        <div className="flex items-center justify-center">
                          <input
                            type="number"
                            value={inputAmount}
                            onChange={(e) => setTableAmounts(prev => ({ ...prev, [key]: e.target.value }))}
                            className="w-20 text-center border border-gray-200 rounded-lg px-2 py-1 text-sm font-medium focus:ring-2 focus:ring-[#05294F] focus:border-transparent"
                            min="0"
                          />
                          <span className="ml-1 text-xs text-gray-500">{rate.from_currency.code}</span>
                        </div>
                        <span className="text-center font-bold text-lg text-green-600">
                          {rate.to_currency.symbol} {formatNumber(calculatedAmount, 2)}
                        </span>
                        <div className="text-right">
                          <Link href="/register" className="inline-flex items-center gap-1 bg-gradient-to-r from-amber-500 to-orange-500 text-white px-4 py-2 rounded-lg font-medium text-sm hover:shadow-lg transition-all no-underline">
                            Enviar <ArrowRight size={16} />
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                  {exchangeRates.filter(r => r.from_currency.code === activeTab).length === 0 && (
                    <div className="px-6 py-8 text-center text-gray-500">
                      No hay tasas disponibles para esta moneda
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </section>

        {/* Testimonios de Clientes - Carrusel Animado */}
        {/* ... (mantener igual por ahora, son estáticos) ... */}
        <section className="py-20 bg-white overflow-hidden">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                Lo que dicen nuestros <span className="text-[#05294F]">clientes</span>
              </h2>
              <p className="text-gray-600 max-w-2xl mx-auto">
                Miles de personas confían en Fengxchange para sus transferencias internacionales
              </p>
            </div>
          </div>

          {/* Carrusel de testimonios */}
          <div className="animate-marquee-slow flex gap-6">
            {[...Array(2)].map((_, setIndex) => (
              <div key={setIndex} className="flex gap-6 shrink-0">
                {[
                  { name: 'María González', conversion: 'USD → VES', review: 'Excelente servicio, mi dinero llegó en menos de 10 minutos. La tasa fue mejor que en otros lugares. ¡100% recomendado!' },
                  { name: 'Carlos Rodríguez', conversion: 'COP → VES', review: 'Llevo 6 meses usando Fengxchange y nunca he tenido problemas. El soporte responde súper rápido por WhatsApp.' },
                  { name: 'Ana Martínez', conversion: 'USD → COP', review: 'La mejor plataforma para enviar dinero a Colombia. Tasas justas y transferencias instantáneas.' },
                  { name: 'José Hernández', conversion: 'EUR → VES', review: 'Desde España envío dinero a Venezuela cada mes. Fengxchange me ha ahorrado mucho en comisiones.' },
                  { name: 'Patricia López', conversion: 'USD → PEN', review: 'Muy fácil de usar, incluso para personas que no somos muy tecnológicas. El proceso es súper sencillo.' },
                  { name: 'Miguel Sánchez', conversion: 'VES → COP', review: 'Necesitaba enviar bolívares a Colombia urgentemente y Fengxchange me salvó. En 15 minutos llegó.' },
                  { name: 'Laura Pérez', conversion: 'USD → CLP', review: 'Las mejores tasas para Chile que he encontrado. Ya recomendé la plataforma a todos mis amigos.' },
                  { name: 'Roberto Díaz', conversion: 'PAYPAL → VES', review: 'Pude cambiar mi saldo de PayPal a bolívares sin ningún problema. Proceso rápido y tasa competitiva.' },
                  { name: 'Carmen Ruiz', conversion: 'COP → PEN', review: 'Excelente para envíos entre países latinoamericanos. La atención al cliente es de primera calidad.' },
                  { name: 'Fernando Torres', conversion: 'USD → VES', review: 'Ya perdí la cuenta de cuántas transferencias he hecho. Siempre puntuales y con las mejores tasas.' },
                ].map((testimonial, i) => (
                  <div
                    key={i}
                    className="w-80 shrink-0 bg-gradient-to-br from-slate-100 to-blue-100 border border-gray-100 rounded-2xl p-6 shadow-lg"
                  >
                    {/* Estrellas */}
                    <div className="flex gap-1 mb-3">
                      {[...Array(5)].map((_, j) => (
                        <svg key={j} className="w-4 h-4 text-amber-400 fill-current" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      ))}
                    </div>

                    {/* Review */}
                    <p className="text-gray-700 text-sm mb-4 leading-relaxed whitespace-normal">&quot;{testimonial.review}&quot;</p>

                    {/* Cliente info */}
                    <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-gradient-to-br from-[#05294F] to-[#07478F] rounded-full flex items-center justify-center text-white font-bold text-xs">
                          {testimonial.name.split(' ').map(n => n[0]).join('')}
                        </div>
                        <span className="font-semibold text-gray-900 text-sm">{testimonial.name}</span>
                      </div>
                      <span className="text-xs font-medium text-[#05294F] bg-blue-100 px-2 py-1 rounded-full">
                        {testimonial.conversion}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ))}
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
    </>
  );
}
