'use client';

import Link from 'next/link';
import { ArrowLeft, FileText, Users, UserCheck, Shield, Landmark, CreditCard, Scale, RefreshCw, XCircle, Gavel, Mail } from 'lucide-react';

export default function UserAgreementPage() {
 const sections = [
  {
   icon: FileText,
   title: '1. Aceptación de Términos',
   color: 'from-blue-500 to-indigo-500',
   content: (
    <p className="text-white/80 leading-relaxed">
     Al acceder y utilizar la plataforma de Feng Digital Service LLC. (&quot;FengXChange&quot; o
     &quot;la Plataforma&quot;), usted acepta cumplir con estos Términos y Condiciones de Uso.
     Si no está de acuerdo con alguno de estos términos, por favor no utilice nuestros servicios.
    </p>
   ),
  },
  {
   icon: Landmark,
   title: '2. Descripción del Servicio',
   color: 'from-amber-500 to-orange-500',
   content: (
    <>
     <p className="text-white/80 leading-relaxed mb-3">
      FengXChange es una plataforma de cambio de divisas que permite a los usuarios realizar
      operaciones de envío de remesas y cambio de monedas. Los servicios incluyen:
     </p>
     <ul className="space-y-2 text-white/70">
      <li className="flex items-start gap-2"><span className="text-amber-400 mt-1">•</span>Cambio de divisas a tasas de cambio publicadas en la plataforma.</li>
      <li className="flex items-start gap-2"><span className="text-amber-400 mt-1">•</span>Solicitudes de pago a través de PayPal.</li>
      <li className="flex items-start gap-2"><span className="text-amber-400 mt-1">•</span>Transferencias bancarias y por plataformas digitales.</li>
      <li className="flex items-start gap-2"><span className="text-amber-400 mt-1">•</span>Gestión de beneficiarios para envíos recurrentes.</li>
     </ul>
    </>
   ),
  },
  {
   icon: Users,
   title: '3. Elegibilidad y Registro',
   color: 'from-green-500 to-emerald-500',
   content: (
    <>
     <p className="text-white/80 leading-relaxed mb-3">Para utilizar nuestros servicios, usted debe:</p>
     <ul className="space-y-2 text-white/70">
      <li className="flex items-start gap-2"><span className="text-green-400 mt-1">•</span>Ser mayor de 18 años.</li>
      <li className="flex items-start gap-2"><span className="text-green-400 mt-1">•</span>Proporcionar información veraz, precisa y completa durante el registro.</li>
      <li className="flex items-start gap-2"><span className="text-green-400 mt-1">•</span>Completar el proceso de verificación de identidad (KYC) cuando sea requerido.</li>
      <li className="flex items-start gap-2"><span className="text-green-400 mt-1">•</span>Mantener la confidencialidad de sus credenciales de acceso.</li>
     </ul>
    </>
   ),
  },
  {
   icon: UserCheck,
   title: '4. Obligaciones del Usuario',
   color: 'from-purple-500 to-pink-500',
   content: (
    <>
     <p className="text-white/80 leading-relaxed mb-3">El usuario se compromete a:</p>
     <ul className="space-y-2 text-white/70">
      <li className="flex items-start gap-2"><span className="text-purple-400 mt-1">•</span>No utilizar la plataforma para actividades ilegales, incluyendo lavado de dinero o financiamiento del terrorismo.</li>
      <li className="flex items-start gap-2"><span className="text-purple-400 mt-1">•</span>Proporcionar información verídica en todas las transacciones.</li>
      <li className="flex items-start gap-2"><span className="text-purple-400 mt-1">•</span>No compartir sus credenciales de acceso con terceros.</li>
      <li className="flex items-start gap-2"><span className="text-purple-400 mt-1">•</span>Notificar inmediatamente cualquier uso no autorizado de su cuenta.</li>
      <li className="flex items-start gap-2"><span className="text-purple-400 mt-1">•</span>Cumplir con las leyes y regulaciones aplicables en su jurisdicción.</li>
     </ul>
    </>
   ),
  },
  {
   icon: Shield,
   title: '5. Cuentas de Afiliado',
   color: 'from-indigo-500 to-violet-500',
   content: (
    <>
     <p className="text-white/80 leading-relaxed mb-3">
      Los usuarios designados como &quot;Afiliados&quot; pueden realizar operaciones en nombre de
      terceros. Los afiliados están sujetos a obligaciones adicionales:
     </p>
     <ul className="space-y-2 text-white/70">
      <li className="flex items-start gap-2"><span className="text-violet-400 mt-1">•</span>Activar y mantener la autenticación de dos factores (2FA) de forma obligatoria.</li>
      <li className="flex items-start gap-2"><span className="text-violet-400 mt-1">•</span>Asumir responsabilidad por las transacciones realizadas en nombre de sus clientes.</li>
      <li className="flex items-start gap-2"><span className="text-violet-400 mt-1">•</span>No permitir el acceso no autorizado a su cuenta.</li>
      <li className="flex items-start gap-2"><span className="text-violet-400 mt-1">•</span>Reportar cualquier actividad sospechosa de inmediato.</li>
     </ul>
    </>
   ),
  },
  {
   icon: CreditCard,
   title: '6. Pagos con PayPal',
   color: 'from-blue-500 to-cyan-500',
   content: (
    <p className="text-white/80 leading-relaxed">
     Las transacciones realizadas a través de PayPal están sujetas a los términos y condiciones
     de PayPal, Inc. Al utilizar el servicio de &quot;Log In with PayPal&quot;, usted autoriza a
     FengXChange a verificar su identidad y acceder a información básica de su perfil de PayPal
     (nombre y correo electrónico) para la prevención de fraudes.
    </p>
   ),
  },
  {
   icon: Scale,
   title: '7. Limitación de Responsabilidad',
   color: 'from-red-500 to-orange-500',
   content: (
    <>
     <p className="text-white/80 leading-relaxed mb-3">FengXChange no será responsable por:</p>
     <ul className="space-y-2 text-white/70">
      <li className="flex items-start gap-2"><span className="text-orange-400 mt-1">•</span>Pérdidas derivadas de fluctuaciones en las tasas de cambio.</li>
      <li className="flex items-start gap-2"><span className="text-orange-400 mt-1">•</span>Retrasos en transferencias bancarias causados por instituciones financieras de terceros.</li>
      <li className="flex items-start gap-2"><span className="text-orange-400 mt-1">•</span>Daños resultantes del uso indebido de la cuenta por parte del usuario.</li>
      <li className="flex items-start gap-2"><span className="text-orange-400 mt-1">•</span>Interrupciones del servicio causadas por eventos de fuerza mayor.</li>
     </ul>
    </>
   ),
  },
  {
   icon: RefreshCw,
   title: '8. Modificaciones',
   color: 'from-teal-500 to-green-500',
   content: (
    <p className="text-white/80 leading-relaxed">
     Nos reservamos el derecho de modificar estos términos en cualquier momento. Las
     modificaciones serán efectivas una vez publicadas en la plataforma. El uso continuado
     del servicio después de la publicación de cambios constituye la aceptación de los mismos.
    </p>
   ),
  },
  {
   icon: XCircle,
   title: '9. Cancelación de Cuenta',
   color: 'from-rose-500 to-pink-500',
   content: (
    <p className="text-white/80 leading-relaxed">
     Usted puede solicitar la cancelación de su cuenta en cualquier momento. FengXChange
     se reserva el derecho de suspender o cancelar cuentas que violen estos términos o
     que presenten actividad sospechosa. Las transacciones pendientes al momento de la
     cancelación serán procesadas según corresponda.
    </p>
   ),
  },
  {
   icon: Gavel,
   title: '10. Ley Aplicable',
   color: 'from-amber-500 to-orange-500',
   content: (
    <p className="text-white/80 leading-relaxed">
     Estos términos se regirán e interpretarán de acuerdo con las leyes del Estado de
     Florida, Estados Unidos de América, sin perjuicio de sus disposiciones sobre
     conflictos de leyes.
    </p>
   ),
  },
  {
   icon: Mail,
   title: '11. Contacto',
   color: 'from-blue-500 to-indigo-500',
   content: (
    <p className="text-white/80 leading-relaxed">
     Si tiene preguntas sobre estos Términos y Condiciones, puede contactarnos a través
     de nuestra plataforma o enviando un correo electrónico a nuestro equipo de soporte.
    </p>
   ),
  },
 ];

 return (
  <div className="min-h-screen bg-gradient-to-br from-[#05294F] via-[#07478F] to-[#0a5cb8] relative overflow-hidden">
   {/* Decorative blurs */}
   <div className="absolute inset-0 opacity-10 pointer-events-none">
    <div className="absolute top-20 right-20 w-72 h-72 bg-white rounded-full blur-3xl" />
    <div className="absolute bottom-40 left-10 w-96 h-96 bg-amber-400 rounded-full blur-3xl" />
    <div className="absolute top-1/3 left-1/3 w-[500px] h-[500px] bg-blue-300 rounded-full blur-3xl" />
   </div>

   {/* Header */}
   <header className="sticky top-0 z-10 bg-white/5 backdrop-blur-xl border-b border-white/10">
    <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-3">
     <Link href="/" className="w-9 h-9 bg-white/10 hover:bg-white/20 rounded-lg flex items-center justify-center text-white transition-all">
      <ArrowLeft size={18} />
     </Link>
     <div>
      <h1 className="text-lg font-bold text-white">Acuerdo de Usuario</h1>
      <p className="text-xs text-white/50">Última actualización: Marzo 2026</p>
     </div>
    </div>
   </header>

   <main className="max-w-4xl mx-auto px-4 py-10 relative z-10 space-y-6">
    {sections.map((section, i) => (
     <div
      key={i}
      className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 hover:bg-white/[0.07] transition-all"
     >
      <div className="flex items-center gap-3 mb-4">
       <div className={`w-10 h-10 bg-gradient-to-br ${section.color} rounded-xl flex items-center justify-center shadow-lg flex-shrink-0`}>
        <section.icon className="text-white" size={20} />
       </div>
       <h2 className="text-lg font-bold text-white">{section.title}</h2>
      </div>
      <div className="pl-[52px]">
       {section.content}
      </div>
     </div>
    ))}

    {/* Footer */}
    <div className="border-t border-white/10 pt-8 pb-12 text-center">
     <p className="text-sm text-white/40">
      © {new Date().getFullYear()} Feng Digital Service LLC. Todos los derechos reservados.
     </p>
     <div className="flex justify-center gap-6 mt-3 text-sm">
      <span className="text-amber-400/80 font-medium">Términos y Condiciones</span>
      <span className="text-white/20">|</span>
      <Link href="/privacy-policy" className="text-white/50 hover:text-white transition-colors">
       Política de Privacidad
      </Link>
     </div>
    </div>
   </main>
  </div>
 );
}
