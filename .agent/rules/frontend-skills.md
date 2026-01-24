---
trigger: model_decision
---

# Uso obligatorio de Skills de Frontend

## Skills disponibles

Tienes instaladas las siguientes skills globales en:
`C:\Users\jesus\.gemini\antigravity\skills\`

1. **vercel-react-best-practices**: Para revisar código React/Next.js
2. **web-design-guidelines**: Para auditar UI/UX y accesibilidad

## Reglas obligatorias

### Cuando trabajes con código React o Next.js

SIEMPRE DEBES usar la skill `vercel-react-best-practices` cuando:
- Revise componentes React o páginas Next.js
- Optimice performance
- Busque problemas de rendering
- Analice data fetching
- Revise bundle size
- Detecte waterfalls o re-renders innecesarios

**Comando para activarla:**
Lee y aplica las reglas de: `C:\Users\jesus\.gemini\antigravity\skills\vercel-react-best-practices\AGENTS.md`

### Cuando trabajes con UI/UX

SIEMPRE DEBES usar la skill `web-design-guidelines` cuando:
- Revise interfaces de usuario
- Verifique accesibilidad
- Audite diseño
- Revise experiencia de usuario
- Compruebe formularios
- Analice animaciones o estados visuales

**Comando para activarla:**
Lee y aplica las reglas de: `C:\Users\jesus\.gemini\antigravity\skills\web-design-guidelines\SKILL.md`

## Flujo de trabajo

1. **Antes de responder** a cualquier petición sobre frontend, verifica si aplica alguna skill
2. Si aplica, **carga la skill primero** leyendo su archivo correspondiente
3. **Aplica todas las reglas** de la skill al análisis
4. Devuelve los resultados en el formato que especifica la skill

## Notificación obligatoria

Si NO puedes acceder a alguna de estas skills cuando sea relevante, DEBES:
1. Avisarme INMEDIATAMENTE
2. NO continuar con análisis genérico
3. Esperar instrucciones antes de proceder

## Ejemplo de uso correcto

**Petición:** "Revisa el componente `app/page.tsx` por problemas de performance"

**Tu proceso:**
1. Identificas que es código Next.js → aplica `vercel-react-best-practices`
2. Lees `AGENTS.md` de esa skill
3. Analizas el archivo aplicando las 40+ reglas
4. Devuelves problemas en formato `archivo:línea descripción`
