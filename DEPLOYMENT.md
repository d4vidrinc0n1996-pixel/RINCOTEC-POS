# Guía de Despliegue - RINCOTEC POS

Esta guía te llevará paso a paso para desplegar tu aplicación en Netlify con Firebase.

## Paso 1: Configurar Firebase

### 1.1 Crear Proyecto en Firebase

1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Haz clic en "Agregar proyecto"
3. Nombre del proyecto: `rincotec-pos` (o el que prefieras)
4. Desactiva Google Analytics (opcional)
5. Haz clic en "Crear proyecto"

### 1.2 Configurar Firestore Database

1. En el menú lateral, ve a **Firestore Database**
2. Haz clic en "Crear base de datos"
3. Selecciona "Iniciar en modo de producción"
4. Elige la ubicación: `us-central1` (o la más cercana a Colombia)
5. Haz clic en "Habilitar"

### 1.3 Configurar Reglas de Seguridad de Firestore

En la pestaña "Reglas", reemplaza el contenido con:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Permitir lectura pública de productos
    match /products/{productId} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    
    // Solo usuarios autenticados pueden acceder a ventas
    match /sales/{saleId} {
      allow read, write: if request.auth != null;
    }
  }
}
```

Haz clic en "Publicar"

### 1.4 Configurar Authentication

1. En el menú lateral, ve a **Authentication**
2. Haz clic en "Comenzar"
3. En la pestaña "Sign-in method", habilita:
   - **Correo electrónico/Contraseña** ✅
4. Haz clic en "Guardar"

### 1.5 Crear Usuario Administrador

1. Ve a la pestaña "Users"
2. Haz clic en "Agregar usuario"
3. Correo: `admin@rincotec.com`
4. Contraseña: (elige una contraseña segura)
5. Haz clic en "Agregar usuario"

### 1.6 Obtener Credenciales de Firebase

1. Ve a **Configuración del proyecto** (ícono de engranaje)
2. En la pestaña "General", baja hasta "Tus apps"
3. Haz clic en el ícono `</>`  (Web)
4. Nombre de la app: `RINCOTEC POS`
5. **NO** marques "Configurar Firebase Hosting"
6. Haz clic en "Registrar app"
7. **COPIA** el objeto de configuración que aparece:

```javascript
const firebaseConfig = {
  apiKey: "TU_API_KEY",
  authDomain: "tu-proyecto.firebaseapp.com",
  projectId: "tu-proyecto",
  storageBucket: "tu-proyecto.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef"
};
```

8. **GUARDA** estas credenciales en un lugar seguro

---

## Paso 2: Configurar Variables de Entorno

### 2.1 Crear archivo de configuración local

1. En tu proyecto, copia el archivo `.env.example` y renómbralo a `.env`
2. Completa con tus credenciales de Firebase:

```env
VITE_FIREBASE_API_KEY=tu_api_key_aqui
VITE_FIREBASE_AUTH_DOMAIN=tu-proyecto.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=tu-proyecto
VITE_FIREBASE_STORAGE_BUCKET=tu-proyecto.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abcdef
```

---

## Paso 3: Exportar Datos Actuales (IMPORTANTE)

Antes de desplegar, exporta tu inventario actual:

1. Abre `inventory.html` en tu navegador
2. Inicia sesión como administrador
3. Haz clic en el botón **CSV** para exportar
4. Guarda el archivo `inventario_rincotec.csv`

---

## Paso 4: Desplegar en Netlify

### 4.1 Preparar el Repositorio

Si aún no tienes Git configurado:

```bash
cd "d:\Ferreteria Rincotec Soluciones eficientes para los problemas del dia a dia\Rincotec\Pagina"
git init
git add .
git commit -m "Initial commit - RINCOTEC POS"
```

### 4.2 Subir a GitHub

1. Ve a [GitHub](https://github.com) y crea un nuevo repositorio
2. Nombre: `rincotec-pos`
3. Visibilidad: **Privado** (recomendado)
4. NO inicialices con README
5. Copia los comandos que aparecen y ejecútalos:

```bash
git remote add origin https://github.com/TU_USUARIO/rincotec-pos.git
git branch -M main
git push -u origin main
```

### 4.3 Conectar con Netlify

1. Ve a [Netlify](https://www.netlify.com/)
2. Haz clic en "Add new site" → "Import an existing project"
3. Selecciona "GitHub"
4. Autoriza Netlify
5. Selecciona el repositorio `rincotec-pos`
6. Configuración de build:
   - **Build command**: (dejar vacío)
   - **Publish directory**: `.` (punto)
7. Haz clic en "Deploy site"

### 4.4 Configurar Variables de Entorno en Netlify

1. En tu sitio de Netlify, ve a **Site settings** → **Environment variables**
2. Agrega las siguientes variables (una por una):

```
VITE_FIREBASE_API_KEY = tu_api_key_aqui
VITE_FIREBASE_AUTH_DOMAIN = tu-proyecto.firebaseapp.com
VITE_FIREBASE_PROJECT_ID = tu-proyecto
VITE_FIREBASE_STORAGE_BUCKET = tu-proyecto.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID = 123456789
VITE_FIREBASE_APP_ID = 1:123456789:web:abcdef
```

3. Haz clic en "Save"
4. Ve a **Deploys** y haz clic en "Trigger deploy" → "Clear cache and deploy site"

---

## Paso 5: Importar Datos

1. Abre tu sitio desplegado (URL de Netlify)
2. Ve a `/admin-login.html`
3. Inicia sesión con `admin@rincotec.com`
4. Ve a la página de inventario
5. Agrega manualmente algunos productos de prueba
6. (Opcional) Importa desde CSV si tienes muchos productos

---

## Paso 6: Configurar Dominio Personalizado (Opcional)

1. En Netlify, ve a **Domain settings**
2. Haz clic en "Add custom domain"
3. Ingresa tu dominio (ej: `pos.rincotec.com`)
4. Sigue las instrucciones para configurar DNS
5. Netlify configurará HTTPS automáticamente

---

## 🎉 ¡Listo!

Tu aplicación está ahora en línea en:
- URL de Netlify: `https://tu-sitio.netlify.app`
- URL personalizada: `https://tu-dominio.com` (si configuraste)

## 🔒 Seguridad Post-Despliegue

1. **Cambia la contraseña del admin** en Firebase Console
2. **Revisa las reglas de Firestore** para asegurar que solo usuarios autenticados puedan escribir
3. **Configura backups** de Firestore (en Firebase Console)
4. **Monitorea el uso** en Firebase Console para evitar costos inesperados

## 📊 Monitoreo

- **Firebase Console**: Monitorea base de datos y autenticación
- **Netlify Dashboard**: Monitorea tráfico y despliegues
- **Analytics**: Considera agregar Google Analytics

## 🆘 Solución de Problemas

### Error: "Firebase not defined"
- Verifica que las variables de entorno estén configuradas en Netlify
- Redespliega el sitio

### Error: "Permission denied"
- Verifica las reglas de Firestore
- Asegúrate de estar autenticado

### La página no carga
- Revisa la consola del navegador (F12)
- Verifica que todos los archivos estén en el repositorio
- Revisa los logs de despliegue en Netlify
