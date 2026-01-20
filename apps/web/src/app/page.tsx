import Link from 'next/link';

/**
 * Landing Page Principal
 * Ruta: /
 */
export default function HomePage() {
 return (
  <main className="min-h-screen">
   {/* Hero Section */}
   <section className="hero-gradient min-h-[80vh] flex items-center justify-center">
    <div className="container-app text-center">
     <h1 className="text-4xl md:text-title-xl text-white mb-6 animate-fade-in">
      Cambio de Divisas
      <br />
      <span className="text-yellow-400">Rápido y Seguro</span>
     </h1>
     <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
      Envía dinero a Venezuela, Colombia y Perú con las mejores tasas del
      mercado. Proceso automático y transparente.
     </p>
     <div className="flex flex-col sm:flex-row gap-4 justify-center">
      <Link href="/register" className="btn-primary text-lg px-8 py-4">
       Comenzar Ahora
      </Link>
      <Link href="/login" className="btn-secondary text-lg px-8 py-4">
       Iniciar Sesión
      </Link>
     </div>
    </div>
   </section>

   {/* Tasas Section (Placeholder) */}
   <section className="py-16 bg-bg-form">
    <div className="container-app">
     <h2 className="text-title-md text-center text-text-dark mb-12">
      Tasas del Día
     </h2>
     <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* USD → VES */}
      <div className="card text-center">
       <p className="text-sm text-gray-500 mb-2">USD → VES</p>
       <p className="text-3xl font-bold text-primary">42.50 Bs</p>
       <p className="text-xs text-gray-400 mt-2">Actualizado hoy</p>
      </div>
      {/* USD → COP */}
      <div className="card text-center">
       <p className="text-sm text-gray-500 mb-2">USD → COP</p>
       <p className="text-3xl font-bold text-primary">4,150 COP</p>
       <p className="text-xs text-gray-400 mt-2">Actualizado hoy</p>
      </div>
      {/* USD → PEN */}
      <div className="card text-center">
       <p className="text-sm text-gray-500 mb-2">USD → PEN</p>
       <p className="text-3xl font-bold text-primary">3.75 PEN</p>
       <p className="text-xs text-gray-400 mt-2">Actualizado hoy</p>
      </div>
     </div>
    </div>
   </section>

   {/* CTA WhatsApp */}
   <section className="py-12 bg-white">
    <div className="container-app text-center">
     <h3 className="text-title-sm text-text-dark mb-4">
      ¿Tienes preguntas?
     </h3>
     <p className="text-gray-600 mb-6">
      Estamos disponibles 24/7 para ayudarte
     </p>
     <a
      href="https://wa.me/1234567890"
      target="_blank"
      rel="noopener noreferrer"
      className="btn-whatsapp text-lg"
     >
      <svg
       className="w-6 h-6"
       fill="currentColor"
       viewBox="0 0 24 24"
       aria-hidden="true"
      >
       <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
      </svg>
      Escríbenos por WhatsApp
     </a>
    </div>
   </section>

   {/* Footer */}
   <footer className="bg-hero-start text-white py-8">
    <div className="container-app text-center">
     <p className="text-sm text-white/70">
      © {new Date().getFullYear()} Fengxchange. Todos los derechos
      reservados.
     </p>
    </div>
   </footer>
  </main>
 );
}
