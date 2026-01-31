'use client';

import { useState } from 'react';
import {
 Shield,
 Smartphone,
 Mail,
 Key,
 Copy,
 Check,
 Loader2,
 X,
 AlertTriangle,
 CheckCircle2
} from 'lucide-react';

interface SegundoFactorSetupProps {
 isOpen: boolean;
 onClose: () => void;
 onSuccess?: () => void;
 currentMethod?: 'none' | 'email' | 'totp';
}

type Step = 'select' | 'setup' | 'verify' | 'backup' | 'success';

export default function SegundoFactorSetup({
 isOpen,
 onClose,
 onSuccess,
 currentMethod: _currentMethod = 'none'
}: SegundoFactorSetupProps) {
 const [step, setStep] = useState<Step>('select');
 const [method, setMethod] = useState<'email' | 'totp'>('totp');
 const [isLoading, setIsLoading] = useState(false);
 const [error, setError] = useState<string | null>(null);

 // TOTP state
 const [qrCodeImage, setQrCodeImage] = useState<string | null>(null);
 const [secret, setSecret] = useState<string | null>(null);

 // Verification
 const [verificationCode, setVerificationCode] = useState('');

 // Backup codes
 const [backupCodes, setBackupCodes] = useState<string[]>([]);
 const [copiedBackup, setCopiedBackup] = useState(false);

 const handleSelectMethod = async (selectedMethod: 'email' | 'totp') => {
  setMethod(selectedMethod);
  setError(null);
  setIsLoading(true);

  try {
   const res = await fetch('/api/auth/2fa/setup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ method: selectedMethod }),
   });

   const data = await res.json();

   if (!res.ok) {
    throw new Error(data.error || 'Error al configurar 2FA');
   }

   if (selectedMethod === 'totp') {
    setQrCodeImage(data.qrCodeImage);
    setSecret(data.secret);
   }

   setBackupCodes(data.backupCodes || []);
   setStep('setup');
  } catch (err) {
   setError(err instanceof Error ? err.message : 'Error desconocido');
  } finally {
   setIsLoading(false);
  }
 };

 const handleVerify = async () => {
  if (verificationCode.length !== 6) {
   setError('El código debe tener 6 dígitos');
   return;
  }

  setError(null);
  setIsLoading(true);

  try {
   const res = await fetch('/api/auth/2fa/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code: verificationCode }),
   });

   const data = await res.json();

   if (!res.ok) {
    throw new Error(data.error || 'Código incorrecto');
   }

   setStep('backup');
  } catch (err) {
   setError(err instanceof Error ? err.message : 'Error de verificación');
  } finally {
   setIsLoading(false);
  }
 };

 const handleCopyBackupCodes = () => {
  navigator.clipboard.writeText(backupCodes.join('\n'));
  setCopiedBackup(true);
  setTimeout(() => setCopiedBackup(false), 2000);
 };

 const handleFinish = () => {
  setStep('success');
  setTimeout(() => {
   onSuccess?.();
   onClose();
  }, 2000);
 };

 const handleClose = () => {
  setStep('select');
  setVerificationCode('');
  setError(null);
  setQrCodeImage(null);
  setSecret(null);
  onClose();
 };

 if (!isOpen) return null;

 return (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
   <div className="bg-gray-900 rounded-2xl w-full max-w-lg mx-4 border border-gray-700 shadow-2xl">
    {/* Header */}
    <div className="flex items-center justify-between p-6 border-b border-gray-700">
     <div className="flex items-center gap-3">
      <div className="p-2 bg-purple-500/20 rounded-lg">
       <Shield className="w-6 h-6 text-purple-400" />
      </div>
      <div>
       <h2 className="text-xl font-semibold text-white">
        Configurar 2FA
       </h2>
       <p className="text-sm text-gray-400">
        Protege tu cuenta con verificación en dos pasos
       </p>
      </div>
     </div>
     <button
      onClick={handleClose}
      className="p-2 hover:bg-gray-800 rounded-lg transition"
     >
      <X className="w-5 h-5 text-gray-400" />
     </button>
    </div>

    {/* Content */}
    <div className="p-6">
     {/* Step: Select Method */}
     {step === 'select' && (
      <div className="space-y-4">
       <p className="text-gray-300 mb-6">
        Elige cómo quieres recibir los códigos de verificación:
       </p>

       {/* TOTP Option */}
       <button
        onClick={() => handleSelectMethod('totp')}
        disabled={isLoading}
        className="w-full p-4 bg-gray-800 hover:bg-gray-750 border border-gray-700 hover:border-purple-500 rounded-xl transition flex items-center gap-4 group"
       >
        <div className="p-3 bg-purple-500/20 rounded-lg group-hover:bg-purple-500/30 transition">
         <Smartphone className="w-6 h-6 text-purple-400" />
        </div>
        <div className="text-left flex-1">
         <h3 className="font-medium text-white">Google Authenticator</h3>
         <p className="text-sm text-gray-400">
          Usa una app como Google Authenticator o Authy
         </p>
        </div>
        <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded-full">
         Recomendado
        </span>
       </button>

       {/* Email Option */}
       <button
        onClick={() => handleSelectMethod('email')}
        disabled={isLoading}
        className="w-full p-4 bg-gray-800 hover:bg-gray-750 border border-gray-700 hover:border-blue-500 rounded-xl transition flex items-center gap-4"
       >
        <div className="p-3 bg-blue-500/20 rounded-lg">
         <Mail className="w-6 h-6 text-blue-400" />
        </div>
        <div className="text-left flex-1">
         <h3 className="font-medium text-white">Código por Email</h3>
         <p className="text-sm text-gray-400">
          Recibe un código de 6 dígitos en tu email
         </p>
        </div>
       </button>

       {isLoading && (
        <div className="flex items-center justify-center py-4">
         <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
         <span className="ml-2 text-gray-400">Configurando...</span>
        </div>
       )}
      </div>
     )}

     {/* Step: Setup TOTP */}
     {step === 'setup' && method === 'totp' && (
      <div className="space-y-6">
       <div className="text-center">
        <p className="text-gray-300 mb-4">
         Escanea este código QR con tu app de autenticación:
        </p>

        {qrCodeImage && (
         <div className="bg-white p-4 rounded-xl inline-block">
          <img
           src={qrCodeImage}
           alt="QR Code para 2FA"
           className="w-48 h-48"
          />
         </div>
        )}

        <div className="mt-4 text-sm text-gray-400">
         <p>¿No puedes escanear? Ingresa este código manualmente:</p>
         <code className="block mt-2 p-2 bg-gray-800 rounded text-purple-400 font-mono">
          {secret}
         </code>
        </div>
       </div>

       <button
        onClick={() => setStep('verify')}
        className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-medium transition"
       >
        Ya escaneé el código
       </button>
      </div>
     )}

     {/* Step: Setup Email */}
     {step === 'setup' && method === 'email' && (
      <div className="space-y-6">
       <div className="text-center">
        <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
         <Mail className="w-8 h-8 text-blue-400" />
        </div>
        <p className="text-gray-300">
         Te hemos enviado un código de verificación a tu email.
        </p>
        <p className="text-sm text-gray-500 mt-2">
         Revisa tu bandeja de entrada y carpeta de spam.
        </p>
       </div>

       <button
        onClick={() => setStep('verify')}
        className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition"
       >
        Ya recibí el código
       </button>
      </div>
     )}

     {/* Step: Verify Code */}
     {step === 'verify' && (
      <div className="space-y-6">
       <div className="text-center">
        <p className="text-gray-300 mb-2">
         Ingresa el código de 6 dígitos:
        </p>
       </div>

       <input
        type="text"
        value={verificationCode}
        onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
        placeholder="000000"
        className="w-full text-center text-3xl font-mono tracking-[0.5em] py-4 bg-gray-800 border border-gray-700 rounded-xl text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
        autoFocus
       />

       {error && (
        <div className="flex items-center gap-2 p-3 bg-red-900/30 border border-red-700 rounded-lg text-red-300">
         <AlertTriangle className="w-4 h-4" />
         {error}
        </div>
       )}

       <button
        onClick={handleVerify}
        disabled={isLoading || verificationCode.length !== 6}
        className="w-full py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 disabled:text-gray-400 text-white rounded-xl font-medium transition flex items-center justify-center gap-2"
       >
        {isLoading ? (
         <>
          <Loader2 className="w-5 h-5 animate-spin" />
          Verificando...
         </>
        ) : (
         'Verificar Código'
        )}
       </button>
      </div>
     )}

     {/* Step: Backup Codes */}
     {step === 'backup' && (
      <div className="space-y-6">
       <div className="text-center">
        <div className="w-16 h-16 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
         <Key className="w-8 h-8 text-yellow-400" />
        </div>
        <h3 className="text-lg font-medium text-white mb-2">
         Guarda tus códigos de respaldo
        </h3>
        <p className="text-sm text-gray-400">
         Si pierdes acceso a tu método de 2FA, podrás usar estos códigos para ingresar.
        </p>
       </div>

       <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
        <div className="grid grid-cols-2 gap-2">
         {backupCodes.map((code, i) => (
          <code
           key={i}
           className="text-center py-2 bg-gray-900 rounded text-sm font-mono text-green-400"
          >
           {code}
          </code>
         ))}
        </div>

        <button
         onClick={handleCopyBackupCodes}
         className="mt-4 w-full py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg flex items-center justify-center gap-2 transition"
        >
         {copiedBackup ? (
          <>
           <Check className="w-4 h-4 text-green-400" />
           ¡Copiados!
          </>
         ) : (
          <>
           <Copy className="w-4 h-4" />
           Copiar códigos
          </>
         )}
        </button>
       </div>

       <div className="flex items-start gap-2 p-3 bg-yellow-900/30 border border-yellow-700 rounded-lg">
        <AlertTriangle className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />
        <p className="text-sm text-yellow-300">
         Cada código solo puede usarse una vez. Guárdalos en un lugar seguro.
        </p>
       </div>

       <button
        onClick={handleFinish}
        className="w-full py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-medium transition"
       >
        Ya guardé mis códigos
       </button>
      </div>
     )}

     {/* Step: Success */}
     {step === 'success' && (
      <div className="text-center py-8">
       <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
        <CheckCircle2 className="w-10 h-10 text-green-400" />
       </div>
       <h3 className="text-xl font-medium text-white mb-2">
        ¡2FA Configurado!
       </h3>
       <p className="text-gray-400">
        Tu cuenta ahora está más segura.
       </p>
      </div>
     )}

     {/* Error display */}
     {error && step === 'select' && (
      <div className="mt-4 flex items-center gap-2 p-3 bg-red-900/30 border border-red-700 rounded-lg text-red-300">
       <AlertTriangle className="w-4 h-4" />
       {error}
      </div>
     )}
    </div>
   </div>
  </div>
 );
}
