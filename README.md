# MultiSession - Guía de Instalación y Empaquetado

## 📦 Requisitos

- Node.js y npm instalados
- Sistema operativo Linux (para AppImage)

## 🔧 Instalación y Desarrollo

```
npm install
npm start
```

Esto ejecutará la aplicación en modo desarrollo.

## 🚀 Generar el AppImage

```
npm run build
```

Esto generará un archivo como:

`dist/MultiSession-1.0.0.AppImage` y `multi-session-app_1.0.0_amd64.deb`

## ▶️ Ejecutar la App

```
chmod +x dist/MultiSession-1.0.0.AppImage
./dist/MultiSession-1.0.0.AppImage
```

¡Y listo! Tu aplicación está empaquetada y funcionando.
