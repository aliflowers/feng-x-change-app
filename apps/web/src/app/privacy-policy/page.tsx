'use client';

import Link from 'next/link';
import { ArrowLeft, Shield, Eye, Database, Share2, UserCheck, Clock, Mail } from 'lucide-react';

export default function PrivacyPolicyPage() {
 const sections = [
  {
   icon: Shield,
   title: '1. Introducción',
   color: 'from-blue-500 to-indigo-500',
   content: (
    <p className="text-white/80 leading-relaxed">
     Feng Digital Service LLC. (&quot;nosotros&quot;, &quot;nuestro&quot; o &quot;la Empresa&quot;) se compromete a
     proteger la privacidad de sus usuarios. Esta Política de Privacidad describe cómo recopilamos,
     usamos, almacenamos y protegemos su información personal cuando utiliza nuestra plataforma
     de cambio de divisas y servicios relacionados.
    </p>
   ),
  },
  {
   icon: Database,
   title: '2. Información que Recopilamos',
   color: 'from-amber-500 to-orange-500',
   content: (
    <>
     <p className="text-white/80 leading-relaxed mb-3">Recopilamos los siguientes tipos de información:</p>
     <ul className="space-y-2 text-white/70">
      <li className="flex items-start gap-2"><span className="text-amber-400 mt-1">•</span><span><strong className="text-white/90">Datos de identificación:</strong> Nombre completo, tipo y número de documento de identidad, nacionalidad y país de residencia.</span></li>
      <li className="flex items-start gap-2"><span className="text-amber-400 mt-1">•</span><span><strong className="text-white/90">Datos de contacto:</strong> Dirección de correo electrónico y número de teléfono.</span></li>
      <li className="flex items-start gap-2"><span className="text-amber-400 mt-1">•</span><span><strong className="text-white/90">Datos financieros:</strong> Información de cuentas bancarias y datos de transacciones para procesar operaciones de cambio de divisas.</span></li>
      <li className="flex items-start gap-2"><span className="text-amber-400 mt-1">•</span><span><strong className="text-white/90">Datos de verificación (KYC):</strong> Información proporcionada durante el proceso de verificación de identidad, incluyendo fotografías de documentos y selfies de verificación.</span></li>
      <li className="flex items-start gap-2"><span className="text-amber-400 mt-1">•</span><span><strong className="text-white/90">Datos de PayPal:</strong> Cuando utiliza &quot;Log In with PayPal&quot;, recopilamos su nombre y correo electrónico asociado a su cuenta PayPal para verificar su identidad.</span></li>
      <li className="flex items-start gap-2"><span className="text-amber-400 mt-1">•</span><span><strong className="text-white/90">Datos técnicos:</strong> Dirección IP, tipo de navegador, dispositivo y datos de uso de la plataforma.</span></li>
     </ul>
    </>
   ),
  },
  {
   icon: Eye,
   title: '3. Uso de la Información',
   color: 'from-green-500 to-emerald-500',
   content: (
    <>
     <p className="text-white/80 leading-relaxed mb-3">Utilizamos su información para:</p>
     <ul className="space-y-2 text-white/70">
      <li className="flex items-start gap-2"><span className="text-green-400 mt-1">•</span>Procesar y completar operaciones de cambio de divisas.</li>
      <li className="flex items-start gap-2"><span className="text-green-400 mt-1">•</span>Verificar su identidad y cumplir con regulaciones anti-lavado de dinero (AML/KYC).</li>
      <li className="flex items-start gap-2"><span className="text-green-400 mt-1">•</span>Prevenir fraudes y actividades no autorizadas.</li>
      <li className="flex items-start gap-2"><span className="text-green-400 mt-1">•</span>Comunicarnos con usted sobre sus transacciones y actualizaciones del servicio.</li>
      <li className="flex items-start gap-2"><span className="text-green-400 mt-1">•</span>Mejorar la seguridad y funcionalidad de nuestra plataforma.</li>
      <li className="flex items-start gap-2"><span className="text-green-400 mt-1">•</span>Cumplir con obligaciones legales y regulatorias.</li>
     </ul>
    </>
   ),
  },
  {
   icon: Shield,
   title: '4. Protección de Datos',
   color: 'from-purple-500 to-pink-500',
   content: (
    <p className="text-white/80 leading-relaxed">
     Implementamos medidas de seguridad técnicas y organizativas para proteger su información,
     incluyendo cifrado de datos, autenticación de dos factores (2FA), y acceso restringido
     a la información personal. Los datos se almacenan en servidores seguros con cifrado en
     reposo y en tránsito.
    </p>
   ),
  },
  {
   icon: Share2,
   title: '5. Compartir Información',
   color: 'from-blue-500 to-cyan-500',
   content: (
    <>
     <p className="text-white/80 leading-relaxed mb-3">
      No vendemos, alquilamos ni compartimos su información personal con terceros para sus
      propios fines de marketing. Podemos compartir información con:
     </p>
     <ul className="space-y-2 text-white/70">
      <li className="flex items-start gap-2"><span className="text-cyan-400 mt-1">•</span><span><strong className="text-white/90">Proveedores de servicios:</strong> PayPal, procesadores de pago y servicios de verificación KYC.</span></li>
      <li className="flex items-start gap-2"><span className="text-cyan-400 mt-1">•</span><span><strong className="text-white/90">Autoridades regulatorias:</strong> Cuando sea requerido por ley o regulaciones aplicables.</span></li>
      <li className="flex items-start gap-2"><span className="text-cyan-400 mt-1">•</span><span><strong className="text-white/90">Socios bancarios:</strong> Instituciones financieras necesarias para completar transferencias.</span></li>
     </ul>
    </>
   ),
  },
  {
   icon: UserCheck,
   title: '6. Sus Derechos',
   color: 'from-amber-500 to-orange-500',
   content: (
    <>
     <p className="text-white/80 leading-relaxed mb-3">Usted tiene derecho a:</p>
     <ul className="space-y-2 text-white/70">
      <li className="flex items-start gap-2"><span className="text-amber-400 mt-1">•</span>Acceder a sus datos personales almacenados en nuestra plataforma.</li>
      <li className="flex items-start gap-2"><span className="text-amber-400 mt-1">•</span>Solicitar la corrección de datos inexactos.</li>
      <li className="flex items-start gap-2"><span className="text-amber-400 mt-1">•</span>Solicitar la eliminación de su cuenta y datos personales, sujeto a obligaciones legales de retención.</li>
      <li className="flex items-start gap-2"><span className="text-amber-400 mt-1">•</span>Retirar su consentimiento para el procesamiento de datos en cualquier momento.</li>
     </ul>
    </>
   ),
  },
  {
   icon: Clock,
   title: '7. Retención de Datos',
   color: 'from-indigo-500 to-violet-500',
   content: (
    <p className="text-white/80 leading-relaxed">
     Conservamos su información personal durante el tiempo que sea necesario para cumplir
     con los fines descritos en esta política, o según lo requiera la ley. Los registros
     de transacciones se conservan según las regulaciones financieras aplicables.
    </p>
   ),
  },
  {
   icon: Mail,
   title: '8. Contacto',
   color: 'from-green-500 to-teal-500',
   content: (
    <p className="text-white/80 leading-relaxed">
     Si tiene preguntas sobre esta Política de Privacidad o desea ejercer sus derechos,
     puede contactarnos a través de nuestra plataforma o enviando un correo electrónico
     a nuestro equipo de soporte.
    </p>
   ),
  },
 ];

 return (
  <div className="min-h-screen bg-gradient-to-br from-[#05294F] via-[#07478F] to-[#0a5cb8] relative overflow-hidden">
   {/* Decorative blurs */}
   <div className="absolute inset-0 opacity-10 pointer-events-none">
    <div className="absolute top-20 left-10 w-72 h-72 bg-white rounded-full blur-3xl" />
    <div className="absolute bottom-40 right-10 w-96 h-96 bg-amber-400 rounded-full blur-3xl" />
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-300 rounded-full blur-3xl" />
   </div>

   {/* Header */}
   <header className="sticky top-0 z-10 bg-white/5 backdrop-blur-xl border-b border-white/10">
    <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-3">
     <Link href="/" className="w-9 h-9 bg-white/10 hover:bg-white/20 rounded-lg flex items-center justify-center text-white transition-all">
      <ArrowLeft size={18} />
     </Link>
     <div>
      <h1 className="text-lg font-bold text-white">Política de Privacidad</h1>
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
      <Link href="/user-agreement" className="text-white/50 hover:text-white transition-colors">
       Términos y Condiciones
      </Link>
      <span className="text-white/20">|</span>
      <span className="text-amber-400/80 font-medium">Política de Privacidad</span>
     </div>
    </div>
   </main>
  </div>
 );
}
