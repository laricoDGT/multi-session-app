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

clave por defecto:

```
1234
```

## 🚀 Generar el AppImage

```
npm run build
```

Esto generará un archivo como:

`dist/MultiSession-1.0.0.AppImage` y `multi-session-app_1.0.0_amd64.deb`

siempre en cuando en el package tenga:

```
"target": [
        "AppImage",
        "deb"
      ],
```

## ▶️ Ejecutar la App

```
chmod +x dist/MultiSession-1.0.0.AppImage
./dist/MultiSession-1.0.0.AppImage
```

¡Y listo! Tu aplicación está empaquetada y funcionando.

## Notas

Si editas los Tabs por defecto, no te olvides de ejecutar en el terminal:

```
rm -f ~/.config/multi-session-app/storage.json
```

esto es para eliminar el storage que se crea en la app.

## ❌ Desinstalar la App (si instalaste el .deb)

Si instalaste el `.deb`, puedes desinstalar con:

```
sudo apt remove multi-session-app
```
