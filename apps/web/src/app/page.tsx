import Link from 'next/link';
import Image from 'next/image';
import { supabase } from '@/lib/supabase/client';
import {
  Shield,
  Zap,
  TrendingUp,
  Headphones,
  CheckCircle,
  Users,
  Clock,
  Building,
  ArrowRightLeft,
  ArrowRight,
} from 'lucide-react';
import { ExchangeTicker } from '@/components/home/ExchangeTicker';
import { ExchangeCalculator } from '@/components/home/ExchangeCalculator';
import { HeroTitle } from '@/components/home/HeroTitle';
import { ExchangeTable } from '@/components/home/ExchangeTable';
import { LandingHeader } from '@/components/home/LandingHeader';
import { LandingFooter } from '@/components/home/LandingFooter';

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

export const revalidate = 60; // Revalidar cada minuto para mantener tasas frescas

export default async function HomePage() {
  // Data Fetching en el Servidor (RSC) w/o Waterfall
  // Al ser un componente asíncrono, podemos usar await directamente
  const { data: exchangeRates } = await supabase
    .from('exchange_rates')
    .select(`
      *,
      from_currency:currencies!exchange_rates_from_currency_id_fkey(code, name, symbol),
      to_currency:currencies!exchange_rates_to_currency_id_fkey(code, name, symbol)
    `)
    .eq('is_active', true)
    .order('id', { ascending: true });

  const rates = (exchangeRates as any[]) || [];

  return (
    <>
      {/* Ticker de Tasas - Sticky */}
      <div className="sticky top-0 z-[60] bg-gradient-to-r from-[#05294F] to-[#07478F] py-2 overflow-hidden min-h-[48px]">
        <ExchangeTicker rates={rates} />
      </div>

      <main className="min-h-screen overflow-x-hidden">
        {/* Header Premium - Client Component */}
        <LandingHeader />

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
              <HeroTitle />

              {/* Calculadora Glassmorphism */}
              <ExchangeCalculator rates={rates} />
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
        <section id="como-funciona" className="py-20 bg-gradient-to-br from-slate-100 to-blue-100">
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
          <ExchangeTable rates={rates} />
        </section>

        {/* Testimonios de Clientes - Carrusel Animado */}
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
          <div className="animate-marquee-slow flex w-max hover:[animation-play-state:paused] group">
            {[...Array(2)].map((_, setIndex) => (
              <div key={setIndex} className="flex gap-6 pr-6 shrink-0">
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

        {/* Footer Premium - Client Component */}
        <LandingFooter />
      </main>
    </>
  );
}
