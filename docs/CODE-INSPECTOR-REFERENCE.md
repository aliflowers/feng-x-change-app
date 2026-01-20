# Referencia Técnica: Code Inspector

Este documento detalla la configuración técnica y el uso de **Code Inspector** en el proyecto Capitolio Consultores.

## 📦 Información del Paquete

| Atributo | Detalle |
|----------|---------|
| **Paquete** | `code-inspector-plugin` |
| **Versión** | `^1.3.4` |
| **Tipo** | `devDependencies` |

## 🛠️ Entorno de Desarrollo

El proyecto utiliza las siguientes versiones base que garantizan la compatibilidad:

- **Next.js**: `16.1.1`
- **React**: `19.1.0`
- **TypeScript**: `^5.9.2`

## ⚙️ Configuración del Proyecto (`next.config.ts`)

La herramienta está integrada para soportar tanto **Turbopack** como **Webpack**:

### 1. Configuración Turbopack
Optimizado para el motor de renderizado moderno de Next.js:
```typescript
turbopack: {
  rules: codeInspectorPlugin({
    bundler: "turbopack",
    showSwitch: true,    // Muestra botón flotante de ON/OFF
    openIn: "reuse",     // Reutiliza ventana del editor
  }),
},
```

### 2. Configuración Webpack (Fallback)
Utilizado para compatibilidad con herramientas tradicionales o modo `--no-turbopack`:
```typescript
webpack: (config, { dev, isServer }) => {
  if (dev && !isServer) {
    config.plugins.push(
      codeInspectorPlugin({
        bundler: "webpack",
        exclude: [/node_modules/, /.next/],
        showSwitch: true,
        openIn: "reuse",
        printServer: true,
      })
    );
  }
  return config;
},
```

## 🎯 Guía de Uso

Esta herramienta facilita la navegación al código fuente directamente desde el navegador.

### Atajos de Teclado
- **Windows/Linux**: `Shift + Alt + Click`
- **Mac**: `Option + Shift + Click`

### Funcionamiento
1. Inicia el servidor: `pnpm dev`.
2. En el navegador, usa el atajo mientras haces click en cualquier componente.
3. El editor (VS Code o Cursor) se abrirá automáticamente en la línea exacta del código.

## ✅ Notas Importantes
- **Modo Desarrollo**: Solo se activa en entorno de desarrollo. No tiene impacto en el rendimiento de producción.
- **Editor**: Configurable mediante la variable `CODE_EDITOR` en el archivo `.env.local`.
- **Compatibilidad**: Totalmente compatible con React 19, solucionando las limitaciones de herramientas anteriores como `click-to-react-component`.
