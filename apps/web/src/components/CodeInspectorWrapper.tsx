'use client';

/**
 * CodeInspectorWrapper
 * 
 * Este componente actúa como un wrapper client-side para asegurar que
 * el code-inspector-plugin pueda inyectar su código de detección en
 * todas las páginas, incluyendo aquellas renderizadas inicialmente
 * como Server Components.
 * 
 * El plugin necesita que React esté hidratado en el cliente para
 * poder detectar los clicks en los componentes.
 */
export function CodeInspectorWrapper({
 children,
}: {
 children: React.ReactNode;
}) {
 return <>{children}</>;
}
