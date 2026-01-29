'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface BusinessConfig {
 business_name: string;
 logo_url: string;
}

interface DynamicLogoProps {
 href?: string;
 size?: 'sm' | 'md' | 'lg';
 showName?: boolean;
 variant?: 'light' | 'dark';
 className?: string;
}

export function DynamicLogo({
 href = '/',
 size = 'md',
 showName = true,
 variant = 'dark',
 className = '',
}: DynamicLogoProps) {
 const [config, setConfig] = useState<BusinessConfig>({
  business_name: 'Fengxchange',
  logo_url: '',
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
      });
     }
    }
   } catch (error) {
    console.error('Error loading business config:', error);
   }
  };
  loadConfig();
 }, []);

 const sizeClasses = {
  sm: { logo: 'w-8 h-8', text: 'text-lg', letter: 'text-base' },
  md: { logo: 'w-10 h-10', text: 'text-xl', letter: 'text-lg' },
  lg: { logo: 'w-12 h-12', text: 'text-2xl', letter: 'text-xl' },
 };

 const textColor = variant === 'light' ? 'text-white' : 'text-gray-900';
 const fallbackBg = variant === 'light'
  ? 'bg-white/20 backdrop-blur'
  : 'bg-gradient-to-br from-[#05294F] to-[#07478F]';
 const fallbackText = 'text-white';

 const content = (
  <div className={`flex items-center gap-3 ${className}`}>
   {config.logo_url ? (
    <img
     src={config.logo_url}
     alt={config.business_name}
     className={`${sizeClasses[size].logo} rounded-xl object-cover`}
    />
   ) : (
    <div className={`${sizeClasses[size].logo} ${fallbackBg} rounded-xl flex items-center justify-center shadow-lg`}>
     <span className={`${fallbackText} font-bold ${sizeClasses[size].letter}`}>
      {config.business_name.charAt(0)}
     </span>
    </div>
   )}
   {showName && (
    <span className={`${sizeClasses[size].text} font-bold ${textColor}`}>
     {config.business_name}
    </span>
   )}
  </div>
 );

 if (href) {
  return (
   <Link href={href} className="no-underline">
    {content}
   </Link>
  );
 }

 return content;
}
